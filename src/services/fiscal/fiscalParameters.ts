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
  // ── Squelettes multi-pays (taux IS connus, ajustements de base) ────────────
  {
    countryCode: 'SN',
    fiscalYear: 2026,
    legalReference: 'CGI Sénégal (à compléter)',
    currency: 'XOF',
    is: { rateStandard: 30, minimumRate: 0.5, minimumFloor: 500_000 },
    deficitCarryForwardYears: 3,
    irppBrackets: [],
    vatRateStandard: 18,
    fiscalAdjustments: baselineAdjustments('Sénégal'),
  },
  {
    countryCode: 'BJ',
    fiscalYear: 2026,
    legalReference: 'CGI Bénin (à compléter)',
    currency: 'XOF',
    is: { rateStandard: 30, minimumRate: 0.5, minimumFloor: 250_000 },
    deficitCarryForwardYears: 3,
    irppBrackets: [],
    vatRateStandard: 18,
    fiscalAdjustments: baselineAdjustments('Bénin'),
  },
  {
    countryCode: 'CM',
    fiscalYear: 2026,
    legalReference: 'CGI Cameroun (à compléter)',
    currency: 'XAF',
    is: { rateStandard: 33, minimumRate: 2.2, minimumFloor: 0 },
    deficitCarryForwardYears: 4,
    irppBrackets: [],
    vatRateStandard: 19.25,
    fiscalAdjustments: baselineAdjustments('Cameroun'),
  },
];

// ============================================================================
// RÉSOLUTION
// ============================================================================

export interface FiscalParameterResolution {
  parameters: FiscalParameterSet;
  /** Vrai si le jeu exact (pays, année) n'existait pas et qu'on a replié. */
  fallback: boolean;
  /** Message d'avertissement si repli ou pays inconnu. */
  warning?: string;
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
  if (exact) return { parameters: exact, fallback: false };

  // Repli : loi antérieure la plus récente du même pays.
  const earlier = PARAMETER_SETS
    .filter(p => p.countryCode === countryCode && p.fiscalYear < fiscalYear)
    .sort((a, b) => b.fiscalYear - a.fiscalYear);
  if (earlier.length > 0) {
    return {
      parameters: earlier[0],
      fallback: true,
      warning:
        `Aucune loi de finances ${fiscalYear} pour ${countryCode} — application de ` +
        `${earlier[0].legalReference} (dernière en vigueur). Vérifier les évolutions.`,
    };
  }

  // Aucun jeu pour ce pays : repli CI, avertissement fort.
  const ci = PARAMETER_SETS
    .filter(p => p.countryCode === 'CI')
    .sort((a, b) => b.fiscalYear - a.fiscalYear)[0];
  return {
    parameters: ci,
    fallback: true,
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
