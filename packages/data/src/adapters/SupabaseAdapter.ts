/**
 * @atlas/data — SupabaseAdapter
 *
 * Implementation SaaS du DataAdapter utilisant Supabase (PostgreSQL).
 * Multi-tenant via tenant_id + RLS.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type {
  JournalEntry,
  AuditEntry,
  AccountBalance,
  TrialBalanceRow,
} from '@atlas/shared'
import type { DataAdapter, DataMode, TableName, QueryFilters } from '../DataAdapter'

// Mapping camelCase (TS) -> snake_case (Supabase)
const TABLE_MAP: Record<TableName, string> = {
  journalEntries: 'journal_entries',
  accounts: 'accounts',
  thirdParties: 'third_parties',
  assets: 'assets',
  fiscalYears: 'fiscal_years',
  budgetLines: 'budget_lines',
  auditLogs: 'audit_trail',
  settings: 'settings',
  closureSessions: 'closure_sessions',
  provisions: 'provisions',
  exchangeRates: 'exchange_rates',
  hedgingPositions: 'hedging_positions',
  revisionItems: 'revision_items',
  inventoryItems: 'inventory_items',
  stockMovements: 'stock_movements',
  aliasTiers: 'alias_tiers',
  aliasPrefixConfig: 'alias_prefix_config',
  fiscalPeriods: 'fiscal_periods',
  recoveryCases: 'recovery_cases',
}

export class SupabaseAdapter implements DataAdapter {
  private client: SupabaseClient
  private tenantId: string

  constructor(url: string, anonKey: string, tenantId: string) {
    this.client = createClient(url, anonKey)
    this.tenantId = tenantId
  }

  getMode(): DataMode { return 'saas' }

  async isOnline(): Promise<boolean> {
    try {
      const { error } = await this.client.from('settings').select('key').limit(1)
      return !error
    } catch { return false }
  }

  private pgTable(table: TableName): string {
    return TABLE_MAP[table] || table
  }

  async getById<T>(table: TableName, id: string): Promise<T | null> {
    const { data } = await this.client
      .from(this.pgTable(table)).select('*')
      .eq('id', id).eq('tenant_id', this.tenantId)
      .single()
    return data as T | null
  }

  async getAll<T>(table: TableName, filters?: QueryFilters): Promise<T[]> {
    let query = this.client.from(this.pgTable(table)).select('*').eq('tenant_id', this.tenantId)

    if (filters?.where) {
      for (const [k, v] of Object.entries(filters.where)) {
        query = query.eq(k, v)
      }
    }
    if (filters?.startsWith) {
      query = query.like(filters.startsWith.field, `${filters.startsWith.prefix}%`)
    }
    if (filters?.orderBy) {
      query = query.order(filters.orderBy.field, { ascending: filters.orderBy.direction === 'asc' })
    }
    if (filters?.limit) query = query.limit(filters.limit)
    if (filters?.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 100) - 1)

    const { data } = await query
    return (data || []) as T[]
  }

  async create<T>(table: TableName, data: any, initiatedBy?: string): Promise<T> {
    const record = {
      ...data,
      id: crypto.randomUUID(),
      tenant_id: this.tenantId,
      created_at: new Date().toISOString(),
    }
    const { data: created, error } = await this.client
      .from(this.pgTable(table)).insert(record).select().single()
    if (error) throw new Error(`Create failed: ${error.message}`)

    if (initiatedBy) {
      await this.logAudit({
        timestamp: new Date().toISOString(),
        action: 'CREATE',
        entityType: table,
        entityId: record.id,
        details: JSON.stringify(record),
        previousHash: '',
        initiatedBy,
      })
    }
    return created as T
  }

  async update<T>(table: TableName, id: string, data: any, initiatedBy?: string): Promise<T> {
    const { data: updated, error } = await this.client
      .from(this.pgTable(table)).update(data).eq('id', id).eq('tenant_id', this.tenantId).select().single()
    if (error) throw new Error(`Update failed: ${error.message}`)

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
    const { error } = await this.client
      .from(this.pgTable(table)).delete().eq('id', id).eq('tenant_id', this.tenantId)
    if (error) throw new Error(`Delete failed: ${error.message}`)

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
    let query = this.client.from(this.pgTable(table)).select('*', { count: 'exact', head: true }).eq('tenant_id', this.tenantId)
    if (filters?.where) {
      for (const [k, v] of Object.entries(filters.where)) {
        query = query.eq(k, v)
      }
    }
    const { count } = await query
    return count || 0
  }

  // ---- Requetes comptables via RPC ----

  async getJournalEntries(filters?: QueryFilters): Promise<JournalEntry[]> {
    return this.getAll<JournalEntry>('journalEntries', filters)
  }

  async getAccountBalance(prefixes: string[], dateRange?: { start: string; end: string }): Promise<AccountBalance> {
    const { data, error } = await this.client.rpc('get_account_balance', {
      p_prefixes: prefixes,
      p_tenant_id: this.tenantId,
      p_start_date: dateRange?.start || null,
      p_end_date: dateRange?.end || null,
    })
    if (error) throw new Error(error.message)
    return data as AccountBalance
  }

  async getTrialBalance(dateRange?: { start: string; end: string }): Promise<TrialBalanceRow[]> {
    const { data, error } = await this.client.rpc('get_trial_balance', {
      p_tenant_id: this.tenantId,
      p_start_date: dateRange?.start || null,
      p_end_date: dateRange?.end || null,
    })
    if (error) throw new Error(error.message)
    return data as TrialBalanceRow[]
  }

  async getBalanceByAccount(dateRange?: { start: string; end: string }): Promise<Map<string, AccountBalance>> {
    const rows = await this.getTrialBalance(dateRange)
    const map = new Map<string, AccountBalance>()
    for (const row of rows) {
      map.set(row.accountCode, {
        debit: row.debitMouvement,
        credit: row.creditMouvement,
        solde: row.debitSolde - row.creditSolde,
        lignes: 0,
      })
    }
    return map
  }

  async saveJournalEntry(entry: Omit<JournalEntry, 'id' | 'createdAt'>): Promise<JournalEntry> {
    const record = {
      ...entry,
      id: crypto.randomUUID(),
      tenant_id: this.tenantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await this.client
      .from('journal_entries').insert(record).select().single()
    if (error) throw new Error(error.message)
    return data as JournalEntry
  }

  async transaction<T>(_tables: TableName[], fn: (adapter: DataAdapter) => Promise<T>): Promise<T> {
    // Supabase doesn't support client-side transactions natively.
    // For atomicity, use RPC functions server-side.
    return fn(this)
  }

  async logAudit(event: Omit<AuditEntry, 'id' | 'hash'>): Promise<void> {
    // Hash is computed by Postgres trigger
    await this.client.from('audit_trail').insert({
      ...event,
      id: crypto.randomUUID(),
      tenant_id: this.tenantId,
      hash: '', // trigger fills this
    })
  }

  async getAuditTrail(filters?: QueryFilters): Promise<AuditEntry[]> {
    return this.getAll<AuditEntry>('auditLogs', filters)
  }
}
