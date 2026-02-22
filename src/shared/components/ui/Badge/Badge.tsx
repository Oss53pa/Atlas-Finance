import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantClasses = {
  primary: 'bg-[#171717]/10 text-[#171717]',
  secondary: 'bg-[#525252]/10 text-[#525252]',
  success: 'bg-[#171717]/10 text-[#171717]',
  error: 'bg-[#ef4444]/10 text-[#ef4444]',
  warning: 'bg-[#525252]/10 text-[#525252]',
  info: 'bg-[#737373]/10 text-[#737373]',
  neutral: 'bg-[#e5e5e5] text-[#404040]',
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