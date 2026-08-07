import React, { useState, useEffect } from 'react';
import PageHeaderActions from '../../components/ui/PageHeaderActions';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../hooks/useToast';
import FeatureGuard from '../../components/auth/FeatureGuard';
import { previewReevaluation, executerReevaluation } from '../../services/immobilisations/reevaluationService';
import { formatCurrency } from '../../utils/formatters';
import { ArrowLeft, TrendingUp, Calculator, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

const ReevaluationPage: React.FC = () => {
  const { adapter } = useData();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();
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
        const all = await adapter.getAll('assets') as Record<string, unknown>[];
        setAssets(all.filter(a => !a.isComponent && (a.status ?? 'active') === 'active'));
      } catch (err) { /* silent */ setAssets([]); }
    };
    load();
  }, [adapter]);

  const handlePreview = async () => {
    if (!selectedAssetId || !nouvelleValeur) { toast.error(t('assetRevaluation.selectAssetAndValue')); return; }
    setLoading(true);
    try {
      const result = await previewReevaluation(adapter, {
        assetId: selectedAssetId,
        nouvelleValeur: parseFloat(nouvelleValeur),
        dateReevaluation,
        motif: justification,
        typeReevaluation: 'libre',
      });
      if (result.success) {
        setPreview(result.impact);
        toast.success(t('assetRevaluation.previewComputed'));
      } else {
        toast.error(result.error || t('assetRevaluation.computeError'));
      }
    } catch (err: any) {
      toast.error(err.message || t('assetRevaluation.error'));
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
        motif: justification,
        typeReevaluation: 'libre',
      });
      toast.success(t('assetRevaluation.validated'));
      setPreview(null);
      setSelectedAssetId('');
      setNouvelleValeur('');
    } catch (err: any) {
      toast.error(err.message || t('assetRevaluation.validationError'));
    }
    setLoading(false);
  };

  const selectedAsset = assets.find(a => a.id === selectedAssetId);

  return (
    <FeatureGuard module="reevaluation_immobilisations">
      <div className="p-6 bg-[var(--color-border)] min-h-full">
        <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm mb-6">
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate('/assets')} className="flex items-center px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--color-primary)]">{t('assetRevaluation.title')}</h1>
              <p className="text-sm text-[var(--color-text-tertiary)]">{t('assetRevaluation.subtitle')}</p>
            </div>
            <PageHeaderActions className="ml-auto" />
          </div>
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm mb-6">
          <h2 className="font-semibold text-[var(--color-primary)] mb-4">{t('assetRevaluation.paramsTitle')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs text-[var(--color-text-tertiary)] mb-1">{t('assetRevaluation.assetLabel')}</label>
              <select value={selectedAssetId} onChange={e => setSelectedAssetId(e.target.value)} className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm">
                <option value="">{t('assetRevaluation.selectOption')}</option>
                {assets.map(a => (
                  <option key={a.id} value={a.id}>{a.code || a.id} — {a.libelle || a.name || t('assetRevaluation.unnamed')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--color-text-tertiary)] mb-1">{t('assetRevaluation.newValueLabel')}</label>
              <input type="number" value={nouvelleValeur} onChange={e => setNouvelleValeur(e.target.value)}
                className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm" placeholder={t('assetRevaluation.newValuePlaceholder')} />
            </div>
            <div>
              <label className="block text-xs text-[var(--color-text-tertiary)] mb-1">{t('assetRevaluation.dateLabel')}</label>
              <input type="date" value={dateReevaluation} onChange={e => setDateReevaluation(e.target.value)}
                className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-[var(--color-text-tertiary)] mb-1">{t('assetRevaluation.justificationLabel')}</label>
              <input type="text" value={justification} onChange={e => setJustification(e.target.value)}
                className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm" placeholder={t('assetRevaluation.justificationPlaceholder')} />
            </div>
          </div>
          <button onClick={handlePreview} disabled={loading} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[#404040] flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            {loading ? t('assetRevaluation.computing') : t('assetRevaluation.computePreview')}
          </button>
        </div>

        {/* Résultats */}
        {preview && (
          <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm mb-6">
            <h2 className="font-semibold text-[var(--color-primary)] mb-4">{t('assetRevaluation.resultTitle')}</h2>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-[var(--color-text-tertiary)]">{t('assetRevaluation.currentNbv')}</p>
                <p className="text-lg font-bold text-[var(--color-primary)]">{formatCurrency(preview.vnc || 0)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-[var(--color-text-tertiary)]">{t('assetRevaluation.newValue')}</p>
                <p className="text-lg font-bold text-[var(--color-primary)]">{formatCurrency(preview.nouvelleValeurBrute || parseFloat(nouvelleValeur) || 0)}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-xs text-[var(--color-text-tertiary)]">{t('assetRevaluation.revaluationSurplus')}</p>
                <p className="text-lg font-bold text-green-700">{formatCurrency(preview.ecartReevaluation || 0)}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-xs text-[var(--color-text-tertiary)]">{t('assetRevaluation.newAnnualCharge')}</p>
                <p className="text-lg font-bold text-blue-700">{formatCurrency(preview.nouvelleDotationAnnuelle || 0)}</p>
              </div>
            </div>

            <div className="border border-[var(--color-border)] rounded-lg overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50"><th className="p-3 text-left">{t('assetRevaluation.colAccount')}</th><th className="p-3 text-left">{t('assetRevaluation.colLabel')}</th><th className="p-3 text-right">{t('assetRevaluation.colDebit')}</th><th className="p-3 text-right">{t('assetRevaluation.colCredit')}</th></tr></thead>
                <tbody>
                  <tr className="border-t"><td className="p-3 font-mono">{selectedAsset?.compteImmobilisation || '2xxx'}</td><td className="p-3">{t('assetRevaluation.grossIncrease')}</td><td className="p-3 text-right font-medium">{formatCurrency(preview.ecartReevaluation || 0)}</td><td className="p-3 text-right">—</td></tr>
                  <tr className="border-t"><td className="p-3 font-mono">106x</td><td className="p-3">{t('assetRevaluation.revaluationSurplus')}</td><td className="p-3 text-right">—</td><td className="p-3 text-right font-medium">{formatCurrency(preview.ecartReevaluation || 0)}</td></tr>
                </tbody>
              </table>
            </div>

            <button onClick={handleValidate} disabled={loading} className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {loading ? t('assetRevaluation.validating') : t('assetRevaluation.validateAndPost')}
            </button>
          </div>
        )}
      </div>
    </FeatureGuard>
  );
};

export default ReevaluationPage;
