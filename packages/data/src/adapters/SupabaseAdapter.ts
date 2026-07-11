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
  // Relevés bancaires importés + journal des rapports
  bankStatements: 'bank_statements',
  bankStatementLines: 'bank_statement_lines',
  reports: 'reports',
  // Espace collaboratif
  collabChannels: 'collab_channels',
  collabMessages: 'collab_messages',
  collabTasks: 'collab_tasks',
  collabTaskComments: 'collab_task_comments',
  collabPresence: 'collab_presence',
  collabDocuments: 'collab_documents',
  // Module Stock (SAP MM) — L0
  stockSites: 'stock_sites',
  stockWarehouses: 'stock_warehouses',
  stockLocations: 'stock_locations',
  stockMaterials: 'stock_materials',
  stockUomConversions: 'stock_uom_conversions',
  stockBatches: 'stock_batches',
  stockSerials: 'stock_serials',
  stockQuants: 'stock_quants',
  stockValuationLayers: 'stock_valuation_layers',
  stockMovementTypes: 'stock_movement_types',
  stockGlDetermination: 'stock_gl_determination',
  stockDocuments: 'stock_documents',
  stockDocumentLines: 'stock_document_lines',
  stockCountDocuments: 'stock_count_documents',
  stockCountLines: 'stock_count_lines',
  stockReservations: 'stock_reservations',
}

// ─── Normaliseurs snake_case → camelCase ─────────────────────────────────────
// Appelés dans getAll() pour que TOUS les consommateurs reçoivent
// du camelCase sans avoir à gérer deux formats.

function normalizeJournalEntry(r: any): any {
  return {
    ...r,
    entryNumber:  r.entry_number  || r.entryNumber  || '',
    totalDebit:   Number(r.total_debit  ?? r.totalDebit  ?? 0),
    totalCredit:  Number(r.total_credit ?? r.totalCredit ?? 0),
    createdAt:    r.created_at    || r.createdAt,
    createdBy:    r.created_by    || r.createdBy,
    updatedAt:    r.updated_at    || r.updatedAt,
    // Statut d'extourne : sans ces alias, `e.reversed` restait undefined en SaaS
    // → le filtre `!e.reversed` de l'extourne était toujours vrai → DOUBLE
    // extourne à chaque relance. Idem lien de contrepassation (reversalOf).
    reversed:     r.reversed ?? false,
    reversedBy:   r.reversed_by   || r.reversedBy   || undefined,
    reversedAt:   r.reversed_at   || r.reversedAt   || undefined,
    reversalOf:   r.reversal_of   || r.reversalOf   || undefined,
    lines:        Array.isArray(r.lines) ? r.lines : [],  // injecté séparément
  }
}

function normalizeJournalLine(r: any): any {
  return {
    ...r,
    entryId:     r.entry_id     || r.entryId     || '',
    accountCode: r.account_code || r.accountCode || '',
    accountName: r.account_name || r.accountName || '',
    tiersCode:   r.tiers_code   || r.tiersCode   || '',
    // Code/nom tiers : indispensable pour l'attribution par client/fournisseur
    // (encours, balance auxiliaire). Mappé depuis third_party_code (SaaS).
    thirdPartyCode: r.third_party_code || r.thirdPartyCode || r.tiers_code || '',
    thirdPartyName: r.third_party_name || r.thirdPartyName || '',
    // Exposés en camelCase pour les modules (lettrage par tiers, effets/échéances,
    // analytique). Sans ça, Lettrage.tsx lisait `line.lettrageCode` = undefined
    // même quand la colonne DB était remplie → tout apparaissait « non lettré ».
    lettrageCode:   r.lettrage_code   || r.lettrageCode   || undefined,
    dateEcheance:   r.date_echeance   || r.dateEcheance   || undefined,
    analyticalCode: r.analytical_code || r.analyticalCode || undefined,
    debit:       Number(r.debit  ?? 0),
    credit:      Number(r.credit ?? 0),
  }
}

function normalizeFiscalYear(r: any): any {
  return {
    ...r,
    startDate:  r.start_date  || r.startDate  || '',
    endDate:    r.end_date    || r.endDate    || '',
    isActive:   r.is_active   ?? r.isActive   ?? false,
    isClosed:   r.is_closed   ?? r.isClosed   ?? false,
    closedAt:   r.closed_at   || r.closedAt,
    createdAt:  r.created_at  || r.createdAt,
  }
}

// periodes_comptables : sans ce normaliseur, fiscalYearId/startDate étaient
// undefined à la lecture → les périodes ne s'affichaient jamais (le bouton
// « Créer les périodes mensuelles » restait, l'opération semblait sans effet).
function normalizeFiscalPeriod(r: any): any {
  return {
    ...r,
    fiscalYearId: r.fiscal_year_id || r.fiscalYearId || '',
    startDate:    r.start_date     || r.startDate    || '',
    endDate:      r.end_date       || r.endDate      || '',
    progression:  Number(r.progression ?? 0),
    closedAt:     r.closed_at      || r.closedAt,
    closedBy:     r.closed_by      || r.closedBy,
    reopenedAt:   r.reopened_at    || r.reopenedAt,
    reopenedBy:   r.reopened_by    || r.reopenedBy,
    createdAt:    r.created_at      || r.createdAt,
  }
}

function normalizeAccount(r: any): any {
  return {
    ...r,
    isActive:       r.is_active      ?? r.isActive      ?? true,
    normalBalance:  r.normal_balance  || r.normalBalance  || '',
    accountClass:   r.account_class   || r.accountClass   || '',
    accountType:    r.account_type    || r.accountType    || '',
    isReconcilable: r.is_reconcilable ?? r.isReconcilable ?? false,
    lettrable:      r.is_reconcilable ?? r.lettrable      ?? false,
  }
}

function normalizeThirdParty(r: any): any {
  // On termine par normalizeGeneric pour aliaser TOUTES les colonnes snake_case restantes
  // (tax_id→taxId, regime_fiscal→regimeFiscal, conditions_paiement→conditionsPaiement,
  // third_party_code, credit_limit…). Sans ça, un normaliseur DÉDIÉ court-circuite le
  // générique et laisse ces champs métier `undefined` côté composants.
  return normalizeGeneric({
    ...r,
    raisonSociale: r.raisonSociale || r.name || '',
    isActive:      r.is_active     ?? r.isActive ?? true,
    accountCode:   r.account_code  || r.accountCode || '',
  })
}

function normalizeAsset(r: any): any {
  const cumul = Number(r.cumul_depreciation ?? r.cumulDepreciation ?? 0)
  const acquisition = Number(r.acquisition_value ?? r.acquisitionValue ?? 0)
  // On termine par normalizeGeneric pour aliaser TOUTES les colonnes étendues
  // snake_case restantes (manufacturer, serial_number, warranty_*, insurance_*,
  // building_name, revaluation_amount, impairment_amount…) en camelCase. Sans
  // ça, un normaliseur DÉDIÉ court-circuite le générique et laisse ces champs
  // métier `undefined` côté composants.
  return normalizeGeneric({
    ...r,
    accountCode:        r.account_code        || r.accountCode || '',
    acquisitionValue:   acquisition,
    residualValue:      Number(r.residual_value     ?? r.residualValue ?? 0),
    acquisitionDate:    r.acquisition_date    || r.acquisitionDate || '',
    usefulLife:         Number(r.useful_life_years  ?? r.usefulLife ?? r.usefulLifeYears ?? 0),
    usefulLifeYears:    Number(r.useful_life_years  ?? r.usefulLifeYears ?? 0),
    cumulDepreciation:  cumul,
    // Alias métier fréquents pour la VNC/amortissement (lus par certains écrans).
    accumulatedDepreciation: cumul,
    amortissementsCumules:   cumul,
    netBookValue:            acquisition - cumul,
    depreciationMethod: r.depreciation_method || r.depreciationMethod || 'linear',
    depreciationAccountCode: r.depreciation_account_code || r.depreciationAccountCode || '',
  })
}

// Normaliseur GÉNÉRIQUE : ajoute pour chaque clé snake_case son alias camelCase
// (non destructif — les clés d'origine sont conservées). Évite les champs
// `undefined` côté composants qui lisent en camelCase des tables sans
// normaliseur dédié (budget_lines, tax_declarations, recovery_cases…).
function normalizeGeneric(r: any): any {
  if (!r || typeof r !== 'object') return r
  const out: any = { ...r }
  for (const k of Object.keys(r)) {
    if (k.includes('_')) {
      const camel = k.replace(/_([a-z0-9])/g, (_m, c) => c.toUpperCase())
      if (!(camel in out)) out[camel] = r[k]
    }
  }
  return out
}

const TABLE_NORMALIZERS: Record<string, (r: any) => any> = {
  journal_entries: normalizeJournalEntry,
  journal_lines:   normalizeJournalLine,
  fiscal_years:    normalizeFiscalYear,
  periodes_comptables: normalizeFiscalPeriod,
  accounts:        normalizeAccount,
  third_parties:   normalizeThirdParty,
  assets:          normalizeAsset,
  // Tables sans normaliseur dédié → alias camelCase génériques.
  budget_lines:      normalizeGeneric,
  tax_declarations:  normalizeGeneric,
  recovery_cases:    normalizeGeneric,
  audit_logs:        normalizeGeneric,
  inventory_items:   normalizeGeneric,
  exchange_rates:    normalizeGeneric,
  // Clôture : sans ces alias, les dates (start_date→startDate…) revenaient
  // undefined → « Période undefined → ∞ » sur les engagements hors bilan, et le
  // service de révision lisait tous ses champs undefined en SaaS.
  off_balance_commitments: normalizeGeneric,
  revision_items:          normalizeGeneric,
  // Espace collaboratif
  collab_channels:      normalizeGeneric,
  collab_messages:      normalizeGeneric,
  collab_tasks:         normalizeGeneric,
  collab_task_comments: normalizeGeneric,
  collab_presence:      normalizeGeneric,
  collab_documents:     normalizeGeneric,
  // Module Stock (SAP MM) — L0 : alias camelCase génériques
  stock_sites:             normalizeGeneric,
  stock_warehouses:        normalizeGeneric,
  stock_locations:         normalizeGeneric,
  stock_materials:         normalizeGeneric,
  stock_uom_conversions:   normalizeGeneric,
  stock_batches:           normalizeGeneric,
  stock_serials:           normalizeGeneric,
  stock_quants:            normalizeGeneric,
  stock_valuation_layers:  normalizeGeneric,
  stock_movement_types:    normalizeGeneric,
  stock_gl_determination:  normalizeGeneric,
  stock_documents:         normalizeGeneric,
  stock_document_lines:    normalizeGeneric,
  stock_count_documents:   normalizeGeneric,
  stock_count_lines:       normalizeGeneric,
  stock_reservations:      normalizeGeneric,
}

export class SupabaseAdapter implements DataAdapter {
  private client: SupabaseClient
  private tenantId: string

  // Cache mémoire court des lectures getAll (par table+tenant+filtres). Évite de
  // re-fetcher/re-traiter les 10k+ lignes à chaque montage de composant
  // (Personnel, Autres Tiers, balances…). Invalidé à chaque écriture et au
  // changement de tenant ; TTL de sécurité pour les modifs externes.
  // TTL 5 min : les données financières ne changent pas hors écriture (qui invalide).
  private static readonly CACHE_TTL = 300000
  // STATIQUE (partagé entre instances) : le fix "course au tenant" RECRÉE l'adapter
  // quand le vrai tenant se résout. Avec un cache par instance, chaque recréation
  // repartait à froid (re-fetch des 10k+ lignes). Un cache statique survit à la
  // recréation ET est partagé par tous les composants/queries. Clés préfixées par
  // tenant → pas de fuite inter-tenant.
  private static cache = new Map<string, { data: unknown[]; ts: number; tenant: string }>()
  private get cache() { return SupabaseAdapter.cache }
  // Coalescence des requêtes en vol : si N composants montent en même temps et
  // demandent la même clé, une SEULE requête réseau part ; les autres attendent
  // la même promesse au lieu de refetcher 10k+ lignes chacun.
  private static inflight = new Map<string, Promise<unknown[]>>()
  private invalidateCache() { SupabaseAdapter.cache.clear() }

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
    // NE PAS invalider : les clés de cache sont préfixées par tenantId, donc aucune
    // fuite inter-tenant. Vider ici détruisait le cache pile à la résolution du
    // vrai tenant (cause majeure de lenteur). Les écritures invalident toujours.
  }

  getMode(): DataMode { return 'saas' }

  /**
   * Convertit toutes les clés d'un objet de camelCase vers snake_case.
   *
   * Le frontend TypeScript utilise camelCase (accountClass, startDate, isActive…)
   * mais toutes les tables Supabase/PostgreSQL utilisent snake_case
   * (account_class, start_date, is_active…).
   *
   * Cette transformation est appliquée sur le payload de TOUS les create/update
   * pour garantir que les colonnes sont bien adressées, quelque soit l'appelant.
   *
   * Exceptions :
   *  - Les clés déjà en snake_case (contenant '_') sont conservées
   *  - Les clés réservées (id, key, tenant_id, created_at, updated_at) idem
   *  - Si une clé camelCase ET sa version snake_case coexistent, snake_case gagne
   */
  private static toSnake(data: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(data)) {
      const snake = k.replace(/([A-Z])/g, '_$1').toLowerCase()
      result[snake] = v
    }
    // Si la version camelCase et snake_case coexistent, la valeur snake_case gagne
    // (ex: { startDate: 'x', start_date: 'y' } → { start_date: 'y' })
    for (const [k, v] of Object.entries(data)) {
      const snake = k.replace(/([A-Z])/g, '_$1').toLowerCase()
      if (snake !== k && k in data) {
        // clé snake_case déjà présente dans data ? elle prend la priorité
        if (Object.prototype.hasOwnProperty.call(data, snake)) {
          result[snake] = data[snake]
        }
      }
    }
    return result
  }

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
    if (!data) return null
    // Normalisation snake→camel comme getAll : sans elle, les consommateurs de getById
    // lisaient des champs undefined (ex. asset.acquisitionValue) → calculs faussés
    // (la mise à jour d'amortissement écrasait le cumul à 0).
    const normalizer = TABLE_NORMALIZERS[pg]
    const normalized: any = normalizer ? normalizer(data) : data
    // Injection des lignes pour journal_entries — comme getAll/getPage. Sans ça, les
    // consommateurs de getById (validation, contrepassation) lisaient lines=undefined en
    // SaaS → « min 2 lignes » échouait et reverseEntry plantait sur original.lines.map.
    if (pg === 'journal_entries' && normalized) {
      try {
        const { data: linesData } = await this.client
          .from('journal_lines').select('*').eq('entry_id', id).eq('tenant_id', this.tenantId)
        normalized.lines = (linesData || []).map((l: any) => normalizeJournalLine(l))
      } catch { normalized.lines = normalized.lines ?? [] }
    }
    return normalized as T | null
  }

  // Pagination par tranches pour contourner le plafond `max-rows` de PostgREST
  // (souvent 1000). Sans cette boucle, journal_lines (10 319) est TRONQUÉ silencieusement
  // → écritures sans lignes → états financiers à 0. Ordonne par une colonne stable.
  private async fetchAllPaginated(build: () => any, chunk = 1000): Promise<any[]> {
    const all: any[] = []
    let from = 0
    for (;;) {
      const { data, error } = await build().range(from, from + chunk - 1)
      if (error) throw error
      const batch = (data || []) as any[]
      all.push(...batch)
      if (batch.length < chunk) break
      from += chunk
    }
    return all
  }

  async getAll<T>(table: TableName, filters?: QueryFilters): Promise<T[]> {
    const pg = this.pgTable(table)
    const cacheKey = `${pg}:${this.tenantId}:${JSON.stringify(filters || {})}`
    const cached = this.cache.get(cacheKey)
    if (cached && cached.tenant === this.tenantId && (Date.now() - cached.ts) < SupabaseAdapter.CACHE_TTL) {
      return cached.data.slice() as T[]
    }
    // Coalescence in-flight : réutilise une requête déjà en cours pour la même clé
    // au lieu de lancer N fetchs parallèles de 10k+ lignes au montage d'une page.
    const pending = SupabaseAdapter.inflight.get(cacheKey)
    if (pending) return (await pending).slice() as T[]

    const fetchPromise: Promise<unknown[]> = (async () => {
     try {
      // Attendre (BRIÈVEMENT) que la session d'auth soit restaurée avant de requêter,
      // sinon la 1re requête part non authentifiée → RLS renvoie 0 ligne.
      // ⚠️ JAMAIS un await nu sur auth.getSession() : supabase-js sérialise les appels
      // auth derrière un verrou (navigator.locks) et un appel auth exécuté DANS le
      // callback onAuthStateChange peut le retenir → DEADLOCK → tous les getAll
      // suspendus → app entière à 0 sans erreur. On course donc avec un timeout court :
      // si le verrou est occupé, on requête quand même (le réessai-si-vide couvre le cas).
      try {
        await Promise.race([
          (this.client as any).auth.getSession(),
          new Promise((resolve) => setTimeout(resolve, 1200)),
        ])
      } catch { /* pas d'auth → requête anon */ }
      // ROOT_TABLES (ex: societes) : pas de colonne tenant_id → filtrer par id = tenantId.
      // Factory : reconstruit une requête fraîche à chaque page (un builder ne se réutilise pas après await).
      const buildBase = () => {
        let q = this.isRootTable(pg)
          ? this.client.from(pg).select('*').eq('id', this.tenantId)
          : this.client.from(pg).select('*').eq('tenant_id', this.tenantId)
        // Les colonnes Postgres sont snake_case ; les appelants passent souvent des
        // clés camelCase (sessionId, fiscalYear…). Sans conversion, `.eq('sessionId',…)`
        // vise une colonne inexistante → erreur PostgREST → getAll renvoie [] en silence.
        const snakeKey = (k: string) => k.replace(/([A-Z])/g, '_$1').toLowerCase()
        if (filters?.where) {
          for (const [k, v] of Object.entries(filters.where)) q = q.eq(snakeKey(k), v)
        }
        if (filters?.startsWith) {
          q = q.like(snakeKey(filters.startsWith.field), `${filters.startsWith.prefix}%`)
        }
        if (filters?.orderBy) {
          q = q.order(snakeKey(filters.orderBy.field), { ascending: filters.orderBy.direction === 'asc' })
        }
        return q
      }

      let rows: any[]
      if (filters?.limit) {
        const start = filters?.offset || 0
        const { data, error } = await buildBase().range(start, start + filters.limit - 1)
        if (error) return []
        rows = (data || []) as any[]
      } else if (this.isRootTable(pg) || this.isKeyPkTable(pg)) {
        // Tables racines/clé (1 à quelques lignes) : un seul appel suffit.
        const { data, error } = await buildBase().range(0, 9999)
        if (error) return []
        rows = (data || []) as any[]
      } else {
        // Pagination par tranches OBLIGATOIRE : le serveur PostgREST PLAFONNE la réponse
        // (preuve terrain : sur 10 319 lignes, les classes 6/7 — en fin de données — étaient
        // COUPÉES → résultat net et CdR à 0). On récupère TOUTES les lignes en bouclant,
        // ordonnées par id (stable). Le cache statique amortit le coût (1 fois / 5 min).
        rows = await this.fetchAllPaginated(() => buildBase().order('id', { ascending: true }))
      }

      // RÉESSAI si une table À DONNÉES revient VIDE : pour un vrai tenant ces tables ont
      // toujours des lignes → un vide = la session d'auth n'était pas encore prête (course).
      // On réattend la session et on refait, jusqu'à 3 fois. Auto-réparation timing-indépendante.
      // (Couvre les tables qui ne sont JAMAIS vides pour un vrai tenant — écritures,
      // comptes, immos, tiers, exercices : un vide = course d'auth, pas une réalité.)
      if (['journal_entries', 'accounts', 'assets', 'third_parties', 'fiscal_years'].includes(pg) && rows.length === 0) {
        for (let attempt = 0; attempt < 3 && rows.length === 0; attempt++) {
          await new Promise(r => setTimeout(r, 500))
          // getSession coursé avec timeout (jamais d'await nu — risque de deadlock, cf. plus haut)
          try {
            await Promise.race([
              (this.client as any).auth.getSession(),
              new Promise((resolve) => setTimeout(resolve, 800)),
            ])
          } catch { /* noop */ }
          rows = await this.fetchAllPaginated(() => buildBase().order('id', { ascending: true }))
        }
      }

      // ── Normalisation snake_case → camelCase ────────────────────────────
      const normalizer = TABLE_NORMALIZERS[pg]
      if (normalizer) {
        rows = rows.map(normalizer)
      }

      // ── Injection automatique des lignes pour journal_entries ───────────
      // journal_lines PAGINÉ (10 319 lignes > plafond serveur) : sans ça les dernières
      // classes (6/7) étaient tronquées → états financiers à 0. On boucle par tranches.
      if (pg === 'journal_entries' && rows.length > 0) {
        try {
          const linesData = await this.fetchAllPaginated(() =>
            this.client.from('journal_lines').select('*').eq('tenant_id', this.tenantId).order('id', { ascending: true })
          )
          const linesByEntry = new Map<string, any[]>()
          for (const l of linesData) {
            const norm = normalizeJournalLine(l)
            const key = norm.entryId
            if (!key) continue
            if (!linesByEntry.has(key)) linesByEntry.set(key, [])
            linesByEntry.get(key)!.push(norm)
          }
          rows = rows.map(e => ({
            ...e,
            lines: linesByEntry.get(e.id) ?? [],
          }))
        } catch { /* journalLines indisponible — lines reste [] */ }
      }

      // Ne JAMAIS cacher un résultat VIDE : un vide TRANSITOIRE (session/tenant pas encore
      // prêt → RLS renvoie 0 ligne) serait servi pendant tout le TTL et obligerait à
      // rafraîchir la page. On ne cache que des résultats non vides → réessai automatique
      // au prochain rendu une fois l'auth prête. (Coût : une table vraiment vide se
      // re-fetch — négligeable, petite charge.)
      if (rows.length > 0) {
        this.cache.set(cacheKey, { data: rows, ts: Date.now(), tenant: this.tenantId })
      }
      return rows
     } catch (_e) {
       return []
     }
    })()
    SupabaseAdapter.inflight.set(cacheKey, fetchPromise)
    try {
      const result = await fetchPromise
      return result.slice() as T[]
    } finally {
      SupabaseAdapter.inflight.delete(cacheKey)
    }
  }

  // A6 — Pagination KEYSET : WHERE sortField </> cursor ORDER BY sortField LIMIT n+1.
  // Pas de COUNT global (scalable). Injecte les lignes pour la page de journal_entries.
  async getPage<T>(table: TableName, opts: import('../DataAdapter').PageOptions = {}): Promise<import('../DataAdapter').PagedResult<T>> {
    const pg = this.pgTable(table)
    const pageSize = opts.pageSize ?? 20
    const sortField = opts.sortField ?? 'id'
    const asc = (opts.direction ?? 'asc') === 'asc'
    const empty = { rows: [] as T[], nextCursor: null, hasMore: false }
    try {
      let query = this.isRootTable(pg)
        ? this.client.from(pg).select('*').eq('id', this.tenantId)
        : this.client.from(pg).select('*').eq('tenant_id', this.tenantId)
      if (opts.where) {
        for (const [k, v] of Object.entries(opts.where)) query = query.eq(k, v)
      }
      if (opts.cursor !== undefined && opts.cursor !== null) {
        query = asc ? query.gt(sortField, opts.cursor) : query.lt(sortField, opts.cursor)
      }
      query = query.order(sortField, { ascending: asc }).limit(pageSize + 1)
      const { data, error } = await query
      if (error) return empty
      let raw = (data || []) as any[]
      const hasMore = raw.length > pageSize
      if (hasMore) raw = raw.slice(0, pageSize)
      const lastRaw = raw[raw.length - 1]
      const nextCursor = (hasMore && lastRaw) ? (lastRaw[sortField] ?? null) : null

      const normalizer = TABLE_NORMALIZERS[pg]
      let rows = normalizer ? raw.map(normalizer) : raw

      if (pg === 'journal_entries' && rows.length > 0) {
        try {
          const ids = rows.map((e: any) => e.id).filter(Boolean)
          const { data: linesData } = await this.client
            .from('journal_lines').select('*')
            .eq('tenant_id', this.tenantId).in('entry_id', ids)
          const byEntry = new Map<string, any[]>()
          for (const l of (linesData || [])) {
            const norm = normalizeJournalLine(l)
            if (!norm.entryId) continue
            if (!byEntry.has(norm.entryId)) byEntry.set(norm.entryId, [])
            byEntry.get(norm.entryId)!.push(norm)
          }
          rows = rows.map((e: any) => ({ ...e, lines: byEntry.get(e.id) ?? [] }))
        } catch { /* lines indispo */ }
      }
      return { rows: rows as T[], nextCursor, hasMore }
    } catch {
      return empty
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
    this.invalidateCache()
    const pg = this.pgTable(table)
    const now = new Date().toISOString()
    const records = items.map(item => ({
      // camelCase → snake_case avant envoi à Supabase
      ...SupabaseAdapter.toSnake(item),
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
    this.invalidateCache()
    const pg = this.pgTable(table)
    // Normalisation camelCase → snake_case avant envoi à Supabase
    const snake = SupabaseAdapter.toSnake(data)
    // KEY_PK_TABLES (settings) : PK = key TEXT, pas d'id ni created_at.
    const record = this.isKeyPkTable(pg)
      ? {
          ...snake,
          ...(!this.isRootTable(pg) ? { tenant_id: this.tenantId } : {}),
        }
      : {
          ...snake,
          // P0-4 / F2-4 : respecter l'id fourni par l'appelant.
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
        entityId: (record as any).id ?? data?.id,
        details: JSON.stringify(record),
        previousHash: '',
        initiatedBy,
      })
    }
    return created as T
  }

  async update<T>(table: TableName, id: string, data: any, initiatedBy?: string): Promise<T> {
    this.invalidateCache()
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
    // Normalisation camelCase → snake_case avant envoi à Supabase
    const snakeData = SupabaseAdapter.toSnake(data)
    // KEY_PK_TABLES (settings) : PK = colonne `key`, pas `id`.
    const pkColU = this.isKeyPkTable(pgT) ? 'key' : 'id'
    let uq = this.client.from(pgT).update(snakeData).eq(pkColU, id)
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
    this.invalidateCache()
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
    const cacheKey = `rpc:get_account_balance:${this.tenantId}:${prefixes.join(',')}:${dateRange?.start || ''}:${dateRange?.end || ''}`
    const cached = this.cache.get(cacheKey)
    if (cached && cached.tenant === this.tenantId && (Date.now() - cached.ts) < SupabaseAdapter.CACHE_TTL) {
      return cached.data[0] as AccountBalance
    }
    const { data, error } = await this.client.rpc('get_account_balance', {
      p_prefixes: prefixes,
      p_tenant_id: this.tenantId,
      p_start_date: dateRange?.start || null,
      p_end_date: dateRange?.end || null,
    })
    if (error) throw new Error(error.message)
    const ab = data as AccountBalance
    // Ne pas cacher un solde vide/transitoire (auth pas prête) → réessai au prochain rendu.
    if (ab && (ab.debit || ab.credit || ab.solde || ab.lignes)) {
      this.cache.set(cacheKey, { data: [ab], ts: Date.now(), tenant: this.tenantId })
    }
    return ab
  }

  async getTrialBalance(dateRange?: { start: string; end: string }): Promise<TrialBalanceRow[]> {
    // RPC serveur : agrégation des soldes par compte (validated/posted, hors brouillon)
    // côté Postgres → ~234 lignes au lieu de transférer + ré-agréger 10k+ lignes en JS.
    // Mis en cache statique (même TTL) : balance instantanée sur tous les écrans qui
    // affichent des soldes (Balance, Bilan, CdR, dashboards, trésorerie, immo).
    const cacheKey = `rpc:get_trial_balance:${this.tenantId}:${dateRange?.start || ''}:${dateRange?.end || ''}`
    const cached = this.cache.get(cacheKey)
    if (cached && cached.tenant === this.tenantId && (Date.now() - cached.ts) < SupabaseAdapter.CACHE_TTL) {
      return cached.data.slice() as TrialBalanceRow[]
    }
    const { data, error } = await this.client.rpc('get_trial_balance', {
      p_tenant_id: this.tenantId,
      p_start_date: dateRange?.start || null,
      p_end_date: dateRange?.end || null,
    })
    if (error) throw new Error(error.message)
    // B1 : la RPC renvoie du snake_case PostgreSQL ; TrialBalanceRow attend du camelCase.
    // Sans ce mapping, toutes les colonnes sont undefined → balance vide en mode SaaS.
    const mapped = ((data as any[]) || []).map(row => ({
      accountCode:      row.account_code   ?? row.accountCode   ?? '',
      accountName:      row.account_name   ?? row.accountName   ?? '',
      debitOuverture:   row.debit_ouverture  ?? row.debitOuverture  ?? 0,
      creditOuverture:  row.credit_ouverture ?? row.creditOuverture ?? 0,
      debitMouvement:   row.total_debit    ?? row.debitMouvement   ?? 0,
      creditMouvement:  row.total_credit   ?? row.creditMouvement  ?? 0,
      debitSolde:       row.solde_debiteur ?? row.debitSolde        ?? 0,
      creditSolde:      row.solde_crediteur ?? row.creditSolde      ?? 0,
    })) as TrialBalanceRow[]
    if (mapped.length > 0) {
      this.cache.set(cacheKey, { data: mapped, ts: Date.now(), tenant: this.tenantId })
    }
    return mapped
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
    this.invalidateCache()
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
