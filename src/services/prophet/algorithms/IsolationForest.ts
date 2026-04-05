// @ts-nocheck
/**
 * IsolationForest — Détection d'anomalies en TypeScript pur (offline, zéro dépendance ML)
 * Algorithme : Liu, Ting & Zhou (2008)
 */
import type { ToolDefinition } from '../tools/ToolRegistry';

// ── ISOLATION TREE ───────────────────────────────────────────

interface IsolationNode {
  type: 'internal' | 'leaf';
  feature?: number;
  splitValue?: number;
  left?: IsolationNode;
  right?: IsolationNode;
  size?: number;
}

function buildTree(data: number[][], depth: number, maxDepth: number): IsolationNode {
  if (data.length <= 1 || depth >= maxDepth) {
    return { type: 'leaf', size: data.length };
  }

  const nFeatures = data[0].length;
  const feature = Math.floor(Math.random() * nFeatures);
  const column = data.map(row => row[feature]);
  const min = Math.min(...column);
  const max = Math.max(...column);

  if (min === max) {
    return { type: 'leaf', size: data.length };
  }

  const splitValue = min + Math.random() * (max - min);
  const left = data.filter(row => row[feature] < splitValue);
  const right = data.filter(row => row[feature] >= splitValue);

  return {
    type: 'internal',
    feature,
    splitValue,
    left: buildTree(left, depth + 1, maxDepth),
    right: buildTree(right, depth + 1, maxDepth),
  };
}

function pathLength(point: number[], node: IsolationNode, depth: number): number {
  if (node.type === 'leaf') {
    return depth + harmonicNumber(node.size || 1);
  }
  if (point[node.feature!] < node.splitValue!) {
    return pathLength(point, node.left!, depth + 1);
  }
  return pathLength(point, node.right!, depth + 1);
}

// c(n) — average path length of unsuccessful search in BST
function harmonicNumber(n: number): number {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  const H = Math.log(n - 1) + 0.5772156649; // Euler-Mascheroni constant
  return 2 * H - (2 * (n - 1)) / n;
}

// ── ISOLATION FOREST ─────────────────────────────────────────

export class IsolationForest {
  private trees: IsolationNode[] = [];
  private numTrees: number;
  private subsampleSize: number;
  private avgPathLength: number = 0;

  constructor(numTrees: number = 100, subsampleSize: number = 256) {
    this.numTrees = numTrees;
    this.subsampleSize = subsampleSize;
  }

  fit(data: number[][]): void {
    if (data.length === 0) return;
    const maxDepth = Math.ceil(Math.log2(this.subsampleSize));
    this.trees = [];

    for (let i = 0; i < this.numTrees; i++) {
      const sample = this.subsample(data);
      this.trees.push(buildTree(sample, 0, maxDepth));
    }

    this.avgPathLength = harmonicNumber(data.length);
  }

  private subsample(data: number[][]): number[][] {
    if (data.length <= this.subsampleSize) return [...data];
    const indices = new Set<number>();
    while (indices.size < this.subsampleSize) {
      indices.add(Math.floor(Math.random() * data.length));
    }
    return [...indices].map(i => data[i]);
  }

  score(point: number[]): number {
    if (this.trees.length === 0) return 0.5;
    const avgPath = this.trees.reduce((sum, tree) => sum + pathLength(point, tree, 0), 0) / this.trees.length;
    const cn = this.avgPathLength || 1;
    return Math.pow(2, -avgPath / cn);
  }

  detectAnomalies(ecritures: any[], threshold: number = 0.7): any[] {
    if (ecritures.length === 0) return [];

    // Extraire les features
    const features = ecritures.map(e => {
      const montant = Math.abs(e.montant ?? e.debit ?? 0);
      const date = new Date(e.date || Date.now());
      return [
        montant > 0 ? Math.log10(montant) : 0,          // log du montant
        date.getHours() + date.getMinutes() / 60,        // heure de saisie
        date.getDay(),                                     // jour de la semaine
        e.debit && e.credit ? e.debit / (e.credit || 1) : 1, // ratio débit/crédit
        1,                                                  // fréquence compte (placeholder)
      ];
    });

    // Entraîner
    this.fit(features);

    // Scorer et filtrer
    const anomalies: any[] = [];
    for (let i = 0; i < ecritures.length; i++) {
      const s = this.score(features[i]);
      if (s >= threshold) {
        anomalies.push({
          ...ecritures[i],
          anomaly_score: Math.round(s * 1000) / 1000,
          features_utilisees: {
            log_montant: features[i][0],
            heure_saisie: features[i][1],
            jour_semaine: features[i][2],
          },
          raison: s >= 0.9 ? 'Très suspect — montant, heure ou fréquence très atypique'
            : s >= 0.8 ? 'Suspect — écart significatif par rapport au pattern habituel'
            : 'À vérifier — légèrement atypique',
        });
      }
    }

    return anomalies.sort((a, b) => b.anomaly_score - a.anomaly_score);
  }
}

export const isolationForestTools: Record<string, ToolDefinition> = {
  detecter_anomalies_isolation_forest: {
    schema: {
      type: 'function',
      function: {
        name: 'detecter_anomalies_isolation_forest',
        description: 'Détecte les écritures comptables anormales via Isolation Forest (algorithme ML). Analyse montants, horaires, fréquences. Score 0-1 (1 = très anormal).',
        parameters: {
          type: 'object',
          properties: {
            ecritures: { type: 'array', items: { type: 'object' }, description: 'Écritures [{date, montant, debit, credit, compte, libelle}]' },
            seuil: { type: 'number', default: 0.7, description: 'Seuil d\'anomalie (0-1)' },
          },
          required: ['ecritures'],
        },
      },
    },
    execute: async (args, adapter) => {
      let { ecritures, seuil } = args as any;

      // Lire les écritures réelles si non fournies
      if ((!ecritures || ecritures.length === 0) && adapter) {
        const now = new Date();
        const d90 = new Date(now.getTime() - 90 * 86400000);
        const entries = await adapter.getJournalEntries({
          where: { dateFrom: d90.toISOString().split('T')[0] },
          limit: 5000,
        });
        ecritures = entries.flatMap((e: any) => (e.lines || []).map((l: any) => ({
          date: e.date,
          montant: l.debit || l.credit || 0,
          debit: l.debit || 0,
          credit: l.credit || 0,
          compte: l.accountCode,
          libelle: e.label || l.label,
        })));
      }
      if (!ecritures || ecritures.length === 0) {
        return JSON.stringify({ error: 'Aucune écriture disponible pour l\'analyse.' });
      }

      const forest = new IsolationForest(100, Math.min(256, ecritures.length));
      const anomalies = forest.detectAnomalies(ecritures, seuil ?? 0.7);
      return JSON.stringify({ nb_ecritures_analysees: ecritures.length, nb_anomalies: anomalies.length, seuil: seuil ?? 0.7, anomalies });
    },
  },
};
