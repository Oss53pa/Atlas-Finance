/**
 * Comptabilisation d'une facture OCR → écriture comptable SYSCOHADA.
 *
 * Facture d'ACHAT (journal AC) — document reçu d'un fournisseur :
 *   DÉBIT  6xx  charge (HT)
 *   DÉBIT  4452 TVA récupérable
 *   CRÉDIT 401  fournisseur (TTC)
 *
 * Facture de VENTE (journal VE) — document émis vers un client :
 *   DÉBIT  411  client (TTC)
 *   CRÉDIT 70x  produit (HT)
 *   CRÉDIT 443  TVA collectée
 *
 * Le sens (achat/vente) vient de `data.direction` (choisi/corrigé dans l'UI) ou,
 * à défaut, de `detectInvoiceDirection` (comparaison de l'émetteur à l'identité
 * de la société). Un avoir (credit_note) inverse les sens.
 *
 * On force HT = TTC - TVA pour garantir D = C (le DexieAdapter rejette toute
 * écriture déséquilibrée). L'écriture est créée en BROUILLON (`draft`) : elle
 * arrive « à valider » dans le journal concerné et n'impacte la balance
 * qu'après validation par un comptable.
 */
import type { DataAdapter } from '@atlas/data';
import { logAudit } from '../../lib/db';
import type { DBJournalEntry, DBJournalLine } from '../../lib/db';
import { hashEntry } from '../../utils/integrity';
import type { ExtractedData, OCRConfig } from './types';

/** Identité de la société (source canonique settings.admin_company_legal). */
export interface CompanyIdentity {
  name?: string;
  taxId?: string;
}

/** Normalisation robuste pour comparer des noms (casse/accents/ponctuation). */
const norm = (s: string | undefined | null): string =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');

const digits = (s: string | undefined | null): string => (s || '').replace(/\D/g, '');

/**
 * Détermine le sens comptable d'une facture par comparaison de l'ÉMETTEUR
 * (supplier*) à l'identité de la société :
 *  - émetteur = nous  → facture émise → VENTE
 *  - sinon            → facture reçue → ACHAT
 * Sans identité société connue, on retombe sur ACHAT (comportement historique).
 */
export function detectInvoiceDirection(
  data: ExtractedData,
  company?: CompanyIdentity | null,
): 'purchase' | 'sale' {
  if (!company || (!company.name && !company.taxId)) return 'purchase';
  const cName = norm(company.name);
  const cTax = digits(company.taxId);

  const issuerName = norm(data.supplierName);
  const issuerTax = digits(data.supplierTaxId);

  // Correspondance forte par NIF/IFU, sinon par nom (inclusion tolérante).
  const taxMatch = !!cTax && cTax.length >= 4 && issuerTax === cTax;
  const nameMatch =
    !!cName && cName.length >= 4 && !!issuerName &&
    (issuerName.includes(cName) || cName.includes(issuerName));

  return taxMatch || nameMatch ? 'sale' : 'purchase';
}

interface ThirdPartyRow { code?: string; name?: string; taxId?: string; type?: string; accountCode?: string }

/**
 * Retrouve la FICHE tiers correspondant à l'émetteur/destinataire de la facture.
 *
 * POURQUOI : écrire seulement `thirdPartyName` laisse la ligne 401/411 sans
 * `thirdPartyCode` — elle devient invisible de toute vue par tiers (encours,
 * balance âgée, relances, lettrage) et casse la réconciliation sous-registre ↔
 * compte collectif. On rapproche par NIF/IFU (fort) puis par nom (tolérant).
 * Aucune fiche créée à la volée : en cas de doute on ne devine pas.
 */
async function resolveThirdPartyCode(
  adapter: DataAdapter,
  name: string,
  taxId: string | undefined,
  wanted: 'customer' | 'supplier',
): Promise<{ code: string; accountCode?: string } | null> {
  let rows: ThirdPartyRow[] = [];
  try {
    rows = await adapter.getAll<ThirdPartyRow>('thirdParties');
  } catch {
    return null; // fiches indisponibles → on comptabilise quand même (nom seul)
  }
  const candidates = rows.filter(r => !r.type || r.type === wanted);
  const tax = digits(taxId);
  if (tax.length >= 4) {
    const byTax = candidates.find(r => digits(r.taxId) === tax);
    if (byTax?.code) return { code: byTax.code, accountCode: byTax.accountCode };
  }
  const n = norm(name);
  if (n.length >= 4) {
    const byName = candidates.find(r => {
      const rn = norm(r.name);
      return rn.length >= 4 && (rn === n || rn.includes(n) || n.includes(rn));
    });
    if (byName?.code) return { code: byName.code, accountCode: byName.accountCode };
  }
  return null;
}

export async function createEntryFromInvoice(
  adapter: DataAdapter,
  data: ExtractedData,
  config: OCRConfig,
  opts?: { createdBy?: string; company?: CompanyIdentity | null },
): Promise<string> {
  const ttc = data.totalAmount > 0 ? data.totalAmount : data.subtotal + data.taxAmount;
  const tva = Math.min(Math.max(data.taxAmount, 0), ttc);
  const ht = Math.max(ttc - tva, 0);

  if (ttc <= 0) {
    throw new Error('Montant total introuvable ou nul : impossible de comptabiliser cette facture.');
  }

  const direction = data.direction || detectInvoiceDirection(data, opts?.company);
  const isSale = direction === 'sale';
  const isCreditNote = data.documentType === 'credit_note';

  const journal = isSale ? config.defaultSalesJournal : config.defaultJournal;

  // Numéro d'écriture séquentiel (préfixé par le journal choisi).
  const allEntries = await adapter.getAll<DBJournalEntry>('journalEntries', {
    orderBy: { field: 'entryNumber', direction: 'asc' },
  });
  const last = allEntries.length > 0 ? allEntries[allEntries.length - 1] : undefined;
  const nextNum = last ? parseInt(last.entryNumber.replace(/\D/g, '') || '0', 10) + 1 : 1;
  const entryNumber = `${journal}-${String(nextNum).padStart(6, '0')}`;

  const now = new Date().toISOString();
  const date = data.documentDate || now.slice(0, 10);
  const thirdParty = isSale
    ? (data.customerName || data.supplierName || 'Client')
    : (data.supplierName || 'Fournisseur');
  const label = `${isSale ? 'Facture vente' : 'Facture'} ${data.documentNumber || ''} — ${thirdParty}`.trim();

  // Code tiers : indispensable pour que la ligne collective remonte dans les vues
  // par tiers. Si la fiche porte un compte auxiliaire (411001…), on l'utilise
  // plutôt que le compte collectif générique.
  const fiche = await resolveThirdPartyCode(
    adapter,
    thirdParty,
    isSale ? data.customerTaxId : data.supplierTaxId,
    isSale ? 'customer' : 'supplier',
  );
  const thirdPartyCode = fiche?.code;
  const compteTiers = fiche?.accountCode
    || (isSale ? config.defaultCustomerAccount : config.defaultSupplierAccount);

  const lines: DBJournalLine[] = [];

  if (isSale) {
    // VENTE : D 411 client (TTC) / C 70x produit (HT) / C 443 TVA collectée.
    // Avoir → sens inversé.
    lines.push({
      id: crypto.randomUUID(),
      accountCode: compteTiers,
      accountName: thirdParty,
      thirdPartyCode,
      thirdPartyName: thirdParty,
      label,
      debit: isCreditNote ? 0 : ttc,
      credit: isCreditNote ? ttc : 0,
    });
    lines.push({
      id: crypto.randomUUID(),
      accountCode: config.defaultRevenueAccount,
      accountName: 'Ventes',
      label,
      debit: isCreditNote ? ht : 0,
      credit: isCreditNote ? 0 : ht,
    });
    if (tva > 0) {
      lines.push({
        id: crypto.randomUUID(),
        accountCode: config.defaultVatCollectedAccount,
        accountName: 'TVA collectée',
        label,
        debit: isCreditNote ? tva : 0,
        credit: isCreditNote ? 0 : tva,
      });
    }
  } else {
    // ACHAT : D 6xx charge (HT) / D 4452 TVA récupérable / C 401 fournisseur (TTC).
    lines.push({
      id: crypto.randomUUID(),
      accountCode: config.defaultExpenseAccount,
      accountName: 'Achats',
      label,
      debit: isCreditNote ? 0 : ht,
      credit: isCreditNote ? ht : 0,
    });
    if (tva > 0) {
      lines.push({
        id: crypto.randomUUID(),
        accountCode: config.defaultVatAccount,
        accountName: 'TVA récupérable',
        label,
        debit: isCreditNote ? 0 : tva,
        credit: isCreditNote ? tva : 0,
      });
    }
    lines.push({
      id: crypto.randomUUID(),
      accountCode: compteTiers,
      accountName: thirdParty,
      thirdPartyCode,
      thirdPartyName: thirdParty,
      label,
      debit: isCreditNote ? ttc : 0,
      credit: isCreditNote ? 0 : ttc,
    });
  }

  const entry: DBJournalEntry = {
    id: crypto.randomUUID(),
    entryNumber,
    journal,
    date,
    reference: data.documentNumber || '',
    label,
    // Écriture équilibrée (D=C forcé) proposée par l'OCR : créée en BROUILLON,
    // « à valider » par un comptable dans le journal (n'impacte la balance
    // qu'après validation).
    status: 'draft',
    lines,
    totalDebit: ttc,
    totalCredit: ttc,
    createdAt: now,
    updatedAt: now,
    createdBy: opts?.createdBy,
  };

  // Chaîne d'intégrité (hash chain).
  const allByDate = await adapter.getAll<DBJournalEntry>('journalEntries', {
    orderBy: { field: 'createdAt', direction: 'asc' },
  });
  const prev = allByDate.length > 0 ? allByDate[allByDate.length - 1] : undefined;
  const previousHash = prev?.hash || '';
  entry.previousHash = previousHash;
  entry.hash = await hashEntry(entry, previousHash);

  await adapter.create('journalEntries', entry);

  await logAudit(
    'OCR_INVOICE_POSTING',
    'journalEntry',
    entry.id,
    `Facture OCR → brouillon ${journal} (${isSale ? 'vente' : 'achat'}): ${label} — ${ttc} ${data.currency}`,
  );

  return entry.id;
}
