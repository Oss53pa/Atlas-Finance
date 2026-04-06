// @ts-nocheck

/**
 * closureTools — Assistance clôture, régularisations, affectation résultat.
 */
import type { ToolDefinition } from './ToolRegistry';
import type { DataAdapter } from '@atlas/data';
import { previewClosure, canClose } from '../../closureService';
import { genererEcrituresRegularisation } from '../../cloture/regularisationsService';
import { proposerAffectation, genererEcrituresAffectation } from '../../cloture/affectationResultatService';

function dataTool(name: string, description: string, parameters: Record<string, unknown>, required: string[], execute: (args: Record<string, unknown>, adapter: DataAdapter) => Promise<string>): [string, ToolDefinition] {
  return [name, {
    schema: { type: 'function', function: { name, description, parameters: { type: 'object', properties: parameters, required } } },
    execute: async (args, adapter) => {
      if (!adapter) return JSON.stringify({ error: 'DataAdapter non disponible.' });
      return execute(args, adapter);
    },
  }];
}

export const closureTools: Record<string, ToolDefinition> = Object.fromEntries([
  dataTool('assister_cloture',
    "Vérifier si un exercice peut être clôturé et prévisualiser le résultat de clôture",
    {
      exerciceId: { type: 'string', description: "ID de l'exercice à clôturer" },
    },
    ['exerciceId'],
    async (args, adapter) => {
      const [eligibility, preview] = await Promise.all([
        canClose(adapter, args.exerciceId as string),
        previewClosure(adapter, args.exerciceId as string),
      ]);
      return JSON.stringify({
        peutCloturer: eligibility.canClose,
        raisons: eligibility.reasons,
        apercu: {
          totalEcritures: preview.totalEntries,
          ecrituresAVerrouiller: preview.entriesToLock,
          totalProduits: preview.totalProduits,
          totalCharges: preview.totalCharges,
          resultatNet: preview.resultatNet,
          estBenefice: preview.isBenefice,
          reportANouveau: preview.carryForward,
          avertissements: preview.warnings,
        },
      });
    }),

  dataTool('generer_regularisations',
    'Générer les écritures de régularisation (CCA, FNP, FAE, PCA) pour la clôture',
    {
      type: { type: 'string', description: 'Type: CCA (Charges Constatées d\'Avance), FNP (Factures Non Parvenues), FAE (Factures À Établir), PCA (Produits Constatés d\'Avance)' },
      compteCharge: { type: 'string', description: 'Compte de charge ou produit concerné' },
      montant: { type: 'number', description: 'Montant de la régularisation en FCFA' },
      libelle: { type: 'string', description: 'Libellé explicatif' },
      dateComptable: { type: 'string', description: 'Date comptable (YYYY-MM-DD)' },
    },
    ['type', 'montant'],
    async (args, adapter) => {
      const result = await genererEcrituresRegularisation(adapter, {
        type: args.type as string,
        compteCharge: args.compteCharge as string,
        montant: args.montant as number,
        libelle: args.libelle as string,
        dateComptable: args.dateComptable as string,
      });
      return JSON.stringify(result);
    }),

  dataTool('generer_affectation_resultat',
    "Proposer l'affectation du résultat (réserve légale, dividendes, report à nouveau)",
    {
      resultatNet: { type: 'number', description: 'Résultat net de l\'exercice' },
      capitalSocial: { type: 'number', description: 'Capital social' },
      reserveLegaleActuelle: { type: 'number', description: 'Montant actuel de la réserve légale' },
    },
    ['resultatNet', 'capitalSocial'],
    async (args) => {
      const proposition = proposerAffectation(
        args.resultatNet as number,
        args.capitalSocial as number,
        (args.reserveLegaleActuelle as number) || 0,
      );
      return JSON.stringify(proposition);
    }),
]);
