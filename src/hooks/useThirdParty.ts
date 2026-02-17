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
import type { ThirdParty, Contact, QueryParams } from '../types/api.types';

/**
 * ========================================
 * TIERS (THIRD PARTY)
 * ========================================
 */

export const useThirdParties = (params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.thirdParty.thirdParties.list(params),
    queryFn: () => thirdPartyService.getAll(params),
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
    queryFn: () => thirdPartyService.getClients(params),
  });
};

export const useSuppliers = (params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.thirdParty.thirdParties.suppliers(params),
    queryFn: () => thirdPartyService.getSuppliers(params),
  });
};

export const useClientSuppliers = (params?: QueryParams) => {
  return useQuery({
    queryKey: ['thirdParties', 'clientSuppliers', params],
    queryFn: () => thirdPartyService.getClientSuppliers(params),
  });
};

export const useActiveThirdParties = (type?: string) => {
  return useQuery({
    queryKey: ['thirdParties', 'active', type],
    queryFn: () => thirdPartyService.getActiveThirdParties(type),
  });
};

export const useThirdPartyBalance = (id: string, dateDebut?: string, dateFin?: string) => {
  return useQuery({
    queryKey: queryKeys.thirdParty.thirdParties.balance(id, dateDebut, dateFin),
    queryFn: () => thirdPartyService.getBalance(id, dateDebut, dateFin),
    enabled: !!id,
  });
};

export const useThirdPartyContacts = (tiersId: string) => {
  return useQuery({
    queryKey: queryKeys.thirdParty.contacts.byThirdParty(tiersId),
    queryFn: () => thirdPartyService.getContacts(tiersId),
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
    queryFn: () => thirdPartyService.getAccountingEntries(tiersId, params),
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
    queryFn: () => thirdPartyService.getInvoices(tiersId, params),
    enabled: !!tiersId,
  });
};

export const useClientReceivables = (clientId: string) => {
  return useQuery({
    queryKey: ['thirdParties', 'receivables', clientId],
    queryFn: () => thirdPartyService.getReceivables(clientId),
    enabled: !!clientId,
  });
};

export const useSupplierPayables = (supplierId: string) => {
  return useQuery({
    queryKey: ['thirdParties', 'payables', supplierId],
    queryFn: () => thirdPartyService.getPayables(supplierId),
    enabled: !!supplierId,
  });
};

export const useCreateThirdParty = () => {
  return useMutation({
    mutationFn: (data: Partial<ThirdParty>) => thirdPartyService.create(data),
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
    onSuccess: (_, { id }) => {
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
      thirdPartyService.mergeThirdParties(sourceId, targetId),
    onSuccess: () => {
      invalidateQueries.thirdParties();
    },
  });
};

export const useArchiveThirdParty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => thirdPartyService.archive(id),
    onSuccess: (_, id) => {
      invalidateQueries.thirdParties();
      queryClient.invalidateQueries({ queryKey: queryKeys.thirdParty.thirdParties.detail(id) });
    },
  });
};

export const useUnarchiveThirdParty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => thirdPartyService.unarchive(id),
    onSuccess: (_, id) => {
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
    }) => thirdPartyService.importThirdParties(file, onProgress),
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
    queryFn: () => contactsService.getAll(params),
  });
};

export const useContact = (id: string) => {
  return useQuery({
    queryKey: queryKeys.thirdParty.contacts.detail(id),
    queryFn: () => contactsService.getById(id),
    enabled: !!id,
  });
};

export const useContactsByThirdParty = (tiersId: string, params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.thirdParty.contacts.byThirdParty(tiersId),
    queryFn: () => contactsService.getByThirdParty(tiersId, params),
    enabled: !!tiersId,
  });
};

export const usePrincipalContact = (tiersId: string) => {
  return useQuery({
    queryKey: ['contacts', 'principal', tiersId],
    queryFn: () => contactsService.getPrincipalContact(tiersId),
    enabled: !!tiersId,
  });
};

export const useActiveContacts = (tiersId?: string) => {
  return useQuery({
    queryKey: ['contacts', 'active', tiersId],
    queryFn: () => contactsService.getActiveContacts(tiersId),
  });
};

export const useCreateContact = () => {
  return useMutation({
    mutationFn: (data: Partial<Contact>) => contactsService.create(data),
    onSuccess: () => {
      invalidateQueries.contacts();
    },
  });
};

export const useUpdateContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Contact> }) =>
      contactsService.update(id, data),
    onSuccess: (_, { id }) => {
      invalidateQueries.contacts();
      queryClient.invalidateQueries({ queryKey: queryKeys.thirdParty.contacts.detail(id) });
    },
  });
};

export const useDeleteContact = () => {
  return useMutation({
    mutationFn: (id: string) => contactsService.delete(id),
    onSuccess: () => {
      invalidateQueries.contacts();
    },
  });
};

export const useSetContactAsPrincipal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => contactsService.setAsPrincipal(id),
    onSuccess: (data, id) => {
      invalidateQueries.contacts();
      queryClient.invalidateQueries({ queryKey: queryKeys.thirdParty.contacts.detail(id) });
      if (data.tiers) {
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
    queryFn: () => thirdPartyReportsService.generateCustomersReport(params),
  });
};

export const useSuppliersReport = (params?: { date_debut?: string; date_fin?: string }) => {
  return useQuery({
    queryKey: ['thirdPartyReports', 'suppliers', params],
    queryFn: () => thirdPartyReportsService.generateSuppliersReport(params),
  });
};

export const useAgedReceivables = (params?: { date?: string }) => {
  return useQuery({
    queryKey: ['thirdPartyReports', 'agedReceivables', params],
    queryFn: () => thirdPartyReportsService.generateAgedReceivables(params),
  });
};

export const useAgedPayables = (params?: { date?: string }) => {
  return useQuery({
    queryKey: ['thirdPartyReports', 'agedPayables', params],
    queryFn: () => thirdPartyReportsService.generateAgedPayables(params),
  });
};

export const useAccountStatement = (params: {
  tiers: string;
  date_debut: string;
  date_fin: string;
}) => {
  return useQuery({
    queryKey: ['thirdPartyReports', 'accountStatement', params],
    queryFn: () => thirdPartyReportsService.generateAccountStatement(params),
    enabled: !!(params.tiers && params.date_debut && params.date_fin),
  });
};