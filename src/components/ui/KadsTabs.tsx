import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon?: LucideIcon;
  badge?: string | number;
  content?: ReactNode;
}

interface KadsTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  color?: 'blue' | 'green' | 'purple' | 'orange';
  className?: string;
}

const KadsTabs: React.FC<KadsTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  color = 'blue',
  className = ''
}) => {
  const colorClasses = {
    blue: 'border-blue-500 text-blue-600',
    green: 'border-green-500 text-green-600',
    purple: 'border-purple-500 text-purple-600',
    orange: 'border-orange-500 text-orange-600'
  };

  const badgeClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600'
  };

  return (
    <div className={className}>
      {/* Navigation des onglets */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`
                    flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors
                    ${isActive 
                      ? colorClasses[color]
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {IconComponent && (
                    <IconComponent className="w-4 h-4" />
                  )}
                  <span>{tab.label}</span>
                  
                  {tab.badge && (
                    <span className={`
                      px-2 py-1 text-xs font-medium rounded-full
                      ${isActive ? badgeClasses[color] : 'bg-gray-100 text-gray-600'}
                    `}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Contenu de l'onglet actif */}
      <div className="p-6">
        {tabs.find(tab => tab.id === activeTab)?.content}
      </div>
    </div>
  );
};

export default KadsTabs;