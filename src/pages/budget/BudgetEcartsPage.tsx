/**
 * BudgetEcartsPage — /budget/ecarts (CDC V3 §6).
 * Analyse d'écarts : favorable/défavorable, waterfall budget→réalisé, heatmap
 * mois × postes. Données live v_budget_vs_actual — zéro mock.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAccountNames } from '../../hooks/useAccountNames';
import { formatCurrency } from '../../utils/formatters';
import { getBudgetVsActual, type BudgetVsActualRow } from '../../features/budget/services/budgetService';
import { askProph3t, isProph3tCoreConfigured } from '../../lib/proph3t';
import PageHeaderActions from '../../components/ui/PageHeaderActions';
import { ArrowLeft, TrendingUp, AlertTriangle, Bot, Search } from 'lucide-react';

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

// Libellés SYSCOHADA des rubriques (préfixe 2 chiffres) — charges & produits.
const RUB_LABELS: Record<string, string> = {
  '60': 'Achats et variations de stocks', '61': 'Transports', '62': 'Services extérieurs A',
  '63': 'Services extérieurs B', '64': 'Impôts et taxes', '65': 'Autres charges',
  '66': 'Charges de personnel', '67': 'Frais financiers', '68': 'Dotations aux amort. & provisions',
  '69': 'Dotations HAO / Impôts sur le résultat',
  '70': 'Ventes', '71': 'Subventions d’exploitation', '72': 'Production immobilisée',
  '73': 'Variations de stocks de produits', '75': 'Autres produits', '77': 'Revenus financiers',
  '78': 'Transferts de charges', '79': 'Reprises de provisions',
};
const rubLabel = (code: string) => RUB_LABELS[code] || '';

const BudgetEcartsPage: React.FC = () => {
  const { adapter } = useData();
  const { format: fmtAccount } = useAccountNames();
  const navigate = useNavigate();
  const [rows, setRows] = useState<BudgetVsActualRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [prophet, setProphet] = useState<string | null>(null);
  const [prophetLoading, setProphetLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpand = (code: string) => setExpanded(prev => {
    const n = new Set(prev); n.has(code) ? n.delete(code) : n.add(code); return n;
  });
  // Comptes composant l'écart d'une nature (2 chiffres) — drill-down du waterfall.
  const detailForNature = (code: string) =>
    rows.filter(r => r.account_code.slice(0, 2) === code)
      .sort((a, b) => Math.abs(b.ecart) - Math.abs(a.ecart));

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

  // Alertes de dépassement (substitut @atlas/insights) : charges en sur-réalisation
  // (>10% du budget) = défavorable ; produits en sous-réalisation = défavorable.
  const alertes = useMemo(() => {
    return parNature.filter(n => {
      if (n.budget === 0) return false;
      const pct = ((n.realise - n.budget) / Math.abs(n.budget)) * 100;
      const classe = n.code[0];
      return classe === '6' ? pct > 10 : (classe === '7' ? pct < -10 : false);
    }).map(n => ({ ...n, pct: Math.round(((n.realise - n.budget) / Math.abs(n.budget)) * 100), classe: n.code[0] }));
  }, [parNature]);

  const runProphet = async () => {
    setProphetLoading(true); setProphet(null);
    try {
      const lignes = parNature.filter(n => n.budget !== 0).slice(0, 12)
        .map(n => `${n.code} (classe ${n.code[0]}): budget ${Math.round(n.budget)}, réalisé ${Math.round(n.realise)}, écart ${Math.round(n.ecart)}`).join(' ; ');
      const res = await askProph3t({
        message: `En tant qu'analyste de gestion SYSCOHADA, commente brièvement (5 lignes max, en français) ces écarts budgétaires sans recalculer ni inventer de chiffres. Identifie les dépassements de charges et les manques de produits, et propose 2 actions. Données: ${lignes}. Écart global réalisé−budget: ${Math.round(totals.ecart)}.`,
        sensitivity: 'confidential',
      });
      setProphet(res.answer || 'Aucun commentaire.');
    } catch (e: any) {
      setProphet('PROPH3T indisponible : ' + (e?.message || 'erreur'));
    } finally { setProphetLoading(false); }
  };

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
          <button onClick={() => navigate('/budget/table')} className="mt-4 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm">Importer un budget</button>
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
        <div className="flex-1">
          <h1 className="text-lg font-bold text-[var(--color-primary)]">Analyse des Écarts</h1>
          <p className="text-sm text-[var(--color-text-tertiary)]">Réalisé − budget · favorable (vert) / défavorable (rouge)</p>
        </div>
        {isProph3tCoreConfigured() && (
          <button onClick={runProphet} disabled={prophetLoading} className="px-3 py-2 text-sm border border-[var(--color-primary)] text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)]/5 flex items-center gap-2 disabled:opacity-50">
            <Bot className="w-4 h-4" /> {prophetLoading ? 'Analyse…' : 'Commentaire PROPH3T'}
          </button>
        )}
        <PageHeaderActions
          onToggleFilters={() => setFiltersOpen(o => !o)}
          filtersOpen={filtersOpen}
          activeFilters={q ? 1 : 0}
          printTitle="Analyse des Écarts budgétaires"
        />
      </div>

      {filtersOpen && (
        <div className="bg-white rounded-xl p-4 border border-[var(--color-border)] shadow-sm flex flex-wrap items-center gap-4 print-hide">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filtrer par nature (ex. 60, 70…)" className="pl-8 pr-3 py-1.5 text-sm border border-[var(--color-border)] rounded-lg w-72" />
          </div>
        </div>
      )}

      {/* Alertes de dépassement */}
      {alertes.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-800 font-semibold text-sm mb-2"><AlertTriangle className="w-4 h-4" />{alertes.length} dépassement(s) significatif(s)</div>
          <div className="flex flex-wrap gap-2">
            {alertes.map(a => (
              <span key={a.code} className="text-xs bg-white border border-red-200 rounded-full px-2.5 py-1 text-red-700">
                <span className="font-mono">{a.code}</span> {a.classe === '6' ? 'charges' : 'produits'} {a.pct >= 0 ? '+' : ''}{a.pct}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Commentaire PROPH3T (advisory, jamais les chiffres) */}
      {prophet && (
        <div className="bg-white rounded-xl p-5 border border-[var(--color-primary)]/30 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--color-primary)] font-semibold text-sm mb-2"><Bot className="w-4 h-4" />Lecture PROPH3T</div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{prophet}</p>
          <p className="text-[10px] text-gray-400 mt-2">Analyse indicative — PROPH3T ne produit jamais les chiffres comptables.</p>
        </div>
      )}

      {/* Du budget au réalisé — table Budget / Réalisé / Écart, dépliable par compte */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-x-auto">
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <h2 className="font-semibold text-[var(--color-primary)]">Du budget au réalisé <span className="text-xs font-normal text-[var(--color-text-tertiary)]">· clic sur une rubrique pour déplier les comptes</span></h2>
        </div>
        <table className="w-full text-sm min-w-[680px]">
          <thead className="bg-gray-50 border-b border-[var(--color-border)]">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Rubrique / Compte</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Budget</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Réalisé</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Écart</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {parNature.filter(n => n.ecart !== 0).filter(n => !q || n.code.toLowerCase().includes(q) || rubLabel(n.code).toLowerCase().includes(q)).map(n => {
              const isOpen = expanded.has(n.code);
              return (
                <React.Fragment key={n.code}>
                  <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpand(n.code)}>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1">
                        <span className="text-gray-400 w-3 inline-block">{isOpen ? '▾' : '▸'}</span>
                        <span className="font-mono font-bold text-[var(--color-primary)]">{n.code}</span>
                        <span className="text-gray-700">{rubLabel(n.code)}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{formatCurrency(n.budget)}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900">{formatCurrency(n.realise)}</td>
                    <td className={`px-4 py-2.5 text-right font-medium ${n.ecart >= 0 ? 'text-green-600' : 'text-red-600'}`}>{n.ecart >= 0 ? '+' : ''}{formatCurrency(n.ecart)}</td>
                  </tr>
                  {isOpen && detailForNature(n.code).map(d => (
                    <tr key={d.account_code} className="bg-gray-50/40 text-xs">
                      <td className="px-4 py-1.5 pl-11 text-gray-600">{fmtAccount(d.account_code)}</td>
                      <td className="px-4 py-1.5 text-right text-gray-500">{formatCurrency(d.budget)}</td>
                      <td className="px-4 py-1.5 text-right text-gray-700">{formatCurrency(d.realise)}</td>
                      <td className={`px-4 py-1.5 text-right font-medium ${d.ecart >= 0 ? 'text-green-600' : 'text-red-600'}`}>{d.ecart >= 0 ? '+' : ''}{formatCurrency(d.ecart)}</td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t border-[var(--color-border)] font-semibold text-gray-900">
              <td className="px-4 py-3">Total</td>
              <td className="px-4 py-3 text-right">{formatCurrency(totals.budget)}</td>
              <td className="px-4 py-3 text-right">{formatCurrency(totals.realise)}</td>
              <td className={`px-4 py-3 text-right ${totals.ecart >= 0 ? 'text-green-600' : 'text-red-600'}`}>{totals.ecart >= 0 ? '+' : ''}{formatCurrency(totals.ecart)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Heatmap mois × nature */}
      <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm overflow-x-auto">
        <h2 className="font-semibold text-[var(--color-primary)] mb-4">Heatmap des écarts (mois × nature)</h2>
        <table className="text-xs border-collapse">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left text-gray-500 sticky left-0 bg-white min-w-[190px]">Nature</th>
              {MOIS.map(m => <th key={m} className="px-2 py-1 text-center text-gray-500 w-14">{m}</th>)}
            </tr>
          </thead>
          <tbody>
            {heatmap.grid.filter(g => !q || g.code.toLowerCase().includes(q) || rubLabel(g.code).toLowerCase().includes(q)).map(g => (
              <tr key={g.code}>
                <td className="px-2 py-1 text-gray-600 sticky left-0 bg-white min-w-[190px]"><span className="font-mono font-bold text-[var(--color-primary)]">{g.code}</span> <span className="text-gray-500">{rubLabel(g.code)}</span></td>
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
