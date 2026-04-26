// @ts-nocheck

import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../hooks/useToast';
import FeatureGuard from '../../components/auth/FeatureGuard';
import {
  creerEffet,
  transitionEffet,
  getTransitionsDisponibles,
  isEffetEnRetard,
  type EffetCommerce,
  type StatutEffet,
  type TypeEffet,
} from '../../services/tresorerie/effetsCommerceService';
import { FileText, Plus, ArrowLeft, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatters';

const STATUT_LABELS: Record<StatutEffet, string> = {
  cree: 'Créé',
  accepte: 'Accepté',
  endosse: 'Endossé',
  remis_encaissement: 'Remis encaissement',
  remis_escompte: 'Remis escompte',
  echu: 'Échu',
  paye: 'Payé',
  impaye: 'Impayé',
  proteste: 'Protesté',
};

const STATUT_COLORS: Record<string, string> = {
  paye: 'bg-green-100 text-green-800',
  impaye: 'bg-red-100 text-red-800',
  proteste: 'bg-red-200 text-red-900',
  echu: 'bg-yellow-100 text-yellow-800',
  cree: 'bg-gray-100 text-gray-800',
  accepte: 'bg-blue-100 text-blue-800',
  endosse: 'bg-purple-100 text-purple-800',
  remis_encaissement: 'bg-indigo-100 text-indigo-800',
  remis_escompte: 'bg-orange-100 text-orange-800',
};

const EffetsCommercePage: React.FC = () => {
  const { adapter } = useData();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TypeEffet>('lettre_de_change');
  const [effets, setEffets] = useState<EffetCommerce[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [filterStatut, setFilterStatut] = useState<string>('all');

  const loadEffets = async () => {
    setLoading(true);
    try {
      const all = await adapter.getAll('effetsCommerce') as EffetCommerce[];
      setEffets(all.filter(e => e.type === activeTab));
    } catch (err) { /* silent */
      setEffets([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadEffets(); }, [activeTab]);

  const handleTransition = async (effet: EffetCommerce, newStatut: StatutEffet) => {
    try {
      await transitionEffet(adapter, effet, newStatut, new Date().toISOString().split('T')[0]);
      toast.success(`Effet ${effet.numero} → ${STATUT_LABELS[newStatut]}`);
      loadEffets();
    } catch (err: any) {
      toast.error(err.message || 'Erreur de transition');
    }
  };

  const handleCreate = async (formData: any) => {
    try {
      const effet = creerEffet({
        type: activeTab,
        montant: parseFloat(formData.montant),
        dateEcheance: formData.dateEcheance,
        tireur: formData.tireur,
        tire: formData.tire,
        beneficiaire: formData.beneficiaire,
        lieuPaiement: formData.lieuPaiement,
      });
      await adapter.create('effetsCommerce', effet);
      toast.success('Effet créé avec succès');
      setShowModal(false);
      loadEffets();
    } catch (err: any) {
      toast.error(err.message || 'Erreur de création');
    }
  };

  const filtered = filterStatut === 'all' ? effets : effets.filter(e => e.statut === filterStatut);

  return (
    <FeatureGuard module="effets_commerce">
      <div className="p-6 bg-[var(--color-border)] min-h-screen">
        {/* Header */}
        <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button onClick={() => navigate('/treasury')} className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-[var(--color-primary)]">Effets de Commerce</h1>
                  <p className="text-sm text-[var(--color-text-tertiary)]">Lettres de change & billets à ordre — SYSCOHADA</p>
                </div>
              </div>
            </div>
            <button onClick={() => setShowModal(true)} className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[#404040]">
              <Plus className="w-4 h-4" />
              <span>Nouvel effet</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {([['lettre_de_change', 'Lettres de Change'], ['billet_a_ordre', 'Billets à Ordre']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === key ? 'bg-[var(--color-primary)] text-white' : 'bg-white text-[var(--color-text-tertiary)] border border-[var(--color-border)]'}`}>
              {label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} className="text-sm border border-[var(--color-border)] rounded-lg px-3 py-2">
              <option value="all">Tous les statuts</option>
              {Object.entries(STATUT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-[var(--color-text-tertiary)]">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-[var(--color-text-tertiary)]">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Aucun effet de commerce</p>
              <p className="text-sm mt-1">Créez votre premier {activeTab === 'lettre_de_change' ? 'lettre de change' : 'billet à ordre'}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-[var(--color-border)]">
                  <th className="p-3 text-left text-xs font-semibold text-[var(--color-text-tertiary)] uppercase">N°</th>
                  <th className="p-3 text-left text-xs font-semibold text-[var(--color-text-tertiary)] uppercase">Tireur</th>
                  <th className="p-3 text-left text-xs font-semibold text-[var(--color-text-tertiary)] uppercase">Tiré</th>
                  <th className="p-3 text-right text-xs font-semibold text-[var(--color-text-tertiary)] uppercase">Montant</th>
                  <th className="p-3 text-left text-xs font-semibold text-[var(--color-text-tertiary)] uppercase">Échéance</th>
                  <th className="p-3 text-left text-xs font-semibold text-[var(--color-text-tertiary)] uppercase">Statut</th>
                  <th className="p-3 text-left text-xs font-semibold text-[var(--color-text-tertiary)] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id} className={`border-b border-[var(--color-border)] hover:bg-gray-50 ${isEffetEnRetard(e) ? 'bg-red-50' : ''}`}>
                    <td className="p-3 text-sm font-mono">{e.numero}</td>
                    <td className="p-3 text-sm">{e.tireur}</td>
                    <td className="p-3 text-sm">{e.tire}</td>
                    <td className="p-3 text-sm text-right font-medium">{formatCurrency(e.montant)}</td>
                    <td className="p-3 text-sm">{new Date(e.dateEcheance).toLocaleDateString('fr-FR')}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUT_COLORS[e.statut] || 'bg-gray-100'}`}>
                        {STATUT_LABELS[e.statut]}
                      </span>
                    </td>
                    <td className="p-3">
                      <select onChange={ev => { if (ev.target.value) handleTransition(e, ev.target.value as StatutEffet); ev.target.value = ''; }}
                        defaultValue="" className="text-xs border border-[var(--color-border)] rounded px-2 py-1">
                        <option value="">Transition...</option>
                        {getTransitionsDisponibles(e.statut).map(t => (
                          <option key={t} value={t}>{STATUT_LABELS[t]}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal création */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
              <h2 className="text-lg font-bold mb-4">Nouvel effet — {activeTab === 'lettre_de_change' ? 'Lettre de Change' : 'Billet à Ordre'}</h2>
              <form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); handleCreate(Object.fromEntries(fd)); }}>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div><label className="text-xs text-[var(--color-text-tertiary)]">Tireur *</label><input name="tireur" required className="w-full border border-[var(--color-border)] rounded px-3 py-2 text-sm" /></div>
                  <div><label className="text-xs text-[var(--color-text-tertiary)]">Tiré *</label><input name="tire" required className="w-full border border-[var(--color-border)] rounded px-3 py-2 text-sm" /></div>
                  <div><label className="text-xs text-[var(--color-text-tertiary)]">Bénéficiaire *</label><input name="beneficiaire" required className="w-full border border-[var(--color-border)] rounded px-3 py-2 text-sm" /></div>
                  <div><label className="text-xs text-[var(--color-text-tertiary)]">Montant (FCFA) *</label><input name="montant" type="number" required className="w-full border border-[var(--color-border)] rounded px-3 py-2 text-sm" /></div>
                  <div><label className="text-xs text-[var(--color-text-tertiary)]">Date d'échéance *</label><input name="dateEcheance" type="date" required className="w-full border border-[var(--color-border)] rounded px-3 py-2 text-sm" /></div>
                  <div><label className="text-xs text-[var(--color-text-tertiary)]">Lieu de paiement</label><input name="lieuPaiement" className="w-full border border-[var(--color-border)] rounded px-3 py-2 text-sm" /></div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg">Annuler</button>
                  <button type="submit" className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg">Créer</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </FeatureGuard>
  );
};

export default EffetsCommercePage;
