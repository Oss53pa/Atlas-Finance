/**
 * IRPP — Impôt sur le Revenu des Personnes Physiques
 * Zone OHADA : barèmes CI (IGR), SN, CM
 * Utilise Money class pour la précision financière.
 */
import { Money, money } from './money';

// ---------------------------------------------------------------------------
// Barèmes par pays
// ---------------------------------------------------------------------------

interface TrancheFiscale {
  min: number;
  max: number;       // Infinity pour la dernière tranche
  taux: number;      // en %
}

const BAREMES: Record<string, TrancheFiscale[]> = {
  // Côte d'Ivoire — IGR (Impôt Général sur le Revenu) 2024
  CI: [
    { min: 0,          max: 300_000,      taux: 0 },
    { min: 300_001,    max: 547_000,      taux: 10 },
    { min: 547_001,    max: 979_000,      taux: 15 },
    { min: 979_001,    max: 1_519_000,    taux: 20 },
    { min: 1_519_001,  max: 2_644_000,    taux: 25 },
    { min: 2_644_001,  max: 4_669_000,    taux: 30 },
    { min: 4_669_001,  max: 10_106_000,   taux: 35 },
    { min: 10_106_001, max: Infinity,     taux: 40 },
  ],
  // Sénégal — IR barème 2024
  SN: [
    { min: 0,          max: 630_000,      taux: 0 },
    { min: 630_001,    max: 1_500_000,    taux: 20 },
    { min: 1_500_001,  max: 4_000_000,    taux: 30 },
    { min: 4_000_001,  max: 8_000_000,    taux: 35 },
    { min: 8_000_001,  max: 13_500_000,   taux: 37 },
    { min: 13_500_001, max: Infinity,     taux: 40 },
  ],
  // Cameroun — IRPP barème 2024 (+ 10% CAC)
  CM: [
    { min: 0,          max: 2_000_000,    taux: 10 },
    { min: 2_000_001,  max: 3_000_000,    taux: 15 },
    { min: 3_000_001,  max: 5_000_000,    taux: 25 },
    { min: 5_000_001,  max: Infinity,     taux: 35 },
  ],
};

// ---------------------------------------------------------------------------
// Parts (quotient familial)
// ---------------------------------------------------------------------------

interface PartsConfig {
  celibataire: number;
  marie: number;
  parEnfant: number;
  maxEnfants: number;
}

const PARTS_CONFIG: Record<string, PartsConfig> = {
  CI: { celibataire: 1, marie: 2, parEnfant: 0.5, maxEnfants: 5 },
  SN: { celibataire: 1, marie: 1.5, parEnfant: 0.5, maxEnfants: 5 },
  CM: { celibataire: 1, marie: 2, parEnfant: 0.5, maxEnfants: 6 },
};

// ---------------------------------------------------------------------------
// Interfaces publiques
// ---------------------------------------------------------------------------

export interface IRPPInput {
  countryCode: string;
  revenuBrutAnnuel: number;
  /** Abattements professionnels (20% plafonné, etc.) */
  abattementProfessionnel?: number;
  situationFamiliale: 'celibataire' | 'marie';
  nombreEnfants: number;
  /** Déductions spécifiques (assurance vie, etc.) */
  deductions?: number;
}

export interface IRPPResult {
  revenuBrut: Money;
  abattement: Money;
  revenuNet: Money;
  nombreParts: number;
  revenuParPart: Money;
  impotParPart: Money;
  impotBrut: Money;
  cac: Money;          // Centimes additionnels communaux (CM)
  impotNet: Money;
  tauxEffectif: number; // en %
  detailTranches: { tranche: string; base: number; taux: number; impot: number }[];
}

// ---------------------------------------------------------------------------
// Calcul
// ---------------------------------------------------------------------------

export function calculateIRPP(input: IRPPInput): IRPPResult {
  const countryCode = input.countryCode;
  const bareme = BAREMES[countryCode] || BAREMES['CI'];
  const partsConfig = PARTS_CONFIG[countryCode] || PARTS_CONFIG['CI'];

  // Revenu brut
  const revenuBrut = money(input.revenuBrutAnnuel);

  // Abattement professionnel (20% plafonné — défaut si non fourni)
  const abattementDefault = money(input.revenuBrutAnnuel).multiply(0.20).round(0);
  const abattement = input.abattementProfessionnel !== undefined
    ? money(input.abattementProfessionnel)
    : abattementDefault;

  // Revenu net imposable
  const deductions = money(input.deductions || 0);
  const revenuNet = revenuBrut.subtract(abattement).subtract(deductions);

  // Quotient familial : nombre de parts
  const nbEnfantsCapped = Math.min(input.nombreEnfants, partsConfig.maxEnfants);
  const nombreParts = (input.situationFamiliale === 'marie' ? partsConfig.marie : partsConfig.celibataire)
    + nbEnfantsCapped * partsConfig.parEnfant;

  // Revenu par part
  const revenuParPartNum = revenuNet.isPositive()
    ? revenuNet.divide(nombreParts).round(0).toNumber()
    : 0;
  const revenuParPart = money(revenuParPartNum);

  // Calcul par tranches
  const detailTranches: IRPPResult['detailTranches'] = [];
  let impotParPartNum = 0;

  for (const tranche of bareme) {
    if (revenuParPartNum <= tranche.min) break;
    const baseImposable = Math.min(revenuParPartNum, tranche.max === Infinity ? revenuParPartNum : tranche.max) - tranche.min;
    if (baseImposable <= 0) continue;
    const impotTranche = money(baseImposable).multiply(tranche.taux).divide(100).round(0).toNumber();
    impotParPartNum += impotTranche;
    detailTranches.push({
      tranche: `${tranche.min.toLocaleString()} - ${tranche.max === Infinity ? '∞' : tranche.max.toLocaleString()}`,
      base: baseImposable,
      taux: tranche.taux,
      impot: impotTranche,
    });
  }

  const impotParPart = money(impotParPartNum);
  const impotBrut = impotParPart.multiply(nombreParts).round(0);

  // CAC (Cameroun uniquement — 10% de l'IRPP)
  const cac = countryCode === 'CM'
    ? impotBrut.multiply(0.10).round(0)
    : money(0);

  const impotNet = impotBrut.add(cac);

  // Taux effectif
  const tauxEffectif = revenuBrut.isPositive()
    ? impotNet.divide(revenuBrut.toNumber()).multiply(100).round(2).toNumber()
    : 0;

  return {
    revenuBrut,
    abattement,
    revenuNet,
    nombreParts,
    revenuParPart,
    impotParPart,
    impotBrut,
    cac,
    impotNet,
    tauxEffectif,
    detailTranches,
  };
}

/**
 * Obtenir le barème IRPP d'un pays
 */
export function getBaremeIRPP(countryCode: string): TrancheFiscale[] {
  return BAREMES[countryCode] || BAREMES['CI'];
}

/**
 * Pays supportés pour le calcul IRPP
 */
export function getIRPPSupportedCountries(): string[] {
  return Object.keys(BAREMES);
}
