/**
 * Rentabilité par client — CA réalisé et cascade de marges.
 *
 * ARCHITECTURE SYSCOHADA : le client d'une vente n'est PAS porté par la ligne de
 * produit (70x) mais par la ligne de créance (411) de la MÊME écriture. On
 * attribue donc le CA net d'une écriture au tiers lu sur sa ligne 41x. Cela
 * évite de polluer les comptes de produits avec un code tiers, et profite
 * directement du rattachement des lignes 411 (voir [[orphanLines]]).
 *
 * CASCADE DE MARGES (choix méthode « 1+2+3 ») :
 *   - Marge 1 — brute directe : CA − coût direct des ventes porté par le MÊME
 *     code analytique que le client (chantier/projet dédié). Nul tant qu'aucune
 *     charge n'est rattachée analytiquement au client.
 *   - Marge 2 — après coûts directs affectés : idem + autres charges directes
 *     imputées via l'analytique.
 *   - Marge 3 — nette (coût complet) : Marge 2 − quote-part de structure
 *     déversée par clé. Conventionnelle → calculée hors de ce service.
 *
 * Les provisions/régularisations (OD, extournes PCA/CCA) n'ont pas de client :
 * leur CA tombe dans le seau « non affecté », ce qui est correct.
 *
 * Périmètre : écritures NON brouillon.
 */
import type { DataAdapter } from '@atlas/data';
import { largestRemainderAllocate } from '../../utils/allocation';

export interface ClientRevenue {
  code: string;                 // code tiers (411…) ; '' = non affecté
  name: string;
  ca: number;                   // CA net réalisé (crédit − débit sur 70x)
  nbEcritures: number;
  /** Coût direct rattaché analytiquement au client (0 si aucune section liée). */
  coutDirect: number;
  margeBrute: number;           // ca − coutDirect
  margeBrutePct: number;        // marge/ca en % (0 si ca nul)
}

export interface ClientRevenueReport {
  clients: ClientRevenue[];
  caTotal: number;
  caAffecte: number;
  caNonAffecte: number;
  pctAffecte: number;           // part du CA rattachée à un client (0-100)
  /** Nb d'écritures de vente sans client identifiable (à rattacher). */
  ecrituresSansClient: number;
  /** Total des charges de classe 6 de la période (base du cost-to-serve). */
  totalCharges6: number;
}

/** Fenêtre de lecture (vision cumulée). from/to au format ISO 'YYYY-MM-DD'. */
export interface DateRange { from?: string; to?: string }

export interface EntryRow {
  id: string;
  status?: string;
  date?: string | null;
  lines?: Array<{ accountCode?: string; debit?: number; credit?: number; thirdPartyCode?: string | null; thirdPartyName?: string | null; analyticalCode?: string | null }>;
}

const PAGE = 1000;

/**
 * Charge toutes les écritures avec leurs lignes, quel que soit le mode.
 * En SaaS on lit journal_lines paginé (les lignes vivent dans la table séparée) ;
 * en local, getAll réinjecte déjà les lignes.
 */
export async function loadEntriesWithLines(adapter: DataAdapter, range?: DateRange): Promise<EntryRow[]> {
  const client = (adapter as any).client;
  if (adapter.getMode?.() === 'saas' && client) {
    const byEntry = new Map<string, EntryRow>();
    for (let from = 0; ; from += PAGE) {
      let q = client
        .from('journal_lines')
        .select('entry_id,account_code,debit,credit,third_party_code,third_party_name,analytical_code,journal_entries!inner(status,date)')
        .neq('journal_entries.status', 'draft');
      if (range?.from) q = q.gte('journal_entries.date', range.from);
      if (range?.to) q = q.lte('journal_entries.date', range.to);
      const { data, error } = await q.order('id', { ascending: true }).range(from, from + PAGE - 1);
      if (error) throw new Error(error.message);
      const rows = data ?? [];
      for (const r of rows) {
        const e: EntryRow = byEntry.get(r.entry_id) || { id: r.entry_id, date: r.journal_entries?.date ?? null, lines: [] };
        e.lines!.push({
          accountCode: r.account_code,
          debit: Number(r.debit) || 0,
          credit: Number(r.credit) || 0,
          thirdPartyCode: r.third_party_code,
          thirdPartyName: r.third_party_name,
          analyticalCode: r.analytical_code,
        });
        byEntry.set(r.entry_id, e);
      }
      if (rows.length < PAGE) break;
    }
    return Array.from(byEntry.values());
  }
  const entries = await adapter.getAll<EntryRow>('journalEntries');
  return entries.filter(e => {
    if (e.status === 'draft') return false;
    const d = e.date ? String(e.date).slice(0, 10) : null;
    if (range?.from && (!d || d < range.from)) return false;
    if (range?.to && (!d || d > range.to)) return false;
    return true;
  });
}

/** Client d'une écriture = tiers porté par sa (première) ligne 41x. */
function clientOfEntry(e: EntryRow): { code: string; name: string } | null {
  for (const l of e.lines || []) {
    if (String(l.accountCode || '').startsWith('41') && l.thirdPartyCode && String(l.thirdPartyCode).trim()) {
      return { code: String(l.thirdPartyCode), name: String(l.thirdPartyName || l.thirdPartyCode) };
    }
  }
  return null;
}

/**
 * CA et marge brute directe par client.
 * @param preloaded écritures déjà chargées (évite un second parcours).
 */
export async function getClientRevenue(
  adapter: DataAdapter,
  preloaded?: EntryRow[],
  range?: DateRange,
): Promise<ClientRevenueReport> {
  const entries = preloaded ?? (await loadEntriesWithLines(adapter, range));

  const acc = new Map<string, ClientRevenue>();
  const get = (code: string, name: string): ClientRevenue => {
    const cur = acc.get(code) || { code, name, ca: 0, nbEcritures: 0, coutDirect: 0, margeBrute: 0, margeBrutePct: 0 };
    if (!acc.has(code)) acc.set(code, cur);
    return cur;
  };

  let caTotal = 0, caAffecte = 0, ecrituresSansClient = 0, totalCharges6 = 0;

  for (const e of entries) {
    const lines = e.lines || [];
    // Total des charges cl.6 (toutes écritures, base du cost-to-serve) — AVANT le
    // filtre « écriture de produit » pour capter aussi les OD de charges pures.
    totalCharges6 += lines
      .filter(l => String(l.accountCode || '').startsWith('6'))
      .reduce((s, l) => s + ((l.debit || 0) - (l.credit || 0)), 0);

    const ca70 = lines
      .filter(l => String(l.accountCode || '').startsWith('70'))
      .reduce((s, l) => s + ((l.credit || 0) - (l.debit || 0)), 0);
    if (ca70 === 0) continue; // pas une écriture de produit

    const client = clientOfEntry(e);
    caTotal += ca70;

    // Coût direct de la même écriture rattaché au client : charges cl.6 portant
    // un code analytique (rare aujourd'hui, croît avec la ventilation).
    const cout6 = lines
      .filter(l => String(l.accountCode || '').startsWith('6') && l.analyticalCode)
      .reduce((s, l) => s + ((l.debit || 0) - (l.credit || 0)), 0);

    if (client) {
      caAffecte += ca70;
      const row = get(client.code, client.name);
      row.ca += ca70;
      row.coutDirect += cout6;
      row.nbEcritures += 1;
    } else {
      ecrituresSansClient += 1;
      const row = get('', 'Non affecté (provisions / ventes sans client)');
      row.ca += ca70;
      row.coutDirect += cout6;
      row.nbEcritures += 1;
    }
  }

  const clients = Array.from(acc.values()).map(r => {
    r.margeBrute = r.ca - r.coutDirect;
    r.margeBrutePct = r.ca !== 0 ? Math.round((r.margeBrute / r.ca) * 100) : 0;
    return r;
  }).sort((a, b) => {
    if (a.code === '') return 1;  // « non affecté » en dernier
    if (b.code === '') return -1;
    return b.ca - a.ca;
  });

  const caNonAffecte = caTotal - caAffecte;
  return {
    clients,
    caTotal,
    caAffecte,
    caNonAffecte,
    pctAffecte: caTotal !== 0 ? Math.round((caAffecte / caTotal) * 100) : 0,
    ecrituresSansClient,
    totalCharges6,
  };
}

// ── Cost-to-serve : marge nette client (CDC §8.1) ────────────────────────────
export type CumulView = 'exercice' | 'ytd' | 'glissant12';
export type ClientStatut = 'RENTABLE' | 'A_SURVEILLER' | 'DEFICITAIRE';

export interface ClientNet extends ClientRevenue {
  quotePartIndirecte: number;   // cost-to-serve alloué (part des charges indirectes)
  margeNette: number;           // margeBrute − quotePartIndirecte
  margeNettePct: number;
  statut: ClientStatut;
}

export interface CostToServeResult {
  clients: ClientNet[];
  indirectPool: number;         // charges cl.6 non directement affectées, réparties
}

/**
 * Statut de rentabilité (CDC §8.1) : une marge négative n'est DÉFICITAIRE (statut
 * officiel) qu'en vue 12 mois glissants ; en vue période/exercice, elle ne
 * déclenche qu'un signal À SURVEILLER (elle peut être un accident ponctuel).
 * Une marge positive mais faible (< 5 %) est aussi À SURVEILLER.
 */
export function clientStatut(margeNette: number, margeNettePct: number, view: CumulView): ClientStatut {
  if (margeNette < 0) return view === 'glissant12' ? 'DEFICITAIRE' : 'A_SURVEILLER';
  if (margeNettePct < 5) return 'A_SURVEILLER';
  return 'RENTABLE';
}

/**
 * Applique le cost-to-serve : répartit le pool de charges cl.6 NON directement
 * attribuées au prorata du CA de chaque client (clé V1 = % CA), en plus fort
 * reste (Σ quote-part = pool). Calcule marge nette et statut. Fonction pure.
 */
export function withCostToServe(report: ClientRevenueReport, view: CumulView): CostToServeResult {
  const directAttribue = report.clients.reduce((s, c) => s + (c.code ? c.coutDirect : 0), 0);
  const indirectPool = Math.max(0, report.totalCharges6 - directAttribue);
  const coded = report.clients.filter(c => c.code);
  const parts = largestRemainderAllocate(indirectPool, coded.map(c => Math.max(0, c.ca)));
  const quoteByCode = new Map<string, number>();
  coded.forEach((c, i) => quoteByCode.set(c.code, parts[i] || 0));

  const clients: ClientNet[] = report.clients.map(c => {
    const quote = c.code ? (quoteByCode.get(c.code) || 0) : 0;
    const margeNette = c.margeBrute - quote;
    const margeNettePct = c.ca !== 0 ? Math.round((margeNette / c.ca) * 100) : 0;
    const statut: ClientStatut = c.code ? clientStatut(margeNette, margeNettePct, view) : 'RENTABLE';
    return { ...c, quotePartIndirecte: quote, margeNette, margeNettePct, statut };
  });
  return { clients, indirectPool };
}

export interface WhalePoint {
  code: string; name: string; margeNette: number;
  cumulMarge: number;           // marge cumulée (monte puis redescend avec les destructeurs)
  cumulPct: number;             // cumul / marge positive totale (%), le pic > 100 %
}

/**
 * Courbe en baleine : clients triés par marge nette décroissante, marge cumulée.
 * Le sommet dépasse 100 % puis redescend — la zone descendante = clients qui
 * DÉTRUISENT de la marge. Fonction pure.
 */
export function buildWhaleCurve(clients: ClientNet[]): WhalePoint[] {
  const coded = clients.filter(c => c.code).slice().sort((a, b) => b.margeNette - a.margeNette);
  const totalPositive = coded.filter(c => c.margeNette > 0).reduce((s, c) => s + c.margeNette, 0) || 1;
  let cum = 0;
  return coded.map(c => {
    cum += c.margeNette;
    return { code: c.code, name: c.name, margeNette: c.margeNette, cumulMarge: cum, cumulPct: Math.round((cum / totalPositive) * 100) };
  });
}
