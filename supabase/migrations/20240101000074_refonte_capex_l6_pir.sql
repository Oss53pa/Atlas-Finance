-- =============================================================================
-- Refonte OPEX/CAPEX — Lot 6 : PIR (revue post-implémentation) tenant_id-native
-- Doc : §22.1. fna_capex_pir est vide + RLS org_id (non migrée) → nouvelle table.
-- Additif & idempotent.
-- =============================================================================
create table if not exists public.capex_pir (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.societes(id) on delete cascade,
  projet_id           uuid not null references public.capex_projets(id) on delete cascade,
  request_id          uuid references public.capex_requests(id),
  cout_final          numeric(18,2),
  ecart_approprie     numeric(18,2),
  van_ex_post         numeric(18,2),
  delai_reel_jours    int,
  benefices_constates numeric(18,2),
  lecons              text,
  reviewed_by         uuid references public.profiles(id),
  reviewed_at         timestamptz not null default now(),
  unique (tenant_id, projet_id)
);

alter table public.capex_pir enable row level security;
drop policy if exists capex_pir_select on public.capex_pir;
drop policy if exists capex_pir_insert on public.capex_pir;
drop policy if exists capex_pir_update on public.capex_pir;
drop policy if exists capex_pir_delete on public.capex_pir;
create policy capex_pir_select on public.capex_pir for select using (tenant_id = get_user_company_id());
create policy capex_pir_insert on public.capex_pir for insert with check (tenant_id = get_user_company_id());
create policy capex_pir_update on public.capex_pir for update using (tenant_id = get_user_company_id());
create policy capex_pir_delete on public.capex_pir for delete using (tenant_id = get_user_company_id());
