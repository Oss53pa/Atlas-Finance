/**
 * CapexPriorisationPage — /capex/priorisation (refonte OPEX/CAPEX, Lot 5, §17).
 *
 * Arbitrage du portefeuille : BC soumis classés par score composite, ligne de
 * flottaison cumulée vs enveloppe (au-dessus = servi, en dessous = sous l'eau).
 * Décisions de séance (approuver / ajourner / rejeter). Scoring 100 % code.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import { listCapexRequests } from '../../features/budget/services/budgetService';
import { updateBcFields } from '../../features/budget/services/capexBcService';
import { computeRanking, listCriteria, type BcScoringInput, type RankedBc, type ScoringCritere } from '../../features/budget/services/capexScoringService';
import { Trophy, Loader2, Check, Clock, X, Waves } from 'lucide-react';

function getClient(adapter: any): any | null {
  const c = (adapter as any).client;
  return adapter.getMode?.() === 'saas' && c ? c : null;
}

const CapexPriorisationPage: React.FC = () => {
  const { adapter } = useData();
  const navigate = useNavigate();
  const [items, setItems] = useState<BcScoringInput[]>([]);
  const [criteria, setCriteria] = useState<ScoringCritere[]>([]);
  const [enveloppe, setEnveloppe] = useState('0');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const [reqs, crit] = await Promise.all([listCapexRequests(adapter), listCriteria(adapter)]);
        const candidates = reqs.filter((r) => ['soumis', 'en_priorisation'].includes(r.statut as string));
        // risque moyen P×I par BC
        const client = getClient(adapter);
        const riskByReq: Record<string, number> = {};
        if (client && candidates.length) {
          const { data } = await client.from('capex_bc_risques').select('request_id,probabilite,impact')
            .in('request_id', candidates.map((c) => c.id));
          const agg: Record<string, { s: number; n: number }> = {};
          for (const r of (data || [])) { const k = r.request_id; (agg[k] ??= { s: 0, n: 0 }); agg[k].s += r.probabilite * r.impact; agg[k].n += 1; }
          for (const [k, v] of Object.entries(agg)) riskByReq[k] = v.n ? v.s / v.n : 0;
        }
        const mapped: BcScoringInput[] = candidates.map((r) => ({
          id: r.id, libelle: r.libelle, montant: r.montant || 0, van: r.van ?? null, tri: r.tri ?? null,
          paybackMois: (r as any).payback_simple_mois ?? null, categorie: r.categorie ?? null,
          riskPI: riskByReq[r.id] || 0, obligatoire: !!(r as any).obligatoire, urgence: !!(r as any).urgence,
        }));
        if (cancelled) return;
        setItems(mapped); setCriteria(crit);
        setEnveloppe((e) => (e === '0' ? String(mapped.reduce((s, m) => s + m.montant, 0)) : e));
      } catch (e: any) { if (!cancelled) setError(e?.message || 'Erreur'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [adapter, refreshKey]);

  const ranked: RankedBc[] = useMemo(
    () => computeRanking(items, criteria, Number(enveloppe) || 0),
    [items, criteria, enveloppe],
  );
  const passeCount = ranked.filter((r) => r.passe).length;
  const passeMontant = ranked.filter((r) => r.passe).reduce((s, r) => s + r.montant, 0);

  const decide = useCallback(async (id: string, statut: 'approuve' | 'ajourne' | 'rejete') => {
    setBusyId(id); setError(null); setNotice(null);
    try { await updateBcFields(adapter, id, { statut }); setNotice(`BC ${statut}.`); setRefreshKey((k) => k + 1); }
    catch (e: any) { setError(e?.message || 'Échec'); } finally { setBusyId(null); }
  }, [adapter]);

  return (
    <div className="p-6 space-y-5">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2"><Trophy className="w-6 h-6 text-[var(--color-primary)]" /> Priorisation du portefeuille</h1>
          <p className="text-sm text-[var(--color-text-secondary)] dark:text-[var(--color-text-tertiary)]">{ranked.length} BC en lice · {passeCount} servi(s) · {formatCurrency(passeMontant)} sous l'enveloppe</p>
        </div>
        <label className="text-sm text-[var(--color-text-secondary)] flex items-center gap-2">
          Enveloppe
          <input type="number" value={enveloppe} onChange={(e) => setEnveloppe(e.target.value)}
            className="w-40 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] font-mono text-sm" />
        </label>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

      {loading ? (
        <div className="flex items-center gap-2 text-[var(--color-text-secondary)] py-12 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Chargement…</div>
      ) : ranked.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-border)] px-6 py-12 text-center text-sm text-[var(--color-text-secondary)]">Aucun BC soumis à arbitrer. Soumettez des Business Cases depuis le portefeuille.</div>
      ) : (
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Business Case</th>
                <th className="px-4 py-3 text-right">Score</th>
                <th className="px-4 py-3 text-right">Montant</th>
                <th className="px-4 py-3 text-right">Cumul</th>
                <th className="px-4 py-3 text-right">VAN</th>
                <th className="px-4 py-3 text-left">Catégorie</th>
                <th className="px-4 py-3 text-right">Décision</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r, i) => {
                const prev = ranked[i - 1];
                const waterlineHere = prev && prev.passe && !r.passe;
                return (
                  <React.Fragment key={r.id}>
                    {waterlineHere && (
                      <tr><td colSpan={8} className="px-4 py-1 bg-blue-50 dark:bg-blue-950/30 text-[11px] text-blue-600 dark:text-blue-300"><span className="inline-flex items-center gap-1"><Waves className="w-3.5 h-3.5" /> Ligne de flottaison — enveloppe {formatCurrency(Number(enveloppe) || 0)}</span></td></tr>
                    )}
                    <tr className={`border-b border-[var(--color-border-light)] ${!r.passe ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3 text-[var(--color-text-tertiary)]">{i + 1}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => navigate(`/capex/bc/${r.id}`)} className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-primary)]">{r.libelle}</button>
                        {r.obligatoire && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">obligatoire</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-[var(--color-primary)] dark:text-[var(--color-primary)]">{r.score.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(r.montant)}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-[var(--color-text-tertiary)]">{formatCurrency(r.cumul)}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{r.van != null ? formatCurrency(r.van) : '—'}</td>
                      <td className="px-4 py-3 text-xs text-[var(--color-text-secondary)]">{r.categorie ? r.categorie.replace(/_/g, ' ') : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button title="Approuver" disabled={busyId === r.id} onClick={() => decide(r.id, 'approuve')} className="p-1.5 rounded-lg text-[var(--color-text-tertiary)] hover:text-emerald-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-40">{busyId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}</button>
                          <button title="Ajourner" disabled={busyId === r.id} onClick={() => decide(r.id, 'ajourne')} className="p-1.5 rounded-lg text-[var(--color-text-tertiary)] hover:text-amber-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-40"><Clock className="w-4 h-4" /></button>
                          <button title="Rejeter" disabled={busyId === r.id} onClick={() => decide(r.id, 'rejete')} className="p-1.5 rounded-lg text-[var(--color-text-tertiary)] hover:text-red-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-40"><X className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CapexPriorisationPage;
