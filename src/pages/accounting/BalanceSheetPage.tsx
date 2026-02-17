import React from 'react';
import AdvancedFinancialStatements from '../../components/financial/AdvancedFinancialStatements';

const BalanceSheetPage: React.FC = () => {
  return (
    <AdvancedFinancialStatements defaultView="bilan" />
  );
};

export default BalanceSheetPage;