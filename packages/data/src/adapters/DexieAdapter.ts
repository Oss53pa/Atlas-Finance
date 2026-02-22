/**
 * @atlas/data — DexieAdapter
 *
 * Implementation locale du DataAdapter utilisant Dexie.js (IndexedDB).
 * Reprend EXACTEMENT le schema de src/lib/db.ts pour compatibilite
 * avec les donnees deja existantes chez les utilisateurs.
 */
import Dexie, { type Table } from 'dexie'
import { money } from '@atlas/core'
import type {
  JournalEntry,
  AuditEntry,
  AccountBalance,
  TrialBalanceRow,
} from '@atlas/shared'
import type { DataAdapter, DataMode, TableName, QueryFilters } from '../DataAdapter'

// ============================================================================
// DATABASE SCHEMA (mirrors src/lib/db.ts version 4)
// ============================================================================

class AtlasFinanceDexie extends Dexie {
  journalEntries!: Table<any, string>
  accounts!: Table<any, string>
  thirdParties!: Table<any, string>
  assets!: Table<any, string>
  fiscalYears!: Table<any, string>
  budgetLines!: Table<any, string>
  auditLogs!: Table<any, string>
  settings!: Table<any, string>
  closureSessions!: Table<any, string>
  provisions!: Table<any, string>
  exchangeRates!: Table<any, string>
  hedgingPositions!: Table<any, string>
  revisionItems!: Table<any, string>
  inventoryItems!: Table<any, string>
  aliasTiers!: Table<any, string>
  aliasPrefixConfig!: Table<any, string>

  constructor(dbName: string = 'AtlasFinanceDB') {
    super(dbName)

    // Keep exact same versioning as src/lib/db.ts
    this.version(1).stores({
      journalEntries: 'id, entryNumber, journal, date, status, [journal+date], reversalOf',
      accounts: 'id, code, accountClass, parentCode',
      thirdParties: 'id, code, type, name',
      assets: 'id, code, category, status',
      fiscalYears: 'id, startDate, endDate, isActive',
      budgetLines: 'id, accountCode, fiscalYear, period',
      auditLogs: 'id, timestamp, action, entityType, entityId',
      settings: 'key',
    })
    this.version(2).stores({
      journalEntries: 'id, entryNumber, journal, date, status, [journal+date], reversalOf',
      accounts: 'id, code, accountClass, parentCode',
      thirdParties: 'id, code, type, name',
      assets: 'id, code, category, status',
      fiscalYears: 'id, startDate, endDate, isActive',
      budgetLines: 'id, accountCode, fiscalYear, period',
      auditLogs: 'id, timestamp, action, entityType, entityId',
      settings: 'key',
      closureSessions: 'id, type, exercice, statut, dateDebut, dateFin',
      provisions: 'id, sessionId, compteClient, statut',
      exchangeRates: 'id, fromCurrency, toCurrency, date, [fromCurrency+toCurrency+date]',
      hedgingPositions: 'id, currency, type, status, maturityDate',
      revisionItems: 'id, sessionId, accountCode, status, isaAssertion',
    })
    this.version(3).stores({
      journalEntries: 'id, entryNumber, journal, date, status, [journal+date], reversalOf',
      accounts: 'id, code, accountClass, parentCode',
      thirdParties: 'id, code, type, name',
      assets: 'id, code, category, status',
      fiscalYears: 'id, startDate, endDate, isActive',
      budgetLines: 'id, accountCode, fiscalYear, period',
      auditLogs: 'id, timestamp, action, entityType, entityId',
      settings: 'key',
      closureSessions: 'id, type, exercice, statut, dateDebut, dateFin',
      provisions: 'id, sessionId, compteClient, statut',
      exchangeRates: 'id, fromCurrency, toCurrency, date, [fromCurrency+toCurrency+date]',
      hedgingPositions: 'id, currency, type, status, maturityDate',
      revisionItems: 'id, sessionId, accountCode, status, isaAssertion',
      inventoryItems: 'id, code, name, category, location, status',
    })
    this.version(4).stores({
      journalEntries: 'id, entryNumber, journal, date, status, [journal+date], reversalOf',
      accounts: 'id, code, accountClass, parentCode',
      thirdParties: 'id, code, type, name',
      assets: 'id, code, category, status',
      fiscalYears: 'id, startDate, endDate, isActive',
      budgetLines: 'id, accountCode, fiscalYear, period',
      auditLogs: 'id, timestamp, action, entityType, entityId',
      settings: 'key',
      closureSessions: 'id, type, exercice, statut, dateDebut, dateFin',
      provisions: 'id, sessionId, compteClient, statut',
      exchangeRates: 'id, fromCurrency, toCurrency, date, [fromCurrency+toCurrency+date]',
      hedgingPositions: 'id, currency, type, status, maturityDate',
      revisionItems: 'id, sessionId, accountCode, status, isaAssertion',
      inventoryItems: 'id, code, name, category, location, status',
      aliasTiers: 'id, alias, prefix',
      aliasPrefixConfig: 'id, sousCompteCode, prefix',
    })
  }
}

// ============================================================================
// ADAPTER IMPLEMENTATION
// ============================================================================

export class DexieAdapter implements DataAdapter {
  private db: AtlasFinanceDexie

  constructor(dbName?: string) {
    this.db = new AtlasFinanceDexie(dbName)
  }

  getMode(): DataMode { return 'local' }

  async isOnline(): Promise<boolean> {
    return typeof navigator !== 'undefined' ? navigator.onLine : true
  }

  // ---- CRUD ----

  private getTable(name: TableName): Table<any, string> {
    return (this.db as any)[name]
  }

  async getById<T>(table: TableName, id: string): Promise<T | null> {
    const record = await this.getTable(table).get(id)
    return (record as T) ?? null
  }

  async getAll<T>(table: TableName, filters?: QueryFilters): Promise<T[]> {
    let collection = this.getTable(table).toCollection()

    if (filters?.where) {
      const entries = Object.entries(filters.where)
      if (entries.length === 1) {
        const [field, value] = entries[0]
        collection = this.getTable(table).where(field).equals(value)
      }
    }

    let results = await collection.toArray()

    // Apply additional filters in memory
    if (filters?.where && Object.keys(filters.where).length > 1) {
      for (const [field, value] of Object.entries(filters.where)) {
        results = results.filter((r: any) => r[field] === value)
      }
    }

    if (filters?.startsWith) {
      const { field, prefix } = filters.startsWith
      results = results.filter((r: any) => String(r[field] || '').startsWith(prefix))
    }

    if (filters?.orderBy) {
      const { field, direction } = filters.orderBy
      results.sort((a: any, b: any) => {
        const cmp = String(a[field] || '').localeCompare(String(b[field] || ''))
        return direction === 'desc' ? -cmp : cmp
      })
    }

    if (filters?.offset) {
      results = results.slice(filters.offset)
    }
    if (filters?.limit) {
      results = results.slice(0, filters.limit)
    }

    return results as T[]
  }

  async create<T>(table: TableName, data: any, initiatedBy?: string): Promise<T> {
    const id = crypto.randomUUID()
    const record = { ...data, id }
    await this.getTable(table).add(record)

    if (initiatedBy) {
      await this.logAudit({
        timestamp: new Date().toISOString(),
        action: 'CREATE',
        entityType: table,
        entityId: id,
        details: JSON.stringify(record),
        previousHash: '',
        initiatedBy,
      })
    }

    return record as T
  }

  async update<T>(table: TableName, id: string, data: any, initiatedBy?: string): Promise<T> {
    await this.getTable(table).update(id, data)
    const updated = await this.getTable(table).get(id)

    if (initiatedBy) {
      await this.logAudit({
        timestamp: new Date().toISOString(),
        action: 'UPDATE',
        entityType: table,
        entityId: id,
        details: JSON.stringify(data),
        previousHash: '',
        initiatedBy,
      })
    }

    return updated as T
  }

  async delete(table: TableName, id: string, initiatedBy?: string): Promise<void> {
    await this.getTable(table).delete(id)

    if (initiatedBy) {
      await this.logAudit({
        timestamp: new Date().toISOString(),
        action: 'DELETE',
        entityType: table,
        entityId: id,
        details: '',
        previousHash: '',
        initiatedBy,
      })
    }
  }

  async count(table: TableName, filters?: QueryFilters): Promise<number> {
    if (!filters) return this.getTable(table).count()
    const items = await this.getAll(table, filters)
    return items.length
  }

  // ---- Requetes comptables ----

  async getJournalEntries(filters?: QueryFilters): Promise<JournalEntry[]> {
    return this.getAll<JournalEntry>('journalEntries', filters)
  }

  async getAccountBalance(prefixes: string[], dateRange?: { start: string; end: string }): Promise<AccountBalance> {
    let entries = await this.db.journalEntries.toArray()

    if (dateRange) {
      entries = entries.filter((e: any) => e.date >= dateRange.start && e.date <= dateRange.end)
    }

    const allLines = entries.flatMap((e: any) => e.lines || [])
    const filtered = allLines.filter((l: any) =>
      prefixes.some(p => String(l.accountCode || '').startsWith(p))
    )

    let debit = 0
    let credit = 0
    for (const l of filtered) {
      debit = money(debit).add(money(l.debit || 0)).toNumber()
      credit = money(credit).add(money(l.credit || 0)).toNumber()
    }

    return {
      debit,
      credit,
      solde: money(debit).subtract(money(credit)).toNumber(),
      lignes: filtered.length,
    }
  }

  async getTrialBalance(dateRange?: { start: string; end: string }): Promise<TrialBalanceRow[]> {
    const balanceMap = await this.getBalanceByAccount(dateRange)
    const accounts = await this.db.accounts.toArray()
    const accountNames = new Map(accounts.map((a: any) => [a.code, a.name]))

    const rows: TrialBalanceRow[] = []
    for (const [accountCode, balance] of balanceMap) {
      rows.push({
        accountCode,
        accountName: accountNames.get(accountCode) || accountCode,
        debitOuverture: 0,
        creditOuverture: 0,
        debitMouvement: balance.debit,
        creditMouvement: balance.credit,
        debitSolde: balance.solde > 0 ? balance.solde : 0,
        creditSolde: balance.solde < 0 ? Math.abs(balance.solde) : 0,
      })
    }

    return rows.sort((a, b) => a.accountCode.localeCompare(b.accountCode))
  }

  async getBalanceByAccount(dateRange?: { start: string; end: string }): Promise<Map<string, AccountBalance>> {
    let entries = await this.db.journalEntries.toArray()

    if (dateRange) {
      entries = entries.filter((e: any) => e.date >= dateRange.start && e.date <= dateRange.end)
    }

    const allLines = entries.flatMap((e: any) => e.lines || [])
    const map = new Map<string, AccountBalance>()

    for (const l of allLines) {
      const num = String(l.accountCode || '')
      const current = map.get(num) || { debit: 0, credit: 0, solde: 0, lignes: 0 }
      current.debit = money(current.debit).add(money(l.debit || 0)).toNumber()
      current.credit = money(current.credit).add(money(l.credit || 0)).toNumber()
      current.solde = money(current.debit).subtract(money(current.credit)).toNumber()
      current.lignes++
      map.set(num, current)
    }

    return map
  }

  async saveJournalEntry(entry: Omit<JournalEntry, 'id' | 'createdAt'>): Promise<JournalEntry> {
    // Validate D = C
    let totalDebit = 0
    let totalCredit = 0
    for (const line of entry.lines) {
      totalDebit = money(totalDebit).add(money(line.debit)).toNumber()
      totalCredit = money(totalCredit).add(money(line.credit)).toNumber()
    }
    if (!money(totalDebit).equals(money(totalCredit))) {
      throw new Error(`Desequilibre: Debit=${totalDebit} Credit=${totalCredit}`)
    }

    const id = crypto.randomUUID()
    const record: JournalEntry = {
      ...entry,
      id,
      totalDebit,
      totalCredit,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await this.db.journalEntries.add(record)
    return record
  }

  async transaction<T>(tables: TableName[], fn: (adapter: DataAdapter) => Promise<T>): Promise<T> {
    return this.db.transaction('rw', tables.map(t => this.getTable(t)), () => fn(this))
  }

  // ---- Audit ----

  async logAudit(event: Omit<AuditEntry, 'id' | 'hash'>): Promise<void> {
    const lastAudit = await this.db.auditLogs.orderBy('timestamp').last()
    const previousHash = lastAudit?.hash || '0'
    const payload = JSON.stringify({ ...event, previousHash })

    let hash: string
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload))
      hash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0')).join('')
    } else {
      hash = previousHash + '-' + Date.now().toString(36)
    }

    await this.db.auditLogs.add({
      ...event,
      id: crypto.randomUUID(),
      hash,
      previousHash,
    })
  }

  async getAuditTrail(filters?: QueryFilters): Promise<AuditEntry[]> {
    return this.getAll<AuditEntry>('auditLogs', filters)
  }

  /** Expose underlying Dexie instance for legacy compatibility */
  getDexieInstance(): Dexie {
    return this.db
  }
}
