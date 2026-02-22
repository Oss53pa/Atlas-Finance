-- ============================================================================
-- Migration 2: Accounting Tables
-- WiseBook ERP - Supabase PostgreSQL
-- ============================================================================

-- ============================================================================
-- fiscal_years
-- ============================================================================
CREATE TABLE fiscal_years (
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

-- ============================================================================
-- accounts (chart of accounts)
-- ============================================================================
CREATE TABLE accounts (
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

-- ============================================================================
-- journal_entries (header)
-- ============================================================================
CREATE TABLE journal_entries (
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

-- ============================================================================
-- journal_lines (denormalized from Dexie's nested array)
-- ============================================================================
CREATE TABLE journal_lines (
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

-- ============================================================================
-- third_parties
-- ============================================================================
CREATE TABLE third_parties (
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

-- ============================================================================
-- assets
-- ============================================================================
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  acquisition_date DATE NOT NULL,
  acquisition_value NUMERIC(18,2) NOT NULL,
  residual_value NUMERIC(18,2) DEFAULT 0,
  depreciation_method TEXT CHECK (depreciation_method IN ('linear', 'declining')),
  useful_life_years INTEGER NOT NULL,
  account_code TEXT NOT NULL,
  depreciation_account_code TEXT NOT NULL,
  status TEXT CHECK (status IN ('active', 'disposed', 'scrapped')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);

-- ============================================================================
-- budget_lines
-- ============================================================================
CREATE TABLE budget_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  account_code TEXT NOT NULL,
  fiscal_year TEXT NOT NULL,
  period TEXT NOT NULL,
  budgeted NUMERIC(18,2) DEFAULT 0,
  actual NUMERIC(18,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- audit_logs
-- ============================================================================
CREATE TABLE audit_logs (
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

-- ============================================================================
-- settings
-- ============================================================================
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES societes(id),
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
