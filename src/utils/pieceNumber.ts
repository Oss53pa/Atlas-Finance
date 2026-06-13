/**
 * Numérotation des pièces comptables — n° INCRÉMENTAL par journal.
 *
 * SYSCOHADA : chaque journal porte une numérotation continue, classée par date.
 * Après une bascule, `entry_number`/`reference` peut valoir un concat technique
 * (« ACHAT|2026-04-10 »). Cet utilitaire produit, à l'affichage, un numéro
 * propre et stable : AC-000001, AC-000002, VE-000001…
 *
 * - Une pièce = une écriture (toutes ses lignes partagent le même numéro).
 * - Le numéro est calculé sur l'ENSEMBLE des écritures fournies → stable quand
 *   on filtre/pagine (ne dépend pas du sous-ensemble affiché).
 * - L'identité technique en base (id / entry_number) n'est pas modifiée : c'est
 *   une présentation. Les éditions/contre-passations continuent d'utiliser l'id.
 *
 * Usage :
 *   const pieces = buildPieceNumbers(entries);
 *   const num = pieceNumberOf(entry, pieces); // « AC-000001 »
 */

export interface PieceEntryLike {
  id?: string | number;
  journal?: string;
  date?: string;
  entryNumber?: string;
  entry_number?: string;
  reference?: string;
}

/** Construit la table id → n° de pièce incrémental (par journal, classé par date). */
export function buildPieceNumbers(entries: PieceEntryLike[]): Map<string, string> {
  const byJournal = new Map<string, PieceEntryLike[]>();
  for (const e of entries) {
    const j = String(e.journal || 'OD').toUpperCase().trim();
    if (!byJournal.has(j)) byJournal.set(j, []);
    byJournal.get(j)!.push(e);
  }
  const map = new Map<string, string>();
  for (const [j, list] of byJournal) {
    list.sort((a, b) =>
      String(a.date || '').localeCompare(String(b.date || '')) ||
      String(a.entryNumber || a.entry_number || a.id || '').localeCompare(
        String(b.entryNumber || b.entry_number || b.id || '')));
    list.forEach((e, i) => map.set(String(e.id), `${j}-${String(i + 1).padStart(6, '0')}`));
  }
  return map;
}

/** Récupère le n° de pièce d'une écriture, avec repli sur les champs sources. */
export function pieceNumberOf(entry: PieceEntryLike, pieces: Map<string, string>): string {
  return (
    pieces.get(String(entry.id)) ||
    entry.reference ||
    entry.entryNumber ||
    entry.entry_number ||
    String(entry.id || '')
  );
}
