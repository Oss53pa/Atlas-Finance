/**
 * HOOKS REACT QUERY - RAPPORTS
 *
 * Hooks pour la gestion des rapports et exports
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/api.service';
import type { ReportQueryParams, DateFilterParams } from '../types/api.params';

// ========================================
// QUERY KEYS
// ========================================
export const reportsKeys = {
  all: ['reports'] as const,
  list: (params?: ReportQueryParams) => [...reportsKeys.all, 'list', params] as const,
  detail: (id: string) => [...reportsKeys.all, 'detail', id] as const,
  templates: () => [...reportsKeys.all, 'templates'] as const,
  scheduled: () => [...reportsKeys.all, 'scheduled'] as const,
  history: (params?: DateFilterParams) => [...reportsKeys.all, 'history', params] as const,
};

// ========================================
// TYPES
// ========================================
export interface Report {
  id: string;
  name: string;
  description?: string;
  type: ReportType;
  format: 'pdf' | 'excel' | 'csv' | 'json';
  template?: string;
  parameters: ReportParameters;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  file_url?: string;
  file_size?: number;
  created_by: string;
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

export type ReportType =
  | 'balance_generale'
  | 'grand_livre'
  | 'journal'
  | 'bilan'
  | 'compte_resultat'
  | 'etat_rapprochement'
  | 'balance_agee'
  | 'echeancier'
  | 'tva'
  | 'liasse_fiscale'
  | 'tableau_flux'
  | 'ratios'
  | 'budget_vs_reel'
  | 'immobilisations'
  | 'amortissements'
  | 'custom';

export interface ReportParameters {
  date_debut?: string;
  date_fin?: string;
  exercice?: string;
  journal?: string;
  compte_debut?: string;
  compte_fin?: string;
  tiers?: string;
  include_details?: boolean;
  include_lettrage?: boolean;
  comparatif?: boolean;
  exercice_comparatif?: string;
  grouping?: 'jour' | 'semaine' | 'mois' | 'trimestre' | 'annee';
  [key: string]: unknown;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  type: ReportType;
  default_parameters: ReportParameters;
  is_system: boolean;
  created_by?: string;
  created_at: string;
}

export interface ScheduledReport {
  id: string;
  report_template: string;
  template_name: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  day_of_week?: number;
  day_of_month?: number;
  time: string;
  recipients: string[];
  format: 'pdf' | 'excel' | 'csv';
  is_active: boolean;
  last_run?: string;
  next_run?: string;
  created_at: string;
}

export interface ReportHistory {
  id: string;
  report_name: string;
  report_type: ReportType;
  format: string;
  status: 'completed' | 'failed';
  file_url?: string;
  generated_at: string;
  generated_by: string;
  parameters: ReportParameters;
}

// ========================================
// HOOKS - QUERIES
// ========================================

/**
 * Hook pour récupérer la liste des rapports générés
 */
export const useReports = (params?: ReportQueryParams) => {
  return useQuery({
    queryKey: reportsKeys.list(params),
    queryFn: async () => {
      const response = await apiService.get<Report[]>('/api/reports/', params);
      return response;
    },
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Hook pour récupérer un rapport spécifique
 */
export const useReport = (id: string) => {
  return useQuery({
    queryKey: reportsKeys.detail(id),
    queryFn: async () => {
      const response = await apiService.get<Report>(`/api/reports/${id}/`);
      return response;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook pour récupérer les modèles de rapports
 */
export const useReportTemplates = () => {
  return useQuery({
    queryKey: reportsKeys.templates(),
    queryFn: async () => {
      const response = await apiService.get<ReportTemplate[]>('/api/reports/templates/');
      return response;
    },
    staleTime: 15 * 60 * 1000,
  });
};

/**
 * Hook pour récupérer les rapports programmés
 */
export const useScheduledReports = () => {
  return useQuery({
    queryKey: reportsKeys.scheduled(),
    queryFn: async () => {
      const response = await apiService.get<ScheduledReport[]>('/api/reports/scheduled/');
      return response;
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook pour récupérer l'historique des rapports
 */
export const useReportHistory = (params?: DateFilterParams) => {
  return useQuery({
    queryKey: reportsKeys.history(params),
    queryFn: async () => {
      const response = await apiService.get<ReportHistory[]>('/api/reports/history/', params);
      return response;
    },
    staleTime: 2 * 60 * 1000,
  });
};

// ========================================
// HOOKS - MUTATIONS
// ========================================

/**
 * Hook pour générer un nouveau rapport
 */
export const useGenerateReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      type: ReportType;
      format: 'pdf' | 'excel' | 'csv';
      parameters: ReportParameters;
      name?: string;
    }) => {
      const response = await apiService.post<Report>('/api/reports/generate/', params);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.all });
    },
  });
};

/**
 * Hook pour créer un modèle de rapport personnalisé
 */
export const useCreateReportTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: Omit<ReportTemplate, 'id' | 'is_system' | 'created_at'>) => {
      const response = await apiService.post<ReportTemplate>('/api/reports/templates/', template);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.templates() });
    },
  });
};

/**
 * Hook pour programmer un rapport récurrent
 */
export const useScheduleReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (schedule: Omit<ScheduledReport, 'id' | 'template_name' | 'last_run' | 'next_run' | 'created_at'>) => {
      const response = await apiService.post<ScheduledReport>('/api/reports/scheduled/', schedule);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.scheduled() });
    },
  });
};

/**
 * Hook pour supprimer un rapport programmé
 */
export const useDeleteScheduledReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiService.delete(`/api/reports/scheduled/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.scheduled() });
    },
  });
};

/**
 * Hook pour télécharger un rapport
 */
export const useDownloadReport = () => {
  return useMutation({
    mutationFn: async (reportId: string) => {
      const response = await apiService.get(`/api/reports/${reportId}/download/`, {
        responseType: 'blob',
      });
      return response;
    },
  });
};

/**
 * Hook pour envoyer un rapport par email
 */
export const useEmailReport = () => {
  return useMutation({
    mutationFn: async ({ reportId, recipients, message }: {
      reportId: string;
      recipients: string[];
      message?: string;
    }) => {
      const response = await apiService.post(`/api/reports/${reportId}/email/`, {
        recipients,
        message,
      });
      return response;
    },
  });
};
