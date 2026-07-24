/**
 * Paramètres fiscaux versionnés — Vague B (B0).
 *
 * Réf. docs/fiscal-dsf-multipays/DESIGN.md § B0
 *
 * PRINCIPE DIRECTEUR : la loi fiscale est une DONNÉE VERSIONNÉE, jamais du code.
 * Un jeu de paramètres est identifié par (countryCode, fiscalYear). Changer le
 * taux d'IS d'une loi de finances = ajouter un jeu, pas déployer une modif.
 *
 * Ce fichier remplace, pour la détermination ANNUELLE (IS/IMF/résultat fiscal),
 * les constantes dispersées (IS_RATES dans isCalculation.ts, taux figés dans
 * taxRegistrySeeds.ts). Les déclarations périodiques TVA/IRPP continuent de
 * s'appuyer sur taxRegistrySeeds — complémentaire, pas concurrent.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Règle d'ajustement fiscal (réintégration ou déduction).
 *
 * Chaque règle est TYPÉE et porte sa base légale — jamais un montant en dur.
 * `source.account` = dérivée du Grand Livre (donc calculée, pas retapée).
 * `source.manual` = saisie motivée par le comptable (amendes, dons > plafond…).
 */
export interface FiscalAdjustmentRule {
  code: string;
  label: string;
  sense: 'reintegration' | 'deduction';
  /** Article du CGI du pays — traçabilité de l'audit. */
  legalBasis: string;
  source:
    | { kind: 'account'; prefixes: string[]; side: 'debit' | 'credit' | 'solde'; portion?: number }
    | { kind: 'manual' };
  /** Explication courte affichée dans le tableau de passage. */
  help?: string;
}

export interface IrppBracket {
  from: number;
  to: number | null;
  rate: number;
}

export interface FiscalParameterSet {
  countryCode: string;
  fiscalYear: number;
  legalReference: string;
  currency: string;
  is: {
    rateStandard: number;
    rateReduced?: number;
    /** Taux de l'Impôt Minimum Forfaitaire (IMF), en % du CA. */
    minimumRate: number;
    /** Plancher IMF (montant minimum dû quel que soit le CA). */
    minimumFloor: number;
    /** Plafond IMF éventuel. */
    minimumCap?: number;
  };
  /** Années de report déficitaire autorisées. */
  deficitCarryForwardYears: number;
  irppBrackets: IrppBracket[];
  vatRateStandard: number;
  /** Catalogue des réintégrations/déductions applicables (B1). */
  fiscalAdjustments: FiscalAdjustmentRule[];
  /**
   * Jeu INDICATIF : taux têtes de chapitre (IS/TVA/minimum) documentés mais non
   * certifiés contre la loi de finances en vigueur. À VALIDER avant toute
   * déclaration. La détermination propage un avertissement.
   */
  provisional?: boolean;
  /** Note de prudence affichée avec l'avertissement. */
  notes?: string;
}

// ============================================================================
// CATALOGUE D'AJUSTEMENTS DE RÉFÉRENCE (CI)
// ============================================================================
//
// Réintégrations/déductions de droit commun du CGI ivoirien. Dérivées du GL
// autant que possible ; les postes qui exigent un jugement (portion non
// déductible, plafonds) sont en saisie manuelle motivée.

const CI_ADJUSTMENTS: FiscalAdjustmentRule[] = [
  {
    code: 'REINT_IMPOT_SOCIETE',
    label: 'Impôt sur les sociétés (charge non déductible)',
    sense: 'reintegration',
    legalBasis: 'CGI CI, art. 18',
    // L'IS lui-même (classe 89) n'est pas une charge déductible : sans cette
    // réintégration, le résultat fiscal serait minoré de sa propre charge.
    source: { kind: 'account', prefixes: ['89'], side: 'solde' },
    help: 'La charge d’IMF/IS de l’exercice n’est pas déductible de sa propre base.',
  },
  {
    code: 'REINT_AMENDES_PENALITES',
    label: 'Amendes, pénalités et majorations',
    sense: 'reintegration',
    legalBasis: 'CGI CI, art. 18',
    source: { kind: 'account', prefixes: ['6714', '6715', '6474'], side: 'debit' },
    help: 'Amendes fiscales et pénalités : jamais déductibles.',
  },
  {
    code: 'REINT_DONS_LIBERALITES',
    label: 'Dons et libéralités au-delà du plafond',
    sense: 'reintegration',
    legalBasis: 'CGI CI, art. 18',
    // Portion non déductible : jugement requis (plafond = 2,5‰ du CA).
    source: { kind: 'manual' },
    help: 'Fraction des dons excédant le plafond légal (2,5‰ du CA).',
  },
  {
    code: 'REINT_PROVISIONS_NON_DEDUCTIBLES',
    label: 'Dotations aux provisions non déductibles',
    sense: 'reintegration',
    legalBasis: 'CGI CI, art. 18',
    source: { kind: 'manual' },
    help: 'Provisions pour risques non individualisés ou non déductibles.',
  },
  {
    code: 'DED_REPRISES_PROVISIONS_ANTERIEUREMENT_REINTEGREES',
    label: 'Reprises de provisions antérieurement réintégrées',
    sense: 'deduction',
    legalBasis: 'CGI CI, art. 18',
    source: { kind: 'manual' },
    help: 'Reprises de provisions qui avaient été réintégrées lors de leur dotation.',
  },
  {
    code: 'DED_PLUS_VALUES_EXONEREES',
    label: 'Plus-values de cession exonérées (remploi)',
    sense: 'deduction',
    legalBasis: 'CGI CI, art. 28',
    source: { kind: 'manual' },
    help: 'Plus-values de cession d’immobilisations sous engagement de remploi.',
  },
];

// Squelette d'ajustements pour les autres pays : structure identique, à
// compléter par le CGI local. Les postes universels (IS non déductible,
// amendes) sont fournis pour que la détermination soit déjà cohérente.
function baselineAdjustments(countryLabel: string): FiscalAdjustmentRule[] {
  return [
    {
      code: 'REINT_IMPOT_SOCIETE',
      label: 'Impôt sur les sociétés (charge non déductible)',
      sense: 'reintegration',
      legalBasis: `CGI ${countryLabel}`,
      source: { kind: 'account', prefixes: ['89'], side: 'solde' },
    },
    {
      code: 'REINT_AMENDES_PENALITES',
      label: 'Amendes et pénalités',
      sense: 'reintegration',
      legalBasis: `CGI ${countryLabel}`,
      source: { kind: 'account', prefixes: ['6714', '6715'], side: 'debit' },
    },
  ];
}

// ============================================================================
// BARÈME IRPP CI (loi de finances — inchangé 2024→2026)
// ============================================================================

const CI_IRPP_BRACKETS: IrppBracket[] = [
  { from: 0, to: 300_000, rate: 0 },
  { from: 300_000, to: 547_000, rate: 10 },
  { from: 547_000, to: 979_000, rate: 15 },
  { from: 979_000, to: 1_519_000, rate: 20 },
  { from: 1_519_000, to: 2_644_000, rate: 25 },
  { from: 2_644_000, to: null, rate: 35 },
];

// ============================================================================
// JEUX INDICATIFS OHADA 2026 (11 pays hors CI)
// ============================================================================
//
// Taux têtes de chapitre (IS standard, TVA standard, taux minimum, report
// déficitaire) — repères stables et largement documentés, MAIS à valider contre
// la loi de finances de chaque pays avant toute déclaration (d'où provisional).
// Un pays = une ligne dans ce tableau ; le builder produit le FiscalParameterSet.

interface ProvisionalCountry {
  code: string;
  label: string;
  currency: 'XOF' | 'XAF';
  is: number;         // taux IS standard (%)
  min: number;        // taux minimum / IMF (% du CA)
  floor?: number;     // plancher minimum
  vat: number;        // TVA standard (%)
  deficit: number;    // années de report déficitaire
  notes?: string;
}

const OHADA_PROVISIONAL_COUNTRIES: ProvisionalCountry[] = [
  // ── UEMOA (XOF) ────────────────────────────────────────────────────────────
  { code: 'BJ', label: 'Bénin',          currency: 'XOF', is: 30,   min: 0.5, floor: 250_000, vat: 18, deficit: 3 },
  { code: 'BF', label: 'Burkina Faso',   currency: 'XOF', is: 27.5, min: 0.5, floor: 1_000_000, vat: 18, deficit: 4 },
  { code: 'GW', label: 'Guinée-Bissau',  currency: 'XOF', is: 25,   min: 1,   vat: 17, deficit: 3, notes: 'TVA récemment introduite — vérifier le taux applicable.' },
  { code: 'ML', label: 'Mali',           currency: 'XOF', is: 30,   min: 1,   vat: 18, deficit: 3 },
  { code: 'NE', label: 'Niger',          currency: 'XOF', is: 30,   min: 1,   vat: 19, deficit: 3 },
  { code: 'SN', label: 'Sénégal',        currency: 'XOF', is: 30,   min: 0.5, floor: 500_000, vat: 18, deficit: 3 },
  { code: 'TG', label: 'Togo',           currency: 'XOF', is: 27,   min: 1,   vat: 18, deficit: 3 },
  // ── CEMAC (XAF) ────────────────────────────────────────────────────────────
  { code: 'CM', label: 'Cameroun',       currency: 'XAF', is: 33,   min: 2.2, vat: 19.25, deficit: 4, notes: 'IS 33 % = 30 % + 10 % CAC (centimes additionnels communaux).' },
  { code: 'CF', label: 'Centrafrique',   currency: 'XAF', is: 30,   min: 1,   vat: 19, deficit: 3 },
  { code: 'CG', label: 'Congo',          currency: 'XAF', is: 28,   min: 1,   vat: 18.9, deficit: 3 },
  { code: 'GA', label: 'Gabon',          currency: 'XAF', is: 30,   min: 1,   vat: 18, deficit: 3 },
  { code: 'GQ', label: 'Guinée équatoriale', currency: 'XAF', is: 35, min: 1.5, vat: 15, deficit: 3 },
  { code: 'TD', label: 'Tchad',          currency: 'XAF', is: 35,   min: 1.5, vat: 18, deficit: 4 },
];

const OHADA_PROVISIONAL_2026: FiscalParameterSet[] = OHADA_PROVISIONAL_COUNTRIES.map(c => ({
  countryCode: c.code,
  fiscalYear: 2026,
  legalReference: `CGI ${c.label} — taux standard (indicatif)`,
  currency: c.currency,
  is: { rateStandard: c.is, minimumRate: c.min, minimumFloor: c.floor ?? 0 },
  deficitCarryForwardYears: c.deficit,
  irppBrackets: [],
  vatRateStandard: c.vat,
  fiscalAdjustments: baselineAdjustments(c.label),
  provisional: true,
  notes: c.notes,
}));

// ============================================================================
// JEUX DE PARAMÈTRES VERSIONNÉS
// ============================================================================
//
// Une entrée = une (loi de finances, pays). Ajouter 2027 = ajouter un objet.

const PARAMETER_SETS: FiscalParameterSet[] = [
  // ── Côte d'Ivoire ─────────────────────────────────────────────────────────
  {
    countryCode: 'CI',
    fiscalYear: 2024,
    legalReference: 'Loi de finances 2024 (Côte d’Ivoire)',
    currency: 'XOF',
    is: { rateStandard: 25, minimumRate: 0.5, minimumFloor: 3_000_000 },
    deficitCarryForwardYears: 5,
    irppBrackets: CI_IRPP_BRACKETS,
    vatRateStandard: 18,
    fiscalAdjustments: CI_ADJUSTMENTS,
  },
  {
    countryCode: 'CI',
    fiscalYear: 2025,
    legalReference: 'Loi de finances 2025 (Côte d’Ivoire)',
    currency: 'XOF',
    is: { rateStandard: 25, minimumRate: 0.5, minimumFloor: 3_000_000 },
    deficitCarryForwardYears: 5,
    irppBrackets: CI_IRPP_BRACKETS,
    vatRateStandard: 18,
    fiscalAdjustments: CI_ADJUSTMENTS,
  },
  {
    countryCode: 'CI',
    fiscalYear: 2026,
    legalReference: 'Loi de finances 2026 (Côte d’Ivoire)',
    currency: 'XOF',
    is: { rateStandard: 25, minimumRate: 0.5, minimumFloor: 3_000_000 },
    deficitCarryForwardYears: 5,
    irppBrackets: CI_IRPP_BRACKETS,
    vatRateStandard: 18,
    fiscalAdjustments: CI_ADJUSTMENTS,
  },
  // ── Autres pays OHADA — jeux INDICATIFS (taux têtes de chapitre) ───────────
  // ⚠️ IS/TVA/minimum standard, documentés mais NON certifiés contre la loi de
  // finances en vigueur. `provisional: true` → la détermination avertit.
  // Les barèmes IRPP (paie) sont laissés vides ici : ils relèvent d'Atlas People
  // et ne sont pas utilisés par la détermination de l'IS.
  ...OHADA_PROVISIONAL_2026,
];

// ============================================================================
// RÉSOLUTION
// ============================================================================

export interface FiscalParameterResolution {
  parameters: FiscalParameterSet;
  /** Vrai si le jeu exact (pays, année) n'existait pas et qu'on a replié. */
  fallback: boolean;
  /** Vrai si le jeu appliqué est INDICATIF (taux à valider). */
  provisional: boolean;
  /** Message d'avertissement si repli, provisoire ou pays inconnu. */
  warning?: string;
}

/** Avertissement de prudence pour un jeu indicatif. */
function provisionalWarning(p: FiscalParameterSet): string {
  return (
    `Paramètres fiscaux INDICATIFS pour ${p.countryCode} (${p.legalReference}) : ` +
    `IS ${p.is.rateStandard} %, TVA ${p.vatRateStandard} %, minimum ${p.is.minimumRate} %. ` +
    `À VALIDER contre la loi de finances en vigueur avant toute déclaration.` +
    (p.notes ? ` ${p.notes}` : '')
  );
}

/**
 * Résout le jeu de paramètres applicable à un (pays, exercice).
 *
 * Une loi de finances reste en vigueur tant qu'une plus récente ne l'a pas
 * remplacée : à défaut de jeu exact, on replie sur l'année la PLUS RÉCENTE
 * ≤ fiscalYear du même pays (avec avertissement). Pays totalement inconnu →
 * repli sur CI (référentiel de départ) avec avertissement fort.
 */
export function resolveFiscalParameters(
  countryCode: string,
  fiscalYear: number,
): FiscalParameterResolution {
  const exact = PARAMETER_SETS.find(
    p => p.countryCode === countryCode && p.fiscalYear === fiscalYear,
  );
  if (exact) {
    return {
      parameters: exact,
      fallback: false,
      provisional: Boolean(exact.provisional),
      warning: exact.provisional ? provisionalWarning(exact) : undefined,
    };
  }

  // Repli : loi antérieure la plus récente du même pays.
  const earlier = PARAMETER_SETS
    .filter(p => p.countryCode === countryCode && p.fiscalYear < fiscalYear)
    .sort((a, b) => b.fiscalYear - a.fiscalYear);
  if (earlier.length > 0) {
    const base =
      `Aucune loi de finances ${fiscalYear} pour ${countryCode} — application de ` +
      `${earlier[0].legalReference} (dernière en vigueur). Vérifier les évolutions.`;
    return {
      parameters: earlier[0],
      fallback: true,
      provisional: Boolean(earlier[0].provisional),
      warning: earlier[0].provisional ? `${base} ${provisionalWarning(earlier[0])}` : base,
    };
  }

  // Aucun jeu pour ce pays : repli CI, avertissement fort.
  const ci = PARAMETER_SETS
    .filter(p => p.countryCode === 'CI')
    .sort((a, b) => b.fiscalYear - a.fiscalYear)[0];
  return {
    parameters: ci,
    fallback: true,
    provisional: true,
    warning:
      `Aucun paramétrage fiscal pour le pays « ${countryCode} » — repli sur le ` +
      `référentiel CI. Créer un jeu de paramètres pour ce pays avant toute déclaration.`,
  };
}

/** Liste des pays disposant d'au moins un jeu de paramètres. */
export function getFiscalCountries(): string[] {
  return [...new Set(PARAMETER_SETS.map(p => p.countryCode))].sort();
}

/** Exercices disponibles pour un pays donné. */
export function getFiscalYears(countryCode: string): number[] {
  return PARAMETER_SETS
    .filter(p => p.countryCode === countryCode)
    .map(p => p.fiscalYear)
    .sort((a, b) => b - a);
}
