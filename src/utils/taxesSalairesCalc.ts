/**
 * Taxes sur les salaires — Zone OHADA
 * Contribution employeur, taxe d'apprentissage, contribution foncière, etc.
 * Complète paieCalculation.ts avec les taxes patronales additionnelles.
 * Utilise Money class pour la précision financière.
 */
import { Money, money } from './money';

// ---------------------------------------------------------------------------
// Configuration taxes par pays
// ---------------------------------------------------------------------------

interface TaxeSalairConfig {
  code: string;
  libelle: string;
  taux: number;         // en % de la masse salariale
  plafond?: number;     // plafond par salarié/mois
  assiette: 'masse_salariale' | 'brut_individuel';
  compteSYSCOHADA: string;
}

const TAXES_SALAIRES: Record<string, TaxeSalairConfig[]> = {
  CI: [
    { code: 'ITS', libelle: 'Impôt sur Traitements et Salaires', taux: 1.5, assiette: 'masse_salariale', compteSYSCOHADA: '641' },
    { code: 'CN', libelle: 'Contribution Nationale', taux: 1.5, assiette: 'masse_salariale', compteSYSCOHADA: '641' },
    { code: 'TA', libelle: 'Taxe d\'Apprentissage (FDFP)', taux: 0.4, assiette: 'masse_salariale', compteSYSCOHADA: '631' },
    { code: 'FPC', libelle: 'Formation Professionnelle Continue (FDFP)', taux: 1.2, assiette: 'masse_salariale', compteSYSCOHADA: '631' },
  ],
  SN: [
    { code: 'CFCE', libelle: 'Contribution Forfaitaire à la Charge de l\'Employeur', taux: 3, assiette: 'masse_salariale', compteSYSCOHADA: '641' },
    { code: 'VF', libelle: 'Versement Forfaitaire', taux: 3, assiette: 'masse_salariale', compteSYSCOHADA: '641' },
  ],
  CM: [
    { code: 'TCS', libelle: 'Taxe Communale sur les Salaires', taux: 2, assiette: 'masse_salariale', compteSYSCOHADA: '641' },
    { code: 'FNE', libelle: 'Fonds National de l\'Emploi', taux: 1, assiette: 'masse_salariale', compteSYSCOHADA: '641' },
    { code: 'CFC', libelle: 'Crédit Foncier du Cameroun', taux: 1, assiette: 'masse_salariale', compteSYSCOHADA: '641' },
    { code: 'RAV', libelle: 'Redevance Audiovisuelle', taux: 0, assiette: 'brut_individuel', compteSYSCOHADA: '641' }, // Forfait 13 000/mois
  ],
  GA: [
    { code: 'TCS', libelle: 'Taxe Complémentaire sur les Salaires', taux: 5, assiette: 'masse_salariale', compteSYSCOHADA: '641' },
    { code: 'FNH', libelle: 'Fonds National de l\'Habitat', taux: 2, assiette: 'masse_salariale', compteSYSCOHADA: '641' },
  ],
  BF: [
    { code: 'TA', libelle: 'Taxe Patronale d\'Apprentissage', taux: 4, assiette: 'masse_salariale', compteSYSCOHADA: '641' },
    { code: 'TPA', libelle: 'Taxe Patronale Additionnelle', taux: 1, assiette: 'masse_salariale', compteSYSCOHADA: '641' },
  ],
  ML: [
    { code: 'TFP', libelle: 'Taxe de Formation Professionnelle', taux: 2, assiette: 'masse_salariale', compteSYSCOHADA: '641' },
    { code: 'TVS', libelle: 'Taxe-Voirie sur les Salaires', taux: 1, assiette: 'masse_salariale', compteSYSCOHADA: '641' },
  ],
  TG: [
    { code: 'TCS', libelle: 'Taxe Complémentaire sur Salaires', taux: 3, assiette: 'masse_salariale', compteSYSCOHADA: '641' },
    { code: 'TA', libelle: 'Taxe d\'Apprentissage', taux: 1, assiette: 'masse_salariale', compteSYSCOHADA: '641' },
  ],
  BJ: [
    { code: 'VPS', libelle: 'Versement Patronal sur Salaires', taux: 4, assiette: 'masse_salariale', compteSYSCOHADA: '641' },
  ],
  NE: [
    { code: 'TA', libelle: 'Taxe d\'Apprentissage', taux: 2, assiette: 'masse_salariale', compteSYSCOHADA: '641' },
    { code: 'VPS', libelle: 'Versement Patronal sur Salaires', taux: 3, assiette: 'masse_salariale', compteSYSCOHADA: '641' },
  ],
  GN: [
    { code: 'VPS', libelle: 'Versement Patronal sur Salaires', taux: 6, assiette: 'masse_salariale', compteSYSCOHADA: '641' },
  ],
  TD: [
    { code: 'TA', libelle: 'Taxe d\'Apprentissage', taux: 2.5, assiette: 'masse_salariale', compteSYSCOHADA: '641' },
    { code: 'TFP', libelle: 'Taxe Formation Professionnelle', taux: 1.5, assiette: 'masse_salariale', compteSYSCOHADA: '641' },
  ],
  CF: [
    { code: 'VPS', libelle: 'Versement Patronal sur Salaires', taux: 4, assiette: 'masse_salariale', compteSYSCOHADA: '641' },
  ],
  CG: [
    { code: 'TA', libelle: 'Taxe d\'Apprentissage', taux: 1, assiette: 'masse_salariale', compteSYSCOHADA: '641' },
    { code: 'VPS', libelle: 'Versement Patronal sur Salaires', taux: 5, assiette: 'masse_salariale', compteSYSCOHADA: '641' },
  ],
  CD: [
    { code: 'IPR', libelle: 'Impôt Professionnel sur Rémunérations', taux: 0, assiette: 'brut_individuel', compteSYSCOHADA: '641' }, // Barème progressif
    { code: 'INPP', libelle: 'Contribution INPP', taux: 3, assiette: 'masse_salariale', compteSYSCOHADA: '641' },
  ],
  GQ: [
    { code: 'VPS', libelle: 'Versement Patronal sur Salaires', taux: 1, assiette: 'masse_salariale', compteSYSCOHADA: '641' },
  ],
  KM: [
    { code: 'VPS', libelle: 'Versement Patronal sur Salaires', taux: 5, assiette: 'masse_salariale', compteSYSCOHADA: '641' },
  ],
  GW: [
    { code: 'VPS', libelle: 'Versement Patronal sur Salaires', taux: 4, assiette: 'masse_salariale', compteSYSCOHADA: '641' },
  ],
};

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface TaxesSalairesInput {
  countryCode: string;
  masseSalarialeMensuelle: number;
  nombreSalaries?: number;
}

export interface LigneTaxe {
  code: string;
  libelle: string;
  base: number;
  taux: number;
  montant: number;
  compteSYSCOHADA: string;
}

export interface TaxesSalairesResult {
  lignesTaxes: LigneTaxe[];
  totalTaxes: Money;
  coutTotalEmployeur: Money; // masse salariale + total taxes
}

// ---------------------------------------------------------------------------
// Calcul
// ---------------------------------------------------------------------------

export function calculerTaxesSalaires(input: TaxesSalairesInput): TaxesSalairesResult {
  const configs = TAXES_SALAIRES[input.countryCode] || [];
  const masse = input.masseSalarialeMensuelle;
  const nbSalaries = input.nombreSalaries || 1;

  const lignesTaxes: LigneTaxe[] = [];
  let totalTaxes = money(0);

  for (const config of configs) {
    let montant: Money;

    if (config.code === 'RAV') {
      // Cameroun RAV : forfait 13 000 FCFA par salarié
      montant = money(13_000).multiply(nbSalaries);
    } else if (config.taux === 0) {
      continue; // Barème progressif — géré par IRPP
    } else {
      montant = money(masse).multiply(config.taux).divide(100).round(0);
    }

    lignesTaxes.push({
      code: config.code,
      libelle: config.libelle,
      base: masse,
      taux: config.taux,
      montant: montant.toNumber(),
      compteSYSCOHADA: config.compteSYSCOHADA,
    });

    totalTaxes = totalTaxes.add(montant);
  }

  return {
    lignesTaxes,
    totalTaxes,
    coutTotalEmployeur: money(masse).add(totalTaxes),
  };
}

/**
 * Obtenir les taxes salariales d'un pays
 */
export function getTaxesSalairesPays(countryCode: string): TaxeSalairConfig[] {
  return TAXES_SALAIRES[countryCode] || [];
}

/**
 * Pays supportés
 */
export function getTaxesSalairesSupportedCountries(): string[] {
  return Object.keys(TAXES_SALAIRES);
}
