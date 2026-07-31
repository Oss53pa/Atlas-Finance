-- ============================================================================
-- Paramètres · Lot B·3 — Duplication du RÉFÉRENTIEL ANALYTIQUE (remapping d'ID).
--
-- Complète param_duplicate_config (blocs plats) : copie le graphe analytique
-- (plans → axes → sections → clés → règles) d'une société vers une autre, avec
-- REMAPPING des identifiants (les FK internes pointent vers les nouveaux ids).
-- Structure UNIQUEMENT — jamais les ventilations ni les runs (données vivantes).
--
-- Souveraine (SECURITY DEFINER), autorisation par appartenance aux deux sociétés.
-- Idempotence simple : ne copie que si la cible n'a encore aucun plan.
-- ============================================================================

create or replace function public.ana_duplicate_referentiel(p_source uuid, p_target uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid(); rec record; new_id uuid;
  n_plan int := 0; n_axe int := 0; n_sec int := 0; n_key int := 0; n_rule int := 0;
begin
  if p_source is null or p_target is null or p_source = p_target then
    raise exception 'Source et cible invalides ou identiques';
  end if;
  if uid is null
     or not exists (select 1 from public.user_companies uc where uc.user_id = uid and uc.company_id = p_source)
     or not exists (select 1 from public.user_companies uc where uc.user_id = uid and uc.company_id = p_target) then
    raise exception 'Non autorisé : appartenance requise aux sociétés source et cible';
  end if;
  if exists (select 1 from public.ana_plan where tenant_id = p_target) then
    return jsonb_build_object('skipped', 'la cible possède déjà des plans analytiques');
  end if;

  create temp table _mp (old uuid, new uuid) on commit drop; -- plans
  create temp table _ma (old uuid, new uuid) on commit drop; -- axes
  create temp table _ms (old uuid, new uuid) on commit drop; -- sections
  create temp table _mk (old uuid, new uuid) on commit drop; -- clés

  for rec in select * from public.ana_plan where tenant_id = p_source loop
    insert into public.ana_plan (tenant_id, code, libelle, statut) values (p_target, rec.code, rec.libelle, rec.statut) returning id into new_id;
    insert into _mp values (rec.id, new_id); n_plan := n_plan + 1;
  end loop;

  for rec in select * from public.axes_analytiques where tenant_id = p_source loop
    insert into public.axes_analytiques (tenant_id, code, libelle, type_axe, obligatoire, actif, conditionnel, regle_condition, plan_id)
    values (p_target, rec.code, rec.libelle, rec.type_axe, rec.obligatoire, rec.actif, rec.conditionnel, rec.regle_condition,
            (select new from _mp where old = rec.plan_id))
    returning id into new_id;
    insert into _ma values (rec.id, new_id); n_axe := n_axe + 1;
  end loop;

  for rec in select * from public.sections_analytiques where tenant_id = p_source loop
    insert into public.sections_analytiques (axe_id, tenant_id, code, libelle, responsable, budget_annuel, actif, nature, statut)
    values ((select new from _ma where old = rec.axe_id), p_target, rec.code, rec.libelle, rec.responsable, rec.budget_annuel, rec.actif, rec.nature, coalesce(rec.statut, 'active'))
    returning id into new_id;
    insert into _ms values (rec.id, new_id); n_sec := n_sec + 1;
  end loop;
  -- Remap de la hiérarchie parent_id (auto-référence).
  update public.sections_analytiques s set parent_id = (select new from _ms where old = src.parent_id)
  from public.sections_analytiques src, _ms m
  where m.new = s.id and src.id = m.old and src.parent_id is not null;

  for rec in select * from public.fna_allocation_key where tenant_id = p_source loop
    insert into public.fna_allocation_key (tenant_id, code, libelle, unite, actif) values (p_target, rec.code, rec.libelle, rec.unite, rec.actif) returning id into new_id;
    insert into _mk values (rec.id, new_id); n_key := n_key + 1;
  end loop;
  insert into public.fna_allocation_key_value (tenant_id, key_id, section_id, valeur)
  select p_target, (select new from _mk where old = v.key_id), (select new from _ms where old = v.section_id), v.valeur
  from public.fna_allocation_key_value v where v.tenant_id = p_source
    and exists (select 1 from _mk where old = v.key_id) and exists (select 1 from _ms where old = v.section_id);

  for rec in select * from public.fna_allocation_rule where tenant_id = p_source loop
    insert into public.fna_allocation_rule (tenant_id, type, ordre, compte_pattern, journal_pattern, libelle_pattern, tiers_pattern,
      section_id, key_id, source_section_id, actif, comportement, pct_variable, plan_id)
    values (p_target, rec.type, rec.ordre, rec.compte_pattern, rec.journal_pattern, rec.libelle_pattern, rec.tiers_pattern,
      (select new from _ms where old = rec.section_id), (select new from _mk where old = rec.key_id),
      (select new from _ms where old = rec.source_section_id), rec.actif, rec.comportement, rec.pct_variable,
      (select new from _mp where old = rec.plan_id));
    n_rule := n_rule + 1;
  end loop;

  return jsonb_build_object('plans', n_plan, 'axes', n_axe, 'sections', n_sec, 'cles', n_key, 'regles', n_rule);
end $$;

revoke all on function public.ana_duplicate_referentiel(uuid, uuid) from public;
revoke all on function public.ana_duplicate_referentiel(uuid, uuid) from anon;
grant execute on function public.ana_duplicate_referentiel(uuid, uuid) to authenticated;
