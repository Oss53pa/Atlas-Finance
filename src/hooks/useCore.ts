/**
 * HOOKS REACT QUERY - CORE (BASE)
 *
 * Hooks pour les entités de base: Sociétés, Exercices, Devises
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidateQueries } from '../lib/react-query';
import {
  companiesService,
  fiscalYearsService,
  currenciesService,
} from '../services/core-complete.service';
import type {
  Company,
  FiscalYear,
  Currency,
  CreateCompanyDto,
  UpdateCompanyDto,
  CreateFiscalYearDto,
  UpdateFiscalYearDto,
  QueryParams,
} from '../types/api.types';

/**
 * ========================================
 * SOCIÉTÉS (COMPANIES)
 * ========================================
 */

export const useCompanies = (params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.core.companies.list(params),
    queryFn: () => companiesService.getAll(params),
  });
};

export const useCompany = (id: string) => {
  return useQuery({
    queryKey: queryKeys.core.companies.detail(id),
    queryFn: () => companiesService.getById(id),
    enabled: !!id,
  });
};

export const useActiveCompanies = () => {
  return useQuery({
    queryKey: queryKeys.core.companies.active,
    queryFn: () => companiesService.getActiveCompanies(),
  });
};

export const useDefaultCompany = () => {
  return useQuery({
    queryKey: ['companies', 'default'],
    queryFn: () => companiesService.getDefaultCompany(),
  });
};

export const useCompanyStatistics = (companyId: string) => {
  return useQuery({
    queryKey: ['companies', 'statistics', companyId],
    queryFn: () => companiesService.getStatistics(companyId),
    enabled: !!companyId,
  });
};

export const useCreateCompany = () => {
  return useMutation({
    mutationFn: (data: CreateCompanyDto) => companiesService.create(data),
    onSuccess: () => {
      invalidateQueries.companies();
    },
  });
};

export const useUpdateCompany = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCompanyDto }) =>
      companiesService.update(id, data),
    onSuccess: (_, { id }) => {
      invalidateQueries.companies();
      queryClient.invalidateQueries({ queryKey: queryKeys.core.companies.detail(id) });
    },
  });
};

export const useDeleteCompany = () => {
  return useMutation({
    mutationFn: (id: string) => companiesService.delete(id),
    onSuccess: () => {
      invalidateQueries.companies();
    },
  });
};

export const useUploadCompanyLogo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      companyId,
      file,
      onProgress,
    }: {
      companyId: string;
      file: File;
      onProgress?: (progress: number) => void;
    }) => companiesService.uploadLogo(companyId, file, onProgress),
    onSuccess: (_, { companyId }) => {
      invalidateQueries.companies();
      queryClient.invalidateQueries({ queryKey: queryKeys.core.companies.detail(companyId) });
    },
  });
};

export const useDeleteCompanyLogo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (companyId: string) => companiesService.deleteLogo(companyId),
    onSuccess: (_, companyId) => {
      invalidateQueries.companies();
      queryClient.invalidateQueries({ queryKey: queryKeys.core.companies.detail(companyId) });
    },
  });
};

export const useToggleCompanyActive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (companyId: string) => companiesService.toggleActive(companyId),
    onSuccess: (_, companyId) => {
      invalidateQueries.companies();
      queryClient.invalidateQueries({ queryKey: queryKeys.core.companies.detail(companyId) });
    },
  });
};

/**
 * ========================================
 * EXERCICES FISCAUX (FISCAL YEARS)
 * ========================================
 */

export const useFiscalYears = (params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.core.fiscalYears.list(params),
    queryFn: () => fiscalYearsService.getAll(params),
  });
};

export const useFiscalYear = (id: string) => {
  return useQuery({
    queryKey: queryKeys.core.fiscalYears.detail(id),
    queryFn: () => fiscalYearsService.getById(id),
    enabled: !!id,
  });
};

export const useFiscalYearsByCompany = (societeId: string, params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.core.fiscalYears.byCompany(societeId),
    queryFn: () => fiscalYearsService.getByCompany(societeId, params),
    enabled: !!societeId,
  });
};

export const useActiveFiscalYear = (societeId?: string) => {
  return useQuery({
    queryKey: queryKeys.core.fiscalYears.active(societeId),
    queryFn: () => fiscalYearsService.getActiveFiscalYear(societeId),
  });
};

export const useFiscalYearsByStatus = (statut: string, params?: QueryParams) => {
  return useQuery({
    queryKey: ['fiscalYears', 'byStatus', statut, params],
    queryFn: () => fiscalYearsService.getByStatus(statut, params),
    enabled: !!statut,
  });
};

export const useFiscalYearByDate = (date: string, societeId?: string) => {
  return useQuery({
    queryKey: ['fiscalYears', 'byDate', date, societeId],
    queryFn: () => fiscalYearsService.getByDate(date, societeId),
    enabled: !!date,
  });
};

export const useFiscalYearStatistics = (id: string) => {
  return useQuery({
    queryKey: ['fiscalYears', 'statistics', id],
    queryFn: () => fiscalYearsService.getStatistics(id),
    enabled: !!id,
  });
};

export const useCreateFiscalYear = () => {
  return useMutation({
    mutationFn: (data: CreateFiscalYearDto) => fiscalYearsService.create(data),
    onSuccess: () => {
      invalidateQueries.fiscalYears();
    },
  });
};

export const useUpdateFiscalYear = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFiscalYearDto }) =>
      fiscalYearsService.update(id, data),
    onSuccess: (_, { id }) => {
      invalidateQueries.fiscalYears();
      queryClient.invalidateQueries({ queryKey: queryKeys.core.fiscalYears.detail(id) });
    },
  });
};

export const useDeleteFiscalYear = () => {
  return useMutation({
    mutationFn: (id: string) => fiscalYearsService.delete(id),
    onSuccess: () => {
      invalidateQueries.fiscalYears();
    },
  });
};

export const useOpenFiscalYear = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fiscalYearsService.open(id),
    onSuccess: (_, id) => {
      invalidateQueries.fiscalYears();
      queryClient.invalidateQueries({ queryKey: queryKeys.core.fiscalYears.detail(id) });
    },
  });
};

export const useCloseFiscalYear = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fiscalYearsService.close(id),
    onSuccess: (_, id) => {
      invalidateQueries.fiscalYears();
      queryClient.invalidateQueries({ queryKey: queryKeys.core.fiscalYears.detail(id) });
    },
  });
};

export const useArchiveFiscalYear = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fiscalYearsService.archive(id),
    onSuccess: (_, id) => {
      invalidateQueries.fiscalYears();
      queryClient.invalidateQueries({ queryKey: queryKeys.core.fiscalYears.detail(id) });
    },
  });
};

export const useReopenFiscalYear = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fiscalYearsService.reopen(id),
    onSuccess: (_, id) => {
      invalidateQueries.fiscalYears();
      queryClient.invalidateQueries({ queryKey: queryKeys.core.fiscalYears.detail(id) });
    },
  });
};

/**
 * ========================================
 * DEVISES (CURRENCIES)
 * ========================================
 */

export const useCurrencies = (params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.core.currencies.list(params),
    queryFn: () => currenciesService.getAll(params),
  });
};

export const useCurrency = (id: string) => {
  return useQuery({
    queryKey: queryKeys.core.currencies.detail(id),
    queryFn: () => currenciesService.getById(id),
    enabled: !!id,
  });
};

export const useActiveCurrencies = () => {
  return useQuery({
    queryKey: queryKeys.core.currencies.active,
    queryFn: () => currenciesService.getActiveCurrencies(),
  });
};

export const useReferenceCurrency = () => {
  return useQuery({
    queryKey: queryKeys.core.currencies.reference,
    queryFn: () => currenciesService.getReferenceCurrency(),
  });
};

export const useCurrencyExchangeRateHistory = (
  currencyId: string,
  dateDebut?: string,
  dateFin?: string
) => {
  return useQuery({
    queryKey: ['currencies', 'rateHistory', currencyId, dateDebut, dateFin],
    queryFn: () => currenciesService.getExchangeRateHistory(currencyId, dateDebut, dateFin),
    enabled: !!currencyId,
  });
};

export const useCreateCurrency = () => {
  return useMutation({
    mutationFn: (data: Partial<Currency>) => currenciesService.create(data),
    onSuccess: () => {
      invalidateQueries.currencies();
    },
  });
};

export const useUpdateCurrency = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Currency> }) =>
      currenciesService.update(id, data),
    onSuccess: (_, { id }) => {
      invalidateQueries.currencies();
      queryClient.invalidateQueries({ queryKey: queryKeys.core.currencies.detail(id) });
    },
  });
};

export const useDeleteCurrency = () => {
  return useMutation({
    mutationFn: (id: string) => currenciesService.delete(id),
    onSuccess: () => {
      invalidateQueries.currencies();
    },
  });
};

export const useSetReferenceCurrency = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => currenciesService.setAsReference(id),
    onSuccess: (_, id) => {
      invalidateQueries.currencies();
      queryClient.invalidateQueries({ queryKey: queryKeys.core.currencies.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.core.currencies.reference });
    },
  });
};

export const useUpdateExchangeRate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, tauxChange }: { id: string; tauxChange: number }) =>
      currenciesService.updateExchangeRate(id, tauxChange),
    onSuccess: (_, { id }) => {
      invalidateQueries.currencies();
      queryClient.invalidateQueries({ queryKey: queryKeys.core.currencies.detail(id) });
    },
  });
};

export const useConvertCurrency = (params: {
  montant: number;
  devise_source: string;
  devise_cible: string;
  date?: string;
}) => {
  return useQuery({
    queryKey: ['currencies', 'convert', params],
    queryFn: () => currenciesService.convert(params),
    enabled: !!(params.montant && params.devise_source && params.devise_cible),
  });
};

export const useImportExchangeRates = () => {
  return useMutation({
    mutationFn: ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress?: (progress: number) => void;
    }) => currenciesService.importExchangeRates(file, onProgress),
    onSuccess: () => {
      invalidateQueries.currencies();
    },
  });
};