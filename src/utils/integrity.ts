/**
 * SHA-256 integrity hashing for SYSCOHADA entry immutability.
 * Uses the Web Crypto API (native, zero dependencies).
 */

export interface HashableEntry {
  entryNumber: string;
  journal: string;
  date: string;
  lines: Array<{
    accountCode: string;
    debit: number;
    credit: number;
    label: string;
  }>;
  totalDebit: number;
  totalCredit: number;
  /** Computed hash — set after creation */
  hash?: string;
}

/** Compute SHA-256 hash for a journal entry, chained to previous hash */
export async function hashEntry(entry: HashableEntry, previousHash: string = ''): Promise<string> {
  const payload = JSON.stringify({
    entryNumber: entry.entryNumber,
    journal: entry.journal,
    date: entry.date,
    lines: entry.lines.map(l => ({
      accountCode: l.accountCode,
      debit: l.debit,
      credit: l.credit,
      label: l.label,
    })),
    totalDebit: entry.totalDebit,
    totalCredit: entry.totalCredit,
    previousHash,
  });

  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface ChainVerificationResult {
  valid: boolean;
  brokenAt?: string;
  checkedCount: number;
}

/** Verify the integrity of a chain of entries */
export async function verifyChain(
  entries: Array<HashableEntry & { hash?: string }>
): Promise<ChainVerificationResult> {
  let previousHash = '';
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry.hash) {
      return { valid: false, brokenAt: entry.entryNumber, checkedCount: i };
    }
    const expectedHash = await hashEntry(entry, previousHash);
    if (entry.hash !== expectedHash) {
      return { valid: false, brokenAt: entry.entryNumber, checkedCount: i };
    }
    previousHash = entry.hash;
  }
  return { valid: true, checkedCount: entries.length };
}

/** Generate an audit log entry hash */
export async function hashAuditLog(
  action: string,
  entityType: string,
  entityId: string,
  details: string,
  timestamp: string,
  previousHash: string = ''
): Promise<string> {
  const payload = JSON.stringify({ action, entityType, entityId, details, timestamp, previousHash });
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
