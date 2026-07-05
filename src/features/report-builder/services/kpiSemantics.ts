/**
 * kpiSemantics — Sémantique métier des indicateurs pour la coloration des tendances.
 *
 * Une hausse n'est pas toujours « favorable » : pour une charge, une dette, un délai
 * de recouvrement ou un ratio d'endettement, une hausse est DÉFAVORABLE (rouge).
 * Ce module centralise la liste des KPI « à minimiser » (lower is better).
 */

/** Sources KPI où une valeur PLUS BASSE est meilleure (hausse = défavorable). */
const LOWER_IS_BETTER = new Set<string>([
  'kpi.charges',
  'kpi.dettes_fournisseurs',
  'kpi.creances_clients',
  'kpi.ratio_endettement',
  'kpi.debt_to_equity',
  'kpi.dso',
  'kpi.dpo',
  'kpi.tva_net_a_payer',
  'kpi.is_previsionnel',
  'kpi.cash_conversion_cycle',
  'kpi.working_capital_days',
  'kpi.bfr',
]);

/** Vrai si, pour cette source, une hausse est défavorable (à colorer en rouge). */
export function isLowerBetter(source?: string): boolean {
  if (!source) return false;
  return LOWER_IS_BETTER.has(source);
}

/**
 * À partir d'une direction de tendance et de la source, retourne si la variation est
 * favorable. `null` pour une tendance plate (neutre).
 */
export function isFavorableTrend(direction: 'up' | 'down' | 'flat', source?: string): boolean | null {
  if (direction === 'flat') return null;
  const lowerBetter = isLowerBetter(source);
  const rising = direction === 'up';
  return lowerBetter ? !rising : rising;
}
