/**
 * AF-020: Third Party Account Service
 *
 * Auto-creates auxiliary accounting accounts (comptes auxiliaires) when a
 * third party (client/supplier) is created.
 *
 * SYSCOHADA conventions:
 *   - 411xxx = Clients (debit normal)
 *   - 401xxx = Fournisseurs (credit normal)
 */
import { logAudit } from '../lib/db';
import type { DataAdapter } from '@atlas/data';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ThirdPartyInput {
  code: string;
  name: string;
  type: 'customer' | 'supplier' | 'both';
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  balance?: number;
  isActive?: boolean;
  [key: string]: unknown;
}

interface CreatedThirdParty extends ThirdPartyInput {
  id: string;
  accountCode?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the collective account prefix for a third-party type. */
function getCollectivePrefix(type: 'customer' | 'supplier' | 'both'): string {
  // For 'both', default to customer (411). A second account for 401 can be
  // created later if needed.
  return type === 'supplier' ? '401' : '411';
}

/** Returns the normal balance for the auxiliary account. */
function getNormalBalance(type: 'customer' | 'supplier' | 'both'): 'debit' | 'credit' {
  return type === 'supplier' ? 'credit' : 'debit';
}

/**
 * Finds the next sequential auxiliary code for a given prefix.
 * E.g. if '411001' and '411002' exist, returns '411003'.
 */
async function getNextAuxiliaryCode(adapter: DataAdapter, prefix: string): Promise<string> {
  const accounts = await adapter.getAll<{ id: string; code: string }>(
    'accounts',
    { startsWith: { field: 'code', prefix } }
  );

  // Filter to only 6-digit auxiliary codes (prefix + 3 digits)
  const seqNumbers = accounts
    .filter(a => a.code.length === 6 && a.code.startsWith(prefix))
    .map(a => {
      const numPart = a.code.slice(prefix.length);
      const n = parseInt(numPart, 10);
      return isNaN(n) ? 0 : n;
    })
    .filter(n => n > 0);

  const next = seqNumbers.length > 0 ? Math.max(...seqNumbers) + 1 : 1;
  return `${prefix}${next.toString().padStart(3, '0')}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Creates a third party and its auxiliary accounting account in one operation.
 *
 * Steps:
 *   1. Create the third party record
 *   2. Generate the next sequential auxiliary code (411001, 401002, etc.)
 *   3. Create the auxiliary account in the accounts table
 *   4. Update the third party with the accountCode reference
 *   5. Return the created third party
 */
export async function createThirdPartyWithAccount(
  adapter: DataAdapter,
  data: ThirdPartyInput,
): Promise<CreatedThirdParty> {
  // 1. Create the third party
  const thirdParty = await adapter.create<CreatedThirdParty>('thirdParties', {
    ...data,
    balance: data.balance ?? 0,
    isActive: data.isActive ?? true,
  });

  // 2. Determine prefix and generate next code
  const prefix = getCollectivePrefix(data.type);
  const auxCode = await getNextAuxiliaryCode(adapter, prefix);

  // 3. Create the auxiliary account
  const accountId = crypto.randomUUID();
  await adapter.create('accounts', {
    id: accountId,
    code: auxCode,
    name: data.name,
    accountClass: '4',
    accountType: 'bilan',
    parentCode: prefix,
    level: 4,
    normalBalance: getNormalBalance(data.type),
    isReconcilable: true,
    isActive: true,
  });

  // 4. Update the third party with the account code
  await adapter.update('thirdParties', thirdParty.id, { accountCode: auxCode });

  await logAudit(
    'THIRD_PARTY_ACCOUNT_CREATE',
    'thirdParties',
    thirdParty.id,
    `Création tiers ${data.name} avec compte auxiliaire ${auxCode}`,
  );

  return { ...thirdParty, accountCode: auxCode };
}

/**
 * Checks if a third party already has an auxiliary account; creates one if not.
 *
 * Useful for migrating existing third parties that were created before AF-020.
 */
export async function getOrCreateAccountForThirdParty(
  adapter: DataAdapter,
  thirdPartyId: string,
): Promise<{ thirdParty: CreatedThirdParty; created: boolean }> {
  const thirdParty = await adapter.getById<CreatedThirdParty>('thirdParties', thirdPartyId);
  if (!thirdParty) {
    throw new Error(`Tiers ${thirdPartyId} introuvable`);
  }

  // Already has an account — nothing to do
  if (thirdParty.accountCode) {
    return { thirdParty, created: false };
  }

  const prefix = getCollectivePrefix(thirdParty.type);
  const auxCode = await getNextAuxiliaryCode(adapter, prefix);

  const accountId = crypto.randomUUID();
  await adapter.create('accounts', {
    id: accountId,
    code: auxCode,
    name: thirdParty.name,
    accountClass: '4',
    accountType: 'bilan',
    parentCode: prefix,
    level: 4,
    normalBalance: getNormalBalance(thirdParty.type),
    isReconcilable: true,
    isActive: true,
  });

  await adapter.update('thirdParties', thirdPartyId, { accountCode: auxCode });

  await logAudit(
    'THIRD_PARTY_ACCOUNT_CREATE',
    'thirdParties',
    thirdPartyId,
    `Création compte auxiliaire ${auxCode} pour tiers existant ${thirdParty.name}`,
  );

  return { thirdParty: { ...thirdParty, accountCode: auxCode }, created: true };
}
