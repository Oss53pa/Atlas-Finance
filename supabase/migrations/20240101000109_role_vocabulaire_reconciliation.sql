-- ============================================================================
-- Paramètres · Lot B·2 — Réconciliation des vocabulaires de rôles (étape 1).
--
-- 3 vocabulaires incohérents coexistaient : profiles.role ({admin, client}),
-- roles.name ({accountant, admin, auditor, member, viewer}), user_role.role_code.
-- Le front (RBACGuard) parle un 4e vocabulaire canonique. Sans réconciliation, un
-- 'client' backfillé resterait 'client' — hors de tout allowedRoles → verrouillé.
--
-- Cette migration installe le vocabulaire CANONIQUE + un crosswalk source→canonique
-- + un normaliseur `canonical_role`, et CANONICALISE `effective_roles` /
-- `rbac_role_delta` pour que l'observation « écart nul » se fasse dans l'espace du
-- front. Décisions de mapping (2026-08-01) : client/auditor→viewer, member→user.
-- Additif : ne change AUCUN enforcement (RBACGuard reste en 'legacy' par défaut).
-- ============================================================================

create table if not exists public.role_canonical (
  code text primary key,
  rang int not null,
  libelle text
);
insert into public.role_canonical(code, rang, libelle) values
  ('super_admin',120,'Super administrateur'),
  ('admin',100,'Administrateur'),
  ('manager',80,'Manager'),
  ('comptable',60,'Comptable'),
  ('accountant',60,'Comptable (alias EN)'),
  ('user',40,'Utilisateur'),
  ('viewer',20,'Lecture seule')
on conflict (code) do nothing;

create table if not exists public.role_crosswalk (
  id uuid primary key default gen_random_uuid(),
  source_vocab text not null check (source_vocab in ('profiles','roles_name','user_role')),
  source_value text not null,
  canonical_role text not null references public.role_canonical(code),
  statut text not null default 'confirme' check (statut in ('confirme','a_trancher')),
  note text,
  unique(source_vocab, source_value)
);
insert into public.role_crosswalk(source_vocab, source_value, canonical_role, statut, note) values
  ('profiles','admin','admin','confirme',null),
  ('profiles','client','viewer','confirme','Décision 2026-08-01 : externe → lecture seule'),
  ('roles_name','admin','admin','confirme',null),
  ('roles_name','accountant','accountant','confirme',null),
  ('roles_name','viewer','viewer','confirme',null),
  ('roles_name','auditor','viewer','confirme','Auditeur = lecture seule'),
  ('roles_name','member','user','confirme','Membre = accès standard'),
  ('user_role','admin','admin','confirme',null)
on conflict (source_vocab, source_value) do nothing;

-- Référence non sensible : lecture ouverte aux authentifiés (écrans de gouvernance).
-- Écritures réservées au service_role / migrations (aucune policy write).
alter table public.role_canonical enable row level security;
alter table public.role_crosswalk enable row level security;
do $$ begin
  create policy rc_sel on public.role_canonical for select to authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy rx_sel on public.role_crosswalk for select to authenticated using (true);
exception when duplicate_object then null; end $$;

-- Normaliseur : valeur source → rôle canonique. Fallback = la valeur si elle est
-- déjà canonique ; sinon NULL (non résolu → exclu, jamais d'accès par défaut).
create or replace function public.canonical_role(p_vocab text, p_value text)
returns text language sql stable set search_path = public as $$
  select coalesce(
    (select canonical_role from public.role_crosswalk
     where source_vocab = p_vocab and source_value = p_value and statut = 'confirme'),
    (select code from public.role_canonical where code = p_value)
  )
$$;

-- effective_roles CANONICALISÉ (les role_code passent par le crosswalk).
create or replace function public.effective_roles(p_user uuid, p_tenant uuid)
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct cr), '{}'::text[]) from (
    select public.canonical_role('user_role', ur.role_code) as cr
    from public.user_role ur
    where ur.user_id = p_user and ur.tenant_id = p_tenant and ur.actif
      and ur.valide_du <= current_date and (ur.valide_au is null or ur.valide_au >= current_date)
  ) s where cr is not null
$$;

-- rbac_role_delta : legacy AUSSI canonicalisé, pour comparer dans le même espace.
create or replace function public.rbac_role_delta(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare tid uuid := get_user_company_id(); raw text; leg text; eff text[];
begin
  if p_user <> auth.uid() and not exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.company_id = tid
  ) then raise exception 'Non autorisé : réservé à soi-même ou à un administrateur'; end if;
  select role into raw from public.profiles where id = p_user and company_id = tid;
  leg := public.canonical_role('profiles', raw);
  eff := public.effective_roles(p_user, tid);
  return jsonb_build_object(
    'legacy_raw', raw,
    'legacy', leg,
    'effective', to_jsonb(eff),
    'perd',    case when leg is not null and not (leg = any(eff)) then to_jsonb(array[leg]) else '[]'::jsonb end,
    'gagne',   to_jsonb((select coalesce(array_agg(r), '{}'::text[]) from unnest(eff) r where leg is null or r <> leg)),
    'aligned', (leg is null or leg = any(eff))
  );
end $$;

revoke all on function public.canonical_role(text, text) from public, anon;
grant execute on function public.canonical_role(text, text) to authenticated;
revoke all on function public.effective_roles(uuid, uuid) from public, anon, authenticated;
revoke all on function public.rbac_role_delta(uuid) from public, anon;
grant execute on function public.rbac_role_delta(uuid) to authenticated;
