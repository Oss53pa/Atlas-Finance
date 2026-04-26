// @ts-nocheck

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '@/utils/formatters';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, Filter, Calendar, ChevronLeft, ChevronRight, Eye, X } from 'lucide-react';

interface BudgetRow {
  compte: string;
  description: string;
  jan: number;
  feb: number;
  mar: number;
  apr: number;
  may: number;
  jun: number;
  jul: number;
  aug: number;
  sep: number;
  oct: number;
  nov: number;
  dec: number;
  total: number;
  hasDetails?: boolean;
}

const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;

const BudgetRecapPage: React.FC = () => {
  const { t } = useLanguage();
  const { adapter } = useData();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const department = searchParams.get('department') || '';
  const type = searchParams.get('type') || 'revenue'; // 'revenue' ou 'expense'
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [data, setData] = useState<BudgetRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadBudgetData = async () => {
      setLoading(true);
      try {
        // Load budget lines from adapter
        const budgetLines = await adapter.getAll('budgetLines').catch(() => [] as Record<string, unknown>[]);
        // Load journal entries for actual amounts
        const entries = await adapter.getAll('journalEntries').catch(() => [] as Record<string, unknown>[]);

        if (!mounted) return;

        // Build monthly totals from journal entries per account
        const accountMonthly = new Map<string, { description: string; months: number[] }>();

        for (const entry of entries) {
          const entryDate = new Date(entry.date as string);
          if (entryDate.getFullYear().toString() !== selectedYear) continue;
          const monthIdx = entryDate.getMonth();

          const lines = (entry.lines || []) as Array<{
            accountCode?: string;
            accountName?: string;
            debit?: number;
            credit?: number;
          }>;

          for (const line of lines) {
            const code = line.accountCode || '';
            // Revenue = class 7, Expense = class 6
            const isRevenue = code.startsWith('7');
            const isExpense = code.startsWith('6');

            if ((type === 'revenue' && !isRevenue) || (type === 'expense' && !isExpense)) continue;

            if (!accountMonthly.has(code)) {
              accountMonthly.set(code, {
                description: line.accountName || code,
                months: new Array(12).fill(0),
              });
            }
            const acc = accountMonthly.get(code)!;
            // For revenue accounts, use credit; for expense accounts, use debit
            if (isRevenue) {
              acc.months[monthIdx] += (line.credit || 0) - (line.debit || 0);
            } else {
              acc.months[monthIdx] += (line.debit || 0) - (line.credit || 0);
            }
          }
        }

        // Also integrate budget lines if they exist
        for (const bl of budgetLines) {
          const code = (bl.accountCode || bl.compte || '') as string;
          if (!code) continue;
          const isRevenue = code.startsWith('7');
          const isExpense = code.startsWith('6');
          if ((type === 'revenue' && !isRevenue) || (type === 'expense' && !isExpense)) continue;

          if (!accountMonthly.has(code)) {
            accountMonthly.set(code, {
              description: (bl.description || bl.label || code) as string,
              months: new Array(12).fill(0),
            });
          }
          const acc = accountMonthly.get(code)!;
          for (let i = 0; i < 12; i++) {
            const key = MONTH_KEYS[i];
            if (typeof bl[key] === 'number') {
              acc.months[i] += bl[key] as number;
            }
          }
        }

        // Convert to BudgetRow[]
        const rows: BudgetRow[] = Array.from(accountMonthly.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([code, { description, months }]) => {
            const total = months.reduce((s, v) => s + v, 0);
            return {
              compte: code,
              description,
              jan: months[0], feb: months[1], mar: months[2],
              apr: months[3], may: months[4], jun: months[5],
              jul: months[6], aug: months[7], sep: months[8],
              oct: months[9], nov: months[10], dec: months[11],
              total,
            };
          });

        if (mounted) {
          setData(rows);
        }
      } catch (err) {
        if (mounted) setData([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadBudgetData();
    return () => { mounted = false; };
  }, [adapter, selectedYear, type]);

  const formatAmount = (amount: number) => {
    return formatCurrency(amount);
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="p-6 bg-[var(--color-border)] min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#404040]" />
              <span className="text-sm text-[#404040]">Retour</span>
            </button>

            <div>
              <h1 className="text-lg font-bold text-[var(--color-primary)]">Budget Recap</h1>
              <div className="flex items-center space-x-3 mt-1">
                <span className="text-sm text-[var(--color-text-tertiary)]">
                  {department || 'Tous les departements'}
                </span>
                <span className="text-sm text-[var(--color-text-tertiary)]">•</span>
                <span className="text-sm font-medium text-[var(--color-text-secondary)]">
                  {type === 'revenue' ? 'Revenus' : 'Depenses'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Selecteur d'annee */}
            <div className="flex items-center bg-white border border-[var(--color-border)] rounded-lg">
              <button
                onClick={() => setSelectedYear((prev) => (parseInt(prev) - 1).toString())}
                className="p-2 hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-4 py-2 font-medium text-[var(--color-primary)]">{selectedYear}</span>
              <button
                onClick={() => setSelectedYear((prev) => (parseInt(prev) + 1).toString())}
                className="p-2 hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-[var(--color-border)] rounded-lg hover:bg-gray-50" aria-label="Filtrer">
              <Filter className="w-4 h-4" />
              <span className="text-sm">{t('common.filter')}</span>
            </button>

            <button className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-text-secondary)] text-white rounded-lg hover:bg-[#404040]" aria-label="Telecharger">
              <Download className="w-4 h-4" />
              <span className="text-sm">{t('common.export')}</span>
            </button>

            <button
              onClick={() => navigate('/budgeting')}
              className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              title={t('common.close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Titre de la section */}
      <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] mb-4">
        <h2 className="text-lg font-bold text-[var(--color-primary)]">
          {type === 'revenue' ? 'Revenus' : 'Depenses'}
        </h2>
      </div>

      {/* Tableau des donnees */}
      <div className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-[var(--color-border)]">
              <tr>
                <th className="text-left p-3 text-sm font-medium text-[#404040] sticky left-0 bg-gray-100 min-w-[100px]">
                  Compte
                </th>
                <th className="text-left p-3 text-sm font-medium text-[#404040] min-w-[200px]">
                  Account Description
                </th>
                {months.map((month) => (
                  <th key={month} className="text-right p-3 text-sm font-medium text-[#404040] min-w-[100px]">
                    {month}
                  </th>
                ))}
                <th className="text-right p-3 text-sm font-medium text-[#404040] bg-gray-200 min-w-[120px]">
                  Total
                </th>
                <th className="p-3 text-sm font-medium text-[#404040] bg-gray-200 min-w-[50px]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={16} className="p-8 text-center text-sm text-[var(--color-text-tertiary)]">
                    Chargement des donnees budgetaires...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={16} className="p-8 text-center text-sm text-[var(--color-text-tertiary)]">
                    Aucune donnee budgetaire
                  </td>
                </tr>
              ) : null}
              {data.map((row) => (
                <tr key={row.compte} className="hover:bg-gray-50">
                  <td className="p-3 text-sm font-medium text-[var(--color-primary)] sticky left-0 bg-white">
                    {row.compte}
                  </td>
                  <td className="p-3 text-sm text-[#404040]">
                    {row.description}
                  </td>
                  <td className="p-3 text-sm text-right text-[var(--color-text-tertiary)]">
                    {formatAmount(row.jan)}
                  </td>
                  <td className="p-3 text-sm text-right text-[var(--color-text-tertiary)]">
                    {formatAmount(row.feb)}
                  </td>
                  <td className="p-3 text-sm text-right text-[var(--color-text-tertiary)]">
                    {formatAmount(row.mar)}
                  </td>
                  <td className="p-3 text-sm text-right text-[var(--color-text-tertiary)]">
                    {formatAmount(row.apr)}
                  </td>
                  <td className="p-3 text-sm text-right text-[var(--color-text-tertiary)]">
                    {formatAmount(row.may)}
                  </td>
                  <td className="p-3 text-sm text-right text-[var(--color-text-tertiary)]">
                    {formatAmount(row.jun)}
                  </td>
                  <td className="p-3 text-sm text-right text-[var(--color-text-tertiary)]">
                    {formatAmount(row.jul)}
                  </td>
                  <td className="p-3 text-sm text-right text-[var(--color-text-tertiary)]">
                    {formatAmount(row.aug)}
                  </td>
                  <td className="p-3 text-sm text-right text-[var(--color-text-tertiary)]">
                    {formatAmount(row.sep)}
                  </td>
                  <td className="p-3 text-sm text-right text-[var(--color-text-tertiary)]">
                    {formatAmount(row.oct)}
                  </td>
                  <td className="p-3 text-sm text-right text-[var(--color-text-tertiary)]">
                    {formatAmount(row.nov)}
                  </td>
                  <td className="p-3 text-sm text-right text-[var(--color-text-tertiary)]">
                    {formatAmount(row.dec)}
                  </td>
                  <td className="p-3 text-sm text-right font-bold text-[var(--color-primary)] bg-gray-50">
                    {formatAmount(row.total)}
                  </td>
                  <td className="p-3 text-center bg-gray-50">
                    <button
                      onClick={() => navigate(`/budgeting/detail?compte=${row.compte}&description=${encodeURIComponent(row.description)}&department=${encodeURIComponent(department)}&type=${type}`)}
                      className="p-1 hover:bg-gray-200 rounded"
                      title="Voir les details"
                    >
                      <Eye className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    </button>
                  </td>
                </tr>
              ))}

              {/* Ligne de total */}
              {data.length > 0 && (
                <tr className="bg-gray-100 font-bold">
                  <td className="p-3 text-sm text-[var(--color-primary)] sticky left-0 bg-gray-100" colSpan={2}>
                    TOTAL
                  </td>
                  {months.map((month) => (
                    <td key={month} className="p-3 text-sm text-right text-[var(--color-primary)]">
                      {formatAmount(
                        data.reduce((sum, row) => {
                          const monthKey = month.toLowerCase() as keyof typeof row;
                          const value = row[monthKey];
                          return sum + (typeof value === 'number' ? value : 0);
                        }, 0)
                      )}
                    </td>
                  ))}
                  <td className="p-3 text-sm text-right text-[var(--color-primary)] bg-gray-200">
                    {formatAmount(data.reduce((sum, row) => sum + row.total, 0))}
                  </td>
                  <td className="p-3 text-center bg-gray-200">
                    <button
                      onClick={() => navigate(`/budgeting/detail?department=${encodeURIComponent(department)}&type=${type}&all=true`)}
                      className="p-1 hover:bg-gray-300 rounded"
                      title="Voir tous les details"
                    >
                      <Eye className="w-4 h-4 text-[var(--color-primary)]" />
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistiques en bas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-white rounded-lg p-4 border border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-tertiary)] mb-2">Moyenne mensuelle</p>
          <p className="text-lg font-bold text-[var(--color-text-secondary)]">
            {formatAmount(data.length > 0 ? Math.round(data.reduce((sum, row) => sum + row.total, 0) / 12) : 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-tertiary)] mb-2">Mois le plus eleve</p>
          <p className="text-lg font-bold text-green-600">
            {(() => {
              if (data.length === 0) return '-';
              let maxMonth = 'jan';
              let maxValue = 0;
              months.forEach(month => {
                const monthKey = month.toLowerCase() as keyof typeof data[0];
                const monthSum = data.reduce((sum, row) => {
                  const value = row[monthKey];
                  return sum + (typeof value === 'number' ? value : 0);
                }, 0);
                if (monthSum > maxValue) {
                  maxValue = monthSum;
                  maxMonth = month;
                }
              });
              return `${maxMonth} (${formatAmount(maxValue)})`;
            })()}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-tertiary)] mb-2">Mois le plus bas</p>
          <p className="text-lg font-bold text-red-600">
            {(() => {
              if (data.length === 0) return '-';
              let minMonth = 'jan';
              let minValue = Infinity;
              months.forEach(month => {
                const monthKey = month.toLowerCase() as keyof typeof data[0];
                const monthSum = data.reduce((sum, row) => {
                  const value = row[monthKey];
                  return sum + (typeof value === 'number' ? value : 0);
                }, 0);
                if (monthSum < minValue) {
                  minValue = monthSum;
                  minMonth = month;
                }
              });
              return `${minMonth} (${formatAmount(minValue)})`;
            })()}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-tertiary)] mb-2">Nombre de comptes</p>
          <p className="text-lg font-bold text-[var(--color-primary)]">
            {data.length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BudgetRecapPage;
