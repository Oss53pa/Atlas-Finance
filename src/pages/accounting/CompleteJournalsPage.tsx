import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountingService } from '../../services/modules/accounting.service';
import { toast } from 'react-hot-toast';
import IntelligentEntryForm from '../../components/accounting/IntelligentEntryForm';
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';
import {
  BookOpen, Plus, Search, Filter, Edit, Trash2, Eye,
  Download, Upload, Calendar, FileText, BarChart3,
  ShoppingCart, Users, Banknote, CreditCard, RefreshCw,
  AlertCircle, CheckCircle, Lock, Unlock, X, Save,
  ChevronRight, Settings, Info, TrendingUp, TrendingDown
} from 'lucide-react';
import { LoadingSpinner } from '../../components/ui';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Journal {
  id: string;
  code: string;
  libelle: string;
  type: 'HA' | 'VE' | 'BQ' | 'CA' | 'OD' | 'AN' | 'RAN' | 'EX';
  description: string;
  nb_ecritures: number;
  dernier_numero: number;
  solde_debiteur: number;
  solde_crediteur: number;
  status: 'active' | 'closed' | 'locked';
  periode_ouverture: string;
  last_entry_date: string;
  icon: React.ReactNode;
  color: string;
}

interface JournalEntry {
  id: string;
  journalCode: string;
  numero: number;
  date: string;
  libelle: string;
  reference: string;
  debit: number;
  credit: number;
  compte: string;
  tiers?: string;
  status: 'draft' | 'validated' | 'posted';
}

const CompleteJournalsPage: React.FC = () => {
  const { t } = useLanguage();
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '2024-01-01', end: '2024-12-31' });
  const [selectedJournal, setSelectedJournal] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'closed' | 'locked'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingJournal, setEditingJournal] = useState<Journal | null>(null);
  const [selectedJournalDetails, setSelectedJournalDetails] = useState<Journal | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  const queryClient = useQueryClient();

  // Query pour récupérer les détails du journal
  const { data: journalDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['journal-details', selectedJournalDetails?.id],
    queryFn: () => selectedJournalDetails?.id ? accountingService.getJournalDetails(selectedJournalDetails.id) : null,
    enabled: !!selectedJournalDetails?.id && showDetailsModal,
  });

  // Query pour récupérer les écritures du journal
  const { data: journalEntries: realJournalEntries = [], isLoading: isLoadingEntries } = useQuery({
    queryKey: ['journal-entries', selectedJournalDetails?.code],
    queryFn: () => selectedJournalDetails?.code ? accountingService.getJournalEntries(selectedJournalDetails.code) : [],
    enabled: !!selectedJournalDetails?.code && showDetailsModal,
  });

  // Mutation pour rafraîchir les données
  const refreshMutation = useMutation({
    mutationFn: () => accountingService.getJournals(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journaux'] });
      queryClient.invalidateQueries({ queryKey: ['journal-details'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast.success('Données actualisées');
    },
    onError: () => {
      toast.error('Erreur lors de l\'actualisation');
    },
  });

  // Journaux SYSCOHADA
  const [journals] = useState<Journal[]>([
    {
      id: '1',
      code: 'HA',
      libelle: 'Journal des Achats',
      type: 'HA',
      description: 'Enregistrement de toutes les factures d\'achats et notes de crédit fournisseurs',
      nb_ecritures: 1247,
      dernier_numero: 1247,
      solde_debiteur: 8950000,
      solde_crediteur: 0,
      status: 'active',
      periode_ouverture: '2024-01-01',
      last_entry_date: '2024-11-20',
      icon: <ShoppingCart className="w-5 h-5" />,
      color: 'text-blue-600 bg-blue-100'
    },
    {
      id: '2',
      code: 'VE',
      libelle: 'Journal des Ventes',
      type: 'VE',
      description: 'Enregistrement de toutes les factures de ventes et avoirs clients',
      nb_ecritures: 2156,
      dernier_numero: 2156,
      solde_debiteur: 0,
      solde_crediteur: 12450000,
      status: 'active',
      periode_ouverture: '2024-01-01',
      last_entry_date: '2024-11-20',
      icon: <Banknote className="w-5 h-5" />,
      color: 'text-green-600 bg-green-100'
    },
    {
      id: '3',
      code: 'BQ',
      libelle: 'Journal de Banque',
      type: 'BQ',
      description: 'Mouvements bancaires et règlements',
      nb_ecritures: 892,
      dernier_numero: 892,
      solde_debiteur: 5620000,
      solde_crediteur: 4150000,
      status: 'active',
      periode_ouverture: '2024-01-01',
      last_entry_date: '2024-11-19',
      icon: <CreditCard className="w-5 h-5" />,
      color: 'text-purple-600 bg-purple-100'
    },
    {
      id: '4',
      code: 'CA',
      libelle: 'Journal de Caisse',
      type: 'CA',
      description: 'Mouvements de caisse et espèces',
      nb_ecritures: 456,
      dernier_numero: 456,
      solde_debiteur: 850000,
      solde_crediteur: 720000,
      status: 'active',
      periode_ouverture: '2024-01-01',
      last_entry_date: '2024-11-20',
      icon: <Banknote className="w-5 h-5" />,
      color: 'text-orange-600 bg-orange-100'
    },
    {
      id: '5',
      code: 'OD',
      libelle: 'Opérations Diverses',
      type: 'OD',
      description: 'Écritures diverses, salaires, charges, provisions',
      nb_ecritures: 623,
      dernier_numero: 623,
      solde_debiteur: 3250000,
      solde_crediteur: 3250000,
      status: 'active',
      periode_ouverture: '2024-01-01',
      last_entry_date: '2024-11-18',
      icon: <FileText className="w-5 h-5" />,
      color: 'text-gray-600 bg-gray-100'
    },
    {
      id: '6',
      code: 'AN',
      libelle: 'À Nouveaux',
      type: 'AN',
      description: 'Report à nouveau et écritures d\'ouverture',
      nb_ecritures: 85,
      dernier_numero: 85,
      solde_debiteur: 15620000,
      solde_crediteur: 15620000,
      status: 'locked',
      periode_ouverture: '2024-01-01',
      last_entry_date: '2024-01-01',
      icon: <Calendar className="w-5 h-5" />,
      color: 'text-indigo-600 bg-indigo-100'
    },
    {
      id: '7',
      code: 'RAN',
      libelle: 'Reports Analytiques',
      type: 'RAN',
      description: 'Écritures analytiques et répartitions',
      nb_ecritures: 312,
      dernier_numero: 312,
      solde_debiteur: 0,
      solde_crediteur: 0,
      status: 'active',
      periode_ouverture: '2024-01-01',
      last_entry_date: '2024-11-15',
      icon: <BarChart3 className="w-5 h-5" />,
      color: 'text-teal-600 bg-teal-100'
    },
    {
      id: '8',
      code: 'EX',
      libelle: 'Extourne',
      type: 'EX',
      description: 'Écritures d\'extourne et corrections',
      nb_ecritures: 42,
      dernier_numero: 42,
      solde_debiteur: 125000,
      solde_crediteur: 125000,
      status: 'active',
      periode_ouverture: '2024-01-01',
      last_entry_date: '2024-11-10',
      icon: <RefreshCw className="w-5 h-5" />,
      color: 'text-red-600 bg-red-100'
    }
  ]);

  // Sample entries for selected journal
  const [journalEntries] = useState<JournalEntry[]>([
    {
      id: 'E001',
      journalCode: 'VE',
      numero: 2156,
      date: '2024-11-20',
      libelle: 'Facture Client ABC Corp',
      reference: 'FA2024-1125',
      debit: 0,
      credit: 595000,
      compte: '701100',
      tiers: 'ABC Corp',
      status: 'validated'
    },
    {
      id: 'E002',
      journalCode: 'VE',
      numero: 2155,
      date: '2024-11-20',
      libelle: 'Facture Client XYZ Ltd',
      reference: 'FA2024-1124',
      debit: 0,
      credit: 325000,
      compte: '701100',
      tiers: 'XYZ Ltd',
      status: 'posted'
    }
  ]);

  // Filter journals
  const filteredJournals = useMemo(() => {
    return journals.filter(journal => {
      const matchesSearch = 
        journal.libelle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        journal.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        journal.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || journal.status === filterStatus;
      const matchesJournal = selectedJournal === 'all' || journal.code === selectedJournal;
      
      return matchesSearch && matchesStatus && matchesJournal;
    });
  }, [journals, searchTerm, filterStatus, selectedJournal]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalEntries = journals.reduce((sum, j) => sum + j.nb_ecritures, 0);
    const totalDebit = journals.reduce((sum, j) => sum + j.solde_debiteur, 0);
    const totalCredit = journals.reduce((sum, j) => sum + j.solde_crediteur, 0);
    const activeJournals = journals.filter(j => j.status === 'active').length;

    return {
      totalJournals: journals.length,
      activeJournals,
      totalEntries,
      totalDebit,
      totalCredit,
      balance: totalDebit - totalCredit
    };
  }, [journals]);

  // Chart data
  const entriesEvolutionData = {
    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov'],
    datasets: [
      {
        label: 'Achats',
        data: [112, 125, 118, 135, 142, 128, 145, 152, 138, 142, 125],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      },
      {
        label: 'Ventes',
        data: [185, 192, 205, 198, 215, 225, 210, 218, 195, 205, 215],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4
      },
      {
        label: 'Banque',
        data: [78, 82, 85, 88, 92, 85, 88, 90, 82, 85, 80],
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        tension: 0.4
      }
    ]
  };

  const journalDistributionData = {
    labels: journals.map(j => j.libelle),
    datasets: [{
      data: journals.map(j => j.nb_ecritures),
      backgroundColor: [
        'rgb(59, 130, 246)',
        'rgb(34, 197, 94)',
        'rgb(168, 85, 247)',
        'rgb(251, 146, 60)',
        'rgb(107, 114, 128)',
        'rgb(99, 102, 241)',
        'rgb(20, 184, 166)',
        'rgb(239, 68, 68)'
      ]
    }]
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Actif</span>;
      case 'closed':
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">Fermé</span>;
      case 'locked':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">Verrouillé</span>;
      default:
        return null;
    }
  };

  const getJournalTypeIcon = (type: string) => {
    switch (type) {
      case 'HA': return <ShoppingCart className="w-4 h-4" />;
      case 'VE': return <Banknote className="w-4 h-4" />;
      case 'BQ': return <CreditCard className="w-4 h-4" />;
      case 'CA': return <Banknote className="w-4 h-4" />;
      case 'OD': return <FileText className="w-4 h-4" />;
      case 'AN': return <Calendar className="w-4 h-4" />;
      case 'RAN': return <BarChart3 className="w-4 h-4" />;
      case 'EX': return <RefreshCw className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleCreateJournal = () => {
    setEditingJournal(null);
    setShowCreateModal(true);
  };

  const handleEditJournal = (journal: Journal) => {
    setEditingJournal(journal);
    setShowCreateModal(true);
  };

  const handleViewDetails = (journal: Journal) => {
    setSelectedJournalDetails(journal);
    setShowDetailsModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailsModal(false);
  };

  const handleNewEntry = (journal: Journal) => {
    setSelectedJournalDetails(journal);
    setShowEntryModal(true); // On utilise le formulaire intelligent maintenant
  };

  const handleLockJournal = (journal: Journal) => {
    if (confirm(`Êtes-vous sûr de vouloir ${journal.status === 'locked' ? 'déverrouiller' : 'verrouiller'} le journal ${journal.libelle} ?`)) {
      // Logic to lock/unlock journal
    }
  };

  const handleCloseJournal = (journal: Journal) => {
    if (confirm(`Êtes-vous sûr de vouloir clôturer le journal ${journal.libelle} ?`)) {
      // Logic to close journal
    }
  };

  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
              Journaux Comptables
            </h1>
            <p className="text-[var(--color-text-secondary)]">
              Gestion des journaux SYSCOHADA et saisie des écritures comptables
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-[var(--color-secondary)] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Importer
            </button>
            <button className="px-4 py-2 bg-[var(--color-secondary)] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
              <Download className="w-4 h-4" />
              Exporter
            </button>
            <button 
              onClick={handleCreateJournal}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nouveau Journal
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-[var(--color-card-bg)] rounded-lg p-4 border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-2">
              <BookOpen className="w-5 h-5 text-[var(--color-primary)]" />
              <span className="text-xs text-[var(--color-text-secondary)]">Total</span>
            </div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">
              {stats.totalJournals}
            </div>
            <div className="text-sm text-[var(--color-text-secondary)]">{t('navigation.journals')}</div>
          </div>

          <div className="bg-[var(--color-card-bg)] rounded-lg p-4 border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-xs text-green-600">Actifs</span>
            </div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">
              {stats.activeJournals}
            </div>
            <div className="text-sm text-[var(--color-text-secondary)]">En activité</div>
          </div>

          <div className="bg-[var(--color-card-bg)] rounded-lg p-4 border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-5 h-5 text-blue-500" />
              <span className="text-xs text-[var(--color-text-secondary)]">Écritures</span>
            </div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">
              {stats.totalEntries.toLocaleString()}
            </div>
            <div className="text-sm text-[var(--color-text-secondary)]">Total saisies</div>
          </div>

          <div className="bg-[var(--color-card-bg)] rounded-lg p-4 border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              <span className="text-xs text-orange-600">{t('accounting.debit')}</span>
            </div>
            <div className="text-xl font-bold text-[var(--color-text-primary)]">
              {formatCurrency(stats.totalDebit)}
            </div>
            <div className="text-sm text-[var(--color-text-secondary)]">Total débit</div>
          </div>

          <div className="bg-[var(--color-card-bg)] rounded-lg p-4 border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-2">
              <TrendingDown className="w-5 h-5 text-purple-500" />
              <span className="text-xs text-purple-600">{t('accounting.credit')}</span>
            </div>
            <div className="text-xl font-bold text-[var(--color-text-primary)]">
              {formatCurrency(stats.totalCredit)}
            </div>
            <div className="text-sm text-[var(--color-text-secondary)]">Total crédit</div>
          </div>

          <div className="bg-[var(--color-card-bg)] rounded-lg p-4 border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-5 h-5 text-indigo-500" />
              <span className={`text-xs ${stats.balance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.balance > 0 ? 'Excédent' : 'Déficit'}
              </span>
            </div>
            <div className="text-xl font-bold text-[var(--color-text-primary)]">
              {formatCurrency(Math.abs(stats.balance))}
            </div>
            <div className="text-sm text-[var(--color-text-secondary)]">{t('accounting.balance')}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-secondary)] w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher un journal..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-card-bg)] text-[var(--color-text-primary)]"
              />
            </div>
          </div>
          <select
            value={selectedJournal}
            onChange={(e) => setSelectedJournal(e.target.value)}
            className="px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-card-bg)] text-[var(--color-text-primary)]"
          >
            <option value="all">Tous les journaux</option>
            {journals.map(journal => (
              <option key={journal.id} value={journal.code}>{journal.libelle}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-card-bg)] text-[var(--color-text-primary)]"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actif</option>
            <option value="closed">Fermé</option>
            <option value="locked">Verrouillé</option>
          </select>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-card-bg)] text-[var(--color-text-primary)]"
          >
            <option value="day">{t('common.today')}</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="quarter">Ce trimestre</option>
            <option value="year">Cette année</option>
          </select>
        </div>
      </div>

      {/* Journals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
        {filteredJournals.map(journal => (
          <div key={journal.id} className="bg-[var(--color-card-bg)] rounded-lg border border-[var(--color-border)] hover:shadow-lg transition-shadow">
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${journal.color}`}>
                  {journal.icon}
                </div>
                {getStatusBadge(journal.status)}
              </div>
              
              <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">
                {journal.libelle}
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                {journal.description}
              </p>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">Code:</span>
                  <span className="font-medium text-[var(--color-text-primary)]">{journal.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">Écritures:</span>
                  <span className="font-medium text-[var(--color-text-primary)]">{journal.nb_ecritures}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">Dernier N°:</span>
                  <span className="font-medium text-[var(--color-text-primary)]">{journal.dernier_numero}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">Dernière écriture:</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {new Date(journal.last_entry_date).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <div className="text-xs text-[var(--color-text-secondary)]">{t('accounting.debit')}</div>
                    <div className="font-semibold text-green-600">
                      {formatCurrency(journal.solde_debiteur)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--color-text-secondary)]">{t('accounting.credit')}</div>
                    <div className="font-semibold text-red-600">
                      {formatCurrency(journal.solde_crediteur)}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewDetails(journal)}
                    className="flex-1 px-3 py-1.5 bg-[var(--color-primary)] bg-opacity-10 text-[var(--color-primary)] rounded hover:bg-opacity-20 transition-colors text-sm"
                  >
                    <Eye className="w-4 h-4 inline mr-1" />
                    Voir
                  </button>
                  <button
                    onClick={() => handleNewEntry(journal)}
                    className="flex-1 px-3 py-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors text-sm"
                    disabled={journal.status === 'locked'}
                  >
                    <Plus className="w-4 h-4 inline mr-1" />
                    Saisie
                  </button>
                  <button
                    onClick={() => handleLockJournal(journal)}
                    className="p-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  >
                    {journal.status === 'locked' ? 
                      <Unlock className="w-4 h-4" /> : 
                      <Lock className="w-4 h-4" />
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Évolution des Écritures
          </h3>
          <div style={{ position: 'relative', height: '300px', width: '100%' }}>
            <Line 
              data={entriesEvolutionData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom' as const
                  }
                }
              }} 
            />
          </div>
        </div>

        <div className="bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Répartition par Journal
          </h3>
          <div style={{ position: 'relative', height: '300px', width: '100%' }}>
            <Doughnut 
              data={journalDistributionData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right' as const,
                    labels: {
                      font: {
                        size: 11
                      }
                    }
                  }
                }
              }} 
            />
          </div>
        </div>
      </div>

      {/* Recent Entries Table */}
      <div className="bg-[var(--color-card-bg)] rounded-lg border border-[var(--color-border)]">
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Dernières Écritures
          </h3>
          <button className="text-[var(--color-primary)] hover:underline text-sm">
            Voir tout
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left p-4 font-medium text-[var(--color-text-secondary)]">N°</th>
                <th className="text-left p-4 font-medium text-[var(--color-text-secondary)]">{t('common.date')}</th>
                <th className="text-left p-4 font-medium text-[var(--color-text-secondary)]">{t('accounting.journal')}</th>
                <th className="text-left p-4 font-medium text-[var(--color-text-secondary)]">{t('accounting.label')}</th>
                <th className="text-left p-4 font-medium text-[var(--color-text-secondary)]">{t('accounting.account')}</th>
                <th className="text-right p-4 font-medium text-[var(--color-text-secondary)]">{t('accounting.debit')}</th>
                <th className="text-right p-4 font-medium text-[var(--color-text-secondary)]">{t('accounting.credit')}</th>
                <th className="text-center p-4 font-medium text-[var(--color-text-secondary)]">Statut</th>
              </tr>
            </thead>
            <tbody>
              {journalEntries.map((entry) => (
                <tr key={entry.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-background)]">
                  <td className="p-4 text-[var(--color-text-primary)]">{entry.numero}</td>
                  <td className="p-4 text-[var(--color-text-primary)]">
                    {new Date(entry.date).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-[var(--color-primary)] bg-opacity-10 text-[var(--color-primary)] rounded text-sm">
                      {entry.journalCode}
                    </span>
                  </td>
                  <td className="p-4 text-[var(--color-text-primary)]">{entry.libelle}</td>
                  <td className="p-4 text-[var(--color-text-primary)]">{entry.compte}</td>
                  <td className="p-4 text-right font-medium text-green-600">
                    {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                  </td>
                  <td className="p-4 text-right font-medium text-red-600">
                    {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                  </td>
                  <td className="p-4 text-center">
                    {entry.status === 'validated' && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">{t('accounting.validated')}</span>
                    )}
                    {entry.status === 'posted' && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">Comptabilisé</span>
                    )}
                    {entry.status === 'draft' && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">{t('accounting.draft')}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Journal Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-card-bg)] rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                {editingJournal ? 'Modifier le Journal' : 'Nouveau Journal'}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-[var(--color-background)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  Code du Journal
                </label>
                <input
                  type="text"
                  defaultValue={editingJournal?.code}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-text-primary)]"
                  placeholder="Ex: VE, HA, BQ..."
                  maxLength={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  Libellé
                </label>
                <input
                  type="text"
                  defaultValue={editingJournal?.libelle}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-text-primary)]"
                  placeholder="Nom du journal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  Type de Journal
                </label>
                <select
                  defaultValue={editingJournal?.type || 'OD'}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-text-primary)]"
                >
                  <option value="HA">Achats</option>
                  <option value="VE">Ventes</option>
                  <option value="BQ">Banque</option>
                  <option value="CA">Caisse</option>
                  <option value="OD">Opérations Diverses</option>
                  <option value="AN">À Nouveaux</option>
                  <option value="RAN">Reports Analytiques</option>
                  <option value="EX">Extourne</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  Description
                </label>
                <textarea
                  defaultValue={editingJournal?.description}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-text-primary)]"
                  rows={3}
                  placeholder="Description du journal..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  Statut
                </label>
                <select
                  defaultValue={editingJournal?.status || 'active'}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-text-primary)]"
                >
                  <option value="active">Actif</option>
                  <option value="closed">Fermé</option>
                  <option value="locked">Verrouillé</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  // Logic to save journal
                  setShowCreateModal(false);
                }}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingJournal ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Entry Modal - Formulaire Intelligent */}
      {showEntryModal && selectedJournalDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-card-bg)] rounded-lg w-full max-w-6xl max-h-[95vh] overflow-hidden">
            <div className="p-6 border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
                    Saisie Intelligente d'Écriture
                  </h2>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                    Journal: {selectedJournalDetails.libelle} ({selectedJournalDetails.code}) - Pièce N° {selectedJournalDetails.dernier_numero + 1}
                  </p>
                </div>
                <button
                  onClick={() => setShowEntryModal(false)}
                  className="p-2 hover:bg-[var(--color-background)] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(95vh-100px)]">
              <IntelligentEntryForm
                journalType={{
                  code: selectedJournalDetails.type as any,
                  label: selectedJournalDetails.libelle,
                  comptesPreferes: [],
                  suggestionsAuto: true,
                  champSpecifiques: []
                }}
                onSubmit={(ecritures) => {
                  // TODO: Envoyer les écritures au backend
                  setShowEntryModal(false);
                  alert('Écriture enregistrée avec succès !');
                }}
                onCancel={() => setShowEntryModal(false)}
                companyId="company-1"
                exerciceId="2024"
              />
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedJournalDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            {/* Sticky header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className={`${selectedJournalDetails.color} p-2 rounded-lg`}>
                  {selectedJournalDetails.icon}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Détails du Journal: {selectedJournalDetails.code}
                  </h2>
                  <p className="text-sm text-gray-600">{selectedJournalDetails.libelle}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => refreshMutation.mutate()}
                  disabled={refreshMutation.isPending}
                  className="text-gray-700 hover:text-gray-600 transition-colors mr-2"
                  title="Actualiser les données"
                >
                  {refreshMutation.isPending ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <RefreshCw className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-700 hover:text-gray-700" aria-label="Fermer">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {isLoadingDetails || isLoadingEntries ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="lg" text="Chargement des détails..." />
                </div>
              ) : (
              {/* Journal Information */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Informations générales</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Code:</span>
                      <span className="text-sm font-medium">{selectedJournalDetails.code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Type:</span>
                      <span className="text-sm font-medium">{selectedJournalDetails.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Statut:</span>
                      <span className={`text-sm font-medium ${
                        selectedJournalDetails.status === 'active' ? 'text-green-600' :
                        selectedJournalDetails.status === 'locked' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {selectedJournalDetails.status === 'active' ? 'Actif' :
                         selectedJournalDetails.status === 'locked' ? 'Verrouillé' : 'Clôturé'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Période d'ouverture:</span>
                      <span className="text-sm font-medium">
                        {new Date(selectedJournalDetails.periode_ouverture).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Dernière écriture:</span>
                      <span className="text-sm font-medium">
                        {new Date(selectedJournalDetails.last_entry_date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Statistiques</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Nombre d'écritures:</span>
                      <span className="text-sm font-medium">{journalDetails?.total_ecritures || selectedJournalDetails.nb_ecritures}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Dernier numéro:</span>
                      <span className="text-sm font-medium">{journalDetails?.dernier_numero || selectedJournalDetails.dernier_numero}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Solde débiteur:</span>
                      <span className="text-sm font-medium text-green-600">
                        {(journalDetails?.total_debit || selectedJournalDetails.solde_debiteur).toLocaleString('fr-FR')} XAF
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Solde créditeur:</span>
                      <span className="text-sm font-medium text-blue-600">
                        {(journalDetails?.total_credit || selectedJournalDetails.solde_crediteur).toLocaleString('fr-FR')} XAF
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-sm font-medium text-gray-700">Solde net:</span>
                      <span className="text-sm font-bold">
                        {((journalDetails?.total_debit || selectedJournalDetails.solde_debiteur) - (journalDetails?.total_credit || selectedJournalDetails.solde_crediteur)).toLocaleString('fr-FR')} XAF
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-2">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 mb-1">Description</h4>
                    <p className="text-sm text-blue-800">{selectedJournalDetails.description}</p>
                  </div>
                </div>
              </div>

              {/* Recent Entries */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Écritures récentes</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">N°</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">{t('common.date')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">{t('accounting.label')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Référence</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">{t('accounting.account')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Tiers</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">{t('accounting.debit')}</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">{t('accounting.credit')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(realJournalEntries.length > 0 ? realJournalEntries : journalEntries.filter(entry => entry.journalCode === selectedJournalDetails.code))
                        .slice(0, 10)
                        .map((entry) => (
                          <tr key={entry.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{entry.numero}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {new Date(entry.date).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{entry.libelle}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{entry.reference}</td>
                            <td className="px-4 py-3 text-sm font-mono text-gray-900">{entry.compte}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{entry.tiers || '-'}</td>
                            <td className="px-4 py-3 text-sm text-right text-green-600">
                              {(entry.debit || entry.montant_debit || 0) > 0 ? (entry.debit || entry.montant_debit || 0).toLocaleString('fr-FR') : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-blue-600">
                              {(entry.credit || entry.montant_credit || 0) > 0 ? (entry.credit || entry.montant_credit || 0).toLocaleString('fr-FR') : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                entry.status === 'posted' ? 'bg-green-100 text-green-800' :
                                entry.status === 'validated' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {(entry.status || entry.statut) === 'posted' || (entry.status || entry.statut) === 'comptabilise' ? 'Comptabilisé' :
                                 (entry.status || entry.statut) === 'validated' || (entry.status || entry.statut) === 'valide' ? 'Validé' : 'Brouillon'}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {(realJournalEntries.length === 0 && journalEntries.filter(entry => entry.journalCode === selectedJournalDetails.code).length === 0) && (
                    <div className="text-center py-8 text-gray-700">
                      Aucune écriture trouvée pour ce journal
                    </div>
                  )}
                </div>
              </div>
              )}
            </div>

            {/* Sticky footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg flex justify-between items-center">
              <button
                onClick={() => refreshMutation.mutate()}
                disabled={refreshMutation.isPending}
                className="px-4 py-2 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                {refreshMutation.isPending ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span>{t('common.refresh')}</span>
              </button>

              <div className="text-sm text-gray-600">
                Affichant les 10 écritures les plus récentes
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    handleNewEntry(selectedJournalDetails);
                    setShowDetailsModal(false);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nouvelle écriture</span>
                </button>
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  

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

export default CompleteJournalsPage;
