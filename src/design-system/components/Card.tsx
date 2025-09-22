/**
 * WiseBook Design System - Card Component
 * Flexible card component for consistent layouts and content organization
 */

import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { cva, type VariantProps } from 'class-variance-authority';
import { theme } from '../theme';

// Card variants
const cardVariants = cva(
  [
    'bg-white rounded-lg border border-neutral-200',
    'transition-shadow duration-200',
    'overflow-hidden',
  ],
  {
    variants: {
      variant: {
        default: 'shadow-sm',
        elevated: 'shadow-md',
        outlined: 'border-2 border-neutral-200 shadow-none',
        flat: 'shadow-none border-none',
      },
      padding: {
        none: 'p-0',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
        xl: 'p-8',
      },
      hover: {
        none: '',
        lift: 'hover:shadow-md hover:-translate-y-0.5',
        glow: 'hover:shadow-lg hover:shadow-primary-500/10',
        scale: 'hover:scale-[1.02]',
      },
      interactive: {
        true: 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
      hover: 'none',
      interactive: false,
    },
  }
);

// Card header variants
const cardHeaderVariants = cva([
  'border-b border-neutral-200 bg-neutral-50',
  'flex items-center justify-between',
  'px-4 py-3 sm:px-6',
]);

// Card body variants
const cardBodyVariants = cva([
  'flex-1',
]);

// Card footer variants
const cardFooterVariants = cva([
  'border-t border-neutral-200 bg-neutral-50',
  'px-4 py-3 sm:px-6',
  'flex items-center justify-between',
]);

// Card title variants
const cardTitleVariants = cva(
  ['font-semibold text-neutral-900'],
  {
    variants: {
      size: {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

// Card description variants
const cardDescriptionVariants = cva([
  'text-sm text-neutral-600 mt-1',
]);

// Card component props
export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  /** Content of the card */
  children: React.ReactNode;
  /** Whether the card is clickable */
  clickable?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Click handler for interactive cards */
  onCardClick?: () => void;
}

/**
 * Card component for consistent content organization
 *
 * Features:
 * - Multiple variants (default, elevated, outlined, flat)
 * - Multiple padding options
 * - Hover effects (lift, glow, scale)
 * - Interactive states
 * - Loading and disabled states
 * - Keyboard navigation
 * - Accessibility support
 *
 * @example
 * ```tsx
 * <Card variant="elevated" hover="lift" interactive>
 *   <CardHeader>
 *     <CardTitle>Product Details</CardTitle>
 *     <CardDescription>View and edit product information</CardDescription>
 *   </CardHeader>
 *   <CardBody>
 *     <p>Card content goes here...</p>
 *   </CardBody>
 *   <CardFooter>
 *     <Button variant="outline">Cancel</Button>
 *     <Button>Save</Button>
 *   </CardFooter>
 * </Card>
 * ```
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      className,
      variant,
      padding,
      hover,
      interactive,
      clickable = false,
      loading = false,
      disabled = false,
      onCardClick,
      onClick,
      onKeyDown,
      tabIndex,
      role,
      'aria-disabled': ariaDisabled,
      ...props
    },
    ref
  ) => {
    // Determine if card should be interactive
    const isInteractive = interactive || clickable || Boolean(onCardClick);

    // Handle click
    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
      if (disabled || loading) return;

      onClick?.(event);
      onCardClick?.();
    };

    // Handle keyboard navigation
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled || loading) return;

      onKeyDown?.(event);

      if (isInteractive && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        onCardClick?.();
      }
    };

    return (
      <div
        ref={ref}
        className={clsx(
          cardVariants({ variant, padding, hover, interactive: isInteractive }),
          loading && 'opacity-60 pointer-events-none',
          disabled && 'opacity-50 pointer-events-none',
          className
        )}
        onClick={isInteractive ? handleClick : onClick}
        onKeyDown={isInteractive ? handleKeyDown : onKeyDown}
        tabIndex={isInteractive && !disabled && !loading ? (tabIndex ?? 0) : tabIndex}
        role={isInteractive ? (role ?? 'button') : role}
        aria-disabled={disabled || loading || ariaDisabled}
        {...props}
      >
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-10">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card Header component
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Header content */
  children: React.ReactNode;
  /** Whether to show border */
  bordered?: boolean;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, className, bordered = true, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        cardHeaderVariants(),
        !bordered && 'border-b-0 bg-transparent',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

CardHeader.displayName = 'CardHeader';

// Card Body component
export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Body content */
  children: React.ReactNode;
  /** Custom padding */
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ children, className, padding = 'md', ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        cardBodyVariants(),
        padding === 'none' && 'p-0',
        padding === 'sm' && 'p-3',
        padding === 'md' && 'p-4',
        padding === 'lg' && 'p-6',
        padding === 'xl' && 'p-8',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

CardBody.displayName = 'CardBody';

// Card Footer component
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Footer content */
  children: React.ReactNode;
  /** Whether to show border */
  bordered?: boolean;
  /** Footer alignment */
  align?: 'left' | 'center' | 'right' | 'between';
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, className, bordered = true, align = 'between', ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        cardFooterVariants(),
        !bordered && 'border-t-0 bg-transparent',
        align === 'left' && 'justify-start',
        align === 'center' && 'justify-center',
        align === 'right' && 'justify-end',
        align === 'between' && 'justify-between',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

CardFooter.displayName = 'CardFooter';

// Card Title component
export interface CardTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof cardTitleVariants> {
  /** Title content */
  children: React.ReactNode;
  /** Heading level */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ children, className, size, as: Component = 'h3', ...props }, ref) => (
    <Component
      ref={ref}
      className={clsx(cardTitleVariants({ size }), className)}
      {...props}
    >
      {children}
    </Component>
  )
);

CardTitle.displayName = 'CardTitle';

// Card Description component
export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /** Description content */
  children: React.ReactNode;
}

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ children, className, ...props }, ref) => (
    <p
      ref={ref}
      className={clsx(cardDescriptionVariants(), className)}
      {...props}
    >
      {children}
    </p>
  )
);

CardDescription.displayName = 'CardDescription';

// Compound exports
export const CardComponent = Object.assign(Card, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
  Title: CardTitle,
  Description: CardDescription,
});

// Export card variants for external use
export { cardVariants, cardHeaderVariants, cardBodyVariants, cardFooterVariants };

// Default export as compound component
export default CardComponent;