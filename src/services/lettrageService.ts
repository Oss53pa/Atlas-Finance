/**
 * Service de lettrage automatique.
 *
 * Le lettrage rapproche les écritures débitrices et créditrices d'un même
 * compte tiers (classes 40x fournisseurs, 41x clients) pour identifier
 * les factures réglées.
 *
 * Algorithmes de rapprochement :
 * 1. Montant exact     — débit = crédit sur le même compte
 * 2. Référence croisée — même référence/pièce entre facture et règlement
 * 3. Somme de montants — 1 crédit = N débits (ou inverse)
 * 4. Tolérance         — écart <= seuil configuré (défaut 0 FCFA)
 *
 * Conforme SYSCOHADA — classes 40 (fournisseurs) et 41 (clients).
 */

import type { DataAdapter } from '@atlas/data';
import { logAudit } from '../lib/db';
import type { DBJournalEntry, DBJournalLine } from '../lib/db';

// ============================================================================
// TYPES
// ============================================================================

export interface LettrageConfig {
  parMontant: boolean;
  parReference: boolean;
  parDate: boolean;
  parTiers: boolean;
  tolerance: number;       // FCFA
  periodeMax: number;      // jours
}

export interface LettrageMatch {
  code: string;
  compte: string;
  debitEntries: Array<{ entryId: string; lineId: string; amount: number }>;
  creditEntries: Array<{ entryId: string; lineId: string; amount: number }>;
  totalDebit: number;
  totalCredit: number;
  ecart: number;
  method: 'exact' | 'reference' | 'somme' | 'tolerance';
}

export interface LettrageResult {
  matches: LettrageMatch[];
  totalMatched: number;
  totalUnmatched: number;
  errors: string[];
}

interface FlatLine {
  entryId: string;
  lineId: string;
  accountCode: string;
  debit: number;
  credit: number;
  reference: string;
  date: string;
  thirdPartyCode?: string;
  lettrageCode?: string;
}

const DEFAULT_CONFIG: LettrageConfig = {
  parMontant: true,
  parReference: true,
  parDate: false,
  parTiers: true,
  tolerance: 0,
  periodeMax: 365,
};

// ============================================================================
// CODE GENERATION
// ============================================================================

/**
 * Generate the next available lettrage code (AA, AB, ..., ZZ).
 */
async function getNextLettrageCode(adapter: DataAdapter): Promise<string> {
  const entries = await adapter.getAll('journalEntries');
  const existing = new Set<string>();
  for (const e of entries) {
    for (const l of e.lines) {
      if (l.lettrageCode) existing.add(l.lettrageCode);
    }
  }

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < 676; i++) {
    const code = letters[Math.floor(i / 26)] + letters[i % 26];
    if (!existing.has(code)) return code;
  }
  // Fallback to 3-letter codes
  return `A${Date.now().toString(36).slice(-2).toUpperCase()}`;
}

// ============================================================================
// FLATTEN ENTRIES → LINES
// ============================================================================

function flattenEntries(entries: DBJournalEntry[]): FlatLine[] {
  const lines: FlatLine[] = [];
  for (const entry of entries) {
    for (const line of entry.lines) {
      // Only lettrage-eligible accounts (classes 40, 41)
      if (!line.accountCode.startsWith('40') && !line.accountCode.startsWith('41')) continue;
      if (line.lettrageCode) continue; // Already lettered

      lines.push({
        entryId: entry.id,
        lineId: line.id,
        accountCode: line.accountCode,
        debit: line.debit,
        credit: line.credit,
        reference: entry.reference || '',
        date: entry.date,
        thirdPartyCode: line.thirdPartyCode,
      });
    }
  }
  return lines;
}

// ============================================================================
// MATCHING ALGORITHMS
// ============================================================================

function matchExact(
  debits: FlatLine[],
  credits: FlatLine[],
): Array<[FlatLine[], FlatLine[]]> {
  const matches: Array<[FlatLine[], FlatLine[]]> = [];
  const usedDebits = new Set<string>();
  const usedCredits = new Set<string>();

  // 1. One-to-one exact match
  for (const d of debits) {
    if (usedDebits.has(d.lineId)) continue;
    for (const c of credits) {
      if (usedCredits.has(c.lineId)) continue;
      if (d.debit === c.credit && d.debit > 0) {
        matches.push([[d], [c]]);
        usedDebits.add(d.lineId);
        usedCredits.add(c.lineId);
        break;
      }
    }
  }

  return matches;
}

function matchByReference(
  debits: FlatLine[],
  credits: FlatLine[],
): Array<[FlatLine[], FlatLine[]]> {
  const matches: Array<[FlatLine[], FlatLine[]]> = [];
  const usedDebits = new Set<string>();
  const usedCredits = new Set<string>();

  for (const d of debits) {
    if (usedDebits.has(d.lineId) || !d.reference) continue;
    for (const c of credits) {
      if (usedCredits.has(c.lineId) || !c.reference) continue;
      if (d.reference === c.reference && d.debit === c.credit && d.debit > 0) {
        matches.push([[d], [c]]);
        usedDebits.add(d.lineId);
        usedCredits.add(c.lineId);
        break;
      }
    }
  }

  return matches;
}

function matchSumN(
  debits: FlatLine[],
  credits: FlatLine[],
  tolerance: number,
): Array<[FlatLine[], FlatLine[]]> {
  const matches: Array<[FlatLine[], FlatLine[]]> = [];
  const usedCredits = new Set<string>();

  // Try to match 1 credit = N debits
  for (const c of credits) {
    if (usedCredits.has(c.lineId)) continue;

    const availableDebits = debits.filter(d => !matches.some(m => m[0].some(md => md.lineId === d.lineId)));
    // Sort debits by amount descending for greedy match
    const sorted = [...availableDebits].sort((a, b) => b.debit - a.debit);
    const selected: FlatLine[] = [];
    let sum = 0;

    for (const d of sorted) {
      if (sum + d.debit <= c.credit + tolerance) {
        selected.push(d);
        sum += d.debit;
      }
      if (Math.abs(sum - c.credit) <= tolerance) break;
    }

    if (selected.length >= 2 && Math.abs(sum - c.credit) <= tolerance) {
      matches.push([selected, [c]]);
      usedCredits.add(c.lineId);
    }
  }

  return matches;
}

// ============================================================================
// AUTO-LETTRAGE
// ============================================================================

/**
 * Run automatic lettrage on unlettered entries.
 * Returns proposed matches without persisting — call `applyLettrage` to persist.
 */
export async function autoLettrage(
  adapter: DataAdapter,
  config: Partial<LettrageConfig> = {},
): Promise<LettrageResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const entries = await adapter.getAll('journalEntries');
  const allLines = flattenEntries(entries);

  // Group by account code
  const byAccount = new Map<string, FlatLine[]>();
  for (const line of allLines) {
    const list = byAccount.get(line.accountCode) || [];
    list.push(line);
    byAccount.set(line.accountCode, list);
  }

  const matches: LettrageMatch[] = [];
  let codeCounter = 0;

  for (const [compte, lines] of byAccount) {
    const debits = lines.filter(l => l.debit > 0);
    const credits = lines.filter(l => l.credit > 0);

    if (debits.length === 0 || credits.length === 0) continue;

    const accountMatches: Array<[FlatLine[], FlatLine[], string]> = [];

    // 1. Exact amount match
    if (cfg.parMontant) {
      for (const [d, c] of matchExact(debits, credits)) {
        accountMatches.push([d, c, 'exact']);
      }
    }

    // Filter out already matched lines
    const matchedLineIds = new Set(
      accountMatches.flatMap(([d, c]) => [...d.map(x => x.lineId), ...c.map(x => x.lineId)])
    );
    const remainingDebits = debits.filter(d => !matchedLineIds.has(d.lineId));
    const remainingCredits = credits.filter(c => !matchedLineIds.has(c.lineId));

    // 2. Reference match
    if (cfg.parReference) {
      for (const [d, c] of matchByReference(remainingDebits, remainingCredits)) {
        accountMatches.push([d, c, 'reference']);
      }
    }

    // Update matched set
    const matchedAfterRef = new Set(
      accountMatches.flatMap(([d, c]) => [...d.map(x => x.lineId), ...c.map(x => x.lineId)])
    );
    const finalDebits = debits.filter(d => !matchedAfterRef.has(d.lineId));
    const finalCredits = credits.filter(c => !matchedAfterRef.has(c.lineId));

    // 3. Sum-N match
    if (cfg.parMontant && finalDebits.length >= 2) {
      for (const [d, c] of matchSumN(finalDebits, finalCredits, cfg.tolerance)) {
        accountMatches.push([d, c, 'somme']);
      }
    }

    // Convert to LettrageMatch
    for (const [d, c, method] of accountMatches) {
      const totalD = d.reduce((s, x) => s + x.debit, 0);
      const totalC = c.reduce((s, x) => s + x.credit, 0);
      codeCounter++;
      matches.push({
        code: `AUTO-${String(codeCounter).padStart(3, '0')}`,
        compte,
        debitEntries: d.map(x => ({ entryId: x.entryId, lineId: x.lineId, amount: x.debit })),
        creditEntries: c.map(x => ({ entryId: x.entryId, lineId: x.lineId, amount: x.credit })),
        totalDebit: totalD,
        totalCredit: totalC,
        ecart: Math.abs(totalD - totalC),
        method: method as 'exact' | 'reference' | 'somme' | 'tolerance',
      });
    }
  }

  const totalMatchedLines = matches.reduce((s, m) => s + m.debitEntries.length + m.creditEntries.length, 0);

  return {
    matches,
    totalMatched: totalMatchedLines,
    totalUnmatched: allLines.length - totalMatchedLines,
    errors: [],
  };
}

// ============================================================================
// APPLY / PERSIST
// ============================================================================

/**
 * Apply lettrage matches to the database.
 * Writes lettrageCode on each matched line.
 */
export async function applyLettrage(adapter: DataAdapter, matches: LettrageMatch[]): Promise<number> {
  let applied = 0;

  for (const match of matches) {
    const code = await getNextLettrageCode(adapter);
    const allLineIds = new Set([
      ...match.debitEntries.map(e => e.lineId),
      ...match.creditEntries.map(e => e.lineId),
    ]);

    const entryIds = new Set([
      ...match.debitEntries.map(e => e.entryId),
      ...match.creditEntries.map(e => e.entryId),
    ]);

    for (const entryId of entryIds) {
      const entry = await adapter.getById('journalEntries', entryId);
      if (!entry) continue;

      let modified = false;
      for (const line of entry.lines) {
        if (allLineIds.has(line.id) && !line.lettrageCode) {
          line.lettrageCode = code;
          modified = true;
        }
      }

      if (modified) {
        await adapter.update('journalEntries', entryId, { lines: entry.lines, updatedAt: new Date().toISOString() });
        applied++;
      }
    }

    await logAudit(
      'LETTRAGE_AUTO',
      'journal_entry',
      match.debitEntries[0]?.entryId || '',
      JSON.stringify({ code, compte: match.compte, method: match.method, ecart: match.ecart }),
    );
  }

  return applied;
}

/**
 * Apply manual lettrage: assign a code to selected lines.
 */
export async function applyManualLettrage(
  adapter: DataAdapter,
  selections: Array<{ entryId: string; lineId: string }>,
): Promise<string> {
  const code = await getNextLettrageCode(adapter);

  const byEntry = new Map<string, string[]>();
  for (const s of selections) {
    const list = byEntry.get(s.entryId) || [];
    list.push(s.lineId);
    byEntry.set(s.entryId, list);
  }

  for (const [entryId, lineIds] of byEntry) {
    const entry = await adapter.getById('journalEntries', entryId);
    if (!entry) continue;

    const lineIdSet = new Set(lineIds);
    for (const line of entry.lines) {
      if (lineIdSet.has(line.id)) {
        line.lettrageCode = code;
      }
    }
    await adapter.update('journalEntries', entryId, { lines: entry.lines, updatedAt: new Date().toISOString() });
  }

  await logAudit(
    'LETTRAGE_MANUAL',
    'journal_entry',
    selections[0]?.entryId || '',
    JSON.stringify({ code, count: selections.length }),
  );

  return code;
}

/**
 * Remove lettrage code from all lines with a given code.
 */
export async function delettrage(adapter: DataAdapter, code: string): Promise<number> {
  const entries = await adapter.getAll('journalEntries');
  let count = 0;

  for (const entry of entries) {
    let modified = false;
    for (const line of entry.lines) {
      if (line.lettrageCode === code) {
        line.lettrageCode = undefined;
        modified = true;
        count++;
      }
    }
    if (modified) {
      await adapter.update('journalEntries', entry.id, { lines: entry.lines, updatedAt: new Date().toISOString() });
    }
  }

  await logAudit('DELETTRAGE', 'journal_entry', '', JSON.stringify({ code, linesCleared: count }));
  return count;
}

/**
 * Get lettrage statistics for a given account prefix.
 */
export async function getLettrageStats(adapter: DataAdapter, accountPrefix?: string): Promise<{
  totalLines: number;
  letteredLines: number;
  unletteredLines: number;
  tauxLettrage: number;
  montantNonLettre: number;
  codes: number;
}> {
  const entries = await adapter.getAll('journalEntries');
  let totalLines = 0;
  let letteredLines = 0;
  let montantNonLettre = 0;
  const codes = new Set<string>();

  for (const entry of entries) {
    for (const line of entry.lines) {
      const isEligible = accountPrefix
        ? line.accountCode.startsWith(accountPrefix)
        : line.accountCode.startsWith('40') || line.accountCode.startsWith('41');

      if (!isEligible) continue;
      totalLines++;

      if (line.lettrageCode) {
        letteredLines++;
        codes.add(line.lettrageCode);
      } else {
        montantNonLettre += Math.abs(line.debit - line.credit);
      }
    }
  }

  return {
    totalLines,
    letteredLines,
    unletteredLines: totalLines - letteredLines,
    tauxLettrage: totalLines > 0 ? (letteredLines / totalLines) * 100 : 0,
    montantNonLettre,
    codes: codes.size,
  };
}
