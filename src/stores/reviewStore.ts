/**
 * Review Store - Zustand state management for report reviews
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  ReportReview,
  ReportReviewListItem,
  ReviewChecklistItem,
  ReviewSettings,
  ReviewFilters,
  SubmitForReviewRequest,
  AssignReviewerRequest,
  ReviewDecisionRequest,
} from '@/types/review';

// Mock data for development
const mockPendingReviews: ReportReviewListItem[] = [
  {
    id: '1',
    report: 'report-1',
    report_title: 'Bilan Financier Q4 2024',
    status: 'pending',
    status_display: 'En attente',
    priority: 'high',
    priority_display: 'Haute',
    requested_by: 'user-1',
    requested_by_name: 'Marie Dupont',
    requested_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    reviewer: null,
    reviewer_name: null,
    assigned_at: null,
    due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    completion_percentage: 0,
  },
  {
    id: '2',
    report: 'report-2',
    report_title: 'Analyse des Ventes Mensuelles',
    status: 'in_progress',
    status_display: 'En cours',
    priority: 'normal',
    priority_display: 'Normale',
    requested_by: 'user-2',
    requested_by_name: 'Jean Martin',
    requested_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    reviewer: 'user-3',
    reviewer_name: 'Sophie Bernard',
    assigned_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    completion_percentage: 30,
  },
];

const mockMyRequests: ReportReviewListItem[] = [
  {
    id: '3',
    report: 'report-3',
    report_title: 'Budget Prévisionnel 2025',
    status: 'approved',
    status_display: 'Approuvé',
    priority: 'high',
    priority_display: 'Haute',
    requested_by: 'current-user',
    requested_by_name: 'Vous',
    requested_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    reviewer: 'user-4',
    reviewer_name: 'Pierre Durand',
    assigned_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    due_date: null,
    completion_percentage: 100,
  },
  {
    id: '4',
    report: 'report-4',
    report_title: 'Rapport de Performance',
    status: 'changes_requested',
    status_display: 'Modifications demandées',
    priority: 'normal',
    priority_display: 'Normale',
    requested_by: 'current-user',
    requested_by_name: 'Vous',
    requested_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    reviewer: 'user-5',
    reviewer_name: 'Claire Moreau',
    assigned_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    due_date: null,
    completion_percentage: 50,
  },
];

const mockStats = {
  pending_count: 3,
  in_progress_count: 2,
  my_requests_count: 4,
  overdue_count: 1,
};

// Mock review service for development
const mockReview: ReportReview = {
  id: '1',
  report: 'report-1',
  report_title: 'Bilan Financier Q4 2024',
  report_workspace: 'workspace-1',
  report_version: 1,
  status: 'pending',
  status_display: 'En attente',
  priority: 'high',
  priority_display: 'Haute',
  requested_by: 'user-1',
  requested_by_name: 'Marie Dupont',
  requested_at: new Date().toISOString(),
  reviewer: null,
  reviewer_name: null,
  assigned_at: null,
  assigned_by: null,
  due_date: null,
  completion_percentage: 0,
  message: '',
  started_at: null,
  decision_at: null,
  decision_comment: '',
  checklist_items: [],
  required_items_checked: false,
  updated_at: new Date().toISOString(),
};

const mockSettings: ReviewSettings = {
  id: 'settings-1',
  workspace: 'workspace-1',
  review_required: true,
  auto_assign_reviewer: false,
  min_reviewers: 1,
  require_all_checklist: false,
  default_checklist: [],
  notify_on_submit: true,
  notify_on_decision: true,
  reminder_days: 3,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const defaultChecklistItem: ReviewChecklistItem = {
  id: '1',
  label: 'Item',
  description: '',
  is_required: false,
  is_checked: false,
  checked_at: null,
  checked_by: null,
  checked_by_name: null,
  note: '',
  order: 0,
};

const reviewService = {
  getReviews: async (_filters?: ReviewFilters) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return [...mockPendingReviews, ...mockMyRequests];
  },
  getReview: async (_reviewId: string) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockReview;
  },
  getReviewSettings: async (_workspaceId: string) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockSettings;
  },
  submitForReview: async (_reportId: string, _data: SubmitForReviewRequest) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockReview;
  },
  assignReviewer: async (_reviewId: string, _data: AssignReviewerRequest) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockReview;
  },
  startReview: async (_reviewId: string) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return { ...mockReview, status: 'in_progress' as const };
  },
  approveReview: async (_reviewId: string, _data?: ReviewDecisionRequest) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return { ...mockReview, status: 'approved' as const };
  },
  rejectReview: async (_reviewId: string, _data?: ReviewDecisionRequest) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return { ...mockReview, status: 'rejected' as const };
  },
  requestChanges: async (_reviewId: string, _data?: ReviewDecisionRequest) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return { ...mockReview, status: 'changes_requested' as const };
  },
  cancelReview: async (_reviewId: string) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return { ...mockReview, status: 'cancelled' as const };
  },
  toggleChecklistItem: async (_reviewId: string, _itemId: string, isChecked: boolean): Promise<ReviewChecklistItem> => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return { ...defaultChecklistItem, is_checked: isChecked };
  },
  addChecklistNote: async (_reviewId: string, _itemId: string, note: string): Promise<ReviewChecklistItem> => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return { ...defaultChecklistItem, note };
  },
  updateReviewSettings: async (_id: string, data: Partial<ReviewSettings>) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return { ...mockSettings, ...data };
  },
};

// ============================================================================
// State Interface
// ============================================================================

interface ReviewState {
  // Data
  reviews: ReportReviewListItem[];
  pendingReviews: ReportReviewListItem[];
  myRequests: ReportReviewListItem[];
  currentReview: ReportReview | null;
  settings: ReviewSettings | null;

  // UI State
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  filters: ReviewFilters;

  // Stats
  stats: {
    pending_count: number;
    in_progress_count: number;
    my_requests_count: number;
    overdue_count: number;
  };

  // Actions - Fetching
  fetchReviews: (filters?: ReviewFilters) => Promise<void>;
  fetchPendingReviews: () => Promise<void>;
  fetchMyRequests: () => Promise<void>;
  fetchReview: (reviewId: string) => Promise<void>;
  fetchReviewStats: () => Promise<void>;
  fetchSettings: (workspaceId: string) => Promise<void>;

  // Actions - Review Operations
  submitForReview: (
    reportId: string,
    data: SubmitForReviewRequest
  ) => Promise<ReportReview>;
  assignReviewer: (
    reviewId: string,
    data: AssignReviewerRequest
  ) => Promise<void>;
  startReview: (reviewId: string) => Promise<void>;
  approveReview: (
    reviewId: string,
    data?: ReviewDecisionRequest
  ) => Promise<void>;
  rejectReview: (
    reviewId: string,
    data?: ReviewDecisionRequest
  ) => Promise<void>;
  requestChanges: (
    reviewId: string,
    data?: ReviewDecisionRequest
  ) => Promise<void>;
  cancelReview: (reviewId: string) => Promise<void>;

  // Actions - Checklist
  toggleChecklistItem: (
    reviewId: string,
    itemId: string,
    isChecked: boolean
  ) => Promise<void>;
  addChecklistNote: (
    reviewId: string,
    itemId: string,
    note: string
  ) => Promise<void>;

  // Actions - Settings
  updateSettings: (
    settingsId: string,
    data: Partial<ReviewSettings>
  ) => Promise<void>;

  // Actions - UI
  setFilters: (filters: ReviewFilters) => void;
  clearError: () => void;
  clearCurrentReview: () => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useReviewStore = create<ReviewState>()(
  devtools(
    (set, get) => ({
      // Initial State
      reviews: [],
      pendingReviews: [],
      myRequests: [],
      currentReview: null,
      settings: null,
      isLoading: false,
      isSubmitting: false,
      error: null,
      filters: {},
      stats: {
        pending_count: 0,
        in_progress_count: 0,
        my_requests_count: 0,
        overdue_count: 0,
      },

      // Fetch Actions
      fetchReviews: async (filters?: ReviewFilters) => {
        set({ isLoading: true, error: null });
        try {
          const reviews = await reviewService.getReviews(filters);
          set({ reviews, isLoading: false, filters: filters || {} });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch reviews',
            isLoading: false,
          });
        }
      },

      fetchPendingReviews: async () => {
        set({ isLoading: true, error: null });
        try {
          // Use mock data for development
          await new Promise(resolve => setTimeout(resolve, 200));
          set({ pendingReviews: mockPendingReviews, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch pending reviews',
            isLoading: false,
          });
        }
      },

      fetchMyRequests: async () => {
        set({ isLoading: true, error: null });
        try {
          // Use mock data for development
          await new Promise(resolve => setTimeout(resolve, 200));
          set({ myRequests: mockMyRequests, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch my requests',
            isLoading: false,
          });
        }
      },

      fetchReview: async (reviewId: string) => {
        set({ isLoading: true, error: null });
        try {
          const review = await reviewService.getReview(reviewId);
          set({ currentReview: review, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch review',
            isLoading: false,
          });
        }
      },

      fetchReviewStats: async () => {
        try {
          // Use mock data for development
          await new Promise(resolve => setTimeout(resolve, 100));
          set({ stats: mockStats });
        } catch (error) {
          console.error('Failed to fetch review stats:', error);
        }
      },

      fetchSettings: async (workspaceId: string) => {
        set({ isLoading: true, error: null });
        try {
          const settings = await reviewService.getReviewSettings(workspaceId);
          set({ settings, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch settings',
            isLoading: false,
          });
        }
      },

      // Review Operations
      submitForReview: async (reportId: string, data: SubmitForReviewRequest) => {
        set({ isSubmitting: true, error: null });
        try {
          const review = await reviewService.submitForReview(reportId, data);
          set({ isSubmitting: false });
          // Refresh stats
          get().fetchReviewStats();
          return review;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to submit for review',
            isSubmitting: false,
          });
          throw error;
        }
      },

      assignReviewer: async (reviewId: string, data: AssignReviewerRequest) => {
        set({ isSubmitting: true, error: null });
        try {
          const review = await reviewService.assignReviewer(reviewId, data);
          set({
            currentReview: review,
            isSubmitting: false,
          });
          // Refresh lists
          get().fetchPendingReviews();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to assign reviewer',
            isSubmitting: false,
          });
          throw error;
        }
      },

      startReview: async (reviewId: string) => {
        set({ isSubmitting: true, error: null });
        try {
          const review = await reviewService.startReview(reviewId);
          set({
            currentReview: review,
            isSubmitting: false,
          });
          // Refresh lists
          get().fetchPendingReviews();
          get().fetchReviewStats();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to start review',
            isSubmitting: false,
          });
          throw error;
        }
      },

      approveReview: async (reviewId: string, data?: ReviewDecisionRequest) => {
        set({ isSubmitting: true, error: null });
        try {
          const review = await reviewService.approveReview(reviewId, data);
          set({
            currentReview: review,
            isSubmitting: false,
          });
          // Refresh lists
          get().fetchPendingReviews();
          get().fetchMyRequests();
          get().fetchReviewStats();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to approve review',
            isSubmitting: false,
          });
          throw error;
        }
      },

      rejectReview: async (reviewId: string, data?: ReviewDecisionRequest) => {
        set({ isSubmitting: true, error: null });
        try {
          const review = await reviewService.rejectReview(reviewId, data);
          set({
            currentReview: review,
            isSubmitting: false,
          });
          // Refresh lists
          get().fetchPendingReviews();
          get().fetchMyRequests();
          get().fetchReviewStats();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to reject review',
            isSubmitting: false,
          });
          throw error;
        }
      },

      requestChanges: async (reviewId: string, data?: ReviewDecisionRequest) => {
        set({ isSubmitting: true, error: null });
        try {
          const review = await reviewService.requestChanges(reviewId, data);
          set({
            currentReview: review,
            isSubmitting: false,
          });
          // Refresh lists
          get().fetchPendingReviews();
          get().fetchMyRequests();
          get().fetchReviewStats();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to request changes',
            isSubmitting: false,
          });
          throw error;
        }
      },

      cancelReview: async (reviewId: string) => {
        set({ isSubmitting: true, error: null });
        try {
          const review = await reviewService.cancelReview(reviewId);
          set({
            currentReview: review,
            isSubmitting: false,
          });
          // Refresh lists
          get().fetchMyRequests();
          get().fetchReviewStats();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to cancel review',
            isSubmitting: false,
          });
          throw error;
        }
      },

      // Checklist Operations
      toggleChecklistItem: async (
        reviewId: string,
        itemId: string,
        isChecked: boolean
      ) => {
        const { currentReview } = get();
        if (!currentReview) return;

        try {
          const updatedItem = await reviewService.toggleChecklistItem(
            reviewId,
            itemId,
            isChecked
          );

          // Update local state
          set({
            currentReview: {
              ...currentReview,
              checklist_items: currentReview.checklist_items.map(item =>
                item.id === itemId ? updatedItem : item
              ),
            },
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update checklist item',
          });
          throw error;
        }
      },

      addChecklistNote: async (
        reviewId: string,
        itemId: string,
        note: string
      ) => {
        const { currentReview } = get();
        if (!currentReview) return;

        try {
          const updatedItem = await reviewService.addChecklistNote(
            reviewId,
            itemId,
            note
          );

          // Update local state
          set({
            currentReview: {
              ...currentReview,
              checklist_items: currentReview.checklist_items.map(item =>
                item.id === itemId ? updatedItem : item
              ),
            },
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to add note',
          });
          throw error;
        }
      },

      // Settings Operations
      updateSettings: async (settingsId: string, data: Partial<ReviewSettings>) => {
        set({ isSubmitting: true, error: null });
        try {
          const settings = await reviewService.updateReviewSettings(settingsId, data);
          set({ settings, isSubmitting: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update settings',
            isSubmitting: false,
          });
          throw error;
        }
      },

      // UI Actions
      setFilters: (filters: ReviewFilters) => {
        set({ filters });
        get().fetchReviews(filters);
      },

      clearError: () => set({ error: null }),

      clearCurrentReview: () => set({ currentReview: null }),
    }),
    { name: 'review-store' }
  )
);

export default useReviewStore;
