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
import type { FixedAsset, Depreciation, QueryParams } from '../types/api.types';

/**
 * ========================================
 * IMMOBILISATIONS (FIXED ASSETS)
 * ========================================
 */

export const useFixedAssets = (params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.assets.fixedAssets.list(params),
    queryFn: () => fixedAssetsService.getAll(params),
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
    queryFn: () => fixedAssetsService.getActiveAssets(),
  });
};

export const useFixedAssetsByCategory = (categorie: string, params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.assets.fixedAssets.byCategory(categorie),
    queryFn: () => fixedAssetsService.getByCategory(categorie, params),
    enabled: !!categorie,
  });
};

export const useFixedAssetsByStatus = (statut: string, params?: QueryParams) => {
  return useQuery({
    queryKey: ['fixedAssets', 'byStatus', statut, params],
    queryFn: () => fixedAssetsService.getByStatus(statut, params),
    enabled: !!statut,
  });
};

export const useFixedAssetsBySupplier = (fournisseurId: string, params?: QueryParams) => {
  return useQuery({
    queryKey: ['fixedAssets', 'bySupplier', fournisseurId, params],
    queryFn: () => fixedAssetsService.getBySupplier(fournisseurId, params),
    enabled: !!fournisseurId,
  });
};

export const useDepreciationPlan = (id: string) => {
  return useQuery({
    queryKey: queryKeys.assets.fixedAssets.depreciationPlan(id),
    queryFn: () => fixedAssetsService.calculateDepreciationPlan(id),
    enabled: !!id,
  });
};

export const useAssetDepreciationHistory = (id: string) => {
  return useQuery({
    queryKey: ['fixedAssets', 'depreciationHistory', id],
    queryFn: () => fixedAssetsService.getDepreciationHistory(id),
    enabled: !!id,
  });
};

export const useNetBookValueAtDate = (id: string, date: string) => {
  return useQuery({
    queryKey: ['fixedAssets', 'netBookValue', id, date],
    queryFn: () => fixedAssetsService.getNetBookValueAtDate(id, date),
    enabled: !!(id && date),
  });
};

export const useCreateFixedAsset = () => {
  return useMutation({
    mutationFn: (data: Partial<FixedAsset>) => fixedAssetsService.create(data),
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
    onSuccess: (_, { id }) => {
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
      fixedAssetsService.putInService(id, dateMiseEnService),
    onSuccess: (_, { id }) => {
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
    }) => fixedAssetsService.dispose(id, data),
    onSuccess: (_, { id }) => {
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
    }) => fixedAssetsService.reform(id, data),
    onSuccess: (_, { id }) => {
      invalidateQueries.fixedAssets();
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.fixedAssets.detail(id) });
    },
  });
};

export const useDuplicateAsset = () => {
  return useMutation({
    mutationFn: (id: string) => fixedAssetsService.duplicate(id),
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
    }) => fixedAssetsService.importAssets(file, onProgress),
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
    queryFn: () => depreciationsService.getAll(params),
  });
};

export const useDepreciation = (id: string) => {
  return useQuery({
    queryKey: queryKeys.assets.depreciations.detail(id),
    queryFn: () => depreciationsService.getById(id),
    enabled: !!id,
  });
};

export const useDepreciationsByAsset = (immobilisationId: string, params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.assets.depreciations.byAsset(immobilisationId),
    queryFn: () => depreciationsService.getByAsset(immobilisationId, params),
    enabled: !!immobilisationId,
  });
};

export const useDepreciationsByFiscalYear = (exerciceId: string, params?: QueryParams) => {
  return useQuery({
    queryKey: ['depreciations', 'byFiscalYear', exerciceId, params],
    queryFn: () => depreciationsService.getByFiscalYear(exerciceId, params),
    enabled: !!exerciceId,
  });
};

export const useUnaccountedDepreciations = () => {
  return useQuery({
    queryKey: queryKeys.assets.depreciations.unaccounted,
    queryFn: () => depreciationsService.getUnaccounted(),
  });
};

export const useCalculateDepreciations = () => {
  return useMutation({
    mutationFn: (exerciceId: string) => depreciationsService.calculateDepreciations(exerciceId),
    onSuccess: () => {
      invalidateQueries.depreciations();
    },
  });
};

export const useAccountDepreciation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => depreciationsService.accountDepreciation(id),
    onSuccess: (_, id) => {
      invalidateQueries.depreciations();
      invalidateQueries.accountingEntries();
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.depreciations.detail(id) });
    },
  });
};

export const useBulkAccountDepreciations = () => {
  return useMutation({
    mutationFn: (depreciationIds: string[]) =>
      depreciationsService.bulkAccount(depreciationIds),
    onSuccess: () => {
      invalidateQueries.depreciations();
      invalidateQueries.accountingEntries();
    },
  });
};

export const useCancelDepreciationAccounting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => depreciationsService.cancelAccounting(id),
    onSuccess: (_, id) => {
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
    queryFn: () => assetsReportsService.generateAssetsTable(params),
  });
};

export const useAssetsRegister = (params?: { exercice?: string; categorie?: string }) => {
  return useQuery({
    queryKey: ['assetsReports', 'register', params],
    queryFn: () => assetsReportsService.generateAssetsRegister(params),
  });
};

export const useGlobalDepreciationPlan = (params?: {
  exercice?: string;
  nb_exercices?: number;
}) => {
  return useQuery({
    queryKey: ['assetsReports', 'depreciationPlan', params],
    queryFn: () => assetsReportsService.generateGlobalDepreciationPlan(params),
  });
};

export const useDisposalReport = (params: { date_debut: string; date_fin: string }) => {
  return useQuery({
    queryKey: ['assetsReports', 'disposals', params],
    queryFn: () => assetsReportsService.generateDisposalReport(params),
    enabled: !!(params.date_debut && params.date_fin),
  });
};