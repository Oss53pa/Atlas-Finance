import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';
import Decimal from 'decimal.js';
import {
  replaceComponent,
  capitalizeAsset,
  capitalizeInterest,
  recordImpairment,
  reverseImpairment,
} from '../services/componentReplacementService';

const adapter = createTestAdapter();

async function seedAsset(overrides: Partial<any> = {}) {
  const id = crypto.randomUUID();
  const asset = {
    id,
    code: 'IMM-001',
    name: 'Machine industrielle',
    category: 'materiel',
    acquisitionDate: '2023-01-01',
    acquisitionValue: 10000000,
    residualValue: 0,
    depreciationMethod: 'linear',
    usefulLifeYears: 5,
    accountCode: '2154',
    depreciationAccountCode: '28154',
    status: 'active',
    cumulDepreciation: 0,
    isComponent: false,
    impairmentAmount: 0,
    ...overrides,
  };
  await db.assets.add(asset as any);
  return asset;
}

describe('componentReplacementService', () => {
  beforeEach(async () => {
    await db.assets.clear();
    await db.journalEntries.clear();
  });

  // ========================================================================
  // REPLACE COMPONENT
  // ========================================================================
  describe('replaceComponent', () => {
    it('should exit old component and create new one', async () => {
      const oldComp = await seedAsset({
        code: 'COMP-OLD',
        name: 'Moteur ancien',
        acquisitionValue: 3000000,
        cumulDepreciation: 1200000,
        isComponent: true,
        componentType: 'motor',
        parentAssetId: 'parent-1',
      });

      const result = await replaceComponent(adapter, oldComp.id, {
        name: 'Moteur neuf',
        code: 'COMP-NEW',
        value: new Decimal(4000000),
        usefulLife: 5,
        acquisitionDate: '2025-06-01',
        depreciationMethod: 'linear',
        accountCode: '2154',
        depreciationAccountCode: '28154',
        category: 'materiel',
        parentAssetId: 'parent-1',
        componentType: 'motor',
        paymentAccountCode: '521',
      });

      expect(result.oldExitEntryId).toBeTruthy();
      expect(result.newEntryId).toBeTruthy();
      expect(result.newAssetId).toBeTruthy();

      // Old asset should be disposed
      const oldAsset = await db.assets.get(oldComp.id);
      expect(oldAsset?.status).toBe('disposed');

      // New asset should exist and be active
      const newAsset = await db.assets.get(result.newAssetId);
      expect(newAsset).toBeTruthy();
      expect(newAsset!.name).toBe('Moteur neuf');
      expect(newAsset!.acquisitionValue).toBe(4000000);
      expect(newAsset!.status).toBe('active');
      expect(newAsset!.isComponent).toBe(true);
    });

    it('should generate balanced journal entries for exit', async () => {
      const oldComp = await seedAsset({
        code: 'COMP-X',
        name: 'Pompe',
        acquisitionValue: 2000000,
        cumulDepreciation: 800000,
        isComponent: true,
        componentType: 'pump',
      });

      await replaceComponent(adapter, oldComp.id, {
        name: 'Pompe neuve',
        code: 'COMP-X2',
        value: new Decimal(2500000),
        usefulLife: 4,
        acquisitionDate: '2025-07-01',
        depreciationMethod: 'linear',
        accountCode: '2154',
        depreciationAccountCode: '28154',
        category: 'materiel',
        parentAssetId: 'parent-1',
        componentType: 'pump',
        paymentAccountCode: '521',
      });

      const entries = await db.journalEntries.toArray();
      // Should have 2 entries: exit + new entry
      expect(entries.length).toBe(2);

      // Exit entry should have VNC as charge (D:28154 + D:681) / C:2154
      const exitEntry = entries.find((e: any) => e.reference?.startsWith('COMP-EXIT'));
      expect(exitEntry).toBeTruthy();
      expect(exitEntry!.lines.length).toBe(3); // amort + asset + VNC charge
    });

    it('should throw for non-existent component', async () => {
      await expect(
        replaceComponent(adapter, 'non-existent', {
          name: 'X', code: 'X', value: new Decimal(1000),
          usefulLife: 5, acquisitionDate: '2025-01-01',
          depreciationMethod: 'linear', accountCode: '2154',
          depreciationAccountCode: '28154', category: 'materiel',
          parentAssetId: 'p1', componentType: 'other',
          paymentAccountCode: '521',
        })
      ).rejects.toThrow('introuvable');
    });
  });

  // ========================================================================
  // CAPITALIZE ASSET (WIP → mise en service)
  // ========================================================================
  describe('capitalizeAsset', () => {
    it('should capitalize a WIP asset without components', async () => {
      const wip = await seedAsset({
        code: 'WIP-001',
        name: 'Construction bâtiment',
        accountCode: '2313',
        status: 'wip',
        acquisitionValue: 50000000,
      });

      await capitalizeAsset(adapter, wip.id, {
        commissioningDate: '2025-09-01',
        targetAccount: '213',
        depreciationAccount: '2813',
        usefulLife: 20,
        depreciationMethod: 'linear',
      });

      const updated = await db.assets.get(wip.id);
      expect(updated!.accountCode).toBe('213');
      expect(updated!.status).toBe('active');
      expect(updated!.usefulLifeYears).toBe(20);

      // Should create a journal entry D:213 / C:2313
      const entries = await db.journalEntries.toArray();
      expect(entries.length).toBe(1);
      expect(entries[0].lines[0].accountCode).toBe('213');
      expect(entries[0].lines[0].debit).toBe(50000000);
      expect(entries[0].lines[1].accountCode).toBe('2313');
      expect(entries[0].lines[1].credit).toBe(50000000);
    });

    it('should capitalize with components that sum to total', async () => {
      const wip = await seedAsset({
        code: 'WIP-002',
        name: 'Machine complexe',
        accountCode: '2315',
        status: 'wip',
        acquisitionValue: 10000000,
      });

      await capitalizeAsset(adapter, wip.id, {
        commissioningDate: '2025-10-01',
        targetAccount: '215',
        depreciationAccount: '2815',
        usefulLife: 10,
        depreciationMethod: 'linear',
        components: [
          { name: 'Structure', code: 'C1', value: new Decimal(6000000), usefulLife: 10, componentType: 'structure', depreciationAccount: '2815' },
          { name: 'Moteur', code: 'C2', value: new Decimal(4000000), usefulLife: 5, componentType: 'motor', depreciationAccount: '2815' },
        ],
      });

      // Parent updated
      const parent = await db.assets.get(wip.id);
      expect(parent!.status).toBe('active');

      // 2 child components created
      const allAssets = await db.assets.toArray();
      const children = allAssets.filter((a: any) => a.parentAssetId === wip.id);
      expect(children.length).toBe(2);
      expect(children.find((c: any) => c.name === 'Structure')!.acquisitionValue).toBe(6000000);
      expect(children.find((c: any) => c.name === 'Moteur')!.usefulLifeYears).toBe(5);
    });

    it('should reject when component sum ≠ total value', async () => {
      const wip = await seedAsset({
        code: 'WIP-003',
        name: 'Test immo',
        accountCode: '2315',
        status: 'wip',
        acquisitionValue: 10000000,
      });

      await expect(
        capitalizeAsset(adapter, wip.id, {
          commissioningDate: '2025-10-01',
          targetAccount: '215',
          depreciationAccount: '2815',
          usefulLife: 10,
          depreciationMethod: 'linear',
          components: [
            { name: 'A', code: 'CA', value: new Decimal(5000000), usefulLife: 10, componentType: 'structure', depreciationAccount: '2815' },
            { name: 'B', code: 'CB', value: new Decimal(3000000), usefulLife: 5, componentType: 'motor', depreciationAccount: '2815' },
          ],
        })
      ).rejects.toThrow('≠');
    });
  });

  // ========================================================================
  // CAPITALIZE INTEREST
  // ========================================================================
  describe('capitalizeInterest', () => {
    it('should increase WIP value and create journal entry', async () => {
      const wip = await seedAsset({
        code: 'WIP-INT',
        name: 'Immo en cours',
        accountCode: '2313',
        status: 'wip',
        acquisitionValue: 30000000,
      });

      await capitalizeInterest(adapter, wip.id, new Decimal(1500000), '2025-01-01', '2025-06-30');

      const updated = await db.assets.get(wip.id);
      expect(updated!.acquisitionValue).toBe(31500000);

      const entries = await db.journalEntries.toArray();
      expect(entries.length).toBe(1);
      // D: WIP account, C: 791 (transfert charges financières)
      expect(entries[0].lines[0].accountCode).toBe('2313');
      expect(entries[0].lines[0].debit).toBe(1500000);
      expect(entries[0].lines[1].accountCode).toBe('791');
      expect(entries[0].lines[1].credit).toBe(1500000);
    });
  });

  // ========================================================================
  // IMPAIRMENT
  // ========================================================================
  describe('recordImpairment', () => {
    it('should record impairment when VNC > recoverable value', async () => {
      const asset = await seedAsset({
        code: 'IMP-001',
        name: 'Terrain bâti',
        accountCode: '2131',
        acquisitionValue: 20000000,
        cumulDepreciation: 4000000,
        impairmentAmount: 0,
      });

      // VNC = 16M, recoverable = 12M → impairment = 4M
      await recordImpairment(adapter, asset.id, new Decimal(12000000));

      const updated = await db.assets.get(asset.id);
      expect(updated!.impairmentAmount).toBe(4000000);

      const entries = await db.journalEntries.toArray();
      expect(entries.length).toBe(1);
      expect(entries[0].lines[0].accountCode).toBe('6914');
      expect(entries[0].lines[0].debit).toBe(4000000);
      expect(entries[0].lines[1].accountCode).toBe('291'); // starts with '21'
      expect(entries[0].lines[1].credit).toBe(4000000);
    });

    it('should not record impairment when VNC <= recoverable', async () => {
      const asset = await seedAsset({
        code: 'IMP-002',
        name: 'Machine OK',
        accountCode: '2154',
        acquisitionValue: 10000000,
        cumulDepreciation: 2000000,
        impairmentAmount: 0,
      });

      // VNC = 8M, recoverable = 9M → no impairment
      await recordImpairment(adapter, asset.id, new Decimal(9000000));

      const updated = await db.assets.get(asset.id);
      expect(updated!.impairmentAmount).toBe(0);
      expect(await db.journalEntries.count()).toBe(0);
    });

    it('should use account 292 for class 22 assets', async () => {
      const asset = await seedAsset({
        code: 'IMP-003',
        name: 'Terrain nu',
        accountCode: '2211',
        acquisitionValue: 15000000,
        cumulDepreciation: 0,
        impairmentAmount: 0,
      });

      await recordImpairment(adapter, asset.id, new Decimal(10000000));

      const entries = await db.journalEntries.toArray();
      expect(entries[0].lines[1].accountCode).toBe('292');
    });
  });

  // ========================================================================
  // REVERSE IMPAIRMENT
  // ========================================================================
  describe('reverseImpairment', () => {
    it('should reverse impairment up to current impairment amount', async () => {
      const asset = await seedAsset({
        code: 'REV-001',
        name: 'Machine réévaluée',
        accountCode: '2154',
        acquisitionValue: 10000000,
        cumulDepreciation: 2000000,
        impairmentAmount: 3000000,
      });

      // VNC = 10M - 2M = 8M, current impairment = 3M
      // VNC without impairment = 8M + 3M = 11M
      // New recoverable = 10M → reprise = min(3M, min(10M, 11M) - 8M) = min(3M, 2M) = 2M
      await reverseImpairment(adapter, asset.id, new Decimal(10000000));

      const updated = await db.assets.get(asset.id);
      expect(updated!.impairmentAmount).toBe(1000000); // 3M - 2M

      const entries = await db.journalEntries.toArray();
      expect(entries.length).toBe(1);
      expect(entries[0].lines[0].accountCode).toBe('291'); // debit depreciation account
      expect(entries[0].lines[0].debit).toBe(2000000);
      expect(entries[0].lines[1].accountCode).toBe('7914');
      expect(entries[0].lines[1].credit).toBe(2000000);
    });

    it('should not reverse when no existing impairment', async () => {
      const asset = await seedAsset({
        code: 'REV-002',
        name: 'Machine saine',
        accountCode: '2154',
        acquisitionValue: 10000000,
        cumulDepreciation: 2000000,
        impairmentAmount: 0,
      });

      await reverseImpairment(adapter, asset.id, new Decimal(12000000));

      expect(await db.journalEntries.count()).toBe(0);
    });

    it('should cap reversal at VNC without impairment', async () => {
      const asset = await seedAsset({
        code: 'REV-003',
        name: 'Machine surévaluée',
        accountCode: '2154',
        acquisitionValue: 10000000,
        cumulDepreciation: 2000000,
        impairmentAmount: 5000000,
      });

      // VNC = 8M, impairment = 5M, VNC without impairment = 13M
      // New recoverable = 20M (very high)
      // reprise = min(5M, min(20M, 13M) - 8M) = min(5M, 5M) = 5M (full reversal)
      await reverseImpairment(adapter, asset.id, new Decimal(20000000));

      const updated = await db.assets.get(asset.id);
      expect(updated!.impairmentAmount).toBe(0);

      const entries = await db.journalEntries.toArray();
      expect(entries[0].lines[1].credit).toBe(5000000);
    });
  });
});
