-- ============================================================================
-- Migration 21 : RLS sur la table societes
--
-- La table `societes` n'avait pas de RLS → n'importe quel utilisateur
-- authentifié pouvait lire TOUTES les sociétés.
--
-- Correction :
--   • Les utilisateurs ne voient QUE leur propre société (id = get_user_company_id())
--   • Les requêtes non-authentifiées (ex: extensions navigateur, cache)
--     retournent 0 ligne — plus de fuite inter-tenant.
--   • Aucune colonne `tenant_id` n'est ajoutée (societes EST la table tenant).
--
-- Idempotent (DROP POLICY IF EXISTS + CREATE POLICY).
-- ============================================================================

ALTER TABLE societes ENABLE ROW LEVEL SECURITY;

-- Lecture : seule la société de l'utilisateur courant
DROP POLICY IF EXISTS societes_select_own ON societes;
CREATE POLICY societes_select_own ON societes
  FOR SELECT USING (id = get_user_company_id());

-- Écriture (UPDATE) : limitée à la propre société, admin seulement via RPC
DROP POLICY IF EXISTS societes_update_own ON societes;
CREATE POLICY societes_update_own ON societes
  FOR UPDATE USING (id = get_user_company_id());

-- Pas de politique INSERT/DELETE client → modification via service-role uniquement
