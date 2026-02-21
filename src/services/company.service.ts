import { societeService } from './backend-services.index';
import type { Societe } from '../types/backend.types';

/**
 * Company Service Adapter
 * Adapts the backend societe service to the existing frontend interface
 */
export const companyService = {
  /**
   * Get current company information
   * For now, returns the first active company
   */
  getCurrentCompany: async () => {
    const response = await societeService.list({ page_size: 1, ordering: '-created_at' });
    if (response.results && response.results.length > 0) {
      const societe = response.results[0];

      // Transform backend format to frontend format
      return {
        id: societe.id,
        code: societe.code,
        nom: societe.nom,
        forme_juridique: societe.forme_juridique || '',
        numero_rccm: societe.numero_rccm || '',
        numero_fiscal: societe.numero_fiscal || '',
        adresse: societe.adresse || '',
        telephone: societe.telephone || '',
        email: societe.email || '',
        site_web: societe.site_web || '',
        capital_social: societe.capital_social || 0,
        devise: societe.devise?.code || 'XAF',
        date_creation: societe.date_creation || '',
        active: societe.is_active,
        regime_fiscal: societe.regime_fiscal || 'Régime réel',
        longueur_compte: societe.longueur_compte || 6,
        gestion_analytique: societe.gestion_analytique || false,
        logo: societe.logo || null,
      };
    }

    // Return default if no company found
    return {
      id: '',
      code: 'DEMO',
      nom: 'Société de démonstration',
      forme_juridique: 'SARL',
      numero_rccm: '',
      numero_fiscal: '',
      adresse: '',
      telephone: '',
      email: '',
      site_web: '',
      capital_social: 0,
      devise: 'XAF',
      date_creation: new Date().toISOString(),
      active: true,
      regime_fiscal: 'Régime réel',
      longueur_compte: 6,
      gestion_analytique: false,
      logo: null,
    };
  },

  /**
   * Get company statistics
   */
  getCompanyStatistics: async () => {
    // This would require additional backend endpoints
    // For now, return placeholder data
    return {
      total_utilisateurs: 0,
      total_exercices: 0,
      total_comptes: 0,
    };
  },

  /**
   * Update company information
   */
  updateCompany: async (data: Partial<Societe> & { id: string }) => {
    if (!data.id) {
      throw new Error('Company ID is required');
    }

    // Transform frontend format to backend format
    const backendData: Partial<Societe> = {};
    if (data.nom) backendData.nom = data.nom;
    if (data.forme_juridique) backendData.forme_juridique = data.forme_juridique;
    if (data.numero_rccm) backendData.numero_rccm = data.numero_rccm;
    if (data.numero_fiscal) backendData.numero_fiscal = data.numero_fiscal;
    if (data.adresse) backendData.adresse = data.adresse;
    if (data.telephone) backendData.telephone = data.telephone;
    if (data.email) backendData.email = data.email;
    if (data.site_web) backendData.site_web = data.site_web;
    if (data.capital_social !== undefined) backendData.capital_social = data.capital_social;
    if (data.regime_fiscal) backendData.regime_fiscal = data.regime_fiscal;
    if (data.longueur_compte !== undefined) backendData.longueur_compte = data.longueur_compte;
    if (data.gestion_analytique !== undefined) backendData.gestion_analytique = data.gestion_analytique;

    const societe = await societeService.patch(data.id, backendData);

    // Transform back to frontend format
    return {
      id: societe.id,
      code: societe.code,
      nom: societe.nom,
      forme_juridique: societe.forme_juridique || '',
      numero_rccm: societe.numero_rccm || '',
      numero_fiscal: societe.numero_fiscal || '',
      adresse: societe.adresse || '',
      telephone: societe.telephone || '',
      email: societe.email || '',
      site_web: societe.site_web || '',
      capital_social: societe.capital_social || 0,
      devise: societe.devise?.code || 'XAF',
      date_creation: societe.date_creation || '',
      active: societe.is_active,
      regime_fiscal: societe.regime_fiscal || 'Régime réel',
      longueur_compte: societe.longueur_compte || 6,
      gestion_analytique: societe.gestion_analytique || false,
      logo: societe.logo || null,
    };
  },

  // Legacy methods for backwards compatibility
  getCompanyInfo: async () => {
    return companyService.getCurrentCompany();
  },

  updateCompanyInfo: async (data: Partial<Societe> & { id: string }) => {
    return { success: true, data: await companyService.updateCompany(data) };
  },

  getSettings: async () => {
    return {
      defaultCurrency: 'XAF',
      defaultLanguage: 'fr',
      dateFormat: 'DD/MM/YYYY',
      numberFormat: 'fr-FR',
      timezone: 'Africa/Douala',
      backupFrequency: 'daily',
      emailNotifications: true,
      smsNotifications: false
    };
  },

  updateSettings: async (settings: Record<string, unknown>) => {
    return { success: true, settings };
  }
};