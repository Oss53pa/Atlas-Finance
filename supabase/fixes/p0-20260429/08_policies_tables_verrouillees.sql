-- ============================================================================
-- ATLAS F&A — SCRIPT 08 : POLICIES SUR TABLES VERROUILLEES POST-NETTOYAGE
-- ============================================================================
-- Contexte : apres le script 02 (drop public_read_*), 56 tables se sont
--            retrouvees avec RLS active mais aucune policy = inaccessibles
--            depuis le frontend (anon/authenticated). Ce script restore
--            l'acces selon le scope de chaque table.
-- Durée : < 5 secondes
-- Risque : FAIBLE (CREATE POLICY uniquement)
-- ============================================================================

BEGIN;

-- Categorie A : 16 tables avec tenant_id -> policies tenant CRUD standard
DO $$
DECLARE
  r TEXT;
  tables_tenant TEXT[] := ARRAY[
    'admin_delegate_links','alerts','app_users','entities','feature_flags',
    'knowledge_chunks','licence_activations','licence_seats','licences',
    'payment_sessions','payment_transactions','renewal_log','saved_payment_methods',
    'subscription_changes','usage_events','user_profiles'
  ];
BEGIN
  FOREACH r IN ARRAY tables_tenant LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (tenant_id = get_user_company_id())',
                   r||'_tenant_select', r);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (tenant_id = get_user_company_id())',
                   r||'_tenant_insert', r);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (tenant_id = get_user_company_id()) WITH CHECK (tenant_id = get_user_company_id())',
                   r||'_tenant_update', r);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING (tenant_id = get_user_company_id())',
                   r||'_tenant_delete', r);
  END LOOP;
END $$;

-- Categorie B : table consents (scope user_id)
CREATE POLICY consents_user_select ON public.consents FOR SELECT USING (user_id = auth.uid());
CREATE POLICY consents_user_insert ON public.consents FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY consents_user_update ON public.consents FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY consents_user_delete ON public.consents FOR DELETE USING (user_id = auth.uid());

-- Categorie C : auto-referencantes (id = company_id)
CREATE POLICY tenants_self_select ON public.tenants FOR SELECT USING (id = get_user_company_id());
CREATE POLICY societes_self_select ON public.societes FOR SELECT USING (id = get_user_company_id());

-- Categorie D : catalogues partages (lecture authentifiee uniquement)
DO $$
DECLARE
  r TEXT;
  tables_catalog TEXT[] := ARRAY[
    'permissions','plans','plan_features','features','products',
    'role_permissions','kb_articles','devises'
  ];
BEGIN
  FOREACH r IN ARRAY tables_catalog LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (auth.uid() IS NOT NULL)',
                   r||'_authenticated_read', r);
  END LOOP;
END $$;

COMMIT;

-- ============================================================================
-- TABLES VOLONTAIREMENT LAISSEES VERROUILLEES (acces via service_role)
-- ============================================================================
-- admin_roles, audit_findings, cache_entries, collaboration_sessions,
-- deployments, integration_field_mappings, integration_sync_logs,
-- newsletter_campaigns, newsletter_links, newsletter_segments,
-- newsletter_sends, newsletter_templates, otp_codes, payment_reconciliation,
-- payment_webhooks, promo_codes, proph3t_agent_plans, proph3t_conversations,
-- proph3t_knowledge, proph3t_memory, proph3t_messages, proph3t_monitor_log,
-- proph3t_preferences, publication_results, risk_treatments,
-- salesforce_mappings, webhook_deliveries
--
-- => Ces tables ne sont accessibles que via Edge Functions / backend
--    utilisant la service_role_key (qui bypasse RLS).
--    Si l'app frontend a besoin d'y acceder, ajouter une policy ciblee.
