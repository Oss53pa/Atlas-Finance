/**
 * Anomaly Detection Block — uses PROPH3T's IsolationForest algorithm
 * to detect anomalous journal entries and display them in a sortable list.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Search, Shield } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useReportBuilderStore } from '../../store/useReportBuilderStore';
import { IsolationForest } from '../../../../services/prophet/algorithms/IsolationForest';
import { useMoneyFormat } from '../../../../hooks/useMoneyFormat';
import type { AnomalyDetectionBlock, PeriodSelection } from '../../types';

interface Props {
  block: AnomalyDetectionBlock;
}

interface Anomaly {
  id: string;
  date: string;
  entryNumber: string;
  journal: string;
  label: string;
  montant: number;
  anomaly_score: number;
  raison: string;
}

interface JournalLineLike {
  debit?: number;
  credit?: number;
}
interface JournalEntryLike {
  id?: string;
  entryNumber?: string;
  date?: string;
  journal?: string;
  label?: string;
  lines?: JournalLineLike[];
  totalDebit?: number;
  totalCredit?: number;
}

function inPeriod(date: string | undefined, period?: PeriodSelection): boolean {
  if (!date) return false;
  if (!period) return true;
  return date >= period.startDate && date <= period.endDate;
}

export default function AnomalyDetectionBlockRenderer({ block }: Props) {
  const { adapter } = useData();
  const period = useReportBuilderStore(s => s.document?.period);
  const fmtMoney = useMoneyFormat();

  const [anomalies, setAnomalies] = useState<Anomaly[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensitivity = block.sensitivity ?? 0.5;
  const maxResults = block.maxResults ?? 20;
  // Threshold inversely related to sensitivity (higher sensitivity → lower threshold → more flagged)
  const threshold = 1 - Math.min(1, Math.max(0, sensitivity)) * 0.5; // range 0.5..1.0

  const run = useCallback(async () => {
    if (!adapter) return;
    setLoading(true);
    setError(null);
    try {
      const raw = (await adapter.getAll('journalEntries')) as JournalEntryLike[];
      const candidates = raw
        .filter(e => inPeriod(e.date, period))
        .map(e => ({
          id: e.id ?? `${e.entryNumber ?? ''}-${e.date ?? ''}`,
          entryNumber: e.entryNumber ?? '',
          date: e.date ?? '',
          journal: e.journal ?? '',
          label: e.label ?? '',
          montant: e.totalDebit ?? e.totalCredit ?? (e.lines || []).reduce((s, l) => s + (l.debit || 0), 0),
          debit: e.totalDebit ?? 0,
          credit: e.totalCredit ?? 0,
        }));

      if (candidates.length === 0) {
        setAnomalies([]);
        return;
      }

      const forest = new IsolationForest();
      const detected = forest.detectAnomalies(candidates, threshold) as Array<Record<string, unknown>>;
      const formatted: Anomaly[] = detected.slice(0, maxResults).map((a) => ({
        id: String(a.id ?? ''),
        date: String(a.date ?? ''),
        entryNumber: String(a.entryNumber ?? ''),
        journal: String(a.journal ?? ''),
        label: String(a.label ?? ''),
        montant: Number(a.montant ?? 0),
        anomaly_score: Number(a.anomaly_score ?? 0),
        raison: String(a.raison ?? ''),
      }));
      setAnomalies(formatted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur détection anomalies');
    } finally {
      setLoading(false);
    }
  }, [adapter, period, threshold, maxResults]);

  useEffect(() => {
    if (adapter && !anomalies && !loading) {
      void run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, period?.startDate, period?.endDate]);

  return (
    <section
      role="region"
      aria-label={block.title || "Détection d'anomalies"}
      className="rounded-lg border border-red-200 bg-gradient-to-br from-red-50 to-white p-5 space-y-4"
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-600" aria-hidden />
          <h3 className="font-semibold text-neutral-900">
            {block.title || "Détection d'Anomalies (Isolation Forest)"}
          </h3>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading || !adapter}
          aria-label="Relancer la détection"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Analyser
        </button>
      </header>

      <div className="text-xs text-neutral-600">
        Sensibilité : {(sensitivity * 100).toFixed(0)}% · Seuil : {threshold.toFixed(2)} · Max : {maxResults}
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded text-sm" role="alert">
          {error}
        </div>
      )}

      {loading && !anomalies && (
        <div className="flex items-center justify-center py-6 text-neutral-500" aria-live="polite">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Analyse en cours…
        </div>
      )}

      {anomalies && anomalies.length === 0 && !loading && (
        <div className="p-3 bg-emerald-50 text-emerald-700 rounded text-sm">
          Aucune anomalie détectée sur la période.
        </div>
      )}

      {anomalies && anomalies.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Liste des anomalies">
            <thead className="text-[11px] uppercase tracking-wide text-neutral-500 border-b border-neutral-200">
              <tr>
                <th className="text-left py-2 px-2">Date</th>
                <th className="text-left py-2 px-2">N° Pièce</th>
                <th className="text-left py-2 px-2">Journal</th>
                <th className="text-left py-2 px-2">Libellé</th>
                <th className="text-right py-2 px-2">Montant</th>
                <th className="text-right py-2 px-2">Score</th>
                <th className="text-left py-2 px-2">Raison</th>
              </tr>
            </thead>
            <tbody>
              {anomalies.map((a, i) => (
                <tr key={a.id || i} className="border-b border-neutral-100 hover:bg-red-50/40">
                  <td className="py-1.5 px-2 tabular-nums">{a.date}</td>
                  <td className="py-1.5 px-2 tabular-nums">{a.entryNumber}</td>
                  <td className="py-1.5 px-2">{a.journal}</td>
                  <td className="py-1.5 px-2 truncate max-w-[200px]">{a.label}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums">{fmtMoney(a.montant)}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums">
                    <span className={`inline-flex items-center gap-1 ${
                      a.anomaly_score >= 0.9 ? 'text-red-700' : a.anomaly_score >= 0.8 ? 'text-amber-700' : 'text-neutral-700'
                    }`}>
                      <AlertTriangle className="w-3 h-3" />
                      {a.anomaly_score.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-xs text-neutral-600">{a.raison}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
