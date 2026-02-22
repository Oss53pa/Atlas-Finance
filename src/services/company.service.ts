/**
 * Company Service - Mode local
 * Données société en mode frontend-only
 */

const defaultCompany = {
  id: 'local-company',
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
  logo: null as string | null,
};

export const companyService = {
  getCurrentCompany: async () => {
    const saved = localStorage.getItem('atlas_company_data');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* fallthrough */ }
    }
    return { ...defaultCompany };
  },

  getCompanyStatistics: async () => ({
    total_utilisateurs: 0,
    total_exercices: 0,
    total_comptes: 0,
  }),

  updateCompany: async (data: Record<string, unknown>) => {
    const current = await companyService.getCurrentCompany();
    const updated = { ...current, ...data };
    localStorage.setItem('atlas_company_data', JSON.stringify(updated));
    return updated;
  },

  getCompanyInfo: async () => companyService.getCurrentCompany(),
  updateCompanyInfo: async (data: Record<string, unknown>) => ({
    success: true,
    data: await companyService.updateCompany(data),
  }),

  getSettings: async () => ({
    defaultCurrency: 'XAF',
    defaultLanguage: 'fr',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'fr-FR',
    timezone: 'Africa/Douala',
    backupFrequency: 'daily',
    emailNotifications: true,
    smsNotifications: false,
  }),

  updateSettings: async (settings: Record<string, unknown>) => ({
    success: true,
    settings,
  }),
};
