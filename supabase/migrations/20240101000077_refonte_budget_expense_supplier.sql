-- =============================================================================
-- Refonte OPEX/CAPEX — Cockpit analytique : dépense par fournisseur (live)
-- Doc : docs/refonte-opex-capex/DESIGN.md (onglet « Dépenses »)
--
-- Source RÉELLE de la dépense fournisseur = mouvements nets créditeurs sur les
-- comptes 40x (fournisseurs) portant un third_party_code, joints au libellé tiers.
-- Raison : sur ce tenant le third_party_code des lignes de CHARGES (classe 6) n'est
-- pas fiable (valeur unique), alors que la contrepartie 40x porte le vrai fournisseur
-- (70 tiers distincts). Vue LIVE recalculée du GL (aucun stockage), security_invoker
-- => la RLS société de journal_lines/journal_entries s'applique au lecteur.
--
-- Signe : dépense = crédit − débit sur 40x (une facture crédite le fournisseur ;
-- un règlement le débite) => solde net = ce qui reste engagé/facturé sur la période.
-- =============================================================================
create or replace view public.v_expense_by_supplier
with (security_invoker = true) as
select
  jl.tenant_id,
  to_char(je.date, 'YYYY')             as annee,
  extract(month from je.date)::int     as period,
  jl.third_party_code                  as code,
  coalesce(tp.name, jl.third_party_code) as fournisseur,
  sum(jl.credit - jl.debit)            as depense
from journal_lines jl
join journal_entries je on je.id = jl.entry_id
left join third_parties tp
  on tp.code = jl.third_party_code and tp.tenant_id = jl.tenant_id
where jl.account_code like '40%'
  and jl.third_party_code is not null
  and je.status in ('validated', 'posted')
  and je.date is not null
group by jl.tenant_id, to_char(je.date, 'YYYY'), extract(month from je.date),
         jl.third_party_code, coalesce(tp.name, jl.third_party_code);
