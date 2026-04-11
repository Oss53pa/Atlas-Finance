/**
 * Edge Function: check-expiring-licenses
 * Cron job quotidien — identifie les licences expirant dans 7j et 1j.
 * Envoie des relances email et crée des alertes admin.
 *
 * Deploy: supabase functions deploy check-expiring-licenses
 * Cron: Configure via Supabase Dashboard > Edge Functions > Schedule
 *       Cron expression: 0 8 * * * (tous les jours à 8h)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const siteUrl = Deno.env.get('SITE_URL') || 'https://www.atlasstudio.org';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const in7days = new Date(now.getTime() + 7 * 86400000).toISOString();
    const in1day = new Date(now.getTime() + 1 * 86400000).toISOString();
    const today = now.toISOString().split('T')[0];

    // Find subscriptions expiring within 7 days
    const { data: expiringSubs } = await supabase
      .from('subscriptions')
      .select('id, organization_id, status, current_period_end, solution:solutions(name)')
      .in('status', ['active', 'trialing'])
      .lte('current_period_end', in7days)
      .gte('current_period_end', today);

    const results = {
      checked: expiringSubs?.length || 0,
      alerts_7days: 0,
      alerts_1day: 0,
      emails_sent: 0,
    };

    for (const sub of (expiringSubs || [])) {
      const endDate = new Date(sub.current_period_end);
      const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / 86400000);

      // Get tenant info
      const { data: tenant } = await supabase
        .from('tenants')
        .select('name, billing_email')
        .eq('id', sub.organization_id)
        .single();

      if (!tenant) continue;

      // Create audit log alert
      const alertType = daysLeft <= 1 ? 'LICENSE_EXPIRING_1DAY' : 'LICENSE_EXPIRING_7DAYS';
      await supabase.from('audit_logs').insert({
        tenant_id: sub.organization_id,
        action: alertType,
        resource_type: 'subscription',
        resource_id: sub.id,
        metadata: {
          solution: (sub.solution as any)?.name,
          expires_at: sub.current_period_end,
          days_left: daysLeft,
        },
      });

      if (daysLeft <= 1) results.alerts_1day++;
      else results.alerts_7days++;

      // Send email reminder (if billing_email exists)
      if (tenant.billing_email) {
        try {
          const resendApiKey = Deno.env.get('RESEND_API_KEY');
          if (resendApiKey) {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'Atlas Studio <noreply@atlasstudio.org>',
                to: [tenant.billing_email],
                subject: daysLeft <= 1
                  ? `⚠️ Votre licence ${(sub.solution as any)?.name} expire demain`
                  : `Votre licence ${(sub.solution as any)?.name} expire dans ${daysLeft} jours`,
                html: `
                  <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                    <h2>Bonjour ${tenant.name},</h2>
                    <p>Votre abonnement <strong>${(sub.solution as any)?.name}</strong> expire
                    ${daysLeft <= 1 ? '<strong>demain</strong>' : `dans <strong>${daysLeft} jours</strong>`}
                    (le ${endDate.toLocaleDateString('fr-FR')}).</p>
                    <p>Renouvelez votre licence pour continuer à utiliser le service sans interruption.</p>
                    <a href="${siteUrl}/client/billing" style="display:inline-block;background:#171717;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
                      Renouveler maintenant
                    </a>
                    <p style="color:#999;font-size:12px;margin-top:20px;">Atlas Studio — Suite de gestion pour l'Afrique</p>
                  </div>
                `,
              }),
            });
            results.emails_sent++;
          }
        } catch (emailErr) {
          console.error(`Email failed for ${tenant.billing_email}:`, emailErr);
        }
      }
    }

    // Suspend expired subscriptions (past due)
    const { data: expiredSubs } = await supabase
      .from('subscriptions')
      .select('id, organization_id')
      .in('status', ['active', 'trialing'])
      .lt('current_period_end', today);

    for (const sub of (expiredSubs || [])) {
      await supabase.from('subscriptions').update({
        status: 'past_due',
        updated_at: now.toISOString(),
      }).eq('id', sub.id);

      await supabase.from('audit_logs').insert({
        tenant_id: sub.organization_id,
        action: 'SUBSCRIPTION_EXPIRED',
        resource_type: 'subscription',
        resource_id: sub.id,
      });
    }

    results.expired = expiredSubs?.length || 0;

    console.log('[check-expiring-licenses]', results);
    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Cron error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
