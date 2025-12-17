/**
 * Third Party Complete Service - Provides full third party functionality
 */
import { apiService } from './api';

const BASE_PATH = '/api/v1/third-party';

export interface ThirdParty { id: string; code: string; name: string; type: string; email?: string; phone?: string; address?: string; city?: string; country?: string; tax_id?: string; is_active: boolean; }
export interface Contact { id: string; third_party_id: string; name: string; position?: string; email?: string; phone?: string; is_primary: boolean; }
export interface CreateThirdPartyDto { code: string; name: string; type: string; email?: string; }
export interface UpdateThirdPartyDto { name?: string; email?: string; phone?: string; is_active?: boolean; }
export interface ThirdPartyQueryParams { page?: number; page_size?: number; search?: string; type?: string; is_active?: boolean; }

class ThirdPartyServiceClass {
  async getAll(params?: ThirdPartyQueryParams) { try { const r = await apiService.get(`${BASE_PATH}/`, { params }); return r.data; } catch { return { results: [], count: 0 }; } }
  async getById(id: string) { try { const r = await apiService.get(`${BASE_PATH}/${id}/`); return r.data; } catch { return null; } }
  async create(data: CreateThirdPartyDto) { const r = await apiService.post(`${BASE_PATH}/`, data); return r.data; }
  async update(id: string, data: UpdateThirdPartyDto) { const r = await apiService.patch(`${BASE_PATH}/${id}/`, data); return r.data; }
  async delete(id: string) { await apiService.delete(`${BASE_PATH}/${id}/`); }
  async getCustomers(params?: any) { return this.getAll({ ...params, type: 'customer' }); }
  async getSuppliers(params?: any) { return this.getAll({ ...params, type: 'supplier' }); }
}

class ContactsService {
  async getAll(thirdPartyId: string) { try { const r = await apiService.get(`${BASE_PATH}/${thirdPartyId}/contacts/`); return r.data; } catch { return []; } }
  async create(thirdPartyId: string, data: Partial<Contact>) { const r = await apiService.post(`${BASE_PATH}/${thirdPartyId}/contacts/`, data); return r.data; }
  async update(thirdPartyId: string, contactId: string, data: Partial<Contact>) { const r = await apiService.patch(`${BASE_PATH}/${thirdPartyId}/contacts/${contactId}/`, data); return r.data; }
  async delete(thirdPartyId: string, contactId: string) { await apiService.delete(`${BASE_PATH}/${thirdPartyId}/contacts/${contactId}/`); }
}

class ThirdPartyReportsService {
  async getAgingReport(params?: any) { try { const r = await apiService.get(`${BASE_PATH}/reports/aging/`, { params }); return r.data; } catch { return { customers: [], suppliers: [] }; } }
  async getBalanceReport(params?: any) { try { const r = await apiService.get(`${BASE_PATH}/reports/balance/`, { params }); return r.data; } catch { return { balances: [] }; } }
  async getStatementReport(thirdPartyId: string, params?: any) { try { const r = await apiService.get(`${BASE_PATH}/${thirdPartyId}/statement/`, { params }); return r.data; } catch { return { transactions: [], balance: 0 }; } }
}

export const thirdPartyService = new ThirdPartyServiceClass();
export const contactsService = new ContactsService();
export const thirdPartyReportsService = new ThirdPartyReportsService();

export { thirdPartyService as default };
