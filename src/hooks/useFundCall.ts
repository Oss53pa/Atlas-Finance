import { useState, useCallback } from 'react';

// Interfaces pour les types de données
interface FundCallDetail {
  id: number;
  vendor: string;
  invoice_date: string;
  entry_code: string;
  reference: string;
  description: string;
  credit: number;
  outstanding: number;
  invoice_status: 'PA' | 'CE' | 'CA' | 'OE';
  age: number;
  cm_recommendation?: 'TBP' | 'CFB' | 'CW' | 'P';
  is_pre_approved?: boolean;
  type_entry?: string;
}

interface AgingInvoice {
  count: number;
  amount: number;
  percentage: number;
}

interface AgingInvoices {
  between_0_30_days: AgingInvoice;
  between_31_60_days: AgingInvoice;
  between_61_90_days: AgingInvoice;
  between_91_120_days: AgingInvoice;
  more_120_days: AgingInvoice;
}

interface LevelingAccountInfo {
  french_description?: string;
  id?: number;
  account_number?: string;
}

interface FundCall {
  id?: number;
  reference?: string;
  request_date?: string;
  due_date?: string;
  date_completion?: string;
  approval_status?: number;
  amount?: number;
  amount_requested?: number;
  mandatory_amount?: number;
  pre_mandatory_amount?: number;
  aging_invoices?: AgingInvoices;
  details?: FundCallDetail[];
  is_mark_as_pre_approved?: boolean;
  comment?: string;

  // Propriétés financières
  previous_arrears?: number;
  critical_expense?: number;
  current_arrears?: number;
  unfunded_comitment?: number;
  current_balance?: number;
  ongoing_paiement?: number;
  ongoing_expenses?: number;
  theorical_balance?: number;
  fund_asked?: number;
  theorical_balance_after_approved?: number;

  // Montants demandés et approuvés
  previous_arrears_requested?: number;
  previous_arrears_approved?: number;
  critical_expenses_requested?: number;
  critical_expenses_approved?: number;
  current_expenses_requested?: number;
  current_expenses_approved?: number;
  total_requested?: number;
  total_approved?: number;

  // Autres propriétés
  best_to_have?: number;
  mandatory?: number;
  leveling_account_from_info?: LevelingAccountInfo;
  leveling_account_to_info?: LevelingAccountInfo;
}

interface UseFundCallReturn {
  fundCallG: FundCall;
  enabledId: number[];
  handleChangeFundCall: (data: FundCall) => void;
  handleChangeFundCallEnabledUser: (data: number[]) => void;
  resetFundCall: () => void;
  addEnabledUser: (userId: number) => void;
  removeEnabledUser: (userId: number) => void;
  setFundCallG: React.Dispatch<React.SetStateAction<FundCall>>;
  setEnabledId: React.Dispatch<React.SetStateAction<number[]>>;
}

/**
 * Hook personnalisé pour la gestion des appels de fond
 * @returns {UseFundCallReturn} - État et méthodes pour gérer les appels de fond
 */
export const useFundCall = (): UseFundCallReturn => {
  const [fundCallG, setFundCallG] = useState<FundCall>({});
  const [enabledId, setEnabledId] = useState<number[]>([]);

  const handleChangeFundCall = useCallback((data: FundCall) => {
    setFundCallG(data);
  }, []);

  const handleChangeFundCallEnabledUser = useCallback((data: number[]) => {
    setEnabledId(data);
  }, []);

  const resetFundCall = useCallback(() => {
    setFundCallG({});
    setEnabledId([]);
  }, []);

  const addEnabledUser = useCallback((userId: number) => {
    setEnabledId(prev => [...prev, userId]);
  }, []);

  const removeEnabledUser = useCallback((userId: number) => {
    setEnabledId(prev => prev.filter(id => id !== userId));
  }, []);

  return {
    fundCallG,
    enabledId,
    handleChangeFundCall,
    handleChangeFundCallEnabledUser,
    resetFundCall,
    addEnabledUser,
    removeEnabledUser,
    setFundCallG,
    setEnabledId
  };
};

// Export des types pour réutilisation
export type {
  FundCall,
  FundCallDetail,
  AgingInvoice,
  AgingInvoices,
  LevelingAccountInfo,
  UseFundCallReturn
};