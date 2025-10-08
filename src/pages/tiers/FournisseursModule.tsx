import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';
import ExportMenu from '../../components/shared/ExportMenu';
import {
  Search, Plus, Filter, Upload, Eye, Edit, Trash2,
  Building, TrendingUp, AlertTriangle, CheckCircle, Clock,
  Euro, Calendar, FileText, Mail, Phone, MapPin, CreditCard,
  Package, Truck, ShieldCheck, AlertCircle, BarChart3, PieChart,
  DollarSign, Users, Target, Activity, TrendingDown, ShoppingBag,
  Wallet, RefreshCw, ChevronUp, ChevronDown, Info, Database,
  Globe, Shield, Zap, Timer, BookOpen, AlertOctagon, Award
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
}

const FournisseursModule: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('liste');
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

  // Mock Data Fournisseurs CEMAC
  const fournisseurs: Fournisseur[] = [
    {
      id: '1',
      code: 'FRN001',
      raisonSociale: 'CAMTEL SA',
      nomCommercial: 'Camtel Telecom',
      categorie: 'STRATEGIQUE',
      typeDépense: 'SERVICES',
      pays: 'Cameroun',
      secteurActivite: 'Télécommunications',
      volumeAchats: 850000,
      encoursActuel: 125000,
      dpo: 45,
      limiteCredit: 500000,
      delaiPaiement: 60,
      escompte: 2,
      modeReglement: 'VIREMENT',
      devise: 'XAF',
      scoreQualite: 92,
      respectDelais: 95,
      notationInterne: 'A',
      conformite: true,
      contactComptable: 'Marie NGONO',
      emailComptable: 'm.ngono@camtel.cm',
      telephoneComptable: '+237 693 456 789',
      statut: 'ACTIF',
      derniereFacture: '2024-09-10',
      prochainPaiement: '2024-10-10',
      alertes: 0
    },
    {
      id: '2',
      code: 'FRN002',
      raisonSociale: 'TOTAL GABON',
      nomCommercial: 'Total Energy',
      categorie: 'RECURRENT',
      typeDépense: 'PRODUCTION',
      pays: 'Gabon',
      secteurActivite: 'Énergie - Carburants',
      volumeAchats: 1250000,
      encoursActuel: 280000,
      dpo: 35,
      limiteCredit: 800000,
      delaiPaiement: 30,
      modeReglement: 'VIREMENT',
      devise: 'XAF',
      scoreQualite: 88,
      respectDelais: 92,
      notationInterne: 'A',
      conformite: true,
      contactComptable: 'Jean MBOUMBA',
      emailComptable: 'j.mboumba@total.ga',
      telephoneComptable: '+241 01 234 567',
      statut: 'ACTIF',
      derniereFacture: '2024-09-15',
      prochainPaiement: '2024-10-15',
      alertes: 1
    },
    {
      id: '3',
      code: 'FRN003',
      raisonSociale: 'CONGO EQUIPEMENTS SARL',
      nomCommercial: 'Congo Équip',
      categorie: 'STRATEGIQUE',
      typeDépense: 'INVESTISSEMENT',
      pays: 'Congo',
      secteurActivite: 'Équipements industriels',
      volumeAchats: 2100000,
      encoursActuel: 450000,
      dpo: 55,
      limiteCredit: 1000000,
      delaiPaiement: 90,
      escompte: 3,
      modeReglement: 'TRAITE',
      devise: 'XAF',
      scoreQualite: 85,
      respectDelais: 88,
      notationInterne: 'B',
      conformite: true,
      contactComptable: 'Pierre MAKOSSO',
      emailComptable: 'p.makosso@congoequip.cg',
      telephoneComptable: '+242 06 789 012',
      statut: 'ACTIF',
      derniereFacture: '2024-08-25',
      prochainPaiement: '2024-11-25',
      alertes: 0
    },
    {
      id: '4',
      code: 'FRN004',
      raisonSociale: 'TCHAD LOGISTICS',
      categorie: 'RECURRENT',
      typeDépense: 'SERVICES',
      pays: 'Tchad',
      secteurActivite: 'Transport & Logistique',
      volumeAchats: 680000,
      encoursActuel: 95000,
      dpo: 42,
      limiteCredit: 300000,
      delaiPaiement: 45,
      modeReglement: 'CHEQUE',
      devise: 'XAF',
      scoreQualite: 79,
      respectDelais: 85,
      notationInterne: 'B',
      conformite: true,
      contactComptable: 'Fatouma HASSAN',
      emailComptable: 'f.hassan@tchadlog.td',
      telephoneComptable: '+235 66 345 678',
      statut: 'ACTIF',
      derniereFacture: '2024-09-05',
      prochainPaiement: '2024-10-20',
      alertes: 2
    },
    {
      id: '5',
      code: 'FRN005',
      raisonSociale: 'BEAC SERVICES',
      nomCommercial: 'BEAC',
      categorie: 'STRATEGIQUE',
      typeDépense: 'SERVICES',
      pays: 'Cameroun',
      secteurActivite: 'Services bancaires',
      volumeAchats: 320000,
      encoursActuel: 0,
      dpo: 15,
      limiteCredit: 200000,
      delaiPaiement: 15,
      modeReglement: 'PRELEVEMENT',
      devise: 'XAF',
      scoreQualite: 95,
      respectDelais: 100,
      notationInterne: 'A',
      conformite: true,
      contactComptable: 'Alain FOTSO',
      emailComptable: 'a.fotso@beac.int',
      telephoneComptable: '+237 222 234 500',
      statut: 'ACTIF',
      derniereFacture: '2024-09-01',
      prochainPaiement: '2024-09-16',
      alertes: 0
    },
    {
      id: '6',
      code: 'FRN006',
      raisonSociale: 'GUINEE EQUATORIALE TECH',
      categorie: 'PONCTUEL',
      typeDépense: 'SERVICES',
      pays: 'Guinée Équatoriale',
      secteurActivite: 'Services informatiques',
      volumeAchats: 150000,
      encoursActuel: 75000,
      dpo: 60,
      limiteCredit: 100000,
      delaiPaiement: 60,
      modeReglement: 'VIREMENT',
      devise: 'XAF',
      scoreQualite: 72,
      respectDelais: 78,
      notationInterne: 'C',
      conformite: false,
      contactComptable: 'Carlos NGUEMA',
      emailComptable: 'c.nguema@gqtech.gq',
      telephoneComptable: '+240 222 456 789',
      statut: 'BLOQUE',
      derniereFacture: '2024-07-15',
      alertes: 5
    },
    {
      id: '7',
      code: 'FRN007',
      raisonSociale: 'RCA FOURNITURES',
      categorie: 'RECURRENT',
      typeDépense: 'FRAIS_GENERAUX',
      pays: 'République Centrafricaine',
      secteurActivite: 'Fournitures bureau',
      volumeAchats: 280000,
      encoursActuel: 45000,
      dpo: 38,
      limiteCredit: 150000,
      delaiPaiement: 30,
      modeReglement: 'VIREMENT',
      devise: 'XAF',
      scoreQualite: 82,
      respectDelais: 90,
      notationInterne: 'B',
      conformite: true,
      contactComptable: 'Jeanne KOYAMBA',
      emailComptable: 'j.koyamba@rcafournitures.cf',
      telephoneComptable: '+236 70 123 456',
      statut: 'ACTIF',
      derniereFacture: '2024-09-12',
      prochainPaiement: '2024-10-12',
      alertes: 0
    }
  ];

  const filteredFournisseurs = fournisseurs.filter(fournisseur => {
    const matchSearch = fournisseur.raisonSociale.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       fournisseur.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       fournisseur.secteurActivite.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = selectedCategory === 'all' || fournisseur.categorie === selectedCategory;
    const matchStatut = selectedStatut === 'all' || fournisseur.statut === selectedStatut;

    return matchSearch && matchCategory && matchStatut;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getCategorieColor = (categorie: string) => {
    switch (categorie) {
      case 'STRATEGIQUE': return 'bg-purple-100 text-purple-800';
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
  const totalEncours = fournisseurs.reduce((sum, f) => sum + f.encoursActuel, 0);
  const totalAchats = fournisseurs.reduce((sum, f) => sum + f.volumeAchats, 0);
  const moyenneDPO = Math.round(fournisseurs.reduce((sum, f) => sum + f.dpo, 0) / fournisseurs.length);
  const fournisseursActifs = fournisseurs.filter(f => f.statut === 'ACTIF').length;

  // Analytics Data
  const analyticsData = {
    fournisseursParCategorie: [
      { categorie: 'STRATEGIQUE', count: 8, montant: 4500000 },
      { categorie: 'RECURRENT', count: 15, montant: 2800000 },
      { categorie: 'PONCTUEL', count: 22, montant: 850000 },
      { categorie: 'CRITIQUE', count: 5, montant: 1200000 }
    ],
    evolutionAchats: [
      { mois: 'Jan', achats2024: 750000, achats2025: 890000 },
      { mois: 'Fév', achats2024: 820000, achats2025: 950000 },
      { mois: 'Mar', achats2024: 900000, achats2025: 1100000 },
      { mois: 'Avr', achats2024: 780000, achats2025: 920000 },
      { mois: 'Mai', achats2024: 950000, achats2025: 1150000 },
      { mois: 'Juin', achats2024: 1020000, achats2025: 1280000 }
    ],
    performanceFournisseurs: [
      { critere: 'Prix', score: 82 },
      { critere: 'Qualité', score: 88 },
      { critere: 'Délais', score: 75 },
      { critere: 'Service', score: 90 },
      { critere: 'Conformité', score: 85 }
    ]
  };

  const COLORS = ['#6A8A82', '#B87333', '#7A99AC', '#5A79AC'];

  const tabs = [
    { id: 'liste', label: 'Liste Fournisseurs', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  return (
    <div className="p-6 space-y-6 font-['Sometype Mono']">
      {/* Header avec statistiques */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-[#E8E8E8]">
        <h2 className="text-2xl font-bold text-[#191919] mb-6">Gestion des Fournisseurs</h2>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mt-6 bg-gray-100 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-[#7A99AC] shadow-sm'
                  : 'text-[#666666] hover:text-[#444444]'
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
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Total Encours</p>
                <p className="text-2xl font-bold text-purple-800">{formatCurrency(totalEncours)}</p>
                <p className="text-xs text-purple-600 mt-1">Sur {fournisseursActifs} fournisseurs</p>
              </div>
              <Euro className="w-8 h-8 text-purple-400" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Volume Achats</p>
                <p className="text-2xl font-bold text-blue-800">{formatCurrency(totalAchats)}</p>
                <p className="text-xs text-blue-600 mt-1">Année en cours</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">DPO Moyen</p>
                <p className="text-2xl font-bold text-green-800">{moyenneDPO} jours</p>
                <p className="text-xs text-green-600 mt-1">Délai paiement</p>
              </div>
              <Clock className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Alertes</p>
                <p className="text-2xl font-bold text-orange-800">{fournisseurs.reduce((sum, f) => sum + f.alertes, 0)}</p>
                <p className="text-xs text-orange-600 mt-1">À traiter</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-400" />
            </div>
          </div>
        </div>

        {/* Actions et Filtres */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-[#666666]" />
            <input
              type="text"
              placeholder="Rechercher un fournisseur (nom, code, secteur)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-3 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
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
            className="px-4 py-3 border border-[#E8E8E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
          >
            <option value="all">Tous statuts</option>
            <option value="ACTIF">Actif</option>
            <option value="BLOQUE">Bloqué</option>
            <option value="SUSPENDU">Suspendu</option>
            <option value="INACTIF">Inactif</option>
          </select>

          <button className="flex items-center space-x-2 px-4 py-3 bg-[#6A8A82] text-white rounded-lg hover:bg-[#6A8A82]/90">
            <Plus className="w-5 h-5" />
            <span className="font-semibold">Nouveau Fournisseur</span>
          </button>
        </div>

      {/* Table des fournisseurs */}
      <div className="bg-white rounded-lg shadow-sm border border-[#E8E8E8]">
        <div className="p-4 border-b border-[#E8E8E8]">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#666666]">
              {filteredFournisseurs.length} fournisseur(s) trouvé(s)
            </p>
            <div className="flex items-center space-x-2">
              {selectedFournisseurs.length > 0 && (
                <span className="text-sm text-[#6A8A82] font-medium">
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
              <button className="flex items-center space-x-2 px-3 py-2 text-sm border border-[#E8E8E8] rounded hover:bg-gray-50">
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
                <th className="text-left p-3 text-sm font-medium text-[#666666]">Code</th>
                <th className="text-left p-3 text-sm font-medium text-[#666666]">Fournisseur</th>
                <th className="text-left p-3 text-sm font-medium text-[#666666]">Catégorie</th>
                <th className="text-left p-3 text-sm font-medium text-[#666666]">Pays</th>
                <th className="text-right p-3 text-sm font-medium text-[#666666]">Encours</th>
                <th className="text-right p-3 text-sm font-medium text-[#666666]">Volume Achats</th>
                <th className="text-center p-3 text-sm font-medium text-[#666666]">DPO</th>
                <th className="text-center p-3 text-sm font-medium text-[#666666]">Note</th>
                <th className="text-center p-3 text-sm font-medium text-[#666666]">Statut</th>
                <th className="text-center p-3 text-sm font-medium text-[#666666]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFournisseurs.map((fournisseur) => (
                <tr key={fournisseur.id} className="border-t border-[#E8E8E8] hover:bg-gray-50">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedFournisseurs.includes(fournisseur.id)}
                      onChange={() => handleSelectFournisseur(fournisseur.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="p-3">
                    <span className="text-sm font-medium text-[#191919]">{fournisseur.code}</span>
                  </td>
                  <td className="p-3">
                    <div>
                      <p className="text-sm font-medium text-[#191919]">{fournisseur.raisonSociale}</p>
                      <p className="text-xs text-[#666666]">{fournisseur.secteurActivite}</p>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${getCategorieColor(fournisseur.categorie)}`}>
                      {fournisseur.categorie}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-[#666666]" />
                      <span className="text-sm text-[#666666]">{fournisseur.pays}</span>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <div>
                      <p className="text-sm font-medium text-[#191919]">{formatCurrency(fournisseur.encoursActuel)}</p>
                      {fournisseur.encoursActuel > fournisseur.limiteCredit * 0.8 && (
                        <p className="text-xs text-orange-600">Proche limite</p>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <p className="text-sm font-medium text-[#191919]">{formatCurrency(fournisseur.volumeAchats)}</p>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <Clock className="w-3 h-3 text-[#666666]" />
                      <span className="text-sm text-[#666666]">{fournisseur.dpo}j</span>
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
                        className="p-1 text-[#6A8A82] hover:bg-[#6A8A82]/10 rounded"
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
        <div className="p-4 border-t border-[#E8E8E8] flex items-center justify-between">
          <span className="text-sm text-[#666666]">
            Affichage de 1 à {filteredFournisseurs.length} sur {filteredFournisseurs.length} entrées
          </span>
          <div className="flex items-center space-x-2">
            <button className="px-3 py-1 border border-[#E8E8E8] rounded text-sm disabled:opacity-50" disabled>
              Précédent
            </button>
            <button className="px-3 py-1 bg-[#6A8A82] text-white rounded text-sm">1</button>
            <button className="px-3 py-1 border border-[#E8E8E8] rounded text-sm disabled:opacity-50" disabled>
              Suivant
            </button>
          </div>
        </div>
      </div>
      </>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowPeriodModal(true)}
                  className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#7A99AC]"
                >
                  <Calendar className="w-4 h-4 text-[#666666]" />
                  <span>
                    {dateRange.period === 'custom'
                      ? `${dateRange.startDate} - ${dateRange.endDate}`
                      : dateRange.period === 'day' ? t('common.today')
                      : dateRange.period === 'week' ? 'Cette semaine'
                      : dateRange.period === 'month' ? 'Ce mois'
                      : dateRange.period === 'quarter' ? 'Ce trimestre'
                      : 'Cette année'
                    }
                  </span>
                </button>
                <button
                  onClick={() => setCompareMode(!compareMode)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    compareMode
                      ? 'bg-[#6A8A82] text-white'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 inline mr-2" />
                  Mode Comparaison
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-600 hover:text-gray-900" aria-label="Actualiser">
                  <RefreshCw className="w-4 h-4" />
                </button>
                <ExportMenu
                  data={filteredFournisseurs}
                  filename="dashboard-fournisseurs"
                  columns={[
                    { key: 'code', label: 'Code' },
                    { key: 'raisonSociale', label: 'Fournisseur' },
                    { key: 'categorie', label: 'Catégorie' },
                    { key: 'volumeAchats', label: 'Volume Achats' },
                    { key: 'scoreQualite', label: 'Score Qualité' },
                    { key: 'respectDelais', label: 'Respect Délais' },
                    { key: 'notationInterne', label: 'Note' }
                  ]}
                  buttonText="Export PDF"
                />
              </div>
            </div>
          </div>

          {/* KPIs principale */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <Building className="w-5 h-5 text-[#6A8A82]" />
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">+8%</span>
              </div>
              <p className="text-2xl font-bold text-[#191919]">52</p>
              <p className="text-sm text-[#666666]">Fournisseurs Actifs</p>
              <div className="mt-2 flex items-center text-xs text-gray-700">
                <ChevronUp className="w-3 h-3 text-green-500 mr-1" />
                <span>4 nouveaux ce mois</span>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <ShoppingBag className="w-5 h-5 text-purple-600" />
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">+15%</span>
              </div>
              <p className="text-2xl font-bold text-[#191919]">9.35M</p>
              <p className="text-sm text-[#666666]">Volume Achats</p>
              <div className="mt-2 flex items-center text-xs text-gray-700">
                <TrendingUp className="w-3 h-3 text-purple-500 mr-1" />
                <span>FCFA YTD</span>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <Timer className="w-5 h-5 text-blue-600" />
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">-3j</span>
              </div>
              <p className="text-2xl font-bold text-[#191919]">47j</p>
              <p className="text-sm text-[#666666]">DPO Moyen</p>
              <div className="mt-2 flex items-center text-xs text-gray-700">
                <ChevronDown className="w-3 h-3 text-green-500 mr-1" />
                <span>Amélioration</span>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <Wallet className="w-5 h-5 text-orange-600" />
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">+12%</span>
              </div>
              <p className="text-2xl font-bold text-[#191919]">1.45M</p>
              <p className="text-sm text-[#666666]">Encours Total</p>
              <div className="mt-2 flex items-center text-xs text-gray-700">
                <Info className="w-3 h-3 text-orange-500 mr-1" />
                <span>FCFA</span>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <Shield className="w-5 h-5 text-green-600" />
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">92%</span>
              </div>
              <p className="text-2xl font-bold text-[#191919]">4.3/5</p>
              <p className="text-sm text-[#666666]">Score Qualité</p>
              <div className="mt-2 flex items-center text-xs text-gray-700">
                <Award className="w-3 h-3 text-green-500 mr-1" />
                <span>Performance</span>
              </div>
            </div>
          </div>

          {/* Indicateurs de Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Performance Achats */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#191919]">Performance Achats</h3>
                <Zap className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-[#666666]">Économies Réalisées</span>
                    <span className="text-sm font-semibold text-[#191919]">12%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '12%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-[#666666]">Conformité Contrats</span>
                    <span className="text-sm font-semibold text-[#191919]">87%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '87%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-[#666666]">Respect Budgets</span>
                    <span className="text-sm font-semibold text-[#191919]">94%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-[#6A8A82] h-2 rounded-full" style={{ width: '94%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-[#666666]">Diversification</span>
                    <span className="text-sm font-semibold text-[#191919]">68%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: '68%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Analyse par Catégorie */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#191919]">Analyse par Catégorie</h3>
                <Package className="w-5 h-5 text-purple-500" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-700">Stratégiques</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-lg font-bold text-gray-900 mr-2">8</span>
                    <span className="text-xs text-gray-700">fournisseurs</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-700">Récurrents</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-lg font-bold text-gray-900 mr-2">15</span>
                    <span className="text-xs text-gray-700">fournisseurs</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-gray-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-700">Ponctuels</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-lg font-bold text-gray-900 mr-2">22</span>
                    <span className="text-xs text-gray-700">fournisseurs</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-700">Critiques</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-lg font-bold text-gray-900 mr-2">5</span>
                    <span className="text-xs text-gray-700">fournisseurs</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Fournisseurs */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#191919]">Top 5 Fournisseurs</h3>
                <Award className="w-5 h-5 text-[#B87333]" />
              </div>
              <div className="space-y-3">
                {[
                  { nom: 'CONGO EQUIPEMENTS', montant: 2100000, part: 22.5 },
                  { nom: 'TOTAL GABON', montant: 1250000, part: 13.4 },
                  { nom: 'CAMTEL SA', montant: 850000, part: 9.1 },
                  { nom: 'TCHAD LOGISTICS', montant: 680000, part: 7.3 },
                  { nom: 'RCA FOURNITURES', montant: 280000, part: 3.0 }
                ].map((fournisseur, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
                        idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                        idx === 1 ? 'bg-gray-100 text-gray-700' :
                        idx === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#191919]">{fournisseur.nom}</p>
                        <p className="text-xs text-[#666666]">{formatCurrency(fournisseur.montant)}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-[#6A8A82]">{fournisseur.part}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Graphiques principaux */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Evolution des Achats */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#191919]">Évolution des Achats</h3>
                <div className="flex items-center space-x-2">
                  <button className="p-1 text-gray-700 hover:text-gray-600" aria-label="Information">
                    <Info className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyticsData.evolutionAchats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mois" />
                  <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                  {compareMode && (
                    <Line
                      type="monotone"
                      dataKey="achats2024"
                      stroke="#B87333"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Achats 2024"
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="achats2025"
                    stroke="#6A8A82"
                    strokeWidth={2}
                    name="Achats 2025"
                    dot={{ fill: '#6A8A82' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Répartition par Catégorie */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#191919]">Répartition par Catégorie</h3>
                <div className="flex items-center space-x-2">
                  <select className="text-sm border border-gray-300 rounded px-2 py-1">
                    <option>Par Montant</option>
                    <option>Par Nombre</option>
                  </select>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    dataKey="montant"
                    data={analyticsData.fournisseursParCategorie}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    label={({ categorie, percent }) => `${categorie} ${(percent * 100).toFixed(0)}%`}
                  >
                    {analyticsData.fournisseursParCategorie.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Analyse Performance Fournisseurs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar Performance */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Évaluation Performance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={analyticsData.performanceFournisseurs}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="critere" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar name="Score Moyen" dataKey="score" stroke="#6A8A82" fill="#6A8A82" fillOpacity={0.6} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Matrice Risques */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Matrice des Risques</h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1 row-span-3"></div>
                <div className="text-center text-xs text-gray-700 pb-2">Faible Impact</div>
                <div className="text-center text-xs text-gray-700 pb-2">Fort Impact</div>

                <div className="text-right text-xs text-gray-700 pr-2">Haute Probabilité</div>
                <div className="bg-yellow-100 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-yellow-800">3</p>
                  <p className="text-xs text-yellow-600">Modérés</p>
                </div>
                <div className="bg-red-100 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-800">2</p>
                  <p className="text-xs text-red-600">Critiques</p>
                </div>

                <div className="text-right text-xs text-gray-700 pr-2">Basse Probabilité</div>
                <div className="bg-green-100 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-800">35</p>
                  <p className="text-xs text-green-600">Faibles</p>
                </div>
                <div className="bg-orange-100 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-orange-800">12</p>
                  <p className="text-xs text-orange-600">À surveiller</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Plan d'Action Requis</span>
                  <span className="text-lg font-bold text-red-600">5 fournisseurs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tableau de Bord Prédictif */}
          <div className="bg-gradient-to-r from-[#6A8A82] to-[#7A99AC] rounded-lg p-6 text-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold">Insights & Prédictions</h3>
                <p className="text-sm opacity-90 mt-1">Analyse prédictive basée sur l'historique</p>
              </div>
              <Database className="w-8 h-8 opacity-50" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <TrendingDown className="w-5 h-5" />
                  <span className="text-xs bg-white/20 px-2 py-1 rounded">Économies</span>
                </div>
                <p className="text-2xl font-bold">385K</p>
                <p className="text-sm opacity-90">Potentiel T2 2025</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <AlertOctagon className="w-5 h-5" />
                  <span className="text-xs bg-white/20 px-2 py-1 rounded">Risque</span>
                </div>
                <p className="text-2xl font-bold">3</p>
                <p className="text-sm opacity-90">Fournisseurs à remplacer</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Package className="w-5 h-5" />
                  <span className="text-xs bg-white/20 px-2 py-1 rounded">Optimisation</span>
                </div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm opacity-90">Contrats à renégocier</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Globe className="w-5 h-5" />
                  <span className="text-xs bg-white/20 px-2 py-1 rounded">Sourcing</span>
                </div>
                <p className="text-2xl font-bold">5</p>
                <p className="text-sm opacity-90">Nouveaux fournisseurs</p>
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