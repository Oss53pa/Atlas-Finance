/**
 * Client API centralisé pour les Supabase Edge Functions
 *
 * Ce module centralise tous les appels fetch vers les Edge Functions.
 * Il remplace les appels directs à supabase.from() et les appels
 * vers le backend Django pour les factures et paiements.
 *
 * Toutes les requêtes passent par les Edge Functions côté serveur
 * qui gèrent la logique métier et l'isolation multi-tenant.
 *
 * Le frontend ne garde que supabase.auth pour la gestion de session.
 */

import { supabase } from './supabase'

// URL de base des Edge Functions Supabase
const API_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1'

// ============================================================================
// CLIENT FETCH GÉNÉRIQUE
// ============================================================================

/**
 * Fonction fetch centralisée avec authentification automatique.
 *
 * - Récupère le token JWT de la session Supabase active
 * - Ajoute les headers Authorization et Content-Type
 * - Parse la réponse JSON et gère les erreurs HTTP
 *
 * @param endpoint - Chemin de l'Edge Function (ex: '/invoices')
 * @param options - Options fetch standard (method, body, etc.)
 * @returns Données JSON de la réponse
 * @throws Error avec le message du serveur si status non-ok
 */
async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Récupérer le token de la session active
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  if (!token) {
    throw new Error('Session expirée. Veuillez vous reconnecter.')
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  })

  // Gérer les erreurs HTTP
  if (!res.ok) {
    let errorMessage: string
    try {
      const errorData = await res.json()
      errorMessage = errorData.error || errorData.message || `Erreur ${res.status}`
    } catch {
      errorMessage = await res.text() || `Erreur HTTP ${res.status}`
    }
    throw new Error(errorMessage)
  }

  return res.json()
}

// ============================================================================
// INTERFACES
// ============================================================================

/** Paramètres de filtrage pour la liste des factures */
export interface InvoiceFilters {
  status?: string
  supplier_id?: string
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
}

/** Données pour créer une facture */
export interface InvoiceData {
  supplier_id: string
  invoice_number: string
  invoice_date: string
  due_date: string
  amount_excl_tax: number
  vat_amount: number
  amount_incl_tax: number
  purchase_order_ref?: string
  delivery_receipt_ref?: string
  status?: string
  technical_comments?: string
  accounting_comments?: string
}

/** Données pour modifier une facture (tous les champs optionnels) */
export interface InvoiceUpdateData {
  invoice_number?: string
  invoice_date?: string
  due_date?: string
  amount_excl_tax?: number
  vat_amount?: number
  amount_incl_tax?: number
  purchase_order_ref?: string
  delivery_receipt_ref?: string
  status?: string
  technical_validation?: string
  technical_comments?: string
  accounting_validation?: string
  accounting_comments?: string
  payment_date?: string
  payment_amount?: number
  payment_reference?: string
}

/** Paramètres de filtrage pour la liste des paiements */
export interface PaymentFilters {
  status?: string
  supplier_id?: string
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
}

/** Données pour créer un paiement */
export interface PaymentData {
  supplier_id: string
  payment_reference: string
  payment_date: string
  gross_amount: number
  discount_amount?: number
  net_amount: number
  payment_type: string
  early_payment_days?: number
  discount_rate_applied?: number
  status?: string
  invoice_ids?: string[]
}

/** Données pour modifier un paiement */
export interface PaymentUpdateData {
  payment_reference?: string
  payment_date?: string
  gross_amount?: number
  discount_amount?: number
  net_amount?: number
  payment_type?: string
  status?: string
  approved_by?: string
  approval_date?: string
  bank_transaction_id?: string
  execution_date?: string
  invoice_ids?: string[]
}

/** Paramètres pour les statistiques */
export interface StatsFilters {
  date_from?: string
  date_to?: string
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Construit les query params à partir d'un objet de filtres
 */
function buildParams(filters: Record<string, any> = {}): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value))
    }
  }
  const str = params.toString()
  return str ? `?${str}` : ''
}

// ============================================================================
// API OBJET EXPORTÉ
// ============================================================================

export const api = {
  // ================================================================
  // FACTURES
  // ================================================================

  /** Récupère la liste des factures avec filtres optionnels */
  getInvoices: (filters?: InvoiceFilters) =>
    apiFetch(`/invoices${buildParams(filters)}`),

  /** Récupère une facture par son ID */
  getInvoice: (id: string) =>
    apiFetch(`/invoices?id=${id}`),

  /** Crée une nouvelle facture */
  createInvoice: (data: InvoiceData) =>
    apiFetch('/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Met à jour une facture existante */
  updateInvoice: (id: string, data: InvoiceUpdateData) =>
    apiFetch(`/invoices?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Supprime une facture (uniquement si statut RECEIVED) */
  deleteInvoice: (id: string) =>
    apiFetch(`/invoices?id=${id}`, {
      method: 'DELETE',
    }),

  // ================================================================
  // STATISTIQUES DASHBOARD
  // ================================================================

  /** Récupère les statistiques consolidées des factures */
  getInvoiceStats: (filters?: StatsFilters) =>
    apiFetch(`/invoices-stats${buildParams(filters)}`),

  // ================================================================
  // PAIEMENTS
  // ================================================================

  /** Récupère la liste des paiements avec filtres optionnels */
  getPayments: (filters?: PaymentFilters) =>
    apiFetch(`/payments${buildParams(filters)}`),

  /** Récupère un paiement par son ID (avec factures associées) */
  getPayment: (id: string) =>
    apiFetch(`/payments?id=${id}`),

  /** Crée un nouveau paiement */
  createPayment: (data: PaymentData) =>
    apiFetch('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Met à jour un paiement existant */
  updatePayment: (id: string, data: PaymentUpdateData) =>
    apiFetch(`/payments?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Supprime un paiement (uniquement si statut PROPOSED) */
  deletePayment: (id: string) =>
    apiFetch(`/payments?id=${id}`, {
      method: 'DELETE',
    }),
}

export default api
