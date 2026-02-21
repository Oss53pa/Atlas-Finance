import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import {
  Target, Plus, Search, Filter, Download, Eye, Edit, Trash2,
  ArrowLeft, Phone, Mail, MapPin, Calendar, DollarSign,
  TrendingUp, Activity, AlertTriangle, CheckCircle, Star,
  User, Building, Clock, MessageSquare, BarChart3, PieChart,
  Users, FileText, Send, Archive, Award, Zap, Lightbulb
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart as RechartsPieChart, Cell, LineChart, Line, ResponsiveContainer,
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
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [showProspectModal, setShowProspectModal] = useState(false);
  const [showInteractionModal, setShowInteractionModal] = useState(false);

  // Mock Prospects Data
  const mockProspects: Prospect[] = [
    {
      id: '1',
      code: 'PROS001',
      nom: 'CEMAC LOGISTICS',
      type: 'PROSPECT',
      statut: 'NEGOCIATION',
      source: 'REFERRAL',
      secteurActivite: 'Transport & Logistique',
      scoreProspection: 85,
      probabiliteConversion: 75,
      valeurPotentielle: 450000,
      dateCreation: '2024-08-15',
      dateContact: '2024-08-20',
      prochaineSuivi: '2024-09-25',
      responsableCommercial: 'Marie Kouam',
      contact: {
        nom: 'OBIANG',
        prenom: 'Michel',
        fonction: 'Directeur Opérations',
        telephone: '+241 06 12 34 56',
        email: 'm.obiang@cemaclogistics.ga'
      },
      adresse: {
        rue: '789 Avenue Bouët',
        ville: 'Libreville',
        pays: 'Gabon',
        region: 'Estuaire'
      },
      interactions: [
        {
          id: 'int1',
          type: 'REUNION',
          date: '2024-09-15',
          description: 'Présentation de notre solution ERP',
          resultat: 'POSITIF',
          prochaineSuivi: '2024-09-25',
          responsable: 'Marie Kouam'
        }
      ],
      opportunites: [
        {
          id: 'opp1',
          nom: 'Implémentation ERP Complet',
          valeur: 450000,
          probabilite: 75,
          dateCreation: '2024-08-20',
          dateFermeturePrevue: '2024-11-30',
          statut: 'OUVERTE',
          phase: 'Négociation'
        }
      ],
      notes: 'Prospect très intéressé par la solution complète. Budget confirmé.',
      stadeEntonnoir: 'NEGOCIATION',
      besoinsIdentifies: ['ERP Comptabilité', 'Gestion Stock', 'CRM'],
      concurrents: ['SAGE', 'SAP'],
      budgetEstime: 450000,
      tempsVentePrevue: 90
    },
    {
      id: '2',
      code: 'PROS002',
      nom: 'BANQUE CENTRALE CEMAC',
      type: 'PROSPECT',
      statut: 'INTERESSE',
      source: 'SALON',
      secteurActivite: 'Services Financiers',
      scoreProspection: 92,
      probabiliteConversion: 60,
      valeurPotentielle: 850000,
      dateCreation: '2024-09-01',
      dateContact: '2024-09-05',
      prochaineSuivi: '2024-09-28',
      responsableCommercial: 'Paul Mbeki',
      contact: {
        nom: 'NGOZI',
        prenom: 'Fatima',
        fonction: 'Directrice Informatique',
        telephone: '+237 6 22 33 44 55',
        email: 'f.ngozi@beac.int'
      },
      adresse: {
        rue: 'Avenue Monseigneur Vogt',
        ville: 'Yaoundé',
        pays: 'Cameroun',
        region: 'Centre'
      },
      interactions: [
        {
          id: 'int2',
          type: 'DEMO',
          date: '2024-09-10',
          description: 'Démonstration module Treasury Management',
          resultat: 'POSITIF',
          prochaineSuivi: '2024-09-28',
          responsable: 'Paul Mbeki'
        }
      ],
      opportunites: [
        {
          id: 'opp2',
          nom: 'Solution Treasury Management',
          valeur: 850000,
          probabilite: 60,
          dateCreation: '2024-09-05',
          dateFermeturePrevue: '2024-12-31',
          statut: 'OUVERTE',
          phase: 'Proposition'
        }
      ],
      notes: 'Appel d\'offres prévu Q4 2024. Très haute valeur stratégique.',
      stadeEntonnoir: 'PROPOSITION',
      besoinsIdentifies: ['Treasury Management', 'Reporting Réglementaire', 'Analytics'],
      concurrents: ['Oracle', 'Misys'],
      budgetEstime: 850000,
      tempsVentePrevue: 120
    }
  ];

  // Mock Analytics
  const analytics: ProspectAnalytics = {
    conversionRate: 23.5,
    tempsConversionMoyen: 85,
    valeurMoyenneProspect: 385000,
    sourcesMeilleurTaux: [
      { source: 'REFERRAL', taux: 35, nombre: 12 },
      { source: 'SALON', taux: 28, nombre: 8 },
      { source: 'SITE_WEB', taux: 15, nombre: 25 },
      { source: 'COLD_CALLING', taux: 8, nombre: 45 }
    ],
    evolutionPipeline: [
      { mois: 'Juin', nouveaux: 15, convertis: 3, perdus: 5 },
      { mois: 'Juillet', nouveaux: 18, convertis: 4, perdus: 7 },
      { mois: 'Août', nouveaux: 22, convertis: 5, perdus: 6 },
      { mois: 'Sept', nouveaux: 19, convertis: 6, perdus: 4 }
    ],
    repartitionParStade: [
      { stade: 'DECOUVERTE', nombre: 25, valeur: 3200000 },
      { stade: 'QUALIFICATION', nombre: 18, valeur: 4500000 },
      { stade: 'PROPOSITION', nombre: 12, valeur: 6800000 },
      { stade: 'NEGOCIATION', nombre: 8, valeur: 5200000 },
      { stade: 'CLOSURE', nombre: 5, valeur: 2800000 }
    ]
  };

  const tabs = [
    { id: 'pipeline', label: 'Pipeline Commercial', icon: TrendingUp },
    { id: 'prospects', label: 'Liste Prospects', icon: Target },
    { id: 'opportunites', label: 'Opportunités', icon: DollarSign },
    { id: 'analytics', label: 'Analytics & KPIs', icon: BarChart3 },
    { id: 'actions', label: 'Actions Marketing', icon: MessageSquare }
  ];

  const sources = [
    { value: 'tous', label: 'Toutes sources' },
    { value: 'SITE_WEB', label: 'Site Web' },
    { value: 'REFERRAL', label: 'Référencement' },
    { value: 'SALON', label: 'Salon/Événement' },
    { value: 'COLD_CALLING', label: 'Prospection directe' },
    { value: 'RESEAUX_SOCIAUX', label: 'Réseaux sociaux' },
    { value: 'PUBLICITE', label: 'Publicité' }
  ];

  const statuts = [
    { value: 'tous', label: 'Tous statuts' },
    { value: 'NOUVEAU', label: t('actions.new') },
    { value: 'QUALIFIE', label: 'Qualifié' },
    { value: 'INTERESSE', label: 'Intéressé' },
    { value: 'NEGOCIATION', label: 'Négociation' },
    { value: 'PERDU', label: 'Perdu' },
    { value: 'GAGNE', label: 'Gagné' }
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
      'QUALIFIE': 'bg-[#6A8A82]/10 text-[#6A8A82]',
      'INTERESSE': 'bg-green-100 text-green-800',
      'NEGOCIATION': 'bg-[#B87333]/10 text-[#B87333]',
      'PERDU': 'bg-red-100 text-red-800',
      'GAGNE': 'bg-emerald-100 text-emerald-800'
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

  const COLORS = ['#6A8A82', '#B87333', '#5A6B65', '#9B6B2A', '#7A9B94'];

  return (
    <div className="p-6 bg-[#ECECEC] min-h-screen ">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/tiers')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#444444]" />
              <span className="text-sm font-semibold text-[#444444]">Retour</span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#6A8A82] to-[#B87333] flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#191919]">Gestion des Prospects</h1>
                <p className="text-sm text-[#666666]">Pipeline commercial et suivi des opportunités</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-gray-700" />
              <input
                type="text"
                placeholder="Rechercher un prospect..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-48"
              />
            </div>

            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
            >
              {sources.map(source => (
                <option key={source.value} value={source.value}>{source.label}</option>
              ))}
            </select>

            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
            >
              {statuts.map(statut => (
                <option key={statut.value} value={statut.value}>{statut.label}</option>
              ))}
            </select>

            <button className="flex items-center space-x-2 px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#6A8A82]/90 transition-colors" aria-label="Télécharger">
              <Download className="w-4 h-4" />
              <span className="text-sm font-semibold">{t('common.export')}</span>
            </button>

            <button
              onClick={() => setShowProspectModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-semibold">Nouveau Prospect</span>
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
                  ? 'bg-white text-[#6A8A82] shadow-sm'
                  : 'text-[#666666] hover:text-[#444444]'
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
        <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#666666]">Prospects Actifs</p>
              <p className="text-lg font-bold text-[#191919]">{mockProspects.length}</p>
              <p className="text-xs text-[#6A8A82]">+12 ce mois</p>
            </div>
            <div className="w-10 h-10 bg-[#6A8A82]/10 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-[#6A8A82]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#666666]">Taux Conversion</p>
              <p className="text-lg font-bold text-[#191919]">{analytics.conversionRate}%</p>
              <p className="text-xs text-green-600">+2.3% vs mois dernier</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#666666]">Pipeline Valeur</p>
              <p className="text-lg font-bold text-[#191919]">{formatCurrency(22500000)}</p>
              <p className="text-xs text-[#B87333]">68 opportunités</p>
            </div>
            <div className="w-10 h-10 bg-[#B87333]/10 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[#B87333]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#666666]">Cycle de Vente</p>
              <p className="text-lg font-bold text-[#191919]">{analytics.tempsConversionMoyen}j</p>
              <p className="text-xs text-orange-600">-5j vs moyenne</p>
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
          <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
            <h3 className="text-lg font-semibold text-[#191919] mb-4">Entonnoir de Vente</h3>
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
                  <p className="text-sm font-medium text-[#444444]">{stade.stade}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Évolution Pipeline */}
          <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
            <h3 className="text-lg font-semibold text-[#191919] mb-4">Évolution du Pipeline</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.evolutionPipeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mois" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="nouveaux" stackId="1" stroke="#6A8A82" fill="#6A8A82" name="Nouveaux" />
                <Area type="monotone" dataKey="convertis" stackId="1" stroke="#10B981" fill="#10B981" name="Convertis" />
                <Area type="monotone" dataKey="perdus" stackId="1" stroke="#EF4444" fill="#EF4444" name="Perdus" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Prospects List Tab */}
      {activeTab === 'prospects' && (
        <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-[#E8E8E8]">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-[#666666]">Prospect</th>
                  <th className="text-left p-4 text-sm font-medium text-[#666666]">Contact</th>
                  <th className="text-left p-4 text-sm font-medium text-[#666666]">Source</th>
                  <th className="text-left p-4 text-sm font-medium text-[#666666]">Statut</th>
                  <th className="text-left p-4 text-sm font-medium text-[#666666]">Valeur Pot.</th>
                  <th className="text-left p-4 text-sm font-medium text-[#666666]">Probabilité</th>
                  <th className="text-left p-4 text-sm font-medium text-[#666666]">Suivi</th>
                  <th className="text-left p-4 text-sm font-medium text-[#666666]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProspects.map((prospect) => {
                  const SourceIcon = getSourceIcon(prospect.source);
                  return (
                    <tr key={prospect.id} className="border-b border-[#E8E8E8] hover:bg-gray-50">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-[#191919]">{prospect.nom}</p>
                          <p className="text-sm text-[#666666]">{prospect.secteurActivite}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-[#191919]">{prospect.contact.prenom} {prospect.contact.nom}</p>
                          <p className="text-sm text-[#666666]">{prospect.contact.fonction}</p>
                          <p className="text-sm text-[#666666]">{prospect.contact.email}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <SourceIcon className="w-4 h-4 text-[#6A8A82]" />
                          <span className="text-sm text-[#666666]">{prospect.source}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatutBadge(prospect.statut)}`}>
                          {prospect.statut}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-[#191919]">{formatCurrency(prospect.valeurPotentielle)}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-[#6A8A82] h-2 rounded-full"
                              style={{ width: `${prospect.probabiliteConversion}%` }}
                            />
                          </div>
                          <span className="text-sm text-[#666666]">{prospect.probabiliteConversion}%</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-[#666666]">{new Date(prospect.prochaineSuivi).toLocaleDateString('fr-FR')}</p>
                        <p className="text-sm text-[#666666]">{prospect.responsableCommercial}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedProspect(prospect);
                              setShowInteractionModal(true);
                            }}
                            className="p-1 text-[#6A8A82] hover:bg-[#6A8A82]/10 rounded"
                          >
                            <Phone className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setSelectedProspect(prospect)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-[#B87333] hover:bg-[#B87333]/10 rounded">
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
          <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
            <h3 className="text-lg font-semibold text-[#191919] mb-4">Performance par Source</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.sourcesMeilleurTaux}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="source" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="taux" fill="#6A8A82" name="Taux de conversion %" />
                <Bar dataKey="nombre" fill="#B87333" name="Nombre de prospects" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Répartition par Stade */}
          <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
            <h3 className="text-lg font-semibold text-[#191919] mb-4">Répartition par Stade</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  dataKey="nombre"
                  data={analytics.repartitionParStade}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  label={({ stade, nombre }) => `${stade}: ${nombre}`}
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
        <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#191919] mb-2">Gestion des Opportunités</h3>
            <p className="text-[#666666] mb-4">Suivi détaillé de toutes les opportunités commerciales</p>
            <button className="px-6 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#6A8A82]/90 transition-colors">
              Voir les opportunités
            </button>
          </div>
        </div>
      )}

      {activeTab === 'actions' && (
        <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#191919] mb-2">Actions Marketing</h3>
            <p className="text-[#666666] mb-4">Campagnes marketing et actions de prospection</p>
            <button className="px-6 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#6A8A82]/90 transition-colors">
              Créer une campagne
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
                    <h3 className="text-lg font-semibold text-gray-900">Nouveau prospect</h3>
                    <p className="text-sm text-gray-700">Créer une fiche prospect</p>
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
                      <p className="text-sm font-medium text-green-900">Nouveau prospect</p>
                      <p className="text-sm text-green-700 mt-1">
                        Enregistrez un prospect pour suivre son évolution vers la conversion
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Code prospect <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono"
                      placeholder="PRO001"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom / Raison sociale <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Nom du prospect"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Source <span className="text-red-500">*</span>
                    </label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent">
                      <option value="">Sélectionner</option>
                      <option value="SITE_WEB">Site web</option>
                      <option value="REFERRAL">Recommandation</option>
                      <option value="SALON">Salon</option>
                      <option value="COLD_CALLING">Appel à froid</option>
                      <option value="RESEAUX_SOCIAUX">Réseaux sociaux</option>
                      <option value="PUBLICITE">Publicité</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Secteur d'activité
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Commerce, IT..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valeur potentielle (XAF)
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
                    Contact principal
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Nom"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prénom
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Prénom"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fonction
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Directeur"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Téléphone <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="+242 06 123 45 67"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
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
                    Adresse
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rue
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Adresse complète"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ville
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Brazzaville"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pays
                      </label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent">
                        <option value="Congo">Congo</option>
                        <option value="France">France</option>
                        <option value="Autre">Autre</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Probabilité de conversion (%)
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
                      Responsable commercial
                    </label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent">
                      <option value="">Sélectionner</option>
                      <option value="Marie Kouam">Marie Kouam</option>
                      <option value="Jean Dupont">Jean Dupont</option>
                      <option value="Sophie Martin">Sophie Martin</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Informations complémentaires..."
                  />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-lg border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowProspectModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Créer le prospect
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
                    <h3 className="text-lg font-semibold text-gray-900">Nouvelle interaction</h3>
                    <p className="text-sm text-gray-700">Enregistrer une interaction avec le prospect</p>
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
                    Prospect <span className="text-red-500">*</span>
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Sélectionner un prospect</option>
                    <option value="1">StartUp Innovante - PRO001</option>
                    <option value="2">Tech Solutions - PRO002</option>
                    <option value="3">Digital Services - PRO003</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type d'interaction <span className="text-red-500">*</span>
                    </label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="">Sélectionner</option>
                      <option value="APPEL">Appel téléphonique</option>
                      <option value="EMAIL">Email</option>
                      <option value="REUNION">Réunion</option>
                      <option value="VISITE">Visite</option>
                      <option value="DEMONSTRATION">Démonstration</option>
                      <option value="AUTRE">Autre</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Objet <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Présentation offre, Suivi devis..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Compte-rendu <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={5}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Détails de l'échange, besoins identifiés, objections..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Niveau d'intérêt
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Évaluer</option>
                    <option value="FAIBLE">⭐ Faible</option>
                    <option value="MOYEN">⭐⭐ Moyen</option>
                    <option value="ELEVE">⭐⭐⭐ Élevé</option>
                    <option value="TRES_ELEVE">⭐⭐⭐⭐ Très élevé</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prochaine action
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Action de suivi prévue"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date de suivi
                    </label>
                    <input
                      type="date"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Responsable
                    </label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="">Sélectionner</option>
                      <option value="Marie Kouam">Marie Kouam</option>
                      <option value="Jean Dupont">Jean Dupont</option>
                      <option value="Sophie Martin">Sophie Martin</option>
                    </select>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-900">Suivi régulier</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Maintenez un contact régulier pour maximiser les chances de conversion
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
                Annuler
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProspectsModule;