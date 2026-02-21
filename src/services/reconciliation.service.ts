/**
 * Service de réconciliation et rapprochement
 * Fonctionnalités transverses selon section 4.0
 */
import { apiService } from './api';

export interface ReconciliationParams {
  companyId: string;
  fiscalYearId?: string;
  accountId?: string;
  filters: {
    accountType: string;
    dateRange: string;
    amountRange: string;
    reconciliationStatus: string;
  };
}

class ReconciliationService {
  /**
   * 4.1 Réconciliation et rapprochement
   * Données principales pour la réconciliation
   */
  async getReconciliationData(params: ReconciliationParams) {
    const response = await apiService.get('/reconciliation/data', { params });
    return response.data;
  }

  /**
   * Rapprochement automatique factures/paiements
   */
  async processAutomaticReconciliation(data: {
    companyId: string;
    fiscalYearId?: string;
    accountId?: string;
    algorithm: 'ALL' | 'EXACT_AMOUNT' | 'INVOICE_REFERENCE' | 'MULTIPLE_COMBINATION' | 'MACHINE_LEARNING';
  }) {
    const response = await apiService.post('/reconciliation/automatic', data);
    return response.data;
  }

  /**
   * Suggestions automatiques de lettrage
   */
  async getAutoSuggestions(params: {
    companyId: string;
    accountId?: string;
    maxSuggestions?: number;
  }) {
    const response = await apiService.get('/reconciliation/suggestions', { params });
    return response.data;
  }

  /**
   * Lettrage manuel avec gestion d'écarts
   */
  async manualReconcile(data: {
    lineIds: string[];
    reconciliationCode?: string;
    generateDifferenceEntry?: boolean;
    reason?: string;
  }) {
    const response = await apiService.post('/reconciliation/manual', data);
    return response.data;
  }

  /**
   * Délettrage en masse
   */
  async bulkUnreconcile(data: {
    reconciliationCodes: string[];
    reason: string;
  }) {
    const response = await apiService.post('/reconciliation/bulk-unreconcile', data);
    return response.data;
  }

  /**
   * Identification des écarts
   */
  async identifyDiscrepancies(params: {
    companyId: string;
    accountId?: string;
    toleranceAmount?: number;
  }) {
    const response = await apiService.get('/reconciliation/discrepancies', { params });
    return response.data;
  }

  /**
   * Justification des anomalies
   */
  async justifyAnomaly(data: {
    lineId: string;
    anomalyType: string;
    justification: string;
    correctionAction?: string;
  }) {
    const response = await apiService.post('/reconciliation/justify-anomaly', data);
    return response.data;
  }

  /**
   * Reporting de réconciliation
   */
  async getReconciliationReport(params: {
    companyId: string;
    fiscalYearId?: string;
    accountId?: string;
    reportType?: 'summary' | 'detailed' | 'performance';
  }) {
    const response = await apiService.get('/reconciliation/report', { params });
    return response.data;
  }

  /**
   * Statistiques de performance du lettrage
   */
  async getReconciliationStats(params: {
    companyId: string;
    fiscalYearId?: string;
  }) {
    const response = await apiService.get('/reconciliation/stats', { params });
    return response.data;
  }

  /**
   * 4.2 Prévisions de trésorerie
   * Consolidation créances/dettes
   */
  async getCashFlowForecast(params: {
    companyId: string;
    forecastDays?: number;
    includeScenarios?: boolean;
  }) {
    const response = await apiService.get('/treasury/cash-flow-forecast', { params });
    return response.data;
  }

  /**
   * Scénarios what-if pour trésorerie
   */
  async runWhatIfScenario(data: {
    companyId: string;
    scenarioType: 'optimistic' | 'realistic' | 'pessimistic';
    assumptions: {
      customerCollectionRate?: number;
      supplierPaymentDelay?: number;
      newSalesGrowth?: number;
    };
  }) {
    const response = await apiService.post('/treasury/what-if-scenario', data);
    return response.data;
  }

  /**
   * Alertes tensions de trésorerie
   */
  async getTreasuryAlerts(params: { companyId: string }) {
    const response = await apiService.get('/treasury/alerts', { params });
    return response.data;
  }

  /**
   * 4.3 Reporting et export
   * Rapports standards prédéfinis
   */
  async getStandardReports(params: { companyId: string }) {
    const response = await apiService.get('/reporting/standard-reports', { params });
    return response.data;
  }

  /**
   * Générateur de rapports personnalisés
   */
  async generateCustomReport(data: {
    companyId: string;
    reportConfig: {
      title: string;
      dataSource: string[];
      filters: Record<string, unknown>;
      groupBy: string[];
      aggregations: string[];
      chartType?: string;
    };
  }) {
    const response = await apiService.post('/reporting/custom-report', data);
    return response.data;
  }

  /**
   * Export multi-formats (PDF, Excel, API)
   */
  async exportData(params: {
    companyId: string;
    dataType: 'customers' | 'suppliers' | 'reconciliation' | 'treasury';
    format: 'pdf' | 'excel' | 'json' | 'csv';
    filters?: Record<string, unknown>;
  }) {
    const response = await apiService.get('/export/data', {
      params,
      responseType: 'blob'
    });

    // Téléchargement automatique
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `export-${params.dataType}-${Date.now()}.${params.format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  /**
   * Planification automatique des envois
   */
  async scheduleAutomaticReport(data: {
    companyId: string;
    reportConfig: {
      title: string;
      dataSource: string[];
      filters: Record<string, unknown>;
      groupBy: string[];
      aggregations: string[];
      chartType?: string;
    };
    schedule: {
      frequency: 'daily' | 'weekly' | 'monthly';
      dayOfWeek?: number;
      dayOfMonth?: number;
      time: string;
    };
    recipients: string[];
  }) {
    const response = await apiService.post('/reporting/schedule-report', data);
    return response.data;
  }

  /**
   * Consolidation données pour dashboard unifié
   */
  async getUnifiedDashboard(params: {
    companyId: string;
    fiscalYearId?: string;
    modules: string[];
  }) {
    const response = await apiService.get('/dashboard/unified', { params });
    return response.data;
  }

  /**
   * Métriques temps réel pour monitoring
   */
  async getRealtimeMetrics(params: {
    companyId: string;
    metrics: string[];
  }) {
    const response = await apiService.get('/metrics/realtime', { params });
    return response.data;
  }

  /**
   * Configuration des alertes automatiques
   */
  async configureAlerts(data: {
    companyId: string;
    alertRules: Array<{
      type: 'dso_exceeded' | 'credit_limit_exceeded' | 'overdue_amount' | 'reconciliation_pending';
      threshold: number;
      enabled: boolean;
      recipients: string[];
      channels: string[];
    }>;
  }) {
    const response = await apiService.post('/alerts/configure', data);
    return response.data;
  }

  /**
   * Test de performance du système de lettrage
   */
  async testReconciliationPerformance(params: {
    companyId: string;
    sampleSize?: number;
  }) {
    const response = await apiService.post('/reconciliation/performance-test', params);
    return response.data;
  }

  /**
   * Calibrage des algorithmes ML
   */
  async calibrateMLAlgorithms(data: {
    companyId: string;
    trainingData: {
      historicalReconciliations: Array<Record<string, unknown>>;
      feedbackData: Array<Record<string, unknown>>;
    };
  }) {
    const response = await apiService.post('/reconciliation/calibrate-ml', data);
    return response.data;
  }

  /**
   * Analyse de performance vs objectifs cahier des charges
   */
  async getBenchmarkAnalysis(params: { companyId: string }) {
    const response = await apiService.get('/analytics/benchmark', { params });
    return response.data;
  }
}

export const reconciliationService = new ReconciliationService();