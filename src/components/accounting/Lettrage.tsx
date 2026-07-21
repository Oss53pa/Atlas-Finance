import React, { useState, useMemo, useEffect, useCallback } from 'react';
import PageHeaderActions from '../ui/PageHeaderActions';
import type { DBJournalEntry } from '../../lib/db';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useData } from '../../contexts/DataContext';
import { useAccountNames } from '../../hooks/useAccountNames';
import { autoLettrage, applyLettrage, applyManualLettrage, delettrage } from '../../services/lettrageService';
import type { LettrageResult } from '../../services/lettrageService';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/utils/formatters';
import { useMoneyFormat } from '@/hooks/useMoneyFormat';
import { money } from '../../utils/money';
import PeriodSelectorModal from '../shared/PeriodSelectorModal';
import { buildPieceNumbers, pieceNumberOf } from '../../utils/pieceNumber';
import {
  Search, Filter, Save, RefreshCw, CheckCircle, XCircle,
  Link2, Unlink, Calendar, Download, Eye, AlertTriangle,
  Users, FileText, TrendingUp, ArrowUpDown, Hash, Calculator,
  Clock, Check, X, Info,
  History, Settings, Database, Zap, FileSpreadsheet, BarChart3,
  DollarSign, Activity, Lock, Unlock, AlertCircle, ChevronUp
} from 'lucide-react';

interface LettrageEntry {
  id: string;
  compte: string;
  compteLib?: string;
  libelle: string;
  date: string;
  piece: string;
  journal: string;
  debit: number;
  credit: number;
  solde: number;
  lettrage?: string;
  lettragePartiel?: boolean;
  selected?: boolean;
  tiers?: string;
  tiersCode?: string;
  echeance?: string;
  reference?: string;
  devise?: string;
  status?: 'pending' | 'partial' | 'complete';
}

interface LettrageStats {
  totalComptes: number;
  totalEcritures: number;
  ecrituresLettrees: number;
  ecrituresNonLettrees: number;
  tauxLettrage: number;
  montantNonLettre: number;
  plusAncienneNonLettree?: Date;
  dernierLettrage?: Date;
}

interface LettrageHistory {
  id: string;
  date: Date;
  user: string;
  action: 'create' | 'delete' | 'modify';
  code: string;
  ecritures: string[];
  montant: number;
}

const Lettrage: React.FC = () => {
  const { t } = useLanguage();
  const fmt = useMoneyFormat();
  const { adapter } = useData();
  const { format: fmtAccount } = useAccountNames();
  const queryClient = useQueryClient();
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const currentYear = new Date().getFullYear();
  const defaultStart = `${currentYear}-01-01`;
  const defaultEnd = `${currentYear}-12-31`;
  const [dateRange, setDateRange] = useState({ start: defaultStart, end: defaultEnd });
  const [selectedCompte, setSelectedCompte] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyNonLettrage, setShowOnlyNonLettrage] = useState(true);
  const [compteFilter, setCompteFilter] = useState<string>('all');
  const [detailCompte, setDetailCompte] = useState<string | null>(null);
  const [modalOnlyNonLettre, setModalOnlyNonLettre] = useState(true);
  const [modalSearch, setModalSearch] = useState('');
  const [modalSortByAmount, setModalSortByAmount] = useState(true);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'manual' | 'automatic' | 'analysis' | 'history' | 'config'>('manual');
  const [lettrageMode, setLettrageMode] = useState<'complete' | 'partial'>('complete');
  const [showStats, setShowStats] = useState(true);
  const [tolerance, setTolerance] = useState(0.01);
  const [autoLettrageConfig, setAutoLettrageConfig] = useState({
    parMontant: true,
    parReference: true,
    parDate: false,
    parTiers: true,
    tolerance: 0.01,
    periodeMax: 90
  });
  const [autoAccounts, setAutoAccounts] = useState<string[]>(['411', '401']);
  const [autoPartiel, setAutoPartiel] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoPreview, setAutoPreview] = useState<LettrageResult | null>(null);
  const [lettrageHistory, setLettrageHistory] = useState<LettrageHistory[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [stats, setStats] = useState<LettrageStats>({
    totalComptes: 0,
    totalEcritures: 0,
    ecrituresLettrees: 0,
    ecrituresNonLettrees: 0,
    tauxLettrage: 0,
    montantNonLettre: 0
  });

  // Charger les écritures depuis Dexie (comptes lettrables : 40x, 41x)
  const { data: lettrageEntries = [], refetch: refetchEntries } = useQuery({
    queryKey: ['lettrage-entries', dateRange.start, dateRange.end],
    queryFn: async () => {
      const entries = await adapter.getAll<DBJournalEntry>('journalEntries');
      const pieceNumbers = buildPieceNumbers(entries as any);
      const result: LettrageEntry[] = [];
      const soldesByCompte: Record<string, number> = {};

      for (const entry of entries) {
        if (entry.date < dateRange.start || entry.date > dateRange.end) continue;
        for (const line of entry.lines) {
          // Only reconcilable accounts (clients 411x, suppliers 401x, etc.)
          if (!line.accountCode.startsWith('41') && !line.accountCode.startsWith('40')) continue;

          if (!soldesByCompte[line.accountCode]) soldesByCompte[line.accountCode] = 0;
          soldesByCompte[line.accountCode] = money(soldesByCompte[line.accountCode]).add(money(line.debit).subtract(money(line.credit))).toNumber();

          result.push({
            id: `${entry.id}-${line.id}`,
            compte: line.accountCode,
            compteLib: (line as any).accountName || '',
            libelle: line.label || entry.label,
            date: entry.date,
            piece: pieceNumberOf(entry as any, pieceNumbers),
            journal: entry.journal,
            debit: line.debit,
            credit: line.credit,
            solde: soldesByCompte[line.accountCode],
            lettrage: line.lettrageCode,
            tiers: line.thirdPartyName,
            tiersCode: line.thirdPartyCode,
            echeance: line.dateEcheance,
          });
        }
      }
      return result.sort((a, b) => a.compte.localeCompare(b.compte) || a.date.localeCompare(b.date));
    },
  });

  // Clé d'identité du TIERS (et non du compte collectif) : code tiers > nom tiers > compte (sans tiers)
  const tiersKeyOf = (e: LettrageEntry) =>
    (e.tiersCode && e.tiersCode.trim()) || (e.tiers && e.tiers.trim().toUpperCase()) || `cpt:${e.compte}`;
  const tiersLabelOf = (e: LettrageEntry) =>
    (e.tiers && e.tiers.trim()) || (e.tiersCode && e.tiersCode.trim()) || `${e.compte} — ${t('lettrage.noDetailedThirdParty')}`;

  // Grouper les écritures par TIERS
  const groupedEntries = useMemo(() => {
    const filtered = lettrageEntries.filter(entry => {
      if (showOnlyNonLettrage && entry.lettrage) return false;
      if (compteFilter !== 'all' && !entry.compte.startsWith(compteFilter)) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        if (!entry.libelle.toLowerCase().includes(q) &&
            !entry.piece.toLowerCase().includes(q) &&
            !(entry.tiers || '').toLowerCase().includes(q) &&
            !(entry.tiersCode || '').toLowerCase().includes(q) &&
            !entry.compte.includes(searchTerm)) return false;
      }
      return true;
    });

    type GroupedTiers = {
      key: string;
      tiers: string;
      tiersCode: string;
      compte: string;
      compteLib: string;
      comptes: Set<string>;
      entries: LettrageEntry[];
      totalDebit: number;
      totalCredit: number;
      solde: number;
      nonLettres: number;
    };
    const grouped = filtered.reduce((acc, entry) => {
      const key = tiersKeyOf(entry);
      if (!acc[key]) {
        acc[key] = {
          key,
          tiers: tiersLabelOf(entry),
          tiersCode: entry.tiersCode || '',
          compte: entry.compte,
          compteLib: entry.compteLib || '',
          comptes: new Set<string>(),
          entries: [],
          totalDebit: 0,
          totalCredit: 0,
          solde: 0,
          nonLettres: 0,
        };
      }
      const g = acc[key];
      if (!g.compteLib && entry.compteLib) g.compteLib = entry.compteLib;
      g.comptes.add(entry.compte);
      g.entries.push(entry);
      g.totalDebit = money(g.totalDebit).add(money(entry.debit)).toNumber();
      g.totalCredit = money(g.totalCredit).add(money(entry.credit)).toNumber();
      g.solde = money(g.totalDebit).subtract(money(g.totalCredit)).toNumber();
      if (!entry.lettrage) g.nonLettres++;
      return acc;
    }, {} as Record<string, GroupedTiers>);

    return Object.values(grouped).sort((a, b) => b.nonLettres - a.nonLettres || a.tiers.localeCompare(b.tiers));
  }, [lettrageEntries, showOnlyNonLettrage, searchTerm, compteFilter]);

  // Détail d'un TIERS ouvert dans la modale (toutes ses écritures, indép. du filtre liste)
  const detailEntries = useMemo(() => {
    if (!detailCompte) return [] as LettrageEntry[];
    const q = modalSearch.trim().toLowerCase();
    const qNum = q.replace(/[\s.,]/g, '');
    return lettrageEntries
      .filter(e => tiersKeyOf(e) === detailCompte && (!modalOnlyNonLettre || !e.lettrage))
      .filter(e => {
        if (!q) return true;
        const montant = String(Math.max(e.debit, e.credit));
        return e.libelle.toLowerCase().includes(q)
          || e.piece.toLowerCase().includes(q)
          || (e.tiers || '').toLowerCase().includes(q)
          || (qNum.length > 0 && montant.includes(qNum));
      })
      .sort((a, b) => {
        if (modalSortByAmount) {
          const ma = Math.max(a.debit, a.credit);
          const mb = Math.max(b.debit, b.credit);
          // Montants égaux regroupés ; débit avant crédit pour voir la paire
          if (ma !== mb) return mb - ma;
          return (b.debit > 0 ? 1 : 0) - (a.debit > 0 ? 1 : 0);
        }
        return a.date.localeCompare(b.date);
      });
  }, [detailCompte, lettrageEntries, modalOnlyNonLettre, modalSearch, modalSortByAmount]);

  // Compteur vivant de la sélection (Débit / Crédit / Écart)
  const selDetail = useMemo(() => {
    const sel = lettrageEntries.filter(e => tiersKeyOf(e) === detailCompte && selectedEntries.has(e.id));
    const debit = sel.reduce((s, e) => money(s).add(money(e.debit)).toNumber(), 0);
    const credit = sel.reduce((s, e) => money(s).add(money(e.credit)).toNumber(), 0);
    return { count: sel.length, debit, credit, ecart: money(debit).subtract(money(credit)).toNumber() };
  }, [lettrageEntries, detailCompte, selectedEntries]);

  // Suggestion : lignes candidates (montant opposé identique à une ligne cochée non lettrée)
  const suggestedIds = useMemo(() => {
    const ids = new Set<string>();
    const sel = detailEntries.filter(e => selectedEntries.has(e.id) && !e.lettrage);
    if (sel.length === 0) return ids;
    for (const cand of detailEntries) {
      if (cand.lettrage || selectedEntries.has(cand.id)) continue;
      const candMag = Math.max(cand.debit, cand.credit);
      const candIsDebit = cand.debit > 0;
      for (const s of sel) {
        const sMag = Math.max(s.debit, s.credit);
        const sIsDebit = s.debit > 0;
        if (candIsDebit !== sIsDebit && Math.abs(candMag - sMag) <= tolerance) { ids.add(cand.id); break; }
      }
    }
    return ids;
  }, [detailEntries, selectedEntries, tolerance]);

  const detailMeta = useMemo(() => {
    if (!detailCompte) return null;
    const all = lettrageEntries.filter(e => tiersKeyOf(e) === detailCompte);
    if (all.length === 0) return null;
    const totalDebit = all.reduce((s, e) => money(s).add(money(e.debit)).toNumber(), 0);
    const totalCredit = all.reduce((s, e) => money(s).add(money(e.credit)).toNumber(), 0);
    const comptes = Array.from(new Set(all.map(e => e.compte)));
    return {
      tiers: tiersLabelOf(all[0]),
      tiersCode: all.find(e => e.tiersCode)?.tiersCode || '',
      compte: comptes[0],
      comptes,
      compteLib: all.find(e => e.compteLib)?.compteLib || '',
      solde: money(totalDebit).subtract(money(totalCredit)).toNumber(),
      nonLettres: all.filter(e => !e.lettrage).length,
      lettrees: all.filter(e => e.lettrage).length,
      total: all.length,
    };
  }, [detailCompte, lettrageEntries]);

  const toggleEntrySelection = (entryId: string) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId);
    } else {
      newSelected.add(entryId);
    }
    setSelectedEntries(newSelected);
  };

  const handleLettrage = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      // Build selection from the flat entry list
      const selectedData = lettrageEntries.filter(e => selectedEntries.has(e.id));
      if (selectedData.length < 2) return;

      // Find original entry/line IDs from db
      const allEntries = await adapter.getAll<DBJournalEntry>('journalEntries');
      const selections: Array<{ entryId: string; lineId: string }> = [];

      for (const sel of selectedData) {
        for (const entry of allEntries) {
          for (const line of entry.lines) {
            if (line.accountCode === sel.compte && entry.date === sel.date
              && line.debit === sel.debit && line.credit === sel.credit
              && !line.lettrageCode) {
              selections.push({ entryId: entry.id, lineId: line.id });
            }
          }
        }
      }

      if (selections.length < 2) {
        toast.error(t('lettrage.matchingLinesNotFound'));
        return;
      }

      const code = await applyManualLettrage(adapter, selections);

      const newHistory: LettrageHistory = {
        id: Date.now().toString(),
        date: new Date(),
        user: t('lettrage.currentUser'),
        action: 'create',
        code,
        ecritures: Array.from(selectedEntries),
        montant: selectedData.reduce((s, e) => s + Math.max(e.debit, e.credit), 0),
      };
      setLettrageHistory(prev => [newHistory, ...prev]);
      toast.success(t('lettrage.matchingApplied', { code, count: String(selections.length) }));
      setSelectedEntries(new Set());
      queryClient.invalidateQueries({ queryKey: ['lettrage-entries'] });
      refetchEntries();
    } finally {
      setIsSaving(false);
    }
  }, [selectedEntries, lettrageEntries, queryClient, refetchEntries, isSaving, t]);

  const handleDelettrage = useCallback(async (code: string) => {
    const count = await delettrage(adapter, code);

    const newHistory: LettrageHistory = {
      id: Date.now().toString(),
      date: new Date(),
      user: t('lettrage.currentUser'),
      action: 'delete',
      code,
      ecritures: [],
      montant: 0,
    };
    setLettrageHistory(prev => [newHistory, ...prev]);
    toast.success(t('lettrage.unmatchingDone', { code, count: String(count) }));
    queryClient.invalidateQueries({ queryKey: ['lettrage-entries'] });
    refetchEntries();
  }, [queryClient, refetchEntries, t]);

  const buildAutoConfig = useCallback(() => ({
    parMontant: autoLettrageConfig.parMontant,
    parReference: autoLettrageConfig.parReference,
    parDate: autoLettrageConfig.parDate,
    parTiers: autoLettrageConfig.parTiers,
    tolerance: autoPartiel ? Math.max(autoLettrageConfig.tolerance, 0.01) : autoLettrageConfig.tolerance,
    periodeMax: autoLettrageConfig.periodeMax,
    accounts: autoAccounts.length ? autoAccounts : undefined,
  }), [autoLettrageConfig, autoAccounts, autoPartiel]);

  const previewAutoLettrage = useCallback(async () => {
    if (autoRunning) return;
    setAutoRunning(true);
    try {
      const result = await autoLettrage(adapter, buildAutoConfig());
      setAutoPreview(result);
      toast(t('lettrage.previewResult', { count: String(result.matches.length) }), { icon: '🔍' });
    } catch (e: any) {
      toast.error(e?.message || t('lettrage.previewError'));
    } finally {
      setAutoRunning(false);
    }
  }, [adapter, buildAutoConfig, autoRunning, t]);

  const runAutoLettrage = useCallback(async () => {
    if (autoRunning) return;
    setAutoRunning(true);
    try {
    const result = await autoLettrage(adapter, buildAutoConfig());
    setAutoPreview(result);

    if (result.matches.length === 0) {
      toast(t('lettrage.noMatchFound'),{ icon: '\u2139\uFE0F' });
      return;
    }

    const applied = await applyLettrage(adapter, result.matches);
    toast.success(t('lettrage.autoApplied', { count: String(result.matches.length), lines: String(applied) }));
    queryClient.invalidateQueries({ queryKey: ['lettrage-entries'] });
    refetchEntries();
    } catch (e: any) {
      toast.error(e?.message || t('lettrage.autoError'));
    } finally {
      setAutoRunning(false);
    }
  }, [adapter, buildAutoConfig, queryClient, refetchEntries, autoRunning, t]);

  const canLettrage = useMemo(() => {
    if (selectedEntries.size < 2) return { valid: false, reason: t('lettrage.selectAtLeastTwo') };
    const selectedEntriesData = lettrageEntries.filter(e => selectedEntries.has(e.id));
    const totalDebit = selectedEntriesData.reduce((sum, e) => money(sum).add(money(e.debit)).toNumber(), 0);
    const totalCredit = selectedEntriesData.reduce((sum, e) => money(sum).add(money(e.credit)).toNumber(), 0);
    const difference = money(totalDebit).subtract(money(totalCredit)).abs().toNumber();

    if (lettrageMode === 'complete') {
      if (difference > tolerance) {
        return { valid: false, reason: t('lettrage.varianceOf', { amount: fmt(difference) }) };
      }
      return { valid: true, reason: t('lettrage.balanced') };
    } else {
      // Lettrage partiel
      if (totalDebit === 0 && totalCredit === 0) {
        return { valid: false, reason: t('lettrage.noAmountToMatch') };
      }
      return { valid: true, reason: t('lettrage.partialMatchingPossible'), partial: true };
    }
  }, [selectedEntries, lettrageMode, tolerance, t]);

  // Calcul des statistiques
  useEffect(() => {
    const calculateStats = () => {
      const totalEcritures = lettrageEntries.length;
      const ecrituresLettrees = lettrageEntries.filter(e => e.lettrage).length;
      const ecrituresNonLettrees = totalEcritures - ecrituresLettrees;
      const montantNonLettre = lettrageEntries
        .filter(e => !e.lettrage)
        .reduce((sum, e) => sum + (e.debit || e.credit), 0);

      const comptes = new Set(lettrageEntries.map(e => e.compte));

      setStats({
        totalComptes: comptes.size,
        totalEcritures,
        ecrituresLettrees,
        ecrituresNonLettrees,
        tauxLettrage: totalEcritures > 0 ? (ecrituresLettrees / totalEcritures) * 100 : 0,
        montantNonLettre,
        plusAncienneNonLettree: lettrageEntries
          .filter(e => !e.lettrage)
          .map(e => new Date(e.date))
          .sort((a, b) => a.getTime() - b.getTime())[0],
        dernierLettrage: new Date()
      });
    };

    calculateStats();
  }, [lettrageEntries]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* En-tête */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link2 className="w-8 h-8 text-[var(--color-primary)]" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">{t('lettrage.title')}</h1>
              <p className="text-sm text-gray-600">{t('lettrage.subtitle')}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <PageHeaderActions />
            <button className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              <Calendar className="w-4 h-4 mr-2 inline" />
              {t('lettrage.period')}
            </button>
            <button className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]">
              <Download className="w-4 h-4 mr-2 inline" />
              {t('lettrage.export')}
            </button>
          </div>
        </div>

        {/* Onglets de mode */}
        <div className="flex space-x-1 mt-4 overflow-x-auto">
          <button
            onClick={() => setViewMode('manual')}
            className={`px-4 py-2 text-sm rounded-lg transition-all whitespace-nowrap ${
              viewMode === 'manual'
                ? 'bg-[var(--color-primary)] text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Link2 className="w-4 h-4 mr-2 inline" />
            {t('lettrage.tabManual')}
          </button>
          <button
            onClick={() => setViewMode('automatic')}
            className={`px-4 py-2 text-sm rounded-lg transition-all whitespace-nowrap ${
              viewMode === 'automatic'
                ? 'bg-[var(--color-primary)] text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Zap className="w-4 h-4 mr-2 inline" />
            {t('lettrage.tabAutomatic')}
          </button>
          <button
            onClick={() => setViewMode('analysis')}
            className={`px-4 py-2 text-sm rounded-lg transition-all whitespace-nowrap ${
              viewMode === 'analysis'
                ? 'bg-[var(--color-primary)] text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <BarChart3 className="w-4 h-4 mr-2 inline" />
            {t('lettrage.tabAnalysis')}
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={`px-4 py-2 text-sm rounded-lg transition-all whitespace-nowrap ${
              viewMode === 'history'
                ? 'bg-[var(--color-primary)] text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <History className="w-4 h-4 mr-2 inline" />
            {t('lettrage.tabHistory')}
          </button>
          <button
            onClick={() => setViewMode('config')}
            className={`px-4 py-2 text-sm rounded-lg transition-all whitespace-nowrap ${
              viewMode === 'config'
                ? 'bg-[var(--color-primary)] text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Settings className="w-4 h-4 mr-2 inline" />
            {t('lettrage.tabConfig')}
          </button>
        </div>
      </div>

      {/* Mode Lettrage Manuel */}
      {viewMode === 'manual' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Barre de recherche et filtres */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center flex-wrap gap-4">
              <div className="relative flex-1 min-w-[260px] max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-700" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('lettrage.searchPlaceholder')}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showOnlyNonLettrage}
                  onChange={(e) => setShowOnlyNonLettrage(e.target.checked)}
                  className="rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
                <span className="text-sm text-gray-600">{t('lettrage.accountsWithUnmatched')}</span>
              </label>

              <select
                value={compteFilter}
                onChange={(e) => setCompteFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">{t('lettrage.allAccounts')}</option>
                <option value="411">411 - {t('lettrage.acc411')}</option>
                <option value="401">401 - {t('lettrage.acc401')}</option>
                <option value="42">42 - {t('lettrage.acc42')}</option>
                <option value="44">44 - {t('lettrage.acc44')}</option>
                <option value="46">46 - {t('lettrage.acc46')}</option>
              </select>

              <span className="ml-auto text-xs text-gray-500 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                {t('lettrage.clickThirdPartyHint')}
              </span>
            </div>
          </div>

          {/* Indicateurs améliorés */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('lettrage.totalAccounts')}</p>
                  <p className="text-lg font-bold text-gray-900">{stats.totalComptes}</p>
                  <p className="text-xs text-gray-700 mt-1">{t('lettrage.entriesCount', { count: String(stats.totalEcritures) })}</p>
                </div>
                <Database className="w-8 h-8 text-gray-700" />
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('lettrage.unmatched')}</p>
                  <p className="text-lg font-bold text-orange-600">{stats.ecrituresNonLettrees}</p>
                  <p className="text-xs text-orange-500 mt-1">
                    {fmt(stats.montantNonLettre)}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('lettrage.matched')}</p>
                  <p className="text-lg font-bold text-green-600">{stats.ecrituresLettrees}</p>
                  <p className="text-xs text-green-500 mt-1">{t('lettrage.fully')}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('lettrage.matchingRate')}</p>
                  <p className="text-lg font-bold text-blue-600">
                    {stats.tauxLettrage.toFixed(1)}%
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full"
                      style={{ width: `${stats.tauxLettrage}%` }}
                    />
                  </div>
                </div>
                <Activity className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('lettrage.oldest')}</p>
                  <p className="text-lg font-bold text-red-600">
                    {stats.plusAncienneNonLettree
                      ? Math.floor((Date.now() - stats.plusAncienneNonLettree.getTime()) / (1000 * 60 * 60 * 24))
                      : 0} {t('lettrage.days')}
                  </p>
                  <p className="text-xs text-gray-700 mt-1">{t('lettrage.unmatchedSingular')}</p>
                </div>
                <Clock className="w-8 h-8 text-red-400" />
              </div>
            </div>
          </div>

          {/* Liste des comptes tiers — cliquer pour ouvrir le détail/lettrage */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">{t('lettrage.colThirdParty')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">{t('lettrage.colAccounts')}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">{t('lettrage.colBalance')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">{t('lettrage.matched')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">{t('lettrage.unmatched')}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">{t('lettrage.colAction')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {groupedEntries.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">{t('lettrage.noThirdPartyForCriteria')}</td></tr>
                )}
                {groupedEntries.map((group) => {
                  const lettrees = group.entries.filter((e: LettrageEntry) => e.lettrage).length;
                  const comptesArr = Array.from(group.comptes);
                  return (
                    <tr
                      key={group.key}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => { setSelectedEntries(new Set()); setModalOnlyNonLettre(true); setModalSearch(''); setDetailCompte(group.key); }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400 shrink-0" />
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">{group.tiers}</div>
                            {group.tiersCode && <div className="text-xs text-gray-400 font-mono">{group.tiersCode}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <span className="font-mono">{comptesArr.join(', ')}</span>
                        {group.compteLib && <span className="ml-2 text-xs text-gray-400">{group.compteLib}</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <span className={`font-bold ${group.solde > 0 ? 'text-red-600' : group.solde < 0 ? 'text-green-600' : 'text-gray-900'}`}>
                          {fmt(Math.abs(group.solde))}
                        </span>
                        <span className="ml-1 text-xs text-gray-500">
                          {group.solde > 0 ? '(D)' : group.solde < 0 ? '(C)' : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-500">{lettrees}</td>
                      <td className="px-4 py-3 text-center">
                        {group.nonLettres > 0 ? (
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                            {group.nonLettres}
                          </span>
                        ) : (
                          <span className="text-xs text-green-600">{t('lettrage.settled')}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-xs font-medium">
                          <Eye className="w-3.5 h-3.5" /> {t('lettrage.viewDetails')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mode Lettrage Automatique */}
      {viewMode === 'automatic' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('lettrage.tabAutomatic')}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('lettrage.matchingCriteria')}
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input type="checkbox" checked={autoLettrageConfig.parMontant}
                      onChange={(e) => setAutoLettrageConfig({ ...autoLettrageConfig, parMontant: e.target.checked })}
                      className="mr-2 rounded border-gray-300 text-[var(--color-primary)]" />
                    <span className="text-sm">{t('lettrage.byExactAmount')}</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" checked={autoLettrageConfig.parReference}
                      onChange={(e) => setAutoLettrageConfig({ ...autoLettrageConfig, parReference: e.target.checked })}
                      className="mr-2 rounded border-gray-300 text-[var(--color-primary)]" />
                    <span className="text-sm">{t('lettrage.byDocumentNumber')}</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" checked={autoLettrageConfig.parTiers}
                      onChange={(e) => setAutoLettrageConfig({ ...autoLettrageConfig, parTiers: e.target.checked })}
                      className="mr-2 rounded border-gray-300 text-[var(--color-primary)]" />
                    <span className="text-sm">{t('lettrage.byCustomerSupplierRef')}</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" checked={autoPartiel}
                      onChange={(e) => setAutoPartiel(e.target.checked)}
                      className="mr-2 rounded border-gray-300 text-[var(--color-primary)]" />
                    <span className="text-sm">{t('lettrage.partialMatchingAllowed')}</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('lettrage.matchingPeriod')}
                </label>
                <div className="flex space-x-4">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('lettrage.accountsToProcess')}
                </label>
                <select
                  multiple
                  value={autoAccounts}
                  onChange={(e) => setAutoAccounts(Array.from(e.target.selectedOptions, o => o.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-32"
                >
                  <option value="411">411 - {t('lettrage.acc411')}</option>
                  <option value="401">401 - {t('lettrage.acc401')}</option>
                  <option value="42">42 - {t('lettrage.acc42')}</option>
                  <option value="44">44 - {t('lettrage.acc44')}</option>
                  <option value="46">46 - {t('lettrage.acc46b')}</option>
                </select>
              </div>

              <div className="pt-4 flex space-x-3">
                <button
                  onClick={runAutoLettrage}
                  disabled={autoRunning || autoAccounts.length === 0}
                  className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 inline ${autoRunning ? 'animate-spin' : ''}`} />
                  {autoRunning ? t('lettrage.matchingInProgress') : t('lettrage.runAutoMatching')}
                </button>
                <button
                  onClick={previewAutoLettrage}
                  disabled={autoRunning || autoAccounts.length === 0}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Eye className="w-4 h-4 mr-2 inline" />
                  {t('lettrage.preview')}
                </button>
              </div>
            </div>
          </div>

          {/* Résultats du lettrage automatique */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('lettrage.matchingResults')}</h3>
            {!autoPreview ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
                {t('lettrage.previewHint')}
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-900">
                      {t('lettrage.matchingOnAccounts', { accounts: autoAccounts.join(', ') || '—' })}
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-blue-800">
                      <li>• {t('lettrage.proposedMatches', { count: String(autoPreview.matches.length) })}</li>
                      <li>• {t('lettrage.byExactAmountCount', { count: String(autoPreview.matches.filter(m => m.method === 'exact').length) })}</li>
                      <li>• {t('lettrage.byDocumentNumberCount', { count: String(autoPreview.matches.filter(m => m.method === 'reference').length) })}</li>
                      <li>• {t('lettrage.byAmountSumsCount', { count: String(autoPreview.matches.filter(m => m.method === 'somme').length) })}</li>
                      <li>• {t('lettrage.matchableLines', { matched: String(autoPreview.totalMatched), remaining: String(autoPreview.totalUnmatched) })}</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mode Analyse */}
      {viewMode === 'analysis' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Statistiques par compte */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('lettrage.analysisByThirdParty')}</h3>
              <div className="space-y-3">
                {groupedEntries.map((group) => {
                  const lettrees = group.entries.filter((e: LettrageEntry) => e.lettrage).length;
                  const total = group.entries.length;
                  const percentage = total > 0 ? (lettrees / total) * 100 : 0;

                  return (
                    <div key={group.key} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <span className="text-sm text-gray-700 truncate">
                            <span className="font-medium">{group.tiers}</span>
                            <span className="ml-2 font-mono text-xs text-gray-400">{fmtAccount(group.compte)}</span>
                          </span>
                          <span className="text-sm text-gray-600 whitespace-nowrap">
                            {lettrees}/{total} ({Math.round(percentage)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Écritures en attente */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('lettrage.oldUnmatchedEntries')}</h3>
              <div className="space-y-2">
                {lettrageEntries
                  .filter(e => !e.lettrage)
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .slice(0, 5)
                  .map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{entry.piece}</p>
                        <p className="text-xs text-gray-600">
                          {new Date(entry.date).toLocaleDateString('fr-FR')} - {entry.libelle.substring(0, 30)}...
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-orange-600">
                          {fmt(entry.debit || entry.credit)}
                        </p>
                        <p className="text-xs text-gray-700">
                          {Math.floor((Date.now() - new Date(entry.date).getTime()) / (1000 * 60 * 60 * 24))} {t('lettrage.days')}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Recommandations */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('lettrage.recommendations')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <AlertTriangle className="w-6 h-6 text-yellow-600 mb-2" />
                <p className="text-sm font-medium text-gray-900">{t('lettrage.oldEntries')}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {t('lettrage.oldEntriesHint', { count: String(lettrageEntries.filter(e => !e.lettrage && (Date.now() - new Date(e.date).getTime()) / 86400000 > 60).length) })}
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <Info className="w-6 h-6 text-blue-600 mb-2" />
                <p className="text-sm font-medium text-gray-900">{t('lettrage.partialMatchingPossible')}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {t('lettrage.partialMatchingHint')}
                </p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <CheckCircle className="w-6 h-6 text-green-600 mb-2" />
                <p className="text-sm font-medium text-gray-900">{t('lettrage.matchingRateTitle')}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {(() => {
                    const tot = lettrageEntries.length;
                    const let_ = lettrageEntries.filter(e => e.lettrage).length;
                    const taux = tot > 0 ? Math.round((let_ / tot) * 100) : 0;
                    return t('lettrage.globalMatchingRate', { rate: String(taux), matched: String(let_), total: String(tot) });
                  })()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vue Historique */}
      {viewMode === 'history' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">{t('lettrage.historyTitle')}</h3>
              <div className="flex items-center space-x-3">
                <select className="px-3 py-2 text-sm border border-gray-300 rounded-lg">
                  <option>{t('lettrage.allActions')}</option>
                  <option>{t('lettrage.matchingsCreated')}</option>
                  <option>{t('lettrage.matchingsDeleted')}</option>
                  <option>{t('lettrage.modifications')}</option>
                </select>
                <input
                  type="date"
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
                />
                <button className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">
                  <Filter className="w-4 h-4 mr-2 inline" />
                  {t('lettrage.filter')}
                </button>
              </div>
            </div>

            {/* Tableau historique */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">{t('lettrage.colDateTime')}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">{t('lettrage.colUser')}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">{t('lettrage.colAction')}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">{t('lettrage.colMatchingCode')}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">{t('navigation.entries')}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">{t('lettrage.colAmount')}</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">{t('lettrage.colStatus')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {lettrageHistory.map((history) => (
                    <tr key={history.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {history.date.toLocaleString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{history.user}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          history.action === 'create' ? 'bg-green-100 text-green-800' :
                          history.action === 'delete' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {history.action === 'create' ? t('lettrage.actionCreate') :
                           history.action === 'delete' ? t('lettrage.actionDelete') : t('lettrage.actionModify')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-700">{history.code}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{t('lettrage.entriesCount', { count: String(history.ecritures.length) })}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {fmt(history.montant)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <CheckCircle className="w-4 h-4 text-green-500 inline" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-gray-600">
                {t('lettrage.paginationInfo', { from: '1', to: String(lettrageHistory.length), total: String(lettrageHistory.length) })}
              </p>
              <div className="flex space-x-2">
                <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                  {t('lettrage.previous')}
                </button>
                <button className="px-3 py-1 text-sm bg-[var(--color-primary)] text-white rounded">1</button>
                <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                  {t('lettrage.next')}
                </button>
              </div>
            </div>
          </div>

          {/* Statistiques historiques */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-4">{t('lettrage.monthlyActivity')}</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('lettrage.matchingsCreated')}</span>
                  <span className="text-sm font-bold text-green-600">127</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('lettrage.matchingsDeleted')}</span>
                  <span className="text-sm font-bold text-red-600">15</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('lettrage.modifications')}</span>
                  <span className="text-sm font-bold text-blue-600">23</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-4">{t('lettrage.activeUsers')}</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-300 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-600">—</span>
                  </div>
                  <span className="text-sm font-bold">45</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-300 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-600">—</span>
                  </div>
                  <span className="text-sm font-bold">38</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-4">{t('dashboard.performance')}</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{t('lettrage.averageTime')}</span>
                    <span className="font-bold">2.3s</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{t('lettrage.successRate')}</span>
                    <span className="font-bold">98.5%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '98.5%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vue Configuration */}
      {viewMode === 'config' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configuration du lettrage automatique */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('lettrage.autoConfigTitle')}</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('lettrage.matchingCriteria')}
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={autoLettrageConfig.parMontant}
                        onChange={(e) => setAutoLettrageConfig({...autoLettrageConfig, parMontant: e.target.checked})}
                        className="mr-2 rounded border-gray-300 text-[var(--color-primary)]"
                      />
                      <span className="text-sm">{t('lettrage.byExactAmount')}</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={autoLettrageConfig.parReference}
                        onChange={(e) => setAutoLettrageConfig({...autoLettrageConfig, parReference: e.target.checked})}
                        className="mr-2 rounded border-gray-300 text-[var(--color-primary)]"
                      />
                      <span className="text-sm">{t('lettrage.byDocumentReference')}</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={autoLettrageConfig.parTiers}
                        onChange={(e) => setAutoLettrageConfig({...autoLettrageConfig, parTiers: e.target.checked})}
                        className="mr-2 rounded border-gray-300 text-[var(--color-primary)]"
                      />
                      <span className="text-sm">{t('lettrage.byThirdParty')}</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={autoLettrageConfig.parDate}
                        onChange={(e) => setAutoLettrageConfig({...autoLettrageConfig, parDate: e.target.checked})}
                        className="mr-2 rounded border-gray-300 text-[var(--color-primary)]"
                      />
                      <span className="text-sm">{t('lettrage.byDateProximity')}</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('lettrage.varianceTolerance')}
                  </label>
                  <input
                    type="number"
                    value={autoLettrageConfig.tolerance}
                    onChange={(e) => setAutoLettrageConfig({...autoLettrageConfig, tolerance: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('lettrage.maxPeriodDays')}
                  </label>
                  <input
                    type="number"
                    value={autoLettrageConfig.periodeMax}
                    onChange={(e) => setAutoLettrageConfig({...autoLettrageConfig, periodeMax: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <button
                  onClick={async () => {
                    try {
                      const payload = { key: 'lettrage_config', value: JSON.stringify(autoLettrageConfig), updatedAt: new Date().toISOString() };
                      const cur = await (adapter as any).getById('settings', 'lettrage_config').catch(() => null);
                      if (cur) await adapter.update('settings' as any, 'lettrage_config', payload as any);
                      else await adapter.create('settings' as any, payload as any);
                      toast.success(t('lettrage.configSaved'));
                    } catch { toast.error(t('lettrage.saveFailed')); }
                  }}
                  className="w-full px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]"
                >
                  <Save className="w-4 h-4 mr-2 inline" />
                  {t('lettrage.saveConfig')}
                </button>
              </div>
            </div>

            {/* Paramètres généraux */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('lettrage.generalSettings')}</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('lettrage.matchingCodeFormat')}
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option>{t('lettrage.formatAlphabetic')}</option>
                    <option>{t('lettrage.formatNumeric')}</option>
                    <option>{t('lettrage.formatAlphanumeric')}</option>
                    <option>{t('lettrage.formatDateSequence')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('lettrage.nextAvailableCode')}
                  </label>
                  <input
                    type="text"
                    value="AA"
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                  />
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="mr-2 rounded border-gray-300 text-[var(--color-primary)]"
                    />
                    <span className="text-sm">{t('lettrage.allowPartialMatching')}</span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="mr-2 rounded border-gray-300 text-[var(--color-primary)]"
                    />
                    <span className="text-sm">{t('lettrage.notifyOldEntries')}</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('lettrage.alertThresholdDays')}
                  </label>
                  <input
                    type="number"
                    defaultValue="60"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Droits et permissions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('lettrage.rightsAndPermissions')}</h3>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">{t('lettrage.colRole')}</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">{t('lettrage.permView')}</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">{t('lettrage.permMatch')}</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">{t('lettrage.permUnmatch')}</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">{t('lettrage.permAutoMatch')}</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">{t('settings.configuration')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{t('lettrage.roleAdmin')}</td>
                    <td className="px-4 py-3 text-center">
                      <CheckCircle className="w-5 h-5 text-green-500 inline" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CheckCircle className="w-5 h-5 text-green-500 inline" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CheckCircle className="w-5 h-5 text-green-500 inline" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CheckCircle className="w-5 h-5 text-green-500 inline" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CheckCircle className="w-5 h-5 text-green-500 inline" />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{t('lettrage.roleAccountant')}</td>
                    <td className="px-4 py-3 text-center">
                      <CheckCircle className="w-5 h-5 text-green-500 inline" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CheckCircle className="w-5 h-5 text-green-500 inline" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CheckCircle className="w-5 h-5 text-green-500 inline" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CheckCircle className="w-5 h-5 text-green-500 inline" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <XCircle className="w-5 h-5 text-red-500 inline" />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{t('lettrage.roleAssistant')}</td>
                    <td className="px-4 py-3 text-center">
                      <CheckCircle className="w-5 h-5 text-green-500 inline" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CheckCircle className="w-5 h-5 text-green-500 inline" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <XCircle className="w-5 h-5 text-red-500 inline" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <XCircle className="w-5 h-5 text-red-500 inline" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <XCircle className="w-5 h-5 text-red-500 inline" />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{t('lettrage.roleConsultant')}</td>
                    <td className="px-4 py-3 text-center">
                      <CheckCircle className="w-5 h-5 text-green-500 inline" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <XCircle className="w-5 h-5 text-red-500 inline" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <XCircle className="w-5 h-5 text-red-500 inline" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <XCircle className="w-5 h-5 text-red-500 inline" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <XCircle className="w-5 h-5 text-red-500 inline" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal détail / lettrage d'un compte tiers */}
      {detailCompte && detailMeta && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => { setDetailCompte(null); setSelectedEntries(new Set()); }} />
          <div className="relative z-[10000] w-full max-w-7xl bg-white rounded-xl shadow-2xl max-h-[90vh] flex flex-col">
            {/* En-tête */}
            <div className="flex items-start justify-between p-5 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-[var(--color-primary)]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {detailMeta.tiers}
                    {detailMeta.tiersCode && <span className="ml-2 font-mono text-xs text-gray-400">{detailMeta.tiersCode}</span>}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    <span className="font-mono">{t('lettrage.account')} {detailMeta.comptes.join(', ')}</span>
                    {' · '}{t('lettrage.balance')}&nbsp;
                    <span className={`font-semibold ${detailMeta.solde > 0 ? 'text-red-600' : detailMeta.solde < 0 ? 'text-green-600' : 'text-gray-700'}`}>
                      {fmt(Math.abs(detailMeta.solde))} {detailMeta.solde > 0 ? t('lettrage.debitSide') : detailMeta.solde < 0 ? t('lettrage.creditSide') : t('lettrage.settledSide')}
                    </span>
                    {' · '}{t('lettrage.unmatchedCount', { count: String(detailMeta.nonLettres) })} · {t('lettrage.matchedCount', { count: String(detailMeta.lettrees) })}
                  </p>
                </div>
              </div>
              <button onClick={() => { setDetailCompte(null); setSelectedEntries(new Set()); }} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barre d'actions */}
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 space-y-3">
              <div className="flex items-center flex-wrap gap-3">
                <div className="relative flex-1 min-w-[220px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    placeholder={t('lettrage.modalFilterPlaceholder')}
                    className="pl-9 pr-3 py-2 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={modalSortByAmount}
                    onChange={(e) => setModalSortByAmount(e.target.checked)}
                    className="rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                  />
                  <span className="text-sm text-gray-600 flex items-center gap-1"><ArrowUpDown className="w-3.5 h-3.5" />{t('lettrage.sortByAmount')}</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={!modalOnlyNonLettre}
                    onChange={(e) => setModalOnlyNonLettre(!e.target.checked)}
                    className="rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                  />
                  <span className="text-sm text-gray-600">{t('lettrage.showMatched')}</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={lettrageMode === 'partial'}
                    onChange={(e) => setLettrageMode(e.target.checked ? 'partial' : 'complete')}
                    className="rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                  />
                  <span className="text-sm text-gray-600">{t('lettrage.partial')}</span>
                </label>
              </div>

              {/* Compteur vivant + action */}
              <div className="flex items-center flex-wrap gap-3">
                <div className="flex items-center gap-4 text-sm bg-white border border-gray-200 rounded-lg px-3 py-1.5">
                  <span className="text-gray-500">{t('lettrage.selectedCount', { count: String(selDetail.count) })}</span>
                  <span className="text-red-600">{t('lettrage.debit')}&nbsp;<span className="font-semibold">{fmt(selDetail.debit)}</span></span>
                  <span className="text-green-600">{t('lettrage.credit')}&nbsp;<span className="font-semibold">{fmt(selDetail.credit)}</span></span>
                  <span className={`font-semibold ${Math.abs(selDetail.ecart) <= tolerance ? 'text-green-700' : 'text-orange-600'}`}>
                    {t('lettrage.variance')}&nbsp;{fmt(Math.abs(selDetail.ecart))}
                  </span>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  {selectedEntries.size > 0 && (
                    <span className={`text-xs font-medium flex items-center gap-1 ${canLettrage.valid ? 'text-green-600' : 'text-orange-600'}`}>
                      {canLettrage.valid ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      {canLettrage.reason}
                    </span>
                  )}
                  <button
                    onClick={handleLettrage}
                    disabled={!canLettrage.valid || isSaving}
                    title={canLettrage.reason}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      canLettrage.valid
                        ? (canLettrage as any).partial ? 'bg-yellow-600 text-white hover:bg-yellow-700' : 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {(canLettrage as any).partial ? <Lock className="w-4 h-4 mr-2 inline" /> : <Check className="w-4 h-4 mr-2 inline" />}
                    {(canLettrage as any).partial ? t('lettrage.partialMatching') : t('lettrage.match')} ({selectedEntries.size})
                  </button>
                </div>
              </div>
            </div>

            {/* Tableau des écritures */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-white sticky top-0 border-b border-gray-200 shadow-sm">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={detailEntries.filter(e => !e.lettrage).length > 0 && detailEntries.filter(e => !e.lettrage).every(e => selectedEntries.has(e.id))}
                        onChange={(e) => {
                          const next = new Set(selectedEntries);
                          detailEntries.filter(en => !en.lettrage).forEach(en => e.target.checked ? next.add(en.id) : next.delete(en.id));
                          setSelectedEntries(next);
                        }}
                      />
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">{t('common.date')}</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">{t('accounting.piece')}</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">{t('accounting.label')}</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">{t('lettrage.account')}</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">{t('accounting.journal')}</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">{t('accounting.debit')}</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">{t('accounting.credit')}</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">{t('thirdParty.matching')}</th>
                  </tr>
                </thead>
                <tbody>
                  {detailEntries.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-500">
                      {modalOnlyNonLettre ? t('lettrage.allEntriesMatched') : t('lettrage.noEntries')}
                    </td></tr>
                  )}
                  {detailEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className={`border-t hover:bg-gray-50 ${
                        selectedEntries.has(entry.id) ? 'bg-blue-50' :
                        suggestedIds.has(entry.id) ? 'bg-amber-50 ring-1 ring-inset ring-amber-300' : ''
                      } ${entry.lettrage ? 'opacity-70' : 'cursor-pointer'}`}
                      title={suggestedIds.has(entry.id) ? t('lettrage.amountMatchesSelection') : undefined}
                      onClick={() => { if (!entry.lettrage) toggleEntrySelection(entry.id); }}
                    >
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={selectedEntries.has(entry.id)}
                          onChange={() => toggleEntrySelection(entry.id)}
                          onClick={(e) => e.stopPropagation()}
                          disabled={!!entry.lettrage}
                          className="rounded border-gray-300 disabled:opacity-50"
                        />
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 whitespace-nowrap">{new Date(entry.date).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-2 text-sm font-mono text-gray-800">{entry.piece}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{entry.libelle}</td>
                      <td className="px-4 py-2 text-sm font-mono text-gray-600">{fmtAccount(entry.compte)}</td>
                      <td className="px-4 py-2 text-center">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono">{entry.journal}</span>
                      </td>
                      <td className="px-4 py-2 text-right text-sm text-red-600 font-medium whitespace-nowrap">{entry.debit > 0 ? fmt(entry.debit) : '-'}</td>
                      <td className="px-4 py-2 text-right text-sm text-green-600 font-medium whitespace-nowrap">{entry.credit > 0 ? fmt(entry.credit) : '-'}</td>
                      <td className="px-4 py-2 text-center">
                        {entry.lettrage ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); if (window.confirm(t('lettrage.confirmUnmatch', { code: entry.lettrage! }))) handleDelettrage(entry.lettrage!); }}
                            title={t('lettrage.clickToUnmatch')}
                            className="px-2 py-1 bg-green-100 text-green-800 hover:bg-red-100 hover:text-red-700 rounded text-xs font-mono inline-flex items-center gap-1"
                          >
                            {entry.lettrage} <Unlink className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {detailEntries.length > 0 && (
                  <tfoot className="sticky bottom-0 bg-gray-100 border-t-2 border-gray-300">
                    <tr className="text-sm font-bold text-gray-900">
                      <td className="px-4 py-2.5" colSpan={6}>
                        {t('lettrage.totalLines', { count: String(detailEntries.length) })}
                      </td>
                      <td className="px-4 py-2.5 text-right text-red-700 whitespace-nowrap">
                        {fmt(detailEntries.reduce((s, e) => money(s).add(money(e.debit)).toNumber(), 0))}
                      </td>
                      <td className="px-4 py-2.5 text-right text-green-700 whitespace-nowrap">
                        {fmt(detailEntries.reduce((s, e) => money(s).add(money(e.credit)).toNumber(), 0))}
                      </td>
                      <td className="px-4 py-2.5"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Pied */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-500">
                {t('lettrage.footerHintStart')} <span className="text-amber-600 font-medium">{t('lettrage.footerHintColor')}</span>{t('lettrage.footerHintEnd')}
              </p>
              <button onClick={() => { setDetailCompte(null); setSelectedEntries(new Set()); }} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-white">
                {t('lettrage.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de sélection de période */}
      <PeriodSelectorModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        onApply={(range) => setDateRange(range)}
        initialDateRange={dateRange}
      />
    </div>
  );
};

export default Lettrage;