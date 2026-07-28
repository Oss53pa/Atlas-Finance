/**
 * Référentiels — Conditions de paiement & Sites (CDC Paramètres §8, §3).
 *
 * Rapatriés en PostgreSQL (gouvernés, RLS par tenant). Les conditions de
 * paiement affichent la date d'échéance calculée à partir d'une date de base.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, RefreshCw, Plus, Trash2, CalendarClock, MapPin } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import {
  listConditionsPaiement, createConditionPaiement, deleteConditionPaiement, computeEcheance,
  listSites, createSite, deleteSite,
  type ConditionPaiement, type Site,
} from '../../services/param/referentielsService';

const today = () => new Date().toISOString().slice(0, 10);

const ReferentielsPage: React.FC = () => {
  const navigate = useNavigate();
  const { adapter } = useData();
  const [tab, setTab] = useState<'paiement' | 'sites'>('paiement');
  const [conds, setConds] = useState<ConditionPaiement[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [baseDate, setBaseDate] = useState(today());
  const [nc, setNc] = useState({ code: '', libelle: '', jours: '', fin_de_mois: false });
  const [ns, setNs] = useState({ code: '', libelle: '', adresse: '', responsable: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cp, si] = await Promise.all([listConditionsPaiement(adapter), listSites(adapter)]);
      setConds(cp); setSites(si);
    } catch (e) { toast.error(`Chargement impossible : ${(e as Error).message}`); }
    finally { setLoading(false); }
  }, [adapter]);
  useEffect(() => { void load(); }, [load]);

  const addCond = async () => {
    if (!nc.code.trim() || !nc.libelle.trim()) { toast.error('Code et libellé requis'); return; }
    try { await createConditionPaiement(adapter, { code: nc.code, libelle: nc.libelle, jours: Number(nc.jours) || 0, fin_de_mois: nc.fin_de_mois }); setNc({ code: '', libelle: '', jours: '', fin_de_mois: false }); toast.success('Condition ajoutée'); load(); }
    catch (e) { toast.error((e as Error).message); }
  };
  const addSite = async () => {
    if (!ns.code.trim() || !ns.libelle.trim()) { toast.error('Code et libellé requis'); return; }
    try { await createSite(adapter, ns); setNs({ code: '', libelle: '', adresse: '', responsable: '' }); toast.success('Site ajouté'); load(); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Référentiels</h1>
            <p className="text-sm text-gray-600">Conditions de paiement &amp; sites · gouvernés (PostgreSQL)</p>
          </div>
        </div>
        <button onClick={() => void load()} className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-2 text-sm"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Recharger</button>
      </div>

      <div className="flex gap-2">
        {([['paiement', 'Conditions de paiement', CalendarClock], ['sites', 'Sites', MapPin]] as const).map(([k, l, Icon]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${tab === k ? 'bg-[var(--color-primary)] text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            <Icon className="w-4 h-4" />{l}
          </button>
        ))}
      </div>

      {tab === 'paiement' && (
        <>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <CalendarClock className="w-4 h-4" />Échéance calculée depuis le
            <input type="date" value={baseDate} onChange={e => setBaseDate(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1 text-sm" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <input value={nc.code} onChange={e => setNc(s => ({ ...s, code: e.target.value }))} placeholder="Code" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-mono" />
            <input value={nc.libelle} onChange={e => setNc(s => ({ ...s, libelle: e.target.value }))} placeholder="Libellé" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm md:col-span-2" />
            <input type="number" value={nc.jours} onChange={e => setNc(s => ({ ...s, jours: e.target.value }))} placeholder="Jours" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs text-gray-600"><input type="checkbox" checked={nc.fin_de_mois} onChange={e => setNc(s => ({ ...s, fin_de_mois: e.target.checked }))} />fin de mois</label>
              <button onClick={addCond} className="px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-sm flex items-center gap-1"><Plus className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200"><tr>
                <th className="text-left px-3 py-2 font-medium text-gray-700">Code</th>
                <th className="text-left px-3 py-2 font-medium text-gray-700">Libellé</th>
                <th className="text-right px-3 py-2 font-medium text-gray-700">Délai</th>
                <th className="text-center px-3 py-2 font-medium text-gray-700">Fin de mois</th>
                <th className="text-right px-3 py-2 font-medium text-gray-700">Échéance @ {baseDate}</th>
                <th className="text-right px-3 py-2 font-medium text-gray-700"></th>
              </tr></thead>
              <tbody>
                {loading && <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-500">Chargement…</td></tr>}
                {!loading && conds.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-500">Aucune condition.</td></tr>}
                {!loading && conds.map(c => (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-gray-600">{c.code}</td>
                    <td className="px-3 py-2 text-gray-800">{c.libelle}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{c.jours} j</td>
                    <td className="px-3 py-2 text-center">{c.fin_de_mois ? '✓' : '—'}</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900">{computeEcheance(baseDate, c.jours, c.fin_de_mois)}</td>
                    <td className="px-3 py-2 text-right"><button onClick={() => deleteConditionPaiement(adapter, c.id).then(() => load()).catch((e: any) => toast.error(e?.message))} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'sites' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <input value={ns.code} onChange={e => setNs(s => ({ ...s, code: e.target.value }))} placeholder="Code" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-mono" />
            <input value={ns.libelle} onChange={e => setNs(s => ({ ...s, libelle: e.target.value }))} placeholder="Libellé" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
            <input value={ns.adresse} onChange={e => setNs(s => ({ ...s, adresse: e.target.value }))} placeholder="Adresse" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
            <input value={ns.responsable} onChange={e => setNs(s => ({ ...s, responsable: e.target.value }))} placeholder="Responsable" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
            <button onClick={addSite} className="px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-sm flex items-center justify-center gap-1"><Plus className="w-4 h-4" />Site</button>
          </div>
          <div className="border border-gray-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200"><tr>
                <th className="text-left px-3 py-2 font-medium text-gray-700">Code</th>
                <th className="text-left px-3 py-2 font-medium text-gray-700">Libellé</th>
                <th className="text-left px-3 py-2 font-medium text-gray-700">Adresse</th>
                <th className="text-left px-3 py-2 font-medium text-gray-700">Responsable</th>
                <th className="text-right px-3 py-2 font-medium text-gray-700"></th>
              </tr></thead>
              <tbody>
                {loading && <tr><td colSpan={5} className="px-3 py-8 text-center text-gray-500">Chargement…</td></tr>}
                {!loading && sites.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-gray-500">Aucun site. Ajoutez vos établissements (alimentent l'axe analytique Site).</td></tr>}
                {!loading && sites.map(s => (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-gray-600">{s.code}</td>
                    <td className="px-3 py-2 text-gray-800">{s.libelle}</td>
                    <td className="px-3 py-2 text-gray-600">{s.adresse || '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{s.responsable || '—'}</td>
                    <td className="px-3 py-2 text-right"><button onClick={() => deleteSite(adapter, s.id).then(() => load()).catch((e: any) => toast.error(e?.message))} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default ReferentielsPage;
