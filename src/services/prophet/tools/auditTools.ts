// @ts-nocheck
/**
 * auditTools — Tools d'audit et de lettrage connectés aux données réelles.
 * Inclut audit_complet et audit_cycle qui délèguent au module audit/.
 */
import type { ToolDefinition } from './ToolRegistry';
import type { DataAdapter } from '@atlas/data';
import { getLettrageStats } from '../../lettrageService';

function dataTool(name: string, description: string, parameters: Record<string, unknown>, required: string[], execute: (args: Record<string, unknown>, adapter: DataAdapter) => Promise<string>): [string, ToolDefinition] {
  return [name, {
    schema: { type: 'function', function: { name, description, parameters: { type: 'object', properties: parameters, required } } },
    execute: async (args, adapter) => {
      if (!adapter) return JSON.stringify({ error: 'DataAdapter non disponible.' });
      return execute(args, adapter);
    },
  }];
}

export const auditTools: Record<string, ToolDefinition> = Object.fromEntries([
  dataTool('verifier_lettrage',
    'Vérifier le taux de lettrage des comptes de tiers (clients/fournisseurs)',
    {
      prefixeCompte: { type: 'string', description: 'Préfixe compte (41 pour clients, 40 pour fournisseurs)' },
    },
    [],
    async (args, adapter) => {
      const stats = await getLettrageStats(adapter, args.prefixeCompte as string);
      return JSON.stringify({
        totalLignes: stats.totalLines,
        lignesLettrees: stats.letteredLines,
        lignesNonLettrees: stats.unletteredLines,
        tauxLettrage: `${(stats.tauxLettrage * 100).toFixed(1)}%`,
        montantNonLettre: stats.montantNonLettre,
        codes: stats.codes,
      });
    }),

  dataTool('audit_complet',
    'Lancer un audit complet SYSCOHADA (108 contrôles sur tous les cycles)',
    {
      niveauMax: { type: 'number', description: 'Niveau de contrôle maximum (0-8, défaut: 8 = tous)' },
    },
    [],
    async (args, adapter) => {
      // Dynamic import to avoid circular deps
      const { runAudit } = await import('../audit/index');
      const result = await runAudit(adapter, (args.niveauMax as number) ?? 8);
      return JSON.stringify(result);
    }),

  dataTool('audit_cycle',
    'Lancer un audit ciblé sur un cycle comptable spécifique',
    {
      cycle: { type: 'string', description: 'Cycle: fondamentaux, capitaux_propres, immobilisations, tiers, tresorerie, charges_produits, transversaux, fiscal' },
      niveauMax: { type: 'number', description: 'Niveau max (0-8)' },
    },
    ['cycle'],
    async (args, adapter) => {
      const { runAuditCycle } = await import('../audit/index');
      const result = await runAuditCycle(adapter, args.cycle as string, (args.niveauMax as number) ?? 8);
      return JSON.stringify(result);
    }),
]);
