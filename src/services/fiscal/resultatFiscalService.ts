/**
 * Moteur de détermination du résultat fiscal — Vague B (B1).
 *
 * Réf. docs/fiscal-dsf-multipays/DESIGN.md § B1
 *
 * LE PONT COMPTABLE → FISCAL, auditable ligne par ligne :
 *
 *   Résultat NET comptable de l'exercice     (glHelpers : creditNet('7') − net('6') − net('89'))
 *     + Σ réintégrations                     (charges non déductibles, DONT l'IS lui-même)
 *     ↑ on part du résultat NET (après IS) — convention du tableau de passage
 *       DGI — puis on réintègre l'IS (89) comme charge non déductible. Partir du
 *       résultat AVANT impôt double-compterait l'IS (il en est déjà exclu).
 *     − Σ déductions                         (produits non imposables)
 *     = Résultat fiscal avant déficits
 *     − Imputation déficits antérieurs       (plafonnée, N années selon le pays)
 *     = Résultat fiscal
 *     × taux IS                              (paramètre VERSIONNÉ)
 *     = IS théorique
 *     max( IS théorique , IMF )              (IMF = minimumRate × CA, borné)
 *     = IS dû
 *
 * Chaque réintégration/déduction porte son code, son libellé, sa base légale et
 * son origine (comptes GL agrégés ou saisie motivée). Le résultat alimente
 * directement le tableau de passage de la DSF (B2) et l'écriture d'impôt.
 *
 * S'appuie sur calculateIS (déjà multi-pays) en lui fournissant ENFIN des
 * entrées calculées au lieu de zéros.
 */

import type { DataAdapter } from '@atlas/data';
import { loadGLEntries, makeGLHelpers, resultatNet, type GLHelpers } from '../../features/financial/glHelpers';
import { money, Money } from '../../utils/money';
import { calculateIS, type ISResult } from '../../utils/isCalculation';
import {
  resolveFiscalParameters,
  type FiscalAdjustmentRule,
  type FiscalParameterSet,
} from './fiscalParameters';

// ============================================================================
// TYPES
// ============================================================================

/** Une ligne du tableau de passage comptable → fiscal. */
export interface FiscalAdjustmentLine {
  code: string;
  label: string;
  sense: 'reintegration' | 'deduction';
  legalBasis: string;
  amount: number;
  /** 'account' = dérivée du GL (calculée) ; 'manual' = saisie motivée. */
  origin: 'account' | 'manual';
  help?: string;
}

/** Montants manuels saisis par le comptable, par code d'ajustement. */
export type ManualAdjustments = Record<string, number>;

export interface DeterminationInput {
  countryCode: string;
  fiscalYear: number;
  /** Bornes de l'exercice (pour filtrer les écritures). */
  startDate?: string;
  endDate?: string;
  /** Déficits antérieurs reportables (montant positif). */
  deficitsAnterieurs?: number;
  /** Acomptes IS déjà versés. */
  acomptesVerses?: number;
  /** Montants des ajustements en saisie manuelle (code → montant). */
  manualAdjustments?: ManualAdjustments;
}

export interface ResultatFiscalResult {
  countryCode: string;
  fiscalYear: number;
  legalReference: string;
  parametersFallback: boolean;
  parametersWarning?: string;
  currency: string;

  /** Résultat NET comptable de l'exercice (après IS) — point de départ du passage. */
  resultatNetComptable: number;
  chiffreAffaires: number;

  reintegrations: FiscalAdjustmentLine[];
  deductions: FiscalAdjustmentLine[];
  totalReintegrations: number;
  totalDeductions: number;

  deficitsAnterieurs: number;
  deficitsImputes: number;

  resultatFiscal: number;
  tauxIS: number;
  impotTheorique: number;
  impotMinimumForfaitaire: number;
  impotDu: number;
  acomptesVerses: number;
  impotNet: number;
  acomptesTrimestriels: number;

  /** Résultat brut de calculateIS (Money) pour réutilisation aval. */
  isResult: ISResult;
}

// ============================================================================
// CALCUL D'UN AJUSTEMENT DÉRIVÉ DU GL
// ============================================================================

function computeAccountAdjustment(
  h: GLHelpers,
  rule: FiscalAdjustmentRule & { source: { kind: 'account' } },
): number {
  const { prefixes, side, portion } = rule.source;
  let raw: number;
  if (side === 'debit') {
    // Charges non déductibles : le cumul débiteur du poste.
    raw = h.net(...prefixes);
  } else if (side === 'credit') {
    raw = h.creditNet(...prefixes);
  } else {
    // 'solde' : valeur absolue du solde net (ex. charge d'IS en classe 89 =
    // solde débiteur ; on réintègre son montant positif).
    raw = Math.abs(h.net(...prefixes));
  }
  const amount = portion !== undefined ? raw * portion : raw;
  // On ne réintègre/déduit jamais un montant négatif : un poste vide = 0.
  return money(Math.max(0, amount)).round(2).toNumber();
}

// ============================================================================
// DÉTERMINATION
// ============================================================================

export async function determineResultatFiscal(
  adapter: DataAdapter,
  input: DeterminationInput,
): Promise<ResultatFiscalResult> {
  const resolution = resolveFiscalParameters(input.countryCode, input.fiscalYear);
  const params: FiscalParameterSet = resolution.parameters;

  // Écritures de l'exercice (brouillons exclus par loadGLEntries).
  let entries = await loadGLEntries(adapter as any);
  if (input.startDate && input.endDate) {
    entries = entries.filter(
      e => (e.date ?? '') >= input.startDate! && (e.date ?? '') <= input.endDate!,
    );
  }
  const h = makeGLHelpers(entries);

  // Point de départ = résultat NET comptable (après IS). Réintégrer l'IS (89)
  // le neutralise ensuite comme charge non déductible.
  const resultatComptable = money(resultatNet(h)).round(2).toNumber();
  const chiffreAffaires = money(h.creditNet('70')).round(2).toNumber();

  const manual = input.manualAdjustments ?? {};

  const reintegrations: FiscalAdjustmentLine[] = [];
  const deductions: FiscalAdjustmentLine[] = [];

  for (const rule of params.fiscalAdjustments) {
    const amount =
      rule.source.kind === 'account'
        ? computeAccountAdjustment(h, rule as any)
        : money(manual[rule.code] ?? 0).round(2).toNumber();

    // Une ligne à 0 dérivée d'un compte reste affichée (transparence du
    // tableau de passage) ; une ligne manuelle à 0 est simplement vide.
    if (rule.source.kind === 'manual' && amount === 0) continue;

    const line: FiscalAdjustmentLine = {
      code: rule.code,
      label: rule.label,
      sense: rule.sense,
      legalBasis: rule.legalBasis,
      amount,
      origin: rule.source.kind,
      help: rule.help,
    };
    (rule.sense === 'reintegration' ? reintegrations : deductions).push(line);
  }

  const totalReintegrations = Money.sum(reintegrations.map(l => money(l.amount))).round(2).toNumber();
  const totalDeductions = Money.sum(deductions.map(l => money(l.amount))).round(2).toNumber();

  // Délègue le calcul IS/IMF/déficits à calculateIS (déjà multi-pays et testé),
  // en lui fournissant les entrées ENFIN calculées.
  const isResult = calculateIS({
    countryCode: params.countryCode,
    resultatComptable,
    reintegrations: totalReintegrations,
    deductions: totalDeductions,
    deficitsAnterieurs: input.deficitsAnterieurs ?? 0,
    chiffreAffaires,
    acomptesVerses: input.acomptesVerses ?? 0,
  });

  // ⚠️ Cohérence des taux : calculateIS porte sa propre table IS_RATES. Si le
  // paramètre versionné diverge (loi de finances plus récente), on recalcule
  // l'impôt brut au taux VERSIONNÉ — la loi prime sur la constante historique.
  const resultatFiscal = isResult.resultatFiscal.toNumber();
  const impotTheorique = resultatFiscal > 0
    ? money(resultatFiscal).multiply(params.is.rateStandard / 100).round(2).toNumber()
    : 0;

  let imf = money(chiffreAffaires).multiply(params.is.minimumRate / 100).round(2).toNumber();
  if (imf < params.is.minimumFloor) imf = params.is.minimumFloor;
  if (params.is.minimumCap !== undefined && imf > params.is.minimumCap) imf = params.is.minimumCap;

  const impotDu = Math.max(impotTheorique, imf);
  const acomptesVerses = input.acomptesVerses ?? 0;
  const impotNet = money(impotDu).subtract(acomptesVerses).round(2).toNumber();

  return {
    countryCode: params.countryCode,
    fiscalYear: input.fiscalYear,
    legalReference: params.legalReference,
    parametersFallback: resolution.fallback,
    parametersWarning: resolution.warning,
    currency: params.currency,

    resultatNetComptable: resultatComptable,
    chiffreAffaires,

    reintegrations,
    deductions,
    totalReintegrations,
    totalDeductions,

    deficitsAnterieurs: input.deficitsAnterieurs ?? 0,
    deficitsImputes: isResult.deficitsImputes.toNumber(),

    resultatFiscal,
    tauxIS: params.is.rateStandard,
    impotTheorique,
    impotMinimumForfaitaire: imf,
    impotDu,
    acomptesVerses,
    impotNet,
    acomptesTrimestriels: money(impotDu).divide(4).round(0).toNumber(),

    isResult,
  };
}
