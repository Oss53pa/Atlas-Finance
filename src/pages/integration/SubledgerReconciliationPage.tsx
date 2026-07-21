/**
 * SubledgerReconciliationPage — réconciliation auxiliaire ↔ général (L5).
 *
 * Réf. docs/integration-suite-atlas/DESIGN.md § L5
 *
 * L'écran qui prouve que la Suite Atlas est auditable : 411 = Atlas Trade,
 * 401 = Atlas Procure, 422 = Atlas People, 3xx = module Stock. Écart au
 * centime, et pour chaque écart la liste des causes réelles (événements en
 * attente, rejets, écritures d'une origine inattendue).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Scale, Loader2, RefreshCw, CheckCircle2, AlertTriangle, PlugZap, ChevronRight } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import {
  buildReconciliationReport,
  getUnexpectedOriginEntries,
  type ReconciliationReport,
} from '../../services/integration/subledgerReconciliation';

const fmt = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const SubledgerReconciliationPage: React.FC = () => {
  const { adapter } = useData();
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getUnexpectedOriginEntries>>>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Les soldes auxiliaires viendront de l'API de chaque satellite (L3).
      // Tant qu'un satellite n'est pas branché, on n'invente PAS un 0 :
      // la ligne reste « non connecté ».
      setReport(await buildReconciliationReport(adapter, {}));
    } finally {
      setLoading(false);
    }
  }, [adapter]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (key: string) => {
    if (expanded === key) { setExpanded(null); setDetail([]); return; }
    setExpanded(key);
    setDetail(await getUnexpectedOriginEntries(adapter, key));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Scale className="w-6 h-6 text-[#235A6E]" /> Réconciliation auxiliaire ↔ général
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Le solde du compte collectif au Grand Livre doit égaler l'auxiliaire tenu par le satellite
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Actualiser
        </button>
      </div>

      {report && (
        <div
          className={`rounded-lg p-3 text-sm flex items-center gap-2 border ${
            report.balanced
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          {report.balanced ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {report.balanced
            ? 'Tous les collectifs connectés sont à l’équilibre.'
            : 'Au moins un collectif présente un écart — voir le détail ci-dessous.'}
        </div>
      )}

      {loading && !report ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-2 font-medium">Compte collectif</th>
                  <th className="px-4 py-2 font-medium">Auxiliaire tenu par</th>
                  <th className="px-4 py-2 font-medium text-right">Solde GL</th>
                  <th className="px-4 py-2 font-medium text-right">Solde auxiliaire</th>
                  <th className="px-4 py-2 font-medium text-right">Écart</th>
                  <th className="px-4 py-2 font-medium text-right">Origine</th>
                  <th className="px-4 py-2 font-medium text-right">Flux</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {report?.rows.map(r => (
                  <React.Fragment key={r.key}>
                    <tr className="border-b border-gray-100">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{r.key} {r.label}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{r.ownerLabel}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmt(r.glBalance)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {r.subledgerBalance === null
                          ? <span className="text-xs text-gray-400">non connecté</span>
                          : fmt(r.subledgerBalance)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {r.gap === null ? (
                          <span className="text-gray-300">—</span>
                        ) : r.gap === 0 ? (
                          <span className="text-emerald-600 font-medium">0</span>
                        ) : (
                          <span className="text-red-600 font-semibold">{fmt(r.gap)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-500">
                        {r.entriesFromOwner} / {r.entriesFromOther > 0
                          ? <span className="text-amber-600 font-medium">{r.entriesFromOther} autre(s)</span>
                          : '0 autre'}
                      </td>
                      <td className="px-4 py-3 text-right text-xs">
                        {r.pendingEvents > 0 && (
                          <span className="text-amber-600">{r.pendingEvents} en attente </span>
                        )}
                        {r.rejectedEvents > 0 && (
                          <span className="text-red-600">{r.rejectedEvents} rejeté(s)</span>
                        )}
                        {r.pendingEvents === 0 && r.rejectedEvents === 0 && (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.entriesFromOther > 0 && (
                          <button
                            onClick={() => toggle(r.key)}
                            className="text-xs text-[#235A6E] hover:underline flex items-center gap-1 ml-auto"
                          >
                            Détail <ChevronRight className={`w-3 h-3 transition-transform ${expanded === r.key ? 'rotate-90' : ''}`} />
                          </button>
                        )}
                      </td>
                    </tr>

                    {expanded === r.key && (
                      <tr className="bg-gray-50">
                        <td colSpan={8} className="px-4 py-3">
                          <div className="text-xs text-gray-600 mb-2 flex items-center gap-2">
                            <PlugZap className="w-3.5 h-3.5" />
                            Écritures du collectif {r.key} qui ne viennent pas de {r.ownerLabel} —
                            contournement du cycle ou régularisation à documenter.
                          </div>
                          {detail.length === 0 ? (
                            <div className="text-xs text-gray-400 py-2">Aucune.</div>
                          ) : (
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-left text-gray-400">
                                  <th className="py-1 font-medium">Date</th>
                                  <th className="py-1 font-medium">Libellé</th>
                                  <th className="py-1 font-medium">Origine</th>
                                  <th className="py-1 font-medium text-right">Montant</th>
                                </tr>
                              </thead>
                              <tbody>
                                {detail.slice(0, 50).map(d => (
                                  <tr key={d.id} className="border-t border-gray-200">
                                    <td className="py-1.5">{d.date}</td>
                                    <td className="py-1.5 text-gray-700">{d.label}</td>
                                    <td className="py-1.5">
                                      <span className="px-1.5 py-0.5 rounded bg-white border border-gray-200">
                                        {d.source}
                                      </span>
                                    </td>
                                    <td className="py-1.5 text-right tabular-nums">{fmt(d.amount)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                          {detail.length > 50 && (
                            <div className="text-[11px] text-gray-400 mt-2">
                              50 premières lignes affichées sur {detail.length}.
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400">
        Source Grand Livre : <code>glHelpers</code> (source unique), écritures validées, brouillons exclus.
      </p>
    </div>
  );
};

export default SubledgerReconciliationPage;
