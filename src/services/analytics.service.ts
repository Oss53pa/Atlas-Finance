// Service d'analytique - données mock pour la démonstration
export const analyticsService = {
  getDashboardStats: async () => {
    return {
      totalAxes: 5,
      activeCostCenters: 12,
      totalAllocations: 2450000,
      pendingAllocations: 125000
    };
  },

  getAnalyticalAxes: async (filters?: any) => {
    const axes = [
      {
        id: '1',
        code: 'AXE001',
        name: 'Centres de Coûts',
        type: 'cost_center',
        status: 'active'
      },
      {
        id: '2',
        code: 'AXE002', 
        name: 'Projets',
        type: 'project',
        status: 'active'
      }
    ];
    
    return { axes, totalPages: 1, totalCount: axes.length, currentPage: 1 };
  },

  getCostCenters: async (filters?: any) => {
    const costCenters = [
      {
        id: '1',
        code: 'CC001',
        name: 'Direction Générale',
        type: 'administratif',
        budget: 500000,
        consumed: 420000,
        percentage: 84.0
      },
      {
        id: '2',
        code: 'CC002',
        name: 'Production',
        type: 'opérationnel', 
        budget: 1200000,
        consumed: 950000,
        percentage: 79.2
      }
    ];
    
    return { costCenters, totalPages: 1, totalCount: costCenters.length, currentPage: 1 };
  },

  deleteAxis: async (id: string) => {
    return { success: true };
  },

  deleteCostCenter: async (id: string) => {
    return { success: true };
  }
};