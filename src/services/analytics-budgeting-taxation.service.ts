/**
 * Analytics Budgeting Taxation Service
 * Provides analytics, budgeting, and taxation functionality
 */
import { apiService } from './api';

const BASE_PATH = '/api/v1';

// Types
export interface AnalyticalAxis { id: string; code: string; name: string; type: string; is_active: boolean; }
export interface AnalyticalCenter { id: string; axis_id: string; code: string; name: string; parent_id?: string; budget?: number; }
export interface Budget { id: string; fiscal_year_id: string; analytical_center_id?: string; account_id?: string; amount: number; period: string; }
export interface BudgetControl { id: string; budget_id: string; actual: number; variance: number; variance_percent: number; }
export interface TaxDeclaration { id: string; type: string; period: string; due_date: string; amount: number; status: string; }

interface ListParams {
  page?: number;
  page_size?: number;
  status?: string;
  [key: string]: unknown;
}

class AnalyticalAxisService {
  async getAll(params?: ListParams) { try { const r = await apiService.get(`${BASE_PATH}/analytics/axes/`, { params }); return r.data; } catch { return { results: [], count: 0 }; } }
  async getById(id: string) { try { const r = await apiService.get(`${BASE_PATH}/analytics/axes/${id}/`); return r.data; } catch { return null; } }
  async create(data: Omit<AnalyticalAxis, 'id'>) { const r = await apiService.post(`${BASE_PATH}/analytics/axes/`, data); return r.data; }
  async update(id: string, data: Partial<Omit<AnalyticalAxis, 'id'>>) { const r = await apiService.patch(`${BASE_PATH}/analytics/axes/${id}/`, data); return r.data; }
  async delete(id: string) { await apiService.delete(`${BASE_PATH}/analytics/axes/${id}/`); }
}

class AnalyticalCentersService {
  async getAll(params?: ListParams) { try { const r = await apiService.get(`${BASE_PATH}/analytics/centers/`, { params }); return r.data; } catch { return { results: [], count: 0 }; } }
  async getByAxis(axisId: string) { try { const r = await apiService.get(`${BASE_PATH}/analytics/axes/${axisId}/centers/`); return r.data; } catch { return []; } }
  async create(data: Omit<AnalyticalCenter, 'id'>) { const r = await apiService.post(`${BASE_PATH}/analytics/centers/`, data); return r.data; }
  async update(id: string, data: Partial<Omit<AnalyticalCenter, 'id'>>) { const r = await apiService.patch(`${BASE_PATH}/analytics/centers/${id}/`, data); return r.data; }
  async delete(id: string) { await apiService.delete(`${BASE_PATH}/analytics/centers/${id}/`); }
}

class BudgetsService {
  async getAll(params?: ListParams) { try { const r = await apiService.get(`${BASE_PATH}/budgeting/budgets/`, { params }); return r.data; } catch { return { results: [], count: 0 }; } }
  async getById(id: string) { try { const r = await apiService.get(`${BASE_PATH}/budgeting/budgets/${id}/`); return r.data; } catch { return null; } }
  async create(data: Omit<Budget, 'id'>) { const r = await apiService.post(`${BASE_PATH}/budgeting/budgets/`, data); return r.data; }
  async update(id: string, data: Partial<Omit<Budget, 'id'>>) { const r = await apiService.patch(`${BASE_PATH}/budgeting/budgets/${id}/`, data); return r.data; }
  async delete(id: string) { await apiService.delete(`${BASE_PATH}/budgeting/budgets/${id}/`); }
}

class BudgetControlService {
  async getAll(params?: ListParams) { try { const r = await apiService.get(`${BASE_PATH}/budgeting/controls/`, { params }); return r.data; } catch { return { results: [], count: 0 }; } }
  async getByBudget(budgetId: string) { try { const r = await apiService.get(`${BASE_PATH}/budgeting/budgets/${budgetId}/control/`); return r.data; } catch { return null; } }
  async getSummary(params?: ListParams) { try { const r = await apiService.get(`${BASE_PATH}/budgeting/controls/summary/`, { params }); return r.data; } catch { return { total_budget: 0, total_actual: 0, variance: 0 }; } }
}

class TaxDeclarationsService {
  async getAll(params?: ListParams) { try { const r = await apiService.get(`${BASE_PATH}/taxation/declarations/`, { params }); return r.data; } catch { return { results: [], count: 0 }; } }
  async getById(id: string) { try { const r = await apiService.get(`${BASE_PATH}/taxation/declarations/${id}/`); return r.data; } catch { return null; } }
  async create(data: Omit<TaxDeclaration, 'id'>) { const r = await apiService.post(`${BASE_PATH}/taxation/declarations/`, data); return r.data; }
  async update(id: string, data: Partial<Omit<TaxDeclaration, 'id'>>) { const r = await apiService.patch(`${BASE_PATH}/taxation/declarations/${id}/`, data); return r.data; }
  async delete(id: string) { await apiService.delete(`${BASE_PATH}/taxation/declarations/${id}/`); }
  async submit(id: string) { const r = await apiService.post(`${BASE_PATH}/taxation/declarations/${id}/submit/`); return r.data; }
  async getPending() { try { const r = await apiService.get(`${BASE_PATH}/taxation/declarations/pending/`); return r.data; } catch { return []; } }
}

export const analyticalAxisService = new AnalyticalAxisService();
export const analyticalCentersService = new AnalyticalCentersService();
export const budgetsService = new BudgetsService();
export const budgetControlService = new BudgetControlService();
export const taxDeclarationsService = new TaxDeclarationsService();

export default analyticalAxisService;
