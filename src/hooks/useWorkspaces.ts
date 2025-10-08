/**
 * HOOKS REACT QUERY - WORKSPACES
 *
 * Hooks pour les espaces de travail personnalisés
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  workspaceService,
  workspaceWidgetService,
  workspaceStatisticService,
  workspaceQuickActionService,
  userWorkspacePreferenceService,
} from '../services/workspace.service';
import type {
  Workspace,
  WorkspaceWidget,
  WorkspaceStatistic,
  WorkspaceQuickAction,
  UserWorkspacePreference,
  WorkspaceCustomization,
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  CreateWidgetDto,
  UpdateWidgetDto,
  CreateStatisticDto,
  UpdateStatisticDto,
  CreateQuickActionDto,
  UpdateQuickActionDto,
  WorkspaceQueryParams,
  WorkspaceRole
} from '../types/workspace.types';

/**
 * ========================================
 * WORKSPACES
 * ========================================
 */

export const useWorkspaces = (params?: WorkspaceQueryParams) => {
  return useQuery({
    queryKey: ['workspaces', params],
    queryFn: () => workspaceService.search(params || {}),
  });
};

export const useWorkspace = (id: string) => {
  return useQuery({
    queryKey: ['workspaces', id],
    queryFn: () => workspaceService.getById(id),
    enabled: !!id,
  });
};

export const useMyWorkspace = () => {
  return useQuery({
    queryKey: ['workspaces', 'my-workspace'],
    queryFn: () => workspaceService.getMyWorkspace(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useWorkspaceByRole = (role: WorkspaceRole) => {
  return useQuery({
    queryKey: ['workspaces', 'by-role', role],
    queryFn: () => workspaceService.getByRole(role),
    enabled: !!role,
    staleTime: 5 * 60 * 1000,
  });
};

export const useWorkspaceDashboard = (workspaceId: string) => {
  return useQuery({
    queryKey: ['workspaces', workspaceId, 'dashboard'],
    queryFn: () => workspaceService.getDashboard(workspaceId),
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWorkspaceDto) => workspaceService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
};

export const useUpdateWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkspaceDto }) =>
      workspaceService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces', id] });
    },
  });
};

export const useDeleteWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workspaceService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
};

export const useCustomizeWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, customization }: { workspaceId: string; customization: WorkspaceCustomization }) =>
      workspaceService.customize(workspaceId, customization),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-preferences'] });
    },
  });
};

export const useResetWorkspaceCustomization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) => workspaceService.resetCustomization(workspaceId),
    onSuccess: (_, workspaceId) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-preferences'] });
    },
  });
};

/**
 * ========================================
 * WIDGETS
 * ========================================
 */

export const useWorkspaceWidgets = (workspaceId: string) => {
  return useQuery({
    queryKey: ['workspace-widgets', 'by-workspace', workspaceId],
    queryFn: () => workspaceWidgetService.getByWorkspace(workspaceId),
    enabled: !!workspaceId,
  });
};

export const useWorkspaceWidget = (id: string) => {
  return useQuery({
    queryKey: ['workspace-widgets', id],
    queryFn: () => workspaceWidgetService.getById(id),
    enabled: !!id,
  });
};

export const useCreateWidget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWidgetDto) => workspaceWidgetService.create(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-widgets'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces', data.workspace] });
    },
  });
};

export const useUpdateWidget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWidgetDto }) =>
      workspaceWidgetService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-widgets'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-widgets', id] });
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

/**
 * ========================================
 * STATISTIQUES
 * ========================================
 */

export const useWorkspaceStatistics = (workspaceId: string) => {
  return useQuery({
    queryKey: ['workspace-statistics', 'by-workspace', workspaceId],
    queryFn: () => workspaceStatisticService.getByWorkspace(workspaceId),
    enabled: !!workspaceId,
  });
};

export const useWorkspaceStatistic = (id: string) => {
  return useQuery({
    queryKey: ['workspace-statistics', id],
    queryFn: () => workspaceStatisticService.getById(id),
    enabled: !!id,
  });
};

export const useRefreshStatistic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workspaceStatisticService.refresh(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-statistics', id] });
    },
  });
};

/**
 * ========================================
 * ACTIONS RAPIDES
 * ========================================
 */

export const useWorkspaceQuickActions = (workspaceId: string) => {
  return useQuery({
    queryKey: ['workspace-quick-actions', 'by-workspace', workspaceId],
    queryFn: () => workspaceQuickActionService.getByWorkspace(workspaceId),
    enabled: !!workspaceId,
  });
};

export const useWorkspaceQuickAction = (id: string) => {
  return useQuery({
    queryKey: ['workspace-quick-actions', id],
    queryFn: () => workspaceQuickActionService.getById(id),
    enabled: !!id,
  });
};

export const useCreateQuickAction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateQuickActionDto) => workspaceQuickActionService.create(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-quick-actions'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces', data.workspace] });
    },
  });
};

export const useUpdateQuickAction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateQuickActionDto }) =>
      workspaceQuickActionService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-quick-actions'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-quick-actions', id] });
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

/**
 * ========================================
 * PRÉFÉRENCES UTILISATEUR
 * ========================================
 */

export const useMyWorkspacePreferences = () => {
  return useQuery({
    queryKey: ['workspace-preferences', 'my-preferences'],
    queryFn: () => userWorkspacePreferenceService.getMyPreferences(),
    staleTime: 5 * 60 * 1000,
  });
};