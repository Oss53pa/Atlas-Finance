/**
 * Carry-Forward (Report a Nouveau) Service.
 * Generates opening entries for a new fiscal year from closing balances.
 * Conforme SYSCOHADA revise — comptes de bilan (classes 1-5) reportes.
 */
import { Money, money } from '../../utils/money';
import { db, logAudit } from '../../lib/db';
import type { DBJournalLine } from '../../lib/db';
import { safeAddEntry } from '../entryGuard';

// ============================================================================
// TYPES
// ============================================================================

export interface CarryForwardConfig {
  /** ID of the fiscal year being closed */
  closingExerciceId: string;
  /** ID of the new fiscal year receiving the A-Nouveau */
  openingExerciceId: string;
  /** Date for the opening entry (typically first day of new FY) */
  openingDate: string;
  /** Only carry forward these account classes (default: 1-5 for SYSCOHADA bilan) */
  accountClasses?: string[];
  /** Include result account (12x) if affectation not yet done */
  includeResultat?: boolean;
}

export interface CarryForwardPreview {
  lignes: CarryForwardLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  accountCount: number;
}

export interface CarryForwardLine {
  accountCode: string;
  accountName: string;
  soldeDebiteur: number;
  soldeCrediteur: number;
}

export interface CarryForwardResult {
  success: boolean;
  entryId?: string;
  lineCount: number;
  totalDebit: number;
  totalCredit: number;
  errors: string[];
}

// Balance sheet classes (SYSCOHADA)
const BILAN_CLASSES = ['1', '2', '3', '4', '5'];

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Compute closing balances for all balance sheet accounts.
 */
export async function calculerSoldesCloture(
  exerciceId: string,
  accountClasses: string[] = BILAN_CLASSES
): Promise<CarryForwardLine[]> {
  const fiscalYear = await db.fiscalYears.get(exerciceId);
  if (!fiscalYear) throw new Error(`Exercice ${exerciceId} introuvable`);

  const entries = await db.journalEntries
    .where('date')
    .between(fiscalYear.startDate, fiscalYear.endDate, true, true)
    .toArray();

  // Accumulate balances per account
  const balances = new Map<string, { name: string; debit: number; credit: number }>();

  for (const entry of entries) {
    for (const line of entry.lines) {
      const classCode = line.accountCode.charAt(0);
      if (!accountClasses.includes(classCode)) continue;

      const existing = balances.get(line.accountCode) || {
        name: line.accountName,
        debit: 0,
        credit: 0,
      };
      existing.debit += line.debit;
      existing.credit += line.credit;
      balances.set(line.accountCode, existing);
    }
  }

  // Build carry-forward lines with net balances
  const lignes: CarryForwardLine[] = [];
  for (const [code, data] of balances) {
    const net = money(data.debit).subtract(money(data.credit));
    const netValue = net.toNumber();

    if (netValue === 0) continue; // Skip zero balances

    lignes.push({
      accountCode: code,
      accountName: data.name,
      soldeDebiteur: netValue > 0 ? netValue : 0,
      soldeCrediteur: netValue < 0 ? Math.abs(netValue) : 0,
    });
  }

  return lignes.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
}

/**
 * Preview carry-forward without saving.
 */
export async function previewCarryForward(config: CarryForwardConfig): Promise<CarryForwardPreview> {
  const classes = config.accountClasses || BILAN_CLASSES;
  const classesWithResult = config.includeResultat ? [...classes, '12'] : classes;
  const lignes = await calculerSoldesCloture(config.closingExerciceId, classesWithResult);

  let totalDebit = 0;
  let totalCredit = 0;
  for (const l of lignes) {
    totalDebit += l.soldeDebiteur;
    totalCredit += l.soldeCrediteur;
  }

  return {
    lignes,
    totalDebit,
    totalCredit,
    isBalanced: money(totalDebit).equals(money(totalCredit)),
    accountCount: lignes.length,
  };
}

/**
 * Execute carry-forward: create A-Nouveau journal entry in the new fiscal year.
 */
export async function executerCarryForward(config: CarryForwardConfig): Promise<CarryForwardResult> {
  const errors: string[] = [];

  // Validate fiscal years exist
  const closingFY = await db.fiscalYears.get(config.closingExerciceId);
  const openingFY = await db.fiscalYears.get(config.openingExerciceId);

  if (!closingFY) errors.push(`Exercice de cloture ${config.closingExerciceId} introuvable`);
  if (!openingFY) errors.push(`Exercice d'ouverture ${config.openingExerciceId} introuvable`);
  if (errors.length > 0) return { success: false, lineCount: 0, totalDebit: 0, totalCredit: 0, errors };

  // Compute balances
  const preview = await previewCarryForward(config);

  if (preview.lignes.length === 0) {
    return { success: false, lineCount: 0, totalDebit: 0, totalCredit: 0, errors: ['Aucun solde a reporter'] };
  }

  if (!preview.isBalanced) {
    errors.push(`Desequilibre: Debit ${preview.totalDebit} != Credit ${preview.totalCredit}`);
    return { success: false, lineCount: 0, totalDebit: preview.totalDebit, totalCredit: preview.totalCredit, errors };
  }

  // Build journal entry lines
  const lines: DBJournalLine[] = preview.lignes.map((l, i) => ({
    id: crypto.randomUUID(),
    accountCode: l.accountCode,
    accountName: l.accountName,
    label: 'Report a nouveau',
    debit: l.soldeDebiteur,
    credit: l.soldeCrediteur,
  }));

  const entryId = crypto.randomUUID();
  await safeAddEntry({
    id: entryId,
    entryNumber: `AN-${config.openingDate.replace(/-/g, '').substring(0, 8)}-001`,
    journal: 'AN',
    date: config.openingDate,
    reference: 'A-NOUVEAU',
    label: `Report a nouveau exercice ${closingFY!.name}`,
    status: 'validated',
    lines,
    createdAt: new Date().toISOString(),
    createdBy: 'system',
  }, { skipSyncValidation: true });

  await logAudit(
    'CARRY_FORWARD',
    'journalEntry',
    entryId,
    `Report a nouveau: ${preview.lignes.length} comptes, Debit=${preview.totalDebit}, Credit=${preview.totalCredit}`
  );

  return {
    success: true,
    entryId,
    lineCount: lines.length,
    totalDebit: preview.totalDebit,
    totalCredit: preview.totalCredit,
    errors: [],
  };
}

/**
 * Check if carry-forward already exists for a fiscal year.
 */
export async function hasCarryForward(openingExerciceId: string): Promise<boolean> {
  const fy = await db.fiscalYears.get(openingExerciceId);
  if (!fy) return false;

  const existing = await db.journalEntries
    .where('journal')
    .equals('AN')
    .filter(e => e.date >= fy.startDate && e.date <= fy.endDate)
    .first();

  return !!existing;
}

/**
 * Delete existing carry-forward for regeneration.
 */
export async function supprimerCarryForward(openingExerciceId: string): Promise<void> {
  const fy = await db.fiscalYears.get(openingExerciceId);
  if (!fy) return;

  const existing = await db.journalEntries
    .where('journal')
    .equals('AN')
    .filter(e => e.date >= fy.startDate && e.date <= fy.endDate)
    .toArray();

  for (const entry of existing) {
    await db.journalEntries.delete(entry.id);
  }

  if (existing.length > 0) {
    await logAudit(
      'CARRY_FORWARD_DELETE',
      'journalEntry',
      openingExerciceId,
      `Suppression de ${existing.length} ecritures AN`
    );
  }
}
