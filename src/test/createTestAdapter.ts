/**
 * Creates a DataAdapter that wraps the existing `db` Dexie instance.
 * This ensures that test data seeded via `db.xxx.add(...)` is visible
 * to service functions that receive the adapter.
 */
import { db } from '../lib/db';
import type { DataAdapter } from '@atlas/data';

export function createTestAdapter(): DataAdapter {
  return {
    getMode: () => 'local',
    isOnline: async () => true,

    getById: async (table: string, id: string) => {
      const result = await (db as any)[table].get(id);
      return result ?? null;
    },

    getAll: async (table: string, filters?: any) => {
      let results = await (db as any)[table].toArray();

      if (filters?.where) {
        for (const [k, v] of Object.entries(filters.where)) {
          results = results.filter((r: any) => r[k] === v);
        }
      }
      if (filters?.whereIn) {
        const { field, values } = filters.whereIn;
        results = results.filter((r: any) => values.includes(r[field]));
      }
      if (filters?.startsWith) {
        results = results.filter((r: any) =>
          String(r[filters.startsWith!.field] || '').startsWith(filters.startsWith!.prefix)
        );
      }
      if (filters?.orderBy) {
        results.sort((a: any, b: any) => {
          const aVal = a[filters.orderBy!.field] ?? '';
          const bVal = b[filters.orderBy!.field] ?? '';
          const cmp = String(aVal).localeCompare(String(bVal));
          return filters.orderBy!.direction === 'desc' ? -cmp : cmp;
        });
      }
      if (filters?.offset) results = results.slice(filters.offset);
      if (filters?.limit) results = results.slice(0, filters.limit);

      return results;
    },

    create: async (table: string, data: any) => {
      const id = data.id || crypto.randomUUID();
      const record = { ...data, id };
      await (db as any)[table].add(record);
      return record;
    },

    update: async (table: string, id: string, data: any) => {
      await (db as any)[table].update(id, data);
      return (db as any)[table].get(id);
    },

    delete: async (table: string, id: string) => {
      await (db as any)[table].delete(id);
    },

    count: async (table: string, filters?: any) => {
      if (!filters) return (db as any)[table].count();
      // For filtered count, fall back to getAll + length
      const all = await (db as any)[table].toArray();
      let results = all;
      if (filters?.where) {
        for (const [k, v] of Object.entries(filters.where)) {
          results = results.filter((r: any) => r[k] === v);
        }
      }
      return results.length;
    },

    getJournalEntries: async () => db.journalEntries.toArray(),

    getAccountBalance: async () => ({ debit: 0, credit: 0, solde: 0, lignes: 0 }),

    getTrialBalance: async () => [],

    getBalanceByAccount: async () => new Map(),

    saveJournalEntry: async (entry: any) => {
      const id = crypto.randomUUID();
      const record = {
        ...entry,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalDebit: 0,
        totalCredit: 0,
      };
      await db.journalEntries.add(record);
      return record;
    },

    transaction: async (_tables: any, fn: any) => {
      // Simple pass-through — delegate back to the same adapter
      return fn({
        getAll: async (t: string) => (db as any)[t].toArray(),
        getById: async (t: string, id: string) => (db as any)[t].get(id) ?? null,
        create: async (t: string, data: any) => {
          const id = data.id || crypto.randomUUID();
          const record = { ...data, id };
          await (db as any)[t].add(record);
          return record;
        },
        update: async (t: string, id: string, data: any) => {
          await (db as any)[t].update(id, data);
          return (db as any)[t].get(id);
        },
        delete: async (t: string, id: string) => {
          await (db as any)[t].delete(id);
        },
      } as any);
    },

    logAudit: async () => {},
    getAuditTrail: async () => [],
  } as DataAdapter;
}
