import React from 'react';
import CapitalizationModal from './CapitalizationModal';

interface InvoiceData {
  id: string;
  amount: number;
  supplier: string;
  description: string;
  account: string;
  date: string;
}

interface CapitalizationRequest {
  referenceNumber: string;
  requestDate: string;
  department: string;
  requesterName: string;
  assetNature: string;
  assetDescription: string;
  physicalLocation: string;
  estimatedUsefulLife: number;
  assetCategory: string;
  acquisitionDate: string;
  serviceDate: string;
  acquisitionCost: number;
  installationCosts: number;
  otherCapitalizableCosts: number;
  totalCapitalizableCost: number;
  depreciationMethod: string;
  depreciationRate: number;
  justification: string;
  criteriaRespected: string[];
  financialImpact: string;
  approvals: {
    departmentHead: boolean;
    financialController: boolean;
    management: boolean;
  };
}

interface CapitalizationModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CapitalizationRequest) => void;
  initialData?: InvoiceData;
}

const CapitalizationModalWrapper: React.FC<CapitalizationModalWrapperProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData
}) => {
  // Ne pas rendre le modal si il n'est pas ouvert
  if (!isOpen) {
    return null;
  }

  // Créer des données par défaut si initialData est undefined
  const safeInvoiceData: InvoiceData = initialData || {
    id: '',
    amount: 0,
    supplier: '',
    description: '',
    account: '',
    date: new Date().toISOString().split('T')[0]
  };

  return (
    <CapitalizationModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={onSubmit}
      invoiceData={safeInvoiceData}
    />
  );
};

export default CapitalizationModalWrapper;
