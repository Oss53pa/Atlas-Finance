import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantClasses = {
  primary: 'bg-[#6A8A82]/10 text-[#6A8A82]',
  secondary: 'bg-[#B87333]/10 text-[#B87333]',
  success: 'bg-[#6A8A82]/10 text-[#6A8A82]',
  error: 'bg-[#B85450]/10 text-[#B85450]',
  warning: 'bg-[#B87333]/10 text-[#B87333]',
  info: 'bg-[#7A99AC]/10 text-[#7A99AC]',
  neutral: 'bg-[#ECECEC] text-[#444444]',
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