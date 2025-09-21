import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Globe,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Plus,
  RefreshCw,
  Calendar,
  DollarSign,
  Euro,
  PoundSterling,
  BarChart3,
  PieChart,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Banknote,
  CreditCard,
  Activity,
  Shield
} from 'lucide-react';
import {
  UnifiedCard,
  KPICard,
  SectionHeader,
  ElegantButton,
  PageContainer,
  ModernChartCard,
  ColorfulBarChart
} from '../../components/ui/DesignSystem';
import { treasuryService } from '../../services/treasury.service';
import { formatCurrency, formatDate, formatPercentage } from '../../lib/utils';

interface CurrencyPosition {
  currency: string;
  balance: number;
  equivalentEUR: number;
  accounts: number;
  averageRate: number;
  rateChange24h: number;
  lastUpdate: string;
  exposure: 'low' | 'medium' | 'high';
  hedged: boolean;
  hedgeRatio: number;
}

interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  change24h: number;
  change7d: number;
  change30d: number;
  lastUpdate: string;
  provider: string;
}

interface HedgingPosition {
  id: string;
  currency: string;
  type: 'forward' | 'option' | 'swap';
  amount: number;
  strikeRate: number;
  currentRate: number;
  maturityDate: string;
  unrealizedPnL: number;
  status: 'active' | 'expired' | 'exercised';
}

interface CurrencyModal {
  isOpen: boolean;
  mode: 'view' | 'hedge' | 'convert';
  currency?: string;
}

const MultiCurrency: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterExposure, setFilterExposure] = useState('all');
  const [filterHedged, setFilterHedged] = useState('all');
  const [viewMode, setViewMode] = useState<'overview' | 'rates' | 'hedging'>('overview');
  const [currencyModal, setCurrencyModal] = useState<CurrencyModal>({ isOpen: false, mode: 'view' });
  const [selectedBaseCurrency, setSelectedBaseCurrency] = useState('EUR');

  // Mock data for demonstration
  const mockCurrencyPositions: CurrencyPosition[] = [
    {
      currency: 'EUR',
      balance: 4325000,
      equivalentEUR: 4325000,
      accounts: 4,
      averageRate: 1.0,
      rateChange24h: 0,
      lastUpdate: '2024-09-19T10:30:00Z',
      exposure: 'low',
      hedged: false,
      hedgeRatio: 0
    },
    {
      currency: 'USD',
      balance: 3200000,
      equivalentEUR: 2944000,
      accounts: 2,
      averageRate: 1.087,
      rateChange24h: 0.0023,
      lastUpdate: '2024-09-19T10:25:00Z',
      exposure: 'high',
      hedged: true,
      hedgeRatio: 0.75
    },
    {
      currency: 'GBP',
      balance: 950000,
      equivalentEUR: 1092500,
      accounts: 1,
      averageRate: 0.8695,
      rateChange24h: -0.0045,
      lastUpdate: '2024-09-19T10:20:00Z',
      exposure: 'medium',
      hedged: true,
      hedgeRatio: 0.60
    },
    {
      currency: 'CHF',
      balance: 1200000,
      equivalentEUR: 1296000,
      accounts: 1,
      averageRate: 0.9259,
      rateChange24h: 0.0012,
      lastUpdate: '2024-09-19T10:15:00Z',
      exposure: 'medium',
      hedged: false,
      hedgeRatio: 0
    },
    {
      currency: 'JPY',
      balance: 45000000,
      equivalentEUR: 283500,
      accounts: 1,
      averageRate: 158.73,
      rateChange24h: -0.85,
      lastUpdate: '2024-09-19T10:10:00Z',
      exposure: 'low',
      hedged: true,
      hedgeRatio: 1.0
    }
  ];

  const mockExchangeRates: ExchangeRate[] = [
    {
      from: 'USD',
      to: 'EUR',
      rate: 0.9200,
      change24h: 0.0023,
      change7d: -0.0156,
      change30d: 0.0287,
      lastUpdate: '2024-09-19T10:30:00Z',
      provider: 'Reuters'
    },
    {
      from: 'GBP',
      to: 'EUR',
      rate: 1.1500,
      change24h: -0.0045,
      change7d: 0.0098,
      change30d: -0.0234,
      lastUpdate: '2024-09-19T10:30:00Z',
      provider: 'Bloomberg'
    },
    {
      from: 'CHF',
      to: 'EUR',
      rate: 1.0800,
      change24h: 0.0012,
      change7d: 0.0034,
      change30d: 0.0145,
      lastUpdate: '2024-09-19T10:30:00Z',
      provider: 'Reuters'
    },
    {
      from: 'JPY',
      to: 'EUR',
      rate: 0.0063,
      change24h: -0.000054,
      change7d: 0.000123,
      change30d: -0.000298,
      lastUpdate: '2024-09-19T10:30:00Z',
      provider: 'ECB'
    }
  ];

  const mockHedgingPositions: HedgingPosition[] = [
    {
      id: '1',
      currency: 'USD',
      type: 'forward',
      amount: 2400000,
      strikeRate: 1.0850,
      currentRate: 1.0870,
      maturityDate: '2024-12-15',
      unrealizedPnL: -4800,
      status: 'active'
    },
    {
      id: '2',
      currency: 'GBP',
      type: 'option',
      amount: 570000,
      strikeRate: 0.8700,
      currentRate: 0.8695,
      maturityDate: '2024-11-30',
      unrealizedPnL: 285,
      status: 'active'
    },
    {
      id: '3',
      currency: 'JPY',
      type: 'swap',
      amount: 45000000,
      strikeRate: 160.00,
      currentRate: 158.73,
      maturityDate: '2025-03-20',
      unrealizedPnL: 3560,
      status: 'active'
    }
  ];

  // Filter currencies based on search and filters
  const filteredCurrencies = useMemo(() => {
    return mockCurrencyPositions.filter(currency => {
      const matchesSearch = currency.currency.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesExposure = filterExposure === 'all' || currency.exposure === filterExposure;
      const matchesHedged = filterHedged === 'all' ||
        (filterHedged === 'hedged' && currency.hedged) ||
        (filterHedged === 'unhedged' && !currency.hedged);

      return matchesSearch && matchesExposure && matchesHedged;
    });
  }, [searchTerm, filterExposure, filterHedged, mockCurrencyPositions]);

  // Calculate aggregated metrics
  const aggregatedData = useMemo(() => {
    const totalEquivalentEUR = filteredCurrencies.reduce((sum, curr) => sum + curr.equivalentEUR, 0);
    const totalAccounts = filteredCurrencies.reduce((sum, curr) => sum + curr.accounts, 0);
    const hedgedPositions = filteredCurrencies.filter(curr => curr.hedged).length;
    const highExposurePositions = filteredCurrencies.filter(curr => curr.exposure === 'high').length;
    const totalHedgingPnL = mockHedgingPositions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);

    return {
      totalEquivalentEUR,
      totalAccounts,
      hedgedPositions,
      highExposurePositions,
      totalHedgingPnL,
      hedgingEffectiveness: hedgedPositions / filteredCurrencies.length
    };
  }, [filteredCurrencies, mockHedgingPositions]);

  const getCurrencyIcon = (currency: string) => {
    switch (currency) {
      case 'EUR': return <Euro className="h-5 w-5" />;
      case 'USD': return <DollarSign className="h-5 w-5" />;
      case 'GBP': return <PoundSterling className="h-5 w-5" />;
      default: return <Banknote className="h-5 w-5" />;
    }
  };

  const getExposureColor = (exposure: string) => {
    switch (exposure) {
      case 'low': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-neutral-600';
  };

  const chartData = filteredCurrencies.map(curr => ({
    label: curr.currency,
    value: curr.equivalentEUR / 1000000,
    color: curr.currency === 'EUR' ? 'bg-[#6A8A82]' :
           curr.currency === 'USD' ? 'bg-green-500' :
           curr.currency === 'GBP' ? 'bg-[#B87333]' :
           curr.currency === 'CHF' ? 'bg-orange-500' : 'bg-pink-500'
  }));

  const ratesTrendData = [
    { label: 'Lun', EUR: 1.0870, USD: 0.9200, GBP: 1.1500 },
    { label: 'Mar', EUR: 1.0865, USD: 0.9195, GBP: 1.1485 },
    { label: 'Mer', EUR: 1.0880, USD: 0.9210, GBP: 1.1520 },
    { label: 'Jeu', EUR: 1.0875, USD: 0.9205, GBP: 1.1510 },
    { label: 'Ven', EUR: 1.0870, USD: 0.9200, GBP: 1.1500 }
  ];

  return (
    <PageContainer background="warm" padding="lg">
      <div className="space-y-8">
        {/* Header */}
        <SectionHeader
          title="Gestion Multi-Devises"
          subtitle="Positions, changes, et couverture des risques de change"
          icon={Globe}
          action={
            <div className="flex gap-3">
              <ElegantButton variant="outline" icon={RefreshCw}>
                Actualiser Taux
              </ElegantButton>
              <ElegantButton variant="outline" icon={Download}>
                Exporter
              </ElegantButton>
              <ElegantButton
                variant="primary"
                icon={Shield}
                onClick={() => setCurrencyModal({ isOpen: true, mode: 'hedge' })}
              >
                Nouvelle Couverture
              </ElegantButton>
            </div>
          }
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Exposition Totale (EUR)"
            value={formatCurrency(aggregatedData.totalEquivalentEUR)}
            subtitle={`${filteredCurrencies.length} devises actives`}
            icon={Globe}
            color="primary"
            delay={0.1}
            withChart={true}
          />

          <KPICard
            title="Positions Couvertes"
            value={`${aggregatedData.hedgedPositions}/${filteredCurrencies.length}`}
            subtitle={`${formatPercentage(aggregatedData.hedgingEffectiveness)} du portefeuille`}
            icon={Shield}
            color="success"
            delay={0.2}
            withChart={true}
          />

          <KPICard
            title="Exposition Haute"
            value={aggregatedData.highExposurePositions.toString()}
            subtitle="Positions à surveiller"
            icon={AlertTriangle}
            color="warning"
            delay={0.3}
            withChart={true}
          />

          <KPICard
            title="P&L Couverture"
            value={formatCurrency(aggregatedData.totalHedgingPnL)}
            subtitle="Plus-values latentes"
            icon={TrendingUp}
            color={aggregatedData.totalHedgingPnL >= 0 ? "success" : "error"}
            delay={0.4}
            withChart={true}
          />
        </div>

        {/* View Mode Selector */}
        <UnifiedCard variant="elevated" size="md">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex bg-white rounded-2xl p-1 shadow-lg border border-neutral-200">
              {(['overview', 'rates', 'hedging'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    viewMode === mode
                      ? 'bg-[#6A8A82] text-white shadow-md'
                      : 'text-neutral-600 hover:text-[#6A8A82]'
                  }`}
                >
                  {mode === 'overview' ? 'Vue d\'ensemble' :
                   mode === 'rates' ? 'Taux de Change' : 'Couvertures'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-neutral-700">Devise de base:</label>
              <select
                value={selectedBaseCurrency}
                onChange={(e) => setSelectedBaseCurrency(e.target.value)}
                className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>
        </UnifiedCard>

        {viewMode === 'overview' && (
          <>
            {/* Chart Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <ModernChartCard
                title="Répartition par Devise (EUR équivalent)"
                subtitle="Exposition par devise en millions d'euros"
                icon={PieChart}
              >
                <ColorfulBarChart
                  data={chartData}
                  height={160}
                  showValues={true}
                  valueFormatter={(value) => `${value.toFixed(1)}M €`}
                />
              </ModernChartCard>
            </motion.div>

            {/* Filters */}
            <UnifiedCard variant="elevated" size="md">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-neutral-800">Filtres</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Rechercher une devise..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                    />
                  </div>

                  <select
                    value={filterExposure}
                    onChange={(e) => setFilterExposure(e.target.value)}
                    className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                  >
                    <option value="all">Toutes les expositions</option>
                    <option value="low">Exposition faible</option>
                    <option value="medium">Exposition moyenne</option>
                    <option value="high">Exposition élevée</option>
                  </select>

                  <select
                    value={filterHedged}
                    onChange={(e) => setFilterHedged(e.target.value)}
                    className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                  >
                    <option value="all">Toutes les positions</option>
                    <option value="hedged">Positions couvertes</option>
                    <option value="unhedged">Positions non couvertes</option>
                  </select>
                </div>
              </div>
            </UnifiedCard>

            {/* Currency Positions */}
            <UnifiedCard variant="elevated" size="lg">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-neutral-800">
                  Positions par Devise ({filteredCurrencies.length})
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-200">
                        <th className="text-left py-3 px-4 font-medium text-neutral-600">Devise</th>
                        <th className="text-right py-3 px-4 font-medium text-neutral-600">Position</th>
                        <th className="text-right py-3 px-4 font-medium text-neutral-600">Équivalent EUR</th>
                        <th className="text-right py-3 px-4 font-medium text-neutral-600">Taux Moyen</th>
                        <th className="text-right py-3 px-4 font-medium text-neutral-600">Variation 24h</th>
                        <th className="text-center py-3 px-4 font-medium text-neutral-600">Exposition</th>
                        <th className="text-center py-3 px-4 font-medium text-neutral-600">Couverture</th>
                        <th className="text-center py-3 px-4 font-medium text-neutral-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCurrencies.map((currency, index) => (
                        <motion.tr
                          key={currency.currency}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b border-neutral-100 hover:bg-neutral-50"
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-[#6A8A82]/5 rounded-lg">
                                {getCurrencyIcon(currency.currency)}
                              </div>
                              <div>
                                <p className="font-semibold text-neutral-800">{currency.currency}</p>
                                <p className="text-sm text-neutral-500">{currency.accounts} comptes</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <p className="font-semibold text-neutral-800">
                              {formatCurrency(currency.balance, currency.currency)}
                            </p>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <p className="font-semibold text-neutral-800">
                              {formatCurrency(currency.equivalentEUR)}
                            </p>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <p className="font-medium text-neutral-800">
                              {currency.averageRate.toFixed(4)}
                            </p>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              {currency.rateChange24h > 0 ? (
                                <ArrowUpRight className="h-4 w-4 text-green-600" />
                              ) : currency.rateChange24h < 0 ? (
                                <ArrowDownRight className="h-4 w-4 text-red-600" />
                              ) : null}
                              <span className={getChangeColor(currency.rateChange24h)}>
                                {Math.abs(currency.rateChange24h * 100).toFixed(2)}%
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getExposureColor(currency.exposure)}`}>
                              {currency.exposure === 'low' ? 'Faible' :
                               currency.exposure === 'medium' ? 'Moyenne' : 'Élevée'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              {currency.hedged ? (
                                <div className="flex items-center space-x-1">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span className="text-sm text-green-600">
                                    {formatPercentage(currency.hedgeRatio)}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1">
                                  <AlertTriangle className="h-4 w-4 text-red-600" />
                                  <span className="text-sm text-red-600">Non couverte</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex justify-center space-x-2">
                              <button
                                onClick={() => setCurrencyModal({ isOpen: true, mode: 'view', currency: currency.currency })}
                                className="p-2 text-neutral-400 hover:text-[#6A8A82] transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setCurrencyModal({ isOpen: true, mode: 'hedge', currency: currency.currency })}
                                className="p-2 text-neutral-400 hover:text-green-600 transition-colors"
                              >
                                <Shield className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </UnifiedCard>
          </>
        )}

        {viewMode === 'rates' && (
          <UnifiedCard variant="elevated" size="lg">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-neutral-800">Taux de Change en Temps Réel</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mockExchangeRates.map((rate, index) => (
                  <motion.div
                    key={`${rate.from}-${rate.to}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-6 bg-white border border-neutral-200 rounded-xl hover:shadow-md transition-all duration-200"
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold text-neutral-800">{rate.from}/{rate.to}</h4>
                        <span className="text-xs text-neutral-500">{rate.provider}</span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <span className="text-2xl font-bold text-neutral-800">{rate.rate.toFixed(4)}</span>
                          <div className="flex items-center space-x-1">
                            {rate.change24h > 0 ? (
                              <ArrowUpRight className="h-4 w-4 text-green-600" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4 text-red-600" />
                            )}
                            <span className={getChangeColor(rate.change24h)}>
                              {Math.abs(rate.change24h * 100).toFixed(2)}%
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between text-sm text-neutral-500">
                          <span>7j: {rate.change7d > 0 ? '+' : ''}{(rate.change7d * 100).toFixed(2)}%</span>
                          <span>30j: {rate.change30d > 0 ? '+' : ''}{(rate.change30d * 100).toFixed(2)}%</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-neutral-100">
                        <p className="text-xs text-neutral-500">
                          Mis à jour: {formatDate(rate.lastUpdate)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </UnifiedCard>
        )}

        {viewMode === 'hedging' && (
          <UnifiedCard variant="elevated" size="lg">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-neutral-800">Positions de Couverture</h3>
                <ElegantButton
                  variant="primary"
                  icon={Plus}
                  onClick={() => setCurrencyModal({ isOpen: true, mode: 'hedge' })}
                >
                  Nouvelle Couverture
                </ElegantButton>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="text-left py-3 px-4 font-medium text-neutral-600">Devise</th>
                      <th className="text-left py-3 px-4 font-medium text-neutral-600">Type</th>
                      <th className="text-right py-3 px-4 font-medium text-neutral-600">Montant</th>
                      <th className="text-right py-3 px-4 font-medium text-neutral-600">Taux Strike</th>
                      <th className="text-right py-3 px-4 font-medium text-neutral-600">Taux Actuel</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">Échéance</th>
                      <th className="text-right py-3 px-4 font-medium text-neutral-600">P&L Latente</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockHedgingPositions.map((position, index) => (
                      <motion.tr
                        key={position.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-neutral-100 hover:bg-neutral-50"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-[#6A8A82]/5 rounded-lg">
                              {getCurrencyIcon(position.currency)}
                            </div>
                            <span className="font-semibold text-neutral-800">{position.currency}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-[#6A8A82]/10 text-[#6A8A82]">
                            {position.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="font-medium text-neutral-800">
                            {formatCurrency(position.amount, position.currency)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="font-mono text-sm text-neutral-800">
                            {position.strikeRate.toFixed(4)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="font-mono text-sm text-neutral-800">
                            {position.currentRate.toFixed(4)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="text-sm text-neutral-600">
                            {formatDate(position.maturityDate)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className={`font-semibold ${
                            position.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {position.unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(position.unrealizedPnL)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            position.status === 'active' ? 'bg-green-50 text-green-600' :
                            position.status === 'expired' ? 'bg-gray-50 text-gray-600' :
                            'bg-[#6A8A82]/10 text-[#6A8A82]'
                          }`}>
                            {position.status === 'active' ? 'Actif' :
                             position.status === 'expired' ? 'Expiré' : 'Exercé'}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </UnifiedCard>
        )}

        {/* Currency Modal */}
        {currencyModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-neutral-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-neutral-800">
                    {currencyModal.mode === 'hedge' ? 'Nouvelle Couverture' :
                     currencyModal.mode === 'convert' ? 'Conversion de Devise' : 'Détails de la Position'}
                  </h3>
                  <button
                    onClick={() => setCurrencyModal({ isOpen: false, mode: 'view' })}
                    className="p-2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="text-center text-neutral-600">
                  <p>Fonctionnalité en développement...</p>
                  <p className="text-sm mt-2">Interface de gestion des couvertures et conversions</p>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-200">
                  <ElegantButton
                    variant="outline"
                    onClick={() => setCurrencyModal({ isOpen: false, mode: 'view' })}
                  >
                    Fermer
                  </ElegantButton>
                  {currencyModal.mode !== 'view' && (
                    <ElegantButton variant="primary">
                      {currencyModal.mode === 'hedge' ? 'Créer Couverture' : 'Convertir'}
                    </ElegantButton>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default MultiCurrency;