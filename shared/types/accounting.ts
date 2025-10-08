/**
 * Types partagés entre le frontend et le backend
 * Pour le système comptable WiseBook
 */

// =================== Énumérations ===================

export enum UserRole {
  ADMIN = 'ADMIN',
  ACCOUNTANT = 'ACCOUNTANT',
  AUDITOR = 'AUDITOR',
  USER = 'USER',
  VIEWER = 'VIEWER'
}

export enum AccountType {
  ASSET = 'ASSET',           // Actif
  LIABILITY = 'LIABILITY',     // Passif
  EQUITY = 'EQUITY',          // Capitaux propres
  INCOME = 'INCOME',          // Produits
  EXPENSE = 'EXPENSE'         // Charges
}

export enum EntryStatus {
  DRAFT = 'DRAFT',
  VALIDATED = 'VALIDATED',
  CANCELLED = 'CANCELLED'
}

export enum ThirdPartyType {
  CUSTOMER = 'CUSTOMER',
  SUPPLIER = 'SUPPLIER',
  BOTH = 'BOTH',
  OTHER = 'OTHER'
}

export enum JournalTypeCode {
  SALES = 'VTE',        // Ventes
  PURCHASE = 'ACH',     // Achats
  BANK = 'BNQ',        // Banque
  CASH = 'CAI',        // Caisse
  MISC = 'OD',         // Opérations Diverses
  OPENING = 'AN'       // À Nouveau
}

// =================== Interfaces de base ===================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface Company {
  id: string;
  name: string;
  legalName?: string;
  taxNumber: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Exercise {
  id: string;
  companyId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isClosed: boolean;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  company?: Company;
}

// =================== Plan comptable ===================

export interface AccountClass {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Account {
  id: string;
  companyId: string;
  classId: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  isReconcilable: boolean;
  isCashAccount: boolean;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  company?: Company;
  class?: AccountClass;
}

export interface AccountBalance {
  id: string;
  accountId: string;
  exerciseId: string;
  period: Date;
  debitBalance: number;
  creditBalance: number;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
  account?: Account;
}

// =================== Journaux ===================

export interface JournalType {
  id: string;
  code: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Journal {
  id: string;
  companyId: string;
  typeId: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  lastEntryNumber: number;
  createdAt: Date;
  updatedAt: Date;
  company?: Company;
  type?: JournalType;
}

// =================== Écritures ===================

export interface JournalEntry {
  id: string;
  journalId: string;
  exerciseId: string;
  entryNumber: string;
  entryDate: Date;
  description: string;
  reference?: string;
  status: EntryStatus;
  totalDebit: number;
  totalCredit: number;
  createdById: string;
  validatedById?: string;
  validatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  journal?: Journal;
  exercise?: Exercise;
  createdBy?: User;
  validatedBy?: User;
  lines?: EntryLine[];
  attachments?: Attachment[];
}

export interface EntryLine {
  id: string;
  entryId: string;
  lineNumber: number;
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
  analyticalCode?: string;
  thirdPartyId?: string;
  dueDate?: Date;
  reconciled: boolean;
  reconciledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  entry?: JournalEntry;
  account?: Account;
  thirdParty?: ThirdParty;
  analytical?: AnalyticalAxis;
  vatLine?: VatLine;
}

// =================== Tiers ===================

export interface ThirdParty {
  id: string;
  code: string;
  name: string;
  type: ThirdPartyType;
  taxNumber?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  creditLimit?: number;
  paymentTerms?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// =================== TVA ===================

export interface VatRate {
  id: string;
  code: string;
  name: string;
  rate: number;
  accountId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VatLine {
  id: string;
  entryLineId: string;
  vatRateId: string;
  baseAmount: number;
  vatAmount: number;
  createdAt: Date;
  updatedAt: Date;
  entryLine?: EntryLine;
  vatRate?: VatRate;
}

// =================== Analytique ===================

export interface AnalyticalAxis {
  id: string;
  code: string;
  name: string;
  description?: string;
  parentId?: string;
  level: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  parent?: AnalyticalAxis;
  children?: AnalyticalAxis[];
}

// =================== Pièces jointes ===================

export interface Attachment {
  id: string;
  entryId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  uploadedAt: Date;
  entry?: JournalEntry;
}

// =================== Audit ===================

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  user?: User;
}

// =================== Paramètres ===================

export interface Setting {
  id: string;
  key: string;
  value: any;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// =================== DTOs de création/mise à jour ===================

export interface CreateJournalDTO {
  code: string;
  name: string;
  typeId: string;
  companyId: string;
  description?: string;
}

export interface UpdateJournalDTO {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface CreateAccountDTO {
  code: string;
  name: string;
  classId: string;
  companyId: string;
  description?: string;
  isReconcilable?: boolean;
  isCashAccount?: boolean;
  currency?: string;
}

export interface UpdateAccountDTO {
  name?: string;
  description?: string;
  isReconcilable?: boolean;
  isCashAccount?: boolean;
  isActive?: boolean;
}

export interface CreateEntryLineDTO {
  accountId: string;
  debit?: number;
  credit?: number;
  description?: string;
  analyticalCode?: string;
  thirdPartyId?: string;
  dueDate?: Date;
}

export interface CreateEntryDTO {
  journalId: string;
  exerciseId: string;
  entryDate: Date;
  description: string;
  reference?: string;
  lines: CreateEntryLineDTO[];
}

export interface UpdateEntryDTO {
  description?: string;
  reference?: string;
  lines?: CreateEntryLineDTO[];
}

// =================== Types de réponse API ===================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// =================== Types de rapports ===================

export interface BalanceSheetReport {
  date: Date;
  exercise: Exercise;
  company: Company;
  assets: {
    fixed: AccountBalance[];
    current: AccountBalance[];
    total: number;
  };
  liabilities: {
    equity: AccountBalance[];
    debt: AccountBalance[];
    current: AccountBalance[];
    total: number;
  };
  isBalanced: boolean;
}

export interface IncomeStatementReport {
  period: {
    startDate: Date;
    endDate: Date;
  };
  exercise: Exercise;
  company: Company;
  income: {
    operating: AccountBalance[];
    financial: AccountBalance[];
    exceptional: AccountBalance[];
    total: number;
  };
  expenses: {
    operating: AccountBalance[];
    financial: AccountBalance[];
    exceptional: AccountBalance[];
    total: number;
  };
  netIncome: number;
  profitMargin: number;
}

export interface GeneralLedgerReport {
  period: {
    startDate?: Date;
    endDate?: Date;
  };
  exerciseId: string;
  accounts: {
    account: Account;
    openingBalance: number;
    entries: EntryLine[];
    periodTotals: {
      debit: number;
      credit: number;
    };
    closingBalance: number;
  }[];
  summary: {
    totalAccounts: number;
    totalEntries: number;
    totalDebit: number;
    totalCredit: number;
  };
}

export interface TrialBalanceReport {
  date: Date;
  exerciseId: string;
  level: number;
  accounts: {
    code: string;
    name: string;
    className: string;
    debitMovements: number;
    creditMovements: number;
    debitBalance: number;
    creditBalance: number;
  }[];
  totals: {
    debitMovements: number;
    creditMovements: number;
    debitBalance: number;
    creditBalance: number;
  };
  isBalanced: boolean;
}

// =================== Types de filtres ===================

export interface EntryFilters {
  journalId?: string;
  exerciseId?: string;
  status?: EntryStatus;
  startDate?: Date;
  endDate?: Date;
  accountId?: string;
  thirdPartyId?: string;
}

export interface AccountFilters {
  companyId?: string;
  classId?: string;
  isActive?: boolean;
  isReconcilable?: boolean;
  isCashAccount?: boolean;
}