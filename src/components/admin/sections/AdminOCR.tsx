import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ScanLine, Eye, EyeOff, Loader2, CheckCircle, XCircle, Save, Plug } from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import {
  getOCRConfig,
  saveOCRConfig,
  testOCRProvider,
  DEFAULT_OCR_CONFIG,
  type OCRConfig,
  type OCRProviderId,
  type AIVisionBackend,
} from '../../../services/ocr';

const AdminOCR: React.FC = () => {
  const { adapter } = useData();
  const [config, setConfig] = useState<OCRConfig>(DEFAULT_OCR_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    getOCRConfig(adapter)
      .then(setConfig)
      .finally(() => setLoading(false));
  }, [adapter]);

  const set = <K extends keyof OCRConfig>(key: K, value: OCRConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setTestResult(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveOCRConfig(adapter, config);
      toast.success('Configuration OCR enregistrée');
    } catch {
      toast.error('Échec de l\'enregistrement de la configuration OCR');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testOCRProvider(config);
    setTestResult(result);
    setTesting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const inputCls =
    'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--color-accent-light)] flex items-center justify-center">
          <ScanLine className="w-5 h-5 text-[var(--color-accent)]" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Configuration OCR</h2>
          <p className="text-sm text-gray-500">
            Choisissez le moteur d'extraction des factures. Visible et modifiable par l'administrateur uniquement.
          </p>
        </div>
      </div>

      {/* Moteur */}
      <div className="bg-white rounded-xl p-6 border space-y-4">
        <h4 className="font-semibold">Moteur d'extraction</h4>
        <div>
          <label className={labelCls}>Service OCR</label>
          <select
            className={inputCls}
            value={config.provider}
            onChange={(e) => set('provider', e.target.value as OCRProviderId)}
          >
            <option value="none">Désactivé (aucune extraction)</option>
            <option value="ai-vision">IA Vision (Claude / Ollama)</option>
            <option value="mindee">Mindee (clé API)</option>
          </select>
        </div>

        {config.provider === 'ai-vision' && (
          <div className="space-y-4 border-l-2 border-[var(--color-accent-light)] pl-4">
            <div>
              <label className={labelCls}>Backend IA</label>
              <select
                className={inputCls}
                value={config.aiVisionBackend}
                onChange={(e) => set('aiVisionBackend', e.target.value as AIVisionBackend)}
              >
                <option value="auto">Automatique (Ollama local sinon Claude)</option>
                <option value="anthropic">Claude (via Supabase ai-proxy)</option>
                <option value="ollama">Ollama (local)</option>
              </select>
            </div>
            {config.aiVisionBackend !== 'anthropic' && (
              <div>
                <label className={labelCls}>Modèle vision Ollama</label>
                <input
                  className={inputCls}
                  value={config.ollamaVisionModel}
                  onChange={(e) => set('ollamaVisionModel', e.target.value)}
                  placeholder="llama3.2-vision"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Doit être installé : <code>ollama pull {config.ollamaVisionModel || 'llama3.2-vision'}</code>
                </p>
              </div>
            )}
          </div>
        )}

        {config.provider === 'mindee' && (
          <div className="border-l-2 border-[var(--color-accent-light)] pl-4">
            <label className={labelCls}>Clé API Mindee</label>
            <div className="relative">
              <input
                className={inputCls + ' pr-10'}
                type={showKey ? 'text' : 'password'}
                value={config.mindeeApiKey}
                onChange={(e) => set('mindeeApiKey', e.target.value)}
                placeholder="votre token Mindee"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Offre gratuite sur mindee.com — la clé n'est utilisée que pour l'extraction de factures.
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || config.provider === 'none'}
            className="px-4 py-2 rounded-lg border text-sm flex items-center gap-2 hover:border-[var(--color-accent)] disabled:opacity-50"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />}
            Tester la connexion
          </button>
          {testResult && (
            <span
              className={`text-sm flex items-center gap-1 ${testResult.ok ? 'text-green-600' : 'text-red-600'}`}
            >
              {testResult.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {testResult.message}
            </span>
          )}
        </div>
      </div>

      {/* Préférences d'extraction */}
      <div className="bg-white rounded-xl p-6 border space-y-4">
        <h4 className="font-semibold">Préférences d'extraction</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Devise par défaut</label>
            <select className={inputCls} value={config.defaultCurrency} onChange={(e) => set('defaultCurrency', e.target.value)}>
              <option value="XAF">FCFA (XAF)</option>
              <option value="XOF">FCFA (XOF)</option>
              <option value="EUR">Euro (EUR)</option>
              <option value="USD">Dollar US (USD)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Taux TVA par défaut (%)</label>
            <input
              className={inputCls}
              type="number"
              step="0.01"
              value={config.defaultTaxRate}
              onChange={(e) => set('defaultTaxRate', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className={labelCls}>Langue de traitement</label>
            <select className={inputCls} value={config.language} onChange={(e) => set('language', e.target.value)}>
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Seuil de confiance : {config.confidenceThreshold}%</label>
            <input
              type="range"
              min={50}
              max={100}
              value={config.confidenceThreshold}
              onChange={(e) => set('confidenceThreshold', parseInt(e.target.value, 10))}
              className="w-full mt-2"
            />
          </div>
        </div>
        <div className="space-y-2 pt-2">
          {([
            ['autoValidate', 'Valider automatiquement au-dessus du seuil de confiance'],
            ['extractLineItems', 'Extraire les lignes d\'articles'],
            ['duplicateCheck', 'Vérifier les doublons'],
            ['enhanceImage', 'Amélioration d\'image avant extraction'],
          ] as [keyof OCRConfig, string][]).map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={config[key] as boolean}
                onChange={(e) => set(key, e.target.checked as never)}
                className="w-4 h-4"
              />
              <span className="text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Comptabilisation */}
      <div className="bg-white rounded-xl p-6 border space-y-4">
        <h4 className="font-semibold">Comptabilisation (SYSCOHADA)</h4>
        <p className="text-xs text-gray-500">
          Comptes utilisés lors de « Valider et Comptabiliser » une facture. Le sens
          achat/vente est auto-détecté (émetteur = société → vente), corrigeable à la revue.
        </p>
        <div className="text-xs font-semibold text-gray-600">Facture d'ACHAT (journal AC)</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Journal d'achat</label>
            <input className={inputCls} value={config.defaultJournal} onChange={(e) => set('defaultJournal', e.target.value)} placeholder="AC" />
          </div>
          <div>
            <label className={labelCls}>Compte de charge</label>
            <input className={inputCls} value={config.defaultExpenseAccount} onChange={(e) => set('defaultExpenseAccount', e.target.value)} placeholder="601" />
          </div>
          <div>
            <label className={labelCls}>Compte TVA récupérable</label>
            <input className={inputCls} value={config.defaultVatAccount} onChange={(e) => set('defaultVatAccount', e.target.value)} placeholder="4452" />
          </div>
          <div>
            <label className={labelCls}>Compte fournisseur</label>
            <input className={inputCls} value={config.defaultSupplierAccount} onChange={(e) => set('defaultSupplierAccount', e.target.value)} placeholder="401" />
          </div>
        </div>
        <div className="text-xs font-semibold text-gray-600 pt-2">Facture de VENTE (journal VE)</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Journal de vente</label>
            <input className={inputCls} value={config.defaultSalesJournal} onChange={(e) => set('defaultSalesJournal', e.target.value)} placeholder="VE" />
          </div>
          <div>
            <label className={labelCls}>Compte de produit</label>
            <input className={inputCls} value={config.defaultRevenueAccount} onChange={(e) => set('defaultRevenueAccount', e.target.value)} placeholder="701" />
          </div>
          <div>
            <label className={labelCls}>Compte TVA collectée</label>
            <input className={inputCls} value={config.defaultVatCollectedAccount} onChange={(e) => set('defaultVatCollectedAccount', e.target.value)} placeholder="443" />
          </div>
          <div>
            <label className={labelCls}>Compte client</label>
            <input className={inputCls} value={config.defaultCustomerAccount} onChange={(e) => set('defaultCustomerAccount', e.target.value)} placeholder="411" />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-lg text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          style={{ background: 'var(--color-accent)' }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Enregistrer la configuration
        </button>
      </div>
    </div>
  );
};

export default AdminOCR;
