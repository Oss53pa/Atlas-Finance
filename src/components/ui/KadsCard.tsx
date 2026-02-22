import React from 'react';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface KadsCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  color: 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'yellow';
  icon: LucideIcon;
  description?: string;
  target?: string;
  onClick?: () => void;
  className?: string;
}

const KadsCard: React.FC<KadsCardProps> = ({
  title,
  value,
  change,
  trend = 'neutral',
  color,
  icon: IconComponent,
  description,
  target,
  onClick,
  className = ''
}) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600',
    yellow: 'bg-yellow-100 text-yellow-600'
  };

  const gradientClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    orange: 'from-orange-500 to-orange-600',
    purple: 'from-purple-500 to-purple-600',
    red: 'from-red-500 to-red-600',
    yellow: 'from-yellow-500 to-yellow-600'
  };

  return (
    <div 
      className={`
        bg-white rounded-xl p-4 shadow-sm border border-[#e5e5e5]
        hover:shadow-lg transition-all duration-300 group
        ${onClick ? 'cursor-pointer hover:scale-105' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`
          w-10 h-10 rounded-xl flex items-center justify-center
          bg-gradient-to-r ${gradientClasses[color]}
          group-hover:shadow-md transition-shadow
        `}>
          <IconComponent className="w-5 h-5 text-white" />
        </div>
        
        {change && (
          <div className={`
            flex items-center space-x-1 text-sm font-medium
            ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'}
          `}>
            {trend === 'up' && <ArrowUpRight className="w-4 h-4" />}
            {trend === 'down' && <ArrowDownRight className="w-4 h-4" />}
            <span>{change}</span>
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-[#404040]">{value}</h3>
        <p className="text-[#404040] opacity-80 font-medium">{title}</p>
        {description && (
          <p className="text-[#404040] opacity-60 text-sm">{description}</p>
        )}
        
        {target && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-[#404040] opacity-50">Objectif: {target}</span>
            <div className="w-16 h-1 bg-[#e5e5e5] bg-opacity-50 rounded-full overflow-hidden">
              <div className={`h-full bg-${color}-500 rounded-full`} style={{width: '75%'}}></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KadsCard;