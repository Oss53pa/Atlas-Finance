/**
 * Service de declarations fiscales — TVA, IS, IMF.
 * Calculs depuis les ecritures comptables via DataAdapter.
 * Conforme SYSCOHADA / OHADA.
 */
import type { DataAdapter } from '@atlas/data';
import { money } from '../../utils/money';
import { logAudit } from '../../lib/db';

// ============================================================================
// TYPES
// ============================================================================

export interface DeclarationTVA {
  periode: string; // 'YYYY-MM'
  tvaCollectee: number;      // Σ credits comptes 443x
  tvaDeductible: number;     // Σ debits comptes 445x
  tvaAPayer: number;         // collectee - deductible (si > 0)
  creditTVA: number;         // deductible - collectee (si > 0)
  creditReporte: number;     // credit du mois precedent
  montantNetAPayer: number;  // tvaAPayer - creditReporte (si > 0)
  creditAReporter: number;   // si creditReporte + creditTVA > tvaAPayer
  baseImposable18: number;   // CA soumis a 18%
  baseImposable9: number;    // CA soumis a 9% (reduit)
  baseExoneree: number;      // CA exonere (export, etc.)
  details: TVADetail[];
}

export interface TVADetail {
  accountCode: string;
  accountName: string;
  baseHT: number;
  taux: number;
  montantTVA: number;
  type: 'collectee' | 'deductible';
}

export interface DeclarationIS {
  exercice: string;
  resultatComptable: number;
  reintegrations: number;    // charges non deductibles
  deductions: number;        // produits non imposables
  resultatFiscal: number;    // comptable + reintegrations - deductions
  tauxIS: number;            // parametrable (25% par defaut CI)
  montantIS: number;
  imf: number;               // Impot Minimum Forfaitaire
  montantDu: number;         // max(IS, IMF)
  acomptes: number;          // acomptes deja verses
  soldeAPayer: number;
}

// ============================================================================
// SERVICE
// ============================================================================

/**
 * Calculer la declaration de TVA mensuelle.
 * TVA collectee = Σ credits comptes 443x (TVA facturee sur ventes)
 * TVA deductible = Σ debits comptes 445x (TVA sur achats)
 */
export async function calculerTVAMensuelle(
  adapter: DataAdapter,
  periode: string, // 'YYYY-MM'
  creditReporteMoisPrecedent: number = 0
): Promise<DeclarationTVA> {
  const [year, month] = periode.split('-').map(Number);
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

  const allEntries = await adapter.getAll('journalEntries');
  const entries = allEntries.filter(
    (e: any) => e.date >= startDate && e.date <= endDate
      && (e.status === 'validated' || e.status === 'posted')
  );

  let tvaCollectee = 0;
  let tvaDeductible = 0;
  let baseImposable18 = 0;
  let baseImposable9 = 0;
  let baseExoneree = 0;
  const details: TVADetail[] = [];

  const accountTotals = new Map<string, { debit: number; credit: number }>();

  for (const entry of entries) {
    for (const line of (entry as any).lines || []) {
      const code = line.accountCode || '';

      // TVA collectee (443x)
      if (code.startsWith('443')) {
        tvaCollectee += line.credit - line.debit;
        const existing = accountTotals.get(code) || { debit: 0, credit: 0 };
        existing.credit += line.credit;
        existing.debit += line.debit;
        accountTotals.set(code, existing);
      }

      // TVA deductible (445x)
      if (code.startsWith('445')) {
        tvaDeductible += line.debit - line.credit;
        const existing = accountTotals.get(code) || { debit: 0, credit: 0 };
        existing.credit += line.credit;
        existing.debit += line.debit;
        accountTotals.set(code, existing);
      }

      // Ventes pour base imposable (701-707)
      if (code.startsWith('70')) {
        const montantHT = line.credit - line.debit;
        // Heuristique : si un compte 4431 (TVA 18%) est dans la meme ecriture
        baseImposable18 += montantHT; // Simplification — tout en 18% par defaut
      }
    }
  }

  // Build details
  for (const [code, totals] of accountTotals) {
    const isCollectee = code.startsWith('443');
    details.push({
      accountCode: code,
      accountName: isCollectee ? 'TVA collectee' : 'TVA deductible',
      baseHT: 0, // Would need to correlate with sales/purchase lines
      taux: code.includes('18') ? 18 : code.includes('9') ? 9 : 18,
      montantTVA: isCollectee ? totals.credit - totals.debit : totals.debit - totals.credit,
      type: isCollectee ? 'collectee' : 'deductible',
    });
  }

  const tvaAPayer = Math.max(0, tvaCollectee - tvaDeductible);
  const creditTVA = Math.max(0, tvaDeductible - tvaCollectee);
  const creditTotal = creditReporteMoisPrecedent + creditTVA;
  const montantNetAPayer = Math.max(0, tvaAPayer - creditReporteMoisPrecedent);
  const creditAReporter = creditTotal > tvaAPayer ? creditTotal - tvaAPayer : 0;

  return {
    periode,
    tvaCollectee: money(tvaCollectee).round(0).toNumber(),
    tvaDeductible: money(tvaDeductible).round(0).toNumber(),
    tvaAPayer: money(tvaAPayer).round(0).toNumber(),
    creditTVA: money(creditTVA).round(0).toNumber(),
    creditReporte: creditReporteMoisPrecedent,
    montantNetAPayer: money(montantNetAPayer).round(0).toNumber(),
    creditAReporter: money(creditAReporter).round(0).toNumber(),
    baseImposable18: money(baseImposable18).round(0).toNumber(),
    baseImposable9: money(baseImposable9).round(0).toNumber(),
    baseExoneree: money(baseExoneree).round(0).toNumber(),
    details,
  };
}

/**
 * Calculer l'IS annuel.
 */
export async function calculerIS(
  adapter: DataAdapter,
  exercice: string,
  tauxIS: number = 25, // Cote d'Ivoire 25%
  reintegrations: number = 0,
  deductions: number = 0
): Promise<DeclarationIS> {
  const allEntries = await adapter.getAll('journalEntries');
  const entries = allEntries.filter(
    (e: any) => e.date >= `${exercice}-01-01` && e.date <= `${exercice}-12-31`
      && (e.status === 'validated' || e.status === 'posted')
  );

  let produits = 0;
  let charges = 0;

  for (const entry of entries) {
    for (const line of (entry as any).lines || []) {
      const code = line.accountCode || '';
      if (code.startsWith('7')) produits += line.credit - line.debit;
      if (code.startsWith('6')) charges += line.debit - line.credit;
    }
  }

  const resultatComptable = money(produits).subtract(money(charges)).toNumber();
  const resultatFiscal = money(resultatComptable)
    .add(money(reintegrations))
    .subtract(money(deductions))
    .toNumber();

  const montantIS = money(Math.max(0, resultatFiscal))
    .multiply(tauxIS)
    .divide(100)
    .round(0)
    .toNumber();

  // IMF = 1% du CA (minimum 3M FCFA pour CI)
  const chiffreAffaires = produits;
  const imfCalcule = money(chiffreAffaires).multiply(1).divide(100).round(0).toNumber();
  const imf = Math.max(imfCalcule, 3000000); // minimum 3M FCFA

  const montantDu = Math.max(montantIS, imf);

  return {
    exercice,
    resultatComptable,
    reintegrations,
    deductions,
    resultatFiscal,
    tauxIS,
    montantIS,
    imf,
    montantDu,
    acomptes: 0,
    soldeAPayer: montantDu,
  };
}

/**
 * Recuperer le credit TVA du mois precedent.
 */
export async function getCreditTVAPrecedent(
  adapter: DataAdapter,
  periode: string
): Promise<number> {
  const [year, month] = periode.split('-').map(Number);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevPeriode = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

  // Check if a previous declaration exists in settings
  try {
    const key = `declaration_tva_${prevPeriode}`;
    const existing = await adapter.getById('settings', key);
    if (existing) {
      const decl = JSON.parse((existing as any).value);
      return decl.creditAReporter || 0;
    }
  } catch { /* no previous declaration */ }

  return 0;
}

/**
 * Sauvegarder une declaration TVA.
 */
export async function sauvegarderDeclarationTVA(
  adapter: DataAdapter,
  declaration: DeclarationTVA
): Promise<void> {
  const key = `declaration_tva_${declaration.periode}`;
  const value = JSON.stringify(declaration);

  const existing = await adapter.getById('settings', key);
  if (existing) {
    await adapter.update('settings', key, { key, value, updatedAt: new Date().toISOString() });
  } else {
    await adapter.create('settings', { key, value, updatedAt: new Date().toISOString() });
  }

  await logAudit('DECLARATION_TVA', 'declaration', key, JSON.stringify({
    periode: declaration.periode,
    tvaCollectee: declaration.tvaCollectee,
    tvaDeductible: declaration.tvaDeductible,
    montantNetAPayer: declaration.montantNetAPayer,
  }));
}
