/**
 * BudgetSnapshotsPage — /budget/snapshots (refonte OPEX/CAPEX, Lot 7, §24).
 * Gèle l'exécution budgétaire d'un mois clos (immuable + hashé) et vérifie
 * l'intégrité des snapshots existants (invariant 12 : états rejouables).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { getDefaultAnnee } from '../../features/budget/services/budgetService';
import { createSnapshot, listSnapshots, verifySnapshot, type BudgetSnapshot } from '../../features/budget/services/snapshotService';
import { Archive, Loader2, Lock, ShieldCheck, ShieldAlert, Snowflake } from 'lucide-react';

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const BudgetSnapshotsPage: React.FC = () => {
  const { adapter } = useData();
  const [annee, setAnnee] = useState('');
  const [period, setPeriod] = useState(new Date().getMonth() + 1);
  const [rows, setRows] = useState<BudgetSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [verifs, setVerifs] = useState<Record<string, boolean>>({});
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const a = await getDefaultAnnee(adapter);
        const s = await listSnapshots(adapter);
        if (cancelled) return;
        setAnnee((x) => x || a); setRows(s);
      } catch (e: any) { if (!cancelled) setError(e?.message || 'Erreur'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [adapter, refreshKey]);

  const freeze = useCallback(async () => {
    setBusy(true); setError(null); setNotice(null);
    try { const s = await createSnapshot(adapter, annee, period); setNotice(`Snapshot ${s.annee}-${String(s.period).padStart(2, '0')} figé (${s.nb_lignes} mailles).`); setRefreshKey((k) => k + 1); }
    catch (e: any) { setError(e?.message || 'Échec'); } finally { setBusy(false); }
  }, [adapter, annee, period]);

  const verify = useCallback(async (id: string) => {
    const ok = await verifySnapshot(adapter, id);
    setVerifs((v) => ({ ...v, [id]: ok }));
  }, [adapter]);

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      <header>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white flex items-center gap-2"><Archive className="w-6 h-6 text-[#235A6E]" /> Snapshots budgétaires</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Gel immuable + hashé de l'exécution au mois clos — états rejouables.</p>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

      <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4 flex items-end gap-3 flex-wrap">
        <label className="block"><span className="block text-xs text-neutral-500 mb-1">Exercice</span>
          <input value={annee} onChange={(e) => setAnnee(e.target.value)} className="w-28 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 font-mono text-sm" /></label>
        <label className="block"><span className="block text-xs text-neutral-500 mb-1">Mois clos</span>
          <select value={period} onChange={(e) => setPeriod(Number(e.target.value))} className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-sm">
            {MOIS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select></label>
        <button onClick={freeze} disabled={busy || !annee} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#235A6E] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Snowflake className="w-4 h-4" />} Figer le mois
        </button>
      </div>

      <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 text-xs font-medium uppercase tracking-wide text-neutral-500">Snapshots figés</div>
        {loading ? (
          <div className="flex items-center gap-2 text-neutral-500 py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Chargement…</div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-sm text-neutral-500">Aucun snapshot. Figez un mois clos pour rendre ses états rejouables.</div>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-700/50">
            {rows.map((s) => (
              <li key={s.id} className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#235A6E]" />
                  <span className="font-mono">{s.annee}-{String(s.period).padStart(2, '0')}</span>
                  <span className="text-xs text-neutral-400">{s.nb_lignes} mailles · {s.created_at?.slice(0, 10)}</span>
                  <span className="font-mono text-[11px] text-neutral-300" title={s.hash_sha256}>sha256 {s.hash_sha256.slice(0, 12)}…</span>
                </div>
                <div className="flex items-center gap-2">
                  {verifs[s.id] === undefined ? (
                    <button onClick={() => verify(s.id)} className="text-xs text-[#235A6E] dark:text-[#8fc7d6] hover:underline">Vérifier</button>
                  ) : verifs[s.id] ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><ShieldCheck className="w-4 h-4" /> intègre</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-red-600"><ShieldAlert className="w-4 h-4" /> altéré</span>
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

export default BudgetSnapshotsPage;
