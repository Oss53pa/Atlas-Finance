-- ============================================================================
-- Analytique · Lot A·3 v2a — Multi-plans réifiés + axes conditionnels (CDC §3).
--
-- 1) ana_plan : un univers de ventilation autonome (ex. « Projets », « Frais
--    Généraux »), chacun avec son propre invariant de réconciliation.
-- 2) plan_id sur axes / règles / ventilations / runs → un run est SCOPÉ à un plan
--    (plan_id NULL = legacy « tous plans », compat ascendante).
-- 3) axes conditionnels : `conditionnel` + `regle_condition` (jsonb
--    classe_compte → type sémantique attendu) → contrôle C3 paramétrable.
--
-- Backfill : un plan « PRINCIPAL » par tenant possédant des axes, rattaché aux
-- axes et règles existants. Additif & idempotent.
-- ============================================================================

create table if not exists public.ana_plan (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.societes(id) on delete cascade,
  code       text not null,
  libelle    text not null,
  statut     text not null default 'actif' check (statut in ('actif','gele','clos')),
  created_at timestamptz not null default now(),
  unique (tenant_id, code)
);
alter table public.ana_plan enable row level security;
do $$ begin
  create policy ana_plan_sel on public.ana_plan for select using (tenant_id = get_user_company_id());
  create policy ana_plan_ins on public.ana_plan for insert with check (tenant_id = get_user_company_id());
  create policy ana_plan_upd on public.ana_plan for update using (tenant_id = get_user_company_id());
  create policy ana_plan_del on public.ana_plan for delete using (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;

alter table public.axes_analytiques
  add column if not exists plan_id         uuid references public.ana_plan(id) on delete set null,
  add column if not exists conditionnel    boolean not null default false,
  add column if not exists regle_condition jsonb;

alter table public.fna_allocation_rule    add column if not exists plan_id uuid references public.ana_plan(id) on delete set null;
alter table public.ventilations_analytiques add column if not exists plan_id uuid references public.ana_plan(id) on delete set null;
alter table public.fna_allocation_run      add column if not exists plan_id uuid references public.ana_plan(id) on delete set null;

create index if not exists idx_axes_plan on public.axes_analytiques(plan_id);
create index if not exists idx_rule_plan on public.fna_allocation_rule(plan_id);
create index if not exists idx_run_plan  on public.fna_allocation_run(plan_id);

-- Backfill : plan PRINCIPAL par tenant ayant des axes.
insert into public.ana_plan (tenant_id, code, libelle)
  select distinct tenant_id, 'PRINCIPAL', 'Plan principal'
  from public.axes_analytiques where tenant_id is not null
  on conflict (tenant_id, code) do nothing;

update public.axes_analytiques a set plan_id = p.id
  from public.ana_plan p
  where p.tenant_id = a.tenant_id and p.code = 'PRINCIPAL' and a.plan_id is null;

update public.fna_allocation_rule r set plan_id = p.id
  from public.ana_plan p
  where p.tenant_id = r.tenant_id and p.code = 'PRINCIPAL' and r.plan_id is null and r.tenant_id is not null;
