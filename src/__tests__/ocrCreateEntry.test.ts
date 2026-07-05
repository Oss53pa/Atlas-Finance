/**
 * Comptabilisation OCR → écriture SYSCOHADA (createEntryFromInvoice).
 * Vérifie : sens achat (AC 601/4452/401) vs vente (VE 411/70x/443), équilibre
 * D=C, statut BROUILLON (« à valider »), avoir inversé, et l'auto-détection du
 * sens par comparaison à l'identité de la société.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';
import {
  createEntryFromInvoice,
  detectInvoiceDirection,
} from '../services/ocr/createEntryFromInvoice';
import { DEFAULT_OCR_CONFIG, type ExtractedData } from '../services/ocr/types';

const adapter = createTestAdapter();
const config = DEFAULT_OCR_CONFIG;

function mkData(partial: Partial<ExtractedData>): ExtractedData {
  return {
    documentType: 'invoice',
    documentNumber: 'F-001',
    documentDate: '2026-07-05',
    dueDate: '',
    supplierName: 'ACME SARL',
    supplierAddress: '',
    supplierCountry: '',
    supplierTaxId: '',
    subtotal: 100_000,
    taxAmount: 19_250,
    discountAmount: 0,
    shippingAmount: 0,
    totalAmount: 119_250,
    currency: 'XAF',
    items: [],
    ...partial,
  };
}

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

describe('createEntryFromInvoice', () => {
  beforeEach(async () => {
    await db.journalEntries.clear();
  });

  it('facture d\'achat → journal AC, 601/4452/401, brouillon, équilibrée', async () => {
    const id = await createEntryFromInvoice(adapter, mkData({ direction: 'purchase' }), config);
    const e = await db.journalEntries.get(id);
    expect(e).toBeDefined();
    expect(e!.journal).toBe('AC');
    expect(e!.status).toBe('draft'); // « à valider »
    const codes = e!.lines.map(l => l.accountCode).sort();
    expect(codes).toEqual(['401', '4452', '601']);
    // 601 débit HT, 4452 débit TVA, 401 crédit TTC
    const l601 = e!.lines.find(l => l.accountCode === '601')!;
    const l4452 = e!.lines.find(l => l.accountCode === '4452')!;
    const l401 = e!.lines.find(l => l.accountCode === '401')!;
    expect(l601.debit).toBe(100_000);
    expect(l4452.debit).toBe(19_250);
    expect(l401.credit).toBe(119_250);
    // Équilibre D = C
    expect(sum(e!.lines.map(l => l.debit))).toBe(sum(e!.lines.map(l => l.credit)));
  });

  it('facture de vente → journal VE, 411/701/443, brouillon, équilibrée', async () => {
    const id = await createEntryFromInvoice(
      adapter,
      mkData({ direction: 'sale', customerName: 'CLIENT X' }),
      config,
    );
    const e = await db.journalEntries.get(id);
    expect(e!.journal).toBe('VE');
    expect(e!.status).toBe('draft');
    const codes = e!.lines.map(l => l.accountCode).sort();
    expect(codes).toEqual(['411', '443', '701']);
    const l411 = e!.lines.find(l => l.accountCode === '411')!;
    const l701 = e!.lines.find(l => l.accountCode === '701')!;
    const l443 = e!.lines.find(l => l.accountCode === '443')!;
    expect(l411.debit).toBe(119_250);   // client TTC au débit
    expect(l701.credit).toBe(100_000);  // produit HT au crédit
    expect(l443.credit).toBe(19_250);   // TVA collectée au crédit
    expect(l411.thirdPartyName).toBe('CLIENT X');
    expect(sum(e!.lines.map(l => l.debit))).toBe(sum(e!.lines.map(l => l.credit)));
  });

  it('avoir d\'achat (credit_note) → sens inversé, équilibré', async () => {
    const id = await createEntryFromInvoice(
      adapter,
      mkData({ direction: 'purchase', documentType: 'credit_note' }),
      config,
    );
    const e = await db.journalEntries.get(id);
    const l601 = e!.lines.find(l => l.accountCode === '601')!;
    const l401 = e!.lines.find(l => l.accountCode === '401')!;
    expect(l601.credit).toBe(100_000); // charge au crédit (avoir)
    expect(l401.debit).toBe(119_250);  // fournisseur au débit
    expect(sum(e!.lines.map(l => l.debit))).toBe(sum(e!.lines.map(l => l.credit)));
  });

  it('rejette une facture à montant nul', async () => {
    await expect(
      createEntryFromInvoice(adapter, mkData({ subtotal: 0, taxAmount: 0, totalAmount: 0 }), config),
    ).rejects.toThrow();
  });
});

describe('detectInvoiceDirection', () => {
  it('émetteur = notre société (par NIF) → vente', () => {
    const data = mkData({ supplierName: 'MA SOCIETE SA', supplierTaxId: 'P0123456' });
    expect(detectInvoiceDirection(data, { name: 'Autre', taxId: 'P0123456' })).toBe('sale');
  });

  it('émetteur = notre société (par nom) → vente', () => {
    const data = mkData({ supplierName: 'Ma Société SA' });
    expect(detectInvoiceDirection(data, { name: 'MA SOCIETE SA' })).toBe('sale');
  });

  it('émetteur tiers → achat', () => {
    const data = mkData({ supplierName: 'FOURNISSEUR Y', supplierTaxId: 'P9999999' });
    expect(detectInvoiceDirection(data, { name: 'MA SOCIETE SA', taxId: 'P0123456' })).toBe('purchase');
  });

  it('identité société inconnue → achat par défaut', () => {
    expect(detectInvoiceDirection(mkData({}), null)).toBe('purchase');
  });
});
