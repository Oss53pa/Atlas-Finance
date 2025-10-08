/**
 * ChatWidget Component
 * Widget de chat flottant pour l'assistance utilisateur
 */

import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { ChatMessage, ChatSession } from './types';
import { useChatbot } from './hooks/useChatbot';
import { useDraggable } from './hooks/useDraggable';
import { MessageList } from './components/MessageList';
import { MessageInput } from './components/MessageInput';
import { QuickReplies } from './components/QuickReplies';
import { PalomaAvatar } from './components/PalomaAvatar';
import { Move, Minimize2, Maximize2 } from 'lucide-react';
import './ChatWidget.css';

interface ChatWidgetProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  isOpen,
  onToggle,
  className = '',
}) => {
  const { t } = useLanguage();
  const {
    messages,
    isLoading,
    sendMessage,
    quickReplies,
    suggestions,
    isTyping,
  } = useChatbot();

  const {
    position,
    isDragging,
    dragRef,
    resetPosition,
  } = useDraggable({
    handle: isOpen ? '.chat-widget__drag-handle' : undefined,
    bounds: 'window',
  });

  const [inputValue, setInputValue] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    setInputValue('');
    await sendMessage(text);
  };

  const handleQuickReply = (reply: string) => {
    handleSendMessage(reply);
  };

  if (!isOpen) {
    return (
      <button
        ref={dragRef}
        className={`chat-widget-toggle ${className} ${isDragging ? 'dragging' : ''}`}
        onClick={onToggle}
        aria-label="Ouvrir Paloma, votre assistante WiseBook"
        title="Besoin d'aide ? Cliquez pour discuter avec Paloma, votre assistante WiseBook"
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          transition: isDragging ? 'none' : 'all 0.3s ease',
        }}
      >
        <PalomaAvatar size="lg" showName={true} />
        <span className="chat-widget-toggle__name">
          Paloma
        </span>
      </button>
    );
  }

  return (
    <div
      ref={dragRef}
      className={`chat-widget ${className} ${isDragging ? 'dragging' : ''} ${isMinimized ? 'minimized' : ''}`}
      role="dialog"
      aria-label="Assistant WiseBook"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transition: isDragging ? 'none' : 'transform 0.3s ease',
      }}
    >
      {/* Header */}
      <div className="chat-widget__header">
        <div className="chat-widget__header-info">
          <div className="chat-widget__drag-handle" title="Déplacer Paloma">
            <Move size={16} className="drag-icon" />
          </div>
          <div className="chat-widget__avatar">
            <PalomaAvatar size="md" isTyping={isTyping} />
          </div>
          <div className="chat-widget__header-text">
            <h3 className="chat-widget__title">Paloma</h3>
            <p className="chat-widget__subtitle">
              {isTyping ? 'Paloma en train d\'écrire...' : 'Assistant WiseBook • En ligne'}
            </p>
          </div>
        </div>
        <div className="chat-widget__header-actions">
          <button
            className="chat-widget__minimize"
            onClick={() => setIsMinimized(!isMinimized)}
            aria-label={isMinimized ? "Agrandir" : "Réduire"}
            title={isMinimized ? "Agrandir" : "Réduire"}
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button
            className="chat-widget__close"
            onClick={onToggle}
            aria-label="Fermer le chat"
            title={t('common.close')}
          >
            ×
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-widget__content">
        <MessageList
          messages={messages}
          isTyping={isTyping}
          isLoading={isLoading}
        />

        {/* Quick Replies */}
        {quickReplies.length > 0 && (
          <QuickReplies
            replies={quickReplies}
            onReplyClick={handleQuickReply}
          />
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && messages.length === 1 && (
          <div className="chat-widget__suggestions">
            <h4 className="chat-widget__suggestions-title">
              Questions fréquentes :
            </h4>
            <div className="chat-widget__suggestions-list">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className="chat-widget__suggestion"
                  onClick={() => handleSendMessage(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-widget__footer">
        <MessageInput
          ref={inputRef}
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSendMessage}
          disabled={isLoading}
          placeholder="Tapez votre question..."
        />
        <div className="chat-widget__footer-info">
          <span className="chat-widget__powered-by">
            Propulsé par l'IA WiseBook
          </span>
        </div>
      </div>
    </div>
  );
};

// Icons components
const ChatIcon: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M8 10H8.01M12 10H12.01M16 10H16.01M9 16H5C4.46957 16 3.96086 15.7893 3.58579 15.4142C3.21071 15.0391 3 14.5304 3 14V6C3 5.46957 3.21071 4.96086 3.58579 4.58579C3.96086 4.21071 4.46957 4 5 4H19C19.5304 4 20.0391 4.21071 20.4142 4.58579C20.7893 4.96086 21 5.46957 21 6V14C21 14.5304 20.7893 15.0391 20.4142 15.4142C20.0391 15.7893 19.5304 16 19 16H13L9 20V16Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Icône supprimée - utilisation de lucide-react à la place

const WisebookLogo: React.FC = () => (
  <div className="wisebook-logo">
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#6A8A82"/>
      <path
        d="M8 12H24V20C24 21.1046 23.1046 22 22 22H10C8.89543 22 8 21.1046 8 20V12Z"
        fill="white"
        fillOpacity="0.9"
      />
      <path
        d="M10 10H22C23.1046 10 24 10.8954 24 12H8C8 10.8954 8.89543 10 10 10Z"
        fill="white"
      />
      <circle cx="12" cy="16" r="1" fill="#6A8A82"/>
      <circle cx="16" cy="16" r="1" fill="#6A8A82"/>
      <circle cx="20" cy="16" r="1" fill="#6A8A82"/>
    </svg>
  </div>
);

export default ChatWidget;