// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../hooks/useToast';
import type { DBPaymentOrder } from '../../lib/db';
import {
  createPaymentOrder,
  submitForApproval,
  approvePaymentOrder,
  executePaymentOrder,
  rejectPaymentOrder,
  getPaymentOrders,
} from '../../services/paymentOrderService';
import {
  Plus, Send, CheckCircle, XCircle, Play, Filter, X, Loader2,
} from 'lucide-react';

const COMPANY_ID = 'default';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount);

const STATUS_LABELS: Record<DBPaymentOrder['status'], string> = {
  draft: 'Brouillon',
  pending_approval: 'En attente',
  approved: 'Approuv\u00e9',
  executed: 'Ex\u00e9cut\u00e9',
  rejected: 'Rejet\u00e9',
  cancelled: 'Annul\u00e9',
};

const STATUS_COLORS: Record<DBPaymentOrder['status'], string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  pending_approval: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  executed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

const METHOD_LABELS: Record<DBPaymentOrder['paymentMethod'], string> = {
  bank_transfer: 'Virement',
  check: 'Ch\u00e8que',
  cash: 'Esp\u00e8ces',
  mobile_money: 'Mobile Money',
  card: 'Carte',
};

const BENEFICIARY_TYPE_LABELS: Record<DBPaymentOrder['beneficiaryType'], string> = {
  supplier: 'Fournisseur',
  employee: 'Employ\u00e9',
  tax_authority: 'Administration fiscale',
  social_fund: 'Organisme social',
  other: 'Autre',
};

const FILTER_STATUSES: Array<DBPaymentOrder['status'] | 'all'> = [
  'all', 'draft', 'pending_approval', 'approved', 'executed', 'rejected',
];

interface FormData {
  beneficiaryType: DBPaymentOrder['beneficiaryType'];
  beneficiaryName: string;
  amount: string;
  paymentMethod: DBPaymentOrder['paymentMethod'];
  reference: string;
  description: string;
}

const emptyForm: FormData = {
  beneficiaryType: 'supplier',
  beneficiaryName: '',
  amount: '',
  paymentMethod: 'bank_transfer',
  reference: '',
  description: '',
};

const PaymentOrdersPage: React.FC = () => {
  const { adapter } = useData();
  const { toast } = useToast();

  const [orders, setOrders] = useState<DBPaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<DBPaymentOrder['status'] | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const filters = filterStatus !== 'all' ? { status: filterStatus } : undefined;
      const data = await getPaymentOrders(adapter, COMPANY_ID, filters);
      data.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setOrders(data);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [adapter, filterStatus]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleCreate = async () => {
    if (!form.beneficiaryName.trim() || !form.amount) {
      toast.warning('Veuillez remplir le b\u00e9n\u00e9ficiaire et le montant');
      return;
    }
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.warning('Montant invalide');
      return;
    }
    setSubmitting(true);
    try {
      await createPaymentOrder(adapter, {
        companyId: COMPANY_ID,
        beneficiaryType: form.beneficiaryType,
        beneficiaryName: form.beneficiaryName.trim(),
        amount,
        paymentMethod: form.paymentMethod,
        reference: form.reference.trim() || undefined,
        description: form.description.trim() || undefined,
      });
      toast.success('Ordre de paiement cr\u00e9\u00e9');
      setShowModal(false);
      setForm(emptyForm);
      await loadOrders();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la cr\u00e9ation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (action: string, orderId: string) => {
    setActionLoading(orderId);
    try {
      switch (action) {
        case 'submit':
          await submitForApproval(adapter, orderId);
          toast.success('Ordre soumis pour approbation');
          break;
        case 'approve':
          await approvePaymentOrder(adapter, orderId, 'current-user');
          toast.success('Ordre approuv\u00e9');
          break;
        case 'execute':
          await executePaymentOrder(adapter, orderId);
          toast.success('Ordre ex\u00e9cut\u00e9 et \u00e9criture g\u00e9n\u00e9r\u00e9e');
          break;
        case 'reject':
          if (!rejectReason.trim()) {
            toast.warning('Veuillez indiquer le motif du rejet');
            setActionLoading(null);
            return;
          }
          await rejectPaymentOrder(adapter, orderId, rejectReason.trim());
          toast.success('Ordre rejet\u00e9');
          setRejectModal(null);
          setRejectReason('');
          break;
      }
      await loadOrders();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ordres de paiement</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            G\u00e9rez le cycle de vie des ordres de paiement
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouvel ordre
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTER_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterStatus === s
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {s === 'all' ? 'Tous' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-500 dark:text-gray-400">Chargement...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            Aucun ordre de paiement trouv\u00e9
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">N\u00b0</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">B\u00e9n\u00e9ficiaire</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Montant</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">M\u00e9thode</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Statut</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-4 py-3 font-mono text-gray-900 dark:text-white">{order.orderNumber}</td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900 dark:text-white">{order.beneficiaryName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {BENEFICIARY_TYPE_LABELS[order.beneficiaryType]}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                      {formatCurrency(order.amount)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {METHOD_LABELS[order.paymentMethod]}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {actionLoading === order.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        ) : (
                          <>
                            {order.status === 'draft' && (
                              <button
                                onClick={() => handleAction('submit', order.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30 dark:hover:bg-blue-900/50"
                                title="Soumettre"
                              >
                                <Send className="w-3 h-3" /> Soumettre
                              </button>
                            )}
                            {order.status === 'pending_approval' && (
                              <>
                                <button
                                  onClick={() => handleAction('approve', order.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 dark:text-green-300 dark:bg-green-900/30 dark:hover:bg-green-900/50"
                                  title="Approuver"
                                >
                                  <CheckCircle className="w-3 h-3" /> Approuver
                                </button>
                                <button
                                  onClick={() => setRejectModal(order.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 dark:text-red-300 dark:bg-red-900/30 dark:hover:bg-red-900/50"
                                  title="Rejeter"
                                >
                                  <XCircle className="w-3 h-3" /> Rejeter
                                </button>
                              </>
                            )}
                            {order.status === 'approved' && (
                              <button
                                onClick={() => handleAction('execute', order.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded hover:bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50"
                                title="Ex\u00e9cuter"
                              >
                                <Play className="w-3 h-3" /> Ex\u00e9cuter
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Nouvel ordre de paiement</h2>
              <button onClick={() => { setShowModal(false); setForm(emptyForm); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type de b\u00e9n\u00e9ficiaire</label>
                <select
                  value={form.beneficiaryType}
                  onChange={(e) => setForm({ ...form, beneficiaryType: e.target.value as any })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Object.entries(BENEFICIARY_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom du b\u00e9n\u00e9ficiaire</label>
                <input
                  type="text"
                  value={form.beneficiaryName}
                  onChange={(e) => setForm({ ...form, beneficiaryName: e.target.value })}
                  placeholder="Nom ou raison sociale"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Montant (XOF)</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0"
                  min="0"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">M\u00e9thode de paiement</label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as any })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Object.entries(METHOD_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">R\u00e9f\u00e9rence</label>
                <input
                  type="text"
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  placeholder="Facture, bon de commande..."
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="Description optionnelle"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowModal(false); setForm(emptyForm); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Cr\u00e9er
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Motif du rejet</h2>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Indiquez le motif du rejet..."
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Annuler
              </button>
              <button
                onClick={() => handleAction('reject', rejectModal)}
                disabled={actionLoading === rejectModal}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === rejectModal && <Loader2 className="w-4 h-4 animate-spin" />}
                Rejeter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentOrdersPage;
