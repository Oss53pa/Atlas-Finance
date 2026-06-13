import React, { useState, useEffect } from 'react';
import PageHeaderActions from '../../components/ui/PageHeaderActions';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData, useAdapterQuery } from '../../contexts/DataContext';
import { getSoldesBancaires } from '../../services/treasury/positionService';
import { formatCurrency } from '../../utils/formatters';
import { CreditCard, Banknote, TrendingUp, RefreshCw } from 'lucide-react';

const BankMovementsPage: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('movements');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const bankingTabs = [
    { id: 'movements', label: 'Mouvements', icon: CreditCard },
    { id: 'journal', label: t('accounting.journal'), icon: Banknote },
    { id: 'banking_sums_up', label: 'Banking Sums-up', icon: TrendingUp },
  ];

  // Comptes de trésorerie dynamiques depuis les écritures comptables
  const { adapter } = useData();
  const { data: bankPositions = [], loading: loadingPositions } = useAdapterQuery(
    () => getSoldesBancaires(adapter),
    [adapter],
    []
  );

  const totalBalance = bankPositions.reduce((sum, p) => sum + p.soldeComptable, 0);
  const treasuryAccounts = [
    { id: 'all', name: '[Tous les comptes de trésorerie]', balance: totalBalance },
    ...bankPositions.map(p => ({
      id: p.accountCode,
      name: p.accountName,
      balance: p.soldeComptable,
    })),
  ];

  // Seul le solde comptable est dérivable du Grand Livre (classe 5).
  // Les flux (cash in/out) et prévisions ne sont pas alimentés par l'import => non affichés.
  const getSelectedAccountData = () => {
    if (selectedAccount === 'all') {
      return {
        name: 'Tous les comptes de trésorerie',
        balance: totalBalance,
        accountNumber: 'CONSOLIDATED-VIEW',
      };
    }

    const account = treasuryAccounts.find(acc => acc.id === selectedAccount);
    return {
      name: account?.name || 'Compte sélectionné',
      balance: account?.balance || 0,
      accountNumber: selectedAccount,
    };
  };

  // Auto-refresh toutes les 30 secondes
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (autoRefresh) {
      interval = setInterval(() => {
        setLastUpdate(new Date());
        // Ici on pourrait faire un appel API pour rafraîchir les données
      }, 30000); // 30 secondes
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoRefresh]);

  const manualRefresh = () => {
    setLastUpdate(new Date());
    // Simulation du rafraîchissement
  };

  return (
    <div className="space-y-4">
      {/* Header compact */}
      <div className="border-b border-gray-200 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Mouvements Bancaires</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">Gestion des flux de trésorerie</p>
          </div>
          <div className="flex items-center space-x-3">
            <PageHeaderActions />
            <div className="text-xs text-[var(--color-text-secondary)]">
              Dernière MAJ: {lastUpdate.toLocaleTimeString('fr-FR')}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`text-xs px-2 py-1 rounded ${
                  autoRefresh
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {autoRefresh ? 'Auto ON' : '⏸️ Auto OFF'}
              </button>
              <button
                onClick={manualRefresh}
                className="flex items-center space-x-1 text-xs px-2 py-1 bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary)]/80 transition-colors" aria-label="Actualiser">
                <RefreshCw className="w-3 h-3" />
                <span>{t('common.refresh')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation compacte */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6">
          {bankingTabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-3 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-[var(--color-primary)] text-[var(--color-text-primary)]'
                    : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Dashboard CashFlow */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-text-tertiary)] rounded-lg p-4 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold mb-1">Dashboard CashFlow</h2>
                <p className="text-white/80 text-sm">Vue d'ensemble en temps réel</p>
              </div>
              <div>
                <label className="block text-xs text-white/70 mb-1">Compte :</label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="px-3 py-1 border border-white/20 rounded text-sm bg-white/10 text-white backdrop-blur"
                >
                  {treasuryAccounts.map(account => (
                    <option key={account.id} value={account.id} className="text-gray-900">
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm">
                <div className="border-b border-[var(--color-border)] p-4 bg-gradient-to-r from-[var(--color-text-secondary)]/10 to-[var(--color-primary)]/10">
                  <h3 className="text-lg font-semibold text-[var(--color-primary)]">Trend Analysis & Dernières Transactions</h3>
                </div>
                <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
                  <table className="w-full">
                    <thead className="bg-[var(--color-primary)]/10">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[var(--color-primary)] uppercase">Doc #</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[var(--color-primary)] uppercase">Coll. date</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[var(--color-primary)] uppercase">Pay. date</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[var(--color-primary)] uppercase">Ref.</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[var(--color-primary)] uppercase">Account</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[var(--color-primary)] uppercase">Description</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-[var(--color-primary)] uppercase">Debit</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-[var(--color-primary)] uppercase">Credit</th>
                      </tr>
                    </thead>
                  </table>

                  <div style={{maxHeight: '400px', overflowY: 'auto', overflowX: 'auto'}}>
                    <table className="w-full">
                      <tbody className="divide-y divide-[var(--color-border)]">
                          {/* TODO: Load from real journal entries via adapter */}
                          {([] as { doc: string; collDate: string; payDate: string; ref: string; account: string; description: string; debit: string; credit: string }[]).map((transaction, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-3 py-3 text-sm font-mono font-medium">{transaction.doc}</td>
                              <td className="px-3 py-3 text-sm">{transaction.collDate}</td>
                              <td className="px-3 py-3 text-sm">{transaction.payDate}</td>
                              <td className="px-3 py-3 text-sm font-medium">{transaction.ref}</td>
                              <td className="px-3 py-3 text-sm text-[var(--color-text-secondary)]">{transaction.account}</td>
                              <td className="px-3 py-3 text-sm">{transaction.description}</td>
                              <td className="px-3 py-3 text-right text-red-600 font-medium">{transaction.debit}</td>
                              <td className="px-3 py-3 text-right text-green-600 font-medium">{transaction.credit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

            <div>
              <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm">
                <div className="border-b border-[var(--color-border)] p-4 bg-gradient-to-r from-[var(--color-text-tertiary)]/10 to-[var(--color-text-secondary)]/10">
                  <h3 className="text-lg font-semibold text-[var(--color-primary)]">Overview</h3>
                </div>
                <div className="p-6">
                  {/* Carte bancaire élégante */}
                  <div className="relative mb-6 p-6 bg-gradient-to-br from-[var(--color-primary)] via-[#404040] to-[var(--color-text-tertiary)] rounded-xl shadow-2xl text-white overflow-hidden">
                    {/* Motif de fond */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-4 right-4 w-16 h-16 border-2 border-white rounded-full"></div>
                      <div className="absolute top-8 right-8 w-12 h-12 border-2 border-white rounded-full"></div>
                      <div className="absolute bottom-4 left-4 w-20 h-2 bg-white rounded"></div>
                      <div className="absolute bottom-8 left-4 w-16 h-2 bg-white rounded"></div>
                    </div>

                    {/* Contenu de la carte */}
                    <div className="relative z-10">
                      {/* Header carte */}
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <div className="text-sm font-medium text-white/90">Balance {selectedAccount === 'all' ? 'Globale' : 'Compte'}</div>
                        </div>
                        <div className="text-xl">💳</div>
                      </div>

                      {/* Montant principal */}
                      <div className="mb-6">
                        <div className="text-lg font-bold text-white mb-1">
                          {formatCurrency(getSelectedAccountData().balance)}
                        </div>
                        <div className="text-xs text-white/70">{getSelectedAccountData().name}</div>
                      </div>

                      {/* Informations bancaires */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-white/70">Compte</span>
                          <span className="text-sm text-white/90">{getSelectedAccountData().accountNumber}</span>
                        </div>
                      </div>

                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-[var(--color-primary)]/5 rounded-lg border-l-4 border-[var(--color-primary)]">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-[var(--color-primary)] rounded-full"></div>
                        <span className="text-sm font-medium text-[#404040]">Solde comptable (FCFA)</span>
                      </div>
                      <span className="font-bold text-[var(--color-primary)]">
                        {formatCurrency(getSelectedAccountData().balance)}
                      </span>
                    </div>

                    <p className="text-xs text-[var(--color-text-secondary)] text-center py-2">
                      Flux entrants/sortants et prévisions : aucune donnée — module non alimenté par l'import.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Prévision de Trésorerie Globale */}
          <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm">
            <div className="border-b border-[var(--color-border)] p-4 bg-gradient-to-r from-[var(--color-text-secondary)]/10 to-[var(--color-text-tertiary)]/10">
              <h3 className="text-lg font-semibold text-[var(--color-primary)]">Prévision de Trésorerie Globale</h3>
            </div>

            <div className="p-6">
              <div className="text-center py-8 text-[var(--color-text-secondary)]">
                <p className="font-medium">Aucune donnée — module non alimenté par l'import</p>
                <p className="text-sm mt-1">
                  Les prévisions de flux nécessitent un échéancier de trésorerie (encaissements/décaissements
                  prévus) non disponible dans les données importées.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Journal */}
      {activeTab === 'journal' && (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Journal Bancaire</h3>
          <p className="text-[var(--color-text-secondary)]">Contenu du journal bancaire à développer</p>
        </div>
      )}

      {/* Banking Sums-up */}
      {activeTab === 'banking_sums_up' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Banking Sums Up</h2>
              <select className="px-3 py-1 border border-gray-300 rounded text-sm">
                <option>[Tous les comptes]</option>
              </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Daily for selected month</h3>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Day</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Opening</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Cash in</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Cash out</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Closing</th>
                      </tr>
                    </thead>
                  </table>

                  <div style={{maxHeight: '400px', overflowY: 'auto', overflowX: 'auto'}}>
                    <table className="w-full">
                      <tbody className="divide-y divide-gray-200">
                        {/* Aucun échéancier journalier de trésorerie dans les données importées. */}
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                            Aucune donnée — module non alimenté par l'import
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Monthly for financial year</h3>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Month</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Opening</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Cash in</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Cash out</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Closing</th>
                      </tr>
                    </thead>
                  </table>

                  <div style={{maxHeight: '400px', overflowY: 'auto', overflowX: 'auto'}}>
                    <table className="w-full">
                      <tbody className="divide-y divide-gray-200">
                        {/* Aucun échéancier mensuel de trésorerie dans les données importées. */}
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                            Aucune donnée — module non alimenté par l'import
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankMovementsPage;