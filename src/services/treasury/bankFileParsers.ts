/**
 * Parseurs de relevés bancaires standards — Vague C (C1).
 *
 * Réf. docs/... (banque & mobile money)
 *
 * Produit le MÊME `BankTransaction[]` que le rapprochement consomme déjà
 * (rapprochementBancaireService) : on branche de nouveaux formats EN AMONT, et
 * tout l'aval (matching automatique, état de rapprochement, persistance) marche
 * sans modification.
 *
 * Formats couverts :
 *   - MT940   : relevé SWIFT (tags :20: :25: :60F: :61: :86: :62F:)
 *   - CAMT.053: ISO 20022 XML (le standard moderne des banques)
 *   - OFX     : Open Financial Exchange (agrégateurs, banques en ligne)
 *   - CSV     : délégué au parseur existant (parseBankStatementCSV)
 *
 * Convention de signe (identique à BankTransaction) :
 *   montant POSITIF = crédit banque (entrée de fonds)
 *   montant NÉGATIF = débit banque (sortie de fonds)
 */

import type { BankTransaction } from '../rapprochementBancaireService';
import { parseBankStatementCSV } from '../rapprochementBancaireService';
import { money } from '../../utils/money';

export type BankFileFormat = 'mt940' | 'camt053' | 'ofx' | 'csv' | 'unknown';

export interface ParsedStatement {
  format: BankFileFormat;
  account?: string;
  currency?: string;
  openingBalance?: number;
  closingBalance?: number;
  periodStart?: string;
  periodEnd?: string;
  transactions: BankTransaction[];
  /** Anomalies non bloquantes (ligne ignorée, solde absent…). */
  warnings: string[];
}

// ============================================================================
// AUTO-DÉTECTION
// ============================================================================

/**
 * Détecte le format d'un fichier de relevé à partir de son contenu (et, en
 * secours, de son extension). Le contenu prime : une extension .txt peut
 * cacher un MT940 comme un CSV.
 */
export function detectBankFormat(content: string, fileName?: string): BankFileFormat {
  const head = content.slice(0, 4096);

  // CAMT.053 : XML ISO 20022.
  if (/<Document[\s>]/.test(head) && /BkToCstmrStmt|camt\.053/.test(head)) return 'camt053';
  // OFX : en-tête OFXHEADER ou balise <OFX>.
  if (/OFXHEADER|<OFX>/.test(head)) return 'ofx';
  // MT940 : présence des tags SWIFT caractéristiques.
  if (/(^|\n):20:/.test(head) && /(^|\n):61:/.test(content)) return 'mt940';

  const ext = (fileName ?? '').toLowerCase().split('.').pop();
  if (ext === 'xml') return 'camt053';
  if (ext === 'ofx' || ext === 'qfx') return 'ofx';
  if (ext === 'sta' || ext === 'mt940') return 'mt940';
  if (ext === 'csv' || ext === 'txt') return 'csv';

  // Repli : un contenu à séparateurs ressemble à du CSV.
  if (/[;,\t].*[;,\t]/.test(head)) return 'csv';
  return 'unknown';
}

/**
 * Point d'entrée unique : détecte le format et parse.
 * Retourne toujours un ParsedStatement (transactions vides + warning si échec).
 */
export function parseBankFile(content: string, fileName?: string): ParsedStatement {
  const format = detectBankFormat(content, fileName);
  switch (format) {
    case 'mt940': return parseMT940(content);
    case 'camt053': return parseCAMT053(content);
    case 'ofx': return parseOFX(content);
    case 'csv': return {
      format: 'csv',
      transactions: parseBankStatementCSV(content),
      warnings: [],
    };
    default:
      return {
        format: 'unknown',
        transactions: [],
        warnings: ['Format de relevé non reconnu (ni MT940, ni CAMT.053, ni OFX, ni CSV).'],
      };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

let seq = 0;
function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

/** Nombre depuis une chaîne à virgule décimale (MT940) ou point (OFX). */
function toNumber(raw: string): number {
  const cleaned = raw.trim().replace(/\s/g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? money(n).round(2).toNumber() : 0;
}

/** YYMMDD → YYYY-MM-DD (fenêtre 2000-2099). */
function fromYYMMDD(s: string): string {
  if (!/^\d{6}$/.test(s)) return '';
  return `20${s.slice(0, 2)}-${s.slice(2, 4)}-${s.slice(4, 6)}`;
}

/** YYYYMMDD (ou plus long) → YYYY-MM-DD. */
function fromYYYYMMDD(s: string): string {
  const d = s.slice(0, 8);
  if (!/^\d{8}$/.test(d)) return '';
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

// ============================================================================
// MT940 (SWIFT)
// ============================================================================

export function parseMT940(content: string): ParsedStatement {
  const warnings: string[] = [];
  const transactions: BankTransaction[] = [];
  let account: string | undefined;
  let currency: string | undefined;
  let openingBalance: number | undefined;
  let closingBalance: number | undefined;
  let periodStart: string | undefined;
  let periodEnd: string | undefined;

  // Recolle les lignes de continuation : un tag court sur plusieurs lignes
  // physiques (fréquent sur :86:). Un nouveau tag commence par « :NN: ».
  const rawLines = content.replace(/\r/g, '').split('\n');
  const logical: string[] = [];
  for (const line of rawLines) {
    if (/^:\d{2}[A-Z]?:/.test(line)) logical.push(line);
    else if (logical.length > 0) logical[logical.length - 1] += ' ' + line.trim();
  }

  let pending: BankTransaction | null = null;

  const pushPending = () => {
    if (pending) {
      transactions.push(pending);
      pending = null;
    }
  };

  for (const line of logical) {
    const m = line.match(/^:(\d{2}[A-Z]?):(.*)$/);
    if (!m) continue;
    const tag = m[1];
    const value = m[2].trim();

    if (tag === '25') {
      account = value.split('/').pop()?.trim() || value;
    } else if (tag === '60F' || tag === '60M') {
      const b = parseBalanceTag(value);
      openingBalance = b.amount;
      currency = currency ?? b.currency;
      periodStart = periodStart ?? b.date;
    } else if (tag === '62F' || tag === '62M') {
      const b = parseBalanceTag(value);
      closingBalance = b.amount;
      periodEnd = b.date;
    } else if (tag === '61') {
      pushPending();
      const parsed = parseStatementLine61(value);
      if (!parsed) {
        warnings.push(`Ligne :61: non interprétable : « ${value.slice(0, 40)} »`);
        continue;
      }
      pending = {
        id: nextId('mt940'),
        date: parsed.entryDate || parsed.valueDate,
        valueDate: parsed.valueDate,
        label: '',
        reference: parsed.reference,
        amount: parsed.amount,
      };
    } else if (tag === '86' && pending) {
      // Narratif : nettoie les sous-champs SWIFT (?20?…?29?) en texte lisible.
      pending.label = value.replace(/\?\d{2}/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }
  pushPending();

  if (openingBalance === undefined) warnings.push('Solde d’ouverture (:60F:) absent.');
  if (closingBalance === undefined) warnings.push('Solde de clôture (:62F:) absent.');

  return {
    format: 'mt940',
    account, currency, openingBalance, closingBalance, periodStart, periodEnd,
    transactions, warnings,
  };
}

/** :60F:/:62F: → C/D + YYMMDD + CCY + montant (virgule décimale). */
function parseBalanceTag(value: string): { amount: number; currency: string; date: string } {
  const m = value.match(/^([CD])(\d{6})([A-Z]{3})([\d.,]+)/);
  if (!m) return { amount: 0, currency: '', date: '' };
  const sign = m[1] === 'D' ? -1 : 1;
  return {
    amount: money(toNumber(m[4])).multiply(sign).toNumber(),
    currency: m[3],
    date: fromYYMMDD(m[2]),
  };
}

/**
 * :61: ValueDate(YYMMDD) [EntryDate(MMDD)] C/D/RC/RD Amount TxType//Ref
 * Le montant utilise la virgule décimale ; le crédit banque = C (positif).
 */
function parseStatementLine61(
  value: string,
): { valueDate: string; entryDate: string; amount: number; reference: string } | null {
  const m = value.match(/^(\d{6})(\d{4})?(RC|RD|C|D)([A-Z])?([\d.,]+)/);
  if (!m) return null;
  const valueDate = fromYYMMDD(m[1]);
  let entryDate = '';
  if (m[2]) {
    // EntryDate = MMDD, année reprise du ValueDate.
    entryDate = `${valueDate.slice(0, 4)}-${m[2].slice(0, 2)}-${m[2].slice(2, 4)}`;
  }
  const dc = m[3];
  const credit = dc === 'C' || dc === 'RC';
  const amount = money(toNumber(m[5])).multiply(credit ? 1 : -1).toNumber();
  const refMatch = value.match(/\/\/(\S+)/) || value.match(/NONREF|([A-Z0-9]{6,})\s*$/);
  const reference = refMatch ? (refMatch[1] ?? refMatch[0]) : '';
  return { valueDate, entryDate, amount, reference };
}

// ============================================================================
// CAMT.053 (ISO 20022 XML)
// ============================================================================

export function parseCAMT053(content: string): ParsedStatement {
  const warnings: string[] = [];
  const transactions: BankTransaction[] = [];

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(content, 'application/xml');
  } catch {
    return { format: 'camt053', transactions: [], warnings: ['XML CAMT.053 illisible.'] };
  }
  if (doc.getElementsByTagName('parsererror').length > 0) {
    return { format: 'camt053', transactions: [], warnings: ['XML CAMT.053 mal formé.'] };
  }

  // getElementsByTagName ignore les préfixes de namespace : robuste aux variantes.
  const local = (parent: Element | Document, name: string): Element[] =>
    Array.from(parent.getElementsByTagName('*')).filter(
      el => el.localName === name || el.tagName === name || el.tagName.endsWith(':' + name),
    ) as Element[];

  const text = (parent: Element, name: string): string => {
    const el = local(parent, name)[0];
    return el?.textContent?.trim() ?? '';
  };

  const stmt = local(doc, 'Stmt')[0];
  if (!stmt) {
    return { format: 'camt053', transactions: [], warnings: ['Aucun élément Stmt dans le CAMT.053.'] };
  }

  const acctEl = local(stmt, 'Acct')[0];
  const account = acctEl ? (text(acctEl, 'IBAN') || text(acctEl, 'Id')) : undefined;
  const currency = acctEl ? text(acctEl, 'Ccy') || undefined : undefined;

  // Soldes : Bal avec Tp/CdOrPrtry/Cd = OPBD (ouverture) / CLBD (clôture).
  let openingBalance: number | undefined;
  let closingBalance: number | undefined;
  for (const bal of local(stmt, 'Bal')) {
    const code = text(bal, 'Cd');
    const amt = toNumber(text(bal, 'Amt'));
    const ind = text(bal, 'CdtDbtInd');
    const signed = money(amt).multiply(ind === 'DBIT' ? -1 : 1).toNumber();
    if (code === 'OPBD' || code === 'PRCD') openingBalance = signed;
    if (code === 'CLBD') closingBalance = signed;
  }

  for (const ntry of local(stmt, 'Ntry')) {
    const amt = toNumber(text(ntry, 'Amt'));
    const ind = text(ntry, 'CdtDbtInd'); // CRDT = entrée, DBIT = sortie
    const amount = money(amt).multiply(ind === 'DBIT' ? -1 : 1).toNumber();

    const bookg = local(ntry, 'BookgDt')[0];
    const valDt = local(ntry, 'ValDt')[0];
    const date = bookg ? (text(bookg, 'Dt') || text(bookg, 'DtTm')).slice(0, 10) : '';
    const valueDate = valDt ? (text(valDt, 'Dt') || text(valDt, 'DtTm')).slice(0, 10) : undefined;

    // Libellé : RmtInf/Ustrd sinon AddtlNtryInf ; référence : AcctSvcrRef/EndToEndId.
    const label =
      text(ntry, 'Ustrd') || text(ntry, 'AddtlNtryInf') || text(ntry, 'AddtlTxInf') || '';
    const reference = text(ntry, 'AcctSvcrRef') || text(ntry, 'EndToEndId') || text(ntry, 'TxId') || '';

    transactions.push({
      id: nextId('camt'),
      date: date || valueDate || '',
      valueDate,
      label: label.replace(/\s+/g, ' ').trim(),
      reference: reference || undefined,
      amount,
    });
  }

  return {
    format: 'camt053',
    account, currency, openingBalance, closingBalance,
    periodStart: transactions[0]?.date,
    periodEnd: transactions[transactions.length - 1]?.date,
    transactions, warnings,
  };
}

// ============================================================================
// OFX (SGML/XML)
// ============================================================================

export function parseOFX(content: string): ParsedStatement {
  const warnings: string[] = [];
  const transactions: BankTransaction[] = [];

  // OFX est du SGML : les balises ne sont pas toujours fermées. On lit par
  // regex plutôt que par un parseur XML strict, qui échouerait.
  const field = (block: string, tag: string): string => {
    const m = block.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i'));
    return m ? m[1].trim() : '';
  };

  const currency = field(content, 'CURDEF') || undefined;
  const account = field(content, 'ACCTID') || undefined;

  const blocks = content.split(/<STMTTRN>/i).slice(1);
  for (const raw of blocks) {
    const block = raw.split(/<\/STMTTRN>/i)[0];
    const amountRaw = field(block, 'TRNAMT');
    if (!amountRaw) continue;
    // OFX : montant DÉJÀ signé (négatif = débit banque) → convention identique.
    const amount = toNumber(amountRaw);
    const date = fromYYYYMMDD(field(block, 'DTPOSTED'));
    const reference = field(block, 'FITID') || undefined;
    const name = field(block, 'NAME');
    const memo = field(block, 'MEMO');
    const label = [name, memo].filter(Boolean).join(' — ') || field(block, 'TRNTYPE');

    transactions.push({
      id: nextId('ofx'),
      date,
      label,
      reference,
      amount,
    });
  }

  let closingBalance: number | undefined;
  const ledger = content.match(/<LEDGERBAL>([\s\S]*?)<\/LEDGERBAL>/i);
  if (ledger) {
    const bal = field(ledger[1], 'BALAMT');
    if (bal) closingBalance = toNumber(bal);
  }
  if (transactions.length === 0) warnings.push('Aucune transaction <STMTTRN> trouvée dans l’OFX.');

  return {
    format: 'ofx',
    account, currency, closingBalance,
    periodStart: transactions[0]?.date,
    periodEnd: transactions[transactions.length - 1]?.date,
    transactions, warnings,
  };
}
