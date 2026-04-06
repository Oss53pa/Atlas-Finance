// @ts-nocheck

/**
 * HOOKS REACT QUERY - BUDGET, ANALYTIQUE, FISCALITE
 *
 * Hooks pour la gestion du budget, analytique et fiscalite avec React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidateQueries } from '../lib/react-query';
import {
  analyticalAxisService,
  analyticalCentersService,
  budgetsService,
  budgetControlService,
  taxDeclarationsService,
} from '../services/analytics-budgeting-taxation.service';
import type {
  AnalyticalAxis,
  AnalyticalCenter,
  Budget,
  TaxDeclaration,
} from '../services/analytics-budgeting-taxation.service';

// Cast services to access extended API methods
const axisApi = analyticalAxisService as Record<string, (...args: unknown[]) => Promise<unknown>>;
const centersApi = analyticalCentersService as Record<string, (...args: unknown[]) => Promise<unknown>>;
const budgetsApi = budgetsService as Record<string, (...args: unknown[]) => Promise<unknown>>;
const budgetControlApi = budgetControlService as Record<string, (...args: unknown[]) => Promise<unknown>>;
const taxApi = taxDeclarationsService as Record<string, (...args: unknown[]) => Promise<unknown>>;

interface QueryParams {
  page?: number;
  page_size?: number;
  [key: string]: unknown;
}

/**
 * ========================================
 * COMPTABILITE ANALYTIQUE - AXES
 * ========================================
 */

export const useAnalyticalAxes = (params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.analytics.axes.list(params),
    queryFn: () => analyticalAxisService.getAll(params),
  });
};

export const useAnalyticalAxis = (id: string) => {
  return useQuery({
    queryKey: queryKeys.analytics.axes.detail(id),
    queryFn: () => analyticalAxisService.getById(id),
    enabled: !!id,
  });
};

export const useActiveAnalyticalAxes = () => {
  return useQuery({
    queryKey: queryKeys.analytics.axes.active,
    queryFn: () => axisApi.getActiveAxis() as Promise<AnalyticalAxis[]>,
  });
};

export const useMandatoryAnalyticalAxes = () => {
  return useQuery({
    queryKey: ['analyticalAxes', 'mandatory'],
    queryFn: () => axisApi.getMandatoryAxis() as Promise<AnalyticalAxis[]>,
  });
};

export const useAxisCenters = (axisId: string) => {
  return useQuery({
    queryKey: ['analyticalAxes', 'centers', axisId],
    queryFn: () => axisApi.getCenters(axisId) as Promise<AnalyticalCenter[]>,
    enabled: !!axisId,
  });
};

export const useCreateAnalyticalAxis = () => {
  return useMutation({
    mutationFn: (data: Partial<AnalyticalAxis>) => analyticalAxisService.create(data as Omit<AnalyticalAxis, 'id'>),
    onSuccess: () => {
      invalidateQueries.analyticalAxes();
    },
  });
};

export const useUpdateAnalyticalAxis = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AnalyticalAxis> }) =>
      analyticalAxisService.update(id, data),
    onSuccess: (_: unknown, { id }: { id: string }) => {
      invalidateQueries.analyticalAxes();
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.axes.detail(id) });
    },
  });
};

export const useDeleteAnalyticalAxis = () => {
  return useMutation({
    mutationFn: (id: string) => analyticalAxisService.delete(id),
    onSuccess: () => {
      invalidateQueries.analyticalAxes();
    },
  });
};

/**
 * ========================================
 * COMPTABILITE ANALYTIQUE - CENTRES
 * ========================================
 */

export const useAnalyticalCenters = (params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.analytics.centers.list(params),
    queryFn: () => analyticalCentersService.getAll(params),
  });
};

export const useAnalyticalCenter = (id: string) => {
  return useQuery({
    queryKey: queryKeys.analytics.centers.detail(id),
    queryFn: () => centersApi.getById(id) as Promise<AnalyticalCenter | null>,
    enabled: !!id,
  });
};

export const useCentersByAxis = (axeId: string, params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.analytics.centers.byAxis(axeId),
    queryFn: () => analyticalCentersService.getByAxis(axeId),
    enabled: !!axeId,
  });
};

export const useActiveAnalyticalCenters = (axeId?: string) => {
  return useQuery({
    queryKey: ['analyticalCenters', 'active', axeId],
    queryFn: () => centersApi.getActiveCenters(axeId) as Promise<AnalyticalCenter[]>,
  });
};

export const useCentersHierarchy = (axeId?: string) => {
  return useQuery({
    queryKey: queryKeys.analytics.centers.hierarchy(axeId),
    queryFn: () => centersApi.getHierarchy(axeId) as Promise<AnalyticalCenter[]>,
  });
};

export const useCentersByLevel = (niveau: number, axeId?: string) => {
  return useQuery({
    queryKey: ['analyticalCenters', 'byLevel', niveau, axeId],
    queryFn: () => centersApi.getByLevel(niveau, axeId) as Promise<AnalyticalCenter[]>,
  });
};

export const useCenterDistributions = (
  centerId: string,
  params?: { date_debut?: string; date_fin?: string }
) => {
  return useQuery({
    queryKey: ['analyticalCenters', 'distributions', centerId, params],
    queryFn: () => centersApi.getDistributions(centerId, params) as Promise<unknown>,
    enabled: !!centerId,
  });
};

export const useCreateAnalyticalCenter = () => {
  return useMutation({
    mutationFn: (data: Partial<AnalyticalCenter>) => analyticalCentersService.create(data as Omit<AnalyticalCenter, 'id'>),
    onSuccess: () => {
      invalidateQueries.analyticalCenters();
    },
  });
};

export const useUpdateAnalyticalCenter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AnalyticalCenter> }) =>
      analyticalCentersService.update(id, data),
    onSuccess: (_: unknown, { id }: { id: string }) => {
      invalidateQueries.analyticalCenters();
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.centers.detail(id) });
    },
  });
};

export const useDeleteAnalyticalCenter = () => {
  return useMutation({
    mutationFn: (id: string) => analyticalCentersService.delete(id),
    onSuccess: () => {
      invalidateQueries.analyticalCenters();
    },
  });
};

/**
 * ========================================
 * BUDGETS
 * ========================================
 */

export const useBudgets = (params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.budgets.budgets.list(params),
    queryFn: () => budgetsService.getAll(params),
  });
};

export const useBudget = (id: string) => {
  return useQuery({
    queryKey: queryKeys.budgets.budgets.detail(id),
    queryFn: () => budgetsService.getById(id),
    enabled: !!id,
  });
};

export const useBudgetsByFiscalYear = (exerciceId: string, params?: QueryParams) => {
  return useQuery({
    queryKey: ['budgets', 'byFiscalYear', exerciceId, params],
    queryFn: () => budgetsApi.getByFiscalYear(exerciceId, params) as Promise<unknown>,
    enabled: !!exerciceId,
  });
};

export const useActiveBudget = (exerciceId?: string) => {
  return useQuery({
    queryKey: queryKeys.budgets.budgets.active(exerciceId),
    queryFn: () => budgetsApi.getActiveBudget(exerciceId) as Promise<Budget | null>,
  });
};

export const useBudgetControls = (budgetId: string) => {
  return useQuery({
    queryKey: queryKeys.budgets.budgets.controls(budgetId),
    queryFn: () => budgetsApi.getControls(budgetId) as Promise<unknown>,
    enabled: !!budgetId,
  });
};

export const useBudgetExecutionReport = (budgetId: string) => {
  return useQuery({
    queryKey: ['budgets', 'executionReport', budgetId],
    queryFn: () => budgetsApi.generateExecutionReport(budgetId) as Promise<unknown>,
    enabled: !!budgetId,
  });
};

export const useCreateBudget = () => {
  return useMutation({
    mutationFn: (data: Partial<Budget>) => budgetsService.create(data as Omit<Budget, 'id'>),
    onSuccess: () => {
      invalidateQueries.budgets();
    },
  });
};

export const useUpdateBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Budget> }) =>
      budgetsService.update(id, data),
    onSuccess: (_: unknown, { id }: { id: string }) => {
      invalidateQueries.budgets();
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.budgets.detail(id) });
    },
  });
};

export const useDeleteBudget = () => {
  return useMutation({
    mutationFn: (id: string) => budgetsService.delete(id),
    onSuccess: () => {
      invalidateQueries.budgets();
    },
  });
};

export const useValidateBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => budgetsApi.validate(id) as Promise<Budget>,
    onSuccess: (_: unknown, id: string) => {
      invalidateQueries.budgets();
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.budgets.detail(id) });
    },
  });
};

export const useCloseBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => budgetsApi.close(id) as Promise<Budget>,
    onSuccess: (_: unknown, id: string) => {
      invalidateQueries.budgets();
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.budgets.detail(id) });
    },
  });
};

export const useDuplicateBudget = () => {
  return useMutation({
    mutationFn: ({ id, nouveauExercice }: { id: string; nouveauExercice: string }) =>
      budgetsApi.duplicate(id, nouveauExercice) as Promise<Budget>,
    onSuccess: () => {
      invalidateQueries.budgets();
    },
  });
};

/**
 * ========================================
 * CONTROLE BUDGETAIRE
 * ========================================
 */

export const useBudgetControlList = (params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.budgets.controls.list(params),
    queryFn: () => budgetControlService.getAll(params),
  });
};

export const useBudgetControlsByBudget = (budgetId: string, params?: QueryParams) => {
  return useQuery({
    queryKey: ['budgetControls', 'byBudget', budgetId, params],
    queryFn: () => budgetControlService.getByBudget(budgetId),
    enabled: !!budgetId,
  });
};

export const useBudgetOverruns = (budgetId?: string) => {
  return useQuery({
    queryKey: queryKeys.budgets.controls.overruns(budgetId),
    queryFn: () => budgetControlApi.getOverruns(budgetId) as Promise<unknown>,
  });
};

export const useRecalculateBudgetControls = () => {
  return useMutation({
    mutationFn: (budgetId: string) => budgetControlApi.recalculate(budgetId) as Promise<unknown>,
    onSuccess: () => {
      invalidateQueries.budgetControls();
    },
  });
};

export const useCheckBudgetAvailability = (params: {
  budget: string;
  compte: string;
  centre_analytique?: string;
  montant: number;
}) => {
  return useQuery({
    queryKey: ['budgetControls', 'checkAvailability', params],
    queryFn: () => budgetControlApi.checkAvailability(params) as Promise<unknown>,
    enabled: !!(params.budget && params.compte && params.montant),
  });
};

/**
 * ========================================
 * DECLARATIONS FISCALES
 * ========================================
 */

export const useTaxDeclarations = (params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.taxation.declarations.list(params),
    queryFn: () => taxDeclarationsService.getAll(params),
  });
};

export const useTaxDeclaration = (id: string) => {
  return useQuery({
    queryKey: queryKeys.taxation.declarations.detail(id),
    queryFn: () => taxDeclarationsService.getById(id),
    enabled: !!id,
  });
};

export const useTaxDeclarationsByType = (type: string, params?: QueryParams) => {
  return useQuery({
    queryKey: ['taxDeclarations', 'byType', type, params],
    queryFn: () => taxApi.getByType(type, params) as Promise<unknown>,
    enabled: !!type,
  });
};

export const useOverdueTaxDeclarations = () => {
  return useQuery({
    queryKey: queryKeys.taxation.declarations.overdue,
    queryFn: () => taxApi.getOverdue() as Promise<TaxDeclaration[]>,
  });
};

export const useUpcomingTaxDeclarations = (jours: number = 30) => {
  return useQuery({
    queryKey: queryKeys.taxation.declarations.upcoming(jours),
    queryFn: () => taxApi.getUpcoming(jours) as Promise<TaxDeclaration[]>,
  });
};

export const useFiscalCalendar = (params?: { annee?: number; type?: string }) => {
  return useQuery({
    queryKey: queryKeys.taxation.declarations.calendar(params),
    queryFn: () => taxApi.getFiscalCalendar(params) as Promise<unknown>,
  });
};

export const useCreateTaxDeclaration = () => {
  return useMutation({
    mutationFn: (data: Partial<TaxDeclaration>) => taxDeclarationsService.create(data as Omit<TaxDeclaration, 'id'>),
    onSuccess: () => {
      invalidateQueries.taxDeclarations();
    },
  });
};

export const useUpdateTaxDeclaration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TaxDeclaration> }) =>
      taxDeclarationsService.update(id, data),
    onSuccess: (_: unknown, { id }: { id: string }) => {
      invalidateQueries.taxDeclarations();
      queryClient.invalidateQueries({ queryKey: queryKeys.taxation.declarations.detail(id) });
    },
  });
};

export const useDeleteTaxDeclaration = () => {
  return useMutation({
    mutationFn: (id: string) => taxDeclarationsService.delete(id),
    onSuccess: () => {
      invalidateQueries.taxDeclarations();
    },
  });
};

export const useCalculateTaxDeclaration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => taxApi.calculate(id) as Promise<TaxDeclaration>,
    onSuccess: (_: unknown, id: string) => {
      invalidateQueries.taxDeclarations();
      queryClient.invalidateQueries({ queryKey: queryKeys.taxation.declarations.detail(id) });
    },
  });
};

export const useMarkTaxDeclarationAsSubmitted = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dateDeclaration }: { id: string; dateDeclaration: string }) =>
      taxApi.markAsSubmitted(id, dateDeclaration) as Promise<TaxDeclaration>,
    onSuccess: (_: unknown, { id }: { id: string }) => {
      invalidateQueries.taxDeclarations();
      queryClient.invalidateQueries({ queryKey: queryKeys.taxation.declarations.detail(id) });
    },
  });
};

export const useMarkTaxDeclarationAsPaid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      montantPaye,
      datePaiement,
    }: {
      id: string;
      montantPaye: number;
      datePaiement: string;
    }) => taxApi.markAsPaid(id, montantPaye, datePaiement) as Promise<TaxDeclaration>,
    onSuccess: (_: unknown, { id }: { id: string }) => {
      invalidateQueries.taxDeclarations();
      queryClient.invalidateQueries({ queryKey: queryKeys.taxation.declarations.detail(id) });
    },
  });
};

export const useUploadTaxDeclarationFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      declarationId,
      file,
      onProgress,
    }: {
      declarationId: string;
      file: File;
      onProgress?: (progress: number) => void;
    }) => taxApi.uploadDeclarationFile(declarationId, file, onProgress) as Promise<TaxDeclaration>,
    onSuccess: (data: TaxDeclaration) => {
      invalidateQueries.taxDeclarations();
      if (data?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.taxation.declarations.detail(data.id),
        });
      }
    },
  });
};
