/**
 * Atlas Finance Design System - Alert Component
 * Accessible alert component for user feedback and status messages
 */

import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { cva, type VariantProps } from 'class-variance-authority';
import { theme } from '../theme';
import { Button } from './Button';

// Alert variants
const alertVariants = cva(
  [
    'relative w-full rounded-lg border p-4',
    'flex items-start gap-3',
    'transition-all duration-200',
  ],
  {
    variants: {
      variant: {
        info: [
          'bg-blue-50 border-blue-200 text-blue-800',
          '[&>svg]:text-blue-600',
        ],
        success: [
          'bg-green-50 border-green-200 text-green-800',
          '[&>svg]:text-green-600',
        ],
        warning: [
          'bg-yellow-50 border-yellow-200 text-yellow-800',
          '[&>svg]:text-yellow-600',
        ],
        error: [
          'bg-red-50 border-red-200 text-red-800',
          '[&>svg]:text-red-600',
        ],
        neutral: [
          'bg-neutral-50 border-neutral-200 text-neutral-800',
          '[&>svg]:text-neutral-600',
        ],
      },
      size: {
        sm: 'p-3 text-sm',
        md: 'p-4 text-sm',
        lg: 'p-5 text-base',
      },
      rounded: {
        none: 'rounded-none',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        full: 'rounded-full',
      },
    },
    defaultVariants: {
      variant: 'info',
      size: 'md',
      rounded: 'lg',
    },
  }
);

// Alert title variants
const alertTitleVariants = cva([
  'font-medium leading-5 mb-1',
]);

// Alert description variants
const alertDescriptionVariants = cva([
  'text-sm leading-5 opacity-90',
]);

// Alert icons
const InfoIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const SuccessIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const WarningIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z"
    />
  </svg>
);

const ErrorIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const CloseIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// Icon mapping
const iconMap = {
  info: InfoIcon,
  success: SuccessIcon,
  warning: WarningIcon,
  error: ErrorIcon,
  neutral: InfoIcon,
} as const;

// Alert component props
export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  /** Alert title */
  title?: string;
  /** Alert description */
  description?: string;
  /** Custom icon (overrides default variant icon) */
  icon?: React.ReactNode;
  /** Whether to show the default icon */
  showIcon?: boolean;
  /** Whether the alert can be dismissed */
  dismissible?: boolean;
  /** Callback when alert is dismissed */
  onDismiss?: () => void;
  /** Action buttons */
  actions?: React.ReactNode;
  /** Whether to show the alert */
  visible?: boolean;
  /** Accessible close button label */
  closeLabel?: string;
}

/**
 * Alert component for user feedback and status messages
 *
 * Features:
 * - Multiple variants (info, success, warning, error, neutral)
 * - Multiple sizes (sm, md, lg)
 * - Customizable icons
 * - Dismissible functionality
 * - Action buttons support
 * - Full accessibility support
 * - Screen reader announcements
 * - Keyboard navigation
 *
 * @example
 * ```tsx
 * <Alert
 *   variant="success"
 *   title="Success"
 *   description="Your changes have been saved successfully."
 *   dismissible
 *   onDismiss={() => setShowAlert(false)}
 * />
 *
 * <Alert
 *   variant="error"
 *   title="Error"
 *   description="There was an error processing your request."
 *   actions={
 *     <Button size="sm" variant="outline">
 *       Try Again
 *     </Button>
 *   }
 * />
 * ```
 */
export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      title,
      description,
      children,
      icon,
      showIcon = true,
      dismissible = false,
      onDismiss,
      actions,
      visible = true,
      closeLabel = 'Close alert',
      className,
      variant,
      size,
      rounded,
      role = 'alert',
      'aria-live': ariaLive,
      'aria-atomic': ariaAtomic,
      ...props
    },
    ref
  ) => {
    // Don't render if not visible
    if (!visible) return null;

    // Get the appropriate icon
    const IconComponent = iconMap[variant || 'info'];
    const alertIcon = icon !== undefined ? icon : showIcon ? <IconComponent className="w-5 h-5 flex-shrink-0 mt-0.5" /> : null;

    // Determine ARIA properties based on variant
    const getAriaProperties = () => {
      if (variant === 'error') {
        return {
          role: role || 'alert',
          'aria-live': ariaLive || 'assertive',
          'aria-atomic': ariaAtomic !== undefined ? ariaAtomic : true,
        };
      }
      return {
        role: role || 'status',
        'aria-live': ariaLive || 'polite',
        'aria-atomic': ariaAtomic !== undefined ? ariaAtomic : true,
      };
    };

    const ariaProps = getAriaProperties();

    return (
      <div
        ref={ref}
        className={clsx(alertVariants({ variant, size, rounded }), className)}
        {...ariaProps}
        {...props}
      >
        {/* Icon */}
        {alertIcon && (
          <div className="flex-shrink-0" aria-hidden="true">
            {alertIcon}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          {title && (
            <div className={alertTitleVariants()}>
              {title}
            </div>
          )}

          {/* Description */}
          {description && (
            <div className={alertDescriptionVariants()}>
              {description}
            </div>
          )}

          {/* Children */}
          {children && (
            <div className={clsx('mt-2', title || description ? 'mt-2' : '')}>
              {children}
            </div>
          )}

          {/* Actions */}
          {actions && (
            <div className="mt-3 flex gap-2">
              {actions}
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        {dismissible && onDismiss && (
          <div className="flex-shrink-0 ml-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              aria-label={closeLabel}
              className="p-1 h-6 w-6 rounded-md hover:bg-black hover:bg-opacity-5 focus:bg-black focus:bg-opacity-5"
            >
              <CloseIcon className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';

// Alert Title component (for composition)
export interface AlertTitleProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const AlertTitle = forwardRef<HTMLDivElement, AlertTitleProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(alertTitleVariants(), className)}
      {...props}
    >
      {children}
    </div>
  )
);

AlertTitle.displayName = 'AlertTitle';

// Alert Description component (for composition)
export interface AlertDescriptionProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const AlertDescription = forwardRef<HTMLDivElement, AlertDescriptionProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(alertDescriptionVariants(), className)}
      {...props}
    >
      {children}
    </div>
  )
);

AlertDescription.displayName = 'AlertDescription';

// Alert Actions component (for composition)
export interface AlertActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const AlertActions = forwardRef<HTMLDivElement, AlertActionsProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx('mt-3 flex gap-2', className)}
      {...props}
    >
      {children}
    </div>
  )
);

AlertActions.displayName = 'AlertActions';

// Compound exports
export const AlertComponent = Object.assign(Alert, {
  Title: AlertTitle,
  Description: AlertDescription,
  Actions: AlertActions,
});

// Export alert variants for external use
export { alertVariants };

// Default export as compound component
export default AlertComponent;