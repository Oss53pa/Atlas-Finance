import { formatCurrency } from '@/utils/formatters';
import React, { useState, useEffect, useMemo } from 'react';
import PageHeaderActions from '../../components/ui/PageHeaderActions';
import { useData } from '../../contexts/DataContext';
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
  const { adapter } = useData();
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [journalEntriesData, setJournalEntriesData] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = async () => {
    const entries = await adapter.getAll('journalEntries');
    setJournalEntriesData(entries as Record<string, unknown>[]);
  };

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, refreshKey]);

  // Build the treasury position from journal entries (class 5 accounts = trésorerie)
  const position: TreasuryPosition = useMemo(() => {
    // Build per-account balances for class 5 accounts from journal entries
    const accountBalances: Record<string, { balance: number; name: string }> = {};

    // Compute real cash balance from posted journal entries (class 5)
    let totalCash = 0;
    const today = new Date().toDateString();
    let dailyVariation = 0;
    const todayMovements: CashFlowItem[] = [];

    // Écritures comptabilisées = 'validated' (ou 'posted'). NE PAS filtrer 'posted' seul
    // (le tenant n'a que des 'validated' → toute la page tombait à 0).
    const postedEntries = journalEntriesData.filter((e: any) => e.status !== 'draft');

    for (const entry of postedEntries) {
      if (!entry.lines) continue;
      const jnl = String(entry.journal || '').toUpperCase();
      if (jnl === 'AN' || jnl === 'RAN') { /* À Nouveau : compte dans le solde mais pas dans la variation du jour */ }
      for (const line of entry.lines) {
        // Trésorerie = classe 5 HORS 58 (virements internes) et 59 (dépréciations).
        if (line.accountCode?.startsWith('5') && !line.accountCode?.startsWith('58') && !line.accountCode?.startsWith('59')) {
          const net = (line.debit || 0) - (line.credit || 0);
          totalCash += net;
          // Accumulate per-account balance
          if (!accountBalances[line.accountCode]) {
            accountBalances[line.accountCode] = { balance: 0, name: line.accountName || line.accountCode };
          }
          accountBalances[line.accountCode].balance += net;
          if (new Date(entry.date).toDateString() === today) {
            dailyVariation += net;
            if (Math.abs(net) > 0) {
              todayMovements.push({
                id: `${entry.id}-${line.id}`,
                type: net > 0 ? 'inflow' : 'outflow',
                description: entry.label || line.label || '-',
                amount: Math.abs(net),
                date: new Date(entry.date),
                category: line.accountCode || '5',
                status: 'confirmed',
              });
            }
          }
        }
      }
    }

    // Compute basic 7-day and 30-day forecasts from average daily cash movements
    const last30Days = postedEntries.filter((e: any) => {
      const d = new Date(e.date);
      const ago30 = new Date(Date.now() - 30 * 86400000);
      return d >= ago30;
    });
    let dailyAvg = 0;
    if (last30Days.length > 0) {
      let sum30 = 0;
      for (const entry of last30Days) {
        if (!entry.lines) continue;
        for (const line of entry.lines) {
          if (line.accountCode?.startsWith('5')) {
            sum30 += (line.debit || 0) - (line.credit || 0);
          }
        }
      }
      dailyAvg = sum30 / 30;
    }

    // Build sorted BankAccount list from accumulated balances
    const accounts: BankAccount[] = Object.entries(accountBalances)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([code, { balance, name }]) => ({
        id: code,
        bankName: name,
        accountNumber: code,
        balance,
        currency: 'XAF',
        lastUpdate: new Date(),
        status: 'active' as const,
      }));

    return {
      totalCash,
      dailyVariation,
      weeklyForecast: Math.round(dailyAvg * 7),
      monthlyForecast: Math.round(dailyAvg * 30),
      accounts,
      todayMovements,
    };
  }, [journalEntriesData]);

  // Actualiser button reloads data from adapter
  const loadTreasuryPosition = () => {
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="min-h-full bg-primary-50">
      <div className="container mx-auto px-4 py-6">
        {/* En-tête */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900 mb-2 flex items-center">
                <Wallet className="h-8 w-8 text-[var(--color-primary)] mr-3" />
                Position Trésorerie Temps Réel
              </h1>
              <p className="text-gray-600">
                Suivi en temps réel de la position de trésorerie consolidée
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <PageHeaderActions />
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4 text-[var(--color-primary)] rounded"
                />
                <span className="text-sm text-gray-600">Auto-refresh</span>
              </div>
              <button
                onClick={loadTreasuryPosition}
                className="p-2 text-gray-600 hover:text-[var(--color-primary)] transition-colors" aria-label="Actualiser">
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Position globale */}
        <div className="bg-gradient-to-r from-blue-600 to-primary-600 rounded-xl text-white p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <h3 className="text-lg font-medium opacity-90 mb-2">Position Totale</h3>
              <p className="text-lg font-bold">
                {formatCurrency(position.totalCash)} XOF
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
                  {formatCurrency(Math.abs(position.dailyVariation))} XOF
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
                  {formatCurrency(Math.abs(position.weeklyForecast))} XOF
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
                  {formatCurrency(Math.abs(position.monthlyForecast))} XOF
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
              {position.accounts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Aucun compte bancaire configuré</p>
                  <p className="text-xs mt-1 text-gray-400">Les comptes seront affichés ici une fois enregistrés</p>
                </div>
              )}
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
                      <div className="w-10 h-10 bg-[var(--color-primary)]/10 rounded-lg flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-[var(--color-primary)]" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{account.bankName}</h4>
                        <p className="text-sm text-gray-600">{account.accountNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(account.balance)}
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
                      {movement.type === 'inflow' ? '+' : '-'}{formatCurrency(movement.amount)} XOF
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