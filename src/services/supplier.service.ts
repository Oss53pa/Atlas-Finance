/**
 * Service frontend pour la gestion des fournisseurs
 * Interface avec l'API backend SYSCOHADA
 */
import { apiService } from './api';

export interface SupplierKPIParams {
  companyId: string;
  fiscalYearId?: string;
  filters: {
    period: string;
    supplierType: string;
    paymentStatus: string;
    performanceLevel: string;
  };
}

export interface PaymentOptimizationParams {
  companyId: string;
  filters: any;
  forecastDays?: number;
  maxAmount?: number;
}

class SupplierService {
  /**
   * Récupère les KPIs fournisseurs en temps réel
   */
  async getKPIData(params: SupplierKPIParams) {
    const response = await apiService.get('/suppliers/kpis', { params });
    return response.data;
  }

  /**
   * Optimisation des paiements avec propositions intelligentes
   */
  async getPaymentOptimization(params: PaymentOptimizationParams) {
    const response = await apiService.get('/suppliers/payment-optimization', { params });
    return response.data;
  }

  /**
   * Analytics fournisseurs avancées
   */
  async getSupplierAnalytics(params: { companyId: string; filters: any }) {
    const response = await apiService.get('/suppliers/analytics', { params });
    return response.data;
  }

  /**
   * Données de performance fournisseurs
   */
  async getPerformanceData(params: { companyId: string; fiscalYearId?: string }) {
    const response = await apiService.get('/suppliers/performance', { params });
    return response.data;
  }

  /**
   * Échéancier global optimisé
   */
  async getPaymentSchedule(params: {
    companyId: string;
    forecastDays?: number;
    includeOptimizations?: boolean;
  }) {
    const response = await apiService.get('/suppliers/payment-schedule', { params });
    return response.data;
  }

  /**
   * Opportunités d'escompte
   */
  async getDiscountOpportunities(params: { companyId: string }) {
    const response = await apiService.get('/suppliers/discount-opportunities', { params });
    return response.data;
  }

  /**
   * Propositions de paiement automatiques
   */
  async getSmartPaymentProposals(params: {
    companyId: string;
    paymentDate?: string;
    maxAmount?: number;
    prioritizeDiscounts?: boolean;
  }) {
    const response = await apiService.get('/suppliers/smart-payment-proposals', { params });
    return response.data;
  }

  /**
   * Exécution d'une proposition de paiement
   */
  async executePaymentProposal(data: {
    proposalId: string;
    companyId: string;
    approvalNotes?: string;
  }) {
    const response = await apiService.post('/suppliers/execute-payment', data);
    return response.data;
  }

  /**
   * Génération virement masse
   */
  async generateBulkPayment(data: {
    companyId: string;
    paymentDate: string;
    supplierPayments: Array<{
      supplierId: string;
      invoiceIds: string[];
      totalAmount: number;
      discountAmount?: number;
    }>;
  }) {
    const response = await apiService.post('/suppliers/bulk-payment', data);
    return response.data;
  }

  /**
   * Interface avec Wise Procure
   */
  async syncWithWiseProcure(params: { companyId: string }) {
    const response = await apiService.post('/suppliers/sync-wise-procure', params);
    return response.data;
  }

  /**
   * Traitement facture depuis Wise Procure
   */
  async processWiseProcureInvoice(data: {
    companyId: string;
    wiseProcureData: {
      supplier_code: string;
      invoice_number: string;
      invoice_date: string;
      due_date: string;
      amount_ht: number;
      vat_amount: number;
      amount_ttc: number;
      purchase_order_ref?: string;
      delivery_receipt_ref?: string;
      ocr_data?: any;
    };
  }) {
    const response = await apiService.post('/suppliers/process-invoice', data);
    return response.data;
  }

  /**
   * Validation workflow facture
   */
  async validateInvoice(invoiceId: string, validation: {
    validationType: 'technical' | 'accounting';
    approved: boolean;
    comments?: string;
  }) {
    const response = await apiService.post(`/suppliers/invoices/${invoiceId}/validate`, validation);
    return response.data;
  }

  /**
   * Évaluation performance fournisseur
   */
  async createSupplierEvaluation(data: {
    supplierId: string;
    evaluationType: string;
    periodStart: string;
    periodEnd: string;
    qualityScore: number;
    deliveryScore: number;
    serviceScore: number;
    priceScore: number;
    complianceScore: number;
    strengths?: string;
    weaknesses?: string;
    actionPlan?: string;
    recommendation: string;
  }) {
    const response = await apiService.post('/suppliers/evaluations', data);
    return response.data;
  }

  /**
   * Historique des évaluations
   */
  async getEvaluationHistory(supplierId: string) {
    const response = await apiService.get(`/suppliers/${supplierId}/evaluations`);
    return response.data;
  }

  /**
   * Calcul ROI fournisseur
   */
  async getSupplierROI(params: {
    supplierId: string;
    periodMonths?: number;
  }) {
    const response = await apiService.get('/suppliers/roi-analysis', { params });
    return response.data;
  }

  /**
   * Analyse de concentration fournisseurs
   */
  async getConcentrationAnalysis(params: { companyId: string }) {
    const response = await apiService.get('/suppliers/concentration-analysis', { params });
    return response.data;
  }

  /**
   * Alertes contrats et échéances
   */
  async getContractAlerts(params: { companyId: string }) {
    const response = await apiService.get('/suppliers/contract-alerts', { params });
    return response.data;
  }

  /**
   * Recherche fournisseurs avec autocomplete
   */
  async searchSuppliers(query: string, filters?: any) {
    const response = await apiService.get('/suppliers/search', {
      params: { q: query, ...filters }
    });
    return response.data;
  }

  /**
   * Création fournisseur avec validation
   */
  async createSupplier(data: {
    legal_name: string;
    supplier_type: string;
    main_address: string;
    city: string;
    country?: string;
    email?: string;
    phone?: string;
    payment_terms?: number;
    iban?: string;
    bic?: string;
    contacts?: Array<{
      first_name: string;
      last_name: string;
      role: string;
      email?: string;
      phone?: string;
    }>;
  }) {
    const response = await apiService.post('/suppliers', data);
    return response.data;
  }

  /**
   * Mise à jour fournisseur
   */
  async updateSupplier(supplierId: string, data: Partial<any>) {
    const response = await apiService.put(`/suppliers/${supplierId}`, data);
    return response.data;
  }

  /**
   * Blocage/déblocage fournisseur
   */
  async toggleSupplierBlock(supplierId: string, blocked: boolean, reason?: string) {
    const response = await apiService.post(`/suppliers/${supplierId}/toggle-block`, {
      blocked,
      reason
    });
    return response.data;
  }

  /**
   * Calcul automatique des encours
   */
  async refreshOutstandingBalances(companyId: string) {
    const response = await apiService.post('/suppliers/refresh-outstanding', { companyId });
    return response.data;
  }

  /**
   * Génération rapport de performance
   */
  async generatePerformanceReport(params: {
    companyId: string;
    dateFrom: string;
    dateTo: string;
    includeEvaluations?: boolean;
  }) {
    const response = await apiService.get('/suppliers/performance-report', { params });
    return response.data;
  }

  /**
   * Simulation impact paiements
   */
  async simulatePaymentImpact(data: {
    companyId: string;
    paymentScenarios: Array<{
      supplierId: string;
      amount: number;
      paymentDate: string;
      applyDiscount: boolean;
    }>;
  }) {
    const response = await apiService.post('/suppliers/simulate-payment-impact', data);
    return response.data;
  }

  /**
   * Export dashboard fournisseurs
   */
  async exportDashboard(params: {
    companyId: string;
    fiscalYearId?: string;
    filters: any;
    format: 'pdf' | 'excel';
    view: string;
  }) {
    const response = await apiService.get('/suppliers/export-dashboard', { 
      params,
      responseType: 'blob'
    });
    
    // Téléchargement automatique
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `dashboard-fournisseurs-${new Date().toISOString().split('T')[0]}.${params.format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  /**
   * Métriques temps réel pour monitoring
   */
  async getRealtimeMetrics(companyId: string) {
    const response = await apiService.get('/suppliers/realtime-metrics', {
      params: { companyId }
    });
    return response.data;
  }

  /**
   * Configuration des alertes automatiques
   */
  async configureAlerts(data: {
    companyId: string;
    alertRules: Array<{
      type: string;
      threshold: number;
      enabled: boolean;
      recipients: string[];
    }>;
  }) {
    const response = await apiService.post('/suppliers/configure-alerts', data);
    return response.data;
  }
}

export const supplierService = new SupplierService();