/**
 * BudgetCockpitProPage — /budget/cockpit-analytique (dashboards style REWISE).
 * Onglets : Overview (P&L mensuel + cartes) · Budget · Variance · Revenus.
 * Construit une vue à la fois (validation itérative). Overview = données réelles
 * (getMonthlyPnL depuis v_budget_execution + v_actual_exploitation).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import { getMonthlyPnL, monthCard, type PnLMonth } from '../../features/budget/services/cockpitService';
import { LayoutDashboard, Loader2, Wallet, PieChart, TrendingUp, Banknote } from 'lucide-react';

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
type Tab = 'overview' | 'budget' | 'variance' | 'revenus';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' }, { id: 'budget', label: 'Budget' },
  { id: 'variance', label: 'Variance Analysis' }, { id: 'revenus', label: 'Revenus' },
];

const fmt = (n: number) => formatCurrency(Math.round(n));
const pct = (num: number, den: number) => (den ? Math.round((num / den) * 100) : 0);

const BudgetCockpitProPage: React.FC = () => {
  const { adapter } = useData();
  const [tab, setTab] = useState<Tab>('overview');
  const [annee, setAnnee] = useState(String(new Date().getFullYear()));
  const [months, setMonths] = useState<PnLMonth[]>([]);
  const [selected, setSelected] = useState<number[]>([new Date().getMonth() + 1]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try { const m = await getMonthlyPnL(adapter, annee); if (!cancelled) setMonths(m); }
      catch (e: any) { if (!cancelled) setError(e?.message || 'Erreur'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [adapter, annee]);

  const toggleMonth = (m: number) => setSelected((s) => s.includes(m) ? (s.length > 1 ? s.filter((x) => x !== m) : s) : [...s, m].sort((a, b) => a - b).slice(-3));
  const yearTotal = useMemo(() => months.reduce((acc, m) => ({
    budget: acc.budget + m.budget.netIncome, actual: acc.actual + m.actual.netIncome, goiA: acc.goiA + m.actual.goi,
  }), { budget: 0, actual: 0, goiA: 0 }), [months]);

  const selMonths = selected.map((p) => months.find((m) => m.period === p)).filter(Boolean) as PnLMonth[];

  // Lignes du P&L (label, accès budget/actual). NOI Margin & % traités à part.
  const ROWS: { key: string; label: string; get: (l: PnLMonth['budget']) => number; strong?: boolean; percent?: boolean }[] = [
    { key: 'goi', label: 'Gross Operating Income', get: (l) => l.goi },
    { key: 'opex', label: 'Operating Expenses', get: (l) => l.opex },
    { key: 'noi', label: 'Net Operating Income (NOI)', get: (l) => l.noi, strong: true },
    { key: 'margin', label: 'NOI Margin', get: () => 0, percent: true },
    { key: 'finInc', label: 'Financial Incomes', get: (l) => l.finInc },
    { key: 'finExp', label: 'Financial Expenses', get: (l) => l.finExp },
    { key: 'resFin', label: 'Résultat Financier', get: (l) => l.resFin, strong: true },
    { key: 'tax', label: 'Tax', get: (l) => l.tax },
    { key: 'net', label: 'Net income / loss', get: (l) => l.netIncome, strong: true },
    { key: 'div', label: 'Dividends paid', get: () => 0 },
  ];

  const cell = (m: PnLMonth, r: typeof ROWS[number], col: 'budget' | 'actual' | 'balance') => {
    if (r.percent) {
      const bm = pct(m.budget.noi, m.budget.goi), am = pct(m.actual.noi, m.actual.goi);
      if (col === 'budget') return `${bm}`; if (col === 'actual') return `${am}`; return `${bm - am}`;
    }
    const b = r.get(m.budget), a = r.get(m.actual);
    if (col === 'budget') return fmt(b); if (col === 'actual') return fmt(a); return fmt(b - a);
  };

  return (
    <div className="p-6 space-y-5">
      {/* Onglets internes */}
      <div className="flex items-center gap-1 border-b border-neutral-200 dark:border-neutral-700 overflow-x-auto">
        {TABS.map((tt) => (
          <button key={tt.id} onClick={() => setTab(tt.id)}
            className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition ${tab === tt.id ? 'border-[#235A6E] text-[#235A6E] dark:text-[#8fc7d6] font-medium' : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'}`}>
            {tt.label}
          </button>
        ))}
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700">{error}</div>}

      {tab !== 'overview' ? (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 px-6 py-16 text-center text-sm text-neutral-500">
          <div className="flex justify-center mb-3 text-neutral-300">
            {tab === 'budget' ? <Wallet className="w-8 h-8" /> : tab === 'variance' ? <PieChart className="w-8 h-8" /> : <TrendingUp className="w-8 h-8" />}
          </div>
          Onglet « {TABS.find((x) => x.id === tab)?.label} » — à construire après validation de l'Overview.
        </div>
      ) : loading ? (
        <div className="flex items-center gap-2 text-neutral-500 py-12 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Chargement…</div>
      ) : (
        <>
          <header className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-white flex items-center gap-2"><LayoutDashboard className="w-5 h-5 text-[#235A6E]" /> Overview</h1>
            <select value={annee} onChange={(e) => setAnnee(e.target.value)} className="px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-sm">
              {[0, 1, 2, 3].map((d) => { const y = new Date().getFullYear() - d; return <option key={y} value={y}>{y}</option>; })}
            </select>
            <span className="text-xs text-neutral-400">Sélectionnez des mois (max 3)</span>
          </header>

          {/* Bande des mois */}
          <div className="flex items-center gap-1 flex-wrap">
            {MOIS.map((mo, i) => {
              const p = i + 1; const on = selected.includes(p);
              return (
                <button key={mo} onClick={() => toggleMonth(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${on ? 'bg-[#235A6E] text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500 hover:text-neutral-800'}`}>
                  {mo}
                </button>
              );
            })}
          </div>

          {/* Cartes par mois sélectionné */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {selMonths.map((m) => {
              const c = monthCard(m);
              return (
                <div key={m.period} className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#E89A2E]/10 flex items-center justify-center text-[#E89A2E] shrink-0"><Banknote className="w-5 h-5" /></div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">{MOIS[m.period - 1]} · {annee}</div>
                      <Row label={`No budgeted`} value={c.noBudget} />
                      <Row label={`Overspent`} value={c.overspent} tone={c.overspent > 0 ? 'danger' : undefined} />
                      <Row label={`Incoming`} value={c.incoming} />
                      <Row label={`Budgeted`} value={c.budgeted} />
                      <div className="border-t border-neutral-100 dark:border-neutral-700 mt-1 pt-1"><Row label="Available to budget" value={c.available} strong /></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tableau P&L par mois (Budgeted / Actual / Balance) */}
          <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-neutral-500 border-b border-neutral-200 dark:border-neutral-700">
                  <th className="px-4 py-3 text-left">&nbsp;</th>
                  {selMonths.map((m) => (
                    <th key={m.period} colSpan={3} className="px-4 py-2 text-center border-l border-neutral-100 dark:border-neutral-700/50">{MOIS[m.period - 1]}</th>
                  ))}
                </tr>
                <tr className="text-[11px] uppercase text-neutral-400 border-b border-neutral-200 dark:border-neutral-700">
                  <th className="px-4 py-2 text-left" />
                  {selMonths.map((m) => (
                    <React.Fragment key={m.period}>
                      <th className="px-4 py-2 text-right border-l border-neutral-100 dark:border-neutral-700/50">Budgeted</th>
                      <th className="px-4 py-2 text-right">Actual</th>
                      <th className="px-4 py-2 text-right">Balance</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.key} className={`border-b border-neutral-100 dark:border-neutral-700/50 ${r.strong ? 'font-medium text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-300'}`}>
                    <td className="px-4 py-2">{r.label}</td>
                    {selMonths.map((m) => (
                      <React.Fragment key={m.period}>
                        <td className="px-4 py-2 text-right font-mono text-xs border-l border-neutral-100 dark:border-neutral-700/50">{cell(m, r, 'budget')}</td>
                        <td className="px-4 py-2 text-right font-mono text-xs">{cell(m, r, 'actual')}</td>
                        <td className="px-4 py-2 text-right font-mono text-xs text-neutral-400">{cell(m, r, 'balance')}</td>
                      </React.Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-neutral-50 dark:bg-neutral-900/40 font-semibold text-neutral-900 dark:text-white">
                  <td className="px-4 py-3">Net Income (year)</td>
                  {selMonths.map((m) => (
                    <td key={m.period} colSpan={3} className="px-4 py-3 text-right font-mono text-xs border-l border-neutral-100 dark:border-neutral-700/50">
                      {fmt(yearTotal.actual)} <span className="text-neutral-400">({pct(yearTotal.actual, yearTotal.goiA)}%)</span>
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-xs text-neutral-400">Mapping SYSCOHADA : GOI = produits 70-76, OpEx = charges 60-65/68, Financier 66/67 & 77, Tax 69/89 (ajustable). Réalisé issu du GL, budget de la version en vigueur.</p>
        </>
      )}
    </div>
  );
};

const Row: React.FC<{ label: string; value: number; tone?: 'danger'; strong?: boolean }> = ({ label, value, tone, strong }) => (
  <div className="flex items-center justify-between text-xs py-0.5">
    <span className={strong ? 'font-semibold text-neutral-800 dark:text-neutral-100' : 'text-neutral-500'}>{label}</span>
    <span className={`font-mono ${tone === 'danger' ? 'text-red-600' : strong ? 'font-semibold text-neutral-900 dark:text-white' : 'text-neutral-700 dark:text-neutral-200'}`}>{formatCurrency(Math.round(value))}</span>
  </div>
);

export default BudgetCockpitProPage;
