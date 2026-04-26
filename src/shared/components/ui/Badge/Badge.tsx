import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantClasses = {
  primary: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
  secondary: 'bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)]',
  success: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
  error: 'bg-[#ef4444]/10 text-[#ef4444]',
  warning: 'bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)]',
  info: 'bg-[var(--color-text-tertiary)]/10 text-[var(--color-text-tertiary)]',
  neutral: 'bg-[var(--color-border)] text-[#404040]',
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) => {
  return (
    <span
      className={`
        inline-flex items-center justify-center
        rounded-full font-medium
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {children}
    </span>
  );
};

Badge.displayName = 'Badge';