/**
 * TypingIndicator Component
 * Indicateur animé quand l'assistant écrit
 */

import React from 'react';
import { PalomaAvatar } from './PalomaAvatar';

export const TypingIndicator: React.FC = () => {
  return (
    <div className="typing-indicator" role="status" aria-label="L'assistant est en train d'écrire">
      <div className="message-bubble message-bubble--assistant message-bubble--typing">
        <div className="message-bubble__avatar">
          <PalomaAvatar size="sm" isTyping={true} />
        </div>
        <div className="message-bubble__content">
          <div className="typing-animation">
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
          </div>
          <div className="typing-text">
            Proph3t réfléchit...
          </div>
        </div>
      </div>
    </div>
  );
};

const WisebookAvatar: React.FC = () => (
  <div className="avatar avatar--assistant avatar--typing">
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
      {/* Points animés pour indiquer l'activité */}
      <circle cx="9" cy="12" r="0.75" fill="#6A8A82">
        <animate
          attributeName="opacity"
          values="0.3;1;0.3"
          dur="1.5s"
          repeatCount="indefinite"
          begin="0s"
        />
      </circle>
      <circle cx="12" cy="12" r="0.75" fill="#6A8A82">
        <animate
          attributeName="opacity"
          values="0.3;1;0.3"
          dur="1.5s"
          repeatCount="indefinite"
          begin="0.5s"
        />
      </circle>
      <circle cx="15" cy="12" r="0.75" fill="#6A8A82">
        <animate
          attributeName="opacity"
          values="0.3;1;0.3"
          dur="1.5s"
          repeatCount="indefinite"
          begin="1s"
        />
      </circle>
    </svg>
  </div>
);

export default TypingIndicator;