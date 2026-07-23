import React, { useState } from 'react';
import PageHeaderActions from '../../components/ui/PageHeaderActions';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Package,
  DollarSign,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Upload,
  Monitor,
  Truck,
  Wrench,
  QrCode,
  X
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
  Pagination,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui';
import { createImmobilisationSchema } from '../../services/modules/assets.service';
import { z } from 'zod';
import { formatCurrency, formatDate, formatPercentage } from '../../lib/utils';
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';
import ExportMenu from '../../components/shared/ExportMenu';
import { toast } from 'react-hot-toast';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { safeAddEntry } from '../../services/entryGuard';
import { AssetClassificationService } from '../../data/assetClassification';

/**
 * Résout les comptes SYSCOHADA (immo + amortissement) et la durée d'utilité à
 * partir de la catégorie choisie. Garantit un compte VALIDE (jamais vide, sinon
 * la classe de bilan et l'écriture d'amortissement/cession seraient fausses).
 */
function resolveAssetAccounts(categorie: string): { accountCode: string; depreciationAccountCode: string; usefulLife?: number } {
  return AssetClassificationService.resolveAccounts(categorie);
}

interface AssetsFilters {
  search: string;
  categorie: string;
  statut: string;
  localisation: string;
  date_acquisition_debut: string;
  date_acquisition_fin: string;
  valeur_min: string;
  valeur_max: string;
}

const FixedAssetsPage: React.FC = () => {
  const { t } = useLanguage();
  const { adapter } = useData();
  const [filters, setFilters] = useState<AssetsFilters>({
    search: '',
    categorie: '',
    statut: '',
    localisation: '',
    date_acquisition_debut: '',
    date_acquisition_fin: '',
    valeur_min: '',
    valeur_max: ''
  });
  const [page, setPage] = useState(1);
  const [selectedAsset, setSelectedAsset] = useState<Record<string, unknown> | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    designation: '',
    categorie: '',
    localisation: '',
    fournisseur: '',
    date_acquisition: '',
    montant_acquisition: 0,
    duree_amortissement: 5,
    methode_amortissement: 'lineaire' as 'lineaire' | 'degressive' | 'unites_oeuvre' | 'exceptionnelle',
    statut: 'en_service' as 'en_service' | 'en_maintenance' | 'hors_service' | 'cede',
    numero_serie: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showEditModal, setShowEditModal] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState<Record<string, unknown> | null>(null);
  const [editFormData, setEditFormData] = useState({
    code: '',
    designation: '',
    categorie: '',
    localisation: '',
    fournisseur: '',
    date_acquisition: '',
    montant_acquisition: 0,
    duree_amortissement: 5,
    methode_amortissement: 'lineaire' as 'lineaire' | 'degressive' | 'unites_oeuvre' | 'exceptionnelle',
    statut: 'en_service' as string,
    numero_serie: '',
    description: '',
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; assetId: string | null }>({
    isOpen: false,
    assetId: null,
  });

  const queryClient = useQueryClient();

  // Create immobilisation mutation — uses adapter directly (Bug #6 fix)
  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const code = String(data.code || '').trim();
      const montant = (data.montant_acquisition as number) || (data.valeur_acquisition as number) || 0;
      const dateAcq = String(data.date_acquisition || '');
      // Validation : unicité du code + valeurs cohérentes.
      const existing = await adapter.getAll<any>('assets');
      if (existing.some(a => String(a.code || '').trim().toLowerCase() === code.toLowerCase())) {
        throw new Error(t('fixedAssets.codeExists', { code }));
      }
      if (montant <= 0) throw new Error(t('fixedAssets.valuePositive'));
      if (dateAcq && new Date(dateAcq).getTime() > Date.now()) throw new Error(t('fixedAssets.dateNotFuture'));

      // Comptes SYSCOHADA dérivés de la catégorie (jamais vides).
      const cat = String(data.categorie || '').trim();
      const { accountCode, depreciationAccountCode } = resolveAssetAccounts(cat);
      const isTerrain = accountCode.startsWith('22');
      const assetId = crypto.randomUUID();
      const dbData = {
        id: assetId,
        code,
        name: data.designation,
        category: cat || 'AUTRE',
        acquisitionDate: dateAcq,
        acquisitionValue: montant,
        residualValue: 0,
        // La table contraint depreciation_method IN ('linear','declining').
        // Un terrain (durée 0) n'est pas amorti : le moteur ne génère aucune
        // dotation quand usefulLifeYears = 0.
        depreciationMethod: data.methode_amortissement === 'degressive' ? 'declining' : 'linear',
        usefulLifeYears: isTerrain ? 0 : ((data.duree_amortissement as number) || 5),
        accountCode,
        depreciationAccountCode,
        status: 'active',
        location: data.localisation,
        cumulDepreciation: 0,
      };
      await adapter.create('assets', dbData);

      // Écriture d'ACQUISITION SYSCOHADA : Dr 2x immobilisation / Cr 481
      // (fournisseurs d'investissements). Sans elle, le registre et le bilan
      // divergent (l'immo n'existe qu'au registre, pas en comptabilité).
      try {
        await safeAddEntry(adapter, {
          id: crypto.randomUUID(),
          entryNumber: `IMMO-${code}`,
          journal: 'OD',
          date: dateAcq || new Date().toISOString().split('T')[0],
          reference: `IMMO-ACQ-${assetId}`,
          label: `Acquisition immobilisation — ${String(data.designation || code)}`,
          status: 'validated',
          lines: [
            { id: crypto.randomUUID(), accountCode, accountName: String(data.designation || 'Immobilisation'), label: `Acquisition ${code}`, debit: montant, credit: 0 },
            { id: crypto.randomUUID(), accountCode: '481', accountName: "Fournisseurs d'investissements", label: `Dette acquisition ${code}`, debit: 0, credit: montant },
          ],
          createdAt: new Date().toISOString(),
          createdBy: 'system',
        } as any, { skipSyncValidation: true });
      } catch (e) {
        // L'immo est créée ; on remonte l'échec d'écriture sans bloquer la fiche.
        console.error('Écriture d\'acquisition non postée', e);
        throw new Error(t('fixedAssets.acqEntryFailed', { error: (e as Error).message || '' }));
      }
      return dbData;
    },
    onSuccess: () => {
      toast.success(t('fixedAssets.createdSuccess'));
      queryClient.invalidateQueries({ queryKey: ['fixed-assets'] });
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      setShowCreateModal(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || t('fixedAssets.createError'));
    },
  });

  // Update immobilisation mutation — Bug #1 fix
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const current = await adapter.getById<any>('assets', id);
      const cat = String(data.categorie || 'AUTRE');
      // Backfill / recalcul des comptes si absents ou si la catégorie a changé.
      const needAccounts = !current?.accountCode || String(current.category || '') !== cat;
      const resolved = needAccounts ? resolveAssetAccounts(cat) : null;
      const updates: Record<string, unknown> = {
        code: data.code,
        name: data.designation,
        category: cat,
        acquisitionDate: data.date_acquisition,
        acquisitionValue: (data.montant_acquisition as number) || (data.valeur_acquisition as number) || 0,
        depreciationMethod: data.methode_amortissement === 'degressive' ? 'declining' : 'linear',
        usefulLifeYears: (data.duree_amortissement as number) || 5,
        location: data.localisation,
      };
      if (resolved) {
        updates.accountCode = resolved.accountCode;
        updates.depreciationAccountCode = resolved.depreciationAccountCode;
      }
      return adapter.update('assets', id, updates);
    },
    onSuccess: () => {
      toast.success(t('fixedAssets.updatedSuccess'));
      queryClient.invalidateQueries({ queryKey: ['fixed-assets'] });
      setShowEditModal(false);
      setAssetToEdit(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || t('fixedAssets.updateError'));
    },
  });

  // Fetch fixed assets — Bug #6 fix: use adapter.getAll('assets')
  const { data: assetsData, isLoading } = useQuery({
    queryKey: ['fixed-assets', 'list', page, filters],
    queryFn: async () => {
      const all = await adapter.getAll<any>('assets');
      let filtered = all as any[];
      if (filters.search) {
        const s = filters.search.toLowerCase();
        filtered = filtered.filter(a =>
          String(a.name || '').toLowerCase().includes(s) ||
          String(a.code || '').toLowerCase().includes(s)
        );
      }
      if (filters.categorie) filtered = filtered.filter(a => a.category === filters.categorie);
      if (filters.statut) filtered = filtered.filter(a => a.status === filters.statut);
      if (filters.localisation) {
        const loc = filters.localisation.toLowerCase();
        filtered = filtered.filter(a => String(a.location || '').toLowerCase().includes(loc));
      }
      // Warning #15 fix: apply value range filters
      if (filters.valeur_min) {
        const minVal = parseFloat(filters.valeur_min);
        if (!isNaN(minVal)) filtered = filtered.filter(a => ((a.acquisitionValue as number) || 0) >= minVal);
      }
      if (filters.valeur_max) {
        const maxVal = parseFloat(filters.valeur_max);
        if (!isNaN(maxVal)) filtered = filtered.filter(a => ((a.acquisitionValue as number) || 0) <= maxVal);
      }
      const total = filtered.length;
      const pageSize = 20;
      const start = (page - 1) * pageSize;
      const results = filtered.slice(start, start + pageSize).map(a => ({
        id: a.id,
        code_immobilisation: a.code,
        designation: a.name,
        categorie: a.category,
        nom_categorie: a.category,
        date_acquisition: a.acquisitionDate,
        valeur_acquisition: a.acquisitionValue,
        amortissements_cumules: a.cumulDepreciation || 0,
        valeur_nette: (a.acquisitionValue as number) - ((a.cumulDepreciation as number) || 0),
        pourcentage_amortissement: (a.acquisitionValue as number) > 0
          ? Math.round(((a.cumulDepreciation as number || 0) / (a.acquisitionValue as number)) * 100)
          : 0,
        statut: a.status,
        localisation: a.location,
        numero_serie: a.numeroSerie,
        responsable: a.responsable,
        fournisseur: a.fournisseur,
        // keep original for edit
        _raw: a,
      }));
      // Warning #16 fix: compute maintenance_count from actual asset status
      const maintenanceCount = filtered.filter(a => a.status === 'en_maintenance' || a.status === 'maintenance').length;
      return { results, count: total, total_value: filtered.reduce((s, a) => s + ((a.acquisitionValue as number) || 0), 0), total_depreciation: filtered.reduce((s, a) => s + ((a.cumulDepreciation as number) || 0), 0), maintenance_count: maintenanceCount };
    },
  });

  // Fetch categories for selection — Bug #6 fix: derive from assets
  const { data: categories } = useQuery({
    queryKey: ['asset-categories', 'list'],
    queryFn: async () => {
      // Référentiel SYSCOHADA (comptes garantis) + catégories déjà présentes.
      const catalog = AssetClassificationService.getAllClassifications().map(c => ({
        id: c.categoryCode, code: c.categoryCode, nom: c.assetCategory,
      }));
      const all = await adapter.getAll('assets') as Array<Record<string, unknown>>;
      const known = new Set(catalog.map(c => c.code));
      const extra = [...new Set(all.map(a => a.category as string).filter(Boolean))]
        .filter(c => !known.has(c))
        .map((c) => ({ id: c, code: c, nom: c }));
      return [...catalog, ...extra];
    },
  });

  // Delete asset mutation — Bug #6 fix
  const deleteAssetMutation = useMutation({
    mutationFn: async (assetId: string) => {
      // Blocage : un bien amorti, sorti ou mouvementé ne se supprime pas (piste
      // d'audit). Il doit être CÉDÉ (écriture de sortie), pas effacé.
      const asset = await adapter.getById<any>('assets', assetId);
      if (!asset) throw new Error(t('fixedAssets.assetNotFound'));
      if ((Number(asset.cumulDepreciation) || 0) > 0) {
        throw new Error(t('fixedAssets.deleteForbiddenDepreciated'));
      }
      if (asset.status && asset.status !== 'active') {
        throw new Error(t('fixedAssets.deleteForbiddenInactive'));
      }
      // Refus si des écritures comptables référencent l'actif.
      const entries = await adapter.getAll<any>('journalEntries');
      const referenced = entries.some(e => String(e.reference || '').includes(assetId));
      if (referenced) {
        throw new Error(t('fixedAssets.deleteForbiddenLinked'));
      }
      return adapter.delete('assets', assetId);
    },
    onSuccess: () => {
      toast.success(t('fixedAssets.deletedSuccess'));
      queryClient.invalidateQueries({ queryKey: ['fixed-assets'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || t('fixedAssets.deleteError'));
    }
  });

  const handleDeleteAsset = (assetId: string) => {
    setDeleteConfirm({ isOpen: true, assetId });
  };

  const handleFilterChange = (key: keyof AssetsFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      categorie: '',
      statut: '',
      localisation: '',
      date_acquisition_debut: '',
      date_acquisition_fin: '',
      valeur_min: '',
      valeur_max: ''
    });
    setPage(1);
  };

  const resetForm = () => {
    setFormData({
      code: '',
      designation: '',
      categorie: '',
      localisation: '',
      fournisseur: '',
      date_acquisition: '',
      montant_acquisition: 0,
      duree_amortissement: 5,
      methode_amortissement: 'lineaire',
      statut: 'en_service',
      numero_serie: '',
      description: '',
    });
    setErrors({});
    setIsSubmitting(false);
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setErrors({});

      // Validate with Zod — schema now accepts both montant_acquisition and methode_amortissement (Bug #2 fix)
      const validatedData = createImmobilisationSchema.parse(formData);

      // Submit via adapter mutation
      await createMutation.mutateAsync(validatedData as unknown as Record<string, unknown>);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Map Zod errors to form fields
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as string;
          fieldErrors[field] = err.message;
        });
        setErrors(fieldErrors);
        toast.error(t('fixedAssets.fixFormErrors'));
      } else {
        toast.error(t('fixedAssets.createError'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryIcon = (categorie: string) => {
    switch (categorie) {
      case 'materiel_informatique': return <Monitor className="h-4 w-4" />;
      case 'vehicules': return <Truck className="h-4 w-4" />;
      case 'mobilier': return <Package className="h-4 w-4" />;
      case 'equipements': return <Wrench className="h-4 w-4" />;
      default: return <Building className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (categorie: string) => {
    switch (categorie) {
      case 'materiel_informatique': return 'bg-blue-100 text-blue-800';
      case 'vehicules': return 'bg-green-100 text-green-800';
      case 'mobilier': return 'bg-primary-100 text-primary-800';
      case 'equipements': return 'bg-orange-100 text-orange-800';
      case 'immobilier': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'en_service': return 'bg-green-100 text-green-800';
      case 'en_maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'hors_service': return 'bg-red-100 text-red-800';
      case 'cede': return 'bg-gray-100 text-gray-800';
      case 'reforme': return 'bg-primary-100 text-primary-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (statut: string) => {
    switch (statut) {
      case 'en_service': return t('fixedAssets.statusInService');
      case 'en_maintenance': return t('fixedAssets.maintenanceLabel');
      case 'hors_service': return t('fixedAssets.statusOutOfService');
      case 'cede': return t('fixedAssets.statusDisposed');
      case 'reforme': return t('fixedAssets.statusRetired');
      default: return statut;
    }
  };

  const getDepreciationStatusColor = (pourcentage: number) => {
    if (pourcentage >= 100) return 'bg-gray-100 text-gray-800';
    if (pourcentage >= 80) return 'bg-red-100 text-red-800';
    if (pourcentage >= 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const generateQRCode = async (assetId: string) => {
    // QR Code generation requires a third-party integration — not yet implemented.
    toast(t('fixedAssets.qrCodeInfo'), { icon: 'ℹ️' });
    void assetId;
  };

  const handleOpenEditModal = (asset: Record<string, unknown>) => {
    setAssetToEdit(asset);
    const raw = asset._raw as Record<string, unknown> | undefined;
    // Read depreciation params from the raw DB record to avoid losing existing values (Warning #14 fix)
    const rawDuree = raw ? ((raw.usefulLifeYears as number) || 5) : 5;
    const rawMethode = raw
      ? ((raw.depreciationMethod as string) === 'declining' ? 'degressive' : 'lineaire')
      : 'lineaire';
    setEditFormData({
      code: String(asset.code_immobilisation || ''),
      designation: String(asset.designation || ''),
      categorie: String(asset.categorie || ''),
      localisation: String(asset.localisation || ''),
      fournisseur: String(asset.fournisseur || ''),
      date_acquisition: String(asset.date_acquisition || ''),
      montant_acquisition: (asset.valeur_acquisition as number) || 0,
      duree_amortissement: rawDuree,
      methode_amortissement: rawMethode as 'lineaire' | 'degressive' | 'unites_oeuvre' | 'exceptionnelle',
      statut: String(asset.statut || 'en_service'),
      numero_serie: String(asset.numero_serie || ''),
      description: String(raw?.description || ''),
    });
    setEditErrors({});
    setShowEditModal(true);
  };

  const handleEditInputChange = (field: string, value: string | number) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
    if (editErrors[field]) {
      setEditErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
    }
  };

  const handleEditSubmit = async () => {
    if (!assetToEdit) return;
    try {
      setIsEditSubmitting(true);
      setEditErrors({});
      if (!editFormData.code) { setEditErrors({ code: t('fixedAssets.codeRequired') }); setIsEditSubmitting(false); return; }
      if (!editFormData.designation) { setEditErrors({ designation: t('fixedAssets.designationRequired') }); setIsEditSubmitting(false); return; }
      await updateMutation.mutateAsync({ id: String(assetToEdit.id), data: editFormData as unknown as Record<string, unknown> });
    } catch (error) {
      console.error('[FixedAssetsPage] edit submit error:', error);
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as string;
          fieldErrors[field] = err.message;
        });
        setEditErrors(fieldErrors);
        toast.error(t('fixedAssets.fixFormErrors'));
      } else {
        toast.error((error as Error).message || t('fixedAssets.updateError'));
      }
    } finally {
      setIsEditSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center">
              <Building className="mr-3 h-7 w-7" />
              {t('fixedAssets.pageTitle')}
            </h1>
            <p className="mt-2 text-[var(--color-text-secondary)]">
              {t('fixedAssets.pageSubtitle')}
            </p>
          </div>
          <div className="flex space-x-3">
            <PageHeaderActions />
            <ExportMenu
              data={assetsData?.results || []}
              filename="immobilisations"
              columns={{
                code_immobilisation: t('fixedAssets.colCode'),
                designation: t('fixedAssets.colDesignation'),
                nom_categorie: t('fixedAssets.colCategory'),
                date_acquisition: t('fixedAssets.colAcquisitionDate'),
                localisation: t('fixedAssets.colLocation'),
                valeur_acquisition: t('fixedAssets.colAcquisitionValue'),
                amortissements_cumules: t('fixedAssets.depreciation'),
                valeur_nette: t('fixedAssets.colNetValue'),
                pourcentage_amortissement: t('fixedAssets.colPctDepreciated'),
                statut: t('fixedAssets.colStatus')
              }}
            />
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              {t('fixedAssets.import')}
            </Button>
            <Button
              className="bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-white"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('fixedAssets.newAsset')}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-100 rounded-full">
                <Building className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">{t('fixedAssets.statTotalAssets')}</p>
                <p className="text-lg font-bold text-gray-900">
                  {assetsData?.count || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-100 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">{t('fixedAssets.statTotalValue')}</p>
                <p className="text-lg font-bold text-green-700">
                  {formatCurrency(assetsData?.total_value || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-primary-100 rounded-full">
                <TrendingDown className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">{t('fixedAssets.depreciation')}</p>
                <p className="text-lg font-bold text-primary-700">
                  {formatCurrency(assetsData?.total_depreciation || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">{t('fixedAssets.statInMaintenance')}</p>
                <p className="text-lg font-bold text-red-700">
                  {assetsData?.maintenance_count || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            {t('fixedAssets.filtersTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-8">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-700" />
              <Input
                placeholder={t('fixedAssets.searchPlaceholder')}
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filters.categorie} onValueChange={(value) => handleFilterChange('categorie', value)}>
              <SelectTrigger>
                <SelectValue placeholder={t('fixedAssets.allCategoriesPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('fixedAssets.allCategoriesItem')}</SelectItem>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.code}>
                    {category.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.statut} onValueChange={(value) => handleFilterChange('statut', value)}>
              <SelectTrigger>
                <SelectValue placeholder={t('fixedAssets.allStatusesPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('fixedAssets.allStatusesItem')}</SelectItem>
                <SelectItem value="en_service">{t('fixedAssets.statusInService')}</SelectItem>
                <SelectItem value="en_maintenance">{t('fixedAssets.statusInMaintenance')}</SelectItem>
                <SelectItem value="hors_service">{t('fixedAssets.statusOutOfService')}</SelectItem>
                <SelectItem value="cede">{t('fixedAssets.statusDisposed')}</SelectItem>
                <SelectItem value="reforme">{t('fixedAssets.statusRetired')}</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder={t('fixedAssets.locationPlaceholder')}
              value={filters.localisation}
              onChange={(e) => handleFilterChange('localisation', e.target.value)}
            />

            <Button
              variant="outline"
              onClick={() => setShowPeriodModal(true)}
              className="flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              {t('fixedAssets.selectPeriod')}
            </Button>

            <Input
              type="number"
              placeholder={t('fixedAssets.valueMinPlaceholder')}
              value={filters.valeur_min}
              onChange={(e) => handleFilterChange('valeur_min', e.target.value)}
            />

            <Input
              type="number"
              placeholder={t('fixedAssets.valueMaxPlaceholder')}
              value={filters.valeur_max}
              onChange={(e) => handleFilterChange('valeur_max', e.target.value)}
            />
          </div>
          
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={resetFilters}>
              {t('fixedAssets.reset')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Assets Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('fixedAssets.listTitle')}</span>
            {assetsData && (
              <Badge variant="outline">
                {t('fixedAssets.assetsCount', { count: String(assetsData.count) })}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" text={t('fixedAssets.loadingAssets')} />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('fixedAssets.thCodeDesignation')}</TableHead>
                      <TableHead>{t('fixedAssets.colCategory')}</TableHead>
                      <TableHead>{t('fixedAssets.colAcquisitionDate')}</TableHead>
                      <TableHead>{t('fixedAssets.colLocation')}</TableHead>
                      <TableHead className="text-right">{t('fixedAssets.thAcquisitionValueShort')}</TableHead>
                      <TableHead className="text-right">{t('fixedAssets.depreciation')}</TableHead>
                      <TableHead className="text-right">{t('fixedAssets.colNetValue')}</TableHead>
                      <TableHead>{t('fixedAssets.colPctDepreciated')}</TableHead>
                      <TableHead>{t('fixedAssets.colStatus')}</TableHead>
                      <TableHead className="text-right">{t('fixedAssets.thActions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assetsData?.results?.map((asset) => (
                      <TableRow key={asset.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-gray-100 rounded-full">
                              {getCategoryIcon(asset.categorie)}
                            </div>
                            <div>
                              <p className="font-medium text-[var(--color-text-primary)]">{asset.designation}</p>
                              <p className="text-sm text-[var(--color-text-secondary)] font-mono">
                                {asset.code_immobilisation}
                              </p>
                              {asset.numero_serie && (
                                <p className="text-xs text-gray-700">
                                  {t('fixedAssets.snPrefix')} {asset.numero_serie}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getCategoryColor(asset.categorie)}>
                            {asset.nom_categorie}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm">
                            <Calendar className="h-4 w-4 text-gray-700 mr-2" />
                            {formatDate(asset.date_acquisition)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {asset.localisation && (
                              <p className="font-medium">{asset.localisation}</p>
                            )}
                            {asset.responsable && (
                              <p className="text-gray-600">{asset.responsable}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-gray-700">
                            {formatCurrency(asset.valeur_acquisition)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-blue-700">
                            {formatCurrency(asset.amortissements_cumules)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-green-700">
                            {formatCurrency(asset.valeur_nette)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getDepreciationStatusColor(asset.pourcentage_amortissement)}>
                            {formatPercentage(asset.pourcentage_amortissement)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(asset.statut)}>
                            {getStatusLabel(asset.statut)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedAsset(asset)}
                              aria-label={t('fixedAssets.viewDetails')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => generateQRCode(asset.id)}
                              aria-label={t('fixedAssets.qrCode')}
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditModal(asset)}
                              aria-label={t('fixedAssets.edit')}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAsset(asset.id)}
                              className="text-red-600 hover:text-red-700"
                              aria-label={t('fixedAssets.delete')}
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

              {/* Pagination */}
              {assetsData && assetsData.count > 0 && (
                <div className="mt-6">
                  <Pagination
                    currentPage={page}
                    totalPages={Math.ceil(assetsData.count / 20)}
                    onPageChange={setPage}
                  />
                </div>
              )}

              {(!assetsData?.results || assetsData.results.length === 0) && (
                <div className="text-center py-12">
                  <Building className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t('fixedAssets.noAssetsFound')}</h3>
                  <p className="text-gray-700 mb-6">
                    {Object.values(filters).some(f => f)
                      ? t('fixedAssets.noAssetsMatch')
                      : t('fixedAssets.noAssetsStart')}
                  </p>
                  <Button 
                    className="bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-white"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t('fixedAssets.createAsset')}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Asset Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            {/* Sticky header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                  <Building className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">{t('fixedAssets.createModalTitle')}</h2>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                disabled={isSubmitting}
                className="text-gray-700 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {/* Info alert */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-900 mb-1">{t('fixedAssets.infoAlertTitle')}</h4>
                      <p className="text-sm text-blue-800">{t('fixedAssets.infoAlertText')}</p>
                    </div>
                  </div>
                </div>

                {/* Basic Information */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">{t('fixedAssets.sectionGeneral')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('fixedAssets.fieldCodeRequired')}</label>
                      <Input
                        placeholder="IMM-2024-001"
                        value={formData.code}
                        onChange={(e) => handleInputChange('code', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.code && (
                        <p className="mt-1 text-sm text-red-600">{errors.code}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('fixedAssets.fieldDesignationRequired')}</label>
                      <Input
                        placeholder={t('fixedAssets.designationPlaceholder')}
                        value={formData.designation}
                        onChange={(e) => handleInputChange('designation', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.designation && (
                        <p className="mt-1 text-sm text-red-600">{errors.designation}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('fixedAssets.fieldCategoryRequired')}</label>
                      <Select
                        value={formData.categorie}
                        onValueChange={(value) => handleInputChange('categorie', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('fixedAssets.selectCategoryPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          {categories?.map((category) => (
                            <SelectItem key={category.id} value={category.code}>
                              {category.nom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.categorie && (
                        <p className="mt-1 text-sm text-red-600">{errors.categorie}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('fixedAssets.fieldSerialNumber')}</label>
                      <Input
                        placeholder="ABC123XYZ..."
                        value={formData.numero_serie}
                        onChange={(e) => handleInputChange('numero_serie', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.numero_serie && (
                        <p className="mt-1 text-sm text-red-600">{errors.numero_serie}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Financial Information */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">{t('fixedAssets.sectionFinancial')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('fixedAssets.fieldAcquisitionValueRequired')}</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={formData.montant_acquisition}
                        onChange={(e) => handleInputChange('montant_acquisition', parseFloat(e.target.value) || 0)}
                        disabled={isSubmitting}
                      />
                      {errors.montant_acquisition && (
                        <p className="mt-1 text-sm text-red-600">{errors.montant_acquisition}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('fixedAssets.fieldAcquisitionDateRequired')}</label>
                      <Input
                        type="date"
                        value={formData.date_acquisition}
                        onChange={(e) => handleInputChange('date_acquisition', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.date_acquisition && (
                        <p className="mt-1 text-sm text-red-600">{errors.date_acquisition}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('fixedAssets.fieldDurationRequired')}</label>
                      <Input
                        type="number"
                        min="1"
                        max="50"
                        placeholder="5"
                        value={formData.duree_amortissement}
                        onChange={(e) => handleInputChange('duree_amortissement', parseInt(e.target.value) || 1)}
                        disabled={isSubmitting}
                      />
                      {errors.duree_amortissement && (
                        <p className="mt-1 text-sm text-red-600">{errors.duree_amortissement}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('fixedAssets.fieldMethodRequired')}</label>
                      <Select
                        value={formData.methode_amortissement}
                        onValueChange={(value) => handleInputChange('methode_amortissement', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('fixedAssets.selectMethodPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lineaire">{t('fixedAssets.methodLinear')}</SelectItem>
                          <SelectItem value="degressive">{t('fixedAssets.methodDeclining')}</SelectItem>
                          <SelectItem value="unites_oeuvre">{t('fixedAssets.methodUnits')}</SelectItem>
                          <SelectItem value="exceptionnelle">{t('fixedAssets.methodExceptional')}</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.methode_amortissement && (
                        <p className="mt-1 text-sm text-red-600">{errors.methode_amortissement}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Location and Status */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">{t('fixedAssets.sectionLocationStatus')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('fixedAssets.fieldLocation')}</label>
                      <Input
                        placeholder={t('fixedAssets.locationExamplePlaceholder')}
                        value={formData.localisation}
                        onChange={(e) => handleInputChange('localisation', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.localisation && (
                        <p className="mt-1 text-sm text-red-600">{errors.localisation}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('fixedAssets.fieldSupplier')}</label>
                      <Input
                        placeholder={t('fixedAssets.supplierPlaceholder')}
                        value={formData.fournisseur}
                        onChange={(e) => handleInputChange('fournisseur', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.fournisseur && (
                        <p className="mt-1 text-sm text-red-600">{errors.fournisseur}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('fixedAssets.fieldStatus')}</label>
                      <Select
                        value={formData.statut}
                        onValueChange={(value) => handleInputChange('statut', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('fixedAssets.selectStatusPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en_service">{t('fixedAssets.statusInService')}</SelectItem>
                          <SelectItem value="en_maintenance">{t('fixedAssets.statusInMaintenance')}</SelectItem>
                          <SelectItem value="hors_service">{t('fixedAssets.statusOutOfService')}</SelectItem>
                          <SelectItem value="cede">{t('fixedAssets.statusDisposed')}</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.statut && (
                        <p className="mt-1 text-sm text-red-600">{errors.statut}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">{t('fixedAssets.sectionAdditional')}</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('fixedAssets.fieldDescription')}</label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder={t('fixedAssets.descriptionPlaceholder')}
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.description && (
                        <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                disabled={isSubmitting}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('fixedAssets.cancel')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed" aria-label={t('fixedAssets.validate')}>
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>{t('fixedAssets.creating')}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>{t('actions.create')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Asset Modal — Bug #1 fix */}
      {showEditModal && assetToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                  <Edit className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">{t('fixedAssets.editModalTitle')}</h2>
              </div>
              <button onClick={() => { setShowEditModal(false); setAssetToEdit(null); }} disabled={isEditSubmitting} className="text-gray-700 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('fixedAssets.fieldCodeRequired')}</label>
                    <Input value={editFormData.code} onChange={(e) => handleEditInputChange('code', e.target.value)} disabled={isEditSubmitting} />
                    {editErrors.code && <p className="mt-1 text-sm text-red-600">{editErrors.code}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('fixedAssets.fieldDesignationRequired')}</label>
                    <Input value={editFormData.designation} onChange={(e) => handleEditInputChange('designation', e.target.value)} disabled={isEditSubmitting} />
                    {editErrors.designation && <p className="mt-1 text-sm text-red-600">{editErrors.designation}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('fixedAssets.colCategory')}</label>
                    <Select
                      value={editFormData.categorie}
                      onValueChange={(value) => handleEditInputChange('categorie', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('fixedAssets.selectCategoryPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((category) => (
                          <SelectItem key={category.id} value={category.code}>
                            {category.nom}
                          </SelectItem>
                        ))}
                        {/* Fallback options always present */}
                        <SelectItem value="materiel_informatique">{t('fixedAssets.catMaterielInfo')}</SelectItem>
                        <SelectItem value="vehicules">{t('fixedAssets.catVehicules')}</SelectItem>
                        <SelectItem value="mobilier">{t('fixedAssets.catMobilier')}</SelectItem>
                        <SelectItem value="equipements">{t('fixedAssets.catEquipements')}</SelectItem>
                        <SelectItem value="immobilier">{t('fixedAssets.catImmobilier')}</SelectItem>
                        <SelectItem value="AUTRE">{t('fixedAssets.catAutre')}</SelectItem>
                      </SelectContent>
                    </Select>
                    {editErrors.categorie && <p className="mt-1 text-sm text-red-600">{editErrors.categorie}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('fixedAssets.fieldSerialNumber')}</label>
                    <Input value={editFormData.numero_serie} onChange={(e) => handleEditInputChange('numero_serie', e.target.value)} disabled={isEditSubmitting} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('fixedAssets.fieldAcquisitionValue')}</label>
                    <Input type="number" step="0.01" min="0" value={editFormData.montant_acquisition} onChange={(e) => handleEditInputChange('montant_acquisition', parseFloat(e.target.value) || 0)} disabled={isEditSubmitting} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('fixedAssets.fieldAcquisitionDate')}</label>
                    <Input type="date" value={editFormData.date_acquisition} onChange={(e) => handleEditInputChange('date_acquisition', e.target.value)} disabled={isEditSubmitting} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('fixedAssets.fieldDuration')}</label>
                    <Input type="number" min="1" max="50" value={editFormData.duree_amortissement} onChange={(e) => handleEditInputChange('duree_amortissement', parseInt(e.target.value) || 1)} disabled={isEditSubmitting} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('fixedAssets.fieldLocation')}</label>
                    <Input value={editFormData.localisation} onChange={(e) => handleEditInputChange('localisation', e.target.value)} disabled={isEditSubmitting} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('fixedAssets.fieldSupplier')}</label>
                    <Input value={editFormData.fournisseur} onChange={(e) => handleEditInputChange('fournisseur', e.target.value)} disabled={isEditSubmitting} />
                  </div>
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg flex justify-end space-x-3">
              <button onClick={() => { setShowEditModal(false); setAssetToEdit(null); }} disabled={isEditSubmitting} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50">
                {t('fixedAssets.cancel')}
              </button>
              <button onClick={handleEditSubmit} disabled={isEditSubmitting} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50">
                {isEditSubmitting ? <><LoadingSpinner size="sm" /><span>{t('fixedAssets.saving')}</span></> : <><CheckCircle className="w-4 h-4" /><span>{t('fixedAssets.save')}</span></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de sélection de période */}
      <PeriodSelectorModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        onApply={(newDateRange) => {
          setDateRange(newDateRange);
          handleFilterChange('date_acquisition_debut', newDateRange.start);
          handleFilterChange('date_acquisition_fin', newDateRange.end);
        }}
        initialDateRange={dateRange}
      />

      {/* Confirmation suppression actif */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, assetId: null })}
        onConfirm={() => {
          if (deleteConfirm.assetId) deleteAssetMutation.mutate(deleteConfirm.assetId);
          setDeleteConfirm({ isOpen: false, assetId: null });
        }}
        title={t('fixedAssets.deleteConfirmTitle')}
        message={t('fixedAssets.deleteConfirmMessage')}
        variant="danger"
        confirmText={t('fixedAssets.delete')}
        cancelText={t('fixedAssets.cancel')}
        confirmLoading={deleteAssetMutation.isPending}
      />
    </div>
  );
};

export default FixedAssetsPage;