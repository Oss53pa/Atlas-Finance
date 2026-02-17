export interface AssetCategory {
  code: string;
  description: string;
  accounts: {
    depreciationHistorical: { account: string; amount: number };
    depreciationRevaluations: { account: string; amount: number };
    additions: { account: string; amount: number };
    revaluationsCost: { account: string; amount: number };
    revaluationsAccumulated: { account: string; amount: number };
    costImpairment: { account: string; amount: number };
    disposalsProceeds: { account: string; amount: number };
    disposalsCost: { account: string; amount: number };
    disposalsAccumulated: { account: string; amount: number };
    disposalsReleaseReserve: { account: string; amount: number };
    deferredTaxation: { account: string; amount: number };
  };
}

export const assetJournalConfig = {
  company: "EMERGENCE PLAZA SA",
  period: {
    from: "2018-01-01",
    to: "2018-02-28"
  },
  totals: {
    ytd: 2139146.14,
    adjustment: -2139146.14
  },
  categories: [
    {
      code: "213-LA",
      description: "213- Logiciels et apps",
      accounts: {
        depreciationHistorical: { account: "68120", amount: 0 },
        depreciationRevaluations: { account: "28130", amount: 0 },
        additions: { account: "10620", amount: 0 },
        revaluationsCost: { account: "28130", amount: 0 },
        revaluationsAccumulated: { account: "21300", amount: 0 },
        costImpairment: { account: "BANK", amount: 0 },
        disposalsProceeds: { account: "21300", amount: 0 },
        disposalsCost: { account: "10620", amount: 0 },
        disposalsAccumulated: { account: "10620", amount: 0 },
        disposalsReleaseReserve: { account: "28130", amount: 0 },
        impairmentProvision: { account: "29130", amount: 0 },
        disposalAccount1: { account: "21300", amount: 0 },
        disposalAccount2: { account: "BANK", amount: 0 },
        disposalAccount3: { account: "75410", amount: 0 },
        disposalAccount4: { account: "75410", amount: 0 },
        disposalAccount5: { account: "21300", amount: 0 },
        disposalAccount6: { account: "28130", amount: 0 },
        disposalAccount7: { account: "75410", amount: 0 },
        disposalAccount8: { account: "10620", amount: 0 },
        disposalAccount9: { account: "75410", amount: 0 },
        balanceSheet750: { account: "BS-750", amount: 0 },
        incomeStatement610: { account: "IS-610", amount: 0 }
      }
    },
    {
      code: "212-DL",
      description: "212 - Droits et licences",
      accounts: {
        depreciationHistorical: { account: "68120", amount: 0 },
        depreciationRevaluations: { account: "28120", amount: 0 },
        additions: { account: "10620", amount: 0 },
        revaluationsCost: { account: "28120", amount: 0 },
        revaluationsAccumulated: { account: "21200", amount: 0 },
        costImpairment: { account: "BANK", amount: 0 },
        disposalsProceeds: { account: "21200", amount: 0 },
        disposalsCost: { account: "10620", amount: 0 },
        disposalsAccumulated: { account: "10620", amount: 0 },
        disposalsReleaseReserve: { account: "28120", amount: 0 },
        impairmentProvision: { account: "29120", amount: 0 },
        disposalAccount1: { account: "21200", amount: 0 },
        disposalAccount2: { account: "BANK", amount: 0 },
        disposalAccount3: { account: "75410", amount: 0 },
        disposalAccount4: { account: "75410", amount: 0 },
        disposalAccount5: { account: "21200", amount: 0 },
        disposalAccount6: { account: "28120", amount: 0 },
        disposalAccount7: { account: "75410", amount: 0 },
        disposalAccount8: { account: "10620", amount: 0 },
        disposalAccount9: { account: "75410", amount: 0 },
        balanceSheet750: { account: "BS-750", amount: 0 },
        incomeStatement610: { account: "IS-610", amount: 0 }
      }
    },
    {
      code: "211-FD",
      description: "211 - Frais de développement",
      accounts: {
        depreciationHistorical: { account: "68120", amount: 0 },
        depreciationRevaluations: { account: "28110", amount: 0 },
        additions: { account: "10620", amount: 0 },
        revaluationsCost: { account: "28110", amount: 0 },
        revaluationsAccumulated: { account: "21100", amount: 0 },
        costImpairment: { account: "BANK", amount: 0 },
        disposalsProceeds: { account: "21100", amount: 0 },
        disposalsCost: { account: "10620", amount: 0 },
        disposalsAccumulated: { account: "10620", amount: 0 },
        disposalsReleaseReserve: { account: "28110", amount: 0 },
        impairmentProvision: { account: "0", amount: 0 },
        disposalAccount1: { account: "21100", amount: 0 },
        disposalAccount2: { account: "BANK", amount: 0 },
        disposalAccount3: { account: "75410", amount: 0 },
        disposalAccount4: { account: "75410", amount: 0 },
        disposalAccount5: { account: "21100", amount: 0 },
        disposalAccount6: { account: "28110", amount: 0 },
        disposalAccount7: { account: "75410", amount: 0 },
        disposalAccount8: { account: "10620", amount: 0 },
        disposalAccount9: { account: "75410", amount: 0 },
        balanceSheet750: { account: "0", amount: 0 },
        incomeStatement610: { account: "0", amount: 0 }
      }
    },
    {
      code: "221-TB",
      description: "221 - Terrains bâtis",
      accounts: {
        depreciationHistorical: { account: "68130", amount: 0 },
        depreciationRevaluations: { account: "0", amount: 0 },
        additions: { account: "10620", amount: 0 },
        revaluationsCost: { account: "0", amount: 0 },
        revaluationsAccumulated: { account: "22300", amount: 0 },
        costImpairment: { account: "BANK", amount: 0 },
        disposalsProceeds: { account: "22300", amount: 0 },
        disposalsCost: { account: "10620", amount: 0 },
        disposalsAccumulated: { account: "10620", amount: 0 },
        disposalsReleaseReserve: { account: "0", amount: 0 },
        impairmentProvision: { account: "0", amount: 0 },
        disposalAccount1: { account: "22300", amount: 0 },
        disposalAccount2: { account: "BANK", amount: 0 },
        disposalAccount3: { account: "75420", amount: 0 },
        disposalAccount4: { account: "75420", amount: 0 },
        disposalAccount5: { account: "22300", amount: 0 },
        disposalAccount6: { account: "0", amount: 0 },
        disposalAccount7: { account: "75420", amount: 0 },
        disposalAccount8: { account: "10620", amount: 0 },
        disposalAccount9: { account: "75420", amount: 0 },
        balanceSheet750: { account: "0", amount: 0 },
        incomeStatement610: { account: "0", amount: 0 }
      }
    },
    {
      code: "222-TNB",
      description: "222- Terrains Non-bâtis",
      accounts: {
        depreciationHistorical: { account: "68130", amount: 0 },
        depreciationRevaluations: { account: "0", amount: 0 },
        additions: { account: "10620", amount: 0 },
        revaluationsCost: { account: "0", amount: 0 },
        revaluationsAccumulated: { account: "22200", amount: 0 },
        costImpairment: { account: "BANK", amount: 0 },
        disposalsProceeds: { account: "22200", amount: 0 },
        disposalsCost: { account: "10620", amount: 0 },
        disposalsAccumulated: { account: "10620", amount: 0 },
        disposalsReleaseReserve: { account: "0", amount: 0 },
        impairmentProvision: { account: "0", amount: 0 },
        disposalAccount1: { account: "22200", amount: 0 },
        disposalAccount2: { account: "BANK", amount: 0 },
        disposalAccount3: { account: "75420", amount: 0 },
        disposalAccount4: { account: "75420", amount: 0 },
        disposalAccount5: { account: "22200", amount: 0 },
        disposalAccount6: { account: "0", amount: 0 },
        disposalAccount7: { account: "75420", amount: 0 },
        disposalAccount8: { account: "10620", amount: 0 },
        disposalAccount9: { account: "75420", amount: 0 },
        balanceSheet750: { account: "0", amount: 0 },
        incomeStatement610: { account: "0", amount: 0 }
      }
    },
    {
      code: "231-BAT",
      description: "231 - Bâtiments",
      accounts: {
        depreciationHistorical: { account: "68130", amount: 0 },
        depreciationRevaluations: { account: "0", amount: 0 },
        additions: { account: "10620", amount: 0 },
        revaluationsCost: { account: "0", amount: 0 },
        revaluationsAccumulated: { account: "23100", amount: 0 },
        costImpairment: { account: "BANK", amount: 0 },
        disposalsProceeds: { account: "23100", amount: 0 },
        disposalsCost: { account: "10620", amount: 0 },
        disposalsAccumulated: { account: "10620", amount: 0 },
        disposalsReleaseReserve: { account: "0", amount: 0 },
        impairmentProvision: { account: "0", amount: 0 },
        disposalAccount1: { account: "23100", amount: 0 },
        disposalAccount2: { account: "BANK", amount: 0 },
        disposalAccount3: { account: "75420", amount: 0 },
        disposalAccount4: { account: "75420", amount: 0 },
        disposalAccount5: { account: "23100", amount: 0 },
        disposalAccount6: { account: "0", amount: 0 },
        disposalAccount7: { account: "75420", amount: 0 },
        disposalAccount8: { account: "10620", amount: 0 },
        disposalAccount9: { account: "75420", amount: 0 },
        balanceSheet750: { account: "0", amount: 0 },
        incomeStatement610: { account: "0", amount: 0 }
      }
    },
    {
      code: "232-IT",
      description: "232-Installations techniques",
      accounts: {
        depreciationHistorical: { account: "68130", amount: 0 },
        depreciationRevaluations: { account: "BS-153", amount: 0 },
        additions: { account: "10620", amount: 0 },
        revaluationsCost: { account: "BS-153", amount: 0 },
        revaluationsAccumulated: { account: "23400", amount: 0 },
        costImpairment: { account: "BANK", amount: 0 },
        disposalsProceeds: { account: "23400", amount: 0 },
        disposalsCost: { account: "10620", amount: 0 },
        disposalsAccumulated: { account: "10620", amount: 0 },
        disposalsReleaseReserve: { account: "BS-153", amount: 0 },
        impairmentProvision: { account: "IS-457", amount: 0 },
        disposalAccount1: { account: "23400", amount: 0 },
        disposalAccount2: { account: "BANK", amount: 0 },
        disposalAccount3: { account: "75420", amount: 0 },
        disposalAccount4: { account: "75420", amount: 0 },
        disposalAccount5: { account: "23400", amount: 0 },
        disposalAccount6: { account: "BS-153", amount: 0 },
        disposalAccount7: { account: "75420", amount: 0 },
        disposalAccount8: { account: "10620", amount: 0 },
        disposalAccount9: { account: "75420", amount: 0 },
        balanceSheet750: { account: "BS-750", amount: 0 },
        incomeStatement610: { account: "IS-610", amount: 0 }
      }
    },
    {
      code: "234-AGT",
      description: "234 - Agencements",
      accounts: {
        depreciationHistorical: { account: "68130", amount: 0 },
        depreciationRevaluations: { account: "BS-154", amount: 0 },
        additions: { account: "10620", amount: 0 },
        revaluationsCost: { account: "BS-154", amount: 0 },
        revaluationsAccumulated: { account: "23450", amount: 0 },
        costImpairment: { account: "BANK", amount: 0 },
        disposalsProceeds: { account: "23450", amount: 0 },
        disposalsCost: { account: "10620", amount: 0 },
        disposalsAccumulated: { account: "10620", amount: 0 },
        disposalsReleaseReserve: { account: "BS-154", amount: 0 },
        impairmentProvision: { account: "IS-457", amount: 0 },
        disposalAccount1: { account: "23450", amount: 0 },
        disposalAccount2: { account: "BANK", amount: 0 },
        disposalAccount3: { account: "75420", amount: 0 },
        disposalAccount4: { account: "75420", amount: 0 },
        disposalAccount5: { account: "23450", amount: 0 },
        disposalAccount6: { account: "BS-154", amount: 0 },
        disposalAccount7: { account: "75420", amount: 0 },
        disposalAccount8: { account: "10620", amount: 0 },
        disposalAccount9: { account: "75420", amount: 0 },
        balanceSheet750: { account: "BS-750", amount: 0 },
        incomeStatement610: { account: "IS-610", amount: 0 }
      }
    },
    {
      code: "234-SS",
      description: "234 - Sécurité et sûreté",
      accounts: {
        depreciationHistorical: { account: "68130", amount: 0 },
        depreciationRevaluations: { account: "BS-155", amount: 0 },
        additions: { account: "10620", amount: 0 },
        revaluationsCost: { account: "BS-155", amount: 0 },
        revaluationsAccumulated: { account: "23451", amount: 0 },
        costImpairment: { account: "BANK", amount: 0 },
        disposalsProceeds: { account: "23451", amount: 0 },
        disposalsCost: { account: "10620", amount: 0 },
        disposalsAccumulated: { account: "10620", amount: 0 },
        disposalsReleaseReserve: { account: "BS-155", amount: 0 },
        impairmentProvision: { account: "IS-457", amount: 0 },
        disposalAccount1: { account: "23451", amount: 0 },
        disposalAccount2: { account: "BANK", amount: 0 },
        disposalAccount3: { account: "75420", amount: 0 },
        disposalAccount4: { account: "75420", amount: 0 },
        disposalAccount5: { account: "23451", amount: 0 },
        disposalAccount6: { account: "BS-155", amount: 0 },
        disposalAccount7: { account: "75420", amount: 0 },
        disposalAccount8: { account: "10620", amount: 0 },
        disposalAccount9: { account: "75420", amount: 0 },
        balanceSheet750: { account: "BS-750", amount: 2139146.14 },
        incomeStatement610: { account: "IS-610", amount: -2139146.14 }
      }
    },
    {
      code: "241-MT",
      description: "241 - Matériel technique",
      accounts: {
        depreciationHistorical: { account: "68130", amount: 0 },
        depreciationRevaluations: { account: "BS-156", amount: 0 },
        additions: { account: "10620", amount: 0 },
        revaluationsCost: { account: "BS-156", amount: 0 },
        revaluationsAccumulated: { account: "24130", amount: 0 },
        costImpairment: { account: "BANK", amount: 0 },
        disposalsProceeds: { account: "24130", amount: 0 },
        disposalsCost: { account: "10620", amount: 0 },
        disposalsAccumulated: { account: "10620", amount: 0 },
        disposalsReleaseReserve: { account: "BS-156", amount: 0 },
        impairmentProvision: { account: "IS-457", amount: 0 },
        disposalAccount1: { account: "24130", amount: 0 },
        disposalAccount2: { account: "BANK", amount: 0 },
        disposalAccount3: { account: "75420", amount: 0 },
        disposalAccount4: { account: "75420", amount: 0 },
        disposalAccount5: { account: "24130", amount: 0 },
        disposalAccount6: { account: "BS-156", amount: 0 },
        disposalAccount7: { account: "75420", amount: 0 },
        disposalAccount8: { account: "10620", amount: 0 },
        disposalAccount9: { account: "75420", amount: 0 },
        balanceSheet750: { account: "BS-750", amount: 0 },
        incomeStatement610: { account: "IS-610", amount: 0 }
      }
    },
    {
      code: "245-VHL",
      description: "245 - Véhicules",
      accounts: {
        depreciationHistorical: { account: "68130", amount: 0 },
        depreciationRevaluations: { account: "BS-161", amount: 0 },
        additions: { account: "10620", amount: 0 },
        revaluationsCost: { account: "BS-161", amount: 0 },
        revaluationsAccumulated: { account: "24510", amount: 0 },
        costImpairment: { account: "BANK", amount: 0 },
        disposalsProceeds: { account: "24510", amount: 0 },
        disposalsCost: { account: "10620", amount: 0 },
        disposalsAccumulated: { account: "10620", amount: 0 },
        disposalsReleaseReserve: { account: "BS-161", amount: 0 },
        impairmentProvision: { account: "IS-457", amount: 0 },
        disposalAccount1: { account: "24510", amount: 0 },
        disposalAccount2: { account: "BANK", amount: 0 },
        disposalAccount3: { account: "75420", amount: 0 },
        disposalAccount4: { account: "75420", amount: 0 },
        disposalAccount5: { account: "24510", amount: 0 },
        disposalAccount6: { account: "BS-161", amount: 0 },
        disposalAccount7: { account: "75420", amount: 0 },
        disposalAccount8: { account: "10620", amount: 0 },
        disposalAccount9: { account: "75420", amount: 0 },
        balanceSheet750: { account: "BS-750", amount: 0 },
        incomeStatement610: { account: "IS-610", amount: 0 }
      }
    },
    {
      code: "244-MOB",
      description: "244 - Mobilier",
      accounts: {
        depreciationHistorical: { account: "68130", amount: 0 },
        depreciationRevaluations: { account: "BS-162", amount: 0 },
        additions: { account: "10620", amount: 0 },
        revaluationsCost: { account: "BS-162", amount: 0 },
        revaluationsAccumulated: { account: "24410", amount: 0 },
        costImpairment: { account: "BANK", amount: 0 },
        disposalsProceeds: { account: "24410", amount: 0 },
        disposalsCost: { account: "10620", amount: 0 },
        disposalsAccumulated: { account: "10620", amount: 0 },
        disposalsReleaseReserve: { account: "BS-162", amount: 0 },
        impairmentProvision: { account: "IS-457", amount: 0 },
        disposalAccount1: { account: "24410", amount: 0 },
        disposalAccount2: { account: "BANK", amount: 0 },
        disposalAccount3: { account: "75420", amount: 0 },
        disposalAccount4: { account: "75420", amount: 0 },
        disposalAccount5: { account: "24410", amount: 0 },
        disposalAccount6: { account: "BS-162", amount: 0 },
        disposalAccount7: { account: "75420", amount: 0 },
        disposalAccount8: { account: "10620", amount: 0 },
        disposalAccount9: { account: "75420", amount: 0 },
        balanceSheet750: { account: "BS-750", amount: 0 },
        incomeStatement610: { account: "IS-610", amount: 0 }
      }
    },
    {
      code: "244-EM",
      description: "244 - Équipements de manutention",
      accounts: {
        depreciationHistorical: { account: "68130", amount: 0 },
        depreciationRevaluations: { account: "BS-171", amount: 0 },
        additions: { account: "10620", amount: 0 },
        revaluationsCost: { account: "BS-171", amount: 0 },
        revaluationsAccumulated: { account: "24420", amount: 0 },
        costImpairment: { account: "BANK", amount: 0 },
        disposalsProceeds: { account: "24420", amount: 0 },
        disposalsCost: { account: "10620", amount: 0 },
        disposalsAccumulated: { account: "10620", amount: 0 },
        disposalsReleaseReserve: { account: "BS-171", amount: 0 },
        impairmentProvision: { account: "IS-457", amount: 0 },
        disposalAccount1: { account: "24420", amount: 0 },
        disposalAccount2: { account: "BANK", amount: 0 },
        disposalAccount3: { account: "75420", amount: 0 },
        disposalAccount4: { account: "75420", amount: 0 },
        disposalAccount5: { account: "24420", amount: 0 },
        disposalAccount6: { account: "BS-171", amount: 0 },
        disposalAccount7: { account: "75420", amount: 0 },
        disposalAccount8: { account: "10620", amount: 0 },
        disposalAccount9: { account: "75420", amount: 0 },
        balanceSheet750: { account: "BS-750", amount: 0 },
        incomeStatement610: { account: "IS-610", amount: 0 }
      }
    },
    {
      code: "244-DS",
      description: "244 - Décoration et signalétique",
      accounts: {
        depreciationHistorical: { account: "68130", amount: 0 },
        depreciationRevaluations: { account: "BS-181", amount: 0 },
        additions: { account: "10620", amount: 0 },
        revaluationsCost: { account: "BS-181", amount: 0 },
        revaluationsAccumulated: { account: "24430", amount: 0 },
        costImpairment: { account: "BANK", amount: 0 },
        disposalsProceeds: { account: "24430", amount: 0 },
        disposalsCost: { account: "10620", amount: 0 },
        disposalsAccumulated: { account: "10620", amount: 0 },
        disposalsReleaseReserve: { account: "BS-181", amount: 0 },
        impairmentProvision: { account: "IS-457", amount: 0 },
        disposalAccount1: { account: "24430", amount: 0 },
        disposalAccount2: { account: "BANK", amount: 0 },
        disposalAccount3: { account: "75420", amount: 0 },
        disposalAccount4: { account: "75420", amount: 0 },
        disposalAccount5: { account: "24430", amount: 0 },
        disposalAccount6: { account: "BS-181", amount: 0 },
        disposalAccount7: { account: "75420", amount: 0 },
        disposalAccount8: { account: "10620", amount: 0 },
        disposalAccount9: { account: "75420", amount: 0 },
        balanceSheet750: { account: "BS-750", amount: 0 },
        incomeStatement610: { account: "IS-610", amount: 0 }
      }
    }
  ]
};

export const getAssetCategoryByCode = (code: string) => {
  return assetJournalConfig.categories.find(cat => cat.code === code);
};

export const getAccountMapping = (categoryCode: string, operationType: string) => {
  const category = getAssetCategoryByCode(categoryCode);
  if (!category) return null;

  const mappings: { [key: string]: string } = {
    'depreciation': category.accounts.depreciationHistorical.account,
    'accumulated_depreciation': category.accounts.depreciationRevaluations.account,
    'additions': category.accounts.additions.account,
    'revaluation_cost': category.accounts.revaluationsCost.account,
    'revaluation_accumulated': category.accounts.revaluationsAccumulated.account,
    'disposal_proceeds': category.accounts.disposalsProceeds.account,
    'disposal_cost': category.accounts.disposalsCost.account,
    'disposal_accumulated': category.accounts.disposalsAccumulated.account
  };

  return mappings[operationType] || null;
};