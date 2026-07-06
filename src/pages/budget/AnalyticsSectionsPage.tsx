/**
 * AnalyticsSectionsPage — /analytique (CDC V3 §1/§6 · étape 1).
 * Peupler (axes/sections) + câbler + afficher : performance par section
 * (réalisé via v_actual_by_section + budget annuel). Zéro mock.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/formatters';
import { getDefaultAnnee } from '../../features/budget/services/budgetService';
import {
  listAxes, createAxe, updateAxe, deleteAxe, createSection, updateSection, deleteSection,
  getSectionPerformance, applyVentilationRule, getVentilationCoverage,
  listVentilationBySection, clearSectionVentilation, getSectionAccountBreakdown,
  type Axe, type SectionPerformance,
} from '../../features/budget/services/analyticsService';
import { KPICard } from '../../components/ui/DesignSystem';
import PageHeaderActions from '../../components/ui/PageHeaderActions';
import { PieChart, Plus, Save, Layers, Target, Split, TrendingUp, TrendingDown, Percent, Search, Pencil, Trash2, X, RotateCcw, ChevronRight, ChevronDown } from 'lucide-react';

const AXE_TYPES = [
  { v: '', l: '— Type —' },
  { v: 'centre_cout', l: 'Centre de coût' },
  { v: 'centre_profit', l: 'Centre de profit' },
  { v: 'projet', l: 'Projet' },
  { v: 'produit', l: 'Produit' },
  { v: 'region', l: 'Région' },
  { v: 'activite', l: 'Activité' },
];

const AnalyticsSectionsPage: React.FC = () => {
  const { adapter } = useData();
  const { toast } = useToast();
  const [annee, setAnnee] = useState('');
  const [axes, setAxes] = useState<Axe[]>([]);
  const [perf, setPerf] = useState<SectionPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAxe, setNewAxe] = useState({ code: '', libelle: '', type_axe: '' });
  const [newSection, setNewSection] = useState({ code: '', libelle: '', axe_id: '', budget_annuel: '' });
  const [editBudget, setEditBudget] = useState<Record<string, string>>({});
  const [anaTab, setAnaTab] = useState<'gestion' | 'performance'>('gestion');
  const [vent, setVent] = useState({ sectionId: '', accountPrefix: '', journal: '', tiersCode: '' });
  const [ventCoverage, setVentCoverage] = useState(0);
  // Édition en ligne / drill-down
  const [editAxe, setEditAxe] = useState<Record<string, { libelle: string; type_axe: string }>>({});
  const [editSec, setEditSec] = useState<Record<string, { libelle: string; axe_id: string }>>({});
  const [ventBySection, setVentBySection] = useState<Map<string, { lignes: number; montant: number }>>(new Map());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [breakdown, setBreakdown] = useState<Record<string, Array<{ account_code: string; account_name: string; montant: number; lignes: number }>>>({});
  const axeLabel = (id: string | null) => { const a = axes.find(x => x.id === id); return a ? `${a.code}` : '—'; };
  const [ventBusy, setVentBusy] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const filteredPerf = perf.filter(s => !q || s.code.toLowerCase().includes(q) || (s.libelle || '').toLowerCase().includes(q));

  const load = async () => {
    setLoading(true);
    try {
      const a = annee || await getDefaultAnnee(adapter);
      const [ax, p, cov, vbs] = await Promise.all([
        listAxes(adapter), getSectionPerformance(adapter, a), getVentilationCoverage(adapter), listVentilationBySection(adapter),
      ]);
      setAnnee(a); setAxes(ax); setPerf(p); setVentCoverage(cov.ventilated); setVentBySection(vbs);
    } catch (e: any) { toast.error(e?.message || 'Erreur'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [adapter]);

  const addAxe = async () => {
    if (!newAxe.code || !newAxe.libelle) { toast.error('Code et libellé requis'); return; }
    try { await createAxe(adapter, { code: newAxe.code, libelle: newAxe.libelle, type_axe: newAxe.type_axe || undefined }); setNewAxe({ code: '', libelle: '', type_axe: '' }); toast.success('Axe créé'); load(); }
    catch (e: any) { toast.error(e?.message || 'Erreur'); }
  };
  const saveAxeEdit = async (id: string) => {
    const e = editAxe[id]; if (!e) return;
    try { await updateAxe(adapter, id, { libelle: e.libelle.trim(), type_axe: e.type_axe || null }); setEditAxe(p => { const n = { ...p }; delete n[id]; return n; }); toast.success('Axe modifié'); load(); }
    catch (err: any) { toast.error(err?.message || 'Erreur'); }
  };
  const removeAxe = async (id: string, code: string) => {
    const nbSec = perf.filter(s => s.axe_id === id).length;
    if (!window.confirm(`Supprimer l'axe « ${code} »${nbSec ? ` et ses ${nbSec} section(s) rattachée(s)` : ''} ? Les ventilations liées seront aussi supprimées.`)) return;
    try {
      // Supprimer d'abord les sections rattachées (FK axe_id NOT NULL) puis l'axe.
      for (const s of perf.filter(x => x.axe_id === id)) await deleteSection(adapter, s.id);
      await deleteAxe(adapter, id); toast.success('Axe supprimé'); load();
    } catch (e: any) { toast.error(e?.message || 'Suppression impossible'); }
  };
  const saveSecEdit = async (id: string) => {
    const e = editSec[id]; if (!e) return;
    if (!e.axe_id) { toast.error('Axe requis'); return; }
    try { await updateSection(adapter, id, { libelle: e.libelle.trim(), axe_id: e.axe_id }); setEditSec(p => { const n = { ...p }; delete n[id]; return n; }); toast.success('Section modifiée'); load(); }
    catch (err: any) { toast.error(err?.message || 'Erreur'); }
  };
  const removeSection = async (id: string, code: string) => {
    if (!window.confirm(`Supprimer la section « ${code} » et ses ventilations ?`)) return;
    try { await deleteSection(adapter, id); toast.success('Section supprimée'); load(); }
    catch (e: any) { toast.error(e?.message || 'Erreur'); }
  };
  const clearVent = async (id: string, code: string) => {
    if (!window.confirm(`Retirer toutes les ventilations de la section « ${code} » ?`)) return;
    try { const n = await clearSectionVentilation(adapter, id); toast.success(`${n} ventilation(s) retirée(s)`); load(); }
    catch (e: any) { toast.error(e?.message || 'Erreur'); }
  };
  const toggleBreakdown = async (id: string) => {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    if (!breakdown[id]) {
      try { const rows = await getSectionAccountBreakdown(adapter, id); setBreakdown(p => ({ ...p, [id]: rows })); }
      catch { /* laisser vide */ }
    }
  };
  const addSection = async () => {
    if (!newSection.code || !newSection.libelle) { toast.error('Code et libellé requis'); return; }
    if (!newSection.axe_id) { toast.error('Sélectionnez un axe analytique pour la section.'); return; }
    try {
      await createSection(adapter, {
        code: newSection.code, libelle: newSection.libelle,
        axe_id: newSection.axe_id || null, budget_annuel: parseFloat(newSection.budget_annuel) || 0,
      });
      setNewSection({ code: '', libelle: '', axe_id: '', budget_annuel: '' });
      toast.success('Section créée'); load();
    } catch (e: any) { toast.error(e?.message || 'Erreur'); }
  };
  const applyVent = async () => {
    if (!vent.sectionId || !vent.accountPrefix) { toast.error('Section et préfixe de compte requis'); return; }
    const sec = perf.find(s => s.id === vent.sectionId);
    if (!window.confirm(`Ventiler toutes les écritures de compte « ${vent.accountPrefix}… »${vent.journal ? ` (journal ${vent.journal})` : ''}${vent.tiersCode ? ` (tiers ${vent.tiersCode})` : ''} vers la section « ${sec?.code} » ?`)) return;
    setVentBusy(true);
    try {
      const res = await applyVentilationRule(adapter, {
        accountPrefix: vent.accountPrefix, journal: vent.journal || null, tiersCode: vent.tiersCode || null, sectionId: vent.sectionId,
      });
      toast.success(`${res.matched} ligne(s) ventilée(s) vers la section.`);
      setVent({ sectionId: '', accountPrefix: '', journal: '', tiersCode: '' });
      load();
    } catch (e: any) { toast.error(e?.message || 'Erreur de ventilation'); }
    finally { setVentBusy(false); }
  };

  const saveBudget = async (id: string) => {
    const v = parseFloat(editBudget[id]); if (isNaN(v)) return;
    try { await updateSection(adapter, id, { budget_annuel: v }); toast.success('Budget mis à jour'); setEditBudget(p => { const n = { ...p }; delete n[id]; return n; }); load(); }
    catch (e: any) { toast.error(e?.message || 'Erreur'); }
  };

  const kpi = useMemo(() => {
    const produits = perf.reduce((s, p) => s + p.produits, 0);
    const charges = perf.reduce((s, p) => s + p.charges, 0);
    return { produits, charges, marge: produits - charges, sections: perf.filter(p => p.produits !== 0 || p.charges !== 0 || p.budget_annuel !== 0).length };
  }, [perf]);

  return (
    <div className="p-6 bg-[var(--color-border)] min-h-full space-y-6">
      <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center"><PieChart className="w-5 h-5 text-[var(--color-primary)]" /></div>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-[var(--color-primary)]">Comptabilité Analytique</h1>
          <p className="text-sm text-[var(--color-text-tertiary)]">Axes & sections · performance par section · Exercice {annee}</p>
        </div>
        <PageHeaderActions
          onToggleFilters={() => setFiltersOpen(o => !o)}
          filtersOpen={filtersOpen}
          activeFilters={q ? 1 : 0}
          printTitle="Comptabilité Analytique — Performance par section"
        />
      </div>

      {filtersOpen && (
        <div className="bg-white rounded-xl p-4 border border-[var(--color-border)] shadow-sm flex flex-wrap items-center gap-4 print-hide">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher une section…" className="pl-8 pr-3 py-1.5 text-sm border border-[var(--color-border)] rounded-lg w-72" />
          </div>
          <span className="text-xs text-gray-400">Filtre le tableau « Performance par section ».</span>
        </div>
      )}

      {/* Onglets : Axes & Sections (gestion) / Performance */}
      <div className="flex gap-1 bg-white rounded-xl p-1 border border-[var(--color-border)] shadow-sm w-fit">
        {([['gestion', 'Axes & Sections'], ['performance', 'Performance par section']] as const).map(([k, lbl]) => (
          <button key={k} onClick={() => setAnaTab(k)} className={`px-4 py-2 text-sm font-medium rounded-lg ${anaTab === k ? 'bg-[var(--color-primary)] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{lbl}</button>
        ))}
      </div>

      {anaTab === 'gestion' && (<>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Axes */}
        <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm">
          <h2 className="font-semibold text-[var(--color-primary)] mb-3 flex items-center gap-2"><Layers className="w-4 h-4" />Axes analytiques</h2>
          <div className="space-y-1 mb-4 max-h-48 overflow-y-auto">
            {axes.length === 0 && <p className="text-xs text-gray-400">Aucun axe. Créez-en un (ex. « PROJET », « DEPARTEMENT »).</p>}
            {axes.map(a => {
              const ed = editAxe[a.id];
              return (
                <div key={a.id} className="flex items-center gap-2 text-sm py-1 border-b border-gray-50">
                  <span className="font-mono text-gray-500 w-16 shrink-0">{a.code}</span>
                  {ed ? (
                    <>
                      <input value={ed.libelle} onChange={e => setEditAxe(p => ({ ...p, [a.id]: { ...ed, libelle: e.target.value } }))} className="flex-1 border border-gray-300 rounded px-1.5 py-0.5 text-sm" />
                      <select value={ed.type_axe} onChange={e => setEditAxe(p => ({ ...p, [a.id]: { ...ed, type_axe: e.target.value } }))} className="border border-gray-300 rounded px-1 py-0.5 text-xs">
                        {AXE_TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                      </select>
                      <button onClick={() => saveAxeEdit(a.id)} className="text-[var(--color-primary)]" title="Enregistrer"><Save className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditAxe(p => { const n = { ...p }; delete n[a.id]; return n; })} className="text-gray-400" title="Annuler"><X className="w-3.5 h-3.5" /></button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-gray-800">{a.libelle}</span>
                      <span className="text-[11px] text-gray-400">{AXE_TYPES.find(t => t.v === (a.type_axe || ''))?.l !== '— Type —' ? AXE_TYPES.find(t => t.v === (a.type_axe || ''))?.l : ''}</span>
                      <button onClick={() => setEditAxe(p => ({ ...p, [a.id]: { libelle: a.libelle, type_axe: a.type_axe || '' } }))} className="text-gray-400 hover:text-[var(--color-primary)]" title="Modifier"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => removeAxe(a.id, a.code)} className="text-gray-400 hover:text-red-600" title="Supprimer"><Trash2 className="w-3.5 h-3.5" /></button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-[6rem_1fr_auto] gap-2">
            <input value={newAxe.code} onChange={e => setNewAxe(s => ({ ...s, code: e.target.value.toUpperCase() }))} placeholder="Code" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-mono" />
            <input value={newAxe.libelle} onChange={e => setNewAxe(s => ({ ...s, libelle: e.target.value }))} placeholder="Libellé" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
            <button onClick={addAxe} className="px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-sm flex items-center gap-1" title="Créer l'axe"><Plus className="w-4 h-4" /></button>
            <select value={newAxe.type_axe} onChange={e => setNewAxe(s => ({ ...s, type_axe: e.target.value }))} className="col-span-3 border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
              {AXE_TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
          </div>
        </div>

        {/* Nouvelle section */}
        <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm">
          <h2 className="font-semibold text-[var(--color-primary)] mb-3 flex items-center gap-2"><Target className="w-4 h-4" />Nouvelle section</h2>
          <div className="grid grid-cols-2 gap-2">
            <input value={newSection.code} onChange={e => setNewSection(s => ({ ...s, code: e.target.value }))} placeholder="Code section" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
            <input value={newSection.libelle} onChange={e => setNewSection(s => ({ ...s, libelle: e.target.value }))} placeholder="Libellé" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
            <select value={newSection.axe_id} onChange={e => setNewSection(s => ({ ...s, axe_id: e.target.value }))} className={`border rounded-lg px-2 py-1.5 text-sm ${newSection.axe_id ? 'border-gray-300' : 'border-amber-300'}`}>
              <option value="">— Axe (requis) —</option>
              {axes.map(a => <option key={a.id} value={a.id}>{a.code} · {a.libelle}</option>)}
            </select>
            <input type="number" value={newSection.budget_annuel} onChange={e => setNewSection(s => ({ ...s, budget_annuel: e.target.value }))} placeholder="Budget annuel" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
          </div>
          <button onClick={addSection} disabled={axes.length === 0 || !newSection.axe_id} className="mt-3 px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-sm flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"><Plus className="w-4 h-4" />Créer la section</button>
          {axes.length === 0
            ? <p className="text-[11px] text-amber-600 mt-2">Créez d'abord un axe analytique (à gauche) : une section appartient à un axe.</p>
            : <p className="text-[11px] text-gray-400 mt-2">Une section appartient à un axe. Le réalisé est attribué via la ventilation ou le code analytique des écritures.</p>}
        </div>
      </div>

      {/* Sections — gestion (liste + édition + suppression) */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)] flex items-center gap-2">
          <Target className="w-4 h-4 text-[var(--color-primary)]" />
          <h2 className="font-semibold text-[var(--color-primary)]">Sections ({perf.length})</h2>
        </div>
        {perf.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-400">Aucune section. Créez-en une ci-dessus.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-[var(--color-border)]">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Code</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Libellé</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Axe</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Budget annuel</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Ventilé</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {perf.map(s => {
                const ed = editSec[s.id];
                const v = ventBySection.get(s.id);
                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-gray-500">{s.code}</td>
                    <td className="px-4 py-2">
                      {ed ? <input value={ed.libelle} onChange={e => setEditSec(p => ({ ...p, [s.id]: { ...ed, libelle: e.target.value } }))} className="border border-gray-300 rounded px-1.5 py-0.5 text-sm w-full" /> : <span className="text-gray-800">{s.libelle}</span>}
                    </td>
                    <td className="px-4 py-2">
                      {ed ? (
                        <select value={ed.axe_id} onChange={e => setEditSec(p => ({ ...p, [s.id]: { ...ed, axe_id: e.target.value } }))} className="border border-gray-300 rounded px-1 py-0.5 text-xs">
                          {axes.map(a => <option key={a.id} value={a.id}>{a.code}</option>)}
                        </select>
                      ) : <span className="font-mono text-xs text-gray-500">{axeLabel(s.axe_id)}</span>}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {editBudget[s.id] !== undefined ? (
                        <span className="inline-flex items-center gap-1">
                          <input value={editBudget[s.id]} onChange={e => setEditBudget(p => ({ ...p, [s.id]: e.target.value }))} className="w-24 border border-gray-300 rounded px-1.5 py-0.5 text-xs text-right" />
                          <button onClick={() => saveBudget(s.id)} className="text-[var(--color-primary)]"><Save className="w-3.5 h-3.5" /></button>
                        </span>
                      ) : (
                        <button onClick={() => setEditBudget(p => ({ ...p, [s.id]: String(s.budget_annuel) }))} className="text-gray-600 hover:text-[var(--color-primary)] hover:underline">{formatCurrency(s.budget_annuel)}</button>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-gray-500">
                      {v ? <span title={`${v.lignes} ligne(s)`}>{v.lignes} l. · {formatCurrency(v.montant)}</span> : '—'}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-center gap-2">
                        {ed ? (
                          <>
                            <button onClick={() => saveSecEdit(s.id)} className="text-[var(--color-primary)]" title="Enregistrer"><Save className="w-4 h-4" /></button>
                            <button onClick={() => setEditSec(p => { const n = { ...p }; delete n[s.id]; return n; })} className="text-gray-400" title="Annuler"><X className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => setEditSec(p => ({ ...p, [s.id]: { libelle: s.libelle, axe_id: s.axe_id || '' } }))} className="text-gray-400 hover:text-[var(--color-primary)]" title="Modifier"><Pencil className="w-4 h-4" /></button>
                            {v && v.lignes > 0 && <button onClick={() => clearVent(s.id, s.code)} className="text-gray-400 hover:text-amber-600" title="Retirer les ventilations"><RotateCcw className="w-4 h-4" /></button>}
                            <button onClick={() => removeSection(s.id, s.code)} className="text-gray-400 hover:text-red-600" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Ventilation par règle */}
      <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-[var(--color-primary)] flex items-center gap-2"><Split className="w-4 h-4" />Ventilation par règle</h2>
          <span className="text-xs text-gray-400">{ventCoverage} ligne(s) ventilée(s)</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
          <div className="md:col-span-2">
            <label className="text-[11px] text-gray-500 block mb-1">Section cible *</label>
            <select value={vent.sectionId} onChange={e => setVent(v => ({ ...v, sectionId: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
              <option value="">— Section —</option>
              {perf.map(s => <option key={s.id} value={s.id}>{s.code} · {s.libelle}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-gray-500 block mb-1">Préfixe compte *</label>
            <input value={vent.accountPrefix} onChange={e => setVent(v => ({ ...v, accountPrefix: e.target.value }))} placeholder="ex. 601" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="text-[11px] text-gray-500 block mb-1">Journal (opt.)</label>
            <input value={vent.journal} onChange={e => setVent(v => ({ ...v, journal: e.target.value.toUpperCase() }))} placeholder="ex. AC" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="text-[11px] text-gray-500 block mb-1">Code tiers (opt.)</label>
            <input value={vent.tiersCode} onChange={e => setVent(v => ({ ...v, tiersCode: e.target.value }))} placeholder="ex. C001" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
          </div>
        </div>
        <button onClick={applyVent} disabled={ventBusy} className="mt-3 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
          <Split className="w-4 h-4" /> {ventBusy ? 'Ventilation…' : 'Appliquer la règle'}
        </button>
        <p className="text-[11px] text-gray-400 mt-2">Attribue 100% des lignes correspondantes à la section (remplace les ventilations existantes de ces lignes). Combinable : compte + journal et/ou tiers.</p>
      </div>
      </>)}

      {anaTab === 'performance' && (<>
      {/* Bandeau KPI — vue d'ensemble par axes & centres (sections) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard title="Produits ventilés" value={formatCurrency(kpi.produits)} icon={TrendingUp} color="success" valueFontSize="1.05rem" />
        <KPICard title="Charges ventilées" value={formatCurrency(kpi.charges)} icon={TrendingDown} color="warning" valueFontSize="1.05rem" />
        <KPICard title="Marge analytique" value={formatCurrency(kpi.marge)} icon={Percent} color={kpi.marge >= 0 ? 'success' : 'error'} valueFontSize="1.05rem" subtitle={kpi.produits ? `${Math.round((kpi.marge / kpi.produits) * 100)}%` : undefined} />
        <KPICard title="Sections actives" value={String(kpi.sections)} icon={Target} color="primary" />
        <KPICard title="Lignes ventilées" value={String(ventCoverage)} icon={Split} color="neutral" />
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
            {!loading && perf.length > 0 && filteredPerf.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Aucune section ne correspond au filtre.</td></tr>}
            {filteredPerf.map(s => {
              const isOpen = expanded.has(s.id);
              const rows = breakdown[s.id];
              return (
              <React.Fragment key={s.id}>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-2.5">
                  <button onClick={() => toggleBreakdown(s.id)} className="inline-flex items-center gap-1 text-left hover:text-[var(--color-primary)]" title="Voir le détail par compte">
                    {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    <span className="font-mono text-gray-500">{s.code}</span> <span className="text-gray-800">{s.libelle}</span>
                  </button>
                </td>
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
              {isOpen && (
                <tr className="bg-gray-50/60">
                  <td colSpan={6} className="px-4 py-2">
                    {!rows ? (
                      <p className="text-xs text-gray-400 pl-6">Chargement du détail…</p>
                    ) : rows.length === 0 ? (
                      <p className="text-xs text-gray-400 pl-6">Aucune ligne ventilée sur cette section (attribuez des écritures via la ventilation).</p>
                    ) : (
                      <div className="pl-6">
                        <p className="text-[11px] font-medium text-gray-500 mb-1">Détail par compte ({rows.length})</p>
                        {rows.map(r => (
                          <div key={r.account_code} className="flex items-center justify-between text-xs py-0.5 border-b border-gray-100 last:border-0">
                            <span><span className="font-mono text-gray-500">{r.account_code}</span> <span className="text-gray-600">{r.account_name}</span> <span className="text-gray-400">· {r.lignes} l.</span></span>
                            <span className={`font-mono ${r.montant >= 0 ? 'text-gray-700' : 'text-red-600'}`}>{formatCurrency(r.montant)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )}
              </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      </>)}
    </div>
  );
};

export default AnalyticsSectionsPage;
