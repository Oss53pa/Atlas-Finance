-- ============================================================
-- SCRIPT DE VÉRIFICATION POST-MIGRATION 006
-- Exécuter dans Supabase SQL Editor après la migration
-- Chaque requête doit retourner le résultat attendu
-- ============================================================

-- ============================================================
-- 1. Vérifier que les nouvelles tables existent
-- ============================================================
SELECT 'TABLES' as check_type, table_name,
  CASE WHEN table_name IS NOT NULL THEN '✓ OK' ELSE '✗ MANQUANTE' END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('journaux', 'periodes_comptables', 'lettrages')
ORDER BY table_name;

-- Résultat attendu: 3 lignes avec '✓ OK'

-- ============================================================
-- 2. Vérifier les CHECK constraints sur journal_lines
-- ============================================================
SELECT 'CONSTRAINTS' as check_type, constraint_name,
  '✓ OK' as status
FROM information_schema.table_constraints
WHERE table_name = 'journal_lines'
  AND constraint_type = 'CHECK'
  AND constraint_name IN ('chk_debit_positive', 'chk_credit_positive', 'chk_not_bilateral')
ORDER BY constraint_name;

-- Résultat attendu: 3 lignes

-- ============================================================
-- 3. Vérifier les triggers
-- ============================================================
SELECT 'TRIGGERS' as check_type, trigger_name, event_object_table,
  '✓ OK' as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'trg_validate_balance',
    'trg_protect_posted',
    'trg_block_closed_period',
    'trg_entry_number',
    'trg_protect_audit'
  )
ORDER BY trigger_name;

-- Résultat attendu: 5 lignes

-- ============================================================
-- 4. Vérifier les RPC functions
-- ============================================================
SELECT 'RPC' as check_type, routine_name,
  '✓ OK' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'validate_journal_entry',
    'post_journal_entry',
    'apply_lettrage',
    'validate_entry_balance',
    'protect_posted_entries',
    'block_closed_period',
    'generate_sequential_entry_number',
    'protect_audit_logs'
  )
ORDER BY routine_name;

-- Résultat attendu: 8 lignes

-- ============================================================
-- 5. Vérifier RLS sur profiles
-- ============================================================
SELECT 'RLS' as check_type, tablename, policyname,
  '✓ OK' as status
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Résultat attendu: 3 lignes (select, insert, update)

-- ============================================================
-- 6. Vérifier PK settings
-- ============================================================
SELECT 'PK_SETTINGS' as check_type,
  string_agg(column_name, ', ' ORDER BY ordinal_position) as columns,
  CASE
    WHEN string_agg(column_name, ', ' ORDER BY ordinal_position) LIKE '%tenant_id%'
    THEN '✓ OK (inclut tenant_id)'
    ELSE '✗ ERREUR (tenant_id manquant)'
  END as status
FROM information_schema.key_column_usage
WHERE table_name = 'settings'
  AND constraint_name = 'settings_pkey';

-- Résultat attendu: "tenant_id, key" avec '✓ OK'

-- ============================================================
-- 7. Vérifier FK RESTRICT sur journal_lines
-- ============================================================
SELECT 'FK_RESTRICT' as check_type,
  rc.delete_rule,
  CASE
    WHEN rc.delete_rule = 'RESTRICT' THEN '✓ OK (RESTRICT)'
    ELSE '✗ ERREUR (devrait être RESTRICT, est ' || rc.delete_rule || ')'
  END as status
FROM information_schema.referential_constraints rc
JOIN information_schema.table_constraints tc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'journal_lines'
  AND tc.constraint_name = 'journal_lines_entry_id_fkey';

-- Résultat attendu: RESTRICT avec '✓ OK'

-- ============================================================
-- 8. Vérifier les nouvelles colonnes
-- ============================================================
SELECT 'COLUMNS' as check_type, table_name, column_name,
  '✓ OK' as status
FROM information_schema.columns
WHERE (table_name = 'journal_lines' AND column_name = 'date_echeance')
   OR (table_name = 'third_parties' AND column_name IN ('rccm', 'regime_fiscal', 'forme_juridique', 'account_code'))
   OR (table_name = 'accounts' AND column_name IN ('is_auxiliary', 'collective_account_id', 'is_system'))
ORDER BY table_name, column_name;

-- Résultat attendu: 8 lignes

-- ============================================================
-- 9. Vérifier qu'aucune donnée existante ne viole les contraintes
-- ============================================================

-- Lignes avec debit négatif
SELECT 'DATA_CHECK' as check_type, 'Debits negatifs' as test,
  COUNT(*) as violations,
  CASE WHEN COUNT(*) = 0 THEN '✓ OK' ELSE '✗ ' || COUNT(*) || ' violations' END as status
FROM journal_lines WHERE debit < 0;

-- Lignes avec credit négatif
SELECT 'DATA_CHECK' as check_type, 'Credits negatifs' as test,
  COUNT(*) as violations,
  CASE WHEN COUNT(*) = 0 THEN '✓ OK' ELSE '✗ ' || COUNT(*) || ' violations' END as status
FROM journal_lines WHERE credit < 0;

-- Lignes avec debit ET credit > 0
SELECT 'DATA_CHECK' as check_type, 'Debit+Credit simultanes' as test,
  COUNT(*) as violations,
  CASE WHEN COUNT(*) = 0 THEN '✓ OK' ELSE '✗ ' || COUNT(*) || ' violations' END as status
FROM journal_lines WHERE debit > 0 AND credit > 0;

-- Écritures déséquilibrées
SELECT 'DATA_CHECK' as check_type, 'Ecritures desequilibrees' as test,
  COUNT(*) as violations,
  CASE WHEN COUNT(*) = 0 THEN '✓ OK' ELSE '✗ ' || COUNT(*) || ' violations' END as status
FROM (
  SELECT entry_id, ABS(SUM(debit) - SUM(credit)) as ecart
  FROM journal_lines
  GROUP BY entry_id
  HAVING ABS(SUM(debit) - SUM(credit)) > 0.01
) unbalanced;

-- ============================================================
-- 10. Résumé
-- ============================================================
SELECT '═══════════════════════════════════════════' as "Migration 006 - Résumé";
SELECT 'Exécutez ce script dans Supabase SQL Editor' as "Instructions";
SELECT 'Tous les checks doivent afficher ✓ OK' as "Critère de succès";
SELECT 'Si des violations DATA_CHECK existent,' as "En cas d'erreur";
SELECT 'corrigez les données AVANT la migration' as "";
