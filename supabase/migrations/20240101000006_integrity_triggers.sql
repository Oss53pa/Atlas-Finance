-- =================================================================
-- Migration 6: Integrity Triggers & Security Hardening
-- Fixes: AF-001, AF-002, AF-003, AF-004, AF-011, AF-012, AF-015,
--        AF-025, AF-029, AF-030, AF-031
-- =================================================================

-- ============================================================
-- P0.1 — AF-001, AF-030: CHECK constraints on journal_lines
-- ============================================================
ALTER TABLE journal_lines
  ADD CONSTRAINT chk_debit_positive CHECK (debit >= 0),
  ADD CONSTRAINT chk_credit_positive CHECK (credit >= 0),
  ADD CONSTRAINT chk_not_bilateral CHECK (debit = 0 OR credit = 0);

-- Trigger DEFERRED for D=C balance check
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
    RAISE EXCEPTION 'Écriture déséquilibrée (écart: % FCFA). Σ Débit doit = Σ Crédit.', v_diff;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_validate_balance
AFTER INSERT OR UPDATE OR DELETE ON journal_lines
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_entry_balance();

-- ============================================================
-- P0.2 — AF-003: Immutability of posted entries
-- ============================================================
CREATE OR REPLACE FUNCTION protect_posted_entries()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.status = 'posted' THEN
    RAISE EXCEPTION 'Suppression interdite — écriture comptabilisée (SYSCOHADA Art. 19)';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'posted' THEN
    -- Allow only: reversed flag update, and status staying 'posted'
    IF NEW.status != OLD.status THEN
      RAISE EXCEPTION 'Modification du statut interdite — écriture comptabilisée. Utilisez une contrepassation.';
    END IF;
    IF ROW(NEW.journal, NEW.date, NEW.entry_number, NEW.description)
        IS DISTINCT FROM ROW(OLD.journal, OLD.date, OLD.entry_number, OLD.description) THEN
      RAISE EXCEPTION 'Modification interdite — écriture comptabilisée (SYSCOHADA Art. 19)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_posted
BEFORE UPDATE OR DELETE ON journal_entries
FOR EACH ROW EXECUTE FUNCTION protect_posted_entries();

-- ============================================================
-- P0.2 — AF-029: Change CASCADE to RESTRICT on journal_lines
-- ============================================================
ALTER TABLE journal_lines DROP CONSTRAINT IF EXISTS journal_lines_entry_id_fkey;
ALTER TABLE journal_lines ADD CONSTRAINT journal_lines_entry_id_fkey
  FOREIGN KEY (entry_id) REFERENCES journal_entries(id) ON DELETE RESTRICT;

-- ============================================================
-- P0.3 — AF-004: RLS on profiles
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY profiles_insert ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (company_id = (SELECT p.company_id FROM profiles p WHERE p.id = auth.uid()));

-- ============================================================
-- P0.3 — AF-011: Fix settings PK (key alone -> tenant_id + key)
-- ============================================================
ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_pkey;
ALTER TABLE settings ADD PRIMARY KEY (tenant_id, key);

-- ============================================================
-- P0.3 — AF-012: Protect audit_logs from deletion/modification
-- ============================================================
-- Remove any existing DELETE policy on audit_logs
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'audit_logs' AND cmd = 'DELETE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON audit_logs', pol.policyname);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION protect_audit_logs()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Le journal d''audit est immuable — % interdit', TG_OP;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_audit
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION protect_audit_logs();

-- ============================================================
-- P0.4 — AF-002, AF-025: Table periodes_comptables
-- ============================================================
CREATE TABLE IF NOT EXISTS periodes_comptables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  fiscal_year_id UUID NOT NULL REFERENCES fiscal_years(id),
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'locked')),
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES profiles(id),
  reopened_at TIMESTAMPTZ,
  reopened_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);

ALTER TABLE periodes_comptables ENABLE ROW LEVEL SECURITY;

CREATE POLICY periodes_tenant_select ON periodes_comptables FOR SELECT
  USING (tenant_id = get_user_company_id());
CREATE POLICY periodes_tenant_insert ON periodes_comptables FOR INSERT
  WITH CHECK (tenant_id = get_user_company_id());
CREATE POLICY periodes_tenant_update ON periodes_comptables FOR UPDATE
  USING (tenant_id = get_user_company_id());
CREATE POLICY periodes_tenant_delete ON periodes_comptables FOR DELETE
  USING (tenant_id = get_user_company_id());

CREATE TRIGGER set_updated_at_periodes
  BEFORE UPDATE ON periodes_comptables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: block entries on closed periods
CREATE OR REPLACE FUNCTION block_closed_period()
RETURNS TRIGGER AS $$
BEGIN
  -- Check fiscal year
  IF EXISTS (
    SELECT 1 FROM fiscal_years fy
    WHERE fy.tenant_id = NEW.tenant_id
      AND NEW.date BETWEEN fy.start_date AND fy.end_date
      AND fy.is_closed = true
  ) THEN
    RAISE EXCEPTION 'Saisie impossible : l''exercice comptable est clôturé';
  END IF;
  -- Check accounting period
  IF EXISTS (
    SELECT 1 FROM periodes_comptables pc
    WHERE pc.tenant_id = NEW.tenant_id
      AND NEW.date BETWEEN pc.start_date AND pc.end_date
      AND pc.status = 'closed'
  ) THEN
    RAISE EXCEPTION 'Saisie impossible : la période comptable est clôturée';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_block_closed_period
BEFORE INSERT OR UPDATE ON journal_entries
FOR EACH ROW EXECUTE FUNCTION block_closed_period();

-- ============================================================
-- P1.3 — AF-015: Table journaux
-- ============================================================
CREATE TABLE IF NOT EXISTS journaux (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  code TEXT NOT NULL,
  libelle TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('achat', 'vente', 'banque', 'caisse', 'od', 'an', 'cloture')),
  compte_contrepartie TEXT,
  last_sequence INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);

ALTER TABLE journaux ENABLE ROW LEVEL SECURITY;

CREATE POLICY journaux_tenant_select ON journaux FOR SELECT
  USING (tenant_id = get_user_company_id());
CREATE POLICY journaux_tenant_insert ON journaux FOR INSERT
  WITH CHECK (tenant_id = get_user_company_id());
CREATE POLICY journaux_tenant_update ON journaux FOR UPDATE
  USING (tenant_id = get_user_company_id());
CREATE POLICY journaux_tenant_delete ON journaux FOR DELETE
  USING (tenant_id = get_user_company_id());

CREATE TRIGGER set_updated_at_journaux
  BEFORE UPDATE ON journaux
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- P1.3 — AF-031: Sequential entry numbering trigger
-- ============================================================
CREATE OR REPLACE FUNCTION generate_sequential_entry_number()
RETURNS TRIGGER AS $$
DECLARE
  v_seq INTEGER;
  v_journal TEXT;
BEGIN
  v_journal := COALESCE(NEW.journal, 'OD');
  IF NEW.entry_number IS NULL OR NEW.entry_number = '' THEN
    SELECT COALESCE(MAX(
      CAST(REGEXP_REPLACE(entry_number, '^[A-Z]+-', '') AS INTEGER)
    ), 0) + 1
    INTO v_seq
    FROM journal_entries
    WHERE tenant_id = NEW.tenant_id
      AND journal = v_journal
      AND entry_number ~ ('^' || v_journal || E'-\\d+$');
    NEW.entry_number := v_journal || '-' || LPAD(v_seq::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_entry_number
BEFORE INSERT ON journal_entries
FOR EACH ROW EXECUTE FUNCTION generate_sequential_entry_number();

-- ============================================================
-- P1.4 — AF-008: Add date_echeance to journal_lines
-- ============================================================
ALTER TABLE journal_lines ADD COLUMN IF NOT EXISTS date_echeance DATE;

-- ============================================================
-- P1.6 — AF-016: Table lettrages
-- ============================================================
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

CREATE POLICY lettrages_tenant_select ON lettrages FOR SELECT
  USING (tenant_id = get_user_company_id());
CREATE POLICY lettrages_tenant_insert ON lettrages FOR INSERT
  WITH CHECK (tenant_id = get_user_company_id());
CREATE POLICY lettrages_tenant_update ON lettrages FOR UPDATE
  USING (tenant_id = get_user_company_id());
CREATE POLICY lettrages_tenant_delete ON lettrages FOR DELETE
  USING (tenant_id = get_user_company_id());

-- ============================================================
-- P1.11 — AF-056: Add RCCM and OHADA fields to third_parties
-- ============================================================
ALTER TABLE third_parties ADD COLUMN IF NOT EXISTS rccm TEXT;
ALTER TABLE third_parties ADD COLUMN IF NOT EXISTS regime_fiscal TEXT;
ALTER TABLE third_parties ADD COLUMN IF NOT EXISTS forme_juridique TEXT;
ALTER TABLE third_parties ADD COLUMN IF NOT EXISTS account_code TEXT;
ALTER TABLE third_parties ADD COLUMN IF NOT EXISTS collective_account_code TEXT;

-- ============================================================
-- P2.3 — AF-020: Add auxiliary account fields
-- ============================================================
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_auxiliary BOOLEAN DEFAULT false;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS collective_account_id UUID REFERENCES accounts(id);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

-- ============================================================
-- P0.5 — AF-006: RPC validate_journal_entry
-- ============================================================
CREATE OR REPLACE FUNCTION validate_journal_entry(p_entry_id UUID)
RETURNS void AS $$
DECLARE
  v_entry journal_entries;
  v_diff NUMERIC(18,2);
BEGIN
  SELECT * INTO v_entry FROM journal_entries WHERE id = p_entry_id;
  IF v_entry IS NULL THEN
    RAISE EXCEPTION 'Écriture non trouvée';
  END IF;
  IF v_entry.status != 'draft' THEN
    RAISE EXCEPTION 'Seules les écritures en brouillon peuvent être validées (statut actuel: %)', v_entry.status;
  END IF;

  SELECT ABS(COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0))
  INTO v_diff
  FROM journal_lines WHERE entry_id = p_entry_id;

  IF v_diff > 0.01 THEN
    RAISE EXCEPTION 'Écriture déséquilibrée (écart: % FCFA)', v_diff;
  END IF;

  UPDATE journal_entries SET status = 'validated', updated_at = now()
  WHERE id = p_entry_id;

  INSERT INTO audit_logs (tenant_id, action, entity_type, entity_id, details, timestamp)
  VALUES (v_entry.tenant_id, 'STATUS_CHANGE', 'journal_entry', p_entry_id::TEXT,
          jsonb_build_object('from', 'draft', 'to', 'validated'), now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- P0.5 — AF-006: RPC post_journal_entry
-- ============================================================
CREATE OR REPLACE FUNCTION post_journal_entry(p_entry_id UUID)
RETURNS void AS $$
DECLARE
  v_entry journal_entries;
BEGIN
  SELECT * INTO v_entry FROM journal_entries WHERE id = p_entry_id;
  IF v_entry IS NULL THEN
    RAISE EXCEPTION 'Écriture non trouvée';
  END IF;
  IF v_entry.status != 'validated' THEN
    RAISE EXCEPTION 'Seules les écritures validées peuvent être comptabilisées (statut actuel: %)', v_entry.status;
  END IF;

  UPDATE journal_entries SET status = 'posted', updated_at = now()
  WHERE id = p_entry_id;

  INSERT INTO audit_logs (tenant_id, action, entity_type, entity_id, details, timestamp)
  VALUES (v_entry.tenant_id, 'STATUS_CHANGE', 'journal_entry', p_entry_id::TEXT,
          jsonb_build_object('from', 'validated', 'to', 'posted'), now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- P0.5 — AF-006: RPC apply_lettrage
-- ============================================================
CREATE OR REPLACE FUNCTION apply_lettrage(
  p_tenant_id UUID,
  p_line_ids UUID[],
  p_lettrage_code TEXT
)
RETURNS void AS $$
DECLARE
  v_total_debit NUMERIC(18,2);
  v_total_credit NUMERIC(18,2);
  v_account_code TEXT;
BEGIN
  SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
  INTO v_total_debit, v_total_credit
  FROM journal_lines WHERE id = ANY(p_line_ids);

  IF ABS(v_total_debit - v_total_credit) > 0.01 THEN
    RAISE EXCEPTION 'Lettrage déséquilibré (Débit: % / Crédit: %)', v_total_debit, v_total_credit;
  END IF;

  SELECT account_code INTO v_account_code
  FROM journal_lines WHERE id = p_line_ids[1];

  UPDATE journal_lines SET lettrage_code = p_lettrage_code
  WHERE id = ANY(p_line_ids);

  INSERT INTO lettrages (tenant_id, reference, account_code, montant, type, method)
  VALUES (p_tenant_id, p_lettrage_code, v_account_code, v_total_debit, 'complet', 'manual');

  INSERT INTO audit_logs (tenant_id, action, entity_type, entity_id, details, timestamp)
  VALUES (p_tenant_id, 'LETTRAGE', 'lettrage', p_lettrage_code,
          jsonb_build_object('lines', array_length(p_line_ids, 1), 'montant', v_total_debit), now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- P3.1 — AF-041: Fix treasury KPI calculation
-- ============================================================
CREATE OR REPLACE FUNCTION get_dashboard_kpis(p_fiscal_year_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'produits', COALESCE((
      SELECT SUM(jl.credit - jl.debit)
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl.entry_id
      JOIN fiscal_years fy ON fy.id = p_fiscal_year_id
      WHERE je.status IN ('validated', 'posted')
        AND je.date BETWEEN fy.start_date AND fy.end_date
        AND jl.account_code LIKE '7%'
    ), 0),
    'charges', COALESCE((
      SELECT SUM(jl.debit - jl.credit)
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl.entry_id
      JOIN fiscal_years fy ON fy.id = p_fiscal_year_id
      WHERE je.status IN ('validated', 'posted')
        AND je.date BETWEEN fy.start_date AND fy.end_date
        AND jl.account_code LIKE '6%'
    ), 0),
    'resultat', COALESCE((
      SELECT SUM(CASE
        WHEN jl.account_code LIKE '7%' THEN jl.credit - jl.debit
        WHEN jl.account_code LIKE '6%' THEN -(jl.debit - jl.credit)
        ELSE 0 END)
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl.entry_id
      JOIN fiscal_years fy ON fy.id = p_fiscal_year_id
      WHERE je.status IN ('validated', 'posted')
        AND je.date BETWEEN fy.start_date AND fy.end_date
        AND (jl.account_code LIKE '6%' OR jl.account_code LIKE '7%')
    ), 0),
    'tresorerie', COALESCE((
      SELECT SUM(jl.debit - jl.credit)
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl.entry_id
      JOIN fiscal_years fy ON fy.id = p_fiscal_year_id
      WHERE je.status IN ('validated', 'posted')
        AND je.date BETWEEN fy.start_date AND fy.end_date
        AND jl.account_code LIKE '5%'
    ), 0),
    'entryCount', COALESCE((
      SELECT COUNT(*)
      FROM journal_entries je
      JOIN fiscal_years fy ON fy.id = p_fiscal_year_id
      WHERE je.status IN ('validated', 'posted')
        AND je.date BETWEEN fy.start_date AND fy.end_date
    ), 0)
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- Indexes on new tables
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_periodes_tenant_fy ON periodes_comptables(tenant_id, fiscal_year_id);
CREATE INDEX IF NOT EXISTS idx_periodes_dates ON periodes_comptables(tenant_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_journaux_tenant ON journaux(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_lettrages_tenant ON lettrages(tenant_id, reference);
CREATE INDEX IF NOT EXISTS idx_lettrages_account ON lettrages(tenant_id, account_code);
CREATE INDEX IF NOT EXISTS idx_journal_lines_lettrage ON journal_lines(lettrage_code) WHERE lettrage_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_journal_lines_echeance ON journal_lines(date_echeance) WHERE date_echeance IS NOT NULL;
