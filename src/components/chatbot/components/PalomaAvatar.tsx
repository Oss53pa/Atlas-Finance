/**
 * Paloma Avatar Component
 * Avatar du robot assistant Paloma
 */

import React from 'react';

interface PalomaAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  isTyping?: boolean;
  className?: string;
}

export const PalomaAvatar: React.FC<PalomaAvatarProps> = ({
  size = 'md',
  isTyping = false,
  className = '',
}) => {
  const sizeMap = {
    sm: 24,
    md: 32,
    lg: 48,
  };

  const avatarSize = sizeMap[size];

  return (
    <div className={`paloma-avatar paloma-avatar--${size} ${isTyping ? 'paloma-avatar--typing' : ''} ${className}`}>
      <svg
        width={avatarSize}
        height={avatarSize}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Corps du robot */}
        <circle cx="32" cy="32" r="28" fill="#6A8A82" stroke="#5A7A72" strokeWidth="2"/>

        {/* Reflet métallique */}
        <ellipse cx="26" cy="22" rx="12" ry="8" fill="rgba(255,255,255,0.2)"/>

        {/* Antennes */}
        <line x1="22" y1="8" x2="22" y2="14" stroke="#B87333" strokeWidth="2" strokeLinecap="round"/>
        <line x1="42" y1="8" x2="42" y2="14" stroke="#B87333" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="22" cy="8" r="2" fill="#F59E0B"/>
        <circle cx="42" cy="8" r="2" fill="#F59E0B"/>

        {/* Yeux */}
        <circle cx="24" cy="26" r="4" fill="#FFFFFF"/>
        <circle cx="40" cy="26" r="4" fill="#FFFFFF"/>

        {/* Pupilles - animées si en train de taper */}
        <circle cx="24" cy="26" r="2" fill="#1A202C">
          {isTyping && (
            <animateTransform
              attributeName="transform"
              attributeType="XML"
              type="translate"
              values="0,0; 1,0; -1,0; 0,0"
              dur="2s"
              repeatCount="indefinite"
            />
          )}
        </circle>
        <circle cx="40" cy="26" r="2" fill="#1A202C">
          {isTyping && (
            <animateTransform
              attributeName="transform"
              attributeType="XML"
              type="translate"
              values="0,0; -1,0; 1,0; 0,0"
              dur="2s"
              repeatCount="indefinite"
            />
          )}
        </circle>

        {/* Reflets dans les yeux */}
        <circle cx="25" cy="25" r="1" fill="#FFFFFF" opacity="0.8"/>
        <circle cx="41" cy="25" r="1" fill="#FFFFFF" opacity="0.8"/>

        {/* Bouche - change selon l'état */}
        {isTyping ? (
          // Bouche qui bouge pendant qu'elle tape
          <ellipse cx="32" cy="40" rx="6" ry="3" fill="#1A202C">
            <animate
              attributeName="ry"
              values="3;5;3"
              dur="1s"
              repeatCount="indefinite"
            />
          </ellipse>
        ) : (
          // Sourire normal
          <path
            d="M 26 38 Q 32 44 38 38"
            stroke="#1A202C"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        )}

        {/* Détails technologiques */}
        <rect x="16" y="48" width="32" height="4" rx="2" fill="#B87333" opacity="0.7"/>
        <circle cx="20" cy="50" r="1" fill="#F59E0B"/>
        <circle cx="32" cy="50" r="1" fill="#10B981"/>
        <circle cx="44" cy="50" r="1" fill="#EF4444"/>

        {/* Badge WiseBook */}
        <rect x="28" y="54" width="8" height="6" rx="1" fill="#FFFFFF" opacity="0.9"/>
        <text x="32" y="58" textAnchor="middle" fontSize="3" fill="#6A8A82" fontWeight="bold">WB</text>
      </svg>

      {/* Nom de Paloma */}
      {size === 'lg' && (
        <div className="paloma-name">
          <span className="paloma-name__text">Paloma</span>
          <span className="paloma-name__subtitle">Assistant WiseBook</span>
        </div>
      )}
    </div>
  );
};

export default PalomaAvatar;