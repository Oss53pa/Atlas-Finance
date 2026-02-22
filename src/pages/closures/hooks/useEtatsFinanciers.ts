/**
 * Hook: useEtatsFinanciers
 * Computes SYSCOHADA financial statement data from Dexie entries.
 * Provides account balances for bilan actif, bilan passif, and compte de résultat.
 */
import { useState, useEffect, useCallback } from 'react';
import { useData } from '../../../contexts/DataContext';
import type { DBFiscalYear } from '../../../lib/db';
import { money } from '../../../utils/money';

// ============================================================================
// TYPES
// ============================================================================

export interface AccountBalance {
  accountCode: string;
  accountName: string;
  totalDebit: number;
  totalCredit: number;
  solde: number; // net balance (debit positive)
}

export interface EtatsFinanciersData {
  loading: boolean;
  error: string | null;
  fiscalYear: DBFiscalYear | null;
  balances: Map<string, AccountBalance>;
  totalEntries: number;

  // Helpers
  getSolde: (prefixes: string[]) => number;
  getSoldeDebiteur: (prefixes: string[]) => number;
  getSoldeCrediteur: (prefixes: string[]) => number;

  // Summary
  totalActif: number;
  totalPassif: number;
  resultatNet: number;
  isBalanced: boolean;

  refresh: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useEtatsFinanciers(): EtatsFinanciersData {
  const { adapter } = useData();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fiscalYear, setFiscalYear] = useState<DBFiscalYear | null>(null);
  const [balances, setBalances] = useState<Map<string, AccountBalance>>(new Map());
  const [totalEntries, setTotalEntries] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get active fiscal year
      const fys = await adapter.getAll<any>('fiscalYears');
      const activeFY = fys.find((fy: any) => fy.isActive) || fys[0];
      if (!activeFY) {
        setError('Aucun exercice fiscal trouvé');
        setLoading(false);
        return;
      }
      setFiscalYear(activeFY);

      // Load entries for FY period
      const allEntries = await adapter.getAll<any>('journalEntries');
      const entries = allEntries.filter((e: any) =>
        e.date >= activeFY.startDate && e.date <= activeFY.endDate
      );

      setTotalEntries(entries.length);

      // Accumulate balances per account
      const balMap = new Map<string, AccountBalance>();
      for (const entry of entries) {
        for (const line of entry.lines) {
          const existing = balMap.get(line.accountCode) || {
            accountCode: line.accountCode,
            accountName: line.accountName,
            totalDebit: 0,
            totalCredit: 0,
            solde: 0,
          };
          existing.totalDebit += line.debit;
          existing.totalCredit += line.credit;
          existing.solde = existing.totalDebit - existing.totalCredit;
          balMap.set(line.accountCode, existing);
        }
      }

      setBalances(balMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Helper: sum net balances for accounts starting with given prefixes
  const getSolde = useCallback((prefixes: string[]): number => {
    let total = money(0);
    for (const [code, bal] of balances) {
      if (prefixes.some(p => code.startsWith(p))) {
        total = total.add(bal.solde);
      }
    }
    return total.toNumber();
  }, [balances]);

  // Helper: sum only debit-side balances
  const getSoldeDebiteur = useCallback((prefixes: string[]): number => {
    let total = money(0);
    for (const [code, bal] of balances) {
      if (prefixes.some(p => code.startsWith(p)) && bal.solde > 0) {
        total = total.add(bal.solde);
      }
    }
    return total.toNumber();
  }, [balances]);

  // Helper: sum only credit-side balances (as positive)
  const getSoldeCrediteur = useCallback((prefixes: string[]): number => {
    let total = money(0);
    for (const [code, bal] of balances) {
      if (prefixes.some(p => code.startsWith(p)) && bal.solde < 0) {
        total = total.add(Math.abs(bal.solde));
      }
    }
    return total.toNumber();
  }, [balances]);

  // Compute summaries
  // Actif: classes 2,3,4(débiteur),5 = debit balances
  const totalActif = getSoldeDebiteur(['2', '3', '4', '5']);
  // Passif: class 1 + class 4(créditeur) + résultat
  const passiCapitaux = getSoldeCrediteur(['1']);
  const passiDettes = getSoldeCrediteur(['4']);
  // Résultat: produits (cl.7 credit) - charges (cl.6 debit)
  const produits = getSoldeCrediteur(['7']);
  const charges = getSoldeDebiteur(['6']);
  const resultatNet = money(produits).subtract(money(charges)).toNumber();
  const totalPassif = money(passiCapitaux).add(passiDettes).add(resultatNet).toNumber();
  const isBalanced = Math.abs(totalActif - totalPassif) < 1000;

  return {
    loading,
    error,
    fiscalYear,
    balances,
    totalEntries,
    getSolde,
    getSoldeDebiteur,
    getSoldeCrediteur,
    totalActif,
    totalPassif,
    resultatNet,
    isBalanced,
    refresh: loadData,
  };
}
