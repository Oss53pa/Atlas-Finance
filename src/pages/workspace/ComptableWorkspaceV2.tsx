import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import { 
  Calculator, 
  FileText, 
  BookOpen,
  BarChart3,
  Users,
  Banknote,
  PieChart,
  TrendingUp,
  Clock,
  CheckCircle,
  Plus,
  DollarSign,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Home
} from 'lucide-react';

const ComptableWorkspaceV2: React.FC = () => {
  const [activeModule, setActiveModule] = useState('dashboard');
  const navigate = useNavigate();

  // Liens directs vers WiseBook
  const wiseBookLinks = [
    { id: 'entries', label: 'Saisie d\'écritures', icon: FileText, badge: '5', path: '/accounting/entries' },
    { id: 'journals', label: 'Journaux', icon: BookOpen, path: '/accounting/journals' },
    { id: 'ledger', label: 'Grand livre', icon: Calculator, path: '/accounting/general-ledger' },
    { id: 'balance', label: 'Balance générale', icon: PieChart, path: '/accounting/balance' },
    { id: 'statements', label: 'États financiers', icon: TrendingUp, path: '/accounting/financial-statements' },
    { id: 'thirds', label: 'Gestion tiers', icon: Users, path: '/third-party' },
    { id: 'banking', label: 'Banque', icon: Banknote, path: '/treasury' },
  ];

  // Sidebar du comptable avec vrais liens
  const sidebar = (
    <div className="p-4">
      {/* Bouton accès direct WiseBook complet */}
      <div className="mb-6">
        <button 
          onClick={() => navigate('/executive')}
          className="w-full p-4 bg-gradient-to-r from-[#6A8A82] to-[#5A7A72] rounded-lg text-white hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Home className="w-5 h-5" />
            <ExternalLink className="w-4 h-4" />
          </div>
          <div className="text-sm font-semibold">WiseBook Complet</div>
          <div className="text-xs opacity-90">Accès intégral à tous les modules</div>
        </button>
      </div>

      {/* Séparateur */}
      <div className="border-b border-[#E8E8E8] mb-4 pb-4">
        <div className="text-xs font-semibold text-[#767676] uppercase tracking-wide">Modules Comptables</div>
      </div>

      {/* Liens rapides vers WiseBook */}
      <div className="space-y-1">
        <button
          onClick={() => setActiveModule('dashboard')}
          className={`
            w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors
            ${activeModule === 'dashboard'
              ? 'bg-gradient-to-r from-[#6A8A82] to-[#5A7A72] text-white' 
              : 'text-[#444444] hover:text-[#6A8A82] hover:bg-gray-50'
            }
          `}
        >
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-4 h-4" />
            <span className="text-sm font-medium">Vue d'ensemble</span>
          </div>
        </button>

        {wiseBookLinks.map((item) => {
          const IconComponent = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-[#444444] hover:text-[#6A8A82] hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <IconComponent className="w-4 h-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              <div className="flex items-center space-x-1">
                {item.badge && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-600">
                    {item.badge}
                  </span>
                )}
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Section raccourcis */}
      <div className="mt-6 pt-4 border-t border-[#E8E8E8]">
        <div className="text-xs font-semibold text-[#767676] uppercase tracking-wide mb-3">Raccourcis</div>
        <div className="space-y-2">
          <button 
            onClick={() => navigate('/accounting/lettrage')}
            className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left text-[#444444] hover:text-[#6A8A82] hover:bg-gray-50 transition-colors"
          >
            <Zap className="w-4 h-4" />
            <span className="text-sm">Lettrage automatique</span>
          </button>
          <button 
            onClick={() => navigate('/financial-statements')}
            className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left text-[#444444] hover:text-[#6A8A82] hover:bg-gray-50 transition-colors"
          >
            <PieChart className="w-4 h-4" />
            <span className="text-sm">États SYSCOHADA</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <WorkspaceLayout
      workspaceTitle="Espace Comptable"
      workspaceIcon={Calculator}
      sidebar={sidebar}
      userRole="comptable"
      notifications={5}
    >
      <div className="p-6">
        <div className="text-center text-gray-500">
          <Calculator className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <p>Sélectionnez un module dans la barre latérale pour commencer</p>
          <p className="text-sm mt-2">Ou utilisez le bouton "WiseBook Complet" pour accéder à tous les modules</p>
        </div>
      </div>
    </WorkspaceLayout>
  );
};

export default ComptableWorkspaceV2;