/**
 * SERVICE WORKSPACES COMPLET
 *
 * Gestion complète des espaces de travail:
 * - Workspaces
 * - Widgets
 * - Statistiques
 * - Actions rapides
 * - Préférences utilisateur
 */

import BaseApiService, { CrudOptions } from '../lib/base-api.service';
import { apiClient, QueryParams } from '../lib/api-client';
import {
  Workspace,
  WorkspaceWidget,
  WorkspaceStatistic,
  WorkspaceQuickAction,
  UserWorkspacePreference,
  WorkspaceDashboard,
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

class WorkspaceService extends BaseApiService<
  Workspace,
  CreateWorkspaceDto,
  UpdateWorkspaceDto
> {
  protected readonly basePath = '/api/workspaces';
  protected readonly entityName = 'workspace';

  async getMyWorkspace(): Promise<Workspace> {
    return apiClient.get<Workspace>(`${this.basePath}/my-workspace/`);
  }

  async getByRole(role: WorkspaceRole): Promise<Workspace> {
    return apiClient.get<Workspace>(`${this.basePath}/by-role/${role}/`);
  }

  async getDashboard(workspaceId: string): Promise<WorkspaceDashboard> {
    return apiClient.get<WorkspaceDashboard>(`${this.basePath}/${workspaceId}/dashboard/`);
  }

  async customize(
    workspaceId: string,
    customization: WorkspaceCustomization,
    options?: CrudOptions
  ): Promise<{ message: string; preferences: UserWorkspacePreference }> {
    return apiClient.post<{ message: string; preferences: UserWorkspacePreference }>(
      `${this.basePath}/${workspaceId}/customize/`,
      customization,
      {
        showSuccessToast: options?.showSuccessToast ?? true,
        successMessage: options?.successMessage ?? 'Workspace personnalisé',
      }
    );
  }

  async resetCustomization(
    workspaceId: string,
    options?: CrudOptions
  ): Promise<{ message: string; preferences: UserWorkspacePreference }> {
    return apiClient.post<{ message: string; preferences: UserWorkspacePreference }>(
      `${this.basePath}/${workspaceId}/reset-customization/`,
      {},
      {
        showSuccessToast: options?.showSuccessToast ?? true,
        successMessage: options?.successMessage ?? 'Personnalisation réinitialisée',
      }
    );
  }

  async search(params: WorkspaceQueryParams): Promise<Workspace[]> {
    return apiClient.get<Workspace[]>(`${this.basePath}/`, params);
  }
}

class WorkspaceWidgetService extends BaseApiService<
  WorkspaceWidget,
  CreateWidgetDto,
  UpdateWidgetDto
> {
  protected readonly basePath = '/api/workspaces/widgets';
  protected readonly entityName = 'widget';

  async getByWorkspace(workspaceId: string): Promise<WorkspaceWidget[]> {
    const response = await apiClient.get<{
      results: WorkspaceWidget[];
    }>(`${this.basePath}/by-workspace/${workspaceId}/`);
    return response.results;
  }
}

class WorkspaceStatisticService extends BaseApiService<
  WorkspaceStatistic,
  CreateStatisticDto,
  UpdateStatisticDto
> {
  protected readonly basePath = '/api/workspaces/statistics';
  protected readonly entityName = 'statistique';

  async getByWorkspace(workspaceId: string): Promise<WorkspaceStatistic[]> {
    const response = await apiClient.get<{
      results: WorkspaceStatistic[];
    }>(`${this.basePath}/by-workspace/${workspaceId}/`);
    return response.results;
  }

  async refresh(statisticId: string, options?: CrudOptions): Promise<WorkspaceStatistic> {
    return this.customAction<WorkspaceStatistic>(
      'post',
      'refresh',
      statisticId,
      {},
      {
        ...options,
        successMessage: 'Statistique mise à jour',
      }
    );
  }
}

class WorkspaceQuickActionService extends BaseApiService<
  WorkspaceQuickAction,
  CreateQuickActionDto,
  UpdateQuickActionDto
> {
  protected readonly basePath = '/api/workspaces/quick-actions';
  protected readonly entityName = 'action rapide';

  async getByWorkspace(workspaceId: string): Promise<WorkspaceQuickAction[]> {
    const response = await apiClient.get<{
      results: WorkspaceQuickAction[];
    }>(`${this.basePath}/by-workspace/${workspaceId}/`);
    return response.results;
  }
}

class UserWorkspacePreferenceService extends BaseApiService<
  UserWorkspacePreference,
  Partial<UserWorkspacePreference>,
  Partial<UserWorkspacePreference>
> {
  protected readonly basePath = '/api/workspaces/preferences';
  protected readonly entityName = 'préférence';

  async getMyPreferences(): Promise<UserWorkspacePreference> {
    return apiClient.get<UserWorkspacePreference>(`${this.basePath}/my-preferences/`);
  }
}

export const workspaceService = new WorkspaceService();
export const workspaceWidgetService = new WorkspaceWidgetService();
export const workspaceStatisticService = new WorkspaceStatisticService();
export const workspaceQuickActionService = new WorkspaceQuickActionService();
export const userWorkspacePreferenceService = new UserWorkspacePreferenceService();

export {
  WorkspaceService,
  WorkspaceWidgetService,
  WorkspaceStatisticService,
  WorkspaceQuickActionService,
  UserWorkspacePreferenceService,
};