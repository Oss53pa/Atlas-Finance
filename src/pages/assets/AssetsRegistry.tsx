
import React, { useState, useMemo } from 'react'; // Palette Atlas FnA appliquée
import PageHeaderActions from '../../components/ui/PageHeaderActions';
import type { DBAsset } from '../../lib/db';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
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
import { Money } from '@/utils/money';
import { safeAddEntry } from '../../services/entryGuard';
import { AssetClassificationService } from '../../data/assetClassification';

/** Traduit le statut du formulaire vers l'enum contraint de la table assets. */
function mapAssetStatus(formStatus?: string | null): 'active' | 'disposed' | 'scrapped' {
  switch (String(formStatus || '').trim()) {
    case 'cede': case 'cédé': case 'disposed': return 'disposed';
    case 'reforme': case 'réformé': case 'rebut': case 'hors_service': case 'scrapped': return 'scrapped';
    default: return 'active'; // en_service, maintenance, en_attente… restent au bilan
  }
}

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
  const { adapter } = useData();
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
  const [rawAsset, setRawAsset] = useState<any>(null); // actif brut (toutes colonnes) pour préremplir le formulaire
  const queryClient = useQueryClient();
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
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch(`/api/capitation/${capitationId || 'current'}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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
      // Intégration Capitation non disponible — ne pas injecter de données fictives
      toast.error(t('assetsRegistry.capitationUnavailable'));
    }
  };

  const fetchWiseFMData = async (contractId?: string) => {
    try {
      // Simulation d'appel API vers WiseFM
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch(`/api/wisefm/contracts/${contractId || 'current'}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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
      // Intégration WiseFM non disponible — ne pas injecter de données fictives
      toast.error(t('assetsRegistry.wisefmUnavailable'));
    }
  };

  // Charger les immobilisations depuis Dexie
  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ['assets-registry'],
    queryFn: async () => {
      const dbAssets = await adapter.getAll<DBAsset>('assets');
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
        ordinary_depreciation: a.usefulLifeYears > 0 ? new Money(a.acquisitionValue).divide(a.usefulLifeYears).round(0).toNumber() : 0,
        unplanned_depreciation: 0,
        special_depreciation: 0,
        write_up: 0,
        salvage_value: a.residualValue,
        asset_group: a.category.toUpperCase(),
        depreciation_group: `DEP-${a.category.substring(0, 3).toUpperCase()}`,
        depreciation_method: a.depreciationMethod === 'linear' ? 'Linéaire' : 'Dégressif',
        depreciation_rate: a.usefulLifeYears > 0 ? new Money(100).divide(a.usefulLifeYears).round().toNumber() : 0,
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
        // VNC = brut − amortissements cumulés. `residualValue` vaut 0 en base ;
        // c'est `cumulDepreciation` qui porte l'amortissement cumulé réel.
        current_value: Math.max(0, (a.acquisitionValue || 0) - (a.cumulDepreciation || 0)),
        cumulated_depreciation: a.cumulDepreciation || 0,
        net_value: Math.max(0, (a.acquisitionValue || 0) - (a.cumulDepreciation || 0)),
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
    toast(t('assetsRegistry.qrCodeForAsset', { number: String(asset.asset_number) }));
    // TODO: Implémenter la génération de QR Code
  };

  const handleDuplicate = (asset: Asset) => {
    // Dupliquer l'actif
    const duplicatedAsset = { ...asset, asset_number: `${asset.asset_number}_COPY` };
    handleEditAssetModal(duplicatedAsset);
  };

  const handleDelete = async (asset: Asset) => {
    if (!confirm(t('assetsRegistry.confirmDelete', { number: String(asset.asset_number) }))) return;
    try {
      const raw = await adapter.getById<any>('assets', asset.id);
      if (!raw) throw new Error(t('assetsRegistry.assetNotFound'));
      if ((Number(raw.cumulDepreciation) || 0) > 0) throw new Error(t('assetsRegistry.depreciatedAssetError'));
      if (raw.status && raw.status !== 'active') throw new Error(t('assetsRegistry.alreadyDisposed'));
      const entries = await adapter.getAll<any>('journalEntries');
      if (entries.some(e => String(e.reference || '').includes(asset.id))) {
        throw new Error(t('assetsRegistry.linkedEntries'));
      }
      await adapter.delete('assets', asset.id);
      toast.success(t('assetsRegistry.assetDeleted', { number: String(asset.asset_number) }));
      await queryClient.invalidateQueries({ queryKey: ['assets-registry'] });
    } catch (e: any) {
      toast.error(t('assetsRegistry.deleteFailed') + (e?.message || t('assetsRegistry.genericError')));
    }
  };

  const handleExport = (asset: Asset) => {
    // Exporter les données de l'actif
    toast.success(t('assetsRegistry.exportAssetData', { number: String(asset.asset_number) }));
    // TODO: Implémenter l'export
  };

  const handleEditAssetModal = async (asset: Asset) => {
    setAssetToEdit(asset);
    // Charge l'actif BRUT (toutes les colonnes, y.c. champs étendus) pour préremplir.
    try { setRawAsset(await adapter.getById<any>('assets', asset.id)); } catch { setRawAsset(null); }
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

  // Persistance réelle de l'actif (création + édition) via l'adaptateur. Reçoit
  // le formData (snake_case) de AssetForm. Mappe vers les colonnes public.assets.
  const handleSaveAsset = async (formData: Record<string, string>) => {
    const num = (v?: string) => { const n = parseFloat(v ?? ''); return isNaN(n) ? null : n; };
    const txt = (v?: string) => { const s = (v ?? '').trim(); return s === '' ? null : s; };
    const status = mapAssetStatus(formData.status);
    // Comptes : ceux du formulaire (auto-remplis depuis la catégorie), sinon
    // dérivés du référentiel — jamais vides (sinon classe de bilan fausse).
    const resolved = AssetClassificationService.resolveAccounts(txt(formData.category) || txt(formData.asset_category) || '');
    const accountCode = txt(formData.account_code) || resolved.accountCode;
    const depAccountCode = txt(formData.depreciation_account) || resolved.depreciationAccountCode;
    const payload: Record<string, any> = {
      code: txt(formData.asset_number), name: txt(formData.description), category: txt(formData.category),
      sub_category: txt(formData.sub_category), account_code: accountCode,
      depreciation_account_code: depAccountCode,
      // Le formulaire utilise 'lineaire'/'degressif'/'non_amortissable' ; la table assets
      // contraint depreciation_method IN ('linear','declining') → traduire avant persistance.
      depreciation_method: formData.depreciation_method === 'degressif' ? 'declining' : 'linear',
      useful_life_years: num(formData.useful_life_years), acquisition_value: num(formData.acquisition_cost),
      residual_value: num(formData.residual_value) ?? 0, cumul_depreciation: num(formData.cumulative_depreciation) ?? 0,
      acquisition_date: txt(formData.acquisition_date), status,
      // Identification / matériel
      manufacturer: txt(formData.manufacturer), model: txt(formData.model), serial_number: txt(formData.serial_number),
      barcode: txt(formData.barcode), material_data: txt(formData.material_data), additional_identifier: txt(formData.additional_identifier),
      weight: txt(formData.weight), dimensions: txt(formData.dimensions), color: txt(formData.color), material_type: txt(formData.material_type),
      location: txt(formData.location), responsible_person: txt(formData.responsible_person), notes: txt(formData.notes),
      // Garantie
      warranty_period: num(formData.warranty_period), warranty_unit: txt(formData.warranty_unit), warranty_terms: txt(formData.warranty_terms),
      warranty_start: txt(formData.warranty_start), warranty_end: txt(formData.warranty_end), warranty_provider: txt(formData.warranty_provider), warranty_phone: txt(formData.warranty_phone),
      // Assurance
      insurance_provider: txt(formData.insurance_provider), insurance_policy_number: txt(formData.insurance_policy_number),
      insurance_coverage_amount: num(formData.insurance_coverage_amount), insurance_premium: num(formData.insurance_premium),
      insurance_expiration: txt(formData.insurance_expiration), policy_type: txt(formData.policy_type),
      // Emplacement
      building_name: txt(formData.building_name), floor: txt(formData.floor), room: txt(formData.room), department: txt(formData.department),
      gps_latitude: txt(formData.gps_latitude), gps_longitude: txt(formData.gps_longitude), location_address: txt(formData.location_address),
      // Acquisition (détail)
      acquisition_type: txt(formData.acquisition_type), supplier: txt(formData.supplier), invoice_number: txt(formData.invoice_number),
      invoice_date: txt(formData.invoice_date), purchase_order: txt(formData.purchase_order), delivery_date: txt(formData.delivery_date),
      commissioning_date: txt(formData.commissioning_date), date_mise_en_service: txt(formData.date_mise_en_service),
      acquisition_currency: txt(formData.acquisition_currency), transport_cost: num(formData.transport_cost),
      installation_cost: num(formData.installation_cost), other_costs: num(formData.other_costs),
      // Immobilisation (détail)
      dotation_account: txt(formData.dotation_account), depreciation_rate: num(formData.depreciation_rate),
      depreciation_start_date: txt(formData.depreciation_start_date), revaluation_date: txt(formData.revaluation_date),
      revaluation_amount: num(formData.revaluation_amount), impairment_amount: num(formData.impairment_amount), fiscal_regime: txt(formData.fiscal_regime),
    };
    try {
      if (assetToEdit) {
        await adapter.update('assets', assetToEdit.id, payload);
        toast.success(t('assetsRegistry.assetUpdated'));
      } else {
        // Unicité du code.
        const code = String(payload.code || '').trim();
        const existing = await adapter.getAll<any>('assets');
        if (code && existing.some(a => String(a.code || '').trim().toLowerCase() === code.toLowerCase())) {
          throw new Error(t('assetsRegistry.codeAlreadyExists', { code }));
        }
        const assetId = crypto.randomUUID();
        await adapter.create('assets', { id: assetId, ...payload });
        // Écriture d'ACQUISITION SYSCOHADA : Dr 2x / Cr 481 (fournisseurs d'inv.).
        const montant = Number(payload.acquisition_value) || 0;
        if (montant > 0 && accountCode) {
          await safeAddEntry(adapter, {
            id: crypto.randomUUID(),
            entryNumber: `IMMO-${code}`,
            journal: 'OD',
            date: String(payload.acquisition_date || new Date().toISOString().split('T')[0]),
            reference: `IMMO-ACQ-${assetId}`,
            label: `Acquisition immobilisation — ${String(payload.name || code)}`,
            status: 'validated',
            lines: [
              { id: crypto.randomUUID(), accountCode, accountName: String(payload.name || 'Immobilisation'), label: `Acquisition ${code}`, debit: montant, credit: 0 },
              { id: crypto.randomUUID(), accountCode: '481', accountName: "Fournisseurs d'investissements", label: `Dette acquisition ${code}`, debit: 0, credit: montant },
            ],
            createdAt: new Date().toISOString(),
            createdBy: 'system',
          } as any, { skipSyncValidation: true });
        }
        toast.success(t('assetsRegistry.assetCreated'));
      }
      await queryClient.invalidateQueries({ queryKey: ['assets-registry'] });
      await queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      setShowAssetModal(false); setAssetToEdit(null); setRawAsset(null);
    } catch (e: any) { toast.error(t('assetsRegistry.saveFailed') + (e?.message || t('assetsRegistry.genericError'))); }
  };

  // Calculer les catégories par CLASSE SYSCOHADA (le champ `category` vaut une
  // seule valeur en base → tout tombait dans « Autre »). On dérive la classe du
  // n° de compte (asset_class « 23 - … » → 23) et on l'étiquette officiellement.
  const assetCategories: AssetCategory[] = useMemo(() => {
    const CLASS_LABELS: Record<string, string> = {
      '20': 'Charges immobilisées', '21': 'Immobilisations incorporelles', '22': 'Terrains',
      '23': 'Bâtiments & installations', '24': 'Matériel, mobilier & transport',
      '25': 'Avances & acomptes', '26': 'Titres de participation', '27': 'Autres immo. financières',
    };
    const catMap: Record<string, { count: number; totalValue: number; totalAge: number; totalRate: number }> = {};
    const now = new Date();
    for (const asset of assets) {
      const code = (asset.asset_class || '').substring(0, 2) || '21';
      if (!catMap[code]) catMap[code] = { count: 0, totalValue: 0, totalAge: 0, totalRate: 0 };
      catMap[code].count++;
      catMap[code].totalValue += asset.current_value || asset.acquisition_cost || 0;
      const acqDate = new Date(asset.acquisition_date || now);
      catMap[code].totalAge += (now.getTime() - acqDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      catMap[code].totalRate += asset.depreciation_rate || 0;
    }
    return Object.entries(catMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([code, data]) => ({
        code,
        name: CLASS_LABELS[code] || t('assetsRegistry.classPrefix', { code }),
        count: data.count,
        totalValue: data.totalValue,
        averageAge: data.count > 0 ? new Money(data.totalAge).divide(data.count).round(1).toNumber() : 0,
        depreciationRate: data.count > 0 ? new Money(data.totalRate).divide(data.count).divide(100).round(4).toNumber() : 0,
      }));
  }, [assets, t]);

  // Filter assets based on search and filters
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchesSearch = asset.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          asset.asset_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          asset.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          asset.designation?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = filterCategory === 'all' || asset.category === filterCategory;
      const matchesStatus = filterStatus === 'all' || asset.status === filterStatus;
      const matchesLocation = filterLocation === 'all' || asset.location.includes(filterLocation);

      return matchesSearch && matchesCategory && matchesStatus && matchesLocation;
    });
  }, [searchTerm, filterCategory, filterStatus, filterLocation, assets]);

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
      case 'good': return 'text-[var(--color-primary)] bg-[var(--color-primary)]/10';
      case 'fair': return 'text-yellow-600 bg-yellow-50';
      case 'poor': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const categoryLabels: Record<string, string> = {
    materiel_informatique: t('assetsRegistry.catIt'),
    vehicules: t('assetsRegistry.catVehicles'),
    mobilier: t('assetsRegistry.catFurniture'),
    equipements: t('assetsRegistry.catEquipment'),
    immobilier: t('assetsRegistry.catRealEstate'),
    outillage: t('assetsRegistry.catTooling')
  };

  const statusLabels: Record<Asset['status'], string> = {
    active: t('assetsRegistry.statusActive'),
    en_service: t('assetsRegistry.statusInService'),
    inactive: t('assetsRegistry.statusInactive'),
    maintenance: t('assetsRegistry.statusMaintenance'),
    disposed: t('assetsRegistry.statusDisposed')
  };

  const conditionLabels: Record<string, string> = {
    excellent: t('assetsRegistry.condExcellent'),
    good: t('assetsRegistry.condGood'),
    fair: t('assetsRegistry.condFair'),
    poor: t('assetsRegistry.condPoor')
  };

  const uniqueLocations = [...new Set(assets.map(a => a.location.split(' - ')[0]))];

  const CHART_PALETTE = ['bg-[var(--color-primary)]', 'bg-green-500', 'bg-orange-500', 'bg-[var(--color-text-secondary)]', 'bg-red-500', 'bg-blue-500'];
  const chartData = [...assetCategories]
    .filter(c => c.totalValue > 0)
    .sort((a, b) => b.totalValue - a.totalValue)
    .map((cat, i) => ({
      label: cat.name,
      value: cat.totalValue,
      color: CHART_PALETTE[i % CHART_PALETTE.length],
    }));

  const conditionChartData = [
    { label: t('assetsRegistry.statusInService'), value: filteredAssets.filter(a => a.status === 'en_service').length, color: 'bg-green-500' },
    { label: t('assetsRegistry.statusMaintenance'), value: filteredAssets.filter(a => a.status === 'maintenance').length, color: 'bg-yellow-500' },
    { label: t('assetsRegistry.statusInactive'), value: filteredAssets.filter(a => a.status === 'inactive').length, color: 'bg-gray-500' },
    { label: t('assetsRegistry.statusDisposed'), value: filteredAssets.filter(a => a.status === 'disposed').length, color: 'bg-red-500' }
  ];

  // Tab definitions
  const mainTabs = [
    { id: 'overview', label: t('assetsRegistry.tabOverview'), icon: PieChart },
    { id: 'assets', label: t('assetsRegistry.tabAssetsList'), icon: List },
    { id: 'bulk', label: t('assetsRegistry.tabBulkActions'), icon: Settings },
    { id: 'history', label: t('assetsRegistry.tabHistory'), icon: History }
  ];

  // Content renderers for each tab
  const renderOverviewTab = () => (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title={t('assetsRegistry.kpiTotalAssets')}
          value={aggregatedData.totalAssets.toString()}
          subtitle={t('assetsRegistry.kpiActiveAssetsSub', { count: String(aggregatedData.activeAssets) })}
          icon={Package}
          color="primary"
          delay={0.1}
          withChart={true}
        />

        <KPICard
          title={t('assetsRegistry.kpiCurrentValue')}
          value={formatCurrency(aggregatedData.totalValue)}
          subtitle={t('assetsRegistry.kpiOfOriginalValue', { value: String(formatPercentage(1 - aggregatedData.depreciationRate)) })}
          icon={DollarSign}
          color="success"
          delay={0.2}
          withChart={true}
        />

        <KPICard
          title={t('assetsRegistry.kpiAssignedAssets')}
          value={aggregatedData.assignedAssets.toString()}
          subtitle={t('assetsRegistry.kpiAssignedSub', { value: String(formatPercentage(aggregatedData.assignedAssets / aggregatedData.totalAssets)) })}
          icon={User}
          color="neutral"
          delay={0.3}
          withChart={true}
        />

        <KPICard
          title={t('assetsRegistry.kpiExcellentCondition')}
          value={aggregatedData.excellentCondition.toString()}
          subtitle={t('assetsRegistry.kpiExcellentSub', { value: String(formatPercentage(aggregatedData.excellentCondition / aggregatedData.totalAssets)) })}
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
            title={t('assetsRegistry.chartValueByCategory')}
            subtitle={t('assetsRegistry.chartValueByCategorySub')}
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
            title={t('assetsRegistry.chartAssetsCondition')}
            subtitle={t('assetsRegistry.chartAssetsConditionSub')}
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
              <h3 className="text-lg font-semibold text-neutral-800">{t('assetsRegistry.topCategories')}</h3>
              <Target className="h-5 w-5 text-neutral-400" />
            </div>
            <div className="space-y-3">
              {assetCategories.slice(0, 5).map((category, index) => (
                <div key={category.code} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-[var(--color-primary)]"></div>
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
              <h3 className="text-lg font-semibold text-neutral-800">{t('assetsRegistry.keyIndicators')}</h3>
              <BarChart3 className="h-5 w-5 text-neutral-400" />
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600">{t('assetsRegistry.assignmentRate')}</span>
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
                  <span className="text-sm text-neutral-600">{t('assetsRegistry.depreciationRateLabel')}</span>
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
              <h3 className="text-lg font-semibold text-neutral-800">{t('assetsRegistry.quickActions')}</h3>
              <Activity className="h-5 w-5 text-neutral-400" />
            </div>
            <div className="space-y-3">
              <ElegantButton
                variant="outline"
                icon={Plus}
                className="w-full justify-start"
                onClick={handleOpenNewAssetModal}
              >
                {t('assetsRegistry.newAsset')}
              </ElegantButton>
              <ElegantButton variant="outline" icon={QrCode} className="w-full justify-start">
                {t('assetsRegistry.scanQrCode')}
              </ElegantButton>
              <ElegantButton variant="outline" icon={Download} className="w-full justify-start">
                {t('assetsRegistry.exportData')}
              </ElegantButton>
              <ElegantButton variant="outline" icon={RefreshCw} className="w-full justify-start">
                {t('assetsRegistry.synchronize')}
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
            <h3 className="text-lg font-semibold text-neutral-800">{t('assetsRegistry.filtersAndSearch')}</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'table' ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' : 'text-neutral-400 hover:text-neutral-600'
                }`}
              >
                <BarChart3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' : 'text-neutral-400 hover:text-neutral-600'
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
                placeholder={t('assetsRegistry.searchPlaceholder')}
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
              <option value="all">{t('assetsRegistry.allCategories')}</option>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{t('assetsRegistry.allStatuses')}</option>
              {Object.entries(statusLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{t('assetsRegistry.allLocations')}</option>
              {uniqueLocations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>

            <select
              value={filterCondition}
              onChange={(e) => setFilterCondition(e.target.value)}
              className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{t('assetsRegistry.allConditions')}</option>
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
              {t('assetsRegistry.assetsCount', { count: String(filteredAssets.length) })}
            </h3>
            {selectedAssets.length > 0 && (
              <div className="flex gap-2">
                <ElegantButton variant="outline" size="sm">
                  {t('assetsRegistry.bulkActionsCount', { count: String(selectedAssets.length) })}
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
                    <th className="text-left py-3 px-4 font-medium text-neutral-600">{t('assetsRegistry.colAsset')}</th>
                    <th className="text-left py-3 px-4 font-medium text-neutral-600">{t('assetsRegistry.colCategory')}</th>
                    <th className="text-right py-3 px-4 font-medium text-neutral-600">{t('assetsRegistry.colValue')}</th>
                    <th className="text-left py-3 px-4 font-medium text-neutral-600">{t('assetsRegistry.colLocation')}</th>
                    <th className="text-center py-3 px-4 font-medium text-neutral-600">{t('assetsRegistry.colStatus')}</th>
                    <th className="text-center py-3 px-4 font-medium text-neutral-600">{t('assetsRegistry.colCondition')}</th>
                    <th className="text-center py-3 px-4 font-medium text-neutral-600">{t('assetsRegistry.colActions')}</th>
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
                          <div className="p-2 bg-[var(--color-primary)]/50 rounded-lg">
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
                            {t('assetsRegistry.purchaseLabel', { value: String(formatCurrency(asset.acquisition_cost)) })}
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
                          {t('assetsRegistry.statusInService')}
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
                            className="p-2 text-neutral-400 hover:text-[var(--color-primary)] transition-colors"
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
                            className="p-2 text-neutral-400 hover:text-primary-600 transition-colors"
                            title={t('assetsRegistry.showQrCode')}
                          >
                            <QrCode className="h-4 w-4" />
                          </button>
                          <div className="relative">
                            <button
                              onClick={() => setActiveDropdown(activeDropdown === asset.id ? null : asset.id)}
                              className="p-2 text-neutral-400 hover:text-gray-600 transition-colors"
                              title={t('assetsRegistry.moreActions')}
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
                                  {t('assetsRegistry.duplicate')}
                                </button>
                                <button
                                  onClick={() => {
                                    toast.success(t('assetsRegistry.archiveAssetToast', { number: String(asset.asset_number) }));
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Archive className="h-4 w-4" />
                                  {t('assetsRegistry.archive')}
                                </button>
                                <button
                                  onClick={() => {
                                    toast(t('assetsRegistry.printLabelToast', { number: String(asset.asset_number) }));
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Tag className="h-4 w-4" />
                                  {t('assetsRegistry.printLabel')}
                                </button>
                                <button
                                  onClick={() => {
                                    toast(t('assetsRegistry.assetHistoryToast', { number: String(asset.asset_number) }));
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <History className="h-4 w-4" />
                                  {t('assetsRegistry.viewHistory')}
                                </button>
                                <hr className="my-1" />
                                <button
                                  onClick={() => {
                                    if (confirm(t('assetsRegistry.confirmDeleteAsset', { number: String(asset.asset_number) }))) {
                                      toast.success(t('assetsRegistry.deleteAssetToast', { number: String(asset.asset_number) }));
                                    }
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  {t('assetsRegistry.delete')}
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
                        <div className="p-2 bg-[var(--color-primary)]/50 rounded-lg">
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
                        <span className="text-sm text-neutral-500">{t('assetsRegistry.currentValueLabel')}</span>
                        <span className="font-semibold text-neutral-800">
                          {formatCurrency(asset.current_value)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-500">{t('assetsRegistry.locationLabel')}</span>
                        <span className="text-sm text-neutral-700">{asset.location.split(' - ')[0]}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-500">{t('assetsRegistry.conditionLabel')}</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full text-green-600 bg-green-50`}>
                          {t('assetsRegistry.statusInService')}
                        </span>
                      </div>
                      {asset.employee && (
                        <div className="flex justify-between">
                          <span className="text-sm text-neutral-500">{t('assetsRegistry.assignedToLabel')}</span>
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
                            className="p-2 text-neutral-400 hover:text-[var(--color-primary)] transition-colors"
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
              <h3 className="text-lg font-semibold text-neutral-800">{t('assetsRegistry.assetSelection')}</h3>
              <Users className="h-5 w-5 text-neutral-400" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-neutral-600">{t('assetsRegistry.selectedAssets')}</span>
                <span className="text-lg font-bold text-[var(--color-primary)]">{selectedAssets.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-neutral-600">{t('assetsRegistry.totalAvailable')}</span>
                <span className="text-sm font-semibold text-neutral-800">{filteredAssets.length}</span>
              </div>
              <div className="space-y-2">
                <ElegantButton variant="outline" size="sm" className="w-full">
                  {t('assetsRegistry.selectAll')}
                </ElegantButton>
                <ElegantButton variant="outline" size="sm" className="w-full">
                  {t('assetsRegistry.deselectAll')}
                </ElegantButton>
              </div>
            </div>
          </div>
        </UnifiedCard>

        <UnifiedCard variant="elevated" size="md">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-800">{t('assetsRegistry.importExport')}</h3>
              <Database className="h-5 w-5 text-neutral-400" />
            </div>
            <div className="space-y-3">
              <ElegantButton variant="outline" icon={Upload} className="w-full justify-start">
                {t('assetsRegistry.importFromExcel')}
              </ElegantButton>
              <ElegantButton variant="outline" icon={Download} className="w-full justify-start">
                {t('assetsRegistry.exportToExcel')}
              </ElegantButton>
              <ElegantButton variant="outline" icon={Import} className="w-full justify-start">
                {t('assetsRegistry.advancedImportExport')}
              </ElegantButton>
              <ElegantButton variant="outline" icon={Copy} className="w-full justify-start">
                {t('assetsRegistry.duplicateAssets')}
              </ElegantButton>
            </div>
          </div>
        </UnifiedCard>

        <UnifiedCard variant="elevated" size="md">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-800">{t('assetsRegistry.bulkActions')}</h3>
              <Settings className="h-5 w-5 text-neutral-400" />
            </div>
            <div className="space-y-3">
              <ElegantButton variant="outline" icon={Edit} className="w-full justify-start">
                {t('assetsRegistry.bulkEdit')}
              </ElegantButton>
              <ElegantButton variant="outline" icon={User} className="w-full justify-start">
                {t('assetsRegistry.reassign')}
              </ElegantButton>
              <ElegantButton variant="outline" icon={MapPin} className="w-full justify-start">
                {t('assetsRegistry.changeLocation')}
              </ElegantButton>
              <ElegantButton variant="outline" icon={Trash2} className="w-full justify-start text-red-600">
                {t('assetsRegistry.deleteSelection')}
              </ElegantButton>
            </div>
          </div>
        </UnifiedCard>
      </div>

      {/* Bulk Operations Form */}
      <UnifiedCard variant="elevated" size="lg">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-800">{t('assetsRegistry.bulkOperations')}</h3>
            <span className="text-sm text-neutral-500">
              {t('assetsRegistry.assetsSelectedCount', { count: String(selectedAssets.length) })}
            </span>
          </div>

          {selectedAssets.length > 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t('assetsRegistry.changeStatus')}
                  </label>
                  <select className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">{t('assetsRegistry.selectPlaceholder')}</option>
                    <option value="active">{t('assetsRegistry.statusActive')}</option>
                    <option value="inactive">{t('assetsRegistry.statusInactive')}</option>
                    <option value="maintenance">{t('assetsRegistry.statusMaintenance')}</option>
                    <option value="disposed">{t('assetsRegistry.statusDisposed')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t('assetsRegistry.newLocation')}
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder={t('assetsRegistry.newLocation')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t('assetsRegistry.assignTo')}
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder={t('assetsRegistry.employeeNamePlaceholder')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  {t('assetsRegistry.operationNotes')}
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder={t('assetsRegistry.bulkNotesPlaceholder')}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <ElegantButton variant="outline">
                  {t('assetsRegistry.cancel')}
                </ElegantButton>
                <ElegantButton variant="primary">
                  {t('assetsRegistry.applyChanges')}
                </ElegantButton>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Settings className="mx-auto h-12 w-12 text-neutral-400" />
              <h3 className="mt-4 text-lg font-medium text-neutral-900">{t('assetsRegistry.noAssetSelected')}</h3>
              <p className="mt-2 text-sm text-neutral-500">
                {t('assetsRegistry.noAssetSelectedHint')}
              </p>
              <div className="mt-6">
                <ElegantButton variant="outline" onClick={() => setActiveMainTab('assets')}>
                  {t('assetsRegistry.goToAssetsList')}
                </ElegantButton>
              </div>
            </div>
          )}
        </div>
      </UnifiedCard>

      {/* Quick Templates */}
      <UnifiedCard variant="elevated" size="md">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-neutral-800">{t('assetsRegistry.quickActionTemplates')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="p-4 border border-neutral-200 rounded-lg hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/50 transition-colors text-left">
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <span className="font-medium text-neutral-800">{t('assetsRegistry.annualValidation')}</span>
              </div>
              <p className="text-sm text-neutral-500">{t('assetsRegistry.annualValidationDesc')}</p>
            </button>

            <button className="p-4 border border-neutral-200 rounded-lg hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/50 transition-colors text-left">
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Wrench className="h-4 w-4 text-orange-600" />
                </div>
                <span className="font-medium text-neutral-800">{t('assetsRegistry.plannedMaintenance')}</span>
              </div>
              <p className="text-sm text-neutral-500">{t('assetsRegistry.plannedMaintenanceDesc')}</p>
            </button>

            <button className="p-4 border border-neutral-200 rounded-lg hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/50 transition-colors text-left">
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-[var(--color-primary)]/20 rounded-lg">
                  <RotateCcw className="h-4 w-4 text-[var(--color-primary)]" />
                </div>
                <span className="font-medium text-neutral-800">{t('assetsRegistry.reassignment')}</span>
              </div>
              <p className="text-sm text-neutral-500">{t('assetsRegistry.reassignmentDesc')}</p>
            </button>

            <button className="p-4 border border-neutral-200 rounded-lg hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/50 transition-colors text-left">
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Archive className="h-4 w-4 text-red-600" />
                </div>
                <span className="font-medium text-neutral-800">{t('assetsRegistry.scrapping')}</span>
              </div>
              <p className="text-sm text-neutral-500">{t('assetsRegistry.scrappingDesc')}</p>
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
          <h3 className="text-lg font-semibold text-neutral-800">{t('assetsRegistry.historyFilters')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">{t('assetsRegistry.startDate')}</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">{t('assetsRegistry.endDate')}</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">{t('assetsRegistry.actionType')}</label>
              <select className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="">{t('assetsRegistry.allActions')}</option>
                <option value="create">{t('assetsRegistry.actionCreate')}</option>
                <option value="update">{t('assetsRegistry.actionUpdate')}</option>
                <option value="transfer">{t('assetsRegistry.actionTransfer')}</option>
                <option value="maintenance">{t('assetsRegistry.statusMaintenance')}</option>
                <option value="dispose">{t('assetsRegistry.scrapping')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">{t('assetsRegistry.user')}</label>
              <input
                type="text"
                placeholder={t('assetsRegistry.usernamePlaceholder')}
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
            <h3 className="text-lg font-semibold text-neutral-800">{t('assetsRegistry.activityHistory')}</h3>
            <ElegantButton variant="outline" icon={Download} size="sm">
              {t('assetsRegistry.exportHistory')}
            </ElegantButton>
          </div>

          <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-10 w-10 mb-3 text-neutral-300" />
              <p className="text-sm font-medium text-neutral-500">{t('assetsRegistry.noHistory')}</p>
              <p className="text-xs mt-1 text-neutral-400">{t('assetsRegistry.noHistoryHint')}</p>
          </div>
        </div>
      </UnifiedCard>

      {/* History Statistics — données réelles uniquement */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <UnifiedCard variant="elevated" size="md">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-800">{t('assetsRegistry.recentActivities')}</h3>
              <Activity className="h-5 w-5 text-neutral-400" />
            </div>
            <div className="flex flex-col items-center justify-center py-6 text-neutral-400">
              <Activity className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-xs text-neutral-400">{t('assetsRegistry.noDataAvailable')}</p>
            </div>
          </div>
        </UnifiedCard>

        <UnifiedCard variant="elevated" size="md">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-800">{t('assetsRegistry.mostFrequentActions')}</h3>
              <BarChart3 className="h-5 w-5 text-neutral-400" />
            </div>
            <div className="flex flex-col items-center justify-center py-6 text-neutral-400">
              <BarChart3 className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-xs text-neutral-400">{t('assetsRegistry.noDataAvailable')}</p>
            </div>
          </div>
        </UnifiedCard>

        <UnifiedCard variant="elevated" size="md">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-800">{t('assetsRegistry.activeUsers')}</h3>
              <Users className="h-5 w-5 text-neutral-400" />
            </div>
            <div className="flex flex-col items-center justify-center py-6 text-neutral-400">
              <Users className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-xs text-neutral-400">{t('assetsRegistry.noDataAvailable')}</p>
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
          title={t('assetsRegistry.title')}
          subtitle={t('assetsRegistry.subtitle')}
          icon={Package}
          action={
            <div className="flex gap-3">
              <PageHeaderActions />
              <ElegantButton variant="outline" icon={QrCode}>
                {t('assetsRegistry.scanQr')}
              </ElegantButton>
              <ElegantButton variant="outline" icon={Download}>
                {t('assetsRegistry.export')}
              </ElegantButton>
              <ElegantButton
                variant="primary"
                icon={Plus}
                onClick={handleOpenNewAssetModal}
              >
                {t('assetsRegistry.newAsset')}
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
                        ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
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
                    {assetModal.mode === 'create' ? t('assetsRegistry.newAsset') :
                     assetModal.mode === 'edit' ? t('assetsRegistry.editAsset') : t('assetsRegistry.assetDetails')}
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
                            {t('assetsRegistry.assetDescription')}
                          </label>
                          <p className="text-neutral-800 font-semibold">{assetModal.asset.description}</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            {t('assetsRegistry.inventoryNumber')}
                          </label>
                          <p className="text-neutral-800 font-mono">{assetModal.asset.asset_number}</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            {t('assetsRegistry.colCategory')}
                          </label>
                          <div className="flex items-center space-x-2">
                            {getCategoryIcon(assetModal.asset.category)}
                            <span className="text-neutral-800">{categoryLabels[assetModal.asset.category] || assetModal.asset.category}</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            {t('assetsRegistry.assetClass')}
                          </label>
                          <p className="text-neutral-800">
                            {assetModal.asset.asset_class}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            {t('assetsRegistry.serialNumber')}
                          </label>
                          <p className="text-neutral-800 font-mono">{assetModal.asset.serial_number}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            {t('assetsRegistry.acquisitionValue')}
                          </label>
                          <p className="text-neutral-800 font-bold text-lg">
                            {formatCurrency(assetModal.asset.acquisition_cost)}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            {t('assetsRegistry.kpiCurrentValue')}
                          </label>
                          <p className="text-neutral-800 font-semibold">
                            {formatCurrency(assetModal.asset.current_value)}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            {t('assetsRegistry.accumulatedDepreciation')}
                          </label>
                          <p className="text-red-600 font-medium">
                            -{formatCurrency(assetModal.asset.cumulated_depreciation)}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            {t('assetsRegistry.acquisitionDate')}
                          </label>
                          <p className="text-neutral-800">{formatDate(assetModal.asset.acquisition_date)}</p>
                        </div>

                        <div className="flex space-x-4">
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              {t('assetsRegistry.colStatus')}
                            </label>
                            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(assetModal.asset.status)}`}>
                              {statusLabels[assetModal.asset.status]}
                            </span>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              {t('assetsRegistry.colCondition')}
                            </label>
                            <span className={`px-3 py-1 text-sm font-medium rounded-full text-green-600 bg-green-50`}>
                              {t('assetsRegistry.statusInService')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          {t('assetsRegistry.colLocation')}
                        </label>
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-neutral-400" />
                          <span className="text-neutral-800">{assetModal.asset.location}</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          {t('assetsRegistry.department')}
                        </label>
                        <p className="text-neutral-800">{assetModal.asset.department}</p>
                      </div>

                      {assetModal.asset.employee && (
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            {t('assetsRegistry.assignedTo')}
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
                            {t('assetsRegistry.notes')}
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
                    {assetModal.mode === 'view' ? t('assetsRegistry.close') : t('assetsRegistry.cancel')}
                  </ElegantButton>
                  {assetModal.mode !== 'view' && (
                    <ElegantButton variant="primary">
                      {assetModal.mode === 'create' ? t('assetsRegistry.create') : t('assetsRegistry.save')}
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
          // Mapper le bien (camelCase adaptateur) vers les clés attendues par AssetForm
          // (snake_case) — l'objet brut ne matchait AUCUN champ → formulaire vide alors
          // que les données existent (date/valeur d'acquisition, durée, amortissements…).
          initialData={assetToEdit ? (() => {
            const a: any = rawAsset || {};
            const brut = Number(a.acquisition_value ?? 0);
            const cumul = Number(a.cumul_depreciation ?? 0);
            const vnc = Math.max(0, brut - cumul);
            const s = (v: any) => (v === null || v === undefined ? '' : String(v));
            // Préremplissage depuis l'actif BRUT (toutes colonnes). Les champs
            // étendus (assurance/garantie/matériel/emplacement) sont vides tant
            // qu'ils n'ont pas été saisis — désormais persistants.
            return {
              description: s(a.name), asset_number: s(a.code), category: s(a.category), sub_category: s(a.sub_category),
              asset_class: s(a.account_code).substring(0, 2),
              acquisition_cost: s(brut || ''), current_value: s(vnc || ''),
              residual_value: s(a.residual_value ?? 0),
              acquisition_date: s(a.acquisition_date),
              date_mise_en_service: s(a.date_mise_en_service ?? a.acquisition_date),
              commissioning_date: s(a.commissioning_date ?? a.acquisition_date),
              account_code: s(a.account_code), depreciation_account: s(a.depreciation_account_code),
              depreciation_method: a.depreciation_method === 'linear' ? 'lineaire'
                : a.depreciation_method === 'declining' ? 'degressif'
                : s(a.depreciation_method || 'lineaire'),
              useful_life_years: s(a.useful_life_years || ''),
              cumulative_depreciation: s(cumul || 0), net_book_value: s(vnc || 0),
              status: a.status === 'active' ? 'en_service' : s(a.status ?? 'en_service'),
              // Identification / matériel
              manufacturer: s(a.manufacturer), model: s(a.model), serial_number: s(a.serial_number), barcode: s(a.barcode),
              material_data: s(a.material_data), additional_identifier: s(a.additional_identifier), weight: s(a.weight),
              dimensions: s(a.dimensions), color: s(a.color), material_type: s(a.material_type),
              location: s(a.location), responsible_person: s(a.responsible_person), notes: s(a.notes),
              // Garantie
              warranty_period: s(a.warranty_period), warranty_unit: s(a.warranty_unit || 'months'), warranty_terms: s(a.warranty_terms),
              warranty_start: s(a.warranty_start), warranty_end: s(a.warranty_end), warranty_provider: s(a.warranty_provider), warranty_phone: s(a.warranty_phone),
              // Assurance
              insurance_provider: s(a.insurance_provider), insurance_policy_number: s(a.insurance_policy_number),
              insurance_coverage_amount: s(a.insurance_coverage_amount ?? ''), insurance_premium: s(a.insurance_premium ?? ''),
              insurance_expiration: s(a.insurance_expiration), policy_type: s(a.policy_type),
              // Emplacement
              building_name: s(a.building_name), floor: s(a.floor), room: s(a.room), department: s(a.department),
              gps_latitude: s(a.gps_latitude), gps_longitude: s(a.gps_longitude), location_address: s(a.location_address),
              // Acquisition (détail)
              acquisition_type: s(a.acquisition_type || 'achat'), supplier: s(a.supplier), invoice_number: s(a.invoice_number),
              invoice_date: s(a.invoice_date), purchase_order: s(a.purchase_order), delivery_date: s(a.delivery_date),
              acquisition_currency: s(a.acquisition_currency || 'XAF'), transport_cost: s(a.transport_cost ?? ''),
              installation_cost: s(a.installation_cost ?? ''), other_costs: s(a.other_costs ?? ''),
              // Immobilisation (détail)
              dotation_account: s(a.dotation_account), depreciation_rate: s(a.depreciation_rate ?? ''),
              depreciation_start_date: s(a.depreciation_start_date), revaluation_date: s(a.revaluation_date),
              revaluation_amount: s(a.revaluation_amount ?? ''), impairment_amount: s(a.impairment_amount ?? ''),
              fiscal_regime: s(a.fiscal_regime || 'normal'),
            } as Record<string, string>;
          })() : undefined}
        />
      </div>
    </PageContainer>
  );
};

export default AssetsRegistry;
