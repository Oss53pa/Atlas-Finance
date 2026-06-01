-- ════════════════════════════════════════════════════════════════════════
-- 20240101000033 — Migration batch tracking (Cahier de Mission v3, LOT 1 / A7)
-- ------------------------------------------------------------------------
-- Socle DB pour la ré-migration par ÉCRASEMENT :
--   • colonne migration_batch_id (UUID, NULLABLE) sur les 5 tables migrées
--   • table migration_sessions (1 ligne par lot importé)
--   • index : (tenant_id, migration_batch_id) pour purge bornée + keyset pagination
--
-- 100 % ADDITIF et idempotent (IF NOT EXISTS) : aucune donnée existante touchée,
-- aucune contrainte NOT NULL ajoutée. Réversible (DROP COLUMN / DROP TABLE).
-- RLS calquée sur le pattern des tables comptables : tenant_id = get_user_company_id().
-- ════════════════════════════════════════════════════════════════════════

-- 1. Colonne de rattachement au lot de migration --------------------------------
ALTER TABLE public.accounts        ADD COLUMN IF NOT EXISTS migration_batch_id uuid NULL;
ALTER TABLE public.third_parties   ADD COLUMN IF NOT EXISTS migration_batch_id uuid NULL;
ALTER TABLE public.assets          ADD COLUMN IF NOT EXISTS migration_batch_id uuid NULL;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS migration_batch_id uuid NULL;
ALTER TABLE public.journal_lines   ADD COLUMN IF NOT EXISTS migration_batch_id uuid NULL;

-- 2. Index (tenant_id, migration_batch_id) — purge bornée O(index) ---------------
CREATE INDEX IF NOT EXISTS idx_accounts_tenant_batch        ON public.accounts(tenant_id, migration_batch_id);
CREATE INDEX IF NOT EXISTS idx_third_parties_tenant_batch   ON public.third_parties(tenant_id, migration_batch_id);
CREATE INDEX IF NOT EXISTS idx_assets_tenant_batch          ON public.assets(tenant_id, migration_batch_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_batch ON public.journal_entries(tenant_id, migration_batch_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_tenant_batch   ON public.journal_lines(tenant_id, migration_batch_id);

-- 3. Index keyset pour pagination (LOT 7 / A6) -----------------------------------
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_date_id ON public.journal_entries(tenant_id, date DESC, id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_tenant_entry     ON public.journal_lines(tenant_id, entry_id);

-- 4. Table des sessions de migration ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.migration_sessions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL,
  batch_id           uuid NOT NULL,
  mode               text,                                  -- '1' | '2' | '3'
  source_system      text DEFAULT 'sage',
  status             text NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'completed', 'failed', 'rolled_back')),
  account_count      integer DEFAULT 0,
  third_party_count  integer DEFAULT 0,
  asset_count        integer DEFAULT 0,
  entry_count        integer DEFAULT 0,
  line_count         integer DEFAULT 0,
  error              text,
  started_at         timestamptz DEFAULT now(),
  completed_at       timestamptz,
  created_by         uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_migration_sessions_tenant_batch
  ON public.migration_sessions(tenant_id, batch_id);
CREATE INDEX IF NOT EXISTS idx_migration_sessions_tenant_started
  ON public.migration_sessions(tenant_id, started_at DESC);

-- 5. RLS migration_sessions (même doctrine que journal_entries) ------------------
ALTER TABLE public.migration_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS migration_sessions_select ON public.migration_sessions;
DROP POLICY IF EXISTS migration_sessions_insert ON public.migration_sessions;
DROP POLICY IF EXISTS migration_sessions_update ON public.migration_sessions;
DROP POLICY IF EXISTS migration_sessions_delete ON public.migration_sessions;

CREATE POLICY migration_sessions_select ON public.migration_sessions
  FOR SELECT USING (tenant_id = get_user_company_id());
CREATE POLICY migration_sessions_insert ON public.migration_sessions
  FOR INSERT WITH CHECK (tenant_id = get_user_company_id());
CREATE POLICY migration_sessions_update ON public.migration_sessions
  FOR UPDATE USING (tenant_id = get_user_company_id());
CREATE POLICY migration_sessions_delete ON public.migration_sessions
  FOR DELETE USING (tenant_id = get_user_company_id());

COMMENT ON COLUMN public.journal_entries.migration_batch_id IS
  'Lot de migration (NULL = saisie manuelle). Permet la ré-migration par écrasement borné au lot.';
COMMENT ON TABLE public.migration_sessions IS
  'Une ligne par lot de migration importé (Cahier de Mission v3 / A7).';
