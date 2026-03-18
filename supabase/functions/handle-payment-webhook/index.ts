/**
 * Edge Function: handle-payment-webhook
 * Reçoit les webhooks des opérateurs Mobile Money (CinetPay, Paygate, etc.)
 * et met à jour le statut de la facture + active la souscription.
 *
 * Deploy: supabase functions deploy handle-payment-webhook
 * Secret: PAYMENT_WEBHOOK_SECRET (signature verification)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const webhookSecret = Deno.env.get('PAYMENT_WEBHOOK_SECRET') || '';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify webhook signature (adapt to your payment provider)
    const signature = req.headers.get('x-webhook-signature') || '';
    if (webhookSecret && signature) {
      // TODO: Verify HMAC signature based on provider (CinetPay, Paygate, etc.)
      // const isValid = await verifySignature(body, signature, webhookSecret);
      // if (!isValid) return new Response('Invalid signature', { status: 401 });
    }

    const {
      transaction_id,   // Payment provider transaction ID
      status,           // 'ACCEPTED' | 'REFUSED' | 'CANCELLED'
      amount,
      currency,
      metadata,         // { invoice_id, tenant_id }
    } = body;

    const invoiceId = metadata?.invoice_id || body.invoice_id;
    const paymentRef = transaction_id || body.payment_reference;

    if (!invoiceId) {
      return new Response(JSON.stringify({ error: 'Missing invoice_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the invoice
    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .select('*, tenant_id, subscription_id')
      .eq('id', invoiceId)
      .single();

    if (invErr || !invoice) {
      return new Response(JSON.stringify({ error: 'Invoice not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (status === 'ACCEPTED' || status === 'SUCCESS' || status === 'COMPLETED') {
      // Payment confirmed → activate
      await supabase.from('invoices').update({
        status: 'paid',
        payment_reference: paymentRef,
        paid_at: new Date().toISOString(),
      }).eq('id', invoiceId);

      // Activate subscription
      if (invoice.subscription_id) {
        await supabase.from('subscriptions').update({
          status: 'active',
          activated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', invoice.subscription_id);
      }

      // Activate tenant
      await supabase.from('tenants').update({
        status: 'active',
        updated_at: new Date().toISOString(),
      }).eq('id', invoice.tenant_id);

      // Audit log
      await supabase.from('audit_logs').insert({
        tenant_id: invoice.tenant_id,
        action: 'PAYMENT_CONFIRMED_WEBHOOK',
        resource_type: 'invoice',
        resource_id: invoiceId,
        metadata: { transaction_id, amount, currency, provider: body.provider || 'unknown' },
      });

      return new Response(JSON.stringify({ success: true, action: 'activated' }), {
        headers: { 'Content-Type': 'application/json' },
      });

    } else if (status === 'REFUSED' || status === 'FAILED' || status === 'CANCELLED') {
      // Payment failed
      await supabase.from('invoices').update({
        status: 'failed',
        payment_reference: paymentRef,
      }).eq('id', invoiceId);

      await supabase.from('audit_logs').insert({
        tenant_id: invoice.tenant_id,
        action: 'PAYMENT_FAILED_WEBHOOK',
        resource_type: 'invoice',
        resource_id: invoiceId,
        metadata: { transaction_id, status, reason: body.reason || 'unknown' },
      });

      return new Response(JSON.stringify({ success: true, action: 'failed' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, action: 'ignored', status }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
