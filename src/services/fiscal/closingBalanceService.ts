/**
 * Balance générale de clôture (Vague D) — le pont vers Liass'Pilot.
 *
 * Atlas F&A ne produit PAS les annexes de liasse : Liass'Pilot s'en charge.
 * Le point d'intégration est la BALANCE GÉNÉRALE DE CLÔTURE (8 colonnes) que
 * Liass'Pilot récupère pour bâtir la DSF des 14 pays UEMOA/CEMAC.
 *
 * État exposé (choix produit) : « après inventaire, avant affectation du
 * résultat » — donc la balance BRUTE de toutes les écritures validées de
 * l'exercice. Le résultat apparaît par les soldes des classes 6/7 (ou 89 si
 * l'écriture de détermination est déjà passée). Aucune décision de clôture
 * n'est prise ici : Liass'Pilot reçoit la matière comptable telle quelle.
 *
 * Source : glHelpers (loadGLEntries) — source unique, brouillons exclus.
 * Colonnes : ouverture (à-nouveau) D/C · mouvements D/C · clôture D/C.
 */

import type { DataAdapter } from '@atlas/data';
import { loadGLEntries, type GLEntry } from '../../features/financial/glHelpers';
import { getAccountLabel } from '../../utils/accountLabels';
import { money, Money } from '../../utils/money';
import { sha256Hex } from '../../utils/integrity';
import { resolveOhadaCountry } from './ohadaCountries';

/** Les à-nouveaux ne sont PAS des mouvements de période : ils forment l'ouverture. */
const isOpeningEntry = (e: GLEntry): boolean => e.journal === 'AN' || e.journal === 'RAN';

export interface ClosingBalanceRow {
  accountCode: string;
  accountName: string;
  openingDebit: number;
  openingCredit: number;
  movementDebit: number;
  movementCredit: number;
  closingDebit: number;
  closingCredit: number;
}

export interface ClosingBalanceTotals {
  openingDebit: number;
  openingCredit: number;
  movementDebit: number;
  movementCredit: number;
  closingDebit: number;
  closingCredit: number;
}

export interface ClosingBalance {
  fiscalYearId?: string;
  fiscalYearLabel?: string;
  startDate?: string;
  endDate?: string;
  countryCode?: string;
  countryName?: string;
  zone?: string;
  currency: string;
  state: 'after_inventory_before_appropriation';
  rows: ClosingBalanceRow[];
  totals: ClosingBalanceTotals;
  /** Vrai si Σ soldes débiteurs = Σ soldes créditeurs (contrôle de partie double). */
  balanced: boolean;
  /** Empreinte SHA-256 du contenu — scelle la balance transmise à Liass'Pilot. */
  integrityHash?: string;
  generatedAt?: string;
}

interface AccountAccumulator {
  code: string;
  openingDebit: Money;
  openingCredit: Money;
  movementDebit: Money;
  movementCredit: Money;
}

/**
 * Construit la balance générale de clôture pour une période.
 *
 * @param range  bornes de l'exercice (endDate = date de clôture). Les écritures
 *               hors bornes sont ignorées ; les à-nouveaux (journal AN/RAN)
 *               restent classés en ouverture même s'ils portent la date d'ouverture.
 */
export async function buildClosingBalance(
  adapter: DataAdapter,
  range: { startDate?: string; endDate?: string } = {},
  meta: { fiscalYearId?: string; fiscalYearLabel?: string; countryInput?: string } = {},
): Promise<ClosingBalance> {
  const entries = await loadGLEntries(adapter as any); // brouillons déjà exclus

  const acc = new Map<string, AccountAccumulator>();
  const get = (code: string): AccountAccumulator => {
    let a = acc.get(code);
    if (!a) {
      a = {
        code,
        openingDebit: money(0), openingCredit: money(0),
        movementDebit: money(0), movementCredit: money(0),
      };
      acc.set(code, a);
    }
    return a;
  };

  for (const e of entries) {
    const opening = isOpeningEntry(e);
    // Filtre de période : les mouvements hors bornes ne concernent pas cet
    // exercice. Les à-nouveaux sont conservés quelle que soit leur date (ils
    // matérialisent l'ouverture).
    if (!opening && range.endDate && (e.date ?? '') > range.endDate) continue;
    if (!opening && range.startDate && (e.date ?? '') < range.startDate) continue;

    for (const l of e.lines ?? []) {
      const code = l.accountCode || '';
      if (!code) continue;
      const a = get(code);
      if (opening) {
        a.openingDebit = a.openingDebit.add(l.debit || 0);
        a.openingCredit = a.openingCredit.add(l.credit || 0);
      } else {
        a.movementDebit = a.movementDebit.add(l.debit || 0);
        a.movementCredit = a.movementCredit.add(l.credit || 0);
      }
    }
  }

  const rows: ClosingBalanceRow[] = [];
  for (const a of acc.values()) {
    // Solde de clôture par compte = (ouverture + mouvements), présenté par SIGNE
    // (un compte à solde inversé, ex. 46 créditeur, se place du bon côté — jamais
    // de Math.max qui l'écraserait).
    const net = a.openingDebit.add(a.movementDebit)
      .subtract(a.openingCredit).subtract(a.movementCredit);
    const closingDebit = net.toNumber() >= 0 ? net.toNumber() : 0;
    const closingCredit = net.toNumber() < 0 ? net.abs().toNumber() : 0;

    // Ignore les comptes strictement à zéro partout (bruit).
    if (
      a.openingDebit.isZero() && a.openingCredit.isZero() &&
      a.movementDebit.isZero() && a.movementCredit.isZero()
    ) continue;

    rows.push({
      accountCode: a.code,
      accountName: getAccountLabel(a.code) || a.code,
      openingDebit: a.openingDebit.round(2).toNumber(),
      openingCredit: a.openingCredit.round(2).toNumber(),
      movementDebit: a.movementDebit.round(2).toNumber(),
      movementCredit: a.movementCredit.round(2).toNumber(),
      closingDebit: money(closingDebit).round(2).toNumber(),
      closingCredit: money(closingCredit).round(2).toNumber(),
    });
  }

  rows.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

  const totals: ClosingBalanceTotals = {
    openingDebit: Money.sum(rows.map(r => money(r.openingDebit))).round(2).toNumber(),
    openingCredit: Money.sum(rows.map(r => money(r.openingCredit))).round(2).toNumber(),
    movementDebit: Money.sum(rows.map(r => money(r.movementDebit))).round(2).toNumber(),
    movementCredit: Money.sum(rows.map(r => money(r.movementCredit))).round(2).toNumber(),
    closingDebit: Money.sum(rows.map(r => money(r.closingDebit))).round(2).toNumber(),
    closingCredit: Money.sum(rows.map(r => money(r.closingCredit))).round(2).toNumber(),
  };

  const country = resolveOhadaCountry(meta.countryInput);
  const balanced = money(totals.closingDebit).equals(money(totals.closingCredit), 1);

  const result: ClosingBalance = {
    fiscalYearId: meta.fiscalYearId,
    fiscalYearLabel: meta.fiscalYearLabel,
    startDate: range.startDate,
    endDate: range.endDate,
    countryCode: country?.code,
    countryName: country?.nameFr,
    zone: country?.zone,
    currency: country?.currency ?? 'XOF',
    state: 'after_inventory_before_appropriation',
    rows,
    totals,
    balanced,
  };

  // Empreinte : scelle la balance transmise (Liass'Pilot peut la vérifier).
  const canonical = JSON.stringify({
    fy: meta.fiscalYearId ?? '',
    end: range.endDate ?? '',
    rows: rows.map(r => [r.accountCode, r.closingDebit, r.closingCredit]),
  });
  result.integrityHash = await sha256Hex(canonical);

  return result;
}

/** Export CSV de la balance de clôture (séparateur point-virgule, en-tête FR). */
export function closingBalanceToCSV(balance: ClosingBalance): string {
  const head = [
    'Compte', 'Libellé',
    'Ouverture débit', 'Ouverture crédit',
    'Mouvements débit', 'Mouvements crédit',
    'Solde débit', 'Solde crédit',
  ].join(';');
  const lines = balance.rows.map(r =>
    [
      r.accountCode, `"${r.accountName.replace(/"/g, '""')}"`,
      r.openingDebit, r.openingCredit,
      r.movementDebit, r.movementCredit,
      r.closingDebit, r.closingCredit,
    ].join(';'),
  );
  const total = [
    'TOTAL', '',
    balance.totals.openingDebit, balance.totals.openingCredit,
    balance.totals.movementDebit, balance.totals.movementCredit,
    balance.totals.closingDebit, balance.totals.closingCredit,
  ].join(';');
  return [head, ...lines, total].join('\n');
}
