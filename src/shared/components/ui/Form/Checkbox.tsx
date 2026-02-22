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
            h-4 w-4 rounded border-[#d4d4d4]
            text-[#171717] focus:ring-[#171717]
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
            <label htmlFor={checkboxId} className="text-sm font-medium text-[#171717] cursor-pointer">
              {label}
            </label>
          )}
          {error && (
            <p className="text-sm text-[#ef4444] mt-1">{error}</p>
          )}
          {helperText && !error && (
            <p className="text-sm text-[#737373] mt-1">{helperText}</p>
          )}
        </div>
      )}
    </div>
  );
};

Checkbox.displayName = 'Checkbox';