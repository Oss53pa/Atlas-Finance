/**
 * Balance Service — Connected to Dexie IndexedDB.
 * Computes trial balance from real journal entries and chart of accounts.
 */
import { db } from '../../../lib/db';
import { BalanceAccount, BalanceFilters, BalanceTotals } from '../types/balance.types';
import { formatCurrency } from '@/utils/formatters';

// SYSCOHADA account class hierarchy
const SYSCOHADA_CLASSES: Record<string, string> = {
  '1': 'COMPTES DE RESSOURCES DURABLES',
  '2': "COMPTES D'ACTIF IMMOBILISE",
  '3': 'COMPTES DE STOCKS',
  '4': 'COMPTES DE TIERS',
  '5': 'COMPTES DE TRESORERIE',
  '6': 'COMPTES DE CHARGES',
  '7': 'COMPTES DE PRODUITS',
  '8': 'COMPTES DES AUTRES CHARGES',
  '9': 'COMPTES DE COMPTABILITE ANALYTIQUE',
};

class BalanceService {
  async getBalance(filters: BalanceFilters): Promise<BalanceAccount[]> {
    const entries = await db.journalEntries.toArray();
    const accounts = await db.accounts.toArray();

    // Build account metadata map from chart of accounts
    const accountMeta = new Map<string, { name: string; level: number; parentCode?: string }>();
    for (const a of accounts) {
      accountMeta.set(a.code, { name: a.name, level: a.level, parentCode: a.parentCode });
    }

    // Accumulate movements by account from journal entries
    const movements = new Map<string, { debit: number; credit: number; name: string }>();

    for (const entry of entries) {
      if (entry.date < filters.period.from || entry.date > filters.period.to) continue;

      for (const line of entry.lines) {
        // Filter by search
        if (filters.searchAccount) {
          const q = filters.searchAccount.toLowerCase();
          if (!line.accountCode.includes(q) && !line.accountName.toLowerCase().includes(q)) continue;
        }

        const existing = movements.get(line.accountCode) || { debit: 0, credit: 0, name: line.accountName };
        existing.debit += line.debit;
        existing.credit += line.credit;
        if (!existing.name && line.accountName) existing.name = line.accountName;
        movements.set(line.accountCode, existing);
      }
    }

    // Also check chart of accounts for names
    for (const [code, data] of movements) {
      if (!data.name) {
        const meta = accountMeta.get(code);
        if (meta) data.name = meta.name;
      }
    }

    // Skip zero balances if filter says so
    if (!filters.showZeroBalance) {
      for (const [code, data] of movements) {
        if (data.debit === 0 && data.credit === 0) {
          movements.delete(code);
        }
      }
    }

    // Build hierarchical balance based on displayLevel
    return this.buildHierarchy(movements, filters.displayLevel);
  }

  calculateTotals(accounts: BalanceAccount[]): BalanceTotals {
    const totals: BalanceTotals = {
      soldeDebiteurAN: 0,
      soldeCrediteurAN: 0,
      mouvementsDebit: 0,
      mouvementsCredit: 0,
      soldeDebiteur: 0,
      soldeCrediteur: 0,
    };

    const addAccountTotals = (account: BalanceAccount) => {
      if (!account.children || account.children.length === 0) {
        totals.soldeDebiteurAN += account.soldeDebiteurAN;
        totals.soldeCrediteurAN += account.soldeCrediteurAN;
        totals.mouvementsDebit += account.mouvementsDebit;
        totals.mouvementsCredit += account.mouvementsCredit;
        totals.soldeDebiteur += account.soldeDebiteur;
        totals.soldeCrediteur += account.soldeCrediteur;
      } else {
        account.children.forEach(addAccountTotals);
      }
    };

    accounts.forEach(addAccountTotals);
    return totals;
  }

  async exportBalance(format: 'xlsx' | 'pdf', filters: BalanceFilters): Promise<Blob> {
    const accounts = await this.getBalance(filters);

    if (format === 'xlsx') {
      // CSV export as fallback
      const rows = ['Compte;Libelle;Debit AN;Credit AN;Mvt Debit;Mvt Credit;Solde Debit;Solde Credit'];
      const flatten = (accs: BalanceAccount[]) => {
        for (const a of accs) {
          rows.push([
            a.code, a.libelle,
            a.soldeDebiteurAN, a.soldeCrediteurAN,
            a.mouvementsDebit, a.mouvementsCredit,
            a.soldeDebiteur, a.soldeCrediteur,
          ].join(';'));
          if (a.children) flatten(a.children);
        }
      };
      flatten(accounts);
      return new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    }

    return new Blob(['Export balance'], { type: 'application/octet-stream' });
  }

  /**
   * Vérifie l'équilibre de la balance générale.
   * Total Débits DOIT = Total Crédits (obligation SYSCOHADA).
   * Utilise Money class pour éviter les erreurs d'arrondi JS.
   */
  async verifyEquilibrium(filters: BalanceFilters): Promise<{
    isBalanced: boolean;
    totalDebit: number;
    totalCredit: number;
    ecart: number;
    details: string;
  }> {
    const accounts = await this.getBalance(filters);
    const totals = this.calculateTotals(accounts);

    // Use Money class for precise comparison
    const { money, Money } = await import('../../../utils/money');
    const totalD = money(totals.mouvementsDebit);
    const totalC = money(totals.mouvementsCredit);
    const ecart = totalD.subtract(totalC);
    const isBalanced = ecart.isZero();

    return {
      isBalanced,
      totalDebit: totals.mouvementsDebit,
      totalCredit: totals.mouvementsCredit,
      ecart: ecart.toNumber(),
      details: isBalanced
        ? `Balance équilibrée : D = C = ${formatCurrency(totalD.toNumber())}`
        : `ALERTE : Écart de ${formatCurrency(ecart.toNumber())} (D = ${formatCurrency(totalD.toNumber())}, C = ${formatCurrency(totalC.toNumber())})`,
    };
  }

  // ---- Private ----

  private buildHierarchy(
    movements: Map<string, { debit: number; credit: number; name: string }>,
    displayLevel: number
  ): BalanceAccount[] {
    // Group accounts by class (level 1)
    const classMap = new Map<string, BalanceAccount>();

    for (const [code, data] of movements) {
      const classCode = code.charAt(0);
      const soldeNet = data.debit - data.credit;

      // Leaf account
      const leaf: BalanceAccount = {
        code,
        libelle: data.name || code,
        niveau: code.length <= 3 ? code.length : 3,
        parent: code.substring(0, code.length - 1),
        soldeDebiteurAN: 0,
        soldeCrediteurAN: 0,
        mouvementsDebit: data.debit,
        mouvementsCredit: data.credit,
        soldeDebiteur: soldeNet > 0 ? soldeNet : 0,
        soldeCrediteur: soldeNet < 0 ? Math.abs(soldeNet) : 0,
        isExpanded: false,
      };

      // Ensure class-level node exists
      if (!classMap.has(classCode)) {
        classMap.set(classCode, {
          code: classCode,
          libelle: SYSCOHADA_CLASSES[classCode] || `Classe ${classCode}`,
          niveau: 1,
          soldeDebiteurAN: 0,
          soldeCrediteurAN: 0,
          mouvementsDebit: 0,
          mouvementsCredit: 0,
          soldeDebiteur: 0,
          soldeCrediteur: 0,
          isExpanded: true,
          children: [],
        });
      }

      const classNode = classMap.get(classCode)!;
      classNode.mouvementsDebit += data.debit;
      classNode.mouvementsCredit += data.credit;

      const classSolde = classNode.mouvementsDebit - classNode.mouvementsCredit;
      classNode.soldeDebiteur = classSolde > 0 ? classSolde : 0;
      classNode.soldeCrediteur = classSolde < 0 ? Math.abs(classSolde) : 0;

      if (displayLevel >= 2) {
        classNode.children = classNode.children || [];
        classNode.children.push(leaf);
      }
    }

    return Array.from(classMap.values()).sort((a, b) => a.code.localeCompare(b.code));
  }
}

export const balanceService = new BalanceService();
