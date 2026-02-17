import Dexie, { type Table } from 'dexie';

// ============================================================================
// INTERFACES
// ============================================================================

export interface DBJournalEntry {
  id: string;
  entryNumber: string;
  journal: string;
  date: string;
  reference: string;
  label: string;
  status: 'draft' | 'validated' | 'posted';
  lines: DBJournalLine[];
  totalDebit: number;
  totalCredit: number;
  reversed?: boolean;
  reversedBy?: string;
  reversedAt?: string;
  reversalOf?: string;
  reversalReason?: string;
  hash?: string;
  previousHash?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface DBJournalLine {
  id: string;
  accountCode: string;
  accountName: string;
  thirdPartyCode?: string;
  thirdPartyName?: string;
  label: string;
  debit: number;
  credit: number;
  analyticalCode?: string;
  lettrageCode?: string;
}

export interface DBAccount {
  id: string;
  code: string;
  name: string;
  accountClass: string;
  accountType: string;
  parentCode?: string;
  level: number;
  normalBalance: 'debit' | 'credit';
  isReconcilable: boolean;
  isActive: boolean;
}

export interface DBThirdParty {
  id: string;
  code: string;
  name: string;
  type: 'customer' | 'supplier' | 'both';
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  balance: number;
  isActive: boolean;
}

export interface DBAsset {
  id: string;
  code: string;
  name: string;
  category: string;
  acquisitionDate: string;
  acquisitionValue: number;
  residualValue: number;
  depreciationMethod: 'linear' | 'declining';
  usefulLifeYears: number;
  accountCode: string;
  depreciationAccountCode: string;
  status: 'active' | 'disposed' | 'scrapped';
}

export interface DBFiscalYear {
  id: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  isClosed: boolean;
  isActive: boolean;
}

export interface DBAuditLog {
  id: string;
  timestamp: string;
  action: string;
  entityType: string;
  entityId: string;
  userId?: string;
  details: string;
  hash: string;
  previousHash: string;
}

export interface DBSetting {
  key: string;
  value: string;
  updatedAt: string;
}

export interface DBBudgetLine {
  id: string;
  accountCode: string;
  fiscalYear: string;
  period: string;
  budgeted: number;
  actual: number;
}

export interface DBClosureSession {
  id: string;
  type: 'MENSUELLE' | 'TRIMESTRIELLE' | 'SEMESTRIELLE' | 'ANNUELLE' | 'SPECIALE';
  periode: string;
  exercice: string;
  dateDebut: string;
  dateFin: string;
  dateCreation: string;
  statut: 'EN_COURS' | 'VALIDEE' | 'CLOTUREE' | 'ANNULEE';
  creePar: string;
  progression: number;
}

export interface DBProvision {
  id: string;
  sessionId: string;
  compteClient: string;
  client: string;
  solde: number;
  anciennete: number;
  tauxProvision: number;
  montantProvision: number;
  statut: 'PROPOSEE' | 'VALIDEE' | 'REJETEE';
  dateProposition: string;
  dateValidation?: string;
}

export interface DBExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  date: string;
  provider: string;
  createdAt: string;
}

export interface DBHedgingPosition {
  id: string;
  currency: string;
  type: 'forward' | 'option' | 'swap';
  amount: number;
  strikeRate: number;
  currentRate: number;
  maturityDate: string;
  unrealizedPnL: number;
  status: 'active' | 'expired' | 'exercised';
  createdAt: string;
}

export interface DBRevisionItem {
  id: string;
  sessionId: string;
  accountCode: string;
  accountName: string;
  isaAssertion: string;
  riskLevel: 'low' | 'medium' | 'high';
  testType: string;
  status: 'en_attente' | 'en_cours' | 'valide' | 'revise' | 'approuve';
  findings: string;
  conclusion: string;
  reviewer: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// DATABASE
// ============================================================================

class WiseBookDB extends Dexie {
  journalEntries!: Table<DBJournalEntry, string>;
  accounts!: Table<DBAccount, string>;
  thirdParties!: Table<DBThirdParty, string>;
  assets!: Table<DBAsset, string>;
  fiscalYears!: Table<DBFiscalYear, string>;
  budgetLines!: Table<DBBudgetLine, string>;
  auditLogs!: Table<DBAuditLog, string>;
  settings!: Table<DBSetting, string>;
  closureSessions!: Table<DBClosureSession, string>;
  provisions!: Table<DBProvision, string>;
  exchangeRates!: Table<DBExchangeRate, string>;
  hedgingPositions!: Table<DBHedgingPosition, string>;
  revisionItems!: Table<DBRevisionItem, string>;

  constructor() {
    super('WiseBookDB');
    this.version(1).stores({
      journalEntries: 'id, entryNumber, journal, date, status, [journal+date], reversalOf',
      accounts: 'id, code, accountClass, parentCode',
      thirdParties: 'id, code, type, name',
      assets: 'id, code, category, status',
      fiscalYears: 'id, startDate, endDate, isActive',
      budgetLines: 'id, accountCode, fiscalYear, period',
      auditLogs: 'id, timestamp, action, entityType, entityId',
      settings: 'key',
    });
    this.version(2).stores({
      journalEntries: 'id, entryNumber, journal, date, status, [journal+date], reversalOf',
      accounts: 'id, code, accountClass, parentCode',
      thirdParties: 'id, code, type, name',
      assets: 'id, code, category, status',
      fiscalYears: 'id, startDate, endDate, isActive',
      budgetLines: 'id, accountCode, fiscalYear, period',
      auditLogs: 'id, timestamp, action, entityType, entityId',
      settings: 'key',
      closureSessions: 'id, type, exercice, statut, dateDebut, dateFin',
      provisions: 'id, sessionId, compteClient, statut',
      exchangeRates: 'id, fromCurrency, toCurrency, date, [fromCurrency+toCurrency+date]',
      hedgingPositions: 'id, currency, type, status, maturityDate',
      revisionItems: 'id, sessionId, accountCode, status, isaAssertion',
    });
  }
}

export const db = new WiseBookDB();

// ============================================================================
// MIGRATION: localStorage → IndexedDB
// ============================================================================

const MIGRATION_KEY = 'wisebook_idb_migration_v1';

export async function migrateFromLocalStorage(): Promise<void> {
  if (localStorage.getItem(MIGRATION_KEY)) return;

  console.info('[WiseBook] Checking for localStorage data to migrate...');

  const keysToCheck = Object.keys(localStorage).filter(k =>
    k.startsWith('wisebook_') || k.startsWith('wb_') || k.startsWith('atlas_')
  );

  let migrated = 0;
  for (const key of keysToCheck) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const data = JSON.parse(raw);

      if (key.includes('entries') || key.includes('journal')) {
        if (Array.isArray(data)) {
          await db.journalEntries.bulkPut(data);
          migrated += data.length;
        }
      } else if (key.includes('accounts') || key.includes('plan_comptable')) {
        if (Array.isArray(data)) {
          await db.accounts.bulkPut(data);
          migrated += data.length;
        }
      } else if (key.includes('third_part') || key.includes('tiers')) {
        if (Array.isArray(data)) {
          await db.thirdParties.bulkPut(data);
          migrated += data.length;
        }
      }
    } catch {
      // Skip non-JSON or malformed keys
    }
  }

  localStorage.setItem(MIGRATION_KEY, new Date().toISOString());
  if (migrated > 0) {
    console.info(`[WiseBook] Migrated ${migrated} records to IndexedDB.`);
  }
}

// ============================================================================
// AUDIT LOG HELPER
// ============================================================================

export async function logAudit(
  action: string,
  entityType: string,
  entityId: string,
  details: string
): Promise<void> {
  const { hashAuditLog } = await import('../utils/integrity');

  const lastLog = await db.auditLogs.orderBy('timestamp').last();
  const previousHash = lastLog?.hash || '';
  const timestamp = new Date().toISOString();

  const hash = await hashAuditLog(action, entityType, entityId, details, timestamp, previousHash);

  await db.auditLogs.add({
    id: crypto.randomUUID(),
    timestamp,
    action,
    entityType,
    entityId,
    details,
    hash,
    previousHash,
  });
}
