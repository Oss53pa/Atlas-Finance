-- ============================================================================
-- Refonte CAR : objet distinct POSTÉRIEUR au budget + notes & attachements.
-- Flux : Business Case (capex_requests) → Validation → Budget CAPEX → CAR (fna_car).
-- (Appliqué en prod le 2026-06-15 ; fichier de parité repo↔prod.)
-- ============================================================================
create table if not exists public.fna_car (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  request_id uuid not null references public.capex_requests(id) on delete cascade,
  reference text,
  montant_approprie bigint not null default 0,
  date_appropriation date,
  justification text,
  statut text not null default 'emise',          -- emise | approuvee | decaissee | cloturee
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists idx_fna_car_req on public.fna_car(request_id, created_at);
alter table public.fna_car enable row level security;
do $$ begin
  create policy fna_car_sel on public.fna_car for select using (tenant_id = get_user_company_id());
  create policy fna_car_ins on public.fna_car for insert with check (tenant_id = get_user_company_id());
  create policy fna_car_upd on public.fna_car for update using (tenant_id = get_user_company_id());
  create policy fna_car_del on public.fna_car for delete using (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;

create table if not exists public.fna_capex_note (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  request_id uuid not null references public.capex_requests(id) on delete cascade,
  type text not null default 'note',             -- note | attachment
  contenu text,
  file_name text,
  file_path text,                                -- chemin bucket 'documents' : {org}/{uid}/capex/{req}/...
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists idx_fna_note_req on public.fna_capex_note(request_id, created_at);
alter table public.fna_capex_note enable row level security;
do $$ begin
  create policy fna_note_sel on public.fna_capex_note for select using (tenant_id = get_user_company_id());
  create policy fna_note_ins on public.fna_capex_note for insert with check (tenant_id = get_user_company_id());
  create policy fna_note_del on public.fna_capex_note for delete using (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;
