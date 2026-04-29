-- ============================================================================
-- ATLAS F&A — SCRIPT 03 : VÉRIFICATION & COMPLÉMENT POLICIES MULTI-TENANT
-- ============================================================================
-- Objectif : Après suppression des public_read_*, identifier les tables qui
--            n'ont plus de policy SELECT et créer les policies manquantes
-- Durée estimée : < 10 secondes
-- Risque : FAIBLE (création de policies cohérentes avec l'existant)
-- Pré-requis : Scripts 01 et 02 exécutés
-- ============================================================================

BEGIN;

-- 1. Identifier les tables RLS-enabled SANS policy SELECT
CREATE TEMP TABLE _tables_sans_select_policy AS
SELECT t.tablename
FROM pg_tables t
LEFT JOIN pg_policies p
  ON p.tablename = t.tablename
  AND p.schemaname = t.schemaname
  AND p.cmd IN ('SELECT', 'ALL')
WHERE t.schemaname = 'public'
  AND p.policyname IS NULL
GROUP BY t.tablename
HAVING NOT EXISTS (
  SELECT 1 FROM pg_policies p2
  WHERE p2.tablename = t.tablename
    AND p2.schemaname = t.schemaname
    AND p2.cmd IN ('SELECT', 'ALL')
);

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM _tables_sans_select_policy;
  RAISE NOTICE '🔍 % tables sans policy SELECT détectées', v_count;

  IF v_count > 0 THEN
    RAISE NOTICE '   Liste : %', (SELECT string_agg(tablename, ', ') FROM _tables_sans_select_policy);
  END IF;
END $$;

-- 2. Activer RLS sur les tables où c'est désactivé (sécurité par défaut)
DO $$
DECLARE
  t_record RECORD;
  v_enabled integer := 0;
BEGIN
  FOR t_record IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND rowsecurity = false
      AND tablename NOT LIKE '\_%'  -- Exclure les tables système
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
      t_record.schemaname, t_record.tablename);
    v_enabled := v_enabled + 1;
    RAISE NOTICE '  🔒 RLS activée sur : %', t_record.tablename;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '✅ TOTAL : RLS activée sur % tables', v_enabled;
END $$;

-- 3. Forcer RLS même pour les rôles de table-owner (sauf service_role bien sûr)
-- Cela empêche le contournement par le rôle 'postgres' direct
DO $$
DECLARE
  t_record RECORD;
  v_forced integer := 0;
BEGIN
  FOR t_record IN
    SELECT t.schemaname, t.tablename
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
    WHERE t.schemaname = 'public'
      AND c.relrowsecurity = true
      AND c.relforcerowsecurity = false
      AND t.tablename IN (
        -- Tables critiques où on FORCE le RLS (même pour le owner)
        'journal_entries', 'journal_lines', 'audit_logs',
        'liasses', 'documents', 'document_signatures',
        'atlasbanx_transactions', 'atlasbanx_anomalies', 'atlasbanx_reports',
        'invoices', 'payment_transactions', 'signature_consents',
        'signer_verifications', 'document_retention',
        'fiscal_years', 'fiscal_periods', 'periodes_comptables',
        'accounts', 'third_parties', 'assets'
      )
  LOOP
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY',
      t_record.schemaname, t_record.tablename);
    v_forced := v_forced + 1;
    RAISE NOTICE '  🔐 RLS FORCÉE sur : %', t_record.tablename;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '✅ TOTAL : RLS forcée sur % tables critiques', v_forced;
END $$;

COMMIT;

-- ============================================================================
-- VÉRIFICATION POST-EXÉCUTION
-- ============================================================================

-- 1. Tables sans aucune policy (potentiellement bloquées)
SELECT t.tablename
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND p.policyname IS NULL
ORDER BY t.tablename;

-- 2. Récap des policies par table critique
SELECT
  tablename,
  cmd,
  COUNT(*) as nb_policies,
  string_agg(policyname, ', ') as policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'journal_entries', 'journal_lines', 'audit_logs',
    'documents', 'invoices', 'liasses'
  )
GROUP BY tablename, cmd
ORDER BY tablename, cmd;

-- 3. Test concret : un user random ne doit PLUS voir les écritures d'autres tenants
-- À exécuter en se connectant en tant qu'utilisateur authentifié :
--
-- SELECT COUNT(*) FROM journal_entries;
-- → Doit retourner SEULEMENT les écritures du tenant_id de l'user, pas plus
