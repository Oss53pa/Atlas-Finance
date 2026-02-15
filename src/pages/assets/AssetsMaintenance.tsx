import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Wrench,
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
  Bell,
  Settings,
  ShieldCheck,
  XCircle
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

interface MaintenanceRecord {
  id: string;
  assetId: string;
  assetName: string;
  assetTag: string;
  category: string;
  maintenanceType: 'preventive' | 'corrective' | 'predictive' | 'emergency';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'critical';
  scheduledDate: string;
  completedDate?: string;
  estimatedDuration: number; // in hours
  actualDuration?: number;
  cost: number;
  estimatedCost: number;
  assignedTo?: string;
  technician?: string;
  supplier?: string;
  description: string;
  workPerformed?: string;
  partsUsed?: string[];
  location: string;
  nextMaintenanceDate?: string;
  notes?: string;
  attachments?: string[];
}

interface MaintenanceSchedule {
  assetId: string;
  assetName: string;
  assetTag: string;
  category: string;
  location: string;
  maintenanceType: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'bi_annually';
  lastMaintenance: string;
  nextMaintenance: string;
  daysUntilDue: number;
  isOverdue: boolean;
  estimatedCost: number;
  assignedTo?: string;
}

interface MaintenanceModal {
  isOpen: boolean;
  mode: 'view' | 'edit' | 'create' | 'schedule';
  record?: MaintenanceRecord;
}

const AssetsMaintenance: React.FC = () => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterTechnician, setFilterTechnician] = useState('all');
  const [viewMode, setViewMode] = useState<'records' | 'schedule' | 'analytics'>('records');
  const [maintenanceModal, setMaintenanceModal] = useState<MaintenanceModal>({ isOpen: false, mode: 'view' });
  const [selectedPeriod, setSelectedPeriod] = useState('current_month');

  // Form state for create/edit modes
  const [formData, setFormData] = useState({
    assetId: '',
    assetName: '',
    assetTag: '',
    category: 'materiel_informatique',
    maintenanceType: 'preventive' as 'preventive' | 'corrective' | 'predictive' | 'emergency',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    scheduledDate: '',
    estimatedDuration: '',
    estimatedCost: '',
    assignedTo: '',
    technician: '',
    supplier: '',
    description: '',
    location: '',
    notes: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Mock data for maintenance records
  const mockMaintenanceRecords: MaintenanceRecord[] = [
    {
      id: '1',
      assetId: 'IT001',
      assetName: 'MacBook Pro 16" M3',
      assetTag: 'IT001',
      category: 'materiel_informatique',
      maintenanceType: 'preventive',
      status: 'scheduled',
      priority: 'medium',
      scheduledDate: '2024-09-25T09:00:00Z',
      estimatedDuration: 2,
      cost: 0,
      estimatedCost: 150,
      assignedTo: 'Service IT',
      technician: 'Marc Technician',
      description: 'Nettoyage interne, mise à jour système, vérification hardware',
      location: 'Bureau Paris - 2ème étage',
      nextMaintenanceDate: '2025-03-25T09:00:00Z',
      notes: 'Maintenance préventive trimestrielle'
    },
    {
      id: '2',
      assetId: 'VH001',
      assetName: 'Mercedes Sprinter',
      assetTag: 'VH001',
      category: 'vehicules',
      maintenanceType: 'preventive',
      status: 'completed',
      priority: 'high',
      scheduledDate: '2024-09-15T08:00:00Z',
      completedDate: '2024-09-15T17:00:00Z',
      estimatedDuration: 8,
      actualDuration: 9,
      cost: 850,
      estimatedCost: 800,
      assignedTo: 'Garage Partenaire',
      technician: 'Pierre Mécanicien',
      supplier: 'Mercedes Service',
      description: 'Révision complète 20 000 km',
      workPerformed: 'Vidange, changement filtres, contrôle freins, pneus, éclairage',
      partsUsed: ['Huile moteur', 'Filtre à huile', 'Filtre à air', 'Plaquettes de frein'],
      location: 'Garage Mercedes - Zone industrielle',
      nextMaintenanceDate: '2025-03-15T08:00:00Z',
      notes: 'Révision effectuée selon le plan d\'entretien constructeur'
    },
    {
      id: '3',
      assetId: 'EQ001',
      assetName: 'Imprimante 3D Ultimaker',
      assetTag: 'EQ001',
      category: 'equipements',
      maintenanceType: 'corrective',
      status: 'in_progress',
      priority: 'high',
      scheduledDate: '2024-09-20T14:00:00Z',
      estimatedDuration: 4,
      cost: 320,
      estimatedCost: 400,
      assignedTo: 'Service Technique',
      technician: 'Sophie Technicienne',
      supplier: 'Ultimaker Support',
      description: 'Remplacement tête d\'impression défaillante',
      location: 'Atelier prototype',
      notes: 'Panne détectée lors de l\'utilisation'
    },
    {
      id: '4',
      assetId: 'AC001',
      assetName: 'Climatisation Bureau Principal',
      assetTag: 'AC001',
      category: 'equipements',
      maintenanceType: 'preventive',
      status: 'overdue',
      priority: 'critical',
      scheduledDate: '2024-09-10T10:00:00Z',
      estimatedDuration: 3,
      cost: 0,
      estimatedCost: 200,
      assignedTo: 'Service Maintenance',
      description: 'Nettoyage filtres, contrôle système, recharge gaz',
      location: 'Bureau principal',
      notes: 'Maintenance en retard - priorité élevée'
    },
    {
      id: '5',
      assetId: 'PR001',
      assetName: 'Imprimante laser HP',
      assetTag: 'PR001',
      category: 'materiel_informatique',
      maintenanceType: 'corrective',
      status: 'scheduled',
      priority: 'medium',
      scheduledDate: '2024-09-22T11:00:00Z',
      estimatedDuration: 1,
      cost: 0,
      estimatedCost: 80,
      assignedTo: 'Service IT',
      technician: 'Marc Technician',
      description: 'Remplacement cartouche et nettoyage',
      location: 'Bureau comptabilité',
      notes: 'Problème de qualité d\'impression'
    }
  ];

  // Mock maintenance schedule
  const mockMaintenanceSchedule: MaintenanceSchedule[] = [
    {
      assetId: 'IT002',
      assetName: 'Serveur Dell R740',
      assetTag: 'IT002',
      category: 'materiel_informatique',
      location: 'Salle serveur',
      maintenanceType: 'Maintenance préventive',
      frequency: 'quarterly',
      lastMaintenance: '2024-06-15',
      nextMaintenance: '2024-09-15',
      daysUntilDue: -4,
      isOverdue: true,
      estimatedCost: 300,
      assignedTo: 'Service IT'
    },
    {
      assetId: 'VH002',
      assetName: 'Camion de livraison',
      assetTag: 'VH002',
      category: 'vehicules',
      location: 'Parking',
      maintenanceType: 'Révision technique',
      frequency: 'annually',
      lastMaintenance: '2023-10-01',
      nextMaintenance: '2024-10-01',
      daysUntilDue: 12,
      isOverdue: false,
      estimatedCost: 1200,
      assignedTo: 'Garage Partenaire'
    },
    {
      assetId: 'EQ002',
      assetName: 'Compresseur d\'air',
      assetTag: 'EQ002',
      category: 'equipements',
      location: 'Atelier',
      maintenanceType: 'Contrôle sécurité',
      frequency: 'bi_annually',
      lastMaintenance: '2024-03-01',
      nextMaintenance: '2024-09-01',
      daysUntilDue: -18,
      isOverdue: true,
      estimatedCost: 250,
      assignedTo: 'Organisme agréé'
    },
    {
      assetId: 'IT003',
      assetName: 'Système de sauvegarde',
      assetTag: 'IT003',
      category: 'materiel_informatique',
      location: 'Salle serveur',
      maintenanceType: 'Test de sauvegarde',
      frequency: 'monthly',
      lastMaintenance: '2024-08-15',
      nextMaintenance: '2024-09-15',
      daysUntilDue: -4,
      isOverdue: true,
      estimatedCost: 100,
      assignedTo: 'Service IT'
    }
  ];

  // Filter maintenance records
  const filteredRecords = useMemo(() => {
    return mockMaintenanceRecords.filter(record => {
      const matchesSearch = record.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          record.assetTag.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          record.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === 'all' || record.status === filterStatus;
      const matchesType = filterType === 'all' || record.maintenanceType === filterType;
      const matchesPriority = filterPriority === 'all' || record.priority === filterPriority;
      const matchesTechnician = filterTechnician === 'all' || record.technician === filterTechnician;

      return matchesSearch && matchesStatus && matchesType && matchesPriority && matchesTechnician;
    });
  }, [searchTerm, filterStatus, filterType, filterPriority, filterTechnician, mockMaintenanceRecords]);

  // Calculate aggregated metrics
  const aggregatedData = useMemo(() => {
    const totalRecords = filteredRecords.length;
    const completedRecords = filteredRecords.filter(r => r.status === 'completed').length;
    const scheduledRecords = filteredRecords.filter(r => r.status === 'scheduled').length;
    const overdueRecords = filteredRecords.filter(r => r.status === 'overdue').length;
    const inProgressRecords = filteredRecords.filter(r => r.status === 'in_progress').length;

    const totalCost = filteredRecords.reduce((sum, r) => sum + r.cost, 0);
    const estimatedCost = filteredRecords.reduce((sum, r) => sum + r.estimatedCost, 0);

    const averageDuration = filteredRecords
      .filter(r => r.actualDuration)
      .reduce((sum, r, _, arr) => sum + (r.actualDuration || 0) / arr.length, 0);

    const overdueScheduled = mockMaintenanceSchedule.filter(s => s.isOverdue).length;
    const upcomingScheduled = mockMaintenanceSchedule.filter(s => !s.isOverdue && s.daysUntilDue <= 30).length;

    return {
      totalRecords,
      completedRecords,
      scheduledRecords,
      overdueRecords,
      inProgressRecords,
      totalCost,
      estimatedCost,
      averageDuration,
      overdueScheduled,
      upcomingScheduled
    };
  }, [filteredRecords, mockMaintenanceSchedule]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'materiel_informatique': return <Monitor className="h-5 w-5" />;
      case 'vehicules': return <Truck className="h-5 w-5" />;
      case 'equipements': return <Wrench className="h-5 w-5" />;
      default: return <Wrench className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'scheduled': return 'text-blue-600 bg-blue-50';
      case 'in_progress': return 'text-yellow-600 bg-yellow-50';
      case 'overdue': return 'text-red-600 bg-red-50';
      case 'cancelled': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-700 bg-red-100';
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getMaintenanceTypeColor = (type: string) => {
    switch (type) {
      case 'preventive': return 'text-blue-600 bg-blue-50';
      case 'corrective': return 'text-orange-600 bg-orange-50';
      case 'predictive': return 'text-purple-600 bg-purple-50';
      case 'emergency': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const statusLabels = {
    scheduled: 'Planifié',
    in_progress: 'En cours',
    completed: 'Terminé',
    cancelled: 'Annulé',
    overdue: 'En retard'
  };

  const priorityLabels = {
    low: 'Faible',
    medium: 'Moyenne',
    high: 'Élevée',
    critical: 'Critique'
  };

  const typeLabels = {
    preventive: 'Préventif',
    corrective: 'Correctif',
    predictive: 'Prédictif',
    emergency: 'Urgence'
  };

  const uniqueTechnicians = [...new Set(mockMaintenanceRecords.map(r => r.technician).filter(Boolean))];

  // Form handlers
  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.assetName.trim()) {
      errors.assetName = 'Le nom de l\'actif est requis';
    }

    if (!formData.description.trim()) {
      errors.description = 'La description est requise';
    }

    if (!formData.scheduledDate) {
      errors.scheduledDate = 'La date planifiée est requise';
    }

    if (!formData.estimatedDuration || parseFloat(formData.estimatedDuration) <= 0) {
      errors.estimatedDuration = 'La durée estimée doit être supérieure à 0';
    }

    if (!formData.estimatedCost || parseFloat(formData.estimatedCost) < 0) {
      errors.estimatedCost = 'Le coût estimé doit être positif';
    }

    if (!formData.location.trim()) {
      errors.location = 'L\'emplacement est requis';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      assetId: '',
      assetName: '',
      assetTag: '',
      category: 'materiel_informatique',
      maintenanceType: 'preventive',
      priority: 'medium',
      scheduledDate: '',
      estimatedDuration: '',
      estimatedCost: '',
      assignedTo: '',
      technician: '',
      supplier: '',
      description: '',
      location: '',
      notes: ''
    });
    setFormErrors({});
  };

  const handleModalOpen = (mode: 'view' | 'edit' | 'create' | 'schedule', record?: MaintenanceRecord) => {
    if (mode === 'edit' && record) {
      setFormData({
        assetId: record.assetId,
        assetName: record.assetName,
        assetTag: record.assetTag,
        category: record.category,
        maintenanceType: record.maintenanceType,
        priority: record.priority,
        scheduledDate: record.scheduledDate.split('T')[0],
        estimatedDuration: record.estimatedDuration.toString(),
        estimatedCost: record.estimatedCost.toString(),
        assignedTo: record.assignedTo || '',
        technician: record.technician || '',
        supplier: record.supplier || '',
        description: record.description,
        location: record.location,
        notes: record.notes || ''
      });
    } else if (mode === 'create') {
      resetForm();
    }
    setMaintenanceModal({ isOpen: true, mode, record });
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      alert('Veuillez corriger les erreurs du formulaire');
      return;
    }

    try {
      if (maintenanceModal.mode === 'create') {
        // Create new maintenance record
        alert('Maintenance créée avec succès!');
      } else if (maintenanceModal.mode === 'edit') {
        // Update existing maintenance record
        alert('Maintenance mise à jour avec succès!');
      }
      setMaintenanceModal({ isOpen: false, mode: 'view' });
      resetForm();
    } catch (error) {
      console.error('Error submitting maintenance:', error);
      alert('Erreur lors de l\'enregistrement');
    }
  };

  const statusChartData = [
    { label: 'Terminés', value: aggregatedData.completedRecords, color: 'bg-green-500' },
    { label: 'Planifiés', value: aggregatedData.scheduledRecords, color: 'bg-blue-500' },
    { label: t('status.inProgress'), value: aggregatedData.inProgressRecords, color: 'bg-yellow-500' },
    { label: 'En retard', value: aggregatedData.overdueRecords, color: 'bg-red-500' }
  ];

  const typeChartData = [
    { label: 'Préventif', value: filteredRecords.filter(r => r.maintenanceType === 'preventive').length, color: 'bg-blue-500' },
    { label: 'Correctif', value: filteredRecords.filter(r => r.maintenanceType === 'corrective').length, color: 'bg-orange-500' },
    { label: 'Prédictif', value: filteredRecords.filter(r => r.maintenanceType === 'predictive').length, color: 'bg-purple-500' },
    { label: 'Urgence', value: filteredRecords.filter(r => r.maintenanceType === 'emergency').length, color: 'bg-red-500' }
  ];

  return (
    <PageContainer background="warm" padding="lg">
      <div className="space-y-8">
        {/* Header */}
        <SectionHeader
          title="Maintenance des Actifs"
          subtitle="Planification, suivi et historique des maintenances"
          icon={Wrench}
          action={
            <div className="flex gap-3">
              <ElegantButton variant="outline" icon={Bell}>
                Alertes
              </ElegantButton>
              <ElegantButton variant="outline" icon={Download}>
                Rapport
              </ElegantButton>
              <ElegantButton
                variant="primary"
                icon={Plus}
                onClick={() => handleModalOpen('create')}
              >
                Nouvelle Maintenance
              </ElegantButton>
            </div>
          }
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Maintenances Totales"
            value={aggregatedData.totalRecords.toString()}
            subtitle={`${aggregatedData.completedRecords} terminées`}
            icon={Wrench}
            color="primary"
            delay={0.1}
            withChart={true}
          />

          <KPICard
            title="En Retard"
            value={aggregatedData.overdueRecords.toString()}
            subtitle={`${aggregatedData.overdueScheduled} planifiées en retard`}
            icon={AlertTriangle}
            color="error"
            delay={0.2}
            withChart={true}
          />

          <KPICard
            title="Coût Total"
            value={formatCurrency(aggregatedData.totalCost)}
            subtitle={`Estimé: ${formatCurrency(aggregatedData.estimatedCost)}`}
            icon={DollarSign}
            color="success"
            delay={0.3}
            withChart={true}
          />

          <KPICard
            title="Durée Moyenne"
            value={`${aggregatedData.averageDuration.toFixed(1)}h`}
            subtitle={`${aggregatedData.upcomingScheduled} prochainement`}
            icon={Clock}
            color="neutral"
            delay={0.4}
            withChart={true}
          />
        </div>

        {/* View Mode Selector */}
        <UnifiedCard variant="elevated" size="md">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex bg-white rounded-2xl p-1 shadow-lg border border-neutral-200">
              {(['records', 'schedule', 'analytics'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    viewMode === mode
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-neutral-600 hover:text-blue-600'
                  }`}
                >
                  {mode === 'records' ? 'Interventions' :
                   mode === 'schedule' ? 'Planning' : 'Analytique'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-neutral-700">Période:</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="current_month">Mois en cours</option>
                <option value="current_quarter">Trimestre en cours</option>
                <option value="current_year">Année en cours</option>
                <option value="last_month">Mois dernier</option>
              </select>
            </div>
          </div>
        </UnifiedCard>

        {viewMode === 'records' && (
          <>
            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <ModernChartCard
                  title="État des Maintenances"
                  subtitle="Répartition par statut"
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
                  title="Types de Maintenance"
                  subtitle="Répartition par type d'intervention"
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
                <h3 className="text-lg font-semibold text-neutral-800">Filtres et Recherche</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Toutes les priorités</option>
                    {Object.entries(priorityLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>

                  <select
                    value={filterTechnician}
                    onChange={(e) => setFilterTechnician(e.target.value)}
                    className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Tous les techniciens</option>
                    {uniqueTechnicians.map(tech => (
                      <option key={tech} value={tech}>{tech}</option>
                    ))}
                  </select>
                </div>
              </div>
            </UnifiedCard>

            {/* Maintenance Records List */}
            <UnifiedCard variant="elevated" size="lg">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-neutral-800">
                  Interventions de Maintenance ({filteredRecords.length})
                </h3>

                <div className="space-y-4">
                  {filteredRecords.map((record, index) => (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-6 bg-white border border-neutral-200 rounded-xl hover:shadow-md transition-all duration-200"
                    >
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-start space-x-4">
                            <div className="p-3 bg-blue-50 rounded-lg">
                              {getCategoryIcon(record.category)}
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-semibold text-neutral-800 text-lg">{record.assetName}</h4>
                              <div className="flex items-center space-x-4 text-sm text-neutral-500">
                                <div className="flex items-center space-x-1">
                                  <Tag className="h-3 w-3" />
                                  <span>{record.assetTag}</span>
                                </div>
                                <span>•</span>
                                <span>{formatDate(record.scheduledDate)}</span>
                                <span>•</span>
                                <span>{record.estimatedDuration}h estimées</span>
                              </div>
                              <p className="text-sm text-neutral-600">{record.description}</p>
                              <div className="flex items-center space-x-3">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getMaintenanceTypeColor(record.maintenanceType)}`}>
                                  {typeLabels[record.maintenanceType]}
                                </span>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(record.priority)}`}>
                                  {priorityLabels[record.priority]}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(record.status)}`}>
                              {statusLabels[record.status]}
                            </span>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleModalOpen('view', record)}
                                className="p-2 text-neutral-400 hover:text-blue-600 transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleModalOpen('edit', record)}
                                className="p-2 text-neutral-400 hover:text-green-600 transition-colors"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-neutral-100">
                          <div>
                            <p className="text-sm text-neutral-500">Technicien:</p>
                            <p className="font-medium text-neutral-800">{record.technician || 'Non assigné'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-neutral-500">Coût:</p>
                            <p className="font-medium text-neutral-800">
                              {record.cost > 0 ? formatCurrency(record.cost) : `Est. ${formatCurrency(record.estimatedCost)}`}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-neutral-500">Emplacement:</p>
                            <p className="font-medium text-neutral-800">{record.location}</p>
                          </div>
                          <div>
                            <p className="text-sm text-neutral-500">Assigné à:</p>
                            <p className="font-medium text-neutral-800">{record.assignedTo || 'Non assigné'}</p>
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

        {viewMode === 'schedule' && (
          <UnifiedCard variant="elevated" size="lg">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-neutral-800">
                  Planning de Maintenance
                </h3>
                <ElegantButton
                  variant="primary"
                  icon={Plus}
                  onClick={() => handleModalOpen('schedule')}
                >
                  Planifier
                </ElegantButton>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="text-left py-3 px-4 font-medium text-neutral-600">Actif</th>
                      <th className="text-left py-3 px-4 font-medium text-neutral-600">Type de Maintenance</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">Fréquence</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">Dernière</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">Prochaine</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">Statut</th>
                      <th className="text-right py-3 px-4 font-medium text-neutral-600">Coût Estimé</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockMaintenanceSchedule.map((schedule, index) => (
                      <motion.tr
                        key={schedule.assetId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-neutral-100 hover:bg-neutral-50"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-50 rounded-lg">
                              {getCategoryIcon(schedule.category)}
                            </div>
                            <div>
                              <p className="font-semibold text-neutral-800">{schedule.assetName}</p>
                              <div className="flex items-center space-x-1 text-sm text-neutral-500">
                                <Tag className="h-3 w-3" />
                                <span>{schedule.assetTag}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-neutral-800">{schedule.maintenanceType}</p>
                          <p className="text-sm text-neutral-500">{schedule.location}</p>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-600">
                            {schedule.frequency === 'weekly' ? 'Hebdomadaire' :
                             schedule.frequency === 'monthly' ? 'Mensuelle' :
                             schedule.frequency === 'quarterly' ? 'Trimestrielle' :
                             schedule.frequency === 'bi_annually' ? 'Semestrielle' : 'Annuelle'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="text-sm text-neutral-600">
                            {formatDate(schedule.lastMaintenance)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="text-sm text-neutral-800 font-medium">
                            {formatDate(schedule.nextMaintenance)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {schedule.isOverdue ? (
                            <div className="flex items-center justify-center space-x-1">
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                              <span className="text-sm text-red-600 font-medium">
                                {Math.abs(schedule.daysUntilDue)} jours de retard
                              </span>
                            </div>
                          ) : schedule.daysUntilDue <= 7 ? (
                            <div className="flex items-center justify-center space-x-1">
                              <Clock className="h-4 w-4 text-yellow-600" />
                              <span className="text-sm text-yellow-600 font-medium">
                                Dans {schedule.daysUntilDue} jours
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center space-x-1">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm text-green-600">
                                Dans {schedule.daysUntilDue} jours
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="font-medium text-neutral-800">
                            {formatCurrency(schedule.estimatedCost)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex justify-center space-x-2">
                            <button className="p-2 text-neutral-400 hover:text-blue-600 transition-colors" aria-label="Calendrier">
                              <Calendar className="h-4 w-4" />
                            </button>
                            <button className="p-2 text-neutral-400 hover:text-green-600 transition-colors" aria-label="Paramètres">
                              <Settings className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </UnifiedCard>
        )}

        {viewMode === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UnifiedCard variant="elevated" size="lg">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-neutral-800">Métriques de Performance</h3>

                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-blue-700">Taux de Maintenance Préventive</span>
                      <span className="text-lg font-bold text-blue-800">75%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-green-700">Conformité Planning</span>
                      <span className="text-lg font-bold text-green-800">82%</span>
                    </div>
                    <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '82%' }}></div>
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-yellow-700">Respect Budget</span>
                      <span className="text-lg font-bold text-yellow-800">88%</span>
                    </div>
                    <div className="w-full bg-yellow-200 rounded-full h-2 mt-2">
                      <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '88%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </UnifiedCard>

            <UnifiedCard variant="elevated" size="lg">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-neutral-800">Alertes et Actions</h3>

                <div className="space-y-3">
                  <div className="p-3 border-l-4 border-red-400 bg-red-50">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium text-red-800">3 maintenances en retard</span>
                    </div>
                    <p className="text-sm text-red-700 mt-1">Action requise immédiatement</p>
                  </div>

                  <div className="p-3 border-l-4 border-yellow-400 bg-yellow-50">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">5 maintenances à venir cette semaine</span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-1">Planification recommandée</p>
                  </div>

                  <div className="p-3 border-l-4 border-blue-400 bg-blue-50">
                    <div className="flex items-center space-x-2">
                      <Bell className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">2 nouveaux rapports disponibles</span>
                    </div>
                    <p className="text-sm text-blue-700 mt-1">Révision des procédures</p>
                  </div>
                </div>
              </div>
            </UnifiedCard>
          </div>
        )}

        {/* Maintenance Modal */}
        {maintenanceModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-neutral-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-neutral-800">
                    {maintenanceModal.mode === 'create' ? 'Nouvelle Maintenance' :
                     maintenanceModal.mode === 'edit' ? 'Modifier la Maintenance' :
                     maintenanceModal.mode === 'schedule' ? 'Planifier Maintenance' :
                     'Détails de la Maintenance'}
                  </h3>
                  <button
                    onClick={() => setMaintenanceModal({ isOpen: false, mode: 'view' })}
                    className="p-2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {maintenanceModal.record ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Actif
                        </label>
                        <p className="text-neutral-800 font-semibold">{maintenanceModal.record.assetName}</p>
                        <p className="text-sm text-neutral-500">{maintenanceModal.record.assetTag}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Type de Maintenance
                        </label>
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getMaintenanceTypeColor(maintenanceModal.record.maintenanceType)}`}>
                          {typeLabels[maintenanceModal.record.maintenanceType]}
                        </span>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Description
                        </label>
                        <p className="text-neutral-800">{maintenanceModal.record.description}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Technicien
                        </label>
                        <p className="text-neutral-800">{maintenanceModal.record.technician || 'Non assigné'}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Statut
                        </label>
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(maintenanceModal.record.status)}`}>
                          {statusLabels[maintenanceModal.record.status]}
                        </span>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Priorité
                        </label>
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getPriorityColor(maintenanceModal.record.priority)}`}>
                          {priorityLabels[maintenanceModal.record.priority]}
                        </span>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Date Planifiée
                        </label>
                        <p className="text-neutral-800">{formatDate(maintenanceModal.record.scheduledDate)}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Coût
                        </label>
                        <p className="text-neutral-800 font-semibold">
                          {maintenanceModal.record.cost > 0 ?
                            formatCurrency(maintenanceModal.record.cost) :
                            `Estimé: ${formatCurrency(maintenanceModal.record.estimatedCost)}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Asset Information */}
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Nom de l'Actif <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.assetName}
                          onChange={(e) => handleFormChange('assetName', e.target.value)}
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            formErrors.assetName ? 'border-red-500' : 'border-neutral-200'
                          }`}
                          placeholder="Ex: MacBook Pro 16"
                        />
                        {formErrors.assetName && (
                          <p className="text-red-500 text-xs mt-1">{formErrors.assetName}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Tag de l'Actif
                        </label>
                        <input
                          type="text"
                          value={formData.assetTag}
                          onChange={(e) => handleFormChange('assetTag', e.target.value)}
                          className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: IT001"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Catégorie
                        </label>
                        <select
                          value={formData.category}
                          onChange={(e) => handleFormChange('category', e.target.value)}
                          className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="materiel_informatique">Matériel Informatique</option>
                          <option value="vehicules">Véhicules</option>
                          <option value="equipements">Équipements</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Type de Maintenance
                        </label>
                        <select
                          value={formData.maintenanceType}
                          onChange={(e) => handleFormChange('maintenanceType', e.target.value)}
                          className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="preventive">Préventif</option>
                          <option value="corrective">Correctif</option>
                          <option value="predictive">Prédictif</option>
                          <option value="emergency">Urgence</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Priorité
                        </label>
                        <select
                          value={formData.priority}
                          onChange={(e) => handleFormChange('priority', e.target.value)}
                          className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="low">Faible</option>
                          <option value="medium">Moyenne</option>
                          <option value="high">Élevée</option>
                          <option value="critical">Critique</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Date Planifiée <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={formData.scheduledDate}
                          onChange={(e) => handleFormChange('scheduledDate', e.target.value)}
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            formErrors.scheduledDate ? 'border-red-500' : 'border-neutral-200'
                          }`}
                        />
                        {formErrors.scheduledDate && (
                          <p className="text-red-500 text-xs mt-1">{formErrors.scheduledDate}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Durée Estimée (heures) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={formData.estimatedDuration}
                          onChange={(e) => handleFormChange('estimatedDuration', e.target.value)}
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            formErrors.estimatedDuration ? 'border-red-500' : 'border-neutral-200'
                          }`}
                          placeholder="Ex: 2.5"
                        />
                        {formErrors.estimatedDuration && (
                          <p className="text-red-500 text-xs mt-1">{formErrors.estimatedDuration}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Coût Estimé (€) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.estimatedCost}
                          onChange={(e) => handleFormChange('estimatedCost', e.target.value)}
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            formErrors.estimatedCost ? 'border-red-500' : 'border-neutral-200'
                          }`}
                          placeholder="Ex: 150.00"
                        />
                        {formErrors.estimatedCost && (
                          <p className="text-red-500 text-xs mt-1">{formErrors.estimatedCost}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Assigné à
                        </label>
                        <input
                          type="text"
                          value={formData.assignedTo}
                          onChange={(e) => handleFormChange('assignedTo', e.target.value)}
                          className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: Service IT"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Technicien
                        </label>
                        <input
                          type="text"
                          value={formData.technician}
                          onChange={(e) => handleFormChange('technician', e.target.value)}
                          className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: Marc Technician"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Fournisseur
                        </label>
                        <input
                          type="text"
                          value={formData.supplier}
                          onChange={(e) => handleFormChange('supplier', e.target.value)}
                          className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: Apple Service"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Emplacement <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.location}
                          onChange={(e) => handleFormChange('location', e.target.value)}
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            formErrors.location ? 'border-red-500' : 'border-neutral-200'
                          }`}
                          placeholder="Ex: Bureau Paris"
                        />
                        {formErrors.location && (
                          <p className="text-red-500 text-xs mt-1">{formErrors.location}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => handleFormChange('description', e.target.value)}
                        rows={3}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          formErrors.description ? 'border-red-500' : 'border-neutral-200'
                        }`}
                        placeholder="Décrivez la maintenance à effectuer..."
                      />
                      {formErrors.description && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.description}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Notes
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => handleFormChange('notes', e.target.value)}
                        rows={2}
                        className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Notes supplémentaires..."
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-200">
                  <ElegantButton
                    variant="outline"
                    onClick={() => {
                      setMaintenanceModal({ isOpen: false, mode: 'view' });
                      if (maintenanceModal.mode !== 'view') {
                        resetForm();
                      }
                    }}
                  >
                    {maintenanceModal.mode === 'view' ? 'Fermer' : 'Annuler'}
                  </ElegantButton>
                  {maintenanceModal.mode !== 'view' && (
                    <ElegantButton variant="primary" onClick={handleSubmit}>
                      {maintenanceModal.mode === 'create' ? 'Créer' :
                       maintenanceModal.mode === 'schedule' ? 'Planifier' : 'Sauvegarder'}
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

export default AssetsMaintenance;