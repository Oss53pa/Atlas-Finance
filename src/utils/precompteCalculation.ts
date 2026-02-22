/**
 * Calcul du Précompte sur achats — Zone OHADA
 * Retenue à la source sur achats de biens et prestations de services.
 */
import { Money, money } from './money';
import { formatCurrency } from './formatters';

/** Précompte rates by country */
const PRECOMPTE_RATES: Record<string, {
  achatsLocaux: number;
  prestationsServices: number;
  importations: number;
  seuil: number;
}> = {
  CI: {
    achatsLocaux: 5,        // 5% sur achats locaux > seuil
    prestationsServices: 10, // 10% sur prestations
    importations: 5,         // 5% à l'importation
    seuil: 1_000_000,       // Seuil 1M FCFA
  },
  CM: {
    achatsLocaux: 2.2,      // 2.2% précompte sur achats
    prestationsServices: 5.5, // 5.5% retenue prestataires
    importations: 2.2,
    seuil: 500_000,
  },
  SN: {
    achatsLocaux: 5,
    prestationsServices: 5,
    importations: 5,
    seuil: 500_000,
  },
};

export type PrecompteType = 'achatsLocaux' | 'prestationsServices' | 'importations';

export interface PrecompteInput {
  countryCode: string;
  type: PrecompteType;
  montantHT: number;
  /** Vendor has tax exemption certificate */
  exonere?: boolean;
}

export interface PrecompteResult {
  montantHT: Money;
  taux: number;
  montantPrecompte: Money;
  montantNet: Money;
  applicable: boolean;
  motifNonApplication?: string;
}

export function calculatePrecompte(input: PrecompteInput): PrecompteResult {
  const config = PRECOMPTE_RATES[input.countryCode];
  const ht = money(input.montantHT);

  if (!config) {
    return {
      montantHT: ht,
      taux: 0,
      montantPrecompte: money(0),
      montantNet: ht,
      applicable: false,
      motifNonApplication: `Pays ${input.countryCode} non paramétré`,
    };
  }

  if (input.exonere) {
    return {
      montantHT: ht,
      taux: 0,
      montantPrecompte: money(0),
      montantNet: ht,
      applicable: false,
      motifNonApplication: 'Fournisseur exonéré (attestation d\'exonération)',
    };
  }

  if (input.montantHT < config.seuil) {
    return {
      montantHT: ht,
      taux: 0,
      montantPrecompte: money(0),
      montantNet: ht,
      applicable: false,
      motifNonApplication: `Montant < seuil (${formatCurrency(config.seuil)})`,
    };
  }

  const taux = config[input.type];
  const montantPrecompte = ht.multiply(taux).divide(100).round(0);
  const montantNet = ht.subtract(montantPrecompte);

  return {
    montantHT: ht,
    taux,
    montantPrecompte,
    montantNet,
    applicable: true,
  };
}

/** Get precompte configuration for a country */
export function getPrecompteConfig(countryCode: string) {
  return PRECOMPTE_RATES[countryCode] || null;
}
