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
  /**
   * Empreinte du fait de gestion source (Suite Atlas, L7).
   * Présente uniquement sur les écritures issues d'un satellite : elle scelle
   * le DOCUMENT d'origine, pas seulement l'écriture qui en découle.
   */
  sourcePayloadHash?: string;
}

/**
 * Sel de chaînage d'une écriture.
 *
 * ⚠️ SOURCE UNIQUE : `safeAddEntry` (production du hash) et `verifyChain`
 * (vérification) DOIVENT appeler cette fonction. Si les deux calculaient le
 * sel séparément, toute écriture issue d'un satellite serait déclarée corrompue
 * au premier contrôle d'intégrité.
 */
export function chainSalt(previousHash: string, sourcePayloadHash?: string): string {
  return sourcePayloadHash ? `${previousHash}:${sourcePayloadHash}` : previousHash;
}

/** Generic SHA-256 hex digest of an arbitrary string payload (canonical hashing primitive). */
export async function sha256Hex(payload: string): Promise<string> {
  const data = new TextEncoder().encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
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
    // Le sel intègre l'empreinte du document source quand l'écriture vient
    // d'un satellite : la preuve remonte jusqu'au fait de gestion.
    const expectedHash = await hashEntry(entry, chainSalt(previousHash, entry.sourcePayloadHash));
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
