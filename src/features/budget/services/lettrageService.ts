import type { DataAdapter } from '@atlas/data';

/**
 * Lettrage budgétaire a posteriori (refonte OPEX/CAPEX — Lot 2, §8.4 CDC).
 *
 * Rapproche des écritures GL DÉJÀ validées avec des engagements ouverts, quand le
 * lien n'a pas été fait à la saisie. Flux centré engagement : on choisit un
 * engagement, on liste les lignes GL candidates (même compte, validées, non encore
 * rapprochées), on suggère par proximité de montant, l'humain valide ligne à ligne.
 * Le rapprochement (mode='lettrage') déclenche la bascule via le trigger DB.
 */

export interface CandidateLine {
  id: string;
  account_code: string;
  label: string | null;
  montant: number;             // débit (charge/immo) net
  date: string | null;
  entry_number: string | null;
  suggested: boolean;          // proposition auto (proximité montant)
}

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}

async function fetchAll(build: () => any, chunk = 1000): Promise<any[]> {
  const all: any[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await build().range(from, from + chunk - 1);
    if (error) throw new Error(error.message);
    const batch = (data || []) as any[];
    all.push(...batch);
    if (batch.length < chunk) break;
    from += chunk;
  }
  return all;
}

/** Ids des écritures d'entête validées, avec leur date/numéro (map par id). */
async function validatedEntries(client: any): Promise<Map<string, { date: string; entry_number: string }>> {
  const rows = await fetchAll(() => client
    .from('journal_entries').select('id,date,entry_number').eq('status', 'validated').order('id', { ascending: true }));
  const m = new Map<string, { date: string; entry_number: string }>();
  for (const r of rows) m.set(r.id, { date: r.date, entry_number: r.entry_number });
  return m;
}

/** Ids de lignes déjà rapprochées (à exclure). */
async function reconciledLineIds(client: any): Promise<Set<string>> {
  const rows = await fetchAll(() => client
    .from('engagement_rapprochements').select('journal_line_id').order('journal_line_id', { ascending: true }));
  return new Set(rows.map((r: any) => r.journal_line_id));
}

/**
 * Lignes GL candidates pour un engagement : même compte, écriture validée, débit > 0,
 * non déjà rapprochées. `suggested` marque celles proches du reste à facturer (±5 %).
 */
export async function listCandidateLines(
  adapter: DataAdapter,
  input: { accountCode: string; resteAFacturer: number },
): Promise<CandidateLine[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const [entries, reconciled, lines] = await Promise.all([
    validatedEntries(client),
    reconciledLineIds(client),
    fetchAll(() => client
      .from('journal_lines')
      .select('id,account_code,label,debit,entry_id')
      .eq('account_code', input.accountCode)
      .gt('debit', 0)
      .order('id', { ascending: true })),
  ]);
  const tol = Math.max(1, input.resteAFacturer * 0.05);
  return lines
    .filter((l: any) => entries.has(l.entry_id) && !reconciled.has(l.id))
    .map((l: any) => {
      const meta = entries.get(l.entry_id)!;
      const montant = Number(l.debit) || 0;
      return {
        id: l.id, account_code: l.account_code, label: l.label,
        montant, date: meta.date, entry_number: meta.entry_number,
        suggested: Math.abs(montant - input.resteAFacturer) <= tol,
      } as CandidateLine;
    })
    .sort((a, b) => (a.suggested === b.suggested ? (a.date || '').localeCompare(b.date || '') : a.suggested ? -1 : 1));
}
