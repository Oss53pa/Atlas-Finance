import React, { useState, useMemo } from 'react'; // Palette Atlas Finance appliquée
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { db } from '../../lib/db';
import AssetForm from '../../components/assets/AssetForm';
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
  MoreVertical,
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
import { useLanguage } from '../../contexts/LanguageContext';

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
  const { t } = useLanguage();
  const [activeMainTab, setActiveMainTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterCondition, setFilterCondition] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [assetModal, setAssetModal] = useState<AssetModal>({ isOpen: false, mode: 'view' });
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // États pour les modales Asset Master Data
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
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
    responsible: '',

    // Material Data fields
    material_data: '',
    additional_identifier: '',
    shipping_type: '',
    batch_numbers: '',
    managed_by: '',
    disposal_method: '',

    // Warranty fields
    warranty_period: '',
    warranty_unit: 'months',
    warranty_terms: '',
    warranty_start: '',
    warranty_provider: '',

    // Insurance fields
    insurance_provider: '',
    policy_details: '',
    coverage_amount: '',
    insurance_expiration: '',
    policy_type: '',

    // Location fields
    building_name: '',
    floor: '',
    zoning: '',
    unit: '',
    room: '',
    gps_latitude: '',
    gps_longitude: '',
    location_address: '',

    // Other fields
    vendor_name: '',
    vendor_contact: '',
    document_number: '',
    purchase_order_number: ''
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

  // Charger les immobilisations depuis Dexie
  const { data: mockAssets = [] } = useQuery<Asset[]>({
    queryKey: ['assets-registry'],
    queryFn: async () => {
      const dbAssets = await db.assets.toArray();
      return dbAssets.map((a): Asset => ({
        id: a.id,
        asset_number: a.code,
        description: a.name,
        asset_class: a.accountCode ? `${a.accountCode.substring(0, 2)} - immobilisation` : '',
        asset_category: a.category,
        asset_identification: `ID-${a.code}`,
        uom_group: 'Unité',
        capital_appropriation_number: '',
        location: '',
        technician: '',
        employee: '',
        capitalization_date: a.acquisitionDate,
        acquisition_date: a.acquisitionDate,
        warranty_end: '',
        last_inventory: '',
        acquisition_cost: a.acquisitionValue,
        historical_apc: 0,
        net_book_value: a.acquisitionValue - a.residualValue,
        historical_nbc: a.acquisitionValue - a.residualValue,
        ordinary_depreciation: a.usefulLifeYears > 0 ? Math.round(a.acquisitionValue / a.usefulLifeYears) : 0,
        unplanned_depreciation: 0,
        special_depreciation: 0,
        write_up: 0,
        salvage_value: a.residualValue,
        asset_group: a.category.toUpperCase(),
        depreciation_group: `DEP-${a.category.substring(0, 3).toUpperCase()}`,
        depreciation_method: a.depreciationMethod === 'linear' ? 'Linéaire' : 'Dégressif',
        depreciation_rate: a.usefulLifeYears > 0 ? Math.round(10000 / a.usefulLifeYears) / 100 : 0,
        serial_number: a.code,
        quantity: 1,
        status: a.status === 'active' ? 'en_service' : a.status === 'disposed' ? 'disposed' : 'inactive',
        supplier: '',
        department: '',
        notes: '',
        code: a.code,
        designation: a.name,
        category: a.category,
        subcategory: '',
        acquisition_value: a.acquisitionValue,
        current_value: a.acquisitionValue - a.residualValue,
        cumulated_depreciation: a.residualValue,
        net_value: a.acquisitionValue - a.residualValue,
        responsible: ''
      }));
    }
  });

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
      responsible: '',

      // Material Data fields
      material_data: '',
      additional_identifier: '',
      shipping_type: '',
      batch_numbers: '',
      managed_by: '',
      disposal_method: '',

      // Warranty fields
      warranty_period: '',
      warranty_unit: 'months',
      warranty_terms: '',
      warranty_start: '',
      warranty_provider: '',

      // Insurance fields
      insurance_provider: '',
      policy_details: '',
      coverage_amount: '',
      insurance_expiration: '',
      policy_type: '',

      // Location fields
      building_name: '',
      floor: '',
      zoning: '',
      unit: '',
      room: '',
      gps_latitude: '',
      gps_longitude: '',
      location_address: '',

      // Other fields
      vendor_name: '',
      vendor_contact: '',
      document_number: '',
      purchase_order_number: ''
    });

    // Charger automatiquement les données intégrées
    fetchCapitationData();
    fetchWiseFMData();

    // S'assurer que les onglets sont correctement initialisés
    setActiveFormTab('general');
    setActiveGeneralTab('basic');

    // Forcer une re-render en utilisant setTimeout si nécessaire
    setTimeout(() => {
      setModalMode('create');
      setAssetToEdit(null);
      setShowAssetModal(true);
    }, 0);
  };

  const handleQrCode = (asset: Asset) => {
    // Générer ou afficher le QR Code
    toast(`QR Code pour l'actif: ${asset.asset_number}`);
    // TODO: Implémenter la génération de QR Code
  };

  const handleDuplicate = (asset: Asset) => {
    // Dupliquer l'actif
    const duplicatedAsset = { ...asset, asset_number: `${asset.asset_number}_COPY` };
    handleEditAssetModal(duplicatedAsset);
  };

  const handleDelete = (asset: Asset) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'actif ${asset.asset_number}?`)) {
      // TODO: Implémenter la suppression
      toast.success(`Actif ${asset.asset_number} supprimé`);
    }
  };

  const handleExport = (asset: Asset) => {
    // Exporter les données de l'actif
    toast.success(`Export des données de l'actif ${asset.asset_number}`);
    // TODO: Implémenter l'export
  };

  const handleEditAssetModal = (asset: Asset) => {
    setAssetToEdit(asset);
    setNewAssetForm(prev => ({
      ...prev,
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
    }));
    setActiveFormTab('general');
    setActiveGeneralTab('basic');
    setModalMode('edit');
    setShowAssetModal(true);
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
      setShowAssetModal(false);
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
      setShowAssetModal(false);
    }
  };

  // Calculer les catégories dynamiquement depuis les immobilisations chargées
  const mockCategories: AssetCategory[] = useMemo(() => {
    const catMap: Record<string, { count: number; totalValue: number; totalAge: number; totalRate: number }> = {};
    const now = new Date();
    for (const asset of mockAssets) {
      const cat = asset.category || 'Autre';
      if (!catMap[cat]) catMap[cat] = { count: 0, totalValue: 0, totalAge: 0, totalRate: 0 };
      catMap[cat].count++;
      catMap[cat].totalValue += asset.acquisition_cost || 0;
      const acqDate = new Date(asset.acquisition_date || now);
      catMap[cat].totalAge += (now.getTime() - acqDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      catMap[cat].totalRate += asset.depreciation_rate || 0;
    }
    return Object.entries(catMap).map(([name, data]) => ({
      code: name.toLowerCase().replace(/\s+/g, '_'),
      name,
      count: data.count,
      totalValue: data.totalValue,
      averageAge: data.count > 0 ? Math.round((data.totalAge / data.count) * 10) / 10 : 0,
      depreciationRate: data.count > 0 ? Math.round((data.totalRate / data.count) * 100) / 10000 : 0,
    }));
  }, [mockAssets]);

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
      case 'active':
      case 'en_service': return 'text-green-600 bg-green-50';
      case 'inactive': return 'text-gray-600 bg-gray-50';
      case 'maintenance': return 'text-yellow-600 bg-yellow-50';
      case 'disposed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'text-green-600 bg-green-50';
      case 'good': return 'text-[#6A8A82] bg-[#6A8A82]/10';
      case 'fair': return 'text-yellow-600 bg-yellow-50';
      case 'poor': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const categoryLabels: Record<string, string> = {
    materiel_informatique: 'Matériel IT',
    vehicules: 'Véhicules',
    mobilier: 'Mobilier',
    equipements: 'Équipements',
    immobilier: 'Immobilier',
    outillage: 'Outillage'
  };

  const statusLabels: Record<Asset['status'], string> = {
    active: 'Actif',
    en_service: 'En service',
    inactive: 'Inactif',
    maintenance: 'Maintenance',
    disposed: 'Cédé'
  };

  const conditionLabels: Record<string, string> = {
    excellent: 'Excellent',
    good: 'Bon',
    fair: 'Correct',
    poor: 'Mauvais'
  };

  const uniqueLocations = [...new Set(mockAssets.map(a => a.location.split(' - ')[0]))];

  const chartData = mockCategories.map(cat => ({
    label: cat.name.replace(' ', '\n'),
    value: cat.totalValue / 1000,
    color: cat.code === 'materiel_informatique' ? 'bg-[#6A8A82]' :
           cat.code === 'vehicules' ? 'bg-green-500' :
           cat.code === 'mobilier' ? 'bg-[#B87333]' :
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
                    <div className="w-3 h-3 rounded-full bg-[#6A8A82]"></div>
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
                  viewMode === 'table' ? 'bg-[#6A8A82]/20 text-[#6A8A82]' : 'text-neutral-400 hover:text-neutral-600'
                }`}
              >
                <BarChart3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-[#6A8A82]/20 text-[#6A8A82]' : 'text-neutral-400 hover:text-neutral-600'
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
                          <div className="p-2 bg-[#6A8A82]/50 rounded-lg">
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
                            onClick={() => {
                              setAssetToEdit(asset);
                              setModalMode('edit');
                              setShowAssetModal(true);
                            }}
                            className="p-2 text-neutral-400 hover:text-[#6A8A82] transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditAssetModal(asset)}
                            className="p-2 text-neutral-400 hover:text-green-600 transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleQrCode(asset)}
                            className="p-2 text-neutral-400 hover:text-purple-600 transition-colors"
                            title="Afficher QR Code"
                          >
                            <QrCode className="h-4 w-4" />
                          </button>
                          <div className="relative">
                            <button
                              onClick={() => setActiveDropdown(activeDropdown === asset.id ? null : asset.id)}
                              className="p-2 text-neutral-400 hover:text-gray-600 transition-colors"
                              title="Plus d'actions"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            {activeDropdown === asset.id && (
                              <div className="absolute right-0 top-8 z-50 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                                <button
                                  onClick={() => {
                                    handleDuplicate(asset);
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Copy className="h-4 w-4" />
                                  Dupliquer
                                </button>
                                <button
                                  onClick={() => {
                                    toast.success(`Archiver l'actif: ${asset.asset_number}`);
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Archive className="h-4 w-4" />
                                  Archiver
                                </button>
                                <button
                                  onClick={() => {
                                    toast(`Imprimer l'étiquette: ${asset.asset_number}`);
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Tag className="h-4 w-4" />
                                  Imprimer étiquette
                                </button>
                                <button
                                  onClick={() => {
                                    toast(`Historique de l'actif: ${asset.asset_number}`);
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <History className="h-4 w-4" />
                                  Voir l'historique
                                </button>
                                <hr className="my-1" />
                                <button
                                  onClick={() => {
                                    if (confirm(`Voulez-vous vraiment supprimer l'actif ${asset.asset_number} ?`)) {
                                      toast.success(`Supprimer l'actif: ${asset.asset_number}`);
                                    }
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Supprimer
                                </button>
                              </div>
                            )}
                          </div>
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
                        <div className="p-2 bg-[#6A8A82]/50 rounded-lg">
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
                            onClick={() => {
                              setAssetToEdit(asset);
                              setModalMode('edit');
                              setShowAssetModal(true);
                            }}
                            className="p-2 text-neutral-400 hover:text-[#6A8A82] transition-colors"
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
                <span className="text-lg font-bold text-[#6A8A82]">{selectedAssets.length}</span>
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
            <button className="p-4 border border-neutral-200 rounded-lg hover:border-[#6A8A82]/30 hover:bg-[#6A8A82]/50 transition-colors text-left">
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <span className="font-medium text-neutral-800">Validation annuelle</span>
              </div>
              <p className="text-sm text-neutral-500">Marquer comme vérifié pour inventaire annuel</p>
            </button>

            <button className="p-4 border border-neutral-200 rounded-lg hover:border-[#6A8A82]/30 hover:bg-[#6A8A82]/50 transition-colors text-left">
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Wrench className="h-4 w-4 text-orange-600" />
                </div>
                <span className="font-medium text-neutral-800">Maintenance planifiée</span>
              </div>
              <p className="text-sm text-neutral-500">Planifier maintenance préventive</p>
            </button>

            <button className="p-4 border border-neutral-200 rounded-lg hover:border-[#6A8A82]/30 hover:bg-[#6A8A82]/50 transition-colors text-left">
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-[#6A8A82]/20 rounded-lg">
                  <RotateCcw className="h-4 w-4 text-[#6A8A82]" />
                </div>
                <span className="font-medium text-neutral-800">Réaffectation</span>
              </div>
              <p className="text-sm text-neutral-500">Changer département/employé</p>
            </button>

            <button className="p-4 border border-neutral-200 rounded-lg hover:border-[#6A8A82]/30 hover:bg-[#6A8A82]/50 transition-colors text-left">
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
                color: 'bg-[#6A8A82]'
              },
              {
                id: 3,
                action: 'Transfert',
                description: 'Transfert de Amadou Diallo vers Mohamed Kane',
                user: 'Admin System',
                date: '2024-01-13 09:15',
                asset: 'ARIC TRAVAUX D\'ASSAINISSEMENT (#235377)',
                icon: User,
                color: 'bg-[#B87333]'
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
                <span className="text-sm text-neutral-600">{t('common.today')}</span>
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
                <span className="text-sm font-semibold text-[#6A8A82]">45%</span>
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
                  <div className="w-6 h-6 bg-[#6A8A82] rounded-full flex items-center justify-center">
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
                  <div className="w-6 h-6 bg-[#B87333] rounded-full flex items-center justify-center">
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
                        ? 'border-[#6A8A82] text-[#6A8A82]'
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
                  <h3 className="text-lg font-semibold text-neutral-800">
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

        {/* Asset Form Modal - Reusable Component */}
        <AssetForm
          isOpen={showAssetModal}
          onClose={() => {
            setShowAssetModal(false);
            setAssetToEdit(null);
          }}
          onSubmit={handleSaveAsset}
          mode={modalMode}
          initialData={assetToEdit || undefined}
        />
      </div>
    </PageContainer>
  );
};

export default AssetsRegistry;
