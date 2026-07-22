/**
 * RegularisationsTab — Saisie et génération des régularisations mensuelles/annuelles.
 * Types: CCA, PCA, FNP, FAE (SYSCOHADA révisé).
 */
import React, { useState, useCallback, useEffect } from 'react';
import { useData } from '../../../contexts/DataContext';
import {
  creerRegularisation,
  genererEcrituresRegularisation,
  calculerCCA,
  calculerPCA,
} from '../../../services/cloture/regularisationsService';
import type { Regularisation, TypeRegularisation } from '../../../services/cloture/regularisationsService';
import { previewExtournes, genererExtournes } from '../../../services/cloture/extourneService';
import type { RegularisationEntry } from '../../../services/cloture/extourneService';
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
  // Régularisations DÉJÀ comptabilisées sur l'exercice (source : le grand livre,
  // via les comptes 476/477/486/487/408/418). Auparavant seul un COMPTEUR était
  // affiché — l'écran ne montrait jamais ce qui existait déjà en base.
  const [comptabilisees, setComptabilisees] = useState<RegularisationEntry[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [extourneLoading, setExtourneLoading] = useState(false);
  const [showComptabilisees, setShowComptabilisees] = useState(true);

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

  const chargerComptabilisees = useCallback(async () => {
    if (!exerciceId) { setComptabilisees([]); return; }
    setPreviewLoading(true);
    try {
      const result = await previewExtournes(adapter, exerciceId);
      setComptabilisees(result.regularisations);
    } catch (err) {
      toast.error('Erreur de lecture des régularisations');
    } finally {
      setPreviewLoading(false);
    }
  }, [adapter, exerciceId]);

  useEffect(() => { chargerComptabilisees(); }, [chargerComptabilisees]);

  /**
   * Génère les extournes des régularisations de l'exercice.
   * L'extourne est datée du 1er jour de l'exercice suivant (cut-off SYSCOHADA :
   * la charge/le produit constaté d'avance bascule sur N+1).
   */
  const handleGenererExtournes = useCallback(async () => {
    if (comptabilisees.length === 0) {
      toast.error('Aucune régularisation à extourner');
      return;
    }
    const cloture = new Date(dateClotureExercice);
    cloture.setDate(cloture.getDate() + 1);
    const dateExtourne = cloture.toISOString().slice(0, 10);

    setExtourneLoading(true);
    try {
      const result = await genererExtournes(adapter, { exerciceClotureId: exerciceId, dateExtourne });
      if (result.success) {
        toast.success(`${result.count ?? 0} extourne(s) générée(s) au ${dateExtourne}`);
        await chargerComptabilisees();
      } else {
        toast.error(result.error || 'Erreur');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setExtourneLoading(false);
    }
  }, [adapter, exerciceId, dateClotureExercice, comptabilisees.length, chargerComptabilisees]);

  const totalComptabilise = comptabilisees.reduce((s, r) => s + (r.entry.totalDebit || 0), 0);

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
            onClick={chargerComptabilisees}
            disabled={previewLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            Actualiser
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

      {/* Régularisations DÉJÀ comptabilisées — lues dans le grand livre */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowComptabilisees(v => !v)}
          className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-gray-50 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-gray-800">
            <FileText className="w-4 h-4 text-gray-400" />
            Régularisations comptabilisées sur l'exercice
            <span className="font-normal text-gray-400">
              ({comptabilisees.length} — {formatCurrency(totalComptabilise)})
            </span>
          </span>
          <span className="text-xs text-blue-600">{showComptabilisees ? 'Masquer' : 'Afficher'}</span>
        </button>

        {showComptabilisees && (
          <div className="border-t border-gray-100">
            {previewLoading ? (
              <p className="px-4 py-6 text-sm text-gray-400 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Lecture du grand livre…
              </p>
            ) : comptabilisees.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400">
                Aucune écriture sur les comptes de régularisation (476 / 477 / 486 / 487 / 408 / 418)
                non encore extournée sur cet exercice.
              </p>
            ) : (
              <>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr className="text-left text-gray-500 border-b">
                        <th className="px-4 py-1.5">Pièce</th>
                        <th className="px-4 py-1.5 w-16">Type</th>
                        <th className="px-4 py-1.5 w-24">Date</th>
                        <th className="px-4 py-1.5">Libellé</th>
                        <th className="px-4 py-1.5 w-32 text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comptabilisees.map(({ entry, type }) => (
                        <tr key={entry.id} className="border-b last:border-0">
                          <td className="px-4 py-1.5 font-mono text-gray-600">{entry.entryNumber}</td>
                          <td className="px-4 py-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">{type}</span>
                          </td>
                          <td className="px-4 py-1.5 text-gray-400">{entry.date}</td>
                          <td className="px-4 py-1.5 text-gray-600 truncate max-w-xs">{entry.label}</td>
                          <td className="px-4 py-1.5 text-right text-gray-700">
                            {formatCurrency(entry.totalDebit || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2 border-t bg-gray-50 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-gray-500">
                    Ces {comptabilisees.length} écriture(s) doivent être extournées au 1<sup>er</sup> jour
                    de l'exercice suivant (cut-off SYSCOHADA).
                  </p>
                  <button
                    onClick={handleGenererExtournes}
                    disabled={extourneLoading || !exerciceId}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50"
                  >
                    {extourneLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    Générer les {comptabilisees.length} extourne(s)
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

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
