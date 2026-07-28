/**
 * Edge Function : send-executive-report — « Vue Dirigeant ».
 *
 * Génère la synthèse exécutive (HTML) d'une société à partir du grand livre et
 * l'envoie par email via Resend. Deux modes :
 *
 *  • mode « test » (défaut) — authentifié par JWT utilisateur.
 *      Body : { mode?: 'test', recipients?: string[] }
 *      Envoie immédiatement le rapport de la société du caller aux destinataires
 *      fournis (sinon ceux enregistrés dans la planification). Bouton
 *      « Envoyer maintenant » de l'UI.
 *
 *  • mode « cron » — protégé par l'en-tête x-cron-secret, vérifié contre le
 *      Vault (RPC exec_report_verify_cron_secret), avec repli sur CRON_SECRET.
 *      Body : { mode: 'cron' }
 *      Balaye toutes les planifications actives dont next_run_at <= now,
 *      envoie chaque rapport, met à jour last_sent_at et next_run_at.
 *      À appeler périodiquement (p.ex. toutes les heures) par un planificateur
 *      externe / Supabase Scheduled Functions.
 *
 * Secrets : SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
 *           RESEND_API_KEY, SITE_URL, CRON_SECRET, MAIL_FROM (optionnel).
 *
 * Deploy: supabase functions deploy send-executive-report
 */
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import {
  buildReportHtml,
  computeNextRun,
  computeReportData,
  type Frequency,
  type ReportContext,
  type ReportEntry,
} from '../_shared/executiveReport.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const SITE_URL = Deno.env.get('SITE_URL') || 'https://www.atlasstudio.org';
const MAIL_FROM = Deno.env.get('MAIL_FROM') || 'Atlas FnA <noreply@atlasstudio.org>';

/** Période couverte par la synthèse (miroir du type client). */
type Periode = 'exercice' | 'mois' | 'trimestre' | 'cumul';

interface ScheduleRow {
  id: string;
  tenant_id: string;
  enabled: boolean;
  frequency: Frequency;
  periode: Periode;
  send_hour: number;
  weekday: number;
  month_day: number;
  recipients: string[];
}

/**
 * Résout la plage de dates (from/to, inclus) + le libellé d'une période, bornée
 * à l'exercice actif. 'exercice' = FY complet, 'mois'/'trimestre' = période
 * courante, 'cumul' = début d'exercice → aujourd'hui.
 */
function resolvePeriod(
  periode: Periode,
  fyStart: string,
  fyEnd: string,
  now: Date,
): { from: string; to: string; label: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const start = String(fyStart).slice(0, 10);
  const end = String(fyEnd).slice(0, 10);
  const clamp = (d: string) => (d < start ? start : d > end ? end : d);
  const y = now.getUTCFullYear();
  const monthName = (d: Date) =>
    d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
      .replace(/^\w/, (c) => c.toUpperCase());

  if (periode === 'mois') {
    const m = now.getUTCMonth();
    const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return { from: clamp(`${y}-${pad(m + 1)}-01`), to: clamp(`${y}-${pad(m + 1)}-${pad(last)}`), label: monthName(now) };
  }
  if (periode === 'trimestre') {
    const q = Math.floor(now.getUTCMonth() / 3);
    const startM = q * 3, endM = startM + 2;
    const last = new Date(Date.UTC(y, endM + 1, 0)).getUTCDate();
    return { from: clamp(`${y}-${pad(startM + 1)}-01`), to: clamp(`${y}-${pad(endM + 1)}-${pad(last)}`), label: `T${q + 1} ${y}` };
  }
  if (periode === 'cumul') {
    const today = now.toISOString().slice(0, 10);
    return { from: start, to: clamp(today), label: `Cumul au ${now.toLocaleDateString('fr-FR', { timeZone: 'UTC' })}` };
  }
  const sY = start.slice(0, 4), eY = end.slice(0, 4);
  return { from: start, to: end, label: `Exercice ${sY === eY ? sY : `${sY}–${eY}`}` };
}

/** Charge le contexte (société + exercice actif) puis les écritures de l'exercice. */
async function loadReportInputs(
  svc: SupabaseClient,
  tenantId: string,
  frequency: Frequency,
  periode: Periode,
): Promise<{ ctx: ReportContext; entries: ReportEntry[] } | null> {
  const { data: societe } = await svc
    .from('societes')
    .select('nom')
    .eq('id', tenantId)
    .maybeSingle();

  const { data: fys } = await svc
    .from('fiscal_years')
    .select('start_date, end_date, is_active')
    .eq('tenant_id', tenantId);
  const activeFY = (fys || []).find((f: Record<string, unknown>) => f.is_active) || (fys || [])[0];

  const now = new Date();
  const start = (activeFY?.start_date as string) || `${now.getUTCFullYear()}-01-01`;
  const end = (activeFY?.end_date as string) || `${now.getUTCFullYear()}-12-31`;
  const fyYear = parseInt(String(start).slice(0, 4), 10) || now.getUTCFullYear();
  const startY = String(start).slice(0, 4);
  const endY = String(end).slice(0, 4);
  const exerciceLabel = startY === endY ? startY : `${startY}–${endY}`;

  // Plage de dates dérivée de la période choisie (bornée à l'exercice).
  const range = resolvePeriod(periode, start, end, now);

  // Écritures non-brouillon de la période + leurs lignes (une requête, filtrée serveur).
  const { data: entryRows, error: entryErr } = await svc
    .from('journal_entries')
    .select('id, date, status, journal_lines(account_code, debit, credit, third_party_code, third_party_name)')
    .eq('tenant_id', tenantId)
    .neq('status', 'draft')
    .gte('date', range.from)
    .lte('date', range.to);
  if (entryErr) {
    console.error('[send-executive-report] entry query error:', entryErr);
    return null;
  }

  const entries: ReportEntry[] = (entryRows || []).map((e: Record<string, unknown>) => ({
    date: String(e.date || ''),
    status: String(e.status || 'posted'),
    lines: ((e.journal_lines as Record<string, unknown>[]) || []).map((l) => ({
      account_code: String(l.account_code || ''),
      debit: Number(l.debit) || 0,
      credit: Number(l.credit) || 0,
      third_party_code: (l.third_party_code as string) ?? null,
      third_party_name: (l.third_party_name as string) ?? null,
    })),
  }));

  const ctx: ReportContext = {
    companyName: (societe?.nom as string) || 'Votre société',
    fyYear,
    exerciceLabel,
    frequency,
    periodLabel: range.label,
    appUrl: `${SITE_URL}/executive/digest`,
  };
  return { ctx, entries };
}

/** Envoie un email HTML via Resend. Retourne { ok, id?, error? }. */
async function sendEmail(recipients: string[], subject: string, html: string): Promise<{ ok: boolean; id?: string; error?: unknown }> {
  const to = (recipients || []).filter((r) => /\S+@\S+\.\S+/.test(String(r)));
  if (to.length === 0) return { ok: false, error: 'NO_VALID_RECIPIENTS' };
  if (!RESEND_API_KEY) {
    console.log(`[send-executive-report] DRY-RUN — to=${to.join(',')} subject="${subject}"`);
    return { ok: true, id: 'dry-run' };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: MAIL_FROM, to, subject, html }),
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('[send-executive-report] Resend error:', result);
    return { ok: false, error: result };
  }
  return { ok: true, id: result.id };
}

function subjectFor(ctx: ReportContext): string {
  const freq = ctx.frequency === 'weekly' ? 'hebdomadaire' : 'mensuelle';
  return `Synthèse ${freq} — ${ctx.companyName} · ${ctx.periodLabel}`;
}

/** Génère + envoie le rapport d'une société. */
async function sendReport(
  svc: SupabaseClient,
  tenantId: string,
  frequency: Frequency,
  recipients: string[],
  periode: Periode,
): Promise<{ ok: boolean; id?: string; error?: unknown }> {
  const inputs = await loadReportInputs(svc, tenantId, frequency, periode);
  if (!inputs) return { ok: false, error: 'LOAD_FAILED' };
  const data = computeReportData(inputs.entries, inputs.ctx);
  const html = buildReportHtml(data);
  return sendEmail(recipients, subjectFor(inputs.ctx), html);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  const svc = createClient(SUPABASE_URL, SERVICE_KEY);
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const mode = (body?.mode as string) || 'test';

  // ─── Mode cron : balayage des planifications dues ───
  if (mode === 'cron') {
    // Auth du cron : le secret est vérifié contre le Vault (source unique de
    // vérité, via RPC SECURITY DEFINER exec_report_verify_cron_secret), avec
    // repli sur la variable d'environnement CRON_SECRET si elle est définie.
    const secret = req.headers.get('x-cron-secret') || '';
    const envSecret = Deno.env.get('CRON_SECRET') || '';
    let authorized = envSecret !== '' && secret === envSecret;
    if (!authorized && secret !== '') {
      const { data: vaultOk } = await svc.rpc('exec_report_verify_cron_secret', { p_secret: secret });
      authorized = vaultOk === true;
    }
    if (!authorized) return json({ error: 'FORBIDDEN' }, 403);

    const nowIso = new Date().toISOString();
    const { data: due, error } = await svc
      .from('executive_report_schedules')
      .select('*')
      .eq('enabled', true)
      .lte('next_run_at', nowIso);
    if (error) return json({ error: 'QUERY_FAILED', detail: error.message }, 500);

    const results: Array<{ tenant: string; ok: boolean; error?: unknown }> = [];
    for (const s of (due || []) as ScheduleRow[]) {
      try {
        const r = await sendReport(svc, s.tenant_id, s.frequency, s.recipients || [], s.periode || 'exercice');
        const next = computeNextRun(s.frequency, { sendHour: s.send_hour, weekday: s.weekday, monthDay: s.month_day });
        await svc
          .from('executive_report_schedules')
          .update({ last_sent_at: r.ok ? nowIso : null, next_run_at: next })
          .eq('id', s.id);
        results.push({ tenant: s.tenant_id, ok: r.ok, error: r.error });
      } catch (e) {
        console.error('[send-executive-report] cron item failed:', e);
        results.push({ tenant: s.tenant_id, ok: false, error: String(e) });
      }
    }
    return json({ success: true, processed: results.length, results });
  }

  // ─── Mode test : envoi immédiat pour la société du caller (JWT) ───
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return json({ error: 'UNAUTHENTICATED' }, 401);
  const { data: tenant } = await userClient.rpc('get_user_company_id');
  if (!tenant) return json({ error: 'NO_TENANT' }, 403);

  // Destinataires / cadence / période : corps de requête, sinon planification enregistrée.
  let recipients: string[] = Array.isArray(body?.recipients) ? (body.recipients as string[]) : [];
  let frequency: Frequency = (body?.frequency as Frequency) === 'weekly' ? 'weekly' : 'monthly';
  let periode: Periode = (body?.periode as Periode) || 'exercice';
  {
    const { data: sched } = await userClient
      .from('executive_report_schedules')
      .select('recipients, frequency, periode')
      .eq('tenant_id', tenant)
      .maybeSingle();
    if (recipients.length === 0) recipients = (sched?.recipients as string[]) || [];
    if (!body?.frequency && sched?.frequency) frequency = sched.frequency as Frequency;
    if (!body?.periode && sched?.periode) periode = sched.periode as Periode;
  }
  if (recipients.length === 0) return json({ error: 'NO_RECIPIENTS' }, 400);

  const r = await sendReport(svc, tenant as string, frequency, recipients, periode);
  if (!r.ok) return json({ error: 'SEND_FAILED', detail: r.error }, 500);
  return json({ success: true, id: r.id, recipients });
});
