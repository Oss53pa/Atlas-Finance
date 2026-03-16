// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
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
  const navigate = useNavigate();
  const { adapter } = useData();
  const [isLoading, setIsLoading] = useState(true);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [activeTab, setActiveTab] = useState('liste');
  const [analyticsSubTab, setAnalyticsSubTab] = useState<string>('kpis');
  const [balanceAgeeSubTab, setBalanceAgeeSubTab] = useState<'repartition' | 'detail' | 'risques'>('repartition');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatut, setSelectedStatut] = useState<string>('all');
  const [selectedFournisseurs, setSelectedFournisseurs] = useState<string[]>([]);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    period: 'month' as 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
  });
  const [compareMode, setCompareMode] = useState(false);
  const [showNewFournisseurModal, setShowNewFournisseurModal] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [newFournisseur, setNewFournisseur] = useState({
    code: '', raisonSociale: '', nomCommercial: '',
    categorie: 'RECURRENT' as Fournisseur['categorie'],
    typeDépense: 'FRAIS_GENERAUX' as Fournisseur['typeDépense'],
    pays: 'Cameroun', secteurActivite: '', rccm: '', niu: '',
    adresse: '', codePostal: '', ville: '', region: '',
    contactPrincipal: '', fonction: '',
    email: '', telephone: '', telephoneSecondaire: '',
    compteComptable: '401', compteAuxiliaire: '', journalAchats: 'AC',
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

        const suppliers = allThirdParties.filter(
          (tp: any) => tp.type === 'supplier' || tp.type === 'both'
        );

        const fournisseursData: Fournisseur[] = suppliers.map((tp: any) => {
          const relatedLines: { debit: number; credit: number }[] = [];
          allEntries.forEach((entry: any) => {
            if (entry.status === 'draft') return;
            (entry.lines || []).forEach((line: any) => {
              if (line.thirdPartyCode === tp.code || line.accountCode === tp.accountCode) {
                relatedLines.push({ debit: line.debit || 0, credit: line.credit || 0 });
              }
            });
          });

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
            modeReglement: (tp.conditionsPaiement?.modePaiement === 'virement' ? 'VIREMENT' : tp.conditionsPaiement?.modePaiement === 'cheque' ? 'CHEQUE' : 'VIREMENT') as any,
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
            nonEchu: Math.max(encours, 0),
            echu0_30: 0,
            echu31_60: 0,
            echu61_90: 0,
            echuPlus90: 0
          };
        });

        if (mounted) {
          setFournisseurs(fournisseursData);
        }
      } catch (err) {
        console.error('Error loading fournisseurs:', err);
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
        { critere: 'Prix', score: 0 },
        { critere: 'Qualité', score: fournisseurs.length > 0 ? Math.round(fournisseurs.reduce((s, f) => s + f.scoreQualite, 0) / fournisseurs.length) : 0 },
        { critere: 'Délais', score: fournisseurs.length > 0 ? Math.round(fournisseurs.reduce((s, f) => s + f.respectDelais, 0) / fournisseurs.length) : 0 },
        { critere: 'Service', score: 0 },
        { critere: 'Conformité', score: fournisseurs.length > 0 ? Math.round(fournisseurs.filter(f => f.conformite).length / fournisseurs.length * 100) : 0 }
      ]
    };
  }, [fournisseurs]);

  const COLORS = ['#171717', '#525252', '#a3a3a3', '#3b82f6', '#22c55e', '#f59e0b'];

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
    { name: 'Non échu', value: totauxBalanceAgee.nonEchu, color: '#22c55e' },
    { name: '0-30 jours', value: totauxBalanceAgee.echu0_30, color: '#f59e0b' },
    { name: '31-60 jours', value: totauxBalanceAgee.echu31_60, color: '#f59e0b' },
    { name: '61-90 jours', value: totauxBalanceAgee.echu61_90, color: '#ef4444' },
    { name: '+90 jours', value: totauxBalanceAgee.echuPlus90, color: '#ef4444' }
  ];

  const tabs = [
    { id: 'liste', label: 'Liste Fournisseurs', icon: Users },
    { id: 'balance-agee', label: 'Balance Âgée', icon: Receipt },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-[#525252] mx-auto mb-4" />
          <p className="text-[#525252]">Chargement des fournisseurs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 ">
      {/* Header avec statistiques */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-[#e5e5e5]">
        <h2 className="text-lg font-bold text-[#171717] mb-6">Gestion des Fournisseurs</h2>

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
                <p className="text-xs text-primary-600 mt-1">Sur {fournisseursActifs} fournisseurs</p>
              </div>
              <Euro className="w-8 h-8 text-primary-400" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Volume Achats</p>
                <p className="text-lg font-bold text-blue-800">{formatCurrency(totalAchats)}</p>
                <p className="text-xs text-blue-600 mt-1">Année en cours</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">DPO Moyen</p>
                <p className="text-lg font-bold text-green-800">{moyenneDPO} jours</p>
                <p className="text-xs text-green-600 mt-1">Délai paiement</p>
              </div>
              <Clock className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Alertes</p>
                <p className="text-lg font-bold text-orange-800">{fournisseurs.reduce((sum, f) => sum + f.alertes, 0)}</p>
                <p className="text-xs text-orange-600 mt-1">À traiter</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-400" />
            </div>
          </div>
        </div>

        {/* Actions et Filtres */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-[#525252]" />
            <input
              type="text"
              placeholder="Rechercher un fournisseur (nom, code, secteur)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#171717]"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-3 border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#171717]"
          >
            <option value="all">Toutes catégories</option>
            <option value="STRATEGIQUE">Stratégique</option>
            <option value="RECURRENT">Récurrent</option>
            <option value="CRITIQUE">Critique</option>
            <option value="PONCTUEL">Ponctuel</option>
          </select>

          <select
            value={selectedStatut}
            onChange={(e) => setSelectedStatut(e.target.value)}
            className="px-4 py-3 border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#171717]"
          >
            <option value="all">Tous statuts</option>
            <option value="ACTIF">Actif</option>
            <option value="BLOQUE">Bloqué</option>
            <option value="SUSPENDU">Suspendu</option>
            <option value="INACTIF">Inactif</option>
          </select>

          <button
            onClick={() => setShowNewFournisseurModal(true)}
            className="flex items-center space-x-2 px-4 py-3 bg-[#171717] text-white rounded-lg hover:bg-[#171717]/90"
          >
            <Plus className="w-5 h-5" />
            <span className="font-semibold">Nouveau Fournisseur</span>
          </button>
        </div>

      {/* Table des fournisseurs */}
      <div className="bg-white rounded-lg shadow-sm border border-[#e5e5e5]">
        <div className="p-4 border-b border-[#e5e5e5]">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#525252]">
              {filteredFournisseurs.length} fournisseur(s) trouvé(s)
            </p>
            <div className="flex items-center space-x-2">
              {selectedFournisseurs.length > 0 && (
                <span className="text-sm text-[#171717] font-medium">
                  {selectedFournisseurs.length} sélectionné(s)
                </span>
              )}
              <ExportMenu
                data={filteredFournisseurs}
                filename="fournisseurs"
                columns={[
                  { key: 'code', label: 'Code' },
                  { key: 'raisonSociale', label: 'Fournisseur' },
                  { key: 'secteurActivite', label: 'Secteur' },
                  { key: 'categorie', label: 'Catégorie' },
                  { key: 'pays', label: 'Pays' },
                  { key: 'encoursActuel', label: 'Encours' },
                  { key: 'volumeAchats', label: 'Volume Achats' },
                  { key: 'dpo', label: 'DPO' },
                  { key: 'notationInterne', label: 'Note' },
                  { key: 'statut', label: 'Statut' }
                ]}
                buttonText={t('common.export')}
                buttonVariant="outline"
              />
              <button className="flex items-center space-x-2 px-3 py-2 text-sm border border-[#e5e5e5] rounded hover:bg-gray-50">
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
                    checked={selectedFournisseurs.length === filteredFournisseurs.length && filteredFournisseurs.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="text-left p-3 text-sm font-medium text-[#525252]">Code</th>
                <th className="text-left p-3 text-sm font-medium text-[#525252]">Fournisseur</th>
                <th className="text-left p-3 text-sm font-medium text-[#525252]">Catégorie</th>
                <th className="text-left p-3 text-sm font-medium text-[#525252]">Pays</th>
                <th className="text-right p-3 text-sm font-medium text-[#525252]">Encours</th>
                <th className="text-right p-3 text-sm font-medium text-[#525252]">Volume Achats</th>
                <th className="text-center p-3 text-sm font-medium text-[#525252]">DPO</th>
                <th className="text-center p-3 text-sm font-medium text-[#525252]">Note</th>
                <th className="text-center p-3 text-sm font-medium text-[#525252]">Statut</th>
                <th className="text-center p-3 text-sm font-medium text-[#525252]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFournisseurs.map((fournisseur) => (
                <tr key={fournisseur.id} className="border-t border-[#e5e5e5] hover:bg-gray-50">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedFournisseurs.includes(fournisseur.id)}
                      onChange={() => handleSelectFournisseur(fournisseur.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="p-3">
                    <span className="text-sm font-medium text-[#171717]">{fournisseur.code}</span>
                  </td>
                  <td className="p-3">
                    <div>
                      <p className="text-sm font-medium text-[#171717]">{fournisseur.raisonSociale}</p>
                      <p className="text-xs text-[#525252]">{fournisseur.secteurActivite}</p>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${getCategorieColor(fournisseur.categorie)}`}>
                      {fournisseur.categorie}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-[#525252]" />
                      <span className="text-sm text-[#525252]">{fournisseur.pays}</span>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <div>
                      <p className="text-sm font-medium text-[#171717]">{formatCurrency(fournisseur.encoursActuel)}</p>
                      {fournisseur.encoursActuel > fournisseur.limiteCredit * 0.8 && (
                        <p className="text-xs text-orange-600">Proche limite</p>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <p className="text-sm font-medium text-[#171717]">{formatCurrency(fournisseur.volumeAchats)}</p>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <Clock className="w-3 h-3 text-[#525252]" />
                      <span className="text-sm text-[#525252]">{fournisseur.dpo}j</span>
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
                        onClick={() => navigate(`/tiers/fournisseurs/${fournisseur.id}`)}
                        className="p-1 text-[#171717] hover:bg-[#171717]/10 rounded"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-blue-600 hover:bg-blue-100 rounded">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-red-600 hover:bg-red-100 rounded" aria-label="Supprimer">
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
        <div className="p-4 border-t border-[#e5e5e5] flex items-center justify-between">
          <span className="text-sm text-[#525252]">
            Affichage de 1 à {filteredFournisseurs.length} sur {filteredFournisseurs.length} entrées
          </span>
          <div className="flex items-center space-x-2">
            <button className="px-3 py-1 border border-[#e5e5e5] rounded text-sm disabled:opacity-50" disabled>
              Précédent
            </button>
            <button className="px-3 py-1 bg-[#171717] text-white rounded text-sm">1</button>
            <button className="px-3 py-1 border border-[#e5e5e5] rounded text-sm disabled:opacity-50" disabled>
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
          <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#171717]">Balance Âgée des Dettes Fournisseurs</h3>
                <p className="text-sm text-[#525252]">Analyse de l'ancienneté des dettes au {new Date().toLocaleDateString('fr-FR')}</p>
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
                  filename="balance-agee-fournisseurs"
                  columns={{
                    fournisseurCode: 'Code Fournisseur',
                    fournisseurNom: 'Nom Fournisseur',
                    totalDettes: 'Total Dettes',
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
            <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-lg font-bold text-[#171717]">{formatCurrency(totauxBalanceAgee.totalDettes)}</p>
              <p className="text-xs text-[#525252]">Total Dettes</p>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-xs text-green-600">{totauxBalanceAgee.totalDettes > 0 ? ((totauxBalanceAgee.nonEchu / totauxBalanceAgee.totalDettes) * 100).toFixed(1) : 0}%</span>
              </div>
              <p className="text-lg font-bold text-green-800">{formatCurrency(totauxBalanceAgee.nonEchu)}</p>
              <p className="text-xs text-green-600">Non Échu</p>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <span className="text-xs text-yellow-600">{totauxBalanceAgee.totalDettes > 0 ? ((totauxBalanceAgee.echu0_30 / totauxBalanceAgee.totalDettes) * 100).toFixed(1) : 0}%</span>
              </div>
              <p className="text-lg font-bold text-yellow-800">{formatCurrency(totauxBalanceAgee.echu0_30)}</p>
              <p className="text-xs text-yellow-600">0-30 jours</p>
            </div>

            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <span className="text-xs text-orange-600">{totauxBalanceAgee.totalDettes > 0 ? ((totauxBalanceAgee.echu31_60 / totauxBalanceAgee.totalDettes) * 100).toFixed(1) : 0}%</span>
              </div>
              <p className="text-lg font-bold text-orange-800">{formatCurrency(totauxBalanceAgee.echu31_60)}</p>
              <p className="text-xs text-orange-600">31-60 jours</p>
            </div>

            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <AlertOctagon className="w-5 h-5 text-red-600" />
                <span className="text-xs text-red-600">{totauxBalanceAgee.totalDettes > 0 ? (((totauxBalanceAgee.echu61_90 + totauxBalanceAgee.echuPlus90) / totauxBalanceAgee.totalDettes) * 100).toFixed(1) : 0}%</span>
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
          <div className="bg-white rounded-lg border border-[#e5e5e5] shadow-sm overflow-hidden">
            <div className="flex border-b border-[#e5e5e5]">
              <button
                type="button"
                onClick={() => setBalanceAgeeSubTab('repartition')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
                  balanceAgeeSubTab === 'repartition'
                    ? 'bg-[#737373]/10 text-[#737373] border-b-2 border-[#737373]'
                    : 'text-[#525252] hover:bg-gray-50'
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
                    ? 'bg-[#737373]/10 text-[#737373] border-b-2 border-[#737373]'
                    : 'text-[#525252] hover:bg-gray-50'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Détail par fournisseur</span>
              </button>
              <button
                type="button"
                onClick={() => setBalanceAgeeSubTab('risques')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
                  balanceAgeeSubTab === 'risques'
                    ? 'bg-[#737373]/10 text-[#737373] border-b-2 border-[#737373]'
                    : 'text-[#525252] hover:bg-gray-50'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Paiements prioritaires & Recommandations</span>
              </button>
            </div>

            {/* Contenu sous-onglet: Répartition par ancienneté */}
            {balanceAgeeSubTab === 'repartition' && (
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Graphique Donut Moderne */}
                  <div className="lg:col-span-2 bg-gradient-to-br from-primary-50 to-gray-100 rounded-2xl p-6 shadow-inner">
                    <h4 className="text-lg font-semibold text-[#171717] mb-2 text-center">Distribution des Dettes</h4>
                    <p className="text-sm text-[#525252] text-center mb-4">Répartition par ancienneté</p>
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
                          <p className="text-xs text-[#525252] uppercase tracking-wide">Total</p>
                          <p className="text-lg font-bold text-[#171717]">{formatCurrency(totauxBalanceAgee.totalDettes)}</p>
                          <p className="text-xs text-[#525252]">{balanceAgeeData.length} fournisseurs</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Légende détaillée et statistiques */}
                  <div className="lg:col-span-3 space-y-3">
                    <h4 className="text-lg font-semibold text-[#171717] mb-4">Détail par Tranche d'Ancienneté</h4>
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
                          className="flex items-center justify-between p-4 bg-white rounded-xl border border-[#e5e5e5] hover:shadow-md transition-all duration-200 cursor-pointer group"
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
                              <p className="font-semibold text-[#171717] group-hover:text-[#737373] transition-colors">{item.name}</p>
                              <p className="text-sm text-[#525252]">{fournisseurCount} fournisseur(s) concerné(s)</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-[#171717]">{formatCurrency(item.value)}</p>
                            <div className="flex items-center justify-end space-x-2">
                              <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${percent}%`, backgroundColor: item.color }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-[#525252] min-w-[45px] text-right">{percent}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Graphique en barres empilées */}
                <div className="mt-6 bg-gray-50 rounded-lg p-6">
                  <h4 className="text-md font-semibold text-[#171717] mb-4">Évolution par Fournisseur</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={balanceAgeeData.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                      <YAxis type="category" dataKey="fournisseurCode" width={80} />
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

            {/* Contenu sous-onglet: Détail par fournisseur */}
            {balanceAgeeSubTab === 'detail' && (
              <div className="p-6">
                {/* Filtres */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -tranprimary-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Rechercher un fournisseur..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#737373]"
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
                  <p className="text-sm text-[#525252]">{balanceAgeeData.length} fournisseurs</p>
                </div>

                {/* Tableau détaillé */}
                <div className="overflow-x-auto border border-[#e5e5e5] rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 font-medium text-[#525252]">Code</th>
                        <th className="text-left p-3 font-medium text-[#525252]">Fournisseur</th>
                        <th className="text-right p-3 font-medium text-[#525252]">Total Dettes</th>
                        <th className="text-right p-3 font-medium text-green-600">Non Échu</th>
                        <th className="text-right p-3 font-medium text-yellow-600">0-30j</th>
                        <th className="text-right p-3 font-medium text-orange-600">31-60j</th>
                        <th className="text-right p-3 font-medium text-red-600">61-90j</th>
                        <th className="text-right p-3 font-medium text-red-800">+90j</th>
                        <th className="text-right p-3 font-medium text-primary-600">Provision</th>
                        <th className="text-center p-3 font-medium text-[#525252]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {balanceAgeeData.map((item) => {
                        const hasRisk = item.echuPlus90 > 0 || item.echu61_90 > 0;
                        return (
                          <tr key={item.fournisseurId} className={`border-t border-[#e5e5e5] hover:bg-gray-50 ${hasRisk ? 'bg-red-50/30' : ''}`}>
                            <td className="p-3">
                              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{item.fournisseurCode}</span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center space-x-2">
                                <p className="font-medium text-[#171717]">{item.fournisseurNom}</p>
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
                                <button type="button" className="p-1 text-gray-500 hover:text-[#737373]" title="Voir détail">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button type="button" className="p-1 text-gray-500 hover:text-blue-600" title="Planifier paiement">
                                  <CreditCard className="w-4 h-4" />
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
                        <td className="p-3" colSpan={2}>TOTAUX ({balanceAgeeData.length} fournisseurs)</td>
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
                    <p className="text-sm text-red-700 mt-2">Paiements critiques (+90j)</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <div className="flex items-center justify-between">
                      <AlertTriangle className="w-8 h-8 text-orange-600" />
                      <span className="text-lg font-bold text-orange-800">
                        {balanceAgeeData.filter(i => i.echu61_90 > 0).length}
                      </span>
                    </div>
                    <p className="text-sm text-orange-700 mt-2">Paiements urgents (61-90j)</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <div className="flex items-center justify-between">
                      <Clock className="w-8 h-8 text-yellow-600" />
                      <span className="text-lg font-bold text-yellow-800">
                        {balanceAgeeData.filter(i => i.echu31_60 > 0).length}
                      </span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-2">Paiements à prévoir (31-60j)</p>
                  </div>
                  <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
                    <div className="flex items-center justify-between">
                      <Shield className="w-8 h-8 text-primary-600" />
                      <span className="text-lg font-bold text-primary-800">
                        {formatCurrency(totauxBalanceAgee.provision)}
                      </span>
                    </div>
                    <p className="text-sm text-primary-700 mt-2">Provisions pour litiges</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Liste des fournisseurs prioritaires */}
                  <div className="bg-white rounded-lg border border-[#e5e5e5] overflow-hidden">
                    <div className="p-4 bg-red-50 border-b border-red-200">
                      <div className="flex items-center justify-between">
                        <h4 className="text-md font-semibold text-red-800">Fournisseurs Prioritaires</h4>
                        <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                          {balanceAgeeData.filter(item => item.echuPlus90 > 0).length} fournisseurs
                        </span>
                      </div>
                      <p className="text-xs text-red-600 mt-1">Dettes échues de plus de 90 jours - Risque de rupture</p>
                    </div>
                    <div className="divide-y divide-[#e5e5e5] max-h-96 overflow-y-auto">
                      {balanceAgeeData
                        .filter(item => item.echuPlus90 > 0)
                        .sort((a, b) => b.echuPlus90 - a.echuPlus90)
                        .map((item, idx) => (
                          <div key={idx} className="p-4 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-[#171717]">{item.fournisseurNom}</p>
                                <p className="text-xs text-[#525252]">{item.fournisseurCode}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-red-800">{formatCurrency(item.echuPlus90)}</p>
                                <p className="text-xs text-[#525252]">échu +90j</p>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center space-x-2">
                              <button
                                type="button"
                                className="flex-1 px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center space-x-1"
                              >
                                <CreditCard className="w-3 h-3" />
                                <span>Payer maintenant</span>
                              </button>
                              <button
                                type="button"
                                className="flex-1 px-3 py-1.5 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 flex items-center justify-center space-x-1"
                              >
                                <Phone className="w-3 h-3" />
                                <span>Négocier</span>
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
                        <div className="p-8 text-center text-[#525252]">
                          <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-2" />
                          <p>Aucun paiement en retard critique</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions recommandées */}
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg border border-[#e5e5e5] overflow-hidden">
                      <div className="p-4 bg-[#737373]/10 border-b border-[#e5e5e5]">
                        <h4 className="text-md font-semibold text-[#171717]">Plan de Trésorerie Recommandé</h4>
                        <p className="text-xs text-[#525252] mt-1">Actions prioritaires basées sur l'analyse des dettes</p>
                      </div>
                      <div className="p-4 space-y-3">
                        {/* Action 1 */}
                        <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-red-800">🚨 Paiements urgents</p>
                              <p className="text-sm text-red-700">
                                {balanceAgeeData.filter(i => i.echuPlus90 > 0).length} fournisseurs avec dettes +90 jours
                              </p>
                            </div>
                            <button type="button" className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">
                              Planifier
                            </button>
                          </div>
                        </div>

                        {/* Action 2 */}
                        <div className="p-3 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-orange-800">⚠️ Négociations délais</p>
                              <p className="text-sm text-orange-700">
                                {balanceAgeeData.filter(i => i.echu61_90 > 0).length} fournisseurs avec dettes 61-90 jours
                              </p>
                            </div>
                            <button type="button" className="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700">
                              Contacter
                            </button>
                          </div>
                        </div>

                        {/* Action 3 */}
                        <div className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-yellow-800">📅 Échéancier à établir</p>
                              <p className="text-sm text-yellow-700">
                                {balanceAgeeData.filter(i => i.echu31_60 > 0).length} fournisseurs avec dettes 31-60 jours
                              </p>
                            </div>
                            <button type="button" className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700">
                              Planifier
                            </button>
                          </div>
                        </div>

                        {/* Action 4 */}
                        <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-green-800">💰 Escomptes disponibles</p>
                              <p className="text-sm text-green-700">
                                {fournisseurs.filter(f => f.escompte && f.escompte > 0).length} fournisseurs avec escompte disponible
                              </p>
                            </div>
                            <button type="button" className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">
                              Optimiser
                            </button>
                          </div>
                        </div>

                        {/* Action 5 */}
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
                      </div>
                    </div>

                    {/* Règles de provisionnement */}
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <h5 className="font-medium text-blue-800 flex items-center">
                        <Info className="w-4 h-4 mr-2" />
                        Règles de Gestion Trésorerie SYSCOHADA
                      </h5>
                      <div className="mt-3 space-y-2 text-sm text-blue-700">
                        <div className="flex justify-between">
                          <span>Paiement stratégique</span>
                          <span className="font-medium">Priorité haute</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Négociation délai +90j</span>
                          <span className="font-medium">Risque de rupture</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Escompte pour paiement anticipé</span>
                          <span className="font-medium">Économie 2-3%</span>
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
          { key: 'kpis', label: 'Indicateurs', icon: BarChart3 },
          { key: 'charts', label: 'Graphiques', icon: PieChart },
          { key: 'performance', label: 'Performance', icon: Target },
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
                    analyticsSubTab === tab.key ? 'bg-[#171717] text-white shadow-md' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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
                <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
                  <Building className="w-5 h-5 text-[#171717] mb-3" />
                  <p className="text-lg font-bold text-[#171717]">{fournisseurs.length}</p>
                  <p className="text-sm text-[#525252]">Fournisseurs</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
                  <ShoppingBag className="w-5 h-5 text-primary-600 mb-3" />
                  <p className="text-lg font-bold text-[#171717]">{formatCurrency(totalAchats)}</p>
                  <p className="text-sm text-[#525252]">Volume Achats</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
                  <Timer className="w-5 h-5 text-blue-600 mb-3" />
                  <p className="text-lg font-bold text-[#171717]">{avgDPO}j</p>
                  <p className="text-sm text-[#525252]">DPO Moyen</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
                  <Wallet className="w-5 h-5 text-orange-600 mb-3" />
                  <p className="text-lg font-bold text-[#171717]">{formatCurrency(totalEncours)}</p>
                  <p className="text-sm text-[#525252]">Encours Total</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
                  <Shield className="w-5 h-5 text-green-600 mb-3" />
                  <p className="text-lg font-bold text-[#171717]">{avgQualite}/5</p>
                  <p className="text-sm text-[#525252]">Score Qualité</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                  <h3 className="text-lg font-semibold text-[#171717] mb-4">Par Catégorie</h3>
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

                <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                  <h3 className="text-lg font-semibold text-[#171717] mb-4">Top Fournisseurs</h3>
                  <div className="space-y-3">
                    {topFournisseurs.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">Aucun fournisseur</p>
                    ) : topFournisseurs.map((f, idx) => (
                      <div key={f.id} className="flex items-center justify-between">
                        <div className="flex items-center flex-1">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
                            idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-100 text-gray-700' : 'bg-gray-50 text-gray-600'
                          }`}>{idx + 1}</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[#171717] truncate">{f.raisonSociale}</p>
                            <p className="text-xs text-[#525252]">{formatCurrency(f.volumeAchats || 0)}</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-[#171717]">
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
              <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                <h3 className="text-lg font-semibold text-[#171717] mb-4">Répartition par Catégorie</h3>
                {catData.some(d => d.montant > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie dataKey="montant" data={catData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} fill="#737373"
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
                    <p className="text-sm">Aucune donnée d'achats disponible</p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                <h3 className="text-lg font-semibold text-[#171717] mb-4">Évaluation Performance</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={analyticsData.performanceFournisseurs}>
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
              <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
                <h3 className="text-lg font-semibold text-[#171717] mb-4">Fournisseurs à surveiller</h3>
                {critiqueFournisseurs.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Tous les fournisseurs ont une bonne notation</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {critiqueFournisseurs.map((f) => (
                      <div key={f.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{f.raisonSociale}</p>
                          <p className="text-xs text-gray-600">Note: {f.notationInterne} | Qualité: {f.scoreQualite}% | Délais: {f.respectDelais}%</p>
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
            <div className="p-6 border-b border-[#e5e5e5]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#171717]">Nouveau Fournisseur</h3>
                  <p className="text-sm text-[#525252]">Étape {formStep} sur 4</p>
                </div>
                <button onClick={() => { setShowNewFournisseurModal(false); setFormStep(1); }} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-[#525252]" />
                </button>
              </div>
              <div className="flex mt-4 space-x-2">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className={`flex-1 h-2 rounded-full ${step <= formStep ? 'bg-[#171717]' : 'bg-gray-200'}`} />
                ))}
              </div>
              <div className="flex mt-2 text-xs text-[#525252]">
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
                  <h4 className="text-md font-semibold text-[#171717] flex items-center">
                    <Building className="w-5 h-5 mr-2 text-[#171717]" />Identification de l'entreprise
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-[#525252] mb-1">Code fournisseur *</label>
                      <div className="flex space-x-2">
                        <input type="text" value={newFournisseur.code}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, code: e.target.value })}
                          className="flex-1 px-3 py-2 border border-[#e5e5e5] rounded-lg focus:ring-2 focus:ring-[#171717]"
                          placeholder="FOU001" />
                        <button type="button"
                          onClick={() => setNewFournisseur({ ...newFournisseur, code: `FOU${String(fournisseurs.length + 1).padStart(3, '0')}` })}
                          className="px-3 py-2 bg-gray-100 text-[#525252] rounded-lg hover:bg-gray-200">Auto</button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-[#525252] mb-1">Catégorie *</label>
                      <select value={newFournisseur.categorie}
                        onChange={(e) => setNewFournisseur({ ...newFournisseur, categorie: e.target.value as Fournisseur['categorie'] })}
                        className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:ring-2 focus:ring-[#171717]">
                        <option value="STRATEGIQUE">Stratégique</option>
                        <option value="RECURRENT">Récurrent</option>
                        <option value="PONCTUEL">Ponctuel</option>
                        <option value="CRITIQUE">Critique</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm text-[#525252] mb-1">Raison sociale *</label>
                      <input type="text" value={newFournisseur.raisonSociale}
                        onChange={(e) => setNewFournisseur({ ...newFournisseur, raisonSociale: e.target.value })}
                        className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:ring-2 focus:ring-[#171717]"
                        placeholder="Nom légal de l'entreprise" />
                    </div>
                    <div>
                      <label className="block text-sm text-[#525252] mb-1">Nom commercial</label>
                      <input type="text" value={newFournisseur.nomCommercial}
                        onChange={(e) => setNewFournisseur({ ...newFournisseur, nomCommercial: e.target.value })}
                        className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:ring-2 focus:ring-[#171717]" />
                    </div>
                    <div>
                      <label className="block text-sm text-[#525252] mb-1">Type de dépense *</label>
                      <select value={newFournisseur.typeDépense}
                        onChange={(e) => setNewFournisseur({ ...newFournisseur, typeDépense: e.target.value as Fournisseur['typeDépense'] })}
                        className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:ring-2 focus:ring-[#171717]">
                        <option value="PRODUCTION">Production</option>
                        <option value="SERVICES">Services</option>
                        <option value="INVESTISSEMENT">Investissement</option>
                        <option value="FRAIS_GENERAUX">Frais généraux</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-[#525252] mb-1">Secteur d'activité</label>
                      <input type="text" value={newFournisseur.secteurActivite}
                        onChange={(e) => setNewFournisseur({ ...newFournisseur, secteurActivite: e.target.value })}
                        className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:ring-2 focus:ring-[#171717]"
                        placeholder="Ex: BTP, IT, Logistique..." />
                    </div>
                    <div>
                      <label className="block text-sm text-[#525252] mb-1">RCCM</label>
                      <input type="text" value={newFournisseur.rccm}
                        onChange={(e) => setNewFournisseur({ ...newFournisseur, rccm: e.target.value })}
                        className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:ring-2 focus:ring-[#171717]"
                        placeholder="RC/YDE/2024/X/XXXX" />
                    </div>
                    <div>
                      <label className="block text-sm text-[#525252] mb-1">NIU</label>
                      <input type="text" value={newFournisseur.niu}
                        onChange={(e) => setNewFournisseur({ ...newFournisseur, niu: e.target.value })}
                        className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:ring-2 focus:ring-[#171717]"
                        placeholder="M0XXXXXXXXXX" />
                    </div>
                  </div>
                </div>
              )}

              {/* Étape 2: Adresse & Contact */}
              {formStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-md font-semibold text-[#171717] flex items-center mb-4">
                      <MapPin className="w-5 h-5 mr-2 text-[#171717]" />Adresse
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm text-[#525252] mb-1">Adresse *</label>
                        <input type="text" value={newFournisseur.adresse}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, adresse: e.target.value })}
                          className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:ring-2 focus:ring-[#171717]"
                          placeholder="Rue, numéro, quartier" />
                      </div>
                      <div>
                        <label className="block text-sm text-[#525252] mb-1">Boîte Postale</label>
                        <input type="text" value={newFournisseur.codePostal}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, codePostal: e.target.value })}
                          className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:ring-2 focus:ring-[#171717]" placeholder="BP 1234" />
                      </div>
                      <div>
                        <label className="block text-sm text-[#525252] mb-1">Ville *</label>
                        <input type="text" value={newFournisseur.ville}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, ville: e.target.value })}
                          className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:ring-2 focus:ring-[#171717]" />
                      </div>
                      <div>
                        <label className="block text-sm text-[#525252] mb-1">Région</label>
                        <input type="text" value={newFournisseur.region}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, region: e.target.value })}
                          className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:ring-2 focus:ring-[#171717]" />
                      </div>
                      <div>
                        <label className="block text-sm text-[#525252] mb-1">Pays *</label>
                        <select value={newFournisseur.pays}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, pays: e.target.value })}
                          className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:ring-2 focus:ring-[#171717]">
                          <option value="Cameroun">Cameroun</option>
                          <option value="Gabon">Gabon</option>
                          <option value="Congo">Congo</option>
                          <option value="Tchad">Tchad</option>
                          <option value="Guinée Équatoriale">Guinée Équatoriale</option>
                          <option value="République Centrafricaine">RCA</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-md font-semibold text-[#171717] flex items-center mb-4">
                      <Users className="w-5 h-5 mr-2 text-[#171717]" />Contact Principal
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[#525252] mb-1">Nom du contact *</label>
                        <input type="text" value={newFournisseur.contactPrincipal}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, contactPrincipal: e.target.value })}
                          className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:ring-2 focus:ring-[#171717]" />
                      </div>
                      <div>
                        <label className="block text-sm text-[#525252] mb-1">Fonction</label>
                        <input type="text" value={newFournisseur.fonction}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, fonction: e.target.value })}
                          className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:ring-2 focus:ring-[#171717]"
                          placeholder="Directeur Commercial..." />
                      </div>
                      <div>
                        <label className="block text-sm text-[#525252] mb-1">Email *</label>
                        <input type="email" value={newFournisseur.email}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, email: e.target.value })}
                          className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:ring-2 focus:ring-[#171717]" />
                      </div>
                      <div>
                        <label className="block text-sm text-[#525252] mb-1">Téléphone *</label>
                        <input type="tel" value={newFournisseur.telephone}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, telephone: e.target.value })}
                          className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:ring-2 focus:ring-[#171717]"
                          placeholder="+237 6XX XXX XXX" />
                      </div>
                      <div>
                        <label className="block text-sm text-[#525252] mb-1">Téléphone secondaire</label>
                        <input type="tel" value={newFournisseur.telephoneSecondaire}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, telephoneSecondaire: e.target.value })}
                          className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:ring-2 focus:ring-[#171717]" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Étape 3: Comptabilité */}
              {formStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-md font-semibold text-[#171717] flex items-center mb-4">
                      <BookOpen className="w-5 h-5 mr-2 text-[#171717]" />Paramètres Comptables SYSCOHADA
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[#525252] mb-1">Compte comptable fournisseur *</label>
                        <div className="flex space-x-2">
                          <input type="text" value={newFournisseur.compteComptable}
                            onChange={(e) => setNewFournisseur({ ...newFournisseur, compteComptable: e.target.value })}
                            className="w-24 px-3 py-2 border border-[#e5e5e5] rounded-lg focus:ring-2 focus:ring-[#171717] font-mono" placeholder="401" />
                          <input type="text" value={newFournisseur.compteAuxiliaire}
                            onChange={(e) => setNewFournisseur({ ...newFournisseur, compteAuxiliaire: e.target.value })}
                            className="flex-1 px-3 py-2 border border-[#e5e5e5] rounded-lg focus:ring-2 focus:ring-[#171717] font-mono" placeholder="Code auxiliaire" />
                        </div>
                        <p className="text-xs text-[#a3a3a3] mt-1">Compte 401 - Fournisseurs (SYSCOHADA)</p>
                      </div>
                      <div>
                        <label className="block text-sm text-[#525252] mb-1">Journal d'achats *</label>
                        <select value={newFournisseur.journalAchats}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, journalAchats: e.target.value })}
                          className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:ring-2 focus:ring-[#171717]">
                          <option value="AC">AC - Achats</option>
                          <option value="AI">AI - Achats Import</option>
                          <option value="FG">FG - Frais Généraux</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-[#525252] mb-1">Taux TVA applicable (%)</label>
                        <select value={newFournisseur.tauxTVA}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, tauxTVA: parseFloat(e.target.value) })}
                          className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:ring-2 focus:ring-[#171717]">
                          <option value={19.25}>19,25% - Taux normal Cameroun</option>
                          <option value={18}>18% - Taux CEMAC standard</option>
                          <option value={0}>0% - Exonéré</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-[#525252] mb-1">Devise *</label>
                        <select value={newFournisseur.devise}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, devise: e.target.value })}
                          className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:ring-2 focus:ring-[#171717]">
                          <option value="XAF">XAF - Franc CFA CEMAC</option>
                          <option value="EUR">EUR - Euro</option>
                          <option value="USD">USD - Dollar US</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-md font-semibold text-[#171717] flex items-center mb-4">
                      <CreditCard className="w-5 h-5 mr-2 text-[#171717]" />Coordonnées Bancaires (optionnel)
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[#525252] mb-1">Banque</label>
                        <input type="text" value={newFournisseur.banque}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, banque: e.target.value })}
                          className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:ring-2 focus:ring-[#171717]" placeholder="Nom de la banque" />
                      </div>
                      <div>
                        <label className="block text-sm text-[#525252] mb-1">Code SWIFT/BIC</label>
                        <input type="text" value={newFournisseur.swift}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, swift: e.target.value })}
                          className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:ring-2 focus:ring-[#171717] font-mono" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm text-[#525252] mb-1">IBAN / RIB</label>
                        <input type="text" value={newFournisseur.iban}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, iban: e.target.value })}
                          className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:ring-2 focus:ring-[#171717] font-mono"
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
                    <h4 className="text-md font-semibold text-[#171717] flex items-center mb-4">
                      <CreditCard className="w-5 h-5 mr-2 text-[#171717]" />Conditions de Paiement
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[#525252] mb-1">Mode de règlement *</label>
                        <select value={newFournisseur.modeReglement}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, modeReglement: e.target.value as Fournisseur['modeReglement'] })}
                          className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:ring-2 focus:ring-[#171717]">
                          <option value="VIREMENT">Virement bancaire</option>
                          <option value="CHEQUE">Chèque</option>
                          <option value="PRELEVEMENT">Prélèvement automatique</option>
                          <option value="TRAITE">Traite / Lettre de change</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-[#525252] mb-1">Délai de paiement (jours) *</label>
                        <select value={newFournisseur.delaiPaiement}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, delaiPaiement: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:ring-2 focus:ring-[#171717]">
                          <option value={0}>Comptant</option>
                          <option value={15}>15 jours</option>
                          <option value={30}>30 jours</option>
                          <option value={45}>45 jours</option>
                          <option value={60}>60 jours fin de mois</option>
                          <option value={90}>90 jours</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-[#525252] mb-1">Limite de crédit (XAF)</label>
                        <input type="number" value={newFournisseur.limiteCredit}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, limiteCredit: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:ring-2 focus:ring-[#171717]" />
                      </div>
                      <div>
                        <label className="block text-sm text-[#525252] mb-1">Escompte (%)</label>
                        <input type="number" step="0.5" value={newFournisseur.escompte}
                          onChange={(e) => setNewFournisseur({ ...newFournisseur, escompte: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:ring-2 focus:ring-[#171717]" placeholder="0" />
                      </div>
                    </div>
                  </div>

                  {/* Récapitulatif */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-[#171717] mb-3">Récapitulatif</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="text-[#525252]">Code:</span> <span className="ml-2 font-medium">{newFournisseur.code || '-'}</span></div>
                      <div><span className="text-[#525252]">Raison sociale:</span> <span className="ml-2 font-medium">{newFournisseur.raisonSociale || '-'}</span></div>
                      <div><span className="text-[#525252]">Compte comptable:</span> <span className="ml-2 font-mono">{newFournisseur.compteComptable}{newFournisseur.compteAuxiliaire}</span></div>
                      <div><span className="text-[#525252]">NIU:</span> <span className="ml-2 font-mono">{newFournisseur.niu || '-'}</span></div>
                      <div><span className="text-[#525252]">Délai paiement:</span> <span className="ml-2 font-medium">{newFournisseur.delaiPaiement} jours</span></div>
                      <div><span className="text-[#525252]">Limite crédit:</span> <span className="ml-2 font-medium">{formatCurrency(newFournisseur.limiteCredit)}</span></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-[#e5e5e5] flex justify-between">
              <button type="button"
                onClick={() => formStep > 1 ? setFormStep(formStep - 1) : (setShowNewFournisseurModal(false), setFormStep(1))}
                className="px-4 py-2 border border-[#e5e5e5] rounded-lg text-[#525252] hover:bg-gray-50">
                {formStep > 1 ? 'Précédent' : 'Annuler'}
              </button>
              <div className="flex space-x-3">
                {formStep < 4 ? (
                  <button type="button" onClick={() => setFormStep(formStep + 1)}
                    className="px-4 py-2 bg-[#171717] text-white rounded-lg hover:bg-[#171717]/90">Suivant</button>
                ) : (
                  <button type="button"
                    onClick={async () => {
                      if (!newFournisseur.code || !newFournisseur.raisonSociale) return;
                      try {
                        await adapter.create('thirdParties', {
                          code: newFournisseur.code, name: newFournisseur.raisonSociale, type: 'supplier',
                          email: newFournisseur.email, phone: newFournisseur.telephone,
                          address: `${newFournisseur.adresse}, ${newFournisseur.ville}, ${newFournisseur.pays}`,
                          taxId: newFournisseur.niu,
                        });
                        setShowNewFournisseurModal(false); setFormStep(1);
                        const tp = await adapter.getAll<any>('thirdParties');
                        const suppliers = tp.filter((t: any) => t.type === 'supplier' || t.type === 'both');
                        setFournisseurs(suppliers.map((s: any) => ({
                          ...s, id: s.id, code: s.code || '', raisonSociale: s.name || '',
                          categorie: 'RECURRENT', typeDépense: 'FRAIS_GENERAUX', pays: 'Cameroun',
                          secteurActivite: '', volumeAchats: 0, encoursActuel: 0, dpo: 0,
                          limiteCredit: 0, delaiPaiement: 30, modeReglement: 'VIREMENT',
                          devise: 'XAF', scoreQualite: 0, respectDelais: 0,
                          notationInterne: 'B', conformite: true, statut: 'ACTIF',
                        } as Fournisseur)));
                      } catch (err) { console.error('Erreur création fournisseur:', err); }
                    }}
                    className="px-6 py-2 bg-[#171717] text-white rounded-lg hover:bg-[#171717]/90 font-semibold">
                    Créer le fournisseur
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

export default FournisseursModule;