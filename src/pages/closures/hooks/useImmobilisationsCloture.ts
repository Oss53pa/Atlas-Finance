/**
 * Hook: useImmobilisationsCloture
 * Summary of fixed assets and depreciation status for closure.
 */
import { useState, useEffect, useCallback } from 'react';
import { useData } from '../../../contexts/DataContext';
import type { DBAsset, DBFiscalYear } from '../../../lib/db';
import { money } from '../../../utils/money';

export interface ImmoSummary {
  totalAssets: number;
  totalActiveAssets: number;
  totalAcquisitionValue: number;
  totalResidualValue: number;
  totalAmortissementComptabilise: number;
  totalAmortissementTheorique: number;
  ecart: number;
}

export function useImmobilisationsCloture(fiscalYearId?: string) {
  const { adapter } = useData();
  const [assets, setAssets] = useState<DBAsset[]>([]);
  const [summary, setSummary] = useState<ImmoSummary | null>(null);
  const [periodesManquantes, setPeriodesManquantes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const allAssets = await adapter.getAll<DBAsset>('assets');
      const activeAssets = allAssets.filter(a => a.status === 'active');
      setAssets(activeAssets);

      // Get FY for date range
      let startDate = '';
      let endDate = '';
      if (fiscalYearId) {
        const fy = await adapter.getById<DBFiscalYear>('fiscalYears', fiscalYearId);
        if (fy) {
          startDate = fy.startDate;
          endDate = fy.endDate;
        }
      }

      // Sum depreciation entries (account prefix 28)
      const allEntries = await adapter.getAll<any>('journalEntries');
      const entries = startDate
        ? allEntries.filter((e: any) => e.date >= startDate && e.date <= endDate)
        : allEntries;

      let totalAmortCompta = money(0);
      for (const entry of entries) {
        for (const line of entry.lines) {
          if (line.accountCode.startsWith('28')) {
            totalAmortCompta = totalAmortCompta.add(money(line.credit)).subtract(money(line.debit));
          }
        }
      }

      // Theoretical depreciation
      let totalTheo = money(0);
      let totalAcq = money(0);
      let totalRes = money(0);
      for (const asset of activeAssets) {
        totalAcq = totalAcq.add(money(asset.acquisitionValue));
        totalRes = totalRes.add(money(asset.residualValue));
        const annualAmort = money(asset.acquisitionValue - asset.residualValue).divide(asset.usefulLifeYears);
        totalTheo = totalTheo.add(annualAmort);
      }

      const amortCompta = totalAmortCompta.toNumber();
      const amortTheo = totalTheo.toNumber();

      setSummary({
        totalAssets: allAssets.length,
        totalActiveAssets: activeAssets.length,
        totalAcquisitionValue: totalAcq.toNumber(),
        totalResidualValue: totalRes.toNumber(),
        totalAmortissementComptabilise: amortCompta,
        totalAmortissementTheorique: amortTheo,
        ecart: Math.abs(amortCompta - amortTheo),
      });

      // Detect missing depreciation periods
      if (startDate && endDate) {
        const periodesMois = new Set<string>();
        const current = new Date(startDate);
        const end = new Date(endDate);
        while (current <= end) {
          periodesMois.add(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
          current.setMonth(current.getMonth() + 1);
        }

        const periodesAvecAmort = new Set<string>();
        for (const entry of entries) {
          const hasAmort = entry.lines?.some((l: any) => l.accountCode.startsWith('68'));
          if (hasAmort) {
            periodesAvecAmort.add(entry.date.substring(0, 7));
          }
        }

        const manquantes: string[] = [];
        for (const p of periodesMois) {
          if (!periodesAvecAmort.has(p) && activeAssets.length > 0) {
            manquantes.push(p);
          }
        }
        setPeriodesManquantes(manquantes);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement immobilisations');
    } finally {
      setLoading(false);
    }
  }, [adapter, fiscalYearId]);

  useEffect(() => { load(); }, [load]);

  return {
    assets,
    summary,
    periodesManquantes,
    loading,
    error,
    refresh: load,
  };
}
