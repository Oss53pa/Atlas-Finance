/**
 * Configuration du tableau de bord par type d'activité
 *
 * Adapte les KPIs, métriques et sections affichés selon que l'entreprise
 * est une activité de production, de négoce (vente de produits) ou de services.
 *
 * Référentiel SYSCOHADA :
 *  - Production : comptes 60-61 (matières), 71 (production stockée), 72 (production immobilisée)
 *  - Négoce     : compte 601 (achats marchandises) vs 701 (ventes marchandises)
 *  - Services   : compte 706 (prestations de services), charges de personnel (66)
 */

import type { ActivityType } from '../services/company.service';
import {
  Factory, Package, ShoppingCart, Truck, Layers, Gauge, Clock,
  Users, Briefcase, BarChart3, TrendingUp, DollarSign, Target,
  Percent, Box, Wrench, UserCheck, FileText, Activity
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface ActivityKPI {
  id: string;
  label: string;
  /** Description courte affichée sous la valeur */
  description: string;
  icon: React.FC<{ className?: string }>;
  /** Codes comptes SYSCOHADA utilisés pour le calcul */
  accountPrefixes: { debit?: string[]; credit?: string[] };
  /** Formule de calcul : 'sum' | 'ratio' | 'difference' | 'custom' */
  calcType: 'sum' | 'ratio' | 'difference' | 'days' | 'count' | 'custom';
  /** Pour les ratios : numérateur et dénominateur */
  ratioConfig?: {
    numeratorPrefixes: string[];
    denominatorPrefixes: string[];
    numeratorSide: 'debit' | 'credit';
    denominatorSide: 'debit' | 'credit';
    asPercentage?: boolean;
  };
  /** Format d'affichage */
  format: 'currency' | 'percentage' | 'number' | 'days';
  /** Couleur conditionnelle */
  colorCondition?: 'higher-is-better' | 'lower-is-better';
}

export interface ActivityDashboardSection {
  id: string;
  title: string;
  icon: React.FC<{ className?: string }>;
  kpis: string[]; // IDs des KPIs à afficher dans cette section
}

export interface ActivityDashboardConfig {
  type: ActivityType;
  label: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  /** KPIs principaux (affichés en haut en cartes) */
  primaryKPIs: ActivityKPI[];
  /** KPIs secondaires (affichés dans les sections détaillées) */
  secondaryKPIs: ActivityKPI[];
  /** Sections du tableau de bord */
  sections: ActivityDashboardSection[];
  /** Libellés adaptés pour les graphiques */
  chartLabels: {
    revenueLabel: string;
    costLabel: string;
    marginLabel: string;
    activityVolumeLabel: string;
  };
}

// ============================================================================
// KPIS COMMUNS (partagés entre tous les types)
// ============================================================================

const commonKPIs: Record<string, ActivityKPI> = {
  chiffreAffaires: {
    id: 'chiffre_affaires',
    label: 'Chiffre d\'Affaires',
    description: 'Total des ventes (classe 70)',
    icon: DollarSign,
    accountPrefixes: { credit: ['70'] },
    calcType: 'sum',
    format: 'currency',
    colorCondition: 'higher-is-better',
  },
  tresorerie: {
    id: 'tresorerie',
    label: 'Trésorerie',
    description: 'Position de trésorerie (classe 5)',
    icon: DollarSign,
    accountPrefixes: { debit: ['5'] },
    calcType: 'sum',
    format: 'currency',
    colorCondition: 'higher-is-better',
  },
  chargesPersonnel: {
    id: 'charges_personnel',
    label: 'Charges de Personnel',
    description: 'Salaires et charges sociales (66)',
    icon: Users,
    accountPrefixes: { debit: ['66'] },
    calcType: 'sum',
    format: 'currency',
    colorCondition: 'lower-is-better',
  },
  resultatNet: {
    id: 'resultat_net',
    label: 'Résultat Net',
    description: 'Produits - Charges (classe 7 - classe 6)',
    icon: TrendingUp,
    accountPrefixes: { credit: ['7'], debit: ['6'] },
    calcType: 'difference',
    format: 'currency',
    colorCondition: 'higher-is-better',
  },
  margeNette: {
    id: 'marge_nette',
    label: 'Marge Nette',
    description: 'Résultat net / CA',
    icon: Percent,
    accountPrefixes: {},
    calcType: 'ratio',
    ratioConfig: {
      numeratorPrefixes: ['7', '6'], // résultat = 7 - 6
      denominatorPrefixes: ['70'],
      numeratorSide: 'credit',
      denominatorSide: 'credit',
      asPercentage: true,
    },
    format: 'percentage',
    colorCondition: 'higher-is-better',
  },
  chargesExploitation: {
    id: 'charges_exploitation',
    label: 'Charges d\'Exploitation',
    description: 'Total des charges (classe 6)',
    icon: Activity,
    accountPrefixes: { debit: ['6'] },
    calcType: 'sum',
    format: 'currency',
    colorCondition: 'lower-is-better',
  },
};

// ============================================================================
// PRODUCTION
// ============================================================================

const productionKPIs: ActivityKPI[] = [
  {
    id: 'cout_production',
    label: 'Coût de Production',
    description: 'Matières premières + main d\'oeuvre directe (60+61+62)',
    icon: Factory,
    accountPrefixes: { debit: ['60', '61', '62'] },
    calcType: 'sum',
    format: 'currency',
    colorCondition: 'lower-is-better',
  },
  {
    id: 'production_stockee',
    label: 'Production Stockée',
    description: 'Variation de stock de produits finis (71)',
    icon: Package,
    accountPrefixes: { credit: ['71'] },
    calcType: 'sum',
    format: 'currency',
  },
  {
    id: 'production_immobilisee',
    label: 'Production Immobilisée',
    description: 'Production pour soi-même (72)',
    icon: Wrench,
    accountPrefixes: { credit: ['72'] },
    calcType: 'sum',
    format: 'currency',
  },
  {
    id: 'marge_production',
    label: 'Marge sur Production',
    description: 'CA - Coût de production',
    icon: TrendingUp,
    accountPrefixes: {},
    calcType: 'ratio',
    ratioConfig: {
      numeratorPrefixes: ['70', '71', '72', '60', '61', '62'],
      denominatorPrefixes: ['70', '71', '72'],
      numeratorSide: 'credit',
      denominatorSide: 'credit',
      asPercentage: true,
    },
    format: 'percentage',
    colorCondition: 'higher-is-better',
  },
  {
    id: 'consommation_matieres',
    label: 'Consommation Matières',
    description: 'Achats matières et fournitures (60)',
    icon: Layers,
    accountPrefixes: { debit: ['60'] },
    calcType: 'sum',
    format: 'currency',
    colorCondition: 'lower-is-better',
  },
  {
    id: 'ratio_matieres_ca',
    label: 'Ratio Matières / CA',
    description: 'Part des matières dans le CA',
    icon: Gauge,
    accountPrefixes: {},
    calcType: 'ratio',
    ratioConfig: {
      numeratorPrefixes: ['60'],
      denominatorPrefixes: ['70'],
      numeratorSide: 'debit',
      denominatorSide: 'credit',
      asPercentage: true,
    },
    format: 'percentage',
    colorCondition: 'lower-is-better',
  },
];

const productionConfig: ActivityDashboardConfig = {
  type: 'production',
  label: 'Production',
  description: 'Entreprise industrielle / de transformation',
  icon: Factory,
  primaryKPIs: [
    commonKPIs.chiffreAffaires,
    productionKPIs[0], // Coût de production
    productionKPIs[3], // Marge sur production
    commonKPIs.tresorerie,
  ],
  secondaryKPIs: [
    productionKPIs[1], // Production stockée
    productionKPIs[2], // Production immobilisée
    productionKPIs[4], // Consommation matières
    productionKPIs[5], // Ratio matières/CA
    commonKPIs.chargesPersonnel,
    commonKPIs.resultatNet,
    commonKPIs.margeNette,
    commonKPIs.chargesExploitation,
  ],
  sections: [
    {
      id: 'production_performance',
      title: 'Performance Industrielle',
      icon: Factory,
      kpis: ['cout_production', 'consommation_matieres', 'ratio_matieres_ca', 'production_stockee', 'production_immobilisee'],
    },
    {
      id: 'rentabilite',
      title: 'Rentabilité',
      icon: TrendingUp,
      kpis: ['marge_production', 'marge_nette', 'resultat_net', 'charges_exploitation'],
    },
    {
      id: 'rh',
      title: 'Ressources Humaines',
      icon: Users,
      kpis: ['charges_personnel'],
    },
  ],
  chartLabels: {
    revenueLabel: 'Production vendue',
    costLabel: 'Coût de production',
    marginLabel: 'Marge industrielle',
    activityVolumeLabel: 'Volume de production',
  },
};

// ============================================================================
// NÉGOCE (Vente de produits)
// ============================================================================

const negoceKPIs: ActivityKPI[] = [
  {
    id: 'achats_marchandises',
    label: 'Achats de Marchandises',
    description: 'Achats de marchandises revendues (601)',
    icon: ShoppingCart,
    accountPrefixes: { debit: ['601'] },
    calcType: 'sum',
    format: 'currency',
    colorCondition: 'lower-is-better',
  },
  {
    id: 'marge_commerciale',
    label: 'Marge Commerciale',
    description: 'Ventes marchandises - Achats marchandises (701-601)',
    icon: TrendingUp,
    accountPrefixes: { credit: ['701'], debit: ['601'] },
    calcType: 'difference',
    format: 'currency',
    colorCondition: 'higher-is-better',
  },
  {
    id: 'taux_marge_commerciale',
    label: 'Taux de Marge Commerciale',
    description: '(Ventes - Achats) / Ventes',
    icon: Percent,
    accountPrefixes: {},
    calcType: 'ratio',
    ratioConfig: {
      numeratorPrefixes: ['701', '601'],
      denominatorPrefixes: ['701'],
      numeratorSide: 'credit',
      denominatorSide: 'credit',
      asPercentage: true,
    },
    format: 'percentage',
    colorCondition: 'higher-is-better',
  },
  {
    id: 'stock_marchandises',
    label: 'Stock de Marchandises',
    description: 'Valeur du stock (31)',
    icon: Box,
    accountPrefixes: { debit: ['31'] },
    calcType: 'sum',
    format: 'currency',
  },
  {
    id: 'variation_stock',
    label: 'Variation de Stock',
    description: 'Variation des stocks de marchandises (603)',
    icon: Truck,
    accountPrefixes: { debit: ['603'] },
    calcType: 'sum',
    format: 'currency',
  },
  {
    id: 'charges_commerciales',
    label: 'Charges Commerciales',
    description: 'Transport, publicité, commissions (61+62)',
    icon: Briefcase,
    accountPrefixes: { debit: ['61', '62'] },
    calcType: 'sum',
    format: 'currency',
    colorCondition: 'lower-is-better',
  },
];

const negoceConfig: ActivityDashboardConfig = {
  type: 'negoce',
  label: 'Négoce',
  description: 'Commerce / Vente de produits',
  icon: ShoppingCart,
  primaryKPIs: [
    commonKPIs.chiffreAffaires,
    negoceKPIs[1], // Marge commerciale
    negoceKPIs[2], // Taux de marge commerciale
    commonKPIs.tresorerie,
  ],
  secondaryKPIs: [
    negoceKPIs[0], // Achats marchandises
    negoceKPIs[3], // Stock marchandises
    negoceKPIs[4], // Variation stock
    negoceKPIs[5], // Charges commerciales
    commonKPIs.chargesPersonnel,
    commonKPIs.resultatNet,
    commonKPIs.margeNette,
    commonKPIs.chargesExploitation,
  ],
  sections: [
    {
      id: 'activite_commerciale',
      title: 'Activité Commerciale',
      icon: ShoppingCart,
      kpis: ['achats_marchandises', 'marge_commerciale', 'taux_marge_commerciale', 'charges_commerciales'],
    },
    {
      id: 'gestion_stocks',
      title: 'Gestion des Stocks',
      icon: Box,
      kpis: ['stock_marchandises', 'variation_stock'],
    },
    {
      id: 'rentabilite',
      title: 'Rentabilité',
      icon: TrendingUp,
      kpis: ['marge_nette', 'resultat_net', 'charges_exploitation'],
    },
  ],
  chartLabels: {
    revenueLabel: 'Ventes de marchandises',
    costLabel: 'Achats de marchandises',
    marginLabel: 'Marge commerciale',
    activityVolumeLabel: 'Volume de ventes',
  },
};

// ============================================================================
// SERVICES
// ============================================================================

const servicesKPIs: ActivityKPI[] = [
  {
    id: 'ca_prestations',
    label: 'CA Prestations',
    description: 'Chiffre d\'affaires services (706)',
    icon: Briefcase,
    accountPrefixes: { credit: ['706'] },
    calcType: 'sum',
    format: 'currency',
    colorCondition: 'higher-is-better',
  },
  {
    id: 'marge_prestations',
    label: 'Marge sur Prestations',
    description: 'CA services - Charges directes',
    icon: TrendingUp,
    accountPrefixes: { credit: ['706'], debit: ['60', '61', '62'] },
    calcType: 'difference',
    format: 'currency',
    colorCondition: 'higher-is-better',
  },
  {
    id: 'ratio_personnel_ca',
    label: 'Charges Personnel / CA',
    description: 'Part des salaires dans le CA',
    icon: Users,
    accountPrefixes: {},
    calcType: 'ratio',
    ratioConfig: {
      numeratorPrefixes: ['66'],
      denominatorPrefixes: ['70'],
      numeratorSide: 'debit',
      denominatorSide: 'credit',
      asPercentage: true,
    },
    format: 'percentage',
    colorCondition: 'lower-is-better',
  },
  {
    id: 'sous_traitance',
    label: 'Sous-traitance',
    description: 'Charges de sous-traitance (611)',
    icon: UserCheck,
    accountPrefixes: { debit: ['611'] },
    calcType: 'sum',
    format: 'currency',
    colorCondition: 'lower-is-better',
  },
  {
    id: 'honoraires',
    label: 'Honoraires & Prestations ext.',
    description: 'Honoraires et prestations externes (622)',
    icon: FileText,
    accountPrefixes: { debit: ['622'] },
    calcType: 'sum',
    format: 'currency',
    colorCondition: 'lower-is-better',
  },
  {
    id: 'valeur_ajoutee',
    label: 'Valeur Ajoutée',
    description: 'CA - Consommations intermédiaires',
    icon: Target,
    accountPrefixes: { credit: ['70', '71', '72'], debit: ['60', '61', '62'] },
    calcType: 'difference',
    format: 'currency',
    colorCondition: 'higher-is-better',
  },
];

const servicesConfig: ActivityDashboardConfig = {
  type: 'services',
  label: 'Services',
  description: 'Prestation de services / Conseil',
  icon: Briefcase,
  primaryKPIs: [
    servicesKPIs[0], // CA prestations
    servicesKPIs[1], // Marge prestations
    servicesKPIs[2], // Ratio personnel/CA
    commonKPIs.tresorerie,
  ],
  secondaryKPIs: [
    servicesKPIs[3], // Sous-traitance
    servicesKPIs[4], // Honoraires
    servicesKPIs[5], // Valeur ajoutée
    commonKPIs.chargesPersonnel,
    commonKPIs.resultatNet,
    commonKPIs.margeNette,
    commonKPIs.chargesExploitation,
  ],
  sections: [
    {
      id: 'activite_services',
      title: 'Activité de Services',
      icon: Briefcase,
      kpis: ['ca_prestations', 'marge_prestations', 'ratio_personnel_ca'],
    },
    {
      id: 'structure_couts',
      title: 'Structure des Coûts',
      icon: BarChart3,
      kpis: ['charges_personnel', 'sous_traitance', 'honoraires', 'valeur_ajoutee'],
    },
    {
      id: 'rentabilite',
      title: 'Rentabilité',
      icon: TrendingUp,
      kpis: ['marge_nette', 'resultat_net', 'charges_exploitation'],
    },
  ],
  chartLabels: {
    revenueLabel: 'Prestations facturées',
    costLabel: 'Coûts directs',
    marginLabel: 'Marge sur prestations',
    activityVolumeLabel: 'Volume de prestations',
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export const activityDashboardConfigs: Record<ActivityType, ActivityDashboardConfig> = {
  production: productionConfig,
  negoce: negoceConfig,
  services: servicesConfig,
};

/**
 * Retourne la configuration dashboard pour un type d'activité donné.
 */
export function getActivityDashboardConfig(type: ActivityType): ActivityDashboardConfig {
  return activityDashboardConfigs[type];
}

/**
 * Retourne tous les KPIs (primaires + secondaires) pour un type d'activité.
 */
export function getAllKPIsForActivity(type: ActivityType): ActivityKPI[] {
  const config = activityDashboardConfigs[type];
  return [...config.primaryKPIs, ...config.secondaryKPIs];
}
