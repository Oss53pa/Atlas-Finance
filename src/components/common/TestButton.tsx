import React from 'react';
import { Button } from '../ui';
import { toast } from 'react-hot-toast';

/**
 * Composant de test pour vérifier que les boutons fonctionnent
 */
export const TestButton: React.FC<{ label: string }> = ({ label }) => {
  const handleClick = () => {
    toast.success(`Bouton "${label}" cliqué !`);
    alert(`Le bouton "${label}" fonctionne correctement !`);
  };

  return (
    <Button onClick={handleClick} className="bg-green-500 hover:bg-green-600">
      TEST: {label}
    </Button>
  );
};
