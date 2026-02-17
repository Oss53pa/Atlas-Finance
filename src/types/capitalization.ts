export interface CapitalizationRequest {
  id: string;
  referenceNumber: string;
  requestDate: string;
  status: CapitalizationStatus;

  // Informations générales
  department: string;
  requesterName: string;
  requesterSignature?: string;

  // Facture source
  sourceInvoice: {
    id: string;
    amount: number;
    supplier: string;
    description: string;
    account: string;
    date: string;
  };

  // Description de l'actif
  assetNature: string;
  assetDescription: string;
  physicalLocation: string;
  estimatedUsefulLife: number;
  assetCategory: string;

  // Informations financières
  acquisitionCost: number;
  installationCosts: number;
  otherCapitalizableCosts: number;
  totalCapitalizableCost: number;
  depreciationMethod: string;
  depreciationRate: number;

  // Justification
  justification: string;
  criteriaRespected: string[];
  financialImpact: string;

  // Workflow
  currentStep: WorkflowStep;
  approvals: ApprovalRecord[];
  history: WorkflowHistory[];

  // Métadonnées
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type CapitalizationStatus =
  | 'draft'           // Brouillon
  | 'pending_dept'    // En attente chef de service
  | 'pending_finance' // En attente contrôleur financier
  | 'pending_mgmt'    // En attente direction
  | 'approved'        // Approuvé
  | 'rejected'        // Rejeté
  | 'processing'      // En cours de traitement
  | 'completed';      // Terminé (actif créé)

export type WorkflowStep =
  | 'creation'
  | 'department_approval'
  | 'financial_control'
  | 'management_approval'
  | 'asset_creation'
  | 'completed';

export interface ApprovalRecord {
  step: WorkflowStep;
  approver: string;
  decision: 'approved' | 'rejected' | 'pending';
  comment?: string;
  timestamp?: string;
  requiredAmount?: number; // Seuil requis pour cette approbation
}

export interface WorkflowHistory {
  step: WorkflowStep;
  status: CapitalizationStatus;
  user: string;
  timestamp: string;
  action: string;
  comment?: string;
}

export interface CapitalizationWorkflowConfig {
  approvalThresholds: {
    departmentHead: number;
    financialController: number;
    management: number;
  };
  automaticApprovalLimit: number;
  mandatoryFields: {
    [key in WorkflowStep]: string[];
  };
}

export const defaultWorkflowConfig: CapitalizationWorkflowConfig = {
  approvalThresholds: {
    departmentHead: 1000,
    financialController: 5000,
    management: 20000
  },
  automaticApprovalLimit: 500,
  mandatoryFields: {
    creation: ['department', 'requesterName', 'assetDescription'],
    department_approval: ['assetNature', 'assetCategory', 'physicalLocation'],
    financial_control: ['justification', 'criteriaRespected', 'financialImpact'],
    management_approval: [],
    asset_creation: [],
    completed: []
  }
};

export interface CapitalizationValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class CapitalizationValidator {
  static validate(request: CapitalizationRequest, step: WorkflowStep): CapitalizationValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validation des champs obligatoires
    const requiredFields = defaultWorkflowConfig.mandatoryFields[step];
    for (const field of requiredFields) {
      if (!this.getFieldValue(request, field)) {
        errors.push(`Le champ ${field} est requis pour cette étape`);
      }
    }

    // Validation du montant
    if (request.totalCapitalizableCost <= 0) {
      errors.push('Le montant total doit être supérieur à 0');
    }

    // Validation du seuil de capitalisation
    if (request.totalCapitalizableCost < 500) {
      warnings.push('Le montant est inférieur au seuil de capitalisation habituel (500€)');
    }

    // Validation de la durée de vie
    if (request.estimatedUsefulLife <= 0 || request.estimatedUsefulLife > 50) {
      errors.push('La durée de vie utile doit être entre 1 et 50 ans');
    }

    // Validation du taux d'amortissement
    if (request.depreciationRate <= 0 || request.depreciationRate > 100) {
      errors.push('Le taux d\'amortissement doit être entre 0 et 100%');
    }

    // Validation des critères de capitalisation
    if (step === 'financial_control' && request.criteriaRespected.length === 0) {
      errors.push('Au moins un critère de capitalisation doit être sélectionné');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private static getFieldValue(obj: any, field: string): any {
    return field.split('.').reduce((o, key) => o?.[key], obj);
  }
}

export class CapitalizationWorkflow {
  static getNextStep(request: CapitalizationRequest): WorkflowStep | null {
    const amount = request.totalCapitalizableCost;

    switch (request.currentStep) {
      case 'creation':
        return 'department_approval';

      case 'department_approval':
        if (amount >= defaultWorkflowConfig.approvalThresholds.financialController) {
          return 'financial_control';
        }
        return 'asset_creation';

      case 'financial_control':
        if (amount >= defaultWorkflowConfig.approvalThresholds.management) {
          return 'management_approval';
        }
        return 'asset_creation';

      case 'management_approval':
        return 'asset_creation';

      case 'asset_creation':
        return 'completed';

      case 'completed':
        return null;

      default:
        return null;
    }
  }

  static getRequiredApprovers(request: CapitalizationRequest): WorkflowStep[] {
    const amount = request.totalCapitalizableCost;
    const steps: WorkflowStep[] = ['department_approval'];

    if (amount >= defaultWorkflowConfig.approvalThresholds.financialController) {
      steps.push('financial_control');
    }

    if (amount >= defaultWorkflowConfig.approvalThresholds.management) {
      steps.push('management_approval');
    }

    return steps;
  }

  static canApprove(request: CapitalizationRequest, userRole: string): boolean {
    const step = request.currentStep;

    switch (step) {
      case 'department_approval':
        return userRole === 'department_head' || userRole === 'admin';

      case 'financial_control':
        return userRole === 'financial_controller' || userRole === 'admin';

      case 'management_approval':
        return userRole === 'management' || userRole === 'admin';

      default:
        return false;
    }
  }

  static getStatusFromStep(step: WorkflowStep): CapitalizationStatus {
    switch (step) {
      case 'creation':
        return 'draft';
      case 'department_approval':
        return 'pending_dept';
      case 'financial_control':
        return 'pending_finance';
      case 'management_approval':
        return 'pending_mgmt';
      case 'asset_creation':
        return 'processing';
      case 'completed':
        return 'completed';
      default:
        return 'draft';
    }
  }
}