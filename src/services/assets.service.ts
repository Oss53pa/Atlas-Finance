/**
 * Service Assets WiseBook
 * Gestion des immobilisations et amortissements
 *
 * Fonctionnalités:
 * - Gestion complète des immobilisations (corporelles, incorporelles, financières)
 * - Calcul automatique des amortissements (linéaire, dégressif, progressif, unités d'œuvre)
 * - Plans d'amortissement et écritures automatiques
 * - Virements entre postes, sorties et mise au rebut
 * - Réévaluations et réparations
 * - Conformité SYSCOHADA
 *
 * Architecture: Standard apiService + BASE_PATH
 * Backend: apps/assets/urls.py (9 ViewSets, 20+ endpoints)
 *
 * @module services/assets
 * @version 4.1.0
 * @date 2025-10-19
 */

import { apiService } from './api';

const BASE_PATH = '/api/v1/assets';

// ============================================================================
// INTERFACES TYPESCRIPT
// ============================================================================

/**
 * Catégorie d'immobilisation
 */
export interface CategorieImmobilisation {
  id: string;
  code: string;
  nom: string;
  description?: string;
  nature: 'CORPORELLE' | 'INCORPORELLE' | 'FINANCIERE';
  taux_amortissement_fiscal: number;
  duree_amortissement_min: number;
  duree_amortissement_max: number;
  compte_immobilisation_defaut: string;
  compte_immobilisation_defaut_numero?: string;
  compte_amortissement_defaut: string;
  compte_amortissement_defaut_numero?: string;
  compte_dotation_defaut: string;
  compte_dotation_defaut_numero?: string;
  methode_amortissement_defaut: 'LINEAIRE' | 'DEGRESSIF' | 'PROGRESSIF' | 'UNITES_OEUVRE';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Immobilisation
 */
export interface Immobilisation {
  id: string;
  code: string;
  designation: string;
  categorie: string;
  categorie_nom?: string;
  categorie_code?: string;
  nature: 'CORPORELLE' | 'INCORPORELLE' | 'FINANCIERE';

  // Valeurs et dates
  valeur_acquisition: number;
  valeur_residuelle: number;
  valeur_nette_comptable?: number;
  cumul_amortissements?: number;
  date_acquisition: string;
  date_mise_service: string;
  date_sortie?: string;

  // Amortissement
  duree_amortissement_annees: number;
  duree_amortissement_mois: number;
  methode_amortissement: 'LINEAIRE' | 'DEGRESSIF' | 'PROGRESSIF' | 'UNITES_OEUVRE';
  taux_amortissement_lineaire: number;
  coefficient_degressif?: number;
  coefficient_progressif?: number;
  unites_totales?: number;

  // Comptes comptables
  compte_immobilisation: string;
  compte_immobilisation_numero?: string;
  compte_amortissement: string;
  compte_amortissement_numero?: string;
  compte_dotation: string;
  compte_dotation_numero?: string;

  // Statut et localisation
  statut: 'ACTIVE' | 'CEDEE' | 'MISE_REBUT' | 'EN_COURS_CESSION';
  localisation?: string;
  responsable?: string;

  // Informations complémentaires
  numero_serie?: string;
  numero_inventaire?: string;
  marque?: string;
  modele?: string;
  fournisseur?: string;
  reference_facture?: string;
  numero_facture?: string;
  tiers?: string;

  // Documents
  photo_url?: string;
  documents_urls?: string[];

  // Métadonnées
  notes?: string;
  created_by?: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Plan d'amortissement
 */
export interface PlanAmortissement {
  id: string;
  immobilisation: string;
  immobilisation_designation?: string;
  immobilisation_code?: string;

  // Période
  annee: number;
  exercice: string;
  exercice_label?: string;
  numero_annuite: number;
  date_debut: string;
  date_fin: string;
  nombre_jours: number;

  // Montants
  base_amortissements: number;
  dotation_annuelle: number;
  dotation_periode: number;
  cumul_amortissements: number;
  valeur_nette_comptable: number;

  // Amortissements dérogatoires
  dotation_derogatoire?: number;
  reprise_derogatoire?: number;
  cumul_derogatoire?: number;

  // Statut
  is_comptabilise: boolean;
  ecriture_comptable?: string;
  date_comptabilisation?: string;

  created_at: string;
  updated_at: string;
}

/**
 * Écriture d'amortissement
 */
export interface EcritureAmortissement {
  id: string;
  immobilisation: string;
  immobilisation_designation?: string;
  plan_amortissement?: string;

  // Exercice et période
  exercice: string;
  exercice_label?: string;
  date_ecriture: string;

  // Journal comptable
  journal?: string;
  journal_code?: string;
  ecriture_comptable?: string;
  numero_piece?: string;

  // Montants
  montant_dotation: number;
  montant_reprise?: number;
  cumul_amortissements: number;
  valeur_nette_comptable: number;

  // Détails
  libelle: string;
  notes?: string;
  is_validee: boolean;
  validated_by?: string;
  validated_at?: string;

  created_by?: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Virement de poste
 */
export interface VirementPoste {
  id: string;
  immobilisation: string;
  immobilisation_designation?: string;

  // Comptes
  compte_origine: string;
  compte_origine_numero?: string;
  compte_destination: string;
  compte_destination_numero?: string;

  // Détails
  date_virement: string;
  montant: number;
  motif: string;
  notes?: string;

  // Écriture comptable
  ecriture_comptable?: string;
  journal?: string;
  journal_code?: string;
  is_validee: boolean;
  validated_by?: string;
  validated_at?: string;

  created_by?: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Sortie d'immobilisation
 */
export interface Sortie {
  id: string;
  immobilisation: string;
  immobilisation_designation?: string;
  immobilisation_code?: string;

  // Type et date
  type_sortie: 'CESSION' | 'MISE_REBUT' | 'VOL' | 'DESTRUCTION' | 'DON';
  date_sortie: string;

  // Valeurs
  valeur_nette_comptable_sortie: number;
  valeur_cession?: number;
  plus_ou_moins_value?: number;

  // Détails cession
  acquereur?: string;
  mode_paiement?: string;
  reference_paiement?: string;

  // Documents
  motif: string;
  notes?: string;
  pv_mise_rebut_url?: string;
  contrat_cession_url?: string;

  // Écriture comptable
  ecriture_comptable?: string;
  is_validee: boolean;
  validated_by?: string;
  validated_at?: string;

  created_by?: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Sortie comptable (écriture de sortie)
 */
export interface SortieComptable {
  id: string;
  sortie: string;
  immobilisation: string;
  immobilisation_designation?: string;

  // Journal et exercice
  journal: string;
  journal_code?: string;
  exercice: string;
  exercice_label?: string;
  date_ecriture: string;

  // Montants
  valeur_brute: number;
  cumul_amortissements: number;
  valeur_nette_comptable: number;
  prix_cession?: number;
  plus_ou_moins_value: number;

  // Écriture
  ecriture_comptable?: string;
  numero_piece?: string;
  libelle: string;

  is_validee: boolean;
  validated_by?: string;
  validated_at?: string;

  created_at: string;
  updated_at: string;
}

/**
 * Réparation
 */
export interface Reparation {
  id: string;
  immobilisation: string;
  immobilisation_designation?: string;
  immobilisation_code?: string;

  // Détails réparation
  date_reparation: string;
  type_reparation: 'ENTRETIEN' | 'REPARATION_COURANTE' | 'AMELIORATION' | 'GROS_ENTRETIEN';
  description: string;
  montant: number;

  // Prestataire
  prestataire?: string;
  reference_facture?: string;
  numero_facture?: string;

  // Comptabilisation
  compte_comptable?: string;
  compte_comptable_numero?: string;
  is_immobilisable: boolean; // Si true, augmente la valeur de l'immo
  ecriture_comptable?: string;

  // Statut
  statut: 'EN_COURS' | 'TERMINE' | 'ANNULEE';
  notes?: string;

  created_by?: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Réévaluation
 */
export interface ReevaluationImmobilisation {
  id: string;
  immobilisation: string;
  immobilisation_designation?: string;

  // Valeurs
  valeur_avant_reevaluation: number;
  valeur_apres_reevaluation: number;
  ecart_reevaluation: number;
  pourcentage_reevaluation: number;

  // Date et motif
  date_reevaluation: string;
  motif: 'EXPERTISE' | 'INFLATION' | 'MISE_A_JOUR_MARCHE' | 'AUTRE';
  description?: string;

  // Expert
  expert?: string;
  reference_rapport?: string;
  rapport_url?: string;

  // Impact amortissement
  nouvelle_duree_amortissement?: number;
  nouveau_taux_amortissement?: number;
  recalcul_plan_amortissement: boolean;

  // Écriture comptable
  compte_ecart_reevaluation?: string;
  compte_ecart_reevaluation_numero?: string;
  ecriture_comptable?: string;
  journal?: string;

  is_validee: boolean;
  validated_by?: string;
  validated_at?: string;

  created_by?: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Statistiques des immobilisations
 */
export interface AssetsStatistics {
  // Valeurs totales
  total_immobilisations: number;
  valeur_brute_totale: number;
  cumul_amortissements_total: number;
  valeur_nette_comptable_totale: number;
  dotation_annuelle_totale: number;

  // Par catégorie
  par_categorie: Array<{
    categorie_id: string;
    categorie_nom: string;
    nombre: number;
    valeur_brute: number;
    cumul_amortissements: number;
    valeur_nette_comptable: number;
  }>;

  // Par statut
  par_statut: Array<{
    statut: string;
    nombre: number;
    pourcentage: number;
  }>;

  // Par nature
  par_nature: Array<{
    nature: string;
    nombre: number;
    valeur_brute: number;
    valeur_nette_comptable: number;
  }>;

  // Évolution
  evolution_mensuelle: Array<{
    mois: string;
    acquisitions: number;
    sorties: number;
    dotations: number;
  }>;
}

/**
 * Paramètres de requête pagination
 */
export interface AssetsQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
}

/**
 * Paramètres de requête immobilisations
 */
export interface ImmobilisationQueryParams extends AssetsQueryParams {
  categorie?: string;
  nature?: string;
  statut?: string;
  localisation?: string;
  responsable?: string;
  date_acquisition_min?: string;
  date_acquisition_max?: string;
}

/**
 * Paramètres de requête plans d'amortissement
 */
export interface PlanAmortissementQueryParams extends AssetsQueryParams {
  immobilisation?: string;
  exercice?: string;
  annee?: number;
  is_comptabilise?: boolean;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class AssetsService {

  // ==========================================================================
  // SECTION 1: CRUD CATÉGORIES D'IMMOBILISATIONS
  // ==========================================================================

  /**
   * Récupère la liste des catégories d'immobilisations
   */
  async getCategories(params?: {
    nature?: string;
    is_active?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<{
    results: CategorieImmobilisation[];
    count: number;
    next?: string;
    previous?: string;
  }> {
    const response = await apiService.get(`${BASE_PATH}/categories/`, { params });
    return response.data;
  }

  /**
   * Récupère une catégorie par ID
   */
  async getCategorie(id: string): Promise<CategorieImmobilisation> {
    const response = await apiService.get(`${BASE_PATH}/categories/${id}/`);
    return response.data;
  }

  /**
   * Crée une nouvelle catégorie
   */
  async createCategorie(data: Partial<CategorieImmobilisation>): Promise<CategorieImmobilisation> {
    const response = await apiService.post(`${BASE_PATH}/categories/`, data);
    return response.data;
  }

  /**
   * Met à jour une catégorie
   */
  async updateCategorie(id: string, data: Partial<CategorieImmobilisation>): Promise<CategorieImmobilisation> {
    const response = await apiService.patch(`${BASE_PATH}/categories/${id}/`, data);
    return response.data;
  }

  /**
   * Supprime une catégorie
   */
  async deleteCategorie(id: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/categories/${id}/`);
  }

  // ==========================================================================
  // SECTION 2: CRUD IMMOBILISATIONS
  // ==========================================================================

  /**
   * Récupère la liste des immobilisations
   */
  async getImmobilisations(params?: ImmobilisationQueryParams): Promise<{
    results: Immobilisation[];
    count: number;
    next?: string;
    previous?: string;
  }> {
    const response = await apiService.get(`${BASE_PATH}/immobilisations/`, { params });
    return response.data;
  }

  /**
   * Récupère une immobilisation par ID
   */
  async getImmobilisation(id: string): Promise<Immobilisation> {
    const response = await apiService.get(`${BASE_PATH}/immobilisations/${id}/`);
    return response.data;
  }

  /**
   * Crée une nouvelle immobilisation
   */
  async createImmobilisation(data: Partial<Immobilisation>): Promise<Immobilisation> {
    const response = await apiService.post(`${BASE_PATH}/immobilisations/`, data);
    return response.data;
  }

  /**
   * Met à jour une immobilisation
   */
  async updateImmobilisation(id: string, data: Partial<Immobilisation>): Promise<Immobilisation> {
    const response = await apiService.put(`${BASE_PATH}/immobilisations/${id}/`, data);
    return response.data;
  }

  /**
   * Met à jour partiellement une immobilisation
   */
  async patchImmobilisation(id: string, data: Partial<Immobilisation>): Promise<Immobilisation> {
    const response = await apiService.patch(`${BASE_PATH}/immobilisations/${id}/`, data);
    return response.data;
  }

  /**
   * Supprime une immobilisation
   */
  async deleteImmobilisation(id: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/immobilisations/${id}/`);
  }

  // ==========================================================================
  // SECTION 3: PLANS D'AMORTISSEMENT
  // ==========================================================================

  /**
   * Récupère la liste des plans d'amortissement
   */
  async getPlansAmortissement(params?: PlanAmortissementQueryParams): Promise<{
    results: PlanAmortissement[];
    count: number;
    next?: string;
    previous?: string;
  }> {
    const response = await apiService.get(`${BASE_PATH}/plans-amortissement/`, { params });
    return response.data;
  }

  /**
   * Récupère un plan d'amortissement par ID
   */
  async getPlanAmortissement(id: string): Promise<PlanAmortissement> {
    const response = await apiService.get(`${BASE_PATH}/plans-amortissement/${id}/`);
    return response.data;
  }

  /**
   * Crée un plan d'amortissement
   */
  async createPlanAmortissement(data: Partial<PlanAmortissement>): Promise<PlanAmortissement> {
    const response = await apiService.post(`${BASE_PATH}/plans-amortissement/`, data);
    return response.data;
  }

  /**
   * Met à jour un plan d'amortissement
   */
  async updatePlanAmortissement(id: string, data: Partial<PlanAmortissement>): Promise<PlanAmortissement> {
    const response = await apiService.patch(`${BASE_PATH}/plans-amortissement/${id}/`, data);
    return response.data;
  }

  /**
   * Supprime un plan d'amortissement
   */
  async deletePlanAmortissement(id: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/plans-amortissement/${id}/`);
  }

  /**
   * Génère le tableau d'amortissement pour une immobilisation
   */
  async calculerTableauAmortissement(immobilisationId: string): Promise<PlanAmortissement[]> {
    const response = await apiService.post(
      `${BASE_PATH}/immobilisations/${immobilisationId}/calculer-amortissement/`
    );
    return response.data;
  }

  // ==========================================================================
  // SECTION 4: ÉCRITURES D'AMORTISSEMENT
  // ==========================================================================

  /**
   * Récupère la liste des écritures d'amortissement
   */
  async getEcrituresAmortissement(params?: {
    immobilisation?: string;
    exercice?: string;
    is_validee?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<{
    results: EcritureAmortissement[];
    count: number;
    next?: string;
    previous?: string;
  }> {
    const response = await apiService.get(`${BASE_PATH}/ecritures-amortissement/`, { params });
    return response.data;
  }

  /**
   * Récupère une écriture d'amortissement par ID
   */
  async getEcritureAmortissement(id: string): Promise<EcritureAmortissement> {
    const response = await apiService.get(`${BASE_PATH}/ecritures-amortissement/${id}/`);
    return response.data;
  }

  /**
   * Crée une écriture d'amortissement
   */
  async createEcritureAmortissement(data: Partial<EcritureAmortissement>): Promise<EcritureAmortissement> {
    const response = await apiService.post(`${BASE_PATH}/ecritures-amortissement/`, data);
    return response.data;
  }

  /**
   * Valide une écriture d'amortissement
   */
  async validerEcritureAmortissement(id: string): Promise<EcritureAmortissement> {
    const response = await apiService.post(`${BASE_PATH}/ecritures-amortissement/${id}/valider/`);
    return response.data;
  }

  /**
   * Supprime une écriture d'amortissement
   */
  async deleteEcritureAmortissement(id: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/ecritures-amortissement/${id}/`);
  }

  // ==========================================================================
  // SECTION 5: VIREMENTS DE POSTE
  // ==========================================================================

  /**
   * Récupère la liste des virements
   */
  async getVirements(params?: {
    immobilisation?: string;
    is_validee?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<{
    results: VirementPoste[];
    count: number;
    next?: string;
    previous?: string;
  }> {
    const response = await apiService.get(`${BASE_PATH}/virements/`, { params });
    return response.data;
  }

  /**
   * Récupère un virement par ID
   */
  async getVirement(id: string): Promise<VirementPoste> {
    const response = await apiService.get(`${BASE_PATH}/virements/${id}/`);
    return response.data;
  }

  /**
   * Crée un virement de poste
   */
  async createVirement(data: Partial<VirementPoste>): Promise<VirementPoste> {
    const response = await apiService.post(`${BASE_PATH}/virements/`, data);
    return response.data;
  }

  /**
   * Valide un virement
   */
  async validerVirement(id: string): Promise<VirementPoste> {
    const response = await apiService.post(`${BASE_PATH}/virements/${id}/valider/`);
    return response.data;
  }

  /**
   * Supprime un virement
   */
  async deleteVirement(id: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/virements/${id}/`);
  }

  // ==========================================================================
  // SECTION 6: SORTIES D'IMMOBILISATIONS
  // ==========================================================================

  /**
   * Récupère la liste des sorties
   */
  async getSorties(params?: {
    immobilisation?: string;
    type_sortie?: string;
    is_validee?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<{
    results: Sortie[];
    count: number;
    next?: string;
    previous?: string;
  }> {
    const response = await apiService.get(`${BASE_PATH}/sorties/`, { params });
    return response.data;
  }

  /**
   * Récupère une sortie par ID
   */
  async getSortie(id: string): Promise<Sortie> {
    const response = await apiService.get(`${BASE_PATH}/sorties/${id}/`);
    return response.data;
  }

  /**
   * Crée une sortie d'immobilisation
   */
  async createSortie(data: Partial<Sortie>): Promise<Sortie> {
    const response = await apiService.post(`${BASE_PATH}/sorties/`, data);
    return response.data;
  }

  /**
   * Valide une sortie
   */
  async validerSortie(id: string): Promise<Sortie> {
    const response = await apiService.post(`${BASE_PATH}/sorties/${id}/valider/`);
    return response.data;
  }

  /**
   * Supprime une sortie
   */
  async deleteSortie(id: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/sorties/${id}/`);
  }

  // ==========================================================================
  // SECTION 7: SORTIES COMPTABLES
  // ==========================================================================

  /**
   * Récupère la liste des sorties comptables
   */
  async getSortiesComptables(params?: {
    sortie?: string;
    immobilisation?: string;
    exercice?: string;
    is_validee?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<{
    results: SortieComptable[];
    count: number;
    next?: string;
    previous?: string;
  }> {
    const response = await apiService.get(`${BASE_PATH}/sorties-comptables/`, { params });
    return response.data;
  }

  /**
   * Récupère une sortie comptable par ID
   */
  async getSortieComptable(id: string): Promise<SortieComptable> {
    const response = await apiService.get(`${BASE_PATH}/sorties-comptables/${id}/`);
    return response.data;
  }

  /**
   * Crée une sortie comptable
   */
  async createSortieComptable(data: Partial<SortieComptable>): Promise<SortieComptable> {
    const response = await apiService.post(`${BASE_PATH}/sorties-comptables/`, data);
    return response.data;
  }

  /**
   * Supprime une sortie comptable
   */
  async deleteSortieComptable(id: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/sorties-comptables/${id}/`);
  }

  // ==========================================================================
  // SECTION 8: RÉPARATIONS
  // ==========================================================================

  /**
   * Récupère la liste des réparations
   */
  async getReparations(params?: {
    immobilisation?: string;
    type_reparation?: string;
    statut?: string;
    page?: number;
    page_size?: number;
  }): Promise<{
    results: Reparation[];
    count: number;
    next?: string;
    previous?: string;
  }> {
    const response = await apiService.get(`${BASE_PATH}/reparations/`, { params });
    return response.data;
  }

  /**
   * Récupère une réparation par ID
   */
  async getReparation(id: string): Promise<Reparation> {
    const response = await apiService.get(`${BASE_PATH}/reparations/${id}/`);
    return response.data;
  }

  /**
   * Crée une réparation
   */
  async createReparation(data: Partial<Reparation>): Promise<Reparation> {
    const response = await apiService.post(`${BASE_PATH}/reparations/`, data);
    return response.data;
  }

  /**
   * Met à jour une réparation
   */
  async updateReparation(id: string, data: Partial<Reparation>): Promise<Reparation> {
    const response = await apiService.patch(`${BASE_PATH}/reparations/${id}/`, data);
    return response.data;
  }

  /**
   * Supprime une réparation
   */
  async deleteReparation(id: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/reparations/${id}/`);
  }

  // ==========================================================================
  // SECTION 9: RÉÉVALUATIONS
  // ==========================================================================

  /**
   * Récupère la liste des réévaluations
   */
  async getReevaluations(params?: {
    immobilisation?: string;
    motif?: string;
    is_validee?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<{
    results: ReevaluationImmobilisation[];
    count: number;
    next?: string;
    previous?: string;
  }> {
    const response = await apiService.get(`${BASE_PATH}/reevaluations/`, { params });
    return response.data;
  }

  /**
   * Récupère une réévaluation par ID
   */
  async getReevaluation(id: string): Promise<ReevaluationImmobilisation> {
    const response = await apiService.get(`${BASE_PATH}/reevaluations/${id}/`);
    return response.data;
  }

  /**
   * Crée une réévaluation
   */
  async createReevaluation(data: Partial<ReevaluationImmobilisation>): Promise<ReevaluationImmobilisation> {
    const response = await apiService.post(`${BASE_PATH}/reevaluations/`, data);
    return response.data;
  }

  /**
   * Valide une réévaluation
   */
  async validerReevaluation(id: string): Promise<ReevaluationImmobilisation> {
    const response = await apiService.post(`${BASE_PATH}/reevaluations/${id}/valider/`);
    return response.data;
  }

  /**
   * Supprime une réévaluation
   */
  async deleteReevaluation(id: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/reevaluations/${id}/`);
  }

  // ==========================================================================
  // SECTION 10: STATISTIQUES & RAPPORTS
  // ==========================================================================

  /**
   * Récupère les statistiques des immobilisations
   */
  async getStatistiques(params?: {
    exercice?: string;
    date_debut?: string;
    date_fin?: string;
  }): Promise<AssetsStatistics> {
    const response = await apiService.get(`${BASE_PATH}/statistiques/`, { params });
    return response.data;
  }

  /**
   * Exporte les immobilisations
   */
  async exporterImmobilisations(params?: {
    format?: 'excel' | 'csv' | 'pdf';
    categorie?: string;
    statut?: string;
  }): Promise<Blob> {
    const response = await apiService.get(`${BASE_PATH}/export/`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  }

  // ==========================================================================
  // SECTION 11: MÉTHODES HELPERS
  // ==========================================================================

  /**
   * Calcule la valeur nette comptable
   */
  calculateVNC(valeurAcquisition: number, cumulAmortissements: number): number {
    return valeurAcquisition - cumulAmortissements;
  }

  /**
   * Calcule le taux d'amortissement linéaire
   */
  calculateTauxLineaire(dureeAnnees: number): number {
    if (dureeAnnees === 0) return 0;
    return (1 / dureeAnnees) * 100;
  }

  /**
   * Calcule la dotation annuelle linéaire
   */
  calculateDotationLineaire(valeurAcquisition: number, valeurResiduelle: number, dureeAnnees: number): number {
    if (dureeAnnees === 0) return 0;
    return (valeurAcquisition - valeurResiduelle) / dureeAnnees;
  }

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
   * Détermine la couleur selon le statut
   */
  getStatutColor(statut: string): 'success' | 'warning' | 'danger' | 'info' {
    switch (statut) {
      case 'ACTIVE':
        return 'success';
      case 'EN_COURS_CESSION':
        return 'warning';
      case 'CEDEE':
      case 'MISE_REBUT':
        return 'danger';
      default:
        return 'info';
    }
  }

  /**
   * Détermine le label du statut
   */
  getStatutLabel(statut: string): string {
    const labels: Record<string, string> = {
      'ACTIVE': 'Active',
      'CEDEE': 'Cédée',
      'MISE_REBUT': 'Mise au rebut',
      'EN_COURS_CESSION': 'En cours de cession',
    };
    return labels[statut] || statut;
  }

  /**
   * Détermine le label de la méthode d'amortissement
   */
  getMethodeAmortissementLabel(methode: string): string {
    const labels: Record<string, string> = {
      'LINEAIRE': 'Linéaire',
      'DEGRESSIF': 'Dégressif',
      'PROGRESSIF': 'Progressif',
      'UNITES_OEUVRE': 'Unités d\'œuvre',
    };
    return labels[methode] || methode;
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const assetsService = new AssetsService();
export default assetsService;

// ============================================================================
// EXPORT LEGACY COMPATIBILITY (pour migrations progressives)
// ============================================================================

/**
 * @deprecated Use assetsService.getCategories() instead
 */
export const getCategories = () => assetsService.getCategories();

/**
 * @deprecated Use assetsService.getImmobilisations() instead
 */
export const getImmobilisations = (filters?: any) => assetsService.getImmobilisations(filters);

/**
 * @deprecated Use assetsService.getStatistiques() instead
 */
export const getStatistiques = () => assetsService.getStatistiques();
