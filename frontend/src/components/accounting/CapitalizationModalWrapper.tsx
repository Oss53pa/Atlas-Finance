import React from 'react';
import CapitalizationModal from './CapitalizationModal';

interface CapitalizationModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
  suggestion?: any;
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