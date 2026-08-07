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
import { useLanguage } from '@/contexts/LanguageContext';


const BudgetSnapshotsPage: React.FC = () => {
  const { adapter } = useData();
  const { t } = useLanguage();
  const MOIS = React.useMemo(() => t('budgetSnapshots.monthsShort').split(','), [t]);
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
      } catch (e: any) { if (!cancelled) setError(e?.message || t('budgetSnapshots.error')); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [adapter, refreshKey, t]);

  const freeze = useCallback(async () => {
    setBusy(true); setError(null); setNotice(null);
    try { const s = await createSnapshot(adapter, annee, period); setNotice(t('budgetSnapshots.frozen', { period: `${s.annee}-${String(s.period).padStart(2, '0')}`, count: String(s.nb_lignes) })); setRefreshKey((k) => k + 1); }
    catch (e: any) { setError(e?.message || t('budgetSnapshots.failed')); } finally { setBusy(false); }
  }, [adapter, annee, period, t]);

  const verify = useCallback(async (id: string) => {
    const ok = await verifySnapshot(adapter, id);
    setVerifs((v) => ({ ...v, [id]: ok }));
  }, [adapter]);

  return (
    <div className="p-6 space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2"><Archive className="w-6 h-6 text-[var(--color-primary)]" /> {t('budgetSnapshots.title')}</h1>
        <p className="text-sm text-[var(--color-text-secondary)] dark:text-[var(--color-text-tertiary)]">{t('budgetSnapshots.subtitle')}</p>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm p-4 flex items-end gap-3 flex-wrap">
        <label className="block"><span className="block text-xs text-[var(--color-text-secondary)] mb-1">{t('budgetSnapshots.fiscalYear')}</span>
          <input value={annee} onChange={(e) => setAnnee(e.target.value)} className="w-28 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] font-mono text-sm" /></label>
        <label className="block"><span className="block text-xs text-[var(--color-text-secondary)] mb-1">{t('budgetSnapshots.closedMonth')}</span>
          <select value={period} onChange={(e) => setPeriod(Number(e.target.value))} className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm">
            {MOIS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select></label>
        <button onClick={freeze} disabled={busy || !annee} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Snowflake className="w-4 h-4" />} {t('budgetSnapshots.freezeMonth')}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)] text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">{t('budgetSnapshots.frozenSnapshots')}</div>
        {loading ? (
          <div className="flex items-center gap-2 text-[var(--color-text-secondary)] py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> {t('budgetSnapshots.loading')}</div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-sm text-[var(--color-text-secondary)]">{t('budgetSnapshots.empty')}</div>
        ) : (
          <ul className="divide-y divide-[var(--color-border-light)]">
            {rows.map((s) => (
              <li key={s.id} className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[var(--color-primary)]" />
                  <span className="font-mono">{s.annee}-{String(s.period).padStart(2, '0')}</span>
                  <span className="text-xs text-[var(--color-text-tertiary)]">{t('budgetSnapshots.cellsAndDate', { count: String(s.nb_lignes), date: s.created_at?.slice(0, 10) ?? '' })}</span>
                  <span className="font-mono text-[11px] text-neutral-300" title={s.hash_sha256}>sha256 {s.hash_sha256.slice(0, 12)}…</span>
                </div>
                <div className="flex items-center gap-2">
                  {verifs[s.id] === undefined ? (
                    <button onClick={() => verify(s.id)} className="text-xs text-[var(--color-primary)] dark:text-[var(--color-primary)] hover:underline">{t('budgetSnapshots.verify')}</button>
                  ) : verifs[s.id] ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><ShieldCheck className="w-4 h-4" /> {t('budgetSnapshots.intact')}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-red-600"><ShieldAlert className="w-4 h-4" /> {t('budgetSnapshots.altered')}</span>
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
