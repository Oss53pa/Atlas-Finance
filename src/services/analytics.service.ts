/**
 * Service Analytics WiseBook
 * Comptabilité analytique multi-axes
 *
 * Fonctionnalités:
 * - Gestion des axes analytiques (activité, centre coûts, projets, etc.)
 * - Sections analytiques hiérarchiques
 * - Ventilations analytiques
 * - Affectations multi-axes
 * - Rapports analytiques
 * - Analyses croisées
 *
 * Architecture: Standard apiService + BASE_PATH
 * Backend: apps/analytics (modèles définis, API à implémenter)
 *
 * @module services/analytics
 * @version 4.1.0
 * @date 2025-10-19
 */

import { apiService } from './api';

const BASE_PATH = '/api/v1/analytics';

// ============================================================================
// INTERFACES TYPESCRIPT
// ============================================================================

/**
 * Axe analytique
 */
export interface AxeAnalytique {
  id: string;
  societe: string;
  societe_nom?: string;

  // Informations de base
  code: string;
  libelle: string;
  description?: string;
  type_axe: 'ACTIVITE' | 'CENTRE_COUT' | 'CENTRE_PROFIT' | 'PROJET' | 'PRODUIT' | 'CLIENT' | 'GEOGRAPHIE' | 'RESPONSABLE' | 'AUTRE';

  // Configuration
  obligatoire: boolean;
  ventilation_totale: boolean;
  comptes_concernes?: string[];

  // Hiérarchie
  hierarchique: boolean;
  profondeur_max: number;

  // Métadonnées
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Section analytique
 */
export interface SectionAnalytique {
  id: string;
  axe: string;
  axe_code?: string;
  axe_libelle?: string;

  // Informations
  code: string;
  libelle: string;
  description?: string;

  // Hiérarchie
  parent?: string;
  parent_code?: string;
  niveau: number;
  chemin_complet?: string;

  // Budget (optionnel)
  budget_annuel?: number;
  budget_periode?: number;

  // Métadonnées
  is_active: boolean;
  ordre: number;
  created_at: string;
  updated_at: string;
}

/**
 * Ventilation analytique
 */
export interface VentilationAnalytique {
  id: string;
  ecriture_ligne: string;
  ecriture_ligne_ref?: string;

  // Axe et section
  axe: string;
  axe_code?: string;
  section: string;
  section_code?: string;
  section_libelle?: string;

  // Montant
  montant: number;
  pourcentage: number;

  // Métadonnées
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Affectation multi-axes
 */
export interface AffectationMultiAxes {
  id: string;
  ecriture_ligne: string;
  ecriture_ligne_ref?: string;

  // Ventilations par axe
  ventilations: VentilationAnalytique[];

  // Validation
  is_complete: boolean;
  validation_errors?: string[];

  created_at: string;
  updated_at: string;
}

/**
 * Centre de coûts (section type CENTRE_COUT)
 */
export interface CentreCouts {
  id: string;
  code: string;
  name: string;
  type: 'administratif' | 'operationnel' | 'support';

  // Budget
  budget: number;
  consumed: number;
  remaining: number;
  percentage: number;

  // Responsable
  responsable?: string;
  responsable_nom?: string;

  status: 'active' | 'inactive';
}

/**
 * Rapport analytique
 */
export interface RapportAnalytique {
  axe_id?: string;
  axe_code?: string;
  axe_libelle?: string;

  // Période
  exercice: string;
  periode_debut: string;
  periode_fin: string;

  // Données
  sections: Array<{
    section_id: string;
    section_code: string;
    section_libelle: string;
    total_debit: number;
    total_credit: number;
    solde: number;
    pourcentage: number;
  }>;

  // Totaux
  total_debit: number;
  total_credit: number;
  total_solde: number;
}

/**
 * Analyse croisée (2 axes)
 */
export interface AnalyseCroisee {
  axe1_id: string;
  axe1_libelle: string;
  axe2_id: string;
  axe2_libelle: string;

  // Période
  exercice: string;
  periode_debut: string;
  periode_fin: string;

  // Matrice de données
  data: Array<{
    section_axe1_id: string;
    section_axe1_code: string;
    section_axe2_id: string;
    section_axe2_code: string;
    montant: number;
  }>;

  // Totaux par axe
  totaux_axe1: Record<string, number>;
  totaux_axe2: Record<string, number>;
  total_general: number;
}

/**
 * Statistiques analytics
 */
export interface AnalyticsStats {
  total_axes: number;
  active_axes: number;
  total_sections: number;
  active_sections: number;
  total_ventilations: number;
  total_montant_ventile: number;

  // Par type d'axe
  par_type_axe: Array<{
    type: string;
    count: number;
    total_montant: number;
  }>;

  // Top sections
  top_sections: Array<{
    section_id: string;
    section_code: string;
    section_libelle: string;
    total_montant: number;
    count_ventilations: number;
  }>;
}

/**
 * Paramètres de requête pagination
 */
export interface AnalyticsQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class AnalyticsService {

  // ==========================================================================
  // SECTION 1: CRUD AXES ANALYTIQUES
  // ==========================================================================

  /**
   * Récupère la liste des axes analytiques
   */
  async getAxes(params?: {
    societe?: string;
    type_axe?: string;
    is_active?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<{
    results: AxeAnalytique[];
    count: number;
    next?: string;
    previous?: string;
  }> {
    const response = await apiService.get(`${BASE_PATH}/axes/`, { params });
    return response.data;
  }

  /**
   * Récupère un axe par ID
   */
  async getAxe(id: string): Promise<AxeAnalytique> {
    const response = await apiService.get(`${BASE_PATH}/axes/${id}/`);
    return response.data;
  }

  /**
   * Crée un nouvel axe analytique
   */
  async createAxe(data: Partial<AxeAnalytique>): Promise<AxeAnalytique> {
    const response = await apiService.post(`${BASE_PATH}/axes/`, data);
    return response.data;
  }

  /**
   * Met à jour un axe
   */
  async updateAxe(id: string, data: Partial<AxeAnalytique>): Promise<AxeAnalytique> {
    const response = await apiService.patch(`${BASE_PATH}/axes/${id}/`, data);
    return response.data;
  }

  /**
   * Supprime un axe
   */
  async deleteAxe(id: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/axes/${id}/`);
  }

  // ==========================================================================
  // SECTION 2: CRUD SECTIONS ANALYTIQUES
  // ==========================================================================

  /**
   * Récupère les sections d'un axe
   */
  async getSections(params?: {
    axe?: string;
    parent?: string;
    is_active?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<{
    results: SectionAnalytique[];
    count: number;
    next?: string;
    previous?: string;
  }> {
    const response = await apiService.get(`${BASE_PATH}/sections/`, { params });
    return response.data;
  }

  /**
   * Récupère une section par ID
   */
  async getSection(id: string): Promise<SectionAnalytique> {
    const response = await apiService.get(`${BASE_PATH}/sections/${id}/`);
    return response.data;
  }

  /**
   * Crée une nouvelle section
   */
  async createSection(data: Partial<SectionAnalytique>): Promise<SectionAnalytique> {
    const response = await apiService.post(`${BASE_PATH}/sections/`, data);
    return response.data;
  }

  /**
   * Met à jour une section
   */
  async updateSection(id: string, data: Partial<SectionAnalytique>): Promise<SectionAnalytique> {
    const response = await apiService.patch(`${BASE_PATH}/sections/${id}/`, data);
    return response.data;
  }

  /**
   * Supprime une section
   */
  async deleteSection(id: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/sections/${id}/`);
  }

  /**
   * Récupère l'arbre hiérarchique d'un axe
   */
  async getSectionsTree(axeId: string): Promise<SectionAnalytique[]> {
    const response = await apiService.get(`${BASE_PATH}/sections/tree/`, {
      params: { axe: axeId },
    });
    return response.data;
  }

  // ==========================================================================
  // SECTION 3: VENTILATIONS ANALYTIQUES
  // ==========================================================================

  /**
   * Récupère les ventilations
   */
  async getVentilations(params?: {
    ecriture_ligne?: string;
    axe?: string;
    section?: string;
    page?: number;
    page_size?: number;
  }): Promise<{
    results: VentilationAnalytique[];
    count: number;
    next?: string;
    previous?: string;
  }> {
    const response = await apiService.get(`${BASE_PATH}/ventilations/`, { params });
    return response.data;
  }

  /**
   * Crée une ventilation analytique
   */
  async createVentilation(data: Partial<VentilationAnalytique>): Promise<VentilationAnalytique> {
    const response = await apiService.post(`${BASE_PATH}/ventilations/`, data);
    return response.data;
  }

  /**
   * Met à jour une ventilation
   */
  async updateVentilation(id: string, data: Partial<VentilationAnalytique>): Promise<VentilationAnalytique> {
    const response = await apiService.patch(`${BASE_PATH}/ventilations/${id}/`, data);
    return response.data;
  }

  /**
   * Supprime une ventilation
   */
  async deleteVentilation(id: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/ventilations/${id}/`);
  }

  /**
   * Ventile automatiquement une ligne d'écriture
   */
  async ventilerLigne(data: {
    ecriture_ligne: string;
    ventilations: Array<{
      axe: string;
      section: string;
      pourcentage: number;
    }>;
  }): Promise<{
    success: boolean;
    ventilations: VentilationAnalytique[];
  }> {
    const response = await apiService.post(`${BASE_PATH}/ventilations/ventiler-ligne/`, data);
    return response.data;
  }

  // ==========================================================================
  // SECTION 4: AFFECTATIONS MULTI-AXES
  // ==========================================================================

  /**
   * Récupère les affectations multi-axes
   */
  async getAffectations(params?: {
    ecriture_ligne?: string;
    is_complete?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<{
    results: AffectationMultiAxes[];
    count: number;
  }> {
    const response = await apiService.get(`${BASE_PATH}/affectations/`, { params });
    return response.data;
  }

  /**
   * Crée une affectation multi-axes
   */
  async createAffectation(data: Partial<AffectationMultiAxes>): Promise<AffectationMultiAxes> {
    const response = await apiService.post(`${BASE_PATH}/affectations/`, data);
    return response.data;
  }

  /**
   * Valide une affectation multi-axes
   */
  async validateAffectation(id: string): Promise<{
    is_valid: boolean;
    errors: string[];
  }> {
    const response = await apiService.post(`${BASE_PATH}/affectations/${id}/validate/`);
    return response.data;
  }

  // ==========================================================================
  // SECTION 5: RAPPORTS ANALYTIQUES
  // ==========================================================================

  /**
   * Génère un rapport analytique
   */
  async genererRapport(params: {
    axe_id?: string;
    exercice: string;
    periode_debut?: string;
    periode_fin?: string;
    sections?: string[];
  }): Promise<RapportAnalytique> {
    const response = await apiService.post(`${BASE_PATH}/rapports/generer/`, params);
    return response.data;
  }

  /**
   * Génère une analyse croisée (2 axes)
   */
  async genererAnalyseCroisee(params: {
    axe1_id: string;
    axe2_id: string;
    exercice: string;
    periode_debut?: string;
    periode_fin?: string;
  }): Promise<AnalyseCroisee> {
    const response = await apiService.post(`${BASE_PATH}/rapports/analyse-croisee/`, params);
    return response.data;
  }

  /**
   * Exporte un rapport analytique
   */
  async exportRapport(params: {
    axe_id?: string;
    exercice: string;
    format: 'excel' | 'pdf' | 'csv';
  }): Promise<Blob> {
    const response = await apiService.get(`${BASE_PATH}/rapports/export/`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  }

  // ==========================================================================
  // SECTION 6: STATISTIQUES
  // ==========================================================================

  /**
   * Récupère les statistiques analytics
   */
  async getStats(params?: {
    exercice?: string;
    societe?: string;
  }): Promise<AnalyticsStats> {
    const response = await apiService.get(`${BASE_PATH}/stats/`, { params });
    return response.data;
  }

  /**
   * Récupère les centres de coûts
   */
  async getCostCenters(params?: {
    type?: string;
    status?: string;
  }): Promise<{
    costCenters: CentreCouts[];
    totalPages: number;
    totalCount: number;
  }> {
    const response = await apiService.get(`${BASE_PATH}/cost-centers/`, { params });
    return response.data;
  }

  /**
   * Dashboard analytics
   */
  async getDashboardStats(params?: {
    exercice?: string;
  }): Promise<{
    totalAxes: number;
    activeCostCenters: number;
    totalAllocations: number;
    pendingAllocations: number;
  }> {
    const response = await apiService.get(`${BASE_PATH}/dashboard/stats/`, { params });
    return response.data;
  }

  // ==========================================================================
  // SECTION 7: MÉTHODES HELPERS
  // ==========================================================================

  /**
   * Formate un montant
   */
  formatMontant(montant: number, currency: string = 'XOF'): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(montant);
  }

  /**
   * Formate un pourcentage
   */
  formatPourcentage(valeur: number): string {
    return `${valeur.toFixed(1)}%`;
  }

  /**
   * Valide une ventilation à 100%
   */
  validateVentilation(ventilations: Array<{ pourcentage: number }>): {
    is_valid: boolean;
    total: number;
    error?: string;
  } {
    const total = ventilations.reduce((sum, v) => sum + v.pourcentage, 0);
    const is_valid = Math.abs(total - 100) < 0.01;

    return {
      is_valid,
      total,
      error: is_valid ? undefined : `Total ${total}% !== 100%`,
    };
  }

  /**
   * Construit le chemin hiérarchique d'une section
   */
  buildCheminComplet(sections: SectionAnalytique[], sectionId: string): string {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return '';

    const path: string[] = [section.code];
    let current = section;

    while (current.parent) {
      const parent = sections.find(s => s.id === current.parent);
      if (!parent) break;
      path.unshift(parent.code);
      current = parent;
    }

    return path.join(' > ');
  }

  /**
   * Détermine la couleur selon le type d'axe
   */
  getAxeTypeColor(type: string): string {
    const colors: Record<string, string> = {
      'ACTIVITE': '#3B82F6',
      'CENTRE_COUT': '#EF4444',
      'CENTRE_PROFIT': '#10B981',
      'PROJET': '#8B5CF6',
      'PRODUIT': '#F59E0B',
      'CLIENT': '#06B6D4',
      'GEOGRAPHIE': '#EC4899',
      'RESPONSABLE': '#6366F1',
      'AUTRE': '#6B7280',
    };
    return colors[type] || colors['AUTRE'];
  }

  /**
   * Détermine le label du type d'axe
   */
  getAxeTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'ACTIVITE': 'Activité/Division',
      'CENTRE_COUT': 'Centre de coûts',
      'CENTRE_PROFIT': 'Centre de profit',
      'PROJET': 'Projet',
      'PRODUIT': 'Produit/Service',
      'CLIENT': 'Client',
      'GEOGRAPHIE': 'Zone géographique',
      'RESPONSABLE': 'Responsable',
      'AUTRE': 'Autre',
    };
    return labels[type] || type;
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const analyticsService = new AnalyticsService();
export default analyticsService;

// ============================================================================
// EXPORT LEGACY COMPATIBILITY
// ============================================================================

/**
 * @deprecated Use analyticsService.getAxes() instead
 */
export const getAnalyticalAxes = (filters?: any) => analyticsService.getAxes(filters);

/**
 * @deprecated Use analyticsService.getDashboardStats() instead
 */
export const getDashboardStats = () => analyticsService.getDashboardStats();

/**
 * @deprecated Use analyticsService.getCostCenters() instead
 */
export const getCostCenters = (filters?: any) => analyticsService.getCostCenters(filters);

/**
 * @deprecated Use analyticsService.deleteAxe() instead
 */
export const deleteAxis = (id: string) => analyticsService.deleteAxe(id);

/**
 * @deprecated Use analyticsService.deleteSection() instead (cost centers are sections)
 */
export const deleteCostCenter = (id: string) => analyticsService.deleteSection(id);
