import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Calendar,
  Building2,
  Smartphone,
  Globe,
  Shield,
  Target,
  BarChart3
} from 'lucide-react';

interface Payment {
  id: string;
  type: 'outgoing' | 'incoming';
  method: 'sepa' | 'swift' | 'mobile_money' | 'check' | 'cash';
  amount: number;
  currency: string;
  beneficiary: string;
  reference: string;
  scheduledDate: Date;
  status: 'draft' | 'pending' | 'validated' | 'executed' | 'failed';
  validationLevel: number;
  maxValidationLevel: number;
}

interface PaymentStats {
  todayPayments: number;
  pendingValidation: number;
  executedToday: number;
  failedPayments: number;
  totalAmount: number;
}

const GestionPaiementsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    todayPayments: 0,
    pendingValidation: 0,
    executedToday: 0,
    failedPayments: 0,
    totalAmount: 0
  });
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPaymentData();
  }, []);

  const loadPaymentData = async () => {
    // Simulation de données
    const mockPayments: Payment[] = [
      {
        id: '1',
        type: 'outgoing',
        method: 'sepa',
        amount: 850000,
        currency: 'XOF',
        beneficiary: 'Supplier ABC',
        reference: 'VIREMENT-001',
        scheduledDate: new Date(),
        status: 'pending',
        validationLevel: 1,
        maxValidationLevel: 2
      },
      {
        id: '2',
        type: 'incoming',
        method: 'mobile_money',
        amount: 250000,
        currency: 'XOF',
        beneficiary: 'Client XYZ',
        reference: 'MOMO-001',
        scheduledDate: new Date(),
        status: 'executed',
        validationLevel: 2,
        maxValidationLevel: 2
      }
    ];

    const mockStats: PaymentStats = {
      todayPayments: 15,
      pendingValidation: 8,
      executedToday: 12,
      failedPayments: 2,
      totalAmount: 12600000
    };

    setPayments(mockPayments);
    setStats(mockStats);
    setLoading(false);
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'sepa': return <Globe className="h-4 w-4" />;
      case 'swift': return <Building2 className="h-4 w-4" />;
      case 'mobile_money': return <Smartphone className="h-4 w-4" />;
      case 'check': return <CreditCard className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'sepa': return 'SEPA';
      case 'swift': return 'SWIFT';
      case 'mobile_money': return 'Mobile Money';
      case 'check': return 'Chèque';
      case 'cash': return 'Espèces';
      default: return method;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'executed': return 'text-green-600 bg-green-100';
      case 'validated': return 'text-[#6A8A82] bg-[#6A8A82]/10';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'executed': return 'Exécuté';
      case 'validated': return 'Validé';
      case 'pending': return 'En attente';
      case 'failed': return 'Échec';
      case 'draft': return 'Brouillon';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6A8A82]"></div>
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                <Send className="h-8 w-8 text-green-600 mr-3" />
                Gestion des Paiements
              </h1>
              <p className="text-gray-600">
                Orchestration des décaissements avec circuit de validation
              </p>
            </div>
            
            <button className="inline-flex items-center px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#6A8A82]/80 transition-colors">
              <Send className="h-4 w-4 mr-2" />
              Nouveau paiement
            </button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-[#6A8A82]/10 rounded-lg">
                <Calendar className="h-6 w-6 text-[#6A8A82]" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.todayPayments}</p>
              <p className="text-gray-600 text-sm">Aujourd'hui</p>
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
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingValidation}</p>
              <p className="text-gray-600 text-sm">En validation</p>
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
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.executedToday}</p>
              <p className="text-gray-600 text-sm">Exécutés</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.failedPayments}</p>
              <p className="text-gray-600 text-sm">Échecs</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">
                {stats.totalAmount.toLocaleString()}
              </p>
              <p className="text-gray-600 text-sm">XOF traités</p>
            </div>
          </motion.div>
        </div>

        {/* Moyens de paiement */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Moyens de Paiement</h2>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              {[
                { id: 'all', name: 'Tous', icon: BarChart3, color: 'gray' },
                { id: 'sepa', name: 'SEPA', icon: Globe, color: 'blue' },
                { id: 'swift', name: 'SWIFT', icon: Building2, color: 'green' },
                { id: 'mobile_money', name: 'Mobile Money', icon: Smartphone, color: 'purple' },
                { id: 'check', name: 'Chèques', icon: CreditCard, color: 'orange' }
              ].map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`p-4 rounded-lg border transition-all ${
                      selectedMethod === method.id
                        ? `border-${method.color}-500 bg-${method.color}-50`
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-center">
                      <Icon className={`h-6 w-6 mx-auto mb-2 ${
                        selectedMethod === method.id ? `text-${method.color}-600` : 'text-gray-600'
                      }`} />
                      <p className="text-sm font-medium text-gray-900">{method.name}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Liste des paiements */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Paiements</h2>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {payments.map((payment, index) => (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        payment.type === 'outgoing' ? 'bg-red-100' : 'bg-green-100'
                      }`}>
                        {getMethodIcon(payment.method)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium text-gray-900">
                            {payment.reference}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            payment.type === 'outgoing' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {payment.type === 'outgoing' ? 'Sortant' : 'Entrant'}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                            {getStatusLabel(payment.status)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>{payment.beneficiary}</span>
                          <span className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            {payment.amount.toLocaleString()} {payment.currency}
                          </span>
                          <span className="flex items-center">
                            {getMethodIcon(payment.method)}
                            <span className="ml-1">{getMethodLabel(payment.method)}</span>
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {payment.scheduledDate.toLocaleDateString()}
                          </span>
                        </div>
                        
                        {/* Circuit de validation */}
                        <div className="mt-3 flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Validation:</span>
                          {Array.from({ length: payment.maxValidationLevel }, (_, i) => (
                            <div
                              key={i}
                              className={`w-3 h-3 rounded-full ${
                                i < payment.validationLevel
                                  ? 'bg-green-500'
                                  : 'bg-gray-300'
                              }`}
                            />
                          ))}
                          <span className="text-xs text-gray-500">
                            {payment.validationLevel}/{payment.maxValidationLevel}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {payment.status === 'pending' && (
                        <button className="px-3 py-1 bg-[#6A8A82] text-white text-xs rounded-lg hover:bg-[#6A8A82]/80 transition-colors">
                          Valider
                        </button>
                      )}
                      {payment.status === 'failed' && (
                        <button className="px-3 py-1 bg-orange-600 text-white text-xs rounded-lg hover:bg-orange-700 transition-colors">
                          Relancer
                        </button>
                      )}
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

export default GestionPaiementsPage;