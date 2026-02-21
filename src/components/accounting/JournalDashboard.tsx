import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { formatCurrency } from '../../utils/formatters';
import { useLanguage } from '../../contexts/LanguageContext';
import PeriodSelectorModal from '../shared/PeriodSelectorModal';
import {
  TrendingUp, AlertTriangle, CheckCircle, DollarSign, Clock,
  FileText, Activity, PieChart, BarChart3, Calendar,
  AlertCircle, TrendingDown, Wallet, CreditCard, Users,
  Layers, TrendingUp as TrendIcon
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const JournalDashboard: React.FC = () => {
  const { t } = useLanguage();
  // États
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '2024-01-01', end: '2024-12-31' });
  const [activeSubTab, setActiveSubTab] = useState('operations');

  // Sous-onglets
  const subTabs = [
    { id: 'operations', label: 'Opérations & Contrôles', icon: Layers },
    { id: 'treasury', label: 'Trésorerie & Performance', icon: TrendIcon }
  ];

  const [selectedPeriod, setSelectedPeriod] = useState('today');

  // 1. Synthèse des écritures du jour — depuis Dexie
  const { data: todaySummary = { totalEntries: 0, totalDebit: 0, totalCredit: 0, isBalanced: true, pendingValidation: 0, validated: 0 } } = useQuery({
    queryKey: ['journal-today-summary'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const entries = await db.journalEntries.toArray();
      const todayEntries = entries.filter(e => e.date === today);
      const totalDebit = todayEntries.reduce((s, e) => s + e.totalDebit, 0);
      const totalCredit = todayEntries.reduce((s, e) => s + e.totalCredit, 0);
      return {
        totalEntries: todayEntries.length,
        totalDebit, totalCredit,
        isBalanced: Math.abs(totalDebit - totalCredit) < 1,
        pendingValidation: todayEntries.filter(e => e.status === 'draft').length,
        validated: todayEntries.filter(e => e.status === 'validated' || e.status === 'posted').length,
      };
    },
  });

  // 2. Répartition par type d'opération — depuis Dexie
  const { data: operationsByType = [] } = useQuery({
    queryKey: ['journal-operations-by-type', dateRange],
    queryFn: async () => {
      const entries = await db.journalEntries.toArray();
      const filtered = entries.filter(e => e.date >= dateRange.start && e.date <= dateRange.end);
      const byJournal: Record<string, number> = {};
      for (const e of filtered) byJournal[e.journal] = (byJournal[e.journal] || 0) + 1;
      const colors: Record<string, string> = { VE: '#10B981', AC: '#EF4444', BQ: '#3B82F6', CA: '#F59E0B', OD: '#6B7280' };
      const names: Record<string, string> = { VE: 'Ventes', AC: 'Achats', BQ: 'Banque', CA: 'Caisse', OD: 'Opérations Diverses' };
      return Object.entries(byJournal).map(([key, value]) => ({
        name: names[key] || key, value, color: colors[key] || '#8B5CF6',
      }));
    },
  });

  // Volume d'écritures par jour (7 derniers jours)
  const { data: volumeByDay = [] } = useQuery({
    queryKey: ['journal-volume-by-day'],
    queryFn: async () => {
      const entries = await db.journalEntries.toArray();
      const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      const result: { day: string; entries: number; validated: number; pending: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayEntries = entries.filter(e => e.date === dateStr);
        result.push({
          day: days[d.getDay()],
          entries: dayEntries.length,
          validated: dayEntries.filter(e => e.status === 'validated' || e.status === 'posted').length,
          pending: dayEntries.filter(e => e.status === 'draft').length,
        });
      }
      return result;
    },
  });

  // 3. Alertes et contrôles — dynamiques
  const { data: alerts = [] } = useQuery({
    queryKey: ['journal-alerts'],
    queryFn: async () => {
      const entries = await db.journalEntries.toArray();
      const drafts = entries.filter(e => e.status === 'draft').length;
      const unbalanced = entries.filter(e => Math.abs(e.totalDebit - e.totalCredit) > 1).length;
      const result: { type: string; message: string; icon: typeof AlertTriangle }[] = [];
      if (unbalanced > 0) result.push({ type: 'error', message: `${unbalanced} écriture(s) non équilibrée(s)`, icon: AlertTriangle });
      if (drafts > 0) result.push({ type: 'warning', message: `${drafts} écriture(s) en attente de validation`, icon: Clock });
      if (result.length === 0) result.push({ type: 'info', message: 'Aucune alerte en cours', icon: CheckCircle });
      return result;
    },
  });

  // 4. Suivi de trésorerie — depuis comptes 5x
  const { data: treasuryData = { cashBalance: 0, bankBalance: 0, totalBalance: 0, dailyIn: 0, dailyOut: 0, netFlow: 0 } } = useQuery({
    queryKey: ['journal-treasury'],
    queryFn: async () => {
      const entries = await db.journalEntries.toArray();
      let bankBalance = 0, cashBalance = 0;
      for (const e of entries) {
        for (const l of e.lines) {
          if (l.accountCode.startsWith('52')) bankBalance += l.debit - l.credit;
          if (l.accountCode.startsWith('57')) cashBalance += l.debit - l.credit;
        }
      }
      return { cashBalance, bankBalance, totalBalance: bankBalance + cashBalance, dailyIn: 0, dailyOut: 0, netFlow: 0 };
    },
  });

  // Évolution de la trésorerie (7 derniers jours)
  const { data: treasuryEvolution = [] } = useQuery({
    queryKey: ['journal-treasury-evolution'],
    queryFn: async () => {
      const entries = await db.journalEntries.toArray();
      const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      const result: { day: string; encaissements: number; decaissements: number; solde: number }[] = [];
      let runningBalance = 0;
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        let enc = 0, dec = 0;
        for (const e of entries.filter(e => e.date === dateStr)) {
          for (const l of e.lines) {
            if (l.accountCode.startsWith('5')) {
              enc += l.debit;
              dec += l.credit;
            }
          }
        }
        runningBalance += enc - dec;
        result.push({ day: days[d.getDay()], encaissements: enc, decaissements: dec, solde: runningBalance });
      }
      return result;
    },
  });

  // 5. KPIs calculés
  const { data: kpis = { avgValidationTime: '0', complianceRate: 100, errorRate: 0, automationRate: 0 } } = useQuery({
    queryKey: ['journal-kpis'],
    queryFn: async () => {
      const entries = await db.journalEntries.toArray();
      const total = entries.length || 1;
      const validated = entries.filter(e => e.status !== 'draft').length;
      const errors = entries.filter(e => Math.abs(e.totalDebit - e.totalCredit) > 1).length;
      return {
        avgValidationTime: '—',
        complianceRate: Math.round((validated / total) * 100),
        errorRate: Math.round((errors / total) * 100),
        automationRate: 0,
      };
    },
  });

  const formatAmount = (amount: number) => formatCurrency(amount);

  return (
    <div className="space-y-6">
      {/* Header avec sélecteur de période */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#191919]">Dashboard Journaux Comptables</h1>
          <p className="text-sm text-[#767676] mt-1">Vue d'ensemble de l'activité comptable</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
          >
            <option value="today">{t('common.today')}</option>
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
                      <p className="text-lg font-bold text-[#191919] mt-1">{todaySummary.totalEntries}</p>
                    </div>
                    <FileText className="w-8 h-8 text-[#6A8A82]" />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-[#E8E8E8]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#767676]">Total Débits</p>
                      <p className="text-lg font-bold text-red-600 mt-1">
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
                      <p className="text-lg font-bold text-green-600 mt-1">
                        {formatAmount(todaySummary.totalCredit)}
                      </p>
                    </div>
                    <TrendingDown className="w-8 h-8 text-green-500" />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-[#E8E8E8]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#767676]">{t('accounting.balance')}</p>
                      <p className={`text-lg font-bold mt-1 ${todaySummary.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
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
                      <p className="text-sm text-[#767676]">{t('status.pending')}</p>
                      <p className="text-lg font-bold text-orange-600 mt-1">{todaySummary.pendingValidation}</p>
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
                      <p className="text-lg font-bold text-[#191919] mt-1">
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
                      <p className="text-lg font-bold text-[#191919] mt-1">
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
                      <p className="text-lg font-bold text-green-600 mt-1">
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
                      <p className="text-lg font-bold text-red-600 mt-1">
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
                    <Area type="monotone" dataKey="encaissements" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} name={t('treasury.receipts')} />
                    <Area type="monotone" dataKey="decaissements" stackId="2" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} name={t('treasury.payments')} />
                    <Line type="monotone" dataKey="solde" stroke="#6A8A82" strokeWidth={2} name={t('accounting.balance')} />
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
                    <p className="text-lg font-bold text-[#191919]">{kpis.avgValidationTime}h</p>
                    <p className="text-sm text-[#767676] mt-1">Temps moyen de validation</p>
                  </div>

                  <div className="text-center">
                    <div className="mb-2">
                      <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
                    </div>
                    <p className="text-lg font-bold text-green-600">{kpis.complianceRate}%</p>
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
                    <p className="text-lg font-bold text-red-600">{kpis.errorRate}%</p>
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
                    <p className="text-lg font-bold text-[#B87333]">{kpis.automationRate}%</p>
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
                  <p className="text-lg font-bold text-blue-700">+{formatAmount(treasuryData.netFlow)}</p>
                  <p className="text-xs text-blue-600 mt-2">↑ 12% vs semaine dernière</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
                  <h4 className="text-sm font-semibold text-green-900 mb-3">Solde Total Disponible</h4>
                  <p className="text-lg font-bold text-green-700">{formatAmount(treasuryData.totalBalance)}</p>
                  <p className="text-xs text-green-600 mt-2">Caisse + Banque</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
                  <h4 className="text-sm font-semibold text-purple-900 mb-3">Prévisions à 30 jours</h4>
                  <p className="text-lg font-bold text-purple-700">{formatAmount(8500000)}</p>
                  <p className="text-xs text-purple-600 mt-2">Basé sur les tendances actuelles</p>
                </div>
              </div>
            </div>
          )}
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

export default JournalDashboard;