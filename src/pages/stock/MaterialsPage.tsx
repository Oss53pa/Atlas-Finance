/**
 * MaterialsPage — référentiel article (material master). CRUD réel via materialService.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Boxes, Plus, RefreshCw, Loader2, Search, Pencil, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../contexts/DataContext';
import type { DBStockMaterial, StockMaterialType, StockValuationMethod } from '../../lib/db';
import {
  listMaterials, createMaterial, updateMaterial, setMaterialActive,
  VALUATION_CLASSES, MATERIAL_TYPE_LABELS, type MaterialInput,
} from '../../services/stock/materialService';
import StockModuleGate from './StockModuleGate';

const MATERIAL_TYPES = Object.keys(MATERIAL_TYPE_LABELS) as StockMaterialType[];

const emptyForm = (): MaterialInput => ({
  code: '', name: '', description: '', materialType: 'marchandise', category: '',
  baseUom: 'U', valuationMethod: 'CUMP', valuationClass: 'MARCH', currency: 'XOF',
  batchManaged: false, serialManaged: false, hazmat: false, active: true,
  movingAvgCost: 0,
});

function MaterialsInner() {
  const { adapter } = useData();
  const [materials, setMaterials] = useState<DBStockMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DBStockMaterial | null>(null);
  const [form, setForm] = useState<MaterialInput>(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setMaterials(await listMaterials(adapter)); }
    finally { setLoading(false); }
  }, [adapter]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setModalOpen(true); };
  const openEdit = (m: DBStockMaterial) => {
    setEditing(m);
    setForm({
      code: m.code, name: m.name, description: m.description ?? '', materialType: m.materialType,
      category: m.category ?? '', baseUom: m.baseUom, purchaseUom: m.purchaseUom, salesUom: m.salesUom,
      valuationMethod: m.valuationMethod, valuationClass: m.valuationClass, currency: m.currency,
      batchManaged: m.batchManaged, serialManaged: m.serialManaged, hazmat: m.hazmat, active: m.active,
      shelfLifeDays: m.shelfLifeDays, reorderPoint: m.reorderPoint, safetyStock: m.safetyStock,
      maxLevel: m.maxLevel, minOrderQty: m.minOrderQty, leadTimeDays: m.leadTimeDays,
      movingAvgCost: m.movingAvgCost,
    });
    setModalOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editing) { await updateMaterial(adapter, editing.id, form); toast.success('Article mis à jour'); }
      else { await createMaterial(adapter, form); toast.success('Article créé'); }
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally { setSaving(false); }
  };

  const toggleActive = async (m: DBStockMaterial) => {
    try { await setMaterialActive(adapter, m.id, !m.active); await load(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur'); }
  };

  const filtered = materials.filter(m =>
    !search || m.code?.toLowerCase().includes(search.toLowerCase()) || m.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Boxes className="w-6 h-6 text-[#235A6E]" /> Articles
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-[#235A6E] text-white rounded-lg hover:bg-[#1c4a5b]">
            <Plus className="w-4 h-4" /> Nouvel article
          </button>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" /> Actualiser
          </button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher (code, désignation)…"
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg" />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Aucun article. Créez le premier avec « Nouvel article ».</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-left text-gray-500">
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2">Désignation</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Classe val.</th>
                  <th className="px-4 py-2">Méthode</th>
                  <th className="px-4 py-2">UoM</th>
                  <th className="px-4 py-2 text-center">Lot/Série</th>
                  <th className="px-4 py-2 text-center">Statut</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-gray-600">{m.code}</td>
                    <td className="px-4 py-2">{m.name}</td>
                    <td className="px-4 py-2 text-gray-500">{MATERIAL_TYPE_LABELS[m.materialType]}</td>
                    <td className="px-4 py-2 text-gray-500">{m.valuationClass}</td>
                    <td className="px-4 py-2 text-gray-500">{m.valuationMethod}</td>
                    <td className="px-4 py-2 text-gray-500">{m.baseUom}</td>
                    <td className="px-4 py-2 text-center text-xs text-gray-500">
                      {m.batchManaged ? 'Lot ' : ''}{m.serialManaged ? 'Série' : ''}{!m.batchManaged && !m.serialManaged ? '—' : ''}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => toggleActive(m)}
                        className={`px-2 py-0.5 rounded text-xs ${m.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {m.active ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => openEdit(m)} className="p-1.5 text-gray-500 hover:text-[#235A6E] hover:bg-gray-100 rounded">
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <MaterialModal
          form={form} setForm={setForm} editing={!!editing} saving={saving}
          onClose={() => setModalOpen(false)} onSave={save}
        />
      )}
    </div>
  );
}

function MaterialModal({ form, setForm, editing, saving, onClose, onSave }: {
  form: MaterialInput; setForm: (f: MaterialInput) => void; editing: boolean; saving: boolean;
  onClose: () => void; onSave: () => void;
}) {
  const set = (patch: Partial<MaterialInput>) => setForm({ ...form, ...patch });
  const num = (v: string): number | undefined => (v === '' ? undefined : Number(v));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h3 className="text-lg font-semibold">{editing ? 'Modifier l\'article' : 'Nouvel article'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <Field label="Code *"><input value={form.code} onChange={e => set({ code: e.target.value })} className="inp" disabled={editing} /></Field>
          <Field label="Désignation *"><input value={form.name} onChange={e => set({ name: e.target.value })} className="inp" /></Field>
          <Field label="Type d'article">
            <select value={form.materialType} onChange={e => set({ materialType: e.target.value as StockMaterialType })} className="inp">
              {MATERIAL_TYPES.map(t => <option key={t} value={t}>{MATERIAL_TYPE_LABELS[t]}</option>)}
            </select>
          </Field>
          <Field label="Catégorie"><input value={form.category ?? ''} onChange={e => set({ category: e.target.value })} className="inp" /></Field>
          <Field label="Classe de valorisation">
            <select value={form.valuationClass} onChange={e => set({ valuationClass: e.target.value })} className="inp">
              {VALUATION_CLASSES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </Field>
          <Field label="Méthode de valorisation">
            <select value={form.valuationMethod} onChange={e => set({ valuationMethod: e.target.value as StockValuationMethod })} className="inp">
              <option value="CUMP">CUMP (prix moyen pondéré)</option>
              <option value="FIFO">FIFO (premier entré premier sorti)</option>
            </select>
          </Field>
          <Field label="Unité de base"><input value={form.baseUom} onChange={e => set({ baseUom: e.target.value })} className="inp" /></Field>
          <Field label="Coût moyen initial"><input type="number" value={form.movingAvgCost ?? 0} onChange={e => set({ movingAvgCost: Number(e.target.value) })} className="inp" /></Field>
          <Field label="Point de commande"><input type="number" value={form.reorderPoint ?? ''} onChange={e => set({ reorderPoint: num(e.target.value) })} className="inp" /></Field>
          <Field label="Stock de sécurité"><input type="number" value={form.safetyStock ?? ''} onChange={e => set({ safetyStock: num(e.target.value) })} className="inp" /></Field>
          <Field label="Niveau maxi"><input type="number" value={form.maxLevel ?? ''} onChange={e => set({ maxLevel: num(e.target.value) })} className="inp" /></Field>
          <Field label="Délai appro (jours)"><input type="number" value={form.leadTimeDays ?? ''} onChange={e => set({ leadTimeDays: num(e.target.value) })} className="inp" /></Field>
          <div className="col-span-2 flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.batchManaged} onChange={e => set({ batchManaged: e.target.checked })} /> Géré par lot</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.serialManaged} onChange={e => set({ serialManaged: e.target.checked })} /> Géré par n° série</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.hazmat} onChange={e => set({ hazmat: e.target.checked })} /> Matière dangereuse</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={e => set({ active: e.target.checked })} /> Actif</label>
          </div>
          <Field label="Description" full><textarea value={form.description ?? ''} onChange={e => set({ description: e.target.value })} className="inp" rows={2} /></Field>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Annuler</button>
          <button onClick={onSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm bg-[#235A6E] text-white rounded-lg hover:bg-[#1c4a5b] disabled:opacity-50">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} {editing ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function MaterialsPage() {
  return (
    <StockModuleGate>
      <MaterialsInner />
      <style>{`.inp{width:100%;border:1px solid #d1d5db;border-radius:0.5rem;padding:0.5rem 0.75rem;font-size:0.875rem}.inp:disabled{background:#f9fafb;color:#6b7280}`}</style>
    </StockModuleGate>
  );
}
