/**
 * Hook d'invalidation automatique des caches React Query
 * quand les données Dexie changent (journalEntries, assets, budgetLines, etc.).
 *
 * Utilise Dexie Table hooks (creating/updating/deleting) pour déclencher
 * l'invalidation des queryKeys dépendantes.
 *
 * Usage: appeler useInvalidateOnEntryChange() une seule fois dans le layout racine.
 */
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';

/** QueryKeys invalidées quand journalEntries change */
const ENTRY_DEPENDENT_KEYS = [
  'balance',
  'general-ledger',
  'journal-dashboard',
  'badge-counts',
  'ratios',
  'budget-control',
  'lettrage',
  'journal-entries',
  'treasury',
  'todaySummary',
  'operationsByType',
  'volumeByDay',
  'alerts',
  'treasuryData',
  'treasuryEvolution',
  'kpis',
];

/** QueryKeys invalidées quand assets change */
const ASSET_DEPENDENT_KEYS = [
  'assets',
  'depreciation',
  'balance',
];

/** QueryKeys invalidées quand budgetLines change */
const BUDGET_DEPENDENT_KEYS = [
  'budget-control',
  'budget-lines',
  'budget-analysis',
];

/** QueryKeys invalidées quand thirdParties change */
const THIRD_PARTY_DEPENDENT_KEYS = [
  'third-parties',
  'receivables',
  'lettrage',
];

export function useInvalidateOnEntryChange(): void {
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    /**
     * Debounced invalidation: si plusieurs mutations arrivent en rafale
     * (ex: import de 100 écritures), on n'invalide qu'une seule fois.
     */
    function invalidateKeys(keys: string[]) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        for (const key of keys) {
          queryClient.invalidateQueries({ queryKey: [key] });
        }
      }, 300);
    }

    // --- journalEntries hooks ---
    const onEntryCreating = () => {
      invalidateKeys(ENTRY_DEPENDENT_KEYS);
    };
    const onEntryUpdating = () => {
      invalidateKeys(ENTRY_DEPENDENT_KEYS);
    };
    const onEntryDeleting = () => {
      invalidateKeys(ENTRY_DEPENDENT_KEYS);
    };

    db.journalEntries.hook('creating', onEntryCreating);
    db.journalEntries.hook('updating', onEntryUpdating);
    db.journalEntries.hook('deleting', onEntryDeleting);

    // --- assets hooks ---
    const onAssetCreating = () => {
      invalidateKeys(ASSET_DEPENDENT_KEYS);
    };
    const onAssetUpdating = () => {
      invalidateKeys(ASSET_DEPENDENT_KEYS);
    };
    const onAssetDeleting = () => {
      invalidateKeys(ASSET_DEPENDENT_KEYS);
    };

    db.assets.hook('creating', onAssetCreating);
    db.assets.hook('updating', onAssetUpdating);
    db.assets.hook('deleting', onAssetDeleting);

    // --- budgetLines hooks ---
    const onBudgetCreating = () => {
      invalidateKeys(BUDGET_DEPENDENT_KEYS);
    };
    const onBudgetUpdating = () => {
      invalidateKeys(BUDGET_DEPENDENT_KEYS);
    };
    const onBudgetDeleting = () => {
      invalidateKeys(BUDGET_DEPENDENT_KEYS);
    };

    db.budgetLines.hook('creating', onBudgetCreating);
    db.budgetLines.hook('updating', onBudgetUpdating);
    db.budgetLines.hook('deleting', onBudgetDeleting);

    // --- thirdParties hooks ---
    const onThirdPartyCreating = () => {
      invalidateKeys(THIRD_PARTY_DEPENDENT_KEYS);
    };
    const onThirdPartyUpdating = () => {
      invalidateKeys(THIRD_PARTY_DEPENDENT_KEYS);
    };
    const onThirdPartyDeleting = () => {
      invalidateKeys(THIRD_PARTY_DEPENDENT_KEYS);
    };

    db.thirdParties.hook('creating', onThirdPartyCreating);
    db.thirdParties.hook('updating', onThirdPartyUpdating);
    db.thirdParties.hook('deleting', onThirdPartyDeleting);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      db.journalEntries.hook('creating').unsubscribe(onEntryCreating);
      db.journalEntries.hook('updating').unsubscribe(onEntryUpdating);
      db.journalEntries.hook('deleting').unsubscribe(onEntryDeleting);

      db.assets.hook('creating').unsubscribe(onAssetCreating);
      db.assets.hook('updating').unsubscribe(onAssetUpdating);
      db.assets.hook('deleting').unsubscribe(onAssetDeleting);

      db.budgetLines.hook('creating').unsubscribe(onBudgetCreating);
      db.budgetLines.hook('updating').unsubscribe(onBudgetUpdating);
      db.budgetLines.hook('deleting').unsubscribe(onBudgetDeleting);

      db.thirdParties.hook('creating').unsubscribe(onThirdPartyCreating);
      db.thirdParties.hook('updating').unsubscribe(onThirdPartyUpdating);
      db.thirdParties.hook('deleting').unsubscribe(onThirdPartyDeleting);
    };
  }, [queryClient]);
}
