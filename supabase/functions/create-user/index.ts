/**
 * Edge Function: create-user  (v2 — token_hash anti-prefetch)
 *
 * FIX BUG "lien expiré immédiatement" :
 *   Les scanners email (Microsoft SafeLinks, Proofpoint, Gmail) préfetchent
 *   les URLs. Si on envoie action_link (GoTrue /verify?token=...), le token
 *   est consommé par le scanner AVANT que l'utilisateur clique.
 *
 * SOLUTION :
 *   On construit l'URL avec hashed_token + type → /premier-connexion?token_hash=xxx&type=invite
 *   La consommation se fait client-side via supabase.auth.verifyOtp().
 *   Les scanners ne peuvent pas exécuter le JS → token intact jusqu'au clic réel.
 *
 * FALLBACK RECOVERY :
 *   Si l'email est déjà enregistré dans Supabase Auth (user existant), on bascule
 *   automatiquement sur type='recovery' (lien de redéfinition de mot de passe).
 *
 * Deploy: supabase functions deploy create-user
 * Secrets: RESEND_API_KEY, SITE_URL
 * Auto:    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'Atlas Finance <noreply@atlasstudio.org>';
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://www.atlasstudio.org';

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') ?? '';
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') return new Response('ok', { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  // ── Vérification config ────────────────────────────────────────────────────
  if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return json(corsHeaders, 500, {
      success: false, error: 'Configuration incomplète',
      details: {
        RESEND_API_KEY: RESEND_API_KEY ? 'OK' : 'MANQUANT',
        SUPABASE_URL: SUPABASE_URL ? 'OK' : 'MANQUANT',
        SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_KEY ? 'OK' : 'MANQUANT',
      },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── (SEC-01) Authentification de l'appelant ───────────────────────────────
  const callerToken = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!callerToken) return json(corsHeaders, 401, { success: false, error: 'Authentification requise' });

  const { data: callerData, error: callerErr } = await supabase.auth.getUser(callerToken);
  const caller = callerData?.user;
  if (callerErr || !caller) return json(corsHeaders, 401, { success: false, error: 'Jeton invalide ou expiré' });

  // ── Body ──────────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(corsHeaders, 400, { success: false, error: 'Body JSON invalide' }); }

  const { prenom, nom, email, role, telephone, departement, htmlTemplate, forceRecovery } = body as {
    prenom?: string; nom?: string; email?: string; role?: string;
    telephone?: string; departement?: string;
    htmlTemplate?: string; forceRecovery?: boolean;
  };

  if (!email || !prenom || !nom) {
    return json(corsHeaders, 400, { success: false, error: 'Champs requis: email, prenom, nom' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(corsHeaders, 400, { success: false, error: 'Format email invalide' });
  }

  const redirectTo = `${SITE_URL.replace(/\/$/, '')}/premier-connexion`;

  // ── Génération du lien anti-prefetch ─────────────────────────────────────
  let magicLink: string | undefined;
  let userId: string | null = null;
  let linkType: 'invite' | 'recovery' = forceRecovery ? 'recovery' : 'invite';

  async function tryRecovery() {
    console.info('[create-user] generateLink recovery pour:', email);
    const { data, error } = await (supabase as any).auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    });
    if (error) return { ok: false as const, error };
    return {
      ok: true as const,
      link: buildSafeLink(redirectTo, data?.properties),
      userId: data?.user?.id ?? null,
    };
  }

  try {
    if (forceRecovery) {
      // Renvoi explicite — user existe déjà, on saute l'étape invite
      const r = await tryRecovery();
      if (!r.ok) {
        return json(corsHeaders, 200, {
          success: false, error: 'Génération du lien de renvoi échouée',
          supabaseError: { message: r.error.message, code: r.error.code, status: r.error.status },
          hint: identifyHint(r.error),
        });
      }
      magicLink = r.link;
      userId = r.userId;
      linkType = 'recovery';

    } else {
      const { data, error } = await (supabase as any).auth.admin.generateLink({
        type: 'invite',
        email,
        options: {
          data: {
            first_name: prenom,
            last_name: nom,
            role,
            invited_at: new Date().toISOString(),
            invited_by: 'atlas-fna',
          },
          redirectTo,
        },
      });

      if (error) {
        console.warn('[create-user] generateLink invite error:', JSON.stringify(error));
        const msg = (error.message ?? '').toLowerCase();
        const code = (error.code ?? '').toString();
        const status = error.status;
        const alreadyExists =
          msg.includes('already') || msg.includes('exists') || msg.includes('registered') ||
          code === 'email_exists' || code === 'user_already_exists' ||
          status === 422 || status === 409;

        if (alreadyExists) {
          const r = await tryRecovery();
          if (!r.ok) {
            return json(corsHeaders, 200, {
              success: false,
              error: "L'utilisateur existe déjà mais le lien de récupération a échoué",
              supabaseError: { message: r.error.message, code: r.error.code, status: r.error.status },
              hint: 'Demandez à l\'utilisateur de cliquer sur "Mot de passe oublié" sur la page de connexion.',
            });
          }
          magicLink = r.link;
          userId = r.userId;
          linkType = 'recovery';
        } else {
          return json(corsHeaders, 200, {
            success: false, error: "Génération du lien d'invitation échouée",
            supabaseError: { message: error.message, code: error.code, status: error.status },
            hint: identifyHint(error),
          });
        }
      } else {
        magicLink = buildSafeLink(redirectTo, data?.properties);
        userId = data?.user?.id ?? null;
      }
    }
  } catch (e: any) {
    return json(corsHeaders, 200, {
      success: false, error: 'Exception lors de la génération du lien',
      details: e?.message ?? String(e),
    });
  }

  if (!magicLink) {
    return json(corsHeaders, 200, {
      success: false,
      error: 'Pas de lien généré (hashed_token manquant dans la réponse Supabase)',
    });
  }

  // ── Créer/mettre à jour le profil ─────────────────────────────────────────
  if (userId) {
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', caller.id)
      .single();

    await supabase.from('profiles').upsert({
      id: userId,
      email,
      first_name: prenom,
      last_name: nom,
      company_id: callerProfile?.company_id ?? null,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  }

  // ── Email HTML ─────────────────────────────────────────────────────────────
  const callerDisplay = [
    caller.user_metadata?.first_name,
    caller.user_metadata?.last_name,
  ].filter(Boolean).join(' ') || caller.email || 'Votre administrateur';

  const roleLabelMap: Record<string, string> = {
    Administrateur: 'Administrateur',
    Manager: 'Manager',
    Comptable: 'Comptable',
    Lecteur: 'Lecteur',
  };
  const roleLabel = roleLabelMap[role ?? ''] || role || 'Collaborateur';

  // Si le client envoie un template HTML avec {{ACTION_LINK}}, on l'injecte.
  // Sinon on utilise notre template par défaut.
  let htmlBody: string;
  if (htmlTemplate && htmlTemplate.includes('{{ACTION_LINK}}')) {
    htmlBody = (htmlTemplate as string).replaceAll('{{ACTION_LINK}}', magicLink);
  } else {
    const isRecovery = linkType === 'recovery';
    htmlBody = buildDefaultHtml({
      prenom, email, roleLabel, departement: departement as string | undefined,
      magicLink, callerDisplay, siteUrl: SITE_URL, isRecovery,
    });
  }

  const subjectLine = linkType === 'recovery'
    ? `[Atlas Finance] Redéfinissez votre mot de passe`
    : `${callerDisplay} vous invite sur Atlas Finance & Accounting`;

  // ── Resend ────────────────────────────────────────────────────────────────
  let emailSent = false;
  let emailId: string | undefined;

  if (RESEND_API_KEY) {
    let resendStatus = 0;
    let resendData: any = {};
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: RESEND_FROM,
          to: [`${prenom} ${nom} <${email}>`],
          subject: subjectLine,
          html: htmlBody,
          reply_to: 'support@atlasstudio.org',
          tags: [
            { name: 'app', value: 'atlas-fna' },
            { name: 'link-type', value: linkType },
          ],
        }),
      });
      resendStatus = r.status;
      resendData = await r.json().catch(() => ({}));
    } catch (e: any) {
      return json(corsHeaders, 200, {
        success: false, error: 'Erreur réseau Resend', details: e?.message, magicLink,
      });
    }

    if (resendStatus < 200 || resendStatus >= 300) {
      return json(corsHeaders, 200, {
        success: false, error: "Resend a rejeté l'envoi de l'invitation",
        resendStatus, resendBody: resendData, magicLink,
      });
    }
    emailSent = true;
    emailId = resendData?.id;
  } else {
    // Dry-run : log seulement
    console.log(`[create-user] dry-run — lien (${linkType}):`, magicLink);
    emailSent = true; // ne pas bloquer la création
  }

  return json(corsHeaders, 201, {
    success: true, userId, emailSent, emailId,
    from: RESEND_FROM, to: email,
    linkType,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Construit un lien anti-prefetch :
 *   /premier-connexion?token_hash=xxx&type=invite
 *
 * Le scanner email ne peut pas consommer le token car la vérification
 * se fait client-side via supabase.auth.verifyOtp(token_hash, type) —
 * exécution JS requise. Les scanners ne peuvent pas exécuter le JS.
 */
function buildSafeLink(redirectTo: string, properties: any): string | undefined {
  const hashed = properties?.hashed_token;
  const type = properties?.verification_type ?? 'invite';
  if (!hashed) {
    // Fallback : action_link (vulnérable au prefetch mais au moins le user
    // pourra s'authentifier si le scanner est inactif)
    console.warn('[create-user] hashed_token absent — fallback sur action_link');
    return properties?.action_link;
  }
  return `${redirectTo}?token_hash=${encodeURIComponent(hashed)}&type=${encodeURIComponent(type)}`;
}

function identifyHint(error: any): string {
  const msg = (error.message ?? '').toLowerCase();
  const code = (error.code ?? '').toString();
  if (msg.includes('jwt') || msg.includes('token') || code === 'invalid_token') {
    return 'Clé SUPABASE_SERVICE_ROLE_KEY invalide ou expirée.';
  }
  if (msg.includes('email')) return `Email invalide ou rejeté : ${error.message}`;
  if (msg.includes('rate')) return 'Limite de débit atteinte — réessayez dans quelques minutes.';
  return `Voir détails Supabase ci-dessus. Code: ${code || 'N/A'}.`;
}

function json(corsHeaders: Record<string, string>, status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function buildDefaultHtml(opts: {
  prenom: string; email: string; roleLabel: string; departement?: string;
  magicLink: string; callerDisplay: string; siteUrl: string; isRecovery: boolean;
}): string {
  const { prenom, email, roleLabel, departement, magicLink, callerDisplay, siteUrl, isRecovery } = opts;
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isRecovery ? 'Redéfinissez votre mot de passe' : 'Votre invitation Atlas Finance & Accounting'}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <tr><td style="text-align:center;padding-bottom:28px;">
          <div style="display:inline-block;background:#1a1a1a;padding:14px 24px;border-radius:14px;">
            <span style="font-size:20px;color:#ffffff;font-weight:600;">Atlas Finance &amp; Accounting</span>
          </div>
        </td></tr>

        <tr><td style="background:#ffffff;border-radius:20px;padding:40px;box-shadow:0 2px 16px rgba(0,0,0,0.07);border:1px solid #e8e8e0;">

          <div style="text-align:center;margin-bottom:28px;">
            <div style="display:inline-block;background:#f0fdf4;border:2px solid #bbf7d0;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:28px;">
              ${isRecovery ? '🔑' : '📨'}
            </div>
          </div>

          <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#171717;text-align:center;">
            ${isRecovery ? `Redéfinissez votre mot de passe` : `Bienvenue, ${prenom} !`}
          </h1>
          <p style="margin:0 0 28px;font-size:15px;color:#737373;text-align:center;line-height:1.6;">
            ${isRecovery
              ? `<strong>${callerDisplay}</strong> vous renvoie un lien pour accéder à Atlas Finance &amp; Accounting.`
              : `<strong>${callerDisplay}</strong> vous invite à rejoindre Atlas Finance &amp; Accounting.`
            }
          </p>

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

          <div style="text-align:center;margin-bottom:20px;">
            <a href="${magicLink}"
               style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:14px;font-size:16px;font-weight:700;">
              ${isRecovery ? 'Redéfinir mon mot de passe →' : 'Activer mon compte →'}
            </a>
          </div>

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
}
