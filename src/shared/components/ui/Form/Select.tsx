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
        <label htmlFor={selectId} className="block text-sm font-medium text-[#444444] mb-1">
          {label}
        </label>
      )}

      <select
        id={selectId}
        className={`
          w-full px-3 py-2 rounded-lg
          bg-white border border-[#D9D9D9]
          text-[#191919]
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent
          disabled:bg-[#ECECEC] disabled:cursor-not-allowed
          ${error ? 'border-[#B85450] focus:ring-[#B85450]' : ''}
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
        <p className="mt-1 text-sm text-[#B85450]">{error}</p>
      )}

      {helperText && !error && (
        <p className="mt-1 text-sm text-[#767676]">{helperText}</p>
      )}
    </div>
  );
};

Select.displayName = 'Select';