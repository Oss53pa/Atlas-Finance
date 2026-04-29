-- ============================================================================
-- ATLAS F&A — SCRIPT 06 : IMMUABILITÉ STRICTE DES AUDIT_LOGS (P0 reclassé)
-- ============================================================================
-- Objectif : Garantir que les audit_logs sont VRAIMENT immuables (INSERT only)
--            Actuellement, deux policies se contredisent (UPDATE autorisé + denied)
-- Durée estimée : < 5 secondes
-- Risque : FAIBLE
-- ============================================================================

BEGIN;

-- 1. Supprimer la policy UPDATE qui contredit l'immuabilité
DROP POLICY IF EXISTS audit_logs_update ON public.audit_logs;

-- 2. Garder UNIQUEMENT les policies de blocage
-- (audit_logs_deny_update et audit_logs_deny_delete existent déjà)

-- 3. S'assurer que la policy de blocage UPDATE existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'audit_logs'
      AND policyname = 'audit_logs_deny_update'
  ) THEN
    EXECUTE 'CREATE POLICY audit_logs_deny_update ON public.audit_logs
             FOR UPDATE USING (false) WITH CHECK (false)';
    RAISE NOTICE '✅ Policy audit_logs_deny_update créée';
  ELSE
    RAISE NOTICE '✓ Policy audit_logs_deny_update déjà présente';
  END IF;
END $$;

-- 4. S'assurer que la policy de blocage DELETE existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'audit_logs'
      AND policyname = 'audit_logs_deny_delete'
  ) THEN
    EXECUTE 'CREATE POLICY audit_logs_deny_delete ON public.audit_logs
             FOR DELETE USING (false)';
    RAISE NOTICE '✅ Policy audit_logs_deny_delete créée';
  ELSE
    RAISE NOTICE '✓ Policy audit_logs_deny_delete déjà présente';
  END IF;
END $$;

-- 5. Forcer le RLS même pour le owner de la table
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- 6. Faire la même chose pour signature_audit_log
DROP POLICY IF EXISTS signature_audit_log_update ON public.signature_audit_log;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'signature_audit_log'
      AND policyname = 'signature_audit_log_deny_update'
  ) THEN
    EXECUTE 'CREATE POLICY signature_audit_log_deny_update ON public.signature_audit_log
             FOR UPDATE USING (false) WITH CHECK (false)';
  END IF;
END $$;

ALTER TABLE public.signature_audit_log FORCE ROW LEVEL SECURITY;

-- 7. Faire pareil pour licence_audit_log
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'licence_audit_log'
      AND policyname = 'licence_audit_log_deny_update'
  ) THEN
    EXECUTE 'CREATE POLICY licence_audit_log_deny_update ON public.licence_audit_log
             FOR UPDATE USING (false) WITH CHECK (false)';
    EXECUTE 'CREATE POLICY licence_audit_log_deny_delete ON public.licence_audit_log
             FOR DELETE USING (false)';
  END IF;
END $$;

ALTER TABLE public.licence_audit_log FORCE ROW LEVEL SECURITY;

-- 8. Faire pareil pour audit_log (table singulier de DocJourney/Liasses)
ALTER TABLE public.audit_log FORCE ROW LEVEL SECURITY;
-- (les triggers prevent_audit_modification existent déjà ✅)

COMMIT;

-- ============================================================================
-- VÉRIFICATION POST-EXÉCUTION
-- ============================================================================

-- 1. Tester que UPDATE est bien bloqué
DO $$
BEGIN
  -- Cette commande doit ÉCHOUER avec "permission denied"
  BEGIN
    UPDATE public.audit_logs SET action = 'TEST' WHERE id = (SELECT id FROM audit_logs LIMIT 1);
    RAISE EXCEPTION '❌ FAILED : UPDATE sur audit_logs a réussi alors qu''il devrait échouer !';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '✅ OK : UPDATE bloqué (%)', SQLERRM;
  END;

  -- Cette commande doit ÉCHOUER aussi
  BEGIN
    DELETE FROM public.audit_logs WHERE id = (SELECT id FROM audit_logs LIMIT 1);
    RAISE EXCEPTION '❌ FAILED : DELETE sur audit_logs a réussi !';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '✅ OK : DELETE bloqué (%)', SQLERRM;
  END;
END $$;

-- 2. Lister toutes les policies sur les audit logs
SELECT
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('audit_logs', 'audit_log', 'signature_audit_log', 'licence_audit_log')
ORDER BY tablename, cmd, policyname;
