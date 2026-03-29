/**
 * Correction #4 — Component Approach & WIP Capitalization for Fixed Assets
 * SYSCOHADA component-based depreciation, WIP → final asset, impairment
 */
import type { DataAdapter } from '@atlas/data';
import Decimal from 'decimal.js';
import type { DBAsset } from '../lib/db';

// ============================================================================
// COMPONENT REPLACEMENT
// ============================================================================

/**
 * Replace an asset component.
 * 1. Exit old component: D 28xx (cumul amort) + D 681x (VNC) / C 2xxx (VB)
 * 2. Entry new component: D 2xxx / C 521 or 404
 */
export async function replaceComponent(
  adapter: DataAdapter,
  oldComponentId: string,
  newComponentData: {
    name: string;
    code: string;
    value: Decimal;
    usefulLife: number;
    acquisitionDate: string;
    depreciationMethod: 'linear' | 'declining';
    accountCode: string;
    depreciationAccountCode: string;
    category: string;
    parentAssetId: string;
    componentType: string;
    paymentAccountCode: string;
  }
): Promise<{ oldExitEntryId: string; newEntryId: string; newAssetId: string }> {
  // Get old component
  const oldAsset = await adapter.getById<DBAsset>('assets', oldComponentId);
  if (!oldAsset) throw new Error(`Composant ${oldComponentId} introuvable`);

  const acquisitionValue = new Decimal(oldAsset.acquisitionValue);
  const cumulAmort = new Decimal(oldAsset.cumulDepreciation || 0);
  const vnc = acquisitionValue.minus(cumulAmort);

  // --- Exit old component ---
  const exitLines = [
    {
      id: crypto.randomUUID(),
      accountCode: oldAsset.depreciationAccountCode,
      accountName: `Amort. ${oldAsset.name}`,
      label: `Sortie composant: ${oldAsset.name}`,
      debit: cumulAmort.toNumber(),
      credit: 0,
    },
    {
      id: crypto.randomUUID(),
      accountCode: oldAsset.accountCode,
      accountName: oldAsset.name,
      label: `Sortie composant: ${oldAsset.name}`,
      debit: 0,
      credit: acquisitionValue.toNumber(),
    },
  ];

  // If VNC > 0, record as charge
  if (vnc.gt(0)) {
    exitLines.push({
      id: crypto.randomUUID(),
      accountCode: '681',
      accountName: 'Valeur nette comptable sortie composant',
      label: `VNC sortie composant: ${oldAsset.name}`,
      debit: vnc.toNumber(),
      credit: 0,
    });
  }

  const exitTotalDebit = exitLines.reduce((s, l) => s + l.debit, 0);
  const exitTotalCredit = exitLines.reduce((s, l) => s + l.credit, 0);

  const exitEntry = await adapter.saveJournalEntry({
    entryNumber: '',
    journal: 'OD',
    date: newComponentData.acquisitionDate,
    reference: `COMP-EXIT-${oldAsset.code}`,
    label: `Remplacement composant — sortie ${oldAsset.name}`,
    status: 'validated',
    lines: exitLines,
    totalDebit: exitTotalDebit,
    totalCredit: exitTotalCredit,
    updatedAt: new Date().toISOString(),
    createdBy: 'system',
  });

  // Mark old asset as disposed
  await adapter.update('assets', oldComponentId, { status: 'disposed' });

  // --- Entry new component ---
  const newValue = newComponentData.value;
  const newEntryJournal = await adapter.saveJournalEntry({
    entryNumber: '',
    journal: 'OD',
    date: newComponentData.acquisitionDate,
    reference: `COMP-IN-${newComponentData.code}`,
    label: `Remplacement composant — entrée ${newComponentData.name}`,
    status: 'validated',
    lines: [
      {
        id: crypto.randomUUID(),
        accountCode: newComponentData.accountCode,
        accountName: newComponentData.name,
        label: `Nouveau composant: ${newComponentData.name}`,
        debit: newValue.toNumber(),
        credit: 0,
      },
      {
        id: crypto.randomUUID(),
        accountCode: newComponentData.paymentAccountCode,
        accountName: 'Paiement composant',
        label: `Paiement composant: ${newComponentData.name}`,
        debit: 0,
        credit: newValue.toNumber(),
      },
    ],
    totalDebit: newValue.toNumber(),
    totalCredit: newValue.toNumber(),
    updatedAt: new Date().toISOString(),
    createdBy: 'system',
  });

  // Create new asset record
  const now = new Date().toISOString();
  const newAsset = await adapter.create<DBAsset>('assets', {
    code: newComponentData.code,
    name: newComponentData.name,
    category: newComponentData.category,
    acquisitionDate: newComponentData.acquisitionDate,
    acquisitionValue: newValue.toNumber(),
    residualValue: 0,
    depreciationMethod: newComponentData.depreciationMethod,
    usefulLifeYears: newComponentData.usefulLife,
    accountCode: newComponentData.accountCode,
    depreciationAccountCode: newComponentData.depreciationAccountCode,
    status: 'active',
    cumulDepreciation: 0,
    parentAssetId: newComponentData.parentAssetId,
    isComponent: true,
    componentType: newComponentData.componentType as DBAsset['componentType'],
  } as Omit<DBAsset, 'id'>);

  return {
    oldExitEntryId: exitEntry.id,
    newEntryId: newEntryJournal.id,
    newAssetId: newAsset.id,
  };
}

// ============================================================================
// WIP → CAPITALIZATION (MISE EN SERVICE)
// ============================================================================

/**
 * Capitalize a work-in-progress asset (immobilisation en cours → mise en service).
 * D: 2xxx (final account) / C: 23xx (WIP account)
 * If components, creates N child assets.
 */
export async function capitalizeAsset(
  adapter: DataAdapter,
  wipAssetId: string,
  commissioning: {
    commissioningDate: string;
    targetAccount: string;
    depreciationAccount: string;
    usefulLife: number;
    depreciationMethod: 'linear' | 'declining';
    components?: Array<{
      name: string;
      code: string;
      value: Decimal;
      usefulLife: number;
      componentType: string;
      depreciationAccount: string;
    }>;
  }
): Promise<void> {
  const wipAsset = await adapter.getById<DBAsset>('assets', wipAssetId);
  if (!wipAsset) throw new Error(`Immobilisation en cours ${wipAssetId} introuvable`);

  const totalValue = new Decimal(wipAsset.acquisitionValue);

  // Journal entry: D target / C WIP
  await adapter.saveJournalEntry({
    entryNumber: '',
    journal: 'OD',
    date: commissioning.commissioningDate,
    reference: `MES-${wipAsset.code}`,
    label: `Mise en service: ${wipAsset.name}`,
    status: 'validated',
    lines: [
      {
        id: crypto.randomUUID(),
        accountCode: commissioning.targetAccount,
        accountName: `Immobilisation ${wipAsset.name}`,
        label: `Mise en service: ${wipAsset.name}`,
        debit: totalValue.toNumber(),
        credit: 0,
      },
      {
        id: crypto.randomUUID(),
        accountCode: wipAsset.accountCode,
        accountName: `Immobilisation en cours ${wipAsset.name}`,
        label: `Mise en service: ${wipAsset.name}`,
        debit: 0,
        credit: totalValue.toNumber(),
      },
    ],
    totalDebit: totalValue.toNumber(),
    totalCredit: totalValue.toNumber(),
    updatedAt: new Date().toISOString(),
    createdBy: 'system',
  });

  if (commissioning.components && commissioning.components.length > 0) {
    // Validate components sum = total value
    const compSum = commissioning.components.reduce(
      (s, c) => s.plus(c.value), new Decimal(0)
    );
    if (!compSum.eq(totalValue)) {
      throw new Error(`Somme composants (${compSum}) ≠ valeur totale (${totalValue})`);
    }

    // Create main asset (parent)
    await adapter.update('assets', wipAssetId, {
      accountCode: commissioning.targetAccount,
      depreciationAccountCode: commissioning.depreciationAccount,
      acquisitionDate: commissioning.commissioningDate,
      usefulLifeYears: commissioning.usefulLife,
      depreciationMethod: commissioning.depreciationMethod,
      status: 'active',
      isComponent: false,
    });

    // Create component assets
    for (const comp of commissioning.components) {
      await adapter.create<DBAsset>('assets', {
        code: comp.code,
        name: comp.name,
        category: wipAsset.category,
        acquisitionDate: commissioning.commissioningDate,
        acquisitionValue: comp.value.toNumber(),
        residualValue: 0,
        depreciationMethod: commissioning.depreciationMethod,
        usefulLifeYears: comp.usefulLife,
        accountCode: commissioning.targetAccount,
        depreciationAccountCode: comp.depreciationAccount,
        status: 'active',
        cumulDepreciation: 0,
        parentAssetId: wipAssetId,
        isComponent: true,
        componentType: comp.componentType as DBAsset['componentType'],
      } as Omit<DBAsset, 'id'>);
    }
  } else {
    // Simple capitalization without components
    await adapter.update('assets', wipAssetId, {
      accountCode: commissioning.targetAccount,
      depreciationAccountCode: commissioning.depreciationAccount,
      acquisitionDate: commissioning.commissioningDate,
      usefulLifeYears: commissioning.usefulLife,
      depreciationMethod: commissioning.depreciationMethod,
      status: 'active',
      isComponent: false,
    });
  }
}

// ============================================================================
// INTEREST CAPITALIZATION
// ============================================================================

/**
 * Capitalize borrowing costs on WIP asset.
 * D: 23xx / C: 791 Transfert charges financières
 */
export async function capitalizeInterest(
  adapter: DataAdapter,
  wipAssetId: string,
  interestAmount: Decimal,
  periodStart: string,
  periodEnd: string
): Promise<void> {
  const wipAsset = await adapter.getById<DBAsset>('assets', wipAssetId);
  if (!wipAsset) throw new Error(`Immobilisation en cours ${wipAssetId} introuvable`);

  await adapter.saveJournalEntry({
    entryNumber: '',
    journal: 'OD',
    date: periodEnd,
    reference: `INT-CAP-${wipAsset.code}`,
    label: `Capitalisation intérêts intercalaires: ${wipAsset.name}`,
    status: 'validated',
    lines: [
      {
        id: crypto.randomUUID(),
        accountCode: wipAsset.accountCode,
        accountName: `Immo. en cours ${wipAsset.name}`,
        label: `Intérêts capitalisés ${periodStart} → ${periodEnd}`,
        debit: interestAmount.toNumber(),
        credit: 0,
      },
      {
        id: crypto.randomUUID(),
        accountCode: '791',
        accountName: 'Transferts de charges financières',
        label: `Intérêts capitalisés ${periodStart} → ${periodEnd}`,
        debit: 0,
        credit: interestAmount.toNumber(),
      },
    ],
    totalDebit: interestAmount.toNumber(),
    totalCredit: interestAmount.toNumber(),
    updatedAt: new Date().toISOString(),
    createdBy: 'system',
  });

  // Update WIP asset value
  const newValue = new Decimal(wipAsset.acquisitionValue).plus(interestAmount);
  await adapter.update('assets', wipAssetId, {
    acquisitionValue: newValue.toNumber(),
  });
}

// ============================================================================
// IMPAIRMENT TEST
// ============================================================================

/**
 * Record impairment if VNC > recoverable value.
 * D: 6914 Dotation aux dépréciations / C: 291 or 292
 */
export async function recordImpairment(
  adapter: DataAdapter,
  assetId: string,
  recoverableValue: Decimal
): Promise<void> {
  const asset = await adapter.getById<DBAsset>('assets', assetId);
  if (!asset) throw new Error(`Actif ${assetId} introuvable`);

  const vnc = new Decimal(asset.acquisitionValue).minus(new Decimal(asset.cumulDepreciation || 0));
  const impairment = vnc.minus(recoverableValue);

  if (impairment.lte(0)) return; // No impairment needed

  const depreciationAccount = asset.accountCode.startsWith('21') ? '291' : '292';

  await adapter.saveJournalEntry({
    entryNumber: '',
    journal: 'OD',
    date: new Date().toISOString().slice(0, 10),
    reference: `IMP-${asset.code}`,
    label: `Dépréciation: ${asset.name}`,
    status: 'validated',
    lines: [
      {
        id: crypto.randomUUID(),
        accountCode: '6914',
        accountName: 'Dotations aux dépréciations des immobilisations',
        label: `Dépréciation ${asset.name}: VNC ${vnc} > VR ${recoverableValue}`,
        debit: impairment.toNumber(),
        credit: 0,
      },
      {
        id: crypto.randomUUID(),
        accountCode: depreciationAccount,
        accountName: 'Dépréciation des immobilisations',
        label: `Dépréciation ${asset.name}`,
        debit: 0,
        credit: impairment.toNumber(),
      },
    ],
    totalDebit: impairment.toNumber(),
    totalCredit: impairment.toNumber(),
    updatedAt: new Date().toISOString(),
    createdBy: 'system',
  });

  // Update asset impairment tracking
  const currentImpairment = new Decimal(asset.impairmentAmount || 0);
  await adapter.update('assets', assetId, {
    impairmentAmount: currentImpairment.plus(impairment).toNumber(),
  });
}

/**
 * Reverse impairment (capped at VNC without impairment).
 * D: 291/292 / C: 7914
 */
export async function reverseImpairment(
  adapter: DataAdapter,
  assetId: string,
  newRecoverableValue: Decimal
): Promise<void> {
  const asset = await adapter.getById<DBAsset>('assets', assetId);
  if (!asset) throw new Error(`Actif ${assetId} introuvable`);

  const currentImpairment = new Decimal(asset.impairmentAmount || 0);
  if (currentImpairment.lte(0)) return;

  const vnc = new Decimal(asset.acquisitionValue)
    .minus(new Decimal(asset.cumulDepreciation || 0));
  const vncWithoutImpairment = vnc.plus(currentImpairment);

  // Reprise = min(current impairment, new recoverable - current VNC)
  // But capped so we don't go above VNC without impairment
  const maxReprise = Decimal.min(
    currentImpairment,
    Decimal.min(newRecoverableValue, vncWithoutImpairment).minus(vnc)
  );

  if (maxReprise.lte(0)) return;

  const depreciationAccount = asset.accountCode.startsWith('21') ? '291' : '292';

  await adapter.saveJournalEntry({
    entryNumber: '',
    journal: 'OD',
    date: new Date().toISOString().slice(0, 10),
    reference: `REP-IMP-${asset.code}`,
    label: `Reprise dépréciation: ${asset.name}`,
    status: 'validated',
    lines: [
      {
        id: crypto.randomUUID(),
        accountCode: depreciationAccount,
        accountName: 'Dépréciation des immobilisations',
        label: `Reprise dépréciation ${asset.name}`,
        debit: maxReprise.toNumber(),
        credit: 0,
      },
      {
        id: crypto.randomUUID(),
        accountCode: '7914',
        accountName: 'Reprises de dépréciations des immobilisations',
        label: `Reprise dépréciation ${asset.name}`,
        debit: 0,
        credit: maxReprise.toNumber(),
      },
    ],
    totalDebit: maxReprise.toNumber(),
    totalCredit: maxReprise.toNumber(),
    updatedAt: new Date().toISOString(),
    createdBy: 'system',
  });

  await adapter.update('assets', assetId, {
    impairmentAmount: currentImpairment.minus(maxReprise).toNumber(),
  });
}
