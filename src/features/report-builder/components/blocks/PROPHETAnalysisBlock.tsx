/**
 * PROPH3T Analysis Block — calls analyzeReport() and displays
 * commentaires / recommandations / prédictions / alertes + score gauge.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Sparkles, Loader2, AlertTriangle, Lightbulb, MessageCircle, TrendingUp } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useReportBuilderStore } from '../../store/useReportBuilderStore';
import { analyzeReport, type ReportAnalysisResult } from '../../services/reportAnalysisService';
import type { PROPHETAnalysisBlock } from '../../types';

interface Props {
  block: PROPHETAnalysisBlock;
}

export default function PROPHETAnalysisBlockRenderer({ block }: Props) {
  const { adapter } = useData();
  const period = useReportBuilderStore(s => s.document?.period);

  const [result, setResult] = useState<ReportAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    if (!adapter || !period) return;
    setLoading(true);
    setError(null);
    try {
      const r = await analyzeReport({ adapter, period, scope: block.scope });
      setResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [adapter, period, block.scope]);

  useEffect(() => {
    if (block.autoRun && !result && !loading) {
      void run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.autoRun]);

  const scoreColor = (s: number) =>
    s >= 75 ? 'text-emerald-600' : s >= 50 ? 'text-amber-600' : 'text-red-600';
  const scoreBg = (s: number) =>
    s >= 75 ? 'bg-emerald-500' : s >= 50 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <section
      role="region"
      aria-label={block.title || 'Analyse PROPH3T'}
      className="rounded-lg border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 space-y-4"
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" aria-hidden />
          <h3 className="font-semibold text-neutral-900">
            {block.title || 'Analyse PROPH3T'}
          </h3>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading || !adapter}
          aria-label="Lancer l'analyse PROPH3T"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Analyse en cours…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> Analyser avec PROPH3T
            </>
          )}
        </button>
      </header>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded text-sm" role="alert">
          {error}
        </div>
      )}

      {!result && !loading && !error && (
        <p className="text-sm text-neutral-600">
          Cliquez sur « Analyser avec PROPH3T » pour obtenir commentaires, recommandations,
          prédictions et alertes générés par l\'IA.
        </p>
      )}

      {result && (
        <>
          {/* Score gauge */}
          <div className="flex items-center gap-4 p-3 bg-white rounded-md border border-neutral-200">
            <div className="flex-shrink-0">
              <div className={`text-3xl font-bold tabular-nums ${scoreColor(result.score)}`}>
                {result.score}
                <span className="text-lg text-neutral-400">/100</span>
              </div>
              <div className="text-[11px] text-neutral-500 uppercase tracking-wide">Score santé</div>
            </div>
            <div className="flex-1">
              <div className="w-full h-3 bg-neutral-200 rounded-full overflow-hidden" role="progressbar" aria-valuenow={result.score} aria-valuemin={0} aria-valuemax={100}>
                <div
                  className={`h-full ${scoreBg(result.score)} transition-all`}
                  style={{ width: `${result.score}%` }}
                />
              </div>
              <div className="mt-1 text-[11px] text-neutral-500">
                {result.usedAI ? 'Généré par PROPH3T' : 'Mode heuristique (PROPH3T indisponible)'}
                {' · '}
                {new Date(result.generatedAt).toLocaleString('fr-FR')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Section
              icon={<MessageCircle className="w-4 h-4 text-indigo-600" />}
              title="Commentaires"
              items={result.commentaires}
            />
            <Section
              icon={<Lightbulb className="w-4 h-4 text-amber-600" />}
              title="Recommandations"
              items={result.recommandations}
            />
            <Section
              icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
              title="Prédictions"
              items={result.predictions}
            />
            <Section
              icon={<AlertTriangle className="w-4 h-4 text-red-600" />}
              title="Alertes"
              items={result.alertes}
              variant="alert"
            />
          </div>
        </>
      )}
    </section>
  );
}

function Section({
  icon,
  title,
  items,
  variant,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  variant?: 'alert';
}) {
  return (
    <div
      className={`rounded-md border p-3 ${
        variant === 'alert' ? 'bg-red-50 border-red-200' : 'bg-white border-neutral-200'
      }`}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-neutral-800 mb-2">
        {icon}
        {title}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-neutral-500">Aucun élément.</p>
      ) : (
        <ul className="space-y-1 text-sm text-neutral-700 list-disc pl-5">
          {items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
