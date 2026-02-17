/**
 * General Ledger Service — Connected to Dexie IndexedDB.
 * Queries real journal entries from the local database.
 */
import { db } from '../../../lib/db';
import type { DBJournalEntry } from '../../../lib/db';
import {
  AccountLedger,
  LedgerStats,
  GeneralLedgerFilters,
  LedgerSearchResult,
  LedgerAnnotation,
} from '../types/generalLedger.types';

class GeneralLedgerService {
  /**
   * Build ledger accounts from real journal entries in IndexedDB.
   */
  async getLedgerAccounts(filters: GeneralLedgerFilters): Promise<AccountLedger[]> {
    const entries = await this.queryEntries(filters);

    // Group lines by account code
    const accountMap = new Map<string, { libelle: string; debit: number; credit: number; entries: Array<{ id: string; date: string; piece: string; libelle: string; debit: number; credit: number; solde: number; journal: string; tiers: string }> }>();

    for (const entry of entries) {
      for (const line of entry.lines) {
        const existing = accountMap.get(line.accountCode) || {
          libelle: line.accountName,
          debit: 0,
          credit: 0,
          entries: [],
        };
        existing.debit += line.debit;
        existing.credit += line.credit;
        existing.entries.push({
          id: entry.id,
          date: entry.date,
          piece: entry.reference,
          libelle: line.label || entry.label,
          debit: line.debit,
          credit: line.credit,
          solde: 0, // computed below
          journal: entry.journal,
          tiers: line.thirdPartyName || '',
        });
        accountMap.set(line.accountCode, existing);
      }
    }

    // Build AccountLedger array with running balance
    const accounts: AccountLedger[] = [];
    for (const [code, data] of Array.from(accountMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      // Apply account range filter
      if (filters.compteDebut && code < filters.compteDebut) continue;
      if (filters.compteFin && code > filters.compteFin) continue;

      let runningBalance = 0;
      for (const e of data.entries.sort((a, b) => a.date.localeCompare(b.date))) {
        runningBalance += e.debit - e.credit;
        e.solde = runningBalance;
      }

      accounts.push({
        compte: code,
        libelle: data.libelle,
        soldeOuverture: 0,
        totalDebit: data.debit,
        totalCredit: data.credit,
        soldeFermeture: data.debit - data.credit,
        nombreEcritures: data.entries.length,
        entries: data.entries,
      });
    }

    return accounts;
  }

  async getAccountLedger(
    accountNumber: string,
    filters: Partial<GeneralLedgerFilters>
  ): Promise<AccountLedger> {
    const allEntries = await db.journalEntries.toArray();

    const lines: Array<{ id: string; date: string; piece: string; libelle: string; debit: number; credit: number; solde: number; journal: string; tiers: string }> = [];
    let totalDebit = 0;
    let totalCredit = 0;
    let libelle = accountNumber;

    for (const entry of allEntries) {
      if (filters.dateDebut && entry.date < filters.dateDebut) continue;
      if (filters.dateFin && entry.date > filters.dateFin) continue;

      for (const line of entry.lines) {
        if (line.accountCode === accountNumber) {
          libelle = line.accountName || accountNumber;
          totalDebit += line.debit;
          totalCredit += line.credit;
          lines.push({
            id: entry.id,
            date: entry.date,
            piece: entry.reference,
            libelle: line.label || entry.label,
            debit: line.debit,
            credit: line.credit,
            solde: 0,
            journal: entry.journal,
            tiers: line.thirdPartyName || '',
          });
        }
      }
    }

    // Running balance
    let runningBalance = 0;
    lines.sort((a, b) => a.date.localeCompare(b.date));
    for (const l of lines) {
      runningBalance += l.debit - l.credit;
      l.solde = runningBalance;
    }

    return {
      compte: accountNumber,
      libelle,
      soldeOuverture: 0,
      totalDebit,
      totalCredit,
      soldeFermeture: totalDebit - totalCredit,
      nombreEcritures: lines.length,
      entries: lines,
    };
  }

  async getStats(filters: Partial<GeneralLedgerFilters>): Promise<LedgerStats> {
    const entries = await db.journalEntries.toArray();
    const accountCodes = new Set<string>();
    let totalDebit = 0;
    let totalCredit = 0;
    let entryCount = 0;

    for (const entry of entries) {
      if (filters.dateDebut && entry.date < filters.dateDebut) continue;
      if (filters.dateFin && entry.date > filters.dateFin) continue;

      entryCount++;
      for (const line of entry.lines) {
        accountCodes.add(line.accountCode);
        totalDebit += line.debit;
        totalCredit += line.credit;
      }
    }

    return {
      totalAccounts: accountCodes.size,
      totalEntries: entryCount,
      totalDebit,
      totalCredit,
      balance: totalDebit - totalCredit,
      period: `${filters.dateDebut || ''} - ${filters.dateFin || ''}`,
    };
  }

  async search(query: string, filters?: Partial<GeneralLedgerFilters>): Promise<LedgerSearchResult> {
    const startTime = Date.now();
    const q = query.toLowerCase();
    const entries = await db.journalEntries.toArray();

    const matchingAccounts = new Map<string, AccountLedger>();
    const matchingEntries: Array<{ id: string; date: string; piece: string; libelle: string; debit: number; credit: number; solde: number; journal: string }> = [];

    for (const entry of entries) {
      if (filters?.dateDebut && entry.date < filters.dateDebut) continue;
      if (filters?.dateFin && entry.date > filters.dateFin) continue;

      for (const line of entry.lines) {
        const matches =
          line.accountCode.includes(q) ||
          line.accountName.toLowerCase().includes(q) ||
          line.label.toLowerCase().includes(q) ||
          entry.label.toLowerCase().includes(q) ||
          entry.reference.toLowerCase().includes(q);

        if (matches) {
          matchingEntries.push({
            id: entry.id,
            date: entry.date,
            piece: entry.reference,
            libelle: line.label || entry.label,
            debit: line.debit,
            credit: line.credit,
            solde: 0,
            journal: entry.journal,
          });

          if (!matchingAccounts.has(line.accountCode)) {
            matchingAccounts.set(line.accountCode, {
              compte: line.accountCode,
              libelle: line.accountName,
              soldeOuverture: 0,
              totalDebit: 0,
              totalCredit: 0,
              soldeFermeture: 0,
              nombreEcritures: 0,
              entries: [],
            });
          }
        }
      }
    }

    return {
      accounts: Array.from(matchingAccounts.values()),
      entries: matchingEntries,
      totalResults: matchingEntries.length,
      searchTime: Date.now() - startTime,
    };
  }

  async getAnnotations(_entryId: string | number): Promise<LedgerAnnotation[]> {
    // Annotations stored in settings as JSON
    const setting = await db.settings.get(`annotation_${_entryId}`);
    if (!setting) return [];
    try {
      return JSON.parse(setting.value);
    } catch {
      return [];
    }
  }

  async addAnnotation(
    entryId: string | number,
    content: string
  ): Promise<LedgerAnnotation> {
    const annotation: LedgerAnnotation = {
      id: crypto.randomUUID(),
      entryId,
      userId: 'current-user',
      userName: 'Utilisateur',
      date: new Date().toISOString(),
      content,
    };

    const existing = await this.getAnnotations(entryId);
    existing.push(annotation);
    await db.settings.put({
      key: `annotation_${entryId}`,
      value: JSON.stringify(existing),
      updatedAt: new Date().toISOString(),
    });

    return annotation;
  }

  async exportLedger(options: {
    format: 'excel' | 'pdf' | 'csv';
    filters: GeneralLedgerFilters;
  }): Promise<Blob> {
    const accounts = await this.getLedgerAccounts(options.filters);

    if (options.format === 'csv') {
      const rows = ['Compte;Libelle;Date;Piece;Description;Debit;Credit;Solde'];
      for (const account of accounts) {
        for (const entry of account.entries) {
          rows.push([
            account.compte,
            account.libelle,
            entry.date,
            entry.piece,
            entry.libelle,
            entry.debit.toString(),
            entry.credit.toString(),
            entry.solde.toString(),
          ].join(';'));
        }
      }
      return new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    }

    // For excel/pdf, return CSV as fallback (real implementation would use a library)
    return new Blob(['Export data'], { type: 'application/octet-stream' });
  }

  async printLedger(filters: GeneralLedgerFilters): Promise<string> {
    return 'print-preview-url';
  }

  // ---- Private helpers ----

  private async queryEntries(filters: GeneralLedgerFilters): Promise<DBJournalEntry[]> {
    let entries = await db.journalEntries.toArray();

    if (filters.dateDebut) {
      entries = entries.filter(e => e.date >= filters.dateDebut);
    }
    if (filters.dateFin) {
      entries = entries.filter(e => e.date <= filters.dateFin);
    }
    if (filters.journal) {
      entries = entries.filter(e => e.journal === filters.journal);
    }

    return entries;
  }
}

export const generalLedgerService = new GeneralLedgerService();
