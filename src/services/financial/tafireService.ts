import { db } from '../../lib/db';
import { money, Money } from '../../utils/money';

export interface TAFIREData {
  id: string;
  fiscalYear: string;
  calculationMethod: 'DIRECT' | 'INDIRECT';

  // Flux d'exploitation
  netIncome: number;
  depreciationProvisions: number;
  provisionsReversal: number;
  exceptionalItems: number;
  selfFinancingCapacity: number;
  workingCapitalVariation: number;
  operatingCashSurplus: number;

  // Flux d'investissement
  fixedAssetsAcquisitions: number;
  fixedAssetsDisposals: number;
  financialInvestmentsVariation: number;
  investmentSubsidies: number;
  investmentCashFlow: number;

  // Flux de financement
  capitalIncrease: number;
  newBorrowings: number;
  loanRepayments: number;
  dividendsPaid: number;
  financingCashFlow: number;

  // Trésorerie
  openingCashBalance: number;
  closingCashBalance: number;
  cashVariation: number;
  freeCashFlow: number;

  // Métadonnées
  calculationDate: string;
  calculationTimeMs: number;
  isValidated: boolean;
}

export interface TAFIREAnalysis {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  score: number;
}

/**
 * Calculate TAFIRE (Tableau de Flux de Trésorerie) using SYSCOHADA account structure
 * @param fiscalYear - Optional fiscal year filter (YYYY format)
 * @returns TAFIREData with all cash flow calculations
 */
export async function calculateTAFIRE(fiscalYear?: string): Promise<TAFIREData> {
  const startTime = performance.now();

  // Fetch journal entries
  let entries = await db.journalEntries.toArray();

  // Filter by fiscal year if provided
  if (fiscalYear) {
    entries = entries.filter(e => e.date.startsWith(fiscalYear));
  }

  /**
   * Calculate net balance (debit - credit) for accounts matching given prefixes
   */
  const net = (...prefixes: string[]): Money => {
    let total = money(0);
    for (const entry of entries) {
      for (const line of entry.lines) {
        if (prefixes.some(p => line.accountCode.startsWith(p))) {
          total = total.add(money(line.debit).subtract(money(line.credit)));
        }
      }
    }
    return total;
  };

  /**
   * Calculate credit net balance (credit - debit) for accounts matching given prefixes
   */
  const creditN = (...prefixes: string[]): Money => {
    let total = money(0);
    for (const entry of entries) {
      for (const line of entry.lines) {
        if (prefixes.some(p => line.accountCode.startsWith(p))) {
          total = total.add(money(line.credit).subtract(money(line.debit)));
        }
      }
    }
    return total;
  };

  // SYSCOHADA calculation logic
  // Résultat net = Produits (classe 7) - Charges (classe 6)
  const netIncome = creditN('7').subtract(net('6'));
  const depreciationProvisions = net('68', '69');
  const provisionsReversal = creditN('78', '79');
  const exceptionalItems = creditN('84', '86', '88').subtract(net('83', '85', '87'));

  const selfFinancingCapacity = netIncome
    .add(depreciationProvisions)
    .subtract(provisionsReversal);

  const workingCapitalVariation = net('3', '41', '46')
    .subtract(creditN('40', '42', '43', '44'));

  const operatingCashSurplus = selfFinancingCapacity
    .subtract(workingCapitalVariation);

  // Investissement
  const fixedAssetsAcquisitionsRaw = net('2').add(net('28'));
  const fixedAssetsAcquisitions = money(Math.max(0, fixedAssetsAcquisitionsRaw.toNumber()));
  const fixedAssetsDisposals = money(0); // Would need specific disposal tracking
  const financialInvestmentsVariation = net('26', '27');
  const investmentSubsidies = creditN('14');

  const investmentCashFlow = money(0)
    .subtract(fixedAssetsAcquisitions)
    .add(fixedAssetsDisposals)
    .subtract(financialInvestmentsVariation)
    .add(investmentSubsidies);

  // Financement
  const capitalIncrease = creditN('10');
  const newBorrowings = creditN('16');
  const loanRepaymentsRaw = net('16').toNumber();
  const loanRepayments = money(loanRepaymentsRaw > 0 ? loanRepaymentsRaw : 0);
  const dividendsPaid = net('465');

  const financingCashFlow = capitalIncrease
    .add(newBorrowings)
    .subtract(loanRepayments)
    .subtract(dividendsPaid);

  // Trésorerie
  const closingCashBalance = net('5');
  const cashVariation = operatingCashSurplus
    .add(investmentCashFlow)
    .add(financingCashFlow);
  const openingCashBalance = closingCashBalance.subtract(cashVariation);
  const freeCashFlow = operatingCashSurplus.add(investmentCashFlow);

  return {
    id: '1',
    fiscalYear: fiscalYear || new Date().getFullYear().toString(),
    calculationMethod: 'INDIRECT',

    // Convert Money to numbers for interface compatibility
    netIncome: netIncome.toNumber(),
    depreciationProvisions: depreciationProvisions.toNumber(),
    provisionsReversal: provisionsReversal.toNumber(),
    exceptionalItems: exceptionalItems.toNumber(),
    selfFinancingCapacity: selfFinancingCapacity.toNumber(),
    workingCapitalVariation: workingCapitalVariation.toNumber(),
    operatingCashSurplus: operatingCashSurplus.toNumber(),

    fixedAssetsAcquisitions: fixedAssetsAcquisitions.toNumber(),
    fixedAssetsDisposals: fixedAssetsDisposals.toNumber(),
    financialInvestmentsVariation: financialInvestmentsVariation.toNumber(),
    investmentSubsidies: investmentSubsidies.toNumber(),
    investmentCashFlow: investmentCashFlow.toNumber(),

    capitalIncrease: capitalIncrease.toNumber(),
    newBorrowings: newBorrowings.toNumber(),
    loanRepayments: loanRepayments.toNumber(),
    dividendsPaid: dividendsPaid.toNumber(),
    financingCashFlow: financingCashFlow.toNumber(),

    openingCashBalance: openingCashBalance.toNumber(),
    closingCashBalance: closingCashBalance.toNumber(),
    cashVariation: cashVariation.toNumber(),
    freeCashFlow: freeCashFlow.toNumber(),

    calculationDate: new Date().toISOString(),
    calculationTimeMs: Math.round(performance.now() - startTime),
    isValidated: false,
  };
}

/**
 * Analyze TAFIRE data and generate insights
 * @param data - TAFIRE calculation data
 * @returns Analysis with strengths, weaknesses, recommendations
 */
export function analyzeTAFIRE(data: TAFIREData): TAFIREAnalysis {
  const analysis: TAFIREAnalysis = {
    strengths: [],
    weaknesses: [],
    recommendations: [],
    riskLevel: 'LOW',
    score: 85
  };

  // Analyse CAF
  if (data.selfFinancingCapacity > 0) {
    analysis.strengths.push("CAF positive - Bonne capacité d'autofinancement");
  } else {
    analysis.weaknesses.push("CAF négative - Difficultés de génération de cash");
    analysis.riskLevel = 'HIGH';
  }

  // Analyse Free Cash Flow
  if (data.freeCashFlow > 0) {
    analysis.strengths.push("Free Cash Flow positif - Capacité d'investissement démontrée");
  } else {
    analysis.weaknesses.push("Free Cash Flow négatif - Dépendance au financement externe");
    analysis.recommendations.push("Optimiser le cash flow libre : rentabilité et maîtrise investissements");
  }

  // Analyse variation BFR
  if (Math.abs(data.workingCapitalVariation) > data.selfFinancingCapacity * 0.3) {
    analysis.weaknesses.push("Forte variation du BFR impactant la trésorerie");
    analysis.recommendations.push("Optimiser la gestion du BFR (clients, stocks, fournisseurs)");
  }

  // Analyse équilibre des flux
  if (data.investmentCashFlow > data.selfFinancingCapacity) {
    analysis.recommendations.push("Investissements dépassant la CAF - Évaluer les sources de financement");
  }

  return analysis;
}
