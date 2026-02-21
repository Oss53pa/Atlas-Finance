/**
 * MessageBubble Component
 * Bulle de message individuelle avec actions et animations
 */

import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import { ChatMessage, ChatAction } from '../types';
import { PalomaAvatar } from './PalomaAvatar';

interface MessageBubbleProps {
  message: ChatMessage;
  isLatest: boolean;
  animationDelay: number;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isLatest,
  animationDelay,
}) => {
  const [isActionExecuting, setIsActionExecuting] = useState<string | null>(null);

  const handleActionClick = async (action: ChatAction) => {
    setIsActionExecuting(action.type);

    try {
      switch (action.type) {
        case 'navigate':
          if (action.payload.route) {
            window.location.href = action.payload.route;
          }
          break;

        case 'copy-text':
          if (navigator.clipboard && action.payload.text) {
            await navigator.clipboard.writeText(action.payload.text);
            // Notification visuelle de succès
            setTimeout(() => setIsActionExecuting(null), 1000);
          }
          break;

        case 'open-modal':
          // À implémenter selon le système de modales
          break;

        case 'external-link':
          if (action.payload.url) {
            window.open(action.payload.url, '_blank');
          }
          break;

        case 'download':
          if (action.payload.file) {
            // Télécharger le fichier
            const link = document.createElement('a');
            link.href = action.payload.file;
            link.download = action.payload.filename || 'download';
            link.click();
          }
          break;
      }
    } catch (error) {
      console.error('Erreur lors de l\'exécution de l\'action:', error);
    } finally {
      setTimeout(() => setIsActionExecuting(null), 500);
    }
  };

  const formatMessageContent = (content: string) => {
    // Supporter le markdown simple
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  };

  const getActionIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      navigate: '→',
      'copy-text': '📋',
      'open-modal': '🔍',
      'external-link': '🔗',
      download: '📥'
    };
    return icons[type] || '⚡';
  };

  return (
    <div
      className={`message-bubble message-bubble--${message.sender} ${isLatest ? 'message-bubble--latest' : ''}`}
      style={{
        animationDelay: `${animationDelay}ms`
      }}
    >
      {message.sender === 'assistant' && (
        <div className="message-bubble__avatar">
          <PalomaAvatar size="sm" />
        </div>
      )}

      <div className="message-bubble__content">
        <div
          className="message-bubble__text"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(formatMessageContent(message.content), {
              ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p', 'ul', 'li', 'ol', 'code', 'pre', 'a'],
              ALLOWED_ATTR: ['href', 'target', 'class'],
            })
          }}
        />

        {/* Confidence indicator pour les réponses de l'assistant */}
        {message.sender === 'assistant' && message.metadata?.confidence && (
          <div className="message-bubble__confidence">
            <div
              className="confidence-bar"
              style={{
                width: `${message.metadata.confidence * 100}%`,
                backgroundColor: getConfidenceColor(message.metadata.confidence)
              }}
            />
          </div>
        )}

        {/* Actions disponibles */}
        {message.metadata?.actions && message.metadata.actions.length > 0 && (
          <div className="message-bubble__actions">
            {message.metadata.actions.map((action, index) => (
              <button
                key={index}
                className={`action-button action-button--${action.type} ${
                  isActionExecuting === action.type ? 'action-button--executing' : ''
                }`}
                onClick={() => handleActionClick(action)}
                disabled={!!isActionExecuting}
                title={action.label}
              >
                <span className="action-button__icon">
                  {isActionExecuting === action.type ? (
                    <LoadingSpinner />
                  ) : (
                    getActionIcon(action.type)
                  )}
                </span>
                <span className="action-button__label">{action.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <div className="message-bubble__timestamp">
          {message.timestamp.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
          })}
          {message.metadata?.source && (
            <span className="message-bubble__source">
              • {getSourceLabel(message.metadata.source)}
            </span>
          )}
        </div>
      </div>

      {message.sender === 'user' && (
        <div className="message-bubble__avatar">
          <UserAvatar />
        </div>
      )}
    </div>
  );
};

// Composants d'icônes
const WisebookAvatar: React.FC = () => (
  <div className="avatar avatar--assistant">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#6A8A82"/>
      <path
        d="M6 9H18V15C18 15.5523 17.5523 16 17 16H7C6.44772 16 6 15.5523 6 15V9Z"
        fill="white"
        fillOpacity="0.9"
      />
      <path
        d="M7 7H17C17.5523 7 18 7.44772 18 8H6C6 7.44772 6.44772 7 7 7Z"
        fill="white"
      />
      <circle cx="9" cy="12" r="0.75" fill="#6A8A82"/>
      <circle cx="12" cy="12" r="0.75" fill="#6A8A82"/>
      <circle cx="15" cy="12" r="0.75" fill="#6A8A82"/>
    </svg>
  </div>
);

const UserAvatar: React.FC = () => (
  <div className="avatar avatar--user">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#E5E7EB"/>
      <circle cx="12" cy="10" r="3" fill="#9CA3AF"/>
      <path
        d="M7 18.2C7 16.4 8.9 15 12 15C15.1 15 17 16.4 17 18.2"
        stroke="#9CA3AF"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  </div>
);

const LoadingSpinner: React.FC = () => (
  <div className="loading-spinner">
    <div className="spinner"></div>
  </div>
);

// Fonctions utilitaires
function getConfidenceColor(confidence: number): string {
  if (confidence > 0.8) return '#10B981'; // Vert
  if (confidence > 0.6) return '#F59E0B'; // Orange
  return '#EF4444'; // Rouge
}

function getSourceLabel(source: string): string {
  const labels: { [key: string]: string } = {
    'knowledge-base': 'Base de connaissances',
    'ai': 'IA',
    'fallback': 'Réponse générique',
    'system': 'Système',
    'error': 'Erreur'
  };
  return labels[source] || source;
}

export default MessageBubble;