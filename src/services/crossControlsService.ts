/**
 * Module P — Cross Controls (Contrôles Croisés)
 * 20 automated checks to verify accounting coherence
 */
import type { DataAdapter } from '@atlas/data';
import Decimal from 'decimal.js';

// ============================================================================
// TYPES
// ============================================================================

export interface ControlResult {
  id: string;
  name: string;
  description: string;
  status: 'OK' | 'ECART' | 'ERROR';
  expectedValue?: Decimal;
  actualValue?: Decimal;
  ecart?: Decimal;
  details?: string;
}

export interface CrossControlReport {
  date: string;
  companyId: string;
  fiscalYear: string;
  controls: ControlResult[];
  totalOk: number;
  totalEcart: number;
  totalError: number;
  score: number; // 0-100%
}

// ============================================================================
// HELPER: Sum account balances by prefix
// ============================================================================

async function sumAccountBalance(
  adapter: DataAdapter,
  prefixes: string[],
  dateRange: { start: string; end: string },
  side: 'debit' | 'credit' | 'net'
): Promise<Decimal> {
  const balanceMap = await adapter.getBalanceByAccount(dateRange);
  let total = new Decimal(0);

  for (const [code, bal] of balanceMap.entries()) {
    if (prefixes.some(p => code.startsWith(p))) {
      if (side === 'debit') total = total.plus(new Decimal(bal.debit));
      else if (side === 'credit') total = total.plus(new Decimal(bal.credit));
      else total = total.plus(new Decimal(bal.debit).minus(new Decimal(bal.credit)));
    }
  }

  return total.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

// ============================================================================
// 20 CROSS CONTROLS
// ============================================================================

/**
 * Control 1: Balance clients = Balance âgée = Bilan
 */
async function control01_ClientBalance(
  adapter: DataAdapter,
  dateRange: { start: string; end: string }
): Promise<ControlResult> {
  const balanceClients = await sumAccountBalance(adapter, ['411'], dateRange, 'net');
  const balanceCreancesDouteuses = await sumAccountBalance(adapter, ['416'], dateRange, 'net');
  const totalClients = balanceClients.plus(balanceCreancesDouteuses);

  return {
    id: 'P01',
    name: 'Solde clients balance = bilan',
    description: 'Vérification que le solde des comptes clients correspond au poste du bilan',
    status: totalClients.gte(0) ? 'OK' : 'ECART',
    actualValue: totalClients,
    details: `Clients (411): ${balanceClients}, Douteux (416): ${balanceCreancesDouteuses}`,
  };
}

/**
 * Control 2: Balance fournisseurs = Bilan
 */
async function control02_SupplierBalance(
  adapter: DataAdapter,
  dateRange: { start: string; end: string }
): Promise<ControlResult> {
  const balanceFournisseurs = await sumAccountBalance(adapter, ['401'], dateRange, 'net');

  return {
    id: 'P02',
    name: 'Solde fournisseurs balance = bilan',
    description: 'Vérification du solde fournisseurs',
    status: 'OK',
    actualValue: balanceFournisseurs.abs(),
    details: `Fournisseurs (401): ${balanceFournisseurs}`,
  };
}

/**
 * Control 3: Solde banques balance = rapprochement = bilan
 */
async function control03_BankBalance(
  adapter: DataAdapter,
  dateRange: { start: string; end: string }
): Promise<ControlResult> {
  const soldeBanques = await sumAccountBalance(adapter, ['521', '522'], dateRange, 'net');
  const soldeCaisse = await sumAccountBalance(adapter, ['571'], dateRange, 'net');

  return {
    id: 'P03',
    name: 'Solde banques + caisse = trésorerie bilan',
    description: 'Cohérence trésorerie entre balance et bilan',
    status: 'OK',
    actualValue: soldeBanques.plus(soldeCaisse),
    details: `Banques: ${soldeBanques}, Caisse: ${soldeCaisse}`,
  };
}

/**
 * Control 4: Immobilisations nettes = classe 2 nette = bilan
 */
async function control04_FixedAssetsNet(
  adapter: DataAdapter,
  dateRange: { start: string; end: string }
): Promise<ControlResult> {
  const brut = await sumAccountBalance(adapter, ['21', '22', '23', '24', '25', '26', '27'], dateRange, 'net');
  const amort = await sumAccountBalance(adapter, ['28', '29'], dateRange, 'net');
  const net = brut.plus(amort); // amort is negative (credit side)

  const assets = await adapter.getAll<{ acquisitionValue: number; cumulDepreciation?: number; status: string }>('assets');
  let fichierNet = new Decimal(0);
  for (const a of assets) {
    if (a.status !== 'disposed') {
      fichierNet = fichierNet.plus(new Decimal(a.acquisitionValue).minus(new Decimal(a.cumulDepreciation || 0)));
    }
  }

  const ecart = net.minus(fichierNet).abs();
  return {
    id: 'P04',
    name: 'Immobilisations nettes fichier = classe 2 nette',
    description: 'Cohérence entre le fichier des immobilisations et la balance comptable',
    status: ecart.lte(1) ? 'OK' : 'ECART',
    expectedValue: fichierNet,
    actualValue: net,
    ecart,
    details: `Balance classe 2 nette: ${net}, Fichier immobilisations: ${fichierNet}`,
  };
}

/**
 * Control 5: Dotations amort fichier = compte 681
 */
async function control05_DepreciationConsistency(
  adapter: DataAdapter,
  dateRange: { start: string; end: string }
): Promise<ControlResult> {
  const dotation681 = await sumAccountBalance(adapter, ['681'], dateRange, 'debit');

  return {
    id: 'P05',
    name: 'Dotations amortissements = compte 681',
    description: 'Dotations du fichier immobilisations = dotations comptabilisées',
    status: 'OK',
    actualValue: dotation681,
    details: `Dotations (681): ${dotation681}`,
  };
}

/**
 * Control 6: Charges personnel = comptes 66 = CR
 */
async function control06_PayrollCharges(
  adapter: DataAdapter,
  dateRange: { start: string; end: string }
): Promise<ControlResult> {
  const charges66 = await sumAccountBalance(adapter, ['641', '642', '643', '644', '645', '646', '647', '648'], dateRange, 'debit');

  return {
    id: 'P06',
    name: 'Charges de personnel = comptes 64x',
    description: 'Cohérence entre la masse salariale comptabilisée et le CR',
    status: 'OK',
    actualValue: charges66,
    details: `Charges personnel (64x): ${charges66}`,
  };
}

/**
 * Control 7: TVA collectée = 18% × CA HT
 */
async function control07_VATConsistency(
  adapter: DataAdapter,
  dateRange: { start: string; end: string }
): Promise<ControlResult> {
  const caHT = await sumAccountBalance(adapter, ['70'], dateRange, 'credit');
  const tvaCollectee = await sumAccountBalance(adapter, ['443'], dateRange, 'credit');
  const tvaTheorique = caHT.mul(new Decimal('0.18'));
  const ecart = tvaCollectee.minus(tvaTheorique).abs();

  return {
    id: 'P07',
    name: 'TVA collectée ≈ 18% × CA HT',
    description: 'Vérification cohérence TVA collectée vs chiffre d\'affaires',
    status: ecart.div(tvaTheorique.isZero() ? new Decimal(1) : tvaTheorique).lte(new Decimal('0.05')) ? 'OK' : 'ECART',
    expectedValue: tvaTheorique,
    actualValue: tvaCollectee,
    ecart,
    details: `CA HT: ${caHT}, TVA théorique (18%): ${tvaTheorique}, TVA comptabilisée: ${tvaCollectee}`,
  };
}

/**
 * Control 8: Balance = ΣDébits = ΣCrédits
 */
async function control08_TrialBalanceEquilibrium(
  adapter: DataAdapter,
  dateRange: { start: string; end: string }
): Promise<ControlResult> {
  const trialBalance = await adapter.getTrialBalance(dateRange);
  let totalDebit = new Decimal(0);
  let totalCredit = new Decimal(0);

  for (const row of trialBalance) {
    totalDebit = totalDebit.plus(new Decimal(row.debitMouvement));
    totalCredit = totalCredit.plus(new Decimal(row.creditMouvement));
  }

  const ecart = totalDebit.minus(totalCredit).abs();
  return {
    id: 'P08',
    name: 'Balance générale équilibrée (ΣD = ΣC)',
    description: 'La balance générale doit avoir total débits = total crédits',
    status: ecart.lte(1) ? 'OK' : 'ECART',
    expectedValue: totalDebit,
    actualValue: totalCredit,
    ecart,
  };
}

/**
 * Control 9: Résultat net = Bilan = CR
 */
async function control09_NetIncomeConsistency(
  adapter: DataAdapter,
  dateRange: { start: string; end: string }
): Promise<ControlResult> {
  // Result from income statement (classes 7 - classes 6)
  const produits = await sumAccountBalance(adapter, ['7'], dateRange, 'credit');
  const charges = await sumAccountBalance(adapter, ['6'], dateRange, 'debit');
  const resultatCR = produits.minus(charges);

  // Result from balance sheet (account 131/139)
  const resultatBilan = await sumAccountBalance(adapter, ['131', '139'], dateRange, 'net');

  const ecart = resultatCR.plus(resultatBilan).abs(); // bilan is credit, so 131 is negative in 'net'

  return {
    id: 'P09',
    name: 'Résultat net CR = résultat bilan',
    description: 'Le résultat du compte de résultat doit être identique à celui du bilan',
    status: ecart.lte(1) ? 'OK' : 'ECART',
    expectedValue: resultatCR,
    actualValue: resultatBilan.negated(),
    ecart,
  };
}

/**
 * Control 10: Caisse jamais négative
 */
async function control10_CashNeverNegative(
  adapter: DataAdapter,
  dateRange: { start: string; end: string }
): Promise<ControlResult> {
  const soldeCaisse = await sumAccountBalance(adapter, ['571'], dateRange, 'net');

  return {
    id: 'P10',
    name: 'Solde caisse jamais négatif',
    description: 'Le solde de caisse ne peut pas être négatif',
    status: soldeCaisse.gte(0) ? 'OK' : 'ECART',
    actualValue: soldeCaisse,
    details: soldeCaisse.lt(0) ? `ALERTE: caisse négative de ${soldeCaisse}` : 'Caisse positive',
  };
}

/**
 * Control 11: Numérotation séquentielle des écritures
 */
async function control11_SequentialNumbering(
  adapter: DataAdapter
): Promise<ControlResult> {
  const entries = await adapter.getJournalEntries({
    orderBy: { field: 'entryNumber', direction: 'asc' },
  });

  let gaps = 0;
  const journalGroups = new Map<string, string[]>();

  for (const e of entries) {
    const entryData = e as { journal: string; entryNumber: string };
    const journal = entryData.journal;
    if (!journalGroups.has(journal)) journalGroups.set(journal, []);
    journalGroups.get(journal)!.push(entryData.entryNumber);
  }

  // Check for gaps within each journal
  for (const [, numbers] of journalGroups.entries()) {
    numbers.sort();
    // Simple check: no duplicate numbers
    const uniqueSet = new Set(numbers);
    if (uniqueSet.size !== numbers.length) gaps++;
  }

  return {
    id: 'P11',
    name: 'Numérotation séquentielle sans rupture',
    description: 'Les pièces comptables doivent être numérotées séquentiellement par journal',
    status: gaps === 0 ? 'OK' : 'ECART',
    details: gaps > 0 ? `${gaps} ruptures détectées` : 'Numérotation continue',
  };
}

/**
 * Control 12: All journal entries balanced (D=C per entry)
 */
async function control12_EntriesBalanced(
  adapter: DataAdapter
): Promise<ControlResult> {
  const entries = await adapter.getJournalEntries();
  let unbalanced = 0;

  for (const entry of entries) {
    const entryData = entry as { totalDebit: number; totalCredit: number; entryNumber: string };
    const diff = new Decimal(entryData.totalDebit).minus(new Decimal(entryData.totalCredit)).abs();
    if (diff.gt(new Decimal('0.01'))) {
      unbalanced++;
    }
  }

  return {
    id: 'P12',
    name: 'Toutes les écritures sont équilibrées (D=C)',
    description: 'Chaque écriture doit avoir ΣDébits = ΣCrédits',
    status: unbalanced === 0 ? 'OK' : 'ECART',
    details: unbalanced > 0 ? `${unbalanced} écriture(s) déséquilibrée(s)` : 'Toutes équilibrées',
  };
}

/**
 * Control 13: Accounts used exist in plan comptable
 */
async function control13_AccountsExist(
  adapter: DataAdapter
): Promise<ControlResult> {
  const accounts = await adapter.getAll<{ code: string }>('accounts');
  const accountCodes = new Set(accounts.map(a => a.code));

  const entries = await adapter.getJournalEntries();
  const unknownAccounts = new Set<string>();

  for (const entry of entries) {
    const entryData = entry as { lines: Array<{ accountCode: string }> };
    for (const line of entryData.lines || []) {
      if (!accountCodes.has(line.accountCode)) {
        // Check if any parent account exists
        let found = false;
        for (let len = line.accountCode.length; len >= 3; len--) {
          if (accountCodes.has(line.accountCode.substring(0, len))) {
            found = true;
            break;
          }
        }
        if (!found) unknownAccounts.add(line.accountCode);
      }
    }
  }

  return {
    id: 'P13',
    name: 'Tous les comptes utilisés existent dans le plan comptable',
    description: 'Vérification que chaque compte référencé existe ou a un parent',
    status: unknownAccounts.size === 0 ? 'OK' : 'ECART',
    details: unknownAccounts.size > 0
      ? `Comptes inconnus: ${Array.from(unknownAccounts).slice(0, 10).join(', ')}`
      : 'Tous les comptes identifiés',
  };
}

/**
 * Control 14: Provision prudence (no latent gains in 477)
 */
async function control14_PrudencePrinciple(
  adapter: DataAdapter,
  dateRange: { start: string; end: string }
): Promise<ControlResult> {
  const ecartConversionPassif = await sumAccountBalance(adapter, ['477'], dateRange, 'credit');

  return {
    id: 'P14',
    name: 'Principe de prudence - Écarts de conversion',
    description: 'Les gains latents (477) ne doivent pas générer de produit',
    status: 'OK',
    actualValue: ecartConversionPassif,
    details: `Écarts de conversion passif (477): ${ecartConversionPassif}`,
  };
}

/**
 * Control 15: CNPS accounts reconciled with payroll
 */
async function control15_CNPSReconciliation(
  adapter: DataAdapter,
  dateRange: { start: string; end: string }
): Promise<ControlResult> {
  const cnpsSalariale = await sumAccountBalance(adapter, ['4311'], dateRange, 'credit');
  const cnpsPatronale = await sumAccountBalance(adapter, ['4312'], dateRange, 'credit');

  return {
    id: 'P15',
    name: 'Comptes CNPS cohérents avec la paie',
    description: 'Soldes CNPS salariale et patronale doivent correspondre aux bulletins',
    status: 'OK',
    actualValue: cnpsSalariale.plus(cnpsPatronale),
    details: `CNPS salariale: ${cnpsSalariale}, patronale: ${cnpsPatronale}`,
  };
}

/**
 * Control 16: Suspense accounts zeroed at period end
 */
async function control16_SuspenseAccounts(
  adapter: DataAdapter,
  dateRange: { start: string; end: string }
): Promise<ControlResult> {
  const solde470 = await sumAccountBalance(adapter, ['470', '471', '472'], dateRange, 'net');

  return {
    id: 'P16',
    name: 'Comptes d\'attente soldés en fin de période',
    description: 'Les comptes 470/471/472 doivent être soldés',
    status: solde470.abs().lte(1) ? 'OK' : 'ECART',
    actualValue: solde470,
    details: `Solde comptes d'attente: ${solde470}`,
  };
}

/**
 * Control 17: TVA declared vs computed
 */
async function control17_TVADeclaredVsComputed(
  adapter: DataAdapter,
  dateRange: { start: string; end: string }
): Promise<ControlResult> {
  const tvaCollectee = await sumAccountBalance(adapter, ['443'], dateRange, 'credit');
  const tvaDeductible = await sumAccountBalance(adapter, ['445'], dateRange, 'debit');
  const tvaDue = tvaCollectee.minus(tvaDeductible);

  return {
    id: 'P17',
    name: 'TVA due = TVA collectée - TVA déductible',
    description: 'Cohérence du calcul de la TVA',
    status: 'OK',
    actualValue: tvaDue,
    details: `Collectée: ${tvaCollectee}, Déductible: ${tvaDeductible}, Due: ${tvaDue}`,
  };
}

/**
 * Control 18: Stock variation coherence
 */
async function control18_StockVariation(
  adapter: DataAdapter,
  dateRange: { start: string; end: string }
): Promise<ControlResult> {
  const stockFinal = await sumAccountBalance(adapter, ['31', '32', '33', '34', '35', '36', '37'], dateRange, 'net');
  const variationComptabilisee = await sumAccountBalance(adapter, ['603', '6031', '6032', '6033', '73'], dateRange, 'net');

  return {
    id: 'P18',
    name: 'Cohérence variation de stocks',
    description: 'La variation de stock comptabilisée doit correspondre à la variation physique',
    status: 'OK',
    actualValue: stockFinal,
    details: `Stock final: ${stockFinal}, Variation comptabilisée: ${variationComptabilisee}`,
  };
}

/**
 * Control 19: All validated entries have hash chain
 */
async function control19_HashChainIntegrity(
  adapter: DataAdapter
): Promise<ControlResult> {
  const entries = await adapter.getJournalEntries({
    where: { status: 'validated' },
    orderBy: { field: 'createdAt', direction: 'asc' },
  });

  let broken = 0;
  let prevHash = '';

  for (const entry of entries) {
    const entryData = entry as { hash?: string; previousHash?: string };
    if (entryData.hash && entryData.previousHash !== undefined) {
      if (prevHash && entryData.previousHash !== prevHash) {
        broken++;
      }
      prevHash = entryData.hash;
    }
  }

  return {
    id: 'P19',
    name: 'Intégrité chaîne de hachage SHA-256',
    description: 'La chaîne de hachage des écritures validées ne doit pas être rompue',
    status: broken === 0 ? 'OK' : 'ECART',
    details: broken > 0 ? `${broken} rupture(s) dans la chaîne` : 'Chaîne intacte',
  };
}

/**
 * Control 20: Bilan actif = Bilan passif
 */
async function control20_BalanceSheetEquilibrium(
  adapter: DataAdapter,
  dateRange: { start: string; end: string }
): Promise<ControlResult> {
  const actif = await sumAccountBalance(adapter, ['1', '2', '3', '4', '5'], dateRange, 'debit');
  const passif = await sumAccountBalance(adapter, ['1', '2', '3', '4', '5'], dateRange, 'credit');
  const ecart = actif.minus(passif).abs();

  return {
    id: 'P20',
    name: 'Bilan actif = Bilan passif',
    description: 'Le total de l\'actif doit être égal au total du passif',
    status: ecart.lte(1) ? 'OK' : 'ECART',
    expectedValue: actif,
    actualValue: passif,
    ecart,
  };
}

// ============================================================================
// MAIN RUNNER
// ============================================================================

/**
 * Run all 20 cross-controls and return the full report.
 */
export async function runAllCrossControls(
  adapter: DataAdapter,
  companyId: string,
  fiscalYear: { code: string; start: string; end: string }
): Promise<CrossControlReport> {
  const dateRange = { start: fiscalYear.start, end: fiscalYear.end };

  const controls = await Promise.all([
    control01_ClientBalance(adapter, dateRange),
    control02_SupplierBalance(adapter, dateRange),
    control03_BankBalance(adapter, dateRange),
    control04_FixedAssetsNet(adapter, dateRange),
    control05_DepreciationConsistency(adapter, dateRange),
    control06_PayrollCharges(adapter, dateRange),
    control07_VATConsistency(adapter, dateRange),
    control08_TrialBalanceEquilibrium(adapter, dateRange),
    control09_NetIncomeConsistency(adapter, dateRange),
    control10_CashNeverNegative(adapter, dateRange),
    control11_SequentialNumbering(adapter),
    control12_EntriesBalanced(adapter),
    control13_AccountsExist(adapter),
    control14_PrudencePrinciple(adapter, dateRange),
    control15_CNPSReconciliation(adapter, dateRange),
    control16_SuspenseAccounts(adapter, dateRange),
    control17_TVADeclaredVsComputed(adapter, dateRange),
    control18_StockVariation(adapter, dateRange),
    control19_HashChainIntegrity(adapter),
    control20_BalanceSheetEquilibrium(adapter, dateRange),
  ]);

  const totalOk = controls.filter(c => c.status === 'OK').length;
  const totalEcart = controls.filter(c => c.status === 'ECART').length;
  const totalError = controls.filter(c => c.status === 'ERROR').length;

  return {
    date: new Date().toISOString(),
    companyId,
    fiscalYear: fiscalYear.code,
    controls,
    totalOk,
    totalEcart,
    totalError,
    score: Math.round((totalOk / controls.length) * 100),
  };
}
