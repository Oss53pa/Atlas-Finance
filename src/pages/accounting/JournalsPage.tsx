import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, BarChart3, FileText, Plus, Search, Filter, Edit, Eye,
  ArrowLeft, Home, Download, RefreshCw, Calculator, Settings,
  Archive, Printer, FileSpreadsheet, ChevronUp, ChevronDown, ChevronRight,
  RotateCcw, X, CheckCircle, AlertTriangle
} from 'lucide-react';
import { buildPieceNumbers } from '../../utils/pieceNumber';
import PageHeaderActions from '../../components/ui/PageHeaderActions';
import JournalDashboard from '../../components/accounting/JournalDashboard';
import JournalEntryModal from '../../components/accounting/JournalEntryModal';
import FilterSidebar, { type ComptaFilters, DEFAULT_COMPTA_FILTERS, loadPersistedFilters } from '../../components/accounting/FilterSidebar';
import DataTable, { Column } from '../../components/ui/DataTable';
import PrintableArea from '../../components/ui/PrintableArea';
import { usePrintReport } from '../../hooks/usePrint';
import { useReverseEntry } from '../../hooks/useAccounting';
import { useLanguage } from '../../contexts/LanguageContext';
import toast from 'react-hot-toast';
import { validerEcriture } from '../../services/entryWorkflow';
import { formatCurrency } from '@/utils/formatters';
import { useData } from '../../contexts/DataContext';

interface Journal {
  id: string;
  code: string;
  libelle: string;
  type: 'VE' | 'AC' | 'BQ' | 'CA' | 'OD' | 'AN';
  entries: number;
  totalDebit: number;
  totalCredit: number;
  lastEntry: string;
  color: string;
}

interface EcritureJournal {
  id?: string;   // ID de l'entrée de journal (utilisé pour la sauvegarde)
  mvt: string;
  jnl: string;
  date: string;
  piece: string;
  echeance: string;
  compte: string;
  compteLib: string;
  libelle: string;
  debit: string;
  credit: string;
  tiers?: string;
  status?: string;
}

const JournalsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('journaux');
  const [selectedJournal, setSelectedJournal] = useState<Journal | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRecapTable, setShowRecapTable] = useState(false);
  const [showEditEntryModal, setShowEditEntryModal] = useState(false);
  const [entryReadOnly, setEntryReadOnly] = useState(false);
  // Barre latérale de filtres de la vue journal — GREFFÉE à droite du tableau d'origine
  // (le tableau et ses colonnes restent inchangés ; seules les données sont filtrées).
  const [jvFilters, setJvFilters] = useState<ComptaFilters>(() => loadPersistedFilters('journal-view', DEFAULT_COMPTA_FILTERS));
  const jvNorm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const jvMatch = (e: EcritureJournal): boolean => {
    const iso = e.date ? e.date.split('/').reverse().join('-') : '';
    if (jvFilters.dateFrom && iso && iso < jvFilters.dateFrom) return false;
    if (jvFilters.dateTo && iso && iso > jvFilters.dateTo) return false;
    if (jvFilters.journals.length > 0 && !jvFilters.journals.includes(e.jnl)) return false;
    if (jvFilters.accountPrefix.trim() && !(e.compte || '').startsWith(jvFilters.accountPrefix.trim())) return false;
    const d = parseFloat((e.debit || '0').replace(/\s/g, '').replace(',', '.')) || 0;
    const c = parseFloat((e.credit || '0').replace(/\s/g, '').replace(',', '.')) || 0;
    const min = parseFloat(String(jvFilters.amountMin).replace(/\s/g, '').replace(',', '.')) || 0;
    if (min > 0 && Math.max(d, c) < min) return false;
    if (jvFilters.sens === 'debit' && !(d > 0)) return false;
    if (jvFilters.sens === 'credit' && !(c > 0)) return false;
    if (jvFilters.statut !== 'all' && (e.status || 'validated') !== jvFilters.statut) return false;
    if (jvFilters.tiers.trim() && !jvNorm(`${e.compteLib} ${e.libelle}`).includes(jvNorm(jvFilters.tiers))) return false;
    if (jvFilters.search.trim()) {
      const q = jvNorm(jvFilters.search);
      if (!jvNorm(`${e.piece} ${e.mvt} ${e.compte} ${e.compteLib} ${e.libelle} ${e.debit} ${e.credit}`).includes(q)) return false;
    }
    return true; // lettrage : pas de donnée par ligne dans cette vue → critère ignoré
  };
  // Écriture ouverte dans le WIZARD à onglets (Détails/Ventilation/Attachements/Notes/
  // Validation) — même formulaire que la saisie ; il se verrouille seul si validée.
  const [wizardEntry, setWizardEntry] = useState<any | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<EcritureJournal | null>(null);
  const [selectedEntryLines, setSelectedEntryLines] = useState<EcritureJournal[]>([]);
  const [showSubJournals, setShowSubJournals] = useState<{[key: string]: boolean}>({});
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [savedEntry, setSavedEntry] = useState<(EcritureJournal & { lines?: EcritureJournal[]; totalDebit?: number; totalCredit?: number }) | null>(null);

  const { adapter } = useData();
  const [dbEntries, setDbEntries] = useState<any[]>([]);
  const [companyCurrency, setCompanyCurrency] = useState('FCFA');
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);

  // État du formulaire de création de sous-journal
  const [newSubJournal, setNewSubJournal] = useState({ parentCode: '', code: '', libelle: '' });
  const [isCreatingSubJournal, setIsCreatingSubJournal] = useState(false);

  // Filtres de date — année courante par défaut (contrôlés)
  const currentYear = new Date().getFullYear();
  const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
  const [dateTo, setDateTo] = useState(`${currentYear}-12-31`);
  // Valeurs appliquées (séparées pour que le filtre n'agisse qu'au clic "Filtrer")
  const [appliedDateFrom, setAppliedDateFrom] = useState(`${currentYear}-01-01`);
  const [appliedDateTo, setAppliedDateTo] = useState(`${currentYear}-12-31`);

  // Rechargement — mémoïsé avec useCallback pour éviter les re-exécutions inutiles de l'useEffect
  const reloadData = useCallback(async () => {
    setIsLoadingEntries(true);
    try {
      const entries = await adapter.getAll<any>('journalEntries');
      // Charger les lignes depuis journalLines (SaaS : tables séparées)
      let linesByEntry = new Map<string, any[]>();
      try {
        const allLines = await adapter.getAll<any>('journalLines');
        for (const l of allLines) {
          const key = l.entryId || l.entry_id;
          if (!key) continue;
          if (!linesByEntry.has(key)) linesByEntry.set(key, []);
          linesByEntry.get(key)!.push({
            accountCode: l.accountCode || l.account_code || '',
            accountName: l.accountName || l.account_name || '',
            debit:  Number(l.debit  ?? 0),
            credit: Number(l.credit ?? 0),
            label:  l.label || l.libelle || '',
          });
        }
      } catch (linesErr) {
        console.error('[JournalsPage] Chargement journalLines échoué, utilisation de entry.lines :', linesErr);
        /* pas de journalLines — utiliser entry.lines */
      }

      // Injecter les lignes dans chaque entrée
      const enriched = entries.map((e: any) => {
        const injected = linesByEntry.get(e.id) ?? (Array.isArray(e.lines) ? e.lines : []);
        return { ...e, lines: injected };
      });
      setDbEntries(enriched);
    } catch (err) {
      console.error('[JournalsPage] Erreur chargement des journaux :', err);
      toast.error('Impossible de charger les données des journaux. Vérifiez votre connexion.');
    } finally {
      setIsLoadingEntries(false);
    }
  }, [adapter]);

  useEffect(() => { reloadData(); }, [reloadData]);

  // Devise : lue depuis la table companies (champ currency ou devise)
  useEffect(() => {
    adapter.getAll<any>('companies').then(companies => {
      const s = companies[0];
      if (s) {
        const code = s.currency || s.devise || s.devisePrincipale?.code || null;
        if (code) setCompanyCurrency(code);
      }
    }).catch(() => {/* garder FCFA par défaut */});
  }, [adapter]);

  // Hook d'impression pour les rapports
  const { printRef, handlePrint, isPrinting, PrintWrapper } = usePrintReport({
    title: `Journal ${selectedJournal?.code || ''} - ${new Date().toLocaleDateString('fr-FR')}`,
    orientation: 'landscape',
    showHeaders: true,
    showFooters: true
  });

  // Hook pour reverser une écriture
  const reverseEntryMutation = useReverseEntry();

  // Configuration des colonnes pour DataTable.
  // La DATE est TOUJOURS la 1re colonne d'un journal (et d'un grand livre).
  // La colonne « Mouvement » a été retirée : elle affichait le même n° que la
  // colonne « Pièce » (doublon). Le champ `mvt` reste présent dans les données
  // (regroupement des lignes d'une écriture, recherche), il n'est juste plus
  // rendu comme colonne.
  const ecrituresColumns: Column<EcritureJournal>[] = [
    {
      key: 'date',
      label: t('common.date'),
      sortable: true,
      filterable: true,
      filterType: 'date',
      width: '90px',
      align: 'center',
      render: (item) => (
        <span className="text-xs">{item.date}</span>
      )
    },
    {
      key: 'jnl',
      label: t('accounting.journal'),
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'VE', label: 'VE' },
        { value: 'AC', label: 'AC' },
        { value: 'BQ', label: 'BQ' },
        { value: 'CA', label: 'CA' },
        { value: 'OD', label: 'OD' },
        { value: 'AN', label: 'AN' }
      ],
      width: '40px',
      align: 'center',
      render: (item) => (
        <span className="text-xs font-bold text-[var(--color-primary)]">{item.jnl}</span>
      )
    },
    {
      key: 'piece',
      label: t('accounting.piece'),
      sortable: true,
      filterable: true,
      filterType: 'text',
      width: '100px',
      align: 'center',
      render: (item) => (
        <span className="text-xs font-mono">{item.piece}</span>
      )
    },
    {
      key: 'echeance',
      label: t('accounting.dueDate'),
      sortable: true,
      filterable: true,
      filterType: 'date',
      width: '80px',
      align: 'center',
      render: (item) => (
        <span className="text-xs">{item.echeance}</span>
      )
    },
    {
      key: 'compte',
      label: t('accounting.account'),
      sortable: true,
      filterable: true,
      filterType: 'text',
      width: '80px',
      align: 'center',
      render: (item) => (
        <span className="text-xs font-mono text-[var(--color-primary)] font-semibold">{item.compte}</span>
      )
    },
    {
      key: 'compteLib',
      label: t('accounting.accountName'),
      sortable: true,
      filterable: true,
      filterType: 'text',
      width: '150px',
      render: (item) => (
        <span className="text-xs">{item.compteLib}</span>
      )
    },
    {
      key: 'libelle',
      label: t('accounting.label'),
      sortable: true,
      filterable: true,
      filterType: 'text',
      width: '200px',
      render: (item) => (
        <span className="text-xs">{item.libelle}</span>
      )
    },
    {
      key: 'debit',
      label: t('accounting.debit'),
      sortable: true,
      filterable: true,
      filterType: 'number',
      width: '100px',
      align: 'right',
      render: (item) => {
        const isNegative = item.debit && item.debit.includes('-');
        const amount = item.debit ? item.debit.replace('-', '') : '';
        return (
          <span className="text-xs font-medium text-[var(--color-error)]">
            {amount}{isNegative && '-'}
          </span>
        );
      }
    },
    {
      key: 'credit',
      label: t('accounting.credit'),
      sortable: true,
      filterable: true,
      filterType: 'number',
      width: '100px',
      align: 'right',
      render: (item) => {
        const isNegative = item.credit && item.credit.includes('-');
        const amount = item.credit ? item.credit.replace('-', '') : '';
        return (
          <span className="text-xs font-medium text-[var(--color-success)]">
            {amount}{isNegative && '-'}
          </span>
        );
      }
    }
  ];

  // Onglets principaux
  const tabs = [
    { id: 'dashboard', label: t('navigation.dashboard'), icon: BarChart3 },
    { id: 'journaux', label: t('navigation.journals'), icon: BookOpen },
    ...(selectedJournal ? [{ id: 'journal-view', label: `${selectedJournal.code}`, icon: Eye }] : [])
  ];

  // Journaux calculés depuis les données réelles : on liste les codes journaux
  // RÉELLEMENT présents (issus de la migration ou de la saisie) et non une liste
  // figée {VE,AC,BQ,CA,OD,AN}. Sinon les journaux d'une source importée
  // (RAN, VENTE, ACHAT, ODPROV, banques…) restaient invisibles faute de
  // correspondre aux codes standards, et leurs écritures/montants n'apparaissaient pas.
  const journaux: Journal[] = useMemo(() => {
    const labelMap: Record<string, string> = {
      VE: t('accounting.salesJournal'), VENTE: t('accounting.salesJournal'),
      AC: t('accounting.purchaseJournal'), ACHAT: t('accounting.purchaseJournal'),
      BQ: t('accounting.bankJournal'), CA: t('accounting.cashJournal'),
      OD: t('accounting.miscJournal'),
      AN: 'Journal A-Nouveau', RAN: 'Journal A-Nouveau (RAN)',
      IPE: 'Instruments de paiement électronique', SAL: 'Journal de paie',
    };
    const palette = ['var(--color-primary)', 'var(--color-primary-hover)', 'var(--color-text-secondary)', '#8B6DAF', '#2E8B7F', '#C77D3A'];

    // Codes journaux présents dans les données ; sinon le jeu standard (système vierge).
    const present = [...new Set(
      dbEntries.map((e: any) => String(e.journal || '').toUpperCase().trim()).filter(Boolean)
    )].sort();
    const codes = present.length > 0 ? present : ['VE', 'AC', 'BQ', 'CA', 'OD', 'AN'];

    return codes.map((code, idx) => {
      const jEntries = dbEntries.filter((e: any) => String(e.journal || '').toUpperCase().trim() === code);
      let totalDebit = 0;
      let totalCredit = 0;
      let lastDate = '';
      for (const entry of jEntries) {
        if (entry.lines && entry.lines.length > 0) {
          for (const line of entry.lines) {
            totalDebit += (line.debit || 0);
            totalCredit += (line.credit || 0);
          }
        } else {
          // Support camelCase (Dexie) et snake_case (Supabase)
          totalDebit  += entry.totalDebit  || entry.total_debit  || 0;
          totalCredit += entry.totalCredit || entry.total_credit || 0;
        }
        const d = entry.date || '';
        if (d > lastDate) lastDate = d;
      }
      return {
        id: String(idx + 1),
        code,
        libelle: labelMap[code] ?? code,
        type: code as Journal['type'],
        entries: jEntries.length,
        totalDebit,
        totalCredit,
        lastEntry: lastDate,
        color: palette[idx % palette.length],
      };
    });
  }, [dbEntries, t]);

  // N° de pièce INCRÉMENTAL par journal (utilitaire partagé, identique dans tous
  // les écrans). Calculé sur TOUTES les écritures → stable au filtrage/pagination.
  const pieceNumbers = useMemo(() => buildPieceNumbers(dbEntries), [dbEntries]);

  // Écritures par journal — depuis données réelles, avec filtre de date appliqué
  const getEcrituresJournal = (journalCode: string): EcritureJournal[] => {
    let filtered = journalCode === 'TOUS'
      ? dbEntries
      : dbEntries.filter((e: any) => String(e.journal || '').toUpperCase().trim() === journalCode);

    // Appliquer le filtre de date (valeurs appliquées)
    if (appliedDateFrom) {
      filtered = filtered.filter((e: any) => (e.date || '') >= appliedDateFrom);
    }
    if (appliedDateTo) {
      filtered = filtered.filter((e: any) => (e.date || '') <= appliedDateTo);
    }

    const result: EcritureJournal[] = [];
    for (const entry of filtered) {
      if (!entry.lines || entry.lines.length === 0) continue;
      for (const line of entry.lines) {
        result.push({
          id: entry.id,
          mvt: entry.entryNumber || entry.entry_number || entry.id || '',
          jnl: (entry.journal || '').toUpperCase(),
          date: entry.date ? new Date(entry.date).toLocaleDateString('fr-FR') : '',
          piece: pieceNumbers.get(entry.id) || entry.reference || entry.entryNumber || entry.entry_number || '',
          echeance: (line.dateEcheance || line.date_echeance)
            ? new Date(line.dateEcheance || line.date_echeance).toLocaleDateString('fr-FR') : '',
          compte: line.accountCode || '',
          compteLib: line.accountName || '',
          libelle: line.label || entry.label || '',
          debit: line.debit ? Number(line.debit).toFixed(2).replace('.', ',') : '',
          credit: line.credit ? Number(line.credit).toFixed(2).replace('.', ',') : '',
          status: entry.status || entry.statut || 'draft',
        });
      }
    }
    return result;
  };

  // Totaux dynamiques pour le journal sélectionné
  const selectedJournalTotals = useMemo(() => {
    const ecritures = getEcrituresJournal(selectedJournal?.code || 'TOUS');
    let totalDebit = 0;
    let totalCredit = 0;
    for (const e of ecritures) {
      totalDebit += parseFloat(e.debit?.replace(/\s/g, '').replace(',', '.') || '0');
      totalCredit += parseFloat(e.credit?.replace(/\s/g, '').replace(',', '.') || '0');
    }
    return { totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 };
  }, [dbEntries, selectedJournal]);

  // Récapitulatif par compte — calculé dynamiquement
  const recapParCompte = useMemo(() => {
    const ecritures = getEcrituresJournal(selectedJournal?.code || 'TOUS');
    const compteMap: Record<string, { libelle: string; debit: number; credit: number }> = {};
    for (const e of ecritures) {
      if (!e.compte) continue;
      if (!compteMap[e.compte]) {
        compteMap[e.compte] = { libelle: e.compteLib || '', debit: 0, credit: 0 };
      }
      compteMap[e.compte].debit += parseFloat(e.debit?.replace(/\s/g, '').replace(',', '.') || '0');
      compteMap[e.compte].credit += parseFloat(e.credit?.replace(/\s/g, '').replace(',', '.') || '0');
    }
    return Object.entries(compteMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([compte, data]) => {
        const solde = data.debit - data.credit;
        return {
          compte,
          libelle: data.libelle,
          debit: data.debit ? data.debit.toFixed(2).replace('.', ',') : '',
          credit: data.credit ? data.credit.toFixed(2).replace('.', ',') : '',
          soldeDebit: solde > 0 ? solde.toFixed(2).replace('.', ',') : '',
          soldeCredit: solde < 0 ? Math.abs(solde).toFixed(2).replace('.', ',') : '',
        };
      });
  }, [dbEntries, selectedJournal]);

  // Filtre journal dans la vue journal-view (contrôlé)
  const [journalViewFilter, setJournalViewFilter] = useState('');

  // Centres analytiques — chargés depuis l'adapter (table 'costCenters' ou 'analytique')
  const [costCenters, setCostCenters] = useState<Array<{ code: string; libelle: string }>>([]);
  useEffect(() => {
    adapter.getAll<any>('costCenters' as any).then(rows => {
      if (rows.length > 0) {
        setCostCenters(rows.map((r: any) => ({
          code: r.code || r.id || '',
          libelle: r.name || r.libelle || r.label || '',
        })));
      }
    }).catch(() => {/* table absente — laisser la liste vide */});
  }, [adapter]);

  // Pas de sous-journaux hardcodés
  const sousJournaux: Record<string, { id: string; code: string; libelle: string; entries: number; color: string }[]> = {};

  const toggleSubJournals = (journalCode: string) => {
    setShowSubJournals(prev => ({
      ...prev,
      [journalCode]: !prev[journalCode]
    }));
  };

  const handleDoubleClickEntry = (entry: Record<string, unknown>) => {
    // Les écritures validées/comptabilisées sont intangibles (SYSCOHADA Art.19).
    // CONSULTATION : on les ouvre dans le MÊME formulaire à onglets que la saisie
    // (JournalEntryModal : Détails / Ventilation / Attachements / Notes / Validation),
    // qui se verrouille de lui-même pour une écriture validée.
    const isLocked = entry.status === 'validated' || entry.status === 'posted';
    if (isLocked) {
      const raw = dbEntries.find((e: any) => e.id === entry.id);
      if (raw) {
        setWizardEntry(raw);
        return;
      }
      // Écriture brute introuvable (ne devrait pas arriver) → repli modale simple.
      setEntryReadOnly(true);
    } else {
      setEntryReadOnly(false);
    }

    setSelectedEntry(entry as unknown as EcritureJournal);

    // Récupérer toutes les lignes de l'écriture (même numéro de mouvement)
    const allEntries = getEcrituresJournal(String(entry.jnl ?? ''));
    const entryLines = allEntries.filter(e => e.mvt === String(entry.mvt ?? ''));

    setSelectedEntryLines(entryLines);
    setShowEditEntryModal(true);
  };

  // Fonction pour sauvegarder une écriture modifiée — persistance réelle
  const [isSaving, setIsSaving] = useState(false);
  const [isValidatingFromModal, setIsValidatingFromModal] = useState(false);
  const handleSaveEntry = async () => {
    if (!selectedEntry || !selectedEntryLines.length) {
      toast.error(t('messages.saveError'));
      return;
    }

    // Vérifier l'équilibre
    const totalDebit = selectedEntryLines.reduce((sum, line) => {
      const debit = parseFloat(String(line.debit ?? '0').replace(/\s/g, '').replace('-', '') || '0');
      return sum + debit;
    }, 0);
    const totalCredit = selectedEntryLines.reduce((sum, line) => {
      const credit = parseFloat(String(line.credit ?? '0').replace(/\s/g, '').replace('-', '') || '0');
      return sum + credit;
    }, 0);

    if (Math.abs(totalDebit - totalCredit) >= 0.01) {
      toast.error(t('validation.mustBalance'));
      return;
    }

    // Trouver l'ID de l'entrée de journal depuis dbEntries
    const entryId = selectedEntry.id;
    if (!entryId) {
      toast.error('Impossible de trouver l\'écriture en base (id manquant)');
      return;
    }

    setIsSaving(true);
    try {
      // Mettre à jour les totaux de l'entrée principale
      await adapter.update<any>('journalEntries', entryId, {
        totalDebit,
        total_debit: totalDebit,
        totalCredit,
        total_credit: totalCredit,
      });

      // Recharger les données pour refléter les modifications
      await reloadData();

      const entryToSave = {
        ...selectedEntry,
        lines: selectedEntryLines,
        totalDebit,
        totalCredit
      };

      setShowEditEntryModal(false);
      setSavedEntry(entryToSave);
      setShowConfirmationModal(true);
      toast.success(t('messages.saveSuccess'));
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde : ' + ((err instanceof Error) ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  // Fonction pour reverser une écriture
  const handleReverseEntry = async (entry: EcritureJournal) => {
    if (!entry.mvt) {
      toast.error(t('messages.saveError'));
      return;
    }

    try {
      // Date du jour pour le reversement
      const todayDate = new Date().toISOString().split('T')[0];

      // Le reversement conserve :
      // 1. Le même numéro de pièce (entry.piece)
      // 2. La même structure (débit reste débit, crédit reste crédit)
      // 3. Les montants avec le signe "-" après (ex: 150 000-)
      // 4. Le libellé préfixé par "REVERSEMENT: "
      // 5. Il sera affiché juste à côté de l'écriture d'origine (trié par n° pièce)

      await reverseEntryMutation.mutateAsync({
        // reverseEntry fait getById('journalEntries', id) → il faut l'ID UUID réel,
        // pas le n° de pièce/entryNumber (entry.mvt) qui ne matche jamais `.eq('id',…)`.
        id: entry.id ?? entry.mvt,
        date: todayDate,
        pieceNumber: entry.piece // Conserver le même numéro de pièce
      });

      toast.success(t('messages.saveSuccess'));
      setShowEditEntryModal(false);
    } catch (error: unknown) {
      toast.error((error instanceof Error ? error.message : undefined) || t('messages.saveError'));
    }
  };

  return (
    <div className="p-3 bg-[var(--color-border)] h-screen overflow-hidden flex flex-col">
      {/* Header avec navigation */}
      <div className="bg-white rounded-lg p-3 border border-[var(--color-border)] shadow-sm mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/accounting')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-[var(--color-surface-hover)] hover:bg-[var(--color-border-light)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#404040]" />
              <span className="text-sm font-semibold text-[#404040]">{t('accounting.title')}</span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--color-surface-hover)] flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-[var(--color-text-secondary)]" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[var(--color-primary)]">Journaux Comptables</h1>
                <p className="text-sm text-[var(--color-text-tertiary)]">Gestion des journaux SYSCOHADA</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <PageHeaderActions printTitle="Journaux Comptables" />
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-text-inverse)] rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">Nouveau sous-journal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="px-6 border-b border-[var(--color-border)] flex-shrink-0">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-2.5 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                      : 'border-transparent text-[var(--color-text-tertiary)] hover:text-[#404040]'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Contenu des onglets */}
        {/* journal-view : pane verrouillé (la zone table gère son propre défilement) ;
            autres onglets : défilement normal du pane. */}
        <div className={`p-3 flex-1 min-h-0 ${activeTab === 'journal-view' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'}`}>
          {/* Dashboard */}
          {activeTab === 'dashboard' && <JournalDashboard />}

          {/* Journaux avec switch */}
          {activeTab === 'journaux' && (
            <div className="space-y-4">
              {/* Header avec switch */}
              <div className="bg-white rounded-lg border border-[var(--color-border)] p-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-[var(--color-primary)]">Gestion des Journaux</h2>
                  <div className="flex items-center space-x-3">
                    {/* Switch vue */}
                    <div className="flex items-center bg-[var(--color-surface-hover)] rounded-lg p-1">
                      <button
                        onClick={() => setViewMode('cards')}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                          viewMode === 'cards'
                            ? 'bg-white text-[var(--color-primary)] shadow-sm'
                            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                        }`}
                      >
                        <BookOpen className="w-4 h-4" />
                        <span>Cartes</span>
                      </button>
                      <button
                        onClick={() => setViewMode('table')}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                          viewMode === 'table'
                            ? 'bg-white text-[var(--color-primary)] shadow-sm'
                            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                        <span>Table</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Indicateur de chargement commun aux deux vues */}
              {isLoadingEntries && (
                <div className="flex items-center justify-center py-10 space-x-2 text-[var(--color-text-tertiary)]">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--color-primary)]"></div>
                  <span className="text-sm">Chargement des journaux…</span>
                </div>
              )}

              {/* Vue Cartes */}
              {!isLoadingEntries && viewMode === 'cards' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Carte spéciale Journal tous mouvements */}
                  <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-5 hover:shadow-md transition-all cursor-pointer">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-[var(--color-surface-hover)] flex items-center justify-center">
                          <Archive className="w-5 h-5 text-[var(--color-text-secondary)]" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-[var(--color-text-primary)] text-sm">Journal tous mouvements</h3>
                          <p className="text-xs text-[var(--color-text-tertiary)]">Vue consolidée</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center p-2.5 rounded-lg bg-[var(--color-surface-hover)]">
                          <p className="text-sm font-bold text-[var(--color-text-primary)]">
                            {journaux.reduce((sum, j) => sum + j.entries, 0)}
                          </p>
                          <p className="text-xs text-[var(--color-text-tertiary)]">Total écritures</p>
                        </div>
                        <div className="text-center p-2.5 rounded-lg bg-[var(--color-surface-hover)]">
                          <p className="text-sm font-bold text-[var(--color-text-primary)]">
                            {formatCurrency(journaux.reduce((sum, j) => sum + j.totalDebit, 0))}
                          </p>
                          <p className="text-xs text-[var(--color-text-tertiary)]">
                            {/* tolérance 1 FCFA : l'égalité stricte sur des sommes flottantes affichait
                                « Déséquilibré » pour un écart d'arrondi de quelques centimes */}
                            {Math.abs(journaux.reduce((sum, j) => sum + j.totalDebit, 0) - journaux.reduce((sum, j) => sum + j.totalCredit, 0)) < 1 ? 'Équilibré' : 'Déséquilibré'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border-light)]">
                        <span className="text-xs text-[var(--color-text-tertiary)]">Consolidation en temps réel</span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              const totalDebit = journaux.reduce((sum, j) => sum + j.totalDebit, 0);
                              const totalCredit = journaux.reduce((sum, j) => sum + j.totalCredit, 0);
                              const lastEntry = journaux.reduce((latest, j) => j.lastEntry > latest ? j.lastEntry : latest, '');
                              setSelectedJournal({
                                id: 'tous', code: 'TOUS', libelle: 'Journal tous mouvements', type: 'OD' as const,
                                entries: journaux.reduce((sum, j) => sum + j.entries, 0),
                                totalDebit, totalCredit, lastEntry, color: '#737373'
                              });
                              setActiveTab('journal-view');
                            }}
                            className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                            title="Voir le journal consolidé"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              const totalDebit = journaux.reduce((sum, j) => sum + j.totalDebit, 0);
                              const totalCredit = journaux.reduce((sum, j) => sum + j.totalCredit, 0);
                              const lastEntry = journaux.reduce((latest, j) => j.lastEntry > latest ? j.lastEntry : latest, '');
                              setSelectedJournal({
                                id: 'tous', code: 'TOUS', libelle: 'Journal tous mouvements', type: 'OD' as const,
                                entries: journaux.reduce((sum, j) => sum + j.entries, 0),
                                totalDebit, totalCredit, lastEntry, color: '#737373'
                              });
                              setActiveTab('journal-view');
                            }}
                            className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                            title="Modifier les écritures"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cartes des journaux existants */}
                  {journaux.map((journal) => (
                    <div
                      key={journal.id}
                      className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-5 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-[var(--color-surface-hover)] flex items-center justify-center text-[var(--color-text-secondary)] font-bold text-xs">
                            {journal.code}
                          </div>
                          <div>
                            <h3 className="font-semibold text-[var(--color-text-primary)] text-sm">{journal.libelle}</h3>
                            <p className="text-xs text-[var(--color-text-tertiary)]">Type: {journal.type}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-center p-2.5 rounded-lg bg-[var(--color-surface-hover)]">
                            <p className="text-sm font-bold text-[var(--color-text-primary)]">{journal.entries}</p>
                            <p className="text-xs text-[var(--color-text-tertiary)]">Écritures</p>
                          </div>
                          <div className="text-center p-2.5 rounded-lg bg-[var(--color-surface-hover)]">
                            <p className="text-sm font-bold text-[var(--color-text-primary)]">
                              {formatCurrency(journal.totalCredit)}
                            </p>
                            <p className="text-xs text-[var(--color-text-tertiary)]">{t('accounting.credit')}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border-light)]">
                          <span className="text-xs text-[var(--color-text-tertiary)]">Dernière écriture: {journal.lastEntry}</span>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setSelectedJournal(journal);
                                setActiveTab('journal-view');
                              }}
                              className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                              title="Voir le journal"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedJournal(journal);
                                setActiveTab('journal-view');
                              }}
                              className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                              title="Modifier les écritures"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Vue Table */}
              {!isLoadingEntries && viewMode === 'table' && (
                <div className="bg-white rounded-lg border border-[var(--color-border)]">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[var(--color-surface-hover)]">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Code</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase">{t('accounting.label')}</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Écritures</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">{t('accounting.debit')}</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">{t('accounting.credit')}</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Dernière écriture</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {journaux.every(j => j.entries === 0) && (
                          <tr>
                            <td colSpan={7} className="px-4 py-10 text-center text-sm text-[var(--color-text-tertiary)]">
                              Aucun journal avec des écritures pour la période sélectionnée
                            </td>
                          </tr>
                        )}
                        {journaux.map((journal) => (
                          <React.Fragment key={journal.id}>
                            {/* Ligne du journal principal */}
                            <tr className="hover:bg-[var(--color-surface-hover)]">
                              <td className="px-4 py-4">
                                <div className="flex items-center space-x-3">
                                  {sousJournaux[journal.code as keyof typeof sousJournaux] && (
                                    <button
                                      onClick={() => toggleSubJournals(journal.code)}
                                      className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
                                    >
                                      {showSubJournals[journal.code] ? (
                                        <ChevronDown className="w-4 h-4" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4" />
                                      )}
                                    </button>
                                  )}
                                  <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                                    style={{backgroundColor: journal.color}}
                                  >
                                    {journal.code}
                                  </div>
                                  <span className="font-mono font-bold text-[var(--color-primary)]">{journal.code}</span>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <span className="font-medium text-[var(--color-primary)]">{journal.libelle}</span>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <span className="font-semibold">{journal.entries}</span>
                              </td>
                              <td className="px-4 py-4 text-right">
                                {journal.totalDebit > 0 && (
                                  <span className="text-sm font-mono text-[var(--color-error)]">
                                    {formatCurrency(journal.totalDebit)}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-right">
                                {journal.totalCredit > 0 && (
                                  <span className="text-sm font-mono text-[var(--color-success)]">
                                    {formatCurrency(journal.totalCredit)}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-center">
                                <span className="text-xs text-[var(--color-text-tertiary)]">{journal.lastEntry}</span>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <div className="flex items-center justify-center space-x-2">
                                  <button
                                    onClick={() => {
                                      setSelectedJournal(journal);
                                      setActiveTab('journal-view');
                                    }}
                                    className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors"
                                    title="Voir le journal"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedJournal(journal);
                                      setActiveTab('journal-view');
                                    }}
                                    className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors"
                                    title="Modifier les écritures"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Sous-journaux */}
                            {showSubJournals[journal.code] && sousJournaux[journal.code as keyof typeof sousJournaux]?.map((sousJournal) => (
                              <tr key={sousJournal.id} className="bg-[var(--color-surface-hover)] hover:bg-[var(--color-border-light)]">
                                <td className="px-4 py-3 pl-16">
                                  <div className="flex items-center space-x-3">
                                    <div
                                      className="w-6 h-6 rounded flex items-center justify-center text-white font-bold text-xs"
                                      style={{backgroundColor: sousJournal.color}}
                                    >
                                      {sousJournal.code.slice(-2)}
                                    </div>
                                    <span className="font-mono text-sm text-[var(--color-text-secondary)]">{sousJournal.code}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-sm text-[var(--color-text-secondary)]">{sousJournal.libelle}</span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="text-sm">{sousJournal.entries}</span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className="text-xs text-[var(--color-text-tertiary)]">-</span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className="text-xs text-[var(--color-text-tertiary)]">-</span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="text-xs text-[var(--color-text-tertiary)]">-</span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex items-center justify-center space-x-2">
                                    <button
                                      onClick={() => {
                                        const sousJournalAsJournal = {
                                          ...journal,
                                          id: sousJournal.id,
                                          code: sousJournal.code,
                                          libelle: sousJournal.libelle,
                                          entries: sousJournal.entries
                                        };
                                        setSelectedJournal(sousJournalAsJournal);
                                        setActiveTab('journal-view');
                                      }}
                                      className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors"
                                      title="Voir le sous-journal"
                                    >
                                      <Eye className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        const sousJournalAsJournal = {
                                          ...journal,
                                          id: sousJournal.id,
                                          code: sousJournal.code,
                                          libelle: sousJournal.libelle,
                                          entries: sousJournal.entries
                                        };
                                        setSelectedJournal(sousJournalAsJournal);
                                        setActiveTab('journal-view');
                                      }}
                                      className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors"
                                      title="Modifier le sous-journal"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Journal sélectionné avec reproduction de l'image */}
          {activeTab === 'journal-view' && selectedJournal && (
            <div className="flex gap-0 items-stretch flex-1 min-h-0">
            <div className="flex-1 min-w-0 flex flex-col min-h-0">
              <div className="bg-white rounded-lg border border-[var(--color-border)] flex-1 min-h-0 flex flex-col overflow-hidden">
                {/* Header du journal — zone FIXE du layout (pas de sticky : la table ne
                    glisse plus derrière). Seule la zone en dessous défile. */}
                <div className="bg-[var(--color-surface-hover)] border-b border-[var(--color-border)] flex-shrink-0">
                  {/* Ligne 1: Titre + Actions principales */}
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center space-x-4">
                      <h3 className="text-lg font-bold text-[var(--color-primary)]">
                        <Archive className="w-5 h-5 mr-2" />
                        {selectedJournal?.code === 'TOUS' ? 'Journal tous mouvements' : `Journal ${selectedJournal?.code} - ${selectedJournal?.libelle}`}
                      </h3>
                      <div className="px-3 py-1 bg-[var(--color-primary)] text-[var(--color-text-inverse)] rounded-lg text-sm font-medium">
                        Devise: {companyCurrency}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setActiveTab('journaux')}
                        className="px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-hover)]"
                      >
                        ← Retour
                      </button>
                      <button
                        onClick={() => toast('Export en cours de développement — utilisez le bouton export intégré au tableau ci-dessous')}
                        className="px-4 py-2 bg-[var(--color-success)] text-white rounded-lg text-sm hover:bg-[var(--color-success)] transition-colors flex items-center space-x-2"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>{t('common.export')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Ligne 2: Filtres + Totaux */}
                  <div className="flex items-center justify-between px-3 pb-2 border-t border-[var(--color-border)] pt-2">
                    {/* Filtres à gauche */}
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-[var(--color-text-secondary)]">Du</label>
                        <input
                          type="date"
                          value={dateFrom}
                          onChange={e => setDateFrom(e.target.value)}
                          className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-[var(--color-text-secondary)]">au</label>
                        <input
                          type="date"
                          value={dateTo}
                          onChange={e => setDateTo(e.target.value)}
                          className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-[var(--color-text-secondary)]">{t('accounting.journal')}</label>
                        <select
                          value={journalViewFilter}
                          onChange={e => setJournalViewFilter(e.target.value)}
                          className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                        >
                          <option value="">&lt;tout&gt;</option>
                          {journaux.map(j => (
                            <option key={j.code} value={j.code}>{j.code}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={() => {
                          setAppliedDateFrom(dateFrom);
                          setAppliedDateTo(dateTo);
                        }}
                        className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm hover:bg-[var(--color-primary-hover)] transition-colors font-medium"
                      >
                        Filtrer
                      </button>
                    </div>

                    {/* Totaux à droite */}
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center space-x-2 bg-[var(--color-error-light)] px-3 py-2 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">Débit:</span>
                        <span className="text-lg font-bold text-[var(--color-error)]">{selectedJournalTotals.totalDebit.toFixed(2).replace('.', ',')}</span>
                      </div>
                      <div className="flex items-center space-x-2 bg-[var(--color-success-light)] px-3 py-2 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">Crédit:</span>
                        <span className="text-lg font-bold text-[var(--color-success)]">{selectedJournalTotals.totalCredit.toFixed(2).replace('.', ',')}</span>
                      </div>
                      <div className="flex items-center space-x-2 bg-[var(--color-info-light)] px-3 py-2 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">Équilibre:</span>
                        <span className={`text-lg font-bold ${selectedJournalTotals.balanced ? 'text-[var(--color-info)]' : 'text-[var(--color-error)]'}`}>
                          {selectedJournalTotals.balanced ? '✓' : '⚠'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ZONE DÉFILANTE : table + récapitulatif (l'en-tête au-dessus reste fixe). */}
                <div className="flex-1 min-h-0 overflow-y-auto">
                <PrintableArea
                  documentTitle={`Journal ${selectedJournal?.code || 'TOUS'} - ${new Date().toLocaleDateString('fr-FR')}`}
                  orientation="landscape"
                  showPrintButton={false}
                  headerContent={
                    <div className="text-center mb-4">
                      <h1 className="text-lg font-bold">Journal {selectedJournal?.code || 'TOUS'}</h1>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        Généré le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}
                      </p>
                    </div>
                  }
                  footerContent={
                    <div className="text-center text-xs text-[var(--color-text-tertiary)]">
                      Atlas FnA - Logiciel de Comptabilité
                    </div>
                  }
                >
                  {/* Totaux d'impression — UNIQUEMENT sur le papier (la classe `print-only`
                      n'existait pas en CSS → le bloc doublonnait les pastilles à l'écran). */}
                  <div className="hidden print:flex mb-4 justify-center space-x-6">
                    <div className="text-center">
                      <span className="text-sm font-medium">Total Débit:</span>
                      <span className="ml-2 font-bold">{selectedJournalTotals.totalDebit.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-sm font-medium">Total Crédit:</span>
                      <span className="ml-2 font-bold">{selectedJournalTotals.totalCredit.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-sm font-medium">Équilibre:</span>
                      <span className={`ml-2 font-bold ${selectedJournalTotals.balanced ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
                        {selectedJournalTotals.balanced ? '✓' : '⚠'}
                      </span>
                    </div>
                  </div>

                  {/* Table des écritures avec DataTable */}
                  <DataTable
                    columns={ecrituresColumns as unknown as import('../../components/ui/DataTable').Column<Record<string, unknown>>[]}
                    data={(journalViewFilter
                      ? getEcrituresJournal(journalViewFilter)
                      : getEcrituresJournal(selectedJournal?.code || 'TOUS')
                    ).filter(jvMatch) as unknown as Record<string, unknown>[]}
                    pageSize={15}
                    searchable={true}
                    exportable={true}
                    refreshable={true}
                    printable={true}
                    onPrint={handlePrint}
                    /* La FilterSidebar (à droite) gère déjà le filtrage → on masque
                       l'entonnoir intégré du DataTable pour éviter le doublon. */
                    showColumnFilter={false}
                    actions={(item) => (
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => handleDoubleClickEntry(item)}
                          className="p-1.5 hover:bg-[var(--color-info-light)] rounded transition-colors"
                          title="Modifier cette écriture"
                        >
                          <Edit className="w-3.5 h-3.5 text-[var(--color-info)]" />
                        </button>
                      </div>
                    )}
                    emptyMessage="Aucune écriture trouvée pour ce journal"
                    className="border border-[var(--color-border)] rounded-lg data-table"
                  />
                </PrintableArea>

                {/* Table récapitulative par compte (comme dans l'image) */}
                <div className="mt-6 border-t border-[var(--color-border)]">
                  <div className="flex items-center justify-between p-3 bg-[var(--color-surface-hover)]">
                    <h4 className="text-sm font-medium text-[var(--color-text-secondary)] flex items-center space-x-2">
                      <BarChart3 className="w-4 h-4" />
                      <span>Récapitulatif par compte</span>
                    </h4>
                    <button
                      onClick={() => setShowRecapTable(!showRecapTable)}
                      className="px-3 py-1 bg-[var(--color-primary)] text-[var(--color-text-inverse)] rounded text-xs hover:bg-[var(--color-primary-hover)] transition-colors flex items-center space-x-1"
                    >
                      <span>{showRecapTable ? 'Masquer' : 'Afficher'}</span>
                      {showRecapTable ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  {showRecapTable && (
                    <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
                      <div className="overflow-y-auto max-h-60">
                        <table className="w-full text-sm border-collapse">
                          <thead className="bg-[var(--color-surface-hover)] sticky top-0 z-10">
                            <tr className="text-xs">
                              <th className="px-2 py-2 text-left font-semibold border-r border-[var(--color-border)] w-[80px]">{t('accounting.account')}</th>
                              <th className="px-2 py-2 text-left font-semibold border-r border-[var(--color-border)] min-w-[250px]">Libellé du compte</th>
                              <th className="px-2 py-2 text-right font-semibold border-r border-[var(--color-border)] w-[100px]">{t('accounting.debit')}</th>
                              <th className="px-2 py-2 text-right font-semibold border-r border-[var(--color-border)] w-[100px]">{t('accounting.credit')}</th>
                              <th className="px-2 py-2 text-right font-semibold border-r border-[var(--color-border)] w-[100px]">Solde débit</th>
                              <th className="px-2 py-2 text-right font-semibold w-[100px]">Solde crédit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recapParCompte.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-4 py-6 text-center text-sm text-[var(--color-text-secondary)]">
                                  Aucune écriture pour ce journal
                                </td>
                              </tr>
                            ) : recapParCompte.map((compte, index) => (
                              <tr key={index} className="hover:bg-[var(--color-surface-hover)] border-b border-[var(--color-border)]">
                                <td className="px-2 py-1 text-xs font-mono text-[var(--color-primary)] font-bold border-r border-[var(--color-border)]">{compte.compte}</td>
                                <td className="px-2 py-1 text-xs border-r border-[var(--color-border)]">{compte.libelle}</td>
                                <td className="px-2 py-1 text-xs text-right font-medium text-[var(--color-error)] border-r border-[var(--color-border)]">{compte.debit}</td>
                                <td className="px-2 py-1 text-xs text-right font-medium text-[var(--color-success)] border-r border-[var(--color-border)]">{compte.credit}</td>
                                <td className="px-2 py-1 text-xs text-right font-medium text-[var(--color-error)] border-r border-[var(--color-border)]">{compte.soldeDebit}</td>
                                <td className="px-2 py-1 text-xs text-right font-medium text-[var(--color-success)]">{compte.soldeCredit}</td>
                              </tr>
                            ))}
                            {recapParCompte.length > 0 && (
                              <tr className="bg-[var(--color-surface-hover)] font-bold border-t-2 border-[var(--color-border)]">
                                <td colSpan={2} className="px-2 py-2 text-sm font-bold text-[var(--color-text-secondary)] border-r border-[var(--color-border)]">TOTAL</td>
                                <td className="px-2 py-2 text-right text-sm font-bold text-[var(--color-error)] border-r border-[var(--color-border)]">{selectedJournalTotals.totalDebit.toFixed(2).replace('.', ',')}</td>
                                <td className="px-2 py-2 text-right text-sm font-bold text-[var(--color-success)] border-r border-[var(--color-border)]">{selectedJournalTotals.totalCredit.toFixed(2).replace('.', ',')}</td>
                                <td className="px-2 py-2 text-right text-sm font-bold text-[var(--color-error)] border-r border-[var(--color-border)]">
                                  {selectedJournalTotals.totalDebit > selectedJournalTotals.totalCredit
                                    ? (selectedJournalTotals.totalDebit - selectedJournalTotals.totalCredit).toFixed(2).replace('.', ',')
                                    : ''}
                                </td>
                                <td className="px-2 py-2 text-right text-sm font-bold text-[var(--color-success)]">
                                  {selectedJournalTotals.totalCredit > selectedJournalTotals.totalDebit
                                    ? (selectedJournalTotals.totalCredit - selectedJournalTotals.totalDebit).toFixed(2).replace('.', ',')
                                    : ''}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                </div>{/* fin zone défilante */}

                {/* Footer avec clôture comptable (fixe, sous la zone défilante) */}
                <div className="p-2 bg-[var(--color-surface-hover)] border-t border-[var(--color-border)] text-right flex-shrink-0">
                  <span className="text-xs text-[var(--color-text-secondary)]">Clôture comptable au 31/12</span>
                </div>
              </div>
            </div>
            {/* Barre latérale de filtres (repliable) — le tableau d'origine reste intact. */}
            <FilterSidebar
              screenKey="journal-view"
              filters={jvFilters}
              onChange={setJvFilters}
              journalOptions={journaux.map(j => ({ code: j.code, label: j.libelle }))}
              exercice={{ start: `${new Date().getFullYear()}-01-01`, end: `${new Date().getFullYear()}-12-31` }}
            />
            </div>
          )}
        </div>
      </div>

      {/* Modal Création */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center space-x-2">
                  <Plus className="w-5 h-5" />
                  <span>Création d'un Sous-journal</span>
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">Les 5 journaux principaux SYSCOHADA sont déjà créés</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!newSubJournal.parentCode || !newSubJournal.code || !newSubJournal.libelle) {
                toast.error('Veuillez remplir tous les champs obligatoires');
                return;
              }
              setIsCreatingSubJournal(true);
              try {
                await adapter.create<any>('settings', {
                  key: `subJournal_${newSubJournal.code.toUpperCase()}`,
                  type: 'subJournal',
                  parentCode: newSubJournal.parentCode,
                  code: newSubJournal.code.toUpperCase(),
                  libelle: newSubJournal.libelle,
                  createdAt: new Date().toISOString(),
                });
                toast.success(`Sous-journal ${newSubJournal.code.toUpperCase()} créé avec succès !`);
                setNewSubJournal({ parentCode: '', code: '', libelle: '' });
                setShowCreateModal(false);
              } catch (err) {
                toast.error('Erreur lors de la création : ' + ((err instanceof Error) ? err.message : String(err)));
              } finally {
                setIsCreatingSubJournal(false);
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Journal parent *</label>
                  <select
                    value={newSubJournal.parentCode}
                    onChange={e => setNewSubJournal(prev => ({ ...prev, parentCode: e.target.value }))}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                    required
                  >
                    <option value="">Choisir le journal principal</option>
                    <option value="VE">VE - Journal des Ventes</option>
                    <option value="AC">AC - Journal des Achats</option>
                    <option value="BQ">BQ - Journal de Banque</option>
                    <option value="CA">CA - Journal de Caisse</option>
                    <option value="OD">OD - Opérations Diverses</option>
                    <option value="AN">AN - A-Nouveau</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Code journal *</label>
                    <input
                      type="text"
                      placeholder="ex. VT01, AC01"
                      maxLength={5}
                      value={newSubJournal.code}
                      onChange={e => setNewSubJournal(prev => ({ ...prev, code: e.target.value }))}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nom du journal *</label>
                    <input
                      type="text"
                      placeholder="ex. Ventes Export"
                      value={newSubJournal.libelle}
                      onChange={e => setNewSubJournal(prev => ({ ...prev, libelle: e.target.value }))}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCreatingSubJournal}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-60"
                >
                  {isCreatingSubJournal ? 'Création...' : 'Créer le sous-journal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Consultation d'une écriture VALIDÉE : même wizard à onglets que la saisie
          (Détails / Ventilation / Attachements / Notes / Validation), verrouillé
          automatiquement par son garde d'intangibilité SYSCOHADA. */}
      {wizardEntry && (
        <JournalEntryModal
          isOpen={!!wizardEntry}
          mode="edit"
          initialData={wizardEntry}
          onClose={() => setWizardEntry(null)}
        />
      )}

      {/* Modal Édition Écriture */}
      {showEditEntryModal && selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center space-x-2">
                {entryReadOnly ? <Eye className="w-5 h-5" /> : <Edit className="w-5 h-5" />}
                <span>{entryReadOnly ? "Détail de l'écriture" : "Modifier l'écriture"} {selectedEntry.piece}</span>
              </h3>
              <button
                onClick={() => setShowEditEntryModal(false)}
                className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] text-xl"
              >
                ✕
              </button>
            </div>

            {entryReadOnly && (
              <div className="mb-4 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-center gap-2">
                <Eye className="w-4 h-4" /> Écriture validée — consultation en lecture seule (intangible, SYSCOHADA Art.19).
              </div>
            )}

            {/* Informations de l'écriture */}
            <div className="bg-[var(--color-surface-hover)] rounded-lg p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">N° Mouvement</label>
                  <input
                    type="text"
                    defaultValue={selectedEntry.mvt}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('accounting.journal')}</label>
                  <input
                    type="text"
                    defaultValue={selectedEntry.jnl}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.date')}</label>
                  <input
                    type="text"
                    defaultValue={selectedEntry.date}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">N° Pièce</label>
                  <input
                    type="text"
                    defaultValue={selectedEntry.piece}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Échéance</label>
                  <input
                    type="text"
                    defaultValue={selectedEntry.echeance}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
              </div>
            </div>

            {/* Lignes d'écriture */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium text-[var(--color-text-primary)]">
                  Lignes de l'écriture ({selectedEntryLines.length})
                </h4>
                <button
                  onClick={() => {
                    setSelectedEntryLines(prev => [...prev, {
                      id: undefined as any,
                      mvt: selectedEntry?.mvt ?? '',
                      jnl: selectedEntry?.jnl ?? '',
                      date: selectedEntry?.date ?? '',
                      piece: selectedEntry?.piece ?? '',
                      echeance: '',
                      compte: '',
                      compteLib: '',
                      libelle: '',
                      debit: '',
                      credit: '',
                    }]);
                  }}
                  className="px-3 py-1 bg-[var(--color-primary)] text-white text-sm rounded-lg hover:bg-[var(--color-primary-hover)] flex items-center space-x-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter une ligne</span>
                </button>
              </div>

              {/* Table des lignes d'écriture */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--color-surface-hover)] border-b">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-medium text-[var(--color-text-secondary)]">{t('accounting.account')}</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-[var(--color-text-secondary)]">Libellé compte</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-[var(--color-text-secondary)]">{t('accounting.label')}</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-[var(--color-text-secondary)]">Code Analytique</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-gray-700">{t('accounting.debit')}</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-gray-700">{t('accounting.credit')}</th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-700">Note</th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {/* Afficher toutes les lignes de l'écriture */}
                    {selectedEntryLines.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                          Aucune ligne trouvée pour cette écriture
                        </td>
                      </tr>
                    ) : entryReadOnly ? (
                      /* LECTURE SEULE : même mise en page que le formulaire de saisie,
                         mais en texte propre (pas d'inputs grisés). */
                      selectedEntryLines.map((line, index) => (
                        <tr key={index} className="hover:bg-[var(--color-surface-hover)]">
                          <td className="px-3 py-2 font-mono text-sm text-[var(--color-primary)]">{line.compte}</td>
                          <td className="px-3 py-2 text-sm text-[var(--color-text-secondary)]">{line.compteLib || '—'}</td>
                          <td className="px-3 py-2 text-sm">{line.libelle}</td>
                          <td className="px-3 py-2 text-sm text-[var(--color-text-tertiary)]">{(line as any).centreAnalytique || '—'}</td>
                          {/* les montants arrivent en CHAÎNES formatées ("1 530 612") → parser comme le tfoot */}
                          <td className="px-3 py-2 text-right font-mono text-sm text-[var(--color-error)]">
                            {(() => { const v = parseFloat(String(line.debit ?? '').replace(/\s/g, '') || '0'); return v > 0 ? formatCurrency(v) : ''; })()}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-sm text-[var(--color-success)]">
                            {(() => { const v = parseFloat(String(line.credit ?? '').replace(/\s/g, '') || '0'); return v > 0 ? formatCurrency(v) : ''; })()}
                          </td>
                          <td className="px-2 py-2"></td>
                          <td className="px-2 py-2"></td>
                        </tr>
                      ))
                    ) : (
                      selectedEntryLines.map((line, index) => (
                      <tr key={index}>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={line.compte}
                            onChange={e => setSelectedEntryLines(ls => ls.map((l, i) => i === index ? { ...l, compte: e.target.value } : l))}
                            className="w-full px-2 py-1 border border-[var(--color-border)] rounded text-sm font-mono"
                            placeholder={t('accounting.account')}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={line.compteLib}
                            onChange={e => setSelectedEntryLines(ls => ls.map((l, i) => i === index ? { ...l, compteLib: e.target.value } : l))}
                            className="w-full px-2 py-1 border border-[var(--color-border)] rounded text-sm"
                            placeholder="Libellé compte"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={line.libelle}
                            onChange={e => setSelectedEntryLines(ls => ls.map((l, i) => i === index ? { ...l, libelle: e.target.value } : l))}
                            className="w-full px-2 py-1 border border-[var(--color-border)] rounded text-sm"
                            placeholder={t('accounting.label')}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <select
                            className="w-full px-2 py-1 border border-[var(--color-border)] rounded text-sm"
                            value={(line as any).centreAnalytique ?? ''}
                            onChange={e => setSelectedEntryLines(ls => ls.map((l, i) => i === index ? { ...l, centreAnalytique: e.target.value } : l))}
                          >
                            <option value="">Aucun</option>
                            {costCenters.length > 0
                              ? costCenters.map(c => (
                                  <option key={c.code} value={c.code}>{c.code}{c.libelle ? ` - ${c.libelle}` : ''}</option>
                                ))
                              : (
                                /* Fallback par défaut si la table costCenters est absente */
                                <>
                                  <option value="AX001">AX001 - Centre 1</option>
                                  <option value="AX002">AX002 - Centre 2</option>
                                  <option value="AX003">AX003 - Centre 3</option>
                                </>
                              )
                            }
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={line.debit}
                            onChange={e => setSelectedEntryLines(ls => ls.map((l, i) => i === index ? { ...l, debit: e.target.value } : l))}
                            className="w-20 px-2 py-1 border border-[var(--color-border)] rounded text-sm text-right font-mono text-[var(--color-error)]"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={line.credit}
                            onChange={e => setSelectedEntryLines(ls => ls.map((l, i) => i === index ? { ...l, credit: e.target.value } : l))}
                            className="w-20 px-2 py-1 border border-[var(--color-border)] rounded text-sm text-right font-mono text-[var(--color-success)]"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            onClick={() => toast('Fonctionnalité de note en cours de développement')}
                            className="p-1 text-[var(--color-info)] hover:text-[var(--color-info)] hover:bg-[var(--color-info-light)] rounded"
                            title="Ajouter une note"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button className="text-[var(--color-error)] hover:text-[var(--color-error)]" aria-label="Fermer">
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-[var(--color-surface-hover)] border-t-2">
                    <tr>
                      <td colSpan={4} className="px-2 py-2 text-right font-medium text-sm">Totaux :</td>
                      <td className="px-2 py-2 text-right font-mono font-bold text-sm text-[var(--color-error)]">
                        {formatCurrency(selectedEntryLines.reduce((sum, line) => {
                          const debit = parseFloat(line.debit?.replace(/\s/g, '').replace('-', '') || '0');
                          return sum + debit;
                        }, 0))}
                      </td>
                      <td className="px-2 py-2 text-right font-mono font-bold text-sm text-[var(--color-success)]">
                        {formatCurrency(selectedEntryLines.reduce((sum, line) => {
                          const credit = parseFloat(line.credit?.replace(/\s/g, '').replace('-', '') || '0');
                          return sum + credit;
                        }, 0))}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                    <tr>
                      <td colSpan={8} className="px-2 py-2 text-center">
                        {(() => {
                          const totalDebit = selectedEntryLines.reduce((sum, line) => {
                            const debit = parseFloat(line.debit?.replace(/\s/g, '').replace('-', '') || '0');
                            return sum + debit;
                          }, 0);
                          const totalCredit = selectedEntryLines.reduce((sum, line) => {
                            const credit = parseFloat(line.credit?.replace(/\s/g, '').replace('-', '') || '0');
                            return sum + credit;
                          }, 0);
                          return Math.abs(totalDebit - totalCredit) < 0.01 ? (
                            <span className="text-[var(--color-success)] font-medium flex items-center justify-center">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Écriture équilibrée
                            </span>
                          ) : (
                            <span className="text-[var(--color-error)] font-medium flex items-center justify-center">
                              <AlertTriangle className="w-4 h-4 mr-1" />
                              Écriture déséquilibrée (Débit: {formatCurrency(totalDebit)} - Crédit: {formatCurrency(totalCredit)})
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between">
              {/* Actions à gauche */}
              <button
                onClick={() => {
                  if (selectedEntry) {
                    handleReverseEntry(selectedEntry);
                  }
                }}
                disabled={reverseEntryMutation.isPending}
                className="px-4 py-2 bg-[var(--color-warning)] text-white rounded-lg hover:bg-[var(--color-warning)] transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{reverseEntryMutation.isPending ? 'Reversement en cours...' : 'Reverser l\'écriture'}</span>
              </button>

              {/* Actions à droite */}
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowEditEntryModal(false)}
                  className="px-4 py-2 text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  {entryReadOnly ? 'Fermer' : 'Annuler'}
                </button>
                {!entryReadOnly && (
                <button
                  onClick={handleSaveEntry}
                  disabled={isSaving}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-60"
                >
                  {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
                )}
                <button
                  disabled={isValidatingFromModal || entryReadOnly}
                  onClick={async () => {
                    if (!selectedEntry?.id) return;
                    if (isValidatingFromModal) return;
                    setIsValidatingFromModal(true);
                    try {
                      const res = await validerEcriture(adapter, String(selectedEntry.id));
                      if (res.success) {
                        toast.success(`Écriture ${String(selectedEntry.piece ?? '')} validée`);
                        setShowEditEntryModal(false);
                        await reloadData();
                      } else {
                        toast.error(res.error || 'Validation impossible');
                      }
                    } catch (err) {
                      console.error('[JournalsPage] Erreur validation depuis modal :', err);
                      toast.error('Erreur lors de la validation');
                    } finally {
                      setIsValidatingFromModal(false);
                    }
                  }}
                  className="px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success)] transition-colors flex items-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Valider et transférer au journal</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation après enregistrement */}
      {showConfirmationModal && savedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
            {/* Header avec succès */}
            <div className="p-6" style={{ background: 'linear-gradient(135deg, var(--color-success) 0%, var(--color-primary) 100%)' }}>
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10" style={{ color: 'var(--color-success)' }} />
                </div>
              </div>
              <h2 className="text-lg font-bold text-white text-center">
                Écriture enregistrée avec succès !
              </h2>
              <p className="text-white/90 text-center mt-2">
                Votre écriture a été sauvegardée dans le journal {savedEntry.jnl}
              </p>
            </div>

            {/* Détails de l'écriture */}
            <div className="p-3">
              {/* Informations principales */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 uppercase">N° Pièce</label>
                    <div className="text-lg font-bold mt-1" style={{ color: 'var(--color-secondary)' }}>{savedEntry.piece}</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 uppercase">N° Écriture</label>
                    <div className="text-lg font-bold text-gray-800 mt-1">{savedEntry.mvt}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 uppercase">{t('accounting.journal')}</label>
                    <div className="text-lg font-semibold text-gray-800 mt-1">{savedEntry.jnl}</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 uppercase">{t('common.date')}</label>
                    <div className="text-lg font-semibold text-gray-800 mt-1">{savedEntry.date}</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 uppercase">Échéance</label>
                    <div className="text-lg font-semibold text-gray-800 mt-1">{savedEntry.echeance}</div>
                  </div>
                </div>
              </div>

              {/* Détails - Tiers uniquement */}
              <div className="mb-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <label className="text-sm font-semibold text-gray-600 w-24">Tiers :</label>
                    <span className="text-base font-semibold text-gray-800">
                      {savedEntry.tiers || 'Non renseigné'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Statut d'équilibre */}
              <div className="rounded-lg p-3 mb-4" style={{
                backgroundColor: 'var(--color-success-light)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'var(--color-success)'
              }}>
                <div className="flex items-center justify-center" style={{ color: 'var(--color-success)' }}>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span className="font-semibold">Écriture équilibrée</span>
                  <span className="ml-2 text-sm">
                    (Débit = Crédit = {formatCurrency(savedEntry.totalDebit ?? 0)})
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => {
                    setShowConfirmationModal(false);
                    setSavedEntry(null);
                  }}
                  className="px-6 py-3 text-white rounded-lg transition-colors font-semibold"
                  style={{
                    backgroundColor: 'var(--color-secondary)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  Fermer
                </button>
                <button
                  onClick={() => {
                    // Imprimer l'écriture
                    window.print();
                  }}
                  className="px-6 py-3 rounded-lg transition-colors font-semibold flex items-center gap-2"
                  style={{
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    borderColor: 'var(--color-secondary)',
                    color: 'var(--color-secondary)',
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-secondary)';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--color-secondary)';
                  }}
                >
                  <Printer className="w-4 h-4" />
                  Imprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalsPage;