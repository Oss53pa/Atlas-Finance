import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, Plus, Search, Filter, Download, Eye, Edit, Trash2, X,
  ArrowLeft, Phone, Mail, Calendar, Clock, AlertTriangle, AlertCircle,
  CheckCircle, XCircle, TrendingUp, Users, FileText, Building,
  BarChart3, PieChart, Activity, CreditCard, MessageSquare,
  Target, Award, RefreshCw, Send, Bell, ChevronDown, ChevronRight,
  MoreVertical, Settings, Banknote, Scale, UserCircle, Receipt,
  ScrollText, History, Percent, Upload, Share, Trash, Wallet,
  ArrowDown, ArrowRight, UserCheck, FolderOpen, Gavel, Briefcase, CheckSquare,
  FileSignature, Hammer, Coins, Archive, Lock, Calculator,
  ShoppingCart, Package, Link, Zap, Cloud, TrendingDown, LineChart as LineChartIcon,
  Building2, Paperclip, Reply, Forward, Shield
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart as RechartsPieChart, Pie, Cell, LineChart, Line, ResponsiveContainer,
  AreaChart, Area, ComposedChart
} from 'recharts';
import { DebtCollection, CollectionAction, InvoiceDebt } from '../../types/tiers';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LoadingSpinner } from '../../components/ui';
import { tiersService, createTransfertContentieuxSchema } from '../../services/modules/tiers.service';
import { z } from 'zod';
import { toast } from 'react-hot-toast';

interface CrmContact {
  nom: string;
  fonction: string;
  telephone: string;
  email: string;
}

interface CrmData {
  scoreRisque: number;
  categoriePaiement: string;
  chiffreAffairesAnnuel: number;
  ancienneteClient: string;
  contactPrincipal: CrmContact;
  derniereInteraction: string;
  typeInteraction: string;
}

interface CommercialData {
  conditionsParticulieres: {
    delaiPaiement: string;
    remiseAccordee: string;
    plafondCredit: number;
  };
  gestionnaireCom: string;
  secteurActivite: string;
  litigesActifs: number;
}

interface CreanceEnrichie extends DebtCollection {
  clientNom: string;
  clientCode: string;
  crmData?: CrmData;
  commercialData?: CommercialData;
}

interface PlanRemboursement {
  reference: string;
  client: string;
  montantTotal: number;
  mensualite: number;
  echeancesPayees: number | string;
  progression: number;
  prochaineEcheance: string;
  statut: string;
  montantPaye: number;
  montantRestant: number;
}

interface ContentieuxDepense {
  id: number;
  type: string;
  date: string;
  montant: number;
  destinataire: string;
  reference: string;
  notes: string;
}

interface SuiviEtape {
  id: number;
  type: string;
  date: string;
  heure: string;
  intervenant: string;
  roleIntervenant: string;
  contact: string;
  resultat: string;
  notes: string;
  prochainRdv: string;
  documentsJoints: string;
  createdAt?: string;
}

interface ContentieuxFormData {
  id: string;
  numeroRef?: string;
  client?: string;
  statutJuridique: string;
  typeProcedure: string;
  avocat: string;
  avocatTel: string;
  avocatEmail: string;
  huissier: string;
  huissierTel: string;
  huissierEmail: string;
  tribunal: string;
  tribunalAdresse: string;
  numeroRG: string;
  chambre: string;
  dateTransfert: string;
  dateMiseEnDemeure: string;
  dateAssignation: string;
  dateAudience: string;
  dateTitreExecutoire: string;
  dateExecution: string;
  provision: number;
  debiteurAdresse: string;
  debiteurTel: string;
  debiteurEmail?: string;
  debiteurRepresentant?: string;
  motifTransfert?: string;
  resultatAttendu?: string;
  risques?: string;
  chancesSucces?: string;
  prochaineEcheance?: string;
  priorite?: string;
  notes?: string;
  dernierContact?: string;
  prochainContact?: string;
  [key: string]: unknown;
}

interface DossierContentieux {
  id: string;
  numeroRef: string;
  client: string;
  montantPrincipal: number;
  interetsRetard?: number;
  fraisProcedure?: number;
  honorairesAvocat?: number;
  montantTotal: number;
  statutJuridique?: string;
  typeProcedure?: string;
  avocat?: string;
  avocatTel?: string;
  avocatEmail?: string;
  huissier?: string;
  huissierTel?: string;
  huissierEmail?: string;
  tribunal?: string;
  tribunalAdresse?: string;
  numeroRG?: string;
  chambre?: string;
  dateTransfert?: string;
  dateMiseEnDemeure?: string;
  dateAssignation?: string;
  dateAudience?: string;
  dateTitreExecutoire?: string;
  dateExecution?: string;
  provision?: number;
  debiteurAdresse?: string;
  debiteurTel?: string;
  debiteurEmail?: string;
  debiteurRepresentant?: string;
  motifTransfert?: string;
  resultatAttendu?: string;
  risques?: string;
  chancesSucces?: string;
  prochaineEcheance?: string;
  priorite?: string;
  notes?: string;
  dernierContact?: string;
  prochainContact?: string;
  [key: string]: unknown;
}

interface DossierWorkflow {
  id: string;
  numeroRef: string;
  client: string;
  [key: string]: unknown;
}

interface WorkflowEtape {
  id: number;
  code: string;
  titre: string;
  description: string;
  [key: string]: unknown;
}

type ActionTypeRecouvrement = 'APPEL' | 'EMAIL' | 'COURRIER' | 'SMS' | 'VISITE' | 'MISE_EN_DEMEURE' | 'PROCEDURE_JUDICIAIRE';

interface DossierRecouvrement {
  id: string;
  numeroRef: string;
  client: string;
  montantPrincipal: number;
  interets: number;
  frais: number;
  montantTotal: number;
  montantPaye: number;
  nombreFactures: number;
  dsoMoyen: number;
  dateOuverture: string;
  statut: 'actif' | 'suspendu' | 'cloture' | 'juridique';
  typeRecouvrement: 'amiable' | 'judiciaire' | 'huissier';
  responsable: string;
  derniereAction: string;
  dateAction: string;
  typeAction: ActionTypeRecouvrement;
  prochainEtape: string;
}

const RecouvrementModule: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('creances');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('tous');
  const [filterNiveau, setFilterNiveau] = useState('tous');
  const [selectedCreance, setSelectedCreance] = useState<CreanceEnrichie | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionFormData, setActionFormData] = useState({
    typeAction: 'APPEL' as 'APPEL' | 'EMAIL' | 'COURRIER' | 'SMS' | 'VISITE' | 'MISE_EN_DEMEURE',
    date: new Date().toISOString().split('T')[0],
    heure: new Date().toTimeString().slice(0, 5),
    responsable: '',
    details: '',
    montantPromis: '',
    datePromesse: ''
  });
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [selectedFactures, setSelectedFactures] = useState<Set<string>>(new Set());

  // États pour les modales de rapports
  const [showRapportMensuelModal, setShowRapportMensuelModal] = useState(false);
  const [showAnalyseROIModal, setShowAnalyseROIModal] = useState(false);
  const [showPerformanceEquipeModal, setShowPerformanceEquipeModal] = useState(false);
  const [showPrevisionTresorerieModal, setShowPrevisionTresorerieModal] = useState(false);
  const [showDossiersRisqueModal, setShowDossiersRisqueModal] = useState(false);
  const [showExportPersonnaliseModal, setShowExportPersonnaliseModal] = useState(false);

  // États pour les modales des plans de remboursement
  const [showPlanDetailModal, setShowPlanDetailModal] = useState(false);
  const [showEnregistrerPaiementModal, setShowEnregistrerPaiementModal] = useState(false);
  const [showRelancePlanModal, setShowRelancePlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanRemboursement | null>(null);
  const [showCreateDossierModal, setShowCreateDossierModal] = useState(false);
  const [showDossierActionModal, setShowDossierActionModal] = useState(false);
  const [selectedDossierAction, setSelectedDossierAction] = useState<DossierRecouvrement | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [showDossierDetail, setShowDossierDetail] = useState(false);
  const [selectedDossierDetail, setSelectedDossierDetail] = useState<DossierRecouvrement | null>(null);
  const [showDossierSummary, setShowDossierSummary] = useState(false);
  const [selectedDossierSummary, setSelectedDossierSummary] = useState<DossierRecouvrement | null>(null);
  const [activeDossierTab, setActiveDossierTab] = useState('dashboard');
  const [activeRelanceSubTab, setActiveRelanceSubTab] = useState('historique');
  const [activeParametresTab, setActiveParametresTab] = useState('configuration');
  const [selectedTemplateType, setSelectedTemplateType] = useState('rappel_amical');
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedTransferDossier, setSelectedTransferDossier] = useState<DossierRecouvrement | null>(null);
  const [transferDetails, setTransferDetails] = useState({
    destinataire: '',
    motif: '',
    notes: '',
    validationStatus: 'pending' as 'pending' | 'approved' | 'rejected'
  });
  const [emailTemplates, setEmailTemplates] = useState({
    rappel_amical: `Objet: Rappel de paiement - {invoice_list}

Madame, Monsieur {client_name},

Nous vous rappelons que les factures suivantes restent impayées:
{invoice_details}

Montant total dû: {total_amount} FCFA

Il s'agit probablement d'un oubli de votre part. Nous vous remercions de bien vouloir régulariser cette situation dans les plus brefs délais.

Si le règlement a été effectué entre-temps, nous vous prions de ne pas tenir compte de ce message.

Cordialement,
{company_name}`,
    relance_ferme: `Objet: 2ème Relance - {invoice_count} factures impayées

Madame, Monsieur {client_name},

Malgré notre précédent rappel, nous constatons que les factures suivantes restent impayées:
{invoice_details}

Montant total: {total_amount} FCFA
Retard moyen: {avg_days_overdue} jours

Nous vous demandons de procéder au règlement sous 48 heures.

Sans réponse de votre part, nous serons contraints d'engager des procédures de recouvrement.

Service Comptabilité
{company_name}`,
    dernier_avis: `Objet: DERNIER AVIS avant procédure - {invoice_count} factures

Madame, Monsieur {client_name},

DERNIER AVIS AVANT ENGAGEMENT DE POURSUITES

Malgré nos multiples relances, les factures suivantes demeurent impayées:
{invoice_details}

TOTAL DÛ: {total_amount} FCFA

Sans règlement sous 72 heures, votre dossier sera transmis à notre service contentieux.

Ceci est notre dernier avis amiable.

Direction Financière
{company_name}`,
    mise_demeure: `Objet: MISE EN DEMEURE - Créances impayées

LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

Madame, Monsieur {client_name},

MISE EN DEMEURE

Par la présente, nous vous mettons en demeure de régler sous HUIT (8) jours:

{invoice_details}

MONTANT PRINCIPAL: {total_amount} FCFA
INTÉRÊTS DE RETARD: {interest_amount} FCFA
FRAIS DE RELANCE: {fees_amount} FCFA
TOTAL À RÉGLER: {grand_total} FCFA

À défaut de règlement dans ce délai, nous engagerons toute procédure judiciaire utile.

{company_name}
Service Juridique`,
    pre_contentieux: `Objet: TRANSMISSION AU CONTENTIEUX - Dossier {client_code}

Madame, Monsieur {client_name},

Votre dossier a été transmis à notre service contentieux.

Créances en souffrance:
{invoice_details}

- Montant principal: {total_amount} FCFA
- Intérêts de retard: {interest_amount} FCFA
- Frais de relance: {fees_amount} FCFA
- TOTAL: {grand_total} FCFA

Une procédure judiciaire sera engagée sous 48 heures.

Pour éviter ces poursuites, contactez immédiatement:
Tel: +242 06 XXX XX XX
Email: contentieux@{company_domain}

Service Contentieux
{company_name}`
  });
  const [smsTemplates, setSmsTemplates] = useState({
    rappel_amical: `Rappel: {invoice_count} factures de {total_amount} FCFA en retard. Merci de régulariser.`,
    relance_ferme: `2e RAPPEL: {invoice_count} factures impayées, total {total_amount} FCFA. Règlement sous 48h. {company_name}`,
    dernier_avis: `DERNIER AVIS: {invoice_count} factures. Sans règlement sous 72h, procédure contentieux. {company_name}`,
    mise_demeure: `MISE EN DEMEURE: Règlement {grand_total} FCFA sous 8 jours. Procédure judiciaire sinon. {company_name}`,
    pre_contentieux: `CONTENTIEUX: Dossier transmis service juridique. Total {grand_total} FCFA. Contact urgent: +242 06 XXX XX XX`
  });
  const [multipleInvoices, setMultipleInvoices] = useState(false);

  // Onglets de la page de modification du dossier
  const dossierTabs = [
    { id: 'dashboard', label: t('dashboard.title'), icon: BarChart3 },
    { id: 'client', label: 'Client', icon: UserCircle },
    { id: 'creances', label: 'Créances', icon: Receipt },
    { id: 'contract', label: 'Contract', icon: ScrollText },
    { id: 'reminders', label: 'Reminders history', icon: Bell },
    { id: 'payments', label: 'Payments history', icon: CreditCard },
    { id: 'interest', label: 'Interest and penalties', icon: Percent },
    { id: 'repayment', label: 'Repayment plan', icon: Banknote },
    { id: 'actions', label: 'Historique des actions', icon: History },
    { id: 'attachments', label: 'Attachments', icon: FileText }
  ];

  // Fermer le dropdown quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId && !(event.target as Element).closest('.relative')) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openDropdownId]);

  // --- Dexie live queries for customer third parties and journal entries ---
  const customerThirdParties = useLiveQuery(
    () => db.thirdParties.where('type').anyOf('customer', 'both').toArray()
  ) || [];
  const allJournalEntries = useLiveQuery(() => db.journalEntries.toArray()) || [];

  // Build receivables per customer from 411xxx journal lines
  const mockCreances = useMemo(() => {
    const today = new Date();
    // Group debit lines on 411xxx accounts by thirdPartyCode
    const byClient: Record<string, {
      totalDebit: number;
      totalCredit: number;
      lines: Array<{
        entryId: string;
        reference: string;
        date: string;
        debit: number;
        credit: number;
        label: string;
        thirdPartyName: string;
        thirdPartyCode: string;
      }>;
    }> = {};

    for (const entry of allJournalEntries) {
      for (const line of entry.lines) {
        if (!line.accountCode.startsWith('411')) continue;
        const code = line.thirdPartyCode || line.accountCode;
        if (!byClient[code]) {
          byClient[code] = { totalDebit: 0, totalCredit: 0, lines: [] };
        }
        byClient[code].totalDebit += line.debit;
        byClient[code].totalCredit += line.credit;
        byClient[code].lines.push({
          entryId: entry.id,
          reference: entry.reference || entry.entryNumber,
          date: entry.date,
          debit: line.debit,
          credit: line.credit,
          label: line.label || entry.label,
          thirdPartyName: line.thirdPartyName || '',
          thirdPartyCode: code,
        });
      }
    }

    // Build CreanceEnrichie[] from the grouped data
    return Object.entries(byClient)
      .map(([code, data], idx) => {
        const solde = data.totalDebit - data.totalCredit;
        if (solde <= 0) return null; // No outstanding receivable

        // Lookup the third party for enrichment
        const tp = customerThirdParties.find(t => t.code === code);
        const clientName = tp?.name || data.lines[0]?.thirdPartyName || code;

        // Build invoice-like factures from debit lines
        const factures = data.lines
          .filter(l => l.debit > 0)
          .map((l, fIdx) => {
            const entryDate = new Date(l.date);
            const echeance = new Date(entryDate);
            echeance.setDate(echeance.getDate() + 30);
            const joursRetard = Math.floor((today.getTime() - echeance.getTime()) / (1000 * 60 * 60 * 24));
            return {
              factureId: `${l.entryId}-${fIdx}`,
              numero: l.reference,
              date: l.date,
              dateEcheance: echeance.toISOString().slice(0, 10),
              montantOriginal: l.debit,
              montantRestant: l.debit, // simplified: full amount outstanding
              joursRetard,
            };
          });

        const maxRetard = Math.max(0, ...factures.map(f => f.joursRetard));
        let niveauRelance: string = 'AUCUNE';
        if (maxRetard > 90) niveauRelance = 'CONTENTIEUX';
        else if (maxRetard > 60) niveauRelance = 'RELANCE_3';
        else if (maxRetard > 30) niveauRelance = 'RELANCE_2';
        else if (maxRetard > 0) niveauRelance = 'RELANCE_1';

        return {
          id: String(idx + 1),
          clientId: code,
          clientNom: clientName,
          clientCode: code,
          factures,
          montantTotal: solde,
          joursRetard: maxRetard,
          niveauRelance,
          derniereRelance: null as string | null,
          prochaineRelance: null as string | null,
          relances: [] as Array<{
            id: string;
            type: string;
            date: string;
            description: string;
            moyenCommunication: string;
            responsable: string;
            resultat: string;
          }>,
          statut: maxRetard > 0 ? 'EN_COURS' : 'RESOLU',
          assigneA: '',
          commentaires: '',
        };
      })
      .filter(Boolean) as Array<{
        id: string;
        clientId: string;
        clientNom: string;
        clientCode: string;
        factures: Array<{
          factureId: string;
          numero: string;
          date: string;
          dateEcheance: string;
          montantOriginal: number;
          montantRestant: number;
          joursRetard: number;
        }>;
        montantTotal: number;
        joursRetard: number;
        niveauRelance: string;
        derniereRelance: string | null;
        prochaineRelance: string | null;
        relances: Array<{
          id: string;
          type: string;
          date: string;
          description: string;
          moyenCommunication: string;
          responsable: string;
          resultat: string;
        }>;
        statut: string;
        assigneA: string;
        commentaires: string;
      }>;
  }, [allJournalEntries, customerThirdParties]);

  // Build recovery dossiers from customers with outstanding balances
  const mockDossiers: DossierRecouvrement[] = useMemo(() => {
    return mockCreances
      .filter(c => c.montantTotal > 0)
      .map((c, idx) => ({
        id: String(idx + 1),
        numeroRef: `REC-${new Date().getFullYear()}-${String(idx + 1).padStart(3, '0')}`,
        client: c.clientNom,
        montantPrincipal: c.montantTotal,
        interets: Math.round(c.montantTotal * 0.05),
        frais: Math.round(c.montantTotal * 0.02),
        montantTotal: Math.round(c.montantTotal * 1.07),
        montantPaye: 0,
        nombreFactures: c.factures.length,
        dsoMoyen: c.joursRetard,
        dateOuverture: c.factures[0]?.date || new Date().toISOString().slice(0, 10),
        statut: (c.joursRetard > 90 ? 'juridique' : c.joursRetard > 0 ? 'actif' : 'cloture') as 'actif' | 'suspendu' | 'cloture' | 'juridique',
        typeRecouvrement: (c.joursRetard > 90 ? 'judiciaire' : 'amiable') as 'amiable' | 'judiciaire' | 'huissier',
        responsable: '',
        derniereAction: '',
        dateAction: new Date().toISOString().slice(0, 10),
        typeAction: 'EMAIL' as ActionTypeRecouvrement,
        prochainEtape: '',
      }));
  }, [mockCreances]);

  const tabs = [
    { id: 'creances', label: 'Créances', icon: DollarSign },
    { id: 'dossiers', label: 'Dossiers en Recouvrement', icon: FileText },
    { id: 'relances', label: 'Relances', icon: Bell },
    { id: 'repaymentplan', label: 'Plans de Remboursement', icon: Calendar },
    { id: 'contentieux', label: 'Contentieux', icon: AlertTriangle },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  const statutOptions = [
    { value: 'tous', label: 'Tous les statuts' },
    { value: 'EN_COURS', label: t('status.inProgress') },
    { value: 'RESOLU', label: 'Résolu' },
    { value: 'CONTENTIEUX', label: 'Contentieux' },
    { value: 'IRRECUPERABLE', label: 'Irrécupérable' }
  ];

  const niveauOptions = [
    { value: 'tous', label: 'Tous les niveaux' },
    { value: 'AUCUNE', label: 'Aucune relance' },
    { value: 'RELANCE_1', label: 'Relance 1' },
    { value: 'RELANCE_2', label: 'Relance 2' },
    { value: 'RELANCE_3', label: 'Relance 3' },
    { value: 'MISE_EN_DEMEURE', label: 'Mise en demeure' },
    { value: 'CONTENTIEUX', label: 'Contentieux' }
  ];

  const getStatutColor = (statut: string) => {
    const colors = {
      'EN_COURS': 'bg-[#171717]/10 text-[#171717]',
      'RESOLU': 'bg-green-100 text-green-800',
      'CONTENTIEUX': 'bg-red-100 text-red-800',
      'IRRECUPERABLE': 'bg-gray-100 text-gray-800',
      'actif': 'bg-blue-100 text-blue-800',
      'suspendu': 'bg-orange-100 text-orange-800',
      'cloture': 'bg-gray-100 text-gray-800',
      'juridique': 'bg-purple-100 text-purple-800'
    };
    return colors[statut as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatutLabel = (statut: string) => {
    const labels = {
      'actif': 'Actif',
      'suspendu': 'Suspendu',
      'cloture': 'Clôturé',
      'juridique': 'Juridique',
      'EN_COURS': 'En cours',
      'RESOLU': 'Résolu',
      'CONTENTIEUX': 'Contentieux',
      'IRRECUPERABLE': 'Irrécupérable'
    };
    return labels[statut as keyof typeof labels] || statut;
  };

  const getNiveauColor = (niveau: string) => {
    const colors = {
      'AUCUNE': 'bg-gray-100 text-gray-800',
      'RELANCE_1': 'bg-yellow-100 text-yellow-800',
      'RELANCE_2': 'bg-orange-100 text-orange-800',
      'RELANCE_3': 'bg-red-100 text-red-800',
      'MISE_EN_DEMEURE': 'bg-[#525252]/10 text-[#525252]',
      'CONTENTIEUX': 'bg-red-200 text-red-900'
    };
    return colors[niveau as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getUrgenceColor = (joursRetard: number) => {
    if (joursRetard <= 0) return 'text-green-600';
    if (joursRetard <= 15) return 'text-yellow-600';
    if (joursRetard <= 30) return 'text-orange-600';
    return 'text-red-600';
  };

  const getActionIcon = (type: string) => {
    const icons = {
      'APPEL': Phone,
      'EMAIL': Mail,
      'COURRIER': FileText,
      'SMS': MessageSquare,
      'VISITE': Users,
      'MISE_EN_DEMEURE': AlertTriangle,
      'PROCEDURE_JUDICIAIRE': Award
    };
    return icons[type as keyof typeof icons] || MessageSquare;
  };



  const toggleClientExpansion = (clientId: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
    }
    setExpandedClients(newExpanded);
  };

  const toggleFactureSelection = (factureId: string) => {
    const newSelected = new Set(selectedFactures);
    if (newSelected.has(factureId)) {
      newSelected.delete(factureId);
    } else {
      newSelected.add(factureId);
    }
    setSelectedFactures(newSelected);
  };

  const createDossierRecouvrement = () => {
    if (selectedFactures.size === 0) {
      toast.error('Veuillez sélectionner au moins une facture');
      return;
    }
    setShowCreateDossierModal(true);
  };

  const toggleDropdown = (dossierId: string) => {
    setOpenDropdownId(openDropdownId === dossierId ? null : dossierId);
  };

  const handleDossierAction = (action: string, dossier: DossierRecouvrement) => {
    setOpenDropdownId(null);

    switch (action) {
      case 'details':
        toast.info(`Affichage des détails pour ${dossier.numeroRef}`);
        break;
      case 'relance':
        toast.success(`Relance envoyée pour ${dossier.client}`);
        break;
      case 'plan':
        toast.info(`Plan de règlement proposé pour ${dossier.client}`);
        break;
      case 'regle':
        toast.success(`Dossier ${dossier.numeroRef} marqué comme réglé`);
        break;
      case 'contentieux':
        toast.warning(`Dossier ${dossier.client} envoyé en pré-contentieux`);
        break;
      case 'transfert':
        setSelectedTransferDossier(dossier);
        setShowTransferModal(true);
        setTransferDetails({
          destinataire: '',
          motif: '',
          notes: '',
          validationStatus: 'pending'
        });
        break;
      case 'supprimer':
        if (confirm(`Êtes-vous sûr de vouloir supprimer le dossier ${dossier.numeroRef} ?`)) {
          toast.success(`Dossier ${dossier.numeroRef} supprimé`);
        }
        break;
    }
  };

  const filteredCreances = mockCreances.filter(creance => {
    const matchSearch = creance.clientNom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       creance.clientCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatut = filterStatut === 'tous' || creance.statut === filterStatut;
    const matchNiveau = filterNiveau === 'tous' || creance.niveauRelance === filterNiveau;
    return matchSearch && matchStatut && matchNiveau;
  });

  // Analytics computed from real receivables data
  const analyticsData = useMemo(() => {
    const montantTotalCreances = mockCreances.reduce((sum, c) => sum + c.montantTotal, 0);
    const creancesEnRetard = mockCreances.filter(c => c.joursRetard > 0).length;
    const totalJoursRetard = mockCreances.reduce((sum, c) => sum + c.joursRetard, 0);
    const delaiMoyen = mockCreances.length > 0 ? Math.round(totalJoursRetard / mockCreances.length) : 0;

    // Compute credit totals from 411xxx lines for recovered amounts
    let montantRecouvre = 0;
    for (const entry of allJournalEntries) {
      for (const line of entry.lines) {
        if (line.accountCode.startsWith('411') && line.credit > 0) {
          montantRecouvre += line.credit;
        }
      }
    }
    const tauxRecouvrement = (montantTotalCreances + montantRecouvre) > 0
      ? Math.round((montantRecouvre / (montantTotalCreances + montantRecouvre)) * 1000) / 10
      : 0;

    // Repartition by niveau from real data
    const niveauMap: Record<string, { count: number; montant: number }> = {
      'Aucune relance': { count: 0, montant: 0 },
      'Relance 1': { count: 0, montant: 0 },
      'Relance 2': { count: 0, montant: 0 },
      'Relance 3': { count: 0, montant: 0 },
      'Contentieux': { count: 0, montant: 0 },
    };
    const niveauLabels: Record<string, string> = {
      'AUCUNE': 'Aucune relance',
      'RELANCE_1': 'Relance 1',
      'RELANCE_2': 'Relance 2',
      'RELANCE_3': 'Relance 3',
      'CONTENTIEUX': 'Contentieux',
    };
    for (const c of mockCreances) {
      const label = niveauLabels[c.niveauRelance] || 'Aucune relance';
      if (niveauMap[label]) {
        niveauMap[label].count++;
        niveauMap[label].montant += c.montantTotal;
      }
    }

    // Aging buckets from real data
    const agingBuckets = [
      { periode: '0-30 jours', nombre: 0, montant: 0 },
      { periode: '31-60 jours', nombre: 0, montant: 0 },
      { periode: '61-90 jours', nombre: 0, montant: 0 },
      { periode: '+90 jours', nombre: 0, montant: 0 },
    ];
    for (const c of mockCreances) {
      const bucket = c.joursRetard <= 30 ? 0 : c.joursRetard <= 60 ? 1 : c.joursRetard <= 90 ? 2 : 3;
      agingBuckets[bucket].nombre++;
      agingBuckets[bucket].montant += c.montantTotal;
    }

    // Monthly evolution from journal entries (group 411xxx by month)
    const monthlyData: Record<string, { creances: number; recouvre: number }> = {};
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    for (const entry of allJournalEntries) {
      for (const line of entry.lines) {
        if (!line.accountCode.startsWith('411')) continue;
        const m = parseInt(entry.date.slice(5, 7), 10) - 1;
        const monthKey = monthNames[m] || 'N/A';
        if (!monthlyData[monthKey]) monthlyData[monthKey] = { creances: 0, recouvre: 0 };
        monthlyData[monthKey].creances += line.debit;
        monthlyData[monthKey].recouvre += line.credit;
      }
    }
    const evolutionRecouvrement = Object.entries(monthlyData).map(([mois, d]) => ({
      mois,
      recouvre: d.recouvre,
      creances: d.creances,
    }));

    return {
      statistiques: {
        montantTotalCreances,
        montantRecouvre,
        tauxRecouvrement,
        nombreCreances: mockCreances.length,
        delaiMoyenRecouvrement: delaiMoyen,
        creancesEnRetard,
      },
      evolutionRecouvrement,
      repartitionNiveaux: Object.entries(niveauMap).map(([niveau, d]) => ({
        niveau,
        count: d.count,
        montant: d.montant,
      })),
      anciennete: agingBuckets,
    };
  }, [mockCreances, allJournalEntries]);

  // Données d'intégration Atlas Finance - Flux entrants (derived from Dexie)
  const integrationData = useMemo(() => {
    const today = new Date();
    // Build unpaid invoices from 411xxx debit lines
    const facturesImpayees = mockCreances.flatMap(c =>
      c.factures
        .filter(f => f.montantRestant > 0)
        .map(f => ({
          id: f.factureId,
          client: c.clientNom,
          montant: f.montantRestant,
          dateEcheance: f.dateEcheance,
          jourRetard: f.joursRetard > 0 ? f.joursRetard : 0,
          origine: 'Comptabilité',
        }))
    );

    // Build credit notes from 411xxx credit lines
    const avoirsNoteCredit: Array<{ id: string; client: string; montant: number; motif: string; statut: string }> = [];
    for (const entry of allJournalEntries) {
      for (const line of entry.lines) {
        if (line.accountCode.startsWith('411') && line.credit > 0 && entry.label.toLowerCase().includes('avoir')) {
          avoirsNoteCredit.push({
            id: entry.entryNumber,
            client: line.thirdPartyName || line.accountCode,
            montant: line.credit,
            motif: entry.label,
            statut: 'Validé',
          });
        }
      }
    }

    return {
      comptabilite: {
        facturesImpayees,
        avoirsNoteCredit,
        reglementsPartiels: [] as Array<{ factureId: string; montant: number; date: string; mode: string; reste: number }>,
      },
      crm: { donneesClient: [] as Array<{ clientId: string; nom: string; scoring: string; risqueClient: string; chiffreAffaires: number; anciennete: number; secteur: string; contacts: Array<{ nom: string; fonction: string; tel: string; email: string }>; historiqueRelationnel: Array<{ date: string; type: string; contact: string; sujet: string }> }> },
      commercial: {
        conditionsParticulieres: [] as Array<{ clientId: string; conditionPaiement: string; remiseAccordee: number; plafondCredit: number }>,
        litigesCommerciaux: [] as Array<{ clientId: string; sujet: string; statut: string; impact: string; montant: number }>,
        contratsSpecifiques: [] as Array<{ clientId: string; typeContrat: string; duree: string; clausesPaiement: string }>,
      },
      achats: {
        litigesFournisseurs: [] as Array<{ fournisseur: string; montant: number; sujet: string; statut: string }>,
        compensations: [] as Array<{ client: string; montantClient: number; montantFournisseur: number; solde: number }>,
      },
    };
  }, [mockCreances, allJournalEntries]);

  // Integration status derived from Dexie data counts
  const statutIntegrations = useMemo(() => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    return [
      { module: 'Comptabilité', statut: 'Connecté', dernierSync: now, nbTransactions: allJournalEntries.length },
      { module: 'CRM', statut: 'Connecté', dernierSync: now, nbTransactions: customerThirdParties.length },
      { module: 'Commercial', statut: 'Connecté', dernierSync: now, nbTransactions: 0 },
      { module: 'Finance', statut: 'Connecté', dernierSync: now, nbTransactions: 0 },
      { module: 'Achats', statut: 'Connecté', dernierSync: now, nbTransactions: 0 },
      { module: 'Reporting', statut: 'Connecté', dernierSync: now, nbTransactions: 0 },
    ];
  }, [allJournalEntries.length, customerThirdParties.length]);

  // Workflow validation rules (configuration constants)
  const workflowValidation = {
    matriceApprobation: [
      { montantMin: 0, montantMax: 100000, approbateur: 'Agent Recouvrement', delaiMax: '24h' },
      { montantMin: 100001, montantMax: 500000, approbateur: 'Superviseur Recouvrement', delaiMax: '48h' },
      { montantMin: 500001, montantMax: 2000000, approbateur: 'Manager Crédit', delaiMax: '72h' },
      { montantMin: 2000001, montantMax: 999999999, approbateur: 'Directeur Financier', delaiMax: '5 jours' }
    ],
    enCoursValidation: [] as Array<{ dossier: string; montant: number; demandeur: string; approbateur: string; statut: string; depuis: string }>,
  };

  // Notifications derived from overdue receivables
  const notificationsEnCours = useMemo(() => {
    return mockCreances
      .filter(c => c.joursRetard > 0)
      .slice(0, 5)
      .map((c, idx) => ({
        type: idx % 2 === 0 ? 'Email' : 'Dashboard',
        destinataire: c.assigneA || 'Non assigné',
        sujet: `Relance ${c.clientNom} - ${formatCurrency(c.montantTotal)}`,
        alerte: `Créance en retard de ${c.joursRetard} jours`,
        message: `Relance: ${c.clientNom}`,
        statut: 'En attente',
        heure: new Date().toTimeString().slice(0, 5),
      }));
  }, [mockCreances]);

  // Composant Analytics Tab avec sous-onglets
  const AnalyticsTab = () => {
    const [analyticsView, setAnalyticsView] = useState('dashboard');

    const analyticsSubTabs = [
      { id: 'dashboard', label: 'Vue d\'ensemble', icon: BarChart3 },
      { id: 'performance', label: 'Performance', icon: TrendingUp },
      { id: 'repartition', label: 'Répartition', icon: PieChart },
      { id: 'tendances', label: 'Tendances', icon: Activity },
      { id: 'comparaison', label: 'Comparaison', icon: LineChartIcon },
      { id: 'previsions', label: 'Prévisions', icon: Calculator }
    ];

    function renderAnalyticsContent() {
      switch (analyticsView) {
        case 'dashboard':
          return (
            <div className="space-y-6">
              {/* KPIs principaux avec intégrations temps réel */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#525252]">Créances Totales</p>
                      <p className="text-lg font-bold text-[#171717]">
                        {formatCurrency(analyticsData.statistiques.montantTotalCreances)}
                      </p>
                      <p className="text-xs text-[#525252] mt-1">{analyticsData.statistiques.nombreCreances} dossiers</p>
                      <div className="flex items-center mt-2 text-xs text-blue-600">
                        <Link className="w-3 h-3 mr-1" />
                        <span>Comptabilité sync</span>
                      </div>
                    </div>
                    <DollarSign className="w-8 h-8 text-red-600" />
                  </div>
                </div>
                <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#525252]">Recouvré ce mois</p>
                      <p className="text-lg font-bold text-[#171717]">
                        {formatCurrency(analyticsData.statistiques.montantRecouvre)}
                      </p>
                      <p className="text-xs text-green-600 mt-1">↑ +12% vs mois précédent</p>
                      <div className="flex items-center mt-2 text-xs text-green-600">
                        <Zap className="w-3 h-3 mr-1" />
                        <span>Temps réel</span>
                      </div>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </div>
                <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#525252]">Taux de succès</p>
                      <p className="text-lg font-bold text-[#171717]">
                        {analyticsData.statistiques.tauxRecouvrement}%
                      </p>
                      <p className="text-xs text-blue-600 mt-1">Objectif: 85%</p>
                      <div className="flex items-center mt-2 text-xs text-purple-600">
                        <Cloud className="w-3 h-3 mr-1" />
                        <span>IA enrichie</span>
                      </div>
                    </div>
                    <TrendingUp className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#525252]">Délai moyen</p>
                      <p className="text-lg font-bold text-[#171717]">
                        {analyticsData.statistiques.delaiMoyenRecouvrement}j
                      </p>
                      <p className="text-xs text-orange-600 mt-1">{analyticsData.statistiques.creancesEnRetard} en retard</p>
                      <div className="flex items-center mt-2 text-xs text-blue-600">
                        <Calculator className="w-3 h-3 mr-1" />
                        <span>CRM scoring</span>
                      </div>
                    </div>
                    <Clock className="w-8 h-8 text-orange-600" />
                  </div>
                </div>
              </div>

              {/* Panel des intégrations en temps réel */}
              <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[#171717]">Flux de Données Atlas Finance</h3>
                  <div className="flex items-center space-x-2 text-sm text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Synchronisation active</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-800">{t('accounting.title')}</p>
                        <p className="text-xs text-blue-600">156 factures sync</p>
                        <p className="text-xs text-blue-600">23 nouveaux impayés</p>
                      </div>
                      <Calculator className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-800">CRM</p>
                        <p className="text-xs text-green-600">89 clients enrichis</p>
                        <p className="text-xs text-green-600">Score risque mis à jour</p>
                      </div>
                      <Users className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-800">Commercial</p>
                        <p className="text-xs text-purple-600">23 conditions part.</p>
                        <p className="text-xs text-purple-600">7 litiges actifs</p>
                      </div>
                      <ShoppingCart className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-orange-800">Finance</p>
                        <p className="text-xs text-orange-600">Budgets à jour</p>
                        <p className="text-xs text-orange-600">Provisions calculées</p>
                      </div>
                      <Package className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Graphiques principaux */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Évolution mensuelle */}
                <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                  <h3 className="text-lg font-semibold text-[#171717] mb-4">Évolution du Recouvrement</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={analyticsData.evolutionRecouvrement}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mois" />
                      <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Area type="monotone" dataKey="creances" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} name="Créances" />
                      <Area type="monotone" dataKey="recouvre" stackId="2" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} name="Recouvré" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Répartition par niveau */}
                <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                  <h3 className="text-lg font-semibold text-[#171717] mb-4">Répartition par Niveau</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        dataKey="montant"
                        data={analyticsData.repartitionNiveaux}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#737373"
                        label={({ niveau, count }) => `${niveau} (${count})`}
                      >
                        {analyticsData.repartitionNiveaux.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Tableau de bord activités récentes */}
              <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                <h3 className="text-lg font-semibold text-[#171717] mb-4">Activités du jour</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-800">Nouvelles créances</p>
                        <p className="text-lg font-bold text-blue-900">8</p>
                      </div>
                      <Plus className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-800">Recouvrements réalisés</p>
                        <p className="text-lg font-bold text-green-900">12</p>
                      </div>
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-orange-800">Actions en attente</p>
                        <p className="text-lg font-bold text-orange-900">5</p>
                      </div>
                      <Clock className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );

        case 'performance':
          return (
            <div className="space-y-6">
              {/* Performance par agent */}
              <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                <h3 className="text-lg font-semibold text-[#171717] mb-4">Performance par Agent de Recouvrement</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Agent</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Dossiers assignés</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Recouvré</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Taux succès</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Délai moyen</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Performance</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <UserCircle className="w-8 h-8 text-gray-700 mr-3" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">Marie Diallo</div>
                              <div className="text-sm text-gray-700">Senior</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">15</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(420000)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            89%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">12j</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                              <div className="bg-green-600 h-2 rounded-full" style={{width: '89%'}}></div>
                            </div>
                            <TrendingUp className="w-4 h-4 text-green-600" />
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <UserCircle className="w-8 h-8 text-gray-700 mr-3" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">Jean Kouassi</div>
                              <div className="text-sm text-gray-700">Junior</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">12</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(280000)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            72%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">18j</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                              <div className="bg-yellow-600 h-2 rounded-full" style={{width: '72%'}}></div>
                            </div>
                            <TrendingDown className="w-4 h-4 text-yellow-600" />
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Graphique performance */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                  <h3 className="text-lg font-semibold text-[#171717] mb-4">Évolution des Taux de Succès</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={[
                      { mois: 'Jan', marie: 85, jean: 68, equipe: 76 },
                      { mois: 'Fév', marie: 87, jean: 70, equipe: 78 },
                      { mois: 'Mar', marie: 89, jean: 72, equipe: 80 },
                      { mois: 'Avr', marie: 88, jean: 71, equipe: 79 },
                      { mois: 'Mai', marie: 90, jean: 74, equipe: 82 },
                      { mois: 'Juin', marie: 89, jean: 72, equipe: 80 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mois" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="marie" stroke="#22c55e" strokeWidth={2} name="Marie Diallo" />
                      <Line type="monotone" dataKey="jean" stroke="#f59e0b" strokeWidth={2} name="Jean Kouassi" />
                      <Line type="monotone" dataKey="equipe" stroke="#737373" strokeWidth={3} name="Moyenne équipe" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                  <h3 className="text-lg font-semibold text-[#171717] mb-4">Répartition du Temps</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        dataKey="value"
                        data={[
                          { name: 'Appels clients', value: 40, fill: '#737373' },
                          { name: 'Relances email', value: 25, fill: '#525252' },
                          { name: 'Dossiers juridiques', value: 20, fill: '#525252' },
                          { name: 'Administration', value: 15, fill: '#404040' }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          );

        case 'repartition':
          return (
            <div className="space-y-6">
              {/* Répartition géographique */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                  <h3 className="text-lg font-semibold text-[#171717] mb-4">Répartition Géographique</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[
                      { zone: 'Abidjan', creances: 450000, recouvre: 380000 },
                      { zone: 'Bouaké', creances: 180000, recouvre: 140000 },
                      { zone: 'San Pedro', creances: 120000, recouvre: 95000 },
                      { zone: 'Yamoussoukro', creances: 95000, recouvre: 75000 },
                      { zone: 'Korhogo', creances: 85000, recouvre: 60000 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="zone" />
                      <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Bar dataKey="creances" fill="#ef4444" name="Créances" />
                      <Bar dataKey="recouvre" fill="#22c55e" name="Recouvré" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                  <h3 className="text-lg font-semibold text-[#171717] mb-4">Répartition par Secteur</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        dataKey="montant"
                        data={[
                          { secteur: 'Commerce', montant: 380000, fill: '#737373' },
                          { secteur: 'Services', montant: 280000, fill: '#525252' },
                          { secteur: 'Industrie', montant: 320000, fill: '#525252' },
                          { secteur: 'Agriculture', montant: 150000, fill: '#404040' },
                          { secteur: 'BTP', montant: 120000, fill: '#404040' }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ secteur, percent }) => `${secteur} ${(percent * 100).toFixed(0)}%`}
                      >
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Ancienneté détaillée */}
              <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                <h3 className="text-lg font-semibold text-[#171717] mb-4">Ancienneté des Créances par Secteur</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={[
                    { periode: '0-30j', commerce: 120000, services: 80000, industrie: 95000, agriculture: 45000, btp: 35000 },
                    { periode: '31-60j', commerce: 95000, services: 65000, industrie: 85000, agriculture: 35000, btp: 28000 },
                    { periode: '61-90j', commerce: 85000, services: 70000, industrie: 75000, agriculture: 40000, btp: 32000 },
                    { periode: '+90j', commerce: 80000, services: 65000, industrie: 65000, agriculture: 30000, btp: 25000 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="periode" />
                    <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar dataKey="commerce" stackId="a" fill="#737373" name="Commerce" />
                    <Bar dataKey="services" stackId="a" fill="#525252" name="Services" />
                    <Bar dataKey="industrie" stackId="a" fill="#525252" name="Industrie" />
                    <Bar dataKey="agriculture" stackId="a" fill="#404040" name="Agriculture" />
                    <Bar dataKey="btp" stackId="a" fill="#404040" name="BTP" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          );

        case 'tendances':
          return (
            <div className="space-y-6">
              {/* Tendances temporelles */}
              <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                <h3 className="text-lg font-semibold text-[#171717] mb-4">Tendances sur 12 mois</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={[
                    { mois: 'Jan 2023', creances: 180000, recouvre: 145000, taux: 80.5 },
                    { mois: 'Fév 2023', creances: 195000, recouvre: 158000, taux: 81.0 },
                    { mois: 'Mar 2023', creances: 210000, recouvre: 168000, taux: 80.0 },
                    { mois: 'Avr 2023', creances: 225000, recouvre: 180000, taux: 80.0 },
                    { mois: 'Mai 2023', creances: 240000, recouvre: 192000, taux: 80.0 },
                    { mois: 'Juin 2023', creances: 220000, recouvre: 176000, taux: 80.0 },
                    { mois: 'Juil 2023', creances: 235000, recouvre: 188000, taux: 80.0 },
                    { mois: 'Août 2023', creances: 250000, recouvre: 200000, taux: 80.0 },
                    { mois: 'Sep 2023', creances: 245000, recouvre: 196000, taux: 80.0 },
                    { mois: 'Oct 2023', creances: 260000, recouvre: 208000, taux: 80.0 },
                    { mois: 'Nov 2023', creances: 255000, recouvre: 204000, taux: 80.0 },
                    { mois: 'Déc 2023', creances: 270000, recouvre: 216000, taux: 80.0 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mois" />
                    <YAxis yAxisId="left" tickFormatter={(value) => `${value / 1000}k`} />
                    <YAxis yAxisId="right" orientation="right" domain={[75, 85]} />
                    <Tooltip />
                    <Bar yAxisId="left" dataKey="creances" fill="#ef4444" fillOpacity={0.3} name="Créances" />
                    <Bar yAxisId="left" dataKey="recouvre" fill="#22c55e" fillOpacity={0.6} name="Recouvré" />
                    <Line yAxisId="right" type="monotone" dataKey="taux" stroke="#737373" strokeWidth={3} name="Taux %" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Analyse des cycles */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                  <h3 className="text-lg font-semibold text-[#171717] mb-4">Cycle de Recouvrement Moyen</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-sm font-semibold text-blue-600">1</span>
                        </div>
                        <span className="font-medium text-gray-900">Premier contact</span>
                      </div>
                      <span className="text-sm font-semibold text-blue-600">0-3j</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-sm font-semibold text-yellow-600">2</span>
                        </div>
                        <span className="font-medium text-gray-900">Relances multiples</span>
                      </div>
                      <span className="text-sm font-semibold text-yellow-600">4-15j</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-sm font-semibold text-orange-600">3</span>
                        </div>
                        <span className="font-medium text-gray-900">Négociation</span>
                      </div>
                      <span className="text-sm font-semibold text-orange-600">16-25j</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-sm font-semibold text-green-600">4</span>
                        </div>
                        <span className="font-medium text-gray-900">Résolution</span>
                      </div>
                      <span className="text-sm font-semibold text-green-600">26-30j</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                  <h3 className="text-lg font-semibold text-[#171717] mb-4">Facteurs de Réussite</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Contact dans les 24h</span>
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                          <div className="bg-green-600 h-2 rounded-full" style={{width: '92%'}}></div>
                        </div>
                        <span className="text-sm font-semibold text-green-600">92%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Appel téléphonique direct</span>
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                          <div className="bg-green-600 h-2 rounded-full" style={{width: '85%'}}></div>
                        </div>
                        <span className="text-sm font-semibold text-green-600">85%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Proposition d'échéancier</span>
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{width: '78%'}}></div>
                        </div>
                        <span className="text-sm font-semibold text-blue-600">78%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Relance par email</span>
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                          <div className="bg-yellow-600 h-2 rounded-full" style={{width: '65%'}}></div>
                        </div>
                        <span className="text-sm font-semibold text-yellow-600">65%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Courrier recommandé</span>
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                          <div className="bg-orange-600 h-2 rounded-full" style={{width: '45%'}}></div>
                        </div>
                        <span className="text-sm font-semibold text-orange-600">45%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );

        case 'comparaison':
          return (
            <div className="space-y-6">
              {/* Comparaison périodes */}
              <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[#171717]">Comparaison Périodes</h3>
                  <div className="flex space-x-2">
                    <select className="px-3 py-1 border border-gray-300 rounded-lg text-sm">
                      <option>Ce mois vs mois précédent</option>
                      <option>Ce trimestre vs trimestre précédent</option>
                      <option>Cette année vs année précédente</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-lg font-bold text-[#171717] mb-2">{formatCurrency(1250000)}</div>
                    <div className="text-sm text-gray-600 mb-1">Créances ce mois</div>
                    <div className="flex items-center justify-center text-sm">
                      <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                      <span className="text-green-600 font-medium">+12.5%</span>
                      <span className="text-gray-700 ml-1">vs mois précédent</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-[#171717] mb-2">{formatCurrency(980000)}</div>
                    <div className="text-sm text-gray-600 mb-1">Montant recouvré</div>
                    <div className="flex items-center justify-center text-sm">
                      <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                      <span className="text-green-600 font-medium">+8.3%</span>
                      <span className="text-gray-700 ml-1">vs mois précédent</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-[#171717] mb-2">78.4%</div>
                    <div className="text-sm text-gray-600 mb-1">Taux de succès</div>
                    <div className="flex items-center justify-center text-sm">
                      <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
                      <span className="text-red-600 font-medium">-2.1%</span>
                      <span className="text-gray-700 ml-1">vs mois précédent</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comparaison détaillée */}
              <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                <h3 className="text-lg font-semibold text-[#171717] mb-4">Évolution Comparative</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={[
                    { mois: 'Jan', anneeActuelle: 180000, anneePrecedente: 165000 },
                    { mois: 'Fév', anneeActuelle: 195000, anneePrecedente: 178000 },
                    { mois: 'Mar', anneeActuelle: 210000, anneePrecedente: 185000 },
                    { mois: 'Avr', anneeActuelle: 225000, anneePrecedente: 198000 },
                    { mois: 'Mai', anneeActuelle: 240000, anneePrecedente: 205000 },
                    { mois: 'Juin', anneeActuelle: 220000, anneePrecedente: 210000 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mois" />
                    <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Line type="monotone" dataKey="anneeActuelle" stroke="#737373" strokeWidth={3} name="2024" />
                    <Line type="monotone" dataKey="anneePrecedente" stroke="#B0BEC5" strokeWidth={2} strokeDasharray="5 5" name="2023" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Benchmark secteur */}
              <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                <h3 className="text-lg font-semibold text-[#171717] mb-4">Benchmark Sectoriel</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div>
                      <div className="font-semibold text-gray-900">Taux de recouvrement</div>
                      <div className="text-sm text-gray-600">Notre performance vs secteur</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">78.4%</div>
                      <div className="text-sm text-gray-600">Secteur: 72.1%</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div>
                      <div className="font-semibold text-gray-900">Délai moyen de recouvrement</div>
                      <div className="text-sm text-gray-600">Notre performance vs secteur</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">18j</div>
                      <div className="text-sm text-gray-600">Secteur: 24j</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                    <div>
                      <div className="font-semibold text-gray-900">Coût par dossier</div>
                      <div className="text-sm text-gray-600">Notre performance vs secteur</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-yellow-600">{formatCurrency(15000)}</div>
                      <div className="text-sm text-gray-600">Secteur: {formatCurrency(18500)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );

        case 'previsions':
          return (
            <div className="space-y-6">
              {/* Prévisions financières */}
              <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                <h3 className="text-lg font-semibold text-[#171717] mb-4">Prévisions de Recouvrement - 6 prochains mois</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={[
                    { mois: 'Juil', prevision: 260000, optimiste: 285000, pessimiste: 230000, realise: null },
                    { mois: 'Août', prevision: 275000, optimiste: 300000, pessimiste: 245000, realise: null },
                    { mois: 'Sep', prevision: 280000, optimiste: 310000, pessimiste: 250000, realise: null },
                    { mois: 'Oct', prevision: 290000, optimiste: 320000, pessimiste: 260000, realise: null },
                    { mois: 'Nov', prevision: 295000, optimiste: 325000, pessimiste: 265000, realise: null },
                    { mois: 'Déc', prevision: 310000, optimiste: 340000, pessimiste: 280000, realise: null }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mois" />
                    <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Area type="monotone" dataKey="pessimiste" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} name="Scénario pessimiste" />
                    <Area type="monotone" dataKey="prevision" stackId="2" stroke="#737373" fill="#737373" fillOpacity={0.4} name="Prévision réaliste" />
                    <Area type="monotone" dataKey="optimiste" stackId="3" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} name="Scénario optimiste" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Facteurs de risque */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                  <h3 className="text-lg font-semibold text-[#171717] mb-4">Facteurs de Risque Identifiés</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center">
                        <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
                        <div>
                          <div className="font-medium text-red-800">Secteur BTP en difficulté</div>
                          <div className="text-sm text-red-600">12 dossiers à risque</div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold bg-red-100 text-red-800 px-2 py-1 rounded">ÉLEVÉ</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3" />
                        <div>
                          <div className="font-medium text-yellow-800">Saisonnalité agriculture</div>
                          <div className="text-sm text-yellow-600">8 dossiers affectés</div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold bg-yellow-100 text-yellow-800 px-2 py-1 rounded">MOYEN</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center">
                        <AlertTriangle className="w-5 h-5 text-orange-600 mr-3" />
                        <div>
                          <div className="font-medium text-orange-800">Clients récidivistes</div>
                          <div className="text-sm text-orange-600">5 dossiers surveillés</div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold bg-orange-100 text-orange-800 px-2 py-1 rounded">MOYEN</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                  <h3 className="text-lg font-semibold text-[#171717] mb-4">Opportunités d'Amélioration</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center">
                        <TrendingUp className="w-5 h-5 text-green-600 mr-3" />
                        <div>
                          <div className="font-medium text-green-800">Automatisation relances</div>
                          <div className="text-sm text-green-600">Gain estimé: +15%</div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold bg-green-100 text-green-800 px-2 py-1 rounded">FORT</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center">
                        <Target className="w-5 h-5 text-blue-600 mr-3" />
                        <div>
                          <div className="font-medium text-blue-800">Scoring clients amélioré</div>
                          <div className="text-sm text-blue-600">Gain estimé: +8%</div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded">MOYEN</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center">
                        <Users className="w-5 h-5 text-purple-600 mr-3" />
                        <div>
                          <div className="font-medium text-purple-800">Formation équipe</div>
                          <div className="text-sm text-purple-600">Gain estimé: +5%</div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold bg-purple-100 text-purple-800 px-2 py-1 rounded">FAIBLE</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Simulation scenarios */}
              <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                <h3 className="text-lg font-semibold text-[#171717] mb-4">Simulation de Scénarios</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-800 mb-2">Scénario Optimiste</div>
                      <div className="text-lg font-bold text-green-900 mb-1">{formatCurrency(1850000)}</div>
                      <div className="text-sm text-green-600">Recouvrement 6 mois</div>
                      <div className="mt-3 text-xs text-green-700">
                        • Taux succès: 85%<br/>
                        • Nouveaux outils IA<br/>
                        • Équipe renforcée
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-blue-800 mb-2">Scénario Réaliste</div>
                      <div className="text-lg font-bold text-blue-900 mb-1">{formatCurrency(1650000)}</div>
                      <div className="text-sm text-blue-600">Recouvrement 6 mois</div>
                      <div className="mt-3 text-xs text-blue-700">
                        • Taux succès: 78%<br/>
                        • Maintien performance<br/>
                        • Croissance modérée
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-red-800 mb-2">Scénario Pessimiste</div>
                      <div className="text-lg font-bold text-red-900 mb-1">{formatCurrency(1420000)}</div>
                      <div className="text-sm text-red-600">Recouvrement 6 mois</div>
                      <div className="mt-3 text-xs text-red-700">
                        • Taux succès: 68%<br/>
                        • Crise économique<br/>
                        • Difficultés sectorielles
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );

        default:
          return <div>Contenu non disponible</div>;
      }
    }

    return (
      <div className="space-y-6">
        {/* Navigation sous-onglets */}
        <div className="bg-white rounded-lg p-2 border border-[#e5e5e5] shadow-sm">
          <div className="flex flex-wrap gap-1">
            {analyticsSubTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setAnalyticsView(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                  analyticsView === tab.id
                    ? 'bg-[#737373] text-white'
                    : 'text-[#525252] hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Contenu selon le sous-onglet actif */}
        {renderAnalyticsContent()}
      </div>
    );
  };

  // Composant Onglet Contentieux
  const ContentieuxTab = () => {
    const [contentieuxView, setContentieuxView] = useState('dashboard'); // dashboard, liste, detail, workflow, couts, execution
    const [selectedContentieux, setSelectedContentieux] = useState<DossierContentieux | null>(null);
    const [filterStatutContentieux, setFilterStatutContentieux] = useState('tous');
    const [filterProcedure, setFilterProcedure] = useState('tous');
    const [showTransferContentieuxModal, setShowTransferContentieuxModal] = useState(false);
    const [selectedDossierTransfer, setSelectedDossierTransfer] = useState<DossierContentieux | null>(null);
    const [formData, setFormData] = useState({
      creance_ids: [] as string[],
      motif: '',
      service_recouvrement: '',
      date_transfert: new Date().toISOString().split('T')[0],
      provision_montant: '',
      documents: [] as string[],
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const queryClient = useQueryClient();
    const [activeWorkflowPhase, setActiveWorkflowPhase] = useState('all');

    // Create transfert contentieux mutation
    const createMutation = useMutation({
      mutationFn: tiersService.transfertContentieux,
      onSuccess: () => {
        toast.success('Transfert en contentieux créé avec succès');
        queryClient.invalidateQueries({ queryKey: ['transferts-contentieux'] });
        setShowTransferContentieuxModal(false);
        resetForm();
      },
      onError: (error: Error) => {
        toast.error(error.message || 'Erreur lors de la création');
      },
    });

    const resetForm = () => {
      setFormData({
        creance_ids: [],
        motif: '',
        service_recouvrement: '',
        date_transfert: new Date().toISOString().split('T')[0],
        provision_montant: '',
        documents: [],
      });
      setErrors({});
      setIsSubmitting(false);
    };

    const handleInputChange = (field: string, value: string | string[] | number | undefined) => {
      setFormData(prev => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    };

    const handleSubmit = async () => {
      try {
        setIsSubmitting(true);
        setErrors({});

        // Convert provision_montant to number if not empty
        const processedData = {
          ...formData,
          provision_montant: formData.provision_montant ? Number(formData.provision_montant) : undefined,
        };

        const validatedData = createTransfertContentieuxSchema.parse(processedData);
        await createMutation.mutateAsync(validatedData);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldErrors: Record<string, string> = {};
          error.errors.forEach((err) => {
            const field = err.path[0] as string;
            fieldErrors[field] = err.message;
          });
          setErrors(fieldErrors);
          toast.error('Veuillez corriger les erreurs du formulaire');
        } else {
          toast.error('Erreur lors de la création');
        }
      } finally {
        setIsSubmitting(false);
      }
    };

    // États pour les modals d'actions contentieuses
    const [showAssignationModal, setShowAssignationModal] = useState(false);
    const [showAudienceModal, setShowAudienceModal] = useState(false);
    const [showConclusionsModal, setShowConclusionsModal] = useState(false);
    const [showJugementModal, setShowJugementModal] = useState(false);
    const [showContactAvocatModal, setShowContactAvocatModal] = useState(false);
    const [showRetourAmiableModal, setShowRetourAmiableModal] = useState(false);
    const [showExpertiseModal, setShowExpertiseModal] = useState(false);
    const [showClotureModal, setShowClotureModal] = useState(false);
    const [actionContentieuxData, setActionContentieuxData] = useState<Record<string, unknown>>({});

    // États pour les modales d'exécution
    const [showExecutionDetailModal, setShowExecutionDetailModal] = useState(false);
    const [selectedExecutionDossier, setSelectedExecutionDossier] = useState<DossierContentieux | null>(null);

    // États pour la page détaillée des dossiers contentieux
    const [showContentieuxDetailPage, setShowContentieuxDetailPage] = useState(false);
    const [selectedContentieuxDetail, setSelectedContentieuxDetail] = useState<DossierContentieux | null>(null);
    const [activeContentieuxTab, setActiveContentieuxTab] = useState('general');

    // Hooks pour les onglets enrichis
    // Documents Tab
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [documentFilter, setDocumentFilter] = useState('all');

    // Frais Tab
    const [showAddFraisModal, setShowAddFraisModal] = useState(false);
    const [fraisFilter, setFraisFilter] = useState('all');

    // Correspondance Tab
    const [showNewMessageModal, setShowNewMessageModal] = useState(false);
    const [correspondanceFilter, setCorrespondanceFilter] = useState('all');
    const [selectedCorrespondant, setSelectedCorrespondant] = useState(null);

    // Execution Tab
    const [showNewMesureModal, setShowNewMesureModal] = useState(false);
    const [executionFilter, setExecutionFilter] = useState('all');

    // Results Tab
    const [showCloturerModal, setShowCloturerModal] = useState(false);

    // États pour la modal de mise à jour dossier contentieux
    const [showEditContentieuxModal, setShowEditContentieuxModal] = useState(false);
    const [editContentieuxActiveTab, setEditContentieuxActiveTab] = useState('statut');

    // Types de dépenses pour le contentieux
    const typesDepenses = [
      { value: 'creance_principale', label: 'Créance principale' },
      { value: 'interets_retard', label: 'Intérêts de retard' },
      { value: 'frais_procedure', label: 'Frais de procédure' },
      { value: 'honoraires_avocat', label: 'Honoraires avocat' },
      { value: 'frais_huissier', label: 'Frais huissier' },
      { value: 'frais_greffe', label: 'Frais de greffe' },
      { value: 'frais_expertise', label: 'Frais d\'expertise' },
      { value: 'frais_signification', label: 'Frais de signification' },
      { value: 'frais_execution', label: 'Frais d\'exécution' },
      { value: 'provision', label: 'Provision comptable' },
      { value: 'autres', label: 'Autres frais' }
    ];

    // État pour les dépenses du contentieux
    const [contentieuxDepenses, setContentieuxDepenses] = useState<ContentieuxDepense[]>([]);
    const [newDepense, setNewDepense] = useState({
      type: 'creance_principale',
      date: new Date().toISOString().split('T')[0],
      montant: 0,
      destinataire: '',
      reference: '',
      notes: ''
    });

    const [editContentieuxFormData, setEditContentieuxFormData] = useState<ContentieuxFormData>({
      id: '',
      statutJuridique: '',
      typeProcedure: '',
      // Intervenants
      avocat: '',
      avocatTel: '',
      avocatEmail: '',
      huissier: '',
      huissierTel: '',
      huissierEmail: '',
      // Tribunal
      tribunal: '',
      tribunalAdresse: '',
      numeroRG: '',
      chambre: '',
      // Dates clés
      dateTransfert: '',
      dateMiseEnDemeure: '',
      dateAssignation: '',
      dateAudience: '',
      dateTitreExecutoire: '',
      dateExecution: '',
      // Provision comptable
      provision: 0,
      // Débiteur
      debiteurAdresse: '',
      debiteurTel: '',
      debiteurEmail: '',
      debiteurRepresentant: '',
      // Procédure
      motifTransfert: '',
      resultatAttendu: '',
      risques: '',
      chancesSucces: 'moyenne',
      // Suivi
      prochaineEcheance: '',
      priorite: 'normale',
      notes: '',
      dernierContact: '',
      prochainContact: ''
    });

    // Fonction pour ajouter une dépense
    const addDepense = () => {
      if (newDepense.montant <= 0) {
        toast.error('Le montant doit être supérieur à 0');
        return;
      }
      const depense = {
        id: Date.now(),
        ...newDepense
      };
      setContentieuxDepenses([...contentieuxDepenses, depense]);
      setNewDepense({
        type: 'creance_principale',
        date: new Date().toISOString().split('T')[0],
        montant: 0,
        destinataire: '',
        reference: '',
        notes: ''
      });
      toast.success('Dépense ajoutée');
    };

    // Fonction pour supprimer une dépense
    const removeDepense = (id: number) => {
      setContentieuxDepenses(contentieuxDepenses.filter(d => d.id !== id));
      toast.success('Dépense supprimée');
    };

    // Calcul des totaux par type
    const getTotalByType = (type: string) => {
      return contentieuxDepenses
        .filter(d => d.type === type)
        .reduce((sum, d) => sum + d.montant, 0);
    };

    // Total général des dépenses
    const getTotalDepenses = () => {
      return contentieuxDepenses.reduce((sum, d) => sum + d.montant, 0);
    };

    // Types d'étapes de suivi
    const typesEtapesSuivi = [
      { value: 'appel_telephonique', label: 'Appel téléphonique', icon: 'phone' },
      { value: 'envoi_courrier', label: 'Envoi de courrier', icon: 'mail' },
      { value: 'envoi_email', label: 'Envoi email', icon: 'mail' },
      { value: 'reunion', label: 'Réunion / Rendez-vous', icon: 'users' },
      { value: 'mise_demeure', label: 'Mise en demeure', icon: 'alert' },
      { value: 'depot_greffe', label: 'Dépôt au greffe', icon: 'file' },
      { value: 'audience', label: 'Audience tribunal', icon: 'scale' },
      { value: 'signification', label: 'Signification huissier', icon: 'gavel' },
      { value: 'saisie', label: 'Saisie / Exécution', icon: 'lock' },
      { value: 'paiement_recu', label: 'Paiement reçu', icon: 'check' },
      { value: 'negociation', label: 'Négociation', icon: 'handshake' },
      { value: 'autre', label: 'Autre', icon: 'circle' }
    ];

    // État pour les étapes de suivi
    const [suiviEtapes, setSuiviEtapes] = useState<SuiviEtape[]>([]);
    const [newSuiviEtape, setNewSuiviEtape] = useState({
      type: 'appel_telephonique',
      date: new Date().toISOString().split('T')[0],
      heure: '',
      intervenant: '',
      roleIntervenant: '',
      contact: '',
      resultat: 'en_attente',
      notes: '',
      prochainRdv: '',
      documentsJoints: ''
    });

    // Résultats possibles pour une étape
    const resultatsEtape = [
      { value: 'en_attente', label: 'En attente', color: 'gray' },
      { value: 'reussi', label: 'Réussi', color: 'green' },
      { value: 'echoue', label: 'Échoué', color: 'red' },
      { value: 'reporte', label: 'Reporté', color: 'yellow' },
      { value: 'annule', label: 'Annulé', color: 'orange' }
    ];

    // Fonction pour ajouter une étape de suivi
    const addSuiviEtape = () => {
      if (!newSuiviEtape.date) {
        toast.error('La date est obligatoire');
        return;
      }
      const etape = {
        id: Date.now(),
        ...newSuiviEtape,
        createdAt: new Date().toISOString()
      };
      setSuiviEtapes([etape, ...suiviEtapes]); // Ajouter en premier (plus récent en haut)
      setNewSuiviEtape({
        type: 'appel_telephonique',
        date: new Date().toISOString().split('T')[0],
        heure: '',
        intervenant: '',
        roleIntervenant: '',
        contact: '',
        resultat: 'en_attente',
        notes: '',
        prochainRdv: '',
        documentsJoints: ''
      });
      toast.success('Étape de suivi ajoutée');
    };

    // Fonction pour supprimer une étape de suivi
    const removeSuiviEtape = (id: number) => {
      setSuiviEtapes(suiviEtapes.filter(e => e.id !== id));
      toast.success('Étape supprimée');
    };

    // Fonction pour mettre à jour le résultat d'une étape
    const updateSuiviEtapeResultat = (id: number, resultat: string) => {
      setSuiviEtapes(suiviEtapes.map(e =>
        e.id === id ? { ...e, resultat } : e
      ));
    };

    // Fonction pour ouvrir la modal d'édition avec les données du dossier
    const openEditContentieuxModal = (dossier: DossierContentieux) => {
      setEditContentieuxFormData({
        id: dossier.id,
        numeroRef: dossier.numeroRef,
        client: dossier.client,
        statutJuridique: dossier.statutJuridique,
        typeProcedure: dossier.typeProcedure,
        // Intervenants
        avocat: dossier.avocat || '',
        avocatTel: dossier.avocatTel || '+242 06 XXX XX XX',
        avocatEmail: dossier.avocatEmail || '',
        huissier: dossier.huissier || '',
        huissierTel: dossier.huissierTel || '',
        huissierEmail: dossier.huissierEmail || '',
        // Tribunal
        tribunal: dossier.tribunal || 'Tribunal de Commerce',
        tribunalAdresse: dossier.tribunalAdresse || '',
        numeroRG: dossier.numeroRG || '',
        chambre: dossier.chambre || '',
        // Dates clés
        dateTransfert: dossier.dateTransfert || '',
        dateMiseEnDemeure: dossier.dateMiseEnDemeure || '',
        dateAssignation: dossier.dateAssignation || '',
        dateAudience: dossier.dateAudience || '',
        dateTitreExecutoire: dossier.dateTitreExecutoire || '',
        dateExecution: dossier.dateExecution || '',
        // Provision comptable
        provision: dossier.provision || 0,
        // Débiteur
        debiteurAdresse: dossier.debiteurAdresse || '',
        debiteurTel: dossier.debiteurTel || '',
        debiteurEmail: dossier.debiteurEmail || '',
        debiteurRepresentant: dossier.debiteurRepresentant || '',
        // Procédure
        motifTransfert: dossier.motifTransfert || '',
        resultatAttendu: dossier.resultatAttendu || '',
        risques: dossier.risques || '',
        chancesSucces: dossier.chancesSucces || 'moyenne',
        // Suivi
        prochaineEcheance: dossier.prochaineEcheance || '',
        priorite: dossier.priorite || 'normale',
        notes: dossier.notes || '',
        dernierContact: dossier.dernierContact || '',
        prochainContact: dossier.prochainContact || ''
      });

      // Initialiser les dépenses à partir des données existantes du dossier
      const depensesInitiales: ContentieuxDepense[] = [];
      if (dossier.montantPrincipal > 0) {
        depensesInitiales.push({
          id: 1,
          type: 'creance_principale',
          date: dossier.dateTransfert || new Date().toISOString().split('T')[0],
          montant: dossier.montantPrincipal,
          destinataire: dossier.client,
          reference: dossier.numeroRef,
          notes: 'Créance principale'
        });
      }
      if (dossier.interetsRetard > 0) {
        depensesInitiales.push({
          id: 2,
          type: 'interets_retard',
          date: dossier.dateTransfert || new Date().toISOString().split('T')[0],
          montant: dossier.interetsRetard,
          destinataire: dossier.client,
          reference: '',
          notes: 'Intérêts de retard'
        });
      }
      if (dossier.fraisProcedure > 0) {
        depensesInitiales.push({
          id: 3,
          type: 'frais_procedure',
          date: dossier.dateTransfert || new Date().toISOString().split('T')[0],
          montant: dossier.fraisProcedure,
          destinataire: 'Greffe',
          reference: '',
          notes: 'Frais de procédure'
        });
      }
      setContentieuxDepenses(depensesInitiales);
      setEditContentieuxActiveTab('statut');
      setShowEditContentieuxModal(true);
    };

    // Fonction pour sauvegarder les modifications
    const handleSaveContentieux = () => {
      // TODO: Appel API pour sauvegarder
      toast.success(`Dossier ${editContentieuxFormData.numeroRef} mis à jour avec succès`);
      setShowEditContentieuxModal(false);
    };

    // Onglets pour la page détaillée contentieux
    const contentieuxDetailTabs = [
      { id: 'general', label: 'Informations Générales', icon: FileText },
      { id: 'procedure', label: 'Procédure Juridique', icon: Scale },
      { id: 'chronologie', label: 'Chronologie', icon: Clock },
      { id: 'documents', label: 'Documents', icon: Archive },
      { id: 'frais', label: 'Frais & Coûts', icon: DollarSign },
      { id: 'correspondance', label: 'Correspondance', icon: Mail },
      { id: 'execution', label: 'Exécution', icon: Hammer },
      { id: 'resultats', label: 'Résultats', icon: Award }
    ];

    // Données mock des dossiers d'exécution
    const dossiersExecution = [
      {
        id: 'EXE-2024-001',
        reference: 'EXE-2024-001',
        client: 'SOCIETE ABIDJAN TRANSPORT',
        typeExecution: 'Saisie-attribution',
        montant: 4875000,
        statut: 'En cours',
        dateDebut: '2024-01-15',
        huissier: 'Maître KOUAME',
        datePrevisionnelle: '2024-02-15',
        comptesSaisis: ['BNI-12345', 'SGCI-67890'],
        montantSaisi: 2400000,
        fraisHuissier: 125000
      },
      {
        id: 'EXE-2024-002',
        reference: 'EXE-2024-002',
        client: 'GROUPE IVOIRIEN BATIMENT',
        typeExecution: 'Saisie-vente',
        montant: 13050000,
        statut: 'Huissier mandaté',
        dateDebut: '2024-01-20',
        huissier: 'Maître DIABATE',
        datePrevisionnelle: '2024-03-20',
        biensSaisis: ['Véhicule Toyota Land Cruiser', 'Équipements de chantier'],
        montantEstime: 8500000,
        fraisHuissier: 350000
      },
      {
        id: 'EXE-2024-003',
        reference: 'EXE-2024-003',
        client: 'COMMERCE GENERAL KOUASSI',
        typeExecution: 'Saisie sur salaire',
        montant: 3140000,
        statut: 'Exécuté',
        dateDebut: '2023-12-01',
        dateFin: '2024-01-15',
        employeur: 'MINISTERE DE LA CONSTRUCTION',
        montantMensuel: 785000,
        montantRecupere: 3140000,
        fraisHuissier: 85000
      }
    ];

    // Données mock des dossiers contentieux
    const dossiersContentieux = [
      {
        id: '1',
        numeroRef: 'CTX-2024-001',
        client: 'SOCIETE ABIDJAN TRANSPORT',
        montantPrincipal: 4500000,
        interetsRetard: 225000,
        fraisProcedure: 150000,
        montantTotal: 4875000,
        dateTransfert: '2024-01-15',
        statutJuridique: 'mise_demeure',
        typeProcedure: 'injonction_payer',
        avocat: 'Maître KONE',
        prochaineEcheance: '2024-02-01',
        joursRestants: 8,
        origineAmiable: 'REC-2023-458',
        motifTransfert: 'Échec recouvrement amiable après 6 relances'
      },
      {
        id: '2',
        numeroRef: 'CTX-2024-002',
        client: 'GROUPE IVOIRIEN BATIMENT',
        montantPrincipal: 12000000,
        interetsRetard: 600000,
        fraisProcedure: 450000,
        montantTotal: 13050000,
        dateTransfert: '2024-01-10',
        statutJuridique: 'assignation',
        typeProcedure: 'refere_provision',
        avocat: 'Maître DIALLO',
        prochaineEcheance: '2024-01-28',
        joursRestants: 5,
        origineAmiable: 'REC-2023-412',
        motifTransfert: 'Montant important - Action judiciaire requise'
      },
      {
        id: '3',
        numeroRef: 'CTX-2024-003',
        client: 'COMMERCE GENERAL KOUASSI',
        montantPrincipal: 2800000,
        interetsRetard: 140000,
        fraisProcedure: 200000,
        montantTotal: 3140000,
        dateTransfert: '2024-01-05',
        statutJuridique: 'jugement',
        typeProcedure: 'procedure_fond',
        avocat: 'Maître YAO',
        prochaineEcheance: '2024-02-15',
        joursRestants: 22,
        origineAmiable: 'REC-2023-389',
        motifTransfert: 'Client insolvable - Saisie nécessaire'
      },
      {
        id: '4',
        numeroRef: 'CTX-2024-004',
        client: 'ENTREPRISE BAMBA SARL',
        montantPrincipal: 6700000,
        interetsRetard: 335000,
        fraisProcedure: 280000,
        montantTotal: 7315000,
        dateTransfert: '2023-12-20',
        statutJuridique: 'execution',
        typeProcedure: 'saisie_attribution',
        avocat: 'Maître KOFFI',
        prochaineEcheance: '2024-01-25',
        joursRestants: 2,
        origineAmiable: 'REC-2023-342',
        motifTransfert: 'Jugement obtenu - En cours d\'exécution'
      }
    ];

    // Workflow de contentieux avec les étapes correctes
    const statutsContentieux = [
      { value: 'tous', label: 'Tous les statuts' },
      { value: 'reglement_amiable', label: '1. Règlement à l\'amiable' },
      { value: 'mise_demeure_huissier', label: '2. Mise en demeure (Huissier)' },
      { value: 'saisine_tribunal', label: '3. Saisine au tribunal' },
      { value: 'procedure_injonction', label: '4. Procédure d\'injonction' },
      { value: 'titre_executoire', label: '5. Titre exécutoire obtenu' },
      { value: 'execution_forcee', label: '6. Exécution forcée / Saisie' },
      { value: 'cloture', label: 'Clôturé' }
    ];

    const typesProcedure = [
      { value: 'tous', label: 'Toutes les procédures' },
      { value: 'injonction_payer', label: 'Injonction de payer' },
      { value: 'refere_provision', label: 'Référé provision' },
      { value: 'procedure_fond', label: 'Procédure au fond' },
      { value: 'saisie_attribution', label: 'Saisie-attribution' },
      { value: 'saisie_vente', label: 'Saisie-vente' },
      { value: 'saisie_immobiliere', label: 'Saisie immobilière' }
    ];

    // États pour le workflow personnalisable
    const [showWorkflowModal, setShowWorkflowModal] = useState(false);
    const [selectedDossierWorkflow, setSelectedDossierWorkflow] = useState<DossierWorkflow | null>(null);
    const [showAddEtapeModal, setShowAddEtapeModal] = useState(false);
    const [newEtape, setNewEtape] = useState({ titre: '', description: '', datePrevu: '' });
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [selectedEtape, setSelectedEtape] = useState<WorkflowEtape | null>(null);
    const [newComment, setNewComment] = useState('');

    // Structure des étapes du workflow par défaut
    const defaultWorkflowEtapes = [
      {
        id: 1,
        code: 'reglement_amiable',
        titre: 'Règlement à l\'amiable',
        description: 'Tentative de recouvrement amiable avant procédure judiciaire',
        ordre: 1,
        obligatoire: true,
        delaiJours: 15
      },
      {
        id: 2,
        code: 'mise_demeure_huissier',
        titre: 'Mise en demeure par Huissier',
        description: 'Signification de la mise en demeure par voie d\'huissier de justice',
        ordre: 2,
        obligatoire: true,
        delaiJours: 8
      },
      {
        id: 3,
        code: 'saisine_tribunal',
        titre: 'Saisine au tribunal',
        description: 'Dépôt de la requête auprès du tribunal compétent',
        ordre: 3,
        obligatoire: true,
        delaiJours: 30
      },
      {
        id: 4,
        code: 'procedure_injonction',
        titre: 'Procédure d\'injonction',
        description: 'Procédure d\'injonction de payer devant le tribunal',
        ordre: 4,
        obligatoire: true,
        delaiJours: 45
      },
      {
        id: 5,
        code: 'titre_executoire',
        titre: 'Obtention du titre exécutoire',
        description: 'Ordonnance d\'injonction de payer revêtue de la formule exécutoire',
        ordre: 5,
        obligatoire: true,
        delaiJours: 15
      },
      {
        id: 6,
        code: 'execution_forcee',
        titre: 'Exécution forcée / Saisie',
        description: 'Mise en œuvre des mesures d\'exécution forcée (saisie-attribution, saisie-vente, etc.)',
        ordre: 6,
        obligatoire: true,
        delaiJours: 30
      }
    ];

    // État pour les étapes du workflow avec leurs statuts et commentaires
    const [workflowData, setWorkflowData] = useState<{[key: string]: {
      etapes: Array<{
        id: number;
        code: string;
        titre: string;
        description: string;
        ordre: number;
        obligatoire: boolean;
        delaiJours: number;
        statut: 'pending' | 'in_progress' | 'completed' | 'skipped';
        dateDebut?: string;
        dateFin?: string;
        commentaires: Array<{
          id: number;
          texte: string;
          auteur: string;
          date: string;
        }>;
        custom?: boolean;
      }>;
    }}>({});

    // Fonction pour initialiser le workflow d'un dossier
    const initWorkflowForDossier = (dossierId: string) => {
      if (!workflowData[dossierId]) {
        setWorkflowData(prev => ({
          ...prev,
          [dossierId]: {
            etapes: defaultWorkflowEtapes.map(etape => ({
              ...etape,
              statut: 'pending',
              commentaires: []
            }))
          }
        }));
      }
    };

    // Fonction pour mettre à jour le statut d'une étape
    const updateEtapeStatus = (dossierId: string, etapeId: number, newStatut: 'pending' | 'in_progress' | 'completed' | 'skipped') => {
      setWorkflowData(prev => ({
        ...prev,
        [dossierId]: {
          ...prev[dossierId],
          etapes: prev[dossierId].etapes.map(etape =>
            etape.id === etapeId
              ? {
                  ...etape,
                  statut: newStatut,
                  dateDebut: newStatut === 'in_progress' ? new Date().toISOString().split('T')[0] : etape.dateDebut,
                  dateFin: newStatut === 'completed' ? new Date().toISOString().split('T')[0] : etape.dateFin
                }
              : etape
          )
        }
      }));
      toast.success(`Étape mise à jour: ${newStatut === 'completed' ? 'Terminée' : newStatut === 'in_progress' ? 'En cours' : 'En attente'}`);
    };

    // Fonction pour ajouter un commentaire à une étape
    const addCommentToEtape = (dossierId: string, etapeId: number, commentText: string) => {
      const newCommentObj = {
        id: Date.now(),
        texte: commentText,
        auteur: 'Utilisateur actuel',
        date: new Date().toISOString().split('T')[0]
      };
      setWorkflowData(prev => ({
        ...prev,
        [dossierId]: {
          ...prev[dossierId],
          etapes: prev[dossierId].etapes.map(etape =>
            etape.id === etapeId
              ? { ...etape, commentaires: [...etape.commentaires, newCommentObj] }
              : etape
          )
        }
      }));
      toast.success('Commentaire ajouté');
      setShowCommentModal(false);
      setNewComment('');
    };

    // Fonction pour ajouter une étape personnalisée
    const addCustomEtape = (dossierId: string) => {
      const dossierWorkflow = workflowData[dossierId];
      const maxOrdre = Math.max(...dossierWorkflow.etapes.map(e => e.ordre));
      const newEtapeObj = {
        id: Date.now(),
        code: `custom_${Date.now()}`,
        titre: newEtape.titre,
        description: newEtape.description,
        ordre: maxOrdre + 1,
        obligatoire: false,
        delaiJours: 0,
        statut: 'pending' as const,
        commentaires: [],
        custom: true
      };
      setWorkflowData(prev => ({
        ...prev,
        [dossierId]: {
          ...prev[dossierId],
          etapes: [...prev[dossierId].etapes, newEtapeObj]
        }
      }));
      toast.success('Étape personnalisée ajoutée');
      setShowAddEtapeModal(false);
      setNewEtape({ titre: '', description: '', datePrevu: '' });
    };

    const getStatutColor = (statut: string) => {
      switch (statut) {
        case 'reglement_amiable': return 'bg-blue-100 text-blue-800';
        case 'mise_demeure_huissier': return 'bg-yellow-100 text-yellow-800';
        case 'mise_demeure': return 'bg-yellow-100 text-yellow-800';
        case 'saisine_tribunal': return 'bg-orange-100 text-orange-800';
        case 'assignation': return 'bg-orange-100 text-orange-800';
        case 'procedure_injonction': return 'bg-indigo-100 text-indigo-800';
        case 'titre_executoire': return 'bg-purple-100 text-purple-800';
        case 'jugement': return 'bg-purple-100 text-purple-800';
        case 'execution_forcee': return 'bg-red-100 text-red-800';
        case 'execution': return 'bg-red-100 text-red-800';
        case 'appel': return 'bg-pink-100 text-pink-800';
        case 'cloture': return 'bg-green-100 text-green-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    const getUrgenceIndicator = (jours: number) => {
      if (jours <= 3) return 'text-red-600';
      if (jours <= 7) return 'text-orange-600';
      return 'text-gray-600';
    };

    const filteredContentieux = dossiersContentieux.filter(dossier => {
      const matchStatut = filterStatutContentieux === 'tous' || dossier.statutJuridique === filterStatutContentieux;
      const matchProcedure = filterProcedure === 'tous' || dossier.typeProcedure === filterProcedure;
      return matchStatut && matchProcedure;
    });

    // Sous-onglets du contentieux
    const contentieuxSubTabs = [
      { id: 'dashboard', label: t('dashboard.title'), icon: BarChart3 },
      { id: 'liste', label: 'Dossiers', icon: FileText },
      { id: 'workflow', label: 'Workflow', icon: Activity },
      { id: 'couts', label: 'Coûts & Budget', icon: DollarSign },
      { id: 'execution', label: 'Exécution', icon: Scale },
      { id: 'kpi', label: 'KPIs & Reporting', icon: TrendingUp }
    ];

    // Vue principale avec sous-onglets
    return (
      <div className="space-y-6">
        {/* Barre de sous-navigation */}
        <div className="bg-white rounded-lg p-2 border border-[#e5e5e5] shadow-sm">
          <div className="flex space-x-1">
            {contentieuxSubTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setContentieuxView(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                  contentieuxView === tab.id
                    ? 'bg-[#737373] text-white'
                    : 'text-[#525252] hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Contenu selon le sous-onglet actif */}
        {renderContentieuxContent()}

        {/* Modals d'actions contentieuses */}
        {/* Modal Préparer Assignation */}
        {showAssignationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Préparer l'Assignation</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type d'assignation</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option>Assignation en référé provision</option>
                    <option>Assignation au fond</option>
                    <option>Assignation en injonction de payer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tribunal compétent</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option>Tribunal de Commerce d'Abidjan</option>
                    <option>Tribunal de Première Instance d'Abidjan</option>
                    <option>Tribunal de Commerce de Bouaké</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Montant réclamé</label>
                  <input
                    type="text"
                    value={selectedContentieux ? formatCurrency(selectedContentieux.montantTotal) : ''}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Demandes accessoires</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" defaultChecked />
                      <span className="text-sm">Intérêts de retard</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" defaultChecked />
                      <span className="text-sm">Pénalités contractuelles</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" defaultChecked />
                      <span className="text-sm">Dommages et intérêts</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" defaultChecked />
                      <span className="text-sm">Frais de procédure</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Instructions spéciales</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24"
                    placeholder="Instructions particulières pour l'avocat..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAssignationModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    // Traitement de l'assignation
                    setShowAssignationModal(false);
                  }}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Préparer l'assignation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Planifier Audience */}
        {showAudienceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Planifier une Audience</h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date d'audience</label>
                    <input
                      type="date"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Heure</label>
                    <input
                      type="time"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type d'audience</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option>Audience de conciliation</option>
                    <option>Audience de mise en état</option>
                    <option>Audience de plaidoirie</option>
                    <option>Audience de jugement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Avocat assigné</label>
                  <input
                    type="text"
                    value={selectedContentieux ? selectedContentieux.avocat : ''}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Participants</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" defaultChecked />
                      <span className="text-sm">Demandeur (notre client)</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" defaultChecked />
                      <span className="text-sm">Défendeur</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span className="text-sm">Expert judiciaire</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes de préparation</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24"
                    placeholder="Points à aborder, documents à présenter..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAudienceModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    // Traitement de la planification
                    setShowAudienceModal(false);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Programmer l'audience
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Générer Conclusions */}
        {showConclusionsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Générer les Conclusions</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type de conclusions</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option>Conclusions principales</option>
                    <option>Conclusions subsidiaires</option>
                    <option>Conclusions en duplique</option>
                    <option>Conclusions en défense</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Points de droit à développer</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" defaultChecked />
                      <span className="text-sm">Créance certaine, liquide et exigible</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" defaultChecked />
                      <span className="text-sm">Manquement contractuel du débiteur</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span className="text-sm">Demande reconventionnelle</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span className="text-sm">Exception d'inexécution</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Demandes</label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Principal</span>
                      <span className="font-medium">{selectedContentieux ? formatCurrency(selectedContentieux.montantPrincipal) : ''}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Intérêts de retard</span>
                      <span className="font-medium">{selectedContentieux ? formatCurrency(selectedContentieux.interetsRetard) : ''}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Frais de procédure</span>
                      <span className="font-medium">{selectedContentieux ? formatCurrency(selectedContentieux.fraisProcedure) : ''}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pièces à annexer</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" defaultChecked />
                      <span className="text-sm">Contrat principal</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" defaultChecked />
                      <span className="text-sm">Factures impayées</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" defaultChecked />
                      <span className="text-sm">Mise en demeure</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span className="text-sm">Correspondances</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowConclusionsModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    // Traitement de la génération
                    setShowConclusionsModal(false);
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Générer les conclusions
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Enregistrer Jugement */}
        {showJugementModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Enregistrer le Jugement</h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date du jugement</label>
                    <input
                      type="date"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Numéro RG</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="N° du rôle général"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sens du jugement</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option>Favorable (condamnation du débiteur)</option>
                    <option>Défavorable (débouté de nos demandes)</option>
                    <option>Partiellement favorable</option>
                    <option>Décision avant dire droit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Montant accordé</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Montant de la condamnation"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Exécution provisoire</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input type="radio" name="execution" className="mr-2" />
                      <span className="text-sm">Oui, de droit</span>
                    </label>
                    <label className="flex items-center">
                      <input type="radio" name="execution" className="mr-2" />
                      <span className="text-sm">Oui, à hauteur de...</span>
                    </label>
                    <label className="flex items-center">
                      <input type="radio" name="execution" className="mr-2" />
                      <span className="text-sm">Non</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Observations</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24"
                    placeholder="Remarques sur le jugement, voies de recours..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowJugementModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    // Traitement de l'enregistrement
                    setShowJugementModal(false);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Enregistrer le jugement
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Contacter Avocat */}
        {showContactAvocatModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contacter l'Avocat</h3>

              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <UserCircle className="w-12 h-12 text-blue-600" />
                    <div>
                      <h4 className="font-semibold text-blue-900">{selectedContentieux ? selectedContentieux.avocat : ''}</h4>
                      <p className="text-sm text-blue-700">Cabinet KONE & Associés</p>
                      <p className="text-sm text-blue-600">+225 27 20 30 40 50</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mode de contact</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button className="flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                      <Phone className="w-4 h-4" />
                      <span className="text-sm">Appel</span>
                    </button>
                    <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-100 border border-blue-300 rounded-lg">
                      <Mail className="w-4 h-4" />
                      <span className="text-sm">Email</span>
                    </button>
                    <button className="flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-sm">Message</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Objet</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option>Point sur la procédure</option>
                    <option>Demande de mise à jour</option>
                    <option>Instructions particulières</option>
                    <option>Urgence procédurale</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 h-32"
                    placeholder="Votre message à l'avocat..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pièces jointes</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <Upload className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Glissez vos fichiers ici ou cliquez pour parcourir</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowContactAvocatModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    // Traitement de l'envoi
                    setShowContactAvocatModal(false);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Envoyer le message
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Retour en Amiable */}
        {showRetourAmiableModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Retourner en Recouvrement Amiable</h3>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Attention</h4>
                    <p className="text-sm text-yellow-700">Cette action va suspendre la procédure contentieuse en cours et transférer le dossier en recouvrement amiable.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Motif du retour en amiable</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option>Proposition de règlement du débiteur</option>
                    <option>Demande d'échelonnement acceptée</option>
                    <option>Difficultés temporaires du débiteur</option>
                    <option>Accord transactionnel en vue</option>
                    <option>Autres motifs</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nouvelle stratégie amiable</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span className="text-sm">Plan d'apurement négocié</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span className="text-sm">Remise commerciale accordée</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span className="text-sm">Garanties supplémentaires exigées</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Agent assigné au suivi</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option>Marie Diallo (Senior)</option>
                    <option>Jean Kouassi (Junior)</option>
                    <option>Aminata Traoré (Négociatrice)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Instructions particulières</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24"
                    placeholder="Instructions pour la nouvelle approche amiable..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Échéance de reprise contentieuse</label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowRetourAmiableModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    // Traitement du retour
                    setShowRetourAmiableModal(false);
                  }}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Confirmer le retour en amiable
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Demander Expertise */}
        {showExpertiseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Demander une Expertise</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type d'expertise</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option>Expertise comptable</option>
                    <option>Expertise technique</option>
                    <option>Expertise de gestion</option>
                    <option>Expertise amiable</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Objet de l'expertise</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24"
                    placeholder="Précisez les points à faire examiner par l'expert..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expert suggéré</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Nom de l'expert proposé (optionnel)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Budget estimé</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Coût estimé de l'expertise"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Délai souhaité</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option>1 mois</option>
                    <option>2 mois</option>
                    <option>3 mois</option>
                    <option>6 mois</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pièces à transmettre à l'expert</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" defaultChecked />
                      <span className="text-sm">Dossier complet du contentieux</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span className="text-sm">Documents comptables</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span className="text-sm">Correspondances</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowExpertiseModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    // Traitement de la demande
                    setShowExpertiseModal(false);
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Demander l'expertise
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Clôturer Dossier */}
        {showClotureModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Clôturer le Dossier Contentieux</h3>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-800">Action irréversible</h4>
                    <p className="text-sm text-red-700">La clôture du dossier est définitive. Assurez-vous que toutes les actions nécessaires ont été entreprises.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Motif de clôture</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option>Recouvrement total</option>
                    <option>Accord transactionnel</option>
                    <option>Insolvabilité avérée du débiteur</option>
                    <option>Prescription de la créance</option>
                    <option>Abandon de créance</option>
                    <option>Décision de justice défavorable définitive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Montant finalement recouvré</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Montant total récupéré"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Coûts totaux de la procédure</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Frais d'avocat, d'huissier, de procédure..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Résumé final</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 h-32"
                    placeholder="Bilan de la procédure, leçons apprises, recommandations..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Actions post-clôture</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span className="text-sm">Archiver le dossier</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span className="text-sm">Mise à jour du scoring client</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span className="text-sm">Notification à la direction</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowClotureModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    // Traitement de la clôture
                    setShowClotureModal(false);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Clôturer définitivement
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Modifier Dossier Contentieux */}
        {showEditContentieuxModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-lg font-semibold text-[#171717]">
                    Modifier Dossier Contentieux
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {editContentieuxFormData.numeroRef} - {editContentieuxFormData.client}
                  </p>
                </div>
                <button
                  onClick={() => setShowEditContentieuxModal(false)}
                  className="text-gray-700 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Navigation par onglets */}
              <div className="border-b border-gray-200">
                <div className="flex overflow-x-auto px-4">
                  {[
                    { id: 'statut', label: 'Statut', icon: Scale, color: 'blue' },
                    { id: 'dates', label: 'Dates', icon: Calendar, color: 'purple' },
                    { id: 'juridiction', label: 'Juridiction', icon: Building, color: 'indigo' },
                    { id: 'intervenants', label: 'Intervenants', icon: Users, color: 'teal' },
                    { id: 'debiteur', label: 'Débiteur', icon: UserCircle, color: 'red' },
                    { id: 'montants', label: 'Montants', icon: DollarSign, color: 'orange' },
                    { id: 'suivi', label: 'Suivi', icon: Phone, color: 'green' },
                    { id: 'notes', label: 'Notes', icon: MessageSquare, color: 'gray' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setEditContentieuxActiveTab(tab.id)}
                      className={`flex items-center px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                        editContentieuxActiveTab === tab.id
                          ? `border-${tab.color}-500 text-${tab.color}-600 bg-${tab.color}-50`
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <tab.icon className="w-4 h-4 mr-2" />
                      <span className="text-sm font-medium">{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {/* Onglet: Statut & Procédure */}
                {editContentieuxActiveTab === 'statut' && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-blue-900 mb-4 flex items-center">
                      <Scale className="w-5 h-5 mr-2" />
                      Statut & Procédure
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Étape actuelle *</label>
                        <select
                          value={editContentieuxFormData.statutJuridique}
                          onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, statutJuridique: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="reglement_amiable">1. Règlement à l'amiable</option>
                          <option value="mise_demeure_huissier">2. Mise en demeure (Huissier)</option>
                          <option value="saisine_tribunal">3. Saisine au tribunal</option>
                          <option value="procedure_injonction">4. Procédure d'injonction</option>
                          <option value="titre_executoire">5. Titre exécutoire obtenu</option>
                          <option value="execution_forcee">6. Exécution forcée / Saisie</option>
                          <option value="cloture">Clôturé</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type de Procédure *</label>
                        <select
                          value={editContentieuxFormData.typeProcedure}
                          onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, typeProcedure: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="injonction_payer">Injonction de payer</option>
                          <option value="assignation_fond">Assignation au fond</option>
                          <option value="refere">Référé provision</option>
                          <option value="saisie_conservatoire">Saisie conservatoire</option>
                          <option value="saisie_attribution">Saisie-attribution</option>
                          <option value="saisie_vente">Saisie-vente</option>
                          <option value="procedure_collective">Procédure collective</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
                        <select
                          value={editContentieuxFormData.priorite}
                          onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, priorite: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="basse">Basse</option>
                          <option value="normale">Normale</option>
                          <option value="haute">Haute</option>
                          <option value="urgente">Urgente</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Chances de succès</label>
                        <select
                          value={editContentieuxFormData.chancesSucces}
                          onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, chancesSucces: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="faible">Faible (&lt;30%)</option>
                          <option value="moyenne">Moyenne (30-60%)</option>
                          <option value="elevee">Élevée (60-80%)</option>
                          <option value="tres_elevee">Très élevée (&gt;80%)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Onglet: Dates Clés */}
                {editContentieuxActiveTab === 'dates' && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-purple-900 mb-4 flex items-center">
                      <Calendar className="w-5 h-5 mr-2" />
                      Dates Clés de la Procédure
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date transfert contentieux</label>
                        <input
                          type="date"
                          value={editContentieuxFormData.dateTransfert}
                          onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, dateTransfert: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date mise en demeure</label>
                        <input
                          type="date"
                          value={editContentieuxFormData.dateMiseEnDemeure}
                          onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, dateMiseEnDemeure: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date assignation</label>
                        <input
                          type="date"
                          value={editContentieuxFormData.dateAssignation}
                          onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, dateAssignation: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date audience</label>
                        <input
                          type="date"
                          value={editContentieuxFormData.dateAudience}
                          onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, dateAudience: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date titre exécutoire</label>
                        <input
                          type="date"
                          value={editContentieuxFormData.dateTitreExecutoire}
                          onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, dateTitreExecutoire: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date exécution</label>
                        <input
                          type="date"
                          value={editContentieuxFormData.dateExecution}
                          onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, dateExecution: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Prochaine échéance</label>
                      <input
                        type="text"
                        value={editContentieuxFormData.prochaineEcheance}
                        onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, prochaineEcheance: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                        placeholder="ex: Audience 15/02/2024 à 10h"
                      />
                    </div>
                  </div>
                )}

                {/* Onglet: Juridiction */}
                {editContentieuxActiveTab === 'juridiction' && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-indigo-900 mb-4 flex items-center">
                      <Building className="w-5 h-5 mr-2" />
                      Juridiction
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tribunal compétent</label>
                        <input
                          type="text"
                          value={editContentieuxFormData.tribunal}
                          onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, tribunal: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                          placeholder="ex: Tribunal de Commerce de Brazzaville"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">N° RG (Répertoire Général)</label>
                        <input
                          type="text"
                          value={editContentieuxFormData.numeroRG}
                          onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, numeroRG: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                          placeholder="ex: RG 2024/001234"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Chambre</label>
                        <input
                          type="text"
                          value={editContentieuxFormData.chambre}
                          onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, chambre: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                          placeholder="ex: 1ère Chambre"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Adresse tribunal</label>
                        <input
                          type="text"
                          value={editContentieuxFormData.tribunalAdresse}
                          onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, tribunalAdresse: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                          placeholder="Adresse du tribunal"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Onglet: Intervenants */}
                {editContentieuxActiveTab === 'intervenants' && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-teal-900 mb-4 flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      Intervenants
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Avocat */}
                      <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
                        <h4 className="font-medium text-teal-800 mb-3 flex items-center">
                          <Briefcase className="w-4 h-4 mr-2" />
                          Avocat
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">Nom</label>
                            <input
                              type="text"
                              value={editContentieuxFormData.avocat}
                              onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, avocat: e.target.value})}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                              placeholder="Maître..."
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">Téléphone</label>
                            <input
                              type="tel"
                              value={editContentieuxFormData.avocatTel}
                              onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, avocatTel: e.target.value})}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                              placeholder="+242 06 XXX XX XX"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">Email</label>
                            <input
                              type="email"
                              value={editContentieuxFormData.avocatEmail}
                              onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, avocatEmail: e.target.value})}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                              placeholder="avocat@cabinet.com"
                            />
                          </div>
                        </div>
                      </div>
                      {/* Huissier */}
                      <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
                        <h4 className="font-medium text-teal-800 mb-3 flex items-center">
                          <Gavel className="w-4 h-4 mr-2" />
                          Huissier de Justice
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">Nom / Étude</label>
                            <input
                              type="text"
                              value={editContentieuxFormData.huissier}
                              onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, huissier: e.target.value})}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                              placeholder="SCP Huissiers..."
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">Téléphone</label>
                            <input
                              type="tel"
                              value={editContentieuxFormData.huissierTel}
                              onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, huissierTel: e.target.value})}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                              placeholder="+242 06 XXX XX XX"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">Email</label>
                            <input
                              type="email"
                              value={editContentieuxFormData.huissierEmail}
                              onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, huissierEmail: e.target.value})}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                              placeholder="contact@huissier.com"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Onglet: Informations Débiteur */}
                {editContentieuxActiveTab === 'debiteur' && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-red-900 mb-4 flex items-center">
                      <UserCircle className="w-5 h-5 mr-2" />
                      Informations Débiteur
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Adresse complète</label>
                        <textarea
                          value={editContentieuxFormData.debiteurAdresse}
                          onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, debiteurAdresse: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 h-20"
                          placeholder="Adresse du débiteur"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                        <input
                          type="tel"
                          value={editContentieuxFormData.debiteurTel}
                          onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, debiteurTel: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500"
                          placeholder="+242 06 XXX XX XX"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={editContentieuxFormData.debiteurEmail}
                          onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, debiteurEmail: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500"
                          placeholder="email@debiteur.com"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Représentant légal</label>
                        <input
                          type="text"
                          value={editContentieuxFormData.debiteurRepresentant}
                          onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, debiteurRepresentant: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500"
                          placeholder="Nom du représentant"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Onglet: Montants & Frais */}
                {editContentieuxActiveTab === 'montants' && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-orange-900 mb-4 flex items-center">
                      <DollarSign className="w-5 h-5 mr-2" />
                      Montants & Frais (FCFA)
                    </h3>

                    {/* Formulaire d'ajout de dépense */}
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <h4 className="font-medium text-orange-800 mb-3 flex items-center">
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter une dépense
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Type de dépense *</label>
                          <select
                            value={newDepense.type}
                            onChange={(e) => setNewDepense({...newDepense, type: e.target.value})}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                          >
                            {typesDepenses.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
                          <input
                            type="date"
                            value={newDepense.date}
                            onChange={(e) => setNewDepense({...newDepense, date: e.target.value})}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Montant (FCFA) *</label>
                          <input
                            type="number"
                            value={newDepense.montant || ''}
                            onChange={(e) => setNewDepense({...newDepense, montant: Number(e.target.value)})}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Destinataire</label>
                          <input
                            type="text"
                            value={newDepense.destinataire}
                            onChange={(e) => setNewDepense({...newDepense, destinataire: e.target.value})}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                            placeholder="Bénéficiaire..."
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            onClick={addDepense}
                            className="w-full bg-orange-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-orange-700 transition-colors flex items-center justify-center"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Ajouter
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Référence / N° Pièce</label>
                          <input
                            type="text"
                            value={newDepense.reference}
                            onChange={(e) => setNewDepense({...newDepense, reference: e.target.value})}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                            placeholder="N° facture, reçu..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                          <input
                            type="text"
                            value={newDepense.notes}
                            onChange={(e) => setNewDepense({...newDepense, notes: e.target.value})}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                            placeholder="Observations..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Liste des dépenses */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destinataire</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Référence</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {contentieuxDepenses.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                Aucune dépense enregistrée. Utilisez le formulaire ci-dessus pour ajouter des dépenses.
                              </td>
                            </tr>
                          ) : (
                            contentieuxDepenses.map((dep) => (
                              <tr key={dep.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    dep.type === 'creance_principale' ? 'bg-blue-100 text-blue-800' :
                                    dep.type === 'interets_retard' ? 'bg-purple-100 text-purple-800' :
                                    dep.type === 'honoraires_avocat' ? 'bg-teal-100 text-teal-800' :
                                    dep.type === 'frais_huissier' ? 'bg-indigo-100 text-indigo-800' :
                                    dep.type === 'provision' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-orange-100 text-orange-800'
                                  }`}>
                                    {typesDepenses.find(t => t.value === dep.type)?.label || dep.type}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {new Date(dep.date).toLocaleDateString('fr-FR')}
                                </td>
                                <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                                  {dep.montant.toLocaleString()} FCFA
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {dep.destinataire || '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">
                                  {dep.reference || '-'}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() => removeDepense(dep.id)}
                                    className="text-red-600 hover:text-red-800 p-1"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Récapitulatif des totaux */}
                    {contentieuxDepenses.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Totaux par type */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <h4 className="font-medium text-gray-800 mb-3">Récapitulatif par type</h4>
                          <div className="space-y-2">
                            {typesDepenses.map(type => {
                              const total = getTotalByType(type.value);
                              if (total === 0) return null;
                              return (
                                <div key={type.value} className="flex justify-between items-center text-sm">
                                  <span className="text-gray-600">{type.label}:</span>
                                  <span className="font-medium text-gray-800">{total.toLocaleString()} FCFA</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Total général */}
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-300">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-sm text-gray-600">Créance (principal + intérêts):</span>
                            <span className="font-semibold text-orange-700">
                              {(getTotalByType('creance_principale') + getTotalByType('interets_retard')).toLocaleString()} FCFA
                            </span>
                          </div>
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-sm text-gray-600">Frais de procédure:</span>
                            <span className="font-semibold text-orange-700">
                              {(getTotalDepenses() - getTotalByType('creance_principale') - getTotalByType('interets_retard') - getTotalByType('provision')).toLocaleString()} FCFA
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-3 border-t border-orange-200">
                            <span className="font-medium text-gray-700">MONTANT TOTAL:</span>
                            <span className="text-lg font-bold text-orange-600">
                              {getTotalDepenses().toLocaleString()} FCFA
                            </span>
                          </div>
                          <div className="mt-3 pt-3 border-t border-orange-200">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">Provision constituée:</span>
                              <span className="font-medium text-yellow-700">
                                {getTotalByType('provision').toLocaleString()} FCFA
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Onglet: Suivi & Contacts */}
                {editContentieuxActiveTab === 'suivi' && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-green-900 mb-4 flex items-center">
                      <Clock className="w-5 h-5 mr-2" />
                      Historique des Étapes & Suivi
                    </h3>

                    {/* Formulaire d'ajout d'étape */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-xl border border-green-200 shadow-sm">
                      <h4 className="font-semibold text-green-800 mb-4 flex items-center text-base">
                        <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center mr-3">
                          <Plus className="w-5 h-5 text-white" />
                        </div>
                        Nouvelle étape de suivi
                      </h4>

                      {/* Section 1: Informations principales */}
                      <div className="bg-white p-4 rounded-lg border border-green-100 mb-4">
                        <div className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-3 flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          Informations de l'étape
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type d'action *</label>
                            <select
                              value={newSuiviEtape.type}
                              onChange={(e) => setNewSuiviEtape({...newSuiviEtape, type: e.target.value})}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                            >
                              {typesEtapesSuivi.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                            <input
                              type="date"
                              value={newSuiviEtape.date}
                              onChange={(e) => setNewSuiviEtape({...newSuiviEtape, date: e.target.value})}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Heure</label>
                            <input
                              type="time"
                              value={newSuiviEtape.heure}
                              onChange={(e) => setNewSuiviEtape({...newSuiviEtape, heure: e.target.value})}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Résultat</label>
                            <select
                              value={newSuiviEtape.resultat}
                              onChange={(e) => setNewSuiviEtape({...newSuiviEtape, resultat: e.target.value})}
                              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                                newSuiviEtape.resultat === 'reussi' ? 'bg-green-50 border-green-300 text-green-800' :
                                newSuiviEtape.resultat === 'echoue' ? 'bg-red-50 border-red-300 text-red-800' :
                                newSuiviEtape.resultat === 'reporte' ? 'bg-yellow-50 border-yellow-300 text-yellow-800' :
                                'bg-white border-gray-300'
                              }`}
                            >
                              {resultatsEtape.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Intervenants */}
                      <div className="bg-white p-4 rounded-lg border border-green-100 mb-4">
                        <div className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-3 flex items-center">
                          <Users className="w-3 h-3 mr-1" />
                          Intervenants
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Qui a effectué l'action ?</label>
                            <input
                              type="text"
                              value={newSuiviEtape.intervenant}
                              onChange={(e) => setNewSuiviEtape({...newSuiviEtape, intervenant: e.target.value})}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              placeholder="Ex: Jean DUPONT"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fonction / Rôle</label>
                            <select
                              value={newSuiviEtape.roleIntervenant}
                              onChange={(e) => setNewSuiviEtape({...newSuiviEtape, roleIntervenant: e.target.value})}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                            >
                              <option value="">-- Sélectionner --</option>
                              <option value="responsable_recouvrement">Responsable recouvrement</option>
                              <option value="agent_recouvrement">Agent de recouvrement</option>
                              <option value="comptable">Comptable</option>
                              <option value="directeur_financier">Directeur financier</option>
                              <option value="commercial">Commercial</option>
                              <option value="avocat">Avocat</option>
                              <option value="huissier">Huissier de justice</option>
                              <option value="expert">Expert / Consultant</option>
                              <option value="autre">Autre</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Personne contactée (débiteur)</label>
                            <input
                              type="text"
                              value={newSuiviEtape.contact}
                              onChange={(e) => setNewSuiviEtape({...newSuiviEtape, contact: e.target.value})}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              placeholder="Ex: M. KOUASSI (DG)"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Notes et suivi */}
                      <div className="bg-white p-4 rounded-lg border border-green-100 mb-4">
                        <div className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-3 flex items-center">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          Compte-rendu & Suivi
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Notes détaillées / Compte-rendu de l'échange
                            </label>
                            <textarea
                              value={newSuiviEtape.notes}
                              onChange={(e) => setNewSuiviEtape({...newSuiviEtape, notes: e.target.value})}
                              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                              rows={5}
                              placeholder="Décrivez en détail :&#10;- Le contenu de l'échange&#10;- Les engagements pris&#10;- Les difficultés rencontrées&#10;- Les décisions prises..."
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                <ArrowRight className="w-4 h-4 inline mr-1 text-orange-500" />
                                Prochaine action à effectuer
                              </label>
                              <input
                                type="text"
                                value={newSuiviEtape.prochainRdv}
                                onChange={(e) => setNewSuiviEtape({...newSuiviEtape, prochainRdv: e.target.value})}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                placeholder="Ex: Relancer le 20/12/2025 si pas de paiement"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                <FileText className="w-4 h-4 inline mr-1 text-blue-500" />
                                Documents joints (références)
                              </label>
                              <input
                                type="text"
                                value={newSuiviEtape.documentsJoints}
                                onChange={(e) => setNewSuiviEtape({...newSuiviEtape, documentsJoints: e.target.value})}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                placeholder="Ex: Courrier ref. LR-2024-001, Email du 15/12"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bouton d'ajout */}
                      <button
                        onClick={addSuiviEtape}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg px-6 py-3 font-medium hover:from-green-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center"
                      >
                        <Plus className="w-5 h-5 mr-2" />
                        Enregistrer cette étape de suivi
                      </button>
                    </div>

                    {/* Timeline des étapes */}
                    <div className="mt-6">
                      <h4 className="font-medium text-gray-800 mb-4">
                        Chronologie ({suiviEtapes.length} étape{suiviEtapes.length > 1 ? 's' : ''})
                      </h4>

                      {suiviEtapes.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                          <Clock className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                          <p>Aucune étape de suivi enregistrée</p>
                          <p className="text-sm">Utilisez le formulaire ci-dessus pour ajouter des étapes</p>
                        </div>
                      ) : (
                        <div className="relative">
                          {/* Ligne verticale de timeline */}
                          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-green-200"></div>

                          <div className="space-y-4">
                            {suiviEtapes.map((etape, index) => (
                              <div key={etape.id} className="relative flex items-start">
                                {/* Point de timeline */}
                                <div className={`absolute left-4 w-5 h-5 rounded-full border-2 ${
                                  etape.resultat === 'reussi' ? 'bg-green-500 border-green-600' :
                                  etape.resultat === 'echoue' ? 'bg-red-500 border-red-600' :
                                  etape.resultat === 'reporte' ? 'bg-yellow-500 border-yellow-600' :
                                  etape.resultat === 'annule' ? 'bg-orange-500 border-orange-600' :
                                  'bg-gray-300 border-gray-400'
                                }`}>
                                  {etape.resultat === 'reussi' && <CheckCircle className="w-3 h-3 text-white m-0.5" />}
                                </div>

                                {/* Carte de l'étape */}
                                <div className="ml-12 flex-1 bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-2 mb-2">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                          etape.type === 'appel_telephonique' ? 'bg-blue-100 text-blue-800' :
                                          etape.type === 'envoi_courrier' || etape.type === 'envoi_email' ? 'bg-purple-100 text-purple-800' :
                                          etape.type === 'reunion' ? 'bg-teal-100 text-teal-800' :
                                          etape.type === 'mise_demeure' ? 'bg-red-100 text-red-800' :
                                          etape.type === 'audience' ? 'bg-indigo-100 text-indigo-800' :
                                          etape.type === 'paiement_recu' ? 'bg-green-100 text-green-800' :
                                          'bg-gray-100 text-gray-800'
                                        }`}>
                                          {typesEtapesSuivi.find(t => t.value === etape.type)?.label || etape.type}
                                        </span>
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                          etape.resultat === 'reussi' ? 'bg-green-100 text-green-800' :
                                          etape.resultat === 'echoue' ? 'bg-red-100 text-red-800' :
                                          etape.resultat === 'reporte' ? 'bg-yellow-100 text-yellow-800' :
                                          etape.resultat === 'annule' ? 'bg-orange-100 text-orange-800' :
                                          'bg-gray-100 text-gray-600'
                                        }`}>
                                          {resultatsEtape.find(r => r.value === etape.resultat)?.label || 'En attente'}
                                        </span>
                                      </div>

                                      <div className="flex items-center text-sm text-gray-500 mb-2">
                                        <Calendar className="w-4 h-4 mr-1" />
                                        {new Date(etape.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        {etape.heure && <span className="ml-2">à {etape.heure}</span>}
                                      </div>

                                      {(etape.intervenant || etape.contact) && (
                                        <div className="flex flex-wrap gap-3 text-sm mb-2">
                                          {etape.intervenant && (
                                            <div className="flex items-center text-gray-600">
                                              <Users className="w-4 h-4 mr-1 text-green-600" />
                                              <span className="font-medium">{etape.intervenant}</span>
                                              {etape.roleIntervenant && (
                                                <span className="text-gray-400 ml-1">({etape.roleIntervenant})</span>
                                              )}
                                            </div>
                                          )}
                                          {etape.contact && (
                                            <div className="flex items-center text-gray-600">
                                              <UserCircle className="w-4 h-4 mr-1 text-blue-600" />
                                              Contact: {etape.contact}
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {etape.notes && (
                                        <div className="bg-gray-50 p-2 rounded text-sm text-gray-700 mb-2">
                                          {etape.notes}
                                        </div>
                                      )}

                                      {etape.prochainRdv && (
                                        <div className="text-sm text-orange-600 flex items-center">
                                          <ArrowRight className="w-4 h-4 mr-1" />
                                          Prochaine action: {etape.prochainRdv}
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex items-center space-x-2 ml-4">
                                      <select
                                        value={etape.resultat}
                                        onChange={(e) => updateSuiviEtapeResultat(etape.id, e.target.value)}
                                        className="text-xs border border-gray-300 rounded px-2 py-1"
                                      >
                                        {resultatsEtape.map(r => (
                                          <option key={r.value} value={r.value}>{r.label}</option>
                                        ))}
                                      </select>
                                      <button
                                        onClick={() => removeSuiviEtape(etape.id)}
                                        className="text-red-500 hover:text-red-700 p-1"
                                        title="Supprimer"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Résumé des étapes */}
                    {suiviEtapes.length > 0 && (
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
                        <h4 className="font-medium text-gray-800 mb-3">Résumé du suivi</h4>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                          <div className="bg-white p-3 rounded-lg border">
                            <div className="text-lg font-bold text-gray-700">{suiviEtapes.length}</div>
                            <div className="text-xs text-gray-500">Total étapes</div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border">
                            <div className="text-lg font-bold text-green-600">
                              {suiviEtapes.filter(e => e.resultat === 'reussi').length}
                            </div>
                            <div className="text-xs text-gray-500">Réussies</div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border">
                            <div className="text-lg font-bold text-red-600">
                              {suiviEtapes.filter(e => e.resultat === 'echoue').length}
                            </div>
                            <div className="text-xs text-gray-500">Échouées</div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border">
                            <div className="text-lg font-bold text-yellow-600">
                              {suiviEtapes.filter(e => e.resultat === 'reporte').length}
                            </div>
                            <div className="text-xs text-gray-500">Reportées</div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border">
                            <div className="text-lg font-bold text-gray-500">
                              {suiviEtapes.filter(e => e.resultat === 'en_attente').length}
                            </div>
                            <div className="text-xs text-gray-500">En attente</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Onglet: Analyse & Notes */}
                {editContentieuxActiveTab === 'notes' && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <MessageSquare className="w-5 h-5 mr-2" />
                      Analyse & Notes
                    </h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Motif du transfert en contentieux</label>
                      <textarea
                        value={editContentieuxFormData.motifTransfert}
                        onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, motifTransfert: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 focus:ring-2 focus:ring-gray-500"
                        placeholder="Décrivez le motif du transfert..."
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Résultat attendu</label>
                        <textarea
                          value={editContentieuxFormData.resultatAttendu}
                          onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, resultatAttendu: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 focus:ring-2 focus:ring-gray-500"
                          placeholder="Objectif de la procédure..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Risques identifiés</label>
                        <textarea
                          value={editContentieuxFormData.risques}
                          onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, risques: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 focus:ring-2 focus:ring-gray-500"
                          placeholder="Risques potentiels..."
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes complémentaires</label>
                      <textarea
                        value={editContentieuxFormData.notes}
                        onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, notes: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 h-32 focus:ring-2 focus:ring-gray-500"
                        placeholder="Informations supplémentaires, historique, observations..."
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-500">
                  Dernière modification: {new Date().toLocaleDateString()}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowEditContentieuxModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveContentieux}
                    className="px-6 py-2 bg-[#171717] text-white rounded-lg hover:bg-[#262626] transition-colors flex items-center space-x-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Enregistrer les modifications</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Gestion Workflow Contentieux */}
        {showWorkflowModal && selectedDossierWorkflow && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-indigo-600">
                <div className="text-white">
                  <h2 className="text-lg font-semibold flex items-center">
                    <Activity className="w-6 h-6 mr-2" />
                    Workflow de Procédure Contentieux
                  </h2>
                  <p className="text-purple-100 mt-1">
                    {selectedDossierWorkflow.numeroRef} - {selectedDossierWorkflow.client}
                  </p>
                </div>
                <button
                  onClick={() => setShowWorkflowModal(false)}
                  className="text-white hover:text-purple-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6">
                {/* Barre de progression */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Progression du dossier</span>
                    <span className="text-sm font-medium text-purple-600">
                      {workflowData[selectedDossierWorkflow.id]?.etapes.filter(e => e.statut === 'completed').length || 0} / {workflowData[selectedDossierWorkflow.id]?.etapes.length || 6} étapes
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${((workflowData[selectedDossierWorkflow.id]?.etapes.filter(e => e.statut === 'completed').length || 0) / (workflowData[selectedDossierWorkflow.id]?.etapes.length || 6)) * 100}%`
                      }}
                    />
                  </div>
                </div>

                {/* Liste des étapes */}
                <div className="space-y-4">
                  {(workflowData[selectedDossierWorkflow.id]?.etapes || defaultWorkflowEtapes.map(e => ({ ...e, statut: 'pending', commentaires: [] }))).map((etape, index) => (
                    <div
                      key={etape.id}
                      className={`border rounded-lg p-4 ${
                        etape.statut === 'completed' ? 'border-green-300 bg-green-50' :
                        etape.statut === 'in_progress' ? 'border-blue-300 bg-blue-50' :
                        etape.statut === 'skipped' ? 'border-gray-300 bg-gray-50 opacity-60' :
                        'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          {/* Numéro de l'étape */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                            etape.statut === 'completed' ? 'bg-green-500' :
                            etape.statut === 'in_progress' ? 'bg-blue-500' :
                            etape.statut === 'skipped' ? 'bg-gray-400' :
                            'bg-gray-300'
                          }`}>
                            {etape.statut === 'completed' ? <CheckCircle className="w-5 h-5" /> : index + 1}
                          </div>

                          {/* Détails de l'étape */}
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-semibold text-gray-900">{etape.titre}</h4>
                              {etape.custom && (
                                <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">Personnalisé</span>
                              )}
                              {etape.obligatoire && (
                                <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">Obligatoire</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{etape.description}</p>
                            {etape.delaiJours > 0 && (
                              <p className="text-xs text-gray-500 mt-1">Délai estimé: {etape.delaiJours} jours</p>
                            )}
                            {etape.dateDebut && (
                              <p className="text-xs text-blue-600 mt-1">Démarré le: {etape.dateDebut}</p>
                            )}
                            {etape.dateFin && (
                              <p className="text-xs text-green-600 mt-1">Terminé le: {etape.dateFin}</p>
                            )}

                            {/* Commentaires de l'étape */}
                            {etape.commentaires && etape.commentaires.length > 0 && (
                              <div className="mt-3 space-y-2">
                                <p className="text-xs font-medium text-gray-700">Commentaires ({etape.commentaires.length}):</p>
                                {etape.commentaires.map(comment => (
                                  <div key={comment.id} className="bg-white border border-gray-200 rounded p-2 text-sm">
                                    <p className="text-gray-700">{comment.texte}</p>
                                    <p className="text-xs text-gray-500 mt-1">{comment.auteur} - {comment.date}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col space-y-2">
                          {/* Boutons de statut */}
                          <div className="flex space-x-1">
                            {etape.statut !== 'completed' && (
                              <button
                                onClick={() => updateEtapeStatus(selectedDossierWorkflow.id, etape.id, 'in_progress')}
                                className={`px-2 py-1 text-xs rounded ${etape.statut === 'in_progress' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                                title="En cours"
                              >
                                <Clock className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={() => updateEtapeStatus(selectedDossierWorkflow.id, etape.id, 'completed')}
                              className={`px-2 py-1 text-xs rounded ${etape.statut === 'completed' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                              title="Terminé"
                            >
                              <CheckCircle className="w-3 h-3" />
                            </button>
                            {!etape.obligatoire && (
                              <button
                                onClick={() => updateEtapeStatus(selectedDossierWorkflow.id, etape.id, 'skipped')}
                                className={`px-2 py-1 text-xs rounded ${etape.statut === 'skipped' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                title="Passer"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Bouton commentaire */}
                          <button
                            onClick={() => {
                              setSelectedEtape(etape);
                              setShowCommentModal(true);
                            }}
                            className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 flex items-center justify-center space-x-1"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>Commenter</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bouton ajouter étape */}
                <button
                  onClick={() => setShowAddEtapeModal(true)}
                  className="mt-4 w-full py-3 border-2 border-dashed border-purple-300 rounded-lg text-purple-600 hover:bg-purple-50 flex items-center justify-center space-x-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>Ajouter une étape personnalisée</span>
                </button>
              </div>

              {/* Footer */}
              <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setShowWorkflowModal(false)}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Ajouter Étape Personnalisée */}
        {showAddEtapeModal && selectedDossierWorkflow && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Ajouter une étape personnalisée</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titre de l'étape</label>
                  <input
                    type="text"
                    value={newEtape.titre}
                    onChange={(e) => setNewEtape({ ...newEtape, titre: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                    placeholder="Ex: Négociation complémentaire"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newEtape.description}
                    onChange={(e) => setNewEtape({ ...newEtape, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 focus:ring-2 focus:ring-purple-500"
                    placeholder="Décrivez cette étape..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date prévue (optionnel)</label>
                  <input
                    type="date"
                    value={newEtape.datePrevu}
                    onChange={(e) => setNewEtape({ ...newEtape, datePrevu: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowAddEtapeModal(false);
                    setNewEtape({ titre: '', description: '', datePrevu: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={() => addCustomEtape(selectedDossierWorkflow.id)}
                  disabled={!newEtape.titre}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  Ajouter l'étape
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Ajouter Commentaire */}
        {showCommentModal && selectedEtape && selectedDossierWorkflow && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Ajouter un commentaire</h3>
                <p className="text-sm text-gray-600 mt-1">Étape: {selectedEtape.titre}</p>
              </div>
              <div className="p-6">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 h-32 focus:ring-2 focus:ring-purple-500"
                  placeholder="Ajoutez votre commentaire, observation ou mise à jour..."
                />
              </div>
              <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowCommentModal(false);
                    setNewComment('');
                    setSelectedEtape(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={() => addCommentToEtape(selectedDossierWorkflow.id, selectedEtape.id, newComment)}
                  disabled={!newComment}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  Ajouter le commentaire
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Détail Dossier d'Exécution */}
        {showExecutionDetailModal && selectedExecutionDossier && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-lg font-semibold text-[#171717]">
                    Détail Exécution - {selectedExecutionDossier.reference}
                  </h2>
                  <p className="text-gray-600 mt-1">Client: {selectedExecutionDossier.client}</p>
                </div>
                <button
                  onClick={() => setShowExecutionDetailModal(false)}
                  className="text-gray-700 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Informations générales */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-semibold text-[#171717] mb-3">Informations Générales</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Référence:</span>
                        <span className="font-medium">{selectedExecutionDossier.reference}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type d'exécution:</span>
                        <span className="font-medium">{selectedExecutionDossier.typeExecution}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Montant à recouvrer:</span>
                        <span className="font-medium text-[#171717]">{selectedExecutionDossier.montant.toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Statut:</span>
                        <span className={`font-medium ${
                          selectedExecutionDossier.statut === 'Exécuté' ? 'text-green-600' :
                          selectedExecutionDossier.statut === 'En cours' ? 'text-yellow-600' :
                          'text-orange-600'
                        }`}>
                          {selectedExecutionDossier.statut}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-50 rounded-lg p-4">
                    <h3 className="font-semibold text-[#171717] mb-3">Dates & Délais</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date de début:</span>
                        <span className="font-medium">{new Date(selectedExecutionDossier.dateDebut).toLocaleDateString()}</span>
                      </div>
                      {selectedExecutionDossier.dateFin && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Date de fin:</span>
                          <span className="font-medium">{new Date(selectedExecutionDossier.dateFin).toLocaleDateString()}</span>
                        </div>
                      )}
                      {selectedExecutionDossier.datePrevisionnelle && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Date prévisionnelle:</span>
                          <span className="font-medium">{new Date(selectedExecutionDossier.datePrevisionnelle).toLocaleDateString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Huissier:</span>
                        <span className="font-medium">{selectedExecutionDossier.huissier}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Détails spécifiques selon le type d'exécution */}
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <h3 className="font-semibold text-[#171717]">Détails de l'Exécution</h3>
                  </div>
                  <div className="p-4">
                    {selectedExecutionDossier.typeExecution === 'Saisie-attribution' && (
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Comptes saisis</h4>
                          <div className="space-y-2">
                            {selectedExecutionDossier.comptesSaisis?.map((compte, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span className="text-sm">{compte}</span>
                                <span className="text-xs text-green-600">Actif</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Montant saisi:</span>
                            <span className="font-semibold text-green-600">{selectedExecutionDossier.montantSaisi?.toLocaleString()} FCFA</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedExecutionDossier.typeExecution === 'Saisie-vente' && (
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Biens saisis</h4>
                          <div className="space-y-2">
                            {selectedExecutionDossier.biensSaisis?.map((bien, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span className="text-sm">{bien}</span>
                                <span className="text-xs text-blue-600">En cours d'évaluation</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Valeur estimée:</span>
                            <span className="font-semibold text-blue-600">{selectedExecutionDossier.montantEstime?.toLocaleString()} FCFA</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedExecutionDossier.typeExecution === 'Saisie sur salaire' && (
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-600">Employeur:</span>
                            <span className="font-medium">{selectedExecutionDossier.employeur}</span>
                          </div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-600">Saisie mensuelle:</span>
                            <span className="font-medium">{selectedExecutionDossier.montantMensuel?.toLocaleString()} FCFA</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Montant récupéré:</span>
                            <span className="font-semibold text-green-600">{selectedExecutionDossier.montantRecupere?.toLocaleString()} FCFA</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Frais d'huissier:</span>
                        <span className="font-medium text-red-600">{selectedExecutionDossier.fraisHuissier?.toLocaleString()} FCFA</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => setShowExecutionDetailModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Fermer
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Modifier l'exécution
                  </button>
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    Générer rapport
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    );

    function renderContentieuxDetailPage() {
      return (
        <div className="space-y-6">
          {/* En-tête avec bouton retour */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  setShowContentieuxDetailPage(false);
                  setSelectedContentieuxDetail(null);
                  setActiveContentieuxTab('general');
                }}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Retour aux dossiers contentieux</span>
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  Dossier Contentieux {selectedContentieuxDetail.numeroRef}
                </h1>
                <p className="text-gray-600">{selectedContentieuxDetail.client}</p>
              </div>
            </div>

            {/* Statut et actions rapides */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-700">Statut</div>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  selectedContentieuxDetail.statutJuridique === 'execution' ? 'bg-purple-100 text-purple-800' :
                  selectedContentieuxDetail.statutJuridique === 'jugement' ? 'bg-green-100 text-green-800' :
                  selectedContentieuxDetail.statutJuridique === 'assignation' ? 'bg-blue-100 text-blue-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {selectedContentieuxDetail.statutJuridique?.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-700">Montant Total</div>
                <div className="text-lg font-bold text-red-600">
                  {selectedContentieuxDetail.montantTotal?.toLocaleString()} FCFA
                </div>
              </div>
            </div>
          </div>

          {/* Navigation par onglets */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6 overflow-x-auto">
                {contentieuxDetailTabs.map((tab) => {
                  const IconComponent = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveContentieuxTab(tab.id)}
                      className={`
                        flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
                        ${activeContentieuxTab === tab.id
                          ? 'border-red-500 text-red-600'
                          : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'
                        }
                      `}
                    >
                      <IconComponent className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Contenu des onglets */}
            <div className="p-6">
              {renderContentieuxTabContent()}
            </div>
          </div>
        </div>
      );
    }

    function renderContentieuxTabContent() {
      switch (activeContentieuxTab) {
        case 'general':
          return renderGeneralTab();
        case 'procedure':
          return renderProcedureTab();
        case 'chronologie':
          return renderChronologieTab();
        case 'documents':
          return renderDocumentsTab();
        case 'frais':
          return renderFraisTab();
        case 'correspondance':
          return renderCorrespondanceTab();
        case 'execution':
          return renderExecutionTab();
        case 'resultats':
          return renderResultatsTab();
        default:
          return renderGeneralTab();
      }
    }

    function renderGeneralTab() {
      return (
        <div className="space-y-6">
          {/* Informations générales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-red-50 rounded-lg p-4">
              <h3 className="font-semibold text-[#171717] mb-3">Informations Contentieuses</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Référence:</span>
                  <span className="font-medium">{selectedContentieuxDetail.numeroRef}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Origine amiable:</span>
                  <span className="font-medium text-blue-600">{selectedContentieuxDetail.origineAmiable}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date de transfert:</span>
                  <span className="font-medium">{selectedContentieuxDetail.dateTransfert}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Jours restants:</span>
                  <span className={`font-medium ${selectedContentieuxDetail.joursRestants <= 5 ? 'text-red-600' : 'text-orange-600'}`}>
                    {selectedContentieuxDetail.joursRestants} jours
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <h3 className="font-semibold text-[#171717] mb-3">Montants</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Principal:</span>
                  <span className="font-medium text-[#171717]">{selectedContentieuxDetail.montantPrincipal?.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Intérêts de retard:</span>
                  <span className="font-medium text-orange-600">{selectedContentieuxDetail.interetsRetard?.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Frais de procédure:</span>
                  <span className="font-medium text-red-600">{selectedContentieuxDetail.fraisProcedure?.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600 font-semibold">Montant total:</span>
                  <span className="font-bold text-[#171717]">{selectedContentieuxDetail.montantTotal?.toLocaleString()} FCFA</span>
                </div>
              </div>
            </div>
          </div>

          {/* Motif du transfert */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-[#171717] mb-3">Motif du Transfert en Contentieux</h3>
            <p className="text-gray-700 leading-relaxed">{selectedContentieuxDetail.motifTransfert}</p>
          </div>

          {/* Actions rapides */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setActiveContentieuxTab('procedure')}
              className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Scale className="w-6 h-6 text-blue-600 mb-2" />
              <div className="font-medium text-blue-900">Gérer la Procédure</div>
              <div className="text-sm text-blue-600">Assignation, audiences, jugement</div>
            </button>
            <button
              onClick={() => setActiveContentieuxTab('documents')}
              className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <Archive className="w-6 h-6 text-green-600 mb-2" />
              <div className="font-medium text-green-900">Documents</div>
              <div className="text-sm text-green-600">Pièces, actes, correspondances</div>
            </button>
            <button
              onClick={() => setActiveContentieuxTab('execution')}
              className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <Hammer className="w-6 h-6 text-purple-600 mb-2" />
              <div className="font-medium text-purple-900">Exécution</div>
              <div className="text-sm text-purple-600">Saisies, voies d'exécution</div>
            </button>
          </div>
        </div>
      );
    }

    function renderProcedureTab() {
      const etapesProcedure = [
        {
          id: 1,
          titre: 'Mise en Demeure',
          statut: 'complete',
          date: '2024-01-10',
          description: 'Mise en demeure préalable envoyée au débiteur',
          documents: ['Mise en demeure', 'AR postal'],
          prochaine: false
        },
        {
          id: 2,
          titre: 'Assignation',
          statut: selectedContentieuxDetail.statutJuridique === 'assignation' ? 'current' :
                  selectedContentieuxDetail.statutJuridique === 'jugement' || selectedContentieuxDetail.statutJuridique === 'execution' ? 'complete' : 'pending',
          date: selectedContentieuxDetail.statutJuridique !== 'mise_demeure' ? '2024-01-20' : null,
          description: 'Assignation du débiteur devant le tribunal compétent',
          documents: ['Acte d\'assignation', 'Exploit d\'huissier'],
          prochaine: selectedContentieuxDetail.statutJuridique === 'mise_demeure'
        },
        {
          id: 3,
          titre: 'Audience',
          statut: selectedContentieuxDetail.statutJuridique === 'jugement' || selectedContentieuxDetail.statutJuridique === 'execution' ? 'complete' : 'pending',
          date: selectedContentieuxDetail.statutJuridique === 'jugement' || selectedContentieuxDetail.statutJuridique === 'execution' ? '2024-02-15' : selectedContentieuxDetail.prochaineEcheance,
          description: 'Comparution devant le tribunal',
          documents: ['Dossier de plaidoirie', 'Conclusions'],
          prochaine: selectedContentieuxDetail.statutJuridique === 'assignation'
        },
        {
          id: 4,
          titre: 'Jugement',
          statut: selectedContentieuxDetail.statutJuridique === 'jugement' || selectedContentieuxDetail.statutJuridique === 'execution' ? 'complete' : 'pending',
          date: selectedContentieuxDetail.statutJuridique === 'jugement' || selectedContentieuxDetail.statutJuridique === 'execution' ? '2024-02-20' : null,
          description: 'Prononcé du jugement par le tribunal',
          documents: ['Jugement', 'Certificat de non-appel'],
          prochaine: false
        },
        {
          id: 5,
          titre: 'Exécution',
          statut: selectedContentieuxDetail.statutJuridique === 'execution' ? 'current' : 'pending',
          date: selectedContentieuxDetail.statutJuridique === 'execution' ? '2024-03-01' : null,
          description: 'Mise en œuvre des mesures d\'exécution forcée',
          documents: ['Commandement', 'PV de saisie'],
          prochaine: selectedContentieuxDetail.statutJuridique === 'jugement'
        }
      ];

      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Étapes de la Procédure Contentieuse</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">Avocat:</span>
              <span className="font-medium">{selectedContentieuxDetail.avocat}</span>
            </div>
          </div>

          {/* Timeline des étapes */}
          <div className="space-y-4">
            {etapesProcedure.map((etape, index) => (
              <div key={etape.id} className="relative">
                {index !== etapesProcedure.length - 1 && (
                  <div className={`absolute left-4 top-8 h-16 w-0.5 ${
                    etape.statut === 'complete' ? 'bg-green-400' : 'bg-gray-300'
                  }`} />
                )}

                <div className={`flex items-start space-x-4 p-4 rounded-lg border-2 ${
                  etape.statut === 'current' ? 'border-blue-200 bg-blue-50' :
                  etape.statut === 'complete' ? 'border-green-200 bg-green-50' :
                  etape.prochaine ? 'border-orange-200 bg-orange-50' :
                  'border-gray-200 bg-gray-50'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    etape.statut === 'current' ? 'bg-blue-500 text-white' :
                    etape.statut === 'complete' ? 'bg-green-500 text-white' :
                    etape.prochaine ? 'bg-orange-500 text-white' :
                    'bg-gray-300 text-gray-600'
                  }`}>
                    {etape.statut === 'complete' ? <CheckCircle className="w-5 h-5" /> : etape.id}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className={`font-semibold ${
                        etape.statut === 'current' ? 'text-blue-900' :
                        etape.statut === 'complete' ? 'text-green-900' :
                        etape.prochaine ? 'text-orange-900' :
                        'text-gray-600'
                      }`}>
                        {etape.titre}
                        {etape.prochaine && <span className="ml-2 text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded">PROCHAINE ÉTAPE</span>}
                        {etape.statut === 'current' && <span className="ml-2 text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">EN COURS</span>}
                      </h4>
                      {etape.date && (
                        <span className="text-sm text-gray-700">{new Date(etape.date).toLocaleDateString()}</span>
                      )}
                    </div>

                    <p className="text-gray-700 mb-3">{etape.description}</p>

                    {etape.documents.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {etape.documents.map((doc, idx) => (
                          <span key={idx} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                            {doc}
                          </span>
                        ))}
                      </div>
                    )}

                    {etape.prochaine && (
                      <div className="mt-3 flex space-x-2">
                        <button className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700">
                          Programmer {etape.titre}
                        </button>
                        <button className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700">
                          Voir Modèles
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    function renderChronologieTab() {
      return (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Chronologie Complète du Dossier</h3>

          {/* Timeline détaillée */}
          <div className="space-y-4">
            {[
              {
                date: '2024-01-15',
                type: 'Transfert',
                titre: 'Transfert en contentieux',
                description: `Dossier ${selectedContentieuxDetail.origineAmiable} transféré en contentieux après échec du recouvrement amiable`,
                utilisateur: 'Système',
                statut: 'info'
              },
              {
                date: '2024-01-16',
                type: 'Assignation',
                titre: 'Assignation avocat',
                description: `Dossier assigné à ${selectedContentieuxDetail.avocat}`,
                utilisateur: 'Jean Martin',
                statut: 'success'
              },
              {
                date: '2024-01-20',
                type: 'Procédure',
                titre: 'Préparation assignation',
                description: 'Préparation des pièces pour assignation devant le tribunal',
                utilisateur: selectedContentieuxDetail.avocat,
                statut: 'warning'
              },
              {
                date: selectedContentieuxDetail.prochaineEcheance,
                type: 'Échéance',
                titre: 'Prochaine action prévue',
                description: 'Action programmée selon le planning contentieux',
                utilisateur: selectedContentieuxDetail.avocat,
                statut: 'pending'
              }
            ].map((event, index) => (
              <div key={index} className="flex items-start space-x-4 p-4 bg-white border border-gray-200 rounded-lg">
                <div className={`w-3 h-3 rounded-full mt-2 ${
                  event.statut === 'success' ? 'bg-green-500' :
                  event.statut === 'warning' ? 'bg-orange-500' :
                  event.statut === 'pending' ? 'bg-blue-500' :
                  'bg-gray-400'
                }`} />

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-gray-900">{event.titre}</h4>
                    <div className="text-right">
                      <div className="text-sm text-gray-700">{new Date(event.date).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-700">{event.utilisateur}</div>
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm">{event.description}</p>
                  <span className={`inline-block mt-2 text-xs px-2 py-1 rounded ${
                    event.statut === 'success' ? 'bg-green-100 text-green-800' :
                    event.statut === 'warning' ? 'bg-orange-100 text-orange-800' :
                    event.statut === 'pending' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {event.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Placeholder functions pour les autres onglets
    function renderDocumentsTab() {

      const documentsContentieux = [
        {
          id: 1,
          type: 'procedure',
          nom: 'Acte d\'assignation',
          dateCreation: '2024-01-15',
          statut: 'final',
          taille: '2.3 MB',
          auteur: 'Me Martin DUBOIS',
          description: 'Assignation devant le Tribunal de Commerce'
        },
        {
          id: 2,
          type: 'procedure',
          nom: 'Mise en demeure préalable',
          dateCreation: '2024-01-10',
          statut: 'final',
          taille: '1.1 MB',
          auteur: 'SCP Avocats DELTA',
          description: 'Mise en demeure avec délai de 8 jours'
        },
        {
          id: 3,
          type: 'justificatif',
          nom: 'Facture impayée',
          dateCreation: '2023-11-15',
          statut: 'final',
          taille: '458 KB',
          auteur: 'Atlas Finance Auto',
          description: 'Facture N°FAC-2023-1156'
        },
        {
          id: 4,
          type: 'justificatif',
          nom: 'Bon de livraison',
          dateCreation: '2023-11-10',
          statut: 'final',
          taille: '312 KB',
          auteur: 'Service Logistique',
          description: 'Preuve de livraison avec signature'
        },
        {
          id: 5,
          type: 'procedure',
          nom: 'Conclusions principales',
          dateCreation: '2024-02-01',
          statut: 'brouillon',
          taille: '4.7 MB',
          auteur: 'Me Martin DUBOIS',
          description: 'Conclusions en cours de finalisation'
        },
        {
          id: 6,
          type: 'correspondance',
          nom: 'Échange email avocat',
          dateCreation: '2024-01-28',
          statut: 'final',
          taille: '145 KB',
          auteur: 'Me Martin DUBOIS',
          description: 'Stratégie de défense et points de droit'
        },
        {
          id: 7,
          type: 'expertise',
          nom: 'Rapport d\'expertise comptable',
          dateCreation: '2024-01-25',
          statut: 'final',
          taille: '8.2 MB',
          auteur: 'Cabinet EXPERTISE+',
          description: 'Évaluation des préjudices subis'
        },
        {
          id: 8,
          type: 'huissier',
          nom: 'Procès-verbal de signification',
          dateCreation: '2024-01-20',
          statut: 'final',
          taille: '1.8 MB',
          auteur: 'SCP Huissiers ALPHA',
          description: 'Signification de l\'assignation'
        }
      ];

      const filteredDocuments = documentFilter === 'all'
        ? documentsContentieux
        : documentsContentieux.filter(d => d.type === documentFilter);

      return (
        <div className="space-y-6">
          {/* En-tête avec actions */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Documents & Pièces Juridiques</h3>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Ajouter un document
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Download className="w-4 h-4 mr-2" />
                Télécharger tout
              </button>
            </div>
          </div>

          {/* Filtres */}
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Filtrer par type:</label>
            <select
              value={documentFilter}
              onChange={(e) => setDocumentFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">Tous les documents ({documentsContentieux.length})</option>
              <option value="procedure">Actes de procédure ({documentsContentieux.filter(d => d.type === 'procedure').length})</option>
              <option value="justificatif">Pièces justificatives ({documentsContentieux.filter(d => d.type === 'justificatif').length})</option>
              <option value="correspondance">Correspondance ({documentsContentieux.filter(d => d.type === 'correspondance').length})</option>
              <option value="expertise">Expertises ({documentsContentieux.filter(d => d.type === 'expertise').length})</option>
              <option value="huissier">Actes d'huissier ({documentsContentieux.filter(d => d.type === 'huissier').length})</option>
            </select>
          </div>

          {/* Liste des documents */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Document</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Auteur</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('common.date')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Taille</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDocuments.map((doc) => {
                    const typeIcons = {
                      procedure: <Scale className="w-4 h-4 text-red-500" />,
                      justificatif: <FileText className="w-4 h-4 text-blue-500" />,
                      correspondance: <Mail className="w-4 h-4 text-green-500" />,
                      expertise: <Calculator className="w-4 h-4 text-purple-500" />,
                      huissier: <Gavel className="w-4 h-4 text-orange-500" />
                    };

                    const typeLabels = {
                      procedure: 'Procédure',
                      justificatif: 'Justificatif',
                      correspondance: 'Correspondance',
                      expertise: 'Expertise',
                      huissier: 'Huissier'
                    };

                    return (
                      <tr key={doc.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            {typeIcons[doc.type]}
                            <div>
                              <div className="text-sm font-medium text-gray-900">{doc.nom}</div>
                              <div className="text-sm text-gray-700">{doc.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {typeLabels[doc.type]}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{doc.auteur}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{doc.dateCreation}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            doc.statut === 'final' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {doc.statut === 'final' ? 'Finalisé' : 'Brouillon'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{doc.taille}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button className="text-blue-600 hover:text-blue-800" aria-label="Voir les détails">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="text-green-600 hover:text-green-800" aria-label="Télécharger">
                              <Download className="w-4 h-4" />
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Statistiques documents */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Actes Procédure</p>
                  <p className="text-lg font-bold text-blue-900">{documentsContentieux.filter(d => d.type === 'procedure').length}</p>
                </div>
                <Scale className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Pièces Justificatives</p>
                  <p className="text-lg font-bold text-green-900">{documentsContentieux.filter(d => d.type === 'justificatif').length}</p>
                </div>
                <FileText className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600">Actes Huissier</p>
                  <p className="text-lg font-bold text-orange-900">{documentsContentieux.filter(d => d.type === 'huissier').length}</p>
                </div>
                <Gavel className="w-8 h-8 text-orange-600" />
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600">Expertises</p>
                  <p className="text-lg font-bold text-purple-900">{documentsContentieux.filter(d => d.type === 'expertise').length}</p>
                </div>
                <Calculator className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Modal d'upload */}
          {showUploadModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ajouter un Document</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type de document</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                      <option>Acte de procédure</option>
                      <option>Pièce justificative</option>
                      <option>Correspondance</option>
                      <option>Expertise</option>
                      <option>Acte d'huissier</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nom du document</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Ex: Conclusions subsidiaires"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20"
                      placeholder="Description du document..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fichier</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Upload className="w-8 h-8 mx-auto text-gray-700 mb-2" />
                      <p className="text-sm text-gray-600">Glissez-déposez votre fichier ou <span className="text-blue-600 cursor-pointer">parcourez</span></p>
                      <p className="text-xs text-gray-700 mt-1">PDF, DOC, DOCX jusqu'à 10MB</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      // Traitement de l'upload
                      setShowUploadModal(false);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Ajouter le document
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    function renderFraisTab() {

      const fraisContentieux = [
        {
          id: 1,
          type: 'avocat',
          description: 'Honoraires Me Martin DUBOIS - Phase instruction',
          montant: 450000,
          dateEngagement: '2024-01-15',
          dateFacturation: '2024-01-30',
          statut: 'facture',
          fournisseur: 'SCP Avocats DELTA',
          imputable: true
        },
        {
          id: 2,
          type: 'huissier',
          description: 'Signification assignation',
          montant: 85000,
          dateEngagement: '2024-01-20',
          dateFacturation: '2024-01-25',
          statut: 'paye',
          fournisseur: 'SCP Huissiers ALPHA',
          imputable: true
        },
        {
          id: 3,
          type: 'tribunal',
          description: 'Droits de plaidoirie',
          montant: 35000,
          dateEngagement: '2024-02-01',
          dateFacturation: '2024-02-01',
          statut: 'paye',
          fournisseur: 'Tribunal de Commerce',
          imputable: false
        },
        {
          id: 4,
          type: 'expertise',
          description: 'Expertise comptable préjudices',
          montant: 180000,
          dateEngagement: '2024-01-25',
          dateFacturation: '2024-02-10',
          statut: 'facture',
          fournisseur: 'Cabinet EXPERTISE+',
          imputable: true
        },
        {
          id: 5,
          type: 'avocat',
          description: 'Honoraires conclusions principales',
          montant: 320000,
          dateEngagement: '2024-02-01',
          dateFacturation: null,
          statut: 'prevu',
          fournisseur: 'SCP Avocats DELTA',
          imputable: true
        },
        {
          id: 6,
          type: 'divers',
          description: 'Frais de déplacement audience',
          montant: 25000,
          dateEngagement: '2024-02-15',
          dateFacturation: null,
          statut: 'prevu',
          fournisseur: 'Frais internes',
          imputable: false
        }
      ];

      const totalFrais = fraisContentieux.reduce((sum, f) => sum + f.montant, 0);
      const fraisPayes = fraisContentieux.filter(f => f.statut === 'paye').reduce((sum, f) => sum + f.montant, 0);
      const fraisFactures = fraisContentieux.filter(f => f.statut === 'facture').reduce((sum, f) => sum + f.montant, 0);
      const fraisPrevus = fraisContentieux.filter(f => f.statut === 'prevu').reduce((sum, f) => sum + f.montant, 0);
      const fraisImputables = fraisContentieux.filter(f => f.imputable).reduce((sum, f) => sum + f.montant, 0);

      const filteredFrais = fraisFilter === 'all'
        ? fraisContentieux
        : fraisContentieux.filter(f => f.type === fraisFilter);

      return (
        <div className="space-y-6">
          {/* Tableau de bord financier */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Total Frais</p>
                  <p className="text-lg font-bold text-blue-900">{(totalFrais).toLocaleString()} FCFA</p>
                </div>
                <Wallet className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Payés</p>
                  <p className="text-lg font-bold text-green-900">{(fraisPayes).toLocaleString()} FCFA</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600">À Payer</p>
                  <p className="text-lg font-bold text-orange-900">{(fraisFactures).toLocaleString()} FCFA</p>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600">Imputables</p>
                  <p className="text-lg font-bold text-purple-900">{(fraisImputables).toLocaleString()} FCFA</p>
                </div>
                <RefreshCw className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Actions et filtres */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-gray-900">Détail des Frais & Coûts</h3>
              <select
                value={fraisFilter}
                onChange={(e) => setFraisFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">Tous les frais</option>
                <option value="avocat">Avocats</option>
                <option value="huissier">Huissiers</option>
                <option value="tribunal">Tribunal</option>
                <option value="expertise">Expertises</option>
                <option value="divers">Divers</option>
              </select>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowAddFraisModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter frais
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <FileText className="w-4 h-4 mr-2" />
                Export détaillé
              </button>
            </div>
          </div>

          {/* Table des frais */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Fournisseur</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Montant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Imputable</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFrais.map((frais) => {
                    const typeIcons = {
                      avocat: <Briefcase className="w-4 h-4 text-blue-500" />,
                      huissier: <Gavel className="w-4 h-4 text-orange-500" />,
                      tribunal: <Scale className="w-4 h-4 text-red-500" />,
                      expertise: <Calculator className="w-4 h-4 text-purple-500" />,
                      divers: <FileText className="w-4 h-4 text-gray-700" />
                    };

                    const statutColors = {
                      paye: 'bg-green-100 text-green-800',
                      facture: 'bg-orange-100 text-orange-800',
                      prevu: 'bg-gray-100 text-gray-800'
                    };

                    const statutLabels = {
                      paye: 'Payé',
                      facture: 'Facturé',
                      prevu: 'Prévu'
                    };

                    return (
                      <tr key={frais.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            {typeIcons[frais.type]}
                            <div>
                              <div className="text-sm font-medium text-gray-900">{frais.description}</div>
                              <div className="text-sm text-gray-700">Engagé le {frais.dateEngagement}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {frais.type.charAt(0).toUpperCase() + frais.type.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{frais.fournisseur}</td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-gray-900">{frais.montant.toLocaleString()} FCFA</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statutColors[frais.statut]}`}>
                            {statutLabels[frais.statut]}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {frais.imputable ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Oui
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Non
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button className="text-blue-600 hover:text-blue-800" aria-label="Voir les détails">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="text-green-600 hover:text-green-800">
                              <Edit className="w-4 h-4" />
                            </button>
                            {frais.statut === 'facture' && (
                              <button className="text-purple-600 hover:text-purple-800">
                                <CreditCard className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal ajouter frais */}
          {showAddFraisModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ajouter un Frais</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type de frais</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                      <option>Frais d'avocat</option>
                      <option>Frais d'huissier</option>
                      <option>Frais de tribunal</option>
                      <option>Expertise</option>
                      <option>Divers</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Montant (FCFA)</label>
                    <input
                      type="number"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="0"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Ex: Honoraires conclusions principales"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fournisseur</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Nom du fournisseur"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date d'engagement</label>
                    <input
                      type="date"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                      <option value="prevu">Prévu</option>
                      <option value="facture">Facturé</option>
                      <option value="paye">Payé</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm text-gray-700">Frais imputable au débiteur</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowAddFraisModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      // Traitement de l'ajout
                      setShowAddFraisModal(false);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Ajouter le frais
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    function renderFraisTab() {
      return (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Frais & Coûts du Contentieux</h3>
          <div className="bg-red-50 rounded-lg p-4">
            <h4 className="font-semibold text-red-900 mb-3">Récapitulatif des Coûts</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Frais d'avocat:</span>
                <span className="font-medium">250,000 FCFA</span>
              </div>
              <div className="flex justify-between">
                <span>Frais d'huissier:</span>
                <span className="font-medium">75,000 FCFA</span>
              </div>
              <div className="flex justify-between">
                <span>Frais de tribunal:</span>
                <span className="font-medium">50,000 FCFA</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-bold">
                <span>Total frais:</span>
                <span>375,000 FCFA</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    function renderCorrespondanceTab() {

      const correspondances = [
        {
          id: 1,
          type: 'avocat',
          correspondant: 'Me Martin DUBOIS',
          sujet: 'Point sur l\'avancement de la procédure',
          dateEnvoi: '2024-02-15 14:30',
          statut: 'lu',
          priorite: 'normale',
          message: 'Nous avons reçu les conclusions adverses. Je prépare notre réponse...',
          pieces: ['conclusions_adverses.pdf'],
          direction: 'recu'
        },
        {
          id: 2,
          type: 'huissier',
          correspondant: 'SCP Huissiers ALPHA',
          sujet: 'Signification effectuée',
          dateEnvoi: '2024-02-10 09:15',
          statut: 'lu',
          priorite: 'haute',
          message: 'Signification réalisée avec succès. PV ci-joint.',
          pieces: ['pv_signification.pdf'],
          direction: 'recu'
        },
        {
          id: 3,
          type: 'debiteur',
          correspondant: 'SARL TECH SOLUTIONS',
          sujet: 'Demande d\'échelonnement',
          dateEnvoi: '2024-02-08 16:45',
          statut: 'repondu',
          priorite: 'haute',
          message: 'Suite à votre mise en demeure, nous sollicitons un échelonnement...',
          pieces: [],
          direction: 'recu'
        },
        {
          id: 4,
          type: 'avocat',
          correspondant: 'Me Martin DUBOIS',
          sujet: 'Stratégie procédurale',
          dateEnvoi: '2024-02-05 11:20',
          statut: 'envoye',
          priorite: 'normale',
          message: 'Voici notre analyse de la situation et les prochaines étapes...',
          pieces: ['note_strategique.pdf'],
          direction: 'envoye'
        },
        {
          id: 5,
          type: 'tribunal',
          correspondant: 'Tribunal de Commerce',
          sujet: 'Fixation audience',
          dateEnvoi: '2024-01-30 10:00',
          statut: 'lu',
          priorite: 'haute',
          message: 'Audience fixée au 15 mars 2024 à 14h30. Salle 3.',
          pieces: ['convocation_audience.pdf'],
          direction: 'recu'
        }
      ];

      const filteredCorrespondances = correspondanceFilter === 'all'
        ? correspondances
        : correspondances.filter(c => c.type === correspondanceFilter);

      const correspondantsUniques = [...new Set(correspondances.map(c => c.correspondant))];

      return (
        <div className="space-y-6">
          {/* Header avec actions */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Correspondance & Communications</h3>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowNewMessageModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Mail className="w-4 h-4 mr-2" />
                Nouveau message
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Archive className="w-4 h-4 mr-2" />
                Archiver sélection
              </button>
            </div>
          </div>

          {/* Statistiques rapides */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Messages</p>
                  <p className="text-lg font-bold text-blue-900">{correspondances.length}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">Non lus</p>
                  <p className="text-lg font-bold text-red-900">{correspondances.filter(c => c.statut === 'non_lu').length}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600">Haute priorité</p>
                  <p className="text-lg font-bold text-orange-900">{correspondances.filter(c => c.priorite === 'haute').length}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-600" />
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Correspondants</p>
                  <p className="text-lg font-bold text-green-900">{correspondantsUniques.length}</p>
                </div>
                <Users className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          {/* Filtres */}
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Filtrer par type:</label>
            <select
              value={correspondanceFilter}
              onChange={(e) => setCorrespondanceFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">Toutes les correspondances</option>
              <option value="avocat">Avocats</option>
              <option value="huissier">Huissiers</option>
              <option value="debiteur">Débiteur</option>
              <option value="tribunal">Tribunal</option>
              <option value="expert">Experts</option>
            </select>
          </div>

          {/* Liste des correspondances */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="divide-y divide-gray-200">
              {filteredCorrespondances.map((corresp) => {
                const typeIcons = {
                  avocat: <Briefcase className="w-5 h-5 text-blue-500" />,
                  huissier: <Gavel className="w-5 h-5 text-orange-500" />,
                  debiteur: <Building2 className="w-5 h-5 text-red-500" />,
                  tribunal: <Scale className="w-5 h-5 text-purple-500" />,
                  expert: <Calculator className="w-5 h-5 text-green-500" />
                };

                const prioriteColors = {
                  haute: 'bg-red-100 text-red-800',
                  normale: 'bg-gray-100 text-gray-800',
                  basse: 'bg-blue-100 text-blue-800'
                };

                const statutColors = {
                  lu: 'bg-gray-100 text-gray-800',
                  non_lu: 'bg-red-100 text-red-800',
                  repondu: 'bg-green-100 text-green-800',
                  envoye: 'bg-blue-100 text-blue-800'
                };

                return (
                  <div
                    key={corresp.id}
                    className="p-6 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedCorrespondant(corresp)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="flex-shrink-0">
                          {typeIcons[corresp.type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="text-sm font-semibold text-gray-900 truncate">
                              {corresp.correspondant}
                            </h4>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${prioriteColors[corresp.priorite]}`}>
                              {corresp.priorite}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statutColors[corresp.statut]}`}>
                              {corresp.statut}
                            </span>
                            {corresp.direction === 'envoye' && (
                              <Send className="w-4 h-4 text-blue-500" />
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-900 mb-1">{corresp.sujet}</p>
                          <p className="text-sm text-gray-600 line-clamp-2">{corresp.message}</p>
                          {corresp.pieces.length > 0 && (
                            <div className="flex items-center space-x-2 mt-2">
                              <Paperclip className="w-4 h-4 text-gray-700" />
                              <span className="text-xs text-gray-700">{corresp.pieces.length} pièce(s) jointe(s)</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 ml-4">
                        <span className="text-xs text-gray-700">{corresp.dateEnvoi}</span>
                        <button className="text-gray-700 hover:text-gray-600">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal nouveau message */}
          {showNewMessageModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Nouveau Message</h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Destinataire</label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                        <option>Choisir un correspondant...</option>
                        <option>Me Martin DUBOIS (Avocat)</option>
                        <option>SCP Huissiers ALPHA</option>
                        <option>SARL TECH SOLUTIONS (Débiteur)</option>
                        <option>Cabinet EXPERTISE+</option>
                        <option>Tribunal de Commerce</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Priorité</label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                        <option value="normale">Normale</option>
                        <option value="haute">Haute</option>
                        <option value="basse">Basse</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sujet</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Objet du message"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                    <textarea
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 h-32"
                      placeholder="Votre message..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pièces jointes</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <Paperclip className="w-6 h-6 mx-auto text-gray-700 mb-2" />
                      <p className="text-sm text-gray-600">Glissez vos fichiers ou <span className="text-blue-600 cursor-pointer">parcourez</span></p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm text-gray-700">Marquer comme confidentiel</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm text-gray-700">Demander accusé de réception</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowNewMessageModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                    Enregistrer brouillon
                  </button>
                  <button
                    onClick={() => {
                      setShowNewMessageModal(false);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Envoyer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal détail correspondance */}
          {selectedCorrespondant && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{selectedCorrespondant.sujet}</h3>
                  <button
                    onClick={() => setSelectedCorrespondant(null)}
                    className="text-gray-700 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-blue-600">
                          {selectedCorrespondant.correspondant.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{selectedCorrespondant.correspondant}</p>
                        <p className="text-sm text-gray-700">{selectedCorrespondant.dateEnvoi}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="text-blue-600 hover:text-blue-800">
                        <Reply className="w-4 h-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-800">
                        <Forward className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="prose max-w-none">
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedCorrespondant.message}</p>
                  </div>

                  {selectedCorrespondant.pieces.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Pièces jointes</h4>
                      <div className="space-y-2">
                        {selectedCorrespondant.pieces.map((piece, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <FileText className="w-5 h-5 text-gray-700" />
                              <span className="text-sm text-gray-900">{piece}</span>
                            </div>
                            <button className="text-blue-600 hover:text-blue-800" aria-label="Télécharger">
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    function renderExecutionTab() {

      const mesuresExecution = [
        {
          id: 1,
          type: 'saisie_attribution',
          nom: 'Saisie-attribution compte principal',
          dateOrdonnance: '2024-02-01',
          dateExecution: '2024-02-05',
          statut: 'executee',
          huissier: 'SCP Huissiers ALPHA',
          montantSaisi: 125000,
          etablissement: 'Banque Atlantique',
          resultat: 'Compte insuffisamment provisionné'
        },
        {
          id: 2,
          type: 'saisie_attribution',
          nom: 'Saisie-attribution compte secondaire',
          dateOrdonnance: '2024-02-01',
          dateExecution: '2024-02-05',
          statut: 'executee',
          huissier: 'SCP Huissiers ALPHA',
          montantSaisi: 45000,
          etablissement: 'UBA Bénin',
          resultat: 'Somme recouvrée intégralement'
        },
        {
          id: 3,
          type: 'saisie_vente',
          nom: 'Saisie-vente mobilier bureau',
          dateOrdonnance: '2024-02-10',
          dateExecution: '2024-02-15',
          statut: 'en_cours',
          huissier: 'SCP Huissiers ALPHA',
          montantEstime: 180000,
          lieu: 'Siège social SARL TECH SOLUTIONS',
          resultat: 'Inventaire en cours'
        },
        {
          id: 4,
          type: 'saisie_immobiliere',
          nom: 'Saisie immobilière',
          dateOrdonnance: '2024-01-20',
          dateExecution: null,
          statut: 'programmee',
          huissier: 'SCP Huissiers BETA',
          montantEstime: 850000,
          lieu: 'Terrain Lot 45 Zone Industrielle',
          resultat: 'Expertise en cours'
        },
        {
          id: 5,
          type: 'astreinte',
          nom: 'Astreinte quotidienne',
          dateOrdonnance: '2024-01-15',
          dateExecution: '2024-01-16',
          statut: 'executee',
          montantAstreinte: 10000,
          joursEcoules: 25,
          totalAstreinte: 250000,
          resultat: 'Débiteur reste en défaut'
        },
        {
          id: 6,
          type: 'opposition',
          nom: 'Opposition administrative',
          dateOrdonnance: '2024-02-08',
          dateExecution: '2024-02-10',
          statut: 'executee',
          organisme: 'Direction Générale des Impôts',
          montantBloque: 85000,
          resultat: 'Remboursement TVA bloqué'
        }
      ];

      const totalRecouvert = mesuresExecution
        .filter(m => m.statut === 'executee' && (m.montantSaisi || m.montantBloque))
        .reduce((sum, m) => sum + (m.montantSaisi || m.montantBloque || 0), 0);

      const mesuresActives = mesuresExecution.filter(m => ['en_cours', 'programmee'].includes(m.statut)).length;

      const filteredMesures = executionFilter === 'all'
        ? mesuresExecution
        : mesuresExecution.filter(m => m.type === executionFilter);

      return (
        <div className="space-y-6">
          {/* En-tête et actions */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Mesures d'Exécution</h3>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowNewMesureModal(true)}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle mesure
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <FileText className="w-4 h-4 mr-2" />
                Rapport d'exécution
              </button>
            </div>
          </div>

          {/* Tableau de bord exécution */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Montant Recouvré</p>
                  <p className="text-lg font-bold text-green-900">{totalRecouvert.toLocaleString()} FCFA</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600">Mesures Actives</p>
                  <p className="text-lg font-bold text-orange-900">{mesuresActives}</p>
                </div>
                <Activity className="w-8 h-8 text-orange-600" />
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Total Mesures</p>
                  <p className="text-lg font-bold text-blue-900">{mesuresExecution.length}</p>
                </div>
                <Target className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600">Taux Succès</p>
                  <p className="text-lg font-bold text-purple-900">
                    {Math.round((totalRecouvert / 2500000) * 100)}%
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Filtres */}
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Type de mesure:</label>
            <select
              value={executionFilter}
              onChange={(e) => setExecutionFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">Toutes les mesures</option>
              <option value="saisie_attribution">Saisies-attributions</option>
              <option value="saisie_vente">Saisies-ventes</option>
              <option value="saisie_immobiliere">Saisies immobilières</option>
              <option value="astreinte">Astreintes</option>
              <option value="opposition">Oppositions</option>
            </select>
          </div>

          {/* Liste des mesures */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Mesure</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Exécutant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Dates</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Montant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMesures.map((mesure) => {
                    const typeIcons = {
                      saisie_attribution: <CreditCard className="w-4 h-4 text-blue-500" />,
                      saisie_vente: <Package className="w-4 h-4 text-orange-500" />,
                      saisie_immobiliere: <Building className="w-4 h-4 text-green-500" />,
                      astreinte: <Clock className="w-4 h-4 text-purple-500" />,
                      opposition: <Shield className="w-4 h-4 text-red-500" />
                    };

                    const typeLabels = {
                      saisie_attribution: 'Saisie-Attribution',
                      saisie_vente: 'Saisie-Vente',
                      saisie_immobiliere: 'Saisie Immobilière',
                      astreinte: 'Astreinte',
                      opposition: 'Opposition'
                    };

                    const statutColors = {
                      executee: 'bg-green-100 text-green-800',
                      en_cours: 'bg-orange-100 text-orange-800',
                      programmee: 'bg-blue-100 text-blue-800',
                      echec: 'bg-red-100 text-red-800'
                    };

                    const statutLabels = {
                      executee: 'Exécutée',
                      en_cours: 'En cours',
                      programmee: 'Programmée',
                      echec: 'Échec'
                    };

                    return (
                      <tr key={mesure.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            {typeIcons[mesure.type]}
                            <div>
                              <div className="text-sm font-medium text-gray-900">{mesure.nom}</div>
                              <div className="text-sm text-gray-700">{mesure.lieu || mesure.etablissement || mesure.organisme}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {typeLabels[mesure.type]}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{mesure.huissier}</td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">Ord: {mesure.dateOrdonnance}</div>
                          {mesure.dateExecution && (
                            <div className="text-sm text-gray-700">Exec: {mesure.dateExecution}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-gray-900">
                            {(mesure.montantSaisi || mesure.montantEstime || mesure.totalAstreinte || mesure.montantBloque || 0).toLocaleString()} FCFA
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statutColors[mesure.statut]}`}>
                            {statutLabels[mesure.statut]}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button className="text-blue-600 hover:text-blue-800" aria-label="Voir les détails">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="text-green-600 hover:text-green-800">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button className="text-purple-600 hover:text-purple-800">
                              <FileText className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal nouvelle mesure */}
          {showNewMesureModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Nouvelle Mesure d'Exécution</h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Type de mesure</label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                        <option>Saisie-attribution</option>
                        <option>Saisie-vente</option>
                        <option>Saisie immobilière</option>
                        <option>Astreinte</option>
                        <option>Opposition administrative</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Huissier</label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                        <option>SCP Huissiers ALPHA</option>
                        <option>SCP Huissiers BETA</option>
                        <option>Cabinet JUSTICE+</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nom de la mesure</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Ex: Saisie-attribution compte principal"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date ordonnance</label>
                      <input
                        type="date"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date d'exécution prévue</label>
                      <input
                        type="date"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Lieu/Établissement</label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="Ex: Banque Atlantique"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Montant estimé (FCFA)</label>
                      <input
                        type="number"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Observations</label>
                    <textarea
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20"
                      placeholder="Informations complémentaires..."
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowNewMesureModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      setShowNewMesureModal(false);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Programmer la mesure
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    function renderResultatsTab() {

      const montantInitial = 2500000;
      const montantRecouvert = 1875000;
      const fraisTotaux = 450000;
      const tauxRecouvrement = (montantRecouvert / montantInitial) * 100;
      const beneficeNet = montantRecouvert - fraisTotaux;
      const rentabilite = (beneficeNet / fraisTotaux) * 100;

      const chronologieResultats = [
        {
          id: 1,
          date: '2024-02-20',
          type: 'recouvrement',
          description: 'Paiement partiel suite saisie-attribution',
          montant: 170000,
          source: 'Banque Atlantique - Compte principal'
        },
        {
          id: 2,
          date: '2024-02-15',
          type: 'recouvrement',
          description: 'Recouvrement opposition administrative',
          montant: 85000,
          source: 'DGI - Remboursement TVA bloqué'
        },
        {
          id: 3,
          date: '2024-02-05',
          type: 'recouvrement',
          description: 'Saisie-attribution réussie',
          montant: 45000,
          source: 'UBA Bénin - Compte secondaire'
        },
        {
          id: 4,
          date: '2024-01-30',
          type: 'paiement_volontaire',
          description: 'Paiement suite mise en demeure',
          montant: 750000,
          source: 'Virement débiteur'
        },
        {
          id: 5,
          date: '2024-01-25',
          type: 'paiement_volontaire',
          description: 'Règlement partiel négocié',
          montant: 825000,
          source: 'Accord amiable'
        }
      ];

      const analyseRentabilite = {
        montantInitial,
        montantRecouvert,
        fraisTotaux,
        beneficeNet,
        dureeRecouvrement: 45, // jours
        tauxRecouvrement,
        rentabilite
      };

      const comparaison = {
        moyenneMarche: 65,
        dureeMoyenne: 120,
        fraisisMoyens: 18
      };

      return (
        <div className="space-y-6">
          {/* En-tête avec actions */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Résultats & Bilan Contentieux</h3>
            <div className="flex space-x-3">
              {selectedContentieuxDetail.statutJuridique === 'execution' && (
                <button
                  onClick={() => setShowCloturerModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Clôturer le dossier
                </button>
              )}
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <FileText className="w-4 h-4 mr-2" />
                Rapport final
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Download className="w-4 h-4 mr-2" />
                Export données
              </button>
            </div>
          </div>

          {/* Indicateurs clés de performance */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-green-50 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Taux de Recouvrement</p>
                  <p className="text-lg font-bold text-green-900">{tauxRecouvrement.toFixed(1)}%</p>
                  <p className="text-xs text-green-600 mt-1">Objectif: 80%</p>
                </div>
                <Target className="w-10 h-10 text-green-600" />
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Montant Recouvré</p>
                  <p className="text-lg font-bold text-blue-900">{montantRecouvert.toLocaleString()}</p>
                  <p className="text-xs text-blue-600 mt-1">/ {montantInitial.toLocaleString()} FCFA</p>
                </div>
                <DollarSign className="w-10 h-10 text-blue-600" />
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600">Rentabilité</p>
                  <p className="text-lg font-bold text-purple-900">{rentabilite.toFixed(1)}%</p>
                  <p className="text-xs text-purple-600 mt-1">ROI excellent</p>
                </div>
                <TrendingUp className="w-10 h-10 text-purple-600" />
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600">Durée</p>
                  <p className="text-lg font-bold text-orange-900">{analyseRentabilite.dureeRecouvrement}</p>
                  <p className="text-xs text-orange-600 mt-1">jours</p>
                </div>
                <Clock className="w-10 h-10 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Graphique de recouvrement */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Évolution du Recouvrement</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>Progression du recouvrement</span>
                <span className="font-medium">{tauxRecouvrement.toFixed(1)}% complété</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full"
                  style={{ width: `${tauxRecouvrement}%` }}
                ></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <p className="font-medium text-gray-900">{montantRecouvert.toLocaleString()} FCFA</p>
                  <p className="text-gray-700">Recouvré</p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-red-900">{(montantInitial - montantRecouvert).toLocaleString()} FCFA</p>
                  <p className="text-gray-700">Reste à recouvrer</p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-blue-900">{fraisTotaux.toLocaleString()} FCFA</p>
                  <p className="text-gray-700">Frais engagés</p>
                </div>
              </div>
            </div>
          </div>

          {/* Chronologie des recouvrements */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Chronologie des Recouvrements</h4>
              <div className="space-y-4">
                {chronologieResultats.map((item) => (
                  <div key={item.id} className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className={`w-3 h-3 rounded-full mt-2 ${
                        item.type === 'recouvrement' ? 'bg-red-500' : 'bg-green-500'
                      }`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{item.description}</p>
                        <span className="text-sm font-bold text-green-600">+{item.montant.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-gray-700">{item.source}</p>
                      <p className="text-xs text-gray-700">{item.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Analyse comparative */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Analyse Comparative</h4>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Taux de recouvrement</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-green-600">{tauxRecouvrement.toFixed(1)}%</span>
                      <span className="text-xs text-gray-700">vs {comparaison.moyenneMarche}% (marché)</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(tauxRecouvrement/100)*100}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Durée de recouvrement</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-blue-600">{analyseRentabilite.dureeRecouvrement}j</span>
                      <span className="text-xs text-gray-700">vs {comparaison.dureeMoyenne}j (marché)</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '62%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Taux de frais</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-purple-600">{((fraisTotaux/montantInitial)*100).toFixed(1)}%</span>
                      <span className="text-xs text-gray-700">vs {comparaison.fraisisMoyens}% (marché)</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: '78%' }}></div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">Évaluation globale</span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Excellent
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Analyse financière détaillée */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Analyse Financière Détaillée</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h5 className="font-medium text-gray-900 mb-3">Répartition des Recouvrements</h5>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Paiements volontaires</span>
                    <span className="text-sm font-medium">1,575,000 FCFA (84%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Mesures d'exécution</span>
                    <span className="text-sm font-medium">300,000 FCFA (16%)</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <span className="text-sm font-semibold text-gray-900">Total recouvré</span>
                    <span className="text-sm font-bold text-green-600">{montantRecouvert.toLocaleString()} FCFA</span>
                  </div>
                </div>
              </div>
              <div>
                <h5 className="font-medium text-gray-900 mb-3">Ventilation des Coûts</h5>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Frais d'avocat</span>
                    <span className="text-sm font-medium">250,000 FCFA</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Frais d'huissier</span>
                    <span className="text-sm font-medium">135,000 FCFA</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Frais de tribunal</span>
                    <span className="text-sm font-medium">65,000 FCFA</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <span className="text-sm font-semibold text-gray-900">Total frais</span>
                    <span className="text-sm font-bold text-red-600">{fraisTotaux.toLocaleString()} FCFA</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-900">Bénéfice Net</span>
                <span className="text-lg font-bold text-green-600">{beneficeNet.toLocaleString()} FCFA</span>
              </div>
              <p className="text-sm text-gray-700 mt-1">
                Rentabilité: {rentabilite.toFixed(1)}% | Efficacité: {tauxRecouvrement.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Modal clôture */}
          {showCloturerModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Clôturer le Dossier Contentieux</h3>

                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex">
                      <AlertTriangle className="w-5 h-5 text-yellow-400 mr-2" />
                      <div>
                        <h4 className="text-sm font-medium text-yellow-800">Attention</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          La clôture du dossier est définitive. Assurez-vous que toutes les actions ont été entreprises.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Motif de clôture</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                      <option>Recouvrement total</option>
                      <option>Recouvrement partiel - Débiteur insolvable</option>
                      <option>Accord transactionnel</option>
                      <option>Prescription</option>
                      <option>Abandon de créance</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Commentaires de clôture</label>
                    <textarea
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20"
                      placeholder="Bilan final et observations..."
                    />
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Récapitulatif Final</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Montant initial:</span>
                        <span>{montantInitial.toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Montant recouvré:</span>
                        <span className="text-green-600">{montantRecouvert.toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Taux de recouvrement:</span>
                        <span className="font-medium">{tauxRecouvrement.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowCloturerModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      setShowCloturerModal(false);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Confirmer la clôture
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    function renderContentieuxContent() {
      // Page détaillée du dossier contentieux
      if (showContentieuxDetailPage && selectedContentieuxDetail) {
        return renderContentieuxDetailPage();
      }

      // Vue Dashboard KPIs
      if (contentieuxView === 'dashboard') {
        return (
          <div className="space-y-6">
            {/* KPIs consolidés */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#525252]">Performance Globale</p>
                    <p className="text-lg font-bold text-[#171717]">73%</p>
                    <p className="text-xs text-green-600">+5% vs mois dernier</p>
                  </div>
                  <Target className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#525252]">Taux Transfert Amiable→Contentieux</p>
                    <p className="text-lg font-bold text-[#171717]">18%</p>
                    <p className="text-xs text-orange-600">↑ 2% ce mois</p>
                  </div>
                  <RefreshCw className="w-8 h-8 text-orange-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#525252]">ROI Contentieux</p>
                    <p className="text-lg font-bold text-green-600">3.2x</p>
                    <p className="text-xs text-gray-600">Coût vs Recouvrement</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#525252]">Délai Moyen</p>
                    <p className="text-lg font-bold text-[#171717]">127j</p>
                    <p className="text-xs text-gray-600">Transfert → Jugement</p>
                  </div>
                  <Clock className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Graphiques comparatifs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance Amiable vs Contentieux */}
              <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                <h3 className="text-lg font-semibold text-[#171717] mb-4">
                  Comparatif Amiable vs Contentieux
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { phase: 'Amiable', taux_succes: 82, delai_moyen: 45, cout_moyen: 50000 },
                    { phase: 'Contentieux', taux_succes: 67, delai_moyen: 127, cout_moyen: 250000 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="phase" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="taux_succes" fill="#737373" name="Taux succès %" />
                    <Bar dataKey="delai_moyen" fill="#f59e0b" name="Délai (jours)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Flux entre processus */}
              <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                <h3 className="text-lg font-semibold text-[#171717] mb-4">
                  Flux mensuel Amiable → Contentieux
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={[
                    { mois: 'Sept', transferts: 12, retours: 3 },
                    { mois: 'Oct', transferts: 15, retours: 5 },
                    { mois: 'Nov', transferts: 18, retours: 4 },
                    { mois: 'Déc', transferts: 14, retours: 6 },
                    { mois: 'Jan', transferts: 20, retours: 7 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mois" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="transferts" stroke="#ef4444" name="Transferts vers contentieux" />
                    <Line type="monotone" dataKey="retours" stroke="#22c55e" name="Retours en amiable" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Statistiques par type de procédure */}
            <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
              <h3 className="text-lg font-semibold text-[#171717] mb-4">Performance par Type de Procédure</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-700 uppercase">Procédure</th>
                      <th className="text-center px-4 py-2 text-xs font-medium text-gray-700 uppercase">Nb Dossiers</th>
                      <th className="text-center px-4 py-2 text-xs font-medium text-gray-700 uppercase">Taux Succès</th>
                      <th className="text-center px-4 py-2 text-xs font-medium text-gray-700 uppercase">Délai Moyen</th>
                      <th className="text-center px-4 py-2 text-xs font-medium text-gray-700 uppercase">Coût Moyen</th>
                      <th className="text-center px-4 py-2 text-xs font-medium text-gray-700 uppercase">ROI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-3 text-sm">Injonction de payer</td>
                      <td className="px-4 py-3 text-sm text-center">45</td>
                      <td className="px-4 py-3 text-sm text-center"><span className="text-green-600 font-semibold">78%</span></td>
                      <td className="px-4 py-3 text-sm text-center">60 jours</td>
                      <td className="px-4 py-3 text-sm text-center">150K FCFA</td>
                      <td className="px-4 py-3 text-sm text-center"><span className="text-green-600 font-semibold">4.2x</span></td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm">Référé provision</td>
                      <td className="px-4 py-3 text-sm text-center">23</td>
                      <td className="px-4 py-3 text-sm text-center"><span className="text-yellow-600 font-semibold">65%</span></td>
                      <td className="px-4 py-3 text-sm text-center">90 jours</td>
                      <td className="px-4 py-3 text-sm text-center">250K FCFA</td>
                      <td className="px-4 py-3 text-sm text-center"><span className="text-yellow-600 font-semibold">2.8x</span></td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm">Procédure au fond</td>
                      <td className="px-4 py-3 text-sm text-center">18</td>
                      <td className="px-4 py-3 text-sm text-center"><span className="text-orange-600 font-semibold">55%</span></td>
                      <td className="px-4 py-3 text-sm text-center">180 jours</td>
                      <td className="px-4 py-3 text-sm text-center">450K FCFA</td>
                      <td className="px-4 py-3 text-sm text-center"><span className="text-orange-600 font-semibold">1.9x</span></td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm">Saisie-attribution</td>
                      <td className="px-4 py-3 text-sm text-center">12</td>
                      <td className="px-4 py-3 text-sm text-center"><span className="text-green-600 font-semibold">85%</span></td>
                      <td className="px-4 py-3 text-sm text-center">45 jours</td>
                      <td className="px-4 py-3 text-sm text-center">100K FCFA</td>
                      <td className="px-4 py-3 text-sm text-center"><span className="text-green-600 font-semibold">5.1x</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      }

      // Vue Workflow
      if (contentieuxView === 'workflow') {
        return (
          <div className="space-y-6">
            {/* Sélecteur de phase */}
            <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#171717]">Workflow Complet Module Recouvrement</h3>
                <select
                  value={activeWorkflowPhase}
                  onChange={(e) => setActiveWorkflowPhase(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Toutes les phases</option>
                  <option value="amiable">Phase Amiable (J+0 à J+90)</option>
                  <option value="transfert">Transfert (J+91)</option>
                  <option value="contentieux">Phase Contentieuse</option>
                  <option value="execution">Exécution & Clôture</option>
                </select>
              </div>
            </div>

            {/* Visualisation du workflow */}
            <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
              <div className="relative">
                {/* Phase 1: Amiable */}
                <div className={`mb-8 ${activeWorkflowPhase !== 'all' && activeWorkflowPhase !== 'amiable' ? 'opacity-30' : ''}`}>
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 font-bold">1</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-[#171717] mb-2">Phase 1: Recouvrement Amiable (J+0 à J+90)</h4>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm">Détection automatique facture impayée</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm">Attribution agent de recouvrement</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm">Relances téléphoniques et écrites</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm">Négociations et propositions</span>
                        </div>
                        <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
                          <span className="text-sm font-medium text-yellow-800">
                            Point de décision: Succès amiable ou transfert contentieux
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Flèche de connexion */}
                <div className="flex justify-center my-4">
                  <ArrowDown className="w-6 h-6 text-gray-700" />
                </div>

                {/* Phase 2: Transfert */}
                <div className={`mb-8 ${activeWorkflowPhase !== 'all' && activeWorkflowPhase !== 'transfert' ? 'opacity-30' : ''}`}>
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-orange-600 font-bold">2</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-[#171717] mb-2">Phase 2: Transfert vers Contentieux (J+91)</h4>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                          <span className="text-sm">Échec constaté du recouvrement amiable</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-orange-500" />
                          <span className="text-sm">Demande de transfert avec justification</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <UserCheck className="w-4 h-4 text-orange-500" />
                          <span className="text-sm">Validation hiérarchique selon matrice</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <FolderOpen className="w-4 h-4 text-orange-500" />
                          <span className="text-sm">Constitution automatique dossier contentieux</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Flèche de connexion */}
                <div className="flex justify-center my-4">
                  <ArrowDown className="w-6 h-6 text-gray-700" />
                </div>

                {/* Phase 3: Contentieux */}
                <div className={`mb-8 ${activeWorkflowPhase !== 'all' && activeWorkflowPhase !== 'contentieux' ? 'opacity-30' : ''}`}>
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-red-600 font-bold">3</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-[#171717] mb-2">Phase 3: Procédure Contentieuse (J+91 à J+X)</h4>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <div className="flex items-center space-x-2">
                          <Scale className="w-4 h-4 text-red-500" />
                          <span className="text-sm">Analyse juridique du dossier</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Send className="w-4 h-4 text-red-500" />
                          <span className="text-sm">Mise en demeure par huissier</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Gavel className="w-4 h-4 text-red-500" />
                          <span className="text-sm">Choix de la procédure adaptée</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Briefcase className="w-4 h-4 text-red-500" />
                          <span className="text-sm">Gestion du dossier judiciaire</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckSquare className="w-4 h-4 text-red-500" />
                          <span className="text-sm">Obtention décision de justice</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Flèche de connexion */}
                <div className="flex justify-center my-4">
                  <ArrowDown className="w-6 h-6 text-gray-700" />
                </div>

                {/* Phase 4: Exécution */}
                <div className={`mb-8 ${activeWorkflowPhase !== 'all' && activeWorkflowPhase !== 'execution' ? 'opacity-30' : ''}`}>
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 font-bold">4</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-[#171717] mb-2">Phase 4: Exécution et Clôture</h4>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <div className="flex items-center space-x-2">
                          <FileSignature className="w-4 h-4 text-green-500" />
                          <span className="text-sm">Signification du jugement</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Hammer className="w-4 h-4 text-green-500" />
                          <span className="text-sm">Mesures d'exécution forcée</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Coins className="w-4 h-4 text-green-500" />
                          <span className="text-sm">Recouvrement des sommes</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <BarChart3 className="w-4 h-4 text-green-500" />
                          <span className="text-sm">Analyse ROI global (amiable + contentieux)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Archive className="w-4 h-4 text-green-500" />
                          <span className="text-sm">Clôture et archivage</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Points de contrôle */}
                <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">Points de contrôle et bascules</h4>
                  <ul className="space-y-1 text-sm text-blue-800">
                    <li>• Retour possible en amiable à tout moment si accord</li>
                    <li>• Escalade automatique selon délais paramétrés</li>
                    <li>• Validation obligatoire pour certains montants</li>
                    <li>• Reporting temps réel à chaque étape</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );
      }

      // Vue Coûts & Budget
      if (contentieuxView === 'couts') {
        return (
          <div className="space-y-6">
            {/* Budget global */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#525252]">Budget Total Contentieux</p>
                    <p className="text-lg font-bold text-[#171717]">15M FCFA</p>
                    <p className="text-xs text-gray-600">Année 2024</p>
                  </div>
                  <Wallet className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#525252]">Dépenses Engagées</p>
                    <p className="text-lg font-bold text-orange-600">8.7M FCFA</p>
                    <p className="text-xs text-gray-600">58% du budget</p>
                  </div>
                  <CreditCard className="w-8 h-8 text-orange-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#525252]">Montants Recouvrés</p>
                    <p className="text-lg font-bold text-green-600">27.8M FCFA</p>
                    <p className="text-xs text-green-600">ROI: 3.2x</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
              </div>
            </div>

            {/* Détail des coûts par type */}
            <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
              <h3 className="text-lg font-semibold text-[#171717] mb-4">Répartition des Coûts</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        dataKey="montant"
                        data={[
                          { name: 'Honoraires Avocats', montant: 4500000 },
                          { name: 'Frais Huissiers', montant: 2800000 },
                          { name: 'Frais de Justice', montant: 1200000 },
                          { name: 'Expertises', montant: 800000 },
                          { name: 'Autres frais', montant: 400000 }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#737373"
                        label
                      >
                        {[0,1,2,3,4].map((index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Honoraires Avocats</span>
                      <span className="text-sm font-bold">{formatCurrency(4500000)}</span>
                    </div>
                    <div className="mt-2 bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{width: '52%'}}></div>
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Frais Huissiers</span>
                      <span className="text-sm font-bold">{formatCurrency(2800000)}</span>
                    </div>
                    <div className="mt-2 bg-gray-200 rounded-full h-2">
                      <div className="bg-orange-600 h-2 rounded-full" style={{width: '32%'}}></div>
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Frais de Justice</span>
                      <span className="text-sm font-bold">{formatCurrency(1200000)}</span>
                    </div>
                    <div className="mt-2 bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{width: '14%'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Analyse coût/bénéfice par dossier */}
            <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
              <h3 className="text-lg font-semibold text-[#171717] mb-4">Analyse Coût/Bénéfice par Dossier</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-700 uppercase">Dossier</th>
                      <th className="text-center px-4 py-2 text-xs font-medium text-gray-700 uppercase">Créance</th>
                      <th className="text-center px-4 py-2 text-xs font-medium text-gray-700 uppercase">Coûts Engagés</th>
                      <th className="text-center px-4 py-2 text-xs font-medium text-gray-700 uppercase">Recouvré</th>
                      <th className="text-center px-4 py-2 text-xs font-medium text-gray-700 uppercase">Bénéfice Net</th>
                      <th className="text-center px-4 py-2 text-xs font-medium text-gray-700 uppercase">Rentabilité</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {dossiersContentieux.slice(0, 4).map(dossier => (
                      <tr key={dossier.id}>
                        <td className="px-4 py-3 text-sm">{dossier.numeroRef}</td>
                        <td className="px-4 py-3 text-sm text-center">{formatCurrency(dossier.montantTotal)}</td>
                        <td className="px-4 py-3 text-sm text-center">{formatCurrency(dossier.fraisProcedure)}</td>
                        <td className="px-4 py-3 text-sm text-center font-semibold text-green-600">
                          {formatCurrency(dossier.montantTotal * 0.7)}
                        </td>
                        <td className="px-4 py-3 text-sm text-center font-semibold">
                          {formatCurrency(dossier.montantTotal * 0.7 - dossier.fraisProcedure)}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            {Math.round((dossier.montantTotal * 0.7 - dossier.fraisProcedure) / dossier.fraisProcedure * 100)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      }

      // Vue Exécution
      if (contentieuxView === 'execution') {
        return (
          <div className="space-y-6">
            {/* Statistiques exécution */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#525252]">Jugements à exécuter</p>
                    <p className="text-lg font-bold text-[#171717]">8</p>
                  </div>
                  <Gavel className="w-8 h-8 text-purple-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#525252]">Saisies en cours</p>
                    <p className="text-lg font-bold text-orange-600">5</p>
                  </div>
                  <Lock className="w-8 h-8 text-orange-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#525252]">Montants saisis</p>
                    <p className="text-lg font-bold text-green-600">12.3M</p>
                  </div>
                  <Coins className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#525252]">Taux d'exécution</p>
                    <p className="text-lg font-bold text-[#171717]">62%</p>
                  </div>
                  <CheckSquare className="w-8 h-8 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Liste des exécutions */}
            <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
              <h3 className="text-lg font-semibold text-[#171717] mb-4">Dossiers en Exécution</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-700 uppercase">Référence</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-700 uppercase">Client</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-700 uppercase">Type Exécution</th>
                      <th className="text-center px-4 py-2 text-xs font-medium text-gray-700 uppercase">Montant</th>
                      <th className="text-center px-4 py-2 text-xs font-medium text-gray-700 uppercase">Statut</th>
                      <th className="text-center px-4 py-2 text-xs font-medium text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {dossiersExecution.map((dossier) => (
                      <tr key={dossier.id}>
                        <td className="px-4 py-3 text-sm">{dossier.reference}</td>
                        <td className="px-4 py-3 text-sm">{dossier.client}</td>
                        <td className="px-4 py-3 text-sm">{dossier.typeExecution}</td>
                        <td className="px-4 py-3 text-sm text-center font-semibold">{formatCurrency(dossier.montant)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            dossier.statut === 'En cours' ? 'bg-yellow-100 text-yellow-800' :
                            dossier.statut === 'Huissier mandaté' ? 'bg-orange-100 text-orange-800' :
                            dossier.statut === 'Exécuté' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {dossier.statut}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              setSelectedExecutionDossier(dossier);
                              setShowExecutionDetailModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                            title="Voir détails de l'exécution"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Types de mesures d'exécution */}
            <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
              <h3 className="text-lg font-semibold text-[#171717] mb-4">Mesures d'Exécution Disponibles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">Saisie-attribution</h4>
                  <p className="text-sm text-blue-700">Saisie directe sur comptes bancaires</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-orange-900 mb-2">Saisie-vente</h4>
                  <p className="text-sm text-orange-700">Vente forcée de biens mobiliers/immobiliers</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-900 mb-2">Saisie sur salaire</h4>
                  <p className="text-sm text-purple-700">Prélèvement sur rémunération</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-2">Hypothèque judiciaire</h4>
                  <p className="text-sm text-green-700">Garantie sur biens immobiliers</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <h4 className="font-semibold text-red-900 mb-2">Astreinte</h4>
                  <p className="text-sm text-red-700">Pénalité journalière de retard</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-2">Plan échelonné</h4>
                  <p className="text-sm text-gray-700">Paiement fractionné validé</p>
                </div>
              </div>
            </div>
          </div>
        );
      }


      // Vue KPIs & Reporting
      if (contentieuxView === 'kpi') {
        return (
          <div className="space-y-6">
            {/* KPIs consolidés */}
            <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
              <h3 className="text-lg font-semibold text-[#171717] mb-4">Indicateurs de Performance - Vue Consolidée</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-lg font-bold text-[#171717]">82%</p>
                  <p className="text-sm text-gray-600 mt-1">Taux succès amiable</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-lg font-bold text-[#171717]">67%</p>
                  <p className="text-sm text-gray-600 mt-1">Taux succès contentieux</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-lg font-bold text-green-600">3.2x</p>
                  <p className="text-sm text-gray-600 mt-1">ROI global</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-lg font-bold text-[#171717]">45j</p>
                  <p className="text-sm text-gray-600 mt-1">Délai moyen amiable</p>
                </div>
              </div>
            </div>

            {/* Évolution temporelle */}
            <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
              <h3 className="text-lg font-semibold text-[#171717] mb-4">Évolution des Performances</h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={[
                  { mois: 'Août', amiable: 78, contentieux: 62, roi: 2.8 },
                  { mois: 'Sept', amiable: 80, contentieux: 65, roi: 2.9 },
                  { mois: 'Oct', amiable: 82, contentieux: 64, roi: 3.0 },
                  { mois: 'Nov', amiable: 81, contentieux: 68, roi: 3.1 },
                  { mois: 'Déc', amiable: 83, contentieux: 66, roi: 3.2 },
                  { mois: 'Jan', amiable: 82, contentieux: 67, roi: 3.2 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mois" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="amiable" stroke="#22c55e" name="Taux succès amiable %" />
                  <Line yAxisId="left" type="monotone" dataKey="contentieux" stroke="#ef4444" name="Taux succès contentieux %" />
                  <Line yAxisId="right" type="monotone" dataKey="roi" stroke="#3b82f6" name="ROI (x)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Analyse prédictive */}
            <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
              <h3 className="text-lg font-semibold text-[#171717] mb-4">Analyse Prédictive</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-3">Prévisions Q1 2024</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Transferts vers contentieux estimés</span>
                      <span className="text-sm font-semibold">65 dossiers</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Montant en contentieux prévu</span>
                      <span className="text-sm font-semibold">42M FCFA</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Taux de succès attendu</span>
                      <span className="text-sm font-semibold">69%</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-3">Recommandations IA</h4>
                  <ul className="space-y-1 text-sm text-green-800">
                    <li>• Augmenter les relances J+30 pour réduire transferts</li>
                    <li>• Privilégier injonctions de payer (ROI 4.2x)</li>
                    <li>• Focus sur dossiers 2-5M FCFA (meilleur ratio)</li>
                    <li>• Renforcer équipe amiable zone Abidjan Nord</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Actions de reporting */}
            <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
              <h3 className="text-lg font-semibold text-[#171717] mb-4">Rapports Disponibles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <button
                  onClick={() => setShowRapportMensuelModal(true)}
                  className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left transition-colors hover:border-blue-400"
                >
                  <FileText className="w-6 h-6 text-blue-600 mb-2" />
                  <h4 className="font-semibold text-[#171717]">Rapport mensuel consolidé</h4>
                  <p className="text-sm text-gray-600 mt-1">Amiable + Contentieux</p>
                </button>
                <button
                  onClick={() => setShowAnalyseROIModal(true)}
                  className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left transition-colors hover:border-green-400"
                >
                  <BarChart3 className="w-6 h-6 text-green-600 mb-2" />
                  <h4 className="font-semibold text-[#171717]">Analyse ROI détaillée</h4>
                  <p className="text-sm text-gray-600 mt-1">Par phase et procédure</p>
                </button>
                <button
                  onClick={() => setShowPerformanceEquipeModal(true)}
                  className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left transition-colors hover:border-orange-400"
                >
                  <Users className="w-6 h-6 text-orange-600 mb-2" />
                  <h4 className="font-semibold text-[#171717]">Performance équipes</h4>
                  <p className="text-sm text-gray-600 mt-1">Agents et gestionnaires</p>
                </button>
                <button
                  onClick={() => setShowPrevisionTresorerieModal(true)}
                  className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left transition-colors hover:border-purple-400"
                >
                  <TrendingUp className="w-6 h-6 text-purple-600 mb-2" />
                  <h4 className="font-semibold text-[#171717]">Prévisions trésorerie</h4>
                  <p className="text-sm text-gray-600 mt-1">3-6 mois glissants</p>
                </button>
                <button
                  onClick={() => setShowDossiersRisqueModal(true)}
                  className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left transition-colors hover:border-red-400"
                >
                  <AlertTriangle className="w-6 h-6 text-red-600 mb-2" />
                  <h4 className="font-semibold text-[#171717]">Dossiers à risque</h4>
                  <p className="text-sm text-gray-600 mt-1">Alertes et escalades</p>
                </button>
                <button
                  onClick={() => setShowExportPersonnaliseModal(true)}
                  className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left transition-colors hover:border-gray-500"
                >
                  <Download className="w-6 h-6 text-gray-600 mb-2" />
                  <h4 className="font-semibold text-[#171717]">Export personnalisé</h4>
                  <p className="text-sm text-gray-600 mt-1">Excel / PDF / CSV</p>
                </button>
              </div>
            </div>
          </div>
        );
      }

      // Vue Liste des dossiers
      if (contentieuxView === 'liste') {
        return (
          <div className="space-y-6">
            {/* En-tête avec statistiques */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#525252]">Dossiers actifs</p>
                    <p className="text-lg font-bold text-[#171717]">12</p>
                  </div>
                  <Scale className="w-8 h-8 text-orange-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#525252]">Montant en contentieux</p>
                    <p className="text-lg font-bold text-[#171717]">28.4M</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-red-600" />
                </div>
              </div>
            <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#525252]">Taux de succès</p>
                  <p className="text-lg font-bold text-green-600">67%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#525252]">Audiences ce mois</p>
                  <p className="text-lg font-bold text-[#171717]">8</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Filtres et actions */}
          <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex flex-wrap gap-2">
                <select
                  value={filterStatutContentieux}
                  onChange={(e) => setFilterStatutContentieux(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {statutsContentieux.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <select
                  value={filterProcedure}
                  onChange={(e) => setFilterProcedure(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {typesProcedure.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors" aria-label="Télécharger">
                  <Download className="w-4 h-4" />
                  <span>{t('common.export')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tableau des dossiers contentieux */}
          <div className="bg-white rounded-lg border border-[#e5e5e5] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Référence
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Montant Total
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Statut Juridique
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Procédure
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Avocat
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Prochaine Échéance
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredContentieux.map(dossier => (
                    <tr key={dossier.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-[#171717]">{dossier.numeroRef}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-[#171717]">{dossier.client}</div>
                          <div className="text-xs text-gray-700">Origine: {dossier.origineAmiable}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-semibold text-[#171717]">
                            {formatCurrency(dossier.montantTotal)}
                          </div>
                          <div className="text-xs text-gray-700">
                            Principal: {formatCurrency(dossier.montantPrincipal)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatutColor(dossier.statutJuridique)}`}>
                          {dossier.statutJuridique.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-[#171717]">
                          {dossier.typeProcedure.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-[#171717]">{dossier.avocat}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-[#171717]">{dossier.prochaineEcheance}</div>
                          <div className={`text-xs font-medium ${getUrgenceIndicator(dossier.joursRestants)}`}>
                            Dans {dossier.joursRestants} jours
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedContentieux(dossier);
                              setContentieuxView('detail');
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditContentieuxModal(dossier)}
                            className="text-orange-600 hover:text-orange-800"
                            title="Modifier le dossier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              initWorkflowForDossier(dossier.id);
                              setSelectedDossierWorkflow(dossier);
                              setShowWorkflowModal(true);
                            }}
                            className="text-purple-600 hover:text-purple-800"
                            title="Gérer le workflow"
                          >
                            <Activity className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedContentieuxDetail(dossier);
                              setShowContentieuxDetailPage(true);
                              setActiveContentieuxTab('general');
                            }}
                            className="text-green-600 hover:text-green-800"
                            title="Page détaillée du dossier"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        );
      }

      // Vue Détail d'un dossier contentieux
      if (contentieuxView === 'detail' && selectedContentieux) {
        return (
          <div className="space-y-6">
          {/* Header détail */}
          <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center space-x-4 mb-2">
                  <button
                    onClick={() => {
                      setContentieuxView('liste');
                      setSelectedContentieux(null);
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-lg font-bold text-[#171717]">
                    Dossier Contentieux {selectedContentieux.numeroRef}
                  </h2>
                </div>
                <div className="flex items-center space-x-4 mt-4">
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatutColor(selectedContentieux.statutJuridique)}`}>
                    {selectedContentieux.statutJuridique.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-600">
                    Transféré le {selectedContentieux.dateTransfert}
                  </span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Send className="w-4 h-4" />
                  <span>Envoyer mise à jour</span>
                </button>
                <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                  <Download className="w-4 h-4" />
                  <span>Générer rapport</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Informations principales */}
            <div className="lg:col-span-2 space-y-6">
              {/* Timeline de la procédure */}
              <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                <h3 className="text-lg font-semibold text-[#171717] mb-4">Timeline de la procédure</h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="font-medium text-[#171717]">Transfert en contentieux</span>
                        <span className="text-sm text-gray-700">15/01/2024</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{selectedContentieux.motifTransfert}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="font-medium text-[#171717]">Constitution du dossier</span>
                        <span className="text-sm text-gray-700">16/01/2024</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Dossier complet transmis à {selectedContentieux.avocat}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Clock className="w-4 h-4 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="font-medium text-[#171717]">Mise en demeure envoyée</span>
                        <span className="text-sm text-gray-700">18/01/2024</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">En attente de réponse du débiteur</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <Clock className="w-4 h-4 text-gray-700" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700">Assignation prévue</span>
                        <span className="text-sm text-gray-700">{selectedContentieux.prochaineEcheance}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Documents du dossier */}
              <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                <h3 className="text-lg font-semibold text-[#171717] mb-4">Documents juridiques</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-gray-700" />
                      <div>
                        <span className="text-sm font-medium text-[#171717]">Factures impayées.pdf</span>
                        <span className="text-xs text-gray-700 ml-2">2.4 MB</span>
                      </div>
                    </div>
                    <button className="text-blue-600 hover:text-blue-800" aria-label="Télécharger">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-gray-700" />
                      <div>
                        <span className="text-sm font-medium text-[#171717]">Contrat client.pdf</span>
                        <span className="text-xs text-gray-700 ml-2">1.2 MB</span>
                      </div>
                    </div>
                    <button className="text-blue-600 hover:text-blue-800" aria-label="Télécharger">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-gray-700" />
                      <div>
                        <span className="text-sm font-medium text-[#171717]">Mise en demeure.pdf</span>
                        <span className="text-xs text-gray-700 ml-2">450 KB</span>
                      </div>
                    </div>
                    <button className="text-blue-600 hover:text-blue-800" aria-label="Télécharger">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <button className="mt-4 w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Upload className="w-4 h-4" />
                  <span>Ajouter un document</span>
                </button>
              </div>

              {/* Actions disponibles */}
              <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                <h3 className="text-lg font-semibold text-[#171717] mb-4">Actions de procédure</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowAssignationModal(true)}
                    className="flex items-center justify-center space-x-2 px-4 py-3 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200">
                    <Scale className="w-5 h-5" />
                    <span>Préparer assignation</span>
                  </button>
                  <button
                    onClick={() => setShowAudienceModal(true)}
                    className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                    <Calendar className="w-5 h-5" />
                    <span>Planifier audience</span>
                  </button>
                  <button
                    onClick={() => setShowConclusionsModal(true)}
                    className="flex items-center justify-center space-x-2 px-4 py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200">
                    <FileText className="w-5 h-5" />
                    <span>Générer conclusions</span>
                  </button>
                  <button
                    onClick={() => setShowJugementModal(true)}
                    className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                    <CheckCircle className="w-5 h-5" />
                    <span>Enregistrer jugement</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar avec informations complémentaires */}
            <div className="space-y-6">
              {/* Détails financiers */}
              <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                <h3 className="text-lg font-semibold text-[#171717] mb-4">Détails financiers</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Montant principal</span>
                    <span className="text-sm font-semibold text-[#171717]">
                      {formatCurrency(selectedContentieux.montantPrincipal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Intérêts de retard</span>
                    <span className="text-sm font-semibold text-[#171717]">
                      {formatCurrency(selectedContentieux.interetsRetard)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Frais de procédure</span>
                    <span className="text-sm font-semibold text-[#171717]">
                      {formatCurrency(selectedContentieux.fraisProcedure)}
                    </span>
                  </div>
                  <hr />
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold text-gray-700">Total à recouvrer</span>
                    <span className="text-lg font-bold text-[#171717]">
                      {formatCurrency(selectedContentieux.montantTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Informations avocat */}
              <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                <h3 className="text-lg font-semibold text-[#171717] mb-4">Avocat en charge</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <UserCircle className="w-10 h-10 text-gray-700" />
                    <div>
                      <p className="font-semibold text-[#171717]">{selectedContentieux.avocat}</p>
                      <p className="text-sm text-gray-600">Cabinet KONE & Associés</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-gray-700" />
                      <span className="text-sm text-gray-600">+225 27 20 30 40 50</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-gray-700" />
                      <span className="text-sm text-gray-600">contact@kone-associes.ci</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowContactAvocatModal(true)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Contacter l'avocat
                  </button>
                </div>
              </div>

              {/* Prochaines échéances */}
              <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                <h3 className="text-lg font-semibold text-[#171717] mb-4">Prochaines échéances</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-[#171717]">Délai de réponse mise en demeure</p>
                        <p className="text-sm text-gray-600 mt-1">01/02/2024</p>
                      </div>
                      <span className="text-xs font-semibold text-red-600">8 jours</span>
                    </div>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-[#171717]">Audience tribunal commerce</p>
                        <p className="text-sm text-gray-600 mt-1">15/02/2024</p>
                      </div>
                      <span className="text-xs font-semibold text-yellow-600">22 jours</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions rapides */}
              <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                <h3 className="text-lg font-semibold text-[#171717] mb-4">Actions rapides</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setShowRetourAmiableModal(true)}
                    className="w-full px-4 py-2 text-left bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100">
                    Retourner en amiable
                  </button>
                  <button
                    onClick={() => setShowExpertiseModal(true)}
                    className="w-full px-4 py-2 text-left bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100">
                    Demander expertise
                  </button>
                  <button
                    onClick={() => setShowClotureModal(true)}
                    className="w-full px-4 py-2 text-left bg-gray-50 text-red-600 rounded-lg hover:bg-red-50">
                    Clôturer le dossier
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        );
      }

      return null;
    }

  };

  const COLORS = ['#171717', '#525252', '#a3a3a3', '#3b82f6', '#22c55e', '#f59e0b'];

  return (
    <div className="p-6 bg-[#e5e5e5] min-h-screen ">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/tiers')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#404040]" />
              <span className="text-sm font-semibold text-[#404040]">Tiers</span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#171717]">{t('thirdParty.collection')}</h1>
                <p className="text-sm text-[#525252]">Gestion des créances et processus de recouvrement</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2 bg-[#737373] text-white rounded-lg hover:bg-[#525252] transition-colors" aria-label="Télécharger">
              <Download className="w-4 h-4" />
              <span className="text-sm font-semibold">{t('common.export')}</span>
            </button>

            <button
              onClick={() => setShowActionModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span className="text-sm font-semibold">Nouvelle Relance</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mt-6 bg-gray-100 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-[#737373] shadow-sm'
                  : 'text-[#525252] hover:text-[#404040]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Créances Tab */}
      {activeTab === 'creances' && (
        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#525252]">Créances Totales</p>
                  <p className="text-lg font-bold text-[#171717]">
                    {formatCurrency(analyticsData.statistiques.montantTotalCreances)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#525252]">Montant Recouvré</p>
                  <p className="text-lg font-bold text-[#171717]">
                    {formatCurrency(analyticsData.statistiques.montantRecouvre)}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#525252]">Taux Recouvrement</p>
                  <p className="text-lg font-bold text-[#171717]">
                    {analyticsData.statistiques.tauxRecouvrement}%
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-[#171717]" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#525252]">Délai Moyen</p>
                  <p className="text-lg font-bold text-[#171717]">
                    {analyticsData.statistiques.delaiMoyenRecouvrement}j
                  </p>
                </div>
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-700" />
                <input
                  type="text"
                  placeholder="Rechercher par nom ou code client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#737373] focus:border-transparent"
                />
              </div>

              <select
                value={filterStatut}
                onChange={(e) => setFilterStatut(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#737373]"
              >
                {statutOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <select
                value={filterNiveau}
                onChange={(e) => setFilterNiveau(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#737373]"
              >
                {niveauOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50" aria-label="Filtrer">
                <Filter className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Créances Table */}
          <div className="bg-white rounded-lg border border-[#e5e5e5] shadow-sm overflow-hidden">
            {selectedFactures.size > 0 && (
              <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800">
                    {selectedFactures.size} facture{selectedFactures.size > 1 ? 's' : ''} sélectionnée{selectedFactures.size > 1 ? 's' : ''}
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={createDossierRecouvrement}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Créer Dossier de Recouvrement
                    </button>
                    <button
                      onClick={() => setSelectedFactures(new Set())}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-8"></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Montant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Retard</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Niveau</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Dernière Relance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Assigné à</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCreances.map((creance) => (
                    <React.Fragment key={creance.id}>
                      {/* Ligne principale du client */}
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleClientExpansion(creance.id)}
                            className="flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100"
                          >
                            {expandedClients.has(creance.id) ?
                              <ChevronDown className="w-4 h-4 text-gray-600" /> :
                              <ChevronRight className="w-4 h-4 text-gray-600" />
                            }
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                              creance.crmData ?
                                (creance.crmData.scoreRisque > 70 ? 'bg-green-100' :
                                 creance.crmData.scoreRisque > 40 ? 'bg-orange-100' : 'bg-red-100') :
                                'bg-gray-100'
                            }`}>
                              <Building className={`w-5 h-5 ${
                                creance.crmData ?
                                  (creance.crmData.scoreRisque > 70 ? 'text-green-600' :
                                   creance.crmData.scoreRisque > 40 ? 'text-orange-600' : 'text-red-600') :
                                  'text-gray-600'
                              }`} />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{creance.clientNom}</div>
                            <div className="text-sm text-gray-700">{creance.clientCode}</div>
                            {creance.crmData && (
                              <div className="flex items-center space-x-2 mt-1">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  creance.crmData.scoreRisque > 70 ? 'bg-green-100 text-green-800' :
                                  creance.crmData.scoreRisque > 40 ? 'bg-orange-100 text-orange-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  <Users className="w-3 h-3 mr-1" />
                                  Score: {creance.crmData.scoreRisque}
                                </span>
                                <span className="text-xs text-gray-700">
                                  CA: {formatCurrency(creance.crmData.chiffreAffairesAnnuel)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(creance.montantTotal)}
                        </div>
                        <div className="text-sm text-gray-700">
                          {creance.factures.length} facture{creance.factures.length > 1 ? 's' : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${getUrgenceColor(creance.joursRetard)}`}>
                          {creance.joursRetard > 0 ? `${creance.joursRetard} jours` : 'À jour'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getNiveauColor(creance.niveauRelance)}`}>
                          {creance.niveauRelance.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {creance.derniereRelance ? formatDate(creance.derniereRelance) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <p className="font-medium">{creance.assigneA}</p>
                          {creance.commercialData && (
                            <p className="text-xs text-gray-700">
                              Com: {creance.commercialData.gestionnaireCom}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatutColor(creance.statut)}`}>
                          {creance.statut.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2 justify-end">
                          <button
                            onClick={() => setSelectedCreance(creance)}
                            className="p-1 text-[#171717] hover:text-[#171717]/80 relative"
                            title="Voir détails"
                          >
                            <Eye className="w-4 h-4" />
                            {creance.crmData && creance.commercialData && (
                              <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCreance(creance);
                              setShowActionModal(true);
                            }}
                            className="p-1 text-orange-600 hover:text-orange-900 relative"
                            title="Nouvelle action"
                          >
                            <Bell className="w-4 h-4" />
                            {creance.crmData?.scoreRisque && creance.crmData.scoreRisque < 40 && (
                              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            )}
                          </button>
                          <button
                            className="p-1 text-green-600 hover:text-green-900 relative"
                            title={creance.crmData?.contactPrincipal?.telephone ?
                              `Appeler ${creance.crmData.contactPrincipal.nom}` : 'Appeler'}
                            onClick={() => {
                              if (creance.crmData?.contactPrincipal?.telephone) {
                                window.open(`tel:${creance.crmData.contactPrincipal.telephone}`);
                              }
                            }}
                          >
                            <Phone className="w-4 h-4" />
                            {creance.crmData?.contactPrincipal && (
                              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
                            )}
                          </button>
                          <button
                            className="p-1 text-[#525252] hover:text-[#525252]/80 relative"
                            title={creance.crmData?.contactPrincipal?.email ?
                              `Email à ${creance.crmData.contactPrincipal.nom}` : 'Email'}
                            onClick={() => {
                              if (creance.crmData?.contactPrincipal?.email) {
                                window.open(`mailto:${creance.crmData.contactPrincipal.email}`);
                              }
                            }}
                          >
                            <Mail className="w-4 h-4" />
                            {creance.crmData?.contactPrincipal && (
                              <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </button>
                          {creance.commercialData?.litigesActifs && creance.commercialData.litigesActifs > 0 && (
                            <div className="flex items-center space-x-1">
                              <AlertTriangle className="w-4 h-4 text-red-500" title={`${creance.commercialData.litigesActifs} litige(s) actif(s)`} />
                            </div>
                          )}
                        </div>
                        </td>
                      </tr>

                      {/* Lignes de détail des factures (expandable) */}
                      {expandedClients.has(creance.id) && creance.factures.map((facture: InvoiceDebt) => (
                        <tr key={facture.factureId} className="bg-gray-50">
                          <td className="px-6 py-3"></td>
                          <td className="px-6 py-3">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={selectedFactures.has(facture.factureId)}
                                onChange={() => toggleFactureSelection(facture.factureId)}
                                className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="pl-8">
                                <div className="text-sm font-medium text-gray-700">
                                  Facture {facture.numero}
                                </div>
                                <div className="text-xs text-gray-700">
                                  Émise le {formatDate(facture.date)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <div className="text-sm text-gray-700">
                              {formatCurrency(facture.montantRestant)}
                            </div>
                            <div className="text-xs text-gray-700">
                              sur {formatCurrency(facture.montantOriginal)}
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <div className={`text-sm ${getUrgenceColor(facture.joursRetard)}`}>
                              {facture.joursRetard > 0 ? `${facture.joursRetard} jours` :
                               facture.joursRetard < 0 ? `Dans ${Math.abs(facture.joursRetard)} jours` : 'Échue aujourd\'hui'}
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <div className="text-sm text-gray-600">
                              Échéance: {formatDate(facture.dateEcheance)}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-700">-</td>
                          <td className="px-6 py-3 text-sm text-gray-700">-</td>
                          <td className="px-6 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              facture.joursRetard > 30 ? 'bg-red-100 text-red-800' :
                              facture.joursRetard > 0 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {facture.joursRetard > 30 ? 'Critique' :
                               facture.joursRetard > 0 ? 'En retard' : 'À jour'}
                            </span>
                          </td>
                          <td className="px-6 py-3"></td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab avec sous-onglets */}
      {activeTab === 'analytics' && <AnalyticsTab />}

      {/* Créance Detail Modal */}
      {selectedCreance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-[#171717]">
                  Détail Créance - {selectedCreance.clientNom}
                </h2>
                <button
                  onClick={() => setSelectedCreance(null)}
                  className="text-gray-700 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              {/* Section principale avec informations organisées */}
              <div className="space-y-6 mb-6">
                {/* Première ligne: Informations de base */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Informations client */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-[#171717]">Informations Client</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Nom</label>
                        <p className="text-[#171717]">{selectedCreance.clientNom}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Code</label>
                        <p className="text-[#171717]">{selectedCreance.clientCode}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Assigné à</label>
                        <p className="text-[#171717]">{selectedCreance.assigneA}</p>
                      </div>
                    </div>
                  </div>

                  {/* Informations créance */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-[#171717]">Informations Créance</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Montant total</label>
                        <p className="text-[#171717] font-semibold">{formatCurrency(selectedCreance.montantTotal)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Jours de retard</label>
                        <p className={`font-semibold ${getUrgenceColor(selectedCreance.joursRetard)}`}>
                          {selectedCreance.joursRetard > 0 ? `${selectedCreance.joursRetard} jours` : 'À jour'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Niveau de relance</label>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getNiveauColor(selectedCreance.niveauRelance)}`}>
                          {selectedCreance.niveauRelance.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Deuxième ligne: Données CRM et Commerciales */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Données CRM enrichies */}
                  {selectedCreance.crmData && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-[#171717] flex items-center">
                        <Users className="w-5 h-5 mr-2 text-blue-600" />
                        Profil CRM
                      </h3>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-blue-700">Score de risque</label>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            selectedCreance.crmData.scoreRisque > 70 ? 'bg-green-100 text-green-800' :
                            selectedCreance.crmData.scoreRisque > 40 ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {selectedCreance.crmData.scoreRisque}/100
                          </span>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-blue-700">Catégorie paiement</label>
                          <p className="text-blue-900">{selectedCreance.crmData.categoriePaiement}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-blue-700">CA annuel</label>
                          <p className="text-blue-900 font-semibold">{formatCurrency(selectedCreance.crmData.chiffreAffairesAnnuel)}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-blue-700">Ancienneté</label>
                          <p className="text-blue-900">{selectedCreance.crmData.ancienneteClient}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-blue-700">Contact principal</label>
                          <div className="text-blue-900">
                            <p className="font-medium">{selectedCreance.crmData.contactPrincipal.nom}</p>
                            <p className="text-sm">{selectedCreance.crmData.contactPrincipal.fonction}</p>
                            <div className="flex flex-col space-y-1 mt-1">
                              <a href={`tel:${selectedCreance.crmData.contactPrincipal.telephone}`}
                                 className="text-xs text-blue-600 hover:text-blue-800">
                                {selectedCreance.crmData.contactPrincipal.telephone}
                              </a>
                              <a href={`mailto:${selectedCreance.crmData.contactPrincipal.email}`}
                                 className="text-xs text-blue-600 hover:text-blue-800">
                                {selectedCreance.crmData.contactPrincipal.email}
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Données commerciales */}
                  {selectedCreance.commercialData && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-[#171717] flex items-center">
                        <ShoppingCart className="w-5 h-5 mr-2 text-purple-600" />
                        Données Commerciales
                      </h3>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-purple-700">Gestionnaire</label>
                          <p className="text-purple-900">{selectedCreance.commercialData.gestionnaireCom}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-purple-700">Secteur d'activité</label>
                          <p className="text-purple-900">{selectedCreance.commercialData.secteurActivite}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-purple-700">Conditions particulières</label>
                          <div className="text-purple-900 space-y-1">
                            <p className="text-sm">Délai: {selectedCreance.commercialData.conditionsParticulieres.delaiPaiement}</p>
                            <p className="text-sm">Remise: {selectedCreance.commercialData.conditionsParticulieres.remiseAccordee}</p>
                            <p className="text-sm">Plafond: {formatCurrency(selectedCreance.commercialData.conditionsParticulieres.plafondCredit)}</p>
                          </div>
                        </div>
                        {selectedCreance.commercialData.litigesActifs > 0 && (
                          <div className="bg-red-100 border border-red-200 rounded p-2">
                            <span className="text-sm font-medium text-red-800">
                              ⚠️ {selectedCreance.commercialData.litigesActifs} litige{selectedCreance.commercialData.litigesActifs > 1 ? 's' : ''} actif{selectedCreance.commercialData.litigesActifs > 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Factures */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-[#171717] mb-4">Factures</h3>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Numéro</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">{t('common.date')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Échéance</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Montant Original</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Restant</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Retard</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedCreance.factures.map((facture: InvoiceDebt) => (
                        <tr key={facture.factureId}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{facture.numero}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{formatDate(facture.date)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{formatDate(facture.dateEcheance)}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(facture.montantOriginal)}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-red-600">{formatCurrency(facture.montantRestant)}</td>
                          <td className={`px-4 py-3 text-sm text-center font-medium ${getUrgenceColor(facture.joursRetard)}`}>
                            {facture.joursRetard > 0 ? `${facture.joursRetard}j` : 'OK'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Historique des relances */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-[#171717] mb-4">Historique des Relances</h3>
                <div className="space-y-3">
                  {selectedCreance.relances.map((relance: CollectionAction) => {
                    const IconComponent = getActionIcon(relance.type);
                    return (
                      <div key={relance.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 bg-[#171717]/10 rounded-full flex items-center justify-center">
                          <IconComponent className="w-5 h-5 text-[#171717]" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-[#171717]">{relance.description}</h4>
                            <span className="text-sm text-[#525252]">{formatDate(relance.date)}</span>
                          </div>
                          <p className="text-sm text-[#525252] mt-1">
                            <strong>Moyen:</strong> {relance.moyenCommunication} •
                            <strong> Responsable:</strong> {relance.responsable}
                          </p>
                          {relance.resultat && (
                            <p className="text-sm text-green-600 mt-1">
                              <strong>Résultat:</strong> {relance.resultat}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Commentaires */}
              {selectedCreance.commentaires && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-[#171717] mb-4">Commentaires</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-[#171717]">{selectedCreance.commentaires}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedCreance(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Fermer
                </button>
                <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                  Nouvelle Action
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onglet Relances avec sous-onglets */}
      {activeTab === 'relances' && (
        <div className="space-y-6">
          {/* KPIs des relances */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-600 font-medium">Total Relances</div>
              <div className="text-lg font-bold text-blue-900">248</div>
              <div className="text-xs text-blue-600 mt-1">Ce mois</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="text-sm text-yellow-600 font-medium">En Attente</div>
              <div className="text-lg font-bold text-yellow-900">32</div>
              <div className="text-xs text-yellow-600 mt-1">À envoyer</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-green-600 font-medium">Taux de Réponse</div>
              <div className="text-lg font-bold text-green-900">65%</div>
              <div className="text-xs text-green-600 mt-1">Sur 7 jours</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-purple-600 font-medium">Clients Relancés</div>
              <div className="text-lg font-bold text-purple-900">87</div>
              <div className="text-xs text-purple-600 mt-1">Ce mois</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-sm text-red-600 font-medium">Sans Réponse</div>
              <div className="text-lg font-bold text-red-900">15</div>
              <div className="text-xs text-red-600 mt-1">+3 relances</div>
            </div>
          </div>

          {/* Sous-onglets */}
          <div className="bg-white rounded-lg border border-[#e5e5e5] shadow-sm">
            <div className="border-b border-[#e5e5e5]">
              <div className="flex">
                <button
                  onClick={() => setActiveRelanceSubTab('historique')}
                  className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                    activeRelanceSubTab === 'historique'
                      ? 'text-blue-600 border-blue-600'
                      : 'text-gray-600 border-transparent hover:text-gray-900'
                  }`}
                >
                  Historique des Relances
                </button>
                <button
                  onClick={() => setActiveRelanceSubTab('parametres')}
                  className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                    activeRelanceSubTab === 'parametres'
                      ? 'text-blue-600 border-blue-600'
                      : 'text-gray-600 border-transparent hover:text-gray-900'
                  }`}
                >
                  Paramètres de Relance
                </button>
              </div>
            </div>

            {/* Contenu du sous-onglet Historique */}
            {activeRelanceSubTab === 'historique' && (
              <div>
            <div className="p-6 border-b border-[#e5e5e5]">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-[#171717]">Historique des Relances par Client</h2>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Rechercher un client..."
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filtrer
                  </button>
                </div>
              </div>
            </div>

            <div className="divide-y divide-[#e5e5e5]">
              {[
                {
                  client: 'SARL CONGO BUSINESS',
                  nombreRelances: 12,
                  derniereRelance: '20/01/2025',
                  montantTotal: 485000,
                  statut: 'En cours',
                  tauxReponse: 75,
                  relances: [
                    { date: '20/01/2025', type: 'Email', objet: 'Rappel: Facture FAC-2024-089 en retard', statut: 'Envoyé', reponse: false },
                    { date: '15/01/2025', type: 'Appel', objet: 'Relance téléphonique', statut: 'Complété', reponse: true },
                    { date: '10/01/2025', type: 'SMS', objet: 'Rappel automatique', statut: 'Envoyé', reponse: false },
                    { date: '05/01/2025', type: 'Courrier', objet: 'Mise en demeure', statut: 'Envoyé', reponse: true },
                    { date: '28/12/2024', type: 'Email', objet: 'Première relance', statut: 'Envoyé', reponse: true }
                  ]
                },
                {
                  client: 'ENTREPRISE MBOTE',
                  nombreRelances: 8,
                  derniereRelance: '19/01/2025',
                  montantTotal: 325000,
                  statut: 'En attente',
                  tauxReponse: 50,
                  relances: [
                    { date: '19/01/2025', type: 'Email', objet: 'Relance: 3 factures impayées', statut: 'Envoyé', reponse: false },
                    { date: '12/01/2025', type: 'Appel', objet: 'Contact commercial', statut: 'Complété', reponse: true },
                    { date: '08/01/2025', type: 'Email', objet: 'Rappel échéance', statut: 'Envoyé', reponse: false },
                    { date: '02/01/2025', type: 'SMS', objet: 'Notification automatique', statut: 'Envoyé', reponse: true }
                  ]
                },
                {
                  client: 'SOCIETE MAKASI',
                  nombreRelances: 15,
                  derniereRelance: '21/01/2025',
                  montantTotal: 875000,
                  statut: 'Critique',
                  tauxReponse: 20,
                  relances: [
                    { date: '21/01/2025', type: 'Huissier', objet: 'Signification commandement', statut: 'En cours', reponse: false },
                    { date: '18/01/2025', type: 'Courrier AR', objet: 'Dernière mise en demeure', statut: 'Reçu', reponse: false },
                    { date: '14/01/2025', type: 'Appel', objet: 'Tentative négociation', statut: 'Sans réponse', reponse: false },
                    { date: '10/01/2025', type: 'Email', objet: 'Mise en demeure', statut: 'Lu', reponse: false },
                    { date: '05/01/2025', type: 'Courrier', objet: 'Relance formelle', statut: 'Envoyé', reponse: false }
                  ]
                }
              ].map((clientData, index) => (
                <div key={index} className="p-4">
                  <div
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-lg"
                    onClick={() => {
                      const key = `relance-${index}`;
                      if (expandedClients.has(key)) {
                        const newExpanded = new Set(expandedClients);
                        newExpanded.delete(key);
                        setExpandedClients(newExpanded);
                      } else {
                        setExpandedClients(new Set([...expandedClients, key]));
                      }
                    }}
                  >
                    <div className="flex items-center gap-4">
                      {expandedClients.has(`relance-${index}`) ? (
                        <ChevronDown className="w-5 h-5 text-gray-700" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-700" />
                      )}
                      <div>
                        <h3 className="font-semibold text-[#171717]">{clientData.client}</h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span>{clientData.nombreRelances} relances</span>
                          <span>•</span>
                          <span>Dernière: {clientData.derniereRelance}</span>
                          <span>•</span>
                          <span className="font-medium">{formatCurrency(clientData.montantTotal)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Taux de réponse</div>
                        <div className="text-lg font-semibold">{clientData.tauxReponse}%</div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        clientData.statut === 'En cours' ? 'bg-blue-100 text-blue-800' :
                        clientData.statut === 'En attente' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {clientData.statut}
                      </span>
                    </div>
                  </div>

                  {/* Détails des relances expandable */}
                  {expandedClients.has(`relance-${index}`) && (
                    <div className="mt-4 ml-9">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-3">Historique des relances</h4>
                        <div className="space-y-2">
                          {clientData.relances.map((relance, rIndex) => (
                            <div key={rIndex} className="bg-white rounded-lg p-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                  relance.type === 'Email' ? 'bg-blue-100' :
                                  relance.type === 'Appel' ? 'bg-green-100' :
                                  relance.type === 'SMS' ? 'bg-purple-100' :
                                  relance.type === 'Courrier' || relance.type === 'Courrier AR' ? 'bg-yellow-100' :
                                  'bg-red-100'
                                }`}>
                                  {relance.type === 'Email' && <Mail className="w-5 h-5 text-blue-600" />}
                                  {relance.type === 'Appel' && <Phone className="w-5 h-5 text-green-600" />}
                                  {relance.type === 'SMS' && <MessageSquare className="w-5 h-5 text-purple-600" />}
                                  {(relance.type === 'Courrier' || relance.type === 'Courrier AR') && <Send className="w-5 h-5 text-yellow-600" />}
                                  {relance.type === 'Huissier' && <Scale className="w-5 h-5 text-red-600" />}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">{relance.objet}</div>
                                  <div className="text-sm text-gray-600">
                                    {relance.date} • {relance.type}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  relance.statut === 'Envoyé' || relance.statut === 'Lu' ? 'bg-blue-100 text-blue-800' :
                                  relance.statut === 'Complété' || relance.statut === 'Reçu' ? 'bg-green-100 text-green-800' :
                                  relance.statut === 'Sans réponse' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {relance.statut}
                                </span>
                                {relance.reponse ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-gray-700" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-4">
                          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2">
                            <Bell className="w-4 h-4" />
                            Nouvelle Relance
                          </button>
                          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            Voir Dossier
                          </button>
                          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            Exporter
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
              </div>
            )}

            {/* Contenu du sous-onglet Paramètres */}
            {activeRelanceSubTab === 'parametres' && (
              <div>
                {/* Sous-onglets des paramètres */}
                <div className="border-b border-gray-200 bg-white">
                  <nav className="-mb-px flex space-x-8 px-6">
                    <button
                      onClick={() => setActiveParametresTab('configuration')}
                      className={`py-3 px-1 border-b-2 font-medium text-sm ${
                        activeParametresTab === 'configuration'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Configuration Générale
                    </button>
                    <button
                      onClick={() => setActiveParametresTab('scenarios')}
                      className={`py-3 px-1 border-b-2 font-medium text-sm ${
                        activeParametresTab === 'scenarios'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Scénarios Automatiques
                    </button>
                    <button
                      onClick={() => setActiveParametresTab('templates')}
                      className={`py-3 px-1 border-b-2 font-medium text-sm ${
                        activeParametresTab === 'templates'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Templates de Messages
                    </button>
                    <button
                      onClick={() => setActiveParametresTab('exclusions')}
                      className={`py-3 px-1 border-b-2 font-medium text-sm ${
                        activeParametresTab === 'exclusions'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Règles d'Exclusion
                    </button>
                  </nav>
                </div>

                {/* Contenu des sous-onglets */}
                <div className="p-6 bg-gray-50 min-h-[600px]">
                  {/* Configuration Générale */}
                  {activeParametresTab === 'configuration' && (
                    <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <Settings className="w-5 h-5 text-gray-600" />
                      Configuration Générale
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Délai avant première relance
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-24"
                            defaultValue="7"
                          />
                          <span className="text-sm text-gray-600">jours après échéance</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Intervalle entre relances
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-24"
                            defaultValue="7"
                          />
                          <span className="text-sm text-gray-600">jours</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nombre maximum de relances
                        </label>
                        <input
                          type="number"
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-24"
                          defaultValue="3"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Montant minimum pour relance
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-32"
                            defaultValue="10000"
                          />
                          <span className="text-sm text-gray-600">FCFA</span>
                        </div>
                      </div>
                    </div>
                  </div>
                    </div>
                  )}

                  {/* Scénarios Automatiques */}
                  {activeParametresTab === 'scenarios' && (
                    <div className="space-y-6">
                      <div className="bg-white rounded-lg p-6 shadow-sm">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 text-gray-600" />
                      Scénarios de Relance Automatique
                    </h3>
                    <div className="space-y-4">
                      {[
                        {
                          niveau: 1,
                          delai: 7,
                          type: 'Email',
                          template: 'Rappel amical',
                          actif: true
                        },
                        {
                          niveau: 2,
                          delai: 14,
                          type: 'Email + SMS',
                          template: 'Relance ferme',
                          actif: true
                        },
                        {
                          niveau: 3,
                          delai: 21,
                          type: 'Appel téléphonique',
                          template: 'Contact direct',
                          actif: true
                        },
                        {
                          niveau: 4,
                          delai: 30,
                          type: 'Courrier recommandé',
                          template: 'Mise en demeure',
                          actif: true
                        },
                        {
                          niveau: 5,
                          delai: 45,
                          type: 'Procédure judiciaire',
                          template: 'Transfert contentieux',
                          actif: false
                        }
                      ].map((scenario) => (
                        <div key={scenario.niveau} className="bg-white rounded-lg p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-medium text-blue-600">
                              {scenario.niveau}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                Niveau {scenario.niveau} - {scenario.template}
                              </div>
                              <div className="text-sm text-gray-600">
                                À J+{scenario.delai} • Type: {scenario.type}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                              Modifier
                            </button>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                defaultChecked={scenario.actif}
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                      </div>
                    </div>
                  )}

                  {/* Templates de Messages */}
                  {activeParametresTab === 'templates' && (
                    <div className="space-y-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-gray-600" />
                      Templates de Messages par Type de Relance
                    </h3>

                    {/* Sélecteur de type de template */}
                    <div className="mb-6 flex gap-4 items-end">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Type de relance
                        </label>
                        <select
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-full"
                          value={selectedTemplateType}
                          onChange={(e) => setSelectedTemplateType(e.target.value)}
                        >
                          <option value="rappel_amical">Niveau 1 - Rappel amical</option>
                          <option value="relance_ferme">Niveau 2 - Relance ferme</option>
                          <option value="dernier_avis">Niveau 3 - Dernier avis</option>
                          <option value="mise_demeure">Niveau 4 - Mise en demeure</option>
                          <option value="pre_contentieux">Niveau 5 - Pré-contentieux</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 rounded-lg">
                        <input
                          type="checkbox"
                          id="multiple-invoices"
                          checked={multipleInvoices}
                          onChange={(e) => setMultipleInvoices(e.target.checked)}
                          className="rounded text-blue-600"
                        />
                        <label htmlFor="multiple-invoices" className="text-sm font-medium text-gray-700">
                          Plusieurs factures
                        </label>
                      </div>
                    </div>

                    {/* Info sur les variables disponibles */}
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800 font-medium mb-2">Variables disponibles:</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-blue-700">
                        <span>• {`{client_name}`} - Nom du client</span>
                        <span>• {`{company_name}`} - Nom de l'entreprise</span>
                        {multipleInvoices ? (
                          <>
                            <span>• {`{invoice_count}`} - Nombre de factures</span>
                            <span>• {`{invoice_list}`} - Liste des numéros</span>
                            <span>• {`{invoice_details}`} - Détails des factures</span>
                            <span>• {`{avg_days_overdue}`} - Retard moyen</span>
                          </>
                        ) : (
                          <>
                            <span>• {`{invoice_number}`} - N° facture</span>
                            <span>• {`{invoice_date}`} - Date facture</span>
                            <span>• {`{due_date}`} - Date échéance</span>
                            <span>• {`{days_overdue}`} - Jours de retard</span>
                          </>
                        )}
                        <span>• {`{total_amount}`} - Montant total</span>
                        <span>• {`{interest_amount}`} - Intérêts</span>
                        <span>• {`{fees_amount}`} - Frais</span>
                        <span>• {`{grand_total}`} - Total général</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Templates éditables */}
                      <div className="space-y-4">
                        {/* Template Email */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Template Email
                          </label>
                          <textarea
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            rows={12}
                            value={emailTemplates[selectedTemplateType as keyof typeof emailTemplates]}
                            onChange={(e) => {
                              setEmailTemplates(prev => ({
                                ...prev,
                                [selectedTemplateType]: e.target.value
                              }));
                            }}
                          />
                        </div>

                        {/* Template SMS */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Template SMS
                          </label>
                          <textarea
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            value={smsTemplates[selectedTemplateType as keyof typeof smsTemplates]}
                            onChange={(e) => {
                              setSmsTemplates(prev => ({
                                ...prev,
                                [selectedTemplateType]: e.target.value
                              }));
                            }}
                          />
                        </div>

                        {/* Template Courrier */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Template Courrier postal
                          </label>
                          <div className="flex items-center gap-2 mb-2">
                            <input type="checkbox" defaultChecked={selectedTemplateType === 'mise_demeure' || selectedTemplateType === 'pre_contentieux'} />
                            <span className="text-sm text-gray-600">Envoi en recommandé avec AR</span>
                          </div>
                          <textarea
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            rows={4}
                            value={
                              selectedTemplateType === 'mise_demeure' || selectedTemplateType === 'pre_contentieux' ?
                                `Format courrier formel avec en-tête entreprise, références légales et signature.` :
                                `Utilise le template email pour génération du courrier.`
                            }
                            onChange={(e) => {}}
                          />
                        </div>
                      </div>

                      {/* Aperçu Email HTML */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Aperçu Email HTML
                          </label>
                          <button
                            onClick={() => setShowEmailPreview(!showEmailPreview)}
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            {showEmailPreview ? 'Voir HTML' : 'Voir rendu'}
                          </button>
                        </div>

                        {!showEmailPreview ? (
                          <div className="bg-white border border-gray-300 rounded-lg h-[500px] overflow-hidden">
                            <div style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6', height: '100%', overflowY: 'auto' }}>
                              {/* En-tête email */}
                              <div style={{ backgroundColor: '#fafafa', padding: '20px' }}>
                                <div style={{ backgroundColor: '#3b82f6', height: '4px', margin: '-20px -20px 20px -20px' }}></div>
                                <img src="/logo.png" alt="Logo" style={{ height: '40px', marginBottom: '10px' }} />
                                <h2 style={{ color: '#333', margin: '0', fontSize: '20px' }}>
                                  {selectedTemplateType === 'rappel_amical' && 'Rappel de paiement - Facture en attente'}
                                  {selectedTemplateType === 'relance_ferme' && '2ème Relance - Action requise'}
                                  {selectedTemplateType === 'dernier_avis' && '⚠️ DERNIER AVIS avant procédure'}
                                  {selectedTemplateType === 'mise_demeure' && '🔴 MISE EN DEMEURE'}
                                  {selectedTemplateType === 'pre_contentieux' && '⚖️ TRANSMISSION AU SERVICE CONTENTIEUX'}
                                </h2>
                              </div>

                              {/* Corps email */}
                              <div style={{ padding: '20px', backgroundColor: '#fff' }}>
                                <p style={{ fontSize: '14px', color: '#333' }}>Madame, Monsieur <strong>SARL CONGO BUSINESS</strong>,</p>

                                {selectedTemplateType === 'mise_demeure' && (
                                  <div style={{ backgroundColor: '#fee', padding: '15px', borderLeft: '4px solid #ef4444', margin: '20px 0' }}>
                                    <strong style={{ color: '#ef4444', fontSize: '16px' }}>MISE EN DEMEURE</strong>
                                    <p style={{ margin: '10px 0 0 0', color: '#721c24', fontSize: '13px' }}>
                                      Ce courrier vaut mise en demeure au sens des dispositions légales en vigueur
                                    </p>
                                  </div>
                                )}

                                {selectedTemplateType === 'pre_contentieux' && (
                                  <div style={{ backgroundColor: '#fff3cd', padding: '15px', borderLeft: '4px solid #f59e0b', margin: '20px 0' }}>
                                    <strong style={{ color: '#856404', fontSize: '16px' }}>DOSSIER TRANSMIS AU CONTENTIEUX</strong>
                                  </div>
                                )}

                                <div style={{ backgroundColor: '#fafafa', padding: '15px', borderRadius: '5px', margin: '20px 0' }}>
                                  <h3 style={{ margin: '0 0 15px 0', color: '#525252', fontSize: '14px' }}>
                                    {multipleInvoices ? 'Détails des créances:' : 'Détails de la créance:'}
                                  </h3>
                                  {multipleInvoices ? (
                                    <>
                                      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px' }}>
                                        <thead>
                                          <tr style={{ borderBottom: '1px solid #e5e5e5' }}>
                                            <th style={{ padding: '8px 0', textAlign: 'left', color: '#525252', fontSize: '12px', fontWeight: 'bold' }}>N° Facture</th>
                                            <th style={{ padding: '8px 0', textAlign: 'right', color: '#525252', fontSize: '12px', fontWeight: 'bold' }}>Montant</th>
                                            <th style={{ padding: '8px 0', textAlign: 'center', color: '#525252', fontSize: '12px', fontWeight: 'bold' }}>Échéance</th>
                                            <th style={{ padding: '8px 0', textAlign: 'center', color: '#525252', fontSize: '12px', fontWeight: 'bold' }}>Retard</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          <tr>
                                            <td style={{ padding: '6px 0', fontSize: '12px', color: '#333' }}>FAC-2024-089</td>
                                            <td style={{ padding: '6px 0', fontSize: '12px', color: '#ef4444', textAlign: 'right', fontWeight: 'bold' }}>185,000 FCFA</td>
                                            <td style={{ padding: '6px 0', fontSize: '12px', color: '#666', textAlign: 'center' }}>15/12/2024</td>
                                            <td style={{ padding: '6px 0', fontSize: '12px', color: '#ef4444', textAlign: 'center' }}>37 jours</td>
                                          </tr>
                                          <tr>
                                            <td style={{ padding: '6px 0', fontSize: '12px', color: '#333' }}>FAC-2024-095</td>
                                            <td style={{ padding: '6px 0', fontSize: '12px', color: '#ef4444', textAlign: 'right', fontWeight: 'bold' }}>150,000 FCFA</td>
                                            <td style={{ padding: '6px 0', fontSize: '12px', color: '#666', textAlign: 'center' }}>20/12/2024</td>
                                            <td style={{ padding: '6px 0', fontSize: '12px', color: '#ef4444', textAlign: 'center' }}>32 jours</td>
                                          </tr>
                                          <tr>
                                            <td style={{ padding: '6px 0', fontSize: '12px', color: '#333' }}>FAC-2024-103</td>
                                            <td style={{ padding: '6px 0', fontSize: '12px', color: '#ef4444', textAlign: 'right', fontWeight: 'bold' }}>150,000 FCFA</td>
                                            <td style={{ padding: '6px 0', fontSize: '12px', color: '#666', textAlign: 'center' }}>28/12/2024</td>
                                            <td style={{ padding: '6px 0', fontSize: '12px', color: '#ef4444', textAlign: 'center' }}>24 jours</td>
                                          </tr>
                                        </tbody>
                                      </table>
                                      <div style={{ borderTop: '2px solid #525252', paddingTop: '10px' }}>
                                        <table style={{ width: '100%' }}>
                                          <tbody>
                                            <tr>
                                              <td style={{ padding: '4px 0', color: '#666', fontSize: '13px', fontWeight: 'bold' }}>Nombre de factures:</td>
                                              <td style={{ padding: '4px 0', fontSize: '13px', textAlign: 'right', fontWeight: 'bold' }}>3</td>
                                            </tr>
                                            <tr>
                                              <td style={{ padding: '4px 0', color: '#666', fontSize: '13px', fontWeight: 'bold' }}>Retard moyen:</td>
                                              <td style={{ padding: '4px 0', color: '#ef4444', fontSize: '13px', textAlign: 'right', fontWeight: 'bold' }}>31 jours</td>
                                            </tr>
                                            <tr>
                                              <td style={{ padding: '4px 0', color: '#666', fontSize: '14px', fontWeight: 'bold' }}>MONTANT TOTAL:</td>
                                              <td style={{ padding: '4px 0', color: '#ef4444', fontSize: '16px', textAlign: 'right', fontWeight: 'bold' }}>485,000 FCFA</td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>
                                    </>
                                  ) : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                      <tbody>
                                        <tr>
                                          <td style={{ padding: '8px 0', color: '#666', fontSize: '13px', width: '40%' }}>N° Facture:</td>
                                          <td style={{ padding: '8px 0', fontWeight: 'bold', fontSize: '13px' }}>FAC-2024-089</td>
                                        </tr>
                                        <tr>
                                          <td style={{ padding: '8px 0', color: '#666', fontSize: '13px' }}>Montant TTC:</td>
                                          <td style={{ padding: '8px 0', fontWeight: 'bold', color: '#ef4444', fontSize: '16px' }}>485,000 FCFA</td>
                                        </tr>
                                        <tr>
                                          <td style={{ padding: '8px 0', color: '#666', fontSize: '13px' }}>Date d'émission:</td>
                                          <td style={{ padding: '8px 0', fontSize: '13px' }}>15/11/2024</td>
                                        </tr>
                                        <tr>
                                          <td style={{ padding: '8px 0', color: '#666', fontSize: '13px' }}>Date d'échéance:</td>
                                          <td style={{ padding: '8px 0', fontSize: '13px' }}>15/12/2024</td>
                                        </tr>
                                        <tr>
                                          <td style={{ padding: '8px 0', color: '#666', fontSize: '13px' }}>Retard de paiement:</td>
                                          <td style={{ padding: '8px 0', color: '#ef4444', fontSize: '14px' }}><strong>37 jours</strong></td>
                                        </tr>
                                        {(selectedTemplateType === 'mise_demeure' || selectedTemplateType === 'pre_contentieux') && (
                                          <>
                                            <tr>
                                              <td style={{ padding: '8px 0', color: '#666', fontSize: '13px', borderTop: '1px solid #e5e5e5' }}>Intérêts de retard:</td>
                                              <td style={{ padding: '8px 0', fontSize: '13px', borderTop: '1px solid #e5e5e5' }}>12,500 FCFA</td>
                                            </tr>
                                            <tr>
                                              <td style={{ padding: '8px 0', color: '#666', fontSize: '13px' }}>Frais de relance:</td>
                                              <td style={{ padding: '8px 0', fontSize: '13px' }}>5,000 FCFA</td>
                                            </tr>
                                            <tr>
                                              <td style={{ padding: '8px 0', color: '#666', fontSize: '14px', fontWeight: 'bold' }}>TOTAL DÛ:</td>
                                              <td style={{ padding: '8px 0', color: '#ef4444', fontSize: '18px', fontWeight: 'bold' }}>502,500 FCFA</td>
                                            </tr>
                                          </>
                                        )}
                                      </tbody>
                                    </table>
                                  )}
                                </div>

                                <div style={{ margin: '20px 0', fontSize: '14px', color: '#333', lineHeight: '1.8' }}>
                                  {selectedTemplateType === 'rappel_amical' && (
                                    <>
                                      <p>Nous vous rappelons que cette facture reste impayée à ce jour. Il s'agit probablement d'un oubli de votre part.</p>
                                      <p>Nous vous remercions de bien vouloir régulariser cette situation dans les meilleurs délais.</p>
                                      <p style={{ fontStyle: 'italic', color: '#666', fontSize: '13px' }}>Si le règlement a été effectué entre-temps, nous vous prions de ne pas tenir compte de ce message.</p>
                                    </>
                                  )}
                                  {selectedTemplateType === 'relance_ferme' && (
                                    <>
                                      <p>Malgré notre précédent rappel, nous constatons que la facture référencée ci-dessus reste impayée.</p>
                                      <p><strong>Nous vous demandons de procéder au règlement sous 48 heures.</strong></p>
                                      <p>Sans réponse de votre part dans ce délai, nous serons contraints d'engager des procédures de recouvrement plus contraignantes.</p>
                                    </>
                                  )}
                                  {selectedTemplateType === 'dernier_avis' && (
                                    <>
                                      <p style={{ color: '#ef4444', fontWeight: 'bold' }}>Ceci constitue notre DERNIER AVIS AMIABLE.</p>
                                      <p>Malgré nos multiples relances (courriels, appels, courriers), la facture mentionnée ci-dessus demeure impayée.</p>
                                      <p><strong>Sans règlement intégral sous 72 heures, votre dossier sera automatiquement transmis à notre service contentieux</strong> qui engagera les procédures judiciaires appropriées.</p>
                                    </>
                                  )}
                                  {selectedTemplateType === 'mise_demeure' && (
                                    <>
                                      <p>Par la présente, nous vous mettons formellement en demeure de régler <strong>sous HUIT (8) jours</strong> à compter de la réception de ce courrier, la totalité de la somme due.</p>
                                      <p><strong>À défaut de règlement dans ce délai:</strong></p>
                                      <ul style={{ marginLeft: '20px', color: '#333' }}>
                                        <li>Nous engagerons une procédure judiciaire à votre encontre</li>
                                        <li>Les frais de justice seront à votre charge</li>
                                        <li>Votre solvabilité commerciale sera affectée</li>
                                        <li>Une inscription au fichier des incidents de paiement pourra être effectuée</li>
                                      </ul>
                                      <p style={{ marginTop: '15px' }}>Cette mise en demeure fait courir les intérêts légaux.</p>
                                    </>
                                  )}
                                  {selectedTemplateType === 'pre_contentieux' && (
                                    <>
                                      <p style={{ color: '#ef4444', fontWeight: 'bold' }}>Votre dossier a été transmis à notre service contentieux et à notre cabinet d'avocats.</p>
                                      <p>Une procédure judiciaire sera engagée sous 48 heures comprenant:</p>
                                      <ul style={{ marginLeft: '20px', color: '#333' }}>
                                        <li>Injonction de payer</li>
                                        <li>Saisie conservatoire</li>
                                        <li>Inscription privilège</li>
                                        <li>Recouvrement forcé par huissier</li>
                                      </ul>
                                      <p style={{ backgroundColor: '#fff3cd', padding: '10px', marginTop: '15px', borderRadius: '5px' }}>
                                        <strong>Pour éviter ces poursuites, contactez immédiatement notre service:</strong><br/>
                                        ☎️ Tél: +242 06 XXX XX XX<br/>
                                        ✉️ Email: contentieux@atlasfinance.com
                                      </p>
                                    </>
                                  )}
                                </div>

                                {/* Call to action */}
                                <div style={{ textAlign: 'center', margin: '30px 0' }}>
                                  <a href="#" style={{
                                    backgroundColor: selectedTemplateType === 'mise_demeure' || selectedTemplateType === 'pre_contentieux' ? '#ef4444' :
                                                     selectedTemplateType === 'dernier_avis' ? '#f59e0b' : '#3b82f6',
                                    color: 'white',
                                    padding: '12px 30px',
                                    textDecoration: 'none',
                                    borderRadius: '5px',
                                    display: 'inline-block',
                                    fontSize: '14px',
                                    fontWeight: 'bold'
                                  }}>
                                    💳 Régler maintenant en ligne
                                  </a>
                                  <p style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                                    Paiement sécurisé par carte bancaire ou virement
                                  </p>
                                </div>

                                {/* Historique des relances pour les niveaux avancés */}
                                {(selectedTemplateType === 'dernier_avis' || selectedTemplateType === 'mise_demeure' || selectedTemplateType === 'pre_contentieux') && (
                                  <div style={{ backgroundColor: '#fafafa', padding: '15px', borderRadius: '5px', margin: '20px 0' }}>
                                    <h4 style={{ margin: '0 0 10px 0', color: '#525252', fontSize: '13px' }}>Historique des relances:</h4>
                                    <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '12px', color: '#666' }}>
                                      <li>1er rappel: 22/12/2024 (Email)</li>
                                      <li>2ème rappel: 05/01/2025 (Email + SMS)</li>
                                      <li>Appel téléphonique: 12/01/2025</li>
                                      <li>Dernier avis: 18/01/2025 (Courrier)</li>
                                    </ul>
                                  </div>
                                )}

                                <div style={{ borderTop: '1px solid #e5e5e5', marginTop: '30px', paddingTop: '20px' }}>
                                  <p style={{ fontSize: '14px', color: '#333' }}>
                                    Cordialement,<br/>
                                    <strong>{selectedTemplateType === 'mise_demeure' || selectedTemplateType === 'pre_contentieux' ? 'Service Juridique et Contentieux' : 'Service Comptabilité'}</strong><br/>
                                    Atlas Finance
                                  </p>
                                </div>
                              </div>

                              {/* Pied de page */}
                              <div style={{ backgroundColor: '#fafafa', padding: '20px', borderTop: '1px solid #e5e5e5', fontSize: '11px', color: '#666' }}>
                                <p style={{ margin: '5px 0', fontWeight: 'bold' }}>Atlas Finance - Solutions de gestion d'entreprise</p>
                                <p style={{ margin: '5px 0' }}>📍 123 Avenue de la République, Brazzaville, Congo</p>
                                <p style={{ margin: '5px 0' }}>☎️ +242 06 XXX XX XX | ✉️ contact@atlasfinance.com | 🌐 www.atlasfinance.com</p>
                                <p style={{ margin: '10px 0 5px 0', fontSize: '10px', color: '#999' }}>
                                  Ce message et toutes les pièces jointes sont confidentiels et établis à l'intention exclusive de ses destinataires.
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <textarea
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-xs h-[500px]"
                            readOnly
                            value={`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; }
    .header { background: #fafafa; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { padding: 20px; background: #fff; }
    .alert { background: #fee; padding: 15px; border-left: 4px solid #ef4444; margin: 20px 0; }
    .info-box { background: #fafafa; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .cta { text-align: center; margin: 30px 0; }
    .btn { background: ${selectedTemplateType === 'mise_demeure' ? '#ef4444' : '#3b82f6'}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; }
    .footer { background: #fafafa; padding: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <img src="{logo_url}" alt="Logo" style="height: 40px;">
    <h2>${selectedTemplateType === 'mise_demeure' ? 'MISE EN DEMEURE' : 'Rappel de paiement'}</h2>
  </div>
  <div class="content">
    <p>Madame, Monsieur <strong>{client_name}</strong>,</p>
    ${selectedTemplateType === 'mise_demeure' ? '<div class="alert"><strong>MISE EN DEMEURE</strong></div>' : ''}
    <div class="info-box">
      <table>
        <tr><td>N° Facture:</td><td><strong>{invoice_number}</strong></td></tr>
        <tr><td>Montant:</td><td><strong style="color: #ef4444;">{amount} FCFA</strong></td></tr>
        <tr><td>Échéance:</td><td>{due_date}</td></tr>
        <tr><td>Retard:</td><td><strong>{days_overdue} jours</strong></td></tr>
      </table>
    </div>
    <p>{message_body}</p>
    <div class="cta">
      <a href="{payment_link}" class="btn">Régler maintenant</a>
    </div>
  </div>
  <div class="footer">
    <p>{company_name}<br>
    Service Comptabilité<br>
    Tel: {phone} | Email: {email}</p>
  </div>
</body>
</html>`}
                          />
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                      <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                        Réinitialiser
                      </button>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                        Sauvegarder le template
                      </button>
                    </div>
                    </div>
                  )}

                  {/* Règles d'Exclusion */}
                  {activeParametresTab === 'exclusions' && (
                    <div className="space-y-6">
                      <div className="bg-white rounded-lg p-6 shadow-sm">
                        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                          <XCircle className="w-5 h-5 text-gray-600" />
                          Règles d'Exclusion
                        </h3>

                        <div className="space-y-4">
                          <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4 rounded-r-lg">
                            <p className="text-sm text-yellow-800">
                              Ces règles permettent d'exclure certains clients des relances automatiques selon des critères spécifiques.
                            </p>
                          </div>

                          <div className="space-y-3">
                            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                              <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                              <div>
                                <span className="text-sm font-medium text-gray-700">Ne pas relancer les clients en contentieux</span>
                                <p className="text-xs text-gray-700 mt-1">Les dossiers déjà transmis au service juridique sont exclus</p>
                              </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                              <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                              <div>
                                <span className="text-sm font-medium text-gray-700">Ne pas relancer les clients avec plan de remboursement actif</span>
                                <p className="text-xs text-gray-700 mt-1">Les clients qui respectent leur plan de paiement ne sont pas relancés</p>
                              </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                              <input type="checkbox" className="rounded text-blue-600" />
                              <div>
                                <span className="text-sm font-medium text-gray-700">Exclure les clients VIP des relances automatiques</span>
                                <p className="text-xs text-gray-700 mt-1">Les relances pour clients VIP sont gérées manuellement</p>
                              </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                              <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                              <div>
                                <span className="text-sm font-medium text-gray-700">Ne pas relancer pendant les jours fériés</span>
                                <p className="text-xs text-gray-700 mt-1">Suspendre automatiquement les relances durant les jours fériés nationaux</p>
                              </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                              <input type="checkbox" className="rounded text-blue-600" />
                              <div>
                                <span className="text-sm font-medium text-gray-700">Exclure les montants inférieurs au seuil</span>
                                <p className="text-xs text-gray-700 mt-1">Ne pas relancer pour des montants inférieurs à 10,000 FCFA</p>
                              </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                              <input type="checkbox" className="rounded text-blue-600" />
                              <div>
                                <span className="text-sm font-medium text-gray-700">Respecter les heures ouvrables</span>
                                <p className="text-xs text-gray-700 mt-1">Envoyer les relances uniquement entre 8h et 18h</p>
                              </div>
                            </label>
                          </div>
                        </div>

                        {/* Boutons d'action */}
                        <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
                          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                            Réinitialiser
                          </button>
                          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            Enregistrer les exclusions
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Onglet Dossiers en Recouvrement */}
      {activeTab === 'dossiers' && !showDossierDetail && (
        <div className="space-y-6">
          {/* KPIs des dossiers */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <FileText className="w-8 h-8 text-blue-500" />
                <span className="text-sm font-medium text-blue-600">Total</span>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {mockDossiers.length}
              </p>
              <p className="text-sm text-gray-600 mt-1">Dossiers actifs</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <AlertTriangle className="w-8 h-8 text-purple-500" />
                <span className="text-sm font-medium text-purple-600">Judiciaire</span>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {mockDossiers.filter(d => d.typeRecouvrement === 'judiciaire').length}
              </p>
              <p className="text-sm text-gray-600 mt-1">En procédure judiciaire</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <DollarSign className="w-8 h-8 text-green-500" />
                <span className="text-sm font-medium text-green-600">Montant</span>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(mockDossiers.reduce((sum, d) => sum + d.montantTotal, 0))}
              </p>
              <p className="text-sm text-gray-600 mt-1">Total en recouvrement</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <Clock className="w-8 h-8 text-orange-500" />
                <span className="text-sm font-medium text-orange-600">Urgent</span>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {mockDossiers.filter(d => d.statut === 'juridique').length}
              </p>
              <p className="text-sm text-gray-600 mt-1">Dossiers urgents</p>
            </div>
          </div>

          {/* Tableau des dossiers */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Dossiers en Recouvrement</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Référence
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Montants
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Nb Factures
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      DSO Moyen
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Montant Payé
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Responsable
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Dernière Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mockDossiers.map((dossier) => (
                    <tr key={dossier.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {dossier.numeroRef}
                          </div>
                          <div className="text-sm text-gray-700">
                            {new Date(dossier.dateOuverture).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {dossier.client}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(dossier.montantTotal)}
                          </div>
                          <div className="text-xs text-gray-700">
                            Principal: {formatCurrency(dossier.montantPrincipal)}
                          </div>
                          <div className="text-xs text-gray-700">
                            Intérêts + Frais: {formatCurrency(dossier.interets + dossier.frais)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-900">
                            {dossier.nombreFactures}
                          </div>
                          <div className="text-xs text-gray-700">facture{dossier.nombreFactures > 1 ? 's' : ''}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-center">
                          <div className={`text-sm font-medium ${dossier.dsoMoyen > 60 ? 'text-red-600' : dossier.dsoMoyen > 30 ? 'text-orange-600' : 'text-green-600'}`}>
                            {dossier.dsoMoyen}
                          </div>
                          <div className="text-xs text-gray-700">jours</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-green-600">
                            {formatCurrency(dossier.montantPaye)}
                          </div>
                          <div className="text-xs text-gray-700">
                            {((dossier.montantPaye / dossier.montantTotal) * 100).toFixed(1)}% du total
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {dossier.typeRecouvrement === 'judiciaire' ? (
                            <AlertTriangle className="w-4 h-4 text-purple-500 mr-1" />
                          ) : dossier.typeRecouvrement === 'huissier' ? (
                            <Building className="w-4 h-4 text-orange-500 mr-1" />
                          ) : (
                            <Users className="w-4 h-4 text-blue-500 mr-1" />
                          )}
                          <span className="text-sm capitalize">{dossier.typeRecouvrement}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatutColor(dossier.statut)}`}>
                          {getStatutLabel(dossier.statut)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 text-gray-700 mr-2" />
                          <span className="text-sm text-gray-900">{dossier.responsable}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedDossierAction(dossier);
                            setShowDossierActionModal(true);
                          }}
                          className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                          title="Voir dernière action"
                        >
                          {(() => {
                            const IconComponent = getActionIcon(dossier.typeAction);
                            return <IconComponent className="w-4 h-4 text-gray-600" />;
                          })()}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2 items-center">
                          <button
                            onClick={() => {
                              setSelectedDossierSummary(dossier);
                              setShowDossierSummary(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="Voir résumé du dossier"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              // Bouton Modifier cliqué pour dossier
                              setSelectedDossierDetail(dossier);
                              setShowDossierDetail(true);
                              // État mis à jour - showDossierDetail: true
                            }}
                            className="text-green-600 hover:text-green-900 p-1 rounded transition-colors relative z-10"
                            title={t('common.edit')}
                            type="button"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="text-orange-600 hover:text-orange-900" title="Historique">
                            <Clock className="w-4 h-4" />
                          </button>

                          {/* Menu dropdown 3 points */}
                          <div className="relative">
                            <button
                              onClick={() => toggleDropdown(dossier.id)}
                              className="text-gray-700 hover:text-gray-600 p-1 rounded"
                              title="Plus d'actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openDropdownId === dossier.id && (
                              <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                                <div className="py-1">
                                  <button
                                    onClick={() => handleDossierAction('relance', dossier)}
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                  >
                                    <Bell className="w-4 h-4 mr-3" />
                                    Envoyer une relance
                                  </button>
                                  <button
                                    onClick={() => handleDossierAction('plan', dossier)}
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                  >
                                    <Banknote className="w-4 h-4 mr-3" />
                                    Proposer un plan de règlement
                                  </button>
                                  <button
                                    onClick={() => handleDossierAction('regle', dossier)}
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-3" />
                                    Marquer comme réglé
                                  </button>
                                  <button
                                    onClick={() => handleDossierAction('contentieux', dossier)}
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                  >
                                    <Scale className="w-4 h-4 mr-3" />
                                    Envoyer en pré-contentieux
                                  </button>
                                  <button
                                    onClick={() => handleDossierAction('transfert', dossier)}
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                  >
                                    <Share className="w-4 h-4 mr-3" />
                                    Transférer au contentieux
                                  </button>
                                  <hr className="my-1" />
                                  <button
                                    onClick={() => handleDossierAction('supprimer', dossier)}
                                    className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                                  >
                                    <Trash2 className="w-4 h-4 mr-3" />
                                    Supprimer
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Statistiques par type et statut */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Par type de recouvrement</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Amiable</span>
                  <span className="text-sm font-medium">
                    {mockDossiers.filter(d => d.typeRecouvrement === 'amiable').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Judiciaire</span>
                  <span className="text-sm font-medium">
                    {mockDossiers.filter(d => d.typeRecouvrement === 'judiciaire').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Huissier</span>
                  <span className="text-sm font-medium">
                    {mockDossiers.filter(d => d.typeRecouvrement === 'huissier').length}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Par statut</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Actifs</span>
                  <span className="text-sm font-medium text-blue-600">
                    {mockDossiers.filter(d => d.statut === 'actif').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Juridiques</span>
                  <span className="text-sm font-medium text-purple-600">
                    {mockDossiers.filter(d => d.statut === 'juridique').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Suspendus</span>
                  <span className="text-sm font-medium text-orange-600">
                    {mockDossiers.filter(d => d.statut === 'suspendu').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page de modification du dossier avec onglets */}
      {(activeTab === 'dossiers' || activeTab === 'contentieux') && showDossierDetail && selectedDossierDetail && (
        <div className="space-y-6">
          {/* En-tête avec bouton retour */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  setShowDossierDetail(false);
                  setActiveDossierTab('dashboard'); // Reset à dashboard
                }}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Retour à la liste</span>
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  Dossier {selectedDossierDetail.numeroRef}
                </h1>
                <p className="text-gray-600">{selectedDossierDetail.client}</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  // Sauvegarder les modifications du dossier
                  // Sauvegarde des modifications du dossier
                  // Ici on pourrait ajouter la logique de sauvegarde API
                  // Par exemple: await updateDossier(selectedDossierDetail.id, updatedData);

                  // Afficher une notification de succès
                  toast.success('Dossier modifié avec succès !');

                  // Fermer la modal et retourner à la liste
                  setShowDossierDetail(false);
                  setActiveDossierTab('dashboard');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Enregistrer
              </button>
              <button
                onClick={() => {
                  setShowDossierDetail(false);
                  setActiveDossierTab('dashboard');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </div>

          {/* Navigation par onglets */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6 overflow-x-auto">
                {dossierTabs.map((tab) => {
                  const IconComponent = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveDossierTab(tab.id)}
                      className={`
                        flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
                        ${activeDossierTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'
                        }
                      `}
                    >
                      <IconComponent className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Contenu des onglets */}
            <div className="p-6">
              {/* Dashboard */}
              {activeDossierTab === 'dashboard' && (
                <div className="space-y-6">
                  {/* En-tête avec informations principales */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                      <div className="text-sm text-gray-600">Client</div>
                      <div className="text-lg font-semibold text-gray-900">{selectedDossierDetail.client}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Internal case ref.</div>
                      <div className="text-lg font-semibold text-gray-900">{selectedDossierDetail.numeroRef}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Currency</div>
                      <div className="text-lg font-semibold text-gray-900">FCFA</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                      <div className="text-sm text-gray-600">Case category</div>
                      <div className="text-lg font-semibold text-gray-900">{t('thirdParty.collection')}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Case status</div>
                      <div className="text-lg font-semibold text-gray-900">-</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Received on</div>
                      <div className="text-lg font-semibold text-gray-900">{new Date(selectedDossierDetail.dateOuverture).toLocaleDateString()}</div>
                    </div>
                  </div>

                  {/* Grid avec 6 sections */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Financial counters */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <div className="bg-gray-100 p-2 rounded">
                          <DollarSign className="w-5 h-5 text-gray-600" />
                        </div>
                        <h3 className="ml-3 font-semibold text-gray-900">Financial counters</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total receivables</span>
                          <span className="text-sm font-medium">{selectedDossierDetail.montantTotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total overdue</span>
                          <span className="text-sm font-medium">{selectedDossierDetail.montantTotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total interest</span>
                          <span className="text-sm font-medium">{selectedDossierDetail.interets}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total payments</span>
                          <span className="text-sm font-medium">{selectedDossierDetail.montantPaye}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Not due</span>
                          <span className="text-sm font-medium">0</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Disputes</span>
                          <span className="text-sm font-medium">0</span>
                        </div>
                        <div className="mt-4 pt-3 border-t border-gray-200">
                          <div className="text-sm font-medium text-blue-600">Balance to collect</div>
                        </div>
                      </div>
                    </div>

                    {/* Client */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <div className="bg-gray-100 p-2 rounded">
                          <UserCircle className="w-5 h-5 text-gray-600" />
                        </div>
                        <h3 className="ml-3 font-semibold text-gray-900">Client</h3>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm text-gray-600">Nom du client</div>
                          <div className="text-sm font-medium">-</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Adresse</div>
                          <div className="text-sm font-medium">-</div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-sm text-gray-600">Téléphone</div>
                            <div className="text-sm font-medium">-</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Email</div>
                            <div className="text-sm font-medium">-</div>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Contact person</div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-sm text-gray-600">Email</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Telephone</div>
                            <div className="text-sm font-medium">-</div>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Role</div>
                        </div>
                      </div>
                    </div>

                    {/* Case attributes */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <div className="bg-gray-100 p-2 rounded">
                          <FileText className="w-5 h-5 text-gray-600" />
                        </div>
                        <h3 className="ml-3 font-semibold text-gray-900">Case attributes</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-sm text-gray-600">Référence du dossier</div>
                            <div className="text-sm font-medium">{selectedDossierDetail.numeroRef}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Date de création</div>
                            <div className="text-sm font-medium">{new Date(selectedDossierDetail.dateOuverture).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-sm text-gray-600">Statut</div>
                            <div className="text-sm font-medium">-</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Age</div>
                            <div className="text-sm font-medium">{selectedDossierDetail.dsoMoyen} j</div>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Date de la dernière relance</div>
                          <div className="text-sm font-medium">-</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Commentaires supplémentaires</div>
                          <textarea className="w-full mt-1 text-sm border border-gray-300 rounded px-2 py-1" rows={3}></textarea>
                        </div>
                      </div>
                    </div>

                    {/* Responsible details */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <div className="bg-gray-100 p-2 rounded">
                          <Users className="w-5 h-5 text-gray-600" />
                        </div>
                        <h3 className="ml-3 font-semibold text-gray-900">Responsible details</h3>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm text-gray-600">Nom</div>
                          <div className="text-sm font-medium">-</div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-sm text-gray-600">Téléphone</div>
                            <div className="text-sm font-medium">-</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Email</div>
                            <div className="text-sm font-medium">-</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Last repayment plan */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <div className="bg-gray-100 p-2 rounded">
                          <Calendar className="w-5 h-5 text-gray-600" />
                        </div>
                        <h3 className="ml-3 font-semibold text-gray-900">Last repayment plan</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-sm text-gray-600">Date de début</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Date de fin</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-sm text-gray-600">Montant final</div>
                            <div className="text-sm font-medium">0</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Statut</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Next action */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <div className="bg-gray-100 p-2 rounded">
                          <Clock className="w-5 h-5 text-gray-600" />
                        </div>
                        <h3 className="ml-3 font-semibold text-gray-900">Next action</h3>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm text-gray-600">{t('common.date')}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Action</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Graphiques en bas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {/* Active cases */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <div className="bg-gray-100 p-2 rounded">
                          <BarChart3 className="w-5 h-5 text-gray-600" />
                        </div>
                        <h3 className="ml-3 font-semibold text-gray-900">Active cases</h3>
                      </div>
                      <div className="h-48 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[
                            { name: 'Total receivables', value: selectedDossierDetail.montantTotal },
                            { name: 'Total collection', value: selectedDossierDetail.montantPaye },
                            { name: 'Balance', value: selectedDossierDetail.montantTotal - selectedDossierDetail.montantPaye }
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#737373" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Submitted debt and collected */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <div className="bg-gray-100 p-2 rounded">
                          <BarChart3 className="w-5 h-5 text-gray-600" />
                        </div>
                        <h3 className="ml-3 font-semibold text-gray-900">Submitted debt and collected</h3>
                      </div>
                      <div className="h-48 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={[
                            { name: 'Jan', receivables: 0, collection: 0 },
                            { name: 'Feb', receivables: 0, collection: 0 },
                            { name: 'Mar', receivables: selectedDossierDetail.montantTotal, collection: 0 },
                            { name: 'Apr', receivables: selectedDossierDetail.montantTotal, collection: selectedDossierDetail.montantPaye },
                            { name: 'May', receivables: selectedDossierDetail.montantTotal, collection: selectedDossierDetail.montantPaye },
                            { name: 'Jun', receivables: selectedDossierDetail.montantTotal, collection: selectedDossierDetail.montantPaye },
                            { name: 'Jul', receivables: selectedDossierDetail.montantTotal, collection: selectedDossierDetail.montantPaye },
                            { name: 'Aug', receivables: selectedDossierDetail.montantTotal, collection: selectedDossierDetail.montantPaye },
                            { name: 'Sep', receivables: selectedDossierDetail.montantTotal, collection: selectedDossierDetail.montantPaye },
                            { name: 'Oct', receivables: selectedDossierDetail.montantTotal, collection: selectedDossierDetail.montantPaye },
                            { name: 'Nov', receivables: selectedDossierDetail.montantTotal, collection: selectedDossierDetail.montantPaye },
                            { name: 'Dec', receivables: selectedDossierDetail.montantTotal, collection: selectedDossierDetail.montantPaye }
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="receivables" stroke="#737373" name="Total receivables" />
                            <Line type="monotone" dataKey="collection" stroke="#22c55e" name="Total collection" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Client */}
              {activeDossierTab === 'client' && (
                <div className="space-y-6">
                  {/* Section Account */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Account</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Entité légale</div>
                        <div className="text-sm font-medium">-</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Enseigne</div>
                        <div className="text-sm font-medium">-</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Code Prospect</div>
                        <div className="text-sm font-medium">-</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">N° de compte</div>
                        <div className="text-sm font-medium">-</div>
                      </div>
                    </div>
                  </div>

                  {/* Grid principal avec 4 sections */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Créances */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="text-base font-semibold text-gray-900 mb-4">Créances</h4>

                      <div className="flex items-center justify-center mb-4">
                        <div className="bg-gray-100 p-3 rounded-lg">
                          <FileText className="w-8 h-8 text-gray-600" />
                        </div>
                      </div>

                      <div className="text-center mb-4">
                        <div className="text-sm text-gray-600">Nbre de factures</div>
                        <div className="text-lg font-bold text-gray-900">{selectedDossierDetail.nombreFactures}</div>
                      </div>

                      <div className="text-center">
                        <div className="text-sm text-gray-600">Total créances</div>
                        <div className="text-lg font-bold text-gray-900">{selectedDossierDetail.montantTotal.toLocaleString()}</div>
                      </div>
                    </div>

                    {/* Notation client */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="text-base font-semibold text-gray-900 mb-4">Notation client</h4>

                      <div className="space-y-4">
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Paiement</div>
                        </div>

                        <div>
                          <div className="text-sm text-gray-600 mb-1">Chiffre d'affaires</div>
                        </div>

                        <div>
                          <div className="text-sm text-gray-600 mb-1">Séniorité</div>
                        </div>
                      </div>
                    </div>

                    {/* Factures en retard */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="text-base font-semibold text-gray-900 mb-4">Factures en retard</h4>

                      <div className="flex items-center justify-center mb-4">
                        <div className="bg-gray-100 p-3 rounded-lg">
                          <Clock className="w-8 h-8 text-gray-600" />
                        </div>
                      </div>

                      <div className="text-center mb-4">
                        <div className="text-sm text-gray-600">Taux</div>
                        <div className="text-lg font-bold text-gray-900">0 %</div>
                      </div>

                      <div className="text-center">
                        <div className="text-sm text-gray-600">Total des retards de paiement</div>
                        <div className="text-lg font-bold text-gray-900">0</div>
                      </div>
                    </div>

                    {/* Analyse du CA client */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="text-base font-semibold text-gray-900 mb-4">Analyse du CA client</h4>

                      <div className="flex items-center justify-center mb-4">
                        <div className="bg-gray-100 p-3 rounded-lg">
                          <TrendingUp className="w-8 h-8 text-gray-600" />
                        </div>
                      </div>

                      <div className="text-center mb-4">
                        <div className="text-sm text-gray-600">% du chiffre d'affaires total</div>
                        <div className="text-lg font-bold text-gray-900">0 %</div>
                      </div>

                      <div className="text-center">
                        <div className="text-sm text-gray-600">% des créances</div>
                        <div className="text-lg font-bold text-gray-900">0 %</div>
                      </div>
                    </div>
                  </div>

                  {/* Section Nombre de jours d'impayés */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="text-base font-semibold text-gray-900 mb-4">Nombre de jours d'impayés</h4>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">0-30 Days</span>
                          <span className="text-sm font-medium">0</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">31-60 Days</span>
                          <span className="text-sm font-medium">0</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">61-90 Days</span>
                          <span className="text-sm font-medium">0</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">90+ Days</span>
                          <span className="text-sm font-medium">0</span>
                        </div>
                      </div>

                      <div className="mt-6 h-32 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-300">0</div>
                          <div className="text-sm text-gray-700">Jours</div>
                        </div>
                      </div>
                    </div>

                    {/* Analyse de la croissance du CA sur 5 ans */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="text-base font-semibold text-gray-900 mb-4">Analyse de la croissance du CA sur 5 ans</h4>

                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left text-xs font-medium text-gray-700 py-2">Année</th>
                              <th className="text-left text-xs font-medium text-gray-700 py-2">Montant</th>
                              <th className="text-left text-xs font-medium text-gray-700 py-2">%</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            <tr>
                              <td className="py-2 text-sm text-gray-900">2024</td>
                              <td className="py-2 text-sm text-gray-900">-</td>
                              <td className="py-2 text-sm text-gray-900">-</td>
                            </tr>
                            <tr>
                              <td className="py-2 text-sm text-gray-900">2023</td>
                              <td className="py-2 text-sm text-gray-900">-</td>
                              <td className="py-2 text-sm text-gray-900">-</td>
                            </tr>
                            <tr>
                              <td className="py-2 text-sm text-gray-900">2022</td>
                              <td className="py-2 text-sm text-gray-900">-</td>
                              <td className="py-2 text-sm text-gray-900">-</td>
                            </tr>
                            <tr>
                              <td className="py-2 text-sm text-gray-900">2021</td>
                              <td className="py-2 text-sm text-gray-900">-</td>
                              <td className="py-2 text-sm text-gray-900">-</td>
                            </tr>
                            <tr>
                              <td className="py-2 text-sm text-gray-900">2020</td>
                              <td className="py-2 text-sm text-gray-900">-</td>
                              <td className="py-2 text-sm text-gray-900">-</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Onglet Créances */}
              {activeDossierTab === 'creances' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Créances du client</h3>

                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              FAC #
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              N° Document
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Période de facturation
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Description
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Débit
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Crédit
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Solde
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Date d'échéance
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              PS
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              SR
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Age
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {/* Données mock pour les factures */}
                          {[
                            {
                              facNum: 'FAC001',
                              numDocument: 'DOC-2024-001',
                              date: '2024-01-15',
                              periodeFacturation: '01/2024',
                              description: 'Prestation de services - Janvier',
                              debit: 5000,
                              credit: 0,
                              solde: 5000,
                              dateEcheance: '2024-02-14',
                              ps: 'En cours',
                              sr: 'Non',
                              age: 45
                            },
                            {
                              facNum: 'FAC002',
                              numDocument: 'DOC-2024-002',
                              date: '2024-02-15',
                              periodeFacturation: '02/2024',
                              description: 'Prestation de services - Février',
                              debit: 6000,
                              credit: 0,
                              solde: 6000,
                              dateEcheance: '2024-03-16',
                              ps: 'En cours',
                              sr: 'Non',
                              age: 15
                            },
                            {
                              facNum: 'FAC003',
                              numDocument: 'DOC-2024-003',
                              date: '2024-03-15',
                              periodeFacturation: '03/2024',
                              description: 'Prestation de services - Mars',
                              debit: 5000,
                              credit: 2000,
                              solde: 3000,
                              dateEcheance: '2024-04-14',
                              ps: 'Partiel',
                              sr: 'Oui',
                              age: 30
                            }
                          ].map((facture, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-blue-600">
                                  {facture.facNum}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {facture.numDocument}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {new Date(facture.date).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {facture.periodeFacturation}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900">
                                  {facture.description}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-red-600">
                                  {facture.debit.toLocaleString()} FCFA
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-green-600">
                                  {facture.credit > 0 ? `${facture.credit.toLocaleString()} FCFA` : '-'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className={`text-sm font-medium ${facture.solde > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                  {facture.solde.toLocaleString()} FCFA
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {new Date(facture.dateEcheance).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  facture.ps === 'En cours' ? 'bg-yellow-100 text-yellow-800' :
                                  facture.ps === 'Partiel' ? 'bg-orange-100 text-orange-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {facture.ps}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  facture.sr === 'Oui' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {facture.sr}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className={`text-sm font-medium ${
                                  facture.age > 30 ? 'text-red-600' :
                                  facture.age > 15 ? 'text-orange-600' :
                                  'text-green-600'
                                }`}>
                                  {facture.age} jours
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Résumé en bas */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-sm text-blue-600 font-medium">Total Débit</div>
                      <div className="text-lg font-bold text-blue-900">
                        {(5000 + 6000 + 5000).toLocaleString()} FCFA
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-sm text-green-600 font-medium">Total Crédit</div>
                      <div className="text-lg font-bold text-green-900">
                        {(2000).toLocaleString()} FCFA
                      </div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="text-sm text-orange-600 font-medium">Solde Total</div>
                      <div className="text-lg font-bold text-orange-900">
                        {(5000 + 6000 + 3000).toLocaleString()} FCFA
                      </div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4">
                      <div className="text-sm text-red-600 font-medium">Factures en retard</div>
                      <div className="text-lg font-bold text-red-900">
                        2
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeDossierTab === 'contract' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Contrats du client</h3>

                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              N° contrat
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Statut
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Locataire
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Enseigne
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              N° Client
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Local
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Date début
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Durée
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Date fin
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              SLB
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              %SLB
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Loyer mensuel
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Monthly service charge
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {/* Données mock pour les contrats */}
                          {[
                            {
                              numContrat: 'CTR-2024-001',
                              statut: 'Actif',
                              locataire: selectedDossierDetail.client,
                              enseigne: 'SARL CONGO BUSINESS',
                              numClient: 'CLI-001',
                              local: 'Local A-15',
                              dateDebut: '2024-01-01',
                              duree: '36 mois',
                              dateFin: '2026-12-31',
                              slb: 'Oui',
                              pourcentageSLB: '2.5%',
                              loyerMensuel: 850000,
                              chargesMensuelles: 125000
                            },
                            {
                              numContrat: 'CTR-2023-045',
                              statut: 'Expiré',
                              locataire: selectedDossierDetail.client,
                              enseigne: 'SARL CONGO BUSINESS',
                              numClient: 'CLI-001',
                              local: 'Local B-22',
                              dateDebut: '2023-01-01',
                              duree: '12 mois',
                              dateFin: '2023-12-31',
                              slb: 'Non',
                              pourcentageSLB: '0%',
                              loyerMensuel: 450000,
                              chargesMensuelles: 85000
                            }
                          ].map((contrat, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-blue-600">
                                  {contrat.numContrat}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  contrat.statut === 'Actif' ? 'bg-green-100 text-green-800' :
                                  contrat.statut === 'Expiré' ? 'bg-red-100 text-red-800' :
                                  contrat.statut === 'Suspendu' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {contrat.statut}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {contrat.locataire}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {contrat.enseigne}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {contrat.numClient}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {contrat.local}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {new Date(contrat.dateDebut).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {contrat.duree}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {new Date(contrat.dateFin).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  contrat.slb === 'Oui' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {contrat.slb}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {contrat.pourcentageSLB}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-green-600">
                                  {contrat.loyerMensuel.toLocaleString()} FCFA
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-blue-600">
                                  {contrat.chargesMensuelles.toLocaleString()} FCFA
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Résumé des contrats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-sm text-blue-600 font-medium">Contrats Actifs</div>
                      <div className="text-lg font-bold text-blue-900">1</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-sm text-green-600 font-medium">Loyer Mensuel Total</div>
                      <div className="text-lg font-bold text-green-900">
                        850,000 FCFA
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="text-sm text-purple-600 font-medium">Charges Mensuelles</div>
                      <div className="text-lg font-bold text-purple-900">
                        125,000 FCFA
                      </div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="text-sm text-orange-600 font-medium">Total Mensuel</div>
                      <div className="text-lg font-bold text-orange-900">
                        975,000 FCFA
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeDossierTab === 'reminders' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Follow-Up History</h3>

                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Méthode
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Fréquence
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Montant évoqué
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Modèle
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Destinataire(s)
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Statut
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {/* Données mock pour l'historique des relances */}
                          {[
                            {
                              date: '2024-03-15',
                              type: 'Relance amiable',
                              methode: 'Email',
                              frequence: 'Première relance',
                              montantEvoque: 16000,
                              modele: 'Modèle standard R1',
                              destinataires: 'direction@congocommerce.com',
                              statut: 'Envoyé'
                            },
                            {
                              date: '2024-03-10',
                              type: 'Appel téléphonique',
                              methode: 'Téléphone',
                              frequence: 'Relance initiale',
                              montantEvoque: 16000,
                              modele: 'Script téléphonique standard',
                              destinataires: '+242 06 123 45 67',
                              statut: 'Terminé'
                            },
                            {
                              date: '2024-03-05',
                              type: 'Relance courtoise',
                              methode: 'Email',
                              frequence: 'Rappel amical',
                              montantEvoque: 16000,
                              modele: 'Modèle courtois',
                              destinataires: 'comptabilite@congocommerce.com',
                              statut: 'Livré'
                            },
                            {
                              date: '2024-02-28',
                              type: 'Mise en demeure',
                              methode: 'Courrier recommandé',
                              frequence: 'Relance formelle',
                              montantEvoque: 16000,
                              modele: 'Modèle mise en demeure',
                              destinataires: 'Directeur Général - SARL CONGO BUSINESS',
                              statut: 'Accusé de réception'
                            },
                            {
                              date: '2024-02-20',
                              type: 'SMS de rappel',
                              methode: 'SMS',
                              frequence: 'Rappel urgent',
                              montantEvoque: 11000,
                              modele: 'SMS court - Rappel',
                              destinataires: '+242 06 123 45 67',
                              statut: 'Échec de livraison'
                            }
                          ].map((relance, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {new Date(relance.date).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  relance.type.includes('amiable') ? 'bg-blue-100 text-blue-800' :
                                  relance.type.includes('téléphonique') ? 'bg-green-100 text-green-800' :
                                  relance.type.includes('courtoise') ? 'bg-yellow-100 text-yellow-800' :
                                  relance.type.includes('demeure') ? 'bg-red-100 text-red-800' :
                                  'bg-purple-100 text-purple-800'
                                }`}>
                                  {relance.type}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  {relance.methode === 'Email' && <Mail className="w-4 h-4 text-blue-500 mr-2" />}
                                  {relance.methode === 'Téléphone' && <Phone className="w-4 h-4 text-green-500 mr-2" />}
                                  {relance.methode === 'SMS' && <MessageSquare className="w-4 h-4 text-purple-500 mr-2" />}
                                  {relance.methode === 'Courrier recommandé' && <FileText className="w-4 h-4 text-red-500 mr-2" />}
                                  <span className="text-sm text-gray-900">{relance.methode}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {relance.frequence}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-green-600">
                                  {relance.montantEvoque.toLocaleString()} FCFA
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900">
                                  {relance.modele}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900">
                                  {relance.destinataires}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  relance.statut === 'Envoyé' ? 'bg-blue-100 text-blue-800' :
                                  relance.statut === 'Terminé' ? 'bg-green-100 text-green-800' :
                                  relance.statut === 'Livré' ? 'bg-green-100 text-green-800' :
                                  relance.statut === 'Accusé de réception' ? 'bg-purple-100 text-purple-800' :
                                  relance.statut === 'Échec de livraison' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {relance.statut}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Statistiques des relances */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-sm text-blue-600 font-medium">Total Relances</div>
                      <div className="text-lg font-bold text-blue-900">5</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-sm text-green-600 font-medium">Relances Réussies</div>
                      <div className="text-lg font-bold text-green-900">4</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="text-sm text-orange-600 font-medium">Dernière Relance</div>
                      <div className="text-lg font-bold text-orange-900">15/03/2024</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="text-sm text-purple-600 font-medium">Taux de Réussite</div>
                      <div className="text-lg font-bold text-purple-900">80%</div>
                    </div>
                  </div>
                </div>
              )}

              {activeDossierTab === 'payments' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Historique des Paiements</h3>

                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Date de paiement
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              N° Transaction
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Facture(s) concernée(s)
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Montant
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Méthode de paiement
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Référence
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Statut
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Date comptabilisation
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Commentaires
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {/* Données mock pour l'historique des paiements */}
                          {[
                            {
                              datePaiement: '2024-03-20',
                              numTransaction: 'TXN-2024-001',
                              facturesConcernees: 'FAC003',
                              montant: 2000,
                              methodePaiement: 'Virement bancaire',
                              reference: 'VIR-240320-001',
                              statut: 'Validé',
                              dateComptabilisation: '2024-03-21',
                              commentaires: 'Paiement partiel sur facture FAC003'
                            },
                            {
                              datePaiement: '2024-02-15',
                              numTransaction: 'TXN-2024-002',
                              facturesConcernees: 'FAC001, FAC002',
                              montant: 8000,
                              methodePaiement: 'Chèque',
                              reference: 'CHQ-240215-789456',
                              statut: 'Validé',
                              dateComptabilisation: '2024-02-16',
                              commentaires: 'Paiement groupé pour 2 factures'
                            },
                            {
                              datePaiement: '2024-01-30',
                              numTransaction: 'TXN-2024-003',
                              facturesConcernees: 'FAC001',
                              montant: 1500,
                              methodePaiement: 'Espèces',
                              reference: 'ESP-240130-001',
                              statut: 'Validé',
                              dateComptabilisation: '2024-01-30',
                              commentaires: 'Acompte sur facture en cours'
                            },
                            {
                              datePaiement: '2024-01-10',
                              numTransaction: 'TXN-2024-004',
                              facturesConcernees: 'FAC002',
                              montant: 3000,
                              methodePaiement: 'Virement bancaire',
                              reference: 'VIR-240110-002',
                              statut: 'En attente',
                              dateComptabilisation: null,
                              commentaires: 'Virement en cours de vérification'
                            },
                            {
                              datePaiement: '2023-12-20',
                              numTransaction: 'TXN-2023-125',
                              facturesConcernees: 'FAC-PREV-001',
                              montant: 4500,
                              methodePaiement: 'Carte bancaire',
                              reference: 'CB-231220-456789',
                              statut: 'Annulé',
                              dateComptabilisation: null,
                              commentaires: 'Paiement annulé suite à contestation client'
                            }
                          ].map((paiement, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {new Date(paiement.datePaiement).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-blue-600">
                                  {paiement.numTransaction}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {paiement.facturesConcernees}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-bold text-green-600">
                                  {paiement.montant.toLocaleString()} FCFA
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  {paiement.methodePaiement === 'Virement bancaire' && <Banknote className="w-4 h-4 text-blue-500 mr-2" />}
                                  {paiement.methodePaiement === 'Chèque' && <FileText className="w-4 h-4 text-green-500 mr-2" />}
                                  {paiement.methodePaiement === 'Espèces' && <DollarSign className="w-4 h-4 text-yellow-500 mr-2" />}
                                  {paiement.methodePaiement === 'Carte bancaire' && <CreditCard className="w-4 h-4 text-purple-500 mr-2" />}
                                  <span className="text-sm text-gray-900">{paiement.methodePaiement}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 font-mono">
                                  {paiement.reference}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  paiement.statut === 'Validé' ? 'bg-green-100 text-green-800' :
                                  paiement.statut === 'En attente' ? 'bg-yellow-100 text-yellow-800' :
                                  paiement.statut === 'Annulé' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {paiement.statut}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {paiement.dateComptabilisation ? new Date(paiement.dateComptabilisation).toLocaleDateString() : '-'}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-600 max-w-xs truncate">
                                  {paiement.commentaires}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Statistiques des paiements */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-sm text-green-600 font-medium">Total Encaissé</div>
                      <div className="text-lg font-bold text-green-900">11,500 FCFA</div>
                      <div className="text-xs text-green-600 mt-1">Paiements validés</div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <div className="text-sm text-yellow-600 font-medium">En Attente</div>
                      <div className="text-lg font-bold text-yellow-900">3,000 FCFA</div>
                      <div className="text-xs text-yellow-600 mt-1">À valider</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-sm text-blue-600 font-medium">Nombre de Transactions</div>
                      <div className="text-lg font-bold text-blue-900">5</div>
                      <div className="text-xs text-blue-600 mt-1">Total depuis l'ouverture</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="text-sm text-purple-600 font-medium">Dernier Paiement</div>
                      <div className="text-lg font-bold text-purple-900">20/03/2024</div>
                      <div className="text-xs text-purple-600 mt-1">2,000 FCFA</div>
                    </div>
                  </div>

                  {/* Graphique des paiements par mois */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Évolution des Paiements</h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={[
                          { mois: 'Oct 2023', montant: 0 },
                          { mois: 'Nov 2023', montant: 0 },
                          { mois: 'Déc 2023', montant: 4500 },
                          { mois: 'Jan 2024', montant: 4500 },
                          { mois: 'Fév 2024', montant: 8000 },
                          { mois: 'Mar 2024', montant: 2000 }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="mois" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`${value.toLocaleString()} FCFA`, 'Montant']} />
                          <Area type="monotone" dataKey="montant" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Répartition par méthode de paiement */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Répartition par Méthode de Paiement</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={[
                                { name: 'Virement bancaire', value: 5000, fill: '#3B82F6' },
                                { name: 'Chèque', value: 8000, fill: '#22c55e' },
                                { name: 'Espèces', value: 1500, fill: '#F59E0B' },
                                { name: 'Carte bancaire', value: 0, fill: '#8B5CF6' }
                              ]}
                              cx="50%"
                              cy="50%"
                              outerRadius={60}
                              dataKey="value"
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            />
                            <Tooltip formatter={(value) => [`${value.toLocaleString()} FCFA`, 'Montant']} />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                            <span className="text-sm text-gray-700">Chèque</span>
                          </div>
                          <span className="text-sm font-medium">8,000 FCFA</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                            <span className="text-sm text-gray-700">Virement bancaire</span>
                          </div>
                          <span className="text-sm font-medium">5,000 FCFA</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>
                            <span className="text-sm text-gray-700">Espèces</span>
                          </div>
                          <span className="text-sm font-medium">1,500 FCFA</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-purple-500 rounded mr-2"></div>
                            <span className="text-sm text-gray-700">Carte bancaire</span>
                          </div>
                          <span className="text-sm font-medium">0 FCFA</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeDossierTab === 'interest' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Gestion des Intérêts et Pénalités</h3>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Nouvelle Pénalité
                    </button>
                  </div>

                  {/* Statistiques générales */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-red-50 rounded-lg p-4">
                      <div className="text-sm text-red-600 font-medium">Total Pénalités</div>
                      <div className="text-lg font-bold text-red-900">750 FCFA</div>
                      <div className="text-xs text-red-600 mt-1">Sur créances en retard</div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <div className="text-sm text-yellow-600 font-medium">En Attente Validation</div>
                      <div className="text-lg font-bold text-yellow-900">250 FCFA</div>
                      <div className="text-xs text-yellow-600 mt-1">2 dossiers</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-sm text-green-600 font-medium">Validées</div>
                      <div className="text-lg font-bold text-green-900">500 FCFA</div>
                      <div className="text-xs text-green-600 mt-1">Envoyées à facturation</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-sm text-blue-600 font-medium">Taux Moyen</div>
                      <div className="text-lg font-bold text-blue-900">4.5%</div>
                      <div className="text-xs text-blue-600 mt-1">Taux appliqué</div>
                    </div>
                  </div>

                  {/* Tableau des pénalités */}
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900">Historique des Pénalités</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Date création
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Facture(s)
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Montant créance
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Jours retard
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Taux appliqué
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Montant pénalité
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Statut
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Date validation
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {[
                            {
                              id: 'PEN-001',
                              dateCreation: '2024-03-15',
                              factures: 'FAC001',
                              montantCreance: 5000,
                              joursRetard: 45,
                              tauxApplique: 5.0,
                              montantPenalite: 250,
                              statut: 'En attente validation',
                              dateValidation: null,
                              validateur: null
                            },
                            {
                              id: 'PEN-002',
                              dateCreation: '2024-03-10',
                              factures: 'FAC002',
                              montantCreance: 6000,
                              joursRetard: 30,
                              tauxApplique: 4.0,
                              montantPenalite: 200,
                              statut: 'Validée',
                              dateValidation: '2024-03-11',
                              validateur: 'Marie Dupont'
                            },
                            {
                              id: 'PEN-003',
                              dateCreation: '2024-03-01',
                              factures: 'FAC003',
                              montantCreance: 3000,
                              joursRetard: 60,
                              tauxApplique: 6.0,
                              montantPenalite: 300,
                              statut: 'Envoyée facturation',
                              dateValidation: '2024-03-02',
                              validateur: 'Jean Martin'
                            }
                          ].map((penalite, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {new Date(penalite.dateCreation).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-blue-600">
                                  {penalite.factures}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {penalite.montantCreance.toLocaleString()} FCFA
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className={`text-sm font-medium ${
                                  penalite.joursRetard > 45 ? 'text-red-600' :
                                  penalite.joursRetard > 30 ? 'text-orange-600' : 'text-yellow-600'
                                }`}>
                                  {penalite.joursRetard} jours
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {penalite.tauxApplique}%
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-bold text-red-600">
                                  {penalite.montantPenalite.toLocaleString()} FCFA
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  penalite.statut === 'En attente validation' ? 'bg-yellow-100 text-yellow-800' :
                                  penalite.statut === 'Validée' ? 'bg-green-100 text-green-800' :
                                  penalite.statut === 'Envoyée facturation' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {penalite.statut}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {penalite.dateValidation ? new Date(penalite.dateValidation).toLocaleDateString() : '-'}
                                </div>
                                {penalite.validateur && (
                                  <div className="text-xs text-gray-700">{penalite.validateur}</div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex gap-2">
                                  {penalite.statut === 'En attente validation' && (
                                    <>
                                      <button
                                        className="text-green-600 hover:text-green-900 p-1 rounded"
                                        title={t('actions.validate')} aria-label="Valider">
                                        <CheckCircle className="w-4 h-4" />
                                      </button>
                                      <button
                                        className="text-red-600 hover:text-red-900 p-1 rounded"
                                        title="Rejeter" aria-label="Fermer">
                                        <XCircle className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                  {penalite.statut === 'Validée' && (
                                    <button
                                      className="text-blue-600 hover:text-blue-900 p-1 rounded"
                                      title="Envoyer à facturation"
                                    >
                                      <Send className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    className="text-gray-600 hover:text-gray-900 p-1 rounded"
                                    title="Voir détails" aria-label="Voir les détails">
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Calculateur de pénalités */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Calculateur de Pénalités</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Sélectionner les factures
                        </label>
                        <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                          <option value="">Choisir une facture</option>
                          <option value="FAC001">FAC001 - 5,000 FCFA (45 jours de retard)</option>
                          <option value="FAC002">FAC002 - 6,000 FCFA (15 jours de retard)</option>
                          <option value="FAC003">FAC003 - 3,000 FCFA (30 jours de retard)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Taux de pénalité (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          defaultValue="4.5"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Type de calcul
                        </label>
                        <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                          <option value="monthly">Mensuel</option>
                          <option value="daily">Journalier</option>
                          <option value="fixed">Montant fixe</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <h5 className="font-medium text-gray-900 mb-2">Aperçu du calcul</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Montant créance:</span>
                          <div className="font-medium">5,000 FCFA</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Jours de retard:</span>
                          <div className="font-medium">45 jours</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Taux appliqué:</span>
                          <div className="font-medium">4.5%</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Pénalité calculée:</span>
                          <div className="font-bold text-red-600">225 FCFA</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-3">
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Calculer
                      </button>
                      <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        Créer Pénalité
                      </button>
                    </div>
                  </div>

                  {/* Workflow de validation */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Workflow de Validation</h4>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Plus className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="ml-2 text-sm font-medium">Création</span>
                        </div>
                        <div className="w-8 h-px bg-gray-300"></div>
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                            <Clock className="w-4 h-4 text-yellow-600" />
                          </div>
                          <span className="ml-2 text-sm font-medium">{t('status.pending')}</span>
                        </div>
                        <div className="w-8 h-px bg-gray-300"></div>
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </div>
                          <span className="ml-2 text-sm font-medium">Validation</span>
                        </div>
                        <div className="w-8 h-px bg-gray-300"></div>
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <Send className="w-4 h-4 text-purple-600" />
                          </div>
                          <span className="ml-2 text-sm font-medium">Facturation</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-gray-600">
                      <p><strong>Note:</strong> Toutes les pénalités doivent être validées par un responsable avant envoi à la facturation.</p>
                    </div>
                  </div>

                  {/* Configuration des taux */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Configuration des Taux</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="p-4 border border-gray-200 rounded-lg">
                        <h5 className="font-medium text-gray-900 mb-2">Retard 0-30 jours</h5>
                        <div className="text-lg font-bold text-yellow-600">3.0%</div>
                        <div className="text-sm text-gray-600">Taux standard</div>
                      </div>
                      <div className="p-4 border border-gray-200 rounded-lg">
                        <h5 className="font-medium text-gray-900 mb-2">Retard 31-60 jours</h5>
                        <div className="text-lg font-bold text-orange-600">4.5%</div>
                        <div className="text-sm text-gray-600">Taux majoré</div>
                      </div>
                      <div className="p-4 border border-gray-200 rounded-lg">
                        <h5 className="font-medium text-gray-900 mb-2">Retard 60+ jours</h5>
                        <div className="text-lg font-bold text-red-600">6.0%</div>
                        <div className="text-sm text-gray-600">Taux maximum</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeDossierTab === 'repayment' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Plans de Remboursement</h3>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Nouveau Plan
                    </button>
                  </div>

                  {/* Statistiques des plans */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-sm text-blue-600 font-medium">Plans Actifs</div>
                      <div className="text-lg font-bold text-blue-900">2</div>
                      <div className="text-xs text-blue-600 mt-1">{t('status.inProgress')}</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-sm text-green-600 font-medium">Montant Total</div>
                      <div className="text-lg font-bold text-green-900">18,500 FCFA</div>
                      <div className="text-xs text-green-600 mt-1">À rembourser</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="text-sm text-orange-600 font-medium">Paiements Mensuels</div>
                      <div className="text-lg font-bold text-orange-900">3,200 FCFA</div>
                      <div className="text-xs text-orange-600 mt-1">Moyenne</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="text-sm text-purple-600 font-medium">Taux Respect</div>
                      <div className="text-lg font-bold text-purple-900">85%</div>
                      <div className="text-xs text-purple-600 mt-1">Paiements à temps</div>
                    </div>
                  </div>

                  {/* Tableau des plans de remboursement */}
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900">Historique des Plans de Remboursement</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Ref
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Montant initial
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Intérêts et pénalités
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Durée (Mois)
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Date de début
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Date de fin
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Montant mensuel
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Intérêt total
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Montant total
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Commentaire
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Statut
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {[
                            {
                              ref: 'PLN-2024-001',
                              montantInitial: 14000,
                              interetsPenalites: 700,
                              dureeMois: 6,
                              dateDebut: '2024-03-01',
                              dateFin: '2024-08-31',
                              montantMensuel: 2450,
                              interetTotal: 700,
                              montantTotal: 14700,
                              commentaire: 'Plan négocié suite à difficultés temporaires',
                              statut: 'Actif'
                            },
                            {
                              ref: 'PLN-2024-002',
                              montantInitial: 8000,
                              interetsPenalites: 400,
                              dureeMois: 4,
                              dateDebut: '2024-02-15',
                              dateFin: '2024-06-15',
                              montantMensuel: 2100,
                              interetTotal: 400,
                              montantTotal: 8400,
                              commentaire: 'Plan court avec engagement client',
                              statut: 'En cours'
                            },
                            {
                              ref: 'PLN-2023-015',
                              montantInitial: 12000,
                              interetsPenalites: 600,
                              dureeMois: 8,
                              dateDebut: '2023-10-01',
                              dateFin: '2024-05-31',
                              montantMensuel: 1575,
                              interetTotal: 600,
                              montantTotal: 12600,
                              commentaire: 'Plan étalé sur 8 mois, paiements réguliers',
                              statut: 'Terminé'
                            },
                            {
                              ref: 'PLN-2023-008',
                              montantInitial: 5000,
                              interetsPenalites: 250,
                              dureeMois: 3,
                              dateDebut: '2023-11-01',
                              dateFin: '2024-01-31',
                              montantMensuel: 1750,
                              interetTotal: 250,
                              montantTotal: 5250,
                              commentaire: 'Plan d\'urgence, client en redressement',
                              statut: 'Suspendu'
                            }
                          ].map((plan, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-blue-600">
                                  {plan.ref}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {plan.montantInitial.toLocaleString()} FCFA
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-orange-600">
                                  {plan.interetsPenalites.toLocaleString()} FCFA
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {plan.dureeMois} mois
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {new Date(plan.dateDebut).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {new Date(plan.dateFin).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-bold text-green-600">
                                  {plan.montantMensuel.toLocaleString()} FCFA
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-red-600">
                                  {plan.interetTotal.toLocaleString()} FCFA
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-bold text-purple-600">
                                  {plan.montantTotal.toLocaleString()} FCFA
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-600 max-w-xs truncate" title={plan.commentaire}>
                                  {plan.commentaire}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  plan.statut === 'Actif' ? 'bg-green-100 text-green-800' :
                                  plan.statut === 'En cours' ? 'bg-blue-100 text-blue-800' :
                                  plan.statut === 'Terminé' ? 'bg-gray-100 text-gray-800' :
                                  plan.statut === 'Suspendu' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {plan.statut}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex gap-2">
                                  <button
                                    className="text-blue-600 hover:text-blue-900 p-1 rounded"
                                    title="Voir échéancier" aria-label="Calendrier">
                                    <Calendar className="w-4 h-4" />
                                  </button>
                                  <button
                                    className="text-green-600 hover:text-green-900 p-1 rounded"
                                    title="Modifier plan"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    className="text-gray-600 hover:text-gray-900 p-1 rounded"
                                    title="Voir détails" aria-label="Voir les détails">
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Calculateur de plan de remboursement */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Simulateur de Plan de Remboursement</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Montant de la dette (FCFA)
                        </label>
                        <input
                          type="number"
                          defaultValue="14000"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Taux d'intérêt annuel (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          defaultValue="6.0"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Durée souhaitée (mois)
                        </label>
                        <input
                          type="number"
                          defaultValue="6"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <h5 className="font-medium text-gray-900 mb-3">Simulation du Plan</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Capital:</span>
                          <div className="font-medium">14,000 FCFA</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Intérêts totaux:</span>
                          <div className="font-medium text-orange-600">420 FCFA</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Montant total:</span>
                          <div className="font-bold text-purple-600">14,420 FCFA</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Mensualité:</span>
                          <div className="font-bold text-green-600">2,403 FCFA</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-3">
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Calculer
                      </button>
                      <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        Créer Plan
                      </button>
                    </div>
                  </div>

                  {/* Échéancier du plan actif */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Échéancier - Plan PLN-2024-001</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Échéance</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">{t('common.date')}</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Capital</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Intérêts</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Mensualité</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Capital restant</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Statut</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 text-sm">
                          {[
                            { echeance: 1, date: '2024-03-31', capital: 2333, interets: 117, mensualite: 2450, restant: 11667, statut: 'Payé' },
                            { echeance: 2, date: '2024-04-30', capital: 2345, interets: 105, mensualite: 2450, restant: 9322, statut: 'Payé' },
                            { echeance: 3, date: '2024-05-31', capital: 2357, interets: 93, mensualite: 2450, restant: 6965, statut: 'En retard' },
                            { echeance: 4, date: '2024-06-30', capital: 2369, interets: 81, mensualite: 2450, restant: 4596, statut: 'À venir' },
                            { echeance: 5, date: '2024-07-31', capital: 2381, interets: 69, mensualite: 2450, restant: 2215, statut: 'À venir' },
                            { echeance: 6, date: '2024-08-31', capital: 2215, interets: 35, mensualite: 2250, restant: 0, statut: 'À venir' }
                          ].map((echeance, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium">{echeance.echeance}</td>
                              <td className="px-4 py-3">{echeance.date}</td>
                              <td className="px-4 py-3 font-medium">{echeance.capital.toLocaleString()} FCFA</td>
                              <td className="px-4 py-3 text-orange-600">{echeance.interets.toLocaleString()} FCFA</td>
                              <td className="px-4 py-3 font-bold text-green-600">{echeance.mensualite.toLocaleString()} FCFA</td>
                              <td className="px-4 py-3">{echeance.restant.toLocaleString()} FCFA</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  echeance.statut === 'Payé' ? 'bg-green-100 text-green-800' :
                                  echeance.statut === 'En retard' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {echeance.statut}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeDossierTab === 'actions' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Historique des Actions</h3>
                    <div className="flex gap-3">
                      <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                        <option value="all">Toutes les actions</option>
                        <option value="relances">Relances</option>
                        <option value="paiements">Paiements</option>
                        <option value="penalites">Pénalités</option>
                        <option value="plans">Plans de remboursement</option>
                      </select>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Nouvelle Action
                      </button>
                    </div>
                  </div>

                  {/* Statistiques des actions */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-sm text-blue-600 font-medium">Total Actions</div>
                      <div className="text-lg font-bold text-blue-900">23</div>
                      <div className="text-xs text-blue-600 mt-1">Depuis ouverture</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-sm text-green-600 font-medium">Actions Réussies</div>
                      <div className="text-lg font-bold text-green-900">18</div>
                      <div className="text-xs text-green-600 mt-1">78% de réussite</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="text-sm text-orange-600 font-medium">Dernière Action</div>
                      <div className="text-lg font-bold text-orange-900">20/03/2024</div>
                      <div className="text-xs text-orange-600 mt-1">Paiement reçu</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="text-sm text-purple-600 font-medium">Temps Moyen</div>
                      <div className="text-lg font-bold text-purple-900">3.2j</div>
                      <div className="text-xs text-purple-600 mt-1">Entre actions</div>
                    </div>
                  </div>

                  {/* Timeline des actions */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-6">Chronologie des Actions</h4>
                    <div className="flow-root">
                      <ul className="-mb-8">
                        {[
                          {
                            id: 1,
                            date: '2024-03-20',
                            time: '14:30',
                            type: 'Paiement',
                            action: 'Paiement partiel reçu',
                            description: 'Paiement de 2,000 FCFA reçu par virement bancaire pour la facture FAC003',
                            user: 'Marie Dupont',
                            statut: 'Succès',
                            icon: DollarSign,
                            iconColor: 'text-green-500',
                            bgColor: 'bg-green-100'
                          },
                          {
                            id: 2,
                            date: '2024-03-15',
                            time: '09:15',
                            type: 'Relance',
                            action: 'Email de relance envoyé',
                            description: 'Envoi d\'une relance amiable par email concernant la facture FAC001 en retard de 45 jours',
                            user: 'Jean Martin',
                            statut: 'Envoyé',
                            icon: Mail,
                            iconColor: 'text-blue-500',
                            bgColor: 'bg-blue-100'
                          },
                          {
                            id: 3,
                            date: '2024-03-10',
                            time: '16:45',
                            type: 'Appel',
                            action: 'Appel téléphonique client',
                            description: 'Contact téléphonique avec le client pour négocier un plan de remboursement. Client réceptif.',
                            user: 'Sophie Bernard',
                            statut: 'Terminé',
                            icon: Phone,
                            iconColor: 'text-green-500',
                            bgColor: 'bg-green-100'
                          },
                          {
                            id: 4,
                            date: '2024-03-05',
                            time: '11:20',
                            type: 'Pénalité',
                            action: 'Pénalité créée',
                            description: 'Création d\'une pénalité de 250 FCFA pour retard de paiement sur FAC001 (5% sur 45 jours)',
                            user: 'Marie Dupont',
                            statut: 'En attente',
                            icon: AlertTriangle,
                            iconColor: 'text-yellow-500',
                            bgColor: 'bg-yellow-100'
                          },
                          {
                            id: 5,
                            date: '2024-03-01',
                            time: '08:30',
                            type: 'Plan',
                            action: 'Plan de remboursement créé',
                            description: 'Création du plan PLN-2024-001 : 14,700 FCFA sur 6 mois, mensualité de 2,450 FCFA',
                            user: 'Jean Martin',
                            statut: 'Actif',
                            icon: Calendar,
                            iconColor: 'text-purple-500',
                            bgColor: 'bg-purple-100'
                          },
                          {
                            id: 6,
                            date: '2024-02-28',
                            time: '15:10',
                            type: 'Courrier',
                            action: 'Mise en demeure envoyée',
                            description: 'Envoi d\'une mise en demeure par courrier recommandé avec AR pour factures impayées',
                            user: 'Sophie Bernard',
                            statut: 'Accusé reçu',
                            icon: FileText,
                            iconColor: 'text-red-500',
                            bgColor: 'bg-red-100'
                          },
                          {
                            id: 7,
                            date: '2024-02-20',
                            time: '10:00',
                            type: 'SMS',
                            action: 'SMS de rappel',
                            description: 'Envoi d\'un SMS de rappel courtois concernant l\'échéance dépassée',
                            user: 'Marie Dupont',
                            statut: 'Échec',
                            icon: MessageSquare,
                            iconColor: 'text-red-500',
                            bgColor: 'bg-red-100'
                          },
                          {
                            id: 8,
                            date: '2024-02-15',
                            time: '14:20',
                            type: 'Paiement',
                            action: 'Paiement groupé',
                            description: 'Paiement de 8,000 FCFA par chèque pour les factures FAC001 et FAC002',
                            user: 'Marie Dupont',
                            statut: 'Validé',
                            icon: Banknote,
                            iconColor: 'text-green-500',
                            bgColor: 'bg-green-100'
                          },
                          {
                            id: 9,
                            date: '2024-01-15',
                            time: '09:00',
                            type: 'Ouverture',
                            action: 'Dossier de recouvrement ouvert',
                            description: 'Ouverture du dossier REC-2024-001 pour un montant total de 16,000 FCFA',
                            user: 'Jean Martin',
                            statut: 'Ouvert',
                            icon: FileText,
                            iconColor: 'text-blue-500',
                            bgColor: 'bg-blue-100'
                          }
                        ].map((action, actionIdx) => (
                          <li key={action.id}>
                            <div className="relative pb-8">
                              {actionIdx !== 8 ? (
                                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                              ) : null}
                              <div className="relative flex space-x-3">
                                <div>
                                  <span className={`${action.bgColor} h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white`}>
                                    <action.icon className={`h-4 w-4 ${action.iconColor}`} aria-hidden="true" />
                                  </span>
                                </div>
                                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                      <p className="text-sm font-medium text-gray-900">{action.action}</p>
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        action.statut === 'Succès' || action.statut === 'Terminé' || action.statut === 'Validé' || action.statut === 'Accusé reçu' ? 'bg-green-100 text-green-800' :
                                        action.statut === 'Envoyé' || action.statut === 'Ouvert' || action.statut === 'Actif' ? 'bg-blue-100 text-blue-800' :
                                        action.statut === 'En attente' ? 'bg-yellow-100 text-yellow-800' :
                                        action.statut === 'Échec' ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {action.statut}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-700 mb-2">{action.description}</p>
                                    <div className="flex items-center gap-4 text-xs text-gray-700">
                                      <span className="flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        {action.user}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {action.time}
                                      </span>
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        action.type === 'Paiement' ? 'bg-green-50 text-green-700' :
                                        action.type === 'Relance' ? 'bg-blue-50 text-blue-700' :
                                        action.type === 'Appel' ? 'bg-green-50 text-green-700' :
                                        action.type === 'Pénalité' ? 'bg-yellow-50 text-yellow-700' :
                                        action.type === 'Plan' ? 'bg-purple-50 text-purple-700' :
                                        action.type === 'Courrier' ? 'bg-red-50 text-red-700' :
                                        action.type === 'SMS' ? 'bg-orange-50 text-orange-700' :
                                        'bg-gray-50 text-gray-700'
                                      }`}>
                                        {action.type}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="whitespace-nowrap text-right text-sm text-gray-700">
                                    <time dateTime={action.date}>{new Date(action.date).toLocaleDateString()}</time>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Tableau récapitulatif par type d'action */}
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900">Récapitulatif par Type d'Action</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Type d'action
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Nombre total
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Réussies
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              En cours
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Échecs
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Taux de réussite
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Dernière action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {[
                            { type: 'Paiements', total: 3, reussies: 3, encours: 0, echecs: 0, taux: 100, derniere: '20/03/2024' },
                            { type: 'Relances Email', total: 5, reussies: 4, encours: 1, echecs: 0, taux: 80, derniere: '15/03/2024' },
                            { type: 'Appels téléphoniques', total: 4, reussies: 4, encours: 0, echecs: 0, taux: 100, derniere: '10/03/2024' },
                            { type: 'Pénalités', total: 2, reussies: 1, encours: 1, echecs: 0, taux: 50, derniere: '05/03/2024' },
                            { type: 'Plans de remboursement', total: 1, reussies: 0, encours: 1, echecs: 0, taux: 0, derniere: '01/03/2024' },
                            { type: 'Courriers recommandés', total: 2, reussies: 2, encours: 0, echecs: 0, taux: 100, derniere: '28/02/2024' },
                            { type: 'SMS', total: 3, reussies: 2, encours: 0, echecs: 1, taux: 67, derniere: '20/02/2024' }
                          ].map((stat, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{stat.type}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-bold text-blue-600">{stat.total}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-green-600">{stat.reussies}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-yellow-600">{stat.encours}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-red-600">{stat.echecs}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className={`text-sm font-bold ${
                                  stat.taux >= 80 ? 'text-green-600' :
                                  stat.taux >= 60 ? 'text-yellow-600' :
                                  'text-red-600'
                                }`}>
                                  {stat.taux}%
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{stat.derniere}</div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Graphique d'activité */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Activité du Dossier</h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[
                          { mois: 'Jan 2024', actions: 3, reussites: 3 },
                          { mois: 'Fév 2024', actions: 8, reussites: 7 },
                          { mois: 'Mar 2024', actions: 12, reussites: 8 }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="mois" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="actions" stroke="#3B82F6" name="Total Actions" strokeWidth={2} />
                          <Line type="monotone" dataKey="reussites" stroke="#22c55e" name="Actions Réussies" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* Onglet Attachments */}
              {activeDossierTab === 'attachments' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Documents et Pièces Jointes</h3>
                    <div className="flex gap-3">
                      <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                        <option value="all">Tous les documents</option>
                        <option value="factures">Factures</option>
                        <option value="contrats">Contrats</option>
                        <option value="correspondances">Correspondances</option>
                        <option value="juridiques">Documents juridiques</option>
                        <option value="paiements">Justificatifs paiements</option>
                      </select>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Ajouter Document
                      </button>
                    </div>
                  </div>

                  {/* Statistiques des documents */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-sm text-blue-600 font-medium">Total Documents</div>
                      <div className="text-lg font-bold text-blue-900">15</div>
                      <div className="text-xs text-blue-600 mt-1">Tous types</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-sm text-green-600 font-medium">Factures</div>
                      <div className="text-lg font-bold text-green-900">6</div>
                      <div className="text-xs text-green-600 mt-1">Documents officiels</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="text-sm text-orange-600 font-medium">Correspondances</div>
                      <div className="text-lg font-bold text-orange-900">7</div>
                      <div className="text-xs text-orange-600 mt-1">Emails, courriers</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="text-sm text-purple-600 font-medium">Taille Totale</div>
                      <div className="text-lg font-bold text-purple-900">23 MB</div>
                      <div className="text-xs text-purple-600 mt-1">Espace utilisé</div>
                    </div>
                  </div>

                  {/* Zone de glisser-déposer */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                    <div className="flex flex-col items-center">
                      <Upload className="w-12 h-12 text-gray-700 mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Glissez-déposez vos fichiers ici</h4>
                      <p className="text-gray-700 mb-4">ou cliquez pour sélectionner des fichiers</p>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Parcourir les fichiers
                      </button>
                      <p className="text-xs text-gray-700 mt-2">Formats acceptés: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (Max 10MB)</p>
                    </div>
                  </div>

                  {/* Liste des documents */}
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900">Documents du Dossier</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Document
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Taille
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Date ajout
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Ajouté par
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Description
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {[
                            {
                              nom: 'Facture_FAC001.pdf',
                              type: 'Facture',
                              taille: '245 KB',
                              dateAjout: '2024-03-20',
                              ajoutePar: 'Marie Dupont',
                              description: 'Facture originale FAC001 - Prestation janvier',
                              extension: 'pdf'
                            },
                            {
                              nom: 'Contrat_Location_2024.pdf',
                              type: 'Contrat',
                              taille: '1.2 MB',
                              dateAjout: '2024-03-15',
                              ajoutePar: 'Jean Martin',
                              description: 'Contrat de location signé - CTR-2024-001',
                              extension: 'pdf'
                            },
                            {
                              nom: 'Email_relance_15032024.eml',
                              type: 'Correspondance',
                              taille: '45 KB',
                              dateAjout: '2024-03-15',
                              ajoutePar: 'Sophie Bernard',
                              description: 'Email de relance envoyé au client',
                              extension: 'eml'
                            },
                            {
                              nom: 'Mise_en_demeure.pdf',
                              type: 'Juridique',
                              taille: '890 KB',
                              dateAjout: '2024-02-28',
                              ajoutePar: 'Jean Martin',
                              description: 'Mise en demeure envoyée par courrier recommandé',
                              extension: 'pdf'
                            },
                            {
                              nom: 'Virement_2000_FCFA.jpg',
                              type: 'Paiement',
                              taille: '1.8 MB',
                              dateAjout: '2024-03-20',
                              ajoutePar: 'Marie Dupont',
                              description: 'Justificatif de virement bancaire 2000 FCFA',
                              extension: 'jpg'
                            },
                            {
                              nom: 'Plan_remboursement_PLN001.xlsx',
                              type: 'Plan',
                              taille: '156 KB',
                              dateAjout: '2024-03-01',
                              ajoutePar: 'Jean Martin',
                              description: 'Échéancier détaillé du plan PLN-2024-001',
                              extension: 'xlsx'
                            }
                          ].map((doc, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-8 w-8">
                                    {doc.extension === 'pdf' && <FileText className="h-8 w-8 text-red-500" />}
                                    {doc.extension === 'xlsx' && <FileText className="h-8 w-8 text-green-500" />}
                                    {doc.extension === 'jpg' && <FileText className="h-8 w-8 text-blue-500" />}
                                    {doc.extension === 'eml' && <Mail className="h-8 w-8 text-purple-500" />}
                                  </div>
                                  <div className="ml-3">
                                    <div className="text-sm font-medium text-gray-900">{doc.nom}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  doc.type === 'Facture' ? 'bg-green-100 text-green-800' :
                                  doc.type === 'Contrat' ? 'bg-blue-100 text-blue-800' :
                                  doc.type === 'Correspondance' ? 'bg-purple-100 text-purple-800' :
                                  doc.type === 'Juridique' ? 'bg-red-100 text-red-800' :
                                  doc.type === 'Paiement' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {doc.type}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{doc.taille}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {new Date(doc.dateAjout).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{doc.ajoutePar}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-600 max-w-xs truncate" title={doc.description}>
                                  {doc.description}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex gap-2">
                                  <button
                                    className="text-blue-600 hover:text-blue-900 p-1 rounded"
                                    title={t('actions.download')} aria-label="Télécharger">
                                    <Download className="w-4 h-4" />
                                  </button>
                                  <button
                                    className="text-green-600 hover:text-green-900 p-1 rounded"
                                    title="Prévisualiser" aria-label="Voir les détails">
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    className="text-orange-600 hover:text-orange-900 p-1 rounded"
                                    title="Partager" aria-label="Partager">
                                    <Share className="w-4 h-4" />
                                  </button>
                                  <button
                                    className="text-red-600 hover:text-red-900 p-1 rounded"
                                    title={t('common.delete')}
                                  >
                                    <Trash className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Historique des documents */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Historique des Documents</h4>
                    <div className="space-y-4">
                      {[
                        {
                          action: 'Document ajouté',
                          document: 'Virement_2000_FCFA.jpg',
                          user: 'Marie Dupont',
                          date: '2024-03-20 14:30',
                          description: 'Justificatif de paiement ajouté au dossier'
                        },
                        {
                          action: 'Document téléchargé',
                          document: 'Facture_FAC001.pdf',
                          user: 'Jean Martin',
                          date: '2024-03-18 10:15',
                          description: 'Document téléchargé pour vérification'
                        },
                        {
                          action: 'Document modifié',
                          document: 'Plan_remboursement_PLN001.xlsx',
                          user: 'Sophie Bernard',
                          date: '2024-03-02 16:45',
                          description: 'Échéancier mis à jour avec nouveaux montants'
                        }
                      ].map((item, index) => (
                        <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <FileText className="w-4 h-4 text-blue-600" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900">
                              {item.action}: {item.document}
                            </div>
                            <div className="text-sm text-gray-600">{item.description}</div>
                            <div className="text-xs text-gray-700 mt-1">
                              Par {item.user} • {item.date}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Onglet Plans de Remboursement - Vue globale tous clients */}
      {activeTab === 'repaymentplan' && (
        <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
          {/* En-tête avec statistiques */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Suivi Global des Plans de Remboursement</h2>
            </div>

            {/* KPIs globaux */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-blue-600 font-medium">Plans Actifs</div>
                <div className="text-lg font-bold text-blue-900">12</div>
                <div className="text-xs text-blue-600 mt-1">{t('status.inProgress')}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-green-600 font-medium">Taux de Respect</div>
                <div className="text-lg font-bold text-green-900">78%</div>
                <div className="text-xs text-green-600 mt-1">Paiements à temps</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="text-sm text-orange-600 font-medium">Montant Total</div>
                <div className="text-lg font-bold text-orange-900">485,000 FCFA</div>
                <div className="text-xs text-orange-600 mt-1">Sous plan</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <div className="text-sm text-red-600 font-medium">En Retard</div>
                <div className="text-lg font-bold text-red-900">3</div>
                <div className="text-xs text-red-600 mt-1">Plans non respectés</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm text-purple-600 font-medium">À Échéance</div>
                <div className="text-lg font-bold text-purple-900">5</div>
                <div className="text-xs text-purple-600 mt-1">Cette semaine</div>
              </div>
            </div>
          </div>

          {/* Filtres */}
          <div className="flex flex-wrap gap-3 mb-6">
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="all">Tous les statuts</option>
              <option value="respecte">Respecté</option>
              <option value="partiel">Partiellement respecté</option>
              <option value="retard">En retard</option>
              <option value="suspendu">Suspendu</option>
            </select>
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="all">Tous les clients</option>
              <option value="entreprise">Entreprises</option>
              <option value="particulier">Particuliers</option>
            </select>
            <input
              type="text"
              placeholder="Rechercher un plan..."
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1"
            />
          </div>

          {/* Tableau des plans de remboursement */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Référence Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Montant Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Mensualité
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Échéances Payées
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Progression
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Prochaine Échéance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[
                  {
                    reference: 'PLN-2024-001',
                    client: 'SARL Congo Commerce',
                    montantTotal: 45000,
                    mensualite: 7500,
                    echeancesPayees: '4/6',
                    progression: 67,
                    prochaineEcheance: '2024-04-30',
                    statut: 'Respecté',
                    montantPaye: 30000,
                    montantRestant: 15000
                  },
                  {
                    reference: 'PLN-2024-002',
                    client: 'Entreprise Ndoki',
                    montantTotal: 120000,
                    mensualite: 10000,
                    echeancesPayees: '2/12',
                    progression: 17,
                    prochaineEcheance: '2024-04-15',
                    statut: 'En retard',
                    montantPaye: 20000,
                    montantRestant: 100000
                  },
                  {
                    reference: 'PLN-2024-003',
                    client: 'Société Brazza Tech',
                    montantTotal: 60000,
                    mensualite: 5000,
                    echeancesPayees: '5/12',
                    progression: 42,
                    prochaineEcheance: '2024-04-25',
                    statut: 'Respecté',
                    montantPaye: 25000,
                    montantRestant: 35000
                  },
                  {
                    reference: 'PLN-2024-004',
                    client: 'Commerce Likouala',
                    montantTotal: 35000,
                    mensualite: 8750,
                    echeancesPayees: '1/4',
                    progression: 25,
                    prochaineEcheance: '2024-04-10',
                    statut: 'Partiel',
                    montantPaye: 8750,
                    montantRestant: 26250
                  },
                  {
                    reference: 'PLN-2024-005',
                    client: 'Import Export Congo',
                    montantTotal: 90000,
                    mensualite: 15000,
                    echeancesPayees: '3/6',
                    progression: 50,
                    prochaineEcheance: '2024-05-01',
                    statut: 'Respecté',
                    montantPaye: 45000,
                    montantRestant: 45000
                  }
                ].map((plan, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-blue-600">
                        {plan.reference}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {plan.client}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        {plan.montantTotal.toLocaleString()} FCFA
                      </div>
                      <div className="text-xs text-gray-700">
                        Reste: {plan.montantRestant.toLocaleString()} FCFA
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-green-600">
                        {plan.mensualite.toLocaleString()} FCFA
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {plan.echeancesPayees}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-full">
                        <div className="flex justify-between text-xs mb-1">
                          <span>{plan.progression}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              plan.statut === 'Respecté' ? 'bg-green-500' :
                              plan.statut === 'En retard' ? 'bg-red-500' :
                              plan.statut === 'Partiel' ? 'bg-orange-500' :
                              'bg-gray-400'
                            }`}
                            style={{ width: `${plan.progression}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(plan.prochaineEcheance).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-700">
                        Dans {Math.ceil((new Date(plan.prochaineEcheance).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} jours
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        plan.statut === 'Respecté' ? 'bg-green-100 text-green-800' :
                        plan.statut === 'En retard' ? 'bg-red-100 text-red-800' :
                        plan.statut === 'Partiel' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {plan.statut}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedPlan(plan);
                            setShowPlanDetailModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="Voir détails"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPlan(plan);
                            setShowEnregistrerPaiementModal(true);
                          }}
                          className="text-green-600 hover:text-green-900 p-1 rounded"
                          title="Enregistrer paiement"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPlan(plan);
                            setShowRelancePlanModal(true);
                          }}
                          className="text-orange-600 hover:text-orange-900 p-1 rounded"
                          title="Relancer"
                        >
                          <Bell className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Alerte pour les échéances proches */}
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="ml-3">
                <h4 className="text-sm font-semibold text-yellow-800">Échéances cette semaine</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  5 plans ont des échéances dans les 7 prochains jours. Pensez à relancer les clients concernés.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    PLN-2024-002 - 15/04
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    PLN-2024-004 - 10/04
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    PLN-2024-007 - 12/04
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Graphique de suivi mensuel */}
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Évolution du Respect des Plans</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[
                  { mois: 'Jan', respectes: 8, enRetard: 2, total: 10 },
                  { mois: 'Fév', respectes: 9, enRetard: 3, total: 12 },
                  { mois: 'Mar', respectes: 10, enRetard: 3, total: 13 },
                  { mois: 'Avr', respectes: 9, enRetard: 3, total: 12 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mois" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#3B82F6" name="Total Plans" strokeWidth={2} />
                  <Line type="monotone" dataKey="respectes" stroke="#22c55e" name="Respectés" strokeWidth={2} />
                  <Line type="monotone" dataKey="enRetard" stroke="#EF4444" name="En Retard" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'contentieux' && (
        <ContentieuxTab />
      )}

      {/* Modal de création de dossier de recouvrement */}
      {showCreateDossierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Créer un Dossier de Recouvrement
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de recouvrement
                </label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option value="amiable">Amiable</option>
                  <option value="judiciaire">Judiciaire</option>
                  <option value="huissier">Huissier</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Responsable
                </label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option value="marie_dupont">Marie Dupont</option>
                  <option value="jean_martin">Jean Martin</option>
                  <option value="sophie_bernard">Sophie Bernard</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commentaire initial
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20"
                  placeholder="Décrivez la situation..."
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800 font-medium">
                  {selectedFactures.size} facture{selectedFactures.size > 1 ? 's' : ''} sélectionnée{selectedFactures.size > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Ces factures seront basculées en recouvrement
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateDossierModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  // Ici on implémenterait la logique de création du dossier
                  toast.success('Dossier de recouvrement créé avec succès !');
                  setShowCreateDossierModal(false);
                  setSelectedFactures(new Set());
                  // Basculer les factures sélectionnées vers l'onglet dossiers
                  setActiveTab('dossiers');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Créer le Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de détail de la dernière action */}
      {showDossierActionModal && selectedDossierAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Dernière Action - {selectedDossierAction.numeroRef}
              </h3>
              <button
                onClick={() => setShowDossierActionModal(false)}
                className="text-gray-700 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center space-x-2 mb-2">
                  {(() => {
                    const IconComponent = getActionIcon(selectedDossierAction.typeAction);
                    return <IconComponent className="w-5 h-5 text-blue-600" />;
                  })()}
                  <span className="font-medium text-gray-900">
                    {selectedDossierAction.typeAction.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-2">
                  {selectedDossierAction.derniereAction}
                </p>
                <p className="text-xs text-gray-700">
                  Date: {formatDate(selectedDossierAction.dateAction)}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Informations du dossier</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Client:</span>
                    <p className="font-medium">{selectedDossierAction.client}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Responsable:</span>
                    <p className="font-medium">{selectedDossierAction.responsable}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Montant total:</span>
                    <p className="font-medium">{formatCurrency(selectedDossierAction.montantTotal)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Statut:</span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatutColor(selectedDossierAction.statut)}`}>
                      {getStatutLabel(selectedDossierAction.statut)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Prochaine étape</h4>
                <p className="text-sm text-blue-800">{selectedDossierAction.prochainEtape}</p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowDossierActionModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Fermer
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Nouvelle Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de résumé du dossier */}
      {showDossierSummary && selectedDossierSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Résumé du Dossier {selectedDossierSummary.numeroRef}
              </h3>
              <button
                onClick={() => setShowDossierSummary(false)}
                className="text-gray-700 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Informations client */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 pb-2 border-b">Informations Client</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Client:</span>
                    <span className="font-medium">{selectedDossierSummary.client}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Responsable:</span>
                    <span className="font-medium">{selectedDossierSummary.responsable}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium capitalize">{selectedDossierSummary.typeRecouvrement}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Statut:</span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatutColor(selectedDossierSummary.statut)}`}>
                      {getStatutLabel(selectedDossierSummary.statut)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Informations financières */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 pb-2 border-b">Informations Financières</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Montant total:</span>
                    <span className="font-bold text-lg">{formatCurrency(selectedDossierSummary.montantTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Montant payé:</span>
                    <span className="font-medium text-green-600">{formatCurrency(selectedDossierSummary.montantPaye)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Restant à recouvrer:</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(selectedDossierSummary.montantTotal - selectedDossierSummary.montantPaye)}
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-700 mb-1">
                      <span>Progression du recouvrement</span>
                      <span>{((selectedDossierSummary.montantPaye / selectedDossierSummary.montantTotal) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${(selectedDossierSummary.montantPaye / selectedDossierSummary.montantTotal) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Détails supplémentaires */}
            <div className="mt-6 space-y-4">
              <h4 className="font-medium text-gray-900 pb-2 border-b">Détails du Dossier</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Date d'ouverture:</span>
                  <p className="font-medium">{formatDate(selectedDossierSummary.dateOuverture)}</p>
                </div>
                <div>
                  <span className="text-gray-600">Nombre de factures:</span>
                  <p className="font-medium">{selectedDossierSummary.nombreFactures}</p>
                </div>
                <div>
                  <span className="text-gray-600">DSO moyen:</span>
                  <p className={`font-medium ${selectedDossierSummary.dsoMoyen > 60 ? 'text-red-600' : selectedDossierSummary.dsoMoyen > 30 ? 'text-orange-600' : 'text-green-600'}`}>
                    {selectedDossierSummary.dsoMoyen} jours
                  </p>
                </div>
              </div>
            </div>

            {/* Dernière action */}
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 pb-2 border-b">Dernière Action</h4>
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  {(() => {
                    const IconComponent = getActionIcon(selectedDossierSummary.typeAction);
                    return <IconComponent className="w-4 h-4 text-blue-600" />;
                  })()}
                  <span className="font-medium text-sm">{selectedDossierSummary.typeAction.replace('_', ' ')}</span>
                  <span className="text-xs text-gray-700">{formatDate(selectedDossierSummary.dateAction)}</span>
                </div>
                <p className="text-sm text-gray-700">{selectedDossierSummary.derniereAction}</p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowDossierSummary(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  setShowDossierSummary(false);
                  setSelectedDossierDetail(selectedDossierSummary);
                  setShowDossierDetail(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Modifier ce dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal with Finance Manager Validation */}
      {showTransferModal && selectedTransferDossier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-[#171717]">
                  Transfert vers le Contentieux
                </h2>
                <button
                  onClick={() => {
                    setShowTransferModal(false);
                    setSelectedTransferDossier(null);
                    setTransferDetails({
                      destinataire: '',
                      motif: '',
                      notes: '',
                      validationStatus: 'pending'
                    });
                  }}
                  className="text-gray-700 hover:text-gray-600 text-xl"
                >
                  ×
                </button>
              </div>

              {/* Informations du dossier */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold text-[#171717] mb-3">Dossier à transférer</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Référence</label>
                    <p className="text-[#171717] font-semibold">{selectedTransferDossier.numeroRef}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Client</label>
                    <p className="text-[#171717]">{selectedTransferDossier.client}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Montant Total</label>
                    <p className="text-[#171717] font-semibold">{formatCurrency(selectedTransferDossier.montantTotal)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Responsable actuel</label>
                    <p className="text-[#171717]">{selectedTransferDossier.responsable}</p>
                  </div>
                </div>
              </div>

              {/* Formulaire de transfert */}
              {transferDetails.validationStatus === 'pending' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service de destination <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={transferDetails.destinataire}
                      onChange={(e) => setTransferDetails({ ...transferDetails, destinataire: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionner le service</option>
                      <option value="contentieux">Service Contentieux - Maître KONE (Avocat)</option>
                      <option value="huissier">Huissier de Justice - Maître DIALLO</option>
                      <option value="juridique">Service Juridique Interne</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Motif du transfert au contentieux <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={transferDetails.motif}
                      onChange={(e) => setTransferDetails({ ...transferDetails, motif: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionner un motif</option>
                      <option value="echec_amiable">Échec du recouvrement amiable</option>
                      <option value="delai_depasse">Délai de recouvrement dépassé (90 jours)</option>
                      <option value="mauvaise_foi">Mauvaise foi manifeste du débiteur</option>
                      <option value="montant_important">Montant important nécessitant action judiciaire</option>
                      <option value="client_insolvable">Client potentiellement insolvable</option>
                      <option value="litige_commercial">Litige commercial nécessitant arbitrage</option>
                      <option value="autre">Autre motif</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes complémentaires
                    </label>
                    <textarea
                      value={transferDetails.notes}
                      onChange={(e) => setTransferDetails({ ...transferDetails, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Informations additionnelles sur le transfert..."
                    />
                  </div>

                  {/* Section Validation */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">Validation requise</h4>
                        <p className="text-sm text-gray-600">
                          Le transfert vers le contentieux nécessite l'approbation du Finance Manager.
                          Une fois validé, le dossier sera transmis au service juridique pour action.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      onClick={() => {
                        setShowTransferModal(false);
                        setSelectedTransferDossier(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => {
                        if (transferDetails.destinataire && transferDetails.motif) {
                          setTransferDetails({ ...transferDetails, validationStatus: 'approved' });
                        } else {
                          toast.error('Veuillez remplir tous les champs obligatoires');
                        }
                      }}
                      disabled={!transferDetails.destinataire || !transferDetails.motif}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Soumettre pour validation
                    </button>
                  </div>
                </div>
              )}

              {/* État après validation */}
              {transferDetails.validationStatus === 'approved' && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-green-900 mb-1">Transfert au contentieux validé</h4>
                        <p className="text-sm text-gray-600">
                          Le Finance Manager a approuvé le transfert du dossier {selectedTransferDossier.numeroRef} vers le contentieux.
                        </p>
                        <div className="mt-3 bg-white rounded p-3 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-700">Validé par:</span>
                            <span className="font-medium">Jean-Paul KOUAME (Finance Manager)</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-700">Date de validation:</span>
                            <span className="font-medium">{new Date().toLocaleDateString('fr-FR')}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-700">Service de destination:</span>
                            <span className="font-medium">
                              {transferDetails.destinataire === 'contentieux' ? 'Service Contentieux - Maître KONE' :
                               transferDetails.destinataire === 'huissier' ? 'Huissier de Justice - Maître DIALLO' :
                               transferDetails.destinataire === 'juridique' ? 'Service Juridique Interne' : ''}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-700">Type de procédure:</span>
                            <span className="font-medium">Recouvrement judiciaire</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        toast.success(`Dossier ${selectedTransferDossier.numeroRef} transféré avec succès`);
                        setShowTransferModal(false);
                        setSelectedTransferDossier(null);
                        setTransferDetails({
                          destinataire: '',
                          motif: '',
                          notes: '',
                          validationStatus: 'pending'
                        });
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Confirmer le transfert
                    </button>
                  </div>
                </div>
              )}

              {/* État si rejeté */}
              {transferDetails.validationStatus === 'rejected' && (
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-red-900 mb-1">Transfert refusé</h4>
                        <p className="text-sm text-gray-600">
                          Le Finance Manager a refusé le transfert du dossier.
                        </p>
                        <div className="mt-3 bg-white rounded p-3">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Motif du refus:</span> Le dossier doit rester avec l'agent actuel jusqu'à la fin du mois.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setShowTransferModal(false);
                        setSelectedTransferDossier(null);
                        setTransferDetails({
                          destinataire: '',
                          motif: '',
                          notes: '',
                          validationStatus: 'pending'
                        });
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modales de Rapports */}
      {/* Modal Rapport Mensuel Consolidé */}
      {showRapportMensuelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-[#171717] flex items-center">
                  <FileText className="w-6 h-6 mr-2 text-blue-600" />
                  Rapport Mensuel Consolidé
                </h2>
                <button
                  onClick={() => setShowRapportMensuelModal(false)}
                  className="text-gray-700 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Période de rapport */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-3">Paramètres du Rapport</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-2">Période</label>
                      <select className="w-full border border-blue-300 rounded-lg px-3 py-2">
                        <option>Janvier 2024</option>
                        <option>Décembre 2023</option>
                        <option>Novembre 2023</option>
                        <option>Personnalisé...</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-2">Périmètre</label>
                      <select className="w-full border border-blue-300 rounded-lg px-3 py-2">
                        <option>Amiable + Contentieux</option>
                        <option>Amiable uniquement</option>
                        <option>Contentieux uniquement</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-2">Format</label>
                      <select className="w-full border border-blue-300 rounded-lg px-3 py-2">
                        <option>PDF Détaillé</option>
                        <option>Excel avec données</option>
                        <option>PowerPoint exécutif</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Aperçu des sections */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-[#171717]">Sections du rapport</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Résumé exécutif</span>
                        <input type="checkbox" defaultChecked className="rounded" />
                      </div>
                      <p className="text-sm text-gray-600">KPIs clés, tendances, alertes</p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Performance amiable</span>
                        <input type="checkbox" defaultChecked className="rounded" />
                      </div>
                      <p className="text-sm text-gray-600">Taux de succès, délais, actions</p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Contentieux en cours</span>
                        <input type="checkbox" defaultChecked className="rounded" />
                      </div>
                      <p className="text-sm text-gray-600">Procédures, coûts, résultats</p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Analyse financière</span>
                        <input type="checkbox" defaultChecked className="rounded" />
                      </div>
                      <p className="text-sm text-gray-600">ROI, provisions, cash impact</p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Recommandations</span>
                        <input type="checkbox" defaultChecked className="rounded" />
                      </div>
                      <p className="text-sm text-gray-600">Actions prioritaires, optimisations</p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Annexes détaillées</span>
                        <input type="checkbox" className="rounded" />
                      </div>
                      <p className="text-sm text-gray-600">Listings, correspondances</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => setShowRapportMensuelModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                    Aperçu
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Générer le rapport
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Analyse ROI Détaillée */}
      {showAnalyseROIModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-[#171717] flex items-center">
                  <BarChart3 className="w-6 h-6 mr-2 text-green-600" />
                  Analyse ROI Détaillée
                </h2>
                <button
                  onClick={() => setShowAnalyseROIModal(false)}
                  className="text-gray-700 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Filtres */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-3">Critères d'Analyse</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-green-700 mb-2">Période</label>
                      <select className="w-full border border-green-300 rounded-lg px-3 py-2">
                        <option>12 derniers mois</option>
                        <option>6 derniers mois</option>
                        <option>Année en cours</option>
                        <option>Personnalisé</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-green-700 mb-2">Phase</label>
                      <select className="w-full border border-green-300 rounded-lg px-3 py-2">
                        <option>Toutes les phases</option>
                        <option>Amiable uniquement</option>
                        <option>Contentieux uniquement</option>
                        <option>Exécution uniquement</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-green-700 mb-2">Montant min.</label>
                      <input type="number" placeholder="0" className="w-full border border-green-300 rounded-lg px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-green-700 mb-2">Groupement</label>
                      <select className="w-full border border-green-300 rounded-lg px-3 py-2">
                        <option>Par procédure</option>
                        <option>Par agent</option>
                        <option>Par client</option>
                        <option>Par secteur</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Métriques ROI */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-[#171717] mb-2">ROI Global</h4>
                    <p className="text-lg font-bold text-green-600">3.2x</p>
                    <p className="text-sm text-gray-600">+15% vs période précédente</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-[#171717] mb-2">Coût par €1 recouvré</h4>
                    <p className="text-lg font-bold text-orange-600">0.31€</p>
                    <p className="text-sm text-gray-600">-8% vs objectif</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-[#171717] mb-2">Break-even délai</h4>
                    <p className="text-lg font-bold text-blue-600">45j</p>
                    <p className="text-sm text-gray-600">Délai d'amortissement</p>
                  </div>
                </div>

                {/* Répartition des coûts */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-[#171717] mb-4">Répartition des Coûts par Phase</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Amiable</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{width: '65%'}}></div>
                        </div>
                        <span className="text-sm text-gray-600">65% (125k€)</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Contentieux</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div className="bg-orange-500 h-2 rounded-full" style={{width: '25%'}}></div>
                        </div>
                        <span className="text-sm text-gray-600">25% (48k€)</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Exécution</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div className="bg-red-500 h-2 rounded-full" style={{width: '10%'}}></div>
                        </div>
                        <span className="text-sm text-gray-600">10% (19k€)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => setShowAnalyseROIModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                    Export Excel
                  </button>
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    Générer l'analyse
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Performance Équipes */}
      {showPerformanceEquipeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-[#171717] flex items-center">
                  <Users className="w-6 h-6 mr-2 text-orange-600" />
                  Performance des Équipes
                </h2>
                <button
                  onClick={() => setShowPerformanceEquipeModal(false)}
                  className="text-gray-700 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Tableau de bord des agents */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h3 className="font-semibold text-orange-900 mb-4">Performance Individuelle</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-orange-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-orange-700 uppercase">Agent</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-orange-700 uppercase">Dossiers</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-orange-700 uppercase">Recouvré</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-orange-700 uppercase">Taux succès</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-orange-700 uppercase">Délai moyen</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-orange-700 uppercase">Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-orange-200">
                        <tr>
                          <td className="px-4 py-3 font-medium">Marie KOUAM</td>
                          <td className="px-4 py-3 text-center">67</td>
                          <td className="px-4 py-3 text-center">1.2M€</td>
                          <td className="px-4 py-3 text-center text-green-600">89%</td>
                          <td className="px-4 py-3 text-center">32j</td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">A+</span>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-medium">Paul MBEKI</td>
                          <td className="px-4 py-3 text-center">54</td>
                          <td className="px-4 py-3 text-center">890k€</td>
                          <td className="px-4 py-3 text-center text-orange-600">76%</td>
                          <td className="px-4 py-3 text-center">45j</td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium">B</span>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-medium">Sophie NDONG</td>
                          <td className="px-4 py-3 text-center">78</td>
                          <td className="px-4 py-3 text-center">1.5M€</td>
                          <td className="px-4 py-3 text-center text-green-600">85%</td>
                          <td className="px-4 py-3 text-center">38j</td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">A</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Métriques d'équipe */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                    <h4 className="font-semibold text-[#171717] mb-2">Productivité moyenne</h4>
                    <p className="text-lg font-bold text-orange-600">66 dossiers/mois</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                    <h4 className="font-semibold text-[#171717] mb-2">Taux succès équipe</h4>
                    <p className="text-lg font-bold text-green-600">83.5%</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                    <h4 className="font-semibold text-[#171717] mb-2">Formation requise</h4>
                    <p className="text-lg font-bold text-red-600">2 agents</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                    <h4 className="font-semibold text-[#171717] mb-2">Charge de travail</h4>
                    <p className="text-lg font-bold text-blue-600">87%</p>
                  </div>
                </div>

                {/* Recommandations */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-3">Recommandations d'Amélioration</h4>
                  <div className="space-y-2">
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-1" />
                      <span className="text-sm">Formation complémentaire pour Paul MBEKI sur les négociations</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-1" />
                      <span className="text-sm">Redistribution de charge: +15 dossiers pour Marie KOUAM</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-1" />
                      <span className="text-sm">Mise en place d'objectifs individuels trimestriels</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => setShowPerformanceEquipeModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                    Export détaillé
                  </button>
                  <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                    Générer l'analyse
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Prévisions Trésorerie */}
      {showPrevisionTresorerieModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-[#171717] flex items-center">
                  <TrendingUp className="w-6 h-6 mr-2 text-purple-600" />
                  Prévisions de Trésorerie
                </h2>
                <button
                  onClick={() => setShowPrevisionTresorerieModal(false)}
                  className="text-gray-700 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Paramètres de prévision */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 mb-3">Paramètres de Prévision</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-purple-700 mb-2">Horizon</label>
                      <select className="w-full border border-purple-300 rounded-lg px-3 py-2">
                        <option>3 mois glissants</option>
                        <option>6 mois glissants</option>
                        <option>12 mois glissants</option>
                        <option>Personnalisé</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-purple-700 mb-2">Scénario</label>
                      <select className="w-full border border-purple-300 rounded-lg px-3 py-2">
                        <option>Réaliste (base historique)</option>
                        <option>Optimiste (+20%)</option>
                        <option>Pessimiste (-15%)</option>
                        <option>Conservateur</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-purple-700 mb-2">Granularité</label>
                      <select className="w-full border border-purple-300 rounded-lg px-3 py-2">
                        <option>Mensuelle</option>
                        <option>Hebdomadaire</option>
                        <option>Quotidienne</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Prévisions consolidées */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-[#171717] mb-2">Mois +1</h4>
                    <p className="text-lg font-bold text-green-600">2.1M€</p>
                    <p className="text-sm text-gray-600">Encaissements prévus</p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs">
                        <span>Amiable: 1.4M€</span>
                        <span>Contentieux: 0.7M€</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-[#171717] mb-2">Mois +2</h4>
                    <p className="text-lg font-bold text-blue-600">1.8M€</p>
                    <p className="text-sm text-gray-600">Encaissements prévus</p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs">
                        <span>Amiable: 1.2M€</span>
                        <span>Contentieux: 0.6M€</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-[#171717] mb-2">Mois +3</h4>
                    <p className="text-lg font-bold text-orange-600">1.5M€</p>
                    <p className="text-sm text-gray-600">Encaissements prévus</p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs">
                        <span>Amiable: 0.9M€</span>
                        <span>Contentieux: 0.6M€</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Facteurs d'impact */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-900 mb-3">Facteurs d'Impact sur les Prévisions</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Saisonnalité (été)</span>
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">-12%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Nouvelles procédures</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">+8%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Contexte économique</span>
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">-5%</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => setShowPrevisionTresorerieModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                    Export vers Finance
                  </button>
                  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                    Générer les prévisions
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dossiers à Risque */}
      {showDossiersRisqueModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-[#171717] flex items-center">
                  <AlertTriangle className="w-6 h-6 mr-2 text-red-600" />
                  Dossiers à Risque & Alertes
                </h2>
                <button
                  onClick={() => setShowDossiersRisqueModal(false)}
                  className="text-gray-700 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Alertes critiques */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-900 mb-3 flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Alertes Critiques (Action Immédiate)
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-white p-3 rounded border border-red-200">
                      <div>
                        <p className="font-medium text-red-900">CAMEROUN INDUSTRIES</p>
                        <p className="text-sm text-red-700">125k€ - 40j de retard - Pas de réponse depuis 15j</p>
                      </div>
                      <div className="flex space-x-2">
                        <button className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">
                          Escalader
                        </button>
                        <button className="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700">
                          Contentieux
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-white p-3 rounded border border-red-200">
                      <div>
                        <p className="font-medium text-red-900">SARL TOGO TRADING</p>
                        <p className="text-sm text-red-700">89k€ - Entreprise en liquidation judiciaire</p>
                      </div>
                      <div className="flex space-x-2">
                        <button className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">
                          Déclaration
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dossiers surveillés */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h3 className="font-semibold text-orange-900 mb-3">Dossiers Sous Surveillance</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-orange-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-orange-700 uppercase">Client</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-orange-700 uppercase">Montant</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-orange-700 uppercase">Retard</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-orange-700 uppercase">Risque</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-orange-700 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-orange-200">
                        <tr>
                          <td className="px-4 py-3 font-medium">BURKINA LOGISTICS</td>
                          <td className="px-4 py-3 text-center">67k€</td>
                          <td className="px-4 py-3 text-center">25j</td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">Moyen</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button className="text-orange-600 hover:text-orange-800 text-xs">Relancer</button>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-medium">GUINÉE IMPORT</td>
                          <td className="px-4 py-3 text-center">43k€</td>
                          <td className="px-4 py-3 text-center">18j</td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">Faible</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button className="text-orange-600 hover:text-orange-800 text-xs">Suivre</button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recommandations */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-3">Recommandations d'Actions</h4>
                  <div className="space-y-2">
                    <div className="flex items-start space-x-2">
                      <span className="bg-red-500 w-2 h-2 rounded-full mt-2"></span>
                      <span className="text-sm">Passer CAMEROUN INDUSTRIES en contentieux sous 48h</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="bg-orange-500 w-2 h-2 rounded-full mt-2"></span>
                      <span className="text-sm">Renforcer le suivi de BURKINA LOGISTICS (contact quotidien)</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="bg-yellow-500 w-2 h-2 rounded-full mt-2"></span>
                      <span className="text-sm">Réviser les conditions de paiement pour les nouveaux clients à risque</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => setShowDossiersRisqueModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                    Export liste
                  </button>
                  <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                    Générer les alertes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Export Personnalisé */}
      {showExportPersonnaliseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-[#171717] flex items-center">
                  <Download className="w-6 h-6 mr-2 text-gray-600" />
                  Export Personnalisé
                </h2>
                <button
                  onClick={() => setShowExportPersonnaliseModal(false)}
                  className="text-gray-700 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Sélection du format */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-[#171717] mb-3">Format d'Export</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className="flex items-center space-x-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="format" value="excel" defaultChecked className="text-blue-600" />
                      <div>
                        <p className="font-medium">Excel (.xlsx)</p>
                        <p className="text-sm text-gray-600">Données brutes + graphiques</p>
                      </div>
                    </label>
                    <label className="flex items-center space-x-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="format" value="pdf" className="text-blue-600" />
                      <div>
                        <p className="font-medium">PDF</p>
                        <p className="text-sm text-gray-600">Rapport mis en forme</p>
                      </div>
                    </label>
                    <label className="flex items-center space-x-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="format" value="csv" className="text-blue-600" />
                      <div>
                        <p className="font-medium">CSV</p>
                        <p className="text-sm text-gray-600">Données uniquement</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Sélection des données */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-[#171717] mb-3">Données à Exporter</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">Tables principales</h4>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span className="text-sm">Créances (liste complète)</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span className="text-sm">Dossiers contentieux</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">Historique des relances</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">Correspondances</span>
                      </label>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">Métriques & KPIs</h4>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span className="text-sm">Performance par agent</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span className="text-sm">Analyse ROI</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">Évolution temporelle</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">Prévisions</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Filtres */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-[#171717] mb-3">Filtres</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Période</label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                        <option>Année en cours</option>
                        <option>12 derniers mois</option>
                        <option>Mois en cours</option>
                        <option>Personnalisé</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                        <option>Tous</option>
                        <option>En cours uniquement</option>
                        <option>Résolus uniquement</option>
                        <option>Contentieux</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Montant min.</label>
                      <input type="number" placeholder="0" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Agent</label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                        <option>Tous les agents</option>
                        <option>Marie KOUAM</option>
                        <option>Paul MBEKI</option>
                        <option>Sophie NDONG</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => setShowExportPersonnaliseModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                    Prévisualiser
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Exporter
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Détail Plan de Remboursement */}
      {showPlanDetailModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-[#171717]">
                  Détail Plan de Remboursement - {selectedPlan.reference}
                </h2>
                <p className="text-gray-600 mt-1">Client: {selectedPlan.client}</p>
              </div>
              <button
                onClick={() => setShowPlanDetailModal(false)}
                className="text-gray-700 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Informations générales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-[#171717] mb-3">Informations du Plan</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Référence:</span>
                      <span className="font-medium">{selectedPlan.reference}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Montant total:</span>
                      <span className="font-medium text-[#171717]">{selectedPlan.montantTotal.toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mensualité:</span>
                      <span className="font-medium">{selectedPlan.mensualite.toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Durée:</span>
                      <span className="font-medium">{Math.round(selectedPlan.montantTotal / selectedPlan.mensualite)} mois</span>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-semibold text-[#171717] mb-3">Progression</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Échéances payées:</span>
                      <span className="font-medium text-green-600">{selectedPlan.echeancesPayees}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Montant payé:</span>
                      <span className="font-medium text-green-600">{selectedPlan.montantPaye.toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Montant restant:</span>
                      <span className="font-medium text-orange-600">{selectedPlan.montantRestant.toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Progression:</span>
                      <span className="font-medium">{Math.round((selectedPlan.montantPaye / selectedPlan.montantTotal) * 100)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Échéancier */}
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h3 className="font-semibold text-[#171717]">Échéancier</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Échéance</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date limite</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Montant</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date paiement</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Array.from({ length: Math.round(selectedPlan.montantTotal / selectedPlan.mensualite) }, (_, i) => {
                        const echeanceDate = new Date();
                        echeanceDate.setMonth(echeanceDate.getMonth() + i);
                        const isPaid = i < selectedPlan.echeancesPayees;
                        const isCurrentMonth = i === selectedPlan.echeancesPayees;

                        return (
                          <tr key={i} className={isCurrentMonth ? 'bg-yellow-50' : ''}>
                            <td className="px-4 py-3 text-sm">Échéance {i + 1}</td>
                            <td className="px-4 py-3 text-sm">{echeanceDate.toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-sm font-medium">{selectedPlan.mensualite.toLocaleString()} FCFA</td>
                            <td className="px-4 py-3 text-sm">
                              {isPaid ? new Date(Date.now() - (selectedPlan.echeancesPayees - i) * 30 * 24 * 60 * 60 * 1000).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                isPaid ? 'bg-green-100 text-green-800' :
                                isCurrentMonth ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {isPaid ? 'Payé' : isCurrentMonth ? 'En cours' : 'À venir'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setShowPlanDetailModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Fermer
                </button>
                <button
                  onClick={() => {
                    setShowPlanDetailModal(false);
                    setShowEnregistrerPaiementModal(true);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Enregistrer paiement
                </button>
                <button
                  onClick={() => {
                    setShowPlanDetailModal(false);
                    setShowRelancePlanModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Envoyer relance
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Enregistrer Paiement */}
      {showEnregistrerPaiementModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-[#171717]">
                  Enregistrer un Paiement
                </h2>
                <p className="text-gray-600 mt-1">Plan: {selectedPlan.reference} - {selectedPlan.client}</p>
              </div>
              <button
                onClick={() => setShowEnregistrerPaiementModal(false)}
                className="text-gray-700 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Informations du plan */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-[#171717] mb-3">Informations du Plan</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Montant total:</span>
                    <div className="font-medium">{selectedPlan.montantTotal.toLocaleString()} FCFA</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Montant restant:</span>
                    <div className="font-medium text-orange-600">{selectedPlan.montantRestant.toLocaleString()} FCFA</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Mensualité:</span>
                    <div className="font-medium">{selectedPlan.mensualite.toLocaleString()} FCFA</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Prochaine échéance:</span>
                    <div className="font-medium">{new Date(selectedPlan.prochaineEcheance).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>

              {/* Formulaire de paiement */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date du paiement *
                    </label>
                    <input
                      type="date"
                      defaultValue={new Date().toISOString().split('T')[0]}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Montant payé (FCFA) *
                    </label>
                    <input
                      type="number"
                      placeholder={selectedPlan.mensualite.toString()}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      min="0"
                      max={selectedPlan.montantRestant}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mode de paiement *
                    </label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2" required>
                      <option value="">Sélectionner...</option>
                      <option value="virement">Virement bancaire</option>
                      <option value="cheque">Chèque</option>
                      <option value="especes">Espèces</option>
                      <option value="mobile">Mobile Money</option>
                      <option value="carte">Carte bancaire</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Référence de transaction
                    </label>
                    <input
                      type="text"
                      placeholder="Numéro de référence..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes / Observations
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Commentaires sur ce paiement..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                {/* Options avancées */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Options</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Envoyer accusé de réception au client</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Appliquer automatiquement aux prochaines échéances si surplus</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Mettre à jour le solde comptable immédiatement</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setShowEnregistrerPaiementModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                  Prévisualiser
                </button>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  Enregistrer le paiement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Relance Plan */}
      {showRelancePlanModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-[#171717]">
                  Relance Plan de Remboursement
                </h2>
                <p className="text-gray-600 mt-1">Plan: {selectedPlan.reference} - {selectedPlan.client}</p>
              </div>
              <button
                onClick={() => setShowRelancePlanModal(false)}
                className="text-gray-700 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Situation actuelle */}
              <div className="bg-orange-50 rounded-lg p-4">
                <h3 className="font-semibold text-[#171717] mb-3">Situation du Plan</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Statut actuel:</span>
                    <div className={`font-medium ${
                      selectedPlan.statut === 'Respecté' ? 'text-green-600' :
                      selectedPlan.statut === 'En retard' ? 'text-red-600' :
                      'text-orange-600'
                    }`}>
                      {selectedPlan.statut}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Prochaine échéance:</span>
                    <div className="font-medium">{new Date(selectedPlan.prochaineEcheance).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Montant attendu:</span>
                    <div className="font-medium">{selectedPlan.mensualite.toLocaleString()} FCFA</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Retard:</span>
                    <div className="font-medium text-red-600">
                      {selectedPlan.statut === 'En retard'
                        ? `${Math.ceil((new Date().getTime() - new Date(selectedPlan.prochaineEcheance).getTime()) / (1000 * 60 * 60 * 24))} jours`
                        : 'Aucun'
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* Type de relance */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Type de relance *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input type="radio" name="typeRelance" value="email" className="mr-3" defaultChecked />
                    <div>
                      <div className="font-medium">Email</div>
                      <div className="text-xs text-gray-700">Notification électronique</div>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input type="radio" name="typeRelance" value="sms" className="mr-3" />
                    <div>
                      <div className="font-medium">SMS</div>
                      <div className="text-xs text-gray-700">Message texte</div>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input type="radio" name="typeRelance" value="courrier" className="mr-3" />
                    <div>
                      <div className="font-medium">Courrier</div>
                      <div className="text-xs text-gray-700">Lettre recommandée</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Template de message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modèle de message
                </label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3">
                  <option value="rappel_gentil">Rappel gentil - Échéance proche</option>
                  <option value="rappel_ferme">Rappel ferme - Retard de paiement</option>
                  <option value="mise_en_demeure">Mise en demeure - Rupture de plan</option>
                  <option value="personnalise">Message personnalisé</option>
                </select>

                <textarea
                  rows={6}
                  defaultValue={`Madame, Monsieur ${selectedPlan.client},

Nous vous rappelons que votre plan de remboursement ${selectedPlan.reference} prévoit une échéance de ${selectedPlan.mensualite.toLocaleString()} FCFA pour le ${new Date(selectedPlan.prochaineEcheance).toLocaleDateString()}.

${selectedPlan.statut === 'En retard' ?
  `Nous constatons un retard de paiement. Nous vous remercions de bien vouloir régulariser votre situation dans les plus brefs délais.` :
  `Cette échéance arrive prochainement. Nous vous remercions de bien vouloir honorer ce paiement dans les délais convenus.`
}

En cas de difficulté, n'hésitez pas à nous contacter pour étudier ensemble une solution adaptée.

Cordialement,
L'équipe recouvrement`}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              {/* Options */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Options de relance</h4>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span className="text-sm">Programmer un suivi automatique dans 7 jours</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">Copier le responsable commercial</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">Enregistrer dans l'historique contentieux</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setShowRelancePlanModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                  Prévisualiser
                </button>
                <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                  Envoyer la relance
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Nouvelle Action */}
      {showActionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-[#171717]">
                  Nouvelle Action de Recouvrement
                </h2>
                {selectedCreance && (
                  <p className="text-gray-600 mt-1">
                    Client: {selectedCreance.client} - {formatCurrency(selectedCreance.montantTotal)}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setActionFormData({
                    typeAction: 'APPEL',
                    date: new Date().toISOString().split('T')[0],
                    heure: new Date().toTimeString().slice(0, 5),
                    responsable: '',
                    details: '',
                    montantPromis: '',
                    datePromesse: ''
                  });
                }}
                className="text-gray-700 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Type d'action */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Type d'action *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { value: 'APPEL', label: 'Appel téléphonique', icon: Phone },
                    { value: 'EMAIL', label: 'Email', icon: Mail },
                    { value: 'COURRIER', label: 'Courrier', icon: FileText },
                    { value: 'SMS', label: 'SMS', icon: MessageSquare },
                    { value: 'VISITE', label: 'Visite', icon: UserCheck },
                    { value: 'MISE_EN_DEMEURE', label: 'Mise en demeure', icon: AlertTriangle }
                  ].map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setActionFormData({ ...actionFormData, typeAction: type.value as ActionTypeRecouvrement })}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          actionFormData.typeAction === type.value
                            ? 'border-orange-600 bg-orange-50 text-orange-900'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className={`w-5 h-5 mx-auto mb-1 ${
                          actionFormData.typeAction === type.value ? 'text-orange-600' : 'text-gray-700'
                        }`} />
                        <div className="text-xs font-medium">{type.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date et heure */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={actionFormData.date}
                    onChange={(e) => setActionFormData({ ...actionFormData, date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Heure
                  </label>
                  <input
                    type="time"
                    value={actionFormData.heure}
                    onChange={(e) => setActionFormData({ ...actionFormData, heure: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Responsable */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Responsable *
                </label>
                <select
                  value={actionFormData.responsable}
                  onChange={(e) => setActionFormData({ ...actionFormData, responsable: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Sélectionner un responsable...</option>
                  <option value="Jean Dupont">Jean Dupont</option>
                  <option value="Marie Martin">Marie Martin</option>
                  <option value="Pierre Bernard">Pierre Bernard</option>
                  <option value="Sophie Dubois">Sophie Dubois</option>
                  <option value="Luc Moreau">Luc Moreau</option>
                </select>
              </div>

              {/* Détails / Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Détails / Notes *
                </label>
                <textarea
                  rows={4}
                  value={actionFormData.details}
                  onChange={(e) => setActionFormData({ ...actionFormData, details: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Décrivez l'action prévue ou effectuée..."
                />
              </div>

              {/* Montant promis (optionnel) */}
              <div className="bg-blue-50 rounded-lg p-4 space-y-4">
                <h4 className="font-medium text-gray-900">Engagement de paiement (optionnel)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Montant promis (FCFA)
                    </label>
                    <input
                      type="number"
                      value={actionFormData.montantPromis}
                      onChange={(e) => setActionFormData({ ...actionFormData, montantPromis: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date de promesse
                    </label>
                    <input
                      type="date"
                      value={actionFormData.datePromesse}
                      onChange={(e) => setActionFormData({ ...actionFormData, datePromesse: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Options supplémentaires */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Options</h4>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span className="text-sm">Programmer un suivi automatique dans 7 jours</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">Notifier le responsable commercial</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">Envoyer un email de confirmation au client</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setActionFormData({
                    typeAction: 'APPEL',
                    date: new Date().toISOString().split('T')[0],
                    heure: new Date().toTimeString().slice(0, 5),
                    responsable: '',
                    details: '',
                    montantPromis: '',
                    datePromesse: ''
                  });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  // Action créée avec les données suivantes:
                  const actionData = {
                    creance: selectedCreance,
                    ...actionFormData
                  };
                  setShowActionModal(false);
                  setActionFormData({
                    typeAction: 'APPEL',
                    date: new Date().toISOString().split('T')[0],
                    heure: new Date().toTimeString().slice(0, 5),
                    responsable: '',
                    details: '',
                    montantPromis: '',
                    datePromesse: ''
                  });
                }}
                disabled={!actionFormData.date || !actionFormData.responsable || !actionFormData.details}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Enregistrer l'action</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Contentieux Modal */}
      {false && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            {/* Sticky header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-red-100 text-red-600 p-2 rounded-lg">
                  <Gavel className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Transfert Contentieux</h2>
              </div>
              <button
                onClick={() => {
                  setShowTransferContentieuxModal(false);
                  resetForm();
                }}
                className="text-gray-700 hover:text-gray-700"
                disabled={isSubmitting}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {/* Info alert */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-red-900 mb-1">Transfert vers Contentieux</h4>
                      <p className="text-sm text-red-800">Basculez un dossier de recouvrement vers une procédure judiciaire ou contentieuse.</p>
                    </div>
                  </div>
                </div>

                {/* Créances Selection */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Sélection des Créances *</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Créances à transférer (UUID) *</label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="creance1"
                            className="rounded border-gray-300 text-red-500"
                            onChange={(e) => {
                              const creanceId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
                              if (e.target.checked) {
                                handleInputChange('creance_ids', [...formData.creance_ids, creanceId]);
                              } else {
                                handleInputChange('creance_ids', formData.creance_ids.filter(id => id !== creanceId));
                              }
                            }}
                            disabled={isSubmitting}
                          />
                          <label htmlFor="creance1" className="text-sm text-gray-700">SARL CONGO BUSINESS - 2,500,000 FCFA</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="creance2"
                            className="rounded border-gray-300 text-red-500"
                            onChange={(e) => {
                              const creanceId = 'f47ac10b-58cc-4372-a567-0e02b2c3d480';
                              if (e.target.checked) {
                                handleInputChange('creance_ids', [...formData.creance_ids, creanceId]);
                              } else {
                                handleInputChange('creance_ids', formData.creance_ids.filter(id => id !== creanceId));
                              }
                            }}
                            disabled={isSubmitting}
                          />
                          <label htmlFor="creance2" className="text-sm text-gray-700">CEMAC SUPPLIES - 1,800,000 FCFA</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="creance3"
                            className="rounded border-gray-300 text-red-500"
                            onChange={(e) => {
                              const creanceId = 'f47ac10b-58cc-4372-a567-0e02b2c3d481';
                              if (e.target.checked) {
                                handleInputChange('creance_ids', [...formData.creance_ids, creanceId]);
                              } else {
                                handleInputChange('creance_ids', formData.creance_ids.filter(id => id !== creanceId));
                              }
                            }}
                            disabled={isSubmitting}
                          />
                          <label htmlFor="creance3" className="text-sm text-gray-700">AFRICA TRADE - 3,200,000 FCFA</label>
                        </div>
                      </div>
                      {errors.creance_ids && (
                        <p className="mt-1 text-sm text-red-600">{errors.creance_ids}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Transfer Details */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Détails du Transfert</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Service de recouvrement *</label>
                      <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        value={formData.service_recouvrement}
                        onChange={(e) => handleInputChange('service_recouvrement', e.target.value)}
                        disabled={isSubmitting}
                      >
                        <option value="">-- Sélectionner le service --</option>
                        <option value="huissier">Huissier de Justice</option>
                        <option value="avocat">Cabinet d'Avocat</option>
                        <option value="contentieux">Service Contentieux</option>
                        <option value="tribunal">Tribunal de Commerce</option>
                      </select>
                      {errors.service_recouvrement && (
                        <p className="mt-1 text-sm text-red-600">{errors.service_recouvrement}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date de transfert *</label>
                      <input
                        type="date"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        value={formData.date_transfert}
                        onChange={(e) => handleInputChange('date_transfert', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.date_transfert && (
                        <p className="mt-1 text-sm text-red-600">{errors.date_transfert}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Montant de provision (optionnel)</label>
                      <input
                        type="number"
                        min="0"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Montant en FCFA"
                        value={formData.provision_montant}
                        onChange={(e) => handleInputChange('provision_montant', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.provision_montant && (
                        <p className="mt-1 text-sm text-red-600">{errors.provision_montant}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Documents (optionnel)</label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Noms des documents (séparés par des virgules)"
                        value={formData.documents.join(', ')}
                        onChange={(e) => handleInputChange('documents', e.target.value.split(',').map(doc => doc.trim()).filter(doc => doc))}
                        disabled={isSubmitting}
                      />
                      {errors.documents && (
                        <p className="mt-1 text-sm text-red-600">{errors.documents}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Motif */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Motif du Transfert *</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Motif détaillé (min. 10 caractères) *</label>
                    <textarea
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                      rows={4}
                      placeholder="Décrivez les raisons du transfert vers le contentieux (échec du recouvrement amiable, client insolvable, contestation, etc.)"
                      value={formData.motif}
                      onChange={(e) => handleInputChange('motif', e.target.value)}
                      disabled={isSubmitting}
                      minLength={10}
                    />
                    {errors.motif && (
                      <p className="mt-1 text-sm text-red-600">{errors.motif}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-700">{formData.motif.length}/500 caractères</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowTransferContentieuxModal(false);
                  resetForm();
                }}
                disabled={isSubmitting}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Création...</span>
                  </>
                ) : (
                  <>
                    <Gavel className="w-4 h-4" />
                    <span>{t('actions.create')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default RecouvrementModule;