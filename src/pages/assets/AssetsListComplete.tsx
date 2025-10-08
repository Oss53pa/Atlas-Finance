import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  Search, Filter, Download, Plus, Edit2, Eye, Trash2,
  ChevronLeft, ChevronRight, Settings, X, FileText,
  Calendar, DollarSign, TrendingUp, Package, Building,
  Calculator, AlertCircle, CheckCircle, Clock, MoreVertical,
  Camera, QrCode, Info, Shield, MapPin, Wrench, Edit, TrendingDown, Brain,
  Copy, Archive, Tag, History, Paperclip, Activity, Users, BarChart3, Upload, User, Database
} from 'lucide-react';
import { ModernCard, CardHeader, CardBody } from '../../components/ui/ModernCard';
import ModernButton from '../../components/ui/ModernButton';
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';

interface AssetData {
  // Identifiants principaux
  numeroActif: string;
  identifiantActif: string;
  description: string;
  numeroPieceComptable: string;

  // Classifications
  typeActif: string;
  categorie: string;
  codeFiscal: string;
  codeErreur: string;
  classe: string;

  // Dates importantes
  dateAcquisition: string;
  dateDerniereTransaction: string;
  dateTransactionCours: string;
  dateDerniereTransExercPrec: string;
  dateDerniereTransMoisPrec: string;
  dateCession: string;

  // Valeurs d'acquisition et historiques
  coutHistorique: number;
  dureeVieActif: number;
  valeurResiduelleActif: number;
  coutFiscal: number;
  tauxImposition: number;
  produitCession: number;

  // Périodes écoulées
  moisEcoulesExercPrec: number;
  moisEcoulesExercCours: number;
  moisEcoulesMoisPrec: number;

  // Soldes et mouvements du compte d'actif
  soldeOuvertureCompteActif: number;
  acquisitions: number;
  reevaluations: number;
  cessions: number;
  depreciation: number;
  soldeClotureCompteActif: number;

  // Amortissements
  soldeOuvertureAmort: number;
  amortissementCout: number;
  amortissementReevaluation: number;
  amortissementTotal: number;
  amortCumuleReevaluations: number;
  amortCumuleCessions: number;
  soldeClotureAmort: number;

  // Valeur nette comptable
  valeurNetteComptableCloture: number;

  // Réserves de réévaluation
  soldeOuvertureReserves: number;
  surplusReevaluation: number;
  amortReservesReevaluation: number;
  soldeClotureReserves: number;

  // Autres éléments
  depreciationsPasseesCharges: number;
  profitPerteCession: number;

  // Amortissement mensuel
  amortMoisCout: number;
  amortMoisReevaluation: number;
  amortMoisTotal: number;

  // Valeurs au coût historique
  soldeOuvertureCoutHist: number;
  mouvementCoutHistDepuisDebut: number;
  soldeClotureCoutHist: number;
  mouvementCoutHistMois: number;

  // Valeur nette comptable
  soldeOuvertureVNC: number;
  mouvementVNCDepuisDebut: number;
  soldeClotureVNC: number;
  mouvementVNCMois: number;

  // Impôts différés
  soldeOuvertureImpotsDiff: number;
  mouvementImpotsDiffDepuisDebut: number;
  soldeClotureImpotsDiff: number;
  mouvementImpotsDiffMois: number;
}

const AssetsListComplete: React.FC = () => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [showNewAssetModal, setShowNewAssetModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetData | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);

  // États pour les modals d'actions
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showPrintLabelModal, setShowPrintLabelModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Modal de sélection de période
  const periodSelectorModal = (
    <PeriodSelectorModal
      isOpen={showPeriodModal}
      onClose={() => setShowPeriodModal(false)}
      onPeriodSelect={(period) => {
        setDateRange(period);
        setShowPeriodModal(false);
      }}
    />
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // États pour le formulaire de nouvel actif
  const [activeFormTab, setActiveFormTab] = useState('general');
  const [activeGeneralTab, setActiveGeneralTab] = useState('basic');
  const [activeImmobilisationTab, setActiveImmobilisationTab] = useState('overview');
  const [activeVenteTab, setActiveVenteTab] = useState('basic');
  const [activeComponentTab, setActiveComponentTab] = useState('overview');
  const [activeMaintenanceTab, setActiveMaintenanceTab] = useState('contract');
  const [newAssetForm, setNewAssetForm] = useState<any>({
    asset_number: '',
    description: '',
    asset_class: '',
    asset_category: '',
    capital_appropriation_number: 'CAR-2024-001',
    active_status: 'active',
    tax_liable: 'yes',
    filter_by: '',
    warranty_period: '',
    warranty_unit: 'months',
    warranty_terms: '',
    warranty_start: '',
    warranty_end: '',
    warranty_provider: '',
    insurance_provider: '',
    policy_details: '',
    coverage_amount: '',
    insurance_expiration: '',
    policy_type: '',
    building_name: '',
    floor: '',
    zoning: '',
    unit: ''
  });
  const [capitationData, setCapitationData] = useState<any>(null);
  const [wiseFMData, setWiseFMData] = useState<any>(null);

  // Configuration des colonnes visibles
  const [visibleColumns, setVisibleColumns] = useState({
    numeroActif: true,
    identifiantActif: true,
    description: true,
    classe: true,
    dateAcquisition: true,
    coutHistorique: true,
    valeurNetteComptableCloture: true,
    amortissementTotal: false,
    dureeVieActif: false,
    valeurResiduelleActif: false,
    soldeClotureCoutHist: false,
    mouvementVNCMois: false,
    tauxImposition: false
  });

  // Fonction pour sauvegarder un actif
  const handleSaveAsset = (assetToSave: any) => {
    console.log('Saving asset:', assetToSave);
    // Ici vous pouvez ajouter la logique pour sauvegarder l'actif
    // Par exemple, faire un appel API
  };

  // Données d'exemple basées sur le document fourni
  const assetsData: AssetData[] = [
    {
      numeroActif: '234-1',
      identifiantActif: '234-SS-108290',
      description: 'Fourniture Matériel Sprinkler',
      numeroPieceComptable: '',
      typeActif: 'Owned',
      categorie: '234-SS',
      codeFiscal: 'A',
      codeErreur: '-',
      classe: '23-BIA',
      dateAcquisition: '16/06/2017',
      dateDerniereTransaction: '16/06/2017',
      dateTransactionCours: '16/06/2017',
      dateDerniereTransExercPrec: '16/06/2017',
      dateDerniereTransMoisPrec: '16/06/2017',
      dateCession: '-',
      coutHistorique: 135507991,
      dureeVieActif: 15,
      valeurResiduelleActif: 0,
      coutFiscal: 135507991,
      tauxImposition: 18,
      produitCession: 0,
      moisEcoulesExercPrec: 7,
      moisEcoulesExercCours: 9,
      moisEcoulesMoisPrec: 8,
      soldeOuvertureCompteActif: 135507991,
      acquisitions: 0,
      reevaluations: 0,
      cessions: 0,
      depreciation: 0,
      soldeClotureCompteActif: 135507991,
      soldeOuvertureAmort: 5269755,
      amortissementCout: 1505644,
      amortissementReevaluation: 0,
      amortissementTotal: 1505644,
      amortCumuleReevaluations: 0,
      amortCumuleCessions: 0,
      soldeClotureAmort: 6775400,
      valeurNetteComptableCloture: 128732591,
      soldeOuvertureReserves: 0,
      surplusReevaluation: 0,
      amortReservesReevaluation: 0,
      soldeClotureReserves: 0,
      depreciationsPasseesCharges: 0,
      profitPerteCession: 0,
      amortMoisCout: 752822,
      amortMoisReevaluation: 0,
      amortMoisTotal: 752822,
      soldeOuvertureCoutHist: 130238235,
      mouvementCoutHistDepuisDebut: -1505644,
      soldeClotureCoutHist: 128732591,
      mouvementCoutHistMois: -752822,
      soldeOuvertureVNC: 121279652,
      mouvementVNCDepuisDebut: -4065240,
      soldeClotureVNC: 117214412,
      mouvementVNCMois: -2032620,
      soldeOuvertureImpotsDiff: 1612545,
      mouvementImpotsDiffDepuisDebut: 460727,
      soldeClotureImpotsDiff: 2073272,
      mouvementImpotsDiffMois: 230364
    },
    {
      numeroActif: '234-2',
      identifiantActif: '234-SS-515029',
      description: 'Fourniture Matériel Sprinkler',
      numeroPieceComptable: '',
      typeActif: 'Owned',
      categorie: '234-SS',
      codeFiscal: 'A',
      codeErreur: '-',
      classe: '23-BIA',
      dateAcquisition: '28/07/2017',
      dateDerniereTransaction: '28/07/2017',
      dateTransactionCours: '28/07/2017',
      dateDerniereTransExercPrec: '28/07/2017',
      dateDerniereTransMoisPrec: '28/07/2017',
      dateCession: '-',
      coutHistorique: 43146228,
      dureeVieActif: 15,
      valeurResiduelleActif: 0,
      coutFiscal: 43146228,
      tauxImposition: 18,
      produitCession: 0,
      moisEcoulesExercPrec: 6,
      moisEcoulesExercCours: 8,
      moisEcoulesMoisPrec: 7,
      soldeOuvertureCompteActif: 43146228,
      acquisitions: 0,
      reevaluations: 0,
      cessions: 0,
      depreciation: 0,
      soldeClotureCompteActif: 43146228,
      soldeOuvertureAmort: 1438208,
      amortissementCout: 479403,
      amortissementReevaluation: 0,
      amortissementTotal: 479403,
      amortCumuleReevaluations: 0,
      amortCumuleCessions: 0,
      soldeClotureAmort: 1917610,
      valeurNetteComptableCloture: 41228618,
      soldeOuvertureReserves: 0,
      surplusReevaluation: 0,
      amortReservesReevaluation: 0,
      soldeClotureReserves: 0,
      depreciationsPasseesCharges: 0,
      profitPerteCession: 0,
      amortMoisCout: 239701,
      amortMoisReevaluation: 0,
      amortMoisTotal: 239701,
      soldeOuvertureCoutHist: 41708020,
      mouvementCoutHistDepuisDebut: -479403,
      soldeClotureCoutHist: 41228618,
      mouvementCoutHistMois: -239701,
      soldeOuvertureVNC: 39263067,
      mouvementVNCDepuisDebut: -1294387,
      soldeClotureVNC: 37968680,
      mouvementVNCMois: -647193,
      soldeOuvertureImpotsDiff: 440092,
      mouvementImpotsDiffDepuisDebut: 146697,
      soldeClotureImpotsDiff: 586789,
      mouvementImpotsDiffMois: 73349
    },
    {
      numeroActif: '234-3',
      identifiantActif: '234-SS-318220',
      description: 'Fourniture Matériel Sprinkler',
      numeroPieceComptable: '',
      typeActif: 'Owned',
      categorie: '234-SS',
      codeFiscal: 'A',
      codeErreur: '-',
      classe: '23-BIA',
      dateAcquisition: '29/09/2017',
      dateDerniereTransaction: '29/09/2017',
      dateTransactionCours: '29/09/2017',
      dateDerniereTransExercPrec: '29/09/2017',
      dateDerniereTransMoisPrec: '29/09/2017',
      dateCession: '-',
      coutHistorique: 23286211,
      dureeVieActif: 0,
      valeurResiduelleActif: 0,
      coutFiscal: 23286211,
      tauxImposition: 18,
      produitCession: 0,
      moisEcoulesExercPrec: 4,
      moisEcoulesExercCours: 6,
      moisEcoulesMoisPrec: 5,
      soldeOuvertureCompteActif: 23286211,
      acquisitions: 0,
      reevaluations: 0,
      cessions: 0,
      depreciation: 0,
      soldeClotureCompteActif: 23286211,
      soldeOuvertureAmort: 0,
      amortissementCout: 0,
      amortissementReevaluation: 0,
      amortissementTotal: 0,
      amortCumuleReevaluations: 0,
      amortCumuleCessions: 0,
      soldeClotureAmort: 0,
      valeurNetteComptableCloture: 23286211,
      soldeOuvertureReserves: 0,
      surplusReevaluation: 0,
      amortReservesReevaluation: 0,
      soldeClotureReserves: 0,
      depreciationsPasseesCharges: 0,
      profitPerteCession: 0,
      amortMoisCout: 0,
      amortMoisReevaluation: 0,
      amortMoisTotal: 0,
      soldeOuvertureCoutHist: 23286211,
      mouvementCoutHistDepuisDebut: 0,
      soldeClotureCoutHist: 23286211,
      mouvementCoutHistMois: 0,
      soldeOuvertureVNC: 21889038,
      mouvementVNCDepuisDebut: -698586,
      soldeClotureVNC: 21190452,
      mouvementVNCMois: -349293,
      soldeOuvertureImpotsDiff: 251491,
      mouvementImpotsDiffDepuisDebut: 125746,
      soldeClotureImpotsDiff: 377237,
      mouvementImpotsDiffMois: 62873
    }
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value}%`;
  };

  const getStatusBadge = (type: string) => {
    const config = {
      'Owned': { bg: 'bg-green-500/10', text: 'text-green-500', label: 'Propriété' },
      'Leased': { bg: 'bg-blue-500/10', text: 'text-blue-500', label: 'Location' },
      'Rented': { bg: 'bg-orange-500/10', text: 'text-orange-500', label: 'Loué' }
    };
    const { bg, text, label } = config[type as keyof typeof config] || config['Owned'];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
        {label}
      </span>
    );
  };

  const columnDefinitions = [
    { key: 'numeroActif', label: "N° d'actif", width: 'w-24' },
    { key: 'identifiantActif', label: "Identifiant de l'actif", width: 'w-32' },
    { key: 'description', label: 'Description', width: 'w-48' },
    { key: 'classe', label: 'Classe', width: 'w-20' },
    { key: 'dateAcquisition', label: "Date d'acquisition", width: 'w-24' },
    { key: 'coutHistorique', label: 'Coût historique', width: 'w-28', align: 'text-right' },
    { key: 'valeurNetteComptableCloture', label: 'VNC clôture', width: 'w-28', align: 'text-right' },
    { key: 'amortissementTotal', label: 'Amort. total', width: 'w-24', align: 'text-right' },
    { key: 'dureeVieActif', label: 'Durée vie', width: 'w-20', align: 'text-center' },
    { key: 'valeurResiduelleActif', label: 'Val. résiduelle', width: 'w-24', align: 'text-right' },
    { key: 'soldeClotureCoutHist', label: 'Solde clôture', width: 'w-28', align: 'text-right' },
    { key: 'mouvementVNCMois', label: 'Mouv. VNC mois', width: 'w-28', align: 'text-right' },
    { key: 'tauxImposition', label: 'Taux imposition', width: 'w-24', align: 'text-center' }
  ];

  const activeColumns = columnDefinitions.filter(col =>
    visibleColumns[col.key as keyof typeof visibleColumns]
  );

  const filteredAssets = assetsData.filter(asset => {
    const matchesSearch =
      asset.numeroActif.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.identifiantActif.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || asset.typeActif === filterType;
    return matchesSearch && matchesType;
  });

  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);
  const paginatedAssets = filteredAssets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Calcul des totaux
  const totals = {
    coutHistorique: assetsData.reduce((sum, a) => sum + a.coutHistorique, 0),
    amortissementCumule: assetsData.reduce((sum, a) => sum + a.soldeClotureAmort, 0),
    valeurNetteComptable: assetsData.reduce((sum, a) => sum + a.valeurNetteComptableCloture, 0),
    amortissementMois: assetsData.reduce((sum, a) => sum + a.amortMoisTotal, 0),
    impotsDifferes: assetsData.reduce((sum, a) => sum + a.soldeClotureImpotsDiff, 0)
  };

  return (
    <div className="space-y-6">
      {/* Header avec période */}
      <div className="bg-gradient-to-r from-[#6A8A82] to-[#5A7A72] rounded-lg p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Registre des Immobilisations</h1>
            <p className="text-white/90 mt-1">EMERGENCE PLAZA SA - Asset Set-up</p>
            <p className="text-sm text-white/80 mt-2">Date de révision: 28/02/2018</p>
          </div>
          <div>
            <button
              onClick={() => setShowPeriodModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              {dateRange.startDate && dateRange.endDate
                ? `${dateRange.startDate} - ${dateRange.endDate}`
                : 'Sélectionner une période'
              }
            </button>
          </div>
        </div>
      </div>

      {/* Totaux globaux */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">Coût d'acquisition</p>
                <p className="text-xl font-bold text-[var(--color-text-primary)] mt-1">
                  {formatCurrency(totals.coutHistorique)}
                </p>
                <p className="text-xs text-green-500 mt-1">489 986 155 total</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">Amort. cumulés</p>
                <p className="text-xl font-bold text-[var(--color-text-primary)] mt-1">
                  {formatCurrency(totals.amortissementCumule)}
                </p>
                <p className="text-xs text-orange-500 mt-1">8 693 010 total</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-500 opacity-20" />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">VNC totale</p>
                <p className="text-xl font-bold text-[var(--color-text-primary)] mt-1">
                  {formatCurrency(totals.valeurNetteComptable)}
                </p>
                <p className="text-xs text-blue-500 mt-1">481 293 145 total</p>
              </div>
              <Calculator className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">Amort. du mois</p>
                <p className="text-xl font-bold text-[var(--color-text-primary)] mt-1">
                  {formatCurrency(totals.amortissementMois)}
                </p>
                <p className="text-xs text-purple-500 mt-1">992 523 total</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-500 opacity-20" />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">Impôts différés</p>
                <p className="text-xl font-bold text-[var(--color-text-primary)] mt-1">
                  {formatCurrency(totals.impotsDifferes)}
                </p>
                <p className="text-xs text-red-500 mt-1">1 069 573 total</p>
              </div>
              <FileText className="w-8 h-8 text-red-500 opacity-20" />
            </div>
          </CardBody>
        </ModernCard>
      </div>

      {/* Filtres et actions */}
      <ModernCard>
        <CardBody>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
                <input
                  type="text"
                  placeholder="Rechercher par numéro, identifiant ou description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm"
            >
              <option value="all">Tous les types</option>
              <option value="Owned">Propriété</option>
              <option value="Leased">Location</option>
              <option value="Rented">Loué</option>
            </select>
            <ModernButton
              variant="outline"
              size="sm"
              onClick={() => setShowColumnSettings(!showColumnSettings)}
            >
              <Settings className="w-4 h-4 mr-1" />
              Colonnes
            </ModernButton>
            <ModernButton
              variant="outline"
              size="sm"
              onClick={() => {
                const csvContent = "Numéro Actif,Description,Classe,Date Acquisition,Valeur\n" +
                  filteredAssets.map(a => `${a.numeroActif},${a.description},${a.classe},${a.dateAcquisition},${a.coutHistorique}`).join("\n");
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'assets_export.csv';
                a.click();
              }}
            >
              <Download className="w-4 h-4 mr-1" />
              Exporter
            </ModernButton>
            <ModernButton
              variant="primary"
              size="sm"
              onClick={() => setShowNewAssetModal(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Nouvel actif
            </ModernButton>
          </div>
        </CardBody>
      </ModernCard>

      {/* Configuration des colonnes */}
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
                    onChange={() => setVisibleColumns(prev => ({
                      ...prev,
                      [col.key]: !prev[col.key as keyof typeof visibleColumns]
                    }))}
                    className="rounded border-[var(--color-border)]"
                  />
                  <span className="text-sm">{col.label}</span>
                </label>
              ))}
            </div>
          </CardBody>
        </ModernCard>
      )}

      {/* Tableau des actifs */}
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
                {paginatedAssets.map((asset) => (
                  <React.Fragment key={asset.numeroActif}>
                    <tr
                      className="border-b border-[var(--color-border)] hover:bg-[var(--color-background-subtle)] transition-colors cursor-pointer"
                      onClick={() => setExpandedRow(expandedRow === asset.numeroActif ? null : asset.numeroActif)}
                    >
                      {activeColumns.map(col => {
                        const value = asset[col.key as keyof AssetData];
                        let displayValue: React.ReactNode = value;

                        if (['coutHistorique', 'valeurNetteComptableCloture', 'amortissementTotal',
                             'valeurResiduelleActif', 'soldeClotureCoutHist', 'mouvementVNCMois'].includes(col.key)) {
                          displayValue = formatCurrency(value as number);
                          if (col.key === 'mouvementVNCMois' && value !== 0) {
                            displayValue = (
                              <span className={value > 0 ? 'text-green-500' : 'text-red-500'}>
                                {displayValue}
                              </span>
                            );
                          }
                        } else if (col.key === 'dureeVieActif') {
                          displayValue = value ? `${value} ans` : '-';
                        } else if (col.key === 'tauxImposition') {
                          displayValue = formatPercentage(value as number);
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
                              setSelectedAsset(asset);
                              setExpandedRow(expandedRow === asset.numeroActif ? null : asset.numeroActif);
                            }}
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4 text-[var(--color-text-secondary)]" />
                          </button>
                          <div className="relative">
                            <button
                              className="p-1 hover:bg-[var(--color-background)] rounded"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdown(activeDropdown === asset.numeroActif ? null : asset.numeroActif);
                              }}
                              title="Plus d'actions"
                            >
                              <MoreVertical className="w-4 h-4 text-[var(--color-text-secondary)]" />
                            </button>
                            {activeDropdown === asset.numeroActif && (
                              <div className="absolute right-0 top-6 z-50 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                                <button
                                  onClick={() => {
                                    setSelectedAsset(asset);
                                    setEditingAsset(asset);
                                    setIsEditing(true);
                                    setNewAssetForm({
                                      ...newAssetForm,
                                      asset_number: asset.numeroActif,
                                      description: asset.description,
                                      asset_class: asset.classe,
                                      asset_category: asset.categorie
                                    });
                                    setShowNewAssetModal(true);
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Edit2 className="h-4 w-4" />
                                  Modifier
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedAsset(asset);
                                    setShowDuplicateModal(true);
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Copy className="h-4 w-4" />
                                  Dupliquer
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedAsset(asset);
                                    setShowArchiveModal(true);
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Archive className="h-4 w-4" />
                                  Archiver
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedAsset(asset);
                                    setShowPrintLabelModal(true);
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Tag className="h-4 w-4" />
                                  Imprimer étiquette
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedAsset(asset);
                                    setShowHistoryModal(true);
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <History className="h-4 w-4" />
                                  Voir l'historique
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedAsset(asset);
                                    setShowExportModal(true);
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Download className="h-4 w-4" />
                                  Exporter cet actif
                                </button>
                                <hr className="my-1" />
                                <button
                                  onClick={() => {
                                    setSelectedAsset(asset);
                                    setShowDeleteModal(true);
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Supprimer
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Ligne détaillée étendue */}
                    {expandedRow === asset.numeroActif && (
                      <tr className="bg-[var(--color-background-subtle)]">
                        <td colSpan={activeColumns.length + 1} className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Section Immobilisations */}
                            <div className="space-y-4">
                              <h4 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                                <Building className="w-4 h-4" />
                                Immobilisations au coût d'acquisition
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-[var(--color-text-secondary)]">Solde ouverture:</span>
                                  <span className="font-medium">{formatCurrency(asset.soldeOuvertureCompteActif)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[var(--color-text-secondary)]">Acquisitions:</span>
                                  <span className="font-medium">{formatCurrency(asset.acquisitions)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[var(--color-text-secondary)]">Réévaluations:</span>
                                  <span className="font-medium">{formatCurrency(asset.reevaluations)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[var(--color-text-secondary)]">Cessions:</span>
                                  <span className="font-medium">{formatCurrency(asset.cessions)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[var(--color-text-secondary)]">Dépréciation:</span>
                                  <span className="font-medium">{formatCurrency(asset.depreciation)}</span>
                                </div>
                                <div className="flex justify-between border-t pt-2">
                                  <span className="text-[var(--color-text-secondary)] font-semibold">Solde clôture:</span>
                                  <span className="font-bold">{formatCurrency(asset.soldeClotureCompteActif)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Section Amortissements */}
                            <div className="space-y-4">
                              <h4 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                                <Calculator className="w-4 h-4" />
                                Amortissements cumulés
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-[var(--color-text-secondary)]">Solde ouverture:</span>
                                  <span className="font-medium">{formatCurrency(asset.soldeOuvertureAmort)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[var(--color-text-secondary)]">Amort. coût:</span>
                                  <span className="font-medium">{formatCurrency(asset.amortissementCout)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[var(--color-text-secondary)]">Amort. réévaluation:</span>
                                  <span className="font-medium">{formatCurrency(asset.amortissementReevaluation)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[var(--color-text-secondary)]">Amort. total:</span>
                                  <span className="font-medium">{formatCurrency(asset.amortissementTotal)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[var(--color-text-secondary)]">Amort. mensuel:</span>
                                  <span className="font-medium">{formatCurrency(asset.amortMoisTotal)}</span>
                                </div>
                                <div className="flex justify-between border-t pt-2">
                                  <span className="text-[var(--color-text-secondary)] font-semibold">Solde clôture:</span>
                                  <span className="font-bold">{formatCurrency(asset.soldeClotureAmort)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Section Valeurs fiscales */}
                            <div className="space-y-4">
                              <h4 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Valeurs fiscales et impôts
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-[var(--color-text-secondary)]">Coût fiscal:</span>
                                  <span className="font-medium">{formatCurrency(asset.coutFiscal)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[var(--color-text-secondary)]">Taux imposition:</span>
                                  <span className="font-medium">{formatPercentage(asset.tauxImposition)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[var(--color-text-secondary)]">Impôts diff. ouverture:</span>
                                  <span className="font-medium">{formatCurrency(asset.soldeOuvertureImpotsDiff)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[var(--color-text-secondary)]">Mouvement YTD:</span>
                                  <span className="font-medium">{formatCurrency(asset.mouvementImpotsDiffDepuisDebut)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[var(--color-text-secondary)]">Mouvement MTD:</span>
                                  <span className="font-medium">{formatCurrency(asset.mouvementImpotsDiffMois)}</span>
                                </div>
                                <div className="flex justify-between border-t pt-2">
                                  <span className="text-[var(--color-text-secondary)] font-semibold">Impôts diff. clôture:</span>
                                  <span className="font-bold">{formatCurrency(asset.soldeClotureImpotsDiff)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Informations supplémentaires */}
                          <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-[var(--color-text-secondary)]">Type d'actif:</span>
                                <span className="ml-2">{getStatusBadge(asset.typeActif)}</span>
                              </div>
                              <div>
                                <span className="text-[var(--color-text-secondary)]">Catégorie:</span>
                                <span className="ml-2 font-medium">{asset.categorie}</span>
                              </div>
                              <div>
                                <span className="text-[var(--color-text-secondary)]">Code fiscal:</span>
                                <span className="ml-2 font-medium">{asset.codeFiscal}</span>
                              </div>
                              <div>
                                <span className="text-[var(--color-text-secondary)]">Date cession:</span>
                                <span className="ml-2 font-medium">{asset.dateCession}</span>
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
              {Math.min(currentPage * itemsPerPage, filteredAssets.length)} sur{' '}
              {filteredAssets.length} actifs
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 hover:bg-[var(--color-background-subtle)] rounded disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-blue-500 text-white'
                          : 'hover:bg-[var(--color-background-subtle)]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 hover:bg-[var(--color-background-subtle)] rounded disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </CardBody>
      </ModernCard>

      {/* Modal Formulaire Complet Nouvel Actif */}
      {showNewAssetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Assets Registry - {isEditing ? "Modifier l'Actif" : "Nouvel Actif"}</h2>
                <button
                  onClick={() => {
                    setShowNewAssetModal(false);
                    setIsEditing(false);
                    setEditingAsset(null);
                  }}
                  className="text-gray-700 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Header with Photo and Asset Info */}
            <div className="bg-gradient-to-r from-[#D5D0CD]/10 to-[#6A8A82]/10 border-b border-[#D5D0CD] p-6">
              <div className="flex items-start space-x-6">
                {/* Photo Section */}
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 bg-white border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center group hover:border-[#6A8A82]/40 transition-colors cursor-pointer">
                    <div className="text-center">
                      <Camera className="w-8 h-8 text-gray-700 mx-auto mb-2 group-hover:text-[#6A8A82]" />
                      <p className="text-xs text-gray-700 group-hover:text-[#6A8A82]">Ajouter photo</p>
                    </div>
                  </div>
                </div>

                {/* Asset Information Grid */}
                <div className="flex-1">
                  <div className="grid grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Capital Appropriation Request Number</label>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">
                        {newAssetForm.capital_appropriation_number || 'CAR-2024-001'}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Asset Number</label>
                      <p className="text-sm font-semibold text-[#6A8A82] mt-0.5">
                        {newAssetForm.asset_number || '235377'}
                      </p>
                    </div>
                    <div className="lg:col-span-3 flex items-start gap-4">
                      <div className="flex-1">
                        <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Description</label>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5 leading-tight">
                          {newAssetForm.description || 'ARIC TRAVAUX D\'ASSAINISSEMENT'}
                        </p>
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        <div>
                          <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Status</label>
                          <p className="text-sm font-semibold text-green-700">En service</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* QR Code Section */}
                <div className="flex-shrink-0">
                  <div className="bg-white border border-gray-300 rounded-lg p-3 text-center shadow-sm">
                    <div className="w-16 h-16 bg-gray-100 border border-gray-200 rounded flex items-center justify-center mx-auto mb-2">
                      <QrCode className="w-8 h-8 text-gray-600" />
                    </div>
                    <p className="text-xs font-medium text-gray-700">QR Code</p>
                    <p className="text-xs text-gray-700 mt-1">{newAssetForm.asset_number || '235377'}</p>
                    <button className="mt-1 text-xs text-[#6A8A82] hover:text-[#5A7A72] font-medium">
                      Générer
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Layout avec Sidebar */}
            <div className="flex h-[60vh]">
              {/* Sidebar Navigation */}
              <div className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto">
                <nav className="p-4 space-y-2">
                  {[
                    { id: 'general', label: 'Information générale', icon: Info },
                    { id: 'active', label: 'Active', icon: Activity },
                    { id: 'acquisition', label: 'Informations acquisition', icon: DollarSign },
                    { id: 'immobilisation', label: 'Immobilisation', icon: Building },
                    { id: 'vente', label: 'Données de vente', icon: TrendingDown },
                    { id: 'composants', label: 'Composants', icon: Package },
                    { id: 'maintenance', label: 'Données de maintenance', icon: Wrench },
                    { id: 'attachements', label: 'Attachements', icon: FileText },
                    { id: 'notes', label: 'Notes', icon: Edit }
                  ].map((section) => {
                    const IconComponent = section.icon;
                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveFormTab(section.id)}
                        className={`w-full flex items-center px-3 py-2 text-left rounded-lg transition-colors ${
                          activeFormTab === section.id
                            ? 'bg-[#6A8A82]/20 text-[#5A7A72] font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <IconComponent className="w-4 h-4 mr-3" />
                        <span className="text-sm">{section.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Onglet General Information */}
                {activeFormTab === 'general' && (
                  <div className="space-y-6">
                    {/* Horizontal Tabs for General Information */}
                    <div className="border-b border-gray-200">
                      <nav className="flex space-x-8">
                        {[
                          { id: 'basic', label: 'Actif Info', icon: Info },
                          { id: 'material', label: 'Material Data', icon: Package },
                          { id: 'warranty', label: 'Warranty', icon: Shield },
                          { id: 'insurance', label: 'Insurance', icon: FileText },
                          { id: 'location', label: 'Location', icon: MapPin }
                        ].map((tab) => {
                          const IconComponent = tab.icon;
                          return (
                            <button
                              key={tab.id}
                              onClick={() => setActiveGeneralTab(tab.id)}
                              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                activeGeneralTab === tab.id
                                  ? 'border-[#6A8A82] text-[#6A8A82]'
                                  : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'
                              }`}
                            >
                              <IconComponent className="w-4 h-4 mr-2" />
                              {tab.label}
                            </button>
                          );
                        })}
                      </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="mt-6">
                      {/* Basic Info Tab */}
                      {activeGeneralTab === 'basic' && (
                        <div className="space-y-8">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                              <Info className="w-5 h-5 mr-2 text-[#6A8A82]" />
                              Informations de base
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              <div>
                                <label className="block text-sm font-medium mb-1">Asset Number *</label>
                                <input
                                  type="text"
                                  value={newAssetForm.asset_number}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, asset_number: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Ex: 235377"
                                />
                              </div>
                              <div className="lg:col-span-2">
                                <label className="block text-sm font-medium mb-1">Description *</label>
                                <input
                                  type="text"
                                  value={newAssetForm.description}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, description: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Ex: ARIC TRAVAUX D'ASSAINISSEMENT"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Asset Class *</label>
                                <select
                                  value={newAssetForm.asset_class}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, asset_class: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">-- Select --</option>
                                  <option value="21-II">21 - Immobilisations incorporelles</option>
                                  <option value="22-TE">22 - Terrains</option>
                                  <option value="23-BIA">23 - Bâtiments, installations et agencements</option>
                                  <option value="24-MM">24 - Matériel et mobilier</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Asset Category</label>
                                <select
                                  value={newAssetForm.asset_category}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, asset_category: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">-- Sélectionnez --</option>
                                  <option value="Matériel technique">Matériel technique</option>
                                  <option value="Équipement bureau">Équipement bureau</option>
                                  <option value="Véhicule léger">Véhicule léger</option>
                                  <option value="Matériel industriel">Matériel industriel</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Statut</label>
                                <select
                                  value={newAssetForm.active_status}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, active_status: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="active">Actif</option>
                                  <option value="inactive">Inactif</option>
                                  <option value="maintenance">En maintenance</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Material Data Tab */}
                      {activeGeneralTab === 'material' && (
                        <div className="space-y-8">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                              <Package className="w-5 h-5 mr-2 text-[#6A8A82]" />
                              Material Data
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className="block text-sm font-medium mb-1">Material Type</label>
                                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]">
                                  <option value="">-- Sélectionnez --</option>
                                  <option value="metal">Métal</option>
                                  <option value="plastic">Plastique</option>
                                  <option value="wood">Bois</option>
                                  <option value="composite">Composite</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Serial Number</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                                  placeholder="Numéro de série"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Manufacturer</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                                  placeholder="Fabricant"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Model</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                                  placeholder="Modèle"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Weight (kg)</label>
                                <input
                                  type="number"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                                  placeholder="Poids en kg"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Dimensions</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                                  placeholder="L x l x H"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Warranty Tab */}
                      {activeGeneralTab === 'warranty' && (
                        <div className="space-y-8">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                              <Shield className="w-5 h-5 mr-2 text-[#6A8A82]" />
                              Warranty Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className="block text-sm font-medium mb-1">Warranty Start Date</label>
                                <input
                                  type="date"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Warranty End Date</label>
                                <input
                                  type="date"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Warranty Provider</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                                  placeholder="Nom du fournisseur"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Warranty Type</label>
                                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]">
                                  <option value="">-- Sélectionnez --</option>
                                  <option value="standard">Standard</option>
                                  <option value="extended">Étendue</option>
                                  <option value="lifetime">À vie</option>
                                </select>
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">Warranty Terms</label>
                                <textarea
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                                  rows={3}
                                  placeholder="Conditions de garantie..."
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Insurance Tab */}
                      {activeGeneralTab === 'insurance' && (
                        <div className="space-y-8">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                              <FileText className="w-5 h-5 mr-2 text-[#6A8A82]" />
                              Insurance Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className="block text-sm font-medium mb-1">Insurance Company</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                                  placeholder="Compagnie d'assurance"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Policy Number</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                                  placeholder="Numéro de police"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Coverage Amount</label>
                                <input
                                  type="number"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                                  placeholder="Montant couvert"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Premium Amount</label>
                                <input
                                  type="number"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                                  placeholder="Prime annuelle"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Policy Start Date</label>
                                <input
                                  type="date"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Policy End Date</label>
                                <input
                                  type="date"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Location Tab */}
                      {activeGeneralTab === 'location' && (
                        <div className="space-y-8">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                              <MapPin className="w-5 h-5 mr-2 text-[#6A8A82]" />
                              Location Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className="block text-sm font-medium mb-1">Building</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                                  placeholder="Nom du bâtiment"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Floor</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                                  placeholder="Étage"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Room/Office</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                                  placeholder="Bureau/Salle"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Department</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                                  placeholder="Département"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">Full Address</label>
                                <textarea
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                                  rows={2}
                                  placeholder="Adresse complète..."
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">GPS Coordinates</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                                  placeholder="Latitude, Longitude"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Zone</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                                  placeholder="Zone/Secteur"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Onglet Active */}
                {activeFormTab === 'active' && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-[#6A8A82]" />
                        Informations Actives
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* État actuel */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">État actuel</label>
                          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                            <option value="en_service">En service</option>
                            <option value="maintenance">En maintenance</option>
                            <option value="hors_service">Hors service</option>
                            <option value="en_reparation">En réparation</option>
                          </select>
                        </div>

                        {/* Dernière activité */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Dernière activité</label>
                          <input
                            type="datetime-local"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>

                        {/* Taux d'utilisation */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Taux d'utilisation (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="85"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>

                        {/* Performance */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Performance</label>
                          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                            <option value="excellente">Excellente</option>
                            <option value="bonne">Bonne</option>
                            <option value="moyenne">Moyenne</option>
                            <option value="faible">Faible</option>
                          </select>
                        </div>

                        {/* Prochaine maintenance */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Prochaine maintenance</label>
                          <input
                            type="date"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>

                        {/* Criticité */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Criticité</label>
                          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                            <option value="critique">Critique</option>
                            <option value="haute">Haute</option>
                            <option value="moyenne">Moyenne</option>
                            <option value="basse">Basse</option>
                          </select>
                        </div>

                        {/* Heures d'utilisation */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Heures d'utilisation</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="1250"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>

                        {/* Responsable actuel */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Responsable actuel</label>
                          <input
                            type="text"
                            placeholder="Nom du responsable"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                      </div>

                      {/* Indicateurs d'activité */}
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-semibold mb-3">Indicateurs d'activité</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">98%</div>
                            <div className="text-xs text-gray-600">Disponibilité</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">85%</div>
                            <div className="text-xs text-gray-600">Utilisation</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">3</div>
                            <div className="text-xs text-gray-600">Maintenances/an</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">A+</div>
                            <div className="text-xs text-gray-600">Score</div>
                          </div>
                        </div>
                      </div>

                      {/* Notes sur l'activité */}
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Notes sur l'activité</label>
                        <textarea
                          rows={3}
                          placeholder="Ajouter des notes sur l'activité de cet actif..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Onglet Acquisition */}
                {activeFormTab === 'acquisition' && (
                  <div className="space-y-8">
                    {/* Vendor/Supplier Information Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Users className="w-5 h-5 mr-2 text-[#6A8A82]" />
                        Vendor/Supplier Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium mb-1">Vendor Name *</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Nom du fournisseur"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Vendor Contact Information</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Téléphone / Email du contact"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Document Number</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Numéro de document"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Purchase Order Details Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-[#6A8A82]" />
                        Purchase Order Details
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-sm font-medium mb-1">Purchase Order Number *</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="N° bon de commande"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Acquisition Date *</label>
                          <input
                            type="date"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Acquisition Cost</label>
                          <div className="flex items-center">
                            <input
                              type="number"
                              className="w-full px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500"
                              placeholder="Montant"
                            />
                            <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">
                              XAF
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Purchase Amount</label>
                          <div className="flex items-center">
                            <input
                              type="number"
                              className="w-full px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500"
                              placeholder="Montant d'achat"
                            />
                            <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">
                              XAF
                            </span>
                          </div>
                        </div>

                        <div className="lg:col-span-2">
                          <label className="block text-sm font-medium mb-1">Payment Terms</label>
                          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="">-- Sélectionnez --</option>
                            <option value="comptant">Comptant</option>
                            <option value="30_jours">30 jours</option>
                            <option value="60_jours">60 jours</option>
                            <option value="90_jours">90 jours</option>
                            <option value="echelonne">Paiement échelonné</option>
                            <option value="leasing">Leasing</option>
                            <option value="credit_bail">Crédit-bail</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Asset Address and Ownership Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <MapPin className="w-5 h-5 mr-2 text-[#6A8A82]" />
                        Asset Address and Ownership
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium mb-1">Delivery Address</label>
                          <textarea
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            placeholder="Adresse de livraison complète"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Owner</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Propriétaire de l'actif"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Ownership Type</label>
                          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="">-- Sélectionnez --</option>
                            <option value="propriete">Propriété</option>
                            <option value="location">Location</option>
                            <option value="leasing">Leasing</option>
                            <option value="pret">Prêt</option>
                            <option value="consignation">Consignation</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Onglet Immobilisation */}
                  {activeFormTab === 'immobilisation' && (
                    <div className="space-y-6">
                      {/* Horizontal Tabs for Immobilisation */}
                      <div className="border-b border-gray-200">
                        <nav className="flex flex-wrap space-x-6">
                          {[
                            { id: 'overview', label: 'Overview', icon: Eye },
                            { id: 'values', label: 'Values', icon: DollarSign },
                            { id: 'depreciation', label: "Paramètres d'amortissement", icon: TrendingDown },
                            { id: 'table', label: "Table d'amortissement", icon: BarChart3 },
                            { id: 'accounting', label: t('accounting.title'), icon: Calculator },
                            { id: 'history', label: 'Historique des changements', icon: History }
                          ].map((tab) => {
                            const IconComponent = tab.icon;
                            return (
                              <button
                                key={tab.id}
                                onClick={() => setActiveImmobilisationTab(tab.id)}
                                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                                  activeImmobilisationTab === tab.id
                                    ? 'border-[#6A8A82] text-[#6A8A82]'
                                    : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'
                                }`}
                              >
                                <IconComponent className="w-4 h-4 mr-2" />
                                {tab.label}
                              </button>
                            );
                          })}
                        </nav>
                      </div>

                      {/* Tab Content */}
                      <div className="mt-6">
                        {/* Overview Tab */}
                        {activeImmobilisationTab === 'overview' && (
                          <div className="space-y-6">
                            <div className="bg-[#6A8A82]/50 border border-[#6A8A82]/20 rounded-lg p-6">
                              <h4 className="text-lg font-semibold text-[#353A3B] mb-4">Vue d'ensemble de l'immobilisation</h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                  <label className="text-sm text-[#5A7A72]">Code immobilisation</label>
                                  <p className="text-lg font-bold text-[#353A3B]">{newAssetForm.asset_number || 'IMM-2024-001'}</p>
                                </div>
                                <div>
                                  <label className="text-sm text-[#5A7A72]">Catégorie</label>
                                  <p className="text-lg font-bold text-[#353A3B]">{newAssetForm.asset_category || 'Non défini'}</p>
                                </div>
                                <div>
                                  <label className="text-sm text-[#5A7A72]">Statut</label>
                                  <p className="text-lg font-bold text-green-700">En service</p>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              <div>
                                <label className="block text-sm font-medium mb-1">Date de mise en service</label>
                                <input
                                  type="date"
                                  value={newAssetForm.capitalization_date || ''}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, capitalization_date: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Durée de vie utile (années)</label>
                                <input
                                  type="number"
                                  value={newAssetForm.useful_life || ''}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, useful_life: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="5"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Valeur résiduelle (%)</label>
                                <input
                                  type="number"
                                  value={newAssetForm.residual_value_percent || '10'}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, residual_value_percent: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="10"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Values Tab */}
                        {activeImmobilisationTab === 'values' && (
                          <div className="space-y-6">
                            <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                              <DollarSign className="w-5 h-5 mr-2 text-[#6A8A82]" />
                              Valeurs de l'immobilisation
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className="block text-sm font-medium mb-1">Valeur d'acquisition</label>
                                <div className="flex items-center">
                                  <input
                                    type="number"
                                    value={newAssetForm.acquisition_value || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, acquisition_value: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="1000000"
                                  />
                                  <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">XAF</span>
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Valeur comptable nette</label>
                                <div className="flex items-center">
                                  <input
                                    type="number"
                                    value={newAssetForm.net_book_value || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, net_book_value: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="800000"
                                  />
                                  <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">XAF</span>
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Amortissement cumulé</label>
                                <div className="flex items-center">
                                  <input
                                    type="number"
                                    value={newAssetForm.cumulated_depreciation || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, cumulated_depreciation: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="200000"
                                  />
                                  <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">XAF</span>
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Valeur résiduelle</label>
                                <div className="flex items-center">
                                  <input
                                    type="number"
                                    value={newAssetForm.salvage_value || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, salvage_value: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="100000"
                                  />
                                  <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">XAF</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Depreciation Parameters Tab */}
                        {activeImmobilisationTab === 'depreciation' && (
                          <div className="space-y-8">
                            {/* Asset Information Section */}
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <Info className="w-5 h-5 mr-2 text-[#6A8A82]" />
                                Asset Information
                              </h4>
                              <div className="bg-[#6A8A82]/50 border border-[#6A8A82]/20 rounded-lg p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Asset ID (Unique identifier)
                                    </label>
                                    <input
                                      type="text"
                                      value={newAssetForm.asset_id || 'ID-00333'}
                                      onChange={(e) => setNewAssetForm({...newAssetForm, asset_id: e.target.value})}
                                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                      placeholder="ID-00333"
                                    />
                                  </div>

                                  <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Asset name/Description
                                    </label>
                                    <input
                                      type="text"
                                      value={newAssetForm.asset_description || 'ARIC TRAVAUX D\'ASSAINISSEMENT'}
                                      onChange={(e) => setNewAssetForm({...newAssetForm, asset_description: e.target.value})}
                                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                      placeholder="ARIC TRAVAUX D'ASSAINISSEMENT"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Asset category
                                    </label>
                                    <select
                                      value={newAssetForm.asset_category || ''}
                                      onChange={(e) => setNewAssetForm({...newAssetForm, asset_category: e.target.value})}
                                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                      <option value="">Sélectionnez...</option>
                                      <option value="building">Bâtiments et constructions</option>
                                      <option value="equipment">Équipements et matériels</option>
                                      <option value="vehicle">Véhicules</option>
                                      <option value="furniture">Mobilier</option>
                                      <option value="it">Matériel informatique</option>
                                      <option value="intangible">Immobilisations incorporelles</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Original cost
                                    </label>
                                    <div className="flex items-center">
                                      <input
                                        type="text"
                                        value={newAssetForm.original_cost || '59160515,00'}
                                        onChange={(e) => setNewAssetForm({...newAssetForm, original_cost: e.target.value})}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 text-right font-semibold"
                                        placeholder="59160515,00"
                                      />
                                      <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">
                                        XAF
                                      </span>
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Additional costs
                                    </label>
                                    <div className="flex items-center">
                                      <input
                                        type="text"
                                        value={newAssetForm.additional_costs || '0,00'}
                                        onChange={(e) => setNewAssetForm({...newAssetForm, additional_costs: e.target.value})}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 text-right"
                                        placeholder="0,00"
                                      />
                                      <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">
                                        XAF
                                      </span>
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Total capitalized cost
                                    </label>
                                    <div className="flex items-center">
                                      <input
                                        type="text"
                                        value={newAssetForm.total_capitalized_cost || '59160515,00'}
                                        onChange={(e) => setNewAssetForm({...newAssetForm, total_capitalized_cost: e.target.value})}
                                        className="w-full px-3 py-2 bg-[#6A8A82]/20 border border-[#6A8A82]/30 rounded-l-lg font-bold text-right text-[#353A3B]"
                                        placeholder="59160515,00"
                                        readOnly
                                      />
                                      <span className="px-3 py-2 bg-[#6A8A82]/20 border border-l-0 border-[#6A8A82]/30 rounded-r-lg text-[#353A3B] font-semibold">
                                        XAF
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Depreciation Details Section */}
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <TrendingDown className="w-5 h-5 mr-2 text-[#6A8A82]" />
                                Depreciation Details
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Depreciation method
                                  </label>
                                  <select
                                    value={newAssetForm.depreciation_method || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, depreciation_method: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="">-- Select --</option>
                                    <option value="straight_line">Straight Line</option>
                                    <option value="declining_balance">Declining Balance</option>
                                    <option value="sum_of_years">Sum of Years Digits</option>
                                    <option value="units_of_production">Units of Production</option>
                                    <option value="custom">Custom</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Depreciation start date
                                  </label>
                                  <input
                                    type="date"
                                    value={newAssetForm.depreciation_start_date || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, depreciation_start_date: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="jj/mm/aaaa"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Depreciation end date
                                  </label>
                                  <input
                                    type="date"
                                    value={newAssetForm.depreciation_end_date || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, depreciation_end_date: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="jj/mm/aaaa"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Useful life (Months)
                                  </label>
                                  <input
                                    type="number"
                                    value={newAssetForm.useful_life_months || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, useful_life_months: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="60"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Life time in years
                                  </label>
                                  <input
                                    type="number"
                                    value={newAssetForm.lifetime_years || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, lifetime_years: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="5"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Remaining life
                                  </label>
                                  <input
                                    type="number"
                                    value={newAssetForm.remaining_life || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, remaining_life: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="48"
                                  />
                                </div>

                                <div className="md:col-span-3">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Depreciation type
                                  </label>
                                  <select
                                    value={newAssetForm.depreciation_type || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, depreciation_type: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="">-- Select --</option>
                                    <option value="fiscal">Fiscal</option>
                                    <option value="accounting">Accounting</option>
                                    <option value="both">Both (Fiscal & Accounting)</option>
                                    <option value="economic">Economic</option>
                                  </select>
                                </div>
                              </div>
                            </div>

                            {/* Reporting and Verification Section */}
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <FileText className="w-5 h-5 mr-2 text-[#6A8A82]" />
                                Reporting and Verification
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Reporting frequency
                                  </label>
                                  <select
                                    value={newAssetForm.reporting_frequency || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, reporting_frequency: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="">-- Select --</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="quarterly">Quarterly</option>
                                    <option value="semi_annual">Semi-Annual</option>
                                    <option value="annual">Annual</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Verification date
                                  </label>
                                  <input
                                    type="date"
                                    value={newAssetForm.verification_date || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, verification_date: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="jj/mm/aaaa"
                                  />
                                </div>

                                <div className="md:col-span-2">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Verification process
                                  </label>
                                  <textarea
                                    value={newAssetForm.verification_process || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, verification_process: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    rows={3}
                                    placeholder="Describe the verification process..."
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Depreciation Table Tab */}
                        {activeImmobilisationTab === 'table' && (
                          <div className="space-y-6">
                            <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                              <BarChart3 className="w-5 h-5 mr-2 text-[#6A8A82]" />
                              Table d'amortissement
                            </h4>
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Année</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Valeur début</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Dotation</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Cumul</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">VNC</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {[...Array(5)].map((_, i) => (
                                    <tr key={i}>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {2024 + i}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {formatCurrency(1000000 - (i * 200000))}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {formatCurrency(200000)}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {formatCurrency((i + 1) * 200000)}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {formatCurrency(1000000 - ((i + 1) * 200000))}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Accounting Tab */}
                        {activeImmobilisationTab === 'accounting' && (
                          <div className="space-y-8">
                            {/* Cost Accounting Section - Assets List */}
                            <div className="space-y-4">
                              <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                                <Database className="w-5 h-5 mr-2 text-[#6A8A82]" />
                                Cost Accounting - Assets List
                              </h4>

                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-4">
                                  <h5 className="text-sm font-semibold text-gray-700">Assets List</h5>
                                  <div className="flex space-x-2">
                                    <button className="px-3 py-1 bg-[#6A8A82]/50 text-[#6A8A82] text-xs font-medium rounded hover:bg-[#6A8A82]/20">
                                      Export CSV
                                    </button>
                                    <button className="px-3 py-1 bg-green-50 text-green-600 text-xs font-medium rounded hover:bg-green-100">
                                      Add Asset
                                    </button>
                                  </div>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-white">
                                      <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                          Asset ID
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                          Asset name/Description
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                          Asset category
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                          Location
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                          Acquisition date
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {[
                                        {
                                          id: 'FA001',
                                          name: 'Office furniture',
                                          category: 'Furniture',
                                          location: 'Office building 1',
                                          date: '15/01/2022'
                                        },
                                        {
                                          id: 'FA002',
                                          name: 'Laptop Dell XPS',
                                          category: 'IT Equipment',
                                          location: 'Office building 2',
                                          date: '20/03/2022'
                                        },
                                        {
                                          id: 'FA003',
                                          name: 'Toyota Hilux',
                                          category: 'Vehicle',
                                          location: 'Parking A',
                                          date: '10/06/2022'
                                        },
                                        {
                                          id: 'FA004',
                                          name: 'Air Conditioner',
                                          category: 'Equipment',
                                          location: 'Office building 1',
                                          date: '05/08/2022'
                                        },
                                        {
                                          id: 'FA005',
                                          name: 'Conference Table',
                                          category: 'Furniture',
                                          location: 'Meeting Room A',
                                          date: '12/09/2022'
                                        }
                                      ].map((asset, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {asset.id}
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            {asset.name}
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            <span className="px-2 py-1 text-xs font-medium bg-[#6A8A82]/20 text-[#5A7A72] rounded">
                                              {asset.category}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            {asset.location}
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            {asset.date}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
                                  <span>Showing 5 of 150 assets</span>
                                  <div className="flex space-x-1">
                                    <button className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">Previous</button>
                                    <button className="px-2 py-1 bg-[#6A8A82] text-white rounded">1</button>
                                    <button className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">2</button>
                                    <button className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">3</button>
                                    <button className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">Next</button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Cost Accounting - Maintenance */}
                            <div className="space-y-4">
                              <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                                <Wrench className="w-5 h-5 mr-2 text-[#6A8A82]" />
                                Cost Accounting - Maintenance
                              </h4>

                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-4">
                                  <h5 className="text-sm font-semibold text-gray-700">Maintenance History</h5>
                                  <div className="flex space-x-2">
                                    <button className="px-3 py-1 bg-[#6A8A82]/50 text-[#6A8A82] text-xs font-medium rounded hover:bg-[#6A8A82]/20">
                                      Export PDF
                                    </button>
                                    <button className="px-3 py-1 bg-green-50 text-green-600 text-xs font-medium rounded hover:bg-green-100">
                                      Add Maintenance
                                    </button>
                                  </div>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-white">
                                      <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                          Maintenance Date
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                          Vendor
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                          Component
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                          Description
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                          GRSE
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                          Invoice
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                                          Amount
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                                          Status
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {[
                                        {
                                          date: '15/01/2024',
                                          vendor: 'Tech Services SA',
                                          component: 'Air Filter',
                                          description: 'Remplacement filtre climatisation',
                                          grse: 'GR-2024-001',
                                          invoice: 'INV-2024-456',
                                          amount: 300000,
                                          status: 'Paid'
                                        },
                                        {
                                          date: '20/02/2024',
                                          vendor: 'Auto Maintenance Ltd',
                                          component: 'Engine Oil',
                                          description: 'Vidange moteur véhicule',
                                          grse: 'GR-2024-002',
                                          invoice: 'INV-2024-789',
                                          amount: 300000,
                                          status: 'Paid'
                                        },
                                        {
                                          date: '10/03/2024',
                                          vendor: 'Building Services',
                                          component: 'Electrical System',
                                          description: 'Réparation système électrique',
                                          grse: 'GR-2024-003',
                                          invoice: 'INV-2024-123',
                                          amount: 300000,
                                          status: 'Pending'
                                        }
                                      ].map((maintenance, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            {maintenance.date}
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            {maintenance.vendor}
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            {maintenance.component}
                                          </td>
                                          <td className="px-4 py-3 text-sm text-gray-600">
                                            {maintenance.description}
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            <span className="text-[#6A8A82] hover:underline cursor-pointer">
                                              {maintenance.grse}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            <span className="text-[#6A8A82] hover:underline cursor-pointer">
                                              {maintenance.invoice}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                                            {maintenance.amount.toLocaleString()} XAF
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-center">
                                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                                              maintenance.status === 'Paid'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                              {maintenance.status}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                      {/* Total Row */}
                                      <tr className="bg-gray-100 font-semibold">
                                        <td colSpan={6} className="px-4 py-3 text-sm text-gray-900 text-right">
                                          Total:
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-900">
                                          900,000 XAF
                                        </td>
                                        <td className="px-4 py-3"></td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>

                                <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
                                  <span>Showing 3 maintenance records</span>
                                  <div className="flex items-center space-x-4">
                                    <div className="flex items-center">
                                      <span className="w-3 h-3 bg-green-100 rounded-full mr-2"></span>
                                      <span>Paid: 2</span>
                                    </div>
                                    <div className="flex items-center">
                                      <span className="w-3 h-3 bg-yellow-100 rounded-full mr-2"></span>
                                      <span>Pending: 1</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* History Tab */}
                        {activeImmobilisationTab === 'history' && (
                          <div className="space-y-6">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                                <History className="w-5 h-5 mr-2 text-[#6A8A82]" />
                                Historique des changements
                              </h4>
                              <div className="flex space-x-2">
                                <button className="px-3 py-1 bg-[#6A8A82]/50 text-[#6A8A82] text-xs font-medium rounded hover:bg-[#6A8A82]/20 flex items-center">
                                  <Download className="w-3 h-3 mr-1" />
                                  Export
                                </button>
                                <button className="px-3 py-1 bg-gray-50 text-gray-600 text-xs font-medium rounded hover:bg-gray-100 flex items-center">
                                  <Filter className="w-3 h-3 mr-1" />
                                  Filter
                                </button>
                              </div>
                            </div>

                            <div className="overflow-x-auto shadow-sm border border-gray-200 rounded-lg">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                      Date<br/>du changement
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                      Numéro<br/>de l'actif
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                      Description<br/>de l'actif
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                      Type de<br/>changement
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                      Ancienne<br/>valeur
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                      Nouvelle<br/>valeur
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                      Ancien<br/>centre de coût
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                      Nouveau<br/>centre de coût
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                      Ancienne<br/>méthode de<br/>dépréciation
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                      Nouvelle<br/>méthode de<br/>dépréciation
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                      Ancienne<br/>durée de vie<br/>estimée
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                      Nouvelle<br/>durée de vie<br/>estimée
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                      Ancienne<br/>Valeur<br/>résiduelle
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                      Nouvelle<br/>Valeur<br/>résiduelle
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                      Responsable<br/>du changement
                                    </th>
                                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                                      Commentaires
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {[
                                    {
                                      date: '20/08/2024',
                                      assetNumber: '12345',
                                      description: 'Ordinateur portable',
                                      changeType: 'Réévaluation',
                                      oldValue: '999 999 999',
                                      newValue: '999 999 999',
                                      oldCostCenter: 'Centre A',
                                      newCostCenter: 'Centre B',
                                      oldDepMethod: 'Linéaire',
                                      newDepMethod: 'Dégressif',
                                      oldLifespan: '5 ans',
                                      newLifespan: '4 ans',
                                      oldResidual: '999 999 999',
                                      newResidual: '999 999 999',
                                      responsible: 'Pamela Atokouna',
                                      hasComment: true
                                    },
                                    {
                                      date: '15/07/2024',
                                      assetNumber: '12346',
                                      description: 'Véhicule Toyota',
                                      changeType: 'Changement localisation',
                                      oldValue: '15 000 000',
                                      newValue: '15 000 000',
                                      oldCostCenter: 'Centre B',
                                      newCostCenter: 'Centre C',
                                      oldDepMethod: 'Dégressif',
                                      newDepMethod: 'Dégressif',
                                      oldLifespan: '7 ans',
                                      newLifespan: '7 ans',
                                      oldResidual: '2 000 000',
                                      newResidual: '2 000 000',
                                      responsible: 'Jean Dupont',
                                      hasComment: true
                                    },
                                    {
                                      date: '10/06/2024',
                                      assetNumber: '12347',
                                      description: 'Mobilier de bureau',
                                      changeType: 'Mise à jour valeur',
                                      oldValue: '5 000 000',
                                      newValue: '4 500 000',
                                      oldCostCenter: 'Centre A',
                                      newCostCenter: 'Centre A',
                                      oldDepMethod: 'Linéaire',
                                      newDepMethod: 'Linéaire',
                                      oldLifespan: '10 ans',
                                      newLifespan: '10 ans',
                                      oldResidual: '500 000',
                                      newResidual: '450 000',
                                      responsible: 'Marie Kouam',
                                      hasComment: false
                                    }
                                  ].map((item, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                                        {item.date}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-[#6A8A82]">
                                        {item.assetNumber}
                                      </td>
                                      <td className="px-3 py-2 text-xs text-gray-700 max-w-[150px] truncate">
                                        {item.description}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap">
                                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                                          {item.changeType}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600 text-right">
                                        {item.oldValue}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 font-medium text-right">
                                        {item.newValue}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                                        {item.oldCostCenter}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 font-medium">
                                        {item.newCostCenter}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                                        {item.oldDepMethod}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 font-medium">
                                        {item.newDepMethod}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600 text-center">
                                        {item.oldLifespan}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 font-medium text-center">
                                        {item.newLifespan}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600 text-right">
                                        {item.oldResidual}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 font-medium text-right">
                                        {item.newResidual}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700">
                                        {item.responsible}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-center">
                                        {item.hasComment ? (
                                          <button
                                            className="text-[#6A8A82] hover:text-[#5A7A72]"
                                            title="Voir les commentaires"
                                          >
                                            <FileText className="w-4 h-4" />
                                          </button>
                                        ) : (
                                          <span className="text-gray-700">-</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Pagination */}
                            <div className="flex items-center justify-between text-xs text-gray-600 mt-4">
                              <span>Affichage de 3 sur 150 changements</span>
                              <div className="flex space-x-1">
                                <button className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">Précédent</button>
                                <button className="px-2 py-1 bg-[#6A8A82] text-white rounded">1</button>
                                <button className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">2</button>
                                <button className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">3</button>
                                <button className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">Suivant</button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Sales Tab */}

                  {activeFormTab === 'vente' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                        <TrendingUp className="w-5 h-5 mr-2 text-[#6A8A82]" />
                        Données de vente
                      </h3>

                      {/* Sales Table */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="text-sm font-semibold text-gray-700">Historique des ventes</h5>
                          <div className="flex space-x-2">
                            <button className="px-3 py-1 bg-[#6A8A82]/50 text-[#6A8A82] text-xs font-medium rounded hover:bg-[#6A8A82]/20">
                              Export Excel
                            </button>
                            <button className="px-3 py-1 bg-green-50 text-green-600 text-xs font-medium rounded hover:bg-green-100">
                              Ajouter une vente
                            </button>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-white">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Sale Date
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Buyer/Recipient
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Book Value
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Selling Price
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Sales Invoice/Receipt
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {[
                                {
                                  date: '15/09/2023',
                                  buyer: 'XYZ Corporation',
                                  bookValue: '',
                                  sellingPrice: 1500000,
                                  invoice: 'INV2023-001'
                                },
                                {
                                  date: '15/09/2023',
                                  buyer: 'XYZ Corporation',
                                  bookValue: '',
                                  sellingPrice: 1500000,
                                  invoice: 'INV2023-001'
                                },
                                {
                                  date: '15/09/2023',
                                  buyer: 'XYZ Corporation',
                                  bookValue: '',
                                  sellingPrice: 1500000,
                                  invoice: 'INV2023-001'
                                }
                              ].map((sale, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                    {sale.date}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                                    {sale.buyer}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-600">
                                    {sale.bookValue || '-'}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                                    {sale.sellingPrice.toLocaleString()} XAF
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                    <span className="text-[#6A8A82] hover:underline cursor-pointer">
                                      {sale.invoice}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-center">
                                    <div className="flex items-center justify-center space-x-2">
                                      <button className="text-[#6A8A82] hover:text-[#5A7A72]" aria-label="Voir les détails">
                                        <Eye className="w-4 h-4" />
                                      </button>
                                      <button className="text-gray-600 hover:text-gray-800">
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button className="text-red-600 hover:text-red-800" aria-label="Supprimer">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
                          <span>Affichage de 3 ventes</span>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-gray-700 mr-2">Total ventes:</span>
                              <span className="text-sm font-bold text-green-600">4,500,000 XAF</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Additional Sale Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <h5 className="text-sm font-semibold text-gray-700 mb-3">Informations de la dernière vente</h5>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Date de vente:</span>
                              <span className="text-sm font-medium text-gray-900">15/09/2023</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Acheteur:</span>
                              <span className="text-sm font-medium text-gray-900">XYZ Corporation</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Prix de vente:</span>
                              <span className="text-sm font-medium text-green-600">1,500,000 XAF</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Plus/Moins-value:</span>
                              <span className="text-sm font-medium text-green-600">+500,000 XAF</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <h5 className="text-sm font-semibold text-gray-700 mb-3">Documents de vente</h5>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center">
                                <FileText className="w-4 h-4 text-[#6A8A82] mr-2" />
                                <span className="text-sm text-gray-700">Facture de vente</span>
                              </div>
                              <button className="text-[#6A8A82] hover:text-[#5A7A72] text-sm">
                                Télécharger
                              </button>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center">
                                <FileText className="w-4 h-4 text-[#6A8A82] mr-2" />
                                <span className="text-sm text-gray-700">Contrat de cession</span>
                              </div>
                              <button className="text-[#6A8A82] hover:text-[#5A7A72] text-sm">
                                Télécharger
                              </button>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center">
                                <FileText className="w-4 h-4 text-[#6A8A82] mr-2" />
                                <span className="text-sm text-gray-700">Certificat de transfert</span>
                              </div>
                              <button className="text-[#6A8A82] hover:text-[#5A7A72] text-sm">
                                Télécharger
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section Composants */}

                  {activeFormTab === 'composants' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                        <Package className="w-5 h-5 mr-2 text-[#6A8A82]" />
                        Composants de l'actif
                      </h3>

                      {/* Composants Table */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="text-sm font-semibold text-gray-700">Liste des composants</h5>
                          <div className="flex space-x-2">
                            <button className="px-3 py-1 bg-[#6A8A82]/50 text-[#6A8A82] text-xs font-medium rounded hover:bg-[#6A8A82]/20">
                              Export Excel
                            </button>
                            <button className="px-3 py-1 bg-green-50 text-green-600 text-xs font-medium rounded hover:bg-green-100">
                              Ajouter un composant
                            </button>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-white">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Code
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Name
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Description
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  État
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Catégorie
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Date d'installation
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Localisation
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {[
                                {
                                  code: 'COMP-001',
                                  name: 'Moteur principal',
                                  description: 'Moteur diesel 4 cylindres',
                                  etat: 'Bon',
                                  categorie: 'Mécanique',
                                  dateInstallation: '15/01/2023',
                                  localisation: 'Bloc moteur'
                                },
                                {
                                  code: 'COMP-002',
                                  name: 'Système de freinage',
                                  description: 'Freins à disque ventilés',
                                  etat: 'Usagé',
                                  categorie: 'Mécanique',
                                  dateInstallation: '15/01/2023',
                                  localisation: 'Trains avant/arrière'
                                },
                                {
                                  code: 'COMP-003',
                                  name: 'Tableau de bord',
                                  description: 'Système d\'affichage numérique',
                                  etat: 'Neuf',
                                  categorie: 'Électronique',
                                  dateInstallation: '20/06/2024',
                                  localisation: 'Habitacle'
                                }
                              ].map((composant, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-[#6A8A82]">
                                    {composant.code}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {composant.name}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {composant.description}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                                      composant.etat === 'Neuf' ? 'bg-green-100 text-green-700' :
                                      composant.etat === 'Bon' ? 'bg-[#6A8A82]/20 text-[#5A7A72]' :
                                      composant.etat === 'Usagé' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-red-100 text-red-700'
                                    }`}>
                                      {composant.etat}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                    {composant.categorie}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                    {composant.dateInstallation}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                    {composant.localisation}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-center">
                                    <div className="flex items-center justify-center space-x-2">
                                      <button className="text-[#6A8A82] hover:text-[#5A7A72]" aria-label="Voir les détails">
                                        <Eye className="w-4 h-4" />
                                      </button>
                                      <button className="text-gray-600 hover:text-gray-800">
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button className="text-red-600 hover:text-red-800" aria-label="Supprimer">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
                          <span>Affichage de 3 composants</span>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                              <span className="w-3 h-3 bg-green-100 rounded-full mr-2"></span>
                              <span>Neuf: 1</span>
                            </div>
                            <div className="flex items-center">
                              <span className="w-3 h-3 bg-[#6A8A82]/20 rounded-full mr-2"></span>
                              <span>Bon: 1</span>
                            </div>
                            <div className="flex items-center">
                              <span className="w-3 h-3 bg-yellow-100 rounded-full mr-2"></span>
                              <span>Usagé: 1</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section Données de maintenance */}

                  {activeFormTab === 'maintenance' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                        <Wrench className="w-5 h-5 mr-2 text-[#6A8A82]" />
                        Données de maintenance
                      </h3>

                      {/* Sub-tabs for Maintenance */}
                      <div className="border-b border-gray-200">
                        <nav className="flex space-x-8">
                          {[
                            { id: 'contract', label: 'Contrat de maintenance', icon: FileText },
                            { id: 'history', label: 'Historique de maintenance', icon: History }
                          ].map((tab) => {
                            const IconComponent = tab.icon;
                            return (
                              <button
                                key={tab.id}
                                onClick={() => setActiveMaintenanceTab(tab.id)}
                                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                  (activeMaintenanceTab || 'contract') === tab.id
                                    ? 'border-[#6A8A82] text-[#6A8A82]'
                                    : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'
                                }`}
                              >
                                <IconComponent className="w-4 h-4 mr-2" />
                                {tab.label}
                              </button>
                            );
                          })}
                        </nav>
                      </div>

                      {/* Contract Tab */}
                      {(activeMaintenanceTab || 'contract') === 'contract' && (
                        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
                        <h4 className="text-md font-semibold text-gray-800 border-b pb-2">
                          Maintenance Service Contract
                        </h4>

                        {/* Basic contract information */}
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-4">Basic contract information</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Contract name</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Contract name"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Vendor</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Vendor"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">EDTCI</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="EDTCI"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Parent site reference</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Parent site reference"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Contract type</label>
                              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                <option>-- Sélectionnez --</option>
                                <option>Service complet</option>
                                <option>Préventif</option>
                                <option>À la demande</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Contract object</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Contract object"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Vendor #</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Vendor number"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">GLA (m²)</label>
                              <input
                                type="number"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Code contract</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Code contract"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Contracted parties information */}
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-4">Contracted parties information</h5>

                          {/* Structure Information */}
                          <div className="mb-4">
                            <h6 className="text-xs font-semibold text-gray-600 uppercase mb-3">Structure</h6>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Legal signatory</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Legal signatory"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">EDTCI</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="EDTCI"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Structure address</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Structure address"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Phone number</label>
                                <input
                                  type="tel"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Phone number"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Email address</label>
                                <input
                                  type="email"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Email address"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">ID/Reg</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="ID/Reg"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Vendor Information */}
                          <div>
                            <h6 className="text-xs font-semibold text-gray-600 uppercase mb-3">Vendor</h6>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Vendor name</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Vendor name"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Address</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Vendor address"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Phone number</label>
                                <input
                                  type="tel"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Phone number"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Email address</label>
                                <input
                                  type="email"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Email address"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">ID/Reg</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="ID/Reg"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Creation informations */}
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-4">Creation informations</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Created by</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Created by"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Creation date</label>
                              <input
                                type="date"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="jj/mm/aaaa"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Price & payment terms */}
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-4">Price & payment terms</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Contract obligation</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Contract obligation"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Tax rate</label>
                              <input
                                type="number"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="0%"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Payment term</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Payment term"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">P. method</label>
                              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                <option>Virement</option>
                                <option>Chèque</option>
                                <option>Espèces</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Price list summary excluding VAT */}
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-4">Price list summary excluding VAT</h5>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Year</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Item</th>
                                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Amount</th>
                                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                <tr>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm">1</td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm">Maintenance préventive</td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right">15,000,000</td>
                                  <td className="px-4 py-3 whitespace-nowrap text-center">
                                    <button className="text-[#6A8A82] hover:text-[#5A7A72]">
                                      <Edit className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                                {[...Array(5)].map((_, index) => (
                                  <tr key={index}>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">-</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">-</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right">-</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-center">-</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-gray-100">
                                <tr>
                                  <td colSpan={2} className="px-4 py-3 text-sm font-semibold">Total</td>
                                  <td className="px-4 py-3 text-sm font-semibold text-right">15,000,000</td>
                                  <td></td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>

                        {/* Contract key dates */}
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-4">Contract key dates</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Contract start date</label>
                              <input
                                type="date"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="jj/mm/aaaa"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Contract end date</label>
                              <input
                                type="date"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="jj/mm/aaaa"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Contract duration</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Duration"
                                readOnly
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Commencement date</label>
                              <input
                                type="date"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="jj/mm/aaaa"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Contract expiry date</label>
                              <input
                                type="date"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="jj/mm/aaaa"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      )}

                      {activeMaintenanceTab === 'history' && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h5 className="text-sm font-semibold text-gray-700">Maintenance History</h5>
                            <div className="flex space-x-2">
                              <button className="px-3 py-1 bg-[#6A8A82]/50 text-[#6A8A82] text-xs font-medium rounded hover:bg-[#6A8A82]/20">
                                Export Excel
                              </button>
                              <button className="px-3 py-1 bg-green-50 text-green-600 text-xs font-medium rounded hover:bg-green-100">
                                Add Maintenance
                              </button>
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-white">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('common.date')}</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Type</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Description</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Technician</th>
                                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Cost</th>
                                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {[
                                  {
                                    date: '20/02/2024',
                                    type: 'Préventive',
                                    description: 'Vidange moteur véhicule',
                                    technician: 'Auto Maintenance Ltd',
                                    cost: 250000,
                                    status: 'Completed'
                                  },
                                  {
                                    date: '15/05/2024',
                                    type: 'Corrective',
                                    description: 'Remplacement plaquettes de frein',
                                    technician: 'Tech Services SA',
                                    cost: 350000,
                                    status: 'Completed'
                                  },
                                  {
                                    date: '01/08/2024',
                                    type: 'Préventive',
                                    description: 'Révision générale',
                                    technician: 'Maintenance Plus',
                                    cost: 500000,
                                    status: 'Pending'
                                  }
                                ].map((maintenance, index) => (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{maintenance.date}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                                        maintenance.type === 'Préventive' ? 'bg-[#6A8A82]/20 text-[#5A7A72]' : 'bg-orange-100 text-orange-700'
                                      }`}>
                                        {maintenance.type}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{maintenance.description}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{maintenance.technician}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                                      {maintenance.cost.toLocaleString()} XAF
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-center">
                                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                                        maintenance.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                      }`}>
                                        {maintenance.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Statistics */}
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white border border-gray-200 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Total maintenances</span>
                                <span className="text-lg font-semibold text-[#6A8A82]">12</span>
                              </div>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Coût total</span>
                                <span className="text-lg font-semibold text-green-600">2,850,000 XAF</span>
                              </div>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Prochaine maintenance</span>
                                <span className="text-lg font-semibold text-orange-600">Dans 15 jours</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Section Attachements */}
                  {activeFormTab === 'attachements' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                        <Paperclip className="w-5 h-5 mr-2 text-[#6A8A82]" />
                        Attachements
                      </h3>

                      {/* Upload Area */}
                      <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-[#6A8A82]/40 transition-colors">
                        <div className="text-center">
                          <Upload className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">
                            Glissez-déposez vos fichiers ici
                          </h4>
                          <p className="text-xs text-gray-700 mb-4">
                            ou cliquez pour parcourir
                          </p>
                          <button className="px-4 py-2 bg-[#6A8A82] text-white text-sm rounded-lg hover:bg-[#5A7A72] transition-colors">
                            Sélectionner des fichiers
                          </button>
                          <p className="text-xs text-gray-700 mt-2">
                            Formats acceptés: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (Max 10MB)
                          </p>
                        </div>
                      </div>

                      {/* File Categories */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                          { name: 'Documents administratifs', count: 5, icon: FileText, color: 'blue' },
                          { name: 'Photos', count: 12, icon: Camera, color: 'green' },
                          { name: 'Contrats', count: 3, icon: Shield, color: 'purple' },
                          { name: 'Rapports techniques', count: 8, icon: Wrench, color: 'orange' }
                        ].map((category, index) => {
                          const IconComponent = category.icon;
                          return (
                            <div key={index} className={`bg-${category.color}-50 border border-${category.color}-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow`}>
                              <div className="flex items-center justify-between mb-2">
                                <IconComponent className={`w-6 h-6 text-${category.color}-600`} />
                                <span className={`text-sm font-semibold text-${category.color}-700`}>{category.count}</span>
                              </div>
                              <p className="text-sm text-gray-700 font-medium">{category.name}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Section Notes */}
                  {activeFormTab === 'notes' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                        <Edit className="w-5 h-5 mr-2 text-[#6A8A82]" />
                        Notes
                      </h3>

                      {/* Add New Note */}
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-[#6A8A82]/20 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-[#6A8A82]" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <textarea
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                              rows={3}
                              placeholder="Ajouter une note..."
                            />
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <select className="px-3 py-1 border border-gray-300 rounded text-sm">
                                  <option>Général</option>
                                  <option>Technique</option>
                                  <option>Maintenance</option>
                                  <option>Important</option>
                                  <option>Rappel</option>
                                </select>
                                <select className="px-3 py-1 border border-gray-300 rounded text-sm">
                                  <option>Normale</option>
                                  <option>Haute</option>
                                  <option>Urgente</option>
                                </select>
                              </div>
                              <button className="px-4 py-2 bg-[#6A8A82] text-white text-sm rounded-lg hover:bg-[#5A7A72] transition-colors">
                                Ajouter la note
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Notes Filter */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <button className="px-3 py-1 bg-[#6A8A82] text-white text-xs font-medium rounded">
                            Toutes (8)
                          </button>
                          <button className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200">
                            Général (3)
                          </button>
                          <button className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200">
                            Technique (2)
                          </button>
                          <button className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200">
                            Maintenance (2)
                          </button>
                          <button className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200">
                            Important (1)
                          </button>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            placeholder="Rechercher..."
                            className="px-3 py-1 border border-gray-300 rounded text-sm"
                          />
                          <select className="px-3 py-1 border border-gray-300 rounded text-sm">
                            <option>Plus récentes</option>
                            <option>Plus anciennes</option>
                            <option>Priorité haute</option>
                          </select>
                        </div>
                      </div>

                      {/* Notes List */}
                      <div className="space-y-4">
                        {[
                          {
                            id: 1,
                            type: 'Important',
                            priority: 'Haute',
                            subject: 'Maintenance urgente requise',
                            content: 'Le véhicule nécessite une révision complète avant la fin du mois. Les freins montrent des signes d\'usure avancée et doivent être vérifiés immédiatement.',
                            author: 'Jean Dupont',
                            date: '20/03/2024 14:30',
                            replies: 2,
                            hasAction: true,
                            actionDueDate: '30/03/2024',
                            assignedTo: 'Service Technique',
                            typeColor: 'red',
                            priorityColor: 'red'
                          },
                          {
                            id: 2,
                            type: 'Maintenance',
                            priority: 'Normale',
                            subject: 'Vidange effectuée',
                            content: 'Vidange moteur effectuée le 15/03/2024. Prochaine vidange prévue dans 10,000 km ou 6 mois.',
                            author: 'Tech Services',
                            date: '15/03/2024 10:15',
                            replies: 0,
                            hasAction: false,
                            typeColor: 'orange',
                            priorityColor: 'gray'
                          },
                          {
                            id: 3,
                            type: 'Général',
                            priority: 'Normale',
                            subject: 'Changement d\'affectation',
                            content: 'L\'actif a été transféré du département Commercial vers le département Logistique.',
                            author: 'Marie Martin',
                            date: '10/03/2024 09:00',
                            replies: 1,
                            hasAction: false,
                            typeColor: 'blue',
                            priorityColor: 'gray'
                          },
                          {
                            id: 4,
                            type: 'Technique',
                            priority: 'Normale',
                            subject: 'Mise à jour firmware',
                            content: 'Le système embarqué a été mis à jour vers la version 2.4.1. Amélioration de la consommation et correction de bugs mineurs.',
                            author: 'Paul Tech',
                            date: '05/03/2024 16:45',
                            replies: 0,
                            hasAction: false,
                            typeColor: 'green',
                            priorityColor: 'gray'
                          }
                        ].map((note) => (
                          <div key={note.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0">
                                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                    <User className="w-5 h-5 text-gray-600" />
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className={`px-2 py-1 text-xs font-medium bg-${note.typeColor}-100 text-${note.typeColor}-700 rounded`}>
                                      {note.type}
                                    </span>
                                    <span className={`px-2 py-1 text-xs font-medium bg-${note.priorityColor}-100 text-${note.priorityColor}-700 rounded`}>
                                      {note.priority}
                                    </span>
                                    {note.hasAction && (
                                      <span className="px-2 py-1 text-xs font-medium bg-[#B87333]/10 text-purple-700 rounded flex items-center">
                                        <Clock className="w-3 h-3 mr-1" />
                                        Action requise
                                      </span>
                                    )}
                                  </div>
                                  <h5 className="text-sm font-semibold text-gray-900 mb-1">{note.subject}</h5>
                                  <p className="text-sm text-gray-600 mb-2">{note.content}</p>

                                  {note.hasAction && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-2">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-yellow-700">
                                          <strong>Action:</strong> Assignée à {note.assignedTo}
                                        </span>
                                        <span className="text-yellow-700">
                                          <strong>Échéance:</strong> {note.actionDueDate}
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between text-xs text-gray-700">
                                    <div className="flex items-center space-x-3">
                                      <span>{note.author}</span>
                                      <span>{note.date}</span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                      {note.replies > 0 && (
                                        <button className="flex items-center text-[#6A8A82] hover:text-[#5A7A72]">
                                          <FileText className="w-3 h-3 mr-1" />
                                          {note.replies} réponse{note.replies > 1 ? 's' : ''}
                                        </button>
                                      )}
                                      <button className="text-gray-600 hover:text-gray-800">
                                        <Edit className="w-3 h-3" />
                                      </button>
                                      <button className="text-red-600 hover:text-red-800" aria-label="Supprimer">
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Load More */}
                      <div className="text-center">
                        <button className="px-4 py-2 text-sm text-[#6A8A82] hover:text-[#5A7A72] font-medium">
                          Charger plus de notes...
                        </button>
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* Fixed Action buttons at bottom */}
            <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
                <button
                  onClick={() => {
                    setShowNewAssetModal(false);
                    setIsEditing(false);
                    setEditingAsset(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Annuler
                </button>
                <ModernButton onClick={() => {
                  const assetToSave = isEditing && editingAsset
                    ? { ...editingAsset, ...newAssetForm }
                    : newAssetForm;
                  handleSaveAsset(assetToSave);
                  setShowNewAssetModal(false);
                  setIsEditing(false);
                  setEditingAsset(null);
                }}>
                  {isEditing ? "Enregistrer les modifications" : "Créer l'actif"}
                </ModernButton>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Modal Dupliquer */}
      {showDuplicateModal && selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center">
                <Copy className="w-5 h-5 mr-2 text-[#6A8A82]" />
                Dupliquer l'actif
              </h3>
              <button onClick={() => setShowDuplicateModal(false)} className="text-gray-700 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Vous allez créer une copie de l'actif <strong>{selectedAsset.numeroActif}</strong>
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau numéro d'actif</label>
                <input
                  type="text"
                  defaultValue={`${selectedAsset.numeroActif}-COPIE`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nouvelle description</label>
                <input
                  type="text"
                  defaultValue={`${selectedAsset.description} (Copie)`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  alert(`Actif dupliqué avec succès`);
                  setShowDuplicateModal(false);
                }}
                className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72]"
              >
                Dupliquer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Archiver */}
      {showArchiveModal && selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center">
                <Archive className="w-5 h-5 mr-2 text-orange-500" />
                Archiver l'actif
              </h3>
              <button onClick={() => setShowArchiveModal(false)} className="text-gray-700 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Êtes-vous sûr de vouloir archiver l'actif <strong>{selectedAsset.numeroActif}</strong> ?
            </p>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-orange-800">
                L'actif sera déplacé dans les archives et ne sera plus visible dans la liste principale.
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Raison de l'archivage</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option>Actif obsolète</option>
                  <option>Fin de vie</option>
                  <option>Remplacé</option>
                  <option>Plus utilisé</option>
                  <option>Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Ajoutez des notes..."
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowArchiveModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  alert(`Actif archivé avec succès`);
                  setShowArchiveModal(false);
                }}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                Archiver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Imprimer Étiquette */}
      {showPrintLabelModal && selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center">
                <Tag className="w-5 h-5 mr-2 text-blue-500" />
                Imprimer l'étiquette
              </h3>
              <button onClick={() => setShowPrintLabelModal(false)} className="text-gray-700 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-bold text-lg">{selectedAsset.numeroActif}</p>
                  <p className="text-sm text-gray-600">{selectedAsset.description}</p>
                  <p className="text-xs text-gray-700">Classe: {selectedAsset.classe}</p>
                </div>
                <div className="w-20 h-20 bg-gray-200 flex items-center justify-center">
                  <QrCode className="w-12 h-12 text-gray-600" />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Format d'étiquette</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option>Standard (70x30mm)</option>
                  <option>Petit (50x25mm)</option>
                  <option>Grand (100x50mm)</option>
                  <option>Code-barres seulement</option>
                </select>
              </div>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="mr-2" />
                  <span className="text-sm">Inclure QR Code</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="mr-2" />
                  <span className="text-sm">Inclure description</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowPrintLabelModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  window.print();
                  setShowPrintLabelModal(false);
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Imprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historique */}
      {showHistoryModal && selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center">
                  <History className="w-5 h-5 mr-2 text-purple-500" />
                  Historique de l'actif {selectedAsset.numeroActif}
                </h3>
                <button onClick={() => setShowHistoryModal(false)} className="text-gray-700 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {[
                  { date: '15/03/2024', user: 'Jean Dupont', action: 'Maintenance', detail: 'Vidange effectuée', status: 'success' },
                  { date: '01/03/2024', user: 'Marie Martin', action: 'Modification', detail: 'Changement de localisation', status: 'info' },
                  { date: '15/02/2024', user: 'Tech Service', action: 'Inspection', detail: 'Contrôle technique OK', status: 'success' },
                  { date: '10/01/2024', user: 'Admin', action: 'Mise à jour', detail: 'Actualisation valeur comptable', status: 'warning' },
                  { date: '16/06/2017', user: 'System', action: 'Création', detail: 'Actif créé dans le système', status: 'info' }
                ].map((event, idx) => (
                  <div key={idx} className="flex items-start space-x-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      event.status === 'success' ? 'bg-green-500' :
                      event.status === 'warning' ? 'bg-orange-500' :
                      event.status === 'info' ? 'bg-blue-500' : 'bg-gray-500'
                    }`} />
                    <div className="flex-1">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm">{event.action}</span>
                          <span className="text-xs text-gray-700">{event.date}</span>
                        </div>
                        <p className="text-sm text-gray-700">{event.detail}</p>
                        <p className="text-xs text-gray-700 mt-1">Par {event.user}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Exporter */}
      {showExportModal && selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center">
                <Download className="w-5 h-5 mr-2 text-green-500" />
                Exporter l'actif
              </h3>
              <button onClick={() => setShowExportModal(false)} className="text-gray-700 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Sélectionnez le format d'export pour l'actif <strong>{selectedAsset.numeroActif}</strong>
            </p>
            <div className="space-y-2">
              <button className="w-full p-3 text-left border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-between">
                <span className="flex items-center">
                  <FileText className="w-5 h-5 mr-3 text-blue-500" />
                  <div>
                    <p className="font-medium">Excel (.xlsx)</p>
                    <p className="text-xs text-gray-700">Feuille de calcul avec toutes les données</p>
                  </div>
                </span>
              </button>
              <button className="w-full p-3 text-left border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-between">
                <span className="flex items-center">
                  <FileText className="w-5 h-5 mr-3 text-green-500" />
                  <div>
                    <p className="font-medium">CSV (.csv)</p>
                    <p className="text-xs text-gray-700">Valeurs séparées par virgules</p>
                  </div>
                </span>
              </button>
              <button className="w-full p-3 text-left border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-between">
                <span className="flex items-center">
                  <FileText className="w-5 h-5 mr-3 text-red-500" />
                  <div>
                    <p className="font-medium">PDF (.pdf)</p>
                    <p className="text-xs text-gray-700">Document formaté pour impression</p>
                  </div>
                </span>
              </button>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Supprimer */}
      {showDeleteModal && selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center text-red-600">
                <Trash2 className="w-5 h-5 mr-2" />
                Supprimer l'actif
              </h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-gray-700 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800">
                <strong>Attention!</strong> Cette action est irréversible. L'actif sera définitivement supprimé du système.
              </p>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Vous êtes sur le point de supprimer l'actif:
            </p>
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="font-bold">{selectedAsset.numeroActif}</p>
              <p className="text-sm text-gray-600">{selectedAsset.description}</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tapez <strong>SUPPRIMER</strong> pour confirmer
              </label>
              <input
                type="text"
                placeholder="SUPPRIMER"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  alert(`Actif supprimé avec succès`);
                  setShowDeleteModal(false);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de sélection de période */}
      {periodSelectorModal}

    </div>
  );
};
export default AssetsListComplete;
