/**
 * Edge Function : Statistiques Factures / Dashboard
 *
 * Endpoints :
 *   GET /invoices-stats → Statistiques consolidées pour le dashboard
 *
 * Retourne :
 * - Nombre total de factures par statut
 * - CA HT total / période
 * - Montant des impayés
 * - Top fournisseurs
 * - Évolution mensuelle
 *
 * Toutes les requêtes filtrées par company_id (multi-tenant).
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

    if (req.method !== 'GET') {
      return errorResponse('Méthode non autorisée', 405, corsHeaders)
    }

    const supabase = createAdminClient()
    const url = new URL(req.url)
    const companyId = user.companyId

    // Paramètres optionnels de période
    const dateFrom = url.searchParams.get('date_from')
    const dateTo = url.searchParams.get('date_to')

    // Récupérer toutes les factures du workspace
    let query = supabase
      .from('supplier_invoices')
      .select(`
        id, status, invoice_date, due_date,
        amount_excl_tax, vat_amount, amount_incl_tax,
        payment_date, payment_amount,
        supplier:suppliers!inner(
          id, code, legal_name, company_id
        )
      `)
      .eq('supplier.company_id', companyId)

    if (dateFrom) {
      query = query.gte('invoice_date', dateFrom)
    }
    if (dateTo) {
      query = query.lte('invoice_date', dateTo)
    }

    const { data: invoices, error } = await query

    if (error) {
      console.error('Erreur récupération stats:', error)
      return errorResponse('Erreur lors du calcul des statistiques', 500, corsHeaders)
    }

    const allInvoices = invoices || []

    // ================================================================
    // Calcul des statistiques
    // ================================================================

    // 1. Totaux globaux
    const totalInvoices = allInvoices.length
    const totalHT = allInvoices.reduce((sum: number, inv: any) => sum + Number(inv.amount_excl_tax || 0), 0)
    const totalTVA = allInvoices.reduce((sum: number, inv: any) => sum + Number(inv.vat_amount || 0), 0)
    const totalTTC = allInvoices.reduce((sum: number, inv: any) => sum + Number(inv.amount_incl_tax || 0), 0)

    // 2. Répartition par statut
    const byStatus: Record<string, { count: number; amount_ht: number; amount_ttc: number }> = {}
    for (const inv of allInvoices) {
      if (!byStatus[inv.status]) {
        byStatus[inv.status] = { count: 0, amount_ht: 0, amount_ttc: 0 }
      }
      byStatus[inv.status].count++
      byStatus[inv.status].amount_ht += Number(inv.amount_excl_tax || 0)
      byStatus[inv.status].amount_ttc += Number(inv.amount_incl_tax || 0)
    }

    // 3. Impayés : factures échues non payées
    const today = new Date().toISOString().split('T')[0]
    const unpaidStatuses = ['RECEIVED', 'VALIDATED', 'ACCOUNTING_OK', 'APPROVED']
    const overdueInvoices = allInvoices.filter(
      (inv: any) => unpaidStatuses.includes(inv.status) && inv.due_date < today
    )
    const overdueAmount = overdueInvoices.reduce(
      (sum: number, inv: any) => sum + Number(inv.amount_incl_tax || 0),
      0
    )

    // 4. Factures à venir (échéance dans les 30 prochains jours)
    const in30Days = new Date()
    in30Days.setDate(in30Days.getDate() + 30)
    const in30DaysStr = in30Days.toISOString().split('T')[0]

    const upcomingDue = allInvoices.filter(
      (inv: any) =>
        unpaidStatuses.includes(inv.status) &&
        inv.due_date >= today &&
        inv.due_date <= in30DaysStr
    )
    const upcomingAmount = upcomingDue.reduce(
      (sum: number, inv: any) => sum + Number(inv.amount_incl_tax || 0),
      0
    )

    // 5. Top 5 fournisseurs par montant HT
    const supplierTotals: Record<string, { name: string; amount_ht: number; count: number }> = {}
    for (const inv of allInvoices) {
      const suppId = inv.supplier?.id
      if (suppId) {
        if (!supplierTotals[suppId]) {
          supplierTotals[suppId] = {
            name: inv.supplier.legal_name || inv.supplier.code,
            amount_ht: 0,
            count: 0,
          }
        }
        supplierTotals[suppId].amount_ht += Number(inv.amount_excl_tax || 0)
        supplierTotals[suppId].count++
      }
    }
    const topSuppliers = Object.entries(supplierTotals)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.amount_ht - a.amount_ht)
      .slice(0, 5)

    // 6. Évolution mensuelle (12 derniers mois)
    const monthlyData: Record<string, { count: number; amount_ht: number; amount_ttc: number }> = {}
    for (const inv of allInvoices) {
      const month = inv.invoice_date?.substring(0, 7) // YYYY-MM
      if (month) {
        if (!monthlyData[month]) {
          monthlyData[month] = { count: 0, amount_ht: 0, amount_ttc: 0 }
        }
        monthlyData[month].count++
        monthlyData[month].amount_ht += Number(inv.amount_excl_tax || 0)
        monthlyData[month].amount_ttc += Number(inv.amount_incl_tax || 0)
      }
    }

    // Trier par mois et garder les 12 derniers
    const monthlyEvolution = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, data]) => ({ month, ...data }))

    // 7. Montant total payé
    const paidInvoices = allInvoices.filter((inv: any) => inv.status === 'PAID')
    const totalPaid = paidInvoices.reduce(
      (sum: number, inv: any) => sum + Number(inv.payment_amount || inv.amount_incl_tax || 0),
      0
    )

    // ================================================================
    // Réponse consolidée
    // ================================================================
    const stats = {
      // Totaux
      total_invoices: totalInvoices,
      total_ht: Math.round(totalHT * 100) / 100,
      total_tva: Math.round(totalTVA * 100) / 100,
      total_ttc: Math.round(totalTTC * 100) / 100,
      total_paid: Math.round(totalPaid * 100) / 100,

      // Impayés
      overdue_count: overdueInvoices.length,
      overdue_amount: Math.round(overdueAmount * 100) / 100,

      // Échéances à venir (30j)
      upcoming_due_count: upcomingDue.length,
      upcoming_due_amount: Math.round(upcomingAmount * 100) / 100,

      // Répartition par statut
      by_status: byStatus,

      // Top fournisseurs
      top_suppliers: topSuppliers,

      // Évolution mensuelle
      monthly_evolution: monthlyEvolution,
    }

    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return errorResponse(err.message, err.status, corsHeaders)
    }
    console.error('Erreur Edge Function invoices-stats:', err)
    return errorResponse('Erreur interne du serveur', 500, corsHeaders)
  }
})
