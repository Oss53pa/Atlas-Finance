import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
      const mockReports: Report[] = [
        {
          id: '1',
          name: 'Bilan Comptable Mensuel',
          code: 'BCM-001',
          type: 'financial',
          category: 'Comptabilité',
          description: 'Bilan comptable détaillé avec comparaison période précédente et analyse des écarts',
          template: 'bilan_syscohada_template.xlsx',
          status: 'active',
          frequency: 'monthly',
          format: 'pdf',
          lastGenerated: '2024-08-25T10:30:00Z',
          nextGeneration: '2024-09-25T10:30:00Z',
          generatedBy: 'Marie Dubois',
          owner: 'Marie Dubois',
          isPublic: true,
          isScheduled: true,
          views: 245,
          downloads: 89,
          parameters: ['periode', 'comparaison', 'devise'],
          filters: ['compte', 'departement', 'montant_min'],
          tags: ['bilan', 'comptabilité', 'syscohada', 'mensuel'],
          createdAt: '2024-01-15T00:00:00Z',
          lastModified: '2024-08-20T14:15:00Z',
          estimatedDuration: 15
        },
        {
          id: '2',
          name: 'Analyse Performance Commerciale',
          code: 'APC-002',
          type: 'management',
          category: 'Commercial',
          description: 'Rapport détaillé des performances commerciales avec KPI et tendances',
          template: 'performance_commercial_template.xlsx',
          status: 'active',
          frequency: 'weekly',
          format: 'dashboard',
          lastGenerated: '2024-08-25T08:15:00Z',
          nextGeneration: '2024-09-01T08:15:00Z',
          generatedBy: 'Jean Kouassi',
          owner: 'Jean Kouassi',
          isPublic: true,
          isScheduled: true,
          views: 189,
          downloads: 45,
          parameters: ['periode', 'equipe', 'produit'],
          filters: ['vendeur', 'client', 'montant_vente'],
          tags: ['commercial', 'kpi', 'ventes', 'performance'],
          createdAt: '2024-02-01T00:00:00Z',
          lastModified: '2024-08-22T16:30:00Z',
          estimatedDuration: 8
        },
        {
          id: '3',
          name: 'Répartition Centres de Coûts',
          code: 'RCC-003',
          type: 'analytical',
          category: 'Analytique',
          description: 'Analyse détaillée de la répartition des coûts par centre et comparaison budgétaire',
          template: 'centres_couts_template.xlsx',
          status: 'active',
          frequency: 'monthly',
          format: 'excel',
          lastGenerated: '2024-08-24T16:45:00Z',
          nextGeneration: '2024-09-24T16:45:00Z',
          generatedBy: 'Paul Martin',
          owner: 'Paul Martin',
          isPublic: false,
          isScheduled: true,
          views: 67,
          downloads: 23,
          parameters: ['periode', 'centre_cout', 'type_charge'],
          filters: ['montant', 'responsable', 'nature'],
          tags: ['analytique', 'coûts', 'centres', 'budget'],
          createdAt: '2024-01-20T00:00:00Z',
          lastModified: '2024-08-15T11:20:00Z',
          estimatedDuration: 12
        },
        {
          id: '4',
          name: 'État des Déclarations Fiscales',
          code: 'EDF-004',
          type: 'regulatory',
          category: 'Fiscalité',
          description: 'Synthèse des déclarations fiscales avec statuts et échéances',
          template: 'declarations_fiscales_template.pdf',
          status: 'active',
          frequency: 'monthly',
          format: 'pdf',
          lastGenerated: '2024-08-20T14:20:00Z',
          nextGeneration: '2024-09-20T14:20:00Z',
          generatedBy: 'Sophie Koné',
          owner: 'Sophie Koné',
          isPublic: false,
          isScheduled: true,
          views: 123,
          downloads: 67,
          parameters: ['periode', 'type_declaration'],
          filters: ['statut', 'echeance', 'montant'],
          tags: ['fiscalité', 'déclarations', 'regulatory', 'taxes'],
          createdAt: '2024-01-10T00:00:00Z',
          lastModified: '2024-08-18T09:45:00Z',
          estimatedDuration: 20
        },
        {
          id: '5',
          name: 'Suivi Budget vs Réalisé',
          code: 'SBR-005',
          type: 'financial',
          category: 'Budget',
          description: 'Comparaison détaillée entre budgets prévisionnels et réalisations avec analyse des écarts',
          template: 'budget_realise_template.xlsx',
          status: 'draft',
          frequency: 'quarterly',
          format: 'excel',
          lastGenerated: '2024-08-22T11:10:00Z',
          generatedBy: 'Marie Dubois',
          owner: 'Marie Dubois',
          isPublic: false,
          isScheduled: false,
          views: 95,
          downloads: 31,
          parameters: ['trimestre', 'departement', 'type_budget'],
          filters: ['ecart_seuil', 'responsable', 'statut'],
          tags: ['budget', 'prévisionnel', 'écarts', 'contrôle'],
          createdAt: '2024-03-01T00:00:00Z',
          lastModified: '2024-08-22T11:15:00Z',
          estimatedDuration: 25
        },
        {
          id: '6',
          name: 'Rapport Trésorerie',
          code: 'RT-006',
          type: 'financial',
          category: 'Trésorerie',
          description: 'État de la trésorerie avec flux prévisionnels et positions bancaires',
          template: 'tresorerie_template.pdf',
          status: 'scheduled',
          frequency: 'daily',
          format: 'pdf',
          lastGenerated: '2024-08-25T07:00:00Z',
          nextGeneration: '2024-08-26T07:00:00Z',
          generatedBy: 'Marie Dubois',
          owner: 'Marie Dubois',
          isPublic: false,
          isScheduled: true,
          views: 156,
          downloads: 78,
          parameters: ['date', 'compte_bancaire', 'devise'],
          filters: ['type_mouvement', 'montant_min', 'statut'],
          tags: ['trésorerie', 'banque', 'flux', 'quotidien'],
          createdAt: '2024-02-15T00:00:00Z',
          lastModified: '2024-08-24T18:00:00Z',
          estimatedDuration: 5
        }
      ];
      
      return mockReports.filter(report =>
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
      case 'financial': return 'bg-[#6A8A82]/10 text-[#6A8A82]';
      case 'analytical': return 'bg-[#B87333]/10 text-[#B87333]';
      case 'management': return 'bg-green-100 text-green-800';
      case 'regulatory': return 'bg-orange-100 text-orange-800';
      case 'operational': return 'bg-[#6A8A82]/10 text-[#6A8A82]';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      case 'scheduled': return 'bg-[#6A8A82]/10 text-[#6A8A82]';
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

  const handleDelete = (report: Report) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le rapport "${report.name}" ?`)) {
      deleteReportMutation.mutate(report.id);
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
          <h1 className="text-2xl font-bold text-gray-900">Rapports</h1>
          <p className="text-gray-600">Gestion et génération des rapports d'entreprise</p>
        </div>
        <div className="flex space-x-3">
          <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
            <DocumentArrowDownIcon className="h-5 w-5" />
            <span>Importer Modèle</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#6A8A82] hover:bg-[#6A8A82]/90 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
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
              <p className="text-2xl font-bold text-gray-900">{totalReports}</p>
            </div>
            <div className="h-12 w-12 bg-[#6A8A82]/10 rounded-lg flex items-center justify-center">
              <DocumentTextIcon className="h-6 w-6 text-[#6A8A82]" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rapports Actifs</p>
              <p className="text-2xl font-bold text-green-600">{activeReports}</p>
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
              <p className="text-2xl font-bold text-[#6A8A82]">{scheduledReports}</p>
            </div>
            <div className="h-12 w-12 bg-[#6A8A82]/10 rounded-lg flex items-center justify-center">
              <ClockIcon className="h-6 w-6 text-[#6A8A82]" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Vues Totales</p>
              <p className="text-2xl font-bold text-[#B87333]">{totalViews.toLocaleString()}</p>
            </div>
            <div className="h-12 w-12 bg-[#B87333]/10 rounded-lg flex items-center justify-center">
              <EyeIcon className="h-6 w-6 text-[#B87333]" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un rapport..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
              >
                <option value="all">Toutes les catégories</option>
                <option value="Comptabilité">Comptabilité</option>
                <option value="Commercial">Commercial</option>
                <option value="Analytique">Analytique</option>
                <option value="Fiscalité">Fiscalité</option>
                <option value="Budget">Budget</option>
                <option value="Trésorerie">Trésorerie</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actif</option>
                <option value="draft">Brouillon</option>
                <option value="archived">Archivé</option>
                <option value="scheduled">Programmé</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
              >
                <option value="all">Tous les formats</option>
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
                <option value="word">Word</option>
                <option value="csv">CSV</option>
                <option value="dashboard">Tableau de bord</option>
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
            <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Aucun rapport trouvé</p>
          </div>
        ) : (
          filteredReports.map((report) => (
            <div key={report.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              {/* En-tête de la carte */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <div className="flex-shrink-0 text-gray-400">
                    {getFormatIcon(report.format)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-medium text-gray-900 truncate">{report.name}</h3>
                    <p className="text-sm text-gray-500">{report.code}</p>
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
                  <span className="text-gray-500">Type:</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(report.type)}`}>
                    {report.type === 'financial' ? 'Financier' :
                     report.type === 'analytical' ? 'Analytique' :
                     report.type === 'management' ? 'Gestion' :
                     report.type === 'regulatory' ? 'Réglementaire' : 'Opérationnel'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Fréquence:</span>
                  <span className="text-gray-900">{getFrequencyLabel(report.frequency)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Durée estimée:</span>
                  <span className="text-gray-900">{report.estimatedDuration} min</span>
                </div>
              </div>

              {/* Statistiques */}
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
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
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
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
                <div className="text-xs text-[#6A8A82] mb-4">
                  Prochaine génération: {new Date(report.nextGeneration).toLocaleDateString('fr-FR')} à {new Date(report.nextGeneration).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => handleGenerate(report)}
                  className="bg-[#6A8A82] hover:bg-[#6A8A82]/90 text-white px-3 py-2 rounded text-sm flex items-center space-x-1 transition-colors"
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
                    className="p-2 text-gray-400 hover:text-[#6A8A82] transition-colors"
                    title="Voir les détails"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleToggleSchedule(report)}
                    className="p-2 text-gray-400 hover:text-[#6A8A82] transition-colors"
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
                    className="p-2 text-gray-400 hover:text-[#6A8A82] transition-colors"
                    title="Modifier"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleDuplicate(report)}
                    className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                    title="Dupliquer"
                    disabled={duplicateReportMutation.isPending}
                  >
                    <DocumentDuplicateIcon className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(report)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Supprimer"
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
    </div>
  );
};

export default ReportsPage;