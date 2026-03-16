-- ============================================================================
-- Atlas Finance — SUPER ADMIN + VERROUILLAGE APPLICATION
-- ============================================================================
--
-- ÉTAPE 1 : Créer le super admin dans Supabase Dashboard
-- ─────────────────────────────────────────────────────────
--   1. Aller dans https://supabase.com/dashboard
--   2. Sélectionner le projet Atlas Finance
--   3. Authentication > Users > Add user
--   4. Créer l'utilisateur :
--        Email : VOTRE_EMAIL@domain.com
--        Password : un mot de passe fort (12+ caractères)
--        ☑ Auto Confirm User (cocher)
--
-- ÉTAPE 2 : Exécuter ce SQL dans SQL Editor
-- ─────────────────────────────────────────────────────────

-- A. Ajouter le rôle super_admin s'il n'existe pas
INSERT INTO roles (id, code, name, description)
VALUES ('r0000000-0000-0000-0000-000000000000', 'super_admin', 'Super Administrateur', 'Contrôle total du système — propriétaire')
ON CONFLICT (code) DO NOTHING;

-- B. Donner TOUTES les permissions au super_admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'r0000000-0000-0000-0000-000000000000', id FROM permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- C. Promouvoir votre compte en super_admin
-- ⚠️ REMPLACEZ l'email ci-dessous par le vôtre
UPDATE profiles
SET role_id = (SELECT id FROM roles WHERE code = 'super_admin'),
    is_active = true
WHERE email = 'VOTRE_EMAIL@domain.com';

-- ============================================================================
-- ÉTAPE 3 : Bloquer les inscriptions libres (Supabase Dashboard)
-- ============================================================================
--
-- 1. Supabase Dashboard > Authentication > Providers
-- 2. Email Provider > Désactiver "Enable Sign Ups"
--    → Personne ne peut créer de compte sans que vous le fassiez manuellement
--
-- 3. OU — plus souple — garder Sign Up activé mais restreindre par domaine :
--    Authentication > URL Configuration >
--    Ajouter les domaines autorisés dans "Redirect URLs"
--
-- ============================================================================

-- ============================================================================
-- ÉTAPE 4 : Ajouter un testeur
-- ============================================================================
-- Pour donner accès à quelqu'un :
--
-- 1. Créer l'utilisateur dans Dashboard > Authentication > Users > Add user
--    (le trigger handle_new_user créera le profil automatiquement)
--
-- 2. Le promouvoir au bon rôle :
--    UPDATE profiles SET role_id = (SELECT id FROM roles WHERE code = 'manager')
--    WHERE email = 'testeur@email.com';
--
-- 3. Ajouter son email dans .env (VITE_ALLOWED_EMAILS) :
--    VITE_ALLOWED_EMAILS=votre@email.com,testeur@email.com
--
-- Pour RETIRER l'accès :
--    UPDATE profiles SET is_active = false WHERE email = 'testeur@email.com';
--    ET retirer son email de VITE_ALLOWED_EMAILS dans .env

-- ============================================================================
-- ÉTAPE 5 : Vérification
-- ============================================================================
SELECT
  p.email,
  r.code as role,
  r.name as role_name,
  s.nom as societe,
  p.is_active,
  p.created_at
FROM profiles p
JOIN roles r ON p.role_id = r.id
LEFT JOIN societes s ON p.company_id = s.id
ORDER BY r.code, p.email;
