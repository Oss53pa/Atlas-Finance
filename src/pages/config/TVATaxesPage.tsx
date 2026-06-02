import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter,
  Download,
  Upload,
  CheckCircle,
  AlertTriangle,
  Clock,
  Copy,
  Calculator,
  Percent,
  Target,
  Save,
  RefreshCw
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  LoadingSpinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Progress
} from '../../components/ui';
import { formatDate, formatPercentage } from '../../lib/utils';
import { toast } from 'react-hot-toast';
import type { DataAdapter } from '@atlas/data';

interface TaxRate {
  id: string;
  code: string;
  libelle: string;
  type: 'TVA' | 'TCA' | 'TAF' | 'TSS' | 'IRPP' | 'IS' | 'Custom';
  taux: number;
  country: string;
  applicable_depuis: string;
  applicable_jusqu: string;
  status: 'active' | 'inactive' | 'archived';
  is_default: boolean;
  compte_collecte?: string;
  compte_deductible?: string;
  conditions_application: string[];
  exclusions: string[];
  created_date: string;
  usage_count: number;
}

interface TaxRule {
  id: string;
  name: string;
  description: string;
  tax_type: string;
  conditions: string[];
  formula: string;
  auto_apply: boolean;
  priority: number;
  status: 'active' | 'inactive';
  created_date: string;
}

interface TaxExemption {
  id: string;
  code: string;
  libelle: string;
  type_exemption: 'totale' | 'partielle';
  taux_reduction?: number;
  conditions: string[];
  date_debut: string;
  date_fin?: string;
  status: 'active' | 'expired';
}

interface TaxSettings {
  auto_tva: boolean;
  auto_retenue: boolean;
  validation_manuelle: boolean;
  arrondi_methode: string;
  arrondi_precision: string;
}

const DEFAULT_TAX_SETTINGS: TaxSettings = {
  auto_tva: true,
  auto_retenue: true,
  validation_manuelle: false,
  arrondi_methode: 'nearest',
  arrondi_precision: '1',
};

// ─── helpers ────────────────────────────────────────────────────────────────

async function saveTaxRates(adapter: DataAdapter, rates: TaxRate[]) {
  const existing = await adapter.getById<any>('settings', 'tva_rates');
  const payload = { id: 'tva_rates', key: 'tva_rates', value: JSON.stringify(rates) };
  if (existing) {
    await adapter.update<any>('settings', 'tva_rates', payload);
  } else {
    await adapter.create<any>('settings', payload);
  }
}

async function saveTaxSettings(adapter: DataAdapter, settings: TaxSettings) {
  const existing = await adapter.getById<any>('settings', 'tva_settings');
  const payload = { id: 'tva_settings', key: 'tva_settings', value: JSON.stringify(settings) };
  if (existing) {
    await adapter.update<any>('settings', 'tva_settings', payload);
  } else {
    await adapter.create<any>('settings', payload);
  }
}

// ─── component ───────────────────────────────────────────────────────────────

const TVATaxesPage: React.FC = () => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');
  const [showArchivedTaxes, setShowArchivedTaxes] = useState(false);
  const { adapter } = useData();

  // ── raw DB state ─────────────────────────────────────────────────────────
  const [taxRatesSetting, setTaxRatesSetting] = useState<any>(undefined);
  const [taxRulesSetting, setTaxRulesSetting] = useState<any>(undefined);
  const [exemptionsSetting, setExemptionsSetting] = useState<any>(undefined);
  const [taxSettingsSetting, setTaxSettingsSetting] = useState<any>(undefined);

  // ── settings tab controlled state ────────────────────────────────────────
  const [taxSettings, setTaxSettings] = useState<TaxSettings>(DEFAULT_TAX_SETTINGS);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // ── inline edit / create modal state ─────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [editingRate, setEditingRate] = useState<TaxRate | null>(null);
  const [modalForm, setModalForm] = useState<Partial<TaxRate>>({});
  const [isSavingRate, setIsSavingRate] = useState(false);

  // ── import file input ref ────────────────────────────────────────────────
  const importRef = useRef<HTMLInputElement>(null);

  // ── load ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const [tr, trl, ex, ts] = await Promise.all([
        adapter.getById('settings', 'tva_rates'),
        adapter.getById('settings', 'tax_rules'),
        adapter.getById('settings', 'tax_exemptions'),
        adapter.getById('settings', 'tva_settings'),
      ]);
      setTaxRatesSetting(tr);
      setTaxRulesSetting(trl);
      setExemptionsSetting(ex);
      setTaxSettingsSetting(ts);
      if (ts) {
        try {
          setTaxSettings(JSON.parse((ts as any).value));
        } catch (parseErr) {
          console.error('[TVATaxes] Erreur lecture paramètres TVA:', parseErr);
          toast.error('Impossible de lire les paramètres TVA enregistrés, utilisation des valeurs par défaut');
        }
      }
    };
    load();
  }, [adapter]);

  const taxRates: TaxRate[] = taxRatesSetting ? (() => { try { return JSON.parse(taxRatesSetting.value); } catch { return []; } })() : [];
  const isLoading = taxRatesSetting === undefined;
  const taxRules: TaxRule[] = taxRulesSetting ? (() => { try { return JSON.parse(taxRulesSetting.value); } catch { return []; } })() : [];
  const exemptions: TaxExemption[] = exemptionsSetting ? (() => { try { return JSON.parse(exemptionsSetting.value); } catch { return []; } })() : [];

  // ── filter ────────────────────────────────────────────────────────────────
  const filteredTaxRates = taxRates.filter(rate => {
    if (!showArchivedTaxes && rate.status === 'archived') return false;
    const matchesSearch = rate.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rate.libelle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || rate.type === selectedType;
    const matchesCountry = selectedCountry === 'all' || rate.country === selectedCountry;
    const matchesStatus = selectedStatus === 'all' || rate.status === selectedStatus;
    return matchesSearch && matchesType && matchesCountry && matchesStatus;
  });

  // ── CRUD ─────────────────────────────────────────────────────────────────

  const openCreateModal = () => {
    setEditingRate(null);
    setModalForm({
      code: '',
      libelle: '',
      type: 'TVA',
      taux: 18,
      country: 'CI',
      applicable_depuis: new Date().toISOString().slice(0, 10),
      applicable_jusqu: '',
      status: 'active',
      is_default: false,
      compte_collecte: '',
      compte_deductible: '',
      conditions_application: [],
      exclusions: [],
    });
    setShowModal(true);
  };

  const openEditModal = (rate: TaxRate) => {
    setEditingRate(rate);
    setModalForm({ ...rate });
    setShowModal(true);
  };

  const handleSaveRate = async () => {
    if (!modalForm.code?.trim() || !modalForm.libelle?.trim()) {
      toast.error('Code et Libellé sont obligatoires');
      return;
    }
    if (!modalForm.applicable_depuis?.trim()) {
      toast.error('La date "Applicable depuis" est obligatoire');
      return;
    }
    const taux = modalForm.taux ?? 0;
    if (typeof taux !== 'number' || isNaN(taux) || taux < 0 || taux > 100) {
      toast.error('Le taux doit être un nombre entre 0 et 100');
      return;
    }
    setIsSavingRate(true);
    try {
      let updatedRates: TaxRate[];
      if (editingRate) {
        updatedRates = taxRates.map(r =>
          r.id === editingRate.id ? { ...r, ...modalForm } as TaxRate : r
        );
      } else {
        const newRate: TaxRate = {
          id: `rate_${Date.now()}`,
          code: modalForm.code!,
          libelle: modalForm.libelle!,
          type: (modalForm.type as TaxRate['type']) ?? 'TVA',
          taux: modalForm.taux ?? 0,
          country: modalForm.country ?? 'CI',
          applicable_depuis: modalForm.applicable_depuis ?? '',
          applicable_jusqu: modalForm.applicable_jusqu ?? '',
          status: (modalForm.status as TaxRate['status']) ?? 'active',
          is_default: modalForm.is_default ?? false,
          compte_collecte: modalForm.compte_collecte,
          compte_deductible: modalForm.compte_deductible,
          conditions_application: modalForm.conditions_application ?? [],
          exclusions: modalForm.exclusions ?? [],
          created_date: new Date().toISOString(),
          usage_count: 0,
        };
        updatedRates = [...taxRates, newRate];
      }
      await saveTaxRates(adapter, updatedRates);
      // refresh local state
      const tr = await adapter.getById<any>('settings', 'tva_rates');
      setTaxRatesSetting(tr);
      toast.success(editingRate ? 'Taux modifié avec succès' : 'Taux créé avec succès');
      setShowModal(false);
    } catch (err: any) {
      toast.error(err?.message ?? 'Erreur lors de la sauvegarde du taux');
    } finally {
      setIsSavingRate(false);
    }
  };

  const handleDeleteTaxRate = async (rateId: string) => {
    if (!window.confirm('Supprimer ce taux de taxe ?')) return;
    try {
      const updatedRates = taxRates.filter(r => r.id !== rateId);
      await saveTaxRates(adapter, updatedRates);
      const tr = await adapter.getById<any>('settings', 'tva_rates');
      setTaxRatesSetting(tr);
      toast.success('Taux supprimé');
    } catch (err: any) {
      toast.error(err?.message ?? 'Erreur lors de la suppression du taux');
    }
  };

  // ── import / export ───────────────────────────────────────────────────────

  const handleImportTaxes = () => {
    importRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const parsed: TaxRate[] = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(parsed)) throw new Error('Format invalide : tableau attendu');
        // Merge: keep existing, add/overwrite by id
        const map = new Map(taxRates.map(r => [r.id, r]));
        for (const rate of parsed) {
          if (rate.id && rate.code && rate.libelle) map.set(rate.id, rate);
        }
        await saveTaxRates(adapter, Array.from(map.values()));
        const tr = await adapter.getById<any>('settings', 'tva_rates');
        setTaxRatesSetting(tr);
        toast.success(`${parsed.length} taux importés avec succès`);
      } catch (err: any) {
        toast.error(err?.message ?? 'Erreur lors de l\'import du fichier');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleExportTaxes = () => {
    try {
      const json = JSON.stringify(taxRates, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `taux-taxes-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export téléchargé');
    } catch (err: any) {
      toast.error(err?.message ?? 'Erreur lors de l\'export');
    }
  };

  // ── settings tab save ─────────────────────────────────────────────────────

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await saveTaxSettings(adapter, taxSettings);
      const ts = await adapter.getById<any>('settings', 'tva_settings');
      setTaxSettingsSetting(ts);
      toast.success('Paramètres sauvegardés');
    } catch (err: any) {
      toast.error(err?.message ?? 'Erreur lors de la sauvegarde des paramètres');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleDuplicateTaxRate = (rate: TaxRate) => {
    setEditingRate(null);
    setModalForm({
      ...rate,
      id: undefined,
      code: `${rate.code}_COPIE`,
      libelle: `${rate.libelle} (copie)`,
      is_default: false,
    });
    setShowModal(true);
  };

  // ── display helpers ───────────────────────────────────────────────────────

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'inactive': return 'text-orange-600 bg-orange-100';
      case 'archived': return 'text-gray-600 bg-gray-100';
      case 'expired': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'inactive': return <Clock className="h-4 w-4" />;
      case 'archived':
      case 'expired': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'TVA': return 'text-blue-600 bg-blue-100';
      case 'TCA': return 'text-primary-600 bg-primary-100';
      case 'TAF': return 'text-orange-600 bg-orange-100';
      case 'IS': return 'text-green-600 bg-green-100';
      case 'IRPP': return 'text-red-600 bg-red-100';
      case 'TSS': return 'text-primary-600 bg-primary-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCountryFlag = (countryCode: string) => {
    const flags: { [key: string]: string } = {
      CI: '🇨🇮', SN: '🇸🇳', BF: '🇧🇫', ML: '🇲🇱',
      NE: '🇳🇪', TG: '🇹🇬', BJ: '🇧🇯', GN: '🇬🇳'
    };
    return flags[countryCode] || '🏴';
  };

  const activeTaxes = taxRates.filter(r => r.status === 'active').length;
  const totalUsage = taxRates.reduce((sum, rate) => sum + rate.usage_count, 0);
  const tvaRates = taxRates.filter(r => r.type === 'TVA').length;

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Hidden file input for import */}
      <input
        ref={importRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="border-b border-gray-200 pb-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center">
              <CreditCard className="mr-3 h-7 w-7 text-blue-600" />
              Configuration TVA et Taxes
            </h1>
            <p className="mt-2 text-gray-600">
              Gestion des taux de TVA et autres taxes selon la réglementation UEMOA
            </p>
          </div>
          <div className="flex space-x-3">
            <Button onClick={handleImportTaxes} variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Importer
            </Button>
            <Button onClick={handleExportTaxes} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
            <Button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau Taux
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 rounded-full">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Taux Actifs</p>
                  <p className="text-lg font-bold text-blue-700">{activeTaxes}/{taxRates.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-green-100 rounded-full">
                  <Percent className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Taux TVA</p>
                  <p className="text-lg font-bold text-green-700">{tvaRates}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-primary-100 rounded-full">
                  <Calculator className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Utilisations</p>
                  <p className="text-lg font-bold text-primary-700">{totalUsage.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-orange-100 rounded-full">
                  <Target className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Exonérations</p>
                  <p className="text-lg font-bold text-orange-700">{exemptions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Content */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}>
        <Tabs defaultValue="rates" className="space-y-4">
          <TabsList>
            <TabsTrigger value="rates">Taux de Taxes</TabsTrigger>
            <TabsTrigger value="rules">Règles d'Application</TabsTrigger>
            <TabsTrigger value="exemptions">Exonérations</TabsTrigger>
            <TabsTrigger value="settings">{t('navigation.settings')}</TabsTrigger>
          </TabsList>

          {/* ── RATES ─────────────────────────────────────────────────────── */}
          <TabsContent value="rates" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="grid gap-4 md:grid-cols-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-700" />
                    <Input
                      placeholder="Rechercher un taux..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger><SelectValue placeholder="Type de taxe" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les types</SelectItem>
                      <SelectItem value="TVA">TVA</SelectItem>
                      <SelectItem value="TCA">TCA</SelectItem>
                      <SelectItem value="TAF">TAF</SelectItem>
                      <SelectItem value="IS">Impôt sur Sociétés</SelectItem>
                      <SelectItem value="IRPP">IRPP</SelectItem>
                      <SelectItem value="TSS">TSS</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                    <SelectTrigger><SelectValue placeholder="Pays" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les pays</SelectItem>
                      <SelectItem value="CI">Côte d'Ivoire</SelectItem>
                      <SelectItem value="SN">Sénégal</SelectItem>
                      <SelectItem value="BF">Burkina Faso</SelectItem>
                      <SelectItem value="ML">Mali</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="inactive">Inactif</SelectItem>
                      <SelectItem value="archived">Archivé</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="show-archived"
                      checked={showArchivedTaxes}
                      onChange={(e) => setShowArchivedTaxes(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="show-archived" className="text-sm text-gray-700">
                      Inclure archivés
                    </label>
                  </div>

                  <Button variant="outline" className="flex items-center" onClick={() => toast('Filtres avancés — fonctionnalité à venir', { icon: 'ℹ️' })}>
                    <Filter className="mr-2 h-4 w-4" />
                    Filtres Avancés
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Taux de Taxes ({filteredTaxRates.length})</span>
                  <Badge variant="outline">Réglementation UEMOA</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="lg" text="Chargement des taux de taxes..." />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code/Libellé</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Taux</TableHead>
                          <TableHead>Pays</TableHead>
                          <TableHead>Période</TableHead>
                          <TableHead>Comptes</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Utilisation</TableHead>
                          <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTaxRates.map((rate) => (
                          <TableRow key={rate.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <CreditCard className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <Badge variant="outline" className="font-mono">{rate.code}</Badge>
                                    {rate.is_default && (
                                      <Badge variant="default" className="text-xs bg-yellow-100 text-yellow-800">Défaut</Badge>
                                    )}
                                  </div>
                                  <p className="font-medium text-gray-900 mt-1">{rate.libelle}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(rate.type)}`}>
                                {rate.type}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-lg font-bold text-blue-600">
                                {formatPercentage(rate.taux)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <span className="text-lg">{getCountryFlag(rate.country)}</span>
                                <span className="text-sm font-medium">{rate.country}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p className="font-medium">Du {formatDate(rate.applicable_depuis)}</p>
                                <p className="text-gray-700">Au {formatDate(rate.applicable_jusqu)}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {rate.compte_collecte && (
                                  <Badge variant="outline" className="text-xs font-mono">C: {rate.compte_collecte}</Badge>
                                )}
                                {rate.compte_deductible && (
                                  <Badge variant="outline" className="text-xs font-mono">D: {rate.compte_deductible}</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(rate.status)}`}>
                                {getStatusIcon(rate.status)}
                                <span className="ml-1 capitalize">{rate.status}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p className="font-medium text-gray-700">{rate.usage_count} fois</p>
                                <Progress value={totalUsage > 0 ? (rate.usage_count / totalUsage) * 100 : 0} className="w-16 h-2 mt-1" />
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Voir le détail"
                                  onClick={() => toast(`Détail : ${rate.libelle} — ${rate.taux}%`)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditModal(rate)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Dupliquer"
                                  onClick={() => handleDuplicateTaxRate(rate)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteTaxRate(rate.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── RULES ─────────────────────────────────────────────────────── */}
          <TabsContent value="rules" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Règles d'Application</span>
                  <Button className="bg-primary-600 hover:bg-primary-700" onClick={() => toast('Création de règle — fonctionnalité à venir', { icon: 'ℹ️' })}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvelle Règle
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {taxRules.map((rule) => (
                    <div key={rule.id} className="border rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{rule.name}</h3>
                          <p className="text-sm text-gray-600">{rule.description}</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge variant={rule.status === 'active' ? 'default' : 'outline'}>{rule.status}</Badge>
                          <Badge variant="outline">Priorité {rule.priority}</Badge>
                          {rule.auto_apply && <Badge className="bg-green-100 text-green-800">Auto</Badge>}
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Conditions:</h4>
                          <div className="space-y-1">
                            {rule.conditions.map((condition, idx) => (
                              <Badge key={idx} variant="outline" className="mr-1 mb-1">{condition}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Formule de calcul:</h4>
                          <code className="text-sm bg-gray-100 p-2 rounded block">{rule.formula}</code>
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2 mt-4 pt-4 border-t">
                        <Button size="sm" variant="outline" onClick={() => toast(`Test de la règle "${rule.name}" — fonctionnalité à venir`, { icon: 'ℹ️' })}><Eye className="mr-2 h-4 w-4" />Tester</Button>
                        <Button size="sm" variant="outline" onClick={() => toast(`Modification de la règle "${rule.name}" — fonctionnalité à venir`, { icon: 'ℹ️' })}><Edit className="mr-2 h-4 w-4" />Modifier</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── EXEMPTIONS ────────────────────────────────────────────────── */}
          <TabsContent value="exemptions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Exonérations et Réductions</span>
                  <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => toast('Création d\'exonération — fonctionnalité à venir', { icon: 'ℹ️' })}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvelle Exonération
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code/Libellé</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Réduction</TableHead>
                        <TableHead>Période</TableHead>
                        <TableHead>Conditions</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {exemptions.map((exemption) => (
                        <TableRow key={exemption.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div>
                              <Badge variant="outline" className="font-mono mb-1">{exemption.code}</Badge>
                              <p className="font-medium text-gray-900">{exemption.libelle}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={exemption.type_exemption === 'totale' ? 'default' : 'outline'}>
                              {exemption.type_exemption}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {exemption.type_exemption === 'totale' ? (
                              <span className="font-bold text-green-600">100%</span>
                            ) : (
                              <span className="font-bold text-orange-600">
                                {formatPercentage(exemption.taux_reduction || 0)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>Du {formatDate(exemption.date_debut)}</p>
                              {exemption.date_fin && <p>Au {formatDate(exemption.date_fin)}</p>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-x-1">
                              {exemption.conditions.slice(0, 2).map((condition, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">{condition}</Badge>
                              ))}
                              {exemption.conditions.length > 2 && (
                                <Badge variant="outline" className="text-xs">+{exemption.conditions.length - 2}</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(exemption.status)}`}>
                              {getStatusIcon(exemption.status)}
                              <span className="ml-1 capitalize">{exemption.status}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <Button variant="ghost" size="sm" title="Voir le détail" onClick={() => toast(`Détail exonération : ${exemption.libelle}`, { icon: 'ℹ️' })}><Eye className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" title="Modifier" onClick={() => toast(`Modification de l'exonération "${exemption.libelle}" — fonctionnalité à venir`, { icon: 'ℹ️' })}><Edit className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── SETTINGS ──────────────────────────────────────────────────── */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Paramètres Généraux</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Calcul Automatique</h3>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={taxSettings.auto_tva}
                          onChange={(e) => setTaxSettings(s => ({ ...s, auto_tva: e.target.checked }))}
                          className="form-checkbox"
                        />
                        <span className="text-sm text-gray-700">Application automatique des règles de TVA</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={taxSettings.auto_retenue}
                          onChange={(e) => setTaxSettings(s => ({ ...s, auto_retenue: e.target.checked }))}
                          className="form-checkbox"
                        />
                        <span className="text-sm text-gray-700">Calcul automatique des retenues à la source</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={taxSettings.validation_manuelle}
                          onChange={(e) => setTaxSettings(s => ({ ...s, validation_manuelle: e.target.checked }))}
                          className="form-checkbox"
                        />
                        <span className="text-sm text-gray-700">Validation manuelle des calculs d'impôts</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Arrondi</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Méthode d'arrondi</label>
                        <Select
                          value={taxSettings.arrondi_methode}
                          onValueChange={(v) => setTaxSettings(s => ({ ...s, arrondi_methode: v }))}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nearest">Au plus proche</SelectItem>
                            <SelectItem value="up">Arrondi supérieur</SelectItem>
                            <SelectItem value="down">Arrondi inférieur</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Précision</label>
                        <Select
                          value={taxSettings.arrondi_precision}
                          onValueChange={(v) => setTaxSettings(s => ({ ...s, arrondi_precision: v }))}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 FCFA</SelectItem>
                            <SelectItem value="5">5 FCFA</SelectItem>
                            <SelectItem value="10">10 FCFA</SelectItem>
                            <SelectItem value="100">100 FCFA</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (taxSettingsSetting) {
                          try {
                            setTaxSettings(JSON.parse(taxSettingsSetting.value));
                          } catch (parseErr) {
                            console.error('[TVATaxes] Erreur restauration paramètres:', parseErr);
                            toast.error('Impossible de restaurer les paramètres enregistrés');
                            setTaxSettings(DEFAULT_TAX_SETTINGS);
                          }
                        } else {
                          setTaxSettings(DEFAULT_TAX_SETTINGS);
                        }
                      }}
                    >
                      Annuler
                    </Button>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={handleSaveSettings}
                      disabled={isSavingSettings}
                    >
                      {isSavingSettings ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Sauvegarder
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ── Create / Edit Modal ─────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {editingRate ? 'Modifier le taux' : 'Nouveau taux de taxe'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                  <Input
                    value={modalForm.code ?? ''}
                    onChange={(e) => setModalForm(f => ({ ...f, code: e.target.value }))}
                    placeholder="TVA18"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Libellé *</label>
                  <Input
                    value={modalForm.libelle ?? ''}
                    onChange={(e) => setModalForm(f => ({ ...f, libelle: e.target.value }))}
                    placeholder="TVA normale 18%"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={modalForm.type ?? 'TVA'}
                    onChange={(e) => setModalForm(f => ({ ...f, type: e.target.value as TaxRate['type'] }))}
                  >
                    <option value="TVA">TVA</option>
                    <option value="TCA">TCA</option>
                    <option value="TAF">TAF</option>
                    <option value="IS">IS</option>
                    <option value="IRPP">IRPP</option>
                    <option value="TSS">TSS</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Taux (%)</label>
                  <Input
                    type="number"
                    value={modalForm.taux ?? 0}
                    onChange={(e) => setModalForm(f => ({ ...f, taux: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={modalForm.country ?? 'CI'}
                    onChange={(e) => setModalForm(f => ({ ...f, country: e.target.value }))}
                  >
                    <option value="CI">Côte d'Ivoire</option>
                    <option value="SN">Sénégal</option>
                    <option value="BF">Burkina Faso</option>
                    <option value="ML">Mali</option>
                    <option value="NE">Niger</option>
                    <option value="TG">Togo</option>
                    <option value="BJ">Bénin</option>
                    <option value="GN">Guinée</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={modalForm.status ?? 'active'}
                    onChange={(e) => setModalForm(f => ({ ...f, status: e.target.value as TaxRate['status'] }))}
                  >
                    <option value="active">Actif</option>
                    <option value="inactive">Inactif</option>
                    <option value="archived">Archivé</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Applicable depuis</label>
                  <Input
                    type="date"
                    value={modalForm.applicable_depuis ?? ''}
                    onChange={(e) => setModalForm(f => ({ ...f, applicable_depuis: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Applicable jusqu'au</label>
                  <Input
                    type="date"
                    value={modalForm.applicable_jusqu ?? ''}
                    onChange={(e) => setModalForm(f => ({ ...f, applicable_jusqu: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Compte collecte</label>
                  <Input
                    value={modalForm.compte_collecte ?? ''}
                    onChange={(e) => setModalForm(f => ({ ...f, compte_collecte: e.target.value }))}
                    placeholder="4431"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Compte déductible</label>
                  <Input
                    value={modalForm.compte_deductible ?? ''}
                    onChange={(e) => setModalForm(f => ({ ...f, compte_deductible: e.target.value }))}
                    placeholder="4452"
                  />
                </div>
              </div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={modalForm.is_default ?? false}
                  onChange={(e) => setModalForm(f => ({ ...f, is_default: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Taux par défaut</span>
              </label>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowModal(false)} disabled={isSavingRate}>
                Annuler
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleSaveRate}
                disabled={isSavingRate}
              >
                {isSavingRate ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {editingRate ? 'Enregistrer' : 'Créer'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TVATaxesPage;
