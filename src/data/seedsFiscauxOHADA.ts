/**
 * Taux fiscaux par pays OHADA — données de référence.
 * Sources : codes généraux des impôts nationaux (mis à jour 2025).
 *
 * Clés :
 *   tva — taux normal de TVA (%)
 *   is — taux normal de l'impôt sur les sociétés (%)
 *   imf_min — minimum de perception IMF (FCFA ou équivalent)
 *   imf_taux — taux de l'impôt minimum forfaitaire (% du CA)
 *   patente_base — taux indicatif de base pour la patente (%)
 *   devise — code devise ISO
 *   zone — UEMOA | CEMAC | Autre
 */

export interface TauxFiscauxPays {
  tva: number;
  is: number;
  imf_min: number;
  imf_taux: number;
  patente_base: number;
  devise: string;
  zone: 'UEMOA' | 'CEMAC' | 'Autre';
}

export const TAUX_FISCAUX_OHADA: Record<string, TauxFiscauxPays> = {
  // ===================== UEMOA (8 pays — devise XOF) =====================
  CI: { tva: 18, is: 25, imf_min: 3_000_000, imf_taux: 0.5, patente_base: 0.5, devise: 'XOF', zone: 'UEMOA' },
  SN: { tva: 18, is: 30, imf_min: 500_000, imf_taux: 0.5, patente_base: 0.4, devise: 'XOF', zone: 'UEMOA' },
  BF: { tva: 18, is: 27.5, imf_min: 1_000_000, imf_taux: 0.5, patente_base: 0.5, devise: 'XOF', zone: 'UEMOA' },
  ML: { tva: 18, is: 30, imf_min: 500_000, imf_taux: 1, patente_base: 0.4, devise: 'XOF', zone: 'UEMOA' },
  BJ: { tva: 18, is: 30, imf_min: 1_000_000, imf_taux: 1, patente_base: 0.45, devise: 'XOF', zone: 'UEMOA' },
  NE: { tva: 19, is: 30, imf_min: 1_000_000, imf_taux: 1, patente_base: 0.5, devise: 'XOF', zone: 'UEMOA' },
  TG: { tva: 18, is: 27, imf_min: 800_000, imf_taux: 1, patente_base: 0.4, devise: 'XOF', zone: 'UEMOA' },
  GW: { tva: 15, is: 25, imf_min: 500_000, imf_taux: 1, patente_base: 0.4, devise: 'XOF', zone: 'UEMOA' },

  // ===================== CEMAC (6 pays — devise XAF) =====================
  CM: { tva: 19.25, is: 33, imf_min: 2_000_000, imf_taux: 1, patente_base: 0.55, devise: 'XAF', zone: 'CEMAC' },
  GA: { tva: 18, is: 30, imf_min: 1_000_000, imf_taux: 1, patente_base: 0.5, devise: 'XAF', zone: 'CEMAC' },
  CG: { tva: 18.9, is: 30, imf_min: 1_000_000, imf_taux: 1, patente_base: 0.5, devise: 'XAF', zone: 'CEMAC' },
  CF: { tva: 19, is: 30, imf_min: 500_000, imf_taux: 1, patente_base: 0.4, devise: 'XAF', zone: 'CEMAC' },
  TD: { tva: 18, is: 35, imf_min: 1_000_000, imf_taux: 1, patente_base: 0.5, devise: 'XAF', zone: 'CEMAC' },
  GQ: { tva: 15, is: 35, imf_min: 1_000_000, imf_taux: 1, patente_base: 0.5, devise: 'XAF', zone: 'CEMAC' },

  // ===================== Autres =====================
  GN: { tva: 18, is: 35, imf_min: 3_000_000, imf_taux: 3, patente_base: 0.5, devise: 'GNF', zone: 'Autre' },
  KM: { tva: 10, is: 35, imf_min: 500_000, imf_taux: 1, patente_base: 0.4, devise: 'KMF', zone: 'Autre' },
  CD: { tva: 16, is: 35, imf_min: 1_000_000, imf_taux: 1, patente_base: 0.5, devise: 'CDF', zone: 'Autre' },
};

/**
 * Retourne les taux fiscaux d'un pays OHADA.
 */
export function getTauxFiscaux(countryCode: string): TauxFiscauxPays | undefined {
  return TAUX_FISCAUX_OHADA[countryCode.toUpperCase()];
}

/**
 * Liste des 17 pays membres OHADA avec les informations de base.
 */
export const PAYS_OHADA = [
  { code: 'CI', nom: "Côte d'Ivoire", zone: 'UEMOA', devise: 'XOF' },
  { code: 'SN', nom: 'Sénégal', zone: 'UEMOA', devise: 'XOF' },
  { code: 'BF', nom: 'Burkina Faso', zone: 'UEMOA', devise: 'XOF' },
  { code: 'ML', nom: 'Mali', zone: 'UEMOA', devise: 'XOF' },
  { code: 'BJ', nom: 'Bénin', zone: 'UEMOA', devise: 'XOF' },
  { code: 'NE', nom: 'Niger', zone: 'UEMOA', devise: 'XOF' },
  { code: 'TG', nom: 'Togo', zone: 'UEMOA', devise: 'XOF' },
  { code: 'GW', nom: 'Guinée-Bissau', zone: 'UEMOA', devise: 'XOF' },
  { code: 'CM', nom: 'Cameroun', zone: 'CEMAC', devise: 'XAF' },
  { code: 'GA', nom: 'Gabon', zone: 'CEMAC', devise: 'XAF' },
  { code: 'CG', nom: 'Congo', zone: 'CEMAC', devise: 'XAF' },
  { code: 'CF', nom: 'Centrafrique', zone: 'CEMAC', devise: 'XAF' },
  { code: 'TD', nom: 'Tchad', zone: 'CEMAC', devise: 'XAF' },
  { code: 'GQ', nom: 'Guinée Équatoriale', zone: 'CEMAC', devise: 'XAF' },
  { code: 'GN', nom: 'Guinée', zone: 'Autre', devise: 'GNF' },
  { code: 'KM', nom: 'Comores', zone: 'Autre', devise: 'KMF' },
  { code: 'CD', nom: 'RD Congo', zone: 'Autre', devise: 'CDF' },
] as const;
