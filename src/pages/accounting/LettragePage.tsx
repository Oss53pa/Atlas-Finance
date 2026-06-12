import React from 'react';
import Lettrage from '../../components/accounting/Lettrage';
import DataPageLayout from '../../components/layout/DataPageLayout';

/**
 * Lettrage — gabarit standard des écrans de travail (DataPageLayout) :
 * la fenêtre ne défile pas, le contenu défile dans son unique zone.
 */
const LettragePage: React.FC = () => {
  return (
    <DataPageLayout>
      <Lettrage />
    </DataPageLayout>
  );
};

export default LettragePage;
