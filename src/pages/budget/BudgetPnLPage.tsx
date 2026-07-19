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
import { useAccountNames } from '../../hooks/useAccountNames';
import { Scale, Loader2, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';

const BudgetPnLPage: React.FC = () => {
  const { adapter } = useData();
  const { label: acctLabel } = useAccountNames();
  const [annee, setAnnee] = useState('');
  const [lines, setLines] = useState<PnLLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (k: string) => setOpen((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

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

  const Ecart: React.FC<{ budget: number; realise: number }> = ({ budget, realise }) => {
    const e = Math.round((realise - budget) * 100) / 100;
    if (budget === 0 && realise === 0) return <span className="text-neutral-300">—</span>;
    const fav = e >= 0;
    return (
      <span className={`inline-flex items-center gap-1 ${fav ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
        {fav ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
        {formatCurrency(Math.abs(e))}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-5">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            <Scale className="w-6 h-6 text-[var(--color-primary)]" /> Compte de résultat budgétaire
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] dark:text-[var(--color-text-tertiary)]">P&amp;L de gestion SYSCOHADA · exercice {annee || '—'}</p>
        </div>
        {resultat && (
          <div className="text-right">
            <div className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wide">Résultat de gestion (réalisé)</div>
            <div className={`font-mono text-xl font-semibold ${resultat.realise >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(resultat.realise)}
            </div>
          </div>
        )}
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>}

      {loading ? (
        <div className="flex items-center gap-2 text-[var(--color-text-secondary)] py-12 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Chargement…</div>
      ) : (
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-600 border-b border-[var(--color-border)]">
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
                const hasDetail = !!l.accounts && l.accounts.length > 0;
                const isOpen = open.has(l.key);
                return (
                  <React.Fragment key={l.key}>
                    <tr
                      onClick={hasDetail ? () => toggle(l.key) : undefined}
                      className={`border-b border-[var(--color-border-light)] ${hasDetail ? 'cursor-pointer hover:bg-gray-50' : ''} ${
                        isTotal ? 'bg-[var(--color-primary-light)] font-semibold text-[var(--color-text-primary)]'
                        : isSub ? 'bg-[var(--color-surface-hover)] font-medium' : ''}`}>
                      <td className={`px-4 py-2.5 ${isTotal || isSub ? '' : 'pl-6 text-[var(--color-text-secondary)]'}`}>
                        {hasDetail && <ChevronRight className={`w-3.5 h-3.5 inline-block mr-1 -ml-4 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />}
                        {l.label}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">{formatCurrency(l.budget)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">{formatCurrency(l.realise)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs"><Ecart budget={l.budget} realise={l.realise} /></td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-[var(--color-text-tertiary)]">{formatCurrency(l.n1)}</td>
                      <td className={`px-4 py-2.5 text-right font-mono text-xs ${dN1 >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(dN1)}</td>
                    </tr>
                    {isOpen && l.accounts!.map((a) => {
                      const adN1 = Math.round((a.realise - a.n1) * 100) / 100;
                      return (
                        <tr key={a.code} className="bg-gray-50/40 border-b border-[var(--color-border-light)] text-xs">
                          <td className="px-4 py-1.5 pl-11"><span className="font-mono text-gray-500">{a.code}</span> <span className="text-gray-600">{acctLabel(a.code)}</span></td>
                          <td className="px-4 py-1.5 text-right font-mono text-gray-500">{formatCurrency(a.budget)}</td>
                          <td className="px-4 py-1.5 text-right font-mono text-gray-700">{formatCurrency(a.realise)}</td>
                          <td className="px-4 py-1.5 text-right font-mono"><Ecart budget={a.budget} realise={a.realise} /></td>
                          <td className="px-4 py-1.5 text-right font-mono text-[var(--color-text-tertiary)]">{formatCurrency(a.n1)}</td>
                          <td className={`px-4 py-1.5 text-right font-mono ${adN1 >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(adN1)}</td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-[var(--color-text-tertiary)]">
        Valeurs signées (produits +, charges −) : un écart favorable = réalisé &gt; budget. Réalisé issu du grand livre (classe 6/7), budget de la version en vigueur. <strong>N-1</strong> = réalisé de l'exercice précédent depuis la comptabilité (0 si aucune écriture N-1). Cliquez une rubrique pour déplier le détail par compte.
      </p>
    </div>
  );
};

export default BudgetPnLPage;
