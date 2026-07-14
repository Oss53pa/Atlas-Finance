/**
 * CapexReaffectationPage — /capex/reaffectations (refonte OPEX/CAPEX, Lot 5, §18.4).
 * Reconversion de fonds appropriés : réaffectable = approprié − engagé ferme −
 * réalisé du CAR source ; transit par l'enveloppe (jamais de transfert direct).
 * Registre proposée → approuvée / rejetée.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import { listCapexRequests, type CapexRequest } from '../../features/budget/services/budgetService';
import {
  computeReaffectable, createReaffectation, listReaffectations, setReaffectationStatut,
  type Reaffectation, type ReaffectableInfo,
} from '../../features/budget/services/reaffectationService';
import { Shuffle, Loader2, Check, X, ArrowRight } from 'lucide-react';

const CapexReaffectationPage: React.FC = () => {
  const { adapter } = useData();
  const [sources, setSources] = useState<CapexRequest[]>([]);
  const [rows, setRows] = useState<Reaffectation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  // formulaire
  const [sourceId, setSourceId] = useState('');
  const [info, setInfo] = useState<ReaffectableInfo | null>(null);
  const [montant, setMontant] = useState('');
  const [motif, setMotif] = useState('');
  const [cibleId, setCibleId] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const [reqs, ra] = await Promise.all([listCapexRequests(adapter), listReaffectations(adapter)]);
        if (cancelled) return;
        setSources(reqs); setRows(ra);
      } catch (e: any) { if (!cancelled) setError(e?.message || 'Erreur'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [adapter, refreshKey]);

  const emitted = useMemo(() => sources.filter((s) => ['car_emis', 'fonds_disponibles'].includes(s.statut as string)), [sources]);
  const nameOf = useCallback((id: string | null) => (id ? sources.find((s) => s.id === id)?.libelle ?? '—' : '—'), [sources]);

  const pickSource = useCallback(async (id: string) => {
    setSourceId(id); setInfo(null); setMontant('');
    if (!id) return;
    try { const i = await computeReaffectable(adapter, id); setInfo(i); } catch (e: any) { setError(e?.message || 'Erreur'); }
  }, [adapter]);

  const propose = useCallback(async () => {
    setError(null); setNotice(null);
    try {
      if (!sourceId) throw new Error('Sélectionnez un CAR source.');
      await createReaffectation(adapter, { sourceRequestId: sourceId, cibleRequestId: cibleId || null, montant: Number(montant), motif });
      setNotice('Réaffectation proposée.'); setSourceId(''); setInfo(null); setMontant(''); setMotif(''); setCibleId(''); setRefreshKey((k) => k + 1);
    } catch (e: any) { setError(e?.message || 'Échec'); }
  }, [adapter, sourceId, cibleId, montant, motif]);

  const decide = useCallback(async (id: string, statut: 'approuvee' | 'rejetee') => {
    setBusyId(id); setError(null);
    try { await setReaffectationStatut(adapter, id, statut); setRefreshKey((k) => k + 1); }
    catch (e: any) { setError(e?.message || 'Échec'); } finally { setBusyId(null); }
  }, [adapter]);

  return (
    <div className="p-6 space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2"><Shuffle className="w-6 h-6 text-[var(--color-primary)]" /> Réaffectations CAPEX</h1>
        <p className="text-sm text-[var(--color-text-secondary)] dark:text-[var(--color-text-tertiary)]">Réaffectable = approprié − engagé ferme − réalisé · transit par l'enveloppe.</p>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

      {/* Proposer */}
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-5 space-y-3">
        <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Proposer une réaffectation</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block"><span className="block text-xs text-[var(--color-text-secondary)] mb-1">CAR source (fonds appropriés)</span>
            <select value={sourceId} onChange={(e) => pickSource(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm">
              <option value="">—</option>{emitted.map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
            </select>
          </label>
          <label className="block"><span className="block text-xs text-[var(--color-text-secondary)] mb-1">BC cible (optionnel)</span>
            <select value={cibleId} onChange={(e) => setCibleId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm">
              <option value="">— (retour à l'enveloppe)</option>{sources.map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
            </select>
          </label>
        </div>
        {info && (
          <div className="text-xs text-[var(--color-text-secondary)] font-mono bg-[var(--color-surface-hover)] rounded-lg px-3 py-2">
            Approprié {formatCurrency(info.approprie)} − Engagé {formatCurrency(info.engage)} − Réalisé {formatCurrency(info.realise)} = <span className="text-[var(--color-primary)] dark:text-[var(--color-primary)] font-semibold">réaffectable {formatCurrency(info.reaffectable)}</span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input type="number" value={montant} onChange={(e) => setMontant(e.target.value)} placeholder="Montant à réaffecter" className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-mono" />
          <input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Motif" className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm sm:col-span-1" />
          <button onClick={propose} disabled={!sourceId} className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium disabled:opacity-50">Proposer</button>
        </div>
      </div>

      {/* Registre */}
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)] text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">Registre des réaffectations</div>
        {loading ? (
          <div className="flex items-center gap-2 text-[var(--color-text-secondary)] py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Chargement…</div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-sm text-[var(--color-text-secondary)]">Aucune réaffectation.</div>
        ) : (
          <ul className="divide-y divide-[var(--color-border-light)]">
            {rows.map((r) => (
              <li key={r.id} className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-200">
                    <span className="truncate max-w-[160px]">{nameOf(r.source_request_id)}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] shrink-0" />
                    <span className="truncate max-w-[160px]">{r.cible_request_id ? nameOf(r.cible_request_id) : 'enveloppe'}</span>
                  </div>
                  {r.motif && <div className="text-xs text-[var(--color-text-tertiary)] truncate">{r.motif}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono">{formatCurrency(r.montant)}</span>
                  {r.statut === 'proposee' ? (
                    <>
                      <button disabled={busyId === r.id} onClick={() => decide(r.id, 'approuvee')} className="p-1.5 rounded-lg text-[var(--color-text-tertiary)] hover:text-emerald-600 hover:bg-neutral-100 dark:hover:bg-neutral-700">{busyId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}</button>
                      <button disabled={busyId === r.id} onClick={() => decide(r.id, 'rejetee')} className="p-1.5 rounded-lg text-[var(--color-text-tertiary)] hover:text-red-600 hover:bg-neutral-100 dark:hover:bg-neutral-700"><X className="w-4 h-4" /></button>
                    </>
                  ) : (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.statut === 'approuvee' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{r.statut}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CapexReaffectationPage;
