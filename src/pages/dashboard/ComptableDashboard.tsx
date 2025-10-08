import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
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
  const { t } = useLanguage();
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
    { label: t('accounting.balance'), icon: BarChart3, color: 'purple', path: '/accounting/balance' },
    { label: 'États financiers', icon: PieChart, color: 'orange', path: '/financial-statements' },
  ];

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
    { id: 'entries', label: 'Écritures', icon: FileText },
    { id: 'validation', label: 'Validation', icon: CheckCircle },
    { id: 'reports', label: 'Rapports', icon: PieChart },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-background-secondary)]">
      {/* Header */}
      <header className="bg-white border-b border-[var(--color-border)] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Espace Comptable</h1>
            <p className="text-[var(--color-text-primary)]">Tableau de bord opérationnel</p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-[var(--color-primary-dark)] transition-colors">
              <Plus className="w-4 h-4" />
              <span>Nouvelle écriture</span>
            </button>
            <div className="w-10 h-10 bg-[var(--color-primary-lighter)] rounded-full flex items-center justify-center">
              <Calculator className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation par onglets */}
      <div className="bg-white border-b border-[var(--color-border)]">
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
                      ? 'border-[var(--color-primary)] text-[var(--color-primary)]' 
                      : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
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
                  <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-[var(--color-border)] hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-${metric.color}-100`}>
                        <IconComponent className={`w-6 h-6 text-${metric.color}-600`} />
                      </div>
                      <div className={`flex items-center space-x-1 text-sm ${
                        metric.trend === 'up' ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
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
                      <h3 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">{metric.value}</h3>
                      <p className="text-[var(--color-text-primary)] text-sm mb-1">{metric.title}</p>
                      <p className="text-[var(--color-text-secondary)] text-xs">{metric.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions rapides */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[var(--color-border)] mb-8">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Actions rapides</h2>
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
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">{action.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {activeTab === 'entries' && (
          <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border)]">
            {/* Header du tableau */}
            <div className="p-6 border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Écritures récentes</h2>
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-secondary)]" />
                    <input
                      type="text"
                      placeholder="Rechercher..."
                      className="pl-10 pr-4 py-2 border border-[var(--color-border-dark)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button className="p-2 border border-[var(--color-border-dark)] rounded-lg hover:bg-[var(--color-background-secondary)]" aria-label="Filtrer">
                    <Filter className="w-4 h-4 text-[var(--color-text-secondary)]" />
                  </button>
                  <button className="p-2 border border-[var(--color-border-dark)] rounded-lg hover:bg-[var(--color-background-secondary)]" aria-label="Télécharger">
                    <Download className="w-4 h-4 text-[var(--color-text-secondary)]" />
                  </button>
                </div>
              </div>
            </div>

            {/* Tableau style Kads Agency */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--color-background-secondary)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">N° Écriture</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">{t('common.date')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">{t('accounting.debit')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">{t('accounting.credit')}</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Statut</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentEntries.map((entry, index) => (
                    <tr key={index} className="hover:bg-[var(--color-background-secondary)]">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--color-text-primary)]">
                        {entry.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-secondary)]">
                        {entry.date}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--color-text-primary)]">
                        {entry.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono">
                        {entry.debit !== '0.00' && (
                          <span className="text-[var(--color-error)]">{entry.debit}€</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono">
                        {entry.credit !== '0.00' && (
                          <span className="text-[var(--color-success)]">{entry.credit}€</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          entry.status === 'validated' 
                            ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]'
                            : entry.status === 'pending'
                            ? 'bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)]'
                            : 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]'
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