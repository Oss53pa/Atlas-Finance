import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  ShareIcon,
  DocumentDuplicateIcon,
  PlayIcon,
  PauseIcon,
  ClockIcon,
  DocumentTextIcon,
  ChartBarIcon,
  UserIcon,
  TagIcon
} from '@heroicons/react/24/outline';

interface Report {
  id: string;
  name: string;
  code: string;
  type: 'financial' | 'analytical' | 'management' | 'regulatory' | 'operational';
  category: string;
  description: string;
  template: string;
  status: 'active' | 'draft' | 'archived' | 'scheduled';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'on_demand';
  format: 'pdf' | 'excel' | 'word' | 'csv' | 'dashboard';
  lastGenerated: string;
  nextGeneration?: string;
  generatedBy: string;
  owner: string;
  isPublic: boolean;
  isScheduled: boolean;
  views: number;
  downloads: number;
  parameters: string[];
  filters: string[];
  tags: string[];
  createdAt: string;
  lastModified: string;
  estimatedDuration: number; // en minutes
}

const ReportsPage: React.FC = () => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const queryClient = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports', searchTerm, selectedType, selectedCategory, selectedStatus, selectedFormat],
    queryFn: async () => {
      const latestEntry = await db.journalEntries.orderBy('date').reverse().first();
      const now = latestEntry?.date ? latestEntry.date + 'T00:00:00Z' : new Date().toISOString();
      const entryCount = await db.journalEntries.count();

      const catalog: Report[] = [
        { id: 'bilan', name: 'Bilan SYSCOHADA', code: 'BIL-001', type: 'financial', category: 'Comptabilité', description: 'Bilan comptable conforme SYSCOHADA — Actif/Passif', template: 'bilan_syscohada', status: 'active', frequency: 'annual', format: 'pdf', lastGenerated: now, generatedBy: 'system', owner: 'system', isPublic: true, isScheduled: false, views: entryCount, downloads: 0, parameters: ['periode', 'devise'], filters: ['compte'], tags: ['bilan', 'syscohada'], createdAt: now, lastModified: now, estimatedDuration: 5 },
        { id: 'resultat', name: 'Compte de Résultat', code: 'CR-002', type: 'financial', category: 'Comptabilité', description: 'Compte de résultat par nature SYSCOHADA', template: 'compte_resultat', status: 'active', frequency: 'annual', format: 'pdf', lastGenerated: now, generatedBy: 'system', owner: 'system', isPublic: true, isScheduled: false, views: entryCount, downloads: 0, parameters: ['periode'], filters: ['compte'], tags: ['résultat', 'syscohada'], createdAt: now, lastModified: now, estimatedDuration: 5 },
        { id: 'balance', name: 'Balance Générale', code: 'BAL-003', type: 'financial', category: 'Comptabilité', description: 'Balance générale des comptes avec vérification D=C', template: 'balance_generale', status: 'active', frequency: 'monthly', format: 'excel', lastGenerated: now, generatedBy: 'system', owner: 'system', isPublic: true, isScheduled: false, views: entryCount, downloads: 0, parameters: ['periode'], filters: ['compte', 'classe'], tags: ['balance', 'vérification'], createdAt: now, lastModified: now, estimatedDuration: 3 },
        { id: 'grand-livre', name: 'Grand Livre Général', code: 'GL-004', type: 'financial', category: 'Comptabilité', description: 'Grand livre avec soldes progressifs par compte', template: 'grand_livre', status: 'active', frequency: 'monthly', format: 'excel', lastGenerated: now, generatedBy: 'system', owner: 'system', isPublic: true, isScheduled: false, views: entryCount, downloads: 0, parameters: ['periode', 'compte'], filters: ['classe'], tags: ['grand livre', 'détail'], createdAt: now, lastModified: now, estimatedDuration: 5 },
        { id: 'sig', name: 'Soldes Intermédiaires de Gestion', code: 'SIG-005', type: 'analytical', category: 'Analyse', description: 'SIG : MC, VA, EBE, RE, RN — cascade SYSCOHADA', template: 'sig', status: 'active', frequency: 'quarterly', format: 'pdf', lastGenerated: now, generatedBy: 'system', owner: 'system', isPublic: true, isScheduled: false, views: entryCount, downloads: 0, parameters: ['exercice'], filters: [], tags: ['sig', 'analyse'], createdAt: now, lastModified: now, estimatedDuration: 3 },
        { id: 'fec', name: 'Fichier des Écritures Comptables (FEC)', code: 'FEC-006', type: 'regulatory', category: 'Fiscalité', description: 'Export FEC conforme Art. A.47 A-1 LPF — 18 colonnes', template: 'fec_export', status: 'active', frequency: 'annual', format: 'csv', lastGenerated: now, generatedBy: 'system', owner: 'system', isPublic: false, isScheduled: false, views: entryCount, downloads: 0, parameters: ['exercice', 'siren'], filters: [], tags: ['fec', 'fiscal', 'réglementaire'], createdAt: now, lastModified: now, estimatedDuration: 10 },
        { id: 'ratios', name: 'Ratios Financiers', code: 'RAT-007', type: 'analytical', category: 'Analyse', description: 'Ratios de structure, liquidité, rentabilité et activité', template: 'ratios', status: 'active', frequency: 'quarterly', format: 'dashboard', lastGenerated: now, generatedBy: 'system', owner: 'system', isPublic: true, isScheduled: false, views: entryCount, downloads: 0, parameters: ['exercice'], filters: [], tags: ['ratios', 'performance'], createdAt: now, lastModified: now, estimatedDuration: 2 },
        { id: 'budget', name: 'Budget vs Réalisé', code: 'BVR-008', type: 'management', category: 'Budget', description: 'Comparaison budgétaire avec écarts et taux de réalisation', template: 'budget_realise', status: 'active', frequency: 'monthly', format: 'excel', lastGenerated: now, generatedBy: 'system', owner: 'system', isPublic: false, isScheduled: false, views: entryCount, downloads: 0, parameters: ['exercice', 'departement'], filters: ['ecart_seuil'], tags: ['budget', 'contrôle', 'écarts'], createdAt: now, lastModified: now, estimatedDuration: 5 },
        { id: 'tresorerie', name: 'Position de Trésorerie', code: 'TRE-009', type: 'management', category: 'Trésorerie', description: 'Soldes bancaires et disponibilités par compte', template: 'tresorerie', status: 'active', frequency: 'daily', format: 'pdf', lastGenerated: now, generatedBy: 'system', owner: 'system', isPublic: false, isScheduled: false, views: entryCount, downloads: 0, parameters: ['date'], filters: ['compte_bancaire'], tags: ['trésorerie', 'banque'], createdAt: now, lastModified: now, estimatedDuration: 2 },
        { id: 'balance-agee', name: 'Balance Âgée Clients', code: 'BAC-010', type: 'management', category: 'Tiers', description: 'Vieillissement des créances clients par tranche', template: 'balance_agee', status: 'active', frequency: 'monthly', format: 'excel', lastGenerated: now, generatedBy: 'system', owner: 'system', isPublic: false, isScheduled: false, views: entryCount, downloads: 0, parameters: ['date_reference'], filters: ['client'], tags: ['clients', 'créances', 'recouvrement'], createdAt: now, lastModified: now, estimatedDuration: 5 },
      ];

      return catalog.filter(report =>
        (searchTerm === '' ||
         report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         report.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
         report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
         report.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))) &&
        (selectedType === 'all' || report.type === selectedType) &&
        (selectedCategory === 'all' || report.category === selectedCategory) &&
        (selectedStatus === 'all' || report.status === selectedStatus) &&
        (selectedFormat === 'all' || report.format === selectedFormat)
      );
    }
  });

  const generateReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return reportId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    }
  });

  const toggleScheduleMutation = useMutation({
    mutationFn: async ({ reportId, isScheduled }: { reportId: string; isScheduled: boolean }) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { reportId, isScheduled };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    }
  });

  const duplicateReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return reportId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    }
  });

  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return reportId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    }
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'financial': return 'bg-[#171717]/10 text-[#171717]';
      case 'analytical': return 'bg-[#525252]/10 text-[#525252]';
      case 'management': return 'bg-green-100 text-green-800';
      case 'regulatory': return 'bg-orange-100 text-orange-800';
      case 'operational': return 'bg-[#171717]/10 text-[#171717]';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      case 'scheduled': return 'bg-[#171717]/10 text-[#171717]';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf': return <DocumentTextIcon className="h-4 w-4" />;
      case 'excel': return <DocumentArrowDownIcon className="h-4 w-4" />;
      case 'word': return <DocumentTextIcon className="h-4 w-4" />;
      case 'csv': return <DocumentArrowDownIcon className="h-4 w-4" />;
      case 'dashboard': return <ChartBarIcon className="h-4 w-4" />;
      default: return <DocumentTextIcon className="h-4 w-4" />;
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'Quotidien';
      case 'weekly': return 'Hebdomadaire';
      case 'monthly': return 'Mensuel';
      case 'quarterly': return 'Trimestriel';
      case 'annual': return 'Annuel';
      case 'on_demand': return 'À la demande';
      default: return frequency;
    }
  };

  const handleGenerate = (report: Report) => {
    generateReportMutation.mutate(report.id);
  };

  const handleToggleSchedule = (report: Report) => {
    toggleScheduleMutation.mutate({
      reportId: report.id,
      isScheduled: !report.isScheduled
    });
  };

  const handleDuplicate = (report: Report) => {
    duplicateReportMutation.mutate(report.id);
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; report: Report | null }>({
    isOpen: false,
    report: null
  });

  const handleDeleteClick = (report: Report) => {
    setDeleteConfirm({ isOpen: true, report });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm.report) {
      deleteReportMutation.mutate(deleteConfirm.report.id);
      setDeleteConfirm({ isOpen: false, report: null });
    }
  };

  const filteredReports = reports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(reports.length / itemsPerPage);

  const totalReports = reports.length;
  const activeReports = reports.filter(r => r.status === 'active').length;
  const scheduledReports = reports.filter(r => r.isScheduled).length;
  const totalViews = reports.reduce((sum, r) => sum + r.views, 0);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Rapports</h1>
          <p className="text-gray-600">Gestion et génération des rapports d'entreprise</p>
        </div>
        <div className="flex space-x-3">
          <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
            <DocumentArrowDownIcon className="h-5 w-5" />
            <span>Importer Modèle</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#171717] hover:bg-[#171717]/90 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Nouveau Rapport</span>
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Rapports</p>
              <p className="text-lg font-bold text-gray-900">{totalReports}</p>
            </div>
            <div className="h-12 w-12 bg-[#171717]/10 rounded-lg flex items-center justify-center">
              <DocumentTextIcon className="h-6 w-6 text-[#171717]" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rapports Actifs</p>
              <p className="text-lg font-bold text-green-600">{activeReports}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <PlayIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Programmés</p>
              <p className="text-lg font-bold text-[#171717]">{scheduledReports}</p>
            </div>
            <div className="h-12 w-12 bg-[#171717]/10 rounded-lg flex items-center justify-center">
              <ClockIcon className="h-6 w-6 text-[#171717]" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Vues Totales</p>
              <p className="text-lg font-bold text-[#525252]">{totalViews.toLocaleString()}</p>
            </div>
            <div className="h-12 w-12 bg-[#525252]/10 rounded-lg flex items-center justify-center">
              <EyeIcon className="h-6 w-6 text-[#525252]" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-700" />
              <input
                type="text"
                placeholder="Rechercher un rapport..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#171717] focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FunnelIcon className="h-5 w-5" />
              <span>Filtres</span>
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
              >
                <option value="all">Tous les types</option>
                <option value="financial">Financier</option>
                <option value="analytical">Analytique</option>
                <option value="management">Gestion</option>
                <option value="regulatory">Réglementaire</option>
                <option value="operational">Opérationnel</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
              >
                <option value="all">Toutes les catégories</option>
                <option value="Comptabilité">{t('accounting.title')}</option>
                <option value="Commercial">Commercial</option>
                <option value="Analytique">Analytique</option>
                <option value="Fiscalité">Fiscalité</option>
                <option value="Budget">{t('navigation.budget')}</option>
                <option value="Trésorerie">{t('navigation.treasury')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actif</option>
                <option value="draft">{t('accounting.draft')}</option>
                <option value="archived">Archivé</option>
                <option value="scheduled">Programmé</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
              >
                <option value="all">Tous les formats</option>
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
                <option value="word">Word</option>
                <option value="csv">CSV</option>
                <option value="dashboard">{t('dashboard.title')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Actions</label>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedType('all');
                  setSelectedCategory('all');
                  setSelectedStatus('all');
                  setSelectedFormat('all');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Grille des rapports */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3 mb-4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
              <div className="mt-4 flex justify-between">
                <div className="h-8 bg-gray-200 rounded w-20"></div>
                <div className="flex space-x-2">
                  <div className="h-8 w-8 bg-gray-200 rounded"></div>
                  <div className="h-8 w-8 bg-gray-200 rounded"></div>
                  <div className="h-8 w-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))
        ) : filteredReports.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <DocumentTextIcon className="h-12 w-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-700">Aucun rapport trouvé</p>
          </div>
        ) : (
          filteredReports.map((report) => (
            <div key={report.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              {/* En-tête de la carte */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <div className="flex-shrink-0 text-gray-700">
                    {getFormatIcon(report.format)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-medium text-gray-900 truncate">{report.name}</h3>
                    <p className="text-sm text-gray-700">{report.code}</p>
                  </div>
                </div>
                <div className="flex space-x-1 ml-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(report.status)}`}>
                    {report.status === 'active' ? 'Actif' :
                     report.status === 'draft' ? 'Brouillon' :
                     report.status === 'archived' ? 'Archivé' : 'Programmé'}
                  </span>
                  {report.isPublic && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      Public
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{report.description}</p>

              {/* Informations du rapport */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">Type:</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(report.type)}`}>
                    {report.type === 'financial' ? 'Financier' :
                     report.type === 'analytical' ? 'Analytique' :
                     report.type === 'management' ? 'Gestion' :
                     report.type === 'regulatory' ? 'Réglementaire' : 'Opérationnel'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">Fréquence:</span>
                  <span className="text-gray-900">{getFrequencyLabel(report.frequency)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">Durée estimée:</span>
                  <span className="text-gray-900">{report.estimatedDuration} min</span>
                </div>
              </div>

              {/* Statistiques */}
              <div className="flex items-center justify-between text-sm text-gray-700 mb-4">
                <div className="flex items-center">
                  <EyeIcon className="h-4 w-4 mr-1" />
                  {report.views} vues
                </div>
                <div className="flex items-center">
                  <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                  {report.downloads} téléch.
                </div>
                <div className="flex items-center">
                  <TagIcon className="h-4 w-4 mr-1" />
                  {report.tags.length} tags
                </div>
              </div>

              {/* Propriétaire et date */}
              <div className="flex items-center justify-between text-sm text-gray-700 mb-4">
                <div className="flex items-center">
                  <UserIcon className="h-4 w-4 mr-1" />
                  {report.owner}
                </div>
                <div className="flex items-center">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  {new Date(report.lastGenerated).toLocaleDateString('fr-FR')}
                </div>
              </div>

              {/* Prochaine génération si programmé */}
              {report.nextGeneration && (
                <div className="text-xs text-[#171717] mb-4">
                  Prochaine génération: {new Date(report.nextGeneration).toLocaleDateString('fr-FR')} à {new Date(report.nextGeneration).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => handleGenerate(report)}
                  className="bg-[#171717] hover:bg-[#171717]/90 text-white px-3 py-2 rounded text-sm flex items-center space-x-1 transition-colors"
                  disabled={generateReportMutation.isPending}
                >
                  <PlayIcon className="h-4 w-4" />
                  <span>Générer</span>
                </button>

                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedReport(report);
                      setShowViewModal(true);
                    }}
                    className="p-2 text-gray-700 hover:text-[#171717] transition-colors"
                    title="Voir les détails"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleToggleSchedule(report)}
                    className="p-2 text-gray-700 hover:text-[#171717] transition-colors"
                    title={report.isScheduled ? "Désactiver la programmation" : "Activer la programmation"}
                    disabled={toggleScheduleMutation.isPending}
                  >
                    {report.isScheduled ? <PauseIcon className="h-4 w-4" /> : <ClockIcon className="h-4 w-4" />}
                  </button>

                  <button
                    onClick={() => {
                      setSelectedReport(report);
                      setShowEditModal(true);
                    }}
                    className="p-2 text-gray-700 hover:text-[#171717] transition-colors"
                    title={t('common.edit')}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleDuplicate(report)}
                    className="p-2 text-gray-700 hover:text-green-600 transition-colors"
                    title="Dupliquer"
                    disabled={duplicateReportMutation.isPending}
                  >
                    <DocumentDuplicateIcon className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteClick(report)}
                    className="p-2 text-gray-700 hover:text-red-600 transition-colors"
                    title={t('common.delete')}
                    disabled={deleteReportMutation.isPending}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <p className="text-sm text-gray-700">
              Affichage de{' '}
              <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
              {' '}à{' '}
              <span className="font-medium">
                {Math.min(currentPage * itemsPerPage, reports.length)}
              </span>
              {' '}sur{' '}
              <span className="font-medium">{reports.length}</span>
              {' '}rapports
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Précédent
            </button>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">Nouveau Rapport</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-700 hover:text-gray-700"
              >
                <span className="text-xl">&times;</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du rapport <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                    placeholder="Bilan Comptable..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                    placeholder="BCM-001"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                  placeholder="Description détaillée du rapport..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent">
                    <option value="financial">Financier</option>
                    <option value="analytical">Analytique</option>
                    <option value="management">Gestion</option>
                    <option value="regulatory">Réglementaire</option>
                    <option value="operational">Opérationnel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent">
                    <option value="Comptabilité">{t('accounting.title')}</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Analytique">Analytique</option>
                    <option value="Fiscalité">Fiscalité</option>
                    <option value="Budget">{t('navigation.budget')}</option>
                    <option value="Trésorerie">{t('navigation.treasury')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent">
                    <option value="pdf">PDF</option>
                    <option value="excel">Excel</option>
                    <option value="word">Word</option>
                    <option value="csv">CSV</option>
                    <option value="dashboard">{t('dashboard.title')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fréquence</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent">
                    <option value="on_demand">À la demande</option>
                    <option value="daily">Quotidien</option>
                    <option value="weekly">Hebdomadaire</option>
                    <option value="monthly">Mensuel</option>
                    <option value="quarterly">Trimestriel</option>
                    <option value="annual">Annuel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent">
                    <option value="draft">{t('accounting.draft')}</option>
                    <option value="active">Actif</option>
                    <option value="scheduled">Programmé</option>
                    <option value="archived">Archivé</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Durée estimée (min)</label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                    placeholder="15"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modèle de rapport</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                  placeholder="template_name.xlsx"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paramètres (séparés par virgule)</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                    placeholder="periode, comparaison, devise"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Filtres (séparés par virgule)</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                    placeholder="compte, departement, montant_min"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (séparés par virgule)</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                  placeholder="bilan, comptabilité, syscohada"
                />
              </div>

              <div className="flex items-center space-x-6">
                <label className="flex items-center">
                  <input type="checkbox" className="rounded text-[#171717] focus:ring-[#171717]" />
                  <span className="ml-2 text-sm text-gray-700">Rapport public</span>
                </label>

                <label className="flex items-center">
                  <input type="checkbox" className="rounded text-[#171717] focus:ring-[#171717]" />
                  <span className="ml-2 text-sm text-gray-700">Activer la programmation</span>
                </label>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 sticky bottom-0">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Annuler
              </button>
              <button className="px-4 py-2 bg-[#171717] text-white rounded-lg hover:bg-[#171717]/90 transition-colors">
                Créer le rapport
              </button>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">Détails du Rapport</h2>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedReport(null);
                }}
                className="text-gray-700 hover:text-gray-700"
              >
                <span className="text-xl">&times;</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedReport.name}</h3>
                  <p className="text-gray-700 mt-1">{selectedReport.code}</p>
                </div>
                <div className="flex space-x-2">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedReport.status)}`}>
                    {selectedReport.status === 'active' ? 'Actif' :
                     selectedReport.status === 'draft' ? 'Brouillon' :
                     selectedReport.status === 'archived' ? 'Archivé' : 'Programmé'}
                  </span>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getTypeColor(selectedReport.type)}`}>
                    {selectedReport.type === 'financial' ? 'Financier' :
                     selectedReport.type === 'analytical' ? 'Analytique' :
                     selectedReport.type === 'management' ? 'Gestion' :
                     selectedReport.type === 'regulatory' ? 'Réglementaire' : 'Opérationnel'}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                <p className="text-gray-700">{selectedReport.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Informations générales</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Catégorie:</span>
                      <span className="text-gray-900 font-medium">{selectedReport.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Format:</span>
                      <span className="text-gray-900 font-medium">{selectedReport.format.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fréquence:</span>
                      <span className="text-gray-900 font-medium">{getFrequencyLabel(selectedReport.frequency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Durée estimée:</span>
                      <span className="text-gray-900 font-medium">{selectedReport.estimatedDuration} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Propriétaire:</span>
                      <span className="text-gray-900 font-medium">{selectedReport.owner}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Visibilité:</span>
                      <span className="text-gray-900 font-medium">{selectedReport.isPublic ? 'Public' : 'Privé'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Statistiques</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Vues:</span>
                      <span className="text-gray-900 font-medium">{selectedReport.views}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Téléchargements:</span>
                      <span className="text-gray-900 font-medium">{selectedReport.downloads}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dernière génération:</span>
                      <span className="text-gray-900 font-medium">
                        {new Date(selectedReport.lastGenerated).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    {selectedReport.nextGeneration && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Prochaine génération:</span>
                        <span className="text-gray-900 font-medium">
                          {new Date(selectedReport.nextGeneration).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Généré par:</span>
                      <span className="text-gray-900 font-medium">{selectedReport.generatedBy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Programmation:</span>
                      <span className="text-gray-900 font-medium">{selectedReport.isScheduled ? 'Activée' : 'Désactivée'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Configuration</h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-600 text-sm">Modèle:</span>
                    <p className="text-gray-900 font-mono text-sm">{selectedReport.template}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">Paramètres:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedReport.parameters.map((param, idx) => (
                        <span key={idx} className="px-2 py-1 bg-[#171717]/10 text-[#171717] rounded text-sm">
                          {param}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">Filtres:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedReport.filters.map((filter, idx) => (
                        <span key={idx} className="px-2 py-1 bg-[#525252]/10 text-[#525252] rounded text-sm">
                          {filter}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">Tags:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedReport.tags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Créé le {new Date(selectedReport.createdAt).toLocaleDateString('fr-FR')}</span>
                  <span>Modifié le {new Date(selectedReport.lastModified).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-between sticky bottom-0">
              <button
                onClick={() => handleGenerate(selectedReport)}
                className="px-4 py-2 bg-[#171717] text-white rounded-lg hover:bg-[#171717]/90 transition-colors flex items-center space-x-2"
              >
                <PlayIcon className="h-4 w-4" />
                <span>Générer le rapport</span>
              </button>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setShowEditModal(true);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors flex items-center space-x-2"
                >
                  <PencilIcon className="h-4 w-4" />
                  <span>{t('common.edit')}</span>
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedReport(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">Modifier le Rapport</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedReport(null);
                }}
                className="text-gray-700 hover:text-gray-700"
              >
                <span className="text-xl">&times;</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du rapport <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    defaultValue={selectedReport.name}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    defaultValue={selectedReport.code}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  defaultValue={selectedReport.description}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    defaultValue={selectedReport.type}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                  >
                    <option value="financial">Financier</option>
                    <option value="analytical">Analytique</option>
                    <option value="management">Gestion</option>
                    <option value="regulatory">Réglementaire</option>
                    <option value="operational">Opérationnel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                  <select
                    defaultValue={selectedReport.category}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                  >
                    <option value="Comptabilité">{t('accounting.title')}</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Analytique">Analytique</option>
                    <option value="Fiscalité">Fiscalité</option>
                    <option value="Budget">{t('navigation.budget')}</option>
                    <option value="Trésorerie">{t('navigation.treasury')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                  <select
                    defaultValue={selectedReport.format}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                  >
                    <option value="pdf">PDF</option>
                    <option value="excel">Excel</option>
                    <option value="word">Word</option>
                    <option value="csv">CSV</option>
                    <option value="dashboard">{t('dashboard.title')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fréquence</label>
                  <select
                    defaultValue={selectedReport.frequency}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                  >
                    <option value="on_demand">À la demande</option>
                    <option value="daily">Quotidien</option>
                    <option value="weekly">Hebdomadaire</option>
                    <option value="monthly">Mensuel</option>
                    <option value="quarterly">Trimestriel</option>
                    <option value="annual">Annuel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select
                    defaultValue={selectedReport.status}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                  >
                    <option value="draft">{t('accounting.draft')}</option>
                    <option value="active">Actif</option>
                    <option value="scheduled">Programmé</option>
                    <option value="archived">Archivé</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Durée estimée (min)</label>
                  <input
                    type="number"
                    defaultValue={selectedReport.estimatedDuration}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modèle de rapport</label>
                <input
                  type="text"
                  defaultValue={selectedReport.template}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paramètres (séparés par virgule)</label>
                  <input
                    type="text"
                    defaultValue={selectedReport.parameters.join(', ')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Filtres (séparés par virgule)</label>
                  <input
                    type="text"
                    defaultValue={selectedReport.filters.join(', ')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (séparés par virgule)</label>
                <input
                  type="text"
                  defaultValue={selectedReport.tags.join(', ')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                />
              </div>

              <div className="flex items-center space-x-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    defaultChecked={selectedReport.isPublic}
                    className="rounded text-[#171717] focus:ring-[#171717]"
                  />
                  <span className="ml-2 text-sm text-gray-700">Rapport public</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    defaultChecked={selectedReport.isScheduled}
                    className="rounded text-[#171717] focus:ring-[#171717]"
                  />
                  <span className="ml-2 text-sm text-gray-700">Activer la programmation</span>
                </label>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 sticky bottom-0">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedReport(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Annuler
              </button>
              <button className="px-4 py-2 bg-[#171717] text-white rounded-lg hover:bg-[#171717]/90 transition-colors">
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {showScheduleModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Programmer le Rapport</h2>
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setSelectedReport(null);
                }}
                className="text-gray-700 hover:text-gray-700"
              >
                <span className="text-xl">&times;</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-1">{selectedReport.name}</h3>
                <p className="text-sm text-gray-600">{selectedReport.code}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fréquence <span className="text-red-500">*</span>
                </label>
                <select
                  defaultValue={selectedReport.frequency}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                >
                  <option value="daily">Quotidien</option>
                  <option value="weekly">Hebdomadaire</option>
                  <option value="monthly">Mensuel</option>
                  <option value="quarterly">Trimestriel</option>
                  <option value="annual">Annuel</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de début <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Heure <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin (optionnelle)</label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destinataires (emails séparés par virgule)</label>
                <textarea
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                  placeholder="user1@example.com, user2@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Format de sortie</label>
                <select
                  defaultValue={selectedReport.format}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                >
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
                  <option value="word">Word</option>
                  <option value="csv">CSV</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input type="checkbox" className="rounded text-[#171717] focus:ring-[#171717]" />
                  <span className="ml-2 text-sm text-gray-700">Envoyer par email automatiquement</span>
                </label>

                <label className="flex items-center">
                  <input type="checkbox" className="rounded text-[#171717] focus:ring-[#171717]" />
                  <span className="ml-2 text-sm text-gray-700">Archiver automatiquement après génération</span>
                </label>

                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="rounded text-[#171717] focus:ring-[#171717]" />
                  <span className="ml-2 text-sm text-gray-700">Notifier en cas d'erreur</span>
                </label>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  Le rapport sera généré automatiquement selon la fréquence définie.
                  Vous pouvez modifier ou désactiver la programmation à tout moment.
                </p>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setSelectedReport(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Annuler
              </button>
              <button className="px-4 py-2 bg-[#171717] text-white rounded-lg hover:bg-[#171717]/90 transition-colors">
                Activer la programmation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, report: null })}
        onConfirm={handleConfirmDelete}
        title="Confirmer la suppression"
        message={`Êtes-vous sûr de vouloir supprimer le rapport "${deleteConfirm.report?.name}" ? Cette action est irréversible.`}
        variant="danger"
        confirmText="Supprimer"
        cancelText="Annuler"
        confirmLoading={deleteReportMutation.isPending}
      />
    </div>
  );
};

export default ReportsPage;