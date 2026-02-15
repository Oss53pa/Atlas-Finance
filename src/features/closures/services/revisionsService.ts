/**
 * ISA Revisions Service — Connected to Dexie IndexedDB.
 * Implements ISA 315/320/500 audit revision workflow.
 * Manages lead schedules, audit assertions, and revision items.
 */
import { db, logAudit } from '../../../lib/db';
import type { DBRevisionItem } from '../../../lib/db';

// ============================================================================
// TYPES
// ============================================================================

export type ISAAssertion =
  | 'existence'
  | 'exhaustivite'
  | 'droits_obligations'
  | 'valorisation'
  | 'mesure'
  | 'presentation'
  | 'exactitude'
  | 'separation_exercices';

export type RiskLevel = 'low' | 'medium' | 'high';

export type RevisionStatus = 'en_attente' | 'en_cours' | 'valide' | 'revise' | 'approuve';

export type TestType =
  | 'substantif'
  | 'analytique'
  | 'controle'
  | 'circularisation'
  | 'inspection'
  | 'observation'
  | 'confirmation'
  | 'recalcul';

export interface RevisionItem {
  id: string;
  sessionId: string;
  accountCode: string;
  accountName: string;
  isaAssertion: ISAAssertion;
  riskLevel: RiskLevel;
  testType: TestType;
  status: RevisionStatus;
  findings: string;
  conclusion: string;
  reviewer: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadSchedule {
  accountClass: string;
  className: string;
  items: RevisionItem[];
  completionRate: number;
  riskSummary: { low: number; medium: number; high: number };
}

export interface RevisionStats {
  totalItems: number;
  completed: number;
  inProgress: number;
  pending: number;
  highRiskItems: number;
  completionRate: number;
}

export interface AuditFinding {
  itemId: string;
  accountCode: string;
  assertion: ISAAssertion;
  severity: RiskLevel;
  finding: string;
  recommendation: string;
}

// SYSCOHADA account classes for lead schedules
const SYSCOHADA_CLASSES: Record<string, string> = {
  '1': 'Capitaux propres et ressources assimilées',
  '2': 'Immobilisations',
  '3': 'Stocks',
  '4': 'Tiers',
  '5': 'Trésorerie',
  '6': 'Charges',
  '7': 'Produits',
};

// ISA assertion labels
const ASSERTION_LABELS: Record<ISAAssertion, string> = {
  existence: 'Existence (ISA 315)',
  exhaustivite: 'Exhaustivité (ISA 315)',
  droits_obligations: 'Droits et obligations (ISA 315)',
  valorisation: 'Valorisation (ISA 315)',
  mesure: 'Mesure et imputation (ISA 320)',
  presentation: 'Présentation et informations (ISA 320)',
  exactitude: 'Exactitude (ISA 500)',
  separation_exercices: 'Séparation des exercices (ISA 500)',
};

// ============================================================================
// SERVICE
// ============================================================================

class RevisionsService {
  /**
   * Get all revision items for a session.
   */
  async getRevisionItems(sessionId: string): Promise<RevisionItem[]> {
    return db.revisionItems
      .where('sessionId')
      .equals(sessionId)
      .toArray();
  }

  /**
   * Create a revision item.
   */
  async createRevisionItem(item: Omit<RevisionItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<RevisionItem> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const record: DBRevisionItem = {
      id,
      sessionId: item.sessionId,
      accountCode: item.accountCode,
      accountName: item.accountName,
      isaAssertion: item.isaAssertion,
      riskLevel: item.riskLevel,
      testType: item.testType,
      status: item.status || 'en_attente',
      findings: item.findings || '',
      conclusion: item.conclusion || '',
      reviewer: item.reviewer || '',
      createdAt: now,
      updatedAt: now,
    };

    await db.revisionItems.add(record);

    await logAudit(
      'REVISION_ITEM_CREATE',
      'revisionItem',
      id,
      `Révision ${item.accountCode} — ${item.isaAssertion} (${item.riskLevel})`
    );

    return { ...record };
  }

  /**
   * Update a revision item status, findings, or conclusion.
   */
  async updateRevisionItem(
    id: string,
    updates: Partial<Pick<RevisionItem, 'status' | 'findings' | 'conclusion' | 'reviewer' | 'riskLevel'>>
  ): Promise<RevisionItem> {
    const item = await db.revisionItems.get(id);
    if (!item) throw new Error(`Revision item ${id} introuvable`);

    const updatedFields = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await db.revisionItems.update(id, updatedFields);

    if (updates.status) {
      await logAudit(
        'REVISION_ITEM_STATUS',
        'revisionItem',
        id,
        `${item.accountCode}: ${item.status} → ${updates.status}`
      );
    }

    return { ...item, ...updatedFields };
  }

  /**
   * Delete a revision item.
   */
  async deleteRevisionItem(id: string): Promise<void> {
    await db.revisionItems.delete(id);
  }

  /**
   * Generate lead schedules grouped by SYSCOHADA account class.
   */
  async getLeadSchedules(sessionId: string): Promise<LeadSchedule[]> {
    const items = await this.getRevisionItems(sessionId);
    const schedules: LeadSchedule[] = [];

    for (const [classCode, className] of Object.entries(SYSCOHADA_CLASSES)) {
      const classItems = items.filter(i => i.accountCode.startsWith(classCode));
      if (classItems.length === 0) continue;

      const completed = classItems.filter(i => i.status === 'valide' || i.status === 'approuve').length;
      const riskSummary = {
        low: classItems.filter(i => i.riskLevel === 'low').length,
        medium: classItems.filter(i => i.riskLevel === 'medium').length,
        high: classItems.filter(i => i.riskLevel === 'high').length,
      };

      schedules.push({
        accountClass: classCode,
        className,
        items: classItems,
        completionRate: classItems.length > 0 ? (completed / classItems.length) * 100 : 0,
        riskSummary,
      });
    }

    return schedules;
  }

  /**
   * Auto-generate revision items for all accounts with balances in a period.
   * Creates one item per account per key assertion.
   */
  async autoGenerateRevisionItems(
    sessionId: string,
    dateDebut: string,
    dateFin: string,
    reviewer: string
  ): Promise<number> {
    // Get accounts with movements in the period
    const entries = await db.journalEntries
      .where('date')
      .between(dateDebut, dateFin, true, true)
      .filter(e => e.status === 'validated' || e.status === 'posted')
      .toArray();

    const accountMap = new Map<string, string>();
    for (const entry of entries) {
      for (const line of entry.lines) {
        if (!accountMap.has(line.accountCode)) {
          accountMap.set(line.accountCode, line.accountName);
        }
      }
    }

    // Check existing items to avoid duplicates
    const existing = await this.getRevisionItems(sessionId);
    const existingKeys = new Set(existing.map(e => `${e.accountCode}-${e.isaAssertion}`));

    // Key assertions per class type
    const classAssertions: Record<string, ISAAssertion[]> = {
      '1': ['existence', 'droits_obligations', 'valorisation', 'presentation'],
      '2': ['existence', 'valorisation', 'droits_obligations', 'exhaustivite'],
      '3': ['existence', 'valorisation', 'exhaustivite'],
      '4': ['existence', 'exhaustivite', 'valorisation', 'separation_exercices'],
      '5': ['existence', 'exhaustivite', 'exactitude'],
      '6': ['exhaustivite', 'separation_exercices', 'mesure', 'exactitude'],
      '7': ['existence', 'exhaustivite', 'separation_exercices', 'exactitude'],
    };

    let created = 0;
    for (const [accountCode, accountName] of accountMap) {
      const classCode = accountCode.charAt(0);
      const assertions = classAssertions[classCode] || ['existence', 'exactitude'];

      for (const assertion of assertions) {
        const key = `${accountCode}-${assertion}`;
        if (existingKeys.has(key)) continue;

        await this.createRevisionItem({
          sessionId,
          accountCode,
          accountName,
          isaAssertion: assertion,
          riskLevel: this.assessInitialRisk(accountCode),
          testType: this.suggestTestType(assertion),
          status: 'en_attente',
          findings: '',
          conclusion: '',
          reviewer,
        });
        created++;
      }
    }

    return created;
  }

  /**
   * Assess initial risk based on account class (heuristic).
   */
  private assessInitialRisk(accountCode: string): RiskLevel {
    const classCode = accountCode.charAt(0);
    // Class 4 (third parties) and 5 (treasury) are higher risk
    if (classCode === '4' || classCode === '5') return 'high';
    // Class 2 (fixed assets) and 3 (stocks) are medium
    if (classCode === '2' || classCode === '3') return 'medium';
    return 'low';
  }

  /**
   * Suggest test type based on assertion.
   */
  private suggestTestType(assertion: ISAAssertion): TestType {
    const map: Record<ISAAssertion, TestType> = {
      existence: 'inspection',
      exhaustivite: 'substantif',
      droits_obligations: 'inspection',
      valorisation: 'recalcul',
      mesure: 'analytique',
      presentation: 'controle',
      exactitude: 'recalcul',
      separation_exercices: 'substantif',
    };
    return map[assertion];
  }

  /**
   * Get revision statistics.
   */
  async getStats(sessionId: string): Promise<RevisionStats> {
    const items = await this.getRevisionItems(sessionId);

    const completed = items.filter(i => i.status === 'valide' || i.status === 'approuve').length;
    const inProgress = items.filter(i => i.status === 'en_cours' || i.status === 'revise').length;
    const pending = items.filter(i => i.status === 'en_attente').length;
    const highRisk = items.filter(i => i.riskLevel === 'high').length;

    return {
      totalItems: items.length,
      completed,
      inProgress,
      pending,
      highRiskItems: highRisk,
      completionRate: items.length > 0 ? (completed / items.length) * 100 : 0,
    };
  }

  /**
   * Extract findings (issues found during revision).
   */
  async getFindings(sessionId: string): Promise<AuditFinding[]> {
    const items = await this.getRevisionItems(sessionId);
    return items
      .filter(i => i.findings.trim().length > 0)
      .map(i => ({
        itemId: i.id,
        accountCode: i.accountCode,
        assertion: i.isaAssertion as ISAAssertion,
        severity: i.riskLevel,
        finding: i.findings,
        recommendation: i.conclusion,
      }));
  }

  /**
   * Get assertion labels (for UI display).
   */
  getAssertionLabels(): Record<string, string> {
    return { ...ASSERTION_LABELS };
  }

  /**
   * Export revision report as CSV.
   */
  async exportReport(sessionId: string): Promise<Blob> {
    const items = await this.getRevisionItems(sessionId);
    const header = 'Compte;Libelle;Assertion ISA;Risque;Type Test;Statut;Constatations;Conclusion;Reviseur';
    const rows = items
      .sort((a, b) => a.accountCode.localeCompare(b.accountCode))
      .map(i =>
        `${i.accountCode};${i.accountName};${i.isaAssertion};${i.riskLevel};${i.testType};${i.status};${i.findings};${i.conclusion};${i.reviewer}`
      );

    const content = [header, ...rows].join('\n');
    return new Blob([content], { type: 'text/csv;charset=utf-8' });
  }
}

export const revisionsService = new RevisionsService();
