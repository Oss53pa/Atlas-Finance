/**
 * glDeterminationService — détermination comptable des mouvements de stock
 * (analogue OBYC SAP). Résolution des comptes SYSCOHADA + CRUD éditable.
 */
import type { DataAdapter } from '@atlas/data';
import type { DBStockGlDetermination } from '../../lib/db';

export type TransactionKey = 'BSX' | 'GBB' | 'WRX' | 'PRD' | 'UMB';

export async function listDeterminations(adapter: DataAdapter): Promise<DBStockGlDetermination[]> {
  const rows = await adapter.getAll<DBStockGlDetermination>('stockGlDetermination');
  return rows.sort((a, b) =>
    (a.valuationClass + a.transactionKey).localeCompare(b.valuationClass + b.transactionKey));
}

export async function updateDetermination(
  adapter: DataAdapter,
  id: string,
  patch: Partial<Pick<DBStockGlDetermination, 'debitAccount' | 'creditAccount' | 'analytic'>>,
): Promise<void> {
  await adapter.update<DBStockGlDetermination>('stockGlDetermination', id, patch as any);
}

/** Résout une clé de détermination (classe × clé) → ligne. */
export function resolve(
  rows: DBStockGlDetermination[],
  valuationClass: string,
  key: TransactionKey,
): DBStockGlDetermination | undefined {
  return rows.find(r => r.valuationClass === valuationClass && r.transactionKey === key);
}

/** Compte de stock (BSX) d'une classe de valorisation. */
export function stockAccount(rows: DBStockGlDetermination[], valuationClass: string): string | undefined {
  return resolve(rows, valuationClass, 'BSX')?.debitAccount || undefined;
}
