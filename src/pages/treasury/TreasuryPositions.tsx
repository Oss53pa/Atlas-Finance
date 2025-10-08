import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Banknote,
  Building2,
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
  Globe,
  CreditCard,
  Wallet,
  BarChart3,
  PieChart,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight
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

interface BankPosition {
  id: string;
  bankName: string;
  accountNumber: string;
  accountType: 'current' | 'savings' | 'deposit' | 'credit';
  currency: string;
  balance: number;
  availableBalance: number;
  lastUpdate: string;
  status: 'active' | 'inactive' | 'frozen';
  iban: string;
  bic: string;
  branch: string;
  country: string;
  riskLevel: 'low' | 'medium' | 'high';
}

interface PositionModal {
  isOpen: boolean;
  mode: 'view' | 'edit' | 'create';
  position?: BankPosition;
}

const TreasuryPositions: React.FC = () => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCurrency, setFilterCurrency] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBank, setFilterBank] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [positionModal, setPositionModal] = useState<PositionModal>({ isOpen: false, mode: 'view' });

  // Mock data for demonstration
  const mockPositions: BankPosition[] = [
    {
      id: '1',
      bankName: 'BNP Paribas',
      accountNumber: 'FR7630004000031234567890143',
      accountType: 'current',
      currency: 'EUR',
      balance: 2450000,
      availableBalance: 2430000,
      lastUpdate: '2024-09-19T10:30:00Z',
      status: 'active',
      iban: 'FR7630004000031234567890143',
      bic: 'BNPAFRPP',
      branch: 'Paris Opéra',
      country: 'France',
      riskLevel: 'low'
    },
    {
      id: '2',
      bankName: 'Société Générale',
      accountNumber: 'FR7630003000001234567890140',
      accountType: 'current',
      currency: 'EUR',
      balance: 1875000,
      availableBalance: 1850000,
      lastUpdate: '2024-09-19T09:45:00Z',
      status: 'active',
      iban: 'FR7630003000001234567890140',
      bic: 'SOGEFRPP',
      branch: 'La Défense',
      country: 'France',
      riskLevel: 'low'
    },
    {
      id: '3',
      bankName: 'JPMorgan Chase',
      accountNumber: 'US1234567890123456789',
      accountType: 'deposit',
      currency: 'USD',
      balance: 3200000,
      availableBalance: 3200000,
      lastUpdate: '2024-09-19T08:20:00Z',
      status: 'active',
      iban: 'US1234567890123456789',
      bic: 'CHASUS33',
      branch: 'New York',
      country: 'USA',
      riskLevel: 'medium'
    },
    {
      id: '4',
      bankName: 'HSBC UK',
      accountNumber: 'GB29NWBK60161331926819',
      accountType: 'current',
      currency: 'GBP',
      balance: 950000,
      availableBalance: 920000,
      lastUpdate: '2024-09-19T11:15:00Z',
      status: 'active',
      iban: 'GB29NWBK60161331926819',
      bic: 'HBUKGB4B',
      branch: 'London City',
      country: 'UK',
      riskLevel: 'low'
    },
    {
      id: '5',
      bankName: 'Credit Suisse',
      accountNumber: 'CH9300762011623852957',
      accountType: 'savings',
      currency: 'CHF',
      balance: 1200000,
      availableBalance: 1200000,
      lastUpdate: '2024-09-19T07:30:00Z',
      status: 'active',
      iban: 'CH9300762011623852957',
      bic: 'CRESCHZZ80A',
      branch: 'Zurich',
      country: 'Switzerland',
      riskLevel: 'low'
    }
  ];

  // Filter positions based on search and filters
  const filteredPositions = useMemo(() => {
    return mockPositions.filter(position => {
      const matchesSearch = position.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          position.accountNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          position.branch.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCurrency = filterCurrency === 'all' || position.currency === filterCurrency;
      const matchesStatus = filterStatus === 'all' || position.status === filterStatus;
      const matchesBank = filterBank === 'all' || position.bankName === filterBank;

      return matchesSearch && matchesCurrency && matchesStatus && matchesBank;
    });
  }, [searchTerm, filterCurrency, filterStatus, filterBank, mockPositions]);

  // Calculate aggregated metrics
  const aggregatedData = useMemo(() => {
    const totalEUR = filteredPositions
      .filter(p => p.currency === 'EUR')
      .reduce((sum, p) => sum + p.balance, 0);

    const totalUSD = filteredPositions
      .filter(p => p.currency === 'USD')
      .reduce((sum, p) => sum + p.balance, 0);

    const totalGBP = filteredPositions
      .filter(p => p.currency === 'GBP')
      .reduce((sum, p) => sum + p.balance, 0);

    const totalCHF = filteredPositions
      .filter(p => p.currency === 'CHF')
      .reduce((sum, p) => sum + p.balance, 0);

    // Mock exchange rates
    const exchangeRates = { USD: 0.92, GBP: 1.15, CHF: 1.08 };

    const totalEquivalentEUR = totalEUR +
      (totalUSD * exchangeRates.USD) +
      (totalGBP * exchangeRates.GBP) +
      (totalCHF * exchangeRates.CHF);

    return {
      totalPositions: filteredPositions.length,
      totalEUR,
      totalUSD,
      totalGBP,
      totalCHF,
      totalEquivalentEUR,
      activeAccounts: filteredPositions.filter(p => p.status === 'active').length,
      highRiskAccounts: filteredPositions.filter(p => p.riskLevel === 'high').length
    };
  }, [filteredPositions]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'inactive': return 'text-gray-600 bg-gray-50';
      case 'frozen': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'EUR': return '€';
      case 'USD': return '$';
      case 'GBP': return '£';
      case 'CHF': return 'CHF';
      default: return currency;
    }
  };

  const uniqueCurrencies = [...new Set(mockPositions.map(p => p.currency))];
  const uniqueBanks = [...new Set(mockPositions.map(p => p.bankName))];

  const chartData = [
    { label: 'EUR', value: aggregatedData.totalEUR / 1000000, color: 'bg-[#6A8A82]' },
    { label: 'USD', value: (aggregatedData.totalUSD * 0.92) / 1000000, color: 'bg-green-500' },
    { label: 'GBP', value: (aggregatedData.totalGBP * 1.15) / 1000000, color: 'bg-[#B87333]' },
    { label: 'CHF', value: (aggregatedData.totalCHF * 1.08) / 1000000, color: 'bg-orange-500' }
  ];

  return (
    <PageContainer background="warm" padding="lg">
      <div className="space-y-8">
        {/* Header */}
        <SectionHeader
          title="Positions de Trésorerie"
          subtitle="Gestion et suivi des positions bancaires en temps réel"
          icon={Banknote}
          action={
            <div className="flex gap-3">
              <ElegantButton variant="outline" icon={RefreshCw}>
                Actualiser
              </ElegantButton>
              <ElegantButton variant="outline" icon={Download}>
                Exporter
              </ElegantButton>
              <ElegantButton
                variant="primary"
                icon={Plus}
                onClick={() => setPositionModal({ isOpen: true, mode: 'create' })}
              >
                Nouveau Compte
              </ElegantButton>
            </div>
          }
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Position Totale (EUR équivalent)"
            value={formatCurrency(aggregatedData.totalEquivalentEUR)}
            subtitle={`${aggregatedData.totalPositions} comptes actifs`}
            icon={Wallet}
            color="primary"
            delay={0.1}
            withChart={true}
          />

          <KPICard
            title="Comptes Actifs"
            value={aggregatedData.activeAccounts.toString()}
            subtitle={`Sur ${aggregatedData.totalPositions} comptes total`}
            icon={CheckCircle}
            color="success"
            delay={0.2}
            withChart={true}
          />

          <KPICard
            title="Exposition Multi-Devises"
            value={uniqueCurrencies.length.toString()}
            subtitle="Devises différentes"
            icon={Globe}
            color="neutral"
            delay={0.3}
            withChart={true}
          />

          <KPICard
            title="Comptes à Risque"
            value={aggregatedData.highRiskAccounts.toString()}
            subtitle="Surveillance renforcée"
            icon={AlertTriangle}
            color="warning"
            delay={0.4}
            withChart={true}
          />
        </div>

        {/* Chart Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <ModernChartCard
            title="Répartition par Devise (EUR équivalent)"
            subtitle="Exposition par devise principale"
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

        {/* Filters and Search */}
        <UnifiedCard variant="elevated" size="md">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-800">Filtres et Recherche</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'table' ? 'bg-[#6A8A82]/10 text-[#6A8A82]' : 'text-neutral-400 hover:text-neutral-600'
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid' ? 'bg-[#6A8A82]/10 text-[#6A8A82]' : 'text-neutral-400 hover:text-neutral-600'
                  }`}
                >
                  <Target className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
                />
              </div>

              <select
                value={filterCurrency}
                onChange={(e) => setFilterCurrency(e.target.value)}
                className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
              >
                <option value="all">Toutes les devises</option>
                {uniqueCurrencies.map(currency => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
                <option value="frozen">Gelé</option>
              </select>

              <select
                value={filterBank}
                onChange={(e) => setFilterBank(e.target.value)}
                className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
              >
                <option value="all">Toutes les banques</option>
                {uniqueBanks.map(bank => (
                  <option key={bank} value={bank}>{bank}</option>
                ))}
              </select>
            </div>
          </div>
        </UnifiedCard>

        {/* Positions Table/Grid */}
        <UnifiedCard variant="elevated" size="lg">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-neutral-800">
                Positions Bancaires ({filteredPositions.length})
              </h3>
            </div>

            {viewMode === 'table' ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="text-left py-3 px-4 font-medium text-neutral-600">Banque</th>
                      <th className="text-left py-3 px-4 font-medium text-neutral-600">{t('accounting.account')}</th>
                      <th className="text-right py-3 px-4 font-medium text-neutral-600">{t('accounting.balance')}</th>
                      <th className="text-right py-3 px-4 font-medium text-neutral-600">Disponible</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">Statut</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">Risque</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPositions.map((position, index) => (
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
                              <Building2 className="h-4 w-4 text-[#6A8A82]" />
                            </div>
                            <div>
                              <p className="font-medium text-neutral-800">{position.bankName}</p>
                              <p className="text-sm text-neutral-500">{position.branch}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-mono text-sm text-neutral-800">{position.iban}</p>
                            <p className="text-xs text-neutral-500">{position.accountType}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div>
                            <p className="font-semibold text-neutral-800">
                              {formatCurrency(position.balance, position.currency)}
                            </p>
                            <p className="text-sm text-neutral-500">{position.currency}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div>
                            <p className="font-medium text-neutral-800">
                              {formatCurrency(position.availableBalance, position.currency)}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {position.balance !== position.availableBalance ? 'Bloqué' : 'Libre'}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(position.status)}`}>
                            {position.status === 'active' ? 'Actif' :
                             position.status === 'inactive' ? 'Inactif' : 'Gelé'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskColor(position.riskLevel)}`}>
                            {position.riskLevel === 'low' ? 'Faible' :
                             position.riskLevel === 'medium' ? 'Moyen' : 'Élevé'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex justify-center space-x-2">
                            <button
                              onClick={() => setPositionModal({ isOpen: true, mode: 'view', position })}
                              className="p-2 text-neutral-400 hover:text-[#6A8A82] transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setPositionModal({ isOpen: true, mode: 'edit', position })}
                              className="p-2 text-neutral-400 hover:text-green-600 transition-colors"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPositions.map((position, index) => (
                  <motion.div
                    key={position.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-6 bg-white border border-neutral-200 rounded-xl hover:shadow-md transition-all duration-200"
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-[#6A8A82]/5 rounded-lg">
                            <Building2 className="h-5 w-5 text-[#6A8A82]" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-neutral-800">{position.bankName}</h4>
                            <p className="text-sm text-neutral-500">{position.branch}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(position.status)}`}>
                            {position.status === 'active' ? 'Actif' :
                             position.status === 'inactive' ? 'Inactif' : 'Gelé'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-neutral-500">Solde:</span>
                          <span className="font-semibold text-neutral-800">
                            {formatCurrency(position.balance, position.currency)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-neutral-500">Disponible:</span>
                          <span className="font-medium text-neutral-700">
                            {formatCurrency(position.availableBalance, position.currency)}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-neutral-100">
                        <div className="flex justify-between items-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskColor(position.riskLevel)}`}>
                            Risque {position.riskLevel === 'low' ? 'Faible' :
                                    position.riskLevel === 'medium' ? 'Moyen' : 'Élevé'}
                          </span>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setPositionModal({ isOpen: true, mode: 'view', position })}
                              className="p-2 text-neutral-400 hover:text-[#6A8A82] transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setPositionModal({ isOpen: true, mode: 'edit', position })}
                              className="p-2 text-neutral-400 hover:text-green-600 transition-colors"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </UnifiedCard>

        {/* Position Detail Modal */}
        {positionModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-neutral-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-neutral-800">
                    {positionModal.mode === 'create' ? 'Nouveau Compte' :
                     positionModal.mode === 'edit' ? 'Modifier le Compte' : 'Détails du Compte'}
                  </h3>
                  <button
                    onClick={() => setPositionModal({ isOpen: false, mode: 'view' })}
                    className="p-2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {positionModal.position && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Banque
                          </label>
                          <p className="text-neutral-800 font-semibold">{positionModal.position.bankName}</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            IBAN
                          </label>
                          <p className="text-neutral-800 font-mono text-sm">{positionModal.position.iban}</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            BIC/SWIFT
                          </label>
                          <p className="text-neutral-800">{positionModal.position.bic}</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Agence
                          </label>
                          <p className="text-neutral-800">{positionModal.position.branch}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Solde
                          </label>
                          <p className="text-neutral-800 font-bold text-lg">
                            {formatCurrency(positionModal.position.balance, positionModal.position.currency)}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Solde Disponible
                          </label>
                          <p className="text-neutral-800 font-semibold">
                            {formatCurrency(positionModal.position.availableBalance, positionModal.position.currency)}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Dernière Mise à Jour
                          </label>
                          <p className="text-neutral-800">{formatDate(positionModal.position.lastUpdate)}</p>
                        </div>

                        <div className="flex space-x-4">
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              Statut
                            </label>
                            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(positionModal.position.status)}`}>
                              {positionModal.position.status === 'active' ? 'Actif' :
                               positionModal.position.status === 'inactive' ? 'Inactif' : 'Gelé'}
                            </span>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              Niveau de Risque
                            </label>
                            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getRiskColor(positionModal.position.riskLevel)}`}>
                              {positionModal.position.riskLevel === 'low' ? 'Faible' :
                               positionModal.position.riskLevel === 'medium' ? 'Moyen' : 'Élevé'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-200">
                  <ElegantButton
                    variant="outline"
                    onClick={() => setPositionModal({ isOpen: false, mode: 'view' })}
                  >
                    {positionModal.mode === 'view' ? 'Fermer' : 'Annuler'}
                  </ElegantButton>
                  {positionModal.mode !== 'view' && (
                    <ElegantButton variant="primary">
                      {positionModal.mode === 'create' ? 'Créer' : 'Sauvegarder'}
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

export default TreasuryPositions;