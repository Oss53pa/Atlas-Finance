import React from 'react';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  helperText,
  options,
  placeholder,
  fullWidth = false,
  className = '',
  id,
  ...props
}) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-[#404040] mb-1">
          {label}
        </label>
      )}

      <select
        id={selectId}
        className={`
          w-full px-3 py-2 rounded-lg
          bg-white border border-[#d4d4d4]
          text-[#171717]
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent
          disabled:bg-[#e5e5e5] disabled:cursor-not-allowed
          ${error ? 'border-[#ef4444] focus:ring-[#ef4444]' : ''}
          ${className}
        `}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>

      {error && (
        <p className="mt-1 text-sm text-[#ef4444]">{error}</p>
      )}

      {helperText && !error && (
        <p className="mt-1 text-sm text-[#737373]">{helperText}</p>
      )}
    </div>
  );
};

Select.displayName = 'Select';