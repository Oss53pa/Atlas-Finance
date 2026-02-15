-- ============================================================================
-- Migration 00003: Tiers, Customers, Suppliers
-- WiseBook ERP - Supabase Migration
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================
CREATE TYPE tiers_type AS ENUM ('CLIENT','FOURNISSEUR','CLIENT_FOURNISSEUR','SALARIE','BANQUE','ORGANISME_SOCIAL','ADMINISTRATION','AUTRE');
CREATE TYPE forme_juridique AS ENUM ('SA','SARL','SAS','SASU','EURL','EI','EIRL','SNC','SCS','SCA','GIE','ASSOCIATION','COOPERATIVE','AUTRE');
CREATE TYPE mode_reglement AS ENUM ('ESPECES','CHEQUE','VIREMENT','PRELEVEMENT','CARTE','TRAITE','EFFET_COMMERCE','COMPENSATION','AUTRE');
CREATE TYPE tiers_statut AS ENUM ('ACTIF','BLOQUE','SUSPENDU','ARCHIVE');
CREATE TYPE customer_type AS ENUM ('INDIVIDUAL','COMPANY','ADMINISTRATION','ASSOCIATION','FOREIGN');
CREATE TYPE customer_status AS ENUM ('ACTIVE','BLOCKED','SUSPENDED','PROSPECT','ARCHIVED');
CREATE TYPE risk_level AS ENUM ('A','B','C','D','E');
CREATE TYPE ai_risk_prediction AS ENUM ('VERY_LOW','LOW','MEDIUM','HIGH','CRITICAL');
CREATE TYPE supplier_type AS ENUM ('GOODS','SERVICES','SUBCONTRACTOR','CONSULTING','MAINTENANCE','TRANSPORT','UTILITIES','OTHER');
CREATE TYPE supplier_status AS ENUM ('ACTIVE','QUALIFIED','BLOCKED','SUSPENDED','ARCHIVED','PROSPECT');
CREATE TYPE supplier_rating AS ENUM ('A','B','C','D','E');
CREATE TYPE payment_method AS ENUM ('CASH','CHECK','TRANSFER','DIRECT_DEBIT','CARD','BILL','MOBILE_MONEY','COMPENSATION','OTHER');
CREATE TYPE currency_code AS ENUM ('XAF','XOF','EUR','USD');
CREATE TYPE trend_direction AS ENUM ('UP','STABLE','DOWN');

-- ============================================================================
-- 1. TIERS (Third-Party Master)
-- ============================================================================
CREATE TABLE tiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES societes(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL,
  type_tiers tiers_type NOT NULL,
  raison_sociale VARCHAR(200) NOT NULL,
  nom_commercial VARCHAR(200),
  sigle VARCHAR(50),
  forme_juridique forme_juridique,
  rccm VARCHAR(50),
  nif VARCHAR(50),
  niu VARCHAR(50),
  numero_tva VARCHAR(50),
  email VARCHAR(255),
  telephone VARCHAR(20),
  mobile VARCHAR(20),
  fax VARCHAR(20),
  site_web TEXT,
  compte_client_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  compte_fournisseur_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  conditions_paiement INTEGER DEFAULT 30 NOT NULL CHECK (conditions_paiement >= 0 AND conditions_paiement <= 365),
  mode_reglement mode_reglement DEFAULT 'VIREMENT' NOT NULL,
  devise_id UUID NOT NULL REFERENCES devises(id) ON DELETE RESTRICT,
  limite_credit NUMERIC(15,2) DEFAULT 0 NOT NULL CHECK (limite_credit >= 0),
  plafond_escompte NUMERIC(15,2) DEFAULT 0 NOT NULL CHECK (plafond_escompte >= 0),
  taux_remise NUMERIC(5,2) DEFAULT 0 NOT NULL CHECK (taux_remise >= 0 AND taux_remise <= 100),
  taux_escompte NUMERIC(5,2) DEFAULT 0 NOT NULL CHECK (taux_escompte >= 0 AND taux_escompte <= 100),
  exonere_tva BOOLEAN DEFAULT FALSE NOT NULL,
  numero_exoneration_tva VARCHAR(50),
  iban VARCHAR(34),
  bic VARCHAR(11),
  domiciliation VARCHAR(200),
  score_credit INTEGER DEFAULT 100 NOT NULL CHECK (score_credit >= 0 AND score_credit <= 1000),
  encours_actuel NUMERIC(15,2) DEFAULT 0 NOT NULL,
  retard_moyen INTEGER DEFAULT 0 NOT NULL,
  statut tiers_statut DEFAULT 'ACTIF' NOT NULL,
  motif_blocage TEXT,
  date_blocage TIMESTAMPTZ,
  bloque_par UUID REFERENCES profiles(id) ON DELETE SET NULL,
  secteur_activite VARCHAR(100),
  effectif INTEGER,
  capital NUMERIC(15,2) CHECK (capital IS NULL OR capital >= 0),
  chiffre_affaires NUMERIC(15,2) CHECK (chiffre_affaires IS NULL OR chiffre_affaires >= 0),
  date_creation_entreprise DATE,
  date_premiere_relation DATE,
  date_derniere_commande DATE,
  date_dernier_paiement DATE,
  observations TEXT,
  tags JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(company_id, code)
);

CREATE TRIGGER tiers_updated_at BEFORE UPDATE ON tiers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_tiers_company_type ON tiers(company_id, type_tiers);
CREATE INDEX idx_tiers_company_statut ON tiers(company_id, statut);
CREATE INDEX idx_tiers_raison_sociale ON tiers(raison_sociale);
CREATE INDEX idx_tiers_nif ON tiers(nif);
CREATE INDEX idx_tiers_rccm ON tiers(rccm);
CREATE INDEX idx_tiers_tags ON tiers USING GIN(tags);

-- Add FK from journal_entry_lines to tiers
ALTER TABLE journal_entry_lines
  ADD CONSTRAINT fk_entry_lines_third_party
  FOREIGN KEY (third_party_id) REFERENCES tiers(id) ON DELETE SET NULL;

-- ============================================================================
-- 2. TIERS ADDRESSES
-- ============================================================================
CREATE TYPE adresse_type AS ENUM ('PRINCIPALE','FACTURATION','LIVRAISON','COURRIER','AUTRE');

CREATE TABLE tiers_addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tiers_id UUID NOT NULL REFERENCES tiers(id) ON DELETE CASCADE,
  type_adresse adresse_type NOT NULL,
  libelle VARCHAR(100),
  ligne1 VARCHAR(100) NOT NULL,
  ligne2 VARCHAR(100),
  ligne3 VARCHAR(100),
  code_postal VARCHAR(10),
  ville VARCHAR(100) NOT NULL,
  region VARCHAR(100),
  pays VARCHAR(100) DEFAULT 'Cameroun' NOT NULL,
  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),
  telephone VARCHAR(20),
  email VARCHAR(255),
  is_default BOOLEAN DEFAULT FALSE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER tiers_addresses_updated_at BEFORE UPDATE ON tiers_addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_tiers_addresses_tiers ON tiers_addresses(tiers_id);

-- ============================================================================
-- 3. TIERS CONTACTS
-- ============================================================================
CREATE TYPE contact_fonction AS ENUM ('DIRIGEANT','COMPTABLE','ACHETEUR','VENDEUR','TECHNIQUE','JURIDIQUE','AUTRE');
CREATE TYPE preference_contact AS ENUM ('EMAIL','TELEPHONE','COURRIER');

CREATE TABLE tiers_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tiers_id UUID NOT NULL REFERENCES tiers(id) ON DELETE CASCADE,
  civilite VARCHAR(10),
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100),
  fonction contact_fonction NOT NULL,
  titre VARCHAR(100),
  telephone_fixe VARCHAR(20),
  telephone_mobile VARCHAR(20),
  email VARCHAR(255),
  preference_contact preference_contact DEFAULT 'EMAIL' NOT NULL,
  is_principal BOOLEAN DEFAULT FALSE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  observations TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER tiers_contacts_updated_at BEFORE UPDATE ON tiers_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_tiers_contacts_tiers ON tiers_contacts(tiers_id);

-- ============================================================================
-- 4. TIERS CATEGORIES
-- ============================================================================
CREATE TABLE tiers_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES societes(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL,
  libelle VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(company_id, code)
);

CREATE TRIGGER tiers_categories_updated_at BEFORE UPDATE ON tiers_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 5. TIERS CLASSIFICATIONS
-- ============================================================================
CREATE TYPE classification_type AS ENUM ('SECTEUR','TAILLE','REGION','COMMERCIAL','RISQUE','AUTRE');

CREATE TABLE tiers_classifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tiers_id UUID NOT NULL REFERENCES tiers(id) ON DELETE CASCADE,
  type_classification classification_type NOT NULL,
  valeur VARCHAR(100) NOT NULL,
  description TEXT,
  date_debut DATE,
  date_fin DATE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(tiers_id, type_classification)
);

CREATE TRIGGER tiers_classifications_updated_at BEFORE UPDATE ON tiers_classifications FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 6. TIERS HISTORY (Audit Trail)
-- ============================================================================
CREATE TYPE tiers_action AS ENUM ('CREATE','UPDATE','BLOCK','UNBLOCK','ARCHIVE','REACTIVATE','CREDIT_LIMIT_CHANGE','STATUS_CHANGE');

CREATE TABLE tiers_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tiers_id UUID NOT NULL REFERENCES tiers(id) ON DELETE CASCADE,
  action tiers_action NOT NULL,
  description TEXT NOT NULL,
  anciennes_valeurs JSONB,
  nouvelles_valeurs JSONB,
  utilisateur_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  date_action TIMESTAMPTZ DEFAULT now() NOT NULL,
  adresse_ip INET,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER tiers_history_updated_at BEFORE UPDATE ON tiers_history FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_tiers_history_tiers ON tiers_history(tiers_id, date_action DESC);

-- ============================================================================
-- 7. CUSTOMERS
-- ============================================================================
CREATE TABLE customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES societes(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL,
  customer_type customer_type NOT NULL,
  legal_name VARCHAR(255) NOT NULL,
  commercial_name VARCHAR(255) DEFAULT '',
  legal_form VARCHAR(10),
  rccm VARCHAR(50) DEFAULT '',
  nif VARCHAR(50) DEFAULT '',
  taxpayer_number VARCHAR(50) DEFAULT '',
  vat_number VARCHAR(50) DEFAULT '',
  business_sector VARCHAR(100) DEFAULT '',
  naf_code VARCHAR(10) DEFAULT '',
  main_address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  region VARCHAR(100) DEFAULT '',
  country VARCHAR(50) DEFAULT 'Cameroun' NOT NULL,
  postal_code VARCHAR(10) DEFAULT '',
  main_phone VARCHAR(20) DEFAULT '',
  mobile_phone VARCHAR(20) DEFAULT '',
  email VARCHAR(255) DEFAULT '',
  website TEXT DEFAULT '',
  payment_terms INTEGER DEFAULT 30 NOT NULL CHECK (payment_terms >= 0 AND payment_terms <= 365),
  credit_limit NUMERIC(20,2) DEFAULT 0 NOT NULL CHECK (credit_limit >= 0),
  early_payment_discount NUMERIC(5,2) DEFAULT 0 NOT NULL CHECK (early_payment_discount >= 0 AND early_payment_discount <= 20),
  preferred_payment_method payment_method DEFAULT 'TRANSFER' NOT NULL,
  billing_currency currency_code DEFAULT 'XAF' NOT NULL,
  communication_language VARCHAR(5) DEFAULT 'fr' NOT NULL,
  special_conditions TEXT DEFAULT '',
  credit_score INTEGER DEFAULT 500 NOT NULL CHECK (credit_score >= 0 AND credit_score <= 1000),
  risk_level risk_level DEFAULT 'B' NOT NULL,
  current_outstanding NUMERIC(20,2) DEFAULT 0 NOT NULL,
  average_payment_delay INTEGER DEFAULT 0 NOT NULL,
  litigation_rate NUMERIC(5,2) DEFAULT 0 NOT NULL,
  ai_risk_prediction ai_risk_prediction DEFAULT 'LOW' NOT NULL,
  ai_risk_score NUMERIC(5,2) DEFAULT 0 NOT NULL CHECK (ai_risk_score >= 0 AND ai_risk_score <= 100),
  last_risk_calculation TIMESTAMPTZ,
  account_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  status customer_status DEFAULT 'ACTIVE' NOT NULL,
  blocking_reason TEXT DEFAULT '',
  blocking_date TIMESTAMPTZ,
  blocked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  capital_amount NUMERIC(20,2) CHECK (capital_amount IS NULL OR capital_amount >= 0),
  annual_turnover NUMERIC(20,2) CHECK (annual_turnover IS NULL OR annual_turnover >= 0),
  employee_count INTEGER,
  company_creation_date DATE,
  first_order_date DATE,
  last_order_date DATE,
  last_payment_date DATE,
  notes TEXT DEFAULT '',
  tags JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(company_id, code)
);

CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_customers_company_status ON customers(company_id, status);
CREATE INDEX idx_customers_legal_name ON customers(legal_name);
CREATE INDEX idx_customers_credit_score ON customers(credit_score);
CREATE INDEX idx_customers_risk_level ON customers(risk_level);
CREATE INDEX idx_customers_last_order ON customers(last_order_date DESC);
CREATE INDEX idx_customers_tags ON customers USING GIN(tags);

-- ============================================================================
-- 8. CUSTOMER CONTACTS
-- ============================================================================
CREATE TYPE customer_contact_role AS ENUM ('CEO','CFO','ACCOUNTANT','BUYER','SALES','TECHNICAL','LEGAL','OTHER');

CREATE TABLE customer_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  title VARCHAR(10) DEFAULT '',
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role customer_contact_role NOT NULL,
  job_title VARCHAR(100) DEFAULT '',
  department VARCHAR(100) DEFAULT '',
  direct_phone VARCHAR(20) DEFAULT '',
  mobile VARCHAR(20) DEFAULT '',
  email VARCHAR(255) DEFAULT '',
  preferred_contact VARCHAR(20) DEFAULT 'EMAIL',
  can_approve_orders BOOLEAN DEFAULT FALSE NOT NULL,
  can_receive_invoices BOOLEAN DEFAULT TRUE NOT NULL,
  can_receive_statements BOOLEAN DEFAULT FALSE NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER customer_contacts_updated_at BEFORE UPDATE ON customer_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_customer_contacts_customer ON customer_contacts(customer_id);

-- ============================================================================
-- 9. CUSTOMER DELIVERY ADDRESSES
-- ============================================================================
CREATE TABLE customer_delivery_addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label VARCHAR(100) NOT NULL,
  address_line1 VARCHAR(100) NOT NULL,
  address_line2 VARCHAR(100) DEFAULT '',
  city VARCHAR(100) NOT NULL,
  region VARCHAR(100) DEFAULT '',
  postal_code VARCHAR(10) DEFAULT '',
  country VARCHAR(50) DEFAULT 'Cameroun' NOT NULL,
  contact_person VARCHAR(100) DEFAULT '',
  phone VARCHAR(20) DEFAULT '',
  email VARCHAR(255) DEFAULT '',
  delivery_instructions TEXT DEFAULT '',
  access_instructions TEXT DEFAULT '',
  opening_hours JSONB DEFAULT '{}'::JSONB,
  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),
  is_default BOOLEAN DEFAULT FALSE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER customer_delivery_addresses_updated_at BEFORE UPDATE ON customer_delivery_addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_customer_delivery_addresses_customer ON customer_delivery_addresses(customer_id);

-- ============================================================================
-- 10. CUSTOMER DOCUMENTS
-- ============================================================================
CREATE TYPE customer_document_type AS ENUM ('KBIS','RCCM','TAX_CERT','VAT_CERT','INSURANCE','BANK_RIB','CONTRACT','ID_CARD','OTHER');

CREATE TABLE customer_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  document_type customer_document_type NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT DEFAULT '',
  file_path VARCHAR(500) DEFAULT '',
  file_size INTEGER,
  file_type VARCHAR(10) DEFAULT '',
  document_date DATE NOT NULL,
  expiry_date DATE,
  reference_number VARCHAR(100) DEFAULT '',
  is_verified BOOLEAN DEFAULT FALSE NOT NULL,
  verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verification_date TIMESTAMPTZ,
  is_expired BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER customer_documents_updated_at BEFORE UPDATE ON customer_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_customer_documents_customer ON customer_documents(customer_id);

-- ============================================================================
-- 11. CUSTOMER PAYMENT PROMISES
-- ============================================================================
CREATE TYPE promise_status AS ENUM ('PENDING','RESPECTED','BROKEN','PARTIAL','CANCELLED');

CREATE TABLE customer_payment_promises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  promise_reference VARCHAR(50) NOT NULL,
  related_invoice VARCHAR(50) DEFAULT '',
  promised_amount NUMERIC(20,2) NOT NULL,
  promised_date DATE NOT NULL,
  payment_method payment_method NOT NULL,
  actual_amount NUMERIC(20,2) DEFAULT 0 NOT NULL,
  actual_payment_date DATE,
  status promise_status DEFAULT 'PENDING' NOT NULL,
  notes TEXT DEFAULT '',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reminder_sent BOOLEAN DEFAULT FALSE NOT NULL,
  reminder_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER customer_payment_promises_updated_at BEFORE UPDATE ON customer_payment_promises FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_customer_promises_customer ON customer_payment_promises(customer_id, status);
CREATE INDEX idx_customer_promises_date ON customer_payment_promises(promised_date DESC);

-- ============================================================================
-- 12. CUSTOMER REMINDER HISTORY
-- ============================================================================
CREATE TYPE reminder_level AS ENUM ('LEVEL_1','LEVEL_2','LEVEL_3','LEVEL_4','LEVEL_5');
CREATE TYPE reminder_channel AS ENUM ('EMAIL','SMS','PHONE','POST','REGISTERED','LEGAL');
CREATE TYPE reminder_status AS ENUM ('SENT','DELIVERED','READ','RESPONDED','FAILED');

CREATE TABLE customer_reminder_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  reminder_level reminder_level NOT NULL,
  channel reminder_channel NOT NULL,
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  target_contact_id UUID REFERENCES customer_contacts(id) ON DELETE SET NULL,
  target_email VARCHAR(255) DEFAULT '',
  target_phone VARCHAR(20) DEFAULT '',
  sent_date TIMESTAMPTZ DEFAULT now() NOT NULL,
  delivery_date TIMESTAMPTZ,
  read_date TIMESTAMPTZ,
  response_date TIMESTAMPTZ,
  status reminder_status DEFAULT 'SENT' NOT NULL,
  response_received BOOLEAN DEFAULT FALSE NOT NULL,
  payment_promised BOOLEAN DEFAULT FALSE NOT NULL,
  promise_date DATE,
  promise_amount NUMERIC(20,2),
  sent_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER customer_reminder_history_updated_at BEFORE UPDATE ON customer_reminder_history FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_customer_reminders_customer ON customer_reminder_history(customer_id, sent_date DESC);
CREATE INDEX idx_customer_reminders_level ON customer_reminder_history(reminder_level);

-- ============================================================================
-- 13. CUSTOMER ANALYTICS (One-to-One)
-- ============================================================================
CREATE TABLE customer_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
  total_orders_count INTEGER DEFAULT 0 NOT NULL,
  total_invoices_count INTEGER DEFAULT 0 NOT NULL,
  total_amount_invoiced NUMERIC(20,2) DEFAULT 0 NOT NULL,
  total_amount_paid NUMERIC(20,2) DEFAULT 0 NOT NULL,
  average_order_amount NUMERIC(20,2) DEFAULT 0 NOT NULL,
  average_payment_delay NUMERIC(10,1) DEFAULT 0 NOT NULL,
  on_time_payment_rate NUMERIC(5,2) DEFAULT 100 NOT NULL,
  promise_respect_rate NUMERIC(5,2) DEFAULT 100 NOT NULL,
  last_12m_orders INTEGER DEFAULT 0 NOT NULL,
  last_12m_amount NUMERIC(20,2) DEFAULT 0 NOT NULL,
  trend_orders trend_direction DEFAULT 'STABLE' NOT NULL,
  trend_amount trend_direction DEFAULT 'STABLE' NOT NULL,
  last_calculation TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER customer_analytics_updated_at BEFORE UPDATE ON customer_analytics FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 14. SUPPLIERS
-- ============================================================================
CREATE TABLE suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES societes(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL,
  supplier_type supplier_type NOT NULL,
  legal_name VARCHAR(255) NOT NULL,
  commercial_name VARCHAR(255) DEFAULT '',
  legal_form VARCHAR(20),
  rccm VARCHAR(50) DEFAULT '',
  nif VARCHAR(50) DEFAULT '',
  taxpayer_number VARCHAR(50) DEFAULT '',
  vat_number VARCHAR(50) DEFAULT '',
  category VARCHAR(100) DEFAULT '',
  business_sector VARCHAR(100) DEFAULT '',
  main_address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  region VARCHAR(100) DEFAULT '',
  country VARCHAR(50) DEFAULT 'Cameroun' NOT NULL,
  postal_code VARCHAR(10) DEFAULT '',
  main_phone VARCHAR(20) DEFAULT '',
  mobile_phone VARCHAR(20) DEFAULT '',
  fax VARCHAR(20) DEFAULT '',
  email VARCHAR(255) DEFAULT '',
  website TEXT DEFAULT '',
  payment_terms INTEGER DEFAULT 30 NOT NULL CHECK (payment_terms >= 0 AND payment_terms <= 365),
  discount_rate NUMERIC(5,2) DEFAULT 0 NOT NULL CHECK (discount_rate >= 0 AND discount_rate <= 50),
  currency currency_code DEFAULT 'XAF' NOT NULL,
  incoterms VARCHAR(10) DEFAULT '',
  preferred_payment_method payment_method DEFAULT 'TRANSFER' NOT NULL,
  minimum_order_amount NUMERIC(20,2) DEFAULT 0 NOT NULL,
  maximum_order_amount NUMERIC(20,2),
  has_framework_agreement BOOLEAN DEFAULT FALSE NOT NULL,
  framework_agreement_ref VARCHAR(100) DEFAULT '',
  framework_expiry_date DATE,
  iban VARCHAR(34) DEFAULT '',
  bic VARCHAR(11) DEFAULT '',
  bank_name VARCHAR(100) DEFAULT '',
  bank_address TEXT DEFAULT '',
  account_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  supplier_rating supplier_rating DEFAULT 'B' NOT NULL,
  current_outstanding NUMERIC(20,2) DEFAULT 0 NOT NULL,
  litigation_count INTEGER DEFAULT 0 NOT NULL,
  service_rate NUMERIC(5,2) DEFAULT 100 NOT NULL,
  average_delivery_delay INTEGER DEFAULT 0 NOT NULL,
  document_compliance_rate NUMERIC(5,2) DEFAULT 100 NOT NULL,
  iso_certifications JSONB DEFAULT '[]'::JSONB,
  quality_certifications JSONB DEFAULT '[]'::JSONB,
  other_approvals JSONB DEFAULT '[]'::JSONB,
  quality_score NUMERIC(5,2) DEFAULT 0 NOT NULL,
  delivery_score NUMERIC(5,2) DEFAULT 0 NOT NULL,
  price_competitiveness NUMERIC(5,2) DEFAULT 0 NOT NULL,
  overall_performance NUMERIC(5,2) DEFAULT 0 NOT NULL,
  status supplier_status DEFAULT 'ACTIVE' NOT NULL,
  blocking_reason TEXT DEFAULT '',
  blocking_date TIMESTAMPTZ,
  blocked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  contract_start_date DATE,
  contract_end_date DATE,
  auto_renewal BOOLEAN DEFAULT FALSE NOT NULL,
  first_order_date DATE,
  last_order_date DATE,
  last_payment_date DATE,
  notes TEXT DEFAULT '',
  tags JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(company_id, code),
  CONSTRAINT supplier_contract_dates_check CHECK (
    contract_end_date IS NULL OR contract_start_date IS NULL OR contract_end_date > contract_start_date
  )
);

CREATE TRIGGER suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_suppliers_company_type ON suppliers(company_id, supplier_type);
CREATE INDEX idx_suppliers_company_status ON suppliers(company_id, status);
CREATE INDEX idx_suppliers_legal_name ON suppliers(legal_name);
CREATE INDEX idx_suppliers_rating ON suppliers(supplier_rating);
CREATE INDEX idx_suppliers_performance ON suppliers(overall_performance);
CREATE INDEX idx_suppliers_last_order ON suppliers(last_order_date DESC);
CREATE INDEX idx_suppliers_tags ON suppliers USING GIN(tags);

-- ============================================================================
-- 15. SUPPLIER CONTACTS
-- ============================================================================
CREATE TYPE supplier_contact_role AS ENUM ('CEO','SALES','ACCOUNTANT','TECHNICAL','DELIVERY','QUALITY','LEGAL','OTHER');

CREATE TABLE supplier_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role supplier_contact_role NOT NULL,
  department VARCHAR(100) DEFAULT '',
  job_title VARCHAR(100) DEFAULT '',
  direct_phone VARCHAR(20) DEFAULT '',
  mobile VARCHAR(20) DEFAULT '',
  email VARCHAR(255) DEFAULT '',
  handles_orders BOOLEAN DEFAULT FALSE NOT NULL,
  handles_invoices BOOLEAN DEFAULT FALSE NOT NULL,
  handles_delivery BOOLEAN DEFAULT FALSE NOT NULL,
  handles_quality BOOLEAN DEFAULT FALSE NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER supplier_contacts_updated_at BEFORE UPDATE ON supplier_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_supplier_contacts_supplier ON supplier_contacts(supplier_id);

-- ============================================================================
-- 16. SUPPLIER EVALUATIONS
-- ============================================================================
CREATE TYPE evaluation_type AS ENUM ('QUARTERLY','ANNUAL','PROJECT','INCIDENT','AUDIT');
CREATE TYPE evaluation_recommendation AS ENUM ('CONTINUE','DEVELOP','MONITOR','REDUCE','TERMINATE');

CREATE TABLE supplier_evaluations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  evaluation_type evaluation_type NOT NULL,
  evaluation_period_start DATE NOT NULL,
  evaluation_period_end DATE NOT NULL,
  quality_score NUMERIC(5,2) NOT NULL CHECK (quality_score >= 0 AND quality_score <= 100),
  delivery_score NUMERIC(5,2) NOT NULL CHECK (delivery_score >= 0 AND delivery_score <= 100),
  service_score NUMERIC(5,2) NOT NULL CHECK (service_score >= 0 AND service_score <= 100),
  price_score NUMERIC(5,2) NOT NULL CHECK (price_score >= 0 AND price_score <= 100),
  compliance_score NUMERIC(5,2) NOT NULL CHECK (compliance_score >= 0 AND compliance_score <= 100),
  overall_score NUMERIC(5,2) NOT NULL,
  strengths TEXT DEFAULT '',
  weaknesses TEXT DEFAULT '',
  action_plan TEXT DEFAULT '',
  recommendation evaluation_recommendation NOT NULL,
  evaluator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Auto-calculate overall_score
CREATE OR REPLACE FUNCTION calculate_evaluation_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.overall_score := (
    NEW.quality_score * 0.3 +
    NEW.delivery_score * 0.25 +
    NEW.service_score * 0.2 +
    NEW.price_score * 0.15 +
    NEW.compliance_score * 0.1
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER supplier_evaluations_calc_score
  BEFORE INSERT OR UPDATE ON supplier_evaluations
  FOR EACH ROW EXECUTE FUNCTION calculate_evaluation_score();

CREATE TRIGGER supplier_evaluations_updated_at BEFORE UPDATE ON supplier_evaluations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_supplier_evaluations_supplier ON supplier_evaluations(supplier_id);

-- ============================================================================
-- 17. SUPPLIER DOCUMENTS
-- ============================================================================
CREATE TYPE supplier_document_type AS ENUM ('KBIS','RCCM','TAX_CERT','VAT_CERT','INSURANCE','BANK_CERT','ISO_CERT','QUALITY_CERT','CONTRACT','FRAMEWORK','CATALOG','PRICE_LIST','OTHER');

CREATE TABLE supplier_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  document_type supplier_document_type NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT DEFAULT '',
  file_path VARCHAR(500) DEFAULT '',
  file_size INTEGER,
  file_type VARCHAR(20) DEFAULT '',
  document_date DATE NOT NULL,
  expiry_date DATE,
  reference_number VARCHAR(100) DEFAULT '',
  is_verified BOOLEAN DEFAULT FALSE NOT NULL,
  verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verification_date TIMESTAMPTZ,
  alert_before_expiry INTEGER DEFAULT 30 NOT NULL,
  is_expired BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER supplier_documents_updated_at BEFORE UPDATE ON supplier_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_supplier_documents_supplier ON supplier_documents(supplier_id, document_type);
CREATE INDEX idx_supplier_documents_expiry ON supplier_documents(expiry_date DESC);

-- ============================================================================
-- 18. SUPPLIER INVOICES
-- ============================================================================
CREATE TYPE supplier_invoice_status AS ENUM ('RECEIVED','VALIDATED','ACCOUNTING_OK','APPROVED','PAID','DISPUTED','REJECTED');
CREATE TYPE validation_status AS ENUM ('PENDING','APPROVED','REJECTED','REQUIRES_INFO');

CREATE TABLE supplier_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  invoice_number VARCHAR(100) NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  amount_excl_tax NUMERIC(20,2) NOT NULL,
  vat_amount NUMERIC(20,2) NOT NULL,
  amount_incl_tax NUMERIC(20,2) NOT NULL,
  purchase_order_ref VARCHAR(100) DEFAULT '',
  delivery_receipt_ref VARCHAR(100) DEFAULT '',
  wise_procure_id VARCHAR(100) DEFAULT '',
  status supplier_invoice_status DEFAULT 'RECEIVED' NOT NULL,
  technical_validation validation_status DEFAULT 'PENDING' NOT NULL,
  technical_validator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  technical_validation_date TIMESTAMPTZ,
  technical_comments TEXT DEFAULT '',
  accounting_validation validation_status DEFAULT 'PENDING' NOT NULL,
  accounting_validator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  accounting_validation_date TIMESTAMPTZ,
  accounting_comments TEXT DEFAULT '',
  ocr_extracted_data JSONB DEFAULT '{}'::JSONB,
  ocr_confidence_score NUMERIC(5,2) DEFAULT 0 NOT NULL,
  duplicate_check_passed BOOLEAN DEFAULT TRUE NOT NULL,
  amount_check_passed BOOLEAN DEFAULT TRUE NOT NULL,
  po_match_passed BOOLEAN DEFAULT TRUE NOT NULL,
  payment_date DATE,
  payment_amount NUMERIC(20,2),
  payment_reference VARCHAR(100) DEFAULT '',
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(supplier_id, invoice_number)
);

CREATE TRIGGER supplier_invoices_updated_at BEFORE UPDATE ON supplier_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_supplier_invoices_supplier ON supplier_invoices(supplier_id, status);
CREATE INDEX idx_supplier_invoices_date ON supplier_invoices(invoice_date DESC);
CREATE INDEX idx_supplier_invoices_due ON supplier_invoices(due_date DESC);

-- ============================================================================
-- 19. SUPPLIER PAYMENTS
-- ============================================================================
CREATE TYPE supplier_payment_type AS ENUM ('STANDARD','EARLY_DISCOUNT','GROUPED','PARTIAL','COMPENSATION');
CREATE TYPE supplier_payment_status AS ENUM ('PROPOSED','APPROVED','EXECUTED','FAILED','CANCELLED');

CREATE TABLE supplier_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  payment_reference VARCHAR(100) NOT NULL UNIQUE,
  payment_date DATE NOT NULL,
  gross_amount NUMERIC(20,2) NOT NULL,
  discount_amount NUMERIC(20,2) DEFAULT 0 NOT NULL,
  net_amount NUMERIC(20,2) NOT NULL,
  payment_type supplier_payment_type NOT NULL,
  early_payment_days INTEGER DEFAULT 0 NOT NULL,
  discount_rate_applied NUMERIC(5,2) DEFAULT 0 NOT NULL,
  status supplier_payment_status DEFAULT 'PROPOSED' NOT NULL,
  proposed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approval_date TIMESTAMPTZ,
  bank_transaction_id VARCHAR(100) DEFAULT '',
  execution_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- M2M junction table for supplier_payments <-> supplier_invoices
CREATE TABLE supplier_payment_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID NOT NULL REFERENCES supplier_payments(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES supplier_invoices(id) ON DELETE CASCADE,
  UNIQUE(payment_id, invoice_id)
);

CREATE TRIGGER supplier_payments_updated_at BEFORE UPDATE ON supplier_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_supplier_payments_supplier ON supplier_payments(supplier_id, status);
CREATE INDEX idx_supplier_payments_date ON supplier_payments(payment_date DESC);

-- ============================================================================
-- 20. SUPPLIER ANALYTICS (One-to-One)
-- ============================================================================
CREATE TABLE supplier_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL UNIQUE REFERENCES suppliers(id) ON DELETE CASCADE,
  total_orders_count INTEGER DEFAULT 0 NOT NULL,
  total_invoices_count INTEGER DEFAULT 0 NOT NULL,
  total_amount_ordered NUMERIC(20,2) DEFAULT 0 NOT NULL,
  total_amount_invoiced NUMERIC(20,2) DEFAULT 0 NOT NULL,
  total_amount_paid NUMERIC(20,2) DEFAULT 0 NOT NULL,
  average_delivery_time NUMERIC(10,1) DEFAULT 0 NOT NULL,
  on_time_delivery_rate NUMERIC(5,2) DEFAULT 100 NOT NULL,
  quality_defect_rate NUMERIC(5,2) DEFAULT 0 NOT NULL,
  invoice_accuracy_rate NUMERIC(5,2) DEFAULT 100 NOT NULL,
  total_savings_discount NUMERIC(20,2) DEFAULT 0 NOT NULL,
  total_savings_negotiation NUMERIC(20,2) DEFAULT 0 NOT NULL,
  last_12m_orders INTEGER DEFAULT 0 NOT NULL,
  last_12m_amount NUMERIC(20,2) DEFAULT 0 NOT NULL,
  average_order_frequency NUMERIC(10,1) DEFAULT 0 NOT NULL,
  last_calculation TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER supplier_analytics_updated_at BEFORE UPDATE ON supplier_analytics FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 21. RLS Policies for all tiers/customer/supplier tables
-- ============================================================================

-- Tiers
ALTER TABLE tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation" ON tiers FOR ALL USING (company_id = get_user_company_id());

-- Tiers sub-tables (through tiers FK)
ALTER TABLE tiers_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation" ON tiers_addresses FOR ALL
  USING (EXISTS (SELECT 1 FROM tiers t WHERE t.id = tiers_addresses.tiers_id AND t.company_id = get_user_company_id()));

ALTER TABLE tiers_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation" ON tiers_contacts FOR ALL
  USING (EXISTS (SELECT 1 FROM tiers t WHERE t.id = tiers_contacts.tiers_id AND t.company_id = get_user_company_id()));

ALTER TABLE tiers_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation" ON tiers_categories FOR ALL USING (company_id = get_user_company_id());

ALTER TABLE tiers_classifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation" ON tiers_classifications FOR ALL
  USING (EXISTS (SELECT 1 FROM tiers t WHERE t.id = tiers_classifications.tiers_id AND t.company_id = get_user_company_id()));

ALTER TABLE tiers_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation" ON tiers_history FOR ALL
  USING (EXISTS (SELECT 1 FROM tiers t WHERE t.id = tiers_history.tiers_id AND t.company_id = get_user_company_id()));

-- Customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation" ON customers FOR ALL USING (company_id = get_user_company_id());

ALTER TABLE customer_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation" ON customer_contacts FOR ALL
  USING (EXISTS (SELECT 1 FROM customers c WHERE c.id = customer_contacts.customer_id AND c.company_id = get_user_company_id()));

ALTER TABLE customer_delivery_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation" ON customer_delivery_addresses FOR ALL
  USING (EXISTS (SELECT 1 FROM customers c WHERE c.id = customer_delivery_addresses.customer_id AND c.company_id = get_user_company_id()));

ALTER TABLE customer_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation" ON customer_documents FOR ALL
  USING (EXISTS (SELECT 1 FROM customers c WHERE c.id = customer_documents.customer_id AND c.company_id = get_user_company_id()));

ALTER TABLE customer_payment_promises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation" ON customer_payment_promises FOR ALL
  USING (EXISTS (SELECT 1 FROM customers c WHERE c.id = customer_payment_promises.customer_id AND c.company_id = get_user_company_id()));

ALTER TABLE customer_reminder_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation" ON customer_reminder_history FOR ALL
  USING (EXISTS (SELECT 1 FROM customers c WHERE c.id = customer_reminder_history.customer_id AND c.company_id = get_user_company_id()));

ALTER TABLE customer_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation" ON customer_analytics FOR ALL
  USING (EXISTS (SELECT 1 FROM customers c WHERE c.id = customer_analytics.customer_id AND c.company_id = get_user_company_id()));

-- Suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation" ON suppliers FOR ALL USING (company_id = get_user_company_id());

ALTER TABLE supplier_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation" ON supplier_contacts FOR ALL
  USING (EXISTS (SELECT 1 FROM suppliers s WHERE s.id = supplier_contacts.supplier_id AND s.company_id = get_user_company_id()));

ALTER TABLE supplier_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation" ON supplier_evaluations FOR ALL
  USING (EXISTS (SELECT 1 FROM suppliers s WHERE s.id = supplier_evaluations.supplier_id AND s.company_id = get_user_company_id()));

ALTER TABLE supplier_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation" ON supplier_documents FOR ALL
  USING (EXISTS (SELECT 1 FROM suppliers s WHERE s.id = supplier_documents.supplier_id AND s.company_id = get_user_company_id()));

ALTER TABLE supplier_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation" ON supplier_invoices FOR ALL
  USING (EXISTS (SELECT 1 FROM suppliers s WHERE s.id = supplier_invoices.supplier_id AND s.company_id = get_user_company_id()));

ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation" ON supplier_payments FOR ALL
  USING (EXISTS (SELECT 1 FROM suppliers s WHERE s.id = supplier_payments.supplier_id AND s.company_id = get_user_company_id()));

ALTER TABLE supplier_payment_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation" ON supplier_payment_invoices FOR ALL
  USING (EXISTS (
    SELECT 1 FROM supplier_payments sp
    JOIN suppliers s ON s.id = sp.supplier_id
    WHERE sp.id = supplier_payment_invoices.payment_id AND s.company_id = get_user_company_id()
  ));

ALTER TABLE supplier_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company isolation" ON supplier_analytics FOR ALL
  USING (EXISTS (SELECT 1 FROM suppliers s WHERE s.id = supplier_analytics.supplier_id AND s.company_id = get_user_company_id()));
