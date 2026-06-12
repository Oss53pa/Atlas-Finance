import React from 'react';
import AdvancedGeneralLedger from '../../components/accounting/AdvancedGeneralLedger';
import DataPageLayout from '../../components/layout/DataPageLayout';

/**
 * Grand Livre — gabarit standard des écrans de travail (DataPageLayout) :
 * la fenêtre ne défile pas, le contenu défile dans son unique zone.
 */
const GeneralLedgerPage: React.FC = () => {
  return (
    <DataPageLayout>
      <AdvancedGeneralLedger />
    </DataPageLayout>
  );
};

export default GeneralLedgerPage;
