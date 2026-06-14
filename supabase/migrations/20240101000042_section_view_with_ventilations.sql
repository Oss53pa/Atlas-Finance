-- =====================================================================
-- Atlas FNA — v_actual_by_section : ventilations prioritaires + repli code
-- CDC V3 §4 (étape 1 — ventilation). security_invoker = true.
-- =====================================================================
create or replace view public.v_actual_by_section with (security_invoker = true) as
-- 1) Lignes VENTILÉES explicitement (split %) → via la section liée
select
  jl.tenant_id, s.code as section_code,
  to_char(je.date, 'YYYY') as annee, extract(month from je.date)::int as period,
  left(jl.account_code, 1) as classe,
  sum( (case when left(jl.account_code,1) = '7' then jl.credit - jl.debit else jl.debit - jl.credit end)
       * coalesce(va.pourcentage, 100) / 100.0 ) as montant
from journal_lines jl
join journal_entries je on je.id = jl.entry_id
join ventilations_analytiques va on va.ligne_ecriture_id = jl.id
join sections_analytiques s on s.id = va.section_id
where je.status in ('validated','posted') and je.date is not null
group by jl.tenant_id, s.code, to_char(je.date,'YYYY'), extract(month from je.date), left(jl.account_code,1)
union all
-- 2) Lignes NON ventilées avec code analytique → repli analytical_code
select
  jl.tenant_id, jl.analytical_code as section_code,
  to_char(je.date, 'YYYY') as annee, extract(month from je.date)::int as period,
  left(jl.account_code, 1) as classe,
  sum(case when left(jl.account_code,1) = '7' then jl.credit - jl.debit else jl.debit - jl.credit end) as montant
from journal_lines jl
join journal_entries je on je.id = jl.entry_id
where jl.analytical_code is not null and jl.analytical_code <> ''
  and not exists (select 1 from ventilations_analytiques va2 where va2.ligne_ecriture_id = jl.id)
  and je.status in ('validated','posted') and je.date is not null
group by jl.tenant_id, jl.analytical_code, to_char(je.date,'YYYY'), extract(month from je.date), left(jl.account_code,1);
