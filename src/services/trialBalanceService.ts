/**
 * Service de vérification de la balance de vérification (balance générale).
 *
 * Contrôles effectués :
 * 1. Somme des débits = Somme des crédits (toutes écritures)
 * 2. Actif = Passif (classes bilan 1-5)
 * 3. Numéros de pièce séquentiels (détection de trous)
 * 4. Cohérence des écritures (D=C par écriture)
 *
 * Conforme SYSCOHADA — balance de vérification obligatoire avant clôture.
 */

import type { DataAdapter } from '@atlas/data';
import type { DBJournalEntry } from '../lib/db';
import { money, Money } from '../utils/money';

// ============================================================================
// TYPES
// ============================================================================

export interface TrialBalanceCheck {
  name: string;
  description: string;
  status: 'pass' | 'fail' | 'warning';
  details: string;
  ecart?: number;
}

export interface TrialBalanceResult {
  checks: TrialBalanceCheck[];
  isBalanced: boolean;
  totalDebits: number;
  totalCredits: number;
  ecartGlobal: number;
  entriesChecked: number;
  unbalancedEntries: Array<{ id: string; entryNumber: string; ecart: number }>;
}

// ============================================================================
// MAIN VERIFICATION
// ============================================================================

/**
 * Run full trial balance verification.
 */
export async function verifyTrialBalance(adapter: DataAdapter, fiscalYear?: string): Promise<TrialBalanceResult> {
  let entries = await adapter.getAll('journalEntries');

  // Filter by fiscal year if specified
  if (fiscalYear) {
    entries = entries.filter(e => e.date.startsWith(fiscalYear));
  }

  const checks: TrialBalanceCheck[] = [];
  const unbalancedEntries: Array<{ id: string; entryNumber: string; ecart: number }> = [];

  // ---- CHECK 1: Global D = C ----
  let globalDebit = money(0);
  let globalCredit = money(0);

  for (const entry of entries) {
    for (const line of entry.lines) {
      globalDebit = globalDebit.add(money(line.debit));
      globalCredit = globalCredit.add(money(line.credit));
    }
  }

  const ecartGlobal = globalDebit.subtract(globalCredit).toNumber();

  checks.push({
    name: 'Equilibre global D = C',
    description: 'Somme de tous les débits = Somme de tous les crédits',
    status: ecartGlobal === 0 ? 'pass' : 'fail',
    details: ecartGlobal === 0
      ? `Équilibré : ${globalDebit.toNumber()} FCFA`
      : `Écart de ${ecartGlobal} FCFA (Débits: ${globalDebit.toNumber()}, Crédits: ${globalCredit.toNumber()})`,
    ecart: ecartGlobal,
  });

  // ---- CHECK 2: Each entry balanced ----
  for (const entry of entries) {
    const d = Money.sum(entry.lines.map(l => money(l.debit)));
    const c = Money.sum(entry.lines.map(l => money(l.credit)));
    const ecart = d.subtract(c).toNumber();
    if (ecart !== 0) {
      unbalancedEntries.push({ id: entry.id, entryNumber: entry.entryNumber, ecart });
    }
  }

  checks.push({
    name: 'Écritures individuelles équilibrées',
    description: 'Chaque écriture doit avoir D = C',
    status: unbalancedEntries.length === 0 ? 'pass' : 'fail',
    details: unbalancedEntries.length === 0
      ? `Toutes les ${entries.length} écritures sont équilibrées`
      : `${unbalancedEntries.length} écriture(s) déséquilibrée(s) : ${unbalancedEntries.map(e => e.entryNumber).join(', ')}`,
  });

  // ---- CHECK 3: Actif = Passif (bilan) ----
  let actif = money(0);  // Classes 2-5 débiteurs
  let passif = money(0); // Classes 1 + 4 créditeurs

  for (const entry of entries) {
    for (const line of entry.lines) {
      const cls = line.accountCode.charAt(0);
      const net = line.debit - line.credit;

      if (cls === '2' || cls === '3' || cls === '5') {
        actif = actif.add(money(net));
      } else if (cls === '1') {
        passif = passif.add(money(-net)); // Credit balance = positive passif
      } else if (cls === '4') {
        // Class 4: tiers — 40x fournisseurs (passif), 41x clients (actif)
        if (line.accountCode.startsWith('40')) {
          passif = passif.add(money(-net));
        } else if (line.accountCode.startsWith('41')) {
          actif = actif.add(money(net));
        }
      }
    }
  }

  // Add result (class 6-7) to passif
  let resultat = money(0);
  for (const entry of entries) {
    for (const line of entry.lines) {
      const cls = line.accountCode.charAt(0);
      if (cls === '7') resultat = resultat.add(money(line.credit - line.debit));
      if (cls === '6') resultat = resultat.subtract(money(line.debit - line.credit));
    }
  }
  passif = passif.add(resultat);

  const bilanEcart = actif.subtract(passif).toNumber();
  checks.push({
    name: 'Actif = Passif',
    description: 'Vérification de l\'équilibre du bilan',
    status: Math.abs(bilanEcart) <= 1 ? 'pass' : 'fail',
    details: Math.abs(bilanEcart) <= 1
      ? `Bilan équilibré : Actif = ${actif.toNumber()} FCFA`
      : `Écart bilan : ${bilanEcart} FCFA (Actif: ${actif.toNumber()}, Passif: ${passif.toNumber()})`,
    ecart: bilanEcart,
  });

  // ---- CHECK 4: Sequential piece numbers ----
  const byJournal = new Map<string, string[]>();
  for (const entry of entries) {
    const list = byJournal.get(entry.journal) || [];
    list.push(entry.entryNumber);
    byJournal.set(entry.journal, list);
  }

  let gaps = 0;
  const gapDetails: string[] = [];
  for (const [journal, numbers] of byJournal) {
    const nums = numbers
      .map(n => parseInt(n.split('-')[1] || '0', 10))
      .filter(n => !isNaN(n))
      .sort((a, b) => a - b);

    for (let i = 1; i < nums.length; i++) {
      if (nums[i] - nums[i - 1] > 1) {
        gaps++;
        gapDetails.push(`${journal}: trou entre ${nums[i - 1]} et ${nums[i]}`);
      }
    }
  }

  checks.push({
    name: 'Numérotation séquentielle',
    description: 'Vérification de la continuité des numéros de pièce',
    status: gaps === 0 ? 'pass' : 'warning',
    details: gaps === 0
      ? `Pas de trou de numérotation sur ${byJournal.size} journal(aux)`
      : `${gaps} trou(s) détecté(s) : ${gapDetails.slice(0, 5).join(', ')}${gapDetails.length > 5 ? '...' : ''}`,
  });

  // ---- CHECK 5: Entries count by status ----
  const statusCount = { draft: 0, validated: 0, posted: 0 };
  for (const entry of entries) {
    if (entry.status in statusCount) statusCount[entry.status as keyof typeof statusCount]++;
  }

  checks.push({
    name: 'Statut des écritures',
    description: 'Répartition des écritures par statut',
    status: statusCount.draft === 0 ? 'pass' : 'warning',
    details: `${statusCount.posted} comptabilisées, ${statusCount.validated} validées, ${statusCount.draft} brouillons`,
  });

  const isBalanced = checks.every(c => c.status !== 'fail');

  return {
    checks,
    isBalanced,
    totalDebits: globalDebit.toNumber(),
    totalCredits: globalCredit.toNumber(),
    ecartGlobal,
    entriesChecked: entries.length,
    unbalancedEntries,
  };
}
