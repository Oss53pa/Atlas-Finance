// @ts-nocheck

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import { useMoneyFormat } from '../../hooks/useMoneyFormat';
import { money } from '../../utils/money';
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
  const fmt = useMoneyFormat();
  const { adapter } = useData();
  // Ã‰tats
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '2024-01-01', end: '2024-12-31' });
  const [activeSubTab, setActiveSubTab] = useState('operations');

  // Sous-onglets
  const subTabs = [
    { id: 'operations', label: 'OpÃ©rations & ContrÃ´les', icon: Layers },
    { id: 'treasury', label: 'TrÃ©sorerie & Performance', icon: TrendIcon }
  ];

  const [selectedPeriod, setSelectedPeriod] = useState('today');

  // 1. SynthÃ¨se des Ã©critures du jour â€” depuis Dexie
  const { data: todaySummary = { totalEntries: 0, totalDebit: 0, totalCredit: 0, isBalanced: true, pendingValidation: 0, validated: 0 } } = useQuery({
    queryKey: ['journal-today-summary'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const entries = await adapter.getAll('journalEntries');
      const todayEntries = entries.filter(e => e.date === today);
      const totalDebit = todayEntries.reduce((s, e) => money(s).add(money(e.totalDebit)).toNumber(), 0);
      const totalCredit = todayEntries.reduce((s, e) => money(s).add(money(e.totalCredit)).toNumber(), 0);
      return {
        totalEntries: todayEntries.length,
        totalDebit, totalCredit,
        isBalanced: money(totalDebit).subtract(money(totalCredit)).abs().toNumber() < 1,
        pendingValidation: todayEntries.filter(e => e.status === 'draft').length,
        validated: todayEntries.filter(e => e.status === 'validated' || e.status === 'posted').length,
      };
    },
  });

  // 2. RÃ©partition par type d'opÃ©ration â€” depuis Dexie
  const { data: operationsByType = [] } = useQuery({
    queryKey: ['journal-operations-by-type', dateRange],
    queryFn: async () => {
      const entries = await adapter.getAll('journalEntries');
      const filtered = entries.filter(e => e.date >= dateRange.start && e.date <= dateRange.end);
      const byJournal: Record<string, number> = {};
      for (const e of filtered) byJournal[e.journal] = (byJournal[e.journal] || 0) + 1;
      const colors: Record<string, string> = { VE: '#22c55e', AC: '#EF4444', BQ: '#3B82F6', CA: '#F59E0B', OD: '#737373' };
      const names: Record<string, string> = { VE: 'Ventes', AC: 'Achats', BQ: 'Banque', CA: 'Caisse', OD: 'OpÃ©rations Diverses' };
      return Object.entries(byJournal).map(([key, value]) => ({
        name: names[key] || key, value, color: colors[key] || '#8B5CF6',
      }));
    },
  });

  // Volume d'Ã©critures par jour (7 derniers jours)
  const { data: volumeByDay = [] } = useQuery({
    queryKey: ['journal-volume-by-day'],
    queryFn: async () => {
      const entries = await adapter.getAll('journalEntries');
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

  // 3. Alertes et contrÃ´les â€” dynamiques
  const { data: alerts = [] } = useQuery({
    queryKey: ['journal-alerts'],
    queryFn: async () => {
      const entries = await adapter.getAll('journalEntries');
      const drafts = entries.filter(e => e.status === 'draft').length;
      const unbalanced = entries.filter(e => money(e.totalDebit).subtract(money(e.totalCredit)).abs().toNumber() > 1).length;
      const result: { type: string; message: string; icon: typeof AlertTriangle }[] = [];
      if (unbalanced > 0) result.push({ type: 'error', message: `${unbalanced} Ã©criture(s) non Ã©quilibrÃ©e(s)`, icon: AlertTriangle });
      if (drafts > 0) result.push({ type: 'warning', message: `${drafts} Ã©criture(s) en attente de validation`, icon: Clock });
      if (result.length === 0) result.push({ type: 'info', message: 'Aucune alerte en cours', icon: CheckCircle });
      return result;
    },
  });

  // 4. Suivi de trÃ©sorerie â€” depuis comptes 5x
  const { data: treasuryData = { cashBalance: 0, bankBalance: 0, totalBalance: 0, dailyIn: 0, dailyOut: 0, netFlow: 0 } } = useQuery({
    queryKey: ['journal-treasury'],
    queryFn: async () => {
      const entries = await adapter.getAll('journalEntries');
      let bankBalance = 0, cashBalance = 0;
      for (const e of entries) {
        for (const l of e.lines) {
          if (l.accountCode.startsWith('52')) bankBalance = money(bankBalance).add(money(l.debit).subtract(money(l.credit))).toNumber();
          if (l.accountCode.startsWith('57')) cashBalance = money(cashBalance).add(money(l.debit).subtract(money(l.credit))).toNumber();
        }
      }
      return { cashBalance, bankBalance, totalBalance: money(bankBalance).add(money(cashBalance)).toNumber(), dailyIn: 0, dailyOut: 0, netFlow: 0 };
    },
  });

  // Ã‰volution de la trÃ©sorerie (7 derniers jours)
  const { data: treasuryEvolution = [] } = useQuery({
    queryKey: ['journal-treasury-evolution'],
    queryFn: async () => {
      const entries = await adapter.getAll('journalEntries');
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
              enc = money(enc).add(money(l.debit)).toNumber();
              dec = money(dec).add(money(l.credit)).toNumber();
            }
          }
        }
        runningBalance = money(runningBalance).add(money(enc).subtract(money(dec))).toNumber();
        result.push({ day: days[d.getDay()], encaissements: enc, decaissements: dec, solde: runningBalance });
      }
      return result;
    },
  });

  // 5. KPIs calculÃ©s
  const { data: kpis = { avgValidationTime: '0', complianceRate: 100, errorRate: 0, automationRate: 0 } } = useQuery({
    queryKey: ['journal-kpis'],
    queryFn: async () => {
      const entries = await adapter.getAll('journalEntries');
      const total = entries.length || 1;
      const validated = entries.filter(e => e.status !== 'draft').length;
      const errors = entries.filter(e => money(e.totalDebit).subtract(money(e.totalCredit)).abs().toNumber() > 1).length;
      return {
        avgValidationTime: 'â€”',
        complianceRate: Math.round((validated / total) * 100),
        errorRate: Math.round((errors / total) * 100),
        automationRate: 0,
      };
    },
  });

  const formatAmount = (amount: number) => fmt(amount);

  return (
    <div className="space-y-6">
      {/* Header avec sÃ©lecteur de pÃ©riode */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Dashboard Journaux Comptables</h1>
          <p className="text-sm text-[var(--color-text-tertiary)] mt-1">Vue d'ensemble de l'activitÃ© comptable</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="today">{t('common.today')}</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="year">Cette annÃ©e</option>
          </select>
          <span className="text-sm text-[var(--color-text-tertiary)] flex items-center">
            <Calendar className="w-4 h-4 mr-1" />
            {new Date().toLocaleDateString('fr-FR')}
          </span>
        </div>
      </div>

      {/* Sous-onglets */}
      <div className="bg-white rounded-lg border border-[var(--color-border)]">
        <div className="px-4 border-b border-[var(--color-border)]">
          <nav className="flex space-x-6">
            {subTabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`flex items-center space-x-2 py-3 border-b-2 font-medium text-sm transition-colors ${
                    activeSubTab === tab.id
                      ? 'border-[var(--color-primary)] text-[var(--color-text-primary)]'
                      : 'border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
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
          {/* ONGLET OPÃ‰RATIONS & CONTRÃ”LES */}
          {activeSubTab === 'operations' && (
            <div className="space-y-6">
              {/* SynthÃ¨se du jour */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-[var(--color-border)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[var(--color-text-tertiary)]">Ã‰critures du jour</p>
                      <p className="text-lg font-bold text-[var(--color-text-primary)] mt-1">{todaySummary.totalEntries}</p>
                    </div>
                    <FileText className="w-8 h-8 text-[var(--color-text-primary)]" />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-[var(--color-border)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[var(--color-text-tertiary)]">Total DÃ©bits</p>
                      <p className="text-lg font-bold text-red-600 mt-1">
                        {formatAmount(todaySummary.totalDebit)}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-red-500" />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-[var(--color-border)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[var(--color-text-tertiary)]">Total CrÃ©dits</p>
                      <p className="text-lg font-bold text-green-600 mt-1">
                        {formatAmount(todaySummary.totalCredit)}
                      </p>
                    </div>
                    <TrendingDown className="w-8 h-8 text-green-500" />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-[var(--color-border)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[var(--color-text-tertiary)]">{t('accounting.balance')}</p>
                      <p className={`text-lg font-bold mt-1 ${todaySummary.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                        {todaySummary.isBalanced ? 'Ã‰quilibrÃ©e' : 'DÃ©sÃ©quilibrÃ©e'}
                      </p>
                    </div>
                    {todaySummary.isBalanced ? (
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-8 h-8 text-red-500" />
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-[var(--color-border)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[var(--color-text-tertiary)]">{t('status.pending')}</p>
                      <p className="text-lg font-bold text-orange-600 mt-1">{todaySummary.pendingValidation}</p>
                    </div>
                    <Clock className="w-8 h-8 text-orange-500" />
                  </div>
                </div>
              </div>

              {/* Visualisations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* RÃ©partition par type */}
                <div className="bg-gray-50 rounded-lg p-6 border border-[var(--color-border)]">
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center">
                    <PieChart className="w-5 h-5 mr-2 text-[var(--color-text-primary)]" />
                    RÃ©partition par type d'opÃ©ration
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
                        fill="#737373"
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
                        <span className="text-sm text-[var(--color-text-secondary)]">{type.name}: {type.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Volume par jour */}
                <div className="bg-gray-50 rounded-lg p-6 border border-[var(--color-border)]">
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-[var(--color-text-primary)]" />
                    Volume d'Ã©critures (7 derniers jours)
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={volumeByDay}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="validated" stackId="a" fill="#22c55e" name="ValidÃ©es" />
                      <Bar dataKey="pending" stackId="a" fill="#F59E0B" name="En attente" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Statistiques de contrÃ´le */}
              <div className="bg-gray-50 rounded-lg p-6 border border-[var(--color-border)]">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-[var(--color-text-primary)]" />
                  Ã‰tat des ContrÃ´les
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-[var(--color-border)]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[var(--color-text-tertiary)]">Journaux Ã©quilibrÃ©s</span>
                      <span className="text-lg font-bold text-green-600">3/5</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-[var(--color-border)]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[var(--color-text-tertiary)]">Ã‰critures validÃ©es</span>
                      <span className="text-lg font-bold text-blue-600">39/47</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '83%' }}></div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-[var(--color-border)]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[var(--color-text-tertiary)]">Comptes complets</span>
                      <span className="text-lg font-bold text-primary-600">44/47</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-primary-500 h-2 rounded-full" style={{ width: '93.6%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ONGLET TRÃ‰SORERIE & PERFORMANCE */}
          {activeSubTab === 'treasury' && (
            <div className="space-y-6">
              {/* Indicateurs de trÃ©sorerie */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-[var(--color-border)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[var(--color-text-tertiary)]">Solde Caisse</p>
                      <p className="text-lg font-bold text-[var(--color-text-primary)] mt-1">
                        {formatAmount(treasuryData.cashBalance)}
                      </p>
                    </div>
                    <Wallet className="w-8 h-8 text-[#F59E0B]" />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-[var(--color-border)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[var(--color-text-tertiary)]">Solde Banque</p>
                      <p className="text-lg font-bold text-[var(--color-text-primary)] mt-1">
                        {formatAmount(treasuryData.bankBalance)}
                      </p>
                    </div>
                    <CreditCard className="w-8 h-8 text-[#3B82F6]" />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-[var(--color-border)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[var(--color-text-tertiary)]">Encaissements du jour</p>
                      <p className="text-lg font-bold text-green-600 mt-1">
                        {formatAmount(treasuryData.dailyIn)}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-500" />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-[var(--color-border)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[var(--color-text-tertiary)]">DÃ©caissements du jour</p>
                      <p className="text-lg font-bold text-red-600 mt-1">
                        {formatAmount(treasuryData.dailyOut)}
                      </p>
                    </div>
                    <TrendingDown className="w-8 h-8 text-red-500" />
                  </div>
                </div>
              </div>

              {/* Ã‰volution de la trÃ©sorerie */}
              <div className="bg-gray-50 rounded-lg p-6 border border-[var(--color-border)]">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-[var(--color-text-primary)]" />
                  Ã‰volution de la trÃ©sorerie (7 derniers jours)
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={treasuryEvolution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis tickFormatter={(value) => fmt(value)} />
                    <Tooltip formatter={(value: number) => formatAmount(value)} />
                    <Legend />
                    <Area type="monotone" dataKey="encaissements" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} name={t('treasury.receipts')} />
                    <Area type="monotone" dataKey="decaissements" stackId="2" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} name={t('treasury.payments')} />
                    <Line type="monotone" dataKey="solde" stroke="#171717" strokeWidth={2} name={t('accounting.balance')} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Indicateurs de performance */}
              <div className="bg-gray-50 rounded-lg p-6 border border-[var(--color-border)]">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-6 flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-[var(--color-text-secondary)]" />
                  Indicateurs de Performance
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="mb-2">
                      <Clock className="w-10 h-10 text-[var(--color-text-primary)] mx-auto" />
                    </div>
                    <p className="text-lg font-bold text-[var(--color-text-primary)]">{kpis.avgValidationTime}h</p>
                    <p className="text-sm text-[var(--color-text-tertiary)] mt-1">Temps moyen de validation</p>
                  </div>

                  <div className="text-center">
                    <div className="mb-2">
                      <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
                    </div>
                    <p className="text-lg font-bold text-green-600">{kpis.complianceRate}%</p>
                    <p className="text-sm text-[var(--color-text-tertiary)] mt-1">Taux de conformitÃ©</p>
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
                    <p className="text-sm text-[var(--color-text-tertiary)] mt-1">Taux d'erreur</p>
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
                      <Activity className="w-10 h-10 text-[var(--color-text-secondary)] mx-auto" />
                    </div>
                    <p className="text-lg font-bold text-[var(--color-text-secondary)]">{kpis.automationRate}%</p>
                    <p className="text-sm text-[var(--color-text-tertiary)] mt-1">Taux d'automatisation</p>
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-[#525252] h-2 rounded-full"
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
                  <h4 className="text-sm font-semibold text-blue-900 mb-3">Flux Net de TrÃ©sorerie</h4>
                  <p className="text-lg font-bold text-blue-700">+{formatAmount(treasuryData.netFlow)}</p>
                  <p className="text-xs text-blue-600 mt-2">â†‘ 12% vs semaine derniÃ¨re</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
                  <h4 className="text-sm font-semibold text-green-900 mb-3">Solde Total Disponible</h4>
                  <p className="text-lg font-bold text-green-700">{formatAmount(treasuryData.totalBalance)}</p>
                  <p className="text-xs text-green-600 mt-2">Caisse + Banque</p>
                </div>

                <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-6 border border-primary-200">
                  <h4 className="text-sm font-semibold text-primary-900 mb-3">PrÃ©visions Ã  30 jours</h4>
                  <p className="text-lg font-bold text-primary-700">{formatAmount(8500000)}</p>
                  <p className="text-xs text-primary-600 mt-2">BasÃ© sur les tendances actuelles</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de sÃ©lection de pÃ©riode */}
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