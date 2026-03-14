/**
 * Service de génération des états financiers SYSCOHADA.
 * Calcule Bilan, Compte de Résultat, SIG, Ratios et Bilan Fonctionnel
 * depuis les écritures Dexie (journalEntries).
 *
 * Conforme SYSCOHADA révisé — Plan comptable OHADA.
 */
import type { DataAdapter } from '@atlas/data';
import type { DBJournalEntry, DBFiscalYear } from '../../../lib/db';
import { money } from '../../../utils/money';
import {
  Bilan,
  BilanActif,
  BilanPassif,
  BilanWarning,
  CompteResultat,
  SIG,
  RatiosFinanciers,
  BilanFonctionnel,
  FinancialStatementsData,
  FinancialComparison,
} from '../types/financialStatements.types';

// ============================================================================
// RPC HELPER (Supabase SaaS mode)
// ============================================================================

/**
 * Try to call a Supabase RPC function via the adapter.
 * Returns null if the adapter doesn't support RPC (Dexie/local mode).
 */
async function tryRPC(adapter: DataAdapter, rpcName: string, params: Record<string, unknown>): Promise<any | null> {
  try {
    if (typeof adapter.rpc === 'function') {
      return await adapter.rpc(rpcName, params);
    }
    return null;
  } catch (err) {
    console.warn(`[FinancialStatements] RPC ${rpcName} failed, falling back to JS calculation:`, err);
    return null;
  }
}

/**
 * Map RPC bilan result to the TypeScript Bilan type.
 * The RPC returns snake_case fields; we map to our camelCase interfaces.
 */
function mapRPCToBilan(rpcData: any, exercice: string): Bilan {
  const d = rpcData;
  const actif: BilanActif = {
    immobilisationsIncorporelles: d.immobilisations_incorporelles ?? d.immobilisationsIncorporelles ?? 0,
    immobilisationsCorporelles: d.immobilisations_corporelles ?? d.immobilisationsCorporelles ?? 0,
    immobilisationsFinancieres: d.immobilisations_financieres ?? d.immobilisationsFinancieres ?? 0,
    totalActifImmobilise: d.total_actif_immobilise ?? d.totalActifImmobilise ?? 0,
    stocks: d.stocks ?? 0,
    creancesClients: d.creances_clients ?? d.creancesClients ?? 0,
    autresCreances: d.autres_creances ?? d.autresCreances ?? 0,
    tresorerieActif: d.tresorerie_actif ?? d.tresorerieActif ?? 0,
    totalActifCirculant: d.total_actif_circulant ?? d.totalActifCirculant ?? 0,
    totalActif: d.total_actif ?? d.totalActif ?? 0,
  };

  const passif: BilanPassif = {
    capitalSocial: d.capital_social ?? d.capitalSocial ?? 0,
    reserves: d.reserves ?? 0,
    resultatEnInstance: d.resultat_en_instance ?? d.resultatEnInstance ?? 0,
    provisionsReglementees: d.provisions_reglementees ?? d.provisionsReglementees ?? 0,
    subventionsInvestissement: d.subventions_investissement ?? d.subventionsInvestissement ?? 0,
    resultatExercice: d.resultat_exercice ?? d.resultatExercice ?? 0,
    capitauxPropres: d.capitaux_propres ?? d.capitauxPropres ?? 0,
    emprunts: d.emprunts ?? 0,
    dettesFinancieres: d.dettes_financieres ?? d.dettesFinancieres ?? 0,
    dettesParticipations: d.dettes_participations ?? d.dettesParticipations ?? 0,
    provisionsRisques: d.provisions_risques ?? d.provisionsRisques ?? 0,
    dettesFournisseurs: d.dettes_fournisseurs ?? d.dettesFournisseurs ?? 0,
    autresDettes: d.autres_dettes ?? d.autresDettes ?? 0,
    totalPassif: d.total_passif ?? d.totalPassif ?? 0,
  };

  return {
    actif,
    passif,
    exercice,
    dateEtablissement: d.date_etablissement ?? new Date().toISOString(),
    tresoreriePassive: d.tresorerie_passive ?? d.tresoreriePassive ?? 0,
    warnings: d.warnings ?? [],
  };
}

/**
 * Map RPC compte de résultat result to the TypeScript CompteResultat type.
 */
function mapRPCToCompteResultat(rpcData: any, exercice: string): CompteResultat {
  const d = rpcData;
  return {
    chiffreAffaires: d.chiffre_affaires ?? d.chiffreAffaires ?? 0,
    productionVendue: d.production_vendue ?? d.productionVendue ?? 0,
    productionStockee: d.production_stockee ?? d.productionStockee ?? 0,
    productionImmobilisee: d.production_immobilisee ?? d.productionImmobilisee ?? 0,
    subventionsExploitation: d.subventions_exploitation ?? d.subventionsExploitation ?? 0,
    autresProduitsExploitation: d.autres_produits_exploitation ?? d.autresProduitsExploitation ?? 0,
    totalProduitsExploitation: d.total_produits_exploitation ?? d.totalProduitsExploitation ?? 0,
    achatsConsommes: d.achats_consommes ?? d.achatsConsommes ?? 0,
    servicesExterieurs: d.services_exterieurs ?? d.servicesExterieurs ?? 0,
    chargesPersonnel: d.charges_personnel ?? d.chargesPersonnel ?? 0,
    impotsTaxes: d.impots_taxes ?? d.impotsTaxes ?? 0,
    dotationsAmortissements: d.dotations_amortissements ?? d.dotationsAmortissements ?? 0,
    autresChargesExploitation: d.autres_charges_exploitation ?? d.autresChargesExploitation ?? 0,
    totalChargesExploitation: d.total_charges_exploitation ?? d.totalChargesExploitation ?? 0,
    resultatExploitation: d.resultat_exploitation ?? d.resultatExploitation ?? 0,
    produitsFinanciers: d.produits_financiers ?? d.produitsFinanciers ?? 0,
    chargesFinancieres: d.charges_financieres ?? d.chargesFinancieres ?? 0,
    resultatFinancier: d.resultat_financier ?? d.resultatFinancier ?? 0,
    resultatCourant: d.resultat_courant ?? d.resultatCourant ?? 0,
    produitsExceptionnels: d.produits_exceptionnels ?? d.produitsExceptionnels ?? 0,
    chargesExceptionnelles: d.charges_exceptionnelles ?? d.chargesExceptionnelles ?? 0,
    resultatExceptionnel: d.resultat_exceptionnel ?? d.resultatExceptionnel ?? 0,
    impotsSocietes: d.impots_societes ?? d.impotsSocietes ?? 0,
    resultatNet: d.resultat_net ?? d.resultatNet ?? 0,
    exercice,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Sum debit-credit for account codes matching a prefix, within a set of entries.
 * Returns net debit (positive = debit balance, negative = credit balance).
 */
function netByPrefix(entries: DBJournalEntry[], ...prefixes: string[]): number {
  let total = 0;
  for (const entry of entries) {
    for (const line of entry.lines) {
      if (prefixes.some(p => line.accountCode.startsWith(p))) {
        total += line.debit - line.credit;
      }
    }
  }
  return total;
}

/**
 * Sum only debits for matching accounts.
 */
function debitByPrefix(entries: DBJournalEntry[], ...prefixes: string[]): number {
  let total = 0;
  for (const entry of entries) {
    for (const line of entry.lines) {
      if (prefixes.some(p => line.accountCode.startsWith(p))) {
        total += line.debit;
      }
    }
  }
  return total;
}

/**
 * Sum only credits for matching accounts.
 */
function creditByPrefix(entries: DBJournalEntry[], ...prefixes: string[]): number {
  let total = 0;
  for (const entry of entries) {
    for (const line of entry.lines) {
      if (prefixes.some(p => line.accountCode.startsWith(p))) {
        total += line.credit;
      }
    }
  }
  return total;
}

/**
 * Load entries for a fiscal year (by exercice ID or date range).
 */
async function loadEntriesForExercice(adapter: DataAdapter, exercice: string): Promise<DBJournalEntry[]> {
  // Try to find fiscal year by ID or code
  let fy = await adapter.getById('fiscalYears', exercice) as DBFiscalYear | undefined;
  if (!fy) {
    const allFY = await adapter.getAll('fiscalYears', { where: { code: exercice } }) as DBFiscalYear[];
    fy = allFY[0] || undefined;
  }

  if (fy) {
    const allEntries = await adapter.getAll('journalEntries');
    return allEntries.filter((e: DBJournalEntry) => e.date >= fy!.startDate && e.date <= fy!.endDate);
  }

  // Fallback: treat as year string (e.g. "2025") → Jan 1 to Dec 31
  if (/^\d{4}$/.test(exercice)) {
    const allEntries = await adapter.getAll('journalEntries');
    return allEntries.filter((e: DBJournalEntry) => e.date >= `${exercice}-01-01` && e.date <= `${exercice}-12-31`);
  }

  // Last resort: all entries
  return adapter.getAll('journalEntries');
}

/** Safe division (avoid NaN/Infinity) */
function safeDivide(a: number, b: number): number {
  if (b === 0) return 0;
  return a / b;
}

// ============================================================================
// BILAN SYSCOHADA
// ============================================================================

function computeBilan(entries: DBJournalEntry[], exercice: string): Bilan {
  const warnings: BilanWarning[] = [];

  // ACTIF — SYSCOHADA classes 2 (immobilisé), 3 (stocks), 4 débit (créances), 5 débit (trésorerie)
  const immobilisationsIncorporelles = netByPrefix(entries, '21');
  const immobilisationsCorporelles = netByPrefix(entries, '22', '23', '24');
  const immobilisationsFinancieres = netByPrefix(entries, '25', '26', '27');
  const amortissements = netByPrefix(entries, '28'); // credit balance → negative
  const totalActifImmobilise = money(immobilisationsIncorporelles)
    .add(immobilisationsCorporelles)
    .add(immobilisationsFinancieres)
    .add(amortissements)
    .toNumber();

  const stocks = netByPrefix(entries, '3');
  const creancesClients = netByPrefix(entries, '41');

  // P1-1b: Comptes 42-47 — séparer soldes débiteurs (actif) et créditeurs (passif)
  const autresCreancesRaw = netByPrefix(entries, '42', '43', '44', '45', '46', '47');
  const autresCreances = Math.max(0, autresCreancesRaw);
  const autresDettesFromCreances = Math.max(0, -autresCreancesRaw);

  // P1-1c: Trésorerie — séparer actif (hors 519) et passif (519 = découverts)
  const tresorerieActif = netByPrefix(entries, '50', '51', '52', '53', '54', '55', '56', '57', '58');
  const tresoreriePassive = Math.max(0, -netByPrefix(entries, '519'));

  const totalActifCirculant = money(stocks)
    .add(creancesClients)
    .add(autresCreances)
    .add(Math.max(0, tresorerieActif))
    .toNumber();

  const totalActif = money(totalActifImmobilise).add(totalActifCirculant).toNumber();

  // P1-1a: Signal anomalies instead of silently masking with Math.max(0,...)
  const immoCorpNet = money(immobilisationsCorporelles).add(amortissements).toNumber();
  if (immobilisationsIncorporelles < 0) warnings.push({ field: 'immobilisationsIncorporelles', message: 'Actif incorporel négatif — vérifier les écritures de la classe 21', amount: immobilisationsIncorporelles });
  if (immoCorpNet < 0) warnings.push({ field: 'immobilisationsCorporelles', message: 'Actif corporel net négatif — amortissements excessifs sur classes 22-24', amount: immoCorpNet });
  if (stocks < 0) warnings.push({ field: 'stocks', message: 'Stocks négatifs — vérifier les mouvements de la classe 3', amount: stocks });
  if (tresorerieActif < 0) warnings.push({ field: 'tresorerieActif', message: 'Trésorerie négative — vérifier les comptes de la classe 5', amount: tresorerieActif });

  const actif: BilanActif = {
    immobilisationsIncorporelles,
    immobilisationsCorporelles: immoCorpNet,
    immobilisationsFinancieres,
    totalActifImmobilise,
    stocks,
    creancesClients,
    autresCreances,
    tresorerieActif: Math.max(0, tresorerieActif),
    totalActifCirculant,
    totalActif,
  };

  // PASSIF — SYSCOHADA class 1 (capitaux), 4 crédit (dettes), 5 crédit (trésorerie passif)
  const capitalSocial = Math.abs(netByPrefix(entries, '10'));
  const reserves = Math.abs(netByPrefix(entries, '11'));
  const reportANouveau = -netByPrefix(entries, '12');
  // AF-024: Comptes 13-15 manquants dans capitaux propres
  const resultatEnInstance = -netByPrefix(entries, '13'); // Résultat net en instance d'affectation
  const provisionsReglementees = Math.abs(netByPrefix(entries, '14')); // Provisions réglementées
  const subventionsInvestissement = Math.abs(netByPrefix(entries, '15')); // Subventions d'investissement
  const resultatExercice = computeResultatNet(entries);
  const capitauxPropres = money(capitalSocial).add(reserves).add(reportANouveau)
    .add(resultatEnInstance).add(provisionsReglementees).add(subventionsInvestissement)
    .add(resultatExercice).toNumber();

  const emprunts = Math.abs(netByPrefix(entries, '16'));
  const dettesFinancieres = Math.abs(netByPrefix(entries, '17'));
  // AF-024: Comptes 18-19 manquants dans passif
  const dettesParticipations = Math.abs(netByPrefix(entries, '18')); // Dettes liées à des participations
  const provisionsRisques = Math.abs(netByPrefix(entries, '19')); // Provisions pour risques et charges
  const dettesFournisseurs = Math.abs(netByPrefix(entries, '40'));
  // P1-1b: autresDettes = soldes créditeurs des comptes 42-47 séparés
  const autresDettes = autresDettesFromCreances;

  const totalPassif = money(capitauxPropres)
    .add(emprunts)
    .add(dettesFinancieres)
    .add(dettesParticipations)
    .add(provisionsRisques)
    .add(dettesFournisseurs)
    .add(autresDettes)
    .add(tresoreriePassive)
    .toNumber();

  const passif: BilanPassif = {
    capitalSocial,
    reserves: money(reserves).add(reportANouveau).toNumber(),
    resultatEnInstance: resultatEnInstance,
    provisionsReglementees,
    subventionsInvestissement,
    resultatExercice,
    capitauxPropres,
    emprunts,
    dettesFinancieres,
    dettesParticipations,
    provisionsRisques,
    dettesFournisseurs,
    autresDettes,
    totalPassif,
  };

  return { actif, passif, exercice, dateEtablissement: new Date().toISOString(), tresoreriePassive, warnings };
}

// ============================================================================
// COMPTE DE RÉSULTAT SYSCOHADA
// ============================================================================

function computeResultatNet(entries: DBJournalEntry[]): number {
  // Produits (class 7): credit - debit
  const produits = creditByPrefix(entries, '7') - debitByPrefix(entries, '7');
  // Charges (class 6): debit - credit
  const charges = debitByPrefix(entries, '6') - creditByPrefix(entries, '6');
  return money(produits).subtract(charges).toNumber();
}

function computeCompteResultat(entries: DBJournalEntry[], exercice: string): CompteResultat {
  // PRODUITS D'EXPLOITATION
  const ventesMarc = creditByPrefix(entries, '70') - debitByPrefix(entries, '70');
  // P0-1 FIX: productionVendue = uniquement compte 70 (pas 71 qui est production stockée)
  const productionVendue = creditByPrefix(entries, '70') - debitByPrefix(entries, '70');
  // Production stockée = variation des stocks de produits (71), poste séparé SYSCOHADA
  const productionStockee = creditByPrefix(entries, '71', '73') - debitByPrefix(entries, '71', '73');
  const productionImmobilisee = creditByPrefix(entries, '72') - debitByPrefix(entries, '72');
  const subventionsExploitation = creditByPrefix(entries, '74') - debitByPrefix(entries, '74');
  const autresProduitsExploitation = creditByPrefix(entries, '75', '78', '79') - debitByPrefix(entries, '75', '78', '79');
  const totalProduitsExploitation = money(productionVendue)
    .add(productionStockee).add(productionImmobilisee)
    .add(subventionsExploitation).add(autresProduitsExploitation)
    .toNumber();

  // CHARGES D'EXPLOITATION
  const achatsConsommes = debitByPrefix(entries, '60') - creditByPrefix(entries, '60');
  const servicesExterieurs = debitByPrefix(entries, '61', '62', '63') - creditByPrefix(entries, '61', '62', '63');
  const chargesPersonnel = debitByPrefix(entries, '66') - creditByPrefix(entries, '66');
  const dotationsAmortissements = debitByPrefix(entries, '68') - creditByPrefix(entries, '68');
  const impotsTaxes = debitByPrefix(entries, '64') - creditByPrefix(entries, '64');
  const autresChargesExploitation = debitByPrefix(entries, '65') - creditByPrefix(entries, '65');
  const totalChargesExploitation = money(achatsConsommes)
    .add(servicesExterieurs).add(chargesPersonnel).add(impotsTaxes)
    .add(dotationsAmortissements).add(autresChargesExploitation)
    .toNumber();

  const resultatExploitation = money(totalProduitsExploitation).subtract(totalChargesExploitation).toNumber();

  // FINANCIER
  const produitsFinanciers = creditByPrefix(entries, '77') - debitByPrefix(entries, '77');
  const chargesFinancieres = debitByPrefix(entries, '67') - creditByPrefix(entries, '67');
  const resultatFinancier = money(produitsFinanciers).subtract(chargesFinancieres).toNumber();

  const resultatCourant = money(resultatExploitation).add(resultatFinancier).toNumber();

  // HAO (Hors Activité Ordinaire) — SYSCOHADA specific
  // 81=VNC cessions, 82=Produits cessions, 83=Charges HAO, 84=Produits HAO,
  // 85=Dotations HAO, 86=Reprises HAO, 87=Participation, 88=Subventions
  const produitsExceptionnels = creditByPrefix(entries, '82', '84', '86', '88') - debitByPrefix(entries, '82', '84', '86', '88');
  const chargesExceptionnelles = debitByPrefix(entries, '81', '83', '85', '87') - creditByPrefix(entries, '81', '83', '85', '87');
  const resultatExceptionnel = money(produitsExceptionnels).subtract(chargesExceptionnelles).toNumber();

  // IMPÔT
  const impotsSocietes = debitByPrefix(entries, '89') - creditByPrefix(entries, '89');

  const resultatNet = money(resultatCourant).add(resultatExceptionnel).subtract(impotsSocietes).toNumber();

  return {
    chiffreAffaires: ventesMarc,
    productionVendue,
    productionStockee,
    productionImmobilisee,
    subventionsExploitation,
    autresProduitsExploitation,
    totalProduitsExploitation,
    achatsConsommes,
    servicesExterieurs,
    chargesPersonnel,
    impotsTaxes,
    dotationsAmortissements,
    // P0-2 FIX: autresChargesExploitation ne doit PAS inclure impotsTaxes (déjà dans totalChargesExploitation)
    autresChargesExploitation,
    totalChargesExploitation,
    resultatExploitation,
    produitsFinanciers,
    chargesFinancieres,
    resultatFinancier,
    resultatCourant,
    produitsExceptionnels,
    chargesExceptionnelles,
    resultatExceptionnel,
    impotsSocietes,
    resultatNet,
    exercice,
  };
}

// ============================================================================
// SIG (Soldes Intermédiaires de Gestion) — SYSCOHADA
// ============================================================================

function computeSIG(cr: CompteResultat, entries: DBJournalEntry[]): SIG {
  // Marge commerciale = Ventes de marchandises (701) - Achats de marchandises (601) - Variation stocks marchandises (6031)
  const ventesMarc = creditByPrefix(entries, '701') - debitByPrefix(entries, '701');
  const achatsMarc = debitByPrefix(entries, '601') - creditByPrefix(entries, '601');
  const varStocksMarc = debitByPrefix(entries, '6031') - creditByPrefix(entries, '6031');
  const margeCommerciale = money(ventesMarc).subtract(achatsMarc).subtract(varStocksMarc).toNumber();

  // Production de l'exercice = Production vendue + stockée + immobilisée
  const productionExercice = money(cr.productionVendue).add(cr.productionStockee).add(cr.productionImmobilisee).toNumber();

  // Valeur ajoutée = Marge commerciale + Production exercice - Consommations intermédiaires
  const consommations = money(cr.achatsConsommes).add(cr.servicesExterieurs).toNumber();
  const valeurAjoutee = money(margeCommerciale).add(productionExercice).subtract(consommations).toNumber();

  // EBE = VA + Subventions - Charges personnel - Impôts & taxes
  const impotsTaxes = debitByPrefix(entries, '64') - creditByPrefix(entries, '64');
  const excedentBrutExploitation = money(valeurAjoutee)
    .add(cr.subventionsExploitation)
    .subtract(cr.chargesPersonnel)
    .subtract(impotsTaxes)
    .toNumber();

  // CAF = Résultat net + Dotations amort/prov - Reprises + VNC cessions (81) - Produits cessions (82)
  const reprises = creditByPrefix(entries, '78', '79') - debitByPrefix(entries, '78', '79');
  const vncCessions = debitByPrefix(entries, '81') - creditByPrefix(entries, '81');
  const produitsCessions = creditByPrefix(entries, '82') - debitByPrefix(entries, '82');
  const capaciteAutofinancement = money(cr.resultatNet)
    .add(cr.dotationsAmortissements)
    .subtract(reprises)
    .add(vncCessions)
    .subtract(produitsCessions)
    .toNumber();

  return {
    margeCommerciale,
    productionExercice,
    valeurAjoutee,
    excedentBrutExploitation,
    resultatExploitation: cr.resultatExploitation,
    resultatCourant: cr.resultatCourant,
    resultatExceptionnel: cr.resultatExceptionnel,
    resultatNet: cr.resultatNet,
    capaciteAutofinancement,
    exercice: cr.exercice,
  };
}

/**
 * Compute SIG from CDR fields only (no raw entries needed).
 * Used when bilan/CDR come from Supabase RPC.
 * Approximations: margeCommerciale uses chiffreAffaires - achatsConsommes,
 * CAF uses dotationsAmortissements as proxy for non-cash items.
 */
function computeSIGFromCDR(cr: CompteResultat): SIG {
  // Approximate: margeCommerciale = CA - achatsConsommes (assumes all is trade)
  const margeCommerciale = money(cr.chiffreAffaires).subtract(cr.achatsConsommes).toNumber();
  const productionExercice = money(cr.productionVendue).add(cr.productionStockee).add(cr.productionImmobilisee).toNumber();
  const consommations = money(cr.achatsConsommes).add(cr.servicesExterieurs).toNumber();
  const valeurAjoutee = money(margeCommerciale).add(productionExercice).subtract(consommations).toNumber();
  const excedentBrutExploitation = money(valeurAjoutee)
    .add(cr.subventionsExploitation)
    .subtract(cr.chargesPersonnel)
    .subtract(cr.impotsTaxes)
    .toNumber();

  // CAF approximation from CDR: resultatNet + dotations - (autresProduitsExploitation as reprises proxy)
  const capaciteAutofinancement = money(cr.resultatNet)
    .add(cr.dotationsAmortissements)
    .toNumber();

  return {
    margeCommerciale,
    productionExercice,
    valeurAjoutee,
    excedentBrutExploitation,
    resultatExploitation: cr.resultatExploitation,
    resultatCourant: cr.resultatCourant,
    resultatExceptionnel: cr.resultatExceptionnel,
    resultatNet: cr.resultatNet,
    capaciteAutofinancement,
    exercice: cr.exercice,
  };
}

// ============================================================================
// RATIOS FINANCIERS
// ============================================================================

function computeRatios(bilan: Bilan, cr: CompteResultat): RatiosFinanciers {
  const { actif, passif } = bilan;
  const detteCT = money(passif.dettesFournisseurs).add(passif.autresDettes).toNumber();

  return {
    autonomieFinanciere: safeDivide(passif.capitauxPropres, passif.totalPassif) * 100,
    endettement: safeDivide(money(passif.emprunts).add(passif.dettesFinancieres).toNumber(), passif.capitauxPropres) * 100,
    couvertureEmplois: safeDivide(passif.capitauxPropres, actif.totalActifImmobilise) * 100,
    liquiditeGenerale: safeDivide(actif.totalActifCirculant, detteCT) * 100,
    liquiditeReduite: safeDivide(money(actif.creancesClients).add(actif.tresorerieActif).toNumber(), detteCT) * 100,
    liquiditeImmediate: safeDivide(actif.tresorerieActif, detteCT) * 100,
    rentabiliteCommerciale: safeDivide(cr.resultatNet, cr.chiffreAffaires) * 100,
    rentabiliteEconomique: safeDivide(cr.resultatExploitation, actif.totalActif) * 100,
    rentabiliteFinanciere: safeDivide(cr.resultatNet, passif.capitauxPropres) * 100,
    roa: safeDivide(cr.resultatNet, actif.totalActif) * 100,
    roe: safeDivide(cr.resultatNet, passif.capitauxPropres) * 100,
    rotationStocks: safeDivide(cr.achatsConsommes, actif.stocks),
    delaiReglementClients: safeDivide(actif.creancesClients, cr.chiffreAffaires) * 360,
    delaiReglementFournisseurs: safeDivide(passif.dettesFournisseurs, cr.achatsConsommes) * 360,
    rotationActifs: safeDivide(cr.chiffreAffaires, actif.totalActif),
  };
}

// ============================================================================
// BILAN FONCTIONNEL
// ============================================================================

function computeBilanFonctionnel(bilan: Bilan): BilanFonctionnel {
  const { actif, passif } = bilan;

  const emploisStables = actif.totalActifImmobilise;
  const actifCirculantExploitation = money(actif.stocks).add(actif.creancesClients).toNumber();
  const actifCirculantHorsExploitation = actif.autresCreances;
  const tresorerieActive = actif.tresorerieActif;

  const ressourcesStables = money(passif.capitauxPropres).add(passif.emprunts).add(passif.dettesFinancieres).toNumber();
  const passifCirculantExploitation = passif.dettesFournisseurs;
  const passifCirculantHorsExploitation = passif.autresDettes;
  // P1-1c: Trésorerie passive = découverts bancaires (compte 519)
  const tresoreriePassive = bilan.tresoreriePassive ?? 0;

  const fondRoulementNet = money(ressourcesStables).subtract(emploisStables).toNumber();
  const bfrExploitation = money(actifCirculantExploitation).subtract(passifCirculantExploitation).toNumber();
  const bfrHorsExploitation = money(actifCirculantHorsExploitation).subtract(passifCirculantHorsExploitation).toNumber();
  const besoinFondRoulement = money(bfrExploitation).add(bfrHorsExploitation).toNumber();
  const tresorerieNette = money(fondRoulementNet).subtract(besoinFondRoulement).toNumber();

  return {
    emploisStables,
    actifCirculantExploitation,
    actifCirculantHorsExploitation,
    tresorerieActive,
    ressourcesStables,
    passifCirculantExploitation,
    passifCirculantHorsExploitation,
    tresoreriePassive,
    fondRoulementNet,
    besoinFondRoulement,
    tresorerieNette,
  };
}

// ============================================================================
// SERVICE
// ============================================================================

class FinancialStatementsService {
  async getFinancialStatements(adapter: DataAdapter, exercice: string, archive: boolean = false): Promise<FinancialStatementsData> {
    // --- Try Supabase RPC first (server-side, faster for SaaS mode) ---
    const rpcResult = await this.tryRPCFinancialStatements(adapter, exercice);
    if (rpcResult) {
      if (archive) {
        await this.archiveEtat(adapter, 'bilan', exercice, rpcResult);
      }
      return rpcResult;
    }

    // --- Fallback: JavaScript calculation (Dexie/local mode) ---
    const entries = await loadEntriesForExercice(adapter, exercice);
    const bilan = computeBilan(entries, exercice);
    const compteResultat = computeCompteResultat(entries, exercice);
    const sig = computeSIG(compteResultat, entries);
    const ratios = computeRatios(bilan, compteResultat);
    const bilanFonctionnel = computeBilanFonctionnel(bilan);

    const result = { bilan, compteResultat, sig, ratios, bilanFonctionnel };

    if (archive) {
      await this.archiveEtat(adapter, 'bilan', exercice, result);
    }

    return result;
  }

  async getBilan(adapter: DataAdapter, exercice: string): Promise<Bilan> {
    // Try RPC first
    const rpcBilan = await tryRPC(adapter, 'generate_bilan', { p_fiscal_year_id: exercice });
    if (rpcBilan) {
      return mapRPCToBilan(rpcBilan, exercice);
    }
    // Fallback: JS calculation
    const entries = await loadEntriesForExercice(adapter, exercice);
    return computeBilan(entries, exercice);
  }

  async getCompteResultat(adapter: DataAdapter, exercice: string): Promise<CompteResultat> {
    // Try RPC first
    const rpcCdr = await tryRPC(adapter, 'generate_cdr', { p_fiscal_year_id: exercice });
    if (rpcCdr) {
      return mapRPCToCompteResultat(rpcCdr, exercice);
    }
    // Fallback: JS calculation
    const entries = await loadEntriesForExercice(adapter, exercice);
    return computeCompteResultat(entries, exercice);
  }

  async getSIG(adapter: DataAdapter, exercice: string): Promise<SIG> {
    const data = await this.getFinancialStatements(adapter, exercice);
    return data.sig;
  }

  async getRatios(adapter: DataAdapter, exercice: string): Promise<RatiosFinanciers> {
    const data = await this.getFinancialStatements(adapter, exercice);
    return data.ratios;
  }

  async compareExercices(adapter: DataAdapter, current: string, previous: string): Promise<FinancialComparison> {
    const [currentData, previousData] = await Promise.all([
      this.getFinancialStatements(adapter, current),
      this.getFinancialStatements(adapter, previous),
    ]);

    const variations: Record<string, number> = {};
    const variationsPercent: Record<string, number> = {};

    // Compute variations on key metrics
    const pairs: [string, number, number][] = [
      ['totalActif', currentData.bilan.actif.totalActif, previousData.bilan.actif.totalActif],
      ['totalPassif', currentData.bilan.passif.totalPassif, previousData.bilan.passif.totalPassif],
      ['chiffreAffaires', currentData.compteResultat.chiffreAffaires, previousData.compteResultat.chiffreAffaires],
      ['resultatNet', currentData.compteResultat.resultatNet, previousData.compteResultat.resultatNet],
      ['valeurAjoutee', currentData.sig.valeurAjoutee, previousData.sig.valeurAjoutee],
      ['ebe', currentData.sig.excedentBrutExploitation, previousData.sig.excedentBrutExploitation],
    ];

    for (const [key, curr, prev] of pairs) {
      variations[key] = curr - prev;
      variationsPercent[key] = prev !== 0 ? ((curr - prev) / Math.abs(prev)) * 100 : 0;
    }

    return { current: currentData, previous: previousData, variations, variationsPercent };
  }

  async exportStatements(
    adapter: DataAdapter,
    format: 'excel' | 'pdf',
    exercice: string,
    archive: boolean = true
  ): Promise<Blob> {
    const data = await this.getFinancialStatements(adapter, exercice, archive);

    if (format === 'pdf') {
      try {
        const { generateEtatPDF } = await import('./pdfGeneratorService');
        const isProvisoire = !(await this.isEtatDefinitif(adapter, exercice));
        const societe = await this.getSocieteInfo(adapter);
        return generateEtatPDF('bilan', data, societe, isProvisoire);
      } catch {
        // Fallback to JSON if PDF generation fails
      }
    }

    const json = JSON.stringify(data, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  /**
   * Try to generate full financial statements via Supabase RPC.
   * Returns null if RPC is not available (Dexie mode) or fails.
   */
  private async tryRPCFinancialStatements(adapter: DataAdapter, exercice: string): Promise<FinancialStatementsData | null> {
    // Both RPCs must succeed for a complete result
    const [rpcBilan, rpcCdr] = await Promise.all([
      tryRPC(adapter, 'generate_bilan', { p_fiscal_year_id: exercice }),
      tryRPC(adapter, 'generate_cdr', { p_fiscal_year_id: exercice }),
    ]);

    if (!rpcBilan || !rpcCdr) return null;

    const bilan = mapRPCToBilan(rpcBilan, exercice);
    const compteResultat = mapRPCToCompteResultat(rpcCdr, exercice);

    // SIG, ratios, and bilan fonctionnel are derived from bilan + CDR
    // computeSIG normally needs raw entries for sub-breakdowns (701, 601, etc.)
    // When using RPC, we approximate SIG from CDR aggregate fields
    const sig = computeSIGFromCDR(compteResultat);
    const ratios = computeRatios(bilan, compteResultat);
    const bilanFonctionnel = computeBilanFonctionnel(bilan);

    return { bilan, compteResultat, sig, ratios, bilanFonctionnel };
  }

  /**
   * P0.2 — Archive a financial statement in settings (adapter-based).
   * Stores JSON snapshot + SHA-256 hash for integrity verification.
   */
  async archiveEtat(
    adapter: DataAdapter,
    type: string,
    exercice: string,
    contenu: object
  ): Promise<string> {
    const contenuJson = JSON.stringify(contenu);

    // Compute SHA-256 hash of content
    let hashHex = '';
    try {
      const hashBuffer = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(contenuJson)
      );
      hashHex = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      hashHex = `fallback-${Date.now()}`;
    }

    const archiveId = `etat_${type}_${exercice}_${Date.now()}`;
    const archive = {
      id: archiveId,
      type,
      exercice,
      periode: new Date().toISOString().slice(0, 7),
      version: 1,
      contenu,
      hash_sha256: hashHex,
      genere_le: new Date().toISOString(),
      statut: 'provisoire',
    };

    // Store in settings as append-only archive
    const key = `archive_etat_${archiveId}`;
    const existing = await adapter.getById('settings', key);
    if (existing) {
      await adapter.update('settings', key, {
        key,
        value: JSON.stringify(archive),
        updatedAt: new Date().toISOString(),
      });
    } else {
      await adapter.create('settings', {
        key,
        value: JSON.stringify(archive),
        updatedAt: new Date().toISOString(),
      });
    }

    return archiveId;
  }

  /**
   * P1.5 — Check if a fiscal year's statements are definitive (year is closed).
   */
  async isEtatDefinitif(adapter: DataAdapter, exercice: string): Promise<boolean> {
    const fiscalYears = await adapter.getAll<any>('fiscalYears');
    const fy = fiscalYears.find(
      (f: any) => f.code === exercice || f.label?.includes(exercice) ||
        (f.startDate && f.startDate.startsWith(exercice))
    );
    return fy?.isClosed === true || fy?.is_closed === true;
  }

  /**
   * Get company info for PDF headers.
   */
  async getSocieteInfo(adapter: DataAdapter): Promise<{ name: string; nif: string; rccm: string; exercice: string; adresse: string }> {
    try {
      const setting = await adapter.getById<any>('settings', 'company_info');
      if (setting?.value) {
        const info = JSON.parse(setting.value);
        return {
          name: info.name || 'Société',
          nif: info.nif || '',
          rccm: info.rccm || '',
          exercice: info.exercice || new Date().getFullYear().toString(),
          adresse: info.adresse || '',
        };
      }
    } catch { /* use defaults */ }
    return { name: 'Société', nif: '', rccm: '', exercice: new Date().getFullYear().toString(), adresse: '' };
  }
}

/**
 * AF-ER02: Contrôle croisé Résultat Bilan = Résultat CDR.
 * SYSCOHADA exige que le résultat net inscrit au bilan soit identique
 * au résultat net du compte de résultat.
 */
export function verifierCoherenceResultat(
  resultatBilan: number,
  resultatCDR: number
): { isValid: boolean; ecart: number; message: string } {
  const ecart = Math.abs(resultatBilan - resultatCDR);
  const isValid = ecart < 1; // tolérance 1 FCFA
  return {
    isValid,
    ecart,
    message: isValid
      ? 'Cohérence vérifiée : Résultat Bilan = Résultat CDR'
      : `INCOHÉRENCE : Résultat Bilan (${resultatBilan}) ≠ Résultat CDR (${resultatCDR}), écart = ${ecart} FCFA`,
  };
}

export const financialStatementsService = new FinancialStatementsService();
