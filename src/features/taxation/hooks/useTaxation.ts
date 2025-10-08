import { useState, useEffect } from 'react';
import {
  DashboardStats,
  DeclarationFiscale,
  DeclarationFilters,
  Echeance,
  AlerteFiscale,
} from '../types/taxation.types';
import { taxationService } from '../services/taxationService';

export const useTaxationStats = (period?: string) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await taxationService.getDashboardStats({ period });
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur chargement statistiques');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [period]);

  return { stats, loading, error };
};

export const useDeclarations = (filters?: DeclarationFilters) => {
  const [declarations, setDeclarations] = useState<DeclarationFiscale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDeclarations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await taxationService.getDeclarations(filters);
      setDeclarations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement déclarations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeclarations();
  }, [filters]);

  return { declarations, loading, error, refetch: fetchDeclarations };
};

export const useUpcomingDeadlines = () => {
  const [deadlines, setDeadlines] = useState<Echeance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeadlines = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await taxationService.getUpcomingDeadlines();
        setDeadlines(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur chargement échéances');
      } finally {
        setLoading(false);
      }
    };

    fetchDeadlines();
  }, []);

  return { deadlines, loading, error };
};

export const useAlertes = () => {
  const [alertes, setAlertes] = useState<AlerteFiscale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAlertes = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await taxationService.getAlertes();
        setAlertes(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur chargement alertes');
      } finally {
        setLoading(false);
      }
    };

    fetchAlertes();
  }, []);

  return { alertes, loading, error };
};