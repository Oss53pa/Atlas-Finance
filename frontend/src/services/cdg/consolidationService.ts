/**
 * Consolidation multi-societes — SYSCOHADA revise.
 * Integration globale (>50%) et mise en equivalence (20-50%).
 */
import { Money, money } from '../../utils/money';

// ============================================================================
// TYPES
// ============================================================================

export type MethodeConsolidation = 'integration_globale' | 'integration_proportionnelle' | 'mise_en_equivalence' | 'non_consolide';

export interface Societe {
  id: string;
  code: string;
  nom: string;
  siren?: string;
  devise: string;
  estMere: boolean;
}

export interface LienParticipation {
  id: string;
  societeMereId: string;
  filialId: string;
  pourcentageDetention: number;
  pourcentageControle: number;
  methodeConsolidation: MethodeConsolidation;
  dateAcquisition: string;
  ecartAcquisition: number;
}

export interface PerimetreConsolidation {
  id: string;
  nom: string;
  exerciceId: string;
  societeMere: Societe;
  participations: LienParticipation[];
  societes: Societe[];
}

export interface OperationIntraGroupe {
  id: string;
  societeDebitrice: string;
  societeCreditrice: string;
  montant: number;
  nature: string;
  compte: string;
  eliminee: boolean;
}

export interface EtatConsolide {
  type: 'bilan' | 'resultat' | 'flux';
  lignes: LigneConsolidee[];
  totalActif?: number;
  totalPassif?: number;
  resultatConsolide?: number;
}

export interface LigneConsolidee {
  compte: string;
  libelle: string;
  montantMere: number;
  montantsFiliales: Record<string, number>;
  eliminations: number;
  montantConsolide: number;
}

export interface ConsolidationResult {
  success: boolean;
  etats?: EtatConsolide[];
  operationsEliminees?: number;
  error?: string;
}

// ============================================================================
// SERVICE
// ============================================================================

/**
 * Determine the consolidation method based on ownership percentage.
 */
export function determinerMethode(pourcentageControle: number): MethodeConsolidation {
  if (pourcentageControle > 50) return 'integration_globale';
  if (pourcentageControle >= 20) return 'mise_en_equivalence';
  return 'non_consolide';
}

/**
 * Calculate minority interests for a subsidiary.
 */
export function calculerInteretsMinoritaires(
  resultatFiliale: number,
  pourcentageDetention: number
): number {
  const partMinoritaire = 100 - pourcentageDetention;
  return money(resultatFiliale).multiply(partMinoritaire).divide(100).round(2).toNumber();
}

/**
 * Calculate the group's share of a subsidiary's result.
 */
export function calculerPartGroupe(
  resultatFiliale: number,
  pourcentageDetention: number
): number {
  return money(resultatFiliale).multiply(pourcentageDetention).divide(100).round(2).toNumber();
}

/**
 * Identify intra-group operations to eliminate.
 */
export function identifierOperationsIntraGroupe(
  operations: OperationIntraGroupe[],
  societeIds: string[]
): OperationIntraGroupe[] {
  return operations.filter(
    op => societeIds.includes(op.societeDebitrice) && societeIds.includes(op.societeCreditrice)
  );
}

/**
 * Eliminate intra-group operations (set montant to 0 in consolidation).
 */
export function eliminerOperationsIntraGroupe(
  operations: OperationIntraGroupe[]
): { eliminated: OperationIntraGroupe[]; totalElimine: number } {
  let totalElimine = 0;
  const eliminated = operations.map(op => {
    totalElimine += op.montant;
    return { ...op, eliminee: true };
  });
  return { eliminated, totalElimine: money(totalElimine).round(2).toNumber() };
}

/**
 * Consolidate a balance line across all entities in the perimeter.
 */
export function consoliderLigne(
  compte: string,
  libelle: string,
  montantMere: number,
  filiales: Array<{ societeId: string; montant: number; pourcentage: number; methode: MethodeConsolidation }>,
  eliminationIntraGroupe: number = 0
): LigneConsolidee {
  const montantsFiliales: Record<string, number> = {};
  let totalFiliales = 0;

  for (const f of filiales) {
    let contribution: number;
    switch (f.methode) {
      case 'integration_globale':
        contribution = f.montant; // 100% of the amount
        break;
      case 'integration_proportionnelle':
        contribution = money(f.montant).multiply(f.pourcentage).divide(100).round(2).toNumber();
        break;
      case 'mise_en_equivalence':
        contribution = money(f.montant).multiply(f.pourcentage).divide(100).round(2).toNumber();
        break;
      default:
        contribution = 0;
    }
    montantsFiliales[f.societeId] = contribution;
    totalFiliales += contribution;
  }

  const montantConsolide = money(montantMere)
    .add(money(totalFiliales))
    .subtract(money(eliminationIntraGroupe))
    .round(2)
    .toNumber();

  return {
    compte,
    libelle,
    montantMere,
    montantsFiliales,
    eliminations: eliminationIntraGroupe,
    montantConsolide,
  };
}

/**
 * Build a consolidation perimeter from parent-subsidiary relationships.
 */
export function construirePerimetre(
  societeMere: Societe,
  participations: LienParticipation[],
  toutesLesSocietes: Societe[]
): PerimetreConsolidation {
  // Auto-determine consolidation methods
  const participationsAvecMethode = participations.map(p => ({
    ...p,
    methodeConsolidation: p.methodeConsolidation || determinerMethode(p.pourcentageControle),
  }));

  const filialeIds = participationsAvecMethode
    .filter(p => p.methodeConsolidation !== 'non_consolide')
    .map(p => p.filialId);

  const societesDansPerimetre = toutesLesSocietes.filter(
    s => s.id === societeMere.id || filialeIds.includes(s.id)
  );

  return {
    id: crypto.randomUUID(),
    nom: `Consolidation ${societeMere.nom}`,
    exerciceId: '',
    societeMere,
    participations: participationsAvecMethode,
    societes: societesDansPerimetre,
  };
}

/**
 * Validate consolidation perimeter.
 */
export function validerPerimetre(perimetre: PerimetreConsolidation): string[] {
  const errors: string[] = [];

  if (!perimetre.societeMere) {
    errors.push('Societe mere non definie.');
  }

  if (perimetre.participations.length === 0) {
    errors.push('Aucune participation definie.');
  }

  for (const p of perimetre.participations) {
    if (p.pourcentageDetention < 0 || p.pourcentageDetention > 100) {
      errors.push(`Participation ${p.filialId} : pourcentage invalide (${p.pourcentageDetention}%).`);
    }
  }

  // Check for circular references
  const filialeIds = perimetre.participations.map(p => p.filialId);
  if (filialeIds.includes(perimetre.societeMere.id)) {
    errors.push('Reference circulaire : la societe mere est aussi une filiale.');
  }

  return errors;
}
