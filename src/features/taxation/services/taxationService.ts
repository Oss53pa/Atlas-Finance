/**
 * Service de gestion fiscale — connecté aux écritures comptables réelles.
 *
 * Calcule les déclarations TVA et IS depuis les comptes SYSCOHADA :
 * - TVA collectée : 4431 (ventes)
 * - TVA déductible : 4451 (achats)
 * - TVA due : 4441
 * - IS : résultat fiscal via compte de résultat
 *
 * Conforme SYSCOHADA révisé — Système Normal.
 */
import type { DataAdapter } from '@atlas/data';
import { money } from '../../../utils/money';
import { TVAValidator } from '../../../utils/tvaValidation';
import { calculateIS, type ISInput, type ISResult } from '../../../utils/isCalculation';
import type { DBJournalEntry } from '../../../lib/db';
import {
  DashboardStats,
  CalculImpotRequest,
  CalculImpotResponse,
  Echeance,
} from '../types/taxation.types';

// ============================================================================
// TYPES INTERNES
// ============================================================================

export interface TVADeclarationResult {
  periode: { debut: string; fin: string };
  tvaCollectee: number;
  tvaDeductible: number;
  tvaDue: number;
  creditTVA: number;
  baseImposable: number;
  details: {
    ventesHT: number;
    achatsHT: number;
    prestationsHT: number;
  };
}

export interface ISDeclarationResult {
  exercice: string;
  resultatComptable: number;
  resultatFiscal: number;
  tauxIS: number;
  impotBrut: number;
  minimumIS: number;
  impotDu: number;
  details: ISResult | null;
}

// ============================================================================
// HELPERS
// ============================================================================

function sumByPrefix(entries: DBJournalEntry[], prefix: string, side: 'debit' | 'credit'): number {
  let total = 0;
  for (const entry of entries) {
    for (const line of entry.lines) {
      if (line.accountCode.startsWith(prefix)) {
        total += side === 'debit' ? line.debit : line.credit;
      }
    }
  }
  return total;
}

function netByPrefix(entries: DBJournalEntry[], ...prefixes: string[]): number {
  let total = 0;
  for (const entry of entries) {
    for (const line of entry.lines) {
      if (prefixes.some(p => line.accountCode.startsWith(p))) {
        total += line.debit - line.credit;
      }
    }
  }
  return total;
}

async function getEntriesForPeriod(adapter: DataAdapter, start: string, end: string): Promise<DBJournalEntry[]> {
  const all = await adapter.getAll<DBJournalEntry>('journalEntries');
  return all.filter(e => e.date >= start && e.date <= end);
}

// ============================================================================
// TVA
// ============================================================================

/**
 * Calcule la déclaration TVA pour une période donnée depuis les écritures comptables.
 * TVA collectée = crédit comptes 4431/4432/4433
 * TVA déductible = débit comptes 4451/4452/4453
 * TVA due = collectée - déductible
 */
export async function calculerDeclarationTVA(
  adapter: DataAdapter,
  periodeDebut: string,
  periodeFin: string,
): Promise<TVADeclarationResult> {
  const entries = await getEntriesForPeriod(adapter, periodeDebut, periodeFin);

  // TVA collectée (crédit sur comptes 443x)
  const tvaCollectee = sumByPrefix(entries, '443', 'credit') - sumByPrefix(entries, '443', 'debit');
  // TVA déductible (débit sur comptes 445x)
  const tvaDeductible = sumByPrefix(entries, '445', 'debit') - sumByPrefix(entries, '445', 'credit');

  const tvaDue = money(tvaCollectee).subtract(tvaDeductible).toNumber();
  const creditTVA = tvaDue < 0 ? Math.abs(tvaDue) : 0;

  // Base imposable = ventes HT
  const ventesHT = sumByPrefix(entries, '70', 'credit') - sumByPrefix(entries, '70', 'debit');
  const achatsHT = sumByPrefix(entries, '60', 'debit') - sumByPrefix(entries, '60', 'credit');
  const prestationsHT = sumByPrefix(entries, '706', 'credit') - sumByPrefix(entries, '706', 'debit');

  return {
    periode: { debut: periodeDebut, fin: periodeFin },
    tvaCollectee: Math.max(0, tvaCollectee),
    tvaDeductible: Math.max(0, tvaDeductible),
    tvaDue: Math.max(0, tvaDue),
    creditTVA,
    baseImposable: ventesHT,
    details: {
      ventesHT,
      achatsHT,
      prestationsHT,
    },
  };
}

// ============================================================================
// IS (Impôt sur les Sociétés)
// ============================================================================

/**
 * Calcule l'IS depuis le résultat comptable (CDR) + réintégrations/déductions.
 */
export async function calculerDeclarationIS(
  adapter: DataAdapter,
  exerciceDebut: string,
  exerciceFin: string,
  countryCode: string = 'CI',
  reintegrations: number = 0,
  deductions: number = 0,
): Promise<ISDeclarationResult> {
  const entries = await getEntriesForPeriod(adapter, exerciceDebut, exerciceFin);

  // Résultat comptable = Produits (7) - Charges (6) + HAO
  const produits = sumByPrefix(entries, '7', 'credit') - sumByPrefix(entries, '7', 'debit');
  const charges = sumByPrefix(entries, '6', 'debit') - sumByPrefix(entries, '6', 'credit');
  const haoP = sumByPrefix(entries, '82', 'credit') + sumByPrefix(entries, '84', 'credit') + sumByPrefix(entries, '86', 'credit') + sumByPrefix(entries, '88', 'credit')
    - sumByPrefix(entries, '82', 'debit') - sumByPrefix(entries, '84', 'debit') - sumByPrefix(entries, '86', 'debit') - sumByPrefix(entries, '88', 'debit');
  const haoC = sumByPrefix(entries, '81', 'debit') + sumByPrefix(entries, '83', 'debit') + sumByPrefix(entries, '85', 'debit') + sumByPrefix(entries, '87', 'debit')
    - sumByPrefix(entries, '81', 'credit') - sumByPrefix(entries, '83', 'credit') - sumByPrefix(entries, '85', 'credit') - sumByPrefix(entries, '87', 'credit');
  const resultatComptable = money(produits).subtract(charges).add(haoP).subtract(haoC).toNumber();

  // Chiffre d'affaires pour minimum IS
  const chiffreAffaires = sumByPrefix(entries, '70', 'credit') - sumByPrefix(entries, '70', 'debit');

  let isResult: ISResult | null = null;
  try {
    const input: ISInput = {
      countryCode,
      resultatComptable,
      reintegrations,
      deductions,
      deficitsAnterieurs: 0,
      chiffreAffaires,
      acomptesVerses: 0,
    };
    isResult = calculateIS(input);
  } catch {
    // If calculateIS is not available for this country, do a simple calculation
  }

  const resultatFiscal = money(resultatComptable).add(reintegrations).subtract(deductions).toNumber();
  const tauxIS = isResult ? isResult.tauxIS : 25;
  const impotBrut = isResult ? isResult.impotBrut.toNumber() : money(Math.max(0, resultatFiscal)).multiply(tauxIS / 100).toNumber();
  const minimumIS = isResult ? isResult.minimumIS.toNumber() : money(chiffreAffaires).multiply(0.01).toNumber();
  const impotDu = isResult ? isResult.impotDu.toNumber() : Math.max(impotBrut, minimumIS);

  return {
    exercice: `${exerciceDebut} — ${exerciceFin}`,
    resultatComptable,
    resultatFiscal,
    tauxIS,
    impotBrut,
    minimumIS,
    impotDu,
    details: isResult,
  };
}

// ============================================================================
// CALCUL IMPÔT GÉNÉRIQUE
// ============================================================================

/**
 * Calcul d'impôt générique connecté aux écritures.
 */
export async function calculerImpot(
  adapter: DataAdapter,
  request: CalculImpotRequest
): Promise<CalculImpotResponse> {
  const year = request.periode.substring(0, 4);
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  if (request.type_impot === 'TVA') {
    const tva = await calculerDeclarationTVA(adapter, startDate, endDate);
    return {
      montant: tva.tvaDue,
      details: {
        tvaCollectee: tva.tvaCollectee,
        tvaDeductible: tva.tvaDeductible,
        creditTVA: tva.creditTVA,
      },
      date_calcul: new Date().toISOString(),
      regime: 'RNI',
    };
  }

  if (request.type_impot === 'IS') {
    const is = await calculerDeclarationIS(adapter, startDate, endDate);
    return {
      montant: is.impotDu,
      details: {
        resultatComptable: is.resultatComptable,
        resultatFiscal: is.resultatFiscal,
        impotBrut: is.impotBrut,
        minimumIS: is.minimumIS,
      },
      date_calcul: new Date().toISOString(),
      regime: 'RNI',
    };
  }

  // Fallback: calcul basé sur le taux demandé
  const taux = request.type_impot === 'PATENTE' ? 0.005 : 0.18;
  return {
    montant: money(request.base_calcul).multiply(taux).toNumber(),
    details: { type: request.type_impot, taux },
    date_calcul: new Date().toISOString(),
    regime: 'RNI',
  };
}

// ============================================================================
// DASHBOARD — DONNÉES RÉELLES
// ============================================================================

/**
 * Statistiques du dashboard fiscal — calculées depuis les écritures.
 */
export async function getDashboardStats(
  adapter: DataAdapter,
  params?: { period?: string }
): Promise<DashboardStats> {
  const year = params?.period?.substring(0, 4) || new Date().getFullYear().toString();
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  const entries = await getEntriesForPeriod(adapter, startDate, endDate);

  // TVA due pour la période
  const tvaCollectee = sumByPrefix(entries, '443', 'credit') - sumByPrefix(entries, '443', 'debit');
  const tvaDeductible = sumByPrefix(entries, '445', 'debit') - sumByPrefix(entries, '445', 'credit');
  const tvaDue = Math.max(0, tvaCollectee - tvaDeductible);

  // Impôts payés (débit comptes 44x — état)
  const impotsPayes = sumByPrefix(entries, '44', 'debit');
  const impotsDus = sumByPrefix(entries, '44', 'credit');

  // Évolution mensuelle
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const monthly_evolution = months.map((month, i) => {
    const m = String(i + 1).padStart(2, '0');
    const mStart = `${year}-${m}-01`;
    const mEnd = `${year}-${m}-31`;
    const monthEntries = entries.filter(e => e.date >= mStart && e.date <= mEnd);
    const amount = sumByPrefix(monthEntries, '44', 'credit');
    return { month, count: amount > 0 ? 1 : 0, amount };
  }).filter(m => m.amount > 0 || months.indexOf(m.month) < new Date().getMonth());

  return {
    total_declarations: monthly_evolution.filter(m => m.amount > 0).length,
    declarations_pending: 0,
    declarations_overdue: 0,
    vat_due: tvaDue,
    upcoming_deadlines: 0,
    compliance_rate: 100,
    total_amount: impotsDus,
    total_paid: impotsPayes,
    pending_amount: Math.max(0, impotsDus - impotsPayes),
    overdue_count: 0,
    by_status: {},
    monthly_evolution,
  };
}

// ============================================================================
// ÉCHÉANCES
// ============================================================================

export async function getUpcomingDeadlines(adapter: DataAdapter): Promise<Echeance[]> {
  const now = new Date();
  const deadlines: Echeance[] = [];

  // TVA mensuelle — échéance le 15 du mois suivant
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 15);
  const jours = Math.ceil((nextMonth.getTime() - now.getTime()) / 86400000);
  if (jours > 0 && jours <= 45) {
    deadlines.push({
      obligation_id: 1,
      type_declaration: 'TVA Mensuelle',
      date_echeance: nextMonth.toISOString().split('T')[0],
      jours_restants: jours,
    });
  }

  // IS annuel — échéance le 30 avril
  const isDeadline = new Date(now.getFullYear(), 3, 30);
  if (isDeadline > now) {
    const joursIS = Math.ceil((isDeadline.getTime() - now.getTime()) / 86400000);
    if (joursIS <= 120) {
      deadlines.push({
        obligation_id: 2,
        type_declaration: 'IS Annuel',
        date_echeance: isDeadline.toISOString().split('T')[0],
        jours_restants: joursIS,
      });
    }
  }

  return deadlines;
}

// ============================================================================
// EXPORT — Classe compatible avec l'ancienne API
// ============================================================================

class TaxationService {
  async calculerTVA(adapter: DataAdapter, debut: string, fin: string) {
    return calculerDeclarationTVA(adapter, debut, fin);
  }

  async calculerIS(adapter: DataAdapter, debut: string, fin: string, country?: string) {
    return calculerDeclarationIS(adapter, debut, fin, country);
  }

  async calculerImpot(adapter: DataAdapter, request: CalculImpotRequest) {
    return calculerImpot(adapter, request);
  }

  async getDashboardStats(adapter: DataAdapter, params?: { period?: string }) {
    return getDashboardStats(adapter, params);
  }

  async getUpcomingDeadlines(adapter: DataAdapter) {
    return getUpcomingDeadlines(adapter);
  }
}

export const taxationService = new TaxationService();
export default taxationService;
