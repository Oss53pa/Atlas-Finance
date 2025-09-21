import React, { useState } from 'react';
import { 
  Calculator, 
  FileText, 
  TrendingUp, 
  DollarSign,
  CheckCircle,
  AlertCircle,
  Clock,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Search,
  Filter,
  Download
} from 'lucide-react';

const ComptableDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  // Données métriques style Kads Agency
  const metrics = [
    {
      title: 'Écritures du jour',
      value: '47',
      change: '+12%',
      trend: 'up',
      color: 'blue',
      icon: FileText,
      description: 'Nouvelles écritures'
    },
    {
      title: 'En attente validation',
      value: '8',
      change: '-5%',
      trend: 'down', 
      color: 'orange',
      icon: Clock,
      description: 'À valider'
    },
    {
      title: 'Lettrage automatique',
      value: '156',
      change: '+23%',
      trend: 'up',
      color: 'green',
      icon: CheckCircle,
      description: 'Lettré aujourd\'hui'
    },
    {
      title: 'Solde de trésorerie',
      value: '2.4M€',
      change: '+8.5%',
      trend: 'up',
      color: 'purple',
      icon: DollarSign,
      description: 'Position actuelle'
    }
  ];

  const recentEntries = [
    { id: 'E2024001', date: '10/09/2025', description: 'Achat fournitures bureau', debit: '450.00', credit: '0.00', status: 'validated' },
    { id: 'E2024002', date: '10/09/2025', description: 'Vente client ABC Corp', debit: '0.00', credit: '2,500.00', status: 'pending' },
    { id: 'E2024003', date: '10/09/2025', description: 'Salaires septembre', debit: '15,000.00', credit: '0.00', status: 'validated' },
    { id: 'E2024004', date: '10/09/2025', description: 'Facture électricité', debit: '280.00', credit: '0.00', status: 'draft' },
  ];

  const quickActions = [
    { label: 'Nouvelle écriture', icon: Plus, color: 'blue', path: '/accounting/entries' },
    { label: 'Lettrage auto', icon: CheckCircle, color: 'green', path: '/accounting/lettrage' },
    { label: 'Balance', icon: BarChart3, color: 'purple', path: '/accounting/balance' },
    { label: 'États financiers', icon: PieChart, color: 'orange', path: '/financial-statements' },
  ];

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
    { id: 'entries', label: 'Écritures', icon: FileText },
    { id: 'validation', label: 'Validation', icon: CheckCircle },
    { id: 'reports', label: 'Rapports', icon: PieChart },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Espace Comptable</h1>
            <p className="text-gray-600">Tableau de bord opérationnel</p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" />
              <span>Nouvelle écriture</span>
            </button>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Calculator className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation par onglets */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === tab.id 
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                    }
                  `}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Contenu principal */}
      <main className="p-6">
        {activeTab === 'overview' && (
          <>
            {/* Métriques principales - Style Kads Agency */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {metrics.map((metric, index) => {
                const IconComponent = metric.icon;
                return (
                  <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-${metric.color}-100`}>
                        <IconComponent className={`w-6 h-6 text-${metric.color}-600`} />
                      </div>
                      <div className={`flex items-center space-x-1 text-sm ${
                        metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {metric.trend === 'up' ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                        <span>{metric.change}</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</h3>
                      <p className="text-gray-600 text-sm mb-1">{metric.title}</p>
                      <p className="text-gray-500 text-xs">{metric.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions rapides */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {quickActions.map((action, index) => {
                  const IconComponent = action.icon;
                  return (
                    <button
                      key={index}
                      className={`p-4 rounded-lg border-2 border-dashed border-${action.color}-200 hover:border-${action.color}-300 hover:bg-${action.color}-50 transition-colors group`}
                    >
                      <div className="text-center">
                        <div className={`w-10 h-10 rounded-lg bg-${action.color}-100 flex items-center justify-center mx-auto mb-2 group-hover:bg-${action.color}-200 transition-colors`}>
                          <IconComponent className={`w-5 h-5 text-${action.color}-600`} />
                        </div>
                        <span className="text-sm font-medium text-gray-700">{action.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {activeTab === 'entries' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            {/* Header du tableau */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Écritures récentes</h2>
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Rechercher..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                    <Filter className="w-4 h-4 text-gray-500" />
                  </button>
                  <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                    <Download className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
            </div>

            {/* Tableau style Kads Agency */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N° Écriture</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Débit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Crédit</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentEntries.map((entry, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {entry.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {entry.date}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {entry.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono">
                        {entry.debit !== '0.00' && (
                          <span className="text-red-600">{entry.debit}€</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono">
                        {entry.credit !== '0.00' && (
                          <span className="text-green-600">{entry.credit}€</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          entry.status === 'validated' 
                            ? 'bg-green-100 text-green-800'
                            : entry.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {entry.status === 'validated' ? 'Validé' : entry.status === 'pending' ? 'En attente' : 'Brouillon'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Contenu des autres onglets à développer */}
      </main>
    </div>
  );
};

export default ComptableDashboard;