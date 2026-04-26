import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-[#404040] mb-1">
          {label}
        </label>
      )}

      <div className="relative">
        {Icon && iconPosition === 'left' && (
          <div className="absolute left-3 top-1/2 -tranprimary-y-1/2">
            <Icon className="h-5 w-5 text-[var(--color-text-tertiary)]" />
          </div>
        )}

        <input
          id={inputId}
          className={`
            w-full px-3 py-2 rounded-lg
            bg-white border border-[var(--color-border)]
            text-[var(--color-primary)] placeholder-[var(--color-text-tertiary)]
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent
            disabled:bg-[var(--color-border)] disabled:cursor-not-allowed
            ${error ? 'border-[#ef4444] focus:ring-[#ef4444]' : ''}
            ${Icon && iconPosition === 'left' ? 'pl-10' : ''}
            ${Icon && iconPosition === 'right' ? 'pr-10' : ''}
            ${className}
          `}
          {...props}
        />

        {Icon && iconPosition === 'right' && (
          <div className="absolute right-3 top-1/2 -tranprimary-y-1/2">
            <Icon className="h-5 w-5 text-[var(--color-text-tertiary)]" />
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-[#ef4444]">{error}</p>
      )}

      {helperText && !error && (
        <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">{helperText}</p>
      )}
    </div>
  );
};

Input.displayName = 'Input';