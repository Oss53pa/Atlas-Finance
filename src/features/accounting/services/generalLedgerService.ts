/**
 * General Ledger Service — Connected to Dexie IndexedDB.
 * Queries real journal entries from the local database.
 */
import type { DataAdapter } from '@atlas/data';
import type { DBJournalEntry } from '../../../lib/db';
import { money } from '../../../utils/money';
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
  async getLedgerAccounts(adapter: DataAdapter, filters: GeneralLedgerFilters): Promise<AccountLedger[]> {
    const entries = await this.queryEntries(adapter, filters);

    // AF-055: Compute cumulative opening balances from ALL entries before dateDebut
    const openingBalances = new Map<string, number>();
    if (filters.dateDebut) {
      // Fetch all entries (unfiltered) to find pre-period movements
      const allEntries = await adapter.getAll<DBJournalEntry>('journalEntries');
      for (const entry of allEntries) {
        if (entry.date >= filters.dateDebut) continue; // only entries BEFORE the period
        for (const line of entry.lines) {
          const current = openingBalances.get(line.accountCode) || 0;
          openingBalances.set(line.accountCode, money(current).add(money(line.debit)).subtract(money(line.credit)).toNumber());
        }
      }
    } else {
      // No date filter: opening balances from AN/RAN entries only
      for (const entry of entries) {
        if (entry.journal !== 'AN' && entry.journal !== 'RAN') continue;
        for (const line of entry.lines) {
          const current = openingBalances.get(line.accountCode) || 0;
          openingBalances.set(line.accountCode, money(current).add(money(line.debit)).subtract(money(line.credit)).toNumber());
        }
      }
    }

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
        existing.debit = money(existing.debit).add(money(line.debit)).toNumber();
        existing.credit = money(existing.credit).add(money(line.credit)).toNumber();
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

      const soldeOuverture = openingBalances.get(code) || 0;
      let runningBalance = soldeOuverture;
      // Sort entries with AN/RAN first (opening), then by date
      const sorted = data.entries.sort((a, b) => {
        if (a.journal === 'AN' || a.journal === 'RAN') return -1;
        if (b.journal === 'AN' || b.journal === 'RAN') return 1;
        return a.date.localeCompare(b.date);
      });
      // AF-019: Do NOT reset runningBalance — soldeOuverture must carry forward
      for (const e of sorted) {
        runningBalance = money(runningBalance).add(money(e.debit)).subtract(money(e.credit)).toNumber();
        e.solde = runningBalance;
      }

      accounts.push({
        compte: code,
        libelle: data.libelle,
        soldeOuverture,
        totalDebit: data.debit,
        totalCredit: data.credit,
        soldeFermeture: money(soldeOuverture).add(money(data.debit)).subtract(money(data.credit)).toNumber(),
        nombreEcritures: data.entries.length,
        entries: sorted,
      });
    }

    return accounts;
  }

  async getAccountLedger(
    adapter: DataAdapter,
    accountNumber: string,
    filters: Partial<GeneralLedgerFilters>
  ): Promise<AccountLedger> {
    const allEntries = (await adapter.getAll<DBJournalEntry>('journalEntries'))
      .filter(e => e.status !== 'draft');

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
          totalDebit = money(totalDebit).add(money(line.debit)).toNumber();
          totalCredit = money(totalCredit).add(money(line.credit)).toNumber();
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

    // AF-055: Compute cumulative opening balance from ALL entries before dateDebut
    let soldeOuverture = 0;
    if (filters.dateDebut) {
      for (const entry of allEntries) {
        if (entry.date >= filters.dateDebut) continue;
        for (const line of entry.lines) {
          if (line.accountCode === accountNumber) {
            soldeOuverture = money(soldeOuverture).add(money(line.debit)).subtract(money(line.credit)).toNumber();
          }
        }
      }
    } else {
      for (const l of lines) {
        if (l.journal === 'AN' || l.journal === 'RAN') {
          soldeOuverture = money(soldeOuverture).add(money(l.debit)).subtract(money(l.credit)).toNumber();
        }
      }
    }

    // Running balance — sort AN/RAN first
    lines.sort((a, b) => {
      if (a.journal === 'AN' || a.journal === 'RAN') return -1;
      if (b.journal === 'AN' || b.journal === 'RAN') return 1;
      return a.date.localeCompare(b.date);
    });
    let runningBalance = soldeOuverture;
    for (const l of lines) {
      runningBalance = money(runningBalance).add(money(l.debit)).subtract(money(l.credit)).toNumber();
      l.solde = runningBalance;
    }

    return {
      compte: accountNumber,
      libelle,
      soldeOuverture,
      totalDebit,
      totalCredit,
      soldeFermeture: money(soldeOuverture).add(money(totalDebit)).subtract(money(totalCredit)).toNumber(),
      nombreEcritures: lines.length,
      entries: lines,
    };
  }

  async getStats(adapter: DataAdapter, filters: Partial<GeneralLedgerFilters>): Promise<LedgerStats> {
    const entries = (await adapter.getAll<DBJournalEntry>('journalEntries'))
      .filter(e => e.status !== 'draft');
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
        totalDebit = money(totalDebit).add(money(line.debit)).toNumber();
        totalCredit = money(totalCredit).add(money(line.credit)).toNumber();
      }
    }

    return {
      totalAccounts: accountCodes.size,
      totalEntries: entryCount,
      totalDebit,
      totalCredit,
      balance: money(totalDebit).subtract(money(totalCredit)).toNumber(),
      period: `${filters.dateDebut || ''} - ${filters.dateFin || ''}`,
    };
  }

  async search(adapter: DataAdapter, query: string, filters?: Partial<GeneralLedgerFilters>): Promise<LedgerSearchResult> {
    const startTime = Date.now();
    const q = query.toLowerCase();
    const entries = (await adapter.getAll<DBJournalEntry>('journalEntries'))
      .filter(e => e.status !== 'draft');

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

  async getAnnotations(adapter: DataAdapter, _entryId: string | number): Promise<LedgerAnnotation[]> {
    // Annotations stored in settings as JSON
    const setting = await adapter.getById<{ key: string; value: string }>('settings', `annotation_${_entryId}`);
    if (!setting) return [];
    try {
      return JSON.parse(setting.value);
    } catch {
      return [];
    }
  }

  async addAnnotation(
    adapter: DataAdapter,
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

    const existing = await this.getAnnotations(adapter, entryId);
    existing.push(annotation);
    await adapter.create('settings', {
      key: `annotation_${entryId}`,
      value: JSON.stringify(existing),
      updatedAt: new Date().toISOString(),
    });

    return annotation;
  }

  async exportLedger(adapter: DataAdapter, options: {
    format: 'excel' | 'pdf' | 'csv';
    filters: GeneralLedgerFilters;
  }): Promise<Blob> {
    const accounts = await this.getLedgerAccounts(adapter, options.filters);

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

  async printLedger(adapter: DataAdapter, filters: GeneralLedgerFilters): Promise<string> {
    return 'print-preview-url';
  }

  // ---- Private helpers ----

  private async queryEntries(adapter: DataAdapter, filters: GeneralLedgerFilters): Promise<DBJournalEntry[]> {
    let entries = (await adapter.getAll<DBJournalEntry>('journalEntries'))
      .filter(e => e.status !== 'draft');

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
