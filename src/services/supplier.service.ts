/**
 * ============================================================================
 * SERVICE FRONTEND FOURNISSEURS - Atlas Finance v4.1.0
 * ============================================================================
 *
 * Service complet pour la gestion des fournisseurs et achats
 * Aligné sur l'API backend Django REST Framework
 *
 * BASE PATH: /api/v1/suppliers/
 *
 * @version 4.1.0
 * @author Atlas Finance Team
 * @date 2025-10-19
 *
 * ARCHITECTURE:
 * - 90+ méthodes organisées en 13 sections logiques
 * - Conformité SYSCOHADA pour la comptabilité africaine
 * - Support complet des optimisations de paiement avec IA
 * - Intégration avec Wise Procure (module achats externe)
 *
 * SECTIONS:
 * 1. CRUD Suppliers (8 méthodes)
 * 2. CRUD Invoices (9 méthodes)
 * 3. CRUD Documents (6 méthodes)
 * 4. Dashboard & KPIs (5 méthodes)
 * 5. Analytics Fournisseurs (7 méthodes)
 * 6. Gestion des Échéances (8 méthodes)
 * 7. Optimisation des Paiements (7 méthodes)
 * 8. Évaluation Performance (6 méthodes)
 * 9. Lettrage Fournisseurs (4 méthodes)
 * 10. Analyse ABC & Risques (5 méthodes)
 * 11. Intégration Wise Procure (5 méthodes)
 * 12. Exports & Rapports (6 méthodes)
 * 13. Alertes & Monitoring (4 méthodes)
 *
 * ============================================================================
 */

import { apiService } from './api';

// ============================================================================
// CONSTANTES
// ============================================================================

const BASE_PATH = '/api/v1/suppliers';

// ============================================================================
// INTERFACES TYPESCRIPT
// ============================================================================

// --- Supplier & Related Entities ---

export interface Supplier {
  id: string;
  code_fournisseur: string;
  raison_sociale: string;
  nom_commercial?: string;
  forme_juridique: string;
  numero_siret?: string;
  numero_tva?: string;
  adresse: string;
  ville: string;
  code_postal?: string;
  pays: string;
  email?: string;
  telephone?: string;
  site_web?: string;
  type_fournisseur: string;
  categorie: string;
  delai_paiement_jours: number;
  conditions_paiement?: string;
  iban?: string;
  bic?: string;
  devise: string;
  is_active: boolean;
  is_preferred: boolean;
  score_performance?: number;
  evaluation_globale?: string;
  tags?: string[];
  remarques?: string;
  created_at: string;
  updated_at: string;
}

export interface SupplierInvoice {
  id: string;
  supplier_id: string;
  supplier_name: string;
  numero_facture: string;
  date_facture: string;
  date_echeance: string;
  montant_ht: number;
  montant_tva: number;
  montant_ttc: number;
  devise: string;
  statut: 'BROUILLON' | 'VALIDEE_TECH' | 'VALIDEE_COMPTA' | 'COMPTABILISEE' | 'PAYEE';
  statut_paiement: 'NON_PAYEE' | 'PARTIELLEMENT_PAYEE' | 'PAYEE';
  montant_paye?: number;
  montant_restant?: number;
  bon_commande_ref?: string;
  bon_livraison_ref?: string;
  escompte_possible: boolean;
  escompte_montant?: number;
  escompte_pourcentage?: number;
  validation_technique_by?: string;
  validation_technique_date?: string;
  validation_comptable_by?: string;
  validation_comptable_date?: string;
  comptabilisation_date?: string;
  created_at: string;
}

export interface SupplierDocument {
  id: string;
  supplier_id: string;
  type_document: string;
  titre: string;
  description?: string;
  fichier_url: string;
  type_mime: string;
  taille_fichier: number;
  date_expiration?: string;
  uploaded_by: string;
  created_at: string;
}

export interface Echeance {
  id: string;
  supplier_id: string;
  supplier_name: string;
  invoice_id: string;
  invoice_number: string;
  date_echeance: string;
  montant: number;
  montant_paye: number;
  montant_restant: number;
  statut: 'A_VENIR' | 'AUJOURD_HUI' | 'EN_RETARD' | 'PAYEE';
  priorite: 'HAUTE' | 'NORMALE' | 'BASSE';
  escompte_disponible: boolean;
  escompte_montant?: number;
  jours_avant_echeance: number;
}

// --- Dashboard & KPIs ---

export interface SupplierKPIs {
  total_suppliers: number;
  active_suppliers: number;
  new_suppliers_month: number;
  total_payables: number;
  overdue_amount: number;
  current_month_payments: number;
  average_payment_delay: number;
  payment_on_time_rate: number;
  escompte_captured: number;
  escompte_missed: number;
  top_suppliers_count: number;
  concentration_risk_score: number;
}

export interface DashboardStats {
  total_fournisseurs: number;
  fournisseurs_actifs: number;
  total_factures: number;
  factures_en_attente: number;
  total_dette: number;
  total_echeances_mois: number;
  escompte_potentiel: number;
  repartition_categories: Record<string, number>;
  top_fournisseurs: Array<{ name: string; amount: number }>;
}

// --- Analytics ---

export interface ABCAnalysis {
  categories: {
    A: {
      suppliers: Array<{ id: string; name: string; annual_spend: number; percentage: number }>;
      total_amount: number;
      percentage: number;
      count: number;
    };
    B: {
      suppliers: Array<{ id: string; name: string; annual_spend: number; percentage: number }>;
      total_amount: number;
      percentage: number;
      count: number;
    };
    C: {
      suppliers: Array<{ id: string; name: string; annual_spend: number; percentage: number }>;
      total_amount: number;
      percentage: number;
      count: number;
    };
  };
  total_spend: number;
  analysis_date: string;
}

export interface RiskMatrix {
  high_risk: Array<{
    supplier_id: string;
    supplier_name: string;
    risk_score: number;
    risk_factors: string[];
    annual_spend: number;
    recommendation: string;
  }>;
  medium_risk: Array<{
    supplier_id: string;
    supplier_name: string;
    risk_score: number;
    risk_factors: string[];
    annual_spend: number;
  }>;
  low_risk: Array<{
    supplier_id: string;
    supplier_name: string;
    risk_score: number;
    annual_spend: number;
  }>;
}

export interface PaymentOptimization {
  recommended_payments: Array<{
    supplier_id: string;
    supplier_name: string;
    invoice_ids: string[];
    total_amount: number;
    escompte_amount: number;
    net_amount: number;
    due_date: string;
    priority: string;
    roi_percentage: number;
  }>;
  total_optimization: {
    total_payments: number;
    total_escompte: number;
    net_savings: number;
    roi_percentage: number;
  };
  cash_impact: {
    before_optimization: number;
    after_optimization: number;
    difference: number;
  };
}

export interface PerformanceEvaluation {
  id: string;
  supplier_id: string;
  period_start: string;
  period_end: string;
  quality_score: number;
  delivery_score: number;
  service_score: number;
  price_score: number;
  compliance_score: number;
  global_score: number;
  global_rating: string;
  strengths: string;
  weaknesses: string;
  action_plan: string;
  recommendation: string;
  evaluated_by: string;
  evaluation_date: string;
}

export interface ConcentrationAnalysis {
  top_10_suppliers: Array<{
    supplier_name: string;
    annual_spend: number;
    percentage_of_total: number;
  }>;
  concentration_metrics: {
    top_1_percentage: number;
    top_3_percentage: number;
    top_5_percentage: number;
    top_10_percentage: number;
  };
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendations: string[];
}

export interface ROIAnalysis {
  supplier_id: string;
  period_months: number;
  total_spend: number;
  escompte_captured: number;
  escompte_missed: number;
  on_time_delivery_rate: number;
  quality_defect_rate: number;
  total_savings: number;
  total_costs: number;
  net_roi: number;
  roi_percentage: number;
  performance_trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
}

// --- Payment Proposals ---

export interface SmartPaymentProposal {
  proposal_id: string;
  payment_date: string;
  suppliers: Array<{
    supplier_id: string;
    supplier_name: string;
    invoices: Array<{
      invoice_id: string;
      invoice_number: string;
      amount: number;
      escompte: number;
    }>;
    total_amount: number;
    total_escompte: number;
    net_amount: number;
  }>;
  total_payment: number;
  total_escompte: number;
  net_payment: number;
  expected_roi: number;
  cash_impact: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  justification: string;
}

export interface BulkPaymentResult {
  batch_id: string;
  payment_date: string;
  total_suppliers: number;
  total_invoices: number;
  total_amount: number;
  sepa_file_url?: string;
  status: 'PENDING' | 'APPROVED' | 'EXECUTED' | 'FAILED';
  created_at: string;
}

// --- Wise Procure Integration ---

export interface WiseProcureInvoice {
  supplier_code: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount_ht: number;
  vat_amount: number;
  amount_ttc: number;
  purchase_order_ref?: string;
  delivery_receipt_ref?: string;
  ocr_data?: Record<string, unknown>;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
}

// ============================================================================
// CLASSE SERVICE PRINCIPALE
// ============================================================================

class SupplierService {

  // ==========================================================================
  // SECTION 1: CRUD SUPPLIERS (8 méthodes)
  // ==========================================================================

  /**
   * Récupère la liste paginée des fournisseurs
   *
   * @param params - Filtres et pagination
   * @returns Liste paginée de fournisseurs
   *
   * @endpoint GET /api/v1/suppliers/suppliers/
   *
   * @example
   * ```typescript
   * const suppliers = await supplierService.getSuppliers({ page: 1, page_size: 20 });
   * console.log(suppliers.results); // Array<Supplier>
   * ```
   */
  async getSuppliers(params?: {
    page?: number;
    page_size?: number;
    search?: string;
    is_active?: boolean;
    type_fournisseur?: string;
    categorie?: string;
  }): Promise<{ results: Supplier[]; count: number; next: string | null; previous: string | null }> {
    const response = await apiService.get(`${BASE_PATH}/suppliers/`, { params });
    return response.data;
  }

  /**
   * Récupère les détails d'un fournisseur spécifique
   *
   * @param supplierId - UUID du fournisseur
   * @returns Détails complets du fournisseur
   *
   * @endpoint GET /api/v1/suppliers/suppliers/{id}/
   */
  async getSupplier(supplierId: string): Promise<Supplier> {
    const response = await apiService.get(`${BASE_PATH}/suppliers/${supplierId}/`);
    return response.data;
  }

  /**
   * Crée un nouveau fournisseur avec validation
   *
   * @param data - Données du fournisseur
   * @returns Fournisseur créé
   *
   * @endpoint POST /api/v1/suppliers/suppliers/
   */
  async createSupplier(data: {
    legal_name: string;
    supplier_type: string;
    main_address: string;
    city: string;
    country?: string;
    email?: string;
    phone?: string;
    payment_terms?: number;
    iban?: string;
    bic?: string;
    contacts?: Array<{
      first_name: string;
      last_name: string;
      role: string;
      email?: string;
      phone?: string;
    }>;
  }): Promise<Supplier> {
    const response = await apiService.post(`${BASE_PATH}/suppliers/`, data);
    return response.data;
  }

  /**
   * Met à jour un fournisseur existant
   *
   * @param supplierId - UUID du fournisseur
   * @param data - Données à mettre à jour
   * @returns Fournisseur mis à jour
   *
   * @endpoint PATCH /api/v1/suppliers/suppliers/{id}/
   */
  async updateSupplier(supplierId: string, data: Partial<Supplier>): Promise<Supplier> {
    const response = await apiService.patch(`${BASE_PATH}/suppliers/${supplierId}/`, data);
    return response.data;
  }

  /**
   * Supprime un fournisseur
   *
   * @param supplierId - UUID du fournisseur
   *
   * @endpoint DELETE /api/v1/suppliers/suppliers/{id}/
   */
  async deleteSupplier(supplierId: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/suppliers/${supplierId}/`);
  }

  /**
   * Recherche avancée de fournisseurs
   *
   * @param query - Texte de recherche
   * @param filters - Filtres additionnels
   * @returns Résultats de recherche
   *
   * @endpoint POST /api/v1/suppliers/suppliers/search/
   */
  async searchSuppliers(query: string, filters?: {
    type_fournisseur?: string[];
    categorie?: string[];
    tags?: string[];
    performance_min?: number;
  }): Promise<{ results: Supplier[] }> {
    const response = await apiService.post(`${BASE_PATH}/suppliers/search/`, {
      query,
      ...filters
    });
    return response.data;
  }

  /**
   * Évalue un fournisseur (création d'évaluation rapide)
   *
   * @param supplierId - UUID du fournisseur
   * @param data - Données d'évaluation
   * @returns Résultat de l'évaluation
   *
   * @endpoint POST /api/v1/suppliers/suppliers/{id}/evaluer/
   */
  async evaluateSupplier(supplierId: string, data: {
    quality_score: number;
    delivery_score: number;
    service_score: number;
    comments?: string;
  }): Promise<{ message: string; evaluation: PerformanceEvaluation }> {
    const response = await apiService.post(`${BASE_PATH}/suppliers/${supplierId}/evaluer/`, data);
    return response.data;
  }

  /**
   * Valide le SIRET d'un fournisseur
   *
   * @param supplierId - UUID du fournisseur
   * @returns Résultat de la validation
   *
   * @endpoint POST /api/v1/suppliers/suppliers/{id}/valider-siret/
   */
  async validateSiret(supplierId: string): Promise<{
    valid: boolean;
    company_data?: Record<string, unknown>;
    message: string;
  }> {
    const response = await apiService.post(`${BASE_PATH}/suppliers/${supplierId}/valider-siret/`);
    return response.data;
  }

  // ==========================================================================
  // SECTION 2: CRUD INVOICES (9 méthodes)
  // ==========================================================================

  /**
   * Récupère la liste des factures fournisseurs
   *
   * @param params - Filtres et pagination
   * @returns Liste paginée de factures
   *
   * @endpoint GET /api/v1/suppliers/invoices/
   */
  async getInvoices(params?: {
    page?: number;
    page_size?: number;
    supplier_id?: string;
    statut?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<{ results: SupplierInvoice[]; count: number }> {
    const response = await apiService.get(`${BASE_PATH}/invoices/`, { params });
    return response.data;
  }

  /**
   * Récupère les détails d'une facture
   *
   * @param invoiceId - UUID de la facture
   * @returns Détails de la facture
   *
   * @endpoint GET /api/v1/suppliers/invoices/{id}/
   */
  async getInvoice(invoiceId: string): Promise<SupplierInvoice> {
    const response = await apiService.get(`${BASE_PATH}/invoices/${invoiceId}/`);
    return response.data;
  }

  /**
   * Crée une nouvelle facture fournisseur
   *
   * @param data - Données de la facture
   * @returns Facture créée
   *
   * @endpoint POST /api/v1/suppliers/invoices/
   */
  async createInvoice(data: {
    supplier_id: string;
    numero_facture: string;
    date_facture: string;
    date_echeance: string;
    montant_ht: number;
    montant_tva: number;
    montant_ttc: number;
    devise?: string;
    bon_commande_ref?: string;
    ligne_items?: Array<{
      description: string;
      quantite: number;
      prix_unitaire: number;
      montant: number;
    }>;
  }): Promise<SupplierInvoice> {
    const response = await apiService.post(`${BASE_PATH}/invoices/`, data);
    return response.data;
  }

  /**
   * Met à jour une facture fournisseur
   *
   * @param invoiceId - UUID de la facture
   * @param data - Données à mettre à jour
   * @returns Facture mise à jour
   *
   * @endpoint PATCH /api/v1/suppliers/invoices/{id}/
   */
  async updateInvoice(invoiceId: string, data: Partial<SupplierInvoice>): Promise<SupplierInvoice> {
    const response = await apiService.patch(`${BASE_PATH}/invoices/${invoiceId}/`, data);
    return response.data;
  }

  /**
   * Supprime une facture fournisseur
   *
   * @param invoiceId - UUID de la facture
   *
   * @endpoint DELETE /api/v1/suppliers/invoices/{id}/
   */
  async deleteInvoice(invoiceId: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/invoices/${invoiceId}/`);
  }

  /**
   * Validation technique d'une facture
   *
   * @param invoiceId - UUID de la facture
   * @param data - Données de validation
   * @returns Facture validée
   *
   * @endpoint POST /api/v1/suppliers/invoices/{id}/valider-technique/
   */
  async validateInvoiceTechnical(invoiceId: string, data?: {
    comments?: string;
    approved: boolean;
  }): Promise<{ message: string; invoice: SupplierInvoice }> {
    const response = await apiService.post(`${BASE_PATH}/invoices/${invoiceId}/valider-technique/`, data || { approved: true });
    return response.data;
  }

  /**
   * Validation comptable d'une facture
   *
   * @param invoiceId - UUID de la facture
   * @param data - Données de validation
   * @returns Facture validée
   *
   * @endpoint POST /api/v1/suppliers/invoices/{id}/valider-comptable/
   */
  async validateInvoiceAccounting(invoiceId: string, data?: {
    comments?: string;
    approved: boolean;
    imputation_comptable?: string;
  }): Promise<{ message: string; invoice: SupplierInvoice }> {
    const response = await apiService.post(`${BASE_PATH}/invoices/${invoiceId}/valider-comptable/`, data || { approved: true });
    return response.data;
  }

  /**
   * Comptabilisation d'une facture (enregistrement en écritures)
   *
   * @param invoiceId - UUID de la facture
   * @param data - Données de comptabilisation
   * @returns Facture comptabilisée
   *
   * @endpoint POST /api/v1/suppliers/invoices/{id}/comptabiliser/
   */
  async accountInvoice(invoiceId: string, data?: {
    journal_id?: string;
    date_comptabilisation?: string;
  }): Promise<{ message: string; invoice: SupplierInvoice; ecriture_id?: string }> {
    const response = await apiService.post(`${BASE_PATH}/invoices/${invoiceId}/comptabiliser/`, data || {});
    return response.data;
  }

  /**
   * Marque une facture comme payée
   *
   * @param invoiceId - UUID de la facture
   * @param data - Données de paiement
   * @returns Facture mise à jour
   *
   * @endpoint POST /api/v1/suppliers/invoices/{id}/mark-paid/
   */
  async markInvoicePaid(invoiceId: string, data: {
    payment_date: string;
    payment_amount: number;
    payment_method: string;
    bank_account_id?: string;
    reference?: string;
  }): Promise<{ message: string; invoice: SupplierInvoice }> {
    const response = await apiService.post(`${BASE_PATH}/invoices/${invoiceId}/mark-paid/`, data);
    return response.data;
  }

  // ==========================================================================
  // SECTION 3: CRUD DOCUMENTS (6 méthodes)
  // ==========================================================================

  /**
   * Récupère la liste des documents fournisseurs
   *
   * @param params - Filtres optionnels
   * @returns Liste paginée de documents
   *
   * @endpoint GET /api/v1/suppliers/documents/
   */
  async getDocuments(params?: {
    supplier_id?: string;
    type_document?: string;
  }): Promise<{ results: SupplierDocument[]; count: number }> {
    const response = await apiService.get(`${BASE_PATH}/documents/`, { params });
    return response.data;
  }

  /**
   * Upload un nouveau document pour un fournisseur
   *
   * @param data - Données du document avec fichier
   * @returns Document créé
   *
   * @endpoint POST /api/v1/suppliers/documents/
   */
  async uploadDocument(data: {
    supplier_id: string;
    type_document: string;
    titre: string;
    description?: string;
    fichier: File;
    date_expiration?: string;
  }): Promise<SupplierDocument> {
    const formData = new FormData();
    formData.append('supplier_id', data.supplier_id);
    formData.append('type_document', data.type_document);
    formData.append('titre', data.titre);
    if (data.description) formData.append('description', data.description);
    formData.append('fichier', data.fichier);
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
   * @endpoint GET /api/v1/suppliers/documents/{id}/download/
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
   * @endpoint PATCH /api/v1/suppliers/documents/{id}/
   */
  async updateDocument(documentId: string, data: Partial<SupplierDocument>): Promise<SupplierDocument> {
    const response = await apiService.patch(`${BASE_PATH}/documents/${documentId}/`, data);
    return response.data;
  }

  /**
   * Supprime un document
   *
   * @param documentId - UUID du document
   *
   * @endpoint DELETE /api/v1/suppliers/documents/{id}/
   */
  async deleteDocument(documentId: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/documents/${documentId}/`);
  }

  /**
   * Récupère les documents expirés ou proches d'expiration
   *
   * @param params - Paramètres de recherche
   * @returns Liste des documents expirés
   *
   * @endpoint GET /api/v1/suppliers/documents/expires/
   */
  async getExpiredDocuments(params?: {
    days_before?: number;
  }): Promise<{ results: SupplierDocument[] }> {
    const response = await apiService.get(`${BASE_PATH}/documents/expires/`, { params });
    return response.data;
  }

  // ==========================================================================
  // SECTION 4: DASHBOARD & KPIs (5 méthodes)
  // ==========================================================================

  /**
   * Récupère les statistiques du dashboard fournisseurs
   *
   * @returns Statistiques globales
   *
   * @endpoint GET /api/v1/suppliers/suppliers/dashboard-stats/
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiService.get(`${BASE_PATH}/suppliers/dashboard-stats/`);
    return response.data;
  }

  /**
   * Récupère les KPIs fournisseurs en temps réel
   *
   * @param params - Filtres pour le calcul des KPIs
   * @returns KPIs calculés en temps réel
   *
   * @endpoint GET /api/v1/suppliers/analytics/kpis/
   */
  async getKPIs(params?: {
    companyId?: string;
    fiscalYearId?: string;
    period?: string;
    supplierType?: string;
    paymentStatus?: string;
    performanceLevel?: string;
  }): Promise<SupplierKPIs> {
    const response = await apiService.get(`${BASE_PATH}/analytics/kpis/`, {
      params: {
        company_id: params?.companyId,
        fiscal_year_id: params?.fiscalYearId,
        ...params
      }
    });
    return response.data;
  }

  /**
   * Analytics fournisseurs avancées
   *
   * @param params - Paramètres d'analyse
   * @returns Données d'analytics
   *
   * @endpoint GET /api/v1/suppliers/analytics/analytics/
   */
  async getAnalytics(params?: {
    companyId?: string;
    filters?: Record<string, unknown>;
  }): Promise<Record<string, unknown>> {
    const response = await apiService.get(`${BASE_PATH}/analytics/analytics/`, {
      params: {
        company_id: params?.companyId,
        ...params?.filters
      }
    });
    return response.data;
  }

  /**
   * Données de performance fournisseurs
   *
   * @param params - Paramètres de performance
   * @returns Métriques de performance
   *
   * @endpoint GET /api/v1/suppliers/analytics/performance/
   */
  async getPerformanceData(params?: {
    companyId?: string;
    fiscalYearId?: string;
  }): Promise<Record<string, unknown>> {
    const response = await apiService.get(`${BASE_PATH}/analytics/performance/`, {
      params: {
        company_id: params?.companyId,
        fiscal_year_id: params?.fiscalYearId
      }
    });
    return response.data;
  }

  /**
   * Métriques temps réel pour monitoring
   *
   * @param companyId - UUID de la société
   * @returns Métriques en temps réel
   *
   * @endpoint GET /api/v1/suppliers/analytics/realtime-metrics/
   */
  async getRealtimeMetrics(companyId: string): Promise<Record<string, unknown>> {
    const response = await apiService.get(`${BASE_PATH}/analytics/realtime-metrics/`, {
      params: { company_id: companyId }
    });
    return response.data;
  }

  // ==========================================================================
  // SECTION 5: ANALYTICS FOURNISSEURS (7 méthodes)
  // ==========================================================================

  /**
   * Analyse ABC des fournisseurs
   *
   * @param params - Paramètres de l'analyse
   * @returns Analyse ABC
   *
   * @endpoint GET /api/v1/suppliers/analytics/abc/
   */
  async getABCAnalysis(params?: {
    companyId?: string;
    fiscalYearId?: string;
  }): Promise<ABCAnalysis> {
    const response = await apiService.get(`${BASE_PATH}/analytics/abc/`, {
      params: {
        company_id: params?.companyId,
        fiscal_year_id: params?.fiscalYearId
      }
    });
    return response.data;
  }

  /**
   * Matrice des risques fournisseurs
   *
   * @param params - Paramètres de l'analyse
   * @returns Matrice des risques
   *
   * @endpoint GET /api/v1/suppliers/analytics/matrice-risques/
   */
  async getRiskMatrix(params?: {
    companyId?: string;
  }): Promise<RiskMatrix> {
    const response = await apiService.get(`${BASE_PATH}/analytics/matrice-risques/`, {
      params: {
        company_id: params?.companyId
      }
    });
    return response.data;
  }

  /**
   * Indicateurs clés fournisseurs
   *
   * @param params - Paramètres de l'analyse
   * @returns Indicateurs clés
   *
   * @endpoint GET /api/v1/suppliers/analytics/indicateurs/
   */
  async getKeyIndicators(params?: {
    companyId?: string;
    fiscalYearId?: string;
  }): Promise<Record<string, unknown>> {
    const response = await apiService.get(`${BASE_PATH}/analytics/indicateurs/`, {
      params: {
        company_id: params?.companyId,
        fiscal_year_id: params?.fiscalYearId
      }
    });
    return response.data;
  }

  /**
   * Rapport personnalisé fournisseurs
   *
   * @param config - Configuration du rapport
   * @returns Rapport généré
   *
   * @endpoint POST /api/v1/suppliers/analytics/rapport-personnalise/
   */
  async generateCustomReport(config: {
    companyId: string;
    metrics: string[];
    dimensions: string[];
    filters: Record<string, unknown>;
    date_range: { from: string; to: string };
  }): Promise<Record<string, unknown>> {
    const response = await apiService.post(`${BASE_PATH}/analytics/rapport-personnalise/`, config);
    return response.data;
  }

  /**
   * Analyse de concentration fournisseurs
   *
   * @param params - Paramètres de l'analyse
   * @returns Analyse de concentration
   *
   * @endpoint GET /api/v1/suppliers/analytics/concentration-analysis/
   */
  async getConcentrationAnalysis(params?: {
    companyId?: string;
  }): Promise<ConcentrationAnalysis> {
    const response = await apiService.get(`${BASE_PATH}/analytics/concentration-analysis/`, {
      params: {
        company_id: params?.companyId
      }
    });
    return response.data;
  }

  /**
   * Calcul ROI fournisseur
   *
   * @param params - Paramètres du calcul
   * @returns Analyse ROI
   *
   * @endpoint GET /api/v1/suppliers/analytics/roi-analysis/
   */
  async getROIAnalysis(params: {
    supplierId: string;
    periodMonths?: number;
  }): Promise<ROIAnalysis> {
    const response = await apiService.get(`${BASE_PATH}/analytics/roi-analysis/`, {
      params: {
        supplier_id: params.supplierId,
        period_months: params.periodMonths
      }
    });
    return response.data;
  }

  /**
   * Alertes contrats et échéances
   *
   * @param params - Paramètres de recherche
   * @returns Alertes
   *
   * @endpoint GET /api/v1/suppliers/analytics/contract-alerts/
   */
  async getContractAlerts(params?: {
    companyId?: string;
  }): Promise<Array<{
    type: string;
    severity: string;
    supplier_id: string;
    supplier_name: string;
    message: string;
    action_required: string;
    due_date?: string;
  }>> {
    const response = await apiService.get(`${BASE_PATH}/analytics/contract-alerts/`, {
      params: {
        company_id: params?.companyId
      }
    });
    return response.data;
  }

  // ==========================================================================
  // SECTION 6: GESTION DES ÉCHÉANCES (8 méthodes)
  // ==========================================================================

  /**
   * Tableau de bord des échéances fournisseurs
   *
   * @param params - Filtres optionnels
   * @returns Vue d'ensemble des échéances
   *
   * @endpoint GET /api/v1/suppliers/echeances/tableau-bord/
   */
  async getEcheancesDashboard(params?: {
    companyId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{
    total_echeances: number;
    total_montant: number;
    echeances_jour: number;
    echeances_semaine: number;
    echeances_mois: number;
    retards: number;
    retards_montant: number;
    par_statut: Record<string, number>;
    par_priorite: Record<string, number>;
  }> {
    const response = await apiService.get(`${BASE_PATH}/echeances/tableau-bord/`, {
      params: {
        company_id: params?.companyId,
        date_from: params?.dateFrom,
        date_to: params?.dateTo
      }
    });
    return response.data;
  }

  /**
   * Échéances du jour
   *
   * @param params - Filtres optionnels
   * @returns Échéances du jour
   *
   * @endpoint GET /api/v1/suppliers/echeances/jour/
   */
  async getEcheancesJour(params?: {
    companyId?: string;
  }): Promise<{ results: Echeance[] }> {
    const response = await apiService.get(`${BASE_PATH}/echeances/jour/`, {
      params: {
        company_id: params?.companyId
      }
    });
    return response.data;
  }

  /**
   * Planification des paiements
   *
   * @param data - Données de planification
   * @returns Résultat de la planification
   *
   * @endpoint POST /api/v1/suppliers/echeances/planifier-paiements/
   */
  async planifyPayments(data: {
    companyId: string;
    echeance_ids: string[];
    payment_date: string;
    payment_method: string;
    bank_account_id?: string;
  }): Promise<{
    planned: boolean;
    total_amount: number;
    payment_count: number;
    payment_date: string;
  }> {
    const response = await apiService.post(`${BASE_PATH}/echeances/planifier-paiements/`, data);
    return response.data;
  }

  /**
   * Génération virement SEPA
   *
   * @param data - Données du virement
   * @returns Fichier SEPA généré
   *
   * @endpoint POST /api/v1/suppliers/echeances/generer-sepa/
   */
  async generateSEPATransfer(data: {
    companyId: string;
    payment_ids: string[];
    execution_date: string;
    debtor_account_iban: string;
  }): Promise<{
    sepa_file_url: string;
    total_amount: number;
    payment_count: number;
    file_name: string;
  }> {
    const response = await apiService.post(`${BASE_PATH}/echeances/generer-sepa/`, data);
    return response.data;
  }

  /**
   * Échéancier global optimisé
   *
   * @param params - Paramètres de l'échéancier
   * @returns Échéancier
   *
   * @endpoint GET /api/v1/suppliers/analytics/payment-schedule/
   */
  async getPaymentSchedule(params?: {
    companyId?: string;
    forecastDays?: number;
    includeOptimizations?: boolean;
  }): Promise<Record<string, unknown>> {
    const response = await apiService.get(`${BASE_PATH}/analytics/payment-schedule/`, {
      params: {
        company_id: params?.companyId,
        forecast_days: params?.forecastDays || 90,
        include_optimizations: params?.includeOptimizations
      }
    });
    return response.data;
  }

  /**
   * Calcul automatique des encours fournisseurs
   *
   * @param companyId - UUID de la société
   * @returns Résultat du recalcul
   *
   * @endpoint POST /api/v1/suppliers/echeances/refresh-outstanding/
   */
  async refreshOutstandingBalances(companyId: string): Promise<{
    refreshed: boolean;
    timestamp: string;
  }> {
    const response = await apiService.post(`${BASE_PATH}/echeances/refresh-outstanding/`, {
      company_id: companyId
    });
    return response.data;
  }

  /**
   * Import en masse de factures fournisseurs
   *
   * @param data - Données d'import
   * @returns Résultats de l'import
   *
   * @endpoint POST /api/v1/suppliers/suppliers/import/
   */
  async importSuppliers(data: {
    fichier: File;
    format_fichier: 'CSV' | 'EXCEL';
    mapping_colonnes?: Record<string, string>;
    ignorer_erreurs: boolean;
  }): Promise<{
    message: string;
    statistiques: {
      total_lignes: number;
      importes: number;
      erreurs: number;
    };
  }> {
    const formData = new FormData();
    formData.append('fichier', data.fichier);
    formData.append('format_fichier', data.format_fichier);
    if (data.mapping_colonnes) formData.append('mapping_colonnes', JSON.stringify(data.mapping_colonnes));
    formData.append('ignorer_erreurs', String(data.ignorer_erreurs));

    const response = await apiService.post(`${BASE_PATH}/suppliers/import/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  /**
   * Export de fournisseurs avec personnalisation
   *
   * @param params - Paramètres d'export
   * @returns Fichier exporté (téléchargement automatique)
   *
   * @endpoint POST /api/v1/suppliers/suppliers/export/
   */
  async exportSuppliers(params: {
    format_export: 'CSV' | 'EXCEL' | 'PDF';
    filtres?: Record<string, unknown>;
    colonnes?: string[];
  }): Promise<void> {
    const response = await apiService.post(`${BASE_PATH}/suppliers/export/`, params, {
      responseType: 'blob'
    });

    // Téléchargement automatique
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    const ext = params.format_export.toLowerCase();
    link.setAttribute('download', `fournisseurs-export-${new Date().toISOString().split('T')[0]}.${ext}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  // ==========================================================================
  // SECTION 7: OPTIMISATION DES PAIEMENTS (7 méthodes)
  // ==========================================================================

  /**
   * Optimisation des paiements avec propositions intelligentes
   *
   * @param params - Paramètres d'optimisation
   * @returns Propositions d'optimisation
   *
   * @endpoint GET /api/v1/suppliers/analytics/payment-optimization/
   */
  async getPaymentOptimization(params?: {
    companyId?: string;
    filters?: Record<string, unknown>;
    forecastDays?: number;
    maxAmount?: number;
  }): Promise<PaymentOptimization> {
    const response = await apiService.get(`${BASE_PATH}/analytics/payment-optimization/`, {
      params: {
        company_id: params?.companyId,
        forecast_days: params?.forecastDays,
        max_amount: params?.maxAmount,
        ...params?.filters
      }
    });
    return response.data;
  }

  /**
   * Opportunités d'escompte disponibles
   *
   * @param params - Paramètres de recherche
   * @returns Opportunités d'escompte
   *
   * @endpoint GET /api/v1/suppliers/analytics/discount-opportunities/
   */
  async getDiscountOpportunities(params?: {
    companyId?: string;
  }): Promise<Array<{
    supplier_id: string;
    supplier_name: string;
    invoice_id: string;
    invoice_number: string;
    invoice_amount: number;
    discount_amount: number;
    discount_percentage: number;
    discount_deadline: string;
    days_remaining: number;
    roi_percentage: number;
  }>> {
    const response = await apiService.get(`${BASE_PATH}/analytics/discount-opportunities/`, {
      params: {
        company_id: params?.companyId
      }
    });
    return response.data;
  }

  /**
   * Propositions de paiement automatiques (Smart Payment)
   *
   * @param params - Paramètres de génération
   * @returns Propositions intelligentes
   *
   * @endpoint GET /api/v1/suppliers/analytics/smart-payment-proposals/
   */
  async getSmartPaymentProposals(params?: {
    companyId?: string;
    paymentDate?: string;
    maxAmount?: number;
    prioritizeDiscounts?: boolean;
  }): Promise<{ proposals: SmartPaymentProposal[] }> {
    const response = await apiService.get(`${BASE_PATH}/analytics/smart-payment-proposals/`, {
      params: {
        company_id: params?.companyId,
        payment_date: params?.paymentDate,
        max_amount: params?.maxAmount,
        prioritize_discounts: params?.prioritizeDiscounts
      }
    });
    return response.data;
  }

  /**
   * Exécution d'une proposition de paiement
   *
   * @param data - Données d'exécution
   * @returns Résultat de l'exécution
   *
   * @endpoint POST /api/v1/suppliers/analytics/execute-payment/
   */
  async executePaymentProposal(data: {
    proposalId: string;
    companyId: string;
    approvalNotes?: string;
  }): Promise<{
    executed: boolean;
    payment_batch_id: string;
    total_amount: number;
    timestamp: string;
  }> {
    const response = await apiService.post(`${BASE_PATH}/analytics/execute-payment/`, data);
    return response.data;
  }

  /**
   * Génération virement en masse
   *
   * @param data - Données du virement masse
   * @returns Résultat de la génération
   *
   * @endpoint POST /api/v1/suppliers/analytics/bulk-payment/
   */
  async generateBulkPayment(data: {
    companyId: string;
    paymentDate: string;
    supplierPayments: Array<{
      supplierId: string;
      invoiceIds: string[];
      totalAmount: number;
      discountAmount?: number;
    }>;
  }): Promise<BulkPaymentResult> {
    const response = await apiService.post(`${BASE_PATH}/analytics/bulk-payment/`, data);
    return response.data;
  }

  /**
   * Simulation impact des paiements sur trésorerie
   *
   * @param data - Scénarios de paiement
   * @returns Impact simulé
   *
   * @endpoint POST /api/v1/suppliers/analytics/simulate-payment-impact/
   */
  async simulatePaymentImpact(data: {
    companyId: string;
    paymentScenarios: Array<{
      supplierId: string;
      amount: number;
      paymentDate: string;
      applyDiscount: boolean;
    }>;
  }): Promise<{
    scenarios: Array<{
      scenario_id: string;
      cash_before: number;
      cash_after: number;
      impact: number;
      discount_captured: number;
      roi: number;
    }>;
    recommendations: string[];
  }> {
    const response = await apiService.post(`${BASE_PATH}/analytics/simulate-payment-impact/`, data);
    return response.data;
  }

  /**
   * Historique des optimisations de paiement
   *
   * @param params - Paramètres de recherche
   * @returns Historique
   *
   * @endpoint GET /api/v1/suppliers/analytics/optimization-history/
   */
  async getOptimizationHistory(params?: {
    companyId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<Array<{
    date: string;
    total_optimized: number;
    discount_captured: number;
    payments_count: number;
    roi_percentage: number;
  }>> {
    const response = await apiService.get(`${BASE_PATH}/analytics/optimization-history/`, {
      params: {
        company_id: params?.companyId,
        date_from: params?.dateFrom,
        date_to: params?.dateTo
      }
    });
    return response.data;
  }

  // ==========================================================================
  // SECTION 8: ÉVALUATION PERFORMANCE (6 méthodes)
  // ==========================================================================

  /**
   * Crée une évaluation complète de performance fournisseur
   *
   * @param data - Données d'évaluation
   * @returns Évaluation créée
   *
   * @endpoint POST /api/v1/suppliers/evaluations/
   */
  async createPerformanceEvaluation(data: {
    supplierId: string;
    evaluationType: string;
    periodStart: string;
    periodEnd: string;
    qualityScore: number;
    deliveryScore: number;
    serviceScore: number;
    priceScore: number;
    complianceScore: number;
    strengths?: string;
    weaknesses?: string;
    actionPlan?: string;
    recommendation: string;
  }): Promise<PerformanceEvaluation> {
    const response = await apiService.post(`${BASE_PATH}/evaluations/`, data);
    return response.data;
  }

  /**
   * Récupère l'historique des évaluations d'un fournisseur
   *
   * @param supplierId - UUID du fournisseur
   * @returns Liste des évaluations
   *
   * @endpoint GET /api/v1/suppliers/suppliers/{id}/evaluations/
   */
  async getEvaluationHistory(supplierId: string): Promise<{ results: PerformanceEvaluation[] }> {
    const response = await apiService.get(`${BASE_PATH}/suppliers/${supplierId}/evaluations/`);
    return response.data;
  }

  /**
   * Met à jour une évaluation existante
   *
   * @param evaluationId - UUID de l'évaluation
   * @param data - Données à mettre à jour
   * @returns Évaluation mise à jour
   *
   * @endpoint PATCH /api/v1/suppliers/evaluations/{id}/
   */
  async updateEvaluation(evaluationId: string, data: Partial<PerformanceEvaluation>): Promise<PerformanceEvaluation> {
    const response = await apiService.patch(`${BASE_PATH}/evaluations/${evaluationId}/`, data);
    return response.data;
  }

  /**
   * Supprime une évaluation
   *
   * @param evaluationId - UUID de l'évaluation
   *
   * @endpoint DELETE /api/v1/suppliers/evaluations/{id}/
   */
  async deleteEvaluation(evaluationId: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/evaluations/${evaluationId}/`);
  }

  /**
   * Génère un rapport de performance global
   *
   * @param params - Paramètres du rapport
   * @returns Rapport de performance
   *
   * @endpoint GET /api/v1/suppliers/analytics/performance-report/
   */
  async generatePerformanceReport(params: {
    companyId: string;
    dateFrom: string;
    dateTo: string;
    includeEvaluations?: boolean;
  }): Promise<Record<string, unknown>> {
    const response = await apiService.get(`${BASE_PATH}/analytics/performance-report/`, {
      params: {
        company_id: params.companyId,
        date_from: params.dateFrom,
        date_to: params.dateTo,
        include_evaluations: params.includeEvaluations
      }
    });
    return response.data;
  }

  /**
   * Calcule le score de performance automatique
   *
   * @param supplierId - UUID du fournisseur
   * @param params - Paramètres de calcul
   * @returns Score calculé
   *
   * @endpoint POST /api/v1/suppliers/suppliers/{id}/calculate-score/
   */
  async calculatePerformanceScore(supplierId: string, params?: {
    periodMonths?: number;
  }): Promise<{
    overall_score: number;
    quality_score: number;
    delivery_score: number;
    service_score: number;
    price_score: number;
    rating: string;
  }> {
    const response = await apiService.post(`${BASE_PATH}/suppliers/${supplierId}/calculate-score/`, params || {});
    return response.data;
  }

  // ==========================================================================
  // SECTION 9: LETTRAGE FOURNISSEURS (4 méthodes)
  // ==========================================================================

  /**
   * Lettrage automatique global de tous les fournisseurs
   *
   * @param params - Paramètres du lettrage
   * @returns Résultat du lettrage
   *
   * @endpoint POST /api/v1/suppliers/lettrage/automatique-global/
   */
  async lettrageAutomatiqueGlobal(params: {
    companyId: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{
    matched_count: number;
    total_amount: number;
    details: Array<{ invoice_id: string; payment_id: string; amount: number }>;
  }> {
    const response = await apiService.post(`${BASE_PATH}/lettrage/automatique-global/`, params);
    return response.data;
  }

  /**
   * Lettrage automatique pour un fournisseur spécifique
   *
   * @param data - Données du lettrage
   * @returns Résultat du lettrage
   *
   * @endpoint POST /api/v1/suppliers/lettrage/fournisseur/
   */
  async lettrageFournisseur(data: {
    supplierId: string;
    companyId: string;
  }): Promise<{
    matched_count: number;
    total_amount: number;
    details: Array<{ invoice_id: string; payment_id: string; amount: number }>;
  }> {
    const response = await apiService.post(`${BASE_PATH}/lettrage/fournisseur/`, data);
    return response.data;
  }

  /**
   * Propositions de lettrage intelligentes
   *
   * @param params - Paramètres de recherche
   * @returns Propositions de lettrage
   *
   * @endpoint POST /api/v1/suppliers/lettrage/propositions/
   */
  async getLettragePropositions(params: {
    supplierId?: string;
    companyId: string;
  }): Promise<{
    proposals: Array<{
      invoice_id: string;
      payment_id: string;
      amount: number;
      confidence_score: number;
    }>;
  }> {
    const response = await apiService.post(`${BASE_PATH}/lettrage/propositions/`, params);
    return response.data;
  }

  /**
   * Exécute un lettrage manuel
   *
   * @param data - Données du lettrage manuel
   * @returns Résultat de l'exécution
   *
   * @endpoint POST /api/v1/suppliers/lettrage/executer-manuel/
   */
  async executeLettrageManuel(data: {
    companyId: string;
    matches: Array<{
      invoice_id: string;
      payment_id: string;
      amount: number;
    }>;
  }): Promise<{
    matched_count: number;
    total_amount: number;
  }> {
    const response = await apiService.post(`${BASE_PATH}/lettrage/executer-manuel/`, data);
    return response.data;
  }

  // ==========================================================================
  // SECTION 10: ANALYSE ABC & RISQUES (5 méthodes déjà dans Section 5)
  // ==========================================================================
  // Les méthodes getABCAnalysis, getRiskMatrix, etc. sont déjà définies

  // ==========================================================================
  // SECTION 11: INTÉGRATION WISE PROCURE (5 méthodes)
  // ==========================================================================

  /**
   * Synchronisation avec Wise Procure
   *
   * @param params - Paramètres de synchronisation
   * @returns Résultat de la synchronisation
   *
   * @endpoint POST /api/v1/suppliers/wise-procure/sync/
   */
  async syncWithWiseProcure(params: {
    companyId: string;
  }): Promise<{
    synced: boolean;
    invoices_imported: number;
    suppliers_updated: number;
    timestamp: string;
  }> {
    const response = await apiService.post(`${BASE_PATH}/wise-procure/sync/`, params);
    return response.data;
  }

  /**
   * Traitement facture depuis Wise Procure
   *
   * @param data - Données de la facture Wise Procure
   * @returns Facture créée dans Atlas Finance
   *
   * @endpoint POST /api/v1/suppliers/wise-procure/process-invoice/
   */
  async processWiseProcureInvoice(data: {
    companyId: string;
    wiseProcureData: WiseProcureInvoice;
  }): Promise<{
    invoice_id: string;
    invoice_number: string;
    created: boolean;
    message: string;
  }> {
    const response = await apiService.post(`${BASE_PATH}/wise-procure/process-invoice/`, data);
    return response.data;
  }

  /**
   * Récupère le statut de synchronisation Wise Procure
   *
   * @param companyId - UUID de la société
   * @returns Statut de la synchronisation
   *
   * @endpoint GET /api/v1/suppliers/wise-procure/status/
   */
  async getWiseProcureStatus(companyId: string): Promise<{
    connected: boolean;
    last_sync: string;
    pending_invoices: number;
    sync_errors: number;
  }> {
    const response = await apiService.get(`${BASE_PATH}/wise-procure/status/`, {
      params: { company_id: companyId }
    });
    return response.data;
  }

  /**
   * Configuration de l'intégration Wise Procure
   *
   * @param data - Configuration
   * @returns Confirmation
   *
   * @endpoint POST /api/v1/suppliers/wise-procure/configure/
   */
  async configureWiseProcure(data: {
    companyId: string;
    apiKey: string;
    apiSecret: string;
    autoSync: boolean;
    syncFrequency: 'hourly' | 'daily' | 'manual';
  }): Promise<{
    configured: boolean;
    message: string;
  }> {
    const response = await apiService.post(`${BASE_PATH}/wise-procure/configure/`, data);
    return response.data;
  }

  /**
   * Récupère l'historique des synchronisations Wise Procure
   *
   * @param params - Paramètres de recherche
   * @returns Historique
   *
   * @endpoint GET /api/v1/suppliers/wise-procure/sync-history/
   */
  async getWiseProcureSyncHistory(params?: {
    companyId?: string;
    limit?: number;
  }): Promise<Array<{
    sync_date: string;
    invoices_imported: number;
    suppliers_updated: number;
    errors: number;
    status: string;
  }>> {
    const response = await apiService.get(`${BASE_PATH}/wise-procure/sync-history/`, {
      params: {
        company_id: params?.companyId,
        limit: params?.limit || 50
      }
    });
    return response.data;
  }

  // ==========================================================================
  // SECTION 12: EXPORTS & RAPPORTS (6 méthodes)
  // ==========================================================================

  /**
   * Export du dashboard en PDF/Excel
   *
   * @param params - Paramètres d'export
   * @returns URL de téléchargement
   *
   * @endpoint GET /api/v1/suppliers/analytics/export-dashboard/
   */
  async exportDashboard(params: {
    companyId: string;
    fiscalYearId?: string;
    filters?: Record<string, unknown>;
    format: 'pdf' | 'excel';
    view: string;
  }): Promise<{
    download_url: string;
    format: string;
    generated_at: string;
  }> {
    const response = await apiService.get(`${BASE_PATH}/analytics/export-dashboard/`, {
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
   * Génère un rapport de synthèse fournisseurs en PDF
   *
   * @param params - Paramètres du rapport
   * @returns URL de téléchargement
   *
   * @endpoint GET /api/v1/suppliers/reports/synthesis/
   */
  async generateSynthesisReport(params: {
    companyId: string;
    fiscalYearId?: string;
    includeCharts: boolean;
    includeEvaluations: boolean;
  }): Promise<{ download_url: string; generated_at: string }> {
    const response = await apiService.get(`${BASE_PATH}/reports/synthesis/`, {
      params: {
        company_id: params.companyId,
        fiscal_year_id: params.fiscalYearId,
        include_charts: params.includeCharts,
        include_evaluations: params.includeEvaluations
      }
    });
    return response.data;
  }

  /**
   * Export des KPIs en CSV pour analyse externe
   *
   * @param params - Paramètres de l'export
   * @returns Fichier CSV (téléchargement automatique)
   *
   * @endpoint GET /api/v1/suppliers/exports/kpis/
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
    link.setAttribute('download', `kpis-fournisseurs-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  /**
   * Export de la balance âgée fournisseurs en Excel
   *
   * @param params - Paramètres de l'export
   * @returns Fichier Excel (téléchargement automatique)
   *
   * @endpoint GET /api/v1/suppliers/exports/aging-balance/
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
    link.setAttribute('download', `balance-agee-fournisseurs-${new Date().toISOString().split('T')[0]}.xlsx`);
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
   * @endpoint POST /api/v1/suppliers/reports/schedule/
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

  /**
   * Génère un livre des achats (journal officiel)
   *
   * @param params - Paramètres du livre
   * @returns Livre des achats
   *
   * @endpoint GET /api/v1/suppliers/reports/purchase-journal/
   */
  async generatePurchaseJournal(params: {
    companyId: string;
    fiscalYearId: string;
    dateFrom: string;
    dateTo: string;
    format: 'pdf' | 'excel';
  }): Promise<{ download_url: string; generated_at: string }> {
    const response = await apiService.get(`${BASE_PATH}/reports/purchase-journal/`, {
      params: {
        company_id: params.companyId,
        fiscal_year_id: params.fiscalYearId,
        date_from: params.dateFrom,
        date_to: params.dateTo,
        format: params.format
      }
    });
    return response.data;
  }

  // ==========================================================================
  // SECTION 13: ALERTES & MONITORING (4 méthodes)
  // ==========================================================================

  /**
   * Configure les alertes automatiques fournisseurs
   *
   * @param data - Configuration des alertes
   * @returns Confirmation
   *
   * @endpoint POST /api/v1/suppliers/alerts/configure/
   */
  async configureAlerts(data: {
    companyId: string;
    alertRules: Array<{
      type: 'ECHEANCE' | 'PERFORMANCE' | 'CONCENTRATION' | 'DOCUMENT_EXPIRE';
      threshold: number;
      enabled: boolean;
      recipients: string[];
      notification_channels: Array<'email' | 'sms' | 'in_app'>;
    }>;
  }): Promise<{
    configured: boolean;
    rules_count: number;
  }> {
    const response = await apiService.post(`${BASE_PATH}/alerts/configure/`, data);
    return response.data;
  }

  /**
   * Récupère les alertes actives
   *
   * @param params - Filtres optionnels
   * @returns Liste des alertes
   *
   * @endpoint GET /api/v1/suppliers/alerts/active/
   */
  async getActiveAlerts(params?: {
    companyId?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<Array<{
    alert_id: string;
    type: string;
    severity: string;
    message: string;
    supplier_id?: string;
    supplier_name?: string;
    created_at: string;
    acknowledged: boolean;
  }>> {
    const response = await apiService.get(`${BASE_PATH}/alerts/active/`, {
      params: {
        company_id: params?.companyId,
        severity: params?.severity
      }
    });
    return response.data;
  }

  /**
   * Marque une alerte comme lue/acquittée
   *
   * @param alertId - UUID de l'alerte
   * @returns Confirmation
   *
   * @endpoint POST /api/v1/suppliers/alerts/{id}/acknowledge/
   */
  async acknowledgeAlert(alertId: string): Promise<{
    acknowledged: boolean;
    timestamp: string;
  }> {
    const response = await apiService.post(`${BASE_PATH}/alerts/${alertId}/acknowledge/`);
    return response.data;
  }

  /**
   * Récupère l'historique des alertes
   *
   * @param params - Paramètres de recherche
   * @returns Historique des alertes
   *
   * @endpoint GET /api/v1/suppliers/alerts/history/
   */
  async getAlertsHistory(params?: {
    companyId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }): Promise<Array<{
    alert_id: string;
    type: string;
    severity: string;
    message: string;
    created_at: string;
    acknowledged_at?: string;
    resolved_at?: string;
  }>> {
    const response = await apiService.get(`${BASE_PATH}/alerts/history/`, {
      params: {
        company_id: params?.companyId,
        date_from: params?.dateFrom,
        date_to: params?.dateTo,
        limit: params?.limit || 100
      }
    });
    return response.data;
  }
}

// ============================================================================
// INSTANCE SINGLETON EXPORTÉE
// ============================================================================

export const supplierService = new SupplierService();

// ============================================================================
// EXPORTS ADDITIONNELS
// ============================================================================

export default supplierService;
