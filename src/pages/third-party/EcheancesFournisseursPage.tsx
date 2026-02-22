import { formatCurrency } from '@/utils/formatters';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  DollarSign,
  Calendar,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  Target,
  BarChart3,
  Building2,
  CreditCard,
  Percent,
  Calculator
} from 'lucide-react';

interface SupplierPayment {
  id: string;
  supplierName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: Date;
  daysUntilDue: number;
  discountRate?: number;
  discountDeadline?: Date;
  priority: 'high' | 'medium' | 'low';
  paymentTerms: string;
}

interface PaymentStats {
  totalDue: number;
  dueThisWeek: number;
  overdueAmount: number;
  avgDPO: number;
  discountOpportunities: number;
  potentialSavings: number;
}

const EcheancesFournisseursPage: React.FC = () => {
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    totalDue: 0,
    dueThisWeek: 0,
    overdueAmount: 0,
    avgDPO: 0,
    discountOpportunities: 0,
    potentialSavings: 0
  });
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPaymentData();
  }, []);

  const loadPaymentData = async () => {
    // Simulation de données
    setPayments([]);
    setStats({ totalDue: 0, dueThisWeek: 0, overdueAmount: 0, avgDPO: 0, discountOpportunities: 0, potentialSavings: 0 });
    setLoading(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Urgent';
      case 'medium': return 'Moyen';
      case 'low': return 'Faible';
      default: return priority;
    }
  };

  const getDueDateColor = (daysUntilDue: number) => {
    if (daysUntilDue < 0) return 'text-red-600';
    if (daysUntilDue <= 3) return 'text-yellow-600';
    return 'text-green-600';
  };

  const togglePaymentSelection = (paymentId: string) => {
    setSelectedPayments(prev => {
      if (prev.includes(paymentId)) {
        return prev.filter(id => id !== paymentId);
      } else {
        return [...prev, paymentId];
      }
    });
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
                <Clock className="h-8 w-8 text-orange-600 mr-3" />
                Échéances Fournisseurs
              </h1>
              <p className="text-gray-600">
                Optimisation des paiements et capture des escomptes
              </p>
            </div>
            
            {selectedPayments.length > 0 && (
              <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <CreditCard className="h-4 w-4 mr-2" />
                Programmer paiement ({selectedPayments.length})
              </button>
            )}
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(stats.totalDue)} XOF
              </p>
              <p className="text-gray-600 text-sm">Total à payer</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Calendar className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(stats.dueThisWeek)} XOF
              </p>
              <p className="text-gray-600 text-sm">Échéances 7 jours</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Percent className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(stats.potentialSavings)} XOF
              </p>
              <p className="text-gray-600 text-sm">Économies escomptes</p>
            </div>
          </motion.div>
        </div>

        {/* Opportunités d'escompte */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-500 rounded-lg">
                <Percent className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-900">
                  {stats.discountOpportunities} opportunités d'escompte disponibles
                </h3>
                <p className="text-green-700">
                  Économies potentielles: {formatCurrency(stats.potentialSavings)} XOF
                </p>
              </div>
            </div>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              Voir détails
            </button>
          </div>
        </div>

        {/* Liste des échéances */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Échéances à venir</h2>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {payments.map((payment, index) => (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedPayments.includes(payment.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => togglePaymentSelection(payment.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-semibold text-gray-900">
                            {payment.supplierName}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(payment.priority)}`}>
                            {getPriorityLabel(payment.priority)}
                          </span>
                          {payment.discountRate && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Escompte {payment.discountRate}%
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>{payment.invoiceNumber}</span>
                          <span className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            {formatCurrency(payment.amount)} XOF
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {payment.dueDate.toLocaleDateString()}
                          </span>
                          <span className={`font-medium ${getDueDateColor(payment.daysUntilDue)}`}>
                            {payment.daysUntilDue < 0 ? 
                              `${Math.abs(payment.daysUntilDue)} jours de retard` :
                              `${payment.daysUntilDue} jours restants`
                            }
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-gray-700">
                          Conditions: {payment.paymentTerms}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {payment.discountRate && payment.discountDeadline && (
                        <div className="text-right">
                          <div className="text-sm font-medium text-green-600">
                            -{formatCurrency(Math.round(payment.amount * payment.discountRate / 100))} XOF
                          </div>
                          <div className="text-xs text-gray-700">
                            si payé avant {payment.discountDeadline.toLocaleDateString()}
                          </div>
                        </div>
                      )}
                      <input
                        type="checkbox"
                        checked={selectedPayments.includes(payment.id)}
                        onChange={() => togglePaymentSelection(payment.id)}
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

export default EcheancesFournisseursPage;