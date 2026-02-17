/**
 * Effets de commerce — lettres de change, billets a ordre.
 * Cycle de vie complet conforme OHADA avec ecritures automatiques.
 */
import { Money, money } from '../../utils/money';
import { db, logAudit } from '../../lib/db';
import type { DBJournalEntry, DBJournalLine } from '../../lib/db';
import { hashEntry } from '../../utils/integrity';

// ============================================================================
// TYPES
// ============================================================================

export type TypeEffet = 'lettre_de_change' | 'billet_a_ordre';

export type StatutEffet =
  | 'cree'
  | 'accepte'
  | 'endosse'
  | 'remis_encaissement'
  | 'remis_escompte'
  | 'echu'
  | 'paye'
  | 'impaye'
  | 'proteste';

export interface EffetCommerce {
  id: string;
  type: TypeEffet;
  numero: string;
  montant: number;
  dateCreation: string;
  dateEcheance: string;
  tireur: string;
  tire: string;
  beneficiaire: string;
  statut: StatutEffet;
  compteOrigine: string;
  lieuPaiement?: string;
  banqueDomiciliation?: string;
  endossataire?: string;
  fraisEscompte?: number;
  reference?: string;
  ecritureIds: string[];
  historique: EffetHistorique[];
}

export interface EffetHistorique {
  date: string;
  action: string;
  statut: StatutEffet;
  montant?: number;
  details?: string;
}

export interface EffetTransitionResult {
  success: boolean;
  effet?: EffetCommerce;
  ecriture?: DBJournalEntry;
  error?: string;
}

export interface BordereauRemise {
  id: string;
  type: 'encaissement' | 'escompte';
  date: string;
  banque: string;
  effets: EffetCommerce[];
  montantTotal: number;
  fraisTotal: number;
  montantNet: number;
}

// ============================================================================
// COMPTES SYSCOHADA
// ============================================================================

const COMPTES = {
  CLIENTS: '411',
  FOURNISSEURS: '401',
  EFFETS_A_RECEVOIR: '412',
  EFFETS_A_PAYER: '402',
  EFFETS_ENCAISSEMENT: '5113',
  EFFETS_ESCOMPTES: '5114',
  BANQUE: '521',
  CHARGES_FINANCIERES: '675',
  CLIENTS_EFFETS_IMPAYES: '416',
};

// ============================================================================
// TRANSITIONS D'ETAT
// ============================================================================

const TRANSITIONS_VALIDES: Record<StatutEffet, StatutEffet[]> = {
  cree: ['accepte'],
  accepte: ['endosse', 'remis_encaissement', 'remis_escompte'],
  endosse: ['remis_encaissement', 'remis_escompte'],
  remis_encaissement: ['echu', 'impaye'],
  remis_escompte: ['echu', 'impaye'],
  echu: ['paye', 'impaye'],
  paye: [],
  impaye: ['proteste'],
  proteste: [],
};

// ============================================================================
// SERVICE
// ============================================================================

/**
 * Create a new commercial paper (effet de commerce).
 */
export function creerEffet(params: {
  type: TypeEffet;
  montant: number;
  dateEcheance: string;
  tireur: string;
  tire: string;
  beneficiaire: string;
  lieuPaiement?: string;
  banqueDomiciliation?: string;
}): EffetCommerce {
  const now = new Date().toISOString();
  const dateStr = now.split('T')[0].replace(/-/g, '');

  return {
    id: crypto.randomUUID(),
    type: params.type,
    numero: `EFF-${dateStr}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    montant: money(params.montant).round(2).toNumber(),
    dateCreation: now.split('T')[0],
    dateEcheance: params.dateEcheance,
    tireur: params.tireur,
    tire: params.tire,
    beneficiaire: params.beneficiaire,
    statut: 'cree',
    compteOrigine: COMPTES.CLIENTS,
    lieuPaiement: params.lieuPaiement,
    banqueDomiciliation: params.banqueDomiciliation,
    ecritureIds: [],
    historique: [{
      date: now,
      action: 'Creation',
      statut: 'cree',
      montant: params.montant,
    }],
  };
}

/**
 * Check if a transition is valid.
 */
export function isTransitionValide(from: StatutEffet, to: StatutEffet): boolean {
  return TRANSITIONS_VALIDES[from]?.includes(to) ?? false;
}

/**
 * Get available transitions for a given status.
 */
export function getTransitionsDisponibles(statut: StatutEffet): StatutEffet[] {
  return TRANSITIONS_VALIDES[statut] || [];
}

/**
 * Build journal entry lines for a specific transition.
 */
function buildTransitionLines(
  effet: EffetCommerce,
  newStatut: StatutEffet,
  fraisEscompte?: number
): DBJournalLine[] {
  const lines: DBJournalLine[] = [];
  const m = effet.montant;

  switch (newStatut) {
    case 'accepte':
      // D 412 Effets a recevoir — C 411 Clients
      lines.push(
        { id: crypto.randomUUID(), accountCode: COMPTES.EFFETS_A_RECEVOIR, accountName: 'Effets a recevoir', label: `Acceptation effet ${effet.numero}`, debit: m, credit: 0 },
        { id: crypto.randomUUID(), accountCode: COMPTES.CLIENTS, accountName: 'Clients', label: `Acceptation effet ${effet.numero}`, debit: 0, credit: m },
      );
      break;

    case 'endosse':
      // D 401 Fournisseurs — C 412 Effets a recevoir
      lines.push(
        { id: crypto.randomUUID(), accountCode: COMPTES.FOURNISSEURS, accountName: 'Fournisseurs', label: `Endossement effet ${effet.numero}`, debit: m, credit: 0 },
        { id: crypto.randomUUID(), accountCode: COMPTES.EFFETS_A_RECEVOIR, accountName: 'Effets a recevoir', label: `Endossement effet ${effet.numero}`, debit: 0, credit: m },
      );
      break;

    case 'remis_encaissement':
      // D 5113 Effets a l'encaissement — C 412 Effets a recevoir
      lines.push(
        { id: crypto.randomUUID(), accountCode: COMPTES.EFFETS_ENCAISSEMENT, accountName: "Effets a l'encaissement", label: `Remise encaissement ${effet.numero}`, debit: m, credit: 0 },
        { id: crypto.randomUUID(), accountCode: COMPTES.EFFETS_A_RECEVOIR, accountName: 'Effets a recevoir', label: `Remise encaissement ${effet.numero}`, debit: 0, credit: m },
      );
      break;

    case 'remis_escompte': {
      // D 521 Banque (net) + D 675 Charges financieres — C 5114 Effets escomptes
      const frais = money(fraisEscompte || 0).round(2).toNumber();
      const net = money(m).subtract(money(frais)).round(2).toNumber();
      lines.push(
        { id: crypto.randomUUID(), accountCode: COMPTES.BANQUE, accountName: 'Banque', label: `Escompte effet ${effet.numero}`, debit: net, credit: 0 },
        { id: crypto.randomUUID(), accountCode: COMPTES.CHARGES_FINANCIERES, accountName: 'Charges financieres escompte', label: `Frais escompte ${effet.numero}`, debit: frais, credit: 0 },
        { id: crypto.randomUUID(), accountCode: COMPTES.EFFETS_A_RECEVOIR, accountName: 'Effets a recevoir', label: `Escompte effet ${effet.numero}`, debit: 0, credit: m },
      );
      break;
    }

    case 'paye':
      // D 521 Banque — C 5113 Effets a l'encaissement
      lines.push(
        { id: crypto.randomUUID(), accountCode: COMPTES.BANQUE, accountName: 'Banque', label: `Paiement effet ${effet.numero}`, debit: m, credit: 0 },
        { id: crypto.randomUUID(), accountCode: COMPTES.EFFETS_ENCAISSEMENT, accountName: "Effets a l'encaissement", label: `Paiement effet ${effet.numero}`, debit: 0, credit: m },
      );
      break;

    case 'impaye':
      // D 416 Clients effets impayes — C 5113 Effets a l'encaissement
      lines.push(
        { id: crypto.randomUUID(), accountCode: COMPTES.CLIENTS_EFFETS_IMPAYES, accountName: 'Clients - effets impayes', label: `Impaye effet ${effet.numero}`, debit: m, credit: 0 },
        { id: crypto.randomUUID(), accountCode: COMPTES.EFFETS_ENCAISSEMENT, accountName: "Effets a l'encaissement", label: `Impaye effet ${effet.numero}`, debit: 0, credit: m },
      );
      break;

    default:
      break;
  }

  return lines;
}

/**
 * Execute a status transition with journal entry generation.
 */
export async function transitionEffet(
  effet: EffetCommerce,
  newStatut: StatutEffet,
  date: string,
  fraisEscompte?: number
): Promise<EffetTransitionResult> {
  if (!isTransitionValide(effet.statut, newStatut)) {
    return {
      success: false,
      error: `Transition invalide : ${effet.statut} → ${newStatut}`,
    };
  }

  const lines = buildTransitionLines(effet, newStatut, fraisEscompte);
  if (lines.length === 0) {
    // Transition without accounting impact
    effet.statut = newStatut;
    effet.historique.push({
      date: new Date().toISOString(),
      action: `Transition vers ${newStatut}`,
      statut: newStatut,
    });
    return { success: true, effet };
  }

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return { success: false, error: 'Ecriture desequilibree.' };
  }

  const now = new Date().toISOString();
  const entryNumber = `EFF-${date.replace(/-/g, '')}-${effet.numero.substring(4, 10)}`;

  const entry: DBJournalEntry = {
    id: crypto.randomUUID(),
    entryNumber,
    journal: 'OD',
    date,
    reference: `EFFET-${effet.numero}`,
    label: `Effet ${effet.type} - ${newStatut} - ${effet.numero}`,
    status: 'draft',
    lines,
    totalDebit,
    totalCredit,
    createdAt: now,
    updatedAt: now,
  };

  // Hash
  const lastEntry = await db.journalEntries.orderBy('date').last();
  const previousHash = lastEntry?.hash || '';
  entry.hash = await hashEntry(
    {
      entryNumber: entry.entryNumber,
      journal: entry.journal,
      date: entry.date,
      lines: entry.lines.map(l => ({
        accountCode: l.accountCode,
        debit: l.debit,
        credit: l.credit,
        label: l.label,
      })),
      totalDebit: entry.totalDebit,
      totalCredit: entry.totalCredit,
    },
    previousHash
  );
  entry.previousHash = previousHash;

  await db.journalEntries.add(entry);

  // Update effet
  effet.statut = newStatut;
  if (fraisEscompte) effet.fraisEscompte = fraisEscompte;
  effet.ecritureIds.push(entry.id);
  effet.historique.push({
    date: now,
    action: `Transition vers ${newStatut}`,
    statut: newStatut,
    montant: effet.montant,
    details: `Ecriture ${entry.entryNumber}`,
  });

  await logAudit('EFFET_TRANSITION', 'effet_commerce', effet.id, JSON.stringify({
    numero: effet.numero,
    from: effet.statut,
    to: newStatut,
    ecritureId: entry.id,
  }));

  return { success: true, effet, ecriture: entry };
}

/**
 * Create a remittance slip (bordereau de remise).
 */
export function creerBordereauRemise(
  type: 'encaissement' | 'escompte',
  effets: EffetCommerce[],
  banque: string,
  fraisTotal: number = 0
): BordereauRemise {
  const montantTotal = effets.reduce((s, e) => s + e.montant, 0);
  return {
    id: crypto.randomUUID(),
    type,
    date: new Date().toISOString().split('T')[0],
    banque,
    effets,
    montantTotal: money(montantTotal).round(2).toNumber(),
    fraisTotal: money(fraisTotal).round(2).toNumber(),
    montantNet: money(montantTotal).subtract(money(fraisTotal)).round(2).toNumber(),
  };
}

/**
 * Check if an effet is past due.
 */
export function isEffetEnRetard(effet: EffetCommerce): boolean {
  const today = new Date().toISOString().split('T')[0];
  return effet.dateEcheance < today && !['paye', 'impaye', 'proteste'].includes(effet.statut);
}

/**
 * Get effets by status.
 */
export function filterEffetsByStatut(effets: EffetCommerce[], statut: StatutEffet): EffetCommerce[] {
  return effets.filter(e => e.statut === statut);
}

/**
 * Calculate total by status.
 */
export function totalParStatut(effets: EffetCommerce[]): Record<StatutEffet, number> {
  const result: Record<string, number> = {};
  for (const e of effets) {
    result[e.statut] = (result[e.statut] || 0) + e.montant;
  }
  return result as Record<StatutEffet, number>;
}
