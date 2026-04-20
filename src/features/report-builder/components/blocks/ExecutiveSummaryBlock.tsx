/**
 * Executive Summary Block — auto-generates 3-5 bullet-point key findings
 * via PROPH3T (analyzeReport). Bullets are editable manually.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { FileText, Loader2, Sparkles, Edit3, Check, X } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useReportBuilderStore } from '../../store/useReportBuilderStore';
import { analyzeReport } from '../../services/reportAnalysisService';
import type { ExecutiveSummaryBlock } from '../../types';

interface Props {
  block: ExecutiveSummaryBlock;
}

export default function ExecutiveSummaryBlockRenderer({ block }: Props) {
  const { adapter } = useData();
  const period = useReportBuilderStore(s => s.document?.period);
  const updateBlock = useReportBuilderStore(s => s.updateBlock);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>('');

  const bullets = block.bullets ?? [];

  const run = useCallback(async () => {
    if (!adapter || !period) return;
    setLoading(true);
    setError(null);
    try {
      const r = await analyzeReport({ adapter, period, scope: 'global' });
      // Build 3-5 bullets from commentaires + recommandations
      const candidates = [...r.commentaires, ...r.recommandations].slice(0, 5);
      const newBullets = candidates.length > 0 ? candidates : ['Aucune synthèse disponible.'];
      updateBlock(block.id, {
        bullets: newBullets,
        generatedAt: new Date().toISOString(),
      } as Partial<ExecutiveSummaryBlock>);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de génération');
    } finally {
      setLoading(false);
    }
  }, [adapter, period, block.id, updateBlock]);

  useEffect(() => {
    if (block.autoRun && bullets.length === 0 && !loading) {
      void run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.autoRun]);

  const startEdit = () => {
    setDraft(bullets.join('\n'));
    setEditing(true);
  };

  const saveEdit = () => {
    const next = draft
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);
    updateBlock(block.id, { bullets: next } as Partial<ExecutiveSummaryBlock>);
    setEditing(false);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  return (
    <section
      role="region"
      aria-label={block.title || 'Synthèse exécutive'}
      className="rounded-lg border border-neutral-200 bg-white p-5 space-y-3"
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-neutral-700" aria-hidden />
          <h3 className="font-semibold text-neutral-900">
            {block.title || 'Synthèse Exécutive'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {!editing && (
            <button
              type="button"
              onClick={startEdit}
              aria-label="Éditer la synthèse"
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-neutral-600 hover:bg-neutral-100"
            >
              <Edit3 className="w-3.5 h-3.5" /> Éditer
            </button>
          )}
          <button
            type="button"
            onClick={run}
            disabled={loading || !adapter}
            aria-label="Générer avec PROPH3T"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Générer
          </button>
        </div>
      </header>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded text-sm" role="alert">
          {error}
        </div>
      )}

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={Math.max(4, draft.split('\n').length)}
            className="w-full text-sm border border-neutral-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-neutral-900"
            aria-label="Bullets de la synthèse"
            placeholder="Une ligne par point clé"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={saveEdit}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-600 text-white text-xs hover:bg-emerald-700"
            >
              <Check className="w-3.5 h-3.5" /> Enregistrer
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-neutral-200 text-neutral-700 text-xs hover:bg-neutral-300"
            >
              <X className="w-3.5 h-3.5" /> Annuler
            </button>
          </div>
        </div>
      ) : bullets.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Cliquez sur « Générer » pour obtenir 3 à 5 points clés générés par PROPH3T.
        </p>
      ) : (
        <ul className="list-disc pl-5 space-y-1 text-sm text-neutral-800">
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}

      {block.generatedAt && !editing && (
        <div className="text-[11px] text-neutral-400">
          Dernière génération : {new Date(block.generatedAt).toLocaleString('fr-FR')}
        </div>
      )}
    </section>
  );
}
