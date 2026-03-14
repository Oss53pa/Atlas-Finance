import React from 'react';

interface Props {
  type?: string;
  data?: any[];
  config?: Record<string, any>;
  className?: string;
}

const ChartPreview: React.FC<Props> = ({ type = 'bar', className = '' }) => (
  <div className={`bg-gray-50 rounded-lg border p-6 flex items-center justify-center ${className}`}>
    <p className="text-sm text-gray-400">Apercu graphique ({type})</p>
  </div>
);

export default ChartPreview;
