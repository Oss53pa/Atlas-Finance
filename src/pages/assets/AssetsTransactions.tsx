
import React, { useState, useEffect, useMemo } from 'react';
import PageHeaderActions from '../../components/ui/PageHeaderActions';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '../../utils/formatters';
import {
  ArrowLeftRight, Search, Filter, Calendar,
  Eye, Edit2, Trash2, Plus, TrendingUp, TrendingDown,
  DollarSign, Clock, CheckCircle, AlertCircle, Building,
  FileText, Hash, User, CreditCard, Package, ChevronLeft,
  ChevronRight, Settings, MoreVertical, X, Check
} from 'lucide-react';
import { ModernCard, CardHeader, CardBody } from '../../components/ui/ModernCard';
import ModernButton from '../../components/ui/ModernButton';
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';
import ExportMenu from '../../components/shared/ExportMenu';
import { useData } from '../../contexts/DataContext';

interface Transaction {
  id: number;
  dateTransaction: string;
  typeTransaction: string;
  designation: string;
  numeroImmobilisation: string;
  fournisseur: string;
  numeroDocument: string;
  montant: number;
  categorieActifs: string;
  dureeVie: string;
  dureeVieAnnees: number;
  valeurResiduelle: number;
  produitCession: number;
  codeErreur: string;
  categorie: string;
  identifiantDateTransaction: string;
  dateTransactionPrecedente: string;
  dateTransactionSuivante: string;
  dateFinAmortissement: string;
  dateDebutAmortCumuleAnnuel: string;
  dateFinAmortCumuleAnnuel: string;
  nombreMoisAmortCumuleAnnuel: number;
  montantTransaction: number;
  coutHistorique: number;
  dureeVieActuelle: number;
  valeurResiduelleActuelle: number;
  coutEstimePrecedent: number;
  valeurResiduellePrecedente: number;
  dureeViePrecedente: number;
  amortissementCumuleActuel: number;
  valeurNetteComptableActuelle: number;
  amortissementCumuleCout: number;
  amortissementCumuleReevaluation: number;
  amortissementCumuleReevalExercPrec: number;
  reevaluationPrecedente: number;
  surplusReevaluation: number;
  reevaluationActuelle: number;
  depreciationPrecedente: number;
  valeurDepreciation: number;
  profitPerteCession: number;
  amortissementTotalCumuleAnnuel: number;
  amortissementTotalCumuleAnnuelCout: number;
  amortissementAnnuelCout: number;
  amortCumuleSoldeCoutExercPrec: number;
  amortCumuleCoutExercPrec: number;
  amortissementCoutParTransaction: number;
  amortissementTotalCumuleMois: number;
  amortCumuleTotalFinMoisPrec: number;
  amortissementTotalCumuleMoisCout: number;
  amortissementMoisCout: number;
  amortCumuleCoutFinMoisPrec: number;
}

const AssetsTransactions: React.FC = () => {
  const [selectedTransaction, setSelectedTransaction] = useState<number | null>(null);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState({
    dateTransaction: true,
    typeTransaction: true,
    designation: true,
    numeroImmobilisation: true,
    // Fournisseur / N° document : non fournis par l'import (toujours « — ») →
    // masqués par défaut, réactivables via le sélecteur de colonnes.
    fournisseur: false,
    numeroDocument: false,
    montant: true,
    categorieActifs: true,
    dureeVieAnnees: false,
    valeurResiduelle: false,
    valeurNetteComptableActuelle: true,
    amortissementCumuleActuel: false,
    coutHistorique: false,
    produitCession: false,
    profitPerteCession: false
  });

  const { adapter } = useData();
  const { t } = useLanguage();
  const [dbAssets, setDbAssets] = useState<any[]>([]);

  // Load assets from DataAdapter
  useEffect(() => {
    if (!adapter) return;
    adapter.getAll('assets').then((assets: any[]) => setDbAssets(assets || [])).catch(() => setDbAssets([]));
  }, [adapter]);

  // Build transactions from real asset data
  const transactions: Transaction[] = useMemo(() => {
    return dbAssets.map((asset, idx) => ({
      id: idx + 1,
      dateTransaction: asset.acquisitionDate || asset.dateAcquisition || '',
      typeTransaction: asset.disposalDate ? 'Cession' : 'Acquisition',
      designation: asset.name || asset.designation || asset.code || '—',
      numeroImmobilisation: asset.code || asset.id?.substring(0, 12) || `IMM-${idx + 1}`,
      fournisseur: asset.supplier || asset.fournisseur || '—',
      numeroDocument: asset.invoiceNumber || asset.documentNumber || '—',
      montant: asset.acquisitionValue || 0,
      categorieActifs: asset.category || '—',
      dureeVie: asset.usefulLife ? t('assetsTransactions.years', { count: String(asset.usefulLife) }) : '—',
      dureeVieAnnees: asset.usefulLife || 0,
      valeurResiduelle: asset.residualValue || 0,
      produitCession: asset.disposalPrice || 0,
      codeErreur: '',
      categorie: asset.accountCode?.substring(0, 2) || 'IMMO',
      identifiantDateTransaction: `TRX-${asset.id?.substring(0, 8) || idx}`,
      dateTransactionPrecedente: '',
      dateTransactionSuivante: '',
      dateFinAmortissement: asset.usefulLife && asset.acquisitionDate
        ? new Date(new Date(asset.acquisitionDate).getFullYear() + asset.usefulLife, new Date(asset.acquisitionDate).getMonth(), new Date(asset.acquisitionDate).getDate()).toISOString().split('T')[0]
        : '',
      dateDebutAmortCumuleAnnuel: asset.acquisitionDate ? asset.acquisitionDate.substring(0, 4) + '-01-01' : '',
      dateFinAmortCumuleAnnuel: asset.acquisitionDate ? asset.acquisitionDate.substring(0, 4) + '-12-31' : '',
      nombreMoisAmortCumuleAnnuel: 12,
      montantTransaction: asset.acquisitionValue || 0,
      coutHistorique: asset.acquisitionValue || 0,
      dureeVieActuelle: asset.usefulLife || 0,
      valeurResiduelleActuelle: asset.residualValue || 0,
      coutEstimePrecedent: 0,
      valeurResiduellePrecedente: 0,
      dureeViePrecedente: 0,
      // VNC = brut − amortissements CUMULÉS (cumulDepreciation, renseigné à l'import).
      // (residualValue=0 partout → l'ancien calcul donnait VNC=0 et amort=brut, FAUX.)
      amortissementCumuleActuel: asset.cumulDepreciation || 0,
      valeurNetteComptableActuelle: (asset.acquisitionValue || 0) - (asset.cumulDepreciation || 0),
      amortissementCumuleCout: asset.cumulDepreciation || 0,
      amortissementCumuleReevaluation: 0,
      amortissementCumuleReevalExercPrec: 0,
      reevaluationPrecedente: 0,
      surplusReevaluation: 0,
      reevaluationActuelle: 0,
      depreciationPrecedente: 0,
      valeurDepreciation: 0,
      profitPerteCession: 0,
      amortissementTotalCumuleAnnuel: asset.usefulLife > 0 ? ((asset.acquisitionValue || 0) - (asset.residualValue || 0)) / asset.usefulLife : 0,
      amortissementTotalCumuleAnnuelCout: asset.usefulLife > 0 ? ((asset.acquisitionValue || 0) - (asset.residualValue || 0)) / asset.usefulLife : 0,
      amortissementAnnuelCout: asset.usefulLife > 0 ? ((asset.acquisitionValue || 0) - (asset.residualValue || 0)) / asset.usefulLife : 0,
      amortCumuleSoldeCoutExercPrec: 0,
      amortCumuleCoutExercPrec: 0,
      amortissementCoutParTransaction: asset.usefulLife > 0 ? ((asset.acquisitionValue || 0) - (asset.residualValue || 0)) / (asset.usefulLife * 12) : 0,
      amortissementTotalCumuleMois: asset.usefulLife > 0 ? ((asset.acquisitionValue || 0) - (asset.residualValue || 0)) / (asset.usefulLife * 12) : 0,
      amortCumuleTotalFinMoisPrec: 0,
      amortissementTotalCumuleMoisCout: asset.usefulLife > 0 ? ((asset.acquisitionValue || 0) - (asset.residualValue || 0)) / (asset.usefulLife * 12) : 0,
      amortissementMoisCout: asset.usefulLife > 0 ? ((asset.acquisitionValue || 0) - (asset.residualValue || 0)) / (asset.usefulLife * 12) : 0,
      amortCumuleCoutFinMoisPrec: 0,
    }));
  }, [dbAssets, t]);

  const getStatusBadge = (type: string) => {
    const config = {
      'Acquisition': { bg: 'bg-green-500/10', text: 'text-green-500', icon: Plus },
      'Cession': { bg: 'bg-red-500/10', text: 'text-red-500', icon: TrendingDown },
      'Réévaluation': { bg: 'bg-primary-500/10', text: 'text-primary-500', icon: TrendingUp },
      'Transfert': { bg: 'bg-blue-500/10', text: 'text-blue-500', icon: ArrowLeftRight },
      'Dépréciation': { bg: 'bg-orange-500/10', text: 'text-orange-500', icon: AlertCircle }
    };
    const { bg, text, icon: Icon } = config[type as keyof typeof config] || {
      bg: 'bg-gray-500/10',
      text: 'text-gray-700',
      icon: FileText
    };
    // La valeur stockée reste stable ('Acquisition', 'Cession'…) ; seul
    // l'affichage est traduit.
    const TYPE_KEY: Record<string, string> = {
      Acquisition: 'assetsTransactions.typeAcquisition',
      Cession: 'assetsTransactions.typeDisposal',
      'Réévaluation': 'assetsTransactions.typeRevaluation',
      Transfert: 'assetsTransactions.typeTransfer',
      'Dépréciation': 'assetsTransactions.typeImpairment',
    };
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${bg} ${text}`}>
        <Icon className="w-3 h-3" />
        <span className="text-xs font-medium">{TYPE_KEY[type] ? t(TYPE_KEY[type]) : type}</span>
      </div>
    );
  };

  // Summary stats derived from real asset data (no fabricated counts)
  const summaryStats = useMemo(() => {
    const acquisitions = transactions.filter(t => t.typeTransaction === 'Acquisition').length;
    const cessions = transactions.filter(t => t.typeTransaction === 'Cession').length;
    const vncTotale = transactions.reduce((sum, t) => sum + (t.valeurNetteComptableActuelle || 0), 0);
    const amortCumule = transactions.reduce((sum, t) => sum + (t.amortissementCumuleActuel || 0), 0);
    return { acquisitions, cessions, vncTotale, amortCumule };
  }, [transactions]);

  const filteredTransactions = transactions.filter(t => {
    const matchesType = filterType === 'all' || t.typeTransaction === filterType;
    const matchesSearch =
      t.numeroImmobilisation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.fournisseur.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.numeroDocument.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.categorieActifs.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Libellés résolus au rendu (pas de table figée au chargement du module).
  const columnDefinitions = [
    { key: 'dateTransaction', label: t('assetsTransactions.colDate'), width: 'w-24' },
    { key: 'typeTransaction', label: t('assetsTransactions.colType'), width: 'w-32' },
    { key: 'designation', label: t('assetsTransactions.colDesignation'), width: 'w-48' },
    { key: 'numeroImmobilisation', label: t('assetsTransactions.colAssetNumber'), width: 'w-36' },
    { key: 'fournisseur', label: t('assetsTransactions.colSupplier'), width: 'w-32' },
    { key: 'numeroDocument', label: t('assetsTransactions.colDocument'), width: 'w-28' },
    { key: 'montant', label: t('assetsTransactions.colAmount'), width: 'w-24', align: 'text-right' },
    { key: 'categorieActifs', label: t('assetsTransactions.colCategory'), width: 'w-32' },
    { key: 'dureeVieAnnees', label: t('assetsTransactions.colUsefulLife'), width: 'w-20', align: 'text-center' },
    { key: 'valeurResiduelle', label: t('assetsTransactions.colResidual'), width: 'w-24', align: 'text-right' },
    { key: 'valeurNetteComptableActuelle', label: t('assetsTransactions.colNbv'), width: 'w-24', align: 'text-right' },
    { key: 'amortissementCumuleActuel', label: t('assetsTransactions.colAccumDep'), width: 'w-24', align: 'text-right' },
    { key: 'coutHistorique', label: t('assetsTransactions.colHistoricCost'), width: 'w-24', align: 'text-right' },
    { key: 'produitCession', label: t('assetsTransactions.colDisposalProceeds'), width: 'w-24', align: 'text-right' },
    { key: 'profitPerteCession', label: t('assetsTransactions.colGainLoss'), width: 'w-24', align: 'text-right' }
  ];

  const activeColumns = columnDefinitions.filter(col =>
    visibleColumns[col.key as keyof typeof visibleColumns]
  );


  const handleColumnToggle = (key: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof visibleColumns]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text-primary)]">
            {t('assetsTransactions.title')}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {t('assetsTransactions.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PageHeaderActions />
          <ModernButton
            variant="outline"
            size="sm"
            onClick={() => setShowColumnSettings(!showColumnSettings)}
          >
            <Settings className="w-4 h-4 mr-1" />
            {t('assetsTransactions.columns')}
          </ModernButton>
          <ExportMenu
            data={filteredTransactions as unknown as Record<string, unknown>[]}
            filename="transactions_immobilisations"
            columns={{
              dateTransaction: t('assetsTransactions.colDate'),
              typeTransaction: t('assetsTransactions.colType'),
              numeroImmobilisation: t('assetsTransactions.colAssetNumber'),
              fournisseur: t('assetsTransactions.colSupplier'),
              numeroDocument: t('assetsTransactions.colDocument'),
              montant: t('assetsTransactions.colAmount'),
              categorieActifs: t('assetsTransactions.colCategory'),
              dureeVieAnnees: t('assetsTransactions.colUsefulLife'),
              valeurResiduelle: t('assetsTransactions.colResidual'),
              valeurNetteComptableActuelle: t('assetsTransactions.colNbv'),
              amortissementCumuleActuel: t('assetsTransactions.colAccumDep'),
              coutHistorique: t('assetsTransactions.colHistoricCost'),
              produitCession: t('assetsTransactions.colDisposalProceeds'),
              profitPerteCession: t('assetsTransactions.colGainLoss')
            }}
            buttonText={t('assetsTransactions.export')}
            buttonVariant="outline"
          />
          <ModernButton variant="primary" size="sm">
            <Plus className="w-4 h-4 mr-1" />
            {t('assetsTransactions.newTransaction')}
          </ModernButton>
        </div>
      </div>

      {/* Column Settings */}
      {showColumnSettings && (
        <ModernCard>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{t('assetsTransactions.columnSettings')}</h3>
              <button
                onClick={() => setShowColumnSettings(false)}
                className="p-1 hover:bg-[var(--color-background-subtle)] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {columnDefinitions.map(col => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 cursor-pointer hover:bg-[var(--color-background-subtle)] p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={visibleColumns[col.key as keyof typeof visibleColumns]}
                    onChange={() => handleColumnToggle(col.key)}
                    className="rounded border-[var(--color-border)]"
                  />
                  <span className="text-sm">{col.label}</span>
                </label>
              ))}
            </div>
          </CardBody>
        </ModernCard>
      )}

      {/* Filters */}
      <ModernCard>
        <CardBody>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
                <input
                  type="text"
                  placeholder={t('assetsTransactions.searchPlaceholder')}
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
              <option value="all">{t('assetsTransactions.allTypes')}</option>
              <option value="Acquisition">{t('assetsTransactions.filterAcquisitions')}</option>
              <option value="Cession">{t('assetsTransactions.filterDisposals')}</option>
              <option value="Réévaluation">{t('assetsTransactions.filterRevaluations')}</option>
              <option value="Transfert">{t('assetsTransactions.filterTransfers')}</option>
              <option value="Dépréciation">{t('assetsTransactions.filterImpairments')}</option>
            </select>
            <ModernButton
              variant="outline"
              size="sm"
              onClick={() => setShowPeriodModal(true)}
            >
              <Calendar className="w-4 h-4 mr-1" />
              {t('assetsTransactions.period')}
            </ModernButton>
          </div>
        </CardBody>
      </ModernCard>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">{t('assetsTransactions.kpiAcquisitions')}</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)] mt-1">{summaryStats.acquisitions}</p>
                <p className="text-xs text-green-500 mt-1">{t('assetsTransactions.kpiAcquisitions')}</p>
              </div>
              <Plus className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">{t('assetsTransactions.kpiDisposals')}</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)] mt-1">{summaryStats.cessions}</p>
                <p className="text-xs text-red-500 mt-1">{t('assetsTransactions.kpiDisposals')}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500 opacity-20" />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">{t('assetsTransactions.kpiRevaluations')}</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)] mt-1">—</p>
                <p className="text-xs text-primary-500 mt-1">{t('assetsTransactions.notTrackedAtImport')}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary-500 opacity-20" />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">{t('assetsTransactions.kpiTotalNbv')}</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)] mt-1">{transactions.length ? formatCurrency(summaryStats.vncTotale) : '—'}</p>
                <p className="text-xs text-blue-500 mt-1">{t('assetsTransactions.computedNbv')}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">{t('assetsTransactions.kpiAccumDep')}</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)] mt-1">{transactions.length ? formatCurrency(summaryStats.amortCumule) : '—'}</p>
                <p className="text-xs text-orange-500 mt-1">{t('assetsTransactions.computedDynamically')}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500 opacity-20" />
            </div>
          </CardBody>
        </ModernCard>
      </div>

      {/* Transactions Table */}
      <ModernCard>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  {activeColumns.map(col => (
                    <th
                      key={col.key}
                      className={`py-3 px-2 text-xs font-medium text-[var(--color-text-secondary)] ${col.align || 'text-left'} ${col.width}`}
                    >
                      {col.label}
                    </th>
                  ))}
                  <th className="py-3 px-2 text-center text-xs font-medium text-[var(--color-text-secondary)] w-20">
                    {t('assetsTransactions.colActions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.map((transaction) => (
                  <React.Fragment key={transaction.id}>
                    <tr
                      className="border-b border-[var(--color-border)] hover:bg-[var(--color-background-subtle)] transition-colors cursor-pointer"
                      onClick={() => setExpandedRow(expandedRow === transaction.id ? null : transaction.id)}
                    >
                      {activeColumns.map(col => {
                        const value = transaction[col.key as keyof Transaction];
                        let displayValue: React.ReactNode = value;

                        if (col.key === 'typeTransaction') {
                          displayValue = getStatusBadge(value as string);
                        } else if (col.key === 'dureeVieAnnees') {
                          displayValue = t('assetsTransactions.years', { count: String(value) });
                        } else if (['montant', 'valeurResiduelle', 'valeurNetteComptableActuelle',
                                   'amortissementCumuleActuel', 'coutHistorique', 'produitCession',
                                   'profitPerteCession'].includes(col.key)) {
                          displayValue = formatCurrency(value as number);
                          if (col.key === 'profitPerteCession' && value !== 0) {
                            displayValue = (
                              <span className={(value as number) > 0 ? 'text-green-500' : 'text-red-500'}>
                                {displayValue}
                              </span>
                            );
                          }
                        }

                        return (
                          <td key={col.key} className={`py-3 px-2 text-sm ${col.align || ''}`}>
                            {displayValue}
                          </td>
                        );
                      })}
                      <td className="py-3 px-2">
                        <div className="flex items-center justify-center gap-1">
                          {/* Œil = ouvrir/fermer le détail de la ligne (le kebab sans action a été retiré). */}
                          <button
                            className="p-1 hover:bg-[var(--color-background)] rounded"
                            title={t(expandedRow === transaction.id ? 'assetsTransactions.closeDetail' : 'assetsTransactions.viewDetail')}
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedRow(expandedRow === transaction.id ? null : transaction.id);
                            }}
                          >
                            <Eye className="w-4 h-4 text-[var(--color-text-secondary)]" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Row Details */}
                    {expandedRow === transaction.id && (
                      <tr className="bg-[var(--color-background-subtle)]">
                        <td colSpan={activeColumns.length + 1} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
                                {t('assetsTransactions.basicInfo')}
                              </h4>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-[var(--color-text-secondary)]">{t('assetsTransactions.errorCode')}</span>
                                  <span>{transaction.codeErreur || t('assetsTransactions.none')}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-[var(--color-text-secondary)]">{t('assetsTransactions.transactionId')}</span>
                                  <span className="font-mono text-xs">{transaction.identifiantDateTransaction}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-[var(--color-text-secondary)]">{t('assetsTransactions.previousDate')}</span>
                                  <span>{transaction.dateTransactionPrecedente || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-[var(--color-text-secondary)]">{t('assetsTransactions.nextDate')}</span>
                                  <span>{transaction.dateTransactionSuivante || 'N/A'}</span>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
                                {t('assetsTransactions.depreciationSection')}
                              </h4>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-[var(--color-text-secondary)]">{t('assetsTransactions.depEnd')}</span>
                                  <span>{transaction.dateFinAmortissement}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-[var(--color-text-secondary)]">{t('assetsTransactions.depAnnual')}</span>
                                  <span>{formatCurrency(transaction.amortissementAnnuelCout)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-[var(--color-text-secondary)]">{t('assetsTransactions.depMonthly')}</span>
                                  <span>{formatCurrency(transaction.amortissementMoisCout)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-[var(--color-text-secondary)]">{t('assetsTransactions.monthsAccrued')}</span>
                                  <span>{transaction.nombreMoisAmortCumuleAnnuel}</span>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
                                {t('assetsTransactions.valuesSection')}
                              </h4>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-[var(--color-text-secondary)]">{t('assetsTransactions.previousCost')}</span>
                                  <span>{formatCurrency(transaction.coutEstimePrecedent)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-[var(--color-text-secondary)]">{t('assetsTransactions.currentRevaluation')}</span>
                                  <span>{formatCurrency(transaction.reevaluationActuelle)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-[var(--color-text-secondary)]">{t('assetsTransactions.revaluationSurplus')}</span>
                                  <span>{formatCurrency(transaction.surplusReevaluation)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-[var(--color-text-secondary)]">{t('assetsTransactions.impairment')}</span>
                                  <span>{formatCurrency(transaction.valeurDepreciation)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--color-border)]">
            <div className="text-sm text-[var(--color-text-secondary)]">
              {t('assetsTransactions.pagination', {
                from: String(((currentPage - 1) * itemsPerPage) + 1),
                to: String(Math.min(currentPage * itemsPerPage, filteredTransactions.length)),
                total: String(filteredTransactions.length),
              })}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 hover:bg-[var(--color-background-subtle)] rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                      currentPage === i + 1
                        ? 'bg-blue-500 text-white'
                        : 'hover:bg-[var(--color-background-subtle)]'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 hover:bg-[var(--color-background-subtle)] rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </CardBody>
      </ModernCard>

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

export default AssetsTransactions;