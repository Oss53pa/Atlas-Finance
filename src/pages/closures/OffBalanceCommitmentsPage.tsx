import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import PageHeaderActions from '../../components/ui/PageHeaderActions';
import { useToast } from '../../hooks/useToast';
import Decimal from 'decimal.js';
import type { DBOffBalanceCommitment } from '../../lib/db';

const TYPE_LABEL_KEYS: Record<string, string> = {
  guarantee_given: 'offBalance.typeGuaranteeGiven',
  guarantee_received: 'offBalance.typeGuaranteeReceived',
  mortgage: 'offBalance.typeMortgage',
  pledge: 'offBalance.typePledge',
  lease_commitment: 'offBalance.typeLease',
  bank_guarantee: 'offBalance.typeBankGuarantee',
  letter_of_credit: 'offBalance.typeLetterOfCredit',
  other: 'offBalance.typeOther',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  expired: 'bg-gray-100 text-gray-800',
  released: 'bg-blue-100 text-blue-800',
};

export default function OffBalanceCommitmentsPage() {
  const { adapter } = useData();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [commitments, setCommitments] = useState<DBOffBalanceCommitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');

  const load = useCallback(async () => {
    if (!adapter) return;
    setLoading(true);
    try {
      const data = await adapter.getAll<DBOffBalanceCommitment>('offBalanceCommitments');
      setCommitments(typeFilter === 'all' ? data : data.filter(c => c.type === typeFilter));
    } catch (err) { /* silent */
      toast.error(t('offBalance.loadError'));
    } finally {
      setLoading(false);
    }
  }, [adapter, typeFilter, toast, t]);

  useEffect(() => { load(); }, [load]);

  const formatAmount = (n: number) =>
    new Intl.NumberFormat(
      language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'fr-FR',
      { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 },
    ).format(n);

  const totalGiven = commitments
    .filter(c => c.status === 'active' && ['guarantee_given', 'mortgage', 'pledge', 'bank_guarantee'].includes(c.type))
    .reduce((sum, c) => sum.plus(c.amount), new Decimal(0));

  const totalReceived = commitments
    .filter(c => c.status === 'active' && ['guarantee_received', 'letter_of_credit'].includes(c.type))
    .reduce((sum, c) => sum.plus(c.amount), new Decimal(0));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('offBalance.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('offBalance.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <PageHeaderActions />
          <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            {t('offBalance.newCommitment')}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
          <p className="text-sm text-gray-500">{t('offBalance.givenActive')}</p>
          <p className="text-2xl font-bold text-red-600">{formatAmount(totalGiven.toNumber())}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
          <p className="text-sm text-gray-500">{t('offBalance.receivedActive')}</p>
          <p className="text-2xl font-bold text-green-600">{formatAmount(totalReceived.toNumber())}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
          <p className="text-sm text-gray-500">{t('offBalance.totalActive')}</p>
          <p className="text-2xl font-bold">{commitments.filter(c => c.status === 'active').length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
          <option value="all">{t('offBalance.allTypes')}</option>
          {Object.entries(TYPE_LABEL_KEYS).map(([key, labelKey]) => (
            <option key={key} value={key}>{t(labelKey)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">{t('offBalance.loading')}</div>
        ) : commitments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">{t('offBalance.empty')}</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('offBalance.colType')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('offBalance.colCounterparty')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('offBalance.colDescription')}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('offBalance.colAmount')}</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('offBalance.colPeriod')}</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('offBalance.colStatus')}</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('offBalance.colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {commitments.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm font-medium">{TYPE_LABEL_KEYS[c.type] ? t(TYPE_LABEL_KEYS[c.type]) : c.type}</td>
                  <td className="px-4 py-3 text-sm">{c.counterparty}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{c.description}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">{formatAmount(c.amount)}</td>
                  <td className="px-4 py-3 text-xs text-center text-gray-500">
                    {c.startDate} → {c.endDate || '∞'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] || ''}`}>
                      {c.status === 'active'
                        ? t('offBalance.statusActive')
                        : c.status === 'expired'
                          ? t('offBalance.statusExpired')
                          : t('offBalance.statusReleased')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.status === 'active' && (
                      <button
                        onClick={async () => {
                          if (!adapter) return;
                          await adapter.update('offBalanceCommitments', c.id, {
                            status: 'released',
                            updatedAt: new Date().toISOString(),
                          });
                          toast.success(t('offBalance.released'));
                          load();
                        }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {t('offBalance.releaseAction')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-lg font-bold mb-4">{t('offBalance.formTitle')}</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!adapter) return;
                const form = e.target as HTMLFormElement;
                const fd = new FormData(form);
                try {
                  const now = new Date().toISOString();
                  // Pas de companyId 'default' : la colonne company_id n'existe
                  // pas (la table a tenant_id, injecté par l'adaptateur en SaaS).
                  // L'envoyer faisait échouer l'insert Postgres → création cassée.
                  await adapter.create('offBalanceCommitments', {
                    type: fd.get('type') as string,
                    counterparty: fd.get('counterparty') as string,
                    description: fd.get('description') as string,
                    amount: parseFloat(fd.get('amount') as string) || 0,
                    currency: 'XOF',
                    startDate: fd.get('startDate') as string,
                    endDate: (fd.get('endDate') as string) || undefined,
                    status: 'active',
                    referenceDocument: (fd.get('referenceDocument') as string) || undefined,
                    createdAt: now,
                    updatedAt: now,
                  });
                  toast.success(t('offBalance.created'));
                  setShowForm(false);
                  load();
                } catch (err) { /* silent */
                  toast.error(t('offBalance.createError'));
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-sm font-medium mb-1">{t('offBalance.colType')}</label>
                <select name="type" required className="w-full px-3 py-2 border rounded-lg">
                  {Object.entries(TYPE_LABEL_KEYS).map(([k, labelKey]) => <option key={k} value={k}>{t(labelKey)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('offBalance.colCounterparty')}</label>
                <input name="counterparty" required className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('offBalance.colDescription')}</label>
                <textarea name="description" required className="w-full px-3 py-2 border rounded-lg" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('offBalance.colAmount')}</label>
                  <input name="amount" type="number" required className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('offBalance.fieldRefDoc')}</label>
                  <input name="referenceDocument" className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('offBalance.fieldStartDate')}</label>
                  <input name="startDate" type="date" required className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('offBalance.fieldEndDate')}</label>
                  <input name="endDate" type="date" className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg">{t('offBalance.cancel')}</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">{t('offBalance.create')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
