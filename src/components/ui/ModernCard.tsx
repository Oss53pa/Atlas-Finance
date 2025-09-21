import React from 'react';
import { cn } from '../../lib/utils';
import { LucideIcon } from 'lucide-react';

interface ModernCardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  bordered?: boolean;
  elevated?: boolean;
  gradient?: boolean;
  onClick?: () => void;
}

export const ModernCard: React.FC<ModernCardProps> = ({
  children,
  className,
  hoverable = false,
  bordered = true,
  elevated = false,
  gradient = false,
  onClick
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-[var(--color-surface)] rounded-xl transition-all duration-300',
        bordered && 'border border-[var(--color-border)]',
        elevated && 'shadow-[var(--shadow-md)]',
        hoverable && 'hover:shadow-[var(--shadow-lg)] hover:-translate-y-1 cursor-pointer',
        gradient && 'bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-hover)]',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  action,
  className
}) => {
  return (
    <div className={cn('p-4 border-b border-[var(--color-border-light)]', className)}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {Icon && (
            <div className="p-2 bg-[var(--color-primary-light)] rounded-lg">
              <Icon className="w-4 h-4 text-[var(--color-primary)]" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h3>
            {subtitle && (
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{subtitle}</p>
            )}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
};

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const CardBody: React.FC<CardBodyProps> = ({
  children,
  className,
  noPadding = false
}) => {
  return (
    <div className={cn(!noPadding && 'p-4', className)}>
      {children}
    </div>
  );
};

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
  bordered?: boolean;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className,
  bordered = true
}) => {
  return (
    <div className={cn(
      'px-4 py-3',
      bordered && 'border-t border-[var(--color-border-light)] bg-[var(--color-surface-hover)]',
      'rounded-b-xl',
      className
    )}>
      {children}
    </div>
  );
};

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon?: LucideIcon;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  color = 'primary',
  className
}) => {
  const colorClasses = {
    primary: 'bg-[var(--color-primary-light)] text-[var(--color-primary)]',
    success: 'bg-[var(--color-success-light)] text-[var(--color-success)]',
    warning: 'bg-[var(--color-warning-light)] text-[var(--color-warning)]',
    error: 'bg-[var(--color-error-light)] text-[var(--color-error)]',
    info: 'bg-[var(--color-info-light)] text-[var(--color-info)]'
  };

  return (
    <ModernCard className={cn('p-4', className)} hoverable>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">{title}</p>
          <p className="mt-2 text-3xl font-bold text-[var(--color-text-primary)]">{value}</p>
          {change && (
            <div className="mt-3 flex items-center gap-2">
              <span className={cn(
                'text-sm font-medium',
                change.type === 'increase' ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
              )}>
                {change.type === 'increase' ? '↑' : '↓'} {Math.abs(change.value)}%
              </span>
              <span className="text-xs text-[var(--color-text-tertiary)]">vs période précédente</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn('p-2.5 rounded-lg', colorClasses[color])}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </ModernCard>
  );
};

export default ModernCard;