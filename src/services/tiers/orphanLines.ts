/**
 * Rattachement assisté des lignes collectives orphelines (40x / 41x sans tiers).
 *
 * POURQUOI : une ligne de compte collectif sans `third_party_code` n'apparaît
 * dans AUCUNE vue par tiers (encours, balance âgée, relances, lettrage,
 * recouvrement). Le stock historique en compte des milliers — voir
 * `thirdPartyCoverage.ts` qui les quantifie.
 *
 * PRINCIPE : on ne devine JAMAIS. Le moteur propose des candidats scorés et
 * explicables ; l'affectation n'a lieu que sur confirmation explicite, ligne à
 * ligne. Aucun backfill automatique (le taux de correspondance mesuré était de
 * ~11 %, donc majoritairement faux).
 *
 * ÉCRITURE : `journal_lines` est une table SÉPARÉE en SaaS → on écrit
 * `third_party_code` DIRECTEMENT dedans (jamais via un update de
 * `journalEntries.lines`, colonne qui n'existe pas côté serveur), puis on
 * invalide le cache de l'adaptateur.
 */
import type { DataAdapter } from '@atlas/data';
import type { DBJournalEntry, DBThirdParty } from '../../lib/db';

export type FamilleTiers = 'client' | 'fournisseur';

export interface OrphanLine {
  lineId: string;
  entryId: string;
  entryNumber?: string;
  date: string;
  journal?: string;
  accountCode: string;
  label: string;
  debit: number;
  credit: number;
  famille: FamilleTiers;
}

export interface TiersSuggestion {
  code: string;
  name: string;
  /** 0-100 : part des mots significatifs du nom retrouvés dans le libellé. */
  score: number;
  /** Justification affichée à l'utilisateur (pas de boîte noire). */
  reason: string;
}

/* ------------------------------------------------------------------ */
/* Normalisation                                                       */
/* ------------------------------------------------------------------ */

const norm = (s: string | undefined | null): string =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Mots trop courants pour discriminer un tiers (formes juridiques, civilités). */
const STOP = new Set([
  'sarl', 'sarlu', 'sa', 'sas', 'sasu', 'suarl', 'sci', 'gie', 'ets', 'etablissement',
  'etablissements', 'entreprise', 'entreprises', 'societe', 'ste', 'group', 'groupe',
  'ltd', 'llc', 'inc', 'cie', 'compagnie', 'sarls', 'snc', 'eurl', 'monsieur', 'madame',
  'mr', 'mme', 'client', 'fournisseur', 'facture', 'reglement', 'paiement', 'achat', 'vente',
]);

const significantTokens = (name: string): string[] =>
  norm(name).split(' ').filter(w => w.length >= 4 && !STOP.has(w));

/* ------------------------------------------------------------------ */
/* Lecture des lignes orphelines                                       */
/* ------------------------------------------------------------------ */

const familleOf = (accountCode: string): FamilleTiers | null =>
  accountCode.startsWith('41') ? 'client'
  : accountCode.startsWith('40') ? 'fournisseur'
  : null;

const PAGE = 1000; // PostgREST tronque au-delà → pagination obligatoire

/**
 * Lignes 40x/41x sans code tiers, hors brouillons.
 * @param famille filtre optionnel ; sinon les deux familles.
 */
export async function listOrphanCollectiveLines(
  adapter: DataAdapter,
  famille?: FamilleTiers,
): Promise<OrphanLine[]> {
  const client = (adapter as any).client;
  const prefixes = famille === 'client' ? ['41'] : famille === 'fournisseur' ? ['40'] : ['40', '41'];

  if (adapter.getMode?.() === 'saas' && client) {
    const out: OrphanLine[] = [];
    for (const p of prefixes) {
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await client
          .from('journal_lines')
          .select('id,entry_id,account_code,label,debit,credit,journal_entries!inner(entry_number,date,journal,status)')
          .like('account_code', `${p}%`)
          .is('third_party_code', null)
          .neq('journal_entries.status', 'draft')
          .order('id', { ascending: true }) // tri déterministe : pagination fiable
          .range(from, from + PAGE - 1);
        if (error) throw new Error(error.message);
        const rows = data ?? [];
        for (const r of rows) {
          const head = Array.isArray(r.journal_entries) ? r.journal_entries[0] : r.journal_entries;
          const fam = familleOf(String(r.account_code || ''));
          if (!fam) continue;
          out.push({
            lineId: r.id,
            entryId: r.entry_id,
            entryNumber: head?.entry_number,
            date: head?.date ?? '',
            journal: head?.journal,
            accountCode: String(r.account_code),
            label: r.label ?? '',
            debit: Number(r.debit) || 0,
            credit: Number(r.credit) || 0,
            famille: fam,
          });
        }
        if (rows.length < PAGE) break;
      }
    }
    return out.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  // Local (Dexie) : les lignes sont embarquées dans l'écriture.
  const entries = await adapter.getAll<DBJournalEntry>('journalEntries');
  const out: OrphanLine[] = [];
  for (const e of entries) {
    if ((e as any).status === 'draft') continue;
    for (const l of e.lines || []) {
      const fam = familleOf(String(l.accountCode || ''));
      if (!fam) continue;
      if (famille && fam !== famille) continue;
      if (l.thirdPartyCode && String(l.thirdPartyCode).trim()) continue;
      out.push({
        lineId: (l as any).id,
        entryId: e.id,
        entryNumber: e.entryNumber,
        date: e.date,
        journal: e.journal,
        accountCode: String(l.accountCode),
        label: l.label ?? e.label ?? '',
        debit: l.debit || 0,
        credit: l.credit || 0,
        famille: fam,
      });
    }
  }
  return out.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

/* ------------------------------------------------------------------ */
/* Suggestions                                                         */
/* ------------------------------------------------------------------ */

/**
 * Candidats pour une ligne, du plus probable au moins probable.
 * Le score est la part des mots significatifs du nom du tiers présents dans le
 * libellé — volontairement simple pour rester explicable à l'utilisateur.
 */
export function suggestTiers(
  line: OrphanLine,
  tiers: Array<Pick<DBThirdParty, 'code' | 'name' | 'type' | 'accountCode'>>,
  limit = 3,
): TiersSuggestion[] {
  const hay = ` ${norm(line.label)} `;
  if (!hay.trim()) return [];

  const wanted = line.famille === 'client' ? 'customer' : 'supplier';
  const pool = tiers.filter(t => !t.type || t.type === wanted || t.type === 'both');

  const scored: TiersSuggestion[] = [];
  for (const t of pool) {
    if (!t.code || !t.name) continue;
    const tokens = significantTokens(t.name);
    if (tokens.length === 0) continue;

    const hits = tokens.filter(w => hay.includes(` ${w} `) || hay.includes(w));
    if (hits.length === 0) continue;

    let score = Math.round((hits.length / tokens.length) * 100);
    let reason = `${hits.length}/${tokens.length} mot(s) du nom dans le libellé : « ${hits.join(', ')} »`;

    // Nom complet retrouvé tel quel → certitude nettement plus élevée.
    const full = norm(t.name);
    if (full.length >= 5 && hay.includes(full)) {
      score = Math.min(100, score + 25);
      reason = `nom complet trouvé dans le libellé (« ${t.name} »)`;
    }
    // Le compte auxiliaire de la fiche est exactement celui de la ligne.
    if (t.accountCode && t.accountCode === line.accountCode) {
      score = Math.min(100, score + 20);
      reason += ` · compte auxiliaire ${t.accountCode} identique`;
    }
    scored.push({ code: t.code, name: t.name, score, reason });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* Affectation                                                         */
/* ------------------------------------------------------------------ */

/**
 * Affecte un tiers à UNE ligne. N'écrase jamais un code déjà présent.
 * Ne modifie ni le compte, ni les montants, ni le statut de l'écriture :
 * c'est une qualification analytique, pas une correction comptable.
 */
export async function assignTiersToLine(
  adapter: DataAdapter,
  lineId: string,
  tiers: { code: string; name?: string },
): Promise<void> {
  const client = (adapter as any).client;

  if (adapter.getMode?.() === 'saas' && client) {
    const { error } = await client
      .from('journal_lines')
      .update({ third_party_code: tiers.code, third_party_name: tiers.name ?? null })
      .eq('id', lineId)
      .is('third_party_code', null); // garde anti-écrasement
    if (error) throw new Error(error.message);
    (adapter as any).invalidateCache?.(); // écriture directe → cache périmé
    return;
  }

  // Local : patcher la ligne dans son écriture.
  const entries = await adapter.getAll<DBJournalEntry>('journalEntries');
  const entry = entries.find(e => (e.lines || []).some(l => (l as any).id === lineId));
  if (!entry) throw new Error(`Ligne ${lineId} introuvable.`);
  const lines = entry.lines.map(l =>
    (l as any).id === lineId && !l.thirdPartyCode
      ? { ...l, thirdPartyCode: tiers.code, thirdPartyName: tiers.name }
      : l,
  );
  await adapter.saveJournalEntry({ ...entry, lines } as any);
  (adapter as any).invalidateCache?.();
}

/** Affectation en lot (confirmée en amont, ligne par ligne, par l'utilisateur). */
export async function assignTiersToLines(
  adapter: DataAdapter,
  assignments: Array<{ lineId: string; code: string; name?: string }>,
): Promise<{ applied: number; failed: number }> {
  let applied = 0;
  let failed = 0;
  for (const a of assignments) {
    try {
      await assignTiersToLine(adapter, a.lineId, { code: a.code, name: a.name });
      applied += 1;
    } catch {
      failed += 1;
    }
  }
  return { applied, failed };
}
