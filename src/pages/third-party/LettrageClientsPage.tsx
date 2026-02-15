import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Link,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Calendar,
  Target,
  AlertTriangle,
  Zap,
  BarChart3,
  RefreshCw
} from 'lucide-react';

interface LettrageTransaction {
  id: string;
  type: 'invoice' | 'payment';
  reference: string;
  amount: number;
  date: Date;
  customerName: string;
  status: 'unmatched' | 'matched' | 'partial';
  matchedWith?: string;
}

interface LettrageStats {
  totalTransactions: number;
  matchedTransactions: number;
  unmatchedAmount: number;
  partialMatches: number;
}

const LettrageClientsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<LettrageTransaction[]>([]);
  const [stats, setStats] = useState<LettrageStats>({
    totalTransactions: 0,
    matchedTransactions: 0,
    unmatchedAmount: 0,
    partialMatches: 0
  });
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLettrageData();
  }, []);

  const loadLettrageData = async () => {
    // Simulation de données
    const mockTransactions: LettrageTransaction[] = [
      {
        id: '1',
        type: 'invoice',
        reference: 'FAC-2024-001',
        amount: 250000,
        date: new Date('2024-01-15'),
        customerName: 'ABC Corporation',
        status: 'unmatched'
      },
      {
        id: '2',
        type: 'payment',
        reference: 'REG-2024-045',
        amount: 250000,
        date: new Date('2024-01-18'),
        customerName: 'ABC Corporation',
        status: 'unmatched'
      },
      {
        id: '3',
        type: 'invoice',
        reference: 'FAC-2024-002',
        amount: 150000,
        date: new Date('2024-01-20'),
        customerName: 'XYZ Industries',
        status: 'matched',
        matchedWith: 'REG-2024-046'
      }
    ];

    const mockStats: LettrageStats = {
      totalTransactions: 156,
      matchedTransactions: 89,
      unmatchedAmount: 2400000,
      partialMatches: 12
    };

    setTransactions(mockTransactions);
    setStats(mockStats);
    setLoading(false);
  };

  const handleManualMatch = () => {
    if (selectedTransactions.length === 2) {
      // Logique de lettrage manuel
      setSelectedTransactions([]);
    }
  };

  const toggleTransactionSelection = (transactionId: string) => {
    setSelectedTransactions(prev => {
      if (prev.includes(transactionId)) {
        return prev.filter(id => id !== transactionId);
      } else if (prev.length < 2) {
        return [...prev, transactionId];
      }
      return prev;
    });
  };

  const getTypeIcon = (type: string) => {
    return type === 'invoice' ? <FileText className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />;
  };

  const getTypeLabel = (type: string) => {
    return type === 'invoice' ? 'Facture' : 'Règlement';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'matched': return 'text-green-600 bg-green-100';
      case 'partial': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'matched': return 'Lettré';
      case 'partial': return 'Partiel';
      default: return 'Non lettré';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-6">
        {/* En-tête */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900 mb-2 flex items-center">
                <Link className="h-8 w-8 text-blue-600 mr-3" />
                Lettrage Clients
              </h1>
              <p className="text-gray-600">
                Rapprochement factures et règlements clients
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </button>
              <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Zap className="h-4 w-4 mr-2" />
                Lettrage auto
              </button>
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.totalTransactions}</p>
              <p className="text-gray-600 text-sm">Total transactions</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.matchedTransactions}</p>
              <p className="text-gray-600 text-sm">Transactions lettrées</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">
                {stats.unmatchedAmount.toLocaleString()} XOF
              </p>
              <p className="text-gray-600 text-sm">Montant non lettré</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Target className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.partialMatches}</p>
              <p className="text-gray-600 text-sm">Lettrages partiels</p>
            </div>
          </motion.div>
        </div>

        {/* Actions de lettrage manuel */}
        {selectedTransactions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Target className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">
                  {selectedTransactions.length} transaction(s) sélectionnée(s)
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleManualMatch}
                  disabled={selectedTransactions.length !== 2}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  Lettrer
                </button>
                <button
                  onClick={() => setSelectedTransactions([])}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Liste des transactions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Transactions</h2>
          </div>

          <div className="p-6">
            <div className="space-y-3">
              {transactions.map((transaction, index) => (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedTransactions.includes(transaction.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => toggleTransactionSelection(transaction.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          transaction.type === 'invoice' ? 'bg-blue-100' : 'bg-green-100'
                        }`}>
                          {transaction.type === 'invoice' ? (
                            <FileText className="h-5 w-5 text-blue-600" />
                          ) : (
                            <DollarSign className="h-5 w-5 text-green-600" />
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium text-gray-900">
                            {transaction.reference}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            transaction.type === 'invoice' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {getTypeLabel(transaction.type)}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                            {getStatusLabel(transaction.status)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>{transaction.customerName}</span>
                          <span className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            {transaction.amount.toLocaleString()} XOF
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {transaction.date.toLocaleDateString()}
                          </span>
                        </div>
                        {transaction.matchedWith && (
                          <div className="mt-2 text-sm text-green-600">
                            ↔ Lettré avec {transaction.matchedWith}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedTransactions.includes(transaction.id)}
                        onChange={() => toggleTransactionSelection(transaction.id)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                    </div>
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

export default LettrageClientsPage;