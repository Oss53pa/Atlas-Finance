import { useState, useEffect } from 'react';
import { useData } from '../../../contexts/DataContext';
import { financialStatementsService } from '../services/financialStatementsService';
import {
  Bilan,
  CompteResultat,
  SIG,
  RatiosFinanciers,
  FinancialStatementsData,
  FinancialComparison,
} from '../types/financialStatements.types';

// P0-2 : le service feature attend (adapter, exercice). Auparavant le hook
// appelait getFinancialStatements(exercice) — la chaîne `exercice` était passée
// à la place de l'adapter (masqué par @ts-nocheck) → états financiers cassés.
// On récupère désormais l'adapter via DataContext et on le transmet.

export const useFinancialStatements = (exercice: string) => {
  const { adapter } = useData();
  const [data, setData] = useState<FinancialStatementsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await financialStatementsService.getFinancialStatements(adapter, exercice);
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
  }, [exercice, adapter]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
};

export const useBilan = (exercice: string) => {
  const { adapter } = useData();
  const [bilan, setBilan] = useState<Bilan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchBilan = async () => {
      if (!exercice) return;

      setLoading(true);
      setError(null);
      try {
        const result = await financialStatementsService.getBilan(adapter, exercice);
        setBilan(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchBilan();
  }, [exercice, adapter]);

  return { bilan, loading, error };
};

export const useCompteResultat = (exercice: string) => {
  const { adapter } = useData();
  const [compteResultat, setCompteResultat] = useState<CompteResultat | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchCR = async () => {
      if (!exercice) return;

      setLoading(true);
      setError(null);
      try {
        const result = await financialStatementsService.getCompteResultat(adapter, exercice);
        setCompteResultat(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchCR();
  }, [exercice, adapter]);

  return { compteResultat, loading, error };
};

export const useFinancialComparison = (currentExercice: string, previousExercice?: string) => {
  const { adapter } = useData();
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
          adapter,
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
  }, [currentExercice, previousExercice, adapter]);

  return { comparison, loading, error };
};
