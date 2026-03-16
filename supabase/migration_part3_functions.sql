-- ============================================================================
-- PART 3/3: RPC Functions + Business Triggers
-- Run this THIRD after Part 2 succeeds
-- ============================================================================

-- Trial balance
CREATE OR REPLACE FUNCTION get_trial_balance(p_fiscal_year_id UUID)
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
  JOIN fiscal_years fy ON fy.id = p_fiscal_year_id
    AND je.date BETWEEN fy.start_date AND fy.end_date
  WHERE je.tenant_id = get_user_company_id()
    AND je.status IN ('validated', 'posted')
  GROUP BY jl.account_code, jl.account_name
  ORDER BY jl.account_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- General ledger
CREATE OR REPLACE FUNCTION get_general_ledger(
  p_account_code TEXT,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  entry_id UUID,
  entry_number TEXT,
  journal TEXT,
  date DATE,
  label TEXT,
  debit NUMERIC,
  credit NUMERIC,
  running_balance NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    je.id AS entry_id,
    je.entry_number,
    je.journal,
    je.date,
    jl.label,
    jl.debit,
    jl.credit,
    SUM(jl.debit - jl.credit) OVER (ORDER BY je.date, je.entry_number) AS running_balance
  FROM journal_lines jl
  JOIN journal_entries je ON jl.entry_id = je.id
  WHERE jl.account_code = p_account_code
    AND je.date BETWEEN p_start_date AND p_end_date
    AND je.tenant_id = get_user_company_id()
    AND je.status IN ('validated', 'posted')
  ORDER BY je.date, je.entry_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Dashboard KPIs
CREATE OR REPLACE FUNCTION get_dashboard_kpis(p_fiscal_year_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_tenant UUID := get_user_company_id();
BEGIN
  WITH fy AS (
    SELECT start_date, end_date FROM fiscal_years WHERE id = p_fiscal_year_id AND tenant_id = v_tenant
  ),
  totals AS (
    SELECT
      COALESCE(SUM(CASE WHEN jl.account_code LIKE '7%' THEN jl.credit - jl.debit ELSE 0 END), 0) AS produits,
      COALESCE(SUM(CASE WHEN jl.account_code LIKE '6%' THEN jl.debit - jl.credit ELSE 0 END), 0) AS charges,
      COALESCE(SUM(CASE WHEN jl.account_code LIKE '5%' THEN jl.debit - jl.credit ELSE 0 END), 0) AS tresorerie
    FROM journal_lines jl
    JOIN journal_entries je ON jl.entry_id = je.id
    CROSS JOIN fy
    WHERE je.tenant_id = v_tenant
      AND je.date BETWEEN fy.start_date AND fy.end_date
      AND je.status IN ('validated', 'posted')
  )
  SELECT json_build_object(
    'produits', t.produits,
    'charges', t.charges,
    'resultat', t.produits - t.charges,
    'tresorerie', t.tresorerie,
    'entryCount', (SELECT COUNT(*) FROM journal_entries je CROSS JOIN fy WHERE je.tenant_id = v_tenant AND je.date BETWEEN fy.start_date AND fy.end_date)
  ) INTO v_result
  FROM totals t;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Balanced entry check on validation
CREATE OR REPLACE FUNCTION check_entry_balanced()
RETURNS TRIGGER AS $$
DECLARE
  v_total_debit NUMERIC;
  v_total_credit NUMERIC;
BEGIN
  IF NEW.status IN ('validated', 'posted') AND
     (OLD.status IS NULL OR OLD.status = 'draft') THEN
    SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
    INTO v_total_debit, v_total_credit
    FROM journal_lines WHERE entry_id = NEW.id;

    IF ABS(v_total_debit - v_total_credit) > 0.01 THEN
      RAISE EXCEPTION 'Ecriture desequilibree: D=% C=%', v_total_debit, v_total_credit;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_entry_balanced
BEFORE UPDATE ON journal_entries
FOR EACH ROW EXECUTE FUNCTION check_entry_balanced();

-- Prevent write on closed fiscal year
CREATE OR REPLACE FUNCTION prevent_write_on_closed_period()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM fiscal_years
    WHERE tenant_id = NEW.tenant_id
      AND NEW.date BETWEEN start_date AND end_date
      AND is_closed = true
  ) THEN
    RAISE EXCEPTION 'Ecriture impossible : exercice cloture (SYSCOHADA Art. 19)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_write_on_closed_period
BEFORE INSERT OR UPDATE ON journal_entries
FOR EACH ROW EXECUTE FUNCTION prevent_write_on_closed_period();

-- Prevent reopening closed fiscal year
CREATE OR REPLACE FUNCTION prevent_exercice_reopen()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_closed = true AND NEW.is_closed = false THEN
    RAISE EXCEPTION 'Un exercice cloture ne peut pas etre reouvert (SYSCOHADA Art. 19)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_exercice_reopen
BEFORE UPDATE ON fiscal_years
FOR EACH ROW EXECUTE FUNCTION prevent_exercice_reopen();

-- Audit logs are immutable
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'La piste d''audit est immuable — % interdit (SYSCOHADA Art. 20)', TG_OP;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_audit_modification
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- Annual closure RPC
CREATE OR REPLACE FUNCTION execute_annual_closure(
  p_fiscal_year_id UUID,
  p_tenant_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_fy RECORD;
  v_resultat NUMERIC(18,2);
  v_entry_id UUID;
  v_entry_number TEXT;
  v_total_debit NUMERIC(18,2);
  v_total_credit NUMERIC(18,2);
BEGIN
  SELECT * INTO v_fy FROM fiscal_years WHERE id = p_fiscal_year_id AND tenant_id = p_tenant_id;
  IF v_fy IS NULL THEN RAISE EXCEPTION 'Exercice non trouve'; END IF;
  IF v_fy.is_closed THEN RAISE EXCEPTION 'Exercice deja cloture'; END IF;

  IF EXISTS (
    SELECT 1 FROM journal_entries
    WHERE tenant_id = p_tenant_id AND date BETWEEN v_fy.start_date AND v_fy.end_date AND status = 'draft'
  ) THEN
    RAISE EXCEPTION 'Des ecritures brouillon existent — validez-les avant la cloture';
  END IF;

  SELECT COALESCE(SUM(jl.debit), 0), COALESCE(SUM(jl.credit), 0)
  INTO v_total_debit, v_total_credit
  FROM journal_lines jl
  JOIN journal_entries je ON je.id = jl.entry_id
  WHERE je.tenant_id = p_tenant_id AND je.date BETWEEN v_fy.start_date AND v_fy.end_date
    AND je.status IN ('validated', 'posted');

  SELECT
    COALESCE(SUM(CASE WHEN jl.account_code ~ '^7' THEN jl.credit - jl.debit ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN jl.account_code ~ '^6' THEN jl.debit - jl.credit ELSE 0 END), 0)
  INTO v_resultat
  FROM journal_lines jl
  JOIN journal_entries je ON je.id = jl.entry_id
  WHERE je.tenant_id = p_tenant_id AND je.date BETWEEN v_fy.start_date AND v_fy.end_date
    AND je.status IN ('validated', 'posted');

  v_entry_number := 'CL-' || to_char(v_fy.end_date, 'YYYYMMDD') || '-001';
  v_entry_id := gen_random_uuid();

  INSERT INTO journal_entries (id, tenant_id, entry_number, journal, date, label, status, total_debit, total_credit)
  VALUES (v_entry_id, p_tenant_id, v_entry_number, 'CL', v_fy.end_date,
    'Determination du resultat — Cloture ' || v_fy.code, 'posted',
    CASE WHEN v_resultat >= 0 THEN 0 ELSE ABS(v_resultat) END,
    CASE WHEN v_resultat >= 0 THEN v_resultat ELSE 0 END);

  IF v_resultat >= 0 THEN
    INSERT INTO journal_lines (id, entry_id, tenant_id, account_code, account_name, label, debit, credit)
    VALUES (gen_random_uuid(), v_entry_id, p_tenant_id, '120', 'Resultat (benefice)',
      'Resultat net ' || v_fy.code, 0, v_resultat);
  ELSE
    INSERT INTO journal_lines (id, entry_id, tenant_id, account_code, account_name, label, debit, credit)
    VALUES (gen_random_uuid(), v_entry_id, p_tenant_id, '129', 'Resultat (perte)',
      'Resultat net ' || v_fy.code, ABS(v_resultat), 0);
  END IF;

  UPDATE journal_entries SET status = 'posted'
  WHERE tenant_id = p_tenant_id AND date BETWEEN v_fy.start_date AND v_fy.end_date AND status = 'validated';

  UPDATE fiscal_years SET is_closed = true WHERE id = p_fiscal_year_id;

  RETURN jsonb_build_object('success', true, 'resultat_net', v_resultat, 'entry_id', v_entry_id, 'fiscal_year_code', v_fy.code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
