export type ClosureStepStatus = 'pending' | 'in_progress' | 'completed' | 'error' | 'requires_approval';
export type ClosureStepCategory = 'preparation' | 'provisions' | 'amortissement' | 'regularisation' | 'etats_financiers' | 'validation' | 'archivage';
export type ClosureControlType = 'balance_check' | 'legal_check' | 'syscohada_check' | 'completeness_check';
export type ControlStatus = 'pending' | 'passed' | 'failed';
export type ControlSeverity = 'info' | 'warning' | 'error';
export type ClosurePeriodType = 'monthly' | 'quarterly' | 'annual';
export type ClosurePeriodStatus = 'open' | 'in_progress' | 'closed' | 'locked' | 'approval_pending';
export type Region = 'CEMAC' | 'UEMOA';
export type BusinessSector = 'commercial' | 'industrial' | 'services' | 'banking' | 'insurance';

export interface ClosureControl {
  id: string;
  name: string;
  type: ClosureControlType;
  status: ControlStatus;
  message?: string;
  severity: ControlSeverity;
  auto_correctable: boolean;
}

export interface ClosureStep {
  id: string;
  name: string;
  name_en?: string;
  description: string;
  description_en?: string;
  status: ClosureStepStatus;
  order: number;
  duration?: string;
  estimated_duration?: string;
  errorMessage?: string;
  syscohada_compliance: boolean;
  mandatory: boolean;
  category: ClosureStepCategory;
  dependencies?: string[];
  created_entries?: number;
  validated_by?: string;
  validation_date?: Date;
  syscohada_reference?: string;
  controls: ClosureControl[];
}

export interface ClosurePeriod {
  id: string;
  type: ClosurePeriodType;
  period: string;
  period_en?: string;
  status: ClosurePeriodStatus;
  startDate: Date;
  endDate?: Date;
  closure_deadline?: Date;
  fiscal_year: string;
  steps: ClosureStep[];
  syscohada_compliance_score: number;
  legal_requirements_met: boolean;
  audit_trail_complete: boolean;
  documents_generated: string[];
  approvals_required: string[];
  approvals_received: string[];
  region: Region;
  business_sector: BusinessSector;
  total_duration?: string;
  created_by: string;
  approved_by?: string;
  locked_by?: string;
  retention_until: Date;
}

export interface ClosureStats {
  totalPeriods: number;
  openPeriods: number;
  inProgressPeriods: number;
  closedPeriods: number;
  avgCompletionTime: number;
  complianceRate: number;
}

export interface ClosureFilters {
  type?: ClosurePeriodType[];
  status?: ClosurePeriodStatus[];
  fiscalYear?: string;
  region?: Region;
}