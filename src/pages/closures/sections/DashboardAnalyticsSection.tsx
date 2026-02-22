import React, { useState, useEffect } from 'react';
import { BarChart3, CheckCircle, TrendingUp, FileText, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import type { DBFiscalYear, DBJournalEntry } from '../../../lib/db';
import { formatCurrency } from '../../../utils/formatters';

interface DashboardAnalyticsSectionProps {
  periodId?: string;
  onComplete?: () => void;
}

interface AnalyticsData {
  totalEntries: number;
  validatedEntries: number;
  draftEntries: number;
  totalDebit: number;
  totalCredit: number;
  ecart: number;
  accountsUsed: number;
  journalsUsed: string[];
  entriesByMonth: { month: string; count: number }[];
}

const DashboardAnalyticsSection: React.FC<DashboardAnalyticsSectionProps> = ({ periodId, onComplete }) => {
  const { adapter } = useData();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [fiscalYear, setFiscalYear] = useState<DBFiscalYear | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const fys = await adapter.getAll<DBFiscalYear>('fiscalYears');
        const fy = (periodId ? fys.find(f => f.id === periodId) : fys.find(f => f.isActive)) || fys[0];
        if (!fy) { setLoading(false); return; }
        setFiscalYear(fy);

        const allEntries = await adapter.getAll<DBJournalEntry>('journalEntries');
        const entries = allEntries.filter(e => e.date >= fy.startDate && e.date <= fy.endDate);

        const accountsSet = new Set<string>();
        const journalsSet = new Set<string>();
        const monthMap = new Map<string, number>();
        let totalDebit = 0;
        let totalCredit = 0;
        let validated = 0;
        let drafts = 0;

        for (const entry of entries) {
          journalsSet.add(entry.journal);
          if (entry.status === 'validated') validated++;
          if (entry.status === 'draft') drafts++;
          totalDebit += entry.totalDebit || 0;
          totalCredit += entry.totalCredit || 0;
          for (const line of entry.lines) {
            accountsSet.add(line.accountCode);
          }
          const month = entry.date.substring(0, 7); // YYYY-MM
          monthMap.set(month, (monthMap.get(month) || 0) + 1);
        }

        const entriesByMonth = Array.from(monthMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, count]) => ({ month, count }));

        setData({
          totalEntries: entries.length,
          validatedEntries: validated,
          draftEntries: drafts,
          totalDebit,
          totalCredit,
          ecart: Math.abs(totalDebit - totalCredit),
          accountsUsed: accountsSet.size,
          journalsUsed: Array.from(journalsSet).sort(),
          entriesByMonth,
        });
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [periodId, adapter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
        <span className="ml-2 text-[var(--color-text-secondary)]">Chargement des statistiques...</span>
      </div>
    );
  }

  const pctValidated = data && data.totalEntries > 0
    ? Math.round((data.validatedEntries / data.totalEntries) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
          Tableau de Bord Analytique {fiscalYear ? `— ${fiscalYear.name || fiscalYear.code}` : ''}
        </h2>
        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
          <BarChart3 className="w-4 h-4 inline mr-1" />
          {data?.totalEntries || 0} écritures
        </span>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[var(--color-text-secondary)] text-sm">Écritures</span>
            <FileText className="w-4 h-4 text-[var(--color-primary)]" />
          </div>
          <p className="text-xl font-bold">{data?.totalEntries || 0}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">{data?.draftEntries || 0} brouillons</p>
        </div>
        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[var(--color-text-secondary)] text-sm">Validées</span>
            <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
          </div>
          <p className="text-xl font-bold text-[var(--color-success)]">{pctValidated}%</p>
          <p className="text-xs text-[var(--color-text-secondary)]">{data?.validatedEntries || 0} sur {data?.totalEntries || 0}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[var(--color-text-secondary)] text-sm">Comptes utilisés</span>
            <TrendingUp className="w-4 h-4 text-[var(--color-primary)]" />
          </div>
          <p className="text-xl font-bold">{data?.accountsUsed || 0}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">{data?.journalsUsed.length || 0} journaux</p>
        </div>
        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[var(--color-text-secondary)] text-sm">Écart D/C</span>
            {data && data.ecart === 0 ? (
              <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[var(--color-error)]" />
            )}
          </div>
          <p className={`text-xl font-bold ${data && data.ecart === 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
            {formatCurrency(data?.ecart || 0)}
          </p>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-4 border">
          <p className="text-xs text-[var(--color-text-secondary)] mb-1">Total Débit</p>
          <p className="text-lg font-bold font-mono">{formatCurrency(data?.totalDebit || 0)}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border">
          <p className="text-xs text-[var(--color-text-secondary)] mb-1">Total Crédit</p>
          <p className="text-lg font-bold font-mono">{formatCurrency(data?.totalCredit || 0)}</p>
        </div>
      </div>

      {/* Monthly distribution */}
      {data && data.entriesByMonth.length > 0 && (
        <div className="bg-white rounded-lg p-4 border">
          <h3 className="font-medium mb-3">Répartition mensuelle</h3>
          <div className="space-y-2">
            {data.entriesByMonth.map(m => {
              const maxCount = Math.max(...data.entriesByMonth.map(x => x.count));
              const barWidth = maxCount > 0 ? (m.count / maxCount) * 100 : 0;
              return (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="text-sm font-mono text-[var(--color-text-secondary)] w-20">{m.month}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4">
                    <div
                      className="bg-[var(--color-primary)] h-4 rounded-full transition-all"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">{m.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Journals used */}
      {data && data.journalsUsed.length > 0 && (
        <div className="bg-white rounded-lg p-4 border">
          <h3 className="font-medium mb-3">Journaux utilisés</h3>
          <div className="flex flex-wrap gap-2">
            {data.journalsUsed.map(j => (
              <span key={j} className="px-3 py-1 bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)] rounded-full text-sm font-medium">
                {j}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium mb-3">Taux de validation</h4>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-[var(--color-success)] h-2 rounded-full transition-all"
            style={{ width: `${pctValidated}%` }}
          />
        </div>
        <p className="text-sm text-gray-500 mt-2">{pctValidated}% des écritures validées</p>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={onComplete}
          className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]"
        >
          <CheckCircle className="w-4 h-4 inline mr-1" />
          Valider
        </button>
      </div>
    </div>
  );
};

export default DashboardAnalyticsSection;
