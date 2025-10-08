/**
 * Service de migration pour adapter l'ancien service accounting.service.ts
 * vers le nouveau système API WiseBook
 */

import { wiseBookApi } from './wisebook-api.service';
import type {
  Journal,
  Account,
  JournalEntry,
  CreateEntryDTO,
  CreateEntryLineDTO
} from './wisebook-api.service';

// Interfaces de compatibilité avec l'ancien système
interface LegacyJournal {
  id: string;
  company: string;
  company_name?: string;
  code: string;
  name: string;
  journal_type: 'sale' | 'purchase' | 'bank' | 'cash' | 'misc';
  description?: string;
  is_active: boolean;
  entries_count?: number;
  last_entry_date?: string;
}

interface LegacyAccount {
  id: string;
  company: string;
  company_name?: string;
  account_number: string;
  name: string;
  account_class: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parent?: string;
  parent_name?: string;
  is_analytical: boolean;
  is_active: boolean;
  description?: string;
  children_count?: number;
  balance_info?: {
    has_movements: boolean;
    account_class: string;
    debit_nature: boolean;
  };
}

interface LegacyJournalEntry {
  id?: string;
  company: string;
  company_name?: string;
  journal: string;
  journal_name?: string;
  fiscal_year: string;
  fiscal_year_name?: string;
  reference?: string;
  entry_date: string;
  description: string;
  status: 'draft' | 'validated' | 'posted';
  validated_at?: string;
  posted_at?: string;
  lines: LegacyJournalEntryLine[];
  total_debit?: number;
  total_credit?: number;
}

interface LegacyJournalEntryLine {
  id?: string;
  account: string;
  account_number?: string;
  account_name?: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  analytical_account?: string;
  cost_center?: string;
  reference?: string;
}

/**
 * Service de compatibilité pour migrer progressivement
 */
export class AccountingMigrationService {

  // Transformateurs de données
  private transformJournalToLegacy(journal: Journal): LegacyJournal {
    return {
      id: journal.id,
      company: journal.companyId,
      company_name: journal.company?.name,
      code: journal.code,
      name: journal.name,
      journal_type: this.mapJournalType(journal.type?.code),
      description: journal.description,
      is_active: journal.isActive,
      entries_count: 0, // À calculer si nécessaire
      last_entry_date: undefined
    };
  }

  private transformAccountToLegacy(account: Account): LegacyAccount {
    return {
      id: account.id,
      company: account.companyId,
      company_name: account.company?.name,
      account_number: account.code,
      name: account.name,
      account_class: account.class?.code || '',
      account_type: this.mapAccountType(account.class?.type),
      parent: undefined,
      parent_name: undefined,
      is_analytical: false, // À adapter selon vos besoins
      is_active: account.isActive,
      description: account.description,
      children_count: 0
    };
  }

  private transformEntryToLegacy(entry: JournalEntry): LegacyJournalEntry {
    return {
      id: entry.id,
      company: entry.journal?.companyId || '',
      company_name: entry.journal?.company?.name,
      journal: entry.journalId,
      journal_name: entry.journal?.name,
      fiscal_year: entry.exerciseId,
      fiscal_year_name: undefined,
      reference: entry.reference,
      entry_date: entry.entryDate.toISOString(),
      description: entry.description,
      status: entry.status.toLowerCase() as any,
      validated_at: entry.validatedAt?.toISOString(),
      posted_at: entry.validatedAt?.toISOString(),
      lines: entry.lines?.map(line => ({
        id: line.id,
        account: line.accountId,
        account_number: line.account?.code,
        account_name: line.account?.name,
        description: line.description || '',
        debit_amount: line.debit,
        credit_amount: line.credit,
        analytical_account: line.analyticalCode,
        cost_center: undefined,
        reference: undefined
      })) || [],
      total_debit: entry.totalDebit,
      total_credit: entry.totalCredit
    };
  }

  // Transformateurs inverses (Legacy vers nouveau format)
  private transformLegacyToEntry(legacyEntry: LegacyJournalEntry): CreateEntryDTO {
    return {
      journalId: legacyEntry.journal,
      exerciseId: legacyEntry.fiscal_year,
      entryDate: new Date(legacyEntry.entry_date),
      description: legacyEntry.description,
      reference: legacyEntry.reference,
      lines: legacyEntry.lines.map((line, index) => ({
        accountId: line.account,
        debit: line.debit_amount,
        credit: line.credit_amount,
        description: line.description,
        analyticalCode: line.analytical_account,
        thirdPartyId: undefined,
        dueDate: undefined
      }))
    };
  }

  // Mappeurs de types
  private mapJournalType(typeCode?: string): 'sale' | 'purchase' | 'bank' | 'cash' | 'misc' {
    const mapping: Record<string, any> = {
      'VTE': 'sale',
      'ACH': 'purchase',
      'BNQ': 'bank',
      'CAI': 'cash',
      'OD': 'misc',
      'AN': 'misc'
    };
    return mapping[typeCode || ''] || 'misc';
  }

  private mapAccountType(type?: string): 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' {
    const mapping: Record<string, any> = {
      'ASSET': 'asset',
      'LIABILITY': 'liability',
      'EQUITY': 'equity',
      'INCOME': 'revenue',
      'EXPENSE': 'expense'
    };
    return mapping[type || ''] || 'asset';
  }

  // Méthodes publiques de compatibilité
  async getJournals(params?: any) {
    try {
      const response = await wiseBookApi.journals.getAll(params);
      if (response.success && response.data) {
        const legacyJournals = response.data.map(j => this.transformJournalToLegacy(j));
        return { results: legacyJournals };
      }
      return { results: [] };
    } catch (error) {
      console.error('Migration error - getJournals:', error);
      return { results: [] };
    }
  }

  async getAccounts(params?: any) {
    try {
      const response = await wiseBookApi.accounts.getAll(params);
      if (response.success && response.data) {
        const legacyAccounts = response.data.map(a => this.transformAccountToLegacy(a));
        return { results: legacyAccounts };
      }
      return { results: [] };
    } catch (error) {
      console.error('Migration error - getAccounts:', error);
      return { results: [] };
    }
  }

  async getJournalEntries(journalId: string, params?: any) {
    try {
      const allParams = { ...params, journalId };
      const response = await wiseBookApi.entries.getAll(allParams);
      if (response.success && response.data) {
        const legacyEntries = response.data.map(e => this.transformEntryToLegacy(e));
        return {
          results: legacyEntries,
          total: response.pagination?.total || legacyEntries.length
        };
      }
      return { results: [], total: 0 };
    } catch (error) {
      console.error('Migration error - getJournalEntries:', error);
      return { results: [], total: 0 };
    }
  }

  async createJournalEntry(data: LegacyJournalEntry) {
    try {
      const newEntryData = this.transformLegacyToEntry(data);
      const response = await wiseBookApi.entries.create(newEntryData);
      if (response.success && response.data) {
        return this.transformEntryToLegacy(response.data);
      }
      throw new Error('Failed to create entry');
    } catch (error) {
      console.error('Migration error - createJournalEntry:', error);
      throw error;
    }
  }

  async validateEntry(entryId: string) {
    try {
      const response = await wiseBookApi.entries.validate(entryId);
      if (response.success && response.data) {
        return this.transformEntryToLegacy(response.data);
      }
      throw new Error('Failed to validate entry');
    } catch (error) {
      console.error('Migration error - validateEntry:', error);
      throw error;
    }
  }
}

// Instance singleton
export const accountingMigration = new AccountingMigrationService();

// Wrapper de compatibilité pour l'ancien accountingService
export const accountingService = {
  // Méthodes de compatibilité qui utilisent le nouveau système
  getJournals: (params?: any) => accountingMigration.getJournals(params),
  getJournalEntries: (journalId: string, params?: any) =>
    accountingMigration.getJournalEntries(journalId, params),
  getChartOfAccounts: (params?: any) => accountingMigration.getAccounts(params),
  createJournalEntry: (data: LegacyJournalEntry) =>
    accountingMigration.createJournalEntry(data),
  validateJournalEntry: (entryId: string) =>
    accountingMigration.validateEntry(entryId),

  // Nouvelles méthodes utilisant directement le nouveau système
  wiseBook: wiseBookApi
};