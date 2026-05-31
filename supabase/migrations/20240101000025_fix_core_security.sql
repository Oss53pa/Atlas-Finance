-- Migration: fix_core_security
-- Fixes:
--   1. get_user_company_id and auth_company_id missing SET search_path (security risk)
--   2. roles, permissions, role_permissions tables lack Row Level Security

-- ============================================================
-- PARTIE 1 — Patcher get_user_company_id et auth_company_ids
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_catalog;

CREATE OR REPLACE FUNCTION auth_company_id()
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM user_companies WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- PARTIE 2 — RLS sur roles, permissions, role_permissions
-- ============================================================

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS roles_read_authenticated ON roles;
CREATE POLICY roles_read_authenticated ON roles FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS permissions_read_authenticated ON permissions;
CREATE POLICY permissions_read_authenticated ON permissions FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS role_permissions_read_authenticated ON role_permissions;
CREATE POLICY role_permissions_read_authenticated ON role_permissions FOR SELECT USING (auth.uid() IS NOT NULL);

-- Pas de politique INSERT/UPDATE/DELETE -> seul le service-role peut modifier le RBAC
