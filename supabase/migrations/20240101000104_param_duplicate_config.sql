-- ============================================================================
-- Paramètres · Lot B·3 — Duplication de paramétrage société→société (CDC §3, critère #7).
--
-- Fonction SOUVERAINE (SECURITY DEFINER) : franchit la RLS pour copier la config
-- d'une société source vers une cible. AUTORISATION STRICTE : l'appelant doit
-- APPARTENIR AUX DEUX sociétés (user_companies). Copie uniquement des BLOCS PLATS
-- (paramètres hors portée user, conditions de paiement, sites) — jamais de
-- données vivantes (écritures, tiers, soldes) ni nominatives (utilisateurs,
-- signataires, comptes bancaires). Renvoie un rapport de copie (jsonb).
--
-- Le référentiel analytique (graphe d'ID plan→axe→section→règle) n'est PAS copié
-- ici (remapping d'ID = lot v2).
-- ============================================================================

create or replace function public.param_duplicate_config(p_source uuid, p_target uuid, p_blocks text[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid(); rep jsonb := '{}'::jsonb; n int;
begin
  if p_source is null or p_target is null or p_source = p_target then
    raise exception 'Source et cible invalides ou identiques';
  end if;
  if uid is null
     or not exists (select 1 from public.user_companies uc where uc.user_id = uid and uc.company_id = p_source)
     or not exists (select 1 from public.user_companies uc where uc.user_id = uid and uc.company_id = p_target) then
    raise exception 'Non autorisé : appartenance requise aux sociétés source et cible';
  end if;

  -- Bloc « paramètres » : valeurs actives hors portée utilisateur, non déjà présentes.
  if 'parametres' = any(p_blocks) then
    insert into public.param_valeur (definition_id, tenant_id, portee, portee_ref_id, valeur, effet_du, effet_au, statut, motif)
    select v.definition_id, p_target, v.portee, v.portee_ref_id, v.valeur, v.effet_du, v.effet_au, 'actif', 'duplication société'
    from public.param_valeur v
    where v.tenant_id = p_source and v.statut = 'actif' and v.portee <> 'user'
      and not exists (
        select 1 from public.param_valeur t
        where t.tenant_id = p_target and t.definition_id = v.definition_id and t.portee = v.portee and t.statut = 'actif');
    get diagnostics n = row_count; rep := rep || jsonb_build_object('parametres', n);
  end if;

  -- Bloc « conditions de paiement ».
  if 'conditions_paiement' = any(p_blocks) then
    insert into public.condition_paiement (tenant_id, code, libelle, jours, fin_de_mois, actif)
    select p_target, code, libelle, jours, fin_de_mois, actif from public.condition_paiement where tenant_id = p_source
    on conflict (tenant_id, code) do nothing;
    get diagnostics n = row_count; rep := rep || jsonb_build_object('conditions_paiement', n);
  end if;

  -- Bloc « sites ».
  if 'sites' = any(p_blocks) then
    insert into public.site (tenant_id, code, libelle, adresse, responsable, actif)
    select p_target, code, libelle, adresse, responsable, actif from public.site where tenant_id = p_source
    on conflict (tenant_id, code) do nothing;
    get diagnostics n = row_count; rep := rep || jsonb_build_object('sites', n);
  end if;

  return rep;
end $$;

-- N'exposer qu'aux utilisateurs authentifiés (le REVOKE FROM anon seul ne suffit
-- pas : EXECUTE est accordé à PUBLIC par défaut).
revoke all on function public.param_duplicate_config(uuid, uuid, text[]) from public;
revoke all on function public.param_duplicate_config(uuid, uuid, text[]) from anon;
grant execute on function public.param_duplicate_config(uuid, uuid, text[]) to authenticated;

-- Liste les sociétés de l'utilisateur courant (la RLS de societes ne renvoie que
-- la société active) — nécessaire pour choisir source & cible.
create or replace function public.list_my_companies()
returns table(id uuid, nom text, code text, role text)
language sql
security definer
set search_path = public
as $$
  select s.id, s.nom, s.code, uc.role
  from public.user_companies uc
  join public.societes s on s.id = uc.company_id
  where uc.user_id = auth.uid()
  order by s.nom
$$;
revoke all on function public.list_my_companies() from public;
revoke all on function public.list_my_companies() from anon;
grant execute on function public.list_my_companies() to authenticated;
