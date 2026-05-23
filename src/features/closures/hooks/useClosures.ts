import { useState, useEffect } from 'react';
import { closuresService } from '../services/closuresService';
import { useData } from '../../../contexts/DataContext';
import {
  ClotureSession,
  BalanceAccount,
  Provision,
  EcritureCloture,
  Amortissement,
  ClotureStats,
} from '../types/closures.types';

export const useClosureSessions = () => {
  const { adapter } = useData();
  const [sessions, setSessions] = useState<ClotureSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await closuresService.getSessions(adapter);
      setSessions(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [adapter]);

  return { sessions, loading, error, refetch: fetchSessions };
};

export const useClosureData = (sessionId: string | number) => {
  const { adapter } = useData();
  const [balance, setBalance] = useState<BalanceAccount[]>([]);
  const [provisions, setProvisions] = useState<Provision[]>([]);
  const [amortissements, setAmortissements] = useState<Amortissement[]>([]);
  const [ecritures, setEcritures] = useState<EcritureCloture[]>([]);
  const [stats, setStats] = useState<ClotureStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    if (!sessionId) return;

    setLoading(true);
    setError(null);
    try {
      const [balanceData, provisionsData, amortissementsData, ecrituresData, statsData] =
        await Promise.all([
          closuresService.getBalance(adapter, sessionId),
          closuresService.getProvisions(adapter, sessionId),
          closuresService.getAmortissements(adapter, sessionId),
          closuresService.getEcritures(adapter, sessionId),
          closuresService.getStats(adapter, sessionId),
        ]);

      setBalance(balanceData);
      setProvisions(provisionsData);
      setAmortissements(amortissementsData);
      setEcritures(ecrituresData);
      setStats(statsData);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [adapter, sessionId]);

  return {
    balance,
    provisions,
    amortissements,
    ecritures,
    stats,
    loading,
    error,
    refetch: fetchData,
  };
};