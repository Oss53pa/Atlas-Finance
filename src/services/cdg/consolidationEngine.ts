/**
 * Moteur de consolidation — écart d'acquisition, conversion IAS 21, groupe.
 *
 * Complète consolidationService (méthodes, intérêts minoritaires, élimination
 * intra-groupe — fonctions pures déjà présentes) avec les pièces manquantes de
 * l'analyse : l'ÉCART D'ACQUISITION (goodwill), la CONVERSION IAS 21 des filiales
 * en devise étrangère, et un ORCHESTRATEUR de groupe qui produit les états
 * consolidés.
 *
 * Convention de solde : signé (débit positif, crédit négatif) — cohérent avec
 * les états financiers dérivés du GL (bilan par signe, cf. glHelpers).
 */

import { money, Money } from '../../utils/money';
import {
  calculerInteretsMinoritaires,
  calculerPartGroupe,
  type LigneConsolidee,
  type MethodeConsolidation,
} from './consolidationService';

// ============================================================================
// ÉCART D'ACQUISITION (GOODWILL)
// ============================================================================

export interface EcartAcquisitionInput {
  /** Coût d'acquisition des titres (prix payé). */
  coutAcquisition: number;
  /** Actif net comptable de la cible à la date d'acquisition. */
  actifNetComptable: number;
  /** Ajustements à la juste valeur (plus/moins-values latentes retenues). */
  ajustementsJusteValeur?: number;
  /** Pourcentage de détention acquis (0-100). */
  pourcentageDetention: number;
}

export interface EcartAcquisitionResult {
  /** Actif net réévalué (comptable + juste valeur). */
  actifNetReevalue: number;
  /** Quote-part de l'actif net réévalué revenant au groupe. */
  quotePartAcquise: number;
  /** Écart d'acquisition = coût − quote-part. > 0 goodwill, < 0 badwill. */
  ecartAcquisition: number;
  sens: 'goodwill' | 'badwill' | 'nul';
}

/**
 * Écart d'acquisition (goodwill) = coût d'acquisition − quote-part de l'actif
 * net réévalué acquis. Positif = survaleur (goodwill, à l'actif immobilisé) ;
 * négatif = badwill (profit / provision selon le référentiel).
 */
export function computeEcartAcquisition(input: EcartAcquisitionInput): EcartAcquisitionResult {
  const actifNetReevalue = money(input.actifNetComptable)
    .add(input.ajustementsJusteValeur ?? 0)
    .round(2).toNumber();
  const quotePartAcquise = money(actifNetReevalue)
    .multiply(input.pourcentageDetention).divide(100).round(2).toNumber();
  const ecart = money(input.coutAcquisition).subtract(quotePartAcquise).round(2).toNumber();
  return {
    actifNetReevalue,
    quotePartAcquise,
    ecartAcquisition: ecart,
    sens: ecart > 0 ? 'goodwill' : ecart < 0 ? 'badwill' : 'nul',
  };
}

// ============================================================================
// CONVERSION IAS 21 (méthode du cours de clôture)
// ============================================================================

export interface BalanceLigne {
  compte: string;
  /** Solde signé en devise LOCALE (débit positif, crédit négatif). */
  montant: number;
}

export interface ConversionIAS21Input {
  balanceLocale: BalanceLigne[];
  /** Cours de clôture (postes de bilan). */
  coursCloture: number;
  /** Cours moyen de la période (postes de résultat, classes 6-7). */
  coursMoyen: number;
  /** Cours historique (capitaux propres, classes 10-13). */
  coursHistorique: number;
}

export interface ConversionIAS21Result {
  lignesConverties: BalanceLigne[];
  /** Écart de conversion (réserve de conversion, capitaux propres). */
  ecartConversion: number;
}

/** Classe du compte (1er chiffre). */
const classeOf = (compte: string): number => Number((compte || '0')[0]) || 0;
/** Capitaux propres au sens strict (10-13 : capital, primes, réserves, report). */
const isCapitauxHistorique = (compte: string): boolean => /^1[0-3]/.test(compte || '');

/**
 * Convertit la balance d'une filiale autonome de sa devise locale vers la devise
 * du groupe (IAS 21, méthode du cours de clôture) :
 *   - postes de bilan (classes 1-5)      → cours de CLÔTURE
 *   - capitaux propres historiques (10-13) → cours HISTORIQUE
 *   - postes de résultat (classes 6-7)   → cours MOYEN
 * L'écart de conversion équilibre la balance convertie (il naît de la différence
 * de cours entre l'actif net au cours de clôture et les capitaux propres au
 * cours historique + résultat au cours moyen).
 */
export function convertirBalanceIAS21(input: ConversionIAS21Input): ConversionIAS21Result {
  const lignesConverties: BalanceLigne[] = [];
  let sommeConvertie = money(0); // Σ des montants convertis (doit être 0 à l'équilibre)

  for (const l of input.balanceLocale) {
    const cl = classeOf(l.compte);
    let cours: number;
    if (cl === 6 || cl === 7) cours = input.coursMoyen;
    else if (isCapitauxHistorique(l.compte)) cours = input.coursHistorique;
    else cours = input.coursCloture; // autres postes de bilan (2,3,4,5 et 14-19)
    const converti = money(l.montant).multiply(cours).round(2).toNumber();
    lignesConverties.push({ compte: l.compte, montant: converti });
    sommeConvertie = sommeConvertie.add(converti);
  }

  // La balance locale équilibrée (Σ = 0) ne l'est plus après conversion à des
  // cours différents : l'écart de conversion rétablit l'équilibre.
  const ecartConversion = sommeConvertie.multiply(-1).round(2).toNumber();
  return { lignesConverties, ecartConversion };
}

// ============================================================================
// ORCHESTRATEUR DE GROUPE
// ============================================================================

export interface EntityBalance {
  societeId: string;
  /** Solde signé par compte (débit +, crédit −), en devise GROUPE. */
  soldes: Record<string, number>;
  /** Résultat net de l'entité (devise groupe). */
  resultat: number;
}

export interface ParticipationConso {
  filialId: string;
  pourcentageDetention: number;
  methode: MethodeConsolidation;
  /** Situation nette de la filiale (pour la mise en équivalence). */
  situationNette?: number;
}

export interface EliminationIntra {
  compte: string;
  /** Montant à éliminer (signé, dans la convention des soldes). */
  montant: number;
  nature: string;
}

export interface GroupeConsolidationInput {
  mere: EntityBalance;
  filiales: EntityBalance[];
  participations: ParticipationConso[];
  eliminations?: EliminationIntra[];
  libelles?: Record<string, string>;
}

export interface GroupeConsolidationResult {
  lignes: LigneConsolidee[];
  interetsMinoritaires: number;
  resultatPartGroupe: number;
  totalEliminations: number;
  /** Vrai si Σ des soldes consolidés = 0 (partie double préservée). */
  equilibre: boolean;
}

/**
 * Consolide un groupe :
 *   - intégration globale : 100 % des comptes de la filiale, puis intérêts
 *     minoritaires sur la quote-part hors groupe ;
 *   - mise en équivalence : une seule ligne « titres mis en équivalence » =
 *     quote-part de la situation nette (les comptes de la filiale ne sont pas
 *     agrégés) ;
 *   - éliminations intra-groupe appliquées sur les comptes concernés.
 */
export function consoliderGroupe(input: GroupeConsolidationInput): GroupeConsolidationResult {
  const partById = new Map(input.participations.map(p => [p.filialId, p]));
  const eliminations = input.eliminations ?? [];
  const elimByCompte = new Map<string, Money>();
  for (const e of eliminations) {
    elimByCompte.set(e.compte, (elimByCompte.get(e.compte) ?? money(0)).add(e.montant));
  }

  // Ensemble des comptes présents (mère + filiales globales + éliminations).
  const comptes = new Set<string>(Object.keys(input.mere.soldes));
  for (const f of input.filiales) {
    const p = partById.get(f.societeId);
    if (p?.methode === 'integration_globale' || p?.methode === 'integration_proportionnelle') {
      Object.keys(f.soldes).forEach(c => comptes.add(c));
    }
  }
  eliminations.forEach(e => comptes.add(e.compte));

  const lignes: LigneConsolidee[] = [];
  let sommeConsolidee = money(0);

  for (const compte of [...comptes].sort()) {
    const montantMere = input.mere.soldes[compte] ?? 0;
    const montantsFiliales: Record<string, number> = {};
    let cumulFiliales = money(0);
    for (const f of input.filiales) {
      const p = partById.get(f.societeId);
      if (!p) continue;
      if (p.methode === 'integration_globale') {
        const v = f.soldes[compte] ?? 0;
        if (v !== 0) { montantsFiliales[f.societeId] = v; cumulFiliales = cumulFiliales.add(v); }
      } else if (p.methode === 'integration_proportionnelle') {
        const v = money(f.soldes[compte] ?? 0).multiply(p.pourcentageDetention).divide(100).round(2).toNumber();
        if (v !== 0) { montantsFiliales[f.societeId] = v; cumulFiliales = cumulFiliales.add(v); }
      }
      // mise_en_equivalence : traité hors boucle compte (ligne dédiée).
    }
    const elim = (elimByCompte.get(compte) ?? money(0)).toNumber();
    const consolide = money(montantMere).add(cumulFiliales).subtract(elim).round(2).toNumber();
    if (consolide === 0 && montantMere === 0 && Object.keys(montantsFiliales).length === 0 && elim === 0) continue;

    lignes.push({
      compte,
      libelle: input.libelles?.[compte] ?? compte,
      montantMere,
      montantsFiliales,
      eliminations: elim,
      montantConsolide: consolide,
    });
    sommeConsolidee = sommeConsolidee.add(consolide);
  }

  // Mise en équivalence : ligne « titres mis en équivalence » = quote-part SN.
  for (const p of input.participations) {
    if (p.methode !== 'mise_en_equivalence') continue;
    const quotePart = money(p.situationNette ?? 0).multiply(p.pourcentageDetention).divide(100).round(2).toNumber();
    if (quotePart === 0) continue;
    lignes.push({
      compte: '26-MEE',
      libelle: `Titres mis en équivalence — ${p.filialId}`,
      montantMere: 0,
      montantsFiliales: { [p.filialId]: quotePart },
      eliminations: 0,
      montantConsolide: quotePart,
    });
    sommeConsolidee = sommeConsolidee.add(quotePart);
  }

  // Intérêts minoritaires & résultat part groupe (filiales en intégration globale).
  let interetsMinoritaires = money(0);
  let resultatPartGroupe = money(input.mere.resultat);
  for (const f of input.filiales) {
    const p = partById.get(f.societeId);
    if (!p) continue;
    if (p.methode === 'integration_globale') {
      interetsMinoritaires = interetsMinoritaires.add(
        calculerInteretsMinoritaires(f.resultat, p.pourcentageDetention),
      );
      resultatPartGroupe = resultatPartGroupe.add(calculerPartGroupe(f.resultat, p.pourcentageDetention));
    } else if (p.methode === 'mise_en_equivalence') {
      resultatPartGroupe = resultatPartGroupe.add(calculerPartGroupe(f.resultat, p.pourcentageDetention));
    }
  }

  const totalEliminations = Money.sum(eliminations.map(e => money(e.montant))).round(2).toNumber();

  return {
    lignes,
    interetsMinoritaires: interetsMinoritaires.round(2).toNumber(),
    resultatPartGroupe: resultatPartGroupe.round(2).toNumber(),
    totalEliminations,
    equilibre: sommeConsolidee.abs().toNumber() < 1,
  };
}
