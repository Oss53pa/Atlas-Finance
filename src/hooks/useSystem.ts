import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { systemService, SystemInfo, SystemStats, SystemModule, SearchResult } from '../services/system-complete.service';
import { queryKeys } from '../lib/react-query';

export const useSystemInfo = () => {
  return useQuery({
    queryKey: queryKeys.system.info(),
    queryFn: () => systemService.getInfo(),
    staleTime: 10 * 60 * 1000,
  });
};

export const useSystemStats = () => {
  return useQuery({
    queryKey: queryKeys.system.stats(),
    queryFn: () => systemService.getStats(),
    staleTime: 2 * 60 * 1000,
  });
};

export const useSystemModules = () => {
  return useQuery({
    queryKey: queryKeys.system.modules(),
    queryFn: () => systemService.getModules(),
    staleTime: 10 * 60 * 1000,
  });
};

export const useGlobalSearch = () => {
  return useMutation({
    mutationFn: (query: string) => systemService.globalSearch(query),
  });
};