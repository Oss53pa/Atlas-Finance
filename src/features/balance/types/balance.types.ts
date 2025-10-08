export interface BalanceAccount {
  code: string;
  libelle: string;
  niveau: number;
  parent?: string;
  soldeDebiteurAN: number;
  soldeCrediteurAN: number;
  mouvementsDebit: number;
  mouvementsCredit: number;
  soldeDebiteur: number;
  soldeCrediteur: number;
  isExpanded: boolean;
  children?: BalanceAccount[];
}

export interface BalanceTotals {
  soldeDebiteurAN: number;
  soldeCrediteurAN: number;
  mouvementsDebit: number;
  mouvementsCredit: number;
  soldeDebiteur: number;
  soldeCrediteur: number;
}

export interface BalanceFilters {
  period: { from: string; to: string };
  searchAccount: string;
  showZeroBalance: boolean;
  balanceType: 'generale' | 'auxiliaire' | 'agee' | 'cloture';
  displayLevel: 1 | 2 | 3;
}

export interface ColumnVisibility {
  compte: boolean;
  libelle: boolean;
  soldeDebiteurAN: boolean;
  soldeCrediteurAN: boolean;
  mouvementsDebit: boolean;
  mouvementsCredit: boolean;
  soldeDebiteur: boolean;
  soldeCrediteur: boolean;
}

export type ViewMode = 'tree' | 'list' | 'grid';
export type ColumnCount = 4 | 5 | 6;