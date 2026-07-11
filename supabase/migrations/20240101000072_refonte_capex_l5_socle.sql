-- =============================================================================
-- Refonte OPEX/CAPEX — Lot 5 : socle CAPEX (Business Case structuré, CAR, projets)
-- Doc : docs/refonte-opex-capex/DESIGN.md §3.4 / Partie D
--
-- Additif & idempotent. Tenancy = tenant_id → societes (RLS get_user_company_id()).
-- La migration fna_*→tenant_id est PRÉPARÉE (ajout de colonne nullable) mais NON
-- basculée ici : le backfill exige une correspondance fna_org→societe à décider
-- (org_id ne mappe à aucun societes.id — cf. investigation). org_id conservé.
--
--   1. capex_requests étendue (BC 8 sections : sponsor, catégorie, obligatoire,
--      urgence, conditions, hash) + statut élargi
--   2. capex_bc_lignes_cout / capex_bc_cashflows / capex_bc_risques (satellites BC)
--   3. capex_scoring_criteres (priorisation §17)
--   4. capex_projets / capex_enveloppes / capex_reaffectations
--   5. fna_car / fna_capex_* : +tenant_id (préparation, nullable)
-- =============================================================================

-- 1. Business Case structuré --------------------------------------------------
alter table public.capex_requests
  add column if not exists demandeur_id      uuid references public.profiles(id),
  add column if not exists sponsor_id        uuid references public.profiles(id),
  add column if not exists obligatoire       boolean not null default false,
  add column if not exists urgence           boolean not null default false,
  add column if not exists urgence_sous_motif text,
  add column if not exists classe_immo       text,
  add column if not exists horizon_mois      int,
  add column if not exists conditions        jsonb,
  add column if not exists hash_sha256       text,
  add column if not exists urgence_regularise_le date;

alter table public.capex_requests drop constraint if exists capex_requests_statut_check;
alter table public.capex_requests add  constraint capex_requests_statut_check
  check (statut in ('demande','brouillon','soumis','en_priorisation','approuve',
                    'approuve_avec_conditions','ajourne','rejete','car_emis','fonds_disponibles','clos'));

-- 2. Satellites du Business Case ---------------------------------------------
create table if not exists public.capex_bc_lignes_cout (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.societes(id) on delete cascade,
  request_id   uuid not null references public.capex_requests(id) on delete cascade,
  type_cout    text not null check (type_cout in
    ('acquisition','travaux_installation','transport_douane','etudes_ingenierie',
     'formation','logiciel_licences','contingence','autres','opex_induit')),
  designation  text not null,
  montant      numeric(18,2) not null default 0,
  capitalisable boolean not null default true,
  exercice_id  uuid references public.fiscal_years(id),
  periode_prevue date,
  created_at   timestamptz not null default now()
);
create index if not exists capex_bc_cout_req on public.capex_bc_lignes_cout (request_id);

create table if not exists public.capex_bc_cashflows (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.societes(id) on delete cascade,
  request_id  uuid not null references public.capex_requests(id) on delete cascade,
  annee       int not null,                       -- année de l'horizon (1..N)
  type        text not null check (type in ('economie','revenu','cout_evite','valeur_residuelle','autre')),
  libelle     text,
  montant     numeric(18,2) not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists capex_bc_cf_req on public.capex_bc_cashflows (request_id);

create table if not exists public.capex_bc_risques (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.societes(id) on delete cascade,
  request_id  uuid not null references public.capex_requests(id) on delete cascade,
  risque      text not null,
  probabilite int not null check (probabilite between 1 and 5),
  impact      int not null check (impact between 1 and 5),
  mitigation  text,
  created_at  timestamptz not null default now()
);
create index if not exists capex_bc_risq_req on public.capex_bc_risques (request_id);

-- 3. Critères de priorisation (poids paramétrables) --------------------------
create table if not exists public.capex_scoring_criteres (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.societes(id) on delete cascade,
  critere    text not null,
  poids      numeric(6,4) not null default 0,
  actif      boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, critere)
);

-- 4. Projets, enveloppes, réaffectations -------------------------------------
create table if not exists public.capex_projets (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.societes(id) on delete cascade,
  request_id  uuid not null references public.capex_requests(id),
  car_id      uuid,                                -- fna_car.id (org_id) jusqu'à unification
  code        text not null,
  libelle     text not null,
  section_id  uuid references public.sections_analytiques(id),          -- direction/centre porteur
  section_analytique_projet_id uuid references public.sections_analytiques(id),  -- axe projet
  statut      text not null default 'en_execution'
    check (statut in ('en_execution','cloture_partielle','mis_en_service','annule')),
  date_debut  date,
  date_mise_en_service_cible date,
  date_mise_en_service_reelle date,
  created_at  timestamptz not null default now(),
  unique (tenant_id, code)
);

create table if not exists public.capex_enveloppes (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references public.societes(id) on delete cascade,
  fiscal_year_id       uuid not null references public.fiscal_years(id) on delete cascade,
  direction_section_id uuid references public.sections_analytiques(id),  -- null = société
  montant_vote         numeric(18,2) not null default 0,
  reserve_pct          numeric(6,4) not null default 0,
  created_at           timestamptz not null default now()
);
create index if not exists capex_env_fy on public.capex_enveloppes (tenant_id, fiscal_year_id);

create table if not exists public.capex_reaffectations (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.societes(id) on delete cascade,
  source_car_id   uuid,                            -- fna_car.id
  source_request_id uuid references public.capex_requests(id),
  cible_request_id  uuid references public.capex_requests(id),
  montant         numeric(18,2) not null,
  motif           text,
  avis_sponsor    text,
  statut          text not null default 'proposee' check (statut in ('proposee','approuvee','rejetee')),
  created_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now()
);

-- 5. Préparation fna_*→tenant_id (colonne additive, backfill ultérieur) -------
alter table public.fna_car                    add column if not exists tenant_id uuid references public.societes(id);
alter table public.fna_capex_approval         add column if not exists tenant_id uuid references public.societes(id);
alter table public.fna_capex_approval_matrix  add column if not exists tenant_id uuid references public.societes(id);
alter table public.fna_capex_pir              add column if not exists tenant_id uuid references public.societes(id);
alter table public.fna_capex_note             add column if not exists tenant_id uuid references public.societes(id);

-- 6. RLS pour les nouvelles tables tenant_id ---------------------------------
do $$
declare t text;
begin
  foreach t in array array['capex_bc_lignes_cout','capex_bc_cashflows','capex_bc_risques',
                           'capex_scoring_criteres','capex_projets','capex_enveloppes','capex_reaffectations']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format('drop policy if exists %I_insert on public.%I', t, t);
    execute format('drop policy if exists %I_update on public.%I', t, t);
    execute format('drop policy if exists %I_delete on public.%I', t, t);
    execute format('create policy %I_select on public.%I for select using (tenant_id = get_user_company_id())', t, t);
    execute format('create policy %I_insert on public.%I for insert with check (tenant_id = get_user_company_id())', t, t);
    execute format('create policy %I_update on public.%I for update using (tenant_id = get_user_company_id())', t, t);
    execute format('create policy %I_delete on public.%I for delete using (tenant_id = get_user_company_id())', t, t);
  end loop;
end $$;
