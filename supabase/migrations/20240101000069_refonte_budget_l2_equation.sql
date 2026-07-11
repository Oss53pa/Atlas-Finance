-- =============================================================================
-- Refonte OPEX/CAPEX — Lot 2 : vue d'équation budgétaire
-- Doc : docs/refonte-opex-capex/DESIGN.md §4
--
-- Disponible = Budget(en vigueur) − Engagé(net, restant) − Réalisé(GL), à la maille
-- account_code × section_id × période. Choix : VUE LIVE (pas de MV à rafraîchir),
-- cohérent avec v_budget_vs_actual existante ; l'engagé restant est clampé à >=0
-- (GREATEST) — la surfacture ne rend jamais l'engagé négatif. security_invoker
-- => la RLS société de v_budget_vs_actual et budget_engagements s'applique au lecteur.
-- =============================================================================
create or replace view public.v_budget_execution
with (security_invoker = true) as
select
  bva.tenant_id,
  bva.fiscal_year_id,
  bva.annee,
  bva.budget_type,
  bva.account_code,
  bva.section_id,
  bva.period,
  bva.budget,
  coalesce(eng.engage_restant, 0)                                   as engage,
  bva.realise,
  bva.budget - coalesce(eng.engage_restant, 0) - bva.realise        as disponible,
  bva.ecart,
  bva.ecart_pct
from public.v_budget_vs_actual bva
left join lateral (
  select sum(greatest(e.montant_initial - e.montant_facture - e.montant_degage, 0)) as engage_restant
  from public.budget_engagements e
  where e.tenant_id = bva.tenant_id
    and e.account_code = bva.account_code
    and coalesce(e.section_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = coalesce(bva.section_id, '00000000-0000-0000-0000-000000000000'::uuid)
    and extract(year from e.periode)::text = bva.annee
    and extract(month from e.periode)::int = bva.period
    and e.statut in ('ouvert', 'partiellement_facture', 'surfacture')
) eng on true;
