/**
 * WiseBook Design System - Input Component
 * Fully accessible input with validation and error states
 */

import React, { forwardRef, useState } from 'react';
import { clsx } from 'clsx';
import { cva, type VariantProps } from 'class-variance-authority';
import { theme } from '../theme';

// Input variants
const inputVariants = cva(
  [
    'w-full px-3 py-2 text-sm placeholder-neutral-500',
    'border border-neutral-300 rounded-md',
    'bg-white text-neutral-900',
    'transition-colors duration-200',
    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
    'disabled:bg-neutral-100 disabled:text-neutral-500 disabled:cursor-not-allowed',
    'read-only:bg-neutral-50 read-only:cursor-default',
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

// Label variants
const labelVariants = cva([
  'block text-sm font-medium text-neutral-700 mb-1',
]);

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

// Input container variants
const containerVariants = cva(['relative']);

// Icons
const EyeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
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

// Input component props
export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  /** Label text */
  label?: string;
  /** Helper text to display below the input */
  helperText?: string;
  /** Error message to display */
  error?: string;
  /** Success message to display */
  success?: string;
  /** Warning message to display */
  warning?: string;
  /** Icon to display at the start of the input */
  startIcon?: React.ReactNode;
  /** Icon to display at the end of the input */
  endIcon?: React.ReactNode;
  /** Whether the input is required */
  required?: boolean;
  /** Additional class for the container */
  containerClassName?: string;
  /** Additional class for the label */
  labelClassName?: string;
  /** Whether to show password toggle for password inputs */
  showPasswordToggle?: boolean;
}

/**
 * Input component with comprehensive validation and accessibility
 *
 * Features:
 * - Multiple states (default, error, success, warning)
 * - Multiple sizes (sm, md, lg)
 * - Built-in validation feedback
 * - Start and end icons
 * - Password visibility toggle
 * - Full accessibility support
 * - Required field indication
 * - Helper text support
 *
 * @example
 * ```tsx
 * <Input
 *   label="Email"
 *   type="email"
 *   placeholder="Enter your email"
 *   required
 *   error={errors.email}
 *   helperText="We'll never share your email"
 * />
 *
 * <Input
 *   label="Password"
 *   type="password"
 *   showPasswordToggle
 *   startIcon={<LockIcon />}
 * />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      success,
      warning,
      startIcon,
      endIcon,
      required = false,
      className,
      containerClassName,
      labelClassName,
      state,
      size,
      type = 'text',
      showPasswordToggle = false,
      id,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);

    // Generate unique IDs for accessibility
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const helperTextId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;

    // Determine the current state based on props
    const currentState = error ? 'error' : success ? 'success' : warning ? 'warning' : state || 'default';

    // Determine input type (handle password toggle)
    const inputType = type === 'password' && showPassword ? 'text' : type;

    // Determine if we should show the password toggle
    const shouldShowPasswordToggle = showPasswordToggle && type === 'password';

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
      <div className={clsx(containerVariants(), containerClassName)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
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

        {/* Input Container */}
        <div className="relative">
          {/* Start Icon */}
          {startIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <span className="text-neutral-500" aria-hidden="true">
                {startIcon}
              </span>
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            className={clsx(
              inputVariants({ state: currentState, size }),
              startIcon && 'pl-10',
              (endIcon || stateIcon || shouldShowPasswordToggle) && 'pr-10',
              className
            )}
            aria-describedby={describedBy}
            aria-invalid={currentState === 'error'}
            aria-required={required}
            {...props}
          />

          {/* End Icons Container */}
          {(endIcon || stateIcon || shouldShowPasswordToggle) && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              {/* State Icon */}
              {stateIcon && (
                <span aria-hidden="true">
                  {stateIcon}
                </span>
              )}

              {/* End Icon */}
              {endIcon && (
                <span className="text-neutral-500" aria-hidden="true">
                  {endIcon}
                </span>
              )}

              {/* Password Toggle */}
              {shouldShowPasswordToggle && (
                <button
                  type="button"
                  className="text-neutral-500 hover:text-neutral-700 focus:outline-none focus:text-neutral-700"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOffIcon className="w-4 h-4" />
                  ) : (
                    <EyeIcon className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          )}
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

Input.displayName = 'Input';

// Export input variants for external use
export { inputVariants, labelVariants, helperTextVariants };