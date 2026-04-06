
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../hooks/useToast';
import type { DBLoanSchedule } from '../../lib/db';
import {
  generateSchedule,
  computeSchedule,
  recordInstallmentPayment,
  getScheduleByLoan,
} from '../../services/loanScheduleService';
import type { LoanScheduleRow } from '../../services/loanScheduleService';
import {
  Calculator, Save, Loader2, CheckCircle, CreditCard, ChevronDown, ChevronUp, Trash2,
} from 'lucide-react';

const COMPANY_ID = 'default';
const BANK_ACCOUNT_ID = '521000';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount);

const STATUS_LABELS: Record<DBLoanSchedule['status'], string> = {
  pending: 'En attente',
  paid: 'Pay\u00e9',
  overdue: 'En retard',
};

const STATUS_COLORS: Record<DBLoanSchedule['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

interface ScheduleForm {
  principal: string;
  annualRate: string;
  months: string;
  startDate: string;
  method: 'constant_installment' | 'constant_principal';
  loanId: string;
}

const emptyForm: ScheduleForm = {
  principal: '',
  annualRate: '',
  months: '',
  startDate: new Date().toISOString().substring(0, 10),
  method: 'constant_installment',
  loanId: '',
};

const LoanSchedulePage: React.FC = () => {
  const { adapter } = useData();
  const { toast } = useToast();

  const [form, setForm] = useState<ScheduleForm>(emptyForm);
  const [preview, setPreview] = useState<LoanScheduleRow[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Saved schedules
  const [savedLoans, setSavedLoans] = useState<{ loanId: string; schedules: DBLoanSchedule[] }[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  const loadSavedSchedules = useCallback(async () => {
    setLoadingSaved(true);
    try {
      const all = await adapter.getAll<DBLoanSchedule>('loanSchedules', {
        where: { companyId: COMPANY_ID },
      });
      // Group by loanId
      const grouped = new Map<string, DBLoanSchedule[]>();
      for (const s of all) {
        if (!grouped.has(s.loanId)) grouped.set(s.loanId, []);
        grouped.get(s.loanId)!.push(s);
      }
      const loans = Array.from(grouped.entries())
        .map(([loanId, schedules]) => ({
          loanId,
          schedules: schedules.sort((a, b) => a.installmentNumber - b.installmentNumber),
        }))
        .sort((a, b) => b.schedules[0].createdAt.localeCompare(a.schedules[0].createdAt));
      setSavedLoans(loans);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du chargement');
    } finally {
      setLoadingSaved(false);
    }
  }, [adapter]);

  useEffect(() => {
    loadSavedSchedules();
  }, [loadSavedSchedules]);

  const handlePreview = () => {
    const principal = parseFloat(form.principal);
    const annualRate = parseFloat(form.annualRate);
    const months = parseInt(form.months);
    if (isNaN(principal) || principal <= 0) { toast.warning('Capital invalide'); return; }
    if (isNaN(annualRate) || annualRate < 0) { toast.warning('Taux invalide'); return; }
    if (isNaN(months) || months <= 0) { toast.warning('Dur\u00e9e invalide'); return; }
    if (!form.startDate) { toast.warning('Date de d\u00e9but requise'); return; }

    try {
      const rows = computeSchedule({
        principal,
        annualRate,
        months,
        startDate: form.startDate,
        method: form.method,
      });
      setPreview(rows);
    } catch (err: any) {
      toast.error(err.message || 'Erreur de calcul');
    }
  };

  const handleSave = async () => {
    if (!preview) return;
    const principal = parseFloat(form.principal);
    const annualRate = parseFloat(form.annualRate);
    const months = parseInt(form.months);
    const loanId = form.loanId.trim() || crypto.randomUUID();

    setSubmitting(true);
    try {
      await generateSchedule(adapter, {
        companyId: COMPANY_ID,
        loanId,
        principal,
        annualRate,
        months,
        startDate: form.startDate,
        method: form.method,
      });
      toast.success(`Tableau d'amortissement enregistr\u00e9 (${months} \u00e9ch\u00e9ances)`);
      setForm(emptyForm);
      setPreview(null);
      await loadSavedSchedules();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePay = async (scheduleId: string) => {
    setPayingId(scheduleId);
    try {
      await recordInstallmentPayment(adapter, scheduleId, BANK_ACCOUNT_ID);
      toast.success('\u00c9ch\u00e9ance pay\u00e9e et \u00e9criture g\u00e9n\u00e9r\u00e9e');
      await loadSavedSchedules();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setPayingId(null);
    }
  };

  const previewTotals = useMemo(() => {
    if (!preview) return null;
    const totalPrincipal = preview.reduce((s, r) => s + r.principalAmount, 0);
    const totalInterest = preview.reduce((s, r) => s + r.interestAmount, 0);
    const totalAmount = preview.reduce((s, r) => s + r.totalAmount, 0);
    return { totalPrincipal, totalInterest, totalAmount };
  }, [preview]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tableau d'amortissement</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          G\u00e9n\u00e9rez et g\u00e9rez les \u00e9ch\u00e9anciers d'emprunt
        </p>
      </div>

      {/* Generate Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">G\u00e9n\u00e9rer un tableau</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Capital emprunt\u00e9 (XOF)</label>
            <input
              type="number"
              value={form.principal}
              onChange={(e) => setForm({ ...form, principal: e.target.value })}
              placeholder="10 000 000"
              min="0"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Taux annuel (%)</label>
            <input
              type="number"
              value={form.annualRate}
              onChange={(e) => setForm({ ...form, annualRate: e.target.value })}
              placeholder="8.5"
              min="0"
              step="0.1"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dur\u00e9e (mois)</label>
            <input
              type="number"
              value={form.months}
              onChange={(e) => setForm({ ...form, months: e.target.value })}
              placeholder="24"
              min="1"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date de d\u00e9but</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">M\u00e9thode</label>
            <select
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value as typeof form.method })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="constant_installment">Mensualit\u00e9 constante</option>
              <option value="constant_principal">Capital constant</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Identifiant emprunt</label>
            <input
              type="text"
              value={form.loanId}
              onChange={(e) => setForm({ ...form, loanId: e.target.value })}
              placeholder="Auto-g\u00e9n\u00e9r\u00e9 si vide"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          onClick={handlePreview}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Calculator className="w-4 h-4" /> Calculer l'aper\u00e7u
        </button>
      </div>

      {/* Preview Table */}
      {preview && previewTotals && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Aper\u00e7u du tableau ({preview.length} \u00e9ch\u00e9ances)</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setPreview(null)}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Enregistrer
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">N\u00b0</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Date</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Capital</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Int\u00e9r\u00eats</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Total</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Restant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {preview.map((row) => (
                  <tr key={row.installmentNumber} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-4 py-2 text-center text-gray-600 dark:text-gray-300">{row.installmentNumber}</td>
                    <td className="px-4 py-2 text-gray-900 dark:text-white">{new Date(row.dueDate).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-2 text-right text-gray-900 dark:text-white">{formatCurrency(row.principalAmount)}</td>
                    <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-300">{formatCurrency(row.interestAmount)}</td>
                    <td className="px-4 py-2 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(row.totalAmount)}</td>
                    <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-300">{formatCurrency(row.remainingBalance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 font-semibold">
                  <td className="px-4 py-3" colSpan={2}>Total</td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{formatCurrency(previewTotals.totalPrincipal)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{formatCurrency(previewTotals.totalInterest)}</td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{formatCurrency(previewTotals.totalAmount)}</td>
                  <td className="px-4 py-3 text-right">-</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Saved Schedules */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Emprunts enregistr\u00e9s</h2>
        </div>

        {loadingSaved ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-500 dark:text-gray-400">Chargement...</span>
          </div>
        ) : savedLoans.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Aucun tableau d'amortissement enregistr\u00e9
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {savedLoans.map(({ loanId, schedules }) => {
              const isExpanded = expandedLoan === loanId;
              const totalPaid = schedules.filter((s) => s.status === 'paid').length;
              const total = schedules.length;
              const totalAmount = schedules.reduce((s, r) => s + r.totalAmount, 0);

              return (
                <div key={loanId}>
                  <button
                    onClick={() => setExpandedLoan(isExpanded ? null : loanId)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-750 text-left"
                  >
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        Emprunt {loanId.substring(0, 8)}...
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {totalPaid}/{total} \u00e9ch\u00e9ances pay\u00e9es - Total: {formatCurrency(totalAmount)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${(totalPaid / total) * 100}%` }}
                        />
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-6 pb-4">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <th className="text-center px-3 py-2 font-medium text-gray-500 dark:text-gray-400">N\u00b0</th>
                              <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Date</th>
                              <th className="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Capital</th>
                              <th className="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Int\u00e9r\u00eats</th>
                              <th className="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Total</th>
                              <th className="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Restant</th>
                              <th className="text-center px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Statut</th>
                              <th className="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {schedules.map((s) => (
                              <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                                <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-300">{s.installmentNumber}</td>
                                <td className="px-3 py-2 text-gray-900 dark:text-white">{new Date(s.dueDate).toLocaleDateString('fr-FR')}</td>
                                <td className="px-3 py-2 text-right text-gray-900 dark:text-white">{formatCurrency(s.principalAmount)}</td>
                                <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">{formatCurrency(s.interestAmount)}</td>
                                <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(s.totalAmount)}</td>
                                <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">{formatCurrency(s.remainingBalance)}</td>
                                <td className="px-3 py-2 text-center">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[s.status]}`}>
                                    {STATUS_LABELS[s.status]}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {s.status !== 'paid' && (
                                    <button
                                      onClick={() => handlePay(s.id)}
                                      disabled={payingId === s.id}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 disabled:opacity-50 dark:text-green-300 dark:bg-green-900/30 dark:hover:bg-green-900/50"
                                    >
                                      {payingId === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3" />}
                                      Payer
                                    </button>
                                  )}
                                  {s.status === 'paid' && (
                                    <CheckCircle className="w-4 h-4 text-green-500 inline-block" />
                                  )}
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
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoanSchedulePage;
