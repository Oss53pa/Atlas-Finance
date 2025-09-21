import React from 'react';
import FinancialAnalysisDashboard from '../../components/dashboards/FinancialAnalysisDashboard';

const FinancialAnalysisPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Analyse Financière Avancée
          </h1>
          <p className="text-gray-600">
            Ratios, tendances et analyses de performance financière
          </p>
        </div>
        
        <FinancialAnalysisDashboard companyId="1" fiscalYearId="2024" />
      </div>
    </div>
  );
};

export default FinancialAnalysisPage;