
/**
 * TaxDetectionEngine — Moteur de détection fiscale automatique.
 * Identifie depuis les comptes SYSCOHADA actifs quelles taxes existent,
 * calcule les montants dus, et détermine les échéances.
 */
import type { DataAdapter } from '@atlas/data';
import type { DBTaxRegistry, DBJournalEntry, DBTaxDeclaration, DBTaxBracket } from '../../lib/db';

export interface TaxAmounts {
  base: number | null;
  gross: number | null;
  deductible: number;
  net: number | null;
  credit: number;
  requiresManualInput?: boolean;
  detail: Record<string, unknown>;
}

export interface TaxDetectionResult {
  tax: DBTaxRegistry;
  isTriggered: boolean;
  triggerReason: string;
  amounts: TaxAmounts | null;
  existingDeclaration: DBTaxDeclaration | null;
  status: string;
  declarationDeadline: string | null;
  isOverdue: boolean;
  daysUntilDeadline: number | null;
}

export class TaxDetectionEngine {
  constructor(
    private readonly adapter: DataAdapter,
    private readonly countryCode: string = 'CI'
  ) {}

  /**
   * Detect all taxes from active accounts in the period
   */
  async detectTaxesFromAccounts(periodStart: string, periodEnd: string): Promise<TaxDetectionResult[]> {
    // 1. Load active tax registry
    const allRegistry = await this.adapter.getAll<DBTaxRegistry>('taxRegistry');
    const taxRegistry = allRegistry.filter(t => t.isActive && t.countryCode === this.countryCode);

    // 2. Get active accounts (accounts that have movements in the period)
    const entries = await this.getEntriesForPeriod(periodStart, periodEnd);
    const activeAccounts = new Set<string>();
    for (const e of entries) {
      if (!e.lines) continue;
      for (const l of e.lines) {
        if (l.accountCode) activeAccounts.add(l.accountCode);
      }
    }
    const activeAccountsList = [...activeAccounts];

    // 3. Check each tax
    const results: TaxDetectionResult[] = [];
    for (const tax of taxRegistry) {
      const triggered = this.checkTriggerAccounts(tax.triggerAccounts, activeAccountsList);

      if (triggered) {
        const amounts = await this.calculateTaxAmounts(tax, entries);
        const existing = await this.findExistingDeclaration(tax, periodStart, periodEnd);
        const deadline = this.computeDeadline(tax, periodEnd);
        const isOverdue = new Date(deadline) < new Date();
        const days = Math.round((new Date(deadline).getTime() - Date.now()) / 86400000);

        results.push({
          tax,
          isTriggered: true,
          triggerReason: `Comptes actifs: ${tax.triggerAccounts.filter(t => this.matchesAny(t, activeAccountsList)).join(', ')}`,
          amounts,
          existingDeclaration: existing,
          status: existing?.status ?? 'pending',
          declarationDeadline: deadline,
          isOverdue,
          daysUntilDeadline: days,
        });
      } else {
        results.push({
          tax,
          isTriggered: false,
          triggerReason: `Aucun mouvement sur: ${tax.triggerAccounts.join(', ')}`,
          amounts: null,
          existingDeclaration: null,
          status: 'not_applicable',
          declarationDeadline: null,
          isOverdue: false,
          daysUntilDeadline: null,
        });
      }
    }

    return results.sort((a, b) => {
      if (a.isTriggered !== b.isTriggered) return a.isTriggered ? -1 : 1;
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
      return (a.daysUntilDeadline ?? 999) - (b.daysUntilDeadline ?? 999);
    });
  }

  /**
   * Calculate amounts for a single tax
   */
  async calculateTaxAmounts(tax: DBTaxRegistry, entries?: DBJournalEntry[]): Promise<TaxAmounts> {
    // if entries not provided, load them from the current fiscal year
    if (!entries) {
      const now = new Date();
      const yearStart = `${now.getFullYear()}-01-01`;
      const yearEnd = `${now.getFullYear()}-12-31`;
      entries = await this.getEntriesForPeriod(yearStart, yearEnd);
    }

    switch (tax.formula) {
      case 'COLLECTED_MINUS_DEDUCTIBLE': {
        const collected = this.sumAccounts(entries, tax.collectedAccounts, 'credit');
        const deductible = this.sumAccounts(entries, tax.deductibleAccounts, 'debit');
        const net = collected - deductible;
        return {
          base: collected,
          gross: collected,
          deductible,
          net: net > 0 ? net : 0,
          credit: net < 0 ? -net : 0,
          detail: {
            collectee: collected,
            deductible_detail: deductible,
            nette: net,
            comptes_collecte: tax.collectedAccounts,
            comptes_deductible: tax.deductibleAccounts,
          },
        };
      }

      case 'MAX_CALCULATED_MINIMUM': {
        // IS: max(taux x benefice, IMF)
        const produits = this.sumAccounts(entries, ['7'], 'credit');
        const charges = this.sumAccounts(entries, ['6'], 'debit');
        const resultatNet = produits - charges;
        const ca = this.sumAccounts(entries, ['70', '71', '72'], 'credit');
        const isCalcule = resultatNet > 0 ? Math.round(resultatNet * (tax.ratePct || 25) / 100) : 0;
        const imfTaux = Math.round(ca * (tax.ratePctMinimum || 0.5) / 100);
        const imfMin = tax.minimumAmount || 3000000;
        const imf = Math.max(imfTaux, imfMin);
        const net = Math.max(isCalcule, imf);
        return {
          base: resultatNet,
          gross: isCalcule,
          deductible: 0,
          net,
          credit: 0,
          detail: {
            produits, charges, resultatNet, ca,
            tauxIS: `${tax.ratePct}%`,
            isCalcule, imfTaux, imfMinimum: imfMin, imfRetenu: imf,
            regle: isCalcule > imf ? `IS (${tax.ratePct}%)` : `IMF`,
          },
        };
      }

      case 'FIXED_ON_PAYROLL': {
        const masseSalariale = this.sumAccounts(entries, tax.baseAccounts || ['661'], 'debit');
        const cotisation = Math.round(masseSalariale * (tax.ratePct || 0) / 100);
        return {
          base: masseSalariale,
          gross: cotisation,
          deductible: 0,
          net: cotisation,
          credit: 0,
          detail: {
            masseSalariale,
            taux: `${tax.ratePct}%`,
            cotisation,
          },
        };
      }

      case 'RETENUE_SOURCE': {
        const base = this.sumAccounts(entries, tax.baseAccounts, 'debit');
        const retenue = Math.round(base * (tax.ratePct || 0) / 100);
        const comptabilisee = this.sumAccounts(entries, tax.payableAccounts, 'credit');
        return {
          base,
          gross: retenue,
          deductible: 0,
          net: comptabilisee,
          credit: 0,
          detail: {
            baseCharges: base,
            tauxRAS: `${tax.ratePct}%`,
            retenueTheorique: retenue,
            retenueComptabilisee: comptabilisee,
            ecart: retenue - comptabilisee,
          },
        };
      }

      case 'RATE_ON_BASE': {
        const base = this.sumAccounts(entries, tax.baseAccounts, 'net');
        const gross = Math.round(Math.abs(base) * (tax.ratePct || 0) / 100);
        return {
          base: Math.abs(base),
          gross,
          deductible: 0,
          net: gross,
          credit: 0,
          detail: { base: Math.abs(base), taux: `${tax.ratePct}%`, taxe: gross },
        };
      }

      case 'PROGRESSIVE_BRACKET': {
        const masseSalariale = this.sumAccounts(entries, tax.baseAccounts || ['661', '662'], 'debit');
        const allBrackets = await this.adapter.getAll<DBTaxBracket>('taxBrackets');
        const brackets = allBrackets
          .filter(b => b.taxRegistryId === tax.id)
          .sort((a, b) => a.bracketOrder - b.bracketOrder);
        const impot = this.applyProgressiveBracket(masseSalariale, brackets);
        return {
          base: masseSalariale,
          gross: impot,
          deductible: 0,
          net: impot,
          credit: 0,
          detail: { masseSalariale, tranches: brackets, impot },
        };
      }

      default:
        return {
          base: null, gross: null, deductible: 0, net: null, credit: 0,
          requiresManualInput: true,
          detail: { message: 'Calcul automatique non disponible — saisie manuelle requise.' },
        };
    }
  }

  /**
   * Create or update a tax declaration from computed amounts
   */
  async createDeclaration(
    tax: DBTaxRegistry,
    periodStart: string,
    periodEnd: string,
    amounts: TaxAmounts
  ): Promise<DBTaxDeclaration> {
    const existing = await this.findExistingDeclaration(tax, periodStart, periodEnd);
    const now = new Date().toISOString();
    const periodLabel = this.buildPeriodLabel(tax.periodicity, periodStart, periodEnd);
    const fy = parseInt(periodStart.substring(0, 4));
    const deadline = this.computeDeadline(tax, periodEnd);

    const decl: DBTaxDeclaration = {
      id: existing?.id || crypto.randomUUID(),
      taxRegistryId: tax.id,
      taxCode: tax.taxCode,
      periodStart,
      periodEnd,
      periodLabel,
      fiscalYear: fy,
      base: amounts.base || 0,
      grossTax: amounts.gross || 0,
      deductible: amounts.deductible,
      netTax: amounts.net || 0,
      alreadyPaid: existing?.alreadyPaid || 0,
      balanceDue: (amounts.net || 0) - (existing?.alreadyPaid || 0),
      credit: amounts.credit,
      calculationDetail: amounts.detail as Record<string, unknown>,
      status: 'calculated',
      declarationDeadline: deadline,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    if (existing) {
      await this.adapter.update('taxDeclarations', existing.id, decl);
    } else {
      await this.adapter.create('taxDeclarations', decl);
    }
    return decl;
  }

  // -- Private helpers --------------------------------------------------------

  private async getEntriesForPeriod(start: string, end: string): Promise<DBJournalEntry[]> {
    const all = await this.adapter.getAll<DBJournalEntry>('journalEntries');
    return all.filter(e =>
      (e.status === 'validated' || e.status === 'posted') &&
      e.date >= start && e.date <= end
    );
  }

  private checkTriggerAccounts(triggers: string[], activeAccounts: string[]): boolean {
    return triggers.some(t => this.matchesAny(t, activeAccounts));
  }

  private matchesAny(pattern: string, accounts: string[]): boolean {
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return accounts.some(a => a.startsWith(prefix));
    }
    return accounts.some(a => a === pattern || a.startsWith(pattern));
  }

  private sumAccounts(entries: DBJournalEntry[], patterns: string[] | undefined, side: 'debit' | 'credit' | 'net'): number {
    if (!patterns?.length) return 0;
    let total = 0;
    for (const e of entries) {
      if (!e.lines) continue;
      for (const l of e.lines) {
        const matches = patterns.some(p => {
          const clean = p.endsWith('*') ? p.slice(0, -1) : p;
          return l.accountCode.startsWith(clean);
        });
        if (matches) {
          if (side === 'debit') total += l.debit || 0;
          else if (side === 'credit') total += l.credit || 0;
          else total += (l.debit || 0) - (l.credit || 0);
        }
      }
    }
    return total;
  }

  private applyProgressiveBracket(base: number, brackets: DBTaxBracket[]): number {
    let totalTax = 0;
    for (const b of brackets) {
      if (base <= b.fromAmount) break;
      const upper = b.toAmount ?? Infinity;
      const taxable = Math.min(base, upper) - b.fromAmount;
      totalTax += Math.round(taxable * b.ratePct / 100);
    }
    return totalTax;
  }

  private async findExistingDeclaration(tax: DBTaxRegistry, start: string, end: string): Promise<DBTaxDeclaration | null> {
    const all = await this.adapter.getAll<DBTaxDeclaration>('taxDeclarations');
    return all.find(d => d.taxCode === tax.taxCode && d.periodStart === start && d.periodEnd === end) || null;
  }

  private computeDeadline(tax: DBTaxRegistry, periodEnd: string): string {
    const end = new Date(periodEnd);
    end.setDate(end.getDate() + (tax.declarationDeadlineDays || 15));
    return end.toISOString().split('T')[0];
  }

  private buildPeriodLabel(periodicity: string, start: string, end: string): string {
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const y = start.substring(0, 4);
    const m = parseInt(start.substring(5, 7)) - 1;
    if (periodicity === 'MONTHLY') return `${months[m]} ${y}`;
    if (periodicity === 'QUARTERLY') return `T${Math.ceil((m + 1) / 3)} ${y}`;
    if (periodicity === 'ANNUAL') return `Exercice ${y}`;
    return `${start} — ${end}`;
  }
}
