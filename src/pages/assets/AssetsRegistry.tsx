import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Package,
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
  Wrench,
  MapPin,
  User,
  QrCode,
  FileText,
  Tag,
  DollarSign,
  Activity,
  Archive,
  X,
  Info,
  Camera,
  Brain,
  Wifi,
  Shield,
  List,
  Settings,
  History,
  Upload,
  Import,
  Database,
  Users,
  RotateCcw,
  Copy,
  Trash2,
  Calculator,
  Paperclip
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

interface Asset {
  id: string;
  asset_number: string;
  description: string;
  asset_class: string;
  asset_category: string;
  asset_identification: string;
  uom_group: string;
  capital_appropriation_number: string;

  // Location and assignment
  location: string;
  technician: string;
  employee: string;

  // Dates
  capitalization_date: string;
  acquisition_date: string;
  warranty_end: string;
  last_inventory: string;

  // Financial data
  acquisition_cost: number;
  historical_apc: number; // Accumulated Provision for Depreciation
  net_book_value: number;
  historical_nbc: number; // Net Book Cost
  ordinary_depreciation: number;
  unplanned_depreciation: number;
  special_depreciation: number;
  write_up: number;
  salvage_value: number;

  // Depreciation
  asset_group: string;
  depreciation_group: string;
  depreciation_method: string;
  depreciation_rate: number;

  // Additional fields
  serial_number: string;
  quantity: number;
  status: 'active' | 'inactive' | 'maintenance' | 'disposed' | 'en_service';
  supplier: string;
  department: string;
  notes: string;

  // Legacy fields for compatibility
  code: string;
  designation: string;
  category: string;
  subcategory: string;
  acquisition_value: number;
  current_value: number;
  cumulated_depreciation: number;
  net_value: number;
  responsible: string;
}

interface AssetCategory {
  code: string;
  name: string;
  count: number;
  totalValue: number;
  averageAge: number;
  depreciationRate: number;
}

interface AssetModal {
  isOpen: boolean;
  mode: 'view' | 'edit' | 'create';
  asset?: Asset;
}

const AssetsRegistry: React.FC = () => {
  const [activeMainTab, setActiveMainTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterCondition, setFilterCondition] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [assetModal, setAssetModal] = useState<AssetModal>({ isOpen: false, mode: 'view' });
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);

  // États pour les modales Asset Master Data
  const [showNewAssetModal, setShowNewAssetModal] = useState(false);
  const [showEditAssetModal, setShowEditAssetModal] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState<Asset | null>(null);
  const [activeFormTab, setActiveFormTab] = useState('general');
  const [activeGeneralTab, setActiveGeneralTab] = useState('basic');
  const [activeImmobilisationTab, setActiveImmobilisationTab] = useState('overview');
  const [activeMaintenanceTab, setActiveMaintenanceTab] = useState('contract');

  // Services d'intégration pour les données automatiques
  const [capitationData, setCapitationData] = useState<{
    capital_appropriation_number: string;
    asset_class: string;
    employee: string;
  } | null>(null);

  const [wiseFMData, setWiseFMData] = useState<{
    technician: string;
    department: string;
    maintenance_contract: string;
  } | null>(null);

  // États pour le formulaire de nouvel actif
  const [newAssetForm, setNewAssetForm] = useState({
    asset_number: '',
    description: '',
    asset_class: '',
    asset_category: '',
    asset_identification: '',
    uom_group: '',
    capital_appropriation_number: '',
    location: '',
    technician: '',
    employee: '',
    capitalization_date: '',
    acquisition_date: '',
    warranty_end: '',
    acquisition_cost: 0,
    historical_apc: 0,
    net_book_value: 0,
    historical_nbc: 0,
    ordinary_depreciation: 0,
    unplanned_depreciation: 0,
    special_depreciation: 0,
    write_up: 0,
    salvage_value: 0,
    asset_group: '',
    depreciation_group: '',
    depreciation_method: '',
    serial_number: '',
    quantity: 1,
    supplier: '',
    department: '',
    notes: '',
    // Legacy fields
    code: '',
    designation: '',
    category: '',
    subcategory: '',
    acquisition_value: 0,
    responsible: ''
  });

  // Fonctions d'intégration pour récupérer les données automatiques
  const fetchCapitationData = async (capitationId?: string) => {
    try {
      // Simulation d'appel API vers le système de capitation
      // En production, remplacer par un vrai appel API
      const response = await fetch(`/api/capitation/${capitationId || 'current'}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCapitationData({
          capital_appropriation_number: data.capital_appropriation_request_number,
          asset_class: data.asset_class,
          employee: data.employee_name
        });

        // Auto-remplir le formulaire
        setNewAssetForm(prev => ({
          ...prev,
          capital_appropriation_number: data.capital_appropriation_request_number,
          asset_class: data.asset_class,
          employee: data.employee_name
        }));
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des données de capitation:', error);
      // Données mock pour développement
      const mockCapitationData = {
        capital_appropriation_number: 'CAR-2024-AUTO-001',
        asset_class: '24 - matériel, mobilier',
        employee: 'Fatima Ndiaye'
      };
      setCapitationData(mockCapitationData);
      setNewAssetForm(prev => ({
        ...prev,
        ...mockCapitationData
      }));
    }
  };

  const fetchWiseFMData = async (contractId?: string) => {
    try {
      // Simulation d'appel API vers WiseFM
      const response = await fetch(`/api/wisefm/contracts/${contractId || 'current'}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setWiseFMData({
          technician: data.assigned_technician,
          department: data.department,
          maintenance_contract: data.contract_number
        });

        // Auto-remplir le formulaire
        setNewAssetForm(prev => ({
          ...prev,
          technician: data.assigned_technician,
          department: data.department
        }));
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des données WiseFM:', error);
      // Données mock pour développement
      const mockWiseFMData = {
        technician: 'Amadou Diallo',
        department: 'Maintenance',
        maintenance_contract: 'WFM-2024-001'
      };
      setWiseFMData(mockWiseFMData);
      setNewAssetForm(prev => ({
        ...prev,
        technician: mockWiseFMData.technician,
        department: mockWiseFMData.department
      }));
    }
  };

  // Mock data for assets registry
  const mockAssets: Asset[] = [
    {
      id: '1',
      asset_number: '235377',
      description: 'ARIC TRAVAUX D\'ASSAINISSEMENT',
      asset_class: '24 - matériel, mobilier',
      asset_category: 'Matériel technique',
      asset_identification: 'ID-00333',
      uom_group: 'Unité',
      capital_appropriation_number: 'CAR-2024-001',
      location: 'Dakar Centre',
      technician: 'Amadou Diallo',
      employee: 'Fatima Ndiaye',
      capitalization_date: '2020-01-15',
      acquisition_date: '2020-01-15',
      warranty_end: '2025-01-15',
      last_inventory: '2024-01-15',
      acquisition_cost: 1500000,
      historical_apc: 150000,
      net_book_value: 1350000,
      historical_nbc: 1350000,
      ordinary_depreciation: 37500,
      unplanned_depreciation: 0,
      special_depreciation: 0,
      write_up: 0,
      salvage_value: 50000,
      asset_group: 'IMMOBILIER',
      depreciation_group: 'DEP-IMMO',
      depreciation_method: 'Linéaire',
      depreciation_rate: 2.5,
      serial_number: 'IMM-2020-001',
      quantity: 1,
      status: 'en_service',
      supplier: 'Promoteur Immobilier SARL',
      department: 'Administration',
      notes: 'Bâtiment principal - 3 étages',
      // Legacy fields
      code: 'IMM001',
      designation: 'Bâtiment Siège Social',
      category: 'Immobilier',
      subcategory: 'Bureau',
      acquisition_value: 1500000,
      current_value: 1350000,
      cumulated_depreciation: 150000,
      net_value: 1350000,
      responsible: 'Amadou Diallo'
    },
    {
      id: '2',
      asset_number: '235378',
      description: 'Serveur Dell PowerEdge R750',
      asset_class: '21 - équipement informatique',
      asset_category: 'Matériel informatique',
      asset_identification: 'ID-00334',
      uom_group: 'Unité',
      capital_appropriation_number: 'CAR-2024-002',
      location: 'Salle serveur - Dakar',
      technician: 'Mohamed Kane',
      employee: 'Moussa Seck',
      capitalization_date: '2023-06-01',
      acquisition_date: '2023-06-01',
      warranty_end: '2026-06-01',
      last_inventory: '2024-06-01',
      acquisition_cost: 2500000,
      historical_apc: 312500,
      net_book_value: 2187500,
      historical_nbc: 2187500,
      ordinary_depreciation: 62500,
      unplanned_depreciation: 0,
      special_depreciation: 0,
      write_up: 0,
      salvage_value: 125000,
      asset_group: 'INFORMATIQUE',
      depreciation_group: 'DEP-INFO',
      depreciation_method: 'Linéaire',
      depreciation_rate: 25.0,
      serial_number: 'SRV-2023-001',
      quantity: 1,
      status: 'en_service',
      supplier: 'Dell Technologies',
      department: 'IT',
      notes: 'Serveur principal de production',
      // Legacy fields
      code: 'SRV001',
      designation: 'Serveur Dell PowerEdge R750',
      category: 'Informatique',
      subcategory: 'Serveur',
      acquisition_value: 2500000,
      current_value: 2187500,
      cumulated_depreciation: 312500,
      net_value: 2187500,
      responsible: 'Mohamed Kane'
    },
    {
      id: '3',
      asset_number: '235379',
      description: 'Véhicule Mercedes Sprinter',
      asset_class: '23 - véhicules',
      asset_category: 'Véhicule utilitaire',
      asset_identification: 'ID-00335',
      uom_group: 'Unité',
      capital_appropriation_number: 'CAR-2024-003',
      location: 'Parking - Dakar',
      technician: 'Cheikh Diop',
      employee: 'Aminata Fall',
      capitalization_date: '2022-03-01',
      acquisition_date: '2022-03-01',
      warranty_end: '2025-03-01',
      last_inventory: '2024-03-01',
      acquisition_cost: 18000000,
      historical_apc: 7200000,
      net_book_value: 10800000,
      historical_nbc: 10800000,
      ordinary_depreciation: 900000,
      unplanned_depreciation: 0,
      special_depreciation: 0,
      write_up: 0,
      salvage_value: 1800000,
      asset_group: 'VEHICULE',
      depreciation_group: 'DEP-VEH',
      depreciation_method: 'Linéaire',
      depreciation_rate: 20.0,
      serial_number: 'VEH-2022-001',
      quantity: 1,
      status: 'en_service',
      supplier: 'Mercedes Benz Sénégal',
      department: 'Logistique',
      notes: 'Véhicule de livraison principal',
      // Legacy fields
      code: 'VEH001',
      designation: 'Véhicule Mercedes Sprinter',
      category: 'Véhicule',
      subcategory: 'Utilitaire',
      acquisition_value: 18000000,
      current_value: 10800000,
      cumulated_depreciation: 7200000,
      net_value: 10800000,
      responsible: 'Cheikh Diop'
    }
  ];

  // Fonctions de gestion des actions Asset Master Data
  const handleOpenNewAssetModal = () => {
    // Réinitialiser le formulaire
    setNewAssetForm({
      asset_number: '',
      description: '',
      asset_class: '',
      asset_category: '',
      asset_identification: '',
      uom_group: '',
      capital_appropriation_number: '',
      location: '',
      technician: '',
      employee: '',
      capitalization_date: '',
      acquisition_date: '',
      warranty_end: '',
      acquisition_cost: 0,
      historical_apc: 0,
      net_book_value: 0,
      historical_nbc: 0,
      ordinary_depreciation: 0,
      unplanned_depreciation: 0,
      special_depreciation: 0,
      write_up: 0,
      salvage_value: 0,
      asset_group: '',
      depreciation_group: '',
      depreciation_method: '',
      serial_number: '',
      quantity: 1,
      supplier: '',
      department: '',
      notes: '',
      code: '',
      designation: '',
      category: '',
      subcategory: '',
      acquisition_value: 0,
      responsible: ''
    });

    // Charger automatiquement les données intégrées
    fetchCapitationData();
    fetchWiseFMData();

    setActiveFormTab('general');
    setActiveGeneralTab('basic');
    setShowNewAssetModal(true);
  };

  const handleEditAssetModal = (asset: Asset) => {
    setAssetToEdit(asset);
    setNewAssetForm({
      asset_number: asset.asset_number,
      description: asset.description,
      asset_class: asset.asset_class,
      asset_category: asset.asset_category,
      asset_identification: asset.asset_identification,
      uom_group: asset.uom_group,
      capital_appropriation_number: asset.capital_appropriation_number,
      location: asset.location,
      technician: asset.technician,
      employee: asset.employee,
      capitalization_date: asset.capitalization_date,
      acquisition_date: asset.acquisition_date,
      warranty_end: asset.warranty_end,
      acquisition_cost: asset.acquisition_cost,
      historical_apc: asset.historical_apc,
      net_book_value: asset.net_book_value,
      historical_nbc: asset.historical_nbc,
      ordinary_depreciation: asset.ordinary_depreciation,
      unplanned_depreciation: asset.unplanned_depreciation,
      special_depreciation: asset.special_depreciation,
      write_up: asset.write_up,
      salvage_value: asset.salvage_value,
      asset_group: asset.asset_group,
      depreciation_group: asset.depreciation_group,
      depreciation_method: asset.depreciation_method,
      serial_number: asset.serial_number,
      quantity: asset.quantity,
      supplier: asset.supplier,
      department: asset.department,
      notes: asset.notes,
      // Legacy fields
      code: asset.code,
      designation: asset.designation,
      category: asset.category,
      subcategory: asset.subcategory,
      acquisition_value: asset.acquisition_value,
      responsible: asset.responsible
    });
    setActiveFormTab('general');
    setActiveGeneralTab('basic');
    setShowEditAssetModal(true);
  };

  const handleSaveAsset = () => {
    if (assetToEdit) {
      // Mode édition
      const updatedAssets = mockAssets.map(asset =>
        asset.id === assetToEdit.id
          ? {
              ...asset,
              ...newAssetForm,
              current_value: newAssetForm.acquisition_value * 0.8,
              net_value: newAssetForm.acquisition_value * 0.8,
              cumulated_depreciation: newAssetForm.acquisition_value * 0.2,
              depreciation_rate: 20,
              status: asset.status
            }
          : asset
      );
      // Note: In a real app, you'd update the state properly
      setShowEditAssetModal(false);
      setAssetToEdit(null);
    } else {
      // Mode création
      const newAsset: Asset = {
        id: (mockAssets.length + 1).toString(),
        ...newAssetForm,
        current_value: newAssetForm.acquisition_value * 0.8,
        net_value: newAssetForm.acquisition_value * 0.8,
        cumulated_depreciation: newAssetForm.acquisition_value * 0.2,
        depreciation_rate: 20,
        status: 'en_service' as const,
        last_inventory: new Date().toISOString().split('T')[0]
      };
      // Note: In a real app, you'd update the state properly
      setShowNewAssetModal(false);
    }
  };

  // Mock asset categories summary
  const mockCategories: AssetCategory[] = [
    {
      code: 'materiel_informatique',
      name: 'Matériel Informatique',
      count: 45,
      totalValue: 180000,
      averageAge: 2.3,
      depreciationRate: 0.25
    },
    {
      code: 'vehicules',
      name: 'Véhicules',
      count: 8,
      totalValue: 320000,
      averageAge: 3.1,
      depreciationRate: 0.20
    },
    {
      code: 'mobilier',
      name: 'Mobilier',
      count: 120,
      totalValue: 95000,
      averageAge: 4.2,
      depreciationRate: 0.10
    },
    {
      code: 'equipements',
      name: 'Équipements',
      count: 25,
      totalValue: 150000,
      averageAge: 2.8,
      depreciationRate: 0.15
    },
    {
      code: 'immobilier',
      name: 'Immobilier',
      count: 3,
      totalValue: 1200000,
      averageAge: 8.5,
      depreciationRate: 0.025
    }
  ];

  // Filter assets based on search and filters
  const filteredAssets = useMemo(() => {
    return mockAssets.filter(asset => {
      const matchesSearch = asset.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          asset.asset_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          asset.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          asset.designation?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = filterCategory === 'all' || asset.category === filterCategory;
      const matchesStatus = filterStatus === 'all' || asset.status === filterStatus;
      const matchesLocation = filterLocation === 'all' || asset.location.includes(filterLocation);

      return matchesSearch && matchesCategory && matchesStatus && matchesLocation;
    });
  }, [searchTerm, filterCategory, filterStatus, filterLocation, mockAssets]);

  // Calculate aggregated metrics
  const aggregatedData = useMemo(() => {
    const totalAssets = filteredAssets.length;
    const totalValue = filteredAssets.reduce((sum, asset) => sum + asset.current_value, 0);
    const totalAcquisitionCost = filteredAssets.reduce((sum, asset) => sum + asset.acquisition_cost, 0);
    const totalDepreciation = filteredAssets.reduce((sum, asset) => sum + asset.cumulated_depreciation, 0);

    const activeAssets = filteredAssets.filter(a => a.status === 'en_service').length;
    const maintenanceAssets = filteredAssets.filter(a => a.status === 'maintenance').length;
    const excellentCondition = filteredAssets.filter(a => a.status === 'en_service').length; // Using status as condition proxy
    const assignedAssets = filteredAssets.filter(a => a.employee).length;

    return {
      totalAssets,
      totalValue,
      totalAcquisitionCost,
      totalDepreciation,
      activeAssets,
      maintenanceAssets,
      excellentCondition,
      assignedAssets,
      depreciationRate: totalDepreciation / totalAcquisitionCost
    };
  }, [filteredAssets]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'materiel_informatique': return <Monitor className="h-5 w-5" />;
      case 'vehicules': return <Truck className="h-5 w-5" />;
      case 'mobilier': return <Package className="h-5 w-5" />;
      case 'equipements': return <Wrench className="h-5 w-5" />;
      case 'immobilier': return <Building className="h-5 w-5" />;
      case 'outillage': return <Wrench className="h-5 w-5" />;
      default: return <Package className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'inactive': return 'text-gray-600 bg-gray-50';
      case 'maintenance': return 'text-yellow-600 bg-yellow-50';
      case 'disposed': return 'text-red-600 bg-red-50';
      case 'lost': return 'text-red-800 bg-red-100';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'text-green-600 bg-green-50';
      case 'good': return 'text-blue-600 bg-blue-50';
      case 'fair': return 'text-yellow-600 bg-yellow-50';
      case 'poor': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const categoryLabels = {
    materiel_informatique: 'Matériel IT',
    vehicules: 'Véhicules',
    mobilier: 'Mobilier',
    equipements: 'Équipements',
    immobilier: 'Immobilier',
    outillage: 'Outillage'
  };

  const statusLabels = {
    active: 'Actif',
    inactive: 'Inactif',
    maintenance: 'Maintenance',
    disposed: 'Cédé',
    lost: 'Perdu'
  };

  const conditionLabels = {
    excellent: 'Excellent',
    good: 'Bon',
    fair: 'Correct',
    poor: 'Mauvais'
  };

  const uniqueLocations = [...new Set(mockAssets.map(a => a.location.split(' - ')[0]))];

  const chartData = mockCategories.map(cat => ({
    label: cat.name.replace(' ', '\n'),
    value: cat.totalValue / 1000,
    color: cat.code === 'materiel_informatique' ? 'bg-blue-500' :
           cat.code === 'vehicules' ? 'bg-green-500' :
           cat.code === 'mobilier' ? 'bg-purple-500' :
           cat.code === 'equipements' ? 'bg-orange-500' : 'bg-red-500'
  }));

  const conditionChartData = [
    { label: 'En Service', value: filteredAssets.filter(a => a.status === 'en_service').length, color: 'bg-green-500' },
    { label: 'Maintenance', value: filteredAssets.filter(a => a.status === 'maintenance').length, color: 'bg-yellow-500' },
    { label: 'Inactif', value: filteredAssets.filter(a => a.status === 'inactive').length, color: 'bg-gray-500' },
    { label: 'Cédé', value: filteredAssets.filter(a => a.status === 'disposed').length, color: 'bg-red-500' }
  ];

  // Tab definitions
  const mainTabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: PieChart },
    { id: 'assets', label: 'Liste des Actifs', icon: List },
    { id: 'bulk', label: 'Actions en Lot', icon: Settings },
    { id: 'history', label: 'Historique', icon: History }
  ];

  // Content renderers for each tab
  const renderOverviewTab = () => (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Actifs Totaux"
          value={aggregatedData.totalAssets.toString()}
          subtitle={`${aggregatedData.activeAssets} actifs`}
          icon={Package}
          color="primary"
          delay={0.1}
          withChart={true}
        />

        <KPICard
          title="Valeur Actuelle"
          value={formatCurrency(aggregatedData.totalValue)}
          subtitle={`${formatPercentage(1 - aggregatedData.depreciationRate)} de la valeur d'origine`}
          icon={DollarSign}
          color="success"
          delay={0.2}
          withChart={true}
        />

        <KPICard
          title="Actifs Assignés"
          value={aggregatedData.assignedAssets.toString()}
          subtitle={`${formatPercentage(aggregatedData.assignedAssets / aggregatedData.totalAssets)} assignés`}
          icon={User}
          color="neutral"
          delay={0.3}
          withChart={true}
        />

        <KPICard
          title="Excellent État"
          value={aggregatedData.excellentCondition.toString()}
          subtitle={`${formatPercentage(aggregatedData.excellentCondition / aggregatedData.totalAssets)} en excellent état`}
          icon={CheckCircle}
          color="warning"
          delay={0.4}
          withChart={true}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <ModernChartCard
            title="Valeur par Catégorie"
            subtitle="Répartition de la valeur actuelle (k€)"
            icon={PieChart}
          >
            <ColorfulBarChart
              data={chartData}
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
            title="État des Actifs"
            subtitle="Répartition par condition"
            icon={Target}
          >
            <ColorfulBarChart
              data={conditionChartData}
              height={160}
            />
          </ModernChartCard>
        </motion.div>
      </div>

      {/* Additional Overview Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <UnifiedCard variant="elevated" size="md">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-800">Top Catégories</h3>
              <Target className="h-5 w-5 text-neutral-400" />
            </div>
            <div className="space-y-3">
              {mockCategories.slice(0, 5).map((category, index) => (
                <div key={category.code} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-sm text-neutral-700">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-neutral-800">{category.count}</p>
                    <p className="text-xs text-neutral-500">{formatCurrency(category.totalValue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </UnifiedCard>

        <UnifiedCard variant="elevated" size="md">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-800">Indicateurs Clés</h3>
              <BarChart3 className="h-5 w-5 text-neutral-400" />
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600">Taux d'assignation</span>
                  <span className="text-sm font-semibold text-green-600">
                    {formatPercentage(aggregatedData.assignedAssets / aggregatedData.totalAssets)}
                  </span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${(aggregatedData.assignedAssets / aggregatedData.totalAssets) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600">Taux de dépréciation</span>
                  <span className="text-sm font-semibold text-orange-600">
                    {formatPercentage(aggregatedData.depreciationRate)}
                  </span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full"
                    style={{ width: `${aggregatedData.depreciationRate * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </UnifiedCard>

        <UnifiedCard variant="elevated" size="md">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-800">Actions Rapides</h3>
              <Activity className="h-5 w-5 text-neutral-400" />
            </div>
            <div className="space-y-3">
              <ElegantButton
                variant="outline"
                icon={Plus}
                className="w-full justify-start"
                onClick={handleOpenNewAssetModal}
              >
                Nouvel Actif
              </ElegantButton>
              <ElegantButton variant="outline" icon={QrCode} className="w-full justify-start">
                Scanner QR Code
              </ElegantButton>
              <ElegantButton variant="outline" icon={Download} className="w-full justify-start">
                Exporter Données
              </ElegantButton>
              <ElegantButton variant="outline" icon={RefreshCw} className="w-full justify-start">
                Synchroniser
              </ElegantButton>
            </div>
          </div>
        </UnifiedCard>
      </div>
    </div>
  );

  const renderAssetsTab = () => (
    <div className="space-y-6">
      {/* Filters and Search */}
      <UnifiedCard variant="elevated" size="md">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-800">Filtres et Recherche</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'table' ? 'bg-blue-100 text-blue-600' : 'text-neutral-400 hover:text-neutral-600'
                }`}
              >
                <BarChart3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-neutral-400 hover:text-neutral-600'
                }`}
              >
                <Target className="h-4 w-4" />
              </button>
            </div>
          </div>

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
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Toutes les catégories</option>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

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
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les emplacements</option>
              {uniqueLocations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>

            <select
              value={filterCondition}
              onChange={(e) => setFilterCondition(e.target.value)}
              className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Toutes les conditions</option>
              {Object.entries(conditionLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </UnifiedCard>

      {/* Assets List */}
      <UnifiedCard variant="elevated" size="lg">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-neutral-800">
              Actifs ({filteredAssets.length})
            </h3>
            {selectedAssets.length > 0 && (
              <div className="flex gap-2">
                <ElegantButton variant="outline" size="sm">
                  Actions groupées ({selectedAssets.length})
                </ElegantButton>
              </div>
            )}
          </div>

          {viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="text-left py-3 px-4 font-medium text-neutral-600">
                      <input
                        type="checkbox"
                        className="rounded border-neutral-300"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAssets(filteredAssets.map(a => a.id));
                          } else {
                            setSelectedAssets([]);
                          }
                        }}
                      />
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-neutral-600">Actif</th>
                    <th className="text-left py-3 px-4 font-medium text-neutral-600">Catégorie</th>
                    <th className="text-right py-3 px-4 font-medium text-neutral-600">Valeur</th>
                    <th className="text-left py-3 px-4 font-medium text-neutral-600">Emplacement</th>
                    <th className="text-center py-3 px-4 font-medium text-neutral-600">Statut</th>
                    <th className="text-center py-3 px-4 font-medium text-neutral-600">État</th>
                    <th className="text-center py-3 px-4 font-medium text-neutral-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map((asset, index) => (
                    <motion.tr
                      key={asset.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-neutral-100 hover:bg-neutral-50"
                    >
                      <td className="py-4 px-4">
                        <input
                          type="checkbox"
                          className="rounded border-neutral-300"
                          checked={selectedAssets.includes(asset.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAssets([...selectedAssets, asset.id]);
                            } else {
                              setSelectedAssets(selectedAssets.filter(id => id !== asset.id));
                            }
                          }}
                        />
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-50 rounded-lg">
                            {getCategoryIcon(asset.category)}
                          </div>
                          <div>
                            <p className="font-semibold text-neutral-800">{asset.description}</p>
                            <div className="flex items-center space-x-2 text-sm text-neutral-500">
                              <Tag className="h-3 w-3" />
                              <span>{asset.asset_number}</span>
                              {asset.serial_number && (
                                <>
                                  <span>•</span>
                                  <span>{asset.serial_number}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-neutral-800">{asset.category}</p>
                          <p className="text-sm text-neutral-500">{asset.subcategory}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div>
                          <p className="font-semibold text-neutral-800">
                            {formatCurrency(asset.current_value)}
                          </p>
                          <p className="text-sm text-neutral-500">
                            Achat: {formatCurrency(asset.acquisition_cost)}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3 text-neutral-400" />
                            <p className="text-sm text-neutral-800">{asset.location}</p>
                          </div>
                          <p className="text-sm text-neutral-500">{asset.department}</p>
                          {asset.employee && (
                            <div className="flex items-center space-x-1 mt-1">
                              <User className="h-3 w-3 text-neutral-400" />
                              <p className="text-xs text-neutral-600">{asset.employee}</p>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(asset.status)}`}>
                          {statusLabels[asset.status]}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full text-green-600 bg-green-50`}>
                          En service
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => setAssetModal({ isOpen: true, mode: 'view', asset })}
                            className="p-2 text-neutral-400 hover:text-blue-600 transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditAssetModal(asset)}
                            className="p-2 text-neutral-400 hover:text-green-600 transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-neutral-400 hover:text-purple-600 transition-colors">
                            <QrCode className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssets.map((asset, index) => (
                <motion.div
                  key={asset.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-6 bg-white border border-neutral-200 rounded-xl hover:shadow-md transition-all duration-200"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          {getCategoryIcon(asset.category)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-neutral-800">{asset.description}</h4>
                          <p className="text-sm text-neutral-500 flex items-center space-x-1">
                            <Tag className="h-3 w-3" />
                            <span>{asset.asset_number}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(asset.status)}`}>
                          {statusLabels[asset.status]}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-500">Valeur actuelle:</span>
                        <span className="font-semibold text-neutral-800">
                          {formatCurrency(asset.current_value)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-500">Emplacement:</span>
                        <span className="text-sm text-neutral-700">{asset.location.split(' - ')[0]}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-500">État:</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full text-green-600 bg-green-50`}>
                          En service
                        </span>
                      </div>
                      {asset.employee && (
                        <div className="flex justify-between">
                          <span className="text-sm text-neutral-500">Assigné à:</span>
                          <span className="text-sm text-neutral-700">{asset.employee}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-neutral-100">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-neutral-500">
                          {formatDate(asset.acquisition_date)}
                        </span>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setAssetModal({ isOpen: true, mode: 'view', asset })}
                            className="p-2 text-neutral-400 hover:text-blue-600 transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditAssetModal(asset)}
                            className="p-2 text-neutral-400 hover:text-green-600 transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </UnifiedCard>
    </div>
  );

  const renderBulkActionsTab = () => (
    <div className="space-y-6">
      {/* Bulk Operations Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <UnifiedCard variant="elevated" size="md">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-800">Sélection d'Actifs</h3>
              <Users className="h-5 w-5 text-neutral-400" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-neutral-600">Actifs sélectionnés</span>
                <span className="text-lg font-bold text-blue-600">{selectedAssets.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-neutral-600">Total disponible</span>
                <span className="text-sm font-semibold text-neutral-800">{filteredAssets.length}</span>
              </div>
              <div className="space-y-2">
                <ElegantButton variant="outline" size="sm" className="w-full">
                  Sélectionner tout
                </ElegantButton>
                <ElegantButton variant="outline" size="sm" className="w-full">
                  Désélectionner tout
                </ElegantButton>
              </div>
            </div>
          </div>
        </UnifiedCard>

        <UnifiedCard variant="elevated" size="md">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-800">Import/Export</h3>
              <Database className="h-5 w-5 text-neutral-400" />
            </div>
            <div className="space-y-3">
              <ElegantButton variant="outline" icon={Upload} className="w-full justify-start">
                Importer depuis Excel
              </ElegantButton>
              <ElegantButton variant="outline" icon={Download} className="w-full justify-start">
                Exporter vers Excel
              </ElegantButton>
              <ElegantButton variant="outline" icon={Import} className="w-full justify-start">
                Import/Export avancé
              </ElegantButton>
              <ElegantButton variant="outline" icon={Copy} className="w-full justify-start">
                Dupliquer actifs
              </ElegantButton>
            </div>
          </div>
        </UnifiedCard>

        <UnifiedCard variant="elevated" size="md">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-800">Actions en Lot</h3>
              <Settings className="h-5 w-5 text-neutral-400" />
            </div>
            <div className="space-y-3">
              <ElegantButton variant="outline" icon={Edit} className="w-full justify-start">
                Modifier en lot
              </ElegantButton>
              <ElegantButton variant="outline" icon={User} className="w-full justify-start">
                Réassigner
              </ElegantButton>
              <ElegantButton variant="outline" icon={MapPin} className="w-full justify-start">
                Changer emplacement
              </ElegantButton>
              <ElegantButton variant="outline" icon={Trash2} className="w-full justify-start text-red-600">
                Supprimer sélection
              </ElegantButton>
            </div>
          </div>
        </UnifiedCard>
      </div>

      {/* Bulk Operations Form */}
      <UnifiedCard variant="elevated" size="lg">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-800">Opérations en Lot</h3>
            <span className="text-sm text-neutral-500">
              {selectedAssets.length} actif(s) sélectionné(s)
            </span>
          </div>

          {selectedAssets.length > 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Changer le statut
                  </label>
                  <select className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">-- Sélectionner --</option>
                    <option value="active">Actif</option>
                    <option value="inactive">Inactif</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="disposed">Cédé</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Nouvel emplacement
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Nouvel emplacement"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Assigner à
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Nom de l'employé"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Notes pour l'opération
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Ajouter des notes pour cette opération en lot..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <ElegantButton variant="outline">
                  Annuler
                </ElegantButton>
                <ElegantButton variant="primary">
                  Appliquer les modifications
                </ElegantButton>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Settings className="mx-auto h-12 w-12 text-neutral-400" />
              <h3 className="mt-4 text-lg font-medium text-neutral-900">Aucun actif sélectionné</h3>
              <p className="mt-2 text-sm text-neutral-500">
                Sélectionnez des actifs depuis l'onglet "Liste des Actifs" pour effectuer des opérations en lot.
              </p>
              <div className="mt-6">
                <ElegantButton variant="outline" onClick={() => setActiveMainTab('assets')}>
                  Aller à la liste des actifs
                </ElegantButton>
              </div>
            </div>
          )}
        </div>
      </UnifiedCard>

      {/* Quick Templates */}
      <UnifiedCard variant="elevated" size="md">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-neutral-800">Modèles d'Actions Rapides</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="p-4 border border-neutral-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left">
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <span className="font-medium text-neutral-800">Validation annuelle</span>
              </div>
              <p className="text-sm text-neutral-500">Marquer comme vérifié pour inventaire annuel</p>
            </button>

            <button className="p-4 border border-neutral-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left">
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Wrench className="h-4 w-4 text-orange-600" />
                </div>
                <span className="font-medium text-neutral-800">Maintenance planifiée</span>
              </div>
              <p className="text-sm text-neutral-500">Planifier maintenance préventive</p>
            </button>

            <button className="p-4 border border-neutral-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left">
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <RotateCcw className="h-4 w-4 text-blue-600" />
                </div>
                <span className="font-medium text-neutral-800">Réaffectation</span>
              </div>
              <p className="text-sm text-neutral-500">Changer département/employé</p>
            </button>

            <button className="p-4 border border-neutral-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left">
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Archive className="h-4 w-4 text-red-600" />
                </div>
                <span className="font-medium text-neutral-800">Mise au rebut</span>
              </div>
              <p className="text-sm text-neutral-500">Processus de mise au rebut</p>
            </button>
          </div>
        </div>
      </UnifiedCard>
    </div>
  );

  const renderHistoryTab = () => (
    <div className="space-y-6">
      {/* History Filters */}
      <UnifiedCard variant="elevated" size="md">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-neutral-800">Filtres d'Historique</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Date de début</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Date de fin</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Type d'action</label>
              <select className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="">Toutes les actions</option>
                <option value="create">Création</option>
                <option value="update">Modification</option>
                <option value="transfer">Transfert</option>
                <option value="maintenance">Maintenance</option>
                <option value="dispose">Mise au rebut</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Utilisateur</label>
              <input
                type="text"
                placeholder="Nom d'utilisateur"
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </UnifiedCard>

      {/* Activity Timeline */}
      <UnifiedCard variant="elevated" size="lg">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-800">Historique des Activités</h3>
            <ElegantButton variant="outline" icon={Download} size="sm">
              Exporter l'historique
            </ElegantButton>
          </div>

          <div className="space-y-4">
            {/* Mock history entries */}
            {[
              {
                id: 1,
                action: 'Création',
                description: 'Création de l\'actif Serveur Dell PowerEdge R750',
                user: 'Mohamed Kane',
                date: '2024-01-15 10:30',
                asset: 'Serveur Dell PowerEdge R750 (#235378)',
                icon: Plus,
                color: 'bg-green-500'
              },
              {
                id: 2,
                action: 'Modification',
                description: 'Mise à jour de l\'emplacement: Salle serveur - Dakar',
                user: 'Fatima Ndiaye',
                date: '2024-01-14 15:45',
                asset: 'Serveur Dell PowerEdge R750 (#235378)',
                icon: Edit,
                color: 'bg-blue-500'
              },
              {
                id: 3,
                action: 'Transfert',
                description: 'Transfert de Amadou Diallo vers Mohamed Kane',
                user: 'Admin System',
                date: '2024-01-13 09:15',
                asset: 'ARIC TRAVAUX D\'ASSAINISSEMENT (#235377)',
                icon: User,
                color: 'bg-purple-500'
              },
              {
                id: 4,
                action: 'Maintenance',
                description: 'Maintenance préventive programmée',
                user: 'Cheikh Diop',
                date: '2024-01-12 14:20',
                asset: 'Véhicule Mercedes Sprinter (#235379)',
                icon: Wrench,
                color: 'bg-orange-500'
              },
              {
                id: 5,
                action: 'Inventaire',
                description: 'Vérification d\'inventaire annuel complétée',
                user: 'Aminata Fall',
                date: '2024-01-10 11:00',
                asset: 'Multiple actifs (15 éléments)',
                icon: CheckCircle,
                color: 'bg-emerald-500'
              }
            ].map((entry, index) => {
              const IconComponent = entry.icon;
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start space-x-4 p-4 bg-neutral-50 rounded-lg"
                >
                  <div className={`p-2 rounded-full ${entry.color}`}>
                    <IconComponent className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-semibold text-neutral-800">{entry.action}</h4>
                      <span className="text-xs text-neutral-500">{entry.date}</span>
                    </div>
                    <p className="text-sm text-neutral-700 mb-1">{entry.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-600">Actif: {entry.asset}</span>
                      <span className="text-xs text-neutral-500">Par: {entry.user}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="flex justify-center">
            <ElegantButton variant="outline">
              Charger plus d'entrées
            </ElegantButton>
          </div>
        </div>
      </UnifiedCard>

      {/* History Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <UnifiedCard variant="elevated" size="md">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-800">Activités Récentes</h3>
              <Activity className="h-5 w-5 text-neutral-400" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-neutral-600">Aujourd'hui</span>
                <span className="text-sm font-semibold text-neutral-800">12 actions</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-neutral-600">Cette semaine</span>
                <span className="text-sm font-semibold text-neutral-800">45 actions</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-neutral-600">Ce mois</span>
                <span className="text-sm font-semibold text-neutral-800">189 actions</span>
              </div>
            </div>
          </div>
        </UnifiedCard>

        <UnifiedCard variant="elevated" size="md">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-800">Actions les Plus Fréquentes</h3>
              <BarChart3 className="h-5 w-5 text-neutral-400" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-neutral-600">Modifications</span>
                <span className="text-sm font-semibold text-blue-600">45%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-neutral-600">Transferts</span>
                <span className="text-sm font-semibold text-purple-600">28%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-neutral-600">Maintenances</span>
                <span className="text-sm font-semibold text-orange-600">18%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-neutral-600">Créations</span>
                <span className="text-sm font-semibold text-green-600">9%</span>
              </div>
            </div>
          </div>
        </UnifiedCard>

        <UnifiedCard variant="elevated" size="md">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-800">Utilisateurs Actifs</h3>
              <Users className="h-5 w-5 text-neutral-400" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-semibold">MK</span>
                  </div>
                  <span className="text-sm text-neutral-700">Mohamed Kane</span>
                </div>
                <span className="text-sm font-semibold text-neutral-800">23</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-semibold">FN</span>
                  </div>
                  <span className="text-sm text-neutral-700">Fatima Ndiaye</span>
                </div>
                <span className="text-sm font-semibold text-neutral-800">18</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-semibold">CD</span>
                  </div>
                  <span className="text-sm text-neutral-700">Cheikh Diop</span>
                </div>
                <span className="text-sm font-semibold text-neutral-800">12</span>
              </div>
            </div>
          </div>
        </UnifiedCard>
      </div>
    </div>
  );

  return (
    <PageContainer background="warm" padding="lg">
      <div className="space-y-8">
        {/* Header */}
        <SectionHeader
          title="Registre des Actifs"
          subtitle="Inventaire et suivi des immobilisations et équipements"
          icon={Package}
          action={
            <div className="flex gap-3">
              <ElegantButton variant="outline" icon={QrCode}>
                Scanner QR
              </ElegantButton>
              <ElegantButton variant="outline" icon={Download}>
                Exporter
              </ElegantButton>
              <ElegantButton
                variant="primary"
                icon={Plus}
                onClick={handleOpenNewAssetModal}
              >
                Nouvel Actif
              </ElegantButton>
            </div>
          }
        />

        {/* Horizontal Tabs */}
        <UnifiedCard variant="elevated" size="sm">
          <div className="border-b border-neutral-200">
            <nav className="flex space-x-8">
              {mainTabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveMainTab(tab.id)}
                    className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeMainTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                    }`}
                  >
                    <IconComponent className="w-4 h-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </UnifiedCard>

        {/* Tab Content */}
        <motion.div
          key={activeMainTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeMainTab === 'overview' && renderOverviewTab()}
          {activeMainTab === 'assets' && renderAssetsTab()}
          {activeMainTab === 'bulk' && renderBulkActionsTab()}
          {activeMainTab === 'history' && renderHistoryTab()}
        </motion.div>

        {/* Asset Detail Modal */}
        {assetModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-neutral-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-neutral-800">
                    {assetModal.mode === 'create' ? 'Nouvel Actif' :
                     assetModal.mode === 'edit' ? 'Modifier l\'Actif' : 'Détails de l\'Actif'}
                  </h3>
                  <button
                    onClick={() => setAssetModal({ isOpen: false, mode: 'view' })}
                    className="p-2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {assetModal.asset && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Description de l'Actif
                          </label>
                          <p className="text-neutral-800 font-semibold">{assetModal.asset.description}</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Numéro d'Inventaire
                          </label>
                          <p className="text-neutral-800 font-mono">{assetModal.asset.asset_number}</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Catégorie
                          </label>
                          <div className="flex items-center space-x-2">
                            {getCategoryIcon(assetModal.asset.category)}
                            <span className="text-neutral-800">{categoryLabels[assetModal.asset.category] || assetModal.asset.category}</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Classe d'Actif
                          </label>
                          <p className="text-neutral-800">
                            {assetModal.asset.asset_class}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Numéro de Série
                          </label>
                          <p className="text-neutral-800 font-mono">{assetModal.asset.serial_number}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Valeur d'Acquisition
                          </label>
                          <p className="text-neutral-800 font-bold text-lg">
                            {formatCurrency(assetModal.asset.acquisition_cost)}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Valeur Actuelle
                          </label>
                          <p className="text-neutral-800 font-semibold">
                            {formatCurrency(assetModal.asset.current_value)}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Amortissement Cumulé
                          </label>
                          <p className="text-red-600 font-medium">
                            -{formatCurrency(assetModal.asset.cumulated_depreciation)}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Date d'Acquisition
                          </label>
                          <p className="text-neutral-800">{formatDate(assetModal.asset.acquisition_date)}</p>
                        </div>

                        <div className="flex space-x-4">
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              Statut
                            </label>
                            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(assetModal.asset.status)}`}>
                              {statusLabels[assetModal.asset.status]}
                            </span>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              État
                            </label>
                            <span className={`px-3 py-1 text-sm font-medium rounded-full text-green-600 bg-green-50`}>
                              En service
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Emplacement
                        </label>
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-neutral-400" />
                          <span className="text-neutral-800">{assetModal.asset.location}</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Département
                        </label>
                        <p className="text-neutral-800">{assetModal.asset.department}</p>
                      </div>

                      {assetModal.asset.employee && (
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Assigné à
                          </label>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-neutral-400" />
                            <span className="text-neutral-800">{assetModal.asset.employee}</span>
                          </div>
                        </div>
                      )}

                      {assetModal.asset.notes && (
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Notes
                          </label>
                          <p className="text-neutral-800 text-sm bg-gray-50 p-3 rounded-lg">
                            {assetModal.asset.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-200">
                  <ElegantButton
                    variant="outline"
                    onClick={() => setAssetModal({ isOpen: false, mode: 'view' })}
                  >
                    {assetModal.mode === 'view' ? 'Fermer' : 'Annuler'}
                  </ElegantButton>
                  {assetModal.mode !== 'view' && (
                    <ElegantButton variant="primary">
                      {assetModal.mode === 'create' ? 'Créer' : 'Sauvegarder'}
                    </ElegantButton>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* New Asset Master Data Modal */}
        {showNewAssetModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Asset Master Data - Nouvel Actif</h2>
                  <button
                    onClick={() => setShowNewAssetModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Header with Photo and Asset Info */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 p-6">
                <div className="flex items-start space-x-6">
                  {/* Photo Section */}
                  <div className="flex-shrink-0">
                    <div className="w-32 h-32 bg-white border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center group hover:border-blue-400 transition-colors cursor-pointer">
                      <div className="text-center">
                        <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2 group-hover:text-blue-500" />
                        <p className="text-xs text-gray-500 group-hover:text-blue-600">Ajouter photo</p>
                      </div>
                    </div>
                  </div>

                  {/* Asset Information Grid */}
                  <div className="flex-1">
                    <div className="grid grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Capital Appropriation Request Number</label>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">
                          {newAssetForm.capital_appropriation_number || 'CAR-2024-001'}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Asset Number</label>
                        <p className="text-sm font-semibold text-blue-600 mt-0.5">
                          {newAssetForm.asset_number || '235377'}
                        </p>
                      </div>
                      <div className="lg:col-span-3 flex items-start gap-4">
                        <div className="flex-1">
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</label>
                          <p className="text-sm font-semibold text-gray-900 mt-0.5 leading-tight">
                            {newAssetForm.description || 'ARIC TRAVAUX D\'ASSAINISSEMENT'}
                          </p>
                        </div>
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
                            <p className="text-sm font-semibold text-green-700">En service</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* QR Code Section */}
                  <div className="flex-shrink-0">
                    <div className="bg-white border border-gray-300 rounded-lg p-3 text-center shadow-sm">
                      <div className="w-16 h-16 bg-gray-100 border border-gray-200 rounded flex items-center justify-center mx-auto mb-2">
                        <QrCode className="w-8 h-8 text-gray-600" />
                      </div>
                      <p className="text-xs font-medium text-gray-700">QR Code</p>
                      <p className="text-xs text-gray-500 mt-1">{newAssetForm.asset_number || '235377'}</p>
                      <button className="mt-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                        Générer
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Layout avec Sidebar */}
              <div className="flex h-[60vh]">
                {/* Sidebar Navigation */}
                <div className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto">
                  <nav className="p-4 space-y-2">
                    {[
                      { id: 'general', label: 'Information générale', icon: Info },
                      { id: 'acquisition', label: 'Informations acquisition', icon: DollarSign },
                      { id: 'immobilisation', label: 'Immobilisation', icon: Building },
                      { id: 'vente', label: 'Données de vente', icon: TrendingDown },
                      { id: 'composants', label: 'Composants', icon: Package },
                      { id: 'maintenance', label: 'Données de maintenance', icon: Wrench },
                      { id: 'attachements', label: 'Attachements', icon: FileText },
                      { id: 'notes', label: 'Notes', icon: Edit }
                    ].map((section) => {
                      const IconComponent = section.icon;
                      return (
                        <button
                          key={section.id}
                          onClick={() => setActiveFormTab(section.id)}
                          className={`w-full flex items-center px-3 py-2 text-left rounded-lg transition-colors ${
                            activeFormTab === section.id
                              ? 'bg-blue-100 text-blue-700 font-medium'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <IconComponent className="w-4 h-4 mr-3" />
                          <span className="text-sm">{section.label}</span>
                        </button>
                      );
                    })}
                  </nav>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6">
                  {/* Onglet General Information */}
                  {activeFormTab === 'general' && (
                    <div className="space-y-6">
                      {/* Horizontal Tabs for General Information */}
                      <div className="border-b border-gray-200">
                        <nav className="flex space-x-8">
                          {[
                            { id: 'basic', label: 'Actif Info', icon: Info },
                            { id: 'material', label: 'Material Data', icon: Package },
                            { id: 'warranty', label: 'Warranty', icon: Shield },
                            { id: 'insurance', label: 'Insurance', icon: FileText },
                            { id: 'location', label: 'Location', icon: MapPin }
                          ].map((tab) => {
                            const IconComponent = tab.icon;
                            return (
                              <button
                                key={tab.id}
                                onClick={() => setActiveGeneralTab(tab.id)}
                                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                  activeGeneralTab === tab.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                              >
                                <IconComponent className="w-4 h-4 mr-2" />
                                {tab.label}
                              </button>
                            );
                          })}
                        </nav>
                      </div>

                      {/* Tab Content */}
                      <div className="mt-6">
                        {/* Basic Info Tab */}
                        {activeGeneralTab === 'basic' && (
                          <div className="space-y-8">
                            {/* Section principale */}
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <Info className="w-5 h-5 mr-2 text-blue-600" />
                                Informations de base
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div>
                                  <label className="block text-sm font-medium mb-1">Asset Number *</label>
                                  <input
                                    type="text"
                                    value={newAssetForm.asset_number}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, asset_number: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ex: 235377"
                                  />
                                </div>
                                <div className="lg:col-span-2">
                                  <label className="block text-sm font-medium mb-1">Description *</label>
                                  <input
                                    type="text"
                                    value={newAssetForm.description}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, description: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ex: ARIC TRAVAUX D'ASSAINISSEMENT"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                                    Asset Class *
                                    {capitationData && (
                                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1">
                                        <Brain className="w-3 h-3" />
                                        Auto-rempli
                                      </span>
                                    )}
                                  </label>
                                  <select
                                    value={newAssetForm.asset_class}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, asset_class: e.target.value})}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                      capitationData?.asset_class ? 'border-green-300 bg-green-50' : 'border-gray-300'
                                    }`}
                                    disabled={!!capitationData?.asset_class}
                                  >
                                    <option value="">-- Select --</option>
                                    <option value="21 - équipement informatique">21 - équipement informatique</option>
                                    <option value="22 - équipement médical">22 - équipement médical</option>
                                    <option value="23 - véhicules">23 - véhicules</option>
                                    <option value="24 - matériel, mobilier">24 - matériel, mobilier</option>
                                    <option value="25 - immobilisations incorporelles">25 - immobilisations incorporelles</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Asset Category</label>
                                  <select
                                    value={newAssetForm.asset_category}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, asset_category: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="">-- Sélectionnez --</option>
                                    <option value="Matériel technique">Matériel technique</option>
                                    <option value="Équipement bureau">Équipement bureau</option>
                                    <option value="Véhicule léger">Véhicule léger</option>
                                    <option value="Matériel industriel">Matériel industriel</option>
                                  </select>
                                </div>

                                {/* Tax liable */}
                                <div>
                                  <label className="block text-sm font-medium mb-1">Tax Liable</label>
                                  <select
                                    value={newAssetForm.tax_liable || 'yes'}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, tax_liable: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="yes">Oui - Assujetti</option>
                                    <option value="no">Non - Exonéré</option>
                                    <option value="partial">Partiellement</option>
                                  </select>
                                </div>

                                {/* Filter by */}
                                <div>
                                  <label className="block text-sm font-medium mb-1">Filter By</label>
                                  <select
                                    value={newAssetForm.filter_by || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, filter_by: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="">-- Tous --</option>
                                    <option value="department">Par département</option>
                                    <option value="location">Par localisation</option>
                                    <option value="category">Par catégorie</option>
                                    <option value="status">Par statut</option>
                                  </select>
                                </div>

                                {/* Active Status */}
                                <div>
                                  <label className="block text-sm font-medium mb-1">Statut Actif</label>
                                  <div className="flex items-center space-x-4 mt-2">
                                    <label className="flex items-center">
                                      <input
                                        type="radio"
                                        name="active_status"
                                        value="active"
                                        checked={newAssetForm.active_status === 'active'}
                                        onChange={(e) => setNewAssetForm({...newAssetForm, active_status: e.target.value})}
                                        className="mr-2 text-blue-600 focus:ring-blue-500"
                                      />
                                      <span className="flex items-center">
                                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                        Actif
                                      </span>
                                    </label>
                                    <label className="flex items-center">
                                      <input
                                        type="radio"
                                        name="active_status"
                                        value="inactive"
                                        checked={newAssetForm.active_status === 'inactive'}
                                        onChange={(e) => setNewAssetForm({...newAssetForm, active_status: e.target.value})}
                                        className="mr-2 text-blue-600 focus:ring-blue-500"
                                      />
                                      <span className="flex items-center">
                                        <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                                        Inactif
                                      </span>
                                    </label>
                                  </div>
                                </div>
                              </div>
                            </div>

                          </div>
                        )}

                        {/* Warranty Tab */}
                        {activeGeneralTab === 'warranty' && (
                          <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                              <Shield className="w-5 h-5 mr-2 text-blue-600" />
                              Warranty Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className="block text-sm font-medium mb-1">Warranty Period</label>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="number"
                                    value={newAssetForm.warranty_period || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, warranty_period: e.target.value})}
                                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="12"
                                  />
                                  <select
                                    value={newAssetForm.warranty_unit || 'months'}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, warranty_unit: e.target.value})}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="days">Jours</option>
                                    <option value="months">Mois</option>
                                    <option value="years">Années</option>
                                  </select>
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-1">Terms and Conditions</label>
                                <textarea
                                  value={newAssetForm.warranty_terms || ''}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, warranty_terms: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  rows={3}
                                  placeholder="Conditions de garantie..."
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-1">Warranty Start Date</label>
                                <input
                                  type="date"
                                  value={newAssetForm.warranty_start || ''}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, warranty_start: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-1">Warranty End Date</label>
                                <input
                                  type="date"
                                  value={newAssetForm.warranty_end || ''}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, warranty_end: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">Warranty Provider</label>
                                <input
                                  type="text"
                                  value={newAssetForm.warranty_provider || ''}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, warranty_provider: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Nom du fournisseur de garantie"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Insurance Tab */}
                        {activeGeneralTab === 'insurance' && (
                          <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                              <FileText className="w-5 h-5 mr-2 text-blue-600" />
                              Insurance Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className="block text-sm font-medium mb-1">Insurance Provider</label>
                                <input
                                  type="text"
                                  value={newAssetForm.insurance_provider || ''}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, insurance_provider: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Nom de la compagnie d'assurance"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-1">Policy Details</label>
                                <input
                                  type="text"
                                  value={newAssetForm.policy_details || ''}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, policy_details: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Numéro de police"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-1">Coverage Amount</label>
                                <div className="flex items-center">
                                  <input
                                    type="number"
                                    value={newAssetForm.coverage_amount || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, coverage_amount: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="1000000"
                                  />
                                  <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">
                                    XAF
                                  </span>
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-1">Expiration Date</label>
                                <input
                                  type="date"
                                  value={newAssetForm.insurance_expiration || ''}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, insurance_expiration: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="jj/mm/aaaa"
                                />
                              </div>

                              <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">Policy Type</label>
                                <select
                                  value={newAssetForm.policy_type || ''}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, policy_type: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">-- Sélectionnez --</option>
                                  <option value="tous_risques">Tous risques</option>
                                  <option value="responsabilite">Responsabilité civile</option>
                                  <option value="dommages">Dommages matériels</option>
                                  <option value="vol">Vol et vandalisme</option>
                                  <option value="incendie">Incendie</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Location Tab */}
                        {activeGeneralTab === 'location' && (
                          <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                              <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                              Current Location
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className="block text-sm font-medium mb-1">Building/Location Name</label>
                                <input
                                  type="text"
                                  value={newAssetForm.building_name || ''}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, building_name: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Ex: Siège social"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-1">Floor</label>
                                <select
                                  value={newAssetForm.floor || ''}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, floor: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">-- Sélectionnez --</option>
                                  <option value="sous-sol">Sous-sol</option>
                                  <option value="rdc">Rez-de-chaussée</option>
                                  {[...Array(10)].map((_, i) => (
                                    <option key={i} value={`${i + 1}`}>{i + 1}er étage</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-1">Zoning</label>
                                <select
                                  value={newAssetForm.zoning || ''}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, zoning: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">Sélectionnez...</option>
                                  <option value="zone-a">Zone A</option>
                                  <option value="zone-b">Zone B</option>
                                  <option value="zone-c">Zone C</option>
                                  <option value="zone-d">Zone D</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-1">Unit</label>
                                <select
                                  value={newAssetForm.unit || ''}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, unit: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">Sélectionnez...</option>
                                  <option value="unit-1">Unité 1</option>
                                  <option value="unit-2">Unité 2</option>
                                  <option value="unit-3">Unité 3</option>
                                  <option value="unit-4">Unité 4</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-1">Room</label>
                                <select
                                  value={newAssetForm.room || ''}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, room: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">Sélectionnez...</option>
                                  <option value="bureau">Bureau</option>
                                  <option value="salle-reunion">Salle de réunion</option>
                                  <option value="atelier">Atelier</option>
                                  <option value="entrepot">Entrepôt</option>
                                  <option value="reception">Réception</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-1">GPS Coordinates</label>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="text"
                                    value={newAssetForm.gps_latitude || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, gps_latitude: e.target.value})}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Latitude"
                                  />
                                  <input
                                    type="text"
                                    value={newAssetForm.gps_longitude || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, gps_longitude: e.target.value})}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Longitude"
                                  />
                                  <button
                                    type="button"
                                    className="px-3 py-2 bg-blue-50 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-100"
                                    title="Obtenir la position actuelle"
                                  >
                                    <MapPin className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>

                              <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">Address</label>
                                <textarea
                                  value={newAssetForm.location_address || ''}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, location_address: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  rows={2}
                                  placeholder="Adresse complète de localisation"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Material Data Tab */}
                        {activeGeneralTab === 'material' && (
                          <div className="space-y-6">
                            {/* Material Data Section */}
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <Package className="w-5 h-5 mr-2 text-blue-600" />
                                Material Data
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div>
                                  <label className="block text-sm font-medium mb-1">Material Data</label>
                                  <input
                                    type="text"
                                    value={newAssetForm.material_data || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, material_data: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Données matérielles"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium mb-1">Additional Identifier</label>
                                  <input
                                    type="text"
                                    value={newAssetForm.additional_identifier || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, additional_identifier: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Identifiant additionnel"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium mb-1">Shipping Type</label>
                                  <select
                                    value={newAssetForm.shipping_type || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, shipping_type: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="">-- Sélectionnez --</option>
                                    <option value="maritime">Maritime</option>
                                    <option value="aerien">Aérien</option>
                                    <option value="routier">Routier</option>
                                    <option value="ferroviaire">Ferroviaire</option>
                                    <option value="local">Local</option>
                                  </select>
                                </div>
                              </div>
                            </div>

                            {/* Serial & Batch Numbers Section */}
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <Tag className="w-5 h-5 mr-2 text-blue-600" />
                                Numéros de série et lots
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div>
                                  <label className="block text-sm font-medium mb-1">Serial Number</label>
                                  <input
                                    type="text"
                                    value={newAssetForm.serial_number}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, serial_number: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Numéro de série"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium mb-1">Batch Numbers</label>
                                  <input
                                    type="text"
                                    value={newAssetForm.batch_numbers || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, batch_numbers: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Numéros de lot (séparés par des virgules)"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium mb-1">Managed Items By</label>
                                  <select
                                    value={newAssetForm.managed_by || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, managed_by: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="">-- Sélectionnez --</option>
                                    <option value="serial">Par numéro de série</option>
                                    <option value="batch">Par lot</option>
                                    <option value="both">Les deux</option>
                                    <option value="none">Aucun</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium mb-1">Disposal Method</label>
                                  <select
                                    value={newAssetForm.disposal_method || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, disposal_method: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="">-- Sélectionnez --</option>
                                    <option value="sale">Vente</option>
                                    <option value="donation">Don</option>
                                    <option value="destruction">Destruction</option>
                                    <option value="recycling">Recyclage</option>
                                    <option value="transfer">Transfert</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Acquisition Information Tab */}
                  {activeFormTab === 'acquisition' && (
                    <div className="space-y-8">
                      {/* Vendor/Supplier Information Section */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <Users className="w-5 h-5 mr-2 text-blue-600" />
                          Vendor/Supplier Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium mb-1">Vendor Name *</label>
                            <input
                              type="text"
                              value={newAssetForm.vendor_name || ''}
                              onChange={(e) => setNewAssetForm({...newAssetForm, vendor_name: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              placeholder="Nom du fournisseur"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-1">Vendor Contact Information</label>
                            <input
                              type="text"
                              value={newAssetForm.vendor_contact || ''}
                              onChange={(e) => setNewAssetForm({...newAssetForm, vendor_contact: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              placeholder="Téléphone / Email du contact"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-1">Document Number</label>
                            <input
                              type="text"
                              value={newAssetForm.document_number || ''}
                              onChange={(e) => setNewAssetForm({...newAssetForm, document_number: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              placeholder="Numéro de document"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Purchase Order Details Section */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <FileText className="w-5 h-5 mr-2 text-blue-600" />
                          Purchase Order Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <div>
                            <label className="block text-sm font-medium mb-1">Purchase Order Number *</label>
                            <input
                              type="text"
                              value={newAssetForm.purchase_order_number || ''}
                              onChange={(e) => setNewAssetForm({...newAssetForm, purchase_order_number: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              placeholder="N° bon de commande"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-1">Acquisition Date *</label>
                            <input
                              type="date"
                              value={newAssetForm.acquisition_date || '2024-01-01'}
                              onChange={(e) => setNewAssetForm({...newAssetForm, acquisition_date: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              placeholder="01/01/2024"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-1">Acquisition Cost</label>
                            <div className="flex items-center">
                              <input
                                type="number"
                                value={newAssetForm.acquisition_cost || ''}
                                onChange={(e) => setNewAssetForm({...newAssetForm, acquisition_cost: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Montant"
                              />
                              <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">
                                XAF
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-1">Purchase Amount</label>
                            <div className="flex items-center">
                              <input
                                type="number"
                                value={newAssetForm.purchase_amount || ''}
                                onChange={(e) => setNewAssetForm({...newAssetForm, purchase_amount: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Montant d'achat"
                              />
                              <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">
                                XAF
                              </span>
                            </div>
                          </div>

                          <div className="lg:col-span-2">
                            <label className="block text-sm font-medium mb-1">Payment Terms</label>
                            <select
                              value={newAssetForm.payment_terms || ''}
                              onChange={(e) => setNewAssetForm({...newAssetForm, payment_terms: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">-- Sélectionnez --</option>
                              <option value="comptant">Comptant</option>
                              <option value="30_jours">30 jours</option>
                              <option value="60_jours">60 jours</option>
                              <option value="90_jours">90 jours</option>
                              <option value="echelonne">Paiement échelonné</option>
                              <option value="leasing">Leasing</option>
                              <option value="credit_bail">Crédit-bail</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Asset Address and Ownership Section */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                          Asset Address and Ownership
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Delivery Address</label>
                            <textarea
                              value={newAssetForm.delivery_address || ''}
                              onChange={(e) => setNewAssetForm({...newAssetForm, delivery_address: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              rows={3}
                              placeholder="Adresse de livraison complète"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-1">Owner</label>
                            <input
                              type="text"
                              value={newAssetForm.owner || ''}
                              onChange={(e) => setNewAssetForm({...newAssetForm, owner: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              placeholder="Propriétaire de l'actif"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-1">Ownership Type</label>
                            <select
                              value={newAssetForm.ownership_type || ''}
                              onChange={(e) => setNewAssetForm({...newAssetForm, ownership_type: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">-- Sélectionnez --</option>
                              <option value="propriete">Propriété</option>
                              <option value="location">Location</option>
                              <option value="leasing">Leasing</option>
                              <option value="pret">Prêt</option>
                              <option value="consignation">Consignation</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Immobilisation Tab */}
                  {activeFormTab === 'immobilisation' && (
                    <div className="space-y-6">
                      {/* Horizontal Tabs for Immobilisation */}
                      <div className="border-b border-gray-200">
                        <nav className="flex flex-wrap space-x-6">
                          {[
                            { id: 'overview', label: 'Overview', icon: Eye },
                            { id: 'components', label: 'Composants', icon: Package },
                            { id: 'maintenance', label: 'Données de maintenance', icon: Wrench },
                            { id: 'attachments', label: 'Attachements', icon: Paperclip },
                            { id: 'notes', label: 'Notes', icon: FileText },
                            { id: 'values', label: 'Values', icon: DollarSign },
                            { id: 'depreciation', label: "Paramètres d'amortissement", icon: TrendingDown },
                            { id: 'table', label: "Table d'amortissement", icon: BarChart3 },
                            { id: 'accounting', label: 'Comptabilité', icon: Calculator },
                            { id: 'history', label: 'Historique des changements', icon: History }
                          ].map((tab) => {
                            const IconComponent = tab.icon;
                            return (
                              <button
                                key={tab.id}
                                onClick={() => setActiveImmobilisationTab(tab.id)}
                                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                                  activeImmobilisationTab === tab.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                              >
                                <IconComponent className="w-4 h-4 mr-2" />
                                {tab.label}
                              </button>
                            );
                          })}
                        </nav>
                      </div>

                      {/* Tab Content */}
                      <div className="mt-6">
                        {/* Overview Tab */}
                        {activeImmobilisationTab === 'overview' && (
                          <div className="space-y-6">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                              <h4 className="text-lg font-semibold text-blue-900 mb-4">Vue d'ensemble de l'immobilisation</h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                  <label className="text-sm text-blue-700">Code immobilisation</label>
                                  <p className="text-lg font-bold text-blue-900">{newAssetForm.asset_number || 'IMM-2024-001'}</p>
                                </div>
                                <div>
                                  <label className="text-sm text-blue-700">Catégorie</label>
                                  <p className="text-lg font-bold text-blue-900">{newAssetForm.asset_category || 'Non défini'}</p>
                                </div>
                                <div>
                                  <label className="text-sm text-blue-700">Statut</label>
                                  <p className="text-lg font-bold text-green-700">En service</p>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              <div>
                                <label className="block text-sm font-medium mb-1">Date de mise en service</label>
                                <input
                                  type="date"
                                  value={newAssetForm.capitalization_date || ''}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, capitalization_date: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Durée de vie utile (années)</label>
                                <input
                                  type="number"
                                  value={newAssetForm.useful_life || ''}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, useful_life: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="5"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Valeur résiduelle (%)</label>
                                <input
                                  type="number"
                                  value={newAssetForm.residual_value_percent || '10'}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, residual_value_percent: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="10"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Values Tab */}
                        {activeImmobilisationTab === 'values' && (
                          <div className="space-y-6">
                            <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                              <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
                              Valeurs de l'immobilisation
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className="block text-sm font-medium mb-1">Valeur d'acquisition</label>
                                <div className="flex items-center">
                                  <input
                                    type="number"
                                    value={newAssetForm.acquisition_value || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, acquisition_value: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="1000000"
                                  />
                                  <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">XAF</span>
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Valeur comptable nette</label>
                                <div className="flex items-center">
                                  <input
                                    type="number"
                                    value={newAssetForm.net_book_value || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, net_book_value: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="800000"
                                  />
                                  <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">XAF</span>
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Amortissement cumulé</label>
                                <div className="flex items-center">
                                  <input
                                    type="number"
                                    value={newAssetForm.cumulated_depreciation || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, cumulated_depreciation: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="200000"
                                  />
                                  <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">XAF</span>
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Valeur résiduelle</label>
                                <div className="flex items-center">
                                  <input
                                    type="number"
                                    value={newAssetForm.salvage_value || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, salvage_value: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="100000"
                                  />
                                  <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">XAF</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Depreciation Parameters Tab */}
                        {activeImmobilisationTab === 'depreciation' && (
                          <div className="space-y-8">
                            {/* Asset Information Section */}
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <Info className="w-5 h-5 mr-2 text-blue-600" />
                                Asset Information
                              </h4>
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Asset ID (Unique identifier)
                                    </label>
                                    <input
                                      type="text"
                                      value={newAssetForm.asset_id || 'ID-00333'}
                                      onChange={(e) => setNewAssetForm({...newAssetForm, asset_id: e.target.value})}
                                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                      placeholder="ID-00333"
                                    />
                                  </div>

                                  <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Asset name/Description
                                    </label>
                                    <input
                                      type="text"
                                      value={newAssetForm.asset_description || 'ARIC TRAVAUX D\'ASSAINISSEMENT'}
                                      onChange={(e) => setNewAssetForm({...newAssetForm, asset_description: e.target.value})}
                                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                      placeholder="ARIC TRAVAUX D'ASSAINISSEMENT"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Asset category
                                    </label>
                                    <select
                                      value={newAssetForm.asset_category || ''}
                                      onChange={(e) => setNewAssetForm({...newAssetForm, asset_category: e.target.value})}
                                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                      <option value="">Sélectionnez...</option>
                                      <option value="building">Bâtiments et constructions</option>
                                      <option value="equipment">Équipements et matériels</option>
                                      <option value="vehicle">Véhicules</option>
                                      <option value="furniture">Mobilier</option>
                                      <option value="it">Matériel informatique</option>
                                      <option value="intangible">Immobilisations incorporelles</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Original cost
                                    </label>
                                    <div className="flex items-center">
                                      <input
                                        type="text"
                                        value={newAssetForm.original_cost || '59160515,00'}
                                        onChange={(e) => setNewAssetForm({...newAssetForm, original_cost: e.target.value})}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 text-right font-semibold"
                                        placeholder="59160515,00"
                                      />
                                      <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">
                                        XAF
                                      </span>
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Additional costs
                                    </label>
                                    <div className="flex items-center">
                                      <input
                                        type="text"
                                        value={newAssetForm.additional_costs || '0,00'}
                                        onChange={(e) => setNewAssetForm({...newAssetForm, additional_costs: e.target.value})}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 text-right"
                                        placeholder="0,00"
                                      />
                                      <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">
                                        XAF
                                      </span>
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Total capitalized cost
                                    </label>
                                    <div className="flex items-center">
                                      <input
                                        type="text"
                                        value={newAssetForm.total_capitalized_cost || '59160515,00'}
                                        onChange={(e) => setNewAssetForm({...newAssetForm, total_capitalized_cost: e.target.value})}
                                        className="w-full px-3 py-2 bg-blue-100 border border-blue-300 rounded-l-lg font-bold text-right text-blue-900"
                                        placeholder="59160515,00"
                                        readOnly
                                      />
                                      <span className="px-3 py-2 bg-blue-200 border border-l-0 border-blue-300 rounded-r-lg text-blue-900 font-semibold">
                                        XAF
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Depreciation Details Section */}
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <TrendingDown className="w-5 h-5 mr-2 text-blue-600" />
                                Depreciation Details
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Depreciation method
                                  </label>
                                  <select
                                    value={newAssetForm.depreciation_method || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, depreciation_method: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="">-- Select --</option>
                                    <option value="straight_line">Straight Line</option>
                                    <option value="declining_balance">Declining Balance</option>
                                    <option value="sum_of_years">Sum of Years Digits</option>
                                    <option value="units_of_production">Units of Production</option>
                                    <option value="custom">Custom</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Depreciation start date
                                  </label>
                                  <input
                                    type="date"
                                    value={newAssetForm.depreciation_start_date || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, depreciation_start_date: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="jj/mm/aaaa"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Depreciation end date
                                  </label>
                                  <input
                                    type="date"
                                    value={newAssetForm.depreciation_end_date || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, depreciation_end_date: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="jj/mm/aaaa"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Useful life (Months)
                                  </label>
                                  <input
                                    type="number"
                                    value={newAssetForm.useful_life_months || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, useful_life_months: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="60"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Life time in years
                                  </label>
                                  <input
                                    type="number"
                                    value={newAssetForm.lifetime_years || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, lifetime_years: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="5"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Remaining life
                                  </label>
                                  <input
                                    type="number"
                                    value={newAssetForm.remaining_life || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, remaining_life: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="48"
                                  />
                                </div>

                                <div className="md:col-span-3">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Depreciation type
                                  </label>
                                  <select
                                    value={newAssetForm.depreciation_type || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, depreciation_type: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="">-- Select --</option>
                                    <option value="fiscal">Fiscal</option>
                                    <option value="accounting">Accounting</option>
                                    <option value="both">Both (Fiscal & Accounting)</option>
                                    <option value="economic">Economic</option>
                                  </select>
                                </div>
                              </div>
                            </div>

                            {/* Reporting and Verification Section */}
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <FileText className="w-5 h-5 mr-2 text-blue-600" />
                                Reporting and Verification
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Reporting frequency
                                  </label>
                                  <select
                                    value={newAssetForm.reporting_frequency || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, reporting_frequency: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="">-- Select --</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="quarterly">Quarterly</option>
                                    <option value="semi_annual">Semi-Annual</option>
                                    <option value="annual">Annual</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Verification date
                                  </label>
                                  <input
                                    type="date"
                                    value={newAssetForm.verification_date || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, verification_date: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="jj/mm/aaaa"
                                  />
                                </div>

                                <div className="md:col-span-2">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Verification process
                                  </label>
                                  <textarea
                                    value={newAssetForm.verification_process || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, verification_process: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    rows={3}
                                    placeholder="Describe the verification process..."
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Depreciation Table Tab */}
                        {activeImmobilisationTab === 'table' && (
                          <div className="space-y-6">
                            <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                              <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                              Table d'amortissement
                            </h4>
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Année</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valeur début</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dotation</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cumul</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">VNC</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {[...Array(5)].map((_, i) => (
                                    <tr key={i}>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {2024 + i}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatCurrency(1000000 - (i * 200000))}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatCurrency(200000)}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatCurrency((i + 1) * 200000)}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {formatCurrency(1000000 - ((i + 1) * 200000))}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Accounting Tab */}
                        {activeImmobilisationTab === 'accounting' && (
                          <div className="space-y-8">
                            {/* Cost Accounting Section - Assets List */}
                            <div className="space-y-4">
                              <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                                <Database className="w-5 h-5 mr-2 text-blue-600" />
                                Cost Accounting - Assets List
                              </h4>

                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-4">
                                  <h5 className="text-sm font-semibold text-gray-700">Assets List</h5>
                                  <div className="flex space-x-2">
                                    <button className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded hover:bg-blue-100">
                                      Export CSV
                                    </button>
                                    <button className="px-3 py-1 bg-green-50 text-green-600 text-xs font-medium rounded hover:bg-green-100">
                                      Add Asset
                                    </button>
                                  </div>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-white">
                                      <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Asset ID
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Asset name/Description
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Asset category
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Location
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Acquisition date
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {[
                                        {
                                          id: 'FA001',
                                          name: 'Office furniture',
                                          category: 'Furniture',
                                          location: 'Office building 1',
                                          date: '15/01/2022'
                                        },
                                        {
                                          id: 'FA002',
                                          name: 'Laptop Dell XPS',
                                          category: 'IT Equipment',
                                          location: 'Office building 2',
                                          date: '20/03/2022'
                                        },
                                        {
                                          id: 'FA003',
                                          name: 'Toyota Hilux',
                                          category: 'Vehicle',
                                          location: 'Parking A',
                                          date: '10/06/2022'
                                        },
                                        {
                                          id: 'FA004',
                                          name: 'Air Conditioner',
                                          category: 'Equipment',
                                          location: 'Office building 1',
                                          date: '05/08/2022'
                                        },
                                        {
                                          id: 'FA005',
                                          name: 'Conference Table',
                                          category: 'Furniture',
                                          location: 'Meeting Room A',
                                          date: '12/09/2022'
                                        }
                                      ].map((asset, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {asset.id}
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            {asset.name}
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                                              {asset.category}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            {asset.location}
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            {asset.date}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
                                  <span>Showing 5 of 150 assets</span>
                                  <div className="flex space-x-1">
                                    <button className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">Previous</button>
                                    <button className="px-2 py-1 bg-blue-600 text-white rounded">1</button>
                                    <button className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">2</button>
                                    <button className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">3</button>
                                    <button className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">Next</button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Cost Accounting - Maintenance */}
                            <div className="space-y-4">
                              <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                                <Wrench className="w-5 h-5 mr-2 text-blue-600" />
                                Cost Accounting - Maintenance
                              </h4>

                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-4">
                                  <h5 className="text-sm font-semibold text-gray-700">Maintenance History</h5>
                                  <div className="flex space-x-2">
                                    <button className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded hover:bg-blue-100">
                                      Export PDF
                                    </button>
                                    <button className="px-3 py-1 bg-green-50 text-green-600 text-xs font-medium rounded hover:bg-green-100">
                                      Add Maintenance
                                    </button>
                                  </div>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-white">
                                      <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Maintenance Date
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Vendor
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Component
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Description
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          GRSE
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Invoice
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Amount
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Status
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {[
                                        {
                                          date: '15/01/2024',
                                          vendor: 'Tech Services SA',
                                          component: 'Air Filter',
                                          description: 'Remplacement filtre climatisation',
                                          grse: 'GR-2024-001',
                                          invoice: 'INV-2024-456',
                                          amount: 300000,
                                          status: 'Paid'
                                        },
                                        {
                                          date: '20/02/2024',
                                          vendor: 'Auto Maintenance Ltd',
                                          component: 'Engine Oil',
                                          description: 'Vidange moteur véhicule',
                                          grse: 'GR-2024-002',
                                          invoice: 'INV-2024-789',
                                          amount: 300000,
                                          status: 'Paid'
                                        },
                                        {
                                          date: '10/03/2024',
                                          vendor: 'Building Services',
                                          component: 'Electrical System',
                                          description: 'Réparation système électrique',
                                          grse: 'GR-2024-003',
                                          invoice: 'INV-2024-123',
                                          amount: 300000,
                                          status: 'Pending'
                                        }
                                      ].map((maintenance, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            {maintenance.date}
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            {maintenance.vendor}
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            {maintenance.component}
                                          </td>
                                          <td className="px-4 py-3 text-sm text-gray-600">
                                            {maintenance.description}
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            <span className="text-blue-600 hover:underline cursor-pointer">
                                              {maintenance.grse}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            <span className="text-blue-600 hover:underline cursor-pointer">
                                              {maintenance.invoice}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                                            {maintenance.amount.toLocaleString()} XAF
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-center">
                                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                                              maintenance.status === 'Paid'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                              {maintenance.status}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                      {/* Total Row */}
                                      <tr className="bg-gray-100 font-semibold">
                                        <td colSpan={6} className="px-4 py-3 text-sm text-gray-900 text-right">
                                          Total:
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-900">
                                          900,000 XAF
                                        </td>
                                        <td className="px-4 py-3"></td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>

                                <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
                                  <span>Showing 3 maintenance records</span>
                                  <div className="flex items-center space-x-4">
                                    <div className="flex items-center">
                                      <span className="w-3 h-3 bg-green-100 rounded-full mr-2"></span>
                                      <span>Paid: 2</span>
                                    </div>
                                    <div className="flex items-center">
                                      <span className="w-3 h-3 bg-yellow-100 rounded-full mr-2"></span>
                                      <span>Pending: 1</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* History Tab */}
                        {activeImmobilisationTab === 'history' && (
                          <div className="space-y-6">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                                <History className="w-5 h-5 mr-2 text-blue-600" />
                                Historique des changements
                              </h4>
                              <div className="flex space-x-2">
                                <button className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded hover:bg-blue-100 flex items-center">
                                  <Download className="w-3 h-3 mr-1" />
                                  Export
                                </button>
                                <button className="px-3 py-1 bg-gray-50 text-gray-600 text-xs font-medium rounded hover:bg-gray-100 flex items-center">
                                  <Filter className="w-3 h-3 mr-1" />
                                  Filter
                                </button>
                              </div>
                            </div>

                            <div className="overflow-x-auto shadow-sm border border-gray-200 rounded-lg">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                      Date<br/>du changement
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                      Numéro<br/>de l'actif
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                      Description<br/>de l'actif
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                      Type de<br/>changement
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                      Ancienne<br/>valeur
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                      Nouvelle<br/>valeur
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                      Ancien<br/>centre de coût
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                      Nouveau<br/>centre de coût
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                      Ancienne<br/>méthode de<br/>dépréciation
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                      Nouvelle<br/>méthode de<br/>dépréciation
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                      Ancienne<br/>durée de vie<br/>estimée
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                      Nouvelle<br/>durée de vie<br/>estimée
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                      Ancienne<br/>Valeur<br/>résiduelle
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                      Nouvelle<br/>Valeur<br/>résiduelle
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                      Responsable<br/>du changement
                                    </th>
                                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Commentaires
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {[
                                    {
                                      date: '20/08/2024',
                                      assetNumber: '12345',
                                      description: 'Ordinateur portable',
                                      changeType: 'Réévaluation',
                                      oldValue: '999 999 999',
                                      newValue: '999 999 999',
                                      oldCostCenter: 'Centre A',
                                      newCostCenter: 'Centre B',
                                      oldDepMethod: 'Linéaire',
                                      newDepMethod: 'Dégressif',
                                      oldLifespan: '5 ans',
                                      newLifespan: '4 ans',
                                      oldResidual: '999 999 999',
                                      newResidual: '999 999 999',
                                      responsible: 'Pamela Atokouna',
                                      hasComment: true
                                    },
                                    {
                                      date: '15/07/2024',
                                      assetNumber: '12346',
                                      description: 'Véhicule Toyota',
                                      changeType: 'Changement localisation',
                                      oldValue: '15 000 000',
                                      newValue: '15 000 000',
                                      oldCostCenter: 'Centre B',
                                      newCostCenter: 'Centre C',
                                      oldDepMethod: 'Dégressif',
                                      newDepMethod: 'Dégressif',
                                      oldLifespan: '7 ans',
                                      newLifespan: '7 ans',
                                      oldResidual: '2 000 000',
                                      newResidual: '2 000 000',
                                      responsible: 'Jean Dupont',
                                      hasComment: true
                                    },
                                    {
                                      date: '10/06/2024',
                                      assetNumber: '12347',
                                      description: 'Mobilier de bureau',
                                      changeType: 'Mise à jour valeur',
                                      oldValue: '5 000 000',
                                      newValue: '4 500 000',
                                      oldCostCenter: 'Centre A',
                                      newCostCenter: 'Centre A',
                                      oldDepMethod: 'Linéaire',
                                      newDepMethod: 'Linéaire',
                                      oldLifespan: '10 ans',
                                      newLifespan: '10 ans',
                                      oldResidual: '500 000',
                                      newResidual: '450 000',
                                      responsible: 'Marie Kouam',
                                      hasComment: false
                                    }
                                  ].map((item, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                                        {item.date}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-blue-600">
                                        {item.assetNumber}
                                      </td>
                                      <td className="px-3 py-2 text-xs text-gray-700 max-w-[150px] truncate">
                                        {item.description}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap">
                                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                                          {item.changeType}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600 text-right">
                                        {item.oldValue}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 font-medium text-right">
                                        {item.newValue}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                                        {item.oldCostCenter}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 font-medium">
                                        {item.newCostCenter}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                                        {item.oldDepMethod}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 font-medium">
                                        {item.newDepMethod}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600 text-center">
                                        {item.oldLifespan}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 font-medium text-center">
                                        {item.newLifespan}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600 text-right">
                                        {item.oldResidual}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 font-medium text-right">
                                        {item.newResidual}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700">
                                        {item.responsible}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-center">
                                        {item.hasComment ? (
                                          <button
                                            className="text-blue-600 hover:text-blue-800"
                                            title="Voir les commentaires"
                                          >
                                            <FileText className="w-4 h-4" />
                                          </button>
                                        ) : (
                                          <span className="text-gray-400">-</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Pagination */}
                            <div className="flex items-center justify-between text-xs text-gray-600 mt-4">
                              <span>Affichage de 3 sur 150 changements</span>
                              <div className="flex space-x-1">
                                <button className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">Précédent</button>
                                <button className="px-2 py-1 bg-blue-600 text-white rounded">1</button>
                                <button className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">2</button>
                                <button className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">3</button>
                                <button className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">Suivant</button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Sales Tab */}
                  {activeFormTab === 'vente' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                        <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                        Données de vente
                      </h3>

                      {/* Sales Table */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="text-sm font-semibold text-gray-700">Historique des ventes</h5>
                          <div className="flex space-x-2">
                            <button className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded hover:bg-blue-100">
                              Export Excel
                            </button>
                            <button className="px-3 py-1 bg-green-50 text-green-600 text-xs font-medium rounded hover:bg-green-100">
                              Ajouter une vente
                            </button>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-white">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Sale Date
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Buyer/Recipient
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Book Value
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Selling Price
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Sales Invoice/Receipt
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {[
                                {
                                  date: '15/09/2023',
                                  buyer: 'XYZ Corporation',
                                  bookValue: '',
                                  sellingPrice: 1500000,
                                  invoice: 'INV2023-001'
                                },
                                {
                                  date: '15/09/2023',
                                  buyer: 'XYZ Corporation',
                                  bookValue: '',
                                  sellingPrice: 1500000,
                                  invoice: 'INV2023-001'
                                },
                                {
                                  date: '15/09/2023',
                                  buyer: 'XYZ Corporation',
                                  bookValue: '',
                                  sellingPrice: 1500000,
                                  invoice: 'INV2023-001'
                                }
                              ].map((sale, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                    {sale.date}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                                    {sale.buyer}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-600">
                                    {sale.bookValue || '-'}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                                    {sale.sellingPrice.toLocaleString()} XAF
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                    <span className="text-blue-600 hover:underline cursor-pointer">
                                      {sale.invoice}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-center">
                                    <div className="flex items-center justify-center space-x-2">
                                      <button className="text-blue-600 hover:text-blue-800">
                                        <Eye className="w-4 h-4" />
                                      </button>
                                      <button className="text-gray-600 hover:text-gray-800">
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button className="text-red-600 hover:text-red-800">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
                          <span>Affichage de 3 ventes</span>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-gray-700 mr-2">Total ventes:</span>
                              <span className="text-sm font-bold text-green-600">4,500,000 XAF</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Additional Sale Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <h5 className="text-sm font-semibold text-gray-700 mb-3">Informations de la dernière vente</h5>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Date de vente:</span>
                              <span className="text-sm font-medium text-gray-900">15/09/2023</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Acheteur:</span>
                              <span className="text-sm font-medium text-gray-900">XYZ Corporation</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Prix de vente:</span>
                              <span className="text-sm font-medium text-green-600">1,500,000 XAF</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Plus/Moins-value:</span>
                              <span className="text-sm font-medium text-green-600">+500,000 XAF</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <h5 className="text-sm font-semibold text-gray-700 mb-3">Documents de vente</h5>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center">
                                <FileText className="w-4 h-4 text-blue-600 mr-2" />
                                <span className="text-sm text-gray-700">Facture de vente</span>
                              </div>
                              <button className="text-blue-600 hover:text-blue-800 text-sm">
                                Télécharger
                              </button>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center">
                                <FileText className="w-4 h-4 text-blue-600 mr-2" />
                                <span className="text-sm text-gray-700">Contrat de cession</span>
                              </div>
                              <button className="text-blue-600 hover:text-blue-800 text-sm">
                                Télécharger
                              </button>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center">
                                <FileText className="w-4 h-4 text-blue-600 mr-2" />
                                <span className="text-sm text-gray-700">Certificat de transfert</span>
                              </div>
                              <button className="text-blue-600 hover:text-blue-800 text-sm">
                                Télécharger
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section Composants */}
                  {activeFormTab === 'composants' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                        <Package className="w-5 h-5 mr-2 text-blue-600" />
                        Composants de l'actif
                      </h3>

                      {/* Composants Table */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="text-sm font-semibold text-gray-700">Liste des composants</h5>
                          <div className="flex space-x-2">
                            <button className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded hover:bg-blue-100">
                              Export Excel
                            </button>
                            <button className="px-3 py-1 bg-green-50 text-green-600 text-xs font-medium rounded hover:bg-green-100">
                              Ajouter un composant
                            </button>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-white">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Code
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Name
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Description
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  État
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Catégorie
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Date d'installation
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Localisation
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {[
                                {
                                  code: 'COMP-001',
                                  name: 'Moteur principal',
                                  description: 'Moteur diesel 4 cylindres',
                                  etat: 'Bon',
                                  categorie: 'Mécanique',
                                  dateInstallation: '15/01/2023',
                                  localisation: 'Bloc moteur'
                                },
                                {
                                  code: 'COMP-002',
                                  name: 'Système de freinage',
                                  description: 'Freins à disque ventilés',
                                  etat: 'Usagé',
                                  categorie: 'Mécanique',
                                  dateInstallation: '15/01/2023',
                                  localisation: 'Trains avant/arrière'
                                },
                                {
                                  code: 'COMP-003',
                                  name: 'Tableau de bord',
                                  description: 'Système d\'affichage numérique',
                                  etat: 'Neuf',
                                  categorie: 'Électronique',
                                  dateInstallation: '20/06/2024',
                                  localisation: 'Habitacle'
                                }
                              ].map((composant, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600">
                                    {composant.code}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {composant.name}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {composant.description}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                                      composant.etat === 'Neuf' ? 'bg-green-100 text-green-700' :
                                      composant.etat === 'Bon' ? 'bg-blue-100 text-blue-700' :
                                      composant.etat === 'Usagé' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-red-100 text-red-700'
                                    }`}>
                                      {composant.etat}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                    {composant.categorie}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                    {composant.dateInstallation}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                    {composant.localisation}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-center">
                                    <div className="flex items-center justify-center space-x-2">
                                      <button className="text-blue-600 hover:text-blue-800">
                                        <Eye className="w-4 h-4" />
                                      </button>
                                      <button className="text-gray-600 hover:text-gray-800">
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button className="text-red-600 hover:text-red-800">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
                          <span>Affichage de 3 composants</span>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                              <span className="w-3 h-3 bg-green-100 rounded-full mr-2"></span>
                              <span>Neuf: 1</span>
                            </div>
                            <div className="flex items-center">
                              <span className="w-3 h-3 bg-blue-100 rounded-full mr-2"></span>
                              <span>Bon: 1</span>
                            </div>
                            <div className="flex items-center">
                              <span className="w-3 h-3 bg-yellow-100 rounded-full mr-2"></span>
                              <span>Usagé: 1</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section Données de maintenance */}
                  {activeFormTab === 'maintenance' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                        <Wrench className="w-5 h-5 mr-2 text-blue-600" />
                        Données de maintenance
                      </h3>

                      {/* Sub-tabs for Maintenance */}
                      <div className="border-b border-gray-200">
                        <nav className="flex space-x-8">
                          {[
                            { id: 'contract', label: 'Contrat de maintenance', icon: FileText },
                            { id: 'history', label: 'Historique de maintenance', icon: History }
                          ].map((tab) => {
                            const IconComponent = tab.icon;
                            return (
                              <button
                                key={tab.id}
                                onClick={() => setActiveMaintenanceTab(tab.id)}
                                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                  (activeMaintenanceTab || 'contract') === tab.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                              >
                                <IconComponent className="w-4 h-4 mr-2" />
                                {tab.label}
                              </button>
                            );
                          })}
                        </nav>
                      </div>

                      {/* Contract Tab */}
                      {(activeMaintenanceTab || 'contract') === 'contract' && (
                        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
                        <h4 className="text-md font-semibold text-gray-800 border-b pb-2">
                          Maintenance Service Contract
                        </h4>

                        {/* Basic contract information */}
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-4">Basic contract information</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Contract name</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Contract name"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Vendor</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Vendor"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">EDTCI</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="EDTCI"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Parent site reference</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Parent site reference"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Contract type</label>
                              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                <option>-- Sélectionnez --</option>
                                <option>Service complet</option>
                                <option>Préventif</option>
                                <option>À la demande</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Contract object</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Contract object"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Vendor #</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Vendor number"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">GLA (m²)</label>
                              <input
                                type="number"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Code contract</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Code contract"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Contracted parties information */}
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-4">Contracted parties information</h5>

                          {/* Structure Information */}
                          <div className="mb-4">
                            <h6 className="text-xs font-semibold text-gray-600 uppercase mb-3">Structure</h6>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Legal signatory</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Legal signatory"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">EDTCI</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="EDTCI"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Structure address</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Structure address"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Phone number</label>
                                <input
                                  type="tel"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Phone number"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Email address</label>
                                <input
                                  type="email"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Email address"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">ID/Reg</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="ID/Reg"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Vendor Information */}
                          <div>
                            <h6 className="text-xs font-semibold text-gray-600 uppercase mb-3">Vendor</h6>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Vendor name</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Vendor name"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Address</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Vendor address"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Phone number</label>
                                <input
                                  type="tel"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Phone number"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Email address</label>
                                <input
                                  type="email"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Email address"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">ID/Reg</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="ID/Reg"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Creation informations */}
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-4">Creation informations</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Created by</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Created by"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Creation date</label>
                              <input
                                type="date"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="jj/mm/aaaa"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Price & payment terms */}
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-4">Price & payment terms</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Contract obligation</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Contract obligation"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Tax rate</label>
                              <input
                                type="number"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="0%"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Payment term</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Payment term"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">P. method</label>
                              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                <option>Virement</option>
                                <option>Chèque</option>
                                <option>Espèces</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Price list summary excluding VAT */}
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-4">Price list summary excluding VAT</h5>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                <tr>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm">1</td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm">Maintenance préventive</td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right">15,000,000</td>
                                  <td className="px-4 py-3 whitespace-nowrap text-center">
                                    <button className="text-blue-600 hover:text-blue-800">
                                      <Edit className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                                {[...Array(5)].map((_, index) => (
                                  <tr key={index}>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">-</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">-</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right">-</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-center">-</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-gray-100">
                                <tr>
                                  <td colSpan={2} className="px-4 py-3 text-sm font-semibold">Total</td>
                                  <td className="px-4 py-3 text-sm font-semibold text-right">15,000,000</td>
                                  <td></td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>

                        {/* Contract key dates */}
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-4">Contract key dates</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Contract start date</label>
                              <input
                                type="date"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="jj/mm/aaaa"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Contract end date</label>
                              <input
                                type="date"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="jj/mm/aaaa"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Contract duration</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Duration"
                                readOnly
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Commencement date</label>
                              <input
                                type="date"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="jj/mm/aaaa"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Contract expiry date</label>
                              <input
                                type="date"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="jj/mm/aaaa"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      )}

                      {activeMaintenanceTab === 'history' && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h5 className="text-sm font-semibold text-gray-700">Maintenance History</h5>
                            <div className="flex space-x-2">
                              <button className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded hover:bg-blue-100">
                                Export Excel
                              </button>
                              <button className="px-3 py-1 bg-green-50 text-green-600 text-xs font-medium rounded hover:bg-green-100">
                                Add Maintenance
                              </button>
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-white">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technician</th>
                                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {[
                                  {
                                    date: '20/02/2024',
                                    type: 'Préventive',
                                    description: 'Vidange moteur véhicule',
                                    technician: 'Auto Maintenance Ltd',
                                    cost: 250000,
                                    status: 'Completed'
                                  },
                                  {
                                    date: '15/05/2024',
                                    type: 'Corrective',
                                    description: 'Remplacement plaquettes de frein',
                                    technician: 'Tech Services SA',
                                    cost: 350000,
                                    status: 'Completed'
                                  },
                                  {
                                    date: '01/08/2024',
                                    type: 'Préventive',
                                    description: 'Révision générale',
                                    technician: 'Maintenance Plus',
                                    cost: 500000,
                                    status: 'Pending'
                                  }
                                ].map((maintenance, index) => (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{maintenance.date}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                                        maintenance.type === 'Préventive' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                                      }`}>
                                        {maintenance.type}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{maintenance.description}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{maintenance.technician}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                                      {maintenance.cost.toLocaleString()} XAF
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-center">
                                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                                        maintenance.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                      }`}>
                                        {maintenance.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Statistics */}
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white border border-gray-200 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Total maintenances</span>
                                <span className="text-lg font-semibold text-blue-600">12</span>
                              </div>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Coût total</span>
                                <span className="text-lg font-semibold text-green-600">2,850,000 XAF</span>
                              </div>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Prochaine maintenance</span>
                                <span className="text-lg font-semibold text-orange-600">Dans 15 jours</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Section Attachements */}
                  {activeFormTab === 'attachements' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                        <Paperclip className="w-5 h-5 mr-2 text-blue-600" />
                        Attachements
                      </h3>

                      {/* Upload Area */}
                      <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 transition-colors">
                        <div className="text-center">
                          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">
                            Glissez-déposez vos fichiers ici
                          </h4>
                          <p className="text-xs text-gray-500 mb-4">
                            ou cliquez pour parcourir
                          </p>
                          <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                            Sélectionner des fichiers
                          </button>
                          <p className="text-xs text-gray-400 mt-2">
                            Formats acceptés: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (Max 10MB)
                          </p>
                        </div>
                      </div>

                      {/* File Categories */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                          { name: 'Documents administratifs', count: 5, icon: FileText, color: 'blue' },
                          { name: 'Photos', count: 12, icon: Camera, color: 'green' },
                          { name: 'Contrats', count: 3, icon: Shield, color: 'purple' },
                          { name: 'Rapports techniques', count: 8, icon: Wrench, color: 'orange' }
                        ].map((category, index) => {
                          const IconComponent = category.icon;
                          return (
                            <div key={index} className={`bg-${category.color}-50 border border-${category.color}-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow`}>
                              <div className="flex items-center justify-between mb-2">
                                <IconComponent className={`w-6 h-6 text-${category.color}-600`} />
                                <span className={`text-sm font-semibold text-${category.color}-700`}>{category.count}</span>
                              </div>
                              <p className="text-sm text-gray-700 font-medium">{category.name}</p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Attachments Table */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="text-sm font-semibold text-gray-700">Documents attachés</h5>
                          <div className="flex space-x-2">
                            <button className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded hover:bg-blue-100 flex items-center">
                              <Filter className="w-3 h-3 mr-1" />
                              Filtrer
                            </button>
                            <button className="px-3 py-1 bg-green-50 text-green-600 text-xs font-medium rounded hover:bg-green-100 flex items-center">
                              <Download className="w-3 h-3 mr-1" />
                              Tout télécharger
                            </button>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-white">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Type
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Nom du fichier
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Description
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Catégorie
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Date d'ajout
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Taille
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Ajouté par
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {[
                                {
                                  type: 'PDF',
                                  name: 'Facture_achat_2024.pdf',
                                  description: 'Facture d\'acquisition du véhicule',
                                  category: 'Administratif',
                                  date: '15/01/2024',
                                  size: '2.5 MB',
                                  addedBy: 'Jean Dupont',
                                  color: 'red'
                                },
                                {
                                  type: 'DOCX',
                                  name: 'Contrat_maintenance.docx',
                                  description: 'Contrat de maintenance annuelle',
                                  category: 'Contrat',
                                  date: '20/01/2024',
                                  size: '1.2 MB',
                                  addedBy: 'Marie Martin',
                                  color: 'blue'
                                },
                                {
                                  type: 'JPG',
                                  name: 'Photo_asset_001.jpg',
                                  description: 'Photo de l\'état actuel',
                                  category: 'Photo',
                                  date: '10/02/2024',
                                  size: '3.8 MB',
                                  addedBy: 'Paul Dubois',
                                  color: 'green'
                                },
                                {
                                  type: 'XLSX',
                                  name: 'Rapport_maintenance.xlsx',
                                  description: 'Historique des maintenances',
                                  category: 'Technique',
                                  date: '05/03/2024',
                                  size: '850 KB',
                                  addedBy: 'Sophie Lambert',
                                  color: 'orange'
                                }
                              ].map((file, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <span className={`px-2 py-1 text-xs font-medium bg-${file.color}-100 text-${file.color}-700 rounded`}>
                                      {file.type}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600 hover:underline cursor-pointer">
                                    {file.name}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {file.description}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                    {file.category}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                    {file.date}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                    {file.size}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                    {file.addedBy}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-center">
                                    <div className="flex items-center justify-center space-x-2">
                                      <button className="text-blue-600 hover:text-blue-800" title="Voir">
                                        <Eye className="w-4 h-4" />
                                      </button>
                                      <button className="text-green-600 hover:text-green-800" title="Télécharger">
                                        <Download className="w-4 h-4" />
                                      </button>
                                      <button className="text-red-600 hover:text-red-800" title="Supprimer">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
                          <span>4 documents attachés</span>
                          <span>Taille totale: 8.35 MB</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section Notes */}
                  {activeFormTab === 'notes' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                        <Edit className="w-5 h-5 mr-2 text-blue-600" />
                        Notes
                      </h3>

                      {/* Add New Note */}
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <textarea
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                              rows={3}
                              placeholder="Ajouter une note..."
                            />
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <select className="px-3 py-1 border border-gray-300 rounded text-sm">
                                  <option>Général</option>
                                  <option>Technique</option>
                                  <option>Maintenance</option>
                                  <option>Important</option>
                                  <option>Rappel</option>
                                </select>
                                <select className="px-3 py-1 border border-gray-300 rounded text-sm">
                                  <option>Normale</option>
                                  <option>Haute</option>
                                  <option>Urgente</option>
                                </select>
                              </div>
                              <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                                Ajouter la note
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Notes Filter */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <button className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded">
                            Toutes (8)
                          </button>
                          <button className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200">
                            Général (3)
                          </button>
                          <button className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200">
                            Technique (2)
                          </button>
                          <button className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200">
                            Maintenance (2)
                          </button>
                          <button className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200">
                            Important (1)
                          </button>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            placeholder="Rechercher..."
                            className="px-3 py-1 border border-gray-300 rounded text-sm"
                          />
                          <select className="px-3 py-1 border border-gray-300 rounded text-sm">
                            <option>Plus récentes</option>
                            <option>Plus anciennes</option>
                            <option>Priorité haute</option>
                          </select>
                        </div>
                      </div>

                      {/* Notes List */}
                      <div className="space-y-4">
                        {[
                          {
                            id: 1,
                            type: 'Important',
                            priority: 'Haute',
                            subject: 'Maintenance urgente requise',
                            content: 'Le véhicule nécessite une révision complète avant la fin du mois. Les freins montrent des signes d\'usure avancée et doivent être vérifiés immédiatement.',
                            author: 'Jean Dupont',
                            date: '20/03/2024 14:30',
                            replies: 2,
                            hasAction: true,
                            actionDueDate: '30/03/2024',
                            assignedTo: 'Service Technique',
                            typeColor: 'red',
                            priorityColor: 'red'
                          },
                          {
                            id: 2,
                            type: 'Maintenance',
                            priority: 'Normale',
                            subject: 'Vidange effectuée',
                            content: 'Vidange moteur effectuée le 15/03/2024. Prochaine vidange prévue dans 10,000 km ou 6 mois.',
                            author: 'Tech Services',
                            date: '15/03/2024 10:15',
                            replies: 0,
                            hasAction: false,
                            typeColor: 'orange',
                            priorityColor: 'gray'
                          },
                          {
                            id: 3,
                            type: 'Général',
                            priority: 'Normale',
                            subject: 'Changement d\'affectation',
                            content: 'L\'actif a été transféré du département Commercial vers le département Logistique.',
                            author: 'Marie Martin',
                            date: '10/03/2024 09:00',
                            replies: 1,
                            hasAction: false,
                            typeColor: 'blue',
                            priorityColor: 'gray'
                          },
                          {
                            id: 4,
                            type: 'Technique',
                            priority: 'Normale',
                            subject: 'Mise à jour firmware',
                            content: 'Le système embarqué a été mis à jour vers la version 2.4.1. Amélioration de la consommation et correction de bugs mineurs.',
                            author: 'Paul Tech',
                            date: '05/03/2024 16:45',
                            replies: 0,
                            hasAction: false,
                            typeColor: 'green',
                            priorityColor: 'gray'
                          }
                        ].map((note) => (
                          <div key={note.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0">
                                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                    <User className="w-5 h-5 text-gray-600" />
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className={`px-2 py-1 text-xs font-medium bg-${note.typeColor}-100 text-${note.typeColor}-700 rounded`}>
                                      {note.type}
                                    </span>
                                    <span className={`px-2 py-1 text-xs font-medium bg-${note.priorityColor}-100 text-${note.priorityColor}-700 rounded`}>
                                      {note.priority}
                                    </span>
                                    {note.hasAction && (
                                      <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded flex items-center">
                                        <Clock className="w-3 h-3 mr-1" />
                                        Action requise
                                      </span>
                                    )}
                                  </div>
                                  <h5 className="text-sm font-semibold text-gray-900 mb-1">{note.subject}</h5>
                                  <p className="text-sm text-gray-600 mb-2">{note.content}</p>

                                  {note.hasAction && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-2">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-yellow-700">
                                          <strong>Action:</strong> Assignée à {note.assignedTo}
                                        </span>
                                        <span className="text-yellow-700">
                                          <strong>Échéance:</strong> {note.actionDueDate}
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between text-xs text-gray-500">
                                    <div className="flex items-center space-x-3">
                                      <span>{note.author}</span>
                                      <span>{note.date}</span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                      {note.replies > 0 && (
                                        <button className="flex items-center text-blue-600 hover:text-blue-800">
                                          <FileText className="w-3 h-3 mr-1" />
                                          {note.replies} réponse{note.replies > 1 ? 's' : ''}
                                        </button>
                                      )}
                                      <button className="text-gray-600 hover:text-gray-800">
                                        <Edit className="w-3 h-3" />
                                      </button>
                                      <button className="text-red-600 hover:text-red-800">
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Load More */}
                      <div className="text-center">
                        <button className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
                          Charger plus de notes...
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Wifi className="w-4 h-4" />
                    <span>Services intégrés actifs</span>
                  </div>
                  {capitationData && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Capitation connecté
                    </span>
                  )}
                  {wiseFMData && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      WiseFM connecté
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <ElegantButton variant="outline" onClick={() => setShowNewAssetModal(false)}>
                    Annuler
                  </ElegantButton>
                  <ElegantButton variant="primary" onClick={handleSaveAsset}>
                    Créer l'actif
                  </ElegantButton>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Asset Master Data Modal */}
        {showEditAssetModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Asset Master Data - Modifier l'Actif</h2>
                  <button
                    onClick={() => setShowEditAssetModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Same structure as new asset modal but with pre-filled data */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 p-6">
                <div className="flex items-start space-x-6">
                  <div className="flex-shrink-0">
                    <div className="w-32 h-32 bg-white border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center group hover:border-blue-400 transition-colors cursor-pointer">
                      <div className="text-center">
                        <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2 group-hover:text-blue-500" />
                        <p className="text-xs text-gray-500 group-hover:text-blue-600">Modifier photo</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="grid grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Asset Number</label>
                        <p className="text-sm font-semibold text-blue-600 mt-0.5">
                          {assetToEdit?.asset_number}
                        </p>
                      </div>
                      <div className="lg:col-span-3">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</label>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">
                          {assetToEdit?.description}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
                        <p className="text-sm font-semibold text-green-700">En service</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <div className="bg-white border border-gray-300 rounded-lg p-3 text-center shadow-sm">
                      <div className="w-16 h-16 bg-gray-100 border border-gray-200 rounded flex items-center justify-center mx-auto mb-2">
                        <QrCode className="w-8 h-8 text-gray-600" />
                      </div>
                      <p className="text-xs font-medium text-gray-700">QR Code</p>
                      <p className="text-xs text-gray-500 mt-1">{assetToEdit?.asset_number}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex h-[60vh]">
                <div className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto">
                  <nav className="p-4 space-y-2">
                    {[
                      { id: 'general', label: 'Information générale', icon: Info },
                      { id: 'acquisition', label: 'Informations acquisition', icon: DollarSign },
                      { id: 'immobilisation', label: 'Immobilisation', icon: Building },
                      { id: 'vente', label: 'Vente', icon: TrendingUp }
                    ].map((section) => {
                      const IconComponent = section.icon;
                      return (
                        <button
                          key={section.id}
                          onClick={() => setActiveFormTab(section.id)}
                          className={`w-full flex items-center px-3 py-2 text-left rounded-lg transition-colors ${
                            activeFormTab === section.id
                              ? 'bg-blue-100 text-blue-700 font-medium'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <IconComponent className="w-4 h-4 mr-3" />
                          <span className="text-sm">{section.label}</span>
                        </button>
                      );
                    })}
                  </nav>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {activeFormTab === 'general' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-1">Description *</label>
                        <input
                          type="text"
                          value={newAssetForm.description}
                          onChange={(e) => setNewAssetForm({...newAssetForm, description: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Location</label>
                        <input
                          type="text"
                          value={newAssetForm.location}
                          onChange={(e) => setNewAssetForm({...newAssetForm, location: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Notes</label>
                        <textarea
                          value={newAssetForm.notes}
                          onChange={(e) => setNewAssetForm({...newAssetForm, notes: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          rows={3}
                        />
                      </div>
                    </div>
                  )}

                  {activeFormTab !== 'general' && (
                    <div className="text-center py-8 text-gray-500">
                      Contenu de l'onglet {activeFormTab} à implémenter
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end items-center space-x-3 p-6 border-t border-gray-200 bg-gray-50">
                <ElegantButton variant="outline" onClick={() => setShowEditAssetModal(false)}>
                  Annuler
                </ElegantButton>
                <ElegantButton variant="primary" onClick={handleSaveAsset}>
                  Sauvegarder
                </ElegantButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default AssetsRegistry;