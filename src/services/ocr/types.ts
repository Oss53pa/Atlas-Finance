/**
 * Types canoniques du module OCR Factures.
 *
 * Source unique de vérité partagée entre :
 *  - le service d'extraction (extractInvoice + providers)
 *  - le service de persistance (scannedDocumentService)
 *  - la comptabilisation (createEntryFromInvoice)
 *  - l'UI (pages/accounting/OCRInvoices, components/admin/sections/AdminOCR)
 */

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
  total: number;
  accountCode?: string;
  analyticalCode?: string;
}

export interface ExtractedData {
  // Document
  documentType: 'invoice' | 'credit_note' | 'receipt' | 'purchase_order';
  documentNumber: string;
  documentDate: string;
  dueDate: string;

  // Fournisseur
  supplierName: string;
  supplierAddress: string;
  supplierCountry: string;
  supplierTaxId: string;
  supplierEmail?: string;
  supplierPhone?: string;
  supplierIBAN?: string;

  // Client
  customerName?: string;
  customerAddress?: string;
  customerTaxId?: string;

  // Montants
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  shippingAmount: number;
  totalAmount: number;
  currency: string;
  exchangeRate?: number;

  // Paiement
  paymentTerms?: string;
  paymentMethod?: string;
  bankDetails?: string;

  // Lignes
  items: InvoiceItem[];

  // Références
  purchaseOrderRef?: string;
  deliveryNoteRef?: string;
  contractRef?: string;

  // Conformité
  taxBreakdown?: { rate: number; base: number; amount: number }[];
}

export type ScannedInvoiceStatus =
  | 'uploading'
  | 'processing'
  | 'review'
  | 'validated'
  | 'rejected'
  | 'error'
  | 'archived';

export interface ScannedInvoice {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadDate: Date;
  processedDate?: Date;
  status: ScannedInvoiceStatus;
  confidence: number;
  extractedData: ExtractedData;
  /** data: URL (reconstruite depuis le base64 persisté) ou blob: URL (session courante). */
  originalFileUrl: string;
  ocrText?: string;
  validationErrors?: {
    field: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }[];
  validatedBy?: string;
  validatedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  accountingEntryId?: string;
  tags?: string[];
  notes?: string;
  provider?: string;
  auditLog?: {
    action: string;
    user: string;
    timestamp: Date;
    details?: string;
  }[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export type OCRProviderId = 'none' | 'ai-vision' | 'mindee';
export type AIVisionBackend = 'auto' | 'ollama' | 'anthropic';

export interface OCRConfig {
  /** Moteur d'extraction actif. */
  provider: OCRProviderId;

  // --- IA Vision ---
  aiVisionBackend: AIVisionBackend;
  ollamaVisionModel: string;

  // --- Mindee ---
  mindeeApiKey: string;

  // --- Préférences d'extraction ---
  autoValidate: boolean;
  confidenceThreshold: number;
  defaultCurrency: string;
  defaultTaxRate: number;
  language: string;
  extractLineItems: boolean;
  duplicateCheck: boolean;
  enhanceImage: boolean;

  // --- Comptabilisation (SYSCOHADA) ---
  defaultJournal: string;
  defaultExpenseAccount: string;
  defaultVatAccount: string;
  defaultSupplierAccount: string;
}

export const DEFAULT_OCR_CONFIG: OCRConfig = {
  // IA Vision active PAR DÉFAUT : le moteur serveur (edge function `ocr-extract`)
  // résout Claude (clé Anthropic) ou Groq/Llama 4 vision (clé déjà en place) —
  // l'extraction fonctionne d'origine, sans configuration admin préalable.
  provider: 'ai-vision',
  aiVisionBackend: 'auto',
  ollamaVisionModel: 'llama3.2-vision',
  mindeeApiKey: '',
  autoValidate: false,
  confidenceThreshold: 85,
  defaultCurrency: 'XAF',
  defaultTaxRate: 19.25,
  language: 'fr',
  extractLineItems: true,
  duplicateCheck: true,
  enhanceImage: true,
  defaultJournal: 'AC',
  defaultExpenseAccount: '601',
  defaultVatAccount: '4452',
  defaultSupplierAccount: '401',
};

export interface ExtractionResult {
  success: boolean;
  data?: ExtractedData;
  confidence: number;
  rawText?: string;
  provider: string;
  error?: string;
}

/** Le provider sélectionné dispose-t-il du minimum requis pour fonctionner ? */
export function isOCRConfigured(config: OCRConfig | null | undefined): boolean {
  if (!config) return false;
  if (config.provider === 'mindee') return !!config.mindeeApiKey?.trim();
  if (config.provider === 'ai-vision') return true; // disponibilité réelle vérifiée au runtime
  return false;
}
