/**
 * ReviewChecklist - Interactive checklist for review process
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import type { ReviewChecklistItem } from '@/types/review';
import {
  Check,
  Square,
  CheckSquare,
  AlertCircle,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  User,
  Clock,
} from 'lucide-react';
import Button from '@/components/common/Button';

// ============================================================================
// Types
// ============================================================================

interface ReviewChecklistProps {
  items: ReviewChecklistItem[];
  reviewId: string;
  isEditable?: boolean;
  onToggleItem?: (itemId: string, isChecked: boolean) => Promise<void>;
  onAddNote?: (itemId: string, note: string) => Promise<void>;
  className?: string;
}

interface ChecklistItemProps {
  item: ReviewChecklistItem;
  isEditable: boolean;
  onToggle?: (isChecked: boolean) => Promise<void>;
  onAddNote?: (note: string) => Promise<void>;
}

// ============================================================================
// Checklist Item Component
// ============================================================================

const ChecklistItem: React.FC<ChecklistItemProps> = ({
  item,
  isEditable,
  onToggle,
  onAddNote,
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  const handleToggle = async () => {
    if (!isEditable || !onToggle) return;
    setIsLoading(true);
    try {
      await onToggle(!item.is_checked);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!onAddNote || !noteText.trim()) return;
    setIsLoading(true);
    try {
      await onAddNote(noteText.trim());
      setNoteText('');
      setShowNoteInput(false);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className={cn(
        'border rounded-lg transition-all',
        item.is_checked
          ? 'border-green-200 bg-green-50/50'
          : item.is_required
          ? 'border-orange-200 bg-orange-50/30'
          : 'border-gray-200 bg-white'
      )}
    >
      {/* Main row */}
      <div className="flex items-start gap-3 p-3">
        {/* Checkbox */}
        <button
          onClick={handleToggle}
          disabled={!isEditable || isLoading}
          className={cn(
            'flex-shrink-0 mt-0.5 transition-colors',
            isEditable ? 'cursor-pointer hover:opacity-80' : 'cursor-default',
            isLoading && 'opacity-50'
          )}
        >
          {item.is_checked ? (
            <CheckSquare className="w-5 h-5 text-green-600" />
          ) : (
            <Square className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'font-medium',
                item.is_checked ? 'text-green-700 line-through' : 'text-gray-900'
              )}
            >
              {item.label}
            </span>
            {item.is_required && !item.is_checked && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium text-orange-700 bg-orange-100 rounded">
                <AlertCircle className="w-3 h-3" />
                {t('reports.reviews.checklist.required')}
              </span>
            )}
          </div>

          {item.description && (
            <p className="mt-1 text-sm text-gray-600">{item.description}</p>
          )}

          {/* Checked info */}
          {item.is_checked && item.checked_at && (
            <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
              {item.checked_by_name && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {item.checked_by_name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(item.checked_at)}
              </span>
            </div>
          )}

          {/* Note display */}
          {item.note && (
            <div className="mt-2 p-2 bg-white border border-gray-200 rounded text-sm text-gray-700">
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <MessageSquare className="w-3 h-3" />
                {t('reports.reviews.checklist.note')}
              </div>
              {item.note}
            </div>
          )}
        </div>

        {/* Expand/Actions toggle */}
        {(item.description || isEditable) && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Expanded section - Add note */}
      {isExpanded && isEditable && (
        <div className="px-3 pb-3 pt-0 border-t border-gray-100">
          {showNoteInput ? (
            <div className="mt-3 space-y-2">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder={t('reports.reviews.checklist.add_note_placeholder')}
                className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                rows={2}
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  isLoading={isLoading}
                  disabled={!noteText.trim()}
                >
                  {t('common.save')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowNoteInput(false);
                    setNoteText('');
                  }}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNoteInput(true)}
              className="mt-3 flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700"
            >
              <MessageSquare className="w-4 h-4" />
              {item.note
                ? t('reports.reviews.checklist.edit_note')
                : t('reports.reviews.checklist.add_note')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Main Checklist Component
// ============================================================================

export const ReviewChecklist: React.FC<ReviewChecklistProps> = ({
  items,
  reviewId,
  isEditable = false,
  onToggleItem,
  onAddNote,
  className,
}) => {
  const { t } = useTranslation();

  // Sort items by order
  const sortedItems = [...items].sort((a, b) => a.order - b.order);

  // Calculate progress
  const totalItems = items.length;
  const checkedItems = items.filter((item) => item.is_checked).length;
  const requiredItems = items.filter((item) => item.is_required);
  const requiredChecked = requiredItems.filter((item) => item.is_checked).length;
  const allRequiredChecked = requiredItems.every((item) => item.is_checked);

  const percentage = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  if (items.length === 0) {
    return (
      <div className={cn('text-center py-8 text-gray-500', className)}>
        <Check className="w-12 h-12 mx-auto text-gray-300 mb-2" />
        <p>{t('reports.reviews.checklist.no_items')}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Progress header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">
            {t('reports.reviews.checklist.title')}
          </h3>
          <span className="text-sm text-gray-500">
            ({checkedItems}/{totalItems})
          </span>
        </div>

        {/* Required items indicator */}
        {requiredItems.length > 0 && (
          <div
            className={cn(
              'flex items-center gap-1 text-sm',
              allRequiredChecked ? 'text-green-600' : 'text-orange-600'
            )}
          >
            {allRequiredChecked ? (
              <Check className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>
              {requiredChecked}/{requiredItems.length}{' '}
              {t('reports.reviews.checklist.required_label')}
            </span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full transition-all duration-300',
            allRequiredChecked ? 'bg-green-500' : 'bg-primary-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Checklist items */}
      <div className="space-y-2">
        {sortedItems.map((item) => (
          <ChecklistItem
            key={item.id}
            item={item}
            isEditable={isEditable}
            onToggle={
              onToggleItem
                ? (isChecked) => onToggleItem(item.id, isChecked)
                : undefined
            }
            onAddNote={
              onAddNote ? (note) => onAddNote(item.id, note) : undefined
            }
          />
        ))}
      </div>

      {/* Completion message */}
      {allRequiredChecked && checkedItems === totalItems && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <Check className="w-5 h-5" />
          <span className="font-medium">
            {t('reports.reviews.checklist.all_complete')}
          </span>
        </div>
      )}
    </div>
  );
};

export default ReviewChecklist;
