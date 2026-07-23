/**
 * Export FEC — Fichier des Écritures Comptables — Vague B (B3).
 *
 * Réf. docs/fiscal-dsf-multipays/DESIGN.md § B3
 *
 * Format normalisé 18 colonnes (modèle DGI/OHADA, dérivé du FEC de référence),
 * séparateur PIPE, une ligne d'en-tête. Légalement exigé lors d'un contrôle et
 * aujourd'hui ABSENT du produit.
 *
 * Le fichier n'est produit QUE s'il passe les contrôles de conformité : un FEC
 * déséquilibré ou incohérent serait rejeté par l'administration — on le rejette
 * nous-mêmes, avec le détail, avant livraison.
 */

import type { DataAdapter } from '@atlas/data';
import type { DBJournalEntry, DBJournalLine } from '../../lib/db';
import { money, Money } from '../../utils/money';
import { getAccountLabel } from '../../utils/accountLabels';

// ============================================================================
// COLONNES FEC (ordre normalisé)
// ============================================================================

export const FEC_COLUMNS = [
  'JournalCode',
  'JournalLib',
  'EcritureNum',
  'EcritureDate',
  'CompteNum',
  'CompteLib',
  'CompAuxNum',
  'CompAuxLib',
  'PieceRef',
  'PieceDate',
  'EcritureLib',
  'Debit',
  'Credit',
  'EcritureLet',
  'DateLet',
  'ValidDate',
  'Montantdevise',
  'Idevise',
] as const;

export interface FecControlIssue {
  code:
    | 'GLOBAL_UNBALANCED'
    | 'ENTRY_UNBALANCED'
    | 'DATE_OUT_OF_RANGE'
    | 'MISSING_PIECE'
    | 'NO_LINES';
  detail: string;
  entryId?: string;
}

export interface FecExportResult {
  ok: boolean;
  /** Contenu FEC prêt à télécharger (vide si non conforme). */
  content: string;
  fileName: string;
  issues: FecControlIssue[];
  stats: {
    entries: number;
    lines: number;
    totalDebit: number;
    totalCredit: number;
  };
}

export interface FecExportInput {
  startDate: string;
  endDate: string;
  fiscalYear: number;
  /** Identifiant fiscal (IFU/NCC) pour nommer le fichier. */
  taxId?: string;
}

// ============================================================================
// NORMALISATION D'UN CHAMP
// ============================================================================

/**
 * Neutralise le séparateur et les sauts de ligne dans un champ texte : sans
 * ça, un libellé contenant « | » ou un retour chariot décalerait toutes les
 * colonnes → fichier illisible pour l'administration.
 */
function clean(value: unknown): string {
  return String(value ?? '')
    .replace(/[|\r\n\t]/g, ' ')
    .trim();
}

/** Date au format AAAAMMJJ exigé par le FEC (depuis un ISO ou 'YYYY-MM-DD'). */
function fecDate(iso?: string): string {
  if (!iso) return '';
  const d = iso.slice(0, 10).replace(/-/g, '');
  return /^\d{8}$/.test(d) ? d : '';
}

/** Montant : point décimal, jamais de séparateur de milliers, 2 décimales. */
function fecAmount(n: number): string {
  return money(n).round(2).toNumber().toFixed(2);
}

// ============================================================================
// CONTRÔLES DE CONFORMITÉ
// ============================================================================

function runControls(
  entries: DBJournalEntry[],
  input: FecExportInput,
): FecControlIssue[] {
  const issues: FecControlIssue[] = [];

  let globalDebit = money(0);
  let globalCredit = money(0);

  for (const e of entries) {
    const lines = e.lines ?? [];
    if (lines.length === 0) {
      issues.push({ code: 'NO_LINES', detail: `Écriture ${e.entryNumber || e.id} sans ligne.`, entryId: e.id });
      continue;
    }

    if (!e.entryNumber && !e.reference) {
      issues.push({
        code: 'MISSING_PIECE',
        detail: `Écriture ${e.id} sans numéro de pièce ni référence.`,
        entryId: e.id,
      });
    }

    if ((e.date ?? '') < input.startDate || (e.date ?? '') > input.endDate) {
      issues.push({
        code: 'DATE_OUT_OF_RANGE',
        detail: `Écriture ${e.entryNumber || e.id} datée ${e.date} hors exercice (${input.startDate} → ${input.endDate}).`,
        entryId: e.id,
      });
    }

    const d = Money.sum(lines.map(l => money(l.debit)));
    const c = Money.sum(lines.map(l => money(l.credit)));
    if (!d.equals(c, 0.005)) {
      issues.push({
        code: 'ENTRY_UNBALANCED',
        detail: `Écriture ${e.entryNumber || e.id} déséquilibrée : débit ${d.toNumber()} ≠ crédit ${c.toNumber()}.`,
        entryId: e.id,
      });
    }
    globalDebit = globalDebit.add(d);
    globalCredit = globalCredit.add(c);
  }

  if (!globalDebit.equals(globalCredit, 0.005)) {
    issues.push({
      code: 'GLOBAL_UNBALANCED',
      detail: `Balance de la période déséquilibrée : débit ${globalDebit.toNumber()} ≠ crédit ${globalCredit.toNumber()}.`,
    });
  }

  return issues;
}

// ============================================================================
// EXPORT
// ============================================================================

export async function exportFEC(
  adapter: DataAdapter,
  input: FecExportInput,
): Promise<FecExportResult> {
  const all = (await adapter.getAll<DBJournalEntry>('journalEntries')) ?? [];

  // Brouillons EXCLUS : le FEC ne contient que des écritures définitives.
  const entries = all.filter(
    e =>
      (e.status === 'validated' || e.status === 'posted') &&
      (e.date ?? '') >= input.startDate &&
      (e.date ?? '') <= input.endDate,
  );

  const issues = runControls(entries, input);

  let totalDebit = money(0);
  let totalCredit = money(0);
  let lineCount = 0;

  const rows: string[] = [FEC_COLUMNS.join('|')];

  // Tri déterministe : par date puis numéro d'écriture (exigence FEC : ordre
  // chronologique stable, reproductible d'un export à l'autre).
  const sorted = [...entries].sort(
    (a, b) =>
      (a.date ?? '').localeCompare(b.date ?? '') ||
      (a.entryNumber ?? '').localeCompare(b.entryNumber ?? ''),
  );

  for (const e of sorted) {
    const validDate = fecDate(e.updatedAt ?? e.date);
    for (const l of e.lines ?? []) {
      lineCount++;
      totalDebit = totalDebit.add(money(l.debit));
      totalCredit = totalCredit.add(money(l.credit));

      const accountName = clean((l as DBJournalLine).accountName || getAccountLabel(l.accountCode));
      const row = [
        clean(e.journal),
        clean(journalLabel(e.journal)),
        clean(e.entryNumber || e.id),
        fecDate(e.date),
        clean(l.accountCode),
        accountName,
        clean(l.thirdPartyCode),
        clean(l.thirdPartyName),
        clean(e.reference || e.entryNumber),
        fecDate(e.date),
        clean(l.label || e.label),
        fecAmount(l.debit || 0),
        fecAmount(l.credit || 0),
        clean(l.lettrageCode),
        '', // DateLet — non tenue à la ligne dans ce modèle
        validDate,
        '', // Montantdevise — mono-devise pour l'instant
        '', // Idevise
      ];
      rows.push(row.join('|'));
    }
  }

  const ok = issues.length === 0 && lineCount > 0;
  const idPart = (input.taxId || 'ENTITE').replace(/[^A-Za-z0-9]/g, '');
  const fileName = `${idPart}_FEC_${input.fiscalYear}_${input.endDate.replace(/-/g, '')}.txt`;

  return {
    ok,
    // On ne livre le contenu QUE s'il est conforme : un FEC non conforme
    // n'a pas à circuler (il serait rejeté par l'administration).
    content: ok ? rows.join('\r\n') : '',
    fileName,
    issues,
    stats: {
      entries: sorted.length,
      lines: lineCount,
      totalDebit: totalDebit.round(2).toNumber(),
      totalCredit: totalCredit.round(2).toNumber(),
    },
  };
}

/** Libellés de journaux usuels SYSCOHADA (repli sur le code si inconnu). */
function journalLabel(code: string): string {
  const labels: Record<string, string> = {
    VE: 'Journal des ventes',
    AC: 'Journal des achats',
    BQ: 'Journal de banque',
    CA: 'Journal de caisse',
    OD: 'Opérations diverses',
    AN: 'À-nouveaux',
    ST: 'Mouvements de stock',
    PA: 'Journal de paie',
  };
  return labels[code] ?? code;
}
