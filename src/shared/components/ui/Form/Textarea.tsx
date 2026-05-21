import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  helperText,
  fullWidth = false,
  resize = 'vertical',
  className = '',
  id,
  ...props
}) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

  const resizeClass = {
    none: 'resize-none',
    vertical: 'resize-y',
    horizontal: 'resize-x',
    both: 'resize',
  }[resize];

  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-medium text-[#404040] mb-1">
          {label}
        </label>
      )}

      <textarea
        id={textareaId}
        className={`
          w-full px-3 py-2 rounded-lg
          bg-white border border-[var(--color-border)]
          text-[var(--color-primary)] placeholder-[var(--color-text-tertiary)]
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent
          disabled:bg-[var(--color-border)] disabled:cursor-not-allowed
          ${error ? 'border-[#C0322B] focus:ring-[#C0322B]' : ''}
          ${resizeClass}
          ${className}
        `}
        {...props}
      />

      {error && (
        <p className="mt-1 text-sm text-[#C0322B]">{error}</p>
      )}

      {helperText && !error && (
        <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">{helperText}</p>
      )}
    </div>
  );
};

Textarea.displayName = 'Textarea';