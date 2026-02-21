/**
 * Assets Complete Service - Provides full fixed assets functionality
 */
import { apiService } from './api';

const BASE_PATH = '/api/v1/assets';

export interface FixedAsset { id: string; code: string; name: string; category: string; acquisition_date: string; acquisition_value: number; depreciation_method: string; useful_life: number; residual_value: number; status: string; location?: string; }
export interface Depreciation { id: string; asset_id: string; period: string; amount: number; accumulated: number; book_value: number; status: string; }
export interface AssetCategory { id: string; code: string; name: string; depreciation_method: string; default_useful_life: number; }
export interface CreateFixedAssetDto { code: string; name: string; category: string; acquisition_date: string; acquisition_value: number; }
export interface UpdateFixedAssetDto { name?: string; location?: string; status?: string; }
export interface AssetsQueryParams { page?: number; page_size?: number; search?: string; category?: string; status?: string; }

class FixedAssetsService {
  async getAll(params?: AssetsQueryParams) { try { const r = await apiService.get(`${BASE_PATH}/fixed-assets/`, { params }); return r.data; } catch { return { results: [], count: 0 }; } }
  async getById(id: string) { try { const r = await apiService.get(`${BASE_PATH}/fixed-assets/${id}/`); return r.data; } catch { return null; } }
  async create(data: CreateFixedAssetDto) { const r = await apiService.post(`${BASE_PATH}/fixed-assets/`, data); return r.data; }
  async update(id: string, data: UpdateFixedAssetDto) { const r = await apiService.patch(`${BASE_PATH}/fixed-assets/${id}/`, data); return r.data; }
  async delete(id: string) { await apiService.delete(`${BASE_PATH}/fixed-assets/${id}/`); }
  async getCategories() { try { const r = await apiService.get(`${BASE_PATH}/categories/`); return r.data; } catch { return []; } }
}

export interface DepreciationQueryParams { page?: number; page_size?: number; asset_id?: string; period?: string; status?: string; }
export interface DepreciationCalculateParams { start_date?: string; end_date?: string; method?: string; }

class DepreciationsService {
  async getAll(params?: DepreciationQueryParams) { try { const r = await apiService.get(`${BASE_PATH}/depreciations/`, { params }); return r.data; } catch { return { results: [], count: 0 }; } }
  async getByAsset(assetId: string) { try { const r = await apiService.get(`${BASE_PATH}/fixed-assets/${assetId}/depreciations/`); return r.data; } catch { return []; } }
  async calculate(assetId: string, params?: DepreciationCalculateParams) { const r = await apiService.post(`${BASE_PATH}/fixed-assets/${assetId}/calculate-depreciation/`, params); return r.data; }
  async post(id: string) { const r = await apiService.post(`${BASE_PATH}/depreciations/${id}/post/`); return r.data; }
}

export interface AssetsReportParams { page?: number; page_size?: number; category?: string; status?: string; date_from?: string; date_to?: string; }

class AssetsReportsService {
  async getAssetRegister(params?: AssetsReportParams) { try { const r = await apiService.get(`${BASE_PATH}/reports/register/`, { params }); return r.data; } catch { return { assets: [] }; } }
  async getDepreciationSchedule(params?: AssetsReportParams) { try { const r = await apiService.get(`${BASE_PATH}/reports/depreciation-schedule/`, { params }); return r.data; } catch { return { schedule: [] }; } }
  async getAssetSummary(params?: AssetsReportParams) { try { const r = await apiService.get(`${BASE_PATH}/reports/summary/`, { params }); return r.data; } catch { return { total_value: 0, total_depreciation: 0, net_value: 0 }; } }
}

export const fixedAssetsService = new FixedAssetsService();
export const depreciationsService = new DepreciationsService();
export const assetsReportsService = new AssetsReportsService();

export { assetsService } from './assets.service';
export { assetsService as default } from './assets.service';
