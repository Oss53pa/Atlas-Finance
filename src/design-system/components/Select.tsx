/**
 * WiseBook Design System - Select Component
 * Fully accessible select with validation and custom styling
 */

import React, { forwardRef, useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { cva, type VariantProps } from 'class-variance-authority';
import { theme } from '../theme';

// Select variants (reusing input styles)
const selectVariants = cva(
  [
    'w-full px-3 py-2 text-sm',
    'border border-neutral-300 rounded-md',
    'bg-white text-neutral-900',
    'transition-colors duration-200',
    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
    'disabled:bg-neutral-100 disabled:text-neutral-500 disabled:cursor-not-allowed',
    'appearance-none cursor-pointer',
  ],
  {
    variants: {
      state: {
        default: 'border-neutral-300 hover:border-neutral-400',
        error: 'border-red-500 focus:ring-red-500 focus:border-red-500',
        success: 'border-green-500 focus:ring-green-500 focus:border-green-500',
        warning: 'border-yellow-500 focus:ring-yellow-500 focus:border-yellow-500',
      },
      size: {
        sm: 'h-8 px-2 text-xs',
        md: 'h-10 px-3 text-sm',
        lg: 'h-12 px-4 text-base',
      },
    },
    defaultVariants: {
      state: 'default',
      size: 'md',
    },
  }
);

// Custom select variants (for the custom dropdown)
const customSelectVariants = cva(
  [
    'relative w-full',
  ]
);

const customSelectButtonVariants = cva(
  [
    'w-full px-3 py-2 text-sm text-left',
    'border border-neutral-300 rounded-md',
    'bg-white text-neutral-900',
    'transition-colors duration-200',
    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
    'disabled:bg-neutral-100 disabled:text-neutral-500 disabled:cursor-not-allowed',
    'cursor-pointer flex items-center justify-between',
  ],
  {
    variants: {
      state: {
        default: 'border-neutral-300 hover:border-neutral-400',
        error: 'border-red-500 focus:ring-red-500 focus:border-red-500',
        success: 'border-green-500 focus:ring-green-500 focus:border-green-500',
        warning: 'border-yellow-500 focus:ring-yellow-500 focus:border-yellow-500',
      },
      size: {
        sm: 'h-8 px-2 text-xs',
        md: 'h-10 px-3 text-sm',
        lg: 'h-12 px-4 text-base',
      },
      isOpen: {
        true: 'ring-2 ring-primary-500 border-primary-500',
        false: '',
      },
    },
    defaultVariants: {
      state: 'default',
      size: 'md',
      isOpen: false,
    },
  }
);

const customSelectDropdownVariants = cva(
  [
    'absolute z-50 w-full mt-1',
    'bg-white border border-neutral-300 rounded-md shadow-lg',
    'max-h-60 overflow-auto',
    'py-1',
  ]
);

const customSelectOptionVariants = cva(
  [
    'px-3 py-2 text-sm cursor-pointer',
    'transition-colors duration-150',
    'flex items-center justify-between',
  ],
  {
    variants: {
      isSelected: {
        true: 'bg-primary-500 text-white',
        false: 'text-neutral-900 hover:bg-neutral-100',
      },
      isHighlighted: {
        true: 'bg-primary-100 text-primary-900',
        false: '',
      },
    },
    defaultVariants: {
      isSelected: false,
      isHighlighted: false,
    },
  }
);

// Label and helper text variants (reuse from Input)
const labelVariants = cva([
  'block text-sm font-medium text-neutral-700 mb-1',
]);

const helperTextVariants = cva(
  ['text-xs mt-1'],
  {
    variants: {
      state: {
        default: 'text-neutral-600',
        error: 'text-red-600',
        success: 'text-green-600',
        warning: 'text-yellow-600',
      },
    },
    defaultVariants: {
      state: 'default',
    },
  }
);

// Icons
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const AlertIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

// Option interface
export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

// Native Select props
export interface NativeSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    VariantProps<typeof selectVariants> {
  /** Label text */
  label?: string;
  /** Helper text to display below the select */
  helperText?: string;
  /** Error message to display */
  error?: string;
  /** Success message to display */
  success?: string;
  /** Warning message to display */
  warning?: string;
  /** Whether the select is required */
  required?: boolean;
  /** Additional class for the container */
  containerClassName?: string;
  /** Additional class for the label */
  labelClassName?: string;
  /** Options for the select */
  options?: SelectOption[];
  /** Placeholder text */
  placeholder?: string;
}

// Custom Select props
export interface CustomSelectProps
  extends Omit<NativeSelectProps, 'onChange' | 'value' | 'defaultValue'> {
  /** Current value */
  value?: string | number;
  /** Default value */
  defaultValue?: string | number;
  /** Change handler */
  onChange?: (value: string | number) => void;
  /** Whether to use custom dropdown instead of native select */
  custom?: true;
  /** Search functionality */
  searchable?: boolean;
  /** Search placeholder */
  searchPlaceholder?: string;
}

export type SelectProps = NativeSelectProps | CustomSelectProps;

/**
 * Native Select component
 */
export const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  (
    {
      label,
      helperText,
      error,
      success,
      warning,
      required = false,
      className,
      containerClassName,
      labelClassName,
      state,
      size,
      options = [],
      placeholder,
      id,
      'aria-describedby': ariaDescribedBy,
      children,
      ...props
    },
    ref
  ) => {
    // Generate unique IDs for accessibility
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
    const helperTextId = `${selectId}-helper`;
    const errorId = `${selectId}-error`;

    // Determine the current state based on props
    const currentState = error ? 'error' : success ? 'success' : warning ? 'warning' : state || 'default';

    // Build aria-describedby
    const describedBy = [
      ariaDescribedBy,
      helperText && helperTextId,
      error && errorId,
    ].filter(Boolean).join(' ') || undefined;

    // State icon
    const getStateIcon = () => {
      if (currentState === 'success') return <CheckIcon className="w-4 h-4 text-green-500" />;
      if (currentState === 'error') return <AlertIcon className="w-4 h-4 text-red-500" />;
      if (currentState === 'warning') return <AlertIcon className="w-4 h-4 text-yellow-500" />;
      return null;
    };

    const stateIcon = getStateIcon();

    return (
      <div className={clsx('relative', containerClassName)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={selectId}
            className={clsx(labelVariants(), labelClassName)}
          >
            {label}
            {required && (
              <span className="text-red-500 ml-1" aria-label="required">
                *
              </span>
            )}
          </label>
        )}

        {/* Select Container */}
        <div className="relative">
          {/* Select */}
          <select
            ref={ref}
            id={selectId}
            className={clsx(
              selectVariants({ state: currentState, size }),
              stateIcon && 'pr-12',
              !stateIcon && 'pr-8',
              className
            )}
            aria-describedby={describedBy}
            aria-invalid={currentState === 'error'}
            aria-required={required}
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
            {children}
          </select>

          {/* Icons Container */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1 pointer-events-none">
            {/* State Icon */}
            {stateIcon && (
              <span aria-hidden="true">
                {stateIcon}
              </span>
            )}

            {/* Chevron Icon */}
            <ChevronDownIcon className="w-4 h-4 text-neutral-500" />
          </div>
        </div>

        {/* Helper Text / Error / Success / Warning */}
        {(helperText || error || success || warning) && (
          <div
            id={error ? errorId : helperTextId}
            className={helperTextVariants({ state: currentState })}
            role={error ? 'alert' : 'status'}
            aria-live={error ? 'assertive' : 'polite'}
          >
            {error || success || warning || helperText}
          </div>
        )}
      </div>
    );
  }
);

NativeSelect.displayName = 'NativeSelect';

/**
 * Custom Select component with enhanced functionality
 */
export const CustomSelect = forwardRef<HTMLButtonElement, CustomSelectProps>(
  (
    {
      label,
      helperText,
      error,
      success,
      warning,
      required = false,
      className,
      containerClassName,
      labelClassName,
      state,
      size,
      options = [],
      placeholder = 'Select an option...',
      value,
      defaultValue,
      onChange,
      searchable = false,
      searchPlaceholder = 'Search...',
      disabled = false,
      id,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [internalValue, setInternalValue] = useState(defaultValue || '');
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Use controlled or uncontrolled value
    const currentValue = value !== undefined ? value : internalValue;

    // Filter options based on search query
    const filteredOptions = searchable
      ? options.filter((option) =>
          option.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : options;

    // Find selected option
    const selectedOption = options.find((option) => option.value === currentValue);

    // Generate unique IDs for accessibility
    const selectId = id || `custom-select-${Math.random().toString(36).substr(2, 9)}`;
    const helperTextId = `${selectId}-helper`;
    const errorId = `${selectId}-error`;
    const listboxId = `${selectId}-listbox`;

    // Determine the current state based on props
    const currentState = error ? 'error' : success ? 'success' : warning ? 'warning' : state || 'default';

    // Build aria-describedby
    const describedBy = [
      ariaDescribedBy,
      helperText && helperTextId,
      error && errorId,
    ].filter(Boolean).join(' ') || undefined;

    // Handle option selection
    const handleSelect = (optionValue: string | number) => {
      if (value === undefined) {
        setInternalValue(optionValue);
      }
      onChange?.(optionValue);
      setIsOpen(false);
      setSearchQuery('');
      setHighlightedIndex(-1);
    };

    // Handle keyboard navigation
    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (disabled) return;

      switch (event.key) {
        case 'Enter':
        case ' ':
          if (!isOpen) {
            setIsOpen(true);
            event.preventDefault();
          } else if (highlightedIndex >= 0) {
            handleSelect(filteredOptions[highlightedIndex].value);
            event.preventDefault();
          }
          break;
        case 'Escape':
          if (isOpen) {
            setIsOpen(false);
            setSearchQuery('');
            setHighlightedIndex(-1);
            event.preventDefault();
          }
          break;
        case 'ArrowDown':
          event.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setHighlightedIndex((prev) =>
              prev < filteredOptions.length - 1 ? prev + 1 : 0
            );
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (isOpen) {
            setHighlightedIndex((prev) =>
              prev > 0 ? prev - 1 : filteredOptions.length - 1
            );
          }
          break;
      }
    };

    // Handle clicking outside to close dropdown
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          setSearchQuery('');
          setHighlightedIndex(-1);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [isOpen]);

    // Focus search input when dropdown opens
    useEffect(() => {
      if (isOpen && searchable && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, [isOpen, searchable]);

    // State icon
    const getStateIcon = () => {
      if (currentState === 'success') return <CheckIcon className="w-4 h-4 text-green-500" />;
      if (currentState === 'error') return <AlertIcon className="w-4 h-4 text-red-500" />;
      if (currentState === 'warning') return <AlertIcon className="w-4 h-4 text-yellow-500" />;
      return null;
    };

    const stateIcon = getStateIcon();

    return (
      <div className={clsx('relative', containerClassName)} ref={containerRef}>
        {/* Label */}
        {label && (
          <label
            htmlFor={selectId}
            className={clsx(labelVariants(), labelClassName)}
          >
            {label}
            {required && (
              <span className="text-red-500 ml-1" aria-label="required">
                *
              </span>
            )}
          </label>
        )}

        {/* Select Button */}
        <button
          ref={ref}
          id={selectId}
          type="button"
          className={clsx(
            customSelectButtonVariants({ state: currentState, size, isOpen }),
            className
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-describedby={describedBy}
          aria-invalid={currentState === 'error'}
          aria-required={required}
          aria-owns={isOpen ? listboxId : undefined}
          {...props}
        >
          <span className={clsx(
            'flex-1 text-left truncate',
            !selectedOption && 'text-neutral-500'
          )}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>

          <div className="flex items-center gap-1">
            {/* State Icon */}
            {stateIcon && (
              <span aria-hidden="true">
                {stateIcon}
              </span>
            )}

            {/* Chevron Icon */}
            <ChevronDownIcon
              className={clsx(
                'w-4 h-4 text-neutral-500 transition-transform duration-200',
                isOpen && 'transform rotate-180'
              )}
            />
          </div>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className={customSelectDropdownVariants()}>
            {/* Search Input */}
            {searchable && (
              <div className="p-2 border-b border-neutral-200">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setHighlightedIndex(-1);
                  }}
                  className="w-full px-2 py-1 text-sm border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            )}

            {/* Options */}
            <div
              role="listbox"
              id={listboxId}
              aria-label={label || 'Select options'}
            >
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-neutral-500">
                  No options found
                </div>
              ) : (
                filteredOptions.map((option, index) => (
                  <div
                    key={option.value}
                    role="option"
                    aria-selected={option.value === currentValue}
                    className={customSelectOptionVariants({
                      isSelected: option.value === currentValue,
                      isHighlighted: index === highlightedIndex && option.value !== currentValue,
                    })}
                    onClick={() => !option.disabled && handleSelect(option.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <span className="flex-1">{option.label}</span>
                    {option.value === currentValue && (
                      <CheckIcon className="w-4 h-4" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Helper Text / Error / Success / Warning */}
        {(helperText || error || success || warning) && (
          <div
            id={error ? errorId : helperTextId}
            className={helperTextVariants({ state: currentState })}
            role={error ? 'alert' : 'status'}
            aria-live={error ? 'assertive' : 'polite'}
          >
            {error || success || warning || helperText}
          </div>
        )}
      </div>
    );
  }
);

CustomSelect.displayName = 'CustomSelect';

/**
 * Select component that can render as native or custom
 */
export const Select = forwardRef<HTMLSelectElement | HTMLButtonElement, SelectProps>(
  (props, ref) => {
    if ('custom' in props && props.custom) {
      return <CustomSelect {...props} ref={ref as React.RefObject<HTMLButtonElement>} />;
    }
    return <NativeSelect {...(props as NativeSelectProps)} ref={ref as React.RefObject<HTMLSelectElement>} />;
  }
);

Select.displayName = 'Select';

// Export select variants for external use
export { selectVariants, customSelectVariants, labelVariants, helperTextVariants };