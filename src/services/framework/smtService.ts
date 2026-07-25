/**
 * Système Minimal de Trésorerie (SMT) — comptabilité de trésorerie.
 *
 * Pour les très petites entités (micro-entreprises SYSCOHADA, petites
 * associations SYCEBNL), la comptabilité est tenue en TRÉSORERIE : on ne suit
 * que les encaissements et décaissements. Le SMT produit deux états :
 *   - État des recettes et des dépenses (par nature, sur la période)
 *   - Situation de trésorerie (solde d'ouverture + recettes − dépenses = clôture)
 *
 * Dérivé des mouvements de trésorerie du GL (comptes de classe 5, hors virements
 * internes 58 et hors 59). Une RECETTE = entrée de trésorerie (débit d'un compte
 * de trésorerie) ; une DÉPENSE = sortie (crédit). La nature est donnée par la
 * contrepartie dominante de l'écriture.
 *
 * Source : glHelpers (loadGLEntries) — brouillons exclus.
 */

import type { DataAdapter } from '@atlas/data';
import { loadGLEntries, type GLEntry } from '../../features/financial/glHelpers';
import { getAccountLabel } from '../../utils/accountLabels';
import { money, Money } from '../../utils/money';

/** Compte de trésorerie SMT : classe 5 hors virements internes (58) et 59. */
export function isTreasuryAccount(code: string): boolean {
  const c = code || '';
  return c.startsWith('5') && !c.startsWith('58') && !c.startsWith('59');
}

const isANEntry = (e: GLEntry): boolean => e.journal === 'AN' || e.journal === 'RAN';

export interface SMTNatureLine {
  /** Compte de contrepartie (nature de la recette/dépense). */
  accountCode: string;
  label: string;
  amount: number;
}

export interface SMTStatement {
  startDate?: string;
  endDate?: string;
  soldeOuverture: number;
  recettes: SMTNatureLine[];
  depenses: SMTNatureLine[];
  totalRecettes: number;
  totalDepenses: number;
  /** Excédent (+) ou insuffisance (−) de trésorerie de la période. */
  variationTresorerie: number;
  soldeCloture: number;
  /** Contrôle : solde de clôture recalculé depuis TOUS les mouvements ≤ endDate. */
  soldeClotureControle: number;
  coherent: boolean;
}

/** Contrepartie dominante (plus gros montant hors trésorerie) d'une écriture. */
function dominantCounterpart(e: GLEntry): string {
  let best = '';
  let bestAmt = -1;
  for (const l of e.lines ?? []) {
    if (isTreasuryAccount(l.accountCode)) continue;
    const amt = Math.abs((l.debit || 0) - (l.credit || 0));
    if (amt > bestAmt) { bestAmt = amt; best = l.accountCode; }
  }
  return best || 'divers';
}

/** Solde de trésorerie net d'une écriture (Σ débit − crédit sur comptes 5x). */
function treasuryNet(e: GLEntry): number {
  let net = 0;
  for (const l of e.lines ?? []) {
    if (isTreasuryAccount(l.accountCode)) net += (l.debit || 0) - (l.credit || 0);
  }
  return net;
}

export async function buildSMTStatement(
  adapter: DataAdapter,
  range: { startDate?: string; endDate?: string } = {},
): Promise<SMTStatement> {
  const entries = await loadGLEntries(adapter as any); // brouillons exclus

  let soldeOuverture = money(0);
  let soldeClotureControle = money(0);
  const recettesByAccount = new Map<string, Money>();
  const depensesByAccount = new Map<string, Money>();

  for (const e of entries) {
    const net = treasuryNet(e);
    if (net === 0) continue; // écriture sans mouvement de trésorerie
    const date = e.date ?? '';
    const opening = isANEntry(e);

    // Solde d'ouverture = à-nouveau + tout mouvement AVANT la période.
    if (opening || (range.startDate && date < range.startDate)) {
      soldeOuverture = soldeOuverture.add(net);
    }
    // Contrôle de clôture = tout mouvement ≤ fin de période (AN inclus).
    if (opening || !range.endDate || date <= range.endDate) {
      soldeClotureControle = soldeClotureControle.add(net);
    }

    // Recettes/dépenses DE LA PÉRIODE (hors à-nouveau, dans les bornes).
    if (opening) continue;
    if (range.startDate && date < range.startDate) continue;
    if (range.endDate && date > range.endDate) continue;

    const nature = dominantCounterpart(e);
    if (net > 0) {
      recettesByAccount.set(nature, (recettesByAccount.get(nature) ?? money(0)).add(net));
    } else {
      depensesByAccount.set(nature, (depensesByAccount.get(nature) ?? money(0)).add(-net));
    }
  }

  const toLines = (m: Map<string, Money>): SMTNatureLine[] =>
    [...m.entries()]
      .map(([accountCode, amt]) => ({
        accountCode,
        label: getAccountLabel(accountCode) || accountCode,
        amount: amt.round(2).toNumber(),
      }))
      .filter(l => l.amount !== 0)
      .sort((a, b) => b.amount - a.amount);

  const recettes = toLines(recettesByAccount);
  const depenses = toLines(depensesByAccount);
  const totalRecettes = Money.sum(recettes.map(l => money(l.amount))).round(2).toNumber();
  const totalDepenses = Money.sum(depenses.map(l => money(l.amount))).round(2).toNumber();
  const variation = money(totalRecettes).subtract(totalDepenses).round(2).toNumber();
  const ouverture = soldeOuverture.round(2).toNumber();
  const cloture = money(ouverture).add(variation).round(2).toNumber();
  const controle = soldeClotureControle.round(2).toNumber();

  return {
    startDate: range.startDate,
    endDate: range.endDate,
    soldeOuverture: ouverture,
    recettes,
    depenses,
    totalRecettes,
    totalDepenses,
    variationTresorerie: variation,
    soldeCloture: cloture,
    soldeClotureControle: controle,
    coherent: money(cloture).equals(money(controle), 1),
  };
}

/** Export CSV de l'état des recettes et des dépenses. */
export function smtToCSV(s: SMTStatement): string {
  const rows: string[] = [
    '# État des recettes et des dépenses (SMT)',
    `# Période : ${s.startDate ?? ''} → ${s.endDate ?? ''}`,
    '',
    'Section;Compte;Libellé;Montant',
    `Solde d'ouverture;;;${s.soldeOuverture}`,
  ];
  for (const r of s.recettes) rows.push(`Recette;${r.accountCode};"${r.label.replace(/"/g, '""')}";${r.amount}`);
  rows.push(`;;TOTAL RECETTES;${s.totalRecettes}`);
  for (const d of s.depenses) rows.push(`Dépense;${d.accountCode};"${d.label.replace(/"/g, '""')}";${d.amount}`);
  rows.push(`;;TOTAL DÉPENSES;${s.totalDepenses}`);
  rows.push(`;;VARIATION;${s.variationTresorerie}`);
  rows.push(`Solde de clôture;;;${s.soldeCloture}`);
  return rows.join('\n');
}
