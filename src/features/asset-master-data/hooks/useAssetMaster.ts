import { useState, useEffect } from 'react';
import { AssetMasterData, AssetFilters, AssetStats } from '../types/asset-master.types';
import { assetMasterService } from '../services/assetMasterService';

export const useAssets = (filters?: AssetFilters) => {
  const [assets, setAssets] = useState<AssetMasterData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await assetMasterService.getAssets(filters);
      setAssets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [filters]);

  return { assets, loading, error, refetch: fetchAssets };
};

export const useAsset = (id: string) => {
  const [asset, setAsset] = useState<AssetMasterData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAsset = async () => {
      if (!id) return;

      setLoading(true);
      setError(null);
      try {
        const data = await assetMasterService.getAsset(id);
        setAsset(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur chargement asset');
      } finally {
        setLoading(false);
      }
    };

    fetchAsset();
  }, [id]);

  return { asset, loading, error };
};

export const useAssetStats = () => {
  const [stats, setStats] = useState<AssetStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await assetMasterService.getStats();
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