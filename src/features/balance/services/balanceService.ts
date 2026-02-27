/**
 * Balance Service — Connected to Dexie IndexedDB.
 * Computes trial balance from real journal entries and chart of accounts.
 */
import type { DataAdapter } from '@atlas/data';
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
  async getBalance(adapter: DataAdapter, filters: BalanceFilters): Promise<BalanceAccount[]> {
    const entries = await adapter.getAll<any>('journalEntries');
    const accounts = await adapter.getAll<any>('accounts');

    // Build account metadata map from chart of accounts
    const accountMeta = new Map<string, { name: string; level: number; parentCode?: string }>();
    for (const a of accounts) {
      accountMeta.set(a.code, { name: a.name, level: a.level, parentCode: a.parentCode });
    }

    // P1-3: Compute opening balances from AN/RAN journal entries
    const openingBalances = new Map<string, { debit: number; credit: number }>();
    for (const entry of entries) {
      if (entry.journal !== 'AN' && entry.journal !== 'RAN') continue;
      if (entry.date < filters.period.from || entry.date > filters.period.to) continue;
      for (const line of entry.lines) {
        const existing = openingBalances.get(line.accountCode) || { debit: 0, credit: 0 };
        existing.debit += line.debit;
        existing.credit += line.credit;
        openingBalances.set(line.accountCode, existing);
      }
    }

    // Accumulate movements by account from journal entries
    const movements = new Map<string, { debit: number; credit: number; name: string }>();

    for (const entry of entries) {
      if (entry.date < filters.period.from || entry.date > filters.period.to) continue;

      // P1-4: Filtrage par nature (avant/après inventaire)
      if (filters.natureFilter === 'avant_inventaire') {
        if (entry.nature === 'inventaire' || entry.nature === 'cloture') continue;
      } else if (filters.natureFilter === 'apres_inventaire') {
        if (entry.nature === 'cloture') continue;
      }

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
    return this.buildHierarchy(movements, filters.displayLevel, openingBalances);
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

  async exportBalance(adapter: DataAdapter, format: 'xlsx' | 'pdf', filters: BalanceFilters): Promise<Blob> {
    const accounts = await this.getBalance(adapter, filters);

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
  async verifyEquilibrium(adapter: DataAdapter, filters: BalanceFilters): Promise<{
    isBalanced: boolean;
    totalDebit: number;
    totalCredit: number;
    ecart: number;
    details: string;
  }> {
    const accounts = await this.getBalance(adapter, filters);
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
    displayLevel: number,
    openingBalances: Map<string, { debit: number; credit: number }> = new Map(),
  ): BalanceAccount[] {
    // Group accounts by class (level 1)
    const classMap = new Map<string, BalanceAccount>();

    for (const [code, data] of movements) {
      const classCode = code.charAt(0);
      const soldeNet = data.debit - data.credit;

      // P1-3: Opening balances from AN/RAN journal entries
      const opening = openingBalances.get(code) || { debit: 0, credit: 0 };
      const openingNet = opening.debit - opening.credit;

      // Leaf account
      const leaf: BalanceAccount = {
        code,
        libelle: data.name || code,
        niveau: code.length <= 3 ? code.length : 3,
        parent: code.substring(0, code.length - 1),
        soldeDebiteurAN: openingNet > 0 ? openingNet : 0,
        soldeCrediteurAN: openingNet < 0 ? Math.abs(openingNet) : 0,
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
      classNode.soldeDebiteurAN += leaf.soldeDebiteurAN;
      classNode.soldeCrediteurAN += leaf.soldeCrediteurAN;
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

// ============================================================================
// P4-3 : Alertes soldes anormaux
// ============================================================================

export interface AbnormalBalanceAlert {
  accountCode: string;
  accountName: string;
  solde: number;
  type: 'client_crediteur' | 'fournisseur_debiteur' | 'caisse_negative';
  message: string;
}

/**
 * Détecte les soldes anormaux SYSCOHADA :
 * - Client (411x) avec solde créditeur → anomalie (trop-perçu ou avoir)
 * - Fournisseur (401x) avec solde débiteur → anomalie (avance ou erreur)
 * - Caisse (57x) avec solde négatif → interdit
 */
export async function detectAbnormalBalances(
  adapter: DataAdapter,
  filters: BalanceFilters,
): Promise<AbnormalBalanceAlert[]> {
  const accounts = await balanceService.getBalance(adapter, filters);
  const alerts: AbnormalBalanceAlert[] = [];

  const checkLeaves = (accs: BalanceAccount[]) => {
    for (const acc of accs) {
      if (acc.children && acc.children.length > 0) {
        checkLeaves(acc.children);
        continue;
      }

      const soldeNet = acc.soldeDebiteur - acc.soldeCrediteur;

      // Client (411x) avec solde créditeur
      if (acc.code.startsWith('411') && acc.soldeCrediteur > 0 && acc.soldeDebiteur === 0) {
        alerts.push({
          accountCode: acc.code,
          accountName: acc.libelle,
          solde: -acc.soldeCrediteur,
          type: 'client_crediteur',
          message: `Client ${acc.libelle} a un solde créditeur de ${acc.soldeCrediteur} — vérifier avoirs ou trop-perçus`,
        });
      }

      // Fournisseur (401x) avec solde débiteur
      if (acc.code.startsWith('401') && acc.soldeDebiteur > 0 && acc.soldeCrediteur === 0) {
        alerts.push({
          accountCode: acc.code,
          accountName: acc.libelle,
          solde: acc.soldeDebiteur,
          type: 'fournisseur_debiteur',
          message: `Fournisseur ${acc.libelle} a un solde débiteur de ${acc.soldeDebiteur} — vérifier avances ou erreurs`,
        });
      }

      // Caisse (57x) négative
      if (acc.code.startsWith('57') && soldeNet < 0) {
        alerts.push({
          accountCode: acc.code,
          accountName: acc.libelle,
          solde: soldeNet,
          type: 'caisse_negative',
          message: `Caisse ${acc.libelle} a un solde négatif de ${soldeNet} — INTERDIT`,
        });
      }
    }
  };

  checkLeaves(accounts);
  return alerts;
}

export const balanceService = new BalanceService();
