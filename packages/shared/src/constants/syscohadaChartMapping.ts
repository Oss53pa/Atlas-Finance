/**
 * @atlas/shared — SYSCOHADA Chart of Accounts Mapping (revise 2017)
 *
 * Centralised account prefix mapping replacing 50+ hardcoded prefixes across
 * the codebase.  Every prefix follows the OHADA Acte uniforme relatif au
 * droit comptable et a l'information financiere (AUDCIF), annexes.
 *
 * Usage:
 *   import { SYSCOHADA_CHART_MAPPING, accountBelongsTo, getAccountPrefixes }
 *     from '@atlas/shared';
 *
 *   accountBelongsTo('411200', SYSCOHADA_CHART_MAPPING.ACTIF.CREANCES.CLIENTS);
 *   getAccountPrefixes('ACTIF.TRESORERIE.BANQUES'); // => ['52']
 */

// ============================================================================
// MAPPING PRINCIPAL
// ============================================================================

export const SYSCOHADA_CHART_MAPPING = {
  // ========================================================================
  // ACTIF
  // ========================================================================
  ACTIF: {
    /** Classe 2 — Immobilisations incorporelles */
    IMMOBILISATIONS_INCORPORELLES: {
      FRAIS_DEVELOPPEMENT: ['211'] as const,
      BREVETS_LICENCES_LOGICIELS: ['212', '213', '214'] as const,
      FONDS_COMMERCIAL: ['215', '216'] as const,
      AUTRES: ['217', '218', '219'] as const,
      /** Tous les comptes d'immobilisations incorporelles */
      ALL: ['211', '212', '213', '214', '215', '216', '217', '218', '219'] as const,
    },

    /** Classe 2 — Immobilisations corporelles */
    IMMOBILISATIONS_CORPORELLES: {
      TERRAINS: ['22'] as const,
      BATIMENTS: ['231', '232'] as const,
      INSTALLATIONS_AGENCEMENTS: ['233', '234'] as const,
      MATERIEL_MOBILIER: ['24'] as const,
      MATERIEL_TRANSPORT: ['245'] as const,
      MATERIEL_INFORMATIQUE: ['244'] as const,
      AVANCES_ACOMPTES: ['25'] as const,
      /** Tous les comptes d'immobilisations corporelles */
      ALL: ['22', '23', '24', '25'] as const,
    },

    /** Classe 2 — Immobilisations financieres */
    IMMOBILISATIONS_FINANCIERES: {
      TITRES_PARTICIPATION: ['26'] as const,
      AUTRES: ['27'] as const,
      ALL: ['26', '27'] as const,
    },

    /** Comptes 28x — Amortissements */
    AMORTISSEMENTS: {
      INCORPORELS: ['281'] as const,
      CORPORELS: ['282', '283', '284'] as const,
      ALL: ['28'] as const,
    },

    /** Comptes 29x — Depreciations des immobilisations */
    DEPRECIATIONS_IMMOBILISATIONS: ['29'] as const,

    /** Classe 3 — Stocks */
    STOCKS: {
      MARCHANDISES: ['31'] as const,
      MATIERES_PREMIERES: ['32', '33'] as const,
      EN_COURS: ['34', '35'] as const,
      PRODUITS_FABRIQUES: ['36'] as const,
      DEPRECIATIONS: ['39'] as const,
      ALL: ['31', '32', '33', '34', '35', '36'] as const,
    },

    /** Classe 4 — Creances (comptes a solde debiteur) */
    CREANCES: {
      FOURNISSEURS_AVANCES: ['409'] as const,
      CLIENTS: ['411', '412'] as const,
      AUTRES_CREANCES: ['414', '416', '45', '46', '47'] as const,
      DEPRECIATIONS: ['49'] as const,
      CHARGES_CONSTATEES_AVANCE: ['476'] as const,
      /** Comptes tiers lettables cote client */
      LETTRAGE_CLIENTS: ['41'] as const,
      ALL: ['409', '411', '412', '414', '416', '45', '46', '47'] as const,
    },

    /** Classe 5 — Tresorerie actif */
    TRESORERIE: {
      TITRES_PLACEMENT: ['50'] as const,
      VALEURS_ENCAISSER: ['51'] as const,
      BANQUES: ['52'] as const,
      ETABLISSEMENTS_FINANCIERS: ['53'] as const,
      COMPTES_POSTAUX: ['54'] as const,
      CAISSES: ['57'] as const,
      DEPRECIATIONS: ['59'] as const,
      /** Tous les comptes de tresorerie actif (hors depreciations) */
      ALL: ['50', '51', '52', '53', '54', '57'] as const,
      /** Banques + caisses (positions de tresorerie operationnelles) */
      OPERATIONNELLE: ['52', '57'] as const,
    },

    /** Toutes les classes d'actif (1er caractere) */
    CLASSES: ['2', '3', '4', '5'] as const,
  },

  // ========================================================================
  // PASSIF
  // ========================================================================
  PASSIF: {
    /** Classe 1 — Capitaux propres */
    CAPITAUX_PROPRES: {
      CAPITAL: ['101', '102', '103', '104'] as const,
      CAPITAL_NON_APPELE: ['109'] as const,
      PRIMES: ['105'] as const,
      ECARTS_REEVALUATION: ['106'] as const,
      RESERVES_INDISPONIBLES: ['111', '112'] as const,
      RESERVES_LIBRES: ['118'] as const,
      REPORT_A_NOUVEAU: ['12'] as const,
      RESULTAT_EXERCICE: ['13'] as const,
      RESULTAT_BENEFICE: ['120'] as const,
      RESULTAT_PERTE: ['129'] as const,
      SUBVENTIONS_INVESTISSEMENT: ['14'] as const,
      PROVISIONS_REGLEMENTEES: ['15'] as const,
      ALL: ['10', '11', '12', '13', '14', '15'] as const,
    },

    /** Classe 1 — Dettes financieres */
    DETTES_FINANCIERES: {
      EMPRUNTS: ['16'] as const,
      DETTES_CREDIT_BAIL: ['17'] as const,
      DETTES_PARTICIPATIONS: ['18'] as const,
      PROVISIONS_FINANCIERES: ['19'] as const,
      ALL: ['16', '17', '18', '19'] as const,
    },

    /** Classe 4 — Passif circulant (comptes a solde crediteur) */
    PASSIF_CIRCULANT: {
      FOURNISSEURS: ['401', '402', '408'] as const,
      FOURNISSEURS_IMMOBILISATIONS: ['404'] as const,
      DETTES_FISCALES_SOCIALES: ['42', '43', '44'] as const,
      PERSONNEL: ['42'] as const,
      ORGANISMES_SOCIAUX: ['43'] as const,
      ETAT_FISCAL: ['44'] as const,
      AUTRES_DETTES: ['45', '46', '47'] as const,
      DIVIDENDES_A_PAYER: ['465'] as const,
      PROVISIONS_RISQUES: ['499'] as const,
      PRODUITS_CONSTATES_AVANCE: ['477'] as const,
      /** Comptes tiers lettables cote fournisseur */
      LETTRAGE_FOURNISSEURS: ['40'] as const,
      ALL: ['40', '42', '43', '44', '45', '46', '47'] as const,
    },

    /** Classe 5 — Tresorerie passif */
    TRESORERIE_PASSIF: {
      CONCOURS_BANCAIRES: ['56'] as const,
      ALL: ['56'] as const,
    },

    /** Comptes de regularisation passif */
    REGULARISATION: {
      PRODUITS_CONSTATES_AVANCE: ['477'] as const,
      CHARGES_A_PAYER: ['487'] as const,
      ALL: ['477', '487'] as const,
    },
  },

  // ========================================================================
  // COMPTES DE REGULARISATION (actif + passif)
  // ========================================================================
  REGULARISATION: {
    CHARGES_CONSTATEES_AVANCE: ['476'] as const,
    PRODUITS_CONSTATES_AVANCE: ['477'] as const,
    PRODUITS_A_RECEVOIR: ['486'] as const,
    CHARGES_A_PAYER: ['487'] as const,
    ALL: ['476', '477', '486', '487'] as const,
  },

  // ========================================================================
  // COMPTE DE RESULTAT (CDR)
  // ========================================================================
  CDR: {
    /** Produits d'exploitation (classe 7) */
    PRODUITS_EXPLOITATION: {
      VENTES_MARCHANDISES: ['701'] as const,
      VENTES_PRODUITS: ['702', '703', '704'] as const,
      TRAVAUX_SERVICES: ['705', '706'] as const,
      PRODUITS_ACCESSOIRES: ['707'] as const,
      CHIFFRE_AFFAIRES: ['70'] as const,
      PRODUCTION_STOCKEE: ['73'] as const,
      PRODUCTION_IMMOBILISEE: ['72'] as const,
      SUBVENTIONS_EXPLOITATION: ['71'] as const,
      AUTRES_PRODUITS: ['75'] as const,
      REPRISES_PROVISIONS: ['78', '79'] as const,
      TRANSFERTS_CHARGES: ['781'] as const,
      ALL: ['70', '71', '72', '73', '75', '78', '79'] as const,
    },

    /** Charges d'exploitation (classe 6) */
    CHARGES_EXPLOITATION: {
      ACHATS_MARCHANDISES: ['601'] as const,
      VARIATION_STOCKS_MARCHANDISES: ['6031'] as const,
      ACHATS_MATIERES: ['602'] as const,
      VARIATION_STOCKS_MATIERES: ['6032'] as const,
      AUTRES_ACHATS: ['604', '605', '608'] as const,
      TRANSPORTS: ['61'] as const,
      SERVICES_EXTERIEURS: ['62', '63'] as const,
      IMPOTS_TAXES: ['64'] as const,
      AUTRES_CHARGES: ['65'] as const,
      CHARGES_PERSONNEL: ['66'] as const,
      DOTATIONS_AMORTISSEMENTS: ['681'] as const,
      DOTATIONS_PROVISIONS: ['68', '69'] as const,
      ALL: ['60', '61', '62', '63', '64', '65', '66', '68', '69'] as const,
    },

    /** Produits financiers */
    PRODUITS_FINANCIERS: {
      REVENUS_FINANCIERS: ['77'] as const,
      REPRISES_PROVISIONS: ['797'] as const,
      TRANSFERTS_CHARGES: ['787'] as const,
      ALL: ['77', '787', '797'] as const,
    },

    /** Charges financieres */
    CHARGES_FINANCIERES: {
      FRAIS_FINANCIERS: ['67'] as const,
      DOTATIONS_PROVISIONS: ['697'] as const,
      ALL: ['67', '697'] as const,
    },

    /** Produits HAO (Hors Activites Ordinaires) */
    PRODUITS_HAO: {
      PRODUITS_CESSIONS: ['82'] as const,
      AUTRES_PRODUITS_HAO: ['84', '86', '88'] as const,
      ALL: ['82', '84', '86', '88'] as const,
    },

    /** Charges HAO */
    CHARGES_HAO: {
      VNC_CESSIONS: ['81'] as const,
      AUTRES_CHARGES_HAO: ['83', '85'] as const,
      PARTICIPATION_TRAVAILLEURS: ['87'] as const,
      ALL: ['81', '83', '85', '87'] as const,
    },

    /** Impots sur le resultat */
    IMPOTS_RESULTAT: ['89'] as const,
  },

  // ========================================================================
  // TAFIRE (Tableau Financier des Ressources et Emplois)
  // ========================================================================
  TAFIRE: {
    /** Flux lies a l'exploitation */
    EXPLOITATION: {
      PRODUITS: ['7'] as const,
      CHARGES: ['6'] as const,
      DOTATIONS: ['68', '69'] as const,
      REPRISES: ['78', '79'] as const,
      /** Variation BFR — actif circulant */
      BFR_ACTIF: ['3', '41', '46'] as const,
      /** Variation BFR — passif circulant */
      BFR_PASSIF: ['40', '42', '43', '44'] as const,
    },

    /** Flux lies a l'investissement */
    INVESTISSEMENT: {
      /** Acquisitions d'immobilisations (classe 2 hors amortissements) */
      ACQUISITIONS: ['2'] as const,
      /** Prefixe a exclure lors du calcul des acquisitions */
      ACQUISITIONS_EXCLUSION: ['28'] as const,
      CESSIONS: ['82'] as const,
      VNC_CESSIONS: ['81'] as const,
      IMMOBILISATIONS_FINANCIERES: ['26', '27'] as const,
      SUBVENTIONS: ['14'] as const,
    },

    /** Flux lies au financement */
    FINANCEMENT: {
      CAPITAL: ['10'] as const,
      EMPRUNTS: ['16'] as const,
      DIVIDENDES: ['465'] as const,
    },

    /** Tresorerie */
    TRESORERIE: {
      ALL: ['5'] as const,
    },
  },

  // ========================================================================
  // TVA
  // ========================================================================
  TVA: {
    /** TVA collectee (sur ventes) */
    COLLECTEE: ['4431', '4432', '4434', '4457', '44571', '445710'] as const,
    /** TVA deductible (sur achats/immobilisations) */
    DEDUCTIBLE: ['4451', '4452', '4453', '4454', '4456', '44562', '44566', '445660'] as const,
    /** TVA due a l'Etat */
    DUE: ['444', '4444'] as const,
    /** Credit de TVA */
    CREDIT: ['445'] as const,
    /** Tous les comptes TVA */
    ALL: ['443', '444', '445'] as const,
  },

  // ========================================================================
  // COMPTES SPECIAUX — correspondances amortissement / dotation
  // ========================================================================
  CORRESPONDANCES: {
    /** Compte amortissement par prefix d'immobilisation */
    AMORTISSEMENT: {
      '21': '281',
      '22': '282',
      '23': '283',
      '24': '284',
    } as const,
    /** Compte dotation par prefix d'immobilisation */
    DOTATION: {
      '21': '6811',
      '22': '6812',
      '23': '6812',
      '24': '6813',
    } as const,
  },

  // ========================================================================
  // LETTRAGE — comptes tiers reciproques
  // ========================================================================
  LETTRAGE: {
    FOURNISSEURS: ['40'] as const,
    CLIENTS: ['41'] as const,
    ALL: ['40', '41'] as const,
  },

  // ========================================================================
  // CLASSIFICATION par position bilancielle
  // ========================================================================
  POSITION: {
    /** Comptes classe 4 a classer en actif */
    TIERS_ACTIF: ['41', '45', '46', '47'] as const,
    /** Comptes classe 4 a classer en passif */
    TIERS_PASSIF: ['40', '42', '43', '44'] as const,
  },
} as const;

// ============================================================================
// TYPE UTILITAIRE
// ============================================================================

/** Type du mapping complet */
export type SycohadaChartMapping = typeof SYSCOHADA_CHART_MAPPING;

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

/**
 * Verifie si un code comptable appartient a un ensemble de prefixes.
 *
 * @param accountCode - Le code du compte (ex. '411200')
 * @param postePrefixes - Tableau de prefixes a tester (ex. ['411', '412'])
 * @returns true si le code commence par l'un des prefixes
 *
 * @example
 *   accountBelongsTo('411200', SYSCOHADA_CHART_MAPPING.ACTIF.CREANCES.CLIENTS);
 *   // => true
 *
 *   accountBelongsTo('601000', SYSCOHADA_CHART_MAPPING.CDR.CHARGES_EXPLOITATION.ACHATS_MARCHANDISES);
 *   // => true
 */
export function accountBelongsTo(
  accountCode: string,
  postePrefixes: readonly string[],
): boolean {
  return postePrefixes.some(prefix => accountCode.startsWith(prefix));
}

/**
 * Navigue dans le mapping par notation pointee et retourne les prefixes.
 *
 * @param path - Chemin separe par des points (ex. 'ACTIF.TRESORERIE.BANQUES')
 * @returns Le tableau de prefixes correspondant, ou un tableau vide si le
 *          chemin est invalide ou pointe vers un noeud intermediaire.
 *
 * @example
 *   getAccountPrefixes('ACTIF.TRESORERIE.BANQUES');
 *   // => ['52']
 *
 *   getAccountPrefixes('CDR.PRODUITS_HAO.ALL');
 *   // => ['82', '84', '86', '88']
 *
 *   getAccountPrefixes('TVA.COLLECTEE');
 *   // => ['4431', '4432', '4434', '4457', '44571', '445710']
 */
export function getAccountPrefixes(path: string): readonly string[] {
  const segments = path.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = SYSCOHADA_CHART_MAPPING;

  for (const segment of segments) {
    if (current == null || typeof current !== 'object') {
      return [];
    }
    current = current[segment];
  }

  // If we landed on a readonly string array, return it
  if (Array.isArray(current) && current.every((v: unknown) => typeof v === 'string')) {
    return current as readonly string[];
  }

  return [];
}
