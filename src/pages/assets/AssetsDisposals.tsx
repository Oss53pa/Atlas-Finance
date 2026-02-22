import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type DBAsset } from '../../lib/db';
import { useLanguage } from '../../contexts/LanguageContext';
import { motion } from 'framer-motion';
import {
  Trash2,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
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
  Gavel,
  Upload
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
import { formatCurrency, formatDate, formatPercentage } from '../../lib/utils';
import ExportMenu from '../../components/shared/ExportMenu';
import { toast } from 'react-hot-toast';

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
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [viewMode, setViewMode] = useState<'disposals' | 'approvals' | 'analytics'>('disposals');
  const [disposalModal, setDisposalModal] = useState<DisposalModal>({ isOpen: false, mode: 'view' });
  const [selectedDisposals, setSelectedDisposals] = useState<string[]>([]);

  // Live Dexie query - fetch disposed/scrapped assets
  const dbDisposedAssets = useLiveQuery(
    () => db.assets.where('status').anyOf('disposed', 'scrapped').toArray()
  ) || [];

  // Map Dexie assets to AssetDisposal shape
  const disposals: AssetDisposal[] = useMemo(() => {
    return dbDisposedAssets.map((asset: DBAsset) => {
      const bookValue = asset.residualValue;
      const disposalValue = asset.status === 'disposed' ? asset.residualValue : 0;
      const gainLoss = disposalValue - bookValue;

      return {
        id: asset.id,
        assetId: asset.code,
        assetName: asset.name,
        assetTag: asset.code,
        category: asset.category,
        disposalType: asset.status === 'disposed' ? 'sale' as const : 'scrap' as const,
        status: 'completed' as const,
        reason: asset.status === 'disposed' ? 'Cession' : 'Mise au rebut',
        initiatedDate: asset.acquisitionDate,
        plannedDate: asset.acquisitionDate,
        completedDate: asset.acquisitionDate,
        originalCost: asset.acquisitionValue,
        bookValue,
        disposalValue,
        gainLoss,
        method: asset.status === 'disposed' ? 'Vente' : 'Mise au rebut',
        location: '',
        initiatedBy: '',
        responsiblePerson: '',
        documentation: [],
        environmentalCompliance: true,
        notes: `Méthode amortissement: ${asset.depreciationMethod}`
      };
    });
  }, [dbDisposedAssets]);

  // Approvals derived from disposals (none pending for completed disposals)
  const approvals: DisposalApproval[] = [];

  // Filter disposals based on search and filters
  const filteredDisposals = useMemo(() => {
    return disposals.filter(disposal => {
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
  }, [searchTerm, filterStatus, filterType, filterCategory, filterPeriod, disposals]);

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
    const pendingApprovals = approvals.filter(a => a.status === 'pending').length;

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
  }, [filteredDisposals, approvals]);

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
      case 'completed': return 'text-[#6A8A82] bg-[#6A8A82]/10';
      case 'in_process': return 'text-[#B87333] bg-[#B87333]/10';
      case 'planned': return 'text-[#7A99AC] bg-[#7A99AC]/10';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getDisposalTypeColor = (type: string) => {
    switch (type) {
      case 'sale': return 'text-[#6A8A82] bg-[#6A8A82]/10';
      case 'donation': return 'text-[#7A99AC] bg-[#7A99AC]/10';
      case 'trade_in': return 'text-[#B87333] bg-[#B87333]/10';
      case 'destruction': return 'text-red-600 bg-red-50';
      case 'scrap': return 'text-[#E8D5C4] bg-[#E8D5C4]/20';
      case 'transfer': return 'text-[#C9B037] bg-[#C9B037]/10';
      default: return 'text-gray-600 bg-gray-100';
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
    { label: 'Terminés', value: aggregatedData.completedDisposals, color: 'bg-[#6A8A82]' },
    { label: t('status.inProgress'), value: aggregatedData.inProcessDisposals, color: 'bg-[#B87333]' },
    { label: 'Planifiés', value: aggregatedData.plannedDisposals, color: 'bg-[#7A99AC]' }
  ];

  const typeChartData = Object.entries(typeLabels).map(([key, label]) => ({
    label,
    value: filteredDisposals.filter(d => d.disposalType === key).length,
    color: key === 'sale' ? 'bg-[#6A8A82]' :
           key === 'donation' ? 'bg-[#7A99AC]' :
           key === 'trade_in' ? 'bg-[#B87333]' :
           key === 'destruction' ? 'bg-red-600' :
           key === 'scrap' ? 'bg-[#E8D5C4]' : 'bg-[#C9B037]'
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
              <ElegantButton
                variant="outline"
                icon={FileText}
                onClick={() => {
                  toast.success('Génération du rapport en cours...');
                }}
              >
                Rapport
              </ElegantButton>
              <ExportMenu
                data={filteredDisposals}
                filename="sorties_actifs"
                columns={{
                  assetName: 'Nom Actif',
                  assetTag: 'Tag',
                  category: 'Catégorie',
                  disposalType: 'Type Sortie',
                  status: 'Statut',
                  reason: 'Raison',
                  plannedDate: 'Date Prévue',
                  originalCost: 'Coût Original',
                  bookValue: 'Valeur Comptable',
                  disposalValue: 'Valeur Sortie',
                  gainLoss: 'Plus/Moins-Value',
                  buyer: 'Acheteur',
                  method: 'Méthode',
                  location: 'Localisation'
                }}
                buttonText="Exporter"
                buttonVariant="outline"
              />
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
            <div className="flex bg-white rounded-2xl p-1 shadow-lg border border-gray-200">
              {(['disposals', 'approvals', 'analytics'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    viewMode === mode
                      ? 'bg-[#7A99AC] text-white shadow-md'
                      : 'text-gray-600 hover:text-[#7A99AC]'
                  }`}
                >
                  {mode === 'disposals' ? 'Sorties' :
                   mode === 'approvals' ? 'Approbations' : 'Analytique'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-900">Période:</label>
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-var(--color-blue-primary)"
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
                <h3 className="text-lg font-semibold text-gray-900">Filtres et Recherche</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-700 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Rechercher..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-var(--color-blue-primary)"
                    />
                  </div>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-var(--color-blue-primary)"
                  >
                    <option value="all">Tous les statuts</option>
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>

                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-var(--color-blue-primary)"
                  >
                    <option value="all">Tous les types</option>
                    {Object.entries(typeLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>

                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-var(--color-blue-primary)"
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
                  <h3 className="text-lg font-semibold text-gray-900">
                    Sorties d'Actifs ({filteredDisposals.length})
                  </h3>
                  {selectedDisposals.length > 0 && (
                    <div className="flex gap-2">
                      <ElegantButton
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          toast.info(`Actions groupées pour ${selectedDisposals.length} éléments`);
                        }}
                      >
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
                      className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all duration-200"
                    >
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-start space-x-4">
                            <div className="p-3 bg-red-50 rounded-lg">
                              {getCategoryIcon(disposal.category)}
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-semibold text-gray-900 text-lg">{disposal.assetName}</h4>
                              <div className="flex items-center space-x-4 text-sm text-gray-600">
                                <div className="flex items-center space-x-1">
                                  <Tag className="h-3 w-3" />
                                  <span>{disposal.assetTag}</span>
                                </div>
                                <span>•</span>
                                <span>{formatDate(disposal.plannedDate)}</span>
                                <span>•</span>
                                <span>{categoryLabels[disposal.category]}</span>
                              </div>
                              <p className="text-sm text-gray-600">{disposal.reason}</p>
                              <div className="flex items-center space-x-3">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center space-x-1 ${getDisposalTypeColor(disposal.disposalType)}`}>
                                  {getDisposalTypeIcon(disposal.disposalType)}
                                  <span>{typeLabels[disposal.disposalType]}</span>
                                </span>
                                {disposal.environmentalCompliance && (
                                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-[#6A8A82]/10 text-[#6A8A82]">
                                    Conforme env.
                                  </span>
                                )}
                                {disposal.dataWiping && (
                                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-[#7A99AC]/10 text-[#7A99AC]">
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
                                className="p-2 text-gray-700 hover:text-[#7A99AC] transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDisposalModal({ isOpen: true, mode: 'edit', disposal })}
                                className="p-2 text-gray-700 hover:text-[#6A8A82] transition-colors"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-var(--color-border-light)">
                          <div>
                            <p className="text-sm text-gray-600">Valeur comptable:</p>
                            <p className="font-medium text-gray-900">{formatCurrency(disposal.bookValue)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Valeur de cession:</p>
                            <p className="font-medium text-gray-900">{formatCurrency(disposal.disposalValue)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Plus/Moins-value:</p>
                            <p className={`font-medium ${disposal.gainLoss >= 0 ? 'text-[#6A8A82]' : 'text-var(--color-red-primary)'}`}>
                              {disposal.gainLoss >= 0 ? '+' : ''}{formatCurrency(disposal.gainLoss)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Acheteur/Destinataire:</p>
                            <p className="font-medium text-gray-900">
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
                <h3 className="text-lg font-semibold text-gray-900">
                  Approbations en Attente
                </h3>
                <span className="px-3 py-1 text-sm font-medium rounded-full bg-[#B87333]/10 text-[#B87333]">
                  {aggregatedData.pendingApprovals} en attente
                </span>
              </div>

              <div className="space-y-4">
                {approvals.filter(a => a.status === 'pending').map((approval, index) => {
                  const disposal = disposals.find(d => d.id === approval.disposalId);
                  if (!disposal) return null;

                  return (
                    <motion.div
                      key={approval.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all duration-200"
                    >
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-start space-x-4">
                            <div className="p-3 bg-[#B87333]/10 rounded-lg">
                              <Clock className="h-6 w-6 text-[#B87333]" />
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-semibold text-gray-900">{disposal.assetName}</h4>
                              <p className="text-sm text-gray-600">{disposal.reason}</p>
                              <div className="flex items-center space-x-3">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDisposalTypeColor(disposal.disposalType)}`}>
                                  {typeLabels[disposal.disposalType]}
                                </span>
                                <span className="text-sm text-gray-600">
                                  Valeur: {formatCurrency(disposal.disposalValue)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <ElegantButton
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                toast.error('Sortie rejetée');
                              }}
                            >
                              Rejeter
                            </ElegantButton>
                            <ElegantButton
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                toast.success('Sortie approuvée avec succès');
                              }}
                            >
                              Approuver
                            </ElegantButton>
                          </div>
                        </div>

                        <div className="bg-[#B87333]/10 p-4 rounded-lg">
                          <p className="text-sm font-medium text-var(--color-yellow-dark)">Commentaires de l'approbateur:</p>
                          <p className="text-sm text-[#B87333] mt-1">{approval.comments}</p>
                          {approval.conditions && approval.conditions.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm font-medium text-var(--color-yellow-dark)">Conditions:</p>
                              <ul className="list-disc list-inside text-sm text-[#B87333] mt-1">
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
                <h3 className="text-lg font-semibold text-gray-900">Impact Financier</h3>

                <div className="space-y-4">
                  <div className="p-4 bg-[#7A99AC]/10 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-[#7A99AC]">Valeur Originale Totale</span>
                      <span className="text-lg font-bold text-var(--color-blue-dark)">
                        {formatCurrency(aggregatedData.totalOriginalValue)}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-[#B87333]/10 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-[#B87333]">Valeur Comptable Nette</span>
                      <span className="text-lg font-bold text-var(--color-yellow-dark)">
                        {formatCurrency(aggregatedData.totalBookValue)}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-[#6A8A82]/10 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-[#6A8A82]">Valeur de Cession</span>
                      <span className="text-lg font-bold text-var(--color-green-dark)">
                        {formatCurrency(aggregatedData.totalDisposalValue)}
                      </span>
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg ${
                    aggregatedData.totalGainLoss >= 0 ? 'bg-[#6A8A82]/10' : 'bg-red-50'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm font-medium ${
                        aggregatedData.totalGainLoss >= 0 ? 'text-[#6A8A82]' : 'text-var(--color-red-primary)'
                      }`}>
                        {aggregatedData.totalGainLoss >= 0 ? 'Plus-value Totale' : 'Moins-value Totale'}
                      </span>
                      <span className={`text-lg font-bold ${
                        aggregatedData.totalGainLoss >= 0 ? 'text-var(--color-green-dark)' : 'text-var(--color-red-dark)'
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
                <h3 className="text-lg font-semibold text-gray-900">Conformité et Processus</h3>

                <div className="space-y-4">
                  <div className="p-4 bg-[#6A8A82]/10 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-[#6A8A82]">Conformité Environnementale</span>
                      <span className="text-lg font-bold text-var(--color-green-dark)">
                        {formatPercentage(aggregatedData.complianceRate)}
                      </span>
                    </div>
                    <div className="w-full bg-[#6A8A82]/30 rounded-full h-2 mt-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${aggregatedData.complianceRate * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="p-4 bg-[#7A99AC]/10 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-[#7A99AC]">Taux de Finalisation</span>
                      <span className="text-lg font-bold text-var(--color-blue-dark)">
                        {formatPercentage(aggregatedData.completedDisposals / aggregatedData.totalDisposals)}
                      </span>
                    </div>
                    <div className="w-full bg-[#7A99AC]/30 rounded-full h-2 mt-2">
                      <div
                        className="bg-[#7A99AC] h-2 rounded-full"
                        style={{ width: `${(aggregatedData.completedDisposals / aggregatedData.totalDisposals) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="p-4 bg-[#B87333]/10 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-[#B87333]">Approbations en Attente</span>
                      <span className="text-lg font-bold text-var(--color-yellow-dark)">
                        {aggregatedData.pendingApprovals}
                      </span>
                    </div>
                    <p className="text-sm text-[#B87333] mt-1">Traitement nécessaire</p>
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
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {disposalModal.mode === 'create' ? 'Nouvelle Sortie d\'Actif' :
                     disposalModal.mode === 'edit' ? 'Modifier la Sortie' :
                     disposalModal.mode === 'approve' ? 'Approuver la Sortie' :
                     'Détails de la Sortie'}
                  </h3>
                  <button
                    onClick={() => setDisposalModal({ isOpen: false, mode: 'view' })}
                    className="p-2 text-gray-700 hover:text-gray-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {disposalModal.disposal && disposalModal.mode === 'view' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          Actif
                        </label>
                        <p className="text-gray-900 font-semibold">{disposalModal.disposal.assetName}</p>
                        <p className="text-sm text-gray-600">{disposalModal.disposal.assetTag}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          Type de Sortie
                        </label>
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getDisposalTypeColor(disposalModal.disposal.disposalType)}`}>
                          {typeLabels[disposalModal.disposal.disposalType]}
                        </span>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          Raison
                        </label>
                        <p className="text-gray-900">{disposalModal.disposal.reason}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          Méthode
                        </label>
                        <p className="text-gray-900">{disposalModal.disposal.method}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          Acheteur/Destinataire
                        </label>
                        <p className="text-gray-900">
                          {disposalModal.disposal.buyer || disposalModal.disposal.recipient || 'Non défini'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          Statut
                        </label>
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(disposalModal.disposal.status)}`}>
                          {statusLabels[disposalModal.disposal.status]}
                        </span>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          Valeur d'Origine
                        </label>
                        <p className="text-gray-900 font-semibold">
                          {formatCurrency(disposalModal.disposal.originalCost)}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          Valeur Comptable Nette
                        </label>
                        <p className="text-gray-900">
                          {formatCurrency(disposalModal.disposal.bookValue)}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          Valeur de Cession
                        </label>
                        <p className="text-gray-900">
                          {formatCurrency(disposalModal.disposal.disposalValue)}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          Plus/Moins-Value
                        </label>
                        <p className={`font-semibold ${
                          disposalModal.disposal.gainLoss >= 0 ? 'text-[#6A8A82]' : 'text-red-600'
                        }`}>
                          {disposalModal.disposal.gainLoss >= 0 ? '+' : ''}{formatCurrency(disposalModal.disposal.gainLoss)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : disposalModal.disposal && disposalModal.mode === 'edit' ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Colonne gauche */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Actif
                          </label>
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="font-semibold text-gray-900">{disposalModal.disposal.assetName}</p>
                            <p className="text-sm text-gray-600">{disposalModal.disposal.assetTag}</p>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Type de sortie *
                          </label>
                          <select
                            defaultValue={disposalModal.disposal.disposalType}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-[#6A8A82]"
                          >
                            <option value="sale">Vente</option>
                            <option value="donation">Don</option>
                            <option value="destruction">Destruction</option>
                            <option value="trade_in">Échange</option>
                            <option value="scrap">Mise au rebut</option>
                            <option value="transfer">Transfert</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Date de sortie *
                          </label>
                          <input
                            type="date"
                            defaultValue={disposalModal.disposal.plannedDate}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-[#6A8A82]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Valeur de sortie (FCFA) *
                          </label>
                          <input
                            type="number"
                            defaultValue={disposalModal.disposal.disposalValue}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-[#6A8A82]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Méthode de cession
                          </label>
                          <input
                            type="text"
                            defaultValue={disposalModal.disposal.method}
                            placeholder="Ex: Vente aux enchères, vente directe..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-[#6A8A82]"
                          />
                        </div>
                      </div>

                      {/* Colonne droite */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Raison de la sortie *
                          </label>
                          <textarea
                            defaultValue={disposalModal.disposal.reason}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-[#6A8A82]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Acheteur / Bénéficiaire
                          </label>
                          <input
                            type="text"
                            defaultValue={disposalModal.disposal.buyer || disposalModal.disposal.recipient}
                            placeholder="Nom de l'acheteur ou bénéficiaire"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-[#6A8A82]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Statut
                          </label>
                          <select
                            defaultValue={disposalModal.disposal.status}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-[#6A8A82]"
                          >
                            <option value="planned">Planifié</option>
                            <option value="in_process">En cours</option>
                            <option value="completed">Terminé</option>
                            <option value="cancelled">Annulé</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Localisation
                          </label>
                          <input
                            type="text"
                            defaultValue={disposalModal.disposal.location}
                            placeholder="Lieu de récupération"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-[#6A8A82]"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                              Valeur comptable
                            </label>
                            <div className="p-2 bg-gray-50 rounded text-sm text-gray-600">
                              {formatCurrency(disposalModal.disposal.bookValue)}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                              Plus/Moins-value
                            </label>
                            <div className={`p-2 bg-gray-50 rounded text-sm font-semibold ${
                              disposalModal.disposal.gainLoss >= 0 ? 'text-[#6A8A82]' : 'text-red-600'
                            }`}>
                              {disposalModal.disposal.gainLoss >= 0 ? '+' : ''}{formatCurrency(disposalModal.disposal.gainLoss)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section notes */}
                    <div className="border-t pt-4">
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Notes additionnelles
                      </label>
                      <textarea
                        defaultValue={disposalModal.disposal.notes}
                        placeholder="Informations complémentaires..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-[#6A8A82]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Colonne gauche */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Sélectionner l'actif *
                          </label>
                          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-[#6A8A82]">
                            <option value="">-- Choisir un actif --</option>
                            <option value="1">ORD-001 - Ordinateur Dell XPS</option>
                            <option value="2">VEH-002 - Véhicule Toyota</option>
                            <option value="3">MOB-003 - Mobilier Bureau</option>
                            <option value="4">MAC-004 - Machine industrielle</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Type de sortie *
                          </label>
                          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-[#6A8A82]">
                            <option value="">-- Sélectionner le type --</option>
                            <option value="sale">Vente</option>
                            <option value="donation">Don</option>
                            <option value="destruction">Destruction</option>
                            <option value="trade_in">Échange</option>
                            <option value="scrap">Mise au rebut</option>
                            <option value="transfer">Transfert</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Date de sortie prévue *
                          </label>
                          <input
                            type="date"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-[#6A8A82]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Valeur de sortie (FCFA) *
                          </label>
                          <input
                            type="number"
                            placeholder="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-[#6A8A82]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Méthode de cession
                          </label>
                          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-[#6A8A82]">
                            <option value="">-- Sélectionner --</option>
                            <option value="public_auction">Vente aux enchères publiques</option>
                            <option value="direct_sale">Vente directe</option>
                            <option value="tender">Appel d'offres</option>
                            <option value="negotiation">Négociation</option>
                          </select>
                        </div>
                      </div>

                      {/* Colonne droite */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Raison de la sortie *
                          </label>
                          <textarea
                            placeholder="Décrire la raison..."
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-[#6A8A82]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Acheteur / Bénéficiaire
                          </label>
                          <input
                            type="text"
                            placeholder="Nom de l'acheteur ou bénéficiaire"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-[#6A8A82]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Contact
                          </label>
                          <input
                            type="text"
                            placeholder="Téléphone ou email"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-[#6A8A82]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Localisation de sortie
                          </label>
                          <input
                            type="text"
                            placeholder="Lieu de récupération"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-[#6A8A82]"
                          />
                        </div>

                        <div>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-[#6A8A82] focus:ring-[#6A8A82]"
                            />
                            <span className="text-sm text-gray-900">Conformité environnementale requise</span>
                          </label>
                        </div>

                        <div>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-[#6A8A82] focus:ring-[#6A8A82]"
                            />
                            <span className="text-sm text-gray-900">Effacement des données effectué</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Section documents */}
                    <div className="border-t pt-4">
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Documents justificatifs
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#6A8A82] transition-colors">
                        <Upload className="h-10 w-10 text-gray-700 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">
                          Glissez-déposez vos fichiers ici ou
                        </p>
                        <button className="text-sm text-[#6A8A82] hover:text-[#5A7A72] font-medium mt-1">
                          Parcourir les fichiers
                        </button>
                      </div>
                    </div>

                    {/* Section notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Notes additionnelles
                      </label>
                      <textarea
                        placeholder="Informations complémentaires..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-[#6A8A82]"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <ElegantButton
                    variant="outline"
                    onClick={() => setDisposalModal({ isOpen: false, mode: 'view' })}
                  >
                    {disposalModal.mode === 'view' ? 'Fermer' : 'Annuler'}
                  </ElegantButton>
                  {disposalModal.mode !== 'view' && (
                    <ElegantButton
                      variant="primary"
                      onClick={() => {
                        if (disposalModal.mode === 'create') {
                          toast.success('Sortie d\'actif créée avec succès');
                        } else if (disposalModal.mode === 'approve') {
                          toast.success('Sortie approuvée avec succès');
                        } else {
                          toast.success('Modifications sauvegardées');
                        }
                        setDisposalModal({ isOpen: false, mode: 'view' });
                      }}
                    >
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