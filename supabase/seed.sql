-- ============================================================================
-- WiseBook / Atlas Finance - Seed Data
-- ============================================================================
-- Execute this in the Supabase SQL Editor AFTER running the 4 migrations.
--
-- IMPORTANT: The 3 demo users must be created via Supabase Dashboard
-- (Authentication > Users > Add user) BEFORE running this script:
--
--   1. admin@atlasfinance.cm     / admin123
--   2. manager@atlasfinance.com  / manager123
--   3. comptable@atlasfinance.com / comptable123
--
-- After creating the users, copy their UUIDs into the variables below.
-- ============================================================================

-- ============================================================================
-- 1. SOCIETE DEMO
-- ============================================================================
INSERT INTO societes (id, code, nom, description, email, telephone, address)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'ATLAS',
  'Atlas Finance',
  'Societe de demonstration - ERP Comptable SYSCOHADA',
  'contact@atlasfinance.cm',
  '+237 690 000 000',
  'Douala, Cameroun'
)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 2. DEVISES (Currencies)
-- ============================================================================
INSERT INTO devises (code, nom, symbole, taux_change, is_active) VALUES
  ('XAF', 'Franc CFA CEMAC',    'FCFA',  1.000000, true),
  ('XOF', 'Franc CFA UEMOA',    'FCFA',  1.000000, true),
  ('EUR', 'Euro',                 'EUR',   655.957000, true),
  ('USD', 'Dollar americain',     'USD',   600.000000, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 3. ROLES
-- ============================================================================
INSERT INTO roles (id, code, name, description) VALUES
  ('r0000000-0000-0000-0000-000000000001', 'admin',      'Administrateur',  'Acces complet au systeme'),
  ('r0000000-0000-0000-0000-000000000002', 'manager',    'Manager',         'Gestion et supervision'),
  ('r0000000-0000-0000-0000-000000000003', 'accountant', 'Comptable',       'Saisie et comptabilite'),
  ('r0000000-0000-0000-0000-000000000004', 'user',       'Utilisateur',     'Acces en lecture')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 4. PERMISSIONS
-- ============================================================================
INSERT INTO permissions (id, code, name, module) VALUES
  -- Accounting
  ('p0000000-0000-0000-0000-000000000001', 'accounting.view',        'Voir la comptabilite',        'accounting'),
  ('p0000000-0000-0000-0000-000000000002', 'accounting.create',      'Creer des ecritures',         'accounting'),
  ('p0000000-0000-0000-0000-000000000003', 'accounting.edit',        'Modifier des ecritures',      'accounting'),
  ('p0000000-0000-0000-0000-000000000004', 'accounting.delete',      'Supprimer des ecritures',     'accounting'),
  ('p0000000-0000-0000-0000-000000000005', 'accounting.validate',    'Valider des ecritures',       'accounting'),
  -- Treasury
  ('p0000000-0000-0000-0000-000000000006', 'treasury.view',          'Voir la tresorerie',          'treasury'),
  ('p0000000-0000-0000-0000-000000000007', 'treasury.create',        'Creer des mouvements',        'treasury'),
  ('p0000000-0000-0000-0000-000000000008', 'treasury.edit',          'Modifier des mouvements',     'treasury'),
  -- Customers
  ('p0000000-0000-0000-0000-000000000009', 'customers.view',         'Voir les clients',            'customers'),
  ('p0000000-0000-0000-0000-000000000010', 'customers.create',       'Creer des clients',           'customers'),
  ('p0000000-0000-0000-0000-000000000011', 'customers.edit',         'Modifier des clients',        'customers'),
  -- Suppliers
  ('p0000000-0000-0000-0000-000000000012', 'suppliers.view',         'Voir les fournisseurs',       'suppliers'),
  ('p0000000-0000-0000-0000-000000000013', 'suppliers.create',       'Creer des fournisseurs',      'suppliers'),
  ('p0000000-0000-0000-0000-000000000014', 'suppliers.edit',         'Modifier des fournisseurs',   'suppliers'),
  -- Dashboard & Reports
  ('p0000000-0000-0000-0000-000000000015', 'dashboard.view',         'Voir le tableau de bord',     'dashboard'),
  ('p0000000-0000-0000-0000-000000000016', 'reports.view',           'Voir les rapports',           'reports'),
  ('p0000000-0000-0000-0000-000000000017', 'reports.export',         'Exporter les rapports',       'reports'),
  -- Admin
  ('p0000000-0000-0000-0000-000000000018', 'admin.users',            'Gerer les utilisateurs',      'admin'),
  ('p0000000-0000-0000-0000-000000000019', 'admin.settings',         'Gerer les parametres',        'admin'),
  ('p0000000-0000-0000-0000-000000000020', 'admin.roles',            'Gerer les roles',             'admin')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 5. ROLE_PERMISSIONS
-- ============================================================================

-- Admin: ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  'r0000000-0000-0000-0000-000000000001',
  id
FROM permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager: everything except admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  'r0000000-0000-0000-0000-000000000002',
  id
FROM permissions
WHERE module != 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Accountant: accounting, treasury, customers, suppliers, dashboard, reports (view/create/edit)
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  'r0000000-0000-0000-0000-000000000003',
  id
FROM permissions
WHERE module IN ('accounting', 'treasury', 'customers', 'suppliers', 'dashboard', 'reports')
  AND code NOT LIKE '%.delete'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- User: view only
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  'r0000000-0000-0000-0000-000000000004',
  id
FROM permissions
WHERE code LIKE '%.view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- 6. PROFILES (link auth.users to roles & company)
-- ============================================================================
-- IMPORTANT: Replace the UUIDs below with the actual auth.users UUIDs
-- from your Supabase Dashboard after creating the 3 demo users.
--
-- To find the UUIDs:
--   Go to Supabase Dashboard > Authentication > Users
--   Copy the UUID for each user
--
-- Example (replace these):
--   admin@atlasfinance.cm     -> REPLACE 'AUTH_USER_ADMIN_UUID'
--   manager@atlasfinance.com  -> REPLACE 'AUTH_USER_MANAGER_UUID'
--   comptable@atlasfinance.com -> REPLACE 'AUTH_USER_COMPTABLE_UUID'

-- Uncomment and fill in after creating users in Supabase Auth Dashboard:
/*
INSERT INTO profiles (id, email, username, first_name, last_name, role_id, company_id, is_active)
VALUES
  ('AUTH_USER_ADMIN_UUID',     'admin@atlasfinance.cm',      'admin',     'Admin',    'Atlas',    'r0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', true),
  ('AUTH_USER_MANAGER_UUID',   'manager@atlasfinance.com',   'manager',   'Manager',  'Atlas',    'r0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', true),
  ('AUTH_USER_COMPTABLE_UUID', 'comptable@atlasfinance.com', 'comptable', 'Comptable','Atlas',    'r0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', true)
ON CONFLICT (id) DO UPDATE SET
  role_id = EXCLUDED.role_id,
  company_id = EXCLUDED.company_id;
*/
