-- ============================================================================
-- Bascule multi-sociétés côté session (mode cabinet)
--
-- Un utilisateur membre de plusieurs sociétés (user_companies) doit pouvoir
-- changer de DOSSIER ACTIF. Le tenant « certifié » utilisé par la RLS est
-- `profiles.company_id` (via get_user_company_id()). Basculer = mettre à jour
-- ce champ — mais UNIQUEMENT vers une société dont l'utilisateur est MEMBRE.
--
-- SECURITY DEFINER : la fonction met à jour profiles pour le compte de
-- l'utilisateur, mais applique d'abord la GARDE D'APPARTENANCE. Sans cette
-- garde côté serveur, un utilisateur pourrait pointer profiles.company_id vers
-- n'importe quelle société (escalade cross-tenant).
-- ============================================================================

create or replace function public.switch_active_company(
  p_company_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Non authentifié.';
  end if;

  -- GARDE D'APPARTENANCE : l'utilisateur doit être membre de la société cible.
  if not exists (
    select 1 from public.user_companies
    where user_id = v_uid and company_id = p_company_id
  ) then
    raise exception 'Accès refusé : vous n''êtes pas membre de cette société (%).', p_company_id
      using errcode = '42501';
  end if;

  update public.profiles set company_id = p_company_id where id = v_uid;
  return p_company_id;
end $$;

comment on function public.switch_active_company(uuid)
  is 'Bascule le dossier actif de l''utilisateur (profiles.company_id) vers une société dont il est membre. Garde d''appartenance côté serveur.';

-- Appelable uniquement par un utilisateur authentifié (jamais anon).
revoke execute on function public.switch_active_company(uuid) from public;
grant execute on function public.switch_active_company(uuid) to authenticated;
