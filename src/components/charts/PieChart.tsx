import React from 'react';

interface PieChartProps {
  data: Record<string, unknown>[];
  dataKey: string;
  nameKey: string;
  height: number;
  colors?: string[];
}

const PieChart: React.FC<PieChartProps> = ({ data, dataKey, nameKey, height, colors }) => {
  return (
    <div style={{ height: `${height}px`, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="text-center p-8">
        <div className="text-xl mb-4">🥧</div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Graphique Circulaire</h3>
        <p className="text-gray-700 mb-4">Répartition par segments</p>
        <div className="space-y-2">
          {data.slice(0, 4).map((item, index) => (
            <div key={index} className="flex items-center justify-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: colors?.[index] || `hsl(${index * 60}, 70%, 50%)` }}
              ></div>
              <span className="text-sm text-gray-600">
                {String(item[nameKey])}: {String(item[dataKey])}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-700 mt-4">
          {data.length} segments • Clé: {dataKey}
        </p>
      </div>
    </div>
  );
};

export default PieChart;