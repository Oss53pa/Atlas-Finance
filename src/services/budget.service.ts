// Service du budget - données mock pour la démonstration
export const budgetService = {
  getDashboardStats: async () => {
    return {
      totalBudget: 12000000,
      consumedBudget: 8500000,
      remainingBudget: 3500000,
      consumptionRate: 70.8,
      activeBudgets: 5,
      exceededBudgets: 2
    };
  },

  getBudgets: async (filters?: any) => {
    const budgets = [
      {
        id: '1',
        name: 'Budget Commercial 2024',
        category: 'Ventes',
        totalAmount: 5000000,
        consumedAmount: 3800000,
        remainingAmount: 1200000,
        period: '2024',
        status: 'active',
        consumptionRate: 76.0
      },
      {
        id: '2',
        name: 'Budget Marketing 2024',
        category: 'Marketing',
        totalAmount: 2000000,
        consumedAmount: 1500000,
        remainingAmount: 500000,
        period: '2024',
        status: 'active',
        consumptionRate: 75.0
      }
    ];
    
    return { budgets, totalPages: 1, totalCount: budgets.length, currentPage: 1 };
  },

  getBudgetControl: async () => {
    return {
      variances: [
        {
          category: 'Ventes',
          budgeted: 5000000,
          actual: 4200000,
          variance: -800000,
          variancePercent: -16.0
        }
      ]
    };
  },

  deleteBudget: async (id: string) => {
    return { success: true };
  }
};