/**
 * QuickReplies Component
 * Boutons de réponses rapides intelligentes
 */

import React from 'react';

interface QuickRepliesProps {
  replies: string[];
  onReplyClick: (reply: string) => void;
  className?: string;
}

export const QuickReplies: React.FC<QuickRepliesProps> = ({
  replies,
  onReplyClick,
  className = '',
}) => {
  if (replies.length === 0) return null;

  return (
    <div className={`quick-replies ${className}`} role="group" aria-label="Réponses rapides">
      <div className="quick-replies__label">
        <span>Réponses rapides :</span>
      </div>
      <div className="quick-replies__list">
        {replies.map((reply, index) => (
          <button
            key={index}
            className="quick-reply"
            onClick={() => onReplyClick(reply)}
            type="button"
            title={`Cliquer pour envoyer: ${reply}`}
          >
            <span className="quick-reply__text">{reply}</span>
            <span className="quick-reply__icon">
              <ChevronRightIcon />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

const ChevronRightIcon: React.FC = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M9 18L15 12L9 6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default QuickReplies;