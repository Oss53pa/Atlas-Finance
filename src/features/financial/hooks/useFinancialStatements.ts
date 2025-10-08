import { useState, useEffect } from 'react';
import { financialStatementsService } from '../services/financialStatementsService';
import {
  Bilan,
  CompteResultat,
  SIG,
  RatiosFinanciers,
  FinancialStatementsData,
  FinancialComparison,
} from '../types/financialStatements.types';

export const useFinancialStatements = (exercice: string) => {
  const [data, setData] = useState<FinancialStatementsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await financialStatementsService.getFinancialStatements(exercice);
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (exercice) {
      fetchData();
    }
  }, [exercice]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
};

export const useBilan = (exercice: string) => {
  const [bilan, setBilan] = useState<Bilan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchBilan = async () => {
      if (!exercice) return;

      setLoading(true);
      setError(null);
      try {
        const result = await financialStatementsService.getBilan(exercice);
        setBilan(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchBilan();
  }, [exercice]);

  return { bilan, loading, error };
};

export const useCompteResultat = (exercice: string) => {
  const [compteResultat, setCompteResultat] = useState<CompteResultat | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchCR = async () => {
      if (!exercice) return;

      setLoading(true);
      setError(null);
      try {
        const result = await financialStatementsService.getCompteResultat(exercice);
        setCompteResultat(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchCR();
  }, [exercice]);

  return { compteResultat, loading, error };
};

export const useFinancialComparison = (currentExercice: string, previousExercice?: string) => {
  const [comparison, setComparison] = useState<FinancialComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchComparison = async () => {
      if (!currentExercice || !previousExercice) return;

      setLoading(true);
      setError(null);
      try {
        const result = await financialStatementsService.compareExercices(
          currentExercice,
          previousExercice
        );
        setComparison(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();
  }, [currentExercice, previousExercice]);

  return { comparison, loading, error };
};