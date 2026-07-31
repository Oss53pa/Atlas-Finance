/**
 * Proph3t Avatar Component
 * Identité visuelle Proph3t (orbe) pour l'assistant virtuel.
 */

import React from 'react';

interface Proph3tAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isTyping?: boolean;
  className?: string;
  showName?: boolean;
}

export const Proph3tAvatar: React.FC<Proph3tAvatarProps> = ({
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
    <div className={`proph3t-avatar proph3t-avatar--${size} ${isTyping ? 'proph3t-avatar--typing' : ''} ${className}`}>
      <div className="proph3t-avatar__container proph3t-orb" style={{ width: avatarSize, height: avatarSize }}>
        <img
          src="/proph3t.png"
          alt="Proph3t"
          width={avatarSize}
          height={avatarSize}
          style={{ width: avatarSize, height: avatarSize, objectFit: 'contain' }}
        />

        {/* Indicateur de typing */}
        {isTyping && (
          <div className="proph3t-typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}
      </div>

      {/* Nom Proph3t */}
      {(showName || size === 'lg' || size === 'xl') && (
        <div className="proph3t-name">
          <span className="proph3t-name__text proph3t-font">Proph3t</span>
          <span className="proph3t-name__subtitle">Assistant Atlas Studio</span>
        </div>
      )}
    </div>
  );
};

export default Proph3tAvatar;
