/**
 * CONFIGURATION REACT QUERY
 *
 * Configuration optimale pour caching, refetching et gestion d'erreurs
 */

import { QueryClient, DefaultOptions } from '@tanstack/react-query';

/**
 * Options par défaut pour toutes les queries et mutations
 */
const defaultOptions: DefaultOptions = {
  queries: {
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
  },
  mutations: {
    retry: 0,
  },
};

/**
 * Instance du QueryClient
 */
export const queryClient = new QueryClient({
  defaultOptions,
});

/**
 * QUERY KEYS - Clés standardisées pour le cache
 */
export const queryKeys = {
  core: {
    companies: {
      all: ['companies'] as const,
      list: (params?: any) => ['companies', 'list', params] as const,
      detail: (id: string) => ['companies', 'detail', id] as const,
      active: ['companies', 'active'] as const,
    },
    fiscalYears: {
      all: ['fiscalYears'] as const,
      list: (params?: any) => ['fiscalYears', 'list', params] as const,
      detail: (id: string) => ['fiscalYears', 'detail', id] as const,
      active: (societeId?: string) => ['fiscalYears', 'active', societeId] as const,
      byCompany: (societeId: string) => ['fiscalYears', 'byCompany', societeId] as const,
    },
    currencies: {
      all: ['currencies'] as const,
      list: (params?: any) => ['currencies', 'list', params] as const,
      detail: (id: string) => ['currencies', 'detail', id] as const,
      active: ['currencies', 'active'] as const,
      reference: ['currencies', 'reference'] as const,
    },
  },

  accounting: {
    chartOfAccounts: {
      all: ['chartOfAccounts'] as const,
      list: (params?: any) => ['chartOfAccounts', 'list', params] as const,
      detail: (id: string) => ['chartOfAccounts', 'detail', id] as const,
      byClass: (classe: string) => ['chartOfAccounts', 'byClass', classe] as const,
      hierarchy: ['chartOfAccounts', 'hierarchy'] as const,
    },
    journals: {
      all: ['journals'] as const,
      list: (params?: any) => ['journals', 'list', params] as const,
      detail: (id: string) => ['journals', 'detail', id] as const,
      active: ['journals', 'active'] as const,
      byType: (type: string) => ['journals', 'byType', type] as const,
    },
    entries: {
      all: ['accountingEntries'] as const,
      list: (params?: any) => ['accountingEntries', 'list', params] as const,
      detail: (id: string) => ['accountingEntries', 'detail', id] as const,
      byJournal: (journalId: string) => ['accountingEntries', 'byJournal', journalId] as const,
      byPeriod: (dateDebut: string, dateFin: string) =>
        ['accountingEntries', 'byPeriod', dateDebut, dateFin] as const,
      byStatus: (statut: string) => ['accountingEntries', 'byStatus', statut] as const,
    },
    reports: {
      balance: (params?: any) => ['accounting', 'reports', 'balance', params] as const,
      generalLedger: (params?: any) =>
        ['accounting', 'reports', 'generalLedger', params] as const,
      journal: (journalCode: string, params?: any) =>
        ['accounting', 'reports', 'journal', journalCode, params] as const,
    },
  },

  treasury: {
    bankAccounts: {
      all: ['bankAccounts'] as const,
      list: (params?: any) => ['bankAccounts', 'list', params] as const,
      detail: (id: string) => ['bankAccounts', 'detail', id] as const,
      active: ['bankAccounts', 'active'] as const,
      balance: (id: string, date?: string) =>
        ['bankAccounts', 'balance', id, date] as const,
      transactions: (id: string, params?: any) =>
        ['bankAccounts', 'transactions', id, params] as const,
    },
    bankTransactions: {
      all: ['bankTransactions'] as const,
      list: (params?: any) => ['bankTransactions', 'list', params] as const,
      detail: (id: string) => ['bankTransactions', 'detail', id] as const,
      byAccount: (compteId: string) => ['bankTransactions', 'byAccount', compteId] as const,
      unreconciled: (compteId?: string) =>
        ['bankTransactions', 'unreconciled', compteId] as const,
    },
    reports: {
      position: (params?: any) => ['treasury', 'reports', 'position', params] as const,
      forecast: (params?: any) => ['treasury', 'reports', 'forecast', params] as const,
      cashFlow: (params?: any) => ['treasury', 'reports', 'cashFlow', params] as const,
    },
  },

  assets: {
    fixedAssets: {
      all: ['fixedAssets'] as const,
      list: (params?: any) => ['fixedAssets', 'list', params] as const,
      detail: (id: string) => ['fixedAssets', 'detail', id] as const,
      active: ['fixedAssets', 'active'] as const,
      byCategory: (categorie: string) => ['fixedAssets', 'byCategory', categorie] as const,
      depreciationPlan: (id: string) => ['fixedAssets', 'depreciationPlan', id] as const,
    },
    depreciations: {
      all: ['depreciations'] as const,
      list: (params?: any) => ['depreciations', 'list', params] as const,
      detail: (id: string) => ['depreciations', 'detail', id] as const,
      byAsset: (immobilisationId: string) =>
        ['depreciations', 'byAsset', immobilisationId] as const,
      unaccounted: ['depreciations', 'unaccounted'] as const,
    },
  },

  thirdParty: {
    thirdParties: {
      all: ['thirdParties'] as const,
      list: (params?: any) => ['thirdParties', 'list', params] as const,
      detail: (id: string) => ['thirdParties', 'detail', id] as const,
      clients: (params?: any) => ['thirdParties', 'clients', params] as const,
      suppliers: (params?: any) => ['thirdParties', 'suppliers', params] as const,
      balance: (id: string, dateDebut?: string, dateFin?: string) =>
        ['thirdParties', 'balance', id, dateDebut, dateFin] as const,
    },
    contacts: {
      all: ['contacts'] as const,
      list: (params?: any) => ['contacts', 'list', params] as const,
      detail: (id: string) => ['contacts', 'detail', id] as const,
      byThirdParty: (tiersId: string) => ['contacts', 'byThirdParty', tiersId] as const,
    },
  },

  budgets: {
    budgets: {
      all: ['budgets'] as const,
      list: (params?: any) => ['budgets', 'list', params] as const,
      detail: (id: string) => ['budgets', 'detail', id] as const,
      active: (exerciceId?: string) => ['budgets', 'active', exerciceId] as const,
      controls: (id: string) => ['budgets', 'controls', id] as const,
    },
    controls: {
      all: ['budgetControls'] as const,
      list: (params?: any) => ['budgetControls', 'list', params] as const,
      overruns: (budgetId?: string) => ['budgetControls', 'overruns', budgetId] as const,
    },
  },

  analytics: {
    axes: {
      all: ['analyticalAxes'] as const,
      list: (params?: any) => ['analyticalAxes', 'list', params] as const,
      detail: (id: string) => ['analyticalAxes', 'detail', id] as const,
      active: ['analyticalAxes', 'active'] as const,
    },
    centers: {
      all: ['analyticalCenters'] as const,
      list: (params?: any) => ['analyticalCenters', 'list', params] as const,
      detail: (id: string) => ['analyticalCenters', 'detail', id] as const,
      byAxis: (axeId: string) => ['analyticalCenters', 'byAxis', axeId] as const,
      hierarchy: (axeId?: string) => ['analyticalCenters', 'hierarchy', axeId] as const,
    },
  },

  taxation: {
    declarations: {
      all: ['taxDeclarations'] as const,
      list: (params?: any) => ['taxDeclarations', 'list', params] as const,
      detail: (id: string) => ['taxDeclarations', 'detail', id] as const,
      overdue: ['taxDeclarations', 'overdue'] as const,
      upcoming: (jours?: number) => ['taxDeclarations', 'upcoming', jours] as const,
      calendar: (params?: any) => ['taxDeclarations', 'calendar', params] as const,
    },
  },

  system: {
    info: () => ['system', 'info'] as const,
    stats: () => ['system', 'stats'] as const,
    modules: () => ['system', 'modules'] as const,
  },

  workspace: {
    byRole: (role: string) => ['workspace', 'byRole', role] as const,
  },
};

/**
 * UTILITAIRES POUR INVALIDATION DU CACHE
 */
export const invalidateQueries = {
  companies: () => queryClient.invalidateQueries({ queryKey: queryKeys.core.companies.all }),
  fiscalYears: () => queryClient.invalidateQueries({ queryKey: queryKeys.core.fiscalYears.all }),
  currencies: () => queryClient.invalidateQueries({ queryKey: queryKeys.core.currencies.all }),

  chartOfAccounts: () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.accounting.chartOfAccounts.all }),
  journals: () => queryClient.invalidateQueries({ queryKey: queryKeys.accounting.journals.all }),
  accountingEntries: () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.accounting.entries.all }),

  bankAccounts: () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.treasury.bankAccounts.all }),
  bankTransactions: () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.treasury.bankTransactions.all }),

  fixedAssets: () => queryClient.invalidateQueries({ queryKey: queryKeys.assets.fixedAssets.all }),
  depreciations: () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.assets.depreciations.all }),

  thirdParties: () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.thirdParty.thirdParties.all }),
  contacts: () => queryClient.invalidateQueries({ queryKey: queryKeys.thirdParty.contacts.all }),

  budgets: () => queryClient.invalidateQueries({ queryKey: queryKeys.budgets.budgets.all }),
  budgetControls: () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.budgets.controls.all }),

  analyticalAxes: () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.analytics.axes.all }),
  analyticalCenters: () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.analytics.centers.all }),

  taxDeclarations: () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.taxation.declarations.all }),
};