/**
 * Atlas Finance Design System - Panel Component
 * Flexible panel component for layout sections and content areas
 */

import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { cva, type VariantProps } from 'class-variance-authority';
import { theme } from '../theme';

// Panel variants
const panelVariants = cva(
  [
    'rounded-lg border',
    'transition-all duration-200',
  ],
  {
    variants: {
      variant: {
        default: 'bg-white border-neutral-200 shadow-sm',
        outlined: 'bg-white border-neutral-300 shadow-none',
        filled: 'bg-neutral-50 border-neutral-200 shadow-none',
        elevated: 'bg-white border-neutral-200 shadow-md',
        ghost: 'bg-transparent border-transparent shadow-none',
        primary: 'bg-primary-50 border-primary-200 shadow-none',
        secondary: 'bg-secondary-50 border-secondary-200 shadow-none',
        success: 'bg-green-50 border-green-200 shadow-none',
        warning: 'bg-yellow-50 border-yellow-200 shadow-none',
        error: 'bg-red-50 border-red-200 shadow-none',
      },
      padding: {
        none: 'p-0',
        xs: 'p-2',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
        xl: 'p-8',
      },
      spacing: {
        none: 'space-y-0',
        xs: 'space-y-1',
        sm: 'space-y-2',
        md: 'space-y-3',
        lg: 'space-y-4',
        xl: 'space-y-6',
      },
      collapsible: {
        true: 'overflow-hidden',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
      spacing: 'md',
      collapsible: false,
    },
  }
);

// Panel header variants
const panelHeaderVariants = cva([
  'flex items-center justify-between',
  'border-b border-neutral-200',
  'px-4 py-3',
  'bg-neutral-50 rounded-t-lg',
]);

// Panel body variants
const panelBodyVariants = cva([
  'flex-1',
]);

// Panel footer variants
const panelFooterVariants = cva([
  'border-t border-neutral-200',
  'px-4 py-3',
  'bg-neutral-50 rounded-b-lg',
  'flex items-center justify-between',
]);

// Panel title variants
const panelTitleVariants = cva(
  ['font-medium text-neutral-900'],
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

// Collapse/Expand icons
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const ChevronUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

// Panel component props
export interface PanelProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof panelVariants> {
  /** Panel content */
  children: React.ReactNode;
  /** Whether the panel is collapsible */
  collapsible?: boolean;
  /** Whether the panel is collapsed (for collapsible panels) */
  collapsed?: boolean;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
  /** Callback when collapse state changes */
  onCollapseChange?: (collapsed: boolean) => void;
  /** Loading state */
  loading?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * Panel component for layout sections and content areas
 *
 * Features:
 * - Multiple variants with semantic colors
 * - Flexible padding and spacing options
 * - Collapsible functionality
 * - Loading and disabled states
 * - Accessibility support
 * - Keyboard navigation for collapsible panels
 *
 * @example
 * ```tsx
 * <Panel variant="outlined" collapsible defaultCollapsed={false}>
 *   <PanelHeader>
 *     <PanelTitle>Settings</PanelTitle>
 *   </PanelHeader>
 *   <PanelBody>
 *     <p>Panel content goes here...</p>
 *   </PanelBody>
 * </Panel>
 * ```
 */
export const Panel = forwardRef<HTMLDivElement, PanelProps>(
  (
    {
      children,
      className,
      variant,
      padding,
      spacing,
      collapsible: collapsibleProp = false,
      collapsed: controlledCollapsed,
      defaultCollapsed = false,
      onCollapseChange,
      loading = false,
      disabled = false,
      'aria-expanded': ariaExpanded,
      'aria-controls': ariaControls,
      'aria-labelledby': ariaLabelledBy,
      ...props
    },
    ref
  ) => {
    const [internalCollapsed, setInternalCollapsed] = React.useState(defaultCollapsed);

    // Use controlled or uncontrolled collapsed state
    const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

    // Handle collapse toggle
    const handleCollapseToggle = () => {
      if (disabled || loading) return;

      const newCollapsed = !isCollapsed;

      if (controlledCollapsed === undefined) {
        setInternalCollapsed(newCollapsed);
      }

      onCollapseChange?.(newCollapsed);
    };

    // Generate unique IDs for accessibility
    const panelId = React.useId();
    const contentId = `${panelId}-content`;

    // Process children to enhance headers with collapse functionality
    const enhancedChildren = React.Children.map(children, (child) => {
      if (React.isValidElement(child) && child.type === PanelHeader && collapsibleProp) {
        return React.cloneElement(child, {
          ...child.props,
          collapsible: true,
          collapsed: isCollapsed,
          onToggle: handleCollapseToggle,
          disabled: disabled || loading,
          'aria-expanded': ariaExpanded ?? !isCollapsed,
          'aria-controls': ariaControls ?? contentId,
        });
      }
      return child;
    });

    return (
      <div
        ref={ref}
        className={clsx(
          panelVariants({ variant, padding, spacing, collapsible: collapsibleProp }),
          loading && 'opacity-60 pointer-events-none',
          disabled && 'opacity-50 pointer-events-none',
          className
        )}
        aria-labelledby={ariaLabelledBy}
        {...props}
      >
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-10 rounded-lg">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {enhancedChildren}
      </div>
    );
  }
);

Panel.displayName = 'Panel';

// Panel Header component
export interface PanelHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Header content */
  children: React.ReactNode;
  /** Whether to show border */
  bordered?: boolean;
  /** Internal: collapsible state */
  collapsible?: boolean;
  /** Internal: collapsed state */
  collapsed?: boolean;
  /** Internal: toggle handler */
  onToggle?: () => void;
  /** Internal: disabled state */
  disabled?: boolean;
}

export const PanelHeader = forwardRef<HTMLDivElement, PanelHeaderProps>(
  (
    {
      children,
      className,
      bordered = true,
      collapsible = false,
      collapsed = false,
      onToggle,
      disabled = false,
      onClick,
      onKeyDown,
      'aria-expanded': ariaExpanded,
      'aria-controls': ariaControls,
      ...props
    },
    ref
  ) => {
    // Handle click for collapsible headers
    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
      if (collapsible && !disabled) {
        onToggle?.();
      }
      onClick?.(event);
    };

    // Handle keyboard navigation for collapsible headers
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (collapsible && !disabled && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        onToggle?.();
      }
      onKeyDown?.(event);
    };

    return (
      <div
        ref={ref}
        className={clsx(
          panelHeaderVariants(),
          !bordered && 'border-b-0 bg-transparent',
          collapsible && !disabled && 'cursor-pointer hover:bg-neutral-100',
          collapsible && 'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset',
          className
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={collapsible && !disabled ? 0 : undefined}
        role={collapsible ? 'button' : undefined}
        aria-expanded={collapsible ? (ariaExpanded ?? !collapsed) : undefined}
        aria-controls={collapsible ? ariaControls : undefined}
        {...props}
      >
        <div className="flex-1 min-w-0">
          {children}
        </div>

        {/* Collapse/Expand Icon */}
        {collapsible && (
          <div className="ml-4 flex-shrink-0">
            {collapsed ? (
              <ChevronDownIcon className="w-5 h-5 text-neutral-500" />
            ) : (
              <ChevronUpIcon className="w-5 h-5 text-neutral-500" />
            )}
          </div>
        )}
      </div>
    );
  }
);

PanelHeader.displayName = 'PanelHeader';

// Panel Body component
export interface PanelBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Body content */
  children: React.ReactNode;
  /** Custom padding */
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Whether to hide content (for collapsible panels) */
  hidden?: boolean;
}

export const PanelBody = forwardRef<HTMLDivElement, PanelBodyProps>(
  ({ children, className, padding = 'md', hidden = false, ...props }, ref) => {
    if (hidden) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={clsx(
          panelBodyVariants(),
          padding === 'none' && 'p-0',
          padding === 'xs' && 'p-2',
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
    );
  }
);

PanelBody.displayName = 'PanelBody';

// Panel Footer component
export interface PanelFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Footer content */
  children: React.ReactNode;
  /** Whether to show border */
  bordered?: boolean;
  /** Footer alignment */
  align?: 'left' | 'center' | 'right' | 'between';
}

export const PanelFooter = forwardRef<HTMLDivElement, PanelFooterProps>(
  ({ children, className, bordered = true, align = 'between', ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        panelFooterVariants(),
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

PanelFooter.displayName = 'PanelFooter';

// Panel Title component
export interface PanelTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof panelTitleVariants> {
  /** Title content */
  children: React.ReactNode;
  /** Heading level */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export const PanelTitle = forwardRef<HTMLHeadingElement, PanelTitleProps>(
  ({ children, className, size, as: Component = 'h3', id, ...props }, ref) => {
    const titleId = id || React.useId();

    return (
      <Component
        ref={ref}
        id={titleId}
        className={clsx(panelTitleVariants({ size }), className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

PanelTitle.displayName = 'PanelTitle';

// Collapsible Panel wrapper
export interface CollapsiblePanelProps extends Omit<PanelProps, 'collapsible'> {
  /** Panel title */
  title?: React.ReactNode;
  /** Title size */
  titleSize?: 'sm' | 'md' | 'lg' | 'xl';
  /** Header actions */
  headerActions?: React.ReactNode;
  /** Body content */
  children: React.ReactNode;
  /** Footer content */
  footer?: React.ReactNode;
}

/**
 * Collapsible Panel - A convenience wrapper for common collapsible panel patterns
 *
 * @example
 * ```tsx
 * <CollapsiblePanel
 *   title="Advanced Settings"
 *   defaultCollapsed={true}
 *   variant="outlined"
 * >
 *   <p>Panel content...</p>
 * </CollapsiblePanel>
 * ```
 */
export const CollapsiblePanel = forwardRef<HTMLDivElement, CollapsiblePanelProps>(
  (
    {
      title,
      titleSize = 'md',
      headerActions,
      children,
      footer,
      collapsed,
      defaultCollapsed,
      onCollapseChange,
      ...panelProps
    },
    ref
  ) => {
    const [internalCollapsed, setInternalCollapsed] = React.useState(defaultCollapsed ?? false);
    const isCollapsed = collapsed !== undefined ? collapsed : internalCollapsed;

    const handleCollapseChange = (newCollapsed: boolean) => {
      if (collapsed === undefined) {
        setInternalCollapsed(newCollapsed);
      }
      onCollapseChange?.(newCollapsed);
    };

    return (
      <Panel
        ref={ref}
        collapsible
        collapsed={isCollapsed}
        onCollapseChange={handleCollapseChange}
        {...panelProps}
      >
        <PanelHeader>
          <div className="flex items-center justify-between w-full">
            {title && (
              <PanelTitle size={titleSize}>
                {title}
              </PanelTitle>
            )}
            {headerActions && (
              <div className="ml-4">
                {headerActions}
              </div>
            )}
          </div>
        </PanelHeader>

        <PanelBody hidden={isCollapsed}>
          {children}
        </PanelBody>

        {footer && !isCollapsed && (
          <PanelFooter>
            {footer}
          </PanelFooter>
        )}
      </Panel>
    );
  }
);

CollapsiblePanel.displayName = 'CollapsiblePanel';

// Compound exports
export const PanelComponent = Object.assign(Panel, {
  Header: PanelHeader,
  Body: PanelBody,
  Footer: PanelFooter,
  Title: PanelTitle,
  Collapsible: CollapsiblePanel,
});

// Export panel variants for external use
export { panelVariants, panelHeaderVariants, panelBodyVariants, panelFooterVariants };

// Default export as compound component
export default PanelComponent;