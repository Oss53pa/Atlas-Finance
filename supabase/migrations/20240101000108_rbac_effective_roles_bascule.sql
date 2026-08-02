-- ============================================================================
-- Paramètres · Lot B·2 — PRÉPARATION de la bascule RBAC (phase 3).
--
-- CONSTAT (base live) : l'enforcement des routes est 100 % PAR RÔLE
-- (`RBACGuard allowedRoles` sur `profiles.role`) ; la chaîne de permissions
-- (`profiles.role_id` → `role_permissions`) N'EXISTE PAS → getUserPermissions()
-- retourne [] pour tous. La « bascule vers effective_permissions » est donc sans
-- objet. La vraie phase 3 = passer du rôle MONO-valué `profiles.role` au modèle
-- MULTI-rôles `user_role` (portée + délégation + fenêtre de validité).
--
-- Cette migration NE BASCULE RIEN. Elle fournit :
--   1. `effective_roles(user,tenant)` — union des rôles actifs & dans la fenêtre.
--   2. `my_effective_roles()` — self-only (pour AuthContext, sans param).
--   3. `rbac_role_delta(user)` — OBSERVATION serveur du delta legacy↔effective
--      (perd/gagne/aligned) pour piloter le « écart nul » avant tout switch.
-- L'enforcement effectif reste gouverné côté app par un flag défaut = 'legacy'.
-- ============================================================================

-- Union des rôles effectifs (helper interne ; non exposé aux clients).
create or replace function public.effective_roles(p_user uuid, p_tenant uuid)
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct role_code), '{}'::text[])
  from public.user_role ur
  where ur.user_id = p_user and ur.tenant_id = p_tenant and ur.actif
    and ur.valide_du <= current_date and (ur.valide_au is null or ur.valide_au >= current_date)
$$;

-- Self-only : les rôles effectifs de l'appelant dans son tenant courant.
create or replace function public.my_effective_roles()
returns text[] language sql stable security definer set search_path = public as $$
  select public.effective_roles(auth.uid(), get_user_company_id())
$$;

-- Observation du delta rôle legacy (profiles.role) ↔ effectif (user_role).
-- Self, ou admin du tenant pour auditer un autre utilisateur.
--   perd    = rôle legacy absent de l'effectif  → basculer RETIRERAIT l'accès (danger)
--   gagne   = rôles effectifs au-delà du legacy → basculer AJOUTERAIT l'accès
--   aligned = legacy couvert par l'effectif (aucun verrouillage à la bascule)
create or replace function public.rbac_role_delta(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare tid uuid := get_user_company_id(); leg text; eff text[];
begin
  if p_user <> auth.uid() and not exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.company_id = tid
  ) then raise exception 'Non autorisé : réservé à soi-même ou à un administrateur'; end if;
  select role into leg from public.profiles where id = p_user and company_id = tid;
  eff := public.effective_roles(p_user, tid);
  return jsonb_build_object(
    'legacy', leg,
    'effective', to_jsonb(eff),
    'perd',    case when leg is not null and not (leg = any(eff)) then to_jsonb(array[leg]) else '[]'::jsonb end,
    'gagne',   to_jsonb((select coalesce(array_agg(r), '{}'::text[]) from unnest(eff) r where leg is null or r <> leg)),
    'aligned', (leg is null or leg = any(eff))
  );
end $$;

revoke all on function public.effective_roles(uuid, uuid) from public, anon, authenticated;
revoke all on function public.my_effective_roles() from public, anon;
revoke all on function public.rbac_role_delta(uuid) from public, anon;
grant execute on function public.my_effective_roles() to authenticated;
grant execute on function public.rbac_role_delta(uuid) to authenticated;
