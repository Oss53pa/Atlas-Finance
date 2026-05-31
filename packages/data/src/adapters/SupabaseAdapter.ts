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
  journalLines: 'journal_lines',
  accounts: 'accounts',
  thirdParties: 'third_parties',
  assets: 'assets',
  fiscalYears: 'fiscal_years',
  budgetLines: 'budget_lines',
  auditLogs: 'audit_logs',
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
  fiscalPeriods: 'periodes_comptables',
  recoveryCases: 'recovery_cases',
  taxRegistry: 'tax_registry',
  taxDeclarations: 'tax_declarations',
  taxBrackets: 'tax_brackets',
  // Correction #3 — Payment & Cash
  paymentOrders: 'payment_orders',
  cashRegisterSessions: 'cash_register_sessions',
  cashMovements: 'cash_movements',
  loanSchedules: 'loan_schedules',
  checks: 'checks_register',
  // Correction #8 — Purchase Orders
  purchaseOrders: 'purchase_orders',
  goodsReceipts: 'goods_receipts',
  // Correction #11 — Off-Balance
  offBalanceCommitments: 'off_balance_commitments',
  // Tenants / Societes : 'companies' (legacy TS) -> 'societes' (table Supabase OHADA)
  companies: 'societes',
}

export class SupabaseAdapter implements DataAdapter {
  private client: SupabaseClient
  private tenantId: string

  /**
   * Tables racines (tables "tenant" elles-mêmes) qui n'ont PAS de colonne
   * tenant_id — elles SONT l'entité tenant. Toute requête sur ces tables
   * filtre par `id = tenantId` (getAll) ou n'ajoute pas de filtre tenant
   * (getById, update, delete) et n'injecte pas tenant_id dans les inserts.
   */
  private static readonly ROOT_TABLES = new Set(['societes'])

  /**
   * Tables dont la clé primaire est la colonne `key` (TEXT) et non `id` (UUID).
   * Schema settings : key TEXT PRIMARY KEY, tenant_id, value, updated_at.
   * Pas de colonne `id` ni `created_at`.
   *
   * Pour ces tables, getById/update/delete utilisent `.eq('key', id)` et
   * create n'injecte pas `id` ni `created_at`.
   */
  private static readonly KEY_PK_TABLES = new Set(['settings'])

  private isRootTable(pgTable: string): boolean {
    return SupabaseAdapter.ROOT_TABLES.has(pgTable)
  }

  /** La clé primaire de cette table est-elle `key` (et non `id`) ? */
  private isKeyPkTable(pgTable: string): boolean {
    return SupabaseAdapter.KEY_PK_TABLES.has(pgTable)
  }

  /**
   * Cree l'adapter Supabase.
   *
   * IMPORTANT : si l'app a deja un client Supabase global (avec session
   * authentifiee dans un storage custom), il faut PASSER CE CLIENT en 4e
   * parametre pour que l'adapter partage la meme session. Sinon, le client
   * cree par l'adapter ne voit pas la session du user et tourne en anon.
   */
  constructor(
    url: string,
    anonKey: string,
    tenantId: string,
    existingClient?: SupabaseClient,
  ) {
    this.client = existingClient ?? createClient(url, anonKey)
    this.tenantId = tenantId
  }

  /**
   * Met à jour le tenantId utilisé par toutes les requêtes suivantes.
   *
   * Appelé par DataContext dès que la session Supabase est restaurée ou
   * modifiée (via onAuthStateChange). Permet de remplacer le tenantId
   * initialement lu depuis localStorage (non-authentifié) par le tenantId
   * certifié issu des métadonnées de session.
   *
   * @param id  UUID de la société (tenant) issu de la session authentifiée.
   */
  setTenantId(id: string): void {
    this.tenantId = id
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
    const pg = this.pgTable(table)
    // KEY_PK_TABLES (ex: settings) : PK = colonne `key`, pas `id`.
    // ROOT_TABLES (ex: societes)   : pas de tenant_id → filtrer par id seul.
    const pkCol = this.isKeyPkTable(pg) ? 'key' : 'id'
    let q = this.client.from(pg).select('*').eq(pkCol, id)
    if (!this.isRootTable(pg)) q = q.eq('tenant_id', this.tenantId)
    const { data } = await q.maybeSingle()
    return data as T | null
  }

  async getAll<T>(table: TableName, filters?: QueryFilters): Promise<T[]> {
    const pg = this.pgTable(table)
    try {
      // ROOT_TABLES (ex: societes) : pas de colonne tenant_id.
      // getAll('companies') = "donne-moi MA société" → filtrer par id = tenantId.
      let query = this.isRootTable(pg)
        ? this.client.from(pg).select('*').eq('id', this.tenantId)
        : this.client.from(pg).select('*').eq('tenant_id', this.tenantId)

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

      const { data, error } = await query
      // Tolerant : si la table n'existe pas (404), RLS bloque (403), ou
      // schema partial, on retourne [] silencieusement plutot que de propager
      // une erreur qui casse la page entiere.
      if (error) return []
      return (data || []) as T[]
    } catch (_e) {
      return []
    }
  }

  /**
   * Bulk insert : insere plusieurs lignes en UNE seule requete HTTP -> une
   * seule transaction Postgres -> les triggers DEFERRABLE INITIALLY DEFERRED
   * (notamment validate_entry_balance sur journal_lines) ne s'evaluent qu'a
   * la fin du batch. Indispensable pour journal_lines ou inserer ligne-par-
   * ligne fait foirer le check d'equilibre sur la 1ere ligne.
   */
  async createMany<T>(table: TableName, items: any[]): Promise<T[]> {
    if (!items || items.length === 0) return []
    const pg = this.pgTable(table)
    const now = new Date().toISOString()
    const records = items.map(item => ({
      ...item,
      id: item.id ?? crypto.randomUUID(),
      // ROOT_TABLES n'ont pas de colonne tenant_id
      ...(!this.isRootTable(pg) ? { tenant_id: this.tenantId } : {}),
      created_at: now,
    }))
    const { data, error } = await this.client
      .from(pg).insert(records).select()
    if (error) throw new Error(`CreateMany failed: ${error.message}`)
    return (data || []) as T[]
  }

  async create<T>(table: TableName, data: any, initiatedBy?: string): Promise<T> {
    const pg = this.pgTable(table)
    // KEY_PK_TABLES (settings) : PK = key TEXT, pas d'id ni created_at.
    const record = this.isKeyPkTable(pg)
      ? {
          ...data,
          ...(!this.isRootTable(pg) ? { tenant_id: this.tenantId } : {}),
        }
      : {
          ...data,
          // P0-4 / F2-4 : respecter l'id fourni par l'appelant (cohérent avec
          // createMany et avec le DexieAdapter).
          id: data?.id ?? crypto.randomUUID(),
          // ROOT_TABLES (societes) n'ont pas de colonne tenant_id
          ...(!this.isRootTable(pg) ? { tenant_id: this.tenantId } : {}),
          created_at: new Date().toISOString(),
        }
    const { data: created, error } = await this.client
      .from(pg).insert(record).select().single()
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
    // A-02 : immuabilité SYSCOHADA Art.19 — une écriture `posted` est intangible.
    // On lit le statut actuel avant d'autoriser la mise à jour.
    if (table === 'journalEntries') {
      const { data: existing } = await this.client
        .from(this.pgTable(table)).select('status').eq('id', id).eq('tenant_id', this.tenantId).single()
      if (existing?.status === 'posted') {
        // ALLOWED_META : champs autorisés sur une écriture posted (immuabilité SYSCOHADA Art.19).
        // - notes / tags / attachments : annotations non comptables
        // - lines / lettrageCode : le lettrage est une opération post-validation autorisée
        //   (SYSCOHADA permet le lettrage des comptes auxiliaires sans modifier les montants)
        const ALLOWED_META = ['notes', 'tags', 'attachments', 'lines', 'lettrageCode']
        const changedKeys = Object.keys(data)
        const hasNonMeta = changedKeys.some(k => !ALLOWED_META.includes(k))
        if (hasNonMeta) {
          throw new Error(
            `SYSCOHADA Art.19 : écriture ${id} est validée (posted) — seuls notes/tags/attachments/lettrage sont modifiables.`
          )
        }
      }
    }
    const pgT = this.pgTable(table)
    // KEY_PK_TABLES (settings) : PK = colonne `key`, pas `id`.
    const pkColU = this.isKeyPkTable(pgT) ? 'key' : 'id'
    let uq = this.client.from(pgT).update(data).eq(pkColU, id)
    if (!this.isRootTable(pgT)) uq = uq.eq('tenant_id', this.tenantId)
    const { data: updated, error } = await uq.select().single()
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
    // A-03 : SYSCOHADA Art.19 — interdire la suppression physique d'une écriture validée/postée.
    if (table === 'journalEntries') {
      const { data: existing } = await this.client
        .from(this.pgTable(table)).select('status').eq('id', id).eq('tenant_id', this.tenantId).single()
      if (existing?.status === 'validated' || existing?.status === 'posted') {
        throw new Error(
          `SYSCOHADA Art.19 : écriture ${id} est ${existing.status} — suppression physique interdite. Utiliser la contrepassation.`
        )
      }
    }
    const pgDel = this.pgTable(table)
    const pkColD = this.isKeyPkTable(pgDel) ? 'key' : 'id'
    let dq = this.client.from(pgDel).delete().eq(pkColD, id)
    if (!this.isRootTable(pgDel)) dq = dq.eq('tenant_id', this.tenantId)
    const { error } = await dq
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
    const pgC = this.pgTable(table)
    try {
      let query = this.client.from(pgC).select('*', { count: 'exact', head: true })
      if (!this.isRootTable(pgC)) query = query.eq('tenant_id', this.tenantId)
      if (filters?.where) {
        for (const [k, v] of Object.entries(filters.where)) {
          query = query.eq(k, v)
        }
      }
      const { count, error } = await query
      if (error) return 0
      return count ?? 0
    } catch (_e) {
      return 0
    }
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
    // B1 : la RPC renvoie du snake_case PostgreSQL ; TrialBalanceRow attend du camelCase.
    // Sans ce mapping, toutes les colonnes sont undefined → balance vide en mode SaaS.
    return ((data as any[]) || []).map(row => ({
      accountCode:      row.account_code   ?? row.accountCode   ?? '',
      accountName:      row.account_name   ?? row.accountName   ?? '',
      debitOuverture:   row.debit_ouverture  ?? row.debitOuverture  ?? 0,
      creditOuverture:  row.credit_ouverture ?? row.creditOuverture ?? 0,
      debitMouvement:   row.total_debit    ?? row.debitMouvement   ?? 0,
      creditMouvement:  row.total_credit   ?? row.creditMouvement  ?? 0,
      debitSolde:       row.solde_debiteur ?? row.debitSolde        ?? 0,
      creditSolde:      row.solde_crediteur ?? row.creditSolde      ?? 0,
    })) as TrialBalanceRow[]
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
    // P0-4 : l'ancienne version insérait l'entête en y embarquant `entry.lines`,
    // alors que les lignes vivent dans la table séparée `journal_lines`. Résultat :
    // écriture SANS lignes (le trigger d'équilibre ne se déclenchait jamais),
    // balance et grand livre vides. On passe désormais par une RPC qui insère
    // ATOMIQUEMENT l'entête + ses lignes dans une seule transaction Postgres
    // (le trigger DEFERRABLE valide l'équilibre au commit), et qui dérive le
    // tenant côté serveur via get_user_company_id() (cf. migration de sécurité).
    const { lines, ...header } = entry as any
    const { data, error } = await this.client.rpc('save_journal_entry', {
      p_entry: header,
      p_lines: lines ?? [],
    })
    if (error) throw new Error(error.message)
    // La RPC renvoie la ligne journal_entries créée (snake_case). On ré-attache
    // les lignes côté objet retourné pour rester cohérent avec l'appelant.
    return { ...(data as any), id: (data as any)?.id, lines: lines ?? [] } as JournalEntry
  }

  async transaction<T>(_tables: TableName[], fn: (adapter: DataAdapter) => Promise<T>): Promise<T> {
    // Supabase doesn't support client-side transactions natively.
    // For atomicity, use RPC functions server-side.
    return fn(this)
  }

  async logAudit(event: Omit<AuditEntry, 'id' | 'hash'>): Promise<void> {
    // Hash is computed by Postgres trigger
    await this.client.from('audit_logs').insert({
      ...event,
      id: crypto.randomUUID(),
      tenant_id: this.tenantId,
      hash: '', // trigger fills this
    })
  }

  async getAuditTrail(filters?: QueryFilters): Promise<AuditEntry[]> {
    return this.getAll<AuditEntry>('auditLogs', filters)
  }

  async rpc(rpcName: string, params: Record<string, unknown>): Promise<any | null> {
    const rpcParams = { ...params, p_tenant_id: this.tenantId }
    const { data, error } = await this.client.rpc(rpcName, rpcParams)
    if (error) throw new Error(`RPC ${rpcName} failed: ${error.message}`)
    return data
  }
}
