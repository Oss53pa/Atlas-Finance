// Service des tiers - données mock pour la démonstration
export const thirdPartyService = {
  getCustomers: async (filters?: any) => {
    const customers = [
      {
        id: '1',
        name: 'ABC Corporation',
        email: 'contact@abc-corp.com',
        phone: '+225 01 02 03 04',
        balance: 850000,
        status: 'active',
        ville: 'Abidjan',
        segment: 'Enterprise',
        commercial: 'Jean Martin'
      },
      {
        id: '2',
        name: 'XYZ Entreprise',
        email: 'info@xyz-ent.com',
        phone: '+225 05 06 07 08',
        balance: 420000,
        status: 'active',
        ville: 'Bouaké',
        segment: 'PME',
        commercial: 'Marie Kouassi'
      }
    ];
    
    return {
      customers,
      totalPages: 1,
      totalCount: customers.length,
      currentPage: 1
    };
  },

  getSuppliers: async (filters?: any) => {
    const suppliers = [
      {
        id: '1',
        name: 'Fournisseur Alpha',
        email: 'contact@alpha.com',
        phone: '+225 11 12 13 14',
        balance: -320000,
        status: 'active'
      }
    ];
    
    return {
      suppliers,
      totalPages: 1,
      totalCount: suppliers.length,
      currentPage: 1
    };
  },

  getContacts: async (filters?: any) => {
    const contacts = [
      {
        id: '1',
        name: 'Jean Dupont',
        company: 'ABC Corporation',
        email: 'j.dupont@abc-corp.com',
        phone: '+225 01 02 03 04',
        role: 'Directeur Commercial'
      }
    ];
    
    return {
      contacts,
      totalPages: 1,
      totalCount: contacts.length,
      currentPage: 1
    };
  },

  deleteCustomer: async (id: string) => {
    // Mock delete
    return { success: true };
  },

  deleteSupplier: async (id: string) => {
    // Mock delete
    return { success: true };
  },

  deleteContact: async (id: string) => {
    // Mock delete
    return { success: true };
  },

  getCompanies: async (filters?: any) => {
    return [
      { id: '1', name: 'ABC Corporation' },
      { id: '2', name: 'XYZ Entreprise' }
    ];
  },

  getDashboardStats: async () => {
    return {
      totalCustomers: 247,
      activeCustomers: 195,
      totalSuppliers: 58,
      activeSuppliers: 52,
      totalReceivables: 4250000,
      overdueReceivables: 125000,
      totalPayables: 1850000,
      overduePayables: 85000
    };
  },

  getRecentCustomers: async (limit: number = 5) => {
    return [
      {
        id: '1',
        name: 'ABC Corporation',
        email: 'contact@abc-corp.com',
        createdAt: '2024-08-20',
        balance: 850000
      }
    ];
  },

  getAgedReceivables: async () => {
    return {
      current: 3500000,
      days_30: 450000,
      days_60: 200000,
      days_90: 100000,
      over_90: 125000
    };
  }
};