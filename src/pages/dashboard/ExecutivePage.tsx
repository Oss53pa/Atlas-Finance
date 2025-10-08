import React from 'react';
import ExecutiveDashboard from '../../components/dashboards/ExecutiveDashboard';

const ExecutivePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Executive Dashboard
          </h1>
          <p className="text-gray-700">
            Vue d'ensemble stratégique et indicateurs clés de performance
          </p>
        </div>

        <ExecutiveDashboard companyId="1" fiscalYearId="2024" />
      </div>
    </div>
  );
};

export default ExecutivePage;