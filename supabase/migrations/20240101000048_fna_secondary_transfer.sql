-- ============================================================================
-- L1.2 — Répartition SECONDAIRE : déversement des sections auxiliaires sur les
-- principales (méthode step-down, déterministe). Transferts section→section
-- (somme nulle), distincts des ventilations per-ligne → l'invariant de
-- réconciliation GL reste intact.
-- (Appliqué en prod le 2026-06-15 ; fichier de parité repo↔prod.)
-- ============================================================================
create table if not exists public.fna_secondary_transfer (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  exercice int,
  from_section_id uuid not null references public.sections_analytiques(id) on delete cascade,
  to_section_id uuid not null references public.sections_analytiques(id) on delete cascade,
  montant bigint not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_fna_sectransfer_tenant on public.fna_secondary_transfer(tenant_id, exercice);
alter table public.fna_secondary_transfer enable row level security;
do $$ begin
  create policy fna_sectransfer_sel on public.fna_secondary_transfer for select using (tenant_id = get_user_company_id());
  create policy fna_sectransfer_ins on public.fna_secondary_transfer for insert with check (tenant_id = get_user_company_id());
  create policy fna_sectransfer_del on public.fna_secondary_transfer for delete using (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;
