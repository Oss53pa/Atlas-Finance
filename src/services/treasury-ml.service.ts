/**
 * Treasury ML Service - Stub
 * Machine Learning predictions for treasury management
 */

import { apiService } from './api';

interface CashFlowPredictionParams {
  company_id: string;
  forecast_days: number;
  confidence_level: number;
  include_scenarios: boolean;
  historical_months: number;
}

interface CashFlowPrediction {
  predictions: Array<{
    forecast_date: string;
    predicted_balance: number;
    confidence_lower: number;
    confidence_upper: number;
  }>;
  scenarios: {
    optimistic: number;
    most_likely: number;
    pessimistic: number;
  };
}

interface AIRecommendation {
  id: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
}

class TreasuryMLService {
  private BASE_PATH = '/api/v1/treasury/ml';

  async predictCashFlow(params: CashFlowPredictionParams): Promise<CashFlowPrediction> {
    try {
      const response = await apiService.post(`${this.BASE_PATH}/predict-cash-flow/`, params);
      return response.data;
    } catch (error) {
      // Return mock data if API fails
      const predictions = [];
      const today = new Date();
      for (let i = 0; i < params.forecast_days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        predictions.push({
          forecast_date: date.toISOString().split('T')[0],
          predicted_balance: 0, // TODO: wire to ML prediction model
          confidence_lower: 0,
          confidence_upper: 0
        });
      }
      return {
        predictions,
        scenarios: {
          optimistic: 60000000,
          most_likely: 52000000,
          pessimistic: 45000000
        }
      };
    }
  }

  async getAIRecommendations(companyId: string): Promise<{
    recommendations: AIRecommendation[];
  }> {
    try {
      const response = await apiService.get(`${this.BASE_PATH}/recommendations/`, {
        params: { company_id: companyId }
      });
      return response.data;
    } catch (error) {
      return {
        recommendations: []
      };
    }
  }
}

const treasuryMLService = new TreasuryMLService();
export default treasuryMLService;
