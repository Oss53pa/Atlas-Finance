-- ============================================================================
-- PART 1/3: Extensions + ALL Tables + Seed Data
-- Run this FIRST in Supabase SQL Editor
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

-- ============================================================================
-- SEED DATA
-- ============================================================================
INSERT INTO societes (id, code, nom, description, email, telephone, address)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'ATLAS', 'Atlas F&A',
  'Societe de demonstration - ERP Comptable SYSCOHADA',
  'contact@atlasfna.cm', '+237 690 000 000', 'Douala, Cameroun'
) ON CONFLICT (code) DO NOTHING;

INSERT INTO devises (code, nom, symbole, taux_change, is_active) VALUES
  ('XAF', 'Franc CFA CEMAC', 'FCFA', 1.000000, true),
  ('XOF', 'Franc CFA UEMOA', 'FCFA', 1.000000, true),
  ('EUR', 'Euro', 'EUR', 655.957000, true),
  ('USD', 'Dollar americain', 'USD', 600.000000, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO roles (id, code, name, description) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'admin', 'Administrateur', 'Acces complet'),
  ('b0000000-0000-0000-0000-000000000002', 'manager', 'Manager', 'Gestion et supervision'),
  ('b0000000-0000-0000-0000-000000000003', 'accountant', 'Comptable', 'Saisie et comptabilite'),
  ('b0000000-0000-0000-0000-000000000004', 'user', 'Utilisateur', 'Acces en lecture')
ON CONFLICT (code) DO NOTHING;

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
  ('c0000000-0000-0000-0000-000000000010', 'customers.create', 'Creer des clients', 'customers'),
  ('c0000000-0000-0000-0000-000000000011', 'customers.edit', 'Modifier des clients', 'customers'),
  ('c0000000-0000-0000-0000-000000000012', 'suppliers.view', 'Voir les fournisseurs', 'suppliers'),
  ('c0000000-0000-0000-0000-000000000013', 'suppliers.create', 'Creer des fournisseurs', 'suppliers'),
  ('c0000000-0000-0000-0000-000000000014', 'suppliers.edit', 'Modifier des fournisseurs', 'suppliers'),
  ('c0000000-0000-0000-0000-000000000015', 'dashboard.view', 'Voir le tableau de bord', 'dashboard'),
  ('c0000000-0000-0000-0000-000000000016', 'reports.view', 'Voir les rapports', 'reports'),
  ('c0000000-0000-0000-0000-000000000017', 'reports.export', 'Exporter les rapports', 'reports'),
  ('c0000000-0000-0000-0000-000000000018', 'admin.users', 'Gerer les utilisateurs', 'admin'),
  ('c0000000-0000-0000-0000-000000000019', 'admin.settings', 'Gerer les parametres', 'admin'),
  ('c0000000-0000-0000-0000-000000000020', 'admin.roles', 'Gerer les roles', 'admin')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'b0000000-0000-0000-0000-000000000001', id FROM permissions
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'b0000000-0000-0000-0000-000000000002', id FROM permissions WHERE module != 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'b0000000-0000-0000-0000-000000000003', id FROM permissions
WHERE module IN ('accounting', 'treasury', 'customers', 'suppliers', 'dashboard', 'reports') AND code NOT LIKE '%.delete'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'b0000000-0000-0000-0000-000000000004', id FROM permissions WHERE code LIKE '%.view'
ON CONFLICT DO NOTHING;
