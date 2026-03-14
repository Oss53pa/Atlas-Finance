/**
 * Hook pour calculer les KPIs du dashboard en fonction du type d'activité.
 * Lit les écritures comptables depuis le DataAdapter et calcule les agrégats
 * selon les préfixes de comptes définis dans la configuration.
 */

import { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useActivityType } from './useActivityType';
import type { ActivityKPI } from '../config/activityDashboard.config';

interface KPIValue {
  id: string;
  label: string;
  description: string;
  value: number;
  format: 'currency' | 'percentage' | 'number' | 'days';
  colorCondition?: 'higher-is-better' | 'lower-is-better';
  icon: React.FC<{ className?: string }>;
}

interface MonthlyData {
  month: number;
  revenue: number;
  cost: number;
  margin: number;
}

interface UseActivityKPIsResult {
  primaryKPIs: KPIValue[];
  secondaryKPIs: KPIValue[];
  monthlyTrend: MonthlyData[];
  loading: boolean;
}

function matchesAnyPrefix(code: string, prefixes: string[]): boolean {
  return prefixes.some((p) => code.startsWith(p));
}

function computeKPI(
  kpi: ActivityKPI,
  entries: any[]
): number {
  if (kpi.calcType === 'sum') {
    let total = 0;
    for (const e of entries) {
      for (const l of e.lines) {
        if (kpi.accountPrefixes.debit && matchesAnyPrefix(l.accountCode, kpi.accountPrefixes.debit)) {
          total += l.debit - l.credit;
        }
        if (kpi.accountPrefixes.credit && matchesAnyPrefix(l.accountCode, kpi.accountPrefixes.credit)) {
          total += l.credit - l.debit;
        }
      }
    }
    return total;
  }

  if (kpi.calcType === 'difference') {
    let credits = 0;
    let debits = 0;
    for (const e of entries) {
      for (const l of e.lines) {
        if (kpi.accountPrefixes.credit && matchesAnyPrefix(l.accountCode, kpi.accountPrefixes.credit)) {
          credits += l.credit - l.debit;
        }
        if (kpi.accountPrefixes.debit && matchesAnyPrefix(l.accountCode, kpi.accountPrefixes.debit)) {
          debits += l.debit - l.credit;
        }
      }
    }
    return credits - debits;
  }

  if (kpi.calcType === 'ratio' && kpi.ratioConfig) {
    const cfg = kpi.ratioConfig;
    let numerator = 0;
    let denominator = 0;
    for (const e of entries) {
      for (const l of e.lines) {
        // Numerator
        if (matchesAnyPrefix(l.accountCode, cfg.numeratorPrefixes)) {
          numerator += cfg.numeratorSide === 'credit'
            ? l.credit - l.debit
            : l.debit - l.credit;
        }
        // Denominator
        if (matchesAnyPrefix(l.accountCode, cfg.denominatorPrefixes)) {
          denominator += cfg.denominatorSide === 'credit'
            ? l.credit - l.debit
            : l.debit - l.credit;
        }
      }
    }
    if (denominator === 0) return 0;
    const ratio = numerator / denominator;
    return cfg.asPercentage ? ratio * 100 : ratio;
  }

  return 0;
}

export function useActivityKPIs(): UseActivityKPIsResult {
  const { adapter } = useData();
  const { activityType, dashboardConfig } = useActivityType();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adapter.getAll('journalEntries').then((data: any[]) => {
      setEntries(data);
      setLoading(false);
    });
  }, [adapter]);

  const primaryKPIs = useMemo<KPIValue[]>(() => {
    if (loading) return [];
    return dashboardConfig.primaryKPIs.map((kpi) => ({
      id: kpi.id,
      label: kpi.label,
      description: kpi.description,
      value: computeKPI(kpi, entries),
      format: kpi.format,
      colorCondition: kpi.colorCondition,
      icon: kpi.icon,
    }));
  }, [entries, dashboardConfig.primaryKPIs, loading]);

  const secondaryKPIs = useMemo<KPIValue[]>(() => {
    if (loading) return [];
    return dashboardConfig.secondaryKPIs.map((kpi) => ({
      id: kpi.id,
      label: kpi.label,
      description: kpi.description,
      value: computeKPI(kpi, entries),
      format: kpi.format,
      colorCondition: kpi.colorCondition,
      icon: kpi.icon,
    }));
  }, [entries, dashboardConfig.secondaryKPIs, loading]);

  const monthlyTrend = useMemo<MonthlyData[]>(() => {
    if (loading) return [];

    const months: MonthlyData[] = Array.from({ length: 12 }, (_, i) => ({
      month: i,
      revenue: 0,
      cost: 0,
      margin: 0,
    }));

    const revenuePrefixes = dashboardConfig.primaryKPIs[0]?.accountPrefixes.credit || ['70'];
    const costPrefixes =
      activityType === 'production'
        ? ['60', '61', '62']
        : activityType === 'negoce'
        ? ['601']
        : ['60', '61', '62', '66'];

    for (const e of entries) {
      const m = new Date(e.date).getMonth();
      for (const l of e.lines) {
        if (matchesAnyPrefix(l.accountCode, revenuePrefixes)) {
          months[m].revenue += l.credit - l.debit;
        }
        if (matchesAnyPrefix(l.accountCode, costPrefixes)) {
          months[m].cost += l.debit - l.credit;
        }
      }
    }

    for (const m of months) {
      m.margin = m.revenue - m.cost;
    }

    return months;
  }, [entries, dashboardConfig, activityType, loading]);

  return { primaryKPIs, secondaryKPIs, monthlyTrend, loading };
}
