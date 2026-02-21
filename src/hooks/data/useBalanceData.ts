/**
 * Hook pour les données de balance — connecté à Dexie via balanceService.
 * Remplace toutes les constantes mockBalanceData dans les composants.
 */
import { useQuery } from '@tanstack/react-query';
import { balanceService } from '../../features/balance/services/balanceService';
import type { BalanceAccount, BalanceTotals } from '../../features/balance/types/balance.types';

export interface UseBalanceDataOptions {
  dateDebut: string;
  dateFin: string;
  searchAccount?: string;
  showZeroBalance?: boolean;
  displayLevel?: number;
}

export function useBalanceData(options: UseBalanceDataOptions) {
  const { dateDebut, dateFin, searchAccount, showZeroBalance = false, displayLevel = 3 } = options;

  const query = useQuery({
    queryKey: ['balance', dateDebut, dateFin, searchAccount, showZeroBalance, displayLevel],
    queryFn: () =>
      balanceService.getBalance({
        period: { from: dateDebut, to: dateFin },
        searchAccount: searchAccount || '',
        showZeroBalance,
        balanceType: 'generale',
        displayLevel: (displayLevel === 1 || displayLevel === 2 || displayLevel === 3 ? displayLevel : 3) as 1 | 2 | 3,
      }),
  });

  const totals: BalanceTotals | null = query.data
    ? balanceService.calculateTotals(query.data)
    : null;

  const ecart = totals
    ? Math.abs(totals.mouvementsDebit - totals.mouvementsCredit)
    : 0;

  const isBalanced = ecart < 1; // Tolerance 1 FCFA

  return {
    accounts: query.data || [],
    totals,
    ecart,
    isBalanced,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
