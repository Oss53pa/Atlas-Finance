-- ============================================================================
-- MVA — Moteur de Validation Atlas (Doc Maître Partie C, Lot 4, Vague A).
-- Un moteur, N objets validatables (contrat Validatable). Schéma public.wf_*
-- (préfixe, pas de schéma séparé → évite la config PostgREST). Souveraineté
-- serveur : tables SELECT-only tenant, écritures via Edge Functions service_role.
-- Montants bigint _xof. wf_event append-only + hash chaîné.
-- Cette vague : registre, définitions, étapes, règles de routage, instances,
-- tâches, événements, signatures, résolution de circuit + RLS + seed CRMC.
-- Différé (vagues suivantes) : wf_validator dynamique, wf_sod_rule table,
-- wf_delegation, wf_calendar, escalades SLA.
-- ============================================================================

-- Catalogue GLOBAL des objets validatables (métadonnées, mêmes pour tous).
create table if not exists public.wf_object_registry (
  object_type       text primary key,
  label             text not null,
  module_path       text,
  sensitivity       text not null default 'medium' check (sensitivity in ('low','medium','high','critical')),
  batchable         boolean not null default false,
  external_linkable boolean not null default true,
  active            boolean not null default true
);

-- Définition = un circuit versionné pour un type d'objet, propre au tenant.
create table if not exists public.wf_definition (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null,
  object_type  text not null references public.wf_object_registry(object_type),
  name         text not null,
  version      int  not null default 1,
  status       text not null default 'active' check (status in ('draft','active','archived')),
  is_default   boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (tenant_id, object_type, name, version)
);
create index if not exists idx_wf_def_lookup on public.wf_definition(tenant_id, object_type, status);

-- Étapes ordonnées d'une définition. required_role = désignation v1 (rôle).
create table if not exists public.wf_stage (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null,
  definition_id    uuid not null references public.wf_definition(id),
  position         int  not null,
  name             text,
  mode             text not null default 'ANY' check (mode in ('ANY','ALL','QUORUM')),
  quorum           int,
  required_role    text not null,
  sla_hours        int  not null default 24,
  signature_level  text not null default 'none' check (signature_level in ('none','otp','webauthn')),
  escalate_to_role text,
  reject_to_stage  int,
  created_at       timestamptz not null default now(),
  unique (definition_id, position)
);

-- Routage : sélectionne la définition selon des conditions sur le payload.
create table if not exists public.wf_rule (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null,
  object_type   text not null,
  conditions    jsonb not null default '{}',   -- {amount_xof:{gte,lt}, journal_code:{in:[]}, account_class:{in:[]}, flags:{contains:[]}}
  definition_id uuid not null references public.wf_definition(id),
  priority      int  not null default 100,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists idx_wf_rule_lookup on public.wf_rule(tenant_id, object_type, active, priority);

-- Instance = un dossier de validation d'un objet précis.
create table if not exists public.wf_instance (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null,
  object_type        text not null,
  object_id          text not null,
  object_hash        text not null,
  object_preview     jsonb not null default '{}',   -- bannette : titre, montant, lignes clés…
  definition_id      uuid not null references public.wf_definition(id),
  definition_version int  not null default 1,
  status             text not null default 'in_review'
    check (status in ('submitted','in_review','approved','applied','apply_failed','rejected','recalled','expired','invalidated_object_changed')),
  current_stage      int  not null default 1,
  submitted_by       text not null,
  priority           text not null default 'normal' check (priority in ('normal','urgent')),
  version            int  not null default 1,
  parent_instance_id uuid references public.wf_instance(id),
  created_at         timestamptz not null default now(),
  closed_at          timestamptz,
  unique (tenant_id, object_type, object_id, version)
);
create index if not exists idx_wf_instance_tenant on public.wf_instance(tenant_id, status);

-- Tâche = résolution d'une étape (parapheur/bannette).
create table if not exists public.wf_task (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null,
  instance_id   uuid not null references public.wf_instance(id),
  stage_id      uuid not null references public.wf_stage(id),
  position      int  not null,
  required_role text not null,
  sla_hours     int,
  due_at        timestamptz,
  status        text not null default 'waiting'
    check (status in ('waiting','pending','approved','rejected','info_requested','delegated','escalated','obsolete')),
  assignee_id   text,
  assignee_name text,
  resolved_from text,
  on_behalf_of  text,
  acted_via     text,
  motive_code   text,
  comment       text,
  signature_id  uuid,
  acted_at      timestamptz,
  created_at    timestamptz not null default now(),
  unique (instance_id, position)
);
create index if not exists idx_wf_task_bannette on public.wf_task(tenant_id, status, required_role);

-- Événements append-only, hash chaîné (piste d'audit).
create table if not exists public.wf_event (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null,
  instance_id uuid not null references public.wf_instance(id),
  event_type  text not null,
  actor_id    text,
  actor_kind  text not null default 'user' check (actor_kind in ('user','system','proph3t')),
  payload     jsonb not null default '{}',
  prev_hash   text,
  event_hash  text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_wf_event_instance on public.wf_event(instance_id, created_at);

create table if not exists public.wf_signature (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null,
  instance_id uuid not null references public.wf_instance(id),
  task_id     uuid,
  level       text not null,
  signer_id   text not null,
  signed_hash text not null,
  created_at  timestamptz not null default now()
);

-- ── Résolution du circuit (serveur, une fois à la soumission) ────────────────
-- Évalue les règles (priorité) contre le payload ; sinon la définition par défaut.
create or replace function public.wf_resolve_definition(p_tenant uuid, p_object_type text, p_payload jsonb)
returns uuid
language plpgsql
stable
as $$
declare
  r record;
  amt bigint := coalesce((p_payload->>'amount_xof')::bigint, 0);
  jcode text := p_payload->>'journal_code';
  aclass text := p_payload->>'account_class';
  flags jsonb := coalesce(p_payload->'flags', '[]'::jsonb);
  c jsonb;
  ok boolean;
begin
  for r in
    select * from public.wf_rule
    where tenant_id = p_tenant and object_type = p_object_type and active
    order by priority asc, created_at asc
  loop
    c := r.conditions;
    ok := true;
    if c ? 'amount_xof' then
      if (c->'amount_xof' ? 'gte') and amt < (c->'amount_xof'->>'gte')::bigint then ok := false; end if;
      if ok and (c->'amount_xof' ? 'lt') and amt >= (c->'amount_xof'->>'lt')::bigint then ok := false; end if;
    end if;
    if ok and (c ? 'journal_code') and (c->'journal_code' ? 'in') then
      if jcode is null or not (c->'journal_code'->'in' ? jcode) then ok := false; end if;
    end if;
    if ok and (c ? 'account_class') and (c->'account_class' ? 'in') then
      if aclass is null or not (c->'account_class'->'in' ? aclass) then ok := false; end if;
    end if;
    if ok and (c ? 'flags') and (c->'flags' ? 'contains') then
      if not (flags @> (c->'flags'->'contains')) then ok := false; end if;
    end if;
    if ok then return r.definition_id; end if;
  end loop;
  -- Défaut obligatoire par type.
  return (select id from public.wf_definition
          where tenant_id = p_tenant and object_type = p_object_type and status = 'active' and is_default
          order by version desc limit 1);
end;
$$;

-- ── RLS souveraine ───────────────────────────────────────────────────────────
alter table public.wf_object_registry enable row level security;
alter table public.wf_definition      enable row level security;
alter table public.wf_stage           enable row level security;
alter table public.wf_rule            enable row level security;
alter table public.wf_instance        enable row level security;
alter table public.wf_task            enable row level security;
alter table public.wf_event           enable row level security;
alter table public.wf_signature       enable row level security;

do $$ begin
  create policy wor_sel on public.wf_object_registry for select using (true);
  create policy wdef_sel on public.wf_definition for select using (tenant_id = get_user_company_id());
  create policy wst_sel  on public.wf_stage      for select using (tenant_id = get_user_company_id());
  create policy wr_sel   on public.wf_rule       for select using (tenant_id = get_user_company_id());
  create policy wi_sel   on public.wf_instance   for select using (tenant_id = get_user_company_id());
  create policy wt_sel   on public.wf_task       for select using (tenant_id = get_user_company_id());
  create policy we_sel   on public.wf_event      for select using (tenant_id = get_user_company_id());
  create policy wsig_sel on public.wf_signature  for select using (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;

revoke insert, update, delete on public.wf_definition, public.wf_stage, public.wf_rule,
  public.wf_instance, public.wf_task, public.wf_event, public.wf_signature, public.wf_object_registry
  from authenticated, anon;
