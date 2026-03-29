// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../hooks/useToast';
import type { DBCheck } from '../../lib/db';
import {
  receiveCheck,
  depositCheck,
  clearCheck,
  recordBounce,
  issueCheck,
  getChecks,
} from '../../services/checkService';
import {
  Plus, X, Loader2, ArrowDownRight, ArrowUpRight, Building2, AlertTriangle,
} from 'lucide-react';

const COMPANY_ID = 'default';
const BANK_ACCOUNT_ID = '521000';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount);

const STATUS_LABELS: Record<DBCheck['status'], string> = {
  received: 'Re\u00e7u',
  deposited: 'D\u00e9pos\u00e9',
  cleared: 'Encaiss\u00e9',
  bounced: 'Rejet\u00e9',
  cancelled: 'Annul\u00e9',
  issued: '\u00c9mis',
  cashed: 'D\u00e9bit\u00e9',
};

const STATUS_COLORS: Record<DBCheck['status'], string> = {
  received: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  deposited: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  cleared: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  bounced: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  issued: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  cashed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

interface IncomingForm {
  checkNumber: string;
  bankName: string;
  amount: string;
  clientAccount: string;
  issueDate: string;
}

interface OutgoingForm {
  checkNumber: string;
  bankName: string;
  amount: string;
  supplierAccount: string;
  bankAccountId: string;
  issueDate: string;
}

const emptyIncoming: IncomingForm = {
  checkNumber: '',
  bankName: '',
  amount: '',
  clientAccount: '411000',
  issueDate: new Date().toISOString().substring(0, 10),
};

const emptyOutgoing: OutgoingForm = {
  checkNumber: '',
  bankName: '',
  amount: '',
  supplierAccount: '401000',
  bankAccountId: BANK_ACCOUNT_ID,
  issueDate: new Date().toISOString().substring(0, 10),
};

const ChecksRegisterPage: React.FC = () => {
  const { adapter } = useData();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [incomingChecks, setIncomingChecks] = useState<DBCheck[]>([]);
  const [outgoingChecks, setOutgoingChecks] = useState<DBCheck[]>([]);
  const [loading, setLoading] = useState(true);

  const [incomingForm, setIncomingForm] = useState<IncomingForm>(emptyIncoming);
  const [outgoingForm, setOutgoingForm] = useState<OutgoingForm>(emptyOutgoing);
  const [showIncomingForm, setShowIncomingForm] = useState(false);
  const [showOutgoingForm, setShowOutgoingForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Bounce modal
  const [bounceModal, setBounceModal] = useState<string | null>(null);
  const [bounceReason, setBounceReason] = useState('');

  const loadChecks = useCallback(async () => {
    setLoading(true);
    try {
      const [incoming, outgoing] = await Promise.all([
        getChecks(adapter, COMPANY_ID, { direction: 'incoming' }),
        getChecks(adapter, COMPANY_ID, { direction: 'outgoing' }),
      ]);
      incoming.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      outgoing.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setIncomingChecks(incoming);
      setOutgoingChecks(outgoing);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [adapter]);

  useEffect(() => {
    loadChecks();
  }, [loadChecks]);

  const handleReceive = async () => {
    const amount = parseFloat(incomingForm.amount);
    if (!incomingForm.checkNumber.trim()) { toast.warning('Num\u00e9ro de ch\u00e8que requis'); return; }
    if (!incomingForm.bankName.trim()) { toast.warning('Nom de la banque requis'); return; }
    if (isNaN(amount) || amount <= 0) { toast.warning('Montant invalide'); return; }
    if (!incomingForm.clientAccount.trim()) { toast.warning('Compte client requis'); return; }

    setSubmitting(true);
    try {
      await receiveCheck(adapter, {
        companyId: COMPANY_ID,
        checkNumber: incomingForm.checkNumber.trim(),
        bankName: incomingForm.bankName.trim(),
        amount,
        clientAccount: incomingForm.clientAccount.trim(),
        issueDate: incomingForm.issueDate,
      });
      toast.success('Ch\u00e8que enregistr\u00e9');
      setIncomingForm(emptyIncoming);
      setShowIncomingForm(false);
      await loadChecks();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleIssue = async () => {
    const amount = parseFloat(outgoingForm.amount);
    if (!outgoingForm.checkNumber.trim()) { toast.warning('Num\u00e9ro de ch\u00e8que requis'); return; }
    if (!outgoingForm.bankName.trim()) { toast.warning('Nom de la banque requis'); return; }
    if (isNaN(amount) || amount <= 0) { toast.warning('Montant invalide'); return; }
    if (!outgoingForm.supplierAccount.trim()) { toast.warning('Compte fournisseur requis'); return; }

    setSubmitting(true);
    try {
      await issueCheck(adapter, {
        companyId: COMPANY_ID,
        checkNumber: outgoingForm.checkNumber.trim(),
        bankName: outgoingForm.bankName.trim(),
        amount,
        supplierAccount: outgoingForm.supplierAccount.trim(),
        bankAccountId: outgoingForm.bankAccountId.trim() || BANK_ACCOUNT_ID,
        issueDate: outgoingForm.issueDate,
      });
      toast.success('Ch\u00e8que \u00e9mis');
      setOutgoingForm(emptyOutgoing);
      setShowOutgoingForm(false);
      await loadChecks();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeposit = async (checkId: string) => {
    setActionLoading(checkId);
    try {
      await depositCheck(adapter, checkId, BANK_ACCOUNT_ID);
      toast.success('Ch\u00e8que d\u00e9pos\u00e9 en banque');
      await loadChecks();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleClear = async (checkId: string) => {
    setActionLoading(checkId);
    try {
      await clearCheck(adapter, checkId);
      toast.success('Ch\u00e8que encaiss\u00e9');
      await loadChecks();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBounce = async () => {
    if (!bounceModal) return;
    if (!bounceReason.trim()) { toast.warning('Motif du rejet requis'); return; }
    setActionLoading(bounceModal);
    try {
      await recordBounce(adapter, bounceModal, bounceReason.trim());
      toast.success('Rejet enregistr\u00e9');
      setBounceModal(null);
      setBounceReason('');
      await loadChecks();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const renderCheckTable = (checks: DBCheck[], direction: 'incoming' | 'outgoing') => {
    if (checks.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Aucun ch\u00e8que {direction === 'incoming' ? 'entrant' : 'sortant'}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">N\u00b0 Ch\u00e8que</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Banque</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Montant</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Date</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Statut</th>
              {direction === 'incoming' && (
                <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {checks.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                <td className="px-4 py-3 font-mono text-gray-900 dark:text-white">{c.checkNumber}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> {c.bankName}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                  {formatCurrency(c.amount)}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                  {new Date(c.issueDate).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                    {STATUS_LABELS[c.status]}
                  </span>
                  {c.bounceReason && (
                    <div className="text-xs text-red-500 mt-1">{c.bounceReason}</div>
                  )}
                </td>
                {direction === 'incoming' && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {actionLoading === c.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      ) : (
                        <>
                          {c.status === 'received' && (
                            <button
                              onClick={() => handleDeposit(c.id)}
                              className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30 dark:hover:bg-blue-900/50"
                            >
                              D\u00e9poser
                            </button>
                          )}
                          {c.status === 'deposited' && (
                            <>
                              <button
                                onClick={() => handleClear(c.id)}
                                className="px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 dark:text-green-300 dark:bg-green-900/30 dark:hover:bg-green-900/50"
                              >
                                Encaisser
                              </button>
                              <button
                                onClick={() => setBounceModal(c.id)}
                                className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 dark:text-red-300 dark:bg-red-900/30 dark:hover:bg-red-900/50"
                              >
                                Rejet\u00e9
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Registre des ch\u00e8ques</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Suivi des ch\u00e8ques entrants et sortants
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <button
          onClick={() => setActiveTab('incoming')}
          className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'incoming'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <ArrowDownRight className="w-4 h-4" />
          Ch\u00e8ques entrants
          <span className="ml-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs">{incomingChecks.length}</span>
        </button>
        <button
          onClick={() => setActiveTab('outgoing')}
          className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'outgoing'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          Ch\u00e8ques sortants
          <span className="ml-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs">{outgoingChecks.length}</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-500 dark:text-gray-400">Chargement...</span>
        </div>
      ) : (
        <>
          {activeTab === 'incoming' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Incoming form toggle */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ch\u00e8ques entrants</h2>
                <button
                  onClick={() => setShowIncomingForm(!showIncomingForm)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  {showIncomingForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {showIncomingForm ? 'Fermer' : 'Recevoir'}
                </button>
              </div>

              {showIncomingForm && (
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
                    <input
                      type="text"
                      value={incomingForm.checkNumber}
                      onChange={(e) => setIncomingForm({ ...incomingForm, checkNumber: e.target.value })}
                      placeholder="N\u00b0 ch\u00e8que"
                      className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={incomingForm.bankName}
                      onChange={(e) => setIncomingForm({ ...incomingForm, bankName: e.target.value })}
                      placeholder="Banque \u00e9mettrice"
                      className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                    />
                    <input
                      type="number"
                      value={incomingForm.amount}
                      onChange={(e) => setIncomingForm({ ...incomingForm, amount: e.target.value })}
                      placeholder="Montant"
                      min="0"
                      className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={incomingForm.clientAccount}
                      onChange={(e) => setIncomingForm({ ...incomingForm, clientAccount: e.target.value })}
                      placeholder="Compte client (411xxx)"
                      className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                    />
                    <input
                      type="date"
                      value={incomingForm.issueDate}
                      onChange={(e) => setIncomingForm({ ...incomingForm, issueDate: e.target.value })}
                      className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                    />
                  </div>
                  <button
                    onClick={handleReceive}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Enregistrer la r\u00e9ception
                  </button>
                </div>
              )}

              {renderCheckTable(incomingChecks, 'incoming')}
            </div>
          )}

          {activeTab === 'outgoing' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ch\u00e8ques sortants</h2>
                <button
                  onClick={() => setShowOutgoingForm(!showOutgoingForm)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  {showOutgoingForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {showOutgoingForm ? 'Fermer' : '\u00c9mettre'}
                </button>
              </div>

              {showOutgoingForm && (
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                    <input
                      type="text"
                      value={outgoingForm.checkNumber}
                      onChange={(e) => setOutgoingForm({ ...outgoingForm, checkNumber: e.target.value })}
                      placeholder="N\u00b0 ch\u00e8que"
                      className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={outgoingForm.bankName}
                      onChange={(e) => setOutgoingForm({ ...outgoingForm, bankName: e.target.value })}
                      placeholder="Banque"
                      className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                    />
                    <input
                      type="number"
                      value={outgoingForm.amount}
                      onChange={(e) => setOutgoingForm({ ...outgoingForm, amount: e.target.value })}
                      placeholder="Montant"
                      min="0"
                      className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={outgoingForm.supplierAccount}
                      onChange={(e) => setOutgoingForm({ ...outgoingForm, supplierAccount: e.target.value })}
                      placeholder="Compte fournisseur (401xxx)"
                      className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={outgoingForm.bankAccountId}
                      onChange={(e) => setOutgoingForm({ ...outgoingForm, bankAccountId: e.target.value })}
                      placeholder="Compte banque (521xxx)"
                      className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                    />
                    <input
                      type="date"
                      value={outgoingForm.issueDate}
                      onChange={(e) => setOutgoingForm({ ...outgoingForm, issueDate: e.target.value })}
                      className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                    />
                  </div>
                  <button
                    onClick={handleIssue}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    \u00c9mettre le ch\u00e8que
                  </button>
                </div>
              )}

              {renderCheckTable(outgoingChecks, 'outgoing')}
            </div>
          )}
        </>
      )}

      {/* Bounce Modal */}
      {bounceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Enregistrer un rejet</h2>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motif du rejet</label>
              <textarea
                value={bounceReason}
                onChange={(e) => setBounceReason(e.target.value)}
                rows={3}
                placeholder="Provision insuffisante, signature non conforme..."
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setBounceModal(null); setBounceReason(''); }}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Annuler
              </button>
              <button
                onClick={handleBounce}
                disabled={actionLoading === bounceModal}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === bounceModal && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChecksRegisterPage;
