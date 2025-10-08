import React from 'react';

interface LineChartProps {
  data: any[];
  xAxisKey: string;
  lines: Array<{ key: string; name: string; color: string }>;
  height: number;
}

const LineChart: React.FC<LineChartProps> = ({ data, xAxisKey, lines, height }) => {
  return (
    <div style={{ height: `${height}px`, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="text-center p-8">
        <div className="text-4xl mb-4">📈</div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Graphique Linéaire</h3>
        <p className="text-gray-700 mb-4">Affichage des tendances temporelles</p>
        <div className="space-y-2">
          {lines.map((line, index) => (
            <div key={index} className="flex items-center justify-center space-x-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: line.color }}></div>
              <span className="text-sm text-gray-600">{line.name}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-700 mt-4">
          {data.length} points de données • Axe: {xAxisKey}
        </p>
      </div>
    </div>
  );
};

export default LineChart;