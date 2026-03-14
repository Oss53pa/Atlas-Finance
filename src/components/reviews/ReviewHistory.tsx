/**
 * ReviewHistory - Timeline of all reviews for a report
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import type { ReportReviewListItem } from '@/types/review';
import * as reviewService from '@/services/reviewService';
import { ReviewStatusBadge, ReviewPriorityBadge } from './ReviewBadge';
import {
  Clock,
  Play,
  CheckCircle,
  XCircle,
  RotateCcw,
  Ban,
  User,
  Calendar,
  FileText,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface ReviewHistoryProps {
  reportId: string;
  onSelectReview?: (reviewId: string) => void;
  className?: string;
}

// ============================================================================
// Timeline Item Component
// ============================================================================

interface TimelineItemProps {
  review: ReportReviewListItem;
  isLast: boolean;
  onClick?: () => void;
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  pending: Clock,
  in_progress: Play,
  changes_requested: RotateCcw,
  approved: CheckCircle,
  rejected: XCircle,
  cancelled: Ban,
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-600',
  in_progress: 'bg-blue-100 text-blue-600',
  changes_requested: 'bg-orange-100 text-orange-600',
  approved: 'bg-green-100 text-green-600',
  rejected: 'bg-red-100 text-red-600',
  cancelled: 'bg-gray-100 text-gray-500',
};

const TimelineItem: React.FC<TimelineItemProps> = ({ review, isLast, onClick }) => {
  const { t } = useTranslation();
  const Icon = STATUS_ICONS[review.status] || Clock;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="relative flex gap-4">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-5 top-10 bottom-0 w-px bg-gray-200" />
      )}

      {/* Status icon */}
      <div
        className={cn(
          'relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
          STATUS_COLORS[review.status]
        )}
      >
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div
        className={cn(
          'flex-1 pb-6 cursor-pointer group',
          onClick && 'hover:bg-gray-50 -ml-2 pl-2 -mr-2 pr-2 rounded-lg transition-colors'
        )}
        onClick={onClick}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ReviewStatusBadge status={review.status} size="sm" showIcon={false} />
              <ReviewPriorityBadge priority={review.priority} size="sm" showIcon={false} />
            </div>

            <p className="text-sm text-gray-900 font-medium">
              {t(`reports.reviews.history.${review.status}_by`, {
                name: review.requested_by_name,
              })}
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(review.requested_at)}
              </span>

              {review.reviewer_name && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {t('reports.reviews.history.reviewer')}: {review.reviewer_name}
                </span>
              )}

              {review.completion_percentage > 0 && (
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {review.completion_percentage}% {t('reports.reviews.history.complete')}
                </span>
              )}
            </div>
          </div>

          {onClick && (
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Main History Component
// ============================================================================

export const ReviewHistory: React.FC<ReviewHistoryProps> = ({
  reportId,
  onSelectReview,
  className,
}) => {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<ReportReviewListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReviews = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await reviewService.getReportReviews(reportId);
        setReviews(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reviews');
      } finally {
        setIsLoading(false);
      }
    };

    loadReviews();
  }, [reportId]);

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          'flex items-center justify-center gap-2 py-8 text-red-600',
          className
        )}
      >
        <AlertCircle className="w-5 h-5" />
        <span>{error}</span>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <Clock className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">{t('reports.reviews.history.empty')}</p>
        <p className="text-sm text-gray-400 mt-1">
          {t('reports.reviews.history.empty_hint')}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-0', className)}>
      <h3 className="font-semibold text-gray-900 mb-4">
        {t('reports.reviews.history.title')}
      </h3>

      <div className="relative">
        {reviews.map((review, index) => (
          <TimelineItem
            key={review.id}
            review={review}
            isLast={index === reviews.length - 1}
            onClick={onSelectReview ? () => onSelectReview(review.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
};

export default ReviewHistory;
