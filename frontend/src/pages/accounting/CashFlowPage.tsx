import React from 'react';
import AdvancedFinancialStatements from '../../components/financial/AdvancedFinancialStatements';

const CashFlowPage: React.FC = () => {
  return (
    <AdvancedFinancialStatements defaultView="flux" />
  );
};

export default CashFlowPage;