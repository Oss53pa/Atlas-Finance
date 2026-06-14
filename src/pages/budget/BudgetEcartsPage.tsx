/**
 * BudgetEcartsPage — /budget/ecarts (CDC V3 §6).
 * Analyse d'écarts : favorable/défavorable, waterfall budget→réalisé, heatmap
 * mois × postes. Données live v_budget_vs_actual — zéro mock.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import { getBudgetVsActual, type BudgetVsActualRow } from '../../features/budget/services/budgetService';
import { ArrowLeft, TrendingUp } from 'lucide-react';

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const BudgetEcartsPage: React.FC = () => {
  const { adapter } = useData();
  const navigate = useNavigate();
  const [rows, setRows] = useState<BudgetVsActualRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try { const r = await getBudgetVsActual(adapter); if (!cancelled) setRows(r); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [adapter]);

  // Écarts par nature (2 chiffres) cumulés
  const parNature = useMemo(() => {
    const m = new Map<string, { code: string; budget: number; realise: number; ecart: number }>();
    for (const r of rows) {
      const code = r.account_code.slice(0, 2);
      if (!m.has(code)) m.set(code, { code, budget: 0, realise: 0, ecart: 0 });
      const e = m.get(code)!; e.budget += r.budget; e.realise += r.realise; e.ecart += r.ecart;
    }
    return Array.from(m.values()).sort((a, b) => Math.abs(b.ecart) - Math.abs(a.ecart));
  }, [rows]);

  const totals = useMemo(() => {
    const budget = rows.reduce((s, r) => s + r.budget, 0);
    const realise = rows.reduce((s, r) => s + r.realise, 0);
    return { budget, realise, ecart: realise - budget };
  }, [rows]);

  // Heatmap : nature × mois
  const heatmap = useMemo(() => {
    const natures = [...new Set(rows.map(r => r.account_code.slice(0, 2)))].sort();
    const grid = natures.map(code => {
      const cells = MOIS.map((_, i) => rows.filter(r => r.account_code.slice(0, 2) === code && r.period === i + 1).reduce((s, r) => s + r.ecart, 0));
      return { code, cells };
    });
    const maxAbs = Math.max(1, ...grid.flatMap(g => g.cells.map(Math.abs)));
    return { grid, maxAbs };
  }, [rows]);

  if (loading) return <div className="p-8 text-center text-[var(--color-text-tertiary)]">Chargement…</div>;

  if (rows.length === 0) {
    return (
      <div className="p-6 bg-[var(--color-border)] min-h-full">
        <div className="bg-white rounded-xl p-8 border border-[var(--color-border)] text-center">
          <TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Aucun écart à analyser : aucune version budgétaire active avec des montants.</p>
          <button onClick={() => navigate('/budget/import')} className="mt-4 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm">Importer un budget</button>
        </div>
      </div>
    );
  }

  const cellColor = (v: number) => {
    if (v === 0) return 'transparent';
    const intensity = Math.min(1, Math.abs(v) / heatmap.maxAbs);
    // vert = favorable (réalisé > budget pour produit, < pour charge — ici écart signé), rouge = défavorable
    return v >= 0 ? `rgba(21,128,61,${0.12 + intensity * 0.55})` : `rgba(192,50,43,${0.12 + intensity * 0.55})`;
  };

  return (
    <div className="p-6 bg-[var(--color-border)] min-h-full space-y-6">
      <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm flex items-center gap-3">
        <button onClick={() => navigate('/budget/cockpit')} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"><ArrowLeft className="w-4 h-4" /></button>
        <div>
          <h1 className="text-lg font-bold text-[var(--color-primary)]">Analyse des Écarts</h1>
          <p className="text-sm text-[var(--color-text-tertiary)]">Réalisé − budget · favorable (vert) / défavorable (rouge)</p>
        </div>
      </div>

      {/* Waterfall simplifié budget → réalisé */}
      <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm">
        <h2 className="font-semibold text-[var(--color-primary)] mb-4">Du budget au réalisé</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm"><span className="text-gray-600">Budget total</span><span className="font-semibold">{formatCurrency(totals.budget)}</span></div>
          {parNature.filter(n => n.ecart !== 0).slice(0, 10).map(n => (
            <div key={n.code} className="flex items-center gap-3">
              <span className="text-xs font-mono text-gray-500 w-8">{n.code}</span>
              <div className="flex-1 h-5 bg-gray-100 rounded relative overflow-hidden">
                <div className="absolute top-0 bottom-0" style={{
                  left: n.ecart >= 0 ? '50%' : undefined, right: n.ecart < 0 ? '50%' : undefined,
                  width: `${Math.min(50, (Math.abs(n.ecart) / (totals.budget || 1)) * 100 * 3)}%`,
                  background: n.ecart >= 0 ? 'rgba(21,128,61,.6)' : 'rgba(192,50,43,.6)',
                }} />
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-300" />
              </div>
              <span className={`text-xs font-medium w-28 text-right ${n.ecart >= 0 ? 'text-green-600' : 'text-red-600'}`}>{n.ecart >= 0 ? '+' : ''}{formatCurrency(n.ecart)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between text-sm border-t border-[var(--color-border)] pt-2 mt-2">
            <span className="text-gray-700 font-semibold">Réalisé total</span>
            <span className="font-bold">{formatCurrency(totals.realise)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Écart global</span>
            <span className={`font-bold ${totals.ecart >= 0 ? 'text-green-600' : 'text-red-600'}`}>{totals.ecart >= 0 ? '+' : ''}{formatCurrency(totals.ecart)}</span>
          </div>
        </div>
      </div>

      {/* Heatmap mois × nature */}
      <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm overflow-x-auto">
        <h2 className="font-semibold text-[var(--color-primary)] mb-4">Heatmap des écarts (mois × nature)</h2>
        <table className="text-xs border-collapse">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left text-gray-500 sticky left-0 bg-white">Nature</th>
              {MOIS.map(m => <th key={m} className="px-2 py-1 text-center text-gray-500 w-14">{m}</th>)}
            </tr>
          </thead>
          <tbody>
            {heatmap.grid.map(g => (
              <tr key={g.code}>
                <td className="px-2 py-1 font-mono text-gray-600 sticky left-0 bg-white">{g.code}</td>
                {g.cells.map((v, i) => (
                  <td key={i} className="px-1 py-1 text-center" style={{ background: cellColor(v) }} title={`${MOIS[i]} : ${formatCurrency(v)}`}>
                    {v !== 0 ? Math.round(v / 1000).toLocaleString('fr-FR') : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[10px] text-gray-400 mt-2">Valeurs en milliers FCFA. Vert = favorable, rouge = défavorable.</p>
      </div>
    </div>
  );
};

export default BudgetEcartsPage;
