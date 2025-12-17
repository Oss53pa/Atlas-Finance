/**
 * ChatbotProvider Component - FIXED VERSION
 * Provider pour intégrer le chatbot intelligent dans l'application
 * FIX: Lazy load ChatWidget to avoid circular dependency issues
 */

import React, { useState, createContext, useContext, Suspense, lazy } from 'react';

// Lazy load ChatWidget to break circular dependency
const ChatWidget = lazy(() => import('../chatbot/ChatWidget').then(module => ({ default: module.ChatWidget })));

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

  const toggle = () => setIsOpen(prev => !prev);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  const contextValue: ChatbotContextType = {
    isOpen,
    toggle,
    open,
    close,
  };

  return (
    <ChatbotContext.Provider value={contextValue}>
      {children}

      {/* Chatbot Widget - Lazy loaded with Suspense */}
      {enabled && (
        <Suspense fallback={null}>
          <ChatWidget
            isOpen={isOpen}
            onToggle={toggle}
          />
        </Suspense>
      )}
    </ChatbotContext.Provider>
  );
};

export default ChatbotProvider;
