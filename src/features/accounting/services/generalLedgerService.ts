import {
  AccountLedger,
  LedgerEntry,
  LedgerStats,
  GeneralLedgerFilters,
  LedgerSearchResult,
  LedgerAnnotation,
} from '../types/generalLedger.types';

class GeneralLedgerService {
  async getLedgerAccounts(filters: GeneralLedgerFilters): Promise<AccountLedger[]> {
    return Promise.resolve([
      {
        compte: '101000',
        libelle: 'Capital Social',
        soldeOuverture: 10000000,
        totalDebit: 0,
        totalCredit: 0,
        soldeFermeture: 10000000,
        nombreEcritures: 1,
        entries: [
          {
            id: 1,
            date: '2025-01-01',
            piece: 'OD-001',
            libelle: 'Apport initial capital',
            debit: 0,
            credit: 10000000,
            solde: -10000000,
            journal: 'OD',
          },
        ],
      },
      {
        compte: '411000',
        libelle: 'Clients',
        soldeOuverture: 0,
        totalDebit: 5000000,
        totalCredit: 3500000,
        soldeFermeture: 1500000,
        nombreEcritures: 8,
        entries: [],
      },
    ]);
  }

  async getAccountLedger(
    accountNumber: string,
    filters: Partial<GeneralLedgerFilters>
  ): Promise<AccountLedger> {
    return Promise.resolve({
      compte: accountNumber,
      libelle: 'Compte test',
      soldeOuverture: 0,
      totalDebit: 1000000,
      totalCredit: 500000,
      soldeFermeture: 500000,
      nombreEcritures: 5,
      entries: [],
    });
  }

  async getStats(filters: Partial<GeneralLedgerFilters>): Promise<LedgerStats> {
    return Promise.resolve({
      totalAccounts: 245,
      totalEntries: 12458,
      totalDebit: 850000000,
      totalCredit: 850000000,
      balance: 0,
      period: `${filters.dateDebut || '2025-01-01'} - ${filters.dateFin || '2025-12-31'}`,
    });
  }

  async search(query: string, filters?: Partial<GeneralLedgerFilters>): Promise<LedgerSearchResult> {
    const startTime = Date.now();

    await new Promise((resolve) => setTimeout(resolve, 300));

    return Promise.resolve({
      accounts: [],
      entries: [],
      totalResults: 0,
      searchTime: Date.now() - startTime,
    });
  }

  async getAnnotations(entryId: string | number): Promise<LedgerAnnotation[]> {
    return Promise.resolve([]);
  }

  async addAnnotation(
    entryId: string | number,
    content: string
  ): Promise<LedgerAnnotation> {
    return Promise.resolve({
      id: Date.now(),
      entryId,
      userId: 'current-user',
      userName: 'Utilisateur',
      date: new Date().toISOString(),
      content,
    });
  }

  async exportLedger(options: {
    format: 'excel' | 'pdf' | 'csv';
    filters: GeneralLedgerFilters;
  }): Promise<Blob> {
    return Promise.resolve(
      new Blob(['Mock export data'], { type: 'application/octet-stream' })
    );
  }

  async printLedger(filters: GeneralLedgerFilters): Promise<string> {
    return Promise.resolve('print-preview-url');
  }
}

export const generalLedgerService = new GeneralLedgerService();