/**
 * CLASSE DE BASE POUR TOUS LES SERVICES API
 *
 * Fournit les opérations CRUD de base et méthodes communes
 * Tous les services métier héritent de cette classe
 */

import { apiClient, PaginatedResponse, QueryParams } from './api-client';
import { toast } from 'react-hot-toast';

/**
 * Options pour les opérations CRUD
 */
export interface CrudOptions {
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

/**
 * Classe de base abstraite pour les services API
 */
export abstract class BaseApiService<T = any, CreateDto = Partial<T>, UpdateDto = Partial<T>> {
  /**
   * Chemin de base de l'endpoint (ex: '/api/comptes')
   * Doit être défini par les classes filles
   */
  protected abstract readonly basePath: string;

  /**
   * Nom de l'entité pour les messages (ex: 'compte', 'écriture')
   * Optionnel - utilisé pour les toasts
   */
  protected readonly entityName?: string;

  /**
   * Options par défaut pour les opérations
   */
  protected readonly defaultOptions: CrudOptions = {
    showSuccessToast: true,
    showErrorToast: true,
  };

  /**
   * GET ALL - Liste avec pagination
   */
  async getAll(params?: QueryParams, options?: CrudOptions): Promise<PaginatedResponse<T>> {
    try {
      const data = await apiClient.getPaginated<T>(this.basePath + '/', params);

      return data;
    } catch (error) {
      this.handleError('Erreur lors de la récupération', error, options);
      throw error;
    }
  }

  /**
   * GET ALL (sans pagination) - Liste simple
   */
  async getAllSimple(params?: QueryParams, options?: CrudOptions): Promise<T[]> {
    try {
      const data = await apiClient.get<{ results?: T[] } | T[]>(this.basePath + '/', params);

      // Gérer les deux formats de réponse
      if (Array.isArray(data)) {
        return data;
      } else if (data && 'results' in data) {
        return data.results || [];
      }

      return [];
    } catch (error) {
      this.handleError('Erreur lors de la récupération', error, options);
      throw error;
    }
  }

  /**
   * GET BY ID - Récupérer un élément spécifique
   */
  async getById(id: string | number, params?: QueryParams, options?: CrudOptions): Promise<T> {
    try {
      const data = await apiClient.get<T>(`${this.basePath}/${id}/`, params);

      return data;
    } catch (error) {
      this.handleError('Erreur lors de la récupération', error, options);
      throw error;
    }
  }

  /**
   * CREATE - Créer un nouvel élément
   */
  async create(data: CreateDto, options?: CrudOptions): Promise<T> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      const result = await apiClient.post<T>(this.basePath + '/', data);

      if (opts.showSuccessToast) {
        toast.success(
          opts.successMessage || `${this.entityName || 'Élément'} créé avec succès`
        );
      }

      return result;
    } catch (error) {
      this.handleError(
        opts.errorMessage || `Erreur lors de la création`,
        error,
        opts
      );
      throw error;
    }
  }

  /**
   * UPDATE - Mettre à jour un élément (PUT - remplacement complet)
   */
  async update(
    id: string | number,
    data: UpdateDto,
    options?: CrudOptions
  ): Promise<T> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      const result = await apiClient.put<T>(`${this.basePath}/${id}/`, data);

      if (opts.showSuccessToast) {
        toast.success(
          opts.successMessage || `${this.entityName || 'Élément'} mis à jour avec succès`
        );
      }

      return result;
    } catch (error) {
      this.handleError(
        opts.errorMessage || `Erreur lors de la mise à jour`,
        error,
        opts
      );
      throw error;
    }
  }

  /**
   * PARTIAL UPDATE - Mise à jour partielle (PATCH)
   */
  async partialUpdate(
    id: string | number,
    data: Partial<UpdateDto>,
    options?: CrudOptions
  ): Promise<T> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      const result = await apiClient.patch<T>(`${this.basePath}/${id}/`, data);

      if (opts.showSuccessToast) {
        toast.success(
          opts.successMessage || `${this.entityName || 'Élément'} mis à jour avec succès`
        );
      }

      return result;
    } catch (error) {
      this.handleError(
        opts.errorMessage || `Erreur lors de la mise à jour`,
        error,
        opts
      );
      throw error;
    }
  }

  /**
   * DELETE - Supprimer un élément
   */
  async delete(id: string | number, options?: CrudOptions): Promise<void> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      await apiClient.delete(`${this.basePath}/${id}/`);

      if (opts.showSuccessToast) {
        toast.success(
          opts.successMessage || `${this.entityName || 'Élément'} supprimé avec succès`
        );
      }
    } catch (error) {
      this.handleError(
        opts.errorMessage || `Erreur lors de la suppression`,
        error,
        opts
      );
      throw error;
    }
  }

  /**
   * BULK DELETE - Supprimer plusieurs éléments
   */
  async bulkDelete(ids: Array<string | number>, options?: CrudOptions): Promise<void> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      await Promise.all(ids.map((id) => apiClient.delete(`${this.basePath}/${id}/`)));

      if (opts.showSuccessToast) {
        toast.success(
          opts.successMessage || `${ids.length} ${this.entityName || 'éléments'} supprimés`
        );
      }
    } catch (error) {
      this.handleError(
        opts.errorMessage || `Erreur lors de la suppression multiple`,
        error,
        opts
      );
      throw error;
    }
  }

  /**
   * SEARCH - Recherche avec query
   */
  async search(query: string, params?: QueryParams, options?: CrudOptions): Promise<T[]> {
    try {
      const searchParams = {
        ...params,
        search: query,
      };

      const data = await apiClient.get<{ results?: T[] } | T[]>(
        this.basePath + '/',
        searchParams
      );

      // Gérer les deux formats
      if (Array.isArray(data)) {
        return data;
      } else if (data && 'results' in data) {
        return data.results || [];
      }

      return [];
    } catch (error) {
      this.handleError('Erreur lors de la recherche', error, options);
      throw error;
    }
  }

  /**
   * CUSTOM ACTION - Appeler une action personnalisée
   */
  protected async customAction<R = any>(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    action: string,
    id?: string | number,
    data?: any,
    options?: CrudOptions
  ): Promise<R> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      const url = id
        ? `${this.basePath}/${id}/${action}/`
        : `${this.basePath}/${action}/`;

      let result: R;

      switch (method) {
        case 'get':
          result = await apiClient.get<R>(url, data);
          break;
        case 'post':
          result = await apiClient.post<R>(url, data);
          break;
        case 'put':
          result = await apiClient.put<R>(url, data);
          break;
        case 'patch':
          result = await apiClient.patch<R>(url, data);
          break;
        case 'delete':
          result = await apiClient.delete<R>(url);
          break;
      }

      if (opts.showSuccessToast && opts.successMessage) {
        toast.success(opts.successMessage);
      }

      return result!;
    } catch (error) {
      this.handleError(
        opts.errorMessage || `Erreur lors de l'action ${action}`,
        error,
        opts
      );
      throw error;
    }
  }

  /**
   * EXPORT - Exporter des données
   */
  async export(
    format: 'excel' | 'pdf' | 'csv',
    params?: QueryParams,
    filename?: string
  ): Promise<void> {
    try {
      const exportFilename =
        filename || `${this.entityName || 'export'}-${Date.now()}.${format}`;

      await apiClient.downloadFile(`${this.basePath}/export/`, exportFilename, {
        ...params,
        format,
      });
    } catch (error) {
      this.handleError('Erreur lors de l\'export', error);
      throw error;
    }
  }

  /**
   * IMPORT - Importer des données
   */
  async import(
    file: File,
    onProgress?: (progress: number) => void,
    options?: CrudOptions
  ): Promise<any> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      const result = await apiClient.uploadFile(
        `${this.basePath}/import/`,
        file,
        {},
        (progressEvent: any) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        }
      );

      if (opts.showSuccessToast) {
        toast.success('Import réussi');
      }

      return result;
    } catch (error) {
      this.handleError('Erreur lors de l\'import', error, opts);
      throw error;
    }
  }

  /**
   * Gestion centralisée des erreurs
   */
  protected handleError(message: string, error: any, options?: CrudOptions): void {
    console.error(`${message}:`, error);

    const showToast = options?.showErrorToast ?? this.defaultOptions.showErrorToast;

    if (showToast) {
      // Le toast est déjà géré par api-client, mais on peut ajouter un message personnalisé
      if (options?.errorMessage) {
        toast.error(options.errorMessage);
      }
    }
  }

  /**
   * Construire l'URL complète
   */
  protected buildUrl(path: string): string {
    return `${this.basePath}${path}`;
  }

  /**
   * Méthode utilitaire pour extraire les IDs d'une liste
   */
  protected extractIds(items: T[]): Array<string | number> {
    return items.map((item: any) => item.id);
  }
}

/**
 * HELPERS ET UTILITAIRES
 */

/**
 * Helper pour créer un service simplifié sans héritage
 */
export function createSimpleService<T = any>(basePath: string, entityName?: string) {
  return {
    getAll: (params?: QueryParams) =>
      apiClient.getPaginated<T>(basePath + '/', params),

    getById: (id: string | number) =>
      apiClient.get<T>(`${basePath}/${id}/`),

    create: (data: Partial<T>) =>
      apiClient.post<T>(basePath + '/', data),

    update: (id: string | number, data: Partial<T>) =>
      apiClient.put<T>(`${basePath}/${id}/`, data),

    delete: (id: string | number) =>
      apiClient.delete(`${basePath}/${id}/`),

    search: (query: string, params?: QueryParams) =>
      apiClient.get<T[]>(basePath + '/', { ...params, search: query }),
  };
}

export default BaseApiService;