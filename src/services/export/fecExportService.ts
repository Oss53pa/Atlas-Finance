/**
 * FEC (Fichier des Ecritures Comptables) export service.
 * Conforme a l'article A.47 A-1 du Livre des Procedures Fiscales.
 * 18 colonnes obligatoires, format tabulation ou point-virgule.
 */
import { db } from '../../lib/db';
import type { DBJournalEntry, DBJournalLine } from '../../lib/db';

// ============================================================================
// TYPES
// ============================================================================

export interface FECLine {
  JournalCode: string;
  JournalLib: string;
  EcritureNum: string;
  EcritureDate: string;
  CompteNum: string;
  CompteLib: string;
  CompAuxNum: string;
  CompAuxLib: string;
  PieceRef: string;
  PieceDate: string;
  EcritureLib: string;
  Debit: string;
  Credit: string;
  EcrtureLet: string;
  DateLet: string;
  ValidDate: string;
  Montantdevise: string;
  Idevise: string;
}

export interface FECExportOptions {
  exerciceId: string;
  startDate: string;
  endDate: string;
  siren?: string;
  separator: ';' | '\t';
  encoding: 'UTF-8' | 'ISO-8859-15';
  devise: string;
}

export interface FECExportResult {
  success: boolean;
  data?: string;
  filename?: string;
  lineCount?: number;
  totalDebit?: number;
  totalCredit?: number;
  error?: string;
}

export interface FECValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  lineCount: number;
  totalDebit: number;
  totalCredit: number;
}

// ============================================================================
// COLUMN HEADERS
// ============================================================================

const FEC_HEADERS: (keyof FECLine)[] = [
  'JournalCode',
  'JournalLib',
  'EcritureNum',
  'EcritureDate',
  'CompteNum',
  'CompteLib',
  'CompAuxNum',
  'CompAuxLib',
  'PieceRef',
  'PieceDate',
  'EcritureLib',
  'Debit',
  'Credit',
  'EcrtureLet',
  'DateLet',
  'ValidDate',
  'Montantdevise',
  'Idevise',
];

// ============================================================================
// JOURNAL LABELS
// ============================================================================

const JOURNAL_LABELS: Record<string, string> = {
  AC: 'Journal des Achats',
  VE: 'Journal des Ventes',
  BQ: 'Journal de Banque',
  CA: 'Journal de Caisse',
  OD: 'Journal des Operations Diverses',
  PA: 'Journal de Paie',
  AN: "Journal des A-Nouveaux",
};

// ============================================================================
// HELPERS
// ============================================================================

function formatDateFEC(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function formatAmount(amount: number): string {
  return amount.toFixed(2).replace('.', ',');
}

function escapeField(value: string, separator: string): string {
  if (value.includes(separator) || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ============================================================================
// EXPORT SERVICE
// ============================================================================

/**
 * Generate FEC export from journal entries for a given fiscal period.
 */
export async function generateFEC(options: FECExportOptions): Promise<FECExportResult> {
  const { startDate, endDate, siren, separator, devise } = options;

  // Fetch validated/posted entries for the period
  const entries = await db.journalEntries
    .where('date')
    .between(startDate, endDate, true, true)
    .filter(e => e.status === 'validated' || e.status === 'posted')
    .sortBy('date');

  if (entries.length === 0) {
    return { success: false, error: 'Aucune ecriture validee trouvee pour cette periode.' };
  }

  // Fetch accounts for labels
  const accounts = await db.accounts.toArray();
  const accountMap = new Map(accounts.map(a => [a.code, a.name]));

  // Fetch third parties for auxiliary accounts
  const thirdParties = await db.thirdParties.toArray();
  const tpMap = new Map(thirdParties.map(tp => [tp.code, tp.name]));

  let totalDebit = 0;
  let totalCredit = 0;
  const fecLines: FECLine[] = [];

  for (const entry of entries) {
    for (const line of entry.lines) {
      totalDebit += line.debit;
      totalCredit += line.credit;

      fecLines.push({
        JournalCode: entry.journal,
        JournalLib: JOURNAL_LABELS[entry.journal] || entry.journal,
        EcritureNum: entry.entryNumber,
        EcritureDate: formatDateFEC(entry.date),
        CompteNum: line.accountCode,
        CompteLib: line.accountName || accountMap.get(line.accountCode) || '',
        CompAuxNum: line.thirdPartyCode || '',
        CompAuxLib: line.thirdPartyCode ? (tpMap.get(line.thirdPartyCode) || line.thirdPartyName || '') : '',
        PieceRef: entry.reference || entry.entryNumber,
        PieceDate: formatDateFEC(entry.date),
        EcritureLib: line.label || entry.label,
        Debit: formatAmount(line.debit),
        Credit: formatAmount(line.credit),
        EcrtureLet: line.lettrageCode || '',
        DateLet: line.lettrageCode ? formatDateFEC(entry.updatedAt) : '',
        ValidDate: entry.updatedAt ? formatDateFEC(entry.updatedAt) : formatDateFEC(entry.date),
        Montantdevise: formatAmount(line.debit > 0 ? line.debit : line.credit),
        Idevise: devise || 'XAF',
      });
    }
  }

  // Build CSV content
  const headerRow = FEC_HEADERS.map(h => escapeField(h, separator)).join(separator);
  const dataRows = fecLines.map(line =>
    FEC_HEADERS.map(h => escapeField(line[h], separator)).join(separator)
  );
  const content = [headerRow, ...dataRows].join('\r\n');

  // Generate filename
  const closingDate = formatDateFEC(endDate);
  const sirenCode = siren || '000000000';
  const filename = `${sirenCode}FEC${closingDate}.txt`;

  return {
    success: true,
    data: content,
    filename,
    lineCount: fecLines.length,
    totalDebit,
    totalCredit,
  };
}

/**
 * Validate a FEC export before downloading.
 */
export async function validateFEC(options: FECExportOptions): Promise<FECValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const entries = await db.journalEntries
    .where('date')
    .between(options.startDate, options.endDate, true, true)
    .filter(e => e.status === 'validated' || e.status === 'posted')
    .sortBy('date');

  let totalDebit = 0;
  let totalCredit = 0;
  let lineCount = 0;

  // Check all entries in the period are validated
  const allEntries = await db.journalEntries
    .where('date')
    .between(options.startDate, options.endDate, true, true)
    .toArray();

  const draftCount = allEntries.filter(e => e.status === 'draft').length;
  if (draftCount > 0) {
    warnings.push(`${draftCount} ecriture(s) en brouillon non incluse(s) dans le FEC.`);
  }

  for (const entry of entries) {
    // Check each entry has lines
    if (!entry.lines || entry.lines.length === 0) {
      errors.push(`Ecriture ${entry.entryNumber} : aucune ligne.`);
      continue;
    }

    // Check balance per entry
    const entryDebit = entry.lines.reduce((s, l) => s + l.debit, 0);
    const entryCredit = entry.lines.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(entryDebit - entryCredit) > 0.01) {
      errors.push(`Ecriture ${entry.entryNumber} : desequilibree (D=${entryDebit.toFixed(2)}, C=${entryCredit.toFixed(2)}).`);
    }

    // Check required fields
    if (!entry.entryNumber) errors.push(`Ecriture sans numero.`);
    if (!entry.date) errors.push(`Ecriture ${entry.entryNumber} : date manquante.`);
    if (!entry.journal) errors.push(`Ecriture ${entry.entryNumber} : journal manquant.`);

    for (const line of entry.lines) {
      if (!line.accountCode) {
        errors.push(`Ecriture ${entry.entryNumber} : ligne sans compte.`);
      }
      totalDebit += line.debit;
      totalCredit += line.credit;
      lineCount++;
    }
  }

  // Global balance check
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    errors.push(`Desequilibre global FEC : D=${totalDebit.toFixed(2)}, C=${totalCredit.toFixed(2)}.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    lineCount,
    totalDebit,
    totalCredit,
  };
}

/**
 * Download FEC file to the user's machine.
 */
export function downloadFEC(content: string, filename: string, encoding: 'UTF-8' | 'ISO-8859-15'): void {
  const blob = new Blob([content], {
    type: `text/plain;charset=${encoding === 'UTF-8' ? 'utf-8' : 'iso-8859-15'}`,
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
