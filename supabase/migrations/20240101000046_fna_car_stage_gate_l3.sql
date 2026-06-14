-- ============================================================================
-- L3 — CAR stage-gate : évaluation financière, matrice d'approbation, IAS 16, PIR.
-- Étend capex_requests (CAR simplifié existant) + tables de gouvernance.
-- (Appliqué en prod le 2026-06-14 ; fichier de parité repo↔prod.)
-- ============================================================================
alter table public.capex_requests add column if not exists reference text;
alter table public.capex_requests add column if not exists categorie text;
alter table public.capex_requests add column if not exists business_case text;
alter table public.capex_requests add column if not exists contingence_pct numeric default 0;
alter table public.capex_requests add column if not exists taux_actualisation numeric default 0.10;
alter table public.capex_requests add column if not exists duree_vie_mois int;
alter table public.capex_requests add column if not exists cashflows jsonb;
alter table public.capex_requests add column if not exists van bigint;
alter table public.capex_requests add column if not exists tri numeric;
alter table public.capex_requests add column if not exists payback_simple_mois int;
alter table public.capex_requests add column if not exists payback_actualise_mois int;
alter table public.capex_requests add column if not exists indice_profitabilite numeric;
alter table public.capex_requests add column if not exists roi numeric;
alter table public.capex_requests add column if not exists test_capitalisation jsonb;

create table if not exists public.fna_capex_approval_matrix (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  seuil_min bigint not null default 0,
  seuil_max bigint,
  niveau int not null,
  role_requis text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_fna_matrix_tenant on public.fna_capex_approval_matrix(tenant_id, seuil_min);
alter table public.fna_capex_approval_matrix enable row level security;
do $$ begin
  create policy fna_matrix_sel on public.fna_capex_approval_matrix for select using (tenant_id = get_user_company_id());
  create policy fna_matrix_ins on public.fna_capex_approval_matrix for insert with check (tenant_id = get_user_company_id());
  create policy fna_matrix_upd on public.fna_capex_approval_matrix for update using (tenant_id = get_user_company_id());
  create policy fna_matrix_del on public.fna_capex_approval_matrix for delete using (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;

create table if not exists public.fna_capex_approval (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  request_id uuid not null references public.capex_requests(id) on delete cascade,
  niveau int not null,
  role text,
  statut text not null default 'pending',
  decided_by uuid,
  decided_at timestamptz,
  commentaire text,
  hash_audit text,
  created_at timestamptz not null default now()
);
create index if not exists idx_fna_appr_req on public.fna_capex_approval(request_id, niveau);
alter table public.fna_capex_approval enable row level security;
do $$ begin
  create policy fna_appr_sel on public.fna_capex_approval for select using (tenant_id = get_user_company_id());
  create policy fna_appr_ins on public.fna_capex_approval for insert with check (tenant_id = get_user_company_id());
  create policy fna_appr_upd on public.fna_capex_approval for update using (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;

create table if not exists public.fna_capex_pir (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  request_id uuid not null references public.capex_requests(id) on delete cascade,
  cout_final bigint,
  ecart_budget bigint,
  van_ex_post bigint,
  lecons text,
  reviewed_by uuid,
  reviewed_at timestamptz default now()
);
create index if not exists idx_fna_pir_req on public.fna_capex_pir(request_id);
alter table public.fna_capex_pir enable row level security;
do $$ begin
  create policy fna_pir_sel on public.fna_capex_pir for select using (tenant_id = get_user_company_id());
  create policy fna_pir_ins on public.fna_capex_pir for insert with check (tenant_id = get_user_company_id());
  create policy fna_pir_upd on public.fna_capex_pir for update using (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;
