import type { DataAdapter } from '@atlas/data';
import { getActualExploitation, getBudgetVsActual } from './budgetService';

/**
 * Compte de résultat budgétaire — P&L de gestion (refonte OPEX/CAPEX — Lot 4, §14.2).
 *
 * Assemble produits (classe 7) et charges (classe 6) en cascade SYSCOHADA de gestion :
 * Marge sur coûts directs → EBE de gestion → Résultat de gestion. Budget vs Réalisé
 * vs N-1, à un périmètre donné. Le réalisé vient du GL (v_actual_exploitation, tout
 * compte), le budget des lignes budgétaires (v_budget_vs_actual). Zéro calcul LLM.
 *
 * Convention : chaque ligne porte une valeur SIGNÉE = contribution au résultat
 * (produits +, charges −). Les sous-totaux se somment donc trivialement, et un écart
 * est FAVORABLE dès que réalisé > budget (uniformément).
 */

export type PnLLevel = 'rubric' | 'subtotal' | 'total';

export interface PnLLine {
  key: string;
  label: string;
  level: PnLLevel;
  budget: number;    // signé (contribution au résultat)
  realise: number;   // signé
  n1: number;        // signé
}

interface RubricDef { key: string; label: string; prefixes: string[]; sign: 1 | -1; }

const RUBRICS: RubricDef[] = [
  { key: 'produits', label: 'Produits (70-77)', prefixes: ['70', '71', '72', '73', '74', '75', '76', '77'], sign: 1 },
  { key: 'achats', label: 'Achats & services extérieurs (60-62)', prefixes: ['60', '61', '62'], sign: -1 },
  { key: 'impots', label: 'Impôts et taxes (63)', prefixes: ['63'], sign: -1 },
  { key: 'personnel', label: 'Charges de personnel (64)', prefixes: ['64'], sign: -1 },
  { key: 'autres', label: 'Autres charges (65)', prefixes: ['65'], sign: -1 },
  { key: 'dotations', label: 'Dotations (68)', prefixes: ['68'], sign: -1 },
  { key: 'charges_fin', label: 'Charges financières (66)', prefixes: ['66'], sign: -1 },
];

const sumByPrefixes = (byAccount: Map<string, number>, prefixes: string[]): number => {
  let s = 0;
  for (const [code, v] of byAccount) if (prefixes.some((p) => code.startsWith(p))) s += v;
  return s;
};

export interface PnLBudgetResult {
  annee: string;
  lines: PnLLine[];
}

/**
 * Calcule le P&L de gestion de l'exercice `annee`.
 * @param sectionId optionnel — restreint le budget à un centre (le réalisé reste
 *   global tant qu'une vue réalisé par compte×section n'existe pas ; documenté).
 */
export async function computePnLBudget(adapter: DataAdapter, annee: string): Promise<PnLBudgetResult> {
  const [actual, actualN1, bva] = await Promise.all([
    getActualExploitation(adapter, annee),
    getActualExploitation(adapter, String(Number(annee) - 1)),
    getBudgetVsActual(adapter),
  ]);

  const realiseByAccount = new Map<string, number>();
  for (const r of actual) realiseByAccount.set(r.account_code, (realiseByAccount.get(r.account_code) || 0) + r.montant_realise);
  const n1ByAccount = new Map<string, number>();
  for (const r of actualN1) n1ByAccount.set(r.account_code, (n1ByAccount.get(r.account_code) || 0) + r.montant_realise);
  const budgetByAccount = new Map<string, number>();
  for (const b of bva) if (b.annee === annee && b.budget_type === 'exploitation') budgetByAccount.set(b.account_code, (budgetByAccount.get(b.account_code) || 0) + b.budget);

  // valeurs signées par rubrique
  const val = (r: RubricDef) => ({
    budget: r.sign * sumByPrefixes(budgetByAccount, r.prefixes),
    realise: r.sign * sumByPrefixes(realiseByAccount, r.prefixes),
    n1: r.sign * sumByPrefixes(n1ByAccount, r.prefixes),
  });
  const R: Record<string, { budget: number; realise: number; n1: number }> = {};
  for (const r of RUBRICS) R[r.key] = val(r);

  const add = (...keys: string[]) => keys.reduce((acc, k) => ({
    budget: acc.budget + R[k].budget, realise: acc.realise + R[k].realise, n1: acc.n1 + R[k].n1,
  }), { budget: 0, realise: 0, n1: 0 });

  const marge = add('produits', 'achats');
  const ebe = { budget: marge.budget + R.impots.budget + R.personnel.budget + R.autres.budget,
                realise: marge.realise + R.impots.realise + R.personnel.realise + R.autres.realise,
                n1: marge.n1 + R.impots.n1 + R.personnel.n1 + R.autres.n1 };
  const resultat = { budget: ebe.budget + R.dotations.budget + R.charges_fin.budget,
                     realise: ebe.realise + R.dotations.realise + R.charges_fin.realise,
                     n1: ebe.n1 + R.dotations.n1 + R.charges_fin.n1 };

  const L = (key: string, label: string, level: PnLLevel, v: { budget: number; realise: number; n1: number }): PnLLine =>
    ({ key, label, level, budget: round2(v.budget), realise: round2(v.realise), n1: round2(v.n1) });

  const lines: PnLLine[] = [
    L('produits', RUBRICS[0].label, 'rubric', R.produits),
    L('achats', RUBRICS[1].label, 'rubric', R.achats),
    L('marge', 'Marge sur coûts directs', 'subtotal', marge),
    L('impots', RUBRICS[2].label, 'rubric', R.impots),
    L('personnel', RUBRICS[3].label, 'rubric', R.personnel),
    L('autres', RUBRICS[4].label, 'rubric', R.autres),
    L('ebe', 'EBE de gestion', 'subtotal', ebe),
    L('dotations', RUBRICS[5].label, 'rubric', R.dotations),
    L('charges_fin', RUBRICS[6].label, 'rubric', R.charges_fin),
    L('resultat', 'Résultat de gestion', 'total', resultat),
  ];
  return { annee, lines };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
