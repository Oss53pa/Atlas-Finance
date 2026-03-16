// @ts-nocheck
/**
 * HOOKS REACT QUERY - TIERS
 *
 * Hooks pour la gestion des tiers (clients/fournisseurs) avec React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidateQueries } from '../lib/react-query';
import {
  thirdPartyService,
  contactsService,
  thirdPartyReportsService,
} from '../services/thirdparty-complete.service';
import type {
  ThirdParty,
  Contact,
  ThirdPartyQueryParams,
} from '../services/thirdparty-complete.service';

// Cast services to access extended API methods
const tpApi = thirdPartyService as Record<string, (...args: unknown[]) => Promise<unknown>>;
const contactsApi = contactsService as Record<string, (...args: unknown[]) => Promise<unknown>>;
const reportsApi = thirdPartyReportsService as Record<string, (...args: unknown[]) => Promise<unknown>>;

interface QueryParams {
  page?: number;
  page_size?: number;
  [key: string]: unknown;
}

/**
 * ========================================
 * TIERS (THIRD PARTY)
 * ========================================
 */

export const useThirdParties = (params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.thirdParty.thirdParties.list(params),
    queryFn: () => thirdPartyService.getAll(params as ThirdPartyQueryParams),
  });
};

export const useThirdParty = (id: string) => {
  return useQuery({
    queryKey: queryKeys.thirdParty.thirdParties.detail(id),
    queryFn: () => thirdPartyService.getById(id),
    enabled: !!id,
  });
};

export const useClients = (params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.thirdParty.thirdParties.clients(params),
    queryFn: () => thirdPartyService.getCustomers(params as Omit<ThirdPartyQueryParams, 'type'>),
  });
};

export const useSuppliers = (params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.thirdParty.thirdParties.suppliers(params),
    queryFn: () => thirdPartyService.getSuppliers(params as Omit<ThirdPartyQueryParams, 'type'>),
  });
};

export const useClientSuppliers = (params?: QueryParams) => {
  return useQuery({
    queryKey: ['thirdParties', 'clientSuppliers', params],
    queryFn: () => tpApi.getClientSuppliers(params) as Promise<unknown>,
  });
};

export const useActiveThirdParties = (type?: string) => {
  return useQuery({
    queryKey: ['thirdParties', 'active', type],
    queryFn: () => tpApi.getActiveThirdParties(type) as Promise<ThirdParty[]>,
  });
};

export const useThirdPartyBalance = (id: string, dateDebut?: string, dateFin?: string) => {
  return useQuery({
    queryKey: queryKeys.thirdParty.thirdParties.balance(id, dateDebut, dateFin),
    queryFn: () => tpApi.getBalance(id, dateDebut, dateFin) as Promise<unknown>,
    enabled: !!id,
  });
};

export const useThirdPartyContacts = (tiersId: string) => {
  return useQuery({
    queryKey: queryKeys.thirdParty.contacts.byThirdParty(tiersId),
    queryFn: () => contactsService.getAll(tiersId),
    enabled: !!tiersId,
  });
};

export const useThirdPartyAccountingEntries = (
  tiersId: string,
  params?: {
    date_debut?: string;
    date_fin?: string;
    statut?: string;
  }
) => {
  return useQuery({
    queryKey: ['thirdParties', 'entries', tiersId, params],
    queryFn: () => tpApi.getAccountingEntries(tiersId, params) as Promise<unknown>,
    enabled: !!tiersId,
  });
};

export const useThirdPartyInvoices = (
  tiersId: string,
  params?: {
    date_debut?: string;
    date_fin?: string;
    statut?: string;
    type?: 'vente' | 'achat';
  }
) => {
  return useQuery({
    queryKey: ['thirdParties', 'invoices', tiersId, params],
    queryFn: () => tpApi.getInvoices(tiersId, params) as Promise<unknown>,
    enabled: !!tiersId,
  });
};

export const useClientReceivables = (clientId: string) => {
  return useQuery({
    queryKey: ['thirdParties', 'receivables', clientId],
    queryFn: () => tpApi.getReceivables(clientId) as Promise<unknown>,
    enabled: !!clientId,
  });
};

export const useSupplierPayables = (supplierId: string) => {
  return useQuery({
    queryKey: ['thirdParties', 'payables', supplierId],
    queryFn: () => tpApi.getPayables(supplierId) as Promise<unknown>,
    enabled: !!supplierId,
  });
};

export const useCreateThirdParty = () => {
  return useMutation({
    mutationFn: (data: Partial<ThirdParty>) => tpApi.create(data) as Promise<ThirdParty>,
    onSuccess: () => {
      invalidateQueries.thirdParties();
    },
  });
};

export const useUpdateThirdParty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ThirdParty> }) =>
      thirdPartyService.update(id, data),
    onSuccess: (_: unknown, { id }: { id: string }) => {
      invalidateQueries.thirdParties();
      queryClient.invalidateQueries({ queryKey: queryKeys.thirdParty.thirdParties.detail(id) });
    },
  });
};

export const useDeleteThirdParty = () => {
  return useMutation({
    mutationFn: (id: string) => thirdPartyService.delete(id),
    onSuccess: () => {
      invalidateQueries.thirdParties();
    },
  });
};

export const useMergeThirdParties = () => {
  return useMutation({
    mutationFn: ({ sourceId, targetId }: { sourceId: string; targetId: string }) =>
      tpApi.mergeThirdParties(sourceId, targetId) as Promise<unknown>,
    onSuccess: () => {
      invalidateQueries.thirdParties();
    },
  });
};

export const useArchiveThirdParty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tpApi.archive(id) as Promise<ThirdParty>,
    onSuccess: (_: unknown, id: string) => {
      invalidateQueries.thirdParties();
      queryClient.invalidateQueries({ queryKey: queryKeys.thirdParty.thirdParties.detail(id) });
    },
  });
};

export const useUnarchiveThirdParty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tpApi.unarchive(id) as Promise<ThirdParty>,
    onSuccess: (_: unknown, id: string) => {
      invalidateQueries.thirdParties();
      queryClient.invalidateQueries({ queryKey: queryKeys.thirdParty.thirdParties.detail(id) });
    },
  });
};

export const useImportThirdParties = () => {
  return useMutation({
    mutationFn: ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress?: (progress: number) => void;
    }) => tpApi.importThirdParties(file, onProgress) as Promise<unknown>,
    onSuccess: () => {
      invalidateQueries.thirdParties();
    },
  });
};

/**
 * ========================================
 * CONTACTS
 * ========================================
 */

export const useContacts = (params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.thirdParty.contacts.list(params),
    queryFn: () => contactsApi.getAll(params) as Promise<Contact[]>,
  });
};

export const useContact = (id: string) => {
  return useQuery({
    queryKey: queryKeys.thirdParty.contacts.detail(id),
    queryFn: () => contactsApi.getById(id) as Promise<Contact | null>,
    enabled: !!id,
  });
};

export const useContactsByThirdParty = (tiersId: string, _params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.thirdParty.contacts.byThirdParty(tiersId),
    queryFn: () => contactsService.getAll(tiersId),
    enabled: !!tiersId,
  });
};

export const usePrincipalContact = (tiersId: string) => {
  return useQuery({
    queryKey: ['contacts', 'principal', tiersId],
    queryFn: () => contactsApi.getPrincipalContact(tiersId) as Promise<Contact | null>,
    enabled: !!tiersId,
  });
};

export const useActiveContacts = (tiersId?: string) => {
  return useQuery({
    queryKey: ['contacts', 'active', tiersId],
    queryFn: () => contactsApi.getActiveContacts(tiersId) as Promise<Contact[]>,
  });
};

export const useCreateContact = () => {
  return useMutation({
    mutationFn: (data: Partial<Contact>) => contactsApi.create(data) as Promise<Contact>,
    onSuccess: () => {
      invalidateQueries.contacts();
    },
  });
};

export const useUpdateContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Contact> }) =>
      contactsApi.update(id, data) as Promise<Contact>,
    onSuccess: (_: unknown, { id }: { id: string }) => {
      invalidateQueries.contacts();
      queryClient.invalidateQueries({ queryKey: queryKeys.thirdParty.contacts.detail(id) });
    },
  });
};

export const useDeleteContact = () => {
  return useMutation({
    mutationFn: (id: string) => contactsApi.delete(id) as Promise<void>,
    onSuccess: () => {
      invalidateQueries.contacts();
    },
  });
};

export const useSetContactAsPrincipal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => contactsApi.setAsPrincipal(id) as Promise<Contact & { tiers?: string }>,
    onSuccess: (data: Contact & { tiers?: string }, id: string) => {
      invalidateQueries.contacts();
      queryClient.invalidateQueries({ queryKey: queryKeys.thirdParty.contacts.detail(id) });
      if (data?.tiers) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.thirdParty.contacts.byThirdParty(data.tiers),
        });
      }
    },
  });
};

/**
 * ========================================
 * RAPPORTS TIERS (THIRD PARTY REPORTS)
 * ========================================
 */

export const useCustomersReport = (params?: { date_debut?: string; date_fin?: string }) => {
  return useQuery({
    queryKey: ['thirdPartyReports', 'customers', params],
    queryFn: () => reportsApi.generateCustomersReport(params) as Promise<unknown>,
  });
};

export const useSuppliersReport = (params?: { date_debut?: string; date_fin?: string }) => {
  return useQuery({
    queryKey: ['thirdPartyReports', 'suppliers', params],
    queryFn: () => reportsApi.generateSuppliersReport(params) as Promise<unknown>,
  });
};

export const useAgedReceivables = (params?: { date?: string }) => {
  return useQuery({
    queryKey: ['thirdPartyReports', 'agedReceivables', params],
    queryFn: () => reportsApi.generateAgedReceivables(params) as Promise<unknown>,
  });
};

export const useAgedPayables = (params?: { date?: string }) => {
  return useQuery({
    queryKey: ['thirdPartyReports', 'agedPayables', params],
    queryFn: () => reportsApi.generateAgedPayables(params) as Promise<unknown>,
  });
};

export const useAccountStatement = (params: {
  tiers: string;
  date_debut: string;
  date_fin: string;
}) => {
  return useQuery({
    queryKey: ['thirdPartyReports', 'accountStatement', params],
    queryFn: () => reportsApi.generateAccountStatement(params) as Promise<unknown>,
    enabled: !!(params.tiers && params.date_debut && params.date_fin),
  });
};
