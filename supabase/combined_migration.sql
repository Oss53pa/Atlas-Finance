-- ============================================================================
-- WiseBook / Atlas F&A — COMBINED MIGRATION
-- Execute in Supabase SQL Editor (https://supabase.com/dashboard/project/vgtmljfayiysuvrcmunt/sql)
-- ============================================================================

-- ============================================================================
-- MIGRATION 1: RBAC & Core Tables
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS societes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  description TEXT,
  email TEXT,
  telephone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  module TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  role_id UUID REFERENCES roles(id),
  company_id UUID REFERENCES societes(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS devises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  symbole TEXT NOT NULL,
  taux_change NUMERIC(18,6) DEFAULT 1.0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- MIGRATION 2: Accounting Tables
-- ============================================================================
CREATE TABLE IF NOT EXISTS fiscal_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_closed BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  account_class TEXT NOT NULL,
  account_type TEXT NOT NULL,
  parent_code TEXT,
  level INTEGER NOT NULL DEFAULT 1,
  normal_balance TEXT CHECK (normal_balance IN ('debit', 'credit')),
  is_reconcilable BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  entry_number TEXT NOT NULL,
  journal TEXT NOT NULL,
  date DATE NOT NULL,
  reference TEXT,
  label TEXT NOT NULL,
  status TEXT CHECK (status IN ('draft', 'validated', 'posted')) DEFAULT 'draft',
  total_debit NUMERIC(18,2) DEFAULT 0,
  total_credit NUMERIC(18,2) DEFAULT 0,
  reversed BOOLEAN DEFAULT false,
  reversed_by UUID,
  reversed_at TIMESTAMPTZ,
  reversal_of UUID,
  reversal_reason TEXT,
  hash TEXT,
  previous_hash TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, entry_number)
);

CREATE TABLE IF NOT EXISTS journal_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES societes(id),
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  third_party_code TEXT,
  third_party_name TEXT,
  label TEXT,
  debit NUMERIC(18,2) DEFAULT 0,
  credit NUMERIC(18,2) DEFAULT 0,
  analytical_code TEXT,
  lettrage_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS third_parties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('customer', 'supplier', 'both')),
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  balance NUMERIC(18,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);

CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  acquisition_date DATE NOT NULL,
  acquisition_value NUMERIC(18,2) NOT NULL,
  residual_value NUMERIC(18,2) DEFAULT 0,
  cumul_depreciation NUMERIC(18,2) DEFAULT 0,
  depreciation_method TEXT CHECK (depreciation_method IN ('linear', 'declining')),
  useful_life_years INTEGER NOT NULL,
  account_code TEXT NOT NULL,
  depreciation_account_code TEXT NOT NULL,
  status TEXT CHECK (status IN ('active', 'disposed', 'scrapped')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code),
  CONSTRAINT chk_acquisition_positive CHECK (acquisition_value >= COALESCE(residual_value, 0))
);

CREATE TABLE IF NOT EXISTS budget_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  account_code TEXT NOT NULL,
  fiscal_year TEXT NOT NULL,
  period TEXT NOT NULL,
  budgeted NUMERIC(18,2) DEFAULT 0,
  actual NUMERIC(18,2) DEFAULT 0,
  version TEXT NOT NULL DEFAULT 'B0',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id),
  details TEXT,
  hash TEXT,
  previous_hash TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES societes(id),
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (tenant_id, key)
);

-- ============================================================================
-- MIGRATION 3: Extended Tables
-- ============================================================================
CREATE TABLE IF NOT EXISTS closure_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  type TEXT CHECK (type IN ('MENSUELLE', 'TRIMESTRIELLE', 'SEMESTRIELLE', 'ANNUELLE', 'SPECIALE')),
  periode TEXT,
  exercice TEXT NOT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  date_creation TIMESTAMPTZ DEFAULT now(),
  statut TEXT CHECK (statut IN ('EN_COURS', 'VALIDEE', 'CLOTUREE', 'ANNULEE')) DEFAULT 'EN_COURS',
  cree_par TEXT,
  progression NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  session_id UUID REFERENCES closure_sessions(id),
  compte_client TEXT NOT NULL,
  client TEXT NOT NULL,
  solde NUMERIC(18,2) DEFAULT 0,
  anciennete INTEGER DEFAULT 0,
  taux_provision NUMERIC(5,2) DEFAULT 0,
  montant_provision NUMERIC(18,2) DEFAULT 0,
  statut TEXT CHECK (statut IN ('PROPOSEE', 'VALIDEE', 'REJETEE')) DEFAULT 'PROPOSEE',
  date_proposition TIMESTAMPTZ DEFAULT now(),
  date_validation TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate NUMERIC(18,6) NOT NULL,
  date DATE NOT NULL,
  provider TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, from_currency, to_currency, date)
);

CREATE TABLE IF NOT EXISTS hedging_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  currency TEXT NOT NULL,
  type TEXT CHECK (type IN ('forward', 'option', 'swap')),
  amount NUMERIC(18,2) NOT NULL,
  strike_rate NUMERIC(18,6) NOT NULL,
  current_rate NUMERIC(18,6) NOT NULL,
  maturity_date DATE NOT NULL,
  unrealized_pnl NUMERIC(18,2) DEFAULT 0,
  status TEXT CHECK (status IN ('active', 'expired', 'exercised')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS revision_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  session_id UUID,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  isa_assertion TEXT,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  test_type TEXT,
  status TEXT CHECK (status IN ('en_attente', 'en_cours', 'valide', 'revise', 'approuve')) DEFAULT 'en_attente',
  findings TEXT,
  conclusion TEXT,
  reviewer TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  location TEXT,
  quantity NUMERIC(18,4) DEFAULT 0,
  unit_cost NUMERIC(18,2) DEFAULT 0,
  total_value NUMERIC(18,2) DEFAULT 0,
  min_stock NUMERIC(18,4) DEFAULT 0,
  max_stock NUMERIC(18,4) DEFAULT 0,
  unit TEXT,
  last_movement_date DATE,
  status TEXT CHECK (status IN ('active', 'inactive', 'discontinued')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  item_id UUID REFERENCES inventory_items(id),
  type TEXT NOT NULL,
  quantity NUMERIC(18,4) NOT NULL,
  unit_cost NUMERIC(18,2) DEFAULT 0,
  reference TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alias_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  alias TEXT NOT NULL,
  prefix TEXT NOT NULL,
  label TEXT NOT NULL,
  comptes_comptables TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, alias)
);

CREATE TABLE IF NOT EXISTS alias_prefix_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  sous_compte_code TEXT NOT NULL,
  prefix TEXT NOT NULL,
  type_label TEXT,
  UNIQUE(tenant_id, sous_compte_code)
);

CREATE TABLE IF NOT EXISTS fiscal_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  fiscal_year_id UUID REFERENCES fiscal_years(id),
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cloturee', 'locked')),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);

CREATE TABLE IF NOT EXISTS recovery_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  third_party_id UUID REFERENCES third_parties(id),
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'open',
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- MIGRATION 4: Row Level Security & Indexes
-- ============================================================================
ALTER TABLE fiscal_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE third_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE closure_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE provisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE hedging_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE alias_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE alias_prefix_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_cases ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's company_id
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS policies for ALL tenant tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'fiscal_years', 'accounts', 'journal_entries', 'journal_lines',
    'third_parties', 'assets', 'budget_lines', 'audit_logs', 'settings',
    'closure_sessions', 'provisions', 'exchange_rates', 'hedging_positions',
    'revision_items', 'inventory_items', 'stock_movements',
    'alias_tiers', 'alias_prefix_config', 'fiscal_periods', 'recovery_cases'
  ]) LOOP
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
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR DELETE USING (tenant_id = get_user_company_id())',
      tbl || '_delete', tbl
    );
  END LOOP;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_date ON journal_entries(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_journal ON journal_entries(tenant_id, journal);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_status ON journal_entries(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_lines(tenant_id, account_code);
CREATE INDEX IF NOT EXISTS idx_accounts_tenant_code ON accounts(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_accounts_tenant_class ON accounts(tenant_id, account_class);
CREATE INDEX IF NOT EXISTS idx_third_parties_tenant_type ON third_parties(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_assets_tenant_status ON assets(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_budget_lines_tenant_fy ON budget_lines(tenant_id, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_action ON audit_logs(tenant_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_entity ON audit_logs(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies ON exchange_rates(tenant_id, from_currency, to_currency, date);
CREATE INDEX IF NOT EXISTS idx_closure_sessions_tenant ON closure_sessions(tenant_id, exercice);
CREATE INDEX IF NOT EXISTS idx_provisions_session ON provisions(session_id);
CREATE INDEX IF NOT EXISTS idx_revision_items_session ON revision_items(session_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_tenant_code ON inventory_items(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_fiscal_periods_tenant ON fiscal_periods(tenant_id, fiscal_year_id);
CREATE INDEX IF NOT EXISTS idx_recovery_cases_tenant ON recovery_cases(tenant_id, status);

-- Auto-update updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'societes', 'profiles', 'fiscal_years', 'accounts', 'journal_entries',
    'third_parties', 'assets', 'budget_lines', 'closure_sessions',
    'hedging_positions', 'revision_items', 'inventory_items',
    'fiscal_periods', 'recovery_cases'
  ]) LOOP
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      'trg_' || tbl || '_updated_at', tbl
    );
  END LOOP;
END $$;

-- ============================================================================
-- MIGRATION 5: RPC Functions
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

-- ============================================================================
-- MIGRATION 6: Business Triggers + Analytical Tables
-- ============================================================================

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

-- Remove DELETE policy on audit_logs
DROP POLICY IF EXISTS audit_logs_delete ON audit_logs;

-- Analytical tables
CREATE TABLE IF NOT EXISTS axes_analytiques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  code TEXT NOT NULL,
  libelle TEXT NOT NULL,
  type_axe TEXT CHECK (type_axe IN ('centre_cout', 'centre_profit', 'projet', 'produit', 'region', 'activite')),
  obligatoire BOOLEAN DEFAULT false,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);

CREATE TABLE IF NOT EXISTS sections_analytiques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  axe_id UUID NOT NULL REFERENCES axes_analytiques(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES societes(id),
  code TEXT NOT NULL,
  libelle TEXT NOT NULL,
  parent_id UUID REFERENCES sections_analytiques(id),
  responsable TEXT,
  budget_annuel NUMERIC(18,2) DEFAULT 0,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(axe_id, code)
);

CREATE TABLE IF NOT EXISTS ventilations_analytiques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ligne_ecriture_id UUID NOT NULL REFERENCES journal_lines(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES sections_analytiques(id),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  pourcentage NUMERIC(5,2) NOT NULL CHECK (pourcentage > 0 AND pourcentage <= 100),
  montant NUMERIC(18,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bank reconciliation tables
CREATE TABLE IF NOT EXISTS rapprochements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  compte_bancaire TEXT NOT NULL,
  date_rapprochement DATE NOT NULL,
  periode_debut DATE NOT NULL,
  periode_fin DATE NOT NULL,
  solde_releve NUMERIC(18,2) NOT NULL,
  solde_comptable NUMERIC(18,2) NOT NULL,
  ecart_residuel NUMERIC(18,2) NOT NULL DEFAULT 0,
  taux_rapprochement NUMERIC(5,2) DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'ouvert' CHECK (statut IN ('ouvert', 'cloture')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS lignes_rapprochement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rapprochement_id UUID NOT NULL REFERENCES rapprochements(id) ON DELETE CASCADE,
  journal_line_id UUID REFERENCES journal_lines(id),
  bank_transaction_ref TEXT,
  type_ligne TEXT NOT NULL CHECK (type_ligne IN ('rapproche', 'depot_transit', 'cheque_circulation', 'non_rapproche')),
  montant NUMERIC(18,2) NOT NULL,
  date_operation DATE NOT NULL,
  libelle TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS on new tables
ALTER TABLE axes_analytiques ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections_analytiques ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventilations_analytiques ENABLE ROW LEVEL SECURITY;
ALTER TABLE rapprochements ENABLE ROW LEVEL SECURITY;
ALTER TABLE lignes_rapprochement ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'axes_analytiques', 'sections_analytiques', 'ventilations_analytiques',
    'rapprochements', 'lignes_rapprochement'
  ]) LOOP
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (tenant_id = get_user_company_id())', tbl || '_select', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (tenant_id = get_user_company_id())', tbl || '_insert', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING (tenant_id = get_user_company_id())', tbl || '_update', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE USING (tenant_id = get_user_company_id())', tbl || '_delete', tbl);
  END LOOP;
END $$;

-- ============================================================================
-- MIGRATION 7: RPC Annual Closure
-- ============================================================================
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

-- ============================================================================
-- PROFILES RLS
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select ON profiles;
DROP POLICY IF EXISTS profiles_insert ON profiles;
DROP POLICY IF EXISTS profiles_update ON profiles;

CREATE POLICY profiles_select ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (id = auth.uid());

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Demo company
INSERT INTO societes (id, code, nom, description, email, telephone, address)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'ATLAS', 'Atlas F&A',
  'Societe de demonstration - ERP Comptable SYSCOHADA',
  'contact@atlasfna.cm', '+237 690 000 000', 'Douala, Cameroun'
) ON CONFLICT (code) DO NOTHING;

-- Currencies
INSERT INTO devises (code, nom, symbole, taux_change, is_active) VALUES
  ('XAF', 'Franc CFA CEMAC', 'FCFA', 1.000000, true),
  ('XOF', 'Franc CFA UEMOA', 'FCFA', 1.000000, true),
  ('EUR', 'Euro', 'EUR', 655.957000, true),
  ('USD', 'Dollar americain', 'USD', 600.000000, true)
ON CONFLICT (code) DO NOTHING;

-- Roles
INSERT INTO roles (id, code, name, description) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'admin', 'Administrateur', 'Acces complet'),
  ('b0000000-0000-0000-0000-000000000002', 'manager', 'Manager', 'Gestion et supervision'),
  ('b0000000-0000-0000-0000-000000000003', 'accountant', 'Comptable', 'Saisie et comptabilite'),
  ('b0000000-0000-0000-0000-000000000004', 'user', 'Utilisateur', 'Acces en lecture')
ON CONFLICT (code) DO NOTHING;

-- Permissions
INSERT INTO permissions (id, code, name, module) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'accounting.view', 'Voir la comptabilite', 'accounting'),
  ('c0000000-0000-0000-0000-000000000002', 'accounting.create', 'Creer des ecritures', 'accounting'),
  ('c0000000-0000-0000-0000-000000000003', 'accounting.edit', 'Modifier des ecritures', 'accounting'),
  ('c0000000-0000-0000-0000-000000000004', 'accounting.delete', 'Supprimer des ecritures', 'accounting'),
  ('c0000000-0000-0000-0000-000000000005', 'accounting.validate', 'Valider des ecritures', 'accounting'),
  ('c0000000-0000-0000-0000-000000000006', 'treasury.view', 'Voir la tresorerie', 'treasury'),
  ('c0000000-0000-0000-0000-000000000007', 'treasury.create', 'Creer des mouvements', 'treasury'),
  ('c0000000-0000-0000-0000-000000000008', 'treasury.edit', 'Modifier des mouvements', 'treasury'),
  ('c0000000-0000-0000-0000-000000000009', 'customers.view', 'Voir les clients', 'customers'),
  ('p0000000-0000-0000-0000-000000000010', 'customers.create', 'Creer des clients', 'customers'),
  ('p0000000-0000-0000-0000-000000000011', 'customers.edit', 'Modifier des clients', 'customers'),
  ('p0000000-0000-0000-0000-000000000012', 'suppliers.view', 'Voir les fournisseurs', 'suppliers'),
  ('p0000000-0000-0000-0000-000000000013', 'suppliers.create', 'Creer des fournisseurs', 'suppliers'),
  ('p0000000-0000-0000-0000-000000000014', 'suppliers.edit', 'Modifier des fournisseurs', 'suppliers'),
  ('p0000000-0000-0000-0000-000000000015', 'dashboard.view', 'Voir le tableau de bord', 'dashboard'),
  ('p0000000-0000-0000-0000-000000000016', 'reports.view', 'Voir les rapports', 'reports'),
  ('p0000000-0000-0000-0000-000000000017', 'reports.export', 'Exporter les rapports', 'reports'),
  ('p0000000-0000-0000-0000-000000000018', 'admin.users', 'Gerer les utilisateurs', 'admin'),
  ('p0000000-0000-0000-0000-000000000019', 'admin.settings', 'Gerer les parametres', 'admin'),
  ('p0000000-0000-0000-0000-000000000020', 'admin.roles', 'Gerer les roles', 'admin')
ON CONFLICT (code) DO NOTHING;

-- Admin: all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'b0000000-0000-0000-0000-000000000001', id FROM permissions
ON CONFLICT DO NOTHING;

-- Manager: everything except admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'b0000000-0000-0000-0000-000000000002', id FROM permissions WHERE module != 'admin'
ON CONFLICT DO NOTHING;

-- Accountant: accounting, treasury, customers, suppliers, dashboard, reports
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'b0000000-0000-0000-0000-000000000003', id FROM permissions
WHERE module IN ('accounting', 'treasury', 'customers', 'suppliers', 'dashboard', 'reports') AND code NOT LIKE '%.delete'
ON CONFLICT DO NOTHING;

-- User: view only
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'b0000000-0000-0000-0000-000000000004', id FROM permissions WHERE code LIKE '%.view'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- DONE! Next steps:
-- 1. Go to Authentication > Users > Add user
--    Create: admin@atlasfna.cm / Admin123!
-- 2. Copy the user UUID and run:
--    INSERT INTO profiles (id, email, username, first_name, last_name, role_id, company_id, is_active)
--    VALUES ('<USER_UUID>', 'admin@atlasfna.cm', 'admin', 'Admin', 'Atlas',
--            'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', true);
-- ============================================================================
