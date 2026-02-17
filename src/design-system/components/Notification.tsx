/**
 * Atlas Finance Design System - Notification Component
 * Toast notification system with positioning and animation
 */

import React, { forwardRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { cva, type VariantProps } from 'class-variance-authority';
import { theme } from '../theme';
import { Button } from './Button';

// Notification variants
const notificationVariants = cva(
  [
    'relative max-w-sm w-full bg-white rounded-lg shadow-lg border',
    'p-4 pointer-events-auto ring-1 ring-black ring-opacity-5',
    'transition-all duration-300 ease-in-out',
  ],
  {
    variants: {
      variant: {
        info: 'border-blue-200 bg-blue-50',
        success: 'border-green-200 bg-green-50',
        warning: 'border-yellow-200 bg-yellow-50',
        error: 'border-red-200 bg-red-50',
        neutral: 'border-neutral-200 bg-white',
      },
      size: {
        sm: 'max-w-xs p-3',
        md: 'max-w-sm p-4',
        lg: 'max-w-md p-5',
      },
    },
    defaultVariants: {
      variant: 'info',
      size: 'md',
    },
  }
);

// Container variants for positioning
const notificationContainerVariants = cva(
  [
    'fixed z-50 pointer-events-none',
    'flex flex-col gap-2',
  ],
  {
    variants: {
      position: {
        'top-left': 'top-4 left-4',
        'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
        'top-right': 'top-4 right-4',
        'bottom-left': 'bottom-4 left-4',
        'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
        'bottom-right': 'bottom-4 right-4',
      },
    },
    defaultVariants: {
      position: 'top-right',
    },
  }
);

// Animation variants
const notificationAnimationVariants = cva(
  ['transition-all duration-300 ease-in-out'],
  {
    variants: {
      state: {
        entering: 'animate-in slide-in-from-right-full fade-in-0',
        entered: 'opacity-100 transform translate-x-0',
        exiting: 'animate-out slide-out-to-right-full fade-out-0',
      },
    },
    defaultVariants: {
      state: 'entered',
    },
  }
);

// Icons (reuse from Alert)
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

// Color mapping for icons
const iconColorMap = {
  info: 'text-blue-500',
  success: 'text-green-500',
  warning: 'text-yellow-500',
  error: 'text-red-500',
  neutral: 'text-neutral-500',
} as const;

// Text color mapping
const textColorMap = {
  info: 'text-blue-800',
  success: 'text-green-800',
  warning: 'text-yellow-800',
  error: 'text-red-800',
  neutral: 'text-neutral-800',
} as const;

// Notification component props
export interface NotificationProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof notificationVariants> {
  /** Notification title */
  title?: string;
  /** Notification description */
  description?: string;
  /** Custom icon (overrides default variant icon) */
  icon?: React.ReactNode;
  /** Whether to show the default icon */
  showIcon?: boolean;
  /** Whether the notification can be dismissed */
  dismissible?: boolean;
  /** Callback when notification is dismissed */
  onDismiss?: () => void;
  /** Action buttons */
  actions?: React.ReactNode;
  /** Auto dismiss timeout in milliseconds (0 to disable) */
  autoClose?: number;
  /** Whether to show the notification */
  visible?: boolean;
  /** Accessible close button label */
  closeLabel?: string;
  /** Animation state */
  animationState?: 'entering' | 'entered' | 'exiting';
}

/**
 * Individual Notification component
 *
 * @example
 * ```tsx
 * <Notification
 *   variant="success"
 *   title="Success"
 *   description="Your changes have been saved."
 *   dismissible
 *   autoClose={5000}
 *   onDismiss={() => removeNotification(id)}
 * />
 * ```
 */
export const Notification = forwardRef<HTMLDivElement, NotificationProps>(
  (
    {
      title,
      description,
      children,
      icon,
      showIcon = true,
      dismissible = true,
      onDismiss,
      actions,
      autoClose = 5000,
      visible = true,
      closeLabel = 'Close notification',
      animationState = 'entered',
      className,
      variant,
      size,
      role = 'status',
      'aria-live': ariaLive,
      'aria-atomic': ariaAtomic,
      ...props
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = useState(visible);

    // Auto close functionality
    useEffect(() => {
      if (autoClose > 0 && visible) {
        const timer = setTimeout(() => {
          onDismiss?.();
        }, autoClose);

        return () => clearTimeout(timer);
      }
    }, [autoClose, visible, onDismiss]);

    // Don't render if not visible
    if (!visible && !isVisible) return null;

    // Get the appropriate icon
    const IconComponent = iconMap[variant || 'info'];
    const iconColor = iconColorMap[variant || 'info'];
    const textColor = textColorMap[variant || 'info'];
    const notificationIcon = icon !== undefined ? icon : showIcon ? (
      <IconComponent className={clsx('w-5 h-5 flex-shrink-0', iconColor)} />
    ) : null;

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
        className={clsx(
          notificationVariants({ variant, size }),
          notificationAnimationVariants({ state: animationState }),
          className
        )}
        {...ariaProps}
        {...props}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          {notificationIcon && (
            <div className="flex-shrink-0 mt-0.5" aria-hidden="true">
              {notificationIcon}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            {title && (
              <div className={clsx('font-medium text-sm leading-5', textColor)}>
                {title}
              </div>
            )}

            {/* Description */}
            {description && (
              <div className={clsx(
                'text-sm leading-5 opacity-90',
                textColor,
                title && 'mt-1'
              )}>
                {description}
              </div>
            )}

            {/* Children */}
            {children && (
              <div className={clsx('mt-2', textColor)}>
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
            <div className="flex-shrink-0 ml-2">
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

        {/* Progress bar for auto close */}
        {autoClose > 0 && visible && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black bg-opacity-10 rounded-b-lg overflow-hidden">
            <div
              className="h-full bg-current opacity-30 transition-all ease-linear"
              style={{
                animation: `notification-progress ${autoClose}ms linear`,
                width: '100%',
              }}
            />
          </div>
        )}
      </div>
    );
  }
);

Notification.displayName = 'Notification';

// Notification data interface
export interface NotificationData {
  id?: string;
  variant?: 'info' | 'success' | 'warning' | 'error' | 'neutral';
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  showIcon?: boolean;
  dismissible?: boolean;
  autoClose?: number;
  actions?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

// Notification container props
export interface NotificationContainerProps {
  /** Position of the notification container */
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  /** Maximum number of notifications to show */
  maxNotifications?: number;
  /** Container for portal rendering */
  container?: HTMLElement;
  /** Additional class for the container */
  className?: string;
}

// Global notification state (simplified implementation)
let notificationId = 0;
const notificationListeners = new Set<(notifications: (NotificationData & { id: string; timestamp: number })[]) => void>();
let notifications: (NotificationData & { id: string; timestamp: number })[] = [];

// Notification manager functions
export const addNotification = (notification: NotificationData) => {
  const id = notification.id || `notification-${++notificationId}`;
  const newNotification = {
    ...notification,
    id,
    timestamp: Date.now(),
  };

  notifications = [newNotification, ...notifications];
  notificationListeners.forEach(listener => listener(notifications));

  return id;
};

export const removeNotification = (id: string) => {
  notifications = notifications.filter(n => n.id !== id);
  notificationListeners.forEach(listener => listener(notifications));
};

export const clearAllNotifications = () => {
  notifications = [];
  notificationListeners.forEach(listener => listener(notifications));
};

// Hook for notification state
export const useNotifications = () => {
  const [notificationList, setNotificationList] = useState(notifications);

  useEffect(() => {
    notificationListeners.add(setNotificationList);
    return () => {
      notificationListeners.delete(setNotificationList);
    };
  }, []);

  return {
    notifications: notificationList,
    addNotification,
    removeNotification,
    clearAllNotifications,
  };
};

/**
 * Notification Container component
 *
 * @example
 * ```tsx
 * <NotificationContainer position="top-right" maxNotifications={5} />
 * ```
 */
export const NotificationContainer: React.FC<NotificationContainerProps> = ({
  position = 'top-right',
  maxNotifications = 5,
  container,
  className,
}) => {
  const { notifications } = useNotifications();

  const visibleNotifications = notifications.slice(0, maxNotifications);

  const notificationContainer = (
    <div
      className={clsx(
        notificationContainerVariants({ position }),
        className
      )}
      aria-live="polite"
      aria-label="Notifications"
    >
      {visibleNotifications.map((notification) => (
        <Notification
          key={notification.id}
          {...notification}
          onDismiss={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );

  // Render in portal
  const portalContainer = container || document.body;
  return createPortal(notificationContainer, portalContainer);
};

NotificationContainer.displayName = 'NotificationContainer';

// Convenience functions for different notification types
export const showNotification = (notification: NotificationData) => addNotification(notification);

export const showInfoNotification = (title: string, description?: string, options?: Partial<NotificationData>) =>
  addNotification({ variant: 'info', title, description, ...options });

export const showSuccessNotification = (title: string, description?: string, options?: Partial<NotificationData>) =>
  addNotification({ variant: 'success', title, description, ...options });

export const showWarningNotification = (title: string, description?: string, options?: Partial<NotificationData>) =>
  addNotification({ variant: 'warning', title, description, ...options });

export const showErrorNotification = (title: string, description?: string, options?: Partial<NotificationData>) =>
  addNotification({ variant: 'error', title, description, ...options });

// Compound exports
export const NotificationComponent = Object.assign(Notification, {
  Container: NotificationContainer,
  show: showNotification,
  showInfo: showInfoNotification,
  showSuccess: showSuccessNotification,
  showWarning: showWarningNotification,
  showError: showErrorNotification,
  remove: removeNotification,
  clear: clearAllNotifications,
});

// Export notification variants for external use
export { notificationVariants, notificationContainerVariants };

// Default export as compound component
export default NotificationComponent;

// CSS for progress bar animation (to be added to global styles)
export const notificationProgressCSS = `
@keyframes notification-progress {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}
`;