/**
 * Service API WiseBook - Adapté au nouveau backend comptable
 * Synchronisé avec les routes backend définies
 */

import { apiService } from './api.service';
import type {
  ApiResponse,
  PaginatedResponse,
  QueryParams
} from './api.service';

// Import des types partagés (à créer/adapter)
export interface Journal {
  id: string;
  companyId: string;
  typeId: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  lastEntryNumber: number;
  createdAt: Date;
  updatedAt: Date;
  type?: JournalType;
  company?: Company;
}

export interface JournalType {
  id: string;
  code: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Account {
  id: string;
  companyId: string;
  classId: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  isReconcilable: boolean;
  isCashAccount: boolean;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  class?: AccountClass;
  company?: Company;
}

export interface AccountClass {
  id: string;
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalEntry {
  id: string;
  journalId: string;
  exerciseId: string;
  entryNumber: string;
  entryDate: Date;
  description: string;
  reference?: string;
  status: 'DRAFT' | 'VALIDATED' | 'CANCELLED';
  totalDebit: number;
  totalCredit: number;
  createdById: string;
  validatedById?: string;
  validatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  journal?: Journal;
  lines?: EntryLine[];
  createdBy?: User;
  validatedBy?: User;
}

export interface EntryLine {
  id: string;
  entryId: string;
  lineNumber: number;
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
  analyticalCode?: string;
  thirdPartyId?: string;
  dueDate?: Date;
  reconciled: boolean;
  reconciledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  account?: Account;
}

export interface Company {
  id: string;
  name: string;
  legalName?: string;
  taxNumber: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'ACCOUNTANT' | 'AUDITOR' | 'USER' | 'VIEWER';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// DTOs pour les créations
export interface CreateJournalDTO {
  code: string;
  name: string;
  typeId: string;
  companyId: string;
  description?: string;
}

export interface CreateEntryDTO {
  journalId: string;
  exerciseId: string;
  entryDate: Date;
  description: string;
  reference?: string;
  lines: CreateEntryLineDTO[];
}

export interface CreateEntryLineDTO {
  accountId: string;
  debit?: number;
  credit?: number;
  description?: string;
  analyticalCode?: string;
  thirdPartyId?: string;
  dueDate?: Date;
}

/**
 * Service API pour les Journaux
 */
export class JournalApiService {
  private baseUrl = '/api/journals';

  async getAll(params?: QueryParams): Promise<ApiResponse<Journal[]>> {
    const queryString = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    return apiService.get(`${this.baseUrl}${queryString}`);
  }

  async getById(id: string): Promise<ApiResponse<Journal>> {
    return apiService.get(`${this.baseUrl}/${id}`);
  }

  async create(data: CreateJournalDTO): Promise<ApiResponse<Journal>> {
    return apiService.post(this.baseUrl, data);
  }

  async update(id: string, data: Partial<CreateJournalDTO>): Promise<ApiResponse<Journal>> {
    return apiService.put(`${this.baseUrl}/${id}`, data);
  }

  async delete(id: string): Promise<ApiResponse<void>> {
    return apiService.delete(`${this.baseUrl}/${id}`);
  }

  async getTypes(): Promise<ApiResponse<JournalType[]>> {
    return apiService.get(`${this.baseUrl}/types`);
  }
}

/**
 * Service API pour les Comptes
 */
export class AccountApiService {
  private baseUrl = '/api/accounts';

  async getAll(params?: QueryParams): Promise<ApiResponse<Account[]>> {
    const queryString = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    return apiService.get(`${this.baseUrl}${queryString}`);
  }

  async getById(id: string): Promise<ApiResponse<Account>> {
    return apiService.get(`${this.baseUrl}/${id}`);
  }

  async getBalance(id: string, exerciseId?: string, startDate?: string, endDate?: string): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    if (exerciseId) params.append('exerciseId', exerciseId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    return apiService.get(`${this.baseUrl}/${id}/balance?${params.toString()}`);
  }

  async getClasses(): Promise<ApiResponse<AccountClass[]>> {
    return apiService.get(`${this.baseUrl}/classes`);
  }

  async create(data: any): Promise<ApiResponse<Account>> {
    return apiService.post(this.baseUrl, data);
  }

  async update(id: string, data: any): Promise<ApiResponse<Account>> {
    return apiService.put(`${this.baseUrl}/${id}`, data);
  }

  async delete(id: string): Promise<ApiResponse<void>> {
    return apiService.delete(`${this.baseUrl}/${id}`);
  }
}

/**
 * Service API pour les Écritures
 */
export class EntryApiService {
  private baseUrl = '/api/entries';

  async getAll(params?: QueryParams): Promise<PaginatedResponse<JournalEntry>> {
    const queryString = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    return apiService.get(`${this.baseUrl}${queryString}`);
  }

  async getById(id: string): Promise<ApiResponse<JournalEntry>> {
    return apiService.get(`${this.baseUrl}/${id}`);
  }

  async create(data: CreateEntryDTO): Promise<ApiResponse<JournalEntry>> {
    return apiService.post(this.baseUrl, data);
  }

  async update(id: string, data: Partial<CreateEntryDTO>): Promise<ApiResponse<JournalEntry>> {
    return apiService.put(`${this.baseUrl}/${id}`, data);
  }

  async validate(id: string): Promise<ApiResponse<JournalEntry>> {
    return apiService.post(`${this.baseUrl}/${id}/validate`);
  }

  async delete(id: string): Promise<ApiResponse<void>> {
    return apiService.delete(`${this.baseUrl}/${id}`);
  }
}

/**
 * Service API pour les Rapports
 */
export class ReportApiService {
  private baseUrl = '/api/reports';

  async getBalanceSheet(params: {
    exerciseId: string;
    date: string;
    companyId?: string;
  }): Promise<ApiResponse<any>> {
    const queryString = new URLSearchParams(params).toString();
    return apiService.get(`${this.baseUrl}/balance-sheet?${queryString}`);
  }

  async getIncomeStatement(params: {
    exerciseId: string;
    startDate: string;
    endDate: string;
    companyId?: string;
  }): Promise<ApiResponse<any>> {
    const queryString = new URLSearchParams(params).toString();
    return apiService.get(`${this.baseUrl}/income-statement?${queryString}`);
  }

  async getGeneralLedger(params: {
    exerciseId: string;
    startDate?: string;
    endDate?: string;
    accountCodeFrom?: string;
    accountCodeTo?: string;
    companyId?: string;
  }): Promise<ApiResponse<any>> {
    const queryString = new URLSearchParams(params).toString();
    return apiService.get(`${this.baseUrl}/general-ledger?${queryString}`);
  }

  async getTrialBalance(params: {
    exerciseId: string;
    date: string;
    level?: string;
    companyId?: string;
  }): Promise<ApiResponse<any>> {
    const queryString = new URLSearchParams(params).toString();
    return apiService.get(`${this.baseUrl}/trial-balance?${queryString}`);
  }

  async getJournal(params: {
    journalId: string;
    exerciseId: string;
    startDate?: string;
    endDate?: string;
    page?: string;
    limit?: string;
  }): Promise<ApiResponse<any>> {
    const queryString = new URLSearchParams(params).toString();
    return apiService.get(`${this.baseUrl}/journal?${queryString}`);
  }

  async exportReport(params: {
    type: string;
    format?: string;
    [key: string]: any;
  }): Promise<any> {
    const queryString = new URLSearchParams(params).toString();
    return apiService.get(`${this.baseUrl}/export?${queryString}`);
  }
}

// Instances des services
export const journalApi = new JournalApiService();
export const accountApi = new AccountApiService();
export const entryApi = new EntryApiService();
export const reportApi = new ReportApiService();

// Service agrégé pour compatibilité
export const wiseBookApi = {
  journals: journalApi,
  accounts: accountApi,
  entries: entryApi,
  reports: reportApi,
};