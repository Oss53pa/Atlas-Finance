import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ShareIcon,
  DocumentDuplicateIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  UserIcon,
  ClockIcon,
  StarIcon,
  LockClosedIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

interface Widget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'gauge' | 'map';
  title: string;
  size: 'small' | 'medium' | 'large';
}

interface Dashboard {
  id: string;
  name: string;
  description: string;
  category: string;
  type: 'personal' | 'shared' | 'public' | 'template';
  status: 'active' | 'draft' | 'archived';
  widgets: Widget[];
  widgetCount: number;
  owner: string;
  sharedWith: string[];
  views: number;
  lastViewed: string;
  lastUpdated: string;
  createdAt: string;
  isStarred: boolean;
  isPublic: boolean;
  refreshRate: number; // en minutes
  layout: 'grid' | 'flow';
  backgroundColor: string;
  tags: string[];
}

const DashboardsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const queryClient = useQueryClient();

  const { data: dashboards = [], isLoading } = useQuery({
    queryKey: ['dashboards', searchTerm, selectedCategory, selectedType, selectedStatus],
    queryFn: async () => {
      const mockDashboards: Dashboard[] = [
        {
          id: '1',
          name: 'Vue d\'ensemble Financière',
          description: 'Indicateurs financiers clés avec tendances et alertes de performance',
          category: 'Finance',
          type: 'shared',
          status: 'active',
          widgets: [
            { id: '1', type: 'metric', title: 'Chiffre d\'affaires', size: 'small' },
            { id: '2', type: 'chart', title: 'Évolution mensuelle', size: 'large' },
            { id: '3', type: 'gauge', title: 'Marge brute', size: 'medium' }
          ],
          widgetCount: 12,
          owner: 'Marie Dubois',
          sharedWith: ['Paul Martin', 'Sophie Koné', 'Jean Kouassi'],
          views: 456,
          lastViewed: '2024-08-25T09:15:00Z',
          lastUpdated: '2024-08-24T16:30:00Z',
          createdAt: '2024-01-15T00:00:00Z',
          isStarred: true,
          isPublic: false,
          refreshRate: 15,
          layout: 'grid',
          backgroundColor: '#ffffff',
          tags: ['finance', 'kpi', 'management']
        },
        {
          id: '2',
          name: 'Performance Commerciale',
          description: 'Métriques de ventes, objectifs et analyse des performances par équipe',
          category: 'Commercial',
          type: 'public',
          status: 'active',
          widgets: [
            { id: '4', type: 'chart', title: 'Ventes par mois', size: 'large' },
            { id: '5', type: 'metric', title: 'Objectifs atteints', size: 'small' }
          ],
          widgetCount: 8,
          owner: 'Jean Kouassi',
          sharedWith: [],
          views: 234,
          lastViewed: '2024-08-25T08:45:00Z',
          lastUpdated: '2024-08-23T14:20:00Z',
          createdAt: '2024-02-01T00:00:00Z',
          isStarred: false,
          isPublic: true,
          refreshRate: 30,
          layout: 'grid',
          backgroundColor: '#f8fafc',
          tags: ['commercial', 'ventes', 'objectifs']
        },
        {
          id: '3',
          name: 'Contrôle de Gestion',
          description: 'Analyse des coûts, rentabilité par projet et centres de coûts',
          category: 'Gestion',
          type: 'personal',
          status: 'active',
          widgets: [
            { id: '6', type: 'table', title: 'Centres de coûts', size: 'large' },
            { id: '7', type: 'chart', title: 'Répartition des charges', size: 'medium' }
          ],
          widgetCount: 15,
          owner: 'Paul Martin',
          sharedWith: [],
          views: 178,
          lastViewed: '2024-08-24T15:45:00Z',
          lastUpdated: '2024-08-22T11:10:00Z',
          createdAt: '2024-01-20T00:00:00Z',
          isStarred: true,
          isPublic: false,
          refreshRate: 60,
          layout: 'flow',
          backgroundColor: '#ffffff',
          tags: ['gestion', 'coûts', 'analytique']
        },
        {
          id: '4',
          name: 'Tableau de Bord RH',
          description: 'Indicateurs ressources humaines, effectifs et performances',
          category: 'RH',
          type: 'shared',
          status: 'active',
          widgets: [
            { id: '8', type: 'metric', title: 'Effectif total', size: 'small' },
            { id: '9', type: 'gauge', title: 'Taux de satisfaction', size: 'medium' }
          ],
          widgetCount: 10,
          owner: 'Sophie Koné',
          sharedWith: ['Marie Dubois'],
          views: 89,
          lastViewed: '2024-08-23T12:20:00Z',
          lastUpdated: '2024-08-20T09:30:00Z',
          createdAt: '2024-03-01T00:00:00Z',
          isStarred: false,
          isPublic: false,
          refreshRate: 120,
          layout: 'grid',
          backgroundColor: '#fef3f2',
          tags: ['rh', 'effectifs', 'performance']
        },
        {
          id: '5',
          name: 'Analyse Budgétaire',
          description: 'Suivi des budgets, écarts et prévisions par département',
          category: 'Budget',
          type: 'draft',
          status: 'draft',
          widgets: [
            { id: '10', type: 'chart', title: 'Budget vs Réalisé', size: 'large' }
          ],
          widgetCount: 6,
          owner: 'Marie Dubois',
          sharedWith: [],
          views: 23,
          lastViewed: '2024-08-22T16:00:00Z',
          lastUpdated: '2024-08-22T16:00:00Z',
          createdAt: '2024-08-15T00:00:00Z',
          isStarred: false,
          isPublic: false,
          refreshRate: 60,
          layout: 'grid',
          backgroundColor: '#ffffff',
          tags: ['budget', 'écarts', 'prévisions']
        },
        {
          id: '6',
          name: 'Modèle Tableau de Bord Financier',
          description: 'Modèle standard pour les tableaux de bord financiers',
          category: 'Templates',
          type: 'template',
          status: 'active',
          widgets: [
            { id: '11', type: 'metric', title: 'CA du mois', size: 'small' },
            { id: '12', type: 'chart', title: 'Tendance trimestrielle', size: 'large' }
          ],
          widgetCount: 8,
          owner: 'Système',
          sharedWith: [],
          views: 145,
          lastViewed: '2024-08-20T10:00:00Z',
          lastUpdated: '2024-07-15T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
          isStarred: false,
          isPublic: true,
          refreshRate: 15,
          layout: 'grid',
          backgroundColor: '#ffffff',
          tags: ['template', 'finance', 'standard']
        }
      ];
      
      return mockDashboards.filter(dashboard =>
        (searchTerm === '' || 
         dashboard.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         dashboard.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
         dashboard.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))) &&
        (selectedCategory === 'all' || dashboard.category === selectedCategory) &&
        (selectedType === 'all' || dashboard.type === selectedType) &&
        (selectedStatus === 'all' || dashboard.status === selectedStatus)
      );
    }
  });

  const toggleStarMutation = useMutation({
    mutationFn: async ({ dashboardId, isStarred }: { dashboardId: string; isStarred: boolean }) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { dashboardId, isStarred };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
    }
  });

  const duplicateDashboardMutation = useMutation({
    mutationFn: async (dashboardId: string) => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return dashboardId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
    }
  });

  const deleteDashboardMutation = useMutation({
    mutationFn: async (dashboardId: string) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return dashboardId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
    }
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'personal': return 'bg-[#6A8A82]/10 text-[#6A8A82]';
      case 'shared': return 'bg-green-100 text-green-800';
      case 'public': return 'bg-[#B87333]/10 text-[#B87333]';
      case 'template': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'personal': return <UserIcon className="h-4 w-4" />;
      case 'shared': return <ShareIcon className="h-4 w-4" />;
      case 'public': return <GlobeAltIcon className="h-4 w-4" />;
      case 'template': return <DocumentDuplicateIcon className="h-4 w-4" />;
      default: return <ChartBarIcon className="h-4 w-4" />;
    }
  };

  const handleToggleStar = (dashboard: Dashboard) => {
    toggleStarMutation.mutate({
      dashboardId: dashboard.id,
      isStarred: !dashboard.isStarred
    });
  };

  const handleDuplicate = (dashboard: Dashboard) => {
    duplicateDashboardMutation.mutate(dashboard.id);
  };

  const handleDelete = (dashboard: Dashboard) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le tableau de bord "${dashboard.name}" ?`)) {
      deleteDashboardMutation.mutate(dashboard.id);
    }
  };

  const filteredDashboards = dashboards.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(dashboards.length / itemsPerPage);

  const totalDashboards = dashboards.length;
  const activeDashboards = dashboards.filter(d => d.status === 'active').length;
  const sharedDashboards = dashboards.filter(d => d.type === 'shared' || d.isPublic).length;
  const totalViews = dashboards.reduce((sum, d) => sum + d.views, 0);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableaux de Bord</h1>
          <p className="text-gray-600">Créez et gérez vos tableaux de bord personnalisés</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <ChartBarIcon className="h-5 w-5" />
            <span>{viewMode === 'grid' ? 'Vue Liste' : 'Vue Grille'}</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#6A8A82] hover:bg-[#6A8A82]/90 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Nouveau Tableau de Bord</span>
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tableaux</p>
              <p className="text-2xl font-bold text-gray-900">{totalDashboards}</p>
            </div>
            <div className="h-12 w-12 bg-[#6A8A82]/10 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="h-6 w-6 text-[#6A8A82]" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Actifs</p>
              <p className="text-2xl font-bold text-green-600">{activeDashboards}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <EyeIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Partagés</p>
              <p className="text-2xl font-bold text-[#B87333]">{sharedDashboards}</p>
            </div>
            <div className="h-12 w-12 bg-[#B87333]/10 rounded-lg flex items-center justify-center">
              <ShareIcon className="h-6 w-6 text-[#B87333]" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Vues Totales</p>
              <p className="text-2xl font-bold text-orange-600">{totalViews.toLocaleString()}</p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <ClockIcon className="h-6 w-6 text-orange-600" />
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
                placeholder="Rechercher un tableau de bord..."
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
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
              >
                <option value="all">Toutes les catégories</option>
                <option value="Finance">Finance</option>
                <option value="Commercial">Commercial</option>
                <option value="Gestion">Gestion</option>
                <option value="RH">RH</option>
                <option value="Budget">Budget</option>
                <option value="Templates">Templates</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
              >
                <option value="all">Tous les types</option>
                <option value="personal">Personnel</option>
                <option value="shared">Partagé</option>
                <option value="public">Public</option>
                <option value="template">Modèle</option>
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
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Actions</label>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                  setSelectedType('all');
                  setSelectedStatus('all');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Contenu principal */}
      {viewMode === 'grid' ? (
        /* Vue Grille */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3 mb-4"></div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="h-6 bg-gray-200 rounded w-8 mx-auto mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-12 mx-auto"></div>
                  </div>
                  <div className="text-center">
                    <div className="h-6 bg-gray-200 rounded w-8 mx-auto mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-12 mx-auto"></div>
                  </div>
                  <div className="text-center">
                    <div className="h-6 bg-gray-200 rounded w-8 mx-auto mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-12 mx-auto"></div>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <div className="h-8 bg-gray-200 rounded flex-1"></div>
                  <div className="h-8 w-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))
          ) : filteredDashboards.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Aucun tableau de bord trouvé</p>
            </div>
          ) : (
            filteredDashboards.map((dashboard) => (
              <div
                key={dashboard.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                style={{ backgroundColor: dashboard.backgroundColor }}
              >
                {/* En-tête de la carte */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <div className="flex-shrink-0 text-gray-400">
                      {getTypeIcon(dashboard.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-medium text-gray-900 truncate">{dashboard.name}</h3>
                      <p className="text-sm text-gray-500">{dashboard.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-2">
                    <button
                      onClick={() => handleToggleStar(dashboard)}
                      className={`p-1 rounded-full transition-colors ${
                        dashboard.isStarred ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'
                      }`}
                    >
                      <StarIcon className={`h-4 w-4 ${dashboard.isStarred ? 'fill-current' : ''}`} />
                    </button>
                    {!dashboard.isPublic && (
                      <LockClosedIcon className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{dashboard.description}</p>

                {/* Badges de statut */}
                <div className="flex items-center space-x-2 mb-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(dashboard.type)}`}>
                    {dashboard.type === 'personal' ? 'Personnel' :
                     dashboard.type === 'shared' ? 'Partagé' :
                     dashboard.type === 'public' ? 'Public' : 'Modèle'}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(dashboard.status)}`}>
                    {dashboard.status === 'active' ? 'Actif' :
                     dashboard.status === 'draft' ? 'Brouillon' : 'Archivé'}
                  </span>
                </div>

                {/* Statistiques */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#6A8A82]">{dashboard.widgetCount}</div>
                    <div className="text-xs text-gray-500">Widgets</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{dashboard.views}</div>
                    <div className="text-xs text-gray-500">Vues</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900">{dashboard.refreshRate}min</div>
                    <div className="text-xs text-gray-500">Refresh</div>
                  </div>
                </div>

                {/* Informations propriétaire */}
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center">
                    <UserIcon className="h-4 w-4 mr-1" />
                    {dashboard.owner}
                  </div>
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    {new Date(dashboard.lastUpdated).toLocaleDateString('fr-FR')}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <button className="bg-[#6A8A82] hover:bg-[#6A8A82]/90 text-white px-4 py-2 rounded text-sm transition-colors flex-1 mr-3">
                    Ouvrir
                  </button>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => {
                        setSelectedDashboard(dashboard);
                        setShowShareModal(true);
                      }}
                      className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                      title="Partager"
                    >
                      <ShareIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedDashboard(dashboard);
                        setShowEditModal(true);
                      }}
                      className="p-2 text-gray-400 hover:text-[#6A8A82] transition-colors"
                      title="Configurer"
                    >
                      <Cog6ToothIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDuplicate(dashboard)}
                      className="p-2 text-gray-400 hover:text-[#6A8A82] transition-colors"
                      title="Dupliquer"
                      disabled={duplicateDashboardMutation.isPending}
                    >
                      <DocumentDuplicateIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(dashboard)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Supprimer"
                      disabled={deleteDashboardMutation.isPending}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Vue Liste */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tableau de Bord
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Widgets
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vues
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Propriétaire
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dernière MAJ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDashboards.map((dashboard) => (
                  <tr key={dashboard.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {dashboard.isStarred && (
                          <StarIcon className="h-4 w-4 text-yellow-500 fill-current mr-2" />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{dashboard.name}</div>
                          <div className="text-sm text-gray-500">{dashboard.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(dashboard.type)}
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(dashboard.type)}`}>
                          {dashboard.type === 'personal' ? 'Personnel' :
                           dashboard.type === 'shared' ? 'Partagé' :
                           dashboard.type === 'public' ? 'Public' : 'Modèle'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {dashboard.widgetCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {dashboard.views}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {dashboard.owner}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(dashboard.lastUpdated).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          className="p-2 text-gray-400 hover:text-[#6A8A82] transition-colors"
                          title="Ouvrir"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDashboard(dashboard);
                            setShowShareModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                          title="Partager"
                        >
                          <ShareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDashboard(dashboard);
                            setShowEditModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-[#6A8A82] transition-colors"
                          title="Configurer"
                        >
                          <Cog6ToothIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <p className="text-sm text-gray-700">
              Affichage de{' '}
              <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
              {' '}à{' '}
              <span className="font-medium">
                {Math.min(currentPage * itemsPerPage, dashboards.length)}
              </span>
              {' '}sur{' '}
              <span className="font-medium">{dashboards.length}</span>
              {' '}tableaux de bord
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

export default DashboardsPage;