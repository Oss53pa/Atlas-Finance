-- =============================================================================
-- Refonte OPEX/CAPEX — Lot 7 : snapshots figés de l'exécution budgétaire (§24)
-- À chaque clôture mensuelle : gel immuable + hashé de v_budget_execution, pour
-- que les états sur période close soient rejouables (invariant 12). Additif.
-- Tenancy tenant_id, RLS get_user_company_id(). Immuabilité applicative (pas
-- d'UPDATE côté client : policy update absente) — un snapshot est figé.
-- =============================================================================
create table if not exists public.budget_snapshots (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.societes(id) on delete cascade,
  annee       text not null,
  period      smallint not null check (period between 1 and 12),
  contenu     jsonb not null,
  hash_sha256 text not null,
  nb_lignes   int not null default 0,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  unique (tenant_id, annee, period)
);
create index if not exists budget_snapshots_tenant on public.budget_snapshots (tenant_id, annee, period);

alter table public.budget_snapshots enable row level security;
drop policy if exists budget_snapshots_select on public.budget_snapshots;
drop policy if exists budget_snapshots_insert on public.budget_snapshots;
drop policy if exists budget_snapshots_delete on public.budget_snapshots;
-- SELECT + INSERT + DELETE seulement (pas d'UPDATE => immuable une fois figé).
create policy budget_snapshots_select on public.budget_snapshots for select using (tenant_id = get_user_company_id());
create policy budget_snapshots_insert on public.budget_snapshots for insert with check (tenant_id = get_user_company_id());
create policy budget_snapshots_delete on public.budget_snapshots for delete using (tenant_id = get_user_company_id());
