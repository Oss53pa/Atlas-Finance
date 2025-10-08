export interface BudgetSession {
  id: number | string;
  year: string;
  department: string;
  period: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'closed' | 'draft' | 'pending';
  createdBy: string;
  createdDate: string;
  progress: number;
}

export interface BudgetLine {
  id?: number | string;
  accountCode: string;
  accountLabel: string;
  category?: string;
  budgetAmount: number;
  actualAmount: number;
  variance: number;
  variancePercent: number;
  period: string;
  department: string;
  year: string;
  notes?: string;
}

export interface Transaction {
  id?: number | string;
  date: string;
  description: string;
  amount: number;
  accountCode: string;
  status: 'Validé' | 'En cours' | 'Rejeté';
  category?: string;
}

export interface DepartmentBudget {
  name: string;
  budget: number;
  actual: number;
  variance: number;
  variancePercent: number;
  accounts?: AccountBudget[];
}

export interface AccountBudget {
  code: string;
  label: string;
  budget: number;
  actual: number;
  variance: number;
  variancePercent: number;
  transactions?: Transaction[];
}

export interface BudgetStats {
  totalBudget: number;
  totalActual: number;
  totalVariance: number;
  variancePercent: number;
  departmentsCount: number;
  accountsCount: number;
  activeSessions: number;
}

export interface MonthlyBudget {
  month: string;
  budget: number;
  actual: number;
  variance: number;
  variancePercent: number;
}

export interface BudgetAlert {
  id: number | string;
  type: 'warning' | 'danger' | 'info';
  title: string;
  message: string;
  department: string;
  accountCode?: string;
  date: string;
  threshold?: number;
  currentValue?: number;
}

export interface BudgetForecast {
  month: string;
  projected: number;
  actual?: number;
  trend: 'up' | 'down' | 'stable';
}