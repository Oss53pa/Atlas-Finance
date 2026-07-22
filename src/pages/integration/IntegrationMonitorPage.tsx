/**
 * IntegrationMonitorPage — supervision des flux de la Suite Atlas (L6.2).
 *
 * Réf. docs/integration-suite-atlas/DESIGN.md § L6.2
 *
 * « 3 factures Trade non intégrées depuis 2 jours » doit se voir ICI, pas se
 * découvrir au moment de la clôture. Chaque événement rejeté est un trou dans
 * l'auxiliaire — et donc un écart de réconciliation garanti.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Loader2, RefreshCw, Play, RotateCcw, AlertTriangle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../contexts/DataContext';
import {
  getFlowHealth,
  processPendingEvents,
  replayEvent,
  type FlowHealth,
} from '../../services/integration/integrationBus';
import { SATELLITE_LABELS, type IntegrationEvent } from '../../services/integration/types';

const IntegrationMonitorPage: React.FC = () => {
  const { adapter } = useData();
  const [health, setHealth] = useState<FlowHealth[]>([]);
  const [rejected, setRejected] = useState<IntegrationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setHealth(await getFlowHealth(adapter));
      const all = await adapter.getAll<IntegrationEvent>('integrationEvents', {
        where: { status: 'rejected' },
        limit: 100,
      });
      setRejected(all);
    } catch {
      setHealth([]);
      setRejected([]);
    } finally {
      setLoading(false);
    }
  }, [adapter]);

  useEffect(() => { load(); }, [load]);

  const runProcessing = async () => {
    setProcessing(true);
    try {
      const r = await processPendingEvents(adapter);
      toast.success(
        `${r.processed} événement(s) traité(s) — ${r.posted} comptabilisé(s), ${r.rejected} rejeté(s)`,
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur de traitement');
    } finally {
      setProcessing(false);
    }
  };

  const replay = async (id: string) => {
    await replayEvent(adapter, id);
    toast.success('Événement remis en file');
    await load();
  };

  const totalPending = health.reduce((s, h) => s + h.pending, 0);
  const stale = health.filter(h => (h.oldestPendingAgeHours ?? 0) >= 24);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-[#235A6E]" /> Supervision des flux — Suite Atlas
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Faits de gestion reçus d'Atlas Trade, Atlas Procure et Atlas People
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={runProcessing}
            disabled={processing || totalPending === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-[#235A6E] text-white rounded-lg hover:bg-[#1c4a5b] disabled:opacity-50"
          >
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Traiter la file ({totalPending})
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" /> Actualiser
          </button>
        </div>
      </div>

      {stale.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900 flex gap-2">
          <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            {stale.map(h => `${SATELLITE_LABELS[h.sourceSystem as never] ?? h.sourceSystem} : ` +
              `${h.pending} en attente depuis ${h.oldestPendingAgeHours} h`).join(' · ')}
          </span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : health.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-sm text-gray-400">
          Aucun flux reçu. Les satellites ne sont pas encore branchés sur cet environnement,
          ou le socle d'intégration n'est pas déployé.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {health.map(h => (
            <div key={h.sourceSystem} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="font-semibold text-gray-900 mb-3">
                {SATELLITE_LABELS[h.sourceSystem as never] ?? h.sourceSystem}
              </div>
              <dl className="space-y-1.5 text-sm">
                <Stat label="Comptabilisés" value={h.posted} tone="ok" />
                <Stat label="En attente" value={h.pending} tone={h.pending > 0 ? 'warn' : 'muted'} />
                <Stat label="Rejetés" value={h.rejected} tone={h.rejected > 0 ? 'bad' : 'muted'} />
                <Stat label="Ignorés (engagements)" value={h.ignored} tone="muted" />
              </dl>
              {h.oldestPendingAgeHours !== null && (
                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                  Plus ancien en attente : {h.oldestPendingAgeHours} h
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {rejected.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-red-50 border-b border-red-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="font-semibold text-sm text-red-900">
              {rejected.length} événement(s) rejeté(s) — autant de trous dans l'auxiliaire
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                  <th className="px-4 py-2 font-medium">Document</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">Motif</th>
                  <th className="px-4 py-2 font-medium">Tentatives</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {rejected.map(e => (
                  <tr key={e.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2 font-medium text-gray-900">{e.sourceDocId}</td>
                    <td className="px-4 py-2 text-xs text-gray-600">{e.eventType}</td>
                    <td className="px-4 py-2">
                      <div className="text-xs font-medium text-red-700">{e.errorCode}</div>
                      <div className="text-xs text-gray-500 max-w-md">{e.errorDetail}</div>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">{e.attempts}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => replay(e.id)}
                        className="text-xs text-[#235A6E] hover:underline flex items-center gap-1 ml-auto"
                      >
                        <RotateCcw className="w-3 h-3" /> Rejouer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 border-t border-gray-200">
            Corriger d'abord la règle de détermination (NO_POSTING_RULE) ou la période
            (PERIOD_CLOSED), puis rejouer. L'idempotence garantit l'absence de doublon.
          </div>
        </div>
      )}
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number; tone: 'ok' | 'warn' | 'bad' | 'muted' }> = ({
  label, value, tone,
}) => {
  const color =
    tone === 'ok' ? 'text-emerald-600'
    : tone === 'warn' ? 'text-amber-600'
    : tone === 'bad' ? 'text-red-600'
    : 'text-gray-400';
  return (
    <div className="flex items-center justify-between">
      <dt className="text-gray-500 text-xs">{label}</dt>
      <dd className={`font-semibold tabular-nums ${color}`}>{value}</dd>
    </div>
  );
};

export default IntegrationMonitorPage;
