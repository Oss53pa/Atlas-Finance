/**
 * useBlockData — React hook that auto-fetches data for a block
 * based on its `source` field and the document period.
 * CDC §9.1 — Synchronisation & Données Vivantes
 */

import { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { useReportBuilderStore } from '../store/useReportBuilderStore';
import { fetchKPIValue, fetchTableData, fetchChartData } from '../services/blockDataService';
import type { PeriodSelection } from '../types';

interface UseBlockDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Fetch KPI data for a block.
 */
export function useKPIData(source: string | undefined, periodOverride?: PeriodSelection): UseBlockDataResult<{ value: number | null; previousValue: number | null }> {
  const { adapter } = useData();
  const documentPeriod = useReportBuilderStore(s => s.document?.period);
  const period = periodOverride || documentPeriod;

  const [data, setData] = useState<{ value: number | null; previousValue: number | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!source || !period || !adapter) return;

    setLoading(true);
    setError(null);

    fetchKPIValue(adapter, source, period)
      .then(result => setData(result))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [adapter, source, period?.startDate, period?.endDate, refreshKey]);

  return { data, loading, error, refresh: () => setRefreshKey(k => k + 1) };
}

/**
 * Fetch table data for a block.
 */
export function useTableData(source: string | undefined, periodOverride?: PeriodSelection): UseBlockDataResult<{ columns: any[]; rows: any[] }> {
  const { adapter } = useData();
  const documentPeriod = useReportBuilderStore(s => s.document?.period);
  const period = periodOverride || documentPeriod;

  const [data, setData] = useState<{ columns: any[]; rows: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!source || !period || !adapter) return;

    setLoading(true);
    setError(null);

    fetchTableData(adapter, source, period)
      .then(result => setData(result))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [adapter, source, period?.startDate, period?.endDate, refreshKey]);

  return { data, loading, error, refresh: () => setRefreshKey(k => k + 1) };
}

/**
 * Fetch chart data for a block.
 */
export function useChartData(source: string | undefined, periodOverride?: PeriodSelection): UseBlockDataResult<{ data: any[]; xAxisKey: string; series: any[] }> {
  const { adapter } = useData();
  const documentPeriod = useReportBuilderStore(s => s.document?.period);
  const period = periodOverride || documentPeriod;

  const [result, setResult] = useState<{ data: any[]; xAxisKey: string; series: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!source || !period || !adapter) return;

    setLoading(true);
    setError(null);

    fetchChartData(adapter, source, period)
      .then(r => setResult(r))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [adapter, source, period?.startDate, period?.endDate, refreshKey]);

  return { data: result, loading, error, refresh: () => setRefreshKey(k => k + 1) };
}
