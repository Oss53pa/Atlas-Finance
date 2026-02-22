import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { MonthlyBudget } from '../types/budgeting.types';
import { formatCurrency } from '@/shared/utils/formatters';

interface MonthlyBudgetChartProps {
  data: MonthlyBudget[];
  type?: 'line' | 'bar';
  loading?: boolean;
}

export const MonthlyBudgetChart: React.FC<MonthlyBudgetChartProps> = ({
  data,
  type = 'bar',
  loading,
}) => {
  if (loading) {
    return (
      <div className="w-full h-[400px] bg-[#F5F5F5] rounded-lg animate-pulse flex items-center justify-center">
        <p className="text-[#737373]">Chargement du graphique...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[400px] bg-[#F5F5F5] rounded-lg flex items-center justify-center">
        <p className="text-[#737373]">Aucune donnée disponible</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number; payload: Record<string, unknown> }> }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white border border-[#d4d4d4] rounded-lg shadow-lg p-3">
        <p className="font-semibold text-[#171717] mb-2">{payload[0].payload.month as string}</p>
        {payload.map((entry, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
        {payload[0].payload.variance !== undefined && (
          <p className="text-sm text-[#737373] mt-1 pt-1 border-t border-[#d4d4d4]">
            Écart: {formatCurrency(Math.abs(payload[0].payload.variance))}
          </p>
        )}
      </div>
    );
  };

  const ChartComponent = type === 'line' ? LineChart : BarChart;

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
          <XAxis
            dataKey="month"
            stroke="#737373"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#737373"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => {
              if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}Md`;
              if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
              if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
              return value.toString();
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '14px' }}
            iconType="circle"
          />

          {type === 'line' ? (
            <>
              <Line
                type="monotone"
                dataKey="budget"
                stroke="#171717"
                strokeWidth={2}
                name="Budget"
                dot={{ fill: '#171717', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#525252"
                strokeWidth={2}
                name="Réalisé"
                dot={{ fill: '#525252', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </>
          ) : (
            <>
              <Bar
                dataKey="budget"
                fill="#171717"
                name="Budget"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="actual"
                fill="#525252"
                name="Réalisé"
                radius={[4, 4, 0, 0]}
              />
            </>
          )}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
};