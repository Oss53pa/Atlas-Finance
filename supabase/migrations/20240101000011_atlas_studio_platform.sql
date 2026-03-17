-- ============================================================================
-- Atlas Studio — Migration 011 : Plateforme SaaS complète
-- Tables : tenants, user_profiles, entities, feature_flags, invoices,
--          audit_logs, support_tickets
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. TENANTS — entité client (entreprise abonnée)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  rccm TEXT,
  country TEXT NOT NULL DEFAULT 'CI',
  currency TEXT NOT NULL DEFAULT 'XOF',
  legal_form TEXT,
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('active', 'suspended', 'churned', 'trial')),
  logo_url TEXT,
  billing_email TEXT,
  stripe_customer_id TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 2. USER_PROFILES — profils utilisateurs liés aux tenants
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'collaborateur' CHECK (role IN ('superadmin', 'admin', 'comptable', 'controle_gestion', 'dg', 'auditeur', 'readonly', 'collaborateur')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
  modules_access TEXT[] DEFAULT '{}',
  entity_ids UUID[] DEFAULT '{}',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 3. ENTITIES — filiales / entités comptables
-- ============================================================================
CREATE TABLE IF NOT EXISTS entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES entities(id),
  fiscal_year_start DATE,
  fiscal_year_end DATE,
  chart_of_accounts TEXT DEFAULT 'SYSCOHADA',
  country TEXT,
  currency TEXT DEFAULT 'XOF',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 4. FEATURE FLAGS — activation modules par tenant
-- ============================================================================
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  override_by UUID REFERENCES auth.users(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, module)
);

-- ============================================================================
-- 5. INVOICES — factures
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id UUID,
  invoice_number TEXT UNIQUE,
  amount NUMERIC(12,0) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XOF',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  payment_method TEXT CHECK (payment_method IN ('mobile_money', 'virement', 'card', 'bon_commande')),
  payment_reference TEXT,
  period_start DATE,
  period_end DATE,
  pdf_url TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 6. AUDIT LOGS — piste d'audit complète
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  impersonated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 7. SUPPORT TICKETS
-- ============================================================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  subject TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_client', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('critical', 'high', 'normal', 'low')),
  internal_notes TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 8. INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant ON user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_entities_tenant ON entities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_tenant ON feature_flags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant ON support_tickets(tenant_id);

-- ============================================================================
-- 9. HELPER FUNCTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_atlas_superadmin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((auth.jwt() ->> 'atlas_role') = 'atlas_superadmin', false)
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- 10. RLS POLICIES
-- ============================================================================

-- TENANTS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_select" ON tenants;
CREATE POLICY "tenant_select" ON tenants FOR SELECT USING (
  id = get_my_tenant_id() OR is_atlas_superadmin()
);
DROP POLICY IF EXISTS "tenant_insert" ON tenants;
CREATE POLICY "tenant_insert" ON tenants FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "tenant_update" ON tenants;
CREATE POLICY "tenant_update" ON tenants FOR UPDATE USING (
  id = get_my_tenant_id() OR is_atlas_superadmin()
);

-- USER_PROFILES
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "up_select" ON user_profiles;
CREATE POLICY "up_select" ON user_profiles FOR SELECT USING (
  tenant_id = get_my_tenant_id() OR is_atlas_superadmin()
);
DROP POLICY IF EXISTS "up_insert" ON user_profiles;
CREATE POLICY "up_insert" ON user_profiles FOR INSERT WITH CHECK (
  tenant_id = get_my_tenant_id() OR auth.uid() = id
);
DROP POLICY IF EXISTS "up_update" ON user_profiles;
CREATE POLICY "up_update" ON user_profiles FOR UPDATE USING (
  (tenant_id = get_my_tenant_id() AND EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('superadmin', 'admin')
  )) OR is_atlas_superadmin()
);

-- ENTITIES
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ent_select" ON entities;
CREATE POLICY "ent_select" ON entities FOR SELECT USING (
  tenant_id = get_my_tenant_id() OR is_atlas_superadmin()
);
DROP POLICY IF EXISTS "ent_insert" ON entities;
CREATE POLICY "ent_insert" ON entities FOR INSERT WITH CHECK (
  tenant_id = get_my_tenant_id()
);

-- FEATURE FLAGS
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ff_select" ON feature_flags;
CREATE POLICY "ff_select" ON feature_flags FOR SELECT USING (
  tenant_id = get_my_tenant_id() OR is_atlas_superadmin()
);
DROP POLICY IF EXISTS "ff_all_admin" ON feature_flags;
CREATE POLICY "ff_all_admin" ON feature_flags FOR ALL USING (is_atlas_superadmin());

-- INVOICES
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inv_select" ON invoices;
CREATE POLICY "inv_select" ON invoices FOR SELECT USING (
  tenant_id = get_my_tenant_id() OR is_atlas_superadmin()
);
DROP POLICY IF EXISTS "inv_all_admin" ON invoices;
CREATE POLICY "inv_all_admin" ON invoices FOR ALL USING (is_atlas_superadmin());

-- AUDIT LOGS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "al_select" ON audit_logs;
CREATE POLICY "al_select" ON audit_logs FOR SELECT USING (
  tenant_id = get_my_tenant_id() OR is_atlas_superadmin()
);
DROP POLICY IF EXISTS "al_insert" ON audit_logs;
CREATE POLICY "al_insert" ON audit_logs FOR INSERT WITH CHECK (
  tenant_id = get_my_tenant_id() OR is_atlas_superadmin()
);

-- SUPPORT TICKETS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "st_select" ON support_tickets;
CREATE POLICY "st_select" ON support_tickets FOR SELECT USING (
  tenant_id = get_my_tenant_id() OR is_atlas_superadmin()
);
DROP POLICY IF EXISTS "st_insert" ON support_tickets;
CREATE POLICY "st_insert" ON support_tickets FOR INSERT WITH CHECK (
  tenant_id = get_my_tenant_id() OR is_atlas_superadmin()
);
DROP POLICY IF EXISTS "st_update" ON support_tickets;
CREATE POLICY "st_update" ON support_tickets FOR UPDATE USING (
  tenant_id = get_my_tenant_id() OR is_atlas_superadmin()
);

-- ============================================================================
-- 11. TRIGGER : auto-création tenant + profil à l'inscription
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_v2()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
  v_role TEXT;
  v_org_name TEXT;
  v_invite_token TEXT;
BEGIN
  v_invite_token := NEW.raw_user_meta_data->>'invite_token';

  -- Cas 1 : invitation
  IF v_invite_token IS NOT NULL THEN
    SELECT tenant_id, role INTO v_tenant_id, v_role
    FROM invitations WHERE token = v_invite_token AND accepted_at IS NULL;

    IF v_tenant_id IS NOT NULL THEN
      UPDATE invitations SET accepted_at = now() WHERE token = v_invite_token;
    END IF;
  END IF;

  -- Cas 2 : nouvelle inscription → créer un tenant
  IF v_tenant_id IS NULL THEN
    v_org_name := COALESCE(NEW.raw_user_meta_data->>'organization_name', NEW.raw_user_meta_data->>'company_name', 'Mon Entreprise');
    v_role := 'superadmin';

    INSERT INTO tenants (name, slug, country, currency, billing_email, created_by, status)
    VALUES (
      v_org_name,
      lower(regexp_replace(v_org_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || substring(gen_random_uuid()::text from 1 for 4),
      COALESCE(NEW.raw_user_meta_data->>'country', 'CI'),
      COALESCE(NEW.raw_user_meta_data->>'currency', 'XOF'),
      NEW.email,
      NEW.id,
      'trial'
    )
    RETURNING id INTO v_tenant_id;

    -- Créer l'entité comptable par défaut
    INSERT INTO entities (tenant_id, name, country, currency, chart_of_accounts)
    VALUES (v_tenant_id, v_org_name, COALESCE(NEW.raw_user_meta_data->>'country', 'CI'), COALESCE(NEW.raw_user_meta_data->>'currency', 'XOF'), 'SYSCOHADA');
  END IF;

  -- Créer le profil
  INSERT INTO user_profiles (id, tenant_id, first_name, last_name, full_name, phone, role, status)
  VALUES (
    NEW.id,
    v_tenant_id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'first_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(v_role, 'collaborateur'),
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    tenant_id = COALESCE(user_profiles.tenant_id, v_tenant_id),
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Installer le trigger (remplace l'ancien si existant)
DROP TRIGGER IF EXISTS on_auth_user_created_v2 ON auth.users;
CREATE TRIGGER on_auth_user_created_v2
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_v2();

-- ============================================================================
-- 12. SEED SOLUTIONS (mise à jour)
-- ============================================================================
INSERT INTO solutions (code, name, description, icon, color, price_monthly_xof, price_yearly_xof, price_monthly_eur, price_yearly_eur, features, is_active, display_order) VALUES
  ('atlas-finance', 'Atlas Finance',
   'ERP Comptable & Financier conforme SYSCOHADA — Plan comptable, écritures, états financiers, trésorerie, fiscalité, audit IA.',
   'calculator', '#171717', 25000, 250000, 39, 390,
   '["Comptabilité SYSCOHADA", "États financiers", "Trésorerie", "Fiscalité 17 pays", "Audit IA PROPH3T", "Multi-société", "Export FEC"]'::jsonb, true, 1),
  ('liass-pilot', 'Liass''Pilot',
   'Liasse fiscale SYSCOHADA automatique — DSF, états annexes, télédéclaration conforme DGI.',
   'file-text', '#0891b2', 15000, 150000, 25, 250,
   '["Liasse fiscale auto", "DSF conforme DGI", "États annexes", "Télédéclaration", "Contrôle cohérence"]'::jsonb, true, 2),
  ('docjourney', 'DocJourney',
   'Gestion documentaire intelligente — OCR, classement IA, archivage légal.',
   'folder-open', '#7c3aed', 10000, 100000, 19, 190,
   '["OCR intelligent", "Classement IA", "Archivage légal 10 ans", "Piste d''audit", "Recherche full-text"]'::jsonb, true, 3),
  ('tms-pro', 'TMS Pro Africa',
   'Transport Management System — Gestion des flux transport et logistique.',
   'truck', '#dc2626', 20000, 200000, 35, 350,
   '["Planification transport", "Suivi GPS", "Gestion flotte", "Facturation transport"]'::jsonb, false, 4),
  ('scrutix', 'Scrutix',
   'Audit & Contrôle interne — Missions d''audit, conformité, gestion des risques.',
   'shield-check', '#059669', 20000, 200000, 35, 350,
   '["Missions d''audit", "Contrôle interne", "Gestion des risques", "Rapports conformité"]'::jsonb, false, 5),
  ('atlas-hr', 'Atlas HR',
   'Gestion RH & Paie — Bulletins, congés, cotisations sociales.',
   'users', '#2563eb', 20000, 200000, 29, 290,
   '["Paie multi-pays", "Congés", "Cotisations sociales", "Contrats"]'::jsonb, false, 6)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description,
  price_monthly_xof = EXCLUDED.price_monthly_xof, price_yearly_xof = EXCLUDED.price_yearly_xof,
  price_monthly_eur = EXCLUDED.price_monthly_eur, price_yearly_eur = EXCLUDED.price_yearly_eur,
  features = EXCLUDED.features, is_active = EXCLUDED.is_active, display_order = EXCLUDED.display_order;
