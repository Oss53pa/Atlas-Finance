/**
 * Advanced Intent Recognition System
 * Système avancé de reconnaissance d'intention avec IA sémantique pour Paloma
 */

import { UserIntent, ChatContext } from '../types';
import { wiseBookKnowledge } from '../knowledge/wiseBookKnowledge';

interface IntentPattern {
  intent: string;
  patterns: string[];
  entities?: string[];
  confidence: number;
  context?: string[];
}

// Modèle de vectorisation sémantique simple
interface SemanticVector {
  words: Map<string, number>;
  magnitude: number;
}

// Contexte conversationnel avancé
interface ConversationContext {
  previousIntents: string[];
  entityHistory: Map<string, string[]>;
  topicFlow: string[];
  userPatterns: Map<string, number>;
  sessionContext: ChatContext;
}

// Base de patterns d'intentions enrichie
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

export class AdvancedIntentRecognizer {
  private stopWords = [
    'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou',
    'mais', 'donc', 'car', 'ni', 'or', 'à', 'avec', 'sans', 'pour',
    'par', 'sur', 'sous', 'dans', 'en', 'vers', 'chez', 'je', 'tu',
    'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'me', 'te', 'se',
    'comment', 'pourquoi', 'quand', 'où', 'que', 'qui', 'quoi'
  ];

  private conversationContext: ConversationContext = {
    previousIntents: [],
    entityHistory: new Map(),
    topicFlow: [],
    userPatterns: new Map(),
    sessionContext: {}
  };

  // Modèles de synonymes enrichis
  private synonymMap = new Map([
    ['créer', ['faire', 'ajouter', 'nouveau', 'générer', 'produire', 'établir']],
    ['modifier', ['changer', 'éditer', 'mettre à jour', 'corriger', 'ajuster']],
    ['supprimer', ['effacer', 'enlever', 'retirer', 'delete', 'virer']],
    ['budget', ['prévisionnel', 'planification', 'budgétaire', 'finances', 'allocation']],
    ['stock', ['inventaire', 'marchandises', 'articles', 'produits', 'réserves']],
    ['client', ['customer', 'acheteur', 'utilisateur final', 'consommateur']],
    ['problème', ['erreur', 'bug', 'souci', 'dysfonctionnement', 'panne']],
    ['aide', ['assistance', 'support', 'help', 'guidance', 'accompagnement']]
  ]);

  // Poids sémantiques pour les différents types de contenu
  private semanticWeights = {
    title: 5.0,
    keywords: 4.0,
    description: 3.0,
    content: 2.0,
    context: 3.5,
    history: 1.5
  };

  recognizeIntent(userMessage: string, context: ChatContext): UserIntent {
    // Mettre à jour le contexte de session
    this.conversationContext.sessionContext = context;

    const normalizedMessage = this.normalizeMessage(userMessage);
    const semanticVector = this.createSemanticVector(normalizedMessage);
    const words = this.extractWords(normalizedMessage);

    // Analyser l'intention avec plusieurs approches
    const patternMatch = this.analyzePatternMatching(words, context);
    const semanticMatch = this.analyzeSemanticSimilarity(semanticVector, context);
    const contextualMatch = this.analyzeContextualIntent(normalizedMessage, context);
    const knowledgeMatch = this.analyzeKnowledgeBasedIntent(normalizedMessage);

    // Fusionner les résultats avec pondération intelligente
    const combinedResult = this.fusionResults([
      { result: patternMatch, weight: 0.3 },
      { result: semanticMatch, weight: 0.25 },
      { result: contextualMatch, weight: 0.25 },
      { result: knowledgeMatch, weight: 0.2 }
    ]);

    // Extraire les entités avec analyse contextuelle
    const extractedEntities = this.advancedEntityExtraction(normalizedMessage, context);

    // Mettre à jour l'historique conversationnel
    this.updateConversationHistory(combinedResult.intent, extractedEntities);

    return {
      intent: combinedResult.intent,
      confidence: combinedResult.confidence,
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

  // Nouvelle méthode d'analyse par pattern matching améliorée
  private analyzePatternMatching(words: string[], context: ChatContext): { intent: string; confidence: number } {
    let bestMatch = { intent: 'unknown', confidence: 0 };

    for (const pattern of intentPatterns) {
      const confidence = this.calculateEnhancedConfidence(words, pattern, context);
      if (confidence > bestMatch.confidence) {
        bestMatch = { intent: pattern.intent, confidence };
      }
    }

    return bestMatch;
  }

  private calculateEnhancedConfidence(
    words: string[],
    pattern: IntentPattern,
    context: ChatContext
  ): number {
    let confidence = 0;
    const matchedWords = new Set<string>();
    const expandedWords = this.expandWordsWithSynonyms(words);

    // Correspondance avec expansion sémantique
    for (const word of expandedWords) {
      for (const patternWord of pattern.patterns) {
        const similarity = this.advancedWordSimilarity(word, patternWord);
        if (similarity > 0.7) {
          confidence += (pattern.confidence * similarity) / pattern.patterns.length;
          matchedWords.add(word);
        }
      }
    }

    // Bonus contextuel enrichi
    confidence += this.calculateContextualBonus(pattern, context);

    // Bonus historique conversationnel
    confidence += this.calculateHistoryBonus(pattern.intent);

    // Normalisation intelligente
    const coverage = matchedWords.size / Math.max(words.length, 1);
    confidence *= (0.5 + coverage * 0.5);

    return Math.min(confidence, 1.0);
  }

  // Analyse sémantique vectorielle
  private analyzeSemanticSimilarity(userVector: SemanticVector, context: ChatContext): { intent: string; confidence: number } {
    let bestMatch = { intent: 'unknown', confidence: 0 };

    // Créer des vecteurs pour chaque intention
    for (const pattern of intentPatterns) {
      const patternVector = this.createPatternVector(pattern);
      const similarity = this.cosineSimilarity(userVector, patternVector);

      if (similarity > bestMatch.confidence) {
        bestMatch = { intent: pattern.intent, confidence: similarity };
      }
    }

    return bestMatch;
  }

  // Analyse contextuelle basée sur l'historique
  private analyzeContextualIntent(message: string, context: ChatContext): { intent: string; confidence: number } {
    const recentIntents = this.conversationContext.previousIntents.slice(-3);

    // Analyser les transitions d'intentions probables
    const transitionProbs = this.calculateIntentTransitions(recentIntents);

    let bestMatch = { intent: 'unknown', confidence: 0 };

    for (const [intent, probability] of transitionProbs) {
      // Vérifier si le message est compatible avec cette intention
      const compatibility = this.checkIntentCompatibility(message, intent);
      const confidence = probability * compatibility;

      if (confidence > bestMatch.confidence) {
        bestMatch = { intent, confidence };
      }
    }

    return bestMatch;
  }

  // Analyse basée sur la base de connaissances
  private analyzeKnowledgeBasedIntent(message: string): { intent: string; confidence: number } {
    let bestMatch = { intent: 'unknown', confidence: 0 };

    // Chercher dans la base de connaissances
    for (const entry of wiseBookKnowledge) {
      const relevance = this.calculateKnowledgeRelevance(message, entry);

      if (relevance > 0.5) {
        // Mapper la catégorie vers une intention
        const mappedIntent = this.mapCategoryToIntent(entry.category, entry.subcategory);
        if (mappedIntent && relevance > bestMatch.confidence) {
          bestMatch = { intent: mappedIntent, confidence: relevance * 0.8 };
        }
      }
    }

    return bestMatch;
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

  // Méthodes utilitaires avancées
  private createSemanticVector(text: string): SemanticVector {
    const words = this.extractWords(text);
    const wordMap = new Map<string, number>();
    let magnitude = 0;

    // Créer le vecteur de fréquence pondéré
    for (const word of words) {
      const expandedWords = this.getSynonyms(word);
      for (const expWord of expandedWords) {
        const count = (wordMap.get(expWord) || 0) + 1;
        wordMap.set(expWord, count);
        magnitude += count * count;
      }
    }

    return { words: wordMap, magnitude: Math.sqrt(magnitude) };
  }

  private createPatternVector(pattern: IntentPattern): SemanticVector {
    const allPatterns = pattern.patterns.join(' ');
    return this.createSemanticVector(allPatterns);
  }

  private cosineSimilarity(vec1: SemanticVector, vec2: SemanticVector): number {
    if (vec1.magnitude === 0 || vec2.magnitude === 0) return 0;

    let dotProduct = 0;
    for (const [word, freq1] of vec1.words) {
      const freq2 = vec2.words.get(word) || 0;
      dotProduct += freq1 * freq2;
    }

    return dotProduct / (vec1.magnitude * vec2.magnitude);
  }

  private expandWordsWithSynonyms(words: string[]): string[] {
    const expanded = [...words];
    for (const word of words) {
      expanded.push(...this.getSynonyms(word));
    }
    return [...new Set(expanded)];
  }

  private getSynonyms(word: string): string[] {
    for (const [key, synonyms] of this.synonymMap) {
      if (key === word || synonyms.includes(word)) {
        return [key, ...synonyms];
      }
    }
    return [word];
  }

  private advancedWordSimilarity(word1: string, word2: string): number {
    if (word1 === word2) return 1.0;

    // Vérifier les synonymes
    const syns1 = this.getSynonyms(word1);
    const syns2 = this.getSynonyms(word2);
    const hasCommonSynonym = syns1.some(s => syns2.includes(s));
    if (hasCommonSynonym) return 0.9;

    // Inclusion
    if (word1.includes(word2) || word2.includes(word1)) return 0.8;

    // Distance de Levenshtein
    const maxLength = Math.max(word1.length, word2.length);
    const distance = this.levenshteinDistance(word1, word2);
    return Math.max(0, 1 - (distance / maxLength));
  }

  private calculateContextualBonus(pattern: IntentPattern, context: ChatContext): number {
    let bonus = 0;

    // Bonus pour le module actuel
    if (pattern.context && context.currentModule) {
      for (const contextModule of pattern.context) {
        if (context.currentModule.includes(contextModule)) {
          bonus += 0.2;
          break;
        }
      }
    }

    // Bonus pour la page actuelle
    if (context.currentPage) {
      const pageMatches = pattern.patterns.some(p =>
        context.currentPage!.includes(p) || p.includes(context.currentPage!.split('/').pop() || '')
      );
      if (pageMatches) bonus += 0.15;
    }

    // Bonus pour les actions récentes
    if (context.recentActions && context.recentActions.length > 0) {
      const hasRelevantAction = context.recentActions.some(action =>
        pattern.patterns.some(p => action.toLowerCase().includes(p))
      );
      if (hasRelevantAction) bonus += 0.1;
    }

    return bonus;
  }

  private calculateHistoryBonus(intent: string): number {
    const recentIntents = this.conversationContext.previousIntents.slice(-5);
    const intentCount = recentIntents.filter(i => i === intent).length;

    // Bonus pour continuité thématique
    if (intentCount > 0) {
      return Math.min(intentCount * 0.05, 0.15);
    }

    // Pénalité légère pour changement de sujet fréquent
    const uniqueIntents = new Set(recentIntents).size;
    if (uniqueIntents > 3) {
      return -0.05;
    }

    return 0;
  }

  private calculateIntentTransitions(recentIntents: string[]): Map<string, number> {
    const transitions = new Map<string, number>();

    // Probabilités de transition basées sur des patterns logiques
    const transitionRules = new Map([
      ['greeting', ['help_general', 'navigation', 'budget_help']],
      ['help_general', ['budget_help', 'accounting_help', 'inventory_help', 'user_management']],
      ['budget_help', ['budget_analysis', 'accounting_help']],
      ['accounting_help', ['accounting_entry', 'budget_help']],
      ['technical_issue', ['performance_issue', 'help_general']],
      ['navigation', ['help_general']]
    ]);

    if (recentIntents.length > 0) {
      const lastIntent = recentIntents[recentIntents.length - 1];
      const possibleNext = transitionRules.get(lastIntent) || [];

      for (const nextIntent of possibleNext) {
        transitions.set(nextIntent, 0.3);
      }
    }

    return transitions;
  }

  private checkIntentCompatibility(message: string, intent: string): number {
    const pattern = intentPatterns.find(p => p.intent === intent);
    if (!pattern) return 0;

    const words = this.extractWords(this.normalizeMessage(message));
    let compatibilityScore = 0;

    for (const word of words) {
      for (const patternWord of pattern.patterns) {
        if (this.advancedWordSimilarity(word, patternWord) > 0.6) {
          compatibilityScore += 0.2;
        }
      }
    }

    return Math.min(compatibilityScore, 1.0);
  }

  private calculateKnowledgeRelevance(message: string, entry: any): number {
    const messageWords = this.extractWords(this.normalizeMessage(message));
    let relevanceScore = 0;

    for (const word of messageWords) {
      // Vérifier titre
      if (entry.title.toLowerCase().includes(word)) {
        relevanceScore += this.semanticWeights.title;
      }
      // Vérifier mots-clés
      if (entry.keywords.some((k: string) => k.includes(word))) {
        relevanceScore += this.semanticWeights.keywords;
      }
      // Vérifier description
      if (entry.description.toLowerCase().includes(word)) {
        relevanceScore += this.semanticWeights.description;
      }
      // Vérifier contenu
      if (entry.content.toLowerCase().includes(word)) {
        relevanceScore += this.semanticWeights.content;
      }
    }

    return Math.min(relevanceScore / (messageWords.length * 10), 1.0);
  }

  private mapCategoryToIntent(category: string, subcategory?: string): string | null {
    const categoryMap = new Map([
      ['Finance', 'budget_help'],
      ['Treasury', 'budget_help'],
      ['Tiers', 'debt_management'],
      ['Inventory', 'inventory_help'],
      ['Achats', 'purchase_order'],
      ['Ventes', 'invoice_creation'],
      ['RH', 'user_management'],
      ['Administration', 'user_management'],
      ['Reporting', 'export_data'],
      ['Aide', 'help_general'],
      ['Support', 'technical_issue']
    ]);

    const subCategoryMap = new Map([
      ['Budget', 'budget_help'],
      ['Recouvrement', 'debt_management'],
      ['Paie', 'user_management'],
      ['Amortissements', 'accounting_help'],
      ['Mouvements', 'inventory_help'],
      ['Facturation', 'invoice_creation']
    ]);

    return subcategory ? subCategoryMap.get(subcategory) : categoryMap.get(category);
  }

  private fusionResults(results: Array<{ result: { intent: string; confidence: number }, weight: number }>): { intent: string; confidence: number } {
    const intentScores = new Map<string, number>();

    // Agréger les scores pondérés
    for (const { result, weight } of results) {
      const currentScore = intentScores.get(result.intent) || 0;
      intentScores.set(result.intent, currentScore + (result.confidence * weight));
    }

    // Trouver le meilleur
    let bestIntent = 'unknown';
    let bestScore = 0;

    for (const [intent, score] of intentScores) {
      if (score > bestScore) {
        bestIntent = intent;
        bestScore = score;
      }
    }

    return { intent: bestIntent, confidence: Math.min(bestScore, 1.0) };
  }

  private advancedEntityExtraction(message: string, context: ChatContext): { [key: string]: string } {
    const extractedEntities: { [key: string]: string } = {};
    const normalizedMessage = message.toLowerCase();

    // Extraction améliorée avec contexte
    this.extractModulesWithContext(normalizedMessage, context, extractedEntities);
    this.extractPagesWithSynonyms(normalizedMessage, extractedEntities);
    this.extractActionsWithContext(normalizedMessage, context, extractedEntities);
    this.extractCustomEntities(normalizedMessage, extractedEntities);

    return extractedEntities;
  }

  private extractModulesWithContext(message: string, context: ChatContext, entities: { [key: string]: string }): void {
    for (const module of entities.modules) {
      if (message.includes(module) || this.getSynonyms(module).some(syn => message.includes(syn))) {
        entities.module = module;
        break;
      }
    }

    // Si pas d'entité trouvée, utiliser le contexte
    if (!entities.module && context.currentModule) {
      entities.module = context.currentModule;
    }
  }

  private extractPagesWithSynonyms(message: string, entities: { [key: string]: string }): void {
    for (const page of entities.pages) {
      const synonyms = this.getSynonyms(page);
      if (synonyms.some(syn => message.includes(syn))) {
        entities.page = page;
        break;
      }
    }
  }

  private extractActionsWithContext(message: string, context: ChatContext, entities: { [key: string]: string }): void {
    for (const action of entities.actions) {
      const synonyms = this.getSynonyms(action);
      if (synonyms.some(syn => message.includes(syn))) {
        entities.action = action;
        break;
      }
    }

    // Inférer l'action à partir des actions récentes
    if (!entities.action && context.recentActions && context.recentActions.length > 0) {
      const lastAction = context.recentActions[context.recentActions.length - 1];
      entities.action = lastAction.toLowerCase();
    }
  }

  private extractCustomEntities(message: string, entities: { [key: string]: string }): void {
    // Extraction d'entités spécifiques

    // Montants
    const amountRegex = /(\d+[\s,]*\d*)\s*(euros?|fcfa|\u20ac|\$)/i;
    const amountMatch = message.match(amountRegex);
    if (amountMatch) {
      entities.amount = amountMatch[1].replace(/[\s,]/g, '');
      entities.currency = amountMatch[2];
    }

    // Dates
    const dateRegex = /(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})|aujourd'hui|demain|hier/i;
    const dateMatch = message.match(dateRegex);
    if (dateMatch) {
      entities.date = dateMatch[0];
    }

    // Noms/Identifiants
    const nameRegex = /([A-Z][a-z]+\s+[A-Z][a-z]+)|([A-Z]{2,}\d+)/;
    const nameMatch = message.match(nameRegex);
    if (nameMatch) {
      entities.identifier = nameMatch[0];
    }
  }

  private updateConversationHistory(intent: string, entities: { [key: string]: string }): void {
    // Mettre à jour l'historique des intentions
    this.conversationContext.previousIntents.push(intent);
    if (this.conversationContext.previousIntents.length > 10) {
      this.conversationContext.previousIntents.shift();
    }

    // Mettre à jour l'historique des entités
    for (const [key, value] of Object.entries(entities)) {
      if (!this.conversationContext.entityHistory.has(key)) {
        this.conversationContext.entityHistory.set(key, []);
      }
      const history = this.conversationContext.entityHistory.get(key)!;
      history.push(value);
      if (history.length > 5) {
        history.shift();
      }
    }

    // Mettre à jour les patterns utilisateur
    const pattern = intent + '_' + (entities.module || 'general');
    const count = this.conversationContext.userPatterns.get(pattern) || 0;
    this.conversationContext.userPatterns.set(pattern, count + 1);
  }

  private extractEntities(message: string): { [key: string]: string } {
    return this.advancedEntityExtraction(message, this.conversationContext.sessionContext);
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

  // Méthodes publiques supplémentaires

  public getConversationInsights(): any {
    return {
      topIntents: this.getTopUserIntents(),
      entityPatterns: this.getEntityPatterns(),
      conversationFlow: this.conversationContext.topicFlow
    };
  }

  private getTopUserIntents(): Array<{ intent: string; count: number }> {
    const intentCounts = new Map<string, number>();

    for (const intent of this.conversationContext.previousIntents) {
      intentCounts.set(intent, (intentCounts.get(intent) || 0) + 1);
    }

    return Array.from(intentCounts.entries())
      .map(([intent, count]) => ({ intent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private getEntityPatterns(): Map<string, string[]> {
    return new Map(this.conversationContext.entityHistory);
  }

  public resetConversation(): void {
    this.conversationContext = {
      previousIntents: [],
      entityHistory: new Map(),
      topicFlow: [],
      userPatterns: new Map(),
      sessionContext: {}
    };
  }

  public addLearningPattern(userInput: string, correctIntent: string, confidence: number): void {
    if (confidence > 0.8) {
      // Ajouter le pattern à la base d'apprentissage
      const words = this.extractWords(this.normalizeMessage(userInput));

      // Trouver le pattern existant ou en créer un nouveau
      const existingPattern = intentPatterns.find(p => p.intent === correctIntent);
      if (existingPattern) {
        // Ajouter les nouveaux mots-clés uniques
        const newKeywords = words.filter(w => !existingPattern.patterns.includes(w));
        existingPattern.patterns.push(...newKeywords.slice(0, 3)); // Limiter l'ajout
      }
    }
  }
}

// Maintenir la compatibilité avec l'ancienne interface
export class IntentRecognizer extends AdvancedIntentRecognizer {}

export const intentRecognizer = new AdvancedIntentRecognizer();