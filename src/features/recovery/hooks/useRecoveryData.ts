import { useState, useEffect } from 'react';
import { useData } from '../../../contexts/DataContext';
import { createRecoveryService } from '../services/recoveryService';
import { DossierRecouvrement, Creance, RecoveryStats } from '../types/recovery.types';

export const useRecoveryData = () => {
  const { adapter } = useData();
  const [dossiers, setDossiers] = useState<DossierRecouvrement[]>([]);
  const [creances, setCreances] = useState<Creance[]>([]);
  const [stats, setStats] = useState<RecoveryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const service = createRecoveryService(adapter);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dossiersData, creancesData, statsData] = await Promise.all([
        service.getDossiers(),
        service.getCreances(),
        service.getStats(),
      ]);
      setDossiers(dossiersData);
      setCreances(creancesData);
      setStats(statsData);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    dossiers,
    creances,
    stats,
    loading,
    error,
    refetch: fetchData,
    service,
  };
};
