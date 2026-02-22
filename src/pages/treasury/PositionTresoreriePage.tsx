import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { motion } from 'framer-motion';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  BarChart3,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Building2,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  balance: number;
  currency: string;
  lastUpdate: Date;
  status: 'active' | 'inactive';
}

interface CashFlowItem {
  id: string;
  type: 'inflow' | 'outflow';
  description: string;
  amount: number;
  date: Date;
  category: string;
  status: 'confirmed' | 'estimated';
}

interface TreasuryPosition {
  totalCash: number;
  dailyVariation: number;
  weeklyForecast: number;
  monthlyForecast: number;
  accounts: BankAccount[];
  todayMovements: CashFlowItem[];
}

const PositionTresoreriePage: React.FC = () => {
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Live Dexie queries
  const exchangeRatesData = useLiveQuery(() => db.exchangeRates.toArray()) || [];
  const hedgingPositionsData = useLiveQuery(() => db.hedgingPositions.toArray()) || [];

  // Build the treasury position from Dexie data
  const position: TreasuryPosition = useMemo(() => {
    // Build bank accounts from hedging positions (using them as position proxies)
    const accounts: BankAccount[] = hedgingPositionsData.map((hp, index) => ({
      id: hp.id,
      bankName: hp.type.charAt(0).toUpperCase() + hp.type.slice(1) + ' - ' + hp.currency,
      accountNumber: '****-' + hp.id.slice(-4),
      balance: hp.amount,
      currency: hp.currency,
      lastUpdate: new Date(hp.createdAt),
      status: hp.status === 'active' ? 'active' as const : 'inactive' as const
    }));

    const totalCash = accounts.reduce((sum, a) => sum + a.balance, 0);

    return {
      totalCash,
      dailyVariation: hedgingPositionsData.reduce((sum, hp) => sum + hp.unrealizedPnL, 0),
      weeklyForecast: 0,
      monthlyForecast: 0,
      accounts,
      todayMovements: []
    };
  }, [hedgingPositionsData]);

  // Dummy refresh function for the button
  const loadTreasuryPosition = () => {
    // Data is live via useLiveQuery; no manual fetch needed
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-6">
        {/* En-tête */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900 mb-2 flex items-center">
                <Wallet className="h-8 w-8 text-[#171717] mr-3" />
                Position Trésorerie Temps Réel
              </h1>
              <p className="text-gray-600">
                Suivi en temps réel de la position de trésorerie consolidée
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4 text-[#171717] rounded"
                />
                <span className="text-sm text-gray-600">Auto-refresh</span>
              </div>
              <button
                onClick={loadTreasuryPosition}
                className="p-2 text-gray-600 hover:text-[#171717] transition-colors" aria-label="Actualiser">
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Position globale */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <h3 className="text-lg font-medium opacity-90 mb-2">Position Totale</h3>
              <p className="text-lg font-bold">
                {position.totalCash.toLocaleString()} XOF
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium opacity-90 mb-2">Variation Jour</h3>
              <div className="flex items-center">
                {position.dailyVariation > 0 ? (
                  <ArrowUpRight className="h-6 w-6 text-green-300 mr-2" />
                ) : (
                  <ArrowDownRight className="h-6 w-6 text-red-300 mr-2" />
                )}
                <p className="text-lg font-bold">
                  {Math.abs(position.dailyVariation).toLocaleString()} XOF
                </p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium opacity-90 mb-2">Prévision 7j</h3>
              <div className="flex items-center">
                {position.weeklyForecast > 0 ? (
                  <ArrowUpRight className="h-6 w-6 text-green-300 mr-2" />
                ) : (
                  <ArrowDownRight className="h-6 w-6 text-red-300 mr-2" />
                )}
                <p className="text-lg font-bold">
                  {Math.abs(position.weeklyForecast).toLocaleString()} XOF
                </p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium opacity-90 mb-2">Prévision 30j</h3>
              <div className="flex items-center">
                {position.monthlyForecast > 0 ? (
                  <ArrowUpRight className="h-6 w-6 text-green-300 mr-2" />
                ) : (
                  <ArrowDownRight className="h-6 w-6 text-red-300 mr-2" />
                )}
                <p className="text-lg font-bold">
                  {Math.abs(position.monthlyForecast).toLocaleString()} XOF
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Comptes bancaires */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Comptes Bancaires</h2>
            </div>
            
            <div className="p-6 space-y-4">
              {position.accounts.map((account, index) => (
                <motion.div
                  key={account.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-[#171717]/10 rounded-lg flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-[#171717]" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{account.bankName}</h4>
                        <p className="text-sm text-gray-600">{account.accountNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {account.balance.toLocaleString()} {account.currency}
                      </p>
                      <p className="text-xs text-gray-700">
                        MAJ: {account.lastUpdate.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Mouvements du jour */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Mouvements du Jour</h2>
            </div>
            
            <div className="p-6 space-y-3">
              {position.todayMovements.map((movement, index) => (
                <motion.div
                  key={movement.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      movement.type === 'inflow' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {movement.type === 'inflow' ? (
                        <ArrowUpRight className="h-4 w-4 text-green-600" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{movement.description}</p>
                      <p className="text-sm text-gray-600">{movement.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      movement.type === 'inflow' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {movement.type === 'inflow' ? '+' : '-'}{movement.amount.toLocaleString()} XOF
                    </p>
                    <p className="text-xs text-gray-700">
                      {movement.date.toLocaleTimeString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PositionTresoreriePage;