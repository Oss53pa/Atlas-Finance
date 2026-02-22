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
          bg-white border border-[#d4d4d4]
          text-[#171717] placeholder-[#737373]
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent
          disabled:bg-[#e5e5e5] disabled:cursor-not-allowed
          ${error ? 'border-[#ef4444] focus:ring-[#ef4444]' : ''}
          ${resizeClass}
          ${className}
        `}
        {...props}
      />

      {error && (
        <p className="mt-1 text-sm text-[#ef4444]">{error}</p>
      )}

      {helperText && !error && (
        <p className="mt-1 text-sm text-[#737373]">{helperText}</p>
      )}
    </div>
  );
};

Textarea.displayName = 'Textarea';