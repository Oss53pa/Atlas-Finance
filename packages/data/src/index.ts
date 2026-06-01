/**
 * @atlas/data — Barrel export
 *
 * Fournit le DataAdapter interface + les 3 implementations :
 * - DexieAdapter (local, IndexedDB)
 * - SupabaseAdapter (SaaS, PostgreSQL via Supabase)
 * - HybridAdapter (local + sync cloud)
 */

// Interface & types
export type { DataAdapter, DataMode, TableName, QueryFilters, PageOptions, PagedResult } from './DataAdapter'

// Implementations
export { DexieAdapter } from './adapters/DexieAdapter'
export { SupabaseAdapter } from './adapters/SupabaseAdapter'
export { HybridAdapter } from './adapters/HybridAdapter'
