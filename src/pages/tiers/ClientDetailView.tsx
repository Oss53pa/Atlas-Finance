import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate, useParams } from 'react-router-dom';
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';
import {
  ArrowLeft, Edit, Download, Printer, AlertTriangle, CheckCircle, Clock,
  User, Building, MapPin, Phone, Mail, Calendar, DollarSign, FileText,
  BarChart3, PieChart, TrendingUp, TrendingDown, Target, Award, Shield,
  CreditCard, Euro, Users, Activity, RefreshCw, Eye, Plus, Filter,
  Search, ChevronRight, ChevronDown, AlertCircle, Info, Settings,
  Upload, Folder, File, Image, Paperclip, Link, Trash2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ResponsiveContainer, AreaChart, Area,
  PieChart as RechartsPieChart, Pie, Cell, RadialBarChart, RadialBar
} from 'recharts';

interface ClientDetail {
  id: string;
  code: string;
  nom: string;
  nomCommercial?: string;
  formeJuridique: string;
  siret?: string;
  codeAPE?: string;
  numeroTVA?: string;
  capitalSocial?: number;
  dateCreation: string;
  secteurActivite: string;
  effectif?: number;
  chiffreAffairesConnu?: number;

  // Coordonnées
  adresseFacturation: {
    rue: string;
    ville: string;
    codePostal: string;
    pays: string;
  };
  adresseCorrespondance?: {
    rue: string;
    ville: string;
    codePostal: string;
    pays: string;
  };

  // Contacts
  contacts: {
    comptabilite: {
      nom: string;
      email: string;
      telephone: string;
    };
    principal: {
      nom: string;
      fonction: string;
      email: string;
      telephone: string;
    };
  };

  // Paramètres comptables
  comptabilite: {
    compteCollectif: string;
    comptesAuxiliaires: string[];
    regimeTVA: 'NORMAL' | 'SIMPLIFIE' | 'FRANCHISE';
    tauxTVADefaut: number;
    exonerationTVA: boolean;
    modeReglement: 'VIREMENT' | 'CHEQUE' | 'PRELEVEMENT' | 'CARTE';
    conditionsPaiement: string;
    delaiPaiement: number;
    plafondEncours: number;
    deviseFacturation: string;
  };

  // Données bancaires
  banque: {
    iban: string;
    bic: string;
    domiciliation: string;
    mandatSEPA?: {
      numeroMandat: string;
      dateMandat: string;
    };
  };

  // Classification
  classification: {
    categorie: 'GRAND_COMPTE' | 'PME' | 'TPE' | 'PARTICULIER';
    zoneGeographique: string;
    responsableCommercial: string;
    notationInterne: 'A' | 'B' | 'C' | 'D';
    clientStrategique: boolean;
  };

  // Données financières
  financier: {
    chiffreAffairesAnnuel: number;
    encours: number;
    soldeComptable: number;
    impayesEnCours: number;
    dso: number;
    limiteCredit: number;
    scoreRisque: number;
    provisions: number;
  };

  // Analyses
  analyses: {
    rentabilite: {
      margebrute: number;
      margeNette: number;
      contribuationResultat: number;
      roiClient: number;
      lifetimeValue: number;
    };
    performance: {
      respectEcheances: number;
      delaiPaiementMoyen: number;
      frequenceRetards: number;
      utilisationEscompte: number;
    };
  };
}

interface MouvementComptable {
  id: string;
  dateComptable: string;
  datePiece: string;
  numeroPiece: string;
  libelle: string;
  debit: number;
  credit: number;
  solde: number;
  lettrage?: string;
  type: 'FACTURE' | 'AVOIR' | 'REGLEMENT' | 'ECART' | 'PROVISION';
}

interface Echeance {
  id: string;
  numeroFacture: string;
  dateEcheance: string;
  montant: number;
  montantRestant: number;
  statut: 'EN_COURS' | 'ECHUE' | 'PAYEE';
  retard?: number;
}

const ClientDetailView: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { clientId } = useParams();
  const [activeTab, setActiveTab] = useState('synthese');
  const [loading, setLoading] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear() - 1, new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    period: 'year' as 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
  });
  const [expandedSections, setExpandedSections] = useState<string[]>(['infos-base']);

  // Mock Client Data
  const clientDetail: ClientDetail = {
    id: '1',
    code: 'CLI001',
    nom: 'SARL CONGO BUSINESS',
    nomCommercial: 'Congo Business',
    formeJuridique: 'SARL',
    siret: '12345678901234',
    codeAPE: '4651Z',
    numeroTVA: 'FR12345678901',
    capitalSocial: 100000,
    dateCreation: '2020-01-15',
    secteurActivite: 'Commerce de gros',
    effectif: 25,
    chiffreAffairesConnu: 2450000,

    adresseFacturation: {
      rue: '123 Avenue de la Paix',
      ville: 'Brazzaville',
      codePostal: '00242',
      pays: 'Congo'
    },

    contacts: {
      comptabilite: {
        nom: 'Marie MBAMA',
        email: 'm.mbama@congobusiness.cg',
        telephone: '+242 06 11 22 33'
      },
      principal: {
        nom: 'Jean MAMBOU',
        fonction: 'Directeur Commercial',
        email: 'j.mambou@congobusiness.cg',
        telephone: '+242 06 123 45 67'
      }
    },

    comptabilite: {
      compteCollectif: '411000',
      comptesAuxiliaires: ['411001', '411002'],
      regimeTVA: 'NORMAL',
      tauxTVADefaut: 18,
      exonerationTVA: false,
      modeReglement: 'VIREMENT',
      conditionsPaiement: '30 jours net',
      delaiPaiement: 30,
      plafondEncours: 500000,
      deviseFacturation: 'XAF'
    },

    banque: {
      iban: 'CG39 3001 0000 1234 5678 9012',
      bic: 'BGFICGCG',
      domiciliation: 'BGFI Bank Congo',
      mandatSEPA: {
        numeroMandat: 'MAN-001-2024',
        dateMandat: '2024-01-15'
      }
    },

    classification: {
      categorie: 'PME',
      zoneGeographique: 'Afrique Centrale',
      responsableCommercial: 'Paul MBEKI',
      notationInterne: 'A',
      clientStrategique: true
    },

    financier: {
      chiffreAffairesAnnuel: 2450000,
      encours: 125000,
      soldeComptable: 125000,
      impayesEnCours: 0,
      dso: 28,
      limiteCredit: 500000,
      scoreRisque: 85,
      provisions: 0
    },

    analyses: {
      rentabilite: {
        margebrute: 35.5,
        margeNette: 18.2,
        contribuationResultat: 445900,
        roiClient: 22.5,
        lifetimeValue: 3500000
      },
      performance: {
        respectEcheances: 94.2,
        delaiPaiementMoyen: 32,
        frequenceRetards: 2,
        utilisationEscompte: 15
      }
    }
  };

  // Mock Mouvements Comptables
  const mouvements: MouvementComptable[] = [
    {
      id: '1',
      dateComptable: '2024-09-15',
      datePiece: '2024-09-15',
      numeroPiece: 'VT-2024-0156',
      libelle: 'Facture de vente marchandises',
      debit: 85000,
      credit: 0,
      solde: 125000,
      type: 'FACTURE'
    },
    {
      id: '2',
      dateComptable: '2024-09-10',
      datePiece: '2024-09-10',
      numeroPiece: 'REG-2024-0089',
      libelle: 'Règlement par virement bancaire',
      debit: 0,
      credit: 120000,
      solde: 40000,
      lettrage: 'A001',
      type: 'REGLEMENT'
    }
  ];

  // Mock Échéances
  const echeances: Echeance[] = [
    {
      id: '1',
      numeroFacture: 'VT-2024-0156',
      dateEcheance: '2024-10-15',
      montant: 85000,
      montantRestant: 85000,
      statut: 'EN_COURS'
    },
    {
      id: '2',
      numeroFacture: 'VT-2024-0145',
      dateEcheance: '2024-09-30',
      montant: 40000,
      montantRestant: 40000,
      statut: 'EN_COURS'
    }
  ];

  // Mock Analytics Data
  const caEvolution = [
    { mois: 'Jan', ca: 180000, marge: 32000 },
    { mois: 'Fév', ca: 195000, marge: 35000 },
    { mois: 'Mar', ca: 210000, marge: 38000 },
    { mois: 'Avr', ca: 205000, marge: 36000 },
    { mois: 'Mai', ca: 225000, marge: 40000 },
    { mois: 'Juin', ca: 240000, marge: 43000 },
    { mois: 'Juil', ca: 220000, marge: 39000 },
    { mois: 'Août', ca: 235000, marge: 42000 },
    { mois: 'Sept', ca: 250000, marge: 45000 }
  ];

  const balanceAgee = [
    { tranche: '0-30j', montant: 85000, pourcentage: 68 },
    { tranche: '31-60j', montant: 40000, pourcentage: 32 },
    { tranche: '61-90j', montant: 0, pourcentage: 0 },
    { tranche: '>90j', montant: 0, pourcentage: 0 }
  ];

  const tabs = [
    { id: 'synthese', label: 'Synthèse', icon: BarChart3 },
    { id: 'comptable', label: 'Comptable', icon: FileText },
    { id: 'financier', label: 'Financier', icon: DollarSign },
    { id: 'commercial', label: 'Commercial', icon: TrendingUp },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'historique', label: 'Historique', icon: Activity }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'EN_COURS': return 'bg-blue-100 text-blue-800';
      case 'ECHUE': return 'bg-red-100 text-red-800';
      case 'PAYEE': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const COLORS = ['#6A8A82', '#B87333', '#5A6B65', '#9B6B2A'];

  return (
    <div className="p-6 bg-[#ECECEC] min-h-screen font-['Sometype Mono']">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/tiers/clients')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#444444]" />
              <span className="text-sm font-semibold text-[#444444]">Liste Clients</span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-[#6A8A82] to-[#B87333] flex items-center justify-center">
                <Building className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#191919]">{clientDetail.nom}</h1>
                <p className="text-sm text-[#666666]">Code: {clientDetail.code} • {clientDetail.secteurActivite}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className={`px-3 py-2 rounded-lg text-sm font-medium ${getScoreColor(clientDetail.financier.scoreRisque)}`}>
              Score: {clientDetail.financier.scoreRisque}/100
            </div>

            <button
              onClick={() => setShowPeriodModal(true)}
              className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
            >
              <Calendar className="w-4 h-4 text-[#666666]" />
              <span>
                {dateRange.period === 'custom'
                  ? `${dateRange.startDate} - ${dateRange.endDate}`
                  : dateRange.period === 'day' ? '1 jour'
                  : dateRange.period === 'week' ? '1 semaine'
                  : dateRange.period === 'month' ? '1 mois'
                  : dateRange.period === 'quarter' ? '3 mois'
                  : '12 mois'
                }
              </span>
            </button>

            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" aria-label="Imprimer">
              <Printer className="w-4 h-4" />
              <span className="text-sm font-semibold">{t('common.print')}</span>
            </button>

            <button className="flex items-center space-x-2 px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#6A8A82]/90 transition-colors">
              <Edit className="w-4 h-4" />
              <span className="text-sm font-semibold">{t('common.edit')}</span>
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

      {/* Synthèse Tab */}
      {activeTab === 'synthese' && (
        <div className="space-y-6">
          {/* KPIs Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">CA Annuel</p>
                  <p className="text-2xl font-bold text-[#191919]">{formatCurrency(clientDetail.financier.chiffreAffairesAnnuel)}</p>
                  <p className="text-xs text-green-600">+8.5% vs N-1</p>
                </div>
                <div className="w-10 h-10 bg-[#6A8A82]/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[#6A8A82]" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Encours Client</p>
                  <p className="text-2xl font-bold text-[#191919]">{formatCurrency(clientDetail.financier.encours)}</p>
                  <p className="text-xs text-orange-600">DSO: {clientDetail.financier.dso} jours</p>
                </div>
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Marge Nette</p>
                  <p className="text-2xl font-bold text-[#191919]">{clientDetail.analyses.rentabilite.margeNette}%</p>
                  <p className="text-xs text-[#B87333]">ROI: {clientDetail.analyses.rentabilite.roiClient}%</p>
                </div>
                <div className="w-10 h-10 bg-[#B87333]/10 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-[#B87333]" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Respect Échéances</p>
                  <p className="text-2xl font-bold text-[#191919]">{clientDetail.analyses.performance.respectEcheances}%</p>
                  <p className="text-xs text-green-600">Excellent payeur</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Évolution CA */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Évolution CA & Marge</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={caEvolution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mois" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                  <Area type="monotone" dataKey="ca" stackId="1" stroke="#6A8A82" fill="#6A8A82" fillOpacity={0.6} name="Chiffre d'Affaires" />
                  <Area type="monotone" dataKey="marge" stackId="1" stroke="#B87333" fill="#B87333" fillOpacity={0.6} name="Marge" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Balance Âgée */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Balance Âgée</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    dataKey="montant"
                    data={balanceAgee}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    label={({ tranche, pourcentage }) => `${tranche}: ${pourcentage}%`}
                  >
                    {balanceAgee.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Informations Client */}
          <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm">
            <div className="space-y-4">
              {/* Informations de Base */}
              <div className="border-b border-[#E8E8E8]">
                <button
                  onClick={() => toggleSection('infos-base')}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
                >
                  <h3 className="text-lg font-semibold text-[#191919]">Informations de Base</h3>
                  {expandedSections.includes('infos-base') ?
                    <ChevronDown className="w-5 h-5" /> :
                    <ChevronRight className="w-5 h-5" />
                  }
                </button>

                {expandedSections.includes('infos-base') && (
                  <div className="px-4 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <h4 className="font-medium text-[#191919] mb-3">Identification</h4>
                        <div className="space-y-2 text-sm">
                          <div><span className="text-[#666666]">Raison sociale:</span> <span className="font-medium">{clientDetail.nom}</span></div>
                          <div><span className="text-[#666666]">Nom commercial:</span> <span className="font-medium">{clientDetail.nomCommercial}</span></div>
                          <div><span className="text-[#666666]">Forme juridique:</span> <span className="font-medium">{clientDetail.formeJuridique}</span></div>
                          <div><span className="text-[#666666]">SIRET:</span> <span className="font-medium">{clientDetail.siret}</span></div>
                          <div><span className="text-[#666666]">Code APE:</span> <span className="font-medium">{clientDetail.codeAPE}</span></div>
                          <div><span className="text-[#666666]">N° TVA:</span> <span className="font-medium">{clientDetail.numeroTVA}</span></div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-[#191919] mb-3">Adresse</h4>
                        <div className="space-y-2 text-sm">
                          <div><span className="text-[#666666]">Rue:</span> <span className="font-medium">{clientDetail.adresseFacturation.rue}</span></div>
                          <div><span className="text-[#666666]">Ville:</span> <span className="font-medium">{clientDetail.adresseFacturation.ville}</span></div>
                          <div><span className="text-[#666666]">Code postal:</span> <span className="font-medium">{clientDetail.adresseFacturation.codePostal}</span></div>
                          <div><span className="text-[#666666]">Pays:</span> <span className="font-medium">{clientDetail.adresseFacturation.pays}</span></div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-[#191919] mb-3">Contacts</h4>
                        <div className="space-y-2 text-sm">
                          <div><span className="text-[#666666]">Contact principal:</span> <span className="font-medium">{clientDetail.contacts.principal.nom}</span></div>
                          <div><span className="text-[#666666]">Fonction:</span> <span className="font-medium">{clientDetail.contacts.principal.fonction}</span></div>
                          <div><span className="text-[#666666]">Email:</span> <span className="font-medium">{clientDetail.contacts.principal.email}</span></div>
                          <div><span className="text-[#666666]">Téléphone:</span> <span className="font-medium">{clientDetail.contacts.principal.telephone}</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Paramètres Comptables */}
              <div className="border-b border-[#E8E8E8]">
                <button
                  onClick={() => toggleSection('params-comptables')}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
                >
                  <h3 className="text-lg font-semibold text-[#191919]">Paramètres Comptables</h3>
                  {expandedSections.includes('params-comptables') ?
                    <ChevronDown className="w-5 h-5" /> :
                    <ChevronRight className="w-5 h-5" />
                  }
                </button>

                {expandedSections.includes('params-comptables') && (
                  <div className="px-4 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <h4 className="font-medium text-[#191919] mb-3">Comptes</h4>
                        <div className="space-y-2 text-sm">
                          <div><span className="text-[#666666]">Compte collectif:</span> <span className="font-medium">{clientDetail.comptabilite.compteCollectif}</span></div>
                          <div><span className="text-[#666666]">Comptes auxiliaires:</span> <span className="font-medium">{clientDetail.comptabilite.comptesAuxiliaires.join(', ')}</span></div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-[#191919] mb-3">TVA</h4>
                        <div className="space-y-2 text-sm">
                          <div><span className="text-[#666666]">Régime TVA:</span> <span className="font-medium">{clientDetail.comptabilite.regimeTVA}</span></div>
                          <div><span className="text-[#666666]">Taux défaut:</span> <span className="font-medium">{clientDetail.comptabilite.tauxTVADefaut}%</span></div>
                          <div><span className="text-[#666666]">Exonération:</span> <span className="font-medium">{clientDetail.comptabilite.exonerationTVA ? 'Oui' : 'Non'}</span></div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-[#191919] mb-3">Paiement</h4>
                        <div className="space-y-2 text-sm">
                          <div><span className="text-[#666666]">Mode règlement:</span> <span className="font-medium">{clientDetail.comptabilite.modeReglement}</span></div>
                          <div><span className="text-[#666666]">Conditions:</span> <span className="font-medium">{clientDetail.comptabilite.conditionsPaiement}</span></div>
                          <div><span className="text-[#666666]">Délai:</span> <span className="font-medium">{clientDetail.comptabilite.delaiPaiement} jours</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comptable Tab */}
      {activeTab === 'comptable' && (
        <div className="space-y-6">
          {/* Mouvements Comptables */}
          <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm">
            <div className="p-4 border-b border-[#E8E8E8]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#191919]">Mouvements Comptables</h3>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 text-sm bg-[#6A8A82] text-white rounded hover:bg-[#6A8A82]/90">
                    Exporter
                  </button>
                  <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                    Lettrage
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium text-[#666666]">{t('common.date')}</th>
                    <th className="text-left p-3 text-sm font-medium text-[#666666]">{t('accounting.piece')}</th>
                    <th className="text-left p-3 text-sm font-medium text-[#666666]">{t('accounting.label')}</th>
                    <th className="text-right p-3 text-sm font-medium text-[#666666]">{t('accounting.debit')}</th>
                    <th className="text-right p-3 text-sm font-medium text-[#666666]">{t('accounting.credit')}</th>
                    <th className="text-right p-3 text-sm font-medium text-[#666666]">{t('accounting.balance')}</th>
                    <th className="text-center p-3 text-sm font-medium text-[#666666]">{t('thirdParty.reconciliation')}</th>
                  </tr>
                </thead>
                <tbody>
                  {mouvements.map((mouvement) => (
                    <tr key={mouvement.id} className="border-b border-[#E8E8E8] hover:bg-gray-50">
                      <td className="p-3 text-sm">{new Date(mouvement.dateComptable).toLocaleDateString('fr-FR')}</td>
                      <td className="p-3 text-sm font-medium">{mouvement.numeroPiece}</td>
                      <td className="p-3 text-sm">{mouvement.libelle}</td>
                      <td className="p-3 text-sm text-right font-medium">{mouvement.debit > 0 ? formatCurrency(mouvement.debit) : '-'}</td>
                      <td className="p-3 text-sm text-right font-medium">{mouvement.credit > 0 ? formatCurrency(mouvement.credit) : '-'}</td>
                      <td className="p-3 text-sm text-right font-medium">{formatCurrency(mouvement.solde)}</td>
                      <td className="p-3 text-center">
                        {mouvement.lettrage ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">{mouvement.lettrage}</span>
                        ) : (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Non lettré</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Échéancier */}
          <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm">
            <div className="p-4 border-b border-[#E8E8E8]">
              <h3 className="text-lg font-semibold text-[#191919]">Échéancier Client</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium text-[#666666]">Facture</th>
                    <th className="text-left p-3 text-sm font-medium text-[#666666]">Échéance</th>
                    <th className="text-right p-3 text-sm font-medium text-[#666666]">Montant</th>
                    <th className="text-right p-3 text-sm font-medium text-[#666666]">Restant</th>
                    <th className="text-center p-3 text-sm font-medium text-[#666666]">Statut</th>
                    <th className="text-center p-3 text-sm font-medium text-[#666666]">Retard</th>
                  </tr>
                </thead>
                <tbody>
                  {echeances.map((echeance) => (
                    <tr key={echeance.id} className="border-b border-[#E8E8E8] hover:bg-gray-50">
                      <td className="p-3 text-sm font-medium">{echeance.numeroFacture}</td>
                      <td className="p-3 text-sm">{new Date(echeance.dateEcheance).toLocaleDateString('fr-FR')}</td>
                      <td className="p-3 text-sm text-right font-medium">{formatCurrency(echeance.montant)}</td>
                      <td className="p-3 text-sm text-right font-medium">{formatCurrency(echeance.montantRestant)}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 text-xs rounded ${getStatutColor(echeance.statut)}`}>
                          {echeance.statut}
                        </span>
                      </td>
                      <td className="p-3 text-center text-sm">
                        {echeance.retard ? `${echeance.retard} jours` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Financier Tab */}
      {activeTab === 'financier' && (
        <div className="space-y-6">
          {/* Analyse de Rentabilité */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Analyse de Rentabilité</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-[#666666]">Marge Brute</span>
                  <span className="font-semibold text-[#191919]">{clientDetail.analyses.rentabilite.margebrute}%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-[#666666]">Marge Nette</span>
                  <span className="font-semibold text-[#191919]">{clientDetail.analyses.rentabilite.margeNette}%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-[#666666]">Contribution au Résultat</span>
                  <span className="font-semibold text-[#191919]">{formatCurrency(clientDetail.analyses.rentabilite.contribuationResultat)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-[#666666]">ROI Client</span>
                  <span className="font-semibold text-green-600">{clientDetail.analyses.rentabilite.roiClient}%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-[#666666]">Lifetime Value</span>
                  <span className="font-semibold text-[#6A8A82]">{formatCurrency(clientDetail.analyses.rentabilite.lifetimeValue)}</span>
                </div>
              </div>
            </div>

            {/* Analyse des Risques */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Analyse des Risques</h3>
              <div className="space-y-4">
                <div className="text-center">
                  <ResponsiveContainer width="100%" height={200}>
                    <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={[{value: clientDetail.financier.scoreRisque}]}>
                      <RadialBar dataKey="value" cornerRadius={10} fill="#6A8A82" />
                      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-xl font-bold fill-[#191919]">
                        {clientDetail.financier.scoreRisque}/100
                      </text>
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <p className="text-sm text-[#666666] mt-2">Score de Risque Global</p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[#666666]">Notation Interne</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      clientDetail.classification.notationInterne === 'A' ? 'bg-green-100 text-green-800' :
                      clientDetail.classification.notationInterne === 'B' ? 'bg-blue-100 text-blue-800' :
                      clientDetail.classification.notationInterne === 'C' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {clientDetail.classification.notationInterne}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#666666]">Limite de Crédit</span>
                    <span className="font-medium text-[#191919]">{formatCurrency(clientDetail.financier.limiteCredit)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#666666]">Utilisation Crédit</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-[#6A8A82] h-2 rounded-full"
                          style={{width: `${(clientDetail.financier.encours / clientDetail.financier.limiteCredit) * 100}%`}}
                        />
                      </div>
                      <span className="text-sm text-[#666666]">
                        {Math.round((clientDetail.financier.encours / clientDetail.financier.limiteCredit) * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#666666]">Provisions</span>
                    <span className="font-medium text-[#191919]">{formatCurrency(clientDetail.financier.provisions)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Historique des Paiements */}
          <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
            <h3 className="text-lg font-semibold text-[#191919] mb-4">Performance de Paiement</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                <div className="text-2xl font-bold text-green-700">{clientDetail.analyses.performance.respectEcheances}%</div>
                <div className="text-sm text-green-600">Respect Échéances</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">{clientDetail.analyses.performance.delaiPaiementMoyen}j</div>
                <div className="text-sm text-blue-600">Délai Moyen</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
                <div className="text-2xl font-bold text-orange-700">{clientDetail.analyses.performance.frequenceRetards}</div>
                <div className="text-sm text-orange-600">Retards/Mois</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                <div className="text-2xl font-bold text-purple-700">{clientDetail.analyses.performance.utilisationEscompte}%</div>
                <div className="text-sm text-purple-600">Utilisation Escompte</div>
              </div>
            </div>

            {/* Graphique Évolution DSO */}
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={[
                {mois: 'Jan', dso: 30, objectif: 30},
                {mois: 'Fév', dso: 28, objectif: 30},
                {mois: 'Mar', dso: 32, objectif: 30},
                {mois: 'Avr', dso: 29, objectif: 30},
                {mois: 'Mai', dso: 27, objectif: 30},
                {mois: 'Juin', dso: 28, objectif: 30}
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mois" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="dso" stroke="#6A8A82" strokeWidth={2} name="DSO Réel" />
                <Line type="monotone" dataKey="objectif" stroke="#B87333" strokeDasharray="5 5" name="Objectif" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Analyse Comparative */}
          <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
            <h3 className="text-lg font-semibold text-[#191919] mb-4">Benchmarking Sectoriel</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium text-[#666666]">Métrique</th>
                    <th className="text-center p-3 text-sm font-medium text-[#666666]">Client</th>
                    <th className="text-center p-3 text-sm font-medium text-[#666666]">Moyenne Secteur</th>
                    <th className="text-center p-3 text-sm font-medium text-[#666666]">Position</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#E8E8E8]">
                    <td className="p-3 text-sm">DSO (jours)</td>
                    <td className="p-3 text-sm text-center font-medium">{clientDetail.financier.dso}</td>
                    <td className="p-3 text-sm text-center">35</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Meilleur</span>
                    </td>
                  </tr>
                  <tr className="border-b border-[#E8E8E8]">
                    <td className="p-3 text-sm">Marge Nette (%)</td>
                    <td className="p-3 text-sm text-center font-medium">{clientDetail.analyses.rentabilite.margeNette}%</td>
                    <td className="p-3 text-sm text-center">12.5%</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Supérieur</span>
                    </td>
                  </tr>
                  <tr className="border-b border-[#E8E8E8]">
                    <td className="p-3 text-sm">Respect Échéances (%)</td>
                    <td className="p-3 text-sm text-center font-medium">{clientDetail.analyses.performance.respectEcheances}%</td>
                    <td className="p-3 text-sm text-center">87%</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Excellent</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Commercial Tab */}
      {activeTab === 'commercial' && (
        <div className="space-y-6">
          {/* Informations Commerciales */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Informations Commerciales</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-[#666666]">Responsable Commercial</span>
                  <span className="font-medium text-[#191919]">{clientDetail.classification.responsableCommercial}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-[#666666]">Catégorie Client</span>
                  <span className="font-medium text-[#191919]">{clientDetail.classification.categorie}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-[#666666]">Zone Géographique</span>
                  <span className="font-medium text-[#191919]">{clientDetail.classification.zoneGeographique}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-[#666666]">Client Stratégique</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    clientDetail.classification.clientStrategique
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {clientDetail.classification.clientStrategique ? 'Oui' : 'Non'}
                  </span>
                </div>
              </div>
            </div>

            {/* Objectifs et Performance */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Objectifs & Performance</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#666666]">Objectif CA Annuel</span>
                    <span className="font-medium">{formatCurrency(2800000)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-[#6A8A82] h-3 rounded-full flex items-center justify-end pr-2"
                      style={{width: `${(clientDetail.financier.chiffreAffairesAnnuel / 2800000) * 100}%`}}
                    >
                      <span className="text-xs text-white font-medium">87.5%</span>
                    </div>
                  </div>
                  <p className="text-xs text-[#666666] mt-1">
                    Réalisé: {formatCurrency(clientDetail.financier.chiffreAffairesAnnuel)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gradient-to-br from-[#6A8A82]/10 to-[#6A8A82]/5 rounded-lg">
                    <div className="text-lg font-bold text-[#6A8A82]">+8.5%</div>
                    <div className="text-xs text-[#666666]">Croissance CA</div>
                  </div>
                  <div className="text-center p-3 bg-gradient-to-br from-[#B87333]/10 to-[#B87333]/5 rounded-lg">
                    <div className="text-lg font-bold text-[#B87333]">142</div>
                    <div className="text-xs text-[#666666]">Commandes/An</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Historique des Ventes */}
          <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[#191919]">Historique des Ventes</h3>
              <div className="flex space-x-2">
                <button className="px-3 py-1 text-sm bg-[#6A8A82] text-white rounded hover:bg-[#6A8A82]/90">
                  Nouvelle Commande
                </button>
                <button className="px-3 py-1 text-sm border border-[#6A8A82] text-[#6A8A82] rounded hover:bg-[#6A8A82]/10">
                  Voir Tout
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium text-[#666666]">{t('common.date')}</th>
                    <th className="text-left p-3 text-sm font-medium text-[#666666]">N° Commande</th>
                    <th className="text-left p-3 text-sm font-medium text-[#666666]">Produits</th>
                    <th className="text-right p-3 text-sm font-medium text-[#666666]">Montant HT</th>
                    <th className="text-center p-3 text-sm font-medium text-[#666666]">Statut</th>
                    <th className="text-center p-3 text-sm font-medium text-[#666666]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#E8E8E8] hover:bg-gray-50">
                    <td className="p-3 text-sm">15/09/2024</td>
                    <td className="p-3 text-sm font-medium">CMD-2024-0156</td>
                    <td className="p-3 text-sm">Équipements bureautiques</td>
                    <td className="p-3 text-sm text-right font-medium">{formatCurrency(85000)}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Livrée</span>
                    </td>
                    <td className="p-3 text-center">
                      <button className="p-1 text-blue-600 hover:bg-blue-100 rounded" aria-label="Voir les détails">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  <tr className="border-b border-[#E8E8E8] hover:bg-gray-50">
                    <td className="p-3 text-sm">28/08/2024</td>
                    <td className="p-3 text-sm font-medium">CMD-2024-0142</td>
                    <td className="p-3 text-sm">Fournitures de bureau</td>
                    <td className="p-3 text-sm text-right font-medium">{formatCurrency(42000)}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">{t('status.inProgress')}</span>
                    </td>
                    <td className="p-3 text-center">
                      <button className="p-1 text-blue-600 hover:bg-blue-100 rounded" aria-label="Voir les détails">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  <tr className="border-b border-[#E8E8E8] hover:bg-gray-50">
                    <td className="p-3 text-sm">10/08/2024</td>
                    <td className="p-3 text-sm font-medium">CMD-2024-0128</td>
                    <td className="p-3 text-sm">Services informatiques</td>
                    <td className="p-3 text-sm text-right font-medium">{formatCurrency(125000)}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Facturée</span>
                    </td>
                    <td className="p-3 text-center">
                      <button className="p-1 text-blue-600 hover:bg-blue-100 rounded" aria-label="Voir les détails">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Analyse Produits */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Top Produits/Services</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={[
                  {produit: 'Équipements', ca: 450000, commandes: 25},
                  {produit: 'Services IT', ca: 380000, commandes: 18},
                  {produit: 'Fournitures', ca: 220000, commandes: 45},
                  {produit: 'Formation', ca: 150000, commandes: 8}
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="produit" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => name === 'ca' ? formatCurrency(value as number) : value} />
                  <Legend />
                  <Bar dataKey="ca" fill="#6A8A82" name="CA (FCFA)" />
                  <Bar dataKey="commandes" fill="#B87333" name="Nb Commandes" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Évolution Commandes</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={[
                  {mois: 'Jan', commandes: 8, valeur: 180000},
                  {mois: 'Fév', commandes: 12, valeur: 195000},
                  {mois: 'Mar', commandes: 15, valeur: 210000},
                  {mois: 'Avr', commandes: 11, valeur: 205000},
                  {mois: 'Mai', commandes: 14, valeur: 225000},
                  {mois: 'Juin', commandes: 18, valeur: 240000}
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mois" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Area yAxisId="right" type="monotone" dataKey="valeur" stroke="#6A8A82" fill="#6A8A82" fillOpacity={0.3} name="Valeur (FCFA)" />
                  <Line yAxisId="left" type="monotone" dataKey="commandes" stroke="#B87333" strokeWidth={2} name="Nb Commandes" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Opportunités et Projets */}
          <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
            <h3 className="text-lg font-semibold text-[#191919] mb-4">Opportunités en Cours</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 border border-[#E8E8E8] rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-[#191919]">Projet ERP Complet</h4>
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">En négociation</span>
                </div>
                <p className="text-sm text-[#666666] mb-3">Implémentation solution ERP complète avec formation équipe</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#666666]">Valeur estimée:</span>
                    <span className="font-medium">{formatCurrency(850000)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#666666]">Probabilité:</span>
                    <span className="font-medium">75%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#666666]">Clôture prévue:</span>
                    <span className="font-medium">Dec 2024</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border border-[#E8E8E8] rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-[#191919]">Extension Modules</h4>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Qualifiée</span>
                </div>
                <p className="text-sm text-[#666666] mb-3">Ajout modules CRM et Analytics avancés</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#666666]">Valeur estimée:</span>
                    <span className="font-medium">{formatCurrency(450000)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#666666]">Probabilité:</span>
                    <span className="font-medium">60%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#666666]">Clôture prévue:</span>
                    <span className="font-medium">Mar 2025</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border border-[#E8E8E8] rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-[#191919]">Support Premium</h4>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Proposition envoyée</span>
                </div>
                <p className="text-sm text-[#666666] mb-3">Contrat support et maintenance 3 ans</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#666666]">Valeur estimée:</span>
                    <span className="font-medium">{formatCurrency(180000)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#666666]">Probabilité:</span>
                    <span className="font-medium">90%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#666666]">Clôture prévue:</span>
                    <span className="font-medium">Nov 2024</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Upload et Actions */}
          <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[#191919]">Gestion Documentaire</h3>
              <div className="flex space-x-2">
                <button className="flex items-center space-x-2 px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#6A8A82]/90">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm font-semibold">Ajouter Document</span>
                </button>
                <button className="flex items-center space-x-2 px-4 py-2 border border-[#6A8A82] text-[#6A8A82] rounded-lg hover:bg-[#6A8A82]/10">
                  <Folder className="w-4 h-4" />
                  <span className="text-sm font-semibold">Créer Dossier</span>
                </button>
              </div>
            </div>

            {/* Statistiques Documents */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">24</div>
                <div className="text-sm text-blue-600">Documents Total</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                <div className="text-2xl font-bold text-green-700">8</div>
                <div className="text-sm text-green-600">Contrats</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
                <div className="text-2xl font-bold text-orange-700">12</div>
                <div className="text-sm text-orange-600">Factures</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                <div className="text-2xl font-bold text-purple-700">4</div>
                <div className="text-sm text-purple-600">Correspondances</div>
              </div>
            </div>
          </div>

          {/* Dossiers et Documents */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Structure des Dossiers */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Structure Documentaire</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <Folder className="w-5 h-5 text-[#6A8A82]" />
                  <span className="text-sm font-medium">📁 Contrats</span>
                  <span className="text-xs text-[#666666] ml-auto">(8)</span>
                </div>
                <div className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer ml-4">
                  <File className="w-4 h-4 text-blue-600" />
                  <span className="text-sm">Contrat Cadre 2024.pdf</span>
                </div>
                <div className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer ml-4">
                  <File className="w-4 h-4 text-blue-600" />
                  <span className="text-sm">Avenant N°1.pdf</span>
                </div>

                <div className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <Folder className="w-5 h-5 text-[#6A8A82]" />
                  <span className="text-sm font-medium">📁 Factures</span>
                  <span className="text-xs text-[#666666] ml-auto">(12)</span>
                </div>
                <div className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer ml-4">
                  <File className="w-4 h-4 text-green-600" />
                  <span className="text-sm">FAC-2024-0156.pdf</span>
                </div>
                <div className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer ml-4">
                  <File className="w-4 h-4 text-green-600" />
                  <span className="text-sm">FAC-2024-0142.pdf</span>
                </div>

                <div className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <Folder className="w-5 h-5 text-[#6A8A82]" />
                  <span className="text-sm font-medium">📁 Juridique</span>
                  <span className="text-xs text-[#666666] ml-auto">(4)</span>
                </div>
                <div className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer ml-4">
                  <File className="w-4 h-4 text-red-600" />
                  <span className="text-sm">Kbis.pdf</span>
                </div>
                <div className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer ml-4">
                  <File className="w-4 h-4 text-red-600" />
                  <span className="text-sm">Statuts.pdf</span>
                </div>

                <div className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <Folder className="w-5 h-5 text-[#6A8A82]" />
                  <span className="text-sm font-medium">📁 Correspondances</span>
                  <span className="text-xs text-[#666666] ml-auto">(4)</span>
                </div>
              </div>
            </div>

            {/* Documents Récents */}
            <div className="lg:col-span-2 bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Documents Récents</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-4 p-3 border border-[#E8E8E8] rounded-lg hover:bg-gray-50">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-[#191919]">Contrat de Maintenance 2024.pdf</h4>
                    <p className="text-sm text-[#666666]">Ajouté le 15/09/2024 par Marie Kouam</p>
                    <p className="text-xs text-[#666666]">Taille: 2.4 MB</p>
                  </div>
                  <div className="flex space-x-2">
                    <button className="p-2 text-[#6A8A82] hover:bg-[#6A8A82]/10 rounded" aria-label="Voir les détails">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-blue-600 hover:bg-blue-100 rounded" aria-label="Télécharger">
                      <Download className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-red-600 hover:bg-red-100 rounded" aria-label="Supprimer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-4 p-3 border border-[#E8E8E8] rounded-lg hover:bg-gray-50">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-[#191919]">Facture VT-2024-0156.pdf</h4>
                    <p className="text-sm text-[#666666]">Ajouté le 10/09/2024 par Paul Mbeki</p>
                    <p className="text-xs text-[#666666]">Taille: 856 KB</p>
                  </div>
                  <div className="flex space-x-2">
                    <button className="p-2 text-[#6A8A82] hover:bg-[#6A8A82]/10 rounded" aria-label="Voir les détails">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-blue-600 hover:bg-blue-100 rounded" aria-label="Télécharger">
                      <Download className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-red-600 hover:bg-red-100 rounded" aria-label="Supprimer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-4 p-3 border border-[#E8E8E8] rounded-lg hover:bg-gray-50">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Image className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-[#191919]">Logo_Congo_Business.png</h4>
                    <p className="text-sm text-[#666666]">Ajouté le 05/09/2024 par Sophie Ndong</p>
                    <p className="text-xs text-[#666666]">Taille: 245 KB</p>
                  </div>
                  <div className="flex space-x-2">
                    <button className="p-2 text-[#6A8A82] hover:bg-[#6A8A82]/10 rounded" aria-label="Voir les détails">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-blue-600 hover:bg-blue-100 rounded" aria-label="Télécharger">
                      <Download className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-red-600 hover:bg-red-100 rounded" aria-label="Supprimer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-4 p-3 border border-[#E8E8E8] rounded-lg hover:bg-gray-50">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Paperclip className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-[#191919]">Correspondance_relance.docx</h4>
                    <p className="text-sm text-[#666666]">Ajouté le 28/08/2024 par Jean Akono</p>
                    <p className="text-xs text-[#666666]">Taille: 125 KB</p>
                  </div>
                  <div className="flex space-x-2">
                    <button className="p-2 text-[#6A8A82] hover:bg-[#6A8A82]/10 rounded" aria-label="Voir les détails">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-blue-600 hover:bg-blue-100 rounded" aria-label="Télécharger">
                      <Download className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-red-600 hover:bg-red-100 rounded" aria-label="Supprimer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Partage et Permissions */}
          <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
            <h3 className="text-lg font-semibold text-[#191919] mb-4">Partage et Permissions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-[#191919] mb-3">Accès Équipe</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-[#6A8A82] rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Marie Kouam</p>
                        <p className="text-xs text-[#666666]">Commercial</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Lecture/Écriture</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-[#B87333] rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Paul Mbeki</p>
                        <p className="text-xs text-[#666666]">Comptable</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Lecture</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Sophie Ndong</p>
                        <p className="text-xs text-[#666666]">Manager</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Admin</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-[#191919] mb-3">Liens de Partage</h4>
                <div className="space-y-3">
                  <div className="p-3 border border-[#E8E8E8] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Dossier Contrats</span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Actif</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 p-2 bg-gray-50 rounded text-xs text-[#666666] truncate">
                        https://wisebook.cm/share/contracts/cli001...
                      </div>
                      <button className="p-2 text-[#6A8A82] hover:bg-[#6A8A82]/10 rounded">
                        <Link className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3 border border-[#E8E8E8] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Factures 2024</span>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">Expiré</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 p-2 bg-gray-50 rounded text-xs text-[#666666] truncate">
                        https://wisebook.cm/share/invoices/cli001...
                      </div>
                      <button className="p-2 text-[#6A8A82] hover:bg-[#6A8A82]/10 rounded">
                        <Link className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historique Tab */}
      {activeTab === 'historique' && (
        <div className="space-y-6">
          {/* Filtres et Actions */}
          <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-[#191919]">Historique des Activités</h3>
              <div className="flex space-x-2">
                <select className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A8A82] text-sm">
                  <option value="all">Tous les types</option>
                  <option value="commercial">Commercial</option>
                  <option value="comptable">Comptable</option>
                  <option value="communication">Communication</option>
                  <option value="systeme">Système</option>
                </select>
                <select className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A8A82] text-sm">
                  <option value="30">30 derniers jours</option>
                  <option value="90">90 derniers jours</option>
                  <option value="365">1 an</option>
                  <option value="all">Tout l'historique</option>
                </select>
                <button className="px-3 py-2 text-sm bg-[#6A8A82] text-white rounded hover:bg-[#6A8A82]/90">
                  Exporter
                </button>
              </div>
            </div>
          </div>

          {/* Statistiques Activité */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Interactions ce mois</p>
                  <p className="text-2xl font-bold text-[#191919]">28</p>
                  <p className="text-xs text-green-600">+12% vs mois dernier</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Dernière activité</p>
                  <p className="text-2xl font-bold text-[#191919]">2h</p>
                  <p className="text-xs text-[#666666]">Facture créée</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Communications</p>
                  <p className="text-2xl font-bold text-[#191919]">14</p>
                  <p className="text-xs text-[#666666]">Emails + Appels</p>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Modifications</p>
                  <p className="text-2xl font-bold text-[#191919]">8</p>
                  <p className="text-xs text-[#666666]">Données client</p>
                </div>
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Edit className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Timeline des Activités */}
          <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm">
            <div className="p-4 border-b border-[#E8E8E8]">
              <h3 className="text-lg font-semibold text-[#191919]">Chronologie des Événements</h3>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                {/* Activité Récente */}
                <div className="flex items-start space-x-4 relative">
                  <div className="absolute left-6 top-12 w-px h-full bg-gray-200"></div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-[#191919]">Facture VT-2024-0156 créée</h4>
                        <p className="text-sm text-[#666666] mt-1">
                          Création automatique de la facture pour la commande CMD-2024-0156
                          d'un montant de {formatCurrency(85000)}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-[#666666]">
                          <span>Par: Paul Mbeki</span>
                          <span>•</span>
                          <span>15/09/2024 à 14:30</span>
                          <span>•</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">Comptable</span>
                        </div>
                      </div>
                      <span className="text-xs text-[#666666] flex-shrink-0">Il y a 2h</span>
                    </div>
                  </div>
                </div>

                {/* Communication */}
                <div className="flex items-start space-x-4 relative">
                  <div className="absolute left-6 top-12 w-px h-full bg-gray-200"></div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-[#191919]">Appel téléphonique - Suivi commande</h4>
                        <p className="text-sm text-[#666666] mt-1">
                          Discussion avec Jean MAMBOU concernant le statut de livraison et
                          planification de la prochaine commande trimestre Q4
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-[#666666]">
                          <span>Par: Marie Kouam</span>
                          <span>•</span>
                          <span>15/09/2024 à 10:15</span>
                          <span>•</span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded">Commercial</span>
                        </div>
                        <div className="mt-2">
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            Durée: 25 min
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-[#666666] flex-shrink-0">Il y a 6h</span>
                    </div>
                  </div>
                </div>

                {/* Livraison */}
                <div className="flex items-start space-x-4 relative">
                  <div className="absolute left-6 top-12 w-px h-full bg-gray-200"></div>
                  <div className="w-12 h-12 bg-[#6A8A82]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-[#6A8A82]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-[#191919]">Livraison confirmée - CMD-2024-0156</h4>
                        <p className="text-sm text-[#666666] mt-1">
                          Réception confirmée des équipements bureautiques.
                          Bon de livraison signé électroniquement
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-[#666666]">
                          <span>Par: Système Logistique</span>
                          <span>•</span>
                          <span>14/09/2024 à 16:45</span>
                          <span>•</span>
                          <span className="px-2 py-1 bg-[#6A8A82]/20 text-[#6A8A82] rounded">Logistique</span>
                        </div>
                      </div>
                      <span className="text-xs text-[#666666] flex-shrink-0">Il y a 1j</span>
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start space-x-4 relative">
                  <div className="absolute left-6 top-12 w-px h-full bg-gray-200"></div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-[#191919]">Email envoyé - Confirmation de commande</h4>
                        <p className="text-sm text-[#666666] mt-1">
                          Envoi automatique de la confirmation de commande CMD-2024-0156
                          avec détails de livraison et facture pro-forma
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-[#666666]">
                          <span>À: j.mambou@congobusiness.cg</span>
                          <span>•</span>
                          <span>12/09/2024 à 09:30</span>
                          <span>•</span>
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">Communication</span>
                        </div>
                        <div className="mt-2 flex space-x-2">
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            Ouvert
                          </span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            Pièce jointe téléchargée
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-[#666666] flex-shrink-0">Il y a 3j</span>
                    </div>
                  </div>
                </div>

                {/* Modification Client */}
                <div className="flex items-start space-x-4 relative">
                  <div className="absolute left-6 top-12 w-px h-full bg-gray-200"></div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Edit className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-[#191919]">Informations client mises à jour</h4>
                        <p className="text-sm text-[#666666] mt-1">
                          Modification des coordonnées bancaires suite au changement
                          d'établissement bancaire principal
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-[#666666]">
                          <span>Par: Sophie Ndong</span>
                          <span>•</span>
                          <span>10/09/2024 à 11:20</span>
                          <span>•</span>
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">Système</span>
                        </div>
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                          <div className="font-medium text-gray-700 mb-1">Champs modifiés:</div>
                          <div className="space-y-1 text-gray-600">
                            <div>• IBAN: CG39 3001 0000 1234 5678 9012 (nouveau)</div>
                            <div>• Domiciliation: BGFI Bank Congo</div>
                            <div>• Mandat SEPA: MAN-001-2024</div>
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-[#666666] flex-shrink-0">Il y a 5j</span>
                    </div>
                  </div>
                </div>

                {/* Paiement */}
                <div className="flex items-start space-x-4 relative">
                  <div className="absolute left-6 top-12 w-px h-full bg-gray-200"></div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-[#191919]">Paiement reçu - {formatCurrency(120000)}</h4>
                        <p className="text-sm text-[#666666] mt-1">
                          Règlement par virement bancaire pour la facture VT-2024-0145.
                          Lettrage automatique effectué
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-[#666666]">
                          <span>Référence: REG-2024-0089</span>
                          <span>•</span>
                          <span>05/09/2024 à 14:15</span>
                          <span>•</span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded">Comptable</span>
                        </div>
                        <div className="mt-2">
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            Délai respecté: -2 jours vs échéance
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-[#666666] flex-shrink-0">Il y a 10j</span>
                    </div>
                  </div>
                </div>

                {/* Création Commande */}
                <div className="flex items-start space-x-4 relative">
                  <div className="w-12 h-12 bg-[#B87333]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Plus className="w-6 h-6 text-[#B87333]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-[#191919]">Nouvelle commande créée - CMD-2024-0156</h4>
                        <p className="text-sm text-[#666666] mt-1">
                          Commande d'équipements bureautiques suite à la réunion commerciale du 28/08.
                          Validation workflow approuvée par Jean MAMBOU
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-[#666666]">
                          <span>Par: Marie Kouam</span>
                          <span>•</span>
                          <span>01/09/2024 à 16:30</span>
                          <span>•</span>
                          <span className="px-2 py-1 bg-[#B87333]/20 text-[#B87333] rounded">Commercial</span>
                        </div>
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                          <div className="grid grid-cols-2 gap-2 text-gray-600">
                            <div><span className="font-medium">Montant:</span> {formatCurrency(85000)}</div>
                            <div><span className="font-medium">Livraison:</span> 15/09/2024</div>
                            <div><span className="font-medium">Paiement:</span> 30 jours net</div>
                            <div><span className="font-medium">Statut:</span> Confirmée</div>
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-[#666666] flex-shrink-0">Il y a 2 sem</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bouton Charger Plus */}
              <div className="text-center mt-8">
                <button className="px-6 py-2 border border-[#6A8A82] text-[#6A8A82] rounded-lg hover:bg-[#6A8A82]/10 transition-colors">
                  Charger plus d'activités
                </button>
              </div>
            </div>
          </div>

          {/* Notes et Observations */}
          <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
            <h3 className="text-lg font-semibold text-[#191919] mb-4">Notes Internes</h3>
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-yellow-800">Note Commerciale</h4>
                  <span className="text-xs text-yellow-600">12/09/2024</span>
                </div>
                <p className="text-sm text-yellow-700">
                  Client très satisfait de nos services. Intéressé par l'extension ERP complète
                  pour Q1 2025. À recontacter début décembre pour présentation détaillée.
                </p>
                <p className="text-xs text-yellow-600 mt-2">Par: Marie Kouam</p>
              </div>

              <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-blue-800">Note Comptable</h4>
                  <span className="text-xs text-blue-600">08/09/2024</span>
                </div>
                <p className="text-sm text-blue-700">
                  Excellent payeur, toujours dans les délais. Possibilité d'augmenter la limite
                  de crédit à 750k FCFA pour accompagner la croissance prévue.
                </p>
                <p className="text-xs text-blue-600 mt-2">Par: Paul Mbeki</p>
              </div>

              {/* Ajouter une note */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <button className="w-full flex items-center justify-center space-x-2 text-[#666666] hover:text-[#6A8A82] transition-colors">
                  <Plus className="w-5 h-5" />
                  <span className="text-sm font-medium">Ajouter une note interne</span>
                </button>
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

export default ClientDetailView;