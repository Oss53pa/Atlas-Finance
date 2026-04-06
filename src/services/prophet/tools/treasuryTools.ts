// @ts-nocheck

/**
 * treasuryTools — Tools trésorerie, budget et créances.
 */
import type { ToolDefinition } from './ToolRegistry';
import type { DataAdapter } from '@atlas/data';
import { getSoldesBancaires } from '../../treasury/positionService';
import { getBudgetAnalysis, getBudgetAlerts } from '../../budgetAnalysisService';
import { getAgingAnalysis } from '../../receivableService';

function dataTool(name: string, description: string, parameters: Record<string, unknown>, required: string[], execute: (args: Record<string, unknown>, adapter: DataAdapter) => Promise<string>): [string, ToolDefinition] {
  return [name, {
    schema: { type: 'function', function: { name, description, parameters: { type: 'object', properties: parameters, required } } },
    execute: async (args, adapter) => {
      if (!adapter) return JSON.stringify({ error: 'DataAdapter non disponible.' });
      return execute(args, adapter);
    },
  }];
}

export const treasuryTools: Record<string, ToolDefinition> = Object.fromEntries([
  dataTool('consulter_tresorerie',
    'Consulter les soldes bancaires et la position de trésorerie',
    {},
    [],
    async (_args, adapter) => {
      const positions = await getSoldesBancaires(adapter);
      const total = positions.reduce((s, p) => s + (p.soldeComptable || 0), 0);
      return JSON.stringify({
        nombreComptes: positions.length,
        positions: positions.map(p => ({
          compte: p.accountCode,
          banque: p.accountName,
          solde: p.soldeComptable,
        })),
        soldeTotalTresorerie: total,
      });
    }),

  dataTool('analyser_budget',
    "Analyser l'exécution budgétaire pour un exercice fiscal",
    {
      exercice: { type: 'string', description: 'Exercice fiscal (YYYY)' },
    },
    ['exercice'],
    async (args, adapter) => {
      const [summary, alerts] = await Promise.all([
        getBudgetAnalysis(adapter, args.exercice as string),
        getBudgetAlerts(adapter, args.exercice as string),
      ]);
      return JSON.stringify({
        resume: summary,
        alertes: alerts.slice(0, 10),
        nombreAlertes: alerts.length,
      });
    }),

  dataTool('analyser_creances',
    "Analyse d'ancienneté des créances clients ou dettes fournisseurs (aging)",
    {
      type: { type: 'string', description: 'customer (clients) ou supplier (fournisseurs)' },
      dateReference: { type: 'string', description: 'Date de référence (YYYY-MM-DD)' },
    },
    [],
    async (args, adapter) => {
      const type = (args.type as string) === 'supplier' ? 'supplier' : 'customer';
      const aging = await getAgingAnalysis(adapter, type, args.dateReference as string);

      const totalCreances = aging.reduce((s, a) => s + (a.total || 0), 0);
      const totalEchu = aging.reduce((s, a) => s + (a.overdue || 0), 0);

      return JSON.stringify({
        type,
        nombreTiers: aging.length,
        totalCreances,
        totalEchu,
        tauxEchu: totalCreances > 0 ? `${((totalEchu / totalCreances) * 100).toFixed(1)}%` : '0%',
        detail: aging.slice(0, 20).map(a => ({
          tiers: a.thirdPartyName || a.thirdPartyCode,
          total: a.total,
          courant: a.current || 0,
          echu30: a.days30 || 0,
          echu60: a.days60 || 0,
          echu90: a.days90 || 0,
          echuPlus: a.days90Plus || 0,
        })),
        tronque: aging.length > 20,
      });
    }),
]);
