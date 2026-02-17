/**
 * ChatbotProvider Component
 * Provider pour intégrer le chatbot intelligent dans l'application
 */

import React, { useState, createContext, useContext } from 'react';
import { ChatWidget } from '../chatbot';

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

      {/* Chatbot Widget */}
      {enabled && (
        <ChatWidget
          isOpen={isOpen}
          onToggle={toggle}
        />
      )}
    </ChatbotContext.Provider>
  );
};

export default ChatbotProvider;