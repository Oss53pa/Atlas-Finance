-- =================================================================
-- Migration 006: Integrity Triggers & Security Hardening
-- ADAPTED TO REAL SCHEMA (workspace_id, journal_entry_lines, etc.)
-- =================================================================

-- ============================================================
-- 1. CHECK constraints on journal_entry_lines
-- ============================================================
ALTER TABLE journal_entry_lines
  ADD CONSTRAINT chk_debit_positive CHECK (debit >= 0),
  ADD CONSTRAINT chk_credit_positive CHECK (credit >= 0),
  ADD CONSTRAINT chk_not_bilateral CHECK (debit = 0 OR credit = 0);

-- ============================================================
-- 2. Trigger DEFERRED: balance check (SUM debit = SUM credit)
-- ============================================================
CREATE OR REPLACE FUNCTION validate_entry_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_diff NUMERIC(18,2);
BEGIN
  SELECT ABS(COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0))
  INTO v_diff
  FROM journal_entry_lines
  WHERE entry_id = COALESCE(NEW.entry_id, OLD.entry_id);

  IF v_diff > 0.01 THEN
    RAISE EXCEPTION 'Ecriture desequilibree (ecart: % FCFA). Total Debit doit = Total Credit.', v_diff;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_validate_balance
AFTER INSERT OR UPDATE OR DELETE ON journal_entry_lines
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_entry_balance();

-- ============================================================
-- 3. Trigger: immutability of posted entries (SYSCOHADA Art. 19)
-- ============================================================
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
    IF ROW(NEW.journal_id, NEW.entry_date, NEW.entry_number, NEW.description)
        IS DISTINCT FROM ROW(OLD.journal_id, OLD.entry_date, OLD.entry_number, OLD.description) THEN
      RAISE EXCEPTION 'Modification interdite - ecriture comptabilisee (SYSCOHADA Art. 19)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_posted
BEFORE UPDATE OR DELETE ON journal_entries
FOR EACH ROW EXECUTE FUNCTION protect_posted_entries();

-- ============================================================
-- 4. ON DELETE RESTRICT on journal_entry_lines.entry_id
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'journal_entry_lines_entry_id_fkey'
      AND table_name = 'journal_entry_lines'
  ) THEN
    ALTER TABLE journal_entry_lines DROP CONSTRAINT journal_entry_lines_entry_id_fkey;
  END IF;
END;
$$;

ALTER TABLE journal_entry_lines ADD CONSTRAINT journal_entry_lines_entry_id_fkey
  FOREIGN KEY (entry_id) REFERENCES journal_entries(id) ON DELETE RESTRICT;

-- ============================================================
-- 5. Trigger: block entries on closed fiscal years
-- ============================================================
CREATE OR REPLACE FUNCTION block_closed_period()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM fiscal_years fy
    WHERE fy.id = NEW.fiscal_year_id
      AND (fy.status = 'closed' OR fy.status = 'locked')
  ) THEN
    RAISE EXCEPTION 'Saisie impossible : exercice comptable cloture';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_block_closed_period
BEFORE INSERT OR UPDATE ON journal_entries
FOR EACH ROW EXECUTE FUNCTION block_closed_period();

-- ============================================================
-- 6. Protect audit_log from deletion/modification
-- ============================================================
CREATE OR REPLACE FUNCTION protect_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Le journal audit est immuable - % interdit', TG_OP;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_audit
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION protect_audit_log();

-- ============================================================
-- 7. Sequential entry numbering per journal
-- ============================================================
CREATE OR REPLACE FUNCTION generate_sequential_entry_number()
RETURNS TRIGGER AS $$
DECLARE
  v_seq INTEGER;
  v_journal_code TEXT;
BEGIN
  IF NEW.entry_number IS NULL OR NEW.entry_number = '' THEN
    SELECT code INTO v_journal_code FROM journals WHERE id = NEW.journal_id;
    v_journal_code := COALESCE(v_journal_code, 'OD');

    SELECT COALESCE(MAX(
      CAST(REGEXP_REPLACE(entry_number, '^[A-Z]+-', '') AS INTEGER)
    ), 0) + 1
    INTO v_seq
    FROM journal_entries
    WHERE workspace_id = NEW.workspace_id
      AND journal_id = NEW.journal_id
      AND entry_number ~ ('^' || v_journal_code || E'-\\d+$');

    NEW.entry_number := v_journal_code || '-' || LPAD(v_seq::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_entry_number
BEFORE INSERT ON journal_entries
FOR EACH ROW EXECUTE FUNCTION generate_sequential_entry_number();

-- ============================================================
-- 8. RLS on profiles
-- ============================================================
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

-- ============================================================
-- 9. Add missing columns to journal_entry_lines
-- ============================================================
ALTER TABLE journal_entry_lines
  ADD COLUMN IF NOT EXISTS date_echeance DATE,
  ADD COLUMN IF NOT EXISTS lettrage_code TEXT;

-- ============================================================
-- 10. Add missing columns to chart_of_accounts
-- ============================================================
ALTER TABLE chart_of_accounts
  ADD COLUMN IF NOT EXISTS collective_account_id UUID REFERENCES chart_of_accounts(id),
  ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS normal_balance VARCHAR DEFAULT 'debit';

-- ============================================================
-- 11. Add OHADA fields to contacts (tiers)
-- ============================================================
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS rccm TEXT,
  ADD COLUMN IF NOT EXISTS regime_fiscal TEXT,
  ADD COLUMN IF NOT EXISTS forme_juridique TEXT,
  ADD COLUMN IF NOT EXISTS account_number TEXT,
  ADD COLUMN IF NOT EXISTS collective_account TEXT,
  ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER DEFAULT 30;

-- ============================================================
-- 12. Table: periodes_comptables
-- ============================================================
CREATE TABLE IF NOT EXISTS periodes_comptables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  fiscal_year_id UUID NOT NULL REFERENCES fiscal_years(id),
  code VARCHAR NOT NULL,
  label VARCHAR NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'locked')),
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, code)
);

-- ============================================================
-- 13. Table: lettrages
-- ============================================================
CREATE TABLE IF NOT EXISTS lettrages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  reference VARCHAR NOT NULL,
  account_number VARCHAR NOT NULL,
  date_lettrage TIMESTAMPTZ DEFAULT now(),
  user_id UUID,
  montant NUMERIC(18,2) NOT NULL,
  type VARCHAR DEFAULT 'complet' CHECK (type IN ('complet', 'partiel')),
  method VARCHAR CHECK (method IN ('exact', 'reference', 'sum_n', 'manual')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, reference)
);

-- ============================================================
-- 14. Table: settings
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  key VARCHAR NOT NULL,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (workspace_id, key)
);

-- ============================================================
-- 15. RLS on new tables
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_workspace_id()
RETURNS UUID AS $$
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

ALTER TABLE periodes_comptables ENABLE ROW LEVEL SECURITY;
CREATE POLICY periodes_select ON periodes_comptables FOR SELECT
  USING (workspace_id = get_user_workspace_id());
CREATE POLICY periodes_insert ON periodes_comptables FOR INSERT
  WITH CHECK (workspace_id = get_user_workspace_id());
CREATE POLICY periodes_update ON periodes_comptables FOR UPDATE
  USING (workspace_id = get_user_workspace_id());
CREATE POLICY periodes_delete ON periodes_comptables FOR DELETE
  USING (workspace_id = get_user_workspace_id());

ALTER TABLE lettrages ENABLE ROW LEVEL SECURITY;
CREATE POLICY lettrages_select ON lettrages FOR SELECT
  USING (workspace_id = get_user_workspace_id());
CREATE POLICY lettrages_insert ON lettrages FOR INSERT
  WITH CHECK (workspace_id = get_user_workspace_id());
CREATE POLICY lettrages_update ON lettrages FOR UPDATE
  USING (workspace_id = get_user_workspace_id());
CREATE POLICY lettrages_delete ON lettrages FOR DELETE
  USING (workspace_id = get_user_workspace_id());

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY settings_select ON settings FOR SELECT
  USING (workspace_id = get_user_workspace_id());
CREATE POLICY settings_insert ON settings FOR INSERT
  WITH CHECK (workspace_id = get_user_workspace_id());
CREATE POLICY settings_update ON settings FOR UPDATE
  USING (workspace_id = get_user_workspace_id());

-- ============================================================
-- 16. RPC: validate_journal_entry
-- ============================================================
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
  INTO v_diff FROM journal_entry_lines WHERE entry_id = p_entry_id;

  IF v_diff > 0.01 THEN
    RAISE EXCEPTION 'Ecriture desequilibree (ecart: %)', v_diff;
  END IF;

  UPDATE journal_entries SET status = 'validated', validated_at = now()
  WHERE id = p_entry_id;

  INSERT INTO audit_log (workspace_id, user_id, module, action, table_name, record_id, new_data, created_at)
  VALUES (v_entry.workspace_id, COALESCE(v_entry.created_by, auth.uid()), 'accounting', 'validate',
          'journal_entries', p_entry_id,
          jsonb_build_object('from', 'draft', 'to', 'validated'), now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 17. RPC: post_journal_entry
-- ============================================================
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

  UPDATE journal_entries SET status = 'posted' WHERE id = p_entry_id;

  INSERT INTO audit_log (workspace_id, user_id, module, action, table_name, record_id, new_data, created_at)
  VALUES (v_entry.workspace_id, COALESCE(v_entry.created_by, auth.uid()), 'accounting', 'post',
          'journal_entries', p_entry_id,
          jsonb_build_object('from', 'validated', 'to', 'posted'), now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 18. RPC: apply_lettrage
-- ============================================================
CREATE OR REPLACE FUNCTION apply_lettrage(
  p_workspace_id UUID,
  p_line_ids UUID[],
  p_lettrage_code TEXT
)
RETURNS void AS $$
DECLARE
  v_total_debit NUMERIC(18,2);
  v_total_credit NUMERIC(18,2);
  v_account VARCHAR;
BEGIN
  SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
  INTO v_total_debit, v_total_credit
  FROM journal_entry_lines WHERE id = ANY(p_line_ids);

  IF ABS(v_total_debit - v_total_credit) > 0.01 THEN
    RAISE EXCEPTION 'Lettrage desequilibre (Debit: % / Credit: %)', v_total_debit, v_total_credit;
  END IF;

  SELECT account_number INTO v_account
  FROM journal_entry_lines WHERE id = p_line_ids[1];

  UPDATE journal_entry_lines SET lettrage_code = p_lettrage_code
  WHERE id = ANY(p_line_ids);

  INSERT INTO lettrages (workspace_id, reference, account_number, montant, type, method)
  VALUES (p_workspace_id, p_lettrage_code, v_account, v_total_debit, 'complet', 'manual');

  INSERT INTO audit_log (workspace_id, user_id, module, action, table_name, record_id, new_data, created_at)
  VALUES (p_workspace_id, auth.uid(), 'accounting', 'lettrage',
          'journal_entry_lines', NULL,
          jsonb_build_object('code', p_lettrage_code, 'lines', array_length(p_line_ids, 1), 'montant', v_total_debit),
          now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 19. RPC: get_dashboard_kpis
-- ============================================================
CREATE OR REPLACE FUNCTION get_dashboard_kpis(p_fiscal_year_id UUID)
RETURNS JSON AS $$
DECLARE
  v_produits NUMERIC;
  v_charges NUMERIC;
  v_tresorerie NUMERIC;
  v_count BIGINT;
BEGIN
  SELECT COALESCE(SUM(jl.credit - jl.debit), 0) INTO v_produits
  FROM journal_entry_lines jl
  JOIN journal_entries je ON je.id = jl.entry_id
  WHERE je.fiscal_year_id = p_fiscal_year_id
    AND je.status IN ('validated', 'posted')
    AND jl.account_number LIKE '7%';

  SELECT COALESCE(SUM(jl.debit - jl.credit), 0) INTO v_charges
  FROM journal_entry_lines jl
  JOIN journal_entries je ON je.id = jl.entry_id
  WHERE je.fiscal_year_id = p_fiscal_year_id
    AND je.status IN ('validated', 'posted')
    AND jl.account_number LIKE '6%';

  SELECT COALESCE(SUM(jl.debit - jl.credit), 0) INTO v_tresorerie
  FROM journal_entry_lines jl
  JOIN journal_entries je ON je.id = jl.entry_id
  WHERE je.fiscal_year_id = p_fiscal_year_id
    AND je.status IN ('validated', 'posted')
    AND jl.account_number LIKE '5%';

  SELECT COUNT(*) INTO v_count
  FROM journal_entries
  WHERE fiscal_year_id = p_fiscal_year_id
    AND status IN ('validated', 'posted');

  RETURN json_build_object(
    'produits', v_produits,
    'charges', v_charges,
    'resultat', v_produits - v_charges,
    'tresorerie', v_tresorerie,
    'entryCount', v_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- 20. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_periodes_ws_fy ON periodes_comptables(workspace_id, fiscal_year_id);
CREATE INDEX IF NOT EXISTS idx_periodes_dates ON periodes_comptables(workspace_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_lettrages_ws ON lettrages(workspace_id, reference);
CREATE INDEX IF NOT EXISTS idx_lettrages_account ON lettrages(workspace_id, account_number);
CREATE INDEX IF NOT EXISTS idx_jel_lettrage ON journal_entry_lines(lettrage_code) WHERE lettrage_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jel_echeance ON journal_entry_lines(date_echeance) WHERE date_echeance IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jel_account ON journal_entry_lines(account_number);
CREATE INDEX IF NOT EXISTS idx_je_status ON journal_entries(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_je_date ON journal_entries(workspace_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_je_journal ON journal_entries(workspace_id, journal_id);
