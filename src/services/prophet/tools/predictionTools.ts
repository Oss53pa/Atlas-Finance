// @ts-nocheck
/**
 * predictionTools — Prévisions trésorerie et détection d'anomalies.
 */
import type { ToolDefinition } from './ToolRegistry';
import type { DataAdapter } from '@atlas/data';

function dataTool(name: string, description: string, parameters: Record<string, unknown>, required: string[], execute: (args: Record<string, unknown>, adapter: DataAdapter) => Promise<string>): [string, ToolDefinition] {
  return [name, {
    schema: { type: 'function', function: { name, description, parameters: { type: 'object', properties: parameters, required } } },
    execute: async (args, adapter) => {
      if (!adapter) return JSON.stringify({ error: 'DataAdapter non disponible.' });
      return execute(args, adapter);
    },
  }];
}

export const predictionTools: Record<string, ToolDefinition> = Object.fromEntries([
  dataTool('prevoir_tresorerie',
    'Prévision de trésorerie sur N jours basée sur les tendances historiques',
    {
      horizonJours: { type: 'number', description: 'Horizon de prévision en jours (30, 60, 90)' },
    },
    [],
    async (args, adapter) => {
      const horizon = (args.horizonJours as number) || 30;

      // Fetch recent entries to compute cash flow trend
      const now = new Date();
      const past90 = new Date(now.getTime() - 90 * 24 * 3600_000);
      const entries = await adapter.getJournalEntries({
        dateFrom: past90.toISOString().slice(0, 10),
        dateTo: now.toISOString().slice(0, 10),
      });

      // Aggregate monthly cash flows (class 5 = trésorerie)
      const monthlyFlows: Record<string, number> = {};
      for (const entry of entries) {
        if (!entry.lines) continue;
        const month = (entry.date || '').slice(0, 7);
        for (const line of entry.lines) {
          if (line.accountCode?.startsWith('5')) {
            const flow = (line.debit || 0) - (line.credit || 0);
            monthlyFlows[month] = (monthlyFlows[month] || 0) + flow;
          }
        }
      }

      const months = Object.keys(monthlyFlows).sort();
      const flows = months.map(m => monthlyFlows[m]);
      const avgMonthlyFlow = flows.length > 0 ? flows.reduce((a, b) => a + b, 0) / flows.length : 0;

      // Get current treasury balance
      const balanceMap = await adapter.getBalanceByAccount();
      let soldeTresorerie = 0;
      for (const [code, bal] of balanceMap) {
        if (code.startsWith('5')) {
          soldeTresorerie += (bal.totalDebit || 0) - (bal.totalCredit || 0);
        }
      }

      // Simple linear projection
      const previsions = [];
      let solde = soldeTresorerie;
      const dailyFlow = avgMonthlyFlow / 30;

      for (let i = 1; i <= Math.min(horizon, 90); i += (horizon <= 30 ? 1 : horizon <= 60 ? 7 : 15)) {
        solde += dailyFlow * (horizon <= 30 ? 1 : horizon <= 60 ? 7 : 15);
        const date = new Date(now.getTime() + i * 24 * 3600_000);
        previsions.push({
          date: date.toISOString().slice(0, 10),
          soldePrevu: Math.round(solde),
        });
      }

      const soldeFinHorizon = Math.round(soldeTresorerie + dailyFlow * horizon);
      const risqueRupture = soldeFinHorizon < 0;

      return JSON.stringify({
        soldeTresorerieActuel: Math.round(soldeTresorerie),
        fluxMoyenMensuel: Math.round(avgMonthlyFlow),
        horizonJours: horizon,
        soldePrevu: soldeFinHorizon,
        risqueRupture,
        previsions: previsions.slice(0, 15),
        methode: 'projection_lineaire_historique',
        avertissement: risqueRupture
          ? 'ALERTE: Risque de rupture de trésorerie détecté sur cet horizon.'
          : null,
      });
    }),

  dataTool('detecter_anomalies',
    'Détecter les anomalies comptables (écritures inhabituelles, montants atypiques)',
    {
      seuilEcart: { type: 'number', description: 'Seuil en écarts-types pour considérer une anomalie (défaut: 2)' },
      periode: { type: 'string', description: 'Période à analyser (YYYY-MM)' },
    },
    [],
    async (args, adapter) => {
      const seuil = (args.seuilEcart as number) || 2;

      const filters: Record<string, unknown> = {};
      if (args.periode) {
        const [year, month] = (args.periode as string).split('-');
        filters.dateFrom = `${year}-${month}-01`;
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        filters.dateTo = `${year}-${month}-${lastDay}`;
      }

      const entries = await adapter.getJournalEntries(filters);

      // Collect all line amounts
      const montants: number[] = [];
      for (const entry of entries) {
        if (!entry.lines) continue;
        for (const line of entry.lines) {
          const amount = Math.max(line.debit || 0, line.credit || 0);
          if (amount > 0) montants.push(amount);
        }
      }

      if (montants.length < 10) {
        return JSON.stringify({
          message: 'Pas assez de données pour détecter des anomalies (minimum 10 lignes).',
          nombreLignes: montants.length,
        });
      }

      // Compute mean & std
      const mean = montants.reduce((a, b) => a + b, 0) / montants.length;
      const variance = montants.reduce((s, m) => s + (m - mean) ** 2, 0) / montants.length;
      const stdDev = Math.sqrt(variance);
      const seuilAnomal = mean + seuil * stdDev;

      // Find anomalies
      const anomalies: Array<{ date: string; journal: string; libelle: string; montant: number; ecartType: number }> = [];
      for (const entry of entries) {
        if (!entry.lines) continue;
        for (const line of entry.lines) {
          const amount = Math.max(line.debit || 0, line.credit || 0);
          if (amount > seuilAnomal) {
            anomalies.push({
              date: entry.date || '',
              journal: entry.journalCode || '',
              libelle: line.label || entry.description || '',
              montant: amount,
              ecartType: Math.round(((amount - mean) / stdDev) * 10) / 10,
            });
          }
        }
      }

      // Also check entries on weekends/holidays
      const ecrituresWeekend: Array<{ date: string; libelle: string }> = [];
      for (const entry of entries) {
        if (!entry.date) continue;
        const d = new Date(entry.date);
        if (d.getDay() === 0 || d.getDay() === 6) {
          ecrituresWeekend.push({ date: entry.date, libelle: entry.description || '' });
        }
      }

      return JSON.stringify({
        nombreEcritures: entries.length,
        nombreLignes: montants.length,
        montantMoyen: Math.round(mean),
        ecartType: Math.round(stdDev),
        seuilAnomalie: Math.round(seuilAnomal),
        anomaliesMontant: anomalies.slice(0, 20),
        nombreAnomalies: anomalies.length,
        ecrituresWeekend: ecrituresWeekend.slice(0, 10),
        nombreWeekend: ecrituresWeekend.length,
      });
    }),
]);
