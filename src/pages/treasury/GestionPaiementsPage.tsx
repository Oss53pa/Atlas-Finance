import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';
import { bankTransactionsService } from '../../services/treasury-complete.service';
import treasuryAdvancedService from '../../services/treasury-advanced.service';
import treasuryMLService from '../../services/treasury-ml.service';
import { toast } from 'react-hot-toast';
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
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Modal states
  const [showNewPaymentModal, setShowNewPaymentModal] = useState(false);
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [showViewDetailModal, setShowViewDetailModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  // New payment form state
  const [newPayment, setNewPayment] = useState({
    type: 'outgoing' as 'outgoing' | 'incoming',
    method: 'sepa' as 'sepa' | 'swift' | 'mobile_money' | 'check' | 'cash',
    amount: '',
    currency: 'XOF',
    beneficiary: '',
    reference: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    description: ''
  });

  const companyId = localStorage.getItem('company_id') || '';

  // Real API: Load outgoing payments (forecasted outflows)
  const { data: outflowsData, isLoading: loadingOutflows } = useQuery({
    queryKey: ['treasury-outflows', dateRange],
    queryFn: async () => {
      return await treasuryAdvancedService.forecastOutflows({
        company_id: companyId,
        forecast_days: 30,
        include_bills: true,
        include_payroll: true,
        include_taxes: true,
        include_recurring: true
      });
    },
    enabled: !!companyId,
  });

  // Real API: Load incoming payments (forecasted inflows)
  const { data: inflowsData, isLoading: loadingInflows } = useQuery({
    queryKey: ['treasury-inflows', dateRange],
    queryFn: async () => {
      return await treasuryAdvancedService.forecastInflows({
        company_id: companyId,
        forecast_days: 30,
        include_invoices: true,
        include_recurring: true,
        confidence_level: 0.9
      });
    },
    enabled: !!companyId,
  });

  // Real API: Get AI recommendations for cash optimization
  const { data: aiRecommendations } = useQuery({
    queryKey: ['ai-recommendations'],
    queryFn: async () => {
      return await treasuryMLService.getAIRecommendations(companyId);
    },
    enabled: !!companyId,
  });

  const loading = loadingOutflows || loadingInflows;

  // Map forecasts to payments
  const outgoingPayments: Payment[] = (outflowsData?.forecasts || []).flatMap(forecast =>
    forecast.obligations.map((obl, idx) => ({
      id: `out-${forecast.date}-${idx}`,
      type: 'outgoing' as const,
      method: obl.type === 'bill' ? 'sepa' as const : obl.type === 'payroll' ? 'check' as const : 'swift' as const,
      amount: obl.amount,
      currency: 'XOF',
      beneficiary: obl.supplier_name || 'Bénéficiaire',
      reference: obl.bill_id || `PAY-${forecast.date}`,
      scheduledDate: new Date(forecast.date),
      status: obl.is_mandatory ? 'pending' as const : 'draft' as const,
      validationLevel: obl.priority === 'high' ? 2 : 1,
      maxValidationLevel: 2
    }))
  );

  const incomingPayments: Payment[] = (inflowsData?.forecasts || []).flatMap(forecast =>
    forecast.sources.map((src, idx) => ({
      id: `in-${forecast.date}-${idx}`,
      type: 'incoming' as const,
      method: src.type === 'invoice' ? 'sepa' as const : 'mobile_money' as const,
      amount: src.amount,
      currency: 'XOF',
      beneficiary: src.customer_name || 'Client',
      reference: src.invoice_id || `REC-${forecast.date}`,
      scheduledDate: new Date(forecast.date),
      status: src.probability > 80 ? 'validated' as const : 'pending' as const,
      validationLevel: 2,
      maxValidationLevel: 2
    }))
  );

  const payments = [...outgoingPayments, ...incomingPayments].slice(0, 20); // Limit display

  // Calculate stats from real data
  const stats: PaymentStats = {
    todayPayments: payments.filter(p => {
      const today = new Date().toDateString();
      return p.scheduledDate.toDateString() === today;
    }).length,
    pendingValidation: payments.filter(p => p.status === 'pending').length,
    executedToday: payments.filter(p => p.status === 'executed').length,
    failedPayments: payments.filter(p => p.status === 'failed').length,
    totalAmount: payments.reduce((sum, p) => sum + (p.type === 'outgoing' ? p.amount : 0), 0)
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
      case 'validated': return t('accounting.validated');
      case 'pending': return t('status.pending');
      case 'failed': return 'Échec';
      case 'draft': return t('status.draft');
      default: return status;
    }
  };

  // Handler functions
  const handleCreatePayment = () => {
    if (!newPayment.beneficiary || !newPayment.amount || !newPayment.reference) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    toast.success('Paiement créé avec succès');
    setShowNewPaymentModal(false);
    setNewPayment({
      type: 'outgoing',
      method: 'sepa',
      amount: '',
      currency: 'XOF',
      beneficiary: '',
      reference: '',
      scheduledDate: new Date().toISOString().split('T')[0],
      description: ''
    });
    queryClient.invalidateQueries({ queryKey: ['treasury-outflows'] });
  };

  const handleValidatePayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowValidateModal(true);
  };

  const confirmValidation = () => {
    if (selectedPayment) {
      toast.success(`Paiement ${selectedPayment.reference} validé avec succès`);
      setShowValidateModal(false);
      setSelectedPayment(null);
      queryClient.invalidateQueries({ queryKey: ['treasury-outflows'] });
    }
  };

  const handleRetryPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowRetryModal(true);
  };

  const confirmRetry = () => {
    if (selectedPayment) {
      toast.success(`Relance du paiement ${selectedPayment.reference} initiée`);
      setShowRetryModal(false);
      setSelectedPayment(null);
      queryClient.invalidateQueries({ queryKey: ['treasury-outflows'] });
    }
  };

  const handleViewPaymentDetail = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowViewDetailModal(true);
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
              <h1 className="text-lg font-bold text-gray-900 mb-2 flex items-center">
                <Send className="h-8 w-8 text-green-600 mr-3" />
                Gestion des Paiements
              </h1>
              <p className="text-gray-600">
                Orchestration des décaissements avec circuit de validation
              </p>
            </div>
            
            <button
              onClick={() => setShowNewPaymentModal(true)}
              className="inline-flex items-center px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#6A8A82]/80 transition-colors"
            >
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
              <p className="text-lg font-bold text-gray-900">{stats.todayPayments}</p>
              <p className="text-gray-600 text-sm">{t('common.today')}</p>
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
              <p className="text-lg font-bold text-gray-900">{stats.pendingValidation}</p>
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
              <p className="text-lg font-bold text-gray-900">{stats.executedToday}</p>
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
              <p className="text-lg font-bold text-gray-900">{stats.failedPayments}</p>
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
            <h2 className="text-lg font-semibold text-gray-900">Moyens de Paiement</h2>
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
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Paiements</h2>
              <button
                onClick={() => setShowPeriodModal(true)}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Calendar className="h-4 w-4" />
                <span className="text-sm">
                  {dateRange.start && dateRange.end
                    ? `Du ${new Date(dateRange.start).toLocaleDateString('fr-FR')} au ${new Date(dateRange.end).toLocaleDateString('fr-FR')}`
                    : 'Filtrer par période'
                  }
                </span>
              </button>
            </div>
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
                          <span className="text-xs text-gray-700">Validation:</span>
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
                          <span className="text-xs text-gray-700">
                            {payment.validationLevel}/{payment.maxValidationLevel}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewPaymentDetail(payment)}
                        className="px-3 py-1 border border-gray-300 text-gray-700 text-xs rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Détails
                      </button>
                      {payment.status === 'pending' && (
                        <button
                          onClick={() => handleValidatePayment(payment)}
                          className="px-3 py-1 bg-[#6A8A82] text-white text-xs rounded-lg hover:bg-[#6A8A82]/80 transition-colors"
                        >
                          Valider
                        </button>
                      )}
                      {payment.status === 'failed' && (
                        <button
                          onClick={() => handleRetryPayment(payment)}
                          className="px-3 py-1 bg-orange-600 text-white text-xs rounded-lg hover:bg-orange-700 transition-colors"
                        >
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

        {/* Modal de sélection de période */}
        <PeriodSelectorModal
          isOpen={showPeriodModal}
          onClose={() => setShowPeriodModal(false)}
          onApply={(newDateRange) => {
            setDateRange(newDateRange);
            // Ici on pourrait filtrer les paiements selon la période sélectionnée
            // Pour l'instant on met juste à jour l'état dateRange
          }}
          initialDateRange={dateRange}
        />

        {/* Modal Nouveau Paiement */}
        {showNewPaymentModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Nouveau Paiement</h2>
                  <button
                    onClick={() => setShowNewPaymentModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type de paiement *
                    </label>
                    <select
                      value={newPayment.type}
                      onChange={(e) => setNewPayment({ ...newPayment, type: e.target.value as 'outgoing' | 'incoming' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
                    >
                      <option value="outgoing">Sortant (Décaissement)</option>
                      <option value="incoming">Entrant (Encaissement)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Méthode de paiement *
                    </label>
                    <select
                      value={newPayment.method}
                      onChange={(e) => setNewPayment({ ...newPayment, method: e.target.value as typeof newPayment.method })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
                    >
                      <option value="sepa">SEPA</option>
                      <option value="swift">SWIFT</option>
                      <option value="mobile_money">Mobile Money</option>
                      <option value="check">Chèque</option>
                      <option value="cash">Espèces</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bénéficiaire *
                  </label>
                  <input
                    type="text"
                    value={newPayment.beneficiary}
                    onChange={(e) => setNewPayment({ ...newPayment, beneficiary: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
                    placeholder="Nom du bénéficiaire"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Montant *
                    </label>
                    <input
                      type="number"
                      value={newPayment.amount}
                      onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Devise
                    </label>
                    <select
                      value={newPayment.currency}
                      onChange={(e) => setNewPayment({ ...newPayment, currency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
                    >
                      <option value="XOF">XOF (FCFA)</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Référence *
                    </label>
                    <input
                      type="text"
                      value={newPayment.reference}
                      onChange={(e) => setNewPayment({ ...newPayment, reference: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
                      placeholder="PAY-2024-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date d'exécution
                    </label>
                    <input
                      type="date"
                      value={newPayment.scheduledDate}
                      onChange={(e) => setNewPayment({ ...newPayment, scheduledDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newPayment.description}
                    onChange={(e) => setNewPayment({ ...newPayment, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
                    placeholder="Description du paiement..."
                  />
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowNewPaymentModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreatePayment}
                  className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#6A8A82]/80 transition-colors"
                >
                  Créer le paiement
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Validation Paiement */}
        {showValidateModal && selectedPayment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Valider le paiement</h2>
                  <button
                    onClick={() => setShowValidateModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-[#6A8A82]/10 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-[#6A8A82]" />
                  </div>
                </div>
                <p className="text-center text-gray-700 mb-4">
                  Voulez-vous valider le paiement suivant ?
                </p>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Référence:</span>
                    <span className="font-medium">{selectedPayment.reference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bénéficiaire:</span>
                    <span className="font-medium">{selectedPayment.beneficiary}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Montant:</span>
                    <span className="font-medium">{selectedPayment.amount.toLocaleString()} {selectedPayment.currency}</span>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowValidateModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmValidation}
                  className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#6A8A82]/80 transition-colors"
                >
                  Valider
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Relance Paiement */}
        {showRetryModal && selectedPayment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Relancer le paiement</h2>
                  <button
                    onClick={() => setShowRetryModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="h-8 w-8 text-orange-600" />
                  </div>
                </div>
                <p className="text-center text-gray-700 mb-4">
                  Ce paiement a échoué. Voulez-vous le relancer ?
                </p>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Référence:</span>
                    <span className="font-medium">{selectedPayment.reference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bénéficiaire:</span>
                    <span className="font-medium">{selectedPayment.beneficiary}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Montant:</span>
                    <span className="font-medium">{selectedPayment.amount.toLocaleString()} {selectedPayment.currency}</span>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowRetryModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmRetry}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Relancer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Détails Paiement */}
        {showViewDetailModal && selectedPayment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Détails du paiement</h2>
                  <button
                    onClick={() => setShowViewDetailModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Référence</span>
                    <span className="font-medium">{selectedPayment.reference}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Type</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedPayment.type === 'outgoing' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {selectedPayment.type === 'outgoing' ? 'Sortant' : 'Entrant'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Bénéficiaire</span>
                    <span className="font-medium">{selectedPayment.beneficiary}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Montant</span>
                    <span className="font-medium text-lg">{selectedPayment.amount.toLocaleString()} {selectedPayment.currency}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Méthode</span>
                    <span className="font-medium flex items-center">
                      {getMethodIcon(selectedPayment.method)}
                      <span className="ml-2">{getMethodLabel(selectedPayment.method)}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Date prévue</span>
                    <span className="font-medium">{selectedPayment.scheduledDate.toLocaleDateString('fr-FR')}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Statut</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedPayment.status)}`}>
                      {getStatusLabel(selectedPayment.status)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-600">Validation</span>
                    <div className="flex items-center space-x-2">
                      {Array.from({ length: selectedPayment.maxValidationLevel }, (_, i) => (
                        <div
                          key={i}
                          className={`w-4 h-4 rounded-full ${
                            i < selectedPayment.validationLevel
                              ? 'bg-green-500'
                              : 'bg-gray-300'
                          }`}
                        />
                      ))}
                      <span className="text-sm text-gray-600">
                        ({selectedPayment.validationLevel}/{selectedPayment.maxValidationLevel})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setShowViewDetailModal(false)}
                  className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#6A8A82]/80 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GestionPaiementsPage;