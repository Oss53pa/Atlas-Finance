/**
 * Guard central — Toute insertion d'écriture comptable passe par ici.
 *
 * Garantit :
 * 1. totalDebit / totalCredit toujours calculés (Money class)
 * 2. Validation D=C via validateJournalEntrySync (Money precision)
 * 3. Hash d'intégrité SHA-256 avec chaînage
 * 4. updatedAt toujours présent
 * 5. Verrou de clôture (intangibilité SYSCOHADA Art. 19)
 *
 * ⚠️ PERFORMANCE — prérequis de l'ossature d'intégration (L0)
 * La version précédente chargeait TOUT le journal (`getAll('journalEntries')`,
 * lignes incluses : 10 319 lignes) à CHAQUE écriture, puis bouclait dessus pour
 * le contrôle caisse : O(n·m) par insertion. Invisible en saisie manuelle,
 * mur absolu dès qu'un satellite (Trade/Procure/People) déverse des centaines
 * d'écritures par jour.
 *
 * Désormais : requêtes bornées et indexées uniquement.
 *  - doublon de n° de pièce → contrainte UNIQUE(tenant_id, entry_number) en base
 *  - solde caisse 57x       → RPC get_single_account_balance (repli borné)
 *  - maillon de chaîne      → getAll(limit:1, orderBy date desc)
 */

import type { DataAdapter } from '@atlas/data';
import type { DBJournalEntry, DBFiscalYear } from '../lib/db';
import { money, Money } from '../utils/money';
import { validateJournalEntrySync, type ValidationResult } from '../validators/journalEntryValidator';
import { hashEntry, chainSalt } from '../utils/integrity';
import { getPeriodeStatus } from './periodeComptableService';

export class EntryGuardError extends Error {
  constructor(public errors: string[]) {
    super(errors.join(' | '));
    this.name = 'EntryGuardError';
  }
}

/**
 * Solde d'un compte exact (débit - crédit), écritures validées/postées.
 *
 * Chemin nominal : RPC serveur (une requête indexée).
 * Repli : adapter.getAccountBalance (RPC agrégée, mise en cache).
 * Dernier repli (adapters de test / Dexie sans RPC) : lecture du journal.
 * Le repli reste correct — il n'est simplement pas O(1).
 */
async function getAccountSolde(adapter: DataAdapter, accountCode: string): Promise<number> {
  // ⚠️ Uniquement en mode serveur : en local/test, `getAccountBalance` est un
  // stub qui renvoie 0 — s'y fier désactiverait SILENCIEUSEMENT le garde-fou
  // caisse. En local, le journal tient en mémoire : le scan est correct et bon
  // marché.
  if (adapter.getMode() !== 'local') {
    const rpc = (adapter as any).rpc;
    if (typeof rpc === 'function') {
      try {
        const v = await rpc.call(adapter, 'get_single_account_balance', {
          p_account: accountCode,
          p_include_drafts: true,
        });
        if (v !== null && v !== undefined && !Number.isNaN(Number(v))) return Number(v);
      } catch { /* RPC absente sur cet environnement → repli */ }
    }
  }

  // Repli (local/test, ou RPC indisponible) : scan du journal.
  // Brouillons INCLUS — même sémantique que la RPC appelée avec
  // p_include_drafts=true, pour que le guard se comporte à l'identique
  // en local et en SaaS.
  const entries = await adapter.getAll<DBJournalEntry>('journalEntries');
  let solde = 0;
  for (const e of entries) {
    for (const l of e.lines ?? []) {
      if (l.accountCode === accountCode) solde += (l.debit ?? 0) - (l.credit ?? 0);
    }
  }
  return solde;
}

/**
 * Dernier maillon de la chaîne de hash — requête bornée (1 ligne).
 *
 * ⚠️ L'injection des lignes de journal_lines est bornée aux ids retournés
 * côté SupabaseAdapter : sans ce garde-fou, ce `limit: 1` rapatriait quand
 * même les 10 319 lignes du journal.
 */
async function getLastEntryHash(adapter: DataAdapter): Promise<string> {
  try {
    const last = await adapter.getAll<DBJournalEntry>('journalEntries', {
      orderBy: { field: 'date', direction: 'desc' },
      limit: 1,
    });
    return last?.[0]?.hash ?? '';
  } catch {
    return '';
  }
}

/**
 * Insert une écriture dans Dexie avec validation obligatoire.
 * Lève EntryGuardError si l'écriture est déséquilibrée ou invalide.
 *
 * @param entry L'écriture à insérer (id, lines, etc.)
 * @param options.skipSyncValidation  true pour les écritures système (ex: extourne, clôture)
 *        dont l'équilibre est garanti par construction. La validation reste en place par
 *        défaut pour toute saisie utilisateur.
 */
export async function safeAddEntry(
  adapter: DataAdapter,
  entry: Omit<DBJournalEntry, 'totalDebit' | 'totalCredit' | 'hash' | 'updatedAt'> & {
    totalDebit?: number;
    totalCredit?: number;
    hash?: string;
    updatedAt?: string;
  },
  options: { skipSyncValidation?: boolean; allowClosedPeriod?: boolean } = {},
): Promise<string> {
  const lines = entry.lines ?? [];

  // --- Verrou de clôture (intangibilité SYSCOHADA Art. 19) ---
  // Appliqué à TOUTES les écritures (imports, trésorerie, immo, saisie…), et
  // non plus au seul modal manuel. Les écritures SYSTÈME de clôture (résultat,
  // affectation, à-nouveaux, extourne) passent explicitement allowClosedPeriod.
  if (!options.allowClosedPeriod && entry.date) {
    const fiscalYears = await adapter.getAll<DBFiscalYear>('fiscalYears');
    const fy = fiscalYears.find(f => entry.date >= f.startDate && entry.date <= f.endDate);
    if (fy?.isClosed) {
      throw new EntryGuardError([`Exercice clôturé « ${fy.name} » (${fy.startDate} → ${fy.endDate}) — écriture impossible au ${entry.date}.`]);
    }
    const periodStatus = await getPeriodeStatus(adapter, entry.date);
    if (periodStatus === 'closed' || periodStatus === 'locked') {
      throw new EntryGuardError([`Période du ${entry.date} clôturée/verrouillée — écriture impossible.`]);
    }
  }

  // 1. Compute totalDebit / totalCredit with Money class
  const totalDebit = Money.sum(lines.map(l => money(l.debit))).toNumber();
  const totalCredit = Money.sum(lines.map(l => money(l.credit))).toNumber();

  // 2. Sync validation (unless explicitly skipped for system entries)
  if (!options.skipSyncValidation) {
    const result: ValidationResult = validateJournalEntrySync(
      lines.map(l => ({ accountCode: l.accountCode, debit: l.debit, credit: l.credit })),
    );
    if (!result.isValid) {
      throw new EntryGuardError(result.errors);
    }
  }

  // P1-7 : unicité du numéro de pièce.
  // Le scan applicatif (getAll + find) est remplacé par une requête BORNÉE.
  // La garantie DURE reste la contrainte UNIQUE(tenant_id, entry_number) en
  // base : sous concurrence, seule la base peut arbitrer. Ce contrôle sert à
  // produire un message d'erreur lisible avant l'aller-retour serveur.
  if (entry.entryNumber) {
    const sameNumber = await adapter.getAll<DBJournalEntry>('journalEntries', {
      where: { entryNumber: entry.entryNumber },
      limit: 2,
    });
    const duplicate = sameNumber.find(e => e.id !== entry.id);
    if (duplicate) {
      throw new EntryGuardError([
        `Doublon détecté : le numéro de pièce "${entry.entryNumber}" existe déjà (écriture ${duplicate.id}).`,
      ]);
    }
  }

  // P4-2 : contrôle caisse >= 0 — les comptes 57x ne peuvent pas devenir négatifs.
  // Un solde par compte via RPC indexée, au lieu d'une double boucle sur tout
  // le journal. Les comptes distincts sont dédupliqués et interrogés en parallèle.
  const caisseAccounts = [
    ...new Set(lines.filter(l => l.accountCode.startsWith('57') && l.credit > 0).map(l => l.accountCode)),
  ];
  if (caisseAccounts.length > 0) {
    const soldes = await Promise.all(caisseAccounts.map(code => getAccountSolde(adapter, code)));
    caisseAccounts.forEach((code, i) => {
      const impact = Money.sum(
        lines.filter(l => l.accountCode === code).map(l => money(l.debit).subtract(l.credit)),
      ).toNumber();
      const soldeFutur = money(soldes[i]).add(impact).toNumber();
      if (soldeFutur < 0) {
        throw new EntryGuardError([
          `Solde caisse négatif interdit : le compte ${code} aurait un solde de ${soldeFutur} après cette opération (solde actuel : ${soldes[i]}).`,
        ]);
      }
    });
  }

  // 3. Build final entry
  const now = new Date().toISOString();
  const finalEntry: DBJournalEntry = {
    ...entry,
    totalDebit,
    totalCredit,
    updatedAt: entry.updatedAt ?? now,
    createdAt: entry.createdAt ?? now,
    hash: '', // placeholder — overwritten below
  } as DBJournalEntry;

  // Garantir un id d'entête et un id par ligne (les lignes vivent dans la table
  // SÉPARÉE journal_lines ; chaque ligne doit avoir son propre id).
  finalEntry.id = finalEntry.id ?? crypto.randomUUID();
  if (Array.isArray(finalEntry.lines)) {
    finalEntry.lines = finalEntry.lines.map((l: any) => ({ ...l, id: l.id ?? crypto.randomUUID() }));
  }

  // 4. Chaîne de hash — dernier maillon récupéré par requête bornée (1 ligne),
  // et non plus par tri applicatif de tout le journal.
  //
  // L7 : quand l'écriture provient d'un satellite, l'empreinte du payload de
  // l'événement source entre dans le hash. La preuve devient opposable de bout
  // en bout : le GL scelle le document d'origine, pas seulement son écriture.
  const previousHash = await getLastEntryHash(adapter);
  finalEntry.previousHash = previousHash;
  finalEntry.hash = await hashEntry(
    finalEntry,
    chainSalt(previousHash, finalEntry.sourcePayloadHash),
  );

  // 5. Persist — via saveJournalEntry qui écrit l'entête ET les lignes dans la table
  // SÉPARÉE journal_lines (RPC atomique + trigger d'équilibre en SaaS). L'ancien
  // adapter.create embarquait `lines` dans journal_entries (colonne inexistante) →
  // l'insert échouait / l'écriture était perdue en production SaaS.
  const saved = await adapter.saveJournalEntry(finalEntry as any);
  (adapter as any).invalidateCache?.();
  return (saved as any)?.id ?? finalEntry.id;
}

/**
 * Insert multiple entries in bulk, each validated individually.
 */
export async function safeBulkAddEntries(
  adapter: DataAdapter,
  entries: Array<
    Omit<DBJournalEntry, 'totalDebit' | 'totalCredit' | 'hash' | 'updatedAt'> & {
      totalDebit?: number;
      totalCredit?: number;
      hash?: string;
      updatedAt?: string;
    }
  >,
  options: { skipSyncValidation?: boolean; allowClosedPeriod?: boolean } = {},
): Promise<string[]> {
  const ids: string[] = [];
  // Sequential to maintain hash chain ordering
  for (const entry of entries) {
    const id = await safeAddEntry(adapter, entry, options);
    ids.push(id);
  }
  return ids;
}
