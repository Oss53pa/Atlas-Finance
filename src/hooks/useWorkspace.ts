/**
 * HOOKS REACT QUERY - MODULE WORKSPACE
 *
 * Hooks consolidés pour les espaces de travail personnalisés
 * Optimisation du cache et des requêtes API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  workspaceService,
  workspaceWidgetService,
  workspaceStatisticService,
  workspaceQuickActionService,
  userWorkspacePreferenceService
} from '../services/workspace.service';
import type {
  Workspace,
  WorkspaceDashboard,
  WorkspaceCustomization,
  WorkspaceRole,
  WorkspaceWidget,
  WorkspaceStatistic,
  WorkspaceQuickAction,
  UserWorkspacePreference,
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  CreateWidgetDto,
  UpdateWidgetDto,
  CreateStatisticDto,
  UpdateStatisticDto,
  CreateQuickActionDto,
  UpdateQuickActionDto,
  WorkspaceQueryParams
} from '../types/workspace.types';

// ========================================
// QUERY KEYS CENTRALISÉES
// ========================================
export const workspaceQueryKeys = {
  all: ['workspaces'] as const,
  lists: () => [...workspaceQueryKeys.all, 'list'] as const,
  list: (filters?: WorkspaceQueryParams) => [...workspaceQueryKeys.lists(), filters] as const,
  details: () => [...workspaceQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...workspaceQueryKeys.details(), id] as const,
  myWorkspace: () => [...workspaceQueryKeys.all, 'my-workspace'] as const,
  byRole: (role: WorkspaceRole) => [...workspaceQueryKeys.all, 'role', role] as const,
  dashboard: (id: string) => [...workspaceQueryKeys.all, 'dashboard', id] as const,
  widgets: (workspaceId: string) => ['workspace-widgets', workspaceId] as const,
  statistics: (workspaceId: string) => ['workspace-statistics', workspaceId] as const,
  quickActions: (workspaceId: string) => ['workspace-quick-actions', workspaceId] as const,
  preferences: () => ['workspace-preferences', 'my'] as const,
};

// ========================================
// WORKSPACES - QUERIES
// ========================================

/**
 * Hook pour récupérer tous les workspaces avec filtres
 */
export const useWorkspaces = (params?: WorkspaceQueryParams) => {
  return useQuery({
    queryKey: workspaceQueryKeys.list(params),
    queryFn: () => workspaceService.search(params || {}),
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook pour récupérer un workspace par ID
 */
export const useWorkspace = (id: string) => {
  return useQuery({
    queryKey: workspaceQueryKeys.detail(id),
    queryFn: () => workspaceService.getById(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * Hook pour récupérer le workspace de l'utilisateur connecté
 */
export const useMyWorkspace = () => {
  return useQuery({
    queryKey: workspaceQueryKeys.myWorkspace(),
    queryFn: () => workspaceService.getMyWorkspace(),
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });
};

/**
 * Hook pour récupérer un workspace par rôle
 */
export const useWorkspaceByRole = (role: WorkspaceRole) => {
  return useQuery({
    queryKey: workspaceQueryKeys.byRole(role),
    queryFn: () => workspaceService.getByRole(role),
    enabled: !!role,
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * Hook pour récupérer le dashboard complet d'un workspace
 */
export const useWorkspaceDashboard = (workspaceId: string) => {
  return useQuery({
    queryKey: workspaceQueryKeys.dashboard(workspaceId),
    queryFn: () => workspaceService.getDashboard(workspaceId),
    enabled: !!workspaceId,
    staleTime: 3 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

// ========================================
// WORKSPACES - MUTATIONS
// ========================================

/**
 * Hook pour créer un nouveau workspace
 */
export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWorkspaceDto) => workspaceService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.all });
    },
  });
};

/**
 * Hook pour mettre à jour un workspace
 */
export const useUpdateWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkspaceDto }) =>
      workspaceService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.detail(id) });
    },
  });
};

/**
 * Hook pour supprimer un workspace
 */
export const useDeleteWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workspaceService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.all });
    },
  });
};

/**
 * Hook pour personnaliser un workspace
 */
export const useCustomizeWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      customization
    }: {
      workspaceId: string;
      customization: WorkspaceCustomization;
    }) => workspaceService.customize(workspaceId, customization),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.dashboard(workspaceId) });
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.preferences() });
    },
  });
};

/**
 * Hook pour réinitialiser la personnalisation
 */
export const useResetWorkspaceCustomization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) =>
      workspaceService.resetCustomization(workspaceId),
    onSuccess: (_, workspaceId) => {
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.dashboard(workspaceId) });
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.preferences() });
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.widgets(workspaceId) });
    },
  });
};

// ========================================
// WIDGETS
// ========================================

export const useWorkspaceWidgets = (workspaceId: string) => {
  return useQuery({
    queryKey: workspaceQueryKeys.widgets(workspaceId),
    queryFn: () => workspaceWidgetService.getByWorkspace(workspaceId),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useWorkspaceWidget = (id: string) => {
  return useQuery({
    queryKey: ['workspace-widgets', 'detail', id],
    queryFn: () => workspaceWidgetService.getById(id),
    enabled: !!id,
  });
};

export const useCreateWidget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWidgetDto) => workspaceWidgetService.create(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.widgets(data.workspace) });
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.dashboard(data.workspace) });
    },
  });
};

export const useUpdateWidget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWidgetDto }) =>
      workspaceWidgetService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-widgets'] });
    },
  });
};

export const useDeleteWidget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workspaceWidgetService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-widgets'] });
    },
  });
};

// ========================================
// STATISTIQUES
// ========================================

export const useWorkspaceStatistics = (workspaceId: string) => {
  return useQuery({
    queryKey: workspaceQueryKeys.statistics(workspaceId),
    queryFn: () => workspaceStatisticService.getByWorkspace(workspaceId),
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
};

export const useWorkspaceStatistic = (id: string) => {
  return useQuery({
    queryKey: ['workspace-statistics', 'detail', id],
    queryFn: () => workspaceStatisticService.getById(id),
    enabled: !!id,
  });
};

export const useRefreshStatistic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (statisticId: string) =>
      workspaceStatisticService.refresh(statisticId),
    onSuccess: (data) => {
      if (data?.workspace) {
        queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.statistics(data.workspace) });
        queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.dashboard(data.workspace) });
      }
    },
  });
};

// ========================================
// ACTIONS RAPIDES
// ========================================

export const useWorkspaceQuickActions = (workspaceId: string) => {
  return useQuery({
    queryKey: workspaceQueryKeys.quickActions(workspaceId),
    queryFn: () => workspaceQuickActionService.getByWorkspace(workspaceId),
    enabled: !!workspaceId,
    staleTime: 10 * 60 * 1000,
  });
};

export const useWorkspaceQuickAction = (id: string) => {
  return useQuery({
    queryKey: ['workspace-quick-actions', 'detail', id],
    queryFn: () => workspaceQuickActionService.getById(id),
    enabled: !!id,
  });
};

export const useCreateQuickAction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateQuickActionDto) => workspaceQuickActionService.create(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.quickActions(data.workspace) });
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.dashboard(data.workspace) });
    },
  });
};

export const useUpdateQuickAction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateQuickActionDto }) =>
      workspaceQuickActionService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-quick-actions'] });
    },
  });
};

export const useDeleteQuickAction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workspaceQuickActionService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-quick-actions'] });
    },
  });
};

// ========================================
// PRÉFÉRENCES UTILISATEUR
// ========================================

export const useUserPreferences = () => {
  return useQuery({
    queryKey: workspaceQueryKeys.preferences(),
    queryFn: () => userWorkspacePreferenceService.getMyPreferences(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
};

export const useMyWorkspacePreferences = useUserPreferences; // Alias

// ========================================
// UTILITAIRES
// ========================================

/**
 * Hook pour pré-charger le dashboard d'un workspace
 */
export const usePrefetchWorkspaceDashboard = () => {
  const queryClient = useQueryClient();

  return (workspaceId: string) => {
    queryClient.prefetchQuery({
      queryKey: workspaceQueryKeys.dashboard(workspaceId),
      queryFn: () => workspaceService.getDashboard(workspaceId),
      staleTime: 3 * 60 * 1000,
    });
  };
};

/**
 * Hook pour invalider tout le cache workspace
 */
export const useInvalidateWorkspaceCache = () => {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.all });
    queryClient.invalidateQueries({ queryKey: ['workspace-widgets'] });
    queryClient.invalidateQueries({ queryKey: ['workspace-statistics'] });
    queryClient.invalidateQueries({ queryKey: ['workspace-quick-actions'] });
    queryClient.invalidateQueries({ queryKey: ['workspace-preferences'] });
  };
};
