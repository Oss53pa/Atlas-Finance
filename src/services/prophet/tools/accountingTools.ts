// @ts-nocheck
/**
 * accountingTools — Tools connectés aux données comptables réelles via DataAdapter.
 *
 * consulter_balance, consulter_grand_livre, verifier_equilibre
 */
import type { ToolDefinition } from './ToolRegistry';
import type { DataAdapter } from '@atlas/data';
import { verifyTrialBalance } from '../../trialBalanceService';

function dataTool(name: string, description: string, parameters: Record<string, unknown>, required: string[], execute: (args: Record<string, unknown>, adapter: DataAdapter) => Promise<string>): [string, ToolDefinition] {
  return [name, {
    schema: { type: 'function', function: { name, description, parameters: { type: 'object', properties: parameters, required } } },
    execute: async (args, adapter) => {
      if (!adapter) return JSON.stringify({ error: 'DataAdapter non disponible. Données réelles inaccessibles.' });
      return execute(args, adapter);
    },
  }];
}

export const accountingTools: Record<string, ToolDefinition> = Object.fromEntries([
  dataTool('consulter_balance',
    'Consulter la balance générale ou la balance d\'une classe/sous-classe de comptes SYSCOHADA',
    {
      classeCompte: { type: 'string', description: 'Préfixe de classe (1-9) ou sous-classe (10, 41, 60...). Vide = toute la balance' },
      dateDebut: { type: 'string', description: 'Date début période (YYYY-MM-DD)' },
      dateFin: { type: 'string', description: 'Date fin période (YYYY-MM-DD)' },
    },
    [],
    async (args, adapter) => {
      const dateRange = args.dateDebut && args.dateFin
        ? { start: args.dateDebut as string, end: args.dateFin as string }
        : undefined;

      const balanceRows = await adapter.getTrialBalance(dateRange);

      let filtered = balanceRows;
      if (args.classeCompte) {
        const prefix = String(args.classeCompte);
        filtered = balanceRows.filter(r => r.accountCode?.startsWith(prefix));
      }

      const totalDebit = filtered.reduce((s, r) => s + (r.totalDebit || 0), 0);
      const totalCredit = filtered.reduce((s, r) => s + (r.totalCredit || 0), 0);

      // Limit to 50 rows for LLM context
      const rows = filtered.slice(0, 50).map(r => ({
        compte: r.accountCode,
        libelle: r.accountName,
        debit: r.totalDebit || 0,
        credit: r.totalCredit || 0,
        solde: (r.totalDebit || 0) - (r.totalCredit || 0),
      }));

      return JSON.stringify({
        nombreComptes: filtered.length,
        totalDebit,
        totalCredit,
        ecart: totalDebit - totalCredit,
        equilibree: Math.abs(totalDebit - totalCredit) < 1,
        comptes: rows,
        tronque: filtered.length > 50,
      });
    }),

  dataTool('consulter_grand_livre',
    'Consulter les écritures du grand livre pour un compte ou une période',
    {
      compteDebut: { type: 'string', description: 'Compte ou préfixe de début' },
      compteFin: { type: 'string', description: 'Compte ou préfixe de fin (optionnel)' },
      dateDebut: { type: 'string', description: 'Date début (YYYY-MM-DD)' },
      dateFin: { type: 'string', description: 'Date fin (YYYY-MM-DD)' },
      limit: { type: 'number', description: 'Nombre max de lignes (défaut 100)' },
    },
    [],
    async (args, adapter) => {
      const filters: Record<string, unknown> = {};
      if (args.dateDebut) filters.dateFrom = args.dateDebut;
      if (args.dateFin) filters.dateTo = args.dateFin;

      const entries = await adapter.getJournalEntries(filters);
      const limit = (args.limit as number) || 100;

      let lines: Array<{ compte: string; libelle: string; debit: number; credit: number }> = [];

      for (const entry of entries) {
        if (!entry.lines) continue;
        for (const line of entry.lines) {
          const code = line.accountCode || '';
          if (args.compteDebut && code < String(args.compteDebut)) continue;
          if (args.compteFin && code > String(args.compteFin)) continue;
          lines.push({
            compte: code,
            libelle: line.label || entry.description || '',
            debit: line.debit || 0,
            credit: line.credit || 0,
          });
        }
      }

      const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
      const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
      const tronque = lines.length > limit;
      lines = lines.slice(0, limit);

      return JSON.stringify({
        nombreLignes: lines.length,
        totalDebit,
        totalCredit,
        solde: totalDebit - totalCredit,
        lignes: lines,
        tronque,
      });
    }),

  dataTool('verifier_equilibre',
    'Vérifier l\'équilibre comptable global (total débits = total crédits)',
    {
      exercice: { type: 'string', description: 'Exercice fiscal (YYYY)' },
    },
    [],
    async (args, adapter) => {
      const result = await verifyTrialBalance(adapter, args.exercice as string);
      return JSON.stringify({
        equilibre: result.isBalanced,
        totalDebits: result.totalDebits,
        totalCredits: result.totalCredits,
        ecartGlobal: result.ecartGlobal,
        ecrituresVerifiees: result.entriesChecked,
        ecrituresDesequilibrees: result.unbalancedEntries,
        controles: result.checks,
      });
    }),
]);
