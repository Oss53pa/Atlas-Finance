import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: string | number;
    isPositive?: boolean;
    label?: string;
  };
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

const colorVariants = {
  primary: {
    bg: 'bg-neutral-100',
    text: 'text-neutral-700',
    icon: 'text-neutral-700',
  },
  secondary: {
    bg: 'bg-neutral-100',
    text: 'text-neutral-600',
    icon: 'text-neutral-600',
  },
  success: {
    bg: 'bg-neutral-100',
    text: 'text-neutral-700',
    icon: 'text-neutral-700',
  },
  warning: {
    bg: 'bg-neutral-100',
    text: 'text-neutral-600',
    icon: 'text-neutral-600',
  },
  error: {
    bg: 'bg-neutral-100',
    text: 'text-neutral-600',
    icon: 'text-neutral-600',
  },
  info: {
    bg: 'bg-neutral-100',
    text: 'text-neutral-600',
    icon: 'text-neutral-600',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'primary',
  loading = false,
  onClick,
  className = '',
}) => {
  const colors = colorVariants[color];

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-[#d4d4d4] p-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-[#e5e5e5] rounded w-1/2" />
          <div className="h-8 bg-[#e5e5e5] rounded w-3/4" />
          <div className="h-3 bg-[#e5e5e5] rounded w-1/3" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        bg-white rounded-lg border border-[#d4d4d4] p-4
        hover:shadow-md transition-all duration-200
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-xs font-medium text-[#737373] uppercase tracking-wider mb-2">
            {title}
          </p>
          <p className="text-lg font-bold text-[#171717]">
            {value}
          </p>
        </div>
        {Icon && (
          <div className={`p-3 rounded-lg ${colors.bg}`}>
            <Icon className={`h-6 w-6 ${colors.icon}`} />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        {subtitle && (
          <p className="text-sm text-[#737373]">{subtitle}</p>
        )}
        {trend && (
          <div
            className={`
              inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium
              ${trend.isPositive ? 'bg-neutral-100 text-neutral-700' : 'bg-neutral-100 text-neutral-500'}
            `}
          >
            {trend.isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>{trend.value}</span>
            {trend.label && <span className="text-[#737373]">· {trend.label}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

StatCard.displayName = 'StatCard';