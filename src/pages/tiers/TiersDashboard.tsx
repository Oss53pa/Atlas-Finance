import React, { useState, useEffect, useCallback } from 'react';
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
  const [liveTiers, setLiveTiers] = useState({
    totalClients: 0, totalFournisseurs: 0, totalContacts: 0,
    chiffreAffairesTotal: 0, encoursClients: 0,
    impayesTotal: 0, dsoMoyen: 0, nouveauxClientsMois: 0,
    croissanceCA: 0, tauxRecouvrement: 0,
    totalProspects: 0, totalPartenaires: 0,
  });

  const loadData = useCallback(async () => {
    const tps = (await adapter.getAll('thirdParties')) as Record<string, any>[];
    const clients = tps.filter(tp => tp.type === 'customer' || tp.type === 'both');
    const fournisseurs = tps.filter(tp => tp.type === 'supplier' || tp.type === 'both');
    const prospects = tps.filter(tp => tp.type === 'prospect');
    const partenaires = tps.filter(tp => tp.type === 'partner');

    const now = new Date();
    const currentMonthStr = now.toISOString().substring(0, 7);
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthStr = prevMonthDate.toISOString().substring(0, 7);

    // Nouveaux clients ce mois (via createdAt or id prefix heuristic — use balance field unavailable, count tiers with no date as fallback)
    const nouveauxClientsMois = clients.filter(tp => {
      const created = tp.createdAt as string | undefined;
      return created ? created.startsWith(currentMonthStr) : false;
    }).length;

    const entries = (await adapter.getAll('journalEntries')) as {
      date?: string;
      status?: string;
      lines: Array<{ accountCode: string; debit: number; credit: number; lettrageCode?: string }>;
    }[];

    const postedEntries = entries.filter(e => e.status === 'posted');

    let ca = 0, encours = 0, impayes = 0;
    let caCurrentMonth = 0, caPrevMonth = 0;
    let totalLettre = 0, totalBrut = 0;

    for (const e of postedEntries) {
      if (!e.lines) continue;
      const month = e.date ? e.date.substring(0, 7) : '';
      for (const l of e.lines) {
        const code = l.accountCode || '';
        if (code.startsWith('7')) {
          const val = (l.credit || 0) - (l.debit || 0);
          ca += val;
          if (month === currentMonthStr) caCurrentMonth += val;
          if (month === prevMonthStr) caPrevMonth += val;
        }
        if (code.startsWith('411')) {
          const val = (l.debit || 0) - (l.credit || 0);
          encours += val;
          totalBrut += l.debit || 0;
          if (l.lettrageCode) totalLettre += l.debit || 0;
          // Impayes: unlettred 411 debit
          if (!l.lettrageCode) impayes += Math.max(0, val);
        }
      }
    }

    const dsoMoyen = ca > 0 ? Math.round((encours / ca) * 365) : 0;
    const croissanceCA = caPrevMonth > 0
      ? Math.round(((caCurrentMonth - caPrevMonth) / caPrevMonth) * 100 * 10) / 10
      : 0;
    const tauxRecouvrement = totalBrut > 0 ? Math.round((totalLettre / totalBrut) * 100) : 0;

    setLiveTiers({
      totalClients: clients.length,
      totalFournisseurs: fournisseurs.length,
      totalContacts: tps.length,
      chiffreAffairesTotal: ca,
      encoursClients: encours > 0 ? encours : 0,
      impayesTotal: impayes > 0 ? impayes : 0,
      dsoMoyen,
      nouveauxClientsMois,
      croissanceCA,
      tauxRecouvrement,
      totalProspects: prospects.length,
      totalPartenaires: partenaires.length,
    });
  }, [adapter]);

  useEffect(() => { loadData(); }, [loadData]);

  const kpis: TiersKPI = {
    totalClients: liveTiers.totalClients,
    totalFournisseurs: liveTiers.totalFournisseurs,
    totalContacts: liveTiers.totalContacts,
    chiffreAffairesTotal: liveTiers.chiffreAffairesTotal,
    encoursClients: liveTiers.encoursClients,
    impayesTotal: liveTiers.impayesTotal,
    dsoMoyen: liveTiers.dsoMoyen,
    nouveauxClientsMois: liveTiers.nouveauxClientsMois,
    croissanceCA: liveTiers.croissanceCA,
    tauxRecouvrement: liveTiers.tauxRecouvrement,
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
    { id: 'prospects', label: 'Prospects', icon: Target, badge: liveTiers.totalProspects > 0 ? liveTiers.totalProspects.toString() : undefined },
    { id: 'partenaires', label: 'Partenaires', icon: Handshake, badge: liveTiers.totalPartenaires > 0 ? liveTiers.totalPartenaires.toString() : undefined },
    { id: 'recouvrement', label: t('thirdParty.collection'), icon: DollarSign },
    { id: 'lettrage', label: t('thirdParty.reconciliation'), icon: FileText },
    { id: 'collaboration', label: 'Collaboration', icon: MessageSquare }
  ];

  const handleRefresh = () => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  };

  const handleExport = () => {
  };


  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'EXCELLENT': 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]',
      'BON': 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
      'MOYEN': 'bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)]',
      'DIFFICILE': 'bg-[var(--color-warning-lighter)] text-[var(--color-warning-darker)]',
      'CRITIQUE': 'bg-[var(--color-error-lighter)] text-[var(--color-error-darker)]'
    };
    return statusConfig[status as keyof typeof statusConfig] || 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]';
  };

  const COLORS = ['#235A6E', '#E89A2E', '#15803D', '#4E7E8D', '#C77E2C', '#7FA3AF'];

  return (
    <div className="p-6 bg-[var(--color-border)] min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm mb-6">
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
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-text-secondary)] flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[var(--color-primary)]">Gestion des Tiers</h1>
                <p className="text-sm text-[var(--color-text-secondary)]">Management complet des relations commerciales</p>
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
              className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors" aria-label="Télécharger">
              <Download className="w-4 h-4" />
              <span className="text-sm font-semibold">{t('common.export')}</span>
            </button>

            <button
              onClick={() => navigate('/tiers/clients')}
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
                  ? 'bg-white text-[var(--color-primary)] shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[#404040]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
              {tab.badge && (
                <span className="bg-[var(--color-primary)] text-white text-xs px-2 py-0.5 rounded-full">
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
            <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">Total Clients</p>
                  <p className="text-lg font-bold text-[var(--color-primary)]">{kpis.totalClients}</p>
                  <p className="text-xs text-[var(--color-success)]">+{kpis.nouveauxClientsMois} ce mois</p>
                </div>
                <div className="w-10 h-10 bg-[var(--color-primary)]/10 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-[var(--color-primary)]" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('navigation.suppliers')}</p>
                  <p className="text-lg font-bold text-[var(--color-primary)]">{kpis.totalFournisseurs}</p>
                  <p className="text-xs text-[var(--color-primary)]">Actifs</p>
                </div>
                <div className="w-10 h-10 bg-[var(--color-text-secondary)]/10 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-[var(--color-text-secondary)]" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">CA Total</p>
                  <p className="text-lg font-bold text-[var(--color-primary)]">{formatCurrency(kpis.chiffreAffairesTotal)}</p>
                  <p className="text-xs text-[var(--color-success)]">+{kpis.croissanceCA}% vs mois dernier</p>
                </div>
                <div className="w-10 h-10 bg-[var(--color-success-lighter)] rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[var(--color-success)]" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">Encours Clients</p>
                  <p className="text-lg font-bold text-[var(--color-primary)]">{formatCurrency(kpis.encoursClients)}</p>
                  <p className="text-xs text-[var(--color-warning)]">DSO: {kpis.dsoMoyen} jours</p>
                </div>
                <div className="w-10 h-10 bg-[var(--color-warning-lighter)] rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[var(--color-warning)]" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">Taux Recouvrement</p>
                  <p className="text-lg font-bold text-[var(--color-primary)]">{kpis.tauxRecouvrement}%</p>
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
            <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
              <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">Répartition Clients par Segment</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    dataKey="ca"
                    data={clientAnalytics.repartitionParSegment}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#235A6E"
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
            <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
              <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">Évolution du Chiffre d'Affaires</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={clientAnalytics.evolutionCA}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Area type="monotone" dataKey="valeur" stroke="#235A6E" fill="#235A6E" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tables Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Clients */}
            <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[var(--color-primary)]">Top Clients</h3>
                <button
                  onClick={() => setActiveTab('clients')}
                  className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary)]/80 font-medium"
                >
                  Voir tous →
                </button>
              </div>
              <div className="space-y-3">
                {clientAnalytics.topClients.map((client) => (
                  <div key={client.id} className="flex items-center justify-between p-3 bg-[var(--color-background-secondary)] rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-[var(--color-primary)]">{client.nom}</p>
                      <p className="text-sm text-[var(--color-text-secondary)]">CA: {formatCurrency(client.ca)} • DSO: {client.dso}j</p>
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
            <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
              <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">Activités Récentes</h3>
              <div className="space-y-3">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activity.color}`}>
                      <activity.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--color-primary)]">{activity.description}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
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
        <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-2">Module Clients</h3>
            <p className="text-[var(--color-text-secondary)] mb-4">Interface de gestion complète des clients avec CRM intégré</p>
            <button
              onClick={() => navigate('/tiers/clients')}
              className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors"
            >
              Accéder au module Clients
            </button>
          </div>
        </div>
      )}

      {activeTab === 'fournisseurs' && (
        <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-2">Module Fournisseurs</h3>
            <p className="text-[var(--color-text-secondary)] mb-4">Gestion complète des fournisseurs et évaluations</p>
            <button
              onClick={() => navigate('/tiers/fournisseurs')}
              className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors"
            >
              Accéder au module Fournisseurs
            </button>
          </div>
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
          <div className="text-center py-12">
            <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-2">Module Contacts</h3>
            <p className="text-[var(--color-text-secondary)] mb-4">Centralisation de tous les contacts tiers</p>
            <button
              onClick={() => navigate('/tiers/contacts')}
              className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors"
            >
              Accéder au module Contacts
            </button>
          </div>
        </div>
      )}

      {activeTab === 'recouvrement' && (
        <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-2">Module Recouvrement</h3>
            <p className="text-[var(--color-text-secondary)] mb-4">Gestion des créances et processus de recouvrement</p>
            <button
              onClick={() => navigate('/tiers/recouvrement')}
              className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors"
            >
              Accéder au module Recouvrement
            </button>
          </div>
        </div>
      )}

      {activeTab === 'lettrage' && (
        <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-2">Module Lettrage Global</h3>
            <p className="text-[var(--color-text-secondary)] mb-4">Rapprochement et lettrage des comptes tiers</p>
            <button
              onClick={() => navigate('/tiers/lettrage')}
              className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors"
            >
              Accéder au module Lettrage
            </button>
          </div>
        </div>
      )}

      {activeTab === 'prospects' && (
        <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
          <div className="text-center py-12">
            <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-2">Module Prospects</h3>
            <p className="text-[var(--color-text-secondary)] mb-4">Gestion du pipeline commercial et suivi des opportunités</p>
            <button
              onClick={() => navigate('/tiers/prospects')}
              className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors"
            >
              Accéder au module Prospects
            </button>
          </div>
        </div>
      )}

      {activeTab === 'partenaires' && (
        <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
          <div className="text-center py-12">
            <Handshake className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-2">Module Partenaires</h3>
            <p className="text-[var(--color-text-secondary)] mb-4">Écosystème et réseau de partenaires stratégiques</p>
            <button
              onClick={() => navigate('/tiers/partenaires')}
              className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors"
            >
              Accéder au module Partenaires
            </button>
          </div>
        </div>
      )}

      {activeTab === 'collaboration' && (
        <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-2">Module Chat & Collaboration</h3>
            <p className="text-[var(--color-text-secondary)] mb-4">Communication en temps réel et collaboration équipe</p>
            <button
              onClick={() => navigate('/tiers/contacts')}
              className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors"
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