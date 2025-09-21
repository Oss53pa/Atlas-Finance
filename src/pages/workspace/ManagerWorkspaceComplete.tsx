import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import { 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  DollarSign,
  Users,
  Target,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Home,
  Briefcase,
  Calendar,
  MessageSquare
} from 'lucide-react';

const ManagerWorkspaceComplete: React.FC = () => {
  const [activeModule, setActiveModule] = useState('overview');
  const [timeRange, setTimeRange] = useState('month');
  const navigate = useNavigate();

  // Liens Manager vers WiseBook
  const managerLinks = [
    { id: 'financial', label: 'Analyse financière', icon: DollarSign, path: '/financial-analysis-advanced' },
    { id: 'performance', label: 'Performance', icon: TrendingUp, path: '/reporting/dashboards' },
    { id: 'forecasts', label: 'Prévisions', icon: Target, path: '/treasury/cash-flow' },
    { id: 'reports', label: 'Rapports', icon: PieChart, path: '/reports' },
    { id: 'teams', label: 'Équipes', icon: Users, path: '/security/users' },
    { id: 'objectives', label: 'Objectifs', icon: Briefcase, path: '/budgeting' },
    { id: 'collaboration', label: 'Chat & Collaboration', icon: MessageSquare, path: '/collaboration' },
  ];

  // Sidebar du manager
  const sidebar = (
    <div className="p-4">
      {/* Bouton accès direct WiseBook complet */}
      <div className="mb-6">
        <button 
          onClick={() => navigate('/executive')}
          className="w-full p-4 bg-gradient-to-r from-[#B87333] to-[#A86323] rounded-lg text-white hover:shadow-lg transition-all group"
        >
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Home className="w-5 h-5" />
            <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-sm font-semibold">WiseBook Executive</div>
          <div className="text-xs opacity-90">Dashboard consolidé complet</div>
        </button>
      </div>

      {/* Séparateur */}
      <div className="border-b border-[#E8E8E8] mb-4 pb-4">
        <div className="text-xs font-semibold text-[#767676] uppercase tracking-wide">Modules Manager</div>
      </div>

      {/* Vue d'ensemble locale */}
      <div className="mb-4">
        <button
          onClick={() => setActiveModule('overview')}
          className={`
            w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors
            ${activeModule === 'overview'
              ? 'bg-gradient-to-r from-[#B87333] to-[#A86323] text-white' 
              : 'text-[#444444] hover:text-[#B87333] hover:bg-gray-50'
            }
          `}
        >
          <BarChart3 className="w-4 h-4" />
          <span className="text-sm font-medium">Vue d'ensemble</span>
        </button>
      </div>

      {/* Liens WiseBook */}
      <div className="space-y-1">
        {managerLinks.map((item) => {
          const IconComponent = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-[#444444] hover:text-[#B87333] hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <IconComponent className="w-4 h-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          );
        })}
      </div>

      {/* Raccourcis rapides */}
      <div className="mt-6 pt-4 border-t border-[#E8E8E8]">
        <div className="text-xs font-semibold text-[#767676] uppercase tracking-wide mb-3">Raccourcis</div>
        <div className="space-y-2">
          <button 
            onClick={() => navigate('/customers')}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-[#444444] hover:text-[#B87333] hover:bg-gray-50 transition-colors group"
          >
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span className="text-sm">Dashboard clients</span>
            </div>
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          
          <button 
            onClick={() => navigate('/treasury')}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-[#444444] hover:text-[#B87333] hover:bg-gray-50 transition-colors group"
          >
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">Trésorerie temps réel</span>
            </div>
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
      </div>
    </div>
  );

  // Vue d'ensemble avec liens vers WiseBook
  const renderOverview = () => (
    <div className="p-6 space-y-6">
      {/* Contrôles temporels */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#191919]">Dashboard Manager</h1>
          <p className="text-sm text-[#767676]">Performance et pilotage - Liens vers WiseBook</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate('/executive')}
            className="px-4 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323] transition-colors flex items-center space-x-2"
          >
            <Home className="w-4 h-4" />
            <span className="text-sm">WiseBook Executive</span>
          </button>
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-[#D9D9D9] rounded-lg text-sm focus:ring-2 focus:ring-[#B87333]/20"
          >
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="quarter">Ce trimestre</option>
            <option value="year">Cette année</option>
          </select>
          <button className="p-2 border border-[#D9D9D9] rounded-lg hover:bg-gray-50">
            <RefreshCw className="w-4 h-4 text-[#767676]" />
          </button>
        </div>
      </div>

      {/* KPIs avec liens vers analyses */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Chiffre d\'Affaires', value: '€2.4M', change: '+15.3%', trend: 'up', color: '#B87333', icon: DollarSign, path: '/financial-analysis-advanced' },
          { title: 'Marge Brute', value: '38.5%', change: '+2.1%', trend: 'up', color: '#6A8A82', icon: TrendingUp, path: '/accounting/sig' },
          { title: 'DSO Clients', value: '32j', change: '-5j', trend: 'up', color: '#7A99AC', icon: Target, path: '/customers' },
          { title: 'Trésorerie', value: '€890K', change: '+12.8%', trend: 'up', color: '#B87333', icon: Activity, path: '/treasury' }
        ].map((kpi, index) => {
          const IconComponent = kpi.icon;
          return (
            <div 
              key={index} 
              className="bg-white rounded-lg p-4 border border-[#E8E8E8] hover:shadow-md transition-all cursor-pointer group"
              onClick={() => navigate(kpi.path)}
            >
              <div className="flex items-center justify-between mb-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{backgroundColor: `${kpi.color}20`}}
                >
                  <IconComponent className="w-5 h-5" style={{color: kpi.color}} />
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`text-xs font-medium flex items-center space-x-1 ${
                    kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {kpi.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    <span>{kpi.change}</span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-[#767676] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-[#191919] mb-1">{kpi.value}</h3>
              <p className="text-sm text-[#444444]">{kpi.title}</p>
              <p className="text-xs text-[#B87333] mt-1">Cliquer pour analyser →</p>
            </div>
          );
        })}
      </div>

      {/* Accès rapides aux modules WiseBook */}
      <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
        <h2 className="text-lg font-semibold text-[#191919] mb-4">Accès Rapides WiseBook</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { title: 'Clients & Recouvrement', desc: 'Dashboard clients complet', path: '/customers', icon: Users, color: '#6A8A82' },
            { title: 'Analyse Financière', desc: 'TAFIRE, SIG, ratios', path: '/financial-analysis-advanced', icon: TrendingUp, color: '#B87333' },
            { title: 'Trésorerie Avancée', desc: 'Position, appels de fonds', path: '/treasury', icon: DollarSign, color: '#7A99AC' },
            { title: 'Reporting BI', desc: 'Rapports et analytics', path: '/reports', icon: PieChart, color: '#B87333' },
            { title: 'Configuration', desc: 'Paramètres système', path: '/parameters', icon: Target, color: '#7A99AC' },
            { title: 'Budgets', desc: 'Contrôle budgétaire', path: '/budgeting', icon: Calendar, color: '#6A8A82' },
          ].map((module, index) => {
            const IconComponent = module.icon;
            return (
              <button
                key={index}
                onClick={() => navigate(module.path)}
                className="p-4 text-left rounded-lg border border-[#E8E8E8] hover:border-[#B87333] hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{backgroundColor: `${module.color}20`}}
                  >
                    <IconComponent className="w-5 h-5" style={{color: module.color}} />
                  </div>
                  <ExternalLink className="w-4 h-4 text-[#767676] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="font-semibold text-[#191919] text-sm mb-1">{module.title}</h3>
                <p className="text-xs text-[#767676] leading-relaxed">{module.desc}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <WorkspaceLayout
      workspaceTitle="Espace Manager"
      workspaceIcon={TrendingUp}
      sidebar={sidebar}
      userRole="manager"
      notifications={8}
    >
      {renderOverview()}
    </WorkspaceLayout>
  );
};

export default ManagerWorkspaceComplete;