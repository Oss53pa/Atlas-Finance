/**
 * Backend Services Index
 * Re-exports backend services for frontend adaptation
 */
import { apiService } from './api';

const BASE_PATH = '/api/v1';

// Tiers Service (Third Party)
class TiersService {
  async getAll(params?: any) {
    const response = await apiService.get(`${BASE_PATH}/tiers/`, { params });
    return response.data;
  }

  async getById(id: string) {
    const response = await apiService.get(`${BASE_PATH}/tiers/${id}/`);
    return response.data;
  }

  async create(data: any) {
    const response = await apiService.post(`${BASE_PATH}/tiers/`, data);
    return response.data;
  }

  async update(id: string, data: any) {
    const response = await apiService.patch(`${BASE_PATH}/tiers/${id}/`, data);
    return response.data;
  }

  async delete(id: string) {
    const response = await apiService.delete(`${BASE_PATH}/tiers/${id}/`);
    return response.data;
  }
}

// Adresse Tiers Service
class AdresseTiersService {
  async getAll(tiersId: string) {
    const response = await apiService.get(`${BASE_PATH}/tiers/${tiersId}/adresses/`);
    return response.data;
  }

  async create(tiersId: string, data: any) {
    const response = await apiService.post(`${BASE_PATH}/tiers/${tiersId}/adresses/`, data);
    return response.data;
  }

  async update(tiersId: string, adresseId: string, data: any) {
    const response = await apiService.patch(`${BASE_PATH}/tiers/${tiersId}/adresses/${adresseId}/`, data);
    return response.data;
  }

  async delete(tiersId: string, adresseId: string) {
    const response = await apiService.delete(`${BASE_PATH}/tiers/${tiersId}/adresses/${adresseId}/`);
    return response.data;
  }
}

// Contact Tiers Service
class ContactTiersService {
  async getAll(tiersId: string) {
    const response = await apiService.get(`${BASE_PATH}/tiers/${tiersId}/contacts/`);
    return response.data;
  }

  async create(tiersId: string, data: any) {
    const response = await apiService.post(`${BASE_PATH}/tiers/${tiersId}/contacts/`, data);
    return response.data;
  }

  async update(tiersId: string, contactId: string, data: any) {
    const response = await apiService.patch(`${BASE_PATH}/tiers/${tiersId}/contacts/${contactId}/`, data);
    return response.data;
  }

  async delete(tiersId: string, contactId: string) {
    const response = await apiService.delete(`${BASE_PATH}/tiers/${tiersId}/contacts/${contactId}/`);
    return response.data;
  }
}


// Societe Service (Company)
class SocieteService {
  async list(params?: any) {
    const response = await apiService.get(`${BASE_PATH}/societes/`, { params });
    return response.data;
  }

  async getById(id: string) {
    const response = await apiService.get(`${BASE_PATH}/societes/${id}/`);
    return response.data;
  }

  async create(data: any) {
    const response = await apiService.post(`${BASE_PATH}/societes/`, data);
    return response.data;
  }

  async patch(id: string, data: any) {
    const response = await apiService.patch(`${BASE_PATH}/societes/${id}/`, data);
    return response.data;
  }

  async delete(id: string) {
    const response = await apiService.delete(`${BASE_PATH}/societes/${id}/`);
    return response.data;
  }
}

export const tiersService = new TiersService();
export const adresseTiersService = new AdresseTiersService();
export const contactTiersService = new ContactTiersService();
export const societeService = new SocieteService();
