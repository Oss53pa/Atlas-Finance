-- ============================================================================
-- Consolidation — balances par entité (agrégation cross-tenant)
--
-- Renvoie, pour un ensemble de sociétés (le périmètre de consolidation), le
-- solde SIGNÉ (débit − crédit) de chaque compte, écritures validées/postées.
-- Appelée par l'Edge Function `consolidation-balances`, qui a DÉJÀ vérifié que
-- l'utilisateur est membre de toutes les sociétés du périmètre.
--
-- SECURITY INVOKER : aucune autorisation propre ; le périmètre est borné en
-- amont par l'Edge Function (service_role après contrôle d'appartenance).
-- Révoquée d'anon.
-- ============================================================================

create or replace function public.consolidation_entity_balances(
  p_company_ids uuid[]
) returns table (
  tenant_id    text,
  account_code text,
  solde        numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    je.tenant_id::text,
    jl.account_code,
    coalesce(sum(jl.debit - jl.credit), 0)::numeric as solde
  from public.journal_lines jl
  join public.journal_entries je on je.id = jl.entry_id
  where je.tenant_id = any(p_company_ids)
    and je.status in ('validated','posted')
  group by je.tenant_id, jl.account_code
  having coalesce(sum(jl.debit - jl.credit), 0) <> 0;
$$;

comment on function public.consolidation_entity_balances(uuid[])
  is 'Solde signé (débit − crédit) par compte et par société, écritures validées. Périmètre borné par l''Edge Function consolidation-balances.';

revoke execute on function public.consolidation_entity_balances(uuid[]) from public;
grant execute on function public.consolidation_entity_balances(uuid[]) to service_role;
