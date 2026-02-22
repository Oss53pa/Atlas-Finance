/**
 * Hook: useSoldesTresorerie
 * Cash position analysis from class 5 accounts.
 */
import { useState, useEffect, useCallback } from 'react';
import { useData } from '../../../contexts/DataContext';
import { money } from '../../../utils/money';

export interface CompteTresorerie {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  solde: number;
}

export function useSoldesTresorerie(startDate?: string, endDate?: string) {
  const { adapter } = useData();
  const [comptes, setComptes] = useState<CompteTresorerie[]>([]);
  const [soldeBanques, setSoldeBanques] = useState(0);
  const [soldeCaisses, setSoldeCaisses] = useState(0);
  const [soldeTotal, setSoldeTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const allEntries = await adapter.getAll<any>('journalEntries');
      const entries = startDate && endDate
        ? allEntries.filter((e: any) => e.date >= startDate && e.date <= endDate)
        : allEntries;

      // Accumulate by account code (class 5 only)
      const balances = new Map<string, { name: string; debit: number; credit: number }>();

      for (const entry of entries) {
        for (const line of entry.lines) {
          if (!line.accountCode.startsWith('5')) continue;
          const existing = balances.get(line.accountCode) || { name: line.accountName, debit: 0, credit: 0 };
          existing.debit = money(existing.debit).add(money(line.debit)).toNumber();
          existing.credit = money(existing.credit).add(money(line.credit)).toNumber();
          balances.set(line.accountCode, existing);
        }
      }

      const comptesArr: CompteTresorerie[] = [];
      let banques = money(0);
      let caisses = money(0);
      let total = money(0);

      for (const [code, data] of balances) {
        const solde = money(data.debit).subtract(money(data.credit)).toNumber();
        comptesArr.push({ accountCode: code, accountName: data.name, debit: data.debit, credit: data.credit, solde });

        total = total.add(money(solde));
        if (code.startsWith('51') || code.startsWith('52')) {
          banques = banques.add(money(solde));
        } else if (code.startsWith('57')) {
          caisses = caisses.add(money(solde));
        }
      }

      comptesArr.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
      setComptes(comptesArr);
      setSoldeBanques(banques.toNumber());
      setSoldeCaisses(caisses.toNumber());
      setSoldeTotal(total.toNumber());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement trésorerie');
    } finally {
      setLoading(false);
    }
  }, [adapter, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  return {
    comptes,
    soldeBanques,
    soldeCaisses,
    soldeTotal,
    loading,
    error,
    refresh: load,
  };
}
