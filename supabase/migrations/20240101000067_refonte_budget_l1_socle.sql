-- =============================================================================
-- Refonte OPEX/CAPEX — Lot 1 (socle)
-- Doc de référence : docs/refonte-opex-capex/DESIGN.md
--
-- Migration additive et idempotente (pas de branche Supabase : appliquée en prod
-- en mode défensif — CREATE/ADD IF NOT EXISTS, aucun DROP destructif de données).
--
-- Contenu :
--   1. budget_campagnes         (nouvelle) — cycle budgétaire voté (§3 CDC)
--   2. section_governance       (nouvelle) — owner/contrôleur par section analytique
--                                 (remplace budget_owner/controller du CDC, décision D1 :
--                                  l'org = sections_analytiques)
--   3. budget_versions          (étendue)  — campagne, numéro, hash/verrouillage,
--                                 CHECK statut/type élargis (versions immuables §A5)
--
-- Tenancy : tout tenant_id → societes, RLS get_user_company_id() (motif des tables budget).
-- =============================================================================

-- 1. Campagnes budgétaires ----------------------------------------------------
create table if not exists public.budget_campagnes (
  id                      uuid primary key default gen_random_uuid(),
  tenant_id               uuid not null references public.societes(id) on delete cascade,
  fiscal_year_id          uuid not null references public.fiscal_years(id) on delete cascade,
  libelle                 text not null,
  statut                  text not null default 'preparation'
    check (statut in ('preparation','ouverte','consolidation','arbitrage','votee','cloturee')),
  date_ouverture          date,
  date_limite_soumission  date,
  date_vote               date,
  taux_indexation_defaut  numeric(6,4),
  created_by              uuid references public.profiles(id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists budget_campagnes_tenant
  on public.budget_campagnes (tenant_id, fiscal_year_id);

-- 2. Gouvernance par section (owner / contrôleur) -----------------------------
create table if not exists public.section_governance (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.societes(id) on delete cascade,
  section_id          uuid not null references public.sections_analytiques(id) on delete cascade,
  owner_user_id       uuid references public.profiles(id),
  controller_user_id  uuid references public.profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (tenant_id, section_id)
);

create index if not exists section_governance_tenant
  on public.section_governance (tenant_id);

-- 3. budget_versions : versions immuables & campagne --------------------------
alter table public.budget_versions
  add column if not exists campagne_id     uuid references public.budget_campagnes(id) on delete set null,
  add column if not exists numero          int not null default 1,
  add column if not exists hash_sha256     text,
  add column if not exists verrouille_par  uuid references public.profiles(id),
  add column if not exists verrouille_le   timestamptz;

-- CHECK élargis (drop-if-exists + add => idempotent ; aucune donnée invalidée :
-- valeurs actuelles = {initial, brouillon} incluses dans les nouveaux ensembles).
alter table public.budget_versions drop constraint if exists budget_versions_statut_check;
alter table public.budget_versions add  constraint budget_versions_statut_check
  check (statut in ('brouillon','soumis','valide','approuve','verrouille','obsolete'));

alter table public.budget_versions drop constraint if exists budget_versions_type_check;
alter table public.budget_versions add  constraint budget_versions_type_check
  check (type in ('initial','revise','forecast','atterrissage'));

-- 4. updated_at (réutilise la fonction du module budget si présente) ----------
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
             where n.nspname='public' and p.proname='budget_set_updated_at') then
    drop trigger if exists set_updated_at on public.budget_campagnes;
    create trigger set_updated_at before update on public.budget_campagnes
      for each row execute function public.budget_set_updated_at();
    drop trigger if exists set_updated_at on public.section_governance;
    create trigger set_updated_at before update on public.section_governance
      for each row execute function public.budget_set_updated_at();
  end if;
end $$;

-- 5. RLS — motif identique aux tables budget (tenant_id = get_user_company_id())
alter table public.budget_campagnes  enable row level security;
alter table public.section_governance enable row level security;

drop policy if exists budget_campagnes_select on public.budget_campagnes;
drop policy if exists budget_campagnes_insert on public.budget_campagnes;
drop policy if exists budget_campagnes_update on public.budget_campagnes;
drop policy if exists budget_campagnes_delete on public.budget_campagnes;
create policy budget_campagnes_select on public.budget_campagnes
  for select using (tenant_id = get_user_company_id());
create policy budget_campagnes_insert on public.budget_campagnes
  for insert with check (tenant_id = get_user_company_id());
create policy budget_campagnes_update on public.budget_campagnes
  for update using (tenant_id = get_user_company_id());
create policy budget_campagnes_delete on public.budget_campagnes
  for delete using (tenant_id = get_user_company_id());

drop policy if exists section_governance_select on public.section_governance;
drop policy if exists section_governance_insert on public.section_governance;
drop policy if exists section_governance_update on public.section_governance;
drop policy if exists section_governance_delete on public.section_governance;
create policy section_governance_select on public.section_governance
  for select using (tenant_id = get_user_company_id());
create policy section_governance_insert on public.section_governance
  for insert with check (tenant_id = get_user_company_id());
create policy section_governance_update on public.section_governance
  for update using (tenant_id = get_user_company_id());
create policy section_governance_delete on public.section_governance
  for delete using (tenant_id = get_user_company_id());
