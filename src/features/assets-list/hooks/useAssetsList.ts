import { useState, useEffect } from 'react';
import { AssetData, AssetsFilters, AssetsStats, AssetsSummary } from '../types/assets-list.types';
import { assetsListService } from '../services/assetsListService';

export const useAssetsList = (filters?: AssetsFilters) => {
  const [assets, setAssets] = useState<AssetData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await assetsListService.getAssets(filters);
      setAssets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement immobilisations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [filters]);

  return { assets, loading, error, refetch: fetchAssets };
};

export const useAssetsStats = () => {
  const [stats, setStats] = useState<AssetsStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await assetsListService.getStats();
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

export const useAssetsSummary = () => {
  const [summary, setSummary] = useState<AssetsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await assetsListService.getSummary();
        setSummary(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur chargement récapitulatif');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  return { summary, loading, error };
};