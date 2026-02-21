/**
 * Service Budget Atlas Finance
 * Gestion budgétaire intelligente avec IA, dashboards et alertes automatiques
 *
 * Fonctionnalités:
 * - Planification budgétaire avec prévisions IA (ARIMA, LSTM, Prophet)
 * - Saisie matricielle multi-dimensionnelle
 * - Dashboards interactifs temps réel
 * - Système d'alertes automatiques
 * - Import/Export Excel intelligent
 * - Reporting automatisé
 *
 * Architecture: Standard apiService + BASE_PATH
 * Backend: apps/budgeting/urls.py (6 ViewSets, 45+ endpoints)
 *
 * @module services/budget
 * @version 4.1.0
 * @date 2025-10-19
 */

import { apiService } from './api';

const BASE_PATH = '/api/v1/budgeting';

// ============================================================================
// INTERFACES TYPESCRIPT
// ============================================================================

/**
 * Plan budgétaire principal
 */
export interface BudgetPlan {
  id: string;
  code: string;
  name: string;
  description?: string;
  fiscal_year: string;
  fiscal_year_label?: string;
  department?: string;
  department_label?: string;
  total_budget: number;
  total_consumed: number;
  total_remaining: number;
  consumption_rate: number;
  status: 'draft' | 'active' | 'closed' | 'archived';
  start_date: string;
  end_date: string;
  created_by?: string;
  created_by_name?: string;
  validated_by?: string;
  validated_at?: string;
  is_locked: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

/**
 * Ligne budgétaire détaillée
 */
export interface BudgetLine {
  id: string;
  budget_plan: string;
  budget_plan_name?: string;
  account: string;
  account_number?: string;
  account_label?: string;
  department?: string;
  department_label?: string;
  category: string;
  subcategory?: string;
  january: number;
  february: number;
  march: number;
  april: number;
  may: number;
  june: number;
  july: number;
  august: number;
  september: number;
  october: number;
  november: number;
  december: number;
  total_budget: number;
  total_consumed: number;
  total_remaining: number;
  consumption_rate: number;
  variance: number;
  variance_percent: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Alerte budgétaire
 */
export interface BudgetAlert {
  id: string;
  budget_plan?: string;
  budget_line?: string;
  alert_type: 'threshold' | 'overrun' | 'variance' | 'expiry' | 'custom';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  threshold_percent?: number;
  current_value?: number;
  threshold_value?: number;
  is_active: boolean;
  is_acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  triggered_at?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Dashboard budgétaire - Statistiques principales
 */
export interface BudgetDashboardStats {
  total_budget: number;
  total_consumed: number;
  total_remaining: number;
  consumption_rate: number;
  active_budgets: number;
  exceeded_budgets: number;
  pending_alerts: number;
  critical_alerts: number;
  monthly_consumption: Array<{
    month: string;
    budget: number;
    consumed: number;
    remaining: number;
  }>;
  top_consumers: Array<{
    department: string;
    consumed: number;
    budget: number;
    rate: number;
  }>;
  category_breakdown: Array<{
    category: string;
    budget: number;
    consumed: number;
    rate: number;
  }>;
}

/**
 * Comparaison Year-to-Date
 */
export interface BudgetYTDComparison {
  current_year: {
    total_budget: number;
    total_consumed: number;
    consumption_rate: number;
  };
  previous_year: {
    total_budget: number;
    total_consumed: number;
    consumption_rate: number;
  };
  variance: {
    budget_variance: number;
    consumed_variance: number;
    rate_variance: number;
  };
  monthly_comparison: Array<{
    month: string;
    current_year_consumed: number;
    previous_year_consumed: number;
    variance: number;
  }>;
}

/**
 * Analyse de variance
 */
export interface BudgetVarianceAnalysis {
  total_variance: number;
  total_variance_percent: number;
  favorable_variance: number;
  unfavorable_variance: number;
  variances_by_category: Array<{
    category: string;
    budgeted: number;
    actual: number;
    variance: number;
    variance_percent: number;
    is_favorable: boolean;
  }>;
  variances_by_department: Array<{
    department: string;
    budgeted: number;
    actual: number;
    variance: number;
    variance_percent: number;
  }>;
  top_variances: Array<{
    account: string;
    account_label: string;
    budgeted: number;
    actual: number;
    variance: number;
    variance_percent: number;
  }>;
}

/**
 * Prévisions IA
 */
export interface BudgetAIForecast {
  model_used: 'arima' | 'lstm' | 'prophet' | 'ensemble';
  forecast_period: string;
  confidence_level: number;
  predictions: Array<{
    month: string;
    predicted_value: number;
    lower_bound: number;
    upper_bound: number;
    confidence: number;
  }>;
  trends: {
    overall_trend: 'increasing' | 'decreasing' | 'stable';
    seasonality_detected: boolean;
    anomalies: Array<{
      month: string;
      value: number;
      reason: string;
    }>;
  };
  recommendations: string[];
}

/**
 * Template budget
 */
export interface BudgetTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  file_url?: string;
  preview_url?: string;
  is_default: boolean;
}

/**
 * Rapport budgétaire
 */
export interface BudgetReport {
  id: string;
  report_type: 'monthly' | 'quarterly' | 'annual' | 'custom';
  period: string;
  generated_at: string;
  generated_by: string;
  file_url: string;
  format: 'pdf' | 'excel' | 'csv';
  status: 'pending' | 'completed' | 'failed';
}

/**
 * Département budgétaire
 */
export interface BudgetDepartment {
  id: string;
  code: string;
  name: string;
  description?: string;
  parent_department?: string;
  is_active: boolean;
}

/**
 * Compte budgétaire
 */
export interface BudgetAccount {
  id: string;
  account_number: string;
  account_label: string;
  account_type: string;
  is_budgetable: boolean;
}

/**
 * Grille de saisie matricielle
 */
export interface BudgetMatrixGrid {
  accounts: Array<{
    id: string;
    number: string;
    label: string;
  }>;
  months: string[];
  data: {
    [accountId: string]: {
      [month: string]: number;
    };
  };
}

/**
 * Saisie matricielle (payload)
 */
export interface BudgetMatrixEntry {
  budget_plan: string;
  department?: string;
  entries: Array<{
    account: string;
    january?: number;
    february?: number;
    march?: number;
    april?: number;
    may?: number;
    june?: number;
    july?: number;
    august?: number;
    september?: number;
    october?: number;
    november?: number;
    december?: number;
  }>;
}

/**
 * Paramètres de requête pagination
 */
export interface BudgetQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
}

/**
 * Paramètres de requête plans budgétaires
 */
export interface BudgetPlanQueryParams extends BudgetQueryParams {
  fiscal_year?: string;
  department?: string;
  status?: string;
  is_locked?: boolean;
}

/**
 * Paramètres de requête lignes budgétaires
 */
export interface BudgetLineQueryParams extends BudgetQueryParams {
  budget_plan?: string;
  account?: string;
  department?: string;
  category?: string;
}

/**
 * Paramètres de requête alertes
 */
export interface BudgetAlertQueryParams extends BudgetQueryParams {
  budget_plan?: string;
  alert_type?: string;
  severity?: string;
  is_active?: boolean;
  is_acknowledged?: boolean;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class BudgetService {

  // ==========================================================================
  // SECTION 1: CRUD PLANS BUDGÉTAIRES
  // ==========================================================================

  /**
   * Récupère la liste des plans budgétaires
   */
  async getBudgetPlans(params?: BudgetPlanQueryParams): Promise<{
    results: BudgetPlan[];
    count: number;
    next?: string;
    previous?: string;
  }> {
    const response = await apiService.get(`${BASE_PATH}/plans/`, { params });
    return response.data;
  }

  /**
   * Récupère un plan budgétaire par ID
   */
  async getBudgetPlan(id: string): Promise<BudgetPlan> {
    const response = await apiService.get(`${BASE_PATH}/plans/${id}/`);
    return response.data;
  }

  /**
   * Crée un nouveau plan budgétaire
   */
  async createBudgetPlan(data: Partial<BudgetPlan>): Promise<BudgetPlan> {
    const response = await apiService.post(`${BASE_PATH}/plans/`, data);
    return response.data;
  }

  /**
   * Met à jour un plan budgétaire
   */
  async updateBudgetPlan(id: string, data: Partial<BudgetPlan>): Promise<BudgetPlan> {
    const response = await apiService.put(`${BASE_PATH}/plans/${id}/`, data);
    return response.data;
  }

  /**
   * Met à jour partiellement un plan budgétaire
   */
  async patchBudgetPlan(id: string, data: Partial<BudgetPlan>): Promise<BudgetPlan> {
    const response = await apiService.patch(`${BASE_PATH}/plans/${id}/`, data);
    return response.data;
  }

  /**
   * Supprime un plan budgétaire
   */
  async deleteBudgetPlan(id: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/plans/${id}/`);
  }

  // ==========================================================================
  // SECTION 2: CRUD LIGNES BUDGÉTAIRES
  // ==========================================================================

  /**
   * Récupère la liste des lignes budgétaires
   */
  async getBudgetLines(params?: BudgetLineQueryParams): Promise<{
    results: BudgetLine[];
    count: number;
    next?: string;
    previous?: string;
  }> {
    const response = await apiService.get(`${BASE_PATH}/lines/`, { params });
    return response.data;
  }

  /**
   * Récupère une ligne budgétaire par ID
   */
  async getBudgetLine(id: string): Promise<BudgetLine> {
    const response = await apiService.get(`${BASE_PATH}/lines/${id}/`);
    return response.data;
  }

  /**
   * Crée une nouvelle ligne budgétaire
   */
  async createBudgetLine(data: Partial<BudgetLine>): Promise<BudgetLine> {
    const response = await apiService.post(`${BASE_PATH}/lines/`, data);
    return response.data;
  }

  /**
   * Met à jour une ligne budgétaire
   */
  async updateBudgetLine(id: string, data: Partial<BudgetLine>): Promise<BudgetLine> {
    const response = await apiService.patch(`${BASE_PATH}/lines/${id}/`, data);
    return response.data;
  }

  /**
   * Supprime une ligne budgétaire
   */
  async deleteBudgetLine(id: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/lines/${id}/`);
  }

  // ==========================================================================
  // SECTION 3: SAISIE INTELLIGENTE MATRICIELLE
  // ==========================================================================

  /**
   * Récupère la grille de saisie matricielle
   * @param params - Filtres (budget_plan, department, etc.)
   */
  async getMatrixGrid(params?: {
    budget_plan?: string;
    department?: string;
    category?: string;
  }): Promise<BudgetMatrixGrid> {
    const response = await apiService.get(`${BASE_PATH}/lines/grille-saisie/`, { params });
    return response.data;
  }

  /**
   * Saisie matricielle multi-dimensionnelle
   * Permet la saisie en masse de plusieurs lignes budgétaires
   */
  async saveMatrixEntry(data: BudgetMatrixEntry): Promise<{
    success: boolean;
    created_count: number;
    updated_count: number;
    lines: BudgetLine[];
  }> {
    const response = await apiService.post(`${BASE_PATH}/lines/saisie-matricielle/`, data);
    return response.data;
  }

  // ==========================================================================
  // SECTION 4: PLANIFICATION BUDGÉTAIRE PRÉDICTIVE (IA)
  // ==========================================================================

  /**
   * Génère des prévisions IA pour un plan budgétaire
   * Utilise les modèles ARIMA, LSTM, ou Prophet selon les données
   */
  async generateAIForecast(planId: string, params?: {
    model?: 'arima' | 'lstm' | 'prophet' | 'auto';
    forecast_months?: number;
    confidence_level?: number;
  }): Promise<BudgetAIForecast> {
    const response = await apiService.post(
      `${BASE_PATH}/plans/${planId}/generer-previsions-ia/`,
      params
    );
    return response.data;
  }

  /**
   * Dashboard executive avec KPIs clés pour un plan
   */
  async getExecutiveDashboard(planId: string): Promise<{
    overview: {
      total_budget: number;
      total_consumed: number;
      consumption_rate: number;
      health_score: number;
    };
    kpis: Array<{
      name: string;
      value: number;
      target: number;
      variance: number;
      trend: 'up' | 'down' | 'stable';
    }>;
    alerts: BudgetAlert[];
    recommendations: string[];
  }> {
    const response = await apiService.get(`${BASE_PATH}/plans/${planId}/dashboard-executive/`);
    return response.data;
  }

  /**
   * Analyse de variance avec drill-down
   */
  async analyzeVariances(planId: string, params?: {
    period_start?: string;
    period_end?: string;
    department?: string;
    category?: string;
  }): Promise<BudgetVarianceAnalysis> {
    const response = await apiService.post(
      `${BASE_PATH}/plans/${planId}/analyser-variances/`,
      params
    );
    return response.data;
  }

  // ==========================================================================
  // SECTION 5: DASHBOARDS INTERACTIFS
  // ==========================================================================

  /**
   * Statistiques principales temps réel
   */
  async getDashboardStats(params?: {
    fiscal_year?: string;
    department?: string;
    period_start?: string;
    period_end?: string;
  }): Promise<BudgetDashboardStats> {
    const response = await apiService.get(`${BASE_PATH}/dashboard/stats/`, { params });
    return response.data;
  }

  /**
   * Comparaison Year-to-Date (YTD)
   */
  async getYTDComparison(params?: {
    fiscal_year?: string;
    comparison_year?: string;
    department?: string;
  }): Promise<BudgetYTDComparison> {
    const response = await apiService.get(`${BASE_PATH}/dashboard/ytd/`, { params });
    return response.data;
  }

  /**
   * Analyse par département
   */
  async getDepartmentAnalysis(params?: {
    fiscal_year?: string;
    period_start?: string;
    period_end?: string;
  }): Promise<{
    departments: Array<{
      id: string;
      name: string;
      total_budget: number;
      total_consumed: number;
      consumption_rate: number;
      variance: number;
      alerts_count: number;
      top_accounts: Array<{
        account: string;
        label: string;
        consumed: number;
      }>;
    }>;
  }> {
    const response = await apiService.get(`${BASE_PATH}/dashboard/departements/`, { params });
    return response.data;
  }

  /**
   * Liste des départements budgétaires
   */
  async getDepartments(): Promise<BudgetDepartment[]> {
    const response = await apiService.get(`${BASE_PATH}/departments/`);
    return response.data;
  }

  /**
   * Comptes comptables budgétaires
   */
  async getBudgetAccounts(params?: {
    account_type?: string;
    is_budgetable?: boolean;
  }): Promise<BudgetAccount[]> {
    const response = await apiService.get(`${BASE_PATH}/accounts/budgetaires/`, { params });
    return response.data;
  }

  // ==========================================================================
  // SECTION 6: SYSTÈME D'ALERTES
  // ==========================================================================

  /**
   * Récupère la liste des alertes budgétaires
   */
  async getAlerts(params?: BudgetAlertQueryParams): Promise<{
    results: BudgetAlert[];
    count: number;
    next?: string;
    previous?: string;
  }> {
    const response = await apiService.get(`${BASE_PATH}/alerts/`, { params });
    return response.data;
  }

  /**
   * Récupère une alerte par ID
   */
  async getAlert(id: string): Promise<BudgetAlert> {
    const response = await apiService.get(`${BASE_PATH}/alerts/${id}/`);
    return response.data;
  }

  /**
   * Crée une nouvelle alerte
   */
  async createAlert(data: Partial<BudgetAlert>): Promise<BudgetAlert> {
    const response = await apiService.post(`${BASE_PATH}/alerts/`, data);
    return response.data;
  }

  /**
   * Met à jour une alerte
   */
  async updateAlert(id: string, data: Partial<BudgetAlert>): Promise<BudgetAlert> {
    const response = await apiService.patch(`${BASE_PATH}/alerts/${id}/`, data);
    return response.data;
  }

  /**
   * Supprime une alerte
   */
  async deleteAlert(id: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/alerts/${id}/`);
  }

  /**
   * Évalue automatiquement toutes les alertes
   * Déclenche le système d'évaluation automatique des seuils
   */
  async evaluateAutomaticAlerts(params?: {
    budget_plan?: string;
    force_refresh?: boolean;
  }): Promise<{
    evaluated_count: number;
    triggered_alerts: BudgetAlert[];
    resolved_alerts: string[];
  }> {
    const response = await apiService.post(`${BASE_PATH}/alerts/evaluer-automatiques/`, params);
    return response.data;
  }

  /**
   * Dashboard des alertes
   */
  async getAlertsDashboard(): Promise<{
    total_active: number;
    by_severity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    recent_alerts: BudgetAlert[];
    top_budget_plans: Array<{
      plan_id: string;
      plan_name: string;
      alerts_count: number;
    }>;
  }> {
    const response = await apiService.get(`${BASE_PATH}/alerts/dashboard/`);
    return response.data;
  }

  /**
   * Accuser réception d'une alerte
   */
  async acknowledgeAlert(id: string, notes?: string): Promise<BudgetAlert> {
    const response = await apiService.post(`${BASE_PATH}/alerts/${id}/accuser-reception/`, {
      notes
    });
    return response.data;
  }

  // ==========================================================================
  // SECTION 7: IMPORT/EXPORT
  // ==========================================================================

  /**
   * Import Excel intelligent
   * Supporte l'import de budgets depuis fichiers Excel
   */
  async importExcel(file: File, params?: {
    budget_plan?: string;
    template_id?: string;
    auto_create_accounts?: boolean;
  }): Promise<{
    success: boolean;
    imported_count: number;
    errors: Array<{
      row: number;
      message: string;
    }>;
    preview: BudgetLine[];
  }> {
    const formData = new FormData();
    formData.append('file', file);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    const response = await apiService.post(`${BASE_PATH}/import/excel/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * Export Excel avancé
   */
  async exportExcel(params?: {
    budget_plan?: string;
    department?: string;
    fiscal_year?: string;
    format?: 'detailed' | 'summary' | 'comparison';
    include_actuals?: boolean;
  }): Promise<Blob> {
    const response = await apiService.post(`${BASE_PATH}/export/excel/`, params, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Templates de budget disponibles
   */
  async getTemplates(): Promise<BudgetTemplate[]> {
    const response = await apiService.get(`${BASE_PATH}/import/templates/`);
    return response.data;
  }

  // ==========================================================================
  // SECTION 8: REPORTING AUTOMATISÉ
  // ==========================================================================

  /**
   * Génère un rapport mensuel automatique
   */
  async generateMonthlyReport(params: {
    budget_plan?: string;
    fiscal_year?: string;
    month: number;
    year: number;
    format?: 'pdf' | 'excel';
    include_charts?: boolean;
    send_email?: boolean;
    recipients?: string[];
  }): Promise<BudgetReport> {
    const response = await apiService.post(`${BASE_PATH}/reports/mensuel/`, params);
    return response.data;
  }

  /**
   * Récupère les rapports programmés
   */
  async getScheduledReports(params?: {
    budget_plan?: string;
    status?: string;
  }): Promise<BudgetReport[]> {
    const response = await apiService.get(`${BASE_PATH}/reports/programmed/`, { params });
    return response.data;
  }

  // ==========================================================================
  // SECTION 9: WORKFLOW & VALIDATION
  // ==========================================================================

  /**
   * Workflow de validation budgétaire
   */
  async submitForValidation(data: {
    budget_plan: string;
    validators: string[];
    notes?: string;
    deadline?: string;
  }): Promise<{
    success: boolean;
    workflow_id: string;
    status: string;
  }> {
    const response = await apiService.post(`${BASE_PATH}/workflow/validation/`, data);
    return response.data;
  }

  // ==========================================================================
  // SECTION 10: MACHINE LEARNING & ANALYTICS AVANCÉS
  // ==========================================================================

  /**
   * Prédictions Machine Learning
   */
  async predictML(params: {
    budget_plan?: string;
    account?: string;
    months_ahead?: number;
    include_confidence_interval?: boolean;
  }): Promise<{
    predictions: Array<{
      month: string;
      predicted_value: number;
      lower_bound: number;
      upper_bound: number;
    }>;
    accuracy_score: number;
    model_info: {
      algorithm: string;
      training_period: string;
      features_used: string[];
    };
  }> {
    const response = await apiService.post(`${BASE_PATH}/ml/predict/`, params);
    return response.data;
  }

  /**
   * Analyse ABC des fournisseurs/comptes
   */
  async getABCAnalysis(params?: {
    fiscal_year?: string;
    department?: string;
    analysis_type?: 'suppliers' | 'accounts' | 'categories';
  }): Promise<{
    category_a: Array<{ id: string; name: string; value: number; percent: number }>;
    category_b: Array<{ id: string; name: string; value: number; percent: number }>;
    category_c: Array<{ id: string; name: string; value: number; percent: number }>;
    insights: string[];
  }> {
    const response = await apiService.get(`${BASE_PATH}/analytics/abc-analysis/`, { params });
    return response.data;
  }

  /**
   * Comparaisons multi-périodes
   */
  async getMultiPeriodComparison(data: {
    periods: Array<{
      start_date: string;
      end_date: string;
      label?: string;
    }>;
    department?: string;
    category?: string;
  }): Promise<{
    comparison: Array<{
      period: string;
      total_budget: number;
      total_consumed: number;
      consumption_rate: number;
      variance: number;
    }>;
    trends: {
      budget_trend: 'increasing' | 'decreasing' | 'stable';
      consumption_trend: 'increasing' | 'decreasing' | 'stable';
    };
  }> {
    const response = await apiService.post(`${BASE_PATH}/analytics/multi-period/`, data);
    return response.data;
  }

  /**
   * Suggestions d'optimisation IA
   */
  async getAIOptimizationSuggestions(params?: {
    budget_plan?: string;
    department?: string;
    optimization_goal?: 'reduce_cost' | 'improve_efficiency' | 'balance_budget';
  }): Promise<{
    suggestions: Array<{
      category: string;
      current_value: number;
      suggested_value: number;
      potential_savings: number;
      confidence: number;
      rationale: string;
      priority: 'high' | 'medium' | 'low';
    }>;
    total_potential_savings: number;
    implementation_difficulty: 'easy' | 'medium' | 'hard';
  }> {
    const response = await apiService.post(`${BASE_PATH}/optimize/ai-suggestions/`, params);
    return response.data;
  }

  // ==========================================================================
  // SECTION 11: MÉTHODES HELPERS
  // ==========================================================================

  /**
   * Calcule le taux de consommation
   */
  calculateConsumptionRate(budget: number, consumed: number): number {
    if (budget === 0) return 0;
    return (consumed / budget) * 100;
  }

  /**
   * Détermine la couleur de l'alerte selon le taux
   */
  getConsumptionColor(rate: number): 'success' | 'warning' | 'danger' {
    if (rate < 70) return 'success';
    if (rate < 90) return 'warning';
    return 'danger';
  }

  /**
   * Formate un montant budgétaire
   */
  formatBudgetAmount(amount: number, currency: string = 'XOF'): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Calcule la variance
   */
  calculateVariance(budgeted: number, actual: number): {
    variance: number;
    variance_percent: number;
    is_favorable: boolean;
  } {
    const variance = actual - budgeted;
    const variance_percent = budgeted !== 0 ? (variance / budgeted) * 100 : 0;
    const is_favorable = variance <= 0; // Dépenser moins que prévu est favorable

    return { variance, variance_percent, is_favorable };
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const budgetService = new BudgetService();
export default budgetService;

// ============================================================================
// EXPORT LEGACY COMPATIBILITY
// ============================================================================

/**
 * @deprecated Use budgetService instead
 */
export const getBudgets = (filters?: Record<string, unknown>) => budgetService.getBudgetPlans(filters);

/**
 * @deprecated Use budgetService.getDashboardStats() instead
 */
export const getDashboardStats = () => budgetService.getDashboardStats();

/**
 * @deprecated Use budgetService.deleteBudgetPlan() instead
 */
export const deleteBudget = (id: string) => budgetService.deleteBudgetPlan(id);
