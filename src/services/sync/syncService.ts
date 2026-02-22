/**
 * Service de synchronisation bidirectionnelle Dexie (IndexedDB) ↔ Supabase.
 *
 * Architecture :
 * - Dexie est la source primaire (offline-first)
 * - Supabase est le backend cloud (sauvegarde + partage multi-utilisateurs)
 * - Sync basée sur les timestamps (updatedAt / createdAt)
 * - File d'attente (queue) pour les opérations en mode hors-ligne
 * - Résolution de conflits : last-write-wins (par défaut) ou manual
 *
 * Tables synchronisées :
 * - journal_entries ↔ journalEntries
 * - chart_of_accounts ↔ accounts
 * - fiscal_years ↔ fiscalYears
 * - tiers (suppliers/customers) ↔ thirdParties
 * - closure_sessions ↔ closureSessions
 * - provisions ↔ provisions
 * - exchange_rates ↔ exchangeRates
 * - hedging_positions ↔ hedgingPositions
 * - revision_items ↔ revisionItems
 * - fixed_assets ↔ assets
 * - budget_lines ↔ budgetLines
 * - inventory_items ↔ inventoryItems
 */

import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { logAudit } from '../../lib/db';
import type { DataAdapter } from '@atlas/data';

// ============================================================================
// TYPES
// ============================================================================

export type SyncDirection = 'push' | 'pull' | 'both';
export type ConflictStrategy = 'local-wins' | 'remote-wins' | 'newest-wins';
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

export interface SyncQueueItem {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  recordId: string;
  payload: Record<string, unknown>;
  timestamp: string;
  retries: number;
  lastError?: string;
}

export interface SyncResult {
  pushed: number;
  pulled: number;
  conflicts: number;
  errors: string[];
  duration: number;
}

export interface SyncState {
  status: SyncStatus;
  lastSyncAt: string | null;
  pendingChanges: number;
  lastResult: SyncResult | null;
}

// ============================================================================
// SYNC QUEUE (persisted in Dexie settings)
// ============================================================================

const QUEUE_KEY = 'sync_queue';
const LAST_SYNC_KEY = 'sync_last_timestamp';

async function getQueue(adapter: DataAdapter): Promise<SyncQueueItem[]> {
  const setting = await adapter.getById('settings', QUEUE_KEY);
  if (!setting?.value) return [];
  try {
    return JSON.parse(setting.value);
  } catch {
    return [];
  }
}

async function saveQueue(adapter: DataAdapter, queue: SyncQueueItem[]): Promise<void> {
  await adapter.create('settings', {
    key: QUEUE_KEY,
    value: JSON.stringify(queue),
    updatedAt: new Date().toISOString(),
  });
}

async function getLastSyncTimestamp(adapter: DataAdapter): Promise<string | null> {
  const setting = await adapter.getById('settings', LAST_SYNC_KEY);
  return setting?.value || null;
}

async function setLastSyncTimestamp(adapter: DataAdapter, ts: string): Promise<void> {
  await adapter.create('settings', {
    key: LAST_SYNC_KEY,
    value: ts,
    updatedAt: new Date().toISOString(),
  });
}

// ============================================================================
// ENQUEUE CHANGES (called after local Dexie writes)
// ============================================================================

/**
 * Enqueue a local change for sync to Supabase.
 * Call this after any write to Dexie to track what needs pushing.
 */
export async function enqueueChange(
  adapter: DataAdapter,
  table: string,
  operation: 'insert' | 'update' | 'delete',
  recordId: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  if (!isSupabaseConfigured) return;

  const queue = await getQueue(adapter);

  // Deduplicate: if same record+table already queued, update it
  const existing = queue.findIndex(q => q.table === table && q.recordId === recordId);
  if (existing >= 0) {
    queue[existing] = {
      ...queue[existing],
      operation: operation === 'delete' ? 'delete' : queue[existing].operation === 'insert' ? 'insert' : operation,
      payload,
      timestamp: new Date().toISOString(),
    };
  } else {
    queue.push({
      id: crypto.randomUUID(),
      table,
      operation,
      recordId,
      payload,
      timestamp: new Date().toISOString(),
      retries: 0,
    });
  }

  await saveQueue(adapter, queue);
}

// ============================================================================
// TABLE MAPPING
// ============================================================================

interface TableMapping {
  dexieTable: string;
  supabaseTable: string;
  timestampField: string;
  mapToSupabase: (record: Record<string, unknown>) => Record<string, unknown>;
  mapFromSupabase: (record: Record<string, unknown>) => Record<string, unknown>;
}

const TABLE_MAPPINGS: TableMapping[] = [
  {
    dexieTable: 'journalEntries',
    supabaseTable: 'journal_entries',
    timestampField: 'updatedAt',
    mapToSupabase: (r) => ({
      id: r.id,
      entry_number: r.entryNumber,
      journal: r.journal,
      date: r.date,
      reference: r.reference,
      label: r.label,
      status: r.status,
      lines: r.lines,
      total_debit: r.totalDebit,
      total_credit: r.totalCredit,
      hash: r.hash,
      previous_hash: r.previousHash,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
    }),
    mapFromSupabase: (r) => ({
      id: r.id,
      entryNumber: r.entry_number,
      journal: r.journal,
      date: r.date,
      reference: r.reference,
      label: r.label,
      status: r.status,
      lines: r.lines,
      totalDebit: r.total_debit,
      totalCredit: r.total_credit,
      hash: r.hash,
      previousHash: r.previous_hash,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }),
  },
  {
    dexieTable: 'accounts',
    supabaseTable: 'chart_of_accounts',
    timestampField: 'id', // accounts don't have timestamps
    mapToSupabase: (r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      account_class: r.accountClass,
      account_type: r.accountType,
      parent_code: r.parentCode,
      level: r.level,
      normal_balance: r.normalBalance,
      is_reconcilable: r.isReconcilable,
      is_active: r.isActive,
    }),
    mapFromSupabase: (r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      accountClass: r.account_class,
      accountType: r.account_type,
      parentCode: r.parent_code,
      level: r.level,
      normalBalance: r.normal_balance,
      isReconcilable: r.is_reconcilable,
      isActive: r.is_active,
    }),
  },
  {
    dexieTable: 'fiscalYears',
    supabaseTable: 'fiscal_years',
    timestampField: 'id',
    mapToSupabase: (r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      start_date: r.startDate,
      end_date: r.endDate,
      is_closed: r.isClosed,
      is_active: r.isActive,
    }),
    mapFromSupabase: (r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      startDate: r.start_date,
      endDate: r.end_date,
      isClosed: r.is_closed,
      isActive: r.is_active,
    }),
  },
  {
    dexieTable: 'closureSessions',
    supabaseTable: 'closure_sessions',
    timestampField: 'dateCreation',
    mapToSupabase: (r) => ({
      id: r.id, type: r.type, periode: r.periode, exercice: r.exercice,
      date_debut: r.dateDebut, date_fin: r.dateFin, date_creation: r.dateCreation,
      statut: r.statut, cree_par: r.creePar, progression: r.progression,
    }),
    mapFromSupabase: (r) => ({
      id: r.id, type: r.type, periode: r.periode, exercice: r.exercice,
      dateDebut: r.date_debut, dateFin: r.date_fin, dateCreation: r.date_creation,
      statut: r.statut, creePar: r.cree_par, progression: r.progression,
    }),
  },
  {
    dexieTable: 'provisions',
    supabaseTable: 'provisions',
    timestampField: 'id',
    mapToSupabase: (r) => ({
      id: r.id, session_id: r.sessionId, compte_client: r.compteClient,
      client: r.client, solde: r.solde, anciennete: r.anciennete,
      taux_provision: r.tauxProvision, montant_provision: r.montantProvision,
      statut: r.statut, date_proposition: r.dateProposition, date_validation: r.dateValidation,
    }),
    mapFromSupabase: (r) => ({
      id: r.id, sessionId: r.session_id, compteClient: r.compte_client,
      client: r.client, solde: r.solde, anciennete: r.anciennete,
      tauxProvision: r.taux_provision, montantProvision: r.montant_provision,
      statut: r.statut, dateProposition: r.date_proposition, dateValidation: r.date_validation,
    }),
  },
  {
    dexieTable: 'exchangeRates',
    supabaseTable: 'exchange_rates',
    timestampField: 'createdAt',
    mapToSupabase: (r) => ({
      id: r.id, from_currency: r.fromCurrency, to_currency: r.toCurrency,
      rate: r.rate, date: r.date, provider: r.provider, created_at: r.createdAt,
    }),
    mapFromSupabase: (r) => ({
      id: r.id, fromCurrency: r.from_currency, toCurrency: r.to_currency,
      rate: r.rate, date: r.date, provider: r.provider, createdAt: r.created_at,
    }),
  },
  {
    dexieTable: 'hedgingPositions',
    supabaseTable: 'hedging_positions',
    timestampField: 'createdAt',
    mapToSupabase: (r) => ({
      id: r.id, currency: r.currency, type: r.type, amount: r.amount,
      strike_rate: r.strikeRate, current_rate: r.currentRate,
      maturity_date: r.maturityDate, unrealized_pnl: r.unrealizedPnL,
      status: r.status, created_at: r.createdAt,
    }),
    mapFromSupabase: (r) => ({
      id: r.id, currency: r.currency, type: r.type, amount: r.amount,
      strikeRate: r.strike_rate, currentRate: r.current_rate,
      maturityDate: r.maturity_date, unrealizedPnL: r.unrealized_pnl,
      status: r.status, createdAt: r.created_at,
    }),
  },
  {
    dexieTable: 'revisionItems',
    supabaseTable: 'revision_items',
    timestampField: 'updatedAt',
    mapToSupabase: (r) => ({
      id: r.id, session_id: r.sessionId, account_code: r.accountCode,
      account_name: r.accountName, isa_assertion: r.isaAssertion,
      risk_level: r.riskLevel, test_type: r.testType, status: r.status,
      findings: r.findings, conclusion: r.conclusion, reviewer: r.reviewer,
      created_at: r.createdAt, updated_at: r.updatedAt,
    }),
    mapFromSupabase: (r) => ({
      id: r.id, sessionId: r.session_id, accountCode: r.account_code,
      accountName: r.account_name, isaAssertion: r.isa_assertion,
      riskLevel: r.risk_level, testType: r.test_type, status: r.status,
      findings: r.findings, conclusion: r.conclusion, reviewer: r.reviewer,
      createdAt: r.created_at, updatedAt: r.updated_at,
    }),
  },
  {
    dexieTable: 'assets',
    supabaseTable: 'fixed_assets',
    timestampField: 'id',
    mapToSupabase: (r) => ({
      id: r.id, code: r.code, name: r.name, category: r.category,
      acquisition_date: r.acquisitionDate, acquisition_value: r.acquisitionValue,
      residual_value: r.residualValue, depreciation_method: r.depreciationMethod,
      useful_life_years: r.usefulLifeYears, account_code: r.accountCode,
      depreciation_account_code: r.depreciationAccountCode, status: r.status,
    }),
    mapFromSupabase: (r) => ({
      id: r.id, code: r.code, name: r.name, category: r.category,
      acquisitionDate: r.acquisition_date, acquisitionValue: r.acquisition_value,
      residualValue: r.residual_value, depreciationMethod: r.depreciation_method,
      usefulLifeYears: r.useful_life_years, accountCode: r.account_code,
      depreciationAccountCode: r.depreciation_account_code, status: r.status,
    }),
  },
  {
    dexieTable: 'budgetLines',
    supabaseTable: 'budget_lines',
    timestampField: 'id',
    mapToSupabase: (r) => ({
      id: r.id, account_code: r.accountCode, fiscal_year: r.fiscalYear,
      period: r.period, budgeted: r.budgeted, actual: r.actual,
    }),
    mapFromSupabase: (r) => ({
      id: r.id, accountCode: r.account_code, fiscalYear: r.fiscal_year,
      period: r.period, budgeted: r.budgeted, actual: r.actual,
    }),
  },
  {
    dexieTable: 'inventoryItems',
    supabaseTable: 'inventory_items',
    timestampField: 'updatedAt',
    mapToSupabase: (r) => ({
      id: r.id, code: r.code, name: r.name, category: r.category,
      location: r.location, quantity: r.quantity, unit_cost: r.unitCost,
      total_value: r.totalValue, min_stock: r.minStock, max_stock: r.maxStock,
      unit: r.unit, last_movement_date: r.lastMovementDate, status: r.status,
      created_at: r.createdAt, updated_at: r.updatedAt,
    }),
    mapFromSupabase: (r) => ({
      id: r.id, code: r.code, name: r.name, category: r.category,
      location: r.location, quantity: r.quantity, unitCost: r.unit_cost,
      totalValue: r.total_value, minStock: r.min_stock, maxStock: r.max_stock,
      unit: r.unit, lastMovementDate: r.last_movement_date, status: r.status,
      createdAt: r.created_at, updatedAt: r.updated_at,
    }),
  },
];

// ============================================================================
// PUSH — Local → Supabase
// ============================================================================

async function pushChanges(adapter: DataAdapter): Promise<{ pushed: number; errors: string[] }> {
  const queue = await getQueue(adapter);
  if (queue.length === 0) return { pushed: 0, errors: [] };

  let pushed = 0;
  const errors: string[] = [];
  const remaining: SyncQueueItem[] = [];

  for (const item of queue) {
    const mapping = TABLE_MAPPINGS.find(m => m.dexieTable === item.table);
    if (!mapping) {
      errors.push(`No mapping for table: ${item.table}`);
      continue;
    }

    try {
      if (item.operation === 'delete') {
        const { error } = await supabase
          .from(mapping.supabaseTable)
          .delete()
          .eq('id', item.recordId);
        if (error) throw error;
      } else {
        const mapped = mapping.mapToSupabase(item.payload);
        const { error } = await supabase
          .from(mapping.supabaseTable)
          .upsert(mapped as never);
        if (error) throw error;
      }
      pushed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      item.retries++;
      item.lastError = msg;

      if (item.retries < 5) {
        remaining.push(item);
      } else {
        errors.push(`Failed after 5 retries [${item.table}/${item.recordId}]: ${msg}`);
      }
    }
  }

  await saveQueue(adapter, remaining);
  return { pushed, errors };
}

// ============================================================================
// PULL — Supabase → Local
// ============================================================================

async function pullChanges(adapter: DataAdapter, since: string | null): Promise<{ pulled: number; errors: string[] }> {
  let pulled = 0;
  const errors: string[] = [];

  for (const mapping of TABLE_MAPPINGS) {
    try {
      let query = supabase.from(mapping.supabaseTable).select('*');

      if (since && mapping.timestampField === 'updatedAt') {
        query = query.gte('updated_at', since);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) continue;

      const mapped = data.map(r => mapping.mapFromSupabase(r as Record<string, unknown>));
      for (const record of mapped) {
        await adapter.create(mapping.dexieTable, record);
      }
      pulled += mapped.length;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Pull ${mapping.supabaseTable}: ${msg}`);
    }
  }

  return { pulled, errors };
}

// ============================================================================
// MAIN SYNC
// ============================================================================

let currentState: SyncState = {
  status: 'idle',
  lastSyncAt: null,
  pendingChanges: 0,
  lastResult: null,
};

/**
 * Get current sync state.
 */
export function getSyncState(): SyncState {
  return { ...currentState };
}

/**
 * Run a full sync cycle: push local changes, then pull remote changes.
 */
export async function sync(adapter: DataAdapter, direction: SyncDirection = 'both'): Promise<SyncResult> {
  if (!isSupabaseConfigured) {
    return { pushed: 0, pulled: 0, conflicts: 0, errors: ['Supabase non configuré'], duration: 0 };
  }

  if (currentState.status === 'syncing') {
    return { pushed: 0, pulled: 0, conflicts: 0, errors: ['Sync déjà en cours'], duration: 0 };
  }

  currentState.status = 'syncing';
  const startTime = performance.now();
  const lastSync = await getLastSyncTimestamp(adapter);

  let pushed = 0;
  let pulled = 0;
  const allErrors: string[] = [];

  try {
    // Push first (local changes take priority)
    if (direction === 'push' || direction === 'both') {
      const pushResult = await pushChanges(adapter);
      pushed = pushResult.pushed;
      allErrors.push(...pushResult.errors);
    }

    // Then pull
    if (direction === 'pull' || direction === 'both') {
      const pullResult = await pullChanges(adapter, lastSync);
      pulled = pullResult.pulled;
      allErrors.push(...pullResult.errors);
    }

    const now = new Date().toISOString();
    await setLastSyncTimestamp(adapter, now);

    const result: SyncResult = {
      pushed,
      pulled,
      conflicts: 0,
      errors: allErrors,
      duration: Math.round(performance.now() - startTime),
    };

    currentState = {
      status: allErrors.length > 0 ? 'error' : 'idle',
      lastSyncAt: now,
      pendingChanges: (await getQueue(adapter)).length,
      lastResult: result,
    };

    await logAudit(
      'SYNC_COMPLETED',
      'system',
      '',
      JSON.stringify({ pushed, pulled, errors: allErrors.length, duration: result.duration }),
    );

    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    currentState.status = 'error';
    return {
      pushed: 0,
      pulled: 0,
      conflicts: 0,
      errors: [msg],
      duration: Math.round(performance.now() - startTime),
    };
  }
}

/**
 * Get count of pending (unsynced) local changes.
 */
export async function getPendingCount(adapter: DataAdapter): Promise<number> {
  const queue = await getQueue(adapter);
  return queue.length;
}

/**
 * Clear the sync queue (use with caution — discards unsynced changes).
 */
export async function clearQueue(adapter: DataAdapter): Promise<void> {
  await saveQueue(adapter, []);
}

/**
 * Check if we're online and Supabase is reachable.
 */
export function isOnline(): boolean {
  return navigator.onLine && isSupabaseConfigured;
}
