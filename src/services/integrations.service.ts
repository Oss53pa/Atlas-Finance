/**
 * Service Integrations WiseBook
 * Intégrations bancaires et fiscales
 *
 * Fonctionnalités:
 * - Connexions bancaires (PSD2, African Banking)
 * - Synchronisation des transactions
 * - Intégrations fiscales (OHADA)
 * - Soumission automatique des déclarations
 * - Monitoring des synchronisations
 * - Gestion des erreurs et retry logic
 *
 * Architecture: Standard apiService + BASE_PATH
 * Backend: apps/integrations/urls.py (5 endpoints)
 *
 * @module services/integrations
 * @version 4.1.0
 * @date 2025-11-10
 */

import { apiService } from './api';

const BASE_PATH = '/api/v1/integrations';

// ============================================================================
// INTERFACES TYPESCRIPT
// ============================================================================

/**
 * Connexion bancaire
 */
export interface BankConnection {
  id: string;
  bank_name: string;
  account_number: string;
  account_type: 'checking' | 'savings' | 'business' | 'other';
  currency: string;
  balance: number;
  is_active: boolean;
  last_sync?: string;
  sync_frequency?: 'daily' | 'weekly' | 'manual';
  status: 'connected' | 'pending' | 'disconnected' | 'error';
  error_message?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Transaction bancaire importée
 */
export interface BankTransaction {
  id: string;
  connection_id: string;
  date_operation: string;
  date_valeur: string;
  montant: number;
  libelle: string;
  type_mouvement: 'credit' | 'debit';
  solde_apres: number;
  reference: string;
  category?: string;
  is_reconciled: boolean;
  statut: 'imported' | 'pending' | 'validated' | 'reconciled';
  created_at: string;
}

/**
 * Requête de connexion bancaire
 */
export interface BankConnectionRequest {
  bank_name: string;
  account_number?: string;
  credentials?: {
    username?: string;
    password?: string;
    api_key?: string;
  };
  account_type?: string;
  currency?: string;
}

/**
 * Résultat de connexion bancaire
 */
export interface BankConnectionResult {
  id: string;
  bank_name: string;
  status: 'success' | 'pending' | 'error';
  message: string;
  auth_url?: string; // URL for OAuth authentication
  connection?: BankConnection;
}

/**
 * Résultat de synchronisation
 */
export interface SyncResult {
  connection_id: string;
  bank_name: string;
  sync_date: string;
  transactions_imported: number;
  transactions_total: number;
  status: 'success' | 'partial' | 'error';
  errors?: string[];
  warnings?: string[];
  duration_ms?: number;
}

/**
 * Paramètres de synchronisation
 */
export interface SyncParams {
  date_debut?: string;
  date_fin?: string;
  force?: boolean;
}

/**
 * Intégration fiscale
 */
export interface FiscalIntegration {
  id: string;
  provider: 'OHADA' | 'CEMAC' | 'UEMOA' | 'OTHER';
  country: string;
  tax_id: string;
  is_active: boolean;
  last_submission?: string;
  status: 'active' | 'inactive' | 'error';
  credentials?: {
    username?: string;
    api_key?: string;
  };
  created_at: string;
  updated_at?: string;
}

/**
 * Déclaration fiscale à soumettre
 */
export interface FiscalDeclarationSubmission {
  declaration_id: string;
  type_declaration: string;
  periode: string;
  data: Record<string, any>;
}

/**
 * Résultat de soumission fiscale
 */
export interface FiscalSubmissionResult {
  declaration_id: string;
  submission_id?: string;
  status: 'submitted' | 'accepted' | 'rejected' | 'pending';
  message: string;
  reference?: string;
  receipt_url?: string;
  errors?: string[];
  submitted_at: string;
}

/**
 * Statistiques d'intégrations
 */
export interface IntegrationStats {
  banking: {
    total_connections: number;
    active_connections: number;
    total_transactions_imported: number;
    last_sync: string;
    sync_errors: number;
  };
  fiscal: {
    total_submissions: number;
    successful_submissions: number;
    pending_submissions: number;
    last_submission: string;
  };
}

/**
 * Banques supportées
 */
export interface SupportedBank {
  code: string;
  name: string;
  country: string;
  connector_type: 'PSD2' | 'AFRICAN' | 'CUSTOM';
  requires_oauth: boolean;
  supported_features: string[];
}

/**
 * Log d'intégration
 */
export interface IntegrationLog {
  id: string;
  type: 'banking' | 'fiscal';
  action: 'connect' | 'sync' | 'submit' | 'disconnect';
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: Record<string, any>;
  created_at: string;
}

/**
 * Paramètres de requête pagination
 */
export interface IntegrationQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class IntegrationsService {

  // ==========================================================================
  // SECTION 1: CONNEXIONS BANCAIRES
  // ==========================================================================

  /**
   * Récupère la liste des connexions bancaires
   * GET /api/v1/integrations/connections/
   */
  async getBankConnections(params?: IntegrationQueryParams): Promise<{
    results: BankConnection[];
    count: number;
    next?: string;
    previous?: string;
  }> {
    const response = await apiService.get(`${BASE_PATH}/connections/`, { params });
    return response.data;
  }

  /**
   * Connecte un nouveau compte bancaire
   * POST /api/v1/integrations/banking/connect/
   */
  async connectBank(data: BankConnectionRequest): Promise<BankConnectionResult> {
    const response = await apiService.post(`${BASE_PATH}/banking/connect/`, data);
    return response.data;
  }

  /**
   * Synchronise les transactions d'un compte bancaire
   * POST /api/v1/integrations/banking/sync/{connection_id}/
   */
  async syncBankTransactions(
    connectionId: string,
    params?: SyncParams
  ): Promise<SyncResult> {
    const response = await apiService.post(
      `${BASE_PATH}/banking/sync/${connectionId}/`,
      params
    );
    return response.data;
  }

  /**
   * Déconnecte un compte bancaire
   * DELETE /api/v1/integrations/banking/{connection_id}/
   */
  async disconnectBank(connectionId: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/banking/${connectionId}/`);
  }

  /**
   * Synchronise toutes les connexions bancaires actives
   */
  async syncAllBankConnections(params?: SyncParams): Promise<{
    total_connections: number;
    successful_syncs: number;
    failed_syncs: number;
    results: SyncResult[];
  }> {
    // Récupérer toutes les connexions
    const connections = await this.getBankConnections({ page_size: 100 });

    const results: SyncResult[] = [];
    let successful = 0;
    let failed = 0;

    // Synchroniser chaque connexion
    for (const connection of connections.results) {
      if (connection.is_active) {
        try {
          const result = await this.syncBankTransactions(connection.id, params);
          results.push(result);
          if (result.status === 'success') successful++;
          else failed++;
        } catch (error) {
          failed++;
          results.push({
            connection_id: connection.id,
            bank_name: connection.bank_name,
            sync_date: new Date().toISOString(),
            transactions_imported: 0,
            transactions_total: 0,
            status: 'error',
            errors: [(error as Error).message],
          });
        }
      }
    }

    return {
      total_connections: connections.results.length,
      successful_syncs: successful,
      failed_syncs: failed,
      results,
    };
  }

  // ==========================================================================
  // SECTION 2: INTÉGRATIONS FISCALES
  // ==========================================================================

  /**
   * Récupère les intégrations fiscales
   * GET /api/v1/integrations/fiscal/
   */
  async getFiscalIntegrations(params?: IntegrationQueryParams): Promise<{
    results: FiscalIntegration[];
    count: number;
  }> {
    const response = await apiService.get(`${BASE_PATH}/fiscal/`, { params });
    return response.data;
  }

  /**
   * Soumet une déclaration fiscale via l'intégration
   * POST /api/v1/integrations/fiscal/submit/
   */
  async submitFiscalDeclaration(
    data: FiscalDeclarationSubmission
  ): Promise<FiscalSubmissionResult> {
    const response = await apiService.post(`${BASE_PATH}/fiscal/submit/`, data);
    return response.data;
  }

  /**
   * Configure une nouvelle intégration fiscale
   * POST /api/v1/integrations/fiscal/
   */
  async configureFiscalIntegration(data: Partial<FiscalIntegration>): Promise<FiscalIntegration> {
    const response = await apiService.post(`${BASE_PATH}/fiscal/`, data);
    return response.data;
  }

  /**
   * Met à jour une intégration fiscale
   * PATCH /api/v1/integrations/fiscal/{id}/
   */
  async updateFiscalIntegration(
    id: string,
    data: Partial<FiscalIntegration>
  ): Promise<FiscalIntegration> {
    const response = await apiService.patch(`${BASE_PATH}/fiscal/${id}/`, data);
    return response.data;
  }

  /**
   * Teste la connexion fiscale
   * POST /api/v1/integrations/fiscal/{id}/test/
   */
  async testFiscalConnection(id: string): Promise<{
    success: boolean;
    message: string;
    details?: Record<string, any>;
  }> {
    const response = await apiService.post(`${BASE_PATH}/fiscal/${id}/test/`);
    return response.data;
  }

  // ==========================================================================
  // SECTION 3: STATISTIQUES & MONITORING
  // ==========================================================================

  /**
   * Récupère les statistiques d'intégrations
   * GET /api/v1/integrations/stats/
   */
  async getIntegrationStats(): Promise<IntegrationStats> {
    const response = await apiService.get(`${BASE_PATH}/stats/`);
    return response.data;
  }

  /**
   * Récupère les logs d'intégrations
   * GET /api/v1/integrations/logs/
   */
  async getIntegrationLogs(params?: {
    type?: 'banking' | 'fiscal';
    status?: 'success' | 'error' | 'warning';
    date_debut?: string;
    date_fin?: string;
    page?: number;
    page_size?: number;
  }): Promise<{
    results: IntegrationLog[];
    count: number;
  }> {
    const response = await apiService.get(`${BASE_PATH}/logs/`, { params });
    return response.data;
  }

  /**
   * Récupère le statut de santé des intégrations
   * GET /api/v1/integrations/health/
   */
  async getIntegrationsHealth(): Promise<{
    overall_status: 'healthy' | 'degraded' | 'down';
    banking: {
      status: 'healthy' | 'degraded' | 'down';
      active_connections: number;
      error_count: number;
      last_successful_sync?: string;
    };
    fiscal: {
      status: 'healthy' | 'degraded' | 'down';
      active_integrations: number;
      error_count: number;
      last_successful_submission?: string;
    };
  }> {
    const response = await apiService.get(`${BASE_PATH}/health/`);
    return response.data;
  }

  // ==========================================================================
  // SECTION 4: BANQUES SUPPORTÉES
  // ==========================================================================

  /**
   * Récupère la liste des banques supportées
   * GET /api/v1/integrations/banking/supported-banks/
   */
  async getSupportedBanks(params?: {
    country?: string;
    connector_type?: 'PSD2' | 'AFRICAN' | 'CUSTOM';
  }): Promise<SupportedBank[]> {
    const response = await apiService.get(`${BASE_PATH}/banking/supported-banks/`, { params });
    return response.data;
  }

  // ==========================================================================
  // SECTION 5: WEBHOOKS & NOTIFICATIONS
  // ==========================================================================

  /**
   * Configure un webhook pour les événements d'intégration
   * POST /api/v1/integrations/webhooks/
   */
  async configureWebhook(data: {
    url: string;
    events: string[];
    is_active: boolean;
  }): Promise<{
    id: string;
    url: string;
    events: string[];
    secret: string;
  }> {
    const response = await apiService.post(`${BASE_PATH}/webhooks/`, data);
    return response.data;
  }

  // ==========================================================================
  // SECTION 6: MÉTHODES HELPERS
  // ==========================================================================

  /**
   * Formate un montant de transaction
   */
  formatTransactionAmount(amount: number, currency: string = 'XAF'): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Détermine la couleur du statut de connexion
   */
  getConnectionStatusColor(status: string): 'success' | 'warning' | 'danger' | 'info' {
    switch (status) {
      case 'connected':
        return 'success';
      case 'pending':
        return 'warning';
      case 'disconnected':
        return 'info';
      case 'error':
        return 'danger';
      default:
        return 'info';
    }
  }

  /**
   * Détermine le label du statut
   */
  getConnectionStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'connected': 'Connecté',
      'pending': 'En attente',
      'disconnected': 'Déconnecté',
      'error': 'Erreur',
    };
    return labels[status] || status;
  }

  /**
   * Calcule le délai depuis la dernière synchronisation
   */
  getTimeSinceLastSync(lastSync?: string): string {
    if (!lastSync) return 'Jamais synchronisé';

    const now = new Date();
    const syncDate = new Date(lastSync);
    const diffMs = now.getTime() - syncDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    } else {
      return 'Récemment';
    }
  }

  /**
   * Valide les identifiants de connexion bancaire
   */
  validateBankCredentials(data: BankConnectionRequest): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.bank_name) {
      errors.push('Le nom de la banque est requis');
    }

    if (!data.account_number && !data.credentials?.api_key) {
      errors.push('Le numéro de compte ou la clé API est requis');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const integrationsService = new IntegrationsService();
export default integrationsService;
