/**
 * BudgetInvestissementPage — /budget/investissement (CDC V3 §6).
 * CAPEX par compte : budgété / réalisé / écart / reste à engager. Vue live
 * v_actual_investment (classe 2) — zéro mock.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import { KPICard, ColorfulBarChart } from '../../components/ui/DesignSystem';
import { getDefaultAnnee, getInvestmentSummary, type InvestmentSummary } from '../../features/budget/services/budgetService';
import { ArrowLeft, Package, Wallet, TrendingUp, Hourglass } from 'lucide-react';

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const BudgetInvestissementPage: React.FC = () => {
  const { adapter } = useData();
  const navigate = useNavigate();
  const [annee, setAnnee] = useState('');
  const [sum, setSum] = useState<InvestmentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const a = await getDefaultAnnee(adapter);
        const s = await getInvestmentSummary(adapter, a);
        if (cancelled) return;
        setAnnee(a); setSum(s);
      } catch (e: any) { if (!cancelled) setError(e?.message || 'Erreur'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [adapter]);

  const chart = useMemo(() => (sum?.mensuel || []).map((m, i) => ({ label: MOIS[i], value: Math.round(m.realise / 1000), color: '' })), [sum]);

  if (loading) return <div className="p-8 text-center text-[var(--color-text-tertiary)]">Chargement…</div>;
  if (error) return <div className="p-8"><div className="bg-[var(--color-error-light,#FEECEC)] text-[var(--color-error)] rounded-lg p-4 text-sm">{error}</div></div>;

  const s = sum!;
  const resteTotal = Math.max(0, s.totalBudget - s.totalRealise);
  const taux = s.totalBudget !== 0 ? Math.round((s.totalRealise / s.totalBudget) * 100) : null;

  return (
    <div className="p-6 bg-[var(--color-border)] min-h-full space-y-6">
      <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm flex items-center gap-3">
        <button onClick={() => navigate('/budget/cockpit')} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"><ArrowLeft className="w-4 h-4" /></button>
        <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center"><Package className="w-5 h-5 text-[var(--color-primary)]" /></div>
        <div>
          <h1 className="text-lg font-bold text-[var(--color-primary)]">Investissement (CAPEX)</h1>
          <p className="text-sm text-[var(--color-text-tertiary)]">Immobilisations classe 2 · Exercice {annee}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="CAPEX réalisé" value={formatCurrency(s.totalRealise)} icon={TrendingUp} color="primary" valueFontSize="1.125rem" />
        <KPICard title="CAPEX budgété" value={formatCurrency(s.totalBudget)} icon={Wallet} color="neutral" valueFontSize="1.125rem" />
        <KPICard title="Taux d'engagement" value={taux != null ? `${taux}%` : '—'} icon={TrendingUp} color="success" />
        <KPICard title="Reste à engager" value={formatCurrency(resteTotal)} icon={Hourglass} color="warning" valueFontSize="1.125rem" />
      </div>

      <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm">
        <h2 className="font-semibold text-[var(--color-primary)] mb-1">CAPEX mensuel réalisé</h2>
        <p className="text-xs text-[var(--color-text-tertiary)] mb-4">En milliers FCFA</p>
        {chart.some(d => d.value !== 0) ? <ColorfulBarChart data={chart} height={220} /> : <div className="text-sm text-[var(--color-text-tertiary)] py-10 text-center">Aucune acquisition sur l'exercice.</div>}
      </div>

      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)]">
          <h2 className="font-semibold text-[var(--color-primary)]">Détail par compte d'immobilisation</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-[var(--color-border)]">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Compte</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Budgété</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Réalisé</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Écart</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Reste à engager</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {s.parCompte.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">Aucune immobilisation.</td></tr>}
            {s.parCompte.map(c => (
              <tr key={c.account_code} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/accounting/general-ledger?compte=${c.account_code}`)}>
                <td className="px-4 py-2.5"><span className="font-mono text-gray-500">{c.account_code}</span> <span className="text-gray-800">{c.label}</span></td>
                <td className="px-4 py-2.5 text-right text-gray-500">{c.budget ? formatCurrency(c.budget) : '—'}</td>
                <td className="px-4 py-2.5 text-right font-medium text-gray-900">{formatCurrency(c.realise)}</td>
                <td className={`px-4 py-2.5 text-right ${c.ecart >= 0 ? 'text-green-600' : 'text-red-600'}`}>{c.budget ? formatCurrency(c.ecart) : '—'}</td>
                <td className="px-4 py-2.5 text-right text-amber-700">{c.budget ? formatCurrency(c.resteAEngager) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BudgetInvestissementPage;
