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
  | 'journalLines'
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
  | 'taxRegistry'
  | 'taxDeclarations'
  | 'taxBrackets'
  // Correction #3 — Payment & Cash
  | 'paymentOrders'
  | 'cashRegisterSessions'
  | 'cashMovements'
  | 'loanSchedules'
  | 'checks'
  // Correction #8 — Purchase Orders
  | 'purchaseOrders'
  | 'goodsReceipts'
  // Correction #11 — Off-Balance
  | 'offBalanceCommitments'
  // Tenants / Societes / Compagnies
  | 'companies'
  // Relevés bancaires importés + journal des rapports
  | 'bankStatements'
  | 'bankStatementLines'
  | 'reports'
  // Espace collaboratif (discussions, tâches, présence)
  | 'collabChannels'
  | 'collabMessages'
  | 'collabTasks'
  | 'collabTaskComments'
  | 'collabPresence'
  | 'collabDocuments'
  // Module Stock (SAP MM) — L0
  | 'stockSites'
  | 'stockWarehouses'
  | 'stockLocations'
  | 'stockMaterials'
  | 'stockUomConversions'
  | 'stockBatches'
  | 'stockSerials'
  | 'stockQuants'
  | 'stockValuationLayers'
  | 'stockMovementTypes'
  | 'stockGlDetermination'
  | 'stockDocuments'
  | 'stockDocumentLines'
  | 'stockCountDocuments'
  | 'stockCountLines'
  | 'stockReservations'
  // Ossature d'intégration Suite Atlas (L1) — SaaS uniquement
  | 'integrationEvents'
  | 'postingRules'
  | 'integrationDeadLetters'
  | 'integrationApiKeys'
  | 'entrySequences'

export interface QueryFilters {
  where?: Record<string, any>
  whereIn?: { field: string; values: any[] }
  startsWith?: { field: string; prefix: string }
  orderBy?: { field: string; direction: 'asc' | 'desc' }
  limit?: number
  offset?: number
}

/** A6 — Pagination KEYSET (curseur) : pas de COUNT global, scalable sur 50k+ lignes. */
export interface PageOptions {
  /** Nombre de lignes par page (défaut 20). */
  pageSize?: number
  /** Curseur = valeur du champ de tri de la dernière ligne de la page précédente. */
  cursor?: string | number | null
  /** Champ de tri stable (défaut 'id'). Doit être indexé pour la performance. */
  sortField?: string
  /** Direction du tri (défaut 'asc'). */
  direction?: 'asc' | 'desc'
  /** Filtres d'égalité supplémentaires. */
  where?: Record<string, any>
}

export interface PagedResult<T> {
  rows: T[]
  /** Curseur à passer pour obtenir la page suivante (null si fin). */
  nextCursor: string | number | null
  hasMore: boolean
}

export interface DataAdapter {
  // Mode
  getMode(): DataMode
  isOnline(): Promise<boolean>

  // CRUD generique
  getById<T>(table: TableName, id: string): Promise<T | null>
  getAll<T>(table: TableName, filters?: QueryFilters): Promise<T[]>
  /** A6 — Page keyset (optionnel : les adapters qui ne l'implémentent pas restent compatibles). */
  getPage?<T>(table: TableName, opts?: PageOptions): Promise<PagedResult<T>>
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

  // RPC (Supabase uniquement — retourne null si non disponible)
  rpc?(rpcName: string, params: Record<string, unknown>): Promise<any | null>

  // Sync (hybride uniquement)
  getLastSyncTimestamp?(): Promise<string | null>
  pushChanges?(changes: ChangeSet): Promise<SyncResult>
  pullChanges?(since: string): Promise<ChangeSet>
}
