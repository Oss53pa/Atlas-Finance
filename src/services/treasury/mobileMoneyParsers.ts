/**
 * Parseurs Mobile Money — Vague C (C2).
 *
 * En Afrique de l'Ouest, Wave / Orange Money / MTN MoMo / Moov Money SONT la
 * trésorerie des TPE/PME. Leur relevé est un fichier CSV/Excel aux colonnes
 * propres à chaque opérateur, avec deux particularités que le rapprochement
 * bancaire classique ignore :
 *
 *   1. des FRAIS (commission opérateur) sur presque chaque opération — un
 *      mouvement RÉEL du portefeuille, à comptabiliser en charge (631x) ;
 *   2. un tiers identifié par un NUMÉRO DE TÉLÉPHONE, pas un IBAN.
 *
 * Ce module produit le même `BankTransaction[]` que le rapprochement consomme
 * déjà : le portefeuille mobile money est traité comme un compte de trésorerie
 * (classe 5), et les frais deviennent une transaction séparée (débit) — ainsi
 * le solde et le rapprochement restent cohérents sans logique spéciale en aval.
 */

import type { BankTransaction } from '../rapprochementBancaireService';
import { money } from '../../utils/money';
import type { ParsedStatement } from './bankFileParsers';

export type MobileMoneyProvider = 'wave' | 'orange_money' | 'mtn_momo' | 'moov_money' | 'generic';

export interface MobileMoneyParseResult extends ParsedStatement {
  provider: MobileMoneyProvider;
  /** Total des frais opérateur extraits comme transactions séparées. */
  totalFees: number;
}

export const PROVIDER_LABELS: Record<MobileMoneyProvider, string> = {
  wave: 'Wave',
  orange_money: 'Orange Money',
  mtn_momo: 'MTN MoMo',
  moov_money: 'Moov Money',
  generic: 'Mobile Money',
};

// ============================================================================
// CSV → lignes (gère les guillemets et la détection de séparateur)
// ============================================================================

function detectDelimiter(sample: string): string {
  const counts: Record<string, number> = {
    ',': (sample.match(/,/g) || []).length,
    ';': (sample.match(/;/g) || []).length,
    '\t': (sample.match(/\t/g) || []).length,
  };
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] || ',';
}

function parseCsvRows(content: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  const text = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); field = '';
      if (row.some(f => f.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.some(f => f.trim() !== '')) rows.push(row);
  }
  return rows;
}

// ============================================================================
// DÉTECTION DE L'OPÉRATEUR
// ============================================================================

export function detectMobileMoneyProvider(content: string): MobileMoneyProvider {
  // Normalise les séparateurs (_ - . /) en espaces : un nom de fichier comme
  // « wave_releve.csv » ne doit pas casser la reconnaissance du mot « wave ».
  const head = content.slice(0, 2048).toLowerCase().replace(/[_\-./]/g, ' ');
  if (/\bwave\b/.test(head)) return 'wave';
  if (/\borange\b/.test(head)) return 'orange_money';
  if (/\bmtn\b|\bmomo\b/.test(head)) return 'mtn_momo';
  if (/\bmoov\b/.test(head)) return 'moov_money';
  return 'generic';
}

// ============================================================================
// MAPPING DES COLONNES (aliases FR/EN, tolérant aux variantes d'export)
// ============================================================================

const COLUMN_ALIASES: Record<string, string[]> = {
  date: ['date', 'date operation', "date de l'operation", 'transaction date', 'date/heure', 'datetime'],
  type: ['type', 'type de transaction', 'transaction type', 'operation', 'categorie', 'category'],
  amount: ['montant', 'amount', 'montant operation', 'transaction amount', 'valeur'],
  fee: ['frais', 'fee', 'fees', 'commission', 'frais de transaction'],
  balance: ['solde', 'balance', 'nouveau solde', 'solde apres'],
  reference: ['reference', 'ref', 'transaction id', 'id transaction', 'identifiant', 'txid'],
  counterparty: ['numero', 'numero de telephone', 'telephone', 'counterparty', 'destinataire', 'expediteur', 'beneficiaire', 'msisdn', 'phone'],
  sense: ['sens', 'debit/credit', 'direction', 'in/out'],
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9/ ]/g, '').replace(/\s+/g, ' ').trim();
}

function buildColumnMap(headers: string[]): Record<string, number> {
  const norm = headers.map(normalizeHeader);
  const map: Record<string, number> = {};
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (let i = 0; i < norm.length; i++) {
      if (aliases.includes(norm[i]) || aliases.some(a => norm[i] === a)) {
        map[field] = i;
        break;
      }
    }
    // Repli : correspondance partielle (« montant xof » contient « montant »).
    if (map[field] === undefined) {
      for (let i = 0; i < norm.length; i++) {
        if (aliases.some(a => norm[i].includes(a))) { map[field] = i; break; }
      }
    }
  }
  return map;
}

// ============================================================================
// SENS D'UNE OPÉRATION
// ============================================================================

// Types qui font ENTRER de l'argent dans le portefeuille (crédit, positif).
const CREDIT_TYPES = /depot|cash.?in|recu|receive|received|credit|entrant|encaissement|reception|transfer.?in/i;
// Types qui font SORTIR de l'argent (débit, négatif).
const DEBIT_TYPES = /retrait|cash.?out|envoi|sent|send|paiement|payment|achat|debit|sortant|transfer.?out|withdraw/i;

function toAmount(raw: string): number {
  if (!raw) return 0;
  // Enlève devise, espaces insécables, séparateurs de milliers ; garde le signe.
  const cleaned = raw
    .replace(/[^\d,.\-]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '') // point = milliers
    .replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? money(n).round(2).toNumber() : 0;
}

function parseDate(raw: string): string {
  if (!raw) return '';
  const s = raw.trim();
  // ISO déjà bon.
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // DD/MM/YYYY ou DD-MM-YYYY.
  m = s.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return '';
}

// ============================================================================
// PARSE
// ============================================================================

export function parseMobileMoney(content: string, fileName?: string): MobileMoneyParseResult {
  const warnings: string[] = [];
  const provider = detectMobileMoneyProvider(content + ' ' + (fileName ?? ''));
  const delimiter = detectDelimiter(content.slice(0, 4096));
  const rows = parseCsvRows(content, delimiter);

  if (rows.length < 2) {
    return { format: 'csv', provider, transactions: [], totalFees: 0, warnings: ['Relevé mobile money vide ou sans en-tête.'] };
  }

  const cols = buildColumnMap(rows[0]);
  if (cols.amount === undefined || cols.date === undefined) {
    warnings.push('Colonnes « date » et « montant » introuvables — vérifier l’en-tête du relevé.');
    return { format: 'csv', provider, transactions: [], totalFees: 0, warnings };
  }

  const transactions: BankTransaction[] = [];
  let totalFees = money(0);
  let seq = 0;
  const nextId = () => `mm-${provider}-${++seq}`;

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const get = (f: string) => (cols[f] !== undefined ? (cells[cols[f]] ?? '').trim() : '');

    const date = parseDate(get('date'));
    if (!date) continue;

    const typeText = get('type');
    const rawAmount = toAmount(get('amount'));
    const senseHint = get('sense').toLowerCase();

    // Détermine le signe : signe explicite du montant > colonne sens > type.
    let amount: number;
    if (rawAmount !== 0 && (rawAmount < 0 || get('amount').trim().startsWith('-'))) {
      amount = rawAmount; // montant déjà signé
    } else if (CREDIT_TYPES.test(typeText) || /credit|in|entrant/.test(senseHint)) {
      amount = Math.abs(rawAmount);
    } else if (DEBIT_TYPES.test(typeText) || /debit|out|sortant/.test(senseHint)) {
      amount = -Math.abs(rawAmount);
    } else {
      // Indéterminé : on prend le montant tel quel et on prévient.
      amount = rawAmount;
      if (rawAmount !== 0) warnings.push(`Sens indéterminé pour l’opération « ${typeText || date} » — vérifier.`);
    }

    const counterparty = get('counterparty');
    const reference = get('reference') || undefined;
    const label = [PROVIDER_LABELS[provider], typeText, counterparty].filter(Boolean).join(' — ');

    transactions.push({
      id: nextId(),
      date,
      label,
      reference,
      amount,
      category: typeText || undefined,
    });

    // Frais : mouvement séparé (débit) → charge 631x en aval, solde cohérent.
    const fee = Math.abs(toAmount(get('fee')));
    if (fee > 0) {
      totalFees = totalFees.add(fee);
      transactions.push({
        id: nextId(),
        date,
        label: `Frais ${PROVIDER_LABELS[provider]}${reference ? ' — ' + reference : ''}`,
        reference,
        amount: -fee,
        category: 'frais',
      });
    }
  }

  return {
    format: 'csv',
    provider,
    currency: provider === 'mtn_momo' ? undefined : 'XOF',
    transactions,
    totalFees: totalFees.round(2).toNumber(),
    periodStart: transactions[0]?.date,
    periodEnd: transactions[transactions.length - 1]?.date,
    warnings,
  };
}

/**
 * Compte de charge par défaut pour les frais mobile money.
 * 6312 = « Frais sur effets et opérations bancaires » (SYSCOHADA) — famille
 * naturelle des commissions d'opérateur de paiement. Paramétrable en aval.
 */
export const MOBILE_MONEY_FEE_ACCOUNT = '631200';

/** Une transaction issue de ce module est-elle une ligne de frais ? */
export function isFeeTransaction(tx: BankTransaction): boolean {
  return tx.category === 'frais';
}

/**
 * Un fichier ressemble-t-il à un relevé mobile money ?
 *
 * Signal fort et conservateur pour router l'import sans se tromper sur un CSV
 * bancaire classique : soit un opérateur nommé explicitement, soit un en-tête
 * portant à la fois une colonne « frais/fee » ET une colonne « type ».
 */
export function looksLikeMobileMoney(content: string, fileName?: string): boolean {
  if (detectMobileMoneyProvider(content + ' ' + (fileName ?? '')) !== 'generic') return true;
  const header = content.slice(0, 1024).split(/\r?\n/)[0]?.toLowerCase() ?? '';
  const hasFee = /frais|fee|commission/.test(header);
  const hasType = /type|operation|transaction/.test(header);
  return hasFee && hasType;
}
