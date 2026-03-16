// @ts-nocheck
import React, { useState, useMemo } from 'react';
import {
  Settings, Shield, ToggleLeft, Calculator, Calendar, DollarSign,
  Edit2, Save, RefreshCw, AlertTriangle, CheckCircle, ChevronDown,
  ChevronRight, Loader2, X,
} from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  seedTaxRegistryCI,
  seedIRPPBracketsCI,
} from '../../../services/fiscal/taxRegistrySeeds';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TaxCategory = 'INDIRECT' | 'DIRECT' | 'SOCIAL' | 'RETENUE' | 'AUTRE';

const CATEGORY_META: Record<TaxCategory, { label: string; color: string; icon: React.ElementType }> = {
  INDIRECT: { label: 'Taxes indirectes', color: 'bg-blue-100 text-blue-700', icon: DollarSign },
  DIRECT:   { label: 'Impots directs',   color: 'bg-amber-100 text-amber-700', icon: Calculator },
  SOCIAL:   { label: 'Charges sociales',  color: 'bg-green-100 text-green-700', icon: Shield },
  RETENUE:  { label: 'Retenues a la source', color: 'bg-purple-100 text-purple-700', icon: ToggleLeft },
  AUTRE:    { label: 'Autres taxes',      color: 'bg-gray-100 text-gray-700', icon: Settings },
};

const PERIODICITY_OPTIONS = [
  { value: 'MONTHLY', label: 'Mensuelle' },
  { value: 'QUARTERLY', label: 'Trimestrielle' },
  { value: 'ANNUAL', label: 'Annuelle' },
  { value: 'PUNCTUAL', label: 'Ponctuelle' },
];

/**
 * Derive a UI category from the seed data fields.
 */
function deriveTaxCategory(tax: any): TaxCategory {
  if (tax.taxCategory) return tax.taxCategory;
  const code: string = tax.taxCode ?? '';
  if (['TVA', 'AIRSI'].includes(code)) return 'INDIRECT';
  if (['IS', 'IS_ACOMPTE', 'IRPP_SALAIRES', 'PATENTE', 'TF'].includes(code)) return 'DIRECT';
  if (['CNPS_PATRON', 'CNPS_SALARIE', 'CMU', 'TA', 'FPC'].includes(code)) return 'SOCIAL';
  if (code.startsWith('RAS')) return 'RETENUE';
  return 'AUTRE';
}

// ---------------------------------------------------------------------------
// Confirmation Dialog
// ---------------------------------------------------------------------------

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ open, title, message, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-6 py-4 border-b">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="px-6 py-4 text-sm text-gray-600">{message}</div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600"
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const AdminTaxRegistry: React.FC = () => {
  const { adapter } = useData();
  const queryClient = useQueryClient();

  // ---- Data fetching ----
  const { data: taxes = [], isLoading, refetch } = useQuery({
    queryKey: ['taxRegistry'],
    queryFn: () => adapter.getAll('taxRegistry'),
  });

  // ---- State ----
  const [expandedCategories, setExpandedCategories] = useState<Set<TaxCategory>>(
    new Set(['INDIRECT', 'DIRECT', 'SOCIAL', 'RETENUE', 'AUTRE']),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [seedLoading, setSeedLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    taxId: string;
    field: string;
    value: any;
  }>({ open: false, taxId: '', field: '', value: null });

  // ---- Grouping ----
  const grouped = useMemo(() => {
    const map: Record<TaxCategory, any[]> = {
      INDIRECT: [], DIRECT: [], SOCIAL: [], RETENUE: [], AUTRE: [],
    };
    for (const tax of taxes) {
      const cat = deriveTaxCategory(tax);
      map[cat].push(tax);
    }
    return map;
  }, [taxes]);

  // ---- Handlers ----
  const toggleCategory = (cat: TaxCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const startEdit = (tax: any) => {
    setEditingId(tax.id);
    setEditForm({
      ratePct: tax.ratePct ?? '',
      declarationDeadlineDays: tax.declarationDeadlineDays ?? '',
      periodicity: tax.periodicity ?? 'MONTHLY',
      legalReference: tax.legalReference ?? '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleRateChange = (taxId: string, newRate: string) => {
    // Show confirmation before changing rate
    setConfirmDialog({
      open: true,
      taxId,
      field: 'ratePct',
      value: newRate,
    });
  };

  const confirmRateChange = () => {
    setEditForm((prev) => ({ ...prev, ratePct: confirmDialog.value }));
    setConfirmDialog({ open: false, taxId: '', field: '', value: null });
  };

  const saveEdit = async (taxId: string) => {
    try {
      await adapter.update('taxRegistry', taxId, {
        ratePct: editForm.ratePct !== '' ? Number(editForm.ratePct) : undefined,
        declarationDeadlineDays: editForm.declarationDeadlineDays !== '' ? Number(editForm.declarationDeadlineDays) : undefined,
        periodicity: editForm.periodicity,
        legalReference: editForm.legalReference || undefined,
        updatedAt: new Date().toISOString(),
      });
      toast.success('Taxe mise a jour avec succes');
      setEditingId(null);
      setEditForm({});
      queryClient.invalidateQueries({ queryKey: ['taxRegistry'] });
    } catch (err) {
      console.error('Error saving tax:', err);
      toast.error('Erreur lors de la mise a jour de la taxe');
    }
  };

  const toggleActive = async (tax: any) => {
    try {
      await adapter.update('taxRegistry', tax.id, {
        isActive: !tax.isActive,
        updatedAt: new Date().toISOString(),
      });
      toast.success(`${tax.taxCode} ${tax.isActive ? 'desactivee' : 'activee'}`);
      queryClient.invalidateQueries({ queryKey: ['taxRegistry'] });
    } catch (err) {
      console.error('Error toggling tax:', err);
      toast.error('Erreur lors du changement de statut');
    }
  };

  const handleSeedCI = async () => {
    setSeedLoading(true);
    try {
      await seedTaxRegistryCI(adapter);
      await seedIRPPBracketsCI(adapter);
      toast.success('Taxes CI initialisees avec succes');
      queryClient.invalidateQueries({ queryKey: ['taxRegistry'] });
    } catch (err) {
      console.error('Seed error:', err);
      toast.error('Erreur lors de l\'initialisation des taxes');
    } finally {
      setSeedLoading(false);
    }
  };

  const handleResetCI = async () => {
    setSeedLoading(true);
    try {
      // Delete existing entries then re-seed
      const existing = await adapter.getAll('taxRegistry');
      for (const t of existing) {
        await adapter.delete('taxRegistry', (t as any).id);
      }
      const existingBrackets = await adapter.getAll('taxBrackets');
      for (const b of existingBrackets) {
        await adapter.delete('taxBrackets', (b as any).id);
      }
      await seedTaxRegistryCI(adapter);
      await seedIRPPBracketsCI(adapter);
      toast.success('Taxes reinitialises aux valeurs CI par defaut');
      queryClient.invalidateQueries({ queryKey: ['taxRegistry'] });
    } catch (err) {
      console.error('Reset error:', err);
      toast.error('Erreur lors de la reinitialisation');
    } finally {
      setSeedLoading(false);
    }
  };

  // ---- Helpers ----
  const periodicityLabel = (p: string) =>
    PERIODICITY_OPTIONS.find((o) => o.value === p)?.label ?? p;

  const categoryBadge = (cat: TaxCategory) => {
    const meta = CATEGORY_META[cat];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
        {meta.label}
      </span>
    );
  };

  // ---- Render ----
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Chargement du registre fiscal...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-red-500" />
            Registre des taxes
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {taxes.length} taxe{taxes.length !== 1 ? 's' : ''} configuree{taxes.length !== 1 ? 's' : ''}
            {' '}&mdash; {taxes.filter((t: any) => t.isActive).length} active{taxes.filter((t: any) => t.isActive).length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {taxes.length === 0 && (
            <button
              onClick={handleSeedCI}
              disabled={seedLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50"
            >
              {seedLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Initialiser taxes CI
            </button>
          )}
          {taxes.length > 0 && (
            <button
              onClick={handleResetCI}
              disabled={seedLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              {seedLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Reinitialiser aux valeurs CI
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {taxes.length === 0 && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <Calculator className="w-10 h-10 mx-auto text-gray-400 mb-3" />
          <p className="text-sm text-gray-600 mb-1">Aucune taxe configuree</p>
          <p className="text-xs text-gray-400">
            Cliquez sur "Initialiser taxes CI" pour charger les taxes de reference de la Cote d'Ivoire.
          </p>
        </div>
      )}

      {/* Category sections */}
      {(Object.keys(CATEGORY_META) as TaxCategory[]).map((cat) => {
        const items = grouped[cat];
        if (items.length === 0) return null;
        const expanded = expandedCategories.has(cat);
        const meta = CATEGORY_META[cat];
        const Icon = meta.icon;

        return (
          <div key={cat} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Category header */}
            <button
              onClick={() => toggleCategory(cat)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-gray-500" />
                <span className="font-semibold text-gray-900">{meta.label}</span>
                <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                  {items.length}
                </span>
              </div>
              {expanded
                ? <ChevronDown className="w-5 h-5 text-gray-400" />
                : <ChevronRight className="w-5 h-5 text-gray-400" />}
            </button>

            {/* Tax rows */}
            {expanded && (
              <div className="border-t border-gray-200 divide-y divide-gray-100">
                {items.map((tax: any) => {
                  const isEditing = editingId === tax.id;

                  return (
                    <div key={tax.id} className="px-5 py-3 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-4">
                        {/* Toggle active */}
                        <button
                          onClick={() => toggleActive(tax)}
                          className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
                            tax.isActive ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                          title={tax.isActive ? 'Active — cliquer pour desactiver' : 'Inactive — cliquer pour activer'}
                        >
                          <span
                            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              tax.isActive ? 'left-[18px]' : 'left-0.5'
                            }`}
                          />
                        </button>

                        {/* Name + code */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 text-sm truncate">
                              {tax.label}
                            </span>
                            <span className="text-xs text-gray-400 font-mono">{tax.taxCode}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            {categoryBadge(deriveTaxCategory(tax))}
                            {tax.ratePct != null && (
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                {tax.ratePct}%
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {periodicityLabel(tax.periodicity)}
                            </span>
                            {tax.declarationDeadlineDays && (
                              <span>J+{tax.declarationDeadlineDays}</span>
                            )}
                            {tax.payableAccounts?.length > 0 && (
                              <span className="text-gray-400">
                                Cpte: {tax.payableAccounts.join(', ')}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        {!isEditing ? (
                          <button
                            onClick={() => startEdit(tax)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => saveEdit(tax.id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Enregistrer"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Annuler"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Edit form */}
                      {isEditing && (
                        <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* Rate */}
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Taux (%)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.ratePct}
                              onChange={(e) => handleRateChange(tax.id, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                              placeholder="Ex: 18"
                            />
                          </div>

                          {/* Periodicity */}
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Periodicite</label>
                            <select
                              value={editForm.periodicity}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, periodicity: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                            >
                              {PERIODICITY_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                          </div>

                          {/* Deadline days */}
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Echeance (jours)</label>
                            <input
                              type="number"
                              value={editForm.declarationDeadlineDays}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, declarationDeadlineDays: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                              placeholder="Ex: 15"
                            />
                          </div>

                          {/* Legal reference */}
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Reference legale</label>
                            <input
                              type="text"
                              value={editForm.legalReference}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, legalReference: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                              placeholder="Art. XX CGI"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Summary card */}
      {taxes.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Resume du registre
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {(Object.keys(CATEGORY_META) as TaxCategory[]).map((cat) => {
              const meta = CATEGORY_META[cat];
              const count = grouped[cat].length;
              const active = grouped[cat].filter((t: any) => t.isActive).length;
              return (
                <div key={cat} className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500 mb-1">{meta.label}</div>
                  <div className="text-lg font-bold text-gray-900">{count}</div>
                  <div className="text-xs text-green-600">{active} active{active !== 1 ? 's' : ''}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Confirmation dialog for rate changes */}
      <ConfirmDialog
        open={confirmDialog.open}
        title="Modification du taux"
        message={`Vous etes sur le point de modifier le taux de cette taxe. Cette modification affectera tous les calculs futurs. Confirmez-vous le changement ?`}
        onConfirm={confirmRateChange}
        onCancel={() => setConfirmDialog({ open: false, taxId: '', field: '', value: null })}
      />
    </div>
  );
};

export default AdminTaxRegistry;
