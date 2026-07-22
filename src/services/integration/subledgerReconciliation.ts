/**
 * Réconciliation auxiliaire ↔ général (L5).
 *
 * Réf. docs/integration-suite-atlas/DESIGN.md § L5
 *
 * L'écran qui rend la Suite Atlas AUDITABLE : le solde du compte collectif au
 * Grand Livre doit égaler, au centime, l'auxiliaire tenu par le satellite.
 *
 *   411 Clients      ↔ Atlas Trade   (créances ouvertes)
 *   401 Fournisseurs ↔ Atlas Procure (dettes ouvertes)
 *   422 Personnel    ↔ Atlas People  (net à payer)
 *   3xx Stocks       ↔ module Stock  (valorisation)
 *
 * Source GL = glHelpers (SOURCE UNIQUE — jamais de recalcul maison), écritures
 * validées uniquement, brouillons exclus.
 */

import type { DataAdapter } from '@atlas/data';
import { loadGLEntries, makeGLHelpers, type GLEntry } from '../../features/financial/glHelpers';
import { money } from '../../utils/money';
import type { IntegrationEvent, SatelliteSystem } from './types';
import { SATELLITE_LABELS } from './types';

export interface CollectiveDefinition {
  key: string;
  label: string;
  prefixes: string[];
  /** Satellite censé tenir l'auxiliaire de ce compte collectif. */
  owner: SatelliteSystem | 'stock';
  /** Sens attendu du solde (debit = actif, credit = passif). */
  nature: 'debit' | 'credit';
}

export const COLLECTIVES: CollectiveDefinition[] = [
  { key: '411', label: 'Clients', prefixes: ['411'], owner: 'atlas_trade', nature: 'debit' },
  { key: '401', label: 'Fournisseurs', prefixes: ['401'], owner: 'atlas_procure', nature: 'credit' },
  { key: '422', label: 'Personnel — rémunérations dues', prefixes: ['422'], owner: 'atlas_people', nature: 'credit' },
  { key: '3xx', label: 'Stocks', prefixes: ['3'], owner: 'stock', nature: 'debit' },
];

export interface ReconciliationRow {
  key: string;
  label: string;
  ownerLabel: string;
  /** Solde du compte collectif au Grand Livre (signé selon la nature). */
  glBalance: number;
  /** Solde de l'auxiliaire déclaré par le satellite (null si non alimenté). */
  subledgerBalance: number | null;
  /** glBalance − subledgerBalance. Doit valoir 0. */
  gap: number | null;
  /** Écritures du GL sur ce collectif provenant du satellite propriétaire. */
  entriesFromOwner: number;
  /** Écritures du GL sur ce collectif d'une AUTRE origine (saisie manuelle…). */
  entriesFromOther: number;
  /** Événements du satellite non encore comptabilisés (cause n°1 d'écart). */
  pendingEvents: number;
  /** Événements rejetés — chaque rejet est un trou dans l'auxiliaire. */
  rejectedEvents: number;
  status: 'ok' | 'gap' | 'not_connected';
}

export interface ReconciliationReport {
  rows: ReconciliationRow[];
  /** Vrai si TOUS les collectifs connectés sont à l'équilibre. */
  balanced: boolean;
  generatedAt: string;
}

/**
 * Soldes auxiliaires déclarés par les satellites.
 *
 * Tant qu'un satellite n'expose pas son auxiliaire, la valeur reste `null` et
 * la ligne est marquée « non connecté » — JAMAIS 0, qui laisserait croire à un
 * équilibre parfait alors que rien n'est branché.
 */
export type SubledgerBalances = Partial<Record<SatelliteSystem | 'stock', number | null>>;

export async function buildReconciliationReport(
  adapter: DataAdapter,
  subledger: SubledgerBalances = {},
): Promise<ReconciliationReport> {
  const entries = await loadGLEntries(adapter as any);
  const validated = entries.filter(e => (e as any).status !== 'draft');
  const h = makeGLHelpers(validated);

  let events: IntegrationEvent[] = [];
  try {
    events = await adapter.getAll<IntegrationEvent>('integrationEvents');
  } catch {
    // Socle d'intégration non déployé (mode local) : les compteurs restent à 0.
    events = [];
  }

  const rows: ReconciliationRow[] = COLLECTIVES.map(c => {
    const raw = h.net(...c.prefixes);
    const glBalance = c.nature === 'credit' ? -raw : raw;

    const { fromOwner, fromOther } = countEntriesByOrigin(validated, c.prefixes, c.owner);

    const sub = subledger[c.owner];
    const subledgerBalance = sub === undefined ? null : sub;
    const gap =
      subledgerBalance === null
        ? null
        : money(glBalance).subtract(subledgerBalance).round(2).toNumber();

    const ownerEvents = events.filter(e => e.sourceSystem === c.owner);

    return {
      key: c.key,
      label: c.label,
      ownerLabel: c.owner === 'stock' ? 'Module Stock' : SATELLITE_LABELS[c.owner],
      glBalance: money(glBalance).round(2).toNumber(),
      subledgerBalance,
      gap,
      entriesFromOwner: fromOwner,
      entriesFromOther: fromOther,
      pendingEvents: ownerEvents.filter(e => e.status === 'pending' || e.status === 'deferred').length,
      rejectedEvents: ownerEvents.filter(e => e.status === 'rejected').length,
      status: subledgerBalance === null ? 'not_connected' : gap === 0 ? 'ok' : 'gap',
    };
  });

  return {
    rows,
    balanced: rows.filter(r => r.status !== 'not_connected').every(r => r.gap === 0),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Ventile les écritures d'un collectif par origine.
 *
 * Une écriture 411 saisie à la main alors qu'Atlas Trade est branché est un
 * signal fort : soit un contournement du cycle de vente, soit une régularisation
 * à documenter. Dans les deux cas, le comptable doit la voir.
 */
function countEntriesByOrigin(
  entries: GLEntry[],
  prefixes: string[],
  owner: string,
): { fromOwner: number; fromOther: number } {
  let fromOwner = 0;
  let fromOther = 0;
  for (const e of entries) {
    const touches = (e.lines ?? []).some(l =>
      prefixes.some(p => (l.accountCode || '').startsWith(p)),
    );
    if (!touches) continue;
    const src = (e as any).sourceSystem ?? 'manual';
    if (src === owner) fromOwner++;
    else fromOther++;
  }
  return { fromOwner, fromOther };
}

/**
 * Détail des écritures d'un collectif qui NE viennent PAS du satellite
 * propriétaire — la liste sur laquelle le comptable enquête quand un écart
 * apparaît.
 */
export async function getUnexpectedOriginEntries(
  adapter: DataAdapter,
  collectiveKey: string,
): Promise<Array<{ id: string; date: string; label: string; source: string; amount: number }>> {
  const def = COLLECTIVES.find(c => c.key === collectiveKey);
  if (!def) return [];

  const entries = await loadGLEntries(adapter as any);
  const out: Array<{ id: string; date: string; label: string; source: string; amount: number }> = [];

  for (const e of entries) {
    const lines = (e.lines ?? []).filter(l =>
      def.prefixes.some(p => (l.accountCode || '').startsWith(p)),
    );
    if (lines.length === 0) continue;
    const src = (e as any).sourceSystem ?? 'manual';
    if (src === def.owner) continue;

    const amount = lines.reduce((s, l) => s + (l.debit || 0) - (l.credit || 0), 0);
    out.push({
      id: (e as any).id ?? '',
      date: e.date ?? '',
      label: (e as any).label ?? '',
      source: src,
      amount: money(amount).round(2).toNumber(),
    });
  }

  return out.sort((a, b) => b.date.localeCompare(a.date));
}
