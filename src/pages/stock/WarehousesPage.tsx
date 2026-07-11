/**
 * WarehousesPage — magasins & emplacements (SAP storage location / bin). CRUD réel.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Warehouse, Plus, Loader2, MapPin, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../contexts/DataContext';
import type { DBStockWarehouse, DBStockLocation } from '../../lib/db';
import {
  listWarehouses, createWarehouse, listLocations, createLocation, WAREHOUSE_TYPE_LABELS,
} from '../../services/stock/warehouseService';
import StockModuleGate from './StockModuleGate';

const WH_TYPES = Object.keys(WAREHOUSE_TYPE_LABELS) as DBStockWarehouse['type'][];

function WarehousesInner() {
  const { adapter } = useData();
  const [warehouses, setWarehouses] = useState<DBStockWarehouse[]>([]);
  const [locations, setLocations] = useState<DBStockLocation[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [whModal, setWhModal] = useState(false);
  const [locModal, setLocModal] = useState(false);

  const loadWarehouses = useCallback(async () => {
    setLoading(true);
    try {
      const ws = await listWarehouses(adapter);
      setWarehouses(ws);
      if (!selected && ws.length) setSelected(ws[0].id);
    } finally { setLoading(false); }
  }, [adapter, selected]);

  const loadLocations = useCallback(async (whId: string) => {
    if (!whId) { setLocations([]); return; }
    setLocations(await listLocations(adapter, whId));
  }, [adapter]);

  useEffect(() => { loadWarehouses(); }, [loadWarehouses]);
  useEffect(() => { loadLocations(selected); }, [selected, loadLocations]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Warehouse className="w-6 h-6 text-[#235A6E]" /> Magasins & emplacements
        </h1>
        <button onClick={() => setWhModal(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-[#235A6E] text-white rounded-lg hover:bg-[#1c4a5b]">
          <Plus className="w-4 h-4" /> Nouveau magasin
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Magasins */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b text-sm font-semibold text-gray-700">Magasins ({warehouses.length})</div>
            {warehouses.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">Aucun magasin.</div>
            ) : (
              <ul className="divide-y">
                {warehouses.map(w => (
                  <li key={w.id}>
                    <button onClick={() => setSelected(w.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between ${selected === w.id ? 'bg-[#235A6E]/5' : ''}`}>
                      <div>
                        <p className="text-sm font-medium text-gray-800"><span className="font-mono text-gray-500">{w.code}</span> — {w.name}</p>
                        <p className="text-xs text-gray-400">{WAREHOUSE_TYPE_LABELS[w.type]}</p>
                      </div>
                      {!w.active && <span className="text-xs text-gray-400">Inactif</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Emplacements */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Emplacements</span>
              <button onClick={() => setLocModal(true)} disabled={!selected}
                className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">
                <Plus className="w-3 h-3" /> Ajouter
              </button>
            </div>
            {!selected ? (
              <div className="p-8 text-center text-gray-400 text-sm">Sélectionnez un magasin.</div>
            ) : locations.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">Aucun emplacement dans ce magasin.</div>
            ) : (
              <ul className="divide-y">
                {locations.map(l => (
                  <li key={l.id} className="px-4 py-3 flex items-center justify-between">
                    <p className="text-sm text-gray-800"><span className="font-mono text-gray-500">{l.code}</span>{l.name ? ` — ${l.name}` : ''}</p>
                    <span className="text-xs text-gray-400">{l.type}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {whModal && (
        <WarehouseModal
          onClose={() => setWhModal(false)}
          onSaved={async () => { setWhModal(false); await loadWarehouses(); }}
        />
      )}
      {locModal && selected && (
        <LocationModal warehouseId={selected}
          onClose={() => setLocModal(false)}
          onSaved={async () => { setLocModal(false); await loadLocations(selected); }}
        />
      )}
    </div>
  );
}

function WarehouseModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { adapter } = useData();
  const [form, setForm] = useState<Omit<DBStockWarehouse, 'id'>>({ code: '', name: '', type: 'principal', active: true });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try { await createWarehouse(adapter, form); toast.success('Magasin créé'); onSaved(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur'); }
    finally { setSaving(false); }
  };
  return (
    <Modal title="Nouveau magasin" onClose={onClose} onSave={save} saving={saving}>
      <Field label="Code *"><input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="inp" /></Field>
      <Field label="Nom *"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="inp" /></Field>
      <Field label="Type">
        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as DBStockWarehouse['type'] })} className="inp">
          {WH_TYPES.map(t => <option key={t} value={t}>{WAREHOUSE_TYPE_LABELS[t]}</option>)}
        </select>
      </Field>
    </Modal>
  );
}

function LocationModal({ warehouseId, onClose, onSaved }: { warehouseId: string; onClose: () => void; onSaved: () => void }) {
  const { adapter } = useData();
  const [form, setForm] = useState<Omit<DBStockLocation, 'id'>>({ warehouseId, code: '', name: '', type: 'standard', active: true });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try { await createLocation(adapter, form); toast.success('Emplacement créé'); onSaved(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Erreur'); }
    finally { setSaving(false); }
  };
  return (
    <Modal title="Nouvel emplacement" onClose={onClose} onSave={save} saving={saving}>
      <Field label="Code *"><input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="inp" /></Field>
      <Field label="Nom"><input value={form.name ?? ''} onChange={e => setForm({ ...form, name: e.target.value })} className="inp" /></Field>
      <Field label="Type"><input value={form.type ?? ''} onChange={e => setForm({ ...form, type: e.target.value })} className="inp" /></Field>
    </Modal>
  );
}

function Modal({ title, children, onClose, onSave, saving }: {
  title: string; children: React.ReactNode; onClose: () => void; onSave: () => void; saving: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-3">{children}</div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Annuler</button>
          <button onClick={onSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm bg-[#235A6E] text-white rounded-lg hover:bg-[#1c4a5b] disabled:opacity-50">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Créer
          </button>
        </div>
      </div>
      <style>{`.inp{width:100%;border:1px solid #d1d5db;border-radius:0.5rem;padding:0.5rem 0.75rem;font-size:0.875rem}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>{children}</div>;
}

export default function WarehousesPage() {
  return <StockModuleGate><WarehousesInner /></StockModuleGate>;
}
