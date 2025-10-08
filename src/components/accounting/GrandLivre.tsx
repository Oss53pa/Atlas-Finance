import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import PeriodSelectorModal from '../shared/PeriodSelectorModal';
import {
  ChevronDown, ChevronRight, FileText, Calendar, Filter,
  Printer, Download, Search, Calculator, BookOpen,
  TrendingUp, TrendingDown, Eye, EyeOff, List, Layers, RefreshCw
} from 'lucide-react';

interface AccountEntry {
  date: string;
  piece: string;
  journal: string;
  libelle: string;
  debit: number;
  credit: number;
  solde: number;
}

interface Account {
  code: string;
  libelle: string;
  entries: AccountEntry[];
  totalDebit: number;
  totalCredit: number;
  soldeDebiteur: number;
  soldeCrediteur: number;
  isExpanded: boolean;
}

const GrandLivre: React.FC = () => {
  const { t } = useLanguage();
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '2024-01-01', end: '2024-12-31' });
  const [searchAccount, setSearchAccount] = useState('');
  const [showZeroBalance, setShowZeroBalance] = useState(false);
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped');
  const [sortBy, setSortBy] = useState<'date' | 'compte' | 'montant'>('date');

  // Données mockées pour la démo
  const [accounts, setAccounts] = useState<Account[]>([
    {
      code: '401',
      libelle: t('navigation.suppliers')},
      entries: [
        { date: '01/01/2024', piece: 'FAC001', journal: 'AC', libelle: 'Achat marchandises SUPPLIER A', debit: 0, credit: 15000, solde: -15000 },
        { date: '05/01/2024', piece: 'REG001', journal: 'BQ', libelle: 'Règlement SUPPLIER A', debit: 15000, credit: 0, solde: 0 },
        { date: '10/01/2024', piece: 'FAC002', journal: 'AC', libelle: 'Achat fournitures SUPPLIER B', debit: 0, credit: 8500, solde: -8500 },
        { date: '15/01/2024', piece: 'REG002', journal: 'BQ', libelle: 'Règlement partiel SUPPLIER B', debit: 5000, credit: 0, solde: -3500 },
        { date: '20/01/2024', piece: 'FAC003', journal: 'AC', libelle: 'Achat services SUPPLIER C', debit: 0, credit: 12000, solde: -15500 }
      ],
      totalDebit: 20000,
      totalCredit: 35500,
      soldeDebiteur: 0,
      soldeCrediteur: 15500,
      isExpanded: true
    },
    {
      code: '411',
      libelle: t('navigation.clients')},
      entries: [
        { date: '02/01/2024', piece: 'FCT001', journal: 'VT', libelle: 'Vente CLIENT X', debit: 25000, credit: 0, solde: 25000 },
        { date: '07/01/2024', piece: 'ENC001', journal: 'BQ', libelle: 'Encaissement CLIENT X', debit: 0, credit: 25000, solde: 0 },
        { date: '12/01/2024', piece: 'FCT002', journal: 'VT', libelle: 'Vente CLIENT Y', debit: 18000, credit: 0, solde: 18000 },
        { date: '18/01/2024', piece: 'FCT003', journal: 'VT', libelle: 'Vente CLIENT Z', debit: 32000, credit: 0, solde: 50000 },
        { date: '22/01/2024', piece: 'ENC002', journal: 'BQ', libelle: 'Encaissement CLIENT Y', debit: 0, credit: 18000, solde: 32000 }
      ],
      totalDebit: 75000,
      totalCredit: 43000,
      soldeDebiteur: 32000,
      soldeCrediteur: 0,
      isExpanded: false
    },
    {
      code: '512',
      libelle: 'Banques',
      entries: [
        { date: '01/01/2024', piece: 'SD', journal: 'OD', libelle: 'Solde à nouveau', debit: 150000, credit: 0, solde: 150000 },
        { date: '05/01/2024', piece: 'REG001', journal: 'BQ', libelle: 'Paiement fournisseur', debit: 0, credit: 15000, solde: 135000 },
        { date: '07/01/2024', piece: 'ENC001', journal: 'BQ', libelle: 'Encaissement client', debit: 25000, credit: 0, solde: 160000 },
        { date: '15/01/2024', piece: 'REG002', journal: 'BQ', libelle: 'Paiement partiel', debit: 0, credit: 5000, solde: 155000 },
        { date: '22/01/2024', piece: 'ENC002', journal: 'BQ', libelle: 'Encaissement client', debit: 18000, credit: 0, solde: 173000 }
      ],
      totalDebit: 193000,
      totalCredit: 20000,
      soldeDebiteur: 173000,
      soldeCrediteur: 0,
      isExpanded: false
    },
    {
      code: '601',
      libelle: 'Achats de marchandises',
      entries: [
        { date: '01/01/2024', piece: 'FAC001', journal: 'AC', libelle: 'Achat marchandises', debit: 12500, credit: 0, solde: 12500 },
        { date: '10/01/2024', piece: 'FAC002', journal: 'AC', libelle: 'Achat fournitures', debit: 7083, credit: 0, solde: 19583 },
        { date: '20/01/2024', piece: 'FAC003', journal: 'AC', libelle: 'Achat services', debit: 10000, credit: 0, solde: 29583 }
      ],
      totalDebit: 29583,
      totalCredit: 0,
      soldeDebiteur: 29583,
      soldeCrediteur: 0,
      isExpanded: false
    },
    {
      code: '701',
      libelle: 'Ventes de marchandises',
      entries: [
        { date: '02/01/2024', piece: 'FCT001', journal: 'VT', libelle: 'Vente produits', debit: 0, credit: 20833, solde: -20833 },
        { date: '12/01/2024', piece: 'FCT002', journal: 'VT', libelle: 'Vente produits', debit: 0, credit: 15000, solde: -35833 },
        { date: '18/01/2024', piece: 'FCT003', journal: 'VT', libelle: 'Vente produits', debit: 0, credit: 26667, solde: -62500 }
      ],
      totalDebit: 0,
      totalCredit: 62500,
      soldeDebiteur: 0,
      soldeCrediteur: 62500,
      isExpanded: false
    }
  ]);

  const toggleAccount = (code: string) => {
    setAccounts(prev =>
      prev.map(account =>
        account.code === code
          ? { ...account, isExpanded: !account.isExpanded }
          : account
      )
    );
  };

  const toggleAllAccounts = (expand: boolean) => {
    setAccounts(prev =>
      prev.map(account => ({ ...account, isExpanded: expand }))
    );
  };

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.code.includes(searchAccount) ||
                         account.libelle.toLowerCase().includes(searchAccount.toLowerCase());
    const hasBalance = showZeroBalance || account.soldeDebiteur > 0 || account.soldeCrediteur > 0;
    return matchesSearch && hasBalance;
  });

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Calcul des totaux généraux
  const totals = filteredAccounts.reduce((acc, account) => ({
    totalDebit: acc.totalDebit + account.totalDebit,
    totalCredit: acc.totalCredit + account.totalCredit,
    soldeDebiteur: acc.soldeDebiteur + account.soldeDebiteur,
    soldeCrediteur: acc.soldeCrediteur + account.soldeCrediteur
  }), { totalDebit: 0, totalCredit: 0, soldeDebiteur: 0, soldeCrediteur: 0 });

  return (
    <div className="p-6 space-y-6 bg-[#F0F3F2] min-h-screen">
      {/* En-tête */}
      <div className="bg-[#F0F3F2] rounded-lg p-4 border border-[#ECECEC] shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BookOpen className="w-6 h-6 text-[#6A8A82]" />
            <div>
              <h2 className="text-xl font-bold text-[#191919]">{t('accounting.generalLedger')}</h2>
              <p className="text-sm text-[#191919]/70">Vue détaillée des mouvements par compte</p>
            </div>
          </div>

          {/* BOUTONS DE MODE D'AFFICHAGE */}
          <div className="flex items-center space-x-4">
            <div className="flex bg-[#ECECEC] rounded-lg p-1">
              <button
                onClick={() => setViewMode('grouped')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'grouped'
                    ? 'bg-[#B87333] text-white'
                    : 'text-[#191919]/70 hover:bg-[#ECECEC]'
                }`}
              >
                Groupé
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[#B87333] text-white'
                    : 'text-[#191919]/70 hover:bg-[#ECECEC]'
                }`}
              >
                Liste
              </button>
            </div>

            <div className="flex items-center space-x-3">
              <button className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors flex items-center space-x-2" aria-label="Imprimer">
                <Printer className="w-4 h-4" />
                <span>{t('common.print')}</span>
              </button>
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2" aria-label="Télécharger">
                <Download className="w-4 h-4" />
                <span>{t('common.export')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-[#F0F3F2] rounded-lg p-4 border border-[#ECECEC]">
        {/* Filtres de période et recherche */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-[#191919] mb-1">Période</label>
            <button
              onClick={() => setShowPeriodModal(true)}
              className="w-full px-3 py-2 border border-[#ECECEC] rounded-lg focus:ring-2 focus:ring-[#6A8A82] text-left flex items-center justify-between hover:bg-gray-50"
            >
              <span className="text-sm">
                {dateRange.start && dateRange.end
                  ? `Du ${new Date(dateRange.start).toLocaleDateString('fr-FR')} au ${new Date(dateRange.end).toLocaleDateString('fr-FR')}`
                  : 'Sélectionner une période'
                }
              </span>
              <Calendar className="w-4 h-4 text-[#6A8A82]" />
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#191919] mb-1">Rechercher compte</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#191919]/50" />
              <input
                type="text"
                value={searchAccount}
                onChange={(e) => setSearchAccount(e.target.value)}
                placeholder="Code ou libellé..."
                className="w-full pl-10 pr-3 py-2 border border-[#ECECEC] rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
              />
            </div>
          </div>
          <div className="flex items-end space-x-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showZeroBalance}
                onChange={(e) => setShowZeroBalance(e.target.checked)}
                className="rounded border-[#ECECEC] text-[#6A8A82] focus:ring-[#6A8A82]"
              />
              <span className="text-sm text-[#191919]/70">Afficher soldes nuls</span>
            </label>
          </div>
        </div>

        {/* Statistiques */}
        <div className="flex items-center justify-end mt-4 pt-4 border-t border-[#ECECEC]">
          <div className="text-sm text-[#191919]/70">
            {filteredAccounts.length} compte(s) - {
              filteredAccounts.reduce((total, acc) => total + acc.entries.length, 0)
            } écriture(s)
          </div>
        </div>
      </div>

      {/* Affichage selon le mode sélectionné */}
      {viewMode === 'grouped' ? (
        // Mode groupé par compte
        <div className="space-y-4">
          {/* Comptes groupés */}
          {filteredAccounts.map((account) => (
          <div key={account.code} className="bg-[#F0F3F2] rounded-lg border border-[#ECECEC] overflow-hidden">
            {/* En-tête du compte */}
            <div
              className="px-4 py-3 bg-gradient-to-r from-[#6A8A82]/10 to-[#6A8A82]/15 cursor-pointer hover:bg-[#6A8A82]/20 transition-colors"
              onClick={() => toggleAccount(account.code)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button className="text-[#6A8A82] hover:text-[#5A7A72]" aria-label="Ouvrir le menu">
                    {account.isExpanded ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </button>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-[#B87333]">{account.code}</span>
                      <span className="font-semibold text-[#191919]">{account.libelle}</span>
                    </div>
                    <div className="text-xs text-[#191919]/70 mt-1">
                      {account.entries.length} mouvement(s)
                    </div>
                  </div>
                </div>

                {/* Totaux du compte */}
                <div className="flex items-center space-x-6 text-sm">
                  <div className="text-right">
                    <p className="text-xs text-[#191919]/70">Total Débit</p>
                    <p className="font-semibold text-red-600">{formatAmount(account.totalDebit)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#767676]">Total Crédit</p>
                    <p className="font-semibold text-green-600">{formatAmount(account.totalCredit)}</p>
                  </div>
                  <div className="text-right min-w-[120px]">
                    <p className="text-xs text-[#767676]">{t('accounting.balance')}</p>
                    {account.soldeDebiteur > 0 ? (
                      <p className="font-bold text-red-600">D: {formatAmount(account.soldeDebiteur)}</p>
                    ) : (
                      <p className="font-bold text-green-600">C: {formatAmount(account.soldeCrediteur)}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Détail des écritures */}
            {account.isExpanded && (
              <div className="border-t border-[#E8E8E8] max-h-[400px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="text-xs text-[#767676]">
                      <th className="px-4 py-2 text-left font-medium">{t('common.date')}</th>
                      <th className="px-4 py-2 text-left font-medium">{t('accounting.piece')}</th>
                      <th className="px-4 py-2 text-left font-medium">{t('accounting.journal')}</th>
                      <th className="px-4 py-2 text-left font-medium">{t('accounting.label')}</th>
                      <th className="px-4 py-2 text-right font-medium">{t('accounting.debit')}</th>
                      <th className="px-4 py-2 text-right font-medium">{t('accounting.credit')}</th>
                      <th className="px-4 py-2 text-right font-medium">{t('accounting.balance')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E8E8]">
                    {account.entries.map((entry, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-xs">{entry.date}</td>
                        <td className="px-4 py-2 text-xs font-mono">{entry.piece}</td>
                        <td className="px-4 py-2 text-xs font-bold text-[#B87333]">{entry.journal}</td>
                        <td className="px-4 py-2 text-xs">{entry.libelle}</td>
                        <td className="px-4 py-2 text-xs text-right text-red-600">
                          {entry.debit > 0 ? formatAmount(entry.debit) : '-'}
                        </td>
                        <td className="px-4 py-2 text-xs text-right text-green-600">
                          {entry.credit > 0 ? formatAmount(entry.credit) : '-'}
                        </td>
                        <td className="px-4 py-2 text-xs text-right font-medium">
                          {entry.solde > 0 ? (
                            <span className="text-red-600">{formatAmount(Math.abs(entry.solde))}</span>
                          ) : entry.solde < 0 ? (
                            <span className="text-green-600">{formatAmount(Math.abs(entry.solde))}</span>
                          ) : (
                            <span className="text-gray-700">0,00</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {/* Ligne de total du compte */}
                    <tr className="bg-[#6A8A82]/10 font-semibold">
                      <td colSpan={4} className="px-4 py-2 text-sm text-[#191919]">
                        Total compte {account.code}
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-red-600">
                        {formatAmount(account.totalDebit)}
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-green-600">
                        {formatAmount(account.totalCredit)}
                      </td>
                      <td className="px-4 py-2 text-sm text-right">
                        {account.soldeDebiteur > 0 ? (
                          <span className="text-red-600">D: {formatAmount(account.soldeDebiteur)}</span>
                        ) : (
                          <span className="text-green-600">C: {formatAmount(account.soldeCrediteur)}</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
          ))}
        </div>
      ) : (
        // Mode liste chronologique
        <div className="bg-[#F0F3F2] rounded-lg border-2 border-[#B87333] overflow-hidden shadow-lg h-[600px] flex flex-col">
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-[#6A8A82] sticky top-0 z-10">
              <tr className="text-xs text-[#F0F3F2]">
                <th className="px-4 py-3 text-left font-medium">{t('common.date')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('accounting.piece')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('accounting.journal')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('accounting.account')}</th>
                <th className="px-4 py-3 text-left font-medium">Libellé compte</th>
                <th className="px-4 py-3 text-left font-medium">{t('accounting.label')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('accounting.debit')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('accounting.credit')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('accounting.balance')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E8E8]">
              {filteredAccounts.flatMap(account =>
                account.entries.map((entry, index) => (
                  <tr key={`${account.code}-${index}`} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs">{entry.date}</td>
                    <td className="px-4 py-2 text-xs font-mono">{entry.piece}</td>
                    <td className="px-4 py-2 text-xs font-bold text-[#B87333]">{entry.journal}</td>
                    <td className="px-4 py-2 text-xs font-mono text-[#6A8A82] font-semibold">{account.code}</td>
                    <td className="px-4 py-2 text-xs">{account.libelle}</td>
                    <td className="px-4 py-2 text-xs">{entry.libelle}</td>
                    <td className="px-4 py-2 text-xs text-right text-red-600">
                      {entry.debit > 0 ? formatAmount(entry.debit) : '-'}
                    </td>
                    <td className="px-4 py-2 text-xs text-right text-green-600">
                      {entry.credit > 0 ? formatAmount(entry.credit) : '-'}
                    </td>
                    <td className="px-4 py-2 text-xs text-right font-medium">
                      {entry.solde > 0 ? (
                        <span className="text-red-600">{formatAmount(Math.abs(entry.solde))}</span>
                      ) : entry.solde < 0 ? (
                        <span className="text-green-600">{formatAmount(Math.abs(entry.solde))}</span>
                      ) : (
                        <span className="text-gray-700">0,00</span>
                      )}
                    </td>
                  </tr>
                ))
              ).sort((a, b) => {
                if (sortBy === 'date') return 0; // Déjà trié par date dans les données
                if (sortBy === 'compte') return 0; // À implémenter
                if (sortBy === 'montant') return 0; // À implémenter
                return 0;
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Totaux généraux */}
      <div className="bg-[#F0F3F2] rounded-lg p-4 border-2 border-[#B87333]">
        <h3 className="text-lg font-semibold text-[#191919] mb-3 flex items-center">
          <Calculator className="w-5 h-5 mr-2 text-[#B87333]" />
          Totaux généraux
        </h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <p className="text-sm text-[#191919]/70">Total Débits</p>
            <p className="text-xl font-bold text-red-600">{formatAmount(totals.totalDebit)}</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-[#191919]/70">Total Crédits</p>
            <p className="text-xl font-bold text-green-600">{formatAmount(totals.totalCredit)}</p>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <p className="text-sm text-[#191919]/70">Solde Débiteur</p>
            <p className="text-xl font-bold text-orange-600">{formatAmount(totals.soldeDebiteur)}</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-[#191919]/70">Solde Créditeur</p>
            <p className="text-xl font-bold text-blue-600">{formatAmount(totals.soldeCrediteur)}</p>
          </div>
        </div>
      </div>

      {/* Modal de sélection de période */}
      <PeriodSelectorModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        onApply={(range) => setDateRange(range)}
        initialDateRange={dateRange}
      />
    </div>
  );
};

export default GrandLivre;