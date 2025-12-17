/**
 * Treasury Advanced Service
 */
import { apiService } from './api';

class TreasuryAdvancedService {
  async getAdvancedAnalytics(companyId: string) {
    try {
      const response = await apiService.get('/api/v1/treasury/advanced/analytics/', {
        params: { company_id: companyId }
      });
      return response.data;
    } catch {
      return { metrics: [], trends: [] };
    }
  }

  async getOptimizationSuggestions(companyId: string) {
    try {
      const response = await apiService.get('/api/v1/treasury/advanced/optimize/', {
        params: { company_id: companyId }
      });
      return response.data;
    } catch {
      return { suggestions: [] };
    }
  }
}

const treasuryAdvancedService = new TreasuryAdvancedService();
export default treasuryAdvancedService;
