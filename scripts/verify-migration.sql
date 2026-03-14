-- ============================================================
-- VERIFICATION POST-MIGRATION 006
-- Executer dans Supabase SQL Editor APRES la migration
-- ============================================================

SELECT check_type, check_name, status FROM (

-- 1. Tables
SELECT 1 as sort_order, 'TABLES' as check_type, t.expected as check_name,
  CASE WHEN i.table_name IS NOT NULL THEN 'OK' ELSE 'MANQUANTE' END as status
FROM (VALUES ('journaux'), ('periodes_comptables'), ('lettrages')) AS t(expected)
LEFT JOIN information_schema.tables i
  ON i.table_schema = 'public' AND i.table_name = t.expected

UNION ALL

-- 2. CHECK constraints
SELECT 2, 'CONSTRAINTS', c.expected,
  CASE WHEN tc.constraint_name IS NOT NULL THEN 'OK' ELSE 'MANQUANT' END
FROM (VALUES ('chk_debit_positive'), ('chk_credit_positive'), ('chk_not_bilateral')) AS c(expected)
LEFT JOIN information_schema.table_constraints tc
  ON tc.table_name = 'journal_lines' AND tc.constraint_type = 'CHECK' AND tc.constraint_name = c.expected

UNION ALL

-- 3. Triggers
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

-- 4. Functions
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
  ('protect_audit_logs')
) AS f(expected)
LEFT JOIN information_schema.routines r
  ON r.routine_schema = 'public' AND r.routine_name = f.expected

UNION ALL

-- 5. RLS profiles
SELECT 5, 'RLS_PROFILES', COALESCE(policyname, 'AUCUNE POLICY'),
  CASE WHEN policyname IS NOT NULL THEN 'OK' ELSE 'MANQUANT' END
FROM pg_policies
WHERE tablename = 'profiles'

UNION ALL

-- 6. PK settings
SELECT 6, 'PK_SETTINGS',
  string_agg(column_name, ', ' ORDER BY ordinal_position),
  CASE
    WHEN string_agg(column_name, ', ' ORDER BY ordinal_position) LIKE '%tenant_id%'
    THEN 'OK - inclut tenant_id'
    ELSE 'ERREUR - tenant_id manquant'
  END
FROM information_schema.key_column_usage
WHERE table_name = 'settings' AND constraint_name = 'settings_pkey'

UNION ALL

-- 7. FK RESTRICT
SELECT 7, 'FK_JOURNAL_LINES', rc.delete_rule,
  CASE WHEN rc.delete_rule = 'RESTRICT' THEN 'OK' ELSE 'ERREUR - est ' || rc.delete_rule END
FROM information_schema.referential_constraints rc
JOIN information_schema.table_constraints tc ON rc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'journal_lines' AND tc.constraint_name = 'journal_lines_entry_id_fkey'

UNION ALL

-- 8. Nouvelles colonnes
SELECT 8, 'COLONNES', table_name || '.' || column_name, 'OK'
FROM information_schema.columns
WHERE (table_name = 'journal_lines' AND column_name = 'date_echeance')
   OR (table_name = 'third_parties' AND column_name IN ('rccm', 'regime_fiscal', 'forme_juridique', 'account_code'))
   OR (table_name = 'accounts' AND column_name IN ('is_auxiliary', 'collective_account_id', 'is_system'))

UNION ALL

-- 9. Data checks
SELECT 9, 'DATA_CHECK', 'Debits negatifs: ' || COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'VIOLATIONS: ' || COUNT(*) END
FROM journal_lines WHERE debit < 0

UNION ALL

SELECT 9, 'DATA_CHECK', 'Credits negatifs: ' || COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'VIOLATIONS: ' || COUNT(*) END
FROM journal_lines WHERE credit < 0

UNION ALL

SELECT 9, 'DATA_CHECK', 'Debit+Credit simultanes: ' || COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'VIOLATIONS: ' || COUNT(*) END
FROM journal_lines WHERE debit > 0 AND credit > 0

UNION ALL

SELECT 9, 'DATA_CHECK', 'Ecritures desequilibrees: ' || COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'VIOLATIONS: ' || COUNT(*) END
FROM (
  SELECT entry_id
  FROM journal_lines
  GROUP BY entry_id
  HAVING ABS(SUM(debit) - SUM(credit)) > 0.01
) sub

) AS checks
ORDER BY sort_order, check_type, check_name;
