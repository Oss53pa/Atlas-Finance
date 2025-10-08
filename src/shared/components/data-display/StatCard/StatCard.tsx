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
    bg: 'bg-[#6A8A82]/10',
    text: 'text-[#6A8A82]',
    icon: 'text-[#6A8A82]',
  },
  secondary: {
    bg: 'bg-[#B87333]/10',
    text: 'text-[#B87333]',
    icon: 'text-[#B87333]',
  },
  success: {
    bg: 'bg-[#6A8A82]/10',
    text: 'text-[#6A8A82]',
    icon: 'text-[#6A8A82]',
  },
  warning: {
    bg: 'bg-[#B87333]/10',
    text: 'text-[#B87333]',
    icon: 'text-[#B87333]',
  },
  error: {
    bg: 'bg-[#B85450]/10',
    text: 'text-[#B85450]',
    icon: 'text-[#B85450]',
  },
  info: {
    bg: 'bg-[#7A99AC]/10',
    text: 'text-[#7A99AC]',
    icon: 'text-[#7A99AC]',
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
      <div className={`bg-white rounded-lg border border-[#D9D9D9] p-6 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-[#ECECEC] rounded w-1/2" />
          <div className="h-8 bg-[#ECECEC] rounded w-3/4" />
          <div className="h-3 bg-[#ECECEC] rounded w-1/3" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        bg-white rounded-lg border border-[#D9D9D9] p-6
        hover:shadow-md transition-all duration-200
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-xs font-medium text-[#767676] uppercase tracking-wider mb-2">
            {title}
          </p>
          <p className="text-3xl font-bold text-[#191919]">
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
          <p className="text-sm text-[#767676]">{subtitle}</p>
        )}
        {trend && (
          <div
            className={`
              inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium
              ${trend.isPositive ? 'bg-[#6A8A82]/10 text-[#6A8A82]' : 'bg-[#B85450]/10 text-[#B85450]'}
            `}
          >
            {trend.isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>{trend.value}</span>
            {trend.label && <span className="text-[#767676]">· {trend.label}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

StatCard.displayName = 'StatCard';