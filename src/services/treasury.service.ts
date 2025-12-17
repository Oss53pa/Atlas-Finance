/**
 * Service Treasury - WiseBook ERP v4.1.0
 *
 * Service frontend pour la gestion de la trésorerie
 * ALIGNÉ sur les endpoints backend après correction P0
 *
 * Base URL: /api/v1/treasury/
 *
 * @version 2.0.0 - Aligné sur backend corrigé
 * @date 2025-10-19
 */

import { apiService } from './api';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface BankAccount {
  id: string;
  name: string;
  accountNumber: string;
  bank: string;
  type: string;
  currency: string;
  balance: number;
  status: 'active' | 'inactive' | 'closed';
}

export interface CashMovement {
  id: string;
  date: string;
  description: string;
  type: 'credit' | 'debit';
  amount: number;
  balance: number;
  account: string;
  status?: 'pending' | 'validated' | 'reconciled';
}

export interface FundCall {
  id: string;
  reference: string;
  amount: number;
  dueDate: string;
  status: 'draft' | 'approved' | 'executed' | 'cancelled';
  description?: string;
}

export interface TreasuryPosition {
  totalCash: number;
  availableCash: number;
  pendingInflows: number;
  pendingOutflows: number;
  projectedCash: number;
  accounts: BankAccount[];
  lastUpdate: string;
}

export interface TreasuryKPIs {
  totalCash: number;
  monthlyInflows: number;
  monthlyOutflows: number;
  netCashFlow: number;
  averageDailyBalance: number;
  cashBurnRate: number;
  daysOfCashRemaining: number;
}

export interface CashForecast {
  startDate: string;
  endDate: string;
  weeks: Array<{
    weekNumber: number;
    startDate: string;
    endDate: string;
    projectedInflows: number;
    projectedOutflows: number;
    netCashFlow: number;
    endingBalance: number;
  }>;
}

// ============================================================================
// TREASURY SERVICE
// ============================================================================

const BASE_PATH = '/api/v1/treasury';

class TreasuryService {

  // ==========================================================================
  // SECTION 1: DASHBOARD & KPIs
  // ==========================================================================

  /**
   * Récupère la position de trésorerie en temps réel
   * GET /api/v1/treasury/dashboard/position/
   */
  async getRealtimeTreasuryPosition(params?: { companyId?: string }): Promise<TreasuryPosition> {
    const response = await apiService.get(`${BASE_PATH}/dashboard/position/`, { params });
    return response.data;
  }

  /**
   * Récupère les KPIs principaux du dashboard
   * GET /api/v1/treasury/dashboard/kpis/
   */
  async getKPIs(params?: { companyId?: string }): Promise<TreasuryKPIs> {
    const response = await apiService.get(`${BASE_PATH}/dashboard/kpis/`, { params });
    return response.data;
  }

  /**
   * Analyse des tendances sur 12 mois
   * GET /api/v1/treasury/dashboard/trends/
   */
  async getTrends(params?: { companyId?: string; months?: number }) {
    const response = await apiService.get(`${BASE_PATH}/dashboard/trends/`, { params });
    return response.data;
  }

  /**
   * Récupère les alertes trésorerie actives
   * GET /api/v1/treasury/dashboard/alertes/
   */
  async getAlerts(params?: { companyId?: string }) {
    const response = await apiService.get(`${BASE_PATH}/dashboard/alertes/`, { params });
    return response.data;
  }

  /**
   * Stats dashboard (méthode legacy - gardée pour compatibilité)
   */
  async getDashboardStats(params?: { companyId?: string }): Promise<TreasuryKPIs> {
    return this.getKPIs(params);
  }

  // ==========================================================================
  // SECTION 2: BANK ACCOUNTS (CRUD)
  // ==========================================================================

  /**
   * Liste tous les comptes bancaires
   * GET /api/v1/treasury/accounts/
   */
  async getBankAccounts(params?: any): Promise<{ results: BankAccount[]; count: number }> {
    const response = await apiService.get(`${BASE_PATH}/accounts/`, { params });
    return response.data;
  }

  /**
   * Récupère un compte bancaire par ID
   * GET /api/v1/treasury/accounts/{id}/
   */
  async getBankAccount(id: string): Promise<BankAccount> {
    const response = await apiService.get(`${BASE_PATH}/accounts/${id}/`);
    return response.data;
  }

  /**
   * Crée un nouveau compte bancaire
   * POST /api/v1/treasury/accounts/
   */
  async createBankAccount(data: Partial<BankAccount>): Promise<BankAccount> {
    const response = await apiService.post(`${BASE_PATH}/accounts/`, data);
    return response.data;
  }

  /**
   * Met à jour un compte bancaire
   * PUT/PATCH /api/v1/treasury/accounts/{id}/
   */
  async updateBankAccount(id: string, data: Partial<BankAccount>): Promise<BankAccount> {
    const response = await apiService.patch(`${BASE_PATH}/accounts/${id}/`, data);
    return response.data;
  }

  /**
   * Supprime un compte bancaire
   * DELETE /api/v1/treasury/accounts/{id}/
   */
  async deleteBankAccount(id: string): Promise<{ success: boolean }> {
    const response = await apiService.delete(`${BASE_PATH}/accounts/${id}/`);
    return response.data;
  }

  /**
   * Consolidation multi-comptes
   * GET /api/v1/treasury/accounts/consolidation/
   */
  async getAccountConsolidation(params?: { companyId?: string }) {
    const response = await apiService.get(`${BASE_PATH}/accounts/consolidation/`, { params });
    return response.data;
  }

  /**
   * Validation IBAN/SWIFT automatique
   * POST /api/v1/treasury/accounts/{id}/valider-iban/
   */
  async validateIBAN(accountId: string, data: { iban: string; swift?: string }) {
    const response = await apiService.post(`${BASE_PATH}/accounts/${accountId}/valider-iban/`, data);
    return response.data;
  }

  // ==========================================================================
  // SECTION 3: CASH MOVEMENTS (CRUD)
  // ==========================================================================

  /**
   * Liste tous les mouvements de trésorerie
   * GET /api/v1/treasury/movements/
   */
  async getBankMovements(params?: any): Promise<{ results: CashMovement[]; count: number }> {
    const response = await apiService.get(`${BASE_PATH}/movements/`, { params });
    return response.data;
  }

  /**
   * Récupère un mouvement par ID
   * GET /api/v1/treasury/movements/{id}/
   */
  async getMovement(id: string): Promise<CashMovement> {
    const response = await apiService.get(`${BASE_PATH}/movements/${id}/`);
    return response.data;
  }

  /**
   * Crée un nouveau mouvement
   * POST /api/v1/treasury/movements/
   */
  async createMovement(data: Partial<CashMovement>): Promise<CashMovement> {
    const response = await apiService.post(`${BASE_PATH}/movements/`, data);
    return response.data;
  }

  /**
   * Met à jour un mouvement
   * PUT/PATCH /api/v1/treasury/movements/{id}/
   */
  async updateMovement(id: string, data: Partial<CashMovement>): Promise<CashMovement> {
    const response = await apiService.patch(`${BASE_PATH}/movements/${id}/`, data);
    return response.data;
  }

  /**
   * Supprime un mouvement
   * DELETE /api/v1/treasury/movements/{id}/
   */
  async deleteMovement(id: string): Promise<{ success: boolean }> {
    const response = await apiService.delete(`${BASE_PATH}/movements/${id}/`);
    return response.data;
  }

  /**
   * Dernières transactions
   * GET /api/v1/treasury/movements/dernieres/
   */
  async getLatestTransactions(params?: { companyId?: string; limit?: number }) {
    const response = await apiService.get(`${BASE_PATH}/movements/dernieres/`, { params });
    return response.data;
  }

  /**
   * Validation en lot
   * POST /api/v1/treasury/movements/validation-lot/
   */
  async bulkValidateMovements(data: { movementIds: string[] }) {
    const response = await apiService.post(`${BASE_PATH}/movements/validation-lot/`, data);
    return response.data;
  }

  /**
   * Export vers comptabilité générale
   * POST /api/v1/treasury/movements/export-comptable/
   */
  async exportToAccounting(data: { movementIds: string[]; journalId?: string }) {
    const response = await apiService.post(`${BASE_PATH}/movements/export-comptable/`, data);
    return response.data;
  }

  // ==========================================================================
  // SECTION 4: CASH FORECASTING
  // ==========================================================================

  /**
   * Prévisions 13 semaines
   * GET /api/v1/treasury/forecasting/13-semaines/
   */
  async get13WeeksForecast(params?: { companyId?: string }): Promise<CashForecast> {
    const response = await apiService.get(`${BASE_PATH}/forecasting/13-semaines/`, { params });
    return response.data;
  }

  /**
   * Méthode legacy - alias pour get13WeeksForecast
   */
  async getCashFlowForecast(params?: { companyId?: string; forecastDays?: number }) {
    return this.get13WeeksForecast(params);
  }

  /**
   * Simulation de scénarios personnalisés
   * POST /api/v1/treasury/forecasting/simulation/
   */
  async simulateScenarios(data: { companyId: string; scenarios: any[] }) {
    const response = await apiService.post(`${BASE_PATH}/forecasting/simulation/`, data);
    return response.data;
  }

  /**
   * Prévisions encaissements
   * GET /api/v1/treasury/forecasting/encaissements/
   */
  async getForecastedInflows(params: { companyId: string; startDate: string; endDate: string }) {
    const response = await apiService.get(`${BASE_PATH}/forecasting/encaissements/`, { params });
    return response.data;
  }

  /**
   * Prévisions décaissements
   * GET /api/v1/treasury/forecasting/decaissements/
   */
  async getForecastedOutflows(params: { companyId: string; startDate: string; endDate: string }) {
    const response = await apiService.get(`${BASE_PATH}/forecasting/decaissements/`, { params });
    return response.data;
  }

  /**
   * Méthode legacy - getCashFlow
   */
  async getCashFlow(period?: string) {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    const [inflows, outflows] = await Promise.all([
      this.getForecastedInflows({ companyId: '', startDate, endDate }),
      this.getForecastedOutflows({ companyId: '', startDate, endDate })
    ]);

    return {
      inflows,
      outflows,
      netCashFlow: (inflows?.total || 0) - (outflows?.total || 0),
      cashPosition: 0 // À calculer avec la position réelle
    };
  }

  // ==========================================================================
  // SECTION 5: FUND CALLS (CRUD + Actions)
  // ==========================================================================

  /**
   * Liste tous les appels de fonds
   * GET /api/v1/treasury/fund-calls/
   */
  async getFundCalls(params?: any): Promise<{ results: FundCall[]; count: number }> {
    const response = await apiService.get(`${BASE_PATH}/fund-calls/`, { params });
    return response.data;
  }

  /**
   * Récupère un appel de fonds par ID
   * GET /api/v1/treasury/fund-calls/{id}/
   */
  async getFundCall(id: string): Promise<FundCall> {
    const response = await apiService.get(`${BASE_PATH}/fund-calls/${id}/`);
    return response.data;
  }

  /**
   * Crée un nouvel appel de fonds
   * POST /api/v1/treasury/fund-calls/
   */
  async createFundCall(data: Partial<FundCall>): Promise<FundCall> {
    const response = await apiService.post(`${BASE_PATH}/fund-calls/`, data);
    return response.data;
  }

  /**
   * Met à jour un appel de fonds
   * PUT/PATCH /api/v1/treasury/fund-calls/{id}/
   */
  async updateFundCall(id: string, data: Partial<FundCall>): Promise<FundCall> {
    const response = await apiService.patch(`${BASE_PATH}/fund-calls/${id}/`, data);
    return response.data;
  }

  /**
   * Supprime un appel de fonds
   * DELETE /api/v1/treasury/fund-calls/{id}/
   */
  async deleteFundCall(id: string): Promise<{ success: boolean }> {
    const response = await apiService.delete(`${BASE_PATH}/fund-calls/${id}/`);
    return response.data;
  }

  /**
   * Dashboard appels de fonds (méthode legacy)
   */
  async getFundCallsDashboard(params?: { companyId?: string }) {
    return this.getFundCalls(params);
  }

  /**
   * Analyse automatique des besoins de financement
   * POST /api/v1/treasury/fund-calls/analyser-besoins/
   */
  async analyzeFundingNeeds(data: { companyId: string; period: string }) {
    const response = await apiService.post(`${BASE_PATH}/fund-calls/analyser-besoins/`, data);
    return response.data;
  }

  /**
   * Création automatique d'appel de fonds
   * POST /api/v1/treasury/fund-calls/creer-automatique/
   */
  async createAutoFundCall(data: { companyId: string; amount: number; dueDate: string }) {
    const response = await apiService.post(`${BASE_PATH}/fund-calls/creer-automatique/`, data);
    return response.data;
  }

  /**
   * Exécuter un appel de fonds (méthode legacy)
   */
  async executeFundCall(data: { fundCallId: string; companyId: string }) {
    return this.updateFundCall(data.fundCallId, { status: 'executed' });
  }

  /**
   * Aging analysis d'un appel de fonds
   * GET /api/v1/treasury/fund-calls/{id}/aging/
   */
  async getFundCallAging(fundCallId: string) {
    const response = await apiService.get(`${BASE_PATH}/fund-calls/${fundCallId}/aging/`);
    return response.data;
  }

  // ==========================================================================
  // SECTION 6: BANK RECONCILIATION
  // ==========================================================================

  /**
   * Rapprochement automatique avec IA
   * POST /api/v1/treasury/reconciliation/automatique/
   */
  async autoReconcile(data: { accountId: string; statementData: any }) {
    const response = await apiService.post(`${BASE_PATH}/reconciliation/automatique/`, data);
    return response.data;
  }

  /**
   * Import relevé bancaire (MT940, CSV, Excel)
   * POST /api/v1/treasury/reconciliation/import-releve/
   */
  async importBankStatement(formData: FormData) {
    const response = await apiService.post(`${BASE_PATH}/reconciliation/import-releve/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  /**
   * Liste des rapprochements (méthode legacy)
   */
  async getReconciliations(filters?: any) {
    // Cette méthode pourrait appeler un endpoint spécifique si disponible
    // Pour l'instant, on retourne les mouvements avec filtre
    return this.getBankMovements({ ...filters, status: 'reconciled' });
  }

  /**
   * Supprimer un rapprochement (méthode legacy)
   */
  async deleteReconciliation(id: string): Promise<{ success: boolean }> {
    // Logique à adapter selon le backend
    return { success: true };
  }

  // ==========================================================================
  // SECTION 7: ADVANCED FEATURES
  // ==========================================================================

  /**
   * Liste des banques disponibles
   * GET /api/v1/treasury/banks/
   */
  async getBanks() {
    const response = await apiService.get(`${BASE_PATH}/banks/`);
    return response.data;
  }

  /**
   * Statut des connexions bancaires actives
   * GET /api/v1/treasury/connections/status/
   */
  async getBankConnections(params?: { companyId?: string }) {
    const response = await apiService.get(`${BASE_PATH}/connections/status/`, { params });
    return response.data;
  }

  /**
   * Métriques de performance (méthode legacy)
   */
  async getPerformanceMetrics(params?: { companyId?: string }) {
    return this.getKPIs(params);
  }

  // ==========================================================================
  // SECTION 8: MACHINE LEARNING & ANALYTICS
  // ==========================================================================

  /**
   * Prédictions ML de trésorerie
   * POST /api/v1/treasury/ml/predict-cash-flow/
   */
  async predictCashFlow(data: { companyId: string; horizon: number }) {
    const response = await apiService.post(`${BASE_PATH}/ml/predict-cash-flow/`, data);
    return response.data;
  }

  /**
   * Analytics de performance
   * GET /api/v1/treasury/analytics/performance/
   */
  async getPerformanceAnalytics(params: { companyId: string; period: string }) {
    const response = await apiService.get(`${BASE_PATH}/analytics/performance/`, { params });
    return response.data;
  }

  /**
   * Optimisation de la gestion de trésorerie
   * POST /api/v1/treasury/optimize/cash-management/
   */
  async optimizeCashManagement(data: { companyId: string; constraints: any }) {
    const response = await apiService.post(`${BASE_PATH}/optimize/cash-management/`, data);
    return response.data;
  }

  // ==========================================================================
  // SECTION 9: AUDIT & SECURITY
  // ==========================================================================

  /**
   * Audit trail des opérations sensibles
   * GET /api/v1/treasury/audit/operations/
   */
  async getAuditTrail(params?: { companyId?: string; startDate?: string; endDate?: string }) {
    const response = await apiService.get(`${BASE_PATH}/audit/operations/`, { params });
    return response.data;
  }

  /**
   * Contrôles sécuritaires
   * GET /api/v1/treasury/security/controls/
   */
  async getSecurityControls(params?: { companyId?: string }) {
    const response = await apiService.get(`${BASE_PATH}/security/controls/`, { params });
    return response.data;
  }

  // ==========================================================================
  // SECTION 10: INTEGRATIONS & REPORTING
  // ==========================================================================

  /**
   * Export vers ERP (SAP, Oracle, Sage)
   * POST /api/v1/treasury/export/erp/
   */
  async exportToERP(data: { companyId: string; erpType: string; dataToExport: any }) {
    const response = await apiService.post(`${BASE_PATH}/export/erp/`, data);
    return response.data;
  }

  /**
   * Import depuis systèmes bancaires
   * POST /api/v1/treasury/import/banking-api/
   */
  async importFromBankingAPI(data: { companyId: string; bankId: string; params: any }) {
    const response = await apiService.post(`${BASE_PATH}/import/banking-api/`, data);
    return response.data;
  }

  /**
   * Génération de rapports PDF/Excel
   * POST /api/v1/treasury/reports/generate/
   */
  async generateReport(data: { companyId: string; reportType: string; format: 'pdf' | 'excel' }) {
    const response = await apiService.post(`${BASE_PATH}/reports/generate/`, data, {
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Planning de trésorerie
   * GET /api/v1/treasury/reports/planning/
   */
  async getCashPlan(params: { companyId: string; startDate: string; endDate: string }) {
    const response = await apiService.get(`${BASE_PATH}/reports/planning/`, { params });
    return response.data;
  }

  // ==========================================================================
  // SECTION 11: PAYMENTS (Méthodes legacy - à adapter selon backend réel)
  // ==========================================================================

  /**
   * Créer un paiement (méthode legacy)
   * Note: Cette fonctionnalité pourrait être dans un module séparé
   */
  async createPayment(data: any) {
    // À adapter selon l'implémentation backend réelle
    return this.createMovement({
      ...data,
      type: 'debit',
      description: data.description || 'Payment'
    });
  }

  /**
   * Exécuter un paiement (méthode legacy)
   */
  async executePayment(data: { paymentId: string; companyId: string }) {
    // À adapter selon l'implémentation backend réelle
    return this.updateMovement(data.paymentId, { status: 'validated' });
  }
}

// Instance singleton
export const treasuryService = new TreasuryService();
export default treasuryService;
