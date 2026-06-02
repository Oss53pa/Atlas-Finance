/**
 * bankStatementService — Journal des relevés bancaires importés.
 *
 * Persiste chaque relevé importé (infos de setup + lignes détaillées) dans
 * `bankStatements` / `bankStatementLines` via le DataAdapter, et expose la
 * liste des relevés avec drill-down sur leurs lignes.
 *
 * Toutes les fonctions prennent `adapter: DataAdapter` en premier paramètre.
 */
import type { DataAdapter } from '@atlas/data';
import { money } from '../utils/money';
import type { DBBankStatement, DBBankStatementLine } from '../lib/db';
import type { BankTransaction } from './rapprochementBancaireService';

export interface BankStatementSetupInfo {
  accountCode: string;
  accountLabel: string;
  bankName?: string;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  closingBalance: number;
  currency: string;
  fileName?: string;
  companyId?: string;
}

// Normalisation défensive : en SaaS, les colonnes arrivent en snake_case
// (pas de normaliseur dédié dans l'adapter) ; en local Dexie, en camelCase.
function normStatement(r: any): DBBankStatement {
  return {
    id: r.id,
    companyId: r.companyId ?? r.company_id,
    accountCode: r.accountCode ?? r.account_code ?? '',
    accountLabel: r.accountLabel ?? r.account_label ?? '',
    bankName: r.bankName ?? r.bank_name,
    periodStart: r.periodStart ?? r.period_start ?? '',
    periodEnd: r.periodEnd ?? r.period_end ?? '',
    openingBalance: Number(r.openingBalance ?? r.opening_balance ?? 0),
    closingBalance: Number(r.closingBalance ?? r.closing_balance ?? 0),
    currency: r.currency ?? 'XOF',
    fileName: r.fileName ?? r.file_name,
    lineCount: Number(r.lineCount ?? r.line_count ?? 0),
    totalDebit: Number(r.totalDebit ?? r.total_debit ?? 0),
    totalCredit: Number(r.totalCredit ?? r.total_credit ?? 0),
    importedAt: r.importedAt ?? r.imported_at ?? '',
    createdAt: r.createdAt ?? r.created_at ?? '',
  };
}

function normLine(r: any): DBBankStatementLine {
  return {
    id: r.id,
    statementId: r.statementId ?? r.statement_id ?? '',
    date: r.date ?? '',
    dateValeur: r.dateValeur ?? r.date_valeur,
    label: r.label ?? '',
    reference: r.reference,
    debit: Number(r.debit ?? 0),
    credit: Number(r.credit ?? 0),
    amount: Number(r.amount ?? 0),
    type: (r.type ?? (Number(r.amount ?? 0) >= 0 ? 'credit' : 'debit')) as 'credit' | 'debit',
    balance: r.balance != null ? Number(r.balance) : undefined,
    matchedEntryId: r.matchedEntryId ?? r.matched_entry_id,
    reconciled: Boolean(r.reconciled),
  };
}

/** Liste des relevés importés, plus récent d'abord. */
export async function getBankStatements(adapter: DataAdapter): Promise<DBBankStatement[]> {
  const all = await adapter.getAll<any>('bankStatements');
  return all.map(normStatement).sort((a, b) => (b.importedAt || '').localeCompare(a.importedAt || ''));
}

/** Lignes d'un relevé donné, triées par date. */
export async function getBankStatementLines(
  adapter: DataAdapter,
  statementId: string,
): Promise<DBBankStatementLine[]> {
  // En SaaS le filtre `where` est en snake_case côté PostgREST ; on récupère
  // tout et on filtre en mémoire pour rester robuste aux deux conventions.
  const raw = await adapter.getAll<any>('bankStatementLines');
  return raw
    .map(normLine)
    .filter((l) => l.statementId === statementId)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}

/**
 * Enregistre un relevé importé + ses lignes.
 * Retourne le relevé créé (avec son id).
 */
export async function createBankStatement(
  adapter: DataAdapter,
  info: BankStatementSetupInfo,
  transactions: BankTransaction[],
): Promise<DBBankStatement> {
  let totalDebit = money(0);
  let totalCredit = money(0);
  for (const tx of transactions) {
    if (tx.amount >= 0) totalCredit = totalCredit.add(money(tx.amount));
    else totalDebit = totalDebit.add(money(-tx.amount));
  }

  const now = new Date().toISOString();
  const statement = await adapter.create<DBBankStatement>('bankStatements', {
    companyId: info.companyId,
    accountCode: info.accountCode,
    accountLabel: info.accountLabel,
    bankName: info.bankName,
    periodStart: info.periodStart,
    periodEnd: info.periodEnd,
    openingBalance: info.openingBalance,
    closingBalance: info.closingBalance,
    currency: info.currency,
    fileName: info.fileName,
    lineCount: transactions.length,
    totalDebit: totalDebit.toNumber(),
    totalCredit: totalCredit.toNumber(),
    importedAt: now,
    createdAt: now,
  } as Omit<DBBankStatement, 'id'>);

  for (const tx of transactions) {
    const isCredit = tx.amount >= 0;
    await adapter.create<DBBankStatementLine>('bankStatementLines', {
      statementId: statement.id,
      date: tx.date,
      dateValeur: tx.valueDate,
      label: tx.label,
      reference: tx.reference,
      debit: isCredit ? 0 : money(-tx.amount).toNumber(),
      credit: isCredit ? money(tx.amount).toNumber() : 0,
      amount: tx.amount,
      type: isCredit ? 'credit' : 'debit',
      balance: tx.balance,
      matchedEntryId: tx.matchedEntryIds?.[0],
      reconciled: Boolean(tx.matched),
    } as Omit<DBBankStatementLine, 'id'>);
  }

  return statement;
}

/** Supprime un relevé et toutes ses lignes. */
export async function deleteBankStatement(adapter: DataAdapter, statementId: string): Promise<void> {
  const lines = await getBankStatementLines(adapter, statementId);
  for (const line of lines) {
    await adapter.delete('bankStatementLines', line.id);
  }
  await adapter.delete('bankStatements', statementId);
}
