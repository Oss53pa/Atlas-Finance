-- =============================================================================
-- Refonte OPEX/CAPEX — Lot 4 : budget revenus volumes × prix (§14.1)
-- Satellite de budget_lines : quantité × prix unitaire par période. Le montant
-- (budget_line_periods.montant_prevu) est recalculé = quantite × prix_unitaire.
-- Additif & idempotent. Tenancy tenant_id, RLS get_user_company_id().
-- =============================================================================
create table if not exists public.budget_lignes_volumes (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.societes(id) on delete cascade,
  budget_line_id uuid not null references public.budget_lines(id) on delete cascade,
  period         smallint not null check (period between 1 and 12),
  quantite       numeric(14,3) not null default 0,
  prix_unitaire  numeric(18,2) not null default 0,
  created_at     timestamptz not null default now(),
  unique (budget_line_id, period)
);
create index if not exists budget_volumes_line on public.budget_lignes_volumes (budget_line_id);

alter table public.budget_lignes_volumes enable row level security;
drop policy if exists budget_volumes_select on public.budget_lignes_volumes;
drop policy if exists budget_volumes_insert on public.budget_lignes_volumes;
drop policy if exists budget_volumes_update on public.budget_lignes_volumes;
drop policy if exists budget_volumes_delete on public.budget_lignes_volumes;
create policy budget_volumes_select on public.budget_lignes_volumes for select using (tenant_id = get_user_company_id());
create policy budget_volumes_insert on public.budget_lignes_volumes for insert with check (tenant_id = get_user_company_id());
create policy budget_volumes_update on public.budget_lignes_volumes for update using (tenant_id = get_user_company_id());
create policy budget_volumes_delete on public.budget_lignes_volumes for delete using (tenant_id = get_user_company_id());
