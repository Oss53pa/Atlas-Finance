/**
 * Paloma Avatar Component
 * Avatar de l'assistante virtuelle Paloma - Jeune fille africaine
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
          {/* Fond cercle */}
          <circle cx="40" cy="40" r="38" fill="url(#gradient)" stroke="#FFFFFF" strokeWidth="2"/>

          {/* Dégradé de fond */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6A8A82" />
              <stop offset="100%" stopColor="#4A6A62" />
            </linearGradient>

            {/* Dégradé pour la peau */}
            <linearGradient id="skinGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#8B4513" />
              <stop offset="100%" stopColor="#A0522D" />
            </linearGradient>
          </defs>

          {/* Cheveux - Coiffure afro */}
          <ellipse cx="40" cy="28" rx="22" ry="20" fill="#1C1C1C"/>
          <ellipse cx="30" cy="26" rx="14" ry="16" fill="#1C1C1C"/>
          <ellipse cx="50" cy="26" rx="14" ry="16" fill="#1C1C1C"/>
          <ellipse cx="40" cy="22" rx="18" ry="16" fill="#1C1C1C"/>

          {/* Accessoire cheveux - Bandeau coloré */}
          <rect x="20" y="20" width="40" height="4" fill="#B87333" rx="2"/>
          <circle cx="25" cy="22" r="2" fill="#FFD700"/>

          {/* Visage */}
          <ellipse cx="40" cy="40" rx="18" ry="20" fill="url(#skinGradient)"/>

          {/* Oreilles */}
          <ellipse cx="22" cy="40" rx="5" ry="8" fill="#8B4513"/>
          <ellipse cx="58" cy="40" rx="5" ry="8" fill="#8B4513"/>

          {/* Boucles d'oreilles */}
          <circle cx="22" cy="45" r="3" fill="#FFD700" stroke="#FFA500" strokeWidth="1"/>
          <circle cx="58" cy="45" r="3" fill="#FFD700" stroke="#FFA500" strokeWidth="1"/>

          {/* Yeux */}
          <ellipse cx="33" cy="38" rx="5" ry="6" fill="#FFFFFF"/>
          <ellipse cx="47" cy="38" rx="5" ry="6" fill="#FFFFFF"/>

          {/* Pupilles avec animation si typing */}
          <circle cx="33" cy="38" r="4" fill="#4A2C2A">
            {isTyping && (
              <animate
                attributeName="cy"
                values="38;36;38"
                dur="0.8s"
                repeatCount="indefinite"
              />
            )}
          </circle>
          <circle cx="47" cy="38" r="4" fill="#4A2C2A">
            {isTyping && (
              <animate
                attributeName="cy"
                values="38;36;38"
                dur="0.8s"
                repeatCount="indefinite"
              />
            )}
          </circle>

          {/* Reflets dans les yeux */}
          <circle cx="34" cy="37" r="1.5" fill="#FFFFFF" opacity="0.9"/>
          <circle cx="48" cy="37" r="1.5" fill="#FFFFFF" opacity="0.9"/>

          {/* Sourcils */}
          <path d="M 28 32 Q 33 30 38 32" stroke="#1C1C1C" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          <path d="M 42 32 Q 47 30 52 32" stroke="#1C1C1C" strokeWidth="1.5" fill="none" strokeLinecap="round"/>

          {/* Nez */}
          <path d="M 40 40 L 38 44 Q 40 45 42 44 Z" fill="#7B3F00" opacity="0.3"/>

          {/* Bouche souriante */}
          {isTyping ? (
            <ellipse cx="40" cy="50" rx="8" ry="4" fill="#8B2252">
              <animate
                attributeName="ry"
                values="4;6;4"
                dur="0.5s"
                repeatCount="indefinite"
              />
            </ellipse>
          ) : (
            <>
              <path d="M 32 48 Q 40 54 48 48" stroke="#8B2252" strokeWidth="2" fill="none" strokeLinecap="round"/>
              <path d="M 32 48 Q 40 52 48 48" fill="#D4A574" opacity="0.3"/>
            </>
          )}

          {/* Joues rosées */}
          <ellipse cx="25" cy="44" rx="4" ry="3" fill="#D4A574" opacity="0.3"/>
          <ellipse cx="55" cy="44" rx="4" ry="3" fill="#D4A574" opacity="0.3"/>

          {/* Cou et épaules */}
          <rect x="35" y="55" width="10" height="10" fill="#8B4513" rx="2"/>
          <path d="M 25 65 Q 40 70 55 65 L 55 80 L 25 80 Z" fill="#6A8A82" opacity="0.8"/>

          {/* Collier */}
          <ellipse cx="40" cy="62" rx="12" ry="4" fill="none" stroke="#FFD700" strokeWidth="1.5"/>
          <circle cx="40" cy="64" r="2" fill="#FFD700"/>
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

      {/* Nom Paloma bien visible */}
      {(showName || size === 'lg' || size === 'xl') && (
        <div className="paloma-name">
          <span className="paloma-name__text">Paloma</span>
          <span className="paloma-name__subtitle">Assistante WiseBook</span>
        </div>
      )}
    </div>
  );
};

export default PalomaAvatar;