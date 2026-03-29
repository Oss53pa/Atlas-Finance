/**
 * Correction #7 — Bank Reconciliation Extensions
 * - Auto-regularization entries for unmatched bank items
 * - MT940 SWIFT format parser
 * - Aging analysis of unreconciled items (suspens)
 */
import type { DataAdapter } from '@atlas/data';
import Decimal from 'decimal.js';

// ============================================================================
// TYPES
// ============================================================================

export interface UnmatchedBankItem {
  date: string;
  label: string;
  amount: Decimal;
  suggestedType: 'bank_fees' | 'direct_debit' | 'interest_credit' | 'transfer_received' | 'other';
  suggestedCounterAccount?: string;
}

export interface MT940Statement {
  accountId: string;
  statementNumber: string;
  openingBalance: { date: string; amount: Decimal; isCredit: boolean };
  closingBalance: { date: string; amount: Decimal; isCredit: boolean };
  transactions: Array<{
    date: string;
    amount: Decimal;
    isCredit: boolean;
    reference: string;
    description: string;
  }>;
}

export interface SuspensItem {
  date: string;
  label: string;
  amount: Decimal;
  daysOld: number;
  entryNumber?: string;
}

export interface AgingSuspens {
  under30Days: SuspensItem[];
  days31to60: SuspensItem[];
  over60Days: SuspensItem[];
  totalSuspens: Decimal;
}

// ============================================================================
// AUTO-REGULARIZATION ENTRIES
// ============================================================================

/**
 * Generate draft journal entries for unmatched bank statement items.
 */
export async function generateRegularizationEntries(
  adapter: DataAdapter,
  companyId: string,
  bankAccountCode: string,
  unmatchedItems: UnmatchedBankItem[]
): Promise<string[]> {
  const entryIds: string[] = [];

  for (const item of unmatchedItems) {
    const absAmount = item.amount.abs();
    const isDebitToBank = item.amount.gt(0); // positive = money into bank

    let counterAccount: string;
    let counterAccountName: string;

    switch (item.suggestedType) {
      case 'bank_fees':
        counterAccount = '631';
        counterAccountName = 'Frais bancaires';
        break;
      case 'direct_debit':
        counterAccount = item.suggestedCounterAccount || '658';
        counterAccountName = 'Prélèvement automatique';
        break;
      case 'interest_credit':
        counterAccount = '771';
        counterAccountName = 'Intérêts créditeurs';
        break;
      case 'transfer_received':
        counterAccount = item.suggestedCounterAccount || '411';
        counterAccountName = 'Virement reçu';
        break;
      default:
        counterAccount = item.suggestedCounterAccount || '471';
        counterAccountName = 'Compte d\'attente';
        break;
    }

    const lines = [];

    if (isDebitToBank) {
      // Money coming in: D bank / C counter
      lines.push({
        id: crypto.randomUUID(),
        accountCode: bankAccountCode,
        accountName: 'Banque',
        label: `Régularisation: ${item.label}`,
        debit: absAmount.toNumber(),
        credit: 0,
      });
      lines.push({
        id: crypto.randomUUID(),
        accountCode: counterAccount,
        accountName: counterAccountName,
        label: `Régularisation: ${item.label}`,
        debit: 0,
        credit: absAmount.toNumber(),
      });
    } else {
      // Money going out: D counter / C bank
      lines.push({
        id: crypto.randomUUID(),
        accountCode: counterAccount,
        accountName: counterAccountName,
        label: `Régularisation: ${item.label}`,
        debit: absAmount.toNumber(),
        credit: 0,
      });
      lines.push({
        id: crypto.randomUUID(),
        accountCode: bankAccountCode,
        accountName: 'Banque',
        label: `Régularisation: ${item.label}`,
        debit: 0,
        credit: absAmount.toNumber(),
      });
    }

    const entry = await adapter.saveJournalEntry({
      entryNumber: '',
      journal: 'BQ',
      date: item.date,
      reference: `REG-${item.date}`,
      label: `Régularisation bancaire: ${item.label}`,
      status: 'draft', // Draft for user review
      lines,
      totalDebit: absAmount.toNumber(),
      totalCredit: absAmount.toNumber(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
    });

    entryIds.push(entry.id);
  }

  return entryIds;
}

// ============================================================================
// MT940 PARSER
// ============================================================================

/**
 * Parse SWIFT MT940 bank statement format.
 */
export function parseMT940(content: string): MT940Statement {
  const lines = content.split('\n').map(l => l.trim());

  let accountId = '';
  let statementNumber = '';
  let openingBalance = { date: '', amount: new Decimal(0), isCredit: true };
  let closingBalance = { date: '', amount: new Decimal(0), isCredit: true };
  const transactions: MT940Statement['transactions'] = [];

  let currentDescription = '';
  let pendingTransaction: {
    date: string;
    amount: Decimal;
    isCredit: boolean;
    reference: string;
  } | null = null;

  function parseDate(yymmdd: string): string {
    const yy = parseInt(yymmdd.substring(0, 2), 10);
    const mm = yymmdd.substring(2, 4);
    const dd = yymmdd.substring(4, 6);
    const year = yy >= 80 ? 1900 + yy : 2000 + yy;
    return `${year}-${mm}-${dd}`;
  }

  function parseAmount(raw: string): Decimal {
    // MT940 amounts use comma as decimal separator
    return new Decimal(raw.replace(',', '.'));
  }

  function parseBalance(field: string): { date: string; amount: Decimal; isCredit: boolean } {
    // Format: C/D YYMMDD CURRENCY AMOUNT
    const isCredit = field.charAt(0) === 'C';
    const dateStr = field.substring(1, 7);
    const rest = field.substring(7);
    // Skip 3-char currency code
    const amountStr = rest.substring(3).trim();
    return {
      date: parseDate(dateStr),
      amount: parseAmount(amountStr),
      isCredit,
    };
  }

  function flushPendingTransaction(): void {
    if (pendingTransaction) {
      transactions.push({
        ...pendingTransaction,
        description: currentDescription.trim(),
      });
      pendingTransaction = null;
      currentDescription = '';
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith(':25:')) {
      accountId = line.substring(4).trim();
    } else if (line.startsWith(':28C:') || line.startsWith(':28:')) {
      statementNumber = line.substring(line.indexOf(':') === 0 ? 4 : 5).trim();
      if (statementNumber.startsWith(':')) statementNumber = statementNumber.substring(1);
    } else if (line.startsWith(':60F:') || line.startsWith(':60M:')) {
      const tag = line.startsWith(':60F:') ? ':60F:' : ':60M:';
      openingBalance = parseBalance(line.substring(tag.length).trim());
    } else if (line.startsWith(':62F:') || line.startsWith(':62M:')) {
      flushPendingTransaction();
      const tag = line.startsWith(':62F:') ? ':62F:' : ':62M:';
      closingBalance = parseBalance(line.substring(tag.length).trim());
    } else if (line.startsWith(':61:')) {
      flushPendingTransaction();
      const field = line.substring(4).trim();
      // Format: YYMMDD[MMDD] C/D/RC/RD [3!a]AMOUNT S REFERENCE
      const dateStr = field.substring(0, 6);
      let offset = 6;
      // Optional entry date (4 chars MMDD)
      if (/^\d{4}/.test(field.substring(offset))) {
        offset += 4;
      }
      // C/D/RC/RD indicator
      let isCredit: boolean;
      if (field.substring(offset, offset + 2) === 'RC') {
        isCredit = true;
        offset += 2;
      } else if (field.substring(offset, offset + 2) === 'RD') {
        isCredit = false;
        offset += 2;
      } else if (field.charAt(offset) === 'C') {
        isCredit = true;
        offset += 1;
      } else {
        isCredit = false;
        offset += 1;
      }
      // Optional 3-char currency letter (uppercase)
      if (/^[A-Z]{3}/.test(field.substring(offset))) {
        offset += 3;
      }
      // Amount (until non-digit/comma)
      let amountEnd = offset;
      while (amountEnd < field.length && /[\d,.]/.test(field.charAt(amountEnd))) {
        amountEnd++;
      }
      const amount = parseAmount(field.substring(offset, amountEnd));
      // Rest is type + reference
      const rest = field.substring(amountEnd).trim();
      // Skip SWIFT type code (1 char) and reference
      const reference = rest.length > 4 ? rest.substring(4).trim() : rest.trim();

      pendingTransaction = {
        date: parseDate(dateStr),
        amount,
        isCredit,
        reference,
      };
    } else if (line.startsWith(':86:')) {
      currentDescription += line.substring(4).trim() + ' ';
    } else if (pendingTransaction && !line.startsWith(':') && !line.startsWith('-') && line.length > 0) {
      // Continuation of :86: description
      currentDescription += line + ' ';
    }
  }

  flushPendingTransaction();

  return {
    accountId,
    statementNumber,
    openingBalance,
    closingBalance,
    transactions,
  };
}

// ============================================================================
// AGING SUSPENS
// ============================================================================

/**
 * Track aging of unreconciled items on a bank account.
 */
export async function getAgingSuspens(
  adapter: DataAdapter,
  companyId: string,
  bankAccountCode: string,
  asOfDate: string
): Promise<AgingSuspens> {
  const entries = await adapter.getJournalEntries({
    where: { status: 'validated' },
  });

  const asOf = new Date(asOfDate);
  const under30: SuspensItem[] = [];
  const days31to60: SuspensItem[] = [];
  const over60: SuspensItem[] = [];
  let totalSuspens = new Decimal(0);

  for (const entry of entries) {
    const entryData = entry as {
      date: string;
      entryNumber: string;
      label: string;
      lines: Array<{
        accountCode: string;
        debit: number;
        credit: number;
        lettrageCode?: string;
      }>;
    };

    for (const line of entryData.lines || []) {
      // Only bank account lines without lettrage
      if (!line.accountCode.startsWith(bankAccountCode)) continue;
      if (line.lettrageCode) continue;

      const amount = new Decimal(line.debit).minus(new Decimal(line.credit));
      if (amount.isZero()) continue;

      const entryDate = new Date(entryData.date);
      const daysOld = Math.max(0, Math.floor((asOf.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)));

      const item: SuspensItem = {
        date: entryData.date,
        label: entryData.label,
        amount: amount.abs(),
        daysOld,
        entryNumber: entryData.entryNumber,
      };

      totalSuspens = totalSuspens.plus(amount.abs());

      if (daysOld <= 30) {
        under30.push(item);
      } else if (daysOld <= 60) {
        days31to60.push(item);
      } else {
        over60.push(item);
      }
    }
  }

  return {
    under30Days: under30,
    days31to60: days31to60,
    over60Days: over60,
    totalSuspens: totalSuspens.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
  };
}
