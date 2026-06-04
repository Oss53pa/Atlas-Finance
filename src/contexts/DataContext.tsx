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
import { DexieAdapter, SupabaseAdapter, HybridAdapter } from '@atlas/data'
import { supabase as globalSupabaseClient } from '@/lib/supabase'
import { queryClient } from '@/lib/react-query'

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

  // tenantId résolu depuis la session authentifiée. Initialisé depuis
  // localStorage (rechargements), remplacé par la valeur certifiée du profil dès
  // que la session est disponible. Le garder dans un STATE — au lieu de muter
  // l'adapter via setTenantId — garantit que l'adapter est RECRÉÉ quand le tenant
  // se résout, ce qui relance TOUS les effets consommateurs (clés sur [adapter])
  // avec le bon tenant. Sans ça, les requêtes lancées au montage (ex. le
  // dashboard qui appelle adapter.count) partent avec 'default' → 0 ligne, et ne
  // se rafraîchissent jamais. Race FATALE en navigation privée (localStorage vide
  // → 'default' systématique → toutes les tables affichent 0 alors que les
  // données existent côté Supabase).
  const [resolvedTenantId, setResolvedTenantId] = useState<string>(
    () => localStorage.getItem('atlas-tenant-id') || 'default',
  )

  const adapter = useMemo<DataAdapter>(() => {
    if (forceAdapter) return forceAdapter

    const envMode = (forceMode || import.meta.env.VITE_DATA_MODE || 'local') as DataMode

    switch (envMode) {
      case 'saas': {
        const url = import.meta.env.VITE_SUPABASE_URL
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY
        if (!url || !key || url.includes('YOUR_PROJECT_ID')) {
          return new DexieAdapter()
        }
        // tenantId synchronise depuis le profile par AuthContext apres login
        const tenantId = resolvedTenantId
        // CRITICAL : passer le client supabase global (avec session authentifiee
        // dans sessionStorage cle 'atlas-fna-auth'). Sinon l'adapter cree son
        // propre client sans session -> toutes les operations tournent en anon
        // et echouent avec 'permission denied' sur INSERT/UPDATE/DELETE.
        return new SupabaseAdapter(url, key, tenantId, globalSupabaseClient as unknown as ConstructorParameters<typeof SupabaseAdapter>[3])
      }
      case 'hybrid': {
        const url = import.meta.env.VITE_SUPABASE_URL
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY
        if (!url || !key || url.includes('YOUR_PROJECT_ID')) {
          // Supabase non configuré → local pur (offline only), pas de sync possible
          return new DexieAdapter()
        }
        const tenantId = resolvedTenantId
        // Même client global authentifié que le mode saas (voir note CRITICAL ci-dessus)
        return new HybridAdapter(
          undefined,
          url,
          key,
          tenantId,
          globalSupabaseClient as unknown as ConstructorParameters<typeof HybridAdapter>[4],
        )
      }
      case 'local':
      default:
        return new DexieAdapter()
    }
  }, [forceMode, forceAdapter, resolvedTenantId])

  const mode = adapter.getMode()

  // -------------------------------------------------------------------------
  // Sécurité : synchroniser le tenantId depuis la session Supabase authentifiée
  //
  // Le tenantId initial est lu depuis localStorage (compatibilité pre-auth),
  // ce qui expose une surface XSS. Dès que la session est restaurée ou change,
  // on écrase ce tenantId par celui dérivé de la session serveur :
  //   1. user_metadata.company_id  (renseigné par le serveur à la création du user)
  //   2. table profiles.company_id (requête RLS-protégée, sans filtre tenant)
  //
  // setTenantId() est une opération synchrone — toutes les requêtes suivantes
  // utilisent le nouveau tenantId certifié.
  // -------------------------------------------------------------------------
  useEffect(() => {
    // saas ET hybrid disposent tous deux d'un remote Supabase à recibler.
    if (mode !== 'saas' && mode !== 'hybrid') return

    // Persiste le tenant certifié et déclenche la recréation de l'adapter
    // UNIQUEMENT si le tenant change réellement (évite le churn sur les refresh
    // de token, qui conservent le même tenant). Le setState fonctionnel évite de
    // dépendre de resolvedTenantId dans les deps de l'effet.
    const commitTenant = (companyId?: string | null) => {
      if (!companyId) return
      localStorage.setItem('atlas-tenant-id', companyId)
      setResolvedTenantId(prev => (prev === companyId ? prev : companyId))
    }

    const applyAuthenticatedTenant = async (userId: string) => {
      // Priorité 1 : user_metadata.company_id (set côté serveur via Auth hook)
      const { data: { user } } = await globalSupabaseClient.auth.getUser()
      const metaCompanyId: string | undefined = user?.user_metadata?.company_id
      if (metaCompanyId) {
        commitTenant(metaCompanyId)
        return
      }

      // Priorité 2 : table profiles (RLS filtrée par id = auth.uid())
      const { data: profile } = await globalSupabaseClient
        .from('profiles')
        .select('company_id')
        .eq('id', userId)
        .maybeSingle() as { data: { company_id?: string } | null }
      commitTenant(profile?.company_id)
    }

    // Vérifier la session courante au montage (session déjà restaurée)
    globalSupabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) {
        applyAuthenticatedTenant(session.user.id)
      }
    })

    // Écouter les changements de session ultérieurs (login, token refresh, logout)
    const { data: { subscription } } = globalSupabaseClient.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user?.id) {
          applyAuthenticatedTenant(session.user.id)
        }
      }
    )

    return () => { subscription.unsubscribe() }
    // Pas de dépendance [adapter] : l'effet ne touche plus l'adapter (il pilote
    // resolvedTenantId via state). Re-souscrire à chaque recréation d'adapter
    // serait inutile. mode suffit (et reste stable tant que VITE_DATA_MODE l'est).
  }, [mode])

  // -------------------------------------------------------------------------
  // Invalidation du cache React Query à la résolution du tenant.
  //
  // La recréation de l'adapter (ci-dessus) relance les consommateurs en
  // useEffect([adapter]). MAIS les composants en useQuery ont une queryKey qui
  // n'inclut PAS le tenant : s'ils ont chargé au montage avec le tenant
  // 'default' (race), React Query a mis EN CACHE un résultat vide et ne
  // refetchera jamais (clé inchangée). On invalide donc tout le cache dès que
  // le tenant certifié est connu → refetch avec l'adapter recréé (bon tenant).
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (mode !== 'saas' && mode !== 'hybrid') return
    if (resolvedTenantId === 'default') return
    queryClient.invalidateQueries()
  }, [resolvedTenantId, mode])

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

  // Démarrer la synchro automatique Dexie ↔ Supabase (mode hybride uniquement).
  // Le moteur gère : sync au démarrage, à la reconnexion, et périodiquement.
  useEffect(() => {
    if (mode !== 'hybrid') return
    const syncable = adapter as unknown as { startAutoSync?: () => void; dispose?: () => void }
    syncable.startAutoSync?.()
    return () => syncable.dispose?.()
  }, [adapter, mode])

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
