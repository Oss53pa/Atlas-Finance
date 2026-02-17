/**
 * HOOKS REACT QUERY - ÉTATS FINANCIERS
 *
 * Hooks pour la gestion des états financiers (Bilan, Compte de résultat, etc.)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/api.service';
import type { DateFilterParams, ReportQueryParams } from '../types/api.params';

// ========================================
// QUERY KEYS
// ========================================
export const financialStatementsKeys = {
  all: ['financial-statements'] as const,
  balance: (params?: DateFilterParams) => [...financialStatementsKeys.all, 'balance', params] as const,
  incomeStatement: (params?: DateFilterParams) => [...financialStatementsKeys.all, 'income-statement', params] as const,
  cashFlow: (params?: DateFilterParams) => [...financialStatementsKeys.all, 'cash-flow', params] as const,
  ratios: (params?: DateFilterParams) => [...financialStatementsKeys.all, 'ratios', params] as const,
  syscohada: (type: string, params?: DateFilterParams) => [...financialStatementsKeys.all, 'syscohada', type, params] as const,
};

// ========================================
// TYPES
// ========================================
export interface BalanceSheet {
  actif: {
    immobilise: BalanceItem[];
    circulant: BalanceItem[];
    tresorerie: BalanceItem[];
    total: number;
  };
  passif: {
    capitaux_propres: BalanceItem[];
    dettes: BalanceItem[];
    total: number;
  };
  date_arrete: string;
  exercice: string;
}

export interface BalanceItem {
  code: string;
  libelle: string;
  montant_brut: number;
  amortissements?: number;
  montant_net: number;
  montant_n_1?: number;
  variation?: number;
}

export interface IncomeStatement {
  produits: IncomeItem[];
  charges: IncomeItem[];
  resultat_exploitation: number;
  resultat_financier: number;
  resultat_exceptionnel: number;
  resultat_net: number;
  exercice: string;
}

export interface IncomeItem {
  code: string;
  libelle: string;
  montant: number;
  montant_n_1?: number;
  variation?: number;
  pourcentage_ca?: number;
}

export interface FinancialRatios {
  rentabilite: {
    roe: number; // Return on Equity
    roa: number; // Return on Assets
    marge_nette: number;
    marge_brute: number;
  };
  liquidite: {
    ratio_courant: number;
    ratio_rapide: number;
    ratio_tresorerie: number;
  };
  solvabilite: {
    ratio_endettement: number;
    autonomie_financiere: number;
    capacite_remboursement: number;
  };
  activite: {
    rotation_stocks: number;
    delai_clients: number;
    delai_fournisseurs: number;
    bfr_jours_ca: number;
  };
  exercice: string;
  date_calcul: string;
}

export interface CashFlowStatement {
  exploitation: CashFlowItem[];
  investissement: CashFlowItem[];
  financement: CashFlowItem[];
  flux_exploitation: number;
  flux_investissement: number;
  flux_financement: number;
  variation_tresorerie: number;
  tresorerie_debut: number;
  tresorerie_fin: number;
  exercice: string;
}

export interface CashFlowItem {
  libelle: string;
  montant: number;
  type: 'entree' | 'sortie';
}

// ========================================
// HOOKS - QUERIES
// ========================================

/**
 * Hook pour récupérer le bilan
 */
export const useBalanceSheet = (params?: DateFilterParams) => {
  return useQuery({
    queryKey: financialStatementsKeys.balance(params),
    queryFn: async () => {
      const response = await apiService.get<BalanceSheet>('/api/financial-statements/balance/', params);
      return response;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook pour récupérer le compte de résultat
 */
export const useIncomeStatement = (params?: DateFilterParams) => {
  return useQuery({
    queryKey: financialStatementsKeys.incomeStatement(params),
    queryFn: async () => {
      const response = await apiService.get<IncomeStatement>('/api/financial-statements/income/', params);
      return response;
    },
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * Hook pour récupérer le tableau des flux de trésorerie
 */
export const useCashFlowStatement = (params?: DateFilterParams) => {
  return useQuery({
    queryKey: financialStatementsKeys.cashFlow(params),
    queryFn: async () => {
      const response = await apiService.get<CashFlowStatement>('/api/financial-statements/cash-flow/', params);
      return response;
    },
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * Hook pour récupérer les ratios financiers
 */
export const useFinancialRatios = (params?: DateFilterParams) => {
  return useQuery({
    queryKey: financialStatementsKeys.ratios(params),
    queryFn: async () => {
      const response = await apiService.get<FinancialRatios>('/api/financial-statements/ratios/', params);
      return response;
    },
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * Hook pour récupérer les états SYSCOHADA
 */
export const useSyscohadaStatement = (type: 'bilan' | 'resultat' | 'tafire' | 'annexes', params?: DateFilterParams) => {
  return useQuery({
    queryKey: financialStatementsKeys.syscohada(type, params),
    queryFn: async () => {
      const response = await apiService.get(`/api/financial-statements/syscohada/${type}/`, params);
      return response;
    },
    enabled: !!type,
    staleTime: 10 * 60 * 1000,
  });
};

// ========================================
// HOOKS - MUTATIONS
// ========================================

/**
 * Hook pour générer un rapport d'états financiers
 */
export const useGenerateFinancialReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ReportQueryParams) => {
      const response = await apiService.post('/api/financial-statements/generate/', params);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financialStatementsKeys.all });
    },
  });
};

/**
 * Hook pour exporter les états financiers
 */
export const useExportFinancialStatements = () => {
  return useMutation({
    mutationFn: async ({ type, format, params }: {
      type: 'balance' | 'income' | 'cash-flow' | 'ratios';
      format: 'pdf' | 'excel' | 'csv';
      params?: DateFilterParams;
    }) => {
      const response = await apiService.get(`/api/financial-statements/${type}/export/`, {
        ...params,
        format,
      });
      return response;
    },
  });
};

/**
 * Hook pour comparer les états financiers entre exercices
 */
export const useCompareFinancialStatements = (exercice1: string, exercice2: string) => {
  return useQuery({
    queryKey: [...financialStatementsKeys.all, 'compare', exercice1, exercice2],
    queryFn: async () => {
      const response = await apiService.get('/api/financial-statements/compare/', {
        exercice_1: exercice1,
        exercice_2: exercice2,
      });
      return response;
    },
    enabled: !!exercice1 && !!exercice2,
    staleTime: 15 * 60 * 1000,
  });
};
