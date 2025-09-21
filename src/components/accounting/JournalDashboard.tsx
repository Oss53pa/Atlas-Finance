import React, { useState } from 'react';
import {
  TrendingUp, AlertTriangle, CheckCircle, DollarSign, Clock,
  FileText, Activity, PieChart, BarChart3, Calendar,
  AlertCircle, TrendingDown, Wallet, CreditCard, Users,
  Layers, TrendingUp as TrendIcon
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const JournalDashboard: React.FC = () => {
  // États
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [activeSubTab, setActiveSubTab] = useState('operations');

  // Sous-onglets
  const subTabs = [
    { id: 'operations', label: 'Opérations & Contrôles', icon: Layers },
    { id: 'treasury', label: 'Trésorerie & Performance', icon: TrendIcon }
  ];

  // Données mockées pour la démo
  // 1. Synthèse des écritures du jour
  const todaySummary = {
    totalEntries: 47,
    totalDebit: 3450000,
    totalCredit: 3450000,
    isBalanced: true,
    pendingValidation: 8,
    validated: 39
  };

  // 2. Répartition par type d'opération
  const operationsByType = [
    { name: 'Ventes', value: 35, color: '#10B981' },
    { name: 'Achats', value: 28, color: '#EF4444' },
    { name: 'Banque', value: 20, color: '#3B82F6' },
    { name: 'Caisse', value: 10, color: '#F59E0B' },
    { name: 'Paie', value: 5, color: '#8B5CF6' },
    { name: 'Opérations Diverses', value: 2, color: '#6B7280' }
  ];

  // Volume d'écritures par jour (7 derniers jours)
  const volumeByDay = [
    { day: 'Lun', entries: 42, validated: 38, pending: 4 },
    { day: 'Mar', entries: 56, validated: 50, pending: 6 },
    { day: 'Mer', entries: 38, validated: 35, pending: 3 },
    { day: 'Jeu', entries: 45, validated: 40, pending: 5 },
    { day: 'Ven', entries: 52, validated: 48, pending: 4 },
    { day: 'Sam', entries: 28, validated: 25, pending: 3 },
    { day: 'Dim', entries: 47, validated: 39, pending: 8 }
  ];

  // 3. Alertes et contrôles
  const alerts = [
    { type: 'error', message: '2 journaux non équilibrés (AC, OD)', icon: AlertTriangle },
    { type: 'warning', message: '8 écritures en attente de validation', icon: Clock },
    { type: 'info', message: '3 écritures avec comptes manquants', icon: AlertCircle }
  ];

  // 4. Suivi de trésorerie
  const treasuryData = {
    cashBalance: 850000,
    bankBalance: 5420000,
    totalBalance: 6270000,
    dailyIn: 1250000,
    dailyOut: 890000,
    netFlow: 360000
  };

  // Évolution de la trésorerie (7 derniers jours)
  const treasuryEvolution = [
    { day: 'Lun', encaissements: 1200000, decaissements: 800000, solde: 5870000 },
    { day: 'Mar', encaissements: 1500000, decaissements: 950000, solde: 6420000 },
    { day: 'Mer', encaissements: 980000, decaissements: 1200000, solde: 6200000 },
    { day: 'Jeu', encaissements: 1350000, decaissements: 720000, solde: 6830000 },
    { day: 'Ven', encaissements: 1100000, decaissements: 880000, solde: 7050000 },
    { day: 'Sam', encaissements: 750000, decaissements: 1100000, solde: 6700000 },
    { day: 'Dim', encaissements: 1250000, decaissements: 890000, solde: 6270000 }
  ];

  // 5. Indicateurs de performance
  const kpis = {
    avgValidationTime: '2.5',
    complianceRate: 92,
    errorRate: 3,
    automationRate: 65
  };

  // Fonction de formatage des montants
  const formatAmount = (amount: number) => {
    return amount.toLocaleString('fr-FR') + ' FCFA';
  };

  return (
    <div className="space-y-6">
      {/* Header avec sélecteur de période */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#191919]">Dashboard Journaux Comptables</h1>
          <p className="text-sm text-[#767676] mt-1">Vue d'ensemble de l'activité comptable</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
          >
            <option value="today">Aujourd'hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="year">Cette année</option>
          </select>
          <span className="text-sm text-[#767676] flex items-center">
            <Calendar className="w-4 h-4 mr-1" />
            {new Date().toLocaleDateString('fr-FR')}
          </span>
        </div>
      </div>

      {/* Sous-onglets */}
      <div className="bg-white rounded-lg border border-[#E8E8E8]">
        <div className="px-4 border-b border-[#E8E8E8]">
          <nav className="flex space-x-6">
            {subTabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`flex items-center space-x-2 py-3 border-b-2 font-medium text-sm transition-colors ${
                    activeSubTab === tab.id
                      ? 'border-[#6A8A82] text-[#6A8A82]'
                      : 'border-transparent text-[#767676] hover:text-[#444444]'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Contenu des sous-onglets */}
        <div className="p-6">
          {/* ONGLET OPÉRATIONS & CONTRÔLES */}
          {activeSubTab === 'operations' && (
            <div className="space-y-6">
              {/* Synthèse du jour */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-[#E8E8E8]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#767676]">Écritures du jour</p>
                      <p className="text-2xl font-bold text-[#191919] mt-1">{todaySummary.totalEntries}</p>
                    </div>
                    <FileText className="w-8 h-8 text-[#6A8A82]" />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-[#E8E8E8]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#767676]">Total Débits</p>
                      <p className="text-xl font-bold text-red-600 mt-1">
                        {formatAmount(todaySummary.totalDebit)}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-red-500" />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-[#E8E8E8]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#767676]">Total Crédits</p>
                      <p className="text-xl font-bold text-green-600 mt-1">
                        {formatAmount(todaySummary.totalCredit)}
                      </p>
                    </div>
                    <TrendingDown className="w-8 h-8 text-green-500" />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-[#E8E8E8]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#767676]">Balance</p>
                      <p className={`text-xl font-bold mt-1 ${todaySummary.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                        {todaySummary.isBalanced ? 'Équilibrée' : 'Déséquilibrée'}
                      </p>
                    </div>
                    {todaySummary.isBalanced ? (
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-8 h-8 text-red-500" />
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-[#E8E8E8]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#767676]">En attente</p>
                      <p className="text-2xl font-bold text-orange-600 mt-1">{todaySummary.pendingValidation}</p>
                    </div>
                    <Clock className="w-8 h-8 text-orange-500" />
                  </div>
                </div>
              </div>

              {/* Visualisations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Répartition par type */}
                <div className="bg-gray-50 rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="text-lg font-semibold text-[#191919] mb-4 flex items-center">
                    <PieChart className="w-5 h-5 mr-2 text-[#6A8A82]" />
                    Répartition par type d'opération
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RePieChart>
                      <Pie
                        data={operationsByType}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {operationsByType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {operationsByType.map((type, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }}></div>
                        <span className="text-sm text-[#444444]">{type.name}: {type.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Volume par jour */}
                <div className="bg-gray-50 rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="text-lg font-semibold text-[#191919] mb-4 flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-[#6A8A82]" />
                    Volume d'écritures (7 derniers jours)
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={volumeByDay}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="validated" stackId="a" fill="#10B981" name="Validées" />
                      <Bar dataKey="pending" stackId="a" fill="#F59E0B" name="En attente" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Statistiques de contrôle */}
              <div className="bg-gray-50 rounded-lg p-6 border border-[#E8E8E8]">
                <h3 className="text-lg font-semibold text-[#191919] mb-4 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-[#6A8A82]" />
                  État des Contrôles
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[#767676]">Journaux équilibrés</span>
                      <span className="text-lg font-bold text-green-600">3/5</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[#767676]">Écritures validées</span>
                      <span className="text-lg font-bold text-blue-600">39/47</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '83%' }}></div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[#767676]">Comptes complets</span>
                      <span className="text-lg font-bold text-purple-600">44/47</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: '93.6%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ONGLET TRÉSORERIE & PERFORMANCE */}
          {activeSubTab === 'treasury' && (
            <div className="space-y-6">
              {/* Indicateurs de trésorerie */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-[#E8E8E8]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#767676]">Solde Caisse</p>
                      <p className="text-xl font-bold text-[#191919] mt-1">
                        {formatAmount(treasuryData.cashBalance)}
                      </p>
                    </div>
                    <Wallet className="w-8 h-8 text-[#F59E0B]" />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-[#E8E8E8]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#767676]">Solde Banque</p>
                      <p className="text-xl font-bold text-[#191919] mt-1">
                        {formatAmount(treasuryData.bankBalance)}
                      </p>
                    </div>
                    <CreditCard className="w-8 h-8 text-[#3B82F6]" />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-[#E8E8E8]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#767676]">Encaissements du jour</p>
                      <p className="text-xl font-bold text-green-600 mt-1">
                        {formatAmount(treasuryData.dailyIn)}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-500" />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-[#E8E8E8]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#767676]">Décaissements du jour</p>
                      <p className="text-xl font-bold text-red-600 mt-1">
                        {formatAmount(treasuryData.dailyOut)}
                      </p>
                    </div>
                    <TrendingDown className="w-8 h-8 text-red-500" />
                  </div>
                </div>
              </div>

              {/* Évolution de la trésorerie */}
              <div className="bg-gray-50 rounded-lg p-6 border border-[#E8E8E8]">
                <h3 className="text-lg font-semibold text-[#191919] mb-4 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-[#6A8A82]" />
                  Évolution de la trésorerie (7 derniers jours)
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={treasuryEvolution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                    <Tooltip formatter={(value: number) => formatAmount(value)} />
                    <Legend />
                    <Area type="monotone" dataKey="encaissements" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} name="Encaissements" />
                    <Area type="monotone" dataKey="decaissements" stackId="2" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} name="Décaissements" />
                    <Line type="monotone" dataKey="solde" stroke="#6A8A82" strokeWidth={2} name="Solde" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Indicateurs de performance */}
              <div className="bg-gray-50 rounded-lg p-6 border border-[#E8E8E8]">
                <h3 className="text-lg font-semibold text-[#191919] mb-6 flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-[#B87333]" />
                  Indicateurs de Performance
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="mb-2">
                      <Clock className="w-10 h-10 text-[#6A8A82] mx-auto" />
                    </div>
                    <p className="text-2xl font-bold text-[#191919]">{kpis.avgValidationTime}h</p>
                    <p className="text-sm text-[#767676] mt-1">Temps moyen de validation</p>
                  </div>

                  <div className="text-center">
                    <div className="mb-2">
                      <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
                    </div>
                    <p className="text-2xl font-bold text-green-600">{kpis.complianceRate}%</p>
                    <p className="text-sm text-[#767676] mt-1">Taux de conformité</p>
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${kpis.complianceRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="mb-2">
                      <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
                    </div>
                    <p className="text-2xl font-bold text-red-600">{kpis.errorRate}%</p>
                    <p className="text-sm text-[#767676] mt-1">Taux d'erreur</p>
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full"
                          style={{ width: `${kpis.errorRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="mb-2">
                      <Activity className="w-10 h-10 text-[#B87333] mx-auto" />
                    </div>
                    <p className="text-2xl font-bold text-[#B87333]">{kpis.automationRate}%</p>
                    <p className="text-sm text-[#767676] mt-1">Taux d'automatisation</p>
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-[#B87333] h-2 rounded-full"
                          style={{ width: `${kpis.automationRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistiques additionnelles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-900 mb-3">Flux Net de Trésorerie</h4>
                  <p className="text-2xl font-bold text-blue-700">+{formatAmount(treasuryData.netFlow)}</p>
                  <p className="text-xs text-blue-600 mt-2">↑ 12% vs semaine dernière</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
                  <h4 className="text-sm font-semibold text-green-900 mb-3">Solde Total Disponible</h4>
                  <p className="text-2xl font-bold text-green-700">{formatAmount(treasuryData.totalBalance)}</p>
                  <p className="text-xs text-green-600 mt-2">Caisse + Banque</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
                  <h4 className="text-sm font-semibold text-purple-900 mb-3">Prévisions à 30 jours</h4>
                  <p className="text-2xl font-bold text-purple-700">{formatAmount(8500000)}</p>
                  <p className="text-xs text-purple-600 mt-2">Basé sur les tendances actuelles</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JournalDashboard;