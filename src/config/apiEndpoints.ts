/**
 * Atlas Finance - API Endpoints Configuration
 *
 * Ce fichier centralise tous les endpoints API du backend.
 * Il remplace les anciens chemins hardcodés et permet une maintenance facile.
 *
 * @version 3.0.0
 * @date 2025-10-18
 */

// Base URL de l'API
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Tous les endpoints API disponibles dans le backend
 * Organisés par domaine fonctionnel
 */
export const API_ENDPOINTS = {
  // =============================================================================
  // AUTHENTICATION (DÉJÀ UTILISÉ - Ne pas modifier)
  // =============================================================================
  AUTH: {
    LOGIN: '/api/auth/login/',
    LOGOUT: '/api/auth/logout/',
    PROFILE: '/api/auth/profile/',
    TOKEN: '/api/auth/token/',
    TOKEN_REFRESH: '/api/auth/token/refresh/',
  },

  // =============================================================================
  // CORE - Sociétés & Devises
  // =============================================================================
  COMPANIES: {
    LIST: '/api/societes/',
    DETAIL: (id: string | number) => `/api/societes/${id}/`,
    CREATE: '/api/societes/',
    UPDATE: (id: string | number) => `/api/societes/${id}/`,
    DELETE: (id: string | number) => `/api/societes/${id}/`,
  },

  CURRENCIES: {
    LIST: '/api/devises/',
    DETAIL: (id: string | number) => `/api/devises/${id}/`,
    CREATE: '/api/devises/',
    UPDATE: (id: string | number) => `/api/devises/${id}/`,
    DELETE: (id: string | number) => `/api/devises/${id}/`,
  },

  // =============================================================================
  // USERS & SECURITY - Gestion des utilisateurs, rôles et permissions
  // =============================================================================
  USERS: {
    LIST: '/api/users/',
    DETAIL: (id: string | number) => `/api/users/${id}/`,
    CREATE: '/api/users/',
    UPDATE: (id: string | number) => `/api/users/${id}/`,
    DELETE: (id: string | number) => `/api/users/${id}/`,
  },

  ROLES: {
    LIST: '/api/roles/',
    DETAIL: (id: string | number) => `/api/roles/${id}/`,
    CREATE: '/api/roles/',
    UPDATE: (id: string | number) => `/api/roles/${id}/`,
    DELETE: (id: string | number) => `/api/roles/${id}/`,
  },

  PERMISSIONS: {
    LIST: '/api/permissions/',
    DETAIL: (id: string | number) => `/api/permissions/${id}/`,
    CREATE: '/api/permissions/',
    UPDATE: (id: string | number) => `/api/permissions/${id}/`,
    DELETE: (id: string | number) => `/api/permissions/${id}/`,
  },

  // =============================================================================
  // ACCOUNTING - Comptabilité
  // =============================================================================

  // Exercices fiscaux
  FISCAL_YEARS: {
    LIST: '/api/exercices/',
    DETAIL: (id: string | number) => `/api/exercices/${id}/`,
    CREATE: '/api/exercices/',
    UPDATE: (id: string | number) => `/api/exercices/${id}/`,
    DELETE: (id: string | number) => `/api/exercices/${id}/`,
  },

  // Journaux comptables
  JOURNALS: {
    LIST: '/api/journaux/',
    DETAIL: (id: string | number) => `/api/journaux/${id}/`,
    CREATE: '/api/journaux/',
    UPDATE: (id: string | number) => `/api/journaux/${id}/`,
    DELETE: (id: string | number) => `/api/journaux/${id}/`,
  },

  // Plan comptable
  ACCOUNTS: {
    LIST: '/api/comptes/',
    DETAIL: (id: string | number) => `/api/comptes/${id}/`,
    CREATE: '/api/comptes/',
    UPDATE: (id: string | number) => `/api/comptes/${id}/`,
    DELETE: (id: string | number) => `/api/comptes/${id}/`,
  },

  // Écritures comptables
  JOURNAL_ENTRIES: {
    LIST: '/api/ecritures/',
    DETAIL: (id: string | number) => `/api/ecritures/${id}/`,
    CREATE: '/api/ecritures/',
    UPDATE: (id: string | number) => `/api/ecritures/${id}/`,
    DELETE: (id: string | number) => `/api/ecritures/${id}/`,
  },

  // Lignes d'écriture
  ENTRY_LINES: {
    LIST: '/api/lignes-ecriture/',
    DETAIL: (id: string | number) => `/api/lignes-ecriture/${id}/`,
    CREATE: '/api/lignes-ecriture/',
    UPDATE: (id: string | number) => `/api/lignes-ecriture/${id}/`,
    DELETE: (id: string | number) => `/api/lignes-ecriture/${id}/`,
  },

  // Import/Export SYSCOHADA (Phase 1.3)
  ACCOUNTING: {
    // Import plan comptable SYSCOHADA standard
    IMPORT_SYSCOHADA: '/api/comptes/import-syscohada/',

    // Import depuis fichier CSV/Excel
    IMPORT_CHART_FILE: '/api/comptes/import-file/',
  },

  // =============================================================================
  // THIRD PARTIES - Tiers (Clients & Fournisseurs)
  // =============================================================================

  // Tiers
  THIRD_PARTIES: {
    LIST: '/api/tiers/',
    DETAIL: (id: string | number) => `/api/tiers/${id}/`,
    CREATE: '/api/tiers/',
    UPDATE: (id: string | number) => `/api/tiers/${id}/`,
    DELETE: (id: string | number) => `/api/tiers/${id}/`,
  },

  // Adresses des tiers
  THIRD_PARTY_ADDRESSES: {
    LIST: '/api/adresses-tiers/',
    DETAIL: (id: string | number) => `/api/adresses-tiers/${id}/`,
    CREATE: '/api/adresses-tiers/',
    UPDATE: (id: string | number) => `/api/adresses-tiers/${id}/`,
    DELETE: (id: string | number) => `/api/adresses-tiers/${id}/`,
  },

  // Contacts des tiers
  THIRD_PARTY_CONTACTS: {
    LIST: '/api/contacts-tiers/',
    DETAIL: (id: string | number) => `/api/contacts-tiers/${id}/`,
    CREATE: '/api/contacts-tiers/',
    UPDATE: (id: string | number) => `/api/contacts-tiers/${id}/`,
    DELETE: (id: string | number) => `/api/contacts-tiers/${id}/`,
  },

  // =============================================================================
  // DASHBOARD & ANALYTICS - Phase 2 Week 1
  // =============================================================================
  DASHBOARD: {
    CONSOLIDATED_KPIS: '/api/dashboard/consolidated-kpis/',
    OPERATIONAL_METRICS: '/api/dashboard/operational-metrics/',
    FINANCIAL_TRENDS: '/api/dashboard/financial-trends/',
    CRITICAL_ALERTS: '/api/dashboard/critical-alerts/',
    PERFORMANCE_BENCHMARK: '/api/dashboard/performance-benchmark/',
    EXPORT: '/api/dashboard/export/',
  },

  // =============================================================================
  // CUSTOMER MANAGEMENT - CRM & Recouvrement
  // =============================================================================
  CUSTOMERS: {
    // CRUD de base
    LIST: '/api/customers/api/clients/',
    DETAIL: (id: string | number) => `/api/customers/api/clients/${id}/`,
    CREATE: '/api/customers/api/clients/',
    UPDATE: (id: string | number) => `/api/customers/api/clients/${id}/`,
    DELETE: (id: string | number) => `/api/customers/api/clients/${id}/`,
    SEARCH: '/api/customers/api/clients/search/',

    // KPIs & Analytics
    KPIS: '/api/customers/api/recouvrement/kpis/',
    AGING_ANALYSIS: '/api/customers/api/recouvrement/aging-analysis/',
    TRENDS: '/api/customers/api/recouvrement/trends/',
    RISK_ANALYSIS: '/api/customers/api/recouvrement/risk-analysis/',
    PRIORITY_ACTIONS: '/api/customers/api/recouvrement/priority-actions/',
    PROFITABILITY_ANALYSIS: '/api/customers/api/recouvrement/profitability-analysis/',

    // Collection & Recouvrement
    COLLECTION_FORECAST: '/api/customers/api/recouvrement/collection-forecast/',
    DSO_ANALYSIS: '/api/customers/api/recouvrement/dso-analysis/',
    PAYMENT_PROMISES: '/api/customers/api/recouvrement/payment-promises/',
    TRIGGER_REMINDERS: '/api/customers/api/recouvrement/trigger-reminders/',
    SEND_REMINDER: '/api/customers/api/recouvrement/send-reminder/',
    STATEMENT: '/api/customers/api/recouvrement/statement/',

    // Export
    EXPORT_DASHBOARD: '/api/customers/api/recouvrement/export-dashboard/',

    // Additional endpoints
    REMINDER_HISTORY: '/api/customers/api/recouvrement/reminder-history/',
    REFRESH_OUTSTANDING: '/api/customers/api/recouvrement/refresh-outstanding/',
    COLLECTION_REPORT: '/api/customers/api/recouvrement/collection-report/',

    // Contacts & Addresses
    CONTACTS: '/api/customers/api/contacts/',
    CONTACTS_BY_CLIENT: '/api/customers/api/contacts/by-client/',
    ADDRESSES: '/api/customers/api/addresses/',

    // Documents
    DOCUMENTS: '/api/customers/api/documents/',
    DOCUMENT_TYPES: '/api/customers/api/documents/types/',

    // Analytics avancés
    SEGMENTATION: '/api/customers/api/analytics/segmentation/',
    PREDICTIVE: '/api/customers/api/analytics/predictive/',
    CUSTOM_REPORT: '/api/customers/api/analytics/custom-report/',
  },

  // =============================================================================
  // SUPPLIER MANAGEMENT - Fournisseurs & Paiements
  // =============================================================================
  SUPPLIERS: {
    // CRUD de base
    LIST: '/api/suppliers/api/suppliers/',
    DETAIL: (id: string | number) => `/api/suppliers/api/suppliers/${id}/`,
    CREATE: '/api/suppliers/api/suppliers/',
    UPDATE: (id: string | number) => `/api/suppliers/api/suppliers/${id}/`,
    DELETE: (id: string | number) => `/api/suppliers/api/suppliers/${id}/`,
    SEARCH: '/api/suppliers/api/suppliers/search/',

    // KPIs & Analytics
    KPIS: '/api/suppliers/api/analytics/kpis/',
    ANALYTICS: '/api/suppliers/api/analytics/analytics/',
    PERFORMANCE: '/api/suppliers/api/analytics/performance/',
    ROI_ANALYSIS: '/api/suppliers/api/analytics/roi-analysis/',
    CONCENTRATION_ANALYSIS: '/api/suppliers/api/analytics/concentration-analysis/',
    CONTRACT_ALERTS: '/api/suppliers/api/analytics/contract-alerts/',

    // Payment Management
    PAYMENT_OPTIMIZATION: '/api/suppliers/api/analytics/payment-optimization/',
    PAYMENT_SCHEDULE: '/api/suppliers/api/analytics/payment-schedule/',
    DISCOUNT_OPPORTUNITIES: '/api/suppliers/api/analytics/discount-opportunities/',
    SMART_PAYMENT_PROPOSALS: '/api/suppliers/api/analytics/smart-payment-proposals/',
    EXECUTE_PAYMENT: '/api/suppliers/api/analytics/execute-payment/',
    BULK_PAYMENT: '/api/suppliers/api/analytics/bulk-payment/',
    SIMULATE_PAYMENT_IMPACT: '/api/suppliers/api/analytics/simulate-payment-impact/',

    // Export
    EXPORT_DASHBOARD: '/api/suppliers/api/analytics/export-dashboard/',

    // Invoices
    INVOICES: '/api/suppliers/api/invoices/',
    INVOICE_VALIDATE: (id: string | number) => `/api/suppliers/api/invoices/${id}/validate/`,
    SYNC_WISE_PROCURE: '/api/suppliers/api/sync-wise-procure/',
    PROCESS_INVOICE: '/api/suppliers/api/process-invoice/',

    // Evaluations
    EVALUATIONS: '/api/suppliers/api/evaluations/',

    // Additional
    REFRESH_OUTSTANDING: '/api/suppliers/api/refresh-outstanding/',
    PERFORMANCE_REPORT: '/api/suppliers/api/performance-report/',
    REALTIME_METRICS: '/api/suppliers/api/realtime-metrics/',
    CONFIGURE_ALERTS: '/api/suppliers/api/configure-alerts/',

    // Documents
    DOCUMENTS: '/api/suppliers/api/documents/',

    // Analyses avancées
    ANALYSE_ABC: '/api/suppliers/api/analytics/abc/',
    MATRICE_RISQUES: '/api/suppliers/api/analytics/matrice-risques/',
    INDICATEURS_CLES: '/api/suppliers/api/analytics/indicateurs/',
    RAPPORT_PERSONNALISE: '/api/suppliers/api/analytics/rapport-personnalise/',
  },

  // =============================================================================
  // TREASURY MANAGEMENT - Trésorerie & Cash Flow
  // =============================================================================
  TREASURY: {
    // Dashboard & KPIs
    POSITION: '/api/treasury/api/dashboard/position/',
    KPIS: '/api/treasury/api/dashboard/kpis/',
    TRENDS: '/api/treasury/api/dashboard/trends/',
    ALERTES: '/api/treasury/api/dashboard/alertes/',

    // Comptes bancaires
    ACCOUNTS: '/api/treasury/api/accounts/',
    CONSOLIDATION: '/api/treasury/api/accounts/consolidation/',
    BANK_CONNECTIONS: '/api/treasury/api/connections/status/',

    // Mouvements de trésorerie
    MOVEMENTS: '/api/treasury/api/movements/',
    LATEST_MOVEMENTS: '/api/treasury/api/movements/dernieres/',
    BULK_VALIDATE: '/api/treasury/api/movements/validation-lot/',
    EXPORT_GL: '/api/treasury/api/movements/export-comptable/',

    // Prévisions
    FORECAST_13_WEEKS: '/api/treasury/api/forecasting/13-semaines/',
    FORECAST_SIMULATION: '/api/treasury/api/forecasting/simulation/',
    FORECAST_INFLOWS: '/api/treasury/api/forecasting/encaissements/',
    FORECAST_OUTFLOWS: '/api/treasury/api/forecasting/decaissements/',
    ML_PREDICT: '/api/treasury/api/ml/predict-cash-flow/',

    // Appels de fonds
    FUND_CALLS: '/api/treasury/api/fund-calls/',
    FUND_CALLS_ANALYZE: '/api/treasury/api/fund-calls/analyser-besoins/',
    FUND_CALLS_AUTO_CREATE: '/api/treasury/api/fund-calls/creer-automatique/',

    // Rapprochement bancaire
    RECONCILIATION_AUTO: '/api/treasury/api/reconciliation/automatique/',
    IMPORT_STATEMENT: '/api/treasury/api/reconciliation/import-releve/',

    // Analytics & Performance
    PERFORMANCE: '/api/treasury/api/analytics/performance/',
    OPTIMIZE: '/api/treasury/api/optimize/cash-management/',

    // Reporting
    GENERATE_REPORT: '/api/treasury/api/reports/generate/',
    PLANNING: '/api/treasury/api/reports/planning/',
  },

  // =============================================================================
  // HEALTH & MONITORING - Nouveaux endpoints de monitoring
  // =============================================================================
  HEALTH: {
    CHECK: '/health/',
    READY: '/health/ready/',
    LIVE: '/health/live/',
  },

  // =============================================================================
  // REPORTS - Rapports comptables SYSCOHADA (Phase 1.2)
  // =============================================================================
  REPORTS: {
    // Balance générale - Rapport principal
    BALANCE: '/api/reports/balance/',

    // Balance de vérification
    TRIAL_BALANCE: '/api/reports/trial-balance/',

    // Grand livre général
    GENERAL_LEDGER: '/api/reports/general-ledger/',

    // Balance analytique
    ANALYTICAL_BALANCE: '/api/reports/analytical-balance/',

    // Grand livre analytique
    ANALYTICAL_LEDGER: '/api/reports/analytical-ledger/',

    // Compte de résultat SYSCOHADA
    INCOME_STATEMENT: '/api/reports/income-statement/',

    // Bilan comptable SYSCOHADA
    BALANCE_SHEET: '/api/reports/balance-sheet/',

    // Tableau des flux de trésorerie
    CASH_FLOW_STATEMENT: '/api/reports/cash-flow-statement/',
  },
};

/**
 * Helper pour construire une URL complète
 */
export const buildApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};

/**
 * Helper pour construire une URL avec query params
 */
export const buildApiUrlWithParams = (
  endpoint: string,
  params?: Record<string, any>
): string => {
  const url = buildApiUrl(endpoint);

  if (!params || Object.keys(params).length === 0) {
    return url;
  }

  const queryString = new URLSearchParams(
    Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)])
  ).toString();

  return queryString ? `${url}?${queryString}` : url;
};

/**
 * Types pour les paramètres de pagination standard
 */
export interface PaginationParams {
  page?: number;
  page_size?: number;
  ordering?: string;
  search?: string;
}

/**
 * Types pour les paramètres de filtrage standard
 */
export interface FilterParams {
  company_id?: number;
  fiscal_year_id?: number;
  journal_id?: number;
  account_id?: number;
  third_party_id?: number;
  date_from?: string;
  date_to?: string;
}

/**
 * Mapping des anciens endpoints vers les nouveaux
 * Pour faciliter la migration progressive
 */
export const LEGACY_ENDPOINT_MAPPING: Record<string, string> = {
  // Companies
  '/accounting/api/companies/': API_ENDPOINTS.COMPANIES.LIST,

  // Fiscal Years
  '/accounting/api/fiscal-years/': API_ENDPOINTS.FISCAL_YEARS.LIST,

  // Journals
  '/accounting/api/journals/': API_ENDPOINTS.JOURNALS.LIST,

  // Chart of Accounts
  '/accounting/api/chart-of-accounts/': API_ENDPOINTS.ACCOUNTS.LIST,

  // Journal Entries
  '/accounting/api/journal-entries/': API_ENDPOINTS.JOURNAL_ENTRIES.LIST,

  // Third Parties (anciens chemins)
  '/customers/': API_ENDPOINTS.CUSTOMERS.LIST,
  '/suppliers/': API_ENDPOINTS.SUPPLIERS.LIST,

  // Customer Analytics (anciens chemins)
  '/customers/collection-forecast': API_ENDPOINTS.CUSTOMERS.COLLECTION_FORECAST,
  '/customers/dso-analysis': API_ENDPOINTS.CUSTOMERS.DSO_ANALYSIS,
  '/customers/payment-promises': API_ENDPOINTS.CUSTOMERS.PAYMENT_PROMISES,
  '/customers/reminder-history': '/api/customers/api/recouvrement/reminder-history/',
  '/customers/profitability-analysis': API_ENDPOINTS.CUSTOMERS.PROFITABILITY_ANALYSIS,
  '/customers/statement': API_ENDPOINTS.CUSTOMERS.STATEMENT,
  '/customers/trigger-reminders': API_ENDPOINTS.CUSTOMERS.TRIGGER_REMINDERS,
  '/customers/send-reminder': API_ENDPOINTS.CUSTOMERS.SEND_REMINDER,
  '/customers/export-dashboard': API_ENDPOINTS.CUSTOMERS.EXPORT_DASHBOARD,
  '/customers/search': API_ENDPOINTS.CUSTOMERS.SEARCH,

  // Supplier Analytics (anciens chemins)
  '/suppliers/kpis': API_ENDPOINTS.SUPPLIERS.KPIS,
  '/suppliers/payment-optimization': API_ENDPOINTS.SUPPLIERS.PAYMENT_OPTIMIZATION,
  '/suppliers/analytics': API_ENDPOINTS.SUPPLIERS.ANALYTICS,
  '/suppliers/performance': API_ENDPOINTS.SUPPLIERS.PERFORMANCE,
  '/suppliers/payment-schedule': API_ENDPOINTS.SUPPLIERS.PAYMENT_SCHEDULE,
  '/suppliers/discount-opportunities': API_ENDPOINTS.SUPPLIERS.DISCOUNT_OPPORTUNITIES,
  '/suppliers/smart-payment-proposals': API_ENDPOINTS.SUPPLIERS.SMART_PAYMENT_PROPOSALS,
  '/suppliers/execute-payment': API_ENDPOINTS.SUPPLIERS.EXECUTE_PAYMENT,
  '/suppliers/bulk-payment': API_ENDPOINTS.SUPPLIERS.BULK_PAYMENT,
  '/suppliers/roi-analysis': API_ENDPOINTS.SUPPLIERS.ROI_ANALYSIS,
  '/suppliers/concentration-analysis': API_ENDPOINTS.SUPPLIERS.CONCENTRATION_ANALYSIS,
  '/suppliers/contract-alerts': API_ENDPOINTS.SUPPLIERS.CONTRACT_ALERTS,
  '/suppliers/simulate-payment-impact': API_ENDPOINTS.SUPPLIERS.SIMULATE_PAYMENT_IMPACT,
  '/suppliers/export-dashboard': API_ENDPOINTS.SUPPLIERS.EXPORT_DASHBOARD,
  '/suppliers/search': API_ENDPOINTS.SUPPLIERS.SEARCH,

  // Treasury (anciens chemins)
  '/treasury/position': API_ENDPOINTS.TREASURY.POSITION,
  '/treasury/cash-flow-forecast': API_ENDPOINTS.TREASURY.FORECAST_13_WEEKS,
  '/treasury/fund-calls/dashboard': API_ENDPOINTS.TREASURY.FUND_CALLS,
  '/treasury/performance-metrics': API_ENDPOINTS.TREASURY.PERFORMANCE,
  '/treasury/bank-connections': API_ENDPOINTS.TREASURY.BANK_CONNECTIONS,
  '/treasury/payments': API_ENDPOINTS.TREASURY.MOVEMENTS,
};

/**
 * Helper pour migrer automatiquement les anciens endpoints
 */
export const migrateLegacyEndpoint = (oldEndpoint: string): string => {
  return LEGACY_ENDPOINT_MAPPING[oldEndpoint] || oldEndpoint;
};

export default API_ENDPOINTS;
