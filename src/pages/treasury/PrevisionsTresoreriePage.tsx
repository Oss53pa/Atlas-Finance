import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';

const PrevisionsTresoreriePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('account_management');
  const [selectedBank, setSelectedBank] = useState('all');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const navigate = useNavigate();

  // États pour le modal de sélection de période
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Load treasury accounts from Dexie: accounts starting with 52 (bank) or 57 (cash)
  const dbAccounts = useLiveQuery(() => db.accounts.toArray()) || [];
  const journalEntries = useLiveQuery(() => db.journalEntries.toArray()) || [];
  const treasurySettingRaw = useLiveQuery(() => db.settings.get('treasury_accounts'));
  const forecastSettingRaw = useLiveQuery(() => db.settings.get('treasury_forecasts'));
  const treasuryPlansSetting = useLiveQuery(() => db.settings.get('treasury_plans'));
  const treasuryPlans = treasuryPlansSetting ? JSON.parse(treasuryPlansSetting.value) : [];

  // Build treasury accounts: prefer settings, fallback to accounts table with computed balances
  const allTreasuryAccounts = useMemo(() => {
    if (treasurySettingRaw) {
      return JSON.parse(treasurySettingRaw.value) as Array<{ number: string; description: string; iban: string; swift: string; amount: number; bank: string }>;
    }
    // Derive from accounts table (class 5 = treasury)
    const treasuryAccts = dbAccounts.filter(a => a.code.startsWith('52') || a.code.startsWith('57'));
    return treasuryAccts.map(acct => {
      // Compute balance from journal entries
      let balance = 0;
      journalEntries
        .filter(e => e.status === 'validated' || e.status === 'posted')
        .forEach(entry => {
          entry.lines.forEach(line => {
            if (line.accountCode === acct.code) {
              balance += line.debit - line.credit;
            }
          });
        });
      const bankName = acct.code.startsWith('57') ? 'CAISSE' : acct.name.split(' ')[0]?.toUpperCase() || 'BANQUE';
      return {
        number: acct.code,
        description: acct.name,
        iban: '-',
        swift: '-',
        amount: balance,
        bank: bankName,
      };
    });
  }, [treasurySettingRaw, dbAccounts, journalEntries]);

  // Build future transactions from settings or derive from recent journal entries
  const futureTransactions = useMemo(() => {
    if (forecastSettingRaw) {
      return JSON.parse(forecastSettingRaw.value) as Array<{ codeJournal: string; numFacture: string; numPiece: string; docDate: string; transDate: string; glAccount: string; glDescription: string; cashTransaction: string; amount: number; collectionDate: string; accountant: string; bank: string }>;
    }
    // Derive from recent draft journal entries on treasury accounts
    const treasuryCodes = new Set(allTreasuryAccounts.map(a => a.number));
    const txns: Array<{ codeJournal: string; numFacture: string; numPiece: string; docDate: string; transDate: string; glAccount: string; glDescription: string; cashTransaction: string; amount: number; collectionDate: string; accountant: string; bank: string }> = [];
    journalEntries
      .filter(e => e.status === 'draft')
      .forEach(entry => {
        entry.lines.forEach(line => {
          if (treasuryCodes.has(line.accountCode)) {
            const amount = line.debit > 0 ? line.debit : -line.credit;
            const matchingAcct = allTreasuryAccounts.find(a => a.number === line.accountCode);
            txns.push({
              codeJournal: entry.journal,
              numFacture: entry.reference,
              numPiece: entry.entryNumber,
              docDate: new Date(entry.date).toLocaleDateString('fr-FR'),
              transDate: new Date(entry.date).toLocaleDateString('fr-FR'),
              glAccount: line.accountCode,
              glDescription: line.label || entry.label,
              cashTransaction: amount >= 0 ? 'IN' : 'OUT',
              amount,
              collectionDate: new Date(entry.date).toLocaleDateString('fr-FR'),
              accountant: entry.createdBy || '',
              bank: matchingAcct?.bank || '',
            });
          }
        });
      });
    return txns;
  }, [forecastSettingRaw, journalEntries, allTreasuryAccounts]);

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
        <h1 className="text-lg font-bold text-[var(--color-text-primary)]">📊 Prévisions de Trésorerie</h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">Gestion des comptes et planification de trésorerie</p>
      </div>

      {/* Navigation onglets */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('account_management')}
            className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'account_management'
                ? 'border-[var(--color-primary)] text-[var(--color-text-primary)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <span>🏦 Account Management</span>
          </button>
          <button
            onClick={() => setActiveTab('prevision_tresorerie')}
            className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'prevision_tresorerie'
                ? 'border-[var(--color-primary)] text-[var(--color-text-primary)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
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
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">🏦 Account Management</h3>
            </div>
            <div style={{maxHeight: '400px', overflowY: 'auto'}} className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = isIndeterminate;
                        }}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-[var(--color-text-primary)] border-gray-300 rounded focus:ring-[var(--color-primary)]"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Account number</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Account description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">IBAN number</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Code SWIFT / BIC</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Amount</th>
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
                          className="w-4 h-4 text-[var(--color-text-primary)] border-gray-300 rounded focus:ring-[var(--color-primary)]"
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
                    <td colSpan={4} className="px-4 py-3 font-bold text-[var(--color-text-primary)]">Total général :</td>
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
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">📅 Future transaction</h3>
            </div>
            <div style={{maxHeight: '400px', overflowY: 'auto'}} className="overflow-x-auto mb-4">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Code journal</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">N°facture</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">N° de pièce</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Document date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Transaction date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">GL Account</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">GL description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Cash transaction</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Transaction amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Collection date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Accountant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {getFilteredTransactions().length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-8 text-center text-gray-700">
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
                    <td colSpan={8} className="px-4 py-3 font-bold text-[var(--color-text-primary)]">Solde :</td>
                    <td className="px-4 py-3 text-right font-bold text-[var(--color-text-primary)]">
                      {new Intl.NumberFormat('fr-FR').format(getFilteredTransactionsTotal())}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Cash Summary */}
            <div className="p-4 bg-[#6A8A82]/10 rounded-lg">
              <h4 className="font-medium text-[var(--color-text-primary)] mb-3">💰 Cash</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-white rounded border">
                  <div className="text-sm text-gray-600">Incoming</div>
                  <div className="font-bold text-green-600">
                    {new Intl.NumberFormat('fr-FR').format(getFilteredTransactions().filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0))}
                  </div>
                </div>
                <div className="text-center p-3 bg-white rounded border">
                  <div className="text-sm text-gray-600">Outcoming</div>
                  <div className="font-bold text-red-600">
                    {new Intl.NumberFormat('fr-FR').format(getFilteredTransactions().filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0))}
                  </div>
                </div>
                <div className="text-center p-3 bg-white rounded border">
                  <div className="text-sm text-gray-600">Total</div>
                  <div className="font-bold text-red-600">
                    {new Intl.NumberFormat('fr-FR').format(getTotalAmount())}
                  </div>
                </div>
                <div className="text-center p-3 bg-[var(--color-primary)]/10 rounded border border-[var(--color-primary)]">
                  <div className="text-sm text-[var(--color-text-primary)] font-medium">Solde Final</div>
                  <div className="font-bold text-red-600">
                    {new Intl.NumberFormat('fr-FR').format(getTotalAmount() + getFilteredTransactionsTotal())}
                  </div>
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
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">📊 Plans de Trésorerie</h3>
              <button
                onClick={() => setShowCreatePlanModal(true)}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/80 transition-colors flex items-center space-x-2"
              >
                <span>+</span>
                <span>Nouveau Plan</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Période</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Solde Début</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Encaissements Prévus</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Décaissements Prévus</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Solde Fin</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Confiance</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Statut</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {treasuryPlans.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-700">
                        Aucun plan de tresorerie. Cliquez sur "Nouveau Plan" pour en creer un.
                      </td>
                    </tr>
                  ) : (
                    treasuryPlans.map((plan: { id: string; periode: string; soldeDebut: number; encaissements: number; decaissements: number; soldeFin: number; confiance: string; statut: string }) => {
                      const getStatusStyle = (statut: string) => {
                        switch (statut) {
                          case 'En cours': return 'bg-yellow-100 text-yellow-800';
                          case 'Planifie': return 'bg-[#6A8A82]/10 text-[#6A8A82]';
                          default: return 'bg-gray-100 text-gray-800';
                        }
                      };
                      return (
                        <tr key={plan.id}>
                          <td className="px-4 py-3 font-medium">{plan.periode}</td>
                          <td className="px-4 py-3 text-right text-red-600 font-medium">
                            {new Intl.NumberFormat('fr-FR').format(plan.soldeDebut)}
                          </td>
                          <td className="px-4 py-3 text-right text-green-600 font-semibold">
                            +{new Intl.NumberFormat('fr-FR').format(plan.encaissements)}
                          </td>
                          <td className="px-4 py-3 text-right text-red-600 font-semibold">
                            {new Intl.NumberFormat('fr-FR').format(plan.decaissements)}
                          </td>
                          <td className="px-4 py-3 text-right text-red-600 font-bold">
                            {new Intl.NumberFormat('fr-FR').format(plan.soldeFin)}
                          </td>
                          <td className="px-4 py-3">{plan.confiance}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusStyle(plan.statut)}`}>
                              {plan.statut}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                className="p-1 text-[var(--color-text-primary)] hover:text-[var(--color-text-primary)]/80 hover:bg-[var(--color-primary)]/10 rounded transition-colors"
                                title="Voir les details"
                              >
                                👁️
                              </button>
                              <button
                                onClick={() => navigate(`/treasury/cash-flow/plan/${plan.id}`)}
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
                      );
                    })
                  )}
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
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">📋 Création de Plan de Trésorerie</h3>
              <button
                onClick={() => setShowCreatePlanModal(false)}
                className="text-gray-700 hover:text-gray-600 text-xl"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                      placeholder="Ex: Plan Trésorerie Q4 2025"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Auteur</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                      placeholder="Nom de l'auteur"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Période du Plan</label>
                    <button
                      type="button"
                      onClick={() => setShowPeriodModal(true)}
                      className="w-full flex items-center justify-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                    >
                      <span>📅</span>
                      <span>
                        {dateRange.start && dateRange.end
                          ? `Du ${new Date(dateRange.start).toLocaleDateString('fr-FR')} au ${new Date(dateRange.end).toLocaleDateString('fr-FR')}`
                          : 'Sélectionner une période'
                        }
                      </span>
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Solde Initial (CFA)</label>
                    <input
                      type="number"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
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
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/80 transition-colors"
                >
                  Créer le Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de sélection de période */}
      <PeriodSelectorModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        onApply={(newDateRange) => {
          setDateRange(newDateRange);
        }}
        initialDateRange={dateRange}
      />
    </div>
  );
};

export default PrevisionsTresoreriePage;