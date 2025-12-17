/**
 * Service Dashboard WiseBook
 * Tableau de bord exécutif et KPIs consolidés
 *
 * Fonctionnalités:
 * - KPIs financiers consolidés
 * - Métriques opérationnelles
 * - Tendances et graphiques
 * - Alertes critiques
 * - Benchmarking performance
 * - Export dashboard (PDF, Excel)
 *
 * Architecture: Standard apiService + BASE_PATH
 * Backend: apps/dashboard/urls.py (6 APIView endpoints)
 *
 * @module services/dashboard
 * @version 4.1.0
 * @date 2025-10-19
 */

import { apiService } from './api';

const BASE_PATH = '/api/v1/dashboard';

// ============================================================================
// INTERFACES TYPESCRIPT
// ============================================================================

/**
 * KPIs consolidés
 */
export interface ConsolidatedKPIs {
  // Bilan
  total_assets: number;
  total_liabilities: number;
  equity: number;

  // Résultat
  revenue: number;
  net_income: number;
  ebitda: number;

  // Trésorerie
  cash_position: number;
  working_capital: number;

  // Ratios financiers
  quick_ratio: number;
  current_ratio: number;
  debt_to_equity: number;
  roe: number; // Return on Equity
  roa: number; // Return on Assets

  // Tiers
  total_customers: number;
  active_customers: number;
  total_suppliers: number;
  active_suppliers: number;

  // Cycle d'exploitation
  dso: number; // Days Sales Outstanding
  dpo: number; // Days Payables Outstanding
  cash_conversion_cycle: number;

  // Créances/Dettes
  overdue_receivables: number;
  overdue_payables: number;

  // Évolutions (vs période précédente)
  revenue_growth?: number;
  profit_growth?: number;
  assets_growth?: number;
}

/**
 * Métriques opérationnelles
 */
export interface OperationalMetrics {
  // Performance opérationnelle
  order_fulfillment_rate: number;
  inventory_turnover: number;
  productivity_rate: number;

  // Satisfaction
  customer_satisfaction: number;
  employee_productivity: number;

  // Système
  system_uptime: number;

  // Détails complémentaires
  active_users_count?: number;
  transactions_today?: number;
  documents_processed?: number;
  api_response_time?: number;
}

/**
 * Point de données pour tendances
 */
export interface TrendDataPoint {
  month: string;
  value: number;
  label?: string;
}

/**
 * Tendances financières
 */
export interface FinancialTrends {
  // Séries temporelles
  revenue: TrendDataPoint[];
  profit: TrendDataPoint[];
  cashflow: TrendDataPoint[];

  // Métadonnées
  period_start?: string;
  period_end?: string;
  currency?: string;
}

/**
 * Alerte critique
 */
export interface CriticalAlert {
  id: string;
  type: 'treasury' | 'customer' | 'supplier' | 'accounting' | 'compliance' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  value?: number;
  threshold?: number;
  date: string;
  action_url?: string;
  is_acknowledged?: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
}

/**
 * Benchmarking de performance
 */
export interface PerformanceBenchmark {
  // Moyennes sectorielles
  industry_average: Record<string, number>;

  // Performance entreprise
  company_performance: Record<string, number>;

  // Classement
  ranking: {
    overall: number;
    out_of: number;
    percentile: number;
  };

  // Comparaisons détaillées
  comparisons?: Array<{
    metric: string;
    company_value: number;
    industry_value: number;
    difference: number;
    performance: 'above' | 'at' | 'below';
  }>;

  // Recommandations
  recommendations?: string[];
}

/**
 * Résultat d'export
 */
export interface DashboardExport {
  message: string;
  status: 'success' | 'processing' | 'failed';
  download_url?: string;
  file_name?: string;
  expires_at?: string;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class DashboardService {

  // ==========================================================================
  // SECTION 1: KPIS CONSOLIDÉS
  // ==========================================================================

  /**
   * Récupère les KPIs consolidés
   */
  async getConsolidatedKPIs(params?: {
    company_id?: string;
    fiscal_year_id?: string;
    period?: string;
    date?: string;
  }): Promise<ConsolidatedKPIs> {
    const response = await apiService.get(`${BASE_PATH}/consolidated-kpis/`, { params });
    return response.data;
  }

  // ==========================================================================
  // SECTION 2: MÉTRIQUES OPÉRATIONNELLES
  // ==========================================================================

  /**
   * Récupère les métriques opérationnelles
   */
  async getOperationalMetrics(params?: {
    company_id?: string;
    period?: string;
  }): Promise<OperationalMetrics> {
    const response = await apiService.get(`${BASE_PATH}/operational-metrics/`, { params });
    return response.data;
  }

  // ==========================================================================
  // SECTION 3: TENDANCES FINANCIÈRES
  // ==========================================================================

  /**
   * Récupère les tendances financières
   */
  async getFinancialTrends(params?: {
    company_id?: string;
    period?: string;
    months?: number;
    fiscal_year_id?: string;
  }): Promise<FinancialTrends> {
    const response = await apiService.get(`${BASE_PATH}/financial-trends/`, { params });
    return response.data;
  }

  // ==========================================================================
  // SECTION 4: ALERTES CRITIQUES
  // ==========================================================================

  /**
   * Récupère les alertes critiques
   */
  async getCriticalAlerts(params?: {
    company_id?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    type?: string;
    is_acknowledged?: boolean;
  }): Promise<CriticalAlert[]> {
    const response = await apiService.get(`${BASE_PATH}/critical-alerts/`, { params });
    return response.data;
  }

  /**
   * Accuse réception d'une alerte
   */
  async acknowledgeAlert(alertId: string): Promise<CriticalAlert> {
    const response = await apiService.post(`${BASE_PATH}/critical-alerts/${alertId}/acknowledge/`);
    return response.data;
  }

  // ==========================================================================
  // SECTION 5: BENCHMARKING
  // ==========================================================================

  /**
   * Récupère le benchmarking de performance
   */
  async getPerformanceBenchmark(params?: {
    company_id?: string;
    industry?: string;
    fiscal_year_id?: string;
  }): Promise<PerformanceBenchmark> {
    const response = await apiService.get(`${BASE_PATH}/performance-benchmark/`, { params });
    return response.data;
  }

  // ==========================================================================
  // SECTION 6: EXPORT
  // ==========================================================================

  /**
   * Exporte le dashboard exécutif
   */
  async exportDashboard(params: {
    company_id?: string;
    format: 'pdf' | 'excel';
    period?: string;
    include_charts?: boolean;
    sections?: ('kpis' | 'metrics' | 'trends' | 'alerts' | 'benchmark')[];
  }): Promise<Blob> {
    const response = await apiService.get(`${BASE_PATH}/export/`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Déclenche un export asynchrone
   */
  async requestExport(params: {
    company_id?: string;
    format: 'pdf' | 'excel';
    period?: string;
    email_to?: string;
  }): Promise<DashboardExport> {
    const response = await apiService.post(`${BASE_PATH}/export/request/`, params);
    return response.data;
  }

  // ==========================================================================
  // SECTION 7: MÉTHODES HELPERS
  // ==========================================================================

  /**
   * Formate un montant
   */
  formatAmount(amount: number, currency: string = 'XOF'): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Formate un pourcentage
   */
  formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Formate un ratio
   */
  formatRatio(value: number, decimals: number = 2): string {
    return value.toFixed(decimals);
  }

  /**
   * Détermine la couleur selon la sévérité
   */
  getSeverityColor(severity: string): 'success' | 'warning' | 'danger' | 'critical' {
    switch (severity) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'danger';
      case 'medium':
        return 'warning';
      default:
        return 'success';
    }
  }

  /**
   * Détermine l'icône selon le type d'alerte
   */
  getAlertIcon(type: string): string {
    const icons: Record<string, string> = {
      'treasury': '💰',
      'customer': '👤',
      'supplier': '🏢',
      'accounting': '📊',
      'compliance': '⚖️',
      'system': '⚙️',
    };
    return icons[type] || '⚠️';
  }

  /**
   * Calcule la variation en pourcentage
   */
  calculateGrowth(current: number, previous: number): {
    value: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
  } {
    const value = current - previous;
    const percentage = previous !== 0 ? (value / previous) * 100 : 0;

    let trend: 'up' | 'down' | 'stable';
    if (Math.abs(percentage) < 0.1) {
      trend = 'stable';
    } else {
      trend = percentage > 0 ? 'up' : 'down';
    }

    return { value, percentage, trend };
  }

  /**
   * Détermine la santé financière selon les ratios
   */
  getFinancialHealth(kpis: ConsolidatedKPIs): {
    score: number;
    status: 'excellent' | 'good' | 'fair' | 'poor';
    alerts: string[];
  } {
    let score = 100;
    const alerts: string[] = [];

    // Current ratio
    if (kpis.current_ratio < 1) {
      score -= 20;
      alerts.push('Ratio de liquidité faible');
    } else if (kpis.current_ratio < 1.5) {
      score -= 10;
    }

    // Debt to equity
    if (kpis.debt_to_equity > 2) {
      score -= 20;
      alerts.push('Endettement élevé');
    } else if (kpis.debt_to_equity > 1) {
      score -= 10;
    }

    // ROE
    if (kpis.roe < 5) {
      score -= 15;
      alerts.push('Rentabilité faible');
    }

    // Cash position
    if (kpis.cash_position < 0) {
      score -= 25;
      alerts.push('Position de trésorerie négative');
    }

    let status: 'excellent' | 'good' | 'fair' | 'poor';
    if (score >= 80) status = 'excellent';
    else if (score >= 60) status = 'good';
    else if (score >= 40) status = 'fair';
    else status = 'poor';

    return { score, status, alerts };
  }

  /**
   * Formate les tendances pour graphiques
   */
  formatTrendsForChart(trends: TrendDataPoint[]): {
    labels: string[];
    data: number[];
  } {
    return {
      labels: trends.map(t => t.label || t.month),
      data: trends.map(t => t.value),
    };
  }

  /**
   * Applique un thème au dashboard (client-side)
   */
  applyTheme(themeId: string): { success: boolean } {
    const themes: Record<string, Record<string, string>> = {
      'corporate-blue': {
        primary: '#1E40AF',
        secondary: '#3B82F6',
        accent: '#60A5FA',
        background: '#F8FAFC',
        surface: '#FFFFFF',
        text: '#1E293B'
      },
      'forest-green': {
        primary: '#2E7D32',
        secondary: '#4CAF50',
        accent: '#81C784',
        background: '#F1F8F4',
        surface: '#FFFFFF',
        text: '#1B5E20'
      },
      'sunset-orange': {
        primary: '#E65100',
        secondary: '#FF6F00',
        accent: '#FF9800',
        background: '#FFF3E0',
        surface: '#FFFFFF',
        text: '#BF360C'
      },
      'midnight-purple': {
        primary: '#4A148C',
        secondary: '#6A1B9A',
        accent: '#9C27B0',
        background: '#F3E5F5',
        surface: '#FFFFFF',
        text: '#4A148C'
      }
    };

    const theme = themes[themeId];
    if (theme) {
      const root = document.documentElement;
      Object.entries(theme).forEach(([key, value]) => {
        root.style.setProperty(`--${key}-color`, value);
      });
      localStorage.setItem('wisebook-theme', themeId);
    }

    return { success: !!theme };
  }

  /**
   * Récupère le thème actuel
   */
  getCurrentTheme(): string {
    return localStorage.getItem('wisebook-theme') || 'corporate-blue';
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const dashboardService = new DashboardService();
export default dashboardService;
