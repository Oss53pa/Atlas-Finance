// @ts-nocheck
/**
 * HOOKS REACT QUERY - IMMOBILISATIONS
 *
 * Hooks pour la gestion des immobilisations avec React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidateQueries } from '../lib/react-query';
import {
  fixedAssetsService,
  depreciationsService,
  assetsReportsService,
} from '../services/assets-complete.service';
import type { FixedAsset, Depreciation } from '../services/assets-complete.service';

// Cast services to access extended API methods
const assetsApi = fixedAssetsService as Record<string, (...args: unknown[]) => Promise<unknown>>;
const depApi = depreciationsService as Record<string, (...args: unknown[]) => Promise<unknown>>;
const reportsApi = assetsReportsService as Record<string, (...args: unknown[]) => Promise<unknown>>;

interface QueryParams {
  page?: number;
  page_size?: number;
  [key: string]: unknown;
}

/**
 * ========================================
 * IMMOBILISATIONS (FIXED ASSETS)
 * ========================================
 */

export const useFixedAssets = (params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.assets.fixedAssets.list(params),
    queryFn: () => fixedAssetsService.getAll(params as Parameters<typeof fixedAssetsService.getAll>[0]),
  });
};

export const useFixedAsset = (id: string) => {
  return useQuery({
    queryKey: queryKeys.assets.fixedAssets.detail(id),
    queryFn: () => fixedAssetsService.getById(id),
    enabled: !!id,
  });
};

export const useActiveFixedAssets = () => {
  return useQuery({
    queryKey: queryKeys.assets.fixedAssets.active,
    queryFn: () => assetsApi.getActiveAssets() as Promise<FixedAsset[]>,
  });
};

export const useFixedAssetsByCategory = (categorie: string, params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.assets.fixedAssets.byCategory(categorie),
    queryFn: () => assetsApi.getByCategory(categorie, params) as Promise<unknown>,
    enabled: !!categorie,
  });
};

export const useFixedAssetsByStatus = (statut: string, params?: QueryParams) => {
  return useQuery({
    queryKey: ['fixedAssets', 'byStatus', statut, params],
    queryFn: () => assetsApi.getByStatus(statut, params) as Promise<unknown>,
    enabled: !!statut,
  });
};

export const useFixedAssetsBySupplier = (fournisseurId: string, params?: QueryParams) => {
  return useQuery({
    queryKey: ['fixedAssets', 'bySupplier', fournisseurId, params],
    queryFn: () => assetsApi.getBySupplier(fournisseurId, params) as Promise<unknown>,
    enabled: !!fournisseurId,
  });
};

export const useDepreciationPlan = (id: string) => {
  return useQuery({
    queryKey: queryKeys.assets.fixedAssets.depreciationPlan(id),
    queryFn: () => assetsApi.calculateDepreciationPlan(id) as Promise<unknown>,
    enabled: !!id,
  });
};

export const useAssetDepreciationHistory = (id: string) => {
  return useQuery({
    queryKey: ['fixedAssets', 'depreciationHistory', id],
    queryFn: () => assetsApi.getDepreciationHistory(id) as Promise<unknown>,
    enabled: !!id,
  });
};

export const useNetBookValueAtDate = (id: string, date: string) => {
  return useQuery({
    queryKey: ['fixedAssets', 'netBookValue', id, date],
    queryFn: () => assetsApi.getNetBookValueAtDate(id, date) as Promise<unknown>,
    enabled: !!(id && date),
  });
};

export const useCreateFixedAsset = () => {
  return useMutation({
    mutationFn: (data: Partial<FixedAsset>) => assetsApi.create(data) as Promise<FixedAsset>,
    onSuccess: () => {
      invalidateQueries.fixedAssets();
    },
  });
};

export const useUpdateFixedAsset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FixedAsset> }) =>
      fixedAssetsService.update(id, data),
    onSuccess: (_: unknown, { id }: { id: string }) => {
      invalidateQueries.fixedAssets();
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.fixedAssets.detail(id) });
    },
  });
};

export const useDeleteFixedAsset = () => {
  return useMutation({
    mutationFn: (id: string) => fixedAssetsService.delete(id),
    onSuccess: () => {
      invalidateQueries.fixedAssets();
    },
  });
};

export const usePutAssetInService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dateMiseEnService }: { id: string; dateMiseEnService: string }) =>
      assetsApi.putInService(id, dateMiseEnService) as Promise<FixedAsset>,
    onSuccess: (_: unknown, { id }: { id: string }) => {
      invalidateQueries.fixedAssets();
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.fixedAssets.detail(id) });
    },
  });
};

export const useDisposeAsset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        date_cession: string;
        prix_cession: number;
        acquereur?: string;
        motif?: string;
      };
    }) => assetsApi.dispose(id, data) as Promise<FixedAsset>,
    onSuccess: (_: unknown, { id }: { id: string }) => {
      invalidateQueries.fixedAssets();
      invalidateQueries.accountingEntries();
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.fixedAssets.detail(id) });
    },
  });
};

export const useReformAsset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        date_reforme: string;
        motif?: string;
      };
    }) => assetsApi.reform(id, data) as Promise<FixedAsset>,
    onSuccess: (_: unknown, { id }: { id: string }) => {
      invalidateQueries.fixedAssets();
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.fixedAssets.detail(id) });
    },
  });
};

export const useDuplicateAsset = () => {
  return useMutation({
    mutationFn: (id: string) => assetsApi.duplicate(id) as Promise<FixedAsset>,
    onSuccess: () => {
      invalidateQueries.fixedAssets();
    },
  });
};

export const useImportAssets = () => {
  return useMutation({
    mutationFn: ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress?: (progress: number) => void;
    }) => assetsApi.importAssets(file, onProgress) as Promise<unknown>,
    onSuccess: () => {
      invalidateQueries.fixedAssets();
    },
  });
};

/**
 * ========================================
 * AMORTISSEMENTS (DEPRECIATIONS)
 * ========================================
 */

export const useDepreciations = (params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.assets.depreciations.list(params),
    queryFn: () => depreciationsService.getAll(params as Parameters<typeof depreciationsService.getAll>[0]),
  });
};

export const useDepreciation = (id: string) => {
  return useQuery({
    queryKey: queryKeys.assets.depreciations.detail(id),
    queryFn: () => depApi.getById(id) as Promise<Depreciation | null>,
    enabled: !!id,
  });
};

export const useDepreciationsByAsset = (immobilisationId: string, _params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.assets.depreciations.byAsset(immobilisationId),
    queryFn: () => depreciationsService.getByAsset(immobilisationId),
    enabled: !!immobilisationId,
  });
};

export const useDepreciationsByFiscalYear = (exerciceId: string, params?: QueryParams) => {
  return useQuery({
    queryKey: ['depreciations', 'byFiscalYear', exerciceId, params],
    queryFn: () => depApi.getByFiscalYear(exerciceId, params) as Promise<unknown>,
    enabled: !!exerciceId,
  });
};

export const useUnaccountedDepreciations = () => {
  return useQuery({
    queryKey: queryKeys.assets.depreciations.unaccounted,
    queryFn: () => depApi.getUnaccounted() as Promise<Depreciation[]>,
  });
};

export const useCalculateDepreciations = () => {
  return useMutation({
    mutationFn: (exerciceId: string) => depApi.calculateDepreciations(exerciceId) as Promise<unknown>,
    onSuccess: () => {
      invalidateQueries.depreciations();
    },
  });
};

export const useAccountDepreciation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => depApi.accountDepreciation(id) as Promise<Depreciation>,
    onSuccess: (_: unknown, id: string) => {
      invalidateQueries.depreciations();
      invalidateQueries.accountingEntries();
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.depreciations.detail(id) });
    },
  });
};

export const useBulkAccountDepreciations = () => {
  return useMutation({
    mutationFn: (depreciationIds: string[]) =>
      depApi.bulkAccount(depreciationIds) as Promise<unknown>,
    onSuccess: () => {
      invalidateQueries.depreciations();
      invalidateQueries.accountingEntries();
    },
  });
};

export const useCancelDepreciationAccounting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => depApi.cancelAccounting(id) as Promise<Depreciation>,
    onSuccess: (_: unknown, id: string) => {
      invalidateQueries.depreciations();
      invalidateQueries.accountingEntries();
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.depreciations.detail(id) });
    },
  });
};

/**
 * ========================================
 * RAPPORTS IMMOBILISATIONS (ASSETS REPORTS)
 * ========================================
 */

export const useAssetsTable = (params?: {
  exercice?: string;
  categorie?: string;
  statut?: string;
}) => {
  return useQuery({
    queryKey: ['assetsReports', 'table', params],
    queryFn: () => reportsApi.generateAssetsTable(params) as Promise<unknown>,
  });
};

export const useAssetsRegister = (params?: { exercice?: string; categorie?: string }) => {
  return useQuery({
    queryKey: ['assetsReports', 'register', params],
    queryFn: () => assetsReportsService.getAssetRegister(params as Parameters<typeof assetsReportsService.getAssetRegister>[0]),
  });
};

export const useGlobalDepreciationPlan = (params?: {
  exercice?: string;
  nb_exercices?: number;
}) => {
  return useQuery({
    queryKey: ['assetsReports', 'depreciationPlan', params],
    queryFn: () => reportsApi.generateGlobalDepreciationPlan(params) as Promise<unknown>,
  });
};

export const useDisposalReport = (params: { date_debut: string; date_fin: string }) => {
  return useQuery({
    queryKey: ['assetsReports', 'disposals', params],
    queryFn: () => reportsApi.generateDisposalReport(params) as Promise<unknown>,
    enabled: !!(params.date_debut && params.date_fin),
  });
};
