-- ============================================================================
-- Migration 9: Schema Alignment — fix mismatches between Dexie & Supabase
-- ============================================================================

-- ============================================================================
-- 1. Add tenant_id to lignes_rapprochement (was missing)
-- ============================================================================
ALTER TABLE lignes_rapprochement
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES societes(id);

-- Backfill tenant_id from parent rapprochements
UPDATE lignes_rapprochement lr
SET tenant_id = r.tenant_id
FROM rapprochements r
WHERE lr.rapprochement_id = r.id
  AND lr.tenant_id IS NULL;

-- Now make it NOT NULL
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

-- ============================================================================
-- 2. Create stock_movements table
-- ============================================================================
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

CREATE POLICY stock_movements_select ON stock_movements
  FOR SELECT USING (tenant_id = get_user_company_id());
CREATE POLICY stock_movements_insert ON stock_movements
  FOR INSERT WITH CHECK (tenant_id = get_user_company_id());
CREATE POLICY stock_movements_update ON stock_movements
  FOR UPDATE USING (tenant_id = get_user_company_id());
CREATE POLICY stock_movements_delete ON stock_movements
  FOR DELETE USING (tenant_id = get_user_company_id());

CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(tenant_id, item_id, date);

-- ============================================================================
-- 3. Create recovery_cases table
-- ============================================================================
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

CREATE POLICY recovery_cases_select ON recovery_cases
  FOR SELECT USING (tenant_id = get_user_company_id());
CREATE POLICY recovery_cases_insert ON recovery_cases
  FOR INSERT WITH CHECK (tenant_id = get_user_company_id());
CREATE POLICY recovery_cases_update ON recovery_cases
  FOR UPDATE USING (tenant_id = get_user_company_id());
CREATE POLICY recovery_cases_delete ON recovery_cases
  FOR DELETE USING (tenant_id = get_user_company_id());

CREATE INDEX IF NOT EXISTS idx_recovery_cases_tenant ON recovery_cases(tenant_id, statut);

CREATE TRIGGER trg_recovery_cases_updated_at
  BEFORE UPDATE ON recovery_cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 4. Create periodes_comptables with tenant_id (if not exists from migration 006_integrity)
-- ============================================================================
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

CREATE TRIGGER trg_periodes_comptables_updated_at
  BEFORE UPDATE ON periodes_comptables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 5. RPC: get_account_balance (needed by SupabaseAdapter)
-- ============================================================================
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
  -- Build regex pattern from prefixes: ^(60|61|62)
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

-- ============================================================================
-- 6. RPC: get_trial_balance with date range (needed by SupabaseAdapter)
-- Overload of migration 005's version which takes p_fiscal_year_id
-- ============================================================================
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
