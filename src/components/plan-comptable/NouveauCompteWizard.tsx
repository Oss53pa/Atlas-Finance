/**
 * NouveauCompteWizard — Formulaire intelligent 4 etapes pour creer un compte SYSCOHADA
 * Classe -> Categorie -> Sous-compte -> Code suggere + Libelle -> Enregistrer
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Landmark, Building2, Package, Users, Wallet,
  TrendingDown, TrendingUp, FileStack, BarChart3,
  Check, ChevronRight, Pencil, X, Lightbulb, Save, RotateCcw,
  Loader2, Tag, Link2,
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import type { DBAliasTiers } from '../../lib/db';
import type { DataAdapter } from '@atlas/data';
import { planComptableService } from '../../services/accounting/planComptableService';
import { aliasTiersService } from '../../services/accounting/aliasTiersService';
import { isAliasEligible, getPrefixForSousCompte, getAliasTypeLabel } from '../../data/alias-tiers-config';
import {
  CLASSES_SYSCOHADA,
  getCategoriesByClasse,
  getSousComptesByCategorie,
  getNatureSens,
  sensToNormalBalance,
  classeToAccountType,
  type ClasseSYSCOHADA,
  type CategorieSYSCOHADA,
  type SousCompteSYSCOHADA,
  type NatureSYSCOHADA,
  type SensNormal,
} from '../../data/syscohada-referentiel';

// ============================================================================
// ICON MAP
// ============================================================================

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Landmark, Building2, Package, Users, Wallet,
  TrendingDown, TrendingUp, FileStack, BarChart3,
};

// ============================================================================
// CLASS COLORS
// ============================================================================

const CLASS_COLORS: Record<number, { bg: string; border: string; text: string; ring: string }> = {
  1: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', ring: 'ring-blue-400' },
  2: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', ring: 'ring-green-400' },
  3: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700', ring: 'ring-purple-400' },
  4: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', ring: 'ring-amber-400' },
  5: { bg: 'bg-cyan-50', border: 'border-cyan-300', text: 'text-cyan-700', ring: 'ring-cyan-400' },
  6: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', ring: 'ring-red-400' },
  7: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', ring: 'ring-emerald-400' },
  8: { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-700', ring: 'ring-indigo-400' },
  9: { bg: 'bg-pink-50', border: 'border-pink-300', text: 'text-pink-700', ring: 'ring-pink-400' },
};

// ============================================================================
// TYPES
// ============================================================================

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
}

type StepStatus = 'active' | 'completed' | 'inactive';
type AliasMode = 'auto' | 'custom' | 'attach';

// ============================================================================
// NEXT CODE ALGORITHM
// ============================================================================

async function getNextCode(prefix3: string, adapter: DataAdapter): Promise<string> {
  const allAccounts = await adapter.getAll<{ code: string }>('accounts');
  const matching = allAccounts
    .filter(a => a.code.startsWith(prefix3))
    .map(a => a.code)
    .sort();

  if (matching.length === 0) {
    // No accounts with this prefix: start at prefix + 100000 (e.g. 411100000)
    return prefix3.padEnd(9, '0').slice(0, 3) + '100000';
  }

  // Find the highest code and increment at the 4th digit level (100000 steps)
  const maxCode = matching[matching.length - 1];
  // Pad to 9 digits
  const padded = maxCode.padEnd(9, '0');
  // Extract the 4th digit block (positions 3-8)
  const prefix3Digits = padded.slice(0, 3);
  const detailPart = parseInt(padded.slice(3), 10);

  // Increment by 100000
  const nextDetail = Math.floor(detailPart / 100000) * 100000 + 100000;

  if (nextDetail >= 1000000) {
    // Overflow at this level — try a finer granularity
    const finerIncrement = Math.floor(detailPart / 10000) * 10000 + 10000;
    if (finerIncrement < 1000000) {
      const candidate = prefix3Digits + finerIncrement.toString().padStart(6, '0');
      if (!matching.includes(candidate)) return candidate;
    }
    // Fallback: just increment by 1
    const last = parseInt(padded, 10) + 1;
    return last.toString().padStart(9, '0');
  }

  const candidate = prefix3Digits + nextDetail.toString().padStart(6, '0');

  // Check if candidate is taken
  if (matching.includes(candidate)) {
    // Find the next available
    for (let d = nextDetail + 100000; d < 1000000; d += 100000) {
      const c = prefix3Digits + d.toString().padStart(6, '0');
      if (!matching.includes(c)) return c;
    }
    // All 100000 slots taken, try finer
    const last = parseInt(padded, 10) + 1;
    return last.toString().padStart(9, '0');
  }

  return candidate;
}

async function countAccountsByPrefix(prefix: string, adapter: DataAdapter): Promise<number> {
  const all = await adapter.getAll<{ code: string }>('accounts');
  return all.filter(a => a.code.startsWith(prefix)).length;
}

// ============================================================================
// STEP HEADER
// ============================================================================

function StepHeader({
  stepNumber,
  title,
  status,
  summary,
  onEdit,
}: {
  stepNumber: number;
  title: string;
  status: StepStatus;
  summary?: string;
  onEdit?: () => void;
}) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 transition-all ${
      status === 'active'
        ? 'bg-blue-50 border-b-2 border-blue-500'
        : status === 'completed'
        ? 'bg-green-50/70 border-b border-green-200'
        : 'bg-neutral-50 border-b border-neutral-100 opacity-35'
    }`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
        status === 'completed'
          ? 'bg-green-500 text-white'
          : status === 'active'
          ? 'bg-blue-600 text-white'
          : 'bg-neutral-300 text-neutral-500'
      }`}>
        {status === 'completed' ? <Check className="w-3 h-3" /> : stepNumber}
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <p className={`text-xs font-semibold ${
          status === 'active' ? 'text-blue-800' : status === 'completed' ? 'text-green-800' : 'text-neutral-500'
        }`}>
          {title}
        </p>
        {status === 'completed' && summary && (
          <p className="text-xs text-green-700 truncate font-normal">— {summary}</p>
        )}
      </div>
      {status === 'completed' && onEdit && (
        <button
          onClick={onEdit}
          className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5 shrink-0"
        >
          <Pencil className="w-2.5 h-2.5" />
          Modifier
        </button>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function NouveauCompteWizard({ onClose, onSuccess }: Props) {
  const { adapter } = useData();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedClasse, setSelectedClasse] = useState<ClasseSYSCOHADA | null>(null);
  const [selectedCategorie, setSelectedCategorie] = useState<CategorieSYSCOHADA | null>(null);
  const [selectedSousCompte, setSelectedSousCompte] = useState<SousCompteSYSCOHADA | null>(null);

  const [suggestedCode, setSuggestedCode] = useState('');
  const [libelle, setLibelle] = useState('');
  const [nature, setNature] = useState<NatureSYSCOHADA>('ACTIF');
  const [sensNormal, setSensNormal] = useState<SensNormal>('DEBITEUR');
  const [isNatureSensVariable, setIsNatureSensVariable] = useState(false);

  const [isLoadingCode, setIsLoadingCode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [libelleError, setLibelleError] = useState('');

  // Alias tiers state
  const [aliasMode, setAliasMode] = useState<AliasMode>('auto');
  const [autoAlias, setAutoAlias] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [existingAliases, setExistingAliases] = useState<DBAliasTiers[]>([]);
  const [selectedAliasId, setSelectedAliasId] = useState('');

  // Compte counts for display
  const [categorieCounts, setCategorieCounts] = useState<Record<string, number>>({});
  const [sousCompteCounts, setSousCompteCounts] = useState<Record<string, number>>({});

  // Load category counts when class is selected
  useEffect(() => {
    if (!selectedClasse) return;
    const cats = getCategoriesByClasse(selectedClasse.code);
    const loadCounts = async () => {
      const counts: Record<string, number> = {};
      for (const cat of cats) {
        counts[cat.code] = await countAccountsByPrefix(cat.code, adapter);
      }
      setCategorieCounts(counts);
    };
    loadCounts();
  }, [selectedClasse, adapter]);

  // Load sous-compte counts when category is selected
  useEffect(() => {
    if (!selectedCategorie) return;
    const scs = getSousComptesByCategorie(selectedCategorie.code);
    const loadCounts = async () => {
      const counts: Record<string, number> = {};
      for (const sc of scs) {
        counts[sc.code] = await countAccountsByPrefix(sc.code, adapter);
      }
      setSousCompteCounts(counts);
    };
    loadCounts();
  }, [selectedCategorie, adapter]);

  // Compute suggested code when sous-compte is selected
  useEffect(() => {
    if (!selectedSousCompte || !selectedClasse) return;
    setIsLoadingCode(true);
    getNextCode(selectedSousCompte.code, adapter).then(code => {
      setSuggestedCode(code);
      setIsLoadingCode(false);
    });

    // Auto-detect nature/sens
    const ns = getNatureSens(selectedClasse.code, selectedCategorie?.code);
    setNature(ns.nature);
    setSensNormal(ns.sensNormal);
    setIsNatureSensVariable(ns.isVariable);
  }, [selectedSousCompte, selectedClasse, selectedCategorie, adapter]);

  // Load alias data when sous-compte changes
  useEffect(() => {
    if (!selectedSousCompte) return;
    const prefix = getPrefixForSousCompte(selectedSousCompte.code);
    if (!prefix) return;

    setAliasMode('auto');
    setCustomAlias('');
    setSelectedAliasId('');

    const loadAliasData = async () => {
      const [nextAlias, aliases] = await Promise.all([
        aliasTiersService.getNextAlias(prefix),
        aliasTiersService.getAliasesByPrefix(prefix),
      ]);
      setAutoAlias(nextAlias);
      setExistingAliases(aliases);
    };
    loadAliasData();
  }, [selectedSousCompte]);

  // Step statuses
  const getStepStatus = useCallback((step: number): StepStatus => {
    if (step === currentStep) return 'active';
    if (step < currentStep) return 'completed';
    return 'inactive';
  }, [currentStep]);

  // Handlers
  const handleSelectClasse = (classe: ClasseSYSCOHADA) => {
    setSelectedClasse(classe);
    setSelectedCategorie(null);
    setSelectedSousCompte(null);
    setSuggestedCode('');
    setLibelle('');
    setCurrentStep(2);
  };

  const handleSelectCategorie = (cat: CategorieSYSCOHADA) => {
    setSelectedCategorie(cat);
    setSelectedSousCompte(null);
    setSuggestedCode('');
    setLibelle('');
    setCurrentStep(3);
  };

  const handleSelectSousCompte = (sc: SousCompteSYSCOHADA) => {
    setSelectedSousCompte(sc);
    setLibelle('');
    setCurrentStep(4);
  };

  const handleGoToStep = (step: number) => {
    if (step < currentStep) {
      setCurrentStep(step);
      // Reset downstream selections
      if (step <= 1) { setSelectedClasse(null); setSelectedCategorie(null); setSelectedSousCompte(null); setSuggestedCode(''); }
      if (step <= 2) { setSelectedCategorie(null); setSelectedSousCompte(null); setSuggestedCode(''); }
      if (step <= 3) { setSelectedSousCompte(null); setSuggestedCode(''); }
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setSelectedClasse(null);
    setSelectedCategorie(null);
    setSelectedSousCompte(null);
    setSuggestedCode('');
    setLibelle('');
    setLibelleError('');
    setIsNatureSensVariable(false);
    setAliasMode('auto');
    setAutoAlias('');
    setCustomAlias('');
    setExistingAliases([]);
    setSelectedAliasId('');
  };

  const handleSave = async () => {
    if (!libelle.trim()) {
      setLibelleError('Le libelle est obligatoire');
      return;
    }
    if (!suggestedCode || !selectedClasse || !selectedSousCompte) return;

    setIsSaving(true);
    setLibelleError('');

    try {
      // Check for duplicate
      const existingAccounts = await adapter.getAll<{ code: string }>('accounts', { where: { code: suggestedCode } });
      const existing = existingAccounts[0] ?? null;
      if (existing) {
        toast.error(`Le code ${suggestedCode} existe deja. Recalcul en cours...`);
        const newCode = await getNextCode(selectedSousCompte.code, adapter);
        setSuggestedCode(newCode);
        setIsSaving(false);
        return;
      }

      await planComptableService.createAccount({
        code: suggestedCode,
        name: libelle.trim(),
        accountClass: selectedClasse.code.toString(),
        accountType: classeToAccountType(selectedClasse.code),
        level: 4,
        normalBalance: sensToNormalBalance(sensNormal),
        isReconcilable: selectedClasse.code === 4 || selectedClasse.code === 5,
        isActive: true,
      });

      // Handle alias creation/attachment
      const prefix = getPrefixForSousCompte(selectedSousCompte.code);
      let aliasLabel = '';
      if (prefix && isAliasEligible(selectedSousCompte.code)) {
        if (aliasMode === 'auto') {
          await aliasTiersService.createAlias({
            alias: autoAlias,
            prefix,
            label: libelle.trim(),
            comptesComptables: [suggestedCode],
          });
          aliasLabel = autoAlias;
        } else if (aliasMode === 'custom' && customAlias.trim()) {
          await aliasTiersService.createAlias({
            alias: customAlias.trim(),
            prefix,
            label: libelle.trim(),
            comptesComptables: [suggestedCode],
          });
          aliasLabel = customAlias.trim();
        } else if (aliasMode === 'attach' && selectedAliasId) {
          await aliasTiersService.attachAccountToAlias(selectedAliasId, suggestedCode);
          const attached = existingAliases.find(a => a.id === selectedAliasId);
          aliasLabel = attached?.alias || '';
        }
      }

      toast.success(
        <div>
          <p className="font-semibold">Compte cree avec succes !</p>
          <p className="text-sm text-neutral-600">
            {suggestedCode} — {libelle.trim()}
            {aliasLabel && <span className="ml-1 text-purple-600">[{aliasLabel}]</span>}
          </p>
        </div>
      );

      onSuccess?.();
      handleReset();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la creation du compte');
    } finally {
      setIsSaving(false);
    }
  };

  // Data for current step
  const categories = selectedClasse ? getCategoriesByClasse(selectedClasse.code) : [];
  const sousComptes = selectedCategorie ? getSousComptesByCategorie(selectedCategorie.code) : [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header — compact */}
        <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 shrink-0">
          <h2 className="text-sm font-bold text-neutral-800">Nouveau Compte SYSCOHADA</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-white/60 rounded-lg transition-colors">
            <X className="w-4 h-4 text-neutral-500" />
          </button>
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3 space-y-2">

            {/* STEP 1 — Classe */}
            <div className="rounded-lg border border-neutral-200 overflow-hidden">
              <StepHeader
                stepNumber={1}
                title="Classe"
                status={getStepStatus(1)}
                summary={selectedClasse ? `${selectedClasse.code} — ${selectedClasse.libelle}` : undefined}
                onEdit={getStepStatus(1) === 'completed' ? () => handleGoToStep(1) : undefined}
              />
              <AnimatePresence>
                {currentStep === 1 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="p-2.5 grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                      {CLASSES_SYSCOHADA.map(classe => {
                        const Icon = ICON_MAP[classe.icon] || BarChart3;
                        const colors = CLASS_COLORS[classe.code];
                        return (
                          <button
                            key={classe.code}
                            onClick={() => handleSelectClasse(classe)}
                            className={`flex flex-col items-center gap-1 py-2 px-1.5 rounded-lg border transition-all hover:shadow-sm active:scale-[0.97] ${
                              colors.bg} ${colors.border} ${colors.text}`}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="text-base font-bold leading-none">{classe.code}</span>
                            <span className="text-[10px] font-medium text-center leading-tight line-clamp-2">{classe.libelle}</span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* STEP 2 — Categorie */}
            <div className="rounded-lg border border-neutral-200 overflow-hidden">
              <StepHeader
                stepNumber={2}
                title="Categorie"
                status={getStepStatus(2)}
                summary={selectedCategorie ? `${selectedCategorie.code} — ${selectedCategorie.libelle}` : undefined}
                onEdit={getStepStatus(2) === 'completed' ? () => handleGoToStep(2) : undefined}
              />
              <AnimatePresence>
                {currentStep === 2 && selectedClasse && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="p-2.5 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {categories.map(cat => {
                        const count = categorieCounts[cat.code] ?? 0;
                        const colors = CLASS_COLORS[selectedClasse.code];
                        return (
                          <button
                            key={cat.code}
                            onClick={() => handleSelectCategorie(cat)}
                            className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all hover:shadow-sm active:scale-[0.98] ${
                              colors.bg} ${colors.border} text-left`}
                          >
                            <span className={`text-sm font-bold font-mono ${colors.text} shrink-0`}>{cat.code}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-neutral-800 truncate">{cat.libelle}</p>
                              {count > 0 && <p className="text-[10px] text-neutral-400">{count}</p>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* STEP 3 — Sous-compte */}
            <div className="rounded-lg border border-neutral-200 overflow-hidden">
              <StepHeader
                stepNumber={3}
                title="Sous-compte"
                status={getStepStatus(3)}
                summary={selectedSousCompte ? `${selectedSousCompte.code} — ${selectedSousCompte.libelle}` : undefined}
                onEdit={getStepStatus(3) === 'completed' ? () => handleGoToStep(3) : undefined}
              />
              <AnimatePresence>
                {currentStep === 3 && selectedCategorie && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="p-2.5 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {sousComptes.map(sc => {
                        const count = sousCompteCounts[sc.code] ?? 0;
                        const colors = CLASS_COLORS[selectedClasse!.code];
                        const aliasPrefix = getPrefixForSousCompte(sc.code);
                        return (
                          <button
                            key={sc.code}
                            onClick={() => handleSelectSousCompte(sc)}
                            className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all hover:shadow-sm active:scale-[0.98] ${
                              colors.bg} ${colors.border} text-left`}
                          >
                            <span className={`text-sm font-bold font-mono ${colors.text} shrink-0`}>{sc.code}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <p className="text-xs font-medium text-neutral-800 truncate">{sc.libelle}</p>
                                {aliasPrefix && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700 shrink-0">
                                    {aliasPrefix}
                                  </span>
                                )}
                              </div>
                              {count > 0 && <p className="text-[10px] text-neutral-400">{count}</p>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* STEP 4 — Code suggere + Libelle + Save */}
            <div className="rounded-lg border border-neutral-200 overflow-hidden">
              <StepHeader
                stepNumber={4}
                title="Enregistrement"
                status={getStepStatus(4)}
              />
              <AnimatePresence>
                {currentStep === 4 && selectedSousCompte && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 space-y-3">
                      {/* Suggested code — compact inline bar */}
                      <div className="bg-green-50 border border-green-300 rounded-lg px-3 py-2.5 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-green-600 shrink-0" />
                          {isLoadingCode ? (
                            <Loader2 className="w-5 h-5 text-green-500 animate-spin" />
                          ) : (
                            <span className="text-xl font-bold font-mono text-green-800 tracking-wider">
                              {suggestedCode}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            !isNatureSensVariable ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {nature}
                            <span className={`text-[9px] px-0.5 rounded ${
                              !isNatureSensVariable ? 'bg-blue-200' : 'bg-amber-200'
                            }`}>{!isNatureSensVariable ? 'AUTO' : '!'}</span>
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            !isNatureSensVariable ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {sensNormal}
                            <span className={`text-[9px] px-0.5 rounded ${
                              !isNatureSensVariable ? 'bg-blue-200' : 'bg-amber-200'
                            }`}>{!isNatureSensVariable ? 'AUTO' : '!'}</span>
                          </span>
                        </div>
                      </div>

                      {/* Alias Tiers Section — only for eligible sous-comptes */}
                      {selectedSousCompte && isAliasEligible(selectedSousCompte.code) && (() => {
                        const prefix = getPrefixForSousCompte(selectedSousCompte.code)!;
                        const typeLabel = getAliasTypeLabel(selectedSousCompte.code);
                        return (
                          <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2.5 space-y-2">
                            <div className="flex items-center gap-2">
                              <Tag className="w-3.5 h-3.5 text-purple-600" />
                              <span className="text-xs font-semibold text-purple-800">
                                Alias Tiers — {typeLabel}
                              </span>
                              <span className="text-[10px] text-purple-500 font-mono">({prefix})</span>
                            </div>

                            {/* Radio modes */}
                            <div className="flex gap-3">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="radio"
                                  name="aliasMode"
                                  checked={aliasMode === 'auto'}
                                  onChange={() => setAliasMode('auto')}
                                  className="w-3 h-3 text-purple-600"
                                />
                                <span className="text-xs text-purple-700 font-medium">Auto</span>
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="radio"
                                  name="aliasMode"
                                  checked={aliasMode === 'custom'}
                                  onChange={() => setAliasMode('custom')}
                                  className="w-3 h-3 text-purple-600"
                                />
                                <span className="text-xs text-purple-700 font-medium">Personnalise</span>
                              </label>
                              {existingAliases.length > 0 && (
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="aliasMode"
                                    checked={aliasMode === 'attach'}
                                    onChange={() => setAliasMode('attach')}
                                    className="w-3 h-3 text-purple-600"
                                  />
                                  <Link2 className="w-3 h-3 text-purple-600" />
                                  <span className="text-xs text-purple-700 font-medium">Rattacher</span>
                                </label>
                              )}
                            </div>

                            {/* Mode content */}
                            {aliasMode === 'auto' && (
                              <div className="flex items-center gap-2 bg-white/60 rounded px-2 py-1.5">
                                <span className="text-xs text-purple-600">Prochain alias :</span>
                                <span className="text-sm font-bold font-mono text-purple-800">{autoAlias}</span>
                              </div>
                            )}
                            {aliasMode === 'custom' && (
                              <input
                                type="text"
                                placeholder={`Ex: ${prefix}-COSMOS`}
                                value={customAlias}
                                onChange={(e) => setCustomAlias(e.target.value)}
                                className="w-full px-2 py-1.5 border border-purple-300 rounded bg-white/60 focus:ring-2 focus:ring-purple-400 text-xs font-mono"
                              />
                            )}
                            {aliasMode === 'attach' && (
                              <select
                                value={selectedAliasId}
                                onChange={(e) => setSelectedAliasId(e.target.value)}
                                className="w-full px-2 py-1.5 border border-purple-300 rounded bg-white/60 focus:ring-2 focus:ring-purple-400 text-xs"
                              >
                                <option value="">-- Choisir un alias existant --</option>
                                {existingAliases.map(a => (
                                  <option key={a.id} value={a.id}>
                                    {a.alias} — {a.label}
                                  </option>
                                ))}
                              </select>
                            )}

                            {/* Preview */}
                            <div className="text-[11px] text-purple-500 flex items-center gap-1.5 pt-0.5">
                              <span className="font-mono">{suggestedCode}</span>
                              <span>&rarr;</span>
                              <span className="font-bold font-mono">
                                {aliasMode === 'auto' ? autoAlias : aliasMode === 'custom' ? (customAlias || '...') : (existingAliases.find(a => a.id === selectedAliasId)?.alias || '...')}
                              </span>
                              {libelle && <span className="truncate">— {libelle}</span>}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Nature/Sens selectors when variable */}
                      {isNatureSensVariable && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-neutral-600 mb-1">Nature *</label>
                            <select
                              className="w-full px-2 py-1.5 border border-amber-300 rounded-lg bg-amber-50 focus:ring-2 focus:ring-amber-400 text-xs"
                              value={nature}
                              onChange={(e) => setNature(e.target.value as NatureSYSCOHADA)}
                            >
                              <option value="ACTIF">ACTIF</option>
                              <option value="PASSIF">PASSIF</option>
                              <option value="CHARGE">CHARGE</option>
                              <option value="PRODUIT">PRODUIT</option>
                              <option value="SPECIAL">SPECIAL</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-neutral-600 mb-1">Sens Normal *</label>
                            <select
                              className="w-full px-2 py-1.5 border border-amber-300 rounded-lg bg-amber-50 focus:ring-2 focus:ring-amber-400 text-xs"
                              value={sensNormal}
                              onChange={(e) => setSensNormal(e.target.value as SensNormal)}
                            >
                              <option value="DEBITEUR">DEBITEUR</option>
                              <option value="CREDITEUR">CREDITEUR</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Libelle + Actions — tight layout */}
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-neutral-600 mb-1">Libelle *</label>
                          <input
                            type="text"
                            placeholder="Ex: Client SARL Bamako"
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 text-sm ${
                              libelleError
                                ? 'border-red-400 focus:ring-red-400 bg-red-50'
                                : 'border-neutral-300 focus:ring-blue-400'
                            }`}
                            value={libelle}
                            onChange={(e) => {
                              setLibelle(e.target.value);
                              if (libelleError) setLibelleError('');
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter' && libelle.trim()) handleSave(); }}
                            autoFocus
                          />
                          {libelleError && <p className="text-[11px] text-red-600 mt-0.5">{libelleError}</p>}
                        </div>
                        <button
                          onClick={handleSave}
                          disabled={isSaving || isLoadingCode || !libelle.trim()}
                          className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-semibold shrink-0"
                        >
                          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          Enregistrer
                        </button>
                      </div>

                      {/* Reset link */}
                      <button
                        onClick={handleReset}
                        className="text-xs text-neutral-400 hover:text-neutral-600 flex items-center gap-1 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Recommencer
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
