-- ============================================================================
-- Migration 26 : Correctif sécurité — SET search_path sur toutes les fonctions
--               SECURITY DEFINER des migrations 5-12 et 17
--
-- Problème : sans `SET search_path`, un attaquant ayant accès à un schéma
-- PostgreSQL peut créer des objets dans un schéma placé en tête du
-- search_path et rediriger les résolutions de table/fonction pendant
-- l'exécution SECURITY DEFINER (search_path injection / CVE class).
--
-- Correctif : ALTER FUNCTION ... SET search_path = public, pg_catalog
-- sur chaque fonction concernée. Idempotent. N'altère aucune donnée.
--
-- Fonctions déjà corrigées (exclues ici) :
--   - get_account_balance, get_trial_balance(UUID, DATE, DATE),
--     import_exchange_rates, save_journal_entry  → migration 19
--   - get_user_company_id, auth_company_id       → migration 25
-- ============================================================================

-- ============================================================================
-- Migration 5 — RPC functions
-- ============================================================================

-- get_trial_balance(p_fiscal_year_id UUID)
ALTER FUNCTION get_trial_balance(UUID)
  SET search_path = public, pg_catalog;

-- get_general_ledger(p_account_code TEXT, p_start_date DATE, p_end_date DATE)
ALTER FUNCTION get_general_ledger(TEXT, DATE, DATE)
  SET search_path = public, pg_catalog;

-- get_dashboard_kpis(p_fiscal_year_id UUID)
ALTER FUNCTION get_dashboard_kpis(UUID)
  SET search_path = public, pg_catalog;

-- ============================================================================
-- Migration 6 (integrity_triggers) — RPC functions
-- ============================================================================

-- validate_journal_entry(p_entry_id UUID)
ALTER FUNCTION validate_journal_entry(UUID)
  SET search_path = public, pg_catalog;

-- post_journal_entry(p_entry_id UUID)
ALTER FUNCTION post_journal_entry(UUID)
  SET search_path = public, pg_catalog;

-- apply_lettrage(p_tenant_id UUID, p_line_ids UUID[], p_lettrage_code TEXT)
ALTER FUNCTION apply_lettrage(UUID, UUID[], TEXT)
  SET search_path = public, pg_catalog;

-- ============================================================================
-- Migration 7 — Period / audit / cession triggers + financial statement RPCs
-- ============================================================================

-- execute_annual_closure(p_fiscal_year_id UUID, p_tenant_id UUID)
ALTER FUNCTION execute_annual_closure(UUID, UUID)
  SET search_path = public, pg_catalog;

-- generate_bilan(p_tenant_id UUID, p_fiscal_year_id UUID)
ALTER FUNCTION generate_bilan(UUID, UUID)
  SET search_path = public, pg_catalog;

-- generate_cdr(p_tenant_id UUID, p_fiscal_year_id UUID)
ALTER FUNCTION generate_cdr(UUID, UUID)
  SET search_path = public, pg_catalog;

-- ============================================================================
-- Migration 8 — Monthly closure and carry-forward RPCs
-- ============================================================================

-- execute_monthly_closure(p_tenant_id UUID, p_periode_id UUID)
ALTER FUNCTION execute_monthly_closure(UUID, UUID)
  SET search_path = public, pg_catalog;

-- execute_full_annual_closure(p_fiscal_year_id UUID, p_tenant_id UUID, p_create_next_year BOOLEAN)
ALTER FUNCTION execute_full_annual_closure(UUID, UUID, BOOLEAN)
  SET search_path = public, pg_catalog;

-- ============================================================================
-- Migration 10 — SaaS onboarding helper functions
-- ============================================================================

-- get_user_organization_id()
ALTER FUNCTION get_user_organization_id()
  SET search_path = public, pg_catalog;

-- handle_new_user()  [trigger function]
ALTER FUNCTION handle_new_user()
  SET search_path = public, pg_catalog;

-- ============================================================================
-- Migration 11 — Atlas Studio platform trigger functions
-- ============================================================================

-- get_my_tenant_id()
ALTER FUNCTION get_my_tenant_id()
  SET search_path = public, pg_catalog;

-- handle_new_user_v2()  [trigger function]
ALTER FUNCTION handle_new_user_v2()
  SET search_path = public, pg_catalog;

-- ============================================================================
-- Migration 17 — Soft delete + bank account encryption functions
-- ============================================================================

-- encrypt_bank_account(plain_iban TEXT, key_id UUID)
ALTER FUNCTION encrypt_bank_account(TEXT, UUID)
  SET search_path = public, pg_catalog;

-- decrypt_bank_account(cipher BYTEA, nonce BYTEA, key_id UUID)
ALTER FUNCTION decrypt_bank_account(BYTEA, BYTEA, UUID)
  SET search_path = public, pg_catalog;
