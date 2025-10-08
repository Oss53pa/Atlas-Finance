import {
  BudgetSession,
  BudgetLine,
  DepartmentBudget,
  BudgetStats,
  MonthlyBudget,
  BudgetAlert,
  BudgetForecast,
} from '../types/budgeting.types';

class BudgetingService {
  async getSessions(): Promise<BudgetSession[]> {
    return Promise.resolve([
      {
        id: 1,
        year: '2025',
        department: 'Finance & Comptabilité',
        period: 'Annuel',
        startDate: '01/01/2025',
        endDate: '31/12/2025',
        status: 'active',
        createdBy: 'Admin',
        createdDate: '15/12/2024',
        progress: 15,
      },
      {
        id: 2,
        year: '2025',
        department: 'Facturation',
        period: 'Q1',
        startDate: '01/01/2025',
        endDate: '31/03/2025',
        status: 'active',
        createdBy: 'Manager',
        createdDate: '20/12/2024',
        progress: 25,
      },
      {
        id: 3,
        year: '2024',
        department: 'Finance & Comptabilité',
        period: 'Annuel',
        startDate: '01/01/2024',
        endDate: '31/12/2024',
        status: 'closed',
        createdBy: 'Admin',
        createdDate: '15/12/2023',
        progress: 100,
      },
    ]);
  }

  async createSession(session: Omit<BudgetSession, 'id'>): Promise<BudgetSession> {
    return Promise.resolve({
      ...session,
      id: Date.now(),
    });
  }

  async updateSession(id: number | string, updates: Partial<BudgetSession>): Promise<BudgetSession> {
    return Promise.resolve({
      id,
      ...updates,
    } as BudgetSession);
  }

  async deleteSession(id: number | string): Promise<void> {
    return Promise.resolve();
  }

  async getDepartmentBudgets(year?: string, period?: string): Promise<DepartmentBudget[]> {
    return Promise.resolve([
      { name: 'Facturation', budget: 0, actual: 0, variance: 0, variancePercent: 0 },
      {
        name: 'General Admin',
        budget: 350000000,
        actual: 291587212,
        variance: 58412788,
        variancePercent: 16.7,
      },
      {
        name: 'Finance & Comptabilité',
        budget: 2000000000,
        actual: 1808263133,
        variance: 191736867,
        variancePercent: 9.6,
      },
      {
        name: 'Marketing',
        budget: 150000000,
        actual: 101225000,
        variance: 48775000,
        variancePercent: 32.5,
      },
      {
        name: 'Commercial',
        budget: 3200000000,
        actual: 3459621124,
        variance: -259621124,
        variancePercent: -8.1,
      },
      {
        name: 'Facility Management',
        budget: 250000000,
        actual: 206860000,
        variance: 43140000,
        variancePercent: 17.3,
      },
      { name: 'Security Management', budget: 0, actual: 0, variance: 0, variancePercent: 0 },
      {
        name: 'Ressources Humaines',
        budget: 400000000,
        actual: 349834692,
        variance: 50165308,
        variancePercent: 12.5,
      },
    ]);
  }

  async getBudgetLines(filters?: {
    department?: string;
    year?: string;
    period?: string;
  }): Promise<BudgetLine[]> {
    return Promise.resolve([]);
  }

  async createBudgetLine(line: Omit<BudgetLine, 'id'>): Promise<BudgetLine> {
    return Promise.resolve({
      ...line,
      id: Date.now(),
    });
  }

  async updateBudgetLine(id: number | string, updates: Partial<BudgetLine>): Promise<BudgetLine> {
    return Promise.resolve({
      id,
      ...updates,
    } as BudgetLine);
  }

  async deleteBudgetLine(id: number | string): Promise<void> {
    return Promise.resolve();
  }

  async getStats(year?: string, period?: string): Promise<BudgetStats> {
    return Promise.resolve({
      totalBudget: 6350000000,
      totalActual: 6217391161,
      totalVariance: 132608839,
      variancePercent: 2.1,
      departmentsCount: 8,
      accountsCount: 45,
      activeSessions: 2,
    });
  }

  async getMonthlyBudgets(year: string, department?: string): Promise<MonthlyBudget[]> {
    const months = [
      'Janvier',
      'Février',
      'Mars',
      'Avril',
      'Mai',
      'Juin',
      'Juillet',
      'Août',
      'Septembre',
      'Octobre',
      'Novembre',
      'Décembre',
    ];

    return Promise.resolve(
      months.map((month, index) => {
        const budget = 500000000 + index * 10000000;
        const actual = budget * (0.8 + Math.random() * 0.4);
        return {
          month,
          budget,
          actual,
          variance: budget - actual,
          variancePercent: ((budget - actual) / budget) * 100,
        };
      })
    );
  }

  async getAlerts(): Promise<BudgetAlert[]> {
    return Promise.resolve([
      {
        id: 1,
        type: 'danger',
        title: 'Dépassement Budgétaire',
        message: 'Le département Commercial a dépassé son budget de 8.1%',
        department: 'Commercial',
        date: new Date().toISOString(),
        threshold: 3200000000,
        currentValue: 3459621124,
      },
      {
        id: 2,
        type: 'warning',
        title: 'Budget Proche du Seuil',
        message: 'Marketing atteint 67.5% du budget',
        department: 'Marketing',
        date: new Date().toISOString(),
        threshold: 150000000,
        currentValue: 101225000,
      },
    ]);
  }

  async getForecasts(year: string, department?: string): Promise<BudgetForecast[]> {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

    return Promise.resolve(
      months.map((month) => ({
        month,
        projected: 500000000 * (1 + Math.random() * 0.2),
        actual: Math.random() > 0.5 ? 500000000 * (0.8 + Math.random() * 0.3) : undefined,
        trend: Math.random() > 0.5 ? ('up' as const) : ('down' as const),
      }))
    );
  }

  async exportBudget(format: 'xlsx' | 'pdf' | 'csv', filters?: any): Promise<Blob> {
    return Promise.resolve(new Blob(['Mock export data'], { type: 'application/octet-stream' }));
  }

  async importBudget(file: File): Promise<{ success: boolean; imported: number; errors?: string[] }> {
    return Promise.resolve({
      success: true,
      imported: 100,
      errors: [],
    });
  }
}

export const budgetingService = new BudgetingService();