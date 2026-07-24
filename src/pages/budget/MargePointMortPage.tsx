/**
 * Marge sur coûts variables & point mort par section (CDC §8.1).
 *
 * Cascade par section principale : CA → coûts variables → MCV (taux) → coûts
 * fixes (directs + déversés) → marge nette, et point mort = coûts fixes ÷ taux
 * de MCV. Alimenté par les ventilations du dernier run (qui portent le
 * comportement fixe/variable/mixte). Muet tant qu'aucun run n'a tourné.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, RefreshCw, Gauge, TrendingUp } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import { getDefaultAnnee } from '../../features/budget/services/budgetService';
import { getMarginBySection, type SectionMargin } from '../../features/budget/services/marginService';

const MargePointMortPage: React.FC = () => {
  const navigate = useNavigate();
  const { adapter } = useData();
  const [rows, setRows] = useState<SectionMargin[]>([]);
  const [annee, setAnnee] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const a = annee || await getDefaultAnnee(adapter);
      setAnnee(a);
      setRows(await getMarginBySection(adapter, parseInt(a, 10)));
    } catch (e) { toast.error(`Chargement impossible : ${(e as Error).message}`); }
    finally { setLoading(false); }
  }, [adapter, annee]);

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [adapter]);

  const tot = rows.reduce((t, r) => ({
    ca: t.ca + r.ca, variables: t.variables + r.coutsVariables, mcv: t.mcv + r.mcv,
    fixes: t.fixes + r.coutsFixes, nette: t.nette + r.margeNette,
  }), { ca: 0, variables: 0, mcv: 0, fixes: 0, nette: 0 });
  const tauxGlobal = tot.ca > 0 ? Math.round((tot.mcv / tot.ca) * 1000) / 10 : 0;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/budget/ventilation')} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><Gauge className="w-5 h-5 text-[var(--color-primary)]" /> Marge sur coûts variables & point mort</h1>
            <p className="text-sm text-gray-600">Par section, d'après les ventilations du dernier run · exercice {annee}</p>
          </div>
        </div>
        <button onClick={() => void load()} className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-2 text-sm"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Recharger</button>
      </div>

      {/* KPIs globaux */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm"><p className="text-xs text-gray-500">CA ventilé</p><p className="text-lg font-semibold text-gray-900">{formatCurrency(tot.ca)}</p></div>
        <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm"><p className="text-xs text-gray-500">MCV globale</p><p className="text-lg font-semibold text-green-700">{formatCurrency(tot.mcv)}</p></div>
        <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm"><p className="text-xs text-gray-500">Taux de MCV</p><p className="text-lg font-semibold text-gray-900">{tauxGlobal}%</p></div>
        <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm"><p className="text-xs text-gray-500">Marge nette</p><p className={`text-lg font-semibold ${tot.nette >= 0 ? 'text-green-700' : 'text-red-600'}`}>{formatCurrency(tot.nette)}</p></div>
      </div>

      {!loading && rows.length === 0 && (
        <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-900 flex items-center justify-between">
          <span>Aucune ventilation. Lancez un run pour alimenter la marge sur coûts variables.</span>
          <button onClick={() => navigate('/budget/ventilation')} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" />Moteur de ventilation</button>
        </div>
      )}

      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200"><tr>
            <th className="text-left px-3 py-2 font-medium text-gray-700">Section</th>
            <th className="text-right px-3 py-2 font-medium text-gray-700">CA</th>
            <th className="text-right px-3 py-2 font-medium text-gray-700">Coûts variables</th>
            <th className="text-right px-3 py-2 font-medium text-gray-700">MCV</th>
            <th className="text-right px-3 py-2 font-medium text-gray-700">Taux</th>
            <th className="text-right px-3 py-2 font-medium text-gray-700">Coûts fixes</th>
            <th className="text-right px-3 py-2 font-medium text-gray-700">Marge nette</th>
            <th className="text-right px-3 py-2 font-medium text-gray-700">Point mort</th>
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-500">Chargement…</td></tr>}
            {!loading && rows.map(r => (
              <tr key={r.section_id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2"><span className="font-mono text-gray-500">{r.code}</span> <span className="text-gray-800">{r.libelle}</span></td>
                <td className="px-3 py-2 text-right text-green-700 whitespace-nowrap">{formatCurrency(r.ca)}</td>
                <td className="px-3 py-2 text-right text-gray-600 whitespace-nowrap">{formatCurrency(r.coutsVariables)}</td>
                <td className="px-3 py-2 text-right text-gray-900 font-medium whitespace-nowrap">{formatCurrency(r.mcv)}</td>
                <td className="px-3 py-2 text-right text-gray-500">{r.ca > 0 ? `${r.mcvTauxPct}%` : '—'}</td>
                <td className="px-3 py-2 text-right text-gray-600 whitespace-nowrap">{formatCurrency(r.coutsFixes)}</td>
                <td className={`px-3 py-2 text-right font-medium whitespace-nowrap ${r.margeNette >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{formatCurrency(r.margeNette)}</td>
                <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap">{r.pointMort != null ? formatCurrency(r.pointMort) : <span className="text-gray-300" title="Taux de MCV nul ou négatif">n/a</span>}</td>
              </tr>
            ))}
            {!loading && rows.length > 0 && (
              <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200">
                <td className="px-3 py-2 text-gray-800">Total</td>
                <td className="px-3 py-2 text-right text-green-800">{formatCurrency(tot.ca)}</td>
                <td className="px-3 py-2 text-right text-gray-700">{formatCurrency(tot.variables)}</td>
                <td className="px-3 py-2 text-right text-gray-900">{formatCurrency(tot.mcv)}</td>
                <td className="px-3 py-2 text-right text-gray-600">{tauxGlobal}%</td>
                <td className="px-3 py-2 text-right text-gray-700">{formatCurrency(tot.fixes)}</td>
                <td className={`px-3 py-2 text-right ${tot.nette >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{formatCurrency(tot.nette)}</td>
                <td className="px-3 py-2 text-right text-gray-400">—</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">Point mort = coûts fixes ÷ taux de MCV : niveau de CA à partir duquel la section couvre ses coûts fixes. Les coûts fixes incluent la quote-part déversée des sections auxiliaires (coût complet).</p>
    </div>
  );
};

export default MargePointMortPage;
