import React, { useState, useEffect, useMemo } from 'react';
import PageHeaderActions from '../../components/ui/PageHeaderActions';
import { formatCurrency } from '../../utils/formatters';
import { buildPieceNumbers, pieceNumberOf } from '../../utils/pieceNumber';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import { useAccountNames } from '../../hooks/useAccountNames';
import { generateNextCode, loadMappings } from '../../services/auxiliaryCode/auxiliaryCodeService';
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';
import ExportMenu from '../../components/shared/ExportMenu';
import {
  Search, Plus, Filter, Upload, Eye, Edit, Trash2, X, Save,
  Building, TrendingUp, AlertTriangle, CheckCircle, Clock,
  Euro, Calendar, FileText, Mail, Phone, MapPin, CreditCard,
  Package, Truck, ShieldCheck, AlertCircle, BarChart3, PieChart,
  DollarSign, Users, Target, Activity, TrendingDown, ShoppingBag,
  Wallet, RefreshCw, ChevronUp, ChevronDown, Info, Database,
  Globe, Shield, Zap, Timer, BookOpen, AlertOctagon, Award,
  Receipt, Printer
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart as RechartsPieChart, Pie, Cell, LineChart, Line, ResponsiveContainer,
  AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

interface Fournisseur {
  id: string;
  code: string;
  raisonSociale: string;
  nomCommercial?: string;
  categorie: 'STRATEGIQUE' | 'RECURRENT' | 'PONCTUEL' | 'CRITIQUE';
  typeDépense: 'PRODUCTION' | 'SERVICES' | 'INVESTISSEMENT' | 'FRAIS_GENERAUX';
  pays: string;
  secteurActivite: string;

  // Données financières
  volumeAchats: number;
  encoursActuel: number;
  dpo: number; // Days Payable Outstanding
  limiteCredit: number;

  // Conditions commerciales
  delaiPaiement: number;
  escompte?: number;
  modeReglement: 'VIREMENT' | 'CHEQUE' | 'PRELEVEMENT' | 'TRAITE';
  devise: string;

  // Évaluation
  scoreQualite: number;
  respectDelais: number;
  notationInterne: 'A' | 'B' | 'C' | 'D';
  conformite: boolean;

  // Contact
  contactComptable: string;
  emailComptable: string;
  telephoneComptable: string;

  // Statut
  statut: 'ACTIF' | 'BLOQUE' | 'SUSPENDU' | 'INACTIF';
  derniereFacture?: string;
  prochainPaiement?: string;
  alertes: number;

  // Balance âgée (dettes fournisseurs)
  nonEchu: number;
  echu0_30: number;
  echu31_60: number;
  echu61_90: number;
  echuPlus90: number;
}

// Interface Balance Âgée Fournisseurs
interface BalanceAgeeFournisseurItem {
  fournisseurId: string;
  fournisseurCode: string;
  fournisseurNom: string;
  totalDettes: number;
  nonEchu: number;
  echu0_30: number;
  echu31_60: number;
  echu61_90: number;
  echuPlus90: number;
  provision: number;
}

const FournisseursModule: React.FC = () => {
  const { t } = useLanguage();
  const { adapter } = useData();
  const { format: fmtAccount } = useAccountNames();
  const [isLoading, setIsLoading] = useState(true);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [activeTab, setActiveTab] = useState('liste');
  const [analyticsSubTab, setAnalyticsSubTab] = useState<string>('kpis');
  const [balanceAgeeSubTab, setBalanceAgeeSubTab] = useState<'repartition' | 'detail' | 'risques'>('repartition');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatut, setSelectedStatut] = useState<string>('all');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [selectedFournisseurs, setSelectedFournisseurs] = useState<string[]>([]);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    period: 'month' as 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
  });
  const [compareMode, setCompareMode] = useState(false);
  const [showNewFournisseurModal, setShowNewFournisseurModal] = useState(false);
  const [editingFournisseur, setEditingFournisseur] = useState<Fournisseur | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null); // édition via l'assistant 4 étapes
  // Fiche fournisseur en consultation (bouton œil) + écritures par fournisseur.
  const [viewingFournisseur, setViewingFournisseur] = useState<Fournisseur | null>(null);
  const [fournisseurLinesMap, setFournisseurLinesMap] = useState<Record<string, { date: string; piece: string; libelle: string; debit: number; credit: number }[]>>({});
  const [editForm, setEditForm] = useState<{
    raisonSociale: string;
    nif: string;
    telephone: string;
    email: string;
    adresse: string;
    typeFournisseur: 'local' | 'etranger';
    compteComptable: string;
    categorie: Fournisseur['categorie'];
    statut: Fournisseur['statut'];
    delaiPaiement: number;
    modeReglement: Fournisseur['modeReglement'];
  }>({
    raisonSociale: '', nif: '', telephone: '', email: '', adresse: '',
    typeFournisseur: 'local', compteComptable: '401',
    categorie: 'RECURRENT', statut: 'ACTIF', delaiPaiement: 30, modeReglement: 'VIREMENT',
  });
  const [formStep, setFormStep] = useState(1);
  const [newFournisseur, setNewFournisseur] = useState({
    code: '', raisonSociale: '', nomCommercial: '',
    categorie: 'RECURRENT' as Fournisseur['categorie'],
    typeDépense: 'FRAIS_GENERAUX' as Fournisseur['typeDépense'],
    pays: 'Cameroun', secteurActivite: '', rccm: '', niu: '',
    adresse: '', codePostal: '', ville: '', region: '',
    contactPrincipal: '', fonction: '',
    email: '', telephone: '', telephoneSecondaire: '',
    compteComptable: '401', compteAuxiliaire: '', codeCommercial: '', typeFournisseur: 'local' as 'local' | 'etranger', journalAchats: 'AC',
    delaiPaiement: 30, limiteCredit: 500000,
    modeReglement: 'VIREMENT' as Fournisseur['modeReglement'],
    devise: 'XAF', escompte: 0, tauxTVA: 19.25,
    banque: '', iban: '', swift: '',
  });

  // Chargement des données réelles depuis l'adaptateur
  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [allThirdParties, allEntries] = await Promise.all([
          adapter.getAll('thirdParties'),
          adapter.getAll('journalEntries')
        ]);

        const pieceNumbers = buildPieceNumbers(allEntries as any);
        const suppliers = allThirdParties.filter(
          (tp: any) => tp.type === 'supplier' || tp.type === 'both' || /^40/.test(tp.code || '')
        );

        const linesBySupplier: Record<string, { date: string; piece: string; libelle: string; debit: number; credit: number }[]> = {};

        // Ancienneté RÉELLE (FIFO) des dettes fournisseurs : les règlements (débits)
        // soldent les factures (crédits) les plus anciennes ; le reliquat ouvert
        // est ventilé par âge. Remplace l'ancien « tout en non-échu ».
        const asOf = new Date();
        const DAY_MS = 86400000;
        const agePayable = (lns: { debit: number; credit: number; date: string }[]) => {
          const sorted = [...lns].sort((a, b) => String(a.date).localeCompare(String(b.date)));
          const invoices: { date: string; amount: number }[] = [];
          let pool = 0;
          for (const l of sorted) {
            if ((l.credit || 0) > 0) invoices.push({ date: l.date, amount: l.credit });
            pool += l.debit || 0;
          }
          const open: { date: string; amount: number }[] = [];
          for (const inv of invoices) {
            if (pool >= inv.amount) { pool -= inv.amount; }
            else { open.push({ date: inv.date, amount: inv.amount - pool }); pool = 0; }
          }
          let nonEchu = 0, e030 = 0, e3160 = 0, e6190 = 0, e90 = 0;
          for (const o of open) {
            const days = Math.floor((asOf.getTime() - new Date(o.date).getTime()) / DAY_MS);
            if (days < 0) nonEchu += o.amount;
            else if (days <= 30) e030 += o.amount;
            else if (days <= 60) e3160 += o.amount;
            else if (days <= 90) e6190 += o.amount;
            else e90 += o.amount;
          }
          return { nonEchu, echu0_30: e030, echu31_60: e3160, echu61_90: e6190, echuPlus90: e90 };
        };

        const fournisseursData: Fournisseur[] = suppliers.map((tp: any) => {
          const relatedLines: { debit: number; credit: number }[] = [];
          const detailLines: { date: string; piece: string; libelle: string; debit: number; credit: number }[] = [];
          allEntries.forEach((entry: any) => {
            if (entry.status === 'draft') return;
            (entry.lines || []).forEach((line: any) => {
              if (line.lettrageCode) return; // lignes lettrées (dettes soldées) exclues de l'encours/âge
              if (line.thirdPartyCode === tp.code || (tp.accountCode && line.accountCode === tp.accountCode)) {
                relatedLines.push({ debit: line.debit || 0, credit: line.credit || 0 });
                detailLines.push({
                  date: entry.date,
                  piece: pieceNumberOf(entry, pieceNumbers),
                  libelle: line.label || entry.label || '',
                  debit: line.debit || 0,
                  credit: line.credit || 0,
                });
              }
            });
          });
          linesBySupplier[tp.id] = detailLines.sort((a, b) => String(b.date).localeCompare(String(a.date)));

          const totalDebit = relatedLines.reduce((s, l) => s + l.debit, 0);
          const totalCredit = relatedLines.reduce((s, l) => s + l.credit, 0);
          const encours = totalCredit - totalDebit;

          return {
            id: tp.id,
            code: tp.code || '',
            raisonSociale: tp.name || '',
            nomCommercial: tp.name,
            categorie: 'RECURRENT' as const,
            typeDépense: 'SERVICES' as const,
            pays: '',
            secteurActivite: '',
            volumeAchats: totalCredit,
            encoursActuel: Math.max(encours, 0),
            dpo: tp.conditionsPaiement?.delaiJours || 30,
            limiteCredit: 0,
            delaiPaiement: tp.conditionsPaiement?.delaiJours || 30,
            escompte: tp.conditionsPaiement?.escompte || 0,
            modeReglement: (tp.conditionsPaiement?.modePaiement === 'virement' ? 'VIREMENT' : tp.conditionsPaiement?.modePaiement === 'cheque' ? 'CHEQUE' : 'VIREMENT') as 'VIREMENT' | 'CHEQUE',
            devise: 'XAF',
            scoreQualite: tp.isActive ? 80 : 40,
            respectDelais: 0,
            notationInterne: 'B' as const,
            conformite: tp.isActive,
            contactComptable: '',
            emailComptable: tp.email || '',
            telephoneComptable: tp.phone || '',
            statut: tp.isActive ? 'ACTIF' as const : 'INACTIF' as const,
            alertes: 0,
            ...agePayable(detailLines),
          };
        });

        if (mounted) {
          setFournisseurs(fournisseursData);
          setFournisseurLinesMap(linesBySupplier);
        }
      } catch (err) {
        /* ignored */
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    loadData();
    return () => { mounted = false; };
  }, [adapter]);

  const filteredFournisseurs = useMemo(() => fournisseurs.filter(fournisseur => {
    const matchSearch = fournisseur.raisonSociale.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       fournisseur.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       fournisseur.secteurActivite.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = selectedCategory === 'all' || fournisseur.categorie === selectedCategory;
    const matchStatut = selectedStatut === 'all' || fournisseur.statut === selectedStatut;

    return matchSearch && matchCategory && matchStatut;
  }), [fournisseurs, searchTerm, selectedCategory, selectedStatut]);


  const getCategorieColor = (categorie: string) => {
    switch (categorie) {
      case 'STRATEGIQUE': return 'bg-primary-100 text-primary-800';
      case 'RECURRENT': return 'bg-blue-100 text-blue-800';
      case 'CRITIQUE': return 'bg-red-100 text-red-800';
      case 'PONCTUEL': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'ACTIF': return 'bg-green-100 text-green-800';
      case 'BLOQUE': return 'bg-red-100 text-red-800';
      case 'SUSPENDU': return 'bg-yellow-100 text-yellow-800';
      case 'INACTIF': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getNotationColor = (notation: string) => {
    switch (notation) {
      case 'A': return 'text-green-600 bg-green-100';
      case 'B': return 'text-blue-600 bg-blue-100';
      case 'C': return 'text-yellow-600 bg-yellow-100';
      case 'D': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedFournisseurs(filteredFournisseurs.map(f => f.id));
    } else {
      setSelectedFournisseurs([]);
    }
  };

  const handleSelectFournisseur = (id: string) => {
    if (selectedFournisseurs.includes(id)) {
      setSelectedFournisseurs(selectedFournisseurs.filter(fId => fId !== id));
    } else {
      setSelectedFournisseurs([...selectedFournisseurs, id]);
    }
  };

  const handleEditFournisseur = (fournisseur: Fournisseur) => {
    const f: any = fournisseur;
    // Ouvre l'assistant complet (4 étapes) pré-rempli, au lieu du mini-formulaire.
    setNewFournisseur({
      code: f.code || '',
      raisonSociale: f.raisonSociale || '',
      nomCommercial: f.nomCommercial || '',
      categorie: f.categorie || 'RECURRENT',
      typeDépense: f.typeDépense || 'FRAIS_GENERAUX',
      pays: f.pays || 'Cameroun',
      secteurActivite: f.secteurActivite || '',
      rccm: f.rccm || '',
      niu: f.niu || '',
      adresse: f.adresse || '',
      codePostal: f.codePostal || '',
      ville: f.ville || '',
      region: f.region || '',
      contactPrincipal: f.contactPrincipal || '',
      fonction: '',
      email: f.emailComptable || f.email || '',
      telephone: f.telephoneComptable || f.telephone || '',
      telephoneSecondaire: '',
      compteComptable: f.compteComptable || '401',
      compteAuxiliaire: f.compteAuxiliaire || f.code || '',
      codeCommercial: '',
      typeFournisseur: f.typeFournisseur || 'local',
      journalAchats: f.journalAchats || 'AC',
      delaiPaiement: f.delaiPaiement ?? 30,
      limiteCredit: f.limiteCredit ?? 0,
      modeReglement: f.modeReglement || 'VIREMENT',
      devise: f.devise || 'XAF',
      escompte: f.escompte ?? 0,
      tauxTVA: f.tauxTVA ?? 19.25,
      banque: f.banque || '',
      iban: f.iban || '',
      swift: f.swift || '',
    });
    setEditingId(fournisseur.id);
    setFormStep(1);
    setShowNewFournisseurModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingFournisseur) return;
    try {
      await adapter.update('thirdParties', editingFournisseur.id, {
        name: editForm.raisonSociale,
        phone: editForm.telephone,
        email: editForm.email,
        address: editForm.adresse,
        taxId: editForm.nif,
        isActive: editForm.statut === 'ACTIF',
        conditionsPaiement: {
          delaiJours: editForm.delaiPaiement,
          modePaiement: editForm.modeReglement.toLowerCase(),
        },
      });
      setFournisseurs(prev => prev.map(f =>
        f.id === editingFournisseur.id
          ? {
              ...f,
              raisonSociale: editForm.raisonSociale,
              telephoneComptable: editForm.telephone,
              emailComptable: editForm.email,
              categorie: editForm.categorie,
              statut: editForm.statut,
              delaiPaiement: editForm.delaiPaiement,
              dpo: editForm.delaiPaiement,
              modeReglement: editForm.modeReglement,
            }
          : f
      ));
      setEditingFournisseur(null);
    } catch {
      /* ignored */
    }
  };

  // Calcul des statistiques
  const { totalEncours, totalAchats, moyenneDPO, fournisseursActifs } = useMemo(() => ({
    totalEncours: fournisseurs.reduce((sum, f) => sum + f.encoursActuel, 0),
    totalAchats: fournisseurs.reduce((sum, f) => sum + f.volumeAchats, 0),
    moyenneDPO: Math.round(fournisseurs.reduce((sum, f) => sum + f.dpo, 0) / fournisseurs.length),
    fournisseursActifs: fournisseurs.filter(f => f.statut === 'ACTIF').length,
  }), [fournisseurs]);

  // Analytics Data computed from real data
  const analyticsData = useMemo(() => {
    const categories = ['STRATEGIQUE', 'RECURRENT', 'PONCTUEL', 'CRITIQUE'] as const;
    return {
      fournisseursParCategorie: categories.map(cat => ({
        categorie: cat,
        count: fournisseurs.filter(f => f.categorie === cat).length,
        montant: fournisseurs.filter(f => f.categorie === cat).reduce((s, f) => s + f.volumeAchats, 0)
      })),
      evolutionAchats: [] as { mois: string; achats2024: number; achats2025: number }[],
      performanceFournisseurs: [
        { critere: t('suppliers.criterionPrice'), score: 0 },
        { critere: t('suppliers.criterionQuality'), score: fournisseurs.length > 0 ? Math.round(fournisseurs.reduce((s, f) => s + f.scoreQualite, 0) / fournisseurs.length) : 0 },
        { critere: t('suppliers.criterionLeadTimes'), score: fournisseurs.length > 0 ? Math.round(fournisseurs.reduce((s, f) => s + f.respectDelais, 0) / fournisseurs.length) : 0 },
        { critere: t('suppliers.criterionService'), score: 0 },
        { critere: t('suppliers.criterionCompliance'), score: fournisseurs.length > 0 ? Math.round(fournisseurs.filter(f => f.conformite).length / fournisseurs.length * 100) : 0 }
      ]
    };
  }, [fournisseurs, t]);

  const COLORS = ['#235A6E', '#E89A2E', '#15803D', '#4E7E8D', '#C77E2C', '#7FA3AF'];

  // Données Balance Âgée Fournisseurs (Dettes)
  const balanceAgeeData: BalanceAgeeFournisseurItem[] = useMemo(() => fournisseurs.map(f => ({
    fournisseurId: f.id,
    fournisseurCode: f.code,
    fournisseurNom: f.raisonSociale,
    totalDettes: f.nonEchu + f.echu0_30 + f.echu31_60 + f.echu61_90 + f.echuPlus90,
    nonEchu: f.nonEchu,
    echu0_30: f.echu0_30,
    echu31_60: f.echu31_60,
    echu61_90: f.echu61_90,
    echuPlus90: f.echuPlus90,
    // Provision calculée selon SYSCOHADA (20% pour 61-90j, 50% pour +90j)
    provision: (f.echu61_90 * 0.2) + (f.echuPlus90 * 0.5)
  })), [fournisseurs]);

  // Calculs totaux Balance Âgée Fournisseurs
  const totauxBalanceAgee = useMemo(() => balanceAgeeData.reduce((acc, item) => ({
    totalDettes: acc.totalDettes + item.totalDettes,
    nonEchu: acc.nonEchu + item.nonEchu,
    echu0_30: acc.echu0_30 + item.echu0_30,
    echu31_60: acc.echu31_60 + item.echu31_60,
    echu61_90: acc.echu61_90 + item.echu61_90,
    echuPlus90: acc.echuPlus90 + item.echuPlus90,
    provision: acc.provision + item.provision
  }), {
    totalDettes: 0, nonEchu: 0, echu0_30: 0, echu31_60: 0, echu61_90: 0, echuPlus90: 0, provision: 0
  }), [balanceAgeeData]);

  // Data pour graphique Balance Âgée Fournisseurs
  const balanceAgeeChartData = [
    { name: 'Non échu', label: t('suppliers.notDueLower'), value: totauxBalanceAgee.nonEchu, color: '#15803D' },
    { name: '0-30 jours', label: t('suppliers.days0_30'), value: totauxBalanceAgee.echu0_30, color: '#E89A2E' },
    { name: '31-60 jours', label: t('suppliers.days31_60'), value: totauxBalanceAgee.echu31_60, color: '#E89A2E' },
    { name: '61-90 jours', label: t('suppliers.days61_90'), value: totauxBalanceAgee.echu61_90, color: '#C0322B' },
    { name: '+90 jours', label: t('suppliers.daysOver90'), value: totauxBalanceAgee.echuPlus90, color: '#C0322B' }
  ];

  const tabs = [
    { id: 'liste', label: t('suppliers.tabList'), icon: Users },
    { id: 'balance-agee', label: t('suppliers.tabAgedBalance'), icon: Receipt },
    { id: 'analytics', label: t('suppliers.tabAnalytics'), icon: BarChart3 }
  ];

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-[var(--color-text-secondary)] mx-auto mb-4" />
          <p className="text-[var(--color-text-secondary)]">{t('suppliers.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 ">
      {/* Header avec statistiques */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-[var(--color-border)]">
        <h2 className="text-lg font-bold text-[var(--color-primary)] mb-6">{t('suppliers.title')}</h2>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mt-6 bg-gray-100 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-[var(--color-text-tertiary)] shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[#404040]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Liste Tab */}
      {activeTab === 'liste' && (
        <>
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-4 border border-primary-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-600 font-medium">{t('suppliers.kpiTotalOutstanding')}</p>
                <p className="text-lg font-bold text-primary-800">{formatCurrency(totalEncours)}</p>
                <p className="text-xs text-primary-600 mt-1">{t('suppliers.kpiOnSuppliers', { count: String(fournisseursActifs) })}</p>
              </div>
              <Euro className="w-8 h-8 text-primary-400" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">{t('suppliers.kpiPurchaseVolume')}</p>
                <p className="text-lg font-bold text-blue-800">{formatCurrency(totalAchats)}</p>
                <p className="text-xs text-blue-600 mt-1">{t('suppliers.kpiCurrentYear')}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">{t('suppliers.kpiAverageDpo')}</p>
                <p className="text-lg font-bold text-green-800">{moyenneDPO} {t('suppliers.days')}</p>
                <p className="text-xs text-green-600 mt-1">{t('suppliers.kpiPaymentTerms')}</p>
              </div>
              <Clock className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">{t('suppliers.kpiAlerts')}</p>
                <p className="text-lg font-bold text-orange-800">{fournisseurs.reduce((sum, f) => sum + f.alertes, 0)}</p>
                <p className="text-xs text-orange-600 mt-1">{t('suppliers.kpiToProcess')}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-400" />
            </div>
          </div>
        </div>

        {/* Actions et Filtres */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-[var(--color-text-secondary)]" />
            <input
              type="text"
              placeholder={t('suppliers.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          {showFilters && (
          <>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-3 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="all">{t('suppliers.allCategories')}</option>
            <option value="STRATEGIQUE">{t('suppliers.categoryStrategic')}</option>
            <option value="RECURRENT">{t('suppliers.categoryRecurring')}</option>
            <option value="CRITIQUE">{t('suppliers.categoryCritical')}</option>
            <option value="PONCTUEL">{t('suppliers.categoryOccasional')}</option>
          </select>

          <select
            value={selectedStatut}
            onChange={(e) => setSelectedStatut(e.target.value)}
            className="px-4 py-3 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="all">{t('suppliers.allStatuses')}</option>
            <option value="ACTIF">{t('suppliers.statusActive')}</option>
            <option value="BLOQUE">{t('suppliers.statusBlocked')}</option>
            <option value="SUSPENDU">{t('suppliers.statusSuspended')}</option>
            <option value="INACTIF">{t('suppliers.statusInactive')}</option>
          </select>
          </>
          )}

          <PageHeaderActions
            onToggleFilters={() => setShowFilters((v) => !v)}
            filtersOpen={showFilters}
            activeFilters={[searchTerm !== '', selectedCategory !== 'all', selectedStatut !== 'all'].filter(Boolean).length}
          />

          <button
            onClick={async () => {
              setShowNewFournisseurModal(true);
              setFormStep(1);
              try {
                const mappings = await loadMappings(adapter);
                const compteCollectif = newFournisseur.typeFournisseur === 'etranger' ? '404' : '401';
                const { compteAuxiliaire, codeCommercial } = await generateNextCode(adapter, compteCollectif, mappings);
                setNewFournisseur(prev => ({ ...prev, compteAuxiliaire, codeCommercial, compteComptable: compteCollectif }));
              } catch {
                // ignore — user can fill manually
              }
            }}
            className="flex items-center space-x-2 px-4 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90"
          >
            <Plus className="w-5 h-5" />
            <span className="font-semibold">{t('suppliers.newSupplier')}</span>
          </button>
        </div>

      {/* Table des fournisseurs */}
      <div className="bg-white rounded-lg shadow-sm border border-[var(--color-border)]">
        <div className="p-4 border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--color-text-secondary)]">
              {t('suppliers.countFound', { count: String(filteredFournisseurs.length) })}
            </p>
            <div className="flex items-center space-x-2">
              {selectedFournisseurs.length > 0 && (
                <span className="text-sm text-[var(--color-primary)] font-medium">
                  {t('suppliers.countSelected', { count: String(selectedFournisseurs.length) })}
                </span>
              )}
              <ExportMenu
                data={filteredFournisseurs as unknown as Record<string, unknown>[]}
                filename="fournisseurs"
                columns={{
                  code: t('suppliers.colCode'),
                  raisonSociale: t('suppliers.colSupplier'),
                  secteurActivite: t('suppliers.colSector'),
                  categorie: t('suppliers.colCategory'),
                  pays: t('suppliers.colCountry'),
                  encoursActuel: t('suppliers.colOutstanding'),
                  volumeAchats: t('suppliers.colPurchaseVolume'),
                  dpo: t('suppliers.colDpo'),
                  notationInterne: t('suppliers.colRating'),
                  statut: t('suppliers.colStatus')
                }}
                buttonText={t('common.export')}
                buttonVariant="outline"
              />
              <button className="flex items-center space-x-2 px-3 py-2 text-sm border border-[var(--color-border)] rounded hover:bg-gray-50">
                <Filter className="w-4 h-4" />
                <span>{t('suppliers.moreFilters')}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 p-3">
                  <input
                    type="checkbox"
                    checked={selectedFournisseurs.length === filteredFournisseurs.length && filteredFournisseurs.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="text-left p-3 text-sm font-medium text-[var(--color-text-secondary)]">{t('suppliers.colCode')}</th>
                <th className="text-left p-3 text-sm font-medium text-[var(--color-text-secondary)]">{t('suppliers.colSupplier')}</th>
                <th className="text-left p-3 text-sm font-medium text-[var(--color-text-secondary)]">{t('suppliers.colCategory')}</th>
                <th className="text-left p-3 text-sm font-medium text-[var(--color-text-secondary)]">{t('suppliers.colCountry')}</th>
                <th className="text-right p-3 text-sm font-medium text-[var(--color-text-secondary)]">{t('suppliers.colOutstanding')}</th>
                <th className="text-right p-3 text-sm font-medium text-[var(--color-text-secondary)]">{t('suppliers.colPurchaseVolume')}</th>
                <th className="text-center p-3 text-sm font-medium text-[var(--color-text-secondary)]">{t('suppliers.colDpo')}</th>
                <th className="text-center p-3 text-sm font-medium text-[var(--color-text-secondary)]">{t('suppliers.colRating')}</th>
                <th className="text-center p-3 text-sm font-medium text-[var(--color-text-secondary)]">{t('suppliers.colStatus')}</th>
                <th className="text-center p-3 text-sm font-medium text-[var(--color-text-secondary)]">{t('suppliers.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredFournisseurs.map((fournisseur) => (
                <tr key={fournisseur.id} className="border-t border-[var(--color-border)] hover:bg-gray-50">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedFournisseurs.includes(fournisseur.id)}
                      onChange={() => handleSelectFournisseur(fournisseur.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="p-3">
                    <span className="text-sm font-medium text-[var(--color-primary)]">{fournisseur.code}</span>
                  </td>
                  <td className="p-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--color-primary)]">{fournisseur.raisonSociale}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{fournisseur.secteurActivite}</p>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${getCategorieColor(fournisseur.categorie)}`}>
                      {fournisseur.categorie}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-[var(--color-text-secondary)]" />
                      <span className="text-sm text-[var(--color-text-secondary)]">{fournisseur.pays}</span>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <div>
                      <p className="text-sm font-medium text-[var(--color-primary)]">{formatCurrency(fournisseur.encoursActuel)}</p>
                      {fournisseur.encoursActuel > fournisseur.limiteCredit * 0.8 && (
                        <p className="text-xs text-orange-600">{t('suppliers.nearLimit')}</p>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <p className="text-sm font-medium text-[var(--color-primary)]">{formatCurrency(fournisseur.volumeAchats)}</p>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <Clock className="w-3 h-3 text-[var(--color-text-secondary)]" />
                      <span className="text-sm text-[var(--color-text-secondary)]">{fournisseur.dpo}{t('suppliers.daysShort')}</span>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${getNotationColor(fournisseur.notationInterne)}`}>
                      {fournisseur.notationInterne}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex flex-col items-center space-y-1">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatutColor(fournisseur.statut)}`}>
                        {fournisseur.statut}
                      </span>
                      {fournisseur.alertes > 0 && (
                        <span className="flex items-center space-x-1 text-xs text-orange-600">
                          <AlertCircle className="w-3 h-3" />
                          <span>{fournisseur.alertes}</span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => setViewingFournisseur(fournisseur)}
                        className="p-1 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditFournisseur(fournisseur)}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                        title={t('suppliers.edit')}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-red-600 hover:bg-red-100 rounded" aria-label={t('suppliers.delete')}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-[var(--color-border)] flex items-center justify-between">
          <span className="text-sm text-[var(--color-text-secondary)]">
            {t('suppliers.paginationInfo', { count: String(filteredFournisseurs.length), total: String(filteredFournisseurs.length) })}
          </span>
          <div className="flex items-center space-x-2">
            <button className="px-3 py-1 border border-[var(--color-border)] rounded text-sm disabled:opacity-50" disabled>
              {t('suppliers.previous')}
            </button>
            <button className="px-3 py-1 bg-[var(--color-primary)] text-white rounded text-sm">1</button>
            <button className="px-3 py-1 border border-[var(--color-border)] rounded text-sm disabled:opacity-50" disabled>
              {t('suppliers.next')}
            </button>
          </div>
        </div>
      </div>
      </>
      )}

      {/* Balance Âgée Tab */}
      {activeTab === 'balance-agee' && (
        <div className="space-y-6">
          {/* Header avec actions */}
          <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-primary)]">{t('suppliers.agedBalanceTitle')}</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">{t('suppliers.agedBalanceSubtitle', { date: new Date().toLocaleDateString('fr-FR') })}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPeriodModal(true)}
                  className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  <Calendar className="w-4 h-4" />
                  <span>{t('suppliers.cutoffDate')}</span>
                </button>
                <ExportMenu
                  data={balanceAgeeData as unknown as Record<string, unknown>[]}
                  filename="balance-agee-fournisseurs"
                  columns={{
                    fournisseurCode: t('suppliers.colSupplierCode'),
                    fournisseurNom: t('suppliers.colSupplierName'),
                    totalDettes: t('suppliers.totalPayables'),
                    nonEchu: t('suppliers.notDue'),
                    echu0_30: t('suppliers.days0_30'),
                    echu31_60: t('suppliers.days31_60'),
                    echu61_90: t('suppliers.days61_90'),
                    echuPlus90: t('suppliers.daysOver90'),
                    provision: t('suppliers.provision')
                  }}
                  buttonText={t('suppliers.export')}
                />
                <button type="button" className="p-2 text-gray-600 hover:bg-gray-100 rounded" title={t('suppliers.print')}>
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* KPIs Balance Âgée */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-lg font-bold text-[var(--color-primary)]">{formatCurrency(totauxBalanceAgee.totalDettes)}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">{t('suppliers.totalPayables')}</p>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-xs text-green-600">{totauxBalanceAgee.totalDettes > 0 ? ((totauxBalanceAgee.nonEchu / totauxBalanceAgee.totalDettes) * 100).toFixed(1) : 0}%</span>
              </div>
              <p className="text-lg font-bold text-green-800">{formatCurrency(totauxBalanceAgee.nonEchu)}</p>
              <p className="text-xs text-green-600">{t('suppliers.notDue')}</p>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <span className="text-xs text-yellow-600">{totauxBalanceAgee.totalDettes > 0 ? ((totauxBalanceAgee.echu0_30 / totauxBalanceAgee.totalDettes) * 100).toFixed(1) : 0}%</span>
              </div>
              <p className="text-lg font-bold text-yellow-800">{formatCurrency(totauxBalanceAgee.echu0_30)}</p>
              <p className="text-xs text-yellow-600">{t('suppliers.days0_30')}</p>
            </div>

            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <span className="text-xs text-orange-600">{totauxBalanceAgee.totalDettes > 0 ? ((totauxBalanceAgee.echu31_60 / totauxBalanceAgee.totalDettes) * 100).toFixed(1) : 0}%</span>
              </div>
              <p className="text-lg font-bold text-orange-800">{formatCurrency(totauxBalanceAgee.echu31_60)}</p>
              <p className="text-xs text-orange-600">{t('suppliers.days31_60')}</p>
            </div>

            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <AlertOctagon className="w-5 h-5 text-red-600" />
                <span className="text-xs text-red-600">{totauxBalanceAgee.totalDettes > 0 ? (((totauxBalanceAgee.echu61_90 + totauxBalanceAgee.echuPlus90) / totauxBalanceAgee.totalDettes) * 100).toFixed(1) : 0}%</span>
              </div>
              <p className="text-lg font-bold text-red-800">{formatCurrency(totauxBalanceAgee.echu61_90 + totauxBalanceAgee.echuPlus90)}</p>
              <p className="text-xs text-red-600">{t('suppliers.daysOver60')}</p>
            </div>

            <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
              <div className="flex items-center justify-between mb-2">
                <Shield className="w-5 h-5 text-primary-600" />
              </div>
              <p className="text-lg font-bold text-primary-800">{formatCurrency(totauxBalanceAgee.provision)}</p>
              <p className="text-xs text-primary-600">{t('suppliers.provisions')}</p>
            </div>
          </div>

          {/* Sous-onglets Balance Âgée */}
          <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm overflow-hidden">
            <div className="flex border-b border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setBalanceAgeeSubTab('repartition')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
                  balanceAgeeSubTab === 'repartition'
                    ? 'bg-[var(--color-text-tertiary)]/10 text-[var(--color-text-tertiary)] border-b-2 border-[var(--color-text-tertiary)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-gray-50'
                }`}
              >
                <PieChart className="w-4 h-4" />
                <span>{t('suppliers.subTabBreakdown')}</span>
              </button>
              <button
                type="button"
                onClick={() => setBalanceAgeeSubTab('detail')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
                  balanceAgeeSubTab === 'detail'
                    ? 'bg-[var(--color-text-tertiary)]/10 text-[var(--color-text-tertiary)] border-b-2 border-[var(--color-text-tertiary)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-gray-50'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>{t('suppliers.subTabDetail')}</span>
              </button>
              <button
                type="button"
                onClick={() => setBalanceAgeeSubTab('risques')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
                  balanceAgeeSubTab === 'risques'
                    ? 'bg-[var(--color-text-tertiary)]/10 text-[var(--color-text-tertiary)] border-b-2 border-[var(--color-text-tertiary)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-gray-50'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span>{t('suppliers.subTabPriorities')}</span>
              </button>
            </div>

            {/* Contenu sous-onglet: Répartition par ancienneté */}
            {balanceAgeeSubTab === 'repartition' && (
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Graphique Donut Moderne */}
                  <div className="lg:col-span-2 bg-gradient-to-br from-primary-50 to-gray-100 rounded-2xl p-6 shadow-inner">
                    <h4 className="text-lg font-semibold text-[var(--color-primary)] mb-2 text-center">{t('suppliers.payablesDistribution')}</h4>
                    <p className="text-sm text-[var(--color-text-secondary)] text-center mb-4">{t('suppliers.subTabBreakdown')}</p>
                    <div className="relative">
                      <ResponsiveContainer width="100%" height={320}>
                        <RechartsPieChart>
                          <defs>
                            <filter id="shadowFournisseur" x="-20%" y="-20%" width="140%" height="140%">
                              <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.15"/>
                            </filter>
                          </defs>
                          <Pie
                            data={balanceAgeeChartData}
                            nameKey="label"
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={120}
                            paddingAngle={3}
                            dataKey="value"
                            cornerRadius={6}
                            stroke="none"
                            filter="url(#shadowFournisseur)"
                          >
                            {balanceAgeeChartData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.color}
                                style={{ filter: 'brightness(1.05)' }}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => formatCurrency(value as number)}
                            contentStyle={{
                              borderRadius: '12px',
                              border: 'none',
                              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                              padding: '12px 16px'
                            }}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                      {/* Centre du Donut avec Total */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center bg-white rounded-full w-32 h-32 flex flex-col items-center justify-center shadow-lg">
                          <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wide">{t('suppliers.total')}</p>
                          <p className="text-lg font-bold text-[var(--color-primary)]">{formatCurrency(totauxBalanceAgee.totalDettes)}</p>
                          <p className="text-xs text-[var(--color-text-secondary)]">{t('suppliers.suppliersCount', { count: String(balanceAgeeData.length) })}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Légende détaillée et statistiques */}
                  <div className="lg:col-span-3 space-y-3">
                    <h4 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('suppliers.detailByAgeBracket')}</h4>
                    {balanceAgeeChartData.map((item, idx) => {
                      const percent = totauxBalanceAgee.totalDettes > 0
                        ? ((item.value / totauxBalanceAgee.totalDettes) * 100).toFixed(1)
                        : '0';
                      const fournisseurCount = balanceAgeeData.filter(f => {
                        if (item.name === 'Non échu') return f.nonEchu > 0;
                        if (item.name === '0-30 jours') return f.echu0_30 > 0;
                        if (item.name === '31-60 jours') return f.echu31_60 > 0;
                        if (item.name === '61-90 jours') return f.echu61_90 > 0;
                        if (item.name === '+90 jours') return f.echuPlus90 > 0;
                        return false;
                      }).length;
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-4 bg-white rounded-xl border border-[var(--color-border)] hover:shadow-md transition-all duration-200 cursor-pointer group"
                          style={{ borderLeft: `4px solid ${item.color}` }}
                        >
                          <div className="flex items-center space-x-4">
                            <div
                              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
                              style={{ backgroundColor: `${item.color}20` }}
                            >
                              <div className="w-5 h-5 rounded-full" style={{ backgroundColor: item.color }}></div>
                            </div>
                            <div>
                              <p className="font-semibold text-[var(--color-primary)] group-hover:text-[var(--color-text-tertiary)] transition-colors">{item.label}</p>
                              <p className="text-sm text-[var(--color-text-secondary)]">{t('suppliers.suppliersConcerned', { count: String(fournisseurCount) })}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-[var(--color-primary)]">{formatCurrency(item.value)}</p>
                            <div className="flex items-center justify-end space-x-2">
                              <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${percent}%`, backgroundColor: item.color }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-[var(--color-text-secondary)] min-w-[45px] text-right">{percent}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Graphique en barres empilées */}
                <div className="mt-6 bg-gray-50 rounded-lg p-6">
                  <h4 className="text-md font-semibold text-[var(--color-primary)] mb-4">{t('suppliers.evolutionBySupplier')}</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={balanceAgeeData.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                      <YAxis type="category" dataKey="fournisseurCode" width={80} />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Legend />
                      <Bar radius={[6,6,0,0]} dataKey="nonEchu" stackId="a" fill="url(#gradGreen)" name={t('suppliers.notDue')} />
                      <Bar radius={[6,6,0,0]} dataKey="echu0_30" stackId="a" fill="url(#gradAmber)" name={t('suppliers.days0_30Short')} />
                      <Bar radius={[6,6,0,0]} dataKey="echu31_60" stackId="a" fill="url(#gradAmber)" name={t('suppliers.days31_60Short')} />
                      <Bar radius={[6,6,0,0]} dataKey="echu61_90" stackId="a" fill="url(#gradRed)" name={t('suppliers.days61_90Short')} />
                      <Bar radius={[6,6,0,0]} dataKey="echuPlus90" stackId="a" fill="url(#gradRed)" name={t('suppliers.daysOver90Short')} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Contenu sous-onglet: Détail par fournisseur */}
            {balanceAgeeSubTab === 'detail' && (
              <div className="p-6">
                {/* Filtres */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder={t('suppliers.searchSupplierPlaceholder')}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-text-tertiary)]"
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="all">{t('suppliers.allBrackets')}</option>
                      <option value="nonechu">{t('suppliers.notDueOnly')}</option>
                      <option value="0-30">{t('suppliers.days0_30')}</option>
                      <option value="31-60">{t('suppliers.days31_60')}</option>
                      <option value="61-90">{t('suppliers.days61_90')}</option>
                      <option value="+90">{t('suppliers.daysOver90')}</option>
                    </select>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('suppliers.suppliersCount', { count: String(balanceAgeeData.length) })}</p>
                </div>

                {/* Tableau détaillé */}
                <div className="overflow-x-auto border border-[var(--color-border)] rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">{t('suppliers.colCode')}</th>
                        <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">{t('suppliers.colSupplier')}</th>
                        <th className="text-right p-3 font-medium text-[var(--color-text-secondary)]">{t('suppliers.totalPayables')}</th>
                        <th className="text-right p-3 font-medium text-green-600">{t('suppliers.notDue')}</th>
                        <th className="text-right p-3 font-medium text-yellow-600">{t('suppliers.days0_30Short')}</th>
                        <th className="text-right p-3 font-medium text-orange-600">{t('suppliers.days31_60Short')}</th>
                        <th className="text-right p-3 font-medium text-red-600">{t('suppliers.days61_90Short')}</th>
                        <th className="text-right p-3 font-medium text-red-800">{t('suppliers.daysOver90Short')}</th>
                        <th className="text-right p-3 font-medium text-primary-600">{t('suppliers.provision')}</th>
                        <th className="text-center p-3 font-medium text-[var(--color-text-secondary)]">{t('suppliers.colActions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {balanceAgeeData.map((item) => {
                        const hasRisk = item.echuPlus90 > 0 || item.echu61_90 > 0;
                        return (
                          <tr key={item.fournisseurId} className={`border-t border-[var(--color-border)] hover:bg-gray-50 ${hasRisk ? 'bg-red-50/30' : ''}`}>
                            <td className="p-3">
                              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{item.fournisseurCode}</span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center space-x-2">
                                <p className="font-medium text-[var(--color-primary)]">{item.fournisseurNom}</p>
                                {hasRisk && <AlertTriangle className="w-4 h-4 text-red-500" />}
                              </div>
                            </td>
                            <td className="p-3 text-right font-bold">{formatCurrency(item.totalDettes)}</td>
                            <td className="p-3 text-right text-green-600">{item.nonEchu > 0 ? formatCurrency(item.nonEchu) : '-'}</td>
                            <td className="p-3 text-right text-yellow-600">{item.echu0_30 > 0 ? formatCurrency(item.echu0_30) : '-'}</td>
                            <td className="p-3 text-right text-orange-600">{item.echu31_60 > 0 ? formatCurrency(item.echu31_60) : '-'}</td>
                            <td className="p-3 text-right text-red-600">{item.echu61_90 > 0 ? formatCurrency(item.echu61_90) : '-'}</td>
                            <td className="p-3 text-right text-red-800 font-bold">{item.echuPlus90 > 0 ? formatCurrency(item.echuPlus90) : '-'}</td>
                            <td className="p-3 text-right text-primary-600">{item.provision > 0 ? formatCurrency(item.provision) : '-'}</td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <button type="button" className="p-1 text-gray-500 hover:text-[var(--color-text-tertiary)]" title={t('suppliers.viewDetail')}>
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button type="button" className="p-1 text-gray-500 hover:text-blue-600" title={t('suppliers.schedulePayment')}>
                                  <CreditCard className="w-4 h-4" />
                                </button>
                                <button type="button" className="p-1 text-gray-500 hover:text-orange-600" title={t('suppliers.print')}>
                                  <Printer className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-100 font-bold">
                      <tr>
                        <td className="p-3" colSpan={2}>{t('suppliers.totalsRow', { count: String(balanceAgeeData.length) })}</td>
                        <td className="p-3 text-right">{formatCurrency(totauxBalanceAgee.totalDettes)}</td>
                        <td className="p-3 text-right text-green-600">{formatCurrency(totauxBalanceAgee.nonEchu)}</td>
                        <td className="p-3 text-right text-yellow-600">{formatCurrency(totauxBalanceAgee.echu0_30)}</td>
                        <td className="p-3 text-right text-orange-600">{formatCurrency(totauxBalanceAgee.echu31_60)}</td>
                        <td className="p-3 text-right text-red-600">{formatCurrency(totauxBalanceAgee.echu61_90)}</td>
                        <td className="p-3 text-right text-red-800">{formatCurrency(totauxBalanceAgee.echuPlus90)}</td>
                        <td className="p-3 text-right text-primary-600">{formatCurrency(totauxBalanceAgee.provision)}</td>
                        <td className="p-3"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Contenu sous-onglet: Paiements prioritaires et recommandations */}
            {balanceAgeeSubTab === 'risques' && (
              <div className="p-6 space-y-6">
                {/* Indicateurs de paiement */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <div className="flex items-center justify-between">
                      <AlertOctagon className="w-8 h-8 text-red-600" />
                      <span className="text-lg font-bold text-red-800">
                        {balanceAgeeData.filter(i => i.echuPlus90 > 0).length}
                      </span>
                    </div>
                    <p className="text-sm text-red-700 mt-2">{t('suppliers.criticalPayments')}</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <div className="flex items-center justify-between">
                      <AlertTriangle className="w-8 h-8 text-orange-600" />
                      <span className="text-lg font-bold text-orange-800">
                        {balanceAgeeData.filter(i => i.echu61_90 > 0).length}
                      </span>
                    </div>
                    <p className="text-sm text-orange-700 mt-2">{t('suppliers.urgentPayments')}</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <div className="flex items-center justify-between">
                      <Clock className="w-8 h-8 text-yellow-600" />
                      <span className="text-lg font-bold text-yellow-800">
                        {balanceAgeeData.filter(i => i.echu31_60 > 0).length}
                      </span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-2">{t('suppliers.upcomingPayments')}</p>
                  </div>
                  <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
                    <div className="flex items-center justify-between">
                      <Shield className="w-8 h-8 text-primary-600" />
                      <span className="text-lg font-bold text-primary-800">
                        {formatCurrency(totauxBalanceAgee.provision)}
                      </span>
                    </div>
                    <p className="text-sm text-primary-700 mt-2">{t('suppliers.litigationProvisions')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Liste des fournisseurs prioritaires */}
                  <div className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
                    <div className="p-4 bg-red-50 border-b border-red-200">
                      <div className="flex items-center justify-between">
                        <h4 className="text-md font-semibold text-red-800">{t('suppliers.prioritySuppliers')}</h4>
                        <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                          {t('suppliers.suppliersCount', { count: String(balanceAgeeData.filter(item => item.echuPlus90 > 0).length) })}
                        </span>
                      </div>
                      <p className="text-xs text-red-600 mt-1">{t('suppliers.priorityHint')}</p>
                    </div>
                    <div className="divide-y divide-[var(--color-border)] max-h-96 overflow-y-auto">
                      {balanceAgeeData
                        .filter(item => item.echuPlus90 > 0)
                        .sort((a, b) => b.echuPlus90 - a.echuPlus90)
                        .map((item, idx) => (
                          <div key={idx} className="p-4 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-[var(--color-primary)]">{item.fournisseurNom}</p>
                                <p className="text-xs text-[var(--color-text-secondary)]">{item.fournisseurCode}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-red-800">{formatCurrency(item.echuPlus90)}</p>
                                <p className="text-xs text-[var(--color-text-secondary)]">{t('suppliers.overdueOver90')}</p>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center space-x-2">
                              <button
                                type="button"
                                className="flex-1 px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center space-x-1"
                              >
                                <CreditCard className="w-3 h-3" />
                                <span>{t('suppliers.payNow')}</span>
                              </button>
                              <button
                                type="button"
                                className="flex-1 px-3 py-1.5 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 flex items-center justify-center space-x-1"
                              >
                                <Phone className="w-3 h-3" />
                                <span>{t('suppliers.negotiate')}</span>
                              </button>
                              <button
                                type="button"
                                className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      {balanceAgeeData.filter(item => item.echuPlus90 > 0).length === 0 && (
                        <div className="p-8 text-center text-[var(--color-text-secondary)]">
                          <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-2" />
                          <p>{t('suppliers.noCriticalOverdue')}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions recommandées */}
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
                      <div className="p-4 bg-[var(--color-text-tertiary)]/10 border-b border-[var(--color-border)]">
                        <h4 className="text-md font-semibold text-[var(--color-primary)]">{t('suppliers.treasuryPlanTitle')}</h4>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-1">{t('suppliers.treasuryPlanSubtitle')}</p>
                      </div>
                      <div className="p-4 space-y-3">
                        {/* Action 1 */}
                        <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-red-800">{t('suppliers.actionUrgentPayments')}</p>
                              <p className="text-sm text-red-700">
                                {t('suppliers.suppliersOver90', { count: String(balanceAgeeData.filter(i => i.echuPlus90 > 0).length) })}
                              </p>
                            </div>
                            <button type="button" className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">
                              {t('suppliers.schedule')}
                            </button>
                          </div>
                        </div>

                        {/* Action 2 */}
                        <div className="p-3 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-orange-800">{t('suppliers.actionTermNegotiation')}</p>
                              <p className="text-sm text-orange-700">
                                {t('suppliers.suppliers61_90', { count: String(balanceAgeeData.filter(i => i.echu61_90 > 0).length) })}
                              </p>
                            </div>
                            <button type="button" className="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700">
                              {t('suppliers.contact')}
                            </button>
                          </div>
                        </div>

                        {/* Action 3 */}
                        <div className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-yellow-800">{t('suppliers.actionScheduleToSet')}</p>
                              <p className="text-sm text-yellow-700">
                                {t('suppliers.suppliers31_60', { count: String(balanceAgeeData.filter(i => i.echu31_60 > 0).length) })}
                              </p>
                            </div>
                            <button type="button" className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700">
                              {t('suppliers.schedule')}
                            </button>
                          </div>
                        </div>

                        {/* Action 4 */}
                        <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-green-800">{t('suppliers.actionDiscountsAvailable')}</p>
                              <p className="text-sm text-green-700">
                                {t('suppliers.suppliersWithDiscount', { count: String(fournisseurs.filter(f => f.escompte && f.escompte > 0).length) })}
                              </p>
                            </div>
                            <button type="button" className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">
                              {t('suppliers.optimize')}
                            </button>
                          </div>
                        </div>

                        {/* Action 5 */}
                        <div className="p-3 bg-primary-50 rounded-lg border-l-4 border-primary-500">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-primary-800">{t('suppliers.actionProvisionsToPost')}</p>
                              <p className="text-sm text-primary-700">
                                {t('suppliers.provisionsSyscohada', { amount: formatCurrency(totauxBalanceAgee.provision) })}
                              </p>
                            </div>
                            <button type="button" className="px-3 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700">
                              {t('suppliers.generateJournalEntry')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Règles de provisionnement */}
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <h5 className="font-medium text-blue-800 flex items-center">
                        <Info className="w-4 h-4 mr-2" />
                        {t('suppliers.treasuryRulesTitle')}
                      </h5>
                      <div className="mt-3 space-y-2 text-sm text-blue-700">
                        <div className="flex justify-between">
                          <span>{t('suppliers.ruleStrategicPayment')}</span>
                          <span className="font-medium">{t('suppliers.ruleHighPriority')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('suppliers.ruleNegotiationOver90')}</span>
                          <span className="font-medium">{t('suppliers.ruleDisruptionRisk')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('suppliers.ruleEarlyPaymentDiscount')}</span>
                          <span className="font-medium">{t('suppliers.ruleSaving2to3')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (() => {
        const totalAchats = fournisseurs.reduce((s, f) => s + (f.volumeAchats || 0), 0);
        const totalEncours = fournisseurs.reduce((s, f) => s + (f.encoursActuel || 0), 0);
        const avgDPO = fournisseurs.length > 0 ? Math.round(fournisseurs.reduce((s, f) => s + (f.dpo || 0), 0) / fournisseurs.length) : 0;
        const avgQualite = fournisseurs.length > 0 ? (fournisseurs.reduce((s, f) => s + (f.scoreQualite || 0), 0) / fournisseurs.length / 20).toFixed(1) : '0';
        const catData = analyticsData.fournisseursParCategorie;
        const topFournisseurs = [...fournisseurs].sort((a, b) => (b.volumeAchats || 0) - (a.volumeAchats || 0)).slice(0, 5);
        const critiqueFournisseurs = fournisseurs.filter(f => f.notationInterne === 'D' || f.notationInterne === 'C');

        const subTabs = [
          { key: 'kpis', label: t('suppliers.subTabIndicators'), icon: BarChart3 },
          { key: 'charts', label: t('suppliers.subTabCharts'), icon: PieChart },
          { key: 'performance', label: t('suppliers.subTabPerformance'), icon: Target },
        ];

        return (
        <div className="space-y-6">
          {/* Sub-tabs */}
          <div className="flex items-center bg-white rounded-xl p-1 border shadow-sm w-fit">
            {subTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button key={tab.key} onClick={() => setAnalyticsSubTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    analyticsSubTab === tab.key ? 'bg-[var(--color-primary)] text-white shadow-md' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}>
                  <Icon className="w-4 h-4" />{tab.label}
                </button>
              );
            })}
          </div>

          {/* Sub-tab: KPIs */}
          {analyticsSubTab === 'kpis' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
                  <Building className="w-5 h-5 text-[var(--color-primary)] mb-3" />
                  <p className="text-lg font-bold text-[var(--color-primary)]">{fournisseurs.length}</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('suppliers.suppliersLabel')}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
                  <ShoppingBag className="w-5 h-5 text-primary-600 mb-3" />
                  <p className="text-lg font-bold text-[var(--color-primary)]">{formatCurrency(totalAchats)}</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('suppliers.colPurchaseVolume')}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
                  <Timer className="w-5 h-5 text-blue-600 mb-3" />
                  <p className="text-lg font-bold text-[var(--color-primary)]">{avgDPO}{t('suppliers.daysShort')}</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('suppliers.kpiAverageDpo')}</p>
                  <p className="text-xs text-blue-500 mt-1">{t('suppliers.dpoFormulaHint')}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
                  <Wallet className="w-5 h-5 text-orange-600 mb-3" />
                  <p className="text-lg font-bold text-[var(--color-primary)]">{formatCurrency(totalEncours)}</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('suppliers.totalOutstanding')}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
                  <Shield className="w-5 h-5 text-green-600 mb-3" />
                  <p className="text-lg font-bold text-[var(--color-primary)]">{avgQualite}/5</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('suppliers.qualityScore')}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
                  <CheckCircle className="w-5 h-5 text-green-600 mb-3" />
                  <p className="text-lg font-bold text-[var(--color-primary)]">
                    {fournisseurs.length > 0 ? Math.round(fournisseurs.filter(f => f.conformite).length / fournisseurs.length * 100) : 0}%
                  </p>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('suppliers.paymentCompliance')}</p>
                  <p className="text-xs text-green-500 mt-1">{t('suppliers.paymentComplianceHint')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
                  <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('suppliers.byCategory')}</h3>
                  <div className="space-y-3">
                    {catData.map((cat) => (
                      <div key={cat.categorie} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700">{cat.categorie}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-gray-900">{cat.count}</span>
                          <span className="text-xs text-gray-500">{formatCurrency(cat.montant)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
                  <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('suppliers.topSuppliers')}</h3>
                  <div className="space-y-3">
                    {topFournisseurs.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">{t('suppliers.noSupplier')}</p>
                    ) : topFournisseurs.map((f, idx) => (
                      <div key={f.id} className="flex items-center justify-between">
                        <div className="flex items-center flex-1">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
                            idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-100 text-gray-700' : 'bg-gray-50 text-gray-600'
                          }`}>{idx + 1}</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[var(--color-primary)] truncate">{f.raisonSociale}</p>
                            <p className="text-xs text-[var(--color-text-secondary)]">{formatCurrency(f.volumeAchats || 0)}</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-[var(--color-primary)]">
                          {totalAchats > 0 ? ((f.volumeAchats || 0) / totalAchats * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab: Graphiques */}
          {analyticsSubTab === 'charts' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
                <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('suppliers.breakdownByCategory')}</h3>
                {catData.some(d => d.montant > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie dataKey="montant" data={catData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} fill="#235A6E"
                        label={({ categorie, percent }) => `${categorie} ${(percent * 100).toFixed(0)}%`}>
                        {catData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-500">
                    <p className="text-sm">{t('suppliers.noPurchaseData')}</p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
                <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('suppliers.performanceAssessment')}</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={analyticsData.performanceFournisseurs}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="critere" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar name="Score" dataKey="score" stroke="#235A6E" fill="#235A6E" fillOpacity={0.6} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Sub-tab: Performance */}
          {analyticsSubTab === 'performance' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
                <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('suppliers.suppliersToWatch')}</h3>
                {critiqueFournisseurs.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">{t('suppliers.allSuppliersGoodRating')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {critiqueFournisseurs.map((f) => (
                      <div key={f.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{f.raisonSociale}</p>
                          <p className="text-xs text-gray-600">{t('suppliers.ratingLine', { rating: String(f.notationInterne), quality: String(f.scoreQualite), ontime: String(f.respectDelais) })}</p>
                        </div>
                        <span className="text-sm font-bold text-red-600">{formatCurrency(f.encoursActuel || 0)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        );
      })()}

      {/* Modal Nouveau Fournisseur — Multi-étapes */}
      {showNewFournisseurModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[var(--color-primary)]">{editingId ? t('suppliers.editSupplier') : t('suppliers.newSupplier')}</h3>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('suppliers.stepOf', { step: String(formStep) })}</p>
                </div>
                <button onClick={() => { setShowNewFournisseurModal(false); setFormStep(1); setEditingId(null); }} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
                </button>
              </div>
              <div className="flex mt-4 space-x-2">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className={`flex-1 h-2 rounded-full ${step <= formStep ? 'bg-[var(--color-primary)]' : 'bg-gray-200'}`} />
                ))}
              </div>
              <div className="flex mt-2 text-xs text-[var(--color-text-secondary)]">
                <span className="flex-1">{t('suppliers.stepIdentification')}</span>
                <span className="flex-1">{t('suppliers.stepAddressContact')}</span>
                <span className="flex-1">{t('suppliers.stepAccounting')}</span>
                <span className="flex-1">{t('suppliers.stepTerms')}</span>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Étape 1: Identification */}
              {formStep === 1 && (
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-[var(--color-primary)] flex items-center">
                    <Building className="w-5 h-5 mr-2 text-[var(--color-primary)]" />{t('suppliers.companyIdentification')}
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.supplierCodeRequired')}</label>
                      <div className="flex space-x-2">
                        <input type="text" value={newFournisseur.code}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, code: e.target.value })}
                          className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                          placeholder="FOU001" />
                        <button type="button"
                          onClick={() => setNewFournisseur({ ...newFournisseur, code: `FOU${String(fournisseurs.length + 1).padStart(3, '0')}` })}
                          className="px-3 py-2 bg-gray-100 text-[var(--color-text-secondary)] rounded-lg hover:bg-gray-200">{t('suppliers.auto')}</button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.categoryRequired')}</label>
                      <select value={newFournisseur.categorie}
                        onChange={(e) => setNewFournisseur({ ...newFournisseur, categorie: e.target.value as Fournisseur['categorie'] })}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]">
                        <option value="STRATEGIQUE">{t('suppliers.categoryStrategic')}</option>
                        <option value="RECURRENT">{t('suppliers.categoryRecurring')}</option>
                        <option value="PONCTUEL">{t('suppliers.categoryOccasional')}</option>
                        <option value="CRITIQUE">{t('suppliers.categoryCritical')}</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.legalNameRequired')}</label>
                      <input type="text" value={newFournisseur.raisonSociale}
                        onChange={(e) => setNewFournisseur({ ...newFournisseur, raisonSociale: e.target.value })}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        placeholder={t('suppliers.legalNamePlaceholder')} />
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.tradeName')}</label>
                      <input type="text" value={newFournisseur.nomCommercial}
                        onChange={(e) => setNewFournisseur({ ...newFournisseur, nomCommercial: e.target.value })}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]" />
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.expenseTypeRequired')}</label>
                      <select value={newFournisseur.typeDépense}
                        onChange={(e) => setNewFournisseur({ ...newFournisseur, typeDépense: e.target.value as Fournisseur['typeDépense'] })}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]">
                        <option value="PRODUCTION">{t('suppliers.expenseProduction')}</option>
                        <option value="SERVICES">{t('suppliers.expenseServices')}</option>
                        <option value="INVESTISSEMENT">{t('suppliers.expenseInvestment')}</option>
                        <option value="FRAIS_GENERAUX">{t('suppliers.expenseOverheads')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.businessSector')}</label>
                      <input type="text" value={newFournisseur.secteurActivite}
                        onChange={(e) => setNewFournisseur({ ...newFournisseur, secteurActivite: e.target.value })}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        placeholder={t('suppliers.businessSectorPlaceholder')} />
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--color-text-secondary)] mb-1">RCCM</label>
                      <input type="text" value={newFournisseur.rccm}
                        onChange={(e) => setNewFournisseur({ ...newFournisseur, rccm: e.target.value })}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        placeholder="RC/YDE/2024/X/XXXX" />
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--color-text-secondary)] mb-1">NIU</label>
                      <input type="text" value={newFournisseur.niu}
                        onChange={(e) => setNewFournisseur({ ...newFournisseur, niu: e.target.value })}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        placeholder="M0XXXXXXXXXX" />
                    </div>
                  </div>
                </div>
              )}

              {/* Étape 2: Adresse & Contact */}
              {formStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-md font-semibold text-[var(--color-primary)] flex items-center mb-4">
                      <MapPin className="w-5 h-5 mr-2 text-[var(--color-primary)]" />{t('suppliers.address')}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.addressRequired')}</label>
                        <input type="text" value={newFournisseur.adresse}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, adresse: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                          placeholder={t('suppliers.addressPlaceholder')} />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.poBox')}</label>
                        <input type="text" value={newFournisseur.codePostal}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, codePostal: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]" placeholder="BP 1234" />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.cityRequired')}</label>
                        <input type="text" value={newFournisseur.ville}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, ville: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]" />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.region')}</label>
                        <input type="text" value={newFournisseur.region}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, region: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]" />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.countryRequired')}</label>
                        <select value={newFournisseur.pays}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, pays: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]">
                          <option value="Cameroun">{t('suppliers.countryCameroon')}</option>
                          <option value="Gabon">{t('suppliers.countryGabon')}</option>
                          <option value="Congo">{t('suppliers.countryCongo')}</option>
                          <option value="Tchad">{t('suppliers.countryChad')}</option>
                          <option value="Guinée Équatoriale">{t('suppliers.countryEquatorialGuinea')}</option>
                          <option value="République Centrafricaine">{t('suppliers.countryCar')}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-md font-semibold text-[var(--color-primary)] flex items-center mb-4">
                      <Users className="w-5 h-5 mr-2 text-[var(--color-primary)]" />{t('suppliers.mainContact')}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.contactNameRequired')}</label>
                        <input type="text" value={newFournisseur.contactPrincipal}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, contactPrincipal: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]" />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.jobTitle')}</label>
                        <input type="text" value={newFournisseur.fonction}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, fonction: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                          placeholder={t('suppliers.jobTitlePlaceholder')} />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.emailRequired')}</label>
                        <input type="email" value={newFournisseur.email}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, email: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]" />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.phoneRequired')}</label>
                        <input type="tel" value={newFournisseur.telephone}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, telephone: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                          placeholder="+237 6XX XXX XXX" />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.secondaryPhone')}</label>
                        <input type="tel" value={newFournisseur.telephoneSecondaire}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, telephoneSecondaire: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Étape 3: Comptabilité */}
              {formStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-md font-semibold text-[var(--color-primary)] flex items-center mb-4">
                      <BookOpen className="w-5 h-5 mr-2 text-[var(--color-primary)]" />{t('suppliers.syscohadaAccountingSettings')}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.supplierTypeRequired')}</label>
                        <select
                          value={newFournisseur.typeFournisseur}
                          onChange={async (e) => {
                            const typeFournisseur = e.target.value as 'local' | 'etranger';
                            const compteCollectif = typeFournisseur === 'etranger' ? '404' : '401';
                            setNewFournisseur(prev => ({ ...prev, typeFournisseur, compteComptable: compteCollectif }));
                            try {
                              const mappings = await loadMappings(adapter);
                              const { compteAuxiliaire, codeCommercial } = await generateNextCode(adapter, compteCollectif, mappings);
                              setNewFournisseur(prev => ({ ...prev, typeFournisseur, compteComptable: compteCollectif, compteAuxiliaire, codeCommercial }));
                            } catch { /* ignore */ }
                          }}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        >
                          <option value="local">{t('suppliers.supplierTypeLocal')}</option>
                          <option value="etranger">{t('suppliers.supplierTypeForeign')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.supplierAccountRequired')}</label>
                        <div className="flex space-x-2">
                          <input type="text" value={newFournisseur.compteComptable}
                            onChange={(e) => setNewFournisseur({ ...newFournisseur, compteComptable: e.target.value })}
                            className="w-24 px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] font-mono" placeholder="401" />
                          <input type="text" value={newFournisseur.compteAuxiliaire}
                            onChange={(e) => setNewFournisseur({ ...newFournisseur, compteAuxiliaire: e.target.value })}
                            className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] font-mono" placeholder={t('suppliers.subsidiaryAccountPlaceholder')} />
                        </div>
                        <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{t('suppliers.supplierAccountHint')}</p>
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.commercialCode')}</label>
                        <input type="text" value={newFournisseur.codeCommercial}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, codeCommercial: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
                          placeholder={t('suppliers.commercialCodePlaceholder')} />
                        <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{t('suppliers.commercialCodeHint')}</p>
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.purchaseJournalRequired')}</label>
                        <select value={newFournisseur.journalAchats}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, journalAchats: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]">
                          <option value="AC">{t('suppliers.journalAc')}</option>
                          <option value="AI">{t('suppliers.journalAi')}</option>
                          <option value="FG">{t('suppliers.journalFg')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.vatRate')}</label>
                        <select value={newFournisseur.tauxTVA}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, tauxTVA: parseFloat(e.target.value) })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]">
                          <option value={19.25}>{t('suppliers.vatStandardCameroon')}</option>
                          <option value={18}>{t('suppliers.vatCemacStandard')}</option>
                          <option value={0}>{t('suppliers.vatExempt')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.currencyRequired')}</label>
                        <select value={newFournisseur.devise}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, devise: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]">
                          <option value="XAF">{t('suppliers.currencyXaf')}</option>
                          <option value="EUR">{t('suppliers.currencyEur')}</option>
                          <option value="USD">{t('suppliers.currencyUsd')}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-md font-semibold text-[var(--color-primary)] flex items-center mb-4">
                      <CreditCard className="w-5 h-5 mr-2 text-[var(--color-primary)]" />{t('suppliers.bankDetailsOptional')}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.bank')}</label>
                        <input type="text" value={newFournisseur.banque}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, banque: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]" placeholder={t('suppliers.bankPlaceholder')} />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.swiftCode')}</label>
                        <input type="text" value={newFournisseur.swift}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, swift: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] font-mono" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.ibanRib')}</label>
                        <input type="text" value={newFournisseur.iban}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, iban: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
                          placeholder="CM21 XXXX XXXX XXXX XXXX XXXX XXX" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Étape 4: Conditions commerciales */}
              {formStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-md font-semibold text-[var(--color-primary)] flex items-center mb-4">
                      <CreditCard className="w-5 h-5 mr-2 text-[var(--color-primary)]" />{t('suppliers.paymentTermsSection')}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.paymentMethodRequired')}</label>
                        <select value={newFournisseur.modeReglement}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, modeReglement: e.target.value as Fournisseur['modeReglement'] })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]">
                          <option value="VIREMENT">{t('suppliers.paymentTransfer')}</option>
                          <option value="CHEQUE">{t('suppliers.paymentCheque')}</option>
                          <option value="PRELEVEMENT">{t('suppliers.paymentDirectDebit')}</option>
                          <option value="TRAITE">{t('suppliers.paymentDraft')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.paymentDelayRequired')}</label>
                        <select value={newFournisseur.delaiPaiement}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, delaiPaiement: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]">
                          <option value={0}>{t('suppliers.termCash')}</option>
                          <option value={15}>{t('suppliers.term15')}</option>
                          <option value={30}>{t('suppliers.term30')}</option>
                          <option value={45}>{t('suppliers.term45')}</option>
                          <option value={60}>{t('suppliers.term60Eom')}</option>
                          <option value={90}>{t('suppliers.term90')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.creditLimitXaf')}</label>
                        <input type="number" value={newFournisseur.limiteCredit}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, limiteCredit: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]" />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.discountPercent')}</label>
                        <input type="number" step="0.5" value={newFournisseur.escompte}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, escompte: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]" placeholder="0" />
                      </div>
                    </div>
                  </div>

                  {/* Récapitulatif */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-[var(--color-primary)] mb-3">{t('suppliers.summary')}</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="text-[var(--color-text-secondary)]">{t('suppliers.summaryCode')}</span> <span className="ml-2 font-medium">{newFournisseur.code || '-'}</span></div>
                      <div><span className="text-[var(--color-text-secondary)]">{t('suppliers.summaryLegalName')}</span> <span className="ml-2 font-medium">{newFournisseur.raisonSociale || '-'}</span></div>
                      <div><span className="text-[var(--color-text-secondary)]">{t('suppliers.summaryAccount')}</span> <span className="ml-2 font-mono">{fmtAccount(`${newFournisseur.compteComptable}${newFournisseur.compteAuxiliaire}`)}</span></div>
                      <div><span className="text-[var(--color-text-secondary)]">{t('suppliers.summaryNiu')}</span> <span className="ml-2 font-mono">{newFournisseur.niu || '-'}</span></div>
                      <div><span className="text-[var(--color-text-secondary)]">{t('suppliers.summaryPaymentTerms')}</span> <span className="ml-2 font-medium">{newFournisseur.delaiPaiement} {t('suppliers.days')}</span></div>
                      <div><span className="text-[var(--color-text-secondary)]">{t('suppliers.summaryCreditLimit')}</span> <span className="ml-2 font-medium">{formatCurrency(newFournisseur.limiteCredit)}</span></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-[var(--color-border)] flex justify-between">
              <button type="button"
                onClick={() => formStep > 1 ? setFormStep(formStep - 1) : (setShowNewFournisseurModal(false), setFormStep(1), setEditingId(null))}
                className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-[var(--color-text-secondary)] hover:bg-gray-50">
                {formStep > 1 ? t('suppliers.previous') : t('suppliers.cancel')}
              </button>
              <div className="flex space-x-3">
                {formStep < 4 ? (
                  <button type="button" onClick={() => setFormStep(formStep + 1)}
                    className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90">{t('suppliers.next')}</button>
                ) : (
                  <button type="button"
                    onClick={async () => {
                      if (!newFournisseur.code || !newFournisseur.raisonSociale) return;
                      try {
                        const fpayload = {
                          code: newFournisseur.code, name: newFournisseur.raisonSociale,
                          email: newFournisseur.email, phone: newFournisseur.telephone,
                          address: `${newFournisseur.adresse}, ${newFournisseur.ville}, ${newFournisseur.pays}`,
                          taxId: newFournisseur.niu,
                          conditionsPaiement: { delaiJours: newFournisseur.delaiPaiement, modePaiement: newFournisseur.modeReglement.toLowerCase() },
                        };
                        if (editingId) {
                          await adapter.update('thirdParties', editingId, fpayload);
                        } else {
                          await adapter.create('thirdParties', { ...fpayload, type: 'supplier' });
                        }
                        setShowNewFournisseurModal(false); setFormStep(1); setEditingId(null);
                        const tp = await adapter.getAll<any>('thirdParties');
                        const suppliers = tp.filter((t: any) => t.type === 'supplier' || t.type === 'both' || /^40/.test(t.code || ''));
                        setFournisseurs(suppliers.map((s: any) => ({
                          ...s, id: s.id, code: s.code || '', raisonSociale: s.name || '',
                          categorie: 'RECURRENT', typeDépense: 'FRAIS_GENERAUX', pays: 'Cameroun',
                          secteurActivite: '', volumeAchats: 0, encoursActuel: 0, dpo: 0,
                          limiteCredit: 0, delaiPaiement: 30, modeReglement: 'VIREMENT',
                          devise: 'XAF', scoreQualite: 0, respectDelais: 0,
                          notationInterne: 'B', conformite: true, statut: 'ACTIF',
                        } as Fournisseur)));
 } catch (err) { /* ignored */ }
                    }}
                    className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 font-semibold">
                    {editingId ? t('suppliers.saveChanges') : t('suppliers.createSupplier')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Édition Fournisseur */}
      {/* Fiche Fournisseur (lecture seule + écritures) — bouton œil */}
      {viewingFournisseur && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h3 className="text-lg font-bold text-[var(--color-primary)]">{viewingFournisseur.raisonSociale}</h3>
                <p className="text-sm text-gray-500 font-mono">{viewingFournisseur.code}</p>
              </div>
              <button onClick={() => setViewingFournisseur(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><span className="text-gray-500">{t('suppliers.fieldStatus')}</span><p className="font-medium">{viewingFournisseur.statut}</p></div>
                <div><span className="text-gray-500">{t('suppliers.fieldPhone')}</span><p className="font-medium">{viewingFournisseur.telephoneComptable || '—'}</p></div>
                <div><span className="text-gray-500">{t('suppliers.fieldEmail')}</span><p className="font-medium">{viewingFournisseur.emailComptable || '—'}</p></div>
                <div><span className="text-gray-500">{t('suppliers.fieldOutstanding')}</span><p className="font-semibold text-[var(--color-primary)]">{formatCurrency(viewingFournisseur.encoursActuel)}</p></div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('suppliers.journalEntriesCount', { count: String((fournisseurLinesMap[viewingFournisseur.id] || []).length) })}</h4>
                <div className="border rounded-lg overflow-auto max-h-[40vh]">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-600 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2">{t('suppliers.colDate')}</th>
                        <th className="text-left px-3 py-2">{t('suppliers.colDocument')}</th>
                        <th className="text-left px-3 py-2">{t('suppliers.colLabel')}</th>
                        <th className="text-right px-3 py-2">{t('suppliers.colDebit')}</th>
                        <th className="text-right px-3 py-2">{t('suppliers.colCredit')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(fournisseurLinesMap[viewingFournisseur.id] || []).length === 0 && (
                        <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-500">{t('suppliers.noEntriesForSupplier')}</td></tr>
                      )}
                      {(fournisseurLinesMap[viewingFournisseur.id] || []).slice(0, 300).map((l, i) => (
                        <tr key={i} className="border-t hover:bg-gray-50">
                          <td className="px-3 py-1.5 whitespace-nowrap">{l.date}</td>
                          <td className="px-3 py-1.5 whitespace-nowrap">{l.piece}</td>
                          <td className="px-3 py-1.5">{l.libelle}</td>
                          <td className="px-3 py-1.5 text-right text-red-600 whitespace-nowrap">{l.debit ? formatCurrency(l.debit) : ''}</td>
                          <td className="px-3 py-1.5 text-right text-green-600 whitespace-nowrap">{l.credit ? formatCurrency(l.credit) : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                    {(fournisseurLinesMap[viewingFournisseur.id] || []).length > 0 && (
                      <tfoot className="sticky bottom-0 bg-gray-100 border-t-2 border-gray-300 font-semibold text-gray-900">
                        <tr>
                          <td className="px-3 py-2" colSpan={3}>{t('suppliers.totalCount', { count: String((fournisseurLinesMap[viewingFournisseur.id] || []).length) })}</td>
                          <td className="px-3 py-2 text-right text-red-700 whitespace-nowrap">{formatCurrency((fournisseurLinesMap[viewingFournisseur.id] || []).reduce((s, l) => s + (l.debit || 0), 0))}</td>
                          <td className="px-3 py-2 text-right text-green-700 whitespace-nowrap">{formatCurrency((fournisseurLinesMap[viewingFournisseur.id] || []).reduce((s, l) => s + (l.credit || 0), 0))}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button onClick={() => { const f = viewingFournisseur; setViewingFournisseur(null); if (f) handleEditFournisseur(f); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">{t('suppliers.edit')}</button>
              <button onClick={() => setViewingFournisseur(null)} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm">{t('suppliers.close')}</button>
            </div>
          </div>
        </div>
      )}

      {editingFournisseur && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[var(--color-primary)]">{t('suppliers.editSupplierTitle')}</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">{editingFournisseur.code} — {editingFournisseur.raisonSociale}</p>
              </div>
              <button onClick={() => setEditingFournisseur(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Identification */}
              <div>
                <h4 className="text-sm font-semibold text-[var(--color-primary)] flex items-center mb-3">
                  <Building className="w-4 h-4 mr-2" />{t('suppliers.stepIdentification')}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.legalNameRequired')}</label>
                    <input
                      type="text"
                      value={editForm.raisonSociale}
                      onChange={(e) => setEditForm({ ...editForm, raisonSociale: e.target.value })}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.taxIdNif')}</label>
                    <input
                      type="text"
                      value={editForm.nif}
                      onChange={(e) => setEditForm({ ...editForm, nif: e.target.value })}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                      placeholder="M0XXXXXXXXXX"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.category')}</label>
                    <select
                      value={editForm.categorie}
                      onChange={(e) => setEditForm({ ...editForm, categorie: e.target.value as Fournisseur['categorie'] })}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      <option value="STRATEGIQUE">{t('suppliers.categoryStrategic')}</option>
                      <option value="RECURRENT">{t('suppliers.categoryRecurring')}</option>
                      <option value="PONCTUEL">{t('suppliers.categoryOccasional')}</option>
                      <option value="CRITIQUE">{t('suppliers.categoryCritical')}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div>
                <h4 className="text-sm font-semibold text-[var(--color-primary)] flex items-center mb-3">
                  <Phone className="w-4 h-4 mr-2" />{t('suppliers.contactSection')}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.phone')}</label>
                    <input
                      type="tel"
                      value={editForm.telephone}
                      onChange={(e) => setEditForm({ ...editForm, telephone: e.target.value })}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                      placeholder="+237 6XX XXX XXX"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.email')}</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.address')}</label>
                    <input
                      type="text"
                      value={editForm.adresse}
                      onChange={(e) => setEditForm({ ...editForm, adresse: e.target.value })}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                      placeholder={t('suppliers.addressPlaceholderShort')}
                    />
                  </div>
                </div>
              </div>

              {/* Comptabilité */}
              <div>
                <h4 className="text-sm font-semibold text-[var(--color-primary)] flex items-center mb-3">
                  <BookOpen className="w-4 h-4 mr-2" />{t('suppliers.syscohadaAccountingSettings')}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.supplierType')}</label>
                    <select
                      value={editForm.typeFournisseur}
                      onChange={(e) => {
                        const typeFournisseur = e.target.value as 'local' | 'etranger';
                        setEditForm({ ...editForm, typeFournisseur, compteComptable: typeFournisseur === 'etranger' ? '404' : '401' });
                      }}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      <option value="local">{t('suppliers.supplierTypeLocal')}</option>
                      <option value="etranger">{t('suppliers.supplierTypeForeign')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.controlAccount')}</label>
                    <input
                      type="text"
                      value={editForm.compteComptable}
                      readOnly
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-gray-50 font-mono text-[var(--color-text-secondary)]"
                    />
                  </div>
                </div>
              </div>

              {/* Conditions commerciales */}
              <div>
                <h4 className="text-sm font-semibold text-[var(--color-primary)] flex items-center mb-3">
                  <CreditCard className="w-4 h-4 mr-2" />{t('suppliers.commercialTerms')}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.paymentMethod')}</label>
                    <select
                      value={editForm.modeReglement}
                      onChange={(e) => setEditForm({ ...editForm, modeReglement: e.target.value as Fournisseur['modeReglement'] })}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      <option value="VIREMENT">{t('suppliers.paymentTransfer')}</option>
                      <option value="CHEQUE">{t('suppliers.paymentCheque')}</option>
                      <option value="PRELEVEMENT">{t('suppliers.paymentDirectDebit')}</option>
                      <option value="TRAITE">{t('suppliers.paymentDraft')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.paymentDelay')}</label>
                    <select
                      value={editForm.delaiPaiement}
                      onChange={(e) => setEditForm({ ...editForm, delaiPaiement: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      <option value={0}>{t('suppliers.termCash')}</option>
                      <option value={15}>{t('suppliers.term15')}</option>
                      <option value={30}>{t('suppliers.term30')}</option>
                      <option value={45}>{t('suppliers.term45')}</option>
                      <option value={60}>{t('suppliers.term60Eom')}</option>
                      <option value={90}>{t('suppliers.term90')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{t('suppliers.status')}</label>
                    <select
                      value={editForm.statut}
                      onChange={(e) => setEditForm({ ...editForm, statut: e.target.value as Fournisseur['statut'] })}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      <option value="ACTIF">{t('suppliers.statusActive')}</option>
                      <option value="BLOQUE">{t('suppliers.statusBlocked')}</option>
                      <option value="SUSPENDU">{t('suppliers.statusSuspended')}</option>
                      <option value="INACTIF">{t('suppliers.statusInactive')}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[var(--color-border)] flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setEditingFournisseur(null)}
                className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-[var(--color-text-secondary)] hover:bg-gray-50"
              >
                {t('suppliers.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="flex items-center space-x-2 px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 font-semibold"
              >
                <Save className="w-4 h-4" />
                <span>{t('suppliers.save')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Period Selector Modal */}
      <PeriodSelectorModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        initialDateRange={{ start: dateRange.startDate, end: dateRange.endDate }}
        onApply={(newRange) => {
          setDateRange(prev => ({ ...prev, startDate: newRange.start, endDate: newRange.end }));
          setShowPeriodModal(false);
        }}
      />
    </div>
  );
};

export default FournisseursModule;