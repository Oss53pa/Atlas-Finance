/**
 * HOOKS REACT QUERY - COMPTABILITÉ
 *
 * Hooks pour la gestion de la comptabilité avec React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidateQueries } from '../lib/react-query';
import {
  chartOfAccountsService,
  journalsService,
  accountingEntriesService,
  entryLinesService,
  accountingReportsService,
} from '../services/accounting-complete.service';
import type {
  ChartOfAccount,
  Journal,
  AccountingEntry,
  AccountingEntryLine,
  CreateAccountingEntryDto,
  UpdateAccountingEntryDto,
  AccountingQueryParams,
  BalanceResponse,
  QueryParams,
} from '../types/api.types';

/**
 * ========================================
 * PLAN COMPTABLE (CHART OF ACCOUNTS)
 * ========================================
 */

export const useChartOfAccounts = (params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.accounting.chartOfAccounts.list(params),
    queryFn: () => chartOfAccountsService.getAll(params),
  });
};

export const useChartOfAccount = (id: string) => {
  return useQuery({
    queryKey: queryKeys.accounting.chartOfAccounts.detail(id),
    queryFn: () => chartOfAccountsService.getById(id),
    enabled: !!id,
  });
};

export const useDetailAccounts = () => {
  return useQuery({
    queryKey: queryKeys.accounting.chartOfAccounts.detail,
    queryFn: () => chartOfAccountsService.getDetailAccounts(),
  });
};

export const useAccountsByClass = (classe: string) => {
  return useQuery({
    queryKey: queryKeys.accounting.chartOfAccounts.byClass(classe),
    queryFn: () => chartOfAccountsService.getByClass(classe),
    enabled: !!classe,
  });
};

export const useAccountsHierarchy = () => {
  return useQuery({
    queryKey: queryKeys.accounting.chartOfAccounts.hierarchy,
    queryFn: () => chartOfAccountsService.getHierarchy(),
  });
};

export const useCreateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<ChartOfAccount>) => chartOfAccountsService.create(data),
    onSuccess: () => {
      invalidateQueries.chartOfAccounts();
    },
  });
};

export const useUpdateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ChartOfAccount> }) =>
      chartOfAccountsService.update(id, data),
    onSuccess: (_, { id }) => {
      invalidateQueries.chartOfAccounts();
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.chartOfAccounts.detail(id) });
    },
  });
};

export const useDeleteAccount = () => {
  return useMutation({
    mutationFn: (id: string) => chartOfAccountsService.delete(id),
    onSuccess: () => {
      invalidateQueries.chartOfAccounts();
    },
  });
};

export const useImportSYSCOHADA = () => {
  return useMutation({
    mutationFn: () => chartOfAccountsService.importSYSCOHADA(),
    onSuccess: () => {
      invalidateQueries.chartOfAccounts();
    },
  });
};

/**
 * ========================================
 * JOURNAUX (JOURNALS)
 * ========================================
 */

export const useJournals = (params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.accounting.journals.list(params),
    queryFn: () => journalsService.getAll(params),
  });
};

export const useJournal = (id: string) => {
  return useQuery({
    queryKey: queryKeys.accounting.journals.detail(id),
    queryFn: () => journalsService.getById(id),
    enabled: !!id,
  });
};

export const useActiveJournals = () => {
  return useQuery({
    queryKey: queryKeys.accounting.journals.active,
    queryFn: () => journalsService.getActiveJournals(),
  });
};

export const useJournalsByType = (type: string) => {
  return useQuery({
    queryKey: queryKeys.accounting.journals.byType(type),
    queryFn: () => journalsService.getByType(type),
    enabled: !!type,
  });
};

export const useCreateJournal = () => {
  return useMutation({
    mutationFn: (data: Partial<Journal>) => journalsService.create(data),
    onSuccess: () => {
      invalidateQueries.journals();
    },
  });
};

export const useUpdateJournal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Journal> }) =>
      journalsService.update(id, data),
    onSuccess: (_, { id }) => {
      invalidateQueries.journals();
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.journals.detail(id) });
    },
  });
};

export const useDeleteJournal = () => {
  return useMutation({
    mutationFn: (id: string) => journalsService.delete(id),
    onSuccess: () => {
      invalidateQueries.journals();
    },
  });
};

/**
 * ========================================
 * ÉCRITURES COMPTABLES (ACCOUNTING ENTRIES)
 * ========================================
 */

export const useAccountingEntries = (params?: AccountingQueryParams) => {
  return useQuery({
    queryKey: queryKeys.accounting.entries.list(params),
    queryFn: () => accountingEntriesService.getAll(params),
  });
};

export const useAccountingEntry = (id: string) => {
  return useQuery({
    queryKey: queryKeys.accounting.entries.detail(id),
    queryFn: () => accountingEntriesService.getById(id),
    enabled: !!id,
  });
};

export const useEntriesByJournal = (journalId: string, params?: AccountingQueryParams) => {
  return useQuery({
    queryKey: queryKeys.accounting.entries.byJournal(journalId),
    queryFn: () => accountingEntriesService.getByJournal(journalId, params),
    enabled: !!journalId,
  });
};

export const useEntriesByPeriod = (dateDebut: string, dateFin: string, params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.accounting.entries.byPeriod(dateDebut, dateFin),
    queryFn: () => accountingEntriesService.getByPeriod(dateDebut, dateFin, params),
    enabled: !!(dateDebut && dateFin),
  });
};

export const useEntriesByStatus = (statut: string, params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.accounting.entries.byStatus(statut),
    queryFn: () => accountingEntriesService.getByStatus(statut, params),
    enabled: !!statut,
  });
};

export const useCreateAccountingEntry = () => {
  return useMutation({
    mutationFn: (data: CreateAccountingEntryDto) => accountingEntriesService.create(data),
    onSuccess: () => {
      invalidateQueries.accountingEntries();
    },
  });
};

export const useUpdateAccountingEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAccountingEntryDto }) =>
      accountingEntriesService.update(id, data),
    onSuccess: (_, { id }) => {
      invalidateQueries.accountingEntries();
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.entries.detail(id) });
    },
  });
};

export const useDeleteAccountingEntry = () => {
  return useMutation({
    mutationFn: (id: string) => accountingEntriesService.delete(id),
    onSuccess: () => {
      invalidateQueries.accountingEntries();
    },
  });
};

export const useValidateEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => accountingEntriesService.validate(id),
    onSuccess: (_, id) => {
      invalidateQueries.accountingEntries();
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.entries.detail(id) });
    },
  });
};

export const useReverseEntry = () => {
  return useMutation({
    mutationFn: ({ id, date, pieceNumber }: { id: string; date: string; pieceNumber?: string }) =>
      accountingEntriesService.reverse(id, date, pieceNumber),
    onSuccess: () => {
      invalidateQueries.accountingEntries();
    },
  });
};

export const useReconcileEntries = () => {
  return useMutation({
    mutationFn: (entryIds: string[]) => accountingEntriesService.reconcile(entryIds),
    onSuccess: () => {
      invalidateQueries.accountingEntries();
    },
  });
};

export const useUnreconcileEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => accountingEntriesService.unreconcile(id),
    onSuccess: (_, id) => {
      invalidateQueries.accountingEntries();
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.entries.detail(id) });
    },
  });
};

export const useDuplicateEntry = () => {
  return useMutation({
    mutationFn: ({ id, newDate }: { id: string; newDate?: string }) =>
      accountingEntriesService.duplicate(id, newDate),
    onSuccess: () => {
      invalidateQueries.accountingEntries();
    },
  });
};

export const useNextPieceNumber = (journalCode: string) => {
  return useQuery({
    queryKey: ['nextPieceNumber', journalCode],
    queryFn: () => accountingEntriesService.getNextPieceNumber(journalCode),
    enabled: !!journalCode,
  });
};

export const useImportEntries = () => {
  return useMutation({
    mutationFn: ({
      file,
      journalId,
      onProgress,
    }: {
      file: File;
      journalId: string;
      onProgress?: (progress: number) => void;
    }) => accountingEntriesService.importEntries(file, journalId, onProgress),
    onSuccess: () => {
      invalidateQueries.accountingEntries();
    },
  });
};

/**
 * ========================================
 * LIGNES D'ÉCRITURE (ENTRY LINES)
 * ========================================
 */

export const useEntryLines = (entryId: string) => {
  return useQuery({
    queryKey: ['entryLines', entryId],
    queryFn: () => entryLinesService.getByEntry(entryId),
    enabled: !!entryId,
  });
};

export const useLinesByAccount = (accountId: string, params?: QueryParams) => {
  return useQuery({
    queryKey: ['entryLines', 'byAccount', accountId, params],
    queryFn: () => entryLinesService.getByAccount(accountId, params),
    enabled: !!accountId,
  });
};

export const useLinesByThirdParty = (tiersId: string, params?: QueryParams) => {
  return useQuery({
    queryKey: ['entryLines', 'byThirdParty', tiersId, params],
    queryFn: () => entryLinesService.getByThirdParty(tiersId, params),
    enabled: !!tiersId,
  });
};

/**
 * ========================================
 * RAPPORTS COMPTABLES (ACCOUNTING REPORTS)
 * ========================================
 */

export const useBalance = (params: AccountingQueryParams) => {
  return useQuery({
    queryKey: queryKeys.accounting.reports.balance(params),
    queryFn: () => accountingReportsService.generateBalance(params),
    enabled: !!(params.exercice || (params.date_debut && params.date_fin)),
  });
};

export const useGeneralLedger = (params: AccountingQueryParams) => {
  return useQuery({
    queryKey: queryKeys.accounting.reports.generalLedger(params),
    queryFn: () => accountingReportsService.generateGeneralLedger(params),
    enabled: !!(params.exercice || (params.date_debut && params.date_fin)),
  });
};

export const useJournalReport = (journalCode: string, params: AccountingQueryParams) => {
  return useQuery({
    queryKey: queryKeys.accounting.reports.journal(journalCode, params),
    queryFn: () => accountingReportsService.generateJournal(journalCode, params),
    enabled: !!(journalCode && (params.exercice || (params.date_debut && params.date_fin))),
  });
};