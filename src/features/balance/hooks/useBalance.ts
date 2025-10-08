import { useState, useEffect, useCallback } from 'react';
import { BalanceAccount, BalanceFilters, BalanceTotals } from '../types/balance.types';
import { balanceService } from '../services/balanceService';

export const useBalance = (filters: BalanceFilters) => {
  const [accounts, setAccounts] = useState<BalanceAccount[]>([]);
  const [totals, setTotals] = useState<BalanceTotals | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await balanceService.getBalance(filters);
      setAccounts(data);
      const calculatedTotals = balanceService.calculateTotals(data);
      setTotals(calculatedTotals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement balance');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const toggleAccount = (accountCode: string) => {
    const updateExpanded = (accounts: BalanceAccount[]): BalanceAccount[] => {
      return accounts.map(account => {
        if (account.code === accountCode) {
          return { ...account, isExpanded: !account.isExpanded };
        }
        if (account.children) {
          return { ...account, children: updateExpanded(account.children) };
        }
        return account;
      });
    };
    setAccounts(updateExpanded(accounts));
  };

  return {
    accounts,
    totals,
    loading,
    error,
    refetch: fetchBalance,
    toggleAccount
  };
};