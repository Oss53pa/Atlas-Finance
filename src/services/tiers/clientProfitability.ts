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
}

interface EntryRow {
  id: string;
  status?: string;
  lines?: Array<{ accountCode?: string; debit?: number; credit?: number; thirdPartyCode?: string | null; thirdPartyName?: string | null; analyticalCode?: string | null }>;
}

const PAGE = 1000;

/**
 * Charge toutes les écritures avec leurs lignes, quel que soit le mode.
 * En SaaS on lit journal_lines paginé (les lignes vivent dans la table séparée) ;
 * en local, getAll réinjecte déjà les lignes.
 */
async function loadEntriesWithLines(adapter: DataAdapter): Promise<EntryRow[]> {
  const client = (adapter as any).client;
  if (adapter.getMode?.() === 'saas' && client) {
    const byEntry = new Map<string, EntryRow>();
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await client
        .from('journal_lines')
        .select('entry_id,account_code,debit,credit,third_party_code,third_party_name,analytical_code,journal_entries!inner(status)')
        .neq('journal_entries.status', 'draft')
        .order('id', { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) throw new Error(error.message);
      const rows = data ?? [];
      for (const r of rows) {
        const e: EntryRow = byEntry.get(r.entry_id) || { id: r.entry_id, lines: [] };
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
  return entries.filter(e => e.status !== 'draft');
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
): Promise<ClientRevenueReport> {
  const entries = preloaded ?? (await loadEntriesWithLines(adapter));

  const acc = new Map<string, ClientRevenue>();
  const get = (code: string, name: string): ClientRevenue => {
    const cur = acc.get(code) || { code, name, ca: 0, nbEcritures: 0, coutDirect: 0, margeBrute: 0, margeBrutePct: 0 };
    if (!acc.has(code)) acc.set(code, cur);
    return cur;
  };

  let caTotal = 0, caAffecte = 0, ecrituresSansClient = 0;

  for (const e of entries) {
    const lines = e.lines || [];
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
  };
}
