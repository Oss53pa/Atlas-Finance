-- ============================================================================
-- Migration 00001: Core tables & Authentication
-- WiseBook ERP - Supabase Migration
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- ============================================================================
-- Helper: auto-update updated_at trigger function
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. SOCIETES (Companies)
-- ============================================================================
CREATE TABLE societes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom VARCHAR(255) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  email VARCHAR(255) DEFAULT '',
  telephone VARCHAR(20) DEFAULT '',
  address TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER societes_updated_at
  BEFORE UPDATE ON societes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_societes_code ON societes(code);
CREATE INDEX idx_societes_nom ON societes(nom);

-- ============================================================================
-- 2. DEVISES (Currencies)
-- ============================================================================
CREATE TABLE devises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(3) NOT NULL UNIQUE,
  nom VARCHAR(100) NOT NULL,
  symbole VARCHAR(10) NOT NULL,
  taux_change NUMERIC(10,6) DEFAULT 1.0 NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER devises_updated_at
  BEFORE UPDATE ON devises
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_devises_code ON devises(code);

-- ============================================================================
-- 3. PERMISSIONS
-- ============================================================================
CREATE TABLE permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  module VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER permissions_updated_at
  BEFORE UPDATE ON permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_permissions_code ON permissions(code);
CREATE INDEX idx_permissions_module ON permissions(module);

-- ============================================================================
-- 4. ROLES
-- ============================================================================
CREATE TYPE role_code AS ENUM ('admin', 'manager', 'accountant', 'user');

CREATE TABLE roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code role_code NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 5. ROLE_PERMISSIONS (M2M junction table)
-- ============================================================================
CREATE TABLE role_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

-- ============================================================================
-- 6. PROFILES (extends auth.users from Supabase Auth)
-- ============================================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  username VARCHAR(150),
  first_name VARCHAR(150) DEFAULT '',
  last_name VARCHAR(150) DEFAULT '',
  phone VARCHAR(20),
  photo_url TEXT,
  role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  company_id UUID REFERENCES societes(id) ON DELETE SET NULL,
  is_2fa_enabled BOOLEAN DEFAULT FALSE NOT NULL,
  last_login_ip INET,
  failed_login_attempts INTEGER DEFAULT 0 NOT NULL,
  account_locked_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role_id);
CREATE INDEX idx_profiles_company ON profiles(company_id);
CREATE INDEX idx_profiles_is_active ON profiles(is_active);

-- ============================================================================
-- 7. Trigger: auto-create profile on new auth user
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, username, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- 8. Helper function: get current user's company_id
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================================
-- 9. Helper function: check user permission
-- ============================================================================
CREATE OR REPLACE FUNCTION user_has_permission(p_permission_code TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    JOIN role_permissions rp ON rp.role_id = p.role_id
    JOIN permissions perm ON perm.id = rp.permission_id
    WHERE p.id = auth.uid()
      AND perm.code = p_permission_code
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================================
-- 10. RLS Policies for core tables
-- ============================================================================

-- Societes: users can only see their own company
ALTER TABLE societes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own company"
  ON societes FOR SELECT
  USING (id = get_user_company_id());

CREATE POLICY "Admins can manage companies"
  ON societes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON r.id = p.role_id
      WHERE p.id = auth.uid() AND r.code = 'admin'
    )
  );

-- Devises: all authenticated users can read
ALTER TABLE devises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view currencies"
  ON devises FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage currencies"
  ON devises FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON r.id = p.role_id
      WHERE p.id = auth.uid() AND r.code = 'admin'
    )
  );

-- Permissions: all authenticated users can read
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view permissions"
  ON permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Roles: all authenticated users can read
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view roles"
  ON roles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Role_permissions: all authenticated users can read
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view role_permissions"
  ON role_permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Profiles: users see their company's profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles in company"
  ON profiles FOR SELECT
  USING (
    company_id = get_user_company_id()
    AND EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON r.id = p.role_id
      WHERE p.id = auth.uid() AND r.code IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can manage profiles in company"
  ON profiles FOR ALL
  USING (
    company_id = get_user_company_id()
    AND EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON r.id = p.role_id
      WHERE p.id = auth.uid() AND r.code = 'admin'
    )
  );
