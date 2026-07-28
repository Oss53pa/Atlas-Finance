-- ============================================================================
-- Mode cabinet — agrégation KPI multi-dossiers (portefeuille cross-tenant)
--
-- Agrège en UNE requête les KPI comptables d'un ensemble de sociétés (les
-- dossiers du cabinet). Appelée par l'Edge Function `cabinet-portfolio`, qui a
-- DÉJÀ vérifié que l'utilisateur est membre de ces sociétés (user_companies).
--
-- SECURITY INVOKER : la fonction ne porte AUCUNE autorisation propre ; c'est
-- l'Edge Function (service_role, après contrôle d'appartenance) qui borne le
-- périmètre. Révoquée de anon/public pour qu'elle ne soit pas appelable avec
-- des ids arbitraires via l'API REST.
-- ============================================================================

create or replace function public.cabinet_portfolio_kpis(
  p_company_ids uuid[]
) returns table (
  tenant_id text,
  entries   bigint,
  last_date date,
  produits  numeric,
  charges   numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    je.tenant_id::text,
    count(distinct je.id)                                                        as entries,
    max(je.date)                                                                 as last_date,
    coalesce(sum(case when jl.account_code like '7%' then jl.credit - jl.debit else 0 end), 0)::numeric as produits,
    coalesce(sum(case when jl.account_code like '6%' then jl.debit - jl.credit else 0 end), 0)::numeric as charges
  from public.journal_lines jl
  join public.journal_entries je on je.id = jl.entry_id
  where je.tenant_id = any(p_company_ids)
    and je.status in ('validated','posted')
  group by je.tenant_id;
$$;

comment on function public.cabinet_portfolio_kpis(uuid[])
  is 'KPI comptables (écritures, dernière activité, produits, charges) agrégés par société. Autorisation bornée en amont par l''Edge Function cabinet-portfolio.';

revoke execute on function public.cabinet_portfolio_kpis(uuid[]) from public;
grant execute on function public.cabinet_portfolio_kpis(uuid[]) to service_role;
