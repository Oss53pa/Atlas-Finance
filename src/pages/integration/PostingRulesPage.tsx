/**
 * PostingRulesPage — détermination comptable de la Suite Atlas (L2.3).
 *
 * Réf. docs/integration-suite-atlas/DESIGN.md § L2.3
 *
 * Même mental model que /stock/gl-setup : (événement × rôle × clé) → comptes.
 * C'est le SEUL endroit où l'on décide quel compte SYSCOHADA porte quel rôle
 * fonctionnel. Un trou de paramétrage se voit ici, pas après le rejet du
 * premier événement d'un satellite.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Settings, Loader2, Save, Info, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../contexts/DataContext';
import { getAccountLabel } from '../../utils/accountLabels';
import {
  getPostingRules,
  upsertPostingRule,
  invalidatePostingRulesCache,
} from '../../services/integration/postingRulesService';
import {
  EVENT_JOURNAL,
  EVENT_OWNER,
  LINE_ROLE_LABELS,
  NON_POSTING_EVENTS,
  SATELLITE_LABELS,
  type IntegrationEventType,
  type PostingRule,
} from '../../services/integration/types';

type Patch = Partial<Pick<PostingRule, 'debitAccount' | 'creditAccount' | 'active'>>;

const PostingRulesPage: React.FC = () => {
  const { adapter } = useData();
  const [rules, setRules] = useState<PostingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState<Record<string, Patch>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      invalidatePostingRulesCache();
      setRules(await getPostingRules(adapter));
      setDirty({});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, [adapter]);

  useEffect(() => { load(); }, [load]);

  const edit = (id: string, field: keyof Patch, value: string | boolean) =>
    setDirty(d => ({ ...d, [id]: { ...d[id], [field]: value } }));

  const valueOf = (r: PostingRule, field: 'debitAccount' | 'creditAccount') =>
    (dirty[r.id]?.[field] as string | undefined) ?? r[field] ?? '';

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const [id, patch] of Object.entries(dirty)) {
        await upsertPostingRule(adapter, { id, ...patch } as any);
      }
      toast.success('Détermination comptable enregistrée');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  /** Groupement par type d'événement, satellites dans l'ordre du cycle. */
  const grouped = useMemo(() => {
    const byEvent = new Map<string, PostingRule[]>();
    for (const r of rules) {
      if (!byEvent.has(r.eventType)) byEvent.set(r.eventType, []);
      byEvent.get(r.eventType)!.push(r);
    }
    return [...byEvent.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rules]);

  /** Types d'événements comptabilisables SANS aucune règle → alerte. */
  const uncovered = useMemo(() => {
    const covered = new Set(rules.map(r => r.eventType));
    return (Object.keys(EVENT_OWNER) as IntegrationEventType[]).filter(
      t => !NON_POSTING_EVENTS.includes(t) && !covered.has(t),
    );
  }, [rules]);

  const hasDirty = Object.keys(dirty).length > 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#235A6E]" /> Détermination comptable — Suite Atlas
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Traduction des faits de gestion des satellites en comptes SYSCOHADA
          </p>
        </div>
        <button
          onClick={saveAll}
          disabled={!hasDirty || saving}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-[#235A6E] text-white rounded-lg hover:bg-[#1c4a5b] disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Enregistrer
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex gap-2">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          Atlas Trade, Atlas Procure et Atlas People envoient un <strong>fait de gestion</strong> (facture,
          réception, bulletin) — jamais une écriture. Ces règles décident du compte porté par chaque rôle.
          Un rôle sans règle fait <strong>rejeter</strong> l'événement : aucun compte n'est deviné.
        </span>
      </div>

      {uncovered.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            <strong>{uncovered.length} type(s) d'événement sans aucune règle</strong> : {uncovered.join(', ')}.
            Tout événement de ce type sera rejeté (NO_POSTING_RULE).
          </span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-gray-400 text-sm">
          Aucune règle. Le socle d'intégration n'est pas déployé sur cet environnement,
          ou la migration de seed n'a pas été appliquée.
        </div>
      ) : (
        grouped.map(([eventType, list]) => (
          <div key={eventType} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div>
                <span className="font-semibold text-sm text-gray-900">{eventType}</span>
                <span className="ml-3 text-xs text-gray-500">
                  {SATELLITE_LABELS[EVENT_OWNER[eventType as IntegrationEventType]] ?? '—'}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                Journal {EVENT_JOURNAL[eventType as IntegrationEventType] ?? 'OD'}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                    <th className="px-4 py-2 font-medium">Rôle</th>
                    <th className="px-4 py-2 font-medium">Clé</th>
                    <th className="px-4 py-2 font-medium">Compte débit</th>
                    <th className="px-4 py-2 font-medium">Compte crédit</th>
                    <th className="px-4 py-2 font-medium">Tiers</th>
                  </tr>
                </thead>
                <tbody>
                  {list
                    .sort((a, b) => a.lineRole.localeCompare(b.lineRole) || a.matchKey.localeCompare(b.matchKey))
                    .map(r => (
                      <tr key={r.id} className="border-b border-gray-100 last:border-0">
                        <td className="px-4 py-2">
                          <div className="text-gray-900">
                            {LINE_ROLE_LABELS[r.lineRole as keyof typeof LINE_ROLE_LABELS] ?? r.lineRole}
                          </div>
                          <div className="text-[11px] text-gray-400">{r.lineRole}</div>
                        </td>
                        <td className="px-4 py-2">
                          {r.matchKey ? (
                            <span className="px-2 py-0.5 rounded bg-gray-100 text-xs text-gray-700">{r.matchKey}</span>
                          ) : (
                            <span className="text-xs text-gray-400">défaut</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <AccountCell
                            value={valueOf(r, 'debitAccount')}
                            onChange={v => edit(r.id, 'debitAccount', v)}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <AccountCell
                            value={valueOf(r, 'creditAccount')}
                            onChange={v => edit(r.id, 'creditAccount', v)}
                          />
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-500">
                          {r.thirdParty ? 'oui' : '—'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

/** Saisie d'un compte + libellé résolu (règle projet : jamais un code nu). */
const AccountCell: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <div>
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="—"
      className="w-28 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#235A6E]"
    />
    {value && (
      <div className="text-[11px] text-gray-400 mt-0.5 max-w-[14rem] truncate">
        {getAccountLabel(value)}
      </div>
    )}
  </div>
);

export default PostingRulesPage;
