/**
 * Préparation & suivi de télédéclaration (B5).
 *
 * ⚠️ FRONTIÈRE EXPLICITE : Atlas ne SOUMET PAS de déclaration à un portail DGI.
 * Soumettre une déclaration fiscale officielle est un acte externe irréversible
 * qui appartient au contribuable. Ce service :
 *   - PRÉPARE le bordereau (les chiffres à saisir/téléverser),
 *   - le VALIDE et le PACKAGE au format exportable,
 *   - suit son CYCLE DE VIE (à préparer → prêt → télédéclaré → payé),
 *   - pointe vers le portail du pays.
 * La soumission et le paiement restent des gestes humains sur le portail ;
 * l'utilisateur revient enregistrer la référence obtenue.
 */

import type { DataAdapter } from '@atlas/data';
import { money, Money } from '../../utils/money';
import { sha256Hex } from '../../utils/integrity';
import { getOhadaCountry } from './ohadaCountries';

export type DeclarationType = 'TVA' | 'IS' | 'IS_ACOMPTE' | 'IRPP' | 'RETENUE_SOURCE' | 'AUTRE';

export type TeledeclarationStatus = 'a_preparer' | 'pret' | 'teledeclare' | 'paye';

export const STATUS_LABELS: Record<TeledeclarationStatus, string> = {
  a_preparer: 'À préparer',
  pret: 'Prêt à télédéclarer',
  teledeclare: 'Télédéclaré',
  paye: 'Payé',
};

// ============================================================================
// REGISTRE DES PORTAILS DGI (référence — aucune soumission)
// ============================================================================
//
// Le nom du portail est public ; l'URL n'est renseignée que lorsqu'elle est
// raisonnablement établie (sinon l'UI invite à ouvrir le portail DGI du pays).
// C'est un simple raccourci de navigation : l'utilisateur agit sur le portail.

export interface PortalInfo {
  name: string;
  url?: string;
  note?: string;
}

export const DGI_PORTALS: Record<string, PortalInfo> = {
  // ── UEMOA ──────────────────────────────────────────────────────────────────
  CI: { name: 'e-impôts (DGI Côte d’Ivoire)', url: 'https://www.dgi.gouv.ci', note: 'Télédéclaration et télépaiement e-impôts.' },
  SN: { name: 'DGID Sénégal (e-tax / My Tax)', url: 'https://www.impotsetdomaines.gouv.sn' },
  BJ: { name: 'DGI Bénin (e-services)', url: 'https://impots.finances.bj' },
  BF: { name: 'DGI Burkina Faso (eSINTAX)', url: 'https://www.impots.gov.bf' },
  ML: { name: 'DGI Mali (SIGTAS)' },
  NE: { name: 'DGI Niger (SISIC / SIGTAS)' },
  TG: { name: 'OTR Togo (e-services)', url: 'https://www.otr.tg' },
  GW: { name: 'DGCI Guinée-Bissau' },
  // ── CEMAC ──────────────────────────────────────────────────────────────────
  CM: { name: 'DGI Cameroun (télédéclaration)', url: 'https://www.impots.cm' },
  CF: { name: 'DGID Centrafrique' },
  CG: { name: 'DGI Congo' },
  GA: { name: 'DGI Gabon (e-tax)' },
  GQ: { name: 'DGI Guinée équatoriale' },
  TD: { name: 'DGI Tchad' },
};

export function getPortal(countryCode: string): PortalInfo {
  return DGI_PORTALS[countryCode?.toUpperCase()] ?? { name: 'Portail DGI du pays', note: 'Ouvrir le portail de la direction générale des impôts.' };
}

// ============================================================================
// PACKAGE DE TÉLÉDÉCLARATION (bordereau)
// ============================================================================

export interface TeledeclarationLine {
  label: string;
  amount: number;
}

export interface TeledeclarationPackage {
  countryCode: string;
  countryName: string;
  portal: PortalInfo;
  type: DeclarationType;
  typeLabel: string;
  /** Période (mois AAAA-MM pour TVA, exercice AAAA pour IS). */
  period: string;
  currency: string;
  lines: TeledeclarationLine[];
  /** Montant net à payer (positif) ou crédit reporté (négatif). */
  totalAPayer: number;
  reference: string;
  generatedAt?: string;
  /** Empreinte du bordereau — scelle ce qui a été préparé. */
  integrityHash?: string;
}

const TYPE_LABELS: Record<DeclarationType, string> = {
  TVA: 'Déclaration de TVA',
  IS: 'Impôt sur les sociétés (solde)',
  IS_ACOMPTE: 'Acompte d’impôt sur les sociétés',
  IRPP: 'IRPP / ITS sur salaires',
  RETENUE_SOURCE: 'Retenues à la source',
  AUTRE: 'Déclaration fiscale',
};

export interface BuildPackageInput {
  countryCode: string;
  type: DeclarationType;
  period: string;
  lines: TeledeclarationLine[];
  /** Net à payer ; si absent, calculé comme Σ des lignes. */
  totalAPayer?: number;
  currencyOverride?: string;
}

/**
 * Construit le bordereau de télédéclaration (pur — n'écrit rien).
 */
export async function buildTeledeclarationPackage(
  input: BuildPackageInput,
): Promise<TeledeclarationPackage> {
  const country = getOhadaCountry(input.countryCode);
  const currency = input.currencyOverride ?? country?.currency ?? 'XOF';
  const total = input.totalAPayer !== undefined
    ? money(input.totalAPayer).round(2).toNumber()
    : Money.sum(input.lines.map(l => money(l.amount))).round(2).toNumber();

  const reference = `${input.type}-${input.countryCode}-${input.period}`;

  const pkg: TeledeclarationPackage = {
    countryCode: input.countryCode,
    countryName: country?.nameFr ?? input.countryCode,
    portal: getPortal(input.countryCode),
    type: input.type,
    typeLabel: TYPE_LABELS[input.type],
    period: input.period,
    currency,
    lines: input.lines.map(l => ({ label: l.label, amount: money(l.amount).round(2).toNumber() })),
    totalAPayer: total,
    reference,
  };

  const canonical = JSON.stringify({
    ref: reference,
    lines: pkg.lines.map(l => [l.label, l.amount]),
    total,
  });
  pkg.integrityHash = await sha256Hex(canonical);
  return pkg;
}

/** Bordereau au format CSV (à téléverser ou reporter sur le portail). */
export function packageToCSV(pkg: TeledeclarationPackage): string {
  const head = ['Poste', 'Montant'].join(';');
  const lines = pkg.lines.map(l => [`"${l.label.replace(/"/g, '""')}"`, l.amount].join(';'));
  const total = ['NET À PAYER', pkg.totalAPayer].join(';');
  const meta = [
    `# ${pkg.typeLabel} — ${pkg.countryName} — ${pkg.period}`,
    `# Portail : ${pkg.portal.name}`,
    `# Référence interne : ${pkg.reference}`,
    `# Empreinte : ${pkg.integrityHash ?? ''}`,
  ].join('\n');
  return [meta, head, ...lines, total].join('\n');
}

// ============================================================================
// CYCLE DE VIE (persisté)
// ============================================================================

export interface TeledeclarationRecord {
  reference: string;
  countryCode: string;
  type: DeclarationType;
  period: string;
  status: TeledeclarationStatus;
  totalAPayer: number;
  integrityHash?: string;
  /** Référence FOURNIE PAR LE PORTAIL après soumission (saisie par l'utilisateur). */
  portalReference?: string;
  preparedAt?: string;
  submittedAt?: string;
  paidAt?: string;
  updatedAt: string;
}

const recordKey = (ref: string) => `teledeclaration_${ref}`;

/** Lit le statut d'une télédéclaration (ou 'a_preparer' si inexistant). */
export async function getTeledeclarationRecord(
  adapter: DataAdapter,
  reference: string,
): Promise<TeledeclarationRecord | null> {
  try {
    const row = await adapter.getById<{ value?: string }>('settings', recordKey(reference));
    if (row?.value) return JSON.parse(row.value) as TeledeclarationRecord;
  } catch { /* absent */ }
  return null;
}

async function persist(adapter: DataAdapter, rec: TeledeclarationRecord): Promise<void> {
  const key = recordKey(rec.reference);
  const value = JSON.stringify(rec);
  const existing = await adapter.getById('settings', key).catch(() => null);
  if (existing) {
    await adapter.update('settings', key, { key, value, updatedAt: rec.updatedAt } as any);
  } else {
    await adapter.create('settings', { key, value, updatedAt: rec.updatedAt } as any);
  }
}

/** Marque le bordereau comme préparé (prêt à télédéclarer). */
export async function markPrepared(
  adapter: DataAdapter,
  pkg: TeledeclarationPackage,
  now: string,
): Promise<TeledeclarationRecord> {
  const existing = await getTeledeclarationRecord(adapter, pkg.reference);
  const rec: TeledeclarationRecord = {
    reference: pkg.reference,
    countryCode: pkg.countryCode,
    type: pkg.type,
    period: pkg.period,
    status: existing && existing.status !== 'a_preparer' ? existing.status : 'pret',
    totalAPayer: pkg.totalAPayer,
    integrityHash: pkg.integrityHash,
    portalReference: existing?.portalReference,
    preparedAt: existing?.preparedAt ?? now,
    submittedAt: existing?.submittedAt,
    paidAt: existing?.paidAt,
    updatedAt: now,
  };
  await persist(adapter, rec);
  return rec;
}

/**
 * Enregistre que l'utilisateur a TÉLÉDÉCLARÉ sur le portail (geste externe).
 * Atlas ne soumet pas : il consigne la référence obtenue par le contribuable.
 */
export async function recordSubmitted(
  adapter: DataAdapter,
  reference: string,
  portalReference: string,
  now: string,
): Promise<TeledeclarationRecord> {
  const rec = (await getTeledeclarationRecord(adapter, reference)) ?? emptyRecord(reference, now);
  rec.status = rec.status === 'paye' ? 'paye' : 'teledeclare';
  rec.portalReference = portalReference;
  rec.submittedAt = now;
  rec.updatedAt = now;
  await persist(adapter, rec);
  return rec;
}

/** Enregistre le paiement effectué par le contribuable (geste externe). */
export async function recordPaid(
  adapter: DataAdapter,
  reference: string,
  now: string,
): Promise<TeledeclarationRecord> {
  const rec = (await getTeledeclarationRecord(adapter, reference)) ?? emptyRecord(reference, now);
  rec.status = 'paye';
  rec.paidAt = now;
  rec.updatedAt = now;
  await persist(adapter, rec);
  return rec;
}

function emptyRecord(reference: string, now: string): TeledeclarationRecord {
  const [type, countryCode, ...rest] = reference.split('-');
  return {
    reference,
    countryCode: countryCode ?? '',
    type: (type as DeclarationType) ?? 'AUTRE',
    period: rest.join('-'),
    status: 'a_preparer',
    totalAPayer: 0,
    updatedAt: now,
  };
}
