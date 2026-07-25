/**
 * executiveReportService — planification de la « Vue Dirigeant ».
 *
 * Gère la lecture/écriture de la planification d'envoi du tableau de bord
 * exécutif par email (table `executive_report_schedules`, scoping tenant via
 * RLS get_user_company_id) et le déclenchement d'un envoi immédiat via l'Edge
 * Function `send-executive-report` (mode test).
 *
 * Disponible en mode SaaS (Supabase) uniquement.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// La table `executive_report_schedules` et le RPC ne sont pas (encore) dans les
// types générés : on opère via un client au schéma non typé pour ces accès.
const db = supabase as unknown as SupabaseClient;

export type ReportFrequency = 'weekly' | 'monthly';
/** Période couverte par la synthèse envoyée. */
export type ReportPeriode = 'exercice' | 'mois' | 'trimestre' | 'cumul';

export interface ExecutiveReportSchedule {
  id?: string;
  tenant_id?: string;
  enabled: boolean;
  frequency: ReportFrequency;
  periode: ReportPeriode;  // période couverte par l'email (défaut: exercice)
  send_hour: number;   // 0-23 (UTC)
  weekday: number;     // 0 (dim) … 6 (sam) — utilisé si frequency === 'weekly'
  month_day: number;   // 1-28 — utilisé si frequency === 'monthly'
  recipients: string[];
  last_sent_at?: string | null;
  next_run_at?: string | null;
}

export const DEFAULT_SCHEDULE: ExecutiveReportSchedule = {
  enabled: false,
  frequency: 'monthly',
  periode: 'exercice',
  send_hour: 7,
  weekday: 1,
  month_day: 1,
  recipients: [],
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isValidEmail = (e: string): boolean => EMAIL_RE.test(String(e).trim());

/**
 * Prochaine échéance d'envoi (UTC, ISO) — miroir de computeNextRun côté Edge
 * Function, pour pré-remplir next_run_at à l'enregistrement.
 */
export function computeNextRun(s: ExecutiveReportSchedule, from: Date = new Date()): string {
  if (s.frequency === 'weekly') {
    const next = new Date(from);
    next.setUTCHours(s.send_hour, 0, 0, 0);
    let guard = 0;
    while ((next.getUTCDay() !== s.weekday || next.getTime() <= from.getTime()) && guard < 14) {
      next.setUTCDate(next.getUTCDate() + 1);
      next.setUTCHours(s.send_hour, 0, 0, 0);
      guard++;
    }
    return next.toISOString();
  }
  const day = Math.min(28, Math.max(1, s.month_day));
  let year = from.getUTCFullYear();
  let month = from.getUTCMonth();
  let next = new Date(Date.UTC(year, month, day, s.send_hour, 0, 0, 0));
  if (next.getTime() <= from.getTime()) {
    month += 1;
    if (month > 11) { month = 0; year += 1; }
    next = new Date(Date.UTC(year, month, day, s.send_hour, 0, 0, 0));
  }
  return next.toISOString();
}

function assertSaaS(): void {
  if (!supabase?.functions) {
    throw new Error('La programmation de la Vue Dirigeant est disponible en mode SaaS uniquement.');
  }
}

async function getTenantId(): Promise<string | null> {
  const { data, error } = await db.rpc('get_user_company_id');
  if (error || !data) return null;
  return data as unknown as string;
}

/** Charge la planification du tenant courant (ou les valeurs par défaut). */
export async function loadSchedule(): Promise<ExecutiveReportSchedule> {
  const { data, error } = await db
    .from('executive_report_schedules')
    .select('*')
    .maybeSingle();
  if (error || !data) return { ...DEFAULT_SCHEDULE };
  return {
    id: data.id,
    tenant_id: data.tenant_id,
    enabled: !!data.enabled,
    frequency: (data.frequency as ReportFrequency) || 'monthly',
    periode: (data.periode as ReportPeriode) || 'exercice',
    send_hour: data.send_hour ?? 7,
    weekday: data.weekday ?? 1,
    month_day: data.month_day ?? 1,
    recipients: (data.recipients as string[]) || [],
    last_sent_at: data.last_sent_at,
    next_run_at: data.next_run_at,
  };
}

/** Enregistre (upsert) la planification pour le tenant courant. */
export async function saveSchedule(s: ExecutiveReportSchedule): Promise<ExecutiveReportSchedule> {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Société introuvable pour cet utilisateur.');

  const recipients = (s.recipients || []).map((r) => r.trim()).filter(isValidEmail);
  const next_run_at = s.enabled ? computeNextRun({ ...s, recipients }) : null;

  const payload = {
    tenant_id: tenantId,
    enabled: s.enabled,
    frequency: s.frequency,
    periode: s.periode || 'exercice',
    send_hour: s.send_hour,
    weekday: s.weekday,
    month_day: s.month_day,
    recipients,
    next_run_at,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await db
    .from('executive_report_schedules')
    .upsert(payload, { onConflict: 'tenant_id' })
    .select()
    .single();
  if (error) throw new Error(error.message);

  return {
    id: data.id,
    tenant_id: data.tenant_id,
    enabled: !!data.enabled,
    frequency: data.frequency as ReportFrequency,
    periode: (data.periode as ReportPeriode) || 'exercice',
    send_hour: data.send_hour,
    weekday: data.weekday,
    month_day: data.month_day,
    recipients: (data.recipients as string[]) || [],
    last_sent_at: data.last_sent_at,
    next_run_at: data.next_run_at,
  };
}

/**
 * Envoie immédiatement le rapport (mode test) aux destinataires fournis
 * (sinon ceux de la planification enregistrée).
 */
export async function sendTestReport(
  recipients: string[],
  frequency: ReportFrequency,
): Promise<{ success: boolean; id?: string }> {
  assertSaaS();
  const clean = (recipients || []).map((r) => r.trim()).filter(isValidEmail);
  const { data, error } = await supabase.functions.invoke('send-executive-report', {
    body: { mode: 'test', recipients: clean, frequency },
  });
  if (error) throw new Error(error.message || 'Échec de l\'envoi du rapport.');
  return { success: !!(data as { success?: boolean })?.success, id: (data as { id?: string })?.id };
}
