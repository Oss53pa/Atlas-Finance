-- ============================================================================
-- ATLAS F&A — SCRIPT 09 : HOTFIXES POST-DEPLOIEMENT
-- ============================================================================
-- Objectif : 2 corrections post-execution decouvertes pendant les tests :
--
--   1. atlas_balance_exports avait une policy permissive `balance_exports_read`
--      (qual=true) sur une table avec tenant_id = vrai leak cross-tenant.
--      => DROP la policy permissive + CREATE 4 policies tenant CRUD.
--      Idem pour balance_exports_insert (redondant avec le pattern tenant).
--
--   2. Apres le retrait des public_read_*, l'app frontend remontait des 401
--      sur POST /rest/v1/activity_log (et autres tables similaires) car le
--      GRANT INSERT pour le role `anon` avait disparu, alors que la policy
--      RLS l'autorisait (qual=true). Symptome cote utilisateur :
--      "Erreur de validation du token" sur le SSO Atlas Studio -> Atlas Finance.
--      => Restaurer GRANT INSERT TO anon sur les tables de log/abonnement public.
--
-- Duree   : < 5 secondes
-- Risque  : FAIBLE
-- Pre-requis : scripts 01 a 08 executes
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. atlas_balance_exports : remplacer les policies permissives par tenant CRUD
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS balance_exports_read ON public.atlas_balance_exports;
DROP POLICY IF EXISTS balance_exports_insert ON public.atlas_balance_exports;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE tablename='atlas_balance_exports'
                   AND policyname='atlas_balance_exports_tenant_select') THEN
    CREATE POLICY atlas_balance_exports_tenant_select ON public.atlas_balance_exports
      FOR SELECT USING (tenant_id = get_user_company_id());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE tablename='atlas_balance_exports'
                   AND policyname='atlas_balance_exports_tenant_insert') THEN
    CREATE POLICY atlas_balance_exports_tenant_insert ON public.atlas_balance_exports
      FOR INSERT WITH CHECK (tenant_id = get_user_company_id());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE tablename='atlas_balance_exports'
                   AND policyname='atlas_balance_exports_tenant_update') THEN
    CREATE POLICY atlas_balance_exports_tenant_update ON public.atlas_balance_exports
      FOR UPDATE USING (tenant_id = get_user_company_id())
      WITH CHECK (tenant_id = get_user_company_id());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE tablename='atlas_balance_exports'
                   AND policyname='atlas_balance_exports_tenant_delete') THEN
    CREATE POLICY atlas_balance_exports_tenant_delete ON public.atlas_balance_exports
      FOR DELETE USING (tenant_id = get_user_company_id());
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Restaurer GRANT INSERT TO anon sur les tables de log / public-facing
-- ----------------------------------------------------------------------------
-- activity_log : tracking d'activite pre-login (RLS deja restrictive sur SELECT)
GRANT INSERT ON public.activity_log TO anon;

-- newsletter_subscribers : formulaire d'abonnement public
GRANT INSERT ON public.newsletter_subscribers TO anon;

-- signature_consents / signer_verifications : flow signature externe (RLS strict)
GRANT INSERT ON public.signature_consents TO anon;
GRANT INSERT ON public.signer_verifications TO anon;

-- atlas_email_log : tracking newsletters et emails transactionnels
GRANT INSERT ON public.atlas_email_log TO anon;

COMMIT;

-- ============================================================================
-- VERIFICATION POST-EXECUTION
-- ============================================================================

-- 1. Aucune policy USING(true) ne doit subsister sur atlas_balance_exports
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='atlas_balance_exports'
ORDER BY cmd;

-- 2. anon doit avoir INSERT sur les 5 tables ci-dessus
SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee='anon' AND privilege_type='INSERT' AND table_schema='public'
  AND table_name IN ('activity_log','newsletter_subscribers','signature_consents',
                     'signer_verifications','atlas_email_log')
ORDER BY table_name;
