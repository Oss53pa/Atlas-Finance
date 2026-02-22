/**
 * DataContext — Provider React pour l'accès aux données.
 *
 * Fournit un DataAdapter (local/saas/hybrid) via React context.
 * Hooks exposés :
 * - useData()          → accès direct au DataAdapter
 * - useAdapterQuery()  → requête réactive (remplace useLiveQuery)
 *
 * Le mode est déterminé par VITE_DATA_MODE (env) :
 * - "local"   → DexieAdapter (IndexedDB, défaut)
 * - "saas"    → SupabaseAdapter (PostgreSQL via Supabase)
 * - "hybrid"  → HybridAdapter (local + sync cloud)
 */
import React, { createContext, useContext, useMemo, useRef, useState, useEffect, useCallback } from 'react'
import type { DataAdapter, DataMode } from '@atlas/data'
import { DexieAdapter } from '@atlas/data'

// ============================================================================
// CONTEXT
// ============================================================================

interface DataContextValue {
  adapter: DataAdapter
  mode: DataMode
  isOnline: boolean
}

const DataContext = createContext<DataContextValue | null>(null)

// ============================================================================
// PROVIDER
// ============================================================================

interface DataProviderProps {
  children: React.ReactNode
  /** Override pour forcer un mode (utile en tests) */
  forceMode?: DataMode
  /** Override pour injecter un adapter personnalisé (utile en tests) */
  forceAdapter?: DataAdapter
}

export function DataProvider({ children, forceMode, forceAdapter }: DataProviderProps) {
  const [online, setOnline] = useState(true)

  const adapter = useMemo<DataAdapter>(() => {
    if (forceAdapter) return forceAdapter

    const envMode = (forceMode || import.meta.env.VITE_DATA_MODE || 'local') as DataMode

    switch (envMode) {
      case 'saas': {
        // Import dynamique pour ne pas bundler Supabase en mode local
        // En attendant la migration complète, fallback sur DexieAdapter
        console.warn('[DataProvider] SaaS mode requested but SupabaseAdapter not yet wired. Falling back to local.')
        return new DexieAdapter()
      }
      case 'hybrid': {
        console.warn('[DataProvider] Hybrid mode requested but HybridAdapter not yet wired. Falling back to local.')
        return new DexieAdapter()
      }
      case 'local':
      default:
        return new DexieAdapter()
    }
  }, [forceMode, forceAdapter])

  const mode = adapter.getMode()

  // Poll online status
  useEffect(() => {
    let mounted = true
    const check = async () => {
      const result = await adapter.isOnline()
      if (mounted) setOnline(result)
    }
    check()

    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      mounted = false
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [adapter])

  const value = useMemo<DataContextValue>(() => ({
    adapter,
    mode,
    isOnline: online,
  }), [adapter, mode, online])

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  )
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * useData() — Accès direct au DataAdapter.
 *
 * Usage :
 * ```ts
 * const { adapter, mode, isOnline } = useData()
 * const entries = await adapter.getAll('journalEntries')
 * ```
 */
export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) {
    throw new Error('useData() must be used within a <DataProvider>')
  }
  return ctx
}

/**
 * useAdapterQuery() — Requête réactive via DataAdapter.
 *
 * Remplace useLiveQuery() de Dexie. Fonctionne avec tous les modes.
 *
 * Usage :
 * ```ts
 * const entries = useAdapterQuery(
 *   (adapter) => adapter.getAll('journalEntries'),
 *   [],       // deps
 *   []        // defaultValue
 * )
 * ```
 *
 * Note : En mode local (Dexie), les composants existants peuvent continuer
 * à utiliser useLiveQuery directement. Ce hook est destiné aux nouveaux
 * composants et à la migration progressive.
 */
export function useAdapterQuery<T>(
  queryFn: (adapter: DataAdapter) => Promise<T>,
  deps: React.DependencyList = [],
  defaultValue: T,
): { data: T; loading: boolean; error: Error | null; refetch: () => void } {
  const { adapter } = useData()
  const [data, setData] = useState<T>(defaultValue)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const mountedRef = useRef(true)
  const versionRef = useRef(0)

  const execute = useCallback(async () => {
    const version = ++versionRef.current
    setLoading(true)
    setError(null)

    try {
      const result = await queryFn(adapter)
      if (mountedRef.current && version === versionRef.current) {
        setData(result)
      }
    } catch (err) {
      if (mountedRef.current && version === versionRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)))
      }
    } finally {
      if (mountedRef.current && version === versionRef.current) {
        setLoading(false)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, ...deps])

  useEffect(() => {
    mountedRef.current = true
    execute()
    return () => { mountedRef.current = false }
  }, [execute])

  return { data, loading, error, refetch: execute }
}

/**
 * useAdapterMutation() — Mutation via DataAdapter avec invalidation.
 *
 * Usage :
 * ```ts
 * const { mutate, loading } = useAdapterMutation()
 * await mutate((adapter) => adapter.create('accounts', newAccount))
 * ```
 */
export function useAdapterMutation() {
  const { adapter } = useData()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const mutate = useCallback(async (
    mutationFn: (adapter: DataAdapter) => Promise<unknown>
  ): Promise<unknown> => {
    setLoading(true)
    setError(null)
    try {
      const result = await mutationFn(adapter)
      return result
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      throw e
    } finally {
      setLoading(false)
    }
  }, [adapter])

  return { mutate, loading, error }
}
