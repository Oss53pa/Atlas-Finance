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
import type { DataAdapter, DataMode, TableName, QueryFilters } from '../DataAdapter'
import { DexieAdapter } from './DexieAdapter'
import { SupabaseAdapter } from './SupabaseAdapter'

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

  constructor(
    dbName: string | undefined,
    supabaseUrl: string,
    supabaseKey: string,
    tenantId: string,
  ) {
    this.local = new DexieAdapter(dbName)
    this.remote = new SupabaseAdapter(supabaseUrl, supabaseKey, tenantId)
  }

  getMode(): DataMode { return 'hybrid' }

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

  async create<T>(table: TableName, data: any, initiatedBy?: string): Promise<T> {
    const record = await this.local.create<T>(table, data, initiatedBy)
    this.enqueue(table, 'CREATE', record)
    return record
  }

  async update<T>(table: TableName, id: string, data: any, initiatedBy?: string): Promise<T> {
    const record = await this.local.update<T>(table, id, data, initiatedBy)
    this.enqueue(table, 'UPDATE', { id, ...data })
    return record
  }

  async delete(table: TableName, id: string, initiatedBy?: string): Promise<void> {
    await this.local.delete(table, id, initiatedBy)
    this.enqueue(table, 'DELETE', { id })
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
    this.enqueue('journalEntries', 'CREATE', record)
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

  private enqueue(table: TableName, action: SyncQueueItem['action'], payload: any): void {
    this.syncQueue.push({
      id: crypto.randomUUID(),
      table,
      action,
      payload,
      timestamp: new Date().toISOString(),
      retries: 0,
    })
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

      // Update last sync timestamp
      const now = new Date().toISOString()
      try {
        await this.local.update('settings', 'lastSyncTimestamp', { key: 'lastSyncTimestamp', value: now })
      } catch {
        await this.local.create('settings', { key: 'lastSyncTimestamp', value: now })
      }

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
