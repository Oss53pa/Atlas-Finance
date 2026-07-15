/**
 * warehouseService — CRUD sites / magasins / emplacements (SAP plant / storage
 * location / bin). `adapter: DataAdapter` en 1er param.
 */
import type { DataAdapter } from '@atlas/data';
import type { DBStockSite, DBStockWarehouse, DBStockLocation } from '../../lib/db';

export const WAREHOUSE_TYPE_LABELS: Record<DBStockWarehouse['type'], string> = {
  principal: 'Principal',
  transit: 'Transit',
  qualite: 'Contrôle qualité',
  rebut: 'Rebut',
  consignation: 'Consignation',
};

// ---- Sites -----------------------------------------------------------------
export async function listSites(adapter: DataAdapter): Promise<DBStockSite[]> {
  const rows = await adapter.getAll<DBStockSite>('stockSites');
  return rows.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
}

export async function createSite(adapter: DataAdapter, input: Omit<DBStockSite, 'id'>): Promise<DBStockSite> {
  if (!input.code?.trim() || !input.name?.trim()) throw new Error('Code et nom du site obligatoires');
  return adapter.create<DBStockSite>('stockSites', { ...input, active: input.active ?? true } as any);
}

// ---- Magasins --------------------------------------------------------------
export async function listWarehouses(adapter: DataAdapter): Promise<DBStockWarehouse[]> {
  const rows = await adapter.getAll<DBStockWarehouse>('stockWarehouses');
  return rows.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
}

export async function createWarehouse(
  adapter: DataAdapter,
  input: Omit<DBStockWarehouse, 'id'>,
): Promise<DBStockWarehouse> {
  if (!input.code?.trim() || !input.name?.trim()) throw new Error('Code et nom du magasin obligatoires');
  const existing = await adapter.getAll<DBStockWarehouse>('stockWarehouses');
  if (existing.some(w => w.code?.toLowerCase() === input.code.toLowerCase())) {
    throw new Error(`Le magasin « ${input.code} » existe déjà`);
  }
  return adapter.create<DBStockWarehouse>('stockWarehouses', {
    ...input, type: input.type ?? 'principal', active: input.active ?? true,
  } as any);
}

export async function updateWarehouse(
  adapter: DataAdapter,
  id: string,
  patch: Partial<Omit<DBStockWarehouse, 'id'>>,
): Promise<void> {
  await adapter.update<DBStockWarehouse>('stockWarehouses', id, patch as any);
}

// ---- Emplacements ----------------------------------------------------------
export async function listLocations(adapter: DataAdapter, warehouseId?: string): Promise<DBStockLocation[]> {
  const rows = await adapter.getAll<DBStockLocation>('stockLocations');
  const filtered = warehouseId ? rows.filter(l => l.warehouseId === warehouseId) : rows;
  return filtered.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
}

export async function createLocation(
  adapter: DataAdapter,
  input: Omit<DBStockLocation, 'id'>,
): Promise<DBStockLocation> {
  if (!input.warehouseId) throw new Error('Magasin de rattachement obligatoire');
  if (!input.code?.trim()) throw new Error('Code emplacement obligatoire');
  const existing = await adapter.getAll<DBStockLocation>('stockLocations');
  if (existing.some(l => l.warehouseId === input.warehouseId && l.code?.toLowerCase() === input.code.toLowerCase())) {
    throw new Error(`L'emplacement « ${input.code} » existe déjà dans ce magasin`);
  }
  return adapter.create<DBStockLocation>('stockLocations', { ...input, active: input.active ?? true } as any);
}
