// @ts-nocheck
import { formatCurrency } from '@/utils/formatters';
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  Book, Search, Filter, Calendar, Plus,
  Eye, FileText, Check, Clock, AlertCircle, TrendingUp,
  TrendingDown, ArrowUpRight, ArrowDownLeft, RefreshCw,
  Building2, Truck, Monitor, Shield, Package, Settings
} from 'lucide-react';
import { ModernCard, CardHeader, CardBody } from '../../components/ui/ModernCard';
import ModernButton from '../../components/ui/ModernButton';
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';
import ExportMenu from '../../components/shared/ExportMenu';
import { assetJournalConfig, getAssetCategoryByCode, getAccountMapping } from '../../config/assetJournalConfig';

const AssetsJournal: React.FC = () => {
  const { t } = useLanguage();
  const [selectedEntry, setSelectedEntry] = useState<number | null>(null);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'journal' | 'table'>('journal');
  const [showPeriodModal, setShowPeriodModal] = useState(false);

  const categoryIcons: { [key: string]: React.ComponentType<{ className?: string }> } = {
    '213-LA': Monitor,
    '212-DL': FileText,
    '211-FD': Settings,
    '221-TB': Building2,
    '222-TNB': Building2,
    '231-BAT': Building2,
    '232-IT': Settings,
    '234-AGT': Package,
    '234-SS': Shield,
    '241-MT': Settings,
    '245-VHL': Truck,
    '244-MOB': Package,
    '244-EM': Package,
    '244-DS': Package
  };

  // Load real journal entries related to assets (class 2, 28, 681) from DataAdapter
  const { adapter } = useData();
  const [dbEntries, setDbEntries] = useState<any[]>([]);

  useEffect(() => {
    if (!adapter) return;
    adapter.getAll('journalEntries').then((entries: any[]) => {
      setDbEntries(entries || []);
    }).catch(() => setDbEntries([]));
  }, [adapter]);

  // Filter and map journal entries related to immobilisations
  const journalEntries = useMemo(() => {
    const assetAccountPrefixes = ['2', '28', '681', '775', '462', '1052', '6816', '291'];

    return dbEntries
      .filter(entry => {
        // Keep entries that have at least one line touching asset accounts
        return (entry.lines || []).some((line: any) =>
          assetAccountPrefixes.some(prefix => line.accountCode?.startsWith(prefix))
        );
      })
      .sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''))
      .map((entry: any, idx: number) => {
        // Determine entry type from account codes
        const lines = entry.lines || [];
        const hasClass2Debit = lines.some((l: any) => l.accountCode?.startsWith('2') && !l.accountCode?.startsWith('28') && (l.debit || 0) > 0);
        const hasClass28 = lines.some((l: any) => l.accountCode?.startsWith('28'));
        const has681 = lines.some((l: any) => l.accountCode?.startsWith('681'));
        const has775 = lines.some((l: any) => l.accountCode?.startsWith('775'));

        let type = 'acquisition';
        if (has681 || (hasClass28 && !has775)) type = 'depreciation';
        if (has775) type = 'disposal';
        if (lines.some((l: any) => l.accountCode?.startsWith('1052'))) type = 'revaluation';

        return {
          id: idx + 1,
          date: entry.date || '',
          reference: entry.entryNumber || `JI-${idx + 1}`,
          description: entry.label || '—',
          type,
          entries: lines.map((l: any) => ({
            account: l.accountCode || '',
            label: l.accountName || l.label || '',
            debit: l.debit || 0,
            credit: l.credit || 0,
          })),
          status: entry.status || 'validated',
          totalDebit: entry.totalDebit || lines.reduce((s: number, l: any) => s + (l.debit || 0), 0),
          totalCredit: entry.totalCredit || lines.reduce((s: number, l: any) => s + (l.credit || 0), 0),
        };
      });
  }, [dbEntries]);

  const getTypeConfig = (type: string) => {
    const configs = {
      acquisition: { label: 'Acquisition', icon: Plus, color: 'green' },
      depreciation: { label: 'Amortissement', icon: TrendingDown, color: 'orange' },
      disposal: { label: 'Cession', icon: ArrowUpRight, color: 'red' },
      revaluation: { label: 'Réévaluation', icon: TrendingUp, color: 'primary' },
      transfer: { label: 'Transfert', icon: RefreshCw, color: 'blue' },
      provision: { label: 'Provision', icon: AlertCircle, color: 'yellow' }
    };
    return configs[type as keyof typeof configs] || { label: type, icon: FileText, color: 'gray' };
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      validated: { bg: 'bg-green-500/10', text: 'text-green-500', icon: Check, label: t('accounting.validated') },
      pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', icon: Clock, label: t('status.pending') },
      draft: { bg: 'bg-gray-500/10', text: 'text-gray-700', icon: FileText, label: t('accounting.draft') }
    };
    const config = configs[status as keyof typeof configs];
    return (
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${config.bg} ${config.text}`}>
        <config.icon className="w-3 h-3" />
        <span className="text-xs font-medium">{config.label}</span>
      </div>
    );
  };

  const filteredEntries = journalEntries.filter(entry => {
    const matchesType = filterType === 'all' || entry.type === filterType;
    const matchesSearch = entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          entry.reference.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text-primary)]">
            Journal des Immobilisations - {assetJournalConfig.company}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Période: {new Date(assetJournalConfig.period.from).toLocaleDateString('fr-FR')} - {new Date(assetJournalConfig.period.to).toLocaleDateString('fr-FR')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ModernButton
            variant={viewMode === 'journal' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('journal')}
          >
            <Book className="w-4 h-4 mr-1" />
            Journal
          </ModernButton>
          <ModernButton
            variant={viewMode === 'table' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            <FileText className="w-4 h-4 mr-1" />
            Table
          </ModernButton>
          <ExportMenu
            data={filteredEntries}
            filename="journal_immobilisations"
            columns={{
              date: 'Date',
              reference: 'Référence',
              description: 'Description',
              type: 'Type',
              status: 'Statut',
              totalDebit: 'Total Débit',
              totalCredit: 'Total Crédit'
            }}
            buttonText="Exporter"
            buttonVariant="outline"
          />
        </div>
      </div>

      {/* Filters */}
      <ModernCard>
        <CardBody>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -tranprimary-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
                <input
                  type="text"
                  placeholder="Rechercher par description ou référence..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Tous les types</option>
              <option value="acquisition">Acquisitions</option>
              <option value="depreciation">Amortissements</option>
              <option value="disposal">Cessions</option>
              <option value="revaluation">Réévaluations</option>
              <option value="transfer">Transferts</option>
              <option value="provision">Provisions</option>
            </select>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Toutes les catégories</option>
              {assetJournalConfig.categories.map(cat => (
                <option key={cat.code} value={cat.code}>
                  {cat.code} - {cat.description}
                </option>
              ))}
            </select>
            <ModernButton
              variant="outline"
              size="sm"
              onClick={() => setShowPeriodModal(true)}
            >
              <Calendar className="w-4 h-4 mr-1" />
              Période
            </ModernButton>
          </div>
        </CardBody>
      </ModernCard>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">Écritures immo</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)] mt-1">{journalEntries.length}</p>
              </div>
              <Book className="w-8 h-8 text-[var(--color-text-secondary)] opacity-20" />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">Total débit</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)] mt-1">{formatCurrency(journalEntries.reduce((s, e) => s + e.totalDebit, 0))} FCFA</p>
              </div>
              <ArrowUpRight className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">Total crédit</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)] mt-1">{formatCurrency(journalEntries.reduce((s, e) => s + e.totalCredit, 0))} FCFA</p>
              </div>
              <ArrowDownLeft className="w-8 h-8 text-red-500 opacity-50" />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">À valider</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)] mt-1">{journalEntries.filter(e => e.status === 'draft' || e.status === 'pending').length}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500 opacity-50" />
            </div>
          </CardBody>
        </ModernCard>
      </div>

      {/* View Mode Content */}
      {viewMode === 'table' && (
        <ModernCard>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Configuration des Comptes par Catégorie
            </h2>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left p-2">Catégorie</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-center p-2">Amortissement</th>
                    <th className="text-center p-2">Amort. Cumulé</th>
                    <th className="text-center p-2">Additions</th>
                    <th className="text-center p-2">Cessions</th>
                    <th className="text-center p-2">Réévaluations</th>
                    <th className="text-center p-2">Provisions</th>
                    <th className="text-right p-2">{t('accounting.balance')}</th>
                  </tr>
                </thead>
                <tbody>
                  {assetJournalConfig.categories
                    .filter(cat => selectedCategory === 'all' || cat.code === selectedCategory)
                    .map((category) => {
                      const Icon = categoryIcons[category.code] || FileText;
                      return (
                        <tr key={category.code} className="border-b border-[var(--color-border)] hover:bg-[var(--color-hover)]">
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-[var(--color-text-secondary)]" />
                              <span className="font-mono text-xs">{category.code}</span>
                            </div>
                          </td>
                          <td className="p-2 text-sm">{category.description}</td>
                          <td className="p-2 text-center font-mono text-xs">
                            {category.accounts.depreciationHistorical.account}
                          </td>
                          <td className="p-2 text-center font-mono text-xs">
                            {category.accounts.depreciationRevaluations.account !== '0'
                              ? category.accounts.depreciationRevaluations.account
                              : '-'}
                          </td>
                          <td className="p-2 text-center font-mono text-xs">
                            {category.accounts.additions.account}
                          </td>
                          <td className="p-2 text-center font-mono text-xs">
                            {category.accounts.disposalsProceeds.account}
                          </td>
                          <td className="p-2 text-center font-mono text-xs">
                            {category.accounts.revaluationsAccumulated.account}
                          </td>
                          <td className="p-2 text-center font-mono text-xs">
                            {category.accounts.impairmentProvision?.account !== '0'
                              ? category.accounts.impairmentProvision?.account
                              : '-'}
                          </td>
                          <td className="p-2 text-right">
                            {category.code === '234-SS' ? (
                              <div>
                                <span className="text-green-500 font-semibold">
                                  {formatCurrency(category.accounts.balanceSheet750.amount)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[var(--color-text-secondary)]">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--color-border)] font-semibold">
                    <td colSpan={8} className="p-2 text-right">Total YTD:</td>
                    <td className="p-2 text-right">
                      <div>
                        <div className="text-green-500">
                          {formatCurrency(assetJournalConfig.totals.ytd)}
                        </div>
                        <div className="text-red-500 text-sm">
                          ({formatCurrency(Math.abs(assetJournalConfig.totals.adjustment))})
                        </div>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardBody>
        </ModernCard>
      )}

      {/* Journal Entries */}
      {viewMode === 'journal' && (
      <div className="space-y-4">
        {filteredEntries.map((entry) => {
          const typeConfig = getTypeConfig(entry.type);
          const Icon = typeConfig.icon;
          const isExpanded = selectedEntry === entry.id;

          return (
            <ModernCard
              key={entry.id}
              className={`cursor-pointer transition-all ${
                isExpanded ? 'ring-2 ring-blue-500/20' : ''
              }`}
            >
              <CardBody>
                <div className="space-y-4">
                  {/* Entry Header */}
                  <div
                    className="flex items-center justify-between"
                    onClick={() => setSelectedEntry(isExpanded ? null : entry.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg bg-${typeConfig.color}-500/10 flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 text-${typeConfig.color}-500`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-[var(--color-text-primary)]">
                            {entry.description}
                          </h3>
                          <span className="text-xs font-mono text-[var(--color-text-secondary)]">
                            {entry.reference}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-sm text-[var(--color-text-secondary)]">
                            {entry.date}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded bg-${typeConfig.color}-500/10 text-${typeConfig.color}-500`}>
                            {typeConfig.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">
                          €{(entry.totalDebit / 1000).toFixed(1)}K
                        </p>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {entry.entries.length} lignes
                        </p>
                      </div>
                      {getStatusBadge(entry.status)}
                    </div>
                  </div>

                  {/* Entry Details */}
                  {isExpanded && (
                    <div className="pt-4 border-t border-[var(--color-border)]">
                      <table className="w-full">
                        <thead>
                          <tr className="text-xs text-[var(--color-text-secondary)]">
                            <th className="text-left pb-2">{t('accounting.account')}</th>
                            <th className="text-left pb-2">{t('accounting.label')}</th>
                            <th className="text-right pb-2">{t('accounting.debit')}</th>
                            <th className="text-right pb-2">{t('accounting.credit')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entry.entries.map((line, index) => (
                            <tr key={index} className="border-t border-[var(--color-border)]">
                              <td className="py-2 text-sm font-mono">{line.account}</td>
                              <td className="py-2 text-sm">{line.label}</td>
                              <td className="py-2 text-sm text-right font-medium">
                                {line.debit > 0 && `€${formatCurrency(line.debit)}`}
                              </td>
                              <td className="py-2 text-sm text-right font-medium">
                                {line.credit > 0 && `€${formatCurrency(line.credit)}`}
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t-2 border-[var(--color-border)] font-semibold">
                            <td className="pt-2" colSpan={2}>Total</td>
                            <td className="pt-2 text-sm text-right">
                              {formatCurrency(entry.totalDebit)}
                            </td>
                            <td className="pt-2 text-sm text-right">
                              {formatCurrency(entry.totalCredit)}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-2 mt-4">
                        <ModernButton variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          Détails
                        </ModernButton>
                        {entry.status === 'draft' && (
                          <ModernButton variant="primary" size="sm">
                            <Check className="w-4 h-4 mr-1" />
                            Valider
                          </ModernButton>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardBody>
            </ModernCard>
          );
        })}
      </div>
      )}

      {/* Modal de sélection de période */}
      <PeriodSelectorModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        onApply={(newDateRange) => {
          setDateRange(newDateRange);
        }}
        initialDateRange={dateRange}
      />
    </div>
  );
};

export default AssetsJournal;