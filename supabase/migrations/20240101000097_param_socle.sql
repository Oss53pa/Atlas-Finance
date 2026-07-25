-- ============================================================================
-- Paramètres · Lot B·1 — Socle de résolution des paramètres (CDC Paramètres §1, §21-22).
--
-- Remplace le `settings` clé→valeur plat par un registre GOUVERNÉ :
--  - param_definition : catalogue (plateforme, lecture seule tenant).
--  - param_valeur     : valeurs typées, PORTÉE hiérarchique + EFFET DATÉ + statut.
--  - param_audit      : journal des changements, chaîné par hash.
--  - param_resolve(cle, as_of) : résolution portée la plus spécifique à la date.
--
-- SÉCURITÉ : param_resolve est SECURITY DEFINER et lit le tenant via
-- get_user_company_id() EN INTERNE — jamais via un paramètre p_tenant_id (gotcha
-- de fuite cross-tenant connu du projet).
-- ============================================================================

create table if not exists public.param_definition (
  id            uuid primary key default gen_random_uuid(),
  cle           text unique not null,
  module        text not null,
  libelle       text,
  description   text,
  type_valeur   text,                              -- string|number|bool|json|enum
  type_gouvernance text check (type_gouvernance in ('structurant','controle','operationnel','preference')),
  portee_min    text, portee_max text,             -- plateforme|groupe|societe|module|user
  surcharge_autorisee boolean not null default true,
  valeur_defaut jsonb,
  schema_validation jsonb,
  actif         boolean not null default true,
  created_at    timestamptz not null default now()
);
alter table public.param_definition enable row level security;
do $$ begin
  -- Catalogue plateforme : lisible par tous les tenants, écrit par migration/service_role.
  create policy param_def_sel on public.param_definition for select using (true);
exception when duplicate_object then null; end $$;

create table if not exists public.param_valeur (
  id            uuid primary key default gen_random_uuid(),
  definition_id uuid not null references public.param_definition(id) on delete cascade,
  tenant_id     uuid,                              -- null = valeur plateforme
  portee        text not null check (portee in ('plateforme','groupe','societe','module','user')),
  portee_ref_id uuid,
  valeur        jsonb not null,
  effet_du      date not null default current_date,
  effet_au      date,
  statut        text not null default 'actif' check (statut in ('brouillon','soumis','actif','historise')),
  cree_par      uuid, valide_par uuid, motif text, hash_chaine text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_param_valeur_def on public.param_valeur(definition_id, statut);
create index if not exists idx_param_valeur_tenant on public.param_valeur(tenant_id);
alter table public.param_valeur enable row level security;
do $$ begin
  create policy param_val_sel on public.param_valeur for select using (tenant_id is null or tenant_id = get_user_company_id());
  create policy param_val_ins on public.param_valeur for insert with check (tenant_id = get_user_company_id());
  create policy param_val_upd on public.param_valeur for update using (tenant_id = get_user_company_id());
  create policy param_val_del on public.param_valeur for delete using (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;

create table if not exists public.param_audit (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid,
  definition_cle text,
  avant         jsonb, apres jsonb,
  par           uuid, le timestamptz not null default now(),
  validateur    uuid, motif text,
  hash          text, hash_precedent text
);
alter table public.param_audit enable row level security;
do $$ begin
  create policy param_audit_sel on public.param_audit for select using (tenant_id is null or tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;

-- Journal chaîné : chaque changement de param_valeur → param_audit (hash md5 chaîné).
create or replace function public.param_audit_fn() returns trigger language plpgsql security definer as $$
declare prev text; cle text; tid uuid;
begin
  tid := coalesce(new.tenant_id, old.tenant_id);
  select hash into prev from public.param_audit where tenant_id is not distinct from tid order by le desc limit 1;
  select d.cle into cle from public.param_definition d where d.id = coalesce(new.definition_id, old.definition_id);
  insert into public.param_audit(tenant_id, definition_cle, avant, apres, par, hash_precedent, hash)
  values (
    tid, cle,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end,
    auth.uid(), prev,
    md5(coalesce(prev, '') || coalesce(to_jsonb(new)::text, '') || coalesce(to_jsonb(old)::text, ''))
  );
  return coalesce(new, old);
end $$;
do $$ begin
  create trigger param_valeur_audit after insert or update or delete on public.param_valeur
    for each row execute function public.param_audit_fn();
exception when duplicate_object then null; end $$;

-- Résolution : portée la plus spécifique, active à la date. Tenant interne.
create or replace function public.param_resolve(p_cle text, p_as_of date default current_date)
returns jsonb language sql stable security definer as $$
  select v.valeur
  from public.param_valeur v
  join public.param_definition d on d.id = v.definition_id
  where d.cle = p_cle and v.statut = 'actif'
    and v.effet_du <= p_as_of and (v.effet_au is null or v.effet_au > p_as_of)
    and (v.tenant_id is null or v.tenant_id = get_user_company_id())
  order by case v.portee
      when 'user' then 1 when 'module' then 2 when 'societe' then 3 when 'groupe' then 4 else 5 end,
    v.effet_du desc
  limit 1
$$;

-- Seed pilote : la tolérance « À QUALIFIER » de l'analytique (jusqu'ici en dur).
insert into public.param_definition (cle, module, libelle, type_valeur, type_gouvernance, portee_min, portee_max, surcharge_autorisee, valeur_defaut)
values
  ('ana.tolerance_qualification', 'analytique', 'Tolérance « À QUALIFIER » (% des charges de la période)', 'number', 'operationnel', 'plateforme', 'societe', true, '0.5'::jsonb),
  ('ana.tolerance_qualification_retro', 'analytique', 'Tolérance « À QUALIFIER » en run rétroactif (%)', 'number', 'operationnel', 'plateforme', 'societe', true, '2'::jsonb)
on conflict (cle) do nothing;
