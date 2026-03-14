/**
 * ReviewDialog - Modal for submitting reports for review and making decisions
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import type { ReviewPriority, SubmitForReviewRequest } from '@/types/review';
import {
  Send,
  UserPlus,
  Calendar,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
  CheckCircle,
  XCircle,
  RotateCcw,
  MessageSquare,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

type DialogMode = 'submit' | 'approve' | 'reject' | 'request_changes' | 'assign';

interface ReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: DialogMode;
  reportTitle?: string;
  onSubmit: (data: SubmitForReviewRequest | { comment?: string } | { reviewer_id: string }) => Promise<void>;
  availableReviewers?: Array<{ id: string; name: string; email: string }>;
  isLoading?: boolean;
}

// ============================================================================
// Priority Selector
// ============================================================================

const PRIORITIES: ReviewPriority[] = ['low', 'normal', 'high', 'urgent'];

const PRIORITY_CONFIG: Record<
  ReviewPriority,
  { icon: React.ElementType; color: string }
> = {
  low: { icon: ArrowDown, color: 'text-gray-500' },
  normal: { icon: Minus, color: 'text-blue-500' },
  high: { icon: ArrowUp, color: 'text-orange-500' },
  urgent: { icon: AlertTriangle, color: 'text-red-500' },
};

interface PrioritySelectorProps {
  value: ReviewPriority;
  onChange: (priority: ReviewPriority) => void;
}

const PrioritySelector: React.FC<PrioritySelectorProps> = ({ value, onChange }) => {
  const { t } = useTranslation();

  return (
    <div className="flex gap-2">
      {PRIORITIES.map((priority) => {
        const { icon: Icon, color } = PRIORITY_CONFIG[priority];
        const isSelected = value === priority;

        return (
          <button
            key={priority}
            type="button"
            onClick={() => onChange(priority)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all',
              isSelected
                ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            )}
          >
            <Icon className={cn('w-4 h-4', color)} />
            <span
              className={cn(
                'text-sm font-medium',
                isSelected ? 'text-primary-700' : 'text-gray-700'
              )}
            >
              {t(`reports.reviews.priorities.${priority}`)}
            </span>
          </button>
        );
      })}
    </div>
  );
};

// ============================================================================
// Submit for Review Form
// ============================================================================

interface SubmitFormProps {
  onSubmit: (data: SubmitForReviewRequest) => Promise<void>;
  availableReviewers?: Array<{ id: string; name: string; email: string }>;
  isLoading: boolean;
  onCancel: () => void;
}

const SubmitForm: React.FC<SubmitFormProps> = ({
  onSubmit,
  availableReviewers = [],
  isLoading,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [priority, setPriority] = useState<ReviewPriority>('normal');
  const [message, setMessage] = useState('');
  const [reviewerId, setReviewerId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      priority,
      message: message || undefined,
      reviewer_id: reviewerId || undefined,
      due_date: dueDate || undefined,
    });
  };

  // Default due date to 3 days from now
  useEffect(() => {
    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + 3);
    setDueDate(defaultDue.toISOString().split('T')[0]);
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Priority */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('reports.reviews.submit.priority_label')}
        </label>
        <PrioritySelector value={priority} onChange={setPriority} />
      </div>

      {/* Message */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('reports.reviews.submit.message_label')}
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('reports.reviews.submit.message_placeholder')}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
        />
      </div>

      {/* Reviewer selection */}
      {availableReviewers.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <UserPlus className="w-4 h-4 inline mr-1" />
            {t('reports.reviews.submit.reviewer_label')}
          </label>
          <select
            value={reviewerId}
            onChange={(e) => setReviewerId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">{t('reports.reviews.submit.reviewer_auto')}</option>
            {availableReviewers.map((reviewer) => (
              <option key={reviewer.id} value={reviewer.id}>
                {reviewer.name} ({reviewer.email})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Due date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Calendar className="w-4 h-4 inline mr-1" />
          {t('reports.reviews.submit.due_date_label')}
        </label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" isLoading={isLoading} leftIcon={<Send className="w-4 h-4" />}>
          {t('reports.reviews.submit.submit_button')}
        </Button>
      </div>
    </form>
  );
};

// ============================================================================
// Decision Form (Approve/Reject/Request Changes)
// ============================================================================

interface DecisionFormProps {
  mode: 'approve' | 'reject' | 'request_changes';
  onSubmit: (data: { comment?: string }) => Promise<void>;
  isLoading: boolean;
  onCancel: () => void;
}

const DecisionForm: React.FC<DecisionFormProps> = ({
  mode,
  onSubmit,
  isLoading,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [comment, setComment] = useState('');

  const config = {
    approve: {
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      buttonVariant: 'primary' as const,
    },
    reject: {
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      buttonVariant: 'danger' as const,
    },
    request_changes: {
      icon: RotateCcw,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      buttonVariant: 'secondary' as const,
    },
  };

  const { icon: Icon, color, bgColor, buttonVariant } = config[mode];
  const isCommentRequired = mode !== 'approve';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCommentRequired && !comment.trim()) return;
    await onSubmit({ comment: comment || undefined });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Info box */}
      <div className={cn('flex items-start gap-3 p-4 rounded-lg', bgColor)}>
        <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', color)} />
        <p className={cn('text-sm', color)}>
          {t(`reports.reviews.decision.${mode}_info`)}
        </p>
      </div>

      {/* Comment */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <MessageSquare className="w-4 h-4 inline mr-1" />
          {t('reports.reviews.decision.comment_label')}
          {isCommentRequired && <span className="text-red-500 ml-1">*</span>}
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t(`reports.reviews.decision.${mode}_placeholder`)}
          rows={4}
          required={isCommentRequired}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
        />
        {isCommentRequired && (
          <p className="mt-1 text-xs text-gray-500">
            {t('reports.reviews.decision.comment_required')}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          variant={buttonVariant}
          isLoading={isLoading}
          leftIcon={<Icon className="w-4 h-4" />}
          disabled={isCommentRequired && !comment.trim()}
        >
          {t(`reports.reviews.decision.${mode}_button`)}
        </Button>
      </div>
    </form>
  );
};

// ============================================================================
// Assign Reviewer Form
// ============================================================================

interface AssignFormProps {
  onSubmit: (data: { reviewer_id: string }) => Promise<void>;
  availableReviewers: Array<{ id: string; name: string; email: string }>;
  isLoading: boolean;
  onCancel: () => void;
}

const AssignForm: React.FC<AssignFormProps> = ({
  onSubmit,
  availableReviewers,
  isLoading,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [reviewerId, setReviewerId] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewerId) return;
    await onSubmit({ reviewer_id: reviewerId });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Reviewer selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <UserPlus className="w-4 h-4 inline mr-1" />
          {t('reports.reviews.assign.reviewer_label')}
        </label>
        <select
          value={reviewerId}
          onChange={(e) => setReviewerId(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">{t('reports.reviews.assign.select_reviewer')}</option>
          {availableReviewers.map((reviewer) => (
            <option key={reviewer.id} value={reviewer.id}>
              {reviewer.name} ({reviewer.email})
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          isLoading={isLoading}
          leftIcon={<UserPlus className="w-4 h-4" />}
          disabled={!reviewerId}
        >
          {t('reports.reviews.assign.assign_button')}
        </Button>
      </div>
    </form>
  );
};

// ============================================================================
// Main Dialog Component
// ============================================================================

const MODAL_TITLES: Record<DialogMode, string> = {
  submit: 'reports.reviews.submit.title',
  approve: 'reports.reviews.decision.approve_title',
  reject: 'reports.reviews.decision.reject_title',
  request_changes: 'reports.reviews.decision.request_changes_title',
  assign: 'reports.reviews.assign.title',
};

export const ReviewDialog: React.FC<ReviewDialogProps> = ({
  isOpen,
  onClose,
  mode,
  reportTitle,
  onSubmit,
  availableReviewers = [],
  isLoading = false,
}) => {
  const { t } = useTranslation();

  const handleSubmit = async (data: unknown) => {
    await onSubmit(data as SubmitForReviewRequest | { comment?: string } | { reviewer_id: string });
    onClose();
  };

  const title = t(MODAL_TITLES[mode]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      {/* Report title context */}
      {reportTitle && (
        <div className="mb-4 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">{t('reports.reviews.report')}</p>
          <p className="font-medium text-gray-900">{reportTitle}</p>
        </div>
      )}

      {/* Form based on mode */}
      {mode === 'submit' && (
        <SubmitForm
          onSubmit={handleSubmit}
          availableReviewers={availableReviewers}
          isLoading={isLoading}
          onCancel={onClose}
        />
      )}

      {(mode === 'approve' || mode === 'reject' || mode === 'request_changes') && (
        <DecisionForm
          mode={mode}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          onCancel={onClose}
        />
      )}

      {mode === 'assign' && (
        <AssignForm
          onSubmit={handleSubmit}
          availableReviewers={availableReviewers}
          isLoading={isLoading}
          onCancel={onClose}
        />
      )}
    </Modal>
  );
};

export default ReviewDialog;
