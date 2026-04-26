import React from 'react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  helperText,
  error,
  className = '',
  id,
  ...props
}) => {
  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="flex items-start">
      <div className="flex items-center h-5">
        <input
          id={checkboxId}
          type="checkbox"
          className={`
            h-4 w-4 rounded border-[var(--color-border)]
            text-[var(--color-primary)] focus:ring-[var(--color-primary)]
            transition-colors
            ${error ? 'border-[#ef4444]' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {(label || helperText || error) && (
        <div className="ml-3">
          {label && (
            <label htmlFor={checkboxId} className="text-sm font-medium text-[var(--color-primary)] cursor-pointer">
              {label}
            </label>
          )}
          {error && (
            <p className="text-sm text-[#ef4444] mt-1">{error}</p>
          )}
          {helperText && !error && (
            <p className="text-sm text-[var(--color-text-tertiary)] mt-1">{helperText}</p>
          )}
        </div>
      )}
    </div>
  );
};

Checkbox.displayName = 'Checkbox';