import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Trash2,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Plus,
  RefreshCw,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  BarChart3,
  PieChart,
  Target,
  Building,
  Monitor,
  Truck,
  MapPin,
  User,
  FileText,
  Tag,
  DollarSign,
  Activity,
  Archive,
  XCircle,
  Package,
  Recycle,
  Handshake,
  Gavel
} from 'lucide-react';
import {
  UnifiedCard,
  KPICard,
  SectionHeader,
  ElegantButton,
  PageContainer,
  ModernChartCard,
  ColorfulBarChart
} from '../../components/ui/DesignSystem';
import { assetsService } from '../../services/assets.service';
import { formatCurrency, formatDate, formatPercentage } from '../../lib/utils';

interface AssetDisposal {
  id: string;
  assetId: string;
  assetName: string;
  assetTag: string;
  category: string;
  disposalType: 'sale' | 'donation' | 'destruction' | 'trade_in' | 'scrap' | 'transfer';
  status: 'planned' | 'in_process' | 'completed' | 'cancelled';
  reason: string;
  initiatedDate: string;
  plannedDate: string;
  completedDate?: string;
  originalCost: number;
  bookValue: number;
  disposalValue: number;
  gainLoss: number;
  buyer?: string;
  recipient?: string;
  method: string;
  location: string;
  initiatedBy: string;
  approvedBy?: string;
  responsiblePerson?: string;
  documentation: string[];
  environmentalCompliance: boolean;
  dataWiping?: boolean;
  certificateNumber?: string;
  notes?: string;
}

interface DisposalApproval {
  id: string;
  disposalId: string;
  approver: string;
  approvalDate: string;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
  conditions?: string[];
}

interface DisposalModal {
  isOpen: boolean;
  mode: 'view' | 'edit' | 'create' | 'approve';
  disposal?: AssetDisposal;
}

const AssetsDisposals: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [viewMode, setViewMode] = useState<'disposals' | 'approvals' | 'analytics'>('disposals');
  const [disposalModal, setDisposalModal] = useState<DisposalModal>({ isOpen: false, mode: 'view' });
  const [selectedDisposals, setSelectedDisposals] = useState<string[]>([]);

  // Mock data for asset disposals
  const mockDisposals: AssetDisposal[] = [
    {
      id: '1',
      assetId: 'IT005',
      assetName: 'MacBook Pro 2019',
      assetTag: 'IT005',
      category: 'materiel_informatique',
      disposalType: 'sale',
      status: 'completed',
      reason: 'Fin de vie utile - remplacement par nouveau modèle',
      initiatedDate: '2024-08-01T09:00:00Z',
      plannedDate: '2024-08-15T10:00:00Z',
      completedDate: '2024-08-14T15:30:00Z',
      originalCost: 2800,
      bookValue: 800,
      disposalValue: 1200,
      gainLoss: 400,
      buyer: 'Société RecycleIT',
      method: 'Vente à un revendeur spécialisé',
      location: 'Bureau Paris',
      initiatedBy: 'Marie Dubois',
      approvedBy: 'Jean Martin',
      responsiblePerson: 'Service IT',
      documentation: ['Certificat effacement données', 'Facture vente', 'Bon de sortie'],
      environmentalCompliance: true,
      dataWiping: true,
      certificateNumber: 'CERT-2024-IT005',
      notes: 'Effacement sécurisé des données effectué selon norme NIST'
    },
    {
      id: '2',
      assetId: 'VH003',
      assetName: 'Renault Kangoo 2018',
      assetTag: 'VH003',
      category: 'vehicules',
      disposalType: 'trade_in',
      status: 'in_process',
      reason: 'Échange contre véhicule électrique',
      initiatedDate: '2024-09-01T10:00:00Z',
      plannedDate: '2024-09-30T14:00:00Z',
      originalCost: 28000,
      bookValue: 15000,
      disposalValue: 16500,
      gainLoss: 1500,
      buyer: 'Concessionnaire Renault',
      method: 'Reprise concessionnaire',
      location: 'Parking principal',
      initiatedBy: 'Pierre Durand',
      approvedBy: 'Sophie Laurent',
      responsiblePerson: 'Service Flotte',
      documentation: ['Certificat de cession', 'Contrôle technique', 'Carte grise'],
      environmentalCompliance: true,
      notes: 'Reprise dans le cadre de l\'achat d\'un véhicule électrique'
    },
    {
      id: '3',
      assetId: 'EQ003',
      assetName: 'Photocopieur Canon 2020',
      assetTag: 'EQ003',
      category: 'equipements',
      disposalType: 'donation',
      status: 'planned',
      reason: 'Don à association caritative',
      initiatedDate: '2024-09-10T11:00:00Z',
      plannedDate: '2024-10-15T09:00:00Z',
      originalCost: 3500,
      bookValue: 1200,
      disposalValue: 0,
      gainLoss: -1200,
      recipient: 'Association Aide Numérique',
      method: 'Don avec reçu fiscal',
      location: 'Bureau administration',
      initiatedBy: 'Isabelle Moreau',
      responsiblePerson: 'Service Administratif',
      documentation: ['Demande de don', 'Évaluation de l\'actif'],
      environmentalCompliance: true,
      notes: 'Don déductible fiscalement'
    },
    {
      id: '4',
      assetId: 'MO001',
      assetName: 'Ancien mobilier bureau',
      assetTag: 'MO001',
      category: 'mobilier',
      disposalType: 'destruction',
      status: 'completed',
      reason: 'Mobilier détérioré non réparable',
      initiatedDate: '2024-07-15T08:00:00Z',
      plannedDate: '2024-07-25T10:00:00Z',
      completedDate: '2024-07-24T16:00:00Z',
      originalCost: 1500,
      bookValue: 150,
      disposalValue: 0,
      gainLoss: -150,
      method: 'Destruction par entreprise spécialisée',
      location: 'Entrepôt stockage',
      initiatedBy: 'Thomas Bernard',
      approvedBy: 'Jean Martin',
      responsiblePerson: 'Service Maintenance',
      documentation: ['Certificat de destruction', 'Bon d\'enlèvement'],
      environmentalCompliance: true,
      notes: 'Destruction écologique respectueuse de l\'environnement'
    },
    {
      id: '5',
      assetId: 'IT006',
      assetName: 'Serveurs ancienne génération',
      assetTag: 'IT006',
      category: 'materiel_informatique',
      disposalType: 'scrap',
      status: 'planned',
      reason: 'Matériel obsolète, fin de support',
      initiatedDate: '2024-09-15T14:00:00Z',
      plannedDate: '2024-10-30T10:00:00Z',
      originalCost: 12000,
      bookValue: 0,
      disposalValue: 300,
      gainLoss: 300,
      buyer: 'Recyclage Métaux Précieux',
      method: 'Démantèlement et récupération métaux',
      location: 'Salle serveur',
      initiatedBy: 'Marc Technician',
      responsiblePerson: 'Service IT',
      documentation: ['Évaluation technique', 'Devis récupération'],
      environmentalCompliance: true,
      dataWiping: true,
      notes: 'Effacement sécurisé des disques durs obligatoire'
    }
  ];

  // Mock approval workflow
  const mockApprovals: DisposalApproval[] = [
    {
      id: '1',
      disposalId: '3',
      approver: 'Jean Martin',
      approvalDate: '2024-09-12T09:00:00Z',
      status: 'pending',
      comments: 'En attente de validation du service comptable',
      conditions: ['Évaluation fiscale du don', 'Accord association']
    },
    {
      id: '2',
      disposalId: '5',
      approver: 'Sophie Laurent',
      approvalDate: '2024-09-16T10:30:00Z',
      status: 'pending',
      comments: 'Vérification procédure effacement données',
      conditions: ['Certificat effacement conforme', 'Procédure sécurité IT']
    }
  ];

  // Filter disposals based on search and filters
  const filteredDisposals = useMemo(() => {
    return mockDisposals.filter(disposal => {
      const matchesSearch = disposal.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          disposal.assetTag.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          disposal.reason.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === 'all' || disposal.status === filterStatus;
      const matchesType = filterType === 'all' || disposal.disposalType === filterType;
      const matchesCategory = filterCategory === 'all' || disposal.category === filterCategory;

      // Filter by period
      let matchesPeriod = true;
      if (filterPeriod !== 'all') {
        const disposalDate = new Date(disposal.initiatedDate);
        const now = new Date();
        switch (filterPeriod) {
          case 'current_month':
            matchesPeriod = disposalDate.getMonth() === now.getMonth() &&
                          disposalDate.getFullYear() === now.getFullYear();
            break;
          case 'last_month':
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
            matchesPeriod = disposalDate.getMonth() === lastMonth.getMonth() &&
                          disposalDate.getFullYear() === lastMonth.getFullYear();
            break;
          case 'current_year':
            matchesPeriod = disposalDate.getFullYear() === now.getFullYear();
            break;
        }
      }

      return matchesSearch && matchesStatus && matchesType && matchesCategory && matchesPeriod;
    });
  }, [searchTerm, filterStatus, filterType, filterCategory, filterPeriod, mockDisposals]);

  // Calculate aggregated metrics
  const aggregatedData = useMemo(() => {
    const totalDisposals = filteredDisposals.length;
    const completedDisposals = filteredDisposals.filter(d => d.status === 'completed').length;
    const plannedDisposals = filteredDisposals.filter(d => d.status === 'planned').length;
    const inProcessDisposals = filteredDisposals.filter(d => d.status === 'in_process').length;

    const totalOriginalValue = filteredDisposals.reduce((sum, d) => sum + d.originalCost, 0);
    const totalBookValue = filteredDisposals.reduce((sum, d) => sum + d.bookValue, 0);
    const totalDisposalValue = filteredDisposals.reduce((sum, d) => sum + d.disposalValue, 0);
    const totalGainLoss = filteredDisposals.reduce((sum, d) => sum + d.gainLoss, 0);

    const environmentalCompliant = filteredDisposals.filter(d => d.environmentalCompliance).length;
    const pendingApprovals = mockApprovals.filter(a => a.status === 'pending').length;

    return {
      totalDisposals,
      completedDisposals,
      plannedDisposals,
      inProcessDisposals,
      totalOriginalValue,
      totalBookValue,
      totalDisposalValue,
      totalGainLoss,
      environmentalCompliant,
      pendingApprovals,
      complianceRate: environmentalCompliant / totalDisposals
    };
  }, [filteredDisposals, mockApprovals]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'materiel_informatique': return <Monitor className="h-5 w-5" />;
      case 'vehicules': return <Truck className="h-5 w-5" />;
      case 'mobilier': return <Package className="h-5 w-5" />;
      case 'equipements': return <Archive className="h-5 w-5" />;
      default: return <Package className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'in_process': return 'text-yellow-600 bg-yellow-50';
      case 'planned': return 'text-blue-600 bg-blue-50';
      case 'cancelled': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getDisposalTypeColor = (type: string) => {
    switch (type) {
      case 'sale': return 'text-green-600 bg-green-50';
      case 'donation': return 'text-blue-600 bg-blue-50';
      case 'trade_in': return 'text-purple-600 bg-purple-50';
      case 'destruction': return 'text-red-600 bg-red-50';
      case 'scrap': return 'text-orange-600 bg-orange-50';
      case 'transfer': return 'text-cyan-600 bg-cyan-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getDisposalTypeIcon = (type: string) => {
    switch (type) {
      case 'sale': return <DollarSign className="h-4 w-4" />;
      case 'donation': return <Handshake className="h-4 w-4" />;
      case 'trade_in': return <Gavel className="h-4 w-4" />;
      case 'destruction': return <XCircle className="h-4 w-4" />;
      case 'scrap': return <Recycle className="h-4 w-4" />;
      case 'transfer': return <Archive className="h-4 w-4" />;
      default: return <Trash2 className="h-4 w-4" />;
    }
  };

  const statusLabels = {
    planned: 'Planifié',
    in_process: 'En cours',
    completed: 'Terminé',
    cancelled: 'Annulé'
  };

  const typeLabels = {
    sale: 'Vente',
    donation: 'Don',
    trade_in: 'Reprise',
    destruction: 'Destruction',
    scrap: 'Récupération',
    transfer: 'Transfert'
  };

  const categoryLabels = {
    materiel_informatique: 'Matériel IT',
    vehicules: 'Véhicules',
    mobilier: 'Mobilier',
    equipements: 'Équipements'
  };

  const statusChartData = [
    { label: 'Terminés', value: aggregatedData.completedDisposals, color: 'bg-green-500' },
    { label: 'En cours', value: aggregatedData.inProcessDisposals, color: 'bg-yellow-500' },
    { label: 'Planifiés', value: aggregatedData.plannedDisposals, color: 'bg-blue-500' }
  ];

  const typeChartData = Object.entries(typeLabels).map(([key, label]) => ({
    label,
    value: filteredDisposals.filter(d => d.disposalType === key).length,
    color: key === 'sale' ? 'bg-green-500' :
           key === 'donation' ? 'bg-blue-500' :
           key === 'trade_in' ? 'bg-purple-500' :
           key === 'destruction' ? 'bg-red-500' :
           key === 'scrap' ? 'bg-orange-500' : 'bg-cyan-500'
  }));

  return (
    <PageContainer background="warm" padding="lg">
      <div className="space-y-8">
        {/* Header */}
        <SectionHeader
          title="Sorties d'Actifs"
          subtitle="Gestion des cessions, dons et destructions d'immobilisations"
          icon={Trash2}
          action={
            <div className="flex gap-3">
              <ElegantButton variant="outline" icon={FileText}>
                Rapport
              </ElegantButton>
              <ElegantButton variant="outline" icon={Download}>
                Exporter
              </ElegantButton>
              <ElegantButton
                variant="primary"
                icon={Plus}
                onClick={() => setDisposalModal({ isOpen: true, mode: 'create' })}
              >
                Nouvelle Sortie
              </ElegantButton>
            </div>
          }
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Sorties Totales"
            value={aggregatedData.totalDisposals.toString()}
            subtitle={`${aggregatedData.completedDisposals} terminées`}
            icon={Trash2}
            color="primary"
            delay={0.1}
            withChart={true}
          />

          <KPICard
            title="Plus/Moins-Value"
            value={formatCurrency(aggregatedData.totalGainLoss)}
            subtitle={aggregatedData.totalGainLoss >= 0 ? 'Plus-value réalisée' : 'Moins-value constatée'}
            icon={aggregatedData.totalGainLoss >= 0 ? TrendingUp : TrendingDown}
            color={aggregatedData.totalGainLoss >= 0 ? "success" : "error"}
            delay={0.2}
            withChart={true}
          />

          <KPICard
            title="Valeur de Cession"
            value={formatCurrency(aggregatedData.totalDisposalValue)}
            subtitle={`VNC: ${formatCurrency(aggregatedData.totalBookValue)}`}
            icon={DollarSign}
            color="success"
            delay={0.3}
            withChart={true}
          />

          <KPICard
            title="Conformité Environnementale"
            value={formatPercentage(aggregatedData.complianceRate)}
            subtitle={`${aggregatedData.environmentalCompliant}/${aggregatedData.totalDisposals} conformes`}
            icon={Recycle}
            color="neutral"
            delay={0.4}
            withChart={true}
          />
        </div>

        {/* View Mode Selector */}
        <UnifiedCard variant="elevated" size="md">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex bg-white rounded-2xl p-1 shadow-lg border border-neutral-200">
              {(['disposals', 'approvals', 'analytics'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    viewMode === mode
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-neutral-600 hover:text-blue-600'
                  }`}
                >
                  {mode === 'disposals' ? 'Sorties' :
                   mode === 'approvals' ? 'Approbations' : 'Analytique'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-neutral-700">Période:</label>
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Toutes les périodes</option>
                <option value="current_month">Mois en cours</option>
                <option value="last_month">Mois dernier</option>
                <option value="current_year">Année en cours</option>
              </select>
            </div>
          </div>
        </UnifiedCard>

        {viewMode === 'disposals' && (
          <>
            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <ModernChartCard
                  title="État des Sorties"
                  subtitle="Répartition par statut"
                  icon={PieChart}
                >
                  <ColorfulBarChart
                    data={statusChartData}
                    height={160}
                    showValues={true}
                    valueFormatter={(value) => `${value} sortie${value !== 1 ? 's' : ''}`}
                  />
                </ModernChartCard>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <ModernChartCard
                  title="Types de Sortie"
                  subtitle="Répartition par mode de sortie"
                  icon={Target}
                >
                  <ColorfulBarChart
                    data={typeChartData}
                    height={160}
                    showValues={true}
                    valueFormatter={(value) => `${value} sortie${value !== 1 ? 's' : ''}`}
                  />
                </ModernChartCard>
              </motion.div>
            </div>

            {/* Filters */}
            <UnifiedCard variant="elevated" size="md">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-neutral-800">Filtres et Recherche</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Rechercher..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Tous les statuts</option>
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>

                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Tous les types</option>
                    {Object.entries(typeLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>

                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Toutes les catégories</option>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </UnifiedCard>

            {/* Disposals List */}
            <UnifiedCard variant="elevated" size="lg">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-neutral-800">
                    Sorties d'Actifs ({filteredDisposals.length})
                  </h3>
                  {selectedDisposals.length > 0 && (
                    <div className="flex gap-2">
                      <ElegantButton variant="outline" size="sm">
                        Actions groupées ({selectedDisposals.length})
                      </ElegantButton>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {filteredDisposals.map((disposal, index) => (
                    <motion.div
                      key={disposal.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-6 bg-white border border-neutral-200 rounded-xl hover:shadow-md transition-all duration-200"
                    >
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-start space-x-4">
                            <div className="p-3 bg-red-50 rounded-lg">
                              {getCategoryIcon(disposal.category)}
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-semibold text-neutral-800 text-lg">{disposal.assetName}</h4>
                              <div className="flex items-center space-x-4 text-sm text-neutral-500">
                                <div className="flex items-center space-x-1">
                                  <Tag className="h-3 w-3" />
                                  <span>{disposal.assetTag}</span>
                                </div>
                                <span>•</span>
                                <span>{formatDate(disposal.plannedDate)}</span>
                                <span>•</span>
                                <span>{categoryLabels[disposal.category]}</span>
                              </div>
                              <p className="text-sm text-neutral-600">{disposal.reason}</p>
                              <div className="flex items-center space-x-3">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center space-x-1 ${getDisposalTypeColor(disposal.disposalType)}`}>
                                  {getDisposalTypeIcon(disposal.disposalType)}
                                  <span>{typeLabels[disposal.disposalType]}</span>
                                </span>
                                {disposal.environmentalCompliance && (
                                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-600">
                                    Conforme env.
                                  </span>
                                )}
                                {disposal.dataWiping && (
                                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-600">
                                    Données effacées
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(disposal.status)}`}>
                              {statusLabels[disposal.status]}
                            </span>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setDisposalModal({ isOpen: true, mode: 'view', disposal })}
                                className="p-2 text-neutral-400 hover:text-blue-600 transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDisposalModal({ isOpen: true, mode: 'edit', disposal })}
                                className="p-2 text-neutral-400 hover:text-green-600 transition-colors"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-neutral-100">
                          <div>
                            <p className="text-sm text-neutral-500">Valeur comptable:</p>
                            <p className="font-medium text-neutral-800">{formatCurrency(disposal.bookValue)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-neutral-500">Valeur de cession:</p>
                            <p className="font-medium text-neutral-800">{formatCurrency(disposal.disposalValue)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-neutral-500">Plus/Moins-value:</p>
                            <p className={`font-medium ${disposal.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {disposal.gainLoss >= 0 ? '+' : ''}{formatCurrency(disposal.gainLoss)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-neutral-500">Acheteur/Destinataire:</p>
                            <p className="font-medium text-neutral-800">
                              {disposal.buyer || disposal.recipient || 'Non défini'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </UnifiedCard>
          </>
        )}

        {viewMode === 'approvals' && (
          <UnifiedCard variant="elevated" size="lg">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-neutral-800">
                  Approbations en Attente
                </h3>
                <span className="px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-600">
                  {aggregatedData.pendingApprovals} en attente
                </span>
              </div>

              <div className="space-y-4">
                {mockApprovals.filter(a => a.status === 'pending').map((approval, index) => {
                  const disposal = mockDisposals.find(d => d.id === approval.disposalId);
                  if (!disposal) return null;

                  return (
                    <motion.div
                      key={approval.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-6 bg-white border border-neutral-200 rounded-xl hover:shadow-md transition-all duration-200"
                    >
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-start space-x-4">
                            <div className="p-3 bg-yellow-50 rounded-lg">
                              <Clock className="h-6 w-6 text-yellow-600" />
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-semibold text-neutral-800">{disposal.assetName}</h4>
                              <p className="text-sm text-neutral-600">{disposal.reason}</p>
                              <div className="flex items-center space-x-3">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDisposalTypeColor(disposal.disposalType)}`}>
                                  {typeLabels[disposal.disposalType]}
                                </span>
                                <span className="text-sm text-neutral-500">
                                  Valeur: {formatCurrency(disposal.disposalValue)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <ElegantButton variant="outline" size="sm">
                              Rejeter
                            </ElegantButton>
                            <ElegantButton variant="primary" size="sm">
                              Approuver
                            </ElegantButton>
                          </div>
                        </div>

                        <div className="bg-yellow-50 p-4 rounded-lg">
                          <p className="text-sm font-medium text-yellow-800">Commentaires de l'approbateur:</p>
                          <p className="text-sm text-yellow-700 mt-1">{approval.comments}</p>
                          {approval.conditions && approval.conditions.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm font-medium text-yellow-800">Conditions:</p>
                              <ul className="list-disc list-inside text-sm text-yellow-700 mt-1">
                                {approval.conditions.map((condition, i) => (
                                  <li key={i}>{condition}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </UnifiedCard>
        )}

        {viewMode === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UnifiedCard variant="elevated" size="lg">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-neutral-800">Impact Financier</h3>

                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-blue-700">Valeur Originale Totale</span>
                      <span className="text-lg font-bold text-blue-800">
                        {formatCurrency(aggregatedData.totalOriginalValue)}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-yellow-700">Valeur Comptable Nette</span>
                      <span className="text-lg font-bold text-yellow-800">
                        {formatCurrency(aggregatedData.totalBookValue)}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-green-700">Valeur de Cession</span>
                      <span className="text-lg font-bold text-green-800">
                        {formatCurrency(aggregatedData.totalDisposalValue)}
                      </span>
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg ${
                    aggregatedData.totalGainLoss >= 0 ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm font-medium ${
                        aggregatedData.totalGainLoss >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {aggregatedData.totalGainLoss >= 0 ? 'Plus-value Totale' : 'Moins-value Totale'}
                      </span>
                      <span className={`text-lg font-bold ${
                        aggregatedData.totalGainLoss >= 0 ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {aggregatedData.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(aggregatedData.totalGainLoss)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </UnifiedCard>

            <UnifiedCard variant="elevated" size="lg">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-neutral-800">Conformité et Processus</h3>

                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-green-700">Conformité Environnementale</span>
                      <span className="text-lg font-bold text-green-800">
                        {formatPercentage(aggregatedData.complianceRate)}
                      </span>
                    </div>
                    <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${aggregatedData.complianceRate * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-blue-700">Taux de Finalisation</span>
                      <span className="text-lg font-bold text-blue-800">
                        {formatPercentage(aggregatedData.completedDisposals / aggregatedData.totalDisposals)}
                      </span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(aggregatedData.completedDisposals / aggregatedData.totalDisposals) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-yellow-700">Approbations en Attente</span>
                      <span className="text-lg font-bold text-yellow-800">
                        {aggregatedData.pendingApprovals}
                      </span>
                    </div>
                    <p className="text-sm text-yellow-600 mt-1">Traitement nécessaire</p>
                  </div>
                </div>
              </div>
            </UnifiedCard>
          </div>
        )}

        {/* Disposal Modal */}
        {disposalModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-neutral-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-neutral-800">
                    {disposalModal.mode === 'create' ? 'Nouvelle Sortie d\'Actif' :
                     disposalModal.mode === 'edit' ? 'Modifier la Sortie' :
                     disposalModal.mode === 'approve' ? 'Approuver la Sortie' :
                     'Détails de la Sortie'}
                  </h3>
                  <button
                    onClick={() => setDisposalModal({ isOpen: false, mode: 'view' })}
                    className="p-2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {disposalModal.disposal ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Actif
                        </label>
                        <p className="text-neutral-800 font-semibold">{disposalModal.disposal.assetName}</p>
                        <p className="text-sm text-neutral-500">{disposalModal.disposal.assetTag}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Type de Sortie
                        </label>
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getDisposalTypeColor(disposalModal.disposal.disposalType)}`}>
                          {typeLabels[disposalModal.disposal.disposalType]}
                        </span>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Raison
                        </label>
                        <p className="text-neutral-800">{disposalModal.disposal.reason}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Méthode
                        </label>
                        <p className="text-neutral-800">{disposalModal.disposal.method}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Acheteur/Destinataire
                        </label>
                        <p className="text-neutral-800">
                          {disposalModal.disposal.buyer || disposalModal.disposal.recipient || 'Non défini'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Statut
                        </label>
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(disposalModal.disposal.status)}`}>
                          {statusLabels[disposalModal.disposal.status]}
                        </span>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Valeur d'Origine
                        </label>
                        <p className="text-neutral-800 font-semibold">
                          {formatCurrency(disposalModal.disposal.originalCost)}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Valeur Comptable Nette
                        </label>
                        <p className="text-neutral-800">
                          {formatCurrency(disposalModal.disposal.bookValue)}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Valeur de Cession
                        </label>
                        <p className="text-neutral-800">
                          {formatCurrency(disposalModal.disposal.disposalValue)}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Plus/Moins-Value
                        </label>
                        <p className={`font-semibold ${
                          disposalModal.disposal.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {disposalModal.disposal.gainLoss >= 0 ? '+' : ''}{formatCurrency(disposalModal.disposal.gainLoss)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-neutral-600">
                    <p>Formulaire de sortie d'actif...</p>
                    <p className="text-sm mt-2">Interface de création en développement</p>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-200">
                  <ElegantButton
                    variant="outline"
                    onClick={() => setDisposalModal({ isOpen: false, mode: 'view' })}
                  >
                    {disposalModal.mode === 'view' ? 'Fermer' : 'Annuler'}
                  </ElegantButton>
                  {disposalModal.mode !== 'view' && (
                    <ElegantButton variant="primary">
                      {disposalModal.mode === 'create' ? 'Créer' :
                       disposalModal.mode === 'approve' ? 'Approuver' : 'Sauvegarder'}
                    </ElegantButton>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default AssetsDisposals;