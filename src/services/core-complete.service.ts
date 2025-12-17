/**
 * Core Complete Service
 * Provides company, fiscal year, and currency management
 */
import { apiService } from './api';

const BASE_PATH = '/api/v1';

// Types
export interface Company {
  id: string;
  code: string;
  name: string;
  legal_form?: string;
  tax_id?: string;
  registration_number?: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  currency_code: string;
  fiscal_year_start_month: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FiscalYear {
  id: string;
  company_id: string;
  code: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'open' | 'closing' | 'closed';
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
  is_active: boolean;
  is_base_currency: boolean;
  exchange_rate?: number;
}

export interface CreateCompanyDto {
  code: string;
  name: string;
  legal_form?: string;
  currency_code?: string;
}

export interface UpdateCompanyDto {
  name?: string;
  legal_form?: string;
  address?: string;
  is_active?: boolean;
}

// Companies Service
class CompaniesService {
  async getAll(params?: any): Promise<{ results: Company[]; count: number }> {
    try {
      const response = await apiService.get(`${BASE_PATH}/core/companies/`, { params });
      return response.data;
    } catch {
      return { results: [], count: 0 };
    }
  }

  async getById(id: string): Promise<Company | null> {
    try {
      const response = await apiService.get(`${BASE_PATH}/core/companies/${id}/`);
      return response.data;
    } catch {
      return null;
    }
  }

  async create(data: CreateCompanyDto): Promise<Company> {
    const response = await apiService.post(`${BASE_PATH}/core/companies/`, data);
    return response.data;
  }

  async update(id: string, data: UpdateCompanyDto): Promise<Company> {
    const response = await apiService.patch(`${BASE_PATH}/core/companies/${id}/`, data);
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/core/companies/${id}/`);
  }
}

// Fiscal Years Service
class FiscalYearsService {
  async getAll(params?: any): Promise<{ results: FiscalYear[]; count: number }> {
    try {
      const response = await apiService.get(`${BASE_PATH}/core/fiscal-years/`, { params });
      return response.data;
    } catch {
      return { results: [], count: 0 };
    }
  }

  async getById(id: string): Promise<FiscalYear | null> {
    try {
      const response = await apiService.get(`${BASE_PATH}/core/fiscal-years/${id}/`);
      return response.data;
    } catch {
      return null;
    }
  }

  async create(data: Partial<FiscalYear>): Promise<FiscalYear> {
    const response = await apiService.post(`${BASE_PATH}/core/fiscal-years/`, data);
    return response.data;
  }

  async update(id: string, data: Partial<FiscalYear>): Promise<FiscalYear> {
    const response = await apiService.patch(`${BASE_PATH}/core/fiscal-years/${id}/`, data);
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/core/fiscal-years/${id}/`);
  }

  async getCurrent(companyId: string): Promise<FiscalYear | null> {
    try {
      const response = await apiService.get(`${BASE_PATH}/core/fiscal-years/current/`, {
        params: { company_id: companyId }
      });
      return response.data;
    } catch {
      return null;
    }
  }
}

// Currencies Service
class CurrenciesService {
  async getAll(params?: any): Promise<{ results: Currency[]; count: number }> {
    try {
      const response = await apiService.get(`${BASE_PATH}/core/currencies/`, { params });
      return response.data;
    } catch {
      return { results: [], count: 0 };
    }
  }

  async getById(id: string): Promise<Currency | null> {
    try {
      const response = await apiService.get(`${BASE_PATH}/core/currencies/${id}/`);
      return response.data;
    } catch {
      return null;
    }
  }

  async create(data: Partial<Currency>): Promise<Currency> {
    const response = await apiService.post(`${BASE_PATH}/core/currencies/`, data);
    return response.data;
  }

  async update(id: string, data: Partial<Currency>): Promise<Currency> {
    const response = await apiService.patch(`${BASE_PATH}/core/currencies/${id}/`, data);
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/core/currencies/${id}/`);
  }
}

export const companiesService = new CompaniesService();
export const fiscalYearsService = new FiscalYearsService();
export const currenciesService = new CurrenciesService();

// Re-export coreService for backwards compatibility
export { coreService } from './core.service';
export { coreService as default } from './core.service';
