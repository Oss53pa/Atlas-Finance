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
            h-4 w-4 rounded border-[#D9D9D9]
            text-[#6A8A82] focus:ring-[#6A8A82]
            transition-colors
            ${error ? 'border-[#B85450]' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {(label || helperText || error) && (
        <div className="ml-3">
          {label && (
            <label htmlFor={checkboxId} className="text-sm font-medium text-[#191919] cursor-pointer">
              {label}
            </label>
          )}
          {error && (
            <p className="text-sm text-[#B85450] mt-1">{error}</p>
          )}
          {helperText && !error && (
            <p className="text-sm text-[#767676] mt-1">{helperText}</p>
          )}
        </div>
      )}
    </div>
  );
};

Checkbox.displayName = 'Checkbox';