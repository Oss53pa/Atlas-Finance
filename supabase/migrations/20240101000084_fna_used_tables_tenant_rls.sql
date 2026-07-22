-- Tables fna_* ENCORE UTILISÉES par l'application : bascule org_id → tenant_id.
-- Suite de 20240101000082 (fna_car) et 20240101000083 (gouvernance CAPEX).
--
-- PROBLÈME (bien plus qu'un sujet de RLS) : ces 9 tables n'ont AUCUNE colonne
-- tenant_id, alors que les services applicatifs écrivent `tenant_id` depuis la
-- refonte. Chaque insertion échouait donc avec « column tenant_id does not exist »
-- — d'où 0 ligne partout. Quatre fonctionnalités étaient silencieusement cassées :
--   • maintenance des immobilisations   (maintenanceService)
--   • sorties / cessions                (disposalService)
--   • inventaire physique               (inventoryService)
--   • moteur de ventilation analytique  (ventilationRunService : règles, clés,
--     valeurs de clé, runs, déversements secondaires)
-- S'y ajoutait la RLS org (fna_auth_org_ids) qui bloquait même la lecture.
--
-- AUCUN BACKFILL NÉCESSAIRE : les 9 tables sont vides (comptage exact vérifié
-- avant migration). Rien à rattacher, donc aucun risque de mélange inter-org.
--
-- HORS PÉRIMÈTRE — volontaire : les tables fna_* PEUPLÉES mais qui ne sont
-- référencées nulle part dans le code applicatif (fna_gl_entries 8496,
-- fna_gl_tiers 3834, fna_accounts 548, fna_tiers_unmatched 469, fna_budgets 464,
-- fna_imports 15) constituent le modèle FNA hérité, remplacé par
-- journal_entries / journal_lines / accounts / third_parties. Les exposer via une
-- RLS tenant créerait un grand livre parallèle visible sans aucun consommateur —
-- leur sort (archivage/suppression) est une décision distincte.

do $$
declare t text;
begin
  foreach t in array array[
    'fna_asset_maintenance','fna_asset_disposal','fna_inventory_session','fna_inventory_count',
    'fna_allocation_rule','fna_allocation_key','fna_allocation_key_value','fna_allocation_run',
    'fna_secondary_transfer'
  ] loop
    -- 1) colonne de tenancy attendue par les services
    execute format('alter table public.%I add column if not exists tenant_id uuid', t);
    -- 2) l'org devient optionnelle (inserts tenant-only)
    execute format('alter table public.%I alter column org_id drop not null', t);
    -- 3) index de filtrage
    execute format('create index if not exists %I on public.%I(tenant_id)', 'idx_'||t||'_tenant', t);
    -- 4) policies tenant (permissives : elles s'ajoutent aux policies org existantes)
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname=t||'_tenant_sel') then
      execute format('create policy %I on public.%I for select using (tenant_id = get_user_company_id())', t||'_tenant_sel', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname=t||'_tenant_ins') then
      execute format('create policy %I on public.%I for insert with check (tenant_id = get_user_company_id())', t||'_tenant_ins', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname=t||'_tenant_upd') then
      execute format('create policy %I on public.%I for update using (tenant_id = get_user_company_id()) with check (tenant_id = get_user_company_id())', t||'_tenant_upd', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname=t||'_tenant_del') then
      execute format('create policy %I on public.%I for delete using (tenant_id = get_user_company_id())', t||'_tenant_del', t);
    end if;
  end loop;
end $$;
