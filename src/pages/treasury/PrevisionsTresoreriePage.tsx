import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const PrevisionsTresoreriePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('account_management');
  const [selectedBank, setSelectedBank] = useState('all');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const navigate = useNavigate();

  // Tous les comptes de trésorerie
  const allTreasuryAccounts = [
    { number: '521007', description: 'B2 nsia charges d\'explotations', iban: 'CI33390420121602278890200496', swift: 'BIAOCIABXXX', amount: -64051588, bank: 'NSIA' },
    { number: '521008', description: 'B1 nsia domiciliation', iban: 'CI33390420121602278890200205', swift: 'BIAOCIABXXX', amount: -1791064, bank: 'NSIA' },
    { number: '521201', description: 'BCA Compte Principal', iban: 'CI33390420121602278890200301', swift: 'BCAOCIABXXX', amount: 8200000, bank: 'BCA' },
    { number: '521301', description: 'Banque Atlantique Trésorerie', iban: 'CI33390420121602278890200401', swift: 'BATLCIABXXX', amount: 1800000, bank: 'ATLANTIQUE' },
    { number: '520001', description: 'Caisse Centrale', iban: '-', swift: '-', amount: 2500000, bank: 'CAISSE' }
  ];

  // Événements par banque
  const futureTransactions = [
    { codeJournal: 'BQ01', numFacture: 'F001', numPiece: 'P001', docDate: '20/10/2025', transDate: '22/10/2025', glAccount: '521007', glDescription: 'Virement fournisseur', cashTransaction: 'OUT', amount: -5000000, collectionDate: '22/10/2025', accountant: 'Jean Dupont', bank: 'NSIA' },
    { codeJournal: 'BQ02', numFacture: 'F002', numPiece: 'P002', docDate: '25/10/2025', transDate: '25/10/2025', glAccount: '521008', glDescription: 'Encaissement client', cashTransaction: 'IN', amount: 15000000, collectionDate: '25/10/2025', accountant: 'Marie Martin', bank: 'NSIA' },
    { codeJournal: 'BQ03', numFacture: 'F003', numPiece: 'P003', docDate: '15/11/2025', transDate: '15/11/2025', glAccount: '521201', glDescription: 'Prélèvement charges', cashTransaction: 'OUT', amount: -3000000, collectionDate: '15/11/2025', accountant: 'Paul Durand', bank: 'BCA' },
    { codeJournal: 'BQ04', numFacture: 'F004', numPiece: 'P004', docDate: '30/11/2025', transDate: '30/11/2025', glAccount: '521301', glDescription: 'Virement salaires', cashTransaction: 'OUT', amount: -12000000, collectionDate: '30/11/2025', accountant: 'Sophie Moreau', bank: 'ATLANTIQUE' }
  ];

  // Fonctions de sélection
  const toggleAccountSelection = (accountNumber: string) => {
    if (selectedAccounts.includes(accountNumber)) {
      setSelectedAccounts(selectedAccounts.filter(acc => acc !== accountNumber));
    } else {
      setSelectedAccounts([...selectedAccounts, accountNumber]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedAccounts.length === allTreasuryAccounts.length) {
      setSelectedAccounts([]);
    } else {
      setSelectedAccounts(allTreasuryAccounts.map(acc => acc.number));
    }
  };

  const isAllSelected = selectedAccounts.length === allTreasuryAccounts.length;
  const isIndeterminate = selectedAccounts.length > 0 && selectedAccounts.length < allTreasuryAccounts.length;

  // Filtrer les événements selon les comptes sélectionnés
  const getFilteredTransactions = () => {
    if (selectedAccounts.length === 0) return [];
    return futureTransactions.filter(t =>
      selectedAccounts.includes(t.glAccount) ||
      selectedAccounts.some(accountNumber => {
        const account = allTreasuryAccounts.find(acc => acc.number === accountNumber);
        return account && account.bank === t.bank;
      })
    );
  };

  // Calculer le total des comptes
  const getTotalAmount = () => {
    return allTreasuryAccounts.reduce((sum, account) => sum + account.amount, 0);
  };

  // Calculer le solde des transactions filtrées
  const getFilteredTransactionsTotal = () => {
    return getFilteredTransactions().reduce((sum, t) => sum + t.amount, 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-tuatara">📊 Prévisions de Trésorerie</h1>
        <p className="mt-2 text-rolling-stone">Gestion des comptes et planification de trésorerie</p>
      </div>

      {/* Navigation onglets */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('account_management')}
            className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'account_management'
                ? 'border-tuatara text-tuatara'
                : 'border-transparent text-rolling-stone hover:text-tuatara'
            }`}
          >
            <span>🏦 Account Management</span>
          </button>
          <button
            onClick={() => setActiveTab('prevision_tresorerie')}
            className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'prevision_tresorerie'
                ? 'border-tuatara text-tuatara'
                : 'border-transparent text-rolling-stone hover:text-tuatara'
            }`}
          >
            <span>📊 Prévision de trésorerie</span>
          </button>
        </nav>
      </div>

      {/* Account Management */}
      {activeTab === 'account_management' && (
        <div className="space-y-6">
          {/* Table 1: Account Management */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-tuatara">🏦 Account Management</h3>
            </div>
            <div style={{maxHeight: '400px', overflowY: 'auto'}} className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = isIndeterminate;
                        }}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-tuatara border-gray-300 rounded focus:ring-tuatara"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account number</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IBAN number</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code SWIFT / BIC</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {allTreasuryAccounts.map((account, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedAccounts.includes(account.number)}
                          onChange={() => toggleAccountSelection(account.number)}
                          className="w-4 h-4 text-tuatara border-gray-300 rounded focus:ring-tuatara"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium">{account.number}</td>
                      <td className="px-4 py-3">{account.description}</td>
                      <td className="px-4 py-3 font-mono text-sm">{account.iban}</td>
                      <td className="px-4 py-3 font-mono text-sm">{account.swift}</td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">
                        {new Intl.NumberFormat('fr-FR').format(account.amount)}
                      </td>
                    </tr>
                  ))}
                  {/* Total */}
                  <tr className="bg-gray-50 border-t-2 border-gray-300">
                    <td className="px-4 py-3"></td>
                    <td colSpan={4} className="px-4 py-3 font-bold text-tuatara">Total général :</td>
                    <td className="px-4 py-3 text-right font-bold text-red-600 text-lg">
                      {new Intl.NumberFormat('fr-FR').format(getTotalAmount())}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 2: Future transaction */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-tuatara">📅 Future transaction</h3>
            </div>
            <div style={{maxHeight: '400px', overflowY: 'auto'}} className="overflow-x-auto mb-4">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code journal</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">N°facture</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° de pièce</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">GL Account</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">GL description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cash transaction</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Transaction amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Collection date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Accountant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {getFilteredTransactions().length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                        {selectedAccounts.length === 0
                          ? 'Sélectionnez des comptes ci-dessus pour voir les événements'
                          : `Aucun événement pour les comptes sélectionnés`
                        }
                      </td>
                    </tr>
                  ) : (
                    getFilteredTransactions().map((transaction, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{transaction.codeJournal}</td>
                        <td className="px-4 py-3">{transaction.numFacture}</td>
                        <td className="px-4 py-3">{transaction.numPiece}</td>
                        <td className="px-4 py-3">{transaction.docDate}</td>
                        <td className="px-4 py-3">{transaction.transDate}</td>
                        <td className="px-4 py-3 font-mono text-sm">{transaction.glAccount}</td>
                        <td className="px-4 py-3">{transaction.glDescription}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            transaction.cashTransaction === 'IN'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {transaction.cashTransaction}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold">
                          <span className={transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {new Intl.NumberFormat('fr-FR').format(transaction.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3">{transaction.collectionDate}</td>
                        <td className="px-4 py-3">{transaction.accountant}</td>
                      </tr>
                    ))
                  )}
                  {/* Ligne solde */}
                  <tr className="bg-gray-50 border-t-2 border-gray-300">
                    <td colSpan={8} className="px-4 py-3 font-bold text-tuatara">Solde :</td>
                    <td className="px-4 py-3 text-right font-bold text-tuatara">
                      {new Intl.NumberFormat('fr-FR').format(getFilteredTransactionsTotal())}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Cash Summary */}
            <div className="p-4 bg-[#6A8A82]/10 rounded-lg">
              <h4 className="font-medium text-tuatara mb-3">💰 Cash</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-white rounded border">
                  <div className="text-sm text-gray-600">Incoming</div>
                  <div className="font-bold text-green-600">0</div>
                </div>
                <div className="text-center p-3 bg-white rounded border">
                  <div className="text-sm text-gray-600">Outcoming</div>
                  <div className="font-bold text-red-600">0</div>
                </div>
                <div className="text-center p-3 bg-white rounded border">
                  <div className="text-sm text-gray-600">Total</div>
                  <div className="font-bold text-red-600">-65,842,652</div>
                </div>
                <div className="text-center p-3 bg-tuatara/10 rounded border border-tuatara">
                  <div className="text-sm text-tuatara font-medium">Solde Final</div>
                  <div className="font-bold text-red-600">-65,842,652</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prévision de trésorerie */}
      {activeTab === 'prevision_tresorerie' && (
        <div className="space-y-6">
          {/* Table des prévisions avec bouton */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-tuatara">📊 Plans de Trésorerie</h3>
              <button
                onClick={() => setShowCreatePlanModal(true)}
                className="px-4 py-2 bg-tuatara text-white rounded-lg hover:bg-tuatara/80 transition-colors flex items-center space-x-2"
              >
                <span>+</span>
                <span>Nouveau Plan</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Période</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Solde Début</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Encaissements Prévus</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Décaissements Prévus</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Solde Fin</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confiance</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 font-medium">Octobre 2025</td>
                    <td className="px-4 py-3 text-right text-red-600 font-medium">-95,194,202</td>
                    <td className="px-4 py-3 text-right text-green-600 font-semibold">+15,000,000</td>
                    <td className="px-4 py-3 text-right text-red-600 font-semibold">-8,500,000</td>
                    <td className="px-4 py-3 text-right text-red-600 font-bold">-88,694,202</td>
                    <td className="px-4 py-3">85%</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        En cours
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          className="p-1 text-tuatara hover:text-tuatara/80 hover:bg-tuatara/10 rounded transition-colors"
                          title="Voir les détails"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => navigate('/treasury/cash-flow/plan/1')}
                          className="p-1 text-[#6A8A82] hover:text-[#6A8A82]/80 hover:bg-[#6A8A82]/5 rounded transition-colors"
                          title="Modifier le plan"
                        >
                          ✏️
                        </button>
                        <button
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                          title="Supprimer le plan"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Novembre 2025</td>
                    <td className="px-4 py-3 text-right text-red-600 font-medium">-88,694,202</td>
                    <td className="px-4 py-3 text-right text-green-600 font-semibold">+22,000,000</td>
                    <td className="px-4 py-3 text-right text-red-600 font-semibold">-12,000,000</td>
                    <td className="px-4 py-3 text-right text-red-600 font-bold">-78,694,202</td>
                    <td className="px-4 py-3">78%</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-[#6A8A82]/10 text-[#6A8A82]">
                        Planifié
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          className="p-1 text-tuatara hover:text-tuatara/80 hover:bg-tuatara/10 rounded transition-colors"
                          title="Voir les détails"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => navigate('/treasury/cash-flow/plan/2')}
                          className="p-1 text-[#6A8A82] hover:text-[#6A8A82]/80 hover:bg-[#6A8A82]/5 rounded transition-colors"
                          title="Modifier le plan"
                        >
                          ✏️
                        </button>
                        <button
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                          title="Supprimer le plan"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Décembre 2025</td>
                    <td className="px-4 py-3 text-right text-red-600 font-medium">-78,694,202</td>
                    <td className="px-4 py-3 text-right text-green-600 font-semibold">+35,000,000</td>
                    <td className="px-4 py-3 text-right text-red-600 font-semibold">-25,000,000</td>
                    <td className="px-4 py-3 text-right text-red-600 font-bold">-68,694,202</td>
                    <td className="px-4 py-3">72%</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        Prévisionnel
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          className="p-1 text-tuatara hover:text-tuatara/80 hover:bg-tuatara/10 rounded transition-colors"
                          title="Voir les détails"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => navigate('/treasury/cash-flow/plan/3')}
                          className="p-1 text-[#6A8A82] hover:text-[#6A8A82]/80 hover:bg-[#6A8A82]/5 rounded transition-colors"
                          title="Modifier le plan"
                        >
                          ✏️
                        </button>
                        <button
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                          title="Supprimer le plan"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Création de Plan */}
      {showCreatePlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-tuatara">📋 Création de Plan de Trésorerie</h3>
              <button
                onClick={() => setShowCreatePlanModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              alert('Plan de trésorerie créé avec succès !');
              setShowCreatePlanModal(false);
            }}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nom du plan</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tuatara focus:border-tuatara"
                      placeholder="Ex: Plan Trésorerie Q4 2025"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Auteur</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tuatara focus:border-tuatara"
                      placeholder="Nom de l'auteur"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date de Début</label>
                    <input
                      type="date"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tuatara focus:border-tuatara"
                    />
                    <p className="text-xs text-gray-500 mt-1">Format: jj/mm/aaaa</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date de Fin</label>
                    <input
                      type="date"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tuatara focus:border-tuatara"
                    />
                    <p className="text-xs text-gray-500 mt-1">Format: jj/mm/aaaa</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Solde Initial (CFA)</label>
                    <input
                      type="number"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tuatara focus:border-tuatara"
                      placeholder="0"
                      min="0"
                      step="1000"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreatePlanModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-tuatara text-white rounded-lg hover:bg-tuatara/80 transition-colors"
                >
                  Créer le Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrevisionsTresoreriePage;