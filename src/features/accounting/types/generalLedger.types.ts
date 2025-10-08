export interface LedgerEntry {
  id: string | number;
  date: string;
  piece: string;
  libelle: string;
  debit: number;
  credit: number;
  solde: number;
  centreCout?: string;
  tiers?: string;
  referenceExterne?: string;
  journal?: string;
  validatedBy?: string;
  notes?: string;
}

export interface AccountLedger {
  compte: string;
  libelle: string;
  soldeOuverture: number;
  totalDebit: number;
  totalCredit: number;
  soldeFermeture: number;
  nombreEcritures: number;
  entries: LedgerEntry[];
}

export interface GeneralLedgerFilters {
  dateDebut: string;
  dateFin: string;
  compteDebut?: string;
  compteFin?: string;
  journal?: string;
  tiers?: string;
  centreCout?: string;
  montantMin?: number;
  montantMax?: number;
  piece?: string;
  libelle?: string;
}

export interface LedgerStats {
  totalAccounts: number;
  totalEntries: number;
  totalDebit: number;
  totalCredit: number;
  balance: number;
  period: string;
}

export interface LedgerSearchResult {
  accounts: AccountLedger[];
  entries: LedgerEntry[];
  totalResults: number;
  searchTime: number;
}

export interface LedgerAnnotation {
  id: string | number;
  entryId: string | number;
  userId: string;
  userName: string;
  date: string;
  content: string;
}

export interface LedgerExportOptions {
  format: 'excel' | 'pdf' | 'csv';
  includeDetails: boolean;
  groupBy?: 'account' | 'journal' | 'date';
  filters?: GeneralLedgerFilters;
}