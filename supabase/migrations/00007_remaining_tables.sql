-- Migration: Remaining tables for full Dexie ↔ Supabase parity
-- Tables: closure_sessions, provisions, exchange_rates, hedging_positions,
--         revision_items, fixed_assets, budget_lines, inventory_items

-- Closure sessions
CREATE TABLE IF NOT EXISTS public.closure_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('MENSUELLE', 'TRIMESTRIELLE', 'SEMESTRIELLE', 'ANNUELLE', 'SPECIALE')),
  periode TEXT NOT NULL,
  exercice TEXT NOT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  date_creation TIMESTAMPTZ NOT NULL DEFAULT now(),
  statut TEXT NOT NULL DEFAULT 'EN_COURS' CHECK (statut IN ('EN_COURS', 'VALIDEE', 'CLOTUREE', 'ANNULEE')),
  cree_par TEXT NOT NULL DEFAULT 'system',
  progression INTEGER NOT NULL DEFAULT 0 CHECK (progression >= 0 AND progression <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Provisions for doubtful debts
CREATE TABLE IF NOT EXISTS public.provisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.closure_sessions(id) ON DELETE CASCADE,
  compte_client TEXT NOT NULL,
  client TEXT NOT NULL,
  solde NUMERIC(15,2) NOT NULL DEFAULT 0,
  anciennete INTEGER NOT NULL DEFAULT 0,
  taux_provision NUMERIC(5,2) NOT NULL DEFAULT 0,
  montant_provision NUMERIC(15,2) NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'PROPOSEE' CHECK (statut IN ('PROPOSEE', 'VALIDEE', 'REJETEE')),
  date_proposition DATE NOT NULL,
  date_validation DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Exchange rates
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate NUMERIC(18,8) NOT NULL,
  date DATE NOT NULL,
  provider TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies
  ON public.exchange_rates(from_currency, to_currency, date);

-- Hedging positions
CREATE TABLE IF NOT EXISTS public.hedging_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  currency TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('forward', 'option', 'swap')),
  amount NUMERIC(15,2) NOT NULL,
  strike_rate NUMERIC(18,8) NOT NULL,
  current_rate NUMERIC(18,8) NOT NULL,
  maturity_date DATE NOT NULL,
  unrealized_pnl NUMERIC(15,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'exercised')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Revision items (audit)
CREATE TABLE IF NOT EXISTS public.revision_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.closure_sessions(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  isa_assertion TEXT NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
  test_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'en_cours', 'valide', 'revise', 'approuve')),
  findings TEXT DEFAULT '',
  conclusion TEXT DEFAULT '',
  reviewer TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fixed assets
CREATE TABLE IF NOT EXISTS public.fixed_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  acquisition_date DATE NOT NULL,
  acquisition_value NUMERIC(15,2) NOT NULL,
  residual_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  depreciation_method TEXT NOT NULL DEFAULT 'linear' CHECK (depreciation_method IN ('linear', 'declining')),
  useful_life_years INTEGER NOT NULL,
  account_code TEXT NOT NULL,
  depreciation_account_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disposed', 'scrapped')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Budget lines
CREATE TABLE IF NOT EXISTS public.budget_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  fiscal_year TEXT NOT NULL,
  period TEXT NOT NULL,
  budgeted NUMERIC(15,2) NOT NULL DEFAULT 0,
  actual NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_lines_year
  ON public.budget_lines(fiscal_year, account_code);

-- Inventory items
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  quantity NUMERIC(15,3) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  min_stock NUMERIC(15,3) NOT NULL DEFAULT 0,
  max_stock NUMERIC(15,3) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'unite',
  last_movement_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updated_at trigger for all new tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'closure_sessions', 'provisions', 'hedging_positions',
    'revision_items', 'fixed_assets', 'budget_lines', 'inventory_items'
  ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      t
    );
  END LOOP;
END $$;
