-- ============================================================================
-- PART 2/3: RLS, Indexes, Triggers
-- Run this SECOND after Part 1 succeeds
-- ============================================================================

-- Enable RLS on all tenant tables
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
ALTER TABLE axes_analytiques ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections_analytiques ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventilations_analytiques ENABLE ROW LEVEL SECURITY;
ALTER TABLE rapprochements ENABLE ROW LEVEL SECURITY;
ALTER TABLE lignes_rapprochement ENABLE ROW LEVEL SECURITY;

-- Helper function
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
    'alias_tiers', 'alias_prefix_config', 'fiscal_periods', 'recovery_cases',
    'axes_analytiques', 'sections_analytiques', 'ventilations_analytiques',
    'rapprochements', 'lignes_rapprochement'
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

-- Profiles RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select ON profiles;
DROP POLICY IF EXISTS profiles_insert ON profiles;
DROP POLICY IF EXISTS profiles_update ON profiles;

CREATE POLICY profiles_select ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (id = auth.uid());

-- Remove DELETE policy on audit_logs (immutable)
DROP POLICY IF EXISTS audit_logs_delete ON audit_logs;
