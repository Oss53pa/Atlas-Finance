import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Plus, Search, Filter, Download, Eye, Edit, Trash2,
  ArrowLeft, Phone, Mail, MapPin, Calendar, DollarSign,
  Target, TrendingUp, Activity, AlertTriangle, CheckCircle,
  Star, Heart, Award, Clock, CreditCard, FileText,
  BarChart3, PieChart, MessageSquare, User, Building,
  Handshake, Globe, Share2, Zap, Shield, Package
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart as RechartsPieChart, Cell, LineChart, Line, ResponsiveContainer,
  AreaChart, Area, RadialBarChart, RadialBar
} from 'recharts';

interface Partenaire {
  id: string;
  code: string;
  nom: string;
  type: 'DISTRIBUTEUR' | 'REVENDEUR' | 'INTEGRATEUR' | 'CONSULTANT' | 'TECHNOLOGIQUE' | 'STRATEGIQUE';
  statut: 'ACTIF' | 'INACTIF' | 'PROSPECT' | 'SUSPENDU';
  niveau: 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE';
  secteurActivite: string;
  zoneCouverture: string[];
  dateDebut: string;
  dateFinContrat?: string;
  chiffreAffairesAnnuel: number;
  commissionRate: number;
  scorePerformance: number;
  certifications: string[];
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
  indicateursPerformance: {
    ventesGenerees: number;
    clientsApportes: number;
    satisfactionClients: number;
    respectObjectifs: number;
    qualiteLivraisons: number;
  };
  collaboration: {
    projetsCommuns: number;
    formationsRealisees: number;
    evenementsParticipes: number;
    supportTechnique: 'BASIQUE' | 'AVANCE' | 'PREMIUM';
  };
  contrat: {
    typeContrat: 'EXCLUSIF' | 'NON_EXCLUSIF' | 'ZONE_EXCLUSIVE';
    conditionsCommerciales: string;
    objectifsAnnuels: number;
    bonusPerformance: number;
  };
  historique: PartenaireHistorique[];
  notes: string;
  documents: string[];
}

interface PartenaireHistorique {
  id: string;
  date: string;
  type: 'VENTE' | 'FORMATION' | 'CERTIFICATION' | 'EVENEMENT' | 'SUPPORT';
  description: string;
  valeur?: number;
  responsable: string;
}

interface PartenaireAnalytics {
  performanceGlobale: number;
  croissanceChiffre: number;
  satisfactionMoyenne: number;
  tauxRenouvellement: number;
  repartitionParType: Array<{type: string; nombre: number; ca: number}>;
  evolutionPerformance: Array<{mois: string; ventes: number; satisfaction: number}>;
  topPartenaires: Array<{nom: string; ca: number; score: number; niveau: string}>;
  zonesCouverte: Array<{zone: string; partenaires: number; ca: number}>;
}

const PartenairesModule: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('reseau');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('tous');
  const [filterNiveau, setFilterNiveau] = useState('tous');
  const [selectedPartenaire, setSelectedPartenaire] = useState<Partenaire | null>(null);
  const [showPartenaireModal, setShowPartenaireModal] = useState(false);

  // Mock Partenaires Data
  const mockPartenaires: Partenaire[] = [
    {
      id: '1',
      code: 'PART001',
      nom: 'CEMAC TECH SOLUTIONS',
      type: 'INTEGRATEUR',
      statut: 'ACTIF',
      niveau: 'PLATINUM',
      secteurActivite: 'Intégration Systèmes',
      zoneCouverture: ['Cameroun', 'Gabon', 'Guinée Équatoriale'],
      dateDebut: '2022-01-15',
      dateFinContrat: '2025-01-15',
      chiffreAffairesAnnuel: 2450000,
      commissionRate: 15,
      scorePerformance: 94,
      certifications: ['WiseBook Certified Partner', 'Advanced Implementation', 'Technical Support'],
      contact: {
        nom: 'MVONDO',
        prenom: 'Patrick',
        fonction: 'Directeur Partenariats',
        telephone: '+237 6 99 88 77 66',
        email: 'p.mvondo@cemactech.cm'
      },
      adresse: {
        rue: 'Immeuble CEMAC, Avenue Kennedy',
        ville: 'Yaoundé',
        pays: 'Cameroun',
        region: 'Centre'
      },
      indicateursPerformance: {
        ventesGenerees: 2450000,
        clientsApportes: 45,
        satisfactionClients: 4.7,
        respectObjectifs: 112,
        qualiteLivraisons: 96
      },
      collaboration: {
        projetsCommuns: 23,
        formationsRealisees: 8,
        evenementsParticipes: 12,
        supportTechnique: 'PREMIUM'
      },
      contrat: {
        typeContrat: 'ZONE_EXCLUSIVE',
        conditionsCommerciales: '15% commission + bonus performance',
        objectifsAnnuels: 2200000,
        bonusPerformance: 50000
      },
      historique: [
        {
          id: 'h1',
          date: '2024-09-15',
          type: 'VENTE',
          description: 'Signature contrat BANQUE POPULAIRE - 450k FCFA',
          valeur: 450000,
          responsable: 'Patrick MVONDO'
        }
      ],
      notes: 'Partenaire stratégique clé pour la zone CEMAC. Excellent performer.',
      documents: ['Contrat_CEMAC_TECH.pdf', 'Certifications.pdf']
    },
    {
      id: '2',
      code: 'PART002',
      nom: 'AFRICA BUSINESS CONSULTING',
      type: 'CONSULTANT',
      statut: 'ACTIF',
      niveau: 'GOLD',
      secteurActivite: 'Conseil en Management',
      zoneCouverture: ['Congo', 'RDC', 'Tchad'],
      dateDebut: '2023-03-20',
      dateFinContrat: '2026-03-20',
      chiffreAffairesAnnuel: 1850000,
      commissionRate: 12,
      scorePerformance: 88,
      certifications: ['WiseBook Certified Consultant', 'Business Process'],
      contact: {
        nom: 'KONGO',
        prenom: 'Marie',
        fonction: 'Directrice Générale',
        telephone: '+242 06 77 88 99 00',
        email: 'm.kongo@africabusiness.cg'
      },
      adresse: {
        rue: 'Centre-ville, Rue Patrice Lumumba',
        ville: 'Brazzaville',
        pays: 'Congo',
        region: 'Pool'
      },
      indicateursPerformance: {
        ventesGenerees: 1850000,
        clientsApportes: 32,
        satisfactionClients: 4.4,
        respectObjectifs: 98,
        qualiteLivraisons: 92
      },
      collaboration: {
        projetsCommuns: 18,
        formationsRealisees: 5,
        evenementsParticipes: 8,
        supportTechnique: 'AVANCE'
      },
      contrat: {
        typeContrat: 'NON_EXCLUSIF',
        conditionsCommerciales: '12% commission + frais formation',
        objectifsAnnuels: 1900000,
        bonusPerformance: 30000
      },
      historique: [
        {
          id: 'h2',
          date: '2024-09-10',
          type: 'FORMATION',
          description: 'Formation WiseBook Advanced pour 8 consultants',
          responsable: 'Marie KONGO'
        }
      ],
      notes: 'Expertise forte en change management. Bon potentiel de croissance.',
      documents: ['Contrat_ABC.pdf', 'Plan_Formation.pdf']
    },
    {
      id: '3',
      code: 'PART003',
      nom: 'GABON DIGITAL SERVICES',
      type: 'DISTRIBUTEUR',
      statut: 'ACTIF',
      niveau: 'SILVER',
      secteurActivite: 'Distribution Logiciels',
      zoneCouverture: ['Gabon'],
      dateDebut: '2023-08-01',
      chiffreAffairesAnnuel: 950000,
      commissionRate: 10,
      scorePerformance: 75,
      certifications: ['WiseBook Reseller'],
      contact: {
        nom: 'ONDO',
        prenom: 'Jean-Claude',
        fonction: 'Directeur Commercial',
        telephone: '+241 07 11 22 33 44',
        email: 'jc.ondo@gabondigital.ga'
      },
      adresse: {
        rue: 'Quartier Gros-Bouquet',
        ville: 'Libreville',
        pays: 'Gabon',
        region: 'Estuaire'
      },
      indicateursPerformance: {
        ventesGenerees: 950000,
        clientsApportes: 18,
        satisfactionClients: 4.1,
        respectObjectifs: 85,
        qualiteLivraisons: 88
      },
      collaboration: {
        projetsCommuns: 8,
        formationsRealisees: 2,
        evenementsParticipes: 4,
        supportTechnique: 'BASIQUE'
      },
      contrat: {
        typeContrat: 'EXCLUSIF',
        conditionsCommerciales: '10% commission',
        objectifsAnnuels: 1200000,
        bonusPerformance: 15000
      },
      historique: [],
      notes: 'Nouveau partenaire prometteur. À accompagner pour atteindre objectifs.',
      documents: ['Contrat_GDS.pdf']
    }
  ];

  // Mock Analytics
  const analytics: PartenaireAnalytics = {
    performanceGlobale: 89,
    croissanceChiffre: 18.5,
    satisfactionMoyenne: 4.4,
    tauxRenouvellement: 94,
    repartitionParType: [
      { type: 'INTEGRATEUR', nombre: 8, ca: 4200000 },
      { type: 'CONSULTANT', nombre: 12, ca: 3800000 },
      { type: 'DISTRIBUTEUR', nombre: 6, ca: 2100000 },
      { type: 'REVENDEUR', nombre: 15, ca: 1900000 },
      { type: 'TECHNOLOGIQUE', nombre: 4, ca: 1500000 },
      { type: 'STRATEGIQUE', nombre: 2, ca: 1200000 }
    ],
    evolutionPerformance: [
      { mois: 'Jan', ventes: 1200000, satisfaction: 4.2 },
      { mois: 'Fév', ventes: 1350000, satisfaction: 4.3 },
      { mois: 'Mar', ventes: 1480000, satisfaction: 4.4 },
      { mois: 'Avr', ventes: 1520000, satisfaction: 4.4 },
      { mois: 'Mai', ventes: 1650000, satisfaction: 4.5 },
      { mois: 'Juin', ventes: 1780000, satisfaction: 4.6 }
    ],
    topPartenaires: [
      { nom: 'CEMAC TECH SOLUTIONS', ca: 2450000, score: 94, niveau: 'PLATINUM' },
      { nom: 'AFRICA BUSINESS CONSULTING', ca: 1850000, score: 88, niveau: 'GOLD' },
      { nom: 'CENTRAL AFRICA INTEGRATORS', ca: 1650000, score: 86, niveau: 'GOLD' },
      { nom: 'DOUALA TECH PARTNERS', ca: 1420000, score: 82, niveau: 'SILVER' }
    ],
    zonesCouverte: [
      { zone: 'Cameroun', partenaires: 12, ca: 6200000 },
      { zone: 'Congo', partenaires: 8, ca: 3800000 },
      { zone: 'Gabon', partenaires: 6, ca: 2900000 },
      { zone: 'Guinée Équatoriale', partenaires: 4, ca: 1800000 },
      { zone: 'Tchad', partenaires: 5, ca: 1500000 },
      { zone: 'RCA', partenaires: 3, ca: 800000 }
    ]
  };

  const tabs = [
    { id: 'reseau', label: 'Réseau Partenaires', icon: Handshake },
    { id: 'performance', label: 'Performance', icon: BarChart3 },
    { id: 'collaboration', label: 'Collaboration', icon: Share2 },
    { id: 'certification', label: 'Certifications', icon: Award },
    { id: 'analytics', label: 'Analytics', icon: PieChart }
  ];

  const types = [
    { value: 'tous', label: 'Tous types' },
    { value: 'DISTRIBUTEUR', label: 'Distributeur' },
    { value: 'REVENDEUR', label: 'Revendeur' },
    { value: 'INTEGRATEUR', label: 'Intégrateur' },
    { value: 'CONSULTANT', label: 'Consultant' },
    { value: 'TECHNOLOGIQUE', label: 'Technologique' },
    { value: 'STRATEGIQUE', label: 'Stratégique' }
  ];

  const niveaux = [
    { value: 'tous', label: 'Tous niveaux' },
    { value: 'PLATINUM', label: 'Platinum' },
    { value: 'GOLD', label: 'Gold' },
    { value: 'SILVER', label: 'Silver' },
    { value: 'BRONZE', label: 'Bronze' }
  ];

  const filteredPartenaires = mockPartenaires.filter(partenaire => {
    const matchesSearch = partenaire.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         partenaire.contact.nom.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'tous' || partenaire.type === filterType;
    const matchesNiveau = filterNiveau === 'tous' || partenaire.niveau === filterNiveau;
    return matchesSearch && matchesType && matchesNiveau;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getNiveauBadge = (niveau: string) => {
    const niveauConfig = {
      'PLATINUM': 'bg-purple-100 text-purple-800',
      'GOLD': 'bg-yellow-100 text-yellow-800',
      'SILVER': 'bg-gray-100 text-gray-800',
      'BRONZE': 'bg-orange-100 text-orange-800'
    };
    return niveauConfig[niveau as keyof typeof niveauConfig] || 'bg-gray-100 text-gray-800';
  };

  const getStatutBadge = (statut: string) => {
    const statutConfig = {
      'ACTIF': 'bg-green-100 text-green-800',
      'INACTIF': 'bg-gray-100 text-gray-800',
      'PROSPECT': 'bg-blue-100 text-blue-800',
      'SUSPENDU': 'bg-red-100 text-red-800'
    };
    return statutConfig[statut as keyof typeof statutConfig] || 'bg-gray-100 text-gray-800';
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      'DISTRIBUTEUR': Package,
      'REVENDEUR': Share2,
      'INTEGRATEUR': Zap,
      'CONSULTANT': User,
      'TECHNOLOGIQUE': Globe,
      'STRATEGIQUE': Shield
    };
    return icons[type as keyof typeof icons] || Building;
  };

  const COLORS = ['#6A8A82', '#B87333', '#5A6B65', '#9B6B2A', '#7A9B94', '#8B7D6B'];

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
              <span className="text-sm font-semibold text-[#444444]">Retour</span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#6A8A82] to-[#B87333] flex items-center justify-center">
                <Handshake className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#191919]">Gestion des Partenaires</h1>
                <p className="text-sm text-[#666666]">Écosystème et réseau de partenaires stratégiques</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un partenaire..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-48"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
            >
              {types.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>

            <select
              value={filterNiveau}
              onChange={(e) => setFilterNiveau(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
            >
              {niveaux.map(niveau => (
                <option key={niveau.value} value={niveau.value}>{niveau.label}</option>
              ))}
            </select>

            <button className="flex items-center space-x-2 px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#6A8A82]/90 transition-colors">
              <Download className="w-4 h-4" />
              <span className="text-sm font-semibold">Exporter</span>
            </button>

            <button
              onClick={() => setShowPartenaireModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-semibold">Nouveau Partenaire</span>
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
              <p className="text-sm text-[#666666]">Partenaires Actifs</p>
              <p className="text-2xl font-bold text-[#191919]">{mockPartenaires.length}</p>
              <p className="text-xs text-[#6A8A82]">Écosystème global</p>
            </div>
            <div className="w-10 h-10 bg-[#6A8A82]/10 rounded-lg flex items-center justify-center">
              <Handshake className="w-5 h-5 text-[#6A8A82]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#666666]">Performance Globale</p>
              <p className="text-2xl font-bold text-[#191919]">{analytics.performanceGlobale}%</p>
              <p className="text-xs text-green-600">+5.2% vs trimestre</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#666666]">CA Partenaires</p>
              <p className="text-2xl font-bold text-[#191919]">{formatCurrency(14700000)}</p>
              <p className="text-xs text-[#B87333]">+{analytics.croissanceChiffre}% YoY</p>
            </div>
            <div className="w-10 h-10 bg-[#B87333]/10 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[#B87333]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#666666]">Satisfaction</p>
              <p className="text-2xl font-bold text-[#191919]">{analytics.satisfactionMoyenne}/5</p>
              <p className="text-xs text-orange-600">{analytics.tauxRenouvellement}% renouvellement</p>
            </div>
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Réseau Partenaires Tab */}
      {activeTab === 'reseau' && (
        <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-[#E8E8E8]">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-[#666666]">Partenaire</th>
                  <th className="text-left p-4 text-sm font-medium text-[#666666]">Type</th>
                  <th className="text-left p-4 text-sm font-medium text-[#666666]">Niveau</th>
                  <th className="text-left p-4 text-sm font-medium text-[#666666]">Zone</th>
                  <th className="text-left p-4 text-sm font-medium text-[#666666]">CA Annuel</th>
                  <th className="text-left p-4 text-sm font-medium text-[#666666]">Performance</th>
                  <th className="text-left p-4 text-sm font-medium text-[#666666]">Statut</th>
                  <th className="text-left p-4 text-sm font-medium text-[#666666]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPartenaires.map((partenaire) => {
                  const TypeIcon = getTypeIcon(partenaire.type);
                  return (
                    <tr key={partenaire.id} className="border-b border-[#E8E8E8] hover:bg-gray-50">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-[#191919]">{partenaire.nom}</p>
                          <p className="text-sm text-[#666666]">{partenaire.contact.prenom} {partenaire.contact.nom}</p>
                          <p className="text-sm text-[#666666]">{partenaire.contact.email}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <TypeIcon className="w-4 h-4 text-[#6A8A82]" />
                          <span className="text-sm text-[#666666]">{partenaire.type}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getNiveauBadge(partenaire.niveau)}`}>
                          {partenaire.niveau}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-[#666666]">{partenaire.zoneCouverture.join(', ')}</p>
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-[#191919]">{formatCurrency(partenaire.chiffreAffairesAnnuel)}</p>
                        <p className="text-sm text-[#666666]">{partenaire.commissionRate}% commission</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-[#6A8A82] h-2 rounded-full"
                              style={{ width: `${partenaire.scorePerformance}%` }}
                            />
                          </div>
                          <span className="text-sm text-[#666666]">{partenaire.scorePerformance}%</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatutBadge(partenaire.statut)}`}>
                          {partenaire.statut}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setSelectedPartenaire(partenaire)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-[#6A8A82] hover:bg-[#6A8A82]/10 rounded">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-[#B87333] hover:bg-[#B87333]/10 rounded">
                            <MessageSquare className="w-4 h-4" />
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

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Top Performers */}
          <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
            <h3 className="text-lg font-semibold text-[#191919] mb-4">Top Performers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {analytics.topPartenaires.map((partenaire, index) => (
                <div key={partenaire.nom} className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getNiveauBadge(partenaire.niveau)}`}>
                      #{index + 1}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getNiveauBadge(partenaire.niveau)}`}>
                      {partenaire.niveau}
                    </span>
                  </div>
                  <h4 className="font-medium text-[#191919] mb-1">{partenaire.nom}</h4>
                  <p className="text-sm text-[#666666] mb-2">{formatCurrency(partenaire.ca)}</p>
                  <div className="flex items-center space-x-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#6A8A82] h-2 rounded-full"
                        style={{ width: `${partenaire.score}%` }}
                      />
                    </div>
                    <span className="text-xs text-[#666666]">{partenaire.score}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Evolution */}
          <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
            <h3 className="text-lg font-semibold text-[#191919] mb-4">Évolution Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.evolutionPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mois" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Area yAxisId="left" type="monotone" dataKey="ventes" stroke="#6A8A82" fill="#6A8A82" fillOpacity={0.3} name="Ventes (FCFA)" />
                <Line yAxisId="right" type="monotone" dataKey="satisfaction" stroke="#B87333" name="Satisfaction" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Répartition par Type */}
          <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
            <h3 className="text-lg font-semibold text-[#191919] mb-4">Répartition par Type</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  dataKey="ca"
                  data={analytics.repartitionParType}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  label={({ type, nombre }) => `${type}: ${nombre}`}
                >
                  {analytics.repartitionParType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>

          {/* Couverture Géographique */}
          <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
            <h3 className="text-lg font-semibold text-[#191919] mb-4">Couverture Géographique</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.zonesCouverte}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="zone" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="partenaires" fill="#6A8A82" name="Nombre de partenaires" />
                <Bar dataKey="ca" fill="#B87333" name="CA (en milliers)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Autres onglets */}
      {activeTab === 'collaboration' && (
        <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
          <div className="text-center py-12">
            <Share2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#191919] mb-2">Espace Collaboration</h3>
            <p className="text-[#666666] mb-4">Projets communs, formations et événements partenaires</p>
            <button className="px-6 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#6A8A82]/90 transition-colors">
              Gérer la collaboration
            </button>
          </div>
        </div>
      )}

      {activeTab === 'certification' && (
        <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
          <div className="text-center py-12">
            <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#191919] mb-2">Programme Certification</h3>
            <p className="text-[#666666] mb-4">Certifications et formations pour les partenaires</p>
            <button className="px-6 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#6A8A82]/90 transition-colors">
              Voir les certifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartenairesModule;