/**
 * Extourne automatique — contrepassation des regularisations
 * au premier jour du nouvel exercice.
 * Conforme SYSCOHADA revise.
 */
import { db, logAudit } from '../../lib/db';
import type { DBJournalLine } from '../../lib/db';
import { safeBulkAddEntries } from '../entryGuard';

// ============================================================================
// TYPES
// ============================================================================

export type TypeRegularisation = 'CCA' | 'FNP' | 'FAE' | 'PCA';

export interface ExtourneRequest {
  exerciceClotureId: string;
  dateExtourne: string;
  journal?: string;
}

export interface ExtourneResult {
  success: boolean;
  ecrituresExtourne?: DBJournalEntry[];
  count?: number;
  error?: string;
}

export interface RegularisationEntry {
  entry: DBJournalEntry;
  type: TypeRegularisation;
}

// ============================================================================
// COMPTES DE REGULARISATION SYSCOHADA
// ============================================================================

const COMPTES_REGULARISATION: Record<string, TypeRegularisation> = {
  '476': 'CCA',   // Charges constatees d'avance
  '486': 'CCA',   // Charges constatees d'avance (variante)
  '408': 'FNP',   // Fournisseurs — factures non parvenues
  '418': 'FAE',   // Clients — factures a etablir
  '477': 'PCA',   // Produits constates d'avance
  '487': 'PCA',   // Produits constates d'avance (variante)
};

// ============================================================================
// SERVICE
// ============================================================================

/**
 * Detect regularisation entries by checking if any line uses a regularisation account.
 */
function detectRegularisationType(entry: DBJournalEntry): TypeRegularisation | null {
  for (const line of entry.lines) {
    const prefix3 = line.accountCode.substring(0, 3);
    if (COMPTES_REGULARISATION[prefix3]) {
      return COMPTES_REGULARISATION[prefix3];
    }
  }
  return null;
}

/**
 * Find all regularisation entries in a fiscal year.
 */
export async function findRegularisations(
  startDate: string,
  endDate: string
): Promise<RegularisationEntry[]> {
  const entries = await db.journalEntries
    .where('date')
    .between(startDate, endDate, true, true)
    .filter(e => (e.status === 'validated' || e.status === 'posted') && !e.reversed)
    .toArray();

  const result: RegularisationEntry[] = [];
  for (const entry of entries) {
    const type = detectRegularisationType(entry);
    if (type) {
      result.push({ entry, type });
    }
  }
  return result;
}

/**
 * Generate extourne (reversal) entries for all regularisations of a closed fiscal year.
 */
export async function genererExtournes(request: ExtourneRequest): Promise<ExtourneResult> {
  const { exerciceClotureId, dateExtourne, journal } = request;
  const journalCode = journal || 'OD';

  // Find the fiscal year to get dates
  const fiscalYear = await db.fiscalYears.get(exerciceClotureId);
  if (!fiscalYear) {
    return { success: false, error: `Exercice ${exerciceClotureId} introuvable.` };
  }

  // Find regularisations
  const regularisations = await findRegularisations(fiscalYear.startDate, fiscalYear.endDate);
  if (regularisations.length === 0) {
    return { success: true, ecrituresExtourne: [], count: 0 };
  }

  const now = new Date().toISOString();
  const ecrituresExtourne: Array<Record<string, unknown>> = [];

  for (let i = 0; i < regularisations.length; i++) {
    const { entry: original, type } = regularisations[i];

    // Build reversed lines (swap debit/credit)
    const reversedLines: DBJournalLine[] = original.lines.map(line => ({
      id: crypto.randomUUID(),
      accountCode: line.accountCode,
      accountName: line.accountName,
      thirdPartyCode: line.thirdPartyCode,
      thirdPartyName: line.thirdPartyName,
      label: `Extourne: ${line.label}`,
      debit: line.credit,
      credit: line.debit,
      analyticalCode: line.analyticalCode,
    }));

    const entryNumber = `EXT-${dateExtourne.replace(/-/g, '')}-${String(i + 1).padStart(3, '0')}`;

    const extourne = {
      id: crypto.randomUUID(),
      entryNumber,
      journal: journalCode,
      date: dateExtourne,
      reference: `EXTOURNE-${original.entryNumber}`,
      label: `Extourne ${type} - ${original.label}`,
      status: 'draft' as const,
      lines: reversedLines,
      reversalOf: original.id,
      reversalReason: `Extourne automatique regularisation ${type}`,
      createdAt: now,
      createdBy: 'system',
    };

    ecrituresExtourne.push(extourne);
  }

  // Persist via entryGuard (handles totalDebit/totalCredit + hash)
  await safeBulkAddEntries(ecrituresExtourne, { skipSyncValidation: true });

  // Mark originals as reversed
  for (const { entry: original } of regularisations) {
    const extourne = ecrituresExtourne.find(e => e.reversalOf === original.id);
    if (extourne) {
      await db.journalEntries.update(original.id, {
        reversed: true,
        reversedBy: extourne.id,
        reversedAt: now,
      });
    }
  }

  // Audit log
  await logAudit('EXTOURNE_AUTO', 'fiscal_year', exerciceClotureId, JSON.stringify({
    count: ecrituresExtourne.length,
    dateExtourne,
    types: regularisations.map(r => r.type),
  }));

  return {
    success: true,
    ecrituresExtourne,
    count: ecrituresExtourne.length,
  };
}

/**
 * Preview extournes without saving them.
 */
export async function previewExtournes(
  exerciceClotureId: string
): Promise<{ regularisations: RegularisationEntry[]; count: number }> {
  const fiscalYear = await db.fiscalYears.get(exerciceClotureId);
  if (!fiscalYear) return { regularisations: [], count: 0 };

  const regularisations = await findRegularisations(fiscalYear.startDate, fiscalYear.endDate);
  return { regularisations, count: regularisations.length };
}
