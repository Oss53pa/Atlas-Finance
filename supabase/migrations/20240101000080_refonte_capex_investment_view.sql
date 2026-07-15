-- =============================================================================
-- Refonte OPEX/CAPEX — page « Investissement (CAPEX) » : exécution réelle (live)
-- Doc : docs/refonte-opex-capex/DESIGN.md (page CAPEX)
--
-- Mouvements de la classe 2 (immobilisations) par compte × mois, avec un drapeau
-- is_an distinguant les à-nouveaux (journal 'AN' = reprise des soldes d'ouverture)
-- du flux d'investissement de l'exercice. Deux lectures :
--   • PARC (stock, position courante) = TOUT (AN inclus) : brut 20-27, amort 28.
--   • FLUX CAPEX de l'année = hors AN uniquement (vraies acquisitions/sorties).
-- Vue LIVE, security_invoker => RLS société du lecteur. Signe = débit − crédit
-- (une acquisition débite l'immo ; l'amortissement crédite le 28 => montant négatif).
-- =============================================================================
create or replace view public.v_capex_investment
with (security_invoker = true) as
select
  jl.tenant_id,
  to_char(je.date, 'YYYY')          as annee,
  extract(month from je.date)::int  as period,
  jl.account_code,
  left(jl.account_code, 2)          as rubrique,
  (je.journal = 'AN')               as is_an,
  sum(jl.debit - jl.credit)         as montant
from journal_lines jl
join journal_entries je on je.id = jl.entry_id
where left(jl.account_code, 1) = '2'
  and je.status in ('validated', 'posted')
  and je.date is not null
group by jl.tenant_id, to_char(je.date, 'YYYY'), extract(month from je.date),
         jl.account_code, left(jl.account_code, 2), (je.journal = 'AN');
