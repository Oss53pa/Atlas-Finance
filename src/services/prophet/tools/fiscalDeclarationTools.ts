// @ts-nocheck
/**
 * fiscalDeclarationTools — Tools PROPH3T pour le moteur fiscal.
 * Dashboard fiscal, calcul de taxes, alertes retard, historique.
 */
import type { ToolDefinition } from './ToolRegistry';
import type { DataAdapter } from '@atlas/data';
import { TaxDetectionEngine } from '../../fiscal/TaxDetectionEngine';

function dataTool(name: string, description: string, parameters: Record<string, unknown>, required: string[], execute: (args: Record<string, unknown>, adapter: DataAdapter) => Promise<string>): [string, ToolDefinition] {
  return [name, {
    schema: { type: 'function', function: { name, description, parameters: { type: 'object', properties: parameters, required } } },
    execute: async (args, adapter) => {
      if (!adapter) return JSON.stringify({ error: 'DataAdapter non disponible.' });
      return execute(args, adapter);
    },
  }];
}

function getDefaultPeriod() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-based, previous month
  const prevMonth = m === 0 ? 12 : m;
  const prevYear = m === 0 ? y - 1 : y;
  const start = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
  const lastDay = new Date(prevYear, prevMonth, 0).getDate();
  const end = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${lastDay}`;
  return { start, end };
}

export const fiscalDeclarationTools: Record<string, ToolDefinition> = Object.fromEntries([
  dataTool('get_fiscal_dashboard',
    'Tableau de bord fiscal complet : toutes les taxes dues, statuts, montants, alertes retard pour une période',
    {
      period_start: { type: 'string', description: 'Début période (YYYY-MM-DD). Défaut: début mois précédent' },
      period_end: { type: 'string', description: 'Fin période (YYYY-MM-DD). Défaut: fin mois précédent' },
      country_code: { type: 'string', description: 'Code pays (CI, SN, CM...). Défaut: CI' },
    },
    [],
    async (args, adapter) => {
      const { start, end } = getDefaultPeriod();
      const periodStart = (args.period_start as string) || start;
      const periodEnd = (args.period_end as string) || end;
      const countryCode = (args.country_code as string) || 'CI';

      const engine = new TaxDetectionEngine(adapter, countryCode);
      const results = await engine.detectTaxesFromAccounts(periodStart, periodEnd);

      const triggered = results.filter(r => r.isTriggered);
      const overdue = triggered.filter(r => r.isOverdue);
      const dueSoon = triggered.filter(r => !r.isOverdue && (r.daysUntilDeadline ?? 999) <= 7);
      const totalDue = triggered.reduce((s, r) => s + (r.amounts?.net || 0), 0);

      return JSON.stringify({
        periode: `${periodStart} → ${periodEnd}`,
        pays: countryCode,
        nombreTaxesDetectees: triggered.length,
        nombreTaxesEnRetard: overdue.length,
        nombreTaxesDueSous7j: dueSoon.length,
        totalObligations: totalDue,
        alertes: overdue.map(r => ({
          taxe: r.tax.taxShortName,
          echeance: r.declarationDeadline,
          montant: r.amounts?.net,
          joursRetard: -(r.daysUntilDeadline || 0),
        })),
        taxes: triggered.map(r => ({
          code: r.tax.taxCode,
          nom: r.tax.taxShortName,
          categorie: r.tax.taxCategory,
          montantDu: r.amounts?.net,
          echeance: r.declarationDeadline,
          statut: r.status,
          joursAvantEcheance: r.daysUntilDeadline,
          enRetard: r.isOverdue,
        })),
      });
    }),

  dataTool('calculate_tax',
    'Calculer une taxe spécifique (TVA, IS, IRPP, CNPS, etc.) pour une période donnée',
    {
      tax_code: { type: 'string', description: 'Code taxe: TVA, IS, IRPP_SALAIRES, CNPS_PATRON, CNPS_SALARIE, CMU, RAS_LOYER, RAS_HONORAIRES, AIRSI, etc.' },
      period_start: { type: 'string', description: 'Début période (YYYY-MM-DD)' },
      period_end: { type: 'string', description: 'Fin période (YYYY-MM-DD)' },
    },
    ['tax_code'],
    async (args, adapter) => {
      const { start, end } = getDefaultPeriod();
      const periodStart = (args.period_start as string) || start;
      const periodEnd = (args.period_end as string) || end;
      const taxCode = args.tax_code as string;

      const allRegistry = await adapter.getAll<any>('taxRegistry');
      const tax = allRegistry.find((t: any) => t.taxCode === taxCode && t.isActive);
      if (!tax) {
        return JSON.stringify({ error: `Taxe "${taxCode}" non trouvée dans le registre. Taxes disponibles: ${allRegistry.map((t: any) => t.taxCode).join(', ')}` });
      }

      const engine = new TaxDetectionEngine(adapter, tax.countryCode);
      const amounts = await engine.calculateTaxAmounts(tax);

      return JSON.stringify({
        taxe: tax.taxShortName,
        code: tax.taxCode,
        periode: `${periodStart} → ${periodEnd}`,
        formule: tax.formula,
        taux: tax.ratePct ? `${tax.ratePct}%` : null,
        periodicite: tax.periodicity,
        autorite: tax.fiscalAuthority,
        referenceLegale: tax.legalReference,
        ...amounts,
      });
    }),

  dataTool('get_overdue_declarations',
    'Lister toutes les déclarations fiscales en retard ou à venir sous 30 jours',
    {},
    [],
    async (_args, adapter) => {
      const allDecl = await adapter.getAll<any>('taxDeclarations');
      const now = new Date().toISOString().split('T')[0];

      const overdue = allDecl.filter((d: any) =>
        d.declarationDeadline && d.declarationDeadline < now &&
        !['paid', 'declared'].includes(d.status)
      );

      const upcoming = allDecl.filter((d: any) => {
        if (!d.declarationDeadline || ['paid', 'declared'].includes(d.status)) return false;
        const days = Math.round((new Date(d.declarationDeadline).getTime() - Date.now()) / 86400000);
        return days >= 0 && days <= 30;
      });

      return JSON.stringify({
        enRetard: overdue.map((d: any) => ({
          taxe: d.taxCode,
          periode: d.periodLabel,
          montant: d.netTax,
          echeance: d.declarationDeadline,
          statut: d.status,
        })),
        aVenir30j: upcoming.map((d: any) => ({
          taxe: d.taxCode,
          periode: d.periodLabel,
          montant: d.netTax,
          echeance: d.declarationDeadline,
          joursRestants: Math.round((new Date(d.declarationDeadline).getTime() - Date.now()) / 86400000),
        })),
        nombreEnRetard: overdue.length,
        nombreAVenir: upcoming.length,
      });
    }),

  dataTool('get_tax_history',
    'Historique des déclarations et paiements pour une taxe sur N mois',
    {
      tax_code: { type: 'string', description: 'Code taxe (TVA, IS, CNPS_PATRON, etc.)' },
      months: { type: 'number', description: 'Nombre de mois d\'historique (défaut: 12)' },
    },
    [],
    async (args, adapter) => {
      const taxCode = args.tax_code as string;
      const months = (args.months as number) || 12;

      const allDecl = await adapter.getAll<any>('taxDeclarations');
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - months);
      const cutoffStr = cutoff.toISOString().split('T')[0];

      let filtered = allDecl.filter((d: any) => d.periodStart >= cutoffStr);
      if (taxCode) filtered = filtered.filter((d: any) => d.taxCode === taxCode);

      filtered.sort((a: any, b: any) => b.periodStart.localeCompare(a.periodStart));

      const totalPaye = filtered.filter((d: any) => d.status === 'paid').reduce((s: number, d: any) => s + (d.netTax || 0), 0);
      const totalDu = filtered.reduce((s: number, d: any) => s + (d.netTax || 0), 0);

      return JSON.stringify({
        taxe: taxCode || 'Toutes',
        periodeAnalysee: `${months} derniers mois`,
        nombreDeclarations: filtered.length,
        totalDu,
        totalPaye,
        soldeRestant: totalDu - totalPaye,
        declarations: filtered.slice(0, 24).map((d: any) => ({
          periode: d.periodLabel,
          montant: d.netTax,
          statut: d.status,
          echeance: d.declarationDeadline,
          payeLe: d.paidAt,
        })),
      });
    }),
]);
