/**
 * BudgetPnLPage — /budget/pnl (refonte OPEX/CAPEX, Lot 4, §14.2).
 *
 * Compte de résultat budgétaire (P&L de gestion SYSCOHADA) : cascade Produits →
 * Marge → EBE → Résultat, en Budget / Réalisé / Écart / N-1 / Δ N-1. Valeurs
 * signées (contribution au résultat) : un écart est FAVORABLE dès réalisé > budget.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import { getDefaultAnnee } from '../../features/budget/services/budgetService';
import { computePnLBudget, type PnLLine } from '../../features/budget/services/pnlBudgetService';
import { Scale, Loader2, TrendingUp, TrendingDown } from 'lucide-react';

const BudgetPnLPage: React.FC = () => {
  const { adapter } = useData();
  const [annee, setAnnee] = useState('');
  const [lines, setLines] = useState<PnLLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const a = await getDefaultAnnee(adapter);
        const res = await computePnLBudget(adapter, a);
        if (cancelled) return;
        setAnnee(a); setLines(res.lines);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Erreur de chargement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [adapter]);

  const resultat = useMemo(() => lines.find((l) => l.key === 'resultat') ?? null, [lines]);

  const Ecart: React.FC<{ l: PnLLine }> = ({ l }) => {
    const e = Math.round((l.realise - l.budget) * 100) / 100;
    if (l.budget === 0 && l.realise === 0) return <span className="text-neutral-300">—</span>;
    const fav = e >= 0;
    return (
      <span className={`inline-flex items-center gap-1 ${fav ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
        {fav ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
        {formatCurrency(Math.abs(e))}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <Scale className="w-6 h-6 text-[#235A6E]" /> Compte de résultat budgétaire
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">P&amp;L de gestion SYSCOHADA · exercice {annee || '—'}</p>
        </div>
        {resultat && (
          <div className="text-right">
            <div className="text-xs text-neutral-500 uppercase tracking-wide">Résultat de gestion (réalisé)</div>
            <div className={`font-mono text-xl font-semibold ${resultat.realise >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(resultat.realise)}
            </div>
          </div>
        )}
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>}

      {loading ? (
        <div className="flex items-center gap-2 text-neutral-500 py-12 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Chargement…</div>
      ) : (
        <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-neutral-500 border-b border-neutral-200 dark:border-neutral-700">
                <th className="px-4 py-3 text-left">Rubrique</th>
                <th className="px-4 py-3 text-right">Budget</th>
                <th className="px-4 py-3 text-right">Réalisé</th>
                <th className="px-4 py-3 text-right">Écart</th>
                <th className="px-4 py-3 text-right">N-1</th>
                <th className="px-4 py-3 text-right">Δ N-1</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const isTotal = l.level === 'total';
                const isSub = l.level === 'subtotal';
                const dN1 = Math.round((l.realise - l.n1) * 100) / 100;
                return (
                  <tr key={l.key}
                    className={`border-b border-neutral-100 dark:border-neutral-700/50 ${
                      isTotal ? 'bg-[#235A6E]/10 font-semibold text-neutral-900 dark:text-white'
                      : isSub ? 'bg-neutral-50 dark:bg-neutral-900/40 font-medium' : ''}`}>
                    <td className={`px-4 py-2.5 ${isTotal || isSub ? '' : 'pl-6 text-neutral-600 dark:text-neutral-300'}`}>{l.label}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">{formatCurrency(l.budget)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">{formatCurrency(l.realise)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs"><Ecart l={l} /></td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-neutral-400">{formatCurrency(l.n1)}</td>
                    <td className={`px-4 py-2.5 text-right font-mono text-xs ${dN1 >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(dN1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-neutral-400">
        Valeurs signées (produits +, charges −) : un écart favorable = réalisé &gt; budget. Réalisé issu du grand livre (classe 6/7), budget de la version en vigueur.
      </p>
    </div>
  );
};

export default BudgetPnLPage;
