import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import PeriodSelectorModal from '../shared/PeriodSelectorModal';
import {
  X,
  FileText,
  Paperclip,
  MessageSquare,
  CheckCircle,
  ShoppingCart,
  CreditCard,
  ArrowRightLeft,
  Settings,
  Calendar,
  Hash,
  User,
  Building,
  Upload,
  File,
  Trash2,
  Eye,
  Download,
  Plus,
  Check,
  AlertCircle,
  ChevronDown,
  Search
} from 'lucide-react';
import SearchableDropdown from '../ui/SearchableDropdown';
import { TVAValidator, LigneEcriture as TVALigneEcriture, TVAValidationResult } from '../../utils/tvaValidation';

interface JournalEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
  mode?: 'create' | 'edit';
}

interface LigneEcriture {
  compte: string;
  libelle: string;
  debit: number;
  credit: number;
  codeAnalytique?: string;
  noteLigne?: string;
}

type TransactionType = 'purchase' | 'sale' | 'payment' | 'transfer' | 'other';

const JournalEntryModal: React.FC<JournalEntryModalProps> = ({
  isOpen,
  onClose,
  initialData,
  mode = 'create'
}) => {
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '2024-01-01', end: '2024-12-31' });
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('details');
  const [transactionType, setTransactionType] = useState<TransactionType>('purchase');
  const [isEquilibree, setIsEquilibree] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [currentNoteIndex, setCurrentNoteIndex] = useState<number | null>(null);
  const [tempNote, setTempNote] = useState('');
  const [searchCompte, setSearchCompte] = useState<{[key: number]: string}>({});
  const [showCompteDropdown, setShowCompteDropdown] = useState<number | null>(null);
  const [searchAnalytique, setSearchAnalytique] = useState<{[key: number]: string}>({});
  const [tvaValidation, setTvaValidation] = useState<TVAValidationResult | null>(null);
  const [showAnalytiqueDropdown, setShowAnalytiqueDropdown] = useState<number | null>(null);

  // Plan comptable SYSCOHADA simplifié
  const planComptable = [
    { code: '101000', libelle: 'Capital social' },
    { code: '401000', libelle: 'Fournisseurs' },
    { code: '401001', libelle: 'Fournisseur ACME' },
    { code: '411000', libelle: 'Clients' },
    { code: '411001', libelle: 'Client A' },
    { code: '445200', libelle: 'TVA déductible' },
    { code: '445710', libelle: 'TVA collectée' },
    { code: '512100', libelle: 'BNP Paribas' },
    { code: '512200', libelle: 'Société Générale' },
    { code: '531000', libelle: 'Caisse' },
    { code: '601000', libelle: 'Achats de marchandises' },
    { code: '607000', libelle: 'Achats marchandises' },
    { code: '624100', libelle: 'Transport sur achats' },
    { code: '625100', libelle: 'Voyages et déplacements' },
    { code: '626100', libelle: 'Frais postaux' },
    { code: '627100', libelle: 'Publicité' },
    { code: '701000', libelle: 'Ventes de marchandises' },
    { code: '706000', libelle: 'Prestations de services' },
    { code: '707000', libelle: 'Ventes marchandises' },
  ];

  // Codes analytiques
  const codesAnalytiques = [
    { code: 'CC001', libelle: 'CC001 - Commercial' },
    { code: 'CC002', libelle: 'CC002 - Production' },
    { code: 'CC003', libelle: 'CC003 - Administration' },
    { code: 'CC004', libelle: 'CC004 - Marketing' },
    { code: 'CC005', libelle: 'CC005 - R&D' },
    { code: 'PRJ001', libelle: 'PRJ001 - Projet Alpha' },
    { code: 'PRJ002', libelle: 'PRJ002 - Projet Beta' },
    { code: 'REG01', libelle: 'REG01 - Région Nord' },
    { code: 'REG02', libelle: 'REG02 - Région Sud' },
  ];

  // Fonction pour obtenir le journal selon le type
  const getJournalByType = (type: TransactionType, compteBank?: string) => {
    switch(type) {
      case 'purchase': return 'AC - Achats';
      case 'sale': return 'VE - Ventes';
      case 'payment':
        // Si c'est un règlement, vérifier si c'est caisse ou banque
        if (compteBank === '531000') {
          return 'CA - Caisse';
        }
        return 'BQ - Banque';
      case 'transfer': return 'TR - Trésorerie';
      case 'other': return 'OD - Opérations Diverses';
      default: return 'OD - Opérations Diverses';
    }
  };

  // Fonction pour obtenir le numéro d'écriture
  const getNumeroByType = (type: TransactionType, compteBank?: string) => {
    const year = new Date().getFullYear();
    switch(type) {
      case 'purchase': return `AC-${year}-00001`;
      case 'sale': return `VE-${year}-00001`;
      case 'payment':
        // Si c'est un règlement, vérifier si c'est caisse ou banque
        if (compteBank === '531000') {
          return `CA-${year}-00001`;
        }
        return `BQ-${year}-00001`;
      case 'transfer': return `TR-${year}-00001`;
      case 'other': return `OD-${year}-00001`;
      default: return `OD-${year}-00001`;
    }
  };

  // État pour les détails
  const [details, setDetails] = useState({
    dateEcriture: new Date().toISOString().split('T')[0],
    numeroEcriture: getNumeroByType('purchase'),
    journal: getJournalByType('purchase'),
    reference: '',
    description: '',
    preparePar: 'Jean Dupont (Comptable)',
    approuvePar: ''
  });

  // État pour la ventilation
  const [lignesEcriture, setLignesEcriture] = useState<LigneEcriture[]>([
    { compte: '607000', libelle: 'Achats marchand', debit: 100000, credit: 0, codeAnalytique: 'CC001 - Commercial' },
    { compte: '445200', libelle: 'TVA déductible', debit: 19250, credit: 0, codeAnalytique: '' },
    { compte: '401001', libelle: 'Fournisseur ACME', debit: 0, credit: 119250, codeAnalytique: '' }
  ]);

  // État pour les factures (ventilation)
  const [factureInfo, setFactureInfo] = useState({
    fournisseur: '',
    dateFacture: '',
    numeroFacture: 'FA-2025-001'
  });

  // État pour les ventes
  const [venteInfo, setVenteInfo] = useState({
    client: '',
    dateFacture: '',
    numeroFacture: 'FV-2025-001'
  });

  // État pour les règlements
  const [reglementInfo, setReglementInfo] = useState({
    typeReglement: 'encaissement', // 'encaissement' ou 'decaissement'
    tiers: '',
    modeReglement: 'virement',
    reference: '',
    dateEcheance: '',
    montant: 119250,
    compteBank: '512100',
    document: ''
  });

  // État pour les virements
  const [virementInfo, setVirementInfo] = useState({
    compteDebit: '',
    compteCredit: '',
    motif: ''
  });

  // État pour le sous-journal des opérations diverses
  const [sousJournalOD, setSousJournalOD] = useState('');

  // État pour les attachements
  const [attachements, setAttachements] = useState<any[]>([
    {
      nom: 'facture_FA2025001.pdf',
      type: 'Facture',
      taille: '2.3 MB',
      reference: 'FA-2025-001',
      ligneAssociee: '',
      commentaire: 'Facture originale'
    }
  ]);

  // État pour les notes
  const [notes, setNotes] = useState({
    notesObligatoires: '',
    commentairesGeneraux: ''
  });

  // Calcul des totaux
  const totalDebit = lignesEcriture.reduce((sum, ligne) => sum + ligne.debit, 0);
  const totalCredit = lignesEcriture.reduce((sum, ligne) => sum + ligne.credit, 0);

  useEffect(() => {
    setIsEquilibree(totalDebit === totalCredit && totalDebit > 0);

    // Validation TVA automatique
    if (lignesEcriture.length > 0) {
      const lignesTVA: TVALigneEcriture[] = lignesEcriture.map(ligne => ({
        compte: ligne.compte,
        libelle: ligne.libelle,
        debit: ligne.debit,
        credit: ligne.credit
      }));

      const validation = TVAValidator.validateEcritureTVA(lignesTVA);
      setTvaValidation(validation);
    }
  }, [totalDebit, totalCredit, lignesEcriture]);

  // Mettre à jour le journal et le numéro quand le type change
  useEffect(() => {
    setDetails(prev => ({
      ...prev,
      journal: getJournalByType(transactionType, reglementInfo.compteBank),
      numeroEcriture: getNumeroByType(transactionType, reglementInfo.compteBank)
    }));
  }, [transactionType]);

  // Mettre à jour le journal quand le compte banque/caisse change pour un règlement
  useEffect(() => {
    if (transactionType === 'payment') {
      setDetails(prev => ({
        ...prev,
        journal: getJournalByType(transactionType, reglementInfo.compteBank),
        numeroEcriture: getNumeroByType(transactionType, reglementInfo.compteBank)
      }));
    }
  }, [reglementInfo.compteBank, transactionType]);

  // Fermer les dropdowns quand on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        setShowCompteDropdown(null);
        setShowAnalytiqueDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const transactionTypes = [
    { value: 'purchase', label: "Facture d'Achat (Fournisseur)", icon: ShoppingCart },
    { value: 'sale', label: "Facture de Vente (Client)", icon: CreditCard },
    { value: 'payment', label: "Règlement", icon: ArrowRightLeft },
    { value: 'transfer', label: "Virement Interne", icon: ArrowRightLeft },
    { value: 'other', label: "Opération Diverse", icon: Settings }
  ];

  const tabs = [
    { id: 'details', label: t('common.details'), sublabel: 'Infos générales', icon: FileText },
    { id: 'ventilation', label: 'Ventilation', sublabel: 'Comptes & Lignes', icon: FileText },
    { id: 'attachements', label: 'Attachements', sublabel: 'Fichiers joints', icon: Paperclip },
    { id: 'notes', label: 'Notes', sublabel: 'Commentaires', icon: MessageSquare },
    { id: 'validation', label: 'Validation', sublabel: 'Contrôles', icon: CheckCircle }
  ];

  const ajouterLigne = () => {
    setLignesEcriture([
      ...lignesEcriture,
      { compte: '', libelle: '', debit: 0, credit: 0 }
    ]);
  };

  const supprimerLigne = (index: number) => {
    setLignesEcriture(lignesEcriture.filter((_, i) => i !== index));
  };

  const modifierLigne = (index: number, field: keyof LigneEcriture, value: any) => {
    const newLignes = [...lignesEcriture];
    newLignes[index] = { ...newLignes[index], [field]: value };
    setLignesEcriture(newLignes);
  };

  const openNoteModal = (index: number) => {
    setCurrentNoteIndex(index);
    setTempNote(lignesEcriture[index].noteLigne || '');
    setShowNoteModal(true);
  };

  const saveNote = () => {
    if (currentNoteIndex !== null) {
      modifierLigne(currentNoteIndex, 'noteLigne', tempNote);
    }
    setShowNoteModal(false);
    setCurrentNoteIndex(null);
    setTempNote('');
  };

  const cancelNote = () => {
    setShowNoteModal(false);
    setCurrentNoteIndex(null);
    setTempNote('');
  };

  // Sélectionner un compte et mettre à jour le libellé automatiquement
  const selectCompte = (index: number, compte: typeof planComptable[0]) => {
    modifierLigne(index, 'compte', compte.code);
    modifierLigne(index, 'libelle', compte.libelle);
    setShowCompteDropdown(null);
    setSearchCompte({ ...searchCompte, [index]: '' });
  };

  // Filtrer les comptes selon la recherche
  const getFilteredComptes = (index: number) => {
    const search = searchCompte[index]?.toLowerCase().trim() || '';
    if (!search) return planComptable;

    // Séparer les mots-clés de recherche
    const searchWords = search.split(' ').filter(word => word.length > 0);

    return planComptable.filter(c => {
      const code = c.code.toLowerCase();
      const libelle = c.libelle.toLowerCase();

      // Vérifier si le code commence par la recherche (pour recherche par numéro)
      if (code.startsWith(search)) return true;

      // Vérifier si le libellé commence par la recherche
      if (libelle.startsWith(search)) return true;

      // Vérifier si tous les mots-clés sont présents dans le code ou libellé
      return searchWords.every(word =>
        code.includes(word) || libelle.includes(word)
      );
    });
  };

  // Filtrer les codes analytiques selon la recherche
  const getFilteredAnalytiques = (index: number) => {
    const search = searchAnalytique[index]?.toLowerCase().trim() || '';
    if (!search) return codesAnalytiques;

    // Séparer les mots-clés de recherche
    const searchWords = search.split(' ').filter(word => word.length > 0);

    return codesAnalytiques.filter(c => {
      const code = c.code.toLowerCase();
      const libelle = c.libelle.toLowerCase();

      // Vérifier si le code commence par la recherche
      if (code.startsWith(search)) return true;

      // Vérifier si le libellé commence par la recherche
      if (libelle.startsWith(search)) return true;

      // Vérifier si tous les mots-clés sont présents dans le code ou libellé
      return searchWords.every(word =>
        code.includes(word) || libelle.includes(word)
      );
    });
  };

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(montant);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({
        nom: file.name,
        type: 'Document',
        taille: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        reference: '',
        ligneAssociee: '',
        commentaire: ''
      }));
      setAttachements([...attachements, ...newFiles]);
    }
  };

  if (!isOpen) return null;

  return (
    <>
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-lg shadow-2xl w-[95%] max-w-[1400px] h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-800">Nouvelle écriture</h2>
            </div>
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 bg-green-50 text-green-700 text-sm font-medium rounded-full flex items-center space-x-1">
                <Check className="w-4 h-4" />
                <span>SYSCOHADA Conforme</span>
              </span>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Fermer">
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>

          {/* Type de Transaction et Numéro d'écriture */}
          <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <label className="text-sm font-medium text-gray-700">Type de Transaction *</label>
                <div className="max-w-md">
                  <SearchableDropdown
                    options={transactionTypes.map(type => ({
                      value: type.value,
                      label: type.label
                    }))}
                    value={transactionType}
                    onChange={(value) => setTransactionType(value as TransactionType)}
                    placeholder="Sélectionner un type"
                    showSearch={false}
                  />
                </div>
              </div>

              {/* Numéro d'écriture à droite */}
              <div className="flex items-center space-x-3">
                <Hash className="w-5 h-5 text-gray-600" />
                <span className="text-base font-medium text-gray-700">N° Écriture:</span>
                <span className="px-4 py-2 bg-white border-2 border-blue-300 rounded-lg text-lg font-mono font-bold text-blue-900 shadow-sm">
                  {details.numeroEcriture || 'EC-2025-00001'}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 bg-white">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      py-3 px-1 border-b-2 transition-colors flex items-center space-x-2
                      ${activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-700 hover:text-gray-700'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium">{tab.label}</span>
                      <span className="text-xs text-gray-700">{tab.sublabel}</span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {/* Tab Détails */}
            {activeTab === 'details' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Informations Générales</h3>

                  <div className={`grid ${transactionType === 'other' ? 'grid-cols-4' : 'grid-cols-3'} gap-4`}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date d'écriture *</label>
                      <div className="relative">
                        <input
                          type="date"
                          value={details.dateEcriture}
                          onChange={(e) => setDetails({...details, dateEcriture: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-700 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('accounting.journal')}</label>
                      <input
                        type="text"
                        value={details.journal}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg font-medium ${
                          transactionType === 'purchase' ? 'bg-orange-50 text-orange-700' :
                          transactionType === 'sale' ? 'bg-green-50 text-green-700' :
                          transactionType === 'payment' ?
                            (reglementInfo.compteBank === '531000' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700') :
                          transactionType === 'transfer' ? 'bg-purple-50 text-purple-700' :
                          'bg-gray-50 text-gray-700'
                        }`}
                        readOnly
                      />
                    </div>

                    {/* Sous-journal pour Opérations Diverses */}
                    {transactionType === 'other' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sous-journal OD *</label>
                        <SearchableDropdown
                          options={[
                            { value: 'OD-PAIE', label: 'OD-PAIE - Écritures de paie' },
                            { value: 'OD-AMORT', label: 'OD-AMORT - Dotations aux amortissements' },
                            { value: 'OD-PROV', label: 'OD-PROV - Provisions' },
                            { value: 'OD-REGUL', label: 'OD-REGUL - Régularisations' },
                            { value: 'OD-CLOT', label: 'OD-CLOT - Écritures de clôture' },
                            { value: 'OD-OUVERT', label: 'OD-OUVERT - Écritures d\'ouverture' },
                            { value: 'OD-TVA', label: 'OD-TVA - Déclarations TVA' },
                            { value: 'OD-STOCK', label: 'OD-STOCK - Variation de stocks' },
                            { value: 'OD-AUTRES', label: 'OD-AUTRES - Autres opérations' }
                          ]}
                          value={sousJournalOD}
                          onChange={(value) => setSousJournalOD(value)}
                          placeholder="Sélectionner un sous-journal"
                          searchPlaceholder="Rechercher un sous-journal..."
                          clearable
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Référence externe</label>
                      <input
                        type="text"
                        value={details.reference}
                        onChange={(e) => setDetails({...details, reference: e.target.value})}
                        placeholder="N° facture, chèque..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                    <textarea
                      value={details.description}
                      onChange={(e) => setDetails({...details, description: e.target.value})}
                      placeholder="Description de l'opération..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Préparé par</label>
                      <input
                        type="text"
                        value={details.preparePar}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        readOnly
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Approuvé par</label>
                      <SearchableDropdown
                        options={[
                          { value: 'manager', label: 'Marie Martin (Manager)' },
                          { value: 'directeur', label: 'Pierre Durand (Directeur)' }
                        ]}
                        value={details.approuvePar}
                        onChange={(value) => setDetails({...details, approuvePar: value})}
                        placeholder="-- Sélectionner --"
                        searchPlaceholder="Rechercher un utilisateur..."
                        clearable
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Ventilation */}
            {activeTab === 'ventilation' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span>Ventilation des Comptes</span>
                  </h3>
                </div>

                {/* Section Facture d'Achat */}
                {transactionType === 'purchase' && (
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                      <ShoppingCart className="w-4 h-4" />
                      <span>Facture d'Achat</span>
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur *</label>
                        <SearchableDropdown
                          options={[
                            { value: 'acme', label: 'ACME SARL' },
                            { value: 'tech', label: 'Tech Solutions' }
                          ]}
                          value={factureInfo.fournisseur}
                          onChange={(value) => setFactureInfo({...factureInfo, fournisseur: value})}
                          placeholder="-- Sélectionner fournisseur --"
                          searchPlaceholder="Rechercher un fournisseur..."
                          clearable
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date facture *</label>
                        <input
                          type="date"
                          value={factureInfo.dateFacture}
                          onChange={(e) => setFactureInfo({...factureInfo, dateFacture: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">N° facture fournisseur *</label>
                        <input
                          type="text"
                          value={factureInfo.numeroFacture}
                          onChange={(e) => setFactureInfo({...factureInfo, numeroFacture: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Section Facture de Vente */}
                {transactionType === 'sale' && (
                  <div className="bg-green-50 p-4 rounded-lg mb-4">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                      <CreditCard className="w-4 h-4" />
                      <span>Facture de Vente</span>
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                        <SearchableDropdown
                          options={[
                            { value: 'client1', label: 'Société ABC' },
                            { value: 'client2', label: 'Entreprise XYZ' }
                          ]}
                          value={venteInfo.client}
                          onChange={(value) => setVenteInfo({...venteInfo, client: value})}
                          placeholder="-- Sélectionner client --"
                          searchPlaceholder="Rechercher un client..."
                          clearable
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date facture *</label>
                        <input
                          type="date"
                          value={venteInfo.dateFacture}
                          onChange={(e) => setVenteInfo({...venteInfo, dateFacture: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">N° facture client *</label>
                        <input
                          type="text"
                          value={venteInfo.numeroFacture}
                          onChange={(e) => setVenteInfo({...venteInfo, numeroFacture: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Section Règlement */}
                {transactionType === 'payment' && (
                  <div className="space-y-4">
                    {/* Section Type de règlement */}
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                        <CreditCard className="w-4 h-4" />
                        <span>Règlement (Banque/Caisse)</span>
                      </h4>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Type de règlement *</label>
                        <div className="flex space-x-6">
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="typeReglement"
                              value="encaissement"
                              checked={reglementInfo.typeReglement === 'encaissement'}
                              onChange={(e) => setReglementInfo({...reglementInfo, typeReglement: e.target.value})}
                              className="text-blue-600"
                            />
                            <span className="flex items-center space-x-1">
                              <span>💰</span>
                              <span>Réception (Encaissement)</span>
                            </span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="typeReglement"
                              value="decaissement"
                              checked={reglementInfo.typeReglement === 'decaissement'}
                              onChange={(e) => setReglementInfo({...reglementInfo, typeReglement: e.target.value})}
                              className="text-blue-600"
                            />
                            <span className="flex items-center space-x-1">
                              <span>💸</span>
                              <span>Paiement (Décaissement)</span>
                            </span>
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Mode *</label>
                          <SearchableDropdown
                            options={[
                              { value: 'virement', label: 'Virement' },
                              { value: 'cheque', label: 'Chèque' },
                              { value: 'especes', label: 'Espèces' },
                              { value: 'carte', label: 'Carte bancaire' },
                              { value: 'prelevement', label: 'Prélèvement' }
                            ]}
                            value={reglementInfo.modeReglement}
                            onChange={(value) => setReglementInfo({...reglementInfo, modeReglement: value})}
                            placeholder="Sélectionner un mode"
                            showSearch={false}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Banque/Compte *</label>
                          <SearchableDropdown
                            options={[
                              { value: '512100', label: '512100 - BNP Paribas' },
                              { value: '512200', label: '512200 - Société Générale' },
                              { value: '531000', label: '531000 - Caisse' }
                            ]}
                            value={reglementInfo.compteBank}
                            onChange={(value) => setReglementInfo({...reglementInfo, compteBank: value})}
                            placeholder="Sélectionner un compte"
                            searchPlaceholder="Rechercher un compte..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Montant *</label>
                          <input
                            type="number"
                            value={reglementInfo.montant}
                            onChange={(e) => setReglementInfo({...reglementInfo, montant: parseFloat(e.target.value) || 0})}
                            placeholder="119250"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Référence</label>
                          <input
                            type="text"
                            value={reglementInfo.reference}
                            onChange={(e) => setReglementInfo({...reglementInfo, reference: e.target.value})}
                            placeholder="VIR-20250115-001"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section Tiers créditeur */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                        <User className="w-4 h-4 text-purple-600" />
                        <span>Tiers {reglementInfo.typeReglement === 'encaissement' ? 'débiteur' : 'créditeur'}</span>
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tiers {reglementInfo.typeReglement === 'encaissement' ? 'débiteur' : 'créditeur'} *
                          </label>
                          <SearchableDropdown
                            options={
                              reglementInfo.typeReglement === 'encaissement' ? [
                                { value: 'client1', label: 'Client A' },
                                { value: 'client2', label: 'Client B' }
                              ] : [
                                { value: 'fournisseur1', label: 'Fournisseur ACME' },
                                { value: 'fournisseur2', label: 'Fournisseur XYZ' }
                              ]
                            }
                            value={reglementInfo.tiers}
                            onChange={(value) => setReglementInfo({...reglementInfo, tiers: value})}
                            placeholder="-- Sélectionner --"
                            searchPlaceholder={`Rechercher un ${reglementInfo.typeReglement === 'encaissement' ? 'client' : 'fournisseur'}...`}
                            clearable
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Document à {reglementInfo.typeReglement === 'encaissement' ? 'encaisser' : 'décaisser'} *
                          </label>
                          <SearchableDropdown
                            options={
                              reglementInfo.typeReglement === 'encaissement' ? [
                                { value: 'VE-2025-00234', label: 'VE-2025-00234' },
                                { value: 'VE-2025-00235', label: 'VE-2025-00235' }
                              ] : [
                                { value: 'FA-2025-001', label: 'FA-2025-001' },
                                { value: 'FA-2025-002', label: 'FA-2025-002' }
                              ]
                            }
                            value={reglementInfo.document}
                            onChange={(value) => setReglementInfo({...reglementInfo, document: value})}
                            placeholder="-- Sélectionner document --"
                            searchPlaceholder="Rechercher un document..."
                            clearable
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section Ventilation par comptes */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span>Ventilation par comptes</span>
                      </h4>
                    </div>
                  </div>
                )}

                {/* Section Virement Interne */}
                {transactionType === 'transfer' && (
                  <div className="bg-orange-50 p-4 rounded-lg mb-4">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                      <ArrowRightLeft className="w-4 h-4" />
                      <span>Virement Interne</span>
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Compte à débiter *</label>
                        <SearchableDropdown
                          options={[
                            { value: '512000', label: '512000 - Banque principale' },
                            { value: '531000', label: '531000 - Caisse' }
                          ]}
                          value={virementInfo.compteDebit}
                          onChange={(value) => setVirementInfo({...virementInfo, compteDebit: value})}
                          placeholder="-- Sélectionner compte --"
                          searchPlaceholder="Rechercher un compte..."
                          clearable
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Compte à créditer *</label>
                        <SearchableDropdown
                          options={[
                            { value: '512001', label: '512001 - Banque secondaire' },
                            { value: '531000', label: '531000 - Caisse' }
                          ]}
                          value={virementInfo.compteCredit}
                          onChange={(value) => setVirementInfo({...virementInfo, compteCredit: value})}
                          placeholder="-- Sélectionner compte --"
                          searchPlaceholder="Rechercher un compte..."
                          clearable
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Motif *</label>
                        <input
                          type="text"
                          value={virementInfo.motif}
                          onChange={(e) => setVirementInfo({...virementInfo, motif: e.target.value})}
                          placeholder="Motif du virement..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Section Opération Diverse */}
                {transactionType === 'other' && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                      <Settings className="w-4 h-4" />
                      <span>Opération Diverse</span>
                    </h4>
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        Saisie libre pour les opérations diverses. Veillez à respecter l'équilibre débit/crédit.
                      </p>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-y border-gray-200">
                        <th className="text-left px-3 py-2 text-sm font-medium text-gray-700">{t('accounting.account')}</th>
                        <th className="text-left px-3 py-2 text-sm font-medium text-gray-700">{t('accounting.label')}</th>
                        <th className="text-right px-3 py-2 text-sm font-medium text-gray-700">{t('accounting.debit')}</th>
                        <th className="text-right px-3 py-2 text-sm font-medium text-gray-700">{t('accounting.credit')}</th>
                        <th className="text-left px-3 py-2 text-sm font-medium text-gray-700">Code Analytique</th>
                        <th className="text-center px-3 py-2 text-sm font-medium text-gray-700">Note</th>
                        <th className="text-center px-3 py-2 text-sm font-medium text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lignesEcriture.map((ligne, index) => (
                        <tr key={index} className="border-b border-gray-200">
                          <td className="px-3 py-2 relative">
                            <div className="relative">
                              <input
                                type="text"
                                value={ligne.compte}
                                onChange={(e) => {
                                  modifierLigne(index, 'compte', e.target.value);
                                  setSearchCompte({ ...searchCompte, [index]: e.target.value });
                                  setShowCompteDropdown(index);
                                }}
                                onFocus={() => setShowCompteDropdown(index)}
                                placeholder="Rechercher..."
                                className="w-full px-2 py-1 pr-8 border border-gray-300 rounded"
                              />
                              <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-700" />
                            </div>
                            {showCompteDropdown === index && (
                              <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-300 rounded-lg shadow-lg">
                                {getFilteredComptes(index).map((compte) => (
                                  <button
                                    key={compte.code}
                                    onClick={() => selectCompte(index, compte)}
                                    className="w-full px-3 py-2 text-left hover:bg-blue-50 flex justify-between items-center"
                                  >
                                    <span className="font-mono text-sm">{compte.code}</span>
                                    <span className="text-sm text-gray-600 truncate ml-2">{compte.libelle}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={ligne.libelle}
                              onChange={(e) => modifierLigne(index, 'libelle', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-50"
                              placeholder="Auto-rempli"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={ligne.debit}
                              onChange={(e) => modifierLigne(index, 'debit', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-right"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={ligne.credit}
                              onChange={(e) => modifierLigne(index, 'credit', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-right"
                            />
                          </td>
                          <td className="px-3 py-2 relative">
                            <div className="relative">
                              <input
                                type="text"
                                value={ligne.codeAnalytique || ''}
                                onChange={(e) => {
                                  modifierLigne(index, 'codeAnalytique', e.target.value);
                                  setSearchAnalytique({ ...searchAnalytique, [index]: e.target.value });
                                  setShowAnalytiqueDropdown(index);
                                }}
                                onFocus={() => setShowAnalytiqueDropdown(index)}
                                placeholder="Optionnel..."
                                className="w-full px-2 py-1 pr-8 border border-gray-300 rounded"
                              />
                              <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-700" />
                            </div>
                            {showAnalytiqueDropdown === index && (
                              <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-300 rounded-lg shadow-lg">
                                <button
                                  onClick={() => {
                                    modifierLigne(index, 'codeAnalytique', '');
                                    setShowAnalytiqueDropdown(null);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-gray-50 text-gray-700 italic"
                                >
                                  -- Aucun --
                                </button>
                                {getFilteredAnalytiques(index).map((code) => (
                                  <button
                                    key={code.code}
                                    onClick={() => {
                                      modifierLigne(index, 'codeAnalytique', code.libelle);
                                      setShowAnalytiqueDropdown(null);
                                      setSearchAnalytique({ ...searchAnalytique, [index]: '' });
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-blue-50"
                                  >
                                    <span className="text-sm">{code.libelle}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => openNoteModal(index)}
                              className={`px-2 py-1 rounded transition-colors ${
                                ligne.noteLigne
                                  ? 'bg-green-100 hover:bg-green-200 text-green-700 border border-green-300'
                                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-300'
                              }`}
                              title={ligne.noteLigne ? 'Note existante' : 'Ajouter une note'}
                            >
                              <MessageSquare className="w-4 h-4 inline" />
                              {ligne.noteLigne && (
                                <span className="ml-1 text-xs">✓</span>
                              )}
                            </button>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => supprimerLigne(index)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={ajouterLigne}
                  className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" aria-label="Ajouter">
                  <Plus className="w-4 h-4" />
                  <span>
                    {transactionType === 'purchase' && "Ajouter ligne d'achat"}
                    {transactionType === 'sale' && "Ajouter ligne de vente"}
                    {transactionType === 'payment' && "Ajouter ligne de règlement"}
                    {transactionType === 'transfer' && "Ajouter ligne de virement"}
                    {transactionType === 'other' && "Ajouter ligne d'écriture"}
                  </span>
                </button>

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-8">
                    <div>
                      <span className="text-sm text-gray-600">Total Débit</span>
                      <p className="text-xl font-bold text-blue-600">{formatMontant(totalDebit)} XAF</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Total Crédit</span>
                      <p className="text-xl font-bold text-blue-600">{formatMontant(totalCredit)} XAF</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Équilibre</span>
                    {isEquilibree ? (
                      <div className="flex items-center space-x-1 text-green-600">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-semibold">Équilibré ✓</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1 text-red-600">
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-semibold">Non équilibré</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab Attachements */}
            {activeTab === 'attachements' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                  <Paperclip className="w-5 h-5 text-gray-600" />
                  <span>Attachements de Fichiers</span>
                </h3>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <File className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Glissez-déposez vos fichiers ici</p>
                  <p className="text-sm text-gray-700 mb-4">ou cliquez pour sélectionner</p>
                  <label className="inline-flex items-center space-x-2 px-4 py-2 bg-[#6A8A82] text-white rounded-lg cursor-pointer hover:bg-[#5A7A72] transition-colors">
                    <Plus className="w-4 h-4" />
                    <span>Sélectionner fichiers</span>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                    />
                  </label>
                  <p className="text-xs text-gray-700 mt-2">PDF, Images, Excel, Word - Max 10 MB par fichier</p>
                </div>

                {attachements.length > 0 && (
                  <div>
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-y border-gray-200">
                          <th className="text-left px-3 py-2 text-sm font-medium text-gray-700">Fichier</th>
                          <th className="text-left px-3 py-2 text-sm font-medium text-gray-700">Type</th>
                          <th className="text-left px-3 py-2 text-sm font-medium text-gray-700">Taille</th>
                          <th className="text-left px-3 py-2 text-sm font-medium text-gray-700">Référence doc</th>
                          <th className="text-left px-3 py-2 text-sm font-medium text-gray-700">Ligne associée</th>
                          <th className="text-left px-3 py-2 text-sm font-medium text-gray-700">Commentaire</th>
                          <th className="text-center px-3 py-2 text-sm font-medium text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attachements.map((fichier, index) => (
                          <tr key={index} className="border-b border-gray-200">
                            <td className="px-3 py-2 flex items-center space-x-2">
                              <File className="w-4 h-4 text-red-500" />
                              <span className="text-sm">{fichier.nom}</span>
                            </td>
                            <td className="px-3 py-2">
                              <SearchableDropdown
                                options={[
                                  { value: 'facture', label: 'Facture' },
                                  { value: 'bon_commande', label: 'Bon de commande' },
                                  { value: 'bon_livraison', label: 'Bon de livraison' },
                                  { value: 'autre', label: 'Autre' }
                                ]}
                                value={fichier.type}
                                onChange={(value) => {
                                  const newAttachements = [...attachements];
                                  newAttachements[index].type = value;
                                  setAttachements(newAttachements);
                                }}
                                placeholder="Type de fichier"
                                showSearch={false}
                                size="sm"
                              />
                            </td>
                            <td className="px-3 py-2 text-sm">{fichier.taille}</td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={fichier.reference}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                placeholder="FA-2025-001"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <SearchableDropdown
                                options={[
                                  { value: '', label: '-- Ligne --' },
                                  ...lignesEcriture.map((ligne, idx) => ({
                                    value: `ligne_${idx}`,
                                    label: `Ligne ${idx + 1} - ${ligne.libelle || ligne.compte}`
                                  }))
                                ]}
                                value={fichier.ligneAssociee}
                                onChange={(value) => {
                                  const newAttachements = [...attachements];
                                  newAttachements[index].ligneAssociee = value;
                                  setAttachements(newAttachements);
                                }}
                                placeholder="-- Ligne --"
                                searchPlaceholder="Rechercher une ligne..."
                                clearable
                                size="sm"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={fichier.commentaire}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                placeholder="Facture originale"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-center space-x-1">
                                <button className="p-1 text-gray-600 hover:bg-gray-100 rounded" aria-label="Voir les détails">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button className="p-1 text-red-600 hover:bg-red-50 rounded" aria-label="Supprimer">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="flex items-center justify-between mt-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <span className="text-sm text-gray-600">Fichiers attachés</span>
                        <p className="text-lg font-semibold">{attachements.length}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Taille totale</span>
                        <p className="text-lg font-semibold text-orange-600">2.3 MB</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Statut</span>
                        <div className="flex items-center space-x-1 mt-1">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-semibold text-green-600">Conforme</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab Notes */}
            {activeTab === 'notes' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5 text-gray-600" />
                  <span>Notes et Commentaires</span>
                </h3>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">
                      Notes spécifiques - {
                        transactionType === 'purchase' ? "Facture d'Achat" :
                        transactionType === 'sale' ? "Facture de Vente" :
                        transactionType === 'payment' ? "Règlement" :
                        transactionType === 'transfer' ? "Virement Interne" :
                        "Opération Diverse"
                      }
                    </h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <FileText className="w-4 h-4 inline mr-1" />
                        Notes obligatoires sur l'opération *
                      </label>
                      <textarea
                        value={notes.notesObligatoires}
                        onChange={(e) => setNotes({...notes, notesObligatoires: e.target.value})}
                        placeholder={
                          transactionType === 'purchase' ? "Notes obligatoires sur la facture d'achat..." :
                          transactionType === 'sale' ? "Notes obligatoires sur la facture de vente..." :
                          transactionType === 'payment' ? "Notes obligatoires sur le règlement..." :
                          transactionType === 'transfer' ? "Notes obligatoires sur le virement..." :
                          "Notes obligatoires sur l'opération..."
                        }
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Commentaires généraux</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <MessageSquare className="w-4 h-4 inline mr-1" />
                        Commentaires libres
                      </label>
                      <textarea
                        value={notes.commentairesGeneraux}
                        onChange={(e) => setNotes({...notes, commentairesGeneraux: e.target.value})}
                        placeholder="Commentaires, observations, contexte particulier..."
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Validation */}
            {activeTab === 'validation' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Validation et Contrôles</span>
                </h3>

                {/* Validation TVA */}
                {tvaValidation && (
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-blue-600" />
                      <span>Validation TVA</span>
                    </h4>

                    {tvaValidation.errors.length > 0 && (
                      <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="font-semibold text-red-700 mb-2">❌ Erreurs:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {tvaValidation.errors.map((error, i) => (
                            <li key={i} className="text-sm text-red-600">{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {tvaValidation.warnings.length > 0 && (
                      <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="font-semibold text-yellow-700 mb-2">⚠️ Avertissements:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {tvaValidation.warnings.map((warning, i) => (
                            <li key={i} className="text-sm text-yellow-600">{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {tvaValidation.isValid && tvaValidation.errors.length === 0 && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-green-700 font-medium">✅ Validation TVA: Conforme</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="flex items-center justify-around mb-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">Total Débit</p>
                      <p className="text-2xl font-bold text-blue-600">{formatMontant(totalDebit)} XAF</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">Total Crédit</p>
                      <p className="text-2xl font-bold text-blue-600">{formatMontant(totalCredit)} XAF</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">Équilibre</p>
                      {isEquilibree ? (
                        <div className="flex items-center justify-center space-x-2 text-green-600">
                          <CheckCircle className="w-6 h-6" />
                          <span className="text-2xl font-bold">Équilibré ✓</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-2 text-red-600">
                          <AlertCircle className="w-6 h-6" />
                          <span className="text-2xl font-bold">Non équilibré</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>Journal des écritures comptables</span>
                    </h4>
                    <div className="space-y-2">
                      {lignesEcriture.map((ligne, index) => (
                        <div key={index} className="flex items-center justify-between py-2 px-3 bg-white rounded-lg">
                          <div className="flex items-center space-x-4">
                            <span className={`px-2 py-1 text-xs font-semibold rounded ${ligne.debit > 0 ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                              {ligne.debit > 0 ? 'DT' : 'CT'}
                            </span>
                            <span className="font-mono text-sm">{ligne.compte}</span>
                            <span className="text-sm text-gray-600">{ligne.libelle}</span>
                          </div>
                          <span className="font-semibold text-right">
                            {ligne.debit > 0 ? formatMontant(ligne.debit) : formatMontant(ligne.credit)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {isEquilibree && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-green-700 font-medium">
                          • Équilibre comptable respecté {formatMontant(totalDebit)} XAF
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                Brouillon
              </button>
            </div>
            <button
              disabled={!isEquilibree || (tvaValidation && !tvaValidation.isValid)}
              className={`
                px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2
                ${isEquilibree && (!tvaValidation || tvaValidation.isValid)
                  ? 'bg-[#6A8A82] text-white hover:bg-[#5A7A72]'
                  : 'bg-gray-300 text-gray-700 cursor-not-allowed'
                }
              `}
              title={!isEquilibree ? 'Écriture non équilibrée' : (tvaValidation && !tvaValidation.isValid) ? 'Validation TVA échouée' : ''}
            >
              <CheckCircle className="w-5 h-5" />
              <span>Valider et Comptabiliser</span>
            </button>
          </div>
        </motion.div>

        {/* Modal pour les notes de ligne */}
        {showNoteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30"
            onClick={cancelNote}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-lg shadow-xl p-6 w-[500px] max-w-[90%]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <span>Note de ligne</span>
                </h3>
                <button
                  onClick={cancelNote}
                  className="p-1 hover:bg-gray-100 rounded" aria-label="Fermer">
                  <X className="w-5 h-5 text-gray-700" />
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note pour la ligne {currentNoteIndex !== null ? currentNoteIndex + 1 : ''}
                </label>
                <textarea
                  value={tempNote}
                  onChange={(e) => setTempNote(e.target.value)}
                  placeholder="Entrez votre note ici..."
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
                <p className="text-xs text-gray-700 mt-1">Cette note est optionnelle</p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelNote}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={saveNote}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Enregistrer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>

    {/* Modal de sélection de période */}
    <PeriodSelectorModal
      isOpen={showPeriodModal}
      onClose={() => setShowPeriodModal(false)}
      onApply={(range) => setDateRange(range)}
      initialDateRange={dateRange}
    />
    </>
  );
};

export default JournalEntryModal;