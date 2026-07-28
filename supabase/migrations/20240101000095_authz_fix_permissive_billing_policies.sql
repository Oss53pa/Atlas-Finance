-- ============================================================================
-- Migration : authz_fix_permissive_billing_update_policies
-- ----------------------------------------------------------------------------
-- Corrige une ESCALADE / MANIPULATION DE FACTURATION intra-tenant.
--
-- Constat (vérifié sur la base live 2026-07-24, qui a DIVERGÉ des migrations du
-- repo — elle utilise is_admin()/is_org_admin()/get_user_org_id()) :
--   • subscriptions a DEUX policies UPDATE :
--       - "Admins manage all subs"      → USING is_admin()                 (OK)
--       - "Users can update subscriptions" → USING (organization_id = get_user_organization_id())
--         ↳ PERMISSIVE, sans contrôle de rôle. Les policies permissives sont
--           OR'ées → n'importe quel membre de l'org peut UPDATE sa souscription,
--           donc passer status='active' SANS PAIEMENT (self-activation).
--   • organizations a de même une UPDATE permissive "Users can update own org"
--     (USING id = get_user_organization_id()) à côté de "organizations_update"
--     (role-gatée is_org_admin) → tout membre peut changer plan/statut de son org.
--   • tenants : DÉJÀ sain live (seul is_admin() peut UPDATE).
--
-- Correction : SUPPRIMER les policies UPDATE permissives sans rôle. Les policies
-- admin-gatées préexistantes conservent l'accès légitime. On garantit en plus
-- (idempotent, si le helper is_admin existe) qu'une policy UPDATE admin subsiste.
--
-- is_admin() (live) = service_role OU postgres OU profiles.role ∈ (admin,
-- super_admin) actif → couvre le serveur, les webhooks et les 2 vrais admins ;
-- exclut les 12 comptes 'client'. Testé en transaction rollback sur la base.
--
-- Idempotent (DROP IF EXISTS, création conditionnelle). Réversible : recréer les
-- policies permissives (NON recommandé — c'est la faille).
-- ============================================================================

-- 1) Retirer les UPDATE permissives sans contrôle de rôle
DROP POLICY IF EXISTS "Users can update subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own org"        ON public.organizations;

-- 2) Filet de sécurité : garantir une policy UPDATE ADMIN si le helper existe et
--    qu'aucune policy UPDATE/ALL admin ne couvre déjà la table.
DO $$
BEGIN
  IF to_regprocedure('public.is_admin()') IS NULL THEN
    RAISE NOTICE 'is_admin() absente — bases construites depuis les migrations du repo gèrent l''admin autrement ; rien à ajouter.';
    RETURN;
  END IF;

  -- subscriptions : "Admins manage all subs" (ALL is_admin) couvre déjà l'UPDATE.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='subscriptions'
      AND cmd IN ('UPDATE','ALL') AND qual LIKE '%is_admin%'
  ) THEN
    EXECUTE 'CREATE POLICY subs_admin_update ON public.subscriptions '
         || 'FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin())';
    RAISE NOTICE 'subscriptions : policy admin UPDATE ajoutée.';
  END IF;

  -- organizations : "organizations_update" (is_org_admin) existe ; on ajoute un
  -- gate is_admin() (admin plateforme) si aucune policy is_admin n'est présente.
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='organizations')
     AND NOT EXISTS (
       SELECT 1 FROM pg_policies
       WHERE schemaname='public' AND tablename='organizations'
         AND cmd IN ('UPDATE','ALL') AND qual LIKE '%is_admin()%'
     ) THEN
    EXECUTE 'CREATE POLICY org_admin_update ON public.organizations '
         || 'FOR UPDATE USING (id = public.get_user_org_id() AND public.is_admin()) '
         || 'WITH CHECK (id = public.get_user_org_id() AND public.is_admin())';
    RAISE NOTICE 'organizations : policy admin UPDATE ajoutée.';
  END IF;
END $$;

-- ============================================================================
-- ROLLBACK (réintroduit la faille — à n'utiliser qu'en cas de régression) :
--   CREATE POLICY "Users can update subscriptions" ON public.subscriptions
--     FOR UPDATE USING (organization_id = get_user_organization_id());
--   CREATE POLICY "Users can update own org" ON public.organizations
--     FOR UPDATE USING (id = get_user_organization_id());
--   DROP POLICY IF EXISTS subs_admin_update ON public.subscriptions;
--   DROP POLICY IF EXISTS org_admin_update  ON public.organizations;
-- ============================================================================
