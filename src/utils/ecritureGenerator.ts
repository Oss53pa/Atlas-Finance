/**
 * Générateur d'écritures comptables — SYSCOHADA Révisé 2017
 * Génère les lignes d'écritures à partir de templates pour les opérations courantes.
 * Utilise Money class pour la précision financière.
 */
import { money } from './money';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LigneEcriture {
  compte: string;
  libelle: string;
  debit: number;
  credit: number;
}

export interface EcritureGeneree {
  date: string;
  journal: string;
  piece: string;
  libelle: string;
  lignes: LigneEcriture[];
}

type OperationType =
  | 'achat_marchandises'
  | 'achat_services'
  | 'vente_marchandises'
  | 'vente_services'
  | 'salaires'
  | 'cotisations_sociales'
  | 'reglement_client'
  | 'reglement_fournisseur'
  | 'emprunt_reception'
  | 'emprunt_remboursement'
  | 'immobilisation_acquisition'
  | 'dotation_amortissement'
  | 'is_charge'
  | 'tva_declaration';

// ---------------------------------------------------------------------------
// Templates d'écritures SYSCOHADA
// ---------------------------------------------------------------------------

interface TemplateParams {
  montantHT: number;
  montantTVA?: number;
  montantTTC?: number;
  tiers?: string;
  libelle?: string;
  compteCharge?: string;
  compteProduit?: string;
  compteTiers?: string;
  compteBanque?: string;
  date?: string;
  piece?: string;
  // Salaires
  salaireBrut?: number;
  cotisationsSalariales?: number;
  cotisationsPatronales?: number;
  netAPayer?: number;
  // IS
  montantIS?: number;
  // Immobilisation
  compteImmobilisation?: string;
  compteAmortissement?: string;
  compteDotation?: string;
  montantDotation?: number;
}

// ---------------------------------------------------------------------------
// Génération
// ---------------------------------------------------------------------------

export function genererEcriture(
  type: OperationType,
  params: TemplateParams
): EcritureGeneree {
  const date = params.date || new Date().toISOString().split('T')[0];
  const piece = params.piece || `${type.toUpperCase()}-${Date.now()}`;
  const libelle = params.libelle || getLibelleDefaut(type, params);

  switch (type) {
    case 'achat_marchandises':
      return {
        date, journal: 'AC', piece, libelle,
        lignes: [
          { compte: params.compteCharge || '601', libelle: `Achats marchandises - ${params.tiers || ''}`, debit: params.montantHT, credit: 0 },
          ...(params.montantTVA ? [{ compte: '4452', libelle: 'TVA récupérable sur achats', debit: params.montantTVA, credit: 0 }] : []),
          { compte: params.compteTiers || '401', libelle: `Fournisseur ${params.tiers || ''}`, debit: 0, credit: params.montantTTC || params.montantHT },
        ],
      };

    case 'achat_services':
      return {
        date, journal: 'AC', piece, libelle,
        lignes: [
          { compte: params.compteCharge || '604', libelle: `Services extérieurs - ${params.tiers || ''}`, debit: params.montantHT, credit: 0 },
          ...(params.montantTVA ? [{ compte: '4452', libelle: 'TVA récupérable sur services', debit: params.montantTVA, credit: 0 }] : []),
          { compte: params.compteTiers || '401', libelle: `Fournisseur ${params.tiers || ''}`, debit: 0, credit: params.montantTTC || params.montantHT },
        ],
      };

    case 'vente_marchandises':
      return {
        date, journal: 'VT', piece, libelle,
        lignes: [
          { compte: params.compteTiers || '411', libelle: `Client ${params.tiers || ''}`, debit: params.montantTTC || params.montantHT, credit: 0 },
          { compte: params.compteProduit || '701', libelle: `Ventes marchandises - ${params.tiers || ''}`, debit: 0, credit: params.montantHT },
          ...(params.montantTVA ? [{ compte: '4431', libelle: 'TVA facturée sur ventes', debit: 0, credit: params.montantTVA }] : []),
        ],
      };

    case 'vente_services':
      return {
        date, journal: 'VT', piece, libelle,
        lignes: [
          { compte: params.compteTiers || '411', libelle: `Client ${params.tiers || ''}`, debit: params.montantTTC || params.montantHT, credit: 0 },
          { compte: params.compteProduit || '706', libelle: `Prestations de services - ${params.tiers || ''}`, debit: 0, credit: params.montantHT },
          ...(params.montantTVA ? [{ compte: '4431', libelle: 'TVA facturée sur services', debit: 0, credit: params.montantTVA }] : []),
        ],
      };

    case 'salaires': {
      const brut = params.salaireBrut || params.montantHT;
      const cotSal = params.cotisationsSalariales || 0;
      const cotPat = params.cotisationsPatronales || 0;
      const net = params.netAPayer || money(brut).subtract(cotSal).toNumber();
      return {
        date, journal: 'OD', piece, libelle,
        lignes: [
          { compte: '661', libelle: 'Rémunérations du personnel', debit: brut, credit: 0 },
          { compte: '431', libelle: 'Sécurité sociale (part salariale)', debit: 0, credit: cotSal },
          { compte: '421', libelle: 'Personnel - rémunérations dues', debit: 0, credit: net },
          { compte: '664', libelle: 'Charges sociales employeur', debit: cotPat, credit: 0 },
          { compte: '431', libelle: 'Sécurité sociale (part patronale)', debit: 0, credit: cotPat },
        ],
      };
    }

    case 'cotisations_sociales':
      return {
        date, journal: 'BQ', piece, libelle,
        lignes: [
          { compte: '431', libelle: 'Règlement cotisations sociales', debit: params.montantHT, credit: 0 },
          { compte: params.compteBanque || '521', libelle: 'Banque', debit: 0, credit: params.montantHT },
        ],
      };

    case 'reglement_client':
      return {
        date, journal: 'BQ', piece, libelle,
        lignes: [
          { compte: params.compteBanque || '521', libelle: 'Banque - encaissement', debit: params.montantHT, credit: 0 },
          { compte: params.compteTiers || '411', libelle: `Client ${params.tiers || ''}`, debit: 0, credit: params.montantHT },
        ],
      };

    case 'reglement_fournisseur':
      return {
        date, journal: 'BQ', piece, libelle,
        lignes: [
          { compte: params.compteTiers || '401', libelle: `Fournisseur ${params.tiers || ''}`, debit: params.montantHT, credit: 0 },
          { compte: params.compteBanque || '521', libelle: 'Banque - décaissement', debit: 0, credit: params.montantHT },
        ],
      };

    case 'immobilisation_acquisition':
      return {
        date, journal: 'AC', piece, libelle,
        lignes: [
          { compte: params.compteImmobilisation || '21', libelle: `Acquisition immobilisation`, debit: params.montantHT, credit: 0 },
          ...(params.montantTVA ? [{ compte: '4451', libelle: 'TVA récupérable sur immobilisations', debit: params.montantTVA, credit: 0 }] : []),
          { compte: params.compteTiers || '401', libelle: `Fournisseur ${params.tiers || ''}`, debit: 0, credit: params.montantTTC || params.montantHT },
        ],
      };

    case 'dotation_amortissement':
      return {
        date, journal: 'OD', piece, libelle,
        lignes: [
          { compte: params.compteDotation || '681', libelle: 'Dotation aux amortissements', debit: params.montantDotation || params.montantHT, credit: 0 },
          { compte: params.compteAmortissement || '28', libelle: 'Amortissements cumulés', debit: 0, credit: params.montantDotation || params.montantHT },
        ],
      };

    case 'is_charge':
      return {
        date, journal: 'OD', piece, libelle,
        lignes: [
          { compte: '891', libelle: 'Impôts sur les bénéfices', debit: params.montantIS || params.montantHT, credit: 0 },
          { compte: '441', libelle: 'État - Impôts sur les bénéfices', debit: 0, credit: params.montantIS || params.montantHT },
        ],
      };

    case 'tva_declaration': {
      const tvaCollectee = params.montantTVA || 0;
      const tvaDeductible = params.montantHT;
      const tvaDue = money(tvaCollectee).subtract(tvaDeductible);
      if (tvaDue.isPositive()) {
        return {
          date, journal: 'OD', piece, libelle,
          lignes: [
            { compte: '4431', libelle: 'TVA collectée', debit: tvaCollectee, credit: 0 },
            { compte: '4452', libelle: 'TVA déductible', debit: 0, credit: tvaDeductible },
            { compte: '4441', libelle: 'État - TVA due', debit: 0, credit: tvaDue.toNumber() },
          ],
        };
      } else {
        return {
          date, journal: 'OD', piece, libelle,
          lignes: [
            { compte: '4431', libelle: 'TVA collectée', debit: tvaCollectee, credit: 0 },
            { compte: '4452', libelle: 'TVA déductible', debit: 0, credit: tvaDeductible },
            { compte: '4449', libelle: 'État - Crédit de TVA', debit: tvaDue.abs().toNumber(), credit: 0 },
          ],
        };
      }
    }

    default:
      throw new Error(`Type d'opération non supporté: ${type}`);
  }
}

/**
 * Valider l'équilibre d'une écriture générée
 */
export function validerEcriture(ecriture: EcritureGeneree): { valide: boolean; ecart: number } {
  const totalDebit = ecriture.lignes.reduce((sum, l) => money(sum).add(l.debit).toNumber(), 0);
  const totalCredit = ecriture.lignes.reduce((sum, l) => money(sum).add(l.credit).toNumber(), 0);
  const ecart = Math.abs(totalDebit - totalCredit);
  return { valide: ecart < 0.01, ecart };
}

/**
 * Obtenir les types d'opérations supportés
 */
export function getOperationsTypes(): OperationType[] {
  return [
    'achat_marchandises', 'achat_services', 'vente_marchandises', 'vente_services',
    'salaires', 'cotisations_sociales', 'reglement_client', 'reglement_fournisseur',
    'emprunt_reception', 'emprunt_remboursement', 'immobilisation_acquisition',
    'dotation_amortissement', 'is_charge', 'tva_declaration',
  ];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getLibelleDefaut(type: OperationType, params: TemplateParams): string {
  const tiers = params.tiers || '';
  switch (type) {
    case 'achat_marchandises': return `Achat marchandises ${tiers}`.trim();
    case 'achat_services': return `Achat services ${tiers}`.trim();
    case 'vente_marchandises': return `Vente marchandises ${tiers}`.trim();
    case 'vente_services': return `Prestation de services ${tiers}`.trim();
    case 'salaires': return 'Écritures de paie du mois';
    case 'cotisations_sociales': return 'Règlement cotisations sociales';
    case 'reglement_client': return `Règlement client ${tiers}`.trim();
    case 'reglement_fournisseur': return `Règlement fournisseur ${tiers}`.trim();
    case 'emprunt_reception': return 'Réception emprunt';
    case 'emprunt_remboursement': return 'Remboursement emprunt';
    case 'immobilisation_acquisition': return `Acquisition immobilisation ${tiers}`.trim();
    case 'dotation_amortissement': return 'Dotation aux amortissements';
    case 'is_charge': return 'Charge IS exercice';
    case 'tva_declaration': return 'Déclaration TVA du mois';
    default: return 'Écriture comptable';
  }
}
