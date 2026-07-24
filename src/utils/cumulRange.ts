/**
 * Vision cumulée (CDC Analytique §8.1) : fenêtre de dates pour les vues
 * Exercice / Cumul YTD / 12 mois glissants, ancrée sur l'exercice de référence.
 *
 * Pour un exercice PASSÉ, « aujourd'hui » est ancré à la fin de l'exercice
 * (sinon YTD et 12 mois glissants seraient vides sur des données historiques).
 * `now` est injectable pour la testabilité.
 */
export type CumulView = 'exercice' | 'ytd' | 'glissant12';

export interface CumulViewDef { key: CumulView; label: string }
export const CUMUL_VIEWS: CumulViewDef[] = [
  { key: 'exercice', label: 'Exercice' },
  { key: 'ytd', label: 'Cumul YTD' },
  { key: 'glissant12', label: '12 mois glissants' },
];

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function cumulRange(view: CumulView, refYear: string | number, now: Date = new Date()): { from: string; to: string } {
  const y = (typeof refYear === 'number' ? refYear : parseInt(refYear, 10)) || now.getFullYear();
  const asOf = y < now.getFullYear() ? new Date(y, 11, 31) : now;
  if (view === 'exercice') return { from: `${y}-01-01`, to: `${y}-12-31` };
  if (view === 'ytd') return { from: `${y}-01-01`, to: iso(asOf) };
  const start = new Date(asOf);
  start.setMonth(start.getMonth() - 12);
  start.setDate(start.getDate() + 1);
  return { from: iso(start), to: iso(asOf) };
}
