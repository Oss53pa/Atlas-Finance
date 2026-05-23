import { useState, useEffect } from 'react';
import { ClosurePeriod, ClosureStats, ClosureFilters, ClosureStep } from '../types/periodic-closures.types';
import { periodicClosuresService } from '../services/periodicClosuresService';
import { useData } from '../../../contexts/DataContext';

export const usePeriodicClosures = (filters?: ClosureFilters) => {
  const { adapter } = useData();
  const [periods, setPeriods] = useState<ClosurePeriod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPeriods = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await periodicClosuresService.getPeriods(adapter, filters);
      setPeriods(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement périodes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, [adapter, filters]);

  return { periods, loading, error, refetch: fetchPeriods };
};

export const useClosureSteps = (periodId: string) => {
  const { adapter } = useData();
  const [steps, setSteps] = useState<ClosureStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSteps = async () => {
      if (!periodId) return;

      setLoading(true);
      setError(null);
      try {
        const data = await periodicClosuresService.getSteps(adapter, periodId);
        setSteps(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur chargement étapes');
      } finally {
        setLoading(false);
      }
    };

    fetchSteps();
  }, [adapter, periodId]);

  return { steps, loading, error };
};

export const useClosureStats = () => {
  const { adapter } = useData();
  const [stats, setStats] = useState<ClosureStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await periodicClosuresService.getStats(adapter);
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur chargement stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [adapter]);

  return { stats, loading, error };
};