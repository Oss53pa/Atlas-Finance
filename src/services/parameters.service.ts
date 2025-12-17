/**
 * SERVICE FRONTEND PARAMETERS - WiseBook ERP v4.1.0
 * BASE PATH: /api/v1/parameters/
 *
 * Alignement 100% avec backend Django REST Framework
 * Architecture standardisée selon P0/P1 audit integration
 *
 * Gestion complète des paramètres:
 * - Paramètres système
 * - Configuration société
 * - Paramètres journaux
 * - Paramètres notifications
 */

import { apiService } from './api';

const BASE_PATH = '/api/v1/parameters';

// ============================================================================
// INTERFACES TYPESCRIPT
// ============================================================================

export interface ParametreSysteme {
  id: string;
  cle: string;
  valeur: string;
  valeur_par_defaut: string;
  type_valeur: 'STRING' | 'INTEGER' | 'FLOAT' | 'BOOLEAN' | 'JSON' | 'DATE';
  categorie: ParameterCategory;
  groupe?: string;
  description?: string;
  visible: boolean;
  modifiable: boolean;
  ordre_affichage: number;
  validation_regex?: string;
  valeurs_possibles?: string[];
  created_at: string;
  updated_at: string;
}

export interface ConfigurationSociete {
  id: string;
  societe_id: string;
  societe_name?: string;
  nom_commercial?: string;
  logo?: string;
  logo_url?: string;
  adresse_siege: string;
  code_postal: string;
  ville: string;
  pays: string;
  telephone: string;
  email: string;
  site_web?: string;
  forme_juridique: string;
  capital_social: number;
  devise: string;
  rccm?: string;
  numero_tva?: string;
  numero_patente?: string;
  code_activite?: string;
  secteur_activite?: string;
  nombre_employes?: number;
  date_creation: string;
  exercice_fiscal_debut_mois: number;
  exercice_fiscal_duree_mois: number;
  timezone: string;
  langue: string;
  format_date: string;
  format_nombre: string;
  separateur_milliers: string;
  separateur_decimales: string;
  nombre_decimales: number;
  created_at: string;
  updated_at: string;
}

export interface JournalParametres {
  id: string;
  societe_id: string;
  societe_name?: string;
  code_journal: string;
  libelle: string;
  type_journal: 'VENTE' | 'ACHAT' | 'BANQUE' | 'CAISSE' | 'OD';
  prefixe_piece?: string;
  compteur_actuel: number;
  compteur_debut: number;
  longueur_numero: number;
  reset_annuel: boolean;
  compte_contrepartie?: string;
  compte_contrepartie_detail?: {
    numero: string;
    intitule: string;
  };
  autoriser_saisie_manuelle: boolean;
  validation_obligatoire: boolean;
  is_actif: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationParametres {
  id: string;
  societe_id: string;
  societe_name?: string;
  evenement: NotificationEvent;
  libelle: string;
  description?: string;
  type_notification: 'EMAIL' | 'SMS' | 'PUSH' | 'SYSTEME';
  destinataires: string[];
  template_sujet?: string;
  template_corps?: string;
  conditions?: Record<string, any>;
  delai_envoi_minutes?: number;
  is_actif: boolean;
  created_at: string;
  updated_at: string;
}

export type ParameterCategory =
  | 'GENERAL'
  | 'COMPTABILITE'
  | 'FISCALITE'
  | 'TRESORERIE'
  | 'CRM'
  | 'FOURNISSEURS'
  | 'SECURITE'
  | 'INTERFACE'
  | 'NOTIFICATIONS'
  | 'INTÉGRATIONS';

export type NotificationEvent =
  | 'FACTURE_CREEE'
  | 'FACTURE_VALIDEE'
  | 'PAIEMENT_RECU'
  | 'RELANCE_CLIENT'
  | 'ECHEANCE_PROCHE'
  | 'BUDGET_DEPASSE'
  | 'DECLARATION_FISCALE'
  | 'CONTROLE_FISCAL'
  | 'COMPTE_VERROUILLE'
  | 'SAUVEGARDE_COMPLETEE';

export interface CategoryOption {
  value: ParameterCategory;
  label: string;
  count?: number;
}

export interface TypeOption {
  value: string;
  label: string;
  description?: string;
}

export interface BulkParameterUpdate {
  parametres: Array<{
    id: string;
    valeur: string;
  }>;
}

export interface ParameterQueryParams {
  categorie?: ParameterCategory;
  groupe?: string;
  visible?: boolean;
  modifiable?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface JournalQueryParams {
  societe_id?: string;
  type_journal?: string;
  is_actif?: boolean;
  page?: number;
  page_size?: number;
}

export interface NotificationQueryParams {
  societe_id?: string;
  evenement?: NotificationEvent;
  type_notification?: string;
  is_actif?: boolean;
  page?: number;
  page_size?: number;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class ParametersService {
  // ============================================================================
  // SECTION 1: CRUD PARAMÈTRES SYSTÈME
  // ============================================================================

  /**
   * Récupère la liste des paramètres système
   */
  async getParametresSysteme(params?: ParameterQueryParams): Promise<{
    results: ParametreSysteme[];
    count: number;
  }> {
    const response = await apiService.get(`${BASE_PATH}/parametres-systeme/`, { params });
    return response.data;
  }

  /**
   * Récupère un paramètre système par ID
   */
  async getParametreSystemeById(id: string): Promise<ParametreSysteme> {
    const response = await apiService.get(`${BASE_PATH}/parametres-systeme/${id}/`);
    return response.data;
  }

  /**
   * Récupère un paramètre par sa clé
   */
  async getParametreByKey(cle: string): Promise<ParametreSysteme> {
    const response = await apiService.get(`${BASE_PATH}/parametres-systeme/get-by-key/`, {
      params: { cle },
    });
    return response.data;
  }

  /**
   * Récupère les paramètres d'une catégorie
   */
  async getParametresByCategory(categorie: ParameterCategory): Promise<ParametreSysteme[]> {
    const response = await apiService.get(
      `${BASE_PATH}/parametres-systeme/by-category/${categorie}/`
    );
    return response.data.results || response.data;
  }

  /**
   * Récupère les paramètres d'un groupe
   */
  async getParametresByGroup(groupe: string): Promise<ParametreSysteme[]> {
    const response = await apiService.get(`${BASE_PATH}/parametres-systeme/by-group/${groupe}/`);
    return response.data.results || response.data;
  }

  /**
   * Récupère uniquement les paramètres visibles
   */
  async getParametresVisiblesOnly(): Promise<ParametreSysteme[]> {
    const response = await apiService.get(`${BASE_PATH}/parametres-systeme/visible-only/`);
    return response.data.results || response.data;
  }

  /**
   * Récupère la liste des catégories disponibles
   */
  async getCategories(): Promise<CategoryOption[]> {
    const response = await apiService.get(`${BASE_PATH}/parametres-systeme/categories/`);
    return response.data.categories || response.data;
  }

  /**
   * Crée un nouveau paramètre système
   */
  async createParametreSysteme(data: Partial<ParametreSysteme>): Promise<ParametreSysteme> {
    const response = await apiService.post(`${BASE_PATH}/parametres-systeme/`, data);
    return response.data;
  }

  /**
   * Met à jour un paramètre système
   */
  async updateParametreSysteme(
    id: string,
    data: Partial<ParametreSysteme>
  ): Promise<ParametreSysteme> {
    const response = await apiService.patch(`${BASE_PATH}/parametres-systeme/${id}/`, data);
    return response.data;
  }

  /**
   * Supprime un paramètre système
   */
  async deleteParametreSysteme(id: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/parametres-systeme/${id}/`);
  }

  /**
   * Réinitialise un paramètre à sa valeur par défaut
   */
  async resetParametreToDefault(id: string): Promise<ParametreSysteme> {
    const response = await apiService.post(`${BASE_PATH}/parametres-systeme/${id}/reset-to-default/`);
    return response.data;
  }

  /**
   * Met à jour plusieurs paramètres en une seule requête
   */
  async bulkUpdateParametres(update: BulkParameterUpdate): Promise<{
    updated_count: number;
    errors?: string[];
  }> {
    const response = await apiService.post(`${BASE_PATH}/parametres-systeme/bulk-update/`, update);
    return response.data;
  }

  // ============================================================================
  // SECTION 2: CRUD CONFIGURATION SOCIÉTÉ
  // ============================================================================

  /**
   * Récupère la liste des configurations société
   */
  async getConfigurationsSociete(params?: {
    page?: number;
    page_size?: number;
  }): Promise<{
    results: ConfigurationSociete[];
    count: number;
  }> {
    const response = await apiService.get(`${BASE_PATH}/configurations-societe/`, { params });
    return response.data;
  }

  /**
   * Récupère une configuration société par ID
   */
  async getConfigurationSocieteById(id: string): Promise<ConfigurationSociete> {
    const response = await apiService.get(`${BASE_PATH}/configurations-societe/${id}/`);
    return response.data;
  }

  /**
   * Récupère la configuration d'une société spécifique
   */
  async getConfigurationByCompany(societeId: string): Promise<ConfigurationSociete> {
    const response = await apiService.get(
      `${BASE_PATH}/configurations-societe/by-company/${societeId}/`
    );
    return response.data;
  }

  /**
   * Crée une nouvelle configuration société
   */
  async createConfigurationSociete(
    data: Partial<ConfigurationSociete>
  ): Promise<ConfigurationSociete> {
    const response = await apiService.post(`${BASE_PATH}/configurations-societe/`, data);
    return response.data;
  }

  /**
   * Met à jour une configuration société
   */
  async updateConfigurationSociete(
    id: string,
    data: Partial<ConfigurationSociete>
  ): Promise<ConfigurationSociete> {
    const response = await apiService.patch(`${BASE_PATH}/configurations-societe/${id}/`, data);
    return response.data;
  }

  /**
   * Supprime une configuration société
   */
  async deleteConfigurationSociete(id: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/configurations-societe/${id}/`);
  }

  /**
   * Upload le logo d'une société
   */
  async uploadLogo(
    configId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ConfigurationSociete> {
    const formData = new FormData();
    formData.append('logo', file);

    const response = await apiService.post(
      `${BASE_PATH}/configurations-societe/${configId}/upload-logo/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: onProgress
          ? (progressEvent: any) => {
              if (progressEvent.total) {
                const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(progress);
              }
            }
          : undefined,
      }
    );
    return response.data;
  }

  /**
   * Supprime le logo d'une société
   */
  async deleteLogo(configId: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/configurations-societe/${configId}/delete-logo/`);
  }

  // ============================================================================
  // SECTION 3: CRUD PARAMÈTRES JOURNAUX
  // ============================================================================

  /**
   * Récupère la liste des paramètres journaux
   */
  async getJournauxParametres(params?: JournalQueryParams): Promise<{
    results: JournalParametres[];
    count: number;
  }> {
    const response = await apiService.get(`${BASE_PATH}/journaux-parametres/`, { params });
    return response.data;
  }

  /**
   * Récupère un paramètre journal par ID
   */
  async getJournalParametresById(id: string): Promise<JournalParametres> {
    const response = await apiService.get(`${BASE_PATH}/journaux-parametres/${id}/`);
    return response.data;
  }

  /**
   * Récupère les journaux d'une société
   */
  async getJournauxByCompany(societeId: string): Promise<JournalParametres[]> {
    const response = await apiService.get(
      `${BASE_PATH}/journaux-parametres/by-company/${societeId}/`
    );
    return response.data.results || response.data;
  }

  /**
   * Récupère les journaux d'un type spécifique
   */
  async getJournauxByType(typeJournal: string): Promise<JournalParametres[]> {
    const response = await apiService.get(
      `${BASE_PATH}/journaux-parametres/by-type/${typeJournal}/`
    );
    return response.data.results || response.data;
  }

  /**
   * Récupère la liste des types de journaux disponibles
   */
  async getJournalTypes(): Promise<TypeOption[]> {
    const response = await apiService.get(`${BASE_PATH}/journaux-parametres/types/`);
    return response.data.types || response.data;
  }

  /**
   * Crée un nouveau paramètre journal
   */
  async createJournalParametres(data: Partial<JournalParametres>): Promise<JournalParametres> {
    const response = await apiService.post(`${BASE_PATH}/journaux-parametres/`, data);
    return response.data;
  }

  /**
   * Met à jour un paramètre journal
   */
  async updateJournalParametres(
    id: string,
    data: Partial<JournalParametres>
  ): Promise<JournalParametres> {
    const response = await apiService.patch(`${BASE_PATH}/journaux-parametres/${id}/`, data);
    return response.data;
  }

  /**
   * Supprime un paramètre journal
   */
  async deleteJournalParametres(id: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/journaux-parametres/${id}/`);
  }

  /**
   * Incrémente le compteur d'un journal
   */
  async incrementJournalCounter(id: string): Promise<JournalParametres> {
    const response = await apiService.post(`${BASE_PATH}/journaux-parametres/${id}/increment-counter/`);
    return response.data;
  }

  // ============================================================================
  // SECTION 4: CRUD PARAMÈTRES NOTIFICATIONS
  // ============================================================================

  /**
   * Récupère la liste des paramètres notifications
   */
  async getNotificationsParametres(params?: NotificationQueryParams): Promise<{
    results: NotificationParametres[];
    count: number;
  }> {
    const response = await apiService.get(`${BASE_PATH}/notifications-parametres/`, { params });
    return response.data;
  }

  /**
   * Récupère un paramètre notification par ID
   */
  async getNotificationParametresById(id: string): Promise<NotificationParametres> {
    const response = await apiService.get(`${BASE_PATH}/notifications-parametres/${id}/`);
    return response.data;
  }

  /**
   * Récupère les notifications d'une société
   */
  async getNotificationsByCompany(societeId: string): Promise<NotificationParametres[]> {
    const response = await apiService.get(
      `${BASE_PATH}/notifications-parametres/by-company/${societeId}/`
    );
    return response.data.results || response.data;
  }

  /**
   * Récupère uniquement les notifications actives
   */
  async getNotificationsActive(): Promise<NotificationParametres[]> {
    const response = await apiService.get(`${BASE_PATH}/notifications-parametres/active/`);
    return response.data.results || response.data;
  }

  /**
   * Récupère la liste des événements disponibles
   */
  async getNotificationEvents(): Promise<TypeOption[]> {
    const response = await apiService.get(`${BASE_PATH}/notifications-parametres/events/`);
    return response.data.events || response.data;
  }

  /**
   * Récupère la liste des types de notifications
   */
  async getNotificationTypes(): Promise<TypeOption[]> {
    const response = await apiService.get(`${BASE_PATH}/notifications-parametres/notification-types/`);
    return response.data.types || response.data;
  }

  /**
   * Crée un nouveau paramètre notification
   */
  async createNotificationParametres(
    data: Partial<NotificationParametres>
  ): Promise<NotificationParametres> {
    const response = await apiService.post(`${BASE_PATH}/notifications-parametres/`, data);
    return response.data;
  }

  /**
   * Met à jour un paramètre notification
   */
  async updateNotificationParametres(
    id: string,
    data: Partial<NotificationParametres>
  ): Promise<NotificationParametres> {
    const response = await apiService.patch(`${BASE_PATH}/notifications-parametres/${id}/`, data);
    return response.data;
  }

  /**
   * Supprime un paramètre notification
   */
  async deleteNotificationParametres(id: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/notifications-parametres/${id}/`);
  }

  /**
   * Active/Désactive une notification
   */
  async toggleNotificationActive(id: string): Promise<NotificationParametres> {
    const response = await apiService.post(`${BASE_PATH}/notifications-parametres/${id}/toggle-active/`);
    return response.data;
  }

  // ============================================================================
  // SECTION 5: HELPERS & UTILITIES
  // ============================================================================

  /**
   * Recherche globale dans tous les paramètres
   */
  async searchAllParameters(query: string): Promise<{
    parametres_systeme: ParametreSysteme[];
    configurations_societe: ConfigurationSociete[];
    journaux: JournalParametres[];
    notifications: NotificationParametres[];
  }> {
    const [parametres, configurations, journaux, notifications] = await Promise.all([
      this.getParametresSysteme({ search: query }),
      this.getConfigurationsSociete(),
      this.getJournauxParametres(),
      this.getNotificationsParametres(),
    ]);

    return {
      parametres_systeme: parametres.results,
      configurations_societe: configurations.results,
      journaux: journaux.results,
      notifications: notifications.results,
    };
  }

  /**
   * Exporte tous les paramètres en JSON
   */
  async exportAllParameters(): Promise<{
    parametres_systeme: ParametreSysteme[];
    configurations_societe: ConfigurationSociete[];
    journaux: JournalParametres[];
    notifications: NotificationParametres[];
    export_date: string;
  }> {
    const [parametres, configurations, journaux, notifications] = await Promise.all([
      this.getParametresSysteme(),
      this.getConfigurationsSociete(),
      this.getJournauxParametres(),
      this.getNotificationsParametres(),
    ]);

    return {
      parametres_systeme: parametres.results,
      configurations_societe: configurations.results,
      journaux: journaux.results,
      notifications: notifications.results,
      export_date: new Date().toISOString(),
    };
  }

  /**
   * Récupère les paramètres de configuration globale
   */
  async getGlobalSettings(): Promise<{
    general: ParametreSysteme[];
    comptabilite: ParametreSysteme[];
    fiscalite: ParametreSysteme[];
    securite: ParametreSysteme[];
  }> {
    const [general, comptabilite, fiscalite, securite] = await Promise.all([
      this.getParametresByCategory('GENERAL'),
      this.getParametresByCategory('COMPTABILITE'),
      this.getParametresByCategory('FISCALITE'),
      this.getParametresByCategory('SECURITE'),
    ]);

    return {
      general,
      comptabilite,
      fiscalite,
      securite,
    };
  }
}

export const parametersService = new ParametersService();
export default parametersService;

// Export legacy services for backward compatibility
export const parametreSystemeService = parametersService;
export const configurationSocieteService = parametersService;
export const journalParametresService = parametersService;
export const notificationParametresService = parametersService;
