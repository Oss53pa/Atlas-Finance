/**
 * ChatbotProvider Component
 * Provider pour intégrer le chatbot intelligent dans l'application
 */

import React, { useState, createContext, useContext, useMemo, useCallback } from 'react';
import { ChatWidget } from '../chatbot';
import { FeatureGate } from '../gating';

interface ChatbotContextType {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined);

export const useChatbotContext = () => {
  const context = useContext(ChatbotContext);
  if (!context) {
    throw new Error('useChatbotContext must be used within a ChatbotProvider');
  }
  return context;
};

interface ChatbotProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
}

export const ChatbotProvider: React.FC<ChatbotProviderProps> = ({
  children,
  enabled = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => setIsOpen(prev => !prev), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const contextValue: ChatbotContextType = useMemo(
    () => ({ isOpen, toggle, open, close }),
    [isOpen, toggle, open, close],
  );

  return (
    <ChatbotContext.Provider value={contextValue}>
      {children}

      {/* Boule flottante Proph3t : lanceur de l'assistant = feature de BASE
          (proph3t_base, incluse PME + Premium) → visible dans tous les plans.
          Le gating Premium s'applique aux capacités LLM avancées À L'INTÉRIEUR
          du widget, pas au lanceur lui-même (sinon un tenant Starter perd
          totalement l'assistant, cf. proph3t_avance = premium-only). */}
      {enabled && (
        <FeatureGate feature="proph3t_base" fallback={null}>
          <ChatWidget
            isOpen={isOpen}
            onToggle={toggle}
          />
        </FeatureGate>
      )}
    </ChatbotContext.Provider>
  );
};

export default ChatbotProvider;