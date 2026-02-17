/**
 * MessageList Component
 * Affiche la liste des messages du chat avec animations
 */

import React from 'react';
import { ChatMessage } from '../types';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';

interface MessageListProps {
  messages: ChatMessage[];
  isTyping: boolean;
  isLoading: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isTyping,
  isLoading,
}) => {
  return (
    <div className="message-list" role="log" aria-live="polite" aria-label="Conversation">
      <div className="message-list__content">
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            isLatest={index === messages.length - 1}
            animationDelay={index * 50}
          />
        ))}

        {isTyping && (
          <div className="message-list__typing">
            <TypingIndicator />
          </div>
        )}

        {isLoading && !isTyping && (
          <div className="message-list__loading">
            <div className="message-bubble message-bubble--assistant">
              <div className="message-bubble__content">
                <div className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageList;