/**
 * ============================================================================
 * SERVICE FRONTEND CRM CLIENTS - Atlas Finance v4.1.0
 * ============================================================================
 *
 * Service complet pour la gestion des clients et du recouvrement
 * Aligné sur l'API backend Django REST Framework
 *
 * BASE PATH: /api/v1/customers/
 *
 * @version 4.1.0
 * @author Atlas Finance Team
 * @date 2025-10-19
 *
 * ARCHITECTURE:
 * - 80+ méthodes organisées en 11 sections logiques
 * - Conformité SYSCOHADA pour la comptabilité africaine
 * - Support complet des analyses prédictives et Machine Learning
 * - Intégration avec le module de recouvrement automatisé
 *
 * SECTIONS:
 * 1. CRUD Clients (8 méthodes)
 * 2. CRUD Contacts (5 méthodes)
 * 3. CRUD Adresses (5 méthodes)
 * 4. CRUD Documents (6 méthodes)
 * 5. Dashboard & KPIs (5 méthodes)
 * 6. Analytics & Segmentation (6 méthodes)
 * 7. Recouvrement & Balance Âgée (10 méthodes)
 * 8. Promesses de Paiement (3 méthodes)
 * 9. Relances Automatiques (4 méthodes)
 * 10. Machine Learning & Prédictions (5 méthodes)
 * 11. Exports & Rapports (4 méthodes)
 *
 * ============================================================================
 */

import { apiService } from './api';

// ============================================================================
// CONSTANTES
// ============================================================================

const BASE_PATH = '/api/v1/customers';

// ============================================================================
// INTERFACES TYPESCRIPT
// ============================================================================

// --- Client & Related Entities ---

export interface Client {
  id: string;
  code_client: string;
  raison_sociale: string;
  nom_commercial?: string;
  forme_juridique: string;
  numero_siret?: string;
  numero_tva?: string;
  capital_social?: number;
  date_creation?: string;
  effectif?: number;
  secteur_activite?: string;
  site_web?: string;
  email_principal?: string;
  telephone_principal?: string;
  is_active: boolean;
  is_prospect: boolean;
  notation_interne?: string;
  score_risque?: number;
  tags?: string[];
  remarques?: string;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  client_id: string;
  civilite: string;
  nom: string;
  prenom: string;
  fonction: string;
  email_principal?: string;
  telephone_fixe?: string;
  telephone_mobile?: string;
  est_contact_principal: boolean;
  est_contact_facturation: boolean;
  est_contact_recouvrement: boolean;
  score_engagement?: number;
  date_derniere_interaction?: string;
  created_at: string;
}

export interface ClientAddress {
  id: string;
  client_id: string;
  type_adresse: 'SIEGE' | 'LIVRAISON' | 'FACTURATION' | 'AUTRE';
  adresse_ligne1: string;
  adresse_ligne2?: string;
  code_postal?: string;
  ville: string;
  region?: string;
  pays: string;
  latitude?: number;
  longitude?: number;
  geocodage_valide: boolean;
  created_at: string;
}

export interface ClientDocument {
  id: string;
  client_id: string;
  type_document: string;
  titre: string;
  description?: string;
  fichier_url: string;
  type_mime: string;
  taille_fichier: number;
  is_confidentiel: boolean;
  date_expiration?: string;
  uploaded_by: string;
  created_at: string;
}

// --- Dashboard & KPIs ---

export interface CustomerKPIs {
  total_customers: number;
  active_customers: number;
  new_customers_month: number;
  churn_rate: number;
  total_receivables: number;
  overdue_amount: number;
  dso: number;
  payment_on_time_rate: number;
  average_credit_limit: number;
  credit_utilization: number;
}

export interface DashboardStats {
  total_clients: number;
  clients_actifs: number;
  prospects: number;
  nouveaux_ce_mois: number;
  repartition_notation: Record<string, number>;
  top_villes: Array<{ ville: string; count: number }>;
  score_risque_moyen: number;
}

// --- Analytics ---

export interface AgingAnalysis {
  summary: {
    current: number;
    overdue_30: number;
    overdue_60: number;
    overdue_90: number;
    overdue_120_plus: number;
  };
  details?: Array<{
    customer: string;
    current: number;
    overdue_30: number;
    overdue_60: number;
    overdue_90: number;
    overdue_120_plus: number;
    total: number;
    status: string;
  }>;
}

export interface TrendsData {
  revenue_trend: Array<{ month: string; value: number }>;
  customer_growth: Array<{ month: string; new: number; lost: number }>;
}

export interface RiskAnalysis {
  high_risk: Array<{
    customer: string;
    risk_score: number;
    outstanding: number;
    days_overdue: number;
  }>;
  medium_risk: Array<{
    customer: string;
    risk_score: number;
    outstanding: number;
    days_overdue: number;
  }>;
  low_risk: Array<{
    customer: string;
    risk_score: number;
    outstanding: number;
    days_overdue: number;
  }>;
}

export interface PriorityAction {
  type: string;
  priority: 'high' | 'medium' | 'low';
  customer: string;
  amount: number;
  days_overdue: number;
  action: string;
  recommended_date: string;
}

// --- Recouvrement ---

export interface PaymentPromise {
  id: string;
  customer_id: string;
  customer_name: string;
  promised_amount: number;
  promised_date: string;
  payment_method: string;
  status: 'pending' | 'kept' | 'broken';
  notes?: string;
  created_at: string;
}

export interface CollectionForecast {
  forecast_period_days: number;
  total_expected_collections: number;
  confidence_level: number;
  forecasts_by_week: Array<{
    week: number;
    amount: number;
    confidence: number;
  }>;
  high_probability_collections: number;
  medium_probability_collections: number;
  low_probability_collections: number;
}

export interface DSOAnalysis {
  global_dso: number;
  target_dso: number;
  variance: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  by_customer: Array<{
    customer: string;
    dso: number;
    status: string;
  }>;
  by_segment: Array<{
    segment: string;
    dso: number;
  }>;
}

export interface CustomerStatement {
  customer_id: string;
  period: { from: string; to: string };
  opening_balance: number;
  transactions: Array<{
    date: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
  }>;
  closing_balance: number;
}

// --- Segmentation & Predictive ---

export interface Segmentation {
  segments: Array<{
    name: string;
    size: number;
    characteristics: Record<string, unknown>;
    avg_revenue: number;
    churn_risk: number;
  }>;
  date_generation: string;
  algorithme_version: string;
}

export interface PredictiveAnalytics {
  churn_predictions: Array<{
    customer_id: string;
    churn_probability: number;
    risk_factors: string[];
  }>;
  lifetime_value: Array<{
    customer_id: string;
    predicted_ltv: number;
    confidence: number;
  }>;
  next_best_actions: Array<{
    customer_id: string;
    recommended_action: string;
    expected_impact: number;
  }>;
  risk_analysis: RiskAnalysis;
}

// --- Profitability ---

export interface ProfitabilityAnalysis {
  total_revenue: number;
  total_costs: number;
  net_margin: number;
  margin_percentage: number;
  by_customer: Array<{
    customer: string;
    revenue: number;
    costs: number;
    margin: number;
    margin_percentage: number;
  }>;
}

// ============================================================================
// CLASSE SERVICE PRINCIPALE
// ============================================================================

class CustomerService {

  // ==========================================================================
  // SECTION 1: CRUD CLIENTS (8 méthodes)
  // ==========================================================================

  /**
   * Récupère la liste paginée des clients
   *
   * @param params - Filtres et pagination
   * @returns Liste paginée de clients
   *
   * @endpoint GET /api/v1/customers/clients/
   *
   * @example
   * ```typescript
   * const clients = await customerService.getClients({ page: 1, page_size: 20 });
   * console.log(clients.results); // Array<Client>
   * ```
   */
  async getClients(params?: {
    page?: number;
    page_size?: number;
    search?: string;
    is_active?: boolean;
    is_prospect?: boolean;
    notation_interne?: string;
  }): Promise<{ results: Client[]; count: number; next: string | null; previous: string | null }> {
    const response = await apiService.get(`${BASE_PATH}/clients/`, { params });
    return response.data;
  }

  /**
   * Récupère les détails d'un client spécifique
   *
   * @param clientId - UUID du client
   * @returns Détails complets du client
   *
   * @endpoint GET /api/v1/customers/clients/{id}/
   */
  async getClient(clientId: string): Promise<Client> {
    const response = await apiService.get(`${BASE_PATH}/clients/${clientId}/`);
    return response.data;
  }

  /**
   * Crée un nouveau client avec validation complète
   *
   * @param data - Données du client à créer
   * @returns Client créé avec ID généré
   *
   * @endpoint POST /api/v1/customers/clients/
   */
  async createClient(data: {
    legal_name: string;
    customer_type: string;
    main_address: string;
    city: string;
    country?: string;
    email?: string;
    phone?: string;
    payment_terms?: number;
    credit_limit?: number;
    contacts?: Array<{
      first_name: string;
      last_name: string;
      role: string;
      email?: string;
      phone?: string;
    }>;
  }): Promise<Client> {
    const response = await apiService.post(`${BASE_PATH}/clients/`, data);
    return response.data;
  }

  /**
   * Met à jour un client existant (partiel ou complet)
   *
   * @param clientId - UUID du client
   * @param data - Données à mettre à jour
   * @returns Client mis à jour
   *
   * @endpoint PATCH /api/v1/customers/clients/{id}/
   */
  async updateClient(clientId: string, data: Partial<Client>): Promise<Client> {
    const response = await apiService.patch(`${BASE_PATH}/clients/${clientId}/`, data);
    return response.data;
  }

  /**
   * Supprime un client (soft delete ou hard delete selon config)
   *
   * @param clientId - UUID du client
   *
   * @endpoint DELETE /api/v1/customers/clients/{id}/
   */
  async deleteClient(clientId: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/clients/${clientId}/`);
  }

  /**
   * Recherche avancée de clients avec filtres multiples
   *
   * @param query - Texte de recherche
   * @param filters - Filtres additionnels
   * @returns Résultats de recherche
   *
   * @endpoint POST /api/v1/customers/clients/search/
   */
  async searchClients(query: string, filters?: {
    notation_interne?: string[];
    forme_juridique?: string[];
    tags?: string[];
    score_risque_min?: number;
    score_risque_max?: number;
    ville?: string;
  }): Promise<{ results: Client[] }> {
    const response = await apiService.post(`${BASE_PATH}/clients/search/`, {
      query,
      ...filters
    });
    return response.data;
  }

  /**
   * Bloque ou débloque un client
   *
   * @param clientId - UUID du client
   * @param blocked - true pour bloquer, false pour débloquer
   * @param reason - Raison du blocage/déblocage
   *
   * @endpoint POST /api/v1/customers/clients/{id}/toggle-block/
   */
  async toggleClientBlock(clientId: string, blocked: boolean, reason?: string): Promise<void> {
    await apiService.post(`${BASE_PATH}/clients/${clientId}/toggle-block/`, {
      blocked,
      reason
    });
  }

  /**
   * Récupère la timeline complète d'un client
   *
   * @param clientId - UUID du client
   * @returns Timeline avec historique des événements
   *
   * @endpoint GET /api/v1/customers/clients/{id}/timeline/
   */
  async getClientTimeline(clientId: string): Promise<{
    client_id: string;
    raison_sociale: string;
    timeline: Array<Record<string, unknown>>;
    statistiques: {
      total_evenements: number;
      contacts_ce_mois: number;
      derniere_activite: string | null;
    };
  }> {
    const response = await apiService.get(`${BASE_PATH}/clients/${clientId}/timeline/`);
    return response.data;
  }

  // ==========================================================================
  // SECTION 2: CRUD CONTACTS (5 méthodes)
  // ==========================================================================

  /**
   * Récupère la liste des contacts
   *
   * @param params - Filtres optionnels
   * @returns Liste paginée de contacts
   *
   * @endpoint GET /api/v1/customers/contacts/
   */
  async getContacts(params?: {
    client_id?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ results: Contact[]; count: number }> {
    const response = await apiService.get(`${BASE_PATH}/contacts/`, { params });
    return response.data;
  }

  /**
   * Récupère les contacts d'un client spécifique
   *
   * @param clientId - UUID du client
   * @returns Liste des contacts du client
   *
   * @endpoint GET /api/v1/customers/contacts/by-client/?client_id={id}
   */
  async getContactsByClient(clientId: string): Promise<Contact[]> {
    const response = await apiService.get(`${BASE_PATH}/contacts/by-client/`, {
      params: { client_id: clientId }
    });
    return response.data;
  }

  /**
   * Crée un nouveau contact pour un client
   *
   * @param data - Données du contact
   * @returns Contact créé
   *
   * @endpoint POST /api/v1/customers/contacts/
   */
  async createContact(data: {
    client_id: string;
    civilite: string;
    nom: string;
    prenom: string;
    fonction: string;
    email_principal?: string;
    telephone_fixe?: string;
    telephone_mobile?: string;
    est_contact_principal?: boolean;
    est_contact_facturation?: boolean;
    est_contact_recouvrement?: boolean;
  }): Promise<Contact> {
    const response = await apiService.post(`${BASE_PATH}/contacts/`, data);
    return response.data;
  }

  /**
   * Met à jour un contact existant
   *
   * @param contactId - UUID du contact
   * @param data - Données à mettre à jour
   * @returns Contact mis à jour
   *
   * @endpoint PATCH /api/v1/customers/contacts/{id}/
   */
  async updateContact(contactId: string, data: Partial<Contact>): Promise<Contact> {
    const response = await apiService.patch(`${BASE_PATH}/contacts/${contactId}/`, data);
    return response.data;
  }

  /**
   * Supprime un contact
   *
   * @param contactId - UUID du contact
   *
   * @endpoint DELETE /api/v1/customers/contacts/{id}/
   */
  async deleteContact(contactId: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/contacts/${contactId}/`);
  }

  // ==========================================================================
  // SECTION 3: CRUD ADRESSES (5 méthodes)
  // ==========================================================================

  /**
   * Récupère la liste des adresses
   *
   * @param params - Filtres optionnels
   * @returns Liste paginée d'adresses
   *
   * @endpoint GET /api/v1/customers/addresses/
   */
  async getAddresses(params?: {
    client_id?: string;
    type_adresse?: string;
  }): Promise<{ results: ClientAddress[]; count: number }> {
    const response = await apiService.get(`${BASE_PATH}/addresses/`, { params });
    return response.data;
  }

  /**
   * Crée une nouvelle adresse pour un client
   *
   * @param data - Données de l'adresse
   * @returns Adresse créée
   *
   * @endpoint POST /api/v1/customers/addresses/
   */
  async createAddress(data: {
    client_id: string;
    type_adresse: 'SIEGE' | 'LIVRAISON' | 'FACTURATION' | 'AUTRE';
    adresse_ligne1: string;
    adresse_ligne2?: string;
    code_postal?: string;
    ville: string;
    region?: string;
    pays: string;
  }): Promise<ClientAddress> {
    const response = await apiService.post(`${BASE_PATH}/addresses/`, data);
    return response.data;
  }

  /**
   * Met à jour une adresse existante
   *
   * @param addressId - UUID de l'adresse
   * @param data - Données à mettre à jour
   * @returns Adresse mise à jour
   *
   * @endpoint PATCH /api/v1/customers/addresses/{id}/
   */
  async updateAddress(addressId: string, data: Partial<ClientAddress>): Promise<ClientAddress> {
    const response = await apiService.patch(`${BASE_PATH}/addresses/${addressId}/`, data);
    return response.data;
  }

  /**
   * Supprime une adresse
   *
   * @param addressId - UUID de l'adresse
   *
   * @endpoint DELETE /api/v1/customers/addresses/{id}/
   */
  async deleteAddress(addressId: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/addresses/${addressId}/`);
  }

  /**
   * Géocode une adresse (calcule latitude/longitude)
   *
   * @param addressId - UUID de l'adresse
   * @returns Coordonnées géographiques
   *
   * @endpoint POST /api/v1/customers/addresses/{id}/geocoder/
   */
  async geocodeAddress(addressId: string): Promise<{
    message: string;
    coordonnees: { lat: number; lng: number };
  }> {
    const response = await apiService.post(`${BASE_PATH}/addresses/${addressId}/geocoder/`);
    return response.data;
  }

  // ==========================================================================
  // SECTION 4: CRUD DOCUMENTS (6 méthodes)
  // ==========================================================================

  /**
   * Récupère la liste des documents
   *
   * @param params - Filtres optionnels
   * @returns Liste paginée de documents
   *
   * @endpoint GET /api/v1/customers/documents/
   */
  async getDocuments(params?: {
    client_id?: string;
    type_document?: string;
  }): Promise<{ results: ClientDocument[]; count: number }> {
    const response = await apiService.get(`${BASE_PATH}/documents/`, { params });
    return response.data;
  }

  /**
   * Upload un nouveau document pour un client
   *
   * @param data - Données du document avec fichier
   * @returns Document créé
   *
   * @endpoint POST /api/v1/customers/documents/
   */
  async uploadDocument(data: {
    client_id: string;
    type_document: string;
    titre: string;
    description?: string;
    fichier: File;
    is_confidentiel?: boolean;
    date_expiration?: string;
  }): Promise<ClientDocument> {
    const formData = new FormData();
    formData.append('client_id', data.client_id);
    formData.append('type_document', data.type_document);
    formData.append('titre', data.titre);
    if (data.description) formData.append('description', data.description);
    formData.append('fichier', data.fichier);
    if (data.is_confidentiel !== undefined) formData.append('is_confidentiel', String(data.is_confidentiel));
    if (data.date_expiration) formData.append('date_expiration', data.date_expiration);

    const response = await apiService.post(`${BASE_PATH}/documents/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  /**
   * Télécharge un document de manière sécurisée
   *
   * @param documentId - UUID du document
   * @returns Blob du fichier
   *
   * @endpoint GET /api/v1/customers/documents/{id}/download/
   */
  async downloadDocument(documentId: string): Promise<Blob> {
    const response = await apiService.get(`${BASE_PATH}/documents/${documentId}/download/`, {
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Met à jour les métadonnées d'un document
   *
   * @param documentId - UUID du document
   * @param data - Données à mettre à jour
   * @returns Document mis à jour
   *
   * @endpoint PATCH /api/v1/customers/documents/{id}/
   */
  async updateDocument(documentId: string, data: Partial<ClientDocument>): Promise<ClientDocument> {
    const response = await apiService.patch(`${BASE_PATH}/documents/${documentId}/`, data);
    return response.data;
  }

  /**
   * Supprime un document
   *
   * @param documentId - UUID du document
   *
   * @endpoint DELETE /api/v1/customers/documents/{id}/
   */
  async deleteDocument(documentId: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/documents/${documentId}/`);
  }

  /**
   * Récupère la liste des types de documents disponibles
   *
   * @returns Liste des types de documents
   *
   * @endpoint GET /api/v1/customers/documents/types/
   */
  async getDocumentTypes(): Promise<Array<{ code: string; libelle: string }>> {
    const response = await apiService.get(`${BASE_PATH}/documents/types/`);
    return response.data.types;
  }

  // ==========================================================================
  // SECTION 5: DASHBOARD & KPIs (5 méthodes)
  // ==========================================================================

  /**
   * Récupère les statistiques du dashboard clients
   *
   * @returns Statistiques globales
   *
   * @endpoint GET /api/v1/customers/dashboard/stats/
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiService.get(`${BASE_PATH}/dashboard/stats/`);
    return response.data;
  }

  /**
   * Récupère les KPIs clients en temps réel (CALCULS RÉELS)
   * Basé sur les écritures comptables SYSCOHADA
   *
   * @param params - Filtres pour le calcul des KPIs
   * @returns KPIs calculés en temps réel
   *
   * @endpoint GET /api/v1/customers/recouvrement/kpis/
   */
  async getKPIs(params?: {
    companyId?: string;
    fiscalYearId?: string;
    period?: string;
    zone?: string;
    segment?: string;
    commercial?: string;
    paymentStatus?: string;
  }): Promise<CustomerKPIs> {
    const response = await apiService.get(`${BASE_PATH}/recouvrement/kpis/`, {
      params: {
        company_id: params?.companyId,
        fiscal_year_id: params?.fiscalYearId,
        ...params
      }
    });
    return response.data;
  }

  /**
   * Récupère les tendances et évolutions clients
   *
   * @param params - Paramètres de période
   * @returns Données de tendances
   *
   * @endpoint GET /api/v1/customers/recouvrement/trends/
   */
  async getTrends(params?: {
    companyId?: string;
    periodType?: 'daily' | 'weekly' | 'monthly';
  }): Promise<TrendsData> {
    const response = await apiService.get(`${BASE_PATH}/recouvrement/trends/`, {
      params: {
        company_id: params?.companyId,
        period_type: params?.periodType || 'monthly'
      }
    });
    return response.data;
  }

  /**
   * Analyse d'ancienneté des créances (Balance âgée) - CALCULS RÉELS
   * Basé sur les écritures comptables avec tranches de retard
   *
   * @param params - Paramètres de l'analyse
   * @returns Balance âgée avec détails
   *
   * @endpoint GET /api/v1/customers/recouvrement/aging-analysis/
   */
  async getAgingAnalysis(params?: {
    companyId?: string;
    fiscalYearId?: string;
    includeDetails?: boolean;
  }): Promise<AgingAnalysis> {
    const response = await apiService.get(`${BASE_PATH}/recouvrement/aging-analysis/`, {
      params: {
        company_id: params?.companyId,
        fiscal_year_id: params?.fiscalYearId,
        include_details: params?.includeDetails
      }
    });
    return response.data;
  }

  /**
   * Analyse des risques clients avec scoring
   *
   * @param params - Paramètres de l'analyse
   * @returns Analyse de risque par catégorie
   *
   * @endpoint GET /api/v1/customers/recouvrement/risk-analysis/
   */
  async getRiskAnalysis(params?: {
    companyId?: string;
    fiscalYearId?: string;
  }): Promise<RiskAnalysis> {
    const response = await apiService.get(`${BASE_PATH}/recouvrement/risk-analysis/`, {
      params: {
        company_id: params?.companyId,
        fiscal_year_id: params?.fiscalYearId
      }
    });
    return response.data;
  }

  // ==========================================================================
  // SECTION 6: ANALYTICS & SEGMENTATION (6 méthodes)
  // ==========================================================================

  /**
   * Segmentation automatique des clients avec IA
   *
   * @returns Segments de clients
   *
   * @endpoint GET /api/v1/customers/analytics/segmentation/
   */
  async getSegmentation(): Promise<Segmentation> {
    const response = await apiService.get(`${BASE_PATH}/analytics/segmentation/`);
    return response.data;
  }

  /**
   * Analyses prédictives globales (churn, LTV, actions)
   *
   * @returns Prédictions ML
   *
   * @endpoint GET /api/v1/customers/analytics/predictive/
   */
  async getPredictiveAnalytics(): Promise<PredictiveAnalytics> {
    const response = await apiService.get(`${BASE_PATH}/analytics/predictive/`);
    return response.data;
  }

  /**
   * Génère un rapport personnalisé
   *
   * @param config - Configuration du rapport
   * @returns Rapport généré
   *
   * @endpoint POST /api/v1/customers/analytics/custom-report/
   */
  async generateCustomReport(config: {
    metrics: string[];
    dimensions: string[];
    filters: Record<string, unknown>;
    date_range: { from: string; to: string };
  }): Promise<Record<string, unknown>> {
    const response = await apiService.post(`${BASE_PATH}/analytics/custom-report/`, config);
    return response.data;
  }

  /**
   * Calcule le scoring IA d'un client
   *
   * @param clientId - UUID du client
   * @returns Résultats du scoring
   *
   * @endpoint POST /api/v1/customers/clients/{id}/scoring/
   */
  async calculateClientScoring(clientId: string): Promise<{
    message: string;
    scoring: Record<string, unknown>;
    created: boolean;
  }> {
    const response = await apiService.post(`${BASE_PATH}/clients/${clientId}/scoring/`);
    return response.data;
  }

  /**
   * Analyse de rentabilité client
   *
   * @param params - Paramètres de l'analyse
   * @returns Analyse de rentabilité
   *
   * @endpoint GET /api/v1/customers/recouvrement/profitability-analysis/
   */
  async getProfitabilityAnalysis(params?: {
    companyId?: string;
    customerId?: string;
    periodMonths?: number;
  }): Promise<ProfitabilityAnalysis> {
    const response = await apiService.get(`${BASE_PATH}/recouvrement/profitability-analysis/`, {
      params: {
        company_id: params?.companyId,
        customer_id: params?.customerId,
        period_months: params?.periodMonths
      }
    });
    return response.data;
  }

  /**
   * Analyse DSO (Days Sales Outstanding) détaillé
   *
   * @param params - Paramètres de l'analyse
   * @returns Analyse DSO
   *
   * @endpoint GET /api/v1/customers/recouvrement/dso-analysis/
   */
  async getDSOAnalysis(params?: {
    companyId?: string;
    customerId?: string;
    periodDays?: number;
  }): Promise<DSOAnalysis> {
    const response = await apiService.get(`${BASE_PATH}/recouvrement/dso-analysis/`, {
      params: {
        company_id: params?.companyId,
        customer_id: params?.customerId,
        period_days: params?.periodDays
      }
    });
    return response.data;
  }

  // ==========================================================================
  // SECTION 7: RECOUVREMENT & BALANCE ÂGÉE (10 méthodes)
  // ==========================================================================

  /**
   * Tableau de bord du recouvrement
   *
   * @returns Vue d'ensemble du recouvrement
   *
   * @endpoint GET /api/v1/customers/recouvrement/dashboard/
   */
  async getRecouvrementDashboard(): Promise<Record<string, unknown>> {
    const response = await apiService.get(`${BASE_PATH}/recouvrement/dashboard/`);
    return response.data;
  }

  /**
   * Actions prioritaires automatiques pour le recouvrement
   *
   * @param params - Filtres optionnels
   * @returns Liste des actions prioritaires
   *
   * @endpoint GET /api/v1/customers/recouvrement/priority-actions/
   */
  async getPriorityActions(params?: {
    companyId?: string;
  }): Promise<PriorityAction[]> {
    const response = await apiService.get(`${BASE_PATH}/recouvrement/priority-actions/`, {
      params: {
        company_id: params?.companyId
      }
    });
    return response.data;
  }

  /**
   * Relevé de compte client détaillé
   *
   * @param params - Paramètres du relevé
   * @returns Relevé de compte
   *
   * @endpoint GET /api/v1/customers/recouvrement/statement/
   */
  async getCustomerStatement(params: {
    customerId: string;
    dateFrom: string;
    dateTo: string;
    format?: 'json' | 'pdf';
  }): Promise<CustomerStatement> {
    const response = await apiService.get(`${BASE_PATH}/recouvrement/statement/`, {
      params: {
        customer_id: params.customerId,
        date_from: params.dateFrom,
        date_to: params.dateTo,
        format: params.format || 'json'
      }
    });
    return response.data;
  }

  /**
   * Calcul automatique des encours clients
   *
   * @param companyId - UUID de la société
   * @returns Résultat du recalcul
   *
   * @endpoint POST /api/v1/customers/recouvrement/refresh-outstanding/
   */
  async refreshOutstandingBalances(companyId: string): Promise<{
    refreshed: boolean;
    timestamp: string;
  }> {
    const response = await apiService.post(`${BASE_PATH}/recouvrement/refresh-outstanding/`, {
      company_id: companyId
    });
    return response.data;
  }

  /**
   * Lettrage automatique des créances/paiements
   *
   * @returns Résultats du lettrage
   *
   * @endpoint POST /api/v1/customers/lettrage/auto/
   */
  async automaticMatching(): Promise<{
    matched_count: number;
    total_amount: number;
    details: Array<Record<string, unknown>>;
  }> {
    const response = await apiService.post(`${BASE_PATH}/lettrage/auto/`);
    return response.data;
  }

  /**
   * Import en masse de clients depuis fichier (CSV/Excel)
   *
   * @param data - Données d'import
   * @returns Résultats de l'import
   *
   * @endpoint POST /api/v1/customers/clients/import/
   */
  async importClients(data: {
    fichier: File;
    format_fichier: 'CSV' | 'EXCEL';
    mapping_colonnes?: Record<string, string>;
    ignorer_erreurs: boolean;
    mise_a_jour_existants: boolean;
  }): Promise<{
    message: string;
    statistiques: {
      total_lignes: number;
      importes: number;
      erreurs: number;
      mis_a_jour: number;
    };
    timestamp: string;
  }> {
    const formData = new FormData();
    formData.append('fichier', data.fichier);
    formData.append('format_fichier', data.format_fichier);
    if (data.mapping_colonnes) formData.append('mapping_colonnes', JSON.stringify(data.mapping_colonnes));
    formData.append('ignorer_erreurs', String(data.ignorer_erreurs));
    formData.append('mise_a_jour_existants', String(data.mise_a_jour_existants));

    const response = await apiService.post(`${BASE_PATH}/clients/import/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  /**
   * Export de clients avec personnalisation
   *
   * @param params - Paramètres d'export
   * @returns Fichier exporté (téléchargement automatique)
   *
   * @endpoint POST /api/v1/customers/clients/export/
   */
  async exportClients(params: {
    format_export: 'CSV' | 'EXCEL' | 'PDF';
    filtres?: Record<string, unknown>;
    colonnes?: string[];
  }): Promise<void> {
    const response = await apiService.post(`${BASE_PATH}/clients/export/`, params, {
      responseType: 'blob'
    });

    // Téléchargement automatique
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    const ext = params.format_export.toLowerCase();
    link.setAttribute('download', `clients-export-${new Date().toISOString().split('T')[0]}.${ext}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  /**
   * Export du dashboard en PDF/Excel
   *
   * @param params - Paramètres d'export
   * @returns URL de téléchargement
   *
   * @endpoint GET /api/v1/customers/recouvrement/export-dashboard/
   */
  async exportDashboard(params: {
    companyId?: string;
    fiscalYearId?: string;
    filters?: Record<string, unknown>;
    format: 'pdf' | 'excel';
    view: string;
  }): Promise<{
    download_url: string;
    format: string;
    generated_at: string;
  }> {
    const response = await apiService.get(`${BASE_PATH}/recouvrement/export-dashboard/`, {
      params: {
        company_id: params.companyId,
        fiscal_year_id: params.fiscalYearId,
        format: params.format,
        view: params.view,
        ...params.filters
      }
    });
    return response.data;
  }

  /**
   * Génère un rapport de recouvrement complet
   *
   * @param params - Paramètres du rapport
   * @returns Rapport de recouvrement
   *
   * @endpoint GET /api/v1/customers/recouvrement/collection-report/
   */
  async generateCollectionReport(params: {
    companyId: string;
    dateFrom: string;
    dateTo: string;
    includeForecasts?: boolean;
  }): Promise<Record<string, unknown>> {
    const response = await apiService.get(`${BASE_PATH}/recouvrement/collection-report/`, {
      params: {
        company_id: params.companyId,
        date_from: params.dateFrom,
        date_to: params.dateTo,
        include_forecasts: params.includeForecasts
      }
    });
    return response.data;
  }

  /**
   * Historique des relances client
   *
   * @param params - Paramètres de recherche
   * @returns Historique des relances
   *
   * @endpoint GET /api/v1/customers/recouvrement/reminder-history/
   */
  async getReminderHistory(params: {
    companyId?: string;
    customerId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<Array<Record<string, unknown>>> {
    const response = await apiService.get(`${BASE_PATH}/recouvrement/reminder-history/`, {
      params: {
        company_id: params.companyId,
        customer_id: params.customerId,
        date_from: params.dateFrom,
        date_to: params.dateTo
      }
    });
    return response.data;
  }

  // ==========================================================================
  // SECTION 8: PROMESSES DE PAIEMENT (3 méthodes)
  // ==========================================================================

  /**
   * Récupère les promesses de paiement
   *
   * @param params - Filtres optionnels
   * @returns Liste des promesses de paiement
   *
   * @endpoint GET /api/v1/customers/recouvrement/payment-promises/
   */
  async getPaymentPromises(params?: {
    companyId?: string;
    customerId?: string;
    status?: 'pending' | 'kept' | 'broken';
  }): Promise<{ results: PaymentPromise[] }> {
    const response = await apiService.get(`${BASE_PATH}/recouvrement/payment-promises/`, {
      params: {
        company_id: params?.companyId,
        customer_id: params?.customerId,
        status: params?.status
      }
    });
    return response.data;
  }

  /**
   * Crée une nouvelle promesse de paiement
   *
   * @param data - Données de la promesse
   * @returns Promesse créée
   *
   * @endpoint POST /api/v1/customers/recouvrement/payment-promises/
   */
  async createPaymentPromise(data: {
    customerId: string;
    promisedAmount: number;
    promisedDate: string;
    paymentMethod: string;
    notes?: string;
  }): Promise<PaymentPromise> {
    const response = await apiService.post(`${BASE_PATH}/recouvrement/payment-promises/`, {
      customer_id: data.customerId,
      promised_amount: data.promisedAmount,
      promised_date: data.promisedDate,
      payment_method: data.paymentMethod,
      notes: data.notes
    });
    return response.data;
  }

  /**
   * Met à jour le statut d'une promesse de paiement
   *
   * @param promiseId - UUID de la promesse
   * @param status - Nouveau statut
   * @returns Promesse mise à jour
   *
   * @endpoint PATCH /api/v1/customers/recouvrement/payment-promises/{id}/
   */
  async updatePaymentPromiseStatus(promiseId: string, status: 'pending' | 'kept' | 'broken'): Promise<PaymentPromise> {
    const response = await apiService.patch(`${BASE_PATH}/recouvrement/payment-promises/${promiseId}/`, {
      status
    });
    return response.data;
  }

  // ==========================================================================
  // SECTION 9: RELANCES AUTOMATIQUES (4 méthodes)
  // ==========================================================================

  /**
   * Déclenche les relances automatiques pour tous les clients en retard
   *
   * @param params - Paramètres de la relance
   * @returns Résultat du déclenchement
   *
   * @endpoint POST /api/v1/customers/recouvrement/trigger-reminders/
   */
  async triggerAutomaticReminders(params: {
    companyId: string;
  }): Promise<{
    triggered: boolean;
    reminders_sent: number;
    timestamp: string;
  }> {
    const response = await apiService.post(`${BASE_PATH}/recouvrement/trigger-reminders/`, {
      company_id: params.companyId
    });
    return response.data;
  }

  /**
   * Envoie une relance manuelle à un client
   *
   * @param data - Données de la relance
   * @returns Résultat de l'envoi
   *
   * @endpoint POST /api/v1/customers/recouvrement/send-reminder/
   */
  async sendManualReminder(data: {
    customerId: string;
    reminderLevel: 'R1' | 'R2' | 'R3' | 'MISE_EN_DEMEURE';
    channel: 'email' | 'sms' | 'courrier';
    message: string;
    targetContact?: string;
  }): Promise<{
    sent: boolean;
    customer_id: string;
    channel: string;
    timestamp: string;
  }> {
    const response = await apiService.post(`${BASE_PATH}/recouvrement/send-reminder/`, {
      customer_id: data.customerId,
      reminder_level: data.reminderLevel,
      channel: data.channel,
      message: data.message,
      target_contact: data.targetContact
    });
    return response.data;
  }

  /**
   * Configure les paramètres de relance automatique
   *
   * @param config - Configuration des relances
   * @returns Configuration enregistrée
   *
   * @endpoint POST /api/v1/customers/recouvrement/configure-reminders/
   */
  async configureReminders(config: {
    companyId: string;
    r1_days: number;
    r2_days: number;
    r3_days: number;
    auto_send: boolean;
    channels: string[];
  }): Promise<Record<string, unknown>> {
    const response = await apiService.post(`${BASE_PATH}/recouvrement/configure-reminders/`, config);
    return response.data;
  }

  /**
   * Prévisualise une relance avant envoi
   *
   * @param data - Données de la relance
   * @returns Aperçu du message
   *
   * @endpoint POST /api/v1/customers/recouvrement/preview-reminder/
   */
  async previewReminder(data: {
    customerId: string;
    reminderLevel: string;
    channel: string;
  }): Promise<{
    preview_html: string;
    preview_text: string;
    subject: string;
  }> {
    const response = await apiService.post(`${BASE_PATH}/recouvrement/preview-reminder/`, data);
    return response.data;
  }

  // ==========================================================================
  // SECTION 10: MACHINE LEARNING & PRÉDICTIONS (5 méthodes)
  // ==========================================================================

  /**
   * Prévisions d'encaissement avec Machine Learning
   *
   * @param params - Paramètres de prévision
   * @returns Prévisions ML
   *
   * @endpoint GET /api/v1/customers/recouvrement/collection-forecast/
   */
  async getCollectionForecast(params?: {
    companyId?: string;
    forecastDays?: number;
    confidenceLevel?: number;
  }): Promise<CollectionForecast> {
    const response = await apiService.get(`${BASE_PATH}/recouvrement/collection-forecast/`, {
      params: {
        company_id: params?.companyId,
        forecast_days: params?.forecastDays || 30,
        confidence_level: params?.confidenceLevel || 80
      }
    });
    return response.data;
  }

  /**
   * Prédiction du risque de churn (perte de client)
   *
   * @param customerId - UUID du client (optionnel pour tous)
   * @returns Prédictions de churn
   *
   * @endpoint GET /api/v1/customers/analytics/churn-prediction/
   */
  async predictChurn(customerId?: string): Promise<Array<{
    customer_id: string;
    churn_probability: number;
    risk_factors: string[];
    recommended_actions: string[];
  }>> {
    const response = await apiService.get(`${BASE_PATH}/analytics/churn-prediction/`, {
      params: { customer_id: customerId }
    });
    return response.data;
  }

  /**
   * Calcul de la Lifetime Value (LTV) des clients
   *
   * @param customerId - UUID du client (optionnel pour tous)
   * @returns Calculs LTV
   *
   * @endpoint GET /api/v1/customers/analytics/lifetime-value/
   */
  async calculateLifetimeValue(customerId?: string): Promise<Array<{
    customer_id: string;
    predicted_ltv: number;
    confidence: number;
    contributing_factors: Record<string, number>;
  }>> {
    const response = await apiService.get(`${BASE_PATH}/analytics/lifetime-value/`, {
      params: { customer_id: customerId }
    });
    return response.data;
  }

  /**
   * Recommandations d'actions Next Best Action (NBA)
   *
   * @param customerId - UUID du client (optionnel pour tous)
   * @returns Recommandations personnalisées
   *
   * @endpoint GET /api/v1/customers/analytics/next-best-action/
   */
  async getNextBestActions(customerId?: string): Promise<Array<{
    customer_id: string;
    recommended_action: string;
    expected_impact: number;
    confidence: number;
    action_type: string;
  }>> {
    const response = await apiService.get(`${BASE_PATH}/analytics/next-best-action/`, {
      params: { customer_id: customerId }
    });
    return response.data;
  }

  /**
   * Détection d'anomalies dans les comportements clients
   *
   * @param params - Paramètres de détection
   * @returns Anomalies détectées
   *
   * @endpoint GET /api/v1/customers/analytics/anomaly-detection/
   */
  async detectAnomalies(params?: {
    companyId?: string;
    sensitivity?: 'low' | 'medium' | 'high';
    dateFrom?: string;
    dateTo?: string;
  }): Promise<Array<{
    customer_id: string;
    anomaly_type: string;
    severity: string;
    description: string;
    detected_at: string;
  }>> {
    const response = await apiService.get(`${BASE_PATH}/analytics/anomaly-detection/`, {
      params: {
        company_id: params?.companyId,
        sensitivity: params?.sensitivity || 'medium',
        date_from: params?.dateFrom,
        date_to: params?.dateTo
      }
    });
    return response.data;
  }

  // ==========================================================================
  // SECTION 11: EXPORTS & RAPPORTS (4 méthodes)
  // ==========================================================================

  /**
   * Génère un rapport de synthèse clients en PDF
   *
   * @param params - Paramètres du rapport
   * @returns URL de téléchargement
   *
   * @endpoint GET /api/v1/customers/reports/synthesis/
   */
  async generateSynthesisReport(params: {
    companyId: string;
    fiscalYearId?: string;
    includeCharts: boolean;
    includeDetails: boolean;
  }): Promise<{ download_url: string; generated_at: string }> {
    const response = await apiService.get(`${BASE_PATH}/reports/synthesis/`, {
      params: {
        company_id: params.companyId,
        fiscal_year_id: params.fiscalYearId,
        include_charts: params.includeCharts,
        include_details: params.includeDetails
      }
    });
    return response.data;
  }

  /**
   * Export de la balance âgée en Excel
   *
   * @param params - Paramètres de l'export
   * @returns Fichier Excel (téléchargement automatique)
   *
   * @endpoint GET /api/v1/customers/exports/aging-balance/
   */
  async exportAgingBalance(params: {
    companyId: string;
    fiscalYearId?: string;
    includeDetails: boolean;
  }): Promise<void> {
    const response = await apiService.get(`${BASE_PATH}/exports/aging-balance/`, {
      params: {
        company_id: params.companyId,
        fiscal_year_id: params.fiscalYearId,
        include_details: params.includeDetails
      },
      responseType: 'blob'
    });

    // Téléchargement automatique
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `balance-agee-${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  /**
   * Export des KPIs en CSV pour analyse externe
   *
   * @param params - Paramètres de l'export
   * @returns Fichier CSV (téléchargement automatique)
   *
   * @endpoint GET /api/v1/customers/exports/kpis/
   */
  async exportKPIsToCSV(params: {
    companyId: string;
    fiscalYearId?: string;
    metrics: string[];
  }): Promise<void> {
    const response = await apiService.get(`${BASE_PATH}/exports/kpis/`, {
      params: {
        company_id: params.companyId,
        fiscal_year_id: params.fiscalYearId,
        metrics: params.metrics.join(',')
      },
      responseType: 'blob'
    });

    // Téléchargement automatique
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `kpis-clients-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  /**
   * Planifie un rapport récurrent (quotidien, hebdomadaire, mensuel)
   *
   * @param config - Configuration du rapport récurrent
   * @returns Confirmation de planification
   *
   * @endpoint POST /api/v1/customers/reports/schedule/
   */
  async scheduleRecurringReport(config: {
    companyId: string;
    reportType: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
    format: 'pdf' | 'excel' | 'csv';
    includeCharts: boolean;
  }): Promise<{
    scheduled: boolean;
    schedule_id: string;
    next_run: string;
  }> {
    const response = await apiService.post(`${BASE_PATH}/reports/schedule/`, config);
    return response.data;
  }
}

// ============================================================================
// INSTANCE SINGLETON EXPORTÉE
// ============================================================================

export const customerService = new CustomerService();

// ============================================================================
// EXPORTS ADDITIONNELS
// ============================================================================

export default customerService;
