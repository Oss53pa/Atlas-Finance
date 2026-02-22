import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, BarChart3, FileText, Plus, Search, Filter, Edit, Eye,
  ArrowLeft, Home, Download, RefreshCw, Calculator, Settings,
  Archive, Printer, FileSpreadsheet, ChevronUp, ChevronDown, ChevronRight,
  RotateCcw, X, CheckCircle, AlertTriangle
} from 'lucide-react';
import JournalDashboard from '../../components/accounting/JournalDashboard';
import DataTable, { Column } from '../../components/ui/DataTable';
import PrintableArea from '../../components/ui/PrintableArea';
import { usePrintReport } from '../../hooks/usePrint';
import { useReverseEntry } from '../../hooks/useAccounting';
import { useLanguage } from '../../contexts/LanguageContext';
import toast from 'react-hot-toast';
import { validerEcriture } from '../../services/entryWorkflow';
import { formatCurrency } from '@/utils/formatters';

interface Journal {
  id: string;
  code: string;
  libelle: string;
  type: 'VT' | 'AC' | 'BQ' | 'CA' | 'OD' | 'AN';
  entries: number;
  totalDebit: number;
  totalCredit: number;
  lastEntry: string;
  color: string;
}

interface EcritureJournal {
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
  const [selectedEntry, setSelectedEntry] = useState<Record<string, unknown> | null>(null);
  const [selectedEntryLines, setSelectedEntryLines] = useState<Record<string, unknown>[]>([]);
  const [showSubJournals, setShowSubJournals] = useState<{[key: string]: boolean}>({});
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [savedEntry, setSavedEntry] = useState<Record<string, unknown> | null>(null);

  // Pour tester le modal via URL: /accounting/journals?test-modal=true
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('test-modal') === 'true') {
      // Données de test pour le modal
      const testEntry = {
        mvt: '001',
        piece: 'FAC-2025-123',
        jnl: 'VT',
        date: '10/09/2025',
        echeance: '10/10/2025',
        tiers: 'CLIENT A',
        lines: [
          { compte: '411000', compteLib: 'Clients', libelle: 'Vente CLIENT A', debit: '150 000', credit: '' },
          { compte: '445671', compteLib: 'TVA collectée', libelle: 'TVA sur vente', debit: '', credit: '30 000' },
          { compte: '701000', compteLib: 'Ventes', libelle: 'Vente marchandises', debit: '', credit: '120 000' }
        ],
        totalDebit: 150000,
        totalCredit: 150000
      };
      setSavedEntry(testEntry);
      setShowConfirmationModal(true);
    }
  }, []);

  // Hook d'impression pour les rapports
  const { printRef, handlePrint, isPrinting, PrintWrapper } = usePrintReport({
    title: `Journal ${selectedJournal?.code || ''} - ${new Date().toLocaleDateString('fr-FR')}`,
    orientation: 'landscape',
    showHeaders: true,
    showFooters: true
  });

  // Hook pour reverser une écriture
  const reverseEntryMutation = useReverseEntry();

  // Configuration des colonnes pour DataTable
  const ecrituresColumns: Column<EcritureJournal>[] = [
    {
      key: 'mvt',
      label: t('accounting.movement'),
      sortable: true,
      filterable: true,
      filterType: 'text',
      width: '60px',
      align: 'center',
      render: (item) => (
        <span className="text-xs font-mono">{item.mvt}</span>
      )
    },
    {
      key: 'jnl',
      label: t('accounting.journal'),
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'VT', label: 'VT' },
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
      key: 'date',
      label: t('common.date'),
      sortable: true,
      filterable: true,
      filterType: 'date',
      width: '80px',
      align: 'center',
      render: (item) => (
        <span className="text-xs">{item.date}</span>
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
    ...(selectedJournal ? [{ id: 'journal-view', label: `📚 ${selectedJournal.code}`, icon: Eye }] : [])
  ];

  // Données journaux SYSCOHADA
  const journaux: Journal[] = [
    {
      id: '1',
      code: 'VT',
      libelle: t('accounting.salesJournal'),
      type: 'VT',
      entries: 156,
      totalDebit: 0,
      totalCredit: 2450000,
      lastEntry: '2025-09-10',
      color: 'var(--color-primary)'
    },
    {
      id: '2',
      code: 'AC',
      libelle: t('accounting.purchaseJournal'),
      type: 'AC',
      entries: 89,
      totalDebit: 1890000,
      totalCredit: 0,
      lastEntry: '2025-09-09',
      color: 'var(--color-primary)'
    },
    {
      id: '3',
      code: 'BQ',
      libelle: t('accounting.bankJournal'),
      type: 'BQ',
      entries: 234,
      totalDebit: 890000,
      totalCredit: 1230000,
      lastEntry: '2025-09-11',
      color: 'var(--color-text-secondary)'
    },
    {
      id: '4',
      code: 'CA',
      libelle: t('accounting.cashJournal'),
      type: 'CA',
      entries: 45,
      totalDebit: 120000,
      totalCredit: 85000,
      lastEntry: '2025-09-08',
      color: 'var(--color-primary-hover)'
    },
    {
      id: '5',
      code: 'OD',
      libelle: t('accounting.miscJournal'),
      type: 'OD',
      entries: 67,
      totalDebit: 340000,
      totalCredit: 340000,
      lastEntry: '2025-09-07',
      color: 'var(--color-primary-hover)'
    },
    {
      id: '6',
      code: 'AN',
      libelle: 'Journal A-Nouveau',
      type: 'AN',
      entries: 0,
      totalDebit: 0,
      totalCredit: 0,
      lastEntry: '',
      color: '#8B6DAF'
    }
  ];

  // Sous-journaux par journal principal
  const sousJournaux = {
    'VT': [
      { id: 'VT01', code: 'VT01', libelle: 'Ventes Export', entries: 45, color: 'var(--color-primary)' },
      { id: 'VT02', code: 'VT02', libelle: 'Ventes Locales', entries: 78, color: 'var(--color-primary)' }
    ],
    'AC': [
      { id: 'AC01', code: 'AC01', libelle: 'Achats Locaux', entries: 32, color: 'var(--color-primary)' },
      { id: 'AC02', code: 'AC02', libelle: 'Achats Import', entries: 25, color: 'var(--color-primary)' }
    ],
    'BQ': [
      { id: 'BQ01', code: 'BQ01', libelle: 'Banque SGBC', entries: 156, color: 'var(--color-text-secondary)' },
      { id: 'BQ02', code: 'BQ02', libelle: 'Banque BOA', entries: 89, color: 'var(--color-text-secondary)' }
    ]
  };

  const toggleSubJournals = (journalCode: string) => {
    setShowSubJournals(prev => ({
      ...prev,
      [journalCode]: !prev[journalCode]
    }));
  };

  const handleDoubleClickEntry = (entry: Record<string, unknown>) => {
    setSelectedEntry(entry);

    // Récupérer toutes les lignes de l'écriture (même numéro de mouvement)
    const allEntries = getEcrituresJournal(entry.jnl);
    const entryLines = allEntries.filter(e => e.mvt === entry.mvt);

    setSelectedEntryLines(entryLines);
    setShowEditEntryModal(true);
  };

  // Fonction pour sauvegarder une écriture modifiée
  const handleSaveEntry = () => {
    if (!selectedEntry || !selectedEntryLines.length) {
      toast.error(t('messages.saveError'));
      return;
    }

    // Vérifier l'équilibre
    const totalDebit = selectedEntryLines.reduce((sum, line) => {
      const debit = parseFloat(line.debit?.replace(/\s/g, '').replace('-', '') || '0');
      return sum + debit;
    }, 0);
    const totalCredit = selectedEntryLines.reduce((sum, line) => {
      const credit = parseFloat(line.credit?.replace(/\s/g, '').replace('-', '') || '0');
      return sum + credit;
    }, 0);

    if (totalDebit !== totalCredit) {
      toast.error(t('validation.mustBalance'));
      return;
    }

    // Sauvegarder l'écriture (appel API ici)
    // Pour le moment, on simule la sauvegarde
    const entryToSave = {
      ...selectedEntry,
      lines: selectedEntryLines,
      totalDebit,
      totalCredit
    };

    // Fermer le modal d'édition
    setShowEditEntryModal(false);

    // Sauvegarder les données pour le modal de confirmation
    setSavedEntry(entryToSave);

    // Afficher le modal de confirmation
    setShowConfirmationModal(true);

    toast.success(t('messages.saveSuccess'));
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
        id: entry.mvt,
        date: todayDate,
        pieceNumber: entry.piece // Conserver le même numéro de pièce
      });

      toast.success(t('messages.saveSuccess'));
      setShowEditEntryModal(false);
    } catch (error: unknown) {
      console.error('Erreur lors du reversement:', error);
      toast.error((error instanceof Error ? error.message : undefined) || t('messages.saveError'));
    }
  };

  // Données d'écritures par journal
  const getEcrituresJournal = (journalCode: string) => {
    switch (journalCode) {
      case 'VT':
        return [
          { mvt: '1', jnl: 'VT', date: '01/03/19', piece: 'FCT2', echeance: '', compte: '701', compteLib: 'Ventes de produits finis', libelle: 'Produit 01 de ma société', debit: '', credit: '100,00' },
          { mvt: '1', jnl: 'VT', date: '01/03/19', piece: 'FCT2', echeance: '', compte: '4457', compteLib: 'TVA collectée', libelle: 'Produit 01 de ma société', debit: '', credit: '20,00' },
          { mvt: '1', jnl: 'VT', date: '01/03/19', piece: 'FCT2', echeance: '06/03/19', compte: '411', compteLib: t('navigation.clients'), libelle: 'Produit 01 de ma société', debit: '120,00', credit: '' },
          { mvt: '6', jnl: 'VT', date: '05/03/19', piece: 'FCT3', echeance: '', compte: '701', compteLib: 'Ventes de produits finis', libelle: 'Vente CLIENT XYZ', debit: '', credit: '200,00' },
          { mvt: '6', jnl: 'VT', date: '05/03/19', piece: 'FCT3', echeance: '', compte: '4457', compteLib: 'TVA collectée', libelle: 'Vente CLIENT XYZ', debit: '', credit: '40,00' },
          { mvt: '6', jnl: 'VT', date: '05/03/19', piece: 'FCT3', echeance: '10/03/19', compte: '411', compteLib: t('navigation.clients'), libelle: 'Vente CLIENT XYZ', debit: '240,00', credit: '' }
        ];
      case 'AC':
        return [
          { mvt: '2', jnl: 'AC', date: '15/11/19', piece: 'FFR1', echeance: '', compte: '601', compteLib: 'Achats stockés - Matières premières', libelle: 'Achat FOURNISSEUR A', debit: '120,00', credit: '' },
          { mvt: '2', jnl: 'AC', date: '15/11/19', piece: 'FFR1', echeance: '', compte: '44566', compteLib: 'TVA déductible sur achats', libelle: 'Achat FOURNISSEUR A', debit: '24,00', credit: '' },
          { mvt: '2', jnl: 'AC', date: '15/11/19', piece: 'FFR1', echeance: '22/11/19', compte: '401', compteLib: t('navigation.suppliers'), libelle: 'Achat FOURNISSEUR A', debit: '', credit: '144,00' },
          { mvt: '4', jnl: 'AC', date: '21/02/19', piece: 'ECR3', echeance: '', compte: '601', compteLib: 'Achats stockés - Matières premières', libelle: 'Achat planches', debit: '133,33', credit: '' },
          { mvt: '4', jnl: 'AC', date: '21/02/19', piece: 'ECR3', echeance: '', compte: '401', compteLib: t('navigation.suppliers'), libelle: 'Achat planches', debit: '', credit: '160,00' },
          { mvt: '4', jnl: 'AC', date: '21/02/19', piece: 'ECR3', echeance: '', compte: '44566', compteLib: 'TVA déductible sur achats', libelle: 'Achat planches', debit: '26,67', credit: '' }
        ];
      case 'BQ':
        return [
          { mvt: '3', jnl: 'BQ', date: '21/02/19', piece: 'ECR3', echeance: '', compte: '401', compteLib: t('navigation.suppliers'), libelle: 'Paiement fournisseur', debit: '160,00', credit: '' },
          { mvt: '3', jnl: 'BQ', date: '21/02/19', piece: 'ECR3', echeance: '', compte: '512', compteLib: 'Banques', libelle: 'Paiement fournisseur', debit: '', credit: '160,00' },
          { mvt: '5', jnl: 'BQ', date: '03/03/19', piece: 'FCT2', echeance: '', compte: '411', compteLib: t('navigation.clients'), libelle: 'Encaissement client', debit: '', credit: '120,00' },
          { mvt: '5', jnl: 'BQ', date: '03/03/19', piece: 'FCT2', echeance: '', compte: '512', compteLib: 'Banques', libelle: 'Encaissement client', debit: '120,00', credit: '' }
        ];
      case 'CA':
        return [
          { mvt: '7', jnl: 'CA', date: '10/01/19', piece: 'CA001', echeance: '', compte: '571', compteLib: 'Caisse', libelle: 'Vente comptant produit 02', debit: '50,00', credit: '' },
          { mvt: '7', jnl: 'CA', date: '10/01/19', piece: 'CA001', echeance: '', compte: '701', compteLib: 'Ventes de produits finis', libelle: 'Vente comptant produit 02', debit: '', credit: '42,00' },
          { mvt: '7', jnl: 'CA', date: '10/01/19', piece: 'CA001', echeance: '', compte: '4457', compteLib: 'TVA collectée', libelle: 'Vente comptant produit 02', debit: '', credit: '8,00' }
        ];
      case 'OD':
        return [
          { mvt: '8', jnl: 'OD', date: '31/12/19', piece: 'OD001', echeance: '', compte: '681', compteLib: 'Dotations aux amortissements', libelle: 'Amortissement matériel', debit: '15,00', credit: '' },
          { mvt: '8', jnl: 'OD', date: '31/12/19', piece: 'OD001', echeance: '', compte: '281', compteLib: 'Amortissements matériel', libelle: 'Amortissement matériel', debit: '', credit: '15,00' }
        ];
      case 'AN':
        return [
          { mvt: '9', jnl: 'AN', date: '01/01/20', piece: 'AN001', echeance: '', compte: '101', compteLib: 'Capital social', libelle: 'Report a nouveau capital', debit: '', credit: '500,00' },
          { mvt: '9', jnl: 'AN', date: '01/01/20', piece: 'AN001', echeance: '', compte: '411', compteLib: 'Clients', libelle: 'Report a nouveau clients', debit: '150,00', credit: '' },
          { mvt: '9', jnl: 'AN', date: '01/01/20', piece: 'AN001', echeance: '', compte: '512', compteLib: 'Banques', libelle: 'Report a nouveau banque', debit: '350,00', credit: '' }
        ];
      case 'TOUS':
      default:
        return [
          { mvt: '1', jnl: 'VT', date: '01/03/19', piece: 'FCT2', echeance: '', compte: '701', compteLib: 'Ventes de produits finis', libelle: 'Produit 01 de ma société', debit: '', credit: '100,00' },
          { mvt: '1', jnl: 'VT', date: '01/03/19', piece: 'FCT2', echeance: '', compte: '4457', compteLib: 'TVA collectée', libelle: 'Produit 01 de ma société', debit: '', credit: '20,00' },
          { mvt: '1', jnl: 'VT', date: '01/03/19', piece: 'FCT2', echeance: '06/03/19', compte: '411', compteLib: t('navigation.clients'), libelle: 'Produit 01 de ma société', debit: '120,00', credit: '' },
          { mvt: '2', jnl: 'AC', date: '15/11/19', piece: 'FFR1', echeance: '', compte: '601', compteLib: 'Achats stockés - Matières premières', libelle: 'Produit 01 de ma société', debit: '120,00', credit: '' },
          { mvt: '2', jnl: 'AC', date: '15/11/19', piece: 'FFR1', echeance: '', compte: '44566', compteLib: 'TVA déductible sur achats', libelle: 'Produit 01 de ma société', debit: '24,00', credit: '' },
          { mvt: '2', jnl: 'AC', date: '15/11/19', piece: 'FFR1', echeance: '22/11/19', compte: '401', compteLib: t('navigation.suppliers'), libelle: 'Produit 01 de ma société', debit: '', credit: '144,00' },
          { mvt: '3', jnl: 'BQ', date: '21/02/19', piece: 'ECR3', echeance: '', compte: '401', compteLib: t('navigation.suppliers'), libelle: 'Achat planches', debit: '160,00', credit: '' },
          { mvt: '3', jnl: 'BQ', date: '21/02/19', piece: 'ECR3', echeance: '', compte: '512', compteLib: 'Banques', libelle: 'Achat planches', debit: '', credit: '160,00' },
          { mvt: '4', jnl: 'AC', date: '21/02/19', piece: 'ECR3', echeance: '', compte: '601', compteLib: 'Achats stockés - Matières premières', libelle: 'Achat planches', debit: '133,33', credit: '' },
          { mvt: '4', jnl: 'AC', date: '21/02/19', piece: 'ECR3', echeance: '', compte: '401', compteLib: t('navigation.suppliers'), libelle: 'Achat planches', debit: '', credit: '160,00' },
          { mvt: '4', jnl: 'AC', date: '21/02/19', piece: 'ECR3', echeance: '', compte: '44566', compteLib: 'TVA déductible sur achats', libelle: 'Achat planches', debit: '26,67', credit: '' },
          { mvt: '5', jnl: 'BQ', date: '03/03/19', piece: 'FCT2', echeance: '', compte: '411', compteLib: t('navigation.clients'), libelle: 'Rgt FC 2 - Produit 01 de ma société', debit: '', credit: '120,00' },
          { mvt: '7', jnl: 'CA', date: '10/01/19', piece: 'CA001', echeance: '', compte: '571', compteLib: 'Caisse', libelle: 'Vente comptant produit 02', debit: '50,00', credit: '' },
          { mvt: '8', jnl: 'OD', date: '31/12/19', piece: 'OD001', echeance: '', compte: '681', compteLib: 'Dotations aux amortissements', libelle: 'Amortissement matériel', debit: '15,00', credit: '' }
        ];
    }
  };

  return (
    <div className="p-6 bg-[#ECECEC] min-h-screen ">
      {/* Header avec navigation */}
      <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/accounting')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-[var(--color-surface-hover)] hover:bg-[var(--color-border-light)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#444444]" />
              <span className="text-sm font-semibold text-[#444444]">{t('accounting.title')}</span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--color-surface-hover)] flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-[var(--color-text-secondary)]" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#191919]">Journaux Comptables</h1>
                <p className="text-sm text-[#767676]">Gestion des journaux SYSCOHADA</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
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
      <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm">
        <div className="px-6 border-b border-[#E8E8E8]">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                      : 'border-transparent text-[#767676] hover:text-[#444444]'
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
        <div className="p-6">
          {/* Dashboard */}
          {activeTab === 'dashboard' && <JournalDashboard />}

          {/* Journaux avec switch */}
          {activeTab === 'journaux' && (
            <div className="space-y-4">
              {/* Header avec switch */}
              <div className="bg-white rounded-lg border border-[#E8E8E8] p-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-[#191919]">📚 Gestion des Journaux</h2>
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

              {/* Vue Cartes */}
              {viewMode === 'cards' && (
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
                          <p className="text-sm font-bold text-[var(--color-text-primary)]">944,00€</p>
                          <p className="text-xs text-[var(--color-text-tertiary)]">Équilibré</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border-light)]">
                        <span className="text-xs text-[var(--color-text-tertiary)]">Consolidation en temps réel</span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              const journalTousMovements = {
                                id: 'tous',
                                code: 'TOUS',
                                libelle: 'Journal tous mouvements',
                                type: 'OD' as const,
                                entries: journaux.reduce((sum, j) => sum + j.entries, 0),
                                totalDebit: 944,
                                totalCredit: 944,
                                lastEntry: '2025-09-11',
                                color: '#737373'
                              };
                              setSelectedJournal(journalTousMovements);
                              setActiveTab('journal-view');
                            }}
                            className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                            title="Voir le journal consolidé"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              const journalTousMovements = {
                                id: 'tous',
                                code: 'TOUS',
                                libelle: 'Journal tous mouvements',
                                type: 'OD' as const,
                                entries: journaux.reduce((sum, j) => sum + j.entries, 0),
                                totalDebit: 944,
                                totalCredit: 944,
                                lastEntry: '2025-09-11',
                                color: '#737373'
                              };
                              setSelectedJournal(journalTousMovements);
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
                              {journal.totalCredit.toLocaleString()}€
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
              {viewMode === 'table' && (
                <div className="bg-white rounded-lg border border-[#E8E8E8]">
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
                                <span className="font-medium text-[#191919]">{journal.libelle}</span>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <span className="font-semibold">{journal.entries}</span>
                              </td>
                              <td className="px-4 py-4 text-right">
                                {journal.totalDebit > 0 && (
                                  <span className="text-sm font-mono text-[var(--color-error)]">
                                    {journal.totalDebit.toLocaleString()}€
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-right">
                                {journal.totalCredit > 0 && (
                                  <span className="text-sm font-mono text-[var(--color-success)]">
                                    {journal.totalCredit.toLocaleString()}€
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-center">
                                <span className="text-xs text-[#767676]">{journal.lastEntry}</span>
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
            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-[#E8E8E8]">
                {/* Header du journal réorganisé */}
                <div className="bg-[var(--color-surface-hover)] border-b border-[var(--color-border)]">
                  {/* Ligne 1: Titre + Actions principales */}
                  <div className="flex items-center justify-between p-4 pb-3">
                    <div className="flex items-center space-x-4">
                      <h3 className="text-lg font-bold text-[#191919]">
                        <Archive className="w-5 h-5 mr-2" />
                        {selectedJournal?.code === 'TOUS' ? 'Journal tous mouvements' : `Journal ${selectedJournal?.code} - ${selectedJournal?.libelle}`}
                      </h3>
                      <div className="px-3 py-1 bg-[var(--color-primary)] text-[var(--color-text-inverse)] rounded-lg text-sm font-medium">
                        Devise: EUR
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setActiveTab('journaux')}
                        className="px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-hover)]"
                      >
                        ← Retour
                      </button>
                      <button className="px-4 py-2 bg-[var(--color-success)] text-white rounded-lg text-sm hover:bg-[var(--color-success)] transition-colors flex items-center space-x-2">
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>{t('common.export')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Ligne 2: Filtres + Totaux */}
                  <div className="flex items-center justify-between px-4 pb-4 border-t border-[var(--color-border)] pt-3">
                    {/* Filtres à gauche */}
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-[var(--color-text-secondary)]">Du</label>
                        <input
                          type="date"
                          defaultValue="2019-01-01"
                          className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-[var(--color-text-secondary)]">au</label>
                        <input
                          type="date"
                          defaultValue="2019-12-31"
                          className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-[var(--color-text-secondary)]">{t('accounting.journal')}</label>
                        <select className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]">
                          <option>&lt;tout&gt;</option>
                          <option>VT</option>
                          <option>AC</option>
                          <option>BQ</option>
                          <option>CA</option>
                          <option>OD</option>
                        </select>
                      </div>
                      <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm hover:bg-[var(--color-primary-hover)] transition-colors font-medium">
                        Filtrer
                      </button>
                    </div>

                    {/* Totaux à droite */}
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center space-x-2 bg-[var(--color-error-light)] px-3 py-2 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">Débit:</span>
                        <span className="text-lg font-bold text-[var(--color-error)]">944,00</span>
                      </div>
                      <div className="flex items-center space-x-2 bg-[var(--color-success-light)] px-3 py-2 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">Crédit:</span>
                        <span className="text-lg font-bold text-[var(--color-success)]">944,00</span>
                      </div>
                      <div className="flex items-center space-x-2 bg-[var(--color-info-light)] px-3 py-2 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">Équilibre:</span>
                        <span className="text-lg font-bold text-[var(--color-info)]">✓</span>
                      </div>
                    </div>
                  </div>
                </div>

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
                      Atlas Finance - Logiciel de Comptabilité
                    </div>
                  }
                >
                  {/* Totaux d'impression */}
                  <div className="print-only mb-4 flex justify-center space-x-6">
                    <div className="text-center">
                      <span className="text-sm font-medium">Total Débit:</span>
                      <span className="ml-2 font-bold">944,00</span>
                    </div>
                    <div className="text-center">
                      <span className="text-sm font-medium">Total Crédit:</span>
                      <span className="ml-2 font-bold">944,00</span>
                    </div>
                    <div className="text-center">
                      <span className="text-sm font-medium">Équilibre:</span>
                      <span className="ml-2 font-bold text-[var(--color-success)]">✓</span>
                    </div>
                  </div>

                  {/* Table des écritures avec DataTable */}
                  <DataTable
                    columns={ecrituresColumns}
                    data={getEcrituresJournal(selectedJournal?.code || 'TOUS')}
                    pageSize={15}
                    searchable={true}
                    exportable={true}
                    refreshable={true}
                    printable={true}
                    onPrint={handlePrint}
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
                            {[
                              { compte: '401', libelle: t('navigation.suppliers'), debit: '160,00', credit: '304,00', soldeDebit: '', soldeCredit: '144,00' },
                              { compte: '411', libelle: t('navigation.clients'), debit: '120,00', credit: '360,00', soldeDebit: '', soldeCredit: '240,00' },
                              { compte: '44566', libelle: 'TVA déductible sur achats de biens et services', debit: '50,67', credit: '', soldeDebit: '50,67', soldeCredit: '' },
                              { compte: '4457', libelle: 'TVA collectée', debit: '', credit: '20,00', soldeDebit: '', soldeCredit: '20,00' },
                              { compte: '512', libelle: 'Banques', debit: '360,00', credit: '160,00', soldeDebit: '200,00', soldeCredit: '' },
                              { compte: '601', libelle: 'Achats stockés - Matières premières (et fournitures)', debit: '253,33', credit: '', soldeDebit: '253,33', soldeCredit: '' },
                              { compte: '701', libelle: 'Ventes de produits finis', debit: '', credit: '100,00', soldeDebit: '', soldeCredit: '100,00' }
                            ].map((compte, index) => (
                              <tr key={index} className="hover:bg-[var(--color-surface-hover)] border-b border-[var(--color-border)]">
                                <td className="px-2 py-1 text-xs font-mono text-[var(--color-primary)] font-bold border-r border-[var(--color-border)]">{compte.compte}</td>
                                <td className="px-2 py-1 text-xs border-r border-[var(--color-border)]">{compte.libelle}</td>
                                <td className="px-2 py-1 text-xs text-right font-medium text-[var(--color-error)] border-r border-[var(--color-border)]">{compte.debit}</td>
                                <td className="px-2 py-1 text-xs text-right font-medium text-[var(--color-success)] border-r border-[var(--color-border)]">{compte.credit}</td>
                                <td className="px-2 py-1 text-xs text-right font-medium text-[var(--color-error)] border-r border-[var(--color-border)]">{compte.soldeDebit}</td>
                                <td className="px-2 py-1 text-xs text-right font-medium text-[var(--color-success)]">{compte.soldeCredit}</td>
                              </tr>
                            ))}
                            <tr className="bg-[var(--color-surface-hover)] font-bold border-t-2 border-[var(--color-border)]">
                              <td colSpan={2} className="px-2 py-2 text-sm font-bold text-[var(--color-text-secondary)] border-r border-[var(--color-border)]">TOTAL</td>
                              <td className="px-2 py-2 text-right text-sm font-bold text-[var(--color-error)] border-r border-[var(--color-border)]">944,00</td>
                              <td className="px-2 py-2 text-right text-sm font-bold text-[var(--color-success)] border-r border-[var(--color-border)]">944,00</td>
                              <td className="px-2 py-2 text-right text-sm font-bold text-[var(--color-error)] border-r border-[var(--color-border)]">504,00</td>
                              <td className="px-2 py-2 text-right text-sm font-bold text-[var(--color-success)]">504,00</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer avec clôture comptable */}
                <div className="p-2 bg-[var(--color-surface-hover)] border-t border-[var(--color-border)] text-right">
                  <span className="text-xs text-[var(--color-text-secondary)]">Clôture comptable au 31/12</span>
                </div>
              </div>
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

            <form onSubmit={(e) => {
              e.preventDefault();
              alert('Sous-journal créé avec succès !');
              setShowCreateModal(false);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Journal parent *</label>
                  <select className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]" required>
                    <option value="">Choisir le journal principal</option>
                    <option value="VT">VT - Journal des Ventes</option>
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
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nom du journal *</label>
                    <input
                      type="text"
                      placeholder="ex. Ventes Export"
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
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
                >
                  Créer le sous-journal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Édition Écriture */}
      {showEditEntryModal && selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center space-x-2">
                <Edit className="w-5 h-5" />
                <span>Modifier l'écriture {selectedEntry.piece}</span>
              </h3>
              <button
                onClick={() => setShowEditEntryModal(false)}
                className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] text-xl"
              >
                ✕
              </button>
            </div>

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
                    // Ajouter une nouvelle ligne vide
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
                    ) : (
                      selectedEntryLines.map((line, index) => (
                      <tr key={index}>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            defaultValue={line.compte}
                            className="w-full px-2 py-1 border border-[var(--color-border)] rounded text-sm font-mono"
                            placeholder={t('accounting.account')}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            defaultValue={line.compteLib}
                            className="w-full px-2 py-1 border border-[var(--color-border)] rounded text-sm"
                            placeholder="Libellé compte"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            defaultValue={line.libelle}
                            className="w-full px-2 py-1 border border-[var(--color-border)] rounded text-sm"
                            placeholder={t('accounting.label')}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <select
                            className="w-full px-2 py-1 border border-[var(--color-border)] rounded text-sm"
                            defaultValue=""
                          >
                            <option value="">Aucun</option>
                            <option value="AX001">AX001 - Centre 1</option>
                            <option value="AX002">AX002 - Centre 2</option>
                            <option value="AX003">AX003 - Centre 3</option>
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            defaultValue={line.debit}
                            className="w-20 px-2 py-1 border border-[var(--color-border)] rounded text-sm text-right font-mono text-[var(--color-error)]"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            defaultValue={line.credit}
                            className="w-20 px-2 py-1 border border-[var(--color-border)] rounded text-sm text-right font-mono text-[var(--color-success)]"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
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
                        {selectedEntryLines.reduce((sum, line) => {
                          const debit = parseFloat(line.debit?.replace(/\s/g, '').replace('-', '') || '0');
                          return sum + debit;
                        }, 0).toLocaleString('fr-FR')}
                      </td>
                      <td className="px-2 py-2 text-right font-mono font-bold text-sm text-[var(--color-success)]">
                        {selectedEntryLines.reduce((sum, line) => {
                          const credit = parseFloat(line.credit?.replace(/\s/g, '').replace('-', '') || '0');
                          return sum + credit;
                        }, 0).toLocaleString('fr-FR')}
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
                              Écriture déséquilibrée (Débit: {totalDebit.toLocaleString('fr-FR')} - Crédit: {totalCredit.toLocaleString('fr-FR')})
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
                  Annuler
                </button>
                <button
                  onClick={handleSaveEntry}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
                >
                  Enregistrer les modifications
                </button>
                <button
                  onClick={async () => {
                    if (!selectedEntry?.id) return;
                    const res = await validerEcriture(selectedEntry.id);
                    if (res.success) {
                      toast.success(`Écriture ${selectedEntry.piece} validée`);
                      setShowEditEntryModal(false);
                    } else {
                      toast.error(res.error || 'Validation impossible');
                    }
                  }}
                  className="px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success)] transition-colors flex items-center space-x-2"
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
            <div className="p-6">
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
                    (Débit = Crédit = {savedEntry.totalDebit?.toLocaleString('fr-FR')})
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