/**
 * Service de génération des états financiers SYSCOHADA.
 * Calcule Bilan, Compte de Résultat, SIG, Ratios et Bilan Fonctionnel
 * depuis les écritures Dexie (journalEntries).
 *
 * Conforme SYSCOHADA révisé — Plan comptable OHADA.
 */
import type { DataAdapter } from '@atlas/data';
import type { DBJournalEntry } from '../../../lib/db';
import { money } from '../../../utils/money';
import {
  Bilan,
  BilanActif,
  BilanPassif,
  CompteResultat,
  SIG,
  RatiosFinanciers,
  BilanFonctionnel,
  FinancialStatementsData,
  FinancialComparison,
} from '../types/financialStatements.types';

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
  let fy = await adapter.getById('fiscalYears', exercice);
  if (!fy) {
    const allFY = await adapter.getAll('fiscalYears', { where: { code: exercice } });
    fy = allFY[0] || undefined;
  }

  if (fy) {
    const allEntries = await adapter.getAll('journalEntries');
    return allEntries.filter((e: DBJournalEntry) => e.date >= fy.startDate && e.date <= fy.endDate);
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
  // ACTIF — SYSCOHADA classes 2 (immobilisé), 3 (stocks), 4 débit (créances), 5 débit (trésorerie)
  const immobilisationsIncorporelles = netByPrefix(entries, '21');
  const immobilisationsCorporelles = netByPrefix(entries, '22', '23', '24');
  const immobilisationsFinancieres = netByPrefix(entries, '25', '26', '27');
  // Less accumulated depreciation (class 28)
  const amortissements = netByPrefix(entries, '28'); // credit balance → negative
  const totalActifImmobilise = money(immobilisationsIncorporelles)
    .add(immobilisationsCorporelles)
    .add(immobilisationsFinancieres)
    .add(amortissements) // amortissements is negative (credit balance)
    .toNumber();

  const stocks = netByPrefix(entries, '3');
  const creancesClients = netByPrefix(entries, '41');
  const autresCreances = netByPrefix(entries, '42', '43', '44', '45', '46', '47');
  const tresorerieActif = netByPrefix(entries, '5'); // 50-59: trésorerie active
  const totalActifCirculant = money(stocks)
    .add(creancesClients)
    .add(autresCreances)
    .add(tresorerieActif)
    .toNumber();

  const totalActif = money(totalActifImmobilise).add(totalActifCirculant).toNumber();

  const actif: BilanActif = {
    immobilisationsIncorporelles: Math.max(0, immobilisationsIncorporelles),
    immobilisationsCorporelles: Math.max(0, money(immobilisationsCorporelles).add(amortissements).toNumber()),
    immobilisationsFinancieres: Math.max(0, immobilisationsFinancieres),
    totalActifImmobilise: Math.max(0, totalActifImmobilise),
    stocks: Math.max(0, stocks),
    creancesClients: Math.max(0, creancesClients),
    autresCreances: Math.max(0, autresCreances),
    tresorerieActif: Math.max(0, tresorerieActif),
    totalActifCirculant: Math.max(0, totalActifCirculant),
    totalActif: Math.max(0, totalActif),
  };

  // PASSIF — SYSCOHADA class 1 (capitaux), 4 crédit (dettes), 5 crédit (trésorerie passif)
  const capitalSocial = Math.abs(netByPrefix(entries, '10'));
  const reserves = Math.abs(netByPrefix(entries, '11'));
  const reportANouveau = -netByPrefix(entries, '12'); // Credit balance = positive
  const resultatExercice = computeResultatNet(entries);
  const capitauxPropres = money(capitalSocial).add(reserves).add(reportANouveau).add(resultatExercice).toNumber();

  const emprunts = Math.abs(netByPrefix(entries, '16'));
  const dettesFinancieres = Math.abs(netByPrefix(entries, '17'));
  const dettesFournisseurs = Math.abs(netByPrefix(entries, '40'));
  const autresDettes = Math.abs(netByPrefix(entries, '42', '43', '44', '45', '46', '47'));

  const totalPassif = money(capitauxPropres)
    .add(emprunts)
    .add(dettesFinancieres)
    .add(dettesFournisseurs)
    .add(autresDettes)
    .toNumber();

  const passif: BilanPassif = {
    capitalSocial,
    reserves: money(reserves).add(reportANouveau).toNumber(),
    resultatExercice,
    capitauxPropres,
    emprunts,
    dettesFinancieres,
    dettesFournisseurs,
    autresDettes,
    totalPassif,
  };

  return { actif, passif, exercice, dateEtablissement: new Date().toISOString() };
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
  const productionVendue = creditByPrefix(entries, '70', '71') - debitByPrefix(entries, '70', '71');
  const productionStockee = creditByPrefix(entries, '73') - debitByPrefix(entries, '73');
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
  const produitsExceptionnels = creditByPrefix(entries, '84', '86', '88') - debitByPrefix(entries, '84', '86', '88');
  const chargesExceptionnelles = debitByPrefix(entries, '83', '85', '87') - creditByPrefix(entries, '83', '85', '87');
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
    dotationsAmortissements,
    autresChargesExploitation: money(autresChargesExploitation).add(impotsTaxes).toNumber(),
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

  // CAF = Résultat net + Dotations - Reprises + VNC cessions - Produits cessions
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
  const tresoreriePassive = 0; // Concours bancaires — would need account 519

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
  async getFinancialStatements(adapter: DataAdapter, exercice: string): Promise<FinancialStatementsData> {
    const entries = await loadEntriesForExercice(adapter, exercice);
    const bilan = computeBilan(entries, exercice);
    const compteResultat = computeCompteResultat(entries, exercice);
    const sig = computeSIG(compteResultat, entries);
    const ratios = computeRatios(bilan, compteResultat);
    const bilanFonctionnel = computeBilanFonctionnel(bilan);

    return { bilan, compteResultat, sig, ratios, bilanFonctionnel };
  }

  async getBilan(adapter: DataAdapter, exercice: string): Promise<Bilan> {
    const entries = await loadEntriesForExercice(adapter, exercice);
    return computeBilan(entries, exercice);
  }

  async getCompteResultat(adapter: DataAdapter, exercice: string): Promise<CompteResultat> {
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
    exercice: string
  ): Promise<Blob> {
    const data = await this.getFinancialStatements(adapter, exercice);
    const json = JSON.stringify(data, null, 2);
    return new Blob([json], { type: 'application/json' });
  }
}

export const financialStatementsService = new FinancialStatementsService();
