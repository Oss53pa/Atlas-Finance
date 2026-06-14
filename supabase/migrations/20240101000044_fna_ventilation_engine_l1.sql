-- ============================================================================
-- Contrôle de Gestion — Lot L1 : moteur de ventilation auditable
-- Règles persistées (repeatable), run immuable (audit/hash), réconciliation.
-- Tenancy = societes (RLS get_user_company_id()). Réutilise ventilations_analytiques.
-- (Appliqué en prod le 2026-06-14 ; fichier de parité repo↔prod.)
-- ============================================================================

-- Typage section principale / auxiliaire (modèle dimensionnel CDC §5)
alter table public.sections_analytiques
  add column if not exists nature text not null default 'PRINCIPALE';

-- ---- Règles de ventilation persistées (DIRECT en V1 ; PRIMAIRE/SECONDAIRE posés) ----
create table if not exists public.fna_allocation_rule (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  type text not null default 'DIRECT',              -- DIRECT | PRIMAIRE | SECONDAIRE
  ordre int not null default 100,
  compte_pattern text,                              -- préfixe de compte (ex. '6051')
  journal_pattern text,                             -- code journal (optionnel)
  libelle_pattern text,                             -- motif libellé (ILIKE, optionnel)
  tiers_pattern text,                               -- code tiers (optionnel)
  section_id uuid not null references public.sections_analytiques(id) on delete cascade,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_fna_rule_tenant on public.fna_allocation_rule(tenant_id, ordre);
alter table public.fna_allocation_rule enable row level security;
do $$ begin
  create policy fna_rule_sel on public.fna_allocation_rule for select using (tenant_id = get_user_company_id());
  create policy fna_rule_ins on public.fna_allocation_rule for insert with check (tenant_id = get_user_company_id());
  create policy fna_rule_upd on public.fna_allocation_rule for update using (tenant_id = get_user_company_id());
  create policy fna_rule_del on public.fna_allocation_rule for delete using (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;

-- ---- Journal des runs (immuable, piste d'audit OHADA) ----
create table if not exists public.fna_allocation_run (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  exercice int not null,
  statut text not null default 'success',           -- running | success | failed
  hash_audit text,
  couverture_pct numeric,
  montant_gl bigint,                                 -- centimes (bigint, jamais float)
  montant_ventile bigint,
  nb_lignes_gl int,
  nb_lignes_ventilees int,
  reconcilie boolean,
  detail jsonb,                                       -- par classe : gl / ventilé / résidu
  executed_by uuid,
  executed_at timestamptz not null default now()
);
create index if not exists idx_fna_run_tenant on public.fna_allocation_run(tenant_id, executed_at desc);
alter table public.fna_allocation_run enable row level security;
do $$ begin
  create policy fna_run_sel on public.fna_allocation_run for select using (tenant_id = get_user_company_id());
  create policy fna_run_ins on public.fna_allocation_run for insert with check (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;

-- ---- Vue de réconciliation : Σ GL vs Σ ventilé par classe (données réelles) ----
create or replace view public.v_ventilation_reconciliation with (security_invoker = true) as
with gl as (
  select jl.tenant_id,
         to_char(je.date, 'YYYY') as annee,
         left(jl.account_code, 1) as classe,
         jl.account_code,
         coalesce(jl.account_name, '') as account_name,
         sum(case when left(jl.account_code,1) in ('6','2') then jl.debit - jl.credit
                  when left(jl.account_code,1) = '7' then jl.credit - jl.debit
                  else 0 end) as montant_gl,
         sum(case when v.id is not null then 1 else 0 end) as nb_ventile_lignes,
         count(*) as nb_lignes
  from journal_lines jl
  join journal_entries je on je.id = jl.entry_id
  left join ventilations_analytiques v on v.ligne_ecriture_id = jl.id
  where left(jl.account_code,1) in ('2','6','7')
    and je.status in ('validated','posted') and je.date is not null
  group by jl.tenant_id, to_char(je.date,'YYYY'), left(jl.account_code,1), jl.account_code, jl.account_name
)
select * from gl;
