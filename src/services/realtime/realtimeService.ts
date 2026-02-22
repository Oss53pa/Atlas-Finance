/**
 * Service Supabase Realtime — abonnements postgres_changes.
 *
 * Permet de recevoir les modifications en temps réel sur les tables Supabase
 * et de synchroniser automatiquement le cache local (Dexie + React Query).
 *
 * Tables écoutées :
 * - journal_entries (INSERT/UPDATE/DELETE)
 * - chart_of_accounts (INSERT/UPDATE)
 * - fiscal_years (UPDATE)
 */

import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import type { DataAdapter } from '@atlas/data';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimeSubscription {
  table: string;
  channel: RealtimeChannel;
  active: boolean;
}

export type RealtimeCallback = (
  event: RealtimeEvent,
  table: string,
  record: Record<string, unknown>,
) => void;

// ============================================================================
// STATE
// ============================================================================

const subscriptions = new Map<string, RealtimeSubscription>();
const listeners = new Set<RealtimeCallback>();

// ============================================================================
// COLUMN MAPPING (Supabase snake_case → Dexie camelCase)
// ============================================================================

function mapJournalEntry(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    entryNumber: row.entry_number,
    journal: row.journal,
    date: row.date,
    reference: row.reference,
    label: row.label,
    status: row.status,
    lines: row.lines,
    totalDebit: row.total_debit,
    totalCredit: row.total_credit,
    hash: row.hash,
    previousHash: row.previous_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAccount(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    accountClass: row.account_class,
    accountType: row.account_type,
    parentCode: row.parent_code,
    level: row.level,
    normalBalance: row.normal_balance,
    isReconcilable: row.is_reconcilable,
    isActive: row.is_active,
  };
}

function mapFiscalYear(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    isClosed: row.is_closed,
    isActive: row.is_active,
  };
}

// ============================================================================
// HANDLERS
// ============================================================================

async function handleChange(
  adapter: DataAdapter,
  table: string,
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
) {
  const event = payload.eventType as RealtimeEvent;
  const record = (payload.new as Record<string, unknown>) || {};
  const oldRecord = (payload.old as Record<string, unknown>) || {};

  // Notify listeners
  for (const cb of listeners) {
    try {
      cb(event, table, record);
    } catch {
      // Ignore listener errors
    }
  }

  // Sync to local Dexie
  try {
    switch (table) {
      case 'journal_entries': {
        if (event === 'DELETE') {
          await adapter.delete('journalEntries', String(oldRecord.id));
        } else {
          const mapped = mapJournalEntry(record);
          await adapter.create('journalEntries', mapped);
        }
        break;
      }
      case 'chart_of_accounts': {
        if (event === 'DELETE') {
          await adapter.delete('accounts', String(oldRecord.id));
        } else {
          const mapped = mapAccount(record);
          await adapter.create('accounts', mapped);
        }
        break;
      }
      case 'fiscal_years': {
        if (event === 'DELETE') {
          await adapter.delete('fiscalYears', String(oldRecord.id));
        } else {
          const mapped = mapFiscalYear(record);
          await adapter.create('fiscalYears', mapped);
        }
        break;
      }
    }
  } catch (err) {
    console.error(`[Realtime] Failed to sync ${table}:`, err);
  }
}

// ============================================================================
// SUBSCRIBE / UNSUBSCRIBE
// ============================================================================

/**
 * Subscribe to realtime changes on a Supabase table.
 */
export function subscribe(adapter: DataAdapter, table: string): RealtimeSubscription | null {
  if (!isSupabaseConfigured) return null;
  if (subscriptions.has(table)) return subscriptions.get(table)!;

  const channel = supabase
    .channel(`realtime-${table}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      (payload) => handleChange(adapter, table, payload),
    )
    .subscribe();

  const sub: RealtimeSubscription = { table, channel, active: true };
  subscriptions.set(table, sub);
  return sub;
}

/**
 * Unsubscribe from a table.
 */
export async function unsubscribe(table: string): Promise<void> {
  const sub = subscriptions.get(table);
  if (!sub) return;

  await supabase.removeChannel(sub.channel);
  subscriptions.delete(table);
}

/**
 * Subscribe to all critical tables.
 */
export function subscribeAll(adapter: DataAdapter): void {
  if (!isSupabaseConfigured) return;

  subscribe(adapter, 'journal_entries');
  subscribe(adapter, 'chart_of_accounts');
  subscribe(adapter, 'fiscal_years');
}

/**
 * Unsubscribe from all tables.
 */
export async function unsubscribeAll(): Promise<void> {
  for (const table of [...subscriptions.keys()]) {
    await unsubscribe(table);
  }
}

/**
 * Add a listener for realtime events.
 */
export function addListener(callback: RealtimeCallback): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/**
 * Get current subscription status.
 */
export function getSubscriptionStatus(): Array<{ table: string; active: boolean }> {
  return [...subscriptions.values()].map(s => ({
    table: s.table,
    active: s.active,
  }));
}
