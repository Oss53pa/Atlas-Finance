/**
 * SERVICE PARAMÈTRES COMPLET
 *
 * Gestion complète des paramètres système:
 * - Paramètres système (System Parameters)
 * - Configuration société (Company Configuration)
 * - Paramètres journaux (Journal Parameters)
 * - Paramètres notifications (Notification Parameters)
 */

import BaseApiService, { CrudOptions } from '../lib/base-api.service';
import { apiClient, QueryParams } from '../lib/api-client';
import {
  ParametreSysteme,
  ConfigurationSociete,
  JournalParametres,
  NotificationParametres,
  CreateParametreSystemeDto,
  UpdateParametreSystemeDto,
  CreateConfigurationSocieteDto,
  UpdateConfigurationSocieteDto,
  CreateJournalParametresDto,
  UpdateJournalParametresDto,
  CreateNotificationParametresDto,
  UpdateNotificationParametresDto,
  BulkParameterUpdate,
  CategoryOption,
  TypeOption,
  ParameterQueryParams,
  JournalQueryParams,
  NotificationQueryParams,
  ParameterCategory
} from '../types/parameters.types';

class ParametreSystemeService extends BaseApiService<
  ParametreSysteme,
  CreateParametreSystemeDto,
  UpdateParametreSystemeDto
> {
  protected readonly basePath = '/api/parameters/parametres-systeme';
  protected readonly entityName = 'paramètre système';

  async getByCategory(categorie: ParameterCategory): Promise<ParametreSysteme[]> {
    const response = await apiClient.get<{
      results: ParametreSysteme[];
    }>(`${this.basePath}/by-category/${categorie}/`);
    return response.results;
  }

  async getCategories(): Promise<CategoryOption[]> {
    const response = await apiClient.get<{
      categories: CategoryOption[];
    }>(`${this.basePath}/categories/`);
    return response.categories;
  }

  async getByGroup(groupe: string): Promise<ParametreSysteme[]> {
    const response = await apiClient.get<{
      results: ParametreSysteme[];
    }>(`${this.basePath}/by-group/${groupe}/`);
    return response.results;
  }

  async resetToDefault(id: string, options?: CrudOptions): Promise<ParametreSysteme> {
    return this.customAction<ParametreSysteme>(
      'post',
      'reset-to-default',
      id,
      {},
      {
        ...options,
        successMessage: 'Paramètre réinitialisé aux valeurs par défaut',
      }
    );
  }

  async bulkUpdate(
    parametres: BulkParameterUpdate,
    options?: CrudOptions
  ): Promise<{ updated_count: number; errors?: string[] }> {
    return apiClient.post<{ updated_count: number; errors?: string[] }>(
      `${this.basePath}/bulk-update/`,
      parametres,
      {
        showSuccessToast: options?.showSuccessToast ?? true,
        successMessage: options?.successMessage ?? 'Paramètres mis à jour',
      }
    );
  }

  async getVisibleOnly(): Promise<ParametreSysteme[]> {
    const response = await apiClient.get<{
      results: ParametreSysteme[];
    }>(`${this.basePath}/visible-only/`);
    return response.results;
  }

  async getByKey(cle: string): Promise<ParametreSysteme> {
    return apiClient.get<ParametreSysteme>(`${this.basePath}/get-by-key/`, { cle });
  }

  async search(params: ParameterQueryParams): Promise<ParametreSysteme[]> {
    return apiClient.get<ParametreSysteme[]>(`${this.basePath}/`, params);
  }
}

class ConfigurationSocieteService extends BaseApiService<
  ConfigurationSociete,
  CreateConfigurationSocieteDto,
  UpdateConfigurationSocieteDto
> {
  protected readonly basePath = '/api/parameters/configurations-societe';
  protected readonly entityName = 'configuration société';

  async getByCompany(societeId: string): Promise<ConfigurationSociete> {
    return apiClient.get<ConfigurationSociete>(
      `${this.basePath}/by-company/${societeId}/`
    );
  }

  async uploadLogo(
    configId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ConfigurationSociete> {
    return apiClient.uploadFile<ConfigurationSociete>(
      `${this.basePath}/${configId}/upload-logo/`,
      file,
      {},
      onProgress
        ? (progressEvent: any) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress(progress);
            }
          }
        : undefined
    );
  }

  async deleteLogo(configId: string, options?: CrudOptions): Promise<void> {
    return this.customAction<void>(
      'delete',
      'delete-logo',
      configId,
      {},
      {
        ...options,
        successMessage: 'Logo supprimé',
      }
    );
  }
}

class JournalParametresService extends BaseApiService<
  JournalParametres,
  CreateJournalParametresDto,
  UpdateJournalParametresDto
> {
  protected readonly basePath = '/api/parameters/journaux-parametres';
  protected readonly entityName = 'paramètre journal';

  async getByCompany(societeId: string): Promise<JournalParametres[]> {
    const response = await apiClient.get<{
      results: JournalParametres[];
    }>(`${this.basePath}/by-company/${societeId}/`);
    return response.results;
  }

  async getByType(typeJournal: string): Promise<JournalParametres[]> {
    const response = await apiClient.get<{
      results: JournalParametres[];
    }>(`${this.basePath}/by-type/${typeJournal}/`);
    return response.results;
  }

  async getTypes(): Promise<TypeOption[]> {
    const response = await apiClient.get<{
      types: TypeOption[];
    }>(`${this.basePath}/types/`);
    return response.types;
  }

  async incrementCounter(id: string, options?: CrudOptions): Promise<JournalParametres> {
    return this.customAction<JournalParametres>(
      'post',
      'increment-counter',
      id,
      {},
      {
        ...options,
        successMessage: 'Compteur incrémenté',
      }
    );
  }

  async search(params: JournalQueryParams): Promise<JournalParametres[]> {
    return apiClient.get<JournalParametres[]>(`${this.basePath}/`, params);
  }
}

class NotificationParametresService extends BaseApiService<
  NotificationParametres,
  CreateNotificationParametresDto,
  UpdateNotificationParametresDto
> {
  protected readonly basePath = '/api/parameters/notifications-parametres';
  protected readonly entityName = 'paramètre notification';

  async getByCompany(societeId: string): Promise<NotificationParametres[]> {
    const response = await apiClient.get<{
      results: NotificationParametres[];
    }>(`${this.basePath}/by-company/${societeId}/`);
    return response.results;
  }

  async getActive(): Promise<NotificationParametres[]> {
    const response = await apiClient.get<{
      results: NotificationParametres[];
    }>(`${this.basePath}/active/`);
    return response.results;
  }

  async getEvents(): Promise<TypeOption[]> {
    const response = await apiClient.get<{
      events: TypeOption[];
    }>(`${this.basePath}/events/`);
    return response.events;
  }

  async getNotificationTypes(): Promise<TypeOption[]> {
    const response = await apiClient.get<{
      types: TypeOption[];
    }>(`${this.basePath}/notification-types/`);
    return response.types;
  }

  async toggleActive(id: string, options?: CrudOptions): Promise<NotificationParametres> {
    return this.customAction<NotificationParametres>(
      'post',
      'toggle-active',
      id,
      {},
      {
        ...options,
        successMessage: 'Statut de notification modifié',
      }
    );
  }

  async search(params: NotificationQueryParams): Promise<NotificationParametres[]> {
    return apiClient.get<NotificationParametres[]>(`${this.basePath}/`, params);
  }
}

export const parametreSystemeService = new ParametreSystemeService();
export const configurationSocieteService = new ConfigurationSocieteService();
export const journalParametresService = new JournalParametresService();
export const notificationParametresService = new NotificationParametresService();

export {
  ParametreSystemeService,
  ConfigurationSocieteService,
  JournalParametresService,
  NotificationParametresService,
};