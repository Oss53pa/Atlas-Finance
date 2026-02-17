/**
 * HOOKS REACT QUERY - DASHBOARD
 *
 * Hooks pour la gestion des tableaux de bord et KPIs
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/api.service';
import type { DashboardQueryParams, DateFilterParams } from '../types/api.params';

// ========================================
// QUERY KEYS
// ========================================
export const dashboardKeys = {
  all: ['dashboard'] as const,
  overview: (params?: DateFilterParams) => [...dashboardKeys.all, 'overview', params] as const,
  kpis: (params?: DateFilterParams) => [...dashboardKeys.all, 'kpis', params] as const,
  charts: (type: string, params?: DateFilterParams) => [...dashboardKeys.all, 'charts', type, params] as const,
  alerts: () => [...dashboardKeys.all, 'alerts'] as const,
  activities: (params?: DateFilterParams) => [...dashboardKeys.all, 'activities', params] as const,
  widgets: () => [...dashboardKeys.all, 'widgets'] as const,
};

// ========================================
// TYPES
// ========================================
export interface DashboardOverview {
  kpis: KPIData[];
  charts: ChartData[];
  alerts: AlertData[];
  recent_activities: ActivityData[];
  quick_stats: QuickStats;
  last_updated: string;
}

export interface KPIData {
  id: string;
  label: string;
  value: number | string;
  type: 'currency' | 'number' | 'percentage' | 'text';
  trend?: number;
  trend_direction?: 'up' | 'down' | 'stable';
  target?: number;
  progress?: number;
  icon?: string;
  color?: string;
  period: string;
}

export interface ChartData {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'radar';
  data: {
    labels: string[];
    datasets: ChartDataset[];
  };
  options?: Record<string, any>;
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string;
  fill?: boolean;
}

export interface AlertData {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  read: boolean;
  action_url?: string;
  action_label?: string;
}

export interface ActivityData {
  id: string;
  type: string;
  title: string;
  description: string;
  user: string;
  user_avatar?: string;
  timestamp: string;
  icon?: string;
  color?: string;
  url?: string;
}

export interface QuickStats {
  chiffre_affaires: number;
  chiffre_affaires_variation: number;
  tresorerie: number;
  tresorerie_variation: number;
  factures_impayees: number;
  factures_impayees_count: number;
  ecritures_a_valider: number;
  periode: string;
}

export interface DashboardWidget {
  id: string;
  type: 'kpi' | 'chart' | 'list' | 'table' | 'calendar' | 'custom';
  title: string;
  config: Record<string, any>;
  position: { x: number; y: number };
  size: { width: number; height: number };
  is_visible: boolean;
  refresh_interval?: number;
}

// ========================================
// HOOKS - QUERIES
// ========================================

/**
 * Hook pour récupérer la vue d'ensemble du dashboard
 */
export const useDashboardOverview = (params?: DateFilterParams) => {
  return useQuery({
    queryKey: dashboardKeys.overview(params),
    queryFn: async () => {
      const response = await apiService.get<DashboardOverview>('/api/dashboard/overview/', params);
      return response;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook pour récupérer les KPIs
 */
export const useDashboardKPIs = (params?: DateFilterParams) => {
  return useQuery({
    queryKey: dashboardKeys.kpis(params),
    queryFn: async () => {
      const response = await apiService.get<KPIData[]>('/api/dashboard/kpis/', params);
      return response;
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000, // Refresh toutes les 5 minutes
  });
};

/**
 * Hook pour récupérer les données d'un graphique spécifique
 */
export const useDashboardChart = (
  chartType: 'revenue' | 'expenses' | 'cash-flow' | 'balance' | 'comparison',
  params?: DateFilterParams
) => {
  return useQuery({
    queryKey: dashboardKeys.charts(chartType, params),
    queryFn: async () => {
      const response = await apiService.get<ChartData>(`/api/dashboard/charts/${chartType}/`, params);
      return response;
    },
    enabled: !!chartType,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook pour récupérer les alertes
 */
export const useDashboardAlerts = () => {
  return useQuery({
    queryKey: dashboardKeys.alerts(),
    queryFn: async () => {
      const response = await apiService.get<AlertData[]>('/api/dashboard/alerts/');
      return response;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000,
  });
};

/**
 * Hook pour récupérer les activités récentes
 */
export const useDashboardActivities = (params?: DateFilterParams & { limit?: number }) => {
  return useQuery({
    queryKey: dashboardKeys.activities(params),
    queryFn: async () => {
      const response = await apiService.get<ActivityData[]>('/api/dashboard/activities/', params);
      return response;
    },
    staleTime: 1 * 60 * 1000,
  });
};

/**
 * Hook pour récupérer la configuration des widgets
 */
export const useDashboardWidgets = () => {
  return useQuery({
    queryKey: dashboardKeys.widgets(),
    queryFn: async () => {
      const response = await apiService.get<DashboardWidget[]>('/api/dashboard/widgets/');
      return response;
    },
    staleTime: 10 * 60 * 1000,
  });
};

// ========================================
// HOOKS - MUTATIONS
// ========================================

/**
 * Hook pour marquer une alerte comme lue
 */
export const useMarkAlertAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const response = await apiService.post(`/api/dashboard/alerts/${alertId}/read/`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.alerts() });
    },
  });
};

/**
 * Hook pour marquer toutes les alertes comme lues
 */
export const useMarkAllAlertsAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiService.post('/api/dashboard/alerts/read-all/');
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.alerts() });
    },
  });
};

/**
 * Hook pour mettre à jour la configuration d'un widget
 */
export const useUpdateDashboardWidget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ widgetId, config }: { widgetId: string; config: Partial<DashboardWidget> }) => {
      const response = await apiService.patch(`/api/dashboard/widgets/${widgetId}/`, config);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.widgets() });
    },
  });
};

/**
 * Hook pour rafraîchir les données du dashboard
 */
export const useRefreshDashboard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiService.post('/api/dashboard/refresh/');
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
};

/**
 * Hook pour exporter les données du dashboard
 */
export const useExportDashboard = () => {
  return useMutation({
    mutationFn: async ({ format, params }: { format: 'pdf' | 'excel'; params?: DateFilterParams }) => {
      const response = await apiService.get('/api/dashboard/export/', { ...params, format });
      return response;
    },
  });
};
