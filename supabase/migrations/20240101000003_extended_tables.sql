-- ============================================================================
-- Migration 3: Extended Tables
-- WiseBook ERP - Supabase PostgreSQL
-- ============================================================================

-- ============================================================================
-- closure_sessions
-- ============================================================================
CREATE TABLE closure_sessions (
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

-- ============================================================================
-- provisions
-- ============================================================================
CREATE TABLE provisions (
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

-- ============================================================================
-- exchange_rates
-- ============================================================================
CREATE TABLE exchange_rates (
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

-- ============================================================================
-- hedging_positions
-- ============================================================================
CREATE TABLE hedging_positions (
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

-- ============================================================================
-- revision_items
-- ============================================================================
CREATE TABLE revision_items (
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

-- ============================================================================
-- inventory_items
-- ============================================================================
CREATE TABLE inventory_items (
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

-- ============================================================================
-- alias_tiers
-- ============================================================================
CREATE TABLE alias_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  alias TEXT NOT NULL,
  prefix TEXT NOT NULL,
  label TEXT NOT NULL,
  comptes_comptables TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, alias)
);

-- ============================================================================
-- alias_prefix_config
-- ============================================================================
CREATE TABLE alias_prefix_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  sous_compte_code TEXT NOT NULL,
  prefix TEXT NOT NULL,
  type_label TEXT,
  UNIQUE(tenant_id, sous_compte_code)
);
