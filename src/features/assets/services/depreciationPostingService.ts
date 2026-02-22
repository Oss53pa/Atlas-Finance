/**
 * Assets -> Accounting bridge.
 * Posts depreciation journal entries.
 * SYSCOHADA: DR 681x (dotation), CR 28xx (amortissement cumule).
 */
import { db, logAudit } from '../../../lib/db';
import type { DBJournalEntry, DBAsset } from '../../../lib/db';
import { Money } from '@/utils/money';

export interface DepreciationEntry {
  assetId: string;
  assetName: string;
  dotationAccountCode: string;
  amortissementAccountCode: string;
  amount: number;
  date: string;
  exercice: string;
}

/**
 * Compute annual depreciation for all active assets.
 */
export function computeDepreciations(assets: DBAsset[], date: string): DepreciationEntry[] {
  const entries: DepreciationEntry[] = [];

  for (const asset of assets) {
    if (asset.status !== 'active') continue;
    if (asset.acquisitionDate > date) continue;

    const base = asset.acquisitionValue - asset.residualValue;
    const annualAmount = base / asset.usefulLifeYears;

    // Check if fully depreciated
    const acqDate = new Date(asset.acquisitionDate);
    const currentDate = new Date(date);
    const yearsElapsed = (currentDate.getTime() - acqDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    if (yearsElapsed >= asset.usefulLifeYears) continue;

    entries.push({
      assetId: asset.id,
      assetName: asset.name,
      dotationAccountCode: '681' + asset.accountCode.substring(0, 1),
      amortissementAccountCode: asset.depreciationAccountCode || '28' + asset.accountCode.substring(1),
      amount: new Money(annualAmount).round().toNumber(),
      date,
      exercice: currentDate.getFullYear().toString(),
    });
  }

  return entries;
}

/**
 * Post depreciation entries to the journal.
 */
export async function postDepreciations(depreciations: DepreciationEntry[]): Promise<string[]> {
  const ids: string[] = [];
  const now = new Date().toISOString();

  for (const dep of depreciations) {
    const id = crypto.randomUUID();
    const lastEntry = await db.journalEntries.orderBy('entryNumber').last();
    const nextNum = lastEntry ? parseInt(lastEntry.entryNumber.replace(/\D/g, '') || '0') + 1 : 1;
    const entryNumber = `OD-${String(nextNum).padStart(6, '0')}`;

    const entry: DBJournalEntry = {
      id,
      entryNumber,
      journal: 'OD',
      date: dep.date,
      reference: `AMORT-${dep.assetId.slice(0, 8)}`,
      label: `Dotation amortissement — ${dep.assetName}`,
      status: 'draft',
      lines: [
        {
          id: crypto.randomUUID(),
          accountCode: dep.dotationAccountCode,
          accountName: `Dotation amortissements`,
          label: `Dotation ${dep.assetName}`,
          debit: dep.amount,
          credit: 0,
        },
        {
          id: crypto.randomUUID(),
          accountCode: dep.amortissementAccountCode,
          accountName: `Amortissement ${dep.assetName}`,
          label: `Amort. cumule ${dep.assetName}`,
          debit: 0,
          credit: dep.amount,
        },
      ],
      totalDebit: dep.amount,
      totalCredit: dep.amount,
      createdAt: now,
      updatedAt: now,
    };

    await db.journalEntries.add(entry);
    ids.push(id);

    await logAudit(
      'DEPRECIATION_POSTING',
      'journalEntry',
      id,
      `Amortissement ${dep.assetName}: ${dep.amount}`
    );
  }

  return ids;
}

/**
 * Run depreciation for all active assets and post entries.
 */
export async function runDepreciation(date: string): Promise<string[]> {
  const assets = await db.assets.where('status').equals('active').toArray();
  const depreciations = computeDepreciations(assets, date);
  return postDepreciations(depreciations);
}
