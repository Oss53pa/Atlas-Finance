import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { CreditCard, Banknote, TrendingUp, RefreshCw } from 'lucide-react';

const BankMovementsPage: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('movements');
  const [showOperationsModal, setShowOperationsModal] = useState(false);
  const [selectedOperations, setSelectedOperations] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [selectedScenario, setSelectedScenario] = useState('realiste');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const bankingTabs = [
    { id: 'movements', label: 'Mouvements', icon: CreditCard },
    { id: 'journal', label: t('accounting.journal'), icon: Banknote },
    { id: 'banking_sums_up', label: 'Banking Sums-up', icon: TrendingUp },
  ];

  // Scénarios de prévision
  const forecastScenarios = [
    { id: 'optimiste', name: '📈 Optimiste', multiplier: 1.3, color: 'text-green-600' },
    { id: 'realiste', name: '📊 Réaliste', multiplier: 1.0, color: 'text-[#6A8A82]' },
    { id: 'pessimiste', name: '📉 Pessimiste', multiplier: 0.7, color: 'text-red-600' }
  ];

  // Comptes de trésorerie (classe 52)
  const treasuryAccounts = [
    { id: 'all', name: '[Tous les comptes de trésorerie]', balance: -95194202 },
    { id: '5211001', name: 'B1 NSIA Domiciliation', balance: -64051588 },
    { id: '5211002', name: 'B2 NSIA Charges Exploitation', balance: 9840000 },
    { id: '5212001', name: 'Compte Principal BCA', balance: 8200000 },
    { id: '5213001', name: 'Banque Atlantique', balance: 1800000 },
    { id: '5220001', name: 'Banque Populaire', balance: 5500000 },
    { id: '5200001', name: 'Caisse Centrale', balance: 2500000 }
  ];

  const getSelectedScenarioData = () => {
    const scenario = forecastScenarios.find(s => s.id === selectedScenario);
    return scenario || forecastScenarios[1]; // Default to 'realiste'
  };

  const getForecastData = (baseValue: number) => {
    const scenarioData = getSelectedScenarioData();
    return Math.round(baseValue * scenarioData.multiplier);
  };

  const getSelectedAccountData = () => {
    if (selectedAccount === 'all') {
      return {
        name: 'Tous les comptes de trésorerie',
        balance: -95194202,
        rib: '•••• •••• •••• 1290',
        accountNumber: 'CONSOLIDATED-VIEW',
        cashIn: 179400537,
        cashOut: 274594739,
        // Prévisions basées sur le scénario sélectionné
        forecastIncoming: getForecastData(50000000), // Prévision entrées
        forecastOutcoming: getForecastData(45000000), // Prévision sorties
        landingForecast: getForecastData(-95194202 + 50000000 - 45000000) // Balance prévisionnelle
      };
    }

    const account = treasuryAccounts.find(acc => acc.id === selectedAccount);
    const balance = account?.balance || 0;
    const baseIncoming = Math.abs(balance) * 0.4;
    const baseOutcoming = Math.abs(balance) * 0.3;

    return {
      name: account?.name || 'Compte sélectionné',
      balance: balance,
      rib: '•••• •••• •••• ' + selectedAccount.slice(-4),
      accountNumber: selectedAccount,
      cashIn: Math.abs(balance) * 0.3,
      cashOut: Math.abs(balance) * 0.7,
      // Prévisions basées sur le scénario sélectionné
      forecastIncoming: getForecastData(baseIncoming),
      forecastOutcoming: getForecastData(baseOutcoming),
      landingForecast: getForecastData(balance + baseIncoming - baseOutcoming)
    };
  };

  // Auto-refresh toutes les 30 secondes
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (autoRefresh) {
      interval = setInterval(() => {
        setLastUpdate(new Date());
        // Ici on pourrait faire un appel API pour rafraîchir les données
        console.log('Auto-refresh des données bancaires à', new Date().toLocaleTimeString());
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
    console.log('Rafraîchissement manuel à', new Date().toLocaleTimeString());
  };

  const showOperationsDetail = (date: string, type: 'daily' | 'monthly', data: any) => {
    setSelectedOperations({ date, type, data, operations: [] });
    setShowOperationsModal(true);
  };

  return (
    <div className="space-y-4">
      {/* Header compact */}
      <div className="border-b border-gray-200 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">💰 Mouvements Bancaires</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">Gestion des flux de trésorerie</p>
          </div>
          <div className="flex items-center space-x-3">
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
                {autoRefresh ? '🔄 Auto ON' : '⏸️ Auto OFF'}
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
          <div className="bg-gradient-to-r from-[#6A8A82] to-[#7A99AC] rounded-lg p-4 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold mb-1">📈 Dashboard CashFlow</h2>
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
              <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm">
                <div className="border-b border-[#E8E8E8] p-4 bg-gradient-to-r from-[#B87333]/10 to-[#6A8A82]/10">
                  <h3 className="text-lg font-semibold text-[#191919]">📊 Trend Analysis & Dernières Transactions</h3>
                </div>
                <div className="overflow-hidden rounded-lg border border-[#E8E8E8]">
                  <table className="w-full">
                    <thead className="bg-[#6A8A82]/10">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#191919] uppercase">Doc #</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#191919] uppercase">Coll. date</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#191919] uppercase">Pay. date</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#191919] uppercase">Ref.</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#191919] uppercase">Account</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-[#191919] uppercase">Description</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-[#191919] uppercase">Debit</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-[#191919] uppercase">Credit</th>
                      </tr>
                    </thead>
                  </table>

                  <div style={{maxHeight: '400px', overflowY: 'auto', overflowX: 'auto'}}>
                    <table className="w-full">
                      <tbody className="divide-y divide-[#E8E8E8]">
                          {[
                            { doc: 'O4152', collDate: '25/03/2025', payDate: '03/12/2025', ref: 'BNI VERSEMENT JANVIER 2025', account: '521006 B3 bni cash collection', description: 'Bni versementmode by nf rglt janvier 2025', debit: '', credit: '100' },
                            { doc: 'O8621', collDate: '12/09/2025', payDate: '12/09/2025', ref: 'PC1 0286', account: '57110 Pc petty cash cy', description: 'Repas du personnel cosmos yopougon', debit: '50,000', credit: '' },
                            { doc: 'O8619', collDate: '11/09/2025', payDate: '11/09/2025', ref: 'PC1 0284', account: '57110 Pc petty cash cy', description: 'Dotation téléphonique aout pour tanoh guy finance', debit: '20,000', credit: '' },
                            { doc: 'O8620', collDate: '11/09/2025', payDate: '11/09/2025', ref: 'PC1 0285', account: '57110 Pc petty cash cy', description: 'Dotation téléphonique aout pour lehi ange security', debit: '20,000', credit: '' },
                            { doc: 'O8614', collDate: '10/09/2025', payDate: '10/09/2025', ref: 'PC1 0281', account: '57110 Pc petty cash cy', description: 'Achat de souris sans fil mm240 rouge optique pour lehi et maibey', debit: '13,740', credit: '' },
                            { doc: 'O8618', collDate: '10/09/2025', payDate: '10/09/2025', ref: 'PC1 0283', account: '57110 Pc petty cash cy', description: 'Visite technique vehicule 4155jc01 outtara yacou', debit: '69,950', credit: '' },
                            { doc: 'O8617', collDate: '10/09/2025', payDate: '10/09/2025', ref: 'PC1 0282', account: '57110 Pc petty cash cy', description: 'Retour sur pc1 0130 repas du personnel cosmos yopouon du 16/05/2025', debit: '', credit: '110' },
                            { doc: 'O8577', collDate: '08/09/2025', payDate: '08/09/2025', ref: 'PC1 0279', account: '57110 Pc petty cash cy', description: 'Retour sur pc1 0278 repas du personnel cosmos yopougon du 05/09/2025', debit: '', credit: '20' },
                            { doc: 'O8446', collDate: '05/09/2025', payDate: '05/09/2025', ref: 'PC1 0278', account: '57110 Pc petty cash cy', description: 'Repas du personnel cosmos yopougon du 05/09/2025', debit: '50,000', credit: '' }
                          ].map((transaction, index) => (
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
              <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm">
                <div className="border-b border-[#E8E8E8] p-4 bg-gradient-to-r from-[#7A99AC]/10 to-[#B87333]/10">
                  <h3 className="text-lg font-semibold text-[#191919]">📊 Overview</h3>
                </div>
                <div className="p-6">
                  {/* Carte bancaire élégante */}
                  <div className="relative mb-6 p-6 bg-gradient-to-br from-[#191919] via-[#444444] to-[#767676] rounded-xl shadow-2xl text-white overflow-hidden">
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
                        <div className="text-2xl">💳</div>
                      </div>

                      {/* Montant principal */}
                      <div className="mb-6">
                        <div className="text-3xl font-bold text-white mb-1">
                          {new Intl.NumberFormat('fr-FR').format(getSelectedAccountData().balance)}
                        </div>
                        <div className="text-xs text-white/70">{getSelectedAccountData().name}</div>
                      </div>

                      {/* Informations bancaires */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-white/70">RIB</span>
                          <span className="font-mono text-sm text-white tracking-wider">{getSelectedAccountData().rib}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-white/70">Account Number</span>
                          <span className="text-sm text-white/90">{getSelectedAccountData().accountNumber}</span>
                        </div>
                      </div>

                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-[#6A8A82]/5 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-[#6A8A82] rounded-full"></div>
                        <span className="text-sm text-[#444444]">Opening</span>
                      </div>
                      <span className="font-semibold text-[#191919]">0</span>
                    </div>

                    {/* Cash In et Cash Out côte à côte */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-[#444444]">Cash In</span>
                        </div>
                        <span className="font-semibold text-green-600 text-sm">
                          {new Intl.NumberFormat('fr-FR').format(getSelectedAccountData().cashIn)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="text-xs text-[#444444]">Cash Out</span>
                        </div>
                        <span className="font-semibold text-red-600 text-sm">
                          {new Intl.NumberFormat('fr-FR').format(getSelectedAccountData().cashOut)}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-red-100 rounded-lg border-l-4 border-red-500">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                        <span className="text-sm font-medium text-[#444444]">Actual Balance</span>
                      </div>
                      <span className="font-bold text-red-600">
                        {new Intl.NumberFormat('fr-FR').format(getSelectedAccountData().balance)}
                      </span>
                    </div>

                    {/* Incoming et Outcoming côte à côte avec prévisions par scénario */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border-l-2 border-green-400">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-[#444444]">Incoming</span>
                        </div>
                        <span className={`font-semibold text-sm ${getSelectedScenarioData().color}`}>
                          {new Intl.NumberFormat('fr-FR').format(getSelectedAccountData().forecastIncoming)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border-l-2 border-red-400">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="text-xs text-[#444444]">Outcoming</span>
                        </div>
                        <span className={`font-semibold text-sm ${getSelectedScenarioData().color}`}>
                          {new Intl.NumberFormat('fr-FR').format(getSelectedAccountData().forecastOutcoming)}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-[#B87333]/10 rounded-lg border-l-4 border-[#B87333]">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-[#B87333] rounded-full"></div>
                        <span className="text-sm font-bold text-[#191919]">Landing Forecast</span>
                        <span className="text-xs px-2 py-1 rounded-full bg-white/80 text-[#B87333] font-medium">
                          {getSelectedScenarioData().name.replace(/📈|📊|📉/, '').trim()}
                        </span>
                      </div>
                      <span className={`font-bold ${getSelectedScenarioData().color}`}>
                        {new Intl.NumberFormat('fr-FR').format(getSelectedAccountData().landingForecast)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Prévision de Trésorerie Globale */}
          <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm">
            <div className="border-b border-[#E8E8E8] p-4 bg-gradient-to-r from-[#B87333]/10 to-[#7A99AC]/10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#191919]">🔮 Prévision de Trésorerie Globale</h3>
                <div>
                  <label className="block text-xs text-[#444444] mb-1">Scénario de prévision :</label>
                  <select
                    value={selectedScenario}
                    onChange={(e) => setSelectedScenario(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded text-sm bg-white text-gray-900 focus:ring-2 focus:ring-[#B87333] focus:border-[#B87333]"
                  >
                    {forecastScenarios.map(scenario => (
                      <option key={scenario.id} value={scenario.id}>
                        {scenario.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Prévisions Entrées */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                    <h4 className="font-medium text-green-800">Prévisions Entrées</h4>
                  </div>
                  <div className={`text-2xl font-bold ${getSelectedScenarioData().color}`}>
                    {new Intl.NumberFormat('fr-FR').format(getSelectedAccountData().forecastIncoming)}
                  </div>
                  <div className="text-sm text-green-700 mt-1">
                    Scénario {getSelectedScenarioData().name.replace(/📈|📊|📉/, '').trim()}
                  </div>
                </div>

                {/* Prévisions Sorties */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                    <h4 className="font-medium text-red-800">Prévisions Sorties</h4>
                  </div>
                  <div className={`text-2xl font-bold ${getSelectedScenarioData().color}`}>
                    {new Intl.NumberFormat('fr-FR').format(getSelectedAccountData().forecastOutcoming)}
                  </div>
                  <div className="text-sm text-red-700 mt-1">
                    Scénario {getSelectedScenarioData().name.replace(/📈|📊|📉/, '').trim()}
                  </div>
                </div>

                {/* Balance Prévisionnelle */}
                <div className="bg-[#B87333]/10 border border-[#B87333]/30 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-4 h-4 bg-[#B87333] rounded-full"></div>
                    <h4 className="font-medium text-[#B87333]">Balance Prévisionnelle</h4>
                  </div>
                  <div className={`text-2xl font-bold ${getSelectedScenarioData().color}`}>
                    {new Intl.NumberFormat('fr-FR').format(getSelectedAccountData().landingForecast)}
                  </div>
                  <div className="text-sm text-[#B87333] mt-1">
                    Projection {getSelectedScenarioData().name.replace(/📈|📊|📉/, '').trim()}
                  </div>
                </div>
              </div>

              {/* Détail par scénario */}
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                {forecastScenarios.map(scenario => {
                  const baseIncoming = selectedAccount === 'all' ? 50000000 : Math.abs(getSelectedAccountData().balance) * 0.4;
                  const baseOutcoming = selectedAccount === 'all' ? 45000000 : Math.abs(getSelectedAccountData().balance) * 0.3;
                  const baseBalance = selectedAccount === 'all' ? -95194202 + 50000000 - 45000000 : getSelectedAccountData().balance + baseIncoming - baseOutcoming;

                  const scenarioIncoming = Math.round(baseIncoming * scenario.multiplier);
                  const scenarioOutcoming = Math.round(baseOutcoming * scenario.multiplier);
                  const scenarioBalance = Math.round(baseBalance * scenario.multiplier);

                  return (
                    <div
                      key={scenario.id}
                      className={`border rounded-lg p-3 ${selectedScenario === scenario.id ? 'border-[#B87333] bg-[#B87333]/5' : 'border-gray-200'}`}
                    >
                      <h5 className={`font-medium mb-2 ${scenario.color}`}>{scenario.name}</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Entrées:</span>
                          <span className={scenario.color}>
                            {new Intl.NumberFormat('fr-FR').format(scenarioIncoming)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Sorties:</span>
                          <span className={scenario.color}>
                            {new Intl.NumberFormat('fr-FR').format(scenarioOutcoming)}
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="font-medium text-gray-800">Balance:</span>
                          <span className={`font-bold ${scenario.color}`}>
                            {new Intl.NumberFormat('fr-FR').format(scenarioBalance)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Journal */}
      {activeTab === 'journal' && (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">💵 Journal Bancaire</h3>
          <p className="text-[var(--color-text-secondary)]">Contenu du journal bancaire à développer</p>
        </div>
      )}

      {/* Banking Sums-up */}
      {activeTab === 'banking_sums_up' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">📈 Banking Sums Up</h2>
              <select className="px-3 py-1 border border-gray-300 rounded text-sm">
                <option>[Tous les comptes]</option>
              </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">📅 Daily for selected month</h3>
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
                        {Array.from({length: 30}, (_, i) => {
                          const day = String(i + 1).padStart(2, '0');
                          const opening = -92498764 - (i * 10000);
                          const cashIn = i === 7 ? 20 : i === 9 ? 110 : 0;
                          const cashOut = i === 2 ? 69700 : i === 4 ? 50000 : i === 9 ? 83690 : 0;
                          const closing = opening + cashIn - cashOut;

                          return (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium">{day}/09/2025</td>
                              <td className="px-4 py-3 text-right text-red-600 font-medium">
                                {new Intl.NumberFormat('fr-FR').format(opening)}
                              </td>
                              <td className="px-4 py-3 text-right text-green-600 font-medium">
                                <button
                                  onClick={() => cashIn > 0 && showOperationsDetail(`${day}/09/2025`, 'daily', {cashIn, cashOut, opening, closing})}
                                  className={`hover:underline ${cashIn > 0 ? 'cursor-pointer' : ''}`}
                                  disabled={cashIn === 0}
                                >
                                  {new Intl.NumberFormat('fr-FR').format(cashIn)}
                                </button>
                              </td>
                              <td className="px-4 py-3 text-right text-red-600 font-medium">
                                <button
                                  onClick={() => cashOut > 0 && showOperationsDetail(`${day}/09/2025`, 'daily', {cashIn, cashOut, opening, closing})}
                                  className={`hover:underline ${cashOut > 0 ? 'cursor-pointer' : ''}`}
                                  disabled={cashOut === 0}
                                >
                                  {new Intl.NumberFormat('fr-FR').format(cashOut)}
                                </button>
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-[var(--color-text-primary)]">
                                {new Intl.NumberFormat('fr-FR').format(closing)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">📊 Monthly for financial year</h3>
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
                        {[
                          { month: 'Janvier', opening: 0, cashIn: 88466647, cashOut: 50453264, closing: 38013383 },
                          { month: 'Février', opening: 38013383, cashIn: 86544760, cashOut: 174261888, closing: -49703745 },
                          { month: 'Mars', opening: -49703745, cashIn: 600500, cashOut: 1222115, closing: -50325360 },
                          { month: 'Avril', opening: -50325360, cashIn: 952355, cashOut: 1777133, closing: -51150138 },
                          { month: 'Mai', opening: -51150138, cashIn: 618080, cashOut: 1408878, closing: -51940936 },
                          { month: 'Juin', opening: -51940936, cashIn: 1299455, cashOut: 2351200, closing: -52992681 },
                          { month: 'Juillet', opening: -52992681, cashIn: 610145, cashOut: 39671298, closing: -92053834 },
                          { month: 'Août', opening: -92053834, cashIn: 308465, cashOut: 753395, closing: -92498764 },
                          { month: 'Septembre', opening: -92498764, cashIn: 130, cashOut: 293390, closing: -92792024 },
                          { month: 'Octobre', opening: -92792024, cashIn: 0, cashOut: 0, closing: -92792024 },
                          { month: 'Novembre', opening: -92792024, cashIn: 0, cashOut: 0, closing: -92792024 },
                          { month: 'Décembre', opening: -92792024, cashIn: 0, cashOut: 2400100, closing: -95192124 }
                        ].map((row, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{row.month}</td>
                            <td className="px-4 py-3 text-right text-[var(--color-text-primary)] font-medium">
                              {new Intl.NumberFormat('fr-FR').format(row.opening)}
                            </td>
                            <td className="px-4 py-3 text-right text-green-600 font-medium">
                              <button
                                onClick={() => row.cashIn > 0 && showOperationsDetail(row.month, 'monthly', row)}
                                className={`hover:underline ${row.cashIn > 0 ? 'cursor-pointer' : ''}`}
                                disabled={row.cashIn === 0}
                              >
                                {new Intl.NumberFormat('fr-FR').format(row.cashIn)}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-right text-red-600 font-medium">
                              <button
                                onClick={() => row.cashOut > 0 && showOperationsDetail(row.month, 'monthly', row)}
                                className={`hover:underline ${row.cashOut > 0 ? 'cursor-pointer' : ''}`}
                                disabled={row.cashOut === 0}
                              >
                                {new Intl.NumberFormat('fr-FR').format(row.cashOut)}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-[var(--color-text-primary)]">
                              {new Intl.NumberFormat('fr-FR').format(row.closing)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal détail des opérations */}
      {showOperationsModal && selectedOperations && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">
                📋 Détail des Opérations - {selectedOperations.date}
              </h3>
              <button
                onClick={() => setShowOperationsModal(false)}
                className="text-gray-700 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-[#6A8A82]/5 border border-[#6A8A82]/20 rounded-lg p-3 text-center">
                <div className="text-sm text-[var(--color-text-secondary)]">Opening</div>
                <div className="font-bold text-[var(--color-text-primary)]">
                  {new Intl.NumberFormat('fr-FR').format(selectedOperations.data.opening)}
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <div className="text-sm text-green-700">Cash In</div>
                <div className="font-bold text-green-600">
                  {new Intl.NumberFormat('fr-FR').format(selectedOperations.data.cashIn)}
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <div className="text-sm text-red-700">Cash Out</div>
                <div className="font-bold text-red-600">
                  {new Intl.NumberFormat('fr-FR').format(selectedOperations.data.cashOut)}
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                <div className="text-sm text-[var(--color-text-secondary)]">Closing</div>
                <div className="font-bold text-[var(--color-text-primary)]">
                  {new Intl.NumberFormat('fr-FR').format(selectedOperations.data.closing)}
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h4 className="font-medium text-[var(--color-text-primary)]">📊 Opérations de la période</h4>
              </div>

              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Heure</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Référence</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Tiers</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Montant</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Sens</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                      Détail des opérations pour {selectedOperations.date}
                      <br />
                      <span className="text-sm">Fonctionnalité à connecter avec les données réelles</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowOperationsModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankMovementsPage;