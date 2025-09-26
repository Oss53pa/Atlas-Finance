/**
 * Système de Réponse Intelligente pour Paloma
 * Génération de réponses basées sur la compréhension contextuelle
 */

import { searchKnowledge, KnowledgeEntry, wiseBookKnowledge } from '../knowledge/wiseBookKnowledge';
import { palomaLearningSystem } from './learningSystem';

export interface IntelligentResponse {
  message: string;
  confidence: number;
  sources: KnowledgeEntry[];
  suggestions: string[];
  actions?: ResponseAction[];
}

export interface ResponseAction {
  type: 'navigate' | 'execute' | 'help';
  label: string;
  path?: string;
  command?: string;
}

// Patterns de questions courantes
const questionPatterns = {
  howTo: /comment|how|faire|créer|ajouter|modifier|supprimer/i,
  what: /qu'est|c'est quoi|what|définition|expliquer/i,
  where: /où|where|trouver|localiser|emplacement/i,
  problem: /problème|erreur|bug|ne marche pas|ne fonctionne pas|impossible/i,
  navigation: /aller|naviguer|accéder|ouvrir|voir/i
};

// Analyse sémantique avancée
export class SemanticAnalyzer {
  private synonyms: Map<string, string[]> = new Map([
    ['facture', ['invoice', 'facturation', 'factures']],
    ['client', ['customer', 'clients', 'acheteur']],
    ['stock', ['inventaire', 'inventory', 'stocks', 'articles']],
    ['budget', ['budgétisation', 'prévisionnel', 'planification']],
    ['paiement', ['payment', 'règlement', 'encaissement']],
    ['rapport', ['report', 'reporting', 'état', 'tableau de bord']],
    ['utilisateur', ['user', 'users', 'compte', 'profil']],
    ['créer', ['nouveau', 'ajouter', 'faire', 'générer']],
    ['supprimer', ['effacer', 'enlever', 'retirer', 'delete']],
    ['modifier', ['changer', 'éditer', 'update', 'mettre à jour']]
  ]);

  expandQuery(query: string): string[] {
    const words = query.toLowerCase().split(' ');
    const expanded: string[] = [...words];

    words.forEach(word => {
      // Chercher les synonymes
      for (const [key, values] of this.synonyms) {
        if (key === word || values.includes(word)) {
          expanded.push(key, ...values);
        }
      }
    });

    return [...new Set(expanded)];
  }

  detectIntent(query: string): string {
    for (const [intent, pattern] of Object.entries(questionPatterns)) {
      if (pattern.test(query)) {
        return intent;
      }
    }
    return 'general';
  }

  calculateRelevance(query: string, entry: KnowledgeEntry): number {
    const queryWords = this.expandQuery(query);
    let score = 0;

    queryWords.forEach(word => {
      // Titre
      if (entry.title.toLowerCase().includes(word)) score += 5;
      // Description
      if (entry.description.toLowerCase().includes(word)) score += 3;
      // Keywords
      if (entry.keywords.some(k => k.includes(word))) score += 4;
      // Content
      if (entry.content.toLowerCase().includes(word)) score += 2;
    });

    return score;
  }
}

// Générateur de réponses intelligentes
export class IntelligentResponseGenerator {
  private analyzer = new SemanticAnalyzer();
  private conversationHistory: string[] = [];

  generateResponse(query: string, context?: any): IntelligentResponse {
    // Analyser l'intention
    const intent = this.analyzer.detectIntent(query);

    // Recherche sémantique étendue
    const expandedQuery = this.analyzer.expandQuery(query);
    const searchResults = this.enhancedSearch(expandedQuery.join(' '));

    // Générer la réponse selon l'intention
    let response: IntelligentResponse;

    switch (intent) {
      case 'howTo':
        response = this.generateHowToResponse(query, searchResults);
        break;
      case 'problem':
        response = this.generateProblemSolvingResponse(query, searchResults);
        break;
      case 'navigation':
        response = this.generateNavigationResponse(query, searchResults);
        break;
      case 'what':
        response = this.generateExplanationResponse(query, searchResults);
        break;
      default:
        response = this.generateGeneralResponse(query, searchResults);
    }

    // Ajouter à l'historique
    this.conversationHistory.push(query);
    if (this.conversationHistory.length > 10) {
      this.conversationHistory.shift();
    }

    // Améliorer la réponse avec le système d'apprentissage
    const enhancedResponse = this.enhanceWithLearning(response, query, context);

    return enhancedResponse;
  }

  private enhancedSearch(query: string): KnowledgeEntry[] {
    const results = searchKnowledge(query);

    // Si pas assez de résultats, chercher par similarité
    if (results.length < 3) {
      const allEntries = wiseBookKnowledge;
      const scored = allEntries.map(entry => ({
        entry,
        score: this.analyzer.calculateRelevance(query, entry)
      }));

      const topResults = scored
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .filter(r => r.score > 0)
        .map(r => r.entry);

      return [...new Set([...results, ...topResults])].slice(0, 5);
    }

    return results;
  }

  private generateHowToResponse(query: string, results: KnowledgeEntry[]): IntelligentResponse {
    if (results.length === 0) {
      return this.generateNotFoundResponse(query);
    }

    const primary = results[0];
    let message = `🎯 Parfait ! Voici comment ${this.extractAction(query)} :\n\n`;

    if (primary.content.includes('1.')) {
      // Si le contenu a des étapes
      message += primary.content;
    } else {
      message += `📋 **${primary.title}**\n\n${primary.content}`;
    }

    if (primary.examples && primary.examples.length > 0) {
      message += '\n\n💡 **Exemples :**\n';
      primary.examples.forEach(ex => {
        message += `• ${ex}\n`;
      });
    }

    const actions: ResponseAction[] = [];
    if (primary.navigationPath) {
      actions.push({
        type: 'navigate',
        label: `Aller à ${primary.title}`,
        path: primary.navigationPath
      });
    }

    return {
      message,
      confidence: 0.9,
      sources: results,
      suggestions: this.generateSuggestions(primary),
      actions
    };
  }

  private generateProblemSolvingResponse(query: string, results: KnowledgeEntry[]): IntelligentResponse {
    let message = '🔧 **Je vais vous aider à résoudre ce problème !**\n\n';

    if (results.length > 0 && results[0].category === 'Support') {
      message += results[0].content;
    } else {
      message += `Voici les solutions possibles :\n\n`;
      message += `1. **Vérifiez les permissions** - Assurez-vous d'avoir les droits nécessaires\n`;
      message += `2. **Rafraîchissez la page** (F5) pour recharger les données\n`;
      message += `3. **Videz le cache** du navigateur si le problème persiste\n`;
      message += `4. **Vérifiez votre connexion** internet\n`;

      if (results.length > 0) {
        message += `\n📚 Cela pourrait être lié à : **${results[0].title}**\n`;
        message += `${results[0].description}`;
      }
    }

    message += `\n\n💬 Si le problème persiste, décrivez-le moi en détail et je pourrai mieux vous aider !`;

    return {
      message,
      confidence: 0.7,
      sources: results,
      suggestions: [
        'Contacter le support',
        'Voir les logs système',
        'Vérifier les permissions'
      ],
      actions: [{
        type: 'help',
        label: 'Guide de dépannage',
        path: '/help/troubleshooting'
      }]
    };
  }

  private generateNavigationResponse(query: string, results: KnowledgeEntry[]): IntelligentResponse {
    if (results.length === 0) {
      return this.generateNotFoundResponse(query);
    }

    const destination = results[0];
    let message = `🧭 **Navigation vers ${destination.title}**\n\n`;
    message += `Pour y accéder :\n`;

    if (destination.navigationPath) {
      const pathParts = destination.navigationPath.split('/').filter(p => p);
      message += pathParts.map((part, index) =>
        `${index + 1}. ${this.formatPathPart(part)}`
      ).join(' > ');
    } else {
      message += `Cette fonctionnalité se trouve dans le module **${destination.category}**`;
    }

    message += `\n\n📝 **Description :** ${destination.description}`;

    return {
      message,
      confidence: 0.85,
      sources: results,
      suggestions: destination.relatedTopics || [],
      actions: destination.navigationPath ? [{
        type: 'navigate',
        label: `Ouvrir ${destination.title}`,
        path: destination.navigationPath
      }] : []
    };
  }

  private generateExplanationResponse(query: string, results: KnowledgeEntry[]): IntelligentResponse {
    if (results.length === 0) {
      return this.generateNotFoundResponse(query);
    }

    const topic = results[0];
    let message = `📚 **${topic.title}**\n\n`;
    message += `${topic.description}\n\n`;
    message += `**Détails :**\n${topic.content}`;

    if (topic.relatedTopics && topic.relatedTopics.length > 0) {
      message += `\n\n🔗 **Sujets liés :**\n`;
      topic.relatedTopics.forEach(t => {
        message += `• ${this.formatTopicName(t)}\n`;
      });
    }

    return {
      message,
      confidence: 0.9,
      sources: results,
      suggestions: topic.relatedTopics || [],
      actions: topic.navigationPath ? [{
        type: 'navigate',
        label: `Explorer ${topic.title}`,
        path: topic.navigationPath
      }] : []
    };
  }

  private generateGeneralResponse(query: string, results: KnowledgeEntry[]): IntelligentResponse {
    if (results.length === 0) {
      return this.generateNotFoundResponse(query);
    }

    let message = `✨ J'ai trouvé **${results.length} résultat${results.length > 1 ? 's' : ''}** pour votre recherche :\n\n`;

    results.slice(0, 3).forEach((result, index) => {
      message += `**${index + 1}. ${result.title}**\n`;
      message += `${result.description}\n`;
      if (result.navigationPath) {
        message += `📍 Chemin : ${result.navigationPath}\n`;
      }
      message += '\n';
    });

    const actions = results
      .filter(r => r.navigationPath)
      .slice(0, 3)
      .map(r => ({
        type: 'navigate' as const,
        label: r.title,
        path: r.navigationPath!
      }));

    return {
      message,
      confidence: 0.75,
      sources: results,
      suggestions: this.extractSuggestions(results),
      actions
    };
  }

  private generateNotFoundResponse(query: string): IntelligentResponse {
    const suggestions = [
      'Guide de démarrage',
      'Recherche avancée',
      'Contactez le support'
    ];

    let message = `🤔 **Je n'ai pas trouvé d'information exacte pour : "${query}"**\n\n`;
    message += `Voici ce que je peux vous proposer :\n\n`;
    message += `• Essayez de reformuler votre question\n`;
    message += `• Utilisez des mots-clés plus spécifiques\n`;
    message += `• Consultez le guide de démarrage\n\n`;
    message += `💡 **Suggestions de recherche :**\n`;

    // Proposer des modules proches
    const modules = ['Finance', 'Stocks', 'Ventes', 'Achats', 'RH'];
    const closeModule = modules.find(m =>
      query.toLowerCase().includes(m.toLowerCase())
    );

    if (closeModule) {
      const moduleEntries = wiseBookKnowledge.filter(e =>
        e.category === closeModule
      ).slice(0, 3);

      moduleEntries.forEach(e => {
        message += `• ${e.title}\n`;
      });
    }

    return {
      message,
      confidence: 0.3,
      sources: [],
      suggestions,
      actions: [{
        type: 'help',
        label: 'Aide générale',
        path: '/help'
      }]
    };
  }

  // Méthodes utilitaires
  private extractAction(query: string): string {
    const verbs = ['créer', 'ajouter', 'modifier', 'supprimer', 'faire'];
    const words = query.toLowerCase().split(' ');
    const verb = words.find(w => verbs.some(v => w.includes(v)));

    if (verb) {
      const index = words.indexOf(verb);
      return words.slice(index).join(' ');
    }

    return query;
  }

  private formatPathPart(part: string): string {
    const formatted = part.charAt(0).toUpperCase() + part.slice(1);
    return formatted.replace('-', ' ');
  }

  private formatTopicName(topicId: string): string {
    const entry = wiseBookKnowledge.find(e => e.id === topicId);
    return entry ? entry.title : topicId.replace('-', ' ');
  }

  private generateSuggestions(entry: KnowledgeEntry): string[] {
    const suggestions = [];

    if (entry.relatedTopics) {
      entry.relatedTopics.forEach(topicId => {
        const related = wiseBookKnowledge.find(e => e.id === topicId);
        if (related) {
          suggestions.push(related.title);
        }
      });
    }

    // Ajouter des suggestions contextuelles
    if (entry.category === 'Finance') {
      suggestions.push('Voir les rapports financiers');
    }
    if (entry.subcategory === 'Budget') {
      suggestions.push('Analyser les écarts budgétaires');
    }

    return suggestions.slice(0, 4);
  }

  private extractSuggestions(results: KnowledgeEntry[]): string[] {
    const allSuggestions = new Set<string>();

    results.forEach(r => {
      if (r.relatedTopics) {
        r.relatedTopics.forEach(t => {
          const entry = wiseBookKnowledge.find(e => e.id === t);
          if (entry) {
            allSuggestions.add(entry.title);
          }
        });
      }
    });

    return Array.from(allSuggestions).slice(0, 4);
  }

  // === INTÉGRATION DU SYSTÈME D'APPRENTISSAGE ===

  private enhanceWithLearning(response: IntelligentResponse, query: string, context?: any): IntelligentResponse {
    // Adapter la réponse en temps réel basée sur l'apprentissage
    const adaptedMessage = palomaLearningSystem.adaptResponseInRealTime(
      response.message,
      context,
      this.getRecentInteractions()
    );

    // Personnaliser selon le profil utilisateur
    const userPersonality = palomaLearningSystem.adaptPersonalityToUser('current_user');
    const personalizedMessage = this.personalizeMessage(adaptedMessage, userPersonality);

    // Améliorer la confiance basée sur les patterns appris
    const enhancedConfidence = this.calculateEnhancedConfidence(response.confidence, query, context);

    // Générer des suggestions basées sur l'apprentissage
    const learningSuggestions = palomaLearningSystem.getPersonalizationSuggestions('current_user');

    return {
      ...response,
      message: personalizedMessage,
      confidence: enhancedConfidence,
      suggestions: [...(response.suggestions || []), ...learningSuggestions].slice(0, 4),
      metadata: {
        enhanced: true,
        learningApplied: true,
        adaptationCount: this.countAppliedAdaptations(personalizedMessage, response.message)
      }
    };
  }

  private personalizeMessage(message: string, personality: any): string {
    if (!personality) return message;

    let personalized = message;

    // Adapter selon le ton préféré
    if (personality.tone === 'formal') {
      personalized = this.makeFormal(personalized);
    } else if (personality.tone === 'enthusiastic') {
      personalized = this.makeEnthusiastic(personalized);
    }

    // Adapter selon la longueur préférée
    if (personality.responseLength === 'short') {
      personalized = this.makeConchise(personalized);
    } else if (personality.responseLength === 'long') {
      personalized = this.addDetailedExplanation(personalized);
    }

    // Adapter selon le style de communication
    if (personality.style === 'step-by-step') {
      personalized = this.convertToStepByStep(personalized);
    }

    return personalized;
  }

  private calculateEnhancedConfidence(baseConfidence: number, query: string, context?: any): number {
    // Utiliser les insights d'apprentissage pour ajuster la confiance
    const learningInsights = palomaLearningSystem.generateLearningInsights();

    let enhancedConfidence = baseConfidence;

    // Augmenter la confiance si on a de bons patterns pour ce type de query
    if (learningInsights.mostEffectivePatterns.length > 0) {
      enhancedConfidence += 0.1;
    }

    // Ajuster selon la tendance d'amélioration générale
    enhancedConfidence += learningInsights.improvementTrend * 0.05;

    return Math.min(enhancedConfidence, 1.0);
  }

  private getRecentInteractions(): any[] {
    // Simuler l'obtention des interactions récentes
    return this.conversationHistory.map((query, index) => ({
      userQuery: query,
      intent: 'unknown', // À améliorer avec la vraie logique
      timestamp: new Date(Date.now() - (this.conversationHistory.length - index) * 60000)
    }));
  }

  private countAppliedAdaptations(adapted: string, original: string): number {
    let count = 0;
    if (adapted.length !== original.length) count++;
    if (adapted.includes('🤗') && !original.includes('🤗')) count++;
    if (adapted.includes('étape') && !original.includes('étape')) count++;
    return count;
  }

  // Méthodes utilitaires pour la personnalisation

  private makeFormal(message: string): string {
    return message
      .replace(/!/g, '.')
      .replace(/😊|🎯|✨|💡/g, '')
      .replace(/Salut|Coucou|Hey/gi, 'Bonjour')
      .trim();
  }

  private makeEnthusiastic(message: string): string {
    if (!message.includes('!')) {
      message = message.replace(/\./g, ' !');
    }
    if (!message.includes('✨')) {
      message = `✨ ${message}`;
    }
    return message;
  }

  private makeConchise(message: string): string {
    const sentences = message.split(/[.!?]+/);
    return sentences.slice(0, 2).join('. ') + '.';
  }

  private addDetailedExplanation(message: string): string {
    return `${message}\n\n💡 **Explication détaillée :**\nCette réponse prend en compte vos préférences d'apprentissage et adapte le contenu selon votre niveau d'expertise et vos interactions précédentes.`;
  }

  private convertToStepByStep(message: string): string {
    // Convertir le message en format étape par étape si ce n'est pas déjà fait
    if (message.includes('1.') || message.includes('•')) {
      return message; // Déjà structuré
    }

    const sentences = message.split(/[.!]+/).filter(s => s.trim());
    if (sentences.length <= 1) return message;

    const steps = sentences.map((sentence, index) =>
      `${index + 1}. ${sentence.trim()}`
    ).join('\n');

    return `📋 **Étapes à suivre :**\n${steps}`;
  }

  // Méthodes publiques pour l'enregistrement des interactions

  public recordInteractionFeedback(
    query: string,
    response: string,
    userFeedback: 'positive' | 'negative' | 'neutral',
    responseTime: number
  ): void {
    const interaction = {
      id: `interaction_${Date.now()}`,
      timestamp: new Date(),
      userQuery: query,
      intent: 'general', // À améliorer avec la vraie détection d'intention
      response: response,
      userSatisfaction: palomaLearningSystem.analyzeUserSatisfaction(query, response, userFeedback),
      userFeedback: userFeedback,
      responseTime: responseTime,
      contextAtTime: {},
      wasHelpful: userFeedback === 'positive',
      followUpActions: []
    };

    palomaLearningSystem.recordInteraction(interaction);
  }

  public getLearningInsights(): any {
    return palomaLearningSystem.generateLearningInsights();
  }

  public getPersonalizedExperience(userId: string): any {
    return palomaLearningSystem.personalizeExperience(userId);
  }

  public exportLearningData(): any {
    return palomaLearningSystem.exportLearningData();
  }
}

// Instance globale
export const palomaAI = new IntelligentResponseGenerator();