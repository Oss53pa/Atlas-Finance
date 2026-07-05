/**
 * dashboardMetrics — agrégats canoniques pour les tableaux de bord.
 *
 * Objectif : que TOUS les dashboards dérivent leurs KPI de la SOURCE UNIQUE
 * (`glHelpers`) au lieu de recalculer à la main — ce qui reproduisait partout les
 * mêmes erreurs (classe 58 incluse dans la trésorerie, classe 89 oubliée du résultat
 * net, statut `validated` non reconnu, période non filtrée).
 *
 * Règles encodées :
 *  - Brouillons (`status === 'draft'`) exclus ; `validated` ET `posted` comptés.
 *  - Filtrage par période réel (from/to sur la date d'écriture).
 *  - Produits = solde net créditeur cl.7 ; charges = solde net débiteur cl.6.
 *  - Résultat net = produits − charges − impôt (cl.89), cf. glHelpers.resultatNet.
 *  - Trésorerie = solde net cl.5 HORS 58 (virements internes en transit).
 */
import { makeGLHelpers, type GLEntry, type GLHelpers } from '../features/financial/glHelpers';

export interface DashboardPeriod {
  from?: string; // 'YYYY-MM-DD' inclus
  to?: string;   // 'YYYY-MM-DD' inclus
}

/** Écritures comptabilisées (hors brouillons), filtrées par période si fournie. */
export function filterPostedEntries(entries: any[], period?: DashboardPeriod): any[] {
  const posted = (entries || []).filter((e: any) => e && e.status !== 'draft');
  if (!period || (!period.from && !period.to)) return posted;
  return posted.filter((e: any) => {
    const d = String(e.date || e.createdAt || '').slice(0, 10);
    if (!d) return false;
    if (period.from && d < period.from) return false;
    if (period.to && d > period.to) return false;
    return true;
  });
}

/** Construit une plage de dates (from/to) pour un type de période courant. */
export function periodRange(kind: 'month' | 'quarter' | 'year' | 'all', now: Date = new Date()): DashboardPeriod {
  if (kind === 'all') return {};
  const y = now.getFullYear();
  const pad = (n: number) => String(n).padStart(2, '0');
  if (kind === 'year') return { from: `${y}-01-01`, to: `${y}-12-31` };
  if (kind === 'month') {
    const m = now.getMonth();
    const last = new Date(y, m + 1, 0).getDate();
    return { from: `${y}-${pad(m + 1)}-01`, to: `${y}-${pad(m + 1)}-${pad(last)}` };
  }
  // quarter
  const q = Math.floor(now.getMonth() / 3);
  const startM = q * 3;
  const endM = startM + 2;
  const last = new Date(y, endM + 1, 0).getDate();
  return { from: `${y}-${pad(startM + 1)}-01`, to: `${y}-${pad(endM + 1)}-${pad(last)}` };
}

export interface DashboardMetrics {
  ca: number;                 // produits (solde net créditeur cl.7)
  charges: number;            // charges (solde net débiteur cl.6)
  impots: number;             // impôt sur le résultat (net cl.89)
  resultatNet: number;        // ca − charges − impots
  resultatAvantImpot: number; // ca − charges
  margeNette: number;         // resultatNet / ca (0 si ca<=0)
  treasury: number;           // solde net cl.5 hors 58
  movementsDebit: number;     // volume brut des débits (indicateur d'activité)
  classNet: Record<string, number>; // solde net (d−c) par classe '1'..'9'
  count: number;              // nb écritures retenues
  h: GLHelpers;               // helpers glHelpers sur le jeu filtré (calculs bespoke)
}

/** Calcule les agrégats canoniques du dashboard sur les écritures (période optionnelle). */
export function computeDashboardMetrics(entries: any[], period?: DashboardPeriod): DashboardMetrics {
  const filtered = filterPostedEntries(entries, period);
  const h = makeGLHelpers(filtered as GLEntry[]);
  const ca = h.creditNet('7');
  const charges = h.net('6');
  const impots = h.net('89');
  const resultatNet = ca - charges - impots;
  const treasury = h.net('5') - h.net('58');

  let movementsDebit = 0;
  const classNet: Record<string, number> = {};
  for (const e of filtered) {
    for (const l of (e.lines || [])) {
      const debit = l.debit || 0;
      const credit = l.credit || 0;
      movementsDebit += debit;
      const cls = String(l.accountCode || '').charAt(0);
      if (cls >= '1' && cls <= '9') classNet[cls] = (classNet[cls] || 0) + debit - credit;
    }
  }

  return {
    ca,
    charges,
    impots,
    resultatNet,
    resultatAvantImpot: ca - charges,
    margeNette: ca > 0 ? (resultatNet / ca) * 100 : 0,
    treasury,
    movementsDebit,
    classNet,
    count: filtered.length,
    h,
  };
}
