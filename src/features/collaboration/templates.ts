/**
 * Templates d'espaces (CDC §3.1.11, §12.2) — pré-chargent problème/objectif,
 * type d'ancrage, critères de sortie types et actions types. Le compte GL et le
 * libellé d'ancrage restent à saisir (spécifiques à l'instance).
 */
import type { AnchorType } from './types';

export interface SpaceTemplate {
  id: string;
  label: string;
  icon: string;            // emoji léger pour la puce
  anchorType: AnchorType;
  problem: string;
  objective: string;
  manualCriterion?: string;
  actions: string[];
}

export const SPACE_TEMPLATES: SpaceTemplate[] = [
  {
    id: 'reconciliation',
    label: 'Écart de rapprochement',
    icon: '🏦',
    anchorType: 'reconciliation',
    problem: 'Écarts non justifiés constatés au rapprochement du compte bancaire sur la période.',
    objective: 'Ramener l\'écart à zéro, justifié pièce par pièce.',
    manualCriterion: 'Avis de crédit / relevés rapprochés',
    actions: ['Analyse ligne à ligne', 'Demander les avis de crédit manquants', 'Lettrer les suspens identifiés'],
  },
  {
    id: 'recovery',
    label: 'Recouvrement créance',
    icon: '📩',
    anchorType: 'partner',
    problem: 'Créance échue à recouvrer sur le tiers.',
    objective: 'Encaisser la créance ou décider une provision / un passage en perte.',
    manualCriterion: 'Encours soldé ou provisionné',
    actions: ['Relance du client', 'Proposer un plan d\'apurement', 'Décision provision / perte'],
  },
  {
    id: 'closing',
    label: 'Clôture de période',
    icon: '🔒',
    anchorType: 'closing_period',
    problem: 'Anomalies bloquant la clôture de la période.',
    objective: 'Lever les points bloquants et clôturer la période.',
    manualCriterion: 'Liasse validée par la DAF',
    actions: ['Passer les régularisations', 'Valider les provisions', 'Contrôles de cohérence finaux'],
  },
  {
    id: 'budget',
    label: 'Dépassement budgétaire',
    icon: '📊',
    anchorType: 'budget_line',
    problem: 'Dépassement constaté sur une ligne budgétaire.',
    objective: 'Instruire le dépassement et arbitrer (réallocation ou avenant).',
    manualCriterion: 'Arbitrage validé',
    actions: ['Analyser l\'origine du dépassement', 'Chiffrer l\'impact', 'Décision de réallocation'],
  },
];
