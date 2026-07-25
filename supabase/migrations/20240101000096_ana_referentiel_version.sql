-- ============================================================================
-- Analytique · Lot A·3 v2b — Versionnage du référentiel + runs rétroactifs (CDC §3.3, §7.1).
--
-- 1) ana_referentiel_version : snapshot daté du paramétrage (axes/sections/règles/
--    clés) d'un plan + hash. Un run référence la version utilisée → un re-run
--    d'une période passée avec la même version reproduit le même résultat.
-- 2) fna_allocation_run : version_referentiel_id (traçabilité) + historique
--    (marque les runs de reconstitution d'exercices importés).
--
-- Additif & idempotent.
-- ============================================================================

create table if not exists public.ana_referentiel_version (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.societes(id) on delete cascade,
  plan_id    uuid references public.ana_plan(id) on delete cascade,
  numero     int not null,
  snapshot   jsonb not null,
  hash       text not null,
  cree_le    timestamptz not null default now(),
  cree_par   uuid,
  unique (tenant_id, plan_id, numero)
);
create index if not exists idx_ana_ref_version_plan on public.ana_referentiel_version(tenant_id, plan_id, numero desc);

alter table public.ana_referentiel_version enable row level security;
do $$ begin
  create policy ana_ref_version_sel on public.ana_referentiel_version for select using (tenant_id = get_user_company_id());
  create policy ana_ref_version_ins on public.ana_referentiel_version for insert with check (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;

alter table public.fna_allocation_run
  add column if not exists version_referentiel_id uuid references public.ana_referentiel_version(id) on delete set null,
  add column if not exists historique boolean not null default false;
