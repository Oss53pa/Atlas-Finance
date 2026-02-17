import { useState, useEffect } from 'react';
import { ClosurePeriod, ClosureStats, ClosureFilters, ClosureStep } from '../types/periodic-closures.types';
import { periodicClosuresService } from '../services/periodicClosuresService';

export const usePeriodicClosures = (filters?: ClosureFilters) => {
  const [periods, setPeriods] = useState<ClosurePeriod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPeriods = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await periodicClosuresService.getPeriods(filters);
      setPeriods(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement périodes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, [filters]);

  return { periods, loading, error, refetch: fetchPeriods };
};

export const useClosureSteps = (periodId: string) => {
  const [steps, setSteps] = useState<ClosureStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSteps = async () => {
      if (!periodId) return;

      setLoading(true);
      setError(null);
      try {
        const data = await periodicClosuresService.getSteps(periodId);
        setSteps(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur chargement étapes');
      } finally {
        setLoading(false);
      }
    };

    fetchSteps();
  }, [periodId]);

  return { steps, loading, error };
};

export const useClosureStats = () => {
  const [stats, setStats] = useState<ClosureStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await periodicClosuresService.getStats();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur chargement stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading, error };
};