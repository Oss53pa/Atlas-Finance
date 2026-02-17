/**
 * HOOKS REACT QUERY - RAPPROCHEMENT BANCAIRE
 *
 * Hooks pour la gestion du rapprochement bancaire
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/api.service';
import type { TreasuryQueryParams, DateFilterParams } from '../types/api.params';

// ========================================
// QUERY KEYS
// ========================================
export const reconciliationKeys = {
  all: ['reconciliation'] as const,
  items: (params?: ReconciliationParams) => [...reconciliationKeys.all, 'items', params] as const,
  item: (id: string) => [...reconciliationKeys.all, 'item', id] as const,
  summary: (bankAccountId: string, params?: DateFilterParams) =>
    [...reconciliationKeys.all, 'summary', bankAccountId, params] as const,
  unmatched: (bankAccountId: string) => [...reconciliationKeys.all, 'unmatched', bankAccountId] as const,
  history: (bankAccountId: string, params?: DateFilterParams) =>
    [...reconciliationKeys.all, 'history', bankAccountId, params] as const,
  suggestions: (bankAccountId: string) => [...reconciliationKeys.all, 'suggestions', bankAccountId] as const,
};

// ========================================
// TYPES
// ========================================
export interface ReconciliationParams extends DateFilterParams {
  compte_bancaire?: string;
  statut?: 'tous' | 'rapproche' | 'non_rapproche' | 'ecart' | 'en_attente';
  type_ecart?: 'montant' | 'date' | 'reference' | 'absent_comptable' | 'absent_banque';
  type_mouvement?: 'debit' | 'credit';
}

export interface ReconciliationItem {
  id: string;
  compte_bancaire: string;
  date: string;
  date_valeur?: string;
  type_mouvement: 'debit' | 'credit';
  libelle: string;
  description?: string;
  reference_comptable?: string;
  reference_banque?: string;
  montant_comptable: number | null;
  montant_banque: number | null;
  ecart_montant: number | null;
  statut: 'rapproche' | 'non_rapproche' | 'ecart' | 'en_attente';
  type_ecart?: 'montant' | 'date' | 'reference' | 'absent_comptable' | 'absent_banque';
  ecriture_comptable?: string;
  mouvement_banque?: string;
  rapproche_par?: string;
  rapproche_le?: string;
  commentaire?: string;
  created_at: string;
  updated_at: string;
}

export interface ReconciliationSummary {
  compte_bancaire: string;
  compte_bancaire_libelle: string;
  periode_debut: string;
  periode_fin: string;
  solde_comptable: number;
  solde_banque: number;
  ecart_total: number;
  total_rapproche: number;
  total_non_rapproche: number;
  total_en_attente: number;
  matched_count: number;
  unmatched_count: number;
  pending_count: number;
  match_rate: number; // Pourcentage
  details_ecarts: {
    ecart_montant: number;
    ecart_date: number;
    absent_comptable: number;
    absent_banque: number;
  };
  last_reconciliation_date?: string;
}

export interface ReconciliationSuggestion {
  ecriture_comptable: {
    id: string;
    date: string;
    libelle: string;
    montant: number;
    reference: string;
  };
  mouvement_banque: {
    id: string;
    date: string;
    libelle: string;
    montant: number;
    reference: string;
  };
  score: number; // Score de correspondance (0-100)
  raison: string; // Explication de la suggestion
}

export interface ReconciliationHistory {
  id: string;
  compte_bancaire: string;
  date_rapprochement: string;
  periode_debut: string;
  periode_fin: string;
  solde_depart: number;
  solde_fin: number;
  nombre_ecritures: number;
  ecart_final: number;
  statut: 'en_cours' | 'valide' | 'annule';
  valide_par?: string;
  valide_le?: string;
  commentaire?: string;
}

export interface MatchItemsDto {
  items: string[]; // IDs des éléments à rapprocher ensemble
  force?: boolean; // Forcer même si montants différents
  commentaire?: string;
}

export interface AutoReconcileDto {
  compte_bancaire: string;
  periode_debut: string;
  periode_fin: string;
  tolerance_montant?: number; // Tolérance sur l'écart de montant
  tolerance_date?: number; // Tolérance en jours sur la date
}

// ========================================
// HOOKS - QUERIES
// ========================================

/**
 * Hook pour récupérer les éléments de rapprochement
 */
export const useReconciliationItems = (params?: ReconciliationParams) => {
  return useQuery({
    queryKey: reconciliationKeys.items(params),
    queryFn: async () => {
      const response = await apiService.get<{
        count: number;
        results: ReconciliationItem[];
        matched_count?: number;
        unmatched_count?: number;
        total_difference?: number;
        match_rate?: number;
      }>('/api/treasury/reconciliation/', params);
      return response;
    },
    enabled: !!params?.compte_bancaire,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Hook pour récupérer un élément de rapprochement
 */
export const useReconciliationItem = (id: string) => {
  return useQuery({
    queryKey: reconciliationKeys.item(id),
    queryFn: async () => {
      const response = await apiService.get<ReconciliationItem>(`/api/treasury/reconciliation/${id}/`);
      return response;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook pour récupérer le résumé de rapprochement d'un compte
 */
export const useReconciliationSummary = (bankAccountId: string, params?: DateFilterParams) => {
  return useQuery({
    queryKey: reconciliationKeys.summary(bankAccountId, params),
    queryFn: async () => {
      const response = await apiService.get<ReconciliationSummary>(
        `/api/treasury/reconciliation/summary/${bankAccountId}/`,
        params
      );
      return response;
    },
    enabled: !!bankAccountId,
    staleTime: 3 * 60 * 1000,
  });
};

/**
 * Hook pour récupérer les éléments non rapprochés
 */
export const useUnmatchedItems = (bankAccountId: string) => {
  return useQuery({
    queryKey: reconciliationKeys.unmatched(bankAccountId),
    queryFn: async () => {
      const response = await apiService.get<ReconciliationItem[]>(
        `/api/treasury/reconciliation/unmatched/${bankAccountId}/`
      );
      return response;
    },
    enabled: !!bankAccountId,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Hook pour récupérer l'historique des rapprochements
 */
export const useReconciliationHistory = (bankAccountId: string, params?: DateFilterParams) => {
  return useQuery({
    queryKey: reconciliationKeys.history(bankAccountId, params),
    queryFn: async () => {
      const response = await apiService.get<ReconciliationHistory[]>(
        `/api/treasury/reconciliation/history/${bankAccountId}/`,
        params
      );
      return response;
    },
    enabled: !!bankAccountId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook pour récupérer les suggestions de rapprochement
 */
export const useReconciliationSuggestions = (bankAccountId: string) => {
  return useQuery({
    queryKey: reconciliationKeys.suggestions(bankAccountId),
    queryFn: async () => {
      const response = await apiService.get<ReconciliationSuggestion[]>(
        `/api/treasury/reconciliation/suggestions/${bankAccountId}/`
      );
      return response;
    },
    enabled: !!bankAccountId,
    staleTime: 5 * 60 * 1000,
  });
};

// ========================================
// HOOKS - MUTATIONS
// ========================================

/**
 * Hook pour rapprocher manuellement des éléments
 */
export const useMatchItems = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: MatchItemsDto) => {
      const response = await apiService.post('/api/treasury/reconciliation/match/', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reconciliationKeys.all });
    },
  });
};

/**
 * Hook pour annuler un rapprochement
 */
export const useUnmatchItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const response = await apiService.post(`/api/treasury/reconciliation/${itemId}/unmatch/`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reconciliationKeys.all });
    },
  });
};

/**
 * Hook pour lancer le rapprochement automatique
 */
export const useAutoReconcile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AutoReconcileDto) => {
      const response = await apiService.post<{
        matched_count: number;
        unmatched_count: number;
        suggestions_count: number;
      }>('/api/treasury/reconciliation/auto/', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reconciliationKeys.all });
    },
  });
};

/**
 * Hook pour valider un rapprochement (clôturer)
 */
export const useValidateReconciliation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bankAccountId, params, commentaire }: {
      bankAccountId: string;
      params: DateFilterParams;
      commentaire?: string;
    }) => {
      const response = await apiService.post(`/api/treasury/reconciliation/validate/${bankAccountId}/`, {
        ...params,
        commentaire,
      });
      return response;
    },
    onSuccess: (_, { bankAccountId }) => {
      queryClient.invalidateQueries({ queryKey: reconciliationKeys.all });
      queryClient.invalidateQueries({ queryKey: reconciliationKeys.history(bankAccountId) });
    },
  });
};

/**
 * Hook pour importer un relevé bancaire
 */
export const useImportBankStatement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bankAccountId, file, format }: {
      bankAccountId: string;
      file: File;
      format: 'csv' | 'ofx' | 'qif' | 'camt053';
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('format', format);
      formData.append('compte_bancaire', bankAccountId);

      const response = await apiService.post('/api/treasury/reconciliation/import/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reconciliationKeys.all });
    },
  });
};

/**
 * Hook pour exporter l'état de rapprochement
 */
export const useExportReconciliation = () => {
  return useMutation({
    mutationFn: async ({ bankAccountId, params, format }: {
      bankAccountId: string;
      params: DateFilterParams;
      format: 'pdf' | 'excel' | 'csv';
    }) => {
      const response = await apiService.get(`/api/treasury/reconciliation/export/${bankAccountId}/`, {
        ...params,
        format,
        responseType: 'blob',
      });
      return response;
    },
  });
};

/**
 * Hook pour ajouter un commentaire sur un élément
 */
export const useAddReconciliationComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, commentaire }: { itemId: string; commentaire: string }) => {
      const response = await apiService.patch(`/api/treasury/reconciliation/${itemId}/`, {
        commentaire,
      });
      return response;
    },
    onSuccess: (_, { itemId }) => {
      queryClient.invalidateQueries({ queryKey: reconciliationKeys.item(itemId) });
      queryClient.invalidateQueries({ queryKey: reconciliationKeys.items() });
    },
  });
};

/**
 * Hook pour appliquer une suggestion de rapprochement
 */
export const useApplySuggestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (suggestion: ReconciliationSuggestion) => {
      const response = await apiService.post('/api/treasury/reconciliation/apply-suggestion/', {
        ecriture_id: suggestion.ecriture_comptable.id,
        mouvement_id: suggestion.mouvement_banque.id,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reconciliationKeys.all });
    },
  });
};
