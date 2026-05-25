/**
 * Edge Function: create-user
 * Crée un utilisateur Supabase Auth + profil + envoie un email HTML de bienvenue.
 *
 * Deploy: supabase functions deploy create-user
 * Secrets nécessaires: RESEND_API_KEY, SITE_URL
 * Secrets automatiques: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
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
    // ── 1. Valider le JWT de l'appelant (doit être admin/superadmin) ──────────
    const authHeader = req.headers.get('authorization') || '';
    const callerToken = authHeader.replace('Bearer ', '');
    if (!callerToken) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Client admin (service role) pour créer des users
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Vérifier que l'appelant est authentifié
    const { data: { user: caller }, error: callerError } = await adminClient.auth.getUser(callerToken);
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: 'Token invalide' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 2. Lire le body ────────────────────────────────────────────────────────
    const { prenom, nom, email, password, role, telephone, departement, companyName } = await req.json();

    if (!email || !password || !prenom || !nom) {
      return new Response(JSON.stringify({ error: 'Champs requis: email, password, prenom, nom' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (password.length < 8) {
      return new Response(JSON.stringify({ error: 'Mot de passe trop court (minimum 8 caractères)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 3. Créer le compte Supabase Auth ──────────────────────────────────────
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,          // compte confirmé d'emblée
      user_metadata: { first_name: prenom, last_name: nom, role },
    });

    if (createError) {
      const msg = createError.message.includes('already registered')
        ? 'Un compte avec cet email existe déjà'
        : createError.message;
      return new Response(JSON.stringify({ error: msg }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 4. Créer le profil dans public.profiles ───────────────────────────────
    if (newUser?.user) {
      // Récupérer le company_id du caller depuis son profil
      const { data: callerProfile } = await adminClient
        .from('profiles')
        .select('company_id')
        .eq('id', caller.id)
        .single();

      await adminClient.from('profiles').upsert({
        id: newUser.user.id,
        email,
        first_name: prenom,
        last_name: nom,
        company_id: callerProfile?.company_id ?? null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    }

    // ── 5. Envoyer l'email HTML de bienvenue ──────────────────────────────────
    const loginUrl = `${siteUrl}/login`;
    const roleLabelMap: Record<string, string> = {
      Administrateur: 'Administrateur',
      Manager: 'Manager',
      Comptable: 'Comptable',
      Lecteur: 'Lecteur',
      superadmin: 'Super Administrateur',
    };
    const roleLabel = roleLabelMap[role] || role || 'Collaborateur';
    const orgName = companyName || 'votre organisation';
    const callerName = `${caller.user_metadata?.first_name ?? ''} ${caller.user_metadata?.last_name ?? ''}`.trim() || caller.email;

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenue sur Atlas Finance &amp; Accounting</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="text-align:center;padding-bottom:28px;">
          <div style="display:inline-block;background:#1a1a1a;padding:14px 24px;border-radius:14px;">
            <span style="font-size:22px;color:#ffffff;letter-spacing:0.5px;">Atlas Finance &amp; Accounting</span>
          </div>
        </td></tr>

        <!-- Card principale -->
        <tr><td style="background:#ffffff;border-radius:20px;padding:40px;box-shadow:0 2px 16px rgba(0,0,0,0.07);border:1px solid #e8e8e0;">

          <!-- Icône bienvenue -->
          <div style="text-align:center;margin-bottom:28px;">
            <div style="display:inline-block;background:#fff8f0;border:2px solid #f0d8b0;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:30px;">
              🎉
            </div>
          </div>

          <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#171717;text-align:center;">
            Bienvenue, ${prenom} !
          </h1>
          <p style="margin:0 0 28px;font-size:15px;color:#737373;text-align:center;line-height:1.6;">
            ${callerName} vient de créer votre compte sur <strong>${orgName}</strong>.
          </p>

          <!-- Infos compte -->
          <div style="background:#fafaf8;border:1px solid #e8e8e0;border-radius:14px;padding:24px;margin-bottom:28px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #f0f0e8;">
                  <span style="font-size:12px;color:#a3a3a3;text-transform:uppercase;letter-spacing:0.8px;display:block;margin-bottom:2px;">Email</span>
                  <span style="font-size:15px;color:#171717;font-weight:500;">${email}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #f0f0e8;">
                  <span style="font-size:12px;color:#a3a3a3;text-transform:uppercase;letter-spacing:0.8px;display:block;margin-bottom:2px;">Rôle</span>
                  <span style="display:inline-block;background:#fff3e0;color:#e65100;font-size:13px;font-weight:600;padding:4px 12px;border-radius:20px;">${roleLabel}</span>
                </td>
              </tr>
              ${departement ? `
              <tr>
                <td style="padding:8px 0;">
                  <span style="font-size:12px;color:#a3a3a3;text-transform:uppercase;letter-spacing:0.8px;display:block;margin-bottom:2px;">Département</span>
                  <span style="font-size:15px;color:#171717;font-weight:500;">${departement}</span>
                </td>
              </tr>` : ''}
            </table>
          </div>

          <!-- Bouton CTA -->
          <div style="text-align:center;margin-bottom:24px;">
            <a href="${loginUrl}"
               style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:16px 36px;border-radius:12px;font-size:16px;font-weight:600;letter-spacing:0.3px;">
              Se connecter →
            </a>
          </div>

          <!-- Mot de passe info -->
          <div style="background:#fffbf0;border:1px solid #fde68a;border-radius:12px;padding:16px;margin-bottom:8px;">
            <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
              <strong>🔒 Mot de passe temporaire</strong> — Le mot de passe a été défini par votre administrateur.
              Nous vous recommandons de le changer dès votre première connexion depuis votre profil.
            </p>
          </div>

        </td></tr>

        <!-- Footer -->
        <tr><td style="text-align:center;padding:28px 0 0;color:#a3a3a3;font-size:12px;line-height:1.8;">
          Atlas Finance &amp; Accounting — Suite de gestion pour l'Afrique francophone<br>
          <a href="${siteUrl}" style="color:#737373;text-decoration:none;">atlasstudio.org</a>
          &nbsp;·&nbsp;
          <a href="${siteUrl}/support" style="color:#737373;text-decoration:none;">Support</a>
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
          subject: `Votre compte Atlas Finance & Accounting est prêt`,
          html,
        }),
      });
      emailSent = res.ok;
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('[create-user] Resend error:', err);
      }
    } else {
      // Mode dry-run : log seulement
      console.log(`[create-user] Email to: ${email} (dry-run — RESEND_API_KEY absent)`);
      emailSent = true; // ne pas bloquer la création
    }

    return new Response(JSON.stringify({
      success: true,
      userId: newUser?.user?.id,
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
