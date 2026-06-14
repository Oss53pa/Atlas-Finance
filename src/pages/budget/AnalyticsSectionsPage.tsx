/**
 * AnalyticsSectionsPage — /analytique (CDC V3 §1/§6 · étape 1).
 * Peupler (axes/sections) + câbler + afficher : performance par section
 * (réalisé via v_actual_by_section + budget annuel). Zéro mock.
 */
import React, { useEffect, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/formatters';
import { getDefaultAnnee } from '../../features/budget/services/budgetService';
import {
  listAxes, createAxe, createSection, updateSection, getSectionPerformance,
  type Axe, type SectionPerformance,
} from '../../features/budget/services/analyticsService';
import { PieChart, Plus, Save, Layers, Target } from 'lucide-react';

const AnalyticsSectionsPage: React.FC = () => {
  const { adapter } = useData();
  const { toast } = useToast();
  const [annee, setAnnee] = useState('');
  const [axes, setAxes] = useState<Axe[]>([]);
  const [perf, setPerf] = useState<SectionPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAxe, setNewAxe] = useState({ code: '', libelle: '' });
  const [newSection, setNewSection] = useState({ code: '', libelle: '', axe_id: '', budget_annuel: '' });
  const [editBudget, setEditBudget] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const a = annee || await getDefaultAnnee(adapter);
      const [ax, p] = await Promise.all([listAxes(adapter), getSectionPerformance(adapter, a)]);
      setAnnee(a); setAxes(ax); setPerf(p);
    } catch (e: any) { toast.error(e?.message || 'Erreur'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [adapter]);

  const addAxe = async () => {
    if (!newAxe.code || !newAxe.libelle) { toast.error('Code et libellé requis'); return; }
    try { await createAxe(adapter, newAxe); setNewAxe({ code: '', libelle: '' }); toast.success('Axe créé'); load(); }
    catch (e: any) { toast.error(e?.message || 'Erreur'); }
  };
  const addSection = async () => {
    if (!newSection.code || !newSection.libelle) { toast.error('Code et libellé requis'); return; }
    try {
      await createSection(adapter, {
        code: newSection.code, libelle: newSection.libelle,
        axe_id: newSection.axe_id || null, budget_annuel: parseFloat(newSection.budget_annuel) || 0,
      });
      setNewSection({ code: '', libelle: '', axe_id: '', budget_annuel: '' });
      toast.success('Section créée'); load();
    } catch (e: any) { toast.error(e?.message || 'Erreur'); }
  };
  const saveBudget = async (id: string) => {
    const v = parseFloat(editBudget[id]); if (isNaN(v)) return;
    try { await updateSection(adapter, id, { budget_annuel: v }); toast.success('Budget mis à jour'); setEditBudget(p => { const n = { ...p }; delete n[id]; return n; }); load(); }
    catch (e: any) { toast.error(e?.message || 'Erreur'); }
  };

  return (
    <div className="p-6 bg-[var(--color-border)] min-h-full space-y-6">
      <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center"><PieChart className="w-5 h-5 text-[var(--color-primary)]" /></div>
        <div>
          <h1 className="text-lg font-bold text-[var(--color-primary)]">Comptabilité Analytique</h1>
          <p className="text-sm text-[var(--color-text-tertiary)]">Axes & sections · performance par section · Exercice {annee}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Axes */}
        <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm">
          <h2 className="font-semibold text-[var(--color-primary)] mb-3 flex items-center gap-2"><Layers className="w-4 h-4" />Axes analytiques</h2>
          <div className="space-y-1 mb-4 max-h-40 overflow-y-auto">
            {axes.length === 0 && <p className="text-xs text-gray-400">Aucun axe. Créez-en un (ex. « PROJET », « DEPARTEMENT »).</p>}
            {axes.map(a => (
              <div key={a.id} className="flex items-center justify-between text-sm py-1 border-b border-gray-50">
                <span><span className="font-mono text-gray-500">{a.code}</span> {a.libelle}</span>
                <span className="text-xs text-gray-400">{a.type_axe || ''}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newAxe.code} onChange={e => setNewAxe(s => ({ ...s, code: e.target.value }))} placeholder="Code" className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
            <input value={newAxe.libelle} onChange={e => setNewAxe(s => ({ ...s, libelle: e.target.value }))} placeholder="Libellé" className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
            <button onClick={addAxe} className="px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-sm flex items-center gap-1"><Plus className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Nouvelle section */}
        <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm">
          <h2 className="font-semibold text-[var(--color-primary)] mb-3 flex items-center gap-2"><Target className="w-4 h-4" />Nouvelle section</h2>
          <div className="grid grid-cols-2 gap-2">
            <input value={newSection.code} onChange={e => setNewSection(s => ({ ...s, code: e.target.value }))} placeholder="Code section" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
            <input value={newSection.libelle} onChange={e => setNewSection(s => ({ ...s, libelle: e.target.value }))} placeholder="Libellé" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
            <select value={newSection.axe_id} onChange={e => setNewSection(s => ({ ...s, axe_id: e.target.value }))} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
              <option value="">— Axe —</option>
              {axes.map(a => <option key={a.id} value={a.id}>{a.code} · {a.libelle}</option>)}
            </select>
            <input type="number" value={newSection.budget_annuel} onChange={e => setNewSection(s => ({ ...s, budget_annuel: e.target.value }))} placeholder="Budget annuel" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
          </div>
          <button onClick={addSection} className="mt-3 px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-sm flex items-center gap-1"><Plus className="w-4 h-4" />Créer la section</button>
          <p className="text-[11px] text-gray-400 mt-2">Le réalisé est attribué via le code analytique des écritures (= code section).</p>
        </div>
      </div>

      {/* Performance par section */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)]">
          <h2 className="font-semibold text-[var(--color-primary)]">Performance par section</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-[var(--color-border)]">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Section</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Produits</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Charges</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Résultat</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Budget annuel</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Écart</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Chargement…</td></tr>}
            {!loading && perf.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Aucune section. Créez-en une ci-dessus.</td></tr>}
            {perf.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5"><span className="font-mono text-gray-500">{s.code}</span> <span className="text-gray-800">{s.libelle}</span></td>
                <td className="px-4 py-2.5 text-right text-green-700">{formatCurrency(s.produits)}</td>
                <td className="px-4 py-2.5 text-right text-red-700">{formatCurrency(s.charges)}</td>
                <td className={`px-4 py-2.5 text-right font-medium ${s.resultat >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(s.resultat)}</td>
                <td className="px-4 py-2.5 text-right">
                  {editBudget[s.id] !== undefined ? (
                    <span className="inline-flex items-center gap-1">
                      <input value={editBudget[s.id]} onChange={e => setEditBudget(p => ({ ...p, [s.id]: e.target.value }))} className="w-28 border border-gray-300 rounded px-1.5 py-0.5 text-xs text-right" />
                      <button onClick={() => saveBudget(s.id)} className="text-[var(--color-primary)]"><Save className="w-3.5 h-3.5" /></button>
                    </span>
                  ) : (
                    <button onClick={() => setEditBudget(p => ({ ...p, [s.id]: String(s.budget_annuel) }))} className="text-gray-600 hover:text-[var(--color-primary)] hover:underline">
                      {formatCurrency(s.budget_annuel)}
                    </button>
                  )}
                </td>
                <td className={`px-4 py-2.5 text-right ${s.ecartBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(s.ecartBudget)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AnalyticsSectionsPage;
