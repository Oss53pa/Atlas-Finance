/**
 * Edge Function: create-user
 * Flow invitation :
 *   1. Admin crée un collaborateur (sans mot de passe)
 *   2. generateLink({ type: 'invite' }) → lien Supabase
 *   3. Email HTML de bienvenue avec le lien → /premier-connexion
 *   4. Collaborateur clique → confirme email + définit son mot de passe
 *
 * Deploy: supabase functions deploy create-user
 * Secrets: RESEND_API_KEY, SITE_URL
 * Auto:    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';
const siteUrl = Deno.env.get('SITE_URL') || 'https://www.atlasstudio.org';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    // ── 1. Vérifier JWT de l'appelant ─────────────────────────────────────────
    const authHeader = req.headers.get('authorization') || '';
    const callerToken = authHeader.replace('Bearer ', '');
    if (!callerToken) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user: caller }, error: callerError } = await adminClient.auth.getUser(callerToken);
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: 'Token invalide' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 2. Body ────────────────────────────────────────────────────────────────
    const { prenom, nom, email, role, telephone, departement, companyName } = await req.json();

    if (!email || !prenom || !nom) {
      return new Response(JSON.stringify({ error: 'Champs requis: email, prenom, nom' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Format email invalide' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 3. Générer le lien d'invitation Supabase ──────────────────────────────
    // generateLink type 'invite' : crée le user si inexistant, génère un magic link
    // qui, une fois cliqué, établit une session → l'user peut définir son mot de passe.
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        redirectTo: `${siteUrl}/premier-connexion`,
        data: { first_name: prenom, last_name: nom, role },
      },
    });

    if (linkError) {
      const msg = linkError.message.includes('already registered')
        ? 'Un compte avec cet email existe déjà'
        : linkError.message;
      return new Response(JSON.stringify({ error: msg }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = linkData?.user?.id;
    const inviteUrl = linkData?.properties?.action_link ?? `${siteUrl}/premier-connexion`;

    // ── 4. Créer/mettre à jour le profil ──────────────────────────────────────
    if (userId) {
      const { data: callerProfile } = await adminClient
        .from('profiles')
        .select('company_id')
        .eq('id', caller.id)
        .single();

      await adminClient.from('profiles').upsert({
        id: userId,
        email,
        first_name: prenom,
        last_name: nom,
        company_id: callerProfile?.company_id ?? null,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    }

    // ── 5. Email HTML de bienvenue ─────────────────────────────────────────────
    const roleLabelMap: Record<string, string> = {
      Administrateur: 'Administrateur',
      Manager: 'Manager',
      Comptable: 'Comptable',
      Lecteur: 'Lecteur',
      superadmin: 'Super Administrateur',
    };
    const roleLabel = roleLabelMap[role] || role || 'Collaborateur';
    const orgName = companyName || 'votre organisation';
    const callerDisplay = `${caller.user_metadata?.first_name ?? ''} ${caller.user_metadata?.last_name ?? ''}`.trim()
      || caller.email || 'Votre administrateur';

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre invitation Atlas Finance &amp; Accounting</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="text-align:center;padding-bottom:28px;">
          <div style="display:inline-block;background:#1a1a1a;padding:14px 24px;border-radius:14px;">
            <span style="font-size:20px;color:#ffffff;font-weight:600;letter-spacing:0.5px;">Atlas Finance &amp; Accounting</span>
          </div>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#ffffff;border-radius:20px;padding:40px;box-shadow:0 2px 16px rgba(0,0,0,0.07);border:1px solid #e8e8e0;">

          <!-- Icon -->
          <div style="text-align:center;margin-bottom:28px;">
            <div style="display:inline-block;background:#f0fdf4;border:2px solid #bbf7d0;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:28px;">
              📨
            </div>
          </div>

          <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#171717;text-align:center;">
            Bienvenue, ${prenom} !
          </h1>
          <p style="margin:0 0 28px;font-size:15px;color:#737373;text-align:center;line-height:1.6;">
            <strong>${callerDisplay}</strong> vous invite à rejoindre
            <strong>${orgName}</strong> sur Atlas Finance &amp; Accounting.
          </p>

          <!-- Infos compte -->
          <div style="background:#fafaf8;border:1px solid #e8e8e0;border-radius:14px;padding:24px;margin-bottom:28px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #f0f0e8;">
                  <span style="font-size:11px;color:#a3a3a3;text-transform:uppercase;letter-spacing:0.8px;display:block;margin-bottom:3px;">Email</span>
                  <span style="font-size:15px;color:#171717;font-weight:600;">${email}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;${departement ? 'border-bottom:1px solid #f0f0e8;' : ''}">
                  <span style="font-size:11px;color:#a3a3a3;text-transform:uppercase;letter-spacing:0.8px;display:block;margin-bottom:3px;">Rôle</span>
                  <span style="display:inline-block;background:#fff3e0;color:#c2410c;font-size:13px;font-weight:600;padding:4px 12px;border-radius:20px;">${roleLabel}</span>
                </td>
              </tr>
              ${departement ? `
              <tr>
                <td style="padding:8px 0;">
                  <span style="font-size:11px;color:#a3a3a3;text-transform:uppercase;letter-spacing:0.8px;display:block;margin-bottom:3px;">Département</span>
                  <span style="font-size:15px;color:#171717;font-weight:500;">${departement}</span>
                </td>
              </tr>` : ''}
            </table>
          </div>

          <!-- CTA principal -->
          <div style="text-align:center;margin-bottom:20px;">
            <a href="${inviteUrl}"
               style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:14px;font-size:16px;font-weight:700;letter-spacing:0.3px;">
              Accéder à mon compte →
            </a>
          </div>

          <!-- Info steps -->
          <div style="background:#f8faff;border:1px solid #dbeafe;border-radius:12px;padding:16px;margin-bottom:8px;">
            <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#1e40af;">En cliquant sur le bouton :</p>
            <ol style="margin:0;padding-left:18px;font-size:13px;color:#1e40af;line-height:1.8;">
              <li>Votre adresse email est confirmée automatiquement</li>
              <li>Vous définissez votre mot de passe personnel</li>
              <li>Vous accédez directement à votre tableau de bord</li>
            </ol>
          </div>

          <p style="margin:16px 0 0;font-size:12px;color:#a3a3a3;text-align:center;">
            ⏳ Ce lien est valide <strong>72 heures</strong>. Après expiration, contactez votre administrateur.
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="text-align:center;padding:28px 0 0;color:#a3a3a3;font-size:12px;line-height:1.8;">
          Atlas Finance &amp; Accounting — Suite de gestion pour l'Afrique francophone<br>
          <a href="${siteUrl}" style="color:#737373;text-decoration:none;">atlasstudio.org</a>
          &nbsp;·&nbsp;
          <a href="${siteUrl}/support" style="color:#737373;text-decoration:none;">Support</a>
          <br><br>
          Si vous n'attendiez pas cette invitation, ignorez simplement cet email.
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    let emailSent = false;
    if (resendApiKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Atlas Finance <noreply@atlasstudio.org>',
          to: [email],
          subject: `${callerDisplay} vous invite sur Atlas Finance & Accounting`,
          html,
        }),
      });
      emailSent = res.ok;
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('[create-user] Resend error:', err);
      }
    } else {
      // Dry-run
      console.log(`[create-user] Invite URL (dry-run): ${inviteUrl}`);
      emailSent = true;
    }

    return new Response(JSON.stringify({
      success: true,
      userId,
      emailSent,
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[create-user] Error:', err);
    return new Response(JSON.stringify({ error: 'Erreur interne du serveur' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
