// Service de l'entreprise - données mock pour la démonstration
export const companyService = {
  getCompanyInfo: async () => {
    return {
      id: '1',
      name: 'WISEBOOK SARL',
      legalForm: 'SARL',
      rccmNumber: 'CI-ABJ-2024-B-12345',
      vatNumber: 'CI-VAT-123456789',
      address: '123 Avenue de la République',
      city: 'Abidjan',
      country: 'Côte d\'Ivoire',
      phone: '+225 27 20 12 34 56',
      email: 'contact@wisebook.com',
      website: 'www.wisebook.com',
      currency: 'F CFA',
      fiscalYearStart: '01-01',
      fiscalYearEnd: '12-31',
      accountingStandard: 'SYSCOHADA',
      logo: null,
      status: 'active'
    };
  },

  updateCompanyInfo: async (data: any) => {
    return { success: true, data };
  },

  getSettings: async () => {
    return {
      defaultCurrency: 'F CFA',
      defaultLanguage: 'fr',
      dateFormat: 'DD/MM/YYYY',
      numberFormat: 'fr-FR',
      timezone: 'Africa/Abidjan',
      backupFrequency: 'daily',
      emailNotifications: true,
      smsNotifications: false
    };
  },

  updateSettings: async (settings: any) => {
    return { success: true, settings };
  }
};