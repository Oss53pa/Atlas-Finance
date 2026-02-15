/**
 * Edge Function : CRUD Paiements Fournisseurs
 *
 * Endpoints :
 *   GET    /payments         → Liste des paiements (filtre par statut, fournisseur, date)
 *   GET    /payments?id=xxx  → Détail d'un paiement (avec factures liées)
 *   POST   /payments         → Créer un paiement
 *   PUT    /payments?id=xxx  → Modifier un paiement
 *   DELETE /payments?id=xxx  → Supprimer un paiement (uniquement si PROPOSED)
 *
 * Tables : supplier_payments, supplier_payment_invoices
 * Isolation multi-tenant via suppliers.company_id
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
    const paymentId = url.searchParams.get('id')

    switch (req.method) {
      // ================================================================
      // GET : Liste ou détail
      // ================================================================
      case 'GET': {
        if (paymentId) {
          return await getPaymentById(supabase, user.companyId, paymentId)
        }
        return await listPayments(supabase, user.companyId, url.searchParams)
      }

      // ================================================================
      // POST : Créer un paiement
      // ================================================================
      case 'POST': {
        const body = await req.json()
        return await createPayment(supabase, user.companyId, user.id, body)
      }

      // ================================================================
      // PUT : Modifier un paiement
      // ================================================================
      case 'PUT': {
        if (!paymentId) {
          return errorResponse('Paramètre id requis', 400, corsHeaders)
        }
        const body = await req.json()
        return await updatePayment(supabase, user.companyId, paymentId, body)
      }

      // ================================================================
      // DELETE : Supprimer un paiement
      // ================================================================
      case 'DELETE': {
        if (!paymentId) {
          return errorResponse('Paramètre id requis', 400, corsHeaders)
        }
        return await deletePayment(supabase, user.companyId, paymentId)
      }

      default:
        return errorResponse('Méthode non autorisée', 405, corsHeaders)
    }
  } catch (err) {
    if (err instanceof AuthError) {
      return errorResponse(err.message, err.status, corsHeaders)
    }
    console.error('Erreur Edge Function payments:', err)
    return errorResponse('Erreur interne du serveur', 500, corsHeaders)
  }
})

// ================================================================
// HANDLERS
// ================================================================

/**
 * Liste les paiements du workspace avec filtres optionnels
 */
async function listPayments(
  supabase: any,
  companyId: string,
  params: URLSearchParams
): Promise<Response> {
  let query = supabase
    .from('supplier_payments')
    .select(`
      *,
      supplier:suppliers!inner(
        id, code, legal_name, commercial_name, company_id
      ),
      invoices:supplier_payment_invoices(
        invoice:supplier_invoices(
          id, invoice_number, amount_incl_tax, status
        )
      )
    `)
    .eq('supplier.company_id', companyId)
    .order('payment_date', { ascending: false })

  // Filtres optionnels
  const status = params.get('status')
  if (status) {
    query = query.eq('status', status)
  }

  const supplierId = params.get('supplier_id')
  if (supplierId) {
    query = query.eq('supplier_id', supplierId)
  }

  const dateFrom = params.get('date_from')
  if (dateFrom) {
    query = query.gte('payment_date', dateFrom)
  }

  const dateTo = params.get('date_to')
  if (dateTo) {
    query = query.lte('payment_date', dateTo)
  }

  // Pagination
  const page = parseInt(params.get('page') || '1')
  const limit = parseInt(params.get('limit') || '50')
  const offset = (page - 1) * limit
  query = query.range(offset, offset + limit - 1)

  const { data, error } = await query

  if (error) {
    console.error('Erreur listPayments:', error)
    return errorResponse('Erreur lors de la récupération des paiements', 500, corsHeaders)
  }

  return new Response(
    JSON.stringify({
      data: data || [],
      pagination: { page, limit },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    }
  )
}

/**
 * Récupère un paiement par son ID avec les factures associées
 */
async function getPaymentById(
  supabase: any,
  companyId: string,
  paymentId: string
): Promise<Response> {
  const { data, error } = await supabase
    .from('supplier_payments')
    .select(`
      *,
      supplier:suppliers!inner(
        id, code, legal_name, commercial_name, company_id,
        email, main_phone, main_address, city
      ),
      invoices:supplier_payment_invoices(
        invoice:supplier_invoices(
          id, invoice_number, invoice_date, due_date,
          amount_excl_tax, vat_amount, amount_incl_tax, status
        )
      )
    `)
    .eq('id', paymentId)
    .eq('supplier.company_id', companyId)
    .single()

  if (error || !data) {
    return errorResponse('Paiement introuvable', 404, corsHeaders)
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

/**
 * Crée un nouveau paiement avec association aux factures
 */
async function createPayment(
  supabase: any,
  companyId: string,
  userId: string,
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
  const requiredFields = ['supplier_id', 'payment_reference', 'payment_date', 'gross_amount', 'net_amount', 'payment_type']
  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null) {
      return errorResponse(`Champ obligatoire manquant : ${field}`, 400, corsHeaders)
    }
  }

  // Insérer le paiement
  const { data: payment, error: paymentError } = await supabase
    .from('supplier_payments')
    .insert({
      supplier_id: body.supplier_id,
      payment_reference: body.payment_reference,
      payment_date: body.payment_date,
      gross_amount: body.gross_amount,
      discount_amount: body.discount_amount || 0,
      net_amount: body.net_amount,
      payment_type: body.payment_type,
      early_payment_days: body.early_payment_days || 0,
      discount_rate_applied: body.discount_rate_applied || 0,
      status: body.status || 'PROPOSED',
      proposed_by: userId,
    })
    .select()
    .single()

  if (paymentError) {
    console.error('Erreur createPayment:', paymentError)
    if (paymentError.code === '23505') {
      return errorResponse('Cette référence de paiement existe déjà', 409, corsHeaders)
    }
    return errorResponse('Erreur lors de la création du paiement', 500, corsHeaders)
  }

  // Associer les factures au paiement (si fournies)
  if (body.invoice_ids && Array.isArray(body.invoice_ids) && body.invoice_ids.length > 0) {
    const junctionRecords = body.invoice_ids.map((invoiceId: string) => ({
      payment_id: payment.id,
      invoice_id: invoiceId,
    }))

    const { error: junctionError } = await supabase
      .from('supplier_payment_invoices')
      .insert(junctionRecords)

    if (junctionError) {
      console.error('Erreur association factures:', junctionError)
      // Le paiement est créé, on log l'erreur mais on ne rollback pas
    }
  }

  return new Response(JSON.stringify(payment), {
    status: 201,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

/**
 * Met à jour un paiement existant
 */
async function updatePayment(
  supabase: any,
  companyId: string,
  paymentId: string,
  body: any
): Promise<Response> {
  // Vérifier que le paiement appartient au workspace
  const { data: existing } = await supabase
    .from('supplier_payments')
    .select('id, status, supplier:suppliers!inner(company_id)')
    .eq('id', paymentId)
    .eq('supplier.company_id', companyId)
    .single()

  if (!existing) {
    return errorResponse('Paiement introuvable', 404, corsHeaders)
  }

  // Champs modifiables
  const updateData: Record<string, any> = {}
  const allowedFields = [
    'payment_reference', 'payment_date', 'gross_amount',
    'discount_amount', 'net_amount', 'payment_type',
    'early_payment_days', 'discount_rate_applied',
    'status', 'approved_by', 'approval_date',
    'bank_transaction_id', 'execution_date',
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
    .from('supplier_payments')
    .update(updateData)
    .eq('id', paymentId)
    .select()
    .single()

  if (error) {
    console.error('Erreur updatePayment:', error)
    return errorResponse('Erreur lors de la mise à jour du paiement', 500, corsHeaders)
  }

  // Mettre à jour les factures associées si fournies
  if (body.invoice_ids && Array.isArray(body.invoice_ids)) {
    // Supprimer les anciennes associations
    await supabase
      .from('supplier_payment_invoices')
      .delete()
      .eq('payment_id', paymentId)

    // Insérer les nouvelles
    if (body.invoice_ids.length > 0) {
      const junctionRecords = body.invoice_ids.map((invoiceId: string) => ({
        payment_id: paymentId,
        invoice_id: invoiceId,
      }))
      await supabase
        .from('supplier_payment_invoices')
        .insert(junctionRecords)
    }
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

/**
 * Supprime un paiement (uniquement si statut PROPOSED)
 */
async function deletePayment(
  supabase: any,
  companyId: string,
  paymentId: string
): Promise<Response> {
  // Vérifier existence et appartenance au workspace
  const { data: existing } = await supabase
    .from('supplier_payments')
    .select('id, status, supplier:suppliers!inner(company_id)')
    .eq('id', paymentId)
    .eq('supplier.company_id', companyId)
    .single()

  if (!existing) {
    return errorResponse('Paiement introuvable', 404, corsHeaders)
  }

  // Interdire la suppression des paiements approuvés/exécutés
  if (existing.status !== 'PROPOSED') {
    return errorResponse(
      'Impossible de supprimer un paiement qui n\'est plus au statut PROPOSED',
      400,
      corsHeaders
    )
  }

  // Supprimer les associations factures d'abord (cascade devrait gérer, mais soyons explicites)
  await supabase
    .from('supplier_payment_invoices')
    .delete()
    .eq('payment_id', paymentId)

  const { error } = await supabase
    .from('supplier_payments')
    .delete()
    .eq('id', paymentId)

  if (error) {
    console.error('Erreur deletePayment:', error)
    return errorResponse('Erreur lors de la suppression', 500, corsHeaders)
  }

  return new Response(
    JSON.stringify({ message: 'Paiement supprimé avec succès' }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    }
  )
}
