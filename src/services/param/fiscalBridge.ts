/**
 * fiscalBridge — branchement des paramètres fiscaux sur le socle (décision P-fisc).
 *
 * `fiscalParameters.ts` reste le référentiel plateforme versionné par (pays,
 * année). Le socle (param_resolve, namespace `fiscal.*`) porte les SURCHARGES
 * tenant qui priment. Résolution : surcharge tenant sinon valeur TS pays/année.
 *
 * `pickFiscalValue` est PURE (testable).
 */
import type { DataAdapter } from '@atlas/data';
import { resolveFiscalParameters, type FiscalParameterSet } from '../fiscal/fiscalParameters';
import { resolveParam, setParamValue } from './paramService';

export interface FiscalKeyDef {
  key: string;                 // suffixe (sans le préfixe fiscal.)
  libelle: string;
  get: (p: FiscalParameterSet) => number | null;
}

/** Paramètres fiscaux surchargeables via le socle, avec leur extracteur TS. */
export const FISCAL_KEYS: FiscalKeyDef[] = [
  { key: 'is_taux',               libelle: 'IS — taux standard (%)',        get: p => p.is.rateStandard },
  { key: 'is_taux_reduit',        libelle: 'IS — taux réduit (%)',          get: p => p.is.rateReduced ?? null },
  { key: 'imf_taux',              libelle: 'IMF — taux (% du CA)',          get: p => p.is.minimumRate },
  { key: 'imf_plancher',          libelle: 'IMF — plancher',                get: p => p.is.minimumFloor },
  { key: 'tva_taux',              libelle: 'TVA — taux standard (%)',        get: p => p.vatRateStandard },
  { key: 'deficit_report_annees', libelle: 'Report déficitaire (années)',   get: p => p.deficitCarryForwardYears },
];

/** Valeur effective = surcharge tenant si présente, sinon défaut TS. Fonction pure. */
export function pickFiscalValue(override: number | null | undefined, tsDefault: number | null): number | null {
  return override != null ? override : tsDefault;
}

const asOfYear = (year: number) => `${year}-06-30`;

/** Résout un paramètre fiscal : surcharge tenant (socle) sinon valeur TS pays/année. */
export async function resolveFiscalParam(adapter: DataAdapter, key: string, country: string, year: number): Promise<number | null> {
  const def = FISCAL_KEYS.find(k => k.key === key);
  const ts = def ? def.get(resolveFiscalParameters(country, year).parameters) : null;
  const override = await resolveParam<number>(adapter, `fiscal.${key}`, asOfYear(year));
  return pickFiscalValue(typeof override === 'number' ? override : (override != null ? Number(override) : undefined), ts);
}

export interface FiscalResolvedRow {
  key: string;
  libelle: string;
  tsDefault: number | null;
  override: number | null;
  effective: number | null;
  surcharge: boolean;
}

/** Tableau des paramètres fiscaux : défaut TS, surcharge tenant, valeur effective. */
export async function getFiscalResolved(adapter: DataAdapter, country: string, year: number): Promise<{ rows: FiscalResolvedRow[]; fallback: boolean; warning?: string }> {
  const res = resolveFiscalParameters(country, year);
  const rows: FiscalResolvedRow[] = [];
  for (const d of FISCAL_KEYS) {
    const tsDefault = d.get(res.parameters);
    const raw = await resolveParam<number>(adapter, `fiscal.${d.key}`, asOfYear(year));
    const override = raw != null ? Number(raw) : null;
    rows.push({ key: d.key, libelle: d.libelle, tsDefault, override, effective: pickFiscalValue(override, tsDefault), surcharge: override != null });
  }
  return { rows, fallback: res.fallback, warning: res.warning };
}

/** Pose une surcharge tenant sur un paramètre fiscal (effet daté sur l'exercice). */
export async function setFiscalOverride(adapter: DataAdapter, key: string, value: number, year: number): Promise<void> {
  await setParamValue(adapter, `fiscal.${key}`, value, { portee: 'societe', effet_du: `${year}-01-01`, motif: `Surcharge fiscale ${key} ${year}` });
}
