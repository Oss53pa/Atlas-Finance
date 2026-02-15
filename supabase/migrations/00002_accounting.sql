-- ============================================================================
-- Migration 00002: Accounting tables (SYSCOHADA compliant)
-- WiseBook ERP - Supabase Migration
-- ============================================================================

-- ============================================================================
-- 1. FISCAL YEARS
-- ============================================================================
CREATE TABLE fiscal_years (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES societes(id) ON DELETE CASCADE,
  code VARCHAR(10) NOT NULL,
  name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_closed BOOLEAN DEFAULT FALSE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(company_id, code),
  CONSTRAINT fiscal_year_dates_check CHECK (end_date > start_date)
);

CREATE TRIGGER fiscal_years_updated_at
  BEFORE UPDATE ON fiscal_years
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_fiscal_years_company ON fiscal_years(company_id);
CREATE INDEX idx_fiscal_years_dates ON fiscal_years(start_date DESC);

-- ============================================================================
-- 2. CHART OF ACCOUNTS (Plan Comptable SYSCOHADA)
-- ============================================================================
CREATE TYPE account_class AS ENUM ('1','2','3','4','5','6','7','8','9');
CREATE TYPE account_type AS ENUM ('DETAIL', 'TOTAL', 'AUXILIARY');
CREATE TYPE balance_direction AS ENUM ('DEBIT', 'CREDIT');

CREATE TABLE chart_of_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES societes(id) ON DELETE CASCADE,
  code VARCHAR(9) NOT NULL,
  name VARCHAR(255) NOT NULL,
  account_class account_class NOT NULL DEFAULT '1',
  account_type account_type NOT NULL DEFAULT 'DETAIL',
  parent_account_id UUID REFERENCES chart_of_accounts(id) ON DELETE CASCADE,
  level INTEGER DEFAULT 0 NOT NULL,
  normal_balance balance_direction NOT NULL DEFAULT 'DEBIT',
  is_reconcilable BOOLEAN DEFAULT FALSE NOT NULL,
  is_auxiliary BOOLEAN DEFAULT FALSE NOT NULL,
  allow_direct_entry BOOLEAN DEFAULT TRUE NOT NULL,
  is_multi_currency BOOLEAN DEFAULT FALSE NOT NULL,
  default_currency VARCHAR(3) DEFAULT '',
  ifrs_mapping VARCHAR(20) DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(company_id, code)
);

CREATE TRIGGER chart_of_accounts_updated_at
  BEFORE UPDATE ON chart_of_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-populate account_class and level from code
CREATE OR REPLACE FUNCTION auto_populate_account_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NOT NULL AND length(NEW.code) > 0 THEN
    NEW.account_class = left(NEW.code, 1)::account_class;
    NEW.level = length(NEW.code);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chart_of_accounts_auto_fields
  BEFORE INSERT OR UPDATE ON chart_of_accounts
  FOR EACH ROW EXECUTE FUNCTION auto_populate_account_fields();

CREATE INDEX idx_coa_company ON chart_of_accounts(company_id);
CREATE INDEX idx_coa_code ON chart_of_accounts(company_id, code);
CREATE INDEX idx_coa_class ON chart_of_accounts(account_class);
CREATE INDEX idx_coa_parent ON chart_of_accounts(parent_account_id);

-- ============================================================================
-- 3. JOURNALS
-- ============================================================================
CREATE TYPE journal_type AS ENUM ('AC','VE','BQ','CA','OD','AN','SAL','DEC','REG','CLO');

CREATE TABLE journals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES societes(id) ON DELETE CASCADE,
  code VARCHAR(10) NOT NULL,
  name VARCHAR(100) NOT NULL,
  journal_type journal_type NOT NULL,
  default_debit_account_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  default_credit_account_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  numbering_prefix VARCHAR(10) DEFAULT '',
  last_number INTEGER DEFAULT 0 NOT NULL,
  require_validation BOOLEAN DEFAULT FALSE NOT NULL,
  require_attachment BOOLEAN DEFAULT FALSE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(company_id, code)
);

CREATE TRIGGER journals_updated_at
  BEFORE UPDATE ON journals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_journals_company ON journals(company_id);
CREATE INDEX idx_journals_type ON journals(journal_type);

-- ============================================================================
-- 4. JOURNAL ENTRIES (En-tete ecritures comptables)
-- ============================================================================
CREATE TABLE journal_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES societes(id) ON DELETE CASCADE,
  fiscal_year_id UUID NOT NULL REFERENCES fiscal_years(id) ON DELETE CASCADE,
  journal_id UUID NOT NULL REFERENCES journals(id) ON DELETE CASCADE,
  piece_number VARCHAR(50) NOT NULL,
  reference VARCHAR(100) DEFAULT '',
  entry_date DATE NOT NULL,
  value_date DATE,
  description TEXT NOT NULL,
  total_debit NUMERIC(20,2) DEFAULT 0 NOT NULL,
  total_credit NUMERIC(20,2) DEFAULT 0 NOT NULL,
  is_balanced BOOLEAN DEFAULT FALSE NOT NULL,
  is_validated BOOLEAN DEFAULT FALSE NOT NULL,
  validation_date TIMESTAMPTZ,
  validated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  source_document VARCHAR(100) DEFAULT '',
  attachment_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(company_id, fiscal_year_id, journal_id, piece_number)
);

CREATE TRIGGER journal_entries_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_journal_entries_company ON journal_entries(company_id);
CREATE INDEX idx_journal_entries_fiscal_year ON journal_entries(fiscal_year_id);
CREATE INDEX idx_journal_entries_journal ON journal_entries(journal_id);
CREATE INDEX idx_journal_entries_date ON journal_entries(entry_date DESC);
CREATE INDEX idx_journal_entries_validated ON journal_entries(is_validated);
CREATE INDEX idx_journal_entries_piece ON journal_entries(piece_number);

-- ============================================================================
-- 5. JOURNAL ENTRY LINES (Lignes d'ecritures comptables)
-- ============================================================================
CREATE TABLE journal_entry_lines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE CASCADE,
  debit_amount NUMERIC(20,2) DEFAULT 0 NOT NULL,
  credit_amount NUMERIC(20,2) DEFAULT 0 NOT NULL,
  label VARCHAR(255) NOT NULL,
  third_party_id UUID, -- FK added in tiers migration
  currency VARCHAR(3) DEFAULT '',
  currency_amount NUMERIC(20,2),
  exchange_rate NUMERIC(10,6),
  reconciliation_code VARCHAR(20) DEFAULT '',
  is_reconciled BOOLEAN DEFAULT FALSE NOT NULL,
  reconciliation_date DATE,
  line_number INTEGER DEFAULT 1 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT entry_line_amount_check CHECK (
    NOT (debit_amount > 0 AND credit_amount > 0)
  ),
  CONSTRAINT entry_line_nonzero_check CHECK (
    debit_amount > 0 OR credit_amount > 0
  )
);

CREATE TRIGGER journal_entry_lines_updated_at
  BEFORE UPDATE ON journal_entry_lines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_entry_lines_entry ON journal_entry_lines(entry_id);
CREATE INDEX idx_entry_lines_account ON journal_entry_lines(account_id);
CREATE INDEX idx_entry_lines_third_party ON journal_entry_lines(third_party_id);
CREATE INDEX idx_entry_lines_reconciliation ON journal_entry_lines(reconciliation_code) WHERE reconciliation_code != '';
CREATE INDEX idx_entry_lines_line_number ON journal_entry_lines(entry_id, line_number);

-- ============================================================================
-- 6. Function: Get next piece number for a journal
-- ============================================================================
CREATE OR REPLACE FUNCTION get_next_piece_number(
  p_company_id UUID,
  p_journal_id UUID,
  p_fiscal_year_id UUID
)
RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT;
  v_next_number INTEGER;
  v_result TEXT;
BEGIN
  -- Get journal prefix and increment number atomically
  UPDATE journals
  SET last_number = last_number + 1
  WHERE id = p_journal_id AND company_id = p_company_id
  RETURNING numbering_prefix, last_number INTO v_prefix, v_next_number;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Journal not found';
  END IF;

  v_result := v_prefix || lpad(v_next_number::TEXT, 6, '0');
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. Function: Recalculate journal entry totals
-- ============================================================================
CREATE OR REPLACE FUNCTION recalculate_entry_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE journal_entries
  SET
    total_debit = (SELECT COALESCE(SUM(debit_amount), 0) FROM journal_entry_lines WHERE entry_id = COALESCE(NEW.entry_id, OLD.entry_id)),
    total_credit = (SELECT COALESCE(SUM(credit_amount), 0) FROM journal_entry_lines WHERE entry_id = COALESCE(NEW.entry_id, OLD.entry_id)),
    is_balanced = (
      (SELECT COALESCE(SUM(debit_amount), 0) FROM journal_entry_lines WHERE entry_id = COALESCE(NEW.entry_id, OLD.entry_id))
      =
      (SELECT COALESCE(SUM(credit_amount), 0) FROM journal_entry_lines WHERE entry_id = COALESCE(NEW.entry_id, OLD.entry_id))
      AND
      (SELECT COALESCE(SUM(debit_amount), 0) FROM journal_entry_lines WHERE entry_id = COALESCE(NEW.entry_id, OLD.entry_id)) > 0
    )
  WHERE id = COALESCE(NEW.entry_id, OLD.entry_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entry_lines_recalculate_totals
  AFTER INSERT OR UPDATE OR DELETE ON journal_entry_lines
  FOR EACH ROW EXECUTE FUNCTION recalculate_entry_totals();

-- ============================================================================
-- 8. RLS Policies for accounting tables
-- ============================================================================
ALTER TABLE fiscal_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;

-- Fiscal Years
CREATE POLICY "Company isolation" ON fiscal_years
  FOR ALL USING (company_id = get_user_company_id());

-- Chart of Accounts
CREATE POLICY "Company isolation" ON chart_of_accounts
  FOR ALL USING (company_id = get_user_company_id());

-- Journals
CREATE POLICY "Company isolation" ON journals
  FOR ALL USING (company_id = get_user_company_id());

-- Journal Entries
CREATE POLICY "Company isolation" ON journal_entries
  FOR ALL USING (company_id = get_user_company_id());

-- Journal Entry Lines (through entry's company)
CREATE POLICY "Company isolation" ON journal_entry_lines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM journal_entries je
      WHERE je.id = journal_entry_lines.entry_id
        AND je.company_id = get_user_company_id()
    )
  );
