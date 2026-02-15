/**
 * Edge Function : CRUD Factures Fournisseurs
 *
 * Endpoints :
 *   GET    /invoices         → Liste des factures (filtre par type, statut, fournisseur)
 *   GET    /invoices?id=xxx  → Détail d'une facture
 *   POST   /invoices         → Créer une facture
 *   PUT    /invoices?id=xxx  → Modifier une facture
 *   DELETE /invoices?id=xxx  → Supprimer une facture
 *
 * Toutes les requêtes sont filtrées par company_id (multi-tenant).
 * Table : supplier_invoices (jointure avec suppliers pour company_id)
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-client.ts'
import { authenticateUser, AuthError, errorResponse } from '../_shared/auth.ts'

serve(async (req: Request) => {
  // Gestion CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    // Authentification obligatoire
    const user = await authenticateUser(req)
    const supabase = createAdminClient()
    const url = new URL(req.url)
    const invoiceId = url.searchParams.get('id')

    switch (req.method) {
      // ================================================================
      // GET : Liste ou détail
      // ================================================================
      case 'GET': {
        if (invoiceId) {
          // Détail d'une facture
          return await getInvoiceById(supabase, user.companyId, invoiceId)
        }
        // Liste avec filtres
        return await listInvoices(supabase, user.companyId, url.searchParams)
      }

      // ================================================================
      // POST : Créer une facture
      // ================================================================
      case 'POST': {
        const body = await req.json()
        return await createInvoice(supabase, user.companyId, body)
      }

      // ================================================================
      // PUT : Modifier une facture
      // ================================================================
      case 'PUT': {
        if (!invoiceId) {
          return errorResponse('Paramètre id requis', 400, corsHeaders)
        }
        const body = await req.json()
        return await updateInvoice(supabase, user.companyId, invoiceId, body)
      }

      // ================================================================
      // DELETE : Supprimer une facture
      // ================================================================
      case 'DELETE': {
        if (!invoiceId) {
          return errorResponse('Paramètre id requis', 400, corsHeaders)
        }
        return await deleteInvoice(supabase, user.companyId, invoiceId)
      }

      default:
        return errorResponse('Méthode non autorisée', 405, corsHeaders)
    }
  } catch (err) {
    // Erreur d'authentification
    if (err instanceof AuthError) {
      return errorResponse(err.message, err.status, corsHeaders)
    }
    // Erreur inattendue
    console.error('Erreur Edge Function invoices:', err)
    return errorResponse('Erreur interne du serveur', 500, corsHeaders)
  }
})

// ================================================================
// HANDLERS
// ================================================================

/**
 * Liste les factures du workspace avec filtres optionnels
 */
async function listInvoices(
  supabase: any,
  companyId: string,
  params: URLSearchParams
): Promise<Response> {
  // Construire la requête avec jointure supplier pour filtrer par company_id
  let query = supabase
    .from('supplier_invoices')
    .select(`
      *,
      supplier:suppliers!inner(
        id, code, legal_name, commercial_name, company_id
      )
    `)
    .eq('supplier.company_id', companyId)
    .order('invoice_date', { ascending: false })

  // Filtres optionnels
  const status = params.get('status')
  if (status) {
    query = query.eq('status', status)
  }

  const supplierId = params.get('supplier_id')
  if (supplierId) {
    query = query.eq('supplier_id', supplierId)
  }

  // Filtre par date (période)
  const dateFrom = params.get('date_from')
  if (dateFrom) {
    query = query.gte('invoice_date', dateFrom)
  }

  const dateTo = params.get('date_to')
  if (dateTo) {
    query = query.lte('invoice_date', dateTo)
  }

  // Pagination
  const page = parseInt(params.get('page') || '1')
  const limit = parseInt(params.get('limit') || '50')
  const offset = (page - 1) * limit
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('Erreur listInvoices:', error)
    return errorResponse('Erreur lors de la récupération des factures', 500, corsHeaders)
  }

  return new Response(
    JSON.stringify({
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || data?.length || 0,
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    }
  )
}

/**
 * Récupère une facture par son ID (avec vérification company_id)
 */
async function getInvoiceById(
  supabase: any,
  companyId: string,
  invoiceId: string
): Promise<Response> {
  const { data, error } = await supabase
    .from('supplier_invoices')
    .select(`
      *,
      supplier:suppliers!inner(
        id, code, legal_name, commercial_name, company_id,
        email, main_phone, main_address, city, country
      )
    `)
    .eq('id', invoiceId)
    .eq('supplier.company_id', companyId)
    .single()

  if (error || !data) {
    return errorResponse('Facture introuvable', 404, corsHeaders)
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

/**
 * Crée une nouvelle facture fournisseur
 */
async function createInvoice(
  supabase: any,
  companyId: string,
  body: any
): Promise<Response> {
  // Vérifier que le fournisseur appartient au workspace
  const { data: supplier, error: supplierError } = await supabase
    .from('suppliers')
    .select('id')
    .eq('id', body.supplier_id)
    .eq('company_id', companyId)
    .single()

  if (supplierError || !supplier) {
    return errorResponse('Fournisseur introuvable dans votre espace de travail', 400, corsHeaders)
  }

  // Valider les champs obligatoires
  const requiredFields = ['supplier_id', 'invoice_number', 'invoice_date', 'due_date', 'amount_excl_tax', 'vat_amount', 'amount_incl_tax']
  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null) {
      return errorResponse(`Champ obligatoire manquant : ${field}`, 400, corsHeaders)
    }
  }

  // Insérer la facture
  const { data, error } = await supabase
    .from('supplier_invoices')
    .insert({
      supplier_id: body.supplier_id,
      invoice_number: body.invoice_number,
      invoice_date: body.invoice_date,
      due_date: body.due_date,
      amount_excl_tax: body.amount_excl_tax,
      vat_amount: body.vat_amount,
      amount_incl_tax: body.amount_incl_tax,
      purchase_order_ref: body.purchase_order_ref || '',
      delivery_receipt_ref: body.delivery_receipt_ref || '',
      status: body.status || 'RECEIVED',
      technical_comments: body.technical_comments || '',
      accounting_comments: body.accounting_comments || '',
    })
    .select()
    .single()

  if (error) {
    console.error('Erreur createInvoice:', error)
    // Vérifier si c'est une violation d'unicité
    if (error.code === '23505') {
      return errorResponse('Ce numéro de facture existe déjà pour ce fournisseur', 409, corsHeaders)
    }
    return errorResponse('Erreur lors de la création de la facture', 500, corsHeaders)
  }

  return new Response(JSON.stringify(data), {
    status: 201,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

/**
 * Met à jour une facture existante
 */
async function updateInvoice(
  supabase: any,
  companyId: string,
  invoiceId: string,
  body: any
): Promise<Response> {
  // Vérifier que la facture appartient au workspace
  const { data: existing } = await supabase
    .from('supplier_invoices')
    .select('id, supplier:suppliers!inner(company_id)')
    .eq('id', invoiceId)
    .eq('supplier.company_id', companyId)
    .single()

  if (!existing) {
    return errorResponse('Facture introuvable', 404, corsHeaders)
  }

  // Champs modifiables (on exclut supplier_id et les champs auto-gérés)
  const updateData: Record<string, any> = {}
  const allowedFields = [
    'invoice_number', 'invoice_date', 'due_date',
    'amount_excl_tax', 'vat_amount', 'amount_incl_tax',
    'purchase_order_ref', 'delivery_receipt_ref',
    'status', 'technical_validation', 'technical_comments',
    'accounting_validation', 'accounting_comments',
    'payment_date', 'payment_amount', 'payment_reference',
  ]

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field]
    }
  }

  if (Object.keys(updateData).length === 0) {
    return errorResponse('Aucun champ à mettre à jour', 400, corsHeaders)
  }

  const { data, error } = await supabase
    .from('supplier_invoices')
    .update(updateData)
    .eq('id', invoiceId)
    .select()
    .single()

  if (error) {
    console.error('Erreur updateInvoice:', error)
    return errorResponse('Erreur lors de la mise à jour de la facture', 500, corsHeaders)
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

/**
 * Supprime une facture (uniquement si statut RECEIVED)
 */
async function deleteInvoice(
  supabase: any,
  companyId: string,
  invoiceId: string
): Promise<Response> {
  // Vérifier existence et appartenance au workspace
  const { data: existing } = await supabase
    .from('supplier_invoices')
    .select('id, status, supplier:suppliers!inner(company_id)')
    .eq('id', invoiceId)
    .eq('supplier.company_id', companyId)
    .single()

  if (!existing) {
    return errorResponse('Facture introuvable', 404, corsHeaders)
  }

  // Interdire la suppression des factures déjà validées/payées
  if (existing.status !== 'RECEIVED') {
    return errorResponse(
      'Impossible de supprimer une facture qui n\'est plus au statut RECEIVED',
      400,
      corsHeaders
    )
  }

  const { error } = await supabase
    .from('supplier_invoices')
    .delete()
    .eq('id', invoiceId)

  if (error) {
    console.error('Erreur deleteInvoice:', error)
    return errorResponse('Erreur lors de la suppression', 500, corsHeaders)
  }

  return new Response(
    JSON.stringify({ message: 'Facture supprimée avec succès' }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    }
  )
}
