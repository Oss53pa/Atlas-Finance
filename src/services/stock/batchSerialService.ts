/**
 * batchSerialService — consultation des lots (batch) et n° de série.
 * La création/consommation se fait via le moteur de mouvements (postMovement) ;
 * ici on liste et on gère les statuts qualité des lots.
 */
import type { DataAdapter } from '@atlas/data';

export interface StockBatch {
  id: string; materialId: string; batchNumber: string;
  manufactureDate?: string; expiryDate?: string;
  qualityStatus: 'libre' | 'bloque' | 'quarantaine' | 'rebut';
  supplierBatchRef?: string;
}

export interface StockSerial {
  id: string; materialId: string; serialNumber: string; batchId?: string;
  status: 'en_stock' | 'sorti' | 'reserve' | 'rebut'; currentLocationId?: string;
}

export async function listBatches(adapter: DataAdapter, materialId?: string): Promise<StockBatch[]> {
  const rows = await adapter.getAll<StockBatch>('stockBatches');
  const filtered = materialId ? rows.filter(b => b.materialId === materialId) : rows;
  return filtered.sort((a, b) => (a.expiryDate || '9999').localeCompare(b.expiryDate || '9999'));
}

export async function listSerials(adapter: DataAdapter, materialId?: string): Promise<StockSerial[]> {
  const rows = await adapter.getAll<StockSerial>('stockSerials');
  const filtered = materialId ? rows.filter(s => s.materialId === materialId) : rows;
  return filtered.sort((a, b) => a.serialNumber.localeCompare(b.serialNumber));
}

export async function setBatchQuality(
  adapter: DataAdapter, id: string, qualityStatus: StockBatch['qualityStatus'],
): Promise<void> {
  await adapter.update('stockBatches', id, { qualityStatus } as any);
}

/** Lots périmés ou proches de la péremption (seuil en jours). `refDate` = YYYY-MM-DD. */
export function expiringBatches(batches: StockBatch[], refDate: string, withinDays = 30): StockBatch[] {
  const ref = new Date(refDate).getTime();
  const horizon = ref + withinDays * 86400000;
  return batches.filter(b => {
    if (!b.expiryDate) return false;
    const exp = new Date(b.expiryDate).getTime();
    return exp <= horizon;
  });
}

export const QUALITY_LABELS: Record<StockBatch['qualityStatus'], string> = {
  libre: 'Libre', bloque: 'Bloqué', quarantaine: 'Quarantaine', rebut: 'Rebut',
};
export const SERIAL_STATUS_LABELS: Record<StockSerial['status'], string> = {
  en_stock: 'En stock', sorti: 'Sorti', reserve: 'Réservé', rebut: 'Rebut',
};
