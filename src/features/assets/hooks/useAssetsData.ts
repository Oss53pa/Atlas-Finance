import { useState, useEffect, useMemo } from 'react';
import { useData } from '../../../contexts/DataContext';
import {
  getAssets,
  getAsset,
  getStats,
  getCategories,
  getClasses,
  getMaintenances,
  createMaintenance,
  updateMaintenance,
  getTransactions,
  getDisposals,
  disposeAsset,
  assetsService,
} from '../services/assetsService';
import {
  Asset,
  AssetStats,
  AssetCategory,
  AssetClass,
  AssetMaintenance,
  AssetTransaction,
  AssetDisposal,
} from '../types/assets.types';

/**
 * Injecte l'adapter dans le shim de compatibilité assetsService dès que
 * le DataContext est disponible. Cela permet aux composants qui utilisent
 * encore l'ancien singleton d'accéder aux vraies données.
 */
function useInjectAdapter() {
  const { adapter } = useData();
  useMemo(() => {
    assetsService.setAdapter(adapter);
  }, [adapter]);
  return adapter;
}

export const useAssetsData = (filters?: {
  status?: string;
  class?: string;
  category?: string;
  location?: string;
}) => {
  const adapter = useInjectAdapter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [stats, setStats] = useState<AssetStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [assetsData, statsData] = await Promise.all([
        getAssets(adapter, filters),
        getStats(adapter),
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const adapter = useInjectAdapter();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAsset = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getAsset(adapter, id);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return { asset, loading, error };
};

export const useAssetCategories = () => {
  const adapter = useInjectAdapter();
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getCategories(adapter);
        setCategories(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { categories, loading, error };
};

export const useAssetClasses = () => {
  const adapter = useInjectAdapter();
  const [classes, setClasses] = useState<AssetClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchClasses = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getClasses(adapter);
        setClasses(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { classes, loading, error };
};

export const useAssetMaintenances = (assetId?: string | number) => {
  const adapter = useInjectAdapter();
  const [maintenances, setMaintenances] = useState<AssetMaintenance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMaintenances = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMaintenances(adapter, assetId);
      setMaintenances(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenances();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  return { maintenances, loading, error, refetch: fetchMaintenances };
};

export const useAssetTransactions = (assetId?: string | number) => {
  const adapter = useInjectAdapter();
  const [transactions, setTransactions] = useState<AssetTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getTransactions(adapter, assetId);
        setTransactions(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  return { transactions, loading, error };
};

export const useAssetDisposals = () => {
  const adapter = useInjectAdapter();
  const [disposals, setDisposals] = useState<AssetDisposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchDisposals = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDisposals(adapter);
      setDisposals(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisposals();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { disposals, loading, error, refetch: fetchDisposals };
};
