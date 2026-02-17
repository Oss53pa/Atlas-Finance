/**
 * TYPES CENTRALISÉS - PARAMÈTRES API
 *
 * Interface QueryParams unifiée pour toutes les requêtes API
 * Évite la duplication dans chaque service
 */

/**
 * Paramètres de base pour toutes les requêtes API
 */
export interface QueryParams {
  page?: number;
  page_size?: number;
  pageSize?: number; // Alias pour compatibilité
  search?: string;
  ordering?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
  [key: string]: any;
}

/**
 * Paramètres pour les requêtes paginées
 */
export interface PaginatedParams extends QueryParams {
  page: number;
  page_size: number;
}

/**
 * Paramètres pour les requêtes avec filtres de date
 */
export interface DateFilterParams extends QueryParams {
  date_debut?: string;
  date_fin?: string;
  start_date?: string;
  end_date?: string;
  exercice?: string;
  periode?: string;
}

/**
 * Paramètres pour les requêtes comptables
 */
export interface AccountingQueryParams extends DateFilterParams {
  journal?: string;
  compte?: string;
  tiers?: string;
  statut?: string;
  type_ecriture?: string;
  is_validated?: boolean;
  is_lettered?: boolean;
}

/**
 * Paramètres pour les requêtes de trésorerie
 */
export interface TreasuryQueryParams extends DateFilterParams {
  compte_bancaire?: string;
  type_mouvement?: string;
  statut?: string;
  devise?: string;
  montant_min?: number;
  montant_max?: number;
}

/**
 * Paramètres pour les requêtes d'immobilisations
 */
export interface AssetsQueryParams extends DateFilterParams {
  categorie?: string;
  classe?: string;
  statut?: 'actif' | 'cede' | 'rebut';
  localisation?: string;
  responsable?: string;
}

/**
 * Paramètres pour les requêtes de tiers
 */
export interface ThirdPartyQueryParams extends QueryParams {
  type?: 'client' | 'fournisseur' | 'les_deux';
  statut?: 'actif' | 'inactif' | 'bloque';
  pays?: string;
  ville?: string;
  secteur_activite?: string;
  has_balance?: boolean;
}

/**
 * Paramètres pour les requêtes budgétaires
 */
export interface BudgetQueryParams extends DateFilterParams {
  budget_id?: string;
  axe_analytique?: string;
  centre_cout?: string;
  type_budget?: string;
  statut?: string;
}

/**
 * Paramètres pour les requêtes de rapports
 */
export interface ReportQueryParams extends DateFilterParams {
  type_rapport?: string;
  format?: 'pdf' | 'excel' | 'csv' | 'json';
  include_details?: boolean;
  comparatif?: boolean;
  exercice_comparatif?: string;
}

/**
 * Paramètres pour les requêtes fiscales
 */
export interface TaxationQueryParams extends DateFilterParams {
  type_declaration?: string;
  statut?: 'brouillon' | 'valide' | 'transmis' | 'accepte' | 'rejete';
  annee_fiscale?: number;
}

/**
 * Paramètres pour les requêtes de sécurité
 */
export interface SecurityQueryParams extends QueryParams {
  role?: string;
  is_active?: boolean;
  last_login_after?: string;
  last_login_before?: string;
  has_mfa?: boolean;
}

/**
 * Paramètres pour les requêtes de clôture
 */
export interface ClosureQueryParams extends DateFilterParams {
  type_cloture?: 'mensuelle' | 'trimestrielle' | 'annuelle';
  statut?: 'en_cours' | 'validee' | 'annulee';
}

/**
 * Paramètres pour les requêtes dashboard
 */
export interface DashboardQueryParams extends DateFilterParams {
  widgets?: string[];
  refresh?: boolean;
  include_charts?: boolean;
  include_kpis?: boolean;
}

/**
 * Réponse paginée standard
 */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
  total_pages?: number;
  current_page?: number;
}

/**
 * Réponse API standard
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

/**
 * Options de tri
 */
export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Options de filtrage
 */
export interface FilterOptions {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startswith' | 'endswith' | 'in';
  value: any;
}

export default QueryParams;
