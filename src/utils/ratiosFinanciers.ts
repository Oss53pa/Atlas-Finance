/**
 * Ratios financiers et SIG — SYSCOHADA Révisé 2017
 * Soldes Intermédiaires de Gestion, ratios, CAF, BFR, seuil de rentabilité.
 * Utilise Money class pour la précision financière.
 */
import { Money, money } from './money';

// ---------------------------------------------------------------------------
// SIG — Soldes Intermédiaires de Gestion
// ---------------------------------------------------------------------------

export interface SIGInput {
  /** 70x - Ventes de marchandises */
  ventesMarchandises: number;
  /** 60x - Achats de marchandises */
  achatsMarchandises: number;
  /** ±603 - Variation de stock marchandises */
  variationStockMarchandises: number;
  /** 71x, 72x - Production vendue, stockée, immobilisée */
  productionVendue: number;
  productionStockee: number;
  productionImmobilisee: number;
  /** 601, 602 - Achats matières et approvisionnements */
  achatsMatieresApprovisionnements: number;
  /** ±603x - Variation stock matières */
  variationStockMatieres: number;
  /** 604..608 - Autres achats et charges externes */
  autresAchatsChargesExternes: number;
  /** 75x - Autres produits d'exploitation */
  autresProduits: number;
  /** 65x - Autres charges d'exploitation */
  autresCharges: number;
  /** 63x - Impôts et taxes */
  impotsTaxes: number;
  /** 66x - Charges de personnel */
  chargesPersonnel: number;
  /** 681 - Dotations amortissements et provisions */
  dotationsAmortissements: number;
  /** 791 - Reprises provisions d'exploitation */
  reprisesProvisions: number;
  /** 77x - Produits financiers */
  produitsFinanciers: number;
  /** 67x - Charges financières */
  chargesFinancieres: number;
  /** 84x - Produits HAO */
  produitsHAO: number;
  /** 85x - Charges HAO */
  chargesHAO: number;
  /** 87x - Impôts sur résultat */
  impotsSurResultat: number;
  /** 79x - Reprises financières */
  reprisesFinancieres?: number;
  /** 687 - Dotations financières */
  dotationsFinancieres?: number;
}

export interface SIGResult {
  margeCommerciale: Money;
  productionExercice: Money;
  valeurAjoutee: Money;
  excedentBrutExploitation: Money;
  resultatExploitation: Money;
  resultatFinancier: Money;
  resultatActivitesOrdinaires: Money;
  resultatHAO: Money;
  resultatNet: Money;
}

export function calculerSIG(input: SIGInput): SIGResult {
  // 1. Marge commerciale = Ventes marchandises - (Achats marchandises ± Variation stock)
  const coutAchatMarchandises = money(input.achatsMarchandises).add(input.variationStockMarchandises);
  const margeCommerciale = money(input.ventesMarchandises).subtract(coutAchatMarchandises);

  // 2. Production de l'exercice
  const productionExercice = money(input.productionVendue)
    .add(input.productionStockee)
    .add(input.productionImmobilisee);

  // 3. Valeur Ajoutée = Marge commerciale + Production - Consommations intermédiaires
  const consommationsIntermediaires = money(input.achatsMatieresApprovisionnements)
    .add(input.variationStockMatieres)
    .add(input.autresAchatsChargesExternes);
  const valeurAjoutee = margeCommerciale
    .add(productionExercice)
    .subtract(consommationsIntermediaires)
    .add(input.autresProduits)
    .subtract(input.autresCharges);

  // 4. EBE = VA - Impôts & taxes - Charges de personnel
  const excedentBrutExploitation = valeurAjoutee
    .subtract(input.impotsTaxes)
    .subtract(input.chargesPersonnel);

  // 5. Résultat d'exploitation = EBE + Reprises - Dotations
  const resultatExploitation = excedentBrutExploitation
    .add(input.reprisesProvisions)
    .subtract(input.dotationsAmortissements);

  // 6. Résultat financier = Produits financiers - Charges financières
  const resultatFinancier = money(input.produitsFinanciers)
    .add(input.reprisesFinancieres || 0)
    .subtract(input.chargesFinancieres)
    .subtract(input.dotationsFinancieres || 0);

  // 7. Résultat des activités ordinaires = RE + RF
  const resultatActivitesOrdinaires = resultatExploitation.add(resultatFinancier);

  // 8. Résultat HAO = Produits HAO - Charges HAO
  const resultatHAO = money(input.produitsHAO).subtract(input.chargesHAO);

  // 9. Résultat net = RAO + RHAO - Impôts
  const resultatNet = resultatActivitesOrdinaires
    .add(resultatHAO)
    .subtract(input.impotsSurResultat);

  return {
    margeCommerciale,
    productionExercice,
    valeurAjoutee,
    excedentBrutExploitation,
    resultatExploitation,
    resultatFinancier,
    resultatActivitesOrdinaires,
    resultatHAO,
    resultatNet,
  };
}

// ---------------------------------------------------------------------------
// Ratios financiers
// ---------------------------------------------------------------------------

export interface BilanData {
  actifImmobilise: number;
  actifCirculant: number;
  tresorerieActif: number;
  capitauxPropres: number;
  dettesFinancieres: number;
  dettesCirculantes: number;
  tresoreriePassif: number;
  totalActif: number;
  totalPassif: number;
  stocks: number;
  creancesClients: number;
  dettesFournisseurs: number;
}

export interface RatiosResult {
  // Rentabilité
  roe: number;              // Return on equity
  roa: number;              // Return on assets
  roce: number;             // Return on capital employed
  margeNette: number;       // Résultat net / CA
  margeBrute: number;       // Marge commerciale / CA
  margeExploitation: number; // RE / CA

  // Structure
  autonomieFinanciere: number;    // Capitaux propres / Total passif
  endettementNet: number;         // Dettes financières / Capitaux propres
  capaciteRemboursement: number;  // Dettes financières / CAF

  // Liquidité
  liquiditeGenerale: number;  // Actif circulant / Dettes circulantes
  liquiditeReduite: number;   // (AC - Stocks) / Dettes circulantes
  liquiditeImmediate: number; // Trésorerie / Dettes circulantes

  // Rotation
  rotationStocks: number;         // Jours
  delaiClients: number;           // Jours
  delaiFournisseurs: number;      // Jours
}

export function calculerRatios(
  bilan: BilanData,
  resultatNet: number,
  chiffreAffaires: number,
  margeCommerciale: number,
  resultatExploitation: number,
  caf: number,
  achats: number
): RatiosResult {
  const ca = chiffreAffaires || 1; // Avoid division by zero

  return {
    // Rentabilité
    roe: bilan.capitauxPropres > 0
      ? money(resultatNet).divide(bilan.capitauxPropres).multiply(100).round(2).toNumber()
      : 0,
    roa: bilan.totalActif > 0
      ? money(resultatNet).divide(bilan.totalActif).multiply(100).round(2).toNumber()
      : 0,
    roce: (bilan.capitauxPropres + bilan.dettesFinancieres) > 0
      ? money(resultatExploitation).divide(bilan.capitauxPropres + bilan.dettesFinancieres).multiply(100).round(2).toNumber()
      : 0,
    margeNette: money(resultatNet).divide(ca).multiply(100).round(2).toNumber(),
    margeBrute: money(margeCommerciale).divide(ca).multiply(100).round(2).toNumber(),
    margeExploitation: money(resultatExploitation).divide(ca).multiply(100).round(2).toNumber(),

    // Structure
    autonomieFinanciere: bilan.totalPassif > 0
      ? money(bilan.capitauxPropres).divide(bilan.totalPassif).multiply(100).round(2).toNumber()
      : 0,
    endettementNet: bilan.capitauxPropres > 0
      ? money(bilan.dettesFinancieres).divide(bilan.capitauxPropres).multiply(100).round(2).toNumber()
      : 0,
    capaciteRemboursement: caf > 0
      ? money(bilan.dettesFinancieres).divide(caf).round(2).toNumber()
      : 0,

    // Liquidité
    liquiditeGenerale: bilan.dettesCirculantes > 0
      ? money(bilan.actifCirculant).divide(bilan.dettesCirculantes).round(2).toNumber()
      : 0,
    liquiditeReduite: bilan.dettesCirculantes > 0
      ? money(bilan.actifCirculant - bilan.stocks).divide(bilan.dettesCirculantes).round(2).toNumber()
      : 0,
    liquiditeImmediate: bilan.dettesCirculantes > 0
      ? money(bilan.tresorerieActif).divide(bilan.dettesCirculantes).round(2).toNumber()
      : 0,

    // Rotation (en jours)
    rotationStocks: achats > 0
      ? money(bilan.stocks).divide(achats).multiply(365).round(0).toNumber()
      : 0,
    delaiClients: ca > 0
      ? money(bilan.creancesClients).divide(ca).multiply(365).round(0).toNumber()
      : 0,
    delaiFournisseurs: achats > 0
      ? money(bilan.dettesFournisseurs).divide(achats).multiply(365).round(0).toNumber()
      : 0,
  };
}

// ---------------------------------------------------------------------------
// CAF — Capacité d'Autofinancement (méthode additive)
// ---------------------------------------------------------------------------

export interface CAFInput {
  resultatNet: number;
  dotationsAmortissements: number;
  dotationsProvisions: number;
  reprisesProvisions: number;
  plusValuesCessions: number;
  moinsValuesCessions: number;
}

export function calculerCAF(input: CAFInput): Money {
  return money(input.resultatNet)
    .add(input.dotationsAmortissements)
    .add(input.dotationsProvisions)
    .subtract(input.reprisesProvisions)
    .subtract(input.plusValuesCessions)
    .add(input.moinsValuesCessions);
}

// ---------------------------------------------------------------------------
// BFR / FR / Trésorerie Nette
// ---------------------------------------------------------------------------

export interface FRBFRResult {
  fondsRoulement: Money;
  besoinFondsRoulement: Money;
  tresorerieNette: Money;
}

export function calculerFRBFR(bilan: BilanData): FRBFRResult {
  // FR = Capitaux permanents - Actif immobilisé
  const capitauxPermanents = money(bilan.capitauxPropres).add(bilan.dettesFinancieres);
  const fondsRoulement = capitauxPermanents.subtract(bilan.actifImmobilise);

  // BFR = Actif circulant - Dettes circulantes
  const besoinFondsRoulement = money(bilan.actifCirculant).subtract(bilan.dettesCirculantes);

  // Trésorerie nette = FR - BFR = Trésorerie actif - Trésorerie passif
  const tresorerieNette = fondsRoulement.subtract(besoinFondsRoulement);

  return { fondsRoulement, besoinFondsRoulement, tresorerieNette };
}

// ---------------------------------------------------------------------------
// Seuil de rentabilité / Point mort
// ---------------------------------------------------------------------------

export interface SeuilRentabiliteInput {
  chiffreAffaires: number;
  chargesVariables: number;
  chargesFixes: number;
}

export interface SeuilRentabiliteResult {
  margesSurCoutsVariables: Money;
  tauxMarge: number;        // en %
  seuilRentabilite: Money;  // en valeur
  pointMort: number;        // en jours
  indiceSecurite: number;   // en %
}

export function calculerSeuilRentabilite(input: SeuilRentabiliteInput): SeuilRentabiliteResult {
  const ca = money(input.chiffreAffaires);
  const cv = money(input.chargesVariables);
  const cf = money(input.chargesFixes);

  // Marge sur coûts variables = CA - CV
  const mscv = ca.subtract(cv);

  // Taux de marge = MSCV / CA * 100
  const tauxMarge = ca.isPositive()
    ? mscv.divide(ca.toNumber()).multiply(100).round(2).toNumber()
    : 0;

  // Seuil de rentabilité = CF / Taux de marge * 100
  const seuilRentabilite = tauxMarge > 0
    ? cf.divide(tauxMarge).multiply(100).round(0)
    : money(0);

  // Point mort = SR / CA * 365
  const pointMort = ca.isPositive()
    ? seuilRentabilite.divide(ca.toNumber()).multiply(365).round(0).toNumber()
    : 0;

  // Indice de sécurité = (CA - SR) / CA * 100
  const indiceSecurite = ca.isPositive()
    ? ca.subtract(seuilRentabilite).divide(ca.toNumber()).multiply(100).round(2).toNumber()
    : 0;

  return {
    margesSurCoutsVariables: mscv,
    tauxMarge,
    seuilRentabilite,
    pointMort,
    indiceSecurite,
  };
}
