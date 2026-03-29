/**
 * Correction #10 — Financial Statements: N-1 Comparatives & Notes
 * Extends the existing financial_statements.service.ts
 */
import type { DataAdapter } from '@atlas/data';
import Decimal from 'decimal.js';

// ============================================================================
// TYPES
// ============================================================================

export interface BalanceSheetLine {
  poste: string;
  label: string;
  brut_N: Decimal;
  amort_N: Decimal;
  net_N: Decimal;
  net_N1: Decimal;
}

export interface IncomeStatementLine {
  poste: string;
  label: string;
  montant_N: Decimal;
  montant_N1: Decimal;
}

export interface DepreciationNoteLine {
  category: string;
  accountPrefix: string;
  beginningGross: Decimal;
  acquisitions: Decimal;
  disposals: Decimal;
  endingGross: Decimal;
  beginningAmort: Decimal;
  dotations: Decimal;
  reprises: Decimal;
  endingAmort: Decimal;
  netBeginning: Decimal;
  netEnding: Decimal;
}

export interface ProvisionNoteLine {
  category: string;
  accountPrefix: string;
  beginning: Decimal;
  dotations: Decimal;
  reprises: Decimal;
  ending: Decimal;
}

// ============================================================================
// BALANCE SHEET WITH N-1
// ============================================================================

export async function getBalanceSheetComparative(
  adapter: DataAdapter,
  companyId: string,
  currentFiscalYear: { start: string; end: string },
  previousFiscalYear?: { start: string; end: string }
): Promise<BalanceSheetLine[]> {
  const lines: BalanceSheetLine[] = [];

  // Get current year balances
  const currentBalance = await adapter.getBalanceByAccount({
    start: currentFiscalYear.start,
    end: currentFiscalYear.end,
  });

  // Get previous year balances if provided
  let previousBalance: Map<string, { debit: number; credit: number; solde: number; lignes: number }> | null = null;
  if (previousFiscalYear) {
    previousBalance = await adapter.getBalanceByAccount({
      start: previousFiscalYear.start,
      end: previousFiscalYear.end,
    });
  }

  // SYSCOHADA Bilan Actif structure
  const actifPostes = [
    { poste: 'AD', label: 'Frais de développement et de prospection', prefixes: ['211'] },
    { poste: 'AE', label: 'Brevets, licences, logiciels et droits similaires', prefixes: ['212', '2135'] },
    { poste: 'AF', label: 'Fonds commercial et droit au bail', prefixes: ['213', '214', '215'] },
    { poste: 'AJ', label: 'Terrains', prefixes: ['221', '222'] },
    { poste: 'AK', label: 'Bâtiments', prefixes: ['223', '231'] },
    { poste: 'AL', label: 'Installations et agencements', prefixes: ['232', '233', '234'] },
    { poste: 'AM', label: 'Matériel, mobilier et actifs biologiques', prefixes: ['241', '2154', '2183', '2182', '2184'] },
    { poste: 'AN', label: 'Matériel de transport', prefixes: ['2182'] },
    { poste: 'AQ', label: 'Titres de participation', prefixes: ['26'] },
    { poste: 'AR', label: 'Autres immobilisations financières', prefixes: ['27'] },
    { poste: 'BA', label: 'Marchandises', prefixes: ['31'] },
    { poste: 'BB', label: 'Matières premières et autres approvisionnements', prefixes: ['32', '33'] },
    { poste: 'BC', label: 'En-cours', prefixes: ['34', '35'] },
    { poste: 'BD', label: 'Produits fabriqués', prefixes: ['36', '37'] },
    { poste: 'BG', label: 'Fournisseurs avances versées', prefixes: ['409'] },
    { poste: 'BH', label: 'Clients', prefixes: ['411', '413', '418'] },
    { poste: 'BI', label: 'Autres créances', prefixes: ['42', '44', '45', '46', '47', '48', '49'] },
    { poste: 'BJ', label: 'Titres de placement', prefixes: ['50'] },
    { poste: 'BK', label: 'Valeurs à encaisser', prefixes: ['51'] },
    { poste: 'BL', label: 'Banques, chèques postaux, caisse', prefixes: ['52', '53', '54', '57'] },
  ];

  for (const poste of actifPostes) {
    let brut = new Decimal(0);
    let amort = new Decimal(0);
    let prevNet = new Decimal(0);

    for (const [code, bal] of currentBalance.entries()) {
      if (poste.prefixes.some(p => code.startsWith(p))) {
        if (code.startsWith('28') || code.startsWith('29') || code.startsWith('39')) {
          amort = amort.plus(new Decimal(bal.credit).minus(new Decimal(bal.debit)));
        } else {
          brut = brut.plus(new Decimal(bal.debit).minus(new Decimal(bal.credit)));
        }
      }
    }

    if (previousBalance) {
      for (const [code, bal] of previousBalance.entries()) {
        if (poste.prefixes.some(p => code.startsWith(p))) {
          if (code.startsWith('28') || code.startsWith('29') || code.startsWith('39')) {
            prevNet = prevNet.minus(new Decimal(bal.credit).minus(new Decimal(bal.debit)));
          } else {
            prevNet = prevNet.plus(new Decimal(bal.debit).minus(new Decimal(bal.credit)));
          }
        }
      }
    }

    const net = brut.minus(amort);
    if (!brut.isZero() || !net.isZero() || !prevNet.isZero()) {
      lines.push({
        poste: poste.poste,
        label: poste.label,
        brut_N: brut.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
        amort_N: amort.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
        net_N: net.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
        net_N1: prevNet.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
      });
    }
  }

  // Passif structure
  const passifPostes = [
    { poste: 'CA', label: 'Capital', prefixes: ['101', '102', '103', '104'] },
    { poste: 'CB', label: 'Apporteurs capital non appelé', prefixes: ['109'] },
    { poste: 'CC', label: 'Primes liées au capital', prefixes: ['105'] },
    { poste: 'CD', label: 'Écarts de réévaluation', prefixes: ['106'] },
    { poste: 'CE', label: 'Réserves indisponibles', prefixes: ['111', '112'] },
    { poste: 'CF', label: 'Réserves libres', prefixes: ['113', '118'] },
    { poste: 'CG', label: 'Report à nouveau', prefixes: ['110', '119'] },
    { poste: 'CH', label: 'Résultat net de l\'exercice', prefixes: ['131', '139'] },
    { poste: 'DA', label: 'Emprunts et dettes financières', prefixes: ['16'] },
    { poste: 'DB', label: 'Dettes de location acquisition', prefixes: ['17'] },
    { poste: 'DC', label: 'Provisions pour risques et charges', prefixes: ['19'] },
    { poste: 'DH', label: 'Dettes circulantes HAO', prefixes: ['48'] },
    { poste: 'DI', label: 'Clients, avances reçues', prefixes: ['419'] },
    { poste: 'DJ', label: 'Fournisseurs d\'exploitation', prefixes: ['401', '403', '408'] },
    { poste: 'DK', label: 'Dettes fiscales et sociales', prefixes: ['42', '43', '44', '447'] },
    { poste: 'DM', label: 'Autres dettes', prefixes: ['45', '46', '47'] },
    { poste: 'DN', label: 'Provisions pour risques à court terme', prefixes: ['499'] },
    { poste: 'DP', label: 'Banques, concours bancaires', prefixes: ['56'] },
  ];

  for (const poste of passifPostes) {
    let amount = new Decimal(0);
    let prevAmount = new Decimal(0);

    for (const [code, bal] of currentBalance.entries()) {
      if (poste.prefixes.some(p => code.startsWith(p))) {
        amount = amount.plus(new Decimal(bal.credit).minus(new Decimal(bal.debit)));
      }
    }

    if (previousBalance) {
      for (const [code, bal] of previousBalance.entries()) {
        if (poste.prefixes.some(p => code.startsWith(p))) {
          prevAmount = prevAmount.plus(new Decimal(bal.credit).minus(new Decimal(bal.debit)));
        }
      }
    }

    if (!amount.isZero() || !prevAmount.isZero()) {
      lines.push({
        poste: poste.poste,
        label: poste.label,
        brut_N: amount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
        amort_N: new Decimal(0),
        net_N: amount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
        net_N1: prevAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
      });
    }
  }

  return lines;
}

// ============================================================================
// INCOME STATEMENT WITH N-1
// ============================================================================

export async function getIncomeStatementComparative(
  adapter: DataAdapter,
  companyId: string,
  currentFiscalYear: { start: string; end: string },
  previousFiscalYear?: { start: string; end: string }
): Promise<IncomeStatementLine[]> {
  const lines: IncomeStatementLine[] = [];

  const currentBalance = await adapter.getBalanceByAccount({
    start: currentFiscalYear.start,
    end: currentFiscalYear.end,
  });

  let previousBalance: Map<string, { debit: number; credit: number; solde: number; lignes: number }> | null = null;
  if (previousFiscalYear) {
    previousBalance = await adapter.getBalanceByAccount({
      start: previousFiscalYear.start,
      end: previousFiscalYear.end,
    });
  }

  const crPostes = [
    { poste: 'TA', label: 'Ventes de marchandises', prefixes: ['701'], nature: 'credit' as const },
    { poste: 'RA', label: 'Achats de marchandises', prefixes: ['601'], nature: 'debit' as const },
    { poste: 'RB', label: 'Variation de stocks de marchandises', prefixes: ['6031'], nature: 'debit' as const },
    { poste: 'TB', label: 'Ventes de produits fabriqués', prefixes: ['702', '703', '704'], nature: 'credit' as const },
    { poste: 'TC', label: 'Travaux, services vendus', prefixes: ['705', '706'], nature: 'credit' as const },
    { poste: 'TD', label: 'Produits accessoires', prefixes: ['707'], nature: 'credit' as const },
    { poste: 'RC', label: 'Achats de matières premières et fournitures', prefixes: ['602', '604', '605', '608'], nature: 'debit' as const },
    { poste: 'RD', label: 'Variation de stocks de matières', prefixes: ['6032', '6033'], nature: 'debit' as const },
    { poste: 'RE', label: 'Autres achats', prefixes: ['609'], nature: 'credit' as const },
    { poste: 'TH', label: 'Autres produits', prefixes: ['71', '72', '73', '75', '758'], nature: 'credit' as const },
    { poste: 'RF', label: 'Transports', prefixes: ['61'], nature: 'debit' as const },
    { poste: 'RG', label: 'Services extérieurs', prefixes: ['62', '63'], nature: 'debit' as const },
    { poste: 'RH', label: 'Impôts et taxes', prefixes: ['64'], nature: 'debit' as const },
    { poste: 'RI', label: 'Autres charges', prefixes: ['65'], nature: 'debit' as const },
    { poste: 'RJ', label: 'Charges de personnel', prefixes: ['66'], nature: 'debit' as const },
    { poste: 'RK', label: 'Dotations aux amortissements et provisions', prefixes: ['68', '69'], nature: 'debit' as const },
    { poste: 'TJ', label: 'Reprises de provisions et dépréciations', prefixes: ['78', '79'], nature: 'credit' as const },
    { poste: 'TK', label: 'Transferts de charges', prefixes: ['791'], nature: 'credit' as const },
    { poste: 'TL', label: 'Revenus financiers', prefixes: ['77'], nature: 'credit' as const },
    { poste: 'RL', label: 'Charges financières', prefixes: ['67'], nature: 'debit' as const },
    { poste: 'TN', label: 'Produits HAO', prefixes: ['82', '84', '86', '88'], nature: 'credit' as const },
    { poste: 'RN', label: 'Charges HAO', prefixes: ['81', '83', '85'], nature: 'debit' as const },
    { poste: 'RO', label: 'Participation des travailleurs', prefixes: ['87'], nature: 'debit' as const },
    { poste: 'RP', label: 'Impôts sur le résultat', prefixes: ['891', '895'], nature: 'debit' as const },
  ];

  for (const poste of crPostes) {
    let amount = new Decimal(0);
    let prevAmount = new Decimal(0);

    for (const [code, bal] of currentBalance.entries()) {
      if (poste.prefixes.some(p => code.startsWith(p))) {
        if (poste.nature === 'credit') {
          amount = amount.plus(new Decimal(bal.credit).minus(new Decimal(bal.debit)));
        } else {
          amount = amount.plus(new Decimal(bal.debit).minus(new Decimal(bal.credit)));
        }
      }
    }

    if (previousBalance) {
      for (const [code, bal] of previousBalance.entries()) {
        if (poste.prefixes.some(p => code.startsWith(p))) {
          if (poste.nature === 'credit') {
            prevAmount = prevAmount.plus(new Decimal(bal.credit).minus(new Decimal(bal.debit)));
          } else {
            prevAmount = prevAmount.plus(new Decimal(bal.debit).minus(new Decimal(bal.credit)));
          }
        }
      }
    }

    if (!amount.isZero() || !prevAmount.isZero()) {
      lines.push({
        poste: poste.poste,
        label: poste.label,
        montant_N: amount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
        montant_N1: prevAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
      });
    }
  }

  return lines;
}

// ============================================================================
// DEPRECIATION SCHEDULE NOTE
// ============================================================================

export async function getDepreciationScheduleNote(
  adapter: DataAdapter,
  companyId: string,
  fiscalYear: { start: string; end: string }
): Promise<DepreciationNoteLine[]> {
  const assets = await adapter.getAll<{
    id: string;
    category: string;
    accountCode: string;
    depreciationAccountCode: string;
    acquisitionValue: number;
    acquisitionDate: string;
    cumulDepreciation?: number;
    status: string;
  }>('assets');

  const entries = await adapter.getJournalEntries({
    where: { status: 'validated' },
  });

  // Group by category
  const categories = new Map<string, {
    accountPrefix: string;
    assets: typeof assets;
  }>();

  for (const asset of assets) {
    const key = asset.category || 'Divers';
    if (!categories.has(key)) {
      categories.set(key, { accountPrefix: asset.accountCode.substring(0, 3), assets: [] });
    }
    categories.get(key)!.assets.push(asset);
  }

  const result: DepreciationNoteLine[] = [];

  for (const [category, data] of categories.entries()) {
    let beginningGross = new Decimal(0);
    let acquisitions = new Decimal(0);
    let disposals = new Decimal(0);
    let beginningAmort = new Decimal(0);
    let dotations = new Decimal(0);
    let reprises = new Decimal(0);

    for (const asset of data.assets) {
      const acqValue = new Decimal(asset.acquisitionValue);
      const acqDate = asset.acquisitionDate;

      if (acqDate < fiscalYear.start) {
        beginningGross = beginningGross.plus(acqValue);
        beginningAmort = beginningAmort.plus(new Decimal(asset.cumulDepreciation || 0));
      } else if (acqDate >= fiscalYear.start && acqDate <= fiscalYear.end) {
        acquisitions = acquisitions.plus(acqValue);
      }

      if (asset.status === 'disposed') {
        disposals = disposals.plus(acqValue);
      }
    }

    // Calculate dotations from journal entries (681x accounts)
    for (const entry of entries) {
      if (entry.date >= fiscalYear.start && entry.date <= fiscalYear.end) {
        for (const line of (entry as { lines: Array<{ accountCode: string; debit: number; credit: number }> }).lines || []) {
          if (line.accountCode.startsWith('681') || line.accountCode.startsWith('6812')) {
            dotations = dotations.plus(new Decimal(line.debit));
          }
          if (line.accountCode.startsWith('781') || line.accountCode.startsWith('7914')) {
            reprises = reprises.plus(new Decimal(line.credit));
          }
        }
      }
    }

    const endingGross = beginningGross.plus(acquisitions).minus(disposals);
    const endingAmort = beginningAmort.plus(dotations).minus(reprises);

    result.push({
      category,
      accountPrefix: data.accountPrefix,
      beginningGross: beginningGross.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
      acquisitions: acquisitions.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
      disposals: disposals.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
      endingGross: endingGross.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
      beginningAmort: beginningAmort.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
      dotations: dotations.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
      reprises: reprises.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
      endingAmort: endingAmort.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
      netBeginning: beginningGross.minus(beginningAmort).toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
      netEnding: endingGross.minus(endingAmort).toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    });
  }

  return result;
}

// ============================================================================
// PROVISION NOTE
// ============================================================================

export async function getProvisionNote(
  adapter: DataAdapter,
  companyId: string,
  fiscalYear: { start: string; end: string }
): Promise<ProvisionNoteLine[]> {
  const entries = await adapter.getJournalEntries({
    where: { status: 'validated' },
  });

  const provisionCategories = [
    { category: 'Provisions pour risques', accountPrefix: '19', dotationPrefix: '691', reprisePrefix: '791' },
    { category: 'Provisions pour dépréciation des immobilisations', accountPrefix: '29', dotationPrefix: '6914', reprisePrefix: '7914' },
    { category: 'Provisions pour dépréciation des stocks', accountPrefix: '39', dotationPrefix: '6593', reprisePrefix: '793' },
    { category: 'Provisions pour dépréciation des créances', accountPrefix: '491', dotationPrefix: '6594', reprisePrefix: '7594' },
  ];

  const result: ProvisionNoteLine[] = [];

  for (const cat of provisionCategories) {
    let beginning = new Decimal(0);
    let dotations = new Decimal(0);
    let reprises = new Decimal(0);

    for (const entry of entries) {
      const entryData = entry as { date: string; lines: Array<{ accountCode: string; debit: number; credit: number }> };
      for (const line of entryData.lines || []) {
        // Beginning = balance before fiscal year
        if (entryData.date < fiscalYear.start && line.accountCode.startsWith(cat.accountPrefix)) {
          beginning = beginning.plus(new Decimal(line.credit).minus(new Decimal(line.debit)));
        }
        // Dotations during fiscal year
        if (entryData.date >= fiscalYear.start && entryData.date <= fiscalYear.end) {
          if (line.accountCode.startsWith(cat.dotationPrefix)) {
            dotations = dotations.plus(new Decimal(line.debit));
          }
          if (line.accountCode.startsWith(cat.reprisePrefix)) {
            reprises = reprises.plus(new Decimal(line.credit));
          }
        }
      }
    }

    const ending = beginning.plus(dotations).minus(reprises);

    if (!beginning.isZero() || !dotations.isZero() || !reprises.isZero()) {
      result.push({
        category: cat.category,
        accountPrefix: cat.accountPrefix,
        beginning: beginning.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
        dotations: dotations.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
        reprises: reprises.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
        ending: ending.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
      });
    }
  }

  return result;
}
