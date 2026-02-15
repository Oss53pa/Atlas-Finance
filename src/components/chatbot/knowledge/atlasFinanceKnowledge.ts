/**
 * Base de Connaissances Atlas Finance
 * Documentation complète du système pour Paloma
 */

export interface KnowledgeEntry {
  id: string;
  category: string;
  subcategory?: string;
  title: string;
  description: string;
  keywords: string[];
  content: string;
  examples?: string[];
  relatedTopics?: string[];
  navigationPath?: string;
  permissions?: string[];
}

export const atlasFinanceKnowledge: KnowledgeEntry[] = [
  // ========== MODULES PRINCIPAUX ==========

  // Module Finance & Comptabilité
  {
    id: 'finance-overview',
    category: 'Finance',
    title: 'Module Finance et Comptabilité',
    description: 'Gestion complète de la comptabilité et des finances',
    keywords: ['finance', 'comptabilité', 'comptable', 'argent', 'financier'],
    content: `Le module Finance de Atlas Finance permet de gérer l'ensemble de votre comptabilité d'entreprise :
    - Plan comptable complet
    - Saisie des écritures comptables
    - Gestion des journaux
    - Balance et grand livre
    - Bilan et compte de résultat
    - Déclarations fiscales
    - Rapprochement bancaire`,
    navigationPath: '/finance',
    relatedTopics: ['budget', 'treasury', 'invoices']
  },

  // Budgétisation
  {
    id: 'budget-creation',
    category: 'Finance',
    subcategory: 'Budget',
    title: 'Créer un budget',
    description: 'Comment créer et gérer un budget prévisionnel',
    keywords: ['budget', 'prévisionnel', 'planification', 'créer budget', 'nouveau budget'],
    content: `Pour créer un nouveau budget dans Atlas Finance :
    1. Allez dans Finance > Budgétisation
    2. Cliquez sur "Nouveau Budget"
    3. Remplissez les informations :
       - Nom du budget
       - Période (mensuel, trimestriel, annuel)
       - Montant alloué
       - Centre de coût
    4. Définissez les lignes budgétaires
    5. Validez et sauvegardez`,
    examples: [
      'Budget Marketing 2024: 500,000 FCFA',
      'Budget IT Trimestriel: 150,000 FCFA'
    ],
    navigationPath: '/finance/budgeting',
    relatedTopics: ['budget-monitoring', 'budget-revision']
  },

  {
    id: 'budget-monitoring',
    category: 'Finance',
    subcategory: 'Budget',
    title: 'Suivi budgétaire',
    description: 'Suivre et contrôler l\'exécution du budget',
    keywords: ['suivi budget', 'contrôle', 'écart', 'consommation', 'monitoring'],
    content: `Le suivi budgétaire permet de :
    - Visualiser la consommation en temps réel
    - Identifier les écarts budget/réel
    - Recevoir des alertes de dépassement
    - Générer des rapports de performance
    - Ajuster les prévisions`,
    navigationPath: '/finance/budgeting/monitoring'
  },

  // Module Trésorerie
  {
    id: 'treasury-overview',
    category: 'Treasury',
    title: 'Gestion de Trésorerie',
    description: 'Gérer les flux de trésorerie et la liquidité',
    keywords: ['trésorerie', 'cash', 'liquidité', 'encaissement', 'décaissement'],
    content: `Le module Trésorerie permet de :
    - Gérer les comptes bancaires
    - Suivre les flux entrants/sortants
    - Prévoir la trésorerie
    - Gérer les placements
    - Optimiser le BFR
    - Négocier les conditions bancaires`,
    navigationPath: '/treasury',
    relatedTopics: ['bank-reconciliation', 'cash-flow']
  },

  // Module Tiers (Clients/Fournisseurs)
  {
    id: 'tiers-overview',
    category: 'Tiers',
    title: 'Gestion des Tiers',
    description: 'Gérer clients, fournisseurs et partenaires',
    keywords: ['client', 'fournisseur', 'tiers', 'partenaire', 'contact'],
    content: `Le module Tiers centralise la gestion de :
    - Clients (fiches, historique, crédit)
    - Fournisseurs (contrats, conditions)
    - Partenaires commerciaux
    - Contacts et interlocuteurs
    - Documents associés
    - Historique des transactions`,
    navigationPath: '/tiers'
  },

  {
    id: 'recouvrement',
    category: 'Tiers',
    subcategory: 'Recouvrement',
    title: 'Module Recouvrement',
    description: 'Gestion du recouvrement des créances clients',
    keywords: ['recouvrement', 'relance', 'impayé', 'créance', 'retard paiement'],
    content: `Le module Recouvrement permet de :
    - Suivre les créances en souffrance
    - Créer des dossiers de recouvrement
    - Automatiser les relances (email, SMS, courrier)
    - Gérer les plans de remboursement
    - Calculer les pénalités de retard
    - Transmettre au contentieux
    - Suivre les indicateurs DSO`,
    examples: [
      'Relance niveau 1: Rappel amical à J+7',
      'Relance niveau 2: Relance ferme à J+14',
      'Mise en demeure à J+30'
    ],
    navigationPath: '/tiers/recouvrement',
    relatedTopics: ['relance-configuration', 'contentieux']
  },

  // Module Stocks
  {
    id: 'inventory-overview',
    category: 'Inventory',
    title: 'Gestion des Stocks',
    description: 'Gérer les stocks et approvisionnements',
    keywords: ['stock', 'inventaire', 'article', 'produit', 'magasin'],
    content: `Le module Stocks permet de :
    - Gérer les articles et références
    - Suivre les niveaux de stock
    - Gérer les entrées/sorties
    - Calculer la valorisation
    - Gérer les inventaires
    - Optimiser les approvisionnements
    - Gérer multi-entrepôts`,
    navigationPath: '/inventory'
  },

  {
    id: 'inventory-movement',
    category: 'Inventory',
    subcategory: 'Mouvements',
    title: 'Mouvements de stock',
    description: 'Enregistrer les entrées et sorties de stock',
    keywords: ['entrée stock', 'sortie stock', 'mouvement', 'transfert'],
    content: `Pour enregistrer un mouvement :
    1. Stocks > Mouvements
    2. Nouveau mouvement
    3. Type: Entrée/Sortie/Transfert
    4. Articles et quantités
    5. Motif et justificatif
    6. Validation`,
    navigationPath: '/inventory/movements'
  },

  // Module Achats
  {
    id: 'purchase-overview',
    category: 'Achats',
    title: 'Gestion des Achats',
    description: 'Processus complet d\'achat',
    keywords: ['achat', 'commande', 'fournisseur', 'approvisionnement'],
    content: `Le module Achats gère :
    - Demandes d'achat
    - Appels d'offres
    - Bons de commande
    - Réception marchandises
    - Contrôle factures
    - Évaluation fournisseurs
    - Contrats cadres`,
    navigationPath: '/purchases'
  },

  // Module Ventes
  {
    id: 'sales-overview',
    category: 'Ventes',
    title: 'Gestion Commerciale',
    description: 'Gestion des ventes et facturation',
    keywords: ['vente', 'facture', 'devis', 'commercial', 'client'],
    content: `Le module Ventes comprend :
    - Gestion des devis
    - Commandes clients
    - Livraisons
    - Facturation
    - Avoirs et remises
    - Suivi commercial
    - Commissionnement`,
    navigationPath: '/sales'
  },

  {
    id: 'invoice-creation',
    category: 'Ventes',
    subcategory: 'Facturation',
    title: 'Créer une facture',
    description: 'Émettre une nouvelle facture client',
    keywords: ['facture', 'facturer', 'facturation', 'nouvelle facture'],
    content: `Pour créer une facture :
    1. Ventes > Facturation
    2. Nouvelle facture
    3. Sélectionner le client
    4. Ajouter les lignes (articles/services)
    5. Appliquer TVA et remises
    6. Définir les conditions de paiement
    7. Générer et envoyer`,
    examples: [
      'Facture FAC-2024-001',
      'Échéance: 30 jours fin de mois'
    ],
    navigationPath: '/sales/invoices/new'
  },

  // Module RH
  {
    id: 'hr-overview',
    category: 'RH',
    title: 'Ressources Humaines',
    description: 'Gestion du personnel et de la paie',
    keywords: ['rh', 'ressources humaines', 'personnel', 'employé', 'paie'],
    content: `Le module RH gère :
    - Fiches employés
    - Contrats de travail
    - Présences et absences
    - Congés et planning
    - Paie et bulletins
    - Formation
    - Évaluations`,
    navigationPath: '/hr'
  },

  {
    id: 'payroll-processing',
    category: 'RH',
    subcategory: 'Paie',
    title: 'Traitement de la paie',
    description: 'Calculer et éditer les bulletins de paie',
    keywords: ['paie', 'salaire', 'bulletin', 'paye', 'rémunération'],
    content: `Processus de paie :
    1. RH > Paie
    2. Nouvelle période de paie
    3. Import des variables (heures, primes)
    4. Calcul automatique
    5. Vérification et ajustements
    6. Validation
    7. Édition bulletins
    8. Virements`,
    navigationPath: '/hr/payroll'
  },

  // Module Projets
  {
    id: 'project-overview',
    category: 'Projets',
    title: 'Gestion de Projets',
    description: 'Suivi et pilotage des projets',
    keywords: ['projet', 'planning', 'gantt', 'tâche', 'milestone'],
    content: `Le module Projets permet :
    - Création et structuration projets
    - Planning et Gantt
    - Affectation ressources
    - Suivi temps et coûts
    - Jalons et livrables
    - Tableaux de bord
    - Collaboration équipe`,
    navigationPath: '/projects'
  },

  // Module Immobilisations
  {
    id: 'assets-overview',
    category: 'Immobilisations',
    title: 'Gestion des Immobilisations',
    description: 'Gérer les actifs et amortissements',
    keywords: ['immobilisation', 'actif', 'amortissement', 'asset'],
    content: `Le module Immobilisations gère :
    - Registre des immobilisations
    - Calcul des amortissements
    - Cessions et mises au rebut
    - Réévaluations
    - Inventaire physique
    - États fiscaux
    - Subventions`,
    navigationPath: '/assets'
  },

  {
    id: 'asset-depreciation',
    category: 'Immobilisations',
    subcategory: 'Amortissements',
    title: 'Calcul des amortissements',
    description: 'Calculer les dotations aux amortissements',
    keywords: ['amortissement', 'dotation', 'dépréciation', 'calcul'],
    content: `Types d'amortissement :
    - Linéaire: montant constant
    - Dégressif: taux majoré
    - Unités d'œuvre: selon utilisation

    Calcul automatique mensuel
    Génération écritures comptables
    Simulations et projections`,
    navigationPath: '/assets/depreciation'
  },

  // ========== FONCTIONNALITÉS TRANSVERSES ==========

  {
    id: 'reports-overview',
    category: 'Reporting',
    title: 'Rapports et Tableaux de bord',
    description: 'Génération de rapports et analyses',
    keywords: ['rapport', 'reporting', 'tableau de bord', 'dashboard', 'analyse'],
    content: `Atlas Finance propose :
    - Tableaux de bord personnalisables
    - Rapports standards et personnalisés
    - Export multi-formats (PDF, Excel, CSV)
    - Planification automatique
    - Diffusion par email
    - Analyses graphiques
    - KPIs temps réel`,
    navigationPath: '/reports'
  },

  {
    id: 'user-management',
    category: 'Administration',
    title: 'Gestion des Utilisateurs',
    description: 'Administrer les comptes utilisateurs',
    keywords: ['utilisateur', 'compte', 'profil', 'permission', 'rôle'],
    content: `Pour gérer les utilisateurs :
    1. Administration > Utilisateurs
    2. Créer/Modifier utilisateur
    3. Définir les informations
    4. Attribuer les rôles
    5. Définir les permissions
    6. Activer l'accès`,
    navigationPath: '/admin/users'
  },

  {
    id: 'permissions',
    category: 'Administration',
    subcategory: 'Sécurité',
    title: 'Gestion des permissions',
    description: 'Configurer les droits d\'accès',
    keywords: ['permission', 'droit', 'accès', 'sécurité', 'rôle'],
    content: `Système de permissions :
    - Rôles prédéfinis (Admin, Manager, User)
    - Permissions granulaires par module
    - Restrictions par entité
    - Audit trail des accès
    - Authentification 2FA disponible`,
    navigationPath: '/admin/permissions'
  },

  {
    id: 'backup-restore',
    category: 'Administration',
    subcategory: 'Maintenance',
    title: 'Sauvegarde et Restauration',
    description: 'Sauvegarder et restaurer les données',
    keywords: ['sauvegarde', 'backup', 'restauration', 'restore', 'données'],
    content: `Sauvegarde des données :
    - Sauvegarde automatique quotidienne
    - Sauvegarde manuelle à la demande
    - Export complet ou partiel
    - Restauration point dans le temps
    - Archivage cloud sécurisé`,
    navigationPath: '/admin/backup'
  },

  // ========== PROCESSUS MÉTIER ==========

  {
    id: 'month-end-closing',
    category: 'Processus',
    title: 'Clôture mensuelle',
    description: 'Processus de clôture comptable mensuelle',
    keywords: ['clôture', 'fin de mois', 'closing', 'comptable'],
    content: `Étapes de clôture mensuelle :
    1. Rapprochement bancaire
    2. Validation des factures
    3. Comptabilisation paie
    4. Écritures d'inventaire
    5. Provisions et régularisations
    6. Contrôle de cohérence
    7. Édition des états
    8. Verrouillage période`,
    relatedTopics: ['bank-reconciliation', 'provisions']
  },

  {
    id: 'year-end-closing',
    category: 'Processus',
    title: 'Clôture annuelle',
    description: 'Processus de clôture d\'exercice',
    keywords: ['clôture annuelle', 'exercice', 'bilan', 'fiscal'],
    content: `Clôture d'exercice :
    1. Inventaire physique
    2. Ajustements et provisions
    3. Amortissements
    4. Écritures de régularisation
    5. Calcul résultat
    6. Bilan et compte de résultat
    7. Liasse fiscale
    8. Report à nouveau`,
    relatedTopics: ['financial-statements', 'tax-declaration']
  },

  // ========== AIDE ET SUPPORT ==========

  {
    id: 'shortcuts',
    category: 'Aide',
    title: 'Raccourcis clavier',
    description: 'Liste des raccourcis clavier disponibles',
    keywords: ['raccourci', 'clavier', 'shortcut', 'touches'],
    content: `Raccourcis principaux :
    - Ctrl+N : Nouveau
    - Ctrl+S : Sauvegarder
    - Ctrl+F : Rechercher
    - Ctrl+P : Imprimer
    - F1 : Aide contextuelle
    - F5 : Rafraîchir
    - Escape : Annuler/Fermer`,
    relatedTopics: ['navigation-tips']
  },

  {
    id: 'troubleshooting-login',
    category: 'Support',
    title: 'Problèmes de connexion',
    description: 'Résoudre les problèmes de connexion',
    keywords: ['connexion', 'login', 'mot de passe', 'accès', 'problème'],
    content: `En cas de problème de connexion :
    1. Vérifiez votre identifiant
    2. Réinitialisez le mot de passe
    3. Vérifiez la connexion internet
    4. Videz le cache navigateur
    5. Essayez un autre navigateur
    6. Contactez l'administrateur`,
    relatedTopics: ['password-reset', 'browser-compatibility']
  },

  // ========== INTÉGRATIONS ==========

  {
    id: 'excel-import',
    category: 'Intégration',
    title: 'Import Excel',
    description: 'Importer des données depuis Excel',
    keywords: ['import', 'excel', 'csv', 'données', 'migration'],
    content: `Import de données Excel :
    1. Préparez le fichier au format requis
    2. Module > Import
    3. Sélectionnez le fichier
    4. Mappez les colonnes
    5. Validez les données
    6. Lancez l'import
    7. Vérifiez le rapport`,
    examples: [
      'Import plan comptable',
      'Import liste clients',
      'Import catalogue produits'
    ],
    relatedTopics: ['data-export', 'data-mapping']
  },

  {
    id: 'api-integration',
    category: 'Intégration',
    title: 'API REST',
    description: 'Intégration via API REST',
    keywords: ['api', 'rest', 'intégration', 'webhook', 'automatisation'],
    content: `L'API Atlas Finance permet :
    - Accès lecture/écriture aux données
    - Authentification OAuth2
    - Webhooks pour événements
    - Documentation Swagger
    - Rate limiting
    - Formats JSON/XML`,
    relatedTopics: ['api-documentation', 'webhooks']
  }
];

// Index pour recherche rapide
export const knowledgeIndex = new Map<string, string[]>();

// Construire l'index enrichi au chargement
atlasFinanceKnowledge.forEach(entry => {
  const words = [
    ...entry.keywords,
    ...entry.title.toLowerCase().split(' '),
    ...entry.description.toLowerCase().split(' '),
    entry.category.toLowerCase(),
    ...(entry.subcategory?.toLowerCase().split(' ') || []),
    ...(entry.relatedTopics || []).map(t => t.toLowerCase())
  ];

  words.forEach(word => {
    const cleaned = word.replace(/[.,!?]/g, '').toLowerCase();
    if (cleaned.length > 2) { // Ignorer les mots trop courts
      if (!knowledgeIndex.has(cleaned)) {
        knowledgeIndex.set(cleaned, []);
      }
      if (!knowledgeIndex.get(cleaned)!.includes(entry.id)) {
        knowledgeIndex.get(cleaned)!.push(entry.id);
      }
    }
  });
});

// Algorithmes de recherche avancés
interface SearchResult {
  entry: KnowledgeEntry;
  score: number;
  matchReasons: string[];
}

interface SearchOptions {
  maxResults?: number;
  threshold?: number;
  includePartialMatches?: boolean;
  contextBoost?: boolean;
  semanticExpansion?: boolean;
}

// Modèle de synonymes et concepts sémantiques
const semanticMap = new Map([
  ['budget', ['prévisionnel', 'planification', 'allocation', 'ressources', 'finances']],
  ['stock', ['inventaire', 'marchandises', 'articles', 'produits', 'réserves', 'magasin']],
  ['client', ['customer', 'acheteur', 'consommateur', 'utilisateur', 'tiers']],
  ['facture', ['facturation', 'invoice', 'billing', 'document', 'commercial']],
  ['comptabilité', ['accounting', 'finance', 'écritures', 'journal', 'bilan']],
  ['utilisateur', ['user', 'compte', 'profil', 'access', 'login', 'connexion']],
  ['rapport', ['report', 'tableau', 'dashboard', 'état', 'statistique', 'analyse']],
  ['créer', ['nouveau', 'ajouter', 'faire', 'générer', 'établir', 'construire']],
  ['modifier', ['changer', 'éditer', 'update', 'corriger', 'ajuster', 'transformer']],
  ['problème', ['erreur', 'bug', 'souci', 'dysfonctionnement', 'panne', 'issue']]
]);

// Poids pour différents types de correspondances
const matchWeights = {
  exactTitle: 10.0,
  exactKeyword: 8.0,
  partialTitle: 6.0,
  exactDescription: 5.0,
  semanticKeyword: 4.5,
  partialKeyword: 4.0,
  semanticTitle: 3.5,
  contentExact: 3.0,
  semanticDescription: 2.5,
  contentPartial: 2.0,
  categoryMatch: 1.5,
  relatedTopic: 1.0
};

export class AdvancedKnowledgeSearch {
  private synonymCache = new Map<string, string[]>();
  private searchHistory: string[] = [];

  constructor() {
    this.precomputeSynonyms();
  }

  private precomputeSynonyms(): void {
    for (const [word, synonyms] of semanticMap) {
      this.synonymCache.set(word, [word, ...synonyms]);
      for (const synonym of synonyms) {
        if (!this.synonymCache.has(synonym)) {
          this.synonymCache.set(synonym, [word, ...synonyms]);
        }
      }
    }
  }

  getSemanticExpansion(word: string): string[] {
    const expansion = this.synonymCache.get(word.toLowerCase()) || [word];
    return [...new Set(expansion)];
  }

  private calculateSemanticSimilarity(word1: string, word2: string): number {
    if (word1 === word2) return 1.0;

    const expansion1 = this.getSemanticExpansion(word1);
    const expansion2 = this.getSemanticExpansion(word2);

    const intersection = expansion1.filter(w => expansion2.includes(w));
    if (intersection.length > 0) {
      return 0.8; // High similarity for semantic relatives
    }

    // Fuzzy string matching for typos
    return this.fuzzyMatch(word1, word2);
  }

  private fuzzyMatch(str1: string, str2: string): number {
    if (str1.includes(str2) || str2.includes(str1)) return 0.7;

    const maxLength = Math.max(str1.length, str2.length);
    const distance = this.levenshteinDistance(str1, str2);
    const similarity = 1 - (distance / maxLength);

    return similarity > 0.6 ? similarity : 0;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() =>
      Array(str1.length + 1).fill(null)
    );

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  search(query: string, options: SearchOptions = {}): SearchResult[] {
    const defaultOptions: SearchOptions = {
      maxResults: 5,
      threshold: 0.5,
      includePartialMatches: true,
      contextBoost: true,
      semanticExpansion: true,
      ...options
    };

    // Ajouter à l'historique
    this.searchHistory.push(query);
    if (this.searchHistory.length > 20) {
      this.searchHistory.shift();
    }

    const queryWords = this.extractQueryWords(query);
    const results: SearchResult[] = [];

    // Scorer chaque entrée
    for (const entry of atlasFinanceKnowledge) {
      const result = this.scoreEntry(entry, queryWords, defaultOptions);
      if (result.score >= defaultOptions.threshold!) {
        results.push(result);
      }
    }

    // Trier par score et limiter les résultats
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, defaultOptions.maxResults!);
  }

  private scoreEntry(entry: KnowledgeEntry, queryWords: string[], options: SearchOptions): SearchResult {
    let totalScore = 0;
    const matchReasons: string[] = [];
    const expandedWords = options.semanticExpansion
      ? queryWords.flatMap(word => this.getSemanticExpansion(word))
      : queryWords;

    for (const word of expandedWords) {
      // Title matching
      const titleWords = entry.title.toLowerCase().split(/\s+/);
      for (const titleWord of titleWords) {
        const similarity = this.calculateSemanticSimilarity(word, titleWord);
        if (similarity > 0.8) {
          totalScore += matchWeights.exactTitle * similarity;
          matchReasons.push(`Titre: "${titleWord}"`);
        } else if (similarity > 0.6) {
          totalScore += matchWeights.partialTitle * similarity;
          matchReasons.push(`Titre partiel: "${titleWord}"`);
        }
      }

      // Keywords matching
      for (const keyword of entry.keywords) {
        const similarity = this.calculateSemanticSimilarity(word, keyword);
        if (similarity > 0.8) {
          totalScore += matchWeights.exactKeyword * similarity;
          matchReasons.push(`Mot-clé: "${keyword}"`);
        } else if (similarity > 0.6) {
          totalScore += matchWeights.partialKeyword * similarity;
          matchReasons.push(`Mot-clé partiel: "${keyword}"`);
        }
      }

      // Description and content matching
      if (entry.description.toLowerCase().includes(word)) {
        totalScore += matchWeights.exactDescription;
        matchReasons.push(`Description: "${word}"`);
      }

      if (entry.content.toLowerCase().includes(word)) {
        totalScore += matchWeights.contentExact;
        matchReasons.push(`Contenu: "${word}"`);
      }

      // Category matching
      const catSimilarity = this.calculateSemanticSimilarity(word, entry.category.toLowerCase());
      if (catSimilarity > 0.7) {
        totalScore += matchWeights.categoryMatch * catSimilarity;
        matchReasons.push(`Catégorie: "${entry.category}"`);
      }
    }

    return {
      entry,
      score: totalScore,
      matchReasons: [...new Set(matchReasons)]
    };
  }

  private extractQueryWords(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[^\w\sàâäéèêëïîôöùûüÿç]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !this.isStopWord(word));
  }

  private isStopWord(word: string): boolean {
    const stopWords = [
      'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou',
      'mais', 'donc', 'car', 'ni', 'or', 'à', 'avec', 'sans', 'pour',
      'par', 'sur', 'sous', 'dans', 'en', 'vers', 'chez', 'je', 'tu',
      'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'me', 'te', 'se',
      'comment', 'pourquoi', 'quand', 'où', 'que', 'qui', 'quoi', 'est'
    ];
    return stopWords.includes(word);
  }

  getSearchSuggestions(partialQuery: string): string[] {
    const words = this.extractQueryWords(partialQuery);
    const suggestions = new Set<string>();

    // Suggestions basées sur les mots-clés fréquents
    for (const entry of atlasFinanceKnowledge) {
      for (const keyword of entry.keywords) {
        for (const word of words) {
          if (keyword.startsWith(word) && keyword.length > word.length) {
            suggestions.add(keyword);
          }
        }
      }
    }

    // Suggestions sémantiques
    for (const word of words) {
      const expansion = this.getSemanticExpansion(word);
      expansion.forEach(exp => suggestions.add(exp));
    }

    return Array.from(suggestions).slice(0, 8);
  }

  getPopularSearches(): string[] {
    return [
      'créer un budget',
      'gestion des stocks',
      'facturation client',
      'comptabilité générale',
      'recouvrement créances',
      'utilisateurs et permissions',
      'rapports financiers',
      'problèmes techniques'
    ];
  }
}

// Instance globale
export const advancedSearch = new AdvancedKnowledgeSearch();

// Fonction de recherche simple (compatibilité)
export function searchKnowledge(query: string, maxResults: number = 5): KnowledgeEntry[] {
  const results = advancedSearch.search(query, { maxResults });
  return results.map(r => r.entry);
}

// Fonction de recherche avancée
export function advancedSearchKnowledge(query: string, options?: SearchOptions): SearchResult[] {
  return advancedSearch.search(query, options);
}

// Fonction de recherche multimodale
export function multiModalSearch(options: {
  textQuery?: string;
  category?: string;
  keywords?: string[];
  dateRange?: { start: Date; end: Date };
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  maxResults?: number;
}): KnowledgeEntry[] {
  let results = atlasFinanceKnowledge;

  // Filtre par requête texte
  if (options.textQuery) {
    const searchResults = advancedSearch.search(options.textQuery, {
      maxResults: 50,
      threshold: 0.3
    });
    const resultIds = new Set(searchResults.map(r => r.entry.id));
    results = results.filter(entry => resultIds.has(entry.id));
  }

  // Filtre par catégorie
  if (options.category) {
    results = results.filter(entry =>
      entry.category.toLowerCase() === options.category!.toLowerCase()
    );
  }

  // Filtre par mots-clés
  if (options.keywords && options.keywords.length > 0) {
    results = results.filter(entry =>
      options.keywords!.some(keyword =>
        entry.keywords.some(entryKeyword =>
          entryKeyword.toLowerCase().includes(keyword.toLowerCase())
        )
      )
    );
  }

  return results.slice(0, options.maxResults || 10);
}

// Fonction de recherche par catégorie
export function searchByCategory(category: string, subcategory?: string): KnowledgeEntry[] {
  return atlasFinanceKnowledge.filter(entry => {
    const categoryMatch = entry.category.toLowerCase() === category.toLowerCase();
    const subcategoryMatch = !subcategory || entry.subcategory?.toLowerCase() === subcategory.toLowerCase();
    return categoryMatch && subcategoryMatch;
  });
}

// Fonction de recherche par tags
export function searchByKeywords(keywords: string[]): KnowledgeEntry[] {
  return atlasFinanceKnowledge.filter(entry =>
    keywords.some(keyword =>
      entry.keywords.some(entryKeyword =>
        entryKeyword.toLowerCase().includes(keyword.toLowerCase())
      )
    )
  );
}

// Obtenir les suggestions contextuelles améliorées
export function getContextualSuggestions(currentPath: string, userQuery?: string): string[] {
  // Suggestions basées sur le chemin actuel
  const pathSuggestions = atlasFinanceKnowledge
    .filter(entry => currentPath.includes(entry.navigationPath?.split('/')[1] || ''))
    .slice(0, 3)
    .map(e => e.title);

  // Si une requête utilisateur est fournie, ajouter des suggestions sémantiques
  if (userQuery) {
    const semanticSuggestions = advancedSearch.getSearchSuggestions(userQuery);
    return [...pathSuggestions, ...semanticSuggestions].slice(0, 6);
  }

  return pathSuggestions;
}

// Obtenir des suggestions intelligentes basées sur l'historique
export function getSmartSuggestions(): string[] {
  return advancedSearch.getPopularSearches();
}

// Fonction pour obtenir des statistiques de recherche
export function getSearchStats(): any {
  return {
    totalEntries: atlasFinanceKnowledge.length,
    categories: [...new Set(atlasFinanceKnowledge.map(e => e.category))],
    subcategories: [...new Set(atlasFinanceKnowledge.map(e => e.subcategory).filter(Boolean))],
    totalKeywords: atlasFinanceKnowledge.reduce((acc, e) => acc + e.keywords.length, 0)
  };
}