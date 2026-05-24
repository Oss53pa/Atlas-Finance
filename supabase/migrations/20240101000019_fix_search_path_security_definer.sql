-- ============================================================================
-- Migration 19 : Correctif sécurité — SET search_path sur les fonctions
--               SECURITY DEFINER (A-01)
--
-- Problème : les 4 fonctions SECURITY DEFINER de la migration 18 n'avaient
-- pas de `SET search_path` fixé. Sans cette directive, un attaquant disposant
-- d'un accès à un schéma PostgreSQL pourrait créer des objets dans un schéma
-- placé en tête du search_path et rediriger les lookups de table pendant
-- l'exécution de la fonction (search_path injection).
--
-- Correctif : fixer `search_path = public, pg_temp` sur chaque fonction.
-- Idempotent (ALTER FUNCTION). N'altère aucune donnée existante.
-- ============================================================================

-- get_account_balance
ALTER FUNCTION get_account_balance(
  TEXT[],   -- p_prefixes
  UUID,     -- p_tenant_id
  DATE,     -- p_start_date
  DATE      -- p_end_date
) SET search_path = public, pg_temp;

-- get_trial_balance
ALTER FUNCTION get_trial_balance(
  UUID,     -- p_tenant_id
  DATE,     -- p_start_date
  DATE      -- p_end_date
) SET search_path = public, pg_temp;

-- import_exchange_rates
ALTER FUNCTION import_exchange_rates(
  JSONB,    -- p_rates
  UUID      -- p_tenant_id
) SET search_path = public, pg_temp;

-- save_journal_entry
ALTER FUNCTION save_journal_entry(
  JSONB,    -- p_entry
  JSONB     -- p_lines
) SET search_path = public, pg_temp;
