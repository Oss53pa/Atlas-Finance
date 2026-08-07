/**
 * Protection des données personnelles (CDC Paramètres §13).
 *
 * Politique de rétention + responsable des données. NON destructif : configure
 * les durées et désigne le responsable ; l'anonymisation effective des tiers
 * personnes physiques arrivera dans un lot contrôlé dédié.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, RefreshCw, ShieldCheck, Save, Info } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { getRetentionConfig, setRgpdParam, type RetentionConfig } from '../../services/param/rgpdService';
import { useLanguage } from '@/contexts/LanguageContext';

const RgpdPage: React.FC = () => {
  const navigate = useNavigate();
  const { adapter } = useData();
  const { t } = useLanguage();
  const [cfg, setCfg] = useState<RetentionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [tiersMois, setTiersMois] = useState('');
  const [responsable, setResponsable] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const c = await getRetentionConfig(adapter);
      setCfg(c); setTiersMois(String(c.retentionTiersMois)); setResponsable(c.responsable || '');
    } catch (e) { toast.error(t('rgpd.loadFailed', { message: (e as Error).message })); }
    finally { setLoading(false); }
  }, [adapter, t]);
  useEffect(() => { void load(); }, [load]);

  const saveRetention = async () => {
    const v = Number(tiersMois);
    if (Number.isNaN(v) || v < 0) { toast.error(t('rgpd.invalidMonths')); return; }
    try { await setRgpdParam(adapter, 'retention_tiers_mois', v); toast.success(t('rgpd.retentionUpdated')); await load(); }
    catch (e) { toast.error((e as Error).message); }
  };
  const saveResponsable = async () => {
    try { await setRgpdParam(adapter, 'responsable_donnees', responsable.trim()); toast.success(t('rgpd.ownerSaved')); await load(); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-[var(--color-primary)]" /> {t('rgpd.title')}</h1>
            <p className="text-sm text-gray-600">{t('rgpd.subtitle')}</p>
          </div>
        </div>
        <button onClick={() => void load()} className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-2 text-sm"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Recharger</button>
      </div>

      <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 text-sm text-blue-900 flex items-start gap-2">
        <Info className="w-5 h-5 shrink-0 mt-0.5" />
        <span>{t('rgpd.notice', { years: String(cfg?.retentionPiecesAns ?? 10) })}</span>
      </div>

      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
        <div className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="font-medium text-gray-800">{t('rgpd.partyRetention')}</div>
            <div className="text-xs text-gray-500">{t('rgpd.partyRetentionHint')}</div>
          </div>
          <div className="flex items-center gap-2">
            <input type="number" value={tiersMois} onChange={e => setTiersMois(e.target.value)} className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right" />
            <span className="text-sm text-gray-500">{t('rgpd.months')}</span>
            <button onClick={saveRetention} className="px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-sm flex items-center gap-1"><Save className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="font-medium text-gray-800">{t('rgpd.dataOwner')}</div>
            <div className="text-xs text-gray-500">{t('rgpd.dataOwnerHint')}</div>
          </div>
          <div className="flex items-center gap-2">
            <input value={responsable} onChange={e => setResponsable(e.target.value)} placeholder={t('rgpd.ownerPlaceholder')} className="w-64 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
            <button onClick={saveResponsable} className="px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-sm flex items-center gap-1"><Save className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-800 flex items-center justify-between flex-wrap gap-2">
        <span><b>{t('rgpd.anonymisationTitle')}</b> {t('rgpd.anonymisationHint')}</span>
        <button onClick={() => navigate('/settings/rgpd/anonymisation')} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs whitespace-nowrap">{t('rgpd.openAnonymisation')}</button>
      </div>
    </div>
  );
};

export default RgpdPage;
