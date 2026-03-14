/**
 * Review workflow types for human review of reports
 */

// ============================================================================
// Enums and Constants
// ============================================================================

export type ReviewStatus =
  | 'pending'
  | 'in_progress'
  | 'changes_requested'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type ReviewPriority = 'low' | 'normal' | 'high' | 'urgent';

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: 'En attente',
  in_progress: 'En cours',
  changes_requested: 'Modifications demandées',
  approved: 'Approuvé',
  rejected: 'Rejeté',
  cancelled: 'Annulé',
};

export const REVIEW_PRIORITY_LABELS: Record<ReviewPriority, string> = {
  low: 'Basse',
  normal: 'Normale',
  high: 'Haute',
  urgent: 'Urgente',
};

export const REVIEW_STATUS_COLORS: Record<ReviewStatus, string> = {
  pending: 'yellow',
  in_progress: 'blue',
  changes_requested: 'orange',
  approved: 'green',
  rejected: 'red',
  cancelled: 'gray',
};

export const REVIEW_PRIORITY_COLORS: Record<ReviewPriority, string> = {
  low: 'gray',
  normal: 'blue',
  high: 'orange',
  urgent: 'red',
};

// ============================================================================
// Interfaces
// ============================================================================

export interface ReviewChecklistItem {
  id: string;
  label: string;
  description: string;
  is_required: boolean;
  is_checked: boolean;
  checked_at: string | null;
  checked_by: string | null;
  checked_by_name: string | null;
  note: string;
  order: number;
}

export interface ReviewSettings {
  id: string;
  workspace: string;
  review_required: boolean;
  auto_assign_reviewer: boolean;
  min_reviewers: number;
  require_all_checklist: boolean;
  default_checklist: ChecklistTemplate[];
  notify_on_submit: boolean;
  notify_on_decision: boolean;
  reminder_days: number;
  created_at: string;
  updated_at: string;
}

export interface ChecklistTemplate {
  label: string;
  description?: string;
  required: boolean;
  order: number;
}

export interface ReportReviewListItem {
  id: string;
  report: string;
  report_title: string;
  status: ReviewStatus;
  status_display: string;
  priority: ReviewPriority;
  priority_display: string;
  requested_by: string;
  requested_by_name: string;
  requested_at: string;
  reviewer: string | null;
  reviewer_name: string | null;
  assigned_at: string | null;
  due_date: string | null;
  completion_percentage: number;
}

export interface ReportReview extends ReportReviewListItem {
  report_workspace: string;
  report_version: number;
  message: string;
  assigned_by: UserBasic | null;
  started_at: string | null;
  decision_at: string | null;
  decision_comment: string;
  checklist_items: ReviewChecklistItem[];
  required_items_checked: boolean;
  updated_at: string;
}

export interface UserBasic {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface SubmitForReviewRequest {
  message?: string;
  priority?: ReviewPriority;
  due_date?: string | null;
  reviewer_id?: string | null;
}

export interface AssignReviewerRequest {
  reviewer_id: string;
}

export interface ReviewDecisionRequest {
  comment?: string;
}

export interface UpdateChecklistItemRequest {
  is_checked?: boolean;
  note?: string;
}

export interface ReviewFilters {
  status?: ReviewStatus;
  priority?: ReviewPriority;
  reviewer?: string;
  search?: string;
}

export interface ReviewSettingsUpdateRequest {
  review_required?: boolean;
  auto_assign_reviewer?: boolean;
  min_reviewers?: number;
  require_all_checklist?: boolean;
  default_checklist?: ChecklistTemplate[];
  notify_on_submit?: boolean;
  notify_on_decision?: boolean;
  reminder_days?: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if review can be started
 */
export function canStartReview(review: ReportReview, userId: string): boolean {
  return (
    review.status === 'pending' &&
    review.reviewer?.toString() === userId
  );
}

/**
 * Check if review can be decided (approve/reject/request changes)
 */
export function canDecideReview(review: ReportReview, userId: string): boolean {
  return (
    review.status === 'in_progress' &&
    review.reviewer?.toString() === userId
  );
}

/**
 * Check if review can be cancelled
 */
export function canCancelReview(review: ReportReview, userId: string): boolean {
  return (
    ['pending', 'in_progress', 'changes_requested'].includes(review.status) &&
    review.requested_by === userId
  );
}

/**
 * Check if all required checklist items are checked
 */
export function areRequiredItemsChecked(items: ReviewChecklistItem[]): boolean {
  return items
    .filter(item => item.is_required)
    .every(item => item.is_checked);
}

/**
 * Calculate checklist completion percentage
 */
export function getCompletionPercentage(items: ReviewChecklistItem[]): number {
  if (items.length === 0) return 0;
  const checked = items.filter(item => item.is_checked).length;
  return Math.round((checked / items.length) * 100);
}

/**
 * Get status badge variant
 */
export function getStatusBadgeVariant(
  status: ReviewStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'approved':
      return 'default';
    case 'rejected':
    case 'cancelled':
      return 'destructive';
    case 'in_progress':
      return 'secondary';
    default:
      return 'outline';
  }
}

/**
 * Get priority badge variant
 */
export function getPriorityBadgeVariant(
  priority: ReviewPriority
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (priority) {
    case 'urgent':
      return 'destructive';
    case 'high':
      return 'secondary';
    default:
      return 'outline';
  }
}

/**
 * Check if review is overdue
 */
export function isReviewOverdue(review: ReportReviewListItem): boolean {
  if (!review.due_date) return false;
  if (['approved', 'rejected', 'cancelled'].includes(review.status)) return false;
  return new Date(review.due_date) < new Date();
}

/**
 * Format time remaining until due date
 */
export function formatTimeRemaining(dueDate: string | null): string | null {
  if (!dueDate) return null;

  const now = new Date();
  const due = new Date(dueDate);
  const diff = due.getTime() - now.getTime();

  if (diff < 0) {
    const days = Math.abs(Math.floor(diff / (1000 * 60 * 60 * 24)));
    return `${days} jour(s) en retard`;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return `${hours} heure(s) restante(s)`;
  }

  return `${days} jour(s) restant(s)`;
}
