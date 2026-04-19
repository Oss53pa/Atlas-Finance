/**
 * Atlas F&A — Catalogue officiel des templates d'import.
 *
 * Chaque template définit :
 *   - une ou plusieurs feuilles (sheets)
 *   - les colonnes obligatoires et optionnelles
 *   - une signature permettant la détection automatique du template
 *     à partir d'un fichier uploadé (Excel/CSV)
 *
 * L'application peut ainsi reconnaître automatiquement ses propres modèles
 * et déclencher l'import approprié sans configuration manuelle.
 */

export type TemplateKey =
  | 'plan_comptable'
  | 'tiers'
  | 'ecritures'
  | 'grand_livre'
  | 'reports_a_nouveau'
  | 'immobilisations'
  | 'fec_syscohada'
  | 'balance'
  | 'budget'
  | 'taux_devises'
  | 'stocks'
  // Paramètres (migration depuis un autre logiciel)
  | 'parametres_societe'
  | 'parametres_exercices'
  | 'parametres_journaux'
  | 'parametres_taux_tva'
  | 'parametres_comptes_bancaires'
  | 'parametres_sections_analytiques'
  | 'parametres_utilisateurs'
  // Trésorerie avancée
  | 'ordres_paiement'
  | 'registre_cheques'
  | 'calendrier_emprunts'
  // Stocks avancés
  | 'mouvements_stocks'
  // Comptabilité hors-bilan
  | 'engagements_hors_bilan';

export interface TemplateColumn {
  /** Clé interne (utilisée comme propriété) */
  key: string;
  /** En-tête exact dans le fichier (tel qu'il doit apparaître sur la 1ère ligne) */
  header: string;
  /** Variantes acceptées (FR/EN, accents, casse) — utilisées pour le fuzzy-matching */
  aliases?: string[];
  required: boolean;
  /** Type de données attendu */
  type: 'string' | 'number' | 'date' | 'boolean';
  /** Exemple affiché dans le template pour guider l'utilisateur */
  example?: string | number;
  /** Description infobulle */
  description?: string;
}

export interface TemplateSheet {
  /** Nom exact de la feuille dans l'XLSX (sensible à la casse) */
  sheetName: string;
  /** Variantes acceptées pour la détection automatique */
  sheetAliases?: string[];
  columns: TemplateColumn[];
  /** Commentaire affiché dans l'en-tête du template (row 1) */
  headerComment?: string;
}

export interface AtlasImportTemplate {
  key: TemplateKey;
  /** Code court — apparaît dans le nom du fichier généré */
  code: string;
  /** Libellé affiché à l'utilisateur */
  label: string;
  /** Description longue */
  description: string;
  /** Icône Lucide */
  icon?: string;
  /** Feuilles composant le template */
  sheets: TemplateSheet[];
  /** Catégorie (pour regroupement UI) */
  category: 'comptabilite' | 'tiers' | 'immobilisations' | 'budget' | 'tresorerie' | 'stocks' | 'parametres';
  /** Exemples de lignes pré-remplies dans le template téléchargé */
  sampleRows?: Record<string, unknown>[];
}

/**
 * ATLAS_IMPORT_TEMPLATES — Catalogue officiel des modèles Atlas F&A.
 */
export const ATLAS_IMPORT_TEMPLATES: AtlasImportTemplate[] = [
  // ────────────────────────────────────────────
  // 1. PLAN COMPTABLE SYSCOHADA
  // ────────────────────────────────────────────
  {
    key: 'plan_comptable',
    code: 'ATLAS-PC',
    label: 'Plan Comptable SYSCOHADA',
    description: 'Plan comptable OHADA révisé 2017 — Classes 1 à 9',
    icon: 'BookOpen',
    category: 'comptabilite',
    sheets: [
      {
        sheetName: 'Plan Comptable',
        sheetAliases: ['PlanComptable', 'Comptes', 'PCG', 'Plan_Comptable'],
        headerComment: 'Atlas F&A — Modèle Plan Comptable SYSCOHADA',
        columns: [
          { key: 'numero', header: 'Numéro', aliases: ['N°', 'No', 'Compte', 'CompteNum', 'Numero'], required: true, type: 'string', example: '411000', description: 'Code du compte SYSCOHADA (2 à 8 chiffres)' },
          { key: 'libelle', header: 'Libellé', aliases: ['Libelle', 'Intitule', 'Intitulé', 'Nom', 'CompteLib'], required: true, type: 'string', example: 'Clients', description: 'Intitulé officiel du compte' },
          { key: 'classe', header: 'Classe', aliases: ['Class'], required: false, type: 'number', example: 4, description: 'Classe SYSCOHADA (1-9)' },
          { key: 'type', header: 'Type', aliases: ['Sens', 'Nature'], required: false, type: 'string', example: 'D', description: 'D = Débiteur, C = Créditeur, M = Mixte' },
          { key: 'lettrable', header: 'Lettrable', aliases: ['Lettrage', 'LettrableOuiNon'], required: false, type: 'boolean', example: 'OUI' },
          { key: 'auxiliaire', header: 'Auxiliaire', aliases: ['Auxiliarise', 'Tiers'], required: false, type: 'boolean', example: 'OUI' },
        ],
      },
    ],
    sampleRows: [
      { Numéro: '101000', Libellé: 'Capital social', Classe: 1, Type: 'C', Lettrable: 'NON', Auxiliaire: 'NON' },
      { Numéro: '411000', Libellé: 'Clients', Classe: 4, Type: 'D', Lettrable: 'OUI', Auxiliaire: 'OUI' },
      { Numéro: '401000', Libellé: 'Fournisseurs', Classe: 4, Type: 'C', Lettrable: 'OUI', Auxiliaire: 'OUI' },
      { Numéro: '521000', Libellé: 'Banque', Classe: 5, Type: 'D', Lettrable: 'OUI', Auxiliaire: 'NON' },
      { Numéro: '601000', Libellé: 'Achats de marchandises', Classe: 6, Type: 'D', Lettrable: 'NON', Auxiliaire: 'NON' },
      { Numéro: '701000', Libellé: 'Ventes de marchandises', Classe: 7, Type: 'C', Lettrable: 'NON', Auxiliaire: 'NON' },
    ],
  },

  // ────────────────────────────────────────────
  // 2. TIERS (clients / fournisseurs)
  // ────────────────────────────────────────────
  {
    key: 'tiers',
    code: 'ATLAS-TRS',
    label: 'Tiers (Clients / Fournisseurs)',
    description: 'Fichier clients, fournisseurs et autres tiers',
    icon: 'Users',
    category: 'tiers',
    sheets: [
      {
        sheetName: 'Tiers',
        sheetAliases: ['Clients', 'Fournisseurs', 'ClientsFournisseurs', 'Partners'],
        headerComment: 'Atlas F&A — Modèle Tiers (clients, fournisseurs, autres)',
        columns: [
          { key: 'code', header: 'Code', aliases: ['CodeTiers', 'ThirdPartyCode', 'ID'], required: true, type: 'string', example: 'CLI001', description: 'Code unique du tiers' },
          { key: 'nom', header: 'Nom', aliases: ['RaisonSociale', 'Denomination', 'Dénomination', 'Nom_Client'], required: true, type: 'string', example: 'SANGA & Fils SARL' },
          { key: 'type', header: 'Type', aliases: ['Category', 'Categorie', 'Nature'], required: true, type: 'string', example: 'CLIENT', description: 'CLIENT, FOURNISSEUR, SALARIE, AUTRE' },
          { key: 'nif', header: 'NIF', aliases: ['Identifiant_Fiscal', 'IF', 'TaxID'], required: false, type: 'string', example: 'CI123456789' },
          { key: 'rccm', header: 'RCCM', aliases: ['Registre_Commerce'], required: false, type: 'string', example: 'CI-ABJ-2025-B-08742' },
          { key: 'adresse', header: 'Adresse', aliases: ['Address', 'Rue'], required: false, type: 'string' },
          { key: 'ville', header: 'Ville', aliases: ['City', 'Localite'], required: false, type: 'string', example: 'Abidjan' },
          { key: 'pays', header: 'Pays', aliases: ['Country'], required: false, type: 'string', example: 'CI' },
          { key: 'telephone', header: 'Téléphone', aliases: ['Telephone', 'Tel', 'Phone'], required: false, type: 'string', example: '+225 0102030405' },
          { key: 'email', header: 'Email', aliases: ['Mail', 'Courriel'], required: false, type: 'string' },
          { key: 'compteCollectif', header: 'Compte Collectif', aliases: ['Compte', 'CompteTiers'], required: false, type: 'string', example: '411000', description: 'Compte SYSCOHADA rattaché' },
        ],
      },
    ],
    sampleRows: [
      { Code: 'CLI001', Nom: 'SANGA & Fils SARL', Type: 'CLIENT', NIF: 'CI123456789', RCCM: 'CI-ABJ-2025-B-08742', Adresse: 'Plateau, Rue du Commerce', Ville: 'Abidjan', Pays: 'CI', Téléphone: '+225 0102030405', Email: 'contact@sangafils.ci', 'Compte Collectif': '411000' },
      { Code: 'FOU001', Nom: 'CFAO Motors', Type: 'FOURNISSEUR', NIF: 'CI987654321', RCCM: 'CI-ABJ-2020-B-12345', Adresse: 'Zone 4', Ville: 'Abidjan', Pays: 'CI', Téléphone: '+225 0506070809', Email: 'achats@cfao.ci', 'Compte Collectif': '401000' },
    ],
  },

  // ────────────────────────────────────────────
  // 3. ECRITURES COMPTABLES
  // ────────────────────────────────────────────
  {
    key: 'ecritures',
    code: 'ATLAS-ECR',
    label: 'Écritures Comptables',
    description: 'Journal d\'écritures comptables SYSCOHADA',
    icon: 'FileText',
    category: 'comptabilite',
    sheets: [
      {
        sheetName: 'Ecritures',
        sheetAliases: ['Écritures', 'Entries', 'Journal', 'JournalEntries'],
        headerComment: 'Atlas F&A — Modèle Écritures Comptables',
        columns: [
          { key: 'date', header: 'Date', aliases: ['EcritureDate', 'DateEcriture'], required: true, type: 'date', example: '2026-01-15' },
          { key: 'journal', header: 'Journal', aliases: ['JournalCode', 'Code_Journal'], required: true, type: 'string', example: 'VE', description: 'AC, VE, BQ, CA, OD, AN, CL' },
          { key: 'piece', header: 'Pièce', aliases: ['Piece', 'PieceRef', 'N°Piece', 'NumPiece'], required: false, type: 'string', example: 'FAC-2026-001' },
          { key: 'compte', header: 'Compte', aliases: ['CompteNum', 'Numero_Compte', 'CompteNumero'], required: true, type: 'string', example: '411000' },
          { key: 'tiers', header: 'Tiers', aliases: ['CompteAux', 'ThirdParty', 'CodeTiers'], required: false, type: 'string', example: 'CLI001' },
          { key: 'libelle', header: 'Libellé', aliases: ['Libelle', 'EcritureLib', 'Description'], required: true, type: 'string' },
          { key: 'debit', header: 'Débit', aliases: ['Debit', 'Montant_Debit'], required: true, type: 'number', example: 118000 },
          { key: 'credit', header: 'Crédit', aliases: ['Credit', 'Montant_Credit'], required: true, type: 'number', example: 0 },
          { key: 'lettrage', header: 'Lettrage', aliases: ['Letter', 'EcritureLet'], required: false, type: 'string' },
          { key: 'echeance', header: 'Échéance', aliases: ['Echeance', 'DueDate'], required: false, type: 'date' },
        ],
      },
    ],
    sampleRows: [
      { Date: '2026-01-15', Journal: 'VE', Pièce: 'FAC-2026-001', Compte: '411000', Tiers: 'CLI001', Libellé: 'Facture SANGA', Débit: 118000, Crédit: 0 },
      { Date: '2026-01-15', Journal: 'VE', Pièce: 'FAC-2026-001', Compte: '701000', Tiers: '', Libellé: 'Facture SANGA', Débit: 0, Crédit: 100000 },
      { Date: '2026-01-15', Journal: 'VE', Pièce: 'FAC-2026-001', Compte: '443100', Tiers: '', Libellé: 'TVA collectée 18%', Débit: 0, Crédit: 18000 },
    ],
  },

  // ────────────────────────────────────────────
  // 4. REPORTS A NOUVEAU
  // ────────────────────────────────────────────
  {
    key: 'reports_a_nouveau',
    code: 'ATLAS-AN',
    label: 'Reports à Nouveau',
    description: 'Soldes d\'ouverture de l\'exercice (classes 1 à 5)',
    icon: 'Calculator',
    category: 'comptabilite',
    sheets: [
      {
        sheetName: 'A-Nouveaux',
        sheetAliases: ['ReportsANouveau', 'AN', 'Balance_Ouverture', 'OpeningBalance'],
        headerComment: 'Atlas F&A — Modèle Reports à Nouveau (solde d\'ouverture)',
        columns: [
          { key: 'compte', header: 'Compte', aliases: ['CompteNum', 'Numero'], required: true, type: 'string', example: '101000' },
          { key: 'libelle', header: 'Libellé', aliases: ['Libelle', 'CompteLib'], required: false, type: 'string' },
          { key: 'tiers', header: 'Tiers', aliases: ['CompteAux', 'ThirdParty'], required: false, type: 'string' },
          { key: 'soldeDebiteur', header: 'Solde Débiteur', aliases: ['SoldeDebit', 'Debit', 'DebitBalance'], required: true, type: 'number', example: 0 },
          { key: 'soldeCrediteur', header: 'Solde Créditeur', aliases: ['SoldeCredit', 'Credit', 'CreditBalance'], required: true, type: 'number', example: 10000000 },
        ],
      },
    ],
    sampleRows: [
      { Compte: '101000', Libellé: 'Capital social', Tiers: '', 'Solde Débiteur': 0, 'Solde Créditeur': 10000000 },
      { Compte: '411000', Libellé: 'Clients', Tiers: 'CLI001', 'Solde Débiteur': 2500000, 'Solde Créditeur': 0 },
      { Compte: '521000', Libellé: 'Banque', Tiers: '', 'Solde Débiteur': 5000000, 'Solde Créditeur': 0 },
    ],
  },

  // ────────────────────────────────────────────
  // 5. IMMOBILISATIONS
  // ────────────────────────────────────────────
  {
    key: 'immobilisations',
    code: 'ATLAS-IMMO',
    label: 'Immobilisations',
    description: 'Registre des immobilisations avec amortissements',
    icon: 'Package',
    category: 'immobilisations',
    sheets: [
      {
        sheetName: 'Immobilisations',
        sheetAliases: ['Immo', 'Assets', 'FixedAssets', 'Registre_Immos'],
        headerComment: 'Atlas F&A — Modèle Immobilisations',
        columns: [
          { key: 'code', header: 'Code', aliases: ['CodeImmo', 'AssetCode', 'ID'], required: true, type: 'string', example: 'IMMO-001' },
          { key: 'libelle', header: 'Désignation', aliases: ['Libelle', 'Designation', 'Nom'], required: true, type: 'string', example: 'Véhicule Toyota Hilux' },
          { key: 'categorie', header: 'Catégorie', aliases: ['Categorie', 'Type'], required: false, type: 'string', example: 'Matériel de transport' },
          { key: 'compteImmo', header: 'Compte Immo', aliases: ['CompteImmobilisation', 'AssetAccount'], required: true, type: 'string', example: '245000' },
          { key: 'compteAmort', header: 'Compte Amort.', aliases: ['CompteAmortissement', 'DepreciationAccount'], required: true, type: 'string', example: '284500' },
          { key: 'dateAcquisition', header: 'Date Acquisition', aliases: ['DateAcq', 'AcquisitionDate'], required: true, type: 'date', example: '2024-03-15' },
          { key: 'valeurOrigine', header: 'Valeur Origine', aliases: ['VO', 'ValeurAcquisition', 'Cost'], required: true, type: 'number', example: 15000000 },
          { key: 'duree', header: 'Durée (années)', aliases: ['Duree', 'UsefulLife'], required: true, type: 'number', example: 5 },
          { key: 'methode', header: 'Méthode', aliases: ['Methode', 'DepreciationMethod'], required: false, type: 'string', example: 'LINEAIRE', description: 'LINEAIRE ou DEGRESSIVE' },
          { key: 'amortCumule', header: 'Amort. Cumulé', aliases: ['AmortissementCumule', 'AccumulatedDepreciation'], required: false, type: 'number', example: 3000000 },
          { key: 'vnc', header: 'VNC', aliases: ['ValeurNetteComptable', 'NetBookValue'], required: false, type: 'number', example: 12000000 },
        ],
      },
    ],
    sampleRows: [
      { Code: 'IMMO-001', Désignation: 'Véhicule Toyota Hilux', Catégorie: 'Matériel de transport', 'Compte Immo': '245000', 'Compte Amort.': '284500', 'Date Acquisition': '2024-03-15', 'Valeur Origine': 15000000, 'Durée (années)': 5, Méthode: 'LINEAIRE', 'Amort. Cumulé': 3000000, VNC: 12000000 },
    ],
  },

  // ────────────────────────────────────────────
  // 6. FEC SYSCOHADA
  // ────────────────────────────────────────────
  {
    key: 'fec_syscohada',
    code: 'ATLAS-FEC',
    label: 'FEC SYSCOHADA',
    description: 'Fichier des Écritures Comptables conforme Art. A.47 A-1',
    icon: 'FileSpreadsheet',
    category: 'comptabilite',
    sheets: [
      {
        sheetName: 'FEC',
        sheetAliases: ['FichierEcrituresComptables', 'FEC_SYSCOHADA'],
        headerComment: 'Atlas F&A — FEC SYSCOHADA (18 colonnes réglementaires)',
        columns: [
          { key: 'JournalCode', header: 'JournalCode', required: true, type: 'string' },
          { key: 'JournalLib', header: 'JournalLib', required: true, type: 'string' },
          { key: 'EcritureNum', header: 'EcritureNum', required: true, type: 'string' },
          { key: 'EcritureDate', header: 'EcritureDate', required: true, type: 'date' },
          { key: 'CompteNum', header: 'CompteNum', required: true, type: 'string' },
          { key: 'CompteLib', header: 'CompteLib', required: true, type: 'string' },
          { key: 'CompAuxNum', header: 'CompAuxNum', required: false, type: 'string' },
          { key: 'CompAuxLib', header: 'CompAuxLib', required: false, type: 'string' },
          { key: 'PieceRef', header: 'PieceRef', required: false, type: 'string' },
          { key: 'PieceDate', header: 'PieceDate', required: false, type: 'date' },
          { key: 'EcritureLib', header: 'EcritureLib', required: true, type: 'string' },
          { key: 'Debit', header: 'Debit', required: true, type: 'number' },
          { key: 'Credit', header: 'Credit', required: true, type: 'number' },
          { key: 'EcritureLet', header: 'EcritureLet', required: false, type: 'string' },
          { key: 'DateLet', header: 'DateLet', required: false, type: 'date' },
          { key: 'ValidDate', header: 'ValidDate', required: false, type: 'date' },
          { key: 'Montantdevise', header: 'Montantdevise', required: false, type: 'number' },
          { key: 'Idevise', header: 'Idevise', required: false, type: 'string' },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────
  // 7. BALANCE
  // ────────────────────────────────────────────
  {
    key: 'balance',
    code: 'ATLAS-BAL',
    label: 'Balance des comptes',
    description: 'Balance générale ou auxiliaire',
    icon: 'Scale',
    category: 'comptabilite',
    sheets: [
      {
        sheetName: 'Balance',
        sheetAliases: ['BalanceGenerale', 'BalanceAuxiliaire', 'TrialBalance'],
        headerComment: 'Atlas F&A — Modèle Balance',
        columns: [
          { key: 'compte', header: 'Compte', aliases: ['CompteNum', 'Numero'], required: true, type: 'string' },
          { key: 'libelle', header: 'Libellé', aliases: ['Libelle', 'CompteLib'], required: true, type: 'string' },
          { key: 'debitPeriode', header: 'Débit Période', aliases: ['MvtDebit', 'PeriodDebit'], required: true, type: 'number' },
          { key: 'creditPeriode', header: 'Crédit Période', aliases: ['MvtCredit', 'PeriodCredit'], required: true, type: 'number' },
          { key: 'soldeDebiteur', header: 'Solde Débiteur', aliases: ['SoldeDebit'], required: false, type: 'number' },
          { key: 'soldeCrediteur', header: 'Solde Créditeur', aliases: ['SoldeCredit'], required: false, type: 'number' },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────
  // 8. BUDGET
  // ────────────────────────────────────────────
  {
    key: 'budget',
    code: 'ATLAS-BGT',
    label: 'Budget prévisionnel',
    description: 'Budget annuel par compte et par période',
    icon: 'TrendingUp',
    category: 'budget',
    sheets: [
      {
        sheetName: 'Budget',
        sheetAliases: ['Budgets', 'Previsions', 'Forecast'],
        headerComment: 'Atlas F&A — Modèle Budget prévisionnel',
        columns: [
          { key: 'compte', header: 'Compte', required: true, type: 'string' },
          { key: 'libelle', header: 'Libellé', required: false, type: 'string' },
          { key: 'section', header: 'Section Analytique', aliases: ['Section', 'CostCenter'], required: false, type: 'string' },
          { key: 'janvier', header: 'Janvier', required: false, type: 'number' },
          { key: 'fevrier', header: 'Février', aliases: ['Fevrier'], required: false, type: 'number' },
          { key: 'mars', header: 'Mars', required: false, type: 'number' },
          { key: 'avril', header: 'Avril', required: false, type: 'number' },
          { key: 'mai', header: 'Mai', required: false, type: 'number' },
          { key: 'juin', header: 'Juin', required: false, type: 'number' },
          { key: 'juillet', header: 'Juillet', required: false, type: 'number' },
          { key: 'aout', header: 'Août', aliases: ['Aout'], required: false, type: 'number' },
          { key: 'septembre', header: 'Septembre', required: false, type: 'number' },
          { key: 'octobre', header: 'Octobre', required: false, type: 'number' },
          { key: 'novembre', header: 'Novembre', required: false, type: 'number' },
          { key: 'decembre', header: 'Décembre', aliases: ['Decembre'], required: false, type: 'number' },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────
  // 9. TAUX DE DEVISES
  // ────────────────────────────────────────────
  {
    key: 'taux_devises',
    code: 'ATLAS-FX',
    label: 'Taux de change',
    description: 'Cours des devises par date',
    icon: 'DollarSign',
    category: 'tresorerie',
    sheets: [
      {
        sheetName: 'Taux de change',
        sheetAliases: ['Devises', 'Currencies', 'ExchangeRates', 'TauxDevises'],
        headerComment: 'Atlas F&A — Taux de change (cours officiel)',
        columns: [
          { key: 'date', header: 'Date', required: true, type: 'date' },
          { key: 'deviseSource', header: 'Devise Source', aliases: ['From', 'DeviseFrom'], required: true, type: 'string', example: 'EUR' },
          { key: 'deviseCible', header: 'Devise Cible', aliases: ['To', 'DeviseTo'], required: true, type: 'string', example: 'XOF' },
          { key: 'taux', header: 'Taux', aliases: ['Rate', 'Cours'], required: true, type: 'number', example: 655.957 },
        ],
      },
    ],
    sampleRows: [
      { Date: '2026-01-01', 'Devise Source': 'EUR', 'Devise Cible': 'XOF', Taux: 655.957 },
      { Date: '2026-01-01', 'Devise Source': 'USD', 'Devise Cible': 'XOF', Taux: 600.0 },
    ],
  },

  // ────────────────────────────────────────────
  // 10. STOCKS
  // ────────────────────────────────────────────
  {
    key: 'stocks',
    code: 'ATLAS-STK',
    label: 'Stocks',
    description: 'Inventaire des stocks (articles, quantités, valeurs)',
    icon: 'Archive',
    category: 'stocks',
    sheets: [
      {
        sheetName: 'Stocks',
        sheetAliases: ['Inventaire', 'Inventory', 'Articles'],
        headerComment: 'Atlas F&A — Modèle Stocks',
        columns: [
          { key: 'codeArticle', header: 'Code Article', aliases: ['Code', 'SKU', 'Reference'], required: true, type: 'string' },
          { key: 'designation', header: 'Désignation', aliases: ['Designation', 'Libelle'], required: true, type: 'string' },
          { key: 'categorie', header: 'Catégorie', aliases: ['Categorie', 'Family'], required: false, type: 'string' },
          { key: 'unite', header: 'Unité', aliases: ['Unite', 'Unit'], required: false, type: 'string', example: 'Pièce' },
          { key: 'quantite', header: 'Quantité', aliases: ['Quantite', 'Qty'], required: true, type: 'number' },
          { key: 'prixUnitaire', header: 'Prix Unitaire', aliases: ['PU', 'PrixUnitaire', 'UnitPrice'], required: true, type: 'number' },
          { key: 'valorisation', header: 'Valorisation', aliases: ['Valeur', 'Value'], required: false, type: 'number' },
          { key: 'methode', header: 'Méthode', aliases: ['Methode', 'ValuationMethod'], required: false, type: 'string', example: 'CUMP' },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────
  // 11. PARAMETRES — SOCIÉTÉ
  // ────────────────────────────────────────────
  {
    key: 'parametres_societe',
    code: 'ATLAS-SOC',
    label: 'Paramètres Société',
    description: 'Informations légales et fiscales de la société (migration paramétrage)',
    icon: 'Building2',
    category: 'parametres',
    sheets: [
      {
        sheetName: 'Société',
        sheetAliases: ['Societe', 'Company', 'Entity', 'Entreprise'],
        headerComment: 'Atlas F&A — Modèle Paramètres Société',
        columns: [
          { key: 'code', header: 'Code', aliases: ['CodeSociete', 'CompanyCode'], required: true, type: 'string', example: 'SANGA' },
          { key: 'nom', header: 'Nom', aliases: ['RaisonSociale', 'CompanyName', 'Denomination'], required: true, type: 'string', example: 'SANGA & Fils SARL' },
          { key: 'formeJuridique', header: 'Forme juridique', aliases: ['Forme', 'LegalForm'], required: true, type: 'string', example: 'SARL', description: 'SARL, SA, SAS, SUARL, SCS, SNC, EI' },
          { key: 'nif', header: 'NIF', aliases: ['IdentifiantFiscal', 'TaxID'], required: false, type: 'string', example: 'CI123456789' },
          { key: 'rccm', header: 'RCCM', aliases: ['RegistreCommerce'], required: false, type: 'string', example: 'CI-ABJ-2025-B-08742' },
          { key: 'email', header: 'Email', aliases: ['Mail'], required: false, type: 'string', example: 'contact@sangafils.ci' },
          { key: 'telephone', header: 'Téléphone', aliases: ['Telephone', 'Tel', 'Phone'], required: false, type: 'string', example: '+225 0102030405' },
          { key: 'adresse', header: 'Adresse', aliases: ['Address'], required: false, type: 'string', example: 'Plateau, Rue du Commerce' },
          { key: 'ville', header: 'Ville', aliases: ['City'], required: false, type: 'string', example: 'Abidjan' },
          { key: 'pays', header: 'Pays', aliases: ['Country'], required: true, type: 'string', example: 'CI', description: 'Code ISO 2 lettres (CI/SN/CM/BF/ML/TG/BJ/GA/CG/TD/CF)' },
          { key: 'devise', header: 'Devise', aliases: ['Currency'], required: true, type: 'string', example: 'XOF', description: 'XOF (UEMOA) ou XAF (CEMAC)' },
          { key: 'regimeFiscal', header: 'Régime fiscal', aliases: ['RegimeFiscal', 'TaxRegime'], required: false, type: 'string', example: 'RNI', description: 'RSI, RNI, Micro' },
          { key: 'cnps', header: 'CNPS', aliases: ['NumeroCNPS', 'SocialSecurity'], required: false, type: 'string', example: 'CNPS-CI-123456' },
          { key: 'siteWeb', header: 'Site web', aliases: ['Website', 'SiteWeb'], required: false, type: 'string', example: 'www.sangafils.ci' },
          { key: 'exerciceCalendaire', header: 'Exercice calendaire', aliases: ['ExerciceCalendaire'], required: false, type: 'boolean', example: 'OUI' },
        ],
      },
    ],
    sampleRows: [
      { Code: 'SANGA', Nom: 'SANGA & Fils SARL', 'Forme juridique': 'SARL', NIF: 'CI123456789', RCCM: 'CI-ABJ-2025-B-08742', Email: 'contact@sangafils.ci', Téléphone: '+225 0102030405', Adresse: 'Plateau, Rue du Commerce', Ville: 'Abidjan', Pays: 'CI', Devise: 'XOF', 'Régime fiscal': 'RNI', CNPS: 'CNPS-CI-123456', 'Site web': 'www.sangafils.ci', 'Exercice calendaire': 'OUI' },
    ],
  },

  // ────────────────────────────────────────────
  // 12. PARAMETRES — EXERCICES
  // ────────────────────────────────────────────
  {
    key: 'parametres_exercices',
    code: 'ATLAS-EXO',
    label: 'Paramètres Exercices',
    description: 'Exercices comptables (ouverts, clôturés, décalés)',
    icon: 'Calendar',
    category: 'parametres',
    sheets: [
      {
        sheetName: 'Exercices',
        sheetAliases: ['FiscalYears', 'Periods', 'Exercice'],
        headerComment: 'Atlas F&A — Modèle Paramètres Exercices',
        columns: [
          { key: 'code', header: 'Code', aliases: ['CodeExercice', 'FiscalYearCode'], required: true, type: 'string', example: '2026' },
          { key: 'libelle', header: 'Libellé', aliases: ['Libelle', 'Label'], required: true, type: 'string', example: 'Exercice 2026' },
          { key: 'dateDebut', header: 'Date début', aliases: ['DateDebut', 'StartDate'], required: true, type: 'date', example: '2026-01-01' },
          { key: 'dateFin', header: 'Date fin', aliases: ['DateFin', 'EndDate'], required: true, type: 'date', example: '2026-12-31' },
          { key: 'type', header: 'Type', aliases: ['TypeExercice'], required: false, type: 'string', example: 'Calendaire', description: 'Calendaire, Décalé, Fusion, Scission' },
          { key: 'statut', header: 'Statut', aliases: ['Status', 'Etat'], required: true, type: 'string', example: 'Ouvert', description: 'Ouvert, Clôturé' },
          { key: 'devise', header: 'Devise', aliases: ['Currency'], required: false, type: 'string', example: 'XOF' },
        ],
      },
    ],
    sampleRows: [
      { Code: '2025', Libellé: 'Exercice 2025', 'Date début': '2025-01-01', 'Date fin': '2025-12-31', Type: 'Calendaire', Statut: 'Clôturé', Devise: 'XOF' },
      { Code: '2026', Libellé: 'Exercice 2026', 'Date début': '2026-01-01', 'Date fin': '2026-12-31', Type: 'Calendaire', Statut: 'Ouvert', Devise: 'XOF' },
    ],
  },

  // ────────────────────────────────────────────
  // 13. PARAMETRES — JOURNAUX
  // ────────────────────────────────────────────
  {
    key: 'parametres_journaux',
    code: 'ATLAS-JRN',
    label: 'Paramètres Journaux',
    description: 'Journaux comptables SYSCOHADA (AC, VE, BQ, CA, OD, AN, CL)',
    icon: 'BookOpen',
    category: 'parametres',
    sheets: [
      {
        sheetName: 'Journaux',
        sheetAliases: ['Journals', 'Journal', 'CodeJournaux'],
        headerComment: 'Atlas F&A — Modèle Paramètres Journaux',
        columns: [
          { key: 'code', header: 'Code', aliases: ['CodeJournal', 'JournalCode'], required: true, type: 'string', example: 'VE' },
          { key: 'libelle', header: 'Libellé', aliases: ['Libelle', 'JournalLib'], required: true, type: 'string', example: 'Journal des Ventes' },
          { key: 'type', header: 'Type', aliases: ['TypeJournal'], required: true, type: 'string', example: 'Ventes', description: 'Achats, Ventes, Banque, Caisse, OD, AN, Clôture' },
          { key: 'compteContrepartie', header: 'Compte contrepartie', aliases: ['CompteContrepartie', 'CounterAccount'], required: false, type: 'string', example: '411000' },
          { key: 'numerotation', header: 'Numérotation', aliases: ['Numerotation'], required: false, type: 'string', example: 'Auto', description: 'Auto ou Manuel' },
          { key: 'prefixe', header: 'Préfixe', aliases: ['Prefixe', 'Prefix'], required: false, type: 'string', example: 'VE-2026-' },
          { key: 'prochainNumero', header: 'Prochain numéro', aliases: ['ProchainNumero', 'NextNumber'], required: false, type: 'number', example: 1 },
          { key: 'lettrageAuto', header: 'Lettrage auto', aliases: ['LettrageAuto'], required: false, type: 'boolean', example: 'NON' },
          { key: 'analytiqueObligatoire', header: 'Analytique obligatoire', aliases: ['AnalytiqueObligatoire'], required: false, type: 'boolean', example: 'NON' },
          { key: 'actif', header: 'Actif', aliases: ['Active'], required: false, type: 'boolean', example: 'OUI' },
        ],
      },
    ],
    sampleRows: [
      { Code: 'AC', Libellé: 'Journal des Achats', Type: 'Achats', 'Compte contrepartie': '401000', Numérotation: 'Auto', Préfixe: 'AC-2026-', 'Prochain numéro': 1, 'Lettrage auto': 'NON', 'Analytique obligatoire': 'NON', Actif: 'OUI' },
      { Code: 'VE', Libellé: 'Journal des Ventes', Type: 'Ventes', 'Compte contrepartie': '411000', Numérotation: 'Auto', Préfixe: 'VE-2026-', 'Prochain numéro': 1, 'Lettrage auto': 'NON', 'Analytique obligatoire': 'NON', Actif: 'OUI' },
      { Code: 'BQ', Libellé: 'Journal de Banque', Type: 'Banque', 'Compte contrepartie': '521000', Numérotation: 'Auto', Préfixe: 'BQ-2026-', 'Prochain numéro': 1, 'Lettrage auto': 'OUI', 'Analytique obligatoire': 'NON', Actif: 'OUI' },
      { Code: 'CA', Libellé: 'Journal de Caisse', Type: 'Caisse', 'Compte contrepartie': '571000', Numérotation: 'Auto', Préfixe: 'CA-2026-', 'Prochain numéro': 1, 'Lettrage auto': 'NON', 'Analytique obligatoire': 'NON', Actif: 'OUI' },
      { Code: 'OD', Libellé: 'Opérations Diverses', Type: 'OD', 'Compte contrepartie': '', Numérotation: 'Auto', Préfixe: 'OD-2026-', 'Prochain numéro': 1, 'Lettrage auto': 'NON', 'Analytique obligatoire': 'NON', Actif: 'OUI' },
      { Code: 'AN', Libellé: 'À-Nouveaux', Type: 'AN', 'Compte contrepartie': '', Numérotation: 'Auto', Préfixe: 'AN-2026-', 'Prochain numéro': 1, 'Lettrage auto': 'NON', 'Analytique obligatoire': 'NON', Actif: 'OUI' },
      { Code: 'CL', Libellé: 'Clôture', Type: 'Clôture', 'Compte contrepartie': '', Numérotation: 'Auto', Préfixe: 'CL-2026-', 'Prochain numéro': 1, 'Lettrage auto': 'NON', 'Analytique obligatoire': 'NON', Actif: 'OUI' },
    ],
  },

  // ────────────────────────────────────────────
  // 14. PARAMETRES — TAUX TVA
  // ────────────────────────────────────────────
  {
    key: 'parametres_taux_tva',
    code: 'ATLAS-TVA',
    label: 'Paramètres Taux TVA',
    description: 'Taux de TVA et comptes associés (SYSCOHADA)',
    icon: 'Percent',
    category: 'parametres',
    sheets: [
      {
        sheetName: 'Taux TVA',
        sheetAliases: ['TauxTVA', 'VATRates', 'TVA'],
        headerComment: 'Atlas F&A — Modèle Paramètres Taux TVA',
        columns: [
          { key: 'code', header: 'Code', aliases: ['CodeTVA', 'VATCode'], required: true, type: 'string', example: 'TVA18' },
          { key: 'taux', header: 'Taux (%)', aliases: ['Taux', 'Rate'], required: true, type: 'number', example: 18 },
          { key: 'libelle', header: 'Libellé', aliases: ['Libelle', 'Label'], required: true, type: 'string', example: 'TVA Normale 18%' },
          { key: 'compteCollectee', header: 'Compte TVA collectée', aliases: ['CompteCollectee', 'OutputVAT'], required: false, type: 'string', example: '443100' },
          { key: 'compteDeductible', header: 'Compte TVA déductible', aliases: ['CompteDeductible', 'InputVAT'], required: false, type: 'string', example: '445200' },
          { key: 'compteAPayer', header: 'Compte à payer', aliases: ['CompteAPayer', 'VATPayable'], required: false, type: 'string', example: '444100' },
          { key: 'applicabilite', header: 'Applicabilité', aliases: ['Applicabilite', 'Scope'], required: false, type: 'string', example: 'Intérieur', description: 'Intérieur, Import, Export, Intra-OHADA' },
          { key: 'pays', header: 'Pays', aliases: ['Country'], required: false, type: 'string', example: 'CI' },
          { key: 'actif', header: 'Actif', aliases: ['Active'], required: false, type: 'boolean', example: 'OUI' },
        ],
      },
    ],
    sampleRows: [
      { Code: 'TVA18-CI', 'Taux (%)': 18, Libellé: 'TVA Normale 18% (CI)', 'Compte TVA collectée': '443100', 'Compte TVA déductible': '445200', 'Compte à payer': '444100', Applicabilité: 'Intérieur', Pays: 'CI', Actif: 'OUI' },
      { Code: 'TVA9-CI', 'Taux (%)': 9, Libellé: 'TVA Réduite 9% (CI)', 'Compte TVA collectée': '443110', 'Compte TVA déductible': '445210', 'Compte à payer': '444100', Applicabilité: 'Intérieur', Pays: 'CI', Actif: 'OUI' },
      { Code: 'TVA1925-CM', 'Taux (%)': 19.25, Libellé: 'TVA Normale Cameroun', 'Compte TVA collectée': '443100', 'Compte TVA déductible': '445200', 'Compte à payer': '444100', Applicabilité: 'Intérieur', Pays: 'CM', Actif: 'OUI' },
      { Code: 'TVA0-EXO', 'Taux (%)': 0, Libellé: 'Exonéré', 'Compte TVA collectée': '', 'Compte TVA déductible': '', 'Compte à payer': '', Applicabilité: 'Export', Pays: 'CI', Actif: 'OUI' },
    ],
  },

  // ────────────────────────────────────────────
  // 15. PARAMETRES — COMPTES BANCAIRES
  // ────────────────────────────────────────────
  {
    key: 'parametres_comptes_bancaires',
    code: 'ATLAS-BANK',
    label: 'Paramètres Comptes Bancaires',
    description: 'Comptes bancaires, RIB/IBAN et comptes comptables associés',
    icon: 'Landmark',
    category: 'parametres',
    sheets: [
      {
        sheetName: 'Comptes Bancaires',
        sheetAliases: ['ComptesBancaires', 'BankAccounts', 'Banques'],
        headerComment: 'Atlas F&A — Modèle Comptes Bancaires',
        columns: [
          { key: 'code', header: 'Code', aliases: ['CodeCompte', 'AccountCode'], required: true, type: 'string', example: 'SGBCI-MAIN' },
          { key: 'intitule', header: 'Intitulé', aliases: ['Intitule', 'Label'], required: true, type: 'string', example: 'SGBCI Compte Principal' },
          { key: 'banque', header: 'Banque', aliases: ['Bank'], required: true, type: 'string', example: 'SGBCI' },
          { key: 'agence', header: 'Agence', aliases: ['Branch'], required: false, type: 'string', example: 'Plateau' },
          { key: 'numeroCompte', header: 'Numéro compte', aliases: ['NumeroCompte', 'AccountNumber'], required: true, type: 'string', example: '12345678901' },
          { key: 'cleRib', header: 'Clé RIB', aliases: ['CleRIB', 'RIBKey'], required: false, type: 'string', example: '42' },
          { key: 'iban', header: 'IBAN', aliases: ['IBAN'], required: false, type: 'string', example: 'CI93CI1210100100012345678901' },
          { key: 'bic', header: 'BIC/SWIFT', aliases: ['BIC', 'SWIFT'], required: false, type: 'string', example: 'SGCICIDX' },
          { key: 'compteComptable', header: 'Compte comptable', aliases: ['CompteComptable', 'GLAccount'], required: true, type: 'string', example: '521100' },
          { key: 'devise', header: 'Devise', aliases: ['Currency'], required: false, type: 'string', example: 'XOF' },
          { key: 'soldeOuverture', header: 'Solde d\'ouverture', aliases: ['SoldeOuverture', 'OpeningBalance'], required: false, type: 'number', example: 5000000 },
          { key: 'type', header: 'Type', aliases: ['TypeCompte'], required: false, type: 'string', example: 'Courant', description: 'Courant, Épargne, Titre' },
          { key: 'actif', header: 'Actif', aliases: ['Active'], required: false, type: 'boolean', example: 'OUI' },
        ],
      },
    ],
    sampleRows: [
      { Code: 'SGBCI-MAIN', Intitulé: 'SGBCI Compte Principal', Banque: 'SGBCI', Agence: 'Plateau', 'Numéro compte': '12345678901', 'Clé RIB': '42', IBAN: 'CI93CI1210100100012345678901', 'BIC/SWIFT': 'SGCICIDX', 'Compte comptable': '521100', Devise: 'XOF', 'Solde d\'ouverture': 5000000, Type: 'Courant', Actif: 'OUI' },
      { Code: 'ECOBANK-EUR', Intitulé: 'Ecobank Compte EUR', Banque: 'Ecobank', Agence: 'Cocody', 'Numéro compte': '98765432100', 'Clé RIB': '21', IBAN: 'CI83CI0520100098765432100', 'BIC/SWIFT': 'ECOCCIAB', 'Compte comptable': '521200', Devise: 'EUR', 'Solde d\'ouverture': 10000, Type: 'Courant', Actif: 'OUI' },
      { Code: 'OMONEY', Intitulé: 'Orange Money Pro', Banque: 'Orange Money', Agence: '', 'Numéro compte': '+225 0707070707', 'Clé RIB': '', IBAN: '', 'BIC/SWIFT': '', 'Compte comptable': '521900', Devise: 'XOF', 'Solde d\'ouverture': 250000, Type: 'Courant', Actif: 'OUI' },
    ],
  },

  // ────────────────────────────────────────────
  // 16. PARAMETRES — UTILISATEURS
  // ────────────────────────────────────────────
  {
    key: 'parametres_utilisateurs',
    code: 'ATLAS-USR',
    label: 'Paramètres Utilisateurs',
    description: 'Utilisateurs et rôles d\'accès à l\'application',
    icon: 'Users',
    category: 'parametres',
    sheets: [
      {
        sheetName: 'Utilisateurs',
        sheetAliases: ['Users', 'Utilisateur'],
        headerComment: 'Atlas F&A — Modèle Utilisateurs',
        columns: [
          { key: 'email', header: 'Email', aliases: ['Mail'], required: true, type: 'string', example: 'kouassi@sangafils.ci' },
          { key: 'prenom', header: 'Prénom', aliases: ['Prenom', 'FirstName'], required: true, type: 'string', example: 'Jean' },
          { key: 'nom', header: 'Nom', aliases: ['LastName', 'Surname'], required: true, type: 'string', example: 'KOUASSI' },
          { key: 'telephone', header: 'Téléphone', aliases: ['Telephone', 'Phone'], required: false, type: 'string', example: '+225 0102030405' },
          { key: 'role', header: 'Rôle', aliases: ['Role', 'Profil'], required: true, type: 'string', example: 'COMPTABLE', description: 'Code d\'un rôle défini dans la feuille Rôles' },
          { key: 'statut', header: 'Statut', aliases: ['Status', 'Etat'], required: false, type: 'string', example: 'Actif', description: 'Actif, Inactif, Suspendu' },
          { key: 'dateActivation', header: 'Date activation', aliases: ['DateActivation', 'ActivationDate'], required: false, type: 'date', example: '2026-01-15' },
        ],
      },
      {
        sheetName: 'Rôles',
        sheetAliases: ['Roles', 'Role', 'Profils'],
        headerComment: 'Atlas F&A — Rôles d\'accès',
        columns: [
          { key: 'code', header: 'Code rôle', aliases: ['CodeRole', 'RoleCode'], required: true, type: 'string', example: 'COMPTABLE' },
          { key: 'libelle', header: 'Libellé', aliases: ['Libelle', 'Label'], required: true, type: 'string', example: 'Comptable' },
          { key: 'description', header: 'Description', aliases: ['Desc'], required: false, type: 'string', example: 'Saisie et validation des écritures' },
          { key: 'permissions', header: 'Permissions', aliases: ['Permissions'], required: false, type: 'string', example: 'ecritures.read;ecritures.write;tiers.read', description: 'Liste séparée par ;' },
        ],
      },
    ],
    sampleRows: [
      { Email: 'admin@sangafils.ci', Prénom: 'Aya', Nom: 'SANGA', Téléphone: '+225 0102030405', Rôle: 'ADMIN', Statut: 'Actif', 'Date activation': '2026-01-01' },
      { Email: 'dg@sangafils.ci', Prénom: 'Koffi', Nom: 'SANGA', Téléphone: '+225 0102030406', Rôle: 'DG', Statut: 'Actif', 'Date activation': '2026-01-01' },
      { Email: 'compta@sangafils.ci', Prénom: 'Jean', Nom: 'KOUASSI', Téléphone: '+225 0102030407', Rôle: 'COMPTABLE', Statut: 'Actif', 'Date activation': '2026-01-10' },
      { Email: 'assistant@sangafils.ci', Prénom: 'Awa', Nom: 'TRAORE', Téléphone: '+225 0102030408', Rôle: 'ASSISTANT', Statut: 'Actif', 'Date activation': '2026-01-15' },
      { Email: 'audit@sangafils.ci', Prénom: 'Paul', Nom: 'KONE', Téléphone: '+225 0102030409', Rôle: 'LECTURE', Statut: 'Actif', 'Date activation': '2026-02-01' },
    ],
  },

  // ────────────────────────────────────────────
  // 17. PARAMETRES — SECTIONS ANALYTIQUES
  // ────────────────────────────────────────────
  {
    key: 'parametres_sections_analytiques',
    code: 'ATLAS-SEC',
    label: 'Paramètres Sections Analytiques',
    description: 'Sections analytiques (centres de coûts, projets, départements)',
    icon: 'LayoutGrid',
    category: 'parametres',
    sheets: [
      {
        sheetName: 'Sections Analytiques',
        sheetAliases: ['SectionsAnalytiques', 'CostCenters', 'Analytique'],
        headerComment: 'Atlas F&A — Modèle Sections Analytiques',
        columns: [
          { key: 'code', header: 'Code', aliases: ['CodeSection', 'SectionCode'], required: true, type: 'string', example: 'VENTE-CI' },
          { key: 'libelle', header: 'Libellé', aliases: ['Libelle', 'Label'], required: true, type: 'string', example: 'Ventes Côte d\'Ivoire' },
          { key: 'type', header: 'Type', aliases: ['TypeSection'], required: false, type: 'string', example: 'Géographique', description: 'Géographique, Produit, Projet, Département, Coût' },
          { key: 'responsable', header: 'Responsable', aliases: ['Responsable', 'Manager'], required: false, type: 'string', example: 'Jean KOUASSI' },
          { key: 'budget', header: 'Budget', aliases: ['BudgetAnnuel'], required: false, type: 'number', example: 150000000 },
          { key: 'parent', header: 'Parent', aliases: ['ParentSection'], required: false, type: 'string', example: '', description: 'Code de la section parente (hiérarchie)' },
          { key: 'actif', header: 'Actif', aliases: ['Active'], required: false, type: 'boolean', example: 'OUI' },
        ],
      },
    ],
    sampleRows: [
      { Code: 'VENTE-CI', Libellé: 'Ventes Côte d\'Ivoire', Type: 'Géographique', Responsable: 'Jean KOUASSI', Budget: 150000000, Parent: '', Actif: 'OUI' },
      { Code: 'VENTE-SN', Libellé: 'Ventes Sénégal', Type: 'Géographique', Responsable: 'Fatou DIOP', Budget: 80000000, Parent: '', Actif: 'OUI' },
      { Code: 'PROD-USINE1', Libellé: 'Production Usine Abidjan', Type: 'Département', Responsable: 'Paul KONE', Budget: 200000000, Parent: '', Actif: 'OUI' },
      { Code: 'ADMIN-SIEGE', Libellé: 'Administration Siège', Type: 'Département', Responsable: 'Awa TRAORE', Budget: 50000000, Parent: '', Actif: 'OUI' },
    ],
  },

  // ────────────────────────────────────────────
  // 18. GRAND LIVRE
  // ────────────────────────────────────────────
  {
    key: 'grand_livre',
    code: 'ATLAS-GL',
    label: 'Grand Livre',
    description: 'Grand livre détaillé par compte avec solde progressif',
    icon: 'BookOpenCheck',
    category: 'comptabilite',
    sheets: [
      {
        sheetName: 'Grand Livre',
        sheetAliases: ['GrandLivre', 'GeneralLedger', 'GL'],
        headerComment: 'Atlas F&A — Modèle Grand Livre',
        columns: [
          { key: 'date', header: 'Date', aliases: ['EcritureDate'], required: true, type: 'date', example: '2026-01-15' },
          { key: 'journal', header: 'Journal', aliases: ['JournalCode'], required: true, type: 'string', example: 'VE' },
          { key: 'numeroEcriture', header: 'N° écriture', aliases: ['NumeroEcriture', 'EcritureNum'], required: true, type: 'string', example: 'VE-2026-0001' },
          { key: 'compte', header: 'Compte', aliases: ['CompteNum'], required: true, type: 'string', example: '411000' },
          { key: 'libelleCompte', header: 'Libellé compte', aliases: ['LibelleCompte', 'CompteLib'], required: false, type: 'string', example: 'Clients' },
          { key: 'tiers', header: 'Tiers', aliases: ['CodeTiers', 'CompAuxNum'], required: false, type: 'string', example: 'CLI001' },
          { key: 'libelleEcriture', header: 'Libellé écriture', aliases: ['LibelleEcriture', 'EcritureLib'], required: false, type: 'string', example: 'Facture SANGA' },
          { key: 'piece', header: 'Pièce', aliases: ['PieceRef'], required: false, type: 'string', example: 'FAC-2026-001' },
          { key: 'debit', header: 'Débit', aliases: ['Debit'], required: true, type: 'number', example: 118000 },
          { key: 'credit', header: 'Crédit', aliases: ['Credit'], required: true, type: 'number', example: 0 },
          { key: 'soldeProgressif', header: 'Solde progressif', aliases: ['SoldeProgressif', 'RunningBalance'], required: false, type: 'number', example: 118000 },
          { key: 'lettrage', header: 'Lettrage', aliases: ['Lettrage', 'EcritureLet'], required: false, type: 'string' },
          { key: 'echeance', header: 'Échéance', aliases: ['Echeance', 'DueDate'], required: false, type: 'date' },
        ],
      },
    ],
    sampleRows: [
      { Date: '2026-01-05', Journal: 'AN', 'N° écriture': 'AN-2026-0001', Compte: '411000', 'Libellé compte': 'Clients', Tiers: 'CLI001', 'Libellé écriture': 'À-nouveau', Pièce: 'AN-2026', Débit: 2500000, Crédit: 0, 'Solde progressif': 2500000, Lettrage: '', Échéance: '' },
      { Date: '2026-01-15', Journal: 'VE', 'N° écriture': 'VE-2026-0001', Compte: '411000', 'Libellé compte': 'Clients', Tiers: 'CLI001', 'Libellé écriture': 'Facture SANGA FAC-001', Pièce: 'FAC-2026-001', Débit: 1180000, Crédit: 0, 'Solde progressif': 3680000, Lettrage: '', Échéance: '2026-02-15' },
      { Date: '2026-01-20', Journal: 'BQ', 'N° écriture': 'BQ-2026-0003', Compte: '411000', 'Libellé compte': 'Clients', Tiers: 'CLI001', 'Libellé écriture': 'Règlement FAC-001', Pièce: 'VIR-2026-003', Débit: 0, Crédit: 1180000, 'Solde progressif': 2500000, Lettrage: 'A', Échéance: '' },
      { Date: '2026-01-25', Journal: 'VE', 'N° écriture': 'VE-2026-0005', Compte: '411000', 'Libellé compte': 'Clients', Tiers: 'CLI001', 'Libellé écriture': 'Facture SANGA FAC-005', Pièce: 'FAC-2026-005', Débit: 590000, Crédit: 0, 'Solde progressif': 3090000, Lettrage: '', Échéance: '2026-02-25' },
      { Date: '2026-01-31', Journal: 'OD', 'N° écriture': 'OD-2026-0002', Compte: '411000', 'Libellé compte': 'Clients', Tiers: 'CLI001', 'Libellé écriture': 'Avoir partiel', Pièce: 'AVO-2026-001', Débit: 0, Crédit: 90000, 'Solde progressif': 3000000, Lettrage: '', Échéance: '' },
    ],
  },

  // ────────────────────────────────────────────
  // 19. ORDRES DE PAIEMENT
  // ────────────────────────────────────────────
  {
    key: 'ordres_paiement',
    code: 'ATLAS-OP',
    label: 'Ordres de Paiement',
    description: 'Ordres de paiement (virements, chèques, mobile money)',
    icon: 'Send',
    category: 'tresorerie',
    sheets: [
      {
        sheetName: 'Ordres Paiement',
        sheetAliases: ['OrdresPaiement', 'PaymentOrders', 'OP'],
        headerComment: 'Atlas F&A — Modèle Ordres de Paiement',
        columns: [
          { key: 'numero', header: 'N° ordre', aliases: ['NumeroOrdre', 'OrderNumber'], required: true, type: 'string', example: 'OP-2026-0001' },
          { key: 'type', header: 'Type', aliases: ['TypeOrdre'], required: false, type: 'string', example: 'Simple', description: 'Simple, Batch' },
          { key: 'dateEmission', header: 'Date émission', aliases: ['DateEmission', 'IssueDate'], required: true, type: 'date', example: '2026-01-20' },
          { key: 'beneficiaire', header: 'Bénéficiaire', aliases: ['Beneficiaire', 'CodeTiers', 'Payee'], required: true, type: 'string', example: 'FOU001' },
          { key: 'montant', header: 'Montant', aliases: ['Amount'], required: true, type: 'number', example: 2500000 },
          { key: 'devise', header: 'Devise', aliases: ['Currency'], required: false, type: 'string', example: 'XOF' },
          { key: 'methode', header: 'Méthode', aliases: ['MethodePaiement', 'Method'], required: true, type: 'string', example: 'Virement', description: 'Virement, Chèque, Espèces, MobileMoney' },
          { key: 'compteBancaire', header: 'Compte bancaire', aliases: ['CompteBancaire', 'BankAccount'], required: false, type: 'string', example: 'SGBCI-MAIN' },
          { key: 'referenceFacture', header: 'Référence facture', aliases: ['ReferenceFacture', 'InvoiceRef'], required: false, type: 'string', example: 'FAC-FOU-2026-012' },
          { key: 'statut', header: 'Statut', aliases: ['Status'], required: false, type: 'string', example: 'Approved', description: 'Draft, Approved, Executed, Rejected' },
          { key: 'dateExecution', header: 'Date exécution', aliases: ['DateExecution', 'ExecutionDate'], required: false, type: 'date', example: '2026-01-21' },
          { key: 'motif', header: 'Motif', aliases: ['Motif', 'Reason'], required: false, type: 'string', example: 'Règlement facture' },
        ],
      },
    ],
    sampleRows: [
      { 'N° ordre': 'OP-2026-0001', Type: 'Simple', 'Date émission': '2026-01-20', Bénéficiaire: 'FOU001', Montant: 2500000, Devise: 'XOF', Méthode: 'Virement', 'Compte bancaire': 'SGBCI-MAIN', 'Référence facture': 'FAC-FOU-2026-012', Statut: 'Executed', 'Date exécution': '2026-01-21', Motif: 'Règlement facture CFAO' },
      { 'N° ordre': 'OP-2026-0002', Type: 'Simple', 'Date émission': '2026-01-22', Bénéficiaire: 'FOU002', Montant: 450000, Devise: 'XOF', Méthode: 'MobileMoney', 'Compte bancaire': 'OMONEY', 'Référence facture': 'FAC-FOU-2026-015', Statut: 'Approved', 'Date exécution': '', Motif: 'Petit équipement' },
      { 'N° ordre': 'OP-2026-0003', Type: 'Batch', 'Date émission': '2026-01-25', Bénéficiaire: 'SAL-BATCH', Montant: 18500000, Devise: 'XOF', Méthode: 'Virement', 'Compte bancaire': 'SGBCI-MAIN', 'Référence facture': 'PAIE-2026-01', Statut: 'Executed', 'Date exécution': '2026-01-26', Motif: 'Salaires janvier 2026' },
    ],
  },

  // ────────────────────────────────────────────
  // 20. REGISTRE DES CHÈQUES
  // ────────────────────────────────────────────
  {
    key: 'registre_cheques',
    code: 'ATLAS-CHK',
    label: 'Registre des Chèques',
    description: 'Registre des chèques émis et reçus',
    icon: 'FileCheck',
    category: 'tresorerie',
    sheets: [
      {
        sheetName: 'Registre Chèques',
        sheetAliases: ['RegistreCheques', 'Cheques', 'CheckRegister'],
        headerComment: 'Atlas F&A — Modèle Registre Chèques',
        columns: [
          { key: 'numero', header: 'N° chèque', aliases: ['NumeroCheque', 'CheckNumber'], required: true, type: 'string', example: '1234567' },
          { key: 'sens', header: 'Sens', aliases: ['Direction'], required: true, type: 'string', example: 'Émis', description: 'Émis, Reçu' },
          { key: 'dateEmission', header: 'Date émission', aliases: ['DateEmission'], required: true, type: 'date', example: '2026-01-15' },
          { key: 'tireur', header: 'Tireur', aliases: ['Drawer'], required: false, type: 'string', example: 'SANGA & Fils SARL' },
          { key: 'beneficiaire', header: 'Bénéficiaire', aliases: ['Beneficiaire', 'Payee'], required: true, type: 'string', example: 'CFAO Motors' },
          { key: 'banque', header: 'Banque', aliases: ['Bank'], required: false, type: 'string', example: 'SGBCI' },
          { key: 'agence', header: 'Agence', aliases: ['Branch'], required: false, type: 'string', example: 'Plateau' },
          { key: 'montant', header: 'Montant', aliases: ['Amount'], required: true, type: 'number', example: 850000 },
          { key: 'devise', header: 'Devise', aliases: ['Currency'], required: false, type: 'string', example: 'XOF' },
          { key: 'compteBancaire', header: 'Compte bancaire', aliases: ['CompteBancaire'], required: false, type: 'string', example: 'SGBCI-MAIN' },
          { key: 'dateDepot', header: 'Date dépôt', aliases: ['DateDepot', 'DepositDate'], required: false, type: 'date', example: '2026-01-16' },
          { key: 'dateCompensation', header: 'Date compensation', aliases: ['DateCompensation', 'ClearingDate'], required: false, type: 'date', example: '2026-01-18' },
          { key: 'statut', header: 'Statut', aliases: ['Status'], required: false, type: 'string', example: 'Compensé', description: 'Émis, Encaissé, Compensé, Rejeté' },
          { key: 'motifRejet', header: 'Motif rejet', aliases: ['MotifRejet', 'RejectReason'], required: false, type: 'string' },
        ],
      },
    ],
    sampleRows: [
      { 'N° chèque': '1234567', Sens: 'Émis', 'Date émission': '2026-01-15', Tireur: 'SANGA & Fils SARL', Bénéficiaire: 'CFAO Motors', Banque: 'SGBCI', Agence: 'Plateau', Montant: 850000, Devise: 'XOF', 'Compte bancaire': 'SGBCI-MAIN', 'Date dépôt': '', 'Date compensation': '2026-01-18', Statut: 'Compensé', 'Motif rejet': '' },
      { 'N° chèque': '1234568', Sens: 'Émis', 'Date émission': '2026-01-22', Tireur: 'SANGA & Fils SARL', Bénéficiaire: 'EDF CI', Banque: 'SGBCI', Agence: 'Plateau', Montant: 125000, Devise: 'XOF', 'Compte bancaire': 'SGBCI-MAIN', 'Date dépôt': '', 'Date compensation': '', Statut: 'Émis', 'Motif rejet': '' },
      { 'N° chèque': '9876543', Sens: 'Reçu', 'Date émission': '2026-01-18', Tireur: 'CLI001', Bénéficiaire: 'SANGA & Fils SARL', Banque: 'BOA', Agence: 'Treichville', Montant: 1180000, Devise: 'XOF', 'Compte bancaire': 'SGBCI-MAIN', 'Date dépôt': '2026-01-19', 'Date compensation': '2026-01-21', Statut: 'Compensé', 'Motif rejet': '' },
      { 'N° chèque': '9876544', Sens: 'Reçu', 'Date émission': '2026-01-25', Tireur: 'CLI002', Bénéficiaire: 'SANGA & Fils SARL', Banque: 'Ecobank', Agence: 'Cocody', Montant: 590000, Devise: 'XOF', 'Compte bancaire': 'SGBCI-MAIN', 'Date dépôt': '2026-01-26', 'Date compensation': '', Statut: 'Rejeté', 'Motif rejet': 'Provision insuffisante' },
    ],
  },

  // ────────────────────────────────────────────
  // 21. CALENDRIER DES EMPRUNTS
  // ────────────────────────────────────────────
  {
    key: 'calendrier_emprunts',
    code: 'ATLAS-LOAN',
    label: 'Calendrier des Emprunts',
    description: 'Emprunts et tableau d\'amortissement',
    icon: 'Landmark',
    category: 'tresorerie',
    sheets: [
      {
        sheetName: 'Emprunts',
        sheetAliases: ['Loans', 'Emprunt'],
        headerComment: 'Atlas F&A — Emprunts',
        columns: [
          { key: 'codeEmprunt', header: 'Code emprunt', aliases: ['CodeEmprunt', 'LoanCode'], required: true, type: 'string', example: 'EMP-2026-001' },
          { key: 'organisme', header: 'Organisme prêteur', aliases: ['Organisme', 'Lender'], required: true, type: 'string', example: 'SGBCI' },
          { key: 'montantInitial', header: 'Montant initial', aliases: ['MontantInitial', 'Principal'], required: true, type: 'number', example: 50000000 },
          { key: 'devise', header: 'Devise', aliases: ['Currency'], required: false, type: 'string', example: 'XOF' },
          { key: 'dateContrat', header: 'Date contrat', aliases: ['DateContrat', 'ContractDate'], required: true, type: 'date', example: '2026-01-01' },
          { key: 'taux', header: 'Taux (%)', aliases: ['Taux', 'InterestRate'], required: true, type: 'number', example: 7.5 },
          { key: 'duree', header: 'Durée (mois)', aliases: ['Duree', 'TermMonths'], required: true, type: 'number', example: 60 },
          { key: 'datePremEcheance', header: 'Date 1ère échéance', aliases: ['DatePremEcheance', 'FirstPaymentDate'], required: true, type: 'date', example: '2026-02-01' },
          { key: 'typeRemboursement', header: 'Type remboursement', aliases: ['TypeRemboursement', 'RepaymentType'], required: false, type: 'string', example: 'Amortissement', description: 'Amortissement, In fine, Progressif' },
        ],
      },
      {
        sheetName: 'Echéances',
        sheetAliases: ['Echeances', 'Schedule', 'Amortissement'],
        headerComment: 'Atlas F&A — Tableau d\'amortissement',
        columns: [
          { key: 'codeEmprunt', header: 'Code emprunt', aliases: ['CodeEmprunt'], required: true, type: 'string', example: 'EMP-2026-001' },
          { key: 'numero', header: 'N° échéance', aliases: ['NumeroEcheance', 'PaymentNumber'], required: true, type: 'number', example: 1 },
          { key: 'dateEcheance', header: 'Date échéance', aliases: ['DateEcheance', 'DueDate'], required: true, type: 'date', example: '2026-02-01' },
          { key: 'principal', header: 'Principal', aliases: ['Principal'], required: true, type: 'number', example: 750000 },
          { key: 'interets', header: 'Intérêts', aliases: ['Interets', 'Interest'], required: true, type: 'number', example: 312500 },
          { key: 'total', header: 'Total', aliases: ['Total', 'PaymentAmount'], required: true, type: 'number', example: 1062500 },
          { key: 'soldeRestant', header: 'Solde restant', aliases: ['SoldeRestant', 'OutstandingBalance'], required: false, type: 'number', example: 49250000 },
          { key: 'statut', header: 'Statut', aliases: ['Status'], required: false, type: 'string', example: 'À payer', description: 'À payer, Payée, En retard' },
          { key: 'datePaiement', header: 'Date paiement effectif', aliases: ['DatePaiement', 'ActualPaymentDate'], required: false, type: 'date' },
        ],
      },
    ],
    sampleRows: [
      { 'Code emprunt': 'EMP-2026-001', 'Organisme prêteur': 'SGBCI', 'Montant initial': 50000000, Devise: 'XOF', 'Date contrat': '2026-01-01', 'Taux (%)': 7.5, 'Durée (mois)': 60, 'Date 1ère échéance': '2026-02-01', 'Type remboursement': 'Amortissement', 'N° échéance': 1, 'Date échéance': '2026-02-01', Principal: 750000, Intérêts: 312500, Total: 1062500, 'Solde restant': 49250000, Statut: 'Payée', 'Date paiement effectif': '2026-02-01' },
      { 'Code emprunt': 'EMP-2026-001', 'Organisme prêteur': 'SGBCI', 'Montant initial': 50000000, Devise: 'XOF', 'Date contrat': '2026-01-01', 'Taux (%)': 7.5, 'Durée (mois)': 60, 'Date 1ère échéance': '2026-02-01', 'Type remboursement': 'Amortissement', 'N° échéance': 2, 'Date échéance': '2026-03-01', Principal: 754688, Intérêts: 307813, Total: 1062500, 'Solde restant': 48495313, Statut: 'Payée', 'Date paiement effectif': '2026-03-01' },
      { 'Code emprunt': 'EMP-2026-001', 'Organisme prêteur': 'SGBCI', 'Montant initial': 50000000, Devise: 'XOF', 'Date contrat': '2026-01-01', 'Taux (%)': 7.5, 'Durée (mois)': 60, 'Date 1ère échéance': '2026-02-01', 'Type remboursement': 'Amortissement', 'N° échéance': 3, 'Date échéance': '2026-04-01', Principal: 759405, Intérêts: 303096, Total: 1062500, 'Solde restant': 47735908, Statut: 'Payée', 'Date paiement effectif': '2026-04-02' },
      { 'Code emprunt': 'EMP-2026-001', 'Organisme prêteur': 'SGBCI', 'Montant initial': 50000000, Devise: 'XOF', 'Date contrat': '2026-01-01', 'Taux (%)': 7.5, 'Durée (mois)': 60, 'Date 1ère échéance': '2026-02-01', 'Type remboursement': 'Amortissement', 'N° échéance': 4, 'Date échéance': '2026-05-01', Principal: 764151, Intérêts: 298349, Total: 1062500, 'Solde restant': 46971757, Statut: 'À payer', 'Date paiement effectif': '' },
      { 'Code emprunt': 'EMP-2026-001', 'Organisme prêteur': 'SGBCI', 'Montant initial': 50000000, Devise: 'XOF', 'Date contrat': '2026-01-01', 'Taux (%)': 7.5, 'Durée (mois)': 60, 'Date 1ère échéance': '2026-02-01', 'Type remboursement': 'Amortissement', 'N° échéance': 5, 'Date échéance': '2026-06-01', Principal: 768927, Intérêts: 293574, Total: 1062500, 'Solde restant': 46202830, Statut: 'À payer', 'Date paiement effectif': '' },
      { 'Code emprunt': 'EMP-2026-001', 'Organisme prêteur': 'SGBCI', 'Montant initial': 50000000, Devise: 'XOF', 'Date contrat': '2026-01-01', 'Taux (%)': 7.5, 'Durée (mois)': 60, 'Date 1ère échéance': '2026-02-01', 'Type remboursement': 'Amortissement', 'N° échéance': 6, 'Date échéance': '2026-07-01', Principal: 773733, Intérêts: 288768, Total: 1062500, 'Solde restant': 45429097, Statut: 'À payer', 'Date paiement effectif': '' },
    ],
  },

  // ────────────────────────────────────────────
  // 22. MOUVEMENTS DE STOCKS
  // ────────────────────────────────────────────
  {
    key: 'mouvements_stocks',
    code: 'ATLAS-MVTK',
    label: 'Mouvements de Stocks',
    description: 'Mouvements d\'entrées/sorties et valorisation (CUMP)',
    icon: 'Boxes',
    category: 'stocks',
    sheets: [
      {
        sheetName: 'Mouvements Stocks',
        sheetAliases: ['MouvementsStocks', 'StockMovements', 'Mouvements'],
        headerComment: 'Atlas F&A — Modèle Mouvements de Stocks',
        columns: [
          { key: 'dateMouvement', header: 'Date mouvement', aliases: ['DateMouvement', 'MovementDate'], required: true, type: 'date', example: '2026-01-10' },
          { key: 'article', header: 'Article', aliases: ['CodeArticle', 'SKU'], required: true, type: 'string', example: 'ART-001' },
          { key: 'designation', header: 'Désignation', aliases: ['Designation', 'Libelle'], required: false, type: 'string', example: 'Ciment CIM-CI 50kg' },
          { key: 'typeMouvement', header: 'Type mouvement', aliases: ['TypeMouvement', 'MovementType'], required: true, type: 'string', example: 'Entrée', description: 'Entrée, Sortie, Ajustement, Transfert, Retour' },
          { key: 'quantite', header: 'Quantité', aliases: ['Quantite', 'Qty'], required: true, type: 'number', example: 100 },
          { key: 'coutUnitaire', header: 'Coût unitaire', aliases: ['CoutUnitaire', 'UnitCost'], required: true, type: 'number', example: 4500 },
          { key: 'coutTotal', header: 'Coût total', aliases: ['CoutTotal', 'TotalCost'], required: false, type: 'number', example: 450000 },
          { key: 'referencePiece', header: 'Référence pièce', aliases: ['ReferencePiece', 'DocRef'], required: false, type: 'string', example: 'BL-FOU-2026-012' },
          { key: 'libelle', header: 'Libellé', aliases: ['Libelle', 'Description'], required: false, type: 'string', example: 'Réception commande CFAO' },
          { key: 'magasin', header: 'Magasin', aliases: ['Magasin', 'Warehouse'], required: false, type: 'string', example: 'MAG-ABIDJAN' },
          { key: 'cumpApres', header: 'CUMP après', aliases: ['CUMPApres', 'AverageCostAfter'], required: false, type: 'number', example: 4500 },
          { key: 'quantiteApres', header: 'Quantité stock après', aliases: ['QuantiteApres', 'StockQtyAfter'], required: false, type: 'number', example: 100 },
          { key: 'valeurApres', header: 'Valeur stock après', aliases: ['ValeurApres', 'StockValueAfter'], required: false, type: 'number', example: 450000 },
        ],
      },
    ],
    sampleRows: [
      { 'Date mouvement': '2026-01-10', Article: 'ART-001', Désignation: 'Ciment CIM-CI 50kg', 'Type mouvement': 'Entrée', Quantité: 100, 'Coût unitaire': 4500, 'Coût total': 450000, 'Référence pièce': 'BL-FOU-2026-012', Libellé: 'Réception commande CFAO', Magasin: 'MAG-ABIDJAN', 'CUMP après': 4500, 'Quantité stock après': 100, 'Valeur stock après': 450000 },
      { 'Date mouvement': '2026-01-15', Article: 'ART-001', Désignation: 'Ciment CIM-CI 50kg', 'Type mouvement': 'Sortie', Quantité: 30, 'Coût unitaire': 4500, 'Coût total': 135000, 'Référence pièce': 'BS-2026-001', Libellé: 'Vente client SANGA', Magasin: 'MAG-ABIDJAN', 'CUMP après': 4500, 'Quantité stock après': 70, 'Valeur stock après': 315000 },
      { 'Date mouvement': '2026-01-18', Article: 'ART-001', Désignation: 'Ciment CIM-CI 50kg', 'Type mouvement': 'Entrée', Quantité: 50, 'Coût unitaire': 4600, 'Coût total': 230000, 'Référence pièce': 'BL-FOU-2026-015', Libellé: 'Réapprovisionnement', Magasin: 'MAG-ABIDJAN', 'CUMP après': 4542, 'Quantité stock après': 120, 'Valeur stock après': 545000 },
      { 'Date mouvement': '2026-01-25', Article: 'ART-001', Désignation: 'Ciment CIM-CI 50kg', 'Type mouvement': 'Ajustement', Quantité: -2, 'Coût unitaire': 4542, 'Coût total': -9084, 'Référence pièce': 'INV-2026-01', Libellé: 'Ajustement inventaire (casse)', Magasin: 'MAG-ABIDJAN', 'CUMP après': 4542, 'Quantité stock après': 118, 'Valeur stock après': 535916 },
    ],
  },

  // ────────────────────────────────────────────
  // 23. ENGAGEMENTS HORS-BILAN
  // ────────────────────────────────────────────
  {
    key: 'engagements_hors_bilan',
    code: 'ATLAS-EHB',
    label: 'Engagements Hors-Bilan',
    description: 'Cautions, garanties, avals (classes 90-99 SYSCOHADA)',
    icon: 'Shield',
    category: 'comptabilite',
    sheets: [
      {
        sheetName: 'Engagements Hors-Bilan',
        sheetAliases: ['EngagementsHorsBilan', 'OffBalanceSheet', 'Engagements'],
        headerComment: 'Atlas F&A — Modèle Engagements Hors-Bilan',
        columns: [
          { key: 'code', header: 'Code', aliases: ['CodeEngagement'], required: true, type: 'string', example: 'EHB-2026-001' },
          { key: 'type', header: 'Type', aliases: ['TypeEngagement'], required: true, type: 'string', example: 'Caution', description: 'Caution, Garantie, Aval, Lettre crédit, Nantissement, Hypothèque' },
          { key: 'sens', header: 'Sens', aliases: ['Direction'], required: true, type: 'string', example: 'Donné', description: 'Donné, Reçu' },
          { key: 'beneficiaire', header: 'Bénéficiaire', aliases: ['Beneficiaire', 'Beneficiary'], required: true, type: 'string', example: 'SGBCI' },
          { key: 'montant', header: 'Montant', aliases: ['Amount'], required: true, type: 'number', example: 25000000 },
          { key: 'devise', header: 'Devise', aliases: ['Currency'], required: false, type: 'string', example: 'XOF' },
          { key: 'dateDebut', header: 'Date début', aliases: ['DateDebut', 'StartDate'], required: true, type: 'date', example: '2026-01-15' },
          { key: 'dateFin', header: 'Date fin', aliases: ['DateFin', 'EndDate'], required: false, type: 'date', example: '2027-01-15' },
          { key: 'compte', header: 'Compte', aliases: ['CompteNum'], required: false, type: 'string', example: '902000', description: 'Classes 90 à 99 SYSCOHADA' },
          { key: 'statut', header: 'Statut', aliases: ['Status'], required: false, type: 'string', example: 'Actif', description: 'Actif, Éteint' },
          { key: 'reference', header: 'Référence', aliases: ['Reference', 'DocRef'], required: false, type: 'string', example: 'CAUT-SGBCI-2026-001' },
          { key: 'commentaire', header: 'Commentaire', aliases: ['Commentaire', 'Notes'], required: false, type: 'string' },
        ],
      },
    ],
    sampleRows: [
      { Code: 'EHB-2026-001', Type: 'Caution', Sens: 'Donné', Bénéficiaire: 'SGBCI', Montant: 25000000, Devise: 'XOF', 'Date début': '2026-01-15', 'Date fin': '2027-01-15', Compte: '902000', Statut: 'Actif', Référence: 'CAUT-SGBCI-2026-001', Commentaire: 'Caution bancaire marché public' },
      { Code: 'EHB-2026-002', Type: 'Garantie', Sens: 'Reçu', Bénéficiaire: 'SANGA & Fils SARL', Montant: 10000000, Devise: 'XOF', 'Date début': '2026-02-01', 'Date fin': '2026-08-01', Compte: '903000', Statut: 'Actif', Référence: 'GAR-CLI001-2026', Commentaire: 'Garantie bonne fin client CLI001' },
    ],
  },
];

/**
 * Récupère un template par sa clé.
 */
export function getTemplate(key: TemplateKey): AtlasImportTemplate | undefined {
  return ATLAS_IMPORT_TEMPLATES.find(t => t.key === key);
}

/**
 * Récupère les templates par catégorie.
 */
export function getTemplatesByCategory(category: AtlasImportTemplate['category']): AtlasImportTemplate[] {
  return ATLAS_IMPORT_TEMPLATES.filter(t => t.category === category);
}
