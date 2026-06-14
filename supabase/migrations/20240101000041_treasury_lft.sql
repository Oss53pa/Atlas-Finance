-- =====================================================================
-- Atlas FNA — Prévision de trésorerie LFT · CDC V3 §3
-- =====================================================================
-- Latest Thinking Forecast (rolling). Tenancy = societes, RLS via
-- get_user_company_id(). Alimentation : postes ouverts (journal_lines non
-- lettrés + date_echeance, calculé côté app), budget, saisie manuelle.
-- =====================================================================

create table public.treasury_versions (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.societes(id) on delete cascade,
  fiscal_year_id uuid references public.fiscal_years(id) on delete set null,
  libelle        text not null,
  statut         text not null default 'brouillon' check (statut in ('brouillon','valide','verrouille')),
  is_active      boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index treasury_versions_one_active on public.treasury_versions (tenant_id) where is_active;

create table public.treasury_flow_categories (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.societes(id) on delete cascade,
  code      text not null,
  libelle   text not null,
  sens      text not null check (sens in ('encaissement','decaissement')),
  created_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table public.treasury_flows (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references public.societes(id) on delete cascade,
  version_id         uuid references public.treasury_versions(id) on delete cascade,
  category_id        uuid references public.treasury_flow_categories(id) on delete set null,
  libelle            text,
  sens               text not null check (sens in ('encaissement','decaissement')),
  date_prevue        date not null,
  montant            numeric(18,2) not null default 0,
  source             text not null default 'manuel' check (source in ('poste_ouvert','budget','manuel')),
  ref_journal_line_id uuid,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index treasury_flows_version on public.treasury_flows (version_id);
create index treasury_flows_date on public.treasury_flows (tenant_id, date_prevue);

create or replace function public.treasury_set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
create trigger treasury_versions_upd before update on public.treasury_versions for each row execute function public.treasury_set_updated_at();
create trigger treasury_flows_upd before update on public.treasury_flows for each row execute function public.treasury_set_updated_at();

alter table public.treasury_versions        enable row level security;
alter table public.treasury_flow_categories enable row level security;
alter table public.treasury_flows           enable row level security;

create policy tv_sel on public.treasury_versions for select using (tenant_id = get_user_company_id());
create policy tv_ins on public.treasury_versions for insert with check (tenant_id = get_user_company_id());
create policy tv_upd on public.treasury_versions for update using (tenant_id = get_user_company_id());
create policy tv_del on public.treasury_versions for delete using (tenant_id = get_user_company_id());

create policy tfc_sel on public.treasury_flow_categories for select using (tenant_id = get_user_company_id());
create policy tfc_ins on public.treasury_flow_categories for insert with check (tenant_id = get_user_company_id());
create policy tfc_upd on public.treasury_flow_categories for update using (tenant_id = get_user_company_id());
create policy tfc_del on public.treasury_flow_categories for delete using (tenant_id = get_user_company_id());

create policy tf_sel on public.treasury_flows for select using (tenant_id = get_user_company_id());
create policy tf_ins on public.treasury_flows for insert with check (tenant_id = get_user_company_id());
create policy tf_upd on public.treasury_flows for update using (tenant_id = get_user_company_id());
create policy tf_del on public.treasury_flows for delete using (tenant_id = get_user_company_id());
