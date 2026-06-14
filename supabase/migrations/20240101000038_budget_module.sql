-- =====================================================================
-- Atlas FNA — Module Budget (recréation des tables) · CDC V3 §2 / §8
-- =====================================================================
-- CORRECTION CLÉ vs le brouillon du CDC :
--   La tenancy RÉELLE du stack live est `societes` (vérifié : journal_lines.
--   tenant_id REFERENCES societes(id), 10 319 lignes ; get_user_company_id()
--   renvoie un id de société). Le CDC référençait `public.tenants(id)` —
--   incorrect ici : les tables budget auraient été rattachées à la mauvaise
--   table et la RLS (tenant_id = get_user_company_id()) n'aurait jamais matché.
--   => tenant_id REFERENCES public.societes(id).
--
-- Aligné sur le réel :
--   • montants numeric(18,2)            -> identique à journal_lines.debit/credit
--   • RLS via get_user_company_id()     -> motif exact des tables existantes
--   • account_code text sans FK         -> convention journal_lines
--   • section_id -> sections_analytiques(id) (déjà présent, vide)
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 0. Retrait de l'amorce plate (vide — vérifié 0 ligne)
-- ---------------------------------------------------------------------
drop table if exists public.budget_lines cascade;

-- ---------------------------------------------------------------------
-- 1. budget_versions — scénarios budgétaires (1 active par exercice)
-- ---------------------------------------------------------------------
create table public.budget_versions (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.societes(id) on delete cascade,
  fiscal_year_id uuid not null references public.fiscal_years(id) on delete cascade,
  libelle        text not null,
  type           text not null default 'initial'
                   check (type in ('initial','revise','atterrissage')),
  statut         text not null default 'brouillon'
                   check (statut in ('brouillon','valide','verrouille')),
  is_active      boolean not null default false,
  validated_by   uuid references auth.users(id) on delete set null,
  validated_at   timestamptz,
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
comment on table public.budget_versions is
  'Versions budgétaires Atlas FNA. type=atterrissage => LFT (Latest Thinking Forecast).';

create unique index budget_versions_one_active
  on public.budget_versions (tenant_id, fiscal_year_id)
  where is_active;
create index budget_versions_tenant_fy
  on public.budget_versions (tenant_id, fiscal_year_id);

-- ---------------------------------------------------------------------
-- 2. budget_lines — lignes typées (exploitation / investissement)
-- ---------------------------------------------------------------------
create table public.budget_lines (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.societes(id) on delete cascade,
  version_id   uuid not null references public.budget_versions(id) on delete cascade,
  budget_type  text not null check (budget_type in ('exploitation','investissement')),
  account_code text not null,  -- réf. accounts.code (convention journal_lines, sans FK)
  section_id   uuid references public.sections_analytiques(id) on delete restrict,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint budget_lines_unique
    unique nulls not distinct (version_id, budget_type, account_code, section_id)
);
comment on table public.budget_lines is
  'Lignes budgétaires. Réalisé NON stocké ici : calculé par vues sur journal_lines.';

create index budget_lines_version on public.budget_lines (version_id);
create index budget_lines_tenant  on public.budget_lines (tenant_id);
create index budget_lines_account on public.budget_lines (tenant_id, account_code);

-- ---------------------------------------------------------------------
-- 3. budget_line_periods — phasage mensuel obligatoire (1..12)
-- ---------------------------------------------------------------------
create table public.budget_line_periods (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.societes(id) on delete cascade,
  budget_line_id uuid not null references public.budget_lines(id) on delete cascade,
  period         smallint not null check (period between 1 and 12),
  montant_prevu  numeric(18,2) not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint budget_line_periods_unique unique (budget_line_id, period)
);
comment on table public.budget_line_periods is
  'Montant budgété par mois. numeric(18,2) aligné sur journal_lines.';
create index budget_line_periods_line on public.budget_line_periods (budget_line_id);

-- ---------------------------------------------------------------------
-- 4. Immuabilité au verrouillage (CDC §2 / §7)
-- ---------------------------------------------------------------------
create or replace function public.budget_guard_locked_version()
returns trigger language plpgsql as $$
declare
  v_version uuid;
  v_statut  text;
begin
  if tg_table_name = 'budget_lines' then
    v_version := coalesce(new.version_id, old.version_id);
  else  -- budget_line_periods
    select bl.version_id into v_version
    from public.budget_lines bl
    where bl.id = coalesce(new.budget_line_id, old.budget_line_id);
  end if;

  select statut into v_statut from public.budget_versions where id = v_version;

  if v_statut = 'verrouille' then
    raise exception 'Version budgétaire verrouillée (%) : modification interdite.', v_version
      using errcode = 'check_violation';
  end if;

  return coalesce(new, old);
end $$;

create trigger budget_lines_lock_guard
  before insert or update or delete on public.budget_lines
  for each row execute function public.budget_guard_locked_version();
create trigger budget_line_periods_lock_guard
  before insert or update or delete on public.budget_line_periods
  for each row execute function public.budget_guard_locked_version();

-- ---------------------------------------------------------------------
-- 5. updated_at automatique
-- ---------------------------------------------------------------------
create or replace function public.budget_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger budget_versions_set_updated_at
  before update on public.budget_versions
  for each row execute function public.budget_set_updated_at();
create trigger budget_lines_set_updated_at
  before update on public.budget_lines
  for each row execute function public.budget_set_updated_at();
create trigger budget_line_periods_set_updated_at
  before update on public.budget_line_periods
  for each row execute function public.budget_set_updated_at();

-- ---------------------------------------------------------------------
-- 6. RLS — motif identique aux tables existantes (get_user_company_id())
-- ---------------------------------------------------------------------
alter table public.budget_versions     enable row level security;
alter table public.budget_lines        enable row level security;
alter table public.budget_line_periods enable row level security;

create policy budget_versions_select on public.budget_versions
  for select using (tenant_id = get_user_company_id());
create policy budget_versions_insert on public.budget_versions
  for insert with check (tenant_id = get_user_company_id());
create policy budget_versions_update on public.budget_versions
  for update using (tenant_id = get_user_company_id());
create policy budget_versions_delete on public.budget_versions
  for delete using (tenant_id = get_user_company_id());

create policy budget_lines_select on public.budget_lines
  for select using (tenant_id = get_user_company_id());
create policy budget_lines_insert on public.budget_lines
  for insert with check (tenant_id = get_user_company_id());
create policy budget_lines_update on public.budget_lines
  for update using (tenant_id = get_user_company_id());
create policy budget_lines_delete on public.budget_lines
  for delete using (tenant_id = get_user_company_id());

create policy budget_line_periods_select on public.budget_line_periods
  for select using (tenant_id = get_user_company_id());
create policy budget_line_periods_insert on public.budget_line_periods
  for insert with check (tenant_id = get_user_company_id());
create policy budget_line_periods_update on public.budget_line_periods
  for update using (tenant_id = get_user_company_id());
create policy budget_line_periods_delete on public.budget_line_periods
  for delete using (tenant_id = get_user_company_id());

commit;
