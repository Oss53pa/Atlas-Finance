/**
 * Assets -> Accounting bridge.
 * Posts depreciation journal entries.
 * SYSCOHADA: DR 681x (dotation), CR 28xx (amortissement cumule).
 */
import type { DataAdapter } from '@atlas/data';
import { logAudit } from '../../../lib/db';
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
export async function postDepreciations(adapter: DataAdapter, depreciations: DepreciationEntry[]): Promise<string[]> {
  const ids: string[] = [];
  const now = new Date().toISOString();

  for (const dep of depreciations) {
    const id = crypto.randomUUID();
    const allEntries = await adapter.getAll('journalEntries', { orderBy: { field: 'entryNumber', direction: 'asc' } });
    const lastEntry = allEntries.length > 0 ? allEntries[allEntries.length - 1] : undefined;
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

    await adapter.create('journalEntries', entry);
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
export async function runDepreciation(adapter: DataAdapter, date: string): Promise<string[]> {
  const assets = await adapter.getAll('assets', { where: { status: 'active' } });
  const depreciations = computeDepreciations(assets, date);
  return postDepreciations(adapter, depreciations);
}

// ============================================================================
// P4-5 : Cession d'immobilisation automatisée
// ============================================================================

export interface DisposalInput {
  assetId: string;
  disposalDate: string;
  prixCession: number;
  motif?: string;
}

export interface DisposalResult {
  assetId: string;
  assetName: string;
  valeurBrute: number;
  amortissementsCumules: number;
  vnc: number;
  prixCession: number;
  plusOuMoinsValue: number;
  journalEntryId: string;
}

/**
 * Automatise la cession d'une immobilisation SYSCOHADA :
 * 1. Calcule la VNC (Valeur Nette Comptable)
 * 2. Calcule la plus/moins-value
 * 3. Génère l'écriture comptable :
 *    - Débit 28x : Reprise amortissements cumulés
 *    - Débit 81  : VNC cessions (charge HAO)
 *    - Crédit 2x : Sortie de l'immobilisation (valeur brute)
 *    - Débit 485/521 : Produit de cession (trésorerie/créance)
 *    - Crédit 82  : Produits cessions (produit HAO)
 * 4. Met à jour le statut de l'immobilisation → 'disposed'
 */
export async function disposeAsset(
  adapter: DataAdapter,
  input: DisposalInput,
): Promise<DisposalResult> {
  const asset = await adapter.getById<DBAsset>('assets', input.assetId);
  if (!asset) throw new Error(`Immobilisation introuvable : ${input.assetId}`);
  if (asset.status !== 'active') throw new Error(`Immobilisation déjà sortie : ${asset.name}`);

  const valeurBrute = asset.acquisitionValue;
  const depBase = valeurBrute - asset.residualValue;
  const annualDep = depBase / asset.usefulLifeYears;

  // Calculer amortissements cumulés jusqu'à la date de cession
  const acqDate = new Date(asset.acquisitionDate);
  const dispDate = new Date(input.disposalDate);
  const yearsElapsed = Math.min(
    (dispDate.getTime() - acqDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25),
    asset.usefulLifeYears,
  );
  const amortissementsCumules = new Money(annualDep).multiply(yearsElapsed).round().toNumber();

  const vnc = new Money(valeurBrute).subtract(new Money(amortissementsCumules)).toNumber();
  const plusOuMoinsValue = new Money(input.prixCession).subtract(new Money(vnc)).toNumber();

  const amortAccountCode = asset.depreciationAccountCode || '28' + asset.accountCode.substring(1);

  const lines = [
    // Reprise des amortissements cumulés
    {
      id: crypto.randomUUID(),
      accountCode: amortAccountCode,
      accountName: `Amortissements ${asset.name}`,
      label: `Reprise amort. cession ${asset.name}`,
      debit: amortissementsCumules,
      credit: 0,
    },
    // VNC = charge HAO (compte 81)
    {
      id: crypto.randomUUID(),
      accountCode: '81',
      accountName: 'VNC des cessions d\'immobilisations',
      label: `VNC cession ${asset.name}`,
      debit: vnc,
      credit: 0,
    },
    // Sortie de l'immobilisation (valeur brute)
    {
      id: crypto.randomUUID(),
      accountCode: asset.accountCode,
      accountName: asset.name,
      label: `Sortie immobilisation ${asset.name}`,
      debit: 0,
      credit: valeurBrute,
    },
  ];

  // Produit de cession si prix > 0
  if (input.prixCession > 0) {
    lines.push({
      id: crypto.randomUUID(),
      accountCode: '521',
      accountName: 'Banque',
      label: `Produit cession ${asset.name}`,
      debit: input.prixCession,
      credit: 0,
    });
    lines.push({
      id: crypto.randomUUID(),
      accountCode: '82',
      accountName: 'Produits des cessions d\'immobilisations',
      label: `Produit cession ${asset.name}`,
      debit: 0,
      credit: input.prixCession,
    });
  }

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

  const now = new Date().toISOString();
  const entryId = crypto.randomUUID();
  const entry: DBJournalEntry = {
    id: entryId,
    entryNumber: `CESS-${asset.code}`,
    journal: 'OD',
    date: input.disposalDate,
    reference: `Cession ${asset.code}`,
    label: `Cession immobilisation — ${asset.name}`,
    status: 'draft',
    nature: 'normal',
    lines,
    totalDebit,
    totalCredit,
    createdAt: now,
    updatedAt: now,
  };

  await adapter.create('journalEntries', entry);

  // Mettre à jour le statut de l'immobilisation
  await adapter.update('assets', input.assetId, { status: 'disposed' });

  await logAudit(
    'ASSET_DISPOSAL',
    'asset',
    input.assetId,
    `Cession ${asset.name}: prix=${input.prixCession}, VNC=${vnc}, PV/MV=${plusOuMoinsValue}`,
  );

  return {
    assetId: input.assetId,
    assetName: asset.name,
    valeurBrute,
    amortissementsCumules,
    vnc,
    prixCession: input.prixCession,
    plusOuMoinsValue,
    journalEntryId: entryId,
  };
}
