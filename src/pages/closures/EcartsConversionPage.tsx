
import React, { useState, useEffect } from 'react';
import PageHeaderActions from '../../components/ui/PageHeaderActions';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAccountNames } from '../../hooks/useAccountNames';
import { useToast } from '../../hooks/useToast';
import FeatureGuard from '../../components/auth/FeatureGuard';
import { extourneEcartsConversion } from '../../services/foreignCurrencyPaymentService';
import { formatCurrency } from '../../utils/formatters';
import { ArrowLeft, ArrowLeftRight, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EcartsConversionPage: React.FC = () => {
  const { adapter } = useData();
  const { t, language } = useLanguage();
  const dateLocale = language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'fr-FR';
  const { format: fmtAccount } = useAccountNames();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [ecarts, setEcarts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateExtourne, setDateExtourne] = useState(new Date().toISOString().split('T')[0]);
  const [processing, setProcessing] = useState(false);

  const loadEcarts = async () => {
    setLoading(true);
    try {
      const entries = await adapter.getAll('journalEntries') as Record<string, unknown>[];
      const ecartLines: any[] = [];
      for (const entry of entries) {
        if (entry.status !== 'validated' && entry.status !== 'posted') continue;
        for (const line of ((entry as any).lines || [])) {
          const code = line.accountCode || '';
          // SYSCOHADA révisé : 478 = écarts de conversion (4784 actif / 4786
          // passif). 476/477 = charges/produits constatés d'avance (CCA/PCA),
          // à NE PAS confondre — c'était la source du bug.
          if (code.startsWith('478')) {
            ecartLines.push({
              id: `${entry.id}-${line.id}`,
              entryId: entry.id,
              entryNumber: entry.entryNumber,
              date: entry.date,
              compte: code,
              libelle: line.label || entry.label || '',
              debit: line.debit || 0,
              credit: line.credit || 0,
            });
          }
        }
      }
      setEcarts(ecartLines);
    } catch (err) { /* silent */ setEcarts([]); }
    setLoading(false);
  };

  useEffect(() => { loadEcarts(); }, [adapter]);

  const handleExtourne = async () => {
    if (!dateExtourne) { toast.error(t('fxGaps.selectReversalDate')); return; }
    setProcessing(true);
    try {
      const ids = await extourneEcartsConversion(adapter, 'default', dateExtourne);
      if (ids.length > 0) {
        toast.success(t('fxGaps.reversalsGenerated', { count: String(ids.length) }));
      } else {
        toast.warning(t('fxGaps.nothingToReverse'));
      }
      loadEcarts();
    } catch (err: any) {
      toast.error(err.message || t('fxGaps.reversalError'));
    }
    setProcessing(false);
  };

  // 4784 = écart de conversion ACTIF (perte latente, débiteur) ; 4786 = écart
  // de conversion PASSIF (gain latent, créditeur).
  const total476 = ecarts.filter(e => e.compte.startsWith('4784')).reduce((s, e) => s + e.debit - e.credit, 0);
  const total477 = ecarts.filter(e => e.compte.startsWith('4786')).reduce((s, e) => s + e.credit - e.debit, 0);

  return (
    <FeatureGuard module="ecarts_conversion">
      <div className="p-6 bg-[var(--color-border)] min-h-full">
        <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button onClick={() => navigate('/closures')} className="flex items-center px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <ArrowLeftRight className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[var(--color-primary)]">{t('fxGaps.title')}</h1>
                <p className="text-sm text-[var(--color-text-tertiary)]">{t('fxGaps.subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <PageHeaderActions />
              <div>
                <label className="text-xs text-[var(--color-text-tertiary)]">{t('fxGaps.reversalDate')}</label>
                <input type="date" value={dateExtourne} onChange={e => setDateExtourne(e.target.value)}
                  className="block border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-sm" />
              </div>
              <button onClick={handleExtourne} disabled={processing || ecarts.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 mt-4">
                <RefreshCw className={`w-4 h-4 ${processing ? 'animate-spin' : ''}`} />
                {processing ? t('fxGaps.reversing') : t('fxGaps.reverseAll')}
              </button>
            </div>
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
            <p className="text-xs text-[var(--color-text-tertiary)]">{t('fxGaps.assetGaps')}</p>
            <p className="text-xl font-bold text-[var(--color-primary)]">{formatCurrency(Math.abs(total476))}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
            <p className="text-xs text-[var(--color-text-tertiary)]">{t('fxGaps.liabilityGaps')}</p>
            <p className="text-xl font-bold text-[var(--color-primary)]">{formatCurrency(Math.abs(total477))}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
            <p className="text-xs text-[var(--color-text-tertiary)]">{t('fxGaps.gapLines')}</p>
            <p className="text-xl font-bold text-[var(--color-primary)]">{ecarts.length}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-[var(--color-text-tertiary)]">{t('fxGaps.loading')}</div>
          ) : ecarts.length === 0 ? (
            <div className="p-12 text-center text-[var(--color-text-tertiary)]">
              <ArrowLeftRight className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">{t('fxGaps.emptyTitle')}</p>
              <p className="text-sm mt-1">{t('fxGaps.emptyHint')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-[var(--color-border)]">
                  <th className="p-3 text-left text-xs font-semibold text-[var(--color-text-tertiary)] uppercase">{t('fxGaps.colEntryNumber')}</th>
                  <th className="p-3 text-left text-xs font-semibold text-[var(--color-text-tertiary)] uppercase">{t('fxGaps.colDate')}</th>
                  <th className="p-3 text-left text-xs font-semibold text-[var(--color-text-tertiary)] uppercase">{t('fxGaps.colAccount')}</th>
                  <th className="p-3 text-left text-xs font-semibold text-[var(--color-text-tertiary)] uppercase">{t('fxGaps.colLabel')}</th>
                  <th className="p-3 text-right text-xs font-semibold text-[var(--color-text-tertiary)] uppercase">{t('fxGaps.colDebit')}</th>
                  <th className="p-3 text-right text-xs font-semibold text-[var(--color-text-tertiary)] uppercase">{t('fxGaps.colCredit')}</th>
                </tr>
              </thead>
              <tbody>
                {ecarts.map(e => (
                  <tr key={e.id} className="border-b border-[var(--color-border)] hover:bg-gray-50">
                    <td className="p-3 text-sm font-mono">{e.entryNumber || '—'}</td>
                    <td className="p-3 text-sm">{e.date ? new Date(e.date).toLocaleDateString(dateLocale) : '—'}</td>
                    <td className="p-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${e.compte.startsWith('4784') ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                        {fmtAccount(e.compte)}
                      </span>
                    </td>
                    <td className="p-3 text-sm">{e.libelle}</td>
                    <td className="p-3 text-sm text-right">{e.debit > 0 ? formatCurrency(e.debit) : '—'}</td>
                    <td className="p-3 text-sm text-right">{e.credit > 0 ? formatCurrency(e.credit) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </FeatureGuard>
  );
};

export default EcartsConversionPage;
