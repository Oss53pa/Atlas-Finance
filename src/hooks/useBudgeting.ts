/**
 * HOOKS REACT QUERY - BUDGET, ANALYTIQUE, FISCALITÉ
 *
 * Hooks pour la gestion du budget, analytique et fiscalité avec React Query
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
  BudgetControl,
  TaxDeclaration,
  QueryParams,
} from '../types/api.types';

/**
 * ========================================
 * COMPTABILITÉ ANALYTIQUE - AXES
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
    queryFn: () => analyticalAxisService.getActiveAxis(),
  });
};

export const useMandatoryAnalyticalAxes = () => {
  return useQuery({
    queryKey: ['analyticalAxes', 'mandatory'],
    queryFn: () => analyticalAxisService.getMandatoryAxis(),
  });
};

export const useAxisCenters = (axisId: string) => {
  return useQuery({
    queryKey: ['analyticalAxes', 'centers', axisId],
    queryFn: () => analyticalAxisService.getCenters(axisId),
    enabled: !!axisId,
  });
};

export const useCreateAnalyticalAxis = () => {
  return useMutation({
    mutationFn: (data: Partial<AnalyticalAxis>) => analyticalAxisService.create(data),
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
    onSuccess: (_, { id }) => {
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
 * COMPTABILITÉ ANALYTIQUE - CENTRES
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
    queryFn: () => analyticalCentersService.getById(id),
    enabled: !!id,
  });
};

export const useCentersByAxis = (axeId: string, params?: QueryParams) => {
  return useQuery({
    queryKey: queryKeys.analytics.centers.byAxis(axeId),
    queryFn: () => analyticalCentersService.getByAxis(axeId, params),
    enabled: !!axeId,
  });
};

export const useActiveAnalyticalCenters = (axeId?: string) => {
  return useQuery({
    queryKey: ['analyticalCenters', 'active', axeId],
    queryFn: () => analyticalCentersService.getActiveCenters(axeId),
  });
};

export const useCentersHierarchy = (axeId?: string) => {
  return useQuery({
    queryKey: queryKeys.analytics.centers.hierarchy(axeId),
    queryFn: () => analyticalCentersService.getHierarchy(axeId),
  });
};

export const useCentersByLevel = (niveau: number, axeId?: string) => {
  return useQuery({
    queryKey: ['analyticalCenters', 'byLevel', niveau, axeId],
    queryFn: () => analyticalCentersService.getByLevel(niveau, axeId),
  });
};

export const useCenterDistributions = (
  centerId: string,
  params?: { date_debut?: string; date_fin?: string }
) => {
  return useQuery({
    queryKey: ['analyticalCenters', 'distributions', centerId, params],
    queryFn: () => analyticalCentersService.getDistributions(centerId, params),
    enabled: !!centerId,
  });
};

export const useCreateAnalyticalCenter = () => {
  return useMutation({
    mutationFn: (data: Partial<AnalyticalCenter>) => analyticalCentersService.create(data),
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
    onSuccess: (_, { id }) => {
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
    queryFn: () => budgetsService.getByFiscalYear(exerciceId, params),
    enabled: !!exerciceId,
  });
};

export const useActiveBudget = (exerciceId?: string) => {
  return useQuery({
    queryKey: queryKeys.budgets.budgets.active(exerciceId),
    queryFn: () => budgetsService.getActiveBudget(exerciceId),
  });
};

export const useBudgetControls = (budgetId: string) => {
  return useQuery({
    queryKey: queryKeys.budgets.budgets.controls(budgetId),
    queryFn: () => budgetsService.getControls(budgetId),
    enabled: !!budgetId,
  });
};

export const useBudgetExecutionReport = (budgetId: string) => {
  return useQuery({
    queryKey: ['budgets', 'executionReport', budgetId],
    queryFn: () => budgetsService.generateExecutionReport(budgetId),
    enabled: !!budgetId,
  });
};

export const useCreateBudget = () => {
  return useMutation({
    mutationFn: (data: Partial<Budget>) => budgetsService.create(data),
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
    onSuccess: (_, { id }) => {
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
    mutationFn: (id: string) => budgetsService.validate(id),
    onSuccess: (_, id) => {
      invalidateQueries.budgets();
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.budgets.detail(id) });
    },
  });
};

export const useCloseBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => budgetsService.close(id),
    onSuccess: (_, id) => {
      invalidateQueries.budgets();
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.budgets.detail(id) });
    },
  });
};

export const useDuplicateBudget = () => {
  return useMutation({
    mutationFn: ({ id, nouveauExercice }: { id: string; nouveauExercice: string }) =>
      budgetsService.duplicate(id, nouveauExercice),
    onSuccess: () => {
      invalidateQueries.budgets();
    },
  });
};

/**
 * ========================================
 * CONTRÔLE BUDGÉTAIRE
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
    queryFn: () => budgetControlService.getByBudget(budgetId, params),
    enabled: !!budgetId,
  });
};

export const useBudgetOverruns = (budgetId?: string) => {
  return useQuery({
    queryKey: queryKeys.budgets.controls.overruns(budgetId),
    queryFn: () => budgetControlService.getOverruns(budgetId),
  });
};

export const useRecalculateBudgetControls = () => {
  return useMutation({
    mutationFn: (budgetId: string) => budgetControlService.recalculate(budgetId),
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
    queryFn: () => budgetControlService.checkAvailability(params),
    enabled: !!(params.budget && params.compte && params.montant),
  });
};

/**
 * ========================================
 * DÉCLARATIONS FISCALES
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
    queryFn: () => taxDeclarationsService.getByType(type, params),
    enabled: !!type,
  });
};

export const useOverdueTaxDeclarations = () => {
  return useQuery({
    queryKey: queryKeys.taxation.declarations.overdue,
    queryFn: () => taxDeclarationsService.getOverdue(),
  });
};

export const useUpcomingTaxDeclarations = (jours: number = 30) => {
  return useQuery({
    queryKey: queryKeys.taxation.declarations.upcoming(jours),
    queryFn: () => taxDeclarationsService.getUpcoming(jours),
  });
};

export const useFiscalCalendar = (params?: { annee?: number; type?: string }) => {
  return useQuery({
    queryKey: queryKeys.taxation.declarations.calendar(params),
    queryFn: () => taxDeclarationsService.getFiscalCalendar(params),
  });
};

export const useCreateTaxDeclaration = () => {
  return useMutation({
    mutationFn: (data: Partial<TaxDeclaration>) => taxDeclarationsService.create(data),
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
    onSuccess: (_, { id }) => {
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
    mutationFn: (id: string) => taxDeclarationsService.calculate(id),
    onSuccess: (_, id) => {
      invalidateQueries.taxDeclarations();
      queryClient.invalidateQueries({ queryKey: queryKeys.taxation.declarations.detail(id) });
    },
  });
};

export const useMarkTaxDeclarationAsSubmitted = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dateDeclaration }: { id: string; dateDeclaration: string }) =>
      taxDeclarationsService.markAsSubmitted(id, dateDeclaration),
    onSuccess: (_, { id }) => {
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
    }) => taxDeclarationsService.markAsPaid(id, montantPaye, datePaiement),
    onSuccess: (_, { id }) => {
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
    }) => taxDeclarationsService.uploadDeclarationFile(declarationId, file, onProgress),
    onSuccess: (data) => {
      invalidateQueries.taxDeclarations();
      queryClient.invalidateQueries({
        queryKey: queryKeys.taxation.declarations.detail(data.id),
      });
    },
  });
};