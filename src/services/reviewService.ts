/**
 * Review Service - API calls for report review workflow
 */

import api from './api';
import type {
  ReportReview,
  ReportReviewListItem,
  ReviewChecklistItem,
  ReviewSettings,
  SubmitForReviewRequest,
  AssignReviewerRequest,
  ReviewDecisionRequest,
  UpdateChecklistItemRequest,
  ReviewFilters,
  ReviewSettingsUpdateRequest,
} from '@/types/review';

const REVIEWS_URL = '/reports/reviews';
const REVIEW_SETTINGS_URL = '/reports/review-settings';

// ============================================================================
// Review CRUD Operations
// ============================================================================

/**
 * Get all reviews with optional filters
 */
export async function getReviews(
  filters?: ReviewFilters
): Promise<ReportReviewListItem[]> {
  const params = new URLSearchParams();

  if (filters?.status) params.append('status', filters.status);
  if (filters?.priority) params.append('priority', filters.priority);
  if (filters?.reviewer) params.append('reviewer', filters.reviewer);
  if (filters?.search) params.append('search', filters.search);

  const response = await api.get<ReportReviewListItem[]>(
    `${REVIEWS_URL}/?${params.toString()}`
  );
  return response.data;
}

/**
 * Get a single review by ID
 */
export async function getReview(reviewId: string): Promise<ReportReview> {
  const response = await api.get<ReportReview>(`${REVIEWS_URL}/${reviewId}/`);
  return response.data;
}

/**
 * Get pending reviews for current user (as reviewer)
 */
export async function getPendingReviews(): Promise<ReportReviewListItem[]> {
  const response = await api.get<ReportReviewListItem[]>(
    `${REVIEWS_URL}/pending/`
  );
  return response.data;
}

/**
 * Get reviews requested by current user
 */
export async function getMyReviewRequests(): Promise<ReportReviewListItem[]> {
  const response = await api.get<ReportReviewListItem[]>(
    `${REVIEWS_URL}/my_requests/`
  );
  return response.data;
}

// ============================================================================
// Report Actions
// ============================================================================

/**
 * Submit a report for review
 */
export async function submitForReview(
  reportId: string,
  data: SubmitForReviewRequest
): Promise<ReportReview> {
  const response = await api.post<ReportReview>(
    `/reports/reports/${reportId}/submit_for_review/`,
    data
  );
  return response.data;
}

/**
 * Get all reviews for a specific report
 */
export async function getReportReviews(
  reportId: string
): Promise<ReportReviewListItem[]> {
  const response = await api.get<ReportReviewListItem[]>(
    `/reports/reports/${reportId}/reviews/`
  );
  return response.data;
}

// ============================================================================
// Review Actions
// ============================================================================

/**
 * Assign a reviewer to a review
 */
export async function assignReviewer(
  reviewId: string,
  data: AssignReviewerRequest
): Promise<ReportReview> {
  const response = await api.post<ReportReview>(
    `${REVIEWS_URL}/${reviewId}/assign/`,
    data
  );
  return response.data;
}

/**
 * Start a review (mark as in progress)
 */
export async function startReview(reviewId: string): Promise<ReportReview> {
  const response = await api.post<ReportReview>(
    `${REVIEWS_URL}/${reviewId}/start/`
  );
  return response.data;
}

/**
 * Approve a review
 */
export async function approveReview(
  reviewId: string,
  data?: ReviewDecisionRequest
): Promise<ReportReview> {
  const response = await api.post<ReportReview>(
    `${REVIEWS_URL}/${reviewId}/approve/`,
    data || {}
  );
  return response.data;
}

/**
 * Reject a review
 */
export async function rejectReview(
  reviewId: string,
  data?: ReviewDecisionRequest
): Promise<ReportReview> {
  const response = await api.post<ReportReview>(
    `${REVIEWS_URL}/${reviewId}/reject/`,
    data || {}
  );
  return response.data;
}

/**
 * Request changes on a review
 */
export async function requestChanges(
  reviewId: string,
  data?: ReviewDecisionRequest
): Promise<ReportReview> {
  const response = await api.post<ReportReview>(
    `${REVIEWS_URL}/${reviewId}/request_changes/`,
    data || {}
  );
  return response.data;
}

/**
 * Cancel a review request
 */
export async function cancelReview(reviewId: string): Promise<ReportReview> {
  const response = await api.post<ReportReview>(
    `${REVIEWS_URL}/${reviewId}/cancel/`
  );
  return response.data;
}

// ============================================================================
// Checklist Operations
// ============================================================================

/**
 * Update a checklist item
 */
export async function updateChecklistItem(
  reviewId: string,
  itemId: string,
  data: UpdateChecklistItemRequest
): Promise<ReviewChecklistItem> {
  const response = await api.patch<ReviewChecklistItem>(
    `${REVIEWS_URL}/${reviewId}/checklist/${itemId}/`,
    data
  );
  return response.data;
}

/**
 * Toggle checklist item checked status
 */
export async function toggleChecklistItem(
  reviewId: string,
  itemId: string,
  isChecked: boolean
): Promise<ReviewChecklistItem> {
  return updateChecklistItem(reviewId, itemId, { is_checked: isChecked });
}

/**
 * Add note to checklist item
 */
export async function addChecklistNote(
  reviewId: string,
  itemId: string,
  note: string
): Promise<ReviewChecklistItem> {
  return updateChecklistItem(reviewId, itemId, { note });
}

// ============================================================================
// Review Settings
// ============================================================================

/**
 * Get review settings for a workspace
 */
export async function getReviewSettings(
  workspaceId: string
): Promise<ReviewSettings> {
  const response = await api.get<ReviewSettings>(
    `${REVIEW_SETTINGS_URL}/workspace/${workspaceId}/`
  );
  return response.data;
}

/**
 * Update review settings
 */
export async function updateReviewSettings(
  settingsId: string,
  data: ReviewSettingsUpdateRequest
): Promise<ReviewSettings> {
  const response = await api.patch<ReviewSettings>(
    `${REVIEW_SETTINGS_URL}/${settingsId}/`,
    data
  );
  return response.data;
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Get review statistics for dashboard
 */
export async function getReviewStats(): Promise<{
  pending_count: number;
  in_progress_count: number;
  my_requests_count: number;
  overdue_count: number;
}> {
  const [pending, myRequests] = await Promise.all([
    getPendingReviews(),
    getMyReviewRequests(),
  ]);

  const now = new Date();
  const overdueCount = pending.filter(
    r => r.due_date && new Date(r.due_date) < now
  ).length;

  return {
    pending_count: pending.filter(r => r.status === 'pending').length,
    in_progress_count: pending.filter(r => r.status === 'in_progress').length,
    my_requests_count: myRequests.filter(r =>
      ['pending', 'in_progress'].includes(r.status)
    ).length,
    overdue_count: overdueCount,
  };
}

export default {
  getReviews,
  getReview,
  getPendingReviews,
  getMyReviewRequests,
  submitForReview,
  getReportReviews,
  assignReviewer,
  startReview,
  approveReview,
  rejectReview,
  requestChanges,
  cancelReview,
  updateChecklistItem,
  toggleChecklistItem,
  addChecklistNote,
  getReviewSettings,
  updateReviewSettings,
  getReviewStats,
};
