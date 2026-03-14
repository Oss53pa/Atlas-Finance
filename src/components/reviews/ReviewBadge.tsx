/**
 * ReviewBadge - Status and priority badges for reviews
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import type { ReviewStatus, ReviewPriority } from '@/types/review';
import {
  Clock,
  Play,
  RotateCcw,
  CheckCircle,
  XCircle,
  Ban,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface ReviewStatusBadgeProps {
  status: ReviewStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

interface ReviewPriorityBadgeProps {
  priority: ReviewPriority;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

// ============================================================================
// Status Badge
// ============================================================================

const STATUS_CONFIG: Record<
  ReviewStatus,
  {
    icon: React.ElementType;
    bgColor: string;
    textColor: string;
    borderColor: string;
  }
> = {
  pending: {
    icon: Clock,
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
  },
  in_progress: {
    icon: Play,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
  },
  changes_requested: {
    icon: RotateCcw,
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
  },
  approved: {
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
  },
  rejected: {
    icon: XCircle,
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
  },
  cancelled: {
    icon: Ban,
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-600',
    borderColor: 'border-gray-200',
  },
};

export const ReviewStatusBadge: React.FC<ReviewStatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  className,
}) => {
  const { t } = useTranslation();
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-sm gap-1.5',
    lg: 'px-3 py-1.5 text-base gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        config.bgColor,
        config.textColor,
        config.borderColor,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>{t(`reports.reviews.statuses.${status}`)}</span>
    </span>
  );
};

// ============================================================================
// Priority Badge
// ============================================================================

const PRIORITY_CONFIG: Record<
  ReviewPriority,
  {
    icon: React.ElementType;
    bgColor: string;
    textColor: string;
    borderColor: string;
  }
> = {
  low: {
    icon: ArrowDown,
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-600',
    borderColor: 'border-gray-200',
  },
  normal: {
    icon: Minus,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
  },
  high: {
    icon: ArrowUp,
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
  },
  urgent: {
    icon: AlertTriangle,
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
  },
};

export const ReviewPriorityBadge: React.FC<ReviewPriorityBadgeProps> = ({
  priority,
  size = 'md',
  showIcon = true,
  className,
}) => {
  const { t } = useTranslation();
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.normal;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-sm gap-1.5',
    lg: 'px-3 py-1.5 text-base gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        config.bgColor,
        config.textColor,
        config.borderColor,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>{t(`reports.reviews.priorities.${priority}`)}</span>
    </span>
  );
};

// ============================================================================
// Overdue Badge
// ============================================================================

interface OverdueBadgeProps {
  dueDate: string | null;
  status: ReviewStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const OverdueBadge: React.FC<OverdueBadgeProps> = ({
  dueDate,
  status,
  size = 'md',
  className,
}) => {
  const { t } = useTranslation();

  if (!dueDate) return null;

  // Don't show overdue for completed reviews
  if (['approved', 'rejected', 'cancelled'].includes(status)) return null;

  const now = new Date();
  const due = new Date(dueDate);
  const isOverdue = due < now;

  if (!isOverdue) return null;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-sm gap-1.5',
    lg: 'px-3 py-1.5 text-base gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        'bg-red-100 text-red-800 border-red-300',
        sizeClasses[size],
        className
      )}
    >
      <Clock className={cn(iconSizes[size], 'animate-pulse')} />
      <span>{t('reports.reviews.overdue')}</span>
    </span>
  );
};

// ============================================================================
// Completion Progress Badge
// ============================================================================

interface CompletionBadgeProps {
  percentage: number;
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  className?: string;
}

export const CompletionBadge: React.FC<CompletionBadgeProps> = ({
  percentage,
  size = 'md',
  showPercentage = true,
  className,
}) => {
  const sizeClasses = {
    sm: 'h-1.5 w-16',
    md: 'h-2 w-20',
    lg: 'h-2.5 w-24',
  };

  const getColor = () => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'rounded-full bg-gray-200 overflow-hidden',
          sizeClasses[size]
        )}
      >
        <div
          className={cn('h-full rounded-full transition-all', getColor())}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
      {showPercentage && (
        <span className="text-xs text-gray-600 font-medium">{percentage}%</span>
      )}
    </div>
  );
};

// ============================================================================
// Export default combined component
// ============================================================================

export default ReviewStatusBadge;
