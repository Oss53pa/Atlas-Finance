-- ============================================================================
-- Migration 22 : Correctif injection regex dans get_account_balance
--
-- VULNÉRABILITÉ : la variable v_prefix_pattern était construite par
-- concaténation directe des éléments p_prefixes sans validation :
--   v_prefix_pattern := '^(' || array_to_string(p_prefixes, '|') || ')';
-- Un utilisateur authentifié pouvait injecter un regex PostgreSQL arbitraire
-- (ex: catastrophic backtracking, lecture de données hors-périmètre via
-- sous-requêtes dans lookahead POSIX étendu, etc.).
--
-- CORRECTIF : validation stricte — chaque préfixe doit être composé
-- UNIQUEMENT de caractères alphanumériques ASCII (0-9, A-Z, a-z).
-- Tout préfixe non conforme lève EXCEPTION avant toute utilisation.
--
-- NOTE DÉPLOIEMENT : idempotent (CREATE OR REPLACE). N'altère aucune donnée.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_account_balance(
  p_prefixes TEXT[],
  p_tenant_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_debit NUMERIC(18,2);
  v_credit NUMERIC(18,2);
  v_count BIGINT;
  v_prefix_pattern TEXT;
  v_tenant UUID;
  elem TEXT;
BEGIN
  -- SÉCURITÉ : on n'utilise JAMAIS p_tenant_id (falsifiable côté client).
  v_tenant := get_user_company_id();
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Accès refusé : aucun tenant associé à l''utilisateur courant.';
  END IF;
  IF p_tenant_id IS NOT NULL AND p_tenant_id <> v_tenant THEN
    RAISE EXCEPTION 'Accès refusé : tenant demandé (%) différent du tenant de l''utilisateur.', p_tenant_id;
  END IF;

  -- CORRECTIF INJECTION REGEX : valider chaque préfixe avant usage.
  -- Seuls les caractères alphanumériques ASCII sont autorisés (codes SYSCOHADA).
  FOREACH elem IN ARRAY p_prefixes
  LOOP
    IF elem IS NULL OR NOT (elem ~ '^[A-Za-z0-9]+$') THEN
      RAISE EXCEPTION 'Invalid account prefix: %', elem;
    END IF;
  END LOOP;

  v_prefix_pattern := '^(' || array_to_string(p_prefixes, '|') || ')';

  SELECT
    COALESCE(SUM(jl.debit), 0),
    COALESCE(SUM(jl.credit), 0),
    COUNT(*)
  INTO v_debit, v_credit, v_count
  FROM journal_lines jl
  JOIN journal_entries je ON je.id = jl.entry_id
  WHERE je.tenant_id = v_tenant
    AND je.status IN ('validated', 'posted')
    AND jl.account_code ~ v_prefix_pattern
    AND (p_start_date IS NULL OR je.date >= p_start_date)
    AND (p_end_date IS NULL OR je.date <= p_end_date);

  RETURN json_build_object(
    'debit', v_debit,
    'credit', v_credit,
    'solde', v_debit - v_credit,
    'lignes', v_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
   SET search_path = public, pg_catalog;
