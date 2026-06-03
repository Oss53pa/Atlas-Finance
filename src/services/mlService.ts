/**
 * mlService — Heuristiques d'aide à la décision comptable (SYSCOHADA)
 *
 * ⚠️ IMPORTANT : ce module ne contient PAS de vrai modèle d'apprentissage
 * automatique. Les méthodes ci-dessous sont des HEURISTIQUES DÉTERMINISTES
 * calculées à partir des données comptables (libellés, flux, historique de
 * paiement, écritures). Elles fournissent un comportement utile et reproductible
 * en attendant le branchement d'un éventuel backend ML réel. Les libellés
 * "Random Forest / LSTM / XGBoost" affichés côté chatbot sont purement cosmétiques.
 */

import { db, type DBJournalEntry } from '../lib/db';

// ============================================================================
// TYPES
// ============================================================================

export interface AccountRecommendationInput {
  libelle: string;
  montant: number;
  tiers?: string;
}

export interface AccountRecommendation {
  account: string;
  confidence: number; // 0..1
}

export interface TreasuryHistoryPoint {
  date: string;
  solde: number;
  entrees: number;
  sorties: number;
}

export interface TreasuryForecastPoint {
  date: string;
  predicted_amount: number;
}

export interface ClientRiskInput {
  client_id: number;
  /** Nombre de paiements honorés dans l'historique (plus = moins risqué) */
  historique_paiements: number;
  /** Montant des créances en cours */
  montant_creances: number;
  /** Nombre de retards de paiement constatés */
  retards: number;
  /** Ancienneté de la relation, en années */
  anciennete: number;
}

export type RiskCategory = 'Faible' | 'Moyen' | 'Élevé' | 'Critique';

export interface ClientRiskResult {
  risk_probability: number; // 0..1
  risk_category: RiskCategory;
}

export type AnomalySeverity = 'CRITIQUE' | 'ELEVE' | 'MOYEN';

export interface Anomaly {
  severite: AnomalySeverity;
  titre: string;
  score: number; // 0..1
}

export interface MLDashboard {
  summary: {
    active_models: number;
    total_models: number;
    ready_models: number;
    training_models: number;
    needs_retraining: number;
  };
  models_by_type: Record<string, number>;
  recent_trainings: Array<{ modele_nom: string; score: number; improvement?: number }>;
}

// ============================================================================
// HELPERS
// ============================================================================

/** Normalise une chaîne pour comparaison insensible à la casse et aux accents. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g'), '');
}

/**
 * Table de correspondance mots-clés → comptes SYSCOHADA candidats.
 * `weight` pondère la confiance lorsqu'un mot-clé est présent dans le libellé.
 */
const ACCOUNT_KEYWORDS: Array<{ keywords: string[]; account: string; weight: number }> = [
  { keywords: ['achat', 'fourniture', 'marchandise', 'matiere'], account: '601', weight: 0.9 },
  { keywords: ['stock', 'approvisionnement'], account: '602', weight: 0.7 },
  { keywords: ['vente', 'facture client', 'prestation', 'service rendu'], account: '701', weight: 0.9 },
  { keywords: ['client', 'creance'], account: '411', weight: 0.75 },
  { keywords: ['fournisseur', 'dette fournisseur'], account: '401', weight: 0.75 },
  { keywords: ['salaire', 'paie', 'remuneration', 'personnel'], account: '661', weight: 0.9 },
  { keywords: ['loyer', 'location', 'bail'], account: '622', weight: 0.85 },
  { keywords: ['electricite', 'eau', 'energie'], account: '605', weight: 0.85 },
  { keywords: ['carburant', 'essence', 'gasoil', 'transport'], account: '624', weight: 0.8 },
  { keywords: ['telephone', 'internet', 'communication', 'frais postaux'], account: '626', weight: 0.8 },
  { keywords: ['honoraire', 'conseil', 'avocat', 'comptable', 'expert'], account: '632', weight: 0.85 },
  { keywords: ['assurance'], account: '625', weight: 0.85 },
  { keywords: ['entretien', 'reparation', 'maintenance'], account: '624', weight: 0.7 },
  { keywords: ['impot', 'taxe', 'tva', 'patente'], account: '641', weight: 0.8 },
  { keywords: ['banque', 'virement', 'releve'], account: '521', weight: 0.85 },
  { keywords: ['caisse', 'especes', 'liquide'], account: '571', weight: 0.85 },
  { keywords: ['interet', 'agios', 'emprunt'], account: '671', weight: 0.75 },
  { keywords: ['amortissement', 'dotation'], account: '681', weight: 0.75 },
  { keywords: ['immobilisation', 'materiel', 'equipement', 'mobilier'], account: '244', weight: 0.7 },
  { keywords: ['publicite', 'marketing', 'communication commerciale'], account: '627', weight: 0.7 },
];

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function toRiskCategory(probability: number): RiskCategory {
  if (probability >= 0.75) return 'Critique';
  if (probability >= 0.5) return 'Élevé';
  if (probability >= 0.25) return 'Moyen';
  return 'Faible';
}

// ============================================================================
// HEURISTIQUES
// ============================================================================

/**
 * Recommande des comptes SYSCOHADA pour une transaction, par correspondance de
 * mots-clés sur le libellé. Heuristique (fréquence/pertinence des mots-clés),
 * pas de modèle entraîné.
 */
async function getAccountRecommendations(
  input: AccountRecommendationInput
): Promise<AccountRecommendation[]> {
  const haystack = normalize(`${input.libelle ?? ''} ${input.tiers ?? ''}`);

  const scored = ACCOUNT_KEYWORDS.map(({ keywords, account, weight }) => {
    const hits = keywords.filter((kw) => haystack.includes(normalize(kw))).length;
    // Confiance = poids de base modulé par le nombre de mots-clés trouvés.
    const confidence = hits === 0 ? 0 : clamp01(weight * (1 + (hits - 1) * 0.1));
    return { account, confidence };
  }).filter((r) => r.confidence > 0);

  if (scored.length === 0) {
    // Aucun mot-clé reconnu : proposer un compte d'attente avec faible confiance.
    return [{ account: '471', confidence: 0.3 }];
  }

  // Dédoublonne par compte (garde la meilleure confiance) puis trie décroissant.
  const byAccount = new Map<string, number>();
  for (const { account, confidence } of scored) {
    byAccount.set(account, Math.max(byAccount.get(account) ?? 0, confidence));
  }

  return [...byAccount.entries()]
    .map(([account, confidence]) => ({ account, confidence }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}

/**
 * Projette la trésorerie sur `periods` jours par extrapolation linéaire du flux
 * net moyen observé dans l'historique. Heuristique, pas de réseau de neurones.
 */
async function getTreasuryForecast(
  historical: TreasuryHistoryPoint[],
  periods: number
): Promise<TreasuryForecastPoint[]> {
  const horizon = Math.max(1, Math.floor(periods) || 0);

  if (!historical || historical.length === 0) {
    return [];
  }

  // L'historique est supposé trié du plus ancien au plus récent.
  const last = historical[historical.length - 1];
  const lastSolde = Number(last.solde) || 0;

  // Flux net moyen quotidien = moyenne(entrées − sorties).
  const totalNet = historical.reduce(
    (sum, p) => sum + ((Number(p.entrees) || 0) - (Number(p.sorties) || 0)),
    0
  );
  const avgNetFlow = totalNet / historical.length;

  const startDate = new Date(last.date);
  const forecasts: TreasuryForecastPoint[] = [];

  for (let i = 1; i <= horizon; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    forecasts.push({
      date: d.toISOString().split('T')[0],
      predicted_amount: Math.round((lastSolde + avgNetFlow * i) * 100) / 100,
    });
  }

  return forecasts;
}

/**
 * Évalue le risque de défaut d'un client à partir de son historique de paiement.
 * Score déterministe pondéré (retards, créances, ancienneté, régularité), pas un
 * modèle XGBoost.
 */
async function analyzeClientRisk(client: ClientRiskInput): Promise<ClientRiskResult> {
  const retards = Math.max(0, Number(client?.retards) || 0);
  const creances = Math.max(0, Number(client?.montant_creances) || 0);
  const paiements = Math.max(0, Number(client?.historique_paiements) || 0);
  const anciennete = Math.max(0, Number(client?.anciennete) || 0);

  // Facteurs aggravants
  // - chaque retard ajoute du risque (saturé à ~6 retards)
  const retardFactor = clamp01(retards / 6) * 0.45;
  // - créances importantes : palier doux jusqu'à 5 000 000 (FCFA)
  const creanceFactor = clamp01(creances / 5_000_000) * 0.25;

  // Facteurs atténuants
  // - taux de ponctualité = paiements honorés vs paiements + retards
  const totalEvents = paiements + retards;
  const ponctualite = totalEvents > 0 ? paiements / totalEvents : 0.5;
  const punctualityRelief = ponctualite * 0.3;
  // - ancienneté : relation établie = moins de risque (saturé à 5 ans)
  const seniorityRelief = clamp01(anciennete / 5) * 0.15;

  // Base neutre 0.4, ajustée par les facteurs.
  const probability = clamp01(
    0.4 + retardFactor + creanceFactor - punctualityRelief - seniorityRelief
  );

  return {
    risk_probability: Math.round(probability * 1000) / 1000,
    risk_category: toRiskCategory(probability),
  };
}

/**
 * Détecte des anomalies simples sur les écritures des `days` derniers jours :
 * pièces déséquilibrées (débit ≠ crédit) et montants aberrants (au-delà de
 * moyenne + 3·écart-type). Détection statistique basique, pas de ML.
 */
async function getRecentAnomalies(days: number): Promise<Anomaly[]> {
  const window = Math.max(1, Math.floor(days) || 0);

  let entries: DBJournalEntry[];
  try {
    entries = await db.journalEntries.toArray();
  } catch {
    return [];
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - window);

  const recent = entries.filter((e) => {
    const d = new Date(e.date);
    return !Number.isNaN(d.getTime()) && d >= cutoff;
  });

  if (recent.length === 0) return [];

  const anomalies: Anomaly[] = [];

  // 1. Pièces déséquilibrées → CRITIQUE
  for (const e of recent) {
    const debit = Number(e.totalDebit) || 0;
    const credit = Number(e.totalCredit) || 0;
    const ecart = Math.abs(debit - credit);
    if (ecart > 0.005) {
      const base = Math.max(debit, credit, 1);
      anomalies.push({
        severite: 'CRITIQUE',
        titre: `Écriture ${e.entryNumber || e.id} déséquilibrée (écart ${ecart.toFixed(2)})`,
        score: clamp01(0.7 + (ecart / base) * 0.3),
      });
    }
  }

  // 2. Montants aberrants (outliers statistiques) → ELEVE / MOYEN
  const amounts = recent.map((e) => Math.max(Number(e.totalDebit) || 0, Number(e.totalCredit) || 0));
  const n = amounts.length;
  if (n >= 4) {
    const mean = amounts.reduce((s, a) => s + a, 0) / n;
    const variance = amounts.reduce((s, a) => s + (a - mean) ** 2, 0) / n;
    const std = Math.sqrt(variance);
    if (std > 0) {
      recent.forEach((e, i) => {
        const amount = amounts[i];
        const z = (amount - mean) / std;
        if (z >= 3) {
          anomalies.push({
            severite: 'ELEVE',
            titre: `Montant inhabituel sur ${e.entryNumber || e.id} (${amount.toFixed(0)})`,
            score: clamp01(0.5 + (z - 3) * 0.1),
          });
        } else if (z >= 2) {
          anomalies.push({
            severite: 'MOYEN',
            titre: `Montant élevé sur ${e.entryNumber || e.id} (${amount.toFixed(0)})`,
            score: clamp01(0.3 + (z - 2) * 0.1),
          });
        }
      });
    }
  }

  // Trie par score décroissant.
  return anomalies.sort((a, b) => b.score - a.score);
}

/**
 * Tableau de bord ML — aucun modèle réel n'étant entraîné, renvoie un état neutre
 * (zéro modèle) de forme valide pour l'affichage.
 */
async function getDashboard(): Promise<MLDashboard> {
  return {
    summary: {
      active_models: 0,
      total_models: 0,
      ready_models: 0,
      training_models: 0,
      needs_retraining: 0,
    },
    models_by_type: {},
    recent_trainings: [],
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

const mlService = {
  getAccountRecommendations,
  getTreasuryForecast,
  analyzeClientRisk,
  getRecentAnomalies,
  getDashboard,
};

export default mlService;
export {
  getAccountRecommendations,
  getTreasuryForecast,
  analyzeClientRisk,
  getRecentAnomalies,
  getDashboard,
};
