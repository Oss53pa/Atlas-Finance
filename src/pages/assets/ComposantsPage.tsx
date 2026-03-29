// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../hooks/useToast';
import FeatureGuard from '../../components/auth/FeatureGuard';
import { replaceComponent } from '../../services/componentReplacementService';
import { formatCurrency } from '../../utils/formatters';
import { ArrowLeft, Layers, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Decimal from 'decimal.js';

const ComposantsPage: React.FC = () => {
  const { adapter } = useData();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [components, setComponents] = useState<any[]>([]);
  const [parentAssets, setParentAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replaceModal, setReplaceModal] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const all = await adapter.getAll('assets') as any[];
      setComponents(all.filter(a => a.isComponent));
      setParentAssets(all.filter(a => !a.isComponent));
    } catch { setComponents([]); setParentAssets([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [adapter]);

  const getParentName = (parentId: string) => {
    const p = parentAssets.find(a => a.id === parentId);
    return p ? (p.libelle || p.name || p.id) : '—';
  };

  const handleReplace = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      await replaceComponent(adapter, replaceModal.id, {
        name: fd.get('name') as string || replaceModal.libelle || 'Nouveau composant',
        code: fd.get('code') as string || `COMP-${Date.now()}`,
        value: new Decimal(fd.get('value') as string),
        usefulLife: parseInt(fd.get('usefulLife') as string) || 10,
        acquisitionDate: fd.get('acquisitionDate') as string || new Date().toISOString().split('T')[0],
        depreciationMethod: 'lineaire',
        accountCode: replaceModal.compteImmobilisation || '213',
        depreciationAccountCode: replaceModal.compteAmortissement || '2813',
        category: replaceModal.componentType || 'structure',
        parentAssetId: replaceModal.parentAssetId,
        componentType: replaceModal.componentType || 'structure',
        paymentAccountCode: '521',
      });
      toast.success('Composant remplacé — écritures de sortie et d\'entrée générées');
      setReplaceModal(null);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Erreur de remplacement');
    }
    setLoading(false);
  };

  return (
    <FeatureGuard module="approche_composants">
      <div className="p-6 bg-[#e5e5e5] min-h-screen">
        <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm mb-6">
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate('/assets')} className="flex items-center px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Layers className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#171717]">Approche par Composants</h1>
              <p className="text-sm text-[#737373]">IAS 16 / SYSCOHADA révisé — Remplacement de composants majeurs</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#e5e5e5] shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-[#737373]">Chargement...</div>
          ) : components.length === 0 ? (
            <div className="p-12 text-center text-[#737373]">
              <Layers className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Aucun composant enregistré</p>
              <p className="text-sm mt-1">Décomposez vos immobilisations en composants depuis le registre des actifs</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-[#e5e5e5]">
                  <th className="p-3 text-left text-xs font-semibold text-[#737373] uppercase">Composant</th>
                  <th className="p-3 text-left text-xs font-semibold text-[#737373] uppercase">Immobilisation parente</th>
                  <th className="p-3 text-left text-xs font-semibold text-[#737373] uppercase">Type</th>
                  <th className="p-3 text-right text-xs font-semibold text-[#737373] uppercase">Valeur acquisition</th>
                  <th className="p-3 text-right text-xs font-semibold text-[#737373] uppercase">VNC</th>
                  <th className="p-3 text-left text-xs font-semibold text-[#737373] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {components.map(c => {
                  const vnc = (c.valeurAcquisition || c.acquisitionValue || 0) - (c.amortissementsCumules || c.accumulatedDepreciation || 0);
                  return (
                    <tr key={c.id} className="border-b border-[#e5e5e5] hover:bg-gray-50">
                      <td className="p-3 text-sm font-medium">{c.libelle || c.name || c.code}</td>
                      <td className="p-3 text-sm">{getParentName(c.parentAssetId)}</td>
                      <td className="p-3 text-sm"><span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">{c.componentType || '—'}</span></td>
                      <td className="p-3 text-sm text-right">{formatCurrency(c.valeurAcquisition || c.acquisitionValue || 0)}</td>
                      <td className="p-3 text-sm text-right font-medium">{formatCurrency(vnc)}</td>
                      <td className="p-3">
                        <button onClick={() => setReplaceModal(c)} className="px-3 py-1 bg-orange-500 text-white rounded text-xs hover:bg-orange-600 flex items-center gap-1">
                          <RefreshCw className="w-3 h-3" /> Remplacer
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal remplacement */}
        {replaceModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-lg font-bold mb-4">Remplacer : {replaceModal.libelle || replaceModal.name}</h2>
              <form onSubmit={handleReplace}>
                <div className="space-y-3 mb-4">
                  <div><label className="text-xs text-[#737373]">Nom du nouveau composant</label><input name="name" defaultValue={replaceModal.libelle || replaceModal.name} className="w-full border border-[#e5e5e5] rounded px-3 py-2 text-sm" /></div>
                  <div><label className="text-xs text-[#737373]">Code</label><input name="code" defaultValue={replaceModal.code} className="w-full border border-[#e5e5e5] rounded px-3 py-2 text-sm" /></div>
                  <div><label className="text-xs text-[#737373]">Coût de remplacement (FCFA) *</label><input name="value" type="number" required className="w-full border border-[#e5e5e5] rounded px-3 py-2 text-sm" /></div>
                  <div><label className="text-xs text-[#737373]">Durée de vie (années)</label><input name="usefulLife" type="number" defaultValue="10" className="w-full border border-[#e5e5e5] rounded px-3 py-2 text-sm" /></div>
                  <div><label className="text-xs text-[#737373]">Date d'acquisition</label><input name="acquisitionDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full border border-[#e5e5e5] rounded px-3 py-2 text-sm" /></div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setReplaceModal(null)} className="px-4 py-2 text-sm border rounded-lg">Annuler</button>
                  <button type="submit" className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg">Remplacer</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </FeatureGuard>
  );
};

export default ComposantsPage;
