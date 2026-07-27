-- ============================================================================
-- Paramètres · Lot B·3 (vague 2) — Référentiels rapatriés en PostgreSQL (CDC §8, §3).
--
-- condition_paiement (jusqu'ici en JSON Dexie) et site (seul stock_sites
-- existait) deviennent des référentiels gouvernés PG, RLS par tenant.
-- Seed des conditions de paiement standard par société. Idempotent.
-- ============================================================================

create table if not exists public.condition_paiement (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.societes(id) on delete cascade,
  code        text not null,
  libelle     text not null,
  jours       int not null default 0,
  fin_de_mois boolean not null default false,
  actif       boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (tenant_id, code)
);
alter table public.condition_paiement enable row level security;
do $$ begin
  create policy cp_sel on public.condition_paiement for select using (tenant_id = get_user_company_id());
  create policy cp_ins on public.condition_paiement for insert with check (tenant_id = get_user_company_id());
  create policy cp_upd on public.condition_paiement for update using (tenant_id = get_user_company_id());
  create policy cp_del on public.condition_paiement for delete using (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;

create table if not exists public.site (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.societes(id) on delete cascade,
  code        text not null,
  libelle     text not null,
  adresse     text,
  responsable text,
  actif       boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (tenant_id, code)
);
alter table public.site enable row level security;
do $$ begin
  create policy site_sel on public.site for select using (tenant_id = get_user_company_id());
  create policy site_ins on public.site for insert with check (tenant_id = get_user_company_id());
  create policy site_upd on public.site for update using (tenant_id = get_user_company_id());
  create policy site_del on public.site for delete using (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;

-- Seed conditions standard par société.
insert into public.condition_paiement (tenant_id, code, libelle, jours, fin_de_mois)
select s.id, v.code, v.libelle, v.jours, v.fdm
from public.societes s
cross join (values
  ('COMPTANT', 'Comptant', 0, false),
  ('30J',      '30 jours', 30, false),
  ('45J',      '45 jours', 45, false),
  ('60J',      '60 jours', 60, false),
  ('30JFM',    '30 jours fin de mois', 30, true)
) as v(code, libelle, jours, fdm)
on conflict (tenant_id, code) do nothing;
