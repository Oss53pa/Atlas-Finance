/**
 * IntegrationKeysPage — clés de service des satellites (L3.1).
 *
 * Réf. docs/integration-suite-atlas/DESIGN.md § L3.1
 *
 * Le secret s'affiche UNE SEULE FOIS, à la création. Ensuite il n'existe plus
 * nulle part en clair : seule son empreinte SHA-256 est stockée. On ne
 * « retrouve » pas une clé perdue — on la révoque et on en émet une nouvelle.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, Loader2, Plus, ShieldOff, Copy, Check, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../contexts/DataContext';
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  type IntegrationApiKey,
} from '../../services/integration/apiKeysService';
import { SATELLITE_LABELS, SATELLITE_SYSTEMS, type SatelliteSystem } from '../../services/integration/types';

const INGEST_URL = 'https://vgtmljfayiysuvrcmunt.supabase.co/functions/v1/integration-ingest';

const IntegrationKeysPage: React.FC = () => {
  const { adapter } = useData();
  const [keys, setKeys] = useState<IntegrationApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [system, setSystem] = useState<SatelliteSystem>('atlas_trade');
  const [label, setLabel] = useState('');
  const [revealed, setRevealed] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setKeys(await listApiKeys(adapter));
    } catch {
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }, [adapter]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    setCreating(true);
    try {
      const { secret } = await createApiKey(adapter, system, label);
      setRevealed(secret);
      setCopied(false);
      setLabel('');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Création impossible');
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (k: IntegrationApiKey) => {
    await revokeApiKey(adapter, k.id);
    toast.success('Clé révoquée');
    await load();
  };

  const copy = async () => {
    if (!revealed) return;
    await navigator.clipboard.writeText(revealed);
    setCopied(true);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <KeyRound className="w-6 h-6 text-[#235A6E]" /> Clés de service — Suite Atlas
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Une clé par satellite. C'est l'application qui s'authentifie, pas l'utilisateur.
        </p>
      </div>

      {revealed && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
            <AlertTriangle className="w-4 h-4" />
            Copiez cette clé maintenant — elle ne sera plus jamais affichée
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-white border border-amber-200 rounded font-mono text-sm break-all">
              {revealed}
            </code>
            <button
              onClick={copy}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-amber-600 text-white rounded hover:bg-amber-700"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copié' : 'Copier'}
            </button>
          </div>
          <div className="text-xs text-amber-800">
            Seule son empreinte SHA-256 est enregistrée. En cas de perte : révoquer et réémettre.
          </div>
          <button
            onClick={() => setRevealed(null)}
            className="text-xs text-amber-900 underline"
          >
            J'ai copié la clé, masquer
          </button>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-sm font-semibold text-gray-900 mb-3">Émettre une clé</div>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Satellite</label>
            <select
              value={system}
              onChange={e => setSystem(e.target.value as SatelliteSystem)}
              className="px-3 py-2 border border-gray-300 rounded text-sm"
            >
              {SATELLITE_SYSTEMS.map(s => (
                <option key={s} value={s}>{SATELLITE_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[16rem]">
            <label className="block text-xs text-gray-500 mb-1">Libellé (traçabilité)</label>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="ex. Production — instance principale"
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            />
          </div>
          <button
            onClick={create}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-[#235A6E] text-white rounded-lg hover:bg-[#1c4a5b] disabled:opacity-50"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Émettre
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : keys.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">
            Aucune clé émise. Aucun satellite ne peut encore alimenter le Grand Livre.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-2 font-medium">Satellite</th>
                <th className="px-4 py-2 font-medium">Libellé</th>
                <th className="px-4 py-2 font-medium">Empreinte</th>
                <th className="px-4 py-2 font-medium">Dernier usage</th>
                <th className="px-4 py-2 font-medium">État</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2 font-medium text-gray-900">
                    {SATELLITE_LABELS[k.sourceSystem] ?? k.sourceSystem}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{k.label}</td>
                  <td className="px-4 py-2">
                    <code className="text-xs text-gray-400">{String(k.keyHash ?? '').slice(0, 12)}…</code>
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString('fr-FR') : 'jamais'}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        k.active
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {k.active ? 'active' : 'révoquée'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {k.active && (
                      <button
                        onClick={() => revoke(k)}
                        className="text-xs text-red-600 hover:underline flex items-center gap-1 ml-auto"
                      >
                        <ShieldOff className="w-3 h-3" /> Révoquer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-600 space-y-2">
        <div className="font-semibold text-gray-800">Appel côté satellite</div>
        <pre className="bg-white border border-gray-200 rounded p-3 overflow-x-auto">
{`POST ${INGEST_URL}
x-atlas-key: <la clé>
idempotency-key: trade:<n° document>:issued
Content-Type: application/json

{ "event_type": "sale.invoice.issued",
  "source_doc_id": "TRD-2026-0412",
  "occurred_at": "2026-07-22T09:00:00Z",
  "payload": { "docNumber": "...", "docDate": "...", "currency": "XOF",
               "thirdParty": { "code": "C0042" }, "lines": [ ... ] } }`}
        </pre>
        <div>
          Réponse <strong>202</strong> = fait accepté et journalisé. Un rejeu de la même
          <code className="mx-1">idempotency-key</code> renvoie <strong>200</strong> sans effet de bord.
        </div>
      </div>
    </div>
  );
};

export default IntegrationKeysPage;
