-- ============================================================================
-- BASELINE capex_requests — « CAR simplifié » d'origine (parité repo↔prod).
--
-- CONTEXTE : la table capex_requests a été créée en prod hors migration versionnée,
-- puis ÉTENDUE par des fichiers de parité idempotents (046 stage-gate, 072 socle L5,
-- 081 priorité). Aucun CREATE TABLE ne la matérialisait dans le dépôt → un rebuild à
-- neuf échouait sur le premier `alter table capex_requests` (046).
--
-- Ce fichier reconstitue l'ÉTAT DE BASE (avant 046). Il est numéroté 045 pour trier
-- AVANT 20240101000046 : sur un environnement neuf il crée la table, puis 046/072/081
-- ajoutent leurs colonnes (tous en `add column if not exists`). Sur la prod existante,
-- `create table if not exists` est un no-op complet — rien n'est modifié.
--
-- Colonnes/contraintes ajoutées PLUS TARD (ne pas dupliquer ici) :
--   046 : reference, categorie, business_case, contingence_pct, taux_actualisation,
--         duree_vie_mois, cashflows, van, tri, payback_*, indice_profitabilite, roi,
--         test_capitalisation
--   072 : demandeur_id, sponsor_id, obligatoire, urgence, urgence_sous_motif,
--         classe_immo, horizon_mois, conditions, hash_sha256, urgence_regularise_le,
--         + élargissement du CHECK statut
--   081 : priorite (+ CHECK + index)
-- ============================================================================

create table if not exists public.capex_requests (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.societes(id) on delete cascade,
  fiscal_year_id      uuid references public.fiscal_years(id) on delete set null,
  libelle             text not null,
  account_code        text not null,
  section_id          uuid references public.sections_analytiques(id) on delete set null,
  montant             numeric(18,2) not null default 0,
  date_prevue         date,
  duree_amortissement integer not null default 0,
  methode             text not null default 'lineaire'
                        check (methode in ('lineaire','degressif')),
  valeur_residuelle   numeric(18,2) not null default 0,
  justification       text,
  -- CHECK statut volontairement omis : la contrainte capex_requests_statut_check est
  -- posée (et élargie) par la migration 072, qui fait drop-if-exists puis add.
  statut              text not null default 'demande',
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  montant_utilise     numeric(18,2) not null default 0,
  fonds_dispo_at      timestamptz
);

create index if not exists capex_requests_tenant_fy
  on public.capex_requests(tenant_id, fiscal_year_id);

alter table public.capex_requests enable row level security;

do $$ begin
  create policy capex_sel on public.capex_requests
    for select using (tenant_id = get_user_company_id());
  create policy capex_ins on public.capex_requests
    for insert with check (tenant_id = get_user_company_id());
  create policy capex_upd on public.capex_requests
    for update using (tenant_id = get_user_company_id());
  create policy capex_del on public.capex_requests
    for delete using (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;
