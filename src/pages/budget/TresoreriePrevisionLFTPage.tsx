/**
 * TresoreriePrevisionLFTPage — /tresorerie/prevision-lft (CDC V3 §3/§6).
 * Latest Thinking Forecast : solde réel + postes ouverts datés + flux manuels →
 * solde projeté glissant 12 mois + points de tension. Zéro mock.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/formatters';
import { KPICard, ColorfulBarChart } from '../../components/ui/DesignSystem';
import {
  buildForecast, addManualFlow, deleteFlow, type ForecastResult,
} from '../../features/budget/services/treasuryForecastService';
import { PiggyBank, TrendingDown, AlertTriangle, Plus, Trash2, Activity } from 'lucide-react';

const TresoreriePrevisionLFTPage: React.FC = () => {
  const { adapter } = useData();
  const { toast } = useToast();
  const [data, setData] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ libelle: '', sens: 'decaissement' as 'encaissement' | 'decaissement', date_prevue: '', montant: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setData(await buildForecast(adapter, new Date().toISOString(), 12)); }
    catch (e: any) { toast.error(e?.message || 'Erreur'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [adapter]);

  const chart = useMemo(() => (data?.months || []).map(m => ({ label: m.label, value: Math.round(m.soldeProjete / 1000), color: '' })), [data]);
  const lowest = useMemo(() => {
    if (!data || data.months.length === 0) return null;
    return data.months.reduce((min, m) => (m.soldeProjete < min.soldeProjete ? m : min), data.months[0]);
  }, [data]);

  const addFlow = async () => {
    if (!form.libelle || !form.date_prevue || !form.montant) { toast.error('Libellé, date et montant requis'); return; }
    setSaving(true);
    try {
      await addManualFlow(adapter, { libelle: form.libelle, sens: form.sens, date_prevue: form.date_prevue, montant: parseFloat(form.montant) || 0 });
      setForm({ libelle: '', sens: 'decaissement', date_prevue: '', montant: '' });
      toast.success('Flux ajouté'); load();
    } catch (e: any) { toast.error(e?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-8 text-center text-[var(--color-text-tertiary)]">Chargement de la prévision…</div>;
  const d = data!;
  const manualFlows = d.flows.filter(f => f.source === 'manuel');
  const soldeFinal = d.months.length ? d.months[d.months.length - 1].soldeProjete : d.currentCash;

  return (
    <div className="p-6 bg-[var(--color-border)] min-h-full space-y-6">
      <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center"><Activity className="w-5 h-5 text-[var(--color-primary)]" /></div>
        <div>
          <h1 className="text-lg font-bold text-[var(--color-primary)]">Prévision de Trésorerie — LFT</h1>
          <p className="text-sm text-[var(--color-text-tertiary)]">Rolling forecast 12 mois · solde réel + postes ouverts + flux manuels</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Trésorerie actuelle (réelle)" value={formatCurrency(d.currentCash)} icon={PiggyBank} color={d.currentCash >= 0 ? 'success' : 'error'} valueFontSize="1.125rem" />
        <KPICard title="Solde projeté (12 mois)" value={formatCurrency(soldeFinal)} icon={TrendingDown} color={soldeFinal >= 0 ? 'success' : 'error'} valueFontSize="1.125rem" />
        <KPICard title="Mois en tension" value={String(d.tensionCount)} icon={AlertTriangle} color={d.tensionCount > 0 ? 'error' : 'success'} />
        <KPICard title="Point bas" value={lowest ? formatCurrency(lowest.soldeProjete) : '—'} icon={AlertTriangle} color={lowest && lowest.soldeProjete < 0 ? 'error' : 'neutral'} valueFontSize="1.125rem" subtitle={lowest ? lowest.label : undefined} />
      </div>

      <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm">
        <h2 className="font-semibold text-[var(--color-primary)] mb-1">Solde de trésorerie projeté</h2>
        <p className="text-xs text-[var(--color-text-tertiary)] mb-4">En milliers FCFA · rouge = tension (solde négatif)</p>
        {chart.length > 0 ? <ColorfulBarChart data={chart} height={240} /> : <div className="text-sm text-gray-400 py-10 text-center">Aucune donnée.</div>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tableau mensuel */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[var(--color-border)]"><h2 className="font-semibold text-[var(--color-primary)]">Détail mensuel</h2></div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-[var(--color-border)]">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Mois</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Encaiss.</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Décaiss.</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Flux net</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Solde projeté</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {d.months.map(m => (
                <tr key={m.ym} className={m.tension ? 'bg-red-50' : 'hover:bg-gray-50'}>
                  <td className="px-4 py-2 text-gray-700">{m.label} {m.ym.slice(0, 4)}</td>
                  <td className="px-4 py-2 text-right text-green-700">{m.encaissements ? formatCurrency(m.encaissements) : '—'}</td>
                  <td className="px-4 py-2 text-right text-red-700">{m.decaissements ? formatCurrency(m.decaissements) : '—'}</td>
                  <td className={`px-4 py-2 text-right ${m.fluxNet >= 0 ? 'text-gray-700' : 'text-red-600'}`}>{formatCurrency(m.fluxNet)}</td>
                  <td className={`px-4 py-2 text-right font-semibold ${m.soldeProjete >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{formatCurrency(m.soldeProjete)}{m.tension && <AlertTriangle className="w-3 h-3 inline ml-1 text-red-500" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Flux manuel + liste */}
        <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm">
          <h2 className="font-semibold text-[var(--color-primary)] mb-3">Ajouter un flux prévu</h2>
          <div className="space-y-2">
            <input value={form.libelle} onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))} placeholder="Libellé" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
            <select value={form.sens} onChange={e => setForm(f => ({ ...f, sens: e.target.value as any }))} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
              <option value="decaissement">Décaissement</option>
              <option value="encaissement">Encaissement</option>
            </select>
            <input type="date" value={form.date_prevue} onChange={e => setForm(f => ({ ...f, date_prevue: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
            <input type="number" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} placeholder="Montant" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
            <button onClick={addFlow} disabled={saving} className="w-full px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-sm flex items-center justify-center gap-1 disabled:opacity-50"><Plus className="w-4 h-4" />Ajouter</button>
          </div>
          {manualFlows.length > 0 && (
            <div className="mt-4 space-y-1 max-h-48 overflow-y-auto">
              {manualFlows.map(f => (
                <div key={f.id} className="flex items-center justify-between text-xs border-b border-gray-50 py-1">
                  <span className="truncate">{f.date_prevue} · {f.libelle}</span>
                  <span className="flex items-center gap-2">
                    <span className={f.sens === 'encaissement' ? 'text-green-600' : 'text-red-600'}>{f.sens === 'encaissement' ? '+' : '−'}{formatCurrency(f.montant)}</span>
                    <button onClick={async () => { if (f.id) { await deleteFlow(adapter, f.id); load(); } }} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-gray-400 mt-3">Les postes ouverts (échéances non lettrées) alimentent automatiquement la prévision.</p>
        </div>
      </div>
    </div>
  );
};

export default TresoreriePrevisionLFTPage;
