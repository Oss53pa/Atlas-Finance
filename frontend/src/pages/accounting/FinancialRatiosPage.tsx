import React from 'react';
import AdvancedFinancialStatements from '../../components/financial/AdvancedFinancialStatements';

const FinancialRatiosPage: React.FC = () => {
  return (
    <AdvancedFinancialStatements defaultView="ratios" />
  );
};

export default FinancialRatiosPage;