-- ============================================================================
-- Atlas Finance — SETUP AUTHENTIFICATION SUPABASE
-- ============================================================================
-- Ce script configure l'authentification Supabase pour Atlas Finance.
--
-- ÉTAPES :
-- 1. Exécuter ce script dans Supabase SQL Editor
-- 2. Créer les utilisateurs dans Supabase Dashboard > Authentication > Users
-- 3. Exécuter le script de liaison des profils (section 4)
--
-- Prérequis : les tables societes, roles, profiles doivent exister
--             (exécuter combined_migration.sql d'abord)
-- ============================================================================

-- ============================================================================
-- 1. TRIGGER : Créer un profil automatiquement à l'inscription
-- ============================================================================
-- Quand un utilisateur s'inscrit via Supabase Auth (signUp),
-- un profil est automatiquement créé dans la table profiles
-- avec le rôle "user" par défaut.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role_id UUID;
  default_company_id UUID;
BEGIN
  -- Rôle par défaut : 'user' (lecture seule)
  SELECT id INTO default_role_id FROM roles WHERE code = 'user' LIMIT 1;
  -- Société par défaut : la première société active
  SELECT id INTO default_company_id FROM societes LIMIT 1;

  INSERT INTO public.profiles (id, email, username, first_name, last_name, role_id, company_id, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'first_name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    default_role_id,
    default_company_id,
    true
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Créer le trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 2. RLS Policies pour profiles
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Un utilisateur peut lire son propre profil
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Un utilisateur peut modifier son propre profil
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Les admins peuvent voir tous les profils de leur société
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.code = 'admin'
        AND p.company_id = profiles.company_id
    )
  );

-- Les admins peuvent modifier les profils de leur société
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
CREATE POLICY "Admins can update profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.code = 'admin'
        AND p.company_id = profiles.company_id
    )
  );

-- Le trigger peut insérer (SECURITY DEFINER)
DROP POLICY IF EXISTS "Service can insert profiles" ON profiles;
CREATE POLICY "Service can insert profiles" ON profiles
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 3. FONCTIONS utilitaires pour l'auth
-- ============================================================================

-- Récupérer l'ID société de l'utilisateur connecté (utilisé par les RLS)
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Récupérer le profil complet avec rôle et société
CREATE OR REPLACE FUNCTION public.get_user_profile()
RETURNS JSON AS $$
  SELECT json_build_object(
    'id', p.id,
    'email', p.email,
    'username', p.username,
    'first_name', p.first_name,
    'last_name', p.last_name,
    'is_active', p.is_active,
    'role', json_build_object('id', r.id, 'code', r.code, 'name', r.name),
    'company', json_build_object('id', s.id, 'code', s.code, 'nom', s.nom),
    'company_id', p.company_id
  )
  FROM profiles p
  LEFT JOIN roles r ON p.role_id = r.id
  LEFT JOIN societes s ON p.company_id = s.id
  WHERE p.id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Récupérer les permissions de l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.get_user_permissions()
RETURNS TEXT[] AS $$
  SELECT ARRAY_AGG(perm.code)
  FROM profiles p
  JOIN role_permissions rp ON rp.role_id = p.role_id
  JOIN permissions perm ON perm.id = rp.permission_id
  WHERE p.id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================================
-- 4. CRÉER LES UTILISATEURS DE DÉMO
-- ============================================================================
-- IMPORTANT : Vous devez créer les utilisateurs dans le Dashboard Supabase
-- AVANT d'exécuter cette section.
--
-- Allez dans : https://supabase.com/dashboard > Authentication > Users > Add user
--
-- Créez ces 3 utilisateurs :
--   Email: admin@atlasfinance.cm       Mot de passe: Admin123!
--   Email: manager@atlasfinance.com    Mot de passe: Manager123!
--   Email: comptable@atlasfinance.com  Mot de passe: Comptable123!
--
-- Le trigger handle_new_user() créera automatiquement les profils.
-- Ensuite, exécutez le SQL ci-dessous pour promouvoir les rôles :

-- Promouvoir admin
UPDATE profiles SET role_id = (SELECT id FROM roles WHERE code = 'admin')
WHERE email = 'admin@atlasfinance.cm';

-- Promouvoir manager
UPDATE profiles SET role_id = (SELECT id FROM roles WHERE code = 'manager')
WHERE email = 'manager@atlasfinance.com';

-- Promouvoir comptable
UPDATE profiles SET role_id = (SELECT id FROM roles WHERE code = 'accountant')
WHERE email = 'comptable@atlasfinance.com';

-- ============================================================================
-- 5. VÉRIFICATION
-- ============================================================================
-- Exécutez cette requête pour vérifier que tout est en place :
--
-- SELECT
--   p.email,
--   r.code as role,
--   s.nom as societe,
--   p.is_active
-- FROM profiles p
-- JOIN roles r ON p.role_id = r.id
-- LEFT JOIN societes s ON p.company_id = s.id;
--
-- Résultat attendu :
-- | email                        | role       | societe        | is_active |
-- |------------------------------|------------|----------------|-----------|
-- | admin@atlasfinance.cm        | admin      | Atlas Finance  | true      |
-- | manager@atlasfinance.com     | manager    | Atlas Finance  | true      |
-- | comptable@atlasfinance.com   | accountant | Atlas Finance  | true      |
