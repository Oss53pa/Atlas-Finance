-- VERIFICATION POST-MIGRATION 006 (schema reel)
-- Executer dans Supabase SQL Editor APRES la migration

SELECT check_type, check_name, status FROM (

SELECT 1 as sort_order, 'TABLES' as check_type, t.expected as check_name,
  CASE WHEN i.table_name IS NOT NULL THEN 'OK' ELSE 'MANQUANTE' END as status
FROM (VALUES ('periodes_comptables'), ('lettrages'), ('settings')) AS t(expected)
LEFT JOIN information_schema.tables i
  ON i.table_schema = 'public' AND i.table_name = t.expected

UNION ALL

SELECT 2, 'CONSTRAINTS', c.expected,
  CASE WHEN tc.constraint_name IS NOT NULL THEN 'OK' ELSE 'MANQUANT' END
FROM (VALUES ('chk_debit_positive'), ('chk_credit_positive'), ('chk_not_bilateral')) AS c(expected)
LEFT JOIN information_schema.table_constraints tc
  ON tc.table_name = 'journal_entry_lines' AND tc.constraint_type = 'CHECK' AND tc.constraint_name = c.expected

UNION ALL

SELECT 3, 'TRIGGERS', t.expected,
  CASE WHEN tr.trigger_name IS NOT NULL THEN 'OK' ELSE 'MANQUANT' END
FROM (VALUES
  ('trg_validate_balance'),
  ('trg_protect_posted'),
  ('trg_block_closed_period'),
  ('trg_entry_number'),
  ('trg_protect_audit')
) AS t(expected)
LEFT JOIN information_schema.triggers tr
  ON tr.trigger_schema = 'public' AND tr.trigger_name = t.expected

UNION ALL

SELECT 4, 'FUNCTIONS', f.expected,
  CASE WHEN r.routine_name IS NOT NULL THEN 'OK' ELSE 'MANQUANTE' END
FROM (VALUES
  ('validate_journal_entry'),
  ('post_journal_entry'),
  ('apply_lettrage'),
  ('validate_entry_balance'),
  ('protect_posted_entries'),
  ('block_closed_period'),
  ('generate_sequential_entry_number'),
  ('protect_audit_log'),
  ('get_user_workspace_id'),
  ('get_dashboard_kpis')
) AS f(expected)
LEFT JOIN information_schema.routines r
  ON r.routine_schema = 'public' AND r.routine_name = f.expected

UNION ALL

SELECT 5, 'COLONNES', table_name || '.' || column_name, 'OK'
FROM information_schema.columns
WHERE (table_name = 'journal_entry_lines' AND column_name IN ('date_echeance', 'lettrage_code'))
   OR (table_name = 'chart_of_accounts' AND column_name IN ('collective_account_id', 'is_system', 'normal_balance'))
   OR (table_name = 'contacts' AND column_name IN ('rccm', 'regime_fiscal', 'forme_juridique', 'account_number', 'collective_account', 'payment_terms_days'))

UNION ALL

SELECT 6, 'RLS_PROFILES', COALESCE(policyname, 'AUCUNE'), 'OK'
FROM pg_policies WHERE tablename = 'profiles'

UNION ALL

SELECT 7, 'DATA_CHECK', 'Debits negatifs: ' || COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'VIOLATIONS: ' || COUNT(*) END
FROM journal_entry_lines WHERE debit < 0

UNION ALL

SELECT 7, 'DATA_CHECK', 'Credits negatifs: ' || COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'VIOLATIONS: ' || COUNT(*) END
FROM journal_entry_lines WHERE credit < 0

UNION ALL

SELECT 7, 'DATA_CHECK', 'Debit+Credit simultanes: ' || COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'VIOLATIONS: ' || COUNT(*) END
FROM journal_entry_lines WHERE debit > 0 AND credit > 0

UNION ALL

SELECT 7, 'DATA_CHECK', 'Ecritures desequilibrees: ' || COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'VIOLATIONS: ' || COUNT(*) END
FROM (
  SELECT entry_id
  FROM journal_entry_lines
  GROUP BY entry_id
  HAVING ABS(SUM(debit) - SUM(credit)) > 0.01
) sub

) AS checks
ORDER BY sort_order, check_type, check_name;
