-- =============================================================================
-- Refonte OPEX/CAPEX — Lot 2 (engagements & liaison comptable)
-- Doc : docs/refonte-opex-capex/DESIGN.md §3.2 / §4 / §8
--
-- Cœur de l'équation budgétaire : Disponible = Budget − Engagé(net) − Réalisé(GL).
-- Migration additive & idempotente (appliquée en prod, mode défensif).
--
--   1. budget_engagements        registre pivot (externe + manuel), idempotence
--   2. engagement_rapprochements liaison N↔N écriture GL ↔ engagement
--   3. journal_lines.engagement_ref   référence PO/contrat saisie côté compta
--   4. procurement_mappings / procurement_inbox   connecteur achats externe
--   5. budget_checks             journal des appels Budget Check API
--   6. trigger de synchro montant_facture/statut (invariant 3 atomique)
--
-- Choix de conception : la SURFACTURE est autorisée (statut='surfacture', §3bis),
-- donc PAS de CHECK bloquant montant_initial-facture-degage>=0 ; l'engagé restant
-- est clampé à >=0 dans la vue d'équation (GREATEST). Tenancy = tenant_id/societes.
-- =============================================================================

-- 1. Registre des engagements -------------------------------------------------
create table if not exists public.budget_engagements (
  id                       uuid primary key default gen_random_uuid(),
  tenant_id                uuid not null references public.societes(id) on delete cascade,
  source                   text not null check (source in ('external','manuel')),
  external_ref             text,                          -- id PO externe (idempotence)
  account_code             text not null,
  section_id               uuid references public.sections_analytiques(id),
  capex_section_projet_id  uuid references public.sections_analytiques(id),
  periode                  date not null,                 -- 1er du mois d'imputation
  fournisseur_libelle      text,
  reference_document       text,                          -- n° PO / contrat / marché
  montant_initial          numeric(18,2) not null default 0,
  montant_facture          numeric(18,2) not null default 0,   -- bascule vers réalisé
  montant_degage           numeric(18,2) not null default 0,   -- reliquats libérés
  statut                   text not null default 'ouvert'
    check (statut in ('ouvert','partiellement_facture','solde','annule','surfacture')),
  motif                    text,                          -- obligatoire si source='manuel'
  contrat_recurrent        boolean not null default false,
  created_by               uuid references public.profiles(id),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
-- Idempotence des ingestions externes : (tenant, source, external_ref).
-- NULL external_ref (saisie manuelle) => lignes distinctes (NULL non unique en PG).
create unique index if not exists budget_engagements_idem
  on public.budget_engagements (tenant_id, source, external_ref)
  where external_ref is not null;
create index if not exists budget_engagements_maille
  on public.budget_engagements (tenant_id, account_code, section_id, periode);
create index if not exists budget_engagements_projet
  on public.budget_engagements (tenant_id, capex_section_projet_id) where capex_section_projet_id is not null;

-- 2. Rapprochements écriture GL ↔ engagement (N↔N) ----------------------------
create table if not exists public.engagement_rapprochements (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.societes(id) on delete cascade,
  journal_line_id uuid not null references public.journal_lines(id) on delete cascade,
  engagement_id  uuid not null references public.budget_engagements(id) on delete cascade,
  montant        numeric(18,2) not null,
  mode           text not null default 'saisie' check (mode in ('saisie','differe','lettrage')),
  created_at     timestamptz not null default now(),
  unique (journal_line_id, engagement_id)
);
create index if not exists engagement_rapp_eng on public.engagement_rapprochements (engagement_id);
create index if not exists engagement_rapp_line on public.engagement_rapprochements (journal_line_id);

-- 3. Référence d'engagement sur les écritures (non intrusif) -------------------
alter table public.journal_lines add column if not exists engagement_ref text;

-- 4. Connecteur achats externe ------------------------------------------------
create table if not exists public.procurement_mappings (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.societes(id) on delete cascade,
  kind          text not null check (kind in ('fournisseur','section','compte','projet')),
  external_code text not null,
  internal_ref  text not null,                 -- code section / compte / projet / tiers FNA
  created_at    timestamptz not null default now(),
  unique (tenant_id, kind, external_code)
);

create table if not exists public.procurement_inbox (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.societes(id) on delete cascade,
  external_ref        text,
  raw                 jsonb,
  fournisseur_libelle text,
  montant             numeric(18,2),
  periode             date,
  statut              text not null default 'a_qualifier'
    check (statut in ('a_qualifier','qualifie','rejete')),
  created_at          timestamptz not null default now()
);
create index if not exists procurement_inbox_statut on public.procurement_inbox (tenant_id, statut);

-- 5. Journal des contrôles de disponible (Budget Check API) -------------------
create table if not exists public.budget_checks (
  id                       uuid primary key default gen_random_uuid(),
  tenant_id                uuid not null references public.societes(id) on delete cascade,
  account_code             text not null,
  section_id               uuid references public.sections_analytiques(id),
  capex_section_projet_id  uuid references public.sections_analytiques(id),
  periode                  date not null,
  montant                  numeric(18,2) not null,
  decision                 text not null check (decision in ('ok','warning','blocked')),
  disponible               numeric(18,2),
  seuil_declencheur        text,
  reference                text,
  override_token           text,              -- délivré si dérogation approuvée (usage unique)
  override_consumed        boolean not null default false,
  created_by               uuid references public.profiles(id),
  created_at               timestamptz not null default now()
);
create index if not exists budget_checks_tenant on public.budget_checks (tenant_id, created_at desc);

-- 6. Synchro montant_facture / statut à partir des rapprochements -------------
-- Invariant 3 : bascule engagé→réalisé atomique. montant_facture = Σ rapprochements.
-- statut dérivé (surfacture si dépassement > tolérance 2 % ; solde si couvert ;
-- partiellement_facture si >0). N'écrase jamais 'annule'.
create or replace function public.budget_engagement_sync_facture() returns trigger
language plpgsql security definer set search_path to 'public' as $fn$
declare
  v_eng  uuid := coalesce(new.engagement_id, old.engagement_id);
  v_init numeric(18,2);
  v_deg  numeric(18,2);
  v_stat text;
  v_fact numeric(18,2);
begin
  select montant_initial, montant_degage, statut into v_init, v_deg, v_stat
    from public.budget_engagements where id = v_eng;
  if v_stat = 'annule' then
    return coalesce(new, old);
  end if;
  select coalesce(sum(montant), 0) into v_fact
    from public.engagement_rapprochements where engagement_id = v_eng;
  update public.budget_engagements
     set montant_facture = v_fact,
         statut = case
           when v_fact > v_init * 1.02 then 'surfacture'
           when (v_fact + coalesce(v_deg, 0)) >= v_init and v_init > 0 then 'solde'
           when v_fact > 0 then 'partiellement_facture'
           else 'ouvert'
         end,
         updated_at = now()
   where id = v_eng;
  return coalesce(new, old);
end $fn$;

drop trigger if exists engagement_rapp_sync on public.engagement_rapprochements;
create trigger engagement_rapp_sync
  after insert or update or delete on public.engagement_rapprochements
  for each row execute function public.budget_engagement_sync_facture();

-- updated_at sur budget_engagements (réutilise budget_set_updated_at si présent)
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
             where n.nspname='public' and p.proname='budget_set_updated_at') then
    drop trigger if exists set_updated_at on public.budget_engagements;
    create trigger set_updated_at before update on public.budget_engagements
      for each row execute function public.budget_set_updated_at();
  end if;
end $$;

-- 7. RLS — tenant_id = get_user_company_id() ----------------------------------
do $$
declare t text;
begin
  foreach t in array array['budget_engagements','engagement_rapprochements','procurement_mappings','procurement_inbox','budget_checks']
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
