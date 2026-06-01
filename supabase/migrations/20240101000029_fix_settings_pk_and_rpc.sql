-- ============================================================================
-- Migration 29 : Corriger la table settings pour le multi-tenant
--
-- Problème : settings.PK = key TEXT seulement → un seul tenant peut avoir
-- key='admin_company_legal'. Upsert ON CONFLICT (key) pour un autre tenant
-- tente un UPDATE bloqué par RLS → 0 ligne affectée, 0 erreur = échec silencieux.
--
-- Correction :
--   1. Changer la PK en (key, tenant_id) — une clé par tenant
--   2. Créer upsert_setting() SECURITY DEFINER — écrit toujours avec
--      le bon tenant_id, bypass RLS proprement
-- ============================================================================

-- 1. Supprimer les anciennes politiques RLS
DROP POLICY IF EXISTS settings_select  ON settings;
DROP POLICY IF EXISTS settings_insert  ON settings;
DROP POLICY IF EXISTS settings_update  ON settings;
DROP POLICY IF EXISTS settings_delete  ON settings;

-- 2. Changer la PK de `key` vers `(key, tenant_id)`
--    (idempotent : ne fait rien si la PK composite existe déjà)
DO $$
BEGIN
  -- Vérifier si la PK est déjà composite
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint c
    JOIN   pg_attribute  a ON a.attrelid = c.conrelid
                          AND a.attnum   = ANY(c.conkey)
    WHERE  c.conrelid = 'settings'::regclass
    AND    c.contype  = 'p'
    AND    a.attname  = 'tenant_id'
  ) THEN
    -- Supprimer l'ancienne PK
    ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_pkey;
    -- Nouvelle PK composite
    ALTER TABLE settings ADD PRIMARY KEY (key, tenant_id);
  END IF;
END $$;

-- 3. Recréer les politiques RLS avec la nouvelle PK composite
CREATE POLICY settings_select ON settings
  FOR SELECT USING (tenant_id = get_user_company_id());

CREATE POLICY settings_insert ON settings
  FOR INSERT WITH CHECK (tenant_id = get_user_company_id());

CREATE POLICY settings_update ON settings
  FOR UPDATE USING (tenant_id = get_user_company_id());

CREATE POLICY settings_delete ON settings
  FOR DELETE USING (tenant_id = get_user_company_id());

-- 4. RPC upsert_setting — SECURITY DEFINER → bypass RLS, tenant_id garanti côté serveur
--    Signature : upsert_setting(p_key TEXT, p_value TEXT) → VOID
--    Usage front : await supabase.rpc('upsert_setting', { p_key: '...', p_value: '...' })
CREATE OR REPLACE FUNCTION upsert_setting(p_key TEXT, p_value TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_tid UUID := get_user_company_id();
BEGIN
  IF v_tid IS NULL THEN
    RAISE EXCEPTION 'upsert_setting : aucune société associée à cet utilisateur (company_id NULL dans profiles)';
  END IF;

  INSERT INTO settings (key, tenant_id, value, updated_at)
  VALUES (p_key, v_tid, p_value, NOW())
  ON CONFLICT (key, tenant_id)
  DO UPDATE SET
    value      = EXCLUDED.value,
    updated_at = EXCLUDED.updated_at;
END;
$$;
