-- =====================================================================
-- Atlas FNA — Vues RÉALISÉ (budget vs réel) · CDC V3 §4
-- =====================================================================
-- Recalcul LIVE depuis journal_lines (aucun stockage de réalisé).
-- security_invoker = true  => la RLS par société (tenant_id) s'applique au
-- lecteur (sinon une vue exposerait toutes les sociétés). Tenancy = societes.
--
-- Vérifié sur la base live : classe 7 = 884 238 590, classe 6 = 816 889 007
-- (résultat 67 349 583) — concordant avec le Grand Livre.
-- =====================================================================

create or replace view public.v_actual_exploitation with (security_invoker = true) as
select
  jl.tenant_id,
  to_char(je.date, 'YYYY')              as annee,
  extract(month from je.date)::int      as period,
  jl.account_code,
  left(jl.account_code, 1)              as classe,
  coalesce(a.name, jl.account_name)     as account_name,
  sum(case when left(jl.account_code,1) = '7' then jl.credit - jl.debit
           else jl.debit - jl.credit end) as montant_realise
from journal_lines jl
join journal_entries je on je.id = jl.entry_id
left join accounts a on a.code = jl.account_code and a.tenant_id = jl.tenant_id
where left(jl.account_code,1) in ('6','7')
  and je.status in ('validated','posted')
  and je.date is not null
group by jl.tenant_id, to_char(je.date,'YYYY'), extract(month from je.date),
         jl.account_code, coalesce(a.name, jl.account_name);

create or replace view public.v_actual_investment with (security_invoker = true) as
select
  jl.tenant_id,
  to_char(je.date, 'YYYY')          as annee,
  extract(month from je.date)::int  as period,
  jl.account_code,
  coalesce(a.name, jl.account_name) as account_name,
  sum(jl.debit - jl.credit)         as montant_realise
from journal_lines jl
join journal_entries je on je.id = jl.entry_id
left join accounts a on a.code = jl.account_code and a.tenant_id = jl.tenant_id
where left(jl.account_code,1) = '2'
  and je.status in ('validated','posted')
  and je.date is not null
group by jl.tenant_id, to_char(je.date,'YYYY'), extract(month from je.date),
         jl.account_code, coalesce(a.name, jl.account_name);

create or replace view public.v_actual_treasury with (security_invoker = true) as
select
  jl.tenant_id,
  to_char(je.date, 'YYYY')          as annee,
  extract(month from je.date)::int  as period,
  sum(jl.debit)                     as encaissements,
  sum(jl.credit)                    as decaissements,
  sum(jl.debit - jl.credit)         as flux_net
from journal_lines jl
join journal_entries je on je.id = jl.entry_id
where left(jl.account_code,1) = '5'
  and je.status in ('validated','posted')
  and je.date is not null
group by jl.tenant_id, to_char(je.date,'YYYY'), extract(month from je.date);

create or replace view public.v_budget_vs_actual with (security_invoker = true) as
select
  bv.tenant_id,
  bv.fiscal_year_id,
  fy.code            as annee,
  bl.budget_type,
  bl.account_code,
  bl.section_id,
  blp.period,
  blp.montant_prevu                                   as budget,
  coalesce(ae.montant_realise, ai.montant_realise, 0) as realise,
  coalesce(ae.montant_realise, ai.montant_realise, 0) - blp.montant_prevu as ecart,
  case when blp.montant_prevu <> 0
       then round((coalesce(ae.montant_realise, ai.montant_realise, 0) - blp.montant_prevu)
                  / abs(blp.montant_prevu) * 100, 2)
       else null end as ecart_pct
from budget_versions bv
join fiscal_years fy on fy.id = bv.fiscal_year_id
join budget_lines bl on bl.version_id = bv.id
join budget_line_periods blp on blp.budget_line_id = bl.id
left join v_actual_exploitation ae
  on bl.budget_type = 'exploitation'
 and ae.tenant_id = bv.tenant_id and ae.account_code = bl.account_code
 and ae.period = blp.period and ae.annee = fy.code
left join v_actual_investment ai
  on bl.budget_type = 'investissement'
 and ai.tenant_id = bv.tenant_id and ai.account_code = bl.account_code
 and ai.period = blp.period and ai.annee = fy.code
where bv.is_active;
