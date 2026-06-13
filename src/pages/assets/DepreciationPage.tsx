import React, { useState } from 'react';
import PageHeaderActions from '../../components/ui/PageHeaderActions';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TrendingDown,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Calculator,
  DollarSign,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Upload,
  Play,
  Pause,
  RefreshCw,
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
import { createAmortissementSchema } from '../../services/modules/assets.service';
import { z } from 'zod';
import { formatCurrency, formatDate } from '../../lib/utils';
import { toast } from 'react-hot-toast';
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';
import ExportMenu from '../../components/shared/ExportMenu';
import { useData } from '../../contexts/DataContext';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

interface DepreciationRecord {
  id: string;
  immobilisation_id?: string;
  exercice?: string;
  date_amortissement: string;
  nom_actif: string;
  code_actif: string;
  methode: string;
  periode: string;
  valeur_base: number;
  taux_amortissement: number;
  montant_dotation: number;
  cumul_amortissements: number;
  valeur_nette_comptable: number;
  statut: string;
  date_debut?: string;
  date_fin?: string;
}

interface DepreciationFilters {
  search: string;
  actif: string;
  methode: string;
  periode: string;
  statut: string;
  date_debut: string;
  date_fin: string;
}

const DepreciationPage: React.FC = () => {
  const { t } = useLanguage();
  const { adapter } = useData();
  const [filters, setFilters] = useState<DepreciationFilters>({
    search: '',
    actif: '',
    methode: '',
    periode: '',
    statut: '',
    date_debut: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    date_fin: new Date().toISOString().split('T')[0]
  });
  const [page, setPage] = useState(1);
  const [selectedDepreciation, setSelectedDepreciation] = useState<DepreciationRecord | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [calculationMode, setCalculationMode] = useState<'manuel' | 'auto'>('auto');
  const [formData, setFormData] = useState({
    immobilisation_id: '',
    exercice: new Date().getFullYear().toString(),
    montant: 0,
    date_debut: '',
    date_fin: '',
    methode: 'lineaire' as 'lineaire' | 'degressive' | 'unites_oeuvre' | 'exceptionnelle',
    justification: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showComptabiliserModal, setShowComptabiliserModal] = useState(false);
  const [showEditDepreciationModal, setShowEditDepreciationModal] = useState(false);
  const [depreciationToEdit, setDepreciationToEdit] = useState<DepreciationRecord | null>(null);
  const [deleteDeprecConfirm, setDeleteDeprecConfirm] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  const [calcConfirm, setCalcConfirm] = useState(false);
  const [comptabiliserToutConfirm, setComptabiliserToutConfirm] = useState(false);

  const queryClient = useQueryClient();

  // Create amortissement mutation — Bug #7 fix: use adapter directly
  const createMutation = useMutation({
    mutationFn: async (data: { immobilisation_id: string; exercice: string; montant: number; date_debut?: string; date_fin?: string; methode?: string }) => {
      if (!adapter) throw new Error('Adapter non disponible');
      // Add montant as additional depreciation on the asset
      const asset = await adapter.getById('assets', data.immobilisation_id) as Record<string, unknown> | null;
      if (!asset) throw new Error('Immobilisation introuvable');
      const currentCumul = (asset.cumulDepreciation as number) || 0;
      await adapter.update('assets', data.immobilisation_id, { cumulDepreciation: currentCumul + data.montant });
      return data;
    },
    onSuccess: () => {
      toast.success('Amortissement créé avec succès');
      queryClient.invalidateQueries({ queryKey: ['depreciation'] });
      queryClient.invalidateQueries({ queryKey: ['fixed-assets'] });
      setShowCreateModal(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la création');
    },
  });

  // Fetch depreciation data — Bug #7 fix: compute from assets table
  const { data: depreciationData, isLoading } = useQuery({
    queryKey: ['depreciation', 'list', page, filters],
    queryFn: async () => {
      if (!adapter) return { results: [], count: 0, total_periode: 0, total_comptabilise: 0, total_en_attente: 0, total_dotations: 0, total_cumul: 0, total_vnc: 0, taux_moyen: 0 };
      const allAssets = await adapter.getAll('assets') as Array<Record<string, unknown>>;
      const activeAssets = allAssets.filter(a => a.status === 'active');

      // Build depreciation records — one per asset per year
      const currentYear = new Date().getFullYear().toString();
      let records: DepreciationRecord[] = activeAssets.map(a => {
        const valeur = (a.acquisitionValue as number) || 0;
        const duree = (a.usefulLifeYears as number) || 5;
        const cumul = (a.cumulDepreciation as number) || 0;
        const dotationAnnuelle = duree > 0 ? valeur / duree : 0;
        const vnc = valeur - cumul;
        const taux = duree > 0 ? Math.round((1 / duree) * 100 * 100) / 100 : 0;
        return {
          id: String(a.id),
          immobilisation_id: String(a.id),
          exercice: currentYear,
          date_amortissement: new Date().toISOString().split('T')[0],
          nom_actif: String(a.name || ''),
          code_actif: String(a.code || ''),
          methode: (a.depreciationMethod as string) === 'declining' ? 'degressive' : 'lineaire',
          periode: 'annuel',
          valeur_base: valeur,
          taux_amortissement: taux,
          montant_dotation: dotationAnnuelle,
          cumul_amortissements: cumul,
          valeur_nette_comptable: vnc,
          statut: cumul >= valeur ? 'comptabilise' : 'calcule',
        } as DepreciationRecord;
      });

      // Apply filters
      if (filters.search) {
        const s = filters.search.toLowerCase();
        records = records.filter(r => r.nom_actif.toLowerCase().includes(s) || r.code_actif.toLowerCase().includes(s));
      }
      if (filters.methode) records = records.filter(r => r.methode === filters.methode);
      if (filters.statut) records = records.filter(r => r.statut === filters.statut);
      if (filters.actif) records = records.filter(r => r.immobilisation_id === filters.actif);
      // Warning #27 fix: apply periode filter
      if (filters.periode) records = records.filter(r => r.periode === filters.periode);

      const total = records.length;
      const pageSize = 20;
      const start = (page - 1) * pageSize;
      const paged = records.slice(start, start + pageSize);
      const totalDotations = records.reduce((s, r) => s + r.montant_dotation, 0);
      const totalCumul = records.reduce((s, r) => s + r.cumul_amortissements, 0);
      const totalVnc = records.reduce((s, r) => s + r.valeur_nette_comptable, 0);
      const tauxMoyen = records.length > 0 ? Math.round(records.reduce((s, r) => s + r.taux_amortissement, 0) / records.length * 100) / 100 : 0;
      const totalComptabilise = records.filter(r => r.statut === 'comptabilise').reduce((s, r) => s + r.montant_dotation, 0);
      const totalEnAttente = records.filter(r => r.statut !== 'comptabilise').reduce((s, r) => s + r.montant_dotation, 0);
      return {
        results: paged,
        count: total,
        total_periode: totalDotations,
        total_comptabilise: totalComptabilise,
        total_en_attente: totalEnAttente,
        total_dotations: totalDotations,
        total_cumul: totalCumul,
        total_vnc: totalVnc,
        taux_moyen: tauxMoyen,
      };
    },
  });

  // Fetch assets for selection — Bug #7 fix
  const { data: assets } = useQuery({
    queryKey: ['fixed-assets', 'list-for-depreciation'],
    queryFn: async () => {
      if (!adapter) return { results: [] };
      const all = await adapter.getAll('assets') as Array<Record<string, unknown>>;
      return {
        results: all.map(a => ({
          id: String(a.id),
          designation: String(a.name || ''),
          code_immobilisation: String(a.code || ''),
        })),
      };
    },
  });

  // Calculate depreciation mutation — Bug #7 fix: update cumulDepreciation for all active assets
  const calculateDepreciationMutation = useMutation({
    mutationFn: async (_params: { date_debut: string; date_fin: string; methode: string }) => {
      if (!adapter) throw new Error('Adapter non disponible');
      const allAssets = await adapter.getAll('assets') as Array<Record<string, unknown>>;
      const activeAssets = allAssets.filter(a => a.status === 'active');
      let count = 0;
      for (const a of activeAssets) {
        const valeur = (a.acquisitionValue as number) || 0;
        const duree = (a.usefulLifeYears as number) || 5;
        const dotation = duree > 0 ? valeur / duree : 0;
        const currentCumul = (a.cumulDepreciation as number) || 0;
        if (currentCumul < valeur && dotation > 0) {
          await adapter.update('assets', String(a.id), {
            cumulDepreciation: Math.min(currentCumul + dotation, valeur),
          });
          count++;
        }
      }
      return { count };
    },
    onSuccess: (result) => {
      toast.success(`${result.count} amortissements calculés`);
      queryClient.invalidateQueries({ queryKey: ['depreciation'] });
      queryClient.invalidateQueries({ queryKey: ['fixed-assets'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors du calcul des amortissements');
    }
  });

  // Delete depreciation mutation — subtract one period's dotation instead of resetting cumul to 0
  const deleteDepreciationMutation = useMutation({
    mutationFn: async (depreciationId: string) => {
      if (!adapter) throw new Error('Adapter non disponible');
      // depreciationId == asset id in our computed model
      const asset = await adapter.getById('assets', depreciationId) as Record<string, unknown> | null;
      if (!asset) throw new Error('Actif introuvable');
      const valeur = (asset.acquisitionValue as number) || 0;
      const duree = (asset.usefulLifeYears as number) || 5;
      const currentCumul = (asset.cumulDepreciation as number) || 0;
      // Subtract one annual dotation (reversal), floor at 0
      const dotation = duree > 0 ? valeur / duree : 0;
      const newCumul = Math.max(0, currentCumul - dotation);
      await adapter.update('assets', depreciationId, { cumulDepreciation: newCumul });
    },
    onSuccess: () => {
      toast.success('Amortissement supprimé avec succès');
      queryClient.invalidateQueries({ queryKey: ['depreciation'] });
      queryClient.invalidateQueries({ queryKey: ['fixed-assets'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  });

  const handleDeleteDepreciation = (depreciationId: string) => {
    setDeleteDeprecConfirm({ isOpen: true, id: depreciationId });
  };

  // Comptabiliser mutation — crée les écritures OD (681x / 28xx) dans le journal
  // Accepts the full DepreciationRecord to avoid closure-state races (Warning #24 fix)
  const comptabiliserMutation = useMutation({
    mutationFn: async (dep: DepreciationRecord) => {
      if (!adapter) throw new Error('Adapter non disponible');

      const montant = dep.montant_dotation;

      // Warning #25 fix: use SYSCOHADA standard accounts instead of deriving from asset code string
      // 6813 = Dotations aux amortissements sur immobilisations corporelles
      // 2813 = Amortissements des constructions / equipment — default generic account
      const dotationAccount = '6813';
      const amortAccount = '2813';

      const entryNumber = `OD-${Date.now().toString(36).toUpperCase()}`;
      const entry = {
        id: crypto.randomUUID(),
        entryNumber,
        journal: 'OD',
        date: dep.date_amortissement || new Date().toISOString().split('T')[0],
        label: `Dotation amortissement — ${dep.nom_actif}`,
        reference: dep.code_actif,
        status: 'validated',
        lines: [
          {
            id: crypto.randomUUID(),
            accountCode: dotationAccount,
            accountName: 'Dotation aux amortissements',
            label: `Dotation ${dep.nom_actif}`,
            debit: montant,
            credit: 0,
          },
          {
            id: crypto.randomUUID(),
            accountCode: amortAccount,
            accountName: 'Amortissements cumulés',
            label: `Amort. ${dep.nom_actif}`,
            debit: 0,
            credit: montant,
          },
        ],
        totalDebit: montant,
        totalCredit: montant,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Enregistrer dans le journal
      await adapter.create('journalEntries', entry as any);

      return { entryIds: [entry.id], count: 1, total: montant };
    },
    onSuccess: (result) => {
      toast.success(
        `Dotation comptabilisée ! ${result.count} écriture(s) OD créée(s) pour ${new Intl.NumberFormat('fr-FR').format(result.total)} FCFA`
      );
      queryClient.invalidateQueries({ queryKey: ['depreciation'] });
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      setShowComptabiliserModal(false);
      setSelectedDepreciation(null);
    },
    onError: (error: Error) => {
      toast.error(`Erreur comptabilisation : ${error.message}`);
    }
  });

  // Comptabiliser TOUT — déverse toutes les dotations affichées en écritures OD
  const comptabiliserToutMutation = useMutation({
    mutationFn: async () => {
      if (!adapter) throw new Error('Adapter non disponible');

      // Utiliser les amortissements déjà affichés dans le tableau
      const results = depreciationData?.results || [];
      const nonComptabilises = results.filter((d: DepreciationRecord) => d.statut !== 'comptabilise');

      if (nonComptabilises.length === 0) throw new Error('Aucune dotation à comptabiliser');

      const entryIds: string[] = [];
      let total = 0;

      for (const dep of nonComptabilises) {
        const montant = dep.montant_dotation;
        // Warning #25 fix: use SYSCOHADA standard accounts
        const dotationAccount = '6813';
        const amortAccount = '2813';

        const entry = {
          id: crypto.randomUUID(),
          entryNumber: `OD-${Date.now().toString(36).toUpperCase()}-${entryIds.length + 1}`,
          journal: 'OD',
          date: dep.date_amortissement || new Date().toISOString().split('T')[0],
          label: `Dotation amortissement — ${dep.nom_actif}`,
          reference: dep.code_actif,
          status: 'validated',
          lines: [
            { id: crypto.randomUUID(), accountCode: dotationAccount, accountName: 'Dotation aux amortissements', label: `Dotation ${dep.nom_actif}`, debit: montant, credit: 0 },
            { id: crypto.randomUUID(), accountCode: amortAccount, accountName: 'Amortissements cumulés', label: `Amort. ${dep.nom_actif}`, debit: 0, credit: montant },
          ],
          totalDebit: montant,
          totalCredit: montant,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await adapter.create('journalEntries', entry as any);
        entryIds.push(entry.id);
        total += montant;
      }

      return { entryIds, count: nonComptabilises.length, total };
    },
    onSuccess: (result) => {
      toast.success(
        `${result.count} dotation(s) déversée(s) en comptabilité pour un total de ${new Intl.NumberFormat('fr-FR').format(result.total)} FCFA — ${result.entryIds.length} écriture(s) OD créée(s)`
      );
      queryClient.invalidateQueries({ queryKey: ['depreciation'] });
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur déversement : ${error.message}`);
    },
  });

  const handleComptabiliserTout = () => {
    setComptabiliserToutConfirm(true);
  };

  const handleComptabiliser = (depreciation: DepreciationRecord) => {
    // Set state and open modal synchronously — mutation now receives record directly (Warning #24 fix)
    setSelectedDepreciation(depreciation);
    setShowComptabiliserModal(true);
  };

  const confirmComptabiliser = () => {
    if (selectedDepreciation) {
      comptabiliserMutation.mutate(selectedDepreciation);
    }
  };

  const handleEditDepreciation = (depreciation: DepreciationRecord) => {
    setDepreciationToEdit(depreciation);
    setFormData({
      immobilisation_id: depreciation.immobilisation_id || '',
      exercice: depreciation.exercice || new Date().getFullYear().toString(),
      montant: depreciation.montant_dotation || 0,
      date_debut: depreciation.date_debut || '',
      date_fin: depreciation.date_fin || '',
      methode: (depreciation.methode as 'lineaire' | 'degressive' | 'unites_oeuvre' | 'exceptionnelle') || 'lineaire',
      justification: '',
    });
    setShowEditDepreciationModal(true);
  };

  const handleUpdateDepreciation = async () => {
    if (!depreciationToEdit) return;
    try {
      setIsSubmitting(true);
      if (!adapter) throw new Error('Adapter non disponible');
      // Bug #3 fix: persist the new montant_dotation as updated cumulDepreciation on the asset
      const assetId = depreciationToEdit.immobilisation_id || depreciationToEdit.id;
      const asset = await adapter.getById('assets', assetId) as Record<string, unknown> | null;
      if (!asset) throw new Error('Immobilisation introuvable');
      const valeur = (asset.acquisitionValue as number) || 0;
      const newCumul = Math.min(formData.montant, valeur);
      await adapter.update('assets', assetId, { cumulDepreciation: newCumul });
      toast.success('Amortissement mis à jour avec succès');
      queryClient.invalidateQueries({ queryKey: ['depreciation'] });
      queryClient.invalidateQueries({ queryKey: ['fixed-assets'] });
      setShowEditDepreciationModal(false);
      setDepreciationToEdit(null);
      resetForm();
    } catch (error) {
      toast.error((error as Error).message || 'Erreur lors de la mise à jour');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCalculateDepreciation = () => {
    setCalcConfirm(true);
  };

  const handleFilterChange = (key: keyof DepreciationFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      actif: '',
      methode: '',
      periode: '',
      statut: '',
      date_debut: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
      date_fin: new Date().toISOString().split('T')[0]
    });
    setPage(1);
  };

  const resetForm = () => {
    setFormData({
      immobilisation_id: '',
      exercice: new Date().getFullYear().toString(),
      montant: 0,
      date_debut: '',
      date_fin: '',
      methode: 'lineaire',
      justification: '',
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

      // Validate with Zod
      const validatedData = createAmortissementSchema.parse(formData);

      // Submit to backend
      await createMutation.mutateAsync(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Map Zod errors to form fields
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as string;
          fieldErrors[field] = err.message;
        });
        setErrors(fieldErrors);
        toast.error('Veuillez corriger les erreurs du formulaire');
      } else {
        toast.error('Erreur lors de la création');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMethodeColor = (methode: string) => {
    switch (methode) {
      case 'lineaire': return 'bg-blue-100 text-blue-800';
      case 'degressive': return 'bg-green-100 text-green-800';
      case 'unites_oeuvre': return 'bg-purple-100 text-purple-800';
      case 'exceptionnelle': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMethodeLabel = (methode: string) => {
    switch (methode) {
      case 'lineaire': return 'Linéaire';
      case 'degressive': return 'Dégressive';
      case 'unites_oeuvre': return 'Unités d\'œuvre';
      case 'exceptionnelle': return 'Exceptionnelle';
      default: return methode;
    }
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'calcule': return 'bg-blue-100 text-blue-800';
      case 'comptabilise': return 'bg-green-100 text-green-800';
      case 'annule': return 'bg-red-100 text-red-800';
      case 'provisoire': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (statut: string) => {
    switch (statut) {
      case 'calcule': return 'Calculé';
      case 'comptabilise': return 'Comptabilisé';
      case 'annule': return 'Annulé';
      case 'provisoire': return 'Provisoire';
      default: return statut;
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center">
              <TrendingDown className="mr-3 h-7 w-7" />
              Amortissements
            </h1>
            <p className="mt-2 text-[var(--color-text-secondary)]">
              Calcul et suivi des amortissements des immobilisations
            </p>
          </div>
          <div className="flex space-x-3">
            <PageHeaderActions />
            <Button
              variant="outline"
              onClick={() => setCalculationMode(calculationMode === 'manuel' ? 'auto' : 'manuel')}
            >
              {calculationMode === 'manuel' ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Mode Auto
                </>
              ) : (
                <>
                  <Calculator className="mr-2 h-4 w-4" />
                  Mode Manuel
                </>
              )}
            </Button>
            <ExportMenu
              data={(depreciationData?.results || []) as unknown as Record<string, unknown>[]}
              filename="amortissements"
              columns={{
                date_amortissement: 'Date',
                nom_actif: 'Actif',
                code_actif: 'Code Actif',
                methode: 'Méthode',
                periode: 'Période',
                valeur_base: 'Valeur Base',
                taux_amortissement: 'Taux (%)',
                montant_dotation: 'Dotation',
                cumul_amortissements: 'Cumul',
                valeur_nette_comptable: 'VNC',
                statut: 'Statut'
              }}
            />
            {calculationMode === 'auto' && (
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleCalculateDepreciation}
                disabled={calculateDepreciationMutation.isPending}
              >
                {calculateDepreciationMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Calcul...
                  </>
                ) : (
                  <>
                    <Calculator className="mr-2 h-4 w-4" />
                    Calculer
                  </>
                )}
              </Button>
            )}
            {calculationMode === 'manuel' && (
              <Button 
                className="bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-white"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nouvel Amortissement
              </Button>
            )}
            <Button
              className="bg-primary-600 hover:bg-primary-700 text-white"
              onClick={handleComptabiliserTout}
              disabled={comptabiliserToutMutation.isPending}
            >
              {comptabiliserToutMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Déversement...
                </>
              ) : (
                <>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Comptabiliser tout
                </>
              )}
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
                <TrendingDown className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Période</p>
                <p className="text-lg font-bold text-blue-700">
                  {formatCurrency(depreciationData?.total_periode || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Comptabilisés</p>
                <p className="text-lg font-bold text-green-700">
                  {formatCurrency(depreciationData?.total_comptabilise || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-yellow-100 rounded-full">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">{t('status.pending')}</p>
                <p className="text-lg font-bold text-yellow-700">
                  {formatCurrency(depreciationData?.total_en_attente || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-primary-100 rounded-full">
                <BarChart3 className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Nb. Opérations</p>
                <p className="text-lg font-bold text-primary-700">
                  {depreciationData?.count || 0}
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
            Filtres et Paramètres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filters.actif} onValueChange={(value) => handleFilterChange('actif', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les actifs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les actifs</SelectItem>
                {assets?.results?.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.designation} ({asset.code_immobilisation})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.methode} onValueChange={(value) => handleFilterChange('methode', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Toutes méthodes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Toutes les méthodes</SelectItem>
                <SelectItem value="lineaire">Linéaire</SelectItem>
                <SelectItem value="degressive">Dégressive</SelectItem>
                <SelectItem value="unites_oeuvre">Unités d'œuvre</SelectItem>
                <SelectItem value="exceptionnelle">Exceptionnelle</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.statut} onValueChange={(value) => handleFilterChange('statut', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tous statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les statuts</SelectItem>
                <SelectItem value="calcule">Calculé</SelectItem>
                <SelectItem value="comptabilise">Comptabilisé</SelectItem>
                <SelectItem value="provisoire">Provisoire</SelectItem>
                <SelectItem value="annule">Annulé</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.periode} onValueChange={(value) => handleFilterChange('periode', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Toutes périodes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Toutes les périodes</SelectItem>
                <SelectItem value="mensuel">Mensuel</SelectItem>
                <SelectItem value="trimestriel">Trimestriel</SelectItem>
                <SelectItem value="annuel">Annuel</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => setShowPeriodModal(true)}
              className="flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Sélectionner période
            </Button>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={resetFilters}>
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Depreciation Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Tableau des Amortissements</span>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Du {formatDate(filters.date_debut)} au {formatDate(filters.date_fin)}
              </span>
              {depreciationData && (
                <Badge variant="outline">
                  {depreciationData.count} opération(s)
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" text="Chargement des amortissements..." />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common.date')}</TableHead>
                      <TableHead>Actif</TableHead>
                      <TableHead>Méthode</TableHead>
                      <TableHead>Période</TableHead>
                      <TableHead className="text-right">Valeur Base</TableHead>
                      <TableHead className="text-right">Taux</TableHead>
                      <TableHead className="text-right">Dotation</TableHead>
                      <TableHead className="text-right">Cumul</TableHead>
                      <TableHead className="text-right">VNC</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {depreciationData?.results?.map((depreciation) => (
                      <TableRow key={depreciation.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center text-sm">
                            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                            {formatDate(depreciation.date_amortissement)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-[var(--color-text-primary)]">{depreciation.nom_actif}</p>
                            <p className="text-sm text-gray-600 font-mono">
                              {depreciation.code_actif}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getMethodeColor(depreciation.methode)}>
                            {getMethodeLabel(depreciation.methode)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">
                            {depreciation.periode}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(depreciation.valeur_base)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium text-blue-700">
                            {depreciation.taux_amortissement}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-red-700">
                            {formatCurrency(depreciation.montant_dotation)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-orange-700">
                            {formatCurrency(depreciation.cumul_amortissements)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-green-700">
                            {formatCurrency(depreciation.valeur_nette_comptable)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(depreciation.statut)}>
                            {getStatusLabel(depreciation.statut)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedDepreciation(depreciation)}
                              aria-label="Voir les détails"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {depreciation.statut !== 'comptabilise' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleComptabiliser(depreciation); }}
                                  aria-label="Comptabiliser"
                                  title="Comptabiliser — créer l'écriture OD"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditDepreciation(depreciation)}
                                  aria-label="Modifier"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {depreciation.statut !== 'comptabilise' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteDepreciation(depreciation.id)}
                                className="text-red-600 hover:text-red-700"
                                aria-label="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Summary Row */}
              {depreciationData && depreciationData.results && depreciationData.results.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">Total Dotations</p>
                      <p className="text-lg font-bold text-red-700">
                        {formatCurrency(depreciationData.total_dotations || 0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">Total Cumul</p>
                      <p className="text-lg font-bold text-orange-700">
                        {formatCurrency(depreciationData.total_cumul || 0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">Total VNC</p>
                      <p className="text-lg font-bold text-green-700">
                        {formatCurrency(depreciationData.total_vnc || 0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">Taux Moyen</p>
                      <p className="text-lg font-bold text-blue-700">
                        {depreciationData.taux_moyen || 0}%
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Pagination */}
              {depreciationData && depreciationData.count > 0 && (
                <div className="mt-6">
                  <Pagination
                    currentPage={page}
                    totalPages={Math.ceil(depreciationData.count / 20)}
                    onPageChange={setPage}
                  />
                </div>
              )}

              {(!depreciationData?.results || depreciationData.results.length === 0) && (
                <div className="text-center py-12">
                  <TrendingDown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun amortissement trouvé</h3>
                  <p className="text-gray-600 mb-6">
                    Aucun amortissement calculé pour la période et les critères sélectionnés.
                  </p>
                  <div className="flex justify-center space-x-3">
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={handleCalculateDepreciation}
                      disabled={calculateDepreciationMutation.isPending}
                    >
                      <Calculator className="mr-2 h-4 w-4" />
                      Calculer les amortissements
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Depreciation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            {/* Sticky header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                  <Plus className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Nouvel Amortissement Manuel</h2>
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
                      <h4 className="text-sm font-medium text-blue-900 mb-1">Amortissement Manuel</h4>
                      <p className="text-sm text-blue-800">Créez un amortissement manuel pour des situations particulières non couvertes par le calcul automatique.</p>
                    </div>
                  </div>
                </div>

                {/* Asset Selection */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Sélection de l'Actif</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Immobilisation *</label>
                      <Select
                        value={formData.immobilisation_id}
                        onValueChange={(value) => handleInputChange('immobilisation_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une immobilisation" />
                        </SelectTrigger>
                        <SelectContent>
                          {assets?.results?.map((asset) => (
                            <SelectItem key={asset.id} value={asset.id}>
                              {asset.designation} - {asset.code_immobilisation}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.immobilisation_id && (
                        <p className="mt-1 text-sm text-red-600">{errors.immobilisation_id}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Calculation Parameters */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Paramètres de Calcul</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Exercice *</label>
                      <Input
                        placeholder="2024"
                        value={formData.exercice}
                        onChange={(e) => handleInputChange('exercice', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.exercice && (
                        <p className="mt-1 text-sm text-red-600">{errors.exercice}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date début *</label>
                      <Input
                        type="date"
                        value={formData.date_debut}
                        onChange={(e) => handleInputChange('date_debut', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.date_debut && (
                        <p className="mt-1 text-sm text-red-600">{errors.date_debut}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date fin *</label>
                      <Input
                        type="date"
                        value={formData.date_fin}
                        onChange={(e) => handleInputChange('date_fin', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.date_fin && (
                        <p className="mt-1 text-sm text-red-600">{errors.date_fin}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Méthode d'amortissement *</label>
                      <Select
                        value={formData.methode}
                        onValueChange={(value) => handleInputChange('methode', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner la méthode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lineaire">Linéaire</SelectItem>
                          <SelectItem value="degressive">Dégressive</SelectItem>
                          <SelectItem value="unites_oeuvre">Unités d'œuvre</SelectItem>
                          <SelectItem value="exceptionnelle">Exceptionnelle</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.methode && (
                        <p className="mt-1 text-sm text-red-600">{errors.methode}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Amount Details */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Montants</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Montant *</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={formData.montant}
                        onChange={(e) => handleInputChange('montant', parseFloat(e.target.value) || 0)}
                        disabled={isSubmitting}
                      />
                      {errors.montant && (
                        <p className="mt-1 text-sm text-red-600">{errors.montant}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Informations Complémentaires</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Justification</label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="Justification de cet amortissement manuel..."
                        value={formData.justification || ''}
                        onChange={(e) => handleInputChange('justification', e.target.value)}
                        disabled={isSubmitting}
                      />
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
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Valider">
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Création...</span>
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

      {/* Modal de sélection de période */}
      <PeriodSelectorModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        onApply={(newDateRange) => {
          setDateRange(newDateRange);
          handleFilterChange('date_debut', newDateRange.start);
          handleFilterChange('date_fin', newDateRange.end);
        }}
        initialDateRange={dateRange}
      />

      {/* Confirmation suppression amortissement */}
      <ConfirmDialog
        isOpen={deleteDeprecConfirm.isOpen}
        onClose={() => setDeleteDeprecConfirm({ isOpen: false, id: null })}
        onConfirm={() => {
          if (deleteDeprecConfirm.id) deleteDepreciationMutation.mutate(deleteDeprecConfirm.id);
          setDeleteDeprecConfirm({ isOpen: false, id: null });
        }}
        title="Confirmer la suppression"
        message="Êtes-vous sûr de vouloir supprimer cet amortissement ? La dotation annuelle sera déduite du cumul de l'actif."
        variant="danger"
        confirmText="Supprimer"
        cancelText="Annuler"
        confirmLoading={deleteDepreciationMutation.isPending}
      />

      {/* Confirmation calcul automatique */}
      <ConfirmDialog
        isOpen={calcConfirm}
        onClose={() => setCalcConfirm(false)}
        onConfirm={() => {
          setCalcConfirm(false);
          calculateDepreciationMutation.mutate({
            date_debut: filters.date_debut,
            date_fin: filters.date_fin,
            methode: filters.methode || 'lineaire',
          });
        }}
        title="Calcul automatique des amortissements"
        message="Lancer le calcul automatique des amortissements pour la période sélectionnée ? Les cumuls des actifs actifs seront mis à jour."
        variant="info"
        confirmText="Calculer"
        cancelText="Annuler"
        confirmLoading={calculateDepreciationMutation.isPending}
      />

      {/* Confirmation comptabiliser tout */}
      <ConfirmDialog
        isOpen={comptabiliserToutConfirm}
        onClose={() => setComptabiliserToutConfirm(false)}
        onConfirm={() => {
          setComptabiliserToutConfirm(false);
          comptabiliserToutMutation.mutate();
        }}
        title="Comptabiliser toutes les dotations"
        message={"Comptabiliser toutes les dotations aux amortissements ?\n\nCette action va créer les écritures OD (Débit 6813 / Crédit 2813) dans le journal."}
        variant="info"
        confirmText="Comptabiliser tout"
        cancelText="Annuler"
        confirmLoading={comptabiliserToutMutation.isPending}
      />

      {/* Modal de comptabilisation */}
      {showComptabiliserModal && selectedDepreciation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-neutral-200">
              <div className="flex items-center space-x-3">
                <div className="bg-primary-100 text-primary-600 p-2 rounded-lg">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">Comptabiliser l'amortissement</h2>
                  <p className="text-xs text-neutral-500">Détail des écritures qui seront générées</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {/* Résumé actif */}
              <div className="bg-neutral-50 rounded-lg p-4 space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Actif</span>
                  <span className="font-semibold text-neutral-900">{selectedDepreciation.nom_actif}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Code</span>
                  <span className="font-mono text-neutral-700">{selectedDepreciation.code_actif}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Méthode</span>
                  <span className="text-neutral-700">{getMethodeLabel(selectedDepreciation.methode)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Période</span>
                  <span className="text-neutral-700">{selectedDepreciation.periode}</span>
                </div>
              </div>

              {/* Détail des écritures OD */}
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Écritures comptables (Journal OD)</h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="text-left py-2 px-2 text-neutral-500 font-medium">Compte</th>
                      <th className="text-left py-2 px-2 text-neutral-500 font-medium">Libellé</th>
                      <th className="text-right py-2 px-2 text-neutral-500 font-medium">Débit</th>
                      <th className="text-right py-2 px-2 text-neutral-500 font-medium">Crédit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-neutral-100">
                      <td className="py-2 px-2 font-mono text-neutral-700">6813</td>
                      <td className="py-2 px-2 text-neutral-700">Dotation aux amortissements</td>
                      <td className="py-2 px-2 text-right font-mono font-semibold text-neutral-900">{formatCurrency(selectedDepreciation.montant_dotation)}</td>
                      <td className="py-2 px-2 text-right font-mono text-neutral-400">—</td>
                    </tr>
                    <tr className="border-b border-neutral-100">
                      <td className="py-2 px-2 font-mono text-neutral-700">2813</td>
                      <td className="py-2 px-2 text-neutral-700">Amortissements cumulés</td>
                      <td className="py-2 px-2 text-right font-mono text-neutral-400">—</td>
                      <td className="py-2 px-2 text-right font-mono font-semibold text-neutral-900">{formatCurrency(selectedDepreciation.montant_dotation)}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-neutral-300 font-bold">
                      <td colSpan={2} className="py-2 px-2 text-neutral-700">TOTAL</td>
                      <td className="py-2 px-2 text-right font-mono">{formatCurrency(selectedDepreciation.montant_dotation)}</td>
                      <td className="py-2 px-2 text-right font-mono">{formatCurrency(selectedDepreciation.montant_dotation)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Impact */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <strong>Impact :</strong> Cette action créera une écriture OD dans le journal comptable.
                La VNC de l'actif sera réduite de {formatCurrency(selectedDepreciation.montant_dotation)} FCFA.
              </div>
            </div>
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowComptabiliserModal(false);
                  setSelectedDepreciation(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={comptabiliserMutation.isPending}
              >
                Annuler
              </button>
              <button
                onClick={confirmComptabiliser}
                disabled={comptabiliserMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
              >
                {comptabiliserMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Comptabilisation...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Comptabiliser</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de modification d'amortissement */}
      {showEditDepreciationModal && depreciationToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                  <Edit className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Modifier l'amortissement</h2>
              </div>
              <button
                onClick={() => {
                  setShowEditDepreciationModal(false);
                  setDepreciationToEdit(null);
                  resetForm();
                }}
                className="text-gray-700 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 mb-1">Modification d'amortissement</h4>
                    <p className="text-sm text-blue-800">
                      Modifiez les paramètres de l'amortissement pour: {depreciationToEdit.nom_actif}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Exercice *</label>
                  <Input
                    placeholder="2026"
                    className="text-gray-900"
                    value={formData.exercice}
                    onChange={(e) => handleInputChange('exercice', e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Méthode *</label>
                  <Select
                    value={formData.methode}
                    onValueChange={(value) => handleInputChange('methode', value)}
                  >
                    <SelectTrigger className="text-gray-900">
                      <SelectValue placeholder="Sélectionner la méthode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lineaire">Linéaire</SelectItem>
                      <SelectItem value="degressive">Dégressive</SelectItem>
                      <SelectItem value="unites_oeuvre">Unités d'œuvre</SelectItem>
                      <SelectItem value="exceptionnelle">Exceptionnelle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date début *</label>
                  <Input
                    type="date"
                    value={formData.date_debut}
                    onChange={(e) => handleInputChange('date_debut', e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date fin *</label>
                  <Input
                    type="date"
                    value={formData.date_fin}
                    onChange={(e) => handleInputChange('date_fin', e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Montant *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.montant}
                  onChange={(e) => handleInputChange('montant', parseFloat(e.target.value) || 0)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowEditDepreciationModal(false);
                  setDepreciationToEdit(null);
                  resetForm();
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
                disabled={isSubmitting}
              >
                Annuler
              </button>
              <button
                onClick={handleUpdateDepreciation}
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Mise à jour...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Enregistrer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepreciationPage;