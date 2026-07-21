import React, { useState, useEffect } from 'react';
import PageHeaderActions from '../../components/ui/PageHeaderActions';
import { formatCurrency } from '../../utils/formatters';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import {
  Target, Plus, Search, Filter, Download, Eye, Edit, Trash2,
  ArrowLeft, Phone, Mail, MapPin, Calendar, DollarSign,
  TrendingUp, Activity, AlertTriangle, CheckCircle, Star,
  User, Building, Clock, MessageSquare, BarChart3, PieChart,
  Users, FileText, Send, Archive, Award, Zap, Lightbulb
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart as RechartsPieChart, Pie, Cell, LineChart, Line, ResponsiveContainer,
  AreaChart, Area, FunnelChart, Funnel, LabelList
} from 'recharts';

interface Prospect {
  id: string;
  code: string;
  nom: string;
  type: 'PROSPECT';
  statut: 'NOUVEAU' | 'QUALIFIE' | 'INTERESSE' | 'NEGOCIATION' | 'PERDU' | 'GAGNE';
  source: 'SITE_WEB' | 'REFERRAL' | 'SALON' | 'COLD_CALLING' | 'RESEAUX_SOCIAUX' | 'PUBLICITE';
  secteurActivite: string;
  scoreProspection: number;
  probabiliteConversion: number;
  valeurPotentielle: number;
  dateCreation: string;
  dateContact: string;
  prochaineSuivi: string;
  responsableCommercial: string;
  contact: {
    nom: string;
    prenom: string;
    fonction: string;
    telephone: string;
    email: string;
  };
  adresse: {
    rue: string;
    ville: string;
    pays: string;
    region: string;
  };
  interactions: ProspectInteraction[];
  opportunites: Opportunite[];
  notes: string;
  stadeEntonnoir: 'DECOUVERTE' | 'QUALIFICATION' | 'PROPOSITION' | 'NEGOCIATION' | 'CLOSURE';
  besoinsIdentifies: string[];
  concurrents: string[];
  budgetEstime: number;
  tempsVentePrevue: number; // en jours
}

interface ProspectInteraction {
  id: string;
  type: 'APPEL' | 'EMAIL' | 'REUNION' | 'DEMO' | 'VISITE';
  date: string;
  description: string;
  resultat: 'POSITIF' | 'NEUTRE' | 'NEGATIF';
  prochaineSuivi?: string;
  responsable: string;
}

interface Opportunite {
  id: string;
  nom: string;
  valeur: number;
  probabilite: number;
  dateCreation: string;
  dateFermeturePrevue: string;
  statut: 'OUVERTE' | 'GAGNEE' | 'PERDUE';
  phase: string;
}

interface ProspectAnalytics {
  conversionRate: number;
  tempsConversionMoyen: number;
  valeurMoyenneProspect: number;
  sourcesMeilleurTaux: Array<{source: string; taux: number; nombre: number}>;
  evolutionPipeline: Array<{mois: string; nouveaux: number; convertis: number; perdus: number}>;
  repartitionParStade: Array<{stade: string; nombre: number; valeur: number}>;
}

const ProspectsModule: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pipeline');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState('tous');
  const [filterStatut, setFilterStatut] = useState('tous');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [showProspectModal, setShowProspectModal] = useState(false);
  const [showInteractionModal, setShowInteractionModal] = useState(false);

  const { adapter } = useData();

  // Data from DataContext — filter for prospects (customers with zero balance or all customers)
  const [thirdParties, setThirdParties] = useState<any[]>([]);

  const reloadTps = React.useCallback(async () => {
    const tps = await adapter.getAll('thirdParties');
    setThirdParties(tps as Record<string, unknown>[]);
  }, [adapter]);
  useEffect(() => { reloadTps(); }, [reloadTps]);

  // Création RÉELLE d'un prospect = tiers client (thirdParties), au lieu d'un bouton mort.
  const handleCreateProspect = async () => {
    const nom = window.prompt(t('prospects.promptProspectName'))?.trim();
    if (!nom) return;
    try {
      await adapter.create('thirdParties', {
        name: nom, code: nom.slice(0, 6).toUpperCase().replace(/\s/g, ''),
        type: 'customer', accountCode: '411000', balance: 0,
      } as any);
      await reloadTps();
      setShowProspectModal(false);
    } catch { /* création best-effort */ }
  };

  // Map third parties to prospect format — treat customers with zero balance as prospects
  const mockProspects: Prospect[] = thirdParties
    .filter(tp => tp.type === 'customer' || tp.type === 'both')
    .map((tp, index) => ({
      id: tp.id,
      code: tp.code,
      nom: tp.name,
      type: 'PROSPECT' as const,
      statut: tp.balance === 0 ? 'NOUVEAU' as const : 'QUALIFIE' as const,
      source: 'SITE_WEB' as const,
      secteurActivite: t('prospects.sectorGeneral'),
      scoreProspection: tp.balance === 0 ? 50 : 75,
      probabiliteConversion: tp.balance === 0 ? 30 : 60,
      valeurPotentielle: Math.abs(tp.balance) || 100000,
      dateCreation: new Date().toISOString().split('T')[0],
      dateContact: new Date().toISOString().split('T')[0],
      prochaineSuivi: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      responsableCommercial: t('prospects.unassigned'),
      contact: {
        nom: tp.name.split(' ').slice(1).join(' ') || tp.name,
        prenom: tp.name.split(' ')[0] || '',
        fonction: t('prospects.mainContactRole'),
        telephone: tp.phone || '',
        email: tp.email || '',
      },
      adresse: {
        rue: tp.address || '',
        ville: '',
        pays: '',
        region: '',
      },
      interactions: [],
      opportunites: [],
      notes: `Code: ${tp.code}${tp.taxId ? ` | NIF: ${tp.taxId}` : ''}`,
      stadeEntonnoir: 'DECOUVERTE' as const,
      besoinsIdentifies: [],
      concurrents: [],
      budgetEstime: Math.abs(tp.balance) || 100000,
      tempsVentePrevue: 90,
    }));

  // Analytics calculées sur les prospects RÉELS (issus de thirdParties).
  const analytics: ProspectAnalytics = (() => {
    const list = mockProspects;
    const n = list.length;
    const avg = (f: (p: Prospect) => number) => (n ? list.reduce((s, p) => s + f(p), 0) / n : 0);
    const bySource = new Map<string, { source: Prospect['source']; taux: number; nombre: number }>();
    for (const p of list) {
      const s = bySource.get(p.source) || { source: p.source, taux: 0, nombre: 0 };
      s.nombre += 1;
      bySource.set(p.source, s);
    }
    const byStade = new Map<string, { stade: Prospect['stadeEntonnoir']; nombre: number; valeur: number }>();
    for (const p of list) {
      const st = byStade.get(p.stadeEntonnoir) || { stade: p.stadeEntonnoir, nombre: 0, valeur: 0 };
      st.nombre += 1;
      st.valeur += p.valeurPotentielle || 0;
      byStade.set(p.stadeEntonnoir, st);
    }
    return {
      conversionRate: n ? Math.round((list.filter(p => p.statut === 'QUALIFIE').length / n) * 100) : 0,
      tempsConversionMoyen: Math.round(avg(p => p.tempsVentePrevue || 0)),
      valeurMoyenneProspect: Math.round(avg(p => p.valeurPotentielle || 0)),
      sourcesMeilleurTaux: Array.from(bySource.values()),
      evolutionPipeline: [],
      repartitionParStade: Array.from(byStade.values()),
    };
  })();

  const tabs = [
    { id: 'pipeline', label: t('prospects.tabPipeline'), icon: TrendingUp },
    { id: 'prospects', label: t('prospects.tabProspects'), icon: Target },
    { id: 'opportunites', label: t('prospects.tabOpportunities'), icon: DollarSign },
    { id: 'analytics', label: t('prospects.tabAnalytics'), icon: BarChart3 },
    { id: 'actions', label: t('prospects.tabMarketing'), icon: MessageSquare }
  ];

  const sources = [
    { value: 'tous', label: t('prospects.allSources') },
    { value: 'SITE_WEB', label: t('prospects.sourceWebsite') },
    { value: 'REFERRAL', label: t('prospects.sourceReferral') },
    { value: 'SALON', label: t('prospects.sourceTradeShow') },
    { value: 'COLD_CALLING', label: t('prospects.sourceColdCalling') },
    { value: 'RESEAUX_SOCIAUX', label: t('prospects.sourceSocial') },
    { value: 'PUBLICITE', label: t('prospects.sourceAds') }
  ];

  const statuts = [
    { value: 'tous', label: t('prospects.allStatuses') },
    { value: 'NOUVEAU', label: t('actions.new') },
    { value: 'QUALIFIE', label: t('prospects.statusQualified') },
    { value: 'INTERESSE', label: t('prospects.statusInterested') },
    { value: 'NEGOCIATION', label: t('prospects.statusNegotiation') },
    { value: 'PERDU', label: t('prospects.statusLost') },
    { value: 'GAGNE', label: t('prospects.statusWon') }
  ];

  const filteredProspects = mockProspects.filter(prospect => {
    const matchesSearch = prospect.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prospect.contact.nom.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource = filterSource === 'tous' || prospect.source === filterSource;
    const matchesStatut = filterStatut === 'tous' || prospect.statut === filterStatut;
    return matchesSearch && matchesSource && matchesStatut;
  });


  const getStatutBadge = (statut: string) => {
    const statusConfig = {
      'NOUVEAU': 'bg-blue-100 text-blue-800',
      'QUALIFIE': 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
      'INTERESSE': 'bg-green-100 text-green-800',
      'NEGOCIATION': 'bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)]',
      'PERDU': 'bg-red-100 text-red-800',
      'GAGNE': 'bg-primary-100 text-primary-800'
    };
    return statusConfig[statut as keyof typeof statusConfig] || 'bg-gray-100 text-gray-800';
  };

  const getSourceIcon = (source: string) => {
    const icons = {
      'SITE_WEB': MessageSquare,
      'REFERRAL': Users,
      'SALON': Award,
      'COLD_CALLING': Phone,
      'RESEAUX_SOCIAUX': MessageSquare,
      'PUBLICITE': Zap
    };
    return icons[source as keyof typeof icons] || Target;
  };

  const COLORS = ['#235A6E', '#E89A2E', '#15803D', '#4E7E8D', '#C77E2C', '#7FA3AF'];

  return (
    <div className="p-6 bg-[var(--color-border)] min-h-screen ">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/tiers')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#404040]" />
              <span className="text-sm font-semibold text-[#404040]">{t('prospects.back')}</span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-text-secondary)] flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[var(--color-primary)]">{t('prospects.title')}</h1>
                <p className="text-sm text-[var(--color-text-secondary)]">{t('prospects.subtitle')}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-gray-700" />
              <input
                type="text"
                placeholder={t('prospects.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-48"
              />
            </div>

            {showFilters && (
            <>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              {sources.map(source => (
                <option key={source.value} value={source.value}>{source.label}</option>
              ))}
            </select>

            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              {statuts.map(statut => (
                <option key={statut.value} value={statut.value}>{statut.label}</option>
              ))}
            </select>
            </>
            )}

            <PageHeaderActions
              onToggleFilters={() => setShowFilters((v) => !v)}
              filtersOpen={showFilters}
              activeFilters={[searchTerm !== '', filterSource !== 'tous', filterStatut !== 'tous'].filter(Boolean).length}
            />

            <button className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors" aria-label={t('prospects.downloadAria')}>
              <Download className="w-4 h-4" />
              <span className="text-sm font-semibold">{t('common.export')}</span>
            </button>

            <button
              onClick={() => setShowProspectModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-semibold">{t('prospects.newProspectBtn')}</span>
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
                  ? 'bg-white text-[var(--color-primary)] shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[#404040]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* KPIs Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">{t('prospects.kpiActive')}</p>
              <p className="text-lg font-bold text-[var(--color-primary)]">{mockProspects.length}</p>
              <p className="text-xs text-[var(--color-primary)]">{t('prospects.kpiActiveDelta')}</p>
            </div>
            <div className="w-10 h-10 bg-[var(--color-primary)]/10 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">{t('prospects.kpiConversionRate')}</p>
              <p className="text-lg font-bold text-[var(--color-primary)]">{analytics.conversionRate}%</p>
              <p className="text-xs text-green-600">{t('prospects.kpiConversionDelta')}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">{t('prospects.kpiPipelineValue')}</p>
              <p className="text-lg font-bold text-[var(--color-primary)]">{formatCurrency(22500000)}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">{t('prospects.kpiPipelineOpportunities')}</p>
            </div>
            <div className="w-10 h-10 bg-[var(--color-text-secondary)]/10 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[var(--color-text-secondary)]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">{t('prospects.kpiSalesCycle')}</p>
              <p className="text-lg font-bold text-[var(--color-primary)]">{t('prospects.daysValue', { count: String(analytics.tempsConversionMoyen) })}</p>
              <p className="text-xs text-orange-600">{t('prospects.kpiSalesCycleDelta')}</p>
            </div>
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Tab */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          {/* Entonnoir de Vente */}
          <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('prospects.salesFunnel')}</h3>
            <div className="grid grid-cols-5 gap-4">
              {analytics.repartitionParStade.map((stade, index) => (
                <div key={stade.stade} className="text-center">
                  <div className={`w-full h-32 rounded-lg flex flex-col justify-end p-4 text-white mb-2`}
                       style={{
                         backgroundColor: COLORS[index],
                         height: `${Math.max(80, (stade.nombre / 25) * 120)}px`
                       }}>
                    <div className="text-lg font-bold">{stade.nombre}</div>
                    <div className="text-sm opacity-90">{formatCurrency(stade.valeur)}</div>
                  </div>
                  <p className="text-sm font-medium text-[#404040]">{stade.stade}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Évolution Pipeline */}
          <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('prospects.pipelineEvolution')}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.evolutionPipeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mois" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="nouveaux" stackId="1" stroke="#235A6E" fill="#235A6E" name={t('prospects.chartNew')} />
                <Area type="monotone" dataKey="convertis" stackId="1" stroke="#15803D" fill="#15803D" name={t('prospects.chartConverted')} />
                <Area type="monotone" dataKey="perdus" stackId="1" stroke="#C0322B" fill="#C0322B" name={t('prospects.chartLost')} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Prospects List Tab */}
      {activeTab === 'prospects' && (
        <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-[var(--color-text-secondary)]">{t('prospects.colProspect')}</th>
                  <th className="text-left p-4 text-sm font-medium text-[var(--color-text-secondary)]">{t('prospects.colContact')}</th>
                  <th className="text-left p-4 text-sm font-medium text-[var(--color-text-secondary)]">{t('prospects.colSource')}</th>
                  <th className="text-left p-4 text-sm font-medium text-[var(--color-text-secondary)]">{t('prospects.colStatus')}</th>
                  <th className="text-left p-4 text-sm font-medium text-[var(--color-text-secondary)]">{t('prospects.colPotentialValue')}</th>
                  <th className="text-left p-4 text-sm font-medium text-[var(--color-text-secondary)]">{t('prospects.colProbability')}</th>
                  <th className="text-left p-4 text-sm font-medium text-[var(--color-text-secondary)]">{t('prospects.colFollowUp')}</th>
                  <th className="text-left p-4 text-sm font-medium text-[var(--color-text-secondary)]">{t('prospects.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredProspects.map((prospect) => {
                  const SourceIcon = getSourceIcon(prospect.source);
                  return (
                    <tr key={prospect.id} className="border-b border-[var(--color-border)] hover:bg-gray-50">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-[var(--color-primary)]">{prospect.nom}</p>
                          <p className="text-sm text-[var(--color-text-secondary)]">{prospect.secteurActivite}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-[var(--color-primary)]">{prospect.contact.prenom} {prospect.contact.nom}</p>
                          <p className="text-sm text-[var(--color-text-secondary)]">{prospect.contact.fonction}</p>
                          <p className="text-sm text-[var(--color-text-secondary)]">{prospect.contact.email}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <SourceIcon className="w-4 h-4 text-[var(--color-primary)]" />
                          <span className="text-sm text-[var(--color-text-secondary)]">{prospect.source}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatutBadge(prospect.statut)}`}>
                          {prospect.statut}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-[var(--color-primary)]">{formatCurrency(prospect.valeurPotentielle)}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-[var(--color-primary)] h-2 rounded-full"
                              style={{ width: `${prospect.probabiliteConversion}%` }}
                            />
                          </div>
                          <span className="text-sm text-[var(--color-text-secondary)]">{prospect.probabiliteConversion}%</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-[var(--color-text-secondary)]">{new Date(prospect.prochaineSuivi).toLocaleDateString('fr-FR')}</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">{prospect.responsableCommercial}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedProspect(prospect);
                              setShowInteractionModal(true);
                            }}
                            className="p-1 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded"
                          >
                            <Phone className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setSelectedProspect(prospect)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-text-secondary)]/10 rounded">
                            <Edit className="w-4 h-4" />
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
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sources Performance */}
          <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('prospects.sourcePerformance')}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.sourcesMeilleurTaux}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="source" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar radius={[6,6,0,0]} dataKey="taux" fill="url(#gradPetrol)" name={t('prospects.chartConversionRate')} />
                <Bar radius={[6,6,0,0]} dataKey="nombre" fill="url(#gradPetrolLight)" name={t('prospects.chartProspectCount')} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Répartition par Stade */}
          <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('prospects.stageBreakdown')}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  dataKey="nombre"
                  data={analytics.repartitionParStade}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#235A6E"
                  label={({ stade, nombre }: any) => `${stade}: ${nombre}`}
                >
                  {analytics.repartitionParStade.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Autres onglets avec contenu similaire... */}
      {activeTab === 'opportunites' && (
        <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-2">{t('prospects.opportunitiesTitle')}</h3>
            <p className="text-[var(--color-text-secondary)] mb-4">{t('prospects.opportunitiesDesc')}</p>
            <button className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors">
              {t('prospects.opportunitiesBtn')}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'actions' && (
        <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-2">{t('prospects.marketingTitle')}</h3>
            <p className="text-[var(--color-text-secondary)] mb-4">{t('prospects.marketingDesc')}</p>
            <button className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors">
              {t('prospects.marketingBtn')}
            </button>
          </div>
        </div>
      )}

      {/* Prospect Modal */}
      {showProspectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{t('prospects.modalNewProspect')}</h3>
                    <p className="text-sm text-gray-700">{t('prospects.modalNewProspectSub')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowProspectModal(false)}
                  className="text-gray-700 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <Lightbulb className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-900">{t('prospects.modalNewProspect')}</p>
                      <p className="text-sm text-green-700 mt-1">
                        {t('prospects.modalTipText')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('prospects.fieldCode')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono"
                      placeholder="PRO001"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('prospects.fieldName')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder={t('prospects.phName')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('prospects.fieldSource')} <span className="text-red-500">*</span>
                    </label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent">
                      <option value="">{t('prospects.selectPlaceholder')}</option>
                      <option value="SITE_WEB">{t('prospects.optWebsite')}</option>
                      <option value="REFERRAL">{t('prospects.optReferral')}</option>
                      <option value="SALON">{t('prospects.optTradeShow')}</option>
                      <option value="COLD_CALLING">{t('prospects.optColdCall')}</option>
                      <option value="RESEAUX_SOCIAUX">{t('prospects.optSocial')}</option>
                      <option value="PUBLICITE">{t('prospects.optAds')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('prospects.fieldSector')}
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder={t('prospects.phSector')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('prospects.fieldPotentialValue')}
                    </label>
                    <input
                      type="number"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="50000"
                      step="1000"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {t('prospects.sectionMainContact')}
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('prospects.fieldLastName')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder={t('prospects.phLastName')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('prospects.fieldFirstName')}
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder={t('prospects.phFirstName')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('prospects.fieldRole')}
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder={t('prospects.phRole')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('prospects.fieldPhone')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="+242 06 123 45 67"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('prospects.fieldEmail')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="contact@prospect.cg"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {t('prospects.sectionAddress')}
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('prospects.fieldStreet')}
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder={t('prospects.phStreet')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('prospects.fieldCity')}
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Brazzaville"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('prospects.fieldCountry')}
                      </label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent">
                        <option value="Congo">Congo</option>
                        <option value="France">France</option>
                        <option value="Autre">{t('prospects.optOther')}</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('prospects.fieldConversionProbability')}
                    </label>
                    <input
                      type="number"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="50"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('prospects.fieldSalesRep')}
                    </label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent">
                      <option value="">{t('prospects.selectPlaceholder')}</option>
                      <option value="">—</option>
                      <option value="">—</option>
                      <option value="">—</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('prospects.fieldNotes')}
                  </label>
                  <textarea
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder={t('prospects.phNotes')}
                  />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-lg border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowProspectModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {t('prospects.cancel')}
              </button>
              <button onClick={handleCreateProspect} className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {t('prospects.createProspect')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interaction Modal */}
      {showInteractionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{t('prospects.modalNewInteraction')}</h3>
                    <p className="text-sm text-gray-700">{t('prospects.modalNewInteractionSub')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowInteractionModal(false)}
                  className="text-gray-700 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('prospects.fieldProspect')} <span className="text-red-500">*</span>
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">{t('prospects.selectProspect')}</option>
                    <option value="1">Prospect PRO001</option>
                    <option value="2">Prospect PRO002</option>
                    <option value="3">Prospect PRO003</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('prospects.fieldInteractionType')} <span className="text-red-500">*</span>
                    </label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="">{t('prospects.selectPlaceholder')}</option>
                      <option value="APPEL">{t('prospects.optCall')}</option>
                      <option value="EMAIL">{t('prospects.optEmail')}</option>
                      <option value="REUNION">{t('prospects.optMeeting')}</option>
                      <option value="VISITE">{t('prospects.optVisit')}</option>
                      <option value="DEMONSTRATION">{t('prospects.optDemo')}</option>
                      <option value="AUTRE">{t('prospects.optOther')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('prospects.fieldDate')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('prospects.fieldSubject')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('prospects.phSubject')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('prospects.fieldReport')} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={5}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('prospects.phReport')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('prospects.fieldInterestLevel')}
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">{t('prospects.optEvaluate')}</option>
                    <option value="FAIBLE">{t('prospects.optLow')}</option>
                    <option value="MOYEN">{t('prospects.optMedium')}</option>
                    <option value="ELEVE">{t('prospects.optHigh')}</option>
                    <option value="TRES_ELEVE">{t('prospects.optVeryHigh')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('prospects.fieldNextAction')}
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('prospects.phNextAction')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('prospects.fieldFollowUpDate')}
                    </label>
                    <input
                      type="date"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('prospects.fieldOwner')}
                    </label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="">{t('prospects.selectPlaceholder')}</option>
                      <option value="">—</option>
                      <option value="">—</option>
                      <option value="">—</option>
                    </select>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-900">{t('prospects.warnRegularFollowUp')}</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        {t('prospects.warnRegularFollowUpText')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-lg border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowInteractionModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {t('prospects.cancel')}
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                {t('prospects.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProspectsModule;