/**
 * @atlas/data — Interface abstraite DataAdapter.
 *
 * Contrat unique pour acceder aux donnees, quel que soit le backend :
 * - DexieAdapter (local, IndexedDB)
 * - SupabaseAdapter (SaaS, PostgreSQL)
 * - HybridAdapter (local + sync cloud)
 */
import type {
  JournalEntry,
  Account,
  FiscalYear,
  Asset,
  ThirdParty,
  AuditEntry,
  AccountBalance,
  TrialBalanceRow,
  AgedBalanceRow,
  ChangeSet,
  SyncResult,
} from '@atlas/shared'

export type DataMode = 'local' | 'saas' | 'hybrid'

export type TableName =
  | 'journalEntries'
  | 'accounts'
  | 'thirdParties'
  | 'assets'
  | 'fiscalYears'
  | 'budgetLines'
  | 'auditLogs'
  | 'settings'
  | 'closureSessions'
  | 'provisions'
  | 'exchangeRates'
  | 'hedgingPositions'
  | 'revisionItems'
  | 'inventoryItems'
  | 'stockMovements'
  | 'aliasTiers'
  | 'aliasPrefixConfig'
  | 'fiscalPeriods'
  | 'recoveryCases'

export interface QueryFilters {
  where?: Record<string, any>
  whereIn?: { field: string; values: any[] }
  startsWith?: { field: string; prefix: string }
  orderBy?: { field: string; direction: 'asc' | 'desc' }
  limit?: number
  offset?: number
}

export interface DataAdapter {
  // Mode
  getMode(): DataMode
  isOnline(): Promise<boolean>

  // CRUD generique
  getById<T>(table: TableName, id: string): Promise<T | null>
  getAll<T>(table: TableName, filters?: QueryFilters): Promise<T[]>
  create<T>(table: TableName, data: Omit<T, 'id'>, initiatedBy?: string): Promise<T>
  update<T>(table: TableName, id: string, data: Partial<T>, initiatedBy?: string): Promise<T>
  delete(table: TableName, id: string, initiatedBy?: string): Promise<void>
  count(table: TableName, filters?: QueryFilters): Promise<number>

  // Requetes comptables optimisees
  getJournalEntries(filters?: QueryFilters): Promise<JournalEntry[]>
  getAccountBalance(prefixes: string[], dateRange?: { start: string; end: string }): Promise<AccountBalance>
  getTrialBalance(dateRange?: { start: string; end: string }): Promise<TrialBalanceRow[]>
  getBalanceByAccount(dateRange?: { start: string; end: string }): Promise<Map<string, AccountBalance>>

  // Ecriture comptable (avec validation D=C integree)
  saveJournalEntry(entry: Omit<JournalEntry, 'id' | 'createdAt'>): Promise<JournalEntry>

  // Transaction
  transaction<T>(tables: TableName[], fn: (adapter: DataAdapter) => Promise<T>): Promise<T>

  // Audit trail
  logAudit(event: Omit<AuditEntry, 'id' | 'hash'>): Promise<void>
  getAuditTrail(filters?: QueryFilters): Promise<AuditEntry[]>

  // Sync (hybride uniquement)
  getLastSyncTimestamp?(): Promise<string | null>
  pushChanges?(changes: ChangeSet): Promise<SyncResult>
  pullChanges?(since: string): Promise<ChangeSet>
}
