// @ts-nocheck
/**
 * ProphetGating — Contrôle d'accès aux outils PROPH3T par plan (PME/TPE vs Premium)
 *
 * Outils PME : essentiels pour une comptabilité de base
 * Outils Premium : consolidation, analytique, multi-devises, ML avancé, etc.
 */

export type PlanTier = 'pme' | 'premium';

/** Outils accessibles à TOUS les plans (PME/TPE + Premium) */
const PME_TOOLS: readonly string[] = [
  // Calculs fiscaux de base
  'calculer_is',
  'calculer_tva',
  'calculer_irpp',
  'calculer_bulletin_paie',
  'calculer_retenue',
  'calculer_SIG',
  'generer_ecriture',

  // Consultation comptable
  'consulter_balance',
  'consulter_grand_livre',
  'verifier_equilibre',

  // Clôture basique
  'assister_cloture',
  'generer_regularisations',
  'generer_affectation_resultat',

  // Amortissements standard
  'calculer_amortissement',

  // Trésorerie basique
  'consulter_tresorerie',
  'analyser_creances',

  // Fiscal basique
  'calendrier_fiscal',
  'generer_liasse',
  'get_fiscal_dashboard',
  'get_tax_history',

  // Prédictions basiques
  'prevoir_tresorerie',
  'detecter_anomalies',

  // ─── Nouveaux outils v3.0 accessibles à tous ───
  'generer_etats_financiers',      // essentiel pour tous — bilan, CR, TAFIRE
  'calculer_provisions_auto',      // essentiel pour clôture
  'appliquer_regles_brex',         // sécurité comptable de base
  'extraire_facture_pdf',          // gain de temps saisie
  'analyser_benford',              // détection fraude basique
] as const;

/** Outils EXCLUSIVEMENT Premium (en plus de tous les outils PME) */
const PREMIUM_ONLY_TOOLS: readonly string[] = [
  // Consolidation groupe
  'consolider_comptes',

  // Comptabilité analytique
  'creer_centre_cout',
  'imputer_analytique',
  'rapport_analytique',

  // Multi-devises
  'convertir_devise',
  'reevaluer_postes_bilan',
  'ecart_conversion_consolidation',

  // Audit avancé
  'audit_complet',
  'audit_cycle',
  'verifier_lettrage',
  'calculer_altman_zscore',

  // Trésorerie avancée
  'reconcilier_banque_auto',
  'analyser_budget',
  'scorer_credit_client',

  // Fiscal avancé
  'simuler_impact_fiscal',

  // Immobilisations avancées
  'simuler_immobilisations',
  'traiter_credit_bail',
  'enregistrer_cession_immo',

  // ML avancé
  'detecter_anomalies_isolation_forest',
  'segmenter_clients',
] as const;

/** Tous les outils Premium = PME + Premium-only */
const ALL_PREMIUM_TOOLS: readonly string[] = [...PME_TOOLS, ...PREMIUM_ONLY_TOOLS];

/**
 * Vérifie si un outil est accessible pour un plan donné.
 */
export function isToolAllowed(toolName: string, plan: PlanTier): boolean {
  if (plan === 'premium') {
    return ALL_PREMIUM_TOOLS.includes(toolName) || PME_TOOLS.includes(toolName);
  }
  return PME_TOOLS.includes(toolName);
}

/**
 * Filtre la liste des tools schemas pour ne garder que ceux du plan.
 */
export function filterToolsByPlan<T extends { function: { name: string } }>(
  tools: T[],
  plan: PlanTier
): T[] {
  return tools.filter(t => isToolAllowed(t.function.name, plan));
}

/**
 * Retourne la liste des noms d'outils pour un plan.
 */
export function getToolNamesForPlan(plan: PlanTier): string[] {
  if (plan === 'premium') return [...ALL_PREMIUM_TOOLS];
  return [...PME_TOOLS];
}

/**
 * Retourne les outils bloqués pour un plan (pour afficher "Passez Premium").
 */
export function getBlockedTools(plan: PlanTier): string[] {
  if (plan === 'premium') return [];
  return [...PREMIUM_ONLY_TOOLS];
}

/**
 * Stats résumées
 */
export function getToolStats() {
  return {
    total: PME_TOOLS.length + PREMIUM_ONLY_TOOLS.length,
    pme: PME_TOOLS.length,
    premium_only: PREMIUM_ONLY_TOOLS.length,
    premium_total: PME_TOOLS.length + PREMIUM_ONLY_TOOLS.length,
  };
}
