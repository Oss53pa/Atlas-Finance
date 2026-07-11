import type { DataAdapter } from '@atlas/data';
import { listEngagements, degageEngagement, createManualEngagement, engagementRestant, type BudgetEngagement } from './engagementService';

/**
 * Dégagement / report de fin d'exercice (refonte OPEX/CAPEX — Lot 6, §9).
 * À la clôture : solde tous les engagements ouverts selon la politique tenant :
 *   - 'report'     : dégage le reliquat ET le recrée sur N+1 (même maille, +1 an)
 *   - 'annulation' : dégage sec (reliquat libéré, rien recréé)
 * Le réalisé et l'engagé ferme restent inchangés. Idempotent par exercice (ne
 * retraite que les engagements encore ouverts).
 */

export type CarryoverPolicy = 'report' | 'annulation';

export interface CarryoverSummary { count: number; totalReliquat: number; }

/** Plan de dégagement (pur, testable) : engagements ouverts + reliquat total. */
export function carryoverSummary(engagements: BudgetEngagement[]): CarryoverSummary {
  const open = engagements.filter((e) => e.statut === 'ouvert' || e.statut === 'partiellement_facture' || e.statut === 'surfacture');
  const totalReliquat = open.reduce((s, e) => s + engagementRestant(e), 0);
  return { count: open.length, totalReliquat: Math.round(totalReliquat * 100) / 100 };
}

/** Décale une période (1er du mois) d'un an. */
export function shiftYear(periode: string, years = 1): string {
  const d = new Date(periode);
  return `${d.getFullYear() + years}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export interface CarryoverResult { discharged: number; recreated: number; totalReliquat: number; }

/** Exécute le dégagement de fin d'exercice pour l'année donnée. */
export async function runYearEndCarryover(adapter: DataAdapter, annee: string, policy: CarryoverPolicy): Promise<CarryoverResult> {
  const engagements = await listEngagements(adapter, { annee, statut: ['ouvert', 'partiellement_facture', 'surfacture'] });
  let discharged = 0, recreated = 0, totalReliquat = 0;
  for (const e of engagements) {
    const reliquat = engagementRestant(e);
    if (reliquat <= 0) continue;
    await degageEngagement(adapter, e.id);   // solde le reliquat
    discharged++; totalReliquat += reliquat;
    if (policy === 'report') {
      await createManualEngagement(adapter, {
        accountCode: e.account_code, sectionId: e.section_id, capexProjetId: e.capex_section_projet_id,
        periode: shiftYear(e.periode), montant: reliquat, fournisseur: e.fournisseur_libelle,
        reference: e.reference_document, motif: `Report clôture ${annee} (engagement ${e.id.slice(0, 8)})`,
      });
      recreated++;
    }
  }
  return { discharged, recreated, totalReliquat: Math.round(totalReliquat * 100) / 100 };
}
