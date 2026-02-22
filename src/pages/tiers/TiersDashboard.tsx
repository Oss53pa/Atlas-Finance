import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
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
  const { adapter } = useData();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('30d');

  // KPIs from DataContext
  const [liveTiers, setLiveTiers] = useState({ totalClients: 0, totalFournisseurs: 0, totalContacts: 0, chiffreAffairesTotal: 0, encoursClients: 0 });

  useEffect(() => {
    const load = async () => {
      const tps = (await adapter.getAll('thirdParties')) as any[];
      const clients = tps.filter(tp => tp.type === 'client');
      const fournisseurs = tps.filter(tp => tp.type === 'supplier');
      const entries = (await adapter.getAll('journalEntries')) as any[];
      // Compute revenue from class 7
      let ca = 0, encours = 0;
      for (const e of entries) {
        for (const l of e.lines) {
          if (l.accountCode.startsWith('7')) ca += l.credit - l.debit;
          if (l.accountCode.startsWith('411')) encours += l.debit - l.credit;
        }
      }
      setLiveTiers({
        totalClients: clients.length,
        totalFournisseurs: fournisseurs.length,
        totalContacts: tps.length,
        chiffreAffairesTotal: ca,
        encoursClients: encours > 0 ? encours : 0,
      });
    };
    load();
  }, [adapter]);

  const kpis: TiersKPI = {
    totalClients: liveTiers.totalClients,
    totalFournisseurs: liveTiers.totalFournisseurs,
    totalContacts: liveTiers.totalContacts,
    chiffreAffairesTotal: liveTiers.chiffreAffairesTotal,
    encoursClients: liveTiers.encoursClients,
    impayesTotal: 0,
    dsoMoyen: 0,
    nouveauxClientsMois: 0,
    croissanceCA: 0,
    tauxRecouvrement: 0
  };

  // Empty analytics — no mock data
  const clientAnalytics: ClientAnalytics = {
    repartitionParSegment: [],
    evolutionCA: [],
    topClients: [],
    risqueClients: [],
    dsoEvolution: []
  };

  const supplierAnalytics: SupplierAnalytics = {
    repartitionParCategorie: [],
    evaluations: [],
    delaisLivraison: [],
    volumeAchats: []
  };

  // Empty recent activities
  const recentActivities: Array<{
    id: string; type: string; description: string; user: string;
    timestamp: string; icon: any; color: string;
  }> = [];

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
    { id: 'clients', label: t('navigation.clients'), icon: Users, badge: kpis.totalClients.toString() },
    { id: 'fournisseurs', label: t('navigation.suppliers'), icon: Building2, badge: kpis.totalFournisseurs.toString() },
    { id: 'contacts', label: 'Contacts', icon: UserCheck, badge: kpis.totalContacts.toString() },
    { id: 'prospects', label: 'Prospects', icon: Target, badge: '0' },
    { id: 'partenaires', label: 'Partenaires', icon: Handshake, badge: '0' },
    { id: 'recouvrement', label: t('thirdParty.collection'), icon: DollarSign },
    { id: 'lettrage', label: t('thirdParty.reconciliation'), icon: FileText },
    { id: 'collaboration', label: 'Collaboration', icon: MessageSquare }
  ];

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  };

  const handleExport = () => {
  };


  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'EXCELLENT': 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]',
      'BON': 'bg-[#171717]/10 text-[#171717]',
      'MOYEN': 'bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)]',
      'DIFFICILE': 'bg-[var(--color-warning-lighter)] text-[var(--color-warning-darker)]',
      'CRITIQUE': 'bg-[var(--color-error-lighter)] text-[var(--color-error-darker)]'
    };
    return statusConfig[status as keyof typeof statusConfig] || 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]';
  };

  const COLORS = ['#171717', '#525252', '#a3a3a3', '#3b82f6', '#22c55e', '#f59e0b'];

  return (
    <div className="p-6 bg-[#e5e5e5] min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-[var(--color-background-hover)] hover:bg-[var(--color-border)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#404040]" />
              <span className="text-sm font-semibold text-[#404040]">{t('dashboard.title')}</span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#171717] to-[#525252] flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#171717]">Gestion des Tiers</h1>
                <p className="text-sm text-[#525252]">Management complet des relations commerciales</p>
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
              <RefreshCw className="w-4 h-4 text-[#404040]" />
            </button>

            <button
              onClick={handleExport}
              className="flex items-center space-x-2 px-4 py-2 bg-[#171717] text-white rounded-lg hover:bg-[#171717]/90 transition-colors" aria-label="Télécharger">
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
                  ? 'bg-white text-[#171717] shadow-sm'
                  : 'text-[#525252] hover:text-[#404040]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
              {tab.badge && (
                <span className="bg-[#171717] text-white text-xs px-2 py-0.5 rounded-full">
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
            <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#525252]">Total Clients</p>
                  <p className="text-lg font-bold text-[#171717]">{kpis.totalClients}</p>
                  <p className="text-xs text-[var(--color-success)]">+{kpis.nouveauxClientsMois} ce mois</p>
                </div>
                <div className="w-10 h-10 bg-[#171717]/10 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#171717]" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#525252]">{t('navigation.suppliers')}</p>
                  <p className="text-lg font-bold text-[#171717]">{kpis.totalFournisseurs}</p>
                  <p className="text-xs text-[#171717]">Actifs</p>
                </div>
                <div className="w-10 h-10 bg-[#525252]/10 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-[#525252]" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#525252]">CA Total</p>
                  <p className="text-lg font-bold text-[#171717]">{formatCurrency(kpis.chiffreAffairesTotal)}</p>
                  <p className="text-xs text-[var(--color-success)]">+{kpis.croissanceCA}% vs mois dernier</p>
                </div>
                <div className="w-10 h-10 bg-[var(--color-success-lighter)] rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[var(--color-success)]" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#525252]">Encours Clients</p>
                  <p className="text-lg font-bold text-[#171717]">{formatCurrency(kpis.encoursClients)}</p>
                  <p className="text-xs text-[var(--color-warning)]">DSO: {kpis.dsoMoyen} jours</p>
                </div>
                <div className="w-10 h-10 bg-[var(--color-warning-lighter)] rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[var(--color-warning)]" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#525252]">Taux Recouvrement</p>
                  <p className="text-lg font-bold text-[#171717]">{kpis.tauxRecouvrement}%</p>
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
            <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
              <h3 className="text-lg font-semibold text-[#171717] mb-4">Répartition Clients par Segment</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    dataKey="ca"
                    data={clientAnalytics.repartitionParSegment}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#737373"
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
            <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
              <h3 className="text-lg font-semibold text-[#171717] mb-4">Évolution du Chiffre d'Affaires</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={clientAnalytics.evolutionCA}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Area type="monotone" dataKey="valeur" stroke="#171717" fill="#171717" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tables Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Clients */}
            <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#171717]">Top Clients</h3>
                <button
                  onClick={() => setActiveTab('clients')}
                  className="text-sm text-[#171717] hover:text-[#171717]/80 font-medium"
                >
                  Voir tous →
                </button>
              </div>
              <div className="space-y-3">
                {clientAnalytics.topClients.map((client) => (
                  <div key={client.id} className="flex items-center justify-between p-3 bg-[var(--color-background-secondary)] rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-[#171717]">{client.nom}</p>
                      <p className="text-sm text-[#525252]">CA: {formatCurrency(client.ca)} • DSO: {client.dso}j</p>
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
            <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
              <h3 className="text-lg font-semibold text-[#171717] mb-4">Activités Récentes</h3>
              <div className="space-y-3">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activity.color}`}>
                      <activity.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#171717]">{activity.description}</p>
                      <p className="text-xs text-[#525252]">
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
        <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#171717] mb-2">Module Clients</h3>
            <p className="text-[#525252] mb-4">Interface de gestion complète des clients avec CRM intégré</p>
            <button
              onClick={() => navigate('/tiers/clients')}
              className="px-6 py-2 bg-[#171717] text-white rounded-lg hover:bg-[#171717]/90 transition-colors"
            >
              Accéder au module Clients
            </button>
          </div>
        </div>
      )}

      {activeTab === 'fournisseurs' && (
        <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#171717] mb-2">Module Fournisseurs</h3>
            <p className="text-[#525252] mb-4">Gestion complète des fournisseurs et évaluations</p>
            <button
              onClick={() => navigate('/tiers/fournisseurs')}
              className="px-6 py-2 bg-[#171717] text-white rounded-lg hover:bg-[#171717]/90 transition-colors"
            >
              Accéder au module Fournisseurs
            </button>
          </div>
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
          <div className="text-center py-12">
            <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#171717] mb-2">Module Contacts</h3>
            <p className="text-[#525252] mb-4">Centralisation de tous les contacts tiers</p>
            <button
              onClick={() => navigate('/tiers/contacts')}
              className="px-6 py-2 bg-[#171717] text-white rounded-lg hover:bg-[#171717]/90 transition-colors"
            >
              Accéder au module Contacts
            </button>
          </div>
        </div>
      )}

      {activeTab === 'recouvrement' && (
        <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#171717] mb-2">Module Recouvrement</h3>
            <p className="text-[#525252] mb-4">Gestion des créances et processus de recouvrement</p>
            <button
              onClick={() => navigate('/tiers/recouvrement')}
              className="px-6 py-2 bg-[#171717] text-white rounded-lg hover:bg-[#171717]/90 transition-colors"
            >
              Accéder au module Recouvrement
            </button>
          </div>
        </div>
      )}

      {activeTab === 'lettrage' && (
        <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#171717] mb-2">Module Lettrage Global</h3>
            <p className="text-[#525252] mb-4">Rapprochement et lettrage des comptes tiers</p>
            <button
              onClick={() => navigate('/tiers/lettrage')}
              className="px-6 py-2 bg-[#171717] text-white rounded-lg hover:bg-[#171717]/90 transition-colors"
            >
              Accéder au module Lettrage
            </button>
          </div>
        </div>
      )}

      {activeTab === 'prospects' && (
        <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
          <div className="text-center py-12">
            <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#171717] mb-2">Module Prospects</h3>
            <p className="text-[#525252] mb-4">Gestion du pipeline commercial et suivi des opportunités</p>
            <button
              onClick={() => navigate('/tiers/prospects')}
              className="px-6 py-2 bg-[#171717] text-white rounded-lg hover:bg-[#171717]/90 transition-colors"
            >
              Accéder au module Prospects
            </button>
          </div>
        </div>
      )}

      {activeTab === 'partenaires' && (
        <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
          <div className="text-center py-12">
            <Handshake className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#171717] mb-2">Module Partenaires</h3>
            <p className="text-[#525252] mb-4">Écosystème et réseau de partenaires stratégiques</p>
            <button
              onClick={() => navigate('/tiers/partenaires')}
              className="px-6 py-2 bg-[#171717] text-white rounded-lg hover:bg-[#171717]/90 transition-colors"
            >
              Accéder au module Partenaires
            </button>
          </div>
        </div>
      )}

      {activeTab === 'collaboration' && (
        <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] shadow-sm">
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#171717] mb-2">Module Chat & Collaboration</h3>
            <p className="text-[#525252] mb-4">Communication en temps réel et collaboration équipe</p>
            <button
              onClick={() => navigate('/tiers/collaboration')}
              className="px-6 py-2 bg-[#171717] text-white rounded-lg hover:bg-[#171717]/90 transition-colors"
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