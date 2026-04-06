// @ts-nocheck

/**
 * HOOKS REACT QUERY - PARAMETRES
 *
 * Hooks pour les parametres systeme et configuration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parametersService } from '../services/parameters.service';
import type {
  ParametreSysteme,
  ConfigurationSociete,
  JournalParametres,
  NotificationParametres,
  ParameterCategory,
  ParameterQueryParams,
  JournalQueryParams,
  NotificationQueryParams,
  BulkParameterUpdate,
} from '../services/parameters.service';

/**
 * ========================================
 * PARAMETRES SYSTEME
 * ========================================
 */

export const useParametresSysteme = (params?: ParameterQueryParams) => {
  return useQuery({
    queryKey: ['parametres-systeme', params],
    queryFn: () => parametersService.getParametresSysteme(params),
  });
};

export const useParametreSysteme = (id: string) => {
  return useQuery({
    queryKey: ['parametres-systeme', id],
    queryFn: () => parametersService.getParametreSystemeById(id),
    enabled: !!id,
  });
};

export const useParametreByKey = (cle: string) => {
  return useQuery({
    queryKey: ['parametres-systeme', 'by-key', cle],
    queryFn: () => parametersService.getParametreByKey(cle),
    enabled: !!cle,
  });
};

export const useParametresByCategory = (categorie: ParameterCategory) => {
  return useQuery({
    queryKey: ['parametres-systeme', 'by-category', categorie],
    queryFn: () => parametersService.getParametresByCategory(categorie),
    enabled: !!categorie,
  });
};

export const useParametresByGroup = (groupe: string) => {
  return useQuery({
    queryKey: ['parametres-systeme', 'by-group', groupe],
    queryFn: () => parametersService.getParametresByGroup(groupe),
    enabled: !!groupe,
  });
};

export const useParameterCategories = () => {
  return useQuery({
    queryKey: ['parametres-systeme', 'categories'],
    queryFn: () => parametersService.getCategories(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useVisibleParametres = () => {
  return useQuery({
    queryKey: ['parametres-systeme', 'visible'],
    queryFn: () => parametersService.getParametresVisiblesOnly(),
  });
};

export const useCreateParametreSysteme = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<ParametreSysteme>) => parametersService.createParametreSysteme(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parametres-systeme'] });
    },
  });
};

export const useUpdateParametreSysteme = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ParametreSysteme> }) =>
      parametersService.updateParametreSysteme(id, data),
    onSuccess: (_: unknown, { id }: { id: string }) => {
      queryClient.invalidateQueries({ queryKey: ['parametres-systeme'] });
      queryClient.invalidateQueries({ queryKey: ['parametres-systeme', id] });
    },
  });
};

export const useDeleteParametreSysteme = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => parametersService.deleteParametreSysteme(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parametres-systeme'] });
    },
  });
};

export const useResetParametreToDefault = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => parametersService.resetParametreToDefault(id),
    onSuccess: (_: unknown, id: string) => {
      queryClient.invalidateQueries({ queryKey: ['parametres-systeme'] });
      queryClient.invalidateQueries({ queryKey: ['parametres-systeme', id] });
    },
  });
};

export const useBulkUpdateParametres = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (parametres: BulkParameterUpdate) =>
      parametersService.bulkUpdateParametres(parametres),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parametres-systeme'] });
    },
  });
};

/**
 * ========================================
 * CONFIGURATION SOCIETE
 * ========================================
 */

export const useConfigurationsSociete = () => {
  return useQuery({
    queryKey: ['configurations-societe'],
    queryFn: () => parametersService.getConfigurationsSociete(),
  });
};

export const useConfigurationSociete = (id: string) => {
  return useQuery({
    queryKey: ['configurations-societe', id],
    queryFn: () => parametersService.getConfigurationSocieteById(id),
    enabled: !!id,
  });
};

export const useConfigurationByCompany = (societeId: string) => {
  return useQuery({
    queryKey: ['configurations-societe', 'by-company', societeId],
    queryFn: () => parametersService.getConfigurationByCompany(societeId),
    enabled: !!societeId,
  });
};

export const useCreateConfigurationSociete = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<ConfigurationSociete>) =>
      parametersService.createConfigurationSociete(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configurations-societe'] });
    },
  });
};

export const useUpdateConfigurationSociete = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ConfigurationSociete> }) =>
      parametersService.updateConfigurationSociete(id, data),
    onSuccess: (_: unknown, { id }: { id: string }) => {
      queryClient.invalidateQueries({ queryKey: ['configurations-societe'] });
      queryClient.invalidateQueries({ queryKey: ['configurations-societe', id] });
    },
  });
};

export const useDeleteConfigurationSociete = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => parametersService.deleteConfigurationSociete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configurations-societe'] });
    },
  });
};

export const useUploadCompanyLogo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      configId,
      file,
      onProgress,
    }: {
      configId: string;
      file: File;
      onProgress?: (progress: number) => void;
    }) => parametersService.uploadLogo(configId, file, onProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configurations-societe'] });
    },
  });
};

export const useDeleteCompanyLogo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (configId: string) => parametersService.deleteLogo(configId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configurations-societe'] });
    },
  });
};

/**
 * ========================================
 * PARAMETRES JOURNAUX
 * ========================================
 */

export const useJournauxParametres = (params?: JournalQueryParams) => {
  return useQuery({
    queryKey: ['journaux-parametres', params],
    queryFn: () => parametersService.getJournauxParametres(params),
  });
};

export const useJournalParametres = (id: string) => {
  return useQuery({
    queryKey: ['journaux-parametres', id],
    queryFn: () => parametersService.getJournalParametresById(id),
    enabled: !!id,
  });
};

export const useJournauxByCompany = (societeId: string) => {
  return useQuery({
    queryKey: ['journaux-parametres', 'by-company', societeId],
    queryFn: () => parametersService.getJournauxByCompany(societeId),
    enabled: !!societeId,
  });
};

export const useJournauxByType = (typeJournal: string) => {
  return useQuery({
    queryKey: ['journaux-parametres', 'by-type', typeJournal],
    queryFn: () => parametersService.getJournauxByType(typeJournal),
    enabled: !!typeJournal,
  });
};

export const useJournalTypes = () => {
  return useQuery({
    queryKey: ['journaux-parametres', 'types'],
    queryFn: () => parametersService.getJournalTypes(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateJournalParametres = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<JournalParametres>) => parametersService.createJournalParametres(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journaux-parametres'] });
    },
  });
};

export const useUpdateJournalParametres = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<JournalParametres> }) =>
      parametersService.updateJournalParametres(id, data),
    onSuccess: (_: unknown, { id }: { id: string }) => {
      queryClient.invalidateQueries({ queryKey: ['journaux-parametres'] });
      queryClient.invalidateQueries({ queryKey: ['journaux-parametres', id] });
    },
  });
};

export const useDeleteJournalParametres = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => parametersService.deleteJournalParametres(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journaux-parametres'] });
    },
  });
};

export const useIncrementJournalCounter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => parametersService.incrementJournalCounter(id),
    onSuccess: (_: unknown, id: string) => {
      queryClient.invalidateQueries({ queryKey: ['journaux-parametres'] });
      queryClient.invalidateQueries({ queryKey: ['journaux-parametres', id] });
    },
  });
};

/**
 * ========================================
 * PARAMETRES NOTIFICATIONS
 * ========================================
 */

export const useNotificationsParametres = (params?: NotificationQueryParams) => {
  return useQuery({
    queryKey: ['notifications-parametres', params],
    queryFn: () => parametersService.getNotificationsParametres(params),
  });
};

export const useNotificationParametres = (id: string) => {
  return useQuery({
    queryKey: ['notifications-parametres', id],
    queryFn: () => parametersService.getNotificationParametresById(id),
    enabled: !!id,
  });
};

export const useNotificationsByCompany = (societeId: string) => {
  return useQuery({
    queryKey: ['notifications-parametres', 'by-company', societeId],
    queryFn: () => parametersService.getNotificationsByCompany(societeId),
    enabled: !!societeId,
  });
};

export const useActiveNotifications = () => {
  return useQuery({
    queryKey: ['notifications-parametres', 'active'],
    queryFn: () => parametersService.getNotificationsActive(),
  });
};

export const useNotificationEvents = () => {
  return useQuery({
    queryKey: ['notifications-parametres', 'events'],
    queryFn: () => parametersService.getNotificationEvents(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useNotificationTypes = () => {
  return useQuery({
    queryKey: ['notifications-parametres', 'types'],
    queryFn: () => parametersService.getNotificationTypes(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateNotificationParametres = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<NotificationParametres>) =>
      parametersService.createNotificationParametres(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-parametres'] });
    },
  });
};

export const useUpdateNotificationParametres = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NotificationParametres> }) =>
      parametersService.updateNotificationParametres(id, data),
    onSuccess: (_: unknown, { id }: { id: string }) => {
      queryClient.invalidateQueries({ queryKey: ['notifications-parametres'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-parametres', id] });
    },
  });
};

export const useDeleteNotificationParametres = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => parametersService.deleteNotificationParametres(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-parametres'] });
    },
  });
};

export const useToggleNotificationActive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => parametersService.toggleNotificationActive(id),
    onSuccess: (_: unknown, id: string) => {
      queryClient.invalidateQueries({ queryKey: ['notifications-parametres'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-parametres', id] });
    },
  });
};
