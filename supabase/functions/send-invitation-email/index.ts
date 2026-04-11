/**
 * Edge Function: send-invitation-email
 * Envoie un email d'invitation avec lien tokenisé.
 *
 * Deploy: supabase functions deploy send-invitation-email
 * Secrets: RESEND_API_KEY, SITE_URL
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';
const siteUrl = Deno.env.get('SITE_URL') || 'https://www.atlasstudio.org';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { email, organization_name, inviter_name, token, role } = await req.json();

    if (!email || !token) {
      return new Response(JSON.stringify({ error: 'email and token required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const inviteUrl = `${siteUrl}/accept-invite/${token}`;
    const roleLabel = {
      superadmin: 'Super Administrateur',
      admin: 'Administrateur',
      comptable: 'Comptable',
      controle_gestion: 'Contrôleur de Gestion',
      dg: 'Direction Générale',
      auditeur: 'Auditeur',
      readonly: 'Lecture seule',
      collaborateur: 'Collaborateur',
    }[role] || role;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #171717;">
  <div style="text-align: center; margin-bottom: 32px;">
    <div style="display: inline-block; background: #171717; color: white; padding: 12px 20px; border-radius: 12px; font-size: 20px; font-family: 'Grand Hotel', cursive;">
      Atlas Studio
    </div>
  </div>

  <div style="background: #f8f8f8; border-radius: 16px; padding: 32px; border: 1px solid #e5e5e5;">
    <h1 style="font-size: 22px; margin: 0 0 8px;">Vous êtes invité !</h1>
    <p style="color: #737373; font-size: 14px; margin: 0 0 24px;">
      ${inviter_name || 'Un administrateur'} vous invite à rejoindre
      <strong>${organization_name || 'une organisation'}</strong> sur Atlas Studio.
    </p>

    <div style="background: white; border-radius: 12px; padding: 16px; margin-bottom: 24px; border: 1px solid #e5e5e5;">
      <div style="font-size: 12px; color: #a3a3a3; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Rôle attribué</div>
      <div style="font-size: 16px; font-weight: 600;">${roleLabel}</div>
    </div>

    <a href="${inviteUrl}" style="display: block; background: #171717; color: white; text-align: center; padding: 14px 24px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 15px;">
      Accepter l'invitation
    </a>

    <p style="color: #a3a3a3; font-size: 12px; margin: 16px 0 0; text-align: center;">
      Ce lien expire dans 72 heures.
    </p>
  </div>

  <div style="text-align: center; margin-top: 32px; color: #a3a3a3; font-size: 11px;">
    Atlas Studio — Suite de gestion pour l'Afrique<br>
    <a href="${siteUrl}" style="color: #737373;">atlasstudio.org</a>
  </div>
</body>
</html>`;

    // Send via Resend (or fallback to console log)
    if (resendApiKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Atlas Studio <noreply@atlasstudio.org>',
          to: [email],
          subject: `Invitation à rejoindre ${organization_name || 'Atlas Studio'}`,
          html,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        console.error('Resend error:', result);
        return new Response(JSON.stringify({ error: 'Email send failed', detail: result }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, id: result.id }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // No API key → log only
    console.log(`[INVITATION EMAIL] To: ${email}, URL: ${inviteUrl}`);
    return new Response(JSON.stringify({ success: true, mode: 'dry-run', inviteUrl }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Email error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
