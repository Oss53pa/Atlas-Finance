-- ============================================================================
-- Correction #3 — Payment Orders, Cash Register, Loan Schedules, Checks
-- Correction #8 — Purchase Orders & Goods Receipts
-- Correction #11 — Off-Balance Commitments
-- ============================================================================

-- ============================================================================
-- PAYMENT ORDERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES societes(id),
  order_number VARCHAR NOT NULL,
  type VARCHAR NOT NULL DEFAULT 'single' CHECK (type IN ('single', 'batch')),
  beneficiary_type VARCHAR NOT NULL CHECK (beneficiary_type IN ('supplier', 'employee', 'tax_authority', 'social_fund', 'other')),
  beneficiary_id UUID,
  beneficiary_name VARCHAR NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'XOF',
  payment_method VARCHAR NOT NULL CHECK (payment_method IN ('bank_transfer', 'check', 'cash', 'mobile_money', 'card')),
  bank_account_id UUID,
  reference VARCHAR,
  description TEXT,
  status VARCHAR NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'executed', 'rejected', 'cancelled')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  journal_entry_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, order_number)
);

ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_orders_tenant" ON payment_orders
  USING (company_id = (current_setting('app.current_company_id', true))::uuid);

CREATE INDEX idx_payment_orders_status ON payment_orders(company_id, status);
CREATE INDEX idx_payment_orders_beneficiary ON payment_orders(company_id, beneficiary_type);

-- ============================================================================
-- CASH REGISTER SESSIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS cash_register_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES societes(id),
  cash_account_id VARCHAR NOT NULL,
  cashier_id UUID NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  opening_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  closing_balance_computed DECIMAL(15,2),
  closing_balance_counted DECIMAL(15,2),
  discrepancy DECIMAL(15,2),
  discrepancy_journal_entry_id UUID,
  status VARCHAR NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'reconciled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cash_register_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cash_sessions_tenant" ON cash_register_sessions
  USING (company_id = (current_setting('app.current_company_id', true))::uuid);

CREATE INDEX idx_cash_sessions_status ON cash_register_sessions(company_id, status);

-- ============================================================================
-- CASH MOVEMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES societes(id),
  session_id UUID NOT NULL REFERENCES cash_register_sessions(id),
  type VARCHAR NOT NULL CHECK (type IN ('receipt', 'disbursement', 'supply_from_bank', 'deposit_to_bank')),
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'mobile_money', 'card')),
  reference VARCHAR,
  description TEXT,
  third_party_id UUID,
  journal_entry_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cash_movements_tenant" ON cash_movements
  USING (company_id = (current_setting('app.current_company_id', true))::uuid);

CREATE INDEX idx_cash_movements_session ON cash_movements(session_id);

-- ============================================================================
-- LOAN SCHEDULES
-- ============================================================================
CREATE TABLE IF NOT EXISTS loan_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES societes(id),
  loan_id UUID NOT NULL,
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  principal_amount DECIMAL(15,2) NOT NULL,
  interest_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL,
  remaining_balance DECIMAL(15,2) NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  journal_entry_id UUID,
  paid_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE loan_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loan_schedules_tenant" ON loan_schedules
  USING (company_id = (current_setting('app.current_company_id', true))::uuid);

CREATE INDEX idx_loan_schedules_loan ON loan_schedules(company_id, loan_id);
CREATE INDEX idx_loan_schedules_due ON loan_schedules(company_id, status, due_date);

-- ============================================================================
-- CHECKS REGISTER
-- ============================================================================
CREATE TABLE IF NOT EXISTS checks_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES societes(id),
  direction VARCHAR NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  check_number VARCHAR NOT NULL,
  bank_name VARCHAR NOT NULL,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  third_party_id UUID,
  issue_date DATE NOT NULL,
  deposit_date DATE,
  clearance_date DATE,
  status VARCHAR NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'deposited', 'cleared', 'bounced', 'cancelled', 'issued', 'cashed')),
  bounce_reason TEXT,
  journal_entry_id UUID,
  bounce_journal_entry_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE checks_register ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checks_tenant" ON checks_register
  USING (company_id = (current_setting('app.current_company_id', true))::uuid);

CREATE INDEX idx_checks_direction_status ON checks_register(company_id, direction, status);

-- ============================================================================
-- PURCHASE ORDERS (Correction #8)
-- ============================================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES societes(id),
  supplier_id UUID NOT NULL,
  order_number VARCHAR NOT NULL,
  order_date DATE NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'partially_received', 'received', 'cancelled')),
  lines JSONB NOT NULL DEFAULT '[]',
  total_ht DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_vat DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_ttc DECIMAL(15,2) NOT NULL DEFAULT 0,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, order_number)
);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchase_orders_tenant" ON purchase_orders
  USING (company_id = (current_setting('app.current_company_id', true))::uuid);

CREATE INDEX idx_purchase_orders_status ON purchase_orders(company_id, status);

-- ============================================================================
-- GOODS RECEIPTS (Correction #8)
-- ============================================================================
CREATE TABLE IF NOT EXISTS goods_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES societes(id),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id),
  receipt_number VARCHAR NOT NULL,
  receipt_date DATE NOT NULL,
  lines JSONB NOT NULL DEFAULT '[]',
  status VARCHAR NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE goods_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goods_receipts_tenant" ON goods_receipts
  USING (company_id = (current_setting('app.current_company_id', true))::uuid);

-- ============================================================================
-- OFF-BALANCE COMMITMENTS (Correction #11)
-- ============================================================================
CREATE TABLE IF NOT EXISTS off_balance_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES societes(id),
  type VARCHAR NOT NULL CHECK (type IN ('guarantee_given', 'guarantee_received', 'mortgage', 'pledge', 'lease_commitment', 'bank_guarantee', 'letter_of_credit', 'other')),
  counterparty VARCHAR NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'XOF',
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'released')),
  reference_document VARCHAR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE off_balance_commitments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "off_balance_tenant" ON off_balance_commitments
  USING (company_id = (current_setting('app.current_company_id', true))::uuid);

CREATE INDEX idx_off_balance_status ON off_balance_commitments(company_id, status);
