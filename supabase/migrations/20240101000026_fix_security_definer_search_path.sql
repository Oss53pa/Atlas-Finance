-- ============================================================================
-- Migration 26 : Correctif sécurité — SET search_path sur toutes les fonctions
--               SECURITY DEFINER des migrations 5-12 et 17
--
-- Version défensive : chaque ALTER FUNCTION est enveloppé dans un bloc
-- BEGIN/EXCEPTION pour ignorer silencieusement les fonctions absentes.
-- Idempotent. N'altère aucune donnée.
-- ============================================================================

DO $search_path_fix$
DECLARE
  _sql TEXT;
  _functions TEXT[][] := ARRAY[
    -- Migration 5 — RPC functions
    ['get_trial_balance(UUID)',            'SET search_path = public, pg_catalog'],
    ['get_general_ledger(TEXT, DATE, DATE)','SET search_path = public, pg_catalog'],
    ['get_dashboard_kpis(UUID)',           'SET search_path = public, pg_catalog'],
    -- Migration 6 — integrity triggers
    ['validate_journal_entry(UUID)',       'SET search_path = public, pg_catalog'],
    ['post_journal_entry(UUID)',           'SET search_path = public, pg_catalog'],
    ['apply_lettrage(UUID, UUID[], TEXT)', 'SET search_path = public, pg_catalog'],
    -- Migration 7 — period/audit/cession + financial RPCs
    ['execute_annual_closure(UUID, UUID)', 'SET search_path = public, pg_catalog'],
    ['generate_bilan(UUID, UUID)',         'SET search_path = public, pg_catalog'],
    ['generate_cdr(UUID, UUID)',           'SET search_path = public, pg_catalog'],
    -- Migration 8 — monthly closure
    ['execute_monthly_closure(UUID, UUID)',          'SET search_path = public, pg_catalog'],
    ['execute_full_annual_closure(UUID, UUID, BOOLEAN)', 'SET search_path = public, pg_catalog'],
    -- Migration 10 — SaaS onboarding
    ['get_user_organization_id()',         'SET search_path = public, pg_catalog'],
    ['handle_new_user()',                  'SET search_path = public, pg_catalog'],
    -- Migration 11 — Atlas Studio platform
    ['get_my_tenant_id()',                 'SET search_path = public, pg_catalog'],
    ['handle_new_user_v2()',               'SET search_path = public, pg_catalog'],
    -- Migration 17 — soft delete + encryption
    ['encrypt_bank_account(TEXT, UUID)',   'SET search_path = public, pg_catalog'],
    ['decrypt_bank_account(BYTEA, BYTEA, UUID)', 'SET search_path = public, pg_catalog']
  ];
  _item TEXT[];
BEGIN
  FOREACH _item SLICE 1 IN ARRAY _functions LOOP
    _sql := 'ALTER FUNCTION ' || _item[1] || ' ' || _item[2];
    BEGIN
      EXECUTE _sql;
    EXCEPTION
      WHEN undefined_function THEN
        -- Function does not exist in this deployment — skip silently
        NULL;
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not patch function %: %', _item[1], SQLERRM;
    END;
  END LOOP;
END;
$search_path_fix$;
