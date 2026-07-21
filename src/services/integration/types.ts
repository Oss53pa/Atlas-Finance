/**
 * Ossature d'intégration Suite Atlas — contrats d'événements (L2/L3).
 *
 * Réf. docs/integration-suite-atlas/DESIGN.md
 *
 * RÈGLE CARDINALE : un satellite (Atlas Trade / Procure / People) émet un
 * FAIT DE GESTION neutre. Il n'émet JAMAIS une écriture comptable et ne
 * connaît AUCUN numéro de compte SYSCOHADA. La traduction fait → écriture
 * est la propriété exclusive d'Atlas Finance & Accounting, via `posting_rules`.
 *
 * Corollaire : aucun type de ce fichier ne contient de champ « compte ».
 */

import type { SourceSystem } from '../../lib/db';

// ============================================================================
// SYSTÈMES ET TYPES D'ÉVÉNEMENTS
// ============================================================================

/** Satellites autorisés à alimenter le Grand Livre par le bus d'intégration. */
export type SatelliteSystem = Extract<
  SourceSystem,
  'atlas_trade' | 'atlas_procure' | 'atlas_people'
>;

export const SATELLITE_SYSTEMS: SatelliteSystem[] = [
  'atlas_trade',
  'atlas_procure',
  'atlas_people',
];

export const SATELLITE_LABELS: Record<SatelliteSystem, string> = {
  atlas_trade: 'Atlas Trade',
  atlas_procure: 'Atlas Procure',
  atlas_people: 'Atlas People',
};

/**
 * Types d'événements supportés.
 *
 * Ajouter un type ici ne suffit pas : il faut aussi des `posting_rules`.
 * Un événement sans règle est REJETÉ (NO_POSTING_RULE) — jamais posté au
 * jugé sur un compte deviné.
 */
export type IntegrationEventType =
  // Atlas Trade — ventes
  | 'sale.invoice.issued'
  | 'sale.credit_note.issued'
  | 'sale.payment.received'
  // Atlas Procure — achats
  | 'purchase.order.approved'
  | 'purchase.goods_receipt.posted'
  | 'purchase.invoice.received'
  | 'purchase.credit_note.received'
  | 'purchase.payment.issued'
  // Atlas People — paie
  | 'payroll.run.validated'
  | 'payroll.payment.issued'
  | 'payroll.contribution.declared';

/** Événements qui ne produisent AUCUNE écriture (engagement, pas fait comptable). */
export const NON_POSTING_EVENTS: IntegrationEventType[] = [
  // Une commande approuvée est un ENGAGEMENT budgétaire, pas une charge.
  // Elle alimente budget_engagements, jamais le Grand Livre.
  'purchase.order.approved',
  // La déclaration d'une cotisation crée une échéance fiscale/sociale ;
  // la dette est déjà comptabilisée par payroll.run.validated.
  'payroll.contribution.declared',
];

/** Système émetteur attendu pour chaque type d'événement (contrôle d'usurpation). */
export const EVENT_OWNER: Record<IntegrationEventType, SatelliteSystem> = {
  'sale.invoice.issued': 'atlas_trade',
  'sale.credit_note.issued': 'atlas_trade',
  'sale.payment.received': 'atlas_trade',
  'purchase.order.approved': 'atlas_procure',
  'purchase.goods_receipt.posted': 'atlas_procure',
  'purchase.invoice.received': 'atlas_procure',
  'purchase.credit_note.received': 'atlas_procure',
  'purchase.payment.issued': 'atlas_procure',
  'payroll.run.validated': 'atlas_people',
  'payroll.payment.issued': 'atlas_people',
  'payroll.contribution.declared': 'atlas_people',
};

/** Journal comptable cible par type d'événement (paramétrable ultérieurement). */
export const EVENT_JOURNAL: Record<IntegrationEventType, string> = {
  'sale.invoice.issued': 'VE',
  'sale.credit_note.issued': 'VE',
  'sale.payment.received': 'BQ',
  'purchase.order.approved': 'AC',
  'purchase.goods_receipt.posted': 'ST',
  'purchase.invoice.received': 'AC',
  'purchase.credit_note.received': 'AC',
  'purchase.payment.issued': 'BQ',
  'payroll.run.validated': 'OD',
  'payroll.payment.issued': 'BQ',
  'payroll.contribution.declared': 'OD',
};

// ============================================================================
// RÔLES DE LIGNE
// ============================================================================

/**
 * Rôle FONCTIONNEL d'une ligne dans le fait de gestion.
 *
 * C'est le seul vocabulaire que parlent les satellites. La correspondance
 * rôle → compte SYSCOHADA vit dans `posting_rules`, éditable par le comptable.
 */
export type LineRole =
  // Ventes
  | 'revenue'
  | 'receivable'
  | 'vat_collected'
  | 'withholding'
  // Achats
  | 'expense'
  | 'payable'
  | 'vat_deductible'
  | 'inventory'
  | 'grni'
  // Paie
  | 'gross_salary'
  | 'social_employer'
  | 'social_employee'
  | 'income_tax_withheld'
  | 'other_deductions'
  | 'net_payable'
  // Transverse
  | 'cash';

export const LINE_ROLE_LABELS: Record<LineRole, string> = {
  revenue: 'Produit (vente)',
  receivable: 'Créance client',
  vat_collected: 'TVA collectée',
  withholding: 'Retenue à la source',
  expense: 'Charge (achat)',
  payable: 'Dette fournisseur',
  vat_deductible: 'TVA déductible',
  inventory: 'Entrée en stock',
  grni: 'Facture non parvenue',
  gross_salary: 'Salaire brut',
  social_employer: 'Charges patronales',
  social_employee: 'Cotisations salariales',
  income_tax_withheld: 'Impôt retenu à la source',
  other_deductions: 'Autres retenues',
  net_payable: 'Net à payer',
  cash: 'Trésorerie',
};

// ============================================================================
// PAYLOADS
// ============================================================================

/**
 * Bloc fiscal d'une ligne.
 *
 * ⚠️ La donnée fiscale VOYAGE AVEC L'ÉVÉNEMENT. Le montant seul ne suffit
 * pas : sans base / taux / régime, la déclaration de TVA produite par
 * Atlas F&A sera fausse, et incohérente avec la facture certifiée émise
 * par le satellite.
 */
export interface EventTaxInfo {
  /** Code interne du taux (TVA18, TVA9, EXO…). Sert de `match_key`. */
  code: string;
  rate: number;
  base: number;
  amount: number;
  /** normal | exonere | suspension | export */
  regime?: string;
  /** Référence légale de l'exonération, si applicable. */
  exemptionRef?: string | null;
}

/** Retenue à la source (AIRSI, RAS honoraires/loyers/dividendes…). */
export interface EventWithholding {
  code: string;
  base: number;
  rate: number;
  amount: number;
}

/**
 * Certification fiscale de la facture.
 *
 * Émise par le satellite (FNE Côte d'Ivoire, e-MECeF Bénin…). Atlas F&A ne
 * certifie pas — il ARCHIVE la preuve et l'attache à l'écriture.
 */
export interface EventCertification {
  provider: string;
  number: string;
  signature?: string;
  qr?: string;
  certifiedAt?: string;
}

export interface EventThirdParty {
  /** Code tiers CANONIQUE — attribué par Atlas F&A (MDM, L4). */
  code: string;
  name?: string;
  taxId?: string;
}

export interface EventLine {
  role: LineRole;
  label?: string;
  /** Montant hors taxe (positif). Le sens D/C est décidé par la règle. */
  amount: number;
  /** Discriminant de règle : famille produit, rubrique de paie, code taxe… */
  matchKey?: string;
  analyticalCode?: string;
  thirdParty?: EventThirdParty;
  tax?: EventTaxInfo;
}

/** Payload commun à tous les faits de gestion. */
export interface IntegrationEventPayload {
  docNumber: string;
  docDate: string;
  currency: string;
  exchangeRate?: number;
  thirdParty?: EventThirdParty;
  lines: EventLine[];
  withholdings?: EventWithholding[];
  certification?: EventCertification;
  totalExclTax?: number;
  totalTax?: number;
  totalInclTax?: number;
  label?: string;
  [key: string]: unknown;
}

/** Enveloppe telle que stockée dans `integration_events`. */
export interface IntegrationEvent {
  id: string;
  tenantId?: string;
  sourceSystem: SatelliteSystem | SourceSystem;
  eventType: IntegrationEventType;
  eventVersion: number;
  sourceDocId: string;
  idempotencyKey: string;
  occurredAt: string;
  receivedAt?: string;
  payload: IntegrationEventPayload;
  payloadHash: string;
  status: IntegrationEventStatus;
  journalEntryId?: string | null;
  errorCode?: string | null;
  errorDetail?: string | null;
  attempts: number;
  nextAttemptAt?: string | null;
}

export type IntegrationEventStatus =
  | 'pending'
  | 'posted'
  | 'rejected'
  | 'ignored'
  | 'deferred';

// ============================================================================
// RÈGLES DE DÉTERMINATION
// ============================================================================

export interface PostingRule {
  id: string;
  tenantId?: string;
  eventType: string;
  lineRole: LineRole | string;
  matchKey: string;
  debitAccount?: string | null;
  creditAccount?: string | null;
  analytic: boolean;
  thirdParty: boolean;
  priority: number;
  active: boolean;
}

// ============================================================================
// RÉSULTATS
// ============================================================================

export type PostingErrorCode =
  | 'NO_POSTING_RULE'
  | 'PERIOD_CLOSED'
  | 'UNBALANCED'
  | 'INVALID_PAYLOAD'
  | 'OWNER_MISMATCH'
  | 'GUARD_REJECTED'
  | 'UNKNOWN_EVENT_TYPE';

export interface PostingOutcome {
  status: IntegrationEventStatus;
  journalEntryId?: string;
  errorCode?: PostingErrorCode;
  errorDetail?: string;
  /** Date effective de comptabilisation (peut différer si report de période). */
  postedDate?: string;
}

/** Politique appliquée quand la période visée est close. */
export type ClosedPeriodPolicy = 'reject' | 'defer_to_next_open';
