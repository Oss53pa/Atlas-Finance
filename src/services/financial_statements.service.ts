/**
 * Service Financial Statements WiseBook
 * Génération automatique des états financiers SYSCOHADA
 *
 * Fonctionnalités:
 * - Bilan comptable (actif/passif)
 * - Compte de résultat
 * - Soldes intermédiaires de gestion (SIG)
 * - Ratios financiers automatiques
 * - Tableau des flux de trésorerie (TAFIRE)
 * - Analyse de santé financière
 * - Export Excel et PDF professionnels
 * - Conformité SYSCOHADA
 *
 * Architecture: Standard apiService + BASE_PATH
 * Backend: apps/financial_statements/urls.py (2 ViewSets, 15+ endpoints)
 *
 * @module services/financial_statements
 * @version 4.1.0
 * @date 2025-10-19
 */

import { apiService } from './api';

const BASE_PATH = '/api/v1/financial_statements';

// ============================================================================
// INTERFACES TYPESCRIPT
// ============================================================================

/**
 * Bilan comptable SYSCOHADA
 */
export interface BilanComptable {
  exercice: string;
  date_cloture: string;
  devise: string;

  // ACTIF
  actif: {
    // Actif immobilisé
    immobilisations_incorporelles: number;
    immobilisations_corporelles: number;
    immobilisations_financieres: number;
    total_actif_immobilise: number;

    // Actif circulant
    stocks: number;
    creances_clients: number;
    autres_creances: number;
    total_actif_circulant: number;

    // Trésorerie actif
    tresorerie_actif: number;

    // Total actif
    total_actif: number;
  };

  // PASSIF
  passif: {
    // Capitaux propres
    capital_social: number;
    reserves: number;
    report_a_nouveau: number;
    resultat_exercice: number;
    total_capitaux_propres: number;

    // Dettes financières
    emprunts_long_terme: number;
    emprunts_court_terme: number;
    total_dettes_financieres: number;

    // Dettes d'exploitation
    dettes_fournisseurs: number;
    dettes_fiscales_sociales: number;
    autres_dettes: number;
    total_dettes_exploitation: number;

    // Trésorerie passif
    tresorerie_passif: number;

    // Total passif
    total_passif: number;
  };

  // Équilibre
  equilibre: boolean;
  ecart: number;
}

/**
 * Compte de résultat SYSCOHADA
 */
export interface CompteResultat {
  exercice: string;
  periode_debut: string;
  periode_fin: string;
  devise: string;

  // Produits
  produits: {
    // Exploitation
    ventes_marchandises: number;
    ventes_productions: number;
    prestations_services: number;
    production_stockee: number;
    production_immobilisee: number;
    subventions_exploitation: number;
    autres_produits: number;
    total_produits_exploitation: number;

    // Financiers
    produits_financiers: number;
    gains_change: number;
    total_produits_financiers: number;

    // Exceptionnels
    produits_exceptionnels: number;

    // Total produits
    total_produits: number;
  };

  // Charges
  charges: {
    // Exploitation
    achats_marchandises: number;
    variation_stocks: number;
    achats_matieres: number;
    autres_achats: number;
    transports: number;
    services_exterieurs: number;
    impots_taxes: number;
    charges_personnel: number;
    dotations_amortissements: number;
    dotations_provisions: number;
    autres_charges: number;
    total_charges_exploitation: number;

    // Financières
    charges_financieres: number;
    pertes_change: number;
    total_charges_financieres: number;

    // Exceptionnelles
    charges_exceptionnelles: number;

    // Impôt sur bénéfice
    impot_benefice: number;

    // Total charges
    total_charges: number;
  };

  // Résultats
  resultat_exploitation: number;
  resultat_financier: number;
  resultat_courant: number;
  resultat_exceptionnel: number;
  resultat_avant_impot: number;
  resultat_net: number;
}

/**
 * Soldes intermédiaires de gestion (SIG)
 */
export interface SoldesIntermediaires {
  exercice: string;
  devise: string;

  // 9 soldes intermédiaires SYSCOHADA
  marge_commerciale: number;
  valeur_ajoutee: number;
  excedent_brut_exploitation: number;
  resultat_exploitation: number;
  resultat_financier: number;
  resultat_courant: number;
  resultat_exceptionnel: number;
  resultat_avant_impot: number;
  resultat_net: number;

  // Détails calculs
  details: {
    marge_commerciale_calcul: {
      ventes_marchandises: number;
      cout_achat_marchandises: number;
    };
    valeur_ajoutee_calcul: {
      production_exercice: number;
      marge_commerciale: number;
      consommations_intermediaires: number;
    };
    ebe_calcul: {
      valeur_ajoutee: number;
      subventions_exploitation: number;
      charges_personnel: number;
      impots_taxes: number;
    };
  };

  // Ratios calculés
  taux_marge_commerciale: number;
  taux_valeur_ajoutee: number;
  taux_ebe: number;
}

/**
 * Ratios financiers
 */
export interface RatiosFinanciers {
  exercice: string;

  // Ratios de structure
  structure: {
    autonomie_financiere: number; // Capitaux propres / Total passif
    endettement_global: number; // Total dettes / Total passif
    capacite_remboursement: number; // Dettes financières / CAF
    couverture_actif_immobilise: number; // Capitaux permanents / Actif immobilisé
  };

  // Ratios de liquidité
  liquidite: {
    liquidite_generale: number; // Actif circulant / Dettes court terme
    liquidite_reduite: number; // (Créances + Tréso) / Dettes court terme
    liquidite_immediate: number; // Trésorerie / Dettes court terme
  };

  // Ratios de rotation
  rotation: {
    rotation_stocks: number; // (Stock moyen / CA) * 360
    delai_clients: number; // (Créances clients / CA TTC) * 360
    delai_fournisseurs: number; // (Dettes fournisseurs / Achats TTC) * 360
    rotation_actif: number; // CA / Actif total
  };

  // Ratios de rentabilité
  rentabilite: {
    marge_nette: number; // Résultat net / CA
    marge_brute: number; // Marge commerciale / CA
    rentabilite_economique: number; // Résultat exploitation / Actif total
    rentabilite_financiere: number; // Résultat net / Capitaux propres
    taux_marge_ebe: number; // EBE / CA
  };

  // Autres ratios
  autres: {
    productivite_personnel: number; // VA / Effectif
    taux_investissement: number; // Investissements / CA
    poids_frais_financiers: number; // Charges financières / CA
  };
}

/**
 * Tableau des flux de trésorerie (TAFIRE)
 */
export interface TableauFluxTresorerie {
  exercice: string;
  periode_debut: string;
  periode_fin: string;
  devise: string;

  // Flux d'exploitation
  flux_exploitation: {
    capacite_autofinancement: number;
    variation_besoin_fonds_roulement: number;
    flux_net_exploitation: number;

    details_bfr: {
      variation_stocks: number;
      variation_creances_clients: number;
      variation_dettes_fournisseurs: number;
      variation_autres_creances: number;
      variation_autres_dettes: number;
    };
  };

  // Flux d'investissement
  flux_investissement: {
    acquisitions_immobilisations: number;
    cessions_immobilisations: number;
    flux_net_investissement: number;

    details: {
      immobilisations_incorporelles: number;
      immobilisations_corporelles: number;
      immobilisations_financieres: number;
    };
  };

  // Flux de financement
  flux_financement: {
    augmentation_capital: number;
    nouveaux_emprunts: number;
    remboursements_emprunts: number;
    dividendes_verses: number;
    flux_net_financement: number;
  };

  // Variation de trésorerie
  tresorerie_debut: number;
  variation_tresorerie: number;
  tresorerie_fin: number;

  // Vérification
  equilibre: boolean;
  ecart: number;
}

/**
 * États financiers complets
 */
export interface EtatsFinanciersComplets {
  exercice: string;
  societe: string;
  date_generation: string;
  bilan: BilanComptable;
  compte_resultat: CompteResultat;
  soldes_intermediaires: SoldesIntermediaires;
  ratios: RatiosFinanciers;
  flux_tresorerie: TableauFluxTresorerie;
}

/**
 * Analyse de santé financière
 */
export interface SanteFinanciere {
  exercice: string;
  date_analyse: string;

  // Score global (0-100)
  score_global: number;
  appreciation_globale: 'excellent' | 'bon' | 'moyen' | 'faible' | 'critique';

  // Scores par dimension
  scores: {
    structure_financiere: number;
    liquidite: number;
    rentabilite: number;
    activite: number;
  };

  // Points forts
  points_forts: Array<{
    categorie: string;
    description: string;
    impact: 'majeur' | 'important' | 'modere';
  }>;

  // Points faibles
  points_faibles: Array<{
    categorie: string;
    description: string;
    gravite: 'critique' | 'importante' | 'moderee';
    recommandation: string;
  }>;

  // Alertes
  alertes: Array<{
    type: 'liquidite' | 'endettement' | 'rentabilite' | 'conformite';
    severite: 'haute' | 'moyenne' | 'basse';
    message: string;
    action_recommandee: string;
  }>;

  // Tendances
  tendances: {
    evolution_ca: 'croissance' | 'stable' | 'decroissance';
    evolution_resultat: 'amelioration' | 'stable' | 'deterioration';
    evolution_tresorerie: 'amelioration' | 'stable' | 'deterioration';
  };

  // Recommandations prioritaires
  recommandations: string[];
}

/**
 * Dashboard financier
 */
export interface DashboardFinancier {
  exercice: string;
  periode: string;

  // KPIs principaux
  kpis: {
    chiffre_affaires: number;
    resultat_net: number;
    tresorerie: number;
    capitaux_propres: number;
    total_actif: number;
    total_passif: number;
  };

  // Évolutions
  evolutions: {
    ca_variation: number;
    resultat_variation: number;
    tresorerie_variation: number;
  };

  // Indicateurs clés
  indicateurs: {
    marge_nette: number;
    ebe: number;
    capacite_autofinancement: number;
    fonds_roulement: number;
    besoin_fonds_roulement: number;
  };

  // Graphiques données
  graphiques: {
    evolution_ca: Array<{ mois: string; montant: number }>;
    evolution_resultat: Array<{ mois: string; montant: number }>;
    repartition_charges: Array<{ categorie: string; montant: number; pourcentage: number }>;
    repartition_produits: Array<{ categorie: string; montant: number; pourcentage: number }>;
  };
}

/**
 * Comparaison inter-exercices
 */
export interface ComparaisonExercices {
  exercice_courant: string;
  exercice_precedent: string;

  comparaisons: {
    bilan: {
      actif_total: { courant: number; precedent: number; variation: number; variation_pct: number };
      passif_total: { courant: number; precedent: number; variation: number; variation_pct: number };
      capitaux_propres: { courant: number; precedent: number; variation: number; variation_pct: number };
      dettes_totales: { courant: number; precedent: number; variation: number; variation_pct: number };
    };
    resultat: {
      chiffre_affaires: { courant: number; precedent: number; variation: number; variation_pct: number };
      resultat_exploitation: { courant: number; precedent: number; variation: number; variation_pct: number };
      resultat_net: { courant: number; precedent: number; variation: number; variation_pct: number };
    };
    ratios: {
      marge_nette: { courant: number; precedent: number; variation: number };
      rentabilite_financiere: { courant: number; precedent: number; variation: number };
      autonomie_financiere: { courant: number; precedent: number; variation: number };
    };
  };

  analyse: {
    tendance_generale: 'positive' | 'stable' | 'negative';
    commentaires: string[];
  };
}

/**
 * Vérification conformité SYSCOHADA
 */
export interface ConformiteSYSCOHADA {
  exercice: string;
  date_verification: string;
  conforme: boolean;

  verifications: Array<{
    regle: string;
    description: string;
    statut: 'conforme' | 'non_conforme' | 'avertissement';
    details?: string;
  }>;

  non_conformites: Array<{
    regle: string;
    gravite: 'bloquante' | 'majeure' | 'mineure';
    description: string;
    action_corrective: string;
  }>;

  score_conformite: number; // 0-100
}

/**
 * Audit trail
 */
export interface AuditTrail {
  exercice: string;
  date_debut: string;
  date_fin: string;

  evenements: Array<{
    id: string;
    type: 'generation' | 'modification' | 'export' | 'validation';
    date: string;
    utilisateur: string;
    action: string;
    details: Record<string, any>;
  }>;

  statistiques: {
    total_evenements: number;
    par_type: Record<string, number>;
    par_utilisateur: Record<string, number>;
  };
}

/**
 * Performance de génération
 */
export interface PerformanceGeneration {
  derniere_generation: {
    date: string;
    duree_ms: number;
    statut: 'success' | 'error';
    erreurs?: string[];
  };

  statistiques: {
    temps_moyen_generation: number;
    nombre_generations_mois: number;
    taux_succes: number;
  };

  cache: {
    actif: boolean;
    derniere_mise_a_jour: string;
    validite_minutes: number;
  };
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class FinancialStatementsService {

  // ==========================================================================
  // SECTION 1: ÉTATS FINANCIERS PRINCIPAUX
  // ==========================================================================

  /**
   * Génère tous les états financiers complets pour un exercice
   */
  async genererEtatsComplets(params: {
    exercice: string;
    date_cloture?: string;
    inclure_comparatif?: boolean;
  }): Promise<EtatsFinanciersComplets> {
    const response = await apiService.post(`${BASE_PATH}/api/generer-etats-complets/`, params);
    return response.data;
  }

  /**
   * Récupère le bilan comptable SYSCOHADA
   */
  async getBilanComptable(params: {
    exercice: string;
    date?: string;
    format?: 'complet' | 'synthetique';
  }): Promise<BilanComptable> {
    const response = await apiService.get(`${BASE_PATH}/api/bilan-comptable/`, { params });
    return response.data;
  }

  /**
   * Récupère le compte de résultat SYSCOHADA
   */
  async getCompteResultat(params: {
    exercice: string;
    periode_debut?: string;
    periode_fin?: string;
    format?: 'complet' | 'synthetique';
  }): Promise<CompteResultat> {
    const response = await apiService.get(`${BASE_PATH}/api/compte-resultat/`, { params });
    return response.data;
  }

  // ==========================================================================
  // SECTION 2: SOLDES INTERMÉDIAIRES DE GESTION
  // ==========================================================================

  /**
   * Récupère les soldes intermédiaires de gestion (SIG)
   */
  async getSoldesIntermediaires(params: {
    exercice: string;
    periode_debut?: string;
    periode_fin?: string;
  }): Promise<SoldesIntermediaires> {
    const response = await apiService.get(`${BASE_PATH}/api/soldes-intermediaires/`, { params });
    return response.data;
  }

  // ==========================================================================
  // SECTION 3: RATIOS FINANCIERS
  // ==========================================================================

  /**
   * Calcule tous les ratios financiers
   */
  async getRatiosFinanciers(params: {
    exercice: string;
    date?: string;
  }): Promise<RatiosFinanciers> {
    const response = await apiService.get(`${BASE_PATH}/api/ratios-financiers/`, { params });
    return response.data;
  }

  // ==========================================================================
  // SECTION 4: TABLEAU DES FLUX DE TRÉSORERIE
  // ==========================================================================

  /**
   * Récupère le tableau des flux de trésorerie (TAFIRE)
   */
  async getTableauFluxTresorerie(params: {
    exercice: string;
    methode?: 'indirecte' | 'directe';
  }): Promise<TableauFluxTresorerie> {
    const response = await apiService.get(`${BASE_PATH}/api/tableau-flux-tresorerie/`, { params });
    return response.data;
  }

  // ==========================================================================
  // SECTION 5: ANALYSES ET PILOTAGE
  // ==========================================================================

  /**
   * Analyse automatique de la santé financière
   */
  async analyserSanteFinanciere(params: {
    exercice: string;
    profondeur?: 'rapide' | 'standard' | 'approfondie';
  }): Promise<SanteFinanciere> {
    const response = await apiService.post(`${BASE_PATH}/api/analyser-sante-financiere/`, params);
    return response.data;
  }

  /**
   * Récupère le dashboard financier synthétique
   */
  async getDashboardFinancier(params: {
    exercice: string;
    periode?: string;
  }): Promise<DashboardFinancier> {
    const response = await apiService.get(`${BASE_PATH}/api/dashboard-financier/`, { params });
    return response.data;
  }

  /**
   * Compare les exercices
   */
  async comparerExercices(params: {
    exercice_courant: string;
    exercice_precedent: string;
    inclure_analyse?: boolean;
  }): Promise<ComparaisonExercices> {
    const response = await apiService.post(`${BASE_PATH}/api/comparaisons-exercices/`, params);
    return response.data;
  }

  // ==========================================================================
  // SECTION 6: CONFORMITÉ SYSCOHADA
  // ==========================================================================

  /**
   * Vérifie la conformité SYSCOHADA
   */
  async verifierConformite(params: {
    exercice: string;
    regles?: string[];
  }): Promise<ConformiteSYSCOHADA> {
    const response = await apiService.post(`${BASE_PATH}/api/verifier-conformite/`, params);
    return response.data;
  }

  // ==========================================================================
  // SECTION 7: EXPORTS
  // ==========================================================================

  /**
   * Exporte les états financiers en Excel
   */
  async exportExcel(params: {
    exercice: string;
    etats?: ('bilan' | 'resultat' | 'sig' | 'tafire' | 'ratios')[];
    inclure_graphiques?: boolean;
    inclure_comparatif?: boolean;
  }): Promise<Blob> {
    const response = await apiService.post(`${BASE_PATH}/api/export-excel/`, params, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Exporte les états financiers en PDF
   */
  async exportPDF(params: {
    exercice: string;
    etats?: ('bilan' | 'resultat' | 'sig' | 'tafire' | 'ratios')[];
    format?: 'a4' | 'letter';
    inclure_logo?: boolean;
    inclure_signature?: boolean;
  }): Promise<Blob> {
    const response = await apiService.post(`${BASE_PATH}/api/export-pdf/`, params, {
      responseType: 'blob',
    });
    return response.data;
  }

  // ==========================================================================
  // SECTION 8: AUDIT TRAIL
  // ==========================================================================

  /**
   * Récupère la piste d'audit complète
   */
  async getAuditTrail(params: {
    exercice: string;
    date_debut?: string;
    date_fin?: string;
    type?: string;
    utilisateur?: string;
  }): Promise<AuditTrail> {
    const response = await apiService.get(`${BASE_PATH}/api/audit-trail/`, { params });
    return response.data;
  }

  // ==========================================================================
  // SECTION 9: PERFORMANCE
  // ==========================================================================

  /**
   * Récupère les statistiques de performance
   */
  async getPerformanceStats(): Promise<PerformanceGeneration> {
    const response = await apiService.get(`${BASE_PATH}/api/performance-stats/`);
    return response.data;
  }

  // ==========================================================================
  // SECTION 10: MÉTHODES HELPERS
  // ==========================================================================

  /**
   * Formate un montant financier
   */
  formatMontant(montant: number, devise: string = 'XOF'): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: devise,
      minimumFractionDigits: 0,
    }).format(montant);
  }

  /**
   * Formate un pourcentage
   */
  formatPourcentage(valeur: number, decimales: number = 2): string {
    return `${valeur.toFixed(decimales)}%`;
  }

  /**
   * Calcule une variation en pourcentage
   */
  calculateVariation(valeurCourante: number, valeurPrecedente: number): {
    variation: number;
    variation_pct: number;
  } {
    const variation = valeurCourante - valeurPrecedente;
    const variation_pct = valeurPrecedente !== 0
      ? (variation / valeurPrecedente) * 100
      : 0;

    return { variation, variation_pct };
  }

  /**
   * Détermine la couleur selon le score
   */
  getScoreColor(score: number): 'success' | 'warning' | 'danger' {
    if (score >= 70) return 'success';
    if (score >= 40) return 'warning';
    return 'danger';
  }

  /**
   * Détermine l'icône de tendance
   */
  getTendanceIcon(tendance: 'croissance' | 'stable' | 'decroissance' | string): string {
    const icons: Record<string, string> = {
      'croissance': '↗',
      'stable': '→',
      'decroissance': '↘',
      'amelioration': '↗',
      'deterioration': '↘',
    };
    return icons[tendance] || '•';
  }

  /**
   * Vérifie l'équilibre du bilan
   */
  verifierEquilibreBilan(actif: number, passif: number): {
    equilibre: boolean;
    ecart: number;
  } {
    const ecart = Math.abs(actif - passif);
    const equilibre = ecart < 0.01; // Tolérance de 1 centime

    return { equilibre, ecart };
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const financialStatementsService = new FinancialStatementsService();
export default financialStatementsService;
