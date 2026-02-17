import React from 'react';
import AdvancedGeneralLedger from '../../components/accounting/AdvancedGeneralLedger';

const GeneralLedgerPage: React.FC = () => {
  return (
    <div className="h-full w-full overflow-auto">
      <AdvancedGeneralLedger />
    </div>
  );
};

export default GeneralLedgerPage;