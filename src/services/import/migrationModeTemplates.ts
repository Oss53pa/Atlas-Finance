/**
 * Atlas F&A — Templates de migration PAR MODE.
 *
 * Contrairement au catalogue `atlasImportTemplates.ts` (organisé par TYPE de
 * fichier : plan comptable, tiers, grand livre…), ce module décrit les
 * **classeurs de migration par MODE** : un seul fichier Excel multi-feuilles
 * par mode de bascule, exactement comme les modèles officiels distribués aux
 * clients (TEMPLATE_Mode1/2/3_*.xlsx).
 *
 * Chaque mode déclare ses feuilles ordonnées ; chaque feuille pointe vers un
 * `slot` d'import (grandLivre, reportAN, planComptable, tiers, immobilisations)
 * que l'assistant `DataMigrationImport` sait déjà traiter. Le générateur produit
 * le classeur téléchargeable ; le splitter (`splitModeWorkbook`) éclate un
 * classeur uploadé en remplissant ces slots automatiquement.
 *
 * 3 modes (cf. SYSCOHADA / OHADA révisé 2017) :
 *   • Mode 1 — Bascule en cours d'exercice : Grand Livre (RAN + mouvements) obligatoire.
 *   • Mode 2 — Bascule début d'exercice (RECOMMANDÉ) : Balance de clôture N-1 obligatoire.
 *   • Mode 3 — Migration historique complète : Grand Livre Historique + Balances de
 *     Clôture obligatoires, avec une colonne EXERCICE pour empiler plusieurs années.
 */
import type { TemplateColumn } from './atlasImportTemplates';

export type MigrationModeId = 1 | 2 | 3;

/** Slots d'import connus de l'assistant de migration (clés de FILE_CONFIGS). */
export type MigrationSlot =
  | 'grandLivre'
  | 'reportAN'
  | 'planComptable'
  | 'tiers'
  | 'immobilisations';

export interface ModeSheetSpec {
  /** Nom exact de la feuille dans le classeur (sensible à la casse à la génération). */
  sheetName: string;
  /** Variantes acceptées pour retrouver la feuille à l'upload (insensible casse/accents). */
  sheetAliases?: string[];
  /** Slot d'import alimenté par cette feuille. */
  slot: MigrationSlot;
  /** Feuille obligatoire pour ce mode ? */
  required: boolean;
  /**
   * Émettre les en-têtes "bruts" (sans suffixe " *" sur les colonnes obligatoires).
   * Utilisé pour les feuilles Grand Livre dont l'en-tête est en MAJUSCULES sans astérisque.
   */
  rawHeaders?: boolean;
  /** Cette feuille porte une colonne EXERCICE en tête (Mode 3). */
  hasExercice?: boolean;
  columns: TemplateColumn[];
}

export interface MigrationModeTemplate {
  mode: MigrationModeId;
  /** Code court (apparaît dans les métadonnées du fichier). */
  code: string;
  /** Base du nom de fichier généré. */
  fileBaseName: string;
  /** Titre court du mode. */
  title: string;
  /** Mode recommandé par défaut. */
  recommended?: boolean;
  /** Lignes affichées dans la feuille « 📖 Instructions ». */
  instructions: string[];
  /** Libellé de la feuille « ✅ Contrôle ». */
  controlLabel: string;
  /** Feuilles de données, dans l'ordre. */
  sheets: ModeSheetSpec[];
}

// ────────────────────────────────────────────────────────────
// Colonnes réutilisables (calquées sur les modèles officiels)
// ────────────────────────────────────────────────────────────

/** Colonne EXERCICE (Mode 3) — préfixe des feuilles historiques. */
const COL_EXERCICE: TemplateColumn = {
  key: 'exercice', header: 'EXERCICE',
  aliases: ['Exercice', 'Annee', 'Année', 'FiscalYear', 'Year', 'Periode'],
  required: true, type: 'string', example: '2023',
  description: 'Année de l\'exercice comptable (ex. 2023). Permet d\'empiler plusieurs exercices dans un seul fichier.',
};

/**
 * Grand Livre — en-têtes MAJUSCULES sans astérisque (style du modèle officiel).
 * COMPTE | LIBELLE | DATE | JOURNAL | NUMERO DE SAISIE | DESCRIPTION | LETTRAGE | DEBIT | CREDIT
 */
const GRAND_LIVRE_COLUMNS: TemplateColumn[] = [
  { key: 'compte', header: 'COMPTE', aliases: ['CompteNum', 'Numero_Compte', 'NoCompte', 'Compte'], required: true, type: 'string', example: '411000', description: 'Numéro de compte SYSCOHADA' },
  { key: 'libelleCompte', header: 'LIBELLE', aliases: ['LibelleCompte', 'CompteLib', 'Libelle', 'Intitule', 'IntituleCompte', 'NomCompte'], required: false, type: 'string', example: 'Clients' },
  { key: 'date', header: 'DATE', aliases: ['EcritureDate', 'DateEcriture', 'DatePiece'], required: true, type: 'date', example: '2026-01-15' },
  { key: 'journal', header: 'JOURNAL', aliases: ['JournalCode', 'Code_Journal', 'CodeJournal'], required: true, type: 'string', example: 'VE', description: 'AC, VE, BQ, CA, OD, AN, CL' },
  { key: 'numeroEcriture', header: 'NUMERO DE SAISIE', aliases: ['NumeroSaisie', 'NumeroDeSaisie', 'N_Saisie', 'EcritureNum', 'NumeroEcriture', 'PieceNum', 'NumPiece', 'Numero'], required: false, type: 'string', example: 'VE-2026-0001', description: 'Regroupe les lignes d\'une même écriture' },
  { key: 'libelleEcriture', header: 'DESCRIPTION', aliases: ['EcritureLib', 'Description', 'Libelle', 'Commentaire', 'Memo', 'LibelleEcriture'], required: false, type: 'string', example: 'Facture SANGA FAC-001' },
  { key: 'lettrage', header: 'LETTRAGE', aliases: ['Lettrage', 'EcritureLet', 'CodeLettrage', 'Letter'], required: false, type: 'string', example: 'A' },
  { key: 'debit', header: 'DEBIT', aliases: ['Debit', 'MontantDebit', 'MtDebit'], required: true, type: 'number', example: 1180000 },
  { key: 'credit', header: 'CREDIT', aliases: ['Credit', 'MontantCredit', 'MtCredit'], required: true, type: 'number', example: 0 },
];

/**
 * Balance de clôture N-1 (Mode 2) → slot reportAN.
 * Compte | Libellé | Tiers | Solde Débiteur | Solde Créditeur
 */
const BALANCE_N1_COLUMNS: TemplateColumn[] = [
  { key: 'compte', header: 'Compte', aliases: ['CompteNum', 'Numero', 'NumeroCompte'], required: true, type: 'string', example: '101000' },
  { key: 'libelle', header: 'Libellé', aliases: ['Libelle', 'CompteLib', 'Intitule'], required: false, type: 'string', example: 'Capital social' },
  { key: 'tiers', header: 'Tiers', aliases: ['CompteAux', 'CodeTiers', 'ThirdParty'], required: false, type: 'string', example: 'CLI001' },
  { key: 'soldeDebiteur', header: 'Solde Débiteur', aliases: ['SoldeDebit', 'Debit', 'DebitBalance', 'SoldeDebiteur'], required: true, type: 'number', example: 0 },
  { key: 'soldeCrediteur', header: 'Solde Créditeur', aliases: ['SoldeCredit', 'Credit', 'CreditBalance', 'SoldeCrediteur'], required: true, type: 'number', example: 10000000 },
];

/**
 * Balances de Clôture (Mode 3) → slot reportAN, une ligne par compte ET par exercice.
 * EXERCICE | Compte | Libellé | Solde Débiteur | Solde Créditeur
 */
const BALANCES_CLOTURE_COLUMNS: TemplateColumn[] = [
  COL_EXERCICE,
  { key: 'compte', header: 'Compte', aliases: ['CompteNum', 'Numero', 'NumeroCompte'], required: true, type: 'string', example: '101000' },
  { key: 'libelle', header: 'Libellé', aliases: ['Libelle', 'CompteLib', 'Intitule'], required: false, type: 'string', example: 'Capital social' },
  { key: 'soldeDebiteur', header: 'Solde Débiteur', aliases: ['SoldeDebit', 'Debit', 'SoldeDebiteur'], required: true, type: 'number', example: 0 },
  { key: 'soldeCrediteur', header: 'Solde Créditeur', aliases: ['SoldeCredit', 'Credit', 'SoldeCrediteur'], required: true, type: 'number', example: 10000000 },
];

/** Plan Comptable (optionnel, partagé) → slot planComptable. */
const PLAN_COMPTABLE_COLUMNS: TemplateColumn[] = [
  { key: 'numero', header: 'Numéro', aliases: ['N°', 'No', 'Compte', 'CompteNum', 'Numero'], required: true, type: 'string', example: '411000' },
  { key: 'libelle', header: 'Libellé', aliases: ['Libelle', 'Intitule', 'Intitulé', 'Nom', 'CompteLib'], required: true, type: 'string', example: 'Clients' },
  { key: 'classe', header: 'Classe', aliases: ['Class'], required: false, type: 'number', example: 4 },
  { key: 'type', header: 'Type', aliases: ['Sens', 'Nature'], required: false, type: 'string', example: 'D' },
  { key: 'lettrable', header: 'Lettrable', aliases: ['Lettrage'], required: false, type: 'boolean', example: 'OUI' },
  { key: 'auxiliaire', header: 'Auxiliaire', aliases: ['Tiers'], required: false, type: 'boolean', example: 'OUI' },
];

/** Tiers (optionnel, partagé) → slot tiers. */
const TIERS_COLUMNS: TemplateColumn[] = [
  { key: 'code', header: 'Code', aliases: ['CodeTiers', 'ThirdPartyCode', 'ID'], required: true, type: 'string', example: 'CLI001' },
  { key: 'nom', header: 'Nom', aliases: ['RaisonSociale', 'Denomination', 'Dénomination'], required: true, type: 'string', example: 'SANGA & Fils SARL' },
  { key: 'type', header: 'Type', aliases: ['Category', 'Categorie', 'Nature'], required: true, type: 'string', example: 'CLIENT', description: 'CLIENT, FOURNISSEUR, SALARIE, AUTRE' },
  { key: 'nif', header: 'NIF', aliases: ['Identifiant_Fiscal', 'IF', 'TaxID'], required: false, type: 'string', example: 'CI123456789' },
  { key: 'rccm', header: 'RCCM', aliases: ['Registre_Commerce'], required: false, type: 'string', example: 'CI-ABJ-2025-B-08742' },
  { key: 'adresse', header: 'Adresse', aliases: ['Address', 'Rue'], required: false, type: 'string' },
  { key: 'ville', header: 'Ville', aliases: ['City', 'Localite'], required: false, type: 'string', example: 'Abidjan' },
  { key: 'pays', header: 'Pays', aliases: ['Country'], required: false, type: 'string', example: 'CI' },
  { key: 'telephone', header: 'Téléphone', aliases: ['Telephone', 'Tel', 'Phone'], required: false, type: 'string', example: '+225 0102030405' },
  { key: 'email', header: 'Email', aliases: ['Mail', 'Courriel'], required: false, type: 'string' },
  { key: 'compteCollectif', header: 'Compte Collectif', aliases: ['Compte', 'CompteTiers'], required: false, type: 'string', example: '411000' },
];

/** Immobilisations (optionnel, partagé) → slot immobilisations. */
const IMMOBILISATIONS_COLUMNS: TemplateColumn[] = [
  { key: 'code', header: 'Code', aliases: ['CodeImmo', 'AssetCode', 'ID'], required: true, type: 'string', example: 'IMMO-001' },
  { key: 'libelle', header: 'Désignation', aliases: ['Libelle', 'Designation', 'Nom'], required: true, type: 'string', example: 'Véhicule Toyota Hilux' },
  { key: 'categorie', header: 'Catégorie', aliases: ['Categorie', 'Type'], required: false, type: 'string', example: 'Matériel de transport' },
  { key: 'compteImmo', header: 'Compte Immo', aliases: ['CompteImmobilisation', 'AssetAccount'], required: true, type: 'string', example: '245000' },
  { key: 'compteAmort', header: 'Compte Amort.', aliases: ['CompteAmortissement', 'DepreciationAccount'], required: true, type: 'string', example: '284500' },
  { key: 'dateAcquisition', header: 'Date Acquisition', aliases: ['DateAcq', 'AcquisitionDate'], required: true, type: 'date', example: '2024-03-15' },
  { key: 'valeurOrigine', header: 'Valeur Origine', aliases: ['VO', 'ValeurAcquisition', 'Cost'], required: true, type: 'number', example: 15000000 },
  { key: 'duree', header: 'Durée (années)', aliases: ['Duree', 'UsefulLife'], required: true, type: 'number', example: 5 },
  { key: 'methode', header: 'Méthode', aliases: ['Methode', 'DepreciationMethod'], required: false, type: 'string', example: 'LINEAIRE' },
  { key: 'amortCumule', header: 'Amort. Cumulé', aliases: ['AmortissementCumule', 'AccumulatedDepreciation'], required: false, type: 'number', example: 3000000 },
  { key: 'vnc', header: 'VNC', aliases: ['ValeurNetteComptable', 'NetBookValue'], required: false, type: 'number', example: 12000000 },
];

// Feuilles optionnelles communes aux 3 modes (référentiel d'enrichissement).
const OPTIONAL_SHARED_SHEETS: ModeSheetSpec[] = [
  { sheetName: 'Plan Comptable', sheetAliases: ['PlanComptable', 'Comptes', 'PCG'], slot: 'planComptable', required: false, columns: PLAN_COMPTABLE_COLUMNS },
  { sheetName: 'Tiers', sheetAliases: ['Clients', 'Fournisseurs', 'ClientsFournisseurs'], slot: 'tiers', required: false, columns: TIERS_COLUMNS },
  { sheetName: 'Immobilisations', sheetAliases: ['Immo', 'Assets', 'FixedAssets'], slot: 'immobilisations', required: false, columns: IMMOBILISATIONS_COLUMNS },
];

// ────────────────────────────────────────────────────────────
// Définition des 3 modes
// ────────────────────────────────────────────────────────────

export const MIGRATION_MODE_TEMPLATES: Record<MigrationModeId, MigrationModeTemplate> = {
  1: {
    mode: 1,
    code: 'ATLAS-MODE1',
    fileBaseName: 'TEMPLATE_Mode1_Bascule_En_Cours_Exercice',
    title: 'Bascule en cours d\'exercice',
    instructions: [
      'MODE 1 — Bascule en cours d\'exercice',
      '',
      'L\'exercice N est déjà commencé.',
      'Reprise via Grand Livre : journal À Nouveau (RAN au 01/01/N) + tous les mouvements du 01/01/N à la date de bascule.',
      '⚠️ NE PAS importer en plus un fichier « Reports à Nouveau » séparé : le Grand Livre contient déjà le journal RAN (sinon ouverture comptée deux fois).',
      '',
      'FICHIERS DE CE CLASSEUR',
      '•  Grand Livre — OBLIGATOIRE (journal RAN + mouvements)',
      '•  Plan Comptable — optionnel (Atlas embarque déjà SYSCOHADA révisé 2017)',
      '•  Tiers — optionnel (enrichit NIF/RCCM/adresses)',
      '•  Immobilisations — optionnel (registre + amortissements)',
    ],
    controlLabel: 'Grand Livre — RAN + mouvements (équilibre global)',
    sheets: [
      { sheetName: 'Grand Livre', sheetAliases: ['GrandLivre', 'GeneralLedger', 'GL'], slot: 'grandLivre', required: true, rawHeaders: true, columns: GRAND_LIVRE_COLUMNS },
      ...OPTIONAL_SHARED_SHEETS,
    ],
  },

  2: {
    mode: 2,
    code: 'ATLAS-MODE2',
    fileBaseName: 'TEMPLATE_Mode2_Bascule_Debut_Exercice',
    title: 'Bascule début d\'exercice',
    recommended: true,
    instructions: [
      'MODE 2 — Bascule début d\'exercice (RECOMMANDÉ)',
      '',
      'Au 01/01/N, juste après avoir clôturé l\'exercice précédent.',
      'Reprise minimale via la Balance de clôture N-1 (À Nouveau).',
      'La Balance au 31/12/N-1 devient automatiquement le journal AN (À Nouveau) d\'ouverture.',
      'Comptes de classe 1-5 (bilan) reportés en soldes d\'ouverture ; classes 6-7 (gestion) annualisées à zéro.',
      'Tiers et immobilisations facultatifs (pour enrichir le référentiel).',
      '',
      'FICHIERS DE CE CLASSEUR',
      '•  Balance Clôture N-1 — OBLIGATOIRE (soldes classes 1 à 5)',
      '•  Plan Comptable / Tiers / Immobilisations — optionnels',
    ],
    controlLabel: 'Balance de clôture N-1 — classes 1 à 5',
    sheets: [
      { sheetName: 'Balance Clôture N-1', sheetAliases: ['BalanceClotureN1', 'Balance Cloture N-1', 'Balance', 'A-Nouveaux', 'ReportsANouveau', 'AN', 'Balance_Ouverture'], slot: 'reportAN', required: true, columns: BALANCE_N1_COLUMNS },
      ...OPTIONAL_SHARED_SHEETS,
    ],
  },

  3: {
    mode: 3,
    code: 'ATLAS-MODE3',
    fileBaseName: 'TEMPLATE_Mode3_Migration_Historique_Complete',
    title: 'Migration historique complète',
    instructions: [
      'MODE 3 — Migration historique complète',
      '',
      'Tout l\'historique des exercices clos est repris dans Atlas.',
      'Réservé aux cas d\'audit, fusion, ou obligation légale OHADA.',
      'Le Grand Livre Historique porte une colonne EXERCICE pour empiler plusieurs années dans un seul fichier.',
      'Les Balances de Clôture (une ligne par compte et par exercice) servent à valider chaque année close et à chaîner les À-Nouveaux.',
      '',
      'FICHIERS DE CE CLASSEUR',
      '•  Grand Livre Historique — OBLIGATOIRE (colonne EXERCICE + mouvements)',
      '•  Balances Clôture — OBLIGATOIRE (une balance par exercice clos)',
      '•  Plan Comptable / Tiers / Immobilisations — optionnels',
    ],
    controlLabel: 'Grand Livre Historique — tous exercices (équilibre global)',
    sheets: [
      { sheetName: 'Grand Livre Historique', sheetAliases: ['GrandLivreHistorique', 'GLHistorique', 'GrandLivre', 'GL'], slot: 'grandLivre', required: true, rawHeaders: true, hasExercice: true, columns: [COL_EXERCICE, ...GRAND_LIVRE_COLUMNS] },
      { sheetName: 'Balances Clôture', sheetAliases: ['BalancesCloture', 'Balances Cloture', 'BalanceCloture', 'Balances'], slot: 'reportAN', required: true, hasExercice: true, columns: BALANCES_CLOTURE_COLUMNS },
      ...OPTIONAL_SHARED_SHEETS,
    ],
  },
};

/** Récupère le template d'un mode. */
export function getModeTemplate(mode: MigrationModeId): MigrationModeTemplate {
  return MIGRATION_MODE_TEMPLATES[mode];
}

/** Liste des slots obligatoires d'un mode. */
export function requiredSlotsForMode(mode: MigrationModeId): MigrationSlot[] {
  return MIGRATION_MODE_TEMPLATES[mode].sheets
    .filter(s => s.required)
    .map(s => s.slot);
}
