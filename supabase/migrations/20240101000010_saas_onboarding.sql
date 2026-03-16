-- ============================================================================
-- Atlas Studio — SaaS Onboarding (Parcours B)
-- Migration 010 : Organizations, Solutions, Subscriptions, Invitations
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. ORGANIZATIONS — entité de facturation SaaS
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  billing_email TEXT,
  logo_url TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  stripe_customer_id TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 2. SOLUTIONS — catalogue de produits Atlas Studio
-- ============================================================================
CREATE TABLE IF NOT EXISTS solutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#171717',
  price_monthly_xof INTEGER DEFAULT 0,
  price_yearly_xof INTEGER DEFAULT 0,
  price_monthly_eur NUMERIC(10,2) DEFAULT 0,
  price_yearly_eur NUMERIC(10,2) DEFAULT 0,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 3. SUBSCRIPTIONS — abonnements org ↔ solution
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  solution_id UUID NOT NULL REFERENCES solutions(id),
  status TEXT DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete')),
  payment_method TEXT CHECK (payment_method IN ('mobile_money', 'stripe', 'free', NULL)),
  payment_reference TEXT,
  trial_ends_at TIMESTAMPTZ DEFAULT now() + interval '14 days',
  current_period_start TIMESTAMPTZ DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  seats_limit INTEGER DEFAULT 5,
  seats_used INTEGER DEFAULT 1,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, solution_id)
);

-- ============================================================================
-- 4. INVITATIONS — invitation de collaborateurs
-- ============================================================================
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role_code TEXT DEFAULT 'user',
  token TEXT UNIQUE NOT NULL DEFAULT uuid_generate_v4()::text,
  invited_by UUID REFERENCES profiles(id),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT now() + interval '7 days',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 5. ALTER profiles — ajouter organization_id
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'organization_id') THEN
    ALTER TABLE profiles ADD COLUMN organization_id UUID REFERENCES organizations(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
    ALTER TABLE profiles ADD COLUMN full_name TEXT;
  END IF;
END $$;

-- ALTER societes — lien vers organization
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'societes' AND column_name = 'organization_id') THEN
    ALTER TABLE societes ADD COLUMN organization_id UUID REFERENCES organizations(id);
  END IF;
END $$;

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.generate_slug(name TEXT)
RETURNS TEXT AS $$
  SELECT lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'))
  || '-' || substring(uuid_generate_v4()::text from 1 for 4)
$$ LANGUAGE sql;

-- ============================================================================
-- 7. RLS POLICIES
-- ============================================================================

-- Organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own org" ON organizations;
CREATE POLICY "Users see own org" ON organizations
  FOR SELECT USING (id = get_user_organization_id());
DROP POLICY IF EXISTS "Users can update own org" ON organizations;
CREATE POLICY "Users can update own org" ON organizations
  FOR UPDATE USING (id = get_user_organization_id());
DROP POLICY IF EXISTS "Authenticated can create org" ON organizations;
CREATE POLICY "Authenticated can create org" ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Solutions (public read for authenticated)
ALTER TABLE solutions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read solutions" ON solutions;
CREATE POLICY "Anyone can read solutions" ON solutions
  FOR SELECT USING (true);

-- Subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own subscriptions" ON subscriptions;
CREATE POLICY "Users see own subscriptions" ON subscriptions
  FOR SELECT USING (organization_id = get_user_organization_id());
DROP POLICY IF EXISTS "Users can create subscriptions" ON subscriptions;
CREATE POLICY "Users can create subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (organization_id = get_user_organization_id());
DROP POLICY IF EXISTS "Users can update subscriptions" ON subscriptions;
CREATE POLICY "Users can update subscriptions" ON subscriptions
  FOR UPDATE USING (organization_id = get_user_organization_id());

-- Invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own org invitations" ON invitations;
CREATE POLICY "Users see own org invitations" ON invitations
  FOR SELECT USING (organization_id = get_user_organization_id());
DROP POLICY IF EXISTS "Admins can create invitations" ON invitations;
CREATE POLICY "Admins can create invitations" ON invitations
  FOR INSERT WITH CHECK (organization_id = get_user_organization_id());
-- Public: anyone can read by token (for accept-invite flow)
DROP POLICY IF EXISTS "Anyone can read invitation by token" ON invitations;
CREATE POLICY "Anyone can read invitation by token" ON invitations
  FOR SELECT USING (true);

-- ============================================================================
-- 8. UPDATE handle_new_user TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
  v_org_name TEXT;
  v_role_id UUID;
  v_company_id UUID;
  v_invite_token TEXT;
BEGIN
  -- Check for invitation
  v_invite_token := NEW.raw_user_meta_data->>'invite_token';

  IF v_invite_token IS NOT NULL THEN
    -- Joining via invitation: get org from invitation
    SELECT organization_id INTO v_org_id FROM invitations
    WHERE token = v_invite_token AND accepted_at IS NULL AND expires_at > now();

    IF v_org_id IS NOT NULL THEN
      -- Get role from invitation
      SELECT id INTO v_role_id FROM roles
      WHERE code = (SELECT role_code FROM invitations WHERE token = v_invite_token)
      LIMIT 1;
      -- Mark invitation as accepted
      UPDATE invitations SET accepted_at = now() WHERE token = v_invite_token;
    END IF;
  END IF;

  -- If no org yet (new registration, not invitation)
  IF v_org_id IS NULL THEN
    v_org_name := COALESCE(NEW.raw_user_meta_data->>'organization_name', 'Mon Organisation');
    INSERT INTO organizations (name, slug, billing_email, created_by)
    VALUES (v_org_name, generate_slug(v_org_name), NEW.email, NEW.id)
    RETURNING id INTO v_org_id;
  END IF;

  -- Default role
  IF v_role_id IS NULL THEN
    SELECT id INTO v_role_id FROM roles WHERE code = 'admin' LIMIT 1;
  END IF;

  -- Default company
  SELECT id INTO v_company_id FROM societes LIMIT 1;

  -- Create profile
  INSERT INTO public.profiles (id, email, username, first_name, last_name, full_name, role_id, company_id, organization_id, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'first_name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'first_name', SPLIT_PART(NEW.email, '@', 1)),
    v_role_id,
    v_company_id,
    v_org_id,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    organization_id = COALESCE(profiles.organization_id, v_org_id),
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. SEED SOLUTIONS
-- ============================================================================
INSERT INTO solutions (code, name, description, icon, color, price_monthly_xof, price_yearly_xof, price_monthly_eur, price_yearly_eur, features, is_active, display_order) VALUES
  -- ═══ SOLUTIONS EN PRODUCTION ═══
  ('atlas-finance', 'Atlas Finance',
   'ERP Comptable & Financier conforme SYSCOHADA — Plan comptable, écritures, états financiers, trésorerie, fiscalité, audit IA.',
   'calculator', '#171717',
   25000, 250000, 39, 390,
   '["Comptabilité SYSCOHADA", "États financiers (Bilan, CR, TAFIRE, SIG)", "Trésorerie & rapprochement bancaire", "Fiscalité 17 pays OHADA", "Audit IA PROPH3T (108 contrôles)", "Multi-société & multi-exercice", "Export FEC & liasse fiscale"]'::jsonb,
   true, 1),

  ('liass-pilot', 'Liass''Pilot',
   'Génération automatique de la liasse fiscale SYSCOHADA — DSF, états annexes, télédéclaration conforme DGI.',
   'file-text', '#0891b2',
   15000, 150000, 25, 250,
   '["Liasse fiscale SYSCOHADA automatique", "DSF conforme DGI", "États annexes (tableau 1-22)", "Télédéclaration", "Contrôle de cohérence", "Export PDF & XML", "Intégration Atlas Finance"]'::jsonb,
   true, 2),

  ('docjourney', 'DocJourney',
   'Gestion documentaire intelligente — Numérisation, classement automatique, archivage légal et piste d''audit.',
   'folder-open', '#7c3aed',
   10000, 100000, 19, 190,
   '["Numérisation OCR", "Classement automatique IA", "Archivage légal (10 ans)", "Piste d''audit SHA-256", "Recherche full-text", "Partage sécurisé", "Intégration Atlas Finance"]'::jsonb,
   true, 3),

  -- ═══ SOLUTIONS À VENIR ═══
  ('atlas-hr', 'Atlas HR',
   'Gestion des Ressources Humaines & Paie — Bulletins, congés, cotisations sociales CNPS/CSS/IPRES.',
   'users', '#2563eb',
   20000, 200000, 29, 290,
   '["Bulletins de paie multi-pays", "Congés & absences", "Cotisations sociales (CNPS, CSS, IPRES)", "Déclarations sociales", "Gestion des contrats"]'::jsonb,
   false, 4),

  ('atlas-crm', 'Atlas CRM',
   'Relation Client & Commercial — Pipeline, devis, facturation, recouvrement.',
   'handshake', '#059669',
   15000, 150000, 25, 250,
   '["Pipeline commercial", "Devis & facturation", "Recouvrement automatisé", "Reporting client", "Intégration Atlas Finance"]'::jsonb,
   false, 5)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly_xof = EXCLUDED.price_monthly_xof,
  price_yearly_xof = EXCLUDED.price_yearly_xof,
  price_monthly_eur = EXCLUDED.price_monthly_eur,
  price_yearly_eur = EXCLUDED.price_yearly_eur,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active;
