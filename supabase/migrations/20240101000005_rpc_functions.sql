-- ============================================================================
-- Migration 5: RPC Functions
-- WiseBook ERP - Supabase PostgreSQL
-- ============================================================================

-- ============================================================================
-- RPC: Get trial balance for a fiscal year
-- ============================================================================
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

-- ============================================================================
-- RPC: Get general ledger for an account
-- ============================================================================
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

-- ============================================================================
-- RPC: Dashboard KPIs
-- ============================================================================
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
      COALESCE(SUM(CASE WHEN jl.account_code LIKE '5%' AND jl.debit > jl.credit THEN jl.debit - jl.credit ELSE 0 END), 0) AS tresorerie
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
