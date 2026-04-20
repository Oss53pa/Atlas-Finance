/**
 * SommaireBlock Renderer — Default Report Summary.
 * Shows 4 auto-fetched KPI cards + alerts zone + signature zone.
 */
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, PenLine } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useReportBuilderStore } from '../../store/useReportBuilderStore';
import { getDefaultSummary, type SummaryPayload, type ReportSummaryType } from '../../services/reportSummaryService';
import { useMoneyFormat } from '../../../../hooks/useMoneyFormat';
import type { SommaireBlock } from '../../types';

interface Props {
  block: SommaireBlock;
}

export default function SommaireBlockRenderer({ block }: Props) {
  const { adapter } = useData();
  const period = useReportBuilderStore(s => s.document?.period);
  const fmtMoney = useMoneyFormat();

  const [payload, setPayload] = useState<SummaryPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reportType: ReportSummaryType = block.reportType ?? 'mensuel';
  const showAlerts = block.showAlerts ?? true;
  const showSignatures = block.showSignatures ?? true;
  const signatureLabels = block.signatureLabels ?? ['Expert-Comptable', 'Directeur Général'];

  useEffect(() => {
    if (!adapter) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDefaultSummary(adapter, reportType, period)
      .then(res => { if (!cancelled) setPayload(res); })
      .catch(err => { if (!cancelled) setError(err?.message ?? 'Erreur'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [adapter, reportType, period?.startDate, period?.endDate]);

  const formatVal = (value: number, format?: 'currency' | 'percent' | 'number' | 'days'): string => {
    if (format === 'percent') return `${value.toFixed(1)}%`;
    if (format === 'days') return `${Math.round(value)} j`;
    if (format === 'number') return value.toFixed(2);
    return `${fmtMoney(value)} FCFA`;
  };

  return (
    <section
      role="region"
      aria-label={block.title || 'Synthèse'}
      className="rounded-lg border border-neutral-200 bg-white p-5 space-y-5"
    >
      {block.title && (
        <h2 className="text-lg font-semibold text-neutral-900">{block.title}</h2>
      )}

      {/* KPI Cards */}
      {loading && (
        <div className="flex items-center justify-center py-8 text-neutral-500" aria-live="polite">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Chargement de la synthèse…
        </div>
      )}

      {error && !loading && (
        <div className="p-3 bg-red-50 text-red-700 rounded text-sm" role="alert">
          Erreur de chargement : {error}
        </div>
      )}

      {!loading && !error && payload && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {payload.kpis.map((k, i) => (
              <div
                key={i}
                className="rounded-md border border-neutral-200 bg-neutral-50 p-3"
                aria-label={`KPI ${k.label}`}
              >
                <div className="text-[11px] uppercase tracking-wide text-neutral-500">{k.label}</div>
                <div className="text-xl font-semibold text-neutral-900 mt-1 tabular-nums">
                  {formatVal(k.value, k.format)}
                </div>
                {typeof k.variation === 'number' && (
                  <div
                    className={`text-xs mt-1 ${
                      k.variation > 0 ? 'text-emerald-600' : k.variation < 0 ? 'text-red-600' : 'text-neutral-500'
                    }`}
                  >
                    {k.variation > 0 ? '▲' : k.variation < 0 ? '▼' : '='} {Math.abs(k.variation).toFixed(1)}%
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Alerts Zone */}
          {showAlerts && payload.alerts.length > 0 && (
            <div
              className="rounded-md border border-amber-200 bg-amber-50 p-3"
              role="alert"
              aria-label="Alertes"
            >
              <div className="flex items-center gap-2 text-amber-800 text-sm font-semibold mb-2">
                <AlertTriangle className="w-4 h-4" />
                Alertes
              </div>
              <ul className="space-y-1 text-sm text-amber-900 list-disc pl-5">
                {payload.alerts.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* Signatures Zone */}
      {showSignatures && (
        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-neutral-200">
          {signatureLabels.map((label, i) => (
            <div key={i} className="text-sm" aria-label={`Signature ${label}`}>
              <div className="flex items-center gap-2 text-neutral-500 text-xs mb-8">
                <PenLine className="w-3.5 h-3.5" />
                {label}
              </div>
              <div className="border-t border-neutral-400 pt-1 text-xs text-neutral-600">
                Signature &amp; cachet
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
