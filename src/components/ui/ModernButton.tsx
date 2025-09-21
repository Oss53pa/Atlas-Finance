import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  rounded?: boolean;
}

const ModernButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      rounded = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      inline-flex items-center justify-center font-medium
      transition-all duration-200 ease-out
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      transform hover:transform hover:-translate-y-0.5
      active:transform active:translate-y-0
    `;

    const variants = {
      primary: `
        bg-[var(--color-primary)] text-[var(--color-text-inverse)]
        hover:bg-[var(--color-primary-hover)] hover:shadow-lg
        focus:ring-[var(--color-primary)]
      `,
      secondary: `
        bg-[var(--color-secondary)] text-[var(--color-text-inverse)]
        hover:opacity-90 hover:shadow-lg
        focus:ring-[var(--color-secondary)]
      `,
      outline: `
        bg-transparent border-2 border-[var(--color-border)]
        text-[var(--color-text-primary)]
        hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-primary)]
        hover:text-[var(--color-primary)]
        focus:ring-[var(--color-primary)]
      `,
      ghost: `
        bg-transparent text-[var(--color-text-secondary)]
        hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]
        focus:ring-[var(--color-primary)]
      `,
      danger: `
        bg-[var(--color-error)] text-white
        hover:bg-red-600 hover:shadow-lg
        focus:ring-[var(--color-error)]
      `,
      success: `
        bg-[var(--color-success)] text-white
        hover:bg-green-600 hover:shadow-lg
        focus:ring-[var(--color-success)]
      `
    };

    const sizes = {
      xs: 'text-xs px-2.5 py-1.5 rounded-md gap-1',
      sm: 'text-sm px-3 py-2 rounded-md gap-1.5',
      md: 'text-sm px-4 py-2.5 rounded-lg gap-2',
      lg: 'text-base px-5 py-3 rounded-lg gap-2.5',
      xl: 'text-lg px-6 py-3.5 rounded-xl gap-3'
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          rounded && 'rounded-full',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin" size={size === 'xs' ? 14 : size === 'sm' ? 16 : 18} />
            <span>Chargement...</span>
          </>
        ) : (
          <>
            {leftIcon}
            {children}
            {rightIcon}
          </>
        )}
      </button>
    );
  }
);

ModernButton.displayName = 'ModernButton';

export default ModernButton;