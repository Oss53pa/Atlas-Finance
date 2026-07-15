/**
 * useStockModule — état d'activation du module Stock pour le tenant courant.
 * Alimente le gate d'activation et la navigation conditionnelle.
 */
import { useState, useEffect, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import {
  isStockModuleEnabled,
  activateStockModule,
  deactivateStockModule,
} from '../../services/stock/stockActivation';

export function useStockModule() {
  const { adapter } = useData();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setEnabled(await isStockModuleEnabled(adapter, true));
    } finally {
      setLoading(false);
    }
  }, [adapter]);

  useEffect(() => { refresh(); }, [refresh]);

  const activate = useCallback(async () => {
    setWorking(true);
    try {
      await activateStockModule(adapter);
      setEnabled(await isStockModuleEnabled(adapter, true));
    } finally {
      setWorking(false);
    }
  }, [adapter]);

  const deactivate = useCallback(async () => {
    setWorking(true);
    try {
      await deactivateStockModule(adapter);
      setEnabled(false);
    } finally {
      setWorking(false);
    }
  }, [adapter]);

  return { enabled, loading, working, activate, deactivate, refresh };
}
