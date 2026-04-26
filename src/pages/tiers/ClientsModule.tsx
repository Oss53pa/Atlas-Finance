// @ts-nocheck

import React, { useState, useEffect, useMemo } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';
import ExportMenu from '../../components/shared/ExportMenu';
import {
  Search, Plus, Filter, Eye, Edit, Trash2, X,
  Building, TrendingUp, AlertTriangle, CheckCircle, Clock,
  Euro, Calendar, FileText, Mail, Phone, MapPin,
  Users, Target, Activity, BarChart3, PieChart,
  DollarSign, TrendingDown, RefreshCw, ChevronUp, ChevronDown,
  Info, Database, Globe, Shield, Zap, Award, AlertCircle,
  CreditCard, Landmark, FileCheck, Printer, Download,
  BookOpen, Wallet, Receipt, AlertOctagon, Timer
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart as RechartsPieChart, Pie, Cell, LineChart, Line, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

// Interface Client complète avec données comptables
interface Client {
  id: string;
  code: string;
  raisonSociale: string;
  nomCommercial?: string;
  categorie: 'GRAND_COMPTE' | 'PME' | 'TPE' | 'PARTICULIER';
  secteurActivite: string;
  pays: string;

  // Données comptables SYSCOHADA
  compteComptable: string; // 411xxx
  compteAuxiliaire: string;
  journalVentes: string;

  // Données administratives
  rccm: string; // Registre du Commerce
  niu: string; // Numéro d'Identification Unique
  regimeTVA: 'REEL_NORMAL' | 'REEL_SIMPLIFIE' | 'FORFAIT' | 'EXONERE';
  tauxTVA: number;

  // Adresse complète
  adresse: string;
  codePostal: string;
  ville: string;
  region: string;

  // Données financières
  chiffreAffaires: number;
  encoursActuel: number;
  dso: number;
  limiteCredit: number;

  // Conditions commerciales
  delaiPaiement: number;
  remise?: number;
  escompte?: number;
  modeReglement: 'VIREMENT' | 'CHEQUE' | 'PRELEVEMENT' | 'ESPECES' | 'TRAITE' | 'MOBILE_MONEY';
  devise: string;

  // Coordonnées bancaires
  banque?: string;
  iban?: string;
  swift?: string;

  // Évaluation
  scoreCredit: number;
  tauxRecouvrement: number;
  notationInterne: 'A' | 'B' | 'C' | 'D';
  fidele: boolean;

  // Contact
  contactPrincipal: string;
  email: string;
  telephone: string;
  telephoneSecondaire?: string;
  fax?: string;

  // Statut
  statut: 'ACTIF' | 'BLOQUE' | 'SUSPENDU' | 'INACTIF';
  derniereFacture?: string;
  prochainPaiement?: string;
  alertes: number;

  // Balance âgée
  nonEchu: number;
  echu0_30: number;
  echu31_60: number;
  echu61_90: number;
  echuPlus90: number;
}

// Interface formulaire nouveau client
interface NewClientForm {
  // Identification
  code: string;
  raisonSociale: string;
  nomCommercial: string;
  categorie: 'GRAND_COMPTE' | 'PME' | 'TPE' | 'PARTICULIER';
  secteurActivite: string;

  // Données administratives
  rccm: string;
  niu: string;
  regimeTVA: 'REEL_NORMAL' | 'REEL_SIMPLIFIE' | 'FORFAIT' | 'EXONERE';

  // Adresse
  adresse: string;
  codePostal: string;
  ville: string;
  region: string;
  pays: string;

  // Contacts
  contactPrincipal: string;
  fonction: string;
  email: string;
  telephone: string;
  telephoneSecondaire: string;
  fax: string;

  // Données comptables
  compteComptable: string;
  compteAuxiliaire: string;
  journalVentes: string;

  // Conditions commerciales
  delaiPaiement: number;
  limiteCredit: number;
  modeReglement: 'VIREMENT' | 'CHEQUE' | 'PRELEVEMENT' | 'ESPECES' | 'TRAITE' | 'MOBILE_MONEY';
  devise: string;
  remise: number;
  escompte: number;
  tauxTVA: number;

  // Coordonnées bancaires
  banque: string;
  iban: string;
  swift: string;
}

// Interface Balance Âgée
interface BalanceAgeeItem {
  clientId: string;
  clientCode: string;
  clientNom: string;
  totalCreances: number;
  nonEchu: number;
  echu0_30: number;
  echu31_60: number;
  echu61_90: number;
  echuPlus90: number;
  provision: number;
}

const ClientsModule: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { adapter } = useData();

  // États
  const [isLoading, setIsLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [activeTab, setActiveTab] = useState<string>('liste');
  const [analyticsSubTab, setAnalyticsSubTab] = useState<string>('kpis');
  const [balanceAgeeSubTab, setBalanceAgeeSubTab] = useState<'repartition' | 'detail' | 'risques'>('repartition');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatut, setSelectedStatut] = useState<string>('all');
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [showPeriodModal, setShowPeriodModal] = useState<boolean>(false);
  const [showNewClientModal, setShowNewClientModal] = useState<boolean>(false);
  const [formStep, setFormStep] = useState<number>(1);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    period: 'month' as 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
  });
  const [compareMode, setCompareMode] = useState<boolean>(false);

  // État formulaire nouveau client
  const [newClient, setNewClient] = useState<NewClientForm>({
    code: '',
    raisonSociale: '',
    nomCommercial: '',
    categorie: 'PME',
    secteurActivite: '',
    rccm: '',
    niu: '',
    regimeTVA: 'REEL_NORMAL',
    adresse: '',
    codePostal: '',
    ville: '',
    region: '',
    pays: 'Cameroun',
    contactPrincipal: '',
    fonction: '',
    email: '',
    telephone: '',
    telephoneSecondaire: '',
    fax: '',
    compteComptable: '411',
    compteAuxiliaire: '',
    journalVentes: 'VE',
    delaiPaiement: 30,
    limiteCredit: 500000,
    modeReglement: 'VIREMENT',
    devise: 'XAF',
    remise: 0,
    escompte: 0,
    tauxTVA: 19.25,
    banque: '',
    iban: '',
    swift: ''
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

        const customers = allThirdParties.filter(
          (tp: any) => tp.type === 'customer' || tp.type === 'both'
        );

        const clientsData: Client[] = customers.map((tp: any) => {
          const relatedLines: { debit: number; credit: number; date: string }[] = [];
          allEntries.forEach((entry: any) => {
            if (entry.status === 'draft') return;
            (entry.lines || []).forEach((line: any) => {
              if (line.thirdPartyCode === tp.code || line.accountCode === tp.accountCode) {
                relatedLines.push({ debit: line.debit || 0, credit: line.credit || 0, date: entry.date });
              }
            });
          });

          const totalDebit = relatedLines.reduce((s, l) => s + l.debit, 0);
          const totalCredit = relatedLines.reduce((s, l) => s + l.credit, 0);
          const encours = totalDebit - totalCredit;

          return {
            id: tp.id,
            code: tp.code || '',
            raisonSociale: tp.name || '',
            nomCommercial: tp.name,
            categorie: 'PME' as const,
            secteurActivite: '',
            pays: '',
            compteComptable: tp.accountCode || '411000',
            compteAuxiliaire: tp.code || '',
            journalVentes: 'VE',
            rccm: tp.rccm || '',
            niu: tp.taxId || '',
            regimeTVA: tp.regimeFiscal === 'RNI' ? 'REEL_NORMAL' as const : 'REEL_SIMPLIFIE' as const,
            tauxTVA: 19.25,
            adresse: tp.address || '',
            codePostal: '',
            ville: '',
            region: '',
            chiffreAffaires: totalDebit,
            encoursActuel: Math.max(encours, 0),
            dso: tp.conditionsPaiement?.delaiJours || 30,
            limiteCredit: 0,
            delaiPaiement: tp.conditionsPaiement?.delaiJours || 30,
            remise: 0,
            escompte: tp.conditionsPaiement?.escompte || 0,
            modeReglement: (tp.conditionsPaiement?.modePaiement === 'virement' ? 'VIREMENT' : tp.conditionsPaiement?.modePaiement === 'cheque' ? 'CHEQUE' : 'VIREMENT') as 'VIREMENT' | 'CHEQUE',
            devise: 'XAF',
            banque: tp.banque?.nomBanque,
            iban: tp.banque?.iban,
            swift: tp.banque?.swift,
            scoreCredit: tp.isActive ? 80 : 40,
            tauxRecouvrement: 0,
            notationInterne: 'B' as const,
            fidele: tp.isActive,
            contactPrincipal: '',
            email: tp.email || '',
            telephone: tp.phone || '',
            statut: tp.isActive ? 'ACTIF' as const : 'INACTIF' as const,
            alertes: 0,
            nonEchu: Math.max(encours, 0),
            echu0_30: 0,
            echu31_60: 0,
            echu61_90: 0,
            echuPlus90: 0
          };
        });

        if (mounted) {
          setClients(clientsData);
        }
      } catch (err) {
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    loadData();
    return () => { mounted = false; };
  }, [adapter]);

  // Données Balance Âgée
  const balanceAgeeData: BalanceAgeeItem[] = useMemo(() => clients.map(client => ({
    clientId: client.id,
    clientCode: client.code,
    clientNom: client.raisonSociale,
    totalCreances: client.nonEchu + client.echu0_30 + client.echu31_60 + client.echu61_90 + client.echuPlus90,
    nonEchu: client.nonEchu,
    echu0_30: client.echu0_30,
    echu31_60: client.echu31_60,
    echu61_90: client.echu61_90,
    echuPlus90: client.echuPlus90,
    provision: client.echuPlus90 * 0.5 + client.echu61_90 * 0.2 // Provision pour créances douteuses
  })), [clients]);

  // Calculs totaux Balance Âgée
  const totauxBalanceAgee = useMemo(() => balanceAgeeData.reduce((acc, item) => ({
    totalCreances: acc.totalCreances + item.totalCreances,
    nonEchu: acc.nonEchu + item.nonEchu,
    echu0_30: acc.echu0_30 + item.echu0_30,
    echu31_60: acc.echu31_60 + item.echu31_60,
    echu61_90: acc.echu61_90 + item.echu61_90,
    echuPlus90: acc.echuPlus90 + item.echuPlus90,
    provision: acc.provision + item.provision
  }), {
    totalCreances: 0, nonEchu: 0, echu0_30: 0, echu31_60: 0, echu61_90: 0, echuPlus90: 0, provision: 0
  }), [balanceAgeeData]);

  const filteredClients = useMemo(() => clients.filter(client => {
    const matchSearch = client.raisonSociale.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       client.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       client.secteurActivite.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       client.compteComptable.includes(searchTerm);
    const matchCategory = selectedCategory === 'all' || client.categorie === selectedCategory;
    const matchStatut = selectedStatut === 'all' || client.statut === selectedStatut;

    return matchSearch && matchCategory && matchStatut;
  }), [clients, searchTerm, selectedCategory, selectedStatut]);


  const getCategorieColor = (categorie: string) => {
    switch (categorie) {
      case 'GRAND_COMPTE': return 'bg-primary-100 text-primary-800';
      case 'PME': return 'bg-blue-100 text-blue-800';
      case 'TPE': return 'bg-green-100 text-green-800';
      case 'PARTICULIER': return 'bg-gray-100 text-gray-800';
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
      setSelectedClients(filteredClients.map(c => c.id));
    } else {
      setSelectedClients([]);
    }
  };

  const handleSelectClient = (id: string) => {
    if (selectedClients.includes(id)) {
      setSelectedClients(selectedClients.filter(cId => cId !== id));
    } else {
      setSelectedClients([...selectedClients, id]);
    }
  };

  const handleOpenNewClientModal = () => {
    setShowNewClientModal(true);
    setFormStep(1);
  };

  const handleCloseNewClientModal = () => {
    setShowNewClientModal(false);
    setFormStep(1);
    setNewClient({
      code: '',
      raisonSociale: '',
      nomCommercial: '',
      categorie: 'PME',
      secteurActivite: '',
      rccm: '',
      niu: '',
      regimeTVA: 'REEL_NORMAL',
      adresse: '',
      codePostal: '',
      ville: '',
      region: '',
      pays: 'Cameroun',
      contactPrincipal: '',
      fonction: '',
      email: '',
      telephone: '',
      telephoneSecondaire: '',
      fax: '',
      compteComptable: '411',
      compteAuxiliaire: '',
      journalVentes: 'VE',
      delaiPaiement: 30,
      limiteCredit: 500000,
      modeReglement: 'VIREMENT',
      devise: 'XAF',
      remise: 0,
      escompte: 0,
      tauxTVA: 19.25,
      banque: '',
      iban: '',
      swift: ''
    });
  };

  const handleSaveNewClient = () => {
    handleCloseNewClientModal();
  };

  const handleViewClient = (clientId: string) => {
    navigate(`/tiers/clients/${clientId}`);
  };

  const handleEditClient = (clientId: string) => {
  };

  const handleDeleteClient = (clientId: string) => {
  };

  // Générer code client automatique
  const generateClientCode = () => {
    const lastCode = clients.length > 0 ? parseInt(clients[clients.length - 1].code.replace(/[^0-9]/g, '') || '0') : 0;
    const newCode = `CLI${String(lastCode + 1).padStart(3, '0')}`;
    setNewClient({ ...newClient, code: newCode, compteAuxiliaire: newCode });
  };

  // Calcul des statistiques
  const { totalEncours, totalCA, moyenneDSO, clientsActifs } = useMemo(() => ({
    totalEncours: clients.reduce((sum, c) => sum + c.encoursActuel, 0),
    totalCA: clients.reduce((sum, c) => sum + c.chiffreAffaires, 0),
    moyenneDSO: Math.round(clients.reduce((sum, c) => sum + c.dso, 0) / clients.length),
    clientsActifs: clients.filter(c => c.statut === 'ACTIF').length,
  }), [clients]);

  // Analytics Data computed from real clients
  const analyticsData = useMemo(() => {
    const categories = ['GRAND_COMPTE', 'PME', 'TPE', 'PARTICULIER'] as const;
    const clientsParCategorie = categories.map(cat => ({
      categorie: cat,
      count: clients.filter(c => c.categorie === cat).length,
      montant: clients.filter(c => c.categorie === cat).reduce((s, c) => s + c.chiffreAffaires, 0)
    }));
    return {
      clientsParCategorie,
      evolutionCA: [] as { mois: string; ca2024: number; ca2025: number }[],
      performanceClients: [
        { critere: 'Fidélité', score: clients.length > 0 ? Math.round(clients.filter(c => c.fidele).length / clients.length * 100) : 0 },
        { critere: 'Paiement', score: clients.length > 0 ? Math.round(clients.filter(c => c.statut === 'ACTIF').length / clients.length * 100) : 0 },
        { critere: 'Volume', score: clients.length > 0 ? Math.min(100, Math.round(clients.reduce((s, c) => s + c.chiffreAffaires, 0) / 1000000)) : 0 },
        { critere: 'Rentabilité', score: 0 },
        { critere: 'Potentiel', score: 0 }
      ]
    };
  }, [clients]);

  // Data pour graphique Balance Âgée
  const balanceAgeeChartData = [
    { name: 'Non échu', value: totauxBalanceAgee.nonEchu, color: '#22c55e' },
    { name: '0-30 jours', value: totauxBalanceAgee.echu0_30, color: '#f59e0b' },
    { name: '31-60 jours', value: totauxBalanceAgee.echu31_60, color: '#f59e0b' },
    { name: '61-90 jours', value: totauxBalanceAgee.echu61_90, color: '#ef4444' },
    { name: '+90 jours', value: totauxBalanceAgee.echuPlus90, color: '#ef4444' }
  ];

  const COLORS = ['#171717', '#525252', '#a3a3a3', '#3b82f6', '#22c55e', '#f59e0b'];

  const tabs = [
    { id: 'liste', label: 'Liste Clients', icon: Users },
    { id: 'balance-agee', label: 'Balance Âgée', icon: Receipt },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-[var(--color-text-secondary)] mx-auto mb-4" />
          <p className="text-[var(--color-text-secondary)]">Chargement des clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header avec navigation */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-[var(--color-border)]">
        <h2 className="text-lg font-bold text-[var(--color-primary)] mb-6">Gestion des Clients</h2>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mt-6 bg-gray-100 rounded-lg p-1">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-[var(--color-text-tertiary)] shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[#404040]'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            );
          })}
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
                  <p className="text-sm text-primary-600 font-medium">Total Encours</p>
                  <p className="text-lg font-bold text-primary-800">{formatCurrency(totalEncours)}</p>
                  <p className="text-xs text-primary-600 mt-1">Sur {clientsActifs} clients actifs</p>
                </div>
                <Euro className="w-8 h-8 text-primary-400" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Chiffre d'Affaires</p>
                  <p className="text-lg font-bold text-blue-800">{formatCurrency(totalCA)}</p>
                  <p className="text-xs text-blue-600 mt-1">Année en cours</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-400" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">DSO Moyen</p>
                  <p className="text-lg font-bold text-green-800">{moyenneDSO} jours</p>
                  <p className="text-xs text-green-600 mt-1">Délai encaissement</p>
                </div>
                <Clock className="w-8 h-8 text-green-400" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium">Alertes</p>
                  <p className="text-lg font-bold text-orange-800">{clients.reduce((sum, c) => sum + c.alertes, 0)}</p>
                  <p className="text-xs text-orange-600 mt-1">À traiter</p>
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
                placeholder="Rechercher (nom, code, compte comptable)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="all">Toutes catégories</option>
              <option value="GRAND_COMPTE">Grand Compte</option>
              <option value="PME">PME</option>
              <option value="TPE">TPE</option>
              <option value="PARTICULIER">Particulier</option>
            </select>

            <select
              value={selectedStatut}
              onChange={(e) => setSelectedStatut(e.target.value)}
              className="px-4 py-3 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="all">Tous statuts</option>
              <option value="ACTIF">Actif</option>
              <option value="BLOQUE">Bloqué</option>
              <option value="SUSPENDU">Suspendu</option>
              <option value="INACTIF">Inactif</option>
            </select>

            <button
              type="button"
              onClick={handleOpenNewClientModal}
              className="flex items-center space-x-2 px-4 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90"
            >
              <Plus className="w-5 h-5" />
              <span className="font-semibold">Nouveau Client</span>
            </button>
          </div>

          {/* Table des clients */}
          <div className="bg-white rounded-lg shadow-sm border border-[var(--color-border)]">
            <div className="p-4 border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {filteredClients.length} client(s) trouvé(s)
                </p>
                <div className="flex items-center space-x-2">
                  {selectedClients.length > 0 && (
                    <span className="text-sm text-[var(--color-primary)] font-medium">
                      {selectedClients.length} sélectionné(s)
                    </span>
                  )}
                  <ExportMenu
                    data={filteredClients}
                    filename="clients"
                    columns={{
                      code: 'Code',
                      compteComptable: 'Compte',
                      raisonSociale: 'Client',
                      niu: 'NIU',
                      secteurActivite: 'Secteur',
                      categorie: 'Catégorie',
                      pays: 'Pays',
                      encoursActuel: 'Encours',
                      chiffreAffaires: 'CA',
                      dso: 'DSO',
                      notationInterne: 'Note',
                      statut: 'Statut'
                    }}
                    buttonText={t('common.export')}
                    buttonVariant="outline"
                  />
                  <button
                    type="button"
                    className="flex items-center space-x-2 px-3 py-2 text-sm border border-[var(--color-border)] rounded hover:bg-gray-50"
                  >
                    <Filter className="w-4 h-4" />
                    <span>Plus de filtres</span>
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
                        checked={selectedClients.length === filteredClients.length && filteredClients.length > 0}
                        onChange={handleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-[var(--color-text-secondary)]">Code</th>
                    <th className="text-left p-3 text-sm font-medium text-[var(--color-text-secondary)]">Compte</th>
                    <th className="text-left p-3 text-sm font-medium text-[var(--color-text-secondary)]">Client</th>
                    <th className="text-left p-3 text-sm font-medium text-[var(--color-text-secondary)]">NIU/RCCM</th>
                    <th className="text-left p-3 text-sm font-medium text-[var(--color-text-secondary)]">Catégorie</th>
                    <th className="text-right p-3 text-sm font-medium text-[var(--color-text-secondary)]">Encours</th>
                    <th className="text-center p-3 text-sm font-medium text-[var(--color-text-secondary)]">DSO</th>
                    <th className="text-center p-3 text-sm font-medium text-[var(--color-text-secondary)]">Note</th>
                    <th className="text-center p-3 text-sm font-medium text-[var(--color-text-secondary)]">Statut</th>
                    <th className="text-center p-3 text-sm font-medium text-[var(--color-text-secondary)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="border-t border-[var(--color-border)] hover:bg-gray-50">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedClients.includes(client.id)}
                          onChange={() => handleSelectClient(client.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="p-3">
                        <span className="text-sm font-medium text-[var(--color-primary)]">{client.code}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm font-mono text-[var(--color-primary)]">{client.compteComptable}</span>
                      </td>
                      <td className="p-3">
                        <div>
                          <p className="text-sm font-medium text-[var(--color-primary)]">{client.raisonSociale}</p>
                          <p className="text-xs text-[var(--color-text-secondary)]">{client.secteurActivite}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <div>
                          <p className="text-xs font-mono text-[var(--color-text-secondary)]">{client.niu}</p>
                          <p className="text-xs text-[var(--color-text-tertiary)]">{client.rccm}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${getCategorieColor(client.categorie)}`}>
                          {client.categorie.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div>
                          <p className="text-sm font-medium text-[var(--color-primary)]">{formatCurrency(client.encoursActuel)}</p>
                          {client.encoursActuel > client.limiteCredit * 0.8 && (
                            <p className="text-xs text-orange-600">Proche limite</p>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Clock className="w-3 h-3 text-[var(--color-text-secondary)]" />
                          <span className="text-sm text-[var(--color-text-secondary)]">{client.dso}j</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${getNotationColor(client.notationInterne)}`}>
                          {client.notationInterne}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex flex-col items-center space-y-1">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatutColor(client.statut)}`}>
                            {client.statut}
                          </span>
                          {client.alertes > 0 && (
                            <span className="flex items-center space-x-1 text-xs text-orange-600">
                              <AlertCircle className="w-3 h-3" />
                              <span>{client.alertes}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleViewClient(client.id)}
                            className="p-1 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded"
                            title="Voir"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditClient(client.id)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClient(client.id)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                            title="Supprimer"
                          >
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
                Affichage de 1 à {filteredClients.length} sur {filteredClients.length} entrées
              </span>
              <div className="flex items-center space-x-2">
                <button type="button" className="px-3 py-1 border border-[var(--color-border)] rounded text-sm disabled:opacity-50" disabled>
                  Précédent
                </button>
                <button type="button" className="px-3 py-1 bg-[var(--color-primary)] text-white rounded text-sm">1</button>
                <button type="button" className="px-3 py-1 border border-[var(--color-border)] rounded text-sm disabled:opacity-50" disabled>
                  Suivant
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
                <h3 className="text-lg font-semibold text-[var(--color-primary)]">Balance Âgée des Créances Clients</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">Analyse de l'ancienneté des créances au {new Date().toLocaleDateString('fr-FR')}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPeriodModal(true)}
                  className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Date d'arrêté</span>
                </button>
                <ExportMenu
                  data={balanceAgeeData}
                  filename="balance-agee-clients"
                  columns={{
                    clientCode: 'Code Client',
                    clientNom: 'Nom Client',
                    totalCreances: 'Total Créances',
                    nonEchu: 'Non Échu',
                    echu0_30: '0-30 jours',
                    echu31_60: '31-60 jours',
                    echu61_90: '61-90 jours',
                    echuPlus90: '+90 jours',
                    provision: 'Provision'
                  }}
                  buttonText="Exporter"
                />
                <button type="button" className="p-2 text-gray-600 hover:bg-gray-100 rounded" title="Imprimer">
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
              <p className="text-lg font-bold text-[var(--color-primary)]">{formatCurrency(totauxBalanceAgee.totalCreances)}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Total Créances</p>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-xs text-green-600">{((totauxBalanceAgee.nonEchu / totauxBalanceAgee.totalCreances) * 100).toFixed(1)}%</span>
              </div>
              <p className="text-lg font-bold text-green-800">{formatCurrency(totauxBalanceAgee.nonEchu)}</p>
              <p className="text-xs text-green-600">Non Échu</p>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <span className="text-xs text-yellow-600">{((totauxBalanceAgee.echu0_30 / totauxBalanceAgee.totalCreances) * 100).toFixed(1)}%</span>
              </div>
              <p className="text-lg font-bold text-yellow-800">{formatCurrency(totauxBalanceAgee.echu0_30)}</p>
              <p className="text-xs text-yellow-600">0-30 jours</p>
            </div>

            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <span className="text-xs text-orange-600">{((totauxBalanceAgee.echu31_60 / totauxBalanceAgee.totalCreances) * 100).toFixed(1)}%</span>
              </div>
              <p className="text-lg font-bold text-orange-800">{formatCurrency(totauxBalanceAgee.echu31_60)}</p>
              <p className="text-xs text-orange-600">31-60 jours</p>
            </div>

            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <AlertOctagon className="w-5 h-5 text-red-600" />
                <span className="text-xs text-red-600">{(((totauxBalanceAgee.echu61_90 + totauxBalanceAgee.echuPlus90) / totauxBalanceAgee.totalCreances) * 100).toFixed(1)}%</span>
              </div>
              <p className="text-lg font-bold text-red-800">{formatCurrency(totauxBalanceAgee.echu61_90 + totauxBalanceAgee.echuPlus90)}</p>
              <p className="text-xs text-red-600">+60 jours</p>
            </div>

            <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
              <div className="flex items-center justify-between mb-2">
                <Shield className="w-5 h-5 text-primary-600" />
              </div>
              <p className="text-lg font-bold text-primary-800">{formatCurrency(totauxBalanceAgee.provision)}</p>
              <p className="text-xs text-primary-600">Provisions</p>
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
                    ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-gray-50'
                }`}
              >
                <PieChart className="w-4 h-4" />
                <span>Répartition par ancienneté</span>
              </button>
              <button
                type="button"
                onClick={() => setBalanceAgeeSubTab('detail')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
                  balanceAgeeSubTab === 'detail'
                    ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-gray-50'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Détail par client</span>
              </button>
              <button
                type="button"
                onClick={() => setBalanceAgeeSubTab('risques')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
                  balanceAgeeSubTab === 'risques'
                    ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-gray-50'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Clients à risque & Recommandations</span>
              </button>
            </div>

            {/* Contenu sous-onglet: Répartition par ancienneté */}
            {balanceAgeeSubTab === 'repartition' && (
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Graphique Donut Moderne */}
                  <div className="lg:col-span-2 bg-gradient-to-br from-primary-50 to-gray-100 rounded-2xl p-6 shadow-inner">
                    <h4 className="text-lg font-semibold text-[var(--color-primary)] mb-2 text-center">Distribution des Créances</h4>
                    <p className="text-sm text-[var(--color-text-secondary)] text-center mb-4">Répartition par ancienneté</p>
                    <div className="relative">
                      <ResponsiveContainer width="100%" height={320}>
                        <RechartsPieChart>
                          <defs>
                            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                              <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.15"/>
                            </filter>
                          </defs>
                          <Pie
                            data={balanceAgeeChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={120}
                            paddingAngle={3}
                            dataKey="value"
                            cornerRadius={6}
                            stroke="none"
                            filter="url(#shadow)"
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
                          <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wide">Total</p>
                          <p className="text-lg font-bold text-[var(--color-primary)]">{formatCurrency(totauxBalanceAgee.totalCreances)}</p>
                          <p className="text-xs text-[var(--color-text-secondary)]">{balanceAgeeData.length} clients</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Légende détaillée et statistiques */}
                  <div className="lg:col-span-3 space-y-3">
                    <h4 className="text-lg font-semibold text-[var(--color-primary)] mb-4">Détail par Tranche d'Ancienneté</h4>
                    {balanceAgeeChartData.map((item, idx) => {
                      const percent = totauxBalanceAgee.totalCreances > 0
                        ? ((item.value / totauxBalanceAgee.totalCreances) * 100).toFixed(1)
                        : '0';
                      const clientCount = balanceAgeeData.filter(c => {
                        if (item.name === 'Non échu') return c.nonEchu > 0;
                        if (item.name === '0-30 jours') return c.echu0_30 > 0;
                        if (item.name === '31-60 jours') return c.echu31_60 > 0;
                        if (item.name === '61-90 jours') return c.echu61_90 > 0;
                        if (item.name === '+90 jours') return c.echuPlus90 > 0;
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
                              <p className="font-semibold text-[var(--color-primary)] group-hover:text-[var(--color-primary)] transition-colors">{item.name}</p>
                              <p className="text-sm text-[var(--color-text-secondary)]">{clientCount} client(s) concerné(s)</p>
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
                  <h4 className="text-md font-semibold text-[var(--color-primary)] mb-4">Évolution par Client</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={balanceAgeeData.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                      <YAxis type="category" dataKey="clientCode" width={80} />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Legend />
                      <Bar dataKey="nonEchu" stackId="a" fill="#22C55E" name="Non Échu" />
                      <Bar dataKey="echu0_30" stackId="a" fill="#f59e0b" name="0-30j" />
                      <Bar dataKey="echu31_60" stackId="a" fill="#f59e0b" name="31-60j" />
                      <Bar dataKey="echu61_90" stackId="a" fill="#EF4444" name="61-90j" />
                      <Bar dataKey="echuPlus90" stackId="a" fill="#ef4444" name="+90j" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Contenu sous-onglet: Détail par client */}
            {balanceAgeeSubTab === 'detail' && (
              <div className="p-6">
                {/* Filtres */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -tranprimary-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Rechercher un client..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="all">Toutes les tranches</option>
                      <option value="nonechu">Non Échu seulement</option>
                      <option value="0-30">0-30 jours</option>
                      <option value="31-60">31-60 jours</option>
                      <option value="61-90">61-90 jours</option>
                      <option value="+90">+90 jours</option>
                    </select>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{balanceAgeeData.length} clients</p>
                </div>

                {/* Tableau détaillé */}
                <div className="overflow-x-auto border border-[var(--color-border)] rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Code</th>
                        <th className="text-left p-3 font-medium text-[var(--color-text-secondary)]">Client</th>
                        <th className="text-right p-3 font-medium text-[var(--color-text-secondary)]">Total Créances</th>
                        <th className="text-right p-3 font-medium text-green-600">Non Échu</th>
                        <th className="text-right p-3 font-medium text-yellow-600">0-30j</th>
                        <th className="text-right p-3 font-medium text-orange-600">31-60j</th>
                        <th className="text-right p-3 font-medium text-red-600">61-90j</th>
                        <th className="text-right p-3 font-medium text-red-800">+90j</th>
                        <th className="text-right p-3 font-medium text-primary-600">Provision</th>
                        <th className="text-center p-3 font-medium text-[var(--color-text-secondary)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {balanceAgeeData.map((item) => {
                        const hasRisk = item.echuPlus90 > 0 || item.echu61_90 > 0;
                        return (
                          <tr key={item.clientId} className={`border-t border-[var(--color-border)] hover:bg-gray-50 ${hasRisk ? 'bg-red-50/30' : ''}`}>
                            <td className="p-3">
                              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{item.clientCode}</span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center space-x-2">
                                <p className="font-medium text-[var(--color-primary)]">{item.clientNom}</p>
                                {hasRisk && <AlertTriangle className="w-4 h-4 text-red-500" />}
                              </div>
                            </td>
                            <td className="p-3 text-right font-bold">{formatCurrency(item.totalCreances)}</td>
                            <td className="p-3 text-right text-green-600">{item.nonEchu > 0 ? formatCurrency(item.nonEchu) : '-'}</td>
                            <td className="p-3 text-right text-yellow-600">{item.echu0_30 > 0 ? formatCurrency(item.echu0_30) : '-'}</td>
                            <td className="p-3 text-right text-orange-600">{item.echu31_60 > 0 ? formatCurrency(item.echu31_60) : '-'}</td>
                            <td className="p-3 text-right text-red-600">{item.echu61_90 > 0 ? formatCurrency(item.echu61_90) : '-'}</td>
                            <td className="p-3 text-right text-red-800 font-bold">{item.echuPlus90 > 0 ? formatCurrency(item.echuPlus90) : '-'}</td>
                            <td className="p-3 text-right text-primary-600">{item.provision > 0 ? formatCurrency(item.provision) : '-'}</td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <button type="button" className="p-1 text-gray-500 hover:text-[var(--color-primary)]" title="Voir détail">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button type="button" className="p-1 text-gray-500 hover:text-blue-600" title="Envoyer relance">
                                  <Mail className="w-4 h-4" />
                                </button>
                                <button type="button" className="p-1 text-gray-500 hover:text-orange-600" title="Imprimer">
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
                        <td className="p-3" colSpan={2}>TOTAUX ({balanceAgeeData.length} clients)</td>
                        <td className="p-3 text-right">{formatCurrency(totauxBalanceAgee.totalCreances)}</td>
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

            {/* Contenu sous-onglet: Clients à risque et recommandations */}
            {balanceAgeeSubTab === 'risques' && (
              <div className="p-6 space-y-6">
                {/* Indicateurs de risque */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <div className="flex items-center justify-between">
                      <AlertOctagon className="w-8 h-8 text-red-600" />
                      <span className="text-lg font-bold text-red-800">
                        {balanceAgeeData.filter(i => i.echuPlus90 > 0).length}
                      </span>
                    </div>
                    <p className="text-sm text-red-700 mt-2">Clients critiques (+90j)</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <div className="flex items-center justify-between">
                      <AlertTriangle className="w-8 h-8 text-orange-600" />
                      <span className="text-lg font-bold text-orange-800">
                        {balanceAgeeData.filter(i => i.echu61_90 > 0).length}
                      </span>
                    </div>
                    <p className="text-sm text-orange-700 mt-2">Clients à surveiller (61-90j)</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <div className="flex items-center justify-between">
                      <Clock className="w-8 h-8 text-yellow-600" />
                      <span className="text-lg font-bold text-yellow-800">
                        {balanceAgeeData.filter(i => i.echu31_60 > 0).length}
                      </span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-2">Relances à prévoir (31-60j)</p>
                  </div>
                  <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
                    <div className="flex items-center justify-between">
                      <Shield className="w-8 h-8 text-primary-600" />
                      <span className="text-lg font-bold text-primary-800">
                        {formatCurrency(totauxBalanceAgee.provision)}
                      </span>
                    </div>
                    <p className="text-sm text-primary-700 mt-2">Provisions recommandées</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Liste des clients à risque élevé */}
                  <div className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
                    <div className="p-4 bg-red-50 border-b border-red-200">
                      <div className="flex items-center justify-between">
                        <h4 className="text-md font-semibold text-red-800">Clients à Risque Élevé</h4>
                        <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                          {balanceAgeeData.filter(item => item.echuPlus90 > 0).length} clients
                        </span>
                      </div>
                      <p className="text-xs text-red-600 mt-1">Créances échues de plus de 90 jours</p>
                    </div>
                    <div className="divide-y divide-[var(--color-border)] max-h-96 overflow-y-auto">
                      {balanceAgeeData
                        .filter(item => item.echuPlus90 > 0)
                        .sort((a, b) => b.echuPlus90 - a.echuPlus90)
                        .map((item, idx) => (
                          <div key={idx} className="p-4 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-[var(--color-primary)]">{item.clientNom}</p>
                                <p className="text-xs text-[var(--color-text-secondary)]">{item.clientCode}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-red-800">{formatCurrency(item.echuPlus90)}</p>
                                <p className="text-xs text-[var(--color-text-secondary)]">échu +90j</p>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center space-x-2">
                              <button
                                type="button"
                                className="flex-1 px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center space-x-1"
                              >
                                <Mail className="w-3 h-3" />
                                <span>Mise en demeure</span>
                              </button>
                              <button
                                type="button"
                                className="flex-1 px-3 py-1.5 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 flex items-center justify-center space-x-1"
                              >
                                <Phone className="w-3 h-3" />
                                <span>Appeler</span>
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
                          <p>Aucun client à risque critique</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions recommandées */}
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
                      <div className="p-4 bg-[var(--color-primary)]/10 border-b border-[var(--color-border)]">
                        <h4 className="text-md font-semibold text-[var(--color-primary)]">Plan d'Actions Recommandé</h4>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-1">Actions prioritaires basées sur l'analyse</p>
                      </div>
                      <div className="p-4 space-y-3">
                        {/* Action 1 */}
                        <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-red-800">🚨 Mises en demeure urgentes</p>
                              <p className="text-sm text-red-700">
                                {balanceAgeeData.filter(i => i.echuPlus90 > 0).length} clients avec créances +90 jours
                              </p>
                            </div>
                            <button type="button" className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">
                              Traiter
                            </button>
                          </div>
                        </div>

                        {/* Action 2 */}
                        <div className="p-3 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-orange-800">⚠️ Relances niveau 2</p>
                              <p className="text-sm text-orange-700">
                                {balanceAgeeData.filter(i => i.echu61_90 > 0).length} clients avec créances 61-90 jours
                              </p>
                            </div>
                            <button type="button" className="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700">
                              Relancer
                            </button>
                          </div>
                        </div>

                        {/* Action 3 */}
                        <div className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-yellow-800">📧 Relances niveau 1</p>
                              <p className="text-sm text-yellow-700">
                                {balanceAgeeData.filter(i => i.echu31_60 > 0).length} clients avec créances 31-60 jours
                              </p>
                            </div>
                            <button type="button" className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700">
                              Envoyer
                            </button>
                          </div>
                        </div>

                        {/* Action 4 */}
                        <div className="p-3 bg-primary-50 rounded-lg border-l-4 border-primary-500">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-primary-800">📊 Provisions à comptabiliser</p>
                              <p className="text-sm text-primary-700">
                                {formatCurrency(totauxBalanceAgee.provision)} selon règles SYSCOHADA
                              </p>
                            </div>
                            <button type="button" className="px-3 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700">
                              Générer OD
                            </button>
                          </div>
                        </div>

                        {/* Action 5 */}
                        <div className="p-3 bg-gray-50 rounded-lg border-l-4 border-gray-500">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-800">🔒 Comptes à bloquer</p>
                              <p className="text-sm text-gray-700">
                                {balanceAgeeData.filter(i => i.echuPlus90 > 500000).length} clients dépassent le seuil de 500K XAF
                              </p>
                            </div>
                            <button type="button" className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700">
                              Bloquer
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Règles de provisionnement */}
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <h5 className="font-medium text-blue-800 flex items-center">
                        <Info className="w-4 h-4 mr-2" />
                        Règles de Provisionnement SYSCOHADA
                      </h5>
                      <div className="mt-3 space-y-2 text-sm text-blue-700">
                        <div className="flex justify-between">
                          <span>Créances 61-90 jours</span>
                          <span className="font-medium">20% de provision</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Créances +90 jours</span>
                          <span className="font-medium">50% de provision</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Créances contentieuses</span>
                          <span className="font-medium">100% de provision</span>
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
        const totalCA = clients.reduce((s, c) => s + (c.chiffreAffaires || 0), 0);
        const activeClients = clients.filter(c => c.statut === 'ACTIF');
        const avgDSO = clients.length > 0 ? Math.round(clients.reduce((s, c) => s + (c.dso || 0), 0) / clients.length) : 0;
        const avgRecouvrement = clients.length > 0 ? Math.round(clients.reduce((s, c) => s + (c.tauxRecouvrement || 0), 0) / clients.length) : 0;
        const avgScore = clients.length > 0 ? (clients.reduce((s, c) => s + (c.scoreCredit || 0), 0) / clients.length / 20).toFixed(1) : '0';
        const catData = analyticsData.clientsParCategorie;
        const pieData = catData.map(c => ({ categorie: c.categorie, ca: c.montant }));
        const topClients = [...clients].sort((a, b) => (b.chiffreAffaires || 0) - (a.chiffreAffaires || 0)).slice(0, 5);
        const riskClients = clients.filter(c => (c.scoreCredit || 0) < 50);

        const analyticsSubTabs = [
          { key: 'kpis', label: 'Indicateurs', icon: BarChart3 },
          { key: 'charts', label: 'Graphiques', icon: PieChart },
          { key: 'performance', label: 'Performance', icon: Target },
        ];

        return (
        <div className="space-y-6">
          {/* Sub-tabs */}
          <div className="flex items-center bg-white rounded-xl p-1 border shadow-sm w-fit">
            {analyticsSubTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button key={tab.key} type="button" onClick={() => setAnalyticsSubTab(tab.key)}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
                  <Building className="w-5 h-5 text-[var(--color-primary)] mb-3" />
                  <p className="text-lg font-bold text-[var(--color-primary)]">{activeClients.length}</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">Clients Actifs</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
                  <DollarSign className="w-5 h-5 text-primary-600 mb-3" />
                  <p className="text-lg font-bold text-[var(--color-primary)]">{formatCurrency(totalCA)}</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">CA Total</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
                  <Clock className="w-5 h-5 text-blue-600 mb-3" />
                  <p className="text-lg font-bold text-[var(--color-primary)]">{avgDSO}j</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">DSO Moyen</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
                  <Target className="w-5 h-5 text-orange-600 mb-3" />
                  <p className="text-lg font-bold text-[var(--color-primary)]">{avgRecouvrement}%</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">Taux Recouvrement</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
                  <Shield className="w-5 h-5 text-green-600 mb-3" />
                  <p className="text-lg font-bold text-[var(--color-primary)]">{avgScore}/5</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">Score Moyen</p>
                </div>
              </div>

              {/* Catégories + Top clients */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
                  <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">Analyse par Catégorie</h3>
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
                  <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">Top Clients</h3>
                  <div className="space-y-3">
                    {topClients.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">Aucun client</p>
                    ) : topClients.map((c, idx) => (
                      <div key={c.id} className="flex items-center justify-between">
                        <div className="flex items-center flex-1">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
                            idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-100 text-gray-700' : 'bg-gray-50 text-gray-600'
                          }`}>{idx + 1}</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[var(--color-primary)] truncate">{c.raisonSociale}</p>
                            <p className="text-xs text-[var(--color-text-secondary)]">{formatCurrency(c.chiffreAffaires || 0)}</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-[var(--color-primary)]">
                          {totalCA > 0 ? ((c.chiffreAffaires || 0) / totalCA * 100).toFixed(1) : 0}%
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
                <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">Répartition par Catégorie</h3>
                {pieData.some(d => d.ca > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie dataKey="ca" data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} fill="#737373"
                        label={({ categorie, percent }) => `${categorie} ${(percent * 100).toFixed(0)}%`}>
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-500">
                    <p className="text-sm">Aucune donnée de CA disponible</p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
                <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">Évaluation Performance</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={analyticsData.performanceClients}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="critere" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar name="Score" dataKey="score" stroke="#171717" fill="#171717" fillOpacity={0.6} />
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
                <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">Clients à Risque</h3>
                {riskClients.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Aucun client à risque détecté</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {riskClients.slice(0, 10).map((c) => (
                      <div key={c.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{c.raisonSociale}</p>
                          <p className="text-xs text-gray-600">Score: {c.scoreCredit}/100 | DSO: {c.dso}j</p>
                        </div>
                        <span className="text-sm font-bold text-red-600">{formatCurrency(c.encoursActuel || 0)}</span>
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

      {/* Modal Nouveau Client - Multi-étapes */}
      {showNewClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[var(--color-primary)]">Nouveau Client</h3>
                  <p className="text-sm text-[var(--color-text-secondary)]">Étape {formStep} sur 4</p>
                </div>
                <button type="button" onClick={handleCloseNewClientModal} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
                </button>
              </div>
              {/* Progress bar */}
              <div className="flex mt-4 space-x-2">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`flex-1 h-2 rounded-full ${step <= formStep ? 'bg-[var(--color-primary)]' : 'bg-gray-200'}`}
                  />
                ))}
              </div>
              <div className="flex mt-2 text-xs text-[var(--color-text-secondary)]">
                <span className="flex-1">Identification</span>
                <span className="flex-1">Adresse & Contact</span>
                <span className="flex-1">Comptabilité</span>
                <span className="flex-1">Conditions</span>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Étape 1: Identification */}
              {formStep === 1 && (
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-[var(--color-primary)] flex items-center">
                    <FileCheck className="w-5 h-5 mr-2 text-[var(--color-primary)]" />
                    Identification de l'entreprise
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Code client *</label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newClient.code}
                          onChange={(e) => setNewClient({ ...newClient, code: e.target.value })}
                          className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                          placeholder="CLI008"
                        />
                        <button
                          type="button"
                          onClick={generateClientCode}
                          className="px-3 py-2 bg-gray-100 text-[var(--color-text-secondary)] rounded-lg hover:bg-gray-200"
                        >
                          Auto
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Catégorie *</label>
                      <select
                        value={newClient.categorie}
                        onChange={(e) => setNewClient({ ...newClient, categorie: e.target.value as NewClientForm['categorie'] })}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                      >
                        <option value="GRAND_COMPTE">Grand Compte</option>
                        <option value="PME">PME</option>
                        <option value="TPE">TPE</option>
                        <option value="PARTICULIER">Particulier</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Raison sociale *</label>
                      <input
                        type="text"
                        value={newClient.raisonSociale}
                        onChange={(e) => setNewClient({ ...newClient, raisonSociale: e.target.value })}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        placeholder="Nom légal de l'entreprise"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Nom commercial</label>
                      <input
                        type="text"
                        value={newClient.nomCommercial}
                        onChange={(e) => setNewClient({ ...newClient, nomCommercial: e.target.value })}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Secteur d'activité *</label>
                      <input
                        type="text"
                        value={newClient.secteurActivite}
                        onChange={(e) => setNewClient({ ...newClient, secteurActivite: e.target.value })}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        placeholder="Ex: Commerce, BTP, Services..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--color-text-secondary)] mb-1">RCCM *</label>
                      <input
                        type="text"
                        value={newClient.rccm}
                        onChange={(e) => setNewClient({ ...newClient, rccm: e.target.value })}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        placeholder="RC/YDE/2024/X/XXXX"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--color-text-secondary)] mb-1">NIU (Numéro d'Identification Unique) *</label>
                      <input
                        type="text"
                        value={newClient.niu}
                        onChange={(e) => setNewClient({ ...newClient, niu: e.target.value })}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        placeholder="M0XXXXXXXXXX"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Régime TVA *</label>
                      <select
                        value={newClient.regimeTVA}
                        onChange={(e) => setNewClient({ ...newClient, regimeTVA: e.target.value as NewClientForm['regimeTVA'] })}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                      >
                        <option value="REEL_NORMAL">Réel Normal</option>
                        <option value="REEL_SIMPLIFIE">Réel Simplifié</option>
                        <option value="FORFAIT">Forfait</option>
                        <option value="EXONERE">Exonéré</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Étape 2: Adresse & Contact */}
              {formStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-md font-semibold text-[var(--color-primary)] flex items-center mb-4">
                      <MapPin className="w-5 h-5 mr-2 text-[var(--color-primary)]" />
                      Adresse
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Adresse *</label>
                        <input
                          type="text"
                          value={newClient.adresse}
                          onChange={(e) => setNewClient({ ...newClient, adresse: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                          placeholder="Rue, numéro, quartier"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Boîte Postale</label>
                        <input
                          type="text"
                          value={newClient.codePostal}
                          onChange={(e) => setNewClient({ ...newClient, codePostal: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                          placeholder="BP 1234"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Ville *</label>
                        <input
                          type="text"
                          value={newClient.ville}
                          onChange={(e) => setNewClient({ ...newClient, ville: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Région</label>
                        <input
                          type="text"
                          value={newClient.region}
                          onChange={(e) => setNewClient({ ...newClient, region: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Pays *</label>
                        <select
                          value={newClient.pays}
                          onChange={(e) => setNewClient({ ...newClient, pays: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        >
                          <option value="Cameroun">Cameroun</option>
                          <option value="Gabon">Gabon</option>
                          <option value="Congo">Congo</option>
                          <option value="Tchad">Tchad</option>
                          <option value="Guinée Équatoriale">Guinée Équatoriale</option>
                          <option value="République Centrafricaine">République Centrafricaine</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-semibold text-[var(--color-primary)] flex items-center mb-4">
                      <Users className="w-5 h-5 mr-2 text-[var(--color-primary)]" />
                      Contact Principal
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Nom du contact *</label>
                        <input
                          type="text"
                          value={newClient.contactPrincipal}
                          onChange={(e) => setNewClient({ ...newClient, contactPrincipal: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Fonction</label>
                        <input
                          type="text"
                          value={newClient.fonction}
                          onChange={(e) => setNewClient({ ...newClient, fonction: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                          placeholder="Directeur Financier, DAF..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Email *</label>
                        <input
                          type="email"
                          value={newClient.email}
                          onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Téléphone *</label>
                        <input
                          type="tel"
                          value={newClient.telephone}
                          onChange={(e) => setNewClient({ ...newClient, telephone: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                          placeholder="+237 6XX XXX XXX"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Téléphone secondaire</label>
                        <input
                          type="tel"
                          value={newClient.telephoneSecondaire}
                          onChange={(e) => setNewClient({ ...newClient, telephoneSecondaire: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Fax</label>
                        <input
                          type="tel"
                          value={newClient.fax}
                          onChange={(e) => setNewClient({ ...newClient, fax: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        />
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
                      <BookOpen className="w-5 h-5 mr-2 text-[var(--color-primary)]" />
                      Paramètres Comptables SYSCOHADA
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Compte comptable client *</label>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={newClient.compteComptable}
                            onChange={(e) => setNewClient({ ...newClient, compteComptable: e.target.value })}
                            className="w-24 px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
                            placeholder="411"
                          />
                          <input
                            type="text"
                            value={newClient.compteAuxiliaire}
                            onChange={(e) => setNewClient({ ...newClient, compteAuxiliaire: e.target.value })}
                            className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
                            placeholder="Code auxiliaire"
                          />
                        </div>
                        <p className="text-xs text-[var(--color-text-tertiary)] mt-1">Compte 411 - Clients (SYSCOHADA)</p>
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Journal de ventes *</label>
                        <select
                          value={newClient.journalVentes}
                          onChange={(e) => setNewClient({ ...newClient, journalVentes: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        >
                          <option value="VE">VE - Ventes</option>
                          <option value="VX">VX - Ventes Export</option>
                          <option value="PS">PS - Prestations de Services</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Taux TVA applicable (%)</label>
                        <select
                          value={newClient.tauxTVA}
                          onChange={(e) => setNewClient({ ...newClient, tauxTVA: parseFloat(e.target.value) })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        >
                          <option value={19.25}>19,25% - Taux normal Cameroun</option>
                          <option value={18}>18% - Taux CEMAC standard</option>
                          <option value={15}>15% - Taux réduit</option>
                          <option value={0}>0% - Exonéré</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Devise *</label>
                        <select
                          value={newClient.devise}
                          onChange={(e) => setNewClient({ ...newClient, devise: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        >
                          <option value="XAF">XAF - Franc CFA CEMAC</option>
                          <option value="EUR">EUR - Euro</option>
                          <option value="USD">USD - Dollar US</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-semibold text-[var(--color-primary)] flex items-center mb-4">
                      <Landmark className="w-5 h-5 mr-2 text-[var(--color-primary)]" />
                      Coordonnées Bancaires (optionnel)
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Banque</label>
                        <input
                          type="text"
                          value={newClient.banque}
                          onChange={(e) => setNewClient({ ...newClient, banque: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                          placeholder="Nom de la banque"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Code SWIFT/BIC</label>
                        <input
                          type="text"
                          value={newClient.swift}
                          onChange={(e) => setNewClient({ ...newClient, swift: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
                          placeholder="XXXXXXXX"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">IBAN / RIB</label>
                        <input
                          type="text"
                          value={newClient.iban}
                          onChange={(e) => setNewClient({ ...newClient, iban: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
                          placeholder="CM21 XXXX XXXX XXXX XXXX XXXX XXX"
                        />
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
                      <CreditCard className="w-5 h-5 mr-2 text-[var(--color-primary)]" />
                      Conditions de Paiement
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Mode de règlement *</label>
                        <select
                          value={newClient.modeReglement}
                          onChange={(e) => setNewClient({ ...newClient, modeReglement: e.target.value as NewClientForm['modeReglement'] })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        >
                          <option value="VIREMENT">Virement bancaire</option>
                          <option value="CHEQUE">Chèque</option>
                          <option value="PRELEVEMENT">Prélèvement automatique</option>
                          <option value="TRAITE">Traite / Lettre de change</option>
                          <option value="ESPECES">Espèces</option>
                          <option value="MOBILE_MONEY">Mobile Money</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Délai de paiement (jours) *</label>
                        <select
                          value={newClient.delaiPaiement}
                          onChange={(e) => setNewClient({ ...newClient, delaiPaiement: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        >
                          <option value={0}>Comptant</option>
                          <option value={15}>15 jours</option>
                          <option value={30}>30 jours</option>
                          <option value={45}>45 jours</option>
                          <option value={60}>60 jours fin de mois</option>
                          <option value={90}>90 jours</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Limite de crédit (XAF) *</label>
                        <input
                          type="number"
                          value={newClient.limiteCredit}
                          onChange={(e) => setNewClient({ ...newClient, limiteCredit: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Remise commerciale (%)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={newClient.remise}
                          onChange={(e) => setNewClient({ ...newClient, remise: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Escompte pour paiement anticipé (%)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={newClient.escompte}
                          onChange={(e) => setNewClient({ ...newClient, escompte: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Récapitulatif */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-[var(--color-primary)] mb-3">Récapitulatif</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-[var(--color-text-secondary)]">Code client:</span>
                        <span className="ml-2 font-medium">{newClient.code || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[var(--color-text-secondary)]">Raison sociale:</span>
                        <span className="ml-2 font-medium">{newClient.raisonSociale || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[var(--color-text-secondary)]">Compte comptable:</span>
                        <span className="ml-2 font-mono">{newClient.compteComptable}{newClient.compteAuxiliaire}</span>
                      </div>
                      <div>
                        <span className="text-[var(--color-text-secondary)]">NIU:</span>
                        <span className="ml-2 font-mono">{newClient.niu || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[var(--color-text-secondary)]">Délai paiement:</span>
                        <span className="ml-2 font-medium">{newClient.delaiPaiement} jours</span>
                      </div>
                      <div>
                        <span className="text-[var(--color-text-secondary)]">Limite crédit:</span>
                        <span className="ml-2 font-medium">{formatCurrency(newClient.limiteCredit)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-[var(--color-border)] flex justify-between">
              <button
                type="button"
                onClick={() => formStep > 1 ? setFormStep(formStep - 1) : handleCloseNewClientModal()}
                className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-[var(--color-text-secondary)] hover:bg-gray-50"
              >
                {formStep > 1 ? 'Précédent' : 'Annuler'}
              </button>
              <div className="flex space-x-3">
                {formStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => setFormStep(formStep + 1)}
                    className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90"
                  >
                    Suivant
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveNewClient}
                    className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 font-semibold"
                  >
                    Créer le client
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Period Selector Modal */}
      <PeriodSelectorModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        currentRange={dateRange}
        onPeriodChange={(newRange) => {
          setDateRange(newRange);
          setShowPeriodModal(false);
        }}
      />
    </div>
  );
};

export default ClientsModule;
