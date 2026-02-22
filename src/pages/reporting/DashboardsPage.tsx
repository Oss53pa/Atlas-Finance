import React, { useState, useMemo } from 'react';
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
  const { t } = useLanguage();
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

  // Load fiscal years and journal entries from Dexie
  const { data: fiscalYears = [] } = useQuery({
    queryKey: ['dashboards-fiscal-years'],
    queryFn: () => db.fiscalYears.toArray(),
  });

  const { data: journalEntries = [] } = useQuery({
    queryKey: ['dashboards-journal-entries'],
    queryFn: () => db.journalEntries.toArray(),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['dashboards-accounts'],
    queryFn: () => db.accounts.toArray(),
  });

  const isLoading = fiscalYears === undefined;

  // Build dashboards from real DB data
  const allDashboards: Dashboard[] = useMemo(() => {
    const result: Dashboard[] = [];
    const now = new Date().toISOString();

    // 1. Financial overview dashboard — always present
    const entryCount = journalEntries.length;
    const validatedCount = journalEntries.filter(e => e.status === 'validated' || e.status === 'posted').length;
    result.push({
      id: 'fin-overview',
      name: 'Vue d\'ensemble Financière',
      description: `Indicateurs financiers clés — ${entryCount} écritures, ${validatedCount} validées`,
      category: 'Finance',
      type: 'shared',
      status: 'active',
      widgets: [
        { id: 'w1', type: 'metric', title: 'Chiffre d\'affaires', size: 'small' },
        { id: 'w2', type: 'chart', title: 'Évolution mensuelle', size: 'large' },
        { id: 'w3', type: 'gauge', title: 'Marge brute', size: 'medium' }
      ],
      widgetCount: 3,
      owner: 'Système',
      sharedWith: [],
      views: 0,
      lastViewed: now,
      lastUpdated: now,
      createdAt: now,
      isStarred: true,
      isPublic: true,
      refreshRate: 15,
      layout: 'grid',
      backgroundColor: 'var(--color-background-primary)',
      tags: ['finance', 'kpi', 'management']
    });

    // 2. One dashboard per fiscal year
    for (const fy of fiscalYears) {
      const fyEntries = journalEntries.filter(e => {
        if (!fy.startDate || !fy.endDate) return false;
        return e.date >= fy.startDate && e.date <= fy.endDate;
      });
      result.push({
        id: `fy-${fy.id}`,
        name: `Exercice ${fy.name || fy.code}`,
        description: `${fyEntries.length} écritures du ${fy.startDate || ''} au ${fy.endDate || ''}`,
        category: 'Finance',
        type: 'public',
        status: fy.isClosed ? 'archived' : 'active',
        widgets: [
          { id: `fy-${fy.id}-w1`, type: 'metric', title: 'Écritures', size: 'small' },
          { id: `fy-${fy.id}-w2`, type: 'chart', title: 'Flux mensuels', size: 'large' }
        ],
        widgetCount: 2,
        owner: 'Système',
        sharedWith: [],
        views: 0,
        lastViewed: now,
        lastUpdated: fy.endDate || now,
        createdAt: fy.startDate || now,
        isStarred: false,
        isPublic: true,
        refreshRate: 60,
        layout: 'grid',
        backgroundColor: 'var(--color-background-primary)',
        tags: ['exercice', 'comptabilité']
      });
    }

    // 3. Plan comptable dashboard if accounts exist
    if (accounts.length > 0) {
      const activeAccounts = accounts.filter(a => a.isActive).length;
      result.push({
        id: 'plan-comptable',
        name: 'Plan Comptable',
        description: `${activeAccounts} comptes actifs sur ${accounts.length} au total`,
        category: 'Gestion',
        type: 'personal',
        status: 'active',
        widgets: [
          { id: 'pc-w1', type: 'table', title: 'Comptes par classe', size: 'large' },
          { id: 'pc-w2', type: 'chart', title: 'Répartition des classes', size: 'medium' }
        ],
        widgetCount: 2,
        owner: 'Système',
        sharedWith: [],
        views: 0,
        lastViewed: now,
        lastUpdated: now,
        createdAt: now,
        isStarred: false,
        isPublic: false,
        refreshRate: 120,
        layout: 'grid',
        backgroundColor: 'var(--color-background-primary)',
        tags: ['gestion', 'comptes', 'analytique']
      });
    }

    // 4. Template dashboard — always present
    result.push({
      id: 'template-standard',
      name: 'Modèle Tableau de Bord Financier',
      description: 'Modèle standard pour les tableaux de bord financiers',
      category: 'Templates',
      type: 'template',
      status: 'active',
      widgets: [
        { id: 'tpl-w1', type: 'metric', title: 'CA du mois', size: 'small' },
        { id: 'tpl-w2', type: 'chart', title: 'Tendance trimestrielle', size: 'large' }
      ],
      widgetCount: 2,
      owner: 'Système',
      sharedWith: [],
      views: 0,
      lastViewed: now,
      lastUpdated: now,
      createdAt: now,
      isStarred: false,
      isPublic: true,
      refreshRate: 15,
      layout: 'grid',
      backgroundColor: 'var(--color-background-primary)',
      tags: ['template', 'finance', 'standard']
    });

    return result;
  }, [fiscalYears, journalEntries, accounts]);

  // Apply filters
  const dashboards = useMemo(() => {
    return allDashboards.filter(dashboard =>
      (searchTerm === '' ||
       dashboard.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       dashboard.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
       dashboard.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))) &&
      (selectedCategory === 'all' || dashboard.category === selectedCategory) &&
      (selectedType === 'all' || dashboard.type === selectedType) &&
      (selectedStatus === 'all' || dashboard.status === selectedStatus)
    );
  }, [allDashboards, searchTerm, selectedCategory, selectedType, selectedStatus]);

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
      case 'shared': return 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]';
      case 'public': return 'bg-[#B87333]/10 text-[#B87333]';
      case 'template': return 'bg-[var(--color-warning-lighter)] text-[var(--color-warning-darker)]';
      default: return 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]';
      case 'draft': return 'bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)]';
      case 'archived': return 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]';
      default: return 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]';
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

  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; dashboard: Dashboard | null }>({
    isOpen: false,
    dashboard: null
  });

  const handleDeleteClick = (dashboard: Dashboard) => {
    setDeleteConfirm({ isOpen: true, dashboard });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm.dashboard) {
      deleteDashboardMutation.mutate(deleteConfirm.dashboard.id);
      setDeleteConfirm({ isOpen: false, dashboard: null });
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
          <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Tableaux de Bord</h1>
          <p className="text-[var(--color-text-primary)]">Créez et gérez vos tableaux de bord personnalisés</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="bg-[var(--color-background-hover)] hover:bg-[var(--color-border)] text-[var(--color-text-primary)] px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
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
        <div className="bg-white p-6 rounded-lg shadow-sm border border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Total Tableaux</p>
              <p className="text-lg font-bold text-[var(--color-text-primary)]">{totalDashboards}</p>
            </div>
            <div className="h-12 w-12 bg-[#6A8A82]/10 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="h-6 w-6 text-[#6A8A82]" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Actifs</p>
              <p className="text-lg font-bold text-[var(--color-success)]">{activeDashboards}</p>
            </div>
            <div className="h-12 w-12 bg-[var(--color-success-lighter)] rounded-lg flex items-center justify-center">
              <EyeIcon className="h-6 w-6 text-[var(--color-success)]" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Partagés</p>
              <p className="text-lg font-bold text-[#B87333]">{sharedDashboards}</p>
            </div>
            <div className="h-12 w-12 bg-[#B87333]/10 rounded-lg flex items-center justify-center">
              <ShareIcon className="h-6 w-6 text-[#B87333]" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Vues Totales</p>
              <p className="text-lg font-bold text-[var(--color-warning)]">{totalViews.toLocaleString()}</p>
            </div>
            <div className="h-12 w-12 bg-[var(--color-warning-lighter)] rounded-lg flex items-center justify-center">
              <ClockIcon className="h-6 w-6 text-[var(--color-warning)]" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-[var(--color-border)]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-secondary)]" />
              <input
                type="text"
                placeholder="Rechercher un tableau de bord..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-[var(--color-border-dark)] rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 border border-[var(--color-border-dark)] rounded-lg hover:bg-[var(--color-background-secondary)] transition-colors"
            >
              <FunnelIcon className="h-5 w-5" />
              <span>Filtres</span>
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Catégorie</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
              >
                <option value="all">Toutes les catégories</option>
                <option value="Finance">Finance</option>
                <option value="Commercial">Commercial</option>
                <option value="Gestion">Gestion</option>
                <option value="RH">RH</option>
                <option value="Budget">{t('navigation.budget')}</option>
                <option value="Templates">Templates</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
              >
                <option value="all">Tous les types</option>
                <option value="personal">Personnel</option>
                <option value="shared">Partagé</option>
                <option value="public">Public</option>
                <option value="template">Modèle</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Statut</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actif</option>
                <option value="draft">{t('accounting.draft')}</option>
                <option value="archived">Archivé</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Actions</label>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                  setSelectedType('all');
                  setSelectedStatus('all');
                }}
                className="w-full px-3 py-2 border border-[var(--color-border-dark)] rounded-lg hover:bg-[var(--color-background-secondary)] transition-colors"
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
              <div key={index} className="bg-white rounded-lg shadow-sm border border-[var(--color-border)] p-6 animate-pulse">
                <div className="h-4 bg-[var(--color-border)] rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-[var(--color-border)] rounded w-full mb-2"></div>
                <div className="h-3 bg-[var(--color-border)] rounded w-2/3 mb-4"></div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="h-6 bg-[var(--color-border)] rounded w-8 mx-auto mb-1"></div>
                    <div className="h-3 bg-[var(--color-border)] rounded w-12 mx-auto"></div>
                  </div>
                  <div className="text-center">
                    <div className="h-6 bg-[var(--color-border)] rounded w-8 mx-auto mb-1"></div>
                    <div className="h-3 bg-[var(--color-border)] rounded w-12 mx-auto"></div>
                  </div>
                  <div className="text-center">
                    <div className="h-6 bg-[var(--color-border)] rounded w-8 mx-auto mb-1"></div>
                    <div className="h-3 bg-[var(--color-border)] rounded w-12 mx-auto"></div>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <div className="h-8 bg-[var(--color-border)] rounded flex-1"></div>
                  <div className="h-8 w-8 bg-[var(--color-border)] rounded"></div>
                </div>
              </div>
            ))
          ) : filteredDashboards.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <ChartBarIcon className="h-12 w-12 text-[var(--color-text-secondary)] mx-auto mb-4" />
              <p className="text-[var(--color-text-secondary)]">Aucun tableau de bord trouvé</p>
            </div>
          ) : (
            filteredDashboards.map((dashboard) => (
              <div
                key={dashboard.id}
                className="bg-white rounded-lg shadow-sm border border-[var(--color-border)] p-6 hover:shadow-md transition-shadow"
                style={{ backgroundColor: dashboard.backgroundColor }}
              >
                {/* En-tête de la carte */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <div className="flex-shrink-0 text-[var(--color-text-secondary)]">
                      {getTypeIcon(dashboard.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-medium text-[var(--color-text-primary)] truncate">{dashboard.name}</h3>
                      <p className="text-sm text-[var(--color-text-secondary)]">{dashboard.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-2">
                    <button
                      onClick={() => handleToggleStar(dashboard)}
                      className={`p-1 rounded-full transition-colors ${
                        dashboard.isStarred ? 'text-yellow-500 hover:text-[var(--color-warning)]' : 'text-[var(--color-text-secondary)] hover:text-yellow-500'
                      }`}
                    >
                      <StarIcon className={`h-4 w-4 ${dashboard.isStarred ? 'fill-current' : ''}`} />
                    </button>
                    {!dashboard.isPublic && (
                      <LockClosedIcon className="h-4 w-4 text-[var(--color-text-secondary)]" />
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-[var(--color-text-primary)] mb-4 line-clamp-2">{dashboard.description}</p>

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
                    <div className="text-lg font-bold text-[#6A8A82]">{dashboard.widgetCount}</div>
                    <div className="text-xs text-[var(--color-text-secondary)]">Widgets</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-[var(--color-success)]">{dashboard.views}</div>
                    <div className="text-xs text-[var(--color-text-secondary)]">Vues</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-[var(--color-text-primary)]">{dashboard.refreshRate}min</div>
                    <div className="text-xs text-[var(--color-text-secondary)]">Refresh</div>
                  </div>
                </div>

                {/* Informations propriétaire */}
                <div className="flex items-center justify-between text-sm text-[var(--color-text-secondary)] mb-4">
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
                      className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-success)] transition-colors"
                      title="Partager"
                    >
                      <ShareIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedDashboard(dashboard);
                        setShowEditModal(true);
                      }}
                      className="p-2 text-[var(--color-text-secondary)] hover:text-[#6A8A82] transition-colors"
                      title="Configurer"
                    >
                      <Cog6ToothIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDuplicate(dashboard)}
                      className="p-2 text-[var(--color-text-secondary)] hover:text-[#6A8A82] transition-colors"
                      title="Dupliquer"
                      disabled={duplicateDashboardMutation.isPending}
                    >
                      <DocumentDuplicateIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(dashboard)}
                      className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-error)] transition-colors"
                      title={t('common.delete')}
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
        <div className="bg-white rounded-lg shadow-sm border border-[var(--color-border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[var(--color-background-secondary)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Tableau de Bord
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Widgets
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Vues
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Propriétaire
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Dernière MAJ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDashboards.map((dashboard) => (
                  <tr key={dashboard.id} className="hover:bg-[var(--color-background-secondary)]">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {dashboard.isStarred && (
                          <StarIcon className="h-4 w-4 text-yellow-500 fill-current mr-2" />
                        )}
                        <div>
                          <div className="text-sm font-medium text-[var(--color-text-primary)]">{dashboard.name}</div>
                          <div className="text-sm text-[var(--color-text-secondary)]">{dashboard.category}</div>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-primary)]">
                      {dashboard.widgetCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-primary)]">
                      {dashboard.views}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-primary)]">
                      {dashboard.owner}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-secondary)]">
                      {new Date(dashboard.lastUpdated).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          className="p-2 text-[var(--color-text-secondary)] hover:text-[#6A8A82] transition-colors"
                          title="Ouvrir" aria-label="Voir les détails">
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDashboard(dashboard);
                            setShowShareModal(true);
                          }}
                          className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-success)] transition-colors"
                          title="Partager"
                        >
                          <ShareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDashboard(dashboard);
                            setShowEditModal(true);
                          }}
                          className="p-2 text-[var(--color-text-secondary)] hover:text-[#6A8A82] transition-colors"
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
            <p className="text-sm text-[var(--color-text-primary)]">
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
              className="px-3 py-2 text-sm border border-[var(--color-border-dark)] rounded-md hover:bg-[var(--color-background-secondary)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Précédent
            </button>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm border border-[var(--color-border-dark)] rounded-md hover:bg-[var(--color-background-secondary)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* Modal - Create Dashboard */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Créer un Dashboard</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nom du dashboard *</label>
                <input type="text" className="w-full border rounded-lg px-3 py-2" placeholder="Ex: Tableau de bord commercial" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea rows={3} className="w-full border rounded-lg px-3 py-2" placeholder="Décrivez le dashboard..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Catégorie *</label>
                  <select className="w-full border rounded-lg px-3 py-2">
                    <option>Finance</option>
                    <option>Ventes</option>
                    <option>RH</option>
                    <option>Opérations</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Type *</label>
                  <select className="w-full border rounded-lg px-3 py-2">
                    <option value="personal">Personnel</option>
                    <option value="shared">Partagé</option>
                    <option value="public">Public</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Layout</label>
                  <select className="w-full border rounded-lg px-3 py-2">
                    <option value="grid">Grille</option>
                    <option value="flow">Flux</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Taux de rafraîchissement (min)</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2" defaultValue={5} min={1} />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 p-6 border-t">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 border rounded-lg hover:bg-[var(--color-background-secondary)]">{t('common.cancel')}</button>
              <button onClick={() => { setShowCreateModal(false); }} className="px-4 py-2 bg-[var(--color-info)] text-white rounded-lg hover:bg-indigo-700">{t('actions.create')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - View Dashboard */}
      {showViewModal && selectedDashboard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-lg font-semibold">{selectedDashboard.name}</h2>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">{selectedDashboard.description}</p>
              </div>
              <button onClick={() => setShowViewModal(false)} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-3">Informations</h3>
                  <dl className="space-y-2 text-sm">
                    <div><dt className="text-[var(--color-text-secondary)]">Catégorie</dt><dd className="font-medium">{selectedDashboard.category}</dd></div>
                    <div><dt className="text-[var(--color-text-secondary)]">Type</dt><dd className="font-medium capitalize">{selectedDashboard.type}</dd></div>
                    <div><dt className="text-[var(--color-text-secondary)]">Status</dt><dd className="font-medium">{selectedDashboard.status}</dd></div>
                    <div><dt className="text-[var(--color-text-secondary)]">Propriétaire</dt><dd className="font-medium">{selectedDashboard.owner}</dd></div>
                  </dl>
                </div>
                <div>
                  <h3 className="font-medium mb-3">Statistiques</h3>
                  <dl className="space-y-2 text-sm">
                    <div><dt className="text-[var(--color-text-secondary)]">Widgets</dt><dd className="font-medium">{selectedDashboard.widgetCount}</dd></div>
                    <div><dt className="text-[var(--color-text-secondary)]">Vues</dt><dd className="font-medium">{selectedDashboard.views}</dd></div>
                    <div><dt className="text-[var(--color-text-secondary)]">Dernière vue</dt><dd className="font-medium">{new Date(selectedDashboard.lastViewed).toLocaleDateString()}</dd></div>
                    <div><dt className="text-[var(--color-text-secondary)]">Rafraîchissement</dt><dd className="font-medium">{selectedDashboard.refreshRate} min</dd></div>
                  </dl>
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-2">Widgets ({selectedDashboard.widgetCount})</h3>
                <div className="grid grid-cols-3 gap-2">
                  {selectedDashboard.widgets.map(w => (
                    <div key={w.id} className="border rounded p-2 text-sm">
                      <div className="font-medium">{w.title}</div>
                      <div className="text-[var(--color-text-secondary)] text-xs">{w.type} - {w.size}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 p-6 border-t">
              <button onClick={() => setShowViewModal(false)} className="px-4 py-2 border rounded-lg hover:bg-[var(--color-background-secondary)]">{t('common.close')}</button>
              <button onClick={() => { setShowViewModal(false); setShowEditModal(true); }} className="px-4 py-2 bg-[var(--color-info)] text-white rounded-lg hover:bg-indigo-700">{t('common.edit')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Edit Dashboard */}
      {showEditModal && selectedDashboard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Modifier le Dashboard</h2>
              <button onClick={() => setShowEditModal(false)} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nom du dashboard *</label>
                <input type="text" defaultValue={selectedDashboard.name} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea rows={3} defaultValue={selectedDashboard.description} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Catégorie *</label>
                  <select defaultValue={selectedDashboard.category} className="w-full border rounded-lg px-3 py-2">
                    <option>Finance</option>
                    <option>Ventes</option>
                    <option>RH</option>
                    <option>Opérations</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Type *</label>
                  <select defaultValue={selectedDashboard.type} className="w-full border rounded-lg px-3 py-2">
                    <option value="personal">Personnel</option>
                    <option value="shared">Partagé</option>
                    <option value="public">Public</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Layout</label>
                  <select defaultValue={selectedDashboard.layout} className="w-full border rounded-lg px-3 py-2">
                    <option value="grid">Grille</option>
                    <option value="flow">Flux</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Taux de rafraîchissement (min)</label>
                  <input type="number" defaultValue={selectedDashboard.refreshRate} className="w-full border rounded-lg px-3 py-2" min={1} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <select defaultValue={selectedDashboard.status} className="w-full border rounded-lg px-3 py-2">
                    <option value="active">Actif</option>
                    <option value="draft">{t('accounting.draft')}</option>
                    <option value="archived">Archivé</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Visibilité</label>
                  <select defaultValue={selectedDashboard.isPublic ? 'public' : 'private'} className="w-full border rounded-lg px-3 py-2">
                    <option value="private">Privé</option>
                    <option value="public">Public</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 p-6 border-t">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 border rounded-lg hover:bg-[var(--color-background-secondary)]">{t('common.cancel')}</button>
              <button onClick={() => { setShowEditModal(false); }} className="px-4 py-2 bg-[var(--color-info)] text-white rounded-lg hover:bg-indigo-700">{t('actions.save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Share Dashboard */}
      {showShareModal && selectedDashboard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Partager le Dashboard</h2>
              <button onClick={() => setShowShareModal(false)} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-[var(--color-text-primary)] mb-4">Partager "{selectedDashboard.name}" avec d'autres utilisateurs</p>
                <label className="block text-sm font-medium mb-2">Utilisateurs</label>
                <input type="text" className="w-full border rounded-lg px-3 py-2" placeholder="Rechercher des utilisateurs..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Permissions</label>
                <select className="w-full border rounded-lg px-3 py-2">
                  <option value="view">Lecture seule</option>
                  <option value="edit">Modification</option>
                  <option value="admin">Administration</option>
                </select>
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">Autoriser le partage par les destinataires</span>
                </label>
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" defaultChecked />
                  <span className="text-sm">Envoyer une notification</span>
                </label>
              </div>
              {selectedDashboard.sharedWith.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Actuellement partagé avec</h3>
                  <div className="space-y-1">
                    {selectedDashboard.sharedWith.map((user, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm p-2 bg-[var(--color-background-secondary)] rounded">
                        <span>{user}</span>
                        <button className="text-[var(--color-error)] hover:text-[var(--color-error-darker)]">Retirer</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3 p-6 border-t">
              <button onClick={() => setShowShareModal(false)} className="px-4 py-2 border rounded-lg hover:bg-[var(--color-background-secondary)]">{t('common.cancel')}</button>
              <button onClick={() => { setShowShareModal(false); }} className="px-4 py-2 bg-[var(--color-info)] text-white rounded-lg hover:bg-indigo-700">Partager</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, dashboard: null })}
        onConfirm={handleConfirmDelete}
        title="Confirmer la suppression"
        message={`Êtes-vous sûr de vouloir supprimer le tableau de bord "${deleteConfirm.dashboard?.name}" ? Cette action est irréversible.`}
        variant="danger"
        confirmText="Supprimer"
        cancelText="Annuler"
        confirmLoading={deleteDashboardMutation.isPending}
      />
    </div>
  );
};

export default DashboardsPage;