-- ============================================================================
-- Maintenance des immobilisations (préventive/corrective/prédictive/urgence).
-- Rend la page Maintenance fonctionnelle (était 100% mockée).
-- (Appliqué en prod le 2026-06-15 ; fichier de parité repo↔prod.)
-- ============================================================================
create table if not exists public.fna_asset_maintenance (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  asset_id uuid references public.assets(id) on delete set null,
  asset_name text,
  asset_tag text,
  category text,
  maintenance_type text not null default 'preventive',
  status text not null default 'scheduled',
  priority text not null default 'medium',
  scheduled_date date,
  completed_date date,
  estimated_duration numeric,
  actual_duration numeric,
  cost numeric default 0,
  estimated_cost numeric default 0,
  assigned_to text,
  technician text,
  supplier text,
  description text,
  work_performed text,
  location text,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_fna_maint_tenant on public.fna_asset_maintenance(tenant_id, scheduled_date);
alter table public.fna_asset_maintenance enable row level security;
do $$ begin
  create policy fna_maint_sel on public.fna_asset_maintenance for select using (tenant_id = get_user_company_id());
  create policy fna_maint_ins on public.fna_asset_maintenance for insert with check (tenant_id = get_user_company_id());
  create policy fna_maint_upd on public.fna_asset_maintenance for update using (tenant_id = get_user_company_id());
  create policy fna_maint_del on public.fna_asset_maintenance for delete using (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;
