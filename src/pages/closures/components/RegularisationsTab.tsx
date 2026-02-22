/**
 * RegularisationsTab — Saisie et génération des régularisations mensuelles/annuelles.
 * Types: CCA, PCA, FNP, FAE (SYSCOHADA révisé).
 */
import React, { useState, useCallback } from 'react';
import { useData } from '../../../contexts/DataContext';
import {
  creerRegularisation,
  genererEcrituresRegularisation,
  calculerCCA,
  calculerPCA,
} from '../../../services/cloture/regularisationsService';
import type { Regularisation, TypeRegularisation } from '../../../services/cloture/regularisationsService';
import { previewExtournes } from '../../../services/cloture/extourneService';
import { formatCurrency } from '../../../utils/formatters';
import toast from 'react-hot-toast';
import {
  Plus,
  Trash2,
  FileText,
  Eye,
  Play,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

interface RegularisationsTabProps {
  exerciceId: string;
  dateClotureExercice: string;
  periodeCode?: string;
}

const TYPES: { value: TypeRegularisation; label: string; desc: string }[] = [
  { value: 'CCA', label: 'CCA', desc: 'Charges constatées d\'avance' },
  { value: 'PCA', label: 'PCA', desc: 'Produits constatés d\'avance' },
  { value: 'FNP', label: 'FNP', desc: 'Fournisseurs, factures non parvenues' },
  { value: 'FAE', label: 'FAE', desc: 'Clients, factures à établir' },
];

interface RegulForm {
  type: TypeRegularisation;
  libelle: string;
  montant: string;
  compteCharge: string;
  periodeOrigine: string;
  periodeImputation: string;
  dateDebut: string;
  dateFin: string;
  extourneAuto: boolean;
}

const emptyForm: RegulForm = {
  type: 'CCA',
  libelle: '',
  montant: '',
  compteCharge: '',
  periodeOrigine: '',
  periodeImputation: '',
  dateDebut: '',
  dateFin: '',
  extourneAuto: true,
};

function RegularisationsTab({ exerciceId, dateClotureExercice, periodeCode }: RegularisationsTabProps) {
  const { adapter } = useData();
  const [regularisations, setRegularisations] = useState<Regularisation[]>([]);
  const [form, setForm] = useState<RegulForm>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [extournePreview, setExtournePreview] = useState<{ count: number } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const handleAdd = useCallback(() => {
    const montant = parseFloat(form.montant);
    if (!form.libelle || isNaN(montant) || montant <= 0 || !form.compteCharge) {
      toast.error('Remplissez tous les champs obligatoires');
      return;
    }

    // Calculate prorata for CCA/PCA
    let montantFinal = montant;
    if ((form.type === 'CCA' || form.type === 'PCA') && form.dateDebut && form.dateFin) {
      montantFinal = calculerCCA({
        montantCharge: montant,
        dateDebut: form.dateDebut,
        dateFin: form.dateFin,
        dateClotureExercice,
      });
      if (montantFinal === 0) {
        toast.error('Prorata nul — la charge est entièrement dans l\'exercice');
        return;
      }
    }

    const regul = creerRegularisation(
      form.type,
      form.libelle,
      montantFinal,
      form.compteCharge,
      form.periodeOrigine || periodeCode || '',
      form.periodeImputation || '',
      form.extourneAuto,
    );

    setRegularisations(prev => [...prev, regul]);
    setForm(emptyForm);
    setShowForm(false);
    toast.success(`Régularisation ${form.type} ajoutée (${formatCurrency(montantFinal)})`);
  }, [form, dateClotureExercice, periodeCode]);

  const handleRemove = (id: string) => {
    setRegularisations(prev => prev.filter(r => r.id !== id));
  };

  const handleGenerate = useCallback(async () => {
    if (regularisations.length === 0) {
      toast.error('Aucune régularisation à comptabiliser');
      return;
    }
    setExecuting(true);
    try {
      const result = await genererEcrituresRegularisation(adapter, {
        exerciceId,
        dateRegularisation: dateClotureExercice,
        regularisations,
      });
      if (result.success) {
        toast.success(`${regularisations.length} écriture(s) de régularisation générée(s)`);
        setRegularisations([]);
      } else {
        toast.error(result.error || 'Erreur');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setExecuting(false);
    }
  }, [adapter, exerciceId, dateClotureExercice, regularisations]);

  const handlePreviewExtournes = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const result = await previewExtournes(adapter, exerciceId);
      setExtournePreview(result);
    } catch (err) {
      toast.error('Erreur preview extournes');
    } finally {
      setPreviewLoading(false);
    }
  }, [adapter, exerciceId]);

  const totalRegul = regularisations.reduce((s, r) => s + r.montant, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Régularisations</h3>
          <p className="text-sm text-gray-500">CCA, PCA, FNP, FAE — SYSCOHADA révisé</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePreviewExtournes}
            disabled={previewLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            Preview extournes
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        </div>
      </div>

      {/* Extourne preview */}
      {extournePreview !== null && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <FileText className="w-4 h-4 inline mr-2" />
          {extournePreview.count} régularisation(s) à extourner lors de la clôture.
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <h4 className="font-medium text-gray-700">Nouvelle régularisation</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as TypeRegularisation }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                {TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.value} — {t.desc}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Libellé</label>
              <input
                value={form.libelle}
                onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="Description de la régularisation"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Montant</label>
              <input
                type="number"
                value={form.montant}
                onChange={e => setForm(f => ({ ...f, montant: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="0"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Compte de charge/produit</label>
              <input
                value={form.compteCharge}
                onChange={e => setForm(f => ({ ...f, compteCharge: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="ex: 613, 706..."
              />
            </div>
            {(form.type === 'CCA' || form.type === 'PCA') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Date début prestation</label>
                  <input
                    type="date"
                    value={form.dateDebut}
                    onChange={e => setForm(f => ({ ...f, dateDebut: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Date fin prestation</label>
                  <input
                    type="date"
                    value={form.dateFin}
                    onChange={e => setForm(f => ({ ...f, dateFin: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.extourneAuto}
                onChange={e => setForm(f => ({ ...f, extourneAuto: e.target.checked }))}
                className="rounded border-gray-300"
                id="extourne-auto"
              />
              <label htmlFor="extourne-auto" className="text-sm text-gray-600">Extourne automatique</label>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleAdd}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Ajouter
            </button>
            <button
              onClick={() => { setShowForm(false); setForm(emptyForm); }}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {regularisations.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-left text-gray-500">
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Libellé</th>
                <th className="px-4 py-2">Compte</th>
                <th className="px-4 py-2 text-right">Montant</th>
                <th className="px-4 py-2">Extourne</th>
                <th className="px-4 py-2 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {regularisations.map(r => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">{r.type}</span>
                  </td>
                  <td className="px-4 py-2 text-gray-800">{r.libelle}</td>
                  <td className="px-4 py-2 font-mono text-gray-600">{r.compteCharge}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatCurrency(r.montant)}</td>
                  <td className="px-4 py-2">
                    {r.extourneAuto ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <span className="text-gray-400 text-xs">Non</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <button onClick={() => handleRemove(r.id)} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-medium">
                <td colSpan={3} className="px-4 py-2">Total ({regularisations.length} régularisation(s))</td>
                <td className="px-4 py-2 text-right">{formatCurrency(totalRegul)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-500">
          <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p>Aucune régularisation en attente</p>
          <p className="text-xs mt-1">Cliquez sur « Ajouter » pour saisir une régularisation</p>
        </div>
      )}

      {/* Generate button */}
      {regularisations.length > 0 && (
        <button
          onClick={handleGenerate}
          disabled={executing}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Comptabiliser {regularisations.length} régularisation(s)
        </button>
      )}
    </div>
  );
}

export default RegularisationsTab;
