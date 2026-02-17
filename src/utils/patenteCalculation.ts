/**
 * Calcul de la Contribution des Patentes — Zone OHADA
 * La patente se compose de :
 *   - Droit sur le tableau (basé sur le CA)
 *   - Centimes additionnels communaux
 */
import { Money, money } from './money';

/** Barème patente Cameroun (simplifié) */
const PATENTE_BAREME_CM: Array<{ min: number; max: number; droit: number }> = [
  { min: 0,          max: 2_000_000,    droit: 50_000 },
  { min: 2_000_001,  max: 5_000_000,    droit: 100_000 },
  { min: 5_000_001,  max: 10_000_000,   droit: 150_000 },
  { min: 10_000_001, max: 25_000_000,   droit: 250_000 },
  { min: 25_000_001, max: 50_000_000,   droit: 400_000 },
  { min: 50_000_001, max: 100_000_000,  droit: 700_000 },
  { min: 100_000_001,max: 250_000_000,  droit: 1_200_000 },
  { min: 250_000_001,max: 500_000_000,  droit: 2_000_000 },
  { min: 500_000_001,max: Infinity,     droit: 3_000_000 },
];

/** Barème patente Côte d'Ivoire (simplifié) */
const PATENTE_BAREME_CI: Array<{ min: number; max: number; taux: number }> = [
  { min: 0,           max: 5_000_000,    taux: 0 },
  { min: 5_000_001,   max: 15_000_000,   taux: 0.5 },
  { min: 15_000_001,  max: 50_000_000,   taux: 0.45 },
  { min: 50_000_001,  max: 150_000_000,  taux: 0.35 },
  { min: 150_000_001, max: 500_000_000,  taux: 0.30 },
  { min: 500_000_001, max: Infinity,     taux: 0.25 },
];

/** Taux centimes additionnels par pays */
const CENTIMES_ADDITIONNELS: Record<string, number> = {
  CM: 10,  // 10% du droit de patente
  CI: 40,  // 40% du droit de patente
  SN: 10,
};

export interface PatenteInput {
  countryCode: string;
  chiffreAffaires: number;
  /** Valeur locative des locaux professionnels (pour certains pays) */
  valeurLocative?: number;
}

export interface PatenteResult {
  droitTableau: Money;
  centimesAdditionnels: Money;
  patenteTotale: Money;
  bareme: string;
}

export function calculatePatente(input: PatenteInput): PatenteResult {
  let droitTableau: Money;
  let bareme: string;

  if (input.countryCode === 'CM') {
    const tranche = PATENTE_BAREME_CM.find(
      b => input.chiffreAffaires >= b.min && input.chiffreAffaires <= b.max
    );
    droitTableau = money(tranche?.droit || 50_000);
    bareme = `Cameroun — Tranche ${tranche?.min?.toLocaleString('fr-FR') || 0} - ${tranche?.max === Infinity ? '∞' : tranche?.max?.toLocaleString('fr-FR')}`;
  } else if (input.countryCode === 'CI') {
    const tranche = PATENTE_BAREME_CI.find(
      b => input.chiffreAffaires >= b.min && input.chiffreAffaires <= b.max
    );
    droitTableau = money(input.chiffreAffaires).multiply(tranche?.taux || 0).divide(100).round(0);
    bareme = `Côte d'Ivoire — Taux ${tranche?.taux || 0}%`;
  } else {
    // Default: 0.5% du CA (estimation)
    droitTableau = money(input.chiffreAffaires).multiply(0.005).round(0);
    bareme = `Défaut — 0.5% du CA`;
  }

  const tauxCentimes = CENTIMES_ADDITIONNELS[input.countryCode] || 10;
  const centimesAdditionnels = droitTableau.multiply(tauxCentimes).divide(100).round(0);
  const patenteTotale = droitTableau.add(centimesAdditionnels);

  return {
    droitTableau,
    centimesAdditionnels,
    patenteTotale,
    bareme,
  };
}
