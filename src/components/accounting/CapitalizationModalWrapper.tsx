import React from 'react';
import CapitalizationModal from './CapitalizationModal';

interface CapitalizationData {
  description: string;
  amount: number;
  date: string;
  [key: string]: unknown;
}

interface CapitalizationSuggestion {
  description?: string;
  amount?: number;
  date?: string;
  [key: string]: unknown;
}

interface CapitalizationModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CapitalizationData) => void;
  initialData?: CapitalizationData;
  suggestion?: CapitalizationSuggestion;
}

const CapitalizationModalWrapper: React.FC<CapitalizationModalWrapperProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  suggestion
}) => {
  // Ne pas rendre le modal si il n'est pas ouvert
  if (!isOpen) {
    return null;
  }

  // Créer des données par défaut si initialData est undefined
  const safeInitialData = initialData || {
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0]
  };

  return (
    <CapitalizationModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={onSubmit}
      initialData={safeInitialData}
      suggestion={suggestion}
    />
  );
};

export default CapitalizationModalWrapper;