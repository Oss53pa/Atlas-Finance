/**
 * Plan Comptable (Chart of Accounts) Service — Connected to Dexie IndexedDB.
 * Manages SYSCOHADA chart of accounts with CRUD, validation, and hierarchy.
 */
import { logAudit } from '../../lib/db';
import type { DBAccount } from '../../lib/db';
import type { DataAdapter } from '@atlas/data';

// ============================================================================
// TYPES
// ============================================================================

export interface AccountEntry {
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

export interface AccountHierarchy {
  classCode: string;
  className: string;
  accounts: AccountEntry[];
  children: AccountHierarchyNode[];
  totalAccounts: number;
  activeAccounts: number;
}

export interface AccountHierarchyNode {
  code: string;
  name: string;
  level: number;
  children: AccountHierarchyNode[];
  account?: AccountEntry;
}

export interface PlanComptableStats {
  totalAccounts: number;
  activeAccounts: number;
  classBreakdown: { classCode: string; className: string; count: number }[];
  reconcilableAccounts: number;
}

// SYSCOHADA class definitions
const SYSCOHADA_CLASSES: Record<string, { name: string; normalBalance: 'debit' | 'credit'; type: string }> = {
  '1': { name: 'Capitaux propres et ressources assimilées', normalBalance: 'credit', type: 'bilan' },
  '2': { name: 'Immobilisations', normalBalance: 'debit', type: 'bilan' },
  '3': { name: 'Stocks', normalBalance: 'debit', type: 'bilan' },
  '4': { name: 'Tiers', normalBalance: 'debit', type: 'bilan' },
  '5': { name: 'Trésorerie', normalBalance: 'debit', type: 'bilan' },
  '6': { name: 'Charges', normalBalance: 'debit', type: 'gestion' },
  '7': { name: 'Produits', normalBalance: 'credit', type: 'gestion' },
  '8': { name: 'Comptes spéciaux', normalBalance: 'debit', type: 'special' },
  '9': { name: 'Comptes analytiques', normalBalance: 'debit', type: 'analytique' },
};

// ============================================================================
// SERVICE
// ============================================================================

class PlanComptableService {
  /**
   * Get all accounts, optionally filtered.
   */
  async getAccounts(adapter: DataAdapter, filters?: {
    accountClass?: string;
    isActive?: boolean;
    search?: string;
  }): Promise<AccountEntry[]> {
    let accounts: DBAccount[];

    if (filters?.accountClass) {
      accounts = await adapter.getAll('accounts', { where: { accountClass: filters.accountClass } });
    } else {
      accounts = await adapter.getAll('accounts');
    }

    if (filters?.isActive !== undefined) {
      accounts = accounts.filter(a => a.isActive === filters.isActive);
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      accounts = accounts.filter(a =>
        a.code.toLowerCase().includes(search) ||
        a.name.toLowerCase().includes(search)
      );
    }

    return accounts.sort((a, b) => a.code.localeCompare(b.code));
  }

  /**
   * Get a single account by code.
   */
  async getAccountByCode(adapter: DataAdapter, code: string): Promise<AccountEntry | null> {
    const accounts = await adapter.getAll('accounts', { where: { code } });
    return accounts[0] || null;
  }

  /**
   * Create a new account with SYSCOHADA validation.
   */
  async createAccount(adapter: DataAdapter, account: Omit<AccountEntry, 'id'>): Promise<AccountEntry> {
    // Validate code format
    this.validateAccountCode(account.code);

    // Check for duplicate
    const existing = await adapter.getAll('accounts', { where: { code: account.code } });
    if (existing[0]) throw new Error(`Le compte ${account.code} existe déjà`);

    const classCode = account.code.charAt(0);
    const classDef = SYSCOHADA_CLASSES[classCode];
    if (!classDef) throw new Error(`Classe de compte invalide: ${classCode}`);

    const id = crypto.randomUUID();
    const record: DBAccount = {
      id,
      code: account.code,
      name: account.name,
      accountClass: classCode,
      accountType: account.accountType || classDef.type,
      parentCode: account.parentCode || this.deriveParentCode(account.code),
      level: account.code.length <= 1 ? 1 : account.code.length <= 2 ? 2 : account.code.length <= 3 ? 3 : 4,
      normalBalance: account.normalBalance || classDef.normalBalance,
      isReconcilable: account.isReconcilable ?? (classCode === '4' || classCode === '5'),
      isActive: account.isActive ?? true,
    };

    await adapter.create('accounts', record);

    await logAudit(
      'ACCOUNT_CREATE',
      'account',
      id,
      `Création compte ${account.code} — ${account.name}`
    );

    return { ...record };
  }

  /**
   * Update an existing account.
   */
  async updateAccount(adapter: DataAdapter, id: string, updates: Partial<Pick<AccountEntry, 'name' | 'isActive' | 'isReconcilable' | 'accountType'>>): Promise<AccountEntry> {
    const account = await adapter.getById('accounts', id);
    if (!account) throw new Error(`Compte ${id} introuvable`);

    await adapter.update('accounts', id, updates);

    await logAudit(
      'ACCOUNT_UPDATE',
      'account',
      id,
      `Modification compte ${account.code}: ${JSON.stringify(updates)}`
    );

    return { ...account, ...updates };
  }

  /**
   * Deactivate an account (soft delete). Checks for existing entries first.
   */
  async deactivateAccount(adapter: DataAdapter, id: string): Promise<void> {
    const account = await adapter.getById('accounts', id);
    if (!account) throw new Error(`Compte ${id} introuvable`);

    // Check if account has journal entries
    const entries = await adapter.getAll('journalEntries');
    const hasEntries = entries.some(e => e.lines.some(l => l.accountCode === account.code));
    if (hasEntries) {
      throw new Error(`Le compte ${account.code} a des écritures. Désactivation uniquement (pas de suppression).`);
    }

    await adapter.update('accounts', id, { isActive: false });

    await logAudit(
      'ACCOUNT_DEACTIVATE',
      'account',
      id,
      `Désactivation compte ${account.code}`
    );
  }

  /**
   * Get hierarchical view of accounts grouped by SYSCOHADA class.
   */
  async getHierarchy(adapter: DataAdapter): Promise<AccountHierarchy[]> {
    const accounts = await adapter.getAll('accounts');
    const hierarchy: AccountHierarchy[] = [];

    for (const [classCode, classDef] of Object.entries(SYSCOHADA_CLASSES)) {
      const classAccounts = accounts
        .filter(a => a.accountClass === classCode)
        .sort((a, b) => a.code.localeCompare(b.code));

      if (classAccounts.length === 0) continue;

      const children = this.buildTree(classAccounts);

      hierarchy.push({
        classCode,
        className: classDef.name,
        accounts: classAccounts,
        children,
        totalAccounts: classAccounts.length,
        activeAccounts: classAccounts.filter(a => a.isActive).length,
      });
    }

    return hierarchy;
  }

  /**
   * Build a tree from flat account list.
   */
  private buildTree(accounts: DBAccount[]): AccountHierarchyNode[] {
    const nodes: AccountHierarchyNode[] = [];
    const nodeMap = new Map<string, AccountHierarchyNode>();

    for (const account of accounts) {
      const node: AccountHierarchyNode = {
        code: account.code,
        name: account.name,
        level: account.level,
        children: [],
        account: { ...account },
      };
      nodeMap.set(account.code, node);
    }

    for (const account of accounts) {
      const node = nodeMap.get(account.code)!;
      const parentCode = account.parentCode;
      if (parentCode && nodeMap.has(parentCode)) {
        nodeMap.get(parentCode)!.children.push(node);
      } else {
        nodes.push(node);
      }
    }

    return nodes;
  }

  /**
   * Get plan comptable statistics.
   */
  async getStats(adapter: DataAdapter): Promise<PlanComptableStats> {
    const accounts = await adapter.getAll('accounts');
    const active = accounts.filter(a => a.isActive);
    const reconcilable = accounts.filter(a => a.isReconcilable);

    const classBreakdown: PlanComptableStats['classBreakdown'] = [];
    for (const [code, def] of Object.entries(SYSCOHADA_CLASSES)) {
      const count = accounts.filter(a => a.accountClass === code).length;
      if (count > 0) {
        classBreakdown.push({ classCode: code, className: def.name, count });
      }
    }

    return {
      totalAccounts: accounts.length,
      activeAccounts: active.length,
      classBreakdown,
      reconcilableAccounts: reconcilable.length,
    };
  }

  /**
   * Seed the default SYSCOHADA plan comptable (common accounts).
   */
  async seedDefaultPlan(adapter: DataAdapter): Promise<number> {
    const existing = await adapter.count('accounts');
    if (existing > 0) return 0; // Already seeded

    const defaults: Omit<AccountEntry, 'id'>[] = [
      // Class 1 — Capitaux
      { code: '101000', name: 'Capital social', accountClass: '1', accountType: 'bilan', level: 4, normalBalance: 'credit', isReconcilable: false, isActive: true },
      { code: '106000', name: 'Réserves', accountClass: '1', accountType: 'bilan', level: 4, normalBalance: 'credit', isReconcilable: false, isActive: true },
      { code: '110000', name: 'Report à nouveau créditeur', accountClass: '1', accountType: 'bilan', level: 4, normalBalance: 'credit', isReconcilable: false, isActive: true },
      { code: '120000', name: 'Résultat de l\'exercice (bénéfice)', accountClass: '1', accountType: 'bilan', level: 4, normalBalance: 'credit', isReconcilable: false, isActive: true },
      { code: '129000', name: 'Résultat de l\'exercice (perte)', accountClass: '1', accountType: 'bilan', level: 4, normalBalance: 'debit', isReconcilable: false, isActive: true },
      { code: '162000', name: 'Emprunts et dettes', accountClass: '1', accountType: 'bilan', level: 4, normalBalance: 'credit', isReconcilable: true, isActive: true },
      // Class 2 — Immobilisations
      { code: '211000', name: 'Frais d\'établissement', accountClass: '2', accountType: 'bilan', level: 4, normalBalance: 'debit', isReconcilable: false, isActive: true },
      { code: '213000', name: 'Logiciels', accountClass: '2', accountType: 'bilan', level: 4, normalBalance: 'debit', isReconcilable: false, isActive: true },
      { code: '241000', name: 'Matériel et outillage', accountClass: '2', accountType: 'bilan', level: 4, normalBalance: 'debit', isReconcilable: false, isActive: true },
      { code: '244000', name: 'Matériel et mobilier de bureau', accountClass: '2', accountType: 'bilan', level: 4, normalBalance: 'debit', isReconcilable: false, isActive: true },
      { code: '245000', name: 'Matériel informatique', accountClass: '2', accountType: 'bilan', level: 4, normalBalance: 'debit', isReconcilable: false, isActive: true },
      { code: '281000', name: 'Amortissement frais d\'établissement', accountClass: '2', accountType: 'bilan', level: 4, normalBalance: 'credit', isReconcilable: false, isActive: true },
      { code: '284000', name: 'Amortissement matériel', accountClass: '2', accountType: 'bilan', level: 4, normalBalance: 'credit', isReconcilable: false, isActive: true },
      // Class 3 — Stocks
      { code: '311000', name: 'Marchandises', accountClass: '3', accountType: 'bilan', level: 4, normalBalance: 'debit', isReconcilable: false, isActive: true },
      { code: '321000', name: 'Matières premières', accountClass: '3', accountType: 'bilan', level: 4, normalBalance: 'debit', isReconcilable: false, isActive: true },
      { code: '391000', name: 'Dépréciation des stocks', accountClass: '3', accountType: 'bilan', level: 4, normalBalance: 'credit', isReconcilable: false, isActive: true },
      // Class 4 — Tiers
      { code: '401000', name: 'Fournisseurs', accountClass: '4', accountType: 'bilan', level: 4, normalBalance: 'credit', isReconcilable: true, isActive: true },
      { code: '411000', name: 'Clients', accountClass: '4', accountType: 'bilan', level: 4, normalBalance: 'debit', isReconcilable: true, isActive: true },
      { code: '421000', name: 'Personnel — Rémunérations dues', accountClass: '4', accountType: 'bilan', level: 4, normalBalance: 'credit', isReconcilable: true, isActive: true },
      { code: '431000', name: 'Sécurité sociale', accountClass: '4', accountType: 'bilan', level: 4, normalBalance: 'credit', isReconcilable: true, isActive: true },
      { code: '441000', name: 'État, impôts sur les bénéfices', accountClass: '4', accountType: 'bilan', level: 4, normalBalance: 'credit', isReconcilable: true, isActive: true },
      { code: '443100', name: 'TVA collectée', accountClass: '4', accountType: 'bilan', level: 4, normalBalance: 'credit', isReconcilable: true, isActive: true },
      { code: '445200', name: 'TVA récupérable', accountClass: '4', accountType: 'bilan', level: 4, normalBalance: 'debit', isReconcilable: true, isActive: true },
      { code: '471000', name: 'Comptes d\'attente', accountClass: '4', accountType: 'bilan', level: 4, normalBalance: 'debit', isReconcilable: true, isActive: true },
      { code: '491000', name: 'Provisions pour créances douteuses', accountClass: '4', accountType: 'bilan', level: 4, normalBalance: 'credit', isReconcilable: false, isActive: true },
      // Class 5 — Trésorerie
      { code: '521000', name: 'Banque', accountClass: '5', accountType: 'bilan', level: 4, normalBalance: 'debit', isReconcilable: true, isActive: true },
      { code: '531000', name: 'Caisse', accountClass: '5', accountType: 'bilan', level: 4, normalBalance: 'debit', isReconcilable: true, isActive: true },
      { code: '571000', name: 'Caisse principale', accountClass: '5', accountType: 'bilan', level: 4, normalBalance: 'debit', isReconcilable: true, isActive: true },
      // Class 6 — Charges
      { code: '601000', name: 'Achats de marchandises', accountClass: '6', accountType: 'gestion', level: 4, normalBalance: 'debit', isReconcilable: false, isActive: true },
      { code: '602000', name: 'Achats de matières premières', accountClass: '6', accountType: 'gestion', level: 4, normalBalance: 'debit', isReconcilable: false, isActive: true },
      { code: '604000', name: 'Achats de fournitures', accountClass: '6', accountType: 'gestion', level: 4, normalBalance: 'debit', isReconcilable: false, isActive: true },
      { code: '613000', name: 'Loyers et charges locatives', accountClass: '6', accountType: 'gestion', level: 4, normalBalance: 'debit', isReconcilable: false, isActive: true },
      { code: '641000', name: 'Charges de personnel', accountClass: '6', accountType: 'gestion', level: 4, normalBalance: 'debit', isReconcilable: false, isActive: true },
      { code: '661000', name: 'Charges d\'intérêts', accountClass: '6', accountType: 'gestion', level: 4, normalBalance: 'debit', isReconcilable: false, isActive: true },
      { code: '681000', name: 'Dotations aux amortissements', accountClass: '6', accountType: 'gestion', level: 4, normalBalance: 'debit', isReconcilable: false, isActive: true },
      { code: '691000', name: 'Dotations aux provisions', accountClass: '6', accountType: 'gestion', level: 4, normalBalance: 'debit', isReconcilable: false, isActive: true },
      // Class 7 — Produits
      { code: '701000', name: 'Ventes de marchandises', accountClass: '7', accountType: 'gestion', level: 4, normalBalance: 'credit', isReconcilable: false, isActive: true },
      { code: '706000', name: 'Services vendus', accountClass: '7', accountType: 'gestion', level: 4, normalBalance: 'credit', isReconcilable: false, isActive: true },
      { code: '707000', name: 'Ventes de produits finis', accountClass: '7', accountType: 'gestion', level: 4, normalBalance: 'credit', isReconcilable: false, isActive: true },
      { code: '771000', name: 'Produits financiers', accountClass: '7', accountType: 'gestion', level: 4, normalBalance: 'credit', isReconcilable: false, isActive: true },
      { code: '781000', name: 'Reprises sur amortissements', accountClass: '7', accountType: 'gestion', level: 4, normalBalance: 'credit', isReconcilable: false, isActive: true },
      { code: '791000', name: 'Reprises sur provisions', accountClass: '7', accountType: 'gestion', level: 4, normalBalance: 'credit', isReconcilable: false, isActive: true },
    ];

    let count = 0;
    for (const acct of defaults) {
      await this.createAccount(adapter, acct);
      count++;
    }

    return count;
  }

  /**
   * Validate SYSCOHADA account code format.
   */
  private validateAccountCode(code: string): void {
    if (!code || code.length < 2) {
      throw new Error('Le code compte doit avoir au moins 2 caractères');
    }
    if (!/^\d+$/.test(code)) {
      throw new Error('Le code compte ne doit contenir que des chiffres');
    }
    const classCode = code.charAt(0);
    if (!SYSCOHADA_CLASSES[classCode]) {
      throw new Error(`Classe de compte invalide: ${classCode}. Classes valides: 1-9`);
    }
  }

  /**
   * Derive parent code from account code.
   */
  private deriveParentCode(code: string): string | undefined {
    if (code.length <= 1) return undefined;
    // Remove trailing zeros to find parent
    let parent = code.slice(0, -1);
    while (parent.length > 1 && parent.endsWith('0')) {
      parent = parent.slice(0, -1);
    }
    return parent.length >= 1 ? parent : undefined;
  }

  /**
   * Export plan comptable as CSV.
   */
  async exportPlanComptable(adapter: DataAdapter): Promise<Blob> {
    const accounts = await adapter.getAll('accounts');
    const header = 'Code;Libellé;Classe;Type;Solde normal;Lettrable;Actif';
    const rows = accounts
      .sort((a, b) => a.code.localeCompare(b.code))
      .map(a =>
        `${a.code};${a.name};${a.accountClass};${a.accountType};${a.normalBalance};${a.isReconcilable ? 'Oui' : 'Non'};${a.isActive ? 'Oui' : 'Non'}`
      );

    const content = [header, ...rows].join('\n');
    return new Blob([content], { type: 'text/csv;charset=utf-8' });
  }

  /**
   * Get SYSCOHADA class definitions.
   */
  getClassDefinitions(): Record<string, { name: string; normalBalance: 'debit' | 'credit'; type: string }> {
    return { ...SYSCOHADA_CLASSES };
  }
}

export const planComptableService = new PlanComptableService();
