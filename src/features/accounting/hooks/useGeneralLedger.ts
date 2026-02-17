import { useState, useEffect } from 'react';
import { generalLedgerService } from '../services/generalLedgerService';
import {
  AccountLedger,
  LedgerStats,
  GeneralLedgerFilters,
  LedgerSearchResult,
} from '../types/generalLedger.types';

export const useGeneralLedger = (filters: GeneralLedgerFilters) => {
  const [accounts, setAccounts] = useState<AccountLedger[]>([]);
  const [stats, setStats] = useState<LedgerStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [accountsData, statsData] = await Promise.all([
        generalLedgerService.getLedgerAccounts(filters),
        generalLedgerService.getStats(filters),
      ]);
      setAccounts(accountsData);
      setStats(statsData);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [
    filters.dateDebut,
    filters.dateFin,
    filters.compteDebut,
    filters.compteFin,
    filters.journal,
  ]);

  return {
    accounts,
    stats,
    loading,
    error,
    refetch: fetchData,
  };
};

export const useAccountLedger = (accountNumber: string, filters: Partial<GeneralLedgerFilters>) => {
  const [account, setAccount] = useState<AccountLedger | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAccount = async () => {
      if (!accountNumber) return;

      setLoading(true);
      setError(null);
      try {
        const data = await generalLedgerService.getAccountLedger(accountNumber, filters);
        setAccount(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchAccount();
  }, [accountNumber, filters.dateDebut, filters.dateFin]);

  return { account, loading, error };
};

export const useLedgerSearch = () => {
  const [results, setResults] = useState<LedgerSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const search = async (query: string, filters?: Partial<GeneralLedgerFilters>) => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await generalLedgerService.search(query, filters);
      setResults(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { results, loading, error, search };
};