-- =====================================================================
-- Atlas FNA — Vue Réalisé par section analytique · CDC V3 §4 (étape 1)
-- =====================================================================
-- Attribution du réalisé par journal_lines.analytical_code (= sections_
-- analytiques.code). Les ventilations explicites (splits %) seront branchées
-- quand ventilations_analytiques sera peuplée. security_invoker = true.
-- =====================================================================

create or replace view public.v_actual_by_section with (security_invoker = true) as
select
  jl.tenant_id,
  jl.analytical_code               as section_code,
  to_char(je.date, 'YYYY')         as annee,
  extract(month from je.date)::int as period,
  left(jl.account_code, 1)         as classe,
  sum(case when left(jl.account_code,1) = '7' then jl.credit - jl.debit
           else jl.debit - jl.credit end) as montant
from journal_lines jl
join journal_entries je on je.id = jl.entry_id
where jl.analytical_code is not null and jl.analytical_code <> ''
  and je.status in ('validated','posted')
  and je.date is not null
group by jl.tenant_id, jl.analytical_code, to_char(je.date,'YYYY'),
         extract(month from je.date), left(jl.account_code,1);
