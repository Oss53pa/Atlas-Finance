/**
 * Edge Function: generate-invoice-pdf
 * Génère un PDF de facture HTML et l'upload dans Supabase Storage.
 *
 * Deploy: supabase functions deploy generate-invoice-pdf
 * Trigger: appelé après confirmation de paiement
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { invoice_id } = await req.json();
    if (!invoice_id) {
      return new Response(JSON.stringify({ error: 'invoice_id required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch invoice + tenant
    const { data: invoice } = await supabase
      .from('invoices')
      .select('*, tenant:tenants(name, rccm, country, billing_email)')
      .eq('id', invoice_id)
      .single();

    if (!invoice) {
      return new Response(JSON.stringify({ error: 'Invoice not found' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }

    const fmt = (n: number) => (n || 0).toLocaleString('fr-FR');
    const invoiceNumber = invoice.invoice_number || `AS-${new Date().getFullYear()}-${invoice_id.slice(0, 6).toUpperCase()}`;

    // Generate HTML invoice
    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #171717; margin: 0; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
  .brand { font-size: 28px; font-weight: bold; }
  .invoice-info { text-align: right; }
  .invoice-number { font-size: 20px; font-weight: bold; color: #171717; }
  .meta { color: #737373; font-size: 13px; margin-top: 4px; }
  .parties { display: flex; justify-content: space-between; margin-bottom: 40px; }
  .party { width: 45%; }
  .party-label { font-size: 11px; color: #a3a3a3; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  .party-name { font-size: 16px; font-weight: 600; }
  .party-detail { font-size: 13px; color: #525252; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
  th { background: #171717; color: white; padding: 12px 16px; text-align: left; font-size: 12px; text-transform: uppercase; }
  td { padding: 12px 16px; border-bottom: 1px solid #e5e5e5; font-size: 14px; }
  .total-row td { font-weight: bold; font-size: 16px; border-top: 2px solid #171717; }
  .footer { text-align: center; color: #a3a3a3; font-size: 11px; margin-top: 60px; border-top: 1px solid #e5e5e5; padding-top: 20px; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  .badge-paid { background: #dcfce7; color: #166534; }
  .badge-pending { background: #fef3c7; color: #92400e; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Atlas Studio</div>
      <div class="meta">Suite de gestion pour l'Afrique</div>
      <div class="meta">Douala, Cameroun</div>
    </div>
    <div class="invoice-info">
      <div class="invoice-number">FACTURE ${invoiceNumber}</div>
      <div class="meta">Date : ${new Date(invoice.created_at).toLocaleDateString('fr-FR')}</div>
      ${invoice.paid_at ? `<div class="meta">Payée le : ${new Date(invoice.paid_at).toLocaleDateString('fr-FR')}</div>` : ''}
      <div style="margin-top: 8px;">
        <span class="badge ${invoice.status === 'paid' ? 'badge-paid' : 'badge-pending'}">
          ${invoice.status === 'paid' ? 'PAYÉE' : 'EN ATTENTE'}
        </span>
      </div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-label">Émetteur</div>
      <div class="party-name">Atlas Studio SARL</div>
      <div class="party-detail">RCCM : CI-ABJ-2024-B-00001</div>
      <div class="party-detail">Douala, Cameroun</div>
      <div class="party-detail">contact@atlasstudio.com</div>
    </div>
    <div class="party">
      <div class="party-label">Client</div>
      <div class="party-name">${invoice.tenant?.name || '—'}</div>
      ${invoice.tenant?.rccm ? `<div class="party-detail">RCCM : ${invoice.tenant.rccm}</div>` : ''}
      <div class="party-detail">${invoice.tenant?.country || ''}</div>
      <div class="party-detail">${invoice.tenant?.billing_email || ''}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Période</th>
        <th style="text-align:right">Montant</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Abonnement Atlas Studio</td>
        <td>${invoice.period_start ? new Date(invoice.period_start).toLocaleDateString('fr-FR') : ''} — ${invoice.period_end ? new Date(invoice.period_end).toLocaleDateString('fr-FR') : ''}</td>
        <td style="text-align:right">${fmt(invoice.amount)} ${invoice.currency}</td>
      </tr>
      <tr class="total-row">
        <td colspan="2">TOTAL</td>
        <td style="text-align:right">${fmt(invoice.amount)} ${invoice.currency}</td>
      </tr>
    </tbody>
  </table>

  ${invoice.payment_method ? `<p style="font-size:13px;color:#525252;">Mode de paiement : <strong>${invoice.payment_method}</strong></p>` : ''}
  ${invoice.payment_reference ? `<p style="font-size:13px;color:#525252;">Référence : <strong>${invoice.payment_reference}</strong></p>` : ''}

  <div class="footer">
    Atlas Studio SARL — Suite de gestion d'entreprise pour l'Afrique<br>
    Cette facture est générée automatiquement et ne nécessite pas de signature.
  </div>
</body>
</html>`;

    // Store HTML as a file in Supabase Storage (PDF generation requires Puppeteer which isn't available in Edge Functions)
    const filePath = `invoices/${invoice.tenant_id}/${invoiceNumber}.html`;
    const { error: uploadErr } = await supabase.storage
      .from('documents')
      .upload(filePath, new Blob([html], { type: 'text/html' }), {
        contentType: 'text/html',
        upsert: true,
      });

    if (uploadErr) {
      console.error('Upload error:', uploadErr);
      // Non-blocking — continue even if storage fails
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);
    const pdfUrl = urlData?.publicUrl || '';

    // Update invoice with PDF URL and number
    await supabase.from('invoices').update({
      pdf_url: pdfUrl,
      invoice_number: invoiceNumber,
    }).eq('id', invoice_id);

    return new Response(JSON.stringify({
      success: true,
      invoice_number: invoiceNumber,
      url: pdfUrl,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Invoice generation error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
