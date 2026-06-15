-- ============================================================================
-- Sorties d'actifs (cessions/mises au rebut). Persiste la sortie + lie l'écriture
-- de cession générée. L'actif passe en 'disposed'/'scrapped'.
-- (Appliqué en prod le 2026-06-15 ; fichier de parité repo↔prod.)
-- ============================================================================
create table if not exists public.fna_asset_disposal (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  asset_id uuid references public.assets(id) on delete set null,
  asset_name text,
  asset_tag text,
  disposal_type text not null default 'sale',
  disposal_date date,
  disposal_value numeric default 0,
  reason text,
  method text,
  buyer text,
  location text,
  notes text,
  original_cost numeric default 0,
  book_value numeric default 0,
  gain_loss numeric default 0,
  status text not null default 'completed',
  journal_entry_id uuid,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists idx_fna_disposal_tenant on public.fna_asset_disposal(tenant_id, disposal_date desc);
alter table public.fna_asset_disposal enable row level security;
do $$ begin
  create policy fna_disposal_sel on public.fna_asset_disposal for select using (tenant_id = get_user_company_id());
  create policy fna_disposal_ins on public.fna_asset_disposal for insert with check (tenant_id = get_user_company_id());
  create policy fna_disposal_upd on public.fna_asset_disposal for update using (tenant_id = get_user_company_id());
  create policy fna_disposal_del on public.fna_asset_disposal for delete using (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;
