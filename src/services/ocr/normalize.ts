/**
 * Normalisation : transforme une sortie de provider (potentiellement partielle
 * ou bruitée) en un ExtractedData complet et cohérent.
 */
import type { ExtractedData, InvoiceItem, OCRConfig } from './types';

function num(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    // tolère "1 234,56", "1,234.56", "1234.56€"
    const cleaned = v.replace(/[^\d.,-]/g, '').replace(/\s/g, '');
    const normalized = cleaned.includes(',') && cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(/,/g, '');
    const n = parseFloat(normalized);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : v == null ? '' : String(v);
}

function toIsoDate(v: unknown): string {
  const s = str(v);
  if (!s) return '';
  // déjà ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

export function normalizeItems(raw: unknown, defaultTaxRate: number): InvoiceItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((it: Record<string, unknown>) => {
    const quantity = num(it.quantity ?? it.qty ?? 1) || 1;
    const unitPrice = num(it.unitPrice ?? it.unit_price ?? it.price);
    const total = num(it.total ?? it.total_amount ?? it.amount) || quantity * unitPrice;
    return {
      id: crypto.randomUUID(),
      description: str(it.description ?? it.label ?? it.name),
      quantity,
      unitPrice,
      taxRate: num(it.taxRate ?? it.tax_rate ?? defaultTaxRate),
      discount: num(it.discount),
      total,
    };
  });
}

/**
 * Construit un ExtractedData complet à partir d'un objet brut + applique les
 * défauts de configuration, puis force la cohérence des montants
 * (subtotal + tax = total) pour garantir une écriture équilibrée en aval.
 */
export function buildExtractedData(raw: Record<string, unknown>, config: OCRConfig): ExtractedData {
  const currency = str(raw.currency) || config.defaultCurrency;
  let totalAmount = num(raw.totalAmount ?? raw.total_amount ?? raw.total);
  let taxAmount = num(raw.taxAmount ?? raw.tax_amount ?? raw.total_tax ?? raw.tva);
  let subtotal = num(raw.subtotal ?? raw.total_net ?? raw.net ?? raw.ht);

  // Réconciliation des montants à partir de ce qui est disponible.
  if (!totalAmount && (subtotal || taxAmount)) totalAmount = subtotal + taxAmount;
  if (!subtotal && totalAmount) subtotal = Math.max(totalAmount - taxAmount, 0);
  if (!taxAmount && totalAmount && subtotal) taxAmount = Math.max(totalAmount - subtotal, 0);

  const items = config.extractLineItems
    ? normalizeItems(raw.items ?? raw.line_items, config.defaultTaxRate)
    : [];

  const docTypeRaw = str(raw.documentType ?? raw.document_type).toLowerCase();
  const documentType: ExtractedData['documentType'] =
    docTypeRaw.includes('credit') || docTypeRaw.includes('avoir') ? 'credit_note'
    : docTypeRaw.includes('receipt') || docTypeRaw.includes('reçu') ? 'receipt'
    : docTypeRaw.includes('order') || docTypeRaw.includes('commande') ? 'purchase_order'
    : 'invoice';

  return {
    documentType,
    documentNumber: str(raw.documentNumber ?? raw.invoice_number ?? raw.number),
    documentDate: toIsoDate(raw.documentDate ?? raw.date ?? raw.invoice_date),
    dueDate: toIsoDate(raw.dueDate ?? raw.due_date),
    supplierName: str(raw.supplierName ?? raw.supplier_name ?? raw.supplier ?? raw.vendor),
    supplierAddress: str(raw.supplierAddress ?? raw.supplier_address),
    supplierCountry: str(raw.supplierCountry ?? raw.supplier_country),
    supplierTaxId: str(raw.supplierTaxId ?? raw.supplier_tax_id ?? raw.tax_id ?? raw.siret),
    supplierEmail: str(raw.supplierEmail ?? raw.supplier_email) || undefined,
    supplierPhone: str(raw.supplierPhone ?? raw.supplier_phone) || undefined,
    supplierIBAN: str(raw.supplierIBAN ?? raw.iban) || undefined,
    customerName: str(raw.customerName ?? raw.customer_name) || undefined,
    customerAddress: str(raw.customerAddress ?? raw.customer_address) || undefined,
    customerTaxId: str(raw.customerTaxId ?? raw.customer_tax_id) || undefined,
    subtotal,
    taxAmount,
    discountAmount: num(raw.discountAmount ?? raw.discount_amount ?? raw.discount),
    shippingAmount: num(raw.shippingAmount ?? raw.shipping_amount ?? raw.shipping),
    totalAmount,
    currency,
    paymentTerms: str(raw.paymentTerms ?? raw.payment_terms) || undefined,
    paymentMethod: str(raw.paymentMethod ?? raw.payment_method) || undefined,
    items,
    purchaseOrderRef: str(raw.purchaseOrderRef ?? raw.po_ref) || undefined,
  };
}

/** Extrait le premier objet JSON présent dans un texte (réponse LLM). */
export function extractJSON(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  // Bloc ```json ... ```
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Réponse du modèle sans JSON exploitable');
  }
  return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
}
