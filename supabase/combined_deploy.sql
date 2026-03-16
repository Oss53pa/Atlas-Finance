-- =====================================================================
-- WiseBook / Atlas Finance — Combined Deploy Script
-- Run in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
--
-- Idempotent: safe to re-run. Uses DROP IF EXISTS + IF NOT EXISTS.
-- Assumes migrations 001-005 + 006_audit_triggers + 007 + 008 are deployed.
-- =====================================================================

BEGIN;

-- =====================================================================
-- PART 1: Integrity Triggers & Security Hardening (ex-migration 006)
-- =====================================================================

-- 1.1 CHECK constraints on journal_lines
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_debit_positive' AND conrelid = 'journal_lines'::regclass) THEN
    ALTER TABLE journal_lines ADD CONSTRAINT chk_debit_positive CHECK (debit >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_credit_positive' AND conrelid = 'journal_lines'::regclass) THEN
    ALTER TABLE journal_lines ADD CONSTRAINT chk_credit_positive CHECK (credit >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_not_bilateral' AND conrelid = 'journal_lines'::regclass) THEN
    ALTER TABLE journal_lines ADD CONSTRAINT chk_not_bilateral CHECK (debit = 0 OR credit = 0);
  END IF;
END $$;

-- 1.2 Trigger DEFERRED: balance check on journal_lines
CREATE OR REPLACE FUNCTION validate_entry_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_diff NUMERIC(18,2);
BEGIN
  SELECT ABS(COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0))
  INTO v_diff
  FROM journal_lines
  WHERE entry_id = COALESCE(NEW.entry_id, OLD.entry_id);

  IF v_diff > 0.01 THEN
    RAISE EXCEPTION 'Ecriture desequilibree (ecart: % FCFA). Total Debit doit = Total Credit.', v_diff;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_balance ON journal_lines;
CREATE CONSTRAINT TRIGGER trg_validate_balance
AFTER INSERT OR UPDATE OR DELETE ON journal_lines
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_entry_balance();

-- 1.3 Immutability of posted entries (SYSCOHADA Art. 19)
CREATE OR REPLACE FUNCTION protect_posted_entries()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.status = 'posted' THEN
    RAISE EXCEPTION 'Suppression interdite - ecriture comptabilisee (SYSCOHADA Art. 19)';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'posted' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Modification du statut interdite - ecriture comptabilisee. Utilisez une contrepassation.';
    END IF;
    IF ROW(NEW.journal, NEW.date, NEW.entry_number, NEW.label)
        IS DISTINCT FROM ROW(OLD.journal, OLD.date, OLD.entry_number, OLD.label) THEN
      RAISE EXCEPTION 'Modification interdite - ecriture comptabilisee (SYSCOHADA Art. 19)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_posted ON journal_entries;
CREATE TRIGGER trg_protect_posted
BEFORE UPDATE OR DELETE ON journal_entries
FOR EACH ROW EXECUTE FUNCTION protect_posted_entries();

-- 1.4 ON DELETE RESTRICT on journal_lines.entry_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'journal_lines_entry_id_fkey'
      AND table_name = 'journal_lines'
  ) THEN
    ALTER TABLE journal_lines DROP CONSTRAINT journal_lines_entry_id_fkey;
  END IF;
END;
$$;

ALTER TABLE journal_lines ADD CONSTRAINT journal_lines_entry_id_fkey
  FOREIGN KEY (entry_id) REFERENCES journal_entries(id) ON DELETE RESTRICT;

-- 1.5 Block entries on closed fiscal years
CREATE OR REPLACE FUNCTION block_closed_period()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM fiscal_years
    WHERE tenant_id = NEW.tenant_id
      AND NEW.date BETWEEN start_date AND end_date
      AND is_closed = true
  ) THEN
    RAISE EXCEPTION 'Saisie impossible : exercice comptable cloture';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_block_closed_period ON journal_entries;
CREATE TRIGGER trg_block_closed_period
BEFORE INSERT OR UPDATE ON journal_entries
FOR EACH ROW EXECUTE FUNCTION block_closed_period();

-- 1.6 Protect audit_logs from modification
CREATE OR REPLACE FUNCTION protect_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Le journal audit est immuable - % interdit', TG_OP;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_audit ON audit_logs;
CREATE TRIGGER trg_protect_audit
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION protect_audit_log();

-- 1.7 Sequential entry numbering per journal
CREATE OR REPLACE FUNCTION generate_sequential_entry_number()
RETURNS TRIGGER AS $$
DECLARE
  v_seq INTEGER;
  v_journal_code TEXT;
BEGIN
  IF NEW.entry_number IS NULL OR NEW.entry_number = '' THEN
    v_journal_code := COALESCE(NEW.journal, 'OD');

    SELECT COALESCE(MAX(
      CAST(REGEXP_REPLACE(entry_number, '^[A-Z]+-', '') AS INTEGER)
    ), 0) + 1
    INTO v_seq
    FROM journal_entries
    WHERE tenant_id = NEW.tenant_id
      AND journal = NEW.journal
      AND entry_number ~ ('^' || v_journal_code || E'-\\d+$');

    NEW.entry_number := v_journal_code || '-' || LPAD(v_seq::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_entry_number ON journal_entries;
CREATE TRIGGER trg_entry_number
BEFORE INSERT ON journal_entries
FOR EACH ROW EXECUTE FUNCTION generate_sequential_entry_number();

-- 1.8 RLS on profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'profiles' AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  END IF;
END;
$$;

DROP POLICY IF EXISTS profiles_select ON profiles;
DROP POLICY IF EXISTS profiles_insert ON profiles;
DROP POLICY IF EXISTS profiles_update ON profiles;

CREATE POLICY profiles_select ON profiles FOR SELECT
  USING (id = auth.uid());
CREATE POLICY profiles_insert ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update ON profiles FOR UPDATE
  USING (id = auth.uid());

-- 1.9 Add missing columns
ALTER TABLE journal_lines
  ADD COLUMN IF NOT EXISTS date_echeance DATE;

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS collective_account_id UUID REFERENCES accounts(id),
  ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

ALTER TABLE third_parties
  ADD COLUMN IF NOT EXISTS rccm TEXT,
  ADD COLUMN IF NOT EXISTS regime_fiscal TEXT,
  ADD COLUMN IF NOT EXISTS forme_juridique TEXT,
  ADD COLUMN IF NOT EXISTS account_code_tiers TEXT,
  ADD COLUMN IF NOT EXISTS collective_account TEXT,
  ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER DEFAULT 30;

-- 1.10 Table: lettrages
CREATE TABLE IF NOT EXISTS lettrages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  reference TEXT NOT NULL,
  account_code TEXT NOT NULL,
  date_lettrage TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES profiles(id),
  montant NUMERIC(18,2) NOT NULL,
  type TEXT DEFAULT 'complet' CHECK (type IN ('complet', 'partiel')),
  method TEXT CHECK (method IN ('exact', 'reference', 'sum_n', 'manual')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, reference)
);

ALTER TABLE lettrages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lettrages_select ON lettrages;
DROP POLICY IF EXISTS lettrages_insert ON lettrages;
DROP POLICY IF EXISTS lettrages_update ON lettrages;
DROP POLICY IF EXISTS lettrages_delete ON lettrages;

CREATE POLICY lettrages_select ON lettrages FOR SELECT
  USING (tenant_id = get_user_company_id());
CREATE POLICY lettrages_insert ON lettrages FOR INSERT
  WITH CHECK (tenant_id = get_user_company_id());
CREATE POLICY lettrages_update ON lettrages FOR UPDATE
  USING (tenant_id = get_user_company_id());
CREATE POLICY lettrages_delete ON lettrages FOR DELETE
  USING (tenant_id = get_user_company_id());

-- 1.11 RPCs: validate, post, lettrage
CREATE OR REPLACE FUNCTION validate_journal_entry(p_entry_id UUID)
RETURNS void AS $$
DECLARE
  v_entry RECORD;
  v_diff NUMERIC(18,2);
BEGIN
  SELECT * INTO v_entry FROM journal_entries WHERE id = p_entry_id;
  IF v_entry IS NULL THEN
    RAISE EXCEPTION 'Ecriture non trouvee';
  END IF;
  IF v_entry.status != 'draft' THEN
    RAISE EXCEPTION 'Seules les ecritures brouillon peuvent etre validees (statut: %)', v_entry.status;
  END IF;

  SELECT ABS(COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0))
  INTO v_diff FROM journal_lines WHERE entry_id = p_entry_id;

  IF v_diff > 0.01 THEN
    RAISE EXCEPTION 'Ecriture desequilibree (ecart: %)', v_diff;
  END IF;

  UPDATE journal_entries SET status = 'validated', updated_at = now()
  WHERE id = p_entry_id;

  INSERT INTO audit_logs (id, tenant_id, action, entity_type, entity_id, details, timestamp)
  VALUES (gen_random_uuid(), v_entry.tenant_id, 'VALIDATE', 'journal_entry', p_entry_id::TEXT,
          jsonb_build_object('from', 'draft', 'to', 'validated')::TEXT, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION post_journal_entry(p_entry_id UUID)
RETURNS void AS $$
DECLARE
  v_entry RECORD;
BEGIN
  SELECT * INTO v_entry FROM journal_entries WHERE id = p_entry_id;
  IF v_entry IS NULL THEN
    RAISE EXCEPTION 'Ecriture non trouvee';
  END IF;
  IF v_entry.status != 'validated' THEN
    RAISE EXCEPTION 'Seules les ecritures validees peuvent etre comptabilisees (statut: %)', v_entry.status;
  END IF;

  UPDATE journal_entries SET status = 'posted', updated_at = now()
  WHERE id = p_entry_id;

  INSERT INTO audit_logs (id, tenant_id, action, entity_type, entity_id, details, timestamp)
  VALUES (gen_random_uuid(), v_entry.tenant_id, 'POST', 'journal_entry', p_entry_id::TEXT,
          jsonb_build_object('from', 'validated', 'to', 'posted')::TEXT, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION apply_lettrage(
  p_tenant_id UUID,
  p_line_ids UUID[],
  p_lettrage_code TEXT
)
RETURNS void AS $$
DECLARE
  v_total_debit NUMERIC(18,2);
  v_total_credit NUMERIC(18,2);
  v_account TEXT;
BEGIN
  SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
  INTO v_total_debit, v_total_credit
  FROM journal_lines WHERE id = ANY(p_line_ids);

  IF ABS(v_total_debit - v_total_credit) > 0.01 THEN
    RAISE EXCEPTION 'Lettrage desequilibre (Debit: % / Credit: %)', v_total_debit, v_total_credit;
  END IF;

  SELECT account_code INTO v_account
  FROM journal_lines WHERE id = p_line_ids[1];

  UPDATE journal_lines SET lettrage_code = p_lettrage_code
  WHERE id = ANY(p_line_ids);

  INSERT INTO lettrages (tenant_id, reference, account_code, montant, type, method)
  VALUES (p_tenant_id, p_lettrage_code, v_account, v_total_debit, 'complet', 'manual');

  INSERT INTO audit_logs (id, tenant_id, action, entity_type, entity_id, details, timestamp)
  VALUES (gen_random_uuid(), p_tenant_id, 'LETTRAGE', 'journal_lines', NULL,
          jsonb_build_object('code', p_lettrage_code, 'lines', array_length(p_line_ids, 1), 'montant', v_total_debit)::TEXT,
          now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1.12 Indexes — journal_entries
CREATE INDEX IF NOT EXISTS idx_je_status  ON journal_entries(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_je_date    ON journal_entries(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_je_journal ON journal_entries(tenant_id, journal);

-- 1.12 Indexes — journal_lines
CREATE INDEX IF NOT EXISTS idx_jl_account  ON journal_lines(account_code);
CREATE INDEX IF NOT EXISTS idx_jl_lettrage ON journal_lines(lettrage_code) WHERE lettrage_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jl_echeance ON journal_lines(date_echeance) WHERE date_echeance IS NOT NULL;

-- 1.12 Indexes — lettrages
CREATE INDEX IF NOT EXISTS idx_lettrages_tenant  ON lettrages(tenant_id, reference);
CREATE INDEX IF NOT EXISTS idx_lettrages_account ON lettrages(tenant_id, account_code);


-- =====================================================================
-- PART 2: Schema Alignment (migration 009)
-- =====================================================================

-- 2.1 Add tenant_id to lignes_rapprochement
ALTER TABLE lignes_rapprochement
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES societes(id);

UPDATE lignes_rapprochement lr
SET tenant_id = r.tenant_id
FROM rapprochements r
WHERE lr.rapprochement_id = r.id
  AND lr.tenant_id IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lignes_rapprochement' AND column_name = 'tenant_id'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE lignes_rapprochement ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
END $$;

-- 2.2 Table: stock_movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  item_id UUID NOT NULL REFERENCES inventory_items(id),
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('receipt', 'issue', 'adjustment', 'transfer', 'return')),
  quantity NUMERIC(18,4) NOT NULL,
  unit_cost NUMERIC(18,2) DEFAULT 0,
  total_cost NUMERIC(18,2) DEFAULT 0,
  reference TEXT NOT NULL,
  label TEXT,
  cump_after NUMERIC(18,2) DEFAULT 0,
  quantity_after NUMERIC(18,4) DEFAULT 0,
  value_after NUMERIC(18,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id)
);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stock_movements_select ON stock_movements;
DROP POLICY IF EXISTS stock_movements_insert ON stock_movements;
DROP POLICY IF EXISTS stock_movements_update ON stock_movements;
DROP POLICY IF EXISTS stock_movements_delete ON stock_movements;

CREATE POLICY stock_movements_select ON stock_movements
  FOR SELECT USING (tenant_id = get_user_company_id());
CREATE POLICY stock_movements_insert ON stock_movements
  FOR INSERT WITH CHECK (tenant_id = get_user_company_id());
CREATE POLICY stock_movements_update ON stock_movements
  FOR UPDATE USING (tenant_id = get_user_company_id());
CREATE POLICY stock_movements_delete ON stock_movements
  FOR DELETE USING (tenant_id = get_user_company_id());

CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(tenant_id, item_id, date);

-- 2.3 Table: recovery_cases
CREATE TABLE IF NOT EXISTS recovery_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  numero_ref TEXT NOT NULL,
  client_id UUID,
  client_name TEXT NOT NULL,
  montant_principal NUMERIC(18,2) DEFAULT 0,
  interets NUMERIC(18,2) DEFAULT 0,
  frais NUMERIC(18,2) DEFAULT 0,
  montant_total NUMERIC(18,2) DEFAULT 0,
  montant_paye NUMERIC(18,2) DEFAULT 0,
  date_ouverture DATE NOT NULL,
  date_cloture DATE,
  statut TEXT NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'suspendu', 'cloture', 'juridique')),
  type_recouvrement TEXT NOT NULL DEFAULT 'amiable' CHECK (type_recouvrement IN ('amiable', 'judiciaire', 'huissier')),
  responsable TEXT,
  actions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, numero_ref)
);

ALTER TABLE recovery_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recovery_cases_select ON recovery_cases;
DROP POLICY IF EXISTS recovery_cases_insert ON recovery_cases;
DROP POLICY IF EXISTS recovery_cases_update ON recovery_cases;
DROP POLICY IF EXISTS recovery_cases_delete ON recovery_cases;

CREATE POLICY recovery_cases_select ON recovery_cases
  FOR SELECT USING (tenant_id = get_user_company_id());
CREATE POLICY recovery_cases_insert ON recovery_cases
  FOR INSERT WITH CHECK (tenant_id = get_user_company_id());
CREATE POLICY recovery_cases_update ON recovery_cases
  FOR UPDATE USING (tenant_id = get_user_company_id());
CREATE POLICY recovery_cases_delete ON recovery_cases
  FOR DELETE USING (tenant_id = get_user_company_id());

CREATE INDEX IF NOT EXISTS idx_recovery_cases_tenant ON recovery_cases(tenant_id, statut);

DROP TRIGGER IF EXISTS trg_recovery_cases_updated_at ON recovery_cases;
CREATE TRIGGER trg_recovery_cases_updated_at
  BEFORE UPDATE ON recovery_cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2.4 Table: periodes_comptables
CREATE TABLE IF NOT EXISTS periodes_comptables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  fiscal_year_id UUID NOT NULL REFERENCES fiscal_years(id),
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'locked', 'cloturee')),
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);

ALTER TABLE periodes_comptables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS periodes_select ON periodes_comptables;
DROP POLICY IF EXISTS periodes_insert ON periodes_comptables;
DROP POLICY IF EXISTS periodes_update ON periodes_comptables;
DROP POLICY IF EXISTS periodes_delete ON periodes_comptables;

CREATE POLICY periodes_select ON periodes_comptables
  FOR SELECT USING (tenant_id = get_user_company_id());
CREATE POLICY periodes_insert ON periodes_comptables
  FOR INSERT WITH CHECK (tenant_id = get_user_company_id());
CREATE POLICY periodes_update ON periodes_comptables
  FOR UPDATE USING (tenant_id = get_user_company_id());
CREATE POLICY periodes_delete ON periodes_comptables
  FOR DELETE USING (tenant_id = get_user_company_id());

CREATE INDEX IF NOT EXISTS idx_periodes_tenant_fy ON periodes_comptables(tenant_id, fiscal_year_id);
CREATE INDEX IF NOT EXISTS idx_periodes_dates ON periodes_comptables(tenant_id, start_date, end_date);

DROP TRIGGER IF EXISTS trg_periodes_comptables_updated_at ON periodes_comptables;
CREATE TRIGGER trg_periodes_comptables_updated_at
  BEFORE UPDATE ON periodes_comptables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =====================================================================
-- PART 3: RPC functions for SupabaseAdapter
-- =====================================================================

-- 3.1 get_account_balance (p_prefixes, p_tenant_id, p_start_date, p_end_date)
CREATE OR REPLACE FUNCTION get_account_balance(
  p_prefixes TEXT[],
  p_tenant_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_debit NUMERIC(18,2);
  v_credit NUMERIC(18,2);
  v_count BIGINT;
  v_prefix_pattern TEXT;
BEGIN
  v_prefix_pattern := '^(' || array_to_string(p_prefixes, '|') || ')';

  SELECT
    COALESCE(SUM(jl.debit), 0),
    COALESCE(SUM(jl.credit), 0),
    COUNT(*)
  INTO v_debit, v_credit, v_count
  FROM journal_lines jl
  JOIN journal_entries je ON je.id = jl.entry_id
  WHERE je.tenant_id = p_tenant_id
    AND je.status IN ('validated', 'posted')
    AND jl.account_code ~ v_prefix_pattern
    AND (p_start_date IS NULL OR je.date >= p_start_date)
    AND (p_end_date IS NULL OR je.date <= p_end_date);

  RETURN json_build_object(
    'debit', v_debit,
    'credit', v_credit,
    'solde', v_debit - v_credit,
    'lignes', v_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3.2 get_trial_balance (p_tenant_id, p_start_date, p_end_date)
-- Overload: migration 005 has get_trial_balance(p_fiscal_year_id UUID)
CREATE OR REPLACE FUNCTION get_trial_balance(
  p_tenant_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  account_code TEXT,
  account_name TEXT,
  total_debit NUMERIC,
  total_credit NUMERIC,
  solde_debiteur NUMERIC,
  solde_crediteur NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    jl.account_code,
    jl.account_name,
    COALESCE(SUM(jl.debit), 0) AS total_debit,
    COALESCE(SUM(jl.credit), 0) AS total_credit,
    GREATEST(COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0), 0) AS solde_debiteur,
    GREATEST(COALESCE(SUM(jl.credit), 0) - COALESCE(SUM(jl.debit), 0), 0) AS solde_crediteur
  FROM journal_lines jl
  JOIN journal_entries je ON jl.entry_id = je.id
  WHERE je.tenant_id = p_tenant_id
    AND je.status IN ('validated', 'posted')
    AND (p_start_date IS NULL OR je.date >= p_start_date)
    AND (p_end_date IS NULL OR je.date <= p_end_date)
  GROUP BY jl.account_code, jl.account_name
  ORDER BY jl.account_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- =====================================================================
-- PART 4: Complete RLS policies for ALL tenant tables
-- (Safe re-run: DROP IF EXISTS before CREATE)
-- =====================================================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'fiscal_years', 'accounts', 'journal_entries', 'journal_lines',
    'third_parties', 'assets', 'budget_lines', 'audit_logs', 'settings',
    'closure_sessions', 'provisions', 'exchange_rates', 'hedging_positions',
    'revision_items', 'inventory_items', 'alias_tiers', 'alias_prefix_config',
    'axes_analytiques', 'sections_analytiques', 'ventilations_analytiques',
    'rapprochements', 'lignes_rapprochement',
    'stock_movements', 'recovery_cases', 'periodes_comptables', 'lettrages'
  ]) LOOP
    -- Drop existing policies (safe)
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_select', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_insert', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_update', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_delete', tbl);

    -- Create fresh policies
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT USING (tenant_id = get_user_company_id())',
      tbl || '_select', tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR INSERT WITH CHECK (tenant_id = get_user_company_id())',
      tbl || '_insert', tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE USING (tenant_id = get_user_company_id())',
      tbl || '_update', tbl
    );
    -- Skip DELETE on audit_logs (immutable)
    IF tbl != 'audit_logs' THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR DELETE USING (tenant_id = get_user_company_id())',
        tbl || '_delete', tbl
      );
    END IF;
  END LOOP;
END $$;

COMMIT;

-- =====================================================================
-- VERIFICATION: run this after the script to confirm everything worked
-- =====================================================================
-- SELECT
--   schemaname, tablename, policyname, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, cmd;
