-- ============================================================================
-- Migration: ERP Modules Extension
-- Corrections #3 (Treasury), #4 (Assets), #8 (Purchases), #11 (Off-Balance)
-- Note: Payroll (#2), Leasing (#1), and Purchases (#8) excluded (separate apps)
-- ============================================================================

-- ============================================================================
-- PAYMENT ORDERS (Correction #3)
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES societes(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'single' CHECK (type IN ('single', 'batch')),
  beneficiary_type TEXT NOT NULL CHECK (beneficiary_type IN ('supplier', 'employee', 'tax_authority', 'social_fund', 'other')),
  beneficiary_id UUID,
  beneficiary_name TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  currency TEXT DEFAULT 'XOF',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('bank_transfer', 'check', 'cash', 'mobile_money', 'card')),
  bank_account_id UUID,
  reference TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'executed', 'rejected', 'cancelled')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  journal_entry_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, order_number)
);

ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "po_tenant_select" ON payment_orders FOR SELECT USING (tenant_id = get_user_company_id());
CREATE POLICY "po_tenant_insert" ON payment_orders FOR INSERT WITH CHECK (tenant_id = get_user_company_id());
CREATE POLICY "po_tenant_update" ON payment_orders FOR UPDATE USING (tenant_id = get_user_company_id());
CREATE POLICY "po_tenant_delete" ON payment_orders FOR DELETE USING (tenant_id = get_user_company_id());

CREATE INDEX idx_payment_orders_tenant ON payment_orders(tenant_id);
CREATE INDEX idx_payment_orders_status ON payment_orders(tenant_id, status);

-- ============================================================================
-- CASH REGISTER SESSIONS (Correction #3)
-- ============================================================================
CREATE TABLE IF NOT EXISTS cash_register_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES societes(id) ON DELETE CASCADE,
  cash_account_id TEXT NOT NULL,
  cashier_id UUID REFERENCES profiles(id),
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  opening_balance NUMERIC(15,2) NOT NULL,
  closing_balance_computed NUMERIC(15,2),
  closing_balance_counted NUMERIC(15,2),
  discrepancy NUMERIC(15,2),
  discrepancy_journal_entry_id UUID,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'reconciled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cash_register_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crs_tenant_select" ON cash_register_sessions FOR SELECT USING (tenant_id = get_user_company_id());
CREATE POLICY "crs_tenant_insert" ON cash_register_sessions FOR INSERT WITH CHECK (tenant_id = get_user_company_id());
CREATE POLICY "crs_tenant_update" ON cash_register_sessions FOR UPDATE USING (tenant_id = get_user_company_id());

CREATE INDEX idx_cash_sessions_tenant ON cash_register_sessions(tenant_id);
CREATE INDEX idx_cash_sessions_status ON cash_register_sessions(tenant_id, status);

-- ============================================================================
-- CASH MOVEMENTS (Correction #3)
-- ============================================================================
CREATE TABLE IF NOT EXISTS cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES societes(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES cash_register_sessions(id),
  type TEXT NOT NULL CHECK (type IN ('receipt', 'disbursement', 'supply_from_bank', 'deposit_to_bank')),
  amount NUMERIC(15,2) NOT NULL,
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'mobile_money', 'card')),
  reference TEXT,
  description TEXT,
  third_party_id UUID,
  journal_entry_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cm_tenant_select" ON cash_movements FOR SELECT USING (tenant_id = get_user_company_id());
CREATE POLICY "cm_tenant_insert" ON cash_movements FOR INSERT WITH CHECK (tenant_id = get_user_company_id());

CREATE INDEX idx_cash_movements_session ON cash_movements(session_id);
CREATE INDEX idx_cash_movements_tenant ON cash_movements(tenant_id);

-- ============================================================================
-- LOAN SCHEDULES (Correction #3)
-- ============================================================================
CREATE TABLE IF NOT EXISTS loan_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES societes(id) ON DELETE CASCADE,
  loan_id TEXT NOT NULL,
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  principal_amount NUMERIC(15,2) NOT NULL,
  interest_amount NUMERIC(15,2) NOT NULL,
  total_amount NUMERIC(15,2) NOT NULL,
  remaining_balance NUMERIC(15,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  journal_entry_id UUID,
  paid_at DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE loan_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ls_tenant_select" ON loan_schedules FOR SELECT USING (tenant_id = get_user_company_id());
CREATE POLICY "ls_tenant_insert" ON loan_schedules FOR INSERT WITH CHECK (tenant_id = get_user_company_id());
CREATE POLICY "ls_tenant_update" ON loan_schedules FOR UPDATE USING (tenant_id = get_user_company_id());

CREATE INDEX idx_loan_schedules_tenant ON loan_schedules(tenant_id);
CREATE INDEX idx_loan_schedules_loan ON loan_schedules(loan_id);
CREATE INDEX idx_loan_schedules_status ON loan_schedules(tenant_id, status);

-- ============================================================================
-- CHECKS REGISTER (Correction #3)
-- ============================================================================
CREATE TABLE IF NOT EXISTS checks_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES societes(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  check_number TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  third_party_id UUID,
  issue_date DATE NOT NULL,
  deposit_date DATE,
  clearance_date DATE,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'deposited', 'cleared', 'bounced', 'cancelled', 'issued', 'cashed')),
  bounce_reason TEXT,
  journal_entry_id UUID,
  bounce_journal_entry_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE checks_register ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cr_tenant_select" ON checks_register FOR SELECT USING (tenant_id = get_user_company_id());
CREATE POLICY "cr_tenant_insert" ON checks_register FOR INSERT WITH CHECK (tenant_id = get_user_company_id());
CREATE POLICY "cr_tenant_update" ON checks_register FOR UPDATE USING (tenant_id = get_user_company_id());

CREATE INDEX idx_checks_tenant ON checks_register(tenant_id);
CREATE INDEX idx_checks_direction ON checks_register(tenant_id, direction, status);

-- ============================================================================
-- OFF-BALANCE COMMITMENTS (Correction #11)
-- ============================================================================
CREATE TABLE IF NOT EXISTS off_balance_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES societes(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('guarantee_given', 'guarantee_received', 'mortgage', 'pledge', 'lease_commitment', 'bank_guarantee', 'letter_of_credit', 'other')),
  counterparty TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(15,2) NOT NULL,
  currency TEXT DEFAULT 'XOF',
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'released')),
  reference_document TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE off_balance_commitments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "obc_tenant_select" ON off_balance_commitments FOR SELECT USING (tenant_id = get_user_company_id());
CREATE POLICY "obc_tenant_insert" ON off_balance_commitments FOR INSERT WITH CHECK (tenant_id = get_user_company_id());
CREATE POLICY "obc_tenant_update" ON off_balance_commitments FOR UPDATE USING (tenant_id = get_user_company_id());
CREATE POLICY "obc_tenant_delete" ON off_balance_commitments FOR DELETE USING (tenant_id = get_user_company_id());

CREATE INDEX idx_obc_tenant ON off_balance_commitments(tenant_id);
CREATE INDEX idx_obc_status ON off_balance_commitments(tenant_id, status);

-- ============================================================================
-- ASSET COMPONENT FIELDS (Correction #4)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'parent_asset_id') THEN
    ALTER TABLE assets ADD COLUMN parent_asset_id UUID REFERENCES assets(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'is_component') THEN
    ALTER TABLE assets ADD COLUMN is_component BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'component_type') THEN
    ALTER TABLE assets ADD COLUMN component_type TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'impairment_amount') THEN
    ALTER TABLE assets ADD COLUMN impairment_amount NUMERIC(15,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'location') THEN
    ALTER TABLE assets ADD COLUMN location TEXT;
  END IF;
END$$;

-- ============================================================================
-- UPDATE TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'payment_orders', 'checks_register', 'off_balance_commitments'
  ]) LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS update_%s_updated_at ON %I; CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      tbl, tbl, tbl, tbl
    );
  END LOOP;
END$$;
