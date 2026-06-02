/**
 * @atlas/data — HybridAdapter
 *
 * Mode hybride : lecture locale (DexieAdapter) + écriture double
 * (local + queue de sync vers Supabase).
 *
 * Stratégie :
 * - Lectures : toujours depuis IndexedDB (rapide, offline-first)
 * - Écritures : local immédiat + enqueue pour push cloud
 * - Sync : pull périodique depuis Supabase, merge par timestamp
 */
import type {
  JournalEntry,
  AuditEntry,
  AccountBalance,
  TrialBalanceRow,
  ChangeSet,
  ChangeRecord,
  SyncResult,
} from '@atlas/shared'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { DataAdapter, DataMode, TableName, QueryFilters } from '../DataAdapter'
import { DexieAdapter } from './DexieAdapter'
import { SupabaseAdapter } from './SupabaseAdapter'

/** Intervalle de sync périodique (push + pull) quand l'app est en ligne. */
const SYNC_INTERVAL_MS = 30_000
/** Clé settings où la file de sync est persistée (survit aux reloads/crashs). */
const SYNC_QUEUE_KEY = 'syncQueue'

interface SyncQueueItem {
  id: string
  table: TableName
  action: 'CREATE' | 'UPDATE' | 'DELETE'
  payload: any
  timestamp: string
  retries: number
}

export class HybridAdapter implements DataAdapter {
  private local: DexieAdapter
  private remote: SupabaseAdapter
  private syncQueue: SyncQueueItem[] = []
  private syncing = false
  private syncTimer: ReturnType<typeof setInterval> | null = null
  private autoSyncStarted = false
  /** Résolue une fois la file persistée chargée depuis IndexedDB. */
  private readyPromise: Promise<void>

  constructor(
    dbName: string | undefined,
    supabaseUrl: string,
    supabaseKey: string,
    tenantId: string,
    existingClient?: SupabaseClient,
  ) {
    this.local = new DexieAdapter(dbName)
    // CRITICAL : transmettre le client Supabase authentifié (sinon l'adapter
    // distant tourne en anon → 'permission denied' sur tout INSERT/UPDATE/DELETE).
    this.remote = new SupabaseAdapter(supabaseUrl, supabaseKey, tenantId, existingClient)
    // Charger la file de sync persistée (lecture IndexedDB, non bloquante).
    // Le constructeur reste SANS effet de bord réseau/timer → testable.
    this.readyPromise = this.loadQueue()
  }

  getMode(): DataMode { return 'hybrid' }

  /** Met à jour le tenantId du remote (appelé par DataContext après login). */
  setTenantId(tenantId: string): void {
    this.remote.setTenantId(tenantId)
  }

  /** À attendre dans les tests pour garantir que la file persistée est chargée. */
  whenReady(): Promise<void> { return this.readyPromise }

  async isOnline(): Promise<boolean> {
    return this.remote.isOnline()
  }

  // ---- CRUD — lecture locale, écriture double ----

  async getById<T>(table: TableName, id: string): Promise<T | null> {
    return this.local.getById<T>(table, id)
  }

  async getAll<T>(table: TableName, filters?: QueryFilters): Promise<T[]> {
    return this.local.getAll<T>(table, filters)
  }

  // A6 — pagination keyset (déléguée au local, comme getAll)
  async getPage<T>(table: TableName, opts?: import('../DataAdapter').PageOptions): Promise<import('../DataAdapter').PagedResult<T>> {
    if (typeof this.local.getPage === 'function') return this.local.getPage<T>(table, opts)
    const rows = await this.local.getAll<T>(table)
    return { rows, nextCursor: null, hasMore: false }
  }

  async create<T>(table: TableName, data: any, initiatedBy?: string): Promise<T> {
    const record = await this.local.create<T>(table, data, initiatedBy)
    await this.enqueue(table, 'CREATE', record)
    return record
  }

  async update<T>(table: TableName, id: string, data: any, initiatedBy?: string): Promise<T> {
    const record = await this.local.update<T>(table, id, data, initiatedBy)
    await this.enqueue(table, 'UPDATE', { id, ...data })
    return record
  }

  async delete(table: TableName, id: string, initiatedBy?: string): Promise<void> {
    await this.local.delete(table, id, initiatedBy)
    await this.enqueue(table, 'DELETE', { id })
  }

  async count(table: TableName, filters?: QueryFilters): Promise<number> {
    return this.local.count(table, filters)
  }

  // ---- Requêtes comptables (lecture locale) ----

  async getJournalEntries(filters?: QueryFilters): Promise<JournalEntry[]> {
    return this.local.getJournalEntries(filters)
  }

  async getAccountBalance(prefixes: string[], dateRange?: { start: string; end: string }): Promise<AccountBalance> {
    return this.local.getAccountBalance(prefixes, dateRange)
  }

  async getTrialBalance(dateRange?: { start: string; end: string }): Promise<TrialBalanceRow[]> {
    return this.local.getTrialBalance(dateRange)
  }

  async getBalanceByAccount(dateRange?: { start: string; end: string }): Promise<Map<string, AccountBalance>> {
    return this.local.getBalanceByAccount(dateRange)
  }

  async saveJournalEntry(entry: Omit<JournalEntry, 'id' | 'createdAt'>): Promise<JournalEntry> {
    const record = await this.local.saveJournalEntry(entry)
    await this.enqueue('journalEntries', 'CREATE', record)
    return record
  }

  async transaction<T>(tables: TableName[], fn: (adapter: DataAdapter) => Promise<T>): Promise<T> {
    // Transactions run locally; sync queue handles remote propagation
    return this.local.transaction(tables, fn)
  }

  // ---- Audit ----

  async logAudit(event: Omit<AuditEntry, 'id' | 'hash'>): Promise<void> {
    await this.local.logAudit(event)
  }

  async getAuditTrail(filters?: QueryFilters): Promise<AuditEntry[]> {
    return this.local.getAuditTrail(filters)
  }

  // ---- Sync ----

  private async enqueue(table: TableName, action: SyncQueueItem['action'], payload: any): Promise<void> {
    this.syncQueue.push({
      id: crypto.randomUUID(),
      table,
      action,
      payload,
      timestamp: new Date().toISOString(),
      retries: 0,
    })
    // Persister AVANT de rendre la main : une saisie hors-ligne ne doit JAMAIS
    // être perdue si l'app est rechargée/fermée avant le prochain push.
    await this.persistQueue()
  }

  /** Vrai si un enregistrement a une écriture locale en attente (non poussée). */
  private hasPending(table: TableName, id: string): boolean {
    return this.syncQueue.some(q => q.table === table && q.payload?.id === id)
  }

  /** Charge la file de sync persistée depuis la table settings (IndexedDB). */
  private async loadQueue(): Promise<void> {
    try {
      const row = await this.local.getById<{ key: string; value: string }>('settings', SYNC_QUEUE_KEY)
      if (row?.value) {
        const parsed = JSON.parse(row.value)
        if (Array.isArray(parsed)) this.syncQueue = parsed
      }
    } catch { /* absente ou corrompue → on repart d'une file vide */ }
  }

  /** Écrit la file courante dans settings (upsert). */
  private async persistQueue(): Promise<void> {
    await this.upsertSetting(SYNC_QUEUE_KEY, JSON.stringify(this.syncQueue))
  }

  /**
   * Upsert d'un setting keyé. NB : Dexie.update() sur une clé absente ne lève
   * PAS d'erreur (retourne 0) — un simple try/catch ne suffit donc pas pour
   * détecter l'insertion initiale. On teste l'existence explicitement.
   */
  private async upsertSetting(key: string, value: string): Promise<void> {
    try {
      const existing = await this.local.getById('settings', key)
      if (existing) {
        await this.local.update('settings', key, { key, value })
      } else {
        await this.local.create('settings', { key, value })
      }
    } catch { /* persistance best-effort */ }
  }

  // ---- Orchestration de la sync automatique ----

  private handleOnline = (): void => { void this.syncNow() }

  /**
   * Démarre la sync automatique : sync immédiate, à la reconnexion (event
   * 'online') et périodiquement. Idempotent. Appelé par DataContext (mode hybrid).
   */
  startAutoSync(): void {
    if (this.autoSyncStarted) return
    this.autoSyncStarted = true
    void this.readyPromise.then(() => this.syncNow())
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline)
    }
    this.syncTimer = setInterval(() => { void this.syncNow() }, SYNC_INTERVAL_MS)
  }

  /** Stoppe les déclencheurs auto (timer + listener). */
  dispose(): void {
    if (this.syncTimer) { clearInterval(this.syncTimer); this.syncTimer = null }
    if (typeof window !== 'undefined') window.removeEventListener('online', this.handleOnline)
    this.autoSyncStarted = false
  }

  /** Flush la file vers le cloud puis tire les changements distants. */
  async syncNow(): Promise<SyncResult> {
    await this.readyPromise
    const since = (await this.getLastSyncTimestamp()) ?? new Date(0).toISOString()
    const result = await this.pushChanges({ changes: [], since })
    try { await this.pullChanges(since) } catch { /* pull best-effort */ }
    return result
  }

  async getLastSyncTimestamp(): Promise<string | null> {
    const settings = await this.local.getById<{ key: string; value: string }>('settings', 'lastSyncTimestamp')
    return settings?.value ?? null
  }

  async pushChanges(changes: ChangeSet): Promise<SyncResult> {
    if (this.syncing) return { pushed: 0, conflicts: 0, errors: ['Sync already in progress'] }
    this.syncing = true

    let pushed = 0
    let conflicts = 0
    const errors: string[] = []

    try {
      const online = await this.isOnline()
      if (!online) {
        return { pushed: 0, conflicts: 0, errors: ['Offline'] }
      }

      // Process queue items
      const pending = [...this.syncQueue]
      for (const item of pending) {
        try {
          switch (item.action) {
            case 'CREATE':
              await this.remote.create(item.table, item.payload)
              break
            case 'UPDATE':
              await this.remote.update(item.table, item.payload.id, item.payload)
              break
            case 'DELETE':
              await this.remote.delete(item.table, item.payload.id)
              break
          }
          pushed++
          // Remove from queue on success
          const idx = this.syncQueue.findIndex(q => q.id === item.id)
          if (idx !== -1) this.syncQueue.splice(idx, 1)
        } catch (err) {
          item.retries++
          if (item.retries >= 3) {
            conflicts++
            errors.push(`${item.table}/${item.payload?.id}: ${err instanceof Error ? err.message : 'Unknown error'}`)
            const idx = this.syncQueue.findIndex(q => q.id === item.id)
            if (idx !== -1) this.syncQueue.splice(idx, 1)
          }
        }
      }

      // Persister la file après traitement (items réussis retirés, retries à jour)
      await this.persistQueue()

      // Update last sync timestamp
      const now = new Date().toISOString()
      await this.upsertSetting('lastSyncTimestamp', now)

      return { pushed, conflicts, errors }
    } finally {
      this.syncing = false
    }
  }

  async pullChanges(since: string): Promise<ChangeSet> {
    // Pull remote records updated since last sync
    const result: ChangeSet = { changes: [], since }

    const online = await this.isOnline()
    if (!online) return result

    const tables: TableName[] = [
      'journalEntries', 'accounts', 'thirdParties', 'assets',
      'fiscalYears', 'budgetLines', 'closureSessions', 'provisions',
      'exchangeRates', 'hedgingPositions', 'revisionItems', 'inventoryItems',
      'stockMovements', 'recoveryCases',
      'aliasTiers', 'aliasPrefixConfig',
    ]

    for (const table of tables) {
      try {
        const remoteRecords = await this.remote.getAll<any>(table, {
          orderBy: { field: 'updated_at', direction: 'desc' },
        })

        // Filter by timestamp
        const newer = remoteRecords.filter((r: any) =>
          r.updated_at && r.updated_at > since
        )

        for (const record of newer) {
          const change: ChangeRecord = {
            type: 'UPDATE',
            table,
            id: record.id,
            data: record,
            timestamp: record.updated_at,
            synced: false,
          }
          result.changes.push(change)
        }
      } catch {
        // Skip tables that fail (may not exist yet on remote)
      }
    }

    // Apply pulled changes to local DB
    for (const change of result.changes) {
      // Politique de conflit : une écriture locale en attente (non encore poussée)
      // est prioritaire — on ne l'écrase JAMAIS par la version distante.
      if (this.hasPending(change.table as TableName, change.id)) {
        continue
      }
      try {
        const existing = await this.local.getById(change.table as TableName, change.id)
        if (existing) {
          await this.local.update(change.table as TableName, change.id, change.data)
        } else {
          await this.local.create(change.table as TableName, change.data)
        }
        change.synced = true
      } catch {
        // Conflict — skip for now
      }
    }

    return result
  }

  /** Access underlying local adapter for legacy compatibility */
  getLocalAdapter(): DexieAdapter {
    return this.local
  }

  /** Get current sync queue size */
  getPendingCount(): number {
    return this.syncQueue.length
  }
}
