/**
 * Dossier de révision par cycles (feuilles maîtresses) — mode cabinet.
 *
 * En OHADA, la majorité des PME ne tient pas sa comptabilité : un cabinet la
 * tient pour elle. Le travail de révision s'organise en CYCLES (regroupements de
 * comptes homogènes), chacun matérialisé par une « feuille maîtresse » : soldes
 * N et N-1, variation, et points d'attention à examiner.
 *
 * Ce service produit le dossier de révision d'un exercice, indépendamment d'une
 * session de clôture, et signale automatiquement les anomalies de bon sens
 * (client créditeur, fournisseur débiteur, caisse créditrice…).
 *
 * Source : glHelpers (loadGLEntries) — brouillons exclus, source unique.
 */

import type { DataAdapter } from '@atlas/data';
import { loadGLEntries, makeGLHelpers, type GLEntry, type GLHelpers } from '../../features/financial/glHelpers';
import { money, Money } from '../../utils/money';

export interface RevisionCycle {
  code: string;
  label: string;
  /** Préfixes de comptes rattachés au cycle. */
  prefixes: string[];
}

/** Cycles de révision SYSCOHADA (découpage cabinet standard). */
export const REVISION_CYCLES: RevisionCycle[] = [
  { code: 'CAP', label: 'Capitaux propres & financement', prefixes: ['10', '11', '12', '13', '14', '15', '16', '18', '19'] },
  { code: 'IMMO', label: 'Immobilisations', prefixes: ['20', '21', '22', '23', '24', '25', '26', '27', '28', '29'] },
  { code: 'STOCK', label: 'Stocks et en-cours', prefixes: ['3'] },
  { code: 'CLI', label: 'Clients & comptes rattachés', prefixes: ['41'] },
  { code: 'FRS', label: 'Fournisseurs & comptes rattachés', prefixes: ['40'] },
  { code: 'FISC_SOC', label: 'État, personnel & organismes sociaux', prefixes: ['42', '43', '44', '45'] },
  { code: 'AUTRES_TIERS', label: 'Autres tiers & régularisation', prefixes: ['46', '47', '48', '49'] },
  { code: 'TRESO', label: 'Trésorerie', prefixes: ['50', '51', '52', '53', '54', '55', '56', '57', '58', '59'] },
  { code: 'CHARGES', label: 'Charges', prefixes: ['6'] },
  { code: 'PRODUITS', label: 'Produits', prefixes: ['7'] },
];

export type CycleRevisionStatus = 'a_reviser' | 'en_cours' | 'revise' | 'anomalie';

export interface PointAttention {
  accountCode: string;
  message: string;
  amount: number;
  severity: 'info' | 'warning';
}

export interface CycleFeuilleMaitresse {
  code: string;
  label: string;
  /** Solde N signé (débit positif, crédit négatif). */
  soldeN: number;
  /** Solde N-1 signé (0 si exercice précédent non fourni). */
  soldeN1: number;
  variation: number;
  variationPct: number | null;
  nbComptes: number;
  pointsAttention: PointAttention[];
  status: CycleRevisionStatus;
  note?: string;
}

export interface RevisionDossier {
  exerciceLabel?: string;
  cycles: CycleFeuilleMaitresse[];
  /** Complétude = cycles révisés / total. */
  completion: number;
  generatedAt?: string;
}

interface CycleReviewState {
  status?: CycleRevisionStatus;
  note?: string;
}

const settingsKey = (exerciceId: string) => `revision_cycles_${exerciceId}`;

/** Solde net signé d'un ensemble de préfixes sur un jeu de helpers. */
function soldeCycle(h: GLHelpers, prefixes: string[]): number {
  return money(h.net(...prefixes)).round(2).toNumber();
}

/** Détecte les anomalies de sens par cycle (bon sens comptable). */
function detectPoints(cycle: RevisionCycle, entries: GLEntry[]): PointAttention[] {
  const points: PointAttention[] = [];
  // Solde par compte pour les cycles tiers/trésorerie (sens attendu connu).
  const wantSignChecks =
    cycle.code === 'CLI' || cycle.code === 'FRS' || cycle.code === 'TRESO';
  if (!wantSignChecks) return points;

  const soldeByAccount = new Map<string, number>();
  for (const e of entries) {
    for (const l of e.lines ?? []) {
      const code = l.accountCode || '';
      if (!cycle.prefixes.some(p => code.startsWith(p))) continue;
      soldeByAccount.set(code, (soldeByAccount.get(code) ?? 0) + (l.debit || 0) - (l.credit || 0));
    }
  }
  for (const [code, solde] of soldeByAccount) {
    const s = money(solde).round(2).toNumber();
    if (s === 0) continue;
    if (cycle.code === 'CLI' && s < 0) {
      points.push({ accountCode: code, amount: -s, severity: 'warning',
        message: 'Client créditeur — avance reçue ou avoir à examiner.' });
    } else if (cycle.code === 'FRS' && s > 0) {
      points.push({ accountCode: code, amount: s, severity: 'warning',
        message: 'Fournisseur débiteur — acompte versé ou avoir à examiner.' });
    } else if (cycle.code === 'TRESO' && !code.startsWith('58') && !code.startsWith('56') && s < 0) {
      // 56 = découvert/crédits de trésorerie ; 58 = virements internes.
      points.push({ accountCode: code, amount: -s, severity: 'warning',
        message: 'Compte de trésorerie créditeur — découvert non classé ou erreur.' });
    }
  }
  return points.sort((a, b) => b.amount - a.amount);
}

export async function buildRevisionDossier(
  adapter: DataAdapter,
  opts: {
    exerciceId: string;
    exerciceLabel?: string;
    currentRange: { startDate?: string; endDate?: string };
    priorRange?: { startDate?: string; endDate?: string };
  },
): Promise<RevisionDossier> {
  const all = await loadGLEntries(adapter as any);

  const inRange = (e: GLEntry, r?: { startDate?: string; endDate?: string }) => {
    if (!r) return true;
    const d = e.date ?? '';
    if (r.startDate && d < r.startDate) return false;
    if (r.endDate && d > r.endDate) return false;
    return true;
  };

  const currentEntries = all.filter(e => inRange(e, opts.currentRange));
  const hCurrent = makeGLHelpers(currentEntries);
  const hPrior = opts.priorRange ? makeGLHelpers(all.filter(e => inRange(e, opts.priorRange))) : null;

  // État de révision persisté (statut + note par cycle).
  let review: Record<string, CycleReviewState> = {};
  try {
    const row = await adapter.getById<{ value?: string }>('settings', settingsKey(opts.exerciceId));
    if (row?.value) review = JSON.parse(row.value);
  } catch { /* absent */ }

  const cycles: CycleFeuilleMaitresse[] = REVISION_CYCLES.map(c => {
    const soldeN = soldeCycle(hCurrent, c.prefixes);
    const soldeN1 = hPrior ? soldeCycle(hPrior, c.prefixes) : 0;
    const variation = money(soldeN).subtract(soldeN1).round(2).toNumber();
    const variationPct = soldeN1 !== 0 ? Math.round((variation / Math.abs(soldeN1)) * 1000) / 10 : null;
    const points = detectPoints(c, currentEntries);
    const nbComptes = new Set(
      currentEntries.flatMap(e => (e.lines ?? [])
        .map(l => l.accountCode || '')
        .filter(code => c.prefixes.some(p => code.startsWith(p)))),
    ).size;

    const saved = review[c.code] ?? {};
    // Statut par défaut : 'anomalie' si points d'attention non revus, sinon l'état sauvegardé.
    const status: CycleRevisionStatus =
      saved.status ?? (points.length > 0 ? 'anomalie' : 'a_reviser');

    return {
      code: c.code, label: c.label,
      soldeN, soldeN1, variation, variationPct,
      nbComptes, pointsAttention: points, status, note: saved.note,
    };
  });

  const revised = cycles.filter(c => c.status === 'revise').length;
  return {
    exerciceLabel: opts.exerciceLabel,
    cycles,
    completion: cycles.length ? Math.round((revised / cycles.length) * 100) : 0,
  };
}

/** Enregistre le statut/note de révision d'un cycle. */
export async function saveCycleReview(
  adapter: DataAdapter,
  exerciceId: string,
  cycleCode: string,
  state: CycleReviewState,
): Promise<void> {
  const key = settingsKey(exerciceId);
  let review: Record<string, CycleReviewState> = {};
  const existing = await adapter.getById<{ value?: string }>('settings', key).catch(() => null);
  if (existing?.value) { try { review = JSON.parse(existing.value); } catch { /* reset */ } }
  review[cycleCode] = { ...review[cycleCode], ...state };
  const now = new Date().toISOString();
  if (existing) {
    await adapter.update('settings', key, { key, value: JSON.stringify(review), updatedAt: now } as any);
  } else {
    await adapter.create('settings', { key, value: JSON.stringify(review), updatedAt: now } as any);
  }
}

/** Export CSV des feuilles maîtresses. */
export function revisionDossierToCSV(d: RevisionDossier): string {
  const head = ['Cycle', 'Solde N', 'Solde N-1', 'Variation', 'Var %', 'Comptes', "Points d'attention", 'Statut'].join(';');
  const rows = d.cycles.map(c =>
    [`"${c.label}"`, c.soldeN, c.soldeN1, c.variation, c.variationPct ?? '', c.nbComptes, c.pointsAttention.length, c.status].join(';'),
  );
  return ['# Dossier de révision — feuilles maîtresses par cycle', head, ...rows].join('\n');
}
