/**
 * AffectationTab — Affectation du résultat post-AG + reports à nouveau.
 * Conforme SYSCOHADA révisé.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../../../contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  proposerAffectation,
  validerVentilation,
  genererEcrituresAffectation,
} from '../../../services/cloture/affectationResultatService';
import type { AffectationVentilation } from '../../../services/cloture/affectationResultatService';
import { previewClosure } from '../../../services/closureService';
import { executerCarryForward } from '../../../services/cloture/carryForwardService';
import type { DBFiscalYear } from '../../../lib/db';
import { formatCurrency } from '../../../utils/formatters';
import toast from 'react-hot-toast';
import {
  DollarSign,
  ArrowRight,
  Play,
  Loader2,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
  FileText,
} from 'lucide-react';

// Lazy imports for sub-sections
import IAAssistant from '../sections/IAAssistant';
import DocumentsArchives from '../sections/DocumentsArchives';

interface AffectationTabProps {
  exerciceId: string;
  openingExerciceId?: string;
}

function AffectationTab({ exerciceId, openingExerciceId }: AffectationTabProps) {
  const { adapter } = useData();
  const { t } = useLanguage();

  // Closure preview (result)
  const [resultatNet, setResultatNet] = useState(0);
  const [isBenefice, setIsBenefice] = useState(true);
  const [totalProduits, setTotalProduits] = useState(0);
  const [totalCharges, setTotalCharges] = useState(0);
  const [loading, setLoading] = useState(true);

  // Ventilation form
  const [ventilation, setVentilation] = useState<AffectationVentilation>({
    reserveLegale: 0,
    reservesStatutaires: 0,
    reservesFacultatives: 0,
    dividendes: 0,
    reportANouveau: 0,
  });
  const [capitalSocial, setCapitalSocial] = useState(0);
  const [reserveLegaleActuelle, setReserveLegaleActuelle] = useState(0);

  // Load capital social & réserve légale from accounting data (class 1 accounts)
  useEffect(() => {
    if (!adapter) return;
    adapter.getAll('journalEntries').then((entries: any[]) => {
      let capital = 0;
      let reserve = 0;
      for (const e of entries) {
        for (const l of (e.lines || [])) {
          // Compte 101x = Capital social
          if (l.accountCode?.startsWith('101')) capital += (l.credit || 0) - (l.debit || 0);
          // Compte 111x = Réserve légale
          if (l.accountCode?.startsWith('111')) reserve += (l.credit || 0) - (l.debit || 0);
        }
      }
      if (capital > 0) setCapitalSocial(capital);
      setReserveLegaleActuelle(reserve);
    }).catch(() => {});
  }, [adapter]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [executing, setExecuting] = useState(false);
  const [affectationDone, setAffectationDone] = useState(false);

  // Carry forward
  const [cfExecuting, setCfExecuting] = useState(false);
  const [cfDone, setCfDone] = useState(false);

  // Sub-section visibility
  const [showIA, setShowIA] = useState(false);
  const [showArchives, setShowArchives] = useState(false);

  // Load closure preview
  const loadPreview = useCallback(async () => {
    if (!exerciceId) return;
    setLoading(true);
    try {
      const preview = await previewClosure(adapter, exerciceId);
      setResultatNet(preview.resultatNet);
      setIsBenefice(preview.isBenefice);
      setTotalProduits(preview.totalProduits);
      setTotalCharges(preview.totalCharges);

      // Auto-propose
      const proposition = proposerAffectation(preview.resultatNet, capitalSocial, reserveLegaleActuelle);
      setVentilation(proposition.ventilation);
    } catch (err) {
      toast.error(t('closureAllocation.loadResultError'));
    } finally {
      setLoading(false);
    }
  }, [adapter, exerciceId, capitalSocial, reserveLegaleActuelle, t]);

  useEffect(() => { loadPreview(); }, [loadPreview]);

  const handleAutoPropose = () => {
    const proposition = proposerAffectation(resultatNet, capitalSocial, reserveLegaleActuelle);
    setVentilation(proposition.ventilation);
    setValidationErrors([]);
    toast.success(t('closureAllocation.autoProposalApplied'));
  };

  const handleValidate = () => {
    const errors = validerVentilation(resultatNet, ventilation, { capitalSocial, reserveLegaleActuelle });
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleGenerate = async () => {
    if (!handleValidate()) return;
    setExecuting(true);
    try {
      const result = await genererEcrituresAffectation(adapter, {
        exerciceId,
        resultatNet,
        capitalSocial,
        reserveLegaleActuelle,
        ventilation,
      });
      if (result.success) {
        toast.success(t('closureAllocation.entriesGenerated'));
        setAffectationDone(true);
      } else {
        toast.error(result.error || t('closureAllocation.genericError'));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('closureAllocation.genericError'));
    } finally {
      setExecuting(false);
    }
  };

  const handleCarryForward = async () => {
    if (!openingExerciceId) {
      toast.error(t('closureAllocation.nextYearNotSelected'));
      return;
    }
    setCfExecuting(true);
    try {
      const openingFY = await adapter.getById<DBFiscalYear>('fiscalYears', openingExerciceId);
      if (!openingFY) throw new Error(t('closureAllocation.nextYearNotFound'));

      const result = await executerCarryForward(adapter, {
        closingExerciceId: exerciceId,
        openingExerciceId,
        openingDate: openingFY.startDate,
      });

      if (result.success) {
        toast.success(t('closureAllocation.accountsCarried', { count: String(result.lineCount) }));
        setCfDone(true);
      } else {
        toast.error(result.errors.join(', '));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('closureAllocation.genericError'));
    } finally {
      setCfExecuting(false);
    }
  };

  const totalAffecte = ventilation.reserveLegale +
    ventilation.reservesStatutaires +
    ventilation.reservesFacultatives +
    ventilation.dividendes +
    ventilation.reportANouveau;
  const ecart = Math.abs(resultatNet - totalAffecte);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">{t('closureAllocation.loadingResult')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Result summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          {t('closureAllocation.resultTitle')}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">{t('closureAllocation.revenues')}</p>
            <p className="text-lg font-semibold">{formatCurrency(totalProduits)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('closureAllocation.expenses')}</p>
            <p className="text-lg font-semibold">{formatCurrency(totalCharges)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('closureAllocation.netResult')}</p>
            <p className={`text-lg font-semibold ${isBenefice ? 'text-green-700' : 'text-red-700'}`}>
              {formatCurrency(resultatNet)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('closureAllocation.nature')}</p>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm font-medium ${
              isBenefice ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {isBenefice ? t('closureAllocation.profit') : t('closureAllocation.loss')}
            </span>
          </div>
        </div>
      </div>

      {/* Capital info */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h4 className="font-medium text-gray-700 mb-3">{t('closureAllocation.paramsTitle')}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">{t('closureAllocation.shareCapital')}</label>
            <input
              type="number"
              value={capitalSocial}
              onChange={e => setCapitalSocial(Number(e.target.value))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">{t('closureAllocation.currentLegalReserve')}</label>
            <input
              type="number"
              value={reserveLegaleActuelle}
              onChange={e => setReserveLegaleActuelle(Number(e.target.value))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Ventilation form */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-700">{t('closureAllocation.breakdownTitle')}</h4>
          <button onClick={handleAutoPropose} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">
            <Zap className="w-4 h-4" />
            {t('closureAllocation.autoProposal')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { key: 'reserveLegale' as const, label: t('closureAllocation.legalReserve') },
            { key: 'reservesStatutaires' as const, label: t('closureAllocation.statutoryReserves') },
            { key: 'reservesFacultatives' as const, label: t('closureAllocation.optionalReserves') },
            { key: 'dividendes' as const, label: t('closureAllocation.dividends') },
            { key: 'reportANouveau' as const, label: t('closureAllocation.retainedEarnings') },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-sm text-gray-600 mb-1">{label}</label>
              <input
                type="number"
                value={ventilation[key]}
                onChange={e => setVentilation(v => ({ ...v, [key]: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-4 text-sm">
          <span className="text-gray-600">{t('closureAllocation.totalAllocated')} <strong>{formatCurrency(totalAffecte)}</strong></span>
          <span className="text-gray-600">{t('closureAllocation.resultLabel')} <strong>{formatCurrency(resultatNet)}</strong></span>
          {ecart > 0.01 && (
            <span className="text-red-600 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              {t('closureAllocation.gap', { amount: formatCurrency(ecart) })}
            </span>
          )}
          {ecart <= 0.01 && (
            <span className="text-green-600 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              {t('closureAllocation.balanced')}
            </span>
          )}
        </div>

        {validationErrors.length > 0 && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded p-3">
            {validationErrors.map((err, i) => (
              <p key={i} className="text-sm text-red-700">{err}</p>
            ))}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={executing || affectationDone}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {affectationDone ? t('closureAllocation.allocationSaved') : t('closureAllocation.generateEntries')}
          </button>
        </div>
      </div>

      {/* Carry forward */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          {t('closureAllocation.carryForwardTitle')}
        </h4>
        {!openingExerciceId ? (
          <p className="text-sm text-gray-500">{t('closureAllocation.selectNextYear')}</p>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={handleCarryForward}
              disabled={cfExecuting || cfDone}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {cfExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {cfDone ? t('closureAllocation.carryDone') : t('closureAllocation.runCarry')}
            </button>
            {cfDone && <CheckCircle className="w-5 h-5 text-green-600" />}
          </div>
        )}
      </div>

      {/* Sub-sections: IA Assistant + Documents Archives */}
      <div className="space-y-3">
        <button
          onClick={() => setShowIA(!showIA)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
        >
          <span className="font-medium text-gray-700">{t('closureAllocation.aiAssistant')}</span>
          <ArrowRight className={`w-4 h-4 text-gray-400 transition-transform ${showIA ? 'rotate-90' : ''}`} />
        </button>
        {showIA && (
          <div className="border border-gray-200 rounded-lg p-4">
            <IAAssistant />
          </div>
        )}

        <button
          onClick={() => setShowArchives(!showArchives)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
        >
          <span className="font-medium text-gray-700">{t('closureAllocation.documentsArchives')}</span>
          <ArrowRight className={`w-4 h-4 text-gray-400 transition-transform ${showArchives ? 'rotate-90' : ''}`} />
        </button>
        {showArchives && (
          <div className="border border-gray-200 rounded-lg p-4">
            <DocumentsArchives />
          </div>
        )}
      </div>
    </div>
  );
}

export default AffectationTab;
