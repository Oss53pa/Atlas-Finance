// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../hooks/useToast';
import type { DBCashRegisterSession, DBCashMovement } from '../../lib/db';
import {
  openSession,
  recordMovement,
  closeSession,
  getDailyCashReport,
} from '../../services/cashRegisterService';
import type { CashDailyReport } from '../../services/cashRegisterService';
import {
  Plus, X, Loader2, DoorOpen, DoorClosed, ArrowDownCircle, ArrowUpCircle, RefreshCw,
} from 'lucide-react';

const COMPANY_ID = 'default';
const CASH_ACCOUNT_ID = '571000';
const CASHIER_ID = 'current-user';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount);

const MOVEMENT_TYPE_LABELS: Record<DBCashMovement['type'], string> = {
  receipt: 'Encaissement',
  disbursement: 'D\u00e9caissement',
  supply_from_bank: 'Approvisionnement banque',
  deposit_to_bank: 'Versement en banque',
};

const MOVEMENT_TYPE_COLORS: Record<DBCashMovement['type'], string> = {
  receipt: 'text-green-600 dark:text-green-400',
  disbursement: 'text-red-600 dark:text-red-400',
  supply_from_bank: 'text-blue-600 dark:text-blue-400',
  deposit_to_bank: 'text-orange-600 dark:text-orange-400',
};

interface MovementForm {
  type: DBCashMovement['type'];
  amount: string;
  counterpartAccount: string;
  description: string;
  reference: string;
}

const emptyMovementForm: MovementForm = {
  type: 'receipt',
  amount: '',
  counterpartAccount: '',
  description: '',
  reference: '',
};

const CashRegisterPage: React.FC = () => {
  const { adapter } = useData();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<DBCashRegisterSession | null>(null);
  const [report, setReport] = useState<CashDailyReport | null>(null);
  const [sessions, setSessions] = useState<DBCashRegisterSession[]>([]);
  const [movementForm, setMovementForm] = useState<MovementForm>(emptyMovementForm);
  const [submitting, setSubmitting] = useState(false);

  // Open session form
  const [showOpenForm, setShowOpenForm] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');

  // Close session form
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [countedBalance, setCountedBalance] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const allSessions = await adapter.getAll<DBCashRegisterSession>('cashRegisterSessions', {
        where: { companyId: COMPANY_ID },
      });
      allSessions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setSessions(allSessions);

      const open = allSessions.find((s) => s.status === 'open');
      if (open) {
        setActiveSession(open);
        const r = await getDailyCashReport(adapter, open.id);
        setReport(r);
      } else {
        setActiveSession(null);
        setReport(null);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [adapter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenSession = async () => {
    const balance = parseFloat(openingBalance);
    if (isNaN(balance) || balance < 0) {
      toast.warning('Solde d\u2019ouverture invalide');
      return;
    }
    setSubmitting(true);
    try {
      await openSession(adapter, COMPANY_ID, CASH_ACCOUNT_ID, CASHIER_ID, balance);
      toast.success('Session de caisse ouverte');
      setShowOpenForm(false);
      setOpeningBalance('');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordMovement = async () => {
    if (!activeSession) return;
    const amount = parseFloat(movementForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.warning('Montant invalide');
      return;
    }
    if (!movementForm.counterpartAccount.trim()) {
      toast.warning('Compte de contrepartie requis');
      return;
    }
    setSubmitting(true);
    try {
      await recordMovement(adapter, activeSession.id, {
        type: movementForm.type,
        amount,
        counterpartAccount: movementForm.counterpartAccount.trim(),
        description: movementForm.description.trim() || undefined,
        reference: movementForm.reference.trim() || undefined,
      });
      toast.success('Mouvement enregistr\u00e9');
      setMovementForm(emptyMovementForm);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseSession = async () => {
    if (!activeSession) return;
    const counted = parseFloat(countedBalance);
    if (isNaN(counted) || counted < 0) {
      toast.warning('Solde compt\u00e9 invalide');
      return;
    }
    setSubmitting(true);
    try {
      const result = await closeSession(adapter, activeSession.id, counted);
      const disc = result.discrepancy;
      if (disc === 0) {
        toast.success('Session ferm\u00e9e sans \u00e9cart');
      } else {
        toast.warning(`Session ferm\u00e9e avec un \u00e9cart de ${formatCurrency(disc)}`);
      }
      setShowCloseForm(false);
      setCountedBalance('');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-500 dark:text-gray-400">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion de caisse</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Ouverture, mouvements et cl\u00f4ture des sessions de caisse
          </p>
        </div>
        <button onClick={loadData} className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {/* Active Session */}
      {activeSession && report ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Session active</h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Ouverte le {new Date(activeSession.openedAt).toLocaleString('fr-FR')}
              </span>
            </div>
            <button
              onClick={() => setShowCloseForm(true)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 dark:text-red-300 dark:bg-red-900/30 dark:hover:bg-red-900/50"
            >
              <DoorClosed className="w-4 h-4" /> Cl\u00f4turer
            </button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Solde d'ouverture</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">{formatCurrency(report.session.openingBalance)}</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="text-xs text-green-600 dark:text-green-400 mb-1">Total encaissements</div>
              <div className="text-lg font-semibold text-green-700 dark:text-green-300">{formatCurrency(report.totalReceipts)}</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <div className="text-xs text-red-600 dark:text-red-400 mb-1">Total d\u00e9caissements</div>
              <div className="text-lg font-semibold text-red-700 dark:text-red-300">{formatCurrency(report.totalDisbursements)}</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">Solde calcul\u00e9</div>
              <div className="text-lg font-semibold text-blue-700 dark:text-blue-300">{formatCurrency(report.computedBalance)}</div>
            </div>
          </div>

          {/* Movement Form */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Nouveau mouvement</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <select
                value={movementForm.type}
                onChange={(e) => setMovementForm({ ...movementForm, type: e.target.value as any })}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
              >
                {Object.entries(MOVEMENT_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <input
                type="number"
                value={movementForm.amount}
                onChange={(e) => setMovementForm({ ...movementForm, amount: e.target.value })}
                placeholder="Montant"
                min="0"
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
              <input
                type="text"
                value={movementForm.counterpartAccount}
                onChange={(e) => setMovementForm({ ...movementForm, counterpartAccount: e.target.value })}
                placeholder="Compte contrepartie (ex: 411001)"
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
              <input
                type="text"
                value={movementForm.description}
                onChange={(e) => setMovementForm({ ...movementForm, description: e.target.value })}
                placeholder="Description"
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
              <button
                onClick={handleRecordMovement}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Enregistrer
              </button>
            </div>
          </div>

          {/* Movements Table */}
          {report.movements.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-4 py-2 font-medium text-gray-500 dark:text-gray-400">Date</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500 dark:text-gray-400">Type</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-500 dark:text-gray-400">Montant</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500 dark:text-gray-400">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {report.movements.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                        {new Date(m.createdAt).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className={`px-4 py-2 font-medium ${MOVEMENT_TYPE_COLORS[m.type]}`}>
                        {m.type === 'receipt' || m.type === 'supply_from_bank' ? (
                          <span className="inline-flex items-center gap-1"><ArrowDownCircle className="w-3 h-3" /> {MOVEMENT_TYPE_LABELS[m.type]}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1"><ArrowUpCircle className="w-3 h-3" /> {MOVEMENT_TYPE_LABELS[m.type]}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-gray-900 dark:text-white">
                        {formatCurrency(m.amount)}
                      </td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{m.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-6 text-center">
          {showOpenForm ? (
            <div className="max-w-sm mx-auto">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ouvrir une session de caisse</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Solde d'ouverture (XOF)</label>
                <input
                  type="number"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="0"
                  min="0"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowOpenForm(false)}
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Annuler
                </button>
                <button
                  onClick={handleOpenSession}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <DoorOpen className="w-4 h-4" />}
                  Ouvrir
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Aucune session de caisse active</p>
              <button
                onClick={() => setShowOpenForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                <DoorOpen className="w-4 h-4" /> Ouvrir une session
              </button>
            </>
          )}
        </div>
      )}

      {/* Close Session Modal */}
      {showCloseForm && report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cl\u00f4turer la session</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Solde calcul\u00e9 : <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(report.computedBalance)}</span>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Solde compt\u00e9 physiquement (XOF)</label>
              <input
                type="number"
                value={countedBalance}
                onChange={(e) => setCountedBalance(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {countedBalance && !isNaN(parseFloat(countedBalance)) && (
              <div className={`text-sm font-medium mb-4 ${
                parseFloat(countedBalance) - report.computedBalance === 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                \u00c9cart : {formatCurrency(parseFloat(countedBalance) - report.computedBalance)}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowCloseForm(false); setCountedBalance(''); }}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Annuler
              </button>
              <button
                onClick={handleCloseSession}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Cl\u00f4turer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session History */}
      {sessions.filter((s) => s.status === 'closed').length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Historique des sessions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Ouverture</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Cl\u00f4ture</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Solde ouverture</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Solde calcul\u00e9</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Solde compt\u00e9</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">\u00c9cart</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {sessions.filter((s) => s.status === 'closed').map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {new Date(s.openedAt).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {s.closedAt ? new Date(s.closedAt).toLocaleString('fr-FR') : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{formatCurrency(s.openingBalance)}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{formatCurrency(s.closingBalanceComputed ?? 0)}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{formatCurrency(s.closingBalanceCounted ?? 0)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${
                      (s.discrepancy ?? 0) === 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {formatCurrency(s.discrepancy ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashRegisterPage;
