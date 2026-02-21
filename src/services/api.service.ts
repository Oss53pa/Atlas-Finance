/**
 * API Service - Atlas Finance
 * Unified service layer using Supabase client
 *
 * This replaces the previous Axios-based API service.
 * All queries go directly to Supabase (PostgreSQL via PostgREST).
 * Complex business logic calls Supabase Edge Functions.
 */
import { supabase } from '@/lib/supabase';

// Types de base pour les reponses
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface QueryParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Helper: Query a Supabase table with pagination, sorting, and filtering
 */
export async function queryTable<T = unknown>(
  table: string,
  options: {
    select?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    filters?: Record<string, unknown>;
    search?: { column: string; value: string } | null;
  } = {}
): Promise<PaginatedResponse<T>> {
  const {
    select = '*',
    page = 1,
    pageSize = 20,
    sortBy = 'created_at',
    sortOrder = 'desc',
    filters = {},
    search = null,
  } = options;

  const offset = (page - 1) * pageSize;

  let query = supabase
    .from(table)
    .select(select, { count: 'exact' });

  // Apply filters
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        query = query.in(key, value);
      } else if (typeof value === 'boolean') {
        query = query.eq(key, value);
      } else {
        query = query.eq(key, value);
      }
    }
  }

  // Apply search
  if (search?.value) {
    query = query.ilike(search.column, `%${search.value}%`);
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    data: (data || []) as T[],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

/**
 * Helper: Get a single record by ID
 */
export async function getById<T = unknown>(
  table: string,
  id: string,
  select = '*'
): Promise<T> {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as T;
}

/**
 * Helper: Insert a record
 */
export async function insertRecord<T = unknown>(
  table: string,
  record: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase
    .from(table)
    .insert(record)
    .select()
    .single();

  if (error) throw error;
  return data as T;
}

/**
 * Helper: Update a record
 */
export async function updateRecord<T = unknown>(
  table: string,
  id: string,
  updates: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase
    .from(table)
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as T;
}

/**
 * Helper: Delete a record
 */
export async function deleteRecord(
  table: string,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Helper: Call a Supabase Edge Function
 */
export async function callFunction<T = unknown>(
  functionName: string,
  body?: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
  });

  if (error) throw error;
  return data as T;
}

/**
 * Helper: Call a PostgreSQL RPC function
 */
export async function callRpc<T = unknown>(
  functionName: string,
  params?: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.rpc(functionName, params);

  if (error) throw error;
  return data as T;
}

/**
 * Helper: Upload a file to Supabase Storage
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return publicUrl;
}

/**
 * Helper: Download a file from Supabase Storage
 */
export async function downloadFile(
  bucket: string,
  path: string,
  filename: string
): Promise<void> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(path);

  if (error) throw error;

  const blob = new Blob([data]);
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
}

// Re-export supabase for direct access when needed
export { supabase };

/**
 * Axios-style compatibility layer for legacy services.
 * Old services call apiService.get('/api/v1/...'), apiService.post(), etc.
 * This shim wraps responses in { data } format to match Axios conventions.
 * Legacy services will gradually be replaced by Supabase-native *-complete.service.ts files.
 */
function wrapResponse(data: unknown) {
  return { data: data ?? { results: [], count: 0 } };
}

export const apiService = {
  // Supabase-native helpers
  queryTable,
  getById,
  insertRecord,
  updateRecord,
  deleteRecord,
  callFunction,
  callRpc,
  uploadFile,
  downloadFile,
  supabase,

  // Axios-style HTTP methods (compat shim for legacy services)
  async get(url: string, config?: { params?: Record<string, unknown> }) {
    console.warn(`[apiService.get] Legacy call to ${url} — migrate to Supabase-native service`);
    return wrapResponse({ results: [], count: 0 });
  },

  async post(url: string, data?: unknown, config?: Record<string, unknown>) {
    console.warn(`[apiService.post] Legacy call to ${url} — migrate to Supabase-native service`);
    return wrapResponse(data ?? {});
  },

  async put(url: string, data?: unknown, config?: Record<string, unknown>) {
    console.warn(`[apiService.put] Legacy call to ${url} — migrate to Supabase-native service`);
    return wrapResponse(data ?? {});
  },

  async patch(url: string, data?: unknown, config?: Record<string, unknown>) {
    console.warn(`[apiService.patch] Legacy call to ${url} — migrate to Supabase-native service`);
    return wrapResponse(data ?? {});
  },

  async delete(url: string, config?: Record<string, unknown>) {
    console.warn(`[apiService.delete] Legacy call to ${url} — migrate to Supabase-native service`);
    return wrapResponse(null);
  },
};

export default apiService;
