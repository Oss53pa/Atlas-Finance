import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import {
  Users, Building2, UserCheck, Clock, DollarSign, TrendingUp,
  ArrowLeft, Plus, Download, Eye, Edit, Search, Filter,
  BarChart3, PieChart, Activity, AlertTriangle, CheckCircle,
  Phone, Mail, MapPin, Calendar, Target, CreditCard,
  FileText, MessageSquare, Settings, RefreshCw, Handshake
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart as RechartsPieChart, Pie, Cell, LineChart, Line, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { TiersKPI, ClientAnalytics, SupplierAnalytics, ThirdParty, Client, Supplier } from '../../types/tiers';

const TiersDashboard: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('30d');

  // Mock KPIs
  const kpis: TiersKPI = {
    totalClients: 156,
    totalFournisseurs: 89,
    totalContacts: 234,
    chiffreAffairesTotal: 2450000,
    encoursClients: 125000,
    impayesTotal: 35000,
    dsoMoyen: 32,
    nouveauxClientsMois: 12,
    croissanceCA: 8.5,
    tauxRecouvrement: 94.2
  };

  // Mock Analytics Data
  const clientAnalytics: ClientAnalytics = {
    repartitionParSegment: [
      { segment: 'VIP', nombre: 15, ca: 850000, pourcentage: 34.7 },
      { segment: 'PREMIUM', nombre: 35, ca: 720000, pourcentage: 29.4 },
      { segment: 'STANDARD', nombre: 89, ca: 650000, pourcentage: 26.5 },
      { segment: 'PROSPECT', nombre: 17, ca: 230000, pourcentage: 9.4 }
    ],
    evolutionCA: [
      { date: 'Jan', valeur: 180000 },
      { date: 'Fév', valeur: 195000 },
      { date: 'Mar', valeur: 210000 },
      { date: 'Avr', valeur: 205000 },
      { date: 'Mai', valeur: 225000 },
      { date: 'Juin', valeur: 240000 }
    ],
    topClients: [
      { id: '1', nom: 'SARL CONGO BUSINESS', ca: 245000, encours: 15000, dso: 28, statut: 'EXCELLENT' },
      { id: '2', nom: 'STE AFRICAINE TECH', ca: 189000, encours: 8500, dso: 22, statut: 'BON' },
      { id: '3', nom: 'CAMEROUN INDUSTRIES', ca: 156000, encours: 25000, dso: 45, statut: 'MOYEN' },
      { id: '4', nom: 'GABON LOGISTICS', ca: 134000, encours: 5000, dso: 18, statut: 'EXCELLENT' }
    ],
    risqueClients: [
      { niveau: 'FAIBLE', nombre: 98, montant: 1250000 },
      { niveau: 'MOYEN', nombre: 45, montant: 850000 },
      { niveau: 'ELEVE', nombre: 12, montant: 320000 },
      { niveau: 'CRITIQUE', nombre: 1, montant: 30000 }
    ],
    dsoEvolution: [
      { date: 'Jan', valeur: 35 },
      { date: 'Fév', valeur: 33 },
      { date: 'Mar', valeur: 31 },
      { date: 'Avr', valeur: 34 },
      { date: 'Mai', valeur: 32 },
      { date: 'Juin', valeur: 32 }
    ]
  };

  const supplierAnalytics: SupplierAnalytics = {
    repartitionParCategorie: [
      { categorie: 'MATIERE_PREMIERE', nombre: 35, montant: 450000 },
      { categorie: 'SERVICE', nombre: 28, montant: 320000 },
      { categorie: 'EQUIPEMENT', nombre: 18, montant: 280000 },
      { categorie: 'CONSOMMABLE', nombre: 8, montant: 95000 }
    ],
    evaluations: [
      { fournisseur: 'CEMAC SUPPLIES', scoreGlobal: 9.2, qualite: 9.5, delais: 8.8, service: 9.3 },
      { fournisseur: 'AFRICA MATERIALS', scoreGlobal: 8.7, qualite: 8.5, delais: 9.0, service: 8.6 },
      { fournisseur: 'CENTRAL SERVICES', scoreGlobal: 8.3, qualite: 8.0, delais: 8.5, service: 8.5 }
    ],
    delaisLivraison: [
      { fournisseur: 'CEMAC SUPPLIES', delaiMoyen: 3.2, respectDelais: 95 },
      { fournisseur: 'AFRICA MATERIALS', delaiMoyen: 4.1, respectDelais: 88 },
      { fournisseur: 'CENTRAL SERVICES', delaiMoyen: 5.5, respectDelais: 82 }
    ],
    volumeAchats: [
      { mois: 'Jan', montant: 85000, nombreCommandes: 45 },
      { mois: 'Fév', montant: 92000, nombreCommandes: 52 },
      { mois: 'Mar', montant: 78000, nombreCommandes: 38 },
      { mois: 'Avr', montant: 105000, nombreCommandes: 58 },
      { mois: 'Mai', montant: 98000, nombreCommandes: 48 },
      { mois: 'Juin', montant: 110000, nombreCommandes: 62 }
    ]
  };

  // Mock Recent Activities
  const recentActivities = [
    {
      id: '1',
      type: 'nouveau_client',
      description: 'Nouveau client ajouté: DOUALA TRADING',
      user: 'Marie Kouam',
      timestamp: '2024-09-19T10:30:00Z',
      icon: Users,
      color: 'text-[var(--color-success)] bg-[var(--color-success-lighter)]'
    },
    {
      id: '2',
      type: 'paiement_recu',
      description: 'Paiement reçu de CEMAC INDUSTRIES: 45,000 FCFA',
      user: 'Paul Mbeki',
      timestamp: '2024-09-19T09:15:00Z',
      icon: CreditCard,
      color: 'text-[#6A8A82] bg-[#6A8A82]/10'
    },
    {
      id: '3',
      type: 'relance_effectuee',
      description: 'Relance envoyée à GABON LOGISTICS',
      user: 'Sophie Ndong',
      timestamp: '2024-09-19T08:45:00Z',
      icon: Phone,
      color: 'text-[var(--color-warning)] bg-[var(--color-warning-lighter)]'
    },
    {
      id: '4',
      type: 'evaluation_fournisseur',
      description: 'Évaluation complétée pour AFRICA MATERIALS',
      user: 'Jean Akono',
      timestamp: '2024-09-18T16:20:00Z',
      icon: Target,
      color: 'text-[#B87333] bg-[#B87333]/10'
    }
  ];

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
    { id: 'clients', label: t('navigation.clients'), icon: Users, badge: kpis.totalClients.toString() },
    { id: 'fournisseurs', label: t('navigation.suppliers'), icon: Building2, badge: kpis.totalFournisseurs.toString() },
    { id: 'contacts', label: 'Contacts', icon: UserCheck, badge: kpis.totalContacts.toString() },
    { id: 'prospects', label: 'Prospects', icon: Target, badge: '47' },
    { id: 'partenaires', label: 'Partenaires', icon: Handshake, badge: '23' },
    { id: 'recouvrement', label: t('thirdParty.collection'), icon: DollarSign },
    { id: 'lettrage', label: t('thirdParty.reconciliation'), icon: FileText },
    { id: 'collaboration', label: 'Collaboration', icon: MessageSquare }
  ];

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  };

  const handleExport = () => {
    console.log('Exporting dashboard data...');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'EXCELLENT': 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]',
      'BON': 'bg-[#6A8A82]/10 text-[#6A8A82]',
      'MOYEN': 'bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)]',
      'DIFFICILE': 'bg-[var(--color-warning-lighter)] text-[var(--color-warning-darker)]',
      'CRITIQUE': 'bg-[var(--color-error-lighter)] text-[var(--color-error-darker)]'
    };
    return statusConfig[status as keyof typeof statusConfig] || 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]';
  };

  const COLORS = ['#6A8A82', '#B87333', '#5A6B65', '#9B6B2A', '#7A9B94'];

  return (
    <div className="p-6 bg-[#ECECEC] min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-[var(--color-background-hover)] hover:bg-[var(--color-border)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#444444]" />
              <span className="text-sm font-semibold text-[#444444]">{t('dashboard.title')}</span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#6A8A82] to-[#B87333] flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#191919]">Gestion des Tiers</h1>
                <p className="text-sm text-[#666666]">Management complet des relations commerciales</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-[var(--color-background-secondary)] rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-[var(--color-text-secondary)]" />
              <input
                type="text"
                placeholder="Rechercher un tiers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-48"
              />
            </div>

            <button
              onClick={handleRefresh}
              className={`p-2 rounded-lg bg-[var(--color-background-hover)] hover:bg-[var(--color-border)] transition-colors ${loading ? 'animate-spin' : ''}`} aria-label="Actualiser">
              <RefreshCw className="w-4 h-4 text-[#444444]" />
            </button>

            <button
              onClick={handleExport}
              className="flex items-center space-x-2 px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#6A8A82]/90 transition-colors" aria-label="Télécharger">
              <Download className="w-4 h-4" />
              <span className="text-sm font-semibold">{t('common.export')}</span>
            </button>

            <button
              onClick={() => navigate('/tiers/nouveau')}
              className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)] transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-semibold">Nouveau Tiers</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mt-6 bg-[var(--color-background-hover)] rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors relative ${
                activeTab === tab.id
                  ? 'bg-white text-[#6A8A82] shadow-sm'
                  : 'text-[#666666] hover:text-[#444444]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
              {tab.badge && (
                <span className="bg-[#6A8A82] text-white text-xs px-2 py-0.5 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPIs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Total Clients</p>
                  <p className="text-2xl font-bold text-[#191919]">{kpis.totalClients}</p>
                  <p className="text-xs text-[var(--color-success)]">+{kpis.nouveauxClientsMois} ce mois</p>
                </div>
                <div className="w-10 h-10 bg-[#6A8A82]/10 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#6A8A82]" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">{t('navigation.suppliers')}</p>
                  <p className="text-2xl font-bold text-[#191919]">{kpis.totalFournisseurs}</p>
                  <p className="text-xs text-[#6A8A82]">Actifs</p>
                </div>
                <div className="w-10 h-10 bg-[#B87333]/10 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-[#B87333]" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">CA Total</p>
                  <p className="text-2xl font-bold text-[#191919]">{formatCurrency(kpis.chiffreAffairesTotal)}</p>
                  <p className="text-xs text-[var(--color-success)]">+{kpis.croissanceCA}% vs mois dernier</p>
                </div>
                <div className="w-10 h-10 bg-[var(--color-success-lighter)] rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[var(--color-success)]" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Encours Clients</p>
                  <p className="text-2xl font-bold text-[#191919]">{formatCurrency(kpis.encoursClients)}</p>
                  <p className="text-xs text-[var(--color-warning)]">DSO: {kpis.dsoMoyen} jours</p>
                </div>
                <div className="w-10 h-10 bg-[var(--color-warning-lighter)] rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[var(--color-warning)]" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Taux Recouvrement</p>
                  <p className="text-2xl font-bold text-[#191919]">{kpis.tauxRecouvrement}%</p>
                  <p className="text-xs text-[var(--color-error)]">{formatCurrency(kpis.impayesTotal)} d'impayés</p>
                </div>
                <div className="w-10 h-10 bg-[var(--color-error-lighter)] rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-[var(--color-error)]" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Client Segments */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Répartition Clients par Segment</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    dataKey="ca"
                    data={clientAnalytics.repartitionParSegment}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    label={({ segment, pourcentage }) => `${segment} (${pourcentage}%)`}
                  >
                    {clientAnalytics.repartitionParSegment.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>

            {/* CA Evolution */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Évolution du Chiffre d'Affaires</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={clientAnalytics.evolutionCA}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Area type="monotone" dataKey="valeur" stroke="#6A8A82" fill="#6A8A82" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tables Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Clients */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#191919]">Top Clients</h3>
                <button
                  onClick={() => setActiveTab('clients')}
                  className="text-sm text-[#6A8A82] hover:text-[#6A8A82]/80 font-medium"
                >
                  Voir tous →
                </button>
              </div>
              <div className="space-y-3">
                {clientAnalytics.topClients.map((client) => (
                  <div key={client.id} className="flex items-center justify-between p-3 bg-[var(--color-background-secondary)] rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-[#191919]">{client.nom}</p>
                      <p className="text-sm text-[#666666]">CA: {formatCurrency(client.ca)} • DSO: {client.dso}j</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(client.statut)}`}>
                        {client.statut}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activities */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Activités Récentes</h3>
              <div className="space-y-3">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activity.color}`}>
                      <activity.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#191919]">{activity.description}</p>
                      <p className="text-xs text-[#666666]">
                        par {activity.user} • {new Date(activity.timestamp).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Other tabs would show respective components */}
      {activeTab === 'clients' && (
        <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#191919] mb-2">Module Clients</h3>
            <p className="text-[#666666] mb-4">Interface de gestion complète des clients avec CRM intégré</p>
            <button
              onClick={() => navigate('/tiers/clients')}
              className="px-6 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#6A8A82]/90 transition-colors"
            >
              Accéder au module Clients
            </button>
          </div>
        </div>
      )}

      {activeTab === 'fournisseurs' && (
        <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#191919] mb-2">Module Fournisseurs</h3>
            <p className="text-[#666666] mb-4">Gestion complète des fournisseurs et évaluations</p>
            <button
              onClick={() => navigate('/tiers/fournisseurs')}
              className="px-6 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#6A8A82]/90 transition-colors"
            >
              Accéder au module Fournisseurs
            </button>
          </div>
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
          <div className="text-center py-12">
            <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#191919] mb-2">Module Contacts</h3>
            <p className="text-[#666666] mb-4">Centralisation de tous les contacts tiers</p>
            <button
              onClick={() => navigate('/tiers/contacts')}
              className="px-6 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#6A8A82]/90 transition-colors"
            >
              Accéder au module Contacts
            </button>
          </div>
        </div>
      )}

      {activeTab === 'recouvrement' && (
        <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#191919] mb-2">Module Recouvrement</h3>
            <p className="text-[#666666] mb-4">Gestion des créances et processus de recouvrement</p>
            <button
              onClick={() => navigate('/tiers/recouvrement')}
              className="px-6 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#6A8A82]/90 transition-colors"
            >
              Accéder au module Recouvrement
            </button>
          </div>
        </div>
      )}

      {activeTab === 'lettrage' && (
        <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#191919] mb-2">Module Lettrage Global</h3>
            <p className="text-[#666666] mb-4">Rapprochement et lettrage des comptes tiers</p>
            <button
              onClick={() => navigate('/tiers/lettrage')}
              className="px-6 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#6A8A82]/90 transition-colors"
            >
              Accéder au module Lettrage
            </button>
          </div>
        </div>
      )}

      {activeTab === 'prospects' && (
        <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
          <div className="text-center py-12">
            <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#191919] mb-2">Module Prospects</h3>
            <p className="text-[#666666] mb-4">Gestion du pipeline commercial et suivi des opportunités</p>
            <button
              onClick={() => navigate('/tiers/prospects')}
              className="px-6 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#6A8A82]/90 transition-colors"
            >
              Accéder au module Prospects
            </button>
          </div>
        </div>
      )}

      {activeTab === 'partenaires' && (
        <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
          <div className="text-center py-12">
            <Handshake className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#191919] mb-2">Module Partenaires</h3>
            <p className="text-[#666666] mb-4">Écosystème et réseau de partenaires stratégiques</p>
            <button
              onClick={() => navigate('/tiers/partenaires')}
              className="px-6 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#6A8A82]/90 transition-colors"
            >
              Accéder au module Partenaires
            </button>
          </div>
        </div>
      )}

      {activeTab === 'collaboration' && (
        <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#191919] mb-2">Module Chat & Collaboration</h3>
            <p className="text-[#666666] mb-4">Communication en temps réel et collaboration équipe</p>
            <button
              onClick={() => navigate('/tiers/collaboration')}
              className="px-6 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#6A8A82]/90 transition-colors"
            >
              Accéder au module Collaboration
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TiersDashboard;