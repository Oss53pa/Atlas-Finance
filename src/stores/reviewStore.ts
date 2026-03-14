/**
 * Review Store - Zustand state management for report reviews
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  ReportReview,
  ReportReviewListItem,
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
    report_id: 'report-1',
    report_title: 'Bilan Financier Q4 2024',
    status: 'pending',
    priority: 'high',
    requested_by: {
      id: 'user-1',
      name: 'Marie Dupont',
      email: 'marie.dupont@exemple.com',
    },
    reviewer: null,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    report_id: 'report-2',
    report_title: 'Analyse des Ventes Mensuelles',
    status: 'in_progress',
    priority: 'normal',
    requested_by: {
      id: 'user-2',
      name: 'Jean Martin',
      email: 'jean.martin@exemple.com',
    },
    reviewer: {
      id: 'user-3',
      name: 'Sophie Bernard',
      email: 'sophie.bernard@exemple.com',
    },
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const mockMyRequests: ReportReviewListItem[] = [
  {
    id: '3',
    report_id: 'report-3',
    report_title: 'Budget Prévisionnel 2025',
    status: 'approved',
    priority: 'high',
    requested_by: {
      id: 'current-user',
      name: 'Vous',
      email: 'vous@exemple.com',
    },
    reviewer: {
      id: 'user-4',
      name: 'Pierre Durand',
      email: 'pierre.durand@exemple.com',
    },
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    report_id: 'report-4',
    report_title: 'Rapport de Performance',
    status: 'changes_requested',
    priority: 'normal',
    requested_by: {
      id: 'current-user',
      name: 'Vous',
      email: 'vous@exemple.com',
    },
    reviewer: {
      id: 'user-5',
      name: 'Claire Moreau',
      email: 'claire.moreau@exemple.com',
    },
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
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
  report_id: 'report-1',
  report_title: 'Bilan Financier Q4 2024',
  status: 'pending',
  priority: 'high',
  requested_by: {
    id: 'user-1',
    name: 'Marie Dupont',
    email: 'marie.dupont@exemple.com',
  },
  reviewer: null,
  created_at: new Date().toISOString(),
  checklist_items: [],
  comments: [],
  history: [],
};

const mockSettings: ReviewSettings = {
  id: 'settings-1',
  workspace_id: 'workspace-1',
  require_approval: true,
  auto_assign: false,
  default_checklist: [],
  reminder_days: 3,
  escalation_days: 7,
};

const reviewService = {
  getReviews: async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return [...mockPendingReviews, ...mockMyRequests];
  },
  getReview: async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockReview;
  },
  getReviewSettings: async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockSettings;
  },
  submitForReview: async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockReview;
  },
  assignReviewer: async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockReview;
  },
  startReview: async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return { ...mockReview, status: 'in_progress' as const };
  },
  approveReview: async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return { ...mockReview, status: 'approved' as const };
  },
  rejectReview: async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return { ...mockReview, status: 'rejected' as const };
  },
  requestChanges: async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return { ...mockReview, status: 'changes_requested' as const };
  },
  cancelReview: async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return { ...mockReview, status: 'cancelled' as const };
  },
  toggleChecklistItem: async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return { id: '1', label: 'Item', is_checked: true };
  },
  addChecklistNote: async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return { id: '1', label: 'Item', is_checked: false, note: 'Note added' };
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
