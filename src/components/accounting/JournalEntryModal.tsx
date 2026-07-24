import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
import Tooltip from '../ui/Tooltip';
import { TVAValidator, LigneEcriture as TVALigneEcriture, TVAValidationResult } from '../../utils/tvaValidation';
import { isEntryEditable, isEntryReversible } from '../../utils/reversalService';
import { validateJournalEntry, getNextPieceNumber } from '../../validators/journalEntryValidator';

import { useData } from '../../contexts/DataContext';
import { useAccountNames } from '../../hooks/useAccountNames';
import { safeAddEntry } from '../../services/entryGuard';
import { listSections } from '../../features/budget/services/analyticsService';
import { analyzeEntryPostSave, type PostSaveAnalysisResult } from '../../services/prophet/postSaveAnalysis';
import PostSaveAnalysisToast from './PostSaveAnalysisToast';
import { validerEcriture, comptabiliserEcriture, retourBrouillon, allowedTransitions, transitionLabel } from '../../services/entryWorkflow';
import type { EntryStatus } from '../../services/entryWorkflow';
import TemplateSelector from '../comptabilite/TemplateSelector';

interface JournalEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Record<string, unknown>;
  mode?: 'create' | 'edit';
  /** Ouvre directement TemplateSelector pré-sélectionné sur ce template. */
  initialTemplateId?: string;
}

interface LigneEcriture {
  compte: string;
  libelle: string;
  debit: number;
  credit: number;
  codeAnalytique?: string;
  noteLigne?: string;
  /**
   * Code tiers de la ligne — requis sur les comptes collectifs 40x/41x.
   * Le tiers de l'entête (achat/vente/règlement) est propagé automatiquement ;
   * ce champ sert aux écritures OD/virement, qui n'ont pas de tiers d'entête et
   * créaient donc des lignes fournisseur/client SANS tiers (invisibles de
   * l'encours, de la balance âgée et du lettrage).
   */
  tiers?: string;
}

type TransactionType = 'purchase' | 'sale' | 'payment' | 'transfer' | 'other';

const JournalEntryModal: React.FC<JournalEntryModalProps> = ({
  isOpen,
  onClose,
  initialData,
  mode = 'create',
  initialTemplateId,
}) => {
  // Lock guard: validated/posted entries are read-only (SYSCOHADA intangibility)
  const entryStatus = String(initialData?.status || 'draft');
  const isLocked = !isEntryEditable(entryStatus);
  const canReverse = isEntryReversible({ status: entryStatus, reversed: initialData?.reversed === true });

  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  // Si un template est pré-demandé (depuis le raccourci du dropdown), ouvrir
  // TemplateSelector dès que le modal lui-même s'ouvre.
  useEffect(() => {
    if (isOpen && initialTemplateId && mode === 'create') {
      setShowTemplateSelector(true);
    }
  }, [isOpen, initialTemplateId, mode]);

  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showReversalDialog, setShowReversalDialog] = useState(false);
  const [reversalReason, setReversalReason] = useState('');
  const [dateRange, setDateRange] = useState({ start: `${new Date().getFullYear()}-01-01`, end: `${new Date().getFullYear()}-12-31` });
  const { adapter } = useData();
  const { format: fmtAccount } = useAccountNames();
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

  // Plan comptable SYSCOHADA — chargé depuis le référentiel réel via le
  // DataAdapter (P0-5). Auparavant figé à ~20 comptes en dur, ce qui rendait la
  // saisie inutilisable en comptabilité réelle. Fallback minimal uniquement si
  // aucun compte n'est encore paramétré (base vierge).
  const PLAN_COMPTABLE_FALLBACK = [
    { code: '401000', libelle: 'Fournisseurs' },
    { code: '411000', libelle: 'Clients' },
    { code: '445200', libelle: 'TVA déductible' },
    { code: '445710', libelle: 'TVA collectée' },
    { code: '531000', libelle: 'Caisse' },
    { code: '601000', libelle: 'Achats de marchandises' },
    { code: '701000', libelle: 'Ventes de marchandises' },
  ];
  const [planComptable, setPlanComptable] = useState<Array<{ code: string; libelle: string }>>(PLAN_COMPTABLE_FALLBACK);

  // FICHES TIERS RÉELLES (third_parties) — la liste des fournisseurs/clients vient des
  // fiches, PAS des comptes du plan (un compte collectif 401100 n'est pas un fournisseur).
  const [thirdPartiesList, setThirdPartiesList] = useState<Array<{ code: string; name: string; type?: string; accountCode?: string }>>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tiers = await adapter.getAll<any>('thirdParties');
        if (cancelled) return;
        setThirdPartiesList((tiers || []).map((t: any) => ({
          code: String(t.code || ''),
          name: String(t.name || t.raisonSociale || t.code || ''),
          type: t.type ? String(t.type) : undefined,
          accountCode: t.accountCode || t.account_code || undefined,
        })).filter((t: any) => t.code));
      } catch { /* fiches indisponibles → repli comptes du plan */ }
    })();
    return () => { cancelled = true; };
  }, [adapter]);

  /** Fournisseurs = fiches tiers type supplier (repli : comptes 401xxx du plan). */
  const fournisseurOptions = useMemo(() => {
    const fiches = thirdPartiesList
      .filter(t => t.type === 'supplier' || (!t.type && /^(40|F|V)/i.test(t.code)))
      .map(t => ({ value: t.code, label: `${t.code} – ${t.name}` }))
      .sort((a, b) => a.label.localeCompare(b.label));
    if (fiches.length > 0) return fiches;
    return planComptable
      .filter(a => a.code.startsWith('401'))
      .map(a => ({ value: a.code, label: `${a.code} – ${a.libelle}` }));
  }, [thirdPartiesList, planComptable]);

  /** Clients = fiches tiers type customer (repli : comptes 411xxx du plan). */
  const clientOptions = useMemo(() => {
    const fiches = thirdPartiesList
      .filter(t => t.type === 'customer' || (!t.type && /^41/.test(t.code)))
      .map(t => ({ value: t.code, label: `${t.code} – ${t.name}` }))
      .sort((a, b) => a.label.localeCompare(b.label));
    if (fiches.length > 0) return fiches;
    return planComptable
      .filter(a => a.code.startsWith('411'))
      .map(a => ({ value: a.code, label: `${a.code} – ${a.libelle}` }));
  }, [thirdPartiesList, planComptable]);

  /** Compte tiers (collectif) de la fiche sélectionnée — affiché sous le sélecteur. */
  const compteTiersFor = useCallback((tiersCode: string, fallback: string) => {
    const fiche = thirdPartiesList.find(t => t.code === tiersCode);
    if (fiche?.accountCode) return fiche.accountCode;
    if (/^4/.test(tiersCode)) return tiersCode; // repli : un compte a été sélectionné
    return fallback;
  }, [thirdPartiesList]);

  // Portal position for the inline compte/analytique dropdowns in the ventilation table
  const [compteDropdownPos, setCompteDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [analytiqueDropdownPos, setAnalytiqueDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const compteInputRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const analytiqueInputRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const comptePortalRef = useRef<HTMLDivElement | null>(null);
  const analytiquePortalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const accounts = await adapter.getAll<{ code?: string; name?: string; libelle?: string; isActive?: boolean; actif?: boolean }>('accounts');
        if (cancelled) return;
        const mapped = accounts
          .filter((a) => a && a.code && a.isActive !== false && a.actif !== false)
          .map((a) => ({ code: String(a.code), libelle: String(a.name ?? a.libelle ?? a.code) }))
          .sort((x, y) => x.code.localeCompare(y.code));
        if (mapped.length > 0) setPlanComptable(mapped);
      } catch (_e) {
        /* conserve le fallback minimal */
      }
    })();
    return () => { cancelled = true; };
  }, [adapter]);

  // Pré-remplissage en mode édition : quand le modal s'ouvre avec initialData
  useEffect(() => {
    if (!isOpen || mode !== 'edit' || !initialData) return;
    // Remplir les détails depuis l'écriture existante
    const journalCode = String(initialData.journal || '');
    const journalLabels: Record<string, string> = {
      VE: 'VE - Ventes', AC: 'AC - Achats', BQ: 'BQ - Banque',
      CA: 'CA - Caisse', OD: 'OD - Opérations Diverses', AN: 'AN - A-Nouveau',
    };
    const journalLabel = journalCode
      ? (journalLabels[journalCode] || journalCode)
      : getJournalByType('other');
    setDetails(prev => ({
      ...prev,
      dateEcriture: String(initialData.date || prev.dateEcriture),
      numeroEcriture: String(initialData.entryNumber || prev.numeroEcriture),
      journal: journalLabel,
      description: String(initialData.label || ''),
    }));
    // Pré-remplir les lignes si disponibles
    const rawLines = Array.isArray(initialData.lines) ? initialData.lines as any[] : [];
    if (rawLines.length > 0) {
      setLignesEcriture(rawLines.map((l: any) => ({
        compte: String(l.accountCode || l.compte || ''),
        libelle: String(l.label || l.libelle || l.accountName || ''),
        debit: Number(l.debit ?? 0),
        credit: Number(l.credit ?? 0),
        codeAnalytique: String(l.codeAnalytique || l.analytique || ''),
      })));
    }
  }, [isOpen, mode, initialData?.id]);

  /**
   * Sections analytiques RÉELLES (table `sections_analytiques`).
   *
   * Cette liste était auparavant inventée en dur (CC001 Commercial, PRJ001
   * Projet Alpha, REG01 Région Nord…) : aucune de ces sections n'existe en base,
   * et le sélecteur stockait le LIBELLÉ au lieu du code. Le champ
   * `analytical_code` recevait donc une chaîne qui ne correspondait à aucune
   * section ⇒ la vue `v_actual_by_section` (qui rapproche par CODE) n'attribuait
   * jamais rien, et la performance par section restait à zéro quoi qu'on saisisse.
   */
  const [codesAnalytiques, setCodesAnalytiques] = useState<Array<{ code: string; libelle: string }>>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sections = await listSections(adapter);
        if (cancelled) return;
        setCodesAnalytiques(
          sections
            .filter(s => s.actif !== false && s.code)
            .map(s => ({ code: s.code, libelle: `${s.code} — ${s.libelle}` }))
            .sort((a, b) => a.code.localeCompare(b.code)),
        );
      } catch { /* sections indisponibles → sélecteur vide, pas de faux choix */ }
    })();
    return () => { cancelled = true; };
  }, [adapter]);

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
    preparePar: '',
    approuvePar: ''
  });

  // État pour la ventilation — lignes vierges (P0-5/UX-20 : plus de fausse
  // écriture pré-remplie, qui induisait des erreurs de saisie réelles).
  const [lignesEcriture, setLignesEcriture] = useState<LigneEcriture[]>([
    { compte: '', libelle: '', debit: 0, credit: 0, codeAnalytique: '' },
    { compte: '', libelle: '', debit: 0, credit: 0, codeAnalytique: '' }
  ]);

  // État pour les factures (ventilation)
  const [factureInfo, setFactureInfo] = useState({
    fournisseur: '',
    dateFacture: '',
    numeroFacture: ''
  });

  // État pour les ventes
  const [venteInfo, setVenteInfo] = useState({
    client: '',
    dateFacture: '',
    numeroFacture: ''
  });

  // État pour les règlements
  const [reglementInfo, setReglementInfo] = useState({
    typeReglement: 'encaissement', // 'encaissement' ou 'decaissement'
    tiers: '',
    modeReglement: 'virement',
    reference: '',
    dateEcheance: '',
    montant: 0,
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
  const [attachements, setAttachements] = useState<Array<{ nom: string; type: string; taille: string; reference: string; ligneAssociee: string; commentaire: string }>>([]);

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

  // Fermer les dropdowns quand on clique à l'extérieur (gère aussi les portals)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inComptePortal = comptePortalRef.current?.contains(target) ?? false;
      const inAnalytiquePortal = analytiquePortalRef.current?.contains(target) ?? false;
      const inCompteTrigger = !!(event.target as HTMLElement).closest?.('.compte-search-trigger');
      const inAnalytiqueTrigger = !!(event.target as HTMLElement).closest?.('.analytique-search-trigger');
      if (!inCompteTrigger && !inComptePortal) setShowCompteDropdown(null);
      if (!inAnalytiqueTrigger && !inAnalytiquePortal) setShowAnalytiqueDropdown(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fermer les portals sur scroll (le dropdown ne suivrait pas le défilement)
  useEffect(() => {
    if (showCompteDropdown === null) return;
    const close = () => setShowCompteDropdown(null);
    window.addEventListener('scroll', close, true);
    return () => window.removeEventListener('scroll', close, true);
  }, [showCompteDropdown]);

  useEffect(() => {
    if (showAnalytiqueDropdown === null) return;
    const close = () => setShowAnalytiqueDropdown(null);
    window.addEventListener('scroll', close, true);
    return () => window.removeEventListener('scroll', close, true);
  }, [showAnalytiqueDropdown]);

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
      preparePar: '',
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

  /**
   * Tiers porté par l'entête (achat/vente/règlement). Il satisfait la règle
   * « tiers obligatoire sur 40x/41x » sans ressaisie ; les OD et virements n'en
   * ont pas → la saisie se fait ligne par ligne.
   */
  const tiersEnteteCourant = useMemo(() => (
    transactionType === 'purchase' ? factureInfo.fournisseur
    : transactionType === 'sale' ? venteInfo.client
    : transactionType === 'payment' ? reglementInfo.tiers
    : ''
  ), [transactionType, factureInfo.fournisseur, venteInfo.client, reglementInfo.tiers]);

  // Fonction pour calculer les erreurs de validation
  const getValidationErrors = useCallback((): string[] => {
    const errors: string[] = [];

    // Vérifications onglet Détails
    if (!details.dateEcriture) {
      errors.push(t('journalEntry.errMissingDate'));
    }
    if (!details.description.trim()) {
      errors.push(t('journalEntry.errMissingDescription'));
    }
    if (transactionType === 'other' && !sousJournalOD) {
      errors.push(t('journalEntry.errMissingSubJournal'));
    }

    // Vérifications onglet Ventilation
    if (Math.abs(totalDebit - totalCredit) >= 0.01 || totalDebit === 0) {
      errors.push(t('journalEntry.errUnbalanced', { debit: formatCurrency(totalDebit), credit: formatCurrency(totalCredit) }));
    }

    const emptyAccounts = lignesEcriture.filter(l => !l.compte);
    if (emptyAccounts.length > 0) {
      errors.push(t('journalEntry.errLinesWithoutAccount', { count: String(emptyAccounts.length) }));
    }

    // Tiers OBLIGATOIRE sur les comptes collectifs 40x/41x. Le tiers d'entête
    // (achat/vente/règlement) satisfait la règle ; les OD/virements doivent le
    // saisir par ligne. Sans tiers, le montant n'apparaît dans AUCUNE vue par
    // tiers (encours, balance âgée, relances, lettrage) et casse la
    // réconciliation sous-registre ↔ compte collectif.
    const collectifsSansTiers = lignesEcriture.filter(
      l => /^4[01]/.test(String(l.compte || '')) && !String(l.tiers || tiersEnteteCourant || '').trim(),
    );
    if (collectifsSansTiers.length > 0) {
      errors.push(
        `Tiers obligatoire sur ${collectifsSansTiers.length} ligne(s) de compte collectif `
        + `(${collectifsSansTiers.map(l => l.compte).join(', ')}) — sans tiers, le montant `
        + `n'apparaîtra ni dans l'encours, ni dans la balance âgée, ni dans le lettrage.`,
      );
    }

    // Vérifications spécifiques par type
    if (transactionType === 'purchase') {
      if (!factureInfo.fournisseur) errors.push(t('journalEntry.errNoSupplier'));
      if (!factureInfo.dateFacture) errors.push(t('journalEntry.errNoSupplierInvoiceDate'));
      if (!factureInfo.numeroFacture) errors.push(t('journalEntry.errNoSupplierInvoiceNumber'));
    }
    if (transactionType === 'sale') {
      if (!venteInfo.client) errors.push(t('journalEntry.errNoCustomer'));
      if (!venteInfo.dateFacture) errors.push(t('journalEntry.errNoCustomerInvoiceDate'));
      if (!venteInfo.numeroFacture) errors.push(t('journalEntry.errNoCustomerInvoiceNumber'));
    }
    if (transactionType === 'payment') {
      if (!reglementInfo.tiers) errors.push(t('journalEntry.errNoThirdParty'));
      if (!reglementInfo.modeReglement) errors.push(t('journalEntry.errNoPaymentMethod'));
      if (reglementInfo.montant <= 0) errors.push(t('journalEntry.errInvalidPaymentAmount'));
    }
    if (transactionType === 'transfer') {
      if (!virementInfo.compteDebit) errors.push(t('journalEntry.errNoDebitAccount'));
      if (!virementInfo.compteCredit) errors.push(t('journalEntry.errNoCreditAccount'));
      if (!virementInfo.motif) errors.push(t('journalEntry.errNoTransferPurpose'));
    }

    // Vérification TVA
    if (tvaValidation && !tvaValidation.isValid) {
      errors.push(t('journalEntry.errVatValidationFailed'));
    }

    return errors;
  }, [details, transactionType, sousJournalOD, totalDebit, totalCredit, lignesEcriture, factureInfo, venteInfo, reglementInfo, virementInfo, tvaValidation, tiersEnteteCourant]);

  // Mettre à jour les erreurs de validation quand les données changent
  useEffect(() => {
    setValidationErrors(getValidationErrors());
  }, [getValidationErrors]);

  const transactionTypes = [
    { value: 'purchase', label: t('journalEntry.typePurchase'), icon: ShoppingCart },
    { value: 'sale', label: t('journalEntry.typeSale'), icon: CreditCard },
    { value: 'payment', label: t('journalEntry.typePayment'), icon: ArrowRightLeft },
    { value: 'transfer', label: t('journalEntry.typeTransfer'), icon: ArrowRightLeft },
    { value: 'other', label: t('journalEntry.typeOther'), icon: Settings }
  ];

  const tabs = [
    { id: 'details', label: t('common.details'), sublabel: t('journalEntry.tabDetailsSub'), icon: FileText },
    { id: 'ventilation', label: t('journalEntry.tabAllocation'), sublabel: t('journalEntry.tabAllocationSub'), icon: FileText },
    { id: 'attachements', label: t('journalEntry.tabAttachments'), sublabel: t('journalEntry.tabAttachmentsSub'), icon: Paperclip },
    { id: 'notes', label: t('journalEntry.tabNotes'), sublabel: t('journalEntry.tabNotesSub'), icon: MessageSquare },
    { id: 'validation', label: t('journalEntry.tabValidation'), sublabel: t('journalEntry.tabValidationSub'), icon: CheckCircle }
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
  const [analysisResult, setAnalysisResult] = useState<PostSaveAnalysisResult | null>(null);

  const handleSaveEntry = useCallback(async () => {
    if (isSaving || validationErrors.length > 0) return;

    setIsSaving(true);
    try {
      const journalCode = transactionType === 'purchase' ? 'AC'
        : transactionType === 'sale' ? 'VE'
        : transactionType === 'payment' ? (reglementInfo.compteBank === '531000' ? 'CA' : 'BQ')
        : transactionType === 'transfer' ? 'TR'
        : 'OD';

      // Tiers de l'écriture (selon la section) — propagé aux lignes de compte collectif
      // 40/41 pour que le lettrage PAR TIERS fonctionne (sinon regroupement par compte seul).
      const tiersCode =
        transactionType === 'purchase' ? factureInfo.fournisseur
        : transactionType === 'sale' ? venteInfo.client
        : transactionType === 'payment' ? reglementInfo.tiers
        : '';
      const tiersFiche = thirdPartiesList.find(t => t.code === tiersCode);

      // Validation complète via le validateur dédié (Money class, D=C, comptes, période)
      // id de ligne = UUID GLOBAL (les lignes vivent dans journal_lines, PK unique ;
      // "L1"/"L2" auraient collisionné entre écritures).
      const lines = lignesEcriture.map((l) => ({
        id: crypto.randomUUID(),
        accountCode: l.compte,
        accountName: l.libelle,
        label: l.libelle,
        debit: l.debit,
        credit: l.credit,
        analyticalCode: l.codeAnalytique || undefined,
        // Tiers de la LIGNE (saisi sur les OD/virements) sinon tiers d'entête
        // (achat/vente/règlement). Sans cela, une ligne 401/411 d'une OD partait
        // sans tiers et devenait invisible de l'encours / balance âgée / lettrage.
        thirdPartyCode: /^4[01]/.test(String(l.compte)) ? ((l.tiers || tiersCode) || undefined) : undefined,
        thirdPartyName: /^4[01]/.test(String(l.compte))
          ? (thirdPartiesList.find(tp => tp.code === (l.tiers || tiersCode))?.name || tiersFiche?.name || undefined)
          : undefined,
      }));

      const result = await validateJournalEntry(adapter, {
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
      const entryNumber = await getNextPieceNumber(adapter, journalCode);

      await safeAddEntry(adapter, {
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

      // Background SYSCOHADA analysis (non-blocking, advisory only).
      // The toast is rendered at the modal root and persists briefly even
      // after the modal closes so the user can see the result.
      analyzeEntryPostSave(adapter).then(setAnalysisResult).catch(() => {});

      resetForm();
      onClose();
    } catch (error) {
      setValidationErrors([t('journalEntry.saveError', { message: error instanceof Error ? error.message : String(error) })]);
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

  // When the modal is closed but a post-save analysis toast is still
  // pending, keep rendering so the advisory SYSCOHADA feedback can be
  // shown to the user even after the modal has dismissed.
  if (!isOpen && !analysisResult) return null;

  return (
    <>
    {isOpen && (
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
              <h2 className="text-lg font-semibold text-gray-800">{t('journalEntry.title')}</h2>
            </div>
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 bg-green-50 text-green-700 text-sm font-medium rounded-full flex items-center space-x-1">
                <Check className="w-4 h-4" />
                <span>{t('journalEntry.syscohadaCompliant')}</span>
              </span>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors" aria-label={t('journalEntry.close')}>
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
                      ? t('journalEntry.statusReversedOn', { date: String(initialData.reversedAt ?? '').split('T')[0] || '' })
                      : t('journalEntry.statusPosted')
                    : entryStatus === 'validated'
                    ? t('journalEntry.statusValidated')
                    : t('journalEntry.statusDraft')}
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
                      const res = await fn(adapter, String(initialData.id));
                      if (res.success) {
                        onClose();
                      } else {
                        setValidationErrors([res.error || t('journalEntry.genericError')]);
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
                    {t('journalEntry.reversal')}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Type de Transaction et Numéro d'écriture */}
          <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <label className="text-sm font-medium text-gray-700">{t('journalEntry.transactionType')} *</label>
                <div className="max-w-md">
                  <SearchableDropdown
                    options={transactionTypes.map(type => ({
                      value: type.value,
                      label: type.label
                    }))}
                    value={transactionType}
                    onChange={(value) => setTransactionType(value as TransactionType)}
                    placeholder={t('journalEntry.selectType')}
                    showSearch={false}
                  />
                </div>
                {mode === 'create' && !isLocked && (
                  <button
                    onClick={() => setShowTemplateSelector(true)}
                    className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center space-x-1"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{t('journalEntry.template')}</span>
                  </button>
                )}
              </div>

              {/* Numéro d'écriture à droite */}
              <div className="flex items-center space-x-3">
                <Hash className="w-5 h-5 text-gray-600" />
                <span className="text-base font-medium text-gray-700">{t('journalEntry.entryNumber')}</span>
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
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('journalEntry.generalInformation')}</h3>

                  <div className={`grid ${transactionType === 'other' ? 'grid-cols-4' : 'grid-cols-3'} gap-4`}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('journalEntry.entryDate')} *</label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('accounting.journal')}
                        <span className="ml-1 align-middle">
                          <Tooltip asIcon content={t('journalEntry.journalTooltip')} />
                        </span>
                      </label>
                      <input
                        type="text"
                        value={details.journal}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg font-medium ${
                          transactionType === 'purchase' ? 'bg-orange-50 text-orange-700' :
                          transactionType === 'sale' ? 'bg-green-50 text-green-700' :
                          transactionType === 'payment' ?
                            (reglementInfo.compteBank === '531000' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700') :
                          transactionType === 'transfer' ? 'bg-primary-50 text-primary-700' :
                          'bg-gray-50 text-gray-700'
                        }`}
                        readOnly
                      />
                    </div>

                    {/* Sous-journal pour Opérations Diverses */}
                    {transactionType === 'other' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('journalEntry.odSubJournal')} *</label>
                        <SearchableDropdown
                          options={[
                            { value: 'OD-PAIE', label: `OD-PAIE - ${t('journalEntry.odPayroll')}` },
                            { value: 'OD-AMORT', label: `OD-AMORT - ${t('journalEntry.odDepreciation')}` },
                            { value: 'OD-PROV', label: `OD-PROV - ${t('journalEntry.odProvisions')}` },
                            { value: 'OD-REGUL', label: `OD-REGUL - ${t('journalEntry.odAdjustments')}` },
                            { value: 'OD-CLOT', label: `OD-CLOT - ${t('journalEntry.odClosing')}` },
                            { value: 'OD-OUVERT', label: `OD-OUVERT - ${t('journalEntry.odOpening')}` },
                            { value: 'OD-TVA', label: `OD-TVA - ${t('journalEntry.odVatReturns')}` },
                            { value: 'OD-STOCK', label: `OD-STOCK - ${t('journalEntry.odInventoryChange')}` },
                            { value: 'OD-AUTRES', label: `OD-AUTRES - ${t('journalEntry.odOther')}` }
                          ]}
                          value={sousJournalOD}
                          onChange={(value) => setSousJournalOD(value)}
                          placeholder={t('journalEntry.selectSubJournal')}
                          searchPlaceholder={t('journalEntry.searchSubJournal')}
                          clearable
                          usePortal
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('journalEntry.externalReference')}</label>
                      <input
                        type="text"
                        value={details.reference}
                        onChange={(e) => setDetails({...details, reference: e.target.value})}
                        placeholder={t('journalEntry.externalReferencePlaceholder')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('journalEntry.description')} *</label>
                    <textarea
                      value={details.description}
                      onChange={(e) => setDetails({...details, description: e.target.value})}
                      placeholder={t('journalEntry.descriptionPlaceholder')}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('journalEntry.preparedBy')}</label>
                      <input
                        type="text"
                        value={details.preparePar}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        readOnly
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('journalEntry.approvedBy')}</label>
                      <SearchableDropdown
                        options={[
                          { value: 'manager', label: t('journalEntry.roleManager') },
                          { value: 'directeur', label: t('journalEntry.roleDirector') }
                        ]}
                        value={details.approuvePar}
                        onChange={(value) => setDetails({...details, approuvePar: value})}
                        placeholder={t('journalEntry.selectPlaceholder')}
                        searchPlaceholder={t('journalEntry.searchUser')}
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
                    <span>{t('journalEntry.accountAllocation')}</span>
                  </h3>
                </div>

                {/* Section Facture d'Achat */}
                {transactionType === 'purchase' && (
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                      <ShoppingCart className="w-4 h-4" />
                      <span>{t('journalEntry.purchaseInvoice')}</span>
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('journalEntry.supplier')} *</label>
                        <SearchableDropdown
                          options={fournisseurOptions}
                          value={factureInfo.fournisseur}
                          onChange={(value) => setFactureInfo({...factureInfo, fournisseur: value})}
                          placeholder={t('journalEntry.selectSupplier')}
                          searchPlaceholder={t('journalEntry.searchSupplier')}
                          clearable
                          usePortal
                        />
                        {factureInfo.fournisseur && (
                          <p className="mt-1 text-xs text-gray-500">
                            {t('journalEntry.thirdPartyAccount')} <span className="font-mono font-medium">{compteTiersFor(factureInfo.fournisseur, '401100')}</span>
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('journalEntry.invoiceDate')} *</label>
                        <input
                          type="date"
                          value={factureInfo.dateFacture}
                          onChange={(e) => setFactureInfo({...factureInfo, dateFacture: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('journalEntry.supplierInvoiceNumber')} *</label>
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
                      <span>{t('journalEntry.salesInvoice')}</span>
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('journalEntry.customer')} *</label>
                        <SearchableDropdown
                          options={clientOptions}
                          value={venteInfo.client}
                          onChange={(value) => setVenteInfo({...venteInfo, client: value})}
                          placeholder={t('journalEntry.selectCustomer')}
                          searchPlaceholder={t('journalEntry.searchCustomer')}
                          clearable
                          usePortal
                        />
                        {venteInfo.client && (
                          <p className="mt-1 text-xs text-gray-500">
                            {t('journalEntry.thirdPartyAccount')} <span className="font-mono font-medium">{compteTiersFor(venteInfo.client, '411100')}</span>
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('journalEntry.invoiceDate')} *</label>
                        <input
                          type="date"
                          value={venteInfo.dateFacture}
                          onChange={(e) => setVenteInfo({...venteInfo, dateFacture: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('journalEntry.customerInvoiceNumber')} *</label>
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
                    <div className="bg-primary-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                        <CreditCard className="w-4 h-4" />
                        <span>{t('journalEntry.paymentBankCash')}</span>
                      </h4>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('journalEntry.paymentType')} *</label>
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
                              <span>{t('journalEntry.paymentIn')}</span>
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
                              <span>{t('journalEntry.paymentOut')}</span>
                            </span>
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('journalEntry.paymentMethod')} *</label>
                          <SearchableDropdown
                            options={[
                              { value: 'virement', label: t('journalEntry.methodTransfer') },
                              { value: 'cheque', label: t('journalEntry.methodCheque') },
                              { value: 'especes', label: t('journalEntry.methodCash') },
                              { value: 'carte', label: t('journalEntry.methodCard') },
                              { value: 'prelevement', label: t('journalEntry.methodDirectDebit') }
                            ]}
                            value={reglementInfo.modeReglement}
                            onChange={(value) => setReglementInfo({...reglementInfo, modeReglement: value})}
                            placeholder={t('journalEntry.selectMethod')}
                            showSearch={false}
                            usePortal
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('journalEntry.bankAccount')} *</label>
                          <SearchableDropdown
                            options={
                              planComptable
                                .filter(a => a.code.startsWith('51') || a.code.startsWith('52') || a.code.startsWith('53'))
                                .map(a => ({ value: a.code, label: `${a.code} – ${a.libelle}` }))
                            }
                            value={reglementInfo.compteBank}
                            onChange={(value) => setReglementInfo({...reglementInfo, compteBank: value})}
                            placeholder={t('journalEntry.selectAccount')}
                            searchPlaceholder={t('journalEntry.searchAccount')}
                            usePortal
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('journalEntry.amount')} *</label>
                          <input
                            type="number"
                            value={reglementInfo.montant}
                            onChange={(e) => setReglementInfo({...reglementInfo, montant: parseFloat(e.target.value) || 0})}
                            placeholder="119250"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('journalEntry.reference')}</label>
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
                        <User className="w-4 h-4 text-primary-600" />
                        <span>{reglementInfo.typeReglement === 'encaissement' ? t('journalEntry.debtorThirdParty') : t('journalEntry.creditorThirdParty')}</span>
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {reglementInfo.typeReglement === 'encaissement' ? t('journalEntry.debtorThirdParty') : t('journalEntry.creditorThirdParty')} *
                          </label>
                          <SearchableDropdown
                            options={reglementInfo.typeReglement === 'encaissement' ? clientOptions : fournisseurOptions}
                            value={reglementInfo.tiers}
                            onChange={(value) => setReglementInfo({...reglementInfo, tiers: value})}
                            placeholder={t('journalEntry.selectPlaceholder')}
                            searchPlaceholder={reglementInfo.typeReglement === 'encaissement' ? t('journalEntry.searchCustomer') : t('journalEntry.searchSupplier')}
                            clearable
                            usePortal
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {reglementInfo.typeReglement === 'encaissement' ? t('journalEntry.documentToCollect') : t('journalEntry.documentToPay')} *
                          </label>
                          <input
                            type="text"
                            value={reglementInfo.document}
                            onChange={(e) => setReglementInfo({...reglementInfo, document: e.target.value})}
                            placeholder={reglementInfo.typeReglement === 'encaissement' ? 'VE-2025-00001' : 'FA-2025-001'}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section Ventilation par comptes */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span>{t('journalEntry.allocationByAccount')}</span>
                      </h4>
                    </div>
                  </div>
                )}

                {/* Section Virement Interne */}
                {transactionType === 'transfer' && (
                  <div className="bg-orange-50 p-4 rounded-lg mb-4">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                      <ArrowRightLeft className="w-4 h-4" />
                      <span>{t('journalEntry.typeTransfer')}</span>
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('journalEntry.accountToDebit')} *
                          <span className="ml-1 align-middle">
                            <Tooltip asIcon content={t('journalEntry.accountTooltip')} />
                          </span>
                        </label>
                        <SearchableDropdown
                          options={[
                            { value: '512000', label: `512000 - ${t('journalEntry.mainBank')}` },
                            { value: '531000', label: `531000 - ${t('journalEntry.cashDesk')}` }
                          ]}
                          value={virementInfo.compteDebit}
                          onChange={(value) => setVirementInfo({...virementInfo, compteDebit: value})}
                          placeholder={t('journalEntry.selectAccountPlaceholder')}
                          searchPlaceholder={t('journalEntry.searchAccount')}
                          clearable
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('journalEntry.accountToCredit')} *
                          <span className="ml-1 align-middle">
                            <Tooltip asIcon content={t('journalEntry.accountTooltip')} />
                          </span>
                        </label>
                        <SearchableDropdown
                          options={[
                            { value: '512001', label: `512001 - ${t('journalEntry.secondaryBank')}` },
                            { value: '531000', label: `531000 - ${t('journalEntry.cashDesk')}` }
                          ]}
                          value={virementInfo.compteCredit}
                          onChange={(value) => setVirementInfo({...virementInfo, compteCredit: value})}
                          placeholder={t('journalEntry.selectAccountPlaceholder')}
                          searchPlaceholder={t('journalEntry.searchAccount')}
                          clearable
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('journalEntry.purpose')} *</label>
                        <input
                          type="text"
                          value={virementInfo.motif}
                          onChange={(e) => setVirementInfo({...virementInfo, motif: e.target.value})}
                          placeholder={t('journalEntry.transferPurposePlaceholder')}
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
                      <span>{t('journalEntry.typeOther')}</span>
                    </h4>
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        {t('journalEntry.otherOperationHint')}
                      </p>
                    </div>
                  </div>
                )}

                <div className="overflow-visible">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-y border-gray-200">
                        <th className="text-left px-3 py-2 text-sm font-medium text-gray-700">{t('accounting.account')}</th>
                        <th className="text-left px-3 py-2 text-sm font-medium text-gray-700">{t('accounting.label')}</th>
                        <th className="text-right px-3 py-2 text-sm font-medium text-gray-700">{t('accounting.debit')}</th>
                        <th className="text-right px-3 py-2 text-sm font-medium text-gray-700">{t('accounting.credit')}</th>
                        <th className="text-left px-3 py-2 text-sm font-medium text-gray-700">{t('journalEntry.analyticalCode')}</th>
                        <th className="text-center px-3 py-2 text-sm font-medium text-gray-700">{t('journalEntry.note')}</th>
                        <th className="text-center px-3 py-2 text-sm font-medium text-gray-700">{t('journalEntry.action')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lignesEcriture.map((ligne, index) => (
                        <tr key={index} className="border-b border-gray-200">
                          <td className="px-3 py-2">
                            <div
                              className="relative compte-search-trigger"
                              ref={(el) => { if (el) compteInputRefs.current.set(index, el); else compteInputRefs.current.delete(index); }}
                            >
                              <input
                                type="text"
                                value={ligne.compte}
                                onChange={(e) => {
                                  modifierLigne(index, 'compte', e.target.value);
                                  setSearchCompte({ ...searchCompte, [index]: e.target.value });
                                  setShowCompteDropdown(index);
                                }}
                                onFocus={() => {
                                  const el = compteInputRefs.current.get(index);
                                  if (el) {
                                    const rect = el.getBoundingClientRect();
                                    setCompteDropdownPos({ top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 300) });
                                  }
                                  setShowCompteDropdown(index);
                                }}
                                placeholder={t('journalEntry.searchPlaceholder')}
                                className="w-full px-2 py-1 pr-8 border border-gray-300 rounded"
                              />
                              <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-700" />
                            </div>
                            {showCompteDropdown === index && compteDropdownPos && createPortal(
                              <div
                                ref={comptePortalRef}
                                className="bg-white border border-gray-300 rounded-lg shadow-xl overflow-y-auto"
                                style={{ position: 'fixed', top: compteDropdownPos.top, left: compteDropdownPos.left, width: compteDropdownPos.width, maxHeight: 192, zIndex: 9999 }}
                              >
                                {getFilteredComptes(index).map((compte) => (
                                  <button
                                    key={compte.code}
                                    onMouseDown={(e) => { e.preventDefault(); selectCompte(index, compte); }}
                                    className="w-full px-3 py-2 text-left hover:bg-blue-50 flex justify-between items-center"
                                  >
                                    <span className="font-mono text-sm">{compte.code}</span>
                                    <span className="text-sm text-gray-600 truncate ml-2">{compte.libelle}</span>
                                  </button>
                                ))}
                              </div>,
                              document.body
                            )}
                            {/* Compte collectif 40x/41x → le tiers est obligatoire.
                                Prérempli par le tiers d'entête (achat/vente/règlement) ;
                                saisissable ligne par ligne pour les OD et virements. */}
                            {/^4[01]/.test(String(ligne.compte || '')) && (() => {
                              const isClient = String(ligne.compte).startsWith('41');
                              const opts = isClient ? clientOptions : fournisseurOptions;
                              const current = ligne.tiers || tiersEnteteCourant || '';
                              const options = current && !opts.some(o => o.value === current)
                                ? [{ value: current, label: current }, ...opts]
                                : opts;
                              return (
                                <select
                                  value={current}
                                  onChange={(e) => modifierLigne(index, 'tiers', e.target.value)}
                                  title="Compte collectif : sans tiers, le montant n'apparaît ni dans l'encours, ni dans la balance âgée, ni dans le lettrage."
                                  className={`mt-1 w-full px-2 py-1 text-xs rounded border ${
                                    current ? 'border-gray-300 bg-white' : 'border-red-400 bg-red-50 text-red-700'
                                  }`}
                                >
                                  <option value="">— {isClient ? 'Client' : 'Fournisseur'} obligatoire —</option>
                                  {options.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                  ))}
                                </select>
                              );
                            })()}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={ligne.libelle}
                              onChange={(e) => modifierLigne(index, 'libelle', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-50"
                              placeholder={t('journalEntry.autoFilled')}
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
                          <td className="px-3 py-2">
                            <div
                              className="relative analytique-search-trigger"
                              ref={(el) => { if (el) analytiqueInputRefs.current.set(index, el); else analytiqueInputRefs.current.delete(index); }}
                            >
                              <input
                                type="text"
                                value={ligne.codeAnalytique || ''}
                                onChange={(e) => {
                                  modifierLigne(index, 'codeAnalytique', e.target.value);
                                  setSearchAnalytique({ ...searchAnalytique, [index]: e.target.value });
                                  setShowAnalytiqueDropdown(index);
                                }}
                                onFocus={() => {
                                  const el = analytiqueInputRefs.current.get(index);
                                  if (el) {
                                    const rect = el.getBoundingClientRect();
                                    setAnalytiqueDropdownPos({ top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 240) });
                                  }
                                  setShowAnalytiqueDropdown(index);
                                }}
                                placeholder={t('journalEntry.optionalPlaceholder')}
                                className="w-full px-2 py-1 pr-8 border border-gray-300 rounded"
                              />
                              <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-700" />
                            </div>
                            {showAnalytiqueDropdown === index && analytiqueDropdownPos && createPortal(
                              <div
                                ref={analytiquePortalRef}
                                className="bg-white border border-gray-300 rounded-lg shadow-xl overflow-y-auto"
                                style={{ position: 'fixed', top: analytiqueDropdownPos.top, left: analytiqueDropdownPos.left, width: analytiqueDropdownPos.width, maxHeight: 192, zIndex: 9999 }}
                              >
                                <button
                                  onMouseDown={(e) => { e.preventDefault(); modifierLigne(index, 'codeAnalytique', ''); setShowAnalytiqueDropdown(null); }}
                                  className="w-full px-3 py-2 text-left hover:bg-gray-50 text-gray-700 italic"
                                >
                                  {t('journalEntry.none')}
                                </button>
                                {codesAnalytiques.length === 0 && (
                                  <p className="px-3 py-2 text-xs text-gray-500 italic">
                                    Aucune section analytique. Créez-en dans Contrôle de gestion › Analytique.
                                  </p>
                                )}
                                {getFilteredAnalytiques(index).map((code) => (
                                  <button
                                    key={code.code}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      // Le CODE, jamais le libellé : c'est lui que
                                      // `analytical_code` doit porter pour être rapproché.
                                      modifierLigne(index, 'codeAnalytique', code.code);
                                      setShowAnalytiqueDropdown(null);
                                      setSearchAnalytique({ ...searchAnalytique, [index]: '' });
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-blue-50"
                                  >
                                    <span className="text-sm">{code.libelle}</span>
                                  </button>
                                ))}
                              </div>,
                              document.body
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
                              title={ligne.noteLigne ? t('journalEntry.existingNote') : t('journalEntry.addNote')}
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
                              aria-label={t('journalEntry.deleteLine')}
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
                  className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" aria-label={t('journalEntry.add')}>
                  <Plus className="w-4 h-4" />
                  <span>
                    {transactionType === 'purchase' && t('journalEntry.addPurchaseLine')}
                    {transactionType === 'sale' && t('journalEntry.addSaleLine')}
                    {transactionType === 'payment' && t('journalEntry.addPaymentLine')}
                    {transactionType === 'transfer' && t('journalEntry.addTransferLine')}
                    {transactionType === 'other' && t('journalEntry.addEntryLine')}
                  </span>
                </button>

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-8">
                    <div>
                      <span className="text-sm text-gray-600">{t('journalEntry.totalDebit')}</span>
                      <p className="text-lg font-bold text-blue-600">{formatMontant(totalDebit)} XAF</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">{t('journalEntry.totalCredit')}</span>
                      <p className="text-lg font-bold text-blue-600">{formatMontant(totalCredit)} XAF</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{t('journalEntry.balanceCheck')}</span>
                    {isEquilibree ? (
                      <div className="flex items-center space-x-1 text-green-600">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-semibold">{t('journalEntry.balanced')} ✓</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1 text-red-600">
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-semibold">{t('journalEntry.unbalanced')}</span>
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
                  <span>{t('journalEntry.fileAttachments')}</span>
                </h3>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <File className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">{t('journalEntry.dragDropFiles')}</p>
                  <p className="text-sm text-gray-700 mb-4">{t('journalEntry.orClickToSelect')}</p>
                  <label className="inline-flex items-center space-x-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg cursor-pointer hover:bg-[var(--color-primary-hover)] transition-colors">
                    <Plus className="w-4 h-4" />
                    <span>{t('journalEntry.selectFiles')}</span>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                    />
                  </label>
                  <p className="text-xs text-gray-700 mt-2">{t('journalEntry.fileFormatsHint')}</p>
                </div>

                {attachements.length > 0 && (
                  <div>
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-y border-gray-200">
                          <th className="text-left px-3 py-2 text-sm font-medium text-gray-700">{t('journalEntry.file')}</th>
                          <th className="text-left px-3 py-2 text-sm font-medium text-gray-700">{t('journalEntry.type')}</th>
                          <th className="text-left px-3 py-2 text-sm font-medium text-gray-700">{t('journalEntry.size')}</th>
                          <th className="text-left px-3 py-2 text-sm font-medium text-gray-700">{t('journalEntry.documentReference')}</th>
                          <th className="text-left px-3 py-2 text-sm font-medium text-gray-700">{t('journalEntry.linkedLine')}</th>
                          <th className="text-left px-3 py-2 text-sm font-medium text-gray-700">{t('journalEntry.comment')}</th>
                          <th className="text-center px-3 py-2 text-sm font-medium text-gray-700">{t('journalEntry.actions')}</th>
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
                                  { value: 'facture', label: t('journalEntry.docInvoice') },
                                  { value: 'bon_commande', label: t('journalEntry.docPurchaseOrder') },
                                  { value: 'bon_livraison', label: t('journalEntry.docDeliveryNote') },
                                  { value: 'autre', label: t('journalEntry.docOther') }
                                ]}
                                value={fichier.type}
                                onChange={(value) => {
                                  const newAttachements = [...attachements];
                                  newAttachements[index].type = value;
                                  setAttachements(newAttachements);
                                }}
                                placeholder={t('journalEntry.fileType')}
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
                                  { value: '', label: t('journalEntry.linePlaceholder') },
                                  ...lignesEcriture.map((ligne, idx) => ({
                                    value: `ligne_${idx}`,
                                    label: `${t('journalEntry.line')} ${idx + 1} - ${ligne.libelle || ligne.compte}`
                                  }))
                                ]}
                                value={fichier.ligneAssociee}
                                onChange={(value) => {
                                  const newAttachements = [...attachements];
                                  newAttachements[index].ligneAssociee = value;
                                  setAttachements(newAttachements);
                                }}
                                placeholder={t('journalEntry.linePlaceholder')}
                                searchPlaceholder={t('journalEntry.searchLine')}
                                clearable
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={fichier.commentaire}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                placeholder={t('journalEntry.originalInvoice')}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-center space-x-1">
                                <button className="p-1 text-gray-600 hover:bg-gray-100 rounded" aria-label={t('journalEntry.viewDetails')}>
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button className="p-1 text-red-600 hover:bg-red-50 rounded" aria-label={t('journalEntry.delete')}>
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
                        <span className="text-sm text-gray-600">{t('journalEntry.attachedFiles')}</span>
                        <p className="text-lg font-semibold">{attachements.length}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">{t('journalEntry.totalSize')}</span>
                        <p className="text-lg font-semibold text-orange-600">2.3 MB</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">{t('journalEntry.status')}</span>
                        <div className="flex items-center space-x-1 mt-1">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-semibold text-green-600">{t('journalEntry.compliant')}</span>
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
                  <span>{t('journalEntry.notesAndComments')}</span>
                </h3>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">
                      {t('journalEntry.specificNotes')} - {
                        transactionType === 'purchase' ? t('journalEntry.purchaseInvoice') :
                        transactionType === 'sale' ? t('journalEntry.salesInvoice') :
                        transactionType === 'payment' ? t('journalEntry.typePayment') :
                        transactionType === 'transfer' ? t('journalEntry.typeTransfer') :
                        t('journalEntry.typeOther')
                      }
                    </h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <FileText className="w-4 h-4 inline mr-1" />
                        {t('journalEntry.mandatoryNotes')} *
                      </label>
                      <textarea
                        value={notes.notesObligatoires}
                        onChange={(e) => setNotes({...notes, notesObligatoires: e.target.value})}
                        placeholder={
                          transactionType === 'purchase' ? t('journalEntry.mandatoryNotesPurchasePlaceholder') :
                          transactionType === 'sale' ? t('journalEntry.mandatoryNotesSalePlaceholder') :
                          transactionType === 'payment' ? t('journalEntry.mandatoryNotesPaymentPlaceholder') :
                          transactionType === 'transfer' ? t('journalEntry.mandatoryNotesTransferPlaceholder') :
                          t('journalEntry.mandatoryNotesOtherPlaceholder')
                        }
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">{t('journalEntry.generalComments')}</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <MessageSquare className="w-4 h-4 inline mr-1" />
                        {t('journalEntry.freeComments')}
                      </label>
                      <textarea
                        value={notes.commentairesGeneraux}
                        onChange={(e) => setNotes({...notes, commentairesGeneraux: e.target.value})}
                        placeholder={t('journalEntry.generalCommentsPlaceholder')}
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
                  <span>{t('journalEntry.validationAndChecks')}</span>
                  {validationErrors.length > 0 && (
                    <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                      {t('journalEntry.itemsToFix', { count: String(validationErrors.length) })}
                    </span>
                  )}
                </h3>

                {/* Erreurs de validation */}
                {validationErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-semibold text-red-800 mb-3 flex items-center space-x-2">
                      <AlertCircle className="w-5 h-5" />
                      <span>{t('journalEntry.missingOrIncorrectItems')}</span>
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
                      {t('journalEntry.fixBeforeValidating')}
                    </p>
                  </div>
                )}

                {/* Message de succès si tout est valide */}
                {validationErrors.length === 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 mb-2 flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5" />
                      <span>{t('journalEntry.entryReadyToValidate')}</span>
                    </h4>
                    <p className="text-sm text-green-700">
                      {t('journalEntry.allChecksPassed')}
                    </p>
                  </div>
                )}

                {/* Validation TVA */}
                {tvaValidation && (
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-blue-600" />
                      <span>{t('journalEntry.vatValidation')}</span>
                    </h4>

                    {tvaValidation.errors.length > 0 && (
                      <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="font-semibold text-red-700 mb-2">{t('journalEntry.vatErrors')}</p>
                        <ul className="list-disc list-inside space-y-1">
                          {tvaValidation.errors.map((error, i) => (
                            <li key={i} className="text-sm text-red-600">{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {tvaValidation.warnings.length > 0 && (
                      <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="font-semibold text-yellow-700 mb-2">{t('journalEntry.warnings')}</p>
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
                        <span className="text-green-700 font-medium">{t('journalEntry.vatValidationCompliant')}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="flex items-center justify-around mb-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">{t('journalEntry.totalDebit')}</p>
                      <p className="text-lg font-bold text-blue-600">{formatMontant(totalDebit)} XAF</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">{t('journalEntry.totalCredit')}</p>
                      <p className="text-lg font-bold text-blue-600">{formatMontant(totalCredit)} XAF</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">{t('journalEntry.balanceCheck')}</p>
                      {isEquilibree ? (
                        <div className="flex items-center justify-center space-x-2 text-green-600">
                          <CheckCircle className="w-6 h-6" />
                          <span className="text-lg font-bold">{t('journalEntry.balanced')}</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-2 text-red-600">
                          <AlertCircle className="w-6 h-6" />
                          <span className="text-lg font-bold">{t('journalEntry.unbalanced')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>{t('journalEntry.accountingEntriesPreview')}</span>
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
                              {ligne.compte ? fmtAccount(ligne.compte) : t('journalEntry.missingAccount')}
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
                          {t('journalEntry.accountingBalanceRespected')} {formatMontant(totalDebit)} XAF
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
                {t('journalEntry.cancel')}
              </button>
              <button className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                {t('journalEntry.draft')}
              </button>
            </div>

            {/* Indicateur de progression et raccourcis */}
            <div className="flex flex-col items-center space-y-1">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>{t('journalEntry.stepOf', { current: String(tabOrder.indexOf(activeTab) + 1), total: String(tabOrder.length) })}</span>
                {tabValidation[activeTab] && activeTab !== 'validation' && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center space-x-1 text-green-600"
                  >
                    <Check className="w-4 h-4" />
                    <span>{t('journalEntry.completed')}</span>
                  </motion.span>
                )}
              </div>
              <div className="flex items-center space-x-3 text-xs text-gray-400">
                <span className="flex items-center space-x-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-mono">Ctrl</kbd>
                  <span>+</span>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-mono">Tab</kbd>
                  <span>{t('journalEntry.next')}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-mono">Ctrl</kbd>
                  <span>+</span>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-mono">Shift</kbd>
                  <span>+</span>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-mono">Tab</kbd>
                  <span>{t('journalEntry.previous')}</span>
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
                  <span>{t('journalEntry.previous')}</span>
                </button>
              )}

              {/* Bouton Suivant ou Valider */}
              {isLocked ? (
                <span className="px-6 py-2 rounded-lg font-medium bg-gray-200 text-gray-500 flex items-center space-x-2 cursor-not-allowed">
                  <CheckCircle className="w-5 h-5" />
                  <span>{t('journalEntry.entryLocked')}</span>
                </span>
              ) : activeTab !== 'validation' ? (
                <button
                  onClick={goToNextTab}
                  className="px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 bg-blue-600 text-white hover:bg-blue-700"
                >
                  <span>{t('journalEntry.next')}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  disabled={validationErrors.length > 0 || isSaving}
                  onClick={handleSaveEntry}
                  className={`
                    px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2
                    ${validationErrors.length === 0
                      ? 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]'
                      : 'bg-gray-300 text-gray-700 cursor-not-allowed'
                    }
                  `}
                  title={validationErrors.length > 0 ? t('journalEntry.itemsToFix', { count: String(validationErrors.length) }) : t('journalEntry.validateAndPostTooltip')}
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>{isSaving ? t('journalEntry.saving') : t('journalEntry.validateAndPost')}</span>
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
                  <span>{t('journalEntry.lineNote')}</span>
                </h3>
                <button
                  onClick={cancelNote}
                  className="p-1 hover:bg-gray-100 rounded" aria-label={t('journalEntry.close')}>
                  <X className="w-5 h-5 text-gray-700" />
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('journalEntry.noteForLine', { line: currentNoteIndex !== null ? String(currentNoteIndex + 1) : '' })}
                </label>
                <textarea
                  value={tempNote}
                  onChange={(e) => setTempNote(e.target.value)}
                  placeholder={t('journalEntry.notePlaceholder')}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
                <p className="text-xs text-gray-700 mt-1">{t('journalEntry.noteOptional')}</p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelNote}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t('journalEntry.cancel')}
                </button>
                <button
                  onClick={saveNote}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t('journalEntry.save')}
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
      initialTemplateId={initialTemplateId}
    />
    </>
    )}
    <PostSaveAnalysisToast
      result={analysisResult}
      onClose={() => setAnalysisResult(null)}
    />
    </>
  );
};

export default JournalEntryModal;