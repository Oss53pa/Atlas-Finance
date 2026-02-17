/**
 * Core Complete Service - Supabase Direct
 * Provides company, fiscal year, and currency management
 */
import { supabase } from '@/lib/supabase';
import { queryTable, getById, insertRecord, updateRecord, deleteRecord } from './api.service';

// Types
export interface Company {
  id: string;
  code: string;
  nom: string;
  description?: string;
  email?: string;
  telephone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
  // Aliases for backwards compat
  name?: string;
}

export interface FiscalYear {
  id: string;
  company_id: string;
  code: string;
  name: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Currency {
  id: string;
  code: string;
  nom: string;
  symbole: string;
  taux_change: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Aliases
  name?: string;
  symbol?: string;
  exchange_rate?: number;
}

export interface CreateCompanyDto {
  code: string;
  nom: string;
  description?: string;
  email?: string;
  telephone?: string;
  address?: string;
}

export interface UpdateCompanyDto {
  nom?: string;
  description?: string;
  email?: string;
  telephone?: string;
  address?: string;
}

// Companies Service
class CompaniesService {
  async getAll(params?: any): Promise<{ results: Company[]; count: number }> {
    try {
      const result = await queryTable<Company>('societes', {
        page: params?.page || 1,
        pageSize: params?.page_size || 20,
        search: params?.search ? { column: 'nom', value: params.search } : null,
        sortBy: 'nom',
        sortOrder: 'asc',
      });
      return { results: result.data, count: result.total };
    } catch {
      return { results: [], count: 0 };
    }
  }

  async getById(id: string): Promise<Company | null> {
    try {
      return await getById<Company>('societes', id);
    } catch {
      return null;
    }
  }

  async create(data: CreateCompanyDto): Promise<Company> {
    return await insertRecord<Company>('societes', data);
  }

  async update(id: string, data: UpdateCompanyDto): Promise<Company> {
    return await updateRecord<Company>('societes', id, data);
  }

  async delete(id: string): Promise<void> {
    await deleteRecord('societes', id);
  }
}

// Fiscal Years Service
class FiscalYearsService {
  async getAll(params?: any): Promise<{ results: FiscalYear[]; count: number }> {
    try {
      const filters: Record<string, any> = {};
      if (params?.company_id) filters.company_id = params.company_id;
      if (params?.is_active !== undefined) filters.is_active = params.is_active;
      if (params?.is_closed !== undefined) filters.is_closed = params.is_closed;

      const result = await queryTable<FiscalYear>('fiscal_years', {
        page: params?.page || 1,
        pageSize: params?.page_size || 20,
        filters,
        sortBy: 'start_date',
        sortOrder: 'desc',
      });
      return { results: result.data, count: result.total };
    } catch {
      return { results: [], count: 0 };
    }
  }

  async getById(id: string): Promise<FiscalYear | null> {
    try {
      return await getById<FiscalYear>('fiscal_years', id);
    } catch {
      return null;
    }
  }

  async create(data: Partial<FiscalYear>): Promise<FiscalYear> {
    return await insertRecord<FiscalYear>('fiscal_years', data);
  }

  async update(id: string, data: Partial<FiscalYear>): Promise<FiscalYear> {
    return await updateRecord<FiscalYear>('fiscal_years', id, data);
  }

  async delete(id: string): Promise<void> {
    await deleteRecord('fiscal_years', id);
  }

  async getCurrent(companyId: string): Promise<FiscalYear | null> {
    try {
      const { data, error } = await supabase
        .from('fiscal_years')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .eq('is_closed', false)
        .order('start_date', { ascending: false })
        .limit(1)
        .single();

      if (error) return null;
      return data as FiscalYear;
    } catch {
      return null;
    }
  }
}

// Currencies Service
class CurrenciesService {
  async getAll(params?: any): Promise<{ results: Currency[]; count: number }> {
    try {
      const filters: Record<string, any> = {};
      if (params?.is_active !== undefined) filters.is_active = params.is_active;

      const result = await queryTable<Currency>('devises', {
        page: params?.page || 1,
        pageSize: params?.page_size || 50,
        filters,
        sortBy: 'code',
        sortOrder: 'asc',
      });
      return { results: result.data, count: result.total };
    } catch {
      return { results: [], count: 0 };
    }
  }

  async getById(id: string): Promise<Currency | null> {
    try {
      return await getById<Currency>('devises', id);
    } catch {
      return null;
    }
  }

  async create(data: Partial<Currency>): Promise<Currency> {
    return await insertRecord<Currency>('devises', data);
  }

  async update(id: string, data: Partial<Currency>): Promise<Currency> {
    return await updateRecord<Currency>('devises', id, data);
  }

  async delete(id: string): Promise<void> {
    await deleteRecord('devises', id);
  }
}

export const companiesService = new CompaniesService();
export const fiscalYearsService = new FiscalYearsService();
export const currenciesService = new CurrenciesService();

const coreServices = {
  companies: companiesService,
  fiscalYears: fiscalYearsService,
  currencies: currenciesService,
};

export { coreServices as coreService };
export default coreServices;
