-- ============================================================================
-- Atlas Studio — MULTI-APPLICATION (sous-projets)
-- ============================================================================
-- Un seul projet Supabase, plusieurs applications.
-- Chaque utilisateur a accès à une ou plusieurs applications.
-- ============================================================================

-- 1. Table des applications Atlas Studio
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,          -- 'atlas-fna', 'atlas-hr', 'atlas-crm'
  name TEXT NOT NULL,                  -- 'Atlas F&A'
  description TEXT,
  icon TEXT,                           -- nom d'icône (lucide-react)
  color TEXT DEFAULT '#171717',        -- couleur du thème
  url TEXT,                            -- URL de l'app (si déployée séparément)
  version TEXT DEFAULT '1.0.0',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Table de liaison utilisateur ↔ applications
CREATE TABLE IF NOT EXISTS user_applications (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  role_override TEXT,                  -- rôle spécifique à l'app (null = rôle global)
  granted_at TIMESTAMPTZ DEFAULT now(),
  granted_by UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true,
  PRIMARY KEY (user_id, application_id)
);

-- 3. Seed les applications Atlas Studio
INSERT INTO applications (code, name, description, icon, color, display_order, is_active) VALUES
  ('atlas-fna', 'Atlas F&A',  'ERP Comptable & Financier — SYSCOHADA / OHADA',    'calculator',    '#171717', 1, true),
  ('atlas-hr',      'Atlas HR',       'Gestion des Ressources Humaines & Paie',            'users',         '#2563eb', 2, false),
  ('atlas-crm',     'Atlas CRM',      'Gestion de la Relation Client',                     'handshake',     '#059669', 3, false),
  ('atlas-stock',   'Atlas Stock',    'Gestion des Stocks & Inventaire',                   'package',       '#d97706', 4, false),
  ('atlas-project', 'Atlas Project',  'Gestion de Projets & Planification',                'folder-kanban', '#7c3aed', 5, false)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon;

-- 4. Donner accès Atlas F&A à tous les utilisateurs existants
INSERT INTO user_applications (user_id, application_id)
SELECT p.id, a.id
FROM profiles p
CROSS JOIN applications a
WHERE a.code = 'atlas-fna'
ON CONFLICT (user_id, application_id) DO NOTHING;

-- 5. RLS sur user_applications
ALTER TABLE user_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own apps" ON user_applications;
CREATE POLICY "Users see own apps" ON user_applications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage apps" ON user_applications;
CREATE POLICY "Admins manage apps" ON user_applications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.code IN ('admin', 'super_admin')
    )
  );

-- 6. RLS sur applications (tout le monde peut lire)
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read apps" ON applications;
CREATE POLICY "Anyone can read apps" ON applications
  FOR SELECT USING (true);

-- 7. Fonction : récupérer les apps autorisées pour l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.get_user_applications()
RETURNS JSON AS $$
  SELECT json_agg(json_build_object(
    'code', a.code,
    'name', a.name,
    'description', a.description,
    'icon', a.icon,
    'color', a.color,
    'url', a.url,
    'version', a.version,
    'is_active', a.is_active
  ) ORDER BY a.display_order)
  FROM user_applications ua
  JOIN applications a ON ua.application_id = a.id
  WHERE ua.user_id = auth.uid()
    AND ua.is_active = true
    AND a.is_active = true
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================================
-- GESTION DES ACCÈS
-- ============================================================================
--
-- Donner accès à une app :
--   INSERT INTO user_applications (user_id, application_id)
--   SELECT p.id, a.id FROM profiles p, applications a
--   WHERE p.email = 'user@email.com' AND a.code = 'atlas-hr';
--
-- Retirer accès :
--   UPDATE user_applications SET is_active = false
--   WHERE user_id = (SELECT id FROM profiles WHERE email = 'user@email.com')
--     AND application_id = (SELECT id FROM applications WHERE code = 'atlas-hr');
--
-- Voir les accès :
--   SELECT p.email, a.code, a.name, ua.is_active
--   FROM user_applications ua
--   JOIN profiles p ON ua.user_id = p.id
--   JOIN applications a ON ua.application_id = a.id
--   ORDER BY p.email, a.display_order;
-- ============================================================================
