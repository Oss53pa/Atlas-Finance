/**
 * Chatbot Hook - IA Intelligente
 * Hook principal pour l'interaction avec le chatbot IA
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ChatMessage, ChatSession, ChatContext, UserIntent } from '../types';
import { intentRecognizer } from '../ai/intentRecognition';
import { responseGenerator } from '../ai/responseGenerator';
import { v4 as uuidv4 } from 'uuid';

interface ChatbotState {
  messages: ChatMessage[];
  isLoading: boolean;
  isTyping: boolean;
  currentSession: ChatSession | null;
  context: ChatContext;
  quickReplies: string[];
  suggestions: string[];
}

export function useChatbot() {
  const location = useLocation();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const [state, setState] = useState<ChatbotState>({
    messages: [],
    isLoading: false,
    isTyping: false,
    currentSession: null,
    context: {
      currentPage: location.pathname,
      currentModule: detectModule(location.pathname),
      userRole: 'user', // À récupérer du contexte d'auth
      recentActions: [],
    },
    quickReplies: [],
    suggestions: [
      "Comment créer un nouveau budget ?",
      "Où puis-je voir mes stocks ?",
      "Comment ajouter un utilisateur ?"
    ],
  });

  // Initialiser la session et message de bienvenue
  useEffect(() => {
    initializeChatSession();
  }, []);

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
          "Comment ça marche ?",
          "Aide sur les budgets",
          "Gérer les stocks",
          "Problème technique"
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

  const sendMessage = useCallback(async (text: string): Promise<void> => {
    if (!text.trim() || state.isLoading) return;

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
      // Analyser l'intention avec l'IA
      const intent: UserIntent = intentRecognizer.recognizeIntent(text, state.context);

      // Simuler un délai de "réflexion" pour plus de réalisme
      const responseDelay = calculateResponseDelay(intent.confidence);
      await sleep(responseDelay);

      // Générer la réponse intelligente
      const response = responseGenerator.generateResponse(intent, state.context);

      // Créer le message de réponse
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        content: response.message,
        sender: 'assistant',
        timestamp: new Date(),
        type: 'text',
        metadata: {
          confidence: response.confidence,
          source: response.source,
          actions: response.actions,
          quickReplies: response.quickReplies
        }
      };

      // Mettre à jour l'état avec la réponse
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
        isTyping: false,
        quickReplies: response.quickReplies || [],
        context: {
          ...prev.context,
          recentActions: [
            ...prev.context.recentActions?.slice(-4) || [],
            `user_query:${intent.intent}`
          ]
        }
      }));

      // Suggestions intelligentes basées sur l'intention
      if (intent.confidence > 0.7) {
        const newSuggestions = intentRecognizer.getSuggestions(intent.intent, state.context);
        setState(prev => ({
          ...prev,
          suggestions: newSuggestions
        }));
      }

    } catch (error) {
      console.error('Erreur lors de la génération de réponse:', error);

      const errorMessage: ChatMessage = {
        id: uuidv4(),
        content: "Désolé, j'ai rencontré un problème technique. Pouvez-vous reformuler votre question ?",
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
        messages: [...prev.messages, errorMessage],
        isLoading: false,
        isTyping: false,
        quickReplies: [
          "Réessayer",
          "Aide générale",
          "Contacter le support"
        ]
      }));
    }
  }, [state.context, state.isLoading]);

  const clearChat = useCallback(() => {
    initializeChatSession();
  }, [initializeChatSession]);

  const executeAction = useCallback((action: any) => {
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
        console.log('Ouvrir modal:', action.payload.modal);
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

  return {
    // État
    messages: state.messages,
    isLoading: state.isLoading,
    isTyping: state.isTyping,
    quickReplies: state.quickReplies,
    suggestions: state.suggestions,
    context: state.context,

    // Actions
    sendMessage,
    clearChat,
    executeAction,
    startTyping,
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
    `${greeting} ! 🤖 Je suis Paloma, votre assistant WiseBook ! Je suis là pour vous aider à naviguer et utiliser votre logiciel. Comment puis-je vous assister ?`,
    `${greeting} ! 👋 Moi c'est Paloma ! Je connais WiseBook sur le bout des circuits. Dites-moi ce que vous cherchez !`,
    `${greeting} ! ✨ Paloma à votre service ! Prête à vous accompagner dans WiseBook. Quelle est votre mission aujourd'hui ?`,
    `${greeting} ! 🚀 Salut, je suis Paloma ! Votre guide personnel pour maîtriser WiseBook. Par où commençons-nous ?`
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