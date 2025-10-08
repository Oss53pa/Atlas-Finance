/**
 * HOOKS REACT QUERY - PARAMÈTRES
 *
 * Hooks pour les paramètres système et configuration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidateQueries } from '../lib/react-query';
import {
  parametreSystemeService,
  configurationSocieteService,
  journalParametresService,
  notificationParametresService,
} from '../services/parameters.service';
import type {
  ParametreSysteme,
  ConfigurationSociete,
  JournalParametres,
  NotificationParametres,
  CreateParametreSystemeDto,
  UpdateParametreSystemeDto,
  CreateConfigurationSocieteDto,
  UpdateConfigurationSocieteDto,
  CreateJournalParametresDto,
  UpdateJournalParametresDto,
  CreateNotificationParametresDto,
  UpdateNotificationParametresDto,
  BulkParameterUpdate,
  ParameterQueryParams,
  JournalQueryParams,
  NotificationQueryParams,
  ParameterCategory,
} from '../types/parameters.types';

/**
 * ========================================
 * PARAMÈTRES SYSTÈME
 * ========================================
 */

export const useParametresSysteme = (params?: ParameterQueryParams) => {
  return useQuery({
    queryKey: ['parametres-systeme', params],
    queryFn: () => parametreSystemeService.search(params || {}),
  });
};

export const useParametreSysteme = (id: string) => {
  return useQuery({
    queryKey: ['parametres-systeme', id],
    queryFn: () => parametreSystemeService.getById(id),
    enabled: !!id,
  });
};

export const useParametreByKey = (cle: string) => {
  return useQuery({
    queryKey: ['parametres-systeme', 'by-key', cle],
    queryFn: () => parametreSystemeService.getByKey(cle),
    enabled: !!cle,
  });
};

export const useParametresByCategory = (categorie: ParameterCategory) => {
  return useQuery({
    queryKey: ['parametres-systeme', 'by-category', categorie],
    queryFn: () => parametreSystemeService.getByCategory(categorie),
    enabled: !!categorie,
  });
};

export const useParametresByGroup = (groupe: string) => {
  return useQuery({
    queryKey: ['parametres-systeme', 'by-group', groupe],
    queryFn: () => parametreSystemeService.getByGroup(groupe),
    enabled: !!groupe,
  });
};

export const useParameterCategories = () => {
  return useQuery({
    queryKey: ['parametres-systeme', 'categories'],
    queryFn: () => parametreSystemeService.getCategories(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useVisibleParametres = () => {
  return useQuery({
    queryKey: ['parametres-systeme', 'visible'],
    queryFn: () => parametreSystemeService.getVisibleOnly(),
  });
};

export const useCreateParametreSysteme = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateParametreSystemeDto) => parametreSystemeService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parametres-systeme'] });
    },
  });
};

export const useUpdateParametreSysteme = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateParametreSystemeDto }) =>
      parametreSystemeService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['parametres-systeme'] });
      queryClient.invalidateQueries({ queryKey: ['parametres-systeme', id] });
    },
  });
};

export const useDeleteParametreSysteme = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => parametreSystemeService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parametres-systeme'] });
    },
  });
};

export const useResetParametreToDefault = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => parametreSystemeService.resetToDefault(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['parametres-systeme'] });
      queryClient.invalidateQueries({ queryKey: ['parametres-systeme', id] });
    },
  });
};

export const useBulkUpdateParametres = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (parametres: BulkParameterUpdate) =>
      parametreSystemeService.bulkUpdate(parametres),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parametres-systeme'] });
    },
  });
};

/**
 * ========================================
 * CONFIGURATION SOCIÉTÉ
 * ========================================
 */

export const useConfigurationsSociete = () => {
  return useQuery({
    queryKey: ['configurations-societe'],
    queryFn: () => configurationSocieteService.getAll(),
  });
};

export const useConfigurationSociete = (id: string) => {
  return useQuery({
    queryKey: ['configurations-societe', id],
    queryFn: () => configurationSocieteService.getById(id),
    enabled: !!id,
  });
};

export const useConfigurationByCompany = (societeId: string) => {
  return useQuery({
    queryKey: ['configurations-societe', 'by-company', societeId],
    queryFn: () => configurationSocieteService.getByCompany(societeId),
    enabled: !!societeId,
  });
};

export const useCreateConfigurationSociete = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateConfigurationSocieteDto) =>
      configurationSocieteService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configurations-societe'] });
    },
  });
};

export const useUpdateConfigurationSociete = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateConfigurationSocieteDto }) =>
      configurationSocieteService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['configurations-societe'] });
      queryClient.invalidateQueries({ queryKey: ['configurations-societe', id] });
    },
  });
};

export const useDeleteConfigurationSociete = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => configurationSocieteService.delete(id),
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
    }) => configurationSocieteService.uploadLogo(configId, file, onProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configurations-societe'] });
    },
  });
};

export const useDeleteCompanyLogo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (configId: string) => configurationSocieteService.deleteLogo(configId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configurations-societe'] });
    },
  });
};

/**
 * ========================================
 * PARAMÈTRES JOURNAUX
 * ========================================
 */

export const useJournauxParametres = (params?: JournalQueryParams) => {
  return useQuery({
    queryKey: ['journaux-parametres', params],
    queryFn: () => journalParametresService.search(params || {}),
  });
};

export const useJournalParametres = (id: string) => {
  return useQuery({
    queryKey: ['journaux-parametres', id],
    queryFn: () => journalParametresService.getById(id),
    enabled: !!id,
  });
};

export const useJournauxByCompany = (societeId: string) => {
  return useQuery({
    queryKey: ['journaux-parametres', 'by-company', societeId],
    queryFn: () => journalParametresService.getByCompany(societeId),
    enabled: !!societeId,
  });
};

export const useJournauxByType = (typeJournal: string) => {
  return useQuery({
    queryKey: ['journaux-parametres', 'by-type', typeJournal],
    queryFn: () => journalParametresService.getByType(typeJournal),
    enabled: !!typeJournal,
  });
};

export const useJournalTypes = () => {
  return useQuery({
    queryKey: ['journaux-parametres', 'types'],
    queryFn: () => journalParametresService.getTypes(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateJournalParametres = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateJournalParametresDto) => journalParametresService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journaux-parametres'] });
    },
  });
};

export const useUpdateJournalParametres = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateJournalParametresDto }) =>
      journalParametresService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['journaux-parametres'] });
      queryClient.invalidateQueries({ queryKey: ['journaux-parametres', id] });
    },
  });
};

export const useDeleteJournalParametres = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => journalParametresService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journaux-parametres'] });
    },
  });
};

export const useIncrementJournalCounter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => journalParametresService.incrementCounter(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['journaux-parametres'] });
      queryClient.invalidateQueries({ queryKey: ['journaux-parametres', id] });
    },
  });
};

/**
 * ========================================
 * PARAMÈTRES NOTIFICATIONS
 * ========================================
 */

export const useNotificationsParametres = (params?: NotificationQueryParams) => {
  return useQuery({
    queryKey: ['notifications-parametres', params],
    queryFn: () => notificationParametresService.search(params || {}),
  });
};

export const useNotificationParametres = (id: string) => {
  return useQuery({
    queryKey: ['notifications-parametres', id],
    queryFn: () => notificationParametresService.getById(id),
    enabled: !!id,
  });
};

export const useNotificationsByCompany = (societeId: string) => {
  return useQuery({
    queryKey: ['notifications-parametres', 'by-company', societeId],
    queryFn: () => notificationParametresService.getByCompany(societeId),
    enabled: !!societeId,
  });
};

export const useActiveNotifications = () => {
  return useQuery({
    queryKey: ['notifications-parametres', 'active'],
    queryFn: () => notificationParametresService.getActive(),
  });
};

export const useNotificationEvents = () => {
  return useQuery({
    queryKey: ['notifications-parametres', 'events'],
    queryFn: () => notificationParametresService.getEvents(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useNotificationTypes = () => {
  return useQuery({
    queryKey: ['notifications-parametres', 'types'],
    queryFn: () => notificationParametresService.getNotificationTypes(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateNotificationParametres = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateNotificationParametresDto) =>
      notificationParametresService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-parametres'] });
    },
  });
};

export const useUpdateNotificationParametres = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNotificationParametresDto }) =>
      notificationParametresService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['notifications-parametres'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-parametres', id] });
    },
  });
};

export const useDeleteNotificationParametres = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationParametresService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-parametres'] });
    },
  });
};

export const useToggleNotificationActive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationParametresService.toggleActive(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['notifications-parametres'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-parametres', id] });
    },
  });
};