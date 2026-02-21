/**
 * useProphetV2 — React Hook for ProphetV2 AI Service
 *
 * Drop-in replacement for useChatbot hook.
 * Connects the ProphetV2 orchestrator to the chatbot UI.
 */
import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ProphetV2Service, ProphetResponse } from './ProphetV2';
import type { ChatMessage, ChatAction } from '../../components/chatbot/types';

interface ProphetV2State {
  messages: ChatMessage[];
  isLoading: boolean;
  isTyping: boolean;
  countryCode: string;
  model: string;
  toolsUsed: string[];
}

export function useProphetV2(defaultCountryCode: string = 'CI') {
  const prophetRef = useRef(new ProphetV2Service({ countryCode: defaultCountryCode }));

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
          'Bulletin de paie au Sénégal',
          'Quel taux de TVA au Cameroun ?',
          'Explique les SIG SYSCOHADA',
        ],
      },
    }],
    isLoading: false,
    isTyping: false,
    countryCode: defaultCountryCode,
    model: '',
    toolsUsed: [],
  });

  const sendMessage = useCallback(async (text: string): Promise<void> => {
    if (!text.trim() || state.isLoading) return;

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
      }));
    } catch (error) {
      console.error('ProphetV2 error:', error);

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
- **Fiscalité** : IS, TVA, IRPP, retenues à la source — 17 pays OHADA
- **Paie** : Bulletins de paie, cotisations sociales (CNPS, CSS, IPRES...)
- **Comptabilité SYSCOHADA** : Écritures, SIG, ratios, états financiers
- **Audit** : Analyse de Benford, conformité, contrôle interne
- **Droit OHADA** : AUDCIF, AUSCGIE, procédures collectives

Posez-moi votre question — je calcule avec précision !`;
}

function getContextualQuickReplies(toolsUsed: string[]): string[] {
  if (toolsUsed.length === 0) {
    return [
      'Calcule mon IS',
      'Bulletin de paie',
      'Écriture d\'achat avec TVA',
      'Taux TVA par pays',
      'Analyse de Benford',
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
      return ['Interpréter les résultats', 'Chiffres suspects', 'Tests complémentaires', 'Rapport d\'audit'];
    default:
      return ['Autre calcul', 'Écriture comptable', 'Analyse financière', 'Question juridique'];
  }
}

export default useProphetV2;
