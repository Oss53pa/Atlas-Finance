import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calculator, FileText, BookOpen, BarChart3, TrendingUp, DollarSign, 
  ArrowUpRight, ArrowDownRight, Plus, Download, Filter, RefreshCw,
  CheckCircle, Clock, AlertCircle, Target, Zap, Eye, Edit, Home,
  ArrowLeft, PieChart, Activity, Users
} from 'lucide-react';

interface JournalEntry {
  id: string;
  date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  status: 'draft' | 'validated' | 'posted';
}

const AccountingDashboardV2: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [activeTab, setActiveTab] = useState('overview');

  // Métriques comptables temps réel
  const accountingMetrics = [
    {
      title: 'Écritures du mois',
      value: '2,547',
      change: '+12.3%',
      trend: 'up' as const,
      color: '#6A8A82',
      icon: FileText,
      description: 'Validation: 98%',
      path: '/accounting/entries'
    },
    {
      title: 'Balance équilibrée',
      value: '100%',
      change: 'Conforme',
      trend: 'up' as const,
      color: '#B87333',
      icon: BarChart3,
      description: 'SYSCOHADA OK',
      path: '/accounting/balance'
    },
    {
      title: 'Lettrage automatique',
      value: '98.2%',
      change: '+1.5%',
      trend: 'up' as const,
      color: '#7A99AC',
      icon: Zap,
      description: '1,234 lignes',
      path: '/accounting/lettrage'
    },
    {
      title: 'CA comptabilisé',
      value: '€2.4M',
      change: '+15.8%',
      trend: 'up' as const,
      color: '#6A8A82',
      icon: DollarSign,
      description: 'Septembre 2025',
      path: '/accounting/sig'
    }
  ];

  // Dernières écritures
  const recentEntries: JournalEntry[] = [
    { id: 'E2025001', date: '2025-09-10', reference: 'VT001', description: 'Vente ABC Corp - Facture F2025-089', debit: 0, credit: 2500, status: 'validated' },
    { id: 'E2025002', date: '2025-09-10', reference: 'AC045', description: 'Achat fournitures bureau - Bon BC-445', debit: 450, credit: 0, status: 'posted' },
    { id: 'E2025003', date: '2025-09-09', reference: 'SAL09', description: 'Salaires septembre 2025 - Équipe', debit: 15000, credit: 0, status: 'validated' },
    { id: 'E2025004', date: '2025-09-09', reference: 'EDF12', description: 'Facture électricité septembre', debit: 280, credit: 0, status: 'draft' },
  ];

  // Onglets comptabilité
  const accountingTabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
    { id: 'entries', label: 'Écritures récentes', icon: FileText },
    { id: 'validation', label: 'En attente', icon: Clock, badge: '8' },
    { id: 'syscohada', label: 'États SYSCOHADA', icon: PieChart },
  ];

  return (
    <div className="min-h-screen bg-[#ECECEC] font-['Sometype Mono']">
      {/* Header comptabilité amélioré */}
      <div className="bg-white border-b border-[#D9D9D9] sticky top-0 z-40">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => navigate('/')}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-[#444444]" />
                <span className="text-sm font-semibold text-[#444444]">Workspaces</span>
              </button>
              
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#6A8A82] to-[#5A7A72] flex items-center justify-center">
                  <Calculator className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[#191919]">Module Comptabilité</h1>
                  <p className="text-sm text-[#767676]">Gestion comptable SYSCOHADA</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button 
                onClick={() => navigate('/dashboard/comptable')}
                className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors flex items-center space-x-2"
              >
                <Home className="w-4 h-4" />
                <span className="text-sm">Workspace</span>
              </button>
              
              <select 
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 border border-[#D9D9D9] rounded-lg text-sm focus:ring-2 focus:ring-[#6A8A82]/20"
              >
                <option value="current">Période actuelle</option>
                <option value="month">Ce mois</option>
                <option value="quarter">Ce trimestre</option>
                <option value="year">Cette année</option>
              </select>
              
              <button className="p-2 border border-[#D9D9D9] rounded-lg hover:bg-gray-50">
                <RefreshCw className="w-4 h-4 text-[#767676]" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation par onglets */}
        <div className="px-6">
          <nav className="flex space-x-8">
            {accountingTabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === tab.id 
                      ? 'border-[#6A8A82] text-[#6A8A82]' 
                      : 'border-transparent text-[#767676] hover:text-[#444444]'
                    }
                  `}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className={`
                      px-2 py-0.5 text-xs font-medium rounded-full
                      ${activeTab === tab.id ? 'bg-[#6A8A82] text-white' : 'bg-red-100 text-red-600'}
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

      {/* Contenu principal */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Métriques style workspace */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {accountingMetrics.map((metric, index) => {
                const IconComponent = metric.icon;
                return (
                  <div 
                    key={index} 
                    className="bg-white rounded-lg p-4 border border-[#E8E8E8] hover:shadow-lg transition-all cursor-pointer group"
                    onClick={() => navigate(metric.path)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{backgroundColor: `${metric.color}20`}}
                      >
                        <IconComponent className="w-6 h-6" style={{color: metric.color}} />
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`text-xs font-medium flex items-center space-x-1 ${
                          metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {metric.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          <span>{metric.change}</span>
                        </div>
                        <Eye className="w-3 h-3 text-[#767676] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-[#191919] mb-1">{metric.value}</h3>
                    <p className="text-sm font-medium text-[#444444] mb-1">{metric.title}</p>
                    <p className="text-xs text-[#767676]">{metric.description}</p>
                    <div className="mt-2 text-xs font-medium" style={{color: metric.color}}>
                      Consulter →
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions comptables */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <h2 className="text-lg font-semibold text-[#191919] mb-4">Actions Comptables Rapides</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Nouvelle écriture', icon: Plus, path: '/accounting/entries', color: '#6A8A82' },
                  { label: 'Validation lot', icon: CheckCircle, path: '/accounting/entries', color: '#B87333' },
                  { label: 'Lettrage auto', icon: Zap, path: '/accounting/lettrage', color: '#7A99AC' },
                  { label: 'États financiers', icon: PieChart, path: '/financial-statements', color: '#6A8A82' }
                ].map((action, index) => {
                  const IconComponent = action.icon;
                  return (
                    <button 
                      key={index}
                      onClick={() => navigate(action.path)}
                      className="p-3 rounded-lg border-2 border-dashed border-[#D9D9D9] hover:border-[#6A8A82] hover:bg-[#6A8A82]/5 transition-colors group"
                    >
                      <div className="text-center">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-opacity-30 transition-colors"
                          style={{backgroundColor: `${action.color}20`}}
                        >
                          <IconComponent className="w-4 h-4" style={{color: action.color}} />
                        </div>
                        <span className="text-xs font-medium text-[#444444]">{action.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'entries' && (
          <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm">
            <div className="p-6 border-b border-[#E8E8E8]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#191919]">Écritures Comptables</h2>
                  <p className="text-sm text-[#767676]">Dernières saisies et validations</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button className="p-2 border border-[#D9D9D9] rounded-lg hover:bg-gray-50">
                    <Filter className="w-4 h-4 text-[#767676]" />
                  </button>
                  <button className="p-2 border border-[#D9D9D9] rounded-lg hover:bg-gray-50">
                    <Download className="w-4 h-4 text-[#767676]" />
                  </button>
                  <button 
                    onClick={() => navigate('/accounting/entries')}
                    className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">Nouvelle écriture</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#767676] uppercase">Référence</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#767676] uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#767676] uppercase">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-[#767676] uppercase">Débit</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-[#767676] uppercase">Crédit</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-[#767676] uppercase">Statut</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-[#767676] uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono text-[#191919]">{entry.reference}</td>
                      <td className="px-4 py-3 text-sm text-[#444444]">{entry.date}</td>
                      <td className="px-4 py-3 text-sm text-[#444444]">{entry.description}</td>
                      <td className="px-4 py-3 text-sm font-mono text-right">
                        {entry.debit > 0 && (
                          <span className="text-red-600 font-medium">{entry.debit.toLocaleString()}€</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-right">
                        {entry.credit > 0 && (
                          <span className="text-green-600 font-medium">{entry.credit.toLocaleString()}€</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          entry.status === 'validated' ? 'bg-green-100 text-green-800' :
                          entry.status === 'posted' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {entry.status === 'validated' ? 'Validé' : entry.status === 'posted' ? 'Comptabilisé' : 'Brouillon'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button className="text-[#6A8A82] hover:text-[#5A7A72]">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="text-[#B87333] hover:text-[#A86323]">
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountingDashboardV2;