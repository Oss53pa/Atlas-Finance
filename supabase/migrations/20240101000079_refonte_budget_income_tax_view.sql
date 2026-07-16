-- =============================================================================
-- Refonte OPEX/CAPEX — Cockpit analytique : impôt sur le résultat (classe 89)
-- Doc : docs/refonte-opex-capex/DESIGN.md (onglet « Overview », ligne Tax)
--
-- v_actual_exploitation ne couvre que les classes 6 et 7 => l'impôt sur le
-- résultat (compte 89, classe 8) en était absent et la ligne « Tax » du P&L
-- ressortait toujours à 0. Cette vue LIVE expose l'impôt par mois pour compléter
-- la cascade (Résultat net = Résultat avant impôt − Impôt). security_invoker
-- => RLS société du lecteur. Signe : impôt = débit − crédit (charge).
-- =============================================================================
create or replace view public.v_actual_income_tax
with (security_invoker = true) as
select
  jl.tenant_id,
  to_char(je.date, 'YYYY')          as annee,
  extract(month from je.date)::int  as period,
  sum(jl.debit - jl.credit)         as montant_impot
from journal_lines jl
join journal_entries je on je.id = jl.entry_id
where left(jl.account_code, 2) = '89'
  and je.status in ('validated', 'posted')
  and je.date is not null
group by jl.tenant_id, to_char(je.date, 'YYYY'), extract(month from je.date);
