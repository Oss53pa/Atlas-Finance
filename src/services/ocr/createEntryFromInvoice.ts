/**
 * Comptabilisation d'une facture OCR → écriture comptable SYSCOHADA.
 *
 * Facture d'achat (journal AC) :
 *   DÉBIT  6xx  charge (HT)
 *   DÉBIT  4452 TVA récupérable
 *   CRÉDIT 401  fournisseur (TTC)
 *
 * On force subtotal = total - tva pour garantir D = C (le DexieAdapter rejette
 * toute écriture déséquilibrée). Modèle calqué sur treasuryPostingService.
 */
import type { DataAdapter } from '@atlas/data';
import { logAudit } from '../../lib/db';
import type { DBJournalEntry, DBJournalLine } from '../../lib/db';
import { hashEntry } from '../../utils/integrity';
import type { ExtractedData, OCRConfig } from './types';

export async function createEntryFromInvoice(
  adapter: DataAdapter,
  data: ExtractedData,
  config: OCRConfig,
  opts?: { createdBy?: string },
): Promise<string> {
  const ttc = data.totalAmount > 0 ? data.totalAmount : data.subtotal + data.taxAmount;
  const tva = Math.min(Math.max(data.taxAmount, 0), ttc);
  const ht = Math.max(ttc - tva, 0);

  if (ttc <= 0) {
    throw new Error('Montant total introuvable ou nul : impossible de comptabiliser cette facture.');
  }

  const isCreditNote = data.documentType === 'credit_note';

  // Numéro d'écriture séquentiel sur le journal configuré.
  const allEntries = await adapter.getAll<DBJournalEntry>('journalEntries', {
    orderBy: { field: 'entryNumber', direction: 'asc' },
  });
  const last = allEntries.length > 0 ? allEntries[allEntries.length - 1] : undefined;
  const nextNum = last ? parseInt(last.entryNumber.replace(/\D/g, '') || '0', 10) + 1 : 1;
  const entryNumber = `${config.defaultJournal}-${String(nextNum).padStart(6, '0')}`;

  const now = new Date().toISOString();
  const date = data.documentDate || now.slice(0, 10);
  const label = `Facture ${data.documentNumber || ''} — ${data.supplierName || 'Fournisseur'}`.trim();

  // Pour un avoir, on inverse le sens (charge au crédit, fournisseur au débit).
  const lines: DBJournalLine[] = [];
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
    accountCode: config.defaultSupplierAccount,
    accountName: data.supplierName || 'Fournisseur',
    thirdPartyName: data.supplierName || undefined,
    label,
    debit: isCreditNote ? ttc : 0,
    credit: isCreditNote ? 0 : ttc,
  });

  const entry: DBJournalEntry = {
    id: crypto.randomUUID(),
    entryNumber,
    journal: config.defaultJournal,
    date,
    reference: data.documentNumber || '',
    label,
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
    `Facture OCR comptabilisée: ${label} — ${ttc} ${data.currency}`,
  );

  return entry.id;
}
