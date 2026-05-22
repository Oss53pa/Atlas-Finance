/**
 * Provider Mindee — extraction de factures structurée via l'API REST Mindee.
 *
 * Endpoint : Invoice OCR v4 (https://developers.mindee.com/docs/invoice-ocr).
 * La clé API est fournie par l'admin (offre gratuite disponible).
 * Appel direct navigateur → serveur Mindee (multipart/form-data).
 */
import type { ExtractionResult, OCRConfig, ExtractedData } from '../types';
import { buildExtractedData } from '../normalize';

const MINDEE_INVOICE_URL = 'https://api.mindee.net/v1/products/mindee/invoices/v4/predict';

interface MindeeField {
  value?: string | number | null;
  confidence?: number;
}

function fieldValue(f: MindeeField | undefined): string | number | undefined {
  return f && f.value != null ? f.value : undefined;
}

export async function extractWithMindee(file: File, config: OCRConfig): Promise<ExtractionResult> {
  if (!config.mindeeApiKey?.trim()) {
    return { success: false, confidence: 0, provider: 'mindee', error: 'Clé API Mindee manquante.' };
  }

  const form = new FormData();
  form.append('document', file, file.name);

  const response = await fetch(MINDEE_INVOICE_URL, {
    method: 'POST',
    headers: { Authorization: `Token ${config.mindeeApiKey.trim()}` },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    if (response.status === 401) {
      return { success: false, confidence: 0, provider: 'mindee', error: 'Clé API Mindee invalide (401).' };
    }
    return {
      success: false,
      confidence: 0,
      provider: 'mindee',
      error: `Mindee ${response.status}: ${text.slice(0, 200)}`,
    };
  }

  const json = await response.json();
  const prediction = json?.document?.inference?.prediction;
  if (!prediction) {
    return { success: false, confidence: 0, provider: 'mindee', error: 'Réponse Mindee inattendue.' };
  }

  const taxes: Array<{ rate?: number; base?: number; value?: number }> = prediction.taxes ?? [];
  const lineItems: Array<Record<string, unknown>> = prediction.line_items ?? [];

  const raw: Record<string, unknown> = {
    documentType: 'invoice',
    documentNumber: fieldValue(prediction.invoice_number),
    documentDate: fieldValue(prediction.date),
    dueDate: fieldValue(prediction.due_date),
    supplierName: fieldValue(prediction.supplier_name),
    supplierAddress: fieldValue(prediction.supplier_address),
    supplierTaxId: (prediction.supplier_company_registrations ?? [])
      .map((r: MindeeField) => r.value)
      .filter(Boolean)
      .join(', '),
    customerName: fieldValue(prediction.customer_name),
    total_net: fieldValue(prediction.total_net),
    total_tax: fieldValue(prediction.total_tax),
    total_amount: fieldValue(prediction.total_amount),
    currency: prediction.locale?.currency,
    items: lineItems.map((li) => ({
      description: li.description,
      quantity: li.quantity,
      unit_price: li.unit_price,
      total_amount: li.total_amount,
      tax_rate: li.tax_rate,
    })),
  };

  const data: ExtractedData = buildExtractedData(raw, config);
  if (taxes.length && taxes[0].rate != null) {
    data.taxBreakdown = taxes.map((t) => ({ rate: t.rate ?? 0, base: t.base ?? 0, amount: t.value ?? 0 }));
  }

  // Confiance : moyenne des champs clés renvoyés par Mindee (0..1 → 0..100).
  const confidences = [
    prediction.invoice_number?.confidence,
    prediction.date?.confidence,
    prediction.supplier_name?.confidence,
    prediction.total_amount?.confidence,
    prediction.total_tax?.confidence,
  ].filter((c): c is number => typeof c === 'number');
  const confidence = confidences.length
    ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100)
    : 70;

  return { success: true, data, confidence, provider: 'mindee' };
}

export async function testMindee(config: OCRConfig): Promise<{ ok: boolean; message: string }> {
  if (!config.mindeeApiKey?.trim()) {
    return { ok: false, message: 'Aucune clé API Mindee renseignée.' };
  }
  // Mindee n'offre pas d'endpoint de ping ; on valide le format de la clé.
  return {
    ok: true,
    message: 'Clé API enregistrée. Elle sera vérifiée lors de la première extraction.',
  };
}
