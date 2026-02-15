/**
 * Atlas Finance Design System - Button Component
 * Fully accessible button with all states and responsive design
 */

import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { cva, type VariantProps } from 'class-variance-authority';
import { theme } from '../theme';

// Button variants using class-variance-authority for type-safe variants
const buttonVariants = cva(
  [
    // Base styles
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'font-medium text-sm leading-5 transition-all duration-200',
    'border border-transparent rounded-md',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'select-none cursor-pointer',
    // Accessibility
    'focus-visible:ring-2 focus-visible:ring-offset-2',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-primary-500 text-white border-primary-500',
          'hover:bg-primary-600 hover:border-primary-600',
          'active:bg-primary-700 active:border-primary-700',
          'focus:ring-primary-500',
          'disabled:bg-primary-300 disabled:border-primary-300',
        ],
        secondary: [
          'bg-secondary-500 text-white border-secondary-500',
          'hover:bg-secondary-600 hover:border-secondary-600',
          'active:bg-secondary-700 active:border-secondary-700',
          'focus:ring-secondary-500',
          'disabled:bg-secondary-300 disabled:border-secondary-300',
        ],
        outline: [
          'bg-transparent text-primary-500 border-primary-500',
          'hover:bg-primary-50 hover:text-primary-600',
          'active:bg-primary-100 active:text-primary-700',
          'focus:ring-primary-500',
          'disabled:text-primary-300 disabled:border-primary-300',
        ],
        ghost: [
          'bg-transparent text-primary-500 border-transparent',
          'hover:bg-primary-50 hover:text-primary-600',
          'active:bg-primary-100 active:text-primary-700',
          'focus:ring-primary-500',
          'disabled:text-primary-300',
        ],
        link: [
          'bg-transparent text-primary-500 border-transparent underline-offset-4',
          'hover:underline hover:text-primary-600',
          'active:text-primary-700',
          'focus:ring-primary-500',
          'disabled:text-primary-300',
          'p-0 h-auto',
        ],
        destructive: [
          'bg-red-500 text-white border-red-500',
          'hover:bg-red-600 hover:border-red-600',
          'active:bg-red-700 active:border-red-700',
          'focus:ring-red-500',
          'disabled:bg-red-300 disabled:border-red-300',
        ],
        success: [
          'bg-green-500 text-white border-green-500',
          'hover:bg-green-600 hover:border-green-600',
          'active:bg-green-700 active:border-green-700',
          'focus:ring-green-500',
          'disabled:bg-green-300 disabled:border-green-300',
        ],
      },
      size: {
        xs: 'h-7 px-2 text-xs',
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        xl: 'h-14 px-8 text-lg',
      },
      fullWidth: {
        true: 'w-full',
        false: 'w-auto',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
);

// Loading spinner component
const LoadingSpinner = ({ size = 16 }: { size?: number }) => (
  <svg
    className="animate-spin"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

// Button component props interface
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Whether the button is in a loading state */
  loading?: boolean;
  /** Icon to display before the button text */
  leftIcon?: React.ReactNode;
  /** Icon to display after the button text */
  rightIcon?: React.ReactNode;
  /** Accessible label for screen readers when content is not descriptive */
  'aria-label'?: string;
  /** ID of element that describes the button */
  'aria-describedby'?: string;
  /** Whether the button controls an expanded element */
  'aria-expanded'?: boolean;
  /** Whether the button controls a popup */
  'aria-haspopup'?: boolean | 'false' | 'true' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  /** ID of element controlled by the button */
  'aria-controls'?: string;
}

/**
 * Button component with comprehensive accessibility and state management
 *
 * Features:
 * - Multiple variants (primary, secondary, outline, ghost, link, destructive, success)
 * - Multiple sizes (xs, sm, md, lg, xl)
 * - Loading state with spinner
 * - Left and right icons
 * - Full accessibility support
 * - Keyboard navigation
 * - Screen reader support
 * - Responsive design
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md" onClick={handleClick}>
 *   Save Changes
 * </Button>
 *
 * <Button variant="outline" loading leftIcon={<SaveIcon />}>
 *   Saving...
 * </Button>
 *
 * <Button variant="destructive" aria-describedby="delete-help">
 *   Delete Item
 * </Button>
 * ```
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant,
      size,
      fullWidth,
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      type = 'button',
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      'aria-expanded': ariaExpanded,
      'aria-haspopup': ariaHasPopup,
      'aria-controls': ariaControls,
      ...props
    },
    ref
  ) => {
    // Determine if button should be disabled
    const isDisabled = disabled || loading;

    // Loading state should show spinner instead of left icon
    const showLeftIcon = leftIcon && !loading;
    const showRightIcon = rightIcon && !loading;
    const showLoadingSpinner = loading;

    return (
      <button
        ref={ref}
        type={type}
        className={clsx(buttonVariants({ variant, size, fullWidth }), className)}
        disabled={isDisabled}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-expanded={ariaExpanded}
        aria-haspopup={ariaHasPopup}
        aria-controls={ariaControls}
        aria-disabled={isDisabled}
        {...props}
      >
        {/* Loading spinner */}
        {showLoadingSpinner && (
          <LoadingSpinner size={size === 'xs' ? 12 : size === 'sm' ? 14 : size === 'lg' ? 18 : size === 'xl' ? 20 : 16} />
        )}

        {/* Left icon */}
        {showLeftIcon && (
          <span className="flex-shrink-0" aria-hidden="true">
            {leftIcon}
          </span>
        )}

        {/* Button text */}
        {children && (
          <span className={clsx(
            'flex-grow',
            variant === 'link' && 'underline-offset-4'
          )}>
            {children}
          </span>
        )}

        {/* Right icon */}
        {showRightIcon && (
          <span className="flex-shrink-0" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

// Export button variants for external use
export { buttonVariants };
export type { VariantProps };

// Custom CSS for Tailwind configuration (to be added to tailwind.config.js)
export const buttonTailwindConfig = {
  theme: {
    extend: {
      colors: {
        primary: theme.colors.primary,
        secondary: theme.colors.secondary,
      },
      animation: {
        'spin': 'spin 1s linear infinite',
      },
    },
  },
};