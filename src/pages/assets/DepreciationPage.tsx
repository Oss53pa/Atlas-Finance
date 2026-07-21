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
import { safeAddEntry, EntryGuardError } from '../../services/entryGuard';
import {
  accumulatedDepreciationAt,
  dotationAccountFor,
  amortAccountFor,
} from '../../services/immobilisations/depreciationEngine';

interface DepreciationRecord {
  id: string;
  immobilisation_id?: string;
  exercice?: string;
  date_amortissement: string;
  nom_actif: string;
  code_actif: string;
  account_code: string;
  depreciation_account_code: string;
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

/**
 * Construit la ligne d'amortissement d'un actif pour l'exercice (année civile)
 * via le moteur SYSCOHADA partagé. `montant_dotation` = dotation RESTANT à
 * comptabiliser = cumul cible en fin d'exercice − cumul déjà comptabilisé.
 */
function buildDepreciationRecord(a: Record<string, any>, currentYear: number): DepreciationRecord {
  const exerciceStr = String(currentYear);
  const exerciceEnd = `${currentYear}-12-31`;
  const valeur = Number(a.acquisitionValue) || 0;
  const residual = Number(a.residualValue) || 0;
  const duree = Number(a.usefulLifeYears) || 5;
  const storedCumul = Number(a.cumulDepreciation) || 0;
  const methodeRaw = String(a.depreciationMethod || 'linear');
  const acqDate = String(a.acquisitionDate || `${currentYear}-01-01`);
  const base = Math.max(0, valeur - residual);
  const cumulCibleFin = Math.min(
    accumulatedDepreciationAt(
      { acquisitionValue: valeur, residualValue: residual, usefulLifeYears: duree, depreciationMethod: methodeRaw, acquisitionDate: acqDate, cumulDepreciation: storedCumul },
      exerciceEnd,
    ),
    base,
  );
  const dotation = Math.max(0, Math.round(cumulCibleFin - storedCumul));
  const taux = duree > 0 ? Math.round((1 / duree) * 100 * 100) / 100 : 0;
  return {
    id: String(a.id),
    immobilisation_id: String(a.id),
    exercice: exerciceStr,
    date_amortissement: exerciceEnd,
    nom_actif: String(a.name || ''),
    code_actif: String(a.code || ''),
    account_code: String(a.accountCode || ''),
    depreciation_account_code: String(a.depreciationAccountCode || ''),
    methode: methodeRaw === 'declining' ? 'degressive' : 'lineaire',
    periode: 'annuel',
    valeur_base: valeur,
    taux_amortissement: taux,
    montant_dotation: dotation,
    cumul_amortissements: storedCumul,
    valeur_nette_comptable: valeur - storedCumul,
    statut: dotation <= 0 ? 'comptabilise' : 'calcule',
  };
}

/**
 * Comptabilise la dotation d'un actif pour l'exercice : écriture OD équilibrée
 * (Dr 681x / Cr 28x sur les VRAIS comptes de l'actif), idempotente (le numéro
 * de pièce AMORT-{exercice}-{code} est unique → safeAddEntry bloque les
 * doublons), et synchronise `cumulDepreciation` sur la fiche.
 */
async function postDepreciation(adapter: any, rec: DepreciationRecord): Promise<number> {
  const montant = rec.montant_dotation;
  if (montant <= 0) return 0;
  const dotationAccount = dotationAccountFor(rec.account_code);
  const amortAccount = amortAccountFor(rec.account_code, rec.depreciation_account_code);
  const now = new Date().toISOString();
  await safeAddEntry(adapter, {
    id: crypto.randomUUID(),
    entryNumber: `AMORT-${rec.exercice}-${rec.code_actif || rec.id.slice(0, 6)}`,
    journal: 'OD',
    date: rec.date_amortissement,
    reference: `AMORT-${rec.exercice}-${rec.immobilisation_id}`,
    label: `Dotation amortissement ${rec.exercice} — ${rec.nom_actif}`,
    status: 'validated',
    lines: [
      { id: crypto.randomUUID(), accountCode: dotationAccount, accountName: 'Dotation aux amortissements', label: `Dotation ${rec.nom_actif}`, debit: montant, credit: 0 },
      { id: crypto.randomUUID(), accountCode: amortAccount, accountName: 'Amortissements cumulés', label: `Amort. ${rec.nom_actif}`, debit: 0, credit: montant },
    ],
    createdAt: now,
    createdBy: 'system',
  } as any, { skipSyncValidation: true });
  // Synchronise le cumul sur l'immobilisation (registre ↔ comptabilité).
  const asset = await adapter.getById('assets', rec.immobilisation_id) as Record<string, unknown> | null;
  if (asset) {
    await adapter.update('assets', rec.immobilisation_id, { cumulDepreciation: (Number(asset.cumulDepreciation) || 0) + montant });
  }
  return montant;
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

  // Create amortissement mutation — poste une VRAIE écriture (registre ↔ compta)
  const createMutation = useMutation({
    mutationFn: async (data: { immobilisation_id: string; exercice: string; montant: number; date_debut?: string; date_fin?: string; methode?: string }) => {
      if (!adapter) throw new Error(t('depreciation.adapterUnavailable'));
      const asset = await adapter.getById('assets', data.immobilisation_id) as Record<string, any> | null;
      if (!asset) throw new Error(t('depreciation.assetNotFound'));
      const montant = Number(data.montant) || 0;
      if (montant <= 0) throw new Error(t('depreciation.amountMustBePositive'));
      const brut = Number(asset.acquisitionValue) || 0;
      const residual = Number(asset.residualValue) || 0;
      const base = Math.max(0, brut - residual);
      const currentCumul = Number(asset.cumulDepreciation) || 0;
      if (currentCumul + montant > base + 1) {
        throw new Error(t('depreciation.chargeRefused', { current: String(currentCumul), amount: String(montant), base: String(base) }));
      }
      const accountCode = String(asset.accountCode || '');
      if (!accountCode) throw new Error(t('depreciation.missingAssetAccount'));
      const date = data.date_fin || `${data.exercice}-12-31`;
      await safeAddEntry(adapter, {
        id: crypto.randomUUID(),
        entryNumber: `AMORT-MAN-${Date.now().toString(36).toUpperCase()}-${String(asset.code || '').slice(0, 6)}`,
        journal: 'OD',
        date,
        reference: `AMORT-${data.exercice}-${data.immobilisation_id}`,
        label: `Dotation amortissement (manuelle) — ${asset.name}`,
        status: 'validated',
        lines: [
          { id: crypto.randomUUID(), accountCode: dotationAccountFor(accountCode), accountName: 'Dotation aux amortissements', label: `Dotation ${asset.name}`, debit: montant, credit: 0 },
          { id: crypto.randomUUID(), accountCode: amortAccountFor(accountCode, String(asset.depreciationAccountCode || '')), accountName: 'Amortissements cumulés', label: `Amort. ${asset.name}`, debit: 0, credit: montant },
        ],
        createdAt: new Date().toISOString(),
        createdBy: 'system',
      } as any, { skipSyncValidation: true });
      await adapter.update('assets', data.immobilisation_id, { cumulDepreciation: currentCumul + montant });
      return data;
    },
    onSuccess: () => {
      toast.success(t('depreciation.createSuccess'));
      queryClient.invalidateQueries({ queryKey: ['depreciation'] });
      queryClient.invalidateQueries({ queryKey: ['fixed-assets'] });
      setShowCreateModal(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || t('depreciation.createError'));
    },
  });

  // Fetch depreciation data — Bug #7 fix: compute from assets table
  const { data: depreciationData, isLoading } = useQuery({
    queryKey: ['depreciation', 'list', page, filters],
    queryFn: async () => {
      if (!adapter) return { results: [], count: 0, total_periode: 0, total_comptabilise: 0, total_en_attente: 0, total_dotations: 0, total_cumul: 0, total_vnc: 0, taux_moyen: 0 };
      const allAssets = await adapter.getAll('assets') as Array<Record<string, unknown>>;
      const activeAssets = allAssets.filter(a => a.status === 'active');

      const currentYear = new Date().getFullYear();
      const exerciceStr = String(currentYear);

      // Écritures d'amortissement déjà comptabilisées pour l'exercice (statut réel).
      const allEntries = await adapter.getAll('journalEntries') as Array<Record<string, any>>;
      const postedRefs = new Set<string>();
      for (const e of allEntries) {
        const ref = String(e.reference || '');
        if (ref.startsWith(`AMORT-${exerciceStr}-`)) postedRefs.add(ref);
      }

      // Une ligne par actif pour l'exercice, dotation calculée par le moteur SYSCOHADA.
      let records: DepreciationRecord[] = activeAssets.map(a => {
        const rec = buildDepreciationRecord(a, currentYear);
        if (postedRefs.has(`AMORT-${exerciceStr}-${rec.immobilisation_id}`)) rec.statut = 'comptabilise';
        return rec;
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

  // Calculer les amortissements = RECALCUL/aperçu (aucune écriture, aucune
  // mutation). Les dotations sont calculées à la volée par le moteur ; la
  // comptabilisation se fait ensuite via « Comptabiliser ». (L'ancienne version
  // muterait cumulDepreciation SANS écriture → registre/GL désynchronisés.)
  const calculateDepreciationMutation = useMutation({
    mutationFn: async (_params: { date_debut: string; date_fin: string; methode: string }) => {
      if (!adapter) throw new Error(t('depreciation.adapterUnavailable'));
      const allAssets = await adapter.getAll('assets') as Array<Record<string, any>>;
      const activeAssets = allAssets.filter(a => a.status === 'active');
      const currentYear = new Date().getFullYear();
      let count = 0;
      let total = 0;
      for (const a of activeAssets) {
        const rec = buildDepreciationRecord(a, currentYear);
        if (rec.montant_dotation > 0) { count++; total += rec.montant_dotation; }
      }
      return { count, total };
    },
    onSuccess: (result) => {
      toast.success(t('depreciation.calcResult', { count: String(result.count), total: new Intl.NumberFormat('fr-FR').format(result.total) }));
      queryClient.invalidateQueries({ queryKey: ['depreciation'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || t('depreciation.calcError'));
    }
  });

  // Supprimer = CONTREPASSER la dotation de l'exercice (écriture inverse
  // Dr 28x / Cr 681x) et décrémenter le cumul en conséquence. Jamais de mutation
  // silencieuse du cumul sans trace comptable.
  const deleteDepreciationMutation = useMutation({
    mutationFn: async (depreciationId: string) => {
      if (!adapter) throw new Error(t('depreciation.adapterUnavailable'));
      const asset = await adapter.getById('assets', depreciationId) as Record<string, any> | null;
      if (!asset) throw new Error(t('depreciation.assetRecordNotFound'));
      const exercice = String(new Date().getFullYear());
      const code = String(asset.code || '');
      // Retrouver l'écriture de dotation de l'exercice pour cet actif.
      const allEntries = await adapter.getAll('journalEntries') as Array<Record<string, any>>;
      const posted = allEntries.find(e => String(e.reference || '') === `AMORT-${exercice}-${depreciationId}`
        && !String(e.entryNumber || '').startsWith('AMORT-REV-'));
      if (!posted) throw new Error(t('depreciation.noPostedToReverse', { year: exercice }));
      const montant = Number(posted.totalDebit) || 0;
      if (montant <= 0) throw new Error(t('depreciation.nothingToReverse'));
      const accountCode = String(asset.accountCode || '');
      await safeAddEntry(adapter, {
        id: crypto.randomUUID(),
        entryNumber: `AMORT-REV-${exercice}-${code.slice(0, 6)}`,
        journal: 'OD',
        date: `${exercice}-12-31`,
        reference: `AMORT-REV-${exercice}-${depreciationId}`,
        label: `Contrepassation dotation ${exercice} — ${asset.name}`,
        status: 'validated',
        lines: [
          { id: crypto.randomUUID(), accountCode: amortAccountFor(accountCode, String(asset.depreciationAccountCode || '')), accountName: 'Amortissements cumulés', label: `Reprise amort. ${asset.name}`, debit: montant, credit: 0 },
          { id: crypto.randomUUID(), accountCode: dotationAccountFor(accountCode), accountName: 'Dotation aux amortissements', label: `Annulation dotation ${asset.name}`, debit: 0, credit: montant },
        ],
        createdAt: new Date().toISOString(),
        createdBy: 'system',
      } as any, { skipSyncValidation: true });
      await adapter.update('assets', depreciationId, { cumulDepreciation: Math.max(0, (Number(asset.cumulDepreciation) || 0) - montant) });
    },
    onSuccess: () => {
      toast.success(t('depreciation.reverseSuccess'));
      queryClient.invalidateQueries({ queryKey: ['depreciation'] });
      queryClient.invalidateQueries({ queryKey: ['fixed-assets'] });
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || t('depreciation.reverseError'));
    }
  });

  const handleDeleteDepreciation = (depreciationId: string) => {
    setDeleteDeprecConfirm({ isOpen: true, id: depreciationId });
  };

  // Comptabiliser mutation — crée les écritures OD (681x / 28xx) dans le journal
  // Accepts the full DepreciationRecord to avoid closure-state races (Warning #24 fix)
  const comptabiliserMutation = useMutation({
    mutationFn: async (dep: DepreciationRecord) => {
      if (!adapter) throw new Error(t('depreciation.adapterUnavailable'));
      if (dep.montant_dotation <= 0) throw new Error(t('depreciation.nothingToPost'));
      if (!dep.account_code) throw new Error(t('depreciation.missingAssetAccount'));
      const total = await postDepreciation(adapter, dep);
      return { count: 1, total };
    },
    onSuccess: (result) => {
      toast.success(
        t('depreciation.postSuccess', { count: String(result.count), total: new Intl.NumberFormat('fr-FR').format(result.total) })
      );
      queryClient.invalidateQueries({ queryKey: ['depreciation'] });
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      setShowComptabiliserModal(false);
      setSelectedDepreciation(null);
    },
    onError: (error: Error) => {
      toast.error(t('depreciation.postError', { message: error.message }));
    }
  });

  // Comptabiliser TOUT — déverse toutes les dotations affichées en écritures OD
  const comptabiliserToutMutation = useMutation({
    mutationFn: async () => {
      if (!adapter) throw new Error(t('depreciation.adapterUnavailable'));

      // Traiter TOUS les actifs actifs (pas seulement la page affichée).
      const allAssets = await adapter.getAll('assets') as Array<Record<string, any>>;
      const activeAssets = allAssets.filter(a => a.status === 'active');
      const currentYear = new Date().getFullYear();

      let count = 0;
      let total = 0;
      let skipped = 0;
      for (const a of activeAssets) {
        const rec = buildDepreciationRecord(a, currentYear);
        if (rec.montant_dotation <= 0) continue;
        if (!rec.account_code) { skipped++; continue; }
        try {
          const posted = await postDepreciation(adapter, rec);
          if (posted > 0) { count++; total += posted; }
        } catch (e) {
          // Écriture déjà passée pour cet exercice (doublon) → idempotent, on ignore.
          if (e instanceof EntryGuardError) continue;
          throw e;
        }
      }

      if (count === 0) throw new Error(t('depreciation.nothingToPost'));
      return { entryIds: [], count, total, skipped };
    },
    onSuccess: (result) => {
      toast.success(
        t('depreciation.postAllSuccess', {
          count: String(result.count),
          total: new Intl.NumberFormat('fr-FR').format(result.total),
          skipped: result.skipped ? t('depreciation.postAllSkipped', { count: String(result.skipped) }) : '',
        })
      );
      queryClient.invalidateQueries({ queryKey: ['depreciation'] });
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
    },
    onError: (error: Error) => {
      toast.error(t('depreciation.postAllError', { message: error.message }));
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
      if (!adapter) throw new Error(t('depreciation.adapterUnavailable'));
      // Ajustement du cumul d'amortissement : on saisit le cumul CIBLE, et on
      // poste une écriture d'AJUSTEMENT pour l'écart (jamais d'écrasement muet
      // du cumul, qui désynchroniserait registre et grand livre).
      const assetId = depreciationToEdit.immobilisation_id || depreciationToEdit.id;
      const asset = await adapter.getById('assets', assetId) as Record<string, any> | null;
      if (!asset) throw new Error(t('depreciation.assetNotFound'));
      const brut = Number(asset.acquisitionValue) || 0;
      const residual = Number(asset.residualValue) || 0;
      const base = Math.max(0, brut - residual);
      const accountCode = String(asset.accountCode || '');
      if (!accountCode) throw new Error(t('depreciation.missingAssetAccount'));
      const oldCumul = Number(asset.cumulDepreciation) || 0;
      const newCumul = Math.min(Math.max(0, formData.montant), base);
      const delta = Math.round(newCumul - oldCumul);
      if (delta === 0) { toast(t('depreciation.noCumulChange')); setShowEditDepreciationModal(false); setDepreciationToEdit(null); resetForm(); return; }
      const exercice = String(new Date().getFullYear());
      const dotationAccount = dotationAccountFor(accountCode);
      const amortAccount = amortAccountFor(accountCode, String(asset.depreciationAccountCode || ''));
      const abs = Math.abs(delta);
      // delta>0 : dotation complémentaire (Dr 681 / Cr 28). delta<0 : reprise (Dr 28 / Cr 681).
      const lines = delta > 0
        ? [
            { id: crypto.randomUUID(), accountCode: dotationAccount, accountName: 'Dotation aux amortissements', label: `Ajustement dotation ${asset.name}`, debit: abs, credit: 0 },
            { id: crypto.randomUUID(), accountCode: amortAccount, accountName: 'Amortissements cumulés', label: `Ajustement amort. ${asset.name}`, debit: 0, credit: abs },
          ]
        : [
            { id: crypto.randomUUID(), accountCode: amortAccount, accountName: 'Amortissements cumulés', label: `Reprise amort. ${asset.name}`, debit: abs, credit: 0 },
            { id: crypto.randomUUID(), accountCode: dotationAccount, accountName: 'Dotation aux amortissements', label: `Reprise dotation ${asset.name}`, debit: 0, credit: abs },
          ];
      await safeAddEntry(adapter, {
        id: crypto.randomUUID(),
        entryNumber: `AMORT-ADJ-${Date.now().toString(36).toUpperCase()}-${String(asset.code || '').slice(0, 6)}`,
        journal: 'OD',
        date: `${exercice}-12-31`,
        reference: `AMORT-ADJ-${exercice}-${assetId}`,
        label: `Ajustement amortissement — ${asset.name}`,
        status: 'validated',
        lines,
        createdAt: new Date().toISOString(),
        createdBy: 'system',
      } as any, { skipSyncValidation: true });
      await adapter.update('assets', assetId, { cumulDepreciation: newCumul });
      toast.success(t('depreciation.adjustSuccess'));
      queryClient.invalidateQueries({ queryKey: ['depreciation'] });
      queryClient.invalidateQueries({ queryKey: ['fixed-assets'] });
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      setShowEditDepreciationModal(false);
      setDepreciationToEdit(null);
      resetForm();
    } catch (error) {
      toast.error((error as Error).message || t('depreciation.updateError'));
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
        toast.error(t('depreciation.formErrors'));
      } else {
        toast.error(t('depreciation.createError'));
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
      case 'lineaire': return t('depreciation.methodLinear');
      case 'degressive': return t('depreciation.methodDeclining');
      case 'unites_oeuvre': return t('depreciation.methodUnits');
      case 'exceptionnelle': return t('depreciation.methodExceptional');
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
      case 'calcule': return t('depreciation.statusCalculated');
      case 'comptabilise': return t('depreciation.statusPosted');
      case 'annule': return t('depreciation.statusCancelled');
      case 'provisoire': return t('depreciation.statusProvisional');
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
              {t('depreciation.title')}
            </h1>
            <p className="mt-2 text-[var(--color-text-secondary)]">
              {t('depreciation.subtitle')}
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
                  {t('depreciation.modeAuto')}
                </>
              ) : (
                <>
                  <Calculator className="mr-2 h-4 w-4" />
                  {t('depreciation.modeManual')}
                </>
              )}
            </Button>
            <ExportMenu
              data={(depreciationData?.results || []) as unknown as Record<string, unknown>[]}
              filename="amortissements"
              columns={{
                date_amortissement: t('depreciation.colDate'),
                nom_actif: t('depreciation.colAsset'),
                code_actif: t('depreciation.colAssetCode'),
                methode: t('depreciation.colMethod'),
                periode: t('depreciation.colPeriod'),
                valeur_base: t('depreciation.colBaseValue'),
                taux_amortissement: t('depreciation.colRatePct'),
                montant_dotation: t('depreciation.colCharge'),
                cumul_amortissements: t('depreciation.colAccumulated'),
                valeur_nette_comptable: t('depreciation.colNbv'),
                statut: t('depreciation.colStatus')
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
                    {t('depreciation.calculating')}
                  </>
                ) : (
                  <>
                    <Calculator className="mr-2 h-4 w-4" />
                    {t('depreciation.calculate')}
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
                {t('depreciation.newDepreciation')}
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
                  {t('depreciation.postingAll')}
                </>
              ) : (
                <>
                  <DollarSign className="mr-2 h-4 w-4" />
                  {t('depreciation.postAll')}
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
                <p className="text-sm font-medium text-gray-600">{t('depreciation.totalPeriod')}</p>
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
                <p className="text-sm font-medium text-gray-600">{t('depreciation.totalPosted')}</p>
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
                <p className="text-sm font-medium text-gray-600">{t('depreciation.operationsCount')}</p>
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
            {t('depreciation.filtersAndParams')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('depreciation.searchPlaceholder')}
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filters.actif} onValueChange={(value) => handleFilterChange('actif', value)}>
              <SelectTrigger>
                <SelectValue placeholder={t('depreciation.allAssets')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('depreciation.allAssets')}</SelectItem>
                {assets?.results?.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.designation} ({asset.code_immobilisation})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.methode} onValueChange={(value) => handleFilterChange('methode', value)}>
              <SelectTrigger>
                <SelectValue placeholder={t('depreciation.allMethodsShort')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('depreciation.allMethods')}</SelectItem>
                <SelectItem value="lineaire">{t('depreciation.methodLinear')}</SelectItem>
                <SelectItem value="degressive">{t('depreciation.methodDeclining')}</SelectItem>
                <SelectItem value="unites_oeuvre">{t('depreciation.methodUnits')}</SelectItem>
                <SelectItem value="exceptionnelle">{t('depreciation.methodExceptional')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.statut} onValueChange={(value) => handleFilterChange('statut', value)}>
              <SelectTrigger>
                <SelectValue placeholder={t('depreciation.allStatusesShort')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('depreciation.allStatuses')}</SelectItem>
                <SelectItem value="calcule">{t('depreciation.statusCalculated')}</SelectItem>
                <SelectItem value="comptabilise">{t('depreciation.statusPosted')}</SelectItem>
                <SelectItem value="provisoire">{t('depreciation.statusProvisional')}</SelectItem>
                <SelectItem value="annule">{t('depreciation.statusCancelled')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.periode} onValueChange={(value) => handleFilterChange('periode', value)}>
              <SelectTrigger>
                <SelectValue placeholder={t('depreciation.allPeriodsShort')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('depreciation.allPeriods')}</SelectItem>
                <SelectItem value="mensuel">{t('depreciation.periodMonthly')}</SelectItem>
                <SelectItem value="trimestriel">{t('depreciation.periodQuarterly')}</SelectItem>
                <SelectItem value="annuel">{t('depreciation.periodAnnual')}</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => setShowPeriodModal(true)}
              className="flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              {t('depreciation.selectPeriod')}
            </Button>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={resetFilters}>
              {t('depreciation.reset')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Depreciation Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('depreciation.tableTitle')}</span>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {t('depreciation.fromTo', { start: formatDate(filters.date_debut), end: formatDate(filters.date_fin) })}
              </span>
              {depreciationData && (
                <Badge variant="outline">
                  {t('depreciation.operationsBadge', { count: String(depreciationData.count) })}
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" text={t('depreciation.loading')} />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common.date')}</TableHead>
                      <TableHead>{t('depreciation.colAsset')}</TableHead>
                      <TableHead>{t('depreciation.colMethod')}</TableHead>
                      <TableHead>{t('depreciation.colPeriod')}</TableHead>
                      <TableHead className="text-right">{t('depreciation.colBaseValue')}</TableHead>
                      <TableHead className="text-right">{t('depreciation.thRate')}</TableHead>
                      <TableHead className="text-right">{t('depreciation.colCharge')}</TableHead>
                      <TableHead className="text-right">{t('depreciation.colAccumulated')}</TableHead>
                      <TableHead className="text-right">{t('depreciation.colNbv')}</TableHead>
                      <TableHead>{t('depreciation.colStatus')}</TableHead>
                      <TableHead className="text-right">{t('depreciation.thActions')}</TableHead>
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
                              aria-label={t('depreciation.viewDetails')}
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
                                  aria-label={t('depreciation.post')}
                                  title={t('depreciation.postTooltip')}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditDepreciation(depreciation)}
                                  aria-label={t('depreciation.edit')}
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
                                aria-label={t('depreciation.delete')}
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
                      <p className="text-sm font-medium text-gray-600">{t('depreciation.totalCharges')}</p>
                      <p className="text-lg font-bold text-red-700">
                        {formatCurrency(depreciationData.total_dotations || 0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">{t('depreciation.totalAccumulated')}</p>
                      <p className="text-lg font-bold text-orange-700">
                        {formatCurrency(depreciationData.total_cumul || 0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">{t('depreciation.totalNbv')}</p>
                      <p className="text-lg font-bold text-green-700">
                        {formatCurrency(depreciationData.total_vnc || 0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">{t('depreciation.averageRate')}</p>
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
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t('depreciation.emptyTitle')}</h3>
                  <p className="text-gray-600 mb-6">
                    {t('depreciation.emptyDesc')}
                  </p>
                  <div className="flex justify-center space-x-3">
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={handleCalculateDepreciation}
                      disabled={calculateDepreciationMutation.isPending}
                    >
                      <Calculator className="mr-2 h-4 w-4" />
                      {t('depreciation.calculateDepreciations')}
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
                <h2 className="text-lg font-bold text-gray-900">{t('depreciation.manualNewTitle')}</h2>
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
                      <h4 className="text-sm font-medium text-blue-900 mb-1">{t('depreciation.manualInfoTitle')}</h4>
                      <p className="text-sm text-blue-800">{t('depreciation.manualInfoDesc')}</p>
                    </div>
                  </div>
                </div>

                {/* Asset Selection */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">{t('depreciation.assetSelection')}</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('depreciation.assetLabel')}</label>
                      <Select
                        value={formData.immobilisation_id}
                        onValueChange={(value) => handleInputChange('immobilisation_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('depreciation.selectAssetPlaceholder')} />
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
                  <h3 className="text-md font-medium text-gray-900 mb-3">{t('depreciation.calcParams')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('depreciation.fiscalYearLabel')}</label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('depreciation.startDateLabel')}</label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('depreciation.endDateLabel')}</label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('depreciation.methodFullLabel')}</label>
                      <Select
                        value={formData.methode}
                        onValueChange={(value) => handleInputChange('methode', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('depreciation.selectMethodPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lineaire">{t('depreciation.methodLinear')}</SelectItem>
                          <SelectItem value="degressive">{t('depreciation.methodDeclining')}</SelectItem>
                          <SelectItem value="unites_oeuvre">{t('depreciation.methodUnits')}</SelectItem>
                          <SelectItem value="exceptionnelle">{t('depreciation.methodExceptional')}</SelectItem>
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
                  <h3 className="text-md font-medium text-gray-900 mb-3">{t('depreciation.amountsSection')}</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('depreciation.amountLabel')}</label>
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
                  <h3 className="text-md font-medium text-gray-900 mb-3">{t('depreciation.additionalInfo')}</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('depreciation.justificationLabel')}</label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder={t('depreciation.justificationPlaceholder')}
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
                {t('depreciation.cancel')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed" aria-label={t('depreciation.validate')}>
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>{t('depreciation.creating')}</span>
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
        title={t('depreciation.deleteConfirmTitle')}
        message={t('depreciation.deleteConfirmMessage')}
        variant="danger"
        confirmText={t('depreciation.delete')}
        cancelText={t('depreciation.cancel')}
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
        title={t('depreciation.calcConfirmTitle')}
        message={t('depreciation.calcConfirmMessage')}
        variant="info"
        confirmText={t('depreciation.calculate')}
        cancelText={t('depreciation.cancel')}
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
        title={t('depreciation.postAllTitle')}
        message={t('depreciation.postAllMessage')}
        variant="info"
        confirmText={t('depreciation.postAll')}
        cancelText={t('depreciation.cancel')}
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
                  <h2 className="text-lg font-bold text-neutral-900">{t('depreciation.postModalTitle')}</h2>
                  <p className="text-xs text-neutral-500">{t('depreciation.postModalSubtitle')}</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {/* Résumé actif */}
              <div className="bg-neutral-50 rounded-lg p-4 space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">{t('depreciation.colAsset')}</span>
                  <span className="font-semibold text-neutral-900">{selectedDepreciation.nom_actif}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">{t('depreciation.fieldCode')}</span>
                  <span className="font-mono text-neutral-700">{selectedDepreciation.code_actif}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">{t('depreciation.colMethod')}</span>
                  <span className="text-neutral-700">{getMethodeLabel(selectedDepreciation.methode)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">{t('depreciation.colPeriod')}</span>
                  <span className="text-neutral-700">{selectedDepreciation.periode}</span>
                </div>
              </div>

              {/* Détail des écritures OD */}
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">{t('depreciation.entriesSectionTitle')}</h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="text-left py-2 px-2 text-neutral-500 font-medium">{t('depreciation.thAccount')}</th>
                      <th className="text-left py-2 px-2 text-neutral-500 font-medium">{t('depreciation.thLabel')}</th>
                      <th className="text-right py-2 px-2 text-neutral-500 font-medium">{t('depreciation.thDebit')}</th>
                      <th className="text-right py-2 px-2 text-neutral-500 font-medium">{t('depreciation.thCredit')}</th>
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
                      <td colSpan={2} className="py-2 px-2 text-neutral-700">{t('depreciation.totalRow')}</td>
                      <td className="py-2 px-2 text-right font-mono">{formatCurrency(selectedDepreciation.montant_dotation)}</td>
                      <td className="py-2 px-2 text-right font-mono">{formatCurrency(selectedDepreciation.montant_dotation)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Impact */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <strong>{t('depreciation.impactLabel')}</strong>{' '}
                {t('depreciation.impactText', { amount: formatCurrency(selectedDepreciation.montant_dotation) })}
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
                {t('depreciation.cancel')}
              </button>
              <button
                onClick={confirmComptabiliser}
                disabled={comptabiliserMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
              >
                {comptabiliserMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t('depreciation.postingSingle')}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>{t('depreciation.post')}</span>
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
                <h2 className="text-lg font-bold text-gray-900">{t('depreciation.editModalTitle')}</h2>
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
                    <h4 className="text-sm font-medium text-blue-900 mb-1">{t('depreciation.editInfoTitle')}</h4>
                    <p className="text-sm text-blue-800">
                      {t('depreciation.editInfoDesc', { name: depreciationToEdit.nom_actif })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('depreciation.fiscalYearLabel')}</label>
                  <Input
                    placeholder="2026"
                    className="text-gray-900"
                    value={formData.exercice}
                    onChange={(e) => handleInputChange('exercice', e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('depreciation.methodLabel')}</label>
                  <Select
                    value={formData.methode}
                    onValueChange={(value) => handleInputChange('methode', value)}
                  >
                    <SelectTrigger className="text-gray-900">
                      <SelectValue placeholder={t('depreciation.selectMethodPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lineaire">{t('depreciation.methodLinear')}</SelectItem>
                      <SelectItem value="degressive">{t('depreciation.methodDeclining')}</SelectItem>
                      <SelectItem value="unites_oeuvre">{t('depreciation.methodUnits')}</SelectItem>
                      <SelectItem value="exceptionnelle">{t('depreciation.methodExceptional')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('depreciation.startDateLabel')}</label>
                  <Input
                    type="date"
                    value={formData.date_debut}
                    onChange={(e) => handleInputChange('date_debut', e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('depreciation.endDateLabel')}</label>
                  <Input
                    type="date"
                    value={formData.date_fin}
                    onChange={(e) => handleInputChange('date_fin', e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('depreciation.amountLabel')}</label>
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
                {t('depreciation.cancel')}
              </button>
              <button
                onClick={handleUpdateDepreciation}
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t('depreciation.updating')}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>{t('depreciation.save')}</span>
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