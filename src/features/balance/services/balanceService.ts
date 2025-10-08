import { BalanceAccount, BalanceFilters, BalanceTotals } from '../types/balance.types';

class BalanceService {
  async getBalance(filters: BalanceFilters): Promise<BalanceAccount[]> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    return [
      {
        code: '1',
        libelle: 'COMPTES DE RESSOURCES DURABLES',
        niveau: 1,
        soldeDebiteurAN: 0,
        soldeCrediteurAN: 500000,
        mouvementsDebit: 50000,
        mouvementsCredit: 150000,
        soldeDebiteur: 0,
        soldeCrediteur: 600000,
        isExpanded: true,
        children: [
          {
            code: '10',
            libelle: 'Capital',
            niveau: 2,
            parent: '1',
            soldeDebiteurAN: 0,
            soldeCrediteurAN: 500000,
            mouvementsDebit: 0,
            mouvementsCredit: 100000,
            soldeDebiteur: 0,
            soldeCrediteur: 600000,
            isExpanded: false,
            children: [
              {
                code: '101',
                libelle: 'Capital social',
                niveau: 3,
                parent: '10',
                soldeDebiteurAN: 0,
                soldeCrediteurAN: 500000,
                mouvementsDebit: 0,
                mouvementsCredit: 100000,
                soldeDebiteur: 0,
                soldeCrediteur: 600000,
                isExpanded: false
              }
            ]
          }
        ]
      },
      {
        code: '2',
        libelle: 'COMPTES D\'ACTIF IMMOBILISE',
        niveau: 1,
        soldeDebiteurAN: 850000,
        soldeCrediteurAN: 0,
        mouvementsDebit: 200000,
        mouvementsCredit: 50000,
        soldeDebiteur: 1000000,
        soldeCrediteur: 0,
        isExpanded: false,
        children: []
      },
      {
        code: '4',
        libelle: 'COMPTES DE TIERS',
        niveau: 1,
        soldeDebiteurAN: 320000,
        soldeCrediteurAN: 180000,
        mouvementsDebit: 450000,
        mouvementsCredit: 350000,
        soldeDebiteur: 420000,
        soldeCrediteur: 210000,
        isExpanded: false,
        children: []
      },
      {
        code: '6',
        libelle: 'COMPTES DE CHARGES',
        niveau: 1,
        soldeDebiteurAN: 0,
        soldeCrediteurAN: 0,
        mouvementsDebit: 580000,
        mouvementsCredit: 0,
        soldeDebiteur: 580000,
        soldeCrediteur: 0,
        isExpanded: false,
        children: []
      },
      {
        code: '7',
        libelle: 'COMPTES DE PRODUITS',
        niveau: 1,
        soldeDebiteurAN: 0,
        soldeCrediteurAN: 0,
        mouvementsDebit: 0,
        mouvementsCredit: 920000,
        soldeDebiteur: 0,
        soldeCrediteur: 920000,
        isExpanded: false,
        children: []
      }
    ];
  }

  calculateTotals(accounts: BalanceAccount[]): BalanceTotals {
    const totals: BalanceTotals = {
      soldeDebiteurAN: 0,
      soldeCrediteurAN: 0,
      mouvementsDebit: 0,
      mouvementsCredit: 0,
      soldeDebiteur: 0,
      soldeCrediteur: 0
    };

    const addAccountTotals = (account: BalanceAccount) => {
      if (!account.children || account.children.length === 0) {
        totals.soldeDebiteurAN += account.soldeDebiteurAN;
        totals.soldeCrediteurAN += account.soldeCrediteurAN;
        totals.mouvementsDebit += account.mouvementsDebit;
        totals.mouvementsCredit += account.mouvementsCredit;
        totals.soldeDebiteur += account.soldeDebiteur;
        totals.soldeCrediteur += account.soldeCrediteur;
      } else {
        account.children.forEach(addAccountTotals);
      }
    };

    accounts.forEach(addAccountTotals);
    return totals;
  }

  async exportBalance(format: 'xlsx' | 'pdf', filters: BalanceFilters): Promise<Blob> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return new Blob(['mock export'], { type: 'application/octet-stream' });
  }
}

export const balanceService = new BalanceService();