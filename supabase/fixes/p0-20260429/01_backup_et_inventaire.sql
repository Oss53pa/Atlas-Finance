-- ============================================================================
-- ATLAS F&A — SCRIPT 01 : BACKUP & INVENTAIRE DES POLICIES PUBLIC_READ
-- ============================================================================
-- Objectif : Créer une table de backup pour pouvoir restaurer en cas d'erreur
-- Durée estimée : < 5 secondes
-- Risque : AUCUN (lecture seule + création table backup)
-- ============================================================================

BEGIN;

-- 1. Créer une table de backup avec timestamp
CREATE TABLE IF NOT EXISTS _atlas_fa_policy_backup_20260429 AS
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual::text as qual_text,
  with_check::text as with_check_text,
  NOW() as backed_up_at
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE 'public_read_%';

-- 2. Compter les policies à supprimer
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM _atlas_fa_policy_backup_20260429;

  RAISE NOTICE '✅ Backup créé : % policies public_read_* sauvegardées', v_count;
  RAISE NOTICE '⚠️  ATTENTION : Ces policies seront SUPPRIMÉES dans le script 02';
  RAISE NOTICE '📋 Pour voir la liste : SELECT tablename FROM _atlas_fa_policy_backup_20260429 ORDER BY tablename;';
END $$;

COMMIT;

-- ============================================================================
-- VÉRIFICATION POST-EXÉCUTION
-- ============================================================================
-- Exécuter cette requête pour voir les policies qui seront supprimées :
SELECT
  tablename,
  policyname,
  cmd
FROM _atlas_fa_policy_backup_20260429
ORDER BY tablename, policyname;

-- ============================================================================
-- ROLLBACK D'URGENCE (uniquement si tu veux annuler avant le script 02)
-- ============================================================================
-- DROP TABLE _atlas_fa_policy_backup_20260429;
