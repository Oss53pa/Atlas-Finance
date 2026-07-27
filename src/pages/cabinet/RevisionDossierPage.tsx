/**
 * RevisionDossierPage — dossier de révision par cycles (mode cabinet).
 *
 * Feuilles maîtresses par cycle SYSCOHADA : soldes N/N-1, variation, points
 * d'attention automatiques, et statut de révision + note par cycle (le cabinet
 * coche chaque cycle au fur et à mesure).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, Loader2, Download, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../contexts/DataContext';
import type { DBFiscalYear } from '../../lib/db';
import {
  buildRevisionDossier,
  saveCycleReview,
  revisionDossierToCSV,
  type RevisionDossier,
  type CycleRevisionStatus,
} from '../../services/cabinet/revisionCyclesService';

const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

const STATUS_META: Record<CycleRevisionStatus, { label: string; cls: string }> = {
  a_reviser: { label: 'À réviser', cls: 'bg-gray-100 text-gray-600' },
  en_cours: { label: 'En cours', cls: 'bg-blue-50 text-blue-700' },
  revise: { label: 'Révisé', cls: 'bg-emerald-50 text-emerald-700' },
  anomalie: { label: 'Anomalie', cls: 'bg-red-50 text-red-700' },
};

const RevisionDossierPage: React.FC = () => {
  const { adapter } = useData();
  const [years, setYears] = useState<DBFiscalYear[]>([]);
  const [yearId, setYearId] = useState('');
  const [dossier, setDossier] = useState<RevisionDossier | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const rows = (await adapter.getAll<DBFiscalYear>('fiscalYears')) ?? [];
      const sorted = [...rows].sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''));
      setYears(sorted);
      if (sorted[0]) setYearId(sorted[0].id);
    })();
  }, [adapter]);

  const year = useMemo(() => years.find(y => y.id === yearId), [years, yearId]);
  const priorYear = useMemo(() => {
    if (!year) return undefined;
    return years.find(y => (y.endDate ?? '') < (year.startDate ?? ''));
  }, [years, year]);

  const load = useCallback(async () => {
    if (!year) { toast.error('Sélectionnez un exercice'); return; }
    setLoading(true);
    try {
      setDossier(await buildRevisionDossier(adapter, {
        exerciceId: year.id,
        exerciceLabel: year.name,
        currentRange: { startDate: year.startDate, endDate: year.endDate },
        priorRange: priorYear ? { startDate: priorYear.startDate, endDate: priorYear.endDate } : undefined,
      }));
    } finally {
      setLoading(false);
    }
  }, [adapter, year, priorYear]);

  const setStatus = async (code: string, status: CycleRevisionStatus) => {
    if (!year) return;
    await saveCycleReview(adapter, year.id, code, { status });
    await load();
  };
  const setNote = async (code: string, note: string) => {
    if (!year) return;
    await saveCycleReview(adapter, year.id, code, { note });
    toast.success('Note enregistrée');
  };

  const exportCsv = () => {
    if (!dossier) return;
    const blob = new Blob(['﻿' + revisionDossierToCSV(dossier)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `dossier-revision-${year?.name ?? 'exercice'}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-[#235A6E]" /> Dossier de révision
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Feuilles maîtresses par cycle — soldes, variation N/N-1 et points d'attention
          </p>
        </div>
        {dossier && (
          <div className="text-right">
            <div className="text-2xl font-bold text-[#235A6E]">{dossier.completion}%</div>
            <div className="text-xs text-gray-500">cycles révisés</div>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Exercice</label>
          <select value={yearId} onChange={e => { setYearId(e.target.value); setDossier(null); }}
            className="px-3 py-2 border border-gray-300 rounded text-sm">
            {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
          </select>
        </div>
        <button onClick={load} disabled={loading || !year}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-[#235A6E] text-white rounded-lg hover:bg-[#1c4a5b] disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Ouvrir le dossier
        </button>
        {dossier && (
          <button onClick={exportCsv} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        )}
        {priorYear && <span className="text-xs text-gray-400 ml-auto">Comparatif N-1 : {priorYear.name}</span>}
      </div>

      {dossier && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-2">Cycle</th>
                <th className="px-4 py-2 text-right">Solde N</th>
                <th className="px-4 py-2 text-right">Solde N-1</th>
                <th className="px-4 py-2 text-right">Variation</th>
                <th className="px-4 py-2 text-center">Points</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {dossier.cycles.map(c => (
                <React.Fragment key={c.code}>
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-2 font-medium text-gray-900">{c.label}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmt(c.soldeN)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-500">{fmt(c.soldeN1)}</td>
                    <td className={`px-4 py-2 text-right tabular-nums ${c.variation !== 0 ? 'font-medium' : 'text-gray-400'}`}>
                      {fmt(c.variation)}{c.variationPct !== null ? <span className="text-xs text-gray-400"> ({c.variationPct}%)</span> : null}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {c.pointsAttention.length > 0 ? (
                        <button onClick={() => setExpanded(expanded === c.code ? null : c.code)}
                          className="inline-flex items-center gap-1 text-xs text-red-600">
                          <AlertTriangle className="w-3.5 h-3.5" /> {c.pointsAttention.length}
                        </button>
                      ) : <CheckCircle2 className="w-4 h-4 text-emerald-500 inline" />}
                    </td>
                    <td className="px-4 py-2">
                      <select value={c.status} onChange={e => setStatus(c.code, e.target.value as CycleRevisionStatus)}
                        className={`text-xs px-2 py-1 rounded border-0 ${STATUS_META[c.status].cls}`}>
                        {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => setExpanded(expanded === c.code ? null : c.code)}
                        className="text-gray-400 hover:text-gray-600">
                        <ChevronRight className={`w-4 h-4 transition-transform ${expanded === c.code ? 'rotate-90' : ''}`} />
                      </button>
                    </td>
                  </tr>
                  {expanded === c.code && (
                    <tr className="bg-gray-50">
                      <td colSpan={7} className="px-4 py-3 space-y-2">
                        {c.pointsAttention.length > 0 && (
                          <div className="space-y-1">
                            {c.pointsAttention.map((p, i) => (
                              <div key={i} className="text-xs text-red-700 flex items-center gap-2">
                                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="font-mono">{p.accountCode}</span>
                                <span>{p.message}</span>
                                <span className="tabular-nums ml-auto">{fmt(p.amount)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <textarea
                          defaultValue={c.note ?? ''}
                          onBlur={e => setNote(c.code, e.target.value)}
                          placeholder="Note de révision (diligences, conclusions)…"
                          className="w-full text-xs border border-gray-200 rounded p-2 min-h-[3rem]"
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400">
        Points d'attention automatiques : client créditeur, fournisseur débiteur, compte de trésorerie
        créditeur. Source : glHelpers (écritures validées).
      </p>
    </div>
  );
};

export default RevisionDossierPage;
