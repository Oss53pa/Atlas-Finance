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
  type Company,
  type FiscalYear,
  type Currency,
  type CreateCompanyDto,
  type UpdateCompanyDto,
} from '../services/core-complete.service';

interface QueryParams {
  page?: number;
  page_size?: number;
  [key: string]: unknown;
}

type CreateFiscalYearDto = Omit<FiscalYear, 'id' | 'created_at' | 'updated_at'>;
type UpdateFiscalYearDto = Partial<CreateFiscalYearDto>;

// Cast services to access extended API methods not present in the class definitions
const companiesApi = companiesService as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;
const fiscalYearsApi = fiscalYearsService as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;
const currenciesApi = currenciesService as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;

/**
 * ========================================
 * SOCIÉTÉS (COMPANIES)
 * ========================================
 */

export const useCompanies = (params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.core.companies.list(params as Record<string, unknown>),
    queryFn: () => companiesService.getAll(params as Parameters<typeof companiesService.getAll>[0]),
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
    queryFn: () => companiesApi.getActiveCompanies() as Promise<Company[]>,
  });
};

export const useDefaultCompany = () => {
  return useQuery({
    queryKey: ['companies', 'default'],
    queryFn: () => companiesApi.getDefaultCompany() as Promise<Company | null>,
  });
};

export const useCompanyStatistics = (companyId: string) => {
  return useQuery({
    queryKey: ['companies', 'statistics', companyId],
    queryFn: () => companiesApi.getStatistics(companyId) as Promise<unknown>,
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
    onSuccess: (_: unknown, { id }: { id: string; data: UpdateCompanyDto }) => {
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
    }) => companiesApi.uploadLogo(companyId, file, onProgress) as Promise<Company>,
    onSuccess: (_: unknown, { companyId }: { companyId: string; file: File; onProgress?: (progress: number) => void }) => {
      invalidateQueries.companies();
      queryClient.invalidateQueries({ queryKey: queryKeys.core.companies.detail(companyId) });
    },
  });
};

export const useDeleteCompanyLogo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (companyId: string) => companiesApi.deleteLogo(companyId) as Promise<void>,
    onSuccess: (_: unknown, companyId: string) => {
      invalidateQueries.companies();
      queryClient.invalidateQueries({ queryKey: queryKeys.core.companies.detail(companyId) });
    },
  });
};

export const useToggleCompanyActive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (companyId: string) => companiesApi.toggleActive(companyId) as Promise<Company>,
    onSuccess: (_: unknown, companyId: string) => {
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
    queryKey: queryKeys.core.fiscalYears.list(params as Record<string, unknown>),
    queryFn: () => fiscalYearsService.getAll(params as Parameters<typeof fiscalYearsService.getAll>[0]),
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
    queryFn: () => fiscalYearsApi.getByCompany(societeId, params) as Promise<FiscalYear[]>,
    enabled: !!societeId,
  });
};

export const useActiveFiscalYear = (societeId?: string) => {
  return useQuery({
    queryKey: queryKeys.core.fiscalYears.active(societeId),
    queryFn: () => fiscalYearsApi.getActiveFiscalYear(societeId) as Promise<FiscalYear | null>,
  });
};

export const useFiscalYearsByStatus = (statut: string, params?: QueryParams) => {
  return useQuery({
    queryKey: ['fiscalYears', 'byStatus', statut, params],
    queryFn: () => fiscalYearsApi.getByStatus(statut, params) as Promise<FiscalYear[]>,
    enabled: !!statut,
  });
};

export const useFiscalYearByDate = (date: string, societeId?: string) => {
  return useQuery({
    queryKey: ['fiscalYears', 'byDate', date, societeId],
    queryFn: () => fiscalYearsApi.getByDate(date, societeId) as Promise<FiscalYear | null>,
    enabled: !!date,
  });
};

export const useFiscalYearStatistics = (id: string) => {
  return useQuery({
    queryKey: ['fiscalYears', 'statistics', id],
    queryFn: () => fiscalYearsApi.getStatistics(id) as Promise<unknown>,
    enabled: !!id,
  });
};

export const useCreateFiscalYear = () => {
  return useMutation({
    mutationFn: (data: CreateFiscalYearDto) => fiscalYearsService.create(data as Partial<FiscalYear>),
    onSuccess: () => {
      invalidateQueries.fiscalYears();
    },
  });
};

export const useUpdateFiscalYear = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFiscalYearDto }) =>
      fiscalYearsService.update(id, data as Partial<FiscalYear>),
    onSuccess: (_: unknown, { id }: { id: string; data: UpdateFiscalYearDto }) => {
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
    mutationFn: (id: string) => fiscalYearsApi.open(id) as Promise<FiscalYear>,
    onSuccess: (_: unknown, id: string) => {
      invalidateQueries.fiscalYears();
      queryClient.invalidateQueries({ queryKey: queryKeys.core.fiscalYears.detail(id) });
    },
  });
};

export const useCloseFiscalYear = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fiscalYearsApi.close(id) as Promise<FiscalYear>,
    onSuccess: (_: unknown, id: string) => {
      invalidateQueries.fiscalYears();
      queryClient.invalidateQueries({ queryKey: queryKeys.core.fiscalYears.detail(id) });
    },
  });
};

export const useArchiveFiscalYear = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fiscalYearsApi.archive(id) as Promise<FiscalYear>,
    onSuccess: (_: unknown, id: string) => {
      invalidateQueries.fiscalYears();
      queryClient.invalidateQueries({ queryKey: queryKeys.core.fiscalYears.detail(id) });
    },
  });
};

export const useReopenFiscalYear = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fiscalYearsApi.reopen(id) as Promise<FiscalYear>,
    onSuccess: (_: unknown, id: string) => {
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
    queryKey: queryKeys.core.currencies.list(params as Record<string, unknown>),
    queryFn: () => currenciesService.getAll(params as Parameters<typeof currenciesService.getAll>[0]),
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
    queryFn: () => currenciesApi.getActiveCurrencies() as Promise<Currency[]>,
  });
};

export const useReferenceCurrency = () => {
  return useQuery({
    queryKey: queryKeys.core.currencies.reference,
    queryFn: () => currenciesApi.getReferenceCurrency() as Promise<Currency | null>,
  });
};

export const useCurrencyExchangeRateHistory = (
  currencyId: string,
  dateDebut?: string,
  dateFin?: string
) => {
  return useQuery({
    queryKey: ['currencies', 'rateHistory', currencyId, dateDebut, dateFin],
    queryFn: () => currenciesApi.getExchangeRateHistory(currencyId, dateDebut, dateFin) as Promise<unknown>,
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
    onSuccess: (_: unknown, { id }: { id: string; data: Partial<Currency> }) => {
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
    mutationFn: (id: string) => currenciesApi.setAsReference(id) as Promise<Currency>,
    onSuccess: (_: unknown, id: string) => {
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
      currenciesApi.updateExchangeRate(id, tauxChange) as Promise<Currency>,
    onSuccess: (_: unknown, { id }: { id: string; tauxChange: number }) => {
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
    queryFn: () => currenciesApi.convert(params) as Promise<unknown>,
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
    }) => currenciesApi.importExchangeRates(file, onProgress) as Promise<unknown>,
    onSuccess: () => {
      invalidateQueries.currencies();
    },
  });
};