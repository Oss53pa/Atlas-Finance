// @ts-nocheck

/**
 * useProphetV2 — React Hook for ProphetV2 AI Service
 *
 * Drop-in replacement for useChatbot hook.
 * Connects the ProphetV2 orchestrator to the chatbot UI.
 * Injects DataAdapter from DataContext for real data access.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ProphetV2Service, ProphetResponse } from './ProphetV2';
import type { ChatMessage, ChatAction } from '../../components/chatbot/types';
import { useData } from '../../contexts/DataContext';
import { continuousLearning } from './learning/index';

interface ProphetV2State {
  messages: ChatMessage[];
  isLoading: boolean;
  isTyping: boolean;
  countryCode: string;
  model: string;
  toolsUsed: string[];
  lastInteractionId: string | null;
}

export function useProphetV2(defaultCountryCode: string = 'CI') {
  const { adapter } = useData();
  const prophetRef = useRef(new ProphetV2Service({ countryCode: defaultCountryCode }, adapter));

  // Keep adapter in sync
  useEffect(() => {
    if (adapter) {
      prophetRef.current.setAdapter(adapter);
    }
  }, [adapter]);

  const [state, setState] = useState<ProphetV2State>({
    messages: [{
      id: uuidv4(),
      content: getWelcomeMessage(),
      sender: 'assistant',
      timestamp: new Date(),
      type: 'text',
      metadata: {
        confidence: 1.0,
        source: 'system',
        quickReplies: [
          'Calcule mon IS en Côte d\'Ivoire',
          'Génère une écriture d\'achat',
          'Lance un audit complet',
          'Montre-moi la balance classe 4',
          'Quel est mon solde bancaire ?',
        ],
      },
    }],
    isLoading: false,
    isTyping: false,
    countryCode: defaultCountryCode,
    model: '',
    toolsUsed: [],
    lastInteractionId: null,
  });

  const sendMessage = useCallback(async (text: string): Promise<void> => {
    if (!text.trim() || state.isLoading) return;

    // Start learning tracking
    const interactionId = continuousLearning.startInteraction(text.trim(), state.countryCode);

    const userMessage: ChatMessage = {
      id: uuidv4(),
      content: text.trim(),
      sender: 'user',
      timestamp: new Date(),
      type: 'text',
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      isTyping: true,
    }));

    try {
      const response: ProphetResponse = await prophetRef.current.send(text.trim());

      // Complete learning tracking
      continuousLearning.completeInteraction(response);

      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        content: response.content,
        sender: 'assistant',
        timestamp: new Date(),
        type: 'text',
        metadata: {
          confidence: 0.95,
          source: response.model.includes('fallback') ? 'fallback' : 'ai',
          quickReplies: getContextualQuickReplies(response.toolsUsed),
        },
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
        isTyping: false,
        model: response.model,
        toolsUsed: response.toolsUsed,
        lastInteractionId: interactionId,
      }));
    } catch (error) {

      const errorMessage: ChatMessage = {
        id: uuidv4(),
        content: 'Désolé, une erreur s\'est produite. Veuillez réessayer.',
        sender: 'assistant',
        timestamp: new Date(),
        type: 'error',
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, errorMessage],
        isLoading: false,
        isTyping: false,
      }));
    }
  }, [state.isLoading]);

  const clearChat = useCallback(() => {
    prophetRef.current.reset();
    setState(prev => ({
      ...prev,
      messages: [{
        id: uuidv4(),
        content: getWelcomeMessage(),
        sender: 'assistant',
        timestamp: new Date(),
        type: 'text',
        metadata: {
          confidence: 1.0,
          source: 'system',
        },
      }],
      toolsUsed: [],
    }));
  }, []);

  const setCountryCode = useCallback((code: string) => {
    prophetRef.current.setCountryCode(code);
    setState(prev => ({ ...prev, countryCode: code }));
  }, []);

  const executeAction = useCallback((action: ChatAction) => {
    switch (action.type) {
      case 'navigate':
        if (action.payload?.route) {
          window.location.href = action.payload.route;
        }
        break;
      case 'copy-text':
        if (navigator.clipboard && action.payload?.text) {
          navigator.clipboard.writeText(action.payload.text);
        }
        break;
      case 'external-link':
        if (action.payload?.url) {
          window.open(action.payload.url, '_blank');
        }
        break;
    }
  }, []);

  // ── Continuous Learning API ──────────────────────────────────

  /** Record positive or negative feedback on the last response */
  const recordFeedback = useCallback((feedback: 'positive' | 'negative' | 'neutral', details?: string) => {
    if (state.lastInteractionId) {
      continuousLearning.recordFeedback(state.lastInteractionId, feedback, details);
    }
  }, [state.lastInteractionId]);

  /** Add a knowledge correction (user tells PROPH3T it was wrong) */
  const addCorrection = useCallback((original: string, corrected: string, category: string, keywords: string[]) => {
    continuousLearning.addCorrection(original, corrected, category, keywords);
  }, []);

  /** Get learning statistics */
  const getLearningStats = useCallback(() => {
    return continuousLearning.getStats();
  }, []);

  /** Reset all learning data */
  const resetLearning = useCallback(() => {
    continuousLearning.reset();
  }, []);

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    isTyping: state.isTyping,
    countryCode: state.countryCode,
    model: state.model,
    toolsUsed: state.toolsUsed,
    quickReplies: state.messages[state.messages.length - 1]?.metadata?.quickReplies || [],
    suggestions: getContextualQuickReplies(state.toolsUsed),

    sendMessage,
    clearChat,
    setCountryCode,
    executeAction,

    // Continuous learning
    recordFeedback,
    addCorrection,
    getLearningStats,
    resetLearning,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getWelcomeMessage(): string {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bonne après-midi' : 'Bonsoir';

  return `${greeting} ! Je suis **Proph3t**, votre expert-comptable et auditeur IA spécialisé zone OHADA.

**Mes compétences** :
- **Fiscalité** : IS, TVA, IRPP, retenues — 17 pays OHADA
- **Paie** : Bulletins de paie, cotisations sociales
- **Comptabilité** : Écritures, balance, grand livre, SIG, ratios
- **Audit** : 108 contrôles SYSCOHADA, Benford, anomalies
- **Trésorerie** : Soldes bancaires, prévisions, créances
- **Clôture** : Régularisations, amortissements, affectation résultat
- **Fiscal** : Calendrier, liasse SYSCOHADA

Posez-moi votre question — je calcule avec vos données réelles !`;
}

function getContextualQuickReplies(toolsUsed: string[]): string[] {
  if (toolsUsed.length === 0) {
    return [
      'Calcule mon IS',
      'Bulletin de paie',
      'Lance un audit complet',
      'Montre la balance',
      'Solde bancaire',
    ];
  }

  const lastTool = toolsUsed[toolsUsed.length - 1];
  switch (lastTool) {
    case 'calculer_is':
      return ['Acomptes trimestriels ?', 'Calcul IMF', 'Écriture comptable IS', 'IS au Sénégal'];
    case 'calculer_tva':
      return ['TVA au Cameroun (CAC)', 'Déclaration TVA', 'Taux réduit', 'Écriture TVA'];
    case 'calculer_irpp':
      return ['Simulation famille', 'Barème détaillé', 'Retenue à la source', 'Bulletin de paie'];
    case 'calculer_bulletin_paie':
      return ['Cotisations détaillées', 'Paie au Cameroun', 'Heures supplémentaires', 'Charges patronales'];
    case 'generer_ecriture':
      return ['Écriture de vente', 'Écriture de salaires', 'Écriture immobilisation', 'Déclaration TVA'];
    case 'analyser_benford':
      return ['Interpréter les résultats', 'Chiffres suspects', 'Tests complémentaires', 'Audit complet'];
    case 'consulter_balance':
      return ['Balance classe 6', 'Balance classe 4', 'Vérifier équilibre', 'Grand livre'];
    case 'audit_complet':
    case 'audit_cycle':
      return ['Détail des erreurs', 'Audit tiers', 'Audit trésorerie', 'Corriger les anomalies'];
    case 'consulter_tresorerie':
      return ['Prévision trésorerie', 'Analyser créances', 'Budget', 'Rapprochement bancaire'];
    case 'assister_cloture':
      return ['Générer régularisations', 'Calcul amortissements', 'Affectation résultat', 'Calendrier fiscal'];
    case 'calculer_amortissement':
      return ['Simuler dégressif', 'Tableau complet', 'Écriture dotation', 'Cession immobilisation'];
    default:
      return ['Autre calcul', 'Écriture comptable', 'Audit', 'Analyse financière'];
  }
}

export default useProphetV2;
