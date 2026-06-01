import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useData } from '../contexts/DataContext';
import type { TableName } from '@atlas/data';

// Hook React Query avec cache partagé pour adapter.getAll
// Tous les composants qui utilisent la même table partagent le cache
// → 1 seul appel DB au lieu de N

export function useAdapterQueryCached<T = any>(
  table: TableName,
  deps?: Record<string, unknown>,
  staleTimeMs = 3 * 60 * 1000 // 3 minutes par défaut
) {
  const { adapter } = useData();
  const key = deps ? [table, deps] : [table];

  return useQuery({
    queryKey: key,
    queryFn: () => adapter.getAll<T>(table, deps as any),
    staleTime: staleTimeMs,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// Invalidation helper — pour forcer le refetch après mutation
export function useInvalidateTable() {
  const qc = useQueryClient();
  return (table: TableName) => qc.invalidateQueries({ queryKey: [table] });
}
