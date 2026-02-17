import React, { useState } from 'react';
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

interface Transaction {
  id: number;
  dateTransaction: string;
  typeTransaction: string;
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
    numeroImmobilisation: true,
    fournisseur: true,
    numeroDocument: true,
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

  const transactions: Transaction[] = [
    {
      id: 1,
      dateTransaction: '2024-01-15',
      typeTransaction: 'Acquisition',
      numeroImmobilisation: 'IMM-2024-001',
      fournisseur: 'HP Enterprise',
      numeroDocument: 'FAC-2024-0156',
      montant: 25000,
      categorieActifs: 'Matériel informatique',
      dureeVie: '3 ans',
      dureeVieAnnees: 3,
      valeurResiduelle: 2500,
      produitCession: 0,
      codeErreur: '',
      categorie: 'INFO',
      identifiantDateTransaction: 'TRX-20240115-001',
      dateTransactionPrecedente: '',
      dateTransactionSuivante: '2024-02-15',
      dateFinAmortissement: '2027-01-15',
      dateDebutAmortCumuleAnnuel: '2024-01-01',
      dateFinAmortCumuleAnnuel: '2024-12-31',
      nombreMoisAmortCumuleAnnuel: 12,
      montantTransaction: 25000,
      coutHistorique: 25000,
      dureeVieActuelle: 3,
      valeurResiduelleActuelle: 2500,
      coutEstimePrecedent: 0,
      valeurResiduellePrecedente: 0,
      dureeViePrecedente: 0,
      amortissementCumuleActuel: 0,
      valeurNetteComptableActuelle: 25000,
      amortissementCumuleCout: 0,
      amortissementCumuleReevaluation: 0,
      amortissementCumuleReevalExercPrec: 0,
      reevaluationPrecedente: 0,
      surplusReevaluation: 0,
      reevaluationActuelle: 0,
      depreciationPrecedente: 0,
      valeurDepreciation: 0,
      profitPerteCession: 0,
      amortissementTotalCumuleAnnuel: 7500,
      amortissementTotalCumuleAnnuelCout: 7500,
      amortissementAnnuelCout: 7500,
      amortCumuleSoldeCoutExercPrec: 0,
      amortCumuleCoutExercPrec: 0,
      amortissementCoutParTransaction: 625,
      amortissementTotalCumuleMois: 625,
      amortCumuleTotalFinMoisPrec: 0,
      amortissementTotalCumuleMoisCout: 625,
      amortissementMoisCout: 625,
      amortCumuleCoutFinMoisPrec: 0
    },
    {
      id: 2,
      dateTransaction: '2024-01-10',
      typeTransaction: 'Cession',
      numeroImmobilisation: 'IMM-2021-045',
      fournisseur: 'Client externe',
      numeroDocument: 'CES-2024-001',
      montant: 8500,
      categorieActifs: 'Matériel de transport',
      dureeVie: '5 ans',
      dureeVieAnnees: 5,
      valeurResiduelle: 3000,
      produitCession: 8500,
      codeErreur: '',
      categorie: 'TRANS',
      identifiantDateTransaction: 'TRX-20240110-001',
      dateTransactionPrecedente: '2023-12-10',
      dateTransactionSuivante: '',
      dateFinAmortissement: '2026-01-10',
      dateDebutAmortCumuleAnnuel: '2024-01-01',
      dateFinAmortCumuleAnnuel: '2024-01-10',
      nombreMoisAmortCumuleAnnuel: 0.33,
      montantTransaction: 18000,
      coutHistorique: 18000,
      dureeVieActuelle: 5,
      valeurResiduelleActuelle: 3000,
      coutEstimePrecedent: 18000,
      valeurResiduellePrecedente: 3000,
      dureeViePrecedente: 5,
      amortissementCumuleActuel: 10800,
      valeurNetteComptableActuelle: 7200,
      amortissementCumuleCout: 10800,
      amortissementCumuleReevaluation: 0,
      amortissementCumuleReevalExercPrec: 10800,
      reevaluationPrecedente: 0,
      surplusReevaluation: 0,
      reevaluationActuelle: 0,
      depreciationPrecedente: 0,
      valeurDepreciation: 0,
      profitPerteCession: 1300,
      amortissementTotalCumuleAnnuel: 100,
      amortissementTotalCumuleAnnuelCout: 100,
      amortissementAnnuelCout: 3000,
      amortCumuleSoldeCoutExercPrec: 10800,
      amortCumuleCoutExercPrec: 10800,
      amortissementCoutParTransaction: 100,
      amortissementTotalCumuleMois: 100,
      amortCumuleTotalFinMoisPrec: 10800,
      amortissementTotalCumuleMoisCout: 100,
      amortissementMoisCout: 250,
      amortCumuleCoutFinMoisPrec: 10800
    },
    {
      id: 3,
      dateTransaction: '2024-01-08',
      typeTransaction: 'Réévaluation',
      numeroImmobilisation: 'IMM-2020-001',
      fournisseur: 'N/A',
      numeroDocument: 'REV-2024-001',
      montant: 150000,
      categorieActifs: 'Bâtiments',
      dureeVie: '20 ans',
      dureeVieAnnees: 20,
      valeurResiduelle: 50000,
      produitCession: 0,
      codeErreur: '',
      categorie: 'IMMO',
      identifiantDateTransaction: 'TRX-20240108-001',
      dateTransactionPrecedente: '2023-01-08',
      dateTransactionSuivante: '2025-01-08',
      dateFinAmortissement: '2040-01-08',
      dateDebutAmortCumuleAnnuel: '2024-01-01',
      dateFinAmortCumuleAnnuel: '2024-12-31',
      nombreMoisAmortCumuleAnnuel: 12,
      montantTransaction: 150000,
      coutHistorique: 1000000,
      dureeVieActuelle: 20,
      valeurResiduelleActuelle: 50000,
      coutEstimePrecedent: 1000000,
      valeurResiduellePrecedente: 50000,
      dureeViePrecedente: 20,
      amortissementCumuleActuel: 200000,
      valeurNetteComptableActuelle: 950000,
      amortissementCumuleCout: 200000,
      amortissementCumuleReevaluation: 0,
      amortissementCumuleReevalExercPrec: 150000,
      reevaluationPrecedente: 0,
      surplusReevaluation: 150000,
      reevaluationActuelle: 150000,
      depreciationPrecedente: 0,
      valeurDepreciation: 0,
      profitPerteCession: 0,
      amortissementTotalCumuleAnnuel: 50000,
      amortissementTotalCumuleAnnuelCout: 50000,
      amortissementAnnuelCout: 50000,
      amortCumuleSoldeCoutExercPrec: 150000,
      amortCumuleCoutExercPrec: 150000,
      amortissementCoutParTransaction: 4167,
      amortissementTotalCumuleMois: 4167,
      amortCumuleTotalFinMoisPrec: 200000,
      amortissementTotalCumuleMoisCout: 4167,
      amortissementMoisCout: 4167,
      amortCumuleCoutFinMoisPrec: 200000
    }
  ];

  const getStatusBadge = (type: string) => {
    const config = {
      'Acquisition': { bg: 'bg-green-500/10', text: 'text-green-500', icon: Plus },
      'Cession': { bg: 'bg-red-500/10', text: 'text-red-500', icon: TrendingDown },
      'Réévaluation': { bg: 'bg-purple-500/10', text: 'text-purple-500', icon: TrendingUp },
      'Transfert': { bg: 'bg-blue-500/10', text: 'text-blue-500', icon: ArrowLeftRight },
      'Dépréciation': { bg: 'bg-orange-500/10', text: 'text-orange-500', icon: AlertCircle }
    };
    const { bg, text, icon: Icon } = config[type as keyof typeof config] || {
      bg: 'bg-gray-500/10',
      text: 'text-gray-700',
      icon: FileText
    };
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${bg} ${text}`}>
        <Icon className="w-3 h-3" />
        <span className="text-xs font-medium">{type}</span>
      </div>
    );
  };

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

  const columnDefinitions = [
    { key: 'dateTransaction', label: 'Date transaction', width: 'w-24' },
    { key: 'typeTransaction', label: 'Type', width: 'w-32' },
    { key: 'numeroImmobilisation', label: 'N° Immobilisation', width: 'w-36' },
    { key: 'fournisseur', label: 'Fournisseur', width: 'w-32' },
    { key: 'numeroDocument', label: 'N° Document', width: 'w-28' },
    { key: 'montant', label: 'Montant', width: 'w-24', align: 'text-right' },
    { key: 'categorieActifs', label: 'Catégorie', width: 'w-32' },
    { key: 'dureeVieAnnees', label: 'Durée vie', width: 'w-20', align: 'text-center' },
    { key: 'valeurResiduelle', label: 'Val. résiduelle', width: 'w-24', align: 'text-right' },
    { key: 'valeurNetteComptableActuelle', label: 'VNC actuelle', width: 'w-24', align: 'text-right' },
    { key: 'amortissementCumuleActuel', label: 'Amort. cumulé', width: 'w-24', align: 'text-right' },
    { key: 'coutHistorique', label: 'Coût historique', width: 'w-24', align: 'text-right' },
    { key: 'produitCession', label: 'Produit cession', width: 'w-24', align: 'text-right' },
    { key: 'profitPerteCession', label: 'Profit/Perte', width: 'w-24', align: 'text-right' }
  ];

  const activeColumns = columnDefinitions.filter(col =>
    visibleColumns[col.key as keyof typeof visibleColumns]
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

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
            Transactions d'Immobilisations
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Historique complet des mouvements d'actifs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ModernButton
            variant="outline"
            size="sm"
            onClick={() => setShowColumnSettings(!showColumnSettings)}
          >
            <Settings className="w-4 h-4 mr-1" />
            Colonnes
          </ModernButton>
          <ExportMenu
            data={filteredTransactions}
            filename="transactions_immobilisations"
            columns={{
              dateTransaction: 'Date',
              typeTransaction: 'Type',
              numeroImmobilisation: 'N° Immobilisation',
              fournisseur: 'Fournisseur',
              numeroDocument: 'N° Document',
              montant: 'Montant',
              categorieActifs: 'Catégorie',
              dureeVieAnnees: 'Durée Vie (ans)',
              valeurResiduelle: 'Valeur Résiduelle',
              valeurNetteComptableActuelle: 'VNC Actuelle',
              amortissementCumuleActuel: 'Amort. Cumulé',
              coutHistorique: 'Coût Historique',
              produitCession: 'Produit Cession',
              profitPerteCession: 'Profit/Perte'
            }}
            buttonText="Exporter"
            buttonVariant="outline"
          />
          <ModernButton variant="primary" size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Nouvelle transaction
          </ModernButton>
        </div>
      </div>

      {/* Column Settings */}
      {showColumnSettings && (
        <ModernCard>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Configuration des colonnes</h3>
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
                  placeholder="Rechercher par N° immob., fournisseur, document..."
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
              <option value="Acquisition">Acquisitions</option>
              <option value="Cession">Cessions</option>
              <option value="Réévaluation">Réévaluations</option>
              <option value="Transfert">Transferts</option>
              <option value="Dépréciation">Dépréciations</option>
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

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">Acquisitions</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)] mt-1">12</p>
                <p className="text-xs text-green-500 mt-1">+€450K</p>
              </div>
              <Plus className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">Cessions</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)] mt-1">5</p>
                <p className="text-xs text-red-500 mt-1">-€125K</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500 opacity-20" />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">Réévaluations</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)] mt-1">3</p>
                <p className="text-xs text-purple-500 mt-1">+€280K</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500 opacity-20" />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">VNC totale</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)] mt-1">€4.2M</p>
                <p className="text-xs text-blue-500 mt-1">82% valeur</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">Amort. cumulé</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)] mt-1">€920K</p>
                <p className="text-xs text-orange-500 mt-1">18% total</p>
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
                    Actions
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
                          displayValue = `${value} ans`;
                        } else if (['montant', 'valeurResiduelle', 'valeurNetteComptableActuelle',
                                   'amortissementCumuleActuel', 'coutHistorique', 'produitCession',
                                   'profitPerteCession'].includes(col.key)) {
                          displayValue = formatCurrency(value as number);
                          if (col.key === 'profitPerteCession' && value !== 0) {
                            displayValue = (
                              <span className={value > 0 ? 'text-green-500' : 'text-red-500'}>
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
                          <button
                            className="p-1 hover:bg-[var(--color-background)] rounded"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <Eye className="w-4 h-4 text-[var(--color-text-secondary)]" />
                          </button>
                          <button
                            className="p-1 hover:bg-[var(--color-background)] rounded"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <MoreVertical className="w-4 h-4 text-[var(--color-text-secondary)]" />
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
                                Informations de base
                              </h4>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-[var(--color-text-secondary)]">Code erreur:</span>
                                  <span>{transaction.codeErreur || 'Aucun'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-[var(--color-text-secondary)]">ID transaction:</span>
                                  <span className="font-mono text-xs">{transaction.identifiantDateTransaction}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-[var(--color-text-secondary)]">Date précédente:</span>
                                  <span>{transaction.dateTransactionPrecedente || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-[var(--color-text-secondary)]">Date suivante:</span>
                                  <span>{transaction.dateTransactionSuivante || 'N/A'}</span>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
                                Amortissement
                              </h4>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-[var(--color-text-secondary)]">Fin amort.:</span>
                                  <span>{transaction.dateFinAmortissement}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-[var(--color-text-secondary)]">Amort. annuel:</span>
                                  <span>{formatCurrency(transaction.amortissementAnnuelCout)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-[var(--color-text-secondary)]">Amort. mensuel:</span>
                                  <span>{formatCurrency(transaction.amortissementMoisCout)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-[var(--color-text-secondary)]">Mois cumulés:</span>
                                  <span>{transaction.nombreMoisAmortCumuleAnnuel}</span>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
                                Valeurs et réévaluation
                              </h4>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-[var(--color-text-secondary)]">Coût estimé préc.:</span>
                                  <span>{formatCurrency(transaction.coutEstimePrecedent)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-[var(--color-text-secondary)]">Rééval. actuelle:</span>
                                  <span>{formatCurrency(transaction.reevaluationActuelle)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-[var(--color-text-secondary)]">Surplus rééval.:</span>
                                  <span>{formatCurrency(transaction.surplusReevaluation)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-[var(--color-text-secondary)]">Dépréciation:</span>
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
              Affichage {((currentPage - 1) * itemsPerPage) + 1} à{' '}
              {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} sur{' '}
              {filteredTransactions.length} transactions
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