/**
 * Service frontend pour la gestion de la trésorerie
 * Position temps réel, appels de fonds et prévisions
 */
import { apiService } from './api';

class TreasuryService {
  async getRealtimeTreasuryPosition(params: { companyId: string }) {
    const response = await apiService.get('/treasury/position', { params });
    return response.data;
  }

  async getCashFlowForecast(params: { companyId: string; forecastDays?: number }) {
    const response = await apiService.get('/treasury/cash-flow-forecast', { params });
    return response.data;
  }

  async getFundCallsDashboard(params: { companyId: string }) {
    const response = await apiService.get('/treasury/fund-calls/dashboard', { params });
    return response.data;
  }

  async getPerformanceMetrics(params: { companyId: string }) {
    const response = await apiService.get('/treasury/performance-metrics', { params });
    return response.data;
  }

  async getBankConnections(params: { companyId: string }) {
    const response = await apiService.get('/treasury/bank-connections', { params });
    return response.data;
  }

  async executeFundCall(data: { fundCallId: string; companyId: string }) {
    const response = await apiService.post(`/treasury/fund-calls/${data.fundCallId}/execute`, data);
    return response.data;
  }

  async createPayment(data: any) {
    const response = await apiService.post('/treasury/payments', data);
    return response.data;
  }

  async executePayment(data: { paymentId: string; companyId: string }) {
    const response = await apiService.post(`/treasury/payments/${data.paymentId}/execute`, data);
    return response.data;
  }

  // Méthodes héritées existantes pour compatibilité
  async getBankAccounts(filters?: any) {
    const accounts = [
      {
        id: '1',
        name: 'Compte Principal SGBCI',
        accountNumber: '01234567890',
        bank: 'SGBCI',
        type: 'Compte Courant',
        currency: 'F CFA',
        balance: 3850000,
        status: 'active'
      },
      {
        id: '2', 
        name: 'Compte Épargne BOA',
        accountNumber: '98765432101',
        bank: 'BOA',
        type: 'Compte Épargne',
        currency: 'F CFA',
        balance: 1250000,
        status: 'active'
      }
    ];
    
    return {
      accounts,
      totalPages: 1,
      totalCount: accounts.length,
      currentPage: 1
    };
  }

  async getBankMovements(filters?: any) {
    const movements = [
      {
        id: '1',
        date: '2024-08-25',
        description: 'Virement Client ABC',
        type: 'credit',
        amount: 850000,
        balance: 3850000,
        account: 'SGBCI - 01234567890'
      },
      {
        id: '2',
        date: '2024-08-24', 
        description: 'Paiement Fournisseur XYZ',
        type: 'debit',
        amount: -420000,
        balance: 3000000,
        account: 'SGBCI - 01234567890'
      }
    ];
    
    return {
      movements,
      totalPages: 1,
      totalCount: movements.length,
      currentPage: 1
    };
  }

  async getReconciliations(filters?: any) {
    const reconciliations = [
      {
        id: '1',
        account: 'SGBCI - 01234567890',
        period: 'Août 2024',
        status: 'pending',
        bankBalance: 3850000,
        bookBalance: 3820000,
        difference: 30000,
        items: 5
      }
    ];
    
    return {
      reconciliations,
      totalPages: 1,
      totalCount: reconciliations.length,
      currentPage: 1
    };
  }

  async getCashFlow(period?: string) {
    return {
      inflows: [
        { category: 'Ventes', amount: 2450000 },
        { category: 'Autres recettes', amount: 150000 }
      ],
      outflows: [
        { category: 'Achats', amount: -1200000 },
        { category: 'Charges', amount: -800000 }
      ],
      netCashFlow: 600000,
      cashPosition: 3850000
    };
  }

  async getDashboardStats() {
    return {
      totalCash: 5100000,
      totalBankAccounts: 3,
      activeBankAccounts: 3,
      pendingReconciliations: 2,
      monthlyInflows: 2600000,
      monthlyOutflows: 2000000,
      netCashFlow: 600000
    };
  }

  async deleteBankAccount(id: string) {
    return { success: true };
  }

  async deleteMovement(id: string) {
    return { success: true };
  }

  async deleteReconciliation(id: string) {
    return { success: true };
  }
}

export const treasuryService = new TreasuryService();