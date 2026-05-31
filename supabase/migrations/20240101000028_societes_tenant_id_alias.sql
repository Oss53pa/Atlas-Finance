-- ============================================================================
-- Migration 28 : Ajouter tenant_id sur societes = alias de id
--
-- Problème : certains chemins du code (composants compilés en cache, modules
-- non mis à jour) envoient encore societes?tenant_id=eq.<uuid> — or la table
-- societes n'a pas de colonne tenant_id → erreur 42703.
--
-- Solution : ajouter une colonne generée tenant_id qui vaut TOUJOURS id.
-- Ainsi :
--   • societes?tenant_id=eq.xxx  → fonctionne (same as id=eq.xxx)
--   • societes?id=eq.xxx         → fonctionne (nouveau chemin correct)
--   • RLS existante (id = get_user_company_id()) → toujours valide
--   • Aucun code frontend à modifier
--
-- La colonne est STORED : calculée et persistée à l'insert/update.
-- tenant_id = id est INVARIANT (les UUIDs ne changent jamais).
-- ============================================================================

-- Ajouter la colonne si elle n'existe pas encore
ALTER TABLE societes
  ADD COLUMN IF NOT EXISTS tenant_id UUID GENERATED ALWAYS AS (id) STORED;

-- Index pour que les requêtes tenant_id=eq.xxx restent rapides
CREATE INDEX IF NOT EXISTS idx_societes_tenant_id ON societes(tenant_id);
