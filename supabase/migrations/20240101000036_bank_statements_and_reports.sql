-- ============================================================================
-- Bank statements (relevés bancaires importés) + report journal
-- Tenant-scoped tables with RLS (tenant_id = get_user_company_id()).
-- Aligns the Supabase schema with the local Dexie v10 stores so SaaS mode
-- persists imported statements and the report journal stops 404ing (PGRST205).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. bank_statements — one row per imported bank statement
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bank_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  account_code TEXT NOT NULL,
  account_label TEXT,
  bank_name TEXT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  opening_balance NUMERIC(18,2) DEFAULT 0,
  closing_balance NUMERIC(18,2) DEFAULT 0,
  currency TEXT DEFAULT 'XOF',
  file_name TEXT,
  line_count INTEGER DEFAULT 0,
  total_debit NUMERIC(18,2) DEFAULT 0,
  total_credit NUMERIC(18,2) DEFAULT 0,
  imported_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY bank_statements_select ON bank_statements
  FOR SELECT USING (tenant_id = get_user_company_id());
CREATE POLICY bank_statements_insert ON bank_statements
  FOR INSERT WITH CHECK (tenant_id = get_user_company_id());
CREATE POLICY bank_statements_update ON bank_statements
  FOR UPDATE USING (tenant_id = get_user_company_id());
CREATE POLICY bank_statements_delete ON bank_statements
  FOR DELETE USING (tenant_id = get_user_company_id());

CREATE INDEX IF NOT EXISTS idx_bank_statements_account
  ON bank_statements(tenant_id, account_code, period_start);

-- ----------------------------------------------------------------------------
-- 2. bank_statement_lines — detail rows of each statement
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bank_statement_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  statement_id UUID NOT NULL REFERENCES bank_statements(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  date_valeur DATE,
  label TEXT,
  reference TEXT,
  debit NUMERIC(18,2) DEFAULT 0,
  credit NUMERIC(18,2) DEFAULT 0,
  amount NUMERIC(18,2) DEFAULT 0,
  type TEXT CHECK (type IN ('credit', 'debit')),
  balance NUMERIC(18,2),
  matched_entry_id UUID,
  reconciled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE bank_statement_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY bank_statement_lines_select ON bank_statement_lines
  FOR SELECT USING (tenant_id = get_user_company_id());
CREATE POLICY bank_statement_lines_insert ON bank_statement_lines
  FOR INSERT WITH CHECK (tenant_id = get_user_company_id());
CREATE POLICY bank_statement_lines_update ON bank_statement_lines
  FOR UPDATE USING (tenant_id = get_user_company_id());
CREATE POLICY bank_statement_lines_delete ON bank_statement_lines
  FOR DELETE USING (tenant_id = get_user_company_id());

CREATE INDEX IF NOT EXISTS idx_bank_statement_lines_statement
  ON bank_statement_lines(tenant_id, statement_id, date);

-- ----------------------------------------------------------------------------
-- 3. reports — lightweight journal of generated reports
--    (referenced by ReportJournalPage; absence caused a 404/PGRST205)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  title TEXT NOT NULL,
  type TEXT,
  status TEXT DEFAULT 'draft',
  period_label TEXT,
  template_name TEXT,
  page_count INTEGER DEFAULT 0,
  version INTEGER DEFAULT 1,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY reports_select ON reports
  FOR SELECT USING (tenant_id = get_user_company_id());
CREATE POLICY reports_insert ON reports
  FOR INSERT WITH CHECK (tenant_id = get_user_company_id());
CREATE POLICY reports_update ON reports
  FOR UPDATE USING (tenant_id = get_user_company_id());
CREATE POLICY reports_delete ON reports
  FOR DELETE USING (tenant_id = get_user_company_id());

CREATE INDEX IF NOT EXISTS idx_reports_tenant_status
  ON reports(tenant_id, status, created_at);
