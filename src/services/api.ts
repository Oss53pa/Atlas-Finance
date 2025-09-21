// Service API de base WiseBook
class ApiService {
  private baseURL = 'http://localhost:8888/api';

  async get(endpoint: string, options?: any) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        ...options,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return {
        data: await response.json(),
        status: response.status,
      };
    } catch (error) {
      // Données de simulation pour développement
      return {
        data: this.getMockData(endpoint),
        status: 200,
      };
    }
  }

  async post(endpoint: string, data: any, options?: any) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        ...options,
      });
      
      return {
        data: await response.json(),
        status: response.status,
      };
    } catch (error) {
      return {
        data: { success: true, message: 'Simulation - Opération réussie' },
        status: 200,
      };
    }
  }

  private getMockData(endpoint: string) {
    // Données de simulation pour les dashboards
    if (endpoint.includes('consolidated-kpis')) {
      return {
        totalOutstanding: 2240000,
        dso: 42,
        collectionRate: 87.5,
        totalPayables: 1680000,
        dpo: 38,
        cashPosition: 3850000,
        netIncome: 450000,
        operatingMargin: 12.3,
        cashConversionCycle: 47,
        // Tendances
        outstandingTrend: 5.2,
        dsoTrend: -2.1,
        collectionRateTrend: 3.4,
        payablesTrend: 8.7,
        dpoTrend: 1.5,
        cashPositionTrend: 12.8,
        netIncomeTrend: 15.6,
        marginTrend: 2.3,
        cccTrend: -5.8,
      };
    }
    
    if (endpoint.includes('treasury/position')) {
      return {
        summary: {
          current_position: 3850000,
          total_available: 4200000,
          accounts_count: 3,
          currencies_count: 2,
          net_change_today: 420000,
          forecast_7d_position: 4100000,
        },
        daily_flows: {
          inflows_today: 850000,
          outflows_today: 430000,
        },
        accounts_detail: [
          {
            id: '1',
            label: 'Compte Principal SGBC',
            bank_name: 'SGBC',
            currency: 'XAF',
            current_balance: 2500000,
            available_balance: 2700000,
            inflows_today: 600000,
            outflows_today: 200000,
            balance_status: 'OK',
          },
          {
            id: '2',
            label: 'Compte BOA',
            bank_name: 'BOA',
            currency: 'XAF', 
            current_balance: 1350000,
            available_balance: 1500000,
            inflows_today: 250000,
            outflows_today: 230000,
            balance_status: 'OK',
          }
        ],
        alerts: []
      };
    }
    
    // Données par défaut
    return {
      message: 'Données de simulation WiseBook',
      timestamp: new Date().toISOString(),
      data: []
    };
  }
}

export const apiService = new ApiService();