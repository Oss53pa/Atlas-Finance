-- ============================================================================
-- Paramètres · Lot B·2 — SoD blocage dur + user_role multi/portée/délégation.
--
-- PHASES 1-2 SEULEMENT (non intrusif) : on crée le modèle canonique et le
-- BLOCAGE SoD SERVEUR à l'affectation ; on NE BASCULE PAS l'enforcement RBAC
-- (RBACGuard/AuthContext) — phase 3, à faire après une période d'observation à
-- écart nul (cf. design). profiles.role reste la source d'autorisation en usage.
-- ============================================================================

create table if not exists public.user_role (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  tenant_id uuid not null references public.societes(id) on delete cascade,
  role_code text not null,
  portee jsonb,                               -- {sites:[…], journaux:[…], sections:[…]}
  delegue_de uuid,                            -- délégation : de quel utilisateur
  valide_du date not null default current_date,
  valide_au date,
  actif boolean not null default true,
  cree_par uuid, created_at timestamptz not null default now()
);
-- Une affectation DIRECTE (hors délégation) unique par (user, tenant, rôle).
create unique index if not exists user_role_direct_uniq
  on public.user_role(user_id, tenant_id, role_code) where delegue_de is null;
create index if not exists idx_user_role_user on public.user_role(tenant_id, user_id) where actif;
alter table public.user_role enable row level security;
do $$ begin
  create policy ur_sel on public.user_role for select using (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;

create table if not exists public.sod_derogation (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.societes(id) on delete cascade,
  user_id uuid not null, permission_a text, permission_b text,
  motif text not null, valide_par uuid, le timestamptz not null default now()
);
alter table public.sod_derogation enable row level security;
do $$ begin
  create policy sod_der_sel on public.sod_derogation for select using (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;

-- Permissions d'un rôle (source relationnelle roles.permissions ; vide tant que
-- le RBAC n'est pas peuplé — le mécanisme reste correct).
create or replace function public.permissions_of_role(p_role text)
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct v), '{}'::text[])
  from public.roles r
  cross join lateral jsonb_array_elements_text(coalesce(r.permissions, '[]'::jsonb)) as v
  where r.name = p_role
$$;

-- Permissions EFFECTIVES d'un utilisateur : union des rôles actifs et dans la
-- fenêtre de validité (délégations incluses).
create or replace function public.effective_permissions(p_user uuid, p_tenant uuid)
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct perm), '{}'::text[])
  from public.user_role ur
  cross join lateral unnest(public.permissions_of_role(ur.role_code)) as perm
  where ur.user_id = p_user and ur.tenant_id = p_tenant and ur.actif
    and ur.valide_du <= current_date and (ur.valide_au is null or ur.valide_au >= current_date)
$$;

-- Affectation d'un rôle avec BLOCAGE DUR SoD (serveur). Dérogation = jsonb
-- {"permA|permB":"…","motif":"…"} qui lève un conflit précis, tracée.
create or replace function public.assign_user_role(p_user uuid, p_role text, p_portee jsonb, p_derogation jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare tid uuid := get_user_company_id(); perms text[]; c record; k text;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.company_id = tid) then
    raise exception 'Non autorisé : réservé aux administrateurs';
  end if;
  -- Union des permissions APRÈS ajout du rôle.
  perms := (select coalesce(array_agg(distinct x), '{}'::text[])
            from unnest(public.effective_permissions(p_user, tid) || public.permissions_of_role(p_role)) x);
  for c in select * from public.sod_conflit where permission_a = any(perms) and permission_b = any(perms) and severite = 'eleve' loop
    k := c.permission_a || '|' || c.permission_b;
    if p_derogation is null or not (p_derogation ? k) then
      raise exception 'Conflit SoD bloquant : % + % (%). Fournir une dérogation motivée pour passer outre.',
        c.permission_a, c.permission_b, coalesce(c.libelle, '');
    end if;
    insert into public.sod_derogation(tenant_id, user_id, permission_a, permission_b, motif, valide_par)
    values (tid, p_user, c.permission_a, c.permission_b, p_derogation->>'motif', auth.uid());
  end loop;
  insert into public.user_role(user_id, tenant_id, role_code, portee, cree_par)
  values (p_user, tid, p_role, p_portee, auth.uid())
  on conflict (user_id, tenant_id, role_code) where delegue_de is null do nothing;
  return jsonb_build_object('affecte', p_role, 'derogations', (p_derogation is not null));
end $$;

-- Backfill non intrusif : une ligne user_role par (utilisateur, rôle actuel).
insert into public.user_role(user_id, tenant_id, role_code)
select p.id, p.company_id, p.role
from public.profiles p
where p.company_id is not null and p.role is not null
  and exists (select 1 from public.societes s where s.id = p.company_id)
on conflict (user_id, tenant_id, role_code) where delegue_de is null do nothing;

revoke all on function public.permissions_of_role(text) from public, anon;
revoke all on function public.effective_permissions(uuid, uuid) from public, anon;
revoke all on function public.assign_user_role(uuid, text, jsonb, jsonb) from public, anon;
grant execute on function public.permissions_of_role(text) to authenticated;
grant execute on function public.effective_permissions(uuid, uuid) to authenticated;
grant execute on function public.assign_user_role(uuid, text, jsonb, jsonb) to authenticated;
