/**
 * MessageInput Component
 * Zone de saisie des messages avec fonctionnalités avancées
 */

import React, { useState, forwardRef, useImperativeHandle, useRef } from 'react';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

export const MessageInput = forwardRef<HTMLInputElement, MessageInputProps>(({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = "Tapez votre message...",
  maxLength = 500
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => inputRef.current!);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !disabled) {
      onSend(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= maxLength) {
      onChange(newValue);
    }
  };

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <div className={`message-input__container ${isFocused ? 'message-input__container--focused' : ''}`}>
        <div className="message-input__field">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            placeholder={placeholder}
            maxLength={maxLength}
            className="message-input__input"
            aria-label="Tapez votre message"
            autoComplete="off"
          />

          {/* Compteur de caractères */}
          {value.length > maxLength * 0.8 && (
            <div className="message-input__counter">
              <span className={value.length >= maxLength ? 'text-red-500' : 'text-gray-500'}>
                {value.length}/{maxLength}
              </span>
            </div>
          )}
        </div>

        {/* Bouton d'envoi */}
        <button
          type="submit"
          disabled={!canSend}
          className={`message-input__send ${canSend ? 'message-input__send--active' : 'message-input__send--disabled'}`}
          aria-label="Envoyer le message"
          title="Envoyer (Entrée)"
        >
          {disabled ? (
            <LoadingIcon />
          ) : (
            <SendIcon active={canSend} />
          )}
        </button>
      </div>

      {/* Suggestions de saisie */}
      <MessageSuggestions onSuggestionClick={onChange} />
    </form>
  );
});

MessageInput.displayName = 'MessageInput';

// Composant pour les suggestions de saisie
const MessageSuggestions: React.FC<{ onSuggestionClick: (text: string) => void }> = ({
  onSuggestionClick
}) => {
  const suggestions = [
    "Comment créer un budget ?",
    "Où voir mes stocks ?",
    "Aide utilisateurs",
    "Problème technique"
  ];

  return (
    <div className="message-suggestions">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          type="button"
          className="message-suggestion"
          onClick={() => onSuggestionClick(suggestion)}
          title={`Cliquer pour écrire: ${suggestion}`}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
};

// Icônes
const SendIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`send-icon ${active ? 'send-icon--active' : ''}`}
  >
    <path
      d="M22 2L11 13"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M22 2L15 22L11 13L2 9L22 2Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LoadingIcon: React.FC = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="loading-icon"
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeDasharray="60"
      strokeDashoffset="60"
    >
      <animateTransform
        attributeName="transform"
        attributeType="XML"
        type="rotate"
        dur="1s"
        from="0 12 12"
        to="360 12 12"
        repeatCount="indefinite"
      />
    </circle>
  </svg>
);

export default MessageInput;