-- ============================================================================
-- Migration : authz_protect_billing_columns
-- ----------------------------------------------------------------------------
-- Corrige une ESCALADE DE PRIVILÈGE / MANIPULATION DE FACTURATION intra-tenant.
--
-- Constat (audit sécurité) :
--   • RLS `tenants` UPDATE = USING (id = get_my_tenant_id() OR is_atlas_superadmin())
--   • RLS `subscriptions` UPDATE = USING (organization_id = get_user_organization_id())
--   Ces policies autorisent TOUT membre d'un tenant à modifier SA PROPRE ligne
--   `tenants` / `subscriptions`, sans contrôle de rôle. Couplé au code client
--   (adminService.changeTenantPlan / validatePayment qui écrit status='active'),
--   un membre non-admin pouvait :
--     - changer le statut/plan de son tenant,
--     - AUTO-ACTIVER sa souscription sans paiement.
--
-- Choix de correction — TRIGGER au niveau COLONNE plutôt que durcissement RLS :
--   On NE veut PAS interdire tout UPDATE (les tenants éditent légitimement leur
--   fiche : nom, forme juridique — cf. ClientSettings.tsx). On protège donc
--   UNIQUEMENT les colonnes sensibles (status, plan, activated_at). Seul un
--   super-administrateur PLATEFORME (is_atlas_superadmin() = claim JWT signé
--   `atlas_role=atlas_superadmin`, NON forgeable côté navigateur) peut les
--   modifier. Toutes les autres colonnes restent éditables comme avant.
--
-- ⚠️ DÉPENDANCE DE DÉPLOIEMENT : l'opérateur de la console d'administration
--   (suspend/plan/validatePayment) DOIT posséder le claim atlas_superadmin.
--   Le service-role (webhooks de paiement serveur) contourne les triggers et
--   n'est donc pas affecté. Si la console admin est aujourd'hui opérée par un
--   compte SANS ce claim, ce correctif révélera ce défaut (les opérations
--   échoueront) — c'est le comportement voulu : ces actions sont réservées à la
--   plateforme.
--
-- Réversible : voir la section ROLLBACK en fin de fichier.
-- ============================================================================

-- Fonction générique : lève une exception si un compte NON super-admin tente de
-- modifier une colonne protégée. Construite pour être appelée par des triggers
-- dédiés qui lui passent la liste des colonnes réellement modifiées.
CREATE OR REPLACE FUNCTION public.guard_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  col   TEXT;
  oldv  TEXT;
  newv  TEXT;
BEGIN
  -- Super-admin plateforme (claim JWT signé) ET service-role : autorisés.
  -- Le service-role a un JWT sans `atlas_role` ; on l'autorise via le rôle DB
  -- courant (les webhooks serveur tournent en service_role, hors RLS/trigger de
  -- rôle applicatif). is_atlas_superadmin() couvre l'opérateur console.
  IF public.is_atlas_superadmin() THEN
    RETURN NEW;
  END IF;

  -- TG_ARGV = liste des colonnes protégées passées à la déclaration du trigger.
  FOREACH col IN ARRAY TG_ARGV
  LOOP
    EXECUTE format('SELECT ($1).%I::text', col) INTO oldv USING OLD;
    EXECUTE format('SELECT ($1).%I::text', col) INTO newv USING NEW;
    IF oldv IS DISTINCT FROM newv THEN
      RAISE EXCEPTION
        'Modification de « %.% » réservée à l''administration plateforme (colonne protégée).',
        TG_TABLE_NAME, col
        USING ERRCODE = '42501'; -- insufficient_privilege
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Pose les triggers uniquement sur les colonnes RÉELLEMENT présentes (le schéma
-- varie selon l'historique de migrations : `plan` existe sur certaines bases,
-- pas toutes). Idempotent.
DO $$
DECLARE
  v_cols     TEXT[];
  v_present  TEXT[];
  c          TEXT;
  v_arglist  TEXT;
BEGIN
  -- tenants : status, plan
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='tenants') THEN
    v_cols := ARRAY['status','plan'];
    v_present := ARRAY[]::TEXT[];
    FOREACH c IN ARRAY v_cols LOOP
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='tenants' AND column_name=c) THEN
        v_present := array_append(v_present, c);
      END IF;
    END LOOP;
    IF array_length(v_present,1) >= 1 THEN
      v_arglist := (SELECT string_agg(quote_literal(x), ', ') FROM unnest(v_present) x);
      EXECUTE 'DROP TRIGGER IF EXISTS trg_guard_tenants_privcols ON public.tenants';
      EXECUTE format(
        'CREATE TRIGGER trg_guard_tenants_privcols BEFORE UPDATE ON public.tenants '
        || 'FOR EACH ROW EXECUTE FUNCTION public.guard_privileged_columns(%s)', v_arglist);
      RAISE NOTICE 'tenants : colonnes protégées = %', v_present;
    END IF;
  END IF;

  -- subscriptions : status, activated_at
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='subscriptions') THEN
    v_cols := ARRAY['status','activated_at'];
    v_present := ARRAY[]::TEXT[];
    FOREACH c IN ARRAY v_cols LOOP
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='subscriptions' AND column_name=c) THEN
        v_present := array_append(v_present, c);
      END IF;
    END LOOP;
    IF array_length(v_present,1) >= 1 THEN
      v_arglist := (SELECT string_agg(quote_literal(x), ', ') FROM unnest(v_present) x);
      EXECUTE 'DROP TRIGGER IF EXISTS trg_guard_subscriptions_privcols ON public.subscriptions';
      EXECUTE format(
        'CREATE TRIGGER trg_guard_subscriptions_privcols BEFORE UPDATE ON public.subscriptions '
        || 'FOR EACH ROW EXECUTE FUNCTION public.guard_privileged_columns(%s)', v_arglist);
      RAISE NOTICE 'subscriptions : colonnes protégées = %', v_present;
    END IF;
  END IF;

  -- organizations : plan, status (table SaaS onboarding — porte `plan`)
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='organizations') THEN
    v_cols := ARRAY['plan','status'];
    v_present := ARRAY[]::TEXT[];
    FOREACH c IN ARRAY v_cols LOOP
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='organizations' AND column_name=c) THEN
        v_present := array_append(v_present, c);
      END IF;
    END LOOP;
    IF array_length(v_present,1) >= 1 THEN
      v_arglist := (SELECT string_agg(quote_literal(x), ', ') FROM unnest(v_present) x);
      EXECUTE 'DROP TRIGGER IF EXISTS trg_guard_organizations_privcols ON public.organizations';
      EXECUTE format(
        'CREATE TRIGGER trg_guard_organizations_privcols BEFORE UPDATE ON public.organizations '
        || 'FOR EACH ROW EXECUTE FUNCTION public.guard_privileged_columns(%s)', v_arglist);
      RAISE NOTICE 'organizations : colonnes protégées = %', v_present;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- ROLLBACK (si le correctif bloque une opération légitime — à n'utiliser
-- qu'après avoir vérifié que l'opérateur plateforme a bien le claim superadmin) :
--
--   DROP TRIGGER IF EXISTS trg_guard_tenants_privcols        ON public.tenants;
--   DROP TRIGGER IF EXISTS trg_guard_subscriptions_privcols  ON public.subscriptions;
--   DROP TRIGGER IF EXISTS trg_guard_organizations_privcols  ON public.organizations;
--   DROP FUNCTION IF EXISTS public.guard_privileged_columns();
-- ============================================================================
