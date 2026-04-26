
import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../hooks/useToast';
import FeatureGuard from '../../components/auth/FeatureGuard';
import { formatCurrency } from '../../utils/formatters';
import { Building2, Plus, Pencil, Trash2, MapPin, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PAYS_OHADA } from '../../data/seedsFiscauxOHADA';

interface Site {
  id: string;
  name: string;
  adresse: string;
  pays: string;
  responsable: string;
  actif: boolean;
  createdAt: string;
}

const MultiSitesPage: React.FC = () => {
  const { adapter } = useData();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);

  const loadSites = async () => {
    setLoading(true);
    try {
      const setting = await adapter.getById('settings', 'sites_list') as any;
      if (setting?.value) {
        setSites(JSON.parse(setting.value).filter((s: Site) => s.actif !== false));
      }
    } catch (err) { /* silent */ setSites([]); }
    setLoading(false);
  };

  const saveSites = async (list: Site[]) => {
    const existing = await adapter.getById('settings', 'sites_list');
    if (existing) {
      await adapter.update('settings', 'sites_list', { value: JSON.stringify(list) });
    } else {
      await adapter.create('settings', { id: 'sites_list', value: JSON.stringify(list) });
    }
  };

  useEffect(() => { loadSites(); }, [adapter]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const siteData: Site = {
      id: editingSite?.id || `site-${Date.now()}`,
      name: fd.get('name') as string,
      adresse: fd.get('adresse') as string,
      pays: fd.get('pays') as string,
      responsable: fd.get('responsable') as string,
      actif: true,
      createdAt: editingSite?.createdAt || new Date().toISOString(),
    };

    let list: Site[];
    if (editingSite) {
      list = sites.map(s => s.id === editingSite.id ? siteData : s);
    } else {
      list = [...sites, siteData];
    }

    await saveSites(list);
    toast.success(editingSite ? 'Site mis à jour' : 'Site créé');
    setShowModal(false);
    setEditingSite(null);
    loadSites();
  };

  const handleDelete = async (siteId: string) => {
    const list = sites.map(s => s.id === siteId ? { ...s, actif: false } : s);
    await saveSites(list);
    toast.success('Site supprimé');
    loadSites();
  };

  return (
    <FeatureGuard module="multi_sites">
      <div className="p-6 bg-[var(--color-border)] min-h-screen">
        {/* Header */}
        <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button onClick={() => navigate('/config')} className="flex items-center px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[var(--color-primary)]">Multi-Sites</h1>
                <p className="text-sm text-[var(--color-text-tertiary)]">Gestion des établissements et succursales</p>
              </div>
            </div>
            <button onClick={() => { setEditingSite(null); setShowModal(true); }}
              className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[#404040]">
              <Plus className="w-4 h-4" /><span>Nouveau site</span>
            </button>
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
            <p className="text-xs text-[var(--color-text-tertiary)]">Sites actifs</p>
            <p className="text-2xl font-bold text-[var(--color-primary)]">{sites.length}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
            <p className="text-xs text-[var(--color-text-tertiary)]">Pays couverts</p>
            <p className="text-2xl font-bold text-[var(--color-primary)]">{new Set(sites.map(s => s.pays)).size}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
            <p className="text-xs text-[var(--color-text-tertiary)]">Responsables</p>
            <p className="text-2xl font-bold text-[var(--color-primary)]">{new Set(sites.filter(s => s.responsable).map(s => s.responsable)).size}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-[var(--color-text-tertiary)]">Chargement...</div>
          ) : sites.length === 0 ? (
            <div className="p-12 text-center text-[var(--color-text-tertiary)]">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Aucun site enregistré</p>
              <p className="text-sm mt-1">Ajoutez vos établissements et succursales</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-[var(--color-border)]">
                  <th className="p-3 text-left text-xs font-semibold text-[var(--color-text-tertiary)] uppercase">Site</th>
                  <th className="p-3 text-left text-xs font-semibold text-[var(--color-text-tertiary)] uppercase">Adresse</th>
                  <th className="p-3 text-left text-xs font-semibold text-[var(--color-text-tertiary)] uppercase">Pays</th>
                  <th className="p-3 text-left text-xs font-semibold text-[var(--color-text-tertiary)] uppercase">Responsable</th>
                  <th className="p-3 text-left text-xs font-semibold text-[var(--color-text-tertiary)] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sites.map(s => {
                  const paysInfo = PAYS_OHADA.find(p => p.code === s.pays);
                  return (
                    <tr key={s.id} className="border-b border-[var(--color-border)] hover:bg-gray-50">
                      <td className="p-3 text-sm font-medium flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[var(--color-text-tertiary)]" /> {s.name}
                      </td>
                      <td className="p-3 text-sm text-[var(--color-text-tertiary)]">{s.adresse || '—'}</td>
                      <td className="p-3 text-sm"><span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">{paysInfo?.nom || s.pays}</span></td>
                      <td className="p-3 text-sm">{s.responsable || '—'}</td>
                      <td className="p-3 flex gap-1">
                        <button onClick={() => { setEditingSite(s); setShowModal(true); }} className="p-1.5 rounded hover:bg-gray-100"><Pencil className="w-4 h-4 text-[var(--color-text-tertiary)]" /></button>
                        <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-500" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-lg font-bold mb-4">{editingSite ? 'Modifier le site' : 'Nouveau site'}</h2>
              <form onSubmit={handleSave}>
                <div className="space-y-3 mb-4">
                  <div><label className="text-xs text-[var(--color-text-tertiary)]">Nom du site *</label><input name="name" required defaultValue={editingSite?.name} className="w-full border border-[var(--color-border)] rounded px-3 py-2 text-sm" /></div>
                  <div><label className="text-xs text-[var(--color-text-tertiary)]">Adresse</label><input name="adresse" defaultValue={editingSite?.adresse} className="w-full border border-[var(--color-border)] rounded px-3 py-2 text-sm" /></div>
                  <div>
                    <label className="text-xs text-[var(--color-text-tertiary)]">Pays</label>
                    <select name="pays" defaultValue={editingSite?.pays || 'CI'} className="w-full border border-[var(--color-border)] rounded px-3 py-2 text-sm">
                      {PAYS_OHADA.map(p => <option key={p.code} value={p.code}>{p.nom} ({p.code})</option>)}
                    </select>
                  </div>
                  <div><label className="text-xs text-[var(--color-text-tertiary)]">Responsable</label><input name="responsable" defaultValue={editingSite?.responsable} className="w-full border border-[var(--color-border)] rounded px-3 py-2 text-sm" /></div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => { setShowModal(false); setEditingSite(null); }} className="px-4 py-2 text-sm border rounded-lg">Annuler</button>
                  <button type="submit" className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg">{editingSite ? 'Mettre à jour' : 'Créer'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </FeatureGuard>
  );
};

export default MultiSitesPage;
