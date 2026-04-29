-- ============================================================================
-- ATLAS F&A — SCRIPT 02 : SUPPRESSION DES POLICIES PUBLIC_READ DANGEREUSES
-- ============================================================================
-- Objectif : Corriger P0-1 — Supprimer toutes les policies public_read_* qui
--            exposent les données de TOUS les tenants en lecture publique
-- Durée estimée : 10-30 secondes
-- Risque : MOYEN — Vérifier que les policies multi-tenant en parallèle existent
-- Pré-requis : Script 01 exécuté (backup créé)
-- ============================================================================
-- ⚠️  AVANT D'EXÉCUTER :
--    1. Vérifier que _atlas_fa_policy_backup_20260429 existe
--    2. Tester en DEV/STAGING d'abord si possible
--    3. Avoir une fenêtre de maintenance courte (5 min)
-- ============================================================================

BEGIN;

-- Vérification préalable : le backup existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = '_atlas_fa_policy_backup_20260429'
  ) THEN
    RAISE EXCEPTION '❌ ERREUR : Table de backup manquante. Exécute le script 01 d''abord.';
  END IF;
END $$;

-- Suppression de TOUTES les policies public_read_* du schéma public
DO $$
DECLARE
  policy_record RECORD;
  v_dropped integer := 0;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname LIKE 'public_read_%'
    ORDER BY tablename, policyname
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
    v_dropped := v_dropped + 1;
    RAISE NOTICE '  ✗ Supprimée : %.%', policy_record.tablename, policy_record.policyname;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '✅ TOTAL : % policies public_read_* supprimées', v_dropped;
END $$;

-- Suppression aussi des policies "allow_select_*" qui font la même chose
DO $$
DECLARE
  policy_record RECORD;
  v_dropped integer := 0;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname LIKE 'allow_select_%'
      AND qual = 'true'  -- Seulement celles qui sont publiques (qual=true)
    ORDER BY tablename, policyname
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
    v_dropped := v_dropped + 1;
    RAISE NOTICE '  ✗ Supprimée : %.%', policy_record.tablename, policy_record.policyname;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '✅ TOTAL : % policies allow_select_* (qual=true) supprimées', v_dropped;
END $$;

COMMIT;

-- ============================================================================
-- VÉRIFICATION POST-EXÉCUTION (à exécuter après le COMMIT)
-- ============================================================================

-- 1. Vérifier qu'il ne reste AUCUNE policy publique dangereuse
SELECT
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual = 'true' OR with_check = 'true')
  AND cmd = 'SELECT'
ORDER BY tablename;

-- ⚠️ Si cette requête retourne des résultats, il reste des fuites !

-- 2. Vérifier que les tables critiques ont TOUJOURS leurs policies multi-tenant
SELECT
  tablename,
  COUNT(*) as nb_policies_restantes,
  array_agg(policyname) as policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'journal_entries', 'journal_lines', 'audit_logs',
    'documents', 'invoices', 'payment_transactions',
    'atlasbanx_transactions', 'liasses', 'fiscal_years'
  )
GROUP BY tablename
ORDER BY tablename;

-- ⚠️ Chaque table doit avoir au moins 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- Sinon il y a un problème → exécuter le script 03 pour réparer

-- ============================================================================
-- ROLLBACK D'URGENCE (à utiliser SEULEMENT si quelque chose casse)
-- ============================================================================
-- Pour restaurer toutes les policies supprimées (NON RECOMMANDÉ - faille sécurité) :
--
-- DO $$
-- DECLARE
--   r RECORD;
-- BEGIN
--   FOR r IN SELECT * FROM _atlas_fa_policy_backup_20260429 LOOP
--     EXECUTE format(
--       'CREATE POLICY %I ON %I.%I FOR %s TO %s USING (%s)',
--       r.policyname, r.schemaname, r.tablename, r.cmd,
--       array_to_string(r.roles, ','), r.qual_text
--     );
--   END LOOP;
-- END $$;
