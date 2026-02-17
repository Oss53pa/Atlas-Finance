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
        <label htmlFor={textareaId} className="block text-sm font-medium text-[#444444] mb-1">
          {label}
        </label>
      )}

      <textarea
        id={textareaId}
        className={`
          w-full px-3 py-2 rounded-lg
          bg-white border border-[#D9D9D9]
          text-[#191919] placeholder-[#767676]
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent
          disabled:bg-[#ECECEC] disabled:cursor-not-allowed
          ${error ? 'border-[#B85450] focus:ring-[#B85450]' : ''}
          ${resizeClass}
          ${className}
        `}
        {...props}
      />

      {error && (
        <p className="mt-1 text-sm text-[#B85450]">{error}</p>
      )}

      {helperText && !error && (
        <p className="mt-1 text-sm text-[#767676]">{helperText}</p>
      )}
    </div>
  );
};

Textarea.displayName = 'Textarea';