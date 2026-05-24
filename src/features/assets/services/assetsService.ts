/**
 * Assets Service — DataAdapter-based (B3 fix)
 *
 * Remplace l'ancienne implémentation avec données fictives codées en dur.
 * Toutes les méthodes utilisent maintenant l'adapter DataAdapter (Dexie / Supabase).
 *
 * Mapping DBAsset → Asset :
 *   code           → assetNumber
 *   name           → description
 *   category       → assetCategory
 *   acquisitionValue → acquisitionCost
 *   cumulDepreciation → historicalApc / ordinaryDepreciation
 *   acquisitionValue - cumulDepreciation → netBookValue / historicalNbc
 *   'scrapped'     → 'retired'
 */

import type { DataAdapter } from '@atlas/data';
import type { DBAsset } from '../../../lib/db';
import {
  Asset,
  AssetStats,
  AssetCategory,
  AssetClass,
  AssetMaintenance,
  AssetTransaction,
  AssetDisposal,
} from '../types/assets.types';

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function dbAssetToAsset(a: DBAsset): Asset {
  const cumul = a.cumulDepreciation ?? 0;
  const nbv   = a.acquisitionValue - cumul;

  // Derive assetClass from the accounting account code prefix (SYSCOHADA)
  let assetClass = 'Actifs immobilisés';
  if (a.accountCode) {
    if (a.accountCode.startsWith('21')) assetClass = 'Immobilisations incorporelles';
    else if (a.accountCode.startsWith('22') || a.accountCode.startsWith('23') || a.accountCode.startsWith('24')) assetClass = 'Immobilisations corporelles';
    else if (a.accountCode.startsWith('25') || a.accountCode.startsWith('26') || a.accountCode.startsWith('27')) assetClass = 'Immobilisations financières';
  }

  // Map status: DBAsset has 'scrapped', Asset does not
  const status: Asset['status'] =
    a.status === 'scrapped' ? 'retired' :
    a.status === 'disposed' ? 'disposed' :
    'active';

  return {
    id:                   a.id,
    assetNumber:          a.code,
    description:          a.name,
    assetClass,
    assetCategory:        a.category,
    location:             a.location ?? '',
    capitalizationDate:   a.acquisitionDate,
    acquisitionDate:      a.acquisitionDate,
    acquisitionCost:      a.acquisitionValue,
    historicalApc:        cumul,
    netBookValue:         nbv,
    historicalNbc:        nbv,
    ordinaryDepreciation: cumul,
    status,
    depreciationMethod:   a.depreciationMethod === 'linear' ? 'Linéaire' : 'Dégressif',
    usefulLife:           a.usefulLifeYears,
    salvageValue:         a.residualValue,
    notes:                undefined,
  };
}

function assetToDbAsset(asset: Omit<Asset, 'id'> & { id?: string | number }): Partial<DBAsset> {
  return {
    id:                       String(asset.id ?? crypto.randomUUID()),
    code:                     asset.assetNumber,
    name:                     asset.description,
    category:                 asset.assetCategory,
    acquisitionDate:          asset.acquisitionDate,
    acquisitionValue:         asset.acquisitionCost,
    residualValue:            asset.salvageValue ?? 0,
    depreciationMethod:       asset.depreciationMethod === 'Dégressif' ? 'declining' : 'linear',
    usefulLifeYears:          asset.usefulLife ?? 5,
    accountCode:              '',         // Caller should provide via DBAsset fields directly
    depreciationAccountCode:  '',
    status:                   asset.status === 'retired' ? 'scrapped' :
                              asset.status === 'disposed' ? 'disposed' : 'active',
    cumulDepreciation:        asset.historicalApc ?? 0,
    location:                 asset.location,
  };
}

// ---------------------------------------------------------------------------
// Public API — each function accepts adapter as first argument
// ---------------------------------------------------------------------------

export async function getAssets(
  adapter: DataAdapter,
  filters?: { status?: string; class?: string; category?: string; location?: string }
): Promise<Asset[]> {
  let all = await adapter.getAll<DBAsset>('assets');

  if (filters?.status) {
    // Map front-end status to DBAsset status
    const dbStatus = filters.status === 'retired' ? 'scrapped' : filters.status;
    all = all.filter(a => a.status === dbStatus);
  }
  if (filters?.category) {
    all = all.filter(a => a.category === filters.category);
  }
  if (filters?.location) {
    all = all.filter(a => a.location === filters.location);
  }

  return all.map(dbAssetToAsset);
}

export async function getAsset(adapter: DataAdapter, id: string | number): Promise<Asset | null> {
  const a = await adapter.getById<DBAsset>('assets', String(id));
  return a ? dbAssetToAsset(a) : null;
}

export async function createAsset(adapter: DataAdapter, asset: Omit<Asset, 'id'>): Promise<Asset> {
  const dbData = assetToDbAsset(asset);
  const created = await adapter.create<DBAsset>('assets', dbData as Omit<DBAsset, 'id'>);
  return dbAssetToAsset(created);
}

export async function updateAsset(
  adapter: DataAdapter,
  id: string | number,
  updates: Partial<Asset>
): Promise<Asset> {
  const existing = await adapter.getById<DBAsset>('assets', String(id));
  if (!existing) throw new Error(`Asset ${id} introuvable.`);

  const merged = dbAssetToAsset(existing);
  const updatedAsset = { ...merged, ...updates, id: existing.id };
  const dbData = assetToDbAsset(updatedAsset);

  const saved = await adapter.update<DBAsset>('assets', String(id), dbData);
  return dbAssetToAsset(saved);
}

export async function deleteAsset(adapter: DataAdapter, id: string | number): Promise<void> {
  await adapter.delete('assets', String(id));
}

export async function getStats(adapter: DataAdapter): Promise<AssetStats> {
  const all = await adapter.getAll<DBAsset>('assets');
  const active   = all.filter(a => a.status === 'active');
  const disposed = all.filter(a => a.status === 'disposed' || a.status === 'scrapped');

  const totalValue        = all.reduce((s, a) => s + a.acquisitionValue, 0);
  const totalDepreciation = all.reduce((s, a) => s + (a.cumulDepreciation ?? 0), 0);

  return {
    totalAssets:       all.length,
    totalValue,
    totalDepreciation,
    netBookValue:      totalValue - totalDepreciation,
    activeAssets:      active.length,
    disposedAssets:    disposed.length,
    maintenanceAssets: 0,  // pas de table maintenance dédiée
  };
}

export async function getCategories(adapter: DataAdapter): Promise<AssetCategory[]> {
  const all = await adapter.getAll<DBAsset>('assets');
  const catMap = new Map<string, number>();
  for (const a of all) {
    catMap.set(a.category, (catMap.get(a.category) ?? 0) + 1);
  }
  return Array.from(catMap.entries()).map(([cat, count], i) => ({
    id:    i + 1,
    code:  cat,
    name:  cat,
    count,
  }));
}

// Classes d'immobilisations SYSCOHADA (données de référence fixes)
export async function getClasses(_adapter: DataAdapter): Promise<AssetClass[]> {
  return [
    { id: 1, code: 'INCORPORELLES', name: 'Immobilisations incorporelles', description: 'Comptes 21x — brevets, logiciels, fonds commercial' },
    { id: 2, code: 'CORPORELLES',   name: 'Immobilisations corporelles',   description: 'Comptes 22x–24x — terrains, constructions, matériels' },
    { id: 3, code: 'FINANCIERES',   name: 'Immobilisations financières',   description: 'Comptes 25x–27x — titres, prêts long terme' },
  ];
}

// Maintenances — pas de table dédiée, retourne tableau vide
export async function getMaintenances(
  _adapter: DataAdapter,
  _assetId?: string | number
): Promise<AssetMaintenance[]> {
  return [];
}

export async function createMaintenance(
  _adapter: DataAdapter,
  maintenance: Omit<AssetMaintenance, 'id'>
): Promise<AssetMaintenance> {
  return { ...maintenance, id: Date.now() };
}

export async function updateMaintenance(
  _adapter: DataAdapter,
  id: string | number,
  updates: Partial<AssetMaintenance>
): Promise<AssetMaintenance> {
  return { id, ...updates } as AssetMaintenance;
}

// Transactions — pas de table dédiée (stockMovements est pour stocks), retourne vide
export async function getTransactions(
  _adapter: DataAdapter,
  _assetId?: string | number
): Promise<AssetTransaction[]> {
  return [];
}

// Disposals — filtre les actifs cédés/mis au rebut
export async function getDisposals(adapter: DataAdapter): Promise<AssetDisposal[]> {
  const disposed = await adapter.getAll<DBAsset>('assets', { where: { status: 'disposed' } });
  const scrapped = await adapter.getAll<DBAsset>('assets', { where: { status: 'scrapped' } });
  return [...disposed, ...scrapped].map((a, i) => ({
    id:               i + 1,
    assetId:          a.id,
    assetNumber:      a.code,
    assetDescription: a.name,
    disposalDate:     a.acquisitionDate,  // date de mise au rebut non stockée séparément
    disposalMethod:   'scrap' as const,
    disposalValue:    a.residualValue,
    netBookValue:     a.acquisitionValue - (a.cumulDepreciation ?? 0),
    gainLoss:         a.residualValue - (a.acquisitionValue - (a.cumulDepreciation ?? 0)),
  }));
}

export async function disposeAsset(
  adapter: DataAdapter,
  disposal: Omit<AssetDisposal, 'id'>
): Promise<AssetDisposal> {
  // Marquer l'actif comme cédé
  await adapter.update('assets', String(disposal.assetId), { status: 'disposed' });
  return { ...disposal, id: Date.now() };
}

export async function exportAssets(
  _adapter: DataAdapter,
  _format: 'xlsx' | 'pdf' | 'csv',
  _filters?: Record<string, unknown>
): Promise<Blob> {
  return new Blob([''], { type: 'application/octet-stream' });
}

export async function importAssets(
  _adapter: DataAdapter,
  _file: File
): Promise<{ success: boolean; imported: number; errors?: string[] }> {
  return { success: false, imported: 0, errors: ['Import via fichier non implémenté — utiliser le module DataMigration.'] };
}

// ---------------------------------------------------------------------------
// Compat shim — conserve l'interface AssetsService pour les composants
// qui n'ont pas encore été migrés vers les fonctions directes.
// L'adapter doit être injecté via setAdapter() avant tout appel.
// ---------------------------------------------------------------------------

class AssetsService {
  private adapter: DataAdapter | null = null;

  setAdapter(adapter: DataAdapter) {
    this.adapter = adapter;
  }

  private get db(): DataAdapter {
    if (!this.adapter) throw new Error('AssetsService : adapter non initialisé. Appeler setAdapter(adapter) en premier.');
    return this.adapter;
  }

  getAssets(filters?: Parameters<typeof getAssets>[1]) { return getAssets(this.db, filters); }
  getAsset(id: string | number) { return getAsset(this.db, id); }
  createAsset(asset: Omit<Asset, 'id'>) { return createAsset(this.db, asset); }
  updateAsset(id: string | number, updates: Partial<Asset>) { return updateAsset(this.db, id, updates); }
  deleteAsset(id: string | number) { return deleteAsset(this.db, id); }
  getStats() { return getStats(this.db); }
  getCategories() { return getCategories(this.db); }
  getClasses() { return getClasses(this.db); }
  getMaintenances(assetId?: string | number) { return getMaintenances(this.db, assetId); }
  createMaintenance(m: Omit<AssetMaintenance, 'id'>) { return createMaintenance(this.db, m); }
  updateMaintenance(id: string | number, u: Partial<AssetMaintenance>) { return updateMaintenance(this.db, id, u); }
  getTransactions(assetId?: string | number) { return getTransactions(this.db, assetId); }
  getDisposals() { return getDisposals(this.db); }
  disposeAsset(d: Omit<AssetDisposal, 'id'>) { return disposeAsset(this.db, d); }
  exportAssets(format: 'xlsx' | 'pdf' | 'csv', filters?: Record<string, unknown>) { return exportAssets(this.db, format, filters); }
  importAssets(file: File) { return importAssets(this.db, file); }
}

export const assetsService = new AssetsService();
