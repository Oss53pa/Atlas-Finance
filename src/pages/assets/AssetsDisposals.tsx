import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PageHeaderActions from '../../components/ui/PageHeaderActions';
import { useData } from '../../contexts/DataContext';
import type { DBAsset } from '../../lib/db';
import { createDisposal, listDisposals, type DisposalInput } from '../../services/immobilisations/disposalService';
import { useLanguage } from '../../contexts/LanguageContext';
import { motion } from 'framer-motion';
import {
  Trash2,
  TrendingUp,
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
  // Produit de cession / plus-moins-value : aucune donnée source (assets ne stocke
  // pas le prix de vente). null = non renseigné → affiché "—", jamais un chiffre inventé.
  disposalValue: number | null;
  gainLoss: number | null;
  buyer?: string;
  recipient?: string;
  method: string;
  location: string;
  initiatedBy: string;
  approvedBy?: string;
  responsiblePerson?: string;
  documentation: string[];
  // Conformité environnementale : non alimentée par l'import → null = inconnu.
  environmentalCompliance: boolean | null;
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
  const { adapter } = useData();

  // Disposed/scrapped assets from DataContext
  const [dbDisposedAssets, setDbDisposedAssets] = useState<DBAsset[]>([]);
  // Actifs encore en service — alimentent le sélecteur du formulaire de cession.
  const [activeAssets, setActiveAssets] = useState<DBAsset[]>([]);
  // Enregistrements de sortie réels (prix, plus/moins-value, écriture liée).
  const [disposalRecords, setDisposalRecords] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [createForm, setCreateForm] = useState({
    assetId: '', disposalType: '', disposalDate: '', disposalValue: '', method: '', reason: '', buyer: '', location: '', notes: '',
  });

  const reload = useCallback(async () => {
    const allAssets = await adapter.getAll('assets') as DBAsset[];
    setDbDisposedAssets(allAssets.filter(a => a.status === 'disposed' || a.status === 'scrapped'));
    setActiveAssets(allAssets.filter(a => a.status !== 'disposed' && a.status !== 'scrapped'));
    try { setDisposalRecords(await listDisposals(adapter)); } catch { setDisposalRecords([]); }
  }, [adapter]);
  useEffect(() => { reload(); }, [reload]);

  const handleCreateDisposal = async () => {
    if (!createForm.assetId || !createForm.disposalType || !createForm.disposalDate) {
      toast.error(t('assetsDisposals.errRequiredFields')); return;
    }
    setSaving(true);
    try {
      const input: DisposalInput = {
        assetId: createForm.assetId, disposalType: createForm.disposalType, disposalDate: createForm.disposalDate,
        disposalValue: parseFloat(createForm.disposalValue) || 0, method: createForm.method || null,
        reason: createForm.reason || null, buyer: createForm.buyer || null, location: createForm.location || null, notes: createForm.notes || null,
      };
      const { gainLoss } = await createDisposal(adapter, input);
      toast.success(t('assetsDisposals.toastSaved', {
        type: gainLoss >= 0 ? t('assetsDisposals.gain') : t('assetsDisposals.loss'),
        amount: formatCurrency(Math.abs(gainLoss)),
      }));
      setDisposalModal({ isOpen: false, mode: 'view' });
      setCreateForm({ assetId: '', disposalType: '', disposalDate: '', disposalValue: '', method: '', reason: '', buyer: '', location: '', notes: '' });
      await reload();
    } catch (e: any) { toast.error(t('assetsDisposals.toastFailed') + ' ' + (e?.message || t('assetsDisposals.genericError'))); }
    finally { setSaving(false); }
  };

  // Map Dexie assets to AssetDisposal shape, enrichi des enregistrements réels.
  const disposals: AssetDisposal[] = useMemo(() => {
    const recByAsset = new Map<string, any>();
    for (const r of disposalRecords) if (r.asset_id) recByAsset.set(r.asset_id, r);
    return dbDisposedAssets.map((asset: DBAsset) => {
      const rec = recByAsset.get(asset.id);
      // VNC = valeur brute − amortissements cumulés (JAMAIS residualValue, qui
      // est la valeur de récupération prévisionnelle, pas la valeur nette).
      const bookValue = rec
        ? Number(rec.book_value) || 0
        : Math.max(0, (Number(asset.acquisitionValue) || 0) - (Number(asset.cumulDepreciation) || 0));

      return {
        id: asset.id,
        assetId: asset.code,
        assetName: asset.name,
        assetTag: asset.code,
        category: asset.category,
        disposalType: (rec?.disposal_type as AssetDisposal['disposalType']) || (asset.status === 'disposed' ? 'sale' as const : 'scrap' as const),
        status: 'completed' as const,
        reason: rec?.reason ?? (asset.status === 'disposed' ? t('assetsDisposals.reasonSale') : t('assetsDisposals.reasonScrap')),
        initiatedDate: rec?.disposal_date ?? asset.acquisitionDate,
        plannedDate: rec?.disposal_date ?? asset.acquisitionDate,
        completedDate: rec?.disposal_date ?? asset.acquisitionDate,
        originalCost: rec ? Number(rec.original_cost) || asset.acquisitionValue : asset.acquisitionValue,
        bookValue,
        // Prix de cession et plus/moins-value : depuis l'enregistrement réel.
        disposalValue: rec ? Number(rec.disposal_value) || 0 : null,
        gainLoss: rec ? Number(rec.gain_loss) || 0 : null,
        method: rec?.method ?? (asset.status === 'disposed' ? t('assetsDisposals.methodSale') : t('assetsDisposals.methodScrap')),
        location: rec?.location ?? '',
        initiatedBy: '',
        responsiblePerson: '',
        documentation: [],
        environmentalCompliance: null,
        notes: rec?.notes ?? t('assetsDisposals.notesDepreciationMethod', { method: String(asset.depreciationMethod ?? '') })
      };
    });
  }, [dbDisposedAssets, disposalRecords, t]);

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
          case 'last_month': {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
            matchesPeriod = disposalDate.getMonth() === lastMonth.getMonth() &&
                          disposalDate.getFullYear() === lastMonth.getFullYear();
            break;
          }
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
    // Produit de cession et plus/moins-value : aucune donnée source → non agrégeables.
    const totalDisposalValue: number | null = null;
    const totalGainLoss: number | null = null;

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
      pendingApprovals
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
      case 'completed': return 'text-[var(--color-primary)] bg-[var(--color-primary)]/10';
      case 'in_process': return 'text-[var(--color-text-secondary)] bg-[var(--color-text-secondary)]/10';
      case 'planned': return 'text-[var(--color-text-tertiary)] bg-[var(--color-text-tertiary)]/10';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getDisposalTypeColor = (type: string) => {
    switch (type) {
      case 'sale': return 'text-[var(--color-primary)] bg-[var(--color-primary)]/10';
      case 'donation': return 'text-[var(--color-text-tertiary)] bg-[var(--color-text-tertiary)]/10';
      case 'trade_in': return 'text-[var(--color-text-secondary)] bg-[var(--color-text-secondary)]/10';
      case 'destruction': return 'text-red-600 bg-red-50';
      case 'scrap': return 'text-[var(--color-border)] bg-[var(--color-border)]/20';
      case 'transfer': return 'text-[#E89A2E] bg-[#E89A2E]/10';
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
    planned: t('assetsDisposals.statusPlanned'),
    in_process: t('assetsDisposals.statusInProcess'),
    completed: t('assetsDisposals.statusCompleted'),
    cancelled: t('assetsDisposals.statusCancelled')
  };

  const typeLabels = {
    sale: t('assetsDisposals.typeSale'),
    donation: t('assetsDisposals.typeDonation'),
    trade_in: t('assetsDisposals.typeTradeIn'),
    destruction: t('assetsDisposals.typeDestruction'),
    scrap: t('assetsDisposals.typeScrap'),
    transfer: t('assetsDisposals.typeTransfer')
  };

  const categoryLabels: Record<string, string> = {
    materiel_informatique: t('assetsDisposals.categoryIt'),
    vehicules: t('assetsDisposals.categoryVehicles'),
    mobilier: t('assetsDisposals.categoryFurniture'),
    equipements: t('assetsDisposals.categoryEquipment')
  };

  const statusChartData = [
    { label: t('assetsDisposals.chartCompleted'), value: aggregatedData.completedDisposals, color: 'bg-[var(--color-primary)]' },
    { label: t('status.inProgress'), value: aggregatedData.inProcessDisposals, color: 'bg-[var(--color-text-secondary)]' },
    { label: t('assetsDisposals.chartPlanned'), value: aggregatedData.plannedDisposals, color: 'bg-[var(--color-text-tertiary)]' }
  ];

  const typeChartData = Object.entries(typeLabels).map(([key, label]) => ({
    label,
    value: filteredDisposals.filter(d => d.disposalType === key).length,
    color: key === 'sale' ? 'bg-[var(--color-primary)]' :
           key === 'donation' ? 'bg-[var(--color-text-tertiary)]' :
           key === 'trade_in' ? 'bg-[var(--color-text-secondary)]' :
           key === 'destruction' ? 'bg-red-600' :
           key === 'scrap' ? 'bg-[var(--color-border)]' : 'bg-[#E89A2E]'
  }));

  return (
    <PageContainer background="warm" padding="lg">
      <div className="space-y-8">
        {/* Header */}
        <SectionHeader
          title={t('assetsDisposals.title')}
          subtitle={t('assetsDisposals.subtitle')}
          icon={Trash2}
          action={
            <div className="flex gap-3">
              <ElegantButton
                variant="outline"
                icon={FileText}
                onClick={() => {
                  toast.success(t('assetsDisposals.reportGenerating'));
                }}
              >
                {t('assetsDisposals.report')}
              </ElegantButton>
              <ExportMenu
                data={filteredDisposals as unknown as Record<string, unknown>[]}
                filename="sorties_actifs"
                columns={{
                  assetName: t('assetsDisposals.colAssetName'),
                  assetTag: t('assetsDisposals.colTag'),
                  category: t('assetsDisposals.colCategory'),
                  disposalType: t('assetsDisposals.colDisposalType'),
                  status: t('assetsDisposals.colStatus'),
                  reason: t('assetsDisposals.colReason'),
                  plannedDate: t('assetsDisposals.colPlannedDate'),
                  originalCost: t('assetsDisposals.colOriginalCost'),
                  bookValue: t('assetsDisposals.colBookValue'),
                  disposalValue: t('assetsDisposals.colDisposalValue'),
                  gainLoss: t('assetsDisposals.colGainLoss'),
                  buyer: t('assetsDisposals.colBuyer'),
                  method: t('assetsDisposals.colMethod'),
                  location: t('assetsDisposals.colLocation')
                }}
                buttonText={t('assetsDisposals.export')}
                buttonVariant="outline"
              />
              <ElegantButton
                variant="primary"
                icon={Plus}
                onClick={() => setDisposalModal({ isOpen: true, mode: 'create' })}
              >
                {t('assetsDisposals.newDisposal')}
              </ElegantButton>
            </div>
          }
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title={t('assetsDisposals.kpiTotalDisposals')}
            value={aggregatedData.totalDisposals.toString()}
            subtitle={t('assetsDisposals.kpiTotalDisposalsSub', { count: String(aggregatedData.completedDisposals) })}
            icon={Trash2}
            color="primary"
            delay={0.1}
            withChart={true}
          />

          <KPICard
            title={t('assetsDisposals.kpiGainLoss')}
            value="—"
            subtitle={t('assetsDisposals.kpiGainLossSub')}
            icon={TrendingUp}
            color="neutral"
            delay={0.2}
            withChart={false}
          />

          <KPICard
            title={t('assetsDisposals.kpiDisposalValue')}
            value="—"
            subtitle={t('assetsDisposals.kpiDisposalValueSub', { value: formatCurrency(aggregatedData.totalBookValue) })}
            icon={DollarSign}
            color="neutral"
            delay={0.3}
            withChart={false}
          />

          <KPICard
            title={t('assetsDisposals.kpiOriginalValue')}
            value={formatCurrency(aggregatedData.totalOriginalValue)}
            subtitle={t('assetsDisposals.kpiOriginalValueSub', { count: String(aggregatedData.totalDisposals) })}
            icon={DollarSign}
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
                      ? 'bg-[var(--color-text-tertiary)] text-white shadow-md'
                      : 'text-gray-600 hover:text-[var(--color-text-tertiary)]'
                  }`}
                >
                  {mode === 'disposals' ? t('assetsDisposals.tabDisposals') :
                   mode === 'approvals' ? t('assetsDisposals.tabApprovals') : t('assetsDisposals.tabAnalytics')}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <PageHeaderActions />
              <label className="text-sm font-medium text-gray-900">{t('assetsDisposals.periodLabel')}</label>
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-var(--color-blue-primary)"
              >
                <option value="all">{t('assetsDisposals.periodAll')}</option>
                <option value="current_month">{t('assetsDisposals.periodCurrentMonth')}</option>
                <option value="last_month">{t('assetsDisposals.periodLastMonth')}</option>
                <option value="current_year">{t('assetsDisposals.periodCurrentYear')}</option>
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
                  title={t('assetsDisposals.chartStatusTitle')}
                  subtitle={t('assetsDisposals.chartStatusSubtitle')}
                  icon={PieChart}
                >
                  <ColorfulBarChart
                    data={statusChartData}
                    height={160}
                  />
                </ModernChartCard>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <ModernChartCard
                  title={t('assetsDisposals.chartTypeTitle')}
                  subtitle={t('assetsDisposals.chartTypeSubtitle')}
                  icon={Target}
                >
                  <ColorfulBarChart
                    data={typeChartData}
                    height={160}
                  />
                </ModernChartCard>
              </motion.div>
            </div>

            {/* Filters */}
            <UnifiedCard variant="elevated" size="md">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('assetsDisposals.filtersTitle')}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-700 h-4 w-4" />
                    <input
                      type="text"
                      placeholder={t('assetsDisposals.searchPlaceholder')}
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
                    <option value="all">{t('assetsDisposals.allStatuses')}</option>
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>

                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-var(--color-blue-primary)"
                  >
                    <option value="all">{t('assetsDisposals.allTypes')}</option>
                    {Object.entries(typeLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>

                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-var(--color-blue-primary)"
                  >
                    <option value="all">{t('assetsDisposals.allCategories')}</option>
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
                    {t('assetsDisposals.listTitle', { count: String(filteredDisposals.length) })}
                  </h3>
                  {selectedDisposals.length > 0 && (
                    <div className="flex gap-2">
                      <ElegantButton
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          toast(t('assetsDisposals.bulkActionsToast', { count: String(selectedDisposals.length) }));
                        }}
                      >
                        {t('assetsDisposals.bulkActions', { count: String(selectedDisposals.length) })}
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
                                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                                    {t('assetsDisposals.envCompliant')}
                                  </span>
                                )}
                                {disposal.dataWiping && (
                                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-[var(--color-text-tertiary)]/10 text-[var(--color-text-tertiary)]">
                                    {t('assetsDisposals.dataWiped')}
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
                                className="p-2 text-gray-700 hover:text-[var(--color-text-tertiary)] transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDisposalModal({ isOpen: true, mode: 'edit', disposal })}
                                className="p-2 text-gray-700 hover:text-[var(--color-primary)] transition-colors"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-var(--color-border-light)">
                          <div>
                            <p className="text-sm text-gray-600">{t('assetsDisposals.bookValueLabel')}</p>
                            <p className="font-medium text-gray-900">{formatCurrency(disposal.bookValue)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">{t('assetsDisposals.disposalValueLabel')}</p>
                            <p className="font-medium text-gray-900">
                              {disposal.disposalValue != null ? formatCurrency(disposal.disposalValue) : '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">{t('assetsDisposals.gainLossLabel')}</p>
                            <p className="font-medium text-gray-900">
                              {disposal.gainLoss != null
                                ? `${disposal.gainLoss >= 0 ? '+' : ''}${formatCurrency(disposal.gainLoss)}`
                                : '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">{t('assetsDisposals.buyerRecipientLabel')}</p>
                            <p className="font-medium text-gray-900">
                              {disposal.buyer || disposal.recipient || t('assetsDisposals.notDefined')}
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
                  {t('assetsDisposals.pendingApprovals')}
                </h3>
                <span className="px-3 py-1 text-sm font-medium rounded-full bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)]">
                  {t('assetsDisposals.pendingCount', { count: String(aggregatedData.pendingApprovals) })}
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
                            <div className="p-3 bg-[var(--color-text-secondary)]/10 rounded-lg">
                              <Clock className="h-6 w-6 text-[var(--color-text-secondary)]" />
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-semibold text-gray-900">{disposal.assetName}</h4>
                              <p className="text-sm text-gray-600">{disposal.reason}</p>
                              <div className="flex items-center space-x-3">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDisposalTypeColor(disposal.disposalType)}`}>
                                  {typeLabels[disposal.disposalType]}
                                </span>
                                <span className="text-sm text-gray-600">
                                  {t('assetsDisposals.valuePrefix')} {disposal.disposalValue != null ? formatCurrency(disposal.disposalValue) : '—'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <ElegantButton
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                toast.error(t('assetsDisposals.disposalRejected'));
                              }}
                            >
                              {t('assetsDisposals.reject')}
                            </ElegantButton>
                            <ElegantButton
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                toast.success(t('assetsDisposals.disposalApproved'));
                              }}
                            >
                              {t('assetsDisposals.approve')}
                            </ElegantButton>
                          </div>
                        </div>

                        <div className="bg-[var(--color-text-secondary)]/10 p-4 rounded-lg">
                          <p className="text-sm font-medium text-var(--color-yellow-dark)">{t('assetsDisposals.approverComments')}</p>
                          <p className="text-sm text-[var(--color-text-secondary)] mt-1">{approval.comments}</p>
                          {approval.conditions && approval.conditions.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm font-medium text-var(--color-yellow-dark)">{t('assetsDisposals.conditions')}</p>
                              <ul className="list-disc list-inside text-sm text-[var(--color-text-secondary)] mt-1">
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
                <h3 className="text-lg font-semibold text-gray-900">{t('assetsDisposals.financialImpact')}</h3>

                <div className="space-y-4">
                  <div className="p-4 bg-[var(--color-text-tertiary)]/10 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-[var(--color-text-tertiary)]">{t('assetsDisposals.totalOriginalValue')}</span>
                      <span className="text-lg font-bold text-var(--color-blue-dark)">
                        {formatCurrency(aggregatedData.totalOriginalValue)}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-[var(--color-text-secondary)]/10 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-[var(--color-text-secondary)]">{t('assetsDisposals.netBookValue')}</span>
                      <span className="text-lg font-bold text-var(--color-yellow-dark)">
                        {formatCurrency(aggregatedData.totalBookValue)}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">{t('assetsDisposals.disposalValue')}</span>
                      <span className="text-lg font-bold text-gray-900">—</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{t('assetsDisposals.disposalValueEmptyHint')}</p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">{t('assetsDisposals.totalGainLoss')}</span>
                      <span className="text-lg font-bold text-gray-900">—</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{t('assetsDisposals.gainLossEmptyHint')}</p>
                  </div>
                </div>
              </div>
            </UnifiedCard>

            <UnifiedCard variant="elevated" size="lg">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('assetsDisposals.complianceProcess')}</h3>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">{t('assetsDisposals.envCompliance')}</span>
                      <span className="text-lg font-bold text-gray-900">—</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{t('assetsDisposals.envComplianceEmptyHint')}</p>
                  </div>

                  <div className="p-4 bg-[var(--color-text-tertiary)]/10 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-[var(--color-text-tertiary)]">{t('assetsDisposals.completionRate')}</span>
                      <span className="text-lg font-bold text-var(--color-blue-dark)">
                        {aggregatedData.totalDisposals > 0
                          ? formatPercentage(aggregatedData.completedDisposals / aggregatedData.totalDisposals)
                          : '—'}
                      </span>
                    </div>
                    <div className="w-full bg-[var(--color-text-tertiary)]/30 rounded-full h-2 mt-2">
                      <div
                        className="bg-[var(--color-text-tertiary)] h-2 rounded-full"
                        style={{ width: `${aggregatedData.totalDisposals > 0 ? (aggregatedData.completedDisposals / aggregatedData.totalDisposals) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="p-4 bg-[var(--color-text-secondary)]/10 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-[var(--color-text-secondary)]">{t('assetsDisposals.pendingApprovals')}</span>
                      <span className="text-lg font-bold text-var(--color-yellow-dark)">
                        {aggregatedData.pendingApprovals}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">{t('assetsDisposals.processingRequired')}</p>
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
                    {disposalModal.mode === 'create' ? t('assetsDisposals.modalCreateTitle') :
                     disposalModal.mode === 'edit' ? t('assetsDisposals.modalEditTitle') :
                     disposalModal.mode === 'approve' ? t('assetsDisposals.modalApproveTitle') :
                     t('assetsDisposals.modalViewTitle')}
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
                          {t('assetsDisposals.fieldAsset')}
                        </label>
                        <p className="text-gray-900 font-semibold">{disposalModal.disposal.assetName}</p>
                        <p className="text-sm text-gray-600">{disposalModal.disposal.assetTag}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          {t('assetsDisposals.fieldDisposalType')}
                        </label>
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getDisposalTypeColor(disposalModal.disposal.disposalType)}`}>
                          {typeLabels[disposalModal.disposal.disposalType]}
                        </span>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          {t('assetsDisposals.fieldReason')}
                        </label>
                        <p className="text-gray-900">{disposalModal.disposal.reason}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          {t('assetsDisposals.fieldMethod')}
                        </label>
                        <p className="text-gray-900">{disposalModal.disposal.method}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          {t('assetsDisposals.fieldBuyerRecipient')}
                        </label>
                        <p className="text-gray-900">
                          {disposalModal.disposal.buyer || disposalModal.disposal.recipient || t('assetsDisposals.notDefined')}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          {t('assetsDisposals.fieldStatus')}
                        </label>
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(disposalModal.disposal.status)}`}>
                          {statusLabels[disposalModal.disposal.status]}
                        </span>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          {t('assetsDisposals.fieldOriginalValue')}
                        </label>
                        <p className="text-gray-900 font-semibold">
                          {formatCurrency(disposalModal.disposal.originalCost)}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          {t('assetsDisposals.fieldNetBookValue')}
                        </label>
                        <p className="text-gray-900">
                          {formatCurrency(disposalModal.disposal.bookValue)}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          {t('assetsDisposals.fieldDisposalValue')}
                        </label>
                        <p className="text-gray-900">
                          {disposalModal.disposal.disposalValue != null
                            ? formatCurrency(disposalModal.disposal.disposalValue)
                            : '—'}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          {t('assetsDisposals.fieldGainLoss')}
                        </label>
                        <p className="font-semibold text-gray-900">
                          {disposalModal.disposal.gainLoss != null
                            ? `${disposalModal.disposal.gainLoss >= 0 ? '+' : ''}${formatCurrency(disposalModal.disposal.gainLoss)}`
                            : '—'}
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
                            {t('assetsDisposals.fieldAsset')}
                          </label>
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="font-semibold text-gray-900">{disposalModal.disposal.assetName}</p>
                            <p className="text-sm text-gray-600">{disposalModal.disposal.assetTag}</p>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            {t('assetsDisposals.formDisposalTypeRequired')}
                          </label>
                          <select
                            defaultValue={disposalModal.disposal.disposalType}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                          >
                            <option value="sale">{t('assetsDisposals.optSale')}</option>
                            <option value="donation">{t('assetsDisposals.optDonation')}</option>
                            <option value="destruction">{t('assetsDisposals.optDestruction')}</option>
                            <option value="trade_in">{t('assetsDisposals.optTradeIn')}</option>
                            <option value="scrap">{t('assetsDisposals.optScrap')}</option>
                            <option value="transfer">{t('assetsDisposals.optTransfer')}</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            {t('assetsDisposals.formDisposalDateRequired')}
                          </label>
                          <input
                            type="date"
                            defaultValue={disposalModal.disposal.plannedDate}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            {t('assetsDisposals.formDisposalValueRequired')}
                          </label>
                          <input
                            type="number"
                            defaultValue={disposalModal.disposal.disposalValue ?? undefined}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            {t('assetsDisposals.formDisposalMethod')}
                          </label>
                          <input
                            type="text"
                            defaultValue={disposalModal.disposal.method}
                            placeholder={t('assetsDisposals.formMethodPlaceholder')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                          />
                        </div>
                      </div>

                      {/* Colonne droite */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            {t('assetsDisposals.formReasonRequired')}
                          </label>
                          <textarea
                            defaultValue={disposalModal.disposal.reason}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            {t('assetsDisposals.formBuyerBeneficiary')}
                          </label>
                          <input
                            type="text"
                            defaultValue={disposalModal.disposal.buyer || disposalModal.disposal.recipient}
                            placeholder={t('assetsDisposals.formBuyerPlaceholder')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            {t('assetsDisposals.formStatus')}
                          </label>
                          <select
                            defaultValue={disposalModal.disposal.status}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                          >
                            <option value="planned">{t('assetsDisposals.statusPlanned')}</option>
                            <option value="in_process">{t('assetsDisposals.statusInProcess')}</option>
                            <option value="completed">{t('assetsDisposals.statusCompleted')}</option>
                            <option value="cancelled">{t('assetsDisposals.statusCancelled')}</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            {t('assetsDisposals.formLocation')}
                          </label>
                          <input
                            type="text"
                            defaultValue={disposalModal.disposal.location}
                            placeholder={t('assetsDisposals.formLocationPlaceholder')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                              {t('assetsDisposals.formBookValue')}
                            </label>
                            <div className="p-2 bg-gray-50 rounded text-sm text-gray-600">
                              {formatCurrency(disposalModal.disposal.bookValue)}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                              {t('assetsDisposals.formGainLoss')}
                            </label>
                            <div className="p-2 bg-gray-50 rounded text-sm font-semibold text-gray-900">
                              {disposalModal.disposal.gainLoss != null
                                ? `${disposalModal.disposal.gainLoss >= 0 ? '+' : ''}${formatCurrency(disposalModal.disposal.gainLoss)}`
                                : '—'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section notes */}
                    <div className="border-t pt-4">
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        {t('assetsDisposals.formNotes')}
                      </label>
                      <textarea
                        defaultValue={disposalModal.disposal.notes}
                        placeholder={t('assetsDisposals.formNotesPlaceholder')}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
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
                            {t('assetsDisposals.formSelectAssetRequired')}
                          </label>
                          <select value={createForm.assetId} onChange={e => setCreateForm(s => ({ ...s, assetId: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]">
                            <option value="">{t('assetsDisposals.formChooseAsset')}</option>
                            {activeAssets.length === 0 && (
                              <option value="" disabled>{t('assetsDisposals.formNoActiveAsset')}</option>
                            )}
                            {activeAssets.map((a) => {
                              const asset = a as unknown as Record<string, unknown>;
                              const ref = (asset.reference || asset.code || asset.id) as string;
                              const name = (asset.name || asset.designation || '') as string;
                              return (
                                <option key={a.id} value={a.id}>{ref} - {name}</option>
                              );
                            })}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            {t('assetsDisposals.formDisposalTypeRequired')}
                          </label>
                          <select value={createForm.disposalType} onChange={e => setCreateForm(s => ({ ...s, disposalType: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]">
                            <option value="">{t('assetsDisposals.formSelectType')}</option>
                            <option value="sale">{t('assetsDisposals.optSale')}</option>
                            <option value="donation">{t('assetsDisposals.optDonation')}</option>
                            <option value="destruction">{t('assetsDisposals.optDestruction')}</option>
                            <option value="trade_in">{t('assetsDisposals.optTradeIn')}</option>
                            <option value="scrap">{t('assetsDisposals.optScrap')}</option>
                            <option value="transfer">{t('assetsDisposals.optTransfer')}</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            {t('assetsDisposals.formPlannedDisposalDateRequired')}
                          </label>
                          <input
                            type="date"
                            value={createForm.disposalDate}
                            onChange={e => setCreateForm(s => ({ ...s, disposalDate: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            {t('assetsDisposals.formDisposalValueRequired')}
                          </label>
                          <input
                            type="number"
                            placeholder="0"
                            value={createForm.disposalValue}
                            onChange={e => setCreateForm(s => ({ ...s, disposalValue: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            {t('assetsDisposals.formDisposalMethod')}
                          </label>
                          <select value={createForm.method} onChange={e => setCreateForm(s => ({ ...s, method: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]">
                            <option value="">{t('assetsDisposals.formSelect')}</option>
                            <option value="public_auction">{t('assetsDisposals.methodPublicAuction')}</option>
                            <option value="direct_sale">{t('assetsDisposals.methodDirectSale')}</option>
                            <option value="tender">{t('assetsDisposals.methodTender')}</option>
                            <option value="negotiation">{t('assetsDisposals.methodNegotiation')}</option>
                          </select>
                        </div>
                      </div>

                      {/* Colonne droite */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            {t('assetsDisposals.formReasonRequired')}
                          </label>
                          <textarea
                            placeholder={t('assetsDisposals.formReasonPlaceholder')}
                            rows={3}
                            value={createForm.reason}
                            onChange={e => setCreateForm(s => ({ ...s, reason: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            {t('assetsDisposals.formBuyerBeneficiary')}
                          </label>
                          <input
                            type="text"
                            placeholder={t('assetsDisposals.formBuyerPlaceholder')}
                            value={createForm.buyer}
                            onChange={e => setCreateForm(s => ({ ...s, buyer: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            {t('assetsDisposals.formContact')}
                          </label>
                          <input
                            type="text"
                            placeholder={t('assetsDisposals.formContactPlaceholder')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            {t('assetsDisposals.formDisposalLocation')}
                          </label>
                          <input
                            type="text"
                            placeholder={t('assetsDisposals.formLocationPlaceholder')}
                            value={createForm.location}
                            onChange={e => setCreateForm(s => ({ ...s, location: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                          />
                        </div>

                        <div>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                            />
                            <span className="text-sm text-gray-900">{t('assetsDisposals.formEnvComplianceRequired')}</span>
                          </label>
                        </div>

                        <div>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                            />
                            <span className="text-sm text-gray-900">{t('assetsDisposals.formDataWipingDone')}</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Section documents */}
                    <div className="border-t pt-4">
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        {t('assetsDisposals.formSupportingDocuments')}
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[var(--color-primary)] transition-colors">
                        <Upload className="h-10 w-10 text-gray-700 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">
                          {t('assetsDisposals.formDropFiles')}
                        </p>
                        <button className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium mt-1">
                          {t('assetsDisposals.formBrowseFiles')}
                        </button>
                      </div>
                    </div>

                    {/* Section notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        {t('assetsDisposals.formNotes')}
                      </label>
                      <textarea
                        placeholder={t('assetsDisposals.formNotesPlaceholder')}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <ElegantButton
                    variant="outline"
                    onClick={() => setDisposalModal({ isOpen: false, mode: 'view' })}
                  >
                    {disposalModal.mode === 'view' ? t('assetsDisposals.close') : t('assetsDisposals.cancel')}
                  </ElegantButton>
                  {disposalModal.mode !== 'view' && (
                    <ElegantButton
                      variant="primary"
                      onClick={() => {
                        if (disposalModal.mode === 'create') {
                          handleCreateDisposal();
                        } else if (disposalModal.mode === 'approve') {
                          // Une cession créée est déjà comptabilisée (écriture validée) :
                          // pas de faux « approuvé ».
                          toast(t('assetsDisposals.alreadyPostedApprove'), { icon: 'ℹ️' });
                          setDisposalModal({ isOpen: false, mode: 'view' });
                        } else {
                          // Une écriture de cession ne se modifie pas : contrepasser puis ressaisir.
                          toast(t('assetsDisposals.alreadyPostedEdit'), { icon: 'ℹ️' });
                          setDisposalModal({ isOpen: false, mode: 'view' });
                        }
                      }}
                    >
                      {disposalModal.mode === 'create' ? (saving ? t('assetsDisposals.saving') : t('assetsDisposals.create')) :
                       disposalModal.mode === 'approve' ? t('assetsDisposals.approve') : t('assetsDisposals.save')}
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