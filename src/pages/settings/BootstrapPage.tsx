/**
 * Initialisation du paramétrage standard (CDC Paramètres §22, critère #6).
 *
 * Vérifie et complète le paramétrage minimal du tenant courant (plan analytique,
 * conditions de paiement, rôles standard) — same-tenant, non destructif.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, RefreshCw, Rocket, CheckCircle, Circle } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { getBootstrapStatus, runBootstrap, type BootstrapStatus, type BootstrapReport } from '../../services/param/paramBootstrapService';
import { useLanguage } from '@/contexts/LanguageContext';

const BootstrapPage: React.FC = () => {
  const navigate = useNavigate();
  const { adapter } = useData();
  const { t } = useLanguage();
  const [status, setStatus] = useState<BootstrapStatus | null>(null);
  const [report, setReport] = useState<BootstrapReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setStatus(await getBootstrapStatus(adapter)); }
    catch (e) { toast.error(t('paramBootstrap.loadFailed', { message: (e as Error).message })); }
    finally { setLoading(false); }
  }, [adapter, t]);
  useEffect(() => { void load(); }, [load]);

  const run = async () => {
    setBusy(true); setReport(null);
    try { const r = await runBootstrap(adapter); setReport(r); toast.success(t('paramBootstrap.initialized')); await load(); }
    catch (e) { toast.error(t('paramBootstrap.failed', { message: (e as Error).message })); }
    finally { setBusy(false); }
  };

  const line = (ok: boolean, label: string, detail: string) => (
    <div className="flex items-center gap-2 py-2">
      {ok ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Circle className="w-5 h-5 text-amber-500" />}
      <span className="text-gray-800">{label}</span>
      <span className="text-xs text-gray-400">{detail}</span>
    </div>
  );

  return (
    <div className="p-6 space-y-4 max-w-2xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><Rocket className="w-5 h-5 text-[var(--color-primary)]" /> {t('paramBootstrap.title')}</h1>
            <p className="text-sm text-gray-600">{t('paramBootstrap.subtitle')}</p>
          </div>
        </div>
        <button onClick={() => void load()} className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-2 text-sm"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      <div className="border border-gray-200 rounded-lg p-4 bg-white divide-y divide-gray-100">
        {loading && <div className="py-4 text-center text-gray-500">{t('paramBootstrap.loading')}</div>}
        {!loading && status && (<>
          {line(status.hasPlan, t('paramBootstrap.analyticsPlan'), t(status.hasPlan ? 'paramBootstrap.present' : 'paramBootstrap.toCreatePrincipal'))}
          {line(status.nbConditions > 0, t('paramBootstrap.paymentTerms'), status.nbConditions > 0 ? t('paramBootstrap.nPresent', { count: String(status.nbConditions) }) : t('paramBootstrap.fiveStandardToCreate'))}
          {line(status.nbRoles > 0, t('paramBootstrap.standardRoles'), status.nbRoles > 0 ? t('paramBootstrap.nDefined', { count: String(status.nbRoles) }) : t('paramBootstrap.eightRolesToCreate'))}
        </>)}
      </div>

      {status && (
        status.missing.length === 0
          ? <div className="p-3 rounded-lg border border-green-300 bg-green-50 text-sm text-green-800 flex items-center gap-2"><CheckCircle className="w-5 h-5" />{t('paramBootstrap.complete')}</div>
          : <button onClick={run} disabled={busy} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
              <Rocket className="w-4 h-4" />{busy ? t('paramBootstrap.initializing') : t('paramBootstrap.initializeN', { count: String(status.missing.length) })}
            </button>
      )}

      {report && (
        <div className="text-sm text-gray-600 border border-gray-200 rounded-lg p-3 bg-gray-50">
          {t('paramBootstrap.createdPrefix')} {report.plan ? t('paramBootstrap.planCreated') : ''}{report.conditions > 0 ? t('paramBootstrap.conditionsCreated', { count: String(report.conditions) }) : ''}{report.roles > 0 ? t('paramBootstrap.rolesCreated', { count: String(report.roles) }) : ''}{!report.plan && !report.conditions && !report.roles ? t('paramBootstrap.nothingCreated') : ''}
        </div>
      )}
      <p className="text-xs text-gray-500">{t('paramBootstrap.footnote')}</p>
    </div>
  );
};

export default BootstrapPage;
