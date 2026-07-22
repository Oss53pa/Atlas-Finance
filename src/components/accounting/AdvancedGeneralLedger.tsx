import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type { DBJournalEntry, DBAccount } from '../../lib/db';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '../../contexts/LanguageContext';
import PeriodSelectorModal from '../shared/PeriodSelectorModal';
import ExportMenu from '../shared/ExportMenu';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import {
  FileText, Search, Filter, Printer, Settings, Eye, Calendar,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, BarChart3,
  ChevronDown, ChevronRight, Grid3X3, Columns, ZoomIn, Mail, FileSpreadsheet,
  ArrowUpDown, RefreshCw, Save, BookOpen, Book, Users, Building, Hash,
  Mic, Sparkles, Clock, Star, MessageSquare, Share, Brain, Zap,
  Target, Activity, Award, Layers, GitBranch, Database, List, Calculator
} from 'lucide-react';
import PrintableArea from '../ui/PrintableArea';
import './AdvancedBalance.css';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { buildPieceNumbers, pieceNumberOf } from '../../utils/pieceNumber';
import { useMoneyFormat } from '@/hooks/useMoneyFormat';
import { money } from '../../utils/money';
import { SpaceLinkBadge } from '../../features/collaboration/components/SpaceLinkBadge';

interface LedgerEntry {
  id: string;
  date: string;
  piece: string;
  libelle: string;
  debit: number;
  credit: number;
  solde: number;
  centreCout?: string;
  tiers?: string;
  referenceExterne?: string;
  journal?: string;
  contrepartie?: string;
}

interface AccountData {
  compte: string;
  libelle: string;
  soldeOuverture: number;
  totalDebit: number;
  totalCredit: number;
  soldeFermeture: number;
  nombreEcritures: number;
  entries: LedgerEntry[];
}

const AdvancedGeneralLedger: React.FC = () => {
  const { t } = useLanguage();
  const fmt = useMoneyFormat();
  const { adapter } = useData();
  // États principaux
  const [activeView, setActiveView] = useState<'dashboard' | 'accounts' | 'analysis' | 'intelligent' | 'collaboration' | 'general-ledger' | 'movements'>('intelligent');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  // Drill-down entrant : /accounting/general-ledger?compte=521100 (trésorerie, budget…)
  // ouvre directement le détail du compte au lieu de la vue par défaut.
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  useEffect(() => {
    const compte = searchParams.get('compte');
    if (compte) {
      setSelectedAccount(compte);
      setActiveView('accounts');
    }
  }, [searchParams]);
  const [selectedClasse, setSelectedClasse] = useState<string>('all');
  // Affichage du solde dans le Grand Livre : 'progressif' (solde cumulé ligne à ligne)
  // ou 'dc' (colonnes Solde Débiteur / Solde Créditeur).
  const [soldeMode, setSoldeMode] = useState<'progressif' | 'dc'>('progressif');
  const [showFilters, setShowFilters] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const currentYear = new Date().getFullYear();
  const [dateRange, setDateRange] = useState({ start: `${currentYear}-01-01`, end: `${currentYear}-12-31` });

  // États pour les modales
  const [showExportModal, setShowExportModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAnnotationModal, setShowAnnotationModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf' | 'csv'>('excel');
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState(t('gl.emailSubjectDefault'));
  const [emailMessage, setEmailMessage] = useState('');
  const [annotation, setAnnotation] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [showAISettingsModal, setShowAISettingsModal] = useState(false);
  const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);
  const [showJoinWorkspaceModal, setShowJoinWorkspaceModal] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');

  // Nouvelles fonctionnalités intelligentes
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<AccountData[] | null>(null);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<{ query: string; date: string }[]>([]);
  const [responseTime, setResponseTime] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'table' | 'timeline' | 'hierarchy'>('table');
  const [ledgerViewMode, setLedgerViewMode] = useState<'detailed' | 'tree' | 'list'>('detailed');
  const [ledgerType, setLedgerType] = useState<'general' | 'account' | 'journal' | 'auxiliary' | 'summary'>('general');
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

  // Filtres
  const [filters, setFilters] = useState({
    dateDebut: '2025-01-01',
    dateFin: '2025-12-31',
    compteDebut: '',
    compteFin: '',
    piece: '',
    tiers: '',
    centreCout: '',
    montantMin: '',
    montantMax: '',
    onlyMovement: false
  });

  // Configuration d'impression
  const [printConfig, setPrintConfig] = useState({
    format: 'A4' as 'A4' | 'A3',
    orientation: 'landscape' as 'portrait' | 'landscape',
    includeDetails: true,
    showLogos: true,
    accountsPerPage: 5
  });

  // Charger les données du Grand Livre depuis Dexie
  const { data: rawAccountsData = [] } = useQuery<AccountData[]>({
    queryKey: ['advanced-general-ledger', dateRange.start, dateRange.end],
    queryFn: async () => {
      const allEntries = await adapter.getAll<DBJournalEntry>('journalEntries');
      const entries = allEntries.filter(e => e.status !== 'draft'); // brouillons exclus
      const accounts = await adapter.getAll<DBAccount>('accounts');
      const accountNames = new Map(accounts.map(a => [a.code, a.name]));
      const pieceNumbers = buildPieceNumbers(entries as any);

      const isAN = (e: any) => {
        const j = String(e?.journal || '').toUpperCase();
        return j === 'AN' || j === 'RAN';
      };

      // Solde d'OUVERTURE par compte = Σ(débit−crédit) des écritures À Nouveau (pas un
      // mouvement de période). Le solde progressif du grand livre démarre de là.
      const opening = new Map<string, number>();
      for (const entry of entries) {
        if (!isAN(entry)) continue;
        for (const line of (entry.lines || [])) {
          const cur = opening.get(line.accountCode) || 0;
          opening.set(line.accountCode, money(cur).add(money(line.debit)).subtract(money(line.credit)).toNumber());
        }
      }

      const accountMap = new Map<string, AccountData>();
      for (const entry of entries) {
        if (isAN(entry)) continue; // À Nouveau = ouverture, exclu des mouvements de période
        if (entry.date < dateRange.start || entry.date > dateRange.end) continue;
        for (const line of (entry.lines || [])) {
          const ouverture = opening.get(line.accountCode) || 0;
          const acc = accountMap.get(line.accountCode) || {
            compte: line.accountCode,
            libelle: line.accountName || accountNames.get(line.accountCode) || line.accountCode,
            soldeOuverture: ouverture,
            totalDebit: 0,
            totalCredit: 0,
            soldeFermeture: ouverture,
            nombreEcritures: 0,
            entries: [],
          };
          acc.totalDebit = money(acc.totalDebit).add(money(line.debit)).toNumber();
          acc.totalCredit = money(acc.totalCredit).add(money(line.credit)).toNumber();
          acc.nombreEcritures++;
          acc.soldeFermeture = money(acc.soldeOuverture).add(money(acc.totalDebit)).subtract(money(acc.totalCredit)).toNumber();

          // Contrepartie : compte de l'autre ligne (écriture à 2 lignes) ou ligne
          // de sens opposé au plus gros montant (écriture multi-lignes, suffixe …).
          const others = (entry.lines || []).filter((l) => l !== line);
          let contrepartie = '';
          if (others.length === 1) {
            contrepartie = others[0].accountCode;
          } else if (others.length > 1) {
            const opp = others.filter((o) => (Number(line.debit) > 0 ? Number(o.credit) > 0 : Number(o.debit) > 0));
            const pool = opp.length ? opp : others;
            const pick = pool.reduce((b, o) =>
              (Math.max(Number(o.debit) || 0, Number(o.credit) || 0) > Math.max(Number(b.debit) || 0, Number(b.credit) || 0) ? o : b), pool[0]);
            contrepartie = pick ? `${pick.accountCode}…` : '';
          }

          acc.entries.push({
            id: `${entry.id}-${line.id}`,
            date: entry.date,
            piece: pieceNumberOf(entry as any, pieceNumbers),
            libelle: line.label || entry.label,
            debit: line.debit,
            credit: line.credit,
            solde: acc.soldeFermeture,
            centreCout: line.analyticalCode,
            tiers: line.thirdPartyName,
            journal: (entry as any).journal || '',
            contrepartie,
          });
          accountMap.set(line.accountCode, acc);
        }
      }
      return Array.from(accountMap.values()).sort((a, b) => a.compte.localeCompare(b.compte));
    },
  });

  // Filtre par CLASSE (dropdown de l'en-tête) appliqué à la source : tous les
  // affichages (Détaillé / Arborescence / Liste) en héritent automatiquement.
  const accountsData = useMemo(
    () => (selectedClasse === 'all'
      ? rawAccountsData
      : rawAccountsData.filter((a) => String(a.compte).startsWith(selectedClasse))),
    [rawAccountsData, selectedClasse],
  );

  // Plan comptable complet — pour distinguer les comptes sans mouvement (réel).
  const { data: allAccounts = [] } = useQuery<DBAccount[]>({
    queryKey: ['advanced-general-ledger-accounts'],
    queryFn: () => adapter.getAll<DBAccount>('accounts'),
  });

  // Métriques RÉELLES (heuristiques, sans IA) pour les vues Analyse / Collaboration :
  //  - anomalies : lignes dont le montant dépasse nettement (≥5×) la moyenne du compte ;
  //  - conformité : % d'écritures équilibrées (Σ débit = Σ crédit) ;
  //  - patterns : nombre de libellés récurrents (≥3 occurrences) ;
  //  - workflow : répartition réelle des écritures par statut / exercice.
  const { data: aiMetrics } = useQuery({
    queryKey: ['gl-ai-metrics', dateRange.start, dateRange.end],
    queryFn: async () => {
      const all = await adapter.getAll<DBJournalEntry>('journalEntries');
      const inRange = all.filter((e) => e.date >= dateRange.start && e.date <= dateRange.end);

      // Conformité = écritures équilibrées.
      let balanced = 0;
      for (const e of inRange) {
        const d = (e.lines || []).reduce((s, l) => s + (Number(l.debit) || 0), 0);
        const c = (e.lines || []).reduce((s, l) => s + (Number(l.credit) || 0), 0);
        if (Math.abs(d - c) < 1) balanced++;
      }
      const conformite = inRange.length ? (balanced / inRange.length) * 100 : 100;

      // Moyenne des montants par compte (pour la détection d'anomalies).
      const sums: Record<string, { tot: number; n: number }> = {};
      for (const e of inRange) for (const l of (e.lines || [])) {
        const code = String(l.accountCode || ''); if (!code) continue;
        const amt = Math.max(Number(l.debit) || 0, Number(l.credit) || 0);
        sums[code] = sums[code] || { tot: 0, n: 0 };
        sums[code].tot += amt; sums[code].n++;
      }
      const anomalies: { compte: string; libelle: string; montant: number; factor: number; date: string }[] = [];
      for (const e of inRange) for (const l of (e.lines || [])) {
        const code = String(l.accountCode || ''); const s = sums[code];
        if (!s || s.n < 5) continue;
        const mean = s.tot / s.n;
        const amt = Math.max(Number(l.debit) || 0, Number(l.credit) || 0);
        if (mean > 0 && amt > mean * 5 && amt > 100000) {
          anomalies.push({ compte: code, libelle: l.label || e.label || '', montant: amt, factor: amt / mean, date: e.date });
        }
      }
      anomalies.sort((a, b) => b.factor - a.factor);

      // Patterns = libellés récurrents.
      const libCount: Record<string, number> = {};
      for (const e of inRange) for (const l of (e.lines || [])) {
        const k = (l.label || e.label || '').trim().toLowerCase();
        if (k) libCount[k] = (libCount[k] || 0) + 1;
      }
      const patterns = Object.values(libCount).filter((n) => n >= 3).length;

      // Workflow réel par statut / exercice.
      const norm = (s?: string) => String(s || 'validated').toLowerCase();
      const aReviser = all.filter((e) => norm(e.status) === 'draft').length;
      const enCours = all.filter((e) => ['pending', 'review', 'en_cours'].includes(norm(e.status))).length;
      const valide = inRange.filter((e) => norm(e.status) === 'validated').length;
      const archive = all.filter((e) => e.date < dateRange.start).length;
      const sample = (pred: (e: DBJournalEntry) => boolean) => all.filter(pred).slice(0, 2)
        .map((e) => `${(e.lines?.[0]?.accountCode) || ''} - ${e.label || ''}`.trim());

      return {
        totalEntries: inRange.length,
        balanced,
        unbalanced: inRange.length - balanced,
        conformite,
        anomalies: anomalies.slice(0, 12),
        patterns,
        workflow: {
          aReviser, enCours, valide, archive,
          aReviserSample: sample((e) => norm(e.status) === 'draft'),
          valideSample: sample((e) => norm(e.status) === 'validated' && e.date >= dateRange.start),
        },
      };
    },
  });

  // Stats réelles du tableau de bord (remplacent les anciennes valeurs en dur).
  const dashboardStats = useMemo(() => {
    const activeCodes = new Set(accountsData.map(a => a.compte));
    const sansMouvement = allAccounts.filter(a => !activeCodes.has(a.code)).length;
    const topMouvements = [...accountsData]
      .sort((a, b) => b.nombreEcritures - a.nombreEcritures)
      .slice(0, 3);
    const abs = (n: number) => Math.abs(n || 0);
    const plus10M = accountsData.filter(a => abs(a.soldeFermeture) >= 10_000_000).length;
    const plus5M = accountsData.filter(a => abs(a.soldeFermeture) >= 5_000_000).length;
    const plus1M = accountsData.filter(a => abs(a.soldeFermeture) >= 1_000_000).length;
    return { sansMouvement, totalComptes: allAccounts.length, topMouvements, plus10M, plus5M, plus1M };
  }, [accountsData, allAccounts]);

  // Données évolution — vide sans données
  const evolutionData = useMemo(() => {
    if (!accountsData.length) return [];
    // 6 derniers mois se terminant au mois de dateRange.end.
    const end = new Date(dateRange.end);
    const months: { key: string; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
      });
    }
    const isActif = (c: string) => c >= '2' && c <= '5';   // immos, stocks, tiers, trésorerie
    const isPassif = (c: string) => c === '1';             // ressources durables
    // Mouvement net par mois (actif = débit−crédit ; passif = crédit−débit).
    const movByMonth: Record<string, { actif: number; passif: number }> = {};
    for (const acc of accountsData) {
      const c = String(acc.compte).charAt(0);
      if (!isActif(c) && !isPassif(c)) continue;
      for (const e of acc.entries) {
        const m = String(e.date).slice(0, 7);
        if (!movByMonth[m]) movByMonth[m] = { actif: 0, passif: 0 };
        const net = (Number(e.debit) || 0) - (Number(e.credit) || 0);
        if (isActif(c)) movByMonth[m].actif += net;
        else movByMonth[m].passif += -net;
      }
    }
    // Cumul : on additionne d'abord tout ce qui précède le 1er mois affiché (ouverture).
    let cumA = 0, cumP = 0;
    const firstKey = months[0].key;
    for (const [m, v] of Object.entries(movByMonth)) {
      if (m < firstKey) { cumA += v.actif; cumP += v.passif; }
    }
    return months.map((mo) => {
      const v = movByMonth[mo.key] || { actif: 0, passif: 0 };
      cumA += v.actif; cumP += v.passif;
      return { periode: mo.label, actif: cumA, passif: cumP, produits: 0, charges: 0 };
    });
  }, [accountsData, dateRange]);

  // Calculs des indicateurs
  const indicators = useMemo(() => {
    const totalComptes = accountsData.length;
    const comptesActifs = accountsData.filter(acc => acc.nombreEcritures > 0).length;
    const totalEcritures = accountsData.reduce((sum, acc) => sum + acc.nombreEcritures, 0);
    const moyenneEcritures = totalEcritures / comptesActifs;
    const comptesPlusActifs = accountsData.filter(acc => acc.nombreEcritures > moyenneEcritures).length;
    
    return { totalComptes, comptesActifs, totalEcritures, moyenneEcritures, comptesPlusActifs };
  }, [accountsData]);

  // Toutes les lignes d'écritures aplaties — pour la vue "Recherche Intelligente"
  const flatEntries = useMemo(() => {
    return accountsData.flatMap(acc =>
      acc.entries.map(entry => ({
        id: entry.id,
        date: entry.date,
        compte: acc.compte,
        libelle: acc.libelle,
        description: entry.libelle,
        debit: entry.debit,
        credit: entry.credit,
        piece: entry.piece,
        tags: [] as string[],
        annotations: 0,
        aiFlags: [] as string[],
        confidence: 100,
      }))
    ).sort((a, b) => b.date.localeCompare(a.date));
  }, [accountsData]);

  // Recherche Intelligente : filtrage RÉEL des écritures par la requête.
  // Supporte : termes texte (compte, libellé, pièce, date) ET comparateur de
  // montant « > 500000 » / « < 1000 ».
  const searchedEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return flatEntries;
    const amtMatch = q.match(/([<>])\s*([\d\s.,]+)/);
    let amtOp = '';
    let amtVal = 0;
    if (amtMatch) {
      amtOp = amtMatch[1];
      amtVal = parseFloat(amtMatch[2].replace(/[\s.,]/g, '')) || 0;
    }
    const terms = q.replace(/[<>]\s*[\d\s.,]+/g, ' ').trim().split(/\s+/).filter(Boolean);
    return flatEntries.filter((e) => {
      if (amtOp) {
        const amt = Math.max(Number(e.debit) || 0, Number(e.credit) || 0);
        if (amtOp === '>' && !(amt > amtVal)) return false;
        if (amtOp === '<' && !(amt < amtVal)) return false;
      }
      if (terms.length) {
        const hay = `${e.compte} ${e.libelle} ${e.description} ${e.piece} ${e.date}`.toLowerCase();
        return terms.every((t) => hay.includes(t));
      }
      return true;
    });
  }, [flatEntries, searchQuery]);

  const searchComptesConcernes = useMemo(
    () => new Set(searchedEntries.map((e) => e.compte)).size,
    [searchedEntries],
  );

  // Temps de réponse RÉEL (mesure du filtrage) — remplace le « 0ms » figé.
  useEffect(() => {
    const t0 = performance.now();
    void searchedEntries.length;
    setResponseTime(Math.max(1, Math.round(performance.now() - t0)));
  }, [searchedEntries]);

  // Vue chronologique — entrées groupées par date
  const timelineData = useMemo(() => {
    const byDate = new Map<string, { total: number; items: typeof flatEntries }>();
    for (const entry of flatEntries) {
      const existing = byDate.get(entry.date) || { total: 0, items: [] };
      existing.total += entry.debit + entry.credit;
      existing.items.push(entry);
      byDate.set(entry.date, existing);
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 10)
      .map(([date, data]) => ({
        date: (() => { try { return new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return date; } })(),
        entries: data.items.length,
        total: data.total,
        items: data.items.slice(0, 3),
      }));
  }, [flatEntries]);

  // Vue hiérarchique — comptes groupés par classe
  const CLASS_META: Record<string, { label: string; color: string }> = {
    '1': { label: t('gl.class1Label'), color: 'gray' },
    '2': { label: t('gl.class2Label'), color: 'green' },
    '3': { label: t('gl.class3Label'), color: 'yellow' },
    '4': { label: t('gl.class4Label'), color: 'primary' },
    '5': { label: t('gl.class5Label'), color: 'blue' },
    '6': { label: t('gl.class6Label'), color: 'red' },
    '7': { label: t('gl.class7Label'), color: 'green' },
    '8': { label: t('gl.class8Label'), color: 'gray' },
    '9': { label: t('gl.class9Label'), color: 'gray' },
  };
  const hierarchyData = useMemo(() => {
    const classMap = new Map<string, AccountData[]>();
    for (const acc of accountsData) {
      const key = acc.compte.charAt(0);
      const existing = classMap.get(key) || [];
      existing.push(acc);
      classMap.set(key, existing);
    }
    return Array.from(classMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, comptes]) => ({
        classe: CLASS_META[key]?.label ?? t('gl.classN', { n: key }),
        color: CLASS_META[key]?.color ?? 'gray',
        comptes: comptes.map(acc => ({
          numero: acc.compte,
          libelle: acc.libelle,
          solde: acc.soldeFermeture,
          sousComptes: [] as { numero: string; libelle: string; solde: number }[],
        })),
      }));
  }, [accountsData]);

  const COLORS = ['#235A6E', '#E89A2E', '#15803D', '#4E7E8D', '#C77E2C', '#7FA3AF'];

  return (
    <PrintableArea
      documentTitle={t('gl.documentTitle')}
      orientation="landscape"
      showPrintButton={false}
    >
      <div className="min-h-screen bg-[var(--color-surface-hover)] print-area w-full">
      {/* En-tête principal */}
      <div className="bg-[var(--color-surface-hover)] border-b border-[var(--color-border)] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <BookOpen className="w-8 h-8 text-[var(--color-primary)]" />
            <div>
              <h1 className="text-lg font-bold text-[var(--color-primary)]">{t('gl.title')}</h1>
              <p className="text-sm text-[var(--color-primary)]/70">{t('gl.subtitle')}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Bouton de sélection de période */}
            <button
              onClick={() => setShowPeriodModal(true)}
              className="px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] text-left flex items-center space-x-2 hover:bg-gray-50"
            >
              <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
              <span className="text-sm">
                {dateRange.start && dateRange.end
                  ? `${new Date(dateRange.start).toLocaleDateString('fr-FR')} - ${new Date(dateRange.end).toLocaleDateString('fr-FR')}`
                  : t('gl.period')
                }
              </span>
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg border transition-colors ${showFilters ? 'bg-[var(--color-primary)] text-[var(--color-surface-hover)] border-[var(--color-primary)]' : 'bg-[var(--color-surface-hover)] text-[var(--color-primary)]/70 border-[var(--color-border)] hover:bg-[var(--color-border)]'}`}
            >
              <Filter className="w-4 h-4 mr-2 inline" />
              {t('gl.filters')}
            </button>
            
            <button 
              onClick={() => setShowPrintPreview(true)}
              className="px-4 py-2 bg-[var(--color-surface-hover)] text-[var(--color-primary)]/70 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-border)] transition-colors"
            >
              <Printer className="w-4 h-4 mr-2 inline" />
              {t('gl.previewBtn')}
            </button>
            
            <ExportMenu
              data={accountsData as unknown as Record<string, unknown>[]}
              filename="grand-livre-general"
              columns={{
                compte: t('gl.colAccount'),
                libelle: t('gl.colLabel'),
                soldeOuverture: t('gl.colOpeningBalance'),
                totalDebit: t('gl.colTotalDebit'),
                totalCredit: t('gl.colTotalCredit'),
                soldeFermeture: t('gl.colClosingBalance'),
                nombreEcritures: t('gl.colEntryCount')
              }}
              buttonText={t('gl.export')}
            />
          </div>
        </div>
        
        {/* Navigation des vues - Version nouvelle génération */}
        <div className="flex space-x-1 mt-4 pt-3 overflow-x-auto overflow-y-visible">
          {[
            { id: 'intelligent', label: t('gl.viewIntelligent'), icon: Sparkles, badge: 'Nouveau', color: 'bg-primary-600' },
            { id: 'dashboard', label: t('gl.viewDashboard'), icon: BarChart3, color: 'bg-[var(--color-primary)]' },
            { id: 'accounts', label: t('gl.viewAccounts'), icon: Hash, color: 'bg-blue-600' },
            { id: 'general-ledger', label: t('accounting.generalLedger'), icon: BookOpen, color: 'bg-green-600' },
            { id: 'analysis', label: t('gl.viewAiAnalysis'), icon: Brain, badge: 'IA', color: 'bg-primary' },
            { id: 'collaboration', label: t('gl.viewCollaboration'), icon: Users, badge: 'Beta', color: 'bg-orange-600' }
          ].map((view) => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id as typeof activeView)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all duration-200 ${
                activeView === view.id
                  ? `${view.color} text-white shadow-lg transform scale-105`
                  : 'text-gray-600 hover:bg-gray-100 hover:shadow-md'
              }`}
            >
              <view.icon className="w-4 h-4" />
              {view.label}
              {view.badge && (
                <span className={`inline-flex items-center px-1.5 py-0.5 text-xs font-bold text-white rounded-full ${
                  view.badge === 'Nouveau' ? 'bg-red-500' : view.badge === 'IA' ? 'bg-primary-500' : 'bg-orange-500'
                } animate-pulse`}>
                  {view.badge === 'Nouveau' ? t('gl.badgeNew') : view.badge === 'IA' ? t('gl.badgeAi') : t('gl.badgeBeta')}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Filtres avancés */}
      {showFilters && (
        <div className="bg-[var(--color-surface-hover)] border-b border-[var(--color-border)] px-4 py-3">
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-primary)] mb-1">{t('gl.startDate')}</label>
              <input 
                type="date" 
                value={filters.dateDebut}
                onChange={(e) => setFilters({...filters, dateDebut: e.target.value})}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-primary)] mb-1">{t('gl.endDate')}</label>
              <input 
                type="date" 
                value={filters.dateFin}
                onChange={(e) => setFilters({...filters, dateFin: e.target.value})}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-primary)] mb-1">{t('accounting.account')}</label>
              <select 
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm"
              >
                <option value="">{t('gl.allAccounts')}</option>
                {accountsData.map((acc) => (
                  <option key={acc.compte} value={acc.compte}>
                    {acc.compte} - {acc.libelle}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('gl.documentNo')}</label>
              <input 
                type="text" 
                placeholder={t('gl.documentNoPlaceholder')}
                value={filters.piece}
                onChange={(e) => setFilters({...filters, piece: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('gl.thirdParty')}</label>
              <input 
                type="text" 
                placeholder={t('gl.thirdPartyPlaceholder')}
                value={filters.tiers}
                onChange={(e) => setFilters({...filters, tiers: e.target.value})}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm"
              />
            </div>
            <div className="flex items-end">
              <button className="w-full px-4 py-2 bg-[var(--color-primary)] text-white rounded-md hover:bg-[var(--color-primary-hover)] transition-colors">
                <Search className="w-4 h-4 mr-2 inline" />
                {t('gl.search')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vue Recherche Intelligente Nouvelle Génération */}
      {activeView === 'intelligent' && (
        <div className="space-y-0 w-full">

          {/* Barre de recherche intelligente */}
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-primary-600" />
                {t('gl.smartSearchTitle')}
              </h3>
              <div className="flex items-center space-x-2 text-sm text-gray-700">
                <Zap className="w-4 h-4 text-green-500" />
                <span>{t('gl.performanceHint')}</span>
              </div>
            </div>

            {/* Barre de recherche avancée */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                {isSearching ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                ) : (
                  <Search className="h-5 w-5 text-gray-700" />
                )}
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-20 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-0 transition-colors"
                placeholder={t('gl.searchPlaceholder')}
                autoComplete="off"
              />

              <div className="absolute inset-y-0 right-0 flex items-center pr-4 space-x-2">
                <button
                  className="p-2 text-gray-700 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  title={t('gl.voiceSearch')}
                >
                  <Mic className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setShowAIAnalysis(!showAIAnalysis)}
                  className={`p-2 rounded-lg transition-colors ${
                    showAIAnalysis ? 'bg-primary-100 text-primary-600' : 'text-gray-700 hover:text-primary-600 hover:bg-primary-50'
                  }`}
                  title={t('gl.aiAnalysis')}
                >
                  <Brain className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Suggestions et raccourcis */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm text-gray-700 mr-2">{t('gl.quickSearches')}</span>
              {['512000 banque', 'virement > 500000', 'janvier 2024', 'client important'].map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setSearchQuery(suggestion)}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-primary-100 text-gray-700 hover:text-primary-800 rounded-full transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {/* Métriques de performance en temps réel */}
            <div className="mt-4 grid grid-cols-4 gap-4">
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-green-600">{t('gl.responseTime')}</p>
                    <p className="text-lg font-bold text-green-900">{responseTime}ms</p>
                  </div>
                  <Target className="h-6 w-6 text-green-500" />
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-600">{t('gl.totalEntries')}</p>
                    <p className="text-lg font-bold text-blue-900">{indicators.totalEcritures.toLocaleString('fr-FR')}</p>
                  </div>
                  <Database className="h-6 w-6 text-blue-500" />
                </div>
              </div>

              <div className="bg-primary-50 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-primary-600">{t('gl.activeAccounts')}</p>
                    <p className="text-lg font-bold text-primary-900">{indicators.comptesActifs}</p>
                  </div>
                  <Brain className="h-6 w-6 text-primary-500" />
                </div>
              </div>

              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-orange-600">{t('gl.totalAccounts')}</p>
                    <p className="text-lg font-bold text-orange-900">{indicators.totalComptes}</p>
                  </div>
                  <Activity className="h-6 w-6 text-orange-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Modes de vue */}
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-md font-semibold text-gray-900">{t('gl.navigationMode')}</h4>
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                {[
                  { mode: 'table', icon: Grid3X3, label: t('gl.modeTable') },
                  { mode: 'timeline', icon: Clock, label: t('gl.modeTimeline') },
                  { mode: 'hierarchy', icon: GitBranch, label: t('gl.modeHierarchy') }
                ].map(({ mode, icon: Icon, label }) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode as typeof viewMode)}
                    className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-md transition-colors ${
                      viewMode === mode
                        ? 'bg-white text-primary-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Résultats de recherche intelligente */}
          <div className="bg-white border-y border-gray-200">
            <div className="p-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h4 className="text-lg font-semibold text-gray-900">{t('gl.smartResults')}</h4>
                  {searchQuery && (
                    <div className="flex items-center space-x-2 text-sm text-gray-700">
                      <span>{t('gl.searchLabel')}</span>
                      <code className="bg-gray-100 px-2 py-1 rounded font-mono">{searchQuery}</code>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 text-sm text-gray-700">
                    <Clock className="h-4 w-4 text-green-500" />
                    <span className="text-green-600 font-medium">{responseTime}ms</span>
                  </div>

                  <button
                    onClick={() => setShowCollaboration(!showCollaboration)}
                    className={`p-2 rounded-lg border transition-colors ${
                      showCollaboration ? 'bg-orange-50 border-orange-300 text-orange-600' : 'border-gray-300 hover:bg-gray-50'
                    }`}
                    title={t('gl.collaborationFeatures')}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>

                  {/* ExportMenu rend son propre <button> → ne pas l'imbriquer dans un
                      <button> (validateDOMNesting). Un <span> porteur du title suffit. */}
                  <span title={t('gl.exportResults')} className="inline-flex">
                    <ExportMenu
                      data={accountsData as unknown as Record<string, unknown>[]}
                      filename="compte-detail"
                      columns={{
                        compte: t('gl.colAccount'),
                        libelle: t('gl.colLabel'),
                        soldeFermeture: t('gl.colBalance')
                      }}
                      buttonText=""
                      buttonVariant="ghost"
                    />
                  </span>

                  <button
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    title={t('gl.share')} aria-label={t('gl.share')}>
                    <Share className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Statistiques de recherche */}
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-blue-50 p-3 rounded">
                  <div className="text-xs text-blue-600">{t('gl.entriesFound')}</div>
                  <div className="font-semibold text-blue-900">{searchedEntries.length.toLocaleString('fr-FR')}</div>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <div className="text-xs text-green-600">{t('gl.accountsConcerned')}</div>
                  <div className="font-semibold text-green-900">{searchComptesConcernes.toLocaleString('fr-FR')}</div>
                </div>
                <div className="bg-primary-50 p-3 rounded">
                  <div className="text-xs text-primary-600">{t('gl.activeAccounts')}</div>
                  <div className="font-semibold text-primary-900">{indicators.comptesActifs.toLocaleString('fr-FR')}</div>
                </div>
              </div>
            </div>

            {/* Table des résultats avec fonctionnalités avancées */}
            {viewMode === 'table' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <span>{t('common.date')}</span>
                        <ArrowUpDown className="h-3 w-3 cursor-pointer hover:text-gray-700" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <span>{t('accounting.account')}</span>
                        <Filter className="h-3 w-3 cursor-pointer hover:text-gray-700" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('accounting.label')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">{t('accounting.debit')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">{t('accounting.credit')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('accounting.journal')}</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">{t('gl.ai')}</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">{t('gl.actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {searchedEntries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-500">
                        {searchQuery.trim() ? t('gl.noResultsFor', { query: searchQuery.trim() }) : t('gl.noEntriesPeriod')}
                      </td>
                    </tr>
                  ) : null}
                  {searchedEntries.slice(0, 50).map((entry, index) => (
                    <tr key={entry.id} className="hover:bg-gray-50 group">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(entry.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full bg-${entry.compte[0] === '5' ? 'blue' : entry.compte[0] === '4' ? 'primary' : 'red'}-500`}></div>
                          <span className="text-sm font-mono font-medium text-gray-900">{entry.compte}</span>
                        </div>
                        <div className="text-xs text-gray-700 mt-1">{entry.libelle}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{entry.description}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {entry.tags.map((tag, tagIndex) => (
                            <span key={tagIndex} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {entry.debit > 0 ? (
                          <span className="text-green-600 font-mono font-medium">{fmt(entry.debit)}</span>
                        ) : (
                          <span className="text-gray-700">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {entry.credit > 0 ? (
                          <span className="text-red-600 font-mono font-medium">{fmt(entry.credit)}</span>
                        ) : (
                          <span className="text-gray-700">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                          {entry.piece || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <div className={`w-3 h-3 rounded-full ${
                            entry.confidence >= 95 ? 'bg-green-500' :
                            entry.confidence >= 85 ? 'bg-yellow-500' : 'bg-red-500'
                          }`} title={t('gl.aiConfidence', { value: String(entry.confidence) })}></div>
                          {entry.aiFlags.includes('anomaly_detected') && (
                            <span title={t('gl.anomalyDetected')}><AlertTriangle className="h-3 w-3 text-orange-500" /></span>
                          )}
                          {entry.annotations > 0 && (
                            <div className="relative">
                              <MessageSquare className="h-3 w-3 text-blue-500" />
                              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-3 h-3 flex items-center justify-center text-[10px]">
                                {entry.annotations}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setSelectedEntry({
                                id: entry.id,
                                date: entry.date,
                                piece: entry.piece,
                                libelle: entry.description || entry.libelle,
                                debit: entry.debit,
                                credit: entry.credit,
                                solde: money(entry.debit).subtract(money(entry.credit)).toNumber()
                              });
                              setShowDetailModal(true);
                            }}
                            className="p-1 text-gray-700 hover:text-blue-600"
                            title={t('gl.viewDetails')}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedEntry({
                                id: entry.id,
                                date: entry.date,
                                piece: entry.piece,
                                libelle: entry.description || entry.libelle,
                                debit: entry.debit,
                                credit: entry.credit,
                                solde: money(entry.debit).subtract(money(entry.credit)).toNumber()
                              });
                              setShowAnnotationModal(true);
                            }}
                            className="p-1 text-gray-700 hover:text-orange-600"
                            title={t('gl.annotate')}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              const newFavorites = new Set(favorites);
                              if (newFavorites.has(entry.id)) {
                                newFavorites.delete(entry.id);
                              } else {
                                newFavorites.add(entry.id);
                              }
                              setFavorites(newFavorites);
                            }}
                            className={`p-1 ${favorites.has(entry.id) ? 'text-yellow-500' : 'text-gray-700'} hover:text-yellow-600`}
                            title={t('gl.markFavorite')}
                          >
                            <Star className="h-4 w-4" fill={favorites.has(entry.id) ? 'currentColor' : 'none'} />
                          </button>
                          <button
                            onClick={() => {
                              setShareLink(`/accounting/entry/${entry.id}`);
                              setShowShareModal(true);
                            }}
                            className="p-1 text-gray-700 hover:text-green-600"
                            title={t('gl.share')}
                          >
                            <Share className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>

                {/* Pagination intelligente */}
                <div className="px-6 py-4 border-t bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-700">
                      {t('gl.paginationShowing', { to: String(Math.min(50, flatEntries.length)), total: flatEntries.length.toLocaleString('fr-FR') })}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {}}
                        disabled
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('gl.previous')}
                      </button>
                      <span className="px-3 py-1 text-sm bg-primary-100 text-primary-800 rounded font-medium">1</span>
                      <span className="px-2 py-1 text-sm text-gray-700">...</span>
                      <span className="px-2 py-1 text-sm text-gray-700">25</span>
                      <button
                        onClick={() => {}}
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                      >
                        {t('gl.next')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Vue Chronologique */}
            {viewMode === 'timeline' && (
              <div className="p-2 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-blue-600" />
                    {t('gl.timelineTitle')}
                  </h3>
                  <div className="flex space-x-2">
                    <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                      {t('gl.month')}
                    </button>
                    <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                      {t('gl.week')}
                    </button>
                    <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded">
                      {t('gl.day')}
                    </button>
                  </div>
                </div>

                {/* Timeline par jour */}
                <div className="space-y-6">
                  {timelineData.length === 0 && (
                    <div className="text-center py-10 text-sm text-gray-500">
                      {t('gl.noEntriesPeriod')}
                    </div>
                  )}
                  {timelineData.map((day, dayIndex) => (
                    <div key={dayIndex} className="border-l-4 border-blue-500 pl-6 relative">
                      <div className="absolute -left-3 top-0 w-6 h-6 bg-blue-500 rounded-full border-4 border-white"></div>

                      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900">{day.date}</h4>
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="text-gray-600">{t('gl.entriesCount', { count: String(day.entries) })}</span>
                            <span className="font-medium text-gray-900">{fmt(day.total)}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {day.items.slice(0, 2).map((entry, entryIndex) => (
                            <div key={entryIndex} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                              <div className="flex items-center space-x-3">
                                <span className="text-sm font-mono text-gray-700">{entry.compte}</span>
                                <span className="text-sm text-gray-600">{entry.description || entry.libelle}</span>
                              </div>
                              <span className={`text-sm font-semibold ${entry.debit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {fmt(entry.debit > 0 ? entry.debit : entry.credit)}
                              </span>
                            </div>
                          ))}
                          {day.entries > 2 && (
                            <p className="text-sm text-blue-600">
                              {t('gl.moreEntries', { count: String(day.entries - 2) })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center pt-4">
                  <button className="px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50">
                    {t('gl.loadMoreDates')}
                  </button>
                </div>
              </div>
            )}

            {/* Vue Hiérarchique */}
            {viewMode === 'hierarchy' && (
              <div className="p-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <GitBranch className="h-5 w-5 mr-2 text-primary-600" />
                    {t('gl.hierarchyTitle')}
                  </h3>
                  <div className="flex space-x-2">
                    <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                      {t('gl.collapseAll')}
                    </button>
                    <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                      {t('gl.expandAll')}
                    </button>
                  </div>
                </div>

                {/* Arborescence des comptes — données réelles */}
                <div className="space-y-2">
                  {hierarchyData.length === 0 && (
                    <div className="text-center py-10 text-sm text-gray-500">
                      {t('gl.noMovedAccounts')}
                    </div>
                  )}
                  {hierarchyData.map((classe, classeIndex) => (
                    <div key={classeIndex} className="border border-gray-200 rounded-lg">
                      <div
                        className={`bg-${classe.color}-50 border-l-4 border-${classe.color}-500 p-3 cursor-pointer hover:bg-${classe.color}-100`}
                        onClick={() => {
                          const newExpanded = new Set(expandedAccounts);
                          if (newExpanded.has(`classe-${classeIndex}`)) {
                            newExpanded.delete(`classe-${classeIndex}`);
                          } else {
                            newExpanded.add(`classe-${classeIndex}`);
                          }
                          setExpandedAccounts(newExpanded);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {expandedAccounts.has(`classe-${classeIndex}`) ? (
                              <ChevronDown className="h-4 w-4 text-gray-600" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-600" />
                            )}
                            <span className="font-semibold text-gray-900">{classe.classe}</span>
                          </div>
                          <span className="text-sm text-gray-600">{t('gl.accountsCount', { count: String(classe.comptes.length) })}</span>
                        </div>
                      </div>

                      {expandedAccounts.has(`classe-${classeIndex}`) && (
                        <div className="p-3 space-y-2">
                          {classe.comptes.map((compte, compteIndex) => (
                            <div key={compteIndex} className="border-l-2 border-gray-300 pl-4">
                              <div
                                className="p-2 hover:bg-gray-50 rounded cursor-pointer"
                                onClick={() => {
                                  const newExpanded = new Set(expandedAccounts);
                                  const key = `compte-${classeIndex}-${compteIndex}`;
                                  if (newExpanded.has(key)) {
                                    newExpanded.delete(key);
                                  } else {
                                    newExpanded.add(key);
                                  }
                                  setExpandedAccounts(newExpanded);
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    {compte.sousComptes.length > 0 && (
                                      expandedAccounts.has(`compte-${classeIndex}-${compteIndex}`) ? (
                                        <ChevronDown className="h-3 w-3 text-gray-700" />
                                      ) : (
                                        <ChevronRight className="h-3 w-3 text-gray-700" />
                                      )
                                    )}
                                    <span className="font-mono text-sm font-medium text-gray-700">{compte.numero}</span>
                                    <span className="text-sm text-gray-600">{compte.libelle}</span>
                                  </div>
                                  <span className={`text-sm font-semibold ${compte.solde > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {fmt(compte.solde)}
                                  </span>
                                </div>
                              </div>

                              {expandedAccounts.has(`compte-${classeIndex}-${compteIndex}`) && compte.sousComptes.length > 0 && (
                                <div className="ml-4 mt-2 space-y-1">
                                  {compte.sousComptes.map((sousCompte, sousCompteIndex) => (
                                    <div key={sousCompteIndex} className="p-2 bg-gray-50 rounded text-sm">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                          <span className="font-mono text-xs text-gray-600">{sousCompte.numero}</span>
                                          <span className="text-xs text-gray-600">{sousCompte.libelle}</span>
                                        </div>
                                        <span className={`text-xs font-semibold ${sousCompte.solde > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {fmt(sousCompte.solde)}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Panneau d'analyse IA (si activé) */}
          {showAIAnalysis && (
            <div className="bg-gradient-to-r from-primary-50 to-primary-50 rounded-lg border border-primary-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-primary-900 flex items-center">
                  <Brain className="w-5 h-5 mr-2" />
                  {t('gl.realtimeAiAnalysis')}
                </h4>
                <div className="flex items-center space-x-2 text-sm text-primary-700">
                  <Sparkles className="w-4 h-4" />
                  <span>{t('gl.advancedAlgorithms')}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border border-primary-200">
                  <h5 className="font-medium text-primary-900 mb-2">{t('gl.anomalyDetection')}</h5>
                  <ul className="space-y-1 text-sm text-primary-800">
                    <li>{t('gl.aiAnomaly1')}</li>
                    <li>{t('gl.aiAnomaly2')}</li>
                    <li>{t('gl.aiAnomaly3')}</li>
                  </ul>
                </div>

                <div className="bg-white p-4 rounded-lg border border-primary-200">
                  <h5 className="font-medium text-primary-900 mb-2">{t('gl.autoInsights')}</h5>
                  <ul className="space-y-1 text-sm text-primary-800">
                    <li>{t('gl.aiInsight1')}</li>
                    <li>{t('gl.aiInsight2')}</li>
                    <li>{t('gl.aiInsight3')}</li>
                  </ul>
                </div>

                <div className="bg-white p-4 rounded-lg border border-primary-200">
                  <h5 className="font-medium text-primary-900 mb-2">{t('gl.recommendations')}</h5>
                  <ul className="space-y-1 text-sm text-primary-800">
                    <li>{t('gl.aiReco1')}</li>
                    <li>{t('gl.aiReco2')}</li>
                    <li>{t('gl.aiReco3')}</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Panneau collaboration (si activé) */}
          {showCollaboration && (
            <div className="bg-orange-50 rounded-lg border border-orange-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-orange-900 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  {t('gl.collaborativeSpace')}
                </h4>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 bg-orange-200 text-orange-800 text-xs rounded-full">
                    {t('gl.activeMembers3')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg">
                  <h5 className="font-medium text-orange-900 mb-3 flex items-center">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    {t('gl.recentAnnotations')}
                  </h5>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                        JD
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-gray-900">
                          <span className="font-medium">—</span> {t('gl.commentedEntry')}
                        </div>
                        <div className="text-xs text-gray-700 mt-1">
                          {t('gl.sampleComment')}
                        </div>
                        <div className="text-xs text-gray-700 mt-1">{t('gl.min5Ago')}</div>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">
                        ML
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-gray-900">
                          <span className="font-medium">Marie Leblanc</span> {t('gl.validatedEntry')}
                        </div>
                        <div className="text-xs text-gray-700 mt-1">{t('gl.min12Ago')}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg">
                  <h5 className="font-medium text-orange-900 mb-3 flex items-center">
                    <Star className="w-4 h-4 mr-2" />
                    {t('gl.teamFavoriteSearches')}
                  </h5>
                  <div className="space-y-2">
                    <button className="w-full text-left p-2 hover:bg-gray-50 rounded text-sm">
                      {t('gl.favSearch1')}
                    </button>
                    <button className="w-full text-left p-2 hover:bg-gray-50 rounded text-sm">
                      {t('gl.favSearch2')}
                    </button>
                    <button className="w-full text-left p-2 hover:bg-gray-50 rounded text-sm">
                      {t('gl.favSearch3')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tableau de bord */}
      {activeView === 'dashboard' && (
        <div className="w-full bg-white">

          {/* Indicateurs clés */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('gl.totalAccountsLabel')}</p>
                  <p className="text-lg font-bold text-[var(--color-primary)]">{indicators.totalComptes}</p>
                  <p className="text-xs text-gray-700">{t('accounting.chartOfAccounts')}</p>
                </div>
                <div className="w-12 h-12 bg-[var(--color-primary)]/10 rounded-lg flex items-center justify-center">
                  <Hash className="w-6 h-6 text-[var(--color-primary)]" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('gl.activeAccountsLabel')}</p>
                  <p className="text-lg font-bold text-blue-600">{indicators.comptesActifs}</p>
                  <p className="text-xs text-gray-700">{t('gl.withMovements')}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('gl.totalEntriesLabel')}</p>
                  <p className="text-lg font-bold text-green-600">{indicators.totalEcritures}</p>
                  <p className="text-xs text-gray-700">{t('gl.currentPeriod')}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('gl.avgEntries')}</p>
                  <p className="text-lg font-bold text-orange-600">{formatNumber(indicators.moyenneEcritures)}</p>
                  <p className="text-xs text-gray-700">{t('gl.perActiveAccount')}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Graphiques d'évolution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Évolution des soldes */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">{t('gl.balanceEvolution')}</h3>
                <div className="flex items-center space-x-2">
                  <select className="px-3 py-1 border border-gray-300 rounded text-sm">
                    <option>{t('gl.last6Months')}</option>
                    <option>{t('gl.last12Months')}</option>
                    <option>{t('gl.fullYear')}</option>
                  </select>
                  <button className="p-2 text-gray-700 hover:text-gray-600">
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="periode" />
                  <YAxis tickFormatter={(value) => fmt(value)} />
                  <Tooltip formatter={(value) => [fmt(value as number), '']} />
                  <Legend />
                  <Area type="monotone" dataKey="actif" stackId="1" stroke="#235A6E" fill="#235A6E" fillOpacity={0.6} name={t('gl.assets')} />
                  <Area type="monotone" dataKey="passif" stackId="2" stroke="#4E7E8D" fill="#4E7E8D" fillOpacity={0.6} name={t('gl.liabilities')} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Top comptes par activité */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">{t('gl.topActiveAccounts')}</h3>
                <button
                  onClick={() => { setSelectedAccount(''); setActiveView('accounts'); }}
                  className="p-2 text-gray-700 hover:text-[var(--color-primary)]"
                  aria-label={t('gl.viewDetailedAccounts')}
                  title={t('gl.viewDetailedAccounts')}
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                {accountsData
                  .sort((a, b) => b.nombreEcritures - a.nombreEcritures)
                  .slice(0, 5)
                  .map((account, index) => (
                    <div
                      key={account.compte}
                      role="button"
                      tabIndex={0}
                      onClick={() => { setSelectedAccount(account.compte); setActiveView('accounts'); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedAccount(account.compte); setActiveView('accounts'); } }}
                      title={t('gl.viewAccountDetail', { account: account.compte })}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-[var(--color-primary)]/5 hover:ring-1 hover:ring-[var(--color-primary)]/30 transition-all"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                          index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-gray-300'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-mono text-sm font-medium text-gray-900">{account.compte}</div>
                          <div className="text-xs text-gray-700">{account.libelle.substring(0, 25)}...</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">{account.nombreEcritures}</div>
                        <div className="text-xs text-gray-700">{t('gl.entriesWord')}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Alertes et notifications */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Comptes sans mouvement — réel (plan comptable vs comptes mouvementés) */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-gray-900">{t('gl.inactiveAccounts')}</h4>
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('gl.noMovementPeriod')}</span>
                  <span className="text-sm font-medium text-orange-600">{t('gl.accountsCount', { count: String(dashboardStats.sansMouvement) })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('gl.movedAccounts')}</span>
                  <span className="text-sm font-medium text-green-600">{t('gl.accountsCount', { count: String(indicators.comptesActifs) })}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">{t('gl.chartOfAccounts')}</span>
                    <span className="text-sm font-bold text-orange-600">{dashboardStats.totalComptes}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mouvements importants — réel (top comptes par nombre d'écritures) */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-gray-900">{t('gl.majorMovements')}</h4>
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div className="space-y-3">
                {dashboardStats.topMouvements.length === 0 && (
                  <p className="text-sm text-gray-500">{t('gl.noMovementInPeriod')}</p>
                )}
                {dashboardStats.topMouvements.map((acc) => (
                  <div key={acc.compte} className="flex justify-between items-center">
                    <div>
                      <span className="text-sm font-medium text-gray-900">{acc.compte}</span>
                      <p className="text-xs text-gray-700">{(acc.libelle || '').substring(0, 28)}</p>
                    </div>
                    <span className="text-sm font-medium text-blue-600">{t('gl.movementsCount', { count: String(acc.nombreEcritures) })}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Soldes significatifs — réel (buckets sur soldes de clôture) */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-gray-900">{t('gl.significantBalances')}</h4>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('gl.over10M')}</span>
                  <span className="text-sm font-medium text-green-600">{t('gl.accountsCount', { count: String(dashboardStats.plus10M) })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('gl.over5M')}</span>
                  <span className="text-sm font-medium text-blue-600">{t('gl.accountsCount', { count: String(dashboardStats.plus5M) })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('gl.over1M')}</span>
                  <span className="text-sm font-medium text-gray-600">{t('gl.accountsCount', { count: String(dashboardStats.plus1M) })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vue Comptes Détaillés */}
      {activeView === 'accounts' && (
        <div className="space-y-0 w-full">

          {/* Sélecteur de compte */}
          <div className="bg-white p-4 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-gray-900">{t('gl.accountSelection')}</h3>
              <select 
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg font-mono"
              >
                <option value="">{t('gl.selectAnAccount')}</option>
                {accountsData.map((acc) => (
                  <option key={acc.compte} value={acc.compte}>
                    {acc.compte} - {acc.libelle} ({t('gl.entriesCount', { count: String(acc.nombreEcritures) })})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Détail du compte sélectionné */}
          {selectedAccount && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {(() => {
                const account = accountsData.find(acc => acc.compte === selectedAccount);
                if (!account) return null;
                
                return (
                  <>
                    <div className="p-3 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {t('gl.accountNo', { account: account.compte })}
                          </h3>
                          <p className="text-gray-600">{account.libelle}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <SpaceLinkBadge
                            context={{
                              anchorType: 'account_period', anchorLabel: t('gl.anchorLabel', { account: account.compte, label: account.libelle }),
                              accountCode: account.compte, initialGap: Math.abs(account.soldeFermeture),
                              title: t('gl.anomalyTitle', { account: account.compte }),
                              problem: t('gl.anomalyProblem', { account: account.compte, label: account.libelle, balance: fmt(account.soldeFermeture) }),
                              objective: t('gl.anomalyObjective', { account: account.compte }),
                            }}
                            match={{ accountCode: account.compte }}
                          />
                          <div className="text-right">
                            <div className="text-lg font-bold text-[var(--color-primary)]">
                              {fmt(account.soldeFermeture)}
                            </div>
                            <div className="text-sm text-gray-700">{t('gl.currentBalance')}</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Résumé du compte */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-lg font-bold text-blue-600">
                            {fmt(account.soldeOuverture)}
                          </div>
                          <div className="text-xs text-gray-600">{t('gl.openingBalance')}</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-lg font-bold text-green-600">
                            {fmt(account.totalDebit)}
                          </div>
                          <div className="text-xs text-gray-600">{t('gl.totalDebit')}</div>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <div className="text-lg font-bold text-orange-600">
                            {fmt(account.totalCredit)}
                          </div>
                          <div className="text-xs text-gray-600">{t('gl.totalCredit')}</div>
                        </div>
                        <div className="text-center p-3 bg-primary-50 rounded-lg">
                          <div className="text-lg font-bold text-primary-600">{account.nombreEcritures}</div>
                          <div className="text-xs text-gray-600">{t('gl.entryCount')}</div>
                        </div>
                      </div>
                    </div>

                    {/* Journal des écritures */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('common.date')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('gl.documentNo')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('accounting.label')}</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">{t('accounting.debit')}</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">{t('accounting.credit')}</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">{t('accounting.balance')}</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">{t('gl.center')}</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">{t('gl.actions')}</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {account.entries.map((entry, index) => (
                            <tr key={entry.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(entry.date).toLocaleDateString('fr-FR')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                                {entry.piece}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">{entry.libelle}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-right text-blue-600">
                                {entry.debit > 0 ? fmt(entry.debit) : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-right text-green-600">
                                {entry.credit > 0 ? fmt(entry.credit) : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-right font-medium text-gray-900">
                                {fmt(entry.solde)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600">
                                {entry.centreCout || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <button className="text-blue-600 hover:text-blue-900" title={t('gl.viewDetail')} aria-label={t('gl.viewDetails')}>
                                  <Eye className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Vue Grand Livre */}
      {activeView === 'general-ledger' && (
        <div className="w-full">
          <div className="bg-white">
            <div className="p-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h3 className="text-lg font-semibold text-gray-900">{t('gl.accountsLedger')}</h3>

                  {/* Dropdown Type de Grand Livre */}
                  <select
                    value={ledgerType}
                    onChange={(e) => setLedgerType(e.target.value as typeof ledgerType)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                  >
                    <option value="general">{t('gl.ledgerTypeGeneral')}</option>
                    <option value="account">{t('gl.ledgerTypeAccount')}</option>
                    <option value="journal">{t('gl.ledgerTypeJournal')}</option>
                    <option value="auxiliary">{t('gl.ledgerTypeAuxiliary')}</option>
                    <option value="summary">{t('gl.ledgerTypeSummary')}</option>
                  </select>

                  {/* Boutons de mode d'affichage */}
                  <div className="flex items-center bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setLedgerViewMode('detailed')}
                      className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                        ledgerViewMode === 'detailed'
                          ? 'bg-white text-[var(--color-primary)] shadow-sm font-medium'
                          : 'text-gray-600 hover:bg-white/50'
                      }`}
                      title={t('gl.detailedViewTitle')}
                    >
                      <FileText className="w-4 h-4 mr-1.5 inline" />
                      {t('gl.detailed')}
                    </button>
                    <button
                      onClick={() => setLedgerViewMode('tree')}
                      className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                        ledgerViewMode === 'tree'
                          ? 'bg-white text-[var(--color-primary)] shadow-sm font-medium'
                          : 'text-gray-600 hover:bg-white/50'
                      }`}
                      title={t('gl.treeViewTitle')}
                    >
                      <Layers className="w-4 h-4 mr-1.5 inline" />
                      {t('gl.tree')}
                    </button>
                    <button
                      onClick={() => setLedgerViewMode('list')}
                      className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                        ledgerViewMode === 'list'
                          ? 'bg-white text-[var(--color-primary)] shadow-sm font-medium'
                          : 'text-gray-600 hover:bg-white/50'
                      }`}
                      title={t('gl.listViewTitle')}
                    >
                      <List className="w-4 h-4 mr-1.5 inline" />
                      {t('gl.list')}
                    </button>
                  </div>

                  {/* Boutons d'extension/rétraction globale */}
                  {ledgerViewMode === 'detailed' && (
                    <div className="flex items-center space-x-2 ml-4 border-l pl-4">
                      <button
                        onClick={() => {
                          const allCodes = new Set<string>();
                          accountsData.forEach(acc => allCodes.add(acc.compte));
                          setExpandedAccounts(allCodes);
                        }}
                        className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                        title={t('gl.expandAll')}
                      >
                        <ChevronDown className="w-4 h-4 mr-1 inline" />
                        {t('gl.expandAll')}
                      </button>
                      <button
                        onClick={() => setExpandedAccounts(new Set())}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-all"
                        title={t('gl.collapseAll')}
                      >
                        <ChevronRight className="w-4 h-4 mr-1 inline" />
                        {t('gl.collapseAll')}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <select
                    value={selectedClasse}
                    onChange={(e) => setSelectedClasse(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                  >
                    <option value="all">{t('gl.allAccounts')}</option>
                    <option value="1">{t('gl.classFilter1')}</option>
                    <option value="2">{t('gl.classFilter2')}</option>
                    <option value="3">{t('gl.classFilter3')}</option>
                    <option value="4">{t('gl.classFilter4')}</option>
                    <option value="5">{t('gl.classFilter5')}</option>
                    <option value="6">{t('gl.classFilter6')}</option>
                    <option value="7">{t('gl.classFilter7')}</option>
                  </select>
                  <select
                    value={soldeMode}
                    onChange={(e) => setSoldeMode(e.target.value as 'progressif' | 'dc')}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                    title={t('gl.balanceDisplay')}
                  >
                    <option value="progressif">{t('gl.runningBalance')}</option>
                    <option value="dc">{t('gl.debitCreditBalance')}</option>
                  </select>
                  <button className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                    <Calendar className="w-4 h-4 mr-1 inline" />
                    {t('gl.period')}
                  </button>
                </div>
              </div>
            </div>


            {/* Contenu conditionnel selon le mode d'affichage */}
            <div className="p-2">
              {(() => {
                // Fonction pour récupérer les données selon le type de grand livre
                const getLedgerData = () => {
                  // Build ledger view data from real accountsData (loaded via useQuery from adapter)
                  const getClasseLabel = (code: string): string => {
                    const c = code.charAt(0);
                    const labels: Record<string, string> = {
                      '1': t('gl.classShort1'),
                      '2': t('gl.classShort2'),
                      '3': t('gl.classShort3'),
                      '4': t('gl.classShort4'),
                      '5': t('gl.classShort5'),
                      '6': t('gl.classShort6'),
                      '7': t('gl.classShort7'),
                      '8': t('gl.classShort8'),
                      '9': t('gl.classShort9'),
                    };
                    return labels[c] || t('gl.other');
                  };

                  const baseData = accountsData.map(acc => {
                    const soldeNet = acc.totalDebit - acc.totalCredit;
                    return {
                      code: acc.compte,
                      libelle: acc.libelle,
                      classe: getClasseLabel(acc.compte),
                      solde: {
                        debit: soldeNet >= 0 ? soldeNet : 0,
                        credit: soldeNet < 0 ? Math.abs(soldeNet) : 0,
                      },
                      mouvements: acc.entries.map((e) => ({
                        date: e.date,
                        piece: e.piece,
                        libelle: e.libelle,
                        journal: e.journal || '',
                        contrepartie: e.contrepartie || '',
                        lettrage: '',
                        debit: e.debit,
                        credit: e.credit,
                        solde: e.solde,
                      })),
                    };
                  });

                  switch (ledgerType) {
                    case 'account':
                      // Grand Livre par compte — le compte réellement sélectionné (plus de
                      // baseData[0] "Client A SARL" en dur). À défaut de sélection : tout.
                      return selectedAccount ? baseData.filter(c => c.code === selectedAccount) : baseData;

                    case 'journal':
                      // Grand Livre par journal — tous les mouvements (l'ancien filtre sur les
                      // codes 'VTE'/'BQ1' en dur ne correspondait à aucun journal réel du tenant).
                      return baseData;

                    case 'auxiliary':
                      // Grand Livre auxiliaire - Seulement les comptes de tiers
                      return baseData.filter(compte => compte.code.startsWith('4'));

                    case 'summary':
                      // Grand Livre cumulé/récapitulatif - Seulement les totaux sans détails
                      return baseData.map(compte => ({
                        ...compte,
                        mouvements: [] // Pas de détails des mouvements
                      }));

                    case 'general':
                    default:
                      // Grand Livre général - Tous les comptes et écritures
                      return baseData;
                  }
                };

                const currentData = getLedgerData();

                // Mode Détaillé
                if (ledgerViewMode === 'detailed') {
                  return (
                    <div className="space-y-6">
                      {ledgerType === 'summary' ? (
                        // Mode récapitulatif - Affichage des totaux uniquement
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-[600px] flex flex-col">
                          <div className="overflow-auto flex-1">
                            <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">{t('accounting.account')}</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">{t('accounting.label')}</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">{t('gl.class')}</th>
                                <th className="px-4 py-3 text-right font-semibold text-gray-700">{t('gl.totalDebit')}</th>
                                <th className="px-4 py-3 text-right font-semibold text-gray-700">{t('gl.totalCredit')}</th>
                                <th className="px-4 py-3 text-right font-semibold text-gray-700">{t('accounting.balance')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentData.map((compte, index) => (
                                <tr key={index} className="hover:bg-gray-50 border-b">
                                  <td className="px-4 py-3 font-mono text-[var(--color-primary)] font-bold">{compte.code}</td>
                                  <td className="px-4 py-3 text-gray-900">{compte.libelle}</td>
                                  <td className="px-4 py-3 text-gray-600 text-sm">{compte.classe}</td>
                                  <td className="px-4 py-3 text-right text-red-600 font-medium">
                                    {fmt(compte.solde.debit)}
                                  </td>
                                  <td className="px-4 py-3 text-right text-green-600 font-medium">
                                    {fmt(compte.solde.credit)}
                                  </td>
                                  <td className="px-4 py-3 text-right font-bold text-gray-900">
                                    {fmt(money(compte.solde.debit).subtract(money(compte.solde.credit)).toNumber())}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          </div>
                        </div>
                      ) : (
                        // Mode détaillé avec mouvements
                        currentData.map((compte, index) => {
                          const isExpanded = expandedAccounts.has(compte.code);
                          const toggleExpand = () => {
                            const newExpanded = new Set(expandedAccounts);
                            if (isExpanded) {
                              newExpanded.delete(compte.code);
                            } else {
                              newExpanded.add(compte.code);
                            }
                            setExpandedAccounts(newExpanded);
                          };

                          return (
                          <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                            {/* En-tête du compte */}
                            <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-text-tertiary)] text-white p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <button
                                    onClick={toggleExpand}
                                    className="p-1 hover:bg-white/20 rounded transition-colors"
                                    title={isExpanded ? t('gl.collapse') : t('gl.expand')} aria-label={t('gl.openMenu')}>
                                    {isExpanded ? (
                                      <ChevronDown className="w-5 h-5" />
                                    ) : (
                                      <ChevronRight className="w-5 h-5" />
                                    )}
                                  </button>
                                  <div className="text-lg font-mono font-bold">{compte.code}</div>
                                  <div>
                                    <div className="text-lg font-semibold">{compte.libelle}</div>
                                    <div className="text-sm text-white/80">{compte.classe}</div>
                                    {ledgerType !== 'general' && (
                                      <div className="text-xs text-white/60 mt-1">
                                        {ledgerType === 'account' && t('gl.viewByAccount')}
                                        {ledgerType === 'journal' && t('gl.viewByJournal')}
                                        {ledgerType === 'auxiliary' && t('gl.viewAuxiliary')}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                  <div className="text-right">
                                    <div className="text-sm text-white/80">{t('gl.currentBalance')}</div>
                                    <div className="text-lg font-bold">
                                      {fmt(money(compte.solde.debit).subtract(money(compte.solde.credit)).toNumber())}
                                    </div>
                                    <div className="text-sm text-white/80">
                                      {compte.solde.debit > compte.solde.credit ? t('gl.debitor') : t('gl.creditor')}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Tableau des mouvements */}
                            {isExpanded && compte.mouvements.length > 0 && (
                              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs">{t('common.date')}</th>
                                      <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs">{t('gl.documentNo')}</th>
                                      <th className="px-4 py-3 text-left font-semibold text-gray-700 text-xs">{t('accounting.label')}</th>
                                      <th className="px-2 py-3 text-center font-semibold text-gray-700 text-xs">{t('accounting.journal')}</th>
                                      <th className="px-3 py-3 text-center font-semibold text-gray-700 text-xs">{t('gl.counterpart')}</th>
                                      <th className="px-2 py-3 text-center font-semibold text-gray-700 text-xs">{t('thirdParty.reconciliation')}</th>
                                      <th className="px-3 py-3 text-right font-semibold text-gray-700 text-xs">{t('accounting.debit')}</th>
                                      <th className="px-3 py-3 text-right font-semibold text-gray-700 text-xs">{t('accounting.credit')}</th>
                                      {soldeMode === 'progressif' ? (
                                        <th className="px-3 py-3 text-right font-semibold text-gray-700 text-xs">{t('gl.runningBalance')}</th>
                                      ) : (
                                        <>
                                          <th className="px-3 py-3 text-right font-semibold text-gray-700 text-xs">{t('gl.debitBalanceCol')}</th>
                                          <th className="px-3 py-3 text-right font-semibold text-gray-700 text-xs">{t('gl.creditBalanceCol')}</th>
                                        </>
                                      )}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {compte.mouvements.map((mouvement, mvtIndex) => (
                                      <tr key={mvtIndex} className="hover:bg-gray-50 border-b">
                                        <td className="px-3 py-2 text-gray-600 text-xs">
                                          {new Date(mouvement.date).toLocaleDateString('fr-FR')}
                                        </td>
                                        <td className="px-3 py-2 text-gray-800 font-mono text-xs">{mouvement.piece}</td>
                                        <td className="px-4 py-2 text-gray-900 text-xs">{mouvement.libelle}</td>
                                        <td className="px-2 py-2 text-center text-xs">
                                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono">
                                            {mouvement.journal}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 text-center font-mono text-xs text-gray-600">{mouvement.contrepartie}</td>
                                        <td className="px-2 py-2 text-center text-xs">
                                          {mouvement.lettrage ? (
                                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-mono">
                                              {mouvement.lettrage}
                                            </span>
                                          ) : (
                                            <span className="text-gray-700">-</span>
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-right text-red-600 font-medium text-xs">
                                          {mouvement.debit > 0 ? fmt(mouvement.debit) : '-'}
                                        </td>
                                        <td className="px-3 py-2 text-right text-green-600 font-medium text-xs">
                                          {mouvement.credit > 0 ? fmt(mouvement.credit) : '-'}
                                        </td>
                                        {soldeMode === 'progressif' ? (
                                          <td className="px-3 py-2 text-right font-semibold text-gray-900 text-xs">
                                            {fmt(mouvement.solde)}
                                          </td>
                                        ) : (
                                          <>
                                            <td className="px-3 py-2 text-right font-semibold text-red-700 text-xs">
                                              {mouvement.solde > 0 ? fmt(mouvement.solde) : '-'}
                                            </td>
                                            <td className="px-3 py-2 text-right font-semibold text-green-700 text-xs">
                                              {mouvement.solde < 0 ? fmt(Math.abs(mouvement.solde)) : '-'}
                                            </td>
                                          </>
                                        )}
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot className="bg-gray-50">
                                    <tr>
                                      <td colSpan={6} className="px-3 py-3 font-semibold text-gray-700 text-xs">{t('gl.totals')}</td>
                                      <td className="px-3 py-3 text-right font-bold text-red-600 text-xs">
                                        {fmt(compte.mouvements.reduce((sum, m) => sum + m.debit, 0))}
                                      </td>
                                      <td className="px-3 py-3 text-right font-bold text-green-600 text-xs">
                                        {fmt(compte.mouvements.reduce((sum, m) => sum + m.credit, 0))}
                                      </td>
                                      <td className="px-3 py-3 text-right font-bold text-gray-900 text-xs">
                                        {fmt(money(compte.solde.debit).subtract(money(compte.solde.credit)).toNumber())}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                        })
                      )}
                    </div>
                  );
                }

                return null; // Placeholder pour les autres modes
              })()}

              {/* Les autres modes d'affichage restent inchangés pour l'instant */}
              {ledgerViewMode === 'detailed' && null /* Déjà géré au-dessus */}
              {ledgerViewMode === 'detailed' && (
                <div style={{display: 'none'}}> {/* Legacy detailed view - uses real data */}
                  {accountsData.map((acc) => {
                    const soldeNet = acc.totalDebit - acc.totalCredit;
                    const compte = {
                      code: acc.compte,
                      libelle: acc.libelle,
                      classe: '',
                      solde: {
                        debit: soldeNet >= 0 ? soldeNet : 0,
                        credit: soldeNet < 0 ? Math.abs(soldeNet) : 0,
                      },
                      mouvements: acc.entries.map(e => ({
                        date: e.date,
                        piece: e.piece,
                        libelle: e.libelle,
                        journal: '',
                        contrepartie: '',
                        lettrage: '',
                        debit: e.debit,
                        credit: e.credit,
                        solde: e.solde,
                      })),
                    };
                    return compte;
                  }).map((compte, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* En-tête du compte */}
                      <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-text-tertiary)] text-white p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="text-lg font-mono font-bold">{compte.code}</div>
                            <div>
                              <div className="text-lg font-semibold">{compte.libelle}</div>
                              <div className="text-sm text-white/80">{compte.classe}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-white/80">{t('gl.currentBalance')}</div>
                            <div className="text-lg font-bold">
                              {fmt(money(compte.solde.debit).subtract(money(compte.solde.credit)).toNumber())}
                            </div>
                            <div className="text-sm text-white/80">
                              {compte.solde.debit > compte.solde.credit ? t('gl.debitor') : t('gl.creditor')}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Tableau des mouvements */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs">{t('common.date')}</th>
                              <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs">{t('gl.documentNo')}</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700 text-xs">{t('accounting.label')}</th>
                              <th className="px-2 py-3 text-center font-semibold text-gray-700 text-xs">{t('accounting.journal')}</th>
                              <th className="px-3 py-3 text-center font-semibold text-gray-700 text-xs">{t('gl.counterpart')}</th>
                              <th className="px-2 py-3 text-center font-semibold text-gray-700 text-xs">{t('thirdParty.reconciliation')}</th>
                              <th className="px-3 py-3 text-right font-semibold text-gray-700 text-xs">{t('accounting.debit')}</th>
                              <th className="px-3 py-3 text-right font-semibold text-gray-700 text-xs">{t('accounting.credit')}</th>
                              <th className="px-3 py-3 text-right font-semibold text-gray-700 text-xs">{t('accounting.balance')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {compte.mouvements.map((mouvement, mvtIndex) => (
                              <tr key={mvtIndex} className="hover:bg-gray-50 border-b">
                                <td className="px-3 py-2 text-gray-600 text-xs">
                                  {new Date(mouvement.date).toLocaleDateString('fr-FR')}
                                </td>
                                <td className="px-3 py-2 text-gray-800 font-mono text-xs">{mouvement.piece}</td>
                                <td className="px-4 py-2 text-gray-900 text-xs">{mouvement.libelle}</td>
                                <td className="px-2 py-2 text-center text-xs">
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono">
                                    {mouvement.journal}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-center font-mono text-xs text-gray-600">{mouvement.contrepartie}</td>
                                <td className="px-2 py-2 text-center text-xs">
                                  {mouvement.lettrage ? (
                                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-mono">
                                      {mouvement.lettrage}
                                    </span>
                                  ) : (
                                    <span className="text-gray-700">-</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right text-red-600 font-medium text-xs">
                                  {mouvement.debit > 0 ? fmt(mouvement.debit) : '-'}
                                </td>
                                <td className="px-3 py-2 text-right text-green-600 font-medium text-xs">
                                  {mouvement.credit > 0 ? fmt(mouvement.credit) : '-'}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold text-gray-900 text-xs">
                                  {fmt(mouvement.solde)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-50">
                            <tr>
                              <td colSpan={6} className="px-3 py-3 font-semibold text-gray-700 text-xs">{t('gl.totals')}</td>
                              <td className="px-3 py-3 text-right font-bold text-red-600 text-xs">
                                {fmt(compte.mouvements.reduce((sum, m) => sum + m.debit, 0))}
                              </td>
                              <td className="px-3 py-3 text-right font-bold text-green-600 text-xs">
                                {fmt(compte.mouvements.reduce((sum, m) => sum + m.credit, 0))}
                              </td>
                              <td className="px-3 py-3 text-right font-bold text-gray-900 text-xs">
                                {fmt(money(compte.solde.debit).subtract(money(compte.solde.credit)).toNumber())}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Mode Arborescence */}
              {ledgerViewMode === 'tree' && (
                <div className="space-y-4">
                  <div className="bg-white border border-gray-200 rounded-lg h-[600px] overflow-y-auto">
                    <div className="space-y-1">
                      {(() => {
                        // Group accounts by class (first digit)
                        const classeColors: Record<string, { bg: string; text: string }> = {
                          '1': { bg: 'bg-primary-100', text: 'text-primary-700' },
                          '2': { bg: 'bg-primary-100', text: 'text-primary-700' },
                          '3': { bg: 'bg-primary-100', text: 'text-primary-700' },
                          '4': { bg: 'bg-blue-100', text: 'text-blue-700' },
                          '5': { bg: 'bg-green-100', text: 'text-green-700' },
                          '6': { bg: 'bg-red-100', text: 'text-red-700' },
                          '7': { bg: 'bg-primary-100', text: 'text-primary-700' },
                          '8': { bg: 'bg-gray-100', text: 'text-gray-700' },
                          '9': { bg: 'bg-amber-100', text: 'text-amber-700' },
                        };
                        const classeLabels: Record<string, string> = {
                          '1': t('gl.classShort1'),
                          '2': t('gl.classShort2'),
                          '3': t('gl.classShort3'),
                          '4': t('gl.classShort4'),
                          '5': t('gl.classShort5'),
                          '6': t('gl.classShort6'),
                          '7': t('gl.classShort7'),
                          '8': t('gl.classShort8'),
                          '9': t('gl.classShort9'),
                        };
                        const grouped = new Map<string, typeof accountsData>();
                        accountsData.forEach(acc => {
                          const cls = acc.compte.charAt(0);
                          if (!grouped.has(cls)) grouped.set(cls, []);
                          grouped.get(cls)!.push(acc);
                        });

                        if (grouped.size === 0) {
                          return (
                            <div className="p-8 text-center text-sm text-gray-500">
                              {t('gl.noAccountsToShow')}
                            </div>
                          );
                        }

                        return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([cls, accs]) => {
                          const colors = classeColors[cls] || { bg: 'bg-gray-100', text: 'text-gray-700' };
                          const totalSolde = accs.reduce((s, a) => s + a.totalDebit - a.totalCredit, 0);
                          return (
                            <div key={cls} className="border-b border-gray-100 last:border-b-0">
                              <div className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer">
                                <div className="flex items-center space-x-3">
                                  <ChevronRight className="w-4 h-4 text-gray-700" />
                                  <div className={`w-8 h-8 ${colors.bg} ${colors.text} rounded-full flex items-center justify-center text-sm font-bold`}>{cls}</div>
                                  <div>
                                    <div className="font-semibold text-gray-900">{classeLabels[cls] || t('gl.classN', { n: cls })}</div>
                                    <div className="text-sm text-gray-700">{t('gl.accountsCount', { count: String(accs.length) })}</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-gray-900">{fmt(Math.abs(totalSolde))}</div>
                                  <div className="text-sm text-gray-700">{totalSolde >= 0 ? t('gl.debitor') : t('gl.creditor')}</div>
                                </div>
                              </div>
                              <div className="pl-10 bg-gray-50/50">
                                {accs.map(acc => {
                                  const solde = acc.totalDebit - acc.totalCredit;
                                  return (
                                    <div key={acc.compte} className="pl-8">
                                      <div className="flex items-center justify-between p-2 hover:bg-gray-100 cursor-pointer">
                                        <div className="flex items-center space-x-3">
                                          <div className="text-xs font-mono text-gray-600">{acc.compte}</div>
                                          <div className="text-sm text-gray-900">{acc.libelle}</div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-sm font-medium">{fmt(Math.abs(solde))}</div>
                                          <div className={`text-xs ${solde >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {solde >= 0 ? t('gl.debitor') : t('gl.creditor')}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* Mode Liste */}
              {ledgerViewMode === 'list' && (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-[600px] flex flex-col">
                  <div className="overflow-auto flex-1">
                    <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs">{t('accounting.account')}</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 text-xs">{t('accounting.label')}</th>
                        <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs">{t('gl.class')}</th>
                        <th className="px-3 py-3 text-right font-semibold text-gray-700 text-xs">{t('gl.totalDebit')}</th>
                        <th className="px-3 py-3 text-right font-semibold text-gray-700 text-xs">{t('gl.totalCredit')}</th>
                        <th className="px-3 py-3 text-right font-semibold text-gray-700 text-xs">{t('accounting.balance')}</th>
                        <th className="px-2 py-3 text-center font-semibold text-gray-700 text-xs">{t('gl.movementsAbbr')}</th>
                        <th className="px-3 py-3 text-center font-semibold text-gray-700 text-xs">{t('gl.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountsData.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-3 py-8 text-center text-sm text-gray-500">{t('gl.noAccountsToShow')}</td>
                        </tr>
                      ) : accountsData.map((acc) => {
                        const solde = acc.totalDebit - acc.totalCredit;
                        const classeNum = acc.compte.charAt(0);
                        return (
                          <tr key={acc.compte} className="hover:bg-gray-50 border-b">
                            <td className="px-3 py-2 font-mono text-[var(--color-primary)] font-bold text-xs">{acc.compte}</td>
                            <td className="px-4 py-2 text-gray-900 text-xs">{acc.libelle}</td>
                            <td className="px-3 py-2 text-gray-600 text-xs">{t('gl.classN', { n: classeNum })}</td>
                            <td className="px-3 py-2 text-right text-red-600 font-medium text-xs">{fmt(acc.totalDebit)}</td>
                            <td className="px-3 py-2 text-right text-green-600 font-medium text-xs">{fmt(acc.totalCredit)}</td>
                            <td className="px-3 py-2 text-right font-bold text-gray-900 text-xs">{fmt(solde)}</td>
                            <td className="px-2 py-2 text-center">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">{acc.nombreEcritures}</span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <button className="p-1 text-blue-600 hover:text-blue-900" title={t('gl.viewDetail')} aria-label={t('gl.viewDetails')}>
                                  <Eye className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={3} className="px-3 py-3 font-bold text-gray-900 text-xs">{t('gl.grandTotals')}</td>
                        <td className="px-3 py-3 text-right font-bold text-red-600 text-xs">
                          {fmt(accountsData.reduce((s, a) => s + a.totalDebit, 0))}
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-green-600 text-xs">
                          {fmt(accountsData.reduce((s, a) => s + a.totalCredit, 0))}
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-gray-900 text-xs">
                          {fmt(accountsData.reduce((s, a) => s + a.totalDebit - a.totalCredit, 0))}
                        </td>
                        <td className="px-2 py-3 text-center font-bold text-xs">
                          {accountsData.reduce((s, a) => s + a.nombreEcritures, 0)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contrôle d'équilibre */}
          <div className="bg-white rounded-lg p-4 border-2 border-[var(--color-primary)] mt-6">
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-3 flex items-center">
              <Calculator className="w-5 h-5 mr-2 text-[var(--color-primary)]" />
              {t('gl.balanceCheck')}
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-[var(--color-text-tertiary)]">{t('gl.openingBalanceCheck')}</p>
                <div className="mt-2">
                  <p className="text-sm">{t('gl.debitLabel')} <span className="font-bold">{fmt(accountsData.reduce((s, a) => s + a.soldeOuverture, 0))}</span></p>
                  <p className="text-sm">{t('gl.creditLabel')} <span className="font-bold">0</span></p>
                </div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-sm text-[var(--color-text-tertiary)]">{t('gl.periodMovements')}</p>
                <div className="mt-2">
                  <p className="text-sm">{t('gl.debitLabel')} <span className="font-bold text-red-600">{fmt(accountsData.reduce((s, a) => s + a.totalDebit, 0))}</span></p>
                  <p className="text-sm">{t('gl.creditLabel')} <span className="font-bold text-green-600">{fmt(accountsData.reduce((s, a) => s + a.totalCredit, 0))}</span></p>
                </div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-[var(--color-text-tertiary)]">{t('gl.periodEndBalances')}</p>
                <div className="mt-2">
                  <p className="text-sm">{t('gl.debitorLabel')} <span className="font-bold text-red-600">{fmt(accountsData.filter(a => a.soldeFermeture > 0).reduce((s, a) => s + a.soldeFermeture, 0))}</span></p>
                  <p className="text-sm">{t('gl.creditorLabel')} <span className="font-bold text-green-600">{fmt(Math.abs(accountsData.filter(a => a.soldeFermeture < 0).reduce((s, a) => s + a.soldeFermeture, 0)))}</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vue Analyse IA Avancée */}
      {activeView === 'analysis' && (
        <div className="space-y-0 w-full">

          {/* Tableau de bord IA */}
          <div className="bg-gradient-to-r from-primary-50 to-primary-50 border-b border-primary-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-primary-900 flex items-center">
                <Brain className="w-6 h-6 mr-3" />
                {t('gl.accountingAi')}
              </h3>
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 bg-primary-200 text-primary-800 text-sm rounded-full font-medium">
                  {t('gl.heuristicAnalysis')}
                </span>
                <button
                  onClick={() => setShowAISettingsModal(true)}
                  className="p-2 bg-white border border-primary-300 rounded-lg hover:bg-primary-50"
                  title={t('gl.aiSettings')}
                >
                  <Settings className="h-4 w-4 text-primary-600" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border border-primary-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-primary-900">{t('gl.anomalyDetectionShort')}</h4>
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                </div>
                <div className="text-lg font-bold text-primary-900">{aiMetrics?.anomalies.length ?? 0}</div>
                <div className="text-xs text-primary-600">{t('gl.outOfEntries', { count: (aiMetrics?.totalEntries ?? 0).toLocaleString('fr-FR') })}</div>
                <div className="mt-2 text-xs text-orange-600">{t('gl.unusualAmountsHint')}</div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-primary-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-primary-900">{t('gl.identifiedPatterns')}</h4>
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div className="text-lg font-bold text-primary-900">{aiMetrics?.patterns ?? 0}</div>
                <div className="text-xs text-primary-600">{t('gl.recurringLabels')}</div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-primary-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-primary-900">{t('gl.complianceScore')}</h4>
                  <Award className="h-5 w-5 text-green-500" />
                </div>
                <div className="text-lg font-bold text-primary-900">{(aiMetrics?.conformite ?? 100).toFixed(1)}%</div>
                <div className="text-xs text-primary-600">{t('gl.balancedEntries')}</div>
                <div className={`mt-2 text-xs ${(aiMetrics?.conformite ?? 100) >= 99 ? 'text-green-600' : 'text-orange-600'}`}>
                  {(aiMetrics?.conformite ?? 100) >= 99 ? t('gl.excellentLevel') : t('gl.toFixCount', { count: String(aiMetrics?.unbalanced ?? 0) })}
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-primary-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-primary-900">{t('gl.entriesToBalance')}</h4>
                  <Target className="h-5 w-5 text-blue-500" />
                </div>
                <div className="text-lg font-bold text-primary-900">{aiMetrics?.unbalanced ?? 0}</div>
                <div className="text-xs text-primary-600">{t('gl.debitNotEqualCredit')}</div>
                <div className="mt-2 text-xs text-blue-600">{(aiMetrics?.unbalanced ?? 0) === 0 ? t('gl.allBalanced') : t('gl.toCheck')}</div>
              </div>
            </div>
          </div>

          {/* Détection d'anomalies en temps réel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-orange-500" />
                {t('gl.detectedAnomalies')}
              </h4>

              <div className="space-y-4">
                {(!aiMetrics || aiMetrics.anomalies.length === 0) ? (
                  <div className="border border-green-200 rounded-lg p-4 bg-green-50 text-sm text-green-800">
                    {t('gl.noUnusualAmount')}
                  </div>
                ) : (
                  aiMetrics.anomalies.slice(0, 5).map((a, i) => (
                    <div key={i} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-sm font-medium text-orange-900">{t('gl.unusualAmount')}</span>
                            <span className="px-2 py-1 bg-orange-200 text-orange-800 text-xs rounded-full">
                              {a.factor >= 10 ? t('gl.critical') : t('gl.warning')}
                            </span>
                          </div>
                          <div className="text-sm text-orange-800">
                            {t('gl.anomalyLine', { account: a.compte, amount: fmt(a.montant), factor: a.factor.toFixed(1) })}
                          </div>
                          <div className="text-xs text-orange-600 mt-1">
                            {a.libelle ? `${a.libelle} • ` : ''}{new Date(a.date).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                        <button
                          onClick={() => { setSelectedAccount(a.compte); setActiveView('accounts'); }}
                          className="text-orange-600 hover:text-orange-800"
                          title={t('gl.viewAccount')}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}

                <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium text-green-900">{t('gl.complianceBalance')}</span>
                        <span className="px-2 py-1 bg-green-200 text-green-800 text-xs rounded-full">{t('gl.real')}</span>
                      </div>
                      <div className="text-sm text-green-800">
                        {t('gl.balancedRatio', { pct: (aiMetrics?.conformite ?? 100).toFixed(1), balanced: (aiMetrics?.balanced ?? 0).toLocaleString('fr-FR'), total: (aiMetrics?.totalEntries ?? 0).toLocaleString('fr-FR') })}
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        {t('gl.entriesToFix', { count: String(aiMetrics?.unbalanced ?? 0) })}
                      </div>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Synthèse réelle (remplace les ex-« insights prédictifs » inventés) */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-primary-500" />
                {t('gl.accountingSummary')}
              </h4>

              <div className="space-y-4">
                <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">{t('gl.mostActiveAccount')}</span>
                  </div>
                  <div className="text-sm text-blue-800">
                    {dashboardStats.topMouvements[0]
                      ? `${dashboardStats.topMouvements[0].compte} — ${dashboardStats.topMouvements[0].libelle}`
                      : '—'}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    {dashboardStats.topMouvements[0]
                      ? t('gl.entriesCount', { count: dashboardStats.topMouvements[0].nombreEcritures.toLocaleString('fr-FR') })
                      : ''}
                  </div>
                </div>

                <div className="border border-primary-200 rounded-lg p-4 bg-primary-50">
                  <div className="flex items-center space-x-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-primary-600" />
                    <span className="text-sm font-medium text-primary-900">{t('gl.periodMovementsLabel')}</span>
                  </div>
                  <div className="text-sm text-primary-800">
                    {t('gl.debitCreditSummary', { debit: fmt(accountsData.reduce((s, a) => s + a.totalDebit, 0)), credit: fmt(accountsData.reduce((s, a) => s + a.totalCredit, 0)) })}
                  </div>
                  <div className="text-xs text-primary-600 mt-1">
                    {t('gl.entriesInPeriod', { count: indicators.totalEcritures.toLocaleString('fr-FR') })}
                  </div>
                </div>

                <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">{t('gl.dataQuality')}</span>
                  </div>
                  <div className="text-sm text-green-800">
                    {t('gl.balancedPct', { pct: (aiMetrics?.conformite ?? 100).toFixed(1) })}
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    {t('gl.accountsWithoutMovement', { count: dashboardStats.sansMouvement.toLocaleString('fr-FR') })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Analyse comparative intelligente */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-primary-500" />
              {t('gl.comparativeAnalysis')}
            </h4>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h5 className="font-medium text-gray-900 mb-3">{t('gl.balanceEvolutionAL')}</h5>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={evolutionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="periode" />
                    <YAxis tickFormatter={(value) => fmt(value)} />
                    <Tooltip formatter={(value) => [fmt(value as number), '']} />
                    <Legend />
                    <Line type="monotone" dataKey="actif" stroke="#235A6E" strokeWidth={3} name={t('gl.assetsReal')} />
                    <Line type="monotone" dataKey="passif" stroke="#4E7E8D" strokeWidth={3} name={t('gl.liabilitiesReal')} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div>
                <h5 className="font-medium text-gray-900 mb-3">{t('gl.mostActiveAccounts')}</h5>
                <div className="space-y-3">
                  {[...accountsData]
                    .sort((a, b) => b.nombreEcritures - a.nombreEcritures)
                    .slice(0, 6)
                    .map((a) => {
                      const max = accountsData.reduce((m, x) => Math.max(m, x.nombreEcritures), 1);
                      return (
                        <div key={a.compte} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700">
                            <span className="font-mono">{a.compte}</span>{' '}
                            <span className="text-gray-500">{a.libelle.substring(0, 22)}</span>
                          </span>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 h-2 bg-gray-200 rounded-full">
                              <div className="h-2 bg-[var(--color-primary)] rounded-full" style={{ width: `${Math.round((a.nombreEcritures / max) * 100)}%` }}></div>
                            </div>
                            <span className="text-sm font-medium text-gray-700">{a.nombreEcritures}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vue Collaboration Avancée */}
      {activeView === 'collaboration' && (
        <div className="space-y-0 w-full">

          {/* Espaces de travail collaboratifs */}
          <div className="bg-white border-b border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Users className="w-6 h-6 mr-3 text-orange-500" />
                {t('gl.collaborativeWorkspaces')}
              </h3>
              <button
                onClick={() => navigate('/collaboration')}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center space-x-2"
              >
                <Building className="w-4 h-4" />
                <span>{t('gl.openSpace')}</span>
              </button>
            </div>

            {/* Point d'entrée RÉEL vers l'espace collaboratif (discussions, tâches,
                activité) — plus de cartes mock (membres/annotations inventés). */}
            <div className="border border-gray-200 rounded-lg p-6 flex flex-col md:flex-row md:items-center gap-4 bg-gray-50">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: 'var(--color-primary)' }}>
                <Users className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{t('gl.teamCollaborativeSpace')}</h4>
                <p className="text-sm text-gray-600 mt-0.5">
                  {t('gl.collaborationDesc')}
                </p>
              </div>
              <button
                onClick={() => navigate('/collaboration')}
                className="px-5 py-2.5 text-sm font-medium rounded-lg text-white shrink-0"
                style={{ background: 'var(--color-primary)' }}
              >
                {t('gl.openCollaborativeSpace')}
              </button>
            </div>
          </div>

          {/* Workflow de validation collaboratif */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Layers className="w-5 h-5 mr-2 text-blue-500" />
              {t('gl.validationWorkflow')}
            </h4>

            <div className="grid grid-cols-4 gap-4">
              {[
                { status: t('gl.wfToReview'), count: aiMetrics?.workflow.aReviser ?? 0, color: "bg-yellow-100 text-yellow-800", entries: aiMetrics?.workflow.aReviserSample ?? [], hint: t('gl.wfToReviewHint') },
                { status: t('gl.wfInProgress'), count: aiMetrics?.workflow.enCours ?? 0, color: "bg-blue-100 text-blue-800", entries: [] as string[], hint: t('gl.wfInProgressHint') },
                { status: t('gl.wfValidated'), count: aiMetrics?.workflow.valide ?? 0, color: "bg-green-100 text-green-800", entries: aiMetrics?.workflow.valideSample ?? [], hint: t('gl.wfValidatedHint') },
                { status: t('gl.wfArchived'), count: aiMetrics?.workflow.archive ?? 0, color: "bg-gray-100 text-gray-800", entries: [] as string[], hint: t('gl.wfArchivedHint') }
              ].map((column, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h5 className="font-medium text-gray-900">{column.status}</h5>
                      <span className="text-[10px] text-gray-500">{column.hint}</span>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${column.color}`}>
                      {column.count}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {column.entries.map((entry, entryIndex) => (
                      <div key={entryIndex} className="text-xs bg-gray-50 p-2 rounded border hover:bg-gray-100 cursor-pointer">
                        {entry}
                      </div>
                    ))}
                  </div>

                  {column.count > column.entries.length && (
                    <div className="text-xs text-gray-700 mt-2 text-center">
                      {t('gl.othersCount', { count: String(column.count - column.entries.length) })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Vue Analyse Originale Améliorée */}
      {activeView === 'movements' && (
        <div className="space-y-0 w-full">

          {/* Analyse par période */}
          <div className="bg-white p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('gl.periodAnalysis')}</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="periode" />
                <YAxis tickFormatter={(value) => fmt(value)} />
                <Tooltip formatter={(value) => [fmt(value as number), '']} />
                <Legend />
                <Line type="monotone" dataKey="produits" stroke="#15803D" strokeWidth={3} name={t('gl.revenue')} />
                <Line type="monotone" dataKey="charges" stroke="#C0322B" strokeWidth={3} name={t('gl.expenses')} />
                <Line type="monotone" dataKey="actif" stroke="#235A6E" strokeWidth={2} name={t('gl.assets')} />
                <Line type="monotone" dataKey="passif" stroke="#4E7E8D" strokeWidth={2} name={t('gl.liabilities')} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Analyse des comptes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Comptes les plus mouvementés */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h4 className="text-md font-semibold text-gray-900 mb-4">{t('gl.mostActiveAccounts')}</h4>
              <div className="space-y-3">
                {accountsData
                  .sort((a, b) => b.nombreEcritures - a.nombreEcritures)
                  .slice(0, 8)
                  .map((account, index) => (
                    <div key={account.compte} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-mono text-sm font-medium text-gray-900">{account.compte}</div>
                          <div className="text-xs text-gray-700">{account.libelle}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">{account.nombreEcritures}</div>
                        <div className="text-xs text-gray-700">{t('gl.entriesWord')}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Soldes significatifs */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h4 className="text-md font-semibold text-gray-900 mb-4">{t('gl.largestBalances')}</h4>
              <div className="space-y-3">
                {accountsData
                  .sort((a, b) => Math.abs(b.soldeFermeture) - Math.abs(a.soldeFermeture))
                  .slice(0, 8)
                  .map((account, index) => (
                    <div key={account.compte} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-[var(--color-text-secondary)] text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-mono text-sm font-medium text-gray-900">{account.compte}</div>
                          <div className="text-xs text-gray-700">{account.libelle}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${account.soldeFermeture >= 0 ? 'text-blue-600' : 'text-green-600'}`}>
                          {fmt(Math.abs(account.soldeFermeture))}
                        </div>
                        <div className="text-xs text-gray-700">
                          {account.soldeFermeture >= 0 ? t('gl.debitor') : t('gl.creditor')}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Aperçu Avant Impression */}
      {showPrintPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{t('gl.ledgerPreview')}</h3>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600">{t('gl.formatLabel')}</label>
                    <select 
                      value={printConfig.format}
                      onChange={(e) => setPrintConfig({...printConfig, format: e.target.value as 'A4' | 'A3'})}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="A4">A4</option>
                      <option value="A3">A3</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600">{t('gl.orientationLabel')}</label>
                    <select
                      value={printConfig.orientation}
                      onChange={(e) => setPrintConfig({...printConfig, orientation: e.target.value as 'portrait' | 'landscape'})}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="portrait">{t('gl.portrait')}</option>
                      <option value="landscape">{t('gl.landscape')}</option>
                    </select>
                  </div>
                  <button 
                    onClick={() => setShowPrintPreview(false)}
                    className="text-gray-700 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Prévisualisation Grand Livre */}
            <div className={`p-8 bg-white ${printConfig.format === 'A3' ? 'text-sm' : 'text-xs'} ${printConfig.orientation === 'landscape' ? 'landscape-preview' : 'portrait-preview'}`}>

              {/* En-tête professionnel */}
              <div className="mb-8">
                <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4">
                  {/* Logo et informations entreprise */}
                  <div className="flex items-start gap-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-text-secondary)] rounded-lg flex items-center justify-center shadow-lg">
                      <BookOpen className="w-10 h-10 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900"><span className="atlas-brand">Atlas FnA Enterprise</span></h2>
                      <p className="text-sm text-gray-600">123 Business Avenue</p>
                      <p className="text-sm text-gray-600">New York, NY 10001</p>
                      <p className="text-sm text-gray-600">Tel: +1 (555) 123-4567</p>
                      <p className="text-sm text-gray-600">Email: info@atlasfna.com</p>
                    </div>
                  </div>

                  {/* Titre et période */}
                  <div className="text-right">
                    <h1 className="text-lg font-bold text-gray-900 mb-2">GENERAL LEDGER</h1>
                    <p className="text-lg text-gray-700 font-semibold">
                      Period: {new Date(filters.dateDebut).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      {' to '}
                      {new Date(filters.dateFin).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      Generated: {new Date().toLocaleString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    <p className="text-sm text-gray-600">Report ID: GL-{Date.now().toString().slice(-8)}</p>
                  </div>
                </div>
              </div>

              {/* Comptes sélectionnés */}
              {selectedAccount ? (
                <div className="mb-6">
                  {(() => {
                    const account = accountsData.find(acc => acc.compte === selectedAccount);
                    if (!account) return null;
                    
                    return (
                      <div>
                        <div className="bg-gray-100 p-3 mb-4 rounded">
                          <h2 className="text-lg font-bold text-gray-800">
                            Account {account.compte} - {account.libelle}
                          </h2>
                          <div className="text-sm text-gray-600 mt-1">
                            Opening Balance: <span className="font-semibold">{fmt(account.soldeOuverture)}</span>
                          </div>
                        </div>

                        <table className="w-full border-2 border-gray-800 mb-4">
                          <thead>
                            <tr className="bg-gray-800 text-white">
                              <th className="border-r border-gray-600 px-3 py-2 text-left font-semibold">{t('common.date')}</th>
                              <th className="border-r border-gray-600 px-3 py-2 text-left font-semibold">Reference</th>
                              <th className="border-r border-gray-600 px-3 py-2 text-left font-semibold">Description</th>
                              <th className="border-r border-gray-600 px-3 py-2 text-right font-semibold">Debit</th>
                              <th className="border-r border-gray-600 px-3 py-2 text-right font-semibold">Credit</th>
                              <th className="px-3 py-2 text-right font-semibold">{t('accounting.balance')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {account.entries.map((entry, index) => (
                              <tr key={entry.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                <td className="border border-gray-300 px-3 py-2">
                                  {new Date(entry.date).toLocaleDateString('en-US')}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 font-mono text-blue-600">
                                  {entry.piece}
                                </td>
                                <td className="border border-gray-300 px-3 py-2">{entry.libelle}</td>
                                <td className="border border-gray-300 px-3 py-2 text-right font-mono">
                                  {entry.debit > 0 ? fmt(entry.debit) : ''}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-right font-mono">
                                  {entry.credit > 0 ? fmt(entry.credit) : ''}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-right font-mono font-bold">
                                  {fmt(entry.solde)}
                                </td>
                              </tr>
                            ))}

                            {/* Ligne de totaux */}
                            <tr className="bg-gray-800 text-white font-bold">
                              <td className="border border-gray-600 px-3 py-2" colSpan={3}>
                                TOTALS
                              </td>
                              <td className="border border-gray-600 px-3 py-2 text-right font-mono">
                                {fmt(account.totalDebit)}
                              </td>
                              <td className="border border-gray-600 px-3 py-2 text-right font-mono">
                                {fmt(account.totalCredit)}
                              </td>
                              <td className="border border-gray-600 px-3 py-2 text-right font-mono">
                                {fmt(account.soldeFermeture)}
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Summary Box */}
                        <div className="bg-blue-50 border-2 border-blue-200 rounded p-3">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Number of Entries:</span>
                              <span className="ml-2 font-semibold">{account.nombreEcritures}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Net Movement:</span>
                              <span className={`ml-2 font-semibold ${(account.soldeFermeture - account.soldeOuverture) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {(account.soldeFermeture - account.soldeOuverture) >= 0 ? '+' : ''}
                                {fmt(account.soldeFermeture - account.soldeOuverture)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Closing Balance:</span>
                              <span className="ml-2 font-bold text-lg">
                                {fmt(account.soldeFermeture)} USD
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="mb-6">
                  <h2 className="text-lg font-bold mb-4 text-gray-800">ACCOUNTS SUMMARY</h2>
                  <table className="w-full border-2 border-gray-800">
                    <thead>
                      <tr className="bg-gray-800 text-white">
                        <th className="border-r border-gray-600 px-3 py-2 text-left font-semibold">Account</th>
                        <th className="border-r border-gray-600 px-3 py-2 text-left font-semibold">Description</th>
                        <th className="border-r border-gray-600 px-3 py-2 text-center font-semibold">{t('navigation.entries')}</th>
                        <th className="border-r border-gray-600 px-3 py-2 text-right font-semibold">Total Debit</th>
                        <th className="border-r border-gray-600 px-3 py-2 text-right font-semibold">Total Credit</th>
                        <th className="px-3 py-2 text-right font-semibold">Final Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountsData.slice(0, 10).map((account, index) => (
                        <tr key={account.compte} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="border border-gray-300 px-3 py-2 font-mono text-blue-600">
                            {account.compte}
                          </td>
                          <td className="border border-gray-300 px-3 py-2">{account.libelle}</td>
                          <td className="border border-gray-300 px-3 py-2 text-center">{account.nombreEcritures}</td>
                          <td className="border border-gray-300 px-3 py-2 text-right font-mono">
                            {fmt(account.totalDebit)}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-right font-mono">
                            {fmt(account.totalCredit)}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-right font-mono font-bold">
                            {fmt(account.soldeFermeture)}
                          </td>
                        </tr>
                      ))}

                      {/* Grand Total Row */}
                      <tr className="bg-gray-800 text-white font-bold">
                        <td className="border border-gray-600 px-3 py-3" colSpan={2}>
                          GRAND TOTALS
                        </td>
                        <td className="border border-gray-600 px-3 py-3 text-center">
                          {accountsData.reduce((sum, acc) => sum + acc.nombreEcritures, 0)}
                        </td>
                        <td className="border border-gray-600 px-3 py-3 text-right font-mono">
                          {fmt(accountsData.reduce((sum, acc) => sum + acc.totalDebit, 0))}
                        </td>
                        <td className="border border-gray-600 px-3 py-3 text-right font-mono">
                          {fmt(accountsData.reduce((sum, acc) => sum + acc.totalCredit, 0))}
                        </td>
                        <td className="border border-gray-600 px-3 py-3 text-right font-mono">
                          {fmt(accountsData.reduce((sum, acc) => sum + acc.soldeFermeture, 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Professional Footer */}
              <div className="mt-8 pt-4 border-t-2 border-gray-800">
                <div className="flex justify-between items-start">
                  {/* Left side - Report Info */}
                  <div className="text-xs">
                    <p className="font-semibold text-gray-800">Prepared By</p>
                    <div className="mt-2 space-y-1 text-gray-600">
                      <p>Name: _________________________</p>
                      <p>Date: _________________________</p>
                      <p>Signature: _________________________</p>
                    </div>
                  </div>

                  {/* Center - Verified By */}
                  <div className="text-xs text-center">
                    <p className="font-semibold text-gray-800">Verified By</p>
                    <div className="mt-2 space-y-1 text-gray-600">
                      <p>Name: _________________________</p>
                      <p>Date: _________________________</p>
                      <p>Signature: _________________________</p>
                    </div>
                  </div>

                  {/* Right side - Approval */}
                  <div className="text-xs text-right">
                    <p className="font-semibold text-gray-800">Approved By</p>
                    <div className="mt-2 space-y-1 text-gray-600">
                      <p>Name: _________________________</p>
                      <p>Date: _________________________</p>
                      <p>Signature: _________________________</p>
                    </div>
                  </div>
                </div>

                {/* Bottom bar */}
                <div className="mt-6 pt-3 border-t border-gray-400 flex justify-between items-center text-xs text-gray-700">
                  <div>
                    <p className="font-semibold"><span className="atlas-brand">Atlas FnA</span> Enterprise ERP System</p>
                    <p>Version 2.0 | Licensed to: Atlas FnA Corporation</p>
                  </div>
                  <div className="text-center">
                    <p>Page 1 of 1</p>
                    <p>Document ID: {Date.now().toString().slice(-10)}</p>
                  </div>
                  <div className="text-right">
                    <p>Generated by: System Administrator</p>
                    <p>IP: 192.168.1.100 | Session: {Date.now().toString(36).toUpperCase()}</p>
                  </div>
                </div>

                {/* Confidentiality Notice */}
                <div className="mt-4 p-2 bg-gray-100 border border-gray-300 rounded text-xs text-gray-600 text-center">
                  <p className="font-semibold">CONFIDENTIAL</p>
                  <p>This document contains proprietary information and is intended solely for the use of the addressee(s) named above.</p>
                  <p>Any unauthorized review, use, disclosure or distribution is strictly prohibited.</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-between">
              <button 
                onClick={() => setShowPrintPreview(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('gl.close')}
              </button>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowPrintPreview(false);
                    setShowEmailModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Mail className="w-4 h-4 mr-2 inline" />
                  {t('gl.sendByEmail')}
                </button>
                <button
                  onClick={() => {
                    setShowPrintPreview(false);
                    setExportFormat('excel');
                    setShowExportModal(true);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  <FileSpreadsheet className="w-4 h-4 mr-2 inline" />
                  {t('gl.exportExcel')}
                </button>
                <button
                  onClick={() => {
                    document.body.classList.add('printing', 'print-landscape');
                    window.print();
                    setTimeout(() => {
                      document.body.classList.remove('printing', 'print-landscape');
                    }, 1000);
                  }}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]"
                >
                  <Printer className="w-4 h-4 mr-2 inline" />
                  {t('gl.print')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Export */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('gl.exportLedger')}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('gl.exportFormat')}
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="excel"
                      checked={exportFormat === 'excel'}
                      onChange={(e) => setExportFormat(e.target.value as typeof exportFormat)}
                      className="mr-2"
                    />
                    <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                    Excel (.xlsx)
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="pdf"
                      checked={exportFormat === 'pdf'}
                      onChange={(e) => setExportFormat(e.target.value as typeof exportFormat)}
                      className="mr-2"
                    />
                    <FileText className="w-4 h-4 mr-2 text-red-600" />
                    PDF
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="csv"
                      checked={exportFormat === 'csv'}
                      onChange={(e) => setExportFormat(e.target.value as typeof exportFormat)}
                      className="mr-2"
                    />
                    <Database className="w-4 h-4 mr-2 text-blue-600" />
                    CSV
                  </label>
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" defaultChecked />
                  {t('gl.includeTotals')}
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" defaultChecked />
                  {t('gl.includeSubtotals')}
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  {t('gl.includeCharts')}
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('gl.cancel')}
              </button>
              <ExportMenu
                data={accountsData as unknown as Record<string, unknown>[]}
                filename="grand-livre-export"
                columns={{
                  compte: t('gl.colAccount'),
                  libelle: t('gl.colLabel'),
                  soldeOuverture: t('gl.colOpeningBalance'),
                  totalDebit: t('gl.colTotalDebit'),
                  totalCredit: t('gl.colTotalCredit'),
                  soldeFermeture: t('gl.colClosingBalance')
                }}
                buttonText={t('gl.export')}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Email */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('gl.sendByEmailTitle')}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('gl.recipients')}
                </label>
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('gl.subject')}
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('gl.message')}
                </label>
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={4}
                  placeholder={t('gl.optionalMessage')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('gl.attachmentFormat')}
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
                  <option value="both">PDF + Excel</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('gl.cancel')}
              </button>
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  toast.success(t('gl.emailSent'));
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Mail className="w-4 h-4 mr-2 inline" />
                {t('gl.send')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Détails */}
      {showDetailModal && selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('gl.entryDetails')}
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('common.date')}</label>
                <p className="text-gray-900">{selectedEntry.date}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('gl.documentNo')}</label>
                <p className="text-gray-900 font-mono">{selectedEntry.piece}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('accounting.label')}</label>
                <p className="text-gray-900">{selectedEntry.libelle}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('gl.costCenter')}</label>
                <p className="text-gray-900">{selectedEntry.centreCout || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('accounting.debit')}</label>
                <p className="text-green-600 font-semibold">
                  {fmt(selectedEntry.debit)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('accounting.credit')}</label>
                <p className="text-red-600 font-semibold">
                  {fmt(selectedEntry.credit)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('gl.thirdParty')}</label>
                <p className="text-gray-900">{selectedEntry.tiers || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('gl.externalRef')}</label>
                <p className="text-gray-900">{selectedEntry.referenceExterne || '-'}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('gl.balanceAfterEntry')}</label>
              <p className="text-lg font-bold text-gray-900">
                {fmt(selectedEntry.solde)}
              </p>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('gl.close')}
              </button>
              <button
                onClick={() => {
                  document.body.classList.add('printing', 'print-landscape');
                  window.print();
                  setTimeout(() => {
                    document.body.classList.remove('printing', 'print-landscape');
                  }, 1000);
                }}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]"
              >
                <Printer className="w-4 h-4 mr-2 inline" />
                {t('gl.print')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Annotation */}
      {showAnnotationModal && selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('gl.addAnnotation')}
            </h3>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                {t('gl.entryLabel')} <span className="font-medium">{selectedEntry.piece}</span>
              </p>
              <p className="text-sm text-gray-600">
                {selectedEntry.libelle}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('gl.yourAnnotation')}
              </label>
              <textarea
                value={annotation}
                onChange={(e) => setAnnotation(e.target.value)}
                rows={4}
                placeholder={t('gl.annotationPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAnnotationModal(false);
                  setAnnotation('');
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('gl.cancel')}
              </button>
              <button
                onClick={async () => {
                  const text = annotation.trim();
                  const entryId = (selectedEntry as any)?.id;
                  if (!text || !entryId) { setShowAnnotationModal(false); return; }
                  try {
                    // Persiste l'annotation dans settings.gl_annotations (map entryId -> [annotations]).
                    const cur = await (adapter as any).getById('settings', 'gl_annotations').catch(() => null);
                    const map = cur?.value ? JSON.parse(cur.value) : {};
                    map[entryId] = [...(map[entryId] || []), { text, at: new Date().toISOString() }];
                    const payload = { key: 'gl_annotations', value: JSON.stringify(map), updatedAt: new Date().toISOString() };
                    if (cur) await adapter.update('settings' as any, 'gl_annotations', payload as any);
                    else await adapter.create('settings' as any, payload as any);
                    toast.success(t('gl.annotationSaved'));
                  } catch { toast.error(t('gl.annotationSaveFailed')); }
                  setShowAnnotationModal(false);
                  setAnnotation('');
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                <MessageSquare className="w-4 h-4 mr-2 inline" />
                {t('gl.add')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Partage */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('gl.shareEntry')}
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('gl.shareLink')}
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareLink);
                    toast.success(t('gl.linkCopied'));
                  }}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-r-md hover:bg-[var(--color-primary-hover)]"
                >
                  {t('gl.copy')}
                </button>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">{t('gl.shareWith')}</p>
              <div className="space-y-2">
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Mail className="w-4 h-4" />
                  {t('gl.email')}
                </button>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Users className="w-4 h-4" />
                  {t('gl.team')}
                </button>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('gl.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Paramètres IA */}
      {showAISettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2 text-primary-600" />
              {t('gl.aiSettingsTitle')}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{t('gl.autoAnomalyDetection')}</span>
                  <input type="checkbox" defaultChecked className="rounded" />
                </label>
              </div>
              <div>
                <label className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{t('gl.predictiveAnalysis')}</span>
                  <input type="checkbox" defaultChecked className="rounded" />
                </label>
              </div>
              <div>
                <label className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{t('gl.autoSuggestions')}</span>
                  <input type="checkbox" defaultChecked className="rounded" />
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('gl.minConfidenceThreshold')}
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue="85"
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-700">
                  <span>0%</span>
                  <span>85%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAISettingsModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('gl.cancel')}
              </button>
              <button
                onClick={() => {
                  setShowAISettingsModal(false);
                  toast.success(t('gl.aiSettingsSaved'));
                }}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-700"
              >
                {t('gl.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nouvel Espace */}
      {showNewWorkspaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('gl.createWorkspace')}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('gl.workspaceName')}
                </label>
                <input
                  type="text"
                  placeholder={t('gl.workspaceNamePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('gl.description')}
                </label>
                <textarea
                  rows={3}
                  placeholder={t('gl.workspaceDescPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('gl.workspaceMembers')}
                </label>
                <input
                  type="text"
                  placeholder="email1@example.com, email2@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowNewWorkspaceModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('gl.cancel')}
              </button>
              <button
                onClick={() => {
                  setShowNewWorkspaceModal(false);
                  toast.success(t('gl.workspaceCreated'));
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                {t('gl.createSpace')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rejoindre Espace */}
      {showJoinWorkspaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('gl.joinSpaceTitle', { name: selectedWorkspace })}
            </h3>

            <div className="space-y-4">
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-gray-700">
                  {t('gl.aboutToJoin')} <strong>{selectedWorkspace}</strong>.
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  {t('gl.joinAccessNote')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('gl.roleInSpace')}
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option>{t('gl.roleMember')}</option>
                  <option>{t('gl.roleContributor')}</option>
                  <option>{t('gl.roleAdmin')}</option>
                </select>
              </div>

              <div>
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="rounded mr-2" />
                  <span className="text-sm text-gray-700">{t('gl.receiveNotifications')}</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowJoinWorkspaceModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('gl.cancel')}
              </button>
              <button
                onClick={() => {
                  setShowJoinWorkspaceModal(false);
                  toast(t('gl.joinedSpace', { name: selectedWorkspace }));
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                {t('gl.join')}
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
    </PrintableArea>
  );
};

export default AdvancedGeneralLedger;