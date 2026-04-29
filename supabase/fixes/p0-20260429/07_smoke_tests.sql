-- ============================================================================
-- ATLAS F&A — SCRIPT 07 : SMOKE TESTS POST-CORRECTION
-- ============================================================================
-- Objectif : Vérifier que tout fonctionne après les corrections P0
-- Durée estimée : < 10 secondes
-- À exécuter : APRÈS les scripts 01 à 06
-- ============================================================================

-- ⚠️ NE PAS EXÉCUTER en transaction - tests indépendants
-- Chaque test doit afficher ✅ ou ❌

-- ============================================================================
-- TEST 1 : Aucune policy publique dangereuse ne reste
-- ============================================================================
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND cmd = 'SELECT'
    AND (qual = 'true' OR with_check = 'true')
    -- Exception : tables qui DOIVENT être lisibles par tous (catalogue produits, plans, etc.)
    AND tablename NOT IN (
      'apps', 'plans', 'addons', 'subscription_plans', 'features',
      'solutions', 'products', 'best_practices', 'control_objectives',
      'industry_benchmarks', 'cgu_versions', 'site_content',
      'document_shares', 'signature_consents', 'signer_verifications',
      'invitations'
    );

  IF v_count = 0 THEN
    RAISE NOTICE '✅ TEST 1 PASSÉ : Aucune fuite RLS sur tables sensibles';
  ELSE
    RAISE WARNING '❌ TEST 1 ÉCHOUÉ : % policies publiques restantes', v_count;
    -- Afficher les fautives
    RAISE NOTICE '%', (
      SELECT string_agg(tablename || '.' || policyname, ', ')
      FROM pg_policies
      WHERE schemaname = 'public'
        AND cmd = 'SELECT'
        AND qual = 'true'
        AND tablename NOT IN (
          'apps', 'plans', 'addons', 'subscription_plans', 'features',
          'solutions', 'products', 'best_practices', 'control_objectives',
          'industry_benchmarks', 'cgu_versions', 'site_content',
          'document_shares', 'signature_consents', 'signer_verifications',
          'invitations'
        )
    );
  END IF;
END $$;

-- ============================================================================
-- TEST 2 : Tables critiques ont leurs policies multi-tenant
-- ============================================================================
DO $$
DECLARE
  v_table text;
  v_count integer;
  v_failed integer := 0;
  critical_tables text[] := ARRAY[
    'journal_entries', 'journal_lines', 'audit_logs', 'liasses',
    'documents', 'invoices', 'fiscal_years', 'fiscal_periods',
    'accounts', 'third_parties', 'assets', 'lettrages', 'rapprochements'
  ];
BEGIN
  FOREACH v_table IN ARRAY critical_tables LOOP
    SELECT COUNT(*) INTO v_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = v_table
      AND cmd IN ('SELECT', 'ALL');

    IF v_count = 0 THEN
      RAISE WARNING '  ❌ Table % sans aucune policy SELECT', v_table;
      v_failed := v_failed + 1;
    END IF;
  END LOOP;

  IF v_failed = 0 THEN
    RAISE NOTICE '✅ TEST 2 PASSÉ : Toutes les tables critiques ont des policies';
  ELSE
    RAISE WARNING '❌ TEST 2 ÉCHOUÉ : % tables critiques sans policy', v_failed;
  END IF;
END $$;

-- ============================================================================
-- TEST 3 : Audit logs vraiment immuables
-- ============================================================================
DO $$
DECLARE
  v_has_deny_update boolean;
  v_has_deny_delete boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'audit_logs'
      AND policyname = 'audit_logs_deny_update'
  ) INTO v_has_deny_update;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'audit_logs'
      AND policyname = 'audit_logs_deny_delete'
  ) INTO v_has_deny_delete;

  IF v_has_deny_update AND v_has_deny_delete THEN
    RAISE NOTICE '✅ TEST 3 PASSÉ : audit_logs immuable (deny_update + deny_delete)';
  ELSE
    RAISE WARNING '❌ TEST 3 ÉCHOUÉ : deny_update=% deny_delete=%', v_has_deny_update, v_has_deny_delete;
  END IF;

  -- Vérifier qu'il N'Y A PAS de policy UPDATE permissive contradictoire
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'audit_logs'
      AND cmd = 'UPDATE'
      AND policyname NOT LIKE '%_deny_%'
  ) THEN
    RAISE WARNING '❌ TEST 3 BIS ÉCHOUÉ : Policy UPDATE permissive subsiste sur audit_logs';
  END IF;
END $$;

-- ============================================================================
-- TEST 4 : Triggers comptables critiques actifs
-- ============================================================================
DO $$
DECLARE
  v_triggers text[] := ARRAY[
    'trg_entry_number',
    'trg_check_entry_balanced',
    'trg_block_closed_period',
    'trg_protect_posted',
    'trg_validate_balance'
  ];
  v_trig text;
  v_failed integer := 0;
BEGIN
  FOREACH v_trig IN ARRAY v_triggers LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = v_trig
        AND NOT tgisinternal
    ) THEN
      RAISE WARNING '  ❌ Trigger manquant : %', v_trig;
      v_failed := v_failed + 1;
    END IF;
  END LOOP;

  IF v_failed = 0 THEN
    RAISE NOTICE '✅ TEST 4 PASSÉ : Tous les triggers comptables critiques actifs';
  ELSE
    RAISE WARNING '❌ TEST 4 ÉCHOUÉ : % triggers manquants', v_failed;
  END IF;
END $$;

-- ============================================================================
-- TEST 5 : Vues sécurisées
-- ============================================================================
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'v'
    AND n.nspname = 'public'
    AND (c.reloptions IS NULL OR NOT 'security_invoker=true' = ANY(c.reloptions));

  IF v_count = 0 THEN
    RAISE NOTICE '✅ TEST 5 PASSÉ : Toutes les vues ont security_invoker=true';
  ELSE
    RAISE WARNING '❌ TEST 5 ÉCHOUÉ : % vues sans security_invoker', v_count;
  END IF;
END $$;

-- ============================================================================
-- RÉSUMÉ FINAL
-- ============================================================================
SELECT '=== RÉSUMÉ AUDIT POST-CORRECTION ATLAS F&A ===' as title;

SELECT
  'Total tables RLS-enabled' as metric,
  COUNT(*)::text as value
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true
UNION ALL
SELECT
  'Total policies actives',
  COUNT(*)::text
FROM pg_policies
WHERE schemaname = 'public'
UNION ALL
SELECT
  'Tables sans aucune policy',
  COUNT(*)::text
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
WHERE t.schemaname = 'public' AND p.policyname IS NULL
UNION ALL
SELECT
  'Triggers comptables actifs',
  COUNT(*)::text
FROM pg_trigger
WHERE NOT tgisinternal
  AND tgname IN ('trg_entry_number','trg_check_entry_balanced','trg_block_closed_period','trg_protect_posted','trg_validate_balance')
UNION ALL
SELECT
  'Vues sécurisées (security_invoker)',
  COUNT(*)::text
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'v' AND n.nspname = 'public'
  AND 'security_invoker=true' = ANY(c.reloptions);
