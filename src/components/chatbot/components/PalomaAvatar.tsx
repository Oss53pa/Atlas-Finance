/**
 * Proph3t Avatar Component
 * Icône IA minimaliste pour l'assistant virtuel Proph3t
 */

import React from 'react';

interface PalomaAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isTyping?: boolean;
  className?: string;
  showName?: boolean;
}

export const PalomaAvatar: React.FC<PalomaAvatarProps> = ({
  size = 'md',
  isTyping = false,
  className = '',
  showName = false,
}) => {
  const sizeMap = {
    sm: 32,
    md: 48,
    lg: 64,
    xl: 80,
  };

  const avatarSize = sizeMap[size];

  return (
    <div className={`paloma-avatar paloma-avatar--${size} ${isTyping ? 'paloma-avatar--typing' : ''} ${className}`}>
      <div className="paloma-avatar__container" style={{ width: avatarSize, height: avatarSize }}>
        <svg
          width={avatarSize}
          height={avatarSize}
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Fond cercle dégradé */}
          <circle cx="40" cy="40" r="38" fill="url(#botGradient)" stroke="#FFFFFF" strokeWidth="2"/>

          <defs>
            <linearGradient id="botGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6A8A82" />
              <stop offset="100%" stopColor="#4A6A62" />
            </linearGradient>
          </defs>

          {/* Cerveau / Circuit IA */}
          <circle cx="40" cy="34" r="14" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.9"/>
          <circle cx="40" cy="34" r="8" fill="none" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.7"/>
          <circle cx="40" cy="34" r="3" fill="#FFFFFF" opacity="0.9">
            {isTyping && (
              <animate
                attributeName="r"
                values="3;5;3"
                dur="1s"
                repeatCount="indefinite"
              />
            )}
          </circle>

          {/* Connexions neuronales */}
          <line x1="40" y1="20" x2="40" y2="26" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.6"/>
          <line x1="40" y1="42" x2="40" y2="48" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.6"/>
          <line x1="26" y1="34" x2="32" y2="34" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.6"/>
          <line x1="48" y1="34" x2="54" y2="34" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.6"/>

          {/* Diagonales */}
          <line x1="30" y1="24" x2="34" y2="28" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.5"/>
          <line x1="50" y1="24" x2="46" y2="28" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.5"/>
          <line x1="30" y1="44" x2="34" y2="40" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.5"/>
          <line x1="50" y1="44" x2="46" y2="40" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.5"/>

          {/* Points de connexion */}
          <circle cx="40" cy="20" r="2" fill="#FFFFFF" opacity="0.7"/>
          <circle cx="40" cy="48" r="2" fill="#FFFFFF" opacity="0.7"/>
          <circle cx="26" cy="34" r="2" fill="#FFFFFF" opacity="0.7"/>
          <circle cx="54" cy="34" r="2" fill="#FFFFFF" opacity="0.7"/>

          {/* Label "AI" */}
          <text x="40" y="60" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold" fontFamily="sans-serif" opacity="0.9">
            AI
          </text>
        </svg>

        {/* Indicateur de typing */}
        {isTyping && (
          <div className="paloma-typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}
      </div>

      {/* Nom Proph3t */}
      {(showName || size === 'lg' || size === 'xl') && (
        <div className="paloma-name">
          <span className="paloma-name__text proph3t-font">Proph3t</span>
          <span className="paloma-name__subtitle">Assistante Atlas Studio</span>
        </div>
      )}
    </div>
  );
};

export default PalomaAvatar;
