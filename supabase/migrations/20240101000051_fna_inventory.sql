-- ============================================================================
-- Inventaire physique des immobilisations : sessions de comptage + comptages
-- (ligne par actif) avec résolution d'écart. Rend la page persistante.
-- (Appliqué en prod le 2026-06-15 ; fichier de parité repo↔prod.)
-- ============================================================================
create table if not exists public.fna_inventory_session (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  nom text not null,
  date_debut date,
  date_fin_prevue date,
  statut text not null default 'en_cours',
  responsable text,
  perimetre text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists idx_fna_invsession_tenant on public.fna_inventory_session(tenant_id, created_at desc);
alter table public.fna_inventory_session enable row level security;
do $$ begin
  create policy fna_invsession_sel on public.fna_inventory_session for select using (tenant_id = get_user_company_id());
  create policy fna_invsession_ins on public.fna_inventory_session for insert with check (tenant_id = get_user_company_id());
  create policy fna_invsession_upd on public.fna_inventory_session for update using (tenant_id = get_user_company_id());
  create policy fna_invsession_del on public.fna_inventory_session for delete using (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;

create table if not exists public.fna_inventory_count (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  session_id uuid not null references public.fna_inventory_session(id) on delete cascade,
  asset_id uuid,
  statut_comptage text not null default 'compte',
  localisation_reelle text,
  compteur text,
  etat_physique text,
  date_comptage timestamptz,
  notes text,
  resolution_statut text,
  action_corrective text,
  responsable_resolution text,
  date_resolution timestamptz,
  updated_at timestamptz not null default now(),
  unique (session_id, asset_id)
);
create index if not exists idx_fna_invcount_session on public.fna_inventory_count(tenant_id, session_id);
alter table public.fna_inventory_count enable row level security;
do $$ begin
  create policy fna_invcount_sel on public.fna_inventory_count for select using (tenant_id = get_user_company_id());
  create policy fna_invcount_ins on public.fna_inventory_count for insert with check (tenant_id = get_user_company_id());
  create policy fna_invcount_upd on public.fna_inventory_count for update using (tenant_id = get_user_company_id());
  create policy fna_invcount_del on public.fna_inventory_count for delete using (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;
