/**
 * usePaginatedTable — Pagination KEYSET réutilisable (A6, Cahier v3 §5).
 *
 * Charge les données 20 lignes/page côté serveur via `adapter.getPage` (curseur),
 * sans COUNT global → scalable sur les grosses tables (grand livre 10k+,
 * écritures, balance…). Modèle « charger plus » (append), idéal pour le keyset.
 * Repli automatique sur `getAll` (tronqué) si l'adapter n'implémente pas getPage.
 *
 * Exemple :
 *   const { rows, loading, hasMore, loadMore } = usePaginatedTable<JournalEntry>(
 *     'journalEntries', { pageSize: 20, sortField: 'date', direction: 'desc' }
 *   );
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useData } from '../contexts/DataContext';
import type { TableName, PageOptions, PagedResult } from '@atlas/data';

export interface UsePaginatedTableOptions extends Omit<PageOptions, 'cursor'> {
  /** Charger la 1re page au montage (défaut true). */
  auto?: boolean;
}

export interface UsePaginatedTableResult<T> {
  rows: T[];
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  /** Charge la page suivante (append). */
  loadMore: () => Promise<void>;
  /** Réinitialise et recharge depuis le début. */
  reset: () => void;
  pageSize: number;
}

export function usePaginatedTable<T = unknown>(
  table: TableName,
  options: UsePaginatedTableOptions = {},
): UsePaginatedTableResult<T> {
  const { adapter } = useData();
  const { pageSize = 20, sortField = 'id', direction = 'asc', where, auto = true } = options;

  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cursorRef = useRef<string | number | null>(null);
  const doneRef = useRef(false);
  const whereKey = JSON.stringify(where ?? null);

  const loadMore = useCallback(async () => {
    if (loading || doneRef.current) return;
    setLoading(true);
    setError(null);
    try {
      let res: PagedResult<T>;
      if (typeof adapter.getPage === 'function') {
        res = await adapter.getPage<T>(table, { pageSize, sortField, direction, where, cursor: cursorRef.current });
      } else {
        const all = await adapter.getAll<T>(table, where ? { where } : undefined);
        res = { rows: all.slice(0, pageSize), nextCursor: null, hasMore: all.length > pageSize };
      }
      setRows(prev => [...prev, ...res.rows]);
      cursorRef.current = res.nextCursor;
      setHasMore(res.hasMore);
      if (!res.hasMore) doneRef.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, table, pageSize, sortField, direction, whereKey, loading]);

  const reset = useCallback(() => {
    cursorRef.current = null;
    doneRef.current = false;
    setRows([]);
    setHasMore(false);
    setError(null);
  }, []);

  // Recharger depuis le début quand les paramètres changent.
  useEffect(() => {
    cursorRef.current = null;
    doneRef.current = false;
    setRows([]);
    setHasMore(false);
    if (auto) void loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, pageSize, sortField, direction, whereKey]);

  return { rows, loading, hasMore, error, loadMore, reset, pageSize };
}

export default usePaginatedTable;
