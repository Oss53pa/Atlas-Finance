-- ════════════════════════════════════════════════════════════════════
-- MIGRATION 20 — Appartenance authoritative + Roster invitations
--
-- Adapté du template multi-tenant Supabase (user_orgs / org_members)
-- pour WiseBook / Atlas Finance & Accounting.
--
-- Modèle :
--   • user_companies  = appartenance AUTHORITATIVE (user_id ↔ company + rôle).
--                       C'est ce que lit auth_company_ids(). Écrite UNIQUEMENT
--                       par service-role (Edge Function) ou les RPC SECURITY
--                       DEFINER ci-dessous → pas d'auto-escalade côté client.
--   • company_members = roster d'affichage indexé par email. Permet de lister
--                       un invité AVANT qu'il ait accepté (user_id nullable).
--
-- Compatibilité :
--   • get_user_company_id() reste inchangée (toutes les RLS existantes continuent
--     de fonctionner — 25 tables touchent cette fonction).
--   • auth_company_ids(min_role) est la version enrichie pour les nouvelles
--     tables et futures policies role-aware.
-- ════════════════════════════════════════════════════════════════════

-- ── 1) user_companies — appartenance AUTHORITATIVE ───────────────────────────
--    Source de vérité pour les droits d'accès.
--    Pas de policy INSERT/UPDATE/DELETE client → anti-escalade.
--    Seuls la service-role (Edge Function) et les RPC DEFINER écrivent ici.
CREATE TABLE IF NOT EXISTS user_companies (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES societes(id)   ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'Lecteur'
               CHECK (role IN ('Administrateur','Manager','Comptable','Lecteur')),
  added_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, company_id)
);

-- ── 2) company_members — roster d'affichage (clé email, pre-acceptance) ──────
--    Permet d'afficher les invités AVANT qu'ils aient créé leur mot de passe.
--    user_id nullable = invité en attente.
CREATE TABLE IF NOT EXISTS company_members (
  id            BIGSERIAL PRIMARY KEY,
  company_id    UUID    NOT NULL REFERENCES societes(id) ON DELETE CASCADE,
  email         TEXT    NOT NULL,
  first_name    TEXT,
  last_name     TEXT,
  role          TEXT    NOT NULL DEFAULT 'Lecteur'
                  CHECK (role IN ('Administrateur','Manager','Comptable','Lecteur')),
  departement   TEXT,
  telephone     TEXT,
  user_id       UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  active        BOOLEAN NOT NULL DEFAULT true,
  invited_at    TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ,
  UNIQUE (company_id, email)
);

-- ── 3) Helper RLS : auth_company_ids(min_role) ───────────────────────────────
--    SECURITY DEFINER → lit user_companies en contournant la RLS propre à cette
--    table → AUCUNE récursion quand les policies des tables métier l'appellent.
--
--    Hiérarchie des rôles WiseBook :
--      Administrateur > Manager > Comptable > Lecteur
--
--    Exemples d'usage dans une policy :
--      company_id IN (SELECT auth_company_ids())              -- tout membre
--      company_id IN (SELECT auth_company_ids('Comptable'))   -- Comptable+
--      company_id IN (SELECT auth_company_ids('Administrateur')) -- admin only
CREATE OR REPLACE FUNCTION auth_company_ids(min_role TEXT DEFAULT NULL)
RETURNS SETOF UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM user_companies
  WHERE user_id = auth.uid()
    AND (
      min_role IS NULL
      OR (min_role = 'Lecteur')
      OR (min_role = 'Comptable'      AND role IN ('Administrateur','Manager','Comptable'))
      OR (min_role = 'Manager'        AND role IN ('Administrateur','Manager'))
      OR (min_role = 'Administrateur' AND role = 'Administrateur')
    );
$$;

-- Surcharge sans paramètre (raccourci) — retourne le premier company_id
-- Utilisable comme remplacement progressif de get_user_company_id()
CREATE OR REPLACE FUNCTION auth_company_id()
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM user_companies WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ── 4) RPC bootstrap : activer la membership d'une société (atomique) ─────────
--    Évite l'auto-escalade : le client ne peut PAS écrire user_companies
--    directement, mais peut s'y ajouter comme Administrateur via cette RPC
--    contrôlée (typiquement appelée lors de l'onboarding).
CREATE OR REPLACE FUNCTION activate_company_membership(p_company_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO user_companies(user_id, company_id, role)
  VALUES (auth.uid(), p_company_id, 'Administrateur')
  ON CONFLICT (user_id, company_id) DO NOTHING;
END;
$$;

-- ── 5) RLS user_companies ─────────────────────────────────────────────────────
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_companies_select_own ON user_companies;
CREATE POLICY user_companies_select_own ON user_companies
  FOR SELECT USING (user_id = auth.uid());
-- Pas de policy INSERT/UPDATE/DELETE → seuls service-role + RPC DEFINER écrivent

-- ── 6) RLS company_members ────────────────────────────────────────────────────
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_members_select ON company_members;
CREATE POLICY company_members_select ON company_members
  FOR SELECT USING (company_id IN (SELECT auth_company_ids()));

DROP POLICY IF EXISTS company_members_admin_all ON company_members;
CREATE POLICY company_members_admin_all ON company_members
  FOR ALL
  USING     (company_id IN (SELECT auth_company_ids('Administrateur')))
  WITH CHECK(company_id IN (SELECT auth_company_ids('Administrateur')));

-- ── 7) Data migration : peupler depuis les profiles existants ─────────────────
--    Synchronise les utilisateurs déjà présents dans profiles vers les nouvelles
--    tables (idempotent via ON CONFLICT DO NOTHING).

-- user_companies depuis profiles
-- profiles.role contient le libellé WiseBook directement ('Administrateur', 'manager', etc.)
INSERT INTO user_companies (user_id, company_id, role)
SELECT
  p.id AS user_id,
  p.company_id,
  CASE lower(p.role)
    WHEN 'administrateur' THEN 'Administrateur'
    WHEN 'admin'          THEN 'Administrateur'
    WHEN 'manager'        THEN 'Manager'
    WHEN 'comptable'      THEN 'Comptable'
    WHEN 'accountant'     THEN 'Comptable'
    ELSE 'Lecteur'
  END AS role
FROM profiles p
WHERE p.company_id IS NOT NULL
  AND p.id IS NOT NULL
ON CONFLICT (user_id, company_id) DO NOTHING;

-- company_members depuis profiles (roster)
INSERT INTO company_members (company_id, email, first_name, last_name, role, user_id, active)
SELECT
  p.company_id,
  p.email,
  p.first_name,
  p.last_name,
  CASE lower(p.role)
    WHEN 'administrateur' THEN 'Administrateur'
    WHEN 'admin'          THEN 'Administrateur'
    WHEN 'manager'        THEN 'Manager'
    WHEN 'comptable'      THEN 'Comptable'
    WHEN 'accountant'     THEN 'Comptable'
    ELSE 'Lecteur'
  END AS role,
  p.id AS user_id,
  COALESCE(p.is_active, true) AS active
FROM profiles p
WHERE p.company_id IS NOT NULL
  AND p.email IS NOT NULL
ON CONFLICT (company_id, email) DO NOTHING;

-- ── 8) Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_companies_user    ON user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_company ON user_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_company_members_company ON company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_company_members_email   ON company_members(email);
CREATE INDEX IF NOT EXISTS idx_company_members_user    ON company_members(user_id);

-- ════════════════════════════════════════════════════════════════════
-- PATRON RLS ROLE-AWARE À UTILISER SUR LES NOUVELLES TABLES MÉTIER
-- (les 25 tables existantes gardent get_user_company_id() pour compatibilité)
--
-- Pour toute NOUVELLE table métier avec org_id :
--   ALTER TABLE ma_table ENABLE ROW LEVEL SECURITY;
--   -- Lecture = tout membre
--   CREATE POLICY mt_select ON ma_table FOR SELECT
--     USING (company_id IN (SELECT auth_company_ids()));
--   -- Écriture = Comptable et plus
--   CREATE POLICY mt_insert ON ma_table FOR INSERT
--     WITH CHECK (company_id IN (SELECT auth_company_ids('Comptable')));
--   CREATE POLICY mt_update ON ma_table FOR UPDATE
--     USING (company_id IN (SELECT auth_company_ids('Comptable')));
--   -- Suppression = Manager et plus
--   CREATE POLICY mt_delete ON ma_table FOR DELETE
--     USING (company_id IN (SELECT auth_company_ids('Manager')));
-- ════════════════════════════════════════════════════════════════════
