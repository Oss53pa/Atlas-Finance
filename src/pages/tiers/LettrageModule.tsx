import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Plus, Search, Filter, Download, Eye, Edit, Trash2,
  ArrowLeft, Check, X, AlertCircle, Calendar, DollarSign,
  Building, User, Clock, CheckCircle, XCircle, RotateCcw,
  BarChart3, PieChart, TrendingUp, Activity, CreditCard
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart as RechartsPieChart, Cell, LineChart, Line, ResponsiveContainer
} from 'recharts';
import { Reconciliation, ThirdParty } from '../../types/tiers';

const LettrageModule: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('comptes');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('tous');
  const [filterTiers, setFilterTiers] = useState('tous');
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [showLettrageModal, setShowLettrageModal] = useState(false);
  const [autoMode, setAutoMode] = useState(false);

  // Mock Accounts Data with unreconciled items
  const mockAccounts = [
    {
      id: '1',
      tiersCode: 'CLI001',
      tiersNom: 'SARL CONGO BUSINESS',
      tiersType: 'CLIENT',
      soldeComptable: 145000,
      soldeLettré: 130000,
      soldeNonLettré: 15000,
      nombreEcritures: 8,
      nombreNonLettrees: 3,
      derniereEcriture: '2024-09-18',
      ecritures: [
        {
          id: 'e1',
          date: '2024-09-01',
          reference: 'FAC-2024-001',
          type: 'FACTURE',
          libelle: 'Vente produits septembre',
          debit: 75000,
          credit: 0,
          solde: 75000,
          lettré: true,
          lettrage: 'A',
          dateCreation: '2024-09-01'
        },
        {
          id: 'e2',
          date: '2024-09-05',
          reference: 'REG-2024-015',
          type: 'PAIEMENT',
          libelle: 'Règlement par virement',
          debit: 0,
          credit: 60000,
          solde: -60000,
          lettré: true,
          lettrage: 'A',
          dateCreation: '2024-09-05'
        },
        {
          id: 'e3',
          date: '2024-09-15',
          reference: 'FAC-2024-002',
          type: 'FACTURE',
          libelle: 'Vente services consulting',
          debit: 45000,
          credit: 0,
          solde: 45000,
          lettré: false,
          lettrage: null,
          dateCreation: '2024-09-15'
        },
        {
          id: 'e4',
          date: '2024-09-18',
          reference: 'AVO-2024-001',
          type: 'AVOIR',
          libelle: 'Avoir remise commerciale',
          debit: 0,
          credit: 5000,
          solde: -5000,
          lettré: false,
          lettrage: null,
          dateCreation: '2024-09-18'
        },
        {
          id: 'e5',
          date: '2024-09-20',
          reference: 'REG-2024-025',
          type: 'PAIEMENT',
          libelle: 'Règlement partiel chèque',
          debit: 0,
          credit: 25000,
          solde: -25000,
          lettré: false,
          lettrage: null,
          dateCreation: '2024-09-20'
        }
      ]
    },
    {
      id: '2',
      tiersCode: 'FOU001',
      tiersNom: 'CEMAC SUPPLIES',
      tiersType: 'FOURNISSEUR',
      soldeComptable: -95000,
      soldeLettré: -80000,
      soldeNonLettré: -15000,
      nombreEcritures: 6,
      nombreNonLettrees: 2,
      derniereEcriture: '2024-09-19',
      ecritures: [
        {
          id: 'e6',
          date: '2024-09-10',
          reference: 'FF-2024-056',
          type: 'FACTURE',
          libelle: 'Facture fournisseur matières premières',
          debit: 0,
          credit: 120000,
          solde: -120000,
          lettré: true,
          lettrage: 'B',
          dateCreation: '2024-09-10'
        },
        {
          id: 'e7',
          date: '2024-09-12',
          reference: 'PAY-2024-008',
          type: 'PAIEMENT',
          libelle: 'Paiement par virement',
          debit: 105000,
          credit: 0,
          solde: 105000,
          lettré: true,
          lettrage: 'B',
          dateCreation: '2024-09-12'
        },
        {
          id: 'e8',
          date: '2024-09-19',
          reference: 'FF-2024-057',
          type: 'FACTURE',
          libelle: 'Facture fournisseur services',
          debit: 0,
          credit: 15000,
          solde: -15000,
          lettré: false,
          lettrage: null,
          dateCreation: '2024-09-19'
        }
      ]
    },
    {
      id: '3',
      tiersCode: 'CLI002',
      tiersNom: 'STE AFRICAINE TECH',
      tiersType: 'CLIENT',
      soldeComptable: 85000,
      soldeLettré: 85000,
      soldeNonLettré: 0,
      nombreEcritures: 4,
      nombreNonLettrees: 0,
      derniereEcriture: '2024-09-17',
      ecritures: [
        {
          id: 'e9',
          date: '2024-09-05',
          reference: 'FAC-2024-003',
          type: 'FACTURE',
          libelle: 'Services technologiques',
          debit: 85000,
          credit: 0,
          solde: 85000,
          lettré: true,
          lettrage: 'C',
          dateCreation: '2024-09-05'
        },
        {
          id: 'e10',
          date: '2024-09-17',
          reference: 'REG-2024-020',
          type: 'PAIEMENT',
          libelle: 'Règlement intégral',
          debit: 0,
          credit: 85000,
          solde: -85000,
          lettré: true,
          lettrage: 'C',
          dateCreation: '2024-09-17'
        }
      ]
    }
  ];

  const tabs = [
    { id: 'comptes', label: 'Comptes Tiers', icon: FileText },
    { id: 'lettrage', label: 'Lettrage', icon: CheckCircle },
    { id: 'delettrage', label: 'Délettrage', icon: RotateCcw },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  const statutOptions = [
    { value: 'tous', label: 'Tous les statuts' },
    { value: 'lettré', label: 'Lettré' },
    { value: 'non-lettré', label: 'Non lettré' },
    { value: 'partiellement-lettré', label: 'Partiellement lettré' }
  ];

  const tiersOptions = [
    { value: 'tous', label: 'Tous les tiers' },
    { value: 'clients', label: 'Clients' },
    { value: 'fournisseurs', label: 'Fournisseurs' }
  ];

  const getStatutBadge = (account: any) => {
    if (account.soldeNonLettré === 0) {
      return { label: 'Lettré', color: 'bg-green-100 text-green-800' };
    } else if (account.soldeLettré > 0) {
      return { label: 'Partiellement lettré', color: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { label: 'Non lettré', color: 'bg-red-100 text-red-800' };
    }
  };

  const getTypeBadge = (type: string) => {
    const config = {
      'FACTURE': { label: 'Facture', color: 'bg-[#6A8A82]/10 text-[#6A8A82]' },
      'AVOIR': { label: 'Avoir', color: 'bg-[#B87333]/10 text-[#B87333]' },
      'PAIEMENT': { label: 'Paiement', color: 'bg-green-100 text-green-800' },
      'REMISE': { label: 'Remise', color: 'bg-orange-100 text-orange-800' }
    };
    return config[type as keyof typeof config] || { label: type, color: 'bg-gray-100 text-gray-800' };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const filteredAccounts = mockAccounts.filter(account => {
    const matchSearch = account.tiersNom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       account.tiersCode.toLowerCase().includes(searchTerm.toLowerCase());

    let matchStatut = true;
    if (filterStatut === 'lettré') {
      matchStatut = account.soldeNonLettré === 0;
    } else if (filterStatut === 'non-lettré') {
      matchStatut = account.soldeLettré === 0;
    } else if (filterStatut === 'partiellement-lettré') {
      matchStatut = account.soldeLettré > 0 && account.soldeNonLettré > 0;
    }

    const matchTiers = filterTiers === 'tous' ||
                      (filterTiers === 'clients' && account.tiersType === 'CLIENT') ||
                      (filterTiers === 'fournisseurs' && account.tiersType === 'FOURNISSEUR');

    return matchSearch && matchStatut && matchTiers;
  });

  // Mock Analytics Data
  const analyticsData = {
    statistiques: {
      totalComptes: 156,
      comptesLettres: 134,
      comptesNonLettres: 22,
      montantNonLettre: 350000,
      pourcentageLettrage: 85.9
    },
    evolutionLettrage: [
      { mois: 'Jan', lettré: 78, nonLettré: 25 },
      { mois: 'Fév', lettré: 82, nonLettré: 21 },
      { mois: 'Mar', lettré: 85, nonLettré: 18 },
      { mois: 'Avr', lettré: 89, nonLettré: 14 },
      { mois: 'Mai', lettré: 92, nonLettré: 11 },
      { mois: 'Juin', lettré: 86, nonLettré: 17 }
    ],
    repartitionTypes: [
      { type: 'Clients', count: 98, montant: 450000 },
      { type: 'Fournisseurs', count: 58, montant: 280000 }
    ],
    anciennete: [
      { periode: '0-30 jours', nombre: 45, montant: 125000 },
      { periode: '31-60 jours', nombre: 32, montant: 98000 },
      { periode: '61-90 jours', nombre: 18, montant: 67000 },
      { periode: '+90 jours', nombre: 12, montant: 60000 }
    ]
  };

  const COLORS = ['#7A99AC', '#6A89AC', '#5A79AC', '#4A69AC'];

  // Fonction de lettrage automatique
  const handleAutoLettrage = (accountId: string) => {
    console.log('Lettrage automatique pour le compte:', accountId);
    // Logique de lettrage automatique
  };

  // Fonction de lettrage manuel
  const handleManualLettrage = (accountId: string, selectedEntries: string[]) => {
    console.log('Lettrage manuel pour le compte:', accountId, 'Écritures:', selectedEntries);
    // Logique de lettrage manuel
  };

  return (
    <div className="p-6 bg-[#ECECEC] min-h-screen font-['Sometype Mono']">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/tiers')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#444444]" />
              <span className="text-sm font-semibold text-[#444444]">Tiers</span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600 flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#191919]">Lettrage Global</h1>
                <p className="text-sm text-[#666666]">Rapprochement et lettrage des comptes tiers</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoMode"
                checked={autoMode}
                onChange={(e) => setAutoMode(e.target.checked)}
                className="rounded border-gray-300 text-[#7A99AC] focus:ring-[#7A99AC]"
              />
              <label htmlFor="autoMode" className="text-sm text-[#666666]">
                Mode automatique
              </label>
            </div>

            <button className="flex items-center space-x-2 px-4 py-2 bg-[#7A99AC] text-white rounded-lg hover:bg-[#6A89AC] transition-colors">
              <Download className="w-4 h-4" />
              <span className="text-sm font-semibold">Exporter</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mt-6 bg-gray-100 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-[#7A99AC] shadow-sm'
                  : 'text-[#666666] hover:text-[#444444]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Comptes Tiers Tab */}
      {activeTab === 'comptes' && (
        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Total Comptes</p>
                  <p className="text-2xl font-bold text-[#191919]">{analyticsData.statistiques.totalComptes}</p>
                </div>
                <FileText className="w-8 h-8 text-[#6A8A82]" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Comptes Lettrés</p>
                  <p className="text-2xl font-bold text-[#191919]">{analyticsData.statistiques.comptesLettres}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Non Lettrés</p>
                  <p className="text-2xl font-bold text-[#191919]">{analyticsData.statistiques.comptesNonLettres}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Taux Lettrage</p>
                  <p className="text-2xl font-bold text-[#191919]">{analyticsData.statistiques.pourcentageLettrage}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-[#B87333]" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom ou code tiers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7A99AC] focus:border-transparent"
                />
              </div>

              <select
                value={filterStatut}
                onChange={(e) => setFilterStatut(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7A99AC]"
              >
                {statutOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <select
                value={filterTiers}
                onChange={(e) => setFilterTiers(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7A99AC]"
              >
                {tiersOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Filter className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Accounts Table */}
          <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tiers</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Solde Comptable</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Soldé Lettré</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Solde Non Lettré</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Écritures</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAccounts.map((account) => {
                    const statut = getStatutBadge(account);
                    return (
                      <tr key={account.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                              account.tiersType === 'CLIENT' ? 'bg-[#6A8A82]/10' : 'bg-[#B87333]/10'
                            }`}>
                              {account.tiersType === 'CLIENT' ? (
                                <User className={`w-5 h-5 ${account.tiersType === 'CLIENT' ? 'text-[#6A8A82]' : 'text-[#B87333]'}`} />
                              ) : (
                                <Building className="w-5 h-5 text-[#B87333]" />
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{account.tiersNom}</div>
                              <div className="text-sm text-gray-500">{account.tiersCode}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${
                            account.soldeComptable > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(Math.abs(account.soldeComptable))}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {formatCurrency(Math.abs(account.soldeLettré))}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${
                            account.soldeNonLettré > 0 ? 'text-orange-600' : 'text-gray-900'
                          }`}>
                            {formatCurrency(Math.abs(account.soldeNonLettré))}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {account.nombreEcritures} total
                            {account.nombreNonLettrees > 0 && (
                              <span className="text-orange-600 ml-1">
                                ({account.nombreNonLettrees} non lettrées)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statut.color}`}>
                            {statut.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center space-x-2 justify-end">
                            <button
                              onClick={() => setSelectedAccount(account)}
                              className="p-1 text-[#6A8A82] hover:text-[#6A8A82]/80"
                              title="Voir détails"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {account.nombreNonLettrees > 0 && (
                              <>
                                {autoMode ? (
                                  <button
                                    onClick={() => handleAutoLettrage(account.id)}
                                    className="p-1 text-green-600 hover:text-green-900"
                                    title="Lettrage automatique"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setShowLettrageModal(true)}
                                    className="p-1 text-[#B87333] hover:text-[#B87333]/80"
                                    title="Lettrage manuel"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Évolution du lettrage */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Évolution du Lettrage</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.evolutionLettrage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mois" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="lettré" name="Lettrés" fill="#7A99AC" />
                  <Bar dataKey="nonLettré" name="Non lettrés" fill="#E74C3C" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Répartition par type */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Répartition Clients/Fournisseurs</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    dataKey="count"
                    data={analyticsData.repartitionTypes}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    label={({ type, count }) => `${type} (${count})`}
                  >
                    {analyticsData.repartitionTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} comptes`} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ancienneté des écritures non lettrées */}
          <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
            <h3 className="text-lg font-semibold text-[#191919] mb-4">Ancienneté des Écritures Non Lettrées</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {analyticsData.anciennete.map((item, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-[#666666] mb-2">{item.periode}</p>
                  <p className="text-xl font-bold text-[#191919] mb-1">{item.nombre}</p>
                  <p className="text-sm text-[#666666]">{formatCurrency(item.montant)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Account Detail Modal */}
      {selectedAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#191919]">
                  Détail du Compte - {selectedAccount.tiersNom}
                </h2>
                <button
                  onClick={() => setSelectedAccount(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              {/* Account Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-[#666666]">Solde Comptable</p>
                  <p className={`text-xl font-bold ${
                    selectedAccount.soldeComptable > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(Math.abs(selectedAccount.soldeComptable))}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-[#666666]">Soldé Lettré</p>
                  <p className="text-xl font-bold text-[#191919]">
                    {formatCurrency(Math.abs(selectedAccount.soldeLettré))}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-[#666666]">Solde Non Lettré</p>
                  <p className={`text-xl font-bold ${
                    selectedAccount.soldeNonLettré > 0 ? 'text-orange-600' : 'text-[#191919]'
                  }`}>
                    {formatCurrency(Math.abs(selectedAccount.soldeNonLettré))}
                  </p>
                </div>
              </div>

              {/* Entries Table */}
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Écritures Comptables</h3>
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Référence</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Libellé</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Débit</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Crédit</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Lettrage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedAccount.ecritures.map((ecriture: any) => {
                      const typeBadge = getTypeBadge(ecriture.type);
                      return (
                        <tr key={ecriture.id} className={`${!ecriture.lettré ? 'bg-yellow-50' : ''}`}>
                          <td className="px-4 py-3 text-sm text-gray-900">{formatDate(ecriture.date)}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{ecriture.reference}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${typeBadge.color}`}>
                              {typeBadge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{ecriture.libelle}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                            {ecriture.debit > 0 ? formatCurrency(ecriture.debit) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-red-600">
                            {ecriture.credit > 0 ? formatCurrency(ecriture.credit) : '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {ecriture.lettré ? (
                              <div className="flex items-center justify-center">
                                <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                                <span className="text-sm font-medium text-green-600">{ecriture.lettrage}</span>
                              </div>
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setSelectedAccount(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Fermer
                </button>
                {selectedAccount.nombreNonLettrees > 0 && (
                  <button className="px-4 py-2 bg-[#7A99AC] text-white rounded-lg hover:bg-[#6A89AC]">
                    Procéder au Lettrage
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Autres onglets affichent des composants placeholder */}
      {activeTab === 'lettrage' && (
        <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#191919] mb-2">Assistant de Lettrage</h3>
            <p className="text-[#666666]">Interface de lettrage manuel et automatique</p>
          </div>
        </div>
      )}

      {activeTab === 'delettrage' && (
        <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
          <div className="text-center py-12">
            <RotateCcw className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#191919] mb-2">Délettrage</h3>
            <p className="text-[#666666]">Annulation des lettrages existants</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LettrageModule;