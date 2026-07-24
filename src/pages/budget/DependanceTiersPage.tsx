/**
 * Dépendance financière tiers — concentration clients / fournisseurs (CDC §8.1).
 *
 * Part du CA par client (et des achats par fournisseur), courbe de Pareto,
 * indice HHI, croisement avec l'encours (balance âgée) → triple signal
 * « gros + lent à payer + à risque ». Seuils d'alerte : client > 20 % du CA,
 * fournisseur > 30 % des achats.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, RefreshCw, Users, Truck, AlertTriangle, Network } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import { getDefaultAnnee } from '../../features/budget/services/budgetService';
import { cumulRange, CUMUL_VIEWS, type CumulView } from '../../utils/cumulRange';
import { getClientConcentration, getSupplierConcentration, type ConcentrationResult } from '../../services/tiers/tiersConcentrationService';

type Side = 'clients' | 'fournisseurs';
const SEUIL: Record<Side, number> = { clients: 20, fournisseurs: 30 };

function hhiLabel(idx: number): { label: string; cls: string } {
  if (idx >= 2500) return { label: 'Fortement concentré', cls: 'bg-red-100 text-red-700' };
  if (idx >= 1500) return { label: 'Modérément concentré', cls: 'bg-amber-100 text-amber-800' };
  return { label: 'Peu concentré', cls: 'bg-green-100 text-green-700' };
}

const DependanceTiersPage: React.FC = () => {
  const navigate = useNavigate();
  const { adapter } = useData();
  const [side, setSide] = useState<Side>('clients');
  const [view, setView] = useState<CumulView>('exercice');
  const [refYear, setRefYear] = useState('');
  const [res, setRes] = useState<ConcentrationResult | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (s: Side, v: CumulView) => {
    setLoading(true);
    try {
      const year = refYear || await getDefaultAnnee(adapter);
      setRefYear(year);
      const range = cumulRange(v, year);
      setRes(s === 'clients' ? await getClientConcentration(adapter, range) : await getSupplierConcentration(adapter, range));
    } catch (e) { toast.error(`Chargement impossible : ${(e as Error).message}`); }
    finally { setLoading(false); }
  }, [adapter, refYear]);

  useEffect(() => { void load(side, view); /* eslint-disable-next-line */ }, [adapter, side, view]);

  const hhi = res ? hhiLabel(res.hhiIndex) : null;
  const seuil = SEUIL[side];
  const alerte = res && res.top1Pct > seuil;

  return (
    <div className="p-6 space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/budget/ventilation')} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><Network className="w-5 h-5 text-[var(--color-primary)]" /> Dépendance financière tiers</h1>
            <p className="text-sm text-gray-600">Concentration, Pareto et HHI · exercice {refYear}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            {CUMUL_VIEWS.map(v => <button key={v.key} onClick={() => setView(v.key)} className={`px-3 py-1.5 text-sm ${view === v.key ? 'bg-[var(--color-primary)] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>{v.label}</button>)}
          </div>
          <button onClick={() => void load(side, view)} className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-2 text-sm"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Recharger</button>
        </div>
      </div>

      {/* Bascule clients / fournisseurs */}
      <div className="flex gap-2">
        {([['clients', 'Clients (CA)', Users], ['fournisseurs', 'Fournisseurs (achats)', Truck]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setSide(key)} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${side === key ? 'bg-[var(--color-primary)] text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {alerte && (
        <div className="p-3 rounded-lg border border-red-300 bg-red-50 flex items-start gap-2 text-sm text-red-800">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span><b>Dépendance élevée.</b> Le 1<sup>er</sup> {side === 'clients' ? 'client pèse' : 'fournisseur pèse'} {res!.top1Pct}% {side === 'clients' ? 'du CA' : 'des achats'} — au-delà du seuil d'alerte de {seuil}%.</span>
        </div>
      )}

      {/* KPIs concentration */}
      {res && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Kpi label="Top 1" value={`${res.top1Pct}%`} warn={res.top1Pct > seuil} />
          <Kpi label="Top 5" value={`${res.top5Pct}%`} />
          <Kpi label="Top 10" value={`${res.top10Pct}%`} />
          <Kpi label={`HHI (${res.nb} tiers)`} value={String(res.hhiIndex)} badge={hhi ?? undefined} />
          <Kpi label={side === 'clients' ? 'CA total' : 'Achats totaux'} value={formatCurrency(res.total)} />
        </div>
      )}

      {/* Table Pareto */}
      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200"><tr>
            <th className="text-left px-3 py-2 font-medium text-gray-700">#</th>
            <th className="text-left px-3 py-2 font-medium text-gray-700">Tiers</th>
            <th className="text-right px-3 py-2 font-medium text-gray-700">{side === 'clients' ? 'CA' : 'Achats'}</th>
            <th className="text-right px-3 py-2 font-medium text-gray-700">Part</th>
            <th className="text-right px-3 py-2 font-medium text-gray-700">Cumul (Pareto)</th>
            {side === 'clients' && <th className="text-right px-3 py-2 font-medium text-gray-700">Encours</th>}
            {side === 'clients' && <th className="text-center px-3 py-2 font-medium text-gray-700">Risque</th>}
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-500">Chargement…</td></tr>}
            {!loading && (!res || res.items.length === 0) && <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-500">Aucune donnée sur la période.</td></tr>}
            {!loading && res?.items.map((it, i) => {
              const franchi80 = it.cumulPct >= 80 && (i === 0 || res.items[i - 1].cumulPct < 80);
              return (
                <tr key={it.code} className={`border-b border-gray-100 hover:bg-gray-50 ${franchi80 ? 'border-b-2 border-b-[var(--color-primary)]/40' : ''}`}>
                  <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                  <td className="px-3 py-2"><span className="font-mono text-gray-500">{it.code}</span> <span className="text-gray-800">{it.name}</span></td>
                  <td className="px-3 py-2 text-right text-gray-900 whitespace-nowrap">{formatCurrency(it.value)}</td>
                  <td className={`px-3 py-2 text-right font-medium ${it.sharePct > seuil ? 'text-red-600' : 'text-gray-700'}`}>{it.sharePct}%</td>
                  <td className="px-3 py-2 text-right text-gray-500">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="hidden sm:inline-block w-16 h-1.5 rounded bg-gray-100 overflow-hidden align-middle"><span className="block h-full bg-[var(--color-primary)]/50" style={{ width: `${Math.min(100, it.cumulPct)}%` }} /></span>
                      {it.cumulPct}%
                    </span>
                  </td>
                  {side === 'clients' && <td className="px-3 py-2 text-right text-gray-600 whitespace-nowrap">{it.encours ? formatCurrency(it.encours) : '—'}</td>}
                  {side === 'clients' && <td className="px-3 py-2 text-center">
                    {it.risque
                      ? <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${it.risque === 'eleve' ? 'bg-red-100 text-red-700' : it.risque === 'moyen' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-700'}`}>{it.risque}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">Ligne épaisse = franchissement du seuil de Pareto 80 % (les tiers au-dessus font 80 % du total). HHI &lt; 1500 peu concentré · 1500–2500 modéré · &gt; 2500 fortement concentré.</p>
    </div>
  );
};

const Kpi: React.FC<{ label: string; value: string; warn?: boolean; badge?: { label: string; cls: string } }> = ({ label, value, warn, badge }) => (
  <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
    <p className="text-xs text-gray-500">{label}</p>
    <p className={`text-lg font-semibold ${warn ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
    {badge && <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${badge.cls}`}>{badge.label}</span>}
  </div>
);

export default DependanceTiersPage;
