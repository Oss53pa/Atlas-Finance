/**
 * Intent Recognition System
 * Système de reconnaissance d'intention pour l'IA du chatbot
 */

import { UserIntent, ChatContext } from '../types';

interface IntentPattern {
  intent: string;
  patterns: string[];
  entities?: string[];
  confidence: number;
  context?: string[];
}

// Base de patterns d'intentions
const intentPatterns: IntentPattern[] = [
  // SALUTATIONS
  {
    intent: 'greeting',
    patterns: [
      'bonjour', 'salut', 'hello', 'bonsoir', 'bonne journée',
      'coucou', 'hey', 'hi', 'bonne soirée'
    ],
    confidence: 0.9
  },

  // AIDE GÉNÉRALE
  {
    intent: 'help_general',
    patterns: [
      'aide', 'help', 'assistance', 'comment faire', 'comment utiliser',
      'je ne sais pas', 'je suis perdu', 'pouvez-vous m\'aider'
    ],
    confidence: 0.8
  },

  // NAVIGATION
  {
    intent: 'navigation',
    patterns: [
      'comment aller', 'où se trouve', 'où est', 'comment accéder',
      'naviguer vers', 'aller à', 'trouver', 'chercher'
    ],
    entities: ['page', 'module', 'section'],
    confidence: 0.85
  },

  // BUDGET
  {
    intent: 'budget_help',
    patterns: [
      'budget', 'créer budget', 'nouveau budget', 'planification',
      'prévisions', 'budgétaire', 'planifier budget'
    ],
    confidence: 0.9,
    context: ['finance']
  },
  {
    intent: 'budget_analysis',
    patterns: [
      'analyser budget', 'variation budget', 'écart budget',
      'analyse budgétaire', 'performance budget', 'suivi budget'
    ],
    confidence: 0.9,
    context: ['finance']
  },

  // COMPTABILITÉ
  {
    intent: 'accounting_help',
    patterns: [
      'comptabilité', 'écriture comptable', 'journal', 'plan comptable',
      'saisie comptable', 'écriture', 'compte'
    ],
    confidence: 0.9,
    context: ['finance']
  },
  {
    intent: 'accounting_entry',
    patterns: [
      'saisir écriture', 'nouvelle écriture', 'créer écriture',
      'enregistrer écriture', 'débit crédit'
    ],
    confidence: 0.95,
    context: ['finance']
  },

  // RECOUVREMENT
  {
    intent: 'debt_management',
    patterns: [
      'recouvrement', 'créances', 'impayés', 'relance client',
      'récupérer argent', 'client mauvais payeur'
    ],
    confidence: 0.9,
    context: ['finance']
  },

  // STOCKS
  {
    intent: 'inventory_help',
    patterns: [
      'stock', 'inventaire', 'produit', 'article', 'gestion stock',
      'niveau stock', 'mouvement stock'
    ],
    confidence: 0.9,
    context: ['inventory']
  },
  {
    intent: 'purchase_order',
    patterns: [
      'commande fournisseur', 'commander', 'achat', 'approvisionnement',
      'nouvelle commande', 'passer commande'
    ],
    confidence: 0.9,
    context: ['inventory']
  },

  // UTILISATEURS
  {
    intent: 'user_management',
    patterns: [
      'utilisateur', 'compte utilisateur', 'créer utilisateur',
      'gérer utilisateurs', 'rôle', 'permission', 'accès'
    ],
    confidence: 0.9,
    context: ['security', 'settings']
  },

  // MOT DE PASSE
  {
    intent: 'password_help',
    patterns: [
      'mot de passe', 'password', 'changer mot de passe',
      'oublié mot de passe', 'réinitialiser mot de passe'
    ],
    confidence: 0.95,
    context: ['security']
  },

  // EXPORT/IMPRESSION
  {
    intent: 'export_data',
    patterns: [
      'exporter', 'télécharger', 'imprimer', 'rapport', 'excel',
      'pdf', 'csv', 'extraction données'
    ],
    confidence: 0.8
  },

  // PROBLÈMES TECHNIQUES
  {
    intent: 'technical_issue',
    patterns: [
      'problème', 'erreur', 'bug', 'ne fonctionne pas', 'lent',
      'plantage', 'crash', 'dysfonctionnement', 'panne'
    ],
    confidence: 0.8
  },

  // PERFORMANCE
  {
    intent: 'performance_issue',
    patterns: [
      'lent', 'lenteur', 'performance', 'ralenti', 'lentissement',
      'optimiser', 'accélérer', 'améliorer vitesse'
    ],
    confidence: 0.85
  },

  // FORMATION
  {
    intent: 'training_request',
    patterns: [
      'formation', 'apprendre', 'tutorial', 'guide', 'documentation',
      'comment apprendre', 'me former', 'cours'
    ],
    confidence: 0.8
  }
];

// Entités nommées
const entities = {
  modules: [
    'dashboard', 'tableau de bord', 'accueil',
    'finance', 'comptabilité', 'budget', 'recouvrement',
    'inventory', 'stock', 'inventaire',
    'security', 'sécurité', 'utilisateurs',
    'settings', 'paramètres', 'configuration'
  ],
  pages: [
    'budget', 'prévisions', 'comptabilité', 'plan comptable',
    'recouvrement', 'créances', 'stock', 'commandes',
    'utilisateurs', 'rôles', 'permissions'
  ],
  actions: [
    'créer', 'modifier', 'supprimer', 'consulter', 'analyser',
    'exporter', 'importer', 'sauvegarder', 'valider'
  ]
};

export class IntentRecognizer {
  private stopWords = [
    'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou',
    'mais', 'donc', 'car', 'ni', 'or', 'à', 'avec', 'sans', 'pour',
    'par', 'sur', 'sous', 'dans', 'en', 'vers', 'chez', 'je', 'tu',
    'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'me', 'te', 'se',
    'comment', 'pourquoi', 'quand', 'où', 'que', 'qui', 'quoi'
  ];

  recognizeIntent(userMessage: string, context: ChatContext): UserIntent {
    const normalizedMessage = this.normalizeMessage(userMessage);
    const words = this.extractWords(normalizedMessage);

    let bestMatch: { intent: string; confidence: number } = {
      intent: 'unknown',
      confidence: 0
    };

    // Analyser chaque pattern d'intention
    for (const pattern of intentPatterns) {
      const confidence = this.calculateConfidence(words, pattern, context);

      if (confidence > bestMatch.confidence) {
        bestMatch = {
          intent: pattern.intent,
          confidence
        };
      }
    }

    // Extraire les entités
    const extractedEntities = this.extractEntities(normalizedMessage);

    return {
      intent: bestMatch.intent,
      confidence: bestMatch.confidence,
      entities: extractedEntities,
      context
    };
  }

  private normalizeMessage(message: string): string {
    return message
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractWords(message: string): string[] {
    return message
      .split(' ')
      .filter(word => word.length > 2 && !this.stopWords.includes(word));
  }

  private calculateConfidence(
    words: string[],
    pattern: IntentPattern,
    context: ChatContext
  ): number {
    let confidence = 0;
    const matchedWords = new Set<string>();

    // Correspondance avec les patterns
    for (const word of words) {
      for (const patternWord of pattern.patterns) {
        if (this.wordSimilarity(word, patternWord) > 0.8) {
          confidence += pattern.confidence / pattern.patterns.length;
          matchedWords.add(word);
          break;
        }
      }
    }

    // Bonus pour le contexte
    if (pattern.context && context.currentModule) {
      for (const contextModule of pattern.context) {
        if (context.currentModule.includes(contextModule)) {
          confidence += 0.2;
          break;
        }
      }
    }

    // Bonus pour les mots-clés multiples
    const uniqueMatches = matchedWords.size;
    if (uniqueMatches > 1) {
      confidence += (uniqueMatches - 1) * 0.1;
    }

    // Pénalité si trop peu de mots correspondent
    if (uniqueMatches === 0) {
      confidence = 0;
    } else if (uniqueMatches < words.length * 0.3) {
      confidence *= 0.7;
    }

    return Math.min(confidence, 1.0);
  }

  private wordSimilarity(word1: string, word2: string): number {
    // Distance de Levenshtein simplifiée
    if (word1 === word2) return 1.0;
    if (word1.includes(word2) || word2.includes(word1)) return 0.9;

    const maxLength = Math.max(word1.length, word2.length);
    const distance = this.levenshteinDistance(word1, word2);
    return 1 - (distance / maxLength);
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
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private extractEntities(message: string): { [key: string]: string } {
    const extractedEntities: { [key: string]: string } = {};

    // Extraire les modules
    for (const module of entities.modules) {
      if (message.includes(module)) {
        extractedEntities.module = module;
        break;
      }
    }

    // Extraire les pages
    for (const page of entities.pages) {
      if (message.includes(page)) {
        extractedEntities.page = page;
        break;
      }
    }

    // Extraire les actions
    for (const action of entities.actions) {
      if (message.includes(action)) {
        extractedEntities.action = action;
        break;
      }
    }

    return extractedEntities;
  }

  // Méthode pour ajouter de nouveaux patterns dynamiquement
  addPattern(pattern: IntentPattern): void {
    intentPatterns.push(pattern);
  }

  // Méthode pour obtenir des suggestions basées sur l'intention
  getSuggestions(intent: string, context: ChatContext): string[] {
    const suggestions: { [key: string]: string[] } = {
      greeting: [
        "Comment créer un nouveau budget ?",
        "Comment gérer mes stocks ?",
        "Comment ajouter un utilisateur ?",
        "Où trouve-t-on les rapports financiers ?"
      ],
      help_general: [
        "Navigation dans l'application",
        "Créer un budget prévisionnel",
        "Gérer les utilisateurs",
        "Exporter des données"
      ],
      budget_help: [
        "Comment analyser les variations budgétaires ?",
        "Comment créer un budget mensuel ?",
        "Comment comparer budget vs réalisé ?"
      ],
      accounting_help: [
        "Comment saisir une écriture comptable ?",
        "Comment consulter le plan comptable ?",
        "Comment générer un bilan ?"
      ],
      inventory_help: [
        "Comment suivre les niveaux de stock ?",
        "Comment passer une commande fournisseur ?",
        "Comment faire un inventaire ?"
      ]
    };

    return suggestions[intent] || [
      "Comment puis-je vous aider ?",
      "Avez-vous des questions sur un module spécifique ?",
      "Souhaitez-vous de l'aide pour naviguer ?"
    ];
  }
}

export const intentRecognizer = new IntentRecognizer();