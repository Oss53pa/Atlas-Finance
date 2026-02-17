/**
 * Atlas Finance Design System - Checkbox Component
 * Fully accessible checkbox with validation and custom styling
 */

import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { cva, type VariantProps } from 'class-variance-authority';
import { theme } from '../theme';

// Checkbox variants
const checkboxVariants = cva(
  [
    'peer h-4 w-4 shrink-0 rounded border border-neutral-300',
    'bg-white text-primary-500',
    'transition-colors duration-200',
    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'checked:bg-primary-500 checked:border-primary-500',
    'indeterminate:bg-primary-500 indeterminate:border-primary-500',
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

// Check icon
const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 16 16"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z"
      clipRule="evenodd"
    />
  </svg>
);

// Indeterminate icon
const IndeterminateIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 16 16"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path fillRule="evenodd" d="M4 8a1 1 0 011-1h6a1 1 0 110 2H5a1 1 0 01-1-1z" clipRule="evenodd" />
  </svg>
);

// Checkbox component props
export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'>,
    VariantProps<typeof checkboxVariants> {
  /** Label text */
  label?: string;
  /** Helper text to display below the checkbox */
  helperText?: string;
  /** Error message to display */
  error?: string;
  /** Success message to display */
  success?: string;
  /** Warning message to display */
  warning?: string;
  /** Whether the checkbox is in an indeterminate state */
  indeterminate?: boolean;
  /** Additional class for the container */
  containerClassName?: string;
  /** Additional class for the label */
  labelClassName?: string;
  /** Additional class for the checkbox wrapper */
  checkboxWrapperClassName?: string;
}

/**
 * Checkbox component with comprehensive validation and accessibility
 *
 * Features:
 * - Multiple states (default, error, success, warning)
 * - Multiple sizes (sm, md, lg)
 * - Indeterminate state support
 * - Built-in validation feedback
 * - Full accessibility support
 * - Keyboard navigation
 * - Screen reader support
 * - Custom styling
 *
 * @example
 * ```tsx
 * <Checkbox
 *   label="I agree to the terms and conditions"
 *   required
 *   error={errors.terms}
 *   helperText="Please read our terms and conditions"
 * />
 *
 * <Checkbox
 *   label="Select all"
 *   indeterminate={someSelected && !allSelected}
 *   checked={allSelected}
 *   onChange={handleSelectAll}
 * />
 * ```
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      helperText,
      error,
      success,
      warning,
      indeterminate = false,
      className,
      containerClassName,
      labelClassName,
      checkboxWrapperClassName,
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
    const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;
    const helperTextId = `${checkboxId}-helper`;
    const errorId = `${checkboxId}-error`;

    // Determine the current state based on props
    const currentState = error ? 'error' : success ? 'success' : warning ? 'warning' : state || 'default';

    // Build aria-describedby
    const describedBy = [
      ariaDescribedBy,
      helperText && helperTextId,
      error && errorId,
    ].filter(Boolean).join(' ') || undefined;

    // Use ref for indeterminate state
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Combine refs
    React.useImperativeHandle(ref, () => inputRef.current!);

    // Handle indeterminate state
    React.useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    return (
      <div className={clsx(containerVariants(), containerClassName)}>
        {/* Checkbox Container */}
        <div className={clsx('relative flex items-center', checkboxWrapperClassName)}>
          {/* Hidden Checkbox Input */}
          <input
            ref={inputRef}
            type="checkbox"
            id={checkboxId}
            className={clsx(
              checkboxVariants({ state: currentState, size }),
              className
            )}
            disabled={disabled}
            checked={checked}
            aria-describedby={describedBy}
            aria-invalid={currentState === 'error'}
            {...props}
          />

          {/* Custom Check/Indeterminate Icon */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {indeterminate ? (
              <IndeterminateIcon
                className={clsx(
                  'text-white',
                  size === 'sm' && 'w-2 h-2',
                  size === 'md' && 'w-3 h-3',
                  size === 'lg' && 'w-4 h-4'
                )}
              />
            ) : (
              checked && (
                <CheckIcon
                  className={clsx(
                    'text-white',
                    size === 'sm' && 'w-2 h-2',
                    size === 'md' && 'w-3 h-3',
                    size === 'lg' && 'w-4 h-4'
                  )}
                />
              )
            )}
          </div>
        </div>

        {/* Label and Helper Text Container */}
        {(label || helperText || error || success || warning) && (
          <div className="flex-1 min-w-0">
            {/* Label */}
            {label && (
              <label
                htmlFor={checkboxId}
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

Checkbox.displayName = 'Checkbox';

// Checkbox Group component for multiple checkboxes
export interface CheckboxGroupProps {
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
  /** Array of selected values */
  value?: (string | number)[];
  /** Default selected values */
  defaultValue?: (string | number)[];
  /** Change handler */
  onChange?: (values: (string | number)[]) => void;
  /** Children checkboxes */
  children: React.ReactNode;
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
 * Checkbox Group component for managing multiple checkboxes
 *
 * @example
 * ```tsx
 * <CheckboxGroup
 *   label="Select your interests"
 *   value={selectedInterests}
 *   onChange={setSelectedInterests}
 *   error={errors.interests}
 * >
 *   <Checkbox value="sports" label="Sports" />
 *   <Checkbox value="music" label="Music" />
 *   <Checkbox value="travel" label="Travel" />
 * </CheckboxGroup>
 * ```
 */
export const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  label,
  helperText,
  error,
  success,
  warning,
  value,
  defaultValue,
  onChange,
  children,
  className,
  labelClassName,
  required = false,
  disabled = false,
  direction = 'vertical',
}) => {
  const [internalValue, setInternalValue] = React.useState<(string | number)[]>(defaultValue || []);

  // Use controlled or uncontrolled value
  const currentValue = value !== undefined ? value : internalValue;

  // Generate unique IDs for accessibility
  const groupId = `checkbox-group-${Math.random().toString(36).substr(2, 9)}`;
  const helperTextId = `${groupId}-helper`;
  const errorId = `${groupId}-error`;

  // Determine the current state based on props
  const currentState = error ? 'error' : success ? 'success' : warning ? 'warning' : 'default';

  // Build aria-describedby
  const describedBy = [
    helperText && helperTextId,
    error && errorId,
  ].filter(Boolean).join(' ') || undefined;

  // Handle checkbox change
  const handleCheckboxChange = (checkboxValue: string | number, checked: boolean) => {
    let newValue: (string | number)[];

    if (checked) {
      newValue = [...currentValue, checkboxValue];
    } else {
      newValue = currentValue.filter(v => v !== checkboxValue);
    }

    if (value === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };

  // Clone children and add necessary props
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && child.type === Checkbox) {
      const checkboxValue = child.props.value;
      const isChecked = currentValue.includes(checkboxValue);

      return React.cloneElement(child, {
        ...child.props,
        checked: isChecked,
        disabled: disabled || child.props.disabled,
        state: currentState !== 'default' ? currentState : child.props.state,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          handleCheckboxChange(checkboxValue, e.target.checked);
          child.props.onChange?.(e);
        },
      });
    }
    return child;
  });

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

      {/* Checkboxes */}
      <div
        role="group"
        aria-describedby={describedBy}
        aria-invalid={currentState === 'error'}
        aria-required={required}
        className={clsx(
          'space-y-2',
          direction === 'horizontal' && 'flex flex-wrap gap-4 space-y-0'
        )}
      >
        {enhancedChildren}
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

CheckboxGroup.displayName = 'CheckboxGroup';

// Export checkbox variants for external use
export { checkboxVariants, labelVariants, helperTextVariants };