// @ts-nocheck

/**
 * HOOKS REACT QUERY - TRESORERIE
 *
 * Hooks pour la gestion de la tresorerie avec React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidateQueries } from '../lib/react-query';
import {
  bankAccountsService,
  bankTransactionsService,
  treasuryReportsService,
} from '../services/treasury-complete.service';
import type { BankAccount, CashMovement } from '../services/treasury-complete.service';

// Cast services to access extended API methods
const bankApi = bankAccountsService as Record<string, (...args: unknown[]) => Promise<unknown>>;
const txApi = bankTransactionsService as Record<string, (...args: unknown[]) => Promise<unknown>>;
const reportsApi = treasuryReportsService as Record<string, (...args: unknown[]) => Promise<unknown>>;

interface QueryParams {
  page?: number;
  page_size?: number;
  [key: string]: unknown;
}

interface TreasuryQueryParams {
  compte_bancaire?: string;
  date_debut?: string;
  date_fin?: string;
  type_operation?: string;
  statut?: string;
  page?: number;
  page_size?: number;
}

interface BankTransaction {
  id: string;
  compte_bancaire: string;
  date_operation: string;
  date_valeur: string;
  libelle: string;
  reference?: string;
  montant: number;
  sens: 'debit' | 'credit';
  solde_apres: number;
  type_operation: string;
  statut: string;
  ecriture_comptable?: string;
  piece_jointe?: string;
  created_at: string;
  updated_at: string;
}

/**
 * ========================================
 * COMPTES BANCAIRES (BANK ACCOUNTS)
 * ========================================
 */

export const useBankAccounts = (params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.treasury.bankAccounts.list(params),
    queryFn: () => bankAccountsService.getAll(params as Parameters<typeof bankAccountsService.getAll>[0]),
  });
};

export const useBankAccount = (id: string) => {
  return useQuery({
    queryKey: queryKeys.treasury.bankAccounts.detail(id),
    queryFn: () => bankAccountsService.getById(id),
    enabled: !!id,
  });
};

export const useActiveBankAccounts = () => {
  return useQuery({
    queryKey: queryKeys.treasury.bankAccounts.active,
    queryFn: () => bankAccountsService.getActiveAccounts(),
  });
};

export const useBankAccountsByCurrency = (deviseId: string, params?: QueryParams) => {
  return useQuery({
    queryKey: ['bankAccounts', 'byCurrency', deviseId, params],
    queryFn: () => bankApi.getByCurrency(deviseId, params) as Promise<unknown>,
    enabled: !!deviseId,
  });
};

export const useBankAccountBalance = (accountId: string, date?: string) => {
  return useQuery({
    queryKey: queryKeys.treasury.bankAccounts.balance(accountId, date),
    queryFn: () => bankApi.getBalanceAtDate(accountId, date || new Date().toISOString().split('T')[0]) as Promise<unknown>,
    enabled: !!accountId,
  });
};

export const useBankAccountBalanceHistory = (accountId: string, dateDebut: string, dateFin: string) => {
  return useQuery({
    queryKey: ['bankAccounts', 'balanceHistory', accountId, dateDebut, dateFin],
    queryFn: () => bankApi.getBalanceHistory(accountId, dateDebut, dateFin) as Promise<unknown>,
    enabled: !!(accountId && dateDebut && dateFin),
  });
};

export const useBankAccountTransactions = (accountId: string, params?: TreasuryQueryParams) => {
  return useQuery({
    queryKey: queryKeys.treasury.bankAccounts.transactions(accountId, params),
    queryFn: () => bankApi.getTransactions(accountId, params) as Promise<unknown>,
    enabled: !!accountId,
  });
};

export const useCreateBankAccount = () => {
  return useMutation({
    mutationFn: (data: Partial<BankAccount>) => bankAccountsService.create(data),
    onSuccess: () => {
      invalidateQueries.bankAccounts();
    },
  });
};

export const useUpdateBankAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BankAccount> }) =>
      bankAccountsService.update(id, data),
    onSuccess: (_: unknown, { id }: { id: string }) => {
      invalidateQueries.bankAccounts();
      queryClient.invalidateQueries({ queryKey: queryKeys.treasury.bankAccounts.detail(id) });
    },
  });
};

export const useDeleteBankAccount = () => {
  return useMutation({
    mutationFn: (id: string) => bankAccountsService.delete(id),
    onSuccess: () => {
      invalidateQueries.bankAccounts();
    },
  });
};

export const useCloseBankAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dateCloture }: { id: string; dateCloture: string }) =>
      bankApi.closeAccount(id, dateCloture) as Promise<BankAccount>,
    onSuccess: (_: unknown, { id }: { id: string }) => {
      invalidateQueries.bankAccounts();
      queryClient.invalidateQueries({ queryKey: queryKeys.treasury.bankAccounts.detail(id) });
    },
  });
};

export const useReopenBankAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => bankApi.reopenAccount(id) as Promise<BankAccount>,
    onSuccess: (_: unknown, id: string) => {
      invalidateQueries.bankAccounts();
      queryClient.invalidateQueries({ queryKey: queryKeys.treasury.bankAccounts.detail(id) });
    },
  });
};

/**
 * ========================================
 * TRANSACTIONS BANCAIRES (BANK TRANSACTIONS)
 * ========================================
 */

export const useBankTransactions = (params?: TreasuryQueryParams) => {
  return useQuery({
    queryKey: queryKeys.treasury.bankTransactions.list(params),
    queryFn: () => txApi.getAll(params) as Promise<unknown>,
  });
};

export const useBankTransaction = (id: string) => {
  return useQuery({
    queryKey: queryKeys.treasury.bankTransactions.detail(id),
    queryFn: () => txApi.getById(id) as Promise<BankTransaction | null>,
    enabled: !!id,
  });
};

export const useTransactionsByAccount = (compteId: string, params?: TreasuryQueryParams) => {
  return useQuery({
    queryKey: queryKeys.treasury.bankTransactions.byAccount(compteId),
    queryFn: () => txApi.getByAccount(compteId, params) as Promise<unknown>,
    enabled: !!compteId,
  });
};

export const useTransactionsByPeriod = (dateDebut: string, dateFin: string, params?: QueryParams) => {
  return useQuery({
    queryKey: ['bankTransactions', 'byPeriod', dateDebut, dateFin, params],
    queryFn: () => txApi.getByPeriod(dateDebut, dateFin, params) as Promise<unknown>,
    enabled: !!(dateDebut && dateFin),
  });
};

export const useTransactionsByStatus = (statut: string, params?: QueryParams) => {
  return useQuery({
    queryKey: ['bankTransactions', 'byStatus', statut, params],
    queryFn: () => txApi.getByStatus(statut, params) as Promise<unknown>,
    enabled: !!statut,
  });
};

export const useUnreconciledTransactions = (compteId?: string) => {
  return useQuery({
    queryKey: queryKeys.treasury.bankTransactions.unreconciled(compteId),
    queryFn: () => txApi.getUnreconciled(compteId) as Promise<unknown>,
  });
};

export const useCreateBankTransaction = () => {
  return useMutation({
    mutationFn: (data: Partial<BankTransaction>) => txApi.create(data) as Promise<BankTransaction>,
    onSuccess: () => {
      invalidateQueries.bankTransactions();
      invalidateQueries.bankAccounts();
    },
  });
};

export const useUpdateBankTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BankTransaction> }) =>
      txApi.update(id, data) as Promise<BankTransaction>,
    onSuccess: (_: unknown, { id }: { id: string }) => {
      invalidateQueries.bankTransactions();
      invalidateQueries.bankAccounts();
      queryClient.invalidateQueries({ queryKey: queryKeys.treasury.bankTransactions.detail(id) });
    },
  });
};

export const useDeleteBankTransaction = () => {
  return useMutation({
    mutationFn: (id: string) => txApi.delete(id) as Promise<void>,
    onSuccess: () => {
      invalidateQueries.bankTransactions();
      invalidateQueries.bankAccounts();
    },
  });
};

export const useReconcileTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ecritureId }: { id: string; ecritureId: string }) =>
      txApi.reconcile(id, ecritureId) as Promise<BankTransaction>,
    onSuccess: (_: unknown, { id }: { id: string }) => {
      invalidateQueries.bankTransactions();
      queryClient.invalidateQueries({ queryKey: queryKeys.treasury.bankTransactions.detail(id) });
    },
  });
};

export const useUnreconcileTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => txApi.unreconcile(id) as Promise<BankTransaction>,
    onSuccess: (_: unknown, id: string) => {
      invalidateQueries.bankTransactions();
      queryClient.invalidateQueries({ queryKey: queryKeys.treasury.bankTransactions.detail(id) });
    },
  });
};

export const useLetterTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => txApi.letterTransaction(id) as Promise<BankTransaction>,
    onSuccess: (_: unknown, id: string) => {
      invalidateQueries.bankTransactions();
      queryClient.invalidateQueries({ queryKey: queryKeys.treasury.bankTransactions.detail(id) });
    },
  });
};

export const useImportBankStatement = () => {
  return useMutation({
    mutationFn: ({
      file,
      compteId,
      format,
      onProgress,
    }: {
      file: File;
      compteId: string;
      format: 'ofx' | 'qif' | 'csv';
      onProgress?: (progress: number) => void;
    }) => txApi.importBankStatement(file, compteId, format, onProgress) as Promise<unknown>,
    onSuccess: () => {
      invalidateQueries.bankTransactions();
      invalidateQueries.bankAccounts();
    },
  });
};

export const useCreateTransactionWithAccounting = () => {
  return useMutation({
    mutationFn: (data: Partial<BankTransaction>) =>
      txApi.createWithAccounting(data) as Promise<BankTransaction>,
    onSuccess: () => {
      invalidateQueries.bankTransactions();
      invalidateQueries.bankAccounts();
      invalidateQueries.accountingEntries();
    },
  });
};

/**
 * ========================================
 * RAPPORTS TRESORERIE (TREASURY REPORTS)
 * ========================================
 */

export const useTreasuryPosition = (params?: { date?: string; devise?: string }) => {
  return useQuery({
    queryKey: queryKeys.treasury.reports.position(params),
    queryFn: () => reportsApi.generateTreasuryPosition(params) as Promise<unknown>,
  });
};

export const useCashFlowForecast = (params: {
  date_debut: string;
  date_fin: string;
  compte_bancaire?: string;
}) => {
  return useQuery({
    queryKey: queryKeys.treasury.reports.forecast(params),
    queryFn: () => reportsApi.generateCashFlowForecast(params) as Promise<unknown>,
    enabled: !!(params.date_debut && params.date_fin),
  });
};

export const useCashFlow = (params: {
  date_debut: string;
  date_fin: string;
  compte_bancaire?: string;
}) => {
  return useQuery({
    queryKey: queryKeys.treasury.reports.cashFlow(params),
    queryFn: () => reportsApi.generateCashFlow(params) as Promise<unknown>,
    enabled: !!(params.date_debut && params.date_fin),
  });
};

export const useReconciliationReport = (params: {
  compte_bancaire: string;
  date_debut: string;
  date_fin: string;
}) => {
  return useQuery({
    queryKey: ['treasuryReports', 'reconciliation', params],
    queryFn: () => reportsApi.generateReconciliationReport(params) as Promise<unknown>,
    enabled: !!(params.compte_bancaire && params.date_debut && params.date_fin),
  });
};
