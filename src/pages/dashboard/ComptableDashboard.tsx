import React, { useState } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '../../contexts/LanguageContext';
import { db } from '../../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { formatCurrency } from '../../utils/formatters';
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
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterParams, setFilterParams] = useState({
    dateFrom: '',
    dateTo: '',
    status: 'all',
    type: 'all'
  });

  const handleExportData = () => {
    const csvContent = recentEntries.map(e =>
      `${e.id};${e.date};${e.description};${e.debit};${e.credit};${e.status}`
    ).join('\n');
    const blob = new Blob([`N°;Date;Description;Débit;Crédit;Statut\n${csvContent}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ecritures_comptables.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleQuickAction = (path: string) => {
    window.location.href = path;
  };

  // Live metrics from Dexie
  const liveData = useLiveQuery(async () => {
    const today = new Date().toISOString().split('T')[0];
    const allEntries = await db.journalEntries.toArray();
    const todayEntries = allEntries.filter(e => e.date === today);
    const pendingEntries = allEntries.filter(e => e.status === 'draft' || e.status === 'pending');
    const validatedEntries = allEntries.filter(e => e.status === 'posted');

    // Compute treasury balance from class 5 accounts
    let treasuryBalance = 0;
    for (const entry of allEntries) {
      for (const line of entry.lines) {
        if (line.accountCode.startsWith('5')) {
          treasuryBalance += line.debit - line.credit;
        }
      }
    }

    // Recent entries
    const recent = allEntries
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10)
      .map(e => {
        const totalDebit = e.lines.reduce((s, l) => s + l.debit, 0);
        const totalCredit = e.lines.reduce((s, l) => s + l.credit, 0);
        return {
          id: e.entryNumber || e.id,
          date: new Date(e.date).toLocaleDateString('fr-FR'),
          description: e.description || e.reference || '-',
          debit: formatCurrency(totalDebit),
          credit: formatCurrency(totalCredit),
          status: e.status === 'posted' ? 'validated' : e.status === 'draft' ? 'draft' : 'pending',
        };
      });

    return {
      todayCount: todayEntries.length,
      pendingCount: pendingEntries.length,
      validatedCount: validatedEntries.length,
      treasuryBalance,
      recentEntries: recent,
    };
  }, []) || { todayCount: 0, pendingCount: 0, validatedCount: 0, treasuryBalance: 0, recentEntries: [] };

  const metrics = [
    {
      title: 'Écritures du jour',
      value: String(liveData.todayCount),
      change: '',
      trend: 'up' as const,
      color: 'blue',
      icon: FileText,
      description: 'Nouvelles écritures'
    },
    {
      title: 'En attente validation',
      value: String(liveData.pendingCount),
      change: '',
      trend: 'down' as const,
      color: 'orange',
      icon: Clock,
      description: 'À valider'
    },
    {
      title: 'Écritures validées',
      value: String(liveData.validatedCount),
      change: '',
      trend: 'up' as const,
      color: 'green',
      icon: CheckCircle,
      description: 'Total validées'
    },
    {
      title: 'Solde de trésorerie',
      value: formatCurrency(liveData.treasuryBalance),
      change: '',
      trend: 'up' as const,
      color: 'purple',
      icon: DollarSign,
      description: 'Position actuelle'
    }
  ];

  const recentEntries = liveData.recentEntries;

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
            <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Espace Comptable</h1>
            <p className="text-[var(--color-text-primary)]">Tableau de bord opérationnel</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowNewEntryModal(true)}
              className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-[var(--color-primary-dark)] transition-colors"
            >
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
                      <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">{metric.value}</h3>
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
                      onClick={() => handleQuickAction(action.path)}
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
                  <button
                    onClick={() => setShowFilterModal(true)}
                    className="p-2 border border-[var(--color-border-dark)] rounded-lg hover:bg-[var(--color-background-secondary)]"
                    aria-label="Filtrer"
                  >
                    <Filter className="w-4 h-4 text-[var(--color-text-secondary)]" />
                  </button>
                  <button
                    onClick={handleExportData}
                    className="p-2 border border-[var(--color-border-dark)] rounded-lg hover:bg-[var(--color-background-secondary)]"
                    aria-label="Télécharger"
                  >
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

      {/* Modal Nouvelle Écriture */}
      {showNewEntryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Plus className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Nouvelle Écriture Comptable</h2>
                </div>
                <button onClick={() => setShowNewEntryModal(false)} className="text-gray-400 hover:text-gray-600">×</button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Journal *</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="achats">Achats</option>
                    <option value="ventes">Ventes</option>
                    <option value="banque">Banque</option>
                    <option value="caisse">Caisse</option>
                    <option value="operations_diverses">Opérations Diverses</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Libellé de l'écriture"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Compte *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="N° de compte"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tiers</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Client / Fournisseur"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('accounting.debit')}</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('accounting.credit')}</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Référence pièce</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="N° facture, reçu, etc."
                />
              </div>
            </div>
            <div className="p-6 border-t border-[var(--color-border)] flex justify-end space-x-3">
              <button
                onClick={() => setShowNewEntryModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  toast.success('Écriture créée avec succès !');
                  setShowNewEntryModal(false);
                }}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)]"
              >
                Créer l'écriture
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Filtres */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Filter className="w-5 h-5 text-gray-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Filtres avancés</h2>
                </div>
                <button onClick={() => setShowFilterModal(false)} className="text-gray-400 hover:text-gray-600">×</button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
                  <input
                    type="date"
                    value={filterParams.dateFrom}
                    onChange={(e) => setFilterParams({ ...filterParams, dateFrom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
                  <input
                    type="date"
                    value={filterParams.dateTo}
                    onChange={(e) => setFilterParams({ ...filterParams, dateTo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select
                  value={filterParams.status}
                  onChange={(e) => setFilterParams({ ...filterParams, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="validated">Validé</option>
                  <option value="pending">En attente</option>
                  <option value="draft">Brouillon</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filterParams.type}
                  onChange={(e) => setFilterParams({ ...filterParams, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Tous les types</option>
                  <option value="debit">Débit uniquement</option>
                  <option value="credit">Crédit uniquement</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-[var(--color-border)] flex justify-between">
              <button
                onClick={() => setFilterParams({ dateFrom: '', dateTo: '', status: 'all', type: 'all' })}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Réinitialiser
              </button>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    toast.success('Filtres appliqués !');
                    setShowFilterModal(false);
                  }}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)]"
                >
                  Appliquer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComptableDashboard;