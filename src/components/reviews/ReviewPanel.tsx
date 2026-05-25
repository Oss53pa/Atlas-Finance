// @ts-nocheck
/**
 * ReviewPanel - Side panel showing review details and actions
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import type { ReportReview } from '@/types/review';
import { useReviewStore } from '@/stores/reviewStore';
import { ReviewStatusBadge, ReviewPriorityBadge, OverdueBadge } from './ReviewBadge';
import ReviewChecklist from './ReviewChecklist';
import ReviewDialog from './ReviewDialog';
import Button from '@/components/common/Button';
import {
  X,
  Play,
  CheckCircle,
  XCircle,
  RotateCcw,
  User,
  Calendar,
  Clock,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Ban,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface ReviewPanelProps {
  review: ReportReview;
  currentUserId: string;
  onClose: () => void;
  className?: string;
}

type DialogMode = 'approve' | 'reject' | 'request_changes' | null;

// ============================================================================
// Info Row Component
// ============================================================================

interface InfoRowProps {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}

const InfoRow: React.FC<InfoRowProps> = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 py-2">
    <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
    <div className="min-w-0 flex-1">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  </div>
);

// ============================================================================
// Main Panel Component
// ============================================================================

export const ReviewPanel: React.FC<ReviewPanelProps> = ({
  review,
  currentUserId,
  onClose,
  className,
}) => {
  const { t } = useTranslation();
  const [showChecklist, setShowChecklist] = useState(true);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);

  const {
    isSubmitting,
    startReview,
    approveReview,
    rejectReview,
    requestChanges,
    cancelReview,
    toggleChecklistItem,
    addChecklistNote,
    fetchReview,
  } = useReviewStore();

  // Check permissions
  const isReviewer = review.reviewer === currentUserId;
  const isRequester = review.requested_by === currentUserId;
  const canStart = review.status === 'pending' && isReviewer;
  const canDecide = review.status === 'in_progress' && isReviewer;
  const canCancel =
    ['pending', 'in_progress', 'changes_requested'].includes(review.status) && isRequester;
  const canEditChecklist = review.status === 'in_progress' && isReviewer;

  // Format date helper
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Action handlers
  const handleStartReview = async () => {
    await startReview(review.id);
  };

  const handleDecision = async (data: { comment?: string }) => {
    if (!dialogMode) return;
    switch (dialogMode) {
      case 'approve':
        await approveReview(review.id, data);
        break;
      case 'reject':
        await rejectReview(review.id, data);
        break;
      case 'request_changes':
        await requestChanges(review.id, data);
        break;
    }
    setDialogMode(null);
  };

  const handleCancel = async () => {
    if (window.confirm(t('reports.reviews.cancel.confirm'))) {
      await cancelReview(review.id);
    }
  };

  const handleToggleItem = async (itemId: string, isChecked: boolean) => {
    await toggleChecklistItem(review.id, itemId, isChecked);
  };

  const handleAddNote = async (itemId: string, note: string) => {
    await addChecklistNote(review.id, itemId, note);
  };

  // Refresh review data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      fetchReview(review.id);
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [review.id, fetchReview]);

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-white border-l border-gray-200',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h2 className="font-semibold text-gray-900">
          {t('reports.reviews.panel.title')}
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Status section */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <ReviewStatusBadge status={review.status} />
            <ReviewPriorityBadge priority={review.priority} />
            <OverdueBadge dueDate={review.due_date} status={review.status} />
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            {canStart && (
              <Button
                size="sm"
                onClick={handleStartReview}
                isLoading={isSubmitting}
                leftIcon={<Play className="w-4 h-4" />}
              >
                {t('reports.reviews.actions.start')}
              </Button>
            )}

            {canDecide && (
              <>
                <Button
                  size="sm"
                  onClick={() => setDialogMode('approve')}
                  disabled={!review.required_items_checked}
                  leftIcon={<CheckCircle className="w-4 h-4" />}
                >
                  {t('reports.reviews.actions.approve')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setDialogMode('request_changes')}
                  leftIcon={<RotateCcw className="w-4 h-4" />}
                >
                  {t('reports.reviews.actions.request_changes')}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setDialogMode('reject')}
                  leftIcon={<XCircle className="w-4 h-4" />}
                >
                  {t('reports.reviews.actions.reject')}
                </Button>
              </>
            )}

            {canCancel && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                isLoading={isSubmitting}
                leftIcon={<Ban className="w-4 h-4" />}
              >
                {t('reports.reviews.actions.cancel')}
              </Button>
            )}
          </div>

          {/* Approval blocked message */}
          {canDecide && !review.required_items_checked && (
            <div className="mt-3 flex items-center gap-2 p-2 text-sm text-orange-700 bg-orange-50 rounded-lg border border-orange-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{t('reports.reviews.checklist.required_incomplete')}</span>
            </div>
          )}
        </div>

        {/* Details section */}
        <div className="p-4 border-b border-gray-100 space-y-1">
          <InfoRow
            icon={User}
            label={t('reports.reviews.panel.requested_by')}
            value={review.requested_by_name}
          />
          <InfoRow
            icon={Clock}
            label={t('reports.reviews.panel.requested_at')}
            value={formatDate(review.requested_at)}
          />
          {review.reviewer_name && (
            <InfoRow
              icon={User}
              label={t('reports.reviews.panel.reviewer')}
              value={review.reviewer_name}
            />
          )}
          {review.due_date && (
            <InfoRow
              icon={Calendar}
              label={t('reports.reviews.panel.due_date')}
              value={formatDate(review.due_date)}
            />
          )}
          {review.started_at && (
            <InfoRow
              icon={Play}
              label={t('reports.reviews.panel.started_at')}
              value={formatDate(review.started_at)}
            />
          )}
          {review.decision_at && (
            <InfoRow
              icon={CheckCircle}
              label={t('reports.reviews.panel.decided_at')}
              value={formatDate(review.decision_at)}
            />
          )}
        </div>

        {/* Message section */}
        {review.message && (
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <MessageSquare className="w-4 h-4" />
              {t('reports.reviews.panel.message')}
            </div>
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
              {review.message}
            </div>
          </div>
        )}

        {/* Decision comment */}
        {review.decision_comment && (
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <MessageSquare className="w-4 h-4" />
              {t('reports.reviews.panel.decision_comment')}
            </div>
            <div
              className={cn(
                'p-3 rounded-lg text-sm',
                review.status === 'approved'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : review.status === 'rejected'
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : 'bg-orange-50 text-orange-800 border border-orange-200'
              )}
            >
              {review.decision_comment}
            </div>
          </div>
        )}

        {/* Checklist section */}
        {review.checklist_items.length > 0 && (
          <div className="p-4">
            <button
              onClick={() => setShowChecklist(!showChecklist)}
              className="flex items-center justify-between w-full mb-3"
            >
              <span className="font-medium text-gray-900">
                {t('reports.reviews.checklist.title')}
              </span>
              {showChecklist ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {showChecklist && (
              <ReviewChecklist
                items={review.checklist_items}
                reviewId={review.id}
                isEditable={canEditChecklist}
                onToggleItem={handleToggleItem}
                onAddNote={handleAddNote}
              />
            )}
          </div>
        )}
      </div>

      {/* Decision Dialog */}
      {dialogMode && (
        <ReviewDialog
          isOpen={true}
          onClose={() => setDialogMode(null)}
          mode={dialogMode}
          reportTitle={review.report_title}
          onSubmit={handleDecision}
          isLoading={isSubmitting}
        />
      )}
    </div>
  );
};

export default ReviewPanel;
