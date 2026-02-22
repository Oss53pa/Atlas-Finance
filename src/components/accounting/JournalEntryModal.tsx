import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatCurrency } from '@/utils/formatters';
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
  Search,
  ChevronRight
} from 'lucide-react';
import SearchableDropdown from '../ui/SearchableDropdown';
import { TVAValidator, LigneEcriture as TVALigneEcriture, TVAValidationResult } from '../../utils/tvaValidation';
import { isEntryEditable, isEntryReversible } from '../../utils/reversalService';
import { validateJournalEntry, getNextPieceNumber } from '../../validators/journalEntryValidator';

import { safeAddEntry } from '../../services/entryGuard';
import { validerEcriture, comptabiliserEcriture, retourBrouillon, allowedTransitions, transitionLabel } from '../../services/entryWorkflow';
import type { EntryStatus } from '../../services/entryWorkflow';
import TemplateSelector from '../comptabilite/TemplateSelector';

interface JournalEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Record<string, unknown>;
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
  // Lock guard: validated/posted entries are read-only (SYSCOHADA intangibility)
  const entryStatus = String(initialData?.status || 'draft');
  const isLocked = !isEntryEditable(entryStatus);
  const canReverse = isEntryReversible({ status: entryStatus, reversed: initialData?.reversed === true });

  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showReversalDialog, setShowReversalDialog] = useState(false);
  const [reversalReason, setReversalReason] = useState('');
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

  // État pour le système de wizard
  const [tabValidation, setTabValidation] = useState<{[key: string]: boolean}>({
    details: false,
    ventilation: false,
    attachements: true, // Optionnel, donc valide par défaut
    notes: true, // Optionnel, donc valide par défaut
    validation: false
  });
  const prevTabValidation = useRef<{[key: string]: boolean}>({});

  // État pour les erreurs de validation
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

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
  const [attachements, setAttachements] = useState<Array<{ nom: string; type: string; taille: string; reference: string; ligneAssociee: string; commentaire: string }>>([
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
    setIsEquilibree(Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0);

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

  // Handler pour appliquer un template d'ecriture
  const handleApplyTemplate = useCallback((result: {
    lines: Array<{ accountCode: string; accountName: string; label: string; debit: number; credit: number }>;
    journal: string;
    label: string;
  }) => {
    const journalMap: Record<string, TransactionType> = {
      AC: 'purchase', VE: 'sale', BQ: 'payment', CA: 'payment', OD: 'other',
    };
    setTransactionType(journalMap[result.journal] || 'other');
    setDetails(prev => ({
      ...prev,
      description: result.label,
      journal: `${result.journal} - ${result.label}`,
    }));
    setLignesEcriture(
      result.lines.map(l => ({
        compte: l.accountCode,
        libelle: l.accountName,
        debit: l.debit,
        credit: l.credit,
      }))
    );
  }, []);

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

  // Fonction pour réinitialiser le formulaire
  const resetForm = useCallback(() => {
    setActiveTab('details');
    setTransactionType('purchase');
    setDetails({
      dateEcriture: new Date().toISOString().split('T')[0],
      numeroEcriture: getNumeroByType('purchase'),
      journal: getJournalByType('purchase'),
      reference: '',
      description: '',
      preparePar: 'Jean Dupont (Comptable)',
      approuvePar: ''
    });
    setLignesEcriture([
      { compte: '', libelle: '', debit: 0, credit: 0, codeAnalytique: '' }
    ]);
    setFactureInfo({
      fournisseur: '',
      dateFacture: '',
      numeroFacture: 'FA-2025-001'
    });
    setVenteInfo({
      client: '',
      dateFacture: '',
      numeroFacture: 'FV-2025-001'
    });
    setReglementInfo({
      typeReglement: 'encaissement',
      tiers: '',
      modeReglement: 'virement',
      reference: '',
      dateEcheance: '',
      montant: 0,
      compteBank: '512100',
      document: ''
    });
    setVirementInfo({
      compteDebit: '',
      compteCredit: '',
      motif: ''
    });
    setSousJournalOD('');
    setAttachements([]);
    setNotes({
      notesObligatoires: '',
      commentairesGeneraux: ''
    });
    setValidationErrors([]);
    setSearchCompte({});
    setSearchAnalytique({});
  }, []);

  // Fonction pour fermer et réinitialiser
  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  // Fonction pour calculer les erreurs de validation
  const getValidationErrors = useCallback((): string[] => {
    const errors: string[] = [];

    // Vérifications onglet Détails
    if (!details.dateEcriture) {
      errors.push("Date d'écriture manquante");
    }
    if (!details.description.trim()) {
      errors.push("Description de l'opération manquante");
    }
    if (transactionType === 'other' && !sousJournalOD) {
      errors.push("Sous-journal OD non sélectionné");
    }

    // Vérifications onglet Ventilation
    if (Math.abs(totalDebit - totalCredit) >= 0.01 || totalDebit === 0) {
      errors.push(`Écriture non équilibrée (Débit: ${formatCurrency(totalDebit)} ≠ Crédit: ${formatCurrency(totalCredit)})`);
    }

    const emptyAccounts = lignesEcriture.filter(l => !l.compte);
    if (emptyAccounts.length > 0) {
      errors.push(`${emptyAccounts.length} ligne(s) sans compte comptable`);
    }

    // Vérifications spécifiques par type
    if (transactionType === 'purchase') {
      if (!factureInfo.fournisseur) errors.push("Fournisseur non sélectionné");
      if (!factureInfo.dateFacture) errors.push("Date de facture fournisseur manquante");
      if (!factureInfo.numeroFacture) errors.push("Numéro de facture fournisseur manquant");
    }
    if (transactionType === 'sale') {
      if (!venteInfo.client) errors.push("Client non sélectionné");
      if (!venteInfo.dateFacture) errors.push("Date de facture client manquante");
      if (!venteInfo.numeroFacture) errors.push("Numéro de facture client manquant");
    }
    if (transactionType === 'payment') {
      if (!reglementInfo.tiers) errors.push("Tiers non sélectionné");
      if (!reglementInfo.modeReglement) errors.push("Mode de règlement non sélectionné");
      if (reglementInfo.montant <= 0) errors.push("Montant du règlement invalide");
    }
    if (transactionType === 'transfer') {
      if (!virementInfo.compteDebit) errors.push("Compte à débiter non sélectionné");
      if (!virementInfo.compteCredit) errors.push("Compte à créditer non sélectionné");
      if (!virementInfo.motif) errors.push("Motif du virement manquant");
    }

    // Vérification TVA
    if (tvaValidation && !tvaValidation.isValid) {
      errors.push("Validation TVA échouée");
    }

    return errors;
  }, [details, transactionType, sousJournalOD, totalDebit, totalCredit, lignesEcriture, factureInfo, venteInfo, reglementInfo, virementInfo, tvaValidation]);

  // Mettre à jour les erreurs de validation quand les données changent
  useEffect(() => {
    setValidationErrors(getValidationErrors());
  }, [getValidationErrors]);

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

  // Fonctions de validation par onglet
  const validateDetailsTab = useCallback(() => {
    const hasDate = !!details.dateEcriture;
    const hasDescription = !!details.description.trim();

    // Validation spécifique pour les opérations diverses
    if (transactionType === 'other') {
      return hasDate && hasDescription && !!sousJournalOD;
    }

    return hasDate && hasDescription;
  }, [details.dateEcriture, details.description, transactionType, sousJournalOD]);

  const validateVentilationTab = useCallback(() => {
    // L'écriture doit être équilibrée
    if (!isEquilibree) return false;

    // Toutes les lignes doivent avoir un compte
    const allLinesHaveAccount = lignesEcriture.every(ligne => !!ligne.compte);
    if (!allLinesHaveAccount) return false;

    // Validation spécifique par type de transaction
    if (transactionType === 'purchase') {
      return !!factureInfo.fournisseur && !!factureInfo.dateFacture && !!factureInfo.numeroFacture;
    }
    if (transactionType === 'sale') {
      return !!venteInfo.client && !!venteInfo.dateFacture && !!venteInfo.numeroFacture;
    }
    if (transactionType === 'payment') {
      return !!reglementInfo.tiers && !!reglementInfo.modeReglement && !!reglementInfo.compteBank && reglementInfo.montant > 0;
    }
    if (transactionType === 'transfer') {
      return !!virementInfo.compteDebit && !!virementInfo.compteCredit && !!virementInfo.motif;
    }

    return true;
  }, [isEquilibree, lignesEcriture, transactionType, factureInfo, venteInfo, reglementInfo, virementInfo]);

  const validateValidationTab = useCallback(() => {
    // La validation finale nécessite l'équilibre et la TVA valide
    return isEquilibree && (!tvaValidation || tvaValidation.isValid);
  }, [isEquilibree, tvaValidation]);

  // Ordre des onglets pour la navigation
  const tabOrder = ['details', 'ventilation', 'attachements', 'notes', 'validation'];

  // Fonction pour passer à l'onglet suivant
  const goToNextTab = useCallback(() => {
    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex < tabOrder.length - 1) {
      setActiveTab(tabOrder[currentIndex + 1]);
    }
  }, [activeTab]);

  // Fonction pour passer à l'onglet précédent
  const goToPrevTab = useCallback(() => {
    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabOrder[currentIndex - 1]);
    }
  }, [activeTab]);

  // Navigation libre - tous les onglets sont accessibles
  const canAccessTab = useCallback((_tabId: string) => {
    return true; // Navigation libre entre tous les onglets
  }, []);

  // Mise à jour de la validation des onglets (pour affichage visuel uniquement)
  useEffect(() => {
    const newValidation = {
      details: validateDetailsTab(),
      ventilation: validateVentilationTab(),
      attachements: true, // Toujours valide (optionnel)
      notes: true, // Toujours valide (optionnel)
      validation: validateValidationTab()
    };
    setTabValidation(newValidation);
  }, [validateDetailsTab, validateVentilationTab, validateValidationTab]);

  // --- Sauvegarder l'écriture en Dexie après validation complète ---
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveEntry = useCallback(async () => {
    if (isSaving || validationErrors.length > 0) return;

    setIsSaving(true);
    try {
      const journalCode = transactionType === 'purchase' ? 'AC'
        : transactionType === 'sale' ? 'VE'
        : transactionType === 'payment' ? (reglementInfo.compteBank === '531000' ? 'CA' : 'BQ')
        : transactionType === 'transfer' ? 'TR'
        : 'OD';

      // Validation complète via le validateur dédié (Money class, D=C, comptes, période)
      const lines = lignesEcriture.map((l, i) => ({
        id: `L${i + 1}`,
        accountCode: l.compte,
        accountName: l.libelle,
        label: l.libelle,
        debit: l.debit,
        credit: l.credit,
        analyticalCode: l.codeAnalytique || undefined,
      }));

      const result = await validateJournalEntry({
        date: details.dateEcriture,
        lines,
        journal: journalCode,
        label: details.description,
      });

      if (!result.isValid) {
        setValidationErrors(result.errors);
        setIsSaving(false);
        return;
      }

      // Générer le numéro de pièce séquentiel
      const entryNumber = await getNextPieceNumber(journalCode);

      await safeAddEntry({
        id: crypto.randomUUID(),
        entryNumber,
        journal: journalCode,
        date: details.dateEcriture,
        label: details.description,
        reference: details.reference,
        lines,
        status: 'draft' as const,
        createdAt: new Date().toISOString(),
        createdBy: details.preparePar,
      });

      resetForm();
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde :', error);
      setValidationErrors([`Erreur de sauvegarde : ${error instanceof Error ? error.message : String(error)}`]);
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, validationErrors, lignesEcriture, details, transactionType, reglementInfo.compteBank, resetForm, onClose]);

  // Gestion du clavier pour la navigation entre onglets
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ne pas intercepter si on est dans un champ de formulaire (sauf si c'est Ctrl+Tab)
      const target = e.target as HTMLElement;
      const isFormField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

      // Ctrl+Tab ou Ctrl+Shift+Tab pour naviguer entre les onglets (navigation libre)
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          goToPrevTab();
        } else {
          goToNextTab();
        }
        return;
      }

      // PageDown/PageUp pour naviguer (navigation libre)
      if (e.key === 'PageDown' && !isFormField) {
        e.preventDefault();
        goToNextTab();
      } else if (e.key === 'PageUp' && !isFormField) {
        e.preventDefault();
        goToPrevTab();
      }

      // Entrée sur le dernier onglet pour valider (si tout est valide)
      if (e.key === 'Enter' && e.ctrlKey && activeTab === 'validation') {
        e.preventDefault();
        if (validationErrors.length === 0) {
          handleSaveEntry();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, goToNextTab, goToPrevTab, validationErrors]);

  const ajouterLigne = () => {
    setLignesEcriture([
      ...lignesEcriture,
      { compte: '', libelle: '', debit: 0, credit: 0 }
    ]);
  };

  const supprimerLigne = (index: number) => {
    setLignesEcriture(lignesEcriture.filter((_, i) => i !== index));
  };

  const modifierLigne = (index: number, field: keyof LigneEcriture, value: string | number) => {
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
              <h2 className="text-lg font-semibold text-gray-800">Nouvelle écriture</h2>
            </div>
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 bg-green-50 text-green-700 text-sm font-medium rounded-full flex items-center space-x-1">
                <Check className="w-4 h-4" />
                <span>SYSCOHADA Conforme</span>
              </span>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Fermer">
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>

          {/* Status Banner + Workflow Buttons */}
          {mode === 'edit' && !!initialData?.id && (
            <div className={`border-b px-6 py-3 flex items-center justify-between ${
              entryStatus === 'posted' ? 'bg-green-50 border-green-200'
                : entryStatus === 'validated' ? 'bg-amber-50 border-amber-200'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center gap-2">
                <AlertCircle className={`h-5 w-5 ${
                  entryStatus === 'posted' ? 'text-green-600'
                    : entryStatus === 'validated' ? 'text-amber-600'
                    : 'text-blue-600'
                }`} />
                <span className="font-medium text-sm">
                  {entryStatus === 'posted'
                    ? initialData?.reversed
                      ? `Contrepassée le ${String(initialData.reversedAt ?? '').split('T')[0] || ''}`
                      : 'Comptabilisée — Immutable (SYSCOHADA Art. 19)'
                    : entryStatus === 'validated'
                    ? 'Validée — En attente de comptabilisation'
                    : 'Brouillon — Modifiable'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {allowedTransitions(entryStatus as EntryStatus).map(target => (
                  <button
                    key={target}
                    onClick={async () => {
                      const fn = target === 'validated' ? validerEcriture
                        : target === 'posted' ? comptabiliserEcriture
                        : retourBrouillon;
                      const res = await fn(String(initialData.id));
                      if (res.success) {
                        onClose();
                      } else {
                        setValidationErrors([res.error || 'Erreur']);
                      }
                    }}
                    className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      target === 'posted' ? 'bg-green-600 hover:bg-green-700 text-white'
                        : target === 'validated' ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                  >
                    {transitionLabel(target)}
                  </button>
                ))}
                {canReverse && (
                  <button
                    onClick={() => setShowReversalDialog(true)}
                    className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Contrepassation
                  </button>
                )}
              </div>
            </div>
          )}

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
                {mode === 'create' && !isLocked && (
                  <button
                    onClick={() => setShowTemplateSelector(true)}
                    className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center space-x-1"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Modele</span>
                  </button>
                )}
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

          {/* Tabs - Wizard Style */}
          <div className="border-b border-gray-200 bg-white">
            <nav className="flex items-center px-6 py-2">
              {tabs.map((tab, index) => {
                const Icon = tab.icon;
                const isValid = tabValidation[tab.id];
                const isActive = activeTab === tab.id;
                const isAccessible = canAccessTab(tab.id);
                const currentIndex = tabOrder.indexOf(activeTab);
                const tabIndex = tabOrder.indexOf(tab.id);
                const isPassed = tabIndex < currentIndex;

                return (
                  <React.Fragment key={tab.id}>
                    <button
                      onClick={() => isAccessible && setActiveTab(tab.id)}
                      disabled={!isAccessible}
                      className={`
                        relative py-3 px-4 rounded-lg transition-all flex items-center space-x-3
                        ${isActive
                          ? 'bg-blue-50 border-2 border-blue-500 text-blue-600 shadow-sm'
                          : isPassed && isValid
                            ? 'bg-green-50 border-2 border-green-400 text-green-700 hover:bg-green-100'
                            : isAccessible
                              ? 'bg-gray-50 border-2 border-transparent text-gray-600 hover:bg-gray-100 hover:border-gray-300'
                              : 'bg-gray-50 border-2 border-transparent text-gray-400 cursor-not-allowed opacity-60'
                        }
                      `}
                    >
                      {/* Indicateur de numéro/statut */}
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                        ${isActive
                          ? 'bg-blue-500 text-white'
                          : isPassed && isValid
                            ? 'bg-green-500 text-white'
                            : isAccessible
                              ? 'bg-gray-300 text-gray-600'
                              : 'bg-gray-200 text-gray-400'
                        }
                      `}>
                        {isPassed && isValid ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          index + 1
                        )}
                      </div>

                      <div className="flex flex-col items-start">
                        <span className="text-sm font-medium">{tab.label}</span>
                        <span className={`text-xs ${isActive ? 'text-blue-500' : 'text-gray-500'}`}>
                          {tab.sublabel}
                        </span>
                      </div>

                      {/* Badge de validation */}
                      {isValid && !isActive && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"
                        >
                          <Check className="w-3 h-3 text-white" />
                        </motion.div>
                      )}
                    </button>

                    {/* Connecteur entre les onglets */}
                    {index < tabs.length - 1 && (
                      <div className={`
                        flex-1 h-1 mx-2 rounded transition-colors
                        ${tabIndex < currentIndex
                          ? 'bg-green-400'
                          : tabIndex === currentIndex && tabValidation[tab.id]
                            ? 'bg-green-400'
                            : 'bg-gray-200'
                        }
                      `}>
                        <motion.div
                          className="h-full bg-green-500 rounded"
                          initial={{ width: 0 }}
                          animate={{
                            width: tabIndex < currentIndex || (tabIndex === currentIndex && tabValidation[tab.id])
                              ? '100%'
                              : '0%'
                          }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    )}
                  </React.Fragment>
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
                      <p className="text-lg font-bold text-blue-600">{formatMontant(totalDebit)} XAF</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Total Crédit</span>
                      <p className="text-lg font-bold text-blue-600">{formatMontant(totalCredit)} XAF</p>
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
                  <label className="inline-flex items-center space-x-2 px-4 py-2 bg-[#171717] text-white rounded-lg cursor-pointer hover:bg-[#262626] transition-colors">
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
                  {validationErrors.length === 0 ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span>Validation et Contrôles</span>
                  {validationErrors.length > 0 && (
                    <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                      {validationErrors.length} élément(s) à corriger
                    </span>
                  )}
                </h3>

                {/* Erreurs de validation */}
                {validationErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-semibold text-red-800 mb-3 flex items-center space-x-2">
                      <AlertCircle className="w-5 h-5" />
                      <span>Éléments manquants ou incorrects</span>
                    </h4>
                    <ul className="space-y-2">
                      {validationErrors.map((error, index) => (
                        <li key={index} className="flex items-start space-x-2 text-red-700">
                          <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{error}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-4 text-sm text-red-600 italic">
                      Veuillez corriger ces éléments avant de pouvoir valider l'écriture.
                    </p>
                  </div>
                )}

                {/* Message de succès si tout est valide */}
                {validationErrors.length === 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 mb-2 flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5" />
                      <span>Écriture prête à être validée</span>
                    </h4>
                    <p className="text-sm text-green-700">
                      Tous les contrôles sont passés avec succès. Vous pouvez valider et comptabiliser cette écriture.
                    </p>
                  </div>
                )}

                {/* Validation TVA */}
                {tvaValidation && (
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-blue-600" />
                      <span>Validation TVA</span>
                    </h4>

                    {tvaValidation.errors.length > 0 && (
                      <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="font-semibold text-red-700 mb-2">Erreurs TVA:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {tvaValidation.errors.map((error, i) => (
                            <li key={i} className="text-sm text-red-600">{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {tvaValidation.warnings.length > 0 && (
                      <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="font-semibold text-yellow-700 mb-2">Avertissements:</p>
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
                        <span className="text-green-700 font-medium">Validation TVA: Conforme</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="flex items-center justify-around mb-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">Total Débit</p>
                      <p className="text-lg font-bold text-blue-600">{formatMontant(totalDebit)} XAF</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">Total Crédit</p>
                      <p className="text-lg font-bold text-blue-600">{formatMontant(totalCredit)} XAF</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">Équilibre</p>
                      {isEquilibree ? (
                        <div className="flex items-center justify-center space-x-2 text-green-600">
                          <CheckCircle className="w-6 h-6" />
                          <span className="text-lg font-bold">Équilibré</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-2 text-red-600">
                          <AlertCircle className="w-6 h-6" />
                          <span className="text-lg font-bold">Non équilibré</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>Aperçu des écritures comptables</span>
                    </h4>
                    <div className="space-y-2">
                      {lignesEcriture.map((ligne, index) => (
                        <div key={index} className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                          !ligne.compte ? 'bg-red-50 border border-red-200' : 'bg-white'
                        }`}>
                          <div className="flex items-center space-x-4">
                            <span className={`px-2 py-1 text-xs font-semibold rounded ${
                              ligne.debit > 0 ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {ligne.debit > 0 ? 'DT' : 'CT'}
                            </span>
                            <span className={`font-mono text-sm ${!ligne.compte ? 'text-red-500 italic' : ''}`}>
                              {ligne.compte || '(compte manquant)'}
                            </span>
                            <span className="text-sm text-gray-600">{ligne.libelle}</span>
                          </div>
                          <span className="font-semibold text-right">
                            {ligne.debit > 0 ? formatMontant(ligne.debit) : formatMontant(ligne.credit)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {isEquilibree && validationErrors.length === 0 && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-green-700 font-medium">
                          Équilibre comptable respecté: {formatMontant(totalDebit)} XAF
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer - Wizard Navigation */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            {/* Boutons de gauche */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                Brouillon
              </button>
            </div>

            {/* Indicateur de progression et raccourcis */}
            <div className="flex flex-col items-center space-y-1">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>Étape {tabOrder.indexOf(activeTab) + 1} sur {tabOrder.length}</span>
                {tabValidation[activeTab] && activeTab !== 'validation' && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center space-x-1 text-green-600"
                  >
                    <Check className="w-4 h-4" />
                    <span>Complété</span>
                  </motion.span>
                )}
              </div>
              <div className="flex items-center space-x-3 text-xs text-gray-400">
                <span className="flex items-center space-x-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-mono">Ctrl</kbd>
                  <span>+</span>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-mono">Tab</kbd>
                  <span>Suivant</span>
                </span>
                <span className="flex items-center space-x-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-mono">Ctrl</kbd>
                  <span>+</span>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-mono">Shift</kbd>
                  <span>+</span>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-mono">Tab</kbd>
                  <span>Précédent</span>
                </span>
              </div>
            </div>

            {/* Boutons de navigation */}
            <div className="flex items-center space-x-3">
              {/* Bouton Précédent */}
              {activeTab !== 'details' && (
                <button
                  onClick={goToPrevTab}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  <span>Précédent</span>
                </button>
              )}

              {/* Bouton Suivant ou Valider */}
              {isLocked ? (
                <span className="px-6 py-2 rounded-lg font-medium bg-gray-200 text-gray-500 flex items-center space-x-2 cursor-not-allowed">
                  <CheckCircle className="w-5 h-5" />
                  <span>Écriture verrouillée</span>
                </span>
              ) : activeTab !== 'validation' ? (
                <button
                  onClick={goToNextTab}
                  className="px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 bg-blue-600 text-white hover:bg-blue-700"
                >
                  <span>Suivant</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  disabled={validationErrors.length > 0 || isSaving}
                  onClick={handleSaveEntry}
                  className={`
                    px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2
                    ${validationErrors.length === 0
                      ? 'bg-[#171717] text-white hover:bg-[#262626]'
                      : 'bg-gray-300 text-gray-700 cursor-not-allowed'
                    }
                  `}
                  title={validationErrors.length > 0 ? `${validationErrors.length} élément(s) à corriger` : 'Valider et comptabiliser cette écriture'}
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>{isSaving ? 'Enregistrement...' : 'Valider et Comptabiliser'}</span>
                </button>
              )}
            </div>
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
    <TemplateSelector
      isOpen={showTemplateSelector}
      onClose={() => setShowTemplateSelector(false)}
      onApply={handleApplyTemplate}
    />
    </>
  );
};

export default JournalEntryModal;