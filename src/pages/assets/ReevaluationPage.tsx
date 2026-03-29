// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../hooks/useToast';
import FeatureGuard from '../../components/auth/FeatureGuard';
import { previewReevaluation, executerReevaluation } from '../../services/immobilisations/reevaluationService';
import { formatCurrency } from '../../utils/formatters';
import { ArrowLeft, TrendingUp, Calculator, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ReevaluationPage: React.FC = () => {
  const { adapter } = useData();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [nouvelleValeur, setNouvelleValeur] = useState('');
  const [dateReevaluation, setDateReevaluation] = useState(new Date().toISOString().split('T')[0]);
  const [justification, setJustification] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const all = await adapter.getAll('assets') as any[];
        setAssets(all.filter(a => !a.isComponent && !a.dateSortie));
      } catch { setAssets([]); }
    };
    load();
  }, [adapter]);

  const handlePreview = async () => {
    if (!selectedAssetId || !nouvelleValeur) { toast.error('Sélectionnez un actif et saisissez la nouvelle valeur'); return; }
    setLoading(true);
    try {
      const result = await previewReevaluation(adapter, {
        assetId: selectedAssetId,
        nouvelleValeur: parseFloat(nouvelleValeur),
        dateReevaluation,
        justification,
      });
      if (result.success) {
        setPreview(result.impact);
        toast.success('Aperçu calculé');
      } else {
        toast.error(result.error || 'Erreur de calcul');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    }
    setLoading(false);
  };

  const handleValidate = async () => {
    setLoading(true);
    try {
      await executerReevaluation(adapter, {
        assetId: selectedAssetId,
        nouvelleValeur: parseFloat(nouvelleValeur),
        dateReevaluation,
        justification,
      });
      toast.success('Réévaluation validée — écritures SYSCOHADA générées');
      setPreview(null);
      setSelectedAssetId('');
      setNouvelleValeur('');
    } catch (err: any) {
      toast.error(err.message || 'Erreur de validation');
    }
    setLoading(false);
  };

  const selectedAsset = assets.find(a => a.id === selectedAssetId);

  return (
    <FeatureGuard module="reevaluation_immobilisations">
      <div className="p-6 bg-[#e5e5e5] min-h-screen">
        <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm mb-6">
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate('/assets')} className="flex items-center px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#171717]">Réévaluation des Immobilisations</h1>
              <p className="text-sm text-[#737373]">Conforme SYSCOHADA révisé — Écart au compte 105</p>
            </div>
          </div>
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm mb-6">
          <h2 className="font-semibold text-[#171717] mb-4">Paramètres de réévaluation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs text-[#737373] mb-1">Immobilisation *</label>
              <select value={selectedAssetId} onChange={e => setSelectedAssetId(e.target.value)} className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm">
                <option value="">Sélectionner...</option>
                {assets.map(a => (
                  <option key={a.id} value={a.id}>{a.code || a.id} — {a.libelle || a.name || 'Sans nom'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#737373] mb-1">Nouvelle valeur (FCFA) *</label>
              <input type="number" value={nouvelleValeur} onChange={e => setNouvelleValeur(e.target.value)}
                className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm" placeholder="Ex: 15 000 000" />
            </div>
            <div>
              <label className="block text-xs text-[#737373] mb-1">Date de réévaluation</label>
              <input type="date" value={dateReevaluation} onChange={e => setDateReevaluation(e.target.value)}
                className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-[#737373] mb-1">Justification</label>
              <input type="text" value={justification} onChange={e => setJustification(e.target.value)}
                className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm" placeholder="Expert, marché..." />
            </div>
          </div>
          <button onClick={handlePreview} disabled={loading} className="px-4 py-2 bg-[#171717] text-white rounded-lg text-sm font-medium hover:bg-[#404040] flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            {loading ? 'Calcul...' : 'Calculer l\'aperçu'}
          </button>
        </div>

        {/* Résultats */}
        {preview && (
          <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm mb-6">
            <h2 className="font-semibold text-[#171717] mb-4">Résultat de la réévaluation</h2>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-[#737373]">VNC actuelle</p>
                <p className="text-lg font-bold text-[#171717]">{formatCurrency(preview.ancienneVNC || 0)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-[#737373]">Nouvelle valeur</p>
                <p className="text-lg font-bold text-[#171717]">{formatCurrency(parseFloat(nouvelleValeur))}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-xs text-[#737373]">Écart de réévaluation</p>
                <p className="text-lg font-bold text-green-700">{formatCurrency(preview.ecart || 0)}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-xs text-[#737373]">Nouvelle dotation annuelle</p>
                <p className="text-lg font-bold text-blue-700">{formatCurrency(preview.nouvelleDotation || 0)}</p>
              </div>
            </div>

            <div className="border border-[#e5e5e5] rounded-lg overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50"><th className="p-3 text-left">Compte</th><th className="p-3 text-left">Libellé</th><th className="p-3 text-right">Débit</th><th className="p-3 text-right">Crédit</th></tr></thead>
                <tbody>
                  <tr className="border-t"><td className="p-3 font-mono">{selectedAsset?.compteImmobilisation || '2xxx'}</td><td className="p-3">Augmentation valeur brute</td><td className="p-3 text-right font-medium">{formatCurrency(preview.ecart || 0)}</td><td className="p-3 text-right">—</td></tr>
                  <tr className="border-t"><td className="p-3 font-mono">105x</td><td className="p-3">Écart de réévaluation</td><td className="p-3 text-right">—</td><td className="p-3 text-right font-medium">{formatCurrency(preview.ecart || 0)}</td></tr>
                </tbody>
              </table>
            </div>

            <button onClick={handleValidate} disabled={loading} className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {loading ? 'Validation...' : 'Valider et générer les écritures SYSCOHADA'}
            </button>
          </div>
        )}
      </div>
    </FeatureGuard>
  );
};

export default ReevaluationPage;
