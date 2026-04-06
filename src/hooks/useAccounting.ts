// @ts-nocheck

/**
 * HOOKS REACT QUERY - COMPTABILITE
 *
 * Hooks pour la gestion de la comptabilite avec React Query
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
  AccountingEntryCreateData,
  AccountingQueryParams as ServiceAccountingQueryParams,
  BalanceQueryParams,
  BalanceResponse,
} from '../services/accounting-complete.service';

// Cast services to access extended API methods
const coaApi = chartOfAccountsService as Record<string, (...args: unknown[]) => Promise<unknown>>;
const journalsApi = journalsService as Record<string, (...args: unknown[]) => Promise<unknown>>;
const entriesApi = accountingEntriesService as Record<string, (...args: unknown[]) => Promise<unknown>>;
const linesApi = entryLinesService as Record<string, (...args: unknown[]) => Promise<unknown>>;
const reportsApi = accountingReportsService as Record<string, (...args: unknown[]) => Promise<unknown>>;

interface QueryParams {
  page?: number;
  page_size?: number;
  [key: string]: unknown;
}

interface AccountingQueryParams {
  exercice?: string;
  journal?: string;
  compte?: string;
  date_debut?: string;
  date_fin?: string;
  statut?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
  search?: string;
}

/**
 * ========================================
 * PLAN COMPTABLE (CHART OF ACCOUNTS)
 * ========================================
 */

export const useChartOfAccounts = (params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.accounting.chartOfAccounts.list(params),
    queryFn: () => chartOfAccountsService.getAll(params as Parameters<typeof chartOfAccountsService.getAll>[0]),
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
    queryKey: ['chartOfAccounts', 'detail-accounts'],
    queryFn: () => coaApi.getDetailAccounts() as Promise<ChartOfAccount[]>,
  });
};

export const useAccountsByClass = (classe: string) => {
  return useQuery({
    queryKey: queryKeys.accounting.chartOfAccounts.byClass(classe),
    queryFn: () => coaApi.getByClass(classe) as Promise<ChartOfAccount[]>,
    enabled: !!classe,
  });
};

export const useAccountsHierarchy = () => {
  return useQuery({
    queryKey: queryKeys.accounting.chartOfAccounts.hierarchy,
    queryFn: () => chartOfAccountsService.getTree(),
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
    onSuccess: (_: unknown, { id }: { id: string }) => {
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
    mutationFn: () => coaApi.importSYSCOHADA() as Promise<unknown>,
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
    queryFn: () => journalsService.getAll(params as Parameters<typeof journalsService.getAll>[0]),
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
    queryFn: () => journalsApi.getActiveJournals() as Promise<Journal[]>,
  });
};

export const useJournalsByType = (type: string) => {
  return useQuery({
    queryKey: queryKeys.accounting.journals.byType(type),
    queryFn: () => journalsApi.getByType(type) as Promise<Journal[]>,
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
    onSuccess: (_: unknown, { id }: { id: string }) => {
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
 * ECRITURES COMPTABLES (ACCOUNTING ENTRIES)
 * ========================================
 */

export const useAccountingEntries = (params?: AccountingQueryParams) => {
  return useQuery({
    queryKey: queryKeys.accounting.entries.list(params),
    queryFn: () => accountingEntriesService.getAll(params as ServiceAccountingQueryParams),
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
    queryFn: () => entriesApi.getByJournal(journalId, params) as Promise<unknown>,
    enabled: !!journalId,
  });
};

export const useEntriesByPeriod = (dateDebut: string, dateFin: string, params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.accounting.entries.byPeriod(dateDebut, dateFin),
    queryFn: () => entriesApi.getByPeriod(dateDebut, dateFin, params) as Promise<unknown>,
    enabled: !!(dateDebut && dateFin),
  });
};

export const useEntriesByStatus = (statut: string, params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.accounting.entries.byStatus(statut),
    queryFn: () => entriesApi.getByStatus(statut, params) as Promise<unknown>,
    enabled: !!statut,
  });
};

export const useCreateAccountingEntry = () => {
  return useMutation({
    mutationFn: (data: AccountingEntryCreateData) => accountingEntriesService.create(data),
    onSuccess: () => {
      invalidateQueries.accountingEntries();
    },
  });
};

export const useUpdateAccountingEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AccountingEntryCreateData }) =>
      accountingEntriesService.update(id, data),
    onSuccess: (_: unknown, { id }: { id: string }) => {
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
    onSuccess: (_: unknown, id: string) => {
      invalidateQueries.accountingEntries();
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.entries.detail(id) });
    },
  });
};

export const useReverseEntry = () => {
  return useMutation({
    mutationFn: ({ id, date, pieceNumber }: { id: string; date: string; pieceNumber?: string }) =>
      entriesApi.reverse(id, date, pieceNumber) as Promise<AccountingEntry>,
    onSuccess: () => {
      invalidateQueries.accountingEntries();
    },
  });
};

export const useReconcileEntries = () => {
  return useMutation({
    mutationFn: (entryIds: string[]) => entriesApi.reconcile(entryIds) as Promise<unknown>,
    onSuccess: () => {
      invalidateQueries.accountingEntries();
    },
  });
};

export const useUnreconcileEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => entriesApi.unreconcile(id) as Promise<AccountingEntry>,
    onSuccess: (_: unknown, id: string) => {
      invalidateQueries.accountingEntries();
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.entries.detail(id) });
    },
  });
};

export const useDuplicateEntry = () => {
  return useMutation({
    mutationFn: ({ id, newDate }: { id: string; newDate?: string }) =>
      entriesApi.duplicate(id, newDate) as Promise<AccountingEntry>,
    onSuccess: () => {
      invalidateQueries.accountingEntries();
    },
  });
};

export const useNextPieceNumber = (journalCode: string) => {
  return useQuery({
    queryKey: ['nextPieceNumber', journalCode],
    queryFn: () => entriesApi.getNextPieceNumber(journalCode) as Promise<string>,
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
    }) => entriesApi.importEntries(file, journalId, onProgress) as Promise<unknown>,
    onSuccess: () => {
      invalidateQueries.accountingEntries();
    },
  });
};

/**
 * ========================================
 * LIGNES D'ECRITURE (ENTRY LINES)
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
    queryFn: () => linesApi.getByAccount(accountId, params) as Promise<AccountingEntryLine[]>,
    enabled: !!accountId,
  });
};

export const useLinesByThirdParty = (tiersId: string, params?: QueryParams) => {
  return useQuery({
    queryKey: ['entryLines', 'byThirdParty', tiersId, params],
    queryFn: () => linesApi.getByThirdParty(tiersId, params) as Promise<AccountingEntryLine[]>,
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
    queryFn: () => accountingReportsService.getBalance(params as unknown as BalanceQueryParams),
    enabled: !!(params.exercice || (params.date_debut && params.date_fin)),
  });
};

export const useGeneralLedger = (params: AccountingQueryParams) => {
  return useQuery({
    queryKey: queryKeys.accounting.reports.generalLedger(params),
    queryFn: () => accountingReportsService.getGeneralLedger(params as unknown as BalanceQueryParams & { account_id?: string }),
    enabled: !!(params.exercice || (params.date_debut && params.date_fin)),
  });
};

export const useJournalReport = (journalCode: string, params: AccountingQueryParams) => {
  return useQuery({
    queryKey: queryKeys.accounting.reports.journal(journalCode, params),
    queryFn: () => reportsApi.generateJournal(journalCode, params) as Promise<unknown>,
    enabled: !!(journalCode && (params.exercice || (params.date_debut && params.date_fin))),
  });
};
