// @ts-nocheck
/**
 * ClusteringTiers — K-means en TypeScript pur pour segmentation clients/fournisseurs
 */
import type { ToolDefinition } from '../tools/ToolRegistry';

// ── K-MEANS ──────────────────────────────────────────────────

function euclideanDist(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, val, i) => sum + (val - (b[i] ?? 0)) ** 2, 0));
}

function normalize(data: number[][]): { normalized: number[][]; mins: number[]; maxs: number[] } {
  if (data.length === 0) return { normalized: [], mins: [], maxs: [] };
  const nFeatures = data[0].length;
  const mins = new Array(nFeatures).fill(Infinity);
  const maxs = new Array(nFeatures).fill(-Infinity);

  for (const row of data) {
    for (let j = 0; j < nFeatures; j++) {
      mins[j] = Math.min(mins[j], row[j]);
      maxs[j] = Math.max(maxs[j], row[j]);
    }
  }

  const normalized = data.map(row => row.map((v, j) => {
    const range = maxs[j] - mins[j];
    return range > 0 ? (v - mins[j]) / range : 0;
  }));

  return { normalized, mins, maxs };
}

function kmeans(data: number[][], k: number, maxIter: number = 100): { labels: number[]; centroids: number[][] } {
  if (data.length === 0 || k <= 0) return { labels: [], centroids: [] };
  const n = data.length;
  const nFeatures = data[0].length;

  // Init centroids (random selection)
  const indices = new Set<number>();
  while (indices.size < Math.min(k, n)) {
    indices.add(Math.floor(Math.random() * n));
  }
  let centroids = [...indices].map(i => [...data[i]]);
  let labels = new Array(n).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    // Assign
    const newLabels = data.map(point => {
      let minDist = Infinity, bestK = 0;
      for (let c = 0; c < centroids.length; c++) {
        const d = euclideanDist(point, centroids[c]);
        if (d < minDist) { minDist = d; bestK = c; }
      }
      return bestK;
    });

    // Check convergence
    if (newLabels.every((l, i) => l === labels[i])) break;
    labels = newLabels;

    // Update centroids
    centroids = centroids.map((_, c) => {
      const members = data.filter((_, i) => labels[i] === c);
      if (members.length === 0) return centroids[c];
      return members[0].map((_, j) => members.reduce((a, m) => a + m[j], 0) / members.length);
    });
  }

  return { labels, centroids };
}

// ── SEGMENTATION ─────────────────────────────────────────────

interface ClientData { id: string; nom: string; delai_moyen_paiement: number; ca_annuel: number; taux_impaye: number; anciennete_mois: number; nb_commandes: number; }
interface Segment { label: string; description: string; clients: string[]; centroid: Record<string, number>; recommandations: string[]; }

const SEGMENT_LABELS_CLIENTS = [
  { label: 'Clients or', description: 'Gros CA, paient vite, fidèles', recommandations: ['Proposer conditions préférentielles (escompte 2%)', 'Programme de fidélité', 'Priorité service client'] },
  { label: 'Clients à risque', description: 'Délais longs, impayés récurrents', recommandations: ['Réduire limite de crédit', 'Exiger acompte 30%', 'Relances systématiques J+7'] },
  { label: 'Clients dormants', description: 'Plus commandé depuis longtemps', recommandations: ['Campagne de réactivation', 'Offre promotionnelle ciblée', 'Contact commercial direct'] },
  { label: 'Nouveaux prometteurs', description: 'Récents avec tendance positive', recommandations: ['Accompagnement personnalisé', 'Cross-selling', 'Invitation événements'] },
];

function segmenterClients(clients: ClientData[]): { segments: Segment[]; non_segmentes: string[] } {
  if (clients.length < 4) {
    return { segments: [{ label: 'Tous', description: 'Trop peu de clients pour segmenter', clients: clients.map(c => c.id), centroid: {}, recommandations: [] }], non_segmentes: [] };
  }

  const features = clients.map(c => [c.delai_moyen_paiement, c.ca_annuel, c.taux_impaye, c.anciennete_mois, c.nb_commandes]);
  const { normalized } = normalize(features);
  const k = Math.min(4, clients.length);
  const { labels, centroids } = kmeans(normalized, k);

  // Assign meaningful labels based on centroid characteristics
  const segments: Segment[] = [];
  for (let c = 0; c < k; c++) {
    const memberIndices = labels.map((l, i) => l === c ? i : -1).filter(i => i >= 0);
    if (memberIndices.length === 0) continue;

    const members = memberIndices.map(i => clients[i]);
    const avgDelai = members.reduce((a, m) => a + m.delai_moyen_paiement, 0) / members.length;
    const avgCA = members.reduce((a, m) => a + m.ca_annuel, 0) / members.length;
    const avgImpaye = members.reduce((a, m) => a + m.taux_impaye, 0) / members.length;
    const avgAnc = members.reduce((a, m) => a + m.anciennete_mois, 0) / members.length;

    // Heuristic label assignment
    let segmentDef;
    if (avgCA > 50000000 && avgDelai < 45 && avgImpaye < 0.05) {
      segmentDef = SEGMENT_LABELS_CLIENTS[0]; // Clients or
    } else if (avgDelai > 60 || avgImpaye > 0.15) {
      segmentDef = SEGMENT_LABELS_CLIENTS[1]; // À risque
    } else if (avgAnc < 12) {
      segmentDef = SEGMENT_LABELS_CLIENTS[3]; // Nouveaux prometteurs
    } else {
      segmentDef = SEGMENT_LABELS_CLIENTS[2]; // Dormants
    }

    segments.push({
      ...segmentDef,
      clients: members.map(m => m.id),
      centroid: {
        delai_moyen: Math.round(avgDelai),
        ca_moyen: Math.round(avgCA),
        taux_impaye_moyen: Math.round(avgImpaye * 100) / 100,
        anciennete_moyenne: Math.round(avgAnc),
      },
    });
  }

  return { segments, non_segmentes: [] };
}

export const clusteringTools: Record<string, ToolDefinition> = {
  segmenter_clients: {
    schema: {
      type: 'function',
      function: {
        name: 'segmenter_clients',
        description: 'Segmente les clients par K-means (ML offline) : Clients or, À risque, Dormants, Nouveaux prometteurs. Retourne segments avec recommandations commerciales.',
        parameters: {
          type: 'object',
          properties: {
            clients: { type: 'array', items: { type: 'object' }, description: 'Liste clients [{id, nom, delai_moyen_paiement, ca_annuel, taux_impaye, anciennete_mois, nb_commandes}]' },
          },
          required: ['clients'],
        },
      },
    },
    execute: async (args, adapter) => {
      let { clients } = args as any;

      // Lire les tiers (clients) depuis la base si non fournis
      if ((!clients || clients.length === 0) && adapter) {
        try {
          const tiers = await adapter.getAll('thirdParties', { where: { type: 'client' }, limit: 500 }) as any[];
          const entries = await adapter.getJournalEntries({ limit: 10000 });

          clients = tiers.map((t: any) => {
            // Calculer les métriques depuis les écritures
            const clientEntries = entries.flatMap((e: any) =>
              (e.lines || []).filter((l: any) => l.accountCode?.startsWith('41') && l.thirdPartyId === t.id)
            );
            const totalDebit = clientEntries.reduce((a: number, l: any) => a + (l.debit || 0), 0);
            const now = Date.now();
            const createdAt = t.createdAt ? new Date(t.createdAt).getTime() : now;

            return {
              id: t.id,
              nom: t.name || t.nom || '',
              delai_moyen_paiement: t.avgPaymentDays || 30,
              ca_annuel: totalDebit || t.annualRevenue || 0,
              taux_impaye: t.unpaidRate || 0,
              anciennete_mois: Math.max(1, Math.round((now - createdAt) / (30 * 86400000))),
              nb_commandes: clientEntries.length || 0,
            };
          }).filter((c: any) => c.ca_annuel > 0);
        } catch (_) { /* fallback */ }
      }

      return JSON.stringify(segmenterClients(clients || []));
    },
  },
};
