// @ts-nocheck
/**
 * Advanced Chatbot Hook - IA Intelligente avec Contexte Conversationnel
 * Hook principal pour l'interaction avec le chatbot IA amélioré
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ChatMessage, ChatSession, ChatContext, UserIntent } from '../types';
import { intentRecognizer } from '../ai/intentRecognition';
import { responseGenerator } from '../ai/responseGenerator';
import { palomaAI } from '../ai/intelligentResponse';
import { getContextualSuggestions, advancedSearch } from '../knowledge/atlasFinanceKnowledge';
import { palomaMLManager } from '../ai/mlIntegration';
import mlService from '../../../services/mlService';
import { v4 as uuidv4 } from 'uuid';

// Interfaces pour le contexte conversationnel avancé
interface ConversationMemory {
  userPreferences: Map<string, unknown>;
  frequentTopics: Map<string, number>;
  sessionPatterns: string[];
  emotionalState: 'neutral' | 'frustrated' | 'confused' | 'satisfied' | 'urgent';
  lastSuccessfulActions: string[];
  problemAreas: string[];
}

interface AdvancedChatContext extends ChatContext {
  conversationFlow: string[];
  currentTopic: string | null;
  userExpertiseLevel: 'beginner' | 'intermediate' | 'expert';
  sessionGoals: string[];
  completedTasks: string[];
  pendingTasks: string[];
  contextScore: number; // Score de pertinence du contexte actuel
}

interface SessionInsights {
  totalMessages: number;
  averageResponseTime: number;
  successfulResolutions: number;
  topCategories: string[];
  userSatisfactionScore: number;
  recommendedActions: string[];
}

interface AdvancedChatbotState {
  messages: ChatMessage[];
  isLoading: boolean;
  isTyping: boolean;
  currentSession: ChatSession | null;
  context: AdvancedChatContext;
  quickReplies: string[];
  suggestions: string[];
  conversationMemory: ConversationMemory;
  sessionInsights: SessionInsights;
  adaptivePersonality: 'helpful' | 'concise' | 'detailed' | 'encouraging';
}

// Classe pour gérer le contexte conversationnel intelligent
class ConversationContextManager {
  private memory: ConversationMemory;
  private sessionStart: Date;
  private interactionHistory: Array<{ query: string; response: string; satisfaction?: number; timestamp: Date }> = [];

  constructor() {
    this.memory = {
      userPreferences: new Map(),
      frequentTopics: new Map(),
      sessionPatterns: [],
      emotionalState: 'neutral',
      lastSuccessfulActions: [],
      problemAreas: []
    };
    this.sessionStart = new Date();
    this.loadPersistentMemory();
  }

  private loadPersistentMemory(): void {
    try {
      const stored = localStorage.getItem('paloma_conversation_memory');
      if (stored) {
        const data = JSON.parse(stored);
        this.memory.userPreferences = new Map(data.userPreferences || []);
        this.memory.frequentTopics = new Map(data.frequentTopics || []);
        this.memory.lastSuccessfulActions = data.lastSuccessfulActions || [];
        this.memory.problemAreas = data.problemAreas || [];
      }
    } catch (error) {
      console.warn('Erreur lors du chargement de la mémoire conversationnelle:', error);
    }
  }

  private savePersistentMemory(): void {
    try {
      const data = {
        userPreferences: Array.from(this.memory.userPreferences.entries()),
        frequentTopics: Array.from(this.memory.frequentTopics.entries()),
        lastSuccessfulActions: this.memory.lastSuccessfulActions,
        problemAreas: this.memory.problemAreas
      };
      localStorage.setItem('paloma_conversation_memory', JSON.stringify(data));
    } catch (error) {
      console.warn('Erreur lors de la sauvegarde de la mémoire conversationnelle:', error);
    }
  }

  updateConversationContext(query: string, intent: string, entities: Record<string, unknown>, response: string): AdvancedChatContext {
    // Mettre à jour les topics fréquents
    const currentCount = this.memory.frequentTopics.get(intent) || 0;
    this.memory.frequentTopics.set(intent, currentCount + 1);

    // Analyser l'état émotionnel
    this.memory.emotionalState = this.detectEmotionalState(query, this.interactionHistory);

    // Mettre à jour les patterns de session
    this.memory.sessionPatterns.push(intent);
    if (this.memory.sessionPatterns.length > 10) {
      this.memory.sessionPatterns.shift();
    }

    // Ajouter à l'historique
    this.interactionHistory.push({
      query,
      response,
      timestamp: new Date()
    });

    // Déterminer le niveau d'expertise
    const expertiseLevel = this.determineExpertiseLevel();

    // Calculer le score de contexte
    const contextScore = this.calculateContextRelevance(intent, entities);

    // Identifier les objectifs de session
    const sessionGoals = this.identifySessionGoals();

    this.savePersistentMemory();

    return {
      currentPage: window.location.pathname,
      currentModule: this.detectModule(window.location.pathname),
      userRole: 'user',
      recentActions: this.memory.sessionPatterns.slice(-5),
      conversationFlow: this.memory.sessionPatterns,
      currentTopic: intent,
      userExpertiseLevel: expertiseLevel,
      sessionGoals,
      completedTasks: this.identifyCompletedTasks(),
      pendingTasks: this.identifyPendingTasks(),
      contextScore
    };
  }

  private detectEmotionalState(query: string, history: Array<{ query: string; response: string; satisfaction?: number; timestamp: Date }>): ConversationMemory['emotionalState'] {
    const frustrationKeywords = ['ne marche pas', 'problème', 'bug', 'aidez-moi', 'je n\'arrive pas', 'impossible'];
    const urgentKeywords = ['urgent', 'important', 'rapide', 'vite', 'immédiat'];
    const confusionKeywords = ['je ne comprends pas', 'comment', 'pourquoi', 'expliquer', 'clarifier'];
    const satisfactionKeywords = ['merci', 'parfait', 'excellent', 'génial', 'ça marche'];

    const lowerQuery = query.toLowerCase();

    if (satisfactionKeywords.some(word => lowerQuery.includes(word))) {
      return 'satisfied';
    }
    if (urgentKeywords.some(word => lowerQuery.includes(word))) {
      return 'urgent';
    }
    if (frustrationKeywords.some(word => lowerQuery.includes(word))) {
      return 'frustrated';
    }
    if (confusionKeywords.some(word => lowerQuery.includes(word))) {
      return 'confused';
    }

    // Analyser l'historique récent pour détecter la frustration accumulée
    if (history.length >= 3) {
      const recentQueries = history.slice(-3).map(h => h.query.toLowerCase());
      const repeatedProblems = recentQueries.filter(q =>
        frustrationKeywords.some(word => q.includes(word))
      ).length;

      if (repeatedProblems >= 2) {
        return 'frustrated';
      }
    }

    return 'neutral';
  }

  private determineExpertiseLevel(): 'beginner' | 'intermediate' | 'expert' {
    const sessionLength = this.interactionHistory.length;
    const advancedTopics = Array.from(this.memory.frequentTopics.keys()).filter(topic =>
      ['accounting_entry', 'budget_analysis', 'debt_management', 'api_integration'].includes(topic)
    ).length;

    if (sessionLength < 5 && advancedTopics === 0) {
      return 'beginner';
    }
    if (sessionLength > 15 || advancedTopics > 2) {
      return 'expert';
    }
    return 'intermediate';
  }

  private calculateContextRelevance(intent: string, entities: Record<string, unknown>): number {
    let score = 0.5; // Score de base

    // Bonus pour la cohérence avec les intentions récentes
    const recentIntents = this.memory.sessionPatterns.slice(-3);
    if (recentIntents.includes(intent)) {
      score += 0.2;
    }

    // Bonus pour les entités pertinentes
    if (entities && Object.keys(entities).length > 0) {
      score += 0.1 * Object.keys(entities).length;
    }

    // Bonus pour les topics fréquents
    const topicFrequency = this.memory.frequentTopics.get(intent) || 0;
    if (topicFrequency > 0) {
      score += Math.min(topicFrequency * 0.05, 0.2);
    }

    return Math.min(score, 1.0);
  }

  private identifySessionGoals(): string[] {
    const goals: string[] = [];
    const recentTopics = Array.from(this.memory.frequentTopics.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([topic]) => topic);

    const goalMap: { [key: string]: string } = {
      'budget_help': 'Maîtriser la budgétisation',
      'accounting_help': 'Comprendre la comptabilité',
      'inventory_help': 'Gérer efficacement les stocks',
      'user_management': 'Administrer les utilisateurs',
      'technical_issue': 'Résoudre les problèmes techniques'
    };

    recentTopics.forEach(topic => {
      if (goalMap[topic]) {
        goals.push(goalMap[topic]);
      }
    });

    return goals;
  }

  private identifyCompletedTasks(): string[] {
    // Identifier les tâches réussies basées sur les patterns de satisfaction
    return this.interactionHistory
      .filter(interaction =>
        interaction.satisfaction === undefined || interaction.satisfaction > 0.7
      )
      .slice(-5)
      .map(interaction => `Résolu: ${interaction.query.substring(0, 30)}...`);
  }

  private identifyPendingTasks(): string[] {
    // Identifier les tâches en attente basées sur les problèmes non résolus
    const recentProblems = this.interactionHistory
      .slice(-10)
      .filter(interaction =>
        interaction.query.toLowerCase().includes('problème') ||
        interaction.query.toLowerCase().includes('aide') ||
        this.memory.emotionalState === 'frustrated'
      );

    return recentProblems.slice(-3).map(problem =>
      `En attente: ${problem.query.substring(0, 30)}...`
    );
  }

  private detectModule(pathname: string): string {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return 'dashboard';

    const moduleMap: { [key: string]: string } = {
      'dashboard': 'dashboard',
      'finance': 'finance',
      'inventory': 'inventory',
      'security': 'security',
      'settings': 'settings',
    };

    return moduleMap[segments[0]] || 'general';
  }

  getPersonalizedSuggestions(): string[] {
    const suggestions: string[] = [];
    const topTopics = Array.from(this.memory.frequentTopics.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // Suggestions basées sur l'état émotionnel
    switch (this.memory.emotionalState) {
      case 'frustrated':
        suggestions.push('Contacter le support technique', 'Guide de dépannage rapide');
        break;
      case 'confused':
        suggestions.push('Formation de base', 'Guide débutant');
        break;
      case 'urgent':
        suggestions.push('Actions prioritaires', 'Raccourcis rapides');
        break;
      default:
        // Suggestions personnalisées basées sur l'historique
        topTopics.forEach(([topic]) => {
          const suggestionMap: { [key: string]: string } = {
            'budget_help': 'Optimiser vos budgets',
            'inventory_help': 'Améliorer la gestion des stocks',
            'accounting_help': 'Maîtriser la comptabilité'
          };
          if (suggestionMap[topic]) {
            suggestions.push(suggestionMap[topic]);
          }
        });
    }

    return suggestions.slice(0, 4);
  }

  getMemory(): ConversationMemory {
    return this.memory;
  }

  getSessionInsights(): SessionInsights {
    const sessionDuration = Date.now() - this.sessionStart.getTime();
    const totalMessages = this.interactionHistory.length;

    return {
      totalMessages,
      averageResponseTime: sessionDuration / Math.max(totalMessages, 1),
      successfulResolutions: this.identifyCompletedTasks().length,
      topCategories: Array.from(this.memory.frequentTopics.keys()).slice(0, 3),
      userSatisfactionScore: this.calculateSatisfactionScore(),
      recommendedActions: this.getPersonalizedSuggestions()
    };
  }

  private calculateSatisfactionScore(): number {
    if (this.interactionHistory.length === 0) return 0.5;

    const satisfactionIndicators = this.interactionHistory.filter(interaction => {
      const query = interaction.query.toLowerCase();
      return query.includes('merci') || query.includes('parfait') || query.includes('excellent');
    }).length;

    const frustrationIndicators = this.interactionHistory.filter(interaction => {
      const query = interaction.query.toLowerCase();
      return query.includes('problème') || query.includes('bug') || query.includes('ne marche pas');
    }).length;

    const score = 0.5 + (satisfactionIndicators * 0.2) - (frustrationIndicators * 0.1);
    return Math.max(0, Math.min(1, score));
  }
}

export function useChatbot() {
  const location = useLocation();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const contextManagerRef = useRef<ConversationContextManager>(new ConversationContextManager());

  const [state, setState] = useState<AdvancedChatbotState>({
    messages: [],
    isLoading: false,
    isTyping: false,
    currentSession: null,
    context: {
      currentPage: location.pathname,
      currentModule: detectModule(location.pathname),
      userRole: 'user',
      recentActions: [],
      conversationFlow: [],
      currentTopic: null,
      userExpertiseLevel: 'beginner',
      sessionGoals: [],
      completedTasks: [],
      pendingTasks: [],
      contextScore: 0.5
    },
    conversationMemory: {
      userPreferences: new Map(),
      frequentTopics: new Map(),
      sessionPatterns: [],
      emotionalState: 'neutral',
      lastSuccessfulActions: [],
      problemAreas: []
    },
    sessionInsights: {
      totalMessages: 0,
      averageResponseTime: 0,
      successfulResolutions: 0,
      topCategories: [],
      userSatisfactionScore: 0.5,
      recommendedActions: []
    },
    adaptivePersonality: 'helpful',
    quickReplies: [],
    suggestions: [
      "Prévois ma trésorerie sur 30 jours",
      "Recommande un compte comptable",
      "Analyse les risques clients",
      "Détecte les anomalies récentes",
      "Comment créer un nouveau budget ?"
    ],
  });

  // Initialiser la session et message de bienvenue
  useEffect(() => {
    initializeChatSession();
  }, []);

  // Mettre à jour les suggestions contextuelles quand on change de page
  useEffect(() => {
    const contextualSuggestions = getContextualSuggestions(location.pathname);
    if (contextualSuggestions.length > 0) {
      setState(prev => ({
        ...prev,
        suggestions: [
          ...contextualSuggestions,
          "Comment faire ?",
          "Aide générale"
        ].slice(0, 5)
      }));
    }
  }, [location.pathname]);

  // Mettre à jour le contexte quand la route change
  useEffect(() => {
    setState(prev => ({
      ...prev,
      context: {
        ...prev.context,
        currentPage: location.pathname,
        currentModule: detectModule(location.pathname),
      }
    }));
  }, [location.pathname]);

  const initializeChatSession = useCallback(() => {
    const sessionId = uuidv4();
    const welcomeMessage: ChatMessage = {
      id: uuidv4(),
      content: generateWelcomeMessage(),
      sender: 'assistant',
      timestamp: new Date(),
      type: 'text',
      metadata: {
        confidence: 1.0,
        source: 'system',
        quickReplies: [
          "Prévois ma trésorerie",
          "Quels sont les comptes recommandés ?",
          "Analyse le risque client",
          "Y a-t-il des anomalies ?",
          "Comment ça marche ?"
        ]
      }
    };

    const session: ChatSession = {
      id: sessionId,
      userId: 'current-user', // À récupérer du contexte d'auth
      messages: [welcomeMessage],
      context: state.context,
      startedAt: new Date(),
      lastActiveAt: new Date(),
      status: 'active'
    };

    setState(prev => ({
      ...prev,
      messages: [welcomeMessage],
      currentSession: session,
      quickReplies: welcomeMessage.metadata?.quickReplies || []
    }));
  }, [state.context]);

  // Méthodes privées pour la gestion avancée du contexte (définies avant sendMessage)
  const adaptPersonalityToContext = useCallback((emotionalState: ConversationMemory['emotionalState']) => {
    switch (emotionalState) {
      case 'frustrated':
        return 'encouraging';
      case 'confused':
        return 'detailed';
      case 'urgent':
        return 'concise';
      case 'satisfied':
        return 'helpful';
      default:
        return 'helpful';
    }
  }, []);

  const personalizeResponse = useCallback((message: string, context: AdvancedChatContext, memory: ConversationMemory) => {
    let personalizedMessage = message;

    // Adapter selon le niveau d'expertise
    if (context.userExpertiseLevel === 'beginner') {
      personalizedMessage = `👤 **Mode Débutant Activé** \n\n${personalizedMessage}\n\n💡 *Astuce*: N'hésitez pas à me demander plus de détails si quelque chose n'est pas clair !`;
    } else if (context.userExpertiseLevel === 'expert') {
      personalizedMessage = `🚀 **Mode Expert** \n\n${personalizedMessage}`;
    }

    // Adapter selon l'état émotionnel
    switch (memory.emotionalState) {
      case 'frustrated':
        personalizedMessage = `🤗 Je comprends votre frustration. Prenons le temps de résoudre cela ensemble.\n\n${personalizedMessage}\n\n✨ *Je suis là pour vous aider à réussir !*`;
        break;
      case 'confused':
        personalizedMessage = `📚 Pas de souci, c'est normal d'avoir des questions !\n\n${personalizedMessage}\n\n🔍 *Voulez-vous que je détaille davantage ?*`;
        break;
      case 'urgent':
        personalizedMessage = `⚡ **Réponse Rapide** \n\n${personalizedMessage}\n\n🏃 *Action immédiate recommandée*`;
        break;
      case 'satisfied':
        personalizedMessage = `🎉 Formidable ! \n\n${personalizedMessage}\n\n👍 *Continuons sur cette lancée !*`;
        break;
    }

    return personalizedMessage;
  }, []);

  const calculateAdaptiveDelay = useCallback((confidence: number, context: AdvancedChatContext) => {
    let baseDelay = 800;

    // Ajuster selon la confiance
    baseDelay += (1 - confidence) * 1000;

    // Ajuster selon l'état émotionnel
    if (context.currentTopic === 'technical_issue') {
      baseDelay += 500; // Plus de temps pour les problèmes techniques
    }

    // Réduire le délai pour les utilisateurs experts
    if (context.userExpertiseLevel === 'expert') {
      baseDelay *= 0.7;
    }

    return Math.min(baseDelay, 3000);
  }, []);

  const sendMessage = useCallback(async (text: string): Promise<void> => {
    if (!text.trim() || state.isLoading) return;

    const contextManager = contextManagerRef.current;

    // Message utilisateur
    const userMessage: ChatMessage = {
      id: uuidv4(),
      content: text.trim(),
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    // Ajouter le message utilisateur immédiatement
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      isTyping: true,
      quickReplies: []
    }));

    try {
      // 🤖 ÉTAPE 1: Vérifier si c'est une requête ML
      const mlIntent = palomaMLManager.detectMLIntent(text);

      let responseMessage: string;
      let responseConfidence: number;
      let responseSources: string[] | undefined;
      let responseActions: Array<{ type: string; payload: Record<string, unknown> }> | undefined;
      let detectedIntent: string;

      if (mlIntent) {
        // 🧠 Requête ML détectée - Utiliser les capacités d'apprentissage automatique

        try {
          responseMessage = await palomaMLManager.executeCapability(mlIntent.capability, mlIntent.params);
          responseConfidence = 0.95;
          responseSources = ['ML Backend', 'Modèles IA'];
          detectedIntent = `ml_${mlIntent.capability}`;
        } catch (mlError) {
          console.error('Erreur ML:', mlError);
          responseMessage = "Oups ! 😅 Mon système d'IA n'est pas disponible pour le moment. Laissez-moi vous aider autrement...";
          responseConfidence = 0.5;
          detectedIntent = 'ml_error';
        }
      } else {
        // 💬 Requête normale - Utiliser l'IA conversationnelle classique
        const intent = intentRecognizer.recognizeIntent(text, state.context);
        const intelligentResponse = palomaAI.generateResponse(text, state.context);

        responseMessage = intelligentResponse.message;
        responseConfidence = intelligentResponse.confidence;
        responseSources = intelligentResponse.sources;
        responseActions = intelligentResponse.actions;
        detectedIntent = intent.intent;
      }

      // Reconnaissance d'intention pour le contexte
      const intent = intentRecognizer.recognizeIntent(text, state.context);

      // Mettre à jour le contexte conversationnel
      const updatedContext = contextManager.updateConversationContext(
        text,
        detectedIntent,
        intent.entities,
        responseMessage
      );

      // Adapter la personnalité de Proph3t selon l'état émotionnel
      const adaptivePersonality = adaptPersonalityToContext(contextManager.getMemory().emotionalState);

      // Personnaliser la réponse selon le niveau d'expertise et l'état émotionnel
      const personalizedResponse = personalizeResponse(
        responseMessage,
        updatedContext,
        contextManager.getMemory()
      );

      // Calculer le délai de réponse adaptatif
      const responseDelay = calculateAdaptiveDelay(responseConfidence, updatedContext);
      await sleep(responseDelay);

      // Créer le message de réponse enrichi
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        content: personalizedResponse,
        sender: 'assistant',
        timestamp: new Date(),
        type: 'text',
        metadata: {
          confidence: responseConfidence,
          sources: responseSources,
          actions: responseActions,
          quickReplies: contextManager.getPersonalizedSuggestions()
        }
      };

      // Obtenir les insights de session mis à jour
      const sessionInsights = contextManager.getSessionInsights();

      // Mettre à jour l'état avec le contexte enrichi
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
        isTyping: false,
        context: updatedContext,
        conversationMemory: contextManager.getMemory(),
        sessionInsights,
        adaptivePersonality,
        quickReplies: contextManager.getPersonalizedSuggestions(),
        suggestions: generateContextualSuggestions(updatedContext, intent)
      }));

    } catch (error) {
      console.error('Erreur lors de la génération de réponse:', error);
      handleError(error);
    }
  }, [state.context, state.isLoading, adaptPersonalityToContext, personalizeResponse, calculateAdaptiveDelay]);

  const generateContextualSuggestions = useCallback((context: AdvancedChatContext, intent: UserIntent) => {
    const suggestions = [];

    // Suggestions basées sur les objectifs de session
    suggestions.push(...context.sessionGoals.slice(0, 2));

    // Suggestions basées sur l'intention actuelle
    const intentSuggestions = intentRecognizer.getSuggestions(intent.intent, context);
    suggestions.push(...intentSuggestions.slice(0, 2));

    // Suggestions contextuelles de la base de connaissances
    const knowledgeSuggestions = getContextualSuggestions(context.currentPage, intent.entities.query);
    suggestions.push(...knowledgeSuggestions.slice(0, 2));

    return [...new Set(suggestions)].slice(0, 6);
  }, []);

  const handleError = useCallback((error: unknown) => {
    const contextManager = contextManagerRef.current;
    const memory = contextManager.getMemory();

    // Message d'erreur adapté selon l'état émotionnel
    let errorMessage = "Désolé, j'ai rencontré un problème technique.";

    if (memory.emotionalState === 'frustrated') {
      errorMessage = "😔 Je sais que c'est frustrant... Laissez-moi essayer une autre approche pour vous aider.";
    } else if (memory.emotionalState === 'urgent') {
      errorMessage = "⚡ Problème technique détecté. Contactons rapidement le support pour une résolution immédiate.";
    }

    const errorChatMessage: ChatMessage = {
      id: uuidv4(),
      content: errorMessage,
      sender: 'assistant',
      timestamp: new Date(),
      type: 'error',
      metadata: {
        confidence: 0,
        source: 'error'
      }
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, errorChatMessage],
      isLoading: false,
      isTyping: false,
      quickReplies: [
        "Réessayer différemment",
        "Contacter le support",
        "Retour au menu principal"
      ]
    }));
  }, []);

  const clearChat = useCallback(() => {
    initializeChatSession();
  }, [initializeChatSession]);

  const executeAction = useCallback((action: { type: string; payload: Record<string, string> }) => {
    switch (action.type) {
      case 'navigate':
        // Navigation - intégration avec React Router
        if (action.payload.route) {
          window.location.href = action.payload.route;
        }
        break;

      case 'copy-text':
        // Copier du texte dans le presse-papiers
        if (navigator.clipboard && action.payload.text) {
          navigator.clipboard.writeText(action.payload.text);
          // Notification de confirmation
          addSystemMessage("Texte copié dans le presse-papiers !");
        }
        break;

      case 'open-modal':
        // Ouvrir une modal - à implémenter selon le système de modales
        break;

      case 'external-link':
        // Ouvrir un lien externe
        if (action.payload.url) {
          window.open(action.payload.url, '_blank');
        }
        break;
    }
  }, []);

  const addSystemMessage = useCallback((content: string) => {
    const systemMessage: ChatMessage = {
      id: uuidv4(),
      content,
      sender: 'assistant',
      timestamp: new Date(),
      type: 'text',
      metadata: {
        confidence: 1.0,
        source: 'system'
      }
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, systemMessage]
    }));
  }, []);

  // Simulation de typing indicator plus réaliste
  const startTyping = useCallback(() => {
    setState(prev => ({ ...prev, isTyping: true }));

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setState(prev => ({ ...prev, isTyping: false }));
    }, 3000);
  }, []);

  // Méthodes d'analyse et d'insights
  const getConversationInsights = useCallback(() => {
    return contextManagerRef.current.getSessionInsights();
  }, []);

  const getPersonalizedRecommendations = useCallback(() => {
    return contextManagerRef.current.getPersonalizedSuggestions();
  }, []);

  const exportConversationData = useCallback(() => {
    const insights = contextManagerRef.current.getSessionInsights();
    const memory = contextManagerRef.current.getMemory();

    return {
      sessionInsights: insights,
      conversationMemory: {
        userPreferences: Array.from(memory.userPreferences.entries()),
        frequentTopics: Array.from(memory.frequentTopics.entries()),
        emotionalState: memory.emotionalState,
        sessionPatterns: memory.sessionPatterns
      },
      exportDate: new Date().toISOString()
    };
  }, []);

  return {
    // État principal
    messages: state.messages,
    isLoading: state.isLoading,
    isTyping: state.isTyping,
    quickReplies: state.quickReplies,
    suggestions: state.suggestions,
    context: state.context,

    // Nouvelles données contextuelles
    conversationMemory: state.conversationMemory,
    sessionInsights: state.sessionInsights,
    adaptivePersonality: state.adaptivePersonality,

    // Actions principales
    sendMessage,
    clearChat,
    executeAction,
    startTyping,

    // Nouvelles méthodes d'analyse
    getConversationInsights,
    getPersonalizedRecommendations,
    exportConversationData,
  };
}

// Fonctions utilitaires
function detectModule(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return 'dashboard';

  const moduleMap: { [key: string]: string } = {
    'dashboard': 'dashboard',
    'finance': 'finance',
    'inventory': 'inventory',
    'security': 'security',
    'settings': 'settings',
  };

  return moduleMap[segments[0]] || 'general';
}

function generateWelcomeMessage(): string {
  const hour = new Date().getHours();
  let greeting = 'Bonjour';

  if (hour < 12) {
    greeting = 'Bonjour';
  } else if (hour < 18) {
    greeting = 'Bonne après-midi';
  } else {
    greeting = 'Bonsoir';
  }

  const welcomeMessages = [
    `${greeting} ! 👋 Je suis **Proph3t**, votre assistante Atlas Studio dotée d'une intelligence artificielle !\n\n🧠 **Je maîtrise l'intégralité de Atlas Studio** :\n• Finance, Budget & Comptabilité\n• Stocks, Achats & Approvisionnements\n• Ventes, Factures & Recouvrement\n• RH, Paie & Gestion du personnel\n• Projets & Immobilisations\n\n🤖 **Mes capacités IA avancées** :\n• Recommandations comptables (Random Forest)\n• Prévisions de trésorerie (LSTM)\n• Analyse de risques clients (XGBoost)\n• Détection d'anomalies automatique\n\n💡 **Posez-moi n'importe quelle question**, je suis là pour vous guider !`,

    `${greeting} ! ✨ **Proph3t** à votre service, experte certifiée Atlas Studio !\n\n📚 **Ma base de connaissances couvre** :\n• Tous les processus métier\n• Configuration et paramétrage\n• Résolution de problèmes\n• Astuces et raccourcis\n• Rapports et analyses\n\n🧠 **Mes modèles d'apprentissage automatique** :\n• LSTM pour prédictions financières\n• Random Forest pour recommandations\n• XGBoost pour analyse de risques\n• Détection d'anomalies intelligente\n\n🎯 **Comment puis-je vous aider aujourd'hui ?**`,

    `${greeting} ! 🚀 C'est **Proph3t**, votre IA spécialisée Atlas Studio !\n\n🔍 **Je peux vous aider à** :\n• Naviguer dans les modules\n• Créer et gérer vos données\n• Comprendre les fonctionnalités\n• Optimiser votre utilisation\n• Résoudre vos problèmes\n\n🤖 **Mes prédictions intelligentes** :\n• Suggérer les bons comptes comptables\n• Prévoir vos flux de trésorerie\n• Évaluer les risques clients\n• Détecter les transactions suspectes\n\n💬 **Dites-moi ce dont vous avez besoin !**`
  ];

  return welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
}

function calculateResponseDelay(confidence: number): number {
  // Délai plus court pour les réponses sûres, plus long pour les réponses complexes
  const baseDelay = 800; // 800ms minimum
  const uncertaintyDelay = (1 - confidence) * 1500; // jusqu'à 1.5s pour les réponses incertaines
  const randomVariation = Math.random() * 500; // variation aléatoire jusqu'à 500ms

  return Math.min(baseDelay + uncertaintyDelay + randomVariation, 3000);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}