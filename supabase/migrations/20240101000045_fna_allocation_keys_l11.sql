-- ============================================================================
-- L1.1 — Clés de répartition (primaire/secondaire & ABC).
-- Une clé porte des valeurs par section (surface m², effectif, CA, inducteur).
-- (Appliqué en prod le 2026-06-14 ; fichier de parité repo↔prod.)
-- ============================================================================
create table if not exists public.fna_allocation_key (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  code text not null,                        -- SURFACE_M2 | EFFECTIF | CA | INDUCTEUR_ABC | FIXE
  libelle text not null,
  unite text,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_fna_key_tenant on public.fna_allocation_key(tenant_id);
alter table public.fna_allocation_key enable row level security;
do $$ begin
  create policy fna_key_sel on public.fna_allocation_key for select using (tenant_id = get_user_company_id());
  create policy fna_key_ins on public.fna_allocation_key for insert with check (tenant_id = get_user_company_id());
  create policy fna_key_upd on public.fna_allocation_key for update using (tenant_id = get_user_company_id());
  create policy fna_key_del on public.fna_allocation_key for delete using (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;

create table if not exists public.fna_allocation_key_value (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  key_id uuid not null references public.fna_allocation_key(id) on delete cascade,
  section_id uuid not null references public.sections_analytiques(id) on delete cascade,
  valeur numeric not null default 0,
  unique (key_id, section_id)
);
create index if not exists idx_fna_keyval_tenant on public.fna_allocation_key_value(tenant_id, key_id);
alter table public.fna_allocation_key_value enable row level security;
do $$ begin
  create policy fna_keyval_sel on public.fna_allocation_key_value for select using (tenant_id = get_user_company_id());
  create policy fna_keyval_ins on public.fna_allocation_key_value for insert with check (tenant_id = get_user_company_id());
  create policy fna_keyval_upd on public.fna_allocation_key_value for update using (tenant_id = get_user_company_id());
  create policy fna_keyval_del on public.fna_allocation_key_value for delete using (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;

alter table public.fna_allocation_rule add column if not exists key_id uuid references public.fna_allocation_key(id) on delete set null;
alter table public.fna_allocation_rule add column if not exists source_section_id uuid references public.sections_analytiques(id) on delete cascade;
