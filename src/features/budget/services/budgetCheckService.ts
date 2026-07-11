import type { DataAdapter } from '@atlas/data';

/**
 * Budget Check (refonte OPEX/CAPEX — Lot 2, §4.2 CDC).
 * Contrôle de disponible d'une maille avant engagement, à partir de la vue
 * d'équation `v_budget_execution` (budget − engagé − réalisé). Journalise chaque
 * contrôle dans `budget_checks` (preuve d'audit + override_token de dérogation).
 *
 * PROPH3T advisory only : aucun calcul monétaire par LLM ici — tout est déterministe.
 */

export type BudgetControlPolicy = 'bloquant' | 'avertissement' | 'passif';
export type CheckDecision = 'ok' | 'warning' | 'blocked';
export type MailleNature = 'opex' | 'capex' | 'revenus';

export interface MailleDisponible {
  budget: number;
  engage: number;
  realise: number;
  disponible: number;
}

export interface CheckResult {
  decision: CheckDecision;
  disponible: number;
  apresEngagement: number;
  seuilDeclencheur: 'consommation_90' | 'depassement' | null;
  nature: MailleNature;
  policy: BudgetControlPolicy;
}

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}
async function tenantOf(client: any): Promise<string | null> {
  const { data } = await client.rpc('get_user_company_id');
  return (data as string) ?? null;
}

/** Nature de la maille d'après le préfixe de compte SYSCOHADA. */
export function natureOfAccount(accountCode: string): MailleNature {
  const c = (accountCode || '').trim();
  if (c.startsWith('7')) return 'revenus';
  if (c.startsWith('2')) return 'capex';           // classe 2 (immobilisations) + 23 encours
  return 'opex';                                    // classe 6 (charges)
}

/** Politique de contrôle par nature (settings), défaut 'avertissement'. */
export async function getControlPolicy(adapter: DataAdapter, nature: MailleNature): Promise<BudgetControlPolicy> {
  const client = getClient(adapter);
  if (!client) return 'avertissement';
  const key = `budget_control_policy_${nature}`;
  const { data } = await client.from('settings').select('value').eq('key', key).limit(1);
  const v = data?.[0]?.value as string | undefined;
  if (v === 'bloquant' || v === 'avertissement' || v === 'passif') return v;
  // défaut : CAPEX bloquant recommandé (§4.2), sinon avertissement.
  return nature === 'capex' ? 'bloquant' : 'avertissement';
}

/**
 * Disponible d'une maille account_code × section × (période ou année entière).
 * Agrège les lignes de v_budget_execution ; period optionnel (sinon toute l'année).
 */
export async function getMailleDisponible(
  adapter: DataAdapter,
  input: { accountCode: string; sectionId?: string | null; annee: string; period?: number },
): Promise<MailleDisponible> {
  const client = getClient(adapter);
  const empty = { budget: 0, engage: 0, realise: 0, disponible: 0 };
  if (!client) return empty;
  let q = client
    .from('v_budget_execution')
    .select('budget,engage,realise,disponible')
    .eq('account_code', input.accountCode)
    .eq('annee', input.annee);
  if (input.sectionId) q = q.eq('section_id', input.sectionId);
  if (input.period) q = q.eq('period', input.period);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []).reduce((acc: MailleDisponible, r: any) => ({
    budget: acc.budget + (Number(r.budget) || 0),
    engage: acc.engage + (Number(r.engage) || 0),
    realise: acc.realise + (Number(r.realise) || 0),
    disponible: acc.disponible + (Number(r.disponible) || 0),
  }), { ...empty });
}

/** Décision pure (testable) à partir des chiffres de la maille et de la politique. */
export function decideCheck(
  m: MailleDisponible, montant: number, policy: BudgetControlPolicy,
): { decision: CheckDecision; apresEngagement: number; seuil: CheckResult['seuilDeclencheur'] } {
  const apresEngagement = Math.round((m.disponible - montant) * 100) / 100;
  if (apresEngagement < 0) {
    if (policy === 'bloquant') return { decision: 'blocked', apresEngagement, seuil: 'depassement' };
    if (policy === 'avertissement') return { decision: 'warning', apresEngagement, seuil: 'depassement' };
    return { decision: 'ok', apresEngagement, seuil: 'depassement' }; // passif : tracé mais non bloquant
  }
  // seuil de consommation 90 % du budget de la maille
  if (m.budget > 0 && apresEngagement < 0.1 * m.budget) {
    return { decision: 'warning', apresEngagement, seuil: 'consommation_90' };
  }
  return { decision: 'ok', apresEngagement, seuil: null };
}

/**
 * Contrôle complet + journalisation. Renvoie la décision ; enregistre la ligne
 * dans budget_checks (audit). Le montant est celui de l'engagement envisagé.
 */
export async function checkBudget(
  adapter: DataAdapter,
  input: {
    accountCode: string; sectionId?: string | null; capexProjetId?: string | null;
    annee: string; period?: number; periodeDate: string; montant: number; reference?: string;
  },
): Promise<CheckResult> {
  const client = getClient(adapter);
  const nature = natureOfAccount(input.accountCode);
  const policy = await getControlPolicy(adapter, nature);
  const m = await getMailleDisponible(adapter, input);
  const { decision, apresEngagement, seuil } = decideCheck(m, input.montant, policy);

  if (client) {
    const tenant = await tenantOf(client);
    if (tenant) {
      await client.from('budget_checks').insert({
        tenant_id: tenant, account_code: input.accountCode, section_id: input.sectionId ?? null,
        capex_section_projet_id: input.capexProjetId ?? null, periode: input.periodeDate,
        montant: Math.round((input.montant || 0) * 100) / 100, decision, disponible: m.disponible,
        seuil_declencheur: seuil, reference: input.reference ?? null,
      });
    }
  }
  return { decision, disponible: m.disponible, apresEngagement, seuilDeclencheur: seuil, nature, policy };
}
