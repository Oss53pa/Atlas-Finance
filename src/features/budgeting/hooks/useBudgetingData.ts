import { useState, useEffect } from 'react';
import { budgetingService } from '../services/budgetingService';
import {
  BudgetSession,
  DepartmentBudget,
  BudgetStats,
  MonthlyBudget,
  BudgetAlert,
  BudgetForecast,
} from '../types/budgeting.types';

export const useBudgetingData = (year?: string, period?: string) => {
  const [sessions, setSessions] = useState<BudgetSession[]>([]);
  const [departments, setDepartments] = useState<DepartmentBudget[]>([]);
  const [stats, setStats] = useState<BudgetStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessionsData, departmentsData, statsData] = await Promise.all([
        budgetingService.getSessions(),
        budgetingService.getDepartmentBudgets(year, period),
        budgetingService.getStats(year, period),
      ]);
      setSessions(sessionsData);
      setDepartments(departmentsData);
      setStats(statsData);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [year, period]);

  return {
    sessions,
    departments,
    stats,
    loading,
    error,
    refetch: fetchData,
  };
};

export const useMonthlyBudgets = (year: string, department?: string) => {
  const [data, setData] = useState<MonthlyBudget[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await budgetingService.getMonthlyBudgets(year, department);
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [year, department]);

  return { data, loading, error };
};

export const useBudgetAlerts = () => {
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await budgetingService.getAlerts();
      setAlerts(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  return { alerts, loading, error, refetch: fetchAlerts };
};

export const useBudgetForecasts = (year: string, department?: string) => {
  const [forecasts, setForecasts] = useState<BudgetForecast[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await budgetingService.getForecasts(year, department);
        setForecasts(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [year, department]);

  return { forecasts, loading, error };
};