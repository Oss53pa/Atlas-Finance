/**
 * Calcul de la Paie — Zone OHADA
 * Cotisations sociales CI (CNPS), SN (CSS/IPRES/IPM), CM (CNPS/FNE/CFC)
 * Utilise Money class pour la précision financière.
 */
import { Money, money } from './money';

// ---------------------------------------------------------------------------
// Cotisations sociales par pays
// ---------------------------------------------------------------------------

interface CotisationConfig {
  code: string;
  libelle: string;
  tauxEmployeur: number;  // en %
  tauxSalarie: number;    // en %
  plafond?: number;       // plafond mensuel
  assiette: 'brut' | 'brut_plafonne';
}

const COTISATIONS: Record<string, CotisationConfig[]> = {
  // Côte d'Ivoire — CNPS
  CI: [
    { code: 'CNPS_PF', libelle: 'Prestations familiales', tauxEmployeur: 5.75, tauxSalarie: 0, plafond: 70_000 * 12, assiette: 'brut_plafonne' },
    { code: 'CNPS_AT', libelle: 'Accidents du travail', tauxEmployeur: 2, tauxSalarie: 0, plafond: 70_000 * 12, assiette: 'brut_plafonne' },
    { code: 'CNPS_RET', libelle: 'Retraite', tauxEmployeur: 7.7, tauxSalarie: 6.3, plafond: 45 * 70_000, assiette: 'brut_plafonne' },
    { code: 'FDFP_TA', libelle: 'FDFP Taxe apprentissage', tauxEmployeur: 0.4, tauxSalarie: 0, assiette: 'brut' },
    { code: 'FDFP_FPC', libelle: 'FDFP Formation continue', tauxEmployeur: 1.2, tauxSalarie: 0, assiette: 'brut' },
  ],
  // Sénégal — CSS, IPRES, IPM, CFCE
  SN: [
    { code: 'CSS_PF', libelle: 'CSS Prestations familiales', tauxEmployeur: 7, tauxSalarie: 0, plafond: 63_000, assiette: 'brut_plafonne' },
    { code: 'CSS_AT', libelle: 'CSS Accidents du travail', tauxEmployeur: 3, tauxSalarie: 0, plafond: 63_000, assiette: 'brut_plafonne' },
    { code: 'IPRES_RG', libelle: 'IPRES Régime général', tauxEmployeur: 8.4, tauxSalarie: 5.6, plafond: 360_000, assiette: 'brut_plafonne' },
    { code: 'IPRES_RC', libelle: 'IPRES Régime cadres', tauxEmployeur: 3.6, tauxSalarie: 2.4, plafond: 1_080_000, assiette: 'brut_plafonne' },
    { code: 'IPM', libelle: 'Institution Prévoyance Maladie', tauxEmployeur: 3, tauxSalarie: 3, assiette: 'brut' },
    { code: 'CFCE', libelle: 'Contribution forfaitaire', tauxEmployeur: 3, tauxSalarie: 0, assiette: 'brut' },
  ],
  // Cameroun — CNPS, FNE, CFC, RAV
  CM: [
    { code: 'CNPS_PF', libelle: 'CNPS Prestations familiales', tauxEmployeur: 7, tauxSalarie: 0, plafond: 750_000, assiette: 'brut_plafonne' },
    { code: 'CNPS_AT', libelle: 'CNPS Accidents du travail', tauxEmployeur: 1.75, tauxSalarie: 0, plafond: 750_000, assiette: 'brut_plafonne' },
    { code: 'CNPS_PV', libelle: 'CNPS Pension vieillesse', tauxEmployeur: 4.2, tauxSalarie: 2.8, plafond: 750_000, assiette: 'brut_plafonne' },
    { code: 'FNE', libelle: 'Fonds National Emploi', tauxEmployeur: 1, tauxSalarie: 0, assiette: 'brut' },
    { code: 'CFC', libelle: 'Crédit Foncier du Cameroun', tauxEmployeur: 1, tauxSalarie: 1, plafond: 750_000, assiette: 'brut_plafonne' },
    { code: 'RAV', libelle: 'Redevance audiovisuelle', tauxEmployeur: 0, tauxSalarie: 0, assiette: 'brut' }, // forfait 13 000 FCFA/mois
  ],
};

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface BulletinPaieInput {
  countryCode: string;
  salaireBrut: number;
  /** Prime de transport, logement, etc. */
  primes?: number;
  /** Heures supplémentaires : [{heures, tauxMajoration}] */
  heuresSupplementaires?: { heures: number; tauxMajoration: number }[];
  /** Avantages en nature imposables */
  avantagesNature?: number;
  /** Indemnités non imposables (transport, panier...) */
  indemnitesNonImposables?: number;
  /** Le salarié est-il cadre ? (pour IPRES RC au Sénégal) */
  estCadre?: boolean;
  /** Taux horaire pour heures supplémentaires */
  tauxHoraire?: number;
}

export interface LigneCotisation {
  code: string;
  libelle: string;
  base: number;
  tauxEmployeur: number;
  tauxSalarie: number;
  montantEmployeur: number;
  montantSalarie: number;
}

export interface BulletinPaieResult {
  salaireBrut: Money;
  primes: Money;
  heuresSupMontant: Money;
  avantagesNature: Money;
  salaireImposable: Money;
  cotisations: LigneCotisation[];
  totalCotisationsEmployeur: Money;
  totalCotisationsSalarie: Money;
  salaireNet: Money;
  indemnitesNonImposables: Money;
  netAPayer: Money;
}

// ---------------------------------------------------------------------------
// Heures supplémentaires
// ---------------------------------------------------------------------------

function calculerHeuresSup(
  heuresSup: BulletinPaieInput['heuresSupplementaires'],
  tauxHoraire: number
): Money {
  if (!heuresSup || heuresSup.length === 0) return money(0);
  let total = money(0);
  for (const hs of heuresSup) {
    const montant = money(tauxHoraire)
      .multiply(1 + hs.tauxMajoration / 100)
      .multiply(hs.heures)
      .round(0);
    total = total.add(montant);
  }
  return total;
}

// ---------------------------------------------------------------------------
// Calcul principal
// ---------------------------------------------------------------------------

export function calculerBulletinPaie(input: BulletinPaieInput): BulletinPaieResult {
  const countryCode = input.countryCode;
  const cotisationsConfig = COTISATIONS[countryCode] || COTISATIONS['CI'];

  const salaireBrut = money(input.salaireBrut);
  const primes = money(input.primes || 0);
  const avantagesNature = money(input.avantagesNature || 0);
  const indemnitesNonImposables = money(input.indemnitesNonImposables || 0);

  // Heures supplémentaires
  const tauxHoraire = input.tauxHoraire || (input.salaireBrut / 173.33);
  const heuresSupMontant = calculerHeuresSup(input.heuresSupplementaires, tauxHoraire);

  // Salaire imposable = brut + primes + HS + avantages en nature
  const salaireImposable = salaireBrut.add(primes).add(heuresSupMontant).add(avantagesNature);
  const brutNum = salaireImposable.toNumber();

  // Calcul cotisations
  const cotisations: LigneCotisation[] = [];
  let totalEmployeur = money(0);
  let totalSalarie = money(0);

  for (const config of cotisationsConfig) {
    // Filtrer IPRES_RC si non-cadre
    if (config.code === 'IPRES_RC' && !input.estCadre) continue;

    // RAV Cameroun : forfait 13 000 FCFA
    if (config.code === 'RAV') {
      const rav = money(13_000);
      cotisations.push({
        code: config.code,
        libelle: config.libelle,
        base: brutNum,
        tauxEmployeur: 0,
        tauxSalarie: 0,
        montantEmployeur: 0,
        montantSalarie: rav.toNumber(),
      });
      totalSalarie = totalSalarie.add(rav);
      continue;
    }

    // Base plafonnée ou non
    const base = config.assiette === 'brut_plafonne' && config.plafond
      ? Math.min(brutNum, config.plafond)
      : brutNum;

    const montantEmployeur = money(base).multiply(config.tauxEmployeur).divide(100).round(0);
    const montantSalarie = money(base).multiply(config.tauxSalarie).divide(100).round(0);

    cotisations.push({
      code: config.code,
      libelle: config.libelle,
      base,
      tauxEmployeur: config.tauxEmployeur,
      tauxSalarie: config.tauxSalarie,
      montantEmployeur: montantEmployeur.toNumber(),
      montantSalarie: montantSalarie.toNumber(),
    });

    totalEmployeur = totalEmployeur.add(montantEmployeur);
    totalSalarie = totalSalarie.add(montantSalarie);
  }

  const salaireNet = salaireImposable.subtract(totalSalarie);
  const netAPayer = salaireNet.add(indemnitesNonImposables);

  return {
    salaireBrut,
    primes,
    heuresSupMontant,
    avantagesNature,
    salaireImposable,
    cotisations,
    totalCotisationsEmployeur: totalEmployeur,
    totalCotisationsSalarie: totalSalarie,
    salaireNet,
    indemnitesNonImposables,
    netAPayer,
  };
}

/**
 * Obtenir les cotisations disponibles pour un pays
 */
export function getCotisationsPays(countryCode: string): CotisationConfig[] {
  return COTISATIONS[countryCode] || COTISATIONS['CI'];
}

/**
 * Pays supportés pour le calcul de paie
 */
export function getPaieSupportedCountries(): string[] {
  return Object.keys(COTISATIONS);
}
