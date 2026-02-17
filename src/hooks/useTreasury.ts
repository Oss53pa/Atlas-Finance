/**
 * HOOKS REACT QUERY - TRÉSORERIE
 *
 * Hooks pour la gestion de la trésorerie avec React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidateQueries } from '../lib/react-query';
import {
  bankAccountsService,
  bankTransactionsService,
  treasuryReportsService,
} from '../services/treasury-complete.service';
import type { BankAccount, BankTransaction, TreasuryQueryParams, QueryParams } from '../types/api.types';

/**
 * ========================================
 * COMPTES BANCAIRES (BANK ACCOUNTS)
 * ========================================
 */

export const useBankAccounts = (params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.treasury.bankAccounts.list(params),
    queryFn: () => bankAccountsService.getAll(params),
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
    queryFn: () => bankAccountsService.getByCurrency(deviseId, params),
    enabled: !!deviseId,
  });
};

export const useBankAccountBalance = (accountId: string, date?: string) => {
  return useQuery({
    queryKey: queryKeys.treasury.bankAccounts.balance(accountId, date),
    queryFn: () => bankAccountsService.getBalanceAtDate(accountId, date || new Date().toISOString().split('T')[0]),
    enabled: !!accountId,
  });
};

export const useBankAccountBalanceHistory = (accountId: string, dateDebut: string, dateFin: string) => {
  return useQuery({
    queryKey: ['bankAccounts', 'balanceHistory', accountId, dateDebut, dateFin],
    queryFn: () => bankAccountsService.getBalanceHistory(accountId, dateDebut, dateFin),
    enabled: !!(accountId && dateDebut && dateFin),
  });
};

export const useBankAccountTransactions = (accountId: string, params?: TreasuryQueryParams) => {
  return useQuery({
    queryKey: queryKeys.treasury.bankAccounts.transactions(accountId, params),
    queryFn: () => bankAccountsService.getTransactions(accountId, params),
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
    onSuccess: (_, { id }) => {
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
      bankAccountsService.closeAccount(id, dateCloture),
    onSuccess: (_, { id }) => {
      invalidateQueries.bankAccounts();
      queryClient.invalidateQueries({ queryKey: queryKeys.treasury.bankAccounts.detail(id) });
    },
  });
};

export const useReopenBankAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => bankAccountsService.reopenAccount(id),
    onSuccess: (_, id) => {
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
    queryFn: () => bankTransactionsService.getAll(params),
  });
};

export const useBankTransaction = (id: string) => {
  return useQuery({
    queryKey: queryKeys.treasury.bankTransactions.detail(id),
    queryFn: () => bankTransactionsService.getById(id),
    enabled: !!id,
  });
};

export const useTransactionsByAccount = (compteId: string, params?: TreasuryQueryParams) => {
  return useQuery({
    queryKey: queryKeys.treasury.bankTransactions.byAccount(compteId),
    queryFn: () => bankTransactionsService.getByAccount(compteId, params),
    enabled: !!compteId,
  });
};

export const useTransactionsByPeriod = (dateDebut: string, dateFin: string, params?: QueryParams) => {
  return useQuery({
    queryKey: ['bankTransactions', 'byPeriod', dateDebut, dateFin, params],
    queryFn: () => bankTransactionsService.getByPeriod(dateDebut, dateFin, params),
    enabled: !!(dateDebut && dateFin),
  });
};

export const useTransactionsByStatus = (statut: string, params?: QueryParams) => {
  return useQuery({
    queryKey: ['bankTransactions', 'byStatus', statut, params],
    queryFn: () => bankTransactionsService.getByStatus(statut, params),
    enabled: !!statut,
  });
};

export const useUnreconciledTransactions = (compteId?: string) => {
  return useQuery({
    queryKey: queryKeys.treasury.bankTransactions.unreconciled(compteId),
    queryFn: () => bankTransactionsService.getUnreconciled(compteId),
  });
};

export const useCreateBankTransaction = () => {
  return useMutation({
    mutationFn: (data: Partial<BankTransaction>) => bankTransactionsService.create(data),
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
      bankTransactionsService.update(id, data),
    onSuccess: (_, { id }) => {
      invalidateQueries.bankTransactions();
      invalidateQueries.bankAccounts();
      queryClient.invalidateQueries({ queryKey: queryKeys.treasury.bankTransactions.detail(id) });
    },
  });
};

export const useDeleteBankTransaction = () => {
  return useMutation({
    mutationFn: (id: string) => bankTransactionsService.delete(id),
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
      bankTransactionsService.reconcile(id, ecritureId),
    onSuccess: (_, { id }) => {
      invalidateQueries.bankTransactions();
      queryClient.invalidateQueries({ queryKey: queryKeys.treasury.bankTransactions.detail(id) });
    },
  });
};

export const useUnreconcileTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => bankTransactionsService.unreconcile(id),
    onSuccess: (_, id) => {
      invalidateQueries.bankTransactions();
      queryClient.invalidateQueries({ queryKey: queryKeys.treasury.bankTransactions.detail(id) });
    },
  });
};

export const useLetterTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => bankTransactionsService.letterTransaction(id),
    onSuccess: (_, id) => {
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
    }) => bankTransactionsService.importBankStatement(file, compteId, format, onProgress),
    onSuccess: () => {
      invalidateQueries.bankTransactions();
      invalidateQueries.bankAccounts();
    },
  });
};

export const useCreateTransactionWithAccounting = () => {
  return useMutation({
    mutationFn: (data: Partial<BankTransaction>) =>
      bankTransactionsService.createWithAccounting(data),
    onSuccess: () => {
      invalidateQueries.bankTransactions();
      invalidateQueries.bankAccounts();
      invalidateQueries.accountingEntries();
    },
  });
};

/**
 * ========================================
 * RAPPORTS TRÉSORERIE (TREASURY REPORTS)
 * ========================================
 */

export const useTreasuryPosition = (params?: { date?: string; devise?: string }) => {
  return useQuery({
    queryKey: queryKeys.treasury.reports.position(params),
    queryFn: () => treasuryReportsService.generateTreasuryPosition(params),
  });
};

export const useCashFlowForecast = (params: {
  date_debut: string;
  date_fin: string;
  compte_bancaire?: string;
}) => {
  return useQuery({
    queryKey: queryKeys.treasury.reports.forecast(params),
    queryFn: () => treasuryReportsService.generateCashFlowForecast(params),
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
    queryFn: () => treasuryReportsService.generateCashFlow(params),
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
    queryFn: () => treasuryReportsService.generateReconciliationReport(params),
    enabled: !!(params.compte_bancaire && params.date_debut && params.date_fin),
  });
};