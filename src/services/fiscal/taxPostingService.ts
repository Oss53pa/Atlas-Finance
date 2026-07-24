/**
 * Écriture d'impôt sur le résultat (IS/IMF) — posting depuis la détermination.
 *
 * B1 produit le résultat fiscal et `impotDu` (= max(IS théorique, IMF)) ; ce
 * service transforme ce chiffre en ÉCRITURE COMPTABLE réelle.
 *
 * Modèle SYSCOHADA :
 *   - la charge d'impôt vit en classe 89 (891 = IS, 895 = IMF) ;
 *   - la dette d'impôt vit en 441 (État, impôt sur les bénéfices).
 *
 * La détermination réintègre déjà la classe 89 existante (IMF/acomptes passés
 * en charge) pour repartir d'un résultat AVANT impôt : `impotDu` est donc le
 * total de l'impôt de l'exercice. L'écriture porte le COMPLÉMENT nécessaire
 * pour amener la classe 89 à exactement `impotDu`, et inscrit la dette au 441.
 *
 * Deux garanties :
 *   1. PRÉVISUALISATION pure (`buildTaxEntryPreview`) — rien n'est écrit tant
 *      que l'utilisateur n'a pas confirmé. Poster dans les livres est irréversible.
 *   2. IDEMPOTENCE — une écriture par exercice (marqueur `reference`), refus du
 *      double-post.
 */

import type { DataAdapter } from '@atlas/data';
import type { DBJournalEntry } from '../../lib/db';
import { money, Money } from '../../utils/money';
import { loadGLEntries, makeGLHelpers } from '../../features/financial/glHelpers';
import { safeAddEntry } from '../entryGuard';
import { getAccountLabel } from '../../utils/accountLabels';
import type { ResultatFiscalResult } from './resultatFiscalService';

export interface TaxPostingAccounts {
  /** Charge — IS sur les bénéfices (défaut 891000). */
  chargeIS: string;
  /** Charge — Impôt Minimum Forfaitaire (défaut 895000). */
  chargeIMF: string;
  /** Dette — État, impôt sur les bénéfices (défaut 441000). */
  liability: string;
}

export const DEFAULT_TAX_ACCOUNTS: TaxPostingAccounts = {
  chargeIS: '891000',
  chargeIMF: '895000',
  liability: '441000',
};

export interface TaxEntryLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface TaxEntryPreview {
  /** Impôt dû total (cible de la classe 89), depuis la détermination. */
  impotDu: number;
  /** Charge d'impôt DÉJÀ comptabilisée en classe 89 (solde débiteur). */
  alreadyBooked: number;
  /** Complément à comptabiliser = impotDu − alreadyBooked (peut être négatif). */
  complement: number;
  /** IMF est-il l'élément contraignant ? (impotDu == IMF > IS théorique) */
  imfBinding: boolean;
  lines: TaxEntryLine[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
  reference: string;
  /** Rien à comptabiliser (classe 89 déjà à l'impôt dû). */
  nothingToPost: boolean;
  /** Une écriture d'impôt existe déjà pour cet exercice. */
  alreadyPosted: boolean;
  message: string;
}

const taxReference = (fiscalYearId: string) => `IS-${fiscalYearId}`;

/** Solde débiteur cumulé de la classe 89 (charge d'impôt déjà passée). */
async function class89Charge(adapter: DataAdapter): Promise<number> {
  const entries = await loadGLEntries(adapter as any); // brouillons exclus
  const h = makeGLHelpers(entries);
  // net('89') = débit − crédit ; une charge est débitrice → positif.
  return money(h.net('89')).round(2).toNumber();
}

async function hasTaxEntry(adapter: DataAdapter, fiscalYearId: string): Promise<boolean> {
  const ref = taxReference(fiscalYearId);
  const existing = await adapter.getAll<DBJournalEntry>('journalEntries', {
    where: { reference: ref },
    limit: 5,
  });
  return (existing ?? []).some(e => e.status !== 'draft');
}

/**
 * Prévisualise l'écriture d'impôt SANS rien écrire.
 *
 * L'appelant affiche le résultat et déclenche `postTaxEntry` seulement sur
 * confirmation explicite.
 */
export async function buildTaxEntryPreview(
  adapter: DataAdapter,
  determination: ResultatFiscalResult,
  opts: { fiscalYearId: string; accounts?: Partial<TaxPostingAccounts> } ,
): Promise<TaxEntryPreview> {
  const accounts = { ...DEFAULT_TAX_ACCOUNTS, ...(opts.accounts ?? {}) };
  const reference = taxReference(opts.fiscalYearId);

  const impotDu = money(determination.impotDu).round(2).toNumber();
  const alreadyBooked = await class89Charge(adapter);
  const complement = money(impotDu).subtract(alreadyBooked).round(2).toNumber();
  const imfBinding = determination.impotDu > 0
    && money(determination.impotMinimumForfaitaire).greaterThan(determination.impotTheorique);

  const alreadyPosted = await hasTaxEntry(adapter, opts.fiscalYearId);

  const base: Omit<TaxEntryPreview, 'lines' | 'totalDebit' | 'totalCredit' | 'balanced'> = {
    impotDu, alreadyBooked, complement, imfBinding, reference,
    nothingToPost: complement === 0,
    alreadyPosted,
    message: '',
  };

  if (alreadyPosted) {
    return {
      ...base,
      lines: [], totalDebit: 0, totalCredit: 0, balanced: true,
      message: `Une écriture d'impôt existe déjà pour cet exercice (${reference}).`,
    };
  }
  if (complement === 0) {
    return {
      ...base,
      lines: [], totalDebit: 0, totalCredit: 0, balanced: true,
      message: `La classe 89 est déjà à l'impôt dû (${money(impotDu).round(0).toNumber().toLocaleString('fr-FR')}). Rien à comptabiliser.`,
    };
  }

  // complement > 0 : charge d'impôt complémentaire + dette.
  // complement < 0 : reprise (sur-provision) — on inverse les sens.
  const lines: TaxEntryLine[] = [];
  const amount = Math.abs(complement);
  // Le complément d'impôt au-delà de l'IMF déjà comptabilisé relève de l'IS (891).
  const chargeAccount = accounts.chargeIS;

  if (complement > 0) {
    lines.push(mkLine(chargeAccount, amount, 0));         // charge (débit)
    lines.push(mkLine(accounts.liability, 0, amount));    // dette (crédit)
  } else {
    lines.push(mkLine(accounts.liability, amount, 0));    // annulation dette
    lines.push(mkLine(chargeAccount, 0, amount));         // reprise de charge
  }

  const totalDebit = Money.sum(lines.map(l => money(l.debit))).round(2).toNumber();
  const totalCredit = Money.sum(lines.map(l => money(l.credit))).round(2).toNumber();

  return {
    ...base,
    lines,
    totalDebit,
    totalCredit,
    balanced: money(totalDebit).equals(money(totalCredit), 0.005),
    message: complement > 0
      ? `Impôt à comptabiliser : ${amount.toLocaleString('fr-FR')} (débit ${chargeAccount} / crédit ${accounts.liability}).`
      : `Reprise d'impôt sur-provisionné : ${amount.toLocaleString('fr-FR')}.`,
  };
}

function mkLine(code: string, debit: number, credit: number): TaxEntryLine {
  return { accountCode: code, accountName: getAccountLabel(code) || code, debit, credit };
}

export interface TaxPostingResult {
  posted: boolean;
  entryId?: string;
  entryNumber?: string;
  reference: string;
  amount?: number;
  message: string;
}

/**
 * Comptabilise l'écriture d'impôt (action explicite, après prévisualisation).
 *
 * Guard d'idempotence : refuse si une écriture existe déjà. Poste au journal OD,
 * validée, à la date de clôture. `allowClosedPeriod` : c'est une écriture
 * SYSTÈME de clôture (comme l'affectation du résultat).
 */
export async function postTaxEntry(
  adapter: DataAdapter,
  determination: ResultatFiscalResult,
  opts: {
    fiscalYearId: string;
    fiscalYearLabel?: string;
    entryDate: string; // date de clôture de l'exercice
    accounts?: Partial<TaxPostingAccounts>;
    createdBy?: string;
  },
): Promise<TaxPostingResult> {
  const preview = await buildTaxEntryPreview(adapter, determination, {
    fiscalYearId: opts.fiscalYearId,
    accounts: opts.accounts,
  });

  if (preview.alreadyPosted) {
    return { posted: false, reference: preview.reference, message: preview.message };
  }
  if (preview.nothingToPost) {
    return { posted: false, reference: preview.reference, message: preview.message };
  }
  if (!preview.balanced) {
    return { posted: false, reference: preview.reference, message: 'Écriture déséquilibrée — non comptabilisée.' };
  }

  const entryId = crypto.randomUUID();
  const now = new Date().toISOString();
  const entryNumber = `IS-${opts.entryDate.replace(/-/g, '')}`;

  await safeAddEntry(
    adapter,
    {
      id: entryId,
      entryNumber,
      journal: 'OD',
      date: opts.entryDate,
      reference: preview.reference,
      label: `Impôt sur le résultat ${opts.fiscalYearLabel ?? opts.fiscalYearId}`,
      status: 'validated',
      nature: 'cloture',
      lines: preview.lines.map((l, i) => ({
        id: `${entryId}-${i}`,
        accountCode: l.accountCode,
        accountName: l.accountName,
        label: 'Impôt sur le résultat',
        debit: l.debit,
        credit: l.credit,
      })),
      createdAt: now,
      createdBy: opts.createdBy ?? 'system',
      sourceSystem: 'closure',
      sourceDocType: 'income_tax',
      sourceDocId: opts.fiscalYearId,
    } as any,
    // Écriture système de clôture : équilibre garanti par construction, période
    // de clôture autorisée (comme l'affectation du résultat).
    { skipSyncValidation: true, allowClosedPeriod: true },
  );

  return {
    posted: true,
    entryId,
    entryNumber,
    reference: preview.reference,
    amount: Math.abs(preview.complement),
    message: `Écriture d'impôt comptabilisée (${entryNumber}).`,
  };
}

/** L'impôt de cet exercice est-il déjà comptabilisé ? (pour l'UI) */
export async function isTaxPosted(adapter: DataAdapter, fiscalYearId: string): Promise<boolean> {
  return hasTaxEntry(adapter, fiscalYearId);
}
