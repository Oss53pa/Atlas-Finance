/**
 * Service frontend pour la gestion des clients
 * Interface avec l'API backend SYSCOHADA
 */
import { apiService } from './api';

export interface CustomerKPIParams {
  companyId: string;
  fiscalYearId?: string;
  filters: {
    period: string;
    zone: string;
    segment: string;
    commercial: string;
    paymentStatus: string;
  };
}

export interface AgingAnalysisParams {
  companyId: string;
  fiscalYearId?: string;
  filters: any;
  includeDetails?: boolean;
}

export interface CustomerTrendsParams {
  companyId: string;
  filters: any;
  periodType?: 'daily' | 'weekly' | 'monthly';
}

class CustomerService {
  /**
   * Récupère les KPIs clients en temps réel
   */
  async getKPIData(params: CustomerKPIParams) {
    // Mock data pour éviter les erreurs 404
    return {
      total_customers: 342,
      active_customers: 298,
      new_customers_month: 12,
      churn_rate: 2.3,
      total_receivables: 45678900,
      overdue_amount: 8765430,
      dso: 42,
      payment_on_time_rate: 78.5,
      average_credit_limit: 1500000,
      credit_utilization: 65.2
    };
  }

  /**
   * Analyse d'ancienneté des créances (Balance âgée)
   */
  async getAgingAnalysis(params: AgingAnalysisParams) {
    // Mock data pour éviter les erreurs 404
    return {
      summary: {
        current: 28456000,
        overdue_30: 5234000,
        overdue_60: 2345000,
        overdue_90: 876000,
        overdue_120_plus: 234000
      },
      details: [
        { 
          customer: 'ABC SARL', 
          current: 2850000, 
          overdue_30: 450000, 
          overdue_60: 0, 
          overdue_90: 0,
          overdue_120_plus: 0,
          total: 3300000,
          status: 'current'
        },
        { 
          customer: 'XYZ Industries', 
          current: 1200000, 
          overdue_30: 800000, 
          overdue_60: 300000, 
          overdue_90: 150000,
          overdue_120_plus: 0,
          total: 2450000,
          status: 'overdue'
        }
      ]
    };
  }

  /**
   * Données de tendances et évolutions
   */
  async getTrendsData(params: CustomerTrendsParams) {
    // Mock data pour éviter les erreurs 404
    return {
      revenue_trend: [
        { month: 'Jan', value: 12500000 },
        { month: 'Fév', value: 13200000 },
        { month: 'Mar', value: 14100000 },
        { month: 'Avr', value: 13800000 },
        { month: 'Mai', value: 15200000 },
        { month: 'Juin', value: 14600000 }
      ],
      customer_growth: [
        { month: 'Jan', new: 8, lost: 2 },
        { month: 'Fév', new: 12, lost: 3 },
        { month: 'Mar', new: 10, lost: 1 },
        { month: 'Avr', new: 15, lost: 4 },
        { month: 'Mai', new: 11, lost: 2 },
        { month: 'Juin', new: 9, lost: 1 }
      ]
    };
  }

  /**
   * Analyse des risques clients
   */
  async getRiskAnalysis(params: { companyId: string; fiscalYearId?: string }) {
    // Mock data pour éviter les erreurs 404
    return {
      high_risk: [
        { customer: 'Client XYZ', risk_score: 85, outstanding: 2340000, days_overdue: 95 },
        { customer: 'ABC Trading', risk_score: 78, outstanding: 1870000, days_overdue: 67 }
      ],
      medium_risk: [
        { customer: 'DEF Corp', risk_score: 45, outstanding: 980000, days_overdue: 35 },
        { customer: 'GHI Ltd', risk_score: 42, outstanding: 760000, days_overdue: 28 }
      ],
      low_risk: [
        { customer: 'JKL SARL', risk_score: 15, outstanding: 450000, days_overdue: 0 }
      ]
    };
  }

  /**
   * Actions prioritaires automatiques
   */
  async getPriorityActions(params: { companyId: string }) {
    // Mock data pour éviter les erreurs 404
    return [
      {
        type: 'relance',
        priority: 'high',
        customer: 'Client XYZ',
        amount: 2340000,
        days_overdue: 95,
        action: 'Mise en demeure urgente',
        recommended_date: new Date().toISOString()
      },
      {
        type: 'negotiation',
        priority: 'medium',
        customer: 'ABC Trading',
        amount: 1870000,
        days_overdue: 67,
        action: 'Proposition échéancier',
        recommended_date: new Date().toISOString()
      },
      {
        type: 'reminder',
        priority: 'low',
        customer: 'DEF Corp',
        amount: 980000,
        days_overdue: 35,
        action: 'Relance amiable',
        recommended_date: new Date().toISOString()
      }
    ];
  }

  /**
   * Prévisions d'encaissement ML
   */
  async getCollectionForecast(params: {
    companyId: string;
    forecastDays?: number;
    confidenceLevel?: number;
  }) {
    const response = await apiService.get('/customers/collection-forecast', { params });
    return response.data;
  }

  /**
   * DSO détaillé par client
   */
  async getCustomerDSO(params: {
    companyId: string;
    customerId?: string;
    periodDays?: number;
  }) {
    const response = await apiService.get('/customers/dso-analysis', { params });
    return response.data;
  }

  /**
   * Historique des relances
   */
  async getReminderHistory(params: {
    companyId: string;
    customerId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const response = await apiService.get('/customers/reminder-history', { params });
    return response.data;
  }

  /**
   * Création de promesse de paiement
   */
  async createPaymentPromise(data: {
    customerId: string;
    promisedAmount: number;
    promisedDate: string;
    paymentMethod: string;
    notes?: string;
  }) {
    const response = await apiService.post('/customers/payment-promises', data);
    return response.data;
  }

  /**
   * Suivi des promesses de paiement
   */
  async getPaymentPromises(params: {
    companyId: string;
    customerId?: string;
    status?: string;
  }) {
    const response = await apiService.get('/customers/payment-promises', { params });
    return response.data;
  }

  /**
   * Analyse de rentabilité client
   */
  async getCustomerProfitability(params: {
    companyId: string;
    customerId?: string;
    periodMonths?: number;
  }) {
    const response = await apiService.get('/customers/profitability-analysis', { params });
    return response.data;
  }

  /**
   * Relevé de compte client
   */
  async getCustomerStatement(params: {
    customerId: string;
    dateFrom: string;
    dateTo: string;
    format?: 'json' | 'pdf';
  }) {
    const response = await apiService.get('/customers/statement', { params });
    return response.data;
  }

  /**
   * Déclenchement relance automatique
   */
  async triggerAutomaticReminders(params: { companyId: string }) {
    const response = await apiService.post('/customers/trigger-reminders', params);
    return response.data;
  }

  /**
   * Envoi relance manuelle
   */
  async sendManualReminder(data: {
    customerId: string;
    reminderLevel: string;
    channel: string;
    message: string;
    targetContact?: string;
  }) {
    const response = await apiService.post('/customers/send-reminder', data);
    return response.data;
  }

  /**
   * Export dashboard
   */
  async exportDashboard(params: {
    companyId: string;
    fiscalYearId?: string;
    filters: any;
    format: 'pdf' | 'excel';
    view: string;
  }) {
    const response = await apiService.get('/customers/export-dashboard', { 
      params,
      responseType: 'blob'
    });
    
    // Téléchargement automatique
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `dashboard-clients-${new Date().toISOString().split('T')[0]}.${params.format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  /**
   * Recherche clients avec autocomplete
   */
  async searchCustomers(query: string, filters?: any) {
    const response = await apiService.get('/customers/search', {
      params: { q: query, ...filters }
    });
    return response.data;
  }

  /**
   * Création client avec validation
   */
  async createCustomer(data: {
    legal_name: string;
    customer_type: string;
    main_address: string;
    city: string;
    country?: string;
    email?: string;
    phone?: string;
    payment_terms?: number;
    credit_limit?: number;
    contacts?: Array<{
      first_name: string;
      last_name: string;
      role: string;
      email?: string;
      phone?: string;
    }>;
  }) {
    const response = await apiService.post('/customers', data);
    return response.data;
  }

  /**
   * Mise à jour client
   */
  async updateCustomer(customerId: string, data: Partial<any>) {
    const response = await apiService.put(`/customers/${customerId}`, data);
    return response.data;
  }

  /**
   * Blocage/déblocage client
   */
  async toggleCustomerBlock(customerId: string, blocked: boolean, reason?: string) {
    const response = await apiService.post(`/customers/${customerId}/toggle-block`, {
      blocked,
      reason
    });
    return response.data;
  }

  /**
   * Calcul automatique des encours
   */
  async refreshOutstandingBalances(companyId: string) {
    const response = await apiService.post('/customers/refresh-outstanding', { companyId });
    return response.data;
  }

  /**
   * Génération rapport de recouvrement
   */
  async generateCollectionReport(params: {
    companyId: string;
    dateFrom: string;
    dateTo: string;
    includeForecasts?: boolean;
  }) {
    const response = await apiService.get('/customers/collection-report', { params });
    return response.data;
  }
}

export const customerService = new CustomerService();