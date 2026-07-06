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
// DATABASE SCHEMA (mirrors src/lib/db.ts version 5)
// ============================================================================

class AtlasFnADexie extends Dexie {
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
  stockMovements!: Table<any, string>
  recoveryCases!: Table<any, string>
  aliasTiers!: Table<any, string>
  aliasPrefixConfig!: Table<any, string>
  fiscalPeriods!: Table<any, string>
  // B2 : tables v8+v9 absentes — fiscal / trésorerie / caisse plantaient en mode local
  taxRegistry!: Table<any, string>
  taxDeclarations!: Table<any, string>
  taxBrackets!: Table<any, string>
  paymentOrders!: Table<any, string>
  cashRegisterSessions!: Table<any, string>
  cashMovements!: Table<any, string>
  loanSchedules!: Table<any, string>
  checks!: Table<any, string>
  purchaseOrders!: Table<any, string>
  goodsReceipts!: Table<any, string>
  offBalanceCommitments!: Table<any, string>
  // Relevés bancaires + rapports (étaient dans src/lib/db v10 mais pas ici → resync)
  bankStatements!: Table<any, string>
  bankStatementLines!: Table<any, string>
  reports!: Table<any, string>
  // Espace collaboratif
  collabChannels!: Table<any, string>
  collabMessages!: Table<any, string>
  collabTasks!: Table<any, string>
  collabTaskComments!: Table<any, string>
  collabPresence!: Table<any, string>
  collabDocuments!: Table<any, string>

  constructor(dbName: string = 'AtlasFnADB') {
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
    this.version(5).stores({
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
      fiscalPeriods: 'id, fiscalYearId, code, type, status, startDate',
    })
    this.version(6).stores({
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
      stockMovements: 'id, itemId, date, type, reference, [itemId+date]',
      aliasTiers: 'id, alias, prefix',
      aliasPrefixConfig: 'id, sousCompteCode, prefix',
      fiscalPeriods: 'id, fiscalYearId, code, type, status, startDate',
    })
    this.version(7).stores({
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
      stockMovements: 'id, itemId, date, type, reference, [itemId+date]',
      aliasTiers: 'id, alias, prefix',
      aliasPrefixConfig: 'id, sousCompteCode, prefix',
      fiscalPeriods: 'id, fiscalYearId, code, type, status, startDate',
      recoveryCases: 'id, numeroRef, clientId, statut, dateOuverture',
    })
    // B2 : versions 8+9 manquantes — modules fiscal/trésorerie/caisse plantaient
    this.version(8).stores({
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
      stockMovements: 'id, itemId, date, type, reference, [itemId+date]',
      aliasTiers: 'id, alias, prefix',
      aliasPrefixConfig: 'id, sousCompteCode, prefix',
      fiscalPeriods: 'id, fiscalYearId, code, type, status, startDate',
      recoveryCases: 'id, numeroRef, clientId, statut, dateOuverture',
      taxRegistry: 'id, countryCode, taxCode, taxCategory, isActive, [countryCode+taxCode]',
      taxDeclarations: 'id, taxRegistryId, taxCode, periodStart, status, fiscalYear, [taxCode+periodStart]',
      taxBrackets: 'id, taxRegistryId, countryCode, fiscalYear',
    })
    this.version(9).stores({
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
      stockMovements: 'id, itemId, date, type, reference, [itemId+date]',
      aliasTiers: 'id, alias, prefix',
      aliasPrefixConfig: 'id, sousCompteCode, prefix',
      fiscalPeriods: 'id, fiscalYearId, code, type, status, startDate',
      recoveryCases: 'id, numeroRef, clientId, statut, dateOuverture',
      taxRegistry: 'id, countryCode, taxCode, taxCategory, isActive, [countryCode+taxCode]',
      taxDeclarations: 'id, taxRegistryId, taxCode, periodStart, status, fiscalYear, [taxCode+periodStart]',
      taxBrackets: 'id, taxRegistryId, countryCode, fiscalYear',
      paymentOrders: 'id, companyId, orderNumber, status, beneficiaryType, [companyId+status]',
      cashRegisterSessions: 'id, companyId, cashAccountId, status, openedAt',
      cashMovements: 'id, companyId, sessionId, type, createdAt',
      loanSchedules: 'id, companyId, loanId, installmentNumber, status, dueDate',
      checks: 'id, companyId, direction, status, checkNumber, [companyId+direction+status]',
      purchaseOrders: 'id, companyId, supplierId, orderNumber, status, [companyId+status]',
      goodsReceipts: 'id, companyId, purchaseOrderId, receiptNumber',
      offBalanceCommitments: 'id, companyId, type, status, [companyId+status]',
    })
    // v10 — resync avec src/lib/db.ts (relevés bancaires + rapports)
    this.version(10).stores({
      bankStatements: 'id, companyId, accountCode, periodStart, periodEnd, importedAt, [accountCode+periodStart]',
      bankStatementLines: 'id, statementId, date, reconciled, [statementId+date]',
      reports: 'id, companyId, status, type, createdAt',
    })
    // v11 — Espace collaboratif (discussions, tâches, présence)
    this.version(11).stores({
      collabChannels: 'id, tenantId, type, updatedAt',
      collabMessages: 'id, channelId, tenantId, createdAt, parentId, [channelId+createdAt]',
      collabTasks: 'id, tenantId, status, assigneeId, updatedAt',
      collabTaskComments: 'id, taskId, tenantId, createdAt',
      collabPresence: 'id, tenantId, lastSeenAt',
    })
    // v12 — Documents versionnés des espaces de résolution
    this.version(12).stores({
      collabDocuments: 'id, tenantId, spaceId, name, version, uploadedAt, [spaceId+name]',
    })
  }
}

// ============================================================================
// ADAPTER IMPLEMENTATION
// ============================================================================

export class DexieAdapter implements DataAdapter {
  private db: AtlasFnADexie

  constructor(dbName?: string) {
    this.db = new AtlasFnADexie(dbName)
  }

  getMode(): DataMode { return 'local' }

  async isOnline(): Promise<boolean> {
    return typeof navigator !== 'undefined' ? navigator.onLine : true
  }

  // ---- CRUD ----

  private getTable(name: TableName): Table<any, string> {
    const table = (this.db as any)[name]
    if (!table) {
      throw new Error(`DexieAdapter: table "${name}" not found in Dexie schema`)
    }
    return table
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

  // A6 — Pagination keyset (en mémoire : données locales, volumétrie modérée).
  async getPage<T>(table: TableName, opts: import('../DataAdapter').PageOptions = {}): Promise<import('../DataAdapter').PagedResult<T>> {
    const pageSize = opts.pageSize ?? 20
    const sortField = opts.sortField ?? 'id'
    const asc = (opts.direction ?? 'asc') === 'asc'
    let results = (await this.getTable(table).toArray()) as any[]
    if (opts.where) {
      for (const [f, v] of Object.entries(opts.where)) results = results.filter((r: any) => r[f] === v)
    }
    results.sort((a: any, b: any) => {
      const av = a[sortField]; const bv = b[sortField]
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return asc ? cmp : -cmp
    })
    if (opts.cursor !== undefined && opts.cursor !== null) {
      const cur = opts.cursor
      results = results.filter((r: any) => (asc ? r[sortField] > cur : r[sortField] < cur))
    }
    const hasMore = results.length > pageSize
    const page = results.slice(0, pageSize)
    const last = page[page.length - 1]
    const nextCursor = (hasMore && last) ? (last[sortField] ?? null) : null
    return { rows: page as T[], nextCursor, hasMore }
  }

  async create<T>(table: TableName, data: any, initiatedBy?: string): Promise<T> {
    // P0-4 : toute écriture comptable doit être équilibrée et tomber dans une
    // période ouverte, quel que soit le chemin d'insertion (et plus seulement
    // saveJournalEntry). Ferme le contournement par create() générique.
    if (table === 'journalEntries') {
      await this.assertJournalEntryWritable(data)
    }
    // P0-4 / F2-4 : respecter l'id fourni par l'appelant (safeAddEntry calcule le
    // hash puis renvoie cet id ; reverseEntry pose reversedBy = cet id). L'écraser
    // systématiquement cassait les liens (reversedBy pointait dans le vide) et
    // masquait la divergence test/prod.
    const id = data?.id ?? crypto.randomUUID()
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
    // P0-4 : une écriture comptabilisée (posted) est immuable (SYSCOHADA Art.19).
    // Seules les métadonnées (lettrage, rapprochement, marquage de
    // contrepassation) peuvent évoluer ; comptes/montants/entête sont figés.
    if (table === 'journalEntries') {
      const existing: any = await this.getTable(table).get(id)
      if (existing && existing.status === 'posted') {
        this.assertPostedEntryImmutable(existing, data)
      }
    }
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
    // P0-4 : interdiction de supprimer physiquement une écriture comptabilisée
    // (SYSCOHADA Art.19). La correction passe par une contrepassation.
    if (table === 'journalEntries') {
      const existing: any = await this.getTable(table).get(id)
      if (existing && existing.status === 'posted') {
        throw new Error(
          'Écriture comptabilisée immuable (SYSCOHADA Art. 19) : suppression interdite. Utilisez une contrepassation.',
        )
      }
    }
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

    // P1-A : n'agréger que les écritures validées/comptabilisées (jamais les
    // brouillons) — cohérent avec la balance de vérification. Sinon les états
    // financiers et soldes incluent des draft non validés.
    entries = entries.filter((e: any) => e.status === 'validated' || e.status === 'posted')

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

    // P1-A : exclure les brouillons (draft) des soldes par compte (bilan/CR).
    entries = entries.filter((e: any) => e.status === 'validated' || e.status === 'posted')

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
    // ── Balance validation: sum debit MUST equal sum credit ──
    let totalDebit = 0
    let totalCredit = 0
    for (const line of entry.lines) {
      totalDebit = money(totalDebit).add(money(line.debit)).toNumber()
      totalCredit = money(totalCredit).add(money(line.credit)).toNumber()
    }
    if (!money(totalDebit).equals(money(totalCredit))) {
      throw new Error(`Desequilibre: Debit=${totalDebit} Credit=${totalCredit}`)
    }

    // ── Period lock check: reject writes to closed fiscal periods ──
    await this.assertPeriodOpen(entry.date)

    // Respecter l'id fourni par l'appelant (ex. safeAddEntry qui contrôle l'id + le hash
    // de chaînage), sinon en générer un. Aligne le comportement sur create().
    const id = (entry as any).id ?? crypto.randomUUID()
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

  // ── Offline validation helpers ──

  /**
   * Validate that a journal entry's lines are balanced (sum debit = sum credit).
   * Can be called independently before saving.
   */
  validateJournalBalance(lines: Array<{ debit: number; credit: number }>): { valid: boolean; debit: number; credit: number; ecart: number } {
    let totalDebit = 0
    let totalCredit = 0
    for (const line of lines) {
      totalDebit = money(totalDebit).add(money(line.debit)).toNumber()
      totalCredit = money(totalCredit).add(money(line.credit)).toNumber()
    }
    const ecart = money(totalDebit).subtract(money(totalCredit)).toNumber()
    return {
      valid: money(totalDebit).equals(money(totalCredit)),
      debit: totalDebit,
      credit: totalCredit,
      ecart,
    }
  }

  /**
   * P0-4 : garde-fou d'écriture comptable — équilibre D=C + période ouverte.
   * Appliqué à toute insertion d'écriture, y compris via create() générique.
   */
  private async assertJournalEntryWritable(data: any): Promise<void> {
    const lines = Array.isArray(data?.lines) ? data.lines : []
    if (lines.length > 0) {
      const check = this.validateJournalBalance(lines)
      if (!check.valid) {
        throw new Error(
          `Écriture déséquilibrée : Débit=${check.debit} Crédit=${check.credit} (écart ${check.ecart}).`,
        )
      }
    }
    if (data?.date) {
      await this.assertPeriodOpen(data.date)
    }
  }

  /**
   * P0-4 : une écriture comptabilisée (posted) est immuable (SYSCOHADA Art.19).
   * Seules les métadonnées (lettrage, rapprochement, marquage de contrepassation :
   * reversed/reversedBy/reversedAt) peuvent changer. Toute modification d'un champ
   * d'entête ou des comptes/montants des lignes est refusée — la correction se
   * fait par contrepassation.
   */
  private assertPostedEntryImmutable(existing: any, patch: any): void {
    const FROZEN = ['journal', 'date', 'entryNumber', 'label', 'reference', 'status', 'totalDebit', 'totalCredit']
    for (const field of FROZEN) {
      if (field in patch && JSON.stringify(patch[field]) !== JSON.stringify(existing[field])) {
        throw new Error(
          `Écriture comptabilisée immuable (SYSCOHADA Art. 19) : le champ "${field}" ne peut pas être modifié. Utilisez une contrepassation.`,
        )
      }
    }
    if ('lines' in patch && Array.isArray(patch.lines)) {
      const signature = (l: any) =>
        `${l.accountCode}|${money(l.debit || 0).toNumber()}|${money(l.credit || 0).toNumber()}`
      const before = (existing.lines || []).map(signature).sort()
      const after = patch.lines.map(signature).sort()
      const changed = before.length !== after.length || before.some((s: string, i: number) => s !== after[i])
      if (changed) {
        throw new Error(
          'Écriture comptabilisée immuable (SYSCOHADA Art. 19) : les comptes et montants ne peuvent pas être modifiés. Utilisez une contrepassation.',
        )
      }
    }
  }

  /**
   * Check if the fiscal period covering the given date is open.
   * Throws if the period is closed or locked.
   */
  private async assertPeriodOpen(date: string): Promise<void> {
    const periods = await this.db.fiscalPeriods.toArray()
    const matchingPeriod = periods.find(
      (p: any) => p.startDate <= date && (p.endDate >= date || !p.endDate)
    )

    if (matchingPeriod && (matchingPeriod.status === 'closed' || matchingPeriod.status === 'locked' || matchingPeriod.status === 'cloturee')) {
      throw new Error(
        `Periode comptable verrouillee (${matchingPeriod.code}). ` +
        `Impossible d'enregistrer une ecriture au ${date}.`
      )
    }

    // Also check fiscal year closure
    const fiscalYears = await this.db.fiscalYears.toArray()
    const matchingFY = fiscalYears.find(
      (fy: any) => fy.startDate <= date && fy.endDate >= date
    )
    if (matchingFY && matchingFY.isClosed) {
      throw new Error(
        `Exercice cloture (${matchingFY.code || matchingFY.name}). ` +
        `Impossible d'enregistrer une ecriture au ${date}.`
      )
    }
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
