/**
 * BudgetAlertesPage — /budget/alertes (refonte OPEX/CAPEX, Lot 4, §15).
 * Alertes OPEX dérivées de v_budget_execution (dépassement, seuils 90 %/75 %).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import { getDefaultAnnee } from '../../features/budget/services/budgetService';
import { computeBudgetAlerts, type BudgetAlert, type AlertSeverity } from '../../features/budget/services/budgetAlertsService';
import { BellRing, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';

const SEV_STYLE: Record<AlertSeverity, string> = {
  P1: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  P2: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  P3: 'bg-[#235A6E]/10 text-[#235A6E] dark:text-[#8fc7d6]',
};

const BudgetAlertesPage: React.FC = () => {
  const { adapter } = useData();
  const [annee, setAnnee] = useState('');
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const a = await getDefaultAnnee(adapter);
        const al = await computeBudgetAlerts(adapter, a);
        if (cancelled) return;
        setAnnee(a); setAlerts(al);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Erreur de chargement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [adapter]);

  const counts = useMemo(() => ({
    P1: alerts.filter((a) => a.severity === 'P1').length,
    P2: alerts.filter((a) => a.severity === 'P2').length,
    P3: alerts.filter((a) => a.severity === 'P3').length,
  }), [alerts]);

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <BellRing className="w-6 h-6 text-[#235A6E]" /> Alertes budgétaires
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Consommation &amp; dépassements OPEX · exercice {annee || '—'}</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {(['P1', 'P2', 'P3'] as AlertSeverity[]).map((s) => (
            <span key={s} className={`px-2.5 py-1 rounded-full font-medium ${SEV_STYLE[s]}`}>{s} · {counts[s]}</span>
          ))}
        </div>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>}

      {loading ? (
        <div className="flex items-center gap-2 text-neutral-500 py-12 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Analyse…</div>
      ) : alerts.length === 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900 px-6 py-10 text-center">
          <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <div className="text-sm text-emerald-700 dark:text-emerald-300">Aucune alerte : toutes les mailles sont sous le seuil de 75 % et sans dépassement.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 px-4 py-3 flex items-center gap-3">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${SEV_STYLE[a.severity]}`}>{a.code}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5">
                  {a.severity === 'P1' && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
                  {a.message}
                </div>
                <div className="text-xs text-neutral-400 mt-0.5 font-mono">
                  Budget {formatCurrency(a.budget)} · Consommé {formatCurrency(a.consomme)} ({Math.round(a.ratio * 100)}%) · Disponible {formatCurrency(a.disponible)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BudgetAlertesPage;
