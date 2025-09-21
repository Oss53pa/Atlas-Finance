import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Plus, Search, Filter, Download, Eye, Edit, Trash2,
  ArrowLeft, Phone, Mail, MapPin, Calendar, DollarSign,
  Target, TrendingUp, Activity, AlertTriangle, CheckCircle,
  Star, Heart, Award, Clock, CreditCard, FileText,
  BarChart3, PieChart, MessageSquare, User, Building,
  TrendingDown, ShoppingBag, Package, Wallet,
  RefreshCw, ChevronUp, ChevronDown, Info, Database,
  Globe, Shield, Zap, Timer, BookOpen, AlertOctagon
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart as RechartsPieChart, Pie, Cell, LineChart, Line, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { Client, CRMData, Interaction, Opportunity } from '../../types/tiers';

const ClientsModule: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('liste');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSegment, setFilterSegment] = useState('tous');
  const [filterStatut, setFilterStatut] = useState('tous');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showOpportunityModal, setShowOpportunityModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedYear, setSelectedYear] = useState('2025');
  const [compareMode, setCompareMode] = useState(false);

  // Mock Clients Data
  const mockClients: Client[] = [
    {
      id: '1',
      code: 'CLI001',
      nom: 'SARL CONGO BUSINESS',
      type: 'CLIENT',
      statut: 'ACTIF',
      formeJuridique: 'SARL',
      numeroRC: 'RC-2023-001',
      numeroNIF: 'NIF123456789',
      secteurActivite: 'Commerce',
      adresse: {
        rue: '123 Avenue de la Paix',
        ville: 'Brazzaville',
        pays: 'Congo',
        region: 'Pool'
      },
      contacts: [
        {
          id: 'c1',
          tiersId: '1',
          civilite: 'M',
          prenom: 'Jean',
          nom: 'MAMBOU',
          fonction: 'Directeur Commercial',
          telephone: '+242 06 123 45 67',
          email: 'j.mambou@congobusiness.cg',
          isPrincipal: true,
          isActif: true,
          interactions: [],
          createdAt: '2024-01-15',
          updatedAt: '2024-09-19'
        }
      ],
      informationsFinancieres: {
        chiffreAffaires: 245000,
        devisePrincipale: 'XAF',
        conditionsPaiement: { delaiPaiement: 30 },
        comptesBancaires: [],
        situationFinanciere: 'EXCELLENT'
      },
      informationsCommerciales: {
        responsableCommercial: 'Marie Kouam',
        objectifVente: 300000,
        remiseHabituelle: 5,
        conditions: 'Standard',
        canaux: ['DIRECT']
      },
      categorieClient: 'ENTREPRISE',
      segmentClient: 'VIP',
      risqueClient: 'FAIBLE',
      chiffreAffaires: 245000,
      encours: 15000,
      soldeComptable: 15000,
      impayesEnCours: 0,
      dso: 28,
      crm: {
        scoreProspection: 95,
        stadeProspection: 'CLIENT',
        probabiliteVente: 90,
        valeurOpportunite: 50000,
        campagnesMarketing: [],
        interactions: [],
        opportunites: [],
        devis: [],
        projets: []
      },
      historique: [],
      notes: [],
      documents: [],
      isActive: true,
      createdAt: '2024-01-15',
      updatedAt: '2024-09-19',
      createdBy: 'admin',
      lastModifiedBy: 'marie.kouam'
    },
    {
      id: '2',
      code: 'CLI002',
      nom: 'STE AFRICAINE TECH',
      type: 'CLIENT',
      statut: 'ACTIF',
      formeJuridique: 'SA',
      numeroRC: 'RC-2023-002',
      numeroNIF: 'NIF123456790',
      secteurActivite: 'Technologie',
      adresse: {
        rue: '456 Boulevard de l\'Indépendance',
        ville: 'Douala',
        pays: 'Cameroun',
        region: 'Littoral'
      },
      contacts: [
        {
          id: 'c2',
          tiersId: '2',
          civilite: 'MME',
          prenom: 'Sophie',
          nom: 'NDONG',
          fonction: 'CEO',
          telephone: '+237 6 98 76 54 32',
          email: 's.ndong@africantech.cm',
          isPrincipal: true,
          isActif: true,
          interactions: [],
          createdAt: '2024-02-01',
          updatedAt: '2024-09-19'
        }
      ],
      informationsFinancieres: {
        chiffreAffaires: 189000,
        devisePrincipale: 'XAF',
        conditionsPaiement: { delaiPaiement: 30 },
        comptesBancaires: [],
        situationFinanciere: 'BON'
      },
      informationsCommerciales: {
        responsableCommercial: 'Paul Mbeki',
        objectifVente: 250000,
        remiseHabituelle: 3,
        conditions: 'Préférentiel',
        canaux: ['DIRECT', 'PARTENAIRE']
      },
      categorieClient: 'ENTREPRISE',
      segmentClient: 'PREMIUM',
      risqueClient: 'FAIBLE',
      chiffreAffaires: 189000,
      encours: 8500,
      soldeComptable: 8500,
      impayesEnCours: 0,
      dso: 22,
      crm: {
        scoreProspection: 88,
        stadeProspection: 'CLIENT',
        probabiliteVente: 85,
        valeurOpportunite: 35000,
        campagnesMarketing: [],
        interactions: [],
        opportunites: [],
        devis: [],
        projets: []
      },
      historique: [],
      notes: [],
      documents: [],
      isActive: true,
      createdAt: '2024-02-01',
      updatedAt: '2024-09-19',
      createdBy: 'admin',
      lastModifiedBy: 'paul.mbeki'
    }
  ];

  const tabs = [
    { id: 'liste', label: 'Liste Clients', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  const segments = [
    { value: 'tous', label: 'Tous les segments' },
    { value: 'VIP', label: 'VIP' },
    { value: 'PREMIUM', label: 'Premium' },
    { value: 'STANDARD', label: 'Standard' },
    { value: 'PROSPECT', label: 'Prospect' }
  ];

  const statuts = [
    { value: 'tous', label: 'Tous les statuts' },
    { value: 'ACTIF', label: 'Actif' },
    { value: 'INACTIF', label: 'Inactif' },
    { value: 'SUSPENDU', label: 'Suspendu' }
  ];

  const getSegmentColor = (segment: string) => {
    const colors = {
      'VIP': 'bg-[#B87333]/10 text-[#B87333]',
      'PREMIUM': 'bg-[#6A8A82]/10 text-[#6A8A82]',
      'STANDARD': 'bg-green-100 text-green-800',
      'PROSPECT': 'bg-yellow-100 text-yellow-800'
    };
    return colors[segment as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'ACTIF': 'bg-green-100 text-green-800',
      'INACTIF': 'bg-gray-100 text-gray-800',
      'SUSPENDU': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getRiskColor = (risk: string) => {
    const colors = {
      'FAIBLE': 'bg-green-100 text-green-800',
      'MOYEN': 'bg-yellow-100 text-yellow-800',
      'ELEVE': 'bg-orange-100 text-orange-800',
      'CRITIQUE': 'bg-red-100 text-red-800'
    };
    return colors[risk as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const filteredClients = mockClients.filter(client => {
    const matchSearch = client.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       client.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSegment = filterSegment === 'tous' || client.segmentClient === filterSegment;
    const matchStatut = filterStatut === 'tous' || client.statut === filterStatut;
    return matchSearch && matchSegment && matchStatut;
  });

  // Mock Analytics Data
  const analyticsData = {
    clientsParSegment: [
      { segment: 'VIP', count: 15, ca: 850000 },
      { segment: 'PREMIUM', count: 35, ca: 720000 },
      { segment: 'STANDARD', count: 89, ca: 650000 },
      { segment: 'PROSPECT', count: 17, ca: 230000 }
    ],
    evolutionCA: [
      { mois: 'Jan', vip: 70000, premium: 60000, standard: 54000 },
      { mois: 'Fév', vip: 75000, premium: 65000, standard: 58000 },
      { mois: 'Mar', vip: 80000, premium: 70000, standard: 60000 },
      { mois: 'Avr', vip: 78000, premium: 68000, standard: 59000 },
      { mois: 'Mai', vip: 85000, premium: 72000, standard: 63000 },
      { mois: 'Juin', vip: 90000, premium: 75000, standard: 65000 }
    ],
    conversions: [
      { etape: 'Suspects', valeur: 450 },
      { etape: 'Prospects', valeur: 280 },
      { etape: 'Qualifiés', valeur: 180 },
      { etape: 'Opportunités', valeur: 95 },
      { etape: 'Clients', valeur: 45 }
    ]
  };

  const COLORS = ['#7A99AC', '#6A89AC', '#5A79AC', '#4A69AC'];

  return (
    <div className="p-6 bg-[#ECECEC] min-h-screen font-['Sometype Mono']">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/tiers')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#444444]" />
              <span className="text-sm font-semibold text-[#444444]">Tiers</span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#191919]">Gestion des Clients</h1>
                <p className="text-sm text-[#666666]">Gestion commerciale</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowClientModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-semibold">Nouveau Client</span>
            </button>

            <button className="flex items-center space-x-2 px-4 py-2 bg-[#7A99AC] text-white rounded-lg hover:bg-[#6A89AC] transition-colors">
              <Download className="w-4 h-4" />
              <span className="text-sm font-semibold">Exporter</span>
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

      {/* Liste Clients Tab */}
      {activeTab === 'liste' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom ou code client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7A99AC] focus:border-transparent"
                />
              </div>

              <select
                value={filterSegment}
                onChange={(e) => setFilterSegment(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7A99AC]"
              >
                {segments.map(segment => (
                  <option key={segment.value} value={segment.value}>{segment.label}</option>
                ))}
              </select>

              <select
                value={filterStatut}
                onChange={(e) => setFilterStatut(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7A99AC]"
              >
                {statuts.map(statut => (
                  <option key={statut.value} value={statut.value}>{statut.label}</option>
                ))}
              </select>

              <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Filter className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Clients Table */}
          <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Segment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CA</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Encours</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DSO</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risque</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-[#6A8A82]/10 rounded-lg flex items-center justify-center mr-3">
                            <Building className="w-5 h-5 text-[#6A8A82]" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{client.nom}</div>
                            <div className="text-sm text-gray-500">{client.code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSegmentColor(client.segmentClient)}`}>
                          {client.segmentClient}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(client.chiffreAffaires)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(client.encours)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {client.dso} jours
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(client.risqueClient)}`}>
                          {client.risqueClient}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(client.statut)}`}>
                          {client.statut}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2 justify-end">
                          <button
                            onClick={() => navigate(`/tiers/clients/${client.id}`)}
                            className="p-1 text-blue-600 hover:text-blue-900"
                            title="Voir tous les détails"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setSelectedClient(client)}
                            className="p-1 text-[#6A8A82] hover:text-[#6A8A82]/80"
                            title="Aperçu rapide"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-green-600 hover:text-green-900">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-red-600 hover:text-red-900">
                            <Trash2 className="w-4 h-4" />
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
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-[#666666]" />
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7A99AC]"
                  >
                    <option value="day">Aujourd'hui</option>
                    <option value="week">Cette semaine</option>
                    <option value="month">Ce mois</option>
                    <option value="quarter">Ce trimestre</option>
                    <option value="year">Cette année</option>
                    <option value="custom">Personnalisé</option>
                  </select>
                </div>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7A99AC]"
                >
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                </select>
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
                <button className="p-2 text-gray-600 hover:text-gray-900">
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button className="px-4 py-2 bg-[#7A99AC] text-white rounded-lg hover:bg-[#6A89AC] text-sm">
                  <Download className="w-4 h-4 inline mr-2" />
                  Export PDF
                </button>
              </div>
            </div>
          </div>

          {/* KPIs principale */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <Users className="w-5 h-5 text-[#6A8A82]" />
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">+12%</span>
              </div>
              <p className="text-2xl font-bold text-[#191919]">156</p>
              <p className="text-sm text-[#666666]">Clients Actifs</p>
              <div className="mt-2 flex items-center text-xs text-gray-500">
                <ChevronUp className="w-3 h-3 text-green-500 mr-1" />
                <span>18 nouveaux ce mois</span>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">+23%</span>
              </div>
              <p className="text-2xl font-bold text-[#191919]">2.45M</p>
              <p className="text-sm text-[#666666]">Chiffre d'Affaires</p>
              <div className="mt-2 flex items-center text-xs text-gray-500">
                <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                <span>FCFA YTD</span>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">+8%</span>
              </div>
              <p className="text-2xl font-bold text-[#191919]">15.7K</p>
              <p className="text-sm text-[#666666]">Panier Moyen</p>
              <div className="mt-2 flex items-center text-xs text-gray-500">
                <Info className="w-3 h-3 text-blue-500 mr-1" />
                <span>FCFA par commande</span>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <Timer className="w-5 h-5 text-orange-600" />
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">-5j</span>
              </div>
              <p className="text-2xl font-bold text-[#191919]">32j</p>
              <p className="text-sm text-[#666666]">DSO Moyen</p>
              <div className="mt-2 flex items-center text-xs text-gray-500">
                <ChevronDown className="w-3 h-3 text-green-500 mr-1" />
                <span>Amélioration</span>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <Wallet className="w-5 h-5 text-purple-600" />
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">+15%</span>
              </div>
              <p className="text-2xl font-bold text-[#191919]">487K</p>
              <p className="text-sm text-[#666666]">Encours Total</p>
              <div className="mt-2 flex items-center text-xs text-gray-500">
                <AlertTriangle className="w-3 h-3 text-orange-500 mr-1" />
                <span>3 impayés critiques</span>
              </div>
            </div>
          </div>

          {/* Indicateurs de Performance Détaillés */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Performance Commerciale */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#191919]">Performance Commerciale</h3>
                <Zap className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-[#666666]">Taux de Conversion</span>
                    <span className="text-sm font-semibold text-[#191919]">16%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '16%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-[#666666]">Taux de Rétention</span>
                    <span className="text-sm font-semibold text-[#191919]">89%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '89%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-[#666666]">Satisfaction Client</span>
                    <span className="text-sm font-semibold text-[#191919]">4.6/5</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-[#6A8A82] h-2 rounded-full" style={{ width: '92%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-[#666666]">NPS Score</span>
                    <span className="text-sm font-semibold text-[#191919]">72</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: '72%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Analyse des Risques */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#191919]">Analyse des Risques</h3>
                <Shield className="w-5 h-5 text-red-500" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-700">Risque Faible</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-lg font-bold text-gray-900 mr-2">78</span>
                    <span className="text-xs text-gray-500">clients</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-700">Risque Modéré</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-lg font-bold text-gray-900 mr-2">52</span>
                    <span className="text-xs text-gray-500">clients</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-700">Risque Élevé</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-lg font-bold text-gray-900 mr-2">21</span>
                    <span className="text-xs text-gray-500">clients</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-700">Risque Critique</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-lg font-bold text-gray-900 mr-2">5</span>
                    <span className="text-xs text-gray-500">clients</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Provision Risque</span>
                  <span className="text-lg font-bold text-[#B87333]">127K FCFA</span>
                </div>
              </div>
            </div>

            {/* Top Clients */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#191919]">Top 5 Clients</h3>
                <Award className="w-5 h-5 text-[#B87333]" />
              </div>
              <div className="space-y-3">
                {[
                  { nom: 'CONGO BUSINESS', ca: 245000, part: 10 },
                  { nom: 'AFRICAINE TECH', ca: 189000, part: 7.7 },
                  { nom: 'MINING CORP', ca: 167000, part: 6.8 },
                  { nom: 'DISTRIBUTION SA', ca: 145000, part: 5.9 },
                  { nom: 'LOGISTIC PRO', ca: 132000, part: 5.4 }
                ].map((client, idx) => (
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
                        <p className="text-sm font-medium text-[#191919]">{client.nom}</p>
                        <p className="text-xs text-[#666666]">{formatCurrency(client.ca)}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-[#6A8A82]">{client.part}%</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Part du Top 5</span>
                  <span className="text-sm font-bold text-[#191919]">35.8%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Graphiques principaux */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Evolution CA Mensuelle */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#191919]">Évolution du CA Mensuel</h3>
                <div className="flex items-center space-x-2">
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <Info className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={[
                  { mois: 'Jan', ca2024: 180000, ca2025: 210000 },
                  { mois: 'Fév', ca2024: 195000, ca2025: 225000 },
                  { mois: 'Mar', ca2024: 210000, ca2025: 245000 },
                  { mois: 'Avr', ca2024: 205000, ca2025: 238000 },
                  { mois: 'Mai', ca2024: 220000, ca2025: 265000 },
                  { mois: 'Juin', ca2024: 230000, ca2025: 280000 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mois" />
                  <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                  {compareMode && (
                    <Line
                      type="monotone"
                      dataKey="ca2024"
                      stroke="#B87333"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="CA 2024"
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="ca2025"
                    stroke="#6A8A82"
                    strokeWidth={2}
                    name="CA 2025"
                    dot={{ fill: '#6A8A82' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Répartition par Segment */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#191919]">Répartition par Segment</h3>
                <div className="flex items-center space-x-2">
                  <select className="text-sm border border-gray-300 rounded px-2 py-1">
                    <option>Par CA</option>
                    <option>Par Nombre</option>
                  </select>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    dataKey="ca"
                    data={analyticsData.clientsParSegment}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    label={({ segment, percent }) => `${segment} ${(percent * 100).toFixed(0)}%`}
                  >
                    {analyticsData.clientsParSegment.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                </RechartsPieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {analyticsData.clientsParSegment.map((segment, idx) => (
                  <div key={idx} className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    ></div>
                    <span className="text-xs text-gray-600">
                      {segment.segment}: {segment.count} clients
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Analyses Comportementales */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Fréquence d'Achat */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Fréquence d'Achat</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={[
                  { freq: 'Quotidien', clients: 12 },
                  { freq: 'Hebdo', clients: 34 },
                  { freq: 'Mensuel', clients: 67 },
                  { freq: 'Trimestriel', clients: 28 },
                  { freq: 'Annuel', clients: 15 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="freq" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="clients" fill="#6A8A82" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Répartition Géographique */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Répartition Géographique</h3>
              <div className="space-y-3">
                {[
                  { region: 'Brazzaville', clients: 45, color: 'bg-blue-500' },
                  { region: 'Pointe-Noire', clients: 38, color: 'bg-green-500' },
                  { region: 'Dolisie', clients: 28, color: 'bg-yellow-500' },
                  { region: 'Nkayi', clients: 22, color: 'bg-purple-500' },
                  { region: 'Autres', clients: 23, color: 'bg-gray-500' }
                ].map((region, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-700">{region.region}</span>
                      <span className="text-sm font-semibold">{region.clients}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`${region.color} h-2 rounded-full`}
                        style={{ width: `${(region.clients / 156) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Valeur Vie Client (CLV) */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Valeur Vie Client</h3>
              <div className="text-center mb-4">
                <p className="text-3xl font-bold text-[#6A8A82]">897K</p>
                <p className="text-sm text-gray-600">FCFA moyenne</p>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">VIP</span>
                  <span className="text-sm font-bold text-gray-900">1.8M FCFA</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">Premium</span>
                  <span className="text-sm font-bold text-gray-900">1.2M FCFA</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">Standard</span>
                  <span className="text-sm font-bold text-gray-900">650K FCFA</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">Prospect</span>
                  <span className="text-sm font-bold text-gray-900">230K FCFA</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tableau de Bord Prédictif */}
          <div className="bg-gradient-to-r from-[#6A8A82] to-[#7A99AC] rounded-lg p-6 text-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold">Analyses Prédictives</h3>
                <p className="text-sm opacity-90 mt-1">Basées sur l'IA et le Machine Learning</p>
              </div>
              <Database className="w-8 h-8 opacity-50" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-xs bg-white/20 px-2 py-1 rounded">ML Score: 89%</span>
                </div>
                <p className="text-2xl font-bold">+18%</p>
                <p className="text-sm opacity-90">Croissance prévue T2</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <AlertOctagon className="w-5 h-5" />
                  <span className="text-xs bg-white/20 px-2 py-1 rounded">Risque</span>
                </div>
                <p className="text-2xl font-bold">7</p>
                <p className="text-sm opacity-90">Clients à risque de churn</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Package className="w-5 h-5" />
                  <span className="text-xs bg-white/20 px-2 py-1 rounded">Opportunité</span>
                </div>
                <p className="text-2xl font-bold">23</p>
                <p className="text-sm opacity-90">Upsell potentiels</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Globe className="w-5 h-5" />
                  <span className="text-xs bg-white/20 px-2 py-1 rounded">Expansion</span>
                </div>
                <p className="text-2xl font-bold">3</p>
                <p className="text-sm opacity-90">Nouveaux marchés</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Client Detail Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#191919]">Détails Client</h2>
                <button
                  onClick={() => setSelectedClient(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Informations générales */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#191919]">Informations Générales</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Nom</label>
                      <p className="text-[#191919]">{selectedClient.nom}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Code</label>
                      <p className="text-[#191919]">{selectedClient.code}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Secteur d'activité</label>
                      <p className="text-[#191919]">{selectedClient.secteurActivite}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Segment</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSegmentColor(selectedClient.segmentClient)}`}>
                        {selectedClient.segmentClient}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Informations financières */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#191919]">Informations Financières</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Chiffre d'affaires</label>
                      <p className="text-[#191919]">{formatCurrency(selectedClient.chiffreAffaires)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Encours</label>
                      <p className="text-[#191919]">{formatCurrency(selectedClient.encours)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">DSO</label>
                      <p className="text-[#191919]">{selectedClient.dso} jours</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Risque</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(selectedClient.risqueClient)}`}>
                        {selectedClient.risqueClient}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact principal */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#191919]">Contact Principal</h3>
                  {selectedClient.contacts[0] && (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Nom</label>
                        <p className="text-[#191919]">{selectedClient.contacts[0].prenom} {selectedClient.contacts[0].nom}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Fonction</label>
                        <p className="text-[#191919]">{selectedClient.contacts[0].fonction}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-[#191919]">{selectedClient.contacts[0].telephone}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-[#191919]">{selectedClient.contacts[0].email}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* CRM Score */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#191919]">Score CRM</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Score de prospection</label>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${selectedClient.crm.scoreProspection}%` }}
                          ></div>
                        </div>
                        <span className="text-[#191919] font-medium">{selectedClient.crm.scoreProspection}%</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Probabilité de vente</label>
                      <p className="text-[#191919]">{selectedClient.crm.probabiliteVente}%</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Valeur opportunité</label>
                      <p className="text-[#191919]">{formatCurrency(selectedClient.crm.valeurOpportunite || 0)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setSelectedClient(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Fermer
                </button>
                <button className="px-4 py-2 bg-[#7A99AC] text-white rounded-lg hover:bg-[#6A89AC]">
                  Modifier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsModule;
