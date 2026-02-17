/**
 * Analytics Advanced Service - Stub
 * Provides global KPI analytics across modules
 */

import { apiService } from './api';

interface GlobalKPIParams {
  company_id: string;
  date_from: string;
  date_to: string;
  modules: string[];
}

interface GlobalKPIs {
  treasury?: {
    cash_flow: number;
    cash_position: number;
  };
  accounting?: {
    total_entries: number;
    balance: number;
  };
  [key: string]: any;
}

class AnalyticsAdvancedService {
  private BASE_PATH = '/api/v1/analytics';

  async getGlobalKPIs(params: GlobalKPIParams): Promise<GlobalKPIs> {
    try {
      const response = await apiService.get(`${this.BASE_PATH}/global-kpis/`, { params });
      return response.data;
    } catch (error) {
      // Return default values if API fails
      return {
        treasury: {
          cash_flow: 0,
          cash_position: 0
        },
        accounting: {
          total_entries: 0,
          balance: 0
        }
      };
    }
  }
}

const analyticsAdvancedService = new AnalyticsAdvancedService();
export default analyticsAdvancedService;
