/**
 * treasuryForecastService — Prévision de trésorerie LFT (CDC V3 §3).
 *
 * Rolling forecast (Latest Thinking Forecast) : solde de départ réel (classe 5)
 * + flux à venir = postes ouverts (journal_lines non lettrés avec date_echeance)
 * + flux manuels (treasury_flows). Sortie : solde projeté mois par mois +
 * points de tension. Tenancy = societes (RLS).
 */
import type { DataAdapter } from '@atlas/data';

export interface ForecastFlow {
  id?: string;
  libelle: string;
  sens: 'encaissement' | 'decaissement';
  date_prevue: string;
  montant: number;
  source: 'poste_ouvert' | 'budget' | 'manuel';
}

export interface ForecastMonth {
  ym: string;            // 'YYYY-MM'
  label: string;
  encaissements: number;
  decaissements: number;
  fluxNet: number;
  soldeProjete: number;  // cumulé
  tension: boolean;      // solde projeté < 0
}

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}
function tenantOf(adapter: DataAdapter): string { return (adapter as any).tenantId as string; }

const MOIS_COURTS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

/** Solde de trésorerie actuel = Σ (débit − crédit) sur les comptes classe 5. */
export async function getCurrentCash(adapter: DataAdapter): Promise<number> {
  const client = getClient(adapter);
  if (!client) return 0;
  const { data } = await client
    .from('journal_lines')
    .select('debit,credit,account_code')
    .like('account_code', '5%');
  return (data ?? []).reduce((s: number, l: any) => s + (Number(l.debit) || 0) - (Number(l.credit) || 0), 0);
}

/** Postes ouverts datés → flux prévisionnels (clients 41 = encaissement, fournisseurs 40 = décaissement). */
export async function getOpenItemFlows(adapter: DataAdapter): Promise<ForecastFlow[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client
    .from('journal_lines')
    .select('debit,credit,account_code,third_party_name,date_echeance')
    .is('lettrage_code', null)
    .not('date_echeance', 'is', null)
    .or('account_code.like.40%,account_code.like.41%');
  const flows: ForecastFlow[] = [];
  for (const l of (data ?? [])) {
    const code = String(l.account_code || '');
    const isClient = code.startsWith('41');
    const solde = isClient ? (Number(l.debit) || 0) - (Number(l.credit) || 0)
                           : (Number(l.credit) || 0) - (Number(l.debit) || 0);
    if (solde <= 0) continue;
    flows.push({
      libelle: l.third_party_name || (isClient ? 'Créance client' : 'Dette fournisseur'),
      sens: isClient ? 'encaissement' : 'decaissement',
      date_prevue: String(l.date_echeance),
      montant: solde,
      source: 'poste_ouvert',
    });
  }
  return flows;
}

export async function getManualFlows(adapter: DataAdapter): Promise<ForecastFlow[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client
    .from('treasury_flows')
    .select('id,libelle,sens,date_prevue,montant,source')
    .order('date_prevue', { ascending: true });
  return (data ?? []).map((f: any) => ({ ...f, montant: Number(f.montant) || 0 }));
}

export async function addManualFlow(adapter: DataAdapter, flow: { libelle: string; sens: 'encaissement' | 'decaissement'; date_prevue: string; montant: number }): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('treasury_flows').insert({
    tenant_id: tenantOf(adapter), libelle: flow.libelle, sens: flow.sens,
    date_prevue: flow.date_prevue, montant: flow.montant, source: 'manuel',
  });
  if (error) throw new Error(error.message);
}

export async function deleteFlow(adapter: DataAdapter, id: string): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('treasury_flows').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export interface ForecastResult {
  currentCash: number;
  months: ForecastMonth[];
  flows: ForecastFlow[];
  tensionCount: number;
}

/** Construit la prévision glissante sur `horizon` mois à partir d'aujourd'hui (passé via nowIso). */
export async function buildForecast(adapter: DataAdapter, nowIso: string, horizon = 12): Promise<ForecastResult> {
  const [currentCash, openFlows, manualFlows] = await Promise.all([
    getCurrentCash(adapter), getOpenItemFlows(adapter), getManualFlows(adapter),
  ]);
  const flows = [...openFlows, ...manualFlows];
  const now = new Date(nowIso);
  const startY = now.getFullYear(), startM = now.getMonth();

  // Bucket par YYYY-MM sur l'horizon
  const buckets = new Map<string, { enc: number; dec: number }>();
  const order: string[] = [];
  for (let i = 0; i < horizon; i++) {
    const d = new Date(startY, startM + i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.set(ym, { enc: 0, dec: 0 });
    order.push(ym);
  }
  // Les flux passés/échus sont rattachés au 1er mois (à régulariser).
  const firstYm = order[0];
  for (const f of flows) {
    const d = new Date(f.date_prevue);
    let ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!buckets.has(ym)) ym = (d < now) ? firstYm : '';
    if (!ym || !buckets.has(ym)) continue;
    const b = buckets.get(ym)!;
    if (f.sens === 'encaissement') b.enc += f.montant; else b.dec += f.montant;
  }

  let cumul = currentCash;
  let tensionCount = 0;
  const months: ForecastMonth[] = order.map(ym => {
    const b = buckets.get(ym)!;
    const fluxNet = b.enc - b.dec;
    cumul += fluxNet;
    const tension = cumul < 0;
    if (tension) tensionCount++;
    const mi = parseInt(ym.slice(5, 7), 10) - 1;
    return { ym, label: MOIS_COURTS[mi], encaissements: b.enc, decaissements: b.dec, fluxNet, soldeProjete: cumul, tension };
  });

  return { currentCash, months, flows, tensionCount };
}
