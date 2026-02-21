/**
 * Impôt sur les Sociétés (IS) — Zone OHADA
 * Calcul du résultat fiscal et de l'IS selon la législation de chaque pays.
 */
import { Money, money, percentage } from './money';

/** IS rates by OHADA country code */
const IS_RATES: Record<string, number> = {
  CI: 25,   // Côte d'Ivoire 25%
  SN: 30,   // Sénégal 30%
  CM: 33,   // Cameroun 33%
  GA: 30,   // Gabon 30%
  BF: 27.5, // Burkina Faso 27.5%
  ML: 30,   // Mali 30%
  NE: 30,   // Niger 30%
  TG: 27,   // Togo 27%
  BJ: 30,   // Bénin 30%
  GN: 25,   // Guinée 25%
  TD: 35,   // Tchad 35%
  CF: 30,   // Centrafrique 30%
  CG: 30,   // Congo 30%
  CD: 30,   // RD Congo 30%
  GQ: 35,   // Guinée Équatoriale 35%
  KM: 50,   // Comores 50%
  GW: 25,   // Guinée-Bissau 25%
};

/** Minimum IS rates (% of turnover) */
const MINIMUM_IS_RATES: Record<string, number> = {
  CI: 1,    // 1% du CA (minimum de perception)
  CM: 2.2,  // 2.2% du CA (minimum de perception)
  SN: 0.5,  // 0.5% du CA
  GA: 1,
  GW: 1,    // 1% du CA
};

export interface ISInput {
  /** Country code (ISO 2-letter) */
  countryCode: string;
  /** Résultat comptable avant impôt */
  resultatComptable: number;
  /** Réintégrations fiscales (charges non déductibles) */
  reintegrations: number;
  /** Déductions fiscales (produits non imposables) */
  deductions: number;
  /** Déficits antérieurs reportables */
  deficitsAnterieurs: number;
  /** Chiffre d'affaires (pour le calcul du minimum IS) */
  chiffreAffaires: number;
  /** Acomptes IS déjà versés */
  acomptesVerses: number;
  /** IS exercice précédent (pour calcul acomptes) */
  isPrecedent?: number;
}

export interface ISResult {
  resultatComptable: Money;
  reintegrations: Money;
  deductions: Money;
  deficitsImputes: Money;
  resultatFiscal: Money;
  tauxIS: number;
  impotBrut: Money;
  minimumIS: Money;
  impotDu: Money;
  acomptesVerses: Money;
  impotNet: Money;
  /** Quarterly advance payments for next year */
  acomptesTrimestriels: Money;
}

export function calculateIS(input: ISInput): ISResult {
  const rate = IS_RATES[input.countryCode] || 30;
  const minRate = MINIMUM_IS_RATES[input.countryCode] || 1;

  const resultatComptable = money(input.resultatComptable);
  const reintegrations = money(input.reintegrations);
  const deductions = money(input.deductions);

  // Résultat fiscal = Résultat comptable + Réintégrations - Déductions
  let resultatFiscalRaw = resultatComptable.add(reintegrations).subtract(deductions);

  // Imputation des déficits antérieurs (ne peut pas rendre le résultat négatif)
  const deficitsDisponibles = money(input.deficitsAnterieurs);
  const deficitsImputes = resultatFiscalRaw.isPositive()
    ? (deficitsDisponibles.greaterThan(resultatFiscalRaw) ? resultatFiscalRaw : deficitsDisponibles)
    : money(0);

  const resultatFiscal = resultatFiscalRaw.subtract(deficitsImputes);

  // IS brut = Résultat fiscal * taux
  const impotBrut = resultatFiscal.isPositive()
    ? percentage(resultatFiscal, rate)
    : money(0);

  // Minimum IS = minRate% du CA
  const minimumIS = percentage(money(input.chiffreAffaires), minRate);

  // IS dû = max(IS brut, Minimum IS)
  const impotDu = impotBrut.greaterThan(minimumIS) ? impotBrut : minimumIS;

  // IS net = IS dû - Acomptes versés
  const acomptesVerses = money(input.acomptesVerses);
  const impotNet = impotDu.subtract(acomptesVerses);

  // Acomptes trimestriels N+1 = IS dû / 4
  const acomptesTrimestriels = impotDu.divide(4).round(0);

  return {
    resultatComptable,
    reintegrations,
    deductions,
    deficitsImputes,
    resultatFiscal,
    tauxIS: rate,
    impotBrut,
    minimumIS,
    impotDu,
    acomptesVerses,
    impotNet,
    acomptesTrimestriels,
  };
}

/** Get IS rate for a country */
export function getISRate(countryCode: string): number {
  return IS_RATES[countryCode] || 30;
}

/** Get list of supported countries */
export function getSupportedCountries(): Array<{ code: string; rate: number }> {
  return Object.entries(IS_RATES).map(([code, rate]) => ({ code, rate }));
}
