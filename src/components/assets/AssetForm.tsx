import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  X, Camera, Info, Package, Shield, FileText, MapPin,
  DollarSign, Building2,
  ChevronRight, CheckCircle, TrendingDown, Table2,
  Zap, AlertCircle, RefreshCw
} from 'lucide-react';
import { AssetClassification, AssetClassificationService } from '../../data/assetClassification';

// ────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────

interface AssetFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  mode: 'create' | 'edit';
  initialData?: any;
}

type FormData = Record<string, string>;

interface AmortissementLigne {
  annee: number;
  dateDebut: string;
  dateFin: string;
  baseAmortissable: number;
  dotation: number;
  amortissementCumule: number;
  vnc: number;
}

// ────────────────────────────────────────────────────
// Mapping category → classification code
// ────────────────────────────────────────────────────

const CATEGORY_TO_CLASSIFICATION: Record<string, string> = {
  terrain: '221',
  terrain_non_bati: '222',
  batiment: '231',
  installation_technique: '232',
  agencement: '233',
  securite: '234',
  materiel_transport: '242',
  materiel_bureau: '243',
  materiel_informatique: '241',
  mobilier: '243',
  materiel_industriel: '241',
  outillage: '244',
  logiciel: '211',
  brevet: '212',
  frais_dev: '213',
  decoration: '245',
};

// ────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtDec = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────

const AssetForm: React.FC<AssetFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  mode = 'create',
  initialData = {}
}) => {
  const [activeTab, setActiveTab] = useState('general');
  const [activeGeneralTab, setActiveGeneralTab] = useState('basic');
  const [formData, setFormData] = useState<FormData>({
    // Basic Info
    description: '',
    asset_number: '',
    status: 'en_service',
    category: '',
    sub_category: '',
    asset_class: '',
    acquisition_cost: '',
    current_value: '',
    residual_value: '0',
    location: '',
    serial_number: '',
    manufacturer: '',
    model: '',
    barcode: '',
    responsible_person: '',
    date_mise_en_service: '',
    notes: '',

    // Material Data
    material_data: '',
    additional_identifier: '',
    shipping_type: '',
    batch_numbers: '',
    managed_by: '',
    disposal_method: '',
    weight: '',
    dimensions: '',
    color: '',
    material_type: '',

    // Warranty
    warranty_period: '',
    warranty_unit: 'months',
    warranty_terms: '',
    warranty_start: '',
    warranty_end: '',
    warranty_provider: '',
    warranty_phone: '',

    // Insurance
    insurance_provider: '',
    insurance_policy_number: '',
    insurance_coverage_amount: '',
    insurance_premium: '',
    insurance_expiration: '',
    policy_type: '',

    // Location
    building_name: '',
    floor: '',
    room: '',
    department: '',
    zoning: '',
    unit: '',
    gps_latitude: '',
    gps_longitude: '',
    location_address: '',

    // Acquisition
    acquisition_date: '',
    acquisition_type: 'achat',
    supplier: '',
    invoice_number: '',
    invoice_date: '',
    purchase_order: '',
    delivery_date: '',
    commissioning_date: '',
    acquisition_currency: 'XAF',
    transport_cost: '',
    installation_cost: '',
    other_costs: '',
    total_acquisition_cost: '',

    // Immobilisation (Depreciation)
    account_code: '',
    depreciation_account: '',
    dotation_account: '',
    depreciation_method: 'lineaire',
    useful_life_years: '',
    useful_life_months: '',
    depreciation_rate: '',
    depreciation_start_date: '',
    cumulative_depreciation: '0',
    net_book_value: '0',
    revaluation_date: '',
    revaluation_amount: '0',
    impairment_amount: '0',
    fiscal_regime: 'normal',

    ...initialData
  });

  // ── Derived calculations ──────────────────────────

  const totalAcquisitionCost = useMemo(() => {
    return (
      (parseFloat(formData.acquisition_cost) || 0) +
      (parseFloat(formData.transport_cost) || 0) +
      (parseFloat(formData.installation_cost) || 0) +
      (parseFloat(formData.other_costs) || 0)
    );
  }, [formData.acquisition_cost, formData.transport_cost, formData.installation_cost, formData.other_costs]);

  const baseAmortissable = useMemo(() => {
    const cost = totalAcquisitionCost || parseFloat(formData.acquisition_cost) || 0;
    const residual = parseFloat(formData.residual_value) || 0;
    return Math.max(0, cost - residual);
  }, [totalAcquisitionCost, formData.acquisition_cost, formData.residual_value]);

  const computedVNC = useMemo(() => {
    const cost = totalAcquisitionCost || parseFloat(formData.acquisition_cost) || 0;
    const cumDepr = parseFloat(formData.cumulative_depreciation) || 0;
    const impairment = parseFloat(formData.impairment_amount) || 0;
    const reval = parseFloat(formData.revaluation_amount) || 0;
    return Math.max(0, cost - cumDepr - impairment + reval);
  }, [totalAcquisitionCost, formData.acquisition_cost, formData.cumulative_depreciation, formData.impairment_amount, formData.revaluation_amount]);

  // ── Auto-sync VNC ──────────────────────────────────
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      net_book_value: computedVNC.toString(),
      total_acquisition_cost: totalAcquisitionCost.toString(),
    }));
  }, [computedVNC, totalAcquisitionCost]);

  // ── Depreciation table ─────────────────────────────

  const tableauAmortissement = useMemo((): AmortissementLigne[] => {
    const years = parseInt(formData.useful_life_years) || 0;
    const method = formData.depreciation_method;
    const cost = totalAcquisitionCost || parseFloat(formData.acquisition_cost) || 0;
    const residual = parseFloat(formData.residual_value) || 0;
    const rate = parseFloat(formData.depreciation_rate) || 0;
    const startDate = formData.depreciation_start_date || formData.acquisition_date;

    if (!years || !cost || method === 'non_amortissable' || !startDate) return [];

    const base = cost - residual;
    if (base <= 0) return [];

    const startYear = new Date(startDate).getFullYear();
    const startMonth = new Date(startDate).getMonth(); // 0-indexed
    const tableau: AmortissementLigne[] = [];
    let cumul = 0;

    if (method === 'lineaire') {
      const dotationAnnuelle = Math.round((base / years) * 100) / 100;

      for (let i = 0; i < years; i++) {
        const annee = startYear + i;
        // Prorata first year: from start month to December
        let dotation = dotationAnnuelle;
        if (i === 0 && startMonth > 0) {
          const moisRestants = 12 - startMonth;
          dotation = Math.round((dotationAnnuelle * moisRestants / 12) * 100) / 100;
        }
        // Last year: complement of prorata
        if (i === years - 1 && startMonth > 0) {
          dotation = Math.round((base - cumul) * 100) / 100;
        }
        // Extra year for prorata
        if (i === years - 1 && startMonth > 0) {
          // This year gets the complement
        }

        // Cap: don't exceed base
        if (cumul + dotation > base) {
          dotation = Math.round((base - cumul) * 100) / 100;
        }
        if (dotation <= 0) break;

        cumul += dotation;
        const vnc = Math.round((cost - cumul) * 100) / 100;

        tableau.push({
          annee,
          dateDebut: i === 0 ? startDate : `${annee}-01-01`,
          dateFin: `${annee}-12-31`,
          baseAmortissable: base,
          dotation,
          amortissementCumule: Math.round(cumul * 100) / 100,
          vnc: Math.max(vnc, residual),
        });
      }

      // Extra year if prorata applied and there's remaining
      if (startMonth > 0 && cumul < base) {
        const annee = startYear + years;
        const dotation = Math.round((base - cumul) * 100) / 100;
        cumul += dotation;
        tableau.push({
          annee,
          dateDebut: `${annee}-01-01`,
          dateFin: `${annee}-${String(startMonth).padStart(2, '0')}-${new Date(annee, startMonth, 0).getDate()}`,
          baseAmortissable: base,
          dotation,
          amortissementCumule: Math.round(cumul * 100) / 100,
          vnc: residual,
        });
      }
    } else if (method === 'degressif') {
      const coeffDegressif = years <= 4 ? 1.5 : years <= 6 ? 2 : 2.5;
      const tauxDegressif = rate > 0 ? rate : (100 / years) * coeffDegressif;

      for (let i = 0; i < years + 2; i++) {
        const annee = startYear + i;
        const vncAvant = cost - cumul;
        const anneesRestantes = years - i;

        if (vncAvant <= residual + 0.01) break;

        // Switch to linear when linear > degressif
        const dotationDegressive = Math.round((vncAvant * tauxDegressif / 100) * 100) / 100;
        const dotationLineaire = anneesRestantes > 0
          ? Math.round(((vncAvant - residual) / anneesRestantes) * 100) / 100
          : vncAvant - residual;

        let dotation = Math.max(dotationDegressive, dotationLineaire);

        // Prorata first year
        if (i === 0 && startMonth > 0) {
          const moisRestants = 12 - startMonth;
          dotation = Math.round((dotation * moisRestants / 12) * 100) / 100;
        }

        // Cap
        if (cumul + dotation > base) {
          dotation = Math.round((base - cumul) * 100) / 100;
        }
        if (dotation <= 0) break;

        cumul += dotation;

        tableau.push({
          annee,
          dateDebut: i === 0 ? startDate : `${annee}-01-01`,
          dateFin: `${annee}-12-31`,
          baseAmortissable: Math.round(vncAvant * 100) / 100,
          dotation,
          amortissementCumule: Math.round(cumul * 100) / 100,
          vnc: Math.max(Math.round((cost - cumul) * 100) / 100, residual),
        });
      }
    }

    return tableau;
  }, [
    formData.useful_life_years, formData.depreciation_method,
    formData.depreciation_rate, formData.residual_value,
    formData.depreciation_start_date, formData.acquisition_date,
    formData.acquisition_cost, totalAcquisitionCost
  ]);

  // ── Handlers ───────────────────────────────────────

  const handleChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Auto-fill from category selection
  const handleCategoryChange = useCallback((category: string) => {
    const classifCode = CATEGORY_TO_CLASSIFICATION[category];
    const classif = classifCode
      ? AssetClassificationService.getClassificationByCode(classifCode)
      : null;

    setFormData(prev => {
      const updates: Record<string, string> = { category };

      if (classif) {
        updates.account_code = classif.syscohadaAccount;
        updates.depreciation_account = classif.depreciationAccount;
        updates.useful_life_years = classif.defaultUsefulLife.toString();
        updates.useful_life_months = (classif.defaultUsefulLife * 12).toString();
        updates.depreciation_rate = classif.defaultDepreciationRate.toString();
        updates.asset_class = classif.assetClass;
        updates.sub_category = classif.assetCategory;

        // Dotation account from class
        const classCode = classif.syscohadaAccount.substring(0, 2);
        const dotationMap: Record<string, string> = {
          '21': '6811', '22': '6812', '23': '6813',
          '24': '6814', '28': '6818'
        };
        updates.dotation_account = dotationMap[classCode] || '6811';

        // Non-depreciable for terrains
        if (classif.defaultUsefulLife === 0) {
          updates.depreciation_method = 'non_amortissable';
        }
      }

      return { ...prev, ...updates };
    });
  }, []);

  // Auto-sync: years ↔ months ↔ rate
  const handleYearsChange = useCallback((years: string) => {
    const y = parseInt(years) || 0;
    setFormData(prev => ({
      ...prev,
      useful_life_years: years,
      useful_life_months: y > 0 ? (y * 12).toString() : '',
      depreciation_rate: y > 0 ? (Math.round((100 / y) * 100) / 100).toString() : '',
    }));
  }, []);

  const handleMonthsChange = useCallback((months: string) => {
    const m = parseInt(months) || 0;
    const y = m > 0 ? m / 12 : 0;
    setFormData(prev => ({
      ...prev,
      useful_life_months: months,
      useful_life_years: m > 0 ? Math.round(y).toString() : '',
      depreciation_rate: y > 0 ? (Math.round((100 / y) * 100) / 100).toString() : '',
    }));
  }, []);

  const handleRateChange = useCallback((rate: string) => {
    const r = parseFloat(rate) || 0;
    const y = r > 0 ? 100 / r : 0;
    setFormData(prev => ({
      ...prev,
      depreciation_rate: rate,
      useful_life_years: r > 0 ? Math.round(y).toString() : '',
      useful_life_months: r > 0 ? Math.round(y * 12).toString() : '',
    }));
  }, []);

  // Auto-default depreciation_start_date from acquisition_date
  const handleAcquisitionDateChange = useCallback((date: string) => {
    setFormData(prev => ({
      ...prev,
      acquisition_date: date,
      depreciation_start_date: prev.depreciation_start_date || date,
      commissioning_date: prev.commissioning_date || date,
    }));
  }, []);

  const handleSubmit = () => {
    onSubmit({
      ...formData,
      total_acquisition_cost: totalAcquisitionCost,
      net_book_value: computedVNC,
      tableau_amortissement: tableauAmortissement,
    });
  };

  // ── Classification info for current category ───────

  const currentClassification = useMemo((): AssetClassification | null => {
    const code = CATEGORY_TO_CLASSIFICATION[formData.category];
    if (!code) return null;
    return AssetClassificationService.getClassificationByCode(code) || null;
  }, [formData.category]);

  // ── Tabs config ────────────────────────────────────

  const generalTabs = [
    { id: 'basic', label: 'Actif Info', icon: Info },
    { id: 'material', label: 'Material Data', icon: Package },
    { id: 'warranty', label: 'Garantie', icon: Shield },
    { id: 'insurance', label: 'Assurance', icon: FileText },
    { id: 'location', label: 'Emplacement', icon: MapPin }
  ];

  if (!isOpen) return null;

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-[#6A8A82] text-sm transition-colors";
  const inputReadOnly = "w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700 cursor-not-allowed";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-xl w-[92%] max-w-7xl h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gradient-to-r from-[#6A8A82] to-[#B87333] text-white rounded-t-xl">
          <div>
            <h2 className="text-lg font-bold">
              {mode === 'create' ? 'Nouvel Actif' : "Modifier l'Actif"}
            </h2>
            {formData.description && (
              <p className="text-sm text-white/80 mt-0.5">{formData.description}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors" aria-label="Fermer">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Sidebar + Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 bg-gray-50 border-r p-4 flex flex-col">
            <nav className="space-y-2">
              {[
                { id: 'general', label: 'Information generale', icon: Info },
                { id: 'acquisition', label: 'Acquisition', icon: DollarSign },
                { id: 'immobilisation', label: 'Immobilisation', icon: Building2 },
                { id: 'amortissement', label: 'Tableau amortissement', icon: Table2 },
              ].map(tab => {
                const Icon = tab.icon;
                const hasData = tab.id === 'amortissement' && tableauAmortissement.length > 0;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 text-sm ${
                      activeTab === tab.id
                        ? 'bg-[#6A8A82] text-white shadow-md'
                        : 'hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1">{tab.label}</span>
                    {hasData && activeTab !== tab.id && (
                      <span className="w-2 h-2 bg-green-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Photo placeholder */}
            <div className="mt-6 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <Camera className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <p className="text-xs text-gray-500">Photo de l'actif</p>
              <button className="mt-2 text-xs text-[#6A8A82] hover:underline">Ajouter une photo</button>
            </div>

            {/* Quick summary */}
            {totalAcquisitionCost > 0 && (
              <div className="mt-4 bg-white rounded-lg border p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Resume</p>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cout total</span>
                    <span className="font-semibold text-gray-900">{fmt(totalAcquisitionCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Amort. cumules</span>
                    <span className="font-semibold text-red-600">-{fmt(parseFloat(formData.cumulative_depreciation) || 0)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1">
                    <span className="text-gray-500">VNC</span>
                    <span className="font-bold text-[#6A8A82]">{fmt(computedVNC)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">

            {/* ============================================================ */}
            {/* GENERAL TAB                                                   */}
            {/* ============================================================ */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                {/* Horizontal Sub-tabs */}
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-6">
                    {generalTabs.map((tab) => {
                      const IconComponent = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveGeneralTab(tab.id)}
                          className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                            activeGeneralTab === tab.id
                              ? 'border-[#6A8A82] text-[#6A8A82]'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <IconComponent className="w-4 h-4" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </nav>
                </div>

                {/* Sub-tab Content */}
                <div className="mt-4">

                  {/* ---- Basic Info ---- */}
                  {activeGeneralTab === 'basic' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <div>
                          <label className={labelClass}>Description *</label>
                          <input type="text" value={formData.description} onChange={e => handleChange('description', e.target.value)} className={inputClass} placeholder="Description de l'actif" />
                        </div>
                        <div>
                          <label className={labelClass}>Numero d'actif</label>
                          <input type="text" value={formData.asset_number} onChange={e => handleChange('asset_number', e.target.value)} className={inputClass} placeholder="Ex: AST-2024-001" />
                        </div>
                        <div>
                          <label className={labelClass}>Statut</label>
                          <select value={formData.status} onChange={e => handleChange('status', e.target.value)} className={inputClass}>
                            <option value="en_service">En service</option>
                            <option value="maintenance">En maintenance</option>
                            <option value="hors_service">Hors service</option>
                            <option value="reforme">Reforme</option>
                            <option value="en_attente">En attente</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelClass}>Categorie *</label>
                          <select value={formData.category} onChange={e => handleCategoryChange(e.target.value)} className={inputClass}>
                            <option value="">-- Selectionnez --</option>
                            <optgroup label="Immobilisations incorporelles">
                              <option value="logiciel">Logiciels</option>
                              <option value="brevet">Brevets et licences</option>
                              <option value="frais_dev">Frais de developpement</option>
                            </optgroup>
                            <optgroup label="Terrains">
                              <option value="terrain">Terrains batis</option>
                              <option value="terrain_non_bati">Terrains non-batis</option>
                            </optgroup>
                            <optgroup label="Batiments et installations">
                              <option value="batiment">Batiments</option>
                              <option value="installation_technique">Installations techniques</option>
                              <option value="agencement">Agencements et installations</option>
                              <option value="securite">Securite et surete</option>
                            </optgroup>
                            <optgroup label="Materiel et mobilier">
                              <option value="materiel_informatique">Materiel informatique / technique</option>
                              <option value="materiel_transport">Materiel de transport</option>
                              <option value="materiel_bureau">Materiel de bureau</option>
                              <option value="mobilier">Mobilier</option>
                              <option value="materiel_industriel">Materiel industriel</option>
                              <option value="outillage">Equipements de manutention</option>
                              <option value="decoration">Decoration et signaletique</option>
                            </optgroup>
                          </select>
                        </div>
                        <div>
                          <label className={labelClass}>Sous-categorie</label>
                          <input type="text" value={formData.sub_category} onChange={e => handleChange('sub_category', e.target.value)} className={inputClass} placeholder="Auto-remplie par la categorie" readOnly={!!currentClassification} />
                        </div>
                        <div>
                          <label className={labelClass}>Classe d'actif</label>
                          <input type="text" value={formData.asset_class} onChange={e => handleChange('asset_class', e.target.value)} className={inputClass} placeholder="Auto-remplie par la categorie" readOnly={!!currentClassification} />
                        </div>
                        <div>
                          <label className={labelClass}>Cout d'acquisition *</label>
                          <input type="number" value={formData.acquisition_cost} onChange={e => handleChange('acquisition_cost', e.target.value)} className={inputClass} placeholder="0" />
                        </div>
                        <div>
                          <label className={labelClass}>Valeur actuelle</label>
                          <div className={inputReadOnly}>{fmt(computedVNC)} {formData.acquisition_currency}</div>
                        </div>
                        <div>
                          <label className={labelClass}>Valeur residuelle</label>
                          <input type="number" value={formData.residual_value} onChange={e => handleChange('residual_value', e.target.value)} className={inputClass} placeholder="0" />
                        </div>
                        <div>
                          <label className={labelClass}>Emplacement</label>
                          <input type="text" value={formData.location} onChange={e => handleChange('location', e.target.value)} className={inputClass} placeholder="Ex: Siege social, Bureau 201" />
                        </div>
                        <div>
                          <label className={labelClass}>Numero de serie</label>
                          <input type="text" value={formData.serial_number} onChange={e => handleChange('serial_number', e.target.value)} className={inputClass} placeholder="Ex: SN-2024-XXX" />
                        </div>
                        <div>
                          <label className={labelClass}>Code-barres / QR</label>
                          <input type="text" value={formData.barcode} onChange={e => handleChange('barcode', e.target.value)} className={inputClass} placeholder="Code-barres" />
                        </div>
                        <div>
                          <label className={labelClass}>Fabricant</label>
                          <input type="text" value={formData.manufacturer} onChange={e => handleChange('manufacturer', e.target.value)} className={inputClass} placeholder="Nom du fabricant" />
                        </div>
                        <div>
                          <label className={labelClass}>Modele</label>
                          <input type="text" value={formData.model} onChange={e => handleChange('model', e.target.value)} className={inputClass} placeholder="Modele / Reference" />
                        </div>
                        <div>
                          <label className={labelClass}>Responsable</label>
                          <input type="text" value={formData.responsible_person} onChange={e => handleChange('responsible_person', e.target.value)} className={inputClass} placeholder="Nom du responsable" />
                        </div>
                        <div>
                          <label className={labelClass}>Date de mise en service</label>
                          <input type="date" value={formData.date_mise_en_service} onChange={e => handleChange('date_mise_en_service', e.target.value)} className={inputClass} />
                        </div>
                      </div>

                      {/* Classification info banner */}
                      {currentClassification && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                          <Zap className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm">
                            <p className="font-semibold text-blue-800">Classification SYSCOHADA auto-detectee</p>
                            <p className="text-blue-700 mt-1">
                              <strong>{currentClassification.assetCategory}</strong> — Compte {currentClassification.syscohadaAccount} / Amort. {currentClassification.depreciationAccount}
                            </p>
                            <p className="text-blue-600 mt-0.5">
                              Duree: {currentClassification.usefulLifeYears.min}-{currentClassification.usefulLifeYears.max} ans |
                              Taux: {fmtDec(currentClassification.depreciationRate.min)}%-{fmtDec(currentClassification.depreciationRate.max)}%
                            </p>
                            <p className="text-blue-500 mt-0.5 text-xs">
                              Ex: {currentClassification.examples.join(', ')}
                            </p>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className={labelClass}>Notes / Observations</label>
                        <textarea value={formData.notes} onChange={e => handleChange('notes', e.target.value)} className={inputClass} rows={3} placeholder="Informations complementaires..." />
                      </div>
                    </div>
                  )}

                  {/* ---- Material Data ---- */}
                  {activeGeneralTab === 'material' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <Package className="w-5 h-5 mr-2 text-[#6A8A82]" />
                        Donnees materielles
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className={labelClass}>Description materielle</label>
                          <input type="text" value={formData.material_data} onChange={e => handleChange('material_data', e.target.value)} className={inputClass} placeholder="Donnees materielles" />
                        </div>
                        <div>
                          <label className={labelClass}>Identifiant additionnel</label>
                          <input type="text" value={formData.additional_identifier} onChange={e => handleChange('additional_identifier', e.target.value)} className={inputClass} placeholder="Identifiant supplementaire" />
                        </div>
                        <div>
                          <label className={labelClass}>Type d'expedition</label>
                          <select value={formData.shipping_type} onChange={e => handleChange('shipping_type', e.target.value)} className={inputClass}>
                            <option value="">-- Selectionnez --</option>
                            <option value="maritime">Maritime</option>
                            <option value="aerien">Aerien</option>
                            <option value="routier">Routier</option>
                            <option value="ferroviaire">Ferroviaire</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelClass}>Numeros de lot</label>
                          <input type="text" value={formData.batch_numbers} onChange={e => handleChange('batch_numbers', e.target.value)} className={inputClass} placeholder="Numeros de lot" />
                        </div>
                        <div>
                          <label className={labelClass}>Gere par</label>
                          <input type="text" value={formData.managed_by} onChange={e => handleChange('managed_by', e.target.value)} className={inputClass} placeholder="Nom du gestionnaire" />
                        </div>
                        <div>
                          <label className={labelClass}>Methode de cession</label>
                          <select value={formData.disposal_method} onChange={e => handleChange('disposal_method', e.target.value)} className={inputClass}>
                            <option value="">-- Selectionnez --</option>
                            <option value="vente">Vente</option>
                            <option value="don">Don</option>
                            <option value="destruction">Destruction</option>
                            <option value="recyclage">Recyclage</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelClass}>Poids</label>
                          <input type="text" value={formData.weight} onChange={e => handleChange('weight', e.target.value)} className={inputClass} placeholder="Ex: 150 kg" />
                        </div>
                        <div>
                          <label className={labelClass}>Dimensions</label>
                          <input type="text" value={formData.dimensions} onChange={e => handleChange('dimensions', e.target.value)} className={inputClass} placeholder="Ex: 120x80x60 cm" />
                        </div>
                        <div>
                          <label className={labelClass}>Couleur</label>
                          <input type="text" value={formData.color} onChange={e => handleChange('color', e.target.value)} className={inputClass} placeholder="Couleur principale" />
                        </div>
                        <div>
                          <label className={labelClass}>Type de materiau</label>
                          <input type="text" value={formData.material_type} onChange={e => handleChange('material_type', e.target.value)} className={inputClass} placeholder="Ex: Acier, Bois, Plastique" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ---- Warranty ---- */}
                  {activeGeneralTab === 'warranty' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <Shield className="w-5 h-5 mr-2 text-[#6A8A82]" />
                        Informations de garantie
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className={labelClass}>Duree de garantie</label>
                          <div className="flex items-center space-x-2">
                            <input type="number" value={formData.warranty_period} onChange={e => handleChange('warranty_period', e.target.value)} className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] text-sm" placeholder="12" />
                            <select value={formData.warranty_unit} onChange={e => handleChange('warranty_unit', e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] text-sm">
                              <option value="days">Jours</option>
                              <option value="months">Mois</option>
                              <option value="years">Annees</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className={labelClass}>Fournisseur de garantie</label>
                          <input type="text" value={formData.warranty_provider} onChange={e => handleChange('warranty_provider', e.target.value)} className={inputClass} placeholder="Nom du fournisseur" />
                        </div>
                        <div>
                          <label className={labelClass}>Telephone du fournisseur</label>
                          <input type="text" value={formData.warranty_phone} onChange={e => handleChange('warranty_phone', e.target.value)} className={inputClass} placeholder="+237 6XX XXX XXX" />
                        </div>
                        <div>
                          <label className={labelClass}>Date de debut</label>
                          <input type="date" value={formData.warranty_start} onChange={e => handleChange('warranty_start', e.target.value)} className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>Date de fin</label>
                          <input type="date" value={formData.warranty_end} onChange={e => handleChange('warranty_end', e.target.value)} className={inputClass} />
                        </div>
                        <div className="md:col-span-2">
                          <label className={labelClass}>Termes et conditions</label>
                          <textarea value={formData.warranty_terms} onChange={e => handleChange('warranty_terms', e.target.value)} className={inputClass} rows={3} placeholder="Conditions de la garantie..." />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ---- Insurance ---- */}
                  {activeGeneralTab === 'insurance' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-[#6A8A82]" />
                        Informations d'assurance
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className={labelClass}>Compagnie d'assurance</label>
                          <input type="text" value={formData.insurance_provider} onChange={e => handleChange('insurance_provider', e.target.value)} className={inputClass} placeholder="Nom de la compagnie" />
                        </div>
                        <div>
                          <label className={labelClass}>Numero de police</label>
                          <input type="text" value={formData.insurance_policy_number} onChange={e => handleChange('insurance_policy_number', e.target.value)} className={inputClass} placeholder="Numero de police" />
                        </div>
                        <div>
                          <label className={labelClass}>Montant de couverture</label>
                          <input type="number" value={formData.insurance_coverage_amount} onChange={e => handleChange('insurance_coverage_amount', e.target.value)} className={inputClass} placeholder="0" />
                        </div>
                        <div>
                          <label className={labelClass}>Prime d'assurance</label>
                          <input type="number" value={formData.insurance_premium} onChange={e => handleChange('insurance_premium', e.target.value)} className={inputClass} placeholder="0" />
                        </div>
                        <div>
                          <label className={labelClass}>Type de police</label>
                          <select value={formData.policy_type} onChange={e => handleChange('policy_type', e.target.value)} className={inputClass}>
                            <option value="">-- Selectionnez --</option>
                            <option value="tous_risques">Tous risques</option>
                            <option value="responsabilite">Responsabilite civile</option>
                            <option value="dommages">Dommages materiels</option>
                            <option value="vol">Vol et vandalisme</option>
                            <option value="incendie">Incendie</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelClass}>Date d'expiration</label>
                          <input type="date" value={formData.insurance_expiration} onChange={e => handleChange('insurance_expiration', e.target.value)} className={inputClass} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ---- Location ---- */}
                  {activeGeneralTab === 'location' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <MapPin className="w-5 h-5 mr-2 text-[#6A8A82]" />
                        Emplacement de l'actif
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className={labelClass}>Batiment / Site</label>
                          <input type="text" value={formData.building_name} onChange={e => handleChange('building_name', e.target.value)} className={inputClass} placeholder="Ex: Siege social" />
                        </div>
                        <div>
                          <label className={labelClass}>Etage</label>
                          <input type="text" value={formData.floor} onChange={e => handleChange('floor', e.target.value)} className={inputClass} placeholder="Ex: 2eme etage" />
                        </div>
                        <div>
                          <label className={labelClass}>Bureau / Salle</label>
                          <input type="text" value={formData.room} onChange={e => handleChange('room', e.target.value)} className={inputClass} placeholder="Ex: Bureau 201" />
                        </div>
                        <div>
                          <label className={labelClass}>Departement</label>
                          <input type="text" value={formData.department} onChange={e => handleChange('department', e.target.value)} className={inputClass} placeholder="Ex: Comptabilite" />
                        </div>
                        <div>
                          <label className={labelClass}>Zone / Unite</label>
                          <input type="text" value={formData.unit} onChange={e => handleChange('unit', e.target.value)} className={inputClass} placeholder="Ex: Zone A" />
                        </div>
                        <div>
                          <label className={labelClass}>Zonage</label>
                          <input type="text" value={formData.zoning} onChange={e => handleChange('zoning', e.target.value)} className={inputClass} placeholder="Ex: Zone industrielle" />
                        </div>
                        <div className="md:col-span-2">
                          <label className={labelClass}>Adresse complete</label>
                          <textarea value={formData.location_address} onChange={e => handleChange('location_address', e.target.value)} className={inputClass} rows={2} placeholder="Adresse complete..." />
                        </div>
                        <div>
                          <label className={labelClass}>Latitude GPS</label>
                          <input type="text" value={formData.gps_latitude} onChange={e => handleChange('gps_latitude', e.target.value)} className={inputClass} placeholder="Ex: 3.8480" />
                        </div>
                        <div>
                          <label className={labelClass}>Longitude GPS</label>
                          <input type="text" value={formData.gps_longitude} onChange={e => handleChange('gps_longitude', e.target.value)} className={inputClass} placeholder="Ex: 11.5021" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* ACQUISITION TAB                                               */}
            {/* ============================================================ */}
            {activeTab === 'acquisition' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-[#B87333]" />
                  Informations d'acquisition
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  <div>
                    <label className={labelClass}>Type d'acquisition *</label>
                    <select value={formData.acquisition_type} onChange={e => handleChange('acquisition_type', e.target.value)} className={inputClass}>
                      <option value="achat">Achat</option>
                      <option value="leasing">Leasing / Credit-bail</option>
                      <option value="don">Don / Subvention</option>
                      <option value="apport">Apport en nature</option>
                      <option value="production">Production interne</option>
                      <option value="echange">Echange</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Date d'acquisition *</label>
                    <input type="date" value={formData.acquisition_date} onChange={e => handleAcquisitionDateChange(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Fournisseur</label>
                    <input type="text" value={formData.supplier} onChange={e => handleChange('supplier', e.target.value)} className={inputClass} placeholder="Nom du fournisseur" />
                  </div>
                  <div>
                    <label className={labelClass}>Numero de facture</label>
                    <input type="text" value={formData.invoice_number} onChange={e => handleChange('invoice_number', e.target.value)} className={inputClass} placeholder="Ex: FAC-2024-001" />
                  </div>
                  <div>
                    <label className={labelClass}>Date de facture</label>
                    <input type="date" value={formData.invoice_date} onChange={e => handleChange('invoice_date', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Bon de commande</label>
                    <input type="text" value={formData.purchase_order} onChange={e => handleChange('purchase_order', e.target.value)} className={inputClass} placeholder="Ex: BC-2024-001" />
                  </div>
                  <div>
                    <label className={labelClass}>Date de livraison</label>
                    <input type="date" value={formData.delivery_date} onChange={e => handleChange('delivery_date', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Date de mise en service</label>
                    <input type="date" value={formData.commissioning_date} onChange={e => handleChange('commissioning_date', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Devise</label>
                    <select value={formData.acquisition_currency} onChange={e => handleChange('acquisition_currency', e.target.value)} className={inputClass}>
                      <option value="XAF">XAF (Franc CFA CEMAC)</option>
                      <option value="XOF">XOF (Franc CFA UEMOA)</option>
                      <option value="EUR">EUR (Euro)</option>
                      <option value="USD">USD (Dollar US)</option>
                    </select>
                  </div>
                </div>

                {/* Cost breakdown */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                  <h4 className="text-sm font-semibold text-gray-700 mb-4">Decomposition du cout</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className={labelClass}>Prix d'achat HT *</label>
                      <input type="number" value={formData.acquisition_cost} onChange={e => handleChange('acquisition_cost', e.target.value)} className={inputClass} placeholder="0" />
                    </div>
                    <div>
                      <label className={labelClass}>Frais de transport</label>
                      <input type="number" value={formData.transport_cost} onChange={e => handleChange('transport_cost', e.target.value)} className={inputClass} placeholder="0" />
                    </div>
                    <div>
                      <label className={labelClass}>Frais d'installation</label>
                      <input type="number" value={formData.installation_cost} onChange={e => handleChange('installation_cost', e.target.value)} className={inputClass} placeholder="0" />
                    </div>
                    <div>
                      <label className={labelClass}>Autres frais</label>
                      <input type="number" value={formData.other_costs} onChange={e => handleChange('other_costs', e.target.value)} className={inputClass} placeholder="0" />
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-700">Cout total d'acquisition</span>
                    <span className="text-lg font-bold text-[#B87333]">
                      {fmt(totalAcquisitionCost)} {formData.acquisition_currency}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* IMMOBILISATION TAB                                            */}
            {/* ============================================================ */}
            {activeTab === 'immobilisation' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Building2 className="w-5 h-5 mr-2 text-[#6A8A82]" />
                  Donnees comptables d'immobilisation
                </h3>

                {/* Accounting info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-semibold text-blue-800">Comptes comptables (SYSCOHADA)</h4>
                    {currentClassification && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        Auto-detecte depuis la categorie
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className={labelClass}>Compte d'immobilisation *</label>
                      <input type="text" value={formData.account_code} onChange={e => handleChange('account_code', e.target.value)} className={inputClass} placeholder="Ex: 2440" />
                      {currentClassification && (
                        <p className="text-xs text-blue-600 mt-1">{currentClassification.assetCategory}</p>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>Compte d'amortissement *</label>
                      <input type="text" value={formData.depreciation_account} onChange={e => handleChange('depreciation_account', e.target.value)} className={inputClass} placeholder="Ex: 2844" />
                    </div>
                    <div>
                      <label className={labelClass}>Compte de dotation</label>
                      <input type="text" value={formData.dotation_account} onChange={e => handleChange('dotation_account', e.target.value)} className={inputClass} placeholder="Ex: 6814" />
                      <p className="text-xs text-gray-500 mt-1">Dotation aux amortissements (681x)</p>
                    </div>
                  </div>
                </div>

                {/* Depreciation parameters */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                  <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4" />
                    Parametres d'amortissement
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div>
                      <label className={labelClass}>Methode d'amortissement *</label>
                      <select value={formData.depreciation_method} onChange={e => handleChange('depreciation_method', e.target.value)} className={inputClass}>
                        <option value="lineaire">Lineaire</option>
                        <option value="degressif">Degressif</option>
                        <option value="unites_production">Unites de production</option>
                        <option value="non_amortissable">Non amortissable</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Duree de vie (annees) *</label>
                      <input
                        type="number"
                        value={formData.useful_life_years}
                        onChange={e => handleYearsChange(e.target.value)}
                        className={inputClass}
                        placeholder="Ex: 5"
                        min="0"
                        max="100"
                      />
                      {currentClassification && currentClassification.usefulLifeYears.max > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Plage: {currentClassification.usefulLifeYears.min}-{currentClassification.usefulLifeYears.max} ans
                        </p>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>
                        Duree de vie (mois)
                        <RefreshCw className="w-3 h-3 inline ml-1 text-gray-400" />
                      </label>
                      <input
                        type="number"
                        value={formData.useful_life_months}
                        onChange={e => handleMonthsChange(e.target.value)}
                        className={inputReadOnly}
                        readOnly
                      />
                      <p className="text-xs text-gray-400 mt-1">Calcule automatiquement</p>
                    </div>
                    <div>
                      <label className={labelClass}>
                        Taux d'amortissement (%)
                        <RefreshCw className="w-3 h-3 inline ml-1 text-gray-400" />
                      </label>
                      <input
                        type="number"
                        value={formData.depreciation_rate}
                        onChange={e => handleRateChange(e.target.value)}
                        className={inputClass}
                        placeholder="Ex: 20"
                        step="0.01"
                      />
                      <p className="text-xs text-gray-400 mt-1">= 100 / duree de vie</p>
                    </div>
                    <div>
                      <label className={labelClass}>Date debut amortissement</label>
                      <input type="date" value={formData.depreciation_start_date} onChange={e => handleChange('depreciation_start_date', e.target.value)} className={inputClass} />
                      {!formData.depreciation_start_date && formData.acquisition_date && (
                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Par defaut: date d'acquisition
                        </p>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>Regime fiscal</label>
                      <select value={formData.fiscal_regime} onChange={e => handleChange('fiscal_regime', e.target.value)} className={inputClass}>
                        <option value="normal">Normal</option>
                        <option value="accelere">Accelere</option>
                        <option value="exceptionnel">Exceptionnel</option>
                      </select>
                    </div>
                  </div>

                  {/* Base amortissable summary */}
                  {baseAmortissable > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-gray-500">Cout total</p>
                        <p className="text-sm font-bold text-gray-900">{fmt(totalAcquisitionCost || parseFloat(formData.acquisition_cost) || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Valeur residuelle</p>
                        <p className="text-sm font-bold text-gray-900">- {fmt(parseFloat(formData.residual_value) || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Base amortissable</p>
                        <p className="text-sm font-bold text-[#B87333]">= {fmt(baseAmortissable)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Current values */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-5">
                  <h4 className="text-sm font-semibold text-green-800 mb-4">Valeurs actuelles</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className={labelClass}>Amortissements cumules</label>
                      <input type="number" value={formData.cumulative_depreciation} onChange={e => handleChange('cumulative_depreciation', e.target.value)} className={inputClass} placeholder="0" />
                    </div>
                    <div>
                      <label className={labelClass}>Valeur nette comptable (VNC)</label>
                      <div className={`${inputReadOnly} font-bold text-[#6A8A82]`}>
                        {fmt(computedVNC)} {formData.acquisition_currency}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Cout - Amort. cumules - Depreciation + Reevaluation</p>
                    </div>
                    <div>
                      <label className={labelClass}>Valeur residuelle</label>
                      <input type="number" value={formData.residual_value} onChange={e => handleChange('residual_value', e.target.value)} className={inputClass} placeholder="0" />
                    </div>
                  </div>
                </div>

                {/* Revaluation / Impairment */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
                  <h4 className="text-sm font-semibold text-amber-800 mb-4">Reevaluation et depreciation</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className={labelClass}>Date de reevaluation</label>
                      <input type="date" value={formData.revaluation_date} onChange={e => handleChange('revaluation_date', e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Montant de reevaluation</label>
                      <input type="number" value={formData.revaluation_amount} onChange={e => handleChange('revaluation_amount', e.target.value)} className={inputClass} placeholder="0" />
                    </div>
                    <div>
                      <label className={labelClass}>Depreciation / Perte de valeur</label>
                      <input type="number" value={formData.impairment_amount} onChange={e => handleChange('impairment_amount', e.target.value)} className={inputClass} placeholder="0" />
                    </div>
                  </div>
                </div>

                {/* Mini preview of depreciation table */}
                {tableauAmortissement.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Table2 className="w-4 h-4" />
                        Apercu du tableau d'amortissement
                      </h4>
                      <button
                        onClick={() => setActiveTab('amortissement')}
                        className="text-xs text-[#6A8A82] hover:underline flex items-center gap-1"
                      >
                        Voir le tableau complet <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-3 text-center">
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs text-gray-500">Dotation annuelle</p>
                        <p className="text-sm font-bold">{fmt(tableauAmortissement[0]?.dotation || 0)}</p>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs text-gray-500">Nombre d'annuites</p>
                        <p className="text-sm font-bold">{tableauAmortissement.length}</p>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs text-gray-500">Total amorti</p>
                        <p className="text-sm font-bold">{fmt(tableauAmortissement[tableauAmortissement.length - 1]?.amortissementCumule || 0)}</p>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs text-gray-500">VNC finale</p>
                        <p className="text-sm font-bold text-[#6A8A82]">{fmt(tableauAmortissement[tableauAmortissement.length - 1]?.vnc || 0)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ============================================================ */}
            {/* TABLEAU D'AMORTISSEMENT TAB                                   */}
            {/* ============================================================ */}
            {activeTab === 'amortissement' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Table2 className="w-5 h-5 mr-2 text-[#6A8A82]" />
                    Tableau d'amortissement previsionnel
                  </h3>
                  {formData.depreciation_method === 'degressif' && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
                      Mode degressif — basculement lineaire automatique
                    </span>
                  )}
                </div>

                {tableauAmortissement.length === 0 ? (
                  <div className="text-center py-16">
                    <Table2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h4 className="text-lg font-semibold text-gray-500 mb-2">Aucun tableau disponible</h4>
                    <p className="text-sm text-gray-400 max-w-md mx-auto">
                      Renseignez le cout d'acquisition, la duree de vie et la date de debut d'amortissement
                      dans l'onglet Immobilisation pour generer automatiquement le tableau.
                    </p>
                    <button
                      onClick={() => setActiveTab('immobilisation')}
                      className="mt-4 px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors text-sm"
                    >
                      Aller a Immobilisation
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Summary cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                        <p className="text-xs text-blue-600 font-medium">Methode</p>
                        <p className="text-sm font-bold text-blue-800 capitalize">{formData.depreciation_method}</p>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-600 font-medium">Base amortissable</p>
                        <p className="text-sm font-bold text-gray-900">{fmt(baseAmortissable)}</p>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-600 font-medium">Taux</p>
                        <p className="text-sm font-bold text-gray-900">{fmtDec(parseFloat(formData.depreciation_rate) || 0)}%</p>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-600 font-medium">Duree</p>
                        <p className="text-sm font-bold text-gray-900">{formData.useful_life_years} ans</p>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                        <p className="text-xs text-green-600 font-medium">VNC finale</p>
                        <p className="text-sm font-bold text-green-800">{fmt(tableauAmortissement[tableauAmortissement.length - 1]?.vnc || 0)}</p>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gradient-to-r from-[#6A8A82] to-[#5A7A72] text-white">
                            <th className="px-4 py-3 text-left font-semibold">Annee</th>
                            <th className="px-4 py-3 text-left font-semibold">Periode</th>
                            <th className="px-4 py-3 text-right font-semibold">Base amortissable</th>
                            <th className="px-4 py-3 text-right font-semibold">Dotation</th>
                            <th className="px-4 py-3 text-right font-semibold">Amort. cumule</th>
                            <th className="px-4 py-3 text-right font-semibold">VNC</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tableauAmortissement.map((ligne, idx) => {
                            const isLast = idx === tableauAmortissement.length - 1;
                            const progress = (ligne.amortissementCumule / baseAmortissable) * 100;
                            return (
                              <tr
                                key={idx}
                                className={`border-t border-gray-100 ${
                                  idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                } ${isLast ? 'font-semibold' : ''} hover:bg-blue-50/50 transition-colors`}
                              >
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <span className="w-7 h-7 rounded-full bg-[#6A8A82]/10 text-[#6A8A82] flex items-center justify-center text-xs font-bold">
                                      {idx + 1}
                                    </span>
                                    {ligne.annee}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-gray-500 text-xs">
                                  {ligne.dateDebut.substring(5)} → {ligne.dateFin.substring(5)}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-700">{fmt(ligne.baseAmortissable)}</td>
                                <td className="px-4 py-3 text-right">
                                  <span className="text-red-600 font-medium">-{fmt(ligne.dotation)}</span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div>
                                    <span className="text-gray-900">{fmt(ligne.amortissementCumule)}</span>
                                    <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                                      <div
                                        className="bg-[#6A8A82] h-1 rounded-full transition-all"
                                        style={{ width: `${Math.min(progress, 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className={`px-4 py-3 text-right font-bold ${
                                  isLast ? 'text-[#6A8A82]' : 'text-gray-900'
                                }`}>
                                  {fmt(ligne.vnc)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                            <td className="px-4 py-3" colSpan={2}>TOTAL</td>
                            <td className="px-4 py-3 text-right">
                              {fmt(totalAcquisitionCost || parseFloat(formData.acquisition_cost) || 0)}
                            </td>
                            <td className="px-4 py-3 text-right text-red-600">
                              -{fmt(tableauAmortissement[tableauAmortissement.length - 1]?.amortissementCumule || 0)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {fmt(tableauAmortissement[tableauAmortissement.length - 1]?.amortissementCumule || 0)}
                            </td>
                            <td className="px-4 py-3 text-right text-[#6A8A82]">
                              {fmt(tableauAmortissement[tableauAmortissement.length - 1]?.vnc || 0)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Ecritures comptables preview */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Ecritures comptables generees</h4>
                      <div className="text-xs text-gray-600 space-y-2">
                        <div className="flex items-center gap-4 bg-white rounded p-2 border">
                          <span className="font-mono text-gray-500 w-16">Debit</span>
                          <span className="font-mono font-bold text-gray-800">{formData.dotation_account || '681x'}</span>
                          <span className="flex-1 text-gray-600">Dotation aux amortissements</span>
                          <span className="font-bold text-red-600">{fmt(tableauAmortissement[0]?.dotation || 0)}</span>
                        </div>
                        <div className="flex items-center gap-4 bg-white rounded p-2 border">
                          <span className="font-mono text-gray-500 w-16">Credit</span>
                          <span className="font-mono font-bold text-gray-800">{formData.depreciation_account || '28xx'}</span>
                          <span className="flex-1 text-gray-600">Amortissement des immobilisations</span>
                          <span className="font-bold text-green-600">{fmt(tableauAmortissement[0]?.dotation || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center rounded-b-xl">
          <div className="text-xs text-gray-500 flex items-center gap-2">
            {activeTab === 'general' && 'Onglet: Information generale'}
            {activeTab === 'acquisition' && 'Onglet: Acquisition'}
            {activeTab === 'immobilisation' && 'Onglet: Immobilisation'}
            {activeTab === 'amortissement' && `Onglet: Tableau d'amortissement (${tableauAmortissement.length} lignes)`}
            {tableauAmortissement.length > 0 && activeTab !== 'amortissement' && (
              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">
                Tableau: {tableauAmortissement.length} annuites
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button onClick={handleSubmit} className="px-6 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors flex items-center gap-2 font-medium" aria-label="Valider">
              <CheckCircle className="w-5 h-5" />
              {mode === 'create' ? "Creer l'actif" : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetForm;
