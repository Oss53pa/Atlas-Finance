/**
 * Atlas Finance Design System - Radio Component
 * Fully accessible radio button with validation and custom styling
 */

import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { cva, type VariantProps } from 'class-variance-authority';
import { theme } from '../theme';

// Radio variants
const radioVariants = cva(
  [
    'peer h-4 w-4 shrink-0 rounded-full border border-neutral-300',
    'bg-white text-primary-500',
    'transition-colors duration-200',
    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'checked:bg-primary-500 checked:border-primary-500',
  ],
  {
    variants: {
      state: {
        default: 'border-neutral-300',
        error: 'border-red-500 focus:ring-red-500',
        success: 'border-green-500 focus:ring-green-500',
        warning: 'border-yellow-500 focus:ring-yellow-500',
      },
      size: {
        sm: 'h-3 w-3',
        md: 'h-4 w-4',
        lg: 'h-5 w-5',
      },
    },
    defaultVariants: {
      state: 'default',
      size: 'md',
    },
  }
);

// Label variants
const labelVariants = cva(
  [
    'text-sm font-medium text-neutral-700 select-none cursor-pointer',
    'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
  ],
  {
    variants: {
      size: {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

// Helper text variants
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

// Container variants
const containerVariants = cva(['flex items-start gap-2']);

// Radio dot icon
const RadioDotIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 16 16"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="8" cy="8" r="3" />
  </svg>
);

// Radio component props
export interface RadioProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'>,
    VariantProps<typeof radioVariants> {
  /** Label text */
  label?: string;
  /** Helper text to display below the radio */
  helperText?: string;
  /** Error message to display */
  error?: string;
  /** Success message to display */
  success?: string;
  /** Warning message to display */
  warning?: string;
  /** Additional class for the container */
  containerClassName?: string;
  /** Additional class for the label */
  labelClassName?: string;
  /** Additional class for the radio wrapper */
  radioWrapperClassName?: string;
}

/**
 * Radio component with comprehensive validation and accessibility
 *
 * Features:
 * - Multiple states (default, error, success, warning)
 * - Multiple sizes (sm, md, lg)
 * - Built-in validation feedback
 * - Full accessibility support
 * - Keyboard navigation
 * - Screen reader support
 * - Custom styling
 *
 * @example
 * ```tsx
 * <Radio
 *   name="payment"
 *   value="credit"
 *   label="Credit Card"
 *   helperText="Pay with your credit card"
 * />
 * ```
 */
export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      label,
      helperText,
      error,
      success,
      warning,
      className,
      containerClassName,
      labelClassName,
      radioWrapperClassName,
      state,
      size,
      id,
      disabled,
      checked,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    // Generate unique IDs for accessibility
    const radioId = id || `radio-${Math.random().toString(36).substr(2, 9)}`;
    const helperTextId = `${radioId}-helper`;
    const errorId = `${radioId}-error`;

    // Determine the current state based on props
    const currentState = error ? 'error' : success ? 'success' : warning ? 'warning' : state || 'default';

    // Build aria-describedby
    const describedBy = [
      ariaDescribedBy,
      helperText && helperTextId,
      error && errorId,
    ].filter(Boolean).join(' ') || undefined;

    return (
      <div className={clsx(containerVariants(), containerClassName)}>
        {/* Radio Container */}
        <div className={clsx('relative flex items-center', radioWrapperClassName)}>
          {/* Hidden Radio Input */}
          <input
            ref={ref}
            type="radio"
            id={radioId}
            className={clsx(
              radioVariants({ state: currentState, size }),
              className
            )}
            disabled={disabled}
            checked={checked}
            aria-describedby={describedBy}
            aria-invalid={currentState === 'error'}
            {...props}
          />

          {/* Custom Radio Dot */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {checked && (
              <RadioDotIcon
                className={clsx(
                  'text-white',
                  size === 'sm' && 'w-1.5 h-1.5',
                  size === 'md' && 'w-2 h-2',
                  size === 'lg' && 'w-2.5 h-2.5'
                )}
              />
            )}
          </div>
        </div>

        {/* Label and Helper Text Container */}
        {(label || helperText || error || success || warning) && (
          <div className="flex-1 min-w-0">
            {/* Label */}
            {label && (
              <label
                htmlFor={radioId}
                className={clsx(
                  labelVariants({ size }),
                  labelClassName
                )}
              >
                {label}
              </label>
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
        )}
      </div>
    );
  }
);

Radio.displayName = 'Radio';

// Radio Group component for multiple radio buttons
export interface RadioOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  helperText?: string;
}

export interface RadioGroupProps extends VariantProps<typeof radioVariants> {
  /** Group label */
  label?: string;
  /** Helper text for the group */
  helperText?: string;
  /** Error message for the group */
  error?: string;
  /** Success message for the group */
  success?: string;
  /** Warning message for the group */
  warning?: string;
  /** Current selected value */
  value?: string | number;
  /** Default selected value */
  defaultValue?: string | number;
  /** Change handler */
  onChange?: (value: string | number) => void;
  /** Name attribute for all radio buttons */
  name: string;
  /** Radio options */
  options?: RadioOption[];
  /** Children radio buttons */
  children?: React.ReactNode;
  /** Additional class for the container */
  className?: string;
  /** Additional class for the label */
  labelClassName?: string;
  /** Whether the group is required */
  required?: boolean;
  /** Whether the group is disabled */
  disabled?: boolean;
  /** Layout direction */
  direction?: 'vertical' | 'horizontal';
}

/**
 * Radio Group component for managing multiple radio buttons
 *
 * @example
 * ```tsx
 * <RadioGroup
 *   label="Payment method"
 *   name="payment"
 *   value={paymentMethod}
 *   onChange={setPaymentMethod}
 *   error={errors.payment}
 *   options={[
 *     { value: 'credit', label: 'Credit Card' },
 *     { value: 'debit', label: 'Debit Card' },
 *     { value: 'paypal', label: 'PayPal' },
 *   ]}
 * />
 * ```
 */
export const RadioGroup: React.FC<RadioGroupProps> = ({
  label,
  helperText,
  error,
  success,
  warning,
  value,
  defaultValue,
  onChange,
  name,
  options = [],
  children,
  className,
  labelClassName,
  state,
  size,
  required = false,
  disabled = false,
  direction = 'vertical',
}) => {
  const [internalValue, setInternalValue] = React.useState<string | number | undefined>(defaultValue);

  // Use controlled or uncontrolled value
  const currentValue = value !== undefined ? value : internalValue;

  // Generate unique IDs for accessibility
  const groupId = `radio-group-${Math.random().toString(36).substr(2, 9)}`;
  const helperTextId = `${groupId}-helper`;
  const errorId = `${groupId}-error`;

  // Determine the current state based on props
  const currentState = error ? 'error' : success ? 'success' : warning ? 'warning' : state || 'default';

  // Build aria-describedby
  const describedBy = [
    helperText && helperTextId,
    error && errorId,
  ].filter(Boolean).join(' ') || undefined;

  // Handle radio change
  const handleRadioChange = (radioValue: string | number) => {
    if (value === undefined) {
      setInternalValue(radioValue);
    }
    onChange?.(radioValue);
  };

  return (
    <fieldset className={clsx('space-y-2', className)}>
      {/* Group Label */}
      {label && (
        <legend className={clsx(
          'text-sm font-medium text-neutral-700 mb-2',
          labelClassName
        )}>
          {label}
          {required && (
            <span className="text-red-500 ml-1" aria-label="required">
              *
            </span>
          )}
        </legend>
      )}

      {/* Radio Buttons */}
      <div
        role="radiogroup"
        aria-describedby={describedBy}
        aria-invalid={currentState === 'error'}
        aria-required={required}
        className={clsx(
          'space-y-2',
          direction === 'horizontal' && 'flex flex-wrap gap-4 space-y-0'
        )}
      >
        {/* Render options */}
        {options.map((option) => (
          <Radio
            key={option.value}
            name={name}
            value={option.value}
            label={option.label}
            helperText={option.helperText}
            checked={currentValue === option.value}
            disabled={disabled || option.disabled}
            state={currentState !== 'default' ? currentState : undefined}
            size={size}
            onChange={(e) => {
              if (e.target.checked) {
                handleRadioChange(option.value);
              }
            }}
          />
        ))}

        {/* Render children */}
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child) && child.type === Radio) {
            const radioValue = child.props.value;
            const isChecked = currentValue === radioValue;

            return React.cloneElement(child, {
              ...child.props,
              name,
              checked: isChecked,
              disabled: disabled || child.props.disabled,
              state: currentState !== 'default' ? currentState : child.props.state,
              size: size || child.props.size,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                if (e.target.checked) {
                  handleRadioChange(radioValue);
                }
                child.props.onChange?.(e);
              },
            });
          }
          return child;
        })}
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
    </fieldset>
  );
};

RadioGroup.displayName = 'RadioGroup';

// Export radio variants for external use
export { radioVariants, labelVariants, helperTextVariants };