/**
 * Hook pour les données du Grand Livre — connecté à Dexie via generalLedgerService.
 * Remplace toutes les constantes mockAccountsData dans les composants.
 */
import { useQuery } from '@tanstack/react-query';
import { generalLedgerService } from '../../features/accounting/services/generalLedgerService';
import { useData } from '../../contexts/DataContext';

export interface UseGeneralLedgerOptions {
  dateDebut: string;
  dateFin: string;
  compteDebut?: string;
  compteFin?: string;
  journal?: string;
}

export function useGeneralLedgerData(options: UseGeneralLedgerOptions) {
  const { adapter } = useData();
  const { dateDebut, dateFin, compteDebut, compteFin, journal } = options;

  const query = useQuery({
    queryKey: ['grand-livre', dateDebut, dateFin, compteDebut, compteFin, journal],
    queryFn: () =>
      generalLedgerService.getLedgerAccounts(adapter, {
        dateDebut,
        dateFin,
        compteDebut: compteDebut || '',
        compteFin: compteFin || '',
        journal: journal || '',
      }),
  });

  const stats = useQuery({
    queryKey: ['grand-livre-stats', dateDebut, dateFin],
    queryFn: () =>
      generalLedgerService.getStats(adapter, { dateDebut, dateFin }),
  });

  return {
    accounts: query.data || [],
    stats: stats.data || null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useAccountLedger(accountCode: string, dateDebut: string, dateFin: string) {
  const { adapter } = useData();
  return useQuery({
    queryKey: ['account-ledger', accountCode, dateDebut, dateFin],
    queryFn: () =>
      generalLedgerService.getAccountLedger(adapter, accountCode, { dateDebut, dateFin }),
    enabled: !!accountCode,
  });
}
