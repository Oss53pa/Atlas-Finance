/**
 * Base API Service
 * Provides base CRUD functionality for API services
 */

import { apiClient, PaginatedResponse, QueryParams } from './api-client';
import { toast } from 'react-hot-toast';

/**
 * Options for CRUD operations
 */
export interface CrudOptions {
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

/**
 * Base API Service with generic CRUD operations
 * @template T - Entity type
 * @template CreateDto - Create DTO type
 * @template UpdateDto - Update DTO type
 */
abstract class BaseApiService<T, CreateDto = Partial<T>, UpdateDto = Partial<T>> {
  protected abstract readonly basePath: string;
  protected abstract readonly entityName: string;

  /**
   * Get all entities with optional pagination
   */
  async getAll(params?: QueryParams): Promise<PaginatedResponse<T>> {
    return apiClient.getPaginated<T>(`${this.basePath}/`, params);
  }

  /**
   * Get all entities without pagination
   */
  async list(params?: QueryParams): Promise<T[]> {
    const response = await apiClient.get<T[] | PaginatedResponse<T>>(`${this.basePath}/`, params);
    if (Array.isArray(response)) {
      return response;
    }
    return (response as PaginatedResponse<T>).results || [];
  }

  /**
   * Get entity by ID
   */
  async getById(id: string | number): Promise<T> {
    return apiClient.get<T>(`${this.basePath}/${id}/`);
  }

  /**
   * Create a new entity
   */
  async create(data: CreateDto, options?: CrudOptions): Promise<T> {
    const result = await apiClient.post<T>(`${this.basePath}/`, data);

    if (options?.showSuccessToast !== false) {
      toast.success(options?.successMessage || `${this.entityName} cree avec succes`);
    }

    return result;
  }

  /**
   * Update an entity
   */
  async update(id: string | number, data: UpdateDto, options?: CrudOptions): Promise<T> {
    const result = await apiClient.patch<T>(`${this.basePath}/${id}/`, data);

    if (options?.showSuccessToast !== false) {
      toast.success(options?.successMessage || `${this.entityName} mis a jour avec succes`);
    }

    return result;
  }

  /**
   * Replace an entity (PUT)
   */
  async replace(id: string | number, data: CreateDto, options?: CrudOptions): Promise<T> {
    const result = await apiClient.put<T>(`${this.basePath}/${id}/`, data);

    if (options?.showSuccessToast !== false) {
      toast.success(options?.successMessage || `${this.entityName} mis a jour avec succes`);
    }

    return result;
  }

  /**
   * Delete an entity
   */
  async delete(id: string | number, options?: CrudOptions): Promise<void> {
    await apiClient.delete(`${this.basePath}/${id}/`);

    if (options?.showSuccessToast !== false) {
      toast.success(options?.successMessage || `${this.entityName} supprime avec succes`);
    }
  }

  /**
   * Custom action on an entity
   */
  protected async customAction<R = any>(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    action: string,
    id?: string | number,
    data?: any,
    options?: CrudOptions
  ): Promise<R> {
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
      default:
        throw new Error(`Unsupported method: ${method}`);
    }

    if (options?.showSuccessToast && options.successMessage) {
      toast.success(options.successMessage);
    }

    return result;
  }

  /**
   * Bulk delete entities
   */
  async bulkDelete(ids: (string | number)[], options?: CrudOptions): Promise<void> {
    await apiClient.post(`${this.basePath}/bulk-delete/`, { ids });

    if (options?.showSuccessToast !== false) {
      toast.success(options?.successMessage || `${ids.length} ${this.entityName}(s) supprime(s)`);
    }
  }

  /**
   * Export entities
   */
  async export(format: 'csv' | 'xlsx' | 'pdf' = 'xlsx', params?: QueryParams): Promise<void> {
    await apiClient.downloadFile(
      `${this.basePath}/export/`,
      `${this.entityName}_export.${format}`,
      { ...params, format }
    );
  }
}

export default BaseApiService;
export { BaseApiService };
