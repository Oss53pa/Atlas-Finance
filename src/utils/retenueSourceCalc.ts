/**
 * Retenues à la source — Zone OHADA (17 pays)
 * BIC, BNC, revenus mobiliers, loyers, etc.
 * Utilise Money class pour la précision financière.
 */
import { Money, money } from './money';

// ---------------------------------------------------------------------------
// Taux de retenue à la source par pays et type de revenu
// ---------------------------------------------------------------------------

interface RetenueConfig {
  type: string;
  libelle: string;
  taux: number;        // en %
  seuil?: number;      // montant minimum déclencheur
  compteCharge: string; // compte SYSCOHADA de la charge
  compteRetenue: string; // compte de la retenue (44x)
}

const RETENUES: Record<string, RetenueConfig[]> = {
  CI: [
    { type: 'BIC', libelle: 'Retenue BIC prestataires', taux: 7.5, compteCharge: '631', compteRetenue: '4472' },
    { type: 'BNC', libelle: 'Retenue BNC professions libérales', taux: 7.5, compteCharge: '631', compteRetenue: '4472' },
    { type: 'loyers', libelle: 'Retenue sur loyers', taux: 15, compteCharge: '631', compteRetenue: '4472' },
    { type: 'dividendes', libelle: 'IRVM sur dividendes', taux: 15, compteCharge: '667', compteRetenue: '4473' },
    { type: 'interets', libelle: 'IRVM sur intérêts', taux: 18, compteCharge: '667', compteRetenue: '4473' },
    { type: 'non_resident', libelle: 'Retenue non-résidents', taux: 20, compteCharge: '631', compteRetenue: '4472' },
  ],
  SN: [
    { type: 'BNC', libelle: 'Retenue BNC', taux: 5, compteCharge: '631', compteRetenue: '4472' },
    { type: 'loyers', libelle: 'Retenue sur loyers', taux: 5, compteCharge: '631', compteRetenue: '4472' },
    { type: 'dividendes', libelle: 'Retenue sur dividendes', taux: 10, compteCharge: '667', compteRetenue: '4473' },
    { type: 'interets', libelle: 'Retenue sur intérêts', taux: 16, compteCharge: '667', compteRetenue: '4473' },
    { type: 'non_resident', libelle: 'Retenue non-résidents prestations', taux: 20, compteCharge: '631', compteRetenue: '4472' },
  ],
  CM: [
    { type: 'BIC', libelle: 'Précompte sur achats', taux: 5, seuil: 100_000, compteCharge: '631', compteRetenue: '4472' },
    { type: 'BNC', libelle: 'Retenue BNC', taux: 5.5, compteCharge: '631', compteRetenue: '4472' },
    { type: 'loyers', libelle: 'TSR sur loyers', taux: 15, compteCharge: '631', compteRetenue: '4472' },
    { type: 'dividendes', libelle: 'IRVM dividendes', taux: 16.5, compteCharge: '667', compteRetenue: '4473' },
    { type: 'interets', libelle: 'IRVM intérêts', taux: 16.5, compteCharge: '667', compteRetenue: '4473' },
    { type: 'non_resident', libelle: 'Retenue non-résidents', taux: 15, compteCharge: '631', compteRetenue: '4472' },
  ],
  GA: [
    { type: 'BNC', libelle: 'Retenue BNC', taux: 10, compteCharge: '631', compteRetenue: '4472' },
    { type: 'loyers', libelle: 'Retenue sur loyers', taux: 10, compteCharge: '631', compteRetenue: '4472' },
    { type: 'dividendes', libelle: 'IRCM dividendes', taux: 20, compteCharge: '667', compteRetenue: '4473' },
    { type: 'non_resident', libelle: 'Retenue non-résidents', taux: 20, compteCharge: '631', compteRetenue: '4472' },
  ],
  BF: [
    { type: 'BNC', libelle: 'Retenue BNC', taux: 10, compteCharge: '631', compteRetenue: '4472' },
    { type: 'loyers', libelle: 'Retenue sur loyers', taux: 10, compteCharge: '631', compteRetenue: '4472' },
    { type: 'dividendes', libelle: 'IRVM dividendes', taux: 12.5, compteCharge: '667', compteRetenue: '4473' },
    { type: 'non_resident', libelle: 'Retenue non-résidents', taux: 20, compteCharge: '631', compteRetenue: '4472' },
  ],
  ML: [
    { type: 'BNC', libelle: 'Retenue BNC', taux: 15, compteCharge: '631', compteRetenue: '4472' },
    { type: 'loyers', libelle: 'Retenue sur loyers', taux: 15, compteCharge: '631', compteRetenue: '4472' },
    { type: 'dividendes', libelle: 'IRVM dividendes', taux: 10, compteCharge: '667', compteRetenue: '4473' },
    { type: 'non_resident', libelle: 'Retenue non-résidents', taux: 15, compteCharge: '631', compteRetenue: '4472' },
  ],
  TG: [
    { type: 'BNC', libelle: 'Retenue BNC', taux: 7, compteCharge: '631', compteRetenue: '4472' },
    { type: 'loyers', libelle: 'Retenue sur loyers', taux: 7, compteCharge: '631', compteRetenue: '4472' },
    { type: 'dividendes', libelle: 'IRVM dividendes', taux: 13, compteCharge: '667', compteRetenue: '4473' },
  ],
  BJ: [
    { type: 'BNC', libelle: 'Retenue BNC', taux: 12, compteCharge: '631', compteRetenue: '4472' },
    { type: 'loyers', libelle: 'Retenue sur loyers', taux: 10, compteCharge: '631', compteRetenue: '4472' },
    { type: 'dividendes', libelle: 'IRVM dividendes', taux: 10, compteCharge: '667', compteRetenue: '4473' },
  ],
  NE: [
    { type: 'BNC', libelle: 'Retenue BNC', taux: 16, compteCharge: '631', compteRetenue: '4472' },
    { type: 'loyers', libelle: 'Retenue sur loyers', taux: 15, compteCharge: '631', compteRetenue: '4472' },
    { type: 'dividendes', libelle: 'IRVM dividendes', taux: 10, compteCharge: '667', compteRetenue: '4473' },
  ],
  GN: [
    { type: 'BNC', libelle: 'Retenue BNC', taux: 10, compteCharge: '631', compteRetenue: '4472' },
    { type: 'dividendes', libelle: 'IRVM dividendes', taux: 10, compteCharge: '667', compteRetenue: '4473' },
  ],
  TD: [
    { type: 'BNC', libelle: 'Retenue BNC', taux: 15, compteCharge: '631', compteRetenue: '4472' },
    { type: 'dividendes', libelle: 'IRVM dividendes', taux: 20, compteCharge: '667', compteRetenue: '4473' },
  ],
  CF: [
    { type: 'BNC', libelle: 'Retenue BNC', taux: 15, compteCharge: '631', compteRetenue: '4472' },
    { type: 'dividendes', libelle: 'IRVM dividendes', taux: 15, compteCharge: '667', compteRetenue: '4473' },
  ],
  CG: [
    { type: 'BNC', libelle: 'Retenue BNC', taux: 10, compteCharge: '631', compteRetenue: '4472' },
    { type: 'dividendes', libelle: 'IRCM dividendes', taux: 20, compteCharge: '667', compteRetenue: '4473' },
  ],
  CD: [
    { type: 'BNC', libelle: 'Retenue BNC', taux: 14, compteCharge: '631', compteRetenue: '4472' },
    { type: 'dividendes', libelle: 'IPR dividendes', taux: 20, compteCharge: '667', compteRetenue: '4473' },
  ],
  GQ: [
    { type: 'BNC', libelle: 'Retenue BNC', taux: 10, compteCharge: '631', compteRetenue: '4472' },
    { type: 'dividendes', libelle: 'IRVM dividendes', taux: 25, compteCharge: '667', compteRetenue: '4473' },
  ],
  KM: [
    { type: 'BNC', libelle: 'Retenue BNC', taux: 10, compteCharge: '631', compteRetenue: '4472' },
    { type: 'dividendes', libelle: 'Retenue dividendes', taux: 15, compteCharge: '667', compteRetenue: '4473' },
  ],
  GW: [
    { type: 'BNC', libelle: 'Retenue BNC', taux: 10, compteCharge: '631', compteRetenue: '4472' },
    { type: 'dividendes', libelle: 'IRVM dividendes', taux: 10, compteCharge: '667', compteRetenue: '4473' },
  ],
};

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface RetenueInput {
  countryCode: string;
  typeRevenu: string;
  montantBrut: number;
}

export interface RetenueResult {
  montantBrut: Money;
  taux: number;
  montantRetenue: Money;
  montantNet: Money;
  compteCharge: string;
  compteRetenue: string;
  libelle: string;
}

// ---------------------------------------------------------------------------
// Calcul
// ---------------------------------------------------------------------------

export function calculerRetenue(input: RetenueInput): RetenueResult {
  const configs = RETENUES[input.countryCode] || [];
  const config = configs.find(c => c.type === input.typeRevenu);

  if (!config) {
    // Pas de retenue applicable
    return {
      montantBrut: money(input.montantBrut),
      taux: 0,
      montantRetenue: money(0),
      montantNet: money(input.montantBrut),
      compteCharge: '',
      compteRetenue: '',
      libelle: 'Aucune retenue applicable',
    };
  }

  // Vérifier le seuil
  if (config.seuil && input.montantBrut < config.seuil) {
    return {
      montantBrut: money(input.montantBrut),
      taux: 0,
      montantRetenue: money(0),
      montantNet: money(input.montantBrut),
      compteCharge: config.compteCharge,
      compteRetenue: config.compteRetenue,
      libelle: `${config.libelle} - sous le seuil de ${config.seuil} FCFA`,
    };
  }

  const montantBrut = money(input.montantBrut);
  const montantRetenue = montantBrut.multiply(config.taux).divide(100).round(0);
  const montantNet = montantBrut.subtract(montantRetenue);

  return {
    montantBrut,
    taux: config.taux,
    montantRetenue,
    montantNet,
    compteCharge: config.compteCharge,
    compteRetenue: config.compteRetenue,
    libelle: config.libelle,
  };
}

/**
 * Obtenir les types de retenue disponibles pour un pays
 */
export function getTypesRetenue(countryCode: string): RetenueConfig[] {
  return RETENUES[countryCode] || [];
}

/**
 * Pays supportés
 */
export function getRetenueSupportedCountries(): string[] {
  return Object.keys(RETENUES);
}
