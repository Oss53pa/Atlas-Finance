-- =============================================================================
-- Refonte OPEX/CAPEX — Cockpit analytique : revenu par client (live)
-- Doc : docs/refonte-opex-capex/DESIGN.md (onglet « Revenus »)
--
-- Symétrique de v_expense_by_supplier. Source RÉELLE du revenu client =
-- mouvements nets débiteurs sur les comptes 41x (clients) portant un
-- third_party_code, joints au libellé tiers. Une facture client débite le 411 ;
-- un encaissement le crédite => solde net = revenu facturé restant sur la période.
-- Vue LIVE (aucun stockage), security_invoker => RLS société du lecteur.
-- =============================================================================
create or replace view public.v_revenue_by_client
with (security_invoker = true) as
select
  jl.tenant_id,
  to_char(je.date, 'YYYY')             as annee,
  extract(month from je.date)::int     as period,
  jl.third_party_code                  as code,
  coalesce(tp.name, jl.third_party_code) as client,
  sum(jl.debit - jl.credit)            as revenu
from journal_lines jl
join journal_entries je on je.id = jl.entry_id
left join third_parties tp
  on tp.code = jl.third_party_code and tp.tenant_id = jl.tenant_id
where jl.account_code like '41%'
  and jl.third_party_code is not null
  and je.status in ('validated', 'posted')
  and je.date is not null
group by jl.tenant_id, to_char(je.date, 'YYYY'), extract(month from je.date),
         jl.third_party_code, coalesce(tp.name, jl.third_party_code);
