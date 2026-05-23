import { useState, useEffect } from 'react';
import {
  DashboardStats,
  DeclarationFiscale,
  DeclarationFilters,
  Echeance,
  AlerteFiscale,
} from '../types/taxation.types';
import { taxationService } from '../services/taxationService';
import { useData } from '../../../contexts/DataContext';

export const useTaxationStats = (period?: string) => {
  const { adapter } = useData();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await taxationService.getDashboardStats(adapter, { period });
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur chargement statistiques');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [adapter, period]);

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
      // TODO(produit): taxationService.getDeclarations n'existe pas encore.
      // La persistance/lecture des déclarations fiscales doit être spécifiée
      // (table dédiée + statuts). En attendant, on renvoie une liste vide pour
      // ne pas crasher l'écran (au lieu de "x is not a function").
      const data: DeclarationFiscale[] = [];
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
  const { adapter } = useData();
  const [deadlines, setDeadlines] = useState<Echeance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeadlines = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await taxationService.getUpcomingDeadlines(adapter);
        setDeadlines(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur chargement échéances');
      } finally {
        setLoading(false);
      }
    };

    fetchDeadlines();
  }, [adapter]);

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
        // TODO(produit): taxationService.getAlertes n'existe pas encore.
        // Les alertes fiscales devraient dériver de useFiscalAlerts (déjà
        // adapter-based). En attendant, liste vide pour ne pas crasher.
        const data: AlerteFiscale[] = [];
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