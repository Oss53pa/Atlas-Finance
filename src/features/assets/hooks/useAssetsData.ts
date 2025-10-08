import { useState, useEffect } from 'react';
import { assetsService } from '../services/assetsService';
import {
  Asset,
  AssetStats,
  AssetCategory,
  AssetClass,
  AssetMaintenance,
  AssetTransaction,
  AssetDisposal,
} from '../types/assets.types';

export const useAssetsData = (filters?: {
  status?: string;
  class?: string;
  category?: string;
  location?: string;
}) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [stats, setStats] = useState<AssetStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [assetsData, statsData] = await Promise.all([
        assetsService.getAssets(filters),
        assetsService.getStats(),
      ]);
      setAssets(assetsData);
      setStats(statsData);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters?.status, filters?.class, filters?.category, filters?.location]);

  return {
    assets,
    stats,
    loading,
    error,
    refetch: fetchData,
  };
};

export const useAsset = (id: string | number) => {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAsset = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await assetsService.getAsset(id);
        setAsset(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchAsset();
    }
  }, [id]);

  return { asset, loading, error };
};

export const useAssetCategories = () => {
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await assetsService.getCategories();
        setCategories(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return { categories, loading, error };
};

export const useAssetClasses = () => {
  const [classes, setClasses] = useState<AssetClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchClasses = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await assetsService.getClasses();
        setClasses(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, []);

  return { classes, loading, error };
};

export const useAssetMaintenances = (assetId?: string | number) => {
  const [maintenances, setMaintenances] = useState<AssetMaintenance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMaintenances = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await assetsService.getMaintenances(assetId);
      setMaintenances(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenances();
  }, [assetId]);

  return { maintenances, loading, error, refetch: fetchMaintenances };
};

export const useAssetTransactions = (assetId?: string | number) => {
  const [transactions, setTransactions] = useState<AssetTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await assetsService.getTransactions(assetId);
        setTransactions(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [assetId]);

  return { transactions, loading, error };
};

export const useAssetDisposals = () => {
  const [disposals, setDisposals] = useState<AssetDisposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchDisposals = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await assetsService.getDisposals();
      setDisposals(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisposals();
  }, []);

  return { disposals, loading, error, refetch: fetchDisposals };
};