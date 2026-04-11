/**
 * Atlas F&A — Plan Configuration
 * Two tiers: PME/TPE (starter) and Premium (pro)
 */

export type PlanTier = 'pme' | 'premium';

export interface PlanDefinition {
  code: PlanTier;
  name: string;
  tagline: string;
  popular?: boolean;
  pricing: {
    monthly_xof: number;
    monthly_eur: number;
    extra_user_xof?: number;
  };
  seats: {
    included: number;
    unlimited: boolean;
  };
  features: PlanFeatureCategory[];
}

export interface PlanFeatureCategory {
  category: string;
  items: PlanFeatureItem[];
}

export interface PlanFeatureItem {
  label: string;
  featureKey: string;
  pme: boolean;
  premium: boolean;
}

// Feature keys used for gating
export const PREMIUM_FEATURES = [
  'reevaluation_immobilisations',
  'approche_composants',
  'effets_commerce',
  'proph3t_avance',
  'multi_societes',
  'multi_sites',
  'multi_pays_ohada',
  'operations_devises',
  'ecarts_conversion',
  'utilisateurs_illimites',
  'workflow_validation_rbac',
  'audit_trail_complet',
  'api_rest',
  'support_prioritaire',
  'formation_incluse',
  'sla_995',
  // Gating aliases / new premium features
  'budget_analytique',
  'recouvrement_balance_agee',
  'proph3t_ia', // alias for proph3t_avance
  'consolidation_groupe',
  'audit_trail_ohada_certifie', // alias for audit_trail_complet
  'tableaux_bord_groupe',
  'api_integrations', // alias for api_rest
  'support_dedie', // alias for support_prioritaire
] as const;

export type PremiumFeatureKey = (typeof PREMIUM_FEATURES)[number];

export function isPremiumFeature(key: string): boolean {
  return PREMIUM_FEATURES.includes(key as PremiumFeatureKey);
}

// Full feature matrix
export const FEATURE_MATRIX: PlanFeatureCategory[] = [
  {
    category: 'Comptabilité générale',
    items: [
      { label: 'Saisie des écritures & journaux', featureKey: 'ecritures_journaux', pme: true, premium: true },
      { label: 'Grand livre & balance générale', featureKey: 'grand_livre_balance', pme: true, premium: true },
      { label: 'Lettrage automatique (4 algorithmes)', featureKey: 'lettrage_auto', pme: true, premium: true },
      { label: 'Rapprochement bancaire (CSV, scoring)', featureKey: 'rapprochement_bancaire', pme: true, premium: true },
    ],
  },
  {
    category: 'Gestion des actifs & stocks',
    items: [
      { label: 'Immobilisations & amortissements (linéaire, dégressif)', featureKey: 'immobilisations', pme: true, premium: true },
      { label: 'Stocks (CUMP / FIFO)', featureKey: 'stocks', pme: true, premium: true },
      { label: 'Réévaluation des immobilisations', featureKey: 'reevaluation_immobilisations', pme: false, premium: true },
      { label: 'Approche par composants (bâtiment)', featureKey: 'approche_composants', pme: false, premium: true },
    ],
  },
  {
    category: 'Budget, trésorerie & recouvrement',
    items: [
      { label: 'Budget & comptabilité analytique', featureKey: 'budget_analytique', pme: false, premium: true },
      { label: 'Position de trésorerie', featureKey: 'position_tresorerie', pme: true, premium: true },
      { label: 'Recouvrement & balance âgée', featureKey: 'recouvrement', pme: true, premium: true },
      { label: 'Balance âgée avancée & relances auto', featureKey: 'recouvrement_balance_agee', pme: false, premium: true },
      { label: 'Effets de commerce (LC, BAO)', featureKey: 'effets_commerce', pme: false, premium: true },
    ],
  },
  {
    category: 'Fiscalité & clôture',
    items: [
      { label: 'Fiscalité (TVA, IS, IMF, patente)', featureKey: 'fiscalite', pme: true, premium: true },
      { label: 'Clôture (CCA, PCA, FNP, FAE, résultat)', featureKey: 'cloture', pme: true, premium: true },
      { label: 'Affectation du résultat N-1', featureKey: 'affectation_resultat', pme: true, premium: true },
      { label: 'Reports à nouveau automatiques', featureKey: 'reports_nouveau', pme: true, premium: true },
    ],
  },
  {
    category: 'États financiers SYSCOHADA',
    items: [
      { label: 'Bilan, Compte de résultat, SIG', featureKey: 'etats_financiers', pme: true, premium: true },
      { label: 'TAFIRE & ratios financiers', featureKey: 'tafire_ratios', pme: true, premium: true },
      { label: 'Export Excel & PDF', featureKey: 'export_excel_pdf', pme: true, premium: true },
      { label: 'Tableaux de bord Groupe (vue consolidée)', featureKey: 'tableaux_bord_groupe', pme: false, premium: true },
    ],
  },
  {
    category: 'Intelligence artificielle',
    items: [
      { label: 'PROPH3T IA (contrôles & corrections)', featureKey: 'proph3t_base', pme: true, premium: true },
      { label: 'PROPH3T IA avancé (LLM + prédictif)', featureKey: 'proph3t_avance', pme: false, premium: true },
    ],
  },
  {
    category: 'Multi-sociétés & international',
    items: [
      { label: '1 société / 1 dossier', featureKey: 'mono_societe', pme: true, premium: true },
      { label: 'Multi-sociétés illimité', featureKey: 'multi_societes', pme: false, premium: true },
      { label: 'Consolidation de groupe', featureKey: 'consolidation_groupe', pme: false, premium: true },
      { label: 'Multi-sites', featureKey: 'multi_sites', pme: false, premium: true },
      { label: 'Multi-pays OHADA (17 pays, taux fiscaux)', featureKey: 'multi_pays_ohada', pme: false, premium: true },
      { label: 'Opérations en devises (EUR/XOF)', featureKey: 'operations_devises', pme: false, premium: true },
      { label: 'Écarts de conversion (476/477)', featureKey: 'ecarts_conversion', pme: false, premium: true },
    ],
  },
  {
    category: 'Infrastructure & sécurité',
    items: [
      { label: 'Cloud sécurisé & backup quotidien', featureKey: 'cloud_backup', pme: true, premium: true },
      { label: '1 à 5 utilisateurs', featureKey: 'users_5', pme: true, premium: true },
      { label: 'Utilisateurs illimités', featureKey: 'utilisateurs_illimites', pme: false, premium: true },
      { label: 'Workflow de validation & rôles (RBAC)', featureKey: 'workflow_validation_rbac', pme: false, premium: true },
      { label: 'Audit trail complet (conformité OHADA)', featureKey: 'audit_trail_complet', pme: false, premium: true },
      { label: 'API REST & intégrations', featureKey: 'api_rest', pme: false, premium: true },
    ],
  },
  {
    category: 'Support',
    items: [
      { label: 'Support email', featureKey: 'support_email', pme: true, premium: true },
      { label: 'Support prioritaire & account manager', featureKey: 'support_prioritaire', pme: false, premium: true },
      { label: 'Formation incluse (2 sessions/an)', featureKey: 'formation_incluse', pme: false, premium: true },
      { label: 'SLA 99.5%', featureKey: 'sla_995', pme: false, premium: true },
    ],
  },
];

// Plan definitions
export const PLANS: Record<PlanTier, PlanDefinition> = {
  pme: {
    code: 'pme',
    name: 'PME / TPE',
    tagline: 'Tous les modules comptables de base pour une société',
    pricing: {
      monthly_xof: 49000,
      monthly_eur: 75,
      extra_user_xof: 9000,
    },
    seats: {
      included: 5,
      unlimited: false,
    },
    features: FEATURE_MATRIX,
  },
  premium: {
    code: 'premium',
    name: 'Premium',
    tagline: 'Multi-sociétés, multi-pays, devises, IA avancée, RBAC, audit trail, API, support dédié',
    popular: true,
    pricing: {
      monthly_xof: 250000,
      monthly_eur: 380,
    },
    seats: {
      included: 999,
      unlimited: true,
    },
    features: FEATURE_MATRIX,
  },
};

/**
 * Check if a feature is available for a given plan tier.
 */
export function isFeatureAvailable(featureKey: string, planTier: PlanTier): boolean {
  for (const category of FEATURE_MATRIX) {
    for (const item of category.items) {
      if (item.featureKey === featureKey) {
        return planTier === 'premium' ? item.premium : item.pme;
      }
    }
  }
  // Unknown feature → allowed by default
  return true;
}

/**
 * Get list of features not available in PME but available in Premium.
 */
export function getPremiumOnlyFeatures(): PlanFeatureItem[] {
  const result: PlanFeatureItem[] = [];
  for (const category of FEATURE_MATRIX) {
    for (const item of category.items) {
      if (!item.pme && item.premium) {
        result.push(item);
      }
    }
  }
  return result;
}
