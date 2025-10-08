import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';
import {
  Target, BarChart3, TrendingUp, DollarSign, Calendar, ArrowLeft,
  Home, Plus, Download, RefreshCw, CheckCircle, AlertTriangle,
  Eye, Edit, PieChart, Activity, Users, Building2, Search,
  ChevronDown, ChevronRight, Save, Upload, FileDown,
  TrendingDown, Clock, Bell, Calculator, Filter, Trash2, Minus
} from 'lucide-react';

const CompleteBudgetingModule: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('synthese');
  const [analyseSubTab, setAnalyseSubTab] = useState('ecarts');
  const [selectedAnalysisModel, setSelectedAnalysisModel] = useState('budget-vs-actual-complete');

  // Détection automatique de l'onglet selon l'URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['synthese', 'planification', 'creation', 'overview', 'analyse', 'budgets', 'suivi', 'previsions', 'alertes', 'rapports'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // États pour la saisie budgétaire
  const [selectedDepartment, setSelectedDepartment] = useState('COMMERCIAL');
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedMonth, setSelectedMonth] = useState('JANVIER');
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({});
  const [budgetData, setBudgetData] = useState<Record<string, any>>({});

  // États pour les sessions budgétaires
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [planificationTab, setPlanificationTab] = useState('sessions');
  const [overviewTab, setOverviewTab] = useState('dashboard');
  const [overallView, setOverallView] = useState<'annual' | 'monthly'>('annual');
  const [selectedOverallMonth, setSelectedOverallMonth] = useState('janvier');
  const [sessions, setSessions] = useState([
    {
      id: 1,
      year: '2025',
      department: 'Finance & Comptabilité',
      period: 'Annuel',
      startDate: '01/01/2025',
      endDate: '31/12/2025',
      status: 'active',
      createdBy: 'Admin',
      createdDate: '15/12/2024',
      progress: 15
    },
    {
      id: 2,
      year: '2025',
      department: 'Facturation',
      period: 'Q1',
      startDate: '01/01/2025',
      endDate: '31/03/2025',
      status: 'active',
      createdBy: 'Manager',
      createdDate: '20/12/2024',
      progress: 25
    },
    {
      id: 3,
      year: '2024',
      department: 'Finance & Comptabilité',
      period: 'Annuel',
      startDate: '01/01/2024',
      endDate: '31/12/2024',
      status: 'closed',
      createdBy: 'Admin',
      createdDate: '15/12/2023',
      progress: 100
    }
  ]);
  const [newSession, setNewSession] = useState({
    year: '',
    department: '',
    period: '',
    startDate: '',
    endDate: ''
  });

  // États pour le modal de sélection de période
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Données des départements pour le budget
  const departmentBudgets = [
    { name: 'Facturation', budget: 0, actual: 0, variance: 0, variancePct: 0 },
    { name: 'General Admin', budget: 350000000, actual: 291587212, variance: 58412788, variancePct: 16.7 },
    { name: 'Finance & Comptabilité', budget: 2000000000, actual: 1808263133, variance: 191736867, variancePct: 9.6 },
    { name: 'Marketing', budget: 150000000, actual: 101225000, variance: 48775000, variancePct: 32.5 },
    { name: 'Commercial', budget: 3200000000, actual: 3459621124, variance: -259621124, variancePct: -8.1 },
    { name: 'Facility Management', budget: 250000000, actual: 206860000, variance: 43140000, variancePct: 17.3 },
    { name: 'Security Management', budget: 0, actual: 0, variance: 0, variancePct: 0 },
    { name: 'Ressources Humaines', budget: 400000000, actual: 349834692, variance: 50165308, variancePct: 12.5 }
  ];

  // État pour gérer l'expansion des départements
  const [expandedDepartments, setExpandedDepartments] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('annual');

  const toggleDepartment = (deptName: string) => {
    setExpandedDepartments(prev =>
      prev.includes(deptName)
        ? prev.filter(d => d !== deptName)
        : [...prev, deptName]
    );
  };

  const toggleAccount = (accountKey: string) => {
    setExpandedAccounts(prev => ({
      ...prev,
      [accountKey]: !prev[accountKey]
    }));
  };

  // Fonction pour obtenir les comptes d'un département
  const getDepartmentAccounts = (deptName: string) => {
    const accountsData: Record<string, any[]> = {
      'Finance & Comptabilité': [
        {
          code: '601',
          label: 'Achats de marchandises',
          budget: 500000000,
          actual: 450000000,
          variance: 50000000,
          transactions: [
            { date: '2025-01-05', description: 'Achat fournitures bureau', amount: 2500000, status: 'Validé' },
            { date: '2025-01-12', description: 'Achat matériel informatique', amount: 15000000, status: 'Validé' },
            { date: '2025-01-18', description: 'Achat mobilier', amount: 8000000, status: 'En cours' }
          ]
        },
        {
          code: '602',
          label: 'Services extérieurs',
          budget: 300000000,
          actual: 280000000,
          variance: 20000000,
          transactions: [
            { date: '2025-01-03', description: 'Honoraires consultant', amount: 5000000, status: 'Validé' },
            { date: '2025-01-15', description: 'Frais de formation', amount: 3000000, status: 'Validé' }
          ]
        },
        {
          code: '641',
          label: 'Salaires et traitements',
          budget: 1200000000,
          actual: 1078263133,
          variance: 121736867,
          transactions: [
            { date: '2025-01-31', description: 'Salaires janvier 2025', amount: 89855261, status: 'Validé' }
          ]
        }
      ],
      'Ressources Humaines': [
        {
          code: '641',
          label: 'Salaires et traitements',
          budget: 250000000,
          actual: 220000000,
          variance: 30000000,
          transactions: [
            { date: '2025-01-31', description: 'Salaires RH janvier', amount: 18333333, status: 'Validé' }
          ]
        },
        {
          code: '645',
          label: 'Charges sociales',
          budget: 100000000,
          actual: 88000000,
          variance: 12000000,
          transactions: [
            { date: '2025-01-31', description: 'Cotisations sociales janvier', amount: 7333333, status: 'Validé' }
          ]
        },
        {
          code: '633',
          label: 'Formation professionnelle',
          budget: 50000000,
          actual: 41834692,
          variance: 8165308,
          transactions: [
            { date: '2025-01-20', description: 'Formation leadership', amount: 3486224, status: 'Validé' }
          ]
        }
      ],
      'Marketing': [
        {
          code: '623',
          label: 'Publicité et marketing',
          budget: 100000000,
          actual: 67000000,
          variance: 33000000,
          transactions: [
            { date: '2025-01-10', description: 'Campagne digitale Q1', amount: 22333333, status: 'Validé' },
            { date: '2025-01-25', description: 'Événement client', amount: 15000000, status: 'En cours' }
          ]
        },
        {
          code: '624',
          label: 'Relations publiques',
          budget: 50000000,
          actual: 34225000,
          variance: 15775000,
          transactions: [
            { date: '2025-01-15', description: 'Agence RP mensuelle', amount: 2851875, status: 'Validé' }
          ]
        }
      ],
      'Commercial': [
        {
          code: '701',
          label: 'Ventes de marchandises',
          budget: 3200000000,
          actual: 3459621124,
          variance: -259621124,
          transactions: [
            { date: '2025-01-02', description: 'Vente Client A', amount: 150000000, status: 'Validé' },
            { date: '2025-01-08', description: 'Vente Client B', amount: 200000000, status: 'Validé' },
            { date: '2025-01-15', description: 'Vente Client C', amount: 180000000, status: 'Validé' },
            { date: '2025-01-22', description: 'Vente Client D', amount: 250000000, status: 'Validé' }
          ]
        }
      ],
      'General Admin': [
        {
          code: '613',
          label: 'Loyers et charges locatives',
          budget: 150000000,
          actual: 150000000,
          variance: 0,
          transactions: [
            { date: '2025-01-01', description: 'Loyer janvier 2025', amount: 12500000, status: 'Validé' }
          ]
        },
        {
          code: '616',
          label: 'Assurances',
          budget: 50000000,
          actual: 45000000,
          variance: 5000000,
          transactions: [
            { date: '2025-01-15', description: 'Prime assurance Q1', amount: 15000000, status: 'Validé' }
          ]
        },
        {
          code: '625',
          label: 'Déplacements et missions',
          budget: 150000000,
          actual: 96587212,
          variance: 53412788,
          transactions: [
            { date: '2025-01-05', description: 'Mission Paris', amount: 5000000, status: 'Validé' },
            { date: '2025-01-18', description: 'Mission Dakar', amount: 3000000, status: 'En cours' }
          ]
        }
      ],
      'Facility Management': [
        {
          code: '615',
          label: 'Entretien et réparations',
          budget: 150000000,
          actual: 120000000,
          variance: 30000000,
          transactions: [
            { date: '2025-01-10', description: 'Maintenance climatisation', amount: 5000000, status: 'Validé' },
            { date: '2025-01-20', description: 'Réparation plomberie', amount: 2000000, status: 'Validé' }
          ]
        },
        {
          code: '606',
          label: 'Fournitures non stockables',
          budget: 100000000,
          actual: 86860000,
          variance: 13140000,
          transactions: [
            { date: '2025-01-05', description: 'Produits entretien', amount: 1500000, status: 'Validé' },
            { date: '2025-01-15', description: 'Fournitures bureau', amount: 2000000, status: 'Validé' }
          ]
        }
      ]
    };

    return accountsData[deptName] || [];
  };

  const formatAmount = (amount: number) => {
    return (amount || 0).toLocaleString('fr-FR');
  };

  // Onglets budget
  const tabs = [
    { id: 'synthese', label: 'Synthèse', icon: BarChart3 },
    { id: 'planification', label: 'Planification Budget', icon: Calendar },
    { id: 'creation', label: 'Budget Creation', icon: Plus },
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'analyse', label: 'Analyse Variation', icon: Activity },
    { id: 'budgets', label: 'Budgets', icon: Target },
    { id: 'suivi', label: 'Suivi Réel/Budget', icon: TrendingUp },
    { id: 'previsions', label: 'Prévisions', icon: DollarSign },
    { id: 'alertes', label: 'Alertes', icon: AlertTriangle },
    { id: 'rapports', label: 'Rapports', icon: PieChart },
  ];

  // Données mock pour les comptes comptables
  const comptes = [
    {
      code: '601000',
      libelle: 'Achats de marchandises',
      sousComptes: [
        { code: '601100', libelle: 'Achats France', budget: 301000, reel: 285000, nMoins1: 295000 },
        { code: '601200', libelle: 'Achats UE', budget: 173000, reel: 168000, nMoins1: 165000 },
        { code: '601300', libelle: 'Achats Hors UE', budget: 120000, reel: 95000, nMoins1: 110000 }
      ],
      budget: 594000,
      reel: 548000,
      nMoins1: 570000
    },
    {
      code: '602000',
      libelle: 'Services extérieurs',
      sousComptes: [
        { code: '602100', libelle: 'Loyers', budget: 180000, reel: 180000, nMoins1: 175000 },
        { code: '602600', libelle: 'Honoraires', budget: 95000, reel: 87000, nMoins1: 92000 }
      ],
      budget: 275000,
      reel: 267000,
      nMoins1: 267000
    },
    {
      code: '606000',
      libelle: 'Autres charges externes',
      sousComptes: [
        { code: '606100', libelle: 'Carburants', budget: 45000, reel: 42000, nMoins1: 39000 },
        { code: '606200', libelle: 'Télécommunications', budget: 25000, reel: 23000, nMoins1: 24000 }
      ],
      budget: 70000,
      reel: 65000,
      nMoins1: 63000
    }
  ];

  // Données pour les alertes
  const alertes = [
    {
      id: 1,
      type: 'DEPASSEMENT',
      compte: '601200',
      libelle: 'Achats UE - Dépassement prévu',
      departement: 'COMMERCIAL',
      ecart: 15.2,
      niveau: 'CRITIQUE',
      date: '2025-01-15'
    },
    {
      id: 2,
      type: 'SOUS_CONSOMMATION',
      compte: '601300',
      libelle: 'Achats Hors UE - Sous-consommation',
      departement: 'COMMERCIAL',
      ecart: -20.8,
      niveau: 'INFO',
      date: '2025-01-14'
    },
    {
      id: 3,
      type: 'TENDANCE',
      compte: '606100',
      libelle: 'Carburants - Tendance haussière',
      departement: 'LOGISTIQUE',
      ecart: 8.5,
      niveau: 'ATTENTION',
      date: '2025-01-13'
    }
  ];

  // Départements disponibles
  const departements = ['COMMERCIAL', 'PRODUCTION', 'ADMINISTRATION', 'R&D', 'LOGISTIQUE'];

  // Mois de l'année
  const mois = ['JANVIER', 'FEVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN',
                'JUILLET', 'AOUT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DECEMBRE'];

  // Fonctions utilitaires
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getVarianceColor = (variance: number) => {
    if (Math.abs(variance) <= 5) return 'text-green-600';
    if (Math.abs(variance) <= 10) return 'text-orange-600';
    return 'text-red-600';
  };

  const toggleAccountExpansion = (accountCode: string) => {
    setExpandedAccounts(prev => ({
      ...prev,
      [accountCode]: !prev[accountCode]
    }));
  };

  return (
    <div className="p-6 bg-[#ECECEC] min-h-screen font-['Sometype Mono']">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/dashboard/manager')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#444444]" />
              <span className="text-sm font-semibold text-[#444444]">Manager</span>
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#B87333] to-[#A86323] flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#191919]">Contrôle Budgétaire</h1>
                <p className="text-sm text-[#767676]">Gestion des budgets et prévisions</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={() => navigate('/executive')}
              className="px-4 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323] transition-colors flex items-center space-x-2"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm">Executive</span>
            </button>
            
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm">
        <div className="px-6 border-b border-[#E8E8E8]">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    navigate(`/budgeting/budgets?tab=${tab.id}`);
                  }}
                  className={`
                    flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === tab.id 
                      ? 'border-[#B87333] text-[#B87333]' 
                      : 'border-transparent text-[#767676] hover:text-[#444444]'
                    }
                  `}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Contenu organisé */}
        <div className="p-6">
          {/* Onglet Synthèse */}
          {activeTab === 'synthese' && (
            <div className="space-y-6">
              {/* KPIs Budget */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { title: 'Budget Total 2025', value: '3.2M€', color: '#B87333', icon: Target },
                  { title: 'Consommé', value: '2.1M€', color: '#6A8A82', icon: TrendingUp },
                  { title: 'Restant', value: '1.1M€', color: '#7A99AC', icon: DollarSign },
                  { title: 'Performance', value: '94%', color: '#6A8A82', icon: Activity }
                ].map((kpi, index) => {
                  const IconComponent = kpi.icon;
                  return (
                    <div key={index} className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                      <div className="flex items-center justify-between mb-2">
                        <IconComponent className="w-5 h-5" style={{color: kpi.color}} />
                      </div>
                      <h3 className="text-xl font-bold text-[#191919] mb-1">{kpi.value}</h3>
                      <p className="text-sm text-[#444444]">{kpi.title}</p>
                    </div>
                  );
                })}
              </div>

              {/* Budgets par département */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919] mb-4">📊 Budgets par Département</h3>
                  <div className="space-y-3">
                    {[
                      { dept: 'Commercial', budget: 800000, consomme: 645000, pourcentage: 81 },
                      { dept: 'Production', budget: 950000, consomme: 892000, pourcentage: 94 },
                      { dept: 'Administration', budget: 450000, consomme: 267000, pourcentage: 59 },
                      { dept: 'R&D', budget: 320000, consomme: 298000, pourcentage: 93 }
                    ].map((dept, index) => (
                      <div key={index} className="p-3 rounded-lg bg-gray-50">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-[#191919]">{dept.dept}</span>
                          <span className="text-sm text-[#767676]">{dept.pourcentage}%</span>
                        </div>
                        <div className="flex justify-between text-xs mb-2">
                          <span className="text-[#444444]">Consommé: {(dept.consomme / 1000).toFixed(0)}K€</span>
                          <span className="text-[#444444]">Budget: {(dept.budget / 1000).toFixed(0)}K€</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              dept.pourcentage > 90 ? 'bg-red-500' :
                              dept.pourcentage > 75 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{width: `${dept.pourcentage}%`}}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919] mb-4">🎯 Alertes Budgétaires</h3>
                  <div className="space-y-2">
                    {[
                      { alerte: 'Production proche du seuil', dept: 'Production', niveau: 'attention' },
                      { alerte: 'R&D dépassement prévu', dept: 'R&D', niveau: 'critique' },
                      { alerte: 'Commercial sous-consommé', dept: 'Commercial', niveau: 'info' }
                    ].map((alerte, index) => (
                      <div key={index} className={`p-3 rounded-lg border-l-4 ${
                        alerte.niveau === 'critique' ? 'bg-red-50 border-red-400' :
                        alerte.niveau === 'attention' ? 'bg-yellow-50 border-yellow-400' :
                        'bg-blue-50 border-blue-400'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-[#191919]">{alerte.alerte}</p>
                            <p className="text-xs text-[#767676]">{alerte.dept}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            alerte.niveau === 'critique' ? 'bg-red-100 text-red-700' :
                            alerte.niveau === 'attention' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {alerte.niveau}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Onglet Planification Budget */}
          {activeTab === 'planification' && (
            <div className="space-y-6">
              {/* Sous-onglets pour la planification */}
              <div className="bg-white rounded-lg border border-[#E8E8E8]">
                <div className="flex border-b border-[#E8E8E8]">
                  <button
                    onClick={() => setPlanificationTab('timeline')}
                    className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                      planificationTab === 'timeline'
                        ? 'text-[#B87333] bg-orange-50'
                        : 'text-[#767676] hover:text-[#191919]'
                    }`}
                  >
                    📅 Timeline
                    {planificationTab === 'timeline' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#B87333]"></div>
                    )}
                  </button>
                  <button
                    onClick={() => setPlanificationTab('sessions')}
                    className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                      planificationTab === 'sessions'
                        ? 'text-[#B87333] bg-orange-50'
                        : 'text-[#767676] hover:text-[#191919]'
                    }`}
                  >
                    📋 Sessions Budgétaires
                    {planificationTab === 'sessions' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#B87333]"></div>
                    )}
                  </button>
                </div>

                {/* Contenu Timeline (existant) */}
                {planificationTab === 'timeline' && (
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-[#191919]">Timeline de Planification Budgétaire 2025</h3>
                      <div className="flex items-center space-x-3">
                        <button className="flex items-center space-x-2 px-3 py-2 border border-[#E8E8E8] rounded-lg hover:bg-gray-50">
                          <Calendar className="w-4 h-4" />
                          <span className="text-sm">Calendrier</span>
                        </button>
                        <button className="flex items-center space-x-2 px-3 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323]">
                          <Plus className="w-4 h-4" />
                          <span className="text-sm">Nouvelle étape</span>
                        </button>
                      </div>
                    </div>

                {/* Timeline */}
                <div className="relative">
                  <div className="absolute left-8 top-0 h-full w-0.5 bg-gray-200"></div>
                  {[
                    { date: '15 Septembre 2024', title: 'Lancement campagne budgétaire', status: 'completed', desc: 'Envoi des directives budgétaires aux départements' },
                    { date: '30 Septembre 2024', title: 'Collecte propositions', status: 'completed', desc: 'Réception des propositions budgétaires départementales' },
                    { date: '15 Octobre 2024', title: 'Consolidation', status: 'completed', desc: 'Consolidation et analyse des propositions' },
                    { date: '30 Octobre 2024', title: 'Arbitrage', status: 'in-progress', desc: 'Réunions d\'arbitrage avec la direction' },
                    { date: '15 Novembre 2024', title: 'Validation finale', status: 'pending', desc: 'Validation par le conseil d\'administration' },
                    { date: '1 Janvier 2025', title: 'Mise en application', status: 'pending', desc: 'Début de l\'exercice budgétaire 2025' }
                  ].map((milestone, index) => (
                    <div key={index} className="relative flex items-start mb-8">
                      <div className={`z-10 w-4 h-4 rounded-full border-2 ${
                        milestone.status === 'completed' ? 'bg-green-500 border-green-500' :
                        milestone.status === 'in-progress' ? 'bg-yellow-500 border-yellow-500' :
                        'bg-gray-300 border-gray-300'
                      }`}></div>
                      <div className="ml-8 flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-semibold text-[#191919]">{milestone.title}</h4>
                            <p className="text-xs text-[#767676] mt-1">{milestone.desc}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-[#444444]">{milestone.date}</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              milestone.status === 'completed' ? 'bg-green-100 text-green-700' :
                              milestone.status === 'in-progress' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {milestone.status === 'completed' ? 'Terminé' :
                               milestone.status === 'in-progress' ? 'En cours' : 'À venir'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Phases et responsables */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919] mb-4">📋 Phases du processus</h3>
                  <div className="space-y-3">
                    {[
                      { phase: 'Préparation', duration: '2 semaines', progress: 100 },
                      { phase: 'Collecte', duration: '3 semaines', progress: 100 },
                      { phase: 'Analyse', duration: '2 semaines', progress: 100 },
                      { phase: 'Arbitrage', duration: '2 semaines', progress: 45 },
                      { phase: 'Validation', duration: '1 semaine', progress: 0 }
                    ].map((phase, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-[#191919]">{phase.phase}</span>
                          <span className="text-xs text-[#767676]">{phase.duration}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-[#6A8A82] to-[#B87333]"
                            style={{width: `${phase.progress}%`}}
                          ></div>
                        </div>
                        <p className="text-xs text-[#444444] mt-1">{phase.progress}% complété</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919] mb-4">👥 Responsables par département</h3>
                  <div className="space-y-2">
                    {[
                      { dept: 'Commercial', responsable: 'Marie Dupont', status: 'Soumis', date: '28/09/2024' },
                      { dept: 'Production', responsable: 'Jean Martin', status: 'Soumis', date: '27/09/2024' },
                      { dept: 'Administration', responsable: 'Sophie Bernard', status: 'En cours', date: '-' },
                      { dept: 'R&D', responsable: 'Pierre Leroy', status: 'Soumis', date: '29/09/2024' },
                      { dept: 'Logistique', responsable: 'Claire Moreau', status: 'En retard', date: '-' }
                    ].map((dept, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <Users className="w-4 h-4 text-[#767676]" />
                          <div>
                            <p className="text-sm font-medium text-[#191919]">{dept.dept}</p>
                            <p className="text-xs text-[#767676]">{dept.responsable}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            dept.status === 'Soumis' ? 'bg-green-100 text-green-700' :
                            dept.status === 'En cours' ? 'bg-blue-100 text-blue-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {dept.status}
                          </span>
                          <p className="text-xs text-[#767676] mt-1">{dept.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
                  </div>
                )}

                {/* Contenu Sessions */}
                {planificationTab === 'sessions' && (
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-[#191919]">Sessions de Budget</h3>
                      <button
                        onClick={() => setShowSessionModal(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323]"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="text-sm">Nouvelle Session</span>
                      </button>
                    </div>

                    {/* Table des sessions */}
                    <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-[#E8E8E8]">
                          <tr>
                            <th className="text-left p-4 text-sm font-medium text-[#444444]">Année</th>
                            <th className="text-left p-4 text-sm font-medium text-[#444444]">Département</th>
                            <th className="text-left p-4 text-sm font-medium text-[#444444]">Période</th>
                            <th className="text-left p-4 text-sm font-medium text-[#444444]">Date Début</th>
                            <th className="text-left p-4 text-sm font-medium text-[#444444]">Date Fin</th>
                            <th className="text-left p-4 text-sm font-medium text-[#444444]">Statut</th>
                            <th className="text-left p-4 text-sm font-medium text-[#444444]">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {sessions.map(session => (
                            <tr key={session.id} className="hover:bg-gray-50">
                              <td className="p-4 text-sm text-[#191919]">{session.year}</td>
                              <td className="p-4 text-sm text-[#191919]">{session.department}</td>
                              <td className="p-4 text-sm text-[#191919]">{session.period}</td>
                              <td className="p-4 text-sm text-[#767676]">{session.startDate}</td>
                              <td className="p-4 text-sm text-[#767676]">{session.endDate}</td>
                              <td className="p-4">
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  session.status === 'active' ? 'bg-green-100 text-green-700' :
                                  session.status === 'closed' ? 'bg-gray-100 text-gray-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {session.status === 'active' ? 'Active' :
                                   session.status === 'closed' ? 'Fermée' : 'En attente'}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center space-x-2">
                                  <button className="p-1 text-[#767676] hover:text-[#B87333] transition-colors" aria-label="Voir les détails">
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button className="p-1 text-[#767676] hover:text-blue-600 transition-colors">
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button className="p-1 text-[#767676] hover:text-red-600 transition-colors" aria-label="Supprimer">
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
                )}
              </div>
            </div>
          )}

          {/* Modal de création de session */}
          {showSessionModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <h3 className="text-lg font-semibold text-[#191919] mb-4">Création de Session</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Année</label>
                    <input
                      type="text"
                      value={newSession.year}
                      onChange={(e) => setNewSession({...newSession, year: e.target.value})}
                      placeholder="2025"
                      className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#B87333] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Département</label>
                    <select
                      value={newSession.department}
                      onChange={(e) => setNewSession({...newSession, department: e.target.value})}
                      className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#B87333] focus:border-transparent"
                    >
                      <option value="">Sélectionner un département</option>
                      <option value="Facturation">Facturation</option>
                      <option value="Finance & Comptabilité">Finance & Comptabilité</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Période</label>
                    <input
                      type="text"
                      value={newSession.period}
                      onChange={(e) => setNewSession({...newSession, period: e.target.value})}
                      placeholder="Q1, Q2, Annuel, etc."
                      className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#B87333] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Période</label>
                    <button
                      type="button"
                      onClick={() => setShowPeriodModal(true)}
                      className="w-full flex items-center justify-center space-x-2 px-3 py-2 border border-[#E8E8E8] rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-[#B87333] focus:border-transparent"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>
                        {newSession.startDate && newSession.endDate
                          ? `Du ${newSession.startDate} au ${newSession.endDate}`
                          : 'Sélectionner une période'
                        }
                      </span>
                    </button>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowSessionModal(false)}
                    className="px-4 py-2 border border-[#E8E8E8] rounded-lg text-[#767676] hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      const session = {
                        id: sessions.length + 1,
                        ...newSession,
                        status: 'pending' as const
                      };
                      setSessions([...sessions, session]);
                      setShowSessionModal(false);
                      setNewSession({ year: '', department: '', period: '', startDate: '', endDate: '' });
                    }}
                    className="px-4 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323]"
                  >
                    Créer Session
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Onglet Budget Creation */}
          {activeTab === 'creation' && (
            <div className="space-y-6">
              {/* Header avec année et session */}
              <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-[#191919]">Budget Creation</h2>
                    <p className="text-3xl font-bold text-[#B87333] mt-2">2025</p>
                  </div>
                  <div className="text-sm text-[#767676] bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                    <span className="font-medium">Session valide du 01/09/2024 au 20/12/2024</span>
                  </div>
                </div>
              </div>

              {/* Tableau des départements */}
              <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919]">Vue des données budgétaires</h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b border-[#E8E8E8]">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium text-[#444444]">Département</th>
                        <th className="text-left p-3 text-sm font-medium text-[#444444]">Status</th>
                        <th className="text-right p-3 text-sm font-medium text-[#444444]">Montant</th>
                        <th className="text-center p-3 text-sm font-medium text-[#444444]">Modified</th>
                        <th className="text-left p-3 text-sm font-medium text-[#444444]">Budgetholder</th>
                        <th className="text-center p-3 text-sm font-medium text-[#444444]">#L.Bud</th>
                        <th className="text-center p-3 text-sm font-medium text-[#444444]">Version</th>
                        <th className="text-center p-3 text-sm font-medium text-[#444444]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {departmentBudgets.map((dept, index) => (
                        <React.Fragment key={dept.name}>
                          {/* Ligne département */}
                          <tr className="font-medium bg-gray-50">
                            <td className="p-3 text-sm text-[#191919]">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => toggleDepartment(dept.name)}
                                  className="p-1 hover:bg-gray-200 rounded transition-transform duration-200"
                                  style={{
                                    transform: expandedDepartments.includes(dept.name) ? 'rotate(90deg)' : 'rotate(0deg)'
                                  }}
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                                <span>{dept.name}</span>
                              </div>
                            </td>
                            <td className="p-3 text-sm text-[#767676]">-</td>
                            <td className="p-3 text-sm text-right text-[#191919] font-bold">
                              {formatAmount(dept.total)}
                            </td>
                            <td className="p-3 text-sm text-center text-[#767676]">-</td>
                            <td className="p-3 text-sm text-[#767676]">-</td>
                            <td className="p-3 text-sm text-center text-[#767676]">-</td>
                            <td className="p-3 text-sm text-center text-[#767676]">1.0.0.1</td>
                            <td className="p-3 text-sm text-center">
                              <button
                                className="p-1 text-[#B87333] hover:text-[#A86323] transition-colors"
                                title="Ajouter une ligne budgétaire" aria-label="Ajouter">
                                <Plus className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>

                          {/* Lignes Revenue et Dépense (visibles si département expandé) */}
                          {expandedDepartments.includes(dept.name) && (
                            <>
                              <tr className="hover:bg-gray-50">
                                <td className="p-3 pl-12 text-sm text-[#767676]">Revenue</td>
                                <td className="p-3 text-sm text-[#767676]">-</td>
                                <td className="p-3 text-sm text-right text-green-600 font-medium">
                                  {formatAmount(dept.revenue)}
                                </td>
                                <td className="p-3 text-sm text-center text-[#767676]">-</td>
                                <td className="p-3 text-sm text-[#767676]">-</td>
                                <td className="p-3 text-sm text-center text-[#767676]">-</td>
                                <td className="p-3 text-sm text-center text-[#767676]">1.0.0.1</td>
                                <td className="p-3 text-sm text-center">
                                  <button
                                    onClick={() => navigate(`/budgeting/recap?department=${encodeURIComponent(dept.name)}&type=revenue`)}
                                    className="p-1 text-[#767676] hover:text-[#B87333] transition-colors"
                                    title="Voir détails des revenus"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                              <tr className="hover:bg-gray-50">
                                <td className="p-3 pl-12 text-sm text-[#767676]">Dépense</td>
                                <td className="p-3 text-sm text-[#767676]">-</td>
                                <td className="p-3 text-sm text-right text-red-600 font-medium">
                                  {formatAmount(dept.expense)}
                                </td>
                                <td className="p-3 text-sm text-center text-[#767676]">-</td>
                                <td className="p-3 text-sm text-[#767676]">-</td>
                                <td className="p-3 text-sm text-center text-[#767676]">-</td>
                                <td className="p-3 text-sm text-center text-[#767676]">1.0.0.1</td>
                                <td className="p-3 text-sm text-center">
                                  <button
                                    onClick={() => navigate(`/budgeting/recap?department=${encodeURIComponent(dept.name)}&type=expense`)}
                                    className="p-1 text-[#767676] hover:text-[#B87333] transition-colors"
                                    title="Voir détails des dépenses"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            </>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Onglet Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Sous-onglets */}
              <div className="flex space-x-4 border-b border-[#E8E8E8]">
                <button
                  onClick={() => setOverviewTab('dashboard')}
                  className={`pb-2 px-1 text-sm font-medium transition-colors ${
                    overviewTab === 'dashboard'
                      ? 'text-[#B87333] border-b-2 border-[#B87333]'
                      : 'text-[#767676] hover:text-[#191919]'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setOverviewTab('overall')}
                  className={`pb-2 px-1 text-sm font-medium transition-colors ${
                    overviewTab === 'overall'
                      ? 'text-[#B87333] border-b-2 border-[#B87333]'
                      : 'text-[#767676] hover:text-[#191919]'
                  }`}
                >
                  Overall Budget
                </button>
              </div>

              {/* Contenu Dashboard */}
              {overviewTab === 'dashboard' && (
                <>
                  {/* KPIs globaux */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[
                  { title: 'Budget Total', value: '12.5M€', trend: '+5%', color: '#B87333' },
                  { title: 'Consommé YTD', value: '7.8M€', trend: '62%', color: '#6A8A82' },
                  { title: 'Restant', value: '4.7M€', trend: '38%', color: '#7A99AC' },
                  { title: 'Projection fin année', value: '12.2M€', trend: '-2.4%', color: '#A86323' },
                  { title: 'Performance', value: '97.6%', trend: '+1.2%', color: '#5A7A72' }
                ].map((kpi, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                    <p className="text-xs text-[#767676] mb-2">{kpi.title}</p>
                    <h3 className="text-xl font-bold mb-1" style={{color: kpi.color}}>{kpi.value}</h3>
                    <span className={`text-xs ${kpi.trend.includes('+') ? 'text-green-600' : kpi.trend.includes('-') ? 'text-red-600' : 'text-[#444444]'}`}>
                      {kpi.trend}
                    </span>
                  </div>
                ))}
              </div>

              {/* Vue d'ensemble par catégorie */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919] mb-4">💰 Répartition par catégorie</h3>
                  <div className="space-y-3">
                    {[
                      { category: 'Charges de personnel', budget: 5200000, consomme: 3224000, pct: 62 },
                      { category: 'Services externes', budget: 2800000, consomme: 1960000, pct: 70 },
                      { category: 'Achats marchandises', budget: 2100000, consomme: 1470000, pct: 70 },
                      { category: 'Investissements', budget: 1500000, consomme: 600000, pct: 40 },
                      { category: 'Marketing & Com', budget: 900000, consomme: 546000, pct: 61 }
                    ].map((cat, index) => (
                      <div key={index}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-[#191919]">{cat.category}</span>
                          <span className="text-sm text-[#767676]">{cat.pct}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                          <div
                            className={`h-2 rounded-full ${
                              cat.pct > 80 ? 'bg-red-500' : cat.pct > 60 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{width: `${cat.pct}%`}}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-[#444444]">
                          <span>{(cat.consomme / 1000000).toFixed(1)}M€ / {(cat.budget / 1000000).toFixed(1)}M€</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919] mb-4">📈 Évolution mensuelle</h3>
                  <div className="space-y-2">
                    {[
                      { mois: 'Janvier', prevu: 1040000, reel: 980000, ecart: -5.8 },
                      { mois: 'Février', prevu: 1040000, reel: 1120000, ecart: 7.7 },
                      { mois: 'Mars', prevu: 1040000, reel: 1050000, ecart: 1.0 },
                      { mois: 'Avril', prevu: 1040000, reel: 1100000, ecart: 5.8 },
                      { mois: 'Mai', prevu: 1040000, reel: 1080000, ecart: 3.8 },
                      { mois: 'Juin', prevu: 1040000, reel: 1090000, ecart: 4.8 },
                      { mois: 'Juillet', prevu: 1040000, reel: 1060000, ecart: 1.9 },
                      { mois: 'Août', prevu: 1040000, reel: 1020000, ecart: -1.9 },
                      { mois: 'Septembre', prevu: 1040000, reel: 1200000, ecart: 15.4 }
                    ].map((month, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                        <span className="text-sm font-medium text-[#191919] w-24">{month.mois}</span>
                        <div className="flex items-center space-x-4 flex-1">
                          <span className="text-xs text-[#444444]">{(month.prevu / 1000).toFixed(0)}K€</span>
                          <div className="flex-1 flex items-center space-x-2">
                            <div className="flex-1 h-2 bg-gray-200 rounded-full">
                              <div className="h-2 bg-blue-500 rounded-full" style={{width: '50%'}}></div>
                            </div>
                            <div className="flex-1 h-2 bg-gray-200 rounded-full">
                              <div className="h-2 bg-green-500 rounded-full" style={{width: `${50 + month.ecart}%`}}></div>
                            </div>
                          </div>
                          <span className="text-xs text-[#444444]">{(month.reel / 1000).toFixed(0)}K€</span>
                        </div>
                        <span className={`text-xs font-medium ml-4 ${
                          month.ecart > 5 ? 'text-red-600' : month.ecart < -5 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {month.ecart > 0 ? '+' : ''}{month.ecart.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top dépenses */}
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <h3 className="font-semibold text-[#191919] mb-4">🏆 Top 10 des postes de dépenses</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-[#444444]">#</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-[#444444]">Poste</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-[#444444]">Département</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-[#444444]">{t('navigation.budget')}</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-[#444444]">Consommé</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-[#444444]">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E8E8]">
                      {[
                        { poste: 'Salaires et traitements', dept: 'RH', budget: 3200000, consomme: 1984000 },
                        { poste: 'Achats matières premières', dept: 'Production', budget: 1800000, consomme: 1260000 },
                        { poste: 'Loyers et charges', dept: 'Admin', budget: 600000, consomme: 450000 },
                        { poste: 'Marketing digital', dept: 'Marketing', budget: 450000, consomme: 315000 },
                        { poste: 'Services informatiques', dept: 'IT', budget: 380000, consomme: 285000 },
                        { poste: 'Formation personnel', dept: 'RH', budget: 250000, consomme: 125000 },
                        { poste: 'Frais de déplacement', dept: 'Commercial', budget: 220000, consomme: 176000 },
                        { poste: 'Assurances', dept: 'Admin', budget: 180000, consomme: 135000 },
                        { poste: 'Publicité', dept: 'Marketing', budget: 150000, consomme: 97500 },
                        { poste: 'Fournitures bureau', dept: 'Admin', budget: 120000, consomme: 72000 }
                      ].map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-[#444444]">{index + 1}</td>
                          <td className="px-4 py-2 text-sm text-[#191919]">{item.poste}</td>
                          <td className="px-4 py-2 text-sm text-[#767676]">{item.dept}</td>
                          <td className="px-4 py-2 text-sm text-right text-[#444444]">{(item.budget / 1000).toFixed(0)}K€</td>
                          <td className="px-4 py-2 text-sm text-right text-[#444444]">{(item.consomme / 1000).toFixed(0)}K€</td>
                          <td className="px-4 py-2 text-sm text-right">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              (item.consomme / item.budget * 100) > 80 ? 'bg-red-100 text-red-700' :
                              (item.consomme / item.budget * 100) > 60 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {(item.consomme / item.budget * 100).toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
                </>
              )}

              {/* Contenu Overall Budget */}
              {overviewTab === 'overall' && (
                <div className="space-y-6">
                  {/* Sélecteur de vue */}
                  <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <h3 className="font-semibold text-[#191919]">Budget Global 2025</h3>
                        <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                          <button
                            onClick={() => setOverallView('annual')}
                            className={`px-3 py-1 text-sm rounded ${
                              overallView === 'annual'
                                ? 'bg-white text-[#B87333] font-medium shadow-sm'
                                : 'text-[#767676] hover:text-[#191919]'
                            }`}
                          >
                            Vue Annuelle
                          </button>
                          <button
                            onClick={() => setOverallView('monthly')}
                            className={`px-3 py-1 text-sm rounded ${
                              overallView === 'monthly'
                                ? 'bg-white text-[#B87333] font-medium shadow-sm'
                                : 'text-[#767676] hover:text-[#191919]'
                            }`}
                          >
                            Vue Mensuelle
                          </button>
                        </div>
                      </div>

                      {/* Sélecteur de mois pour la vue mensuelle */}
                      {overallView === 'monthly' && (
                        <div className="flex items-center space-x-2">
                          <label className="text-sm text-[#767676]">Mois :</label>
                          <select
                            value={selectedOverallMonth}
                            onChange={(e) => setSelectedOverallMonth(e.target.value)}
                            className="px-3 py-1 border border-[#E8E8E8] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#B87333]"
                          >
                            {['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'].map(month => (
                              <option key={month} value={month}>{month.charAt(0).toUpperCase() + month.slice(1)}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Vue annuelle */}
                  {overallView === 'annual' && (
                    <>
                      {/* Vue globale du budget */}
                      <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">

                    {/* Résumé global */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-[#F5F5F5] rounded-lg p-4">
                        <p className="text-xs text-[#767676] mb-1">Total Revenus</p>
                        <p className="text-2xl font-bold text-green-600">3,459,621,124 FCFA</p>
                        <p className="text-xs text-[#444444] mt-1">+12% vs 2024</p>
                      </div>
                      <div className="bg-[#F5F5F5] rounded-lg p-4">
                        <p className="text-xs text-[#767676] mb-1">Total Dépenses</p>
                        <p className="text-2xl font-bold text-red-600">2,757,770,037 FCFA</p>
                        <p className="text-xs text-[#444444] mt-1">+8% vs 2024</p>
                      </div>
                      <div className="bg-[#F5F5F5] rounded-lg p-4">
                        <p className="text-xs text-[#767676] mb-1">Résultat Net</p>
                        <p className="text-2xl font-bold text-[#B87333]">701,851,087 FCFA</p>
                        <p className="text-xs text-[#444444] mt-1">+25% vs 2024</p>
                      </div>
                      <div className="bg-[#F5F5F5] rounded-lg p-4">
                        <p className="text-xs text-[#767676] mb-1">Marge</p>
                        <p className="text-2xl font-bold text-blue-600">20.3%</p>
                        <p className="text-xs text-[#444444] mt-1">+2.1 pts vs 2024</p>
                      </div>
                    </div>

                    {/* Sélecteur de période */}
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="font-medium text-[#191919]">Tableau détaillé par département</h4>
                      <div className="flex items-center space-x-4">
                        <select
                          value={selectedPeriod}
                          onChange={(e) => setSelectedPeriod(e.target.value)}
                          className="px-3 py-2 border border-[#E8E8E8] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#B87333]"
                        >
                          <option value="annual">Annuel 2025</option>
                          <option value="q1">Q1 2025</option>
                          <option value="q2">Q2 2025</option>
                          <option value="q3">Q3 2025</option>
                          <option value="q4">Q4 2025</option>
                          <option value="jan">Janvier 2025</option>
                          <option value="feb">Février 2025</option>
                          <option value="mar">Mars 2025</option>
                          <option value="apr">Avril 2025</option>
                          <option value="may">Mai 2025</option>
                          <option value="jun">Juin 2025</option>
                          <option value="jul">Juillet 2025</option>
                          <option value="aug">Août 2025</option>
                          <option value="sep">Septembre 2025</option>
                          <option value="oct">Octobre 2025</option>
                          <option value="nov">Novembre 2025</option>
                          <option value="dec">Décembre 2025</option>
                        </select>
                      </div>
                    </div>

                    {/* Tableau détaillé par département */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-[#444444]">Département</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-[#444444]">{t('navigation.budget')}</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-[#444444]">Actual</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-[#444444]">Variance</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-[#444444]">%</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-[#444444]">Statut</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8E8E8]">
                          {departmentBudgets.map((dept, index) => (
                            <React.Fragment key={index}>
                              <tr className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-[#191919]">
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={() => toggleDepartment(dept.name)}
                                      className="p-1 hover:bg-gray-200 rounded transition-transform duration-200"
                                      style={{
                                        transform: expandedDepartments.includes(dept.name) ? 'rotate(90deg)' : 'rotate(0deg)'
                                      }}
                                    >
                                      <ChevronRight className="w-4 h-4" />
                                    </button>
                                    <span>{dept.name}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-right text-[#444444]">
                                  {dept.budget > 0 ? formatAmount(dept.budget) : '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-right text-[#191919]">
                                  {dept.actual > 0 ? formatAmount(dept.actual) : '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-right font-medium">
                                  <span className={dept.variance >= 0 ? 'text-green-600' : 'text-red-600'}>
                                    {dept.variance !== 0 ? (dept.variance > 0 ? '+' : '') + formatAmount(dept.variance) : '-'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-right">
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    dept.variance > 0 ? 'bg-green-100 text-green-700' :
                                    dept.variance < 0 ? 'bg-red-100 text-red-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {dept.variancePct !== 0 ? (dept.variancePct > 0 ? '+' : '') + dept.variancePct + '%' : '-'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    dept.variance > 0 ? 'bg-green-100 text-green-700' :
                                    dept.variance < 0 ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {dept.variance > 0 ? 'Sous budget' : dept.variance < 0 ? 'Sur budget' : 'À l\'équilibre'}
                                  </span>
                                </td>
                              </tr>

                              {/* Détails des comptes si département étendu */}
                              {expandedDepartments.includes(dept.name) && getDepartmentAccounts(dept.name).map((account, accIdx) => (
                                <React.Fragment key={`${dept.name}-${accIdx}`}>
                                  <tr className="bg-gray-50">
                                    <td className="px-4 py-2 pl-12 text-sm text-[#444444]">
                                      <div className="flex items-center space-x-2">
                                        <button
                                          onClick={() => toggleAccount(`${dept.name}-${account.code}`)}
                                          className="p-0.5 hover:bg-gray-300 rounded transition-transform duration-200"
                                          style={{
                                            transform: expandedAccounts[`${dept.name}-${account.code}`] ? 'rotate(90deg)' : 'rotate(0deg)'
                                          }}
                                        >
                                          <ChevronRight className="w-3 h-3" />
                                        </button>
                                        <span className="font-medium">{account.code} - {account.label}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 text-sm text-right text-[#767676]">
                                      {formatAmount(account.budget)}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-right text-[#767676]">
                                      {formatAmount(account.actual)}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-right">
                                      <span className={account.variance >= 0 ? 'text-green-600' : 'text-red-600'}>
                                        {account.variance > 0 ? '+' : ''}{formatAmount(account.variance)}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 text-sm text-right">
                                      <span className="text-xs text-[#767676]">
                                        {((account.variance / account.budget) * 100).toFixed(1)}%
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 text-center">-</td>
                                  </tr>

                                  {/* Transactions si compte étendu */}
                                  {expandedAccounts[`${dept.name}-${account.code}`] && account.transactions.map((trans, transIdx) => (
                                    <tr key={`${dept.name}-${account.code}-${transIdx}`} className="hover:bg-gray-50">
                                      <td className="px-4 py-1 pl-20 text-xs text-[#767676]">
                                        {trans.date} - {trans.description}
                                      </td>
                                      <td className="px-4 py-1 text-xs text-right text-[#767676]">-</td>
                                      <td className="px-4 py-1 text-xs text-right text-[#444444]">
                                        {formatAmount(trans.amount)}
                                      </td>
                                      <td className="px-4 py-1 text-xs text-right">-</td>
                                      <td className="px-4 py-1 text-xs text-right">-</td>
                                      <td className="px-4 py-1 text-xs text-center">{trans.status}</td>
                                    </tr>
                                  ))}
                                </React.Fragment>
                              ))}
                            </React.Fragment>
                          ))}
                          {/* Ligne de total */}
                          <tr className="bg-gray-100 font-bold">
                            <td className="px-4 py-3 text-sm text-[#191919]">TOTAL</td>
                            <td className="px-4 py-3 text-sm text-right text-[#444444]">
                              {formatAmount(departmentBudgets.reduce((sum, d) => sum + d.budget, 0))}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-[#191919]">
                              {formatAmount(departmentBudgets.reduce((sum, d) => sum + d.actual, 0))}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              <span className={departmentBudgets.reduce((sum, d) => sum + d.variance, 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {formatAmount(departmentBudgets.reduce((sum, d) => sum + d.variance, 0))}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                                {((departmentBudgets.reduce((sum, d) => sum + d.variance, 0) / departmentBudgets.reduce((sum, d) => sum + d.budget, 0)) * 100).toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                                Sous budget
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Graphiques comparatifs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                      <h4 className="font-medium text-[#191919] mb-4">Répartition des Revenus</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#444444]">Commercial</span>
                          <span className="text-sm font-medium">100%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-8">
                          <div className="bg-green-500 h-8 rounded-full flex items-center justify-center text-white text-xs" style={{width: '100%'}}>
                            3,459,621,124 FCFA
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                      <h4 className="font-medium text-[#191919] mb-4">Répartition des Dépenses</h4>
                      <div className="space-y-2">
                        {[
                          { name: 'Finance & Comptabilité', value: 1808263133, pct: 65.6 },
                          { name: 'RH', value: 349834692, pct: 12.7 },
                          { name: 'General Admin', value: 291587212, pct: 10.6 },
                          { name: 'Facility Management', value: 206860000, pct: 7.5 },
                          { name: 'Marketing', value: 101225000, pct: 3.7 }
                        ].map((dept, idx) => (
                          <div key={idx}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-[#444444]">{dept.name}</span>
                              <span className="text-[#767676]">{dept.pct}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-red-500 h-2 rounded-full" style={{width: `${dept.pct}%`}}></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                    </>
                  )}

                  {/* Vue mensuelle */}
                  {overallView === 'monthly' && (
                    <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                      <h4 className="font-medium text-[#191919] mb-4">
                        Budget {selectedOverallMonth.charAt(0).toUpperCase() + selectedOverallMonth.slice(1)} 2025
                      </h4>

                      {/* KPIs du mois */}
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                        <div className="bg-[#F5F5F5] rounded-lg p-3">
                          <p className="text-xs text-[#767676] mb-1">Budgété</p>
                          <p className="text-lg font-bold text-[#191919]">288,301,760</p>
                        </div>
                        <div className="bg-[#F5F5F5] rounded-lg p-3">
                          <p className="text-xs text-[#767676] mb-1">Réalisé</p>
                          <p className="text-lg font-bold text-green-600">214,633,518</p>
                        </div>
                        <div className="bg-[#F5F5F5] rounded-lg p-3">
                          <p className="text-xs text-[#767676] mb-1">Écart</p>
                          <p className="text-lg font-bold text-red-600">-73,668,242</p>
                        </div>
                        <div className="bg-[#F5F5F5] rounded-lg p-3">
                          <p className="text-xs text-[#767676] mb-1">Taux réalisation</p>
                          <p className="text-lg font-bold text-blue-600">74.5%</p>
                        </div>
                        <div className="bg-[#F5F5F5] rounded-lg p-3">
                          <p className="text-xs text-[#767676] mb-1">Disponible</p>
                          <p className="text-lg font-bold text-[#B87333]">0</p>
                        </div>
                      </div>

                      {/* Tableau détaillé du mois */}
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-medium text-[#444444]">Catégorie</th>
                              <th className="px-4 py-3 text-right text-sm font-medium text-[#444444]">Budgété</th>
                              <th className="px-4 py-3 text-right text-sm font-medium text-[#444444]">Réel</th>
                              <th className="px-4 py-3 text-right text-sm font-medium text-[#444444]">Écart</th>
                              <th className="px-4 py-3 text-center text-sm font-medium text-[#444444]">%</th>
                              <th className="px-4 py-3 text-center text-sm font-medium text-[#444444]">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E8E8E8]">
                            <tr>
                              <td className="px-4 py-3 text-sm font-medium text-[#191919]">Revenus d'exploitation</td>
                              <td className="px-4 py-3 text-sm text-right">0</td>
                              <td className="px-4 py-3 text-sm text-right text-green-600">214,633,518</td>
                              <td className="px-4 py-3 text-sm text-right text-green-600">+214,633,518</td>
                              <td className="px-4 py-3 text-center">
                                <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">∞</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => navigate(`/budgeting/recap?type=revenue&month=${selectedOverallMonth}`)}
                                  className="p-1 hover:bg-gray-200 rounded"
                                  title="Voir les détails"
                                >
                                  <Eye className="w-4 h-4 text-[#B87333]" />
                                </button>
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-3 text-sm font-medium text-[#191919]">Charges d'exploitation</td>
                              <td className="px-4 py-3 text-sm text-right">0</td>
                              <td className="px-4 py-3 text-sm text-right text-red-600">295,835,190</td>
                              <td className="px-4 py-3 text-sm text-right text-red-600">-295,835,190</td>
                              <td className="px-4 py-3 text-center">
                                <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">∞</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => navigate(`/budgeting/recap?type=expense&month=${selectedOverallMonth}`)}
                                  className="p-1 hover:bg-gray-200 rounded"
                                  title="Voir les détails"
                                >
                                  <Eye className="w-4 h-4 text-[#B87333]" />
                                </button>
                              </td>
                            </tr>
                            <tr className="font-medium bg-gray-50">
                              <td className="px-4 py-3 text-sm text-[#191919]">Résultat d'exploitation (NOI)</td>
                              <td className="px-4 py-3 text-sm text-right">0</td>
                              <td className="px-4 py-3 text-sm text-right text-red-600">-81,201,672</td>
                              <td className="px-4 py-3 text-sm text-right text-red-600">-81,201,672</td>
                              <td className="px-4 py-3 text-center">
                                <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">-38%</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => console.log('View NOI details')}
                                  className="p-1 hover:bg-gray-200 rounded"
                                  title="Voir les détails"
                                >
                                  <Eye className="w-4 h-4 text-[#767676]" />
                                </button>
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-3 text-sm font-medium text-[#191919]">Produits financiers</td>
                              <td className="px-4 py-3 text-sm text-right">0</td>
                              <td className="px-4 py-3 text-sm text-right">0</td>
                              <td className="px-4 py-3 text-sm text-right">0</td>
                              <td className="px-4 py-3 text-center">
                                <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">-</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => console.log('View financial income details')}
                                  className="p-1 hover:bg-gray-200 rounded"
                                  title="Voir les détails"
                                >
                                  <Eye className="w-4 h-4 text-[#767676]" />
                                </button>
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-3 text-sm font-medium text-[#191919]">Charges financières</td>
                              <td className="px-4 py-3 text-sm text-right">0</td>
                              <td className="px-4 py-3 text-sm text-right">0</td>
                              <td className="px-4 py-3 text-sm text-right">0</td>
                              <td className="px-4 py-3 text-center">
                                <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">-</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => console.log('View financial charges details')}
                                  className="p-1 hover:bg-gray-200 rounded"
                                  title="Voir les détails"
                                >
                                  <Eye className="w-4 h-4 text-[#767676]" />
                                </button>
                              </td>
                            </tr>
                            <tr className="font-bold bg-[#B87333] text-white">
                              <td className="px-4 py-3 text-sm">Résultat net</td>
                              <td className="px-4 py-3 text-sm text-right">0</td>
                              <td className="px-4 py-3 text-sm text-right">-81,201,672</td>
                              <td className="px-4 py-3 text-sm text-right">-81,201,672</td>
                              <td className="px-4 py-3 text-center">
                                <span className="px-2 py-1 rounded-full text-xs bg-white text-red-700">-38%</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => console.log('View net result details')}
                                  className="p-1 hover:bg-orange-700 rounded"
                                  title="Voir les détails"
                                >
                                  <Eye className="w-4 h-4 text-white" />
                                </button>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Graphique d'évolution mensuelle */}
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <h5 className="text-sm font-medium text-[#444444] mb-3">Comparaison avec les mois précédents</h5>
                        <div className="space-y-2">
                          {[
                            { month: 'Novembre 2024', revenue: 187000000, expense: 165000000 },
                            { month: 'Décembre 2024', revenue: 205000000, expense: 180000000 },
                            { month: 'Janvier 2025', revenue: 214633518, expense: 295835190 }
                          ].map((data, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                              <span className="text-sm text-[#767676] w-32">{data.month}</span>
                              <div className="flex-1 flex items-center space-x-2 mx-4">
                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                  <div className="bg-green-500 h-2 rounded-full" style={{width: `${(data.revenue / 300000000) * 100}%`}}></div>
                                </div>
                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                  <div className="bg-red-500 h-2 rounded-full" style={{width: `${(data.expense / 300000000) * 100}%`}}></div>
                                </div>
                              </div>
                              <span className={`text-sm font-medium ${data.revenue > data.expense ? 'text-green-600' : 'text-red-600'}`}>
                                {data.revenue > data.expense ? '+' : ''}{formatAmount(data.revenue - data.expense)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Onglet Analyse Variation */}
          {activeTab === 'analyse' && (
            <div className="space-y-6">
              {/* Sous-onglets d'analyse */}
              <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                <div className="flex space-x-6 border-b border-[#E8E8E8]">
                  {[
                    { id: 'ecarts', label: '📊 Écarts significatifs' },
                    { id: 'variations', label: '📋 Détail des variations' },
                    { id: 'causes', label: '🎯 Analyse des causes' },
                    { id: 'tendances', label: '📈 Tendances' },
                    { id: 'comparatif', label: '📊 Comparatif' }
                  ].map(subTab => (
                    <button
                      key={subTab.id}
                      onClick={() => setAnalyseSubTab(subTab.id)}
                      className={`pb-3 px-2 font-medium text-sm transition-colors border-b-2 ${
                        analyseSubTab === subTab.id
                          ? 'border-[#B87333] text-[#B87333]'
                          : 'border-transparent text-[#767676] hover:text-[#444444]'
                      }`}
                    >
                      {subTab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contenu selon le sous-onglet actif */}
              {analyseSubTab === 'ecarts' && (
                <div className="space-y-6">
                  {/* Filtres d'analyse */}
                  <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#444444] mb-2">Période</label>
                        <select className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2">
                          <option>YTD 2024</option>
                          <option>Q3 2024</option>
                          <option>Septembre 2024</option>
                        </select>
                      </div>
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Département</label>
                    <select className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2">
                      <option>Tous</option>
                      <option>Commercial</option>
                      <option>Production</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Type d'écart</label>
                    <select className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2">
                      <option>Tous</option>
                      <option>Favorable</option>
                      <option>Défavorable</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Seuil (%)</label>
                    <input type="number" defaultValue="5" className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2" />
                  </div>
                  <div className="flex items-end">
                    <button className="w-full px-4 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323] flex items-center justify-center space-x-2">
                      <Filter className="w-4 h-4" />
                      <span>Analyser</span>
                    </button>
                  </div>
                    </div>
                  </div>

                  {/* Analyse des écarts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919] mb-4">📊 Écarts significatifs</h3>
                  <div className="space-y-3">
                    {[
                      { compte: 'Achats matières premières', prevu: 200000, reel: 245000, ecart: 45000, pct: 22.5, type: 'defavorable' },
                      { compte: 'Services externes', prevu: 150000, reel: 125000, ecart: -25000, pct: -16.7, type: 'favorable' },
                      { compte: 'Charges de personnel', prevu: 580000, reel: 590000, ecart: 10000, pct: 1.7, type: 'defavorable' },
                      { compte: 'Marketing', prevu: 50000, reel: 38000, ecart: -12000, pct: -24.0, type: 'favorable' },
                      { compte: 'Frais généraux', prevu: 45000, reel: 52000, ecart: 7000, pct: 15.6, type: 'defavorable' }
                    ].map((item, index) => (
                      <div key={index} className={`p-3 rounded-lg border-l-4 ${
                        item.type === 'favorable' ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'
                      }`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-semibold text-[#191919]">{item.compte}</p>
                            <div className="flex items-center space-x-3 mt-1">
                              <span className="text-xs text-[#767676]">Prévu: {(item.prevu / 1000).toFixed(0)}K€</span>
                              <span className="text-xs text-[#767676]">Réel: {(item.reel / 1000).toFixed(0)}K€</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-bold ${
                              item.type === 'favorable' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {item.ecart > 0 ? '+' : ''}{(item.ecart / 1000).toFixed(0)}K€
                            </p>
                            <p className={`text-xs ${
                              item.type === 'favorable' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {item.pct > 0 ? '+' : ''}{item.pct.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919] mb-4">🎯 Analyse des causes</h3>
                  <div className="space-y-4">
                    {[
                      {
                        ecart: 'Achats matières premières (+22.5%)',
                        causes: [
                          'Hausse des prix des matières premières (+15%)',
                          'Volume de production supérieur (+8%)',
                          'Changement de fournisseur'
                        ],
                        action: 'Renégociation contrats fournisseurs'
                      },
                      {
                        ecart: 'Services externes (-16.7%)',
                        causes: [
                          'Internalisation de certaines prestations',
                          'Optimisation des contrats',
                        ],
                        action: 'Maintenir la stratégie'
                      },
                      {
                        ecart: 'Marketing (-24%)',
                        causes: [
                          'Report campagne Q4',
                          'Économies sur digital'
                        ],
                        action: 'Réallouer budget Q4'
                      }
                    ].map((analyse, index) => (
                      <div key={index} className="border border-[#E8E8E8] rounded-lg p-3">
                        <h4 className="text-sm font-semibold text-[#191919] mb-2">{analyse.ecart}</h4>
                        <div className="space-y-1 mb-2">
                          {analyse.causes.map((cause, idx) => (
                            <p key={idx} className="text-xs text-[#767676] pl-3">• {cause}</p>
                          ))}
                        </div>
                        <div className="flex items-center space-x-2 pt-2 border-t border-[#E8E8E8]">
                          <AlertTriangle className="w-3 h-3 text-[#B87333]" />
                          <p className="text-xs font-medium text-[#B87333]">Action: {analyse.action}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {analyseSubTab === 'variations' && activeTab === 'analyse' && (
            <div className="space-y-4">
              {/* Filtres de sélection */}
              <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Modèle d'analyse</label>
                    <select
                      value={selectedAnalysisModel}
                      onChange={(e) => setSelectedAnalysisModel(e.target.value)}
                      className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#B87333]">
                      <option value="budget-vs-actual-complete">Budget vs Actual (Income - Expense)</option>
                      <option value="revenue-analysis">Revenue Analysis (Budget vs Actual)</option>
                      <option value="expense-analysis">Expense Analysis (Budget vs Actual)</option>
                      <option value="income-vs-expense-trends">Income VS Expense (Trends)</option>
                      <option value="category-breakdown">Category Breakdown Analysis</option>
                      <option value="annual-income-overview">Annual Income Overview</option>
                      <option value="n-1">Année N vs N-1</option>
                      <option value="previsions">Prévisions vs Réalisé</option>
                      <option value="trimestre">Trimestre vs Trimestre précédent</option>
                      <option value="mensuel">Mois vs Mois précédent</option>
                      <option value="glissant">Moyenne glissante 3 mois</option>
                      <option value="objectifs">Objectifs vs Réalisé</option>
                      <option value="benchmark">Benchmark sectoriel</option>
                      <option value="scenario">Scénario optimiste/pessimiste</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Période</label>
                    <select className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#B87333]">
                      <option value="ytd">YTD 2025</option>
                      <option value="q1">Q1 2025</option>
                      <option value="q2">Q2 2025</option>
                      <option value="q3">Q3 2025</option>
                      <option value="q4">Q4 2025</option>
                      <option value="jan">Janvier 2025</option>
                      <option value="feb">Février 2025</option>
                      <option value="mar">Mars 2025</option>
                      <option value="apr">Avril 2025</option>
                      <option value="may">Mai 2025</option>
                      <option value="jun">Juin 2025</option>
                      <option value="jul">Juillet 2025</option>
                      <option value="aug">Août 2025</option>
                      <option value="sep">Septembre 2025</option>
                      <option value="oct">Octobre 2025</option>
                      <option value="nov">Novembre 2025</option>
                      <option value="dec">Décembre 2025</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button className="w-full px-4 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323] flex items-center justify-center space-x-2" aria-label="Filtrer">
                      <Filter className="w-4 h-4" />
                      <span>{t('common.filter')}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Dashboard selon le modèle sélectionné */}
              {selectedAnalysisModel === 'budget-vs-actual-complete' && (
              <div className="space-y-6">
                {/* KPIs Header */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-[#191919]">📊 Budget VS Actual (Income - Expense)</h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-[#767676]">By Months</span>
                      <button className="p-2 hover:bg-gray-100 rounded" aria-label="Actualiser">
                        <RefreshCw className="w-4 h-4 text-[#767676]" />
                      </button>
                    </div>
                  </div>

                  {/* Income KPIs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-16 h-16 rounded-full border-8 border-green-200 border-t-green-600 flex items-center justify-center">
                            <span className="text-sm font-bold">30.4%</span>
                          </div>
                          <span className="text-sm text-[#767676]">% of budget</span>
                        </div>
                        <TrendingUp className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-[#767676] mb-1">Actual income</p>
                          <p className="text-lg font-bold text-green-600">873 378 362</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#767676] mb-1">Income budget</p>
                          <p className="text-lg font-bold text-red-500">2 869 322 607</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#767676] mb-1">Balance (XOF)</p>
                          <p className="text-lg font-bold text-[#191919]">1 995 944 245</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-16 h-16 rounded-full border-8 border-red-200 flex items-center justify-center">
                            <span className="text-sm font-bold">0%</span>
                          </div>
                          <span className="text-sm text-[#767676]">% of budget</span>
                        </div>
                        <TrendingDown className="w-6 h-6 text-red-600" />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-[#767676] mb-1">Actual expense</p>
                          <p className="text-lg font-bold text-[#191919]">685 091 915</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#767676] mb-1">Expense budget</p>
                          <p className="text-lg font-bold text-[#767676]">0</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#767676] mb-1">Balance (XOF)</p>
                          <p className="text-lg font-bold text-red-600">-685 091 915</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Charts placeholder - vous pouvez ajouter des graphiques ici */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-[#444444] mb-3">Income Trend</p>
                      <div className="h-48 flex items-center justify-center text-[#767676]">
                        <BarChart3 className="w-12 h-12 opacity-20" />
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-[#444444] mb-3">Expense Trend</p>
                      <div className="h-48 flex items-center justify-center text-[#767676]">
                        <BarChart3 className="w-12 h-12 opacity-20" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed tables */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Income table */}
                  <div className="bg-white rounded-lg border border-[#E8E8E8]">
                    <div className="p-4 bg-gray-50 border-b border-[#E8E8E8]">
                      <h4 className="font-semibold text-[#191919] flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span>Income</span>
                      </h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-[#444444]">Month</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-[#444444]">{t('navigation.budget')}</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-[#444444]">Actual</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-[#444444]">Difference</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-[#444444]">%</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8E8E8]">
                          {[
                            { month: 'jan', budget: 206636056, actual: 26152190, diff: 180483866, pct: 12.7 },
                            { month: 'feb', budget: 204014877, actual: 21741850, diff: 182273027, pct: 10.7 },
                            { month: 'mar', budget: 212490894, actual: 15657395, diff: 196833499, pct: 7.4 },
                            { month: 'apr', budget: 231438548, actual: 20013882, diff: 211424666, pct: 8.6 },
                            { month: 'may', budget: 217044709, actual: 25030124, diff: 192014585, pct: 11.5 },
                            { month: 'jun', budget: 223101674, actual: 94931362, diff: 128170312, pct: 42.6 },
                            { month: 'jul', budget: 338969106, actual: 33085590, diff: 305883516, pct: 9.8 },
                            { month: 'aug', budget: 247199923, actual: 316262333, diff: -69062410, pct: 127.9 },
                            { month: 'sep', budget: 245454816, actual: 320503637, diff: -75048821, pct: 130.6 }
                          ].map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-xs text-[#444444]">{row.month}</td>
                              <td className="px-3 py-2 text-xs text-right">{row.budget.toLocaleString()}</td>
                              <td className="px-3 py-2 text-xs text-right">{row.actual.toLocaleString()}</td>
                              <td className={`px-3 py-2 text-xs text-right font-medium ${row.diff > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {row.diff.toLocaleString()}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <div className="flex items-center justify-center">
                                  <div className="w-full max-w-[60px] bg-gray-200 rounded-full h-2">
                                    <div className={`h-2 rounded-full ${row.pct > 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                         style={{width: `${Math.min(row.pct, 100)}%`}}></div>
                                  </div>
                                  <span className="ml-2 text-xs">{row.pct}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                          <tr className="font-bold bg-gray-50">
                            <td className="px-3 py-2 text-xs">Total</td>
                            <td className="px-3 py-2 text-xs text-right">2,869,322,607</td>
                            <td className="px-3 py-2 text-xs text-right">873,378,362</td>
                            <td className="px-3 py-2 text-xs text-right text-red-600">1,995,944,245</td>
                            <td className="px-3 py-2 text-xs text-center">30.4%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Expense table */}
                  <div className="bg-white rounded-lg border border-[#E8E8E8]">
                    <div className="p-4 bg-gray-50 border-b border-[#E8E8E8]">
                      <h4 className="font-semibold text-[#191919] flex items-center space-x-2">
                        <TrendingDown className="w-4 h-4 text-red-600" />
                        <span>Expense</span>
                      </h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-[#444444]">Month</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-[#444444]">{t('navigation.budget')}</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-[#444444]">Actual</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-[#444444]">Difference</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-[#444444]">%</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8E8E8]">
                          {[
                            { month: 'jan', budget: 0, actual: 218461420, diff: -218461420, pct: 0 },
                            { month: 'feb', budget: 0, actual: 47715387, diff: -47715387, pct: 0 },
                            { month: 'mar', budget: 0, actual: 55251886, diff: -55251886, pct: 0 },
                            { month: 'apr', budget: 0, actual: 87866177, diff: -87866177, pct: 0 },
                            { month: 'may', budget: 0, actual: 54339072, diff: -54339072, pct: 0 },
                            { month: 'jun', budget: 0, actual: 65621280, diff: -65621280, pct: 0 },
                            { month: 'jul', budget: 0, actual: 74039180, diff: -74039180, pct: 0 },
                            { month: 'aug', budget: 0, actual: 69154152, diff: -69154152, pct: 0 },
                            { month: 'sep', budget: 0, actual: 12643361, diff: -12643361, pct: 0 }
                          ].map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-xs text-[#444444]">{row.month}</td>
                              <td className="px-3 py-2 text-xs text-right">{row.budget.toLocaleString()}</td>
                              <td className="px-3 py-2 text-xs text-right">{row.actual.toLocaleString()}</td>
                              <td className="px-3 py-2 text-xs text-right text-red-600">
                                {row.diff.toLocaleString()}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className="text-xs">{row.pct}%</span>
                              </td>
                            </tr>
                          ))}
                          <tr className="font-bold bg-gray-50">
                            <td className="px-3 py-2 text-xs">Total</td>
                            <td className="px-3 py-2 text-xs text-right">0</td>
                            <td className="px-3 py-2 text-xs text-right">685,091,915</td>
                            <td className="px-3 py-2 text-xs text-right text-red-600">-685,091,915</td>
                            <td className="px-3 py-2 text-xs text-center">0%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
              )}

              {/* Revenue Analysis Dashboard */}
              {selectedAnalysisModel === 'revenue-analysis' && (
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-[#191919]">📈 Revenus analysis (Budget VS Actual)</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-[#767676]">By Months</span>
                    <button className="p-2 hover:bg-gray-100 rounded" aria-label="Actualiser">
                      <RefreshCw className="w-4 h-4 text-[#767676]" />
                    </button>
                  </div>
                </div>

                {/* Revenue KPIs */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-20 h-20 rounded-full border-8 border-green-200 border-t-green-600 flex items-center justify-center">
                        <span className="text-lg font-bold">30.4%</span>
                      </div>
                      <span className="text-sm text-[#767676]">% of budget</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                      <p className="text-sm text-[#767676] mb-2">Actual income</p>
                      <p className="text-2xl font-bold text-green-600">873 378 362</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                      <p className="text-sm text-[#767676] mb-2">Income budget</p>
                      <p className="text-2xl font-bold text-red-500">2 869 322 607</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                      <p className="text-sm text-[#767676] mb-2">Balance (XOF)</p>
                      <p className="text-2xl font-bold text-[#191919]">1 995 944 245</p>
                    </div>
                  </div>
                </div>

                {/* Chart placeholder */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex space-x-4">
                      <span className="flex items-center space-x-2">
                        <span className="w-3 h-3 bg-gray-400"></span>
                        <span className="text-sm text-[#767676]">Actual</span>
                      </span>
                      <span className="flex items-center space-x-2">
                        <span className="w-3 h-3 bg-[#B87333]"></span>
                        <span className="text-sm text-[#767676]">{t('navigation.budget')}</span>
                      </span>
                    </div>
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="h-48 flex items-center justify-center text-[#767676]">
                    <BarChart3 className="w-12 h-12 opacity-20" />
                  </div>
                </div>

                {/* Revenue detailed table */}
                <div className="bg-white rounded-lg border border-[#E8E8E8]">
                  <div className="p-4 bg-gray-50 border-b border-[#E8E8E8] flex items-center justify-between">
                    <h4 className="font-semibold text-[#191919] flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span>Income</span>
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#444444]">Month</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-[#444444]">{t('navigation.budget')}</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-[#444444]">Actual</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-[#444444]">Difference(F CFA)</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-[#444444]">Income - % Budget</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8E8E8]">
                        {[
                          { month: 'jan', budget: 206636056, actual: 26152190, diff: 180483866, pct: 12.7 },
                          { month: 'feb', budget: 204014877, actual: 21741850, diff: 182273027, pct: 10.7 },
                          { month: 'mar', budget: 212490894, actual: 15657395, diff: 196833499, pct: 7.4 },
                          { month: 'apr', budget: 231438548, actual: 20013882, diff: 211424666, pct: 8.6 },
                          { month: 'may', budget: 217044709, actual: 25030124, diff: 192014585, pct: 11.5 },
                          { month: 'jun', budget: 223101674, actual: 94931362, diff: 128170312, pct: 42.6 },
                          { month: 'jul', budget: 338969106, actual: 33085590, diff: 305883516, pct: 9.8 },
                          { month: 'aug', budget: 247199923, actual: 316262333, diff: -69062410, pct: 127.9 },
                          { month: 'sep', budget: 245454816, actual: 320503637, diff: -75048821, pct: 130.6 },
                          { month: 'oct', budget: 237610563, actual: 0, diff: 237610563, pct: 0 },
                          { month: 'nov', budget: 237778468, actual: 0, diff: 237778468, pct: 0 },
                          { month: 'dec', budget: 267582574, actual: 0, diff: 267582574, pct: 0 }
                        ].map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-[#444444]">{row.month}</td>
                            <td className="px-4 py-3 text-sm text-right">{row.budget.toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-right">{row.actual.toLocaleString()}</td>
                            <td className={`px-4 py-3 text-sm text-right ${row.diff > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {row.diff.toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                  <div className={`h-2 rounded-full ${row.pct > 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                       style={{width: `${Math.min(row.pct, 100)}%`}}></div>
                                </div>
                                <span className="text-xs text-[#444444]">{row.pct.toFixed(1)}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                        <tr className="font-bold bg-gray-50">
                          <td className="px-4 py-3 text-sm">Total</td>
                          <td className="px-4 py-3 text-sm text-right">2 869 322 607</td>
                          <td className="px-4 py-3 text-sm text-right">873 378 362</td>
                          <td className="px-4 py-3 text-sm text-right text-red-600">1 995 944 245</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                <div className="bg-green-500 h-2 rounded-full" style={{width: '30.4%'}}></div>
                              </div>
                              <span className="text-sm font-bold text-green-600">30.4%</span>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              )}

              {/* Expense Analysis Dashboard */}
              {selectedAnalysisModel === 'expense-analysis' && (
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-[#191919]">📉 Expense analysis (Budget VS Actual)</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-[#767676]">By Months</span>
                    <button className="p-2 hover:bg-gray-100 rounded" aria-label="Actualiser">
                      <RefreshCw className="w-4 h-4 text-[#767676]" />
                    </button>
                  </div>
                </div>

                {/* Expense KPIs */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-20 h-20 rounded-full border-8 border-gray-300 flex items-center justify-center">
                        <span className="text-lg font-bold">0%</span>
                      </div>
                      <span className="text-sm text-[#767676]">% of budget</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                      <p className="text-sm text-[#767676] mb-2">Actual expense</p>
                      <p className="text-2xl font-bold text-[#191919]">685 091 915</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                      <p className="text-sm text-[#767676] mb-2">Expense budget</p>
                      <p className="text-2xl font-bold text-red-500">0</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                      <p className="text-sm text-[#767676] mb-2">Balance (XOF)</p>
                      <p className="text-2xl font-bold text-red-600">-685 091 915</p>
                    </div>
                  </div>
                </div>

                {/* Chart placeholder */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex space-x-4">
                      <span className="flex items-center space-x-2">
                        <span className="w-3 h-3 bg-gray-400"></span>
                        <span className="text-sm text-[#767676]">Actual</span>
                      </span>
                      <span className="flex items-center space-x-2">
                        <span className="w-3 h-3 bg-[#B87333]"></span>
                        <span className="text-sm text-[#767676]">{t('navigation.budget')}</span>
                      </span>
                    </div>
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="h-48 flex items-center justify-center text-[#767676]">
                    <BarChart3 className="w-12 h-12 opacity-20" />
                  </div>
                </div>

                {/* Expense detailed table */}
                <div className="bg-white rounded-lg border border-[#E8E8E8]">
                  <div className="p-4 bg-gray-50 border-b border-[#E8E8E8] flex items-center justify-between">
                    <h4 className="font-semibold text-[#191919] flex items-center space-x-2">
                      <TrendingDown className="w-4 h-4 text-red-600" />
                      <span>Expense</span>
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#444444]">Month</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-[#444444]">{t('navigation.budget')}</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-[#444444]">Actual</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-[#444444]">Difference(F CFA)</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-[#444444]">Expense - % Budget</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8E8E8]">
                        {[
                          { month: 'jan', budget: 0, actual: 218461420, diff: -218461420, pct: 0 },
                          { month: 'feb', budget: 0, actual: 47715387, diff: -47715387, pct: 0 },
                          { month: 'mar', budget: 0, actual: 55251886, diff: -55251886, pct: 0 },
                          { month: 'apr', budget: 0, actual: 87866177, diff: -87866177, pct: 0 },
                          { month: 'may', budget: 0, actual: 54339072, diff: -54339072, pct: 0 },
                          { month: 'jun', budget: 0, actual: 65621280, diff: -65621280, pct: 0 },
                          { month: 'jul', budget: 0, actual: 74039180, diff: -74039180, pct: 0 },
                          { month: 'aug', budget: 0, actual: 69154152, diff: -69154152, pct: 0 },
                          { month: 'sep', budget: 0, actual: 12643361, diff: -12643361, pct: 0 },
                          { month: 'oct', budget: 0, actual: 0, diff: 0, pct: 0 },
                          { month: 'nov', budget: 0, actual: 0, diff: 0, pct: 0 },
                          { month: 'dec', budget: 0, actual: 0, diff: 0, pct: 0 }
                        ].map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-[#444444]">{row.month}</td>
                            <td className="px-4 py-3 text-sm text-right">{row.budget.toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-right">{row.actual.toLocaleString()}</td>
                            <td className={`px-4 py-3 text-sm text-right ${row.diff < 0 ? 'text-red-600' : 'text-[#444444]'}`}>
                              {row.diff.toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                  <div className="bg-gray-400 h-2 rounded-full" style={{width: `${row.pct}%`}}></div>
                                </div>
                                <span className="text-xs text-[#444444]">{row.pct}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                        <tr className="font-bold bg-gray-50">
                          <td className="px-4 py-3 text-sm">Total</td>
                          <td className="px-4 py-3 text-sm text-right">0</td>
                          <td className="px-4 py-3 text-sm text-right">685 091 915</td>
                          <td className="px-4 py-3 text-sm text-right text-red-600">-685 091 915</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                <div className="bg-gray-400 h-2 rounded-full" style={{width: '0%'}}></div>
                              </div>
                              <span className="text-sm font-bold">0%</span>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              )}

              {/* Income vs Expense Trends Dashboard */}
              {selectedAnalysisModel === 'income-vs-expense-trends' && (
              <div className="space-y-6">
                {/* Summary KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                    <div className="flex items-center justify-between mb-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <span className="text-xs text-green-600 font-medium">+12.3%</span>
                    </div>
                    <p className="text-xs text-[#767676] mb-1">Total Income (4 Years)</p>
                    <p className="text-xl font-bold text-[#191919]">6.86B XOF</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                    <div className="flex items-center justify-between mb-2">
                      <TrendingDown className="w-5 h-5 text-red-600" />
                      <span className="text-xs text-red-600 font-medium">+8.7%</span>
                    </div>
                    <p className="text-xs text-[#767676] mb-1">Total Expenses (4 Years)</p>
                    <p className="text-xl font-bold text-[#191919]">1.90B XOF</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                    <div className="flex items-center justify-between mb-2">
                      <BarChart3 className="w-5 h-5 text-[#6A8A82]" />
                      <span className="text-xs text-[#6A8A82] font-medium">+15.2%</span>
                    </div>
                    <p className="text-xs text-[#767676] mb-1">Net Result (4 Years)</p>
                    <p className="text-xl font-bold text-green-600">4.96B XOF</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                    <div className="flex items-center justify-between mb-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      <span className="text-xs text-blue-600 font-medium">72.3%</span>
                    </div>
                    <p className="text-xs text-[#767676] mb-1">Profit Margin</p>
                    <p className="text-xl font-bold text-[#191919]">Excellent</p>
                  </div>
                </div>

                {/* Trend Visualization */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-[#191919]">💹 Income VS Expense Trends (2022-2025)</h3>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-[#444444]">Income</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-xs text-[#444444]">Expenses</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-xs text-[#444444]">Net Result</span>
                      </div>
                      <button className="p-2 hover:bg-gray-100 rounded" aria-label="Actualiser">
                        <RefreshCw className="w-4 h-4 text-[#767676]" />
                      </button>
                    </div>
                  </div>

                  {/* Chart Placeholder */}
                  <div className="h-64 bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="h-full flex items-end justify-between space-x-8">
                      {['2025', '2024', '2023', '2022'].map((year, idx) => {
                        const incomeHeights = [45, 85, 0, 0];
                        const expenseHeights = [20, 30, 0, 0];
                        const netHeights = [25, 55, 0, 0];

                        return (
                          <div key={year} className="flex-1 flex flex-col items-center">
                            <div className="w-full flex items-end justify-center space-x-2 h-48">
                              <div className="flex flex-col items-center w-1/3">
                                <div
                                  className="w-full bg-green-500 rounded-t transition-all duration-500"
                                  style={{height: `${incomeHeights[idx]}%`}}
                                  title={`Income ${year}`}
                                ></div>
                              </div>
                              <div className="flex flex-col items-center w-1/3">
                                <div
                                  className="w-full bg-red-500 rounded-t transition-all duration-500"
                                  style={{height: `${expenseHeights[idx]}%`}}
                                  title={`Expenses ${year}`}
                                ></div>
                              </div>
                              <div className="flex flex-col items-center w-1/3">
                                <div
                                  className="w-full bg-blue-500 rounded-t transition-all duration-500"
                                  style={{height: `${netHeights[idx]}%`}}
                                  title={`Net ${year}`}
                                ></div>
                              </div>
                            </div>
                            <span className="text-xs text-[#767676] mt-2">{year}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Detailed Tables Section */}
                <div className="bg-white rounded-lg border border-[#E8E8E8]">
                  {/* Income trends table */}
                  <div className="mb-8">
                    <div className="bg-gradient-to-r from-green-50 to-green-100 p-3 rounded-t-lg border-b border-[#E8E8E8]">
                      <h4 className="font-semibold text-[#191919] flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span>Income Trends by Category</span>
                      </h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-[#444444]" rowSpan={2}>Incomes categories</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-[#444444]" colSpan={2}>Year: 2025</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-[#444444]" colSpan={2}>Year: 2024</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-[#444444]" colSpan={2}>Year: 2023</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-[#444444]" colSpan={2}>Year: 2022</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-[#444444]" colSpan={2}>TOTAL</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-[#444444]">Trend</th>
                          </tr>
                          <tr>
                            <th className="px-2 py-2 text-xs text-[#767676]">Actual</th>
                            <th className="px-2 py-2 text-xs text-[#767676]">{t('navigation.budget')}</th>
                            <th className="px-2 py-2 text-xs text-[#767676]">Actual</th>
                            <th className="px-2 py-2 text-xs text-[#767676]">{t('navigation.budget')}</th>
                            <th className="px-2 py-2 text-xs text-[#767676]">Actual</th>
                            <th className="px-2 py-2 text-xs text-[#767676]">{t('navigation.budget')}</th>
                            <th className="px-2 py-2 text-xs text-[#767676]">Actual</th>
                            <th className="px-2 py-2 text-xs text-[#767676]">{t('navigation.budget')}</th>
                            <th className="px-2 py-2 text-xs text-[#767676]">Actual</th>
                            <th className="px-2 py-2 text-xs text-[#767676]">{t('navigation.budget')}</th>
                            <th className="px-2 py-2 text-xs text-[#767676]">-% Budget</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8E8E8]">
                          {[
                            { category: 'Produits issus de partage de revenus', y2022: [0, 0], y2023: [0, 0], y2024: [27577124, 0], y2025: [19107151, 0], total: [46684275, 0], trend: 'down' },
                            { category: 'Rabais, remises, ristournes accordés', y2022: [0, 0], y2023: [0, 0], y2024: [-52422419, 0], y2025: [0, 0], total: [-52422419, 0], trend: 'up' },
                            { category: 'Revenus de mises à disposition d\'espace', y2022: [0, 0], y2023: [0, 0], y2024: [391631822, 397025366], y2025: [157565954, 0], total: [549197776, 397025366], trend: 'down' },
                            { category: 'Revenue de location à bail', y2022: [0, 0], y2023: [0, 0], y2024: [4913101830, 2394059909], y2025: [1389192514, 0], total: [6302294344, 2394059909], trend: 'down' },
                            { category: '754200', y2022: [0, 0], y2023: [0, 0], y2024: [184225, 0], y2025: [13652500, 0], total: [13836725, 0], trend: 'up' }
                          ].map((row, idx) => {
                            const percentBudget = row.total[1] > 0 ? ((row.total[0] / row.total[1]) * 100).toFixed(1) : '0';
                            return (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-xs text-[#444444] font-medium">{row.category}</td>
                              <td className="px-2 py-2 text-xs text-right">{row.y2025[0].toLocaleString()}</td>
                              <td className="px-2 py-2 text-xs text-right">{row.y2025[1].toLocaleString()}</td>
                              <td className="px-2 py-2 text-xs text-right">{row.y2024[0].toLocaleString()}</td>
                              <td className="px-2 py-2 text-xs text-right">{row.y2024[1].toLocaleString()}</td>
                              <td className="px-2 py-2 text-xs text-right">{row.y2023[0].toLocaleString()}</td>
                              <td className="px-2 py-2 text-xs text-right">{row.y2023[1].toLocaleString()}</td>
                              <td className="px-2 py-2 text-xs text-right">{row.y2022[0].toLocaleString()}</td>
                              <td className="px-2 py-2 text-xs text-right">{row.y2022[1].toLocaleString()}</td>
                              <td className="px-2 py-2 text-xs text-right font-medium">{row.total[0].toLocaleString()}</td>
                              <td className="px-2 py-2 text-xs text-right font-medium">{row.total[1].toLocaleString()}</td>
                              <td className="px-2 py-2 text-center">
                                <div className="flex items-center justify-center">
                                  {row.trend === 'up' ? (
                                    <TrendingUp className="w-3 h-3 text-green-500" />
                                  ) : row.trend === 'down' ? (
                                    <TrendingDown className="w-3 h-3 text-red-500" />
                                  ) : (
                                    <Minus className="w-3 h-3 text-gray-700" />
                                  )}
                                  <span className="ml-1 text-xs">{percentBudget}%</span>
                                </div>
                              </td>
                            </tr>
                          )})}
                          <tr className="font-bold bg-gray-100">
                            <td className="px-4 py-2 text-xs">Total</td>
                            <td className="px-2 py-2 text-xs text-right">1,579,518,119</td>
                            <td className="px-2 py-2 text-xs text-right">0</td>
                            <td className="px-2 py-2 text-xs text-right">5,280,072,582</td>
                            <td className="px-2 py-2 text-xs text-right">2,791,085,275</td>
                            <td className="px-2 py-2 text-xs text-right">0</td>
                            <td className="px-2 py-2 text-xs text-right">0</td>
                            <td className="px-2 py-2 text-xs text-right">0</td>
                            <td className="px-2 py-2 text-xs text-right">0</td>
                            <td className="px-2 py-2 text-xs text-right">6,859,590,701</td>
                            <td className="px-2 py-2 text-xs text-right">2,791,085,275</td>
                            <td className="px-2 py-2 text-center">
                              <div className="flex items-center justify-center">
                                <TrendingUp className="w-3 h-3 text-green-500" />
                                <span className="ml-1 text-xs">245.7%</span>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Expense trends table */}
                  <div>
                    <div className="bg-gradient-to-r from-red-50 to-red-100 p-3 rounded-t-lg border-b border-[#E8E8E8]">
                      <h4 className="font-semibold text-[#191919] flex items-center space-x-2">
                        <TrendingDown className="w-4 h-4 text-red-600" />
                        <span>Expense Trends by Category</span>
                      </h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-[#444444]" rowSpan={2}>Expenses categories</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-[#444444]" colSpan={2}>Year: 2025</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-[#444444]" colSpan={2}>Year: 2024</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-[#444444]" colSpan={2}>Year: 2023</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-[#444444]" colSpan={2}>Year: 2022</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-[#444444]" colSpan={2}>TOTAL</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-[#444444]">Trend</th>
                          </tr>
                          <tr>
                            <th className="px-2 py-2 text-xs text-[#767676]">Actual</th>
                            <th className="px-2 py-2 text-xs text-[#767676]">{t('navigation.budget')}</th>
                            <th className="px-2 py-2 text-xs text-[#767676]">Actual</th>
                            <th className="px-2 py-2 text-xs text-[#767676]">{t('navigation.budget')}</th>
                            <th className="px-2 py-2 text-xs text-[#767676]">Actual</th>
                            <th className="px-2 py-2 text-xs text-[#767676]">{t('navigation.budget')}</th>
                            <th className="px-2 py-2 text-xs text-[#767676]">Actual</th>
                            <th className="px-2 py-2 text-xs text-[#767676]">{t('navigation.budget')}</th>
                            <th className="px-2 py-2 text-xs text-[#767676]">Actual</th>
                            <th className="px-2 py-2 text-xs text-[#767676]">{t('navigation.budget')}</th>
                            <th className="px-2 py-2 text-xs text-[#767676]">-% Budget</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8E8E8]">
                          {[
                            { category: 'Achats et variations de stocks', y2022: [0, 0], y2023: [0, 0], y2024: [177273426, 0], y2025: [95585712, 0], total: [272859138, 0], trend: 'down' },
                            { category: 'Transports', y2022: [0, 0], y2023: [0, 0], y2024: [814300, 0], y2025: [0, 0], total: [814300, 0], trend: 'down' },
                            { category: 'Services extérieurs', y2022: [0, 0], y2023: [0, 0], y2024: [340154263, 0], y2025: [393245049, 0], total: [733399312, 0], trend: 'up' },
                            { category: 'Autres services extérieurs', y2022: [0, 0], y2023: [0, 0], y2024: [466667422, 0], y2025: [37311234, 0], total: [503978656, 0], trend: 'down' },
                            { category: 'Impôts et taxes', y2022: [0, 0], y2023: [0, 0], y2024: [221657495, 0], y2025: [127263860, 0], total: [348921355, 0], trend: 'down' },
                            { category: 'Autres charges', y2022: [0, 0], y2023: [0, 0], y2024: [13003591, 0], y2025: [28448682, 0], total: [41452273, 0], trend: 'up' },
                            { category: 'Charges de personnel', y2022: [0, 0], y2023: [0, 0], y2024: [241675, 0], y2025: [154655, 0], total: [396330, 0], trend: 'down' },
                            { category: 'Frais financiers et charges assimilées', y2022: [0, 0], y2023: [0, 0], y2024: [0, 0], y2025: [0, 0], total: [0, 0], trend: 'stable' },
                            { category: 'Dotations aux amortissements', y2022: [0, 0], y2023: [0, 0], y2024: [0, 0], y2025: [0, 0], total: [0, 0], trend: 'stable' },
                            { category: 'Dotations aux provisions', y2022: [0, 0], y2023: [0, 0], y2024: [0, 0], y2025: [0, 0], total: [0, 0], trend: 'stable' }
                          ].map((row, idx) => {
                            const percentBudget = row.total[1] > 0 ? ((row.total[0] / row.total[1]) * 100).toFixed(1) : '0';
                            return (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-xs text-[#444444] font-medium">{row.category}</td>
                              <td className="px-2 py-2 text-xs text-right">{row.y2025[0].toLocaleString()}</td>
                              <td className="px-2 py-2 text-xs text-right">{row.y2025[1].toLocaleString()}</td>
                              <td className="px-2 py-2 text-xs text-right">{row.y2024[0].toLocaleString()}</td>
                              <td className="px-2 py-2 text-xs text-right">{row.y2024[1].toLocaleString()}</td>
                              <td className="px-2 py-2 text-xs text-right">{row.y2023[0].toLocaleString()}</td>
                              <td className="px-2 py-2 text-xs text-right">{row.y2023[1].toLocaleString()}</td>
                              <td className="px-2 py-2 text-xs text-right">{row.y2022[0].toLocaleString()}</td>
                              <td className="px-2 py-2 text-xs text-right">{row.y2022[1].toLocaleString()}</td>
                              <td className="px-2 py-2 text-xs text-right font-medium">{row.total[0].toLocaleString()}</td>
                              <td className="px-2 py-2 text-xs text-right font-medium">{row.total[1].toLocaleString()}</td>
                              <td className="px-2 py-2 text-center">
                                <div className="flex items-center justify-center">
                                  {row.trend === 'up' ? (
                                    <TrendingUp className="w-3 h-3 text-red-500" />
                                  ) : row.trend === 'down' ? (
                                    <TrendingDown className="w-3 h-3 text-green-500" />
                                  ) : (
                                    <Minus className="w-3 h-3 text-gray-700" />
                                  )}
                                  <span className="ml-1 text-xs">{percentBudget}%</span>
                                </div>
                              </td>
                            </tr>
                          )})}
                          <tr className="font-bold bg-gray-100">
                            <td className="px-4 py-2 text-xs">Total</td>
                            <td className="px-2 py-2 text-xs text-right">682,009,192</td>
                            <td className="px-2 py-2 text-xs text-right">0</td>
                            <td className="px-2 py-2 text-xs text-right">1,219,812,172</td>
                            <td className="px-2 py-2 text-xs text-right">0</td>
                            <td className="px-2 py-2 text-xs text-right">0</td>
                            <td className="px-2 py-2 text-xs text-right">0</td>
                            <td className="px-2 py-2 text-xs text-right">0</td>
                            <td className="px-2 py-2 text-xs text-right">0</td>
                            <td className="px-2 py-2 text-xs text-right">1,901,821,364</td>
                            <td className="px-2 py-2 text-xs text-right">0</td>
                            <td className="px-2 py-2 text-center">
                              <div className="flex items-center justify-center">
                                <TrendingDown className="w-3 h-3 text-green-500" />
                                <span className="ml-1 text-xs">0%</span>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Year-over-Year Performance Summary */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h4 className="font-semibold text-[#191919] mb-4">📊 Performance Analysis Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span className="text-sm text-[#444444]">Best Income Year</span>
                        <span className="font-bold text-green-600">2024 (5.28B XOF)</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                        <span className="text-sm text-[#444444]">Highest Expense Year</span>
                        <span className="font-bold text-red-600">2024 (1.22B XOF)</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm text-[#444444]">Best Net Margin</span>
                        <span className="font-bold text-blue-600">2024 (4.06B XOF)</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-[#444444]">Avg Income Growth</span>
                        <span className="font-bold text-[#6A8A82]">+42.3% YoY</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-[#444444]">Avg Expense Growth</span>
                        <span className="font-bold text-orange-600">+28.7% YoY</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-[#444444]">Operating Efficiency</span>
                        <span className="font-bold text-[#6A8A82]">Improving ↑</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              )}

              {/* Category Breakdown Analysis Dashboard */}
              {selectedAnalysisModel === 'category-breakdown' && (
              <div className="space-y-6">
                {/* Header with Total Summary */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-[#191919]">📊 Category Breakdown Analysis</h3>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-[#767676]">Period: 2024-2025</span>
                      <button className="p-2 hover:bg-gray-100 rounded" aria-label="Actualiser">
                        <RefreshCw className="w-4 h-4 text-[#767676]" />
                      </button>
                    </div>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-green-800">Total Income</span>
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      </div>
                      <p className="text-2xl font-bold text-green-900">6,859,590,701 XOF</p>
                      <p className="text-xs text-green-600 mt-1">+30.4% vs Budget</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-red-800">Total Expenses</span>
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      </div>
                      <p className="text-2xl font-bold text-red-900">1,901,821,364 XOF</p>
                      <p className="text-xs text-red-600 mt-1">No budget defined</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-800">Net Result</span>
                        <BarChart3 className="w-4 h-4 text-blue-600" />
                      </div>
                      <p className="text-2xl font-bold text-blue-900">4,957,769,337 XOF</p>
                      <p className="text-xs text-blue-600 mt-1">72.3% margin</p>
                    </div>
                  </div>
                </div>

                {/* Income and Expense Pie Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Income Pie Chart */}
                  <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                    <h4 className="font-semibold text-[#191919] mb-4 flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span>Income Distribution</span>
                    </h4>

                    {/* Pie Chart Placeholder */}
                    <div className="relative h-64 flex items-center justify-center mb-4">
                      <div className="relative">
                        <div className="w-48 h-48 rounded-full bg-gradient-to-r from-green-400 via-blue-400 to-purple-400"></div>
                        <div className="absolute inset-8 bg-white rounded-full flex flex-col items-center justify-center">
                          <p className="text-xs text-[#767676]">Total</p>
                          <p className="text-lg font-bold text-[#191919]">6.86B</p>
                        </div>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-500 rounded"></div>
                          <span>Revenue location (91.9%)</span>
                        </div>
                        <span className="font-medium">6,302M XOF</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-blue-500 rounded"></div>
                          <span>Mise à disposition (8.0%)</span>
                        </div>
                        <span className="font-medium">549M XOF</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-purple-500 rounded"></div>
                          <span>Autres (0.1%)</span>
                        </div>
                        <span className="font-medium">8M XOF</span>
                      </div>
                    </div>
                  </div>

                  {/* Expense Pie Chart */}
                  <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                    <h4 className="font-semibold text-[#191919] mb-4 flex items-center space-x-2">
                      <TrendingDown className="w-4 h-4 text-red-600" />
                      <span>Expense Distribution</span>
                    </h4>

                    {/* Pie Chart Placeholder */}
                    <div className="relative h-64 flex items-center justify-center mb-4">
                      <div className="relative">
                        <div className="w-48 h-48 rounded-full bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400"></div>
                        <div className="absolute inset-8 bg-white rounded-full flex flex-col items-center justify-center">
                          <p className="text-xs text-[#767676]">Total</p>
                          <p className="text-lg font-bold text-[#191919]">1.90B</p>
                        </div>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-red-500 rounded"></div>
                          <span>Services extérieurs (38.6%)</span>
                        </div>
                        <span className="font-medium">733M XOF</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-orange-500 rounded"></div>
                          <span>Autres services (26.5%)</span>
                        </div>
                        <span className="font-medium">504M XOF</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                          <span>Impôts et taxes (18.3%)</span>
                        </div>
                        <span className="font-medium">349M XOF</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-amber-500 rounded"></div>
                          <span>Achats (14.3%)</span>
                        </div>
                        <span className="font-medium">273M XOF</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-gray-400 rounded"></div>
                          <span>Autres (2.3%)</span>
                        </div>
                        <span className="font-medium">43M XOF</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Category Tables */}
                <div className="bg-white rounded-lg border border-[#E8E8E8]">
                  <div className="p-4 bg-gray-50 border-b border-[#E8E8E8]">
                    <h4 className="font-semibold text-[#191919]">📋 Detailed Category Analysis</h4>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#444444] uppercase">Category</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-[#444444] uppercase">Type</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-[#444444] uppercase">2024</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-[#444444] uppercase">2025</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-[#444444] uppercase">Total</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-[#444444] uppercase">% of Total</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-[#444444] uppercase">Trend</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {/* Income Categories */}
                        <tr className="bg-green-50">
                          <td className="px-4 py-3 text-sm font-medium text-[#444444]">Revenue de location à bail</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-1 text-xs bg-green-200 text-green-800 rounded">Income</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right">4,913,101,830</td>
                          <td className="px-4 py-3 text-sm text-right">1,389,192,514</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">6,302,294,344</td>
                          <td className="px-4 py-3 text-center text-sm">91.9%</td>
                          <td className="px-4 py-3 text-center">
                            <TrendingDown className="w-4 h-4 text-red-500 inline" />
                          </td>
                        </tr>
                        <tr className="bg-green-50">
                          <td className="px-4 py-3 text-sm font-medium text-[#444444]">Revenus de mises à disposition</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-1 text-xs bg-green-200 text-green-800 rounded">Income</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right">391,631,822</td>
                          <td className="px-4 py-3 text-sm text-right">157,565,954</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">549,197,776</td>
                          <td className="px-4 py-3 text-center text-sm">8.0%</td>
                          <td className="px-4 py-3 text-center">
                            <TrendingDown className="w-4 h-4 text-red-500 inline" />
                          </td>
                        </tr>

                        {/* Expense Categories */}
                        <tr className="bg-red-50">
                          <td className="px-4 py-3 text-sm font-medium text-[#444444]">Services extérieurs</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-1 text-xs bg-red-200 text-red-800 rounded">Expense</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right">340,154,263</td>
                          <td className="px-4 py-3 text-sm text-right">393,245,049</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">733,399,312</td>
                          <td className="px-4 py-3 text-center text-sm">38.6%</td>
                          <td className="px-4 py-3 text-center">
                            <TrendingUp className="w-4 h-4 text-red-500 inline" />
                          </td>
                        </tr>
                        <tr className="bg-red-50">
                          <td className="px-4 py-3 text-sm font-medium text-[#444444]">Autres services extérieurs</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-1 text-xs bg-red-200 text-red-800 rounded">Expense</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right">466,667,422</td>
                          <td className="px-4 py-3 text-sm text-right">37,311,234</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">503,978,656</td>
                          <td className="px-4 py-3 text-center text-sm">26.5%</td>
                          <td className="px-4 py-3 text-center">
                            <TrendingDown className="w-4 h-4 text-green-500 inline" />
                          </td>
                        </tr>
                        <tr className="bg-red-50">
                          <td className="px-4 py-3 text-sm font-medium text-[#444444]">Impôts et taxes</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-1 text-xs bg-red-200 text-red-800 rounded">Expense</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right">221,657,495</td>
                          <td className="px-4 py-3 text-sm text-right">127,263,860</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">348,921,355</td>
                          <td className="px-4 py-3 text-center text-sm">18.3%</td>
                          <td className="px-4 py-3 text-center">
                            <TrendingDown className="w-4 h-4 text-green-500 inline" />
                          </td>
                        </tr>
                        <tr className="bg-red-50">
                          <td className="px-4 py-3 text-sm font-medium text-[#444444]">Achats et variations de stocks</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-1 text-xs bg-red-200 text-red-800 rounded">Expense</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right">177,273,426</td>
                          <td className="px-4 py-3 text-sm text-right">95,585,712</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">272,859,138</td>
                          <td className="px-4 py-3 text-center text-sm">14.3%</td>
                          <td className="px-4 py-3 text-center">
                            <TrendingDown className="w-4 h-4 text-green-500 inline" />
                          </td>
                        </tr>
                      </tbody>
                      <tfoot className="bg-gray-100 font-bold">
                        <tr>
                          <td className="px-4 py-3 text-sm">Net Result</td>
                          <td className="px-4 py-3 text-center" colSpan={2}>
                            <span className="px-2 py-1 text-xs bg-blue-200 text-blue-800 rounded">Result</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right">4,060,260,410</td>
                          <td className="px-4 py-3 text-sm text-right">897,508,927</td>
                          <td className="px-4 py-3 text-sm text-right text-green-600">4,957,769,337</td>
                          <td className="px-4 py-3 text-center">
                            <TrendingDown className="w-4 h-4 text-red-500 inline" />
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
              )}

              {/* Annual Income Overview Dashboard */}
              {selectedAnalysisModel === 'annual-income-overview' && (
              <div className="space-y-6">
                {/* Main Header with KPIs */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-[#191919]">📊 Report Overview Annual Income</h3>
                    <button className="p-2 hover:bg-gray-100 rounded" aria-label="Actualiser">
                      <RefreshCw className="w-4 h-4 text-[#767676]" />
                    </button>
                  </div>

                  {/* Main KPI Cards with Circular Progress */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Circular Progress Indicator */}
                    <div className="flex flex-col items-center justify-center">
                      <div className="relative w-32 h-32">
                        {/* Background circle */}
                        <svg className="transform -rotate-90 w-32 h-32">
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="#E8E8E8"
                            strokeWidth="12"
                            fill="none"
                          />
                          {/* Progress circle */}
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="#6A8A82"
                            strokeWidth="12"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 56}`}
                            strokeDashoffset={`${2 * Math.PI * 56 * (1 - 0.518)}`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <p className="text-xs text-[#767676]">% of budget</p>
                          <p className="text-2xl font-bold text-[#191919]">51.8%</p>
                        </div>
                      </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs text-[#767676] mb-1">Actual income</p>
                      <p className="text-2xl font-bold text-[#6A8A82]">1 485 974 405</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs text-[#767676] mb-1">Income budget</p>
                      <p className="text-2xl font-bold text-red-500">2 869 322 607</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs text-[#767676] mb-1">Balance (XOF)</p>
                      <p className="text-2xl font-bold text-[#191919]">1 383 348 202</p>
                    </div>
                  </div>
                </div>

                {/* Chart and Table Section */}
                <div className="bg-white rounded-lg border border-[#E8E8E8]">
                  <div className="p-4 bg-gray-50 border-b border-[#E8E8E8]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-[#B8B4A0] rounded"></div>
                          <span className="text-xs text-[#444444]">Actual</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-gray-400 rounded"></div>
                          <span className="text-xs text-[#444444]">{t('navigation.budget')}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="p-1 hover:bg-gray-200 rounded" aria-label="Filtrer">
                          <Filter className="w-4 h-4 text-[#767676]" />
                        </button>
                        <button className="p-1 hover:bg-gray-200 rounded" aria-label="Télécharger">
                          <Download className="w-4 h-4 text-[#767676]" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Bar Chart */}
                  <div className="p-6">
                    <div className="h-64 flex items-end justify-between space-x-8 mb-6">
                      {[
                        { year: '2022', actual: 0, budget: 0 },
                        { year: '2023', actual: 0, budget: 0 },
                        { year: '2024', actual: 612596042, budget: 2869322607 },
                        { year: '2025', actual: 873378362, budget: 0 }
                      ].map((data, idx) => {
                        const maxValue = 3000000000;
                        const actualHeight = (data.actual / maxValue) * 100;
                        const budgetHeight = (data.budget / maxValue) * 100;

                        return (
                          <div key={data.year} className="flex-1 flex flex-col items-center">
                            <div className="w-full flex items-end justify-center space-x-2 h-48">
                              <div className="w-1/3 flex flex-col items-center">
                                <div
                                  className="w-full bg-[#B8B4A0] rounded-t transition-all duration-500"
                                  style={{height: `${actualHeight}%`}}
                                  title={`Actual ${data.year}: ${data.actual.toLocaleString()}`}
                                ></div>
                              </div>
                              <div className="w-1/3 flex flex-col items-center">
                                <div
                                  className="w-full bg-gray-400 rounded-t transition-all duration-500"
                                  style={{height: `${budgetHeight}%`}}
                                  title={`Budget ${data.year}: ${data.budget.toLocaleString()}`}
                                ></div>
                              </div>
                            </div>
                            <span className="text-xs text-[#767676] mt-2">{data.year}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Y-axis labels */}
                    <div className="absolute left-6 top-1/2 transform -translate-y-1/2">
                      <div className="flex flex-col justify-between h-48 text-xs text-[#767676]">
                        <span>3,000M</span>
                        <span>2,500M</span>
                        <span>2,000M</span>
                        <span>1,500M</span>
                        <span>1,000M</span>
                        <span>500M</span>
                        <span>0</span>
                      </div>
                    </div>
                  </div>

                  {/* Income Details Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#444444] uppercase">
                            <div className="flex items-center space-x-2">
                              <TrendingUp className="w-4 h-4" />
                              <span>Income</span>
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#444444] uppercase">Years</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-[#444444] uppercase">{t('navigation.budget')}</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-[#444444] uppercase">Actual</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-[#444444] uppercase">Difference(F CFA)</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-[#444444] uppercase">Income - % Budget</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        <tr className="hover:bg-gray-50">
                          <td className="px-4 py-3"></td>
                          <td className="px-4 py-3 text-sm text-[#444444]">2022</td>
                          <td className="px-4 py-3 text-sm text-right">0</td>
                          <td className="px-4 py-3 text-sm text-right">0</td>
                          <td className="px-4 py-3 text-sm text-right">0</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end space-x-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div className="bg-gray-400 h-2 rounded-full" style={{width: '0%'}}></div>
                              </div>
                              <span className="text-xs text-[#767676] w-10 text-right">0%</span>
                            </div>
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="px-4 py-3"></td>
                          <td className="px-4 py-3 text-sm text-[#444444]">2023</td>
                          <td className="px-4 py-3 text-sm text-right">0</td>
                          <td className="px-4 py-3 text-sm text-right">0</td>
                          <td className="px-4 py-3 text-sm text-right">0</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end space-x-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div className="bg-gray-400 h-2 rounded-full" style={{width: '0%'}}></div>
                              </div>
                              <span className="text-xs text-[#767676] w-10 text-right">0%</span>
                            </div>
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="px-4 py-3"></td>
                          <td className="px-4 py-3 text-sm text-[#444444]">2024</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">2 869 322 607</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">612 596 042</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">2 256 726 565</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end space-x-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div className="bg-blue-500 h-2 rounded-full" style={{width: '21.3%'}}></div>
                              </div>
                              <span className="text-xs text-[#767676] w-10 text-right">21.3%</span>
                            </div>
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="px-4 py-3"></td>
                          <td className="px-4 py-3 text-sm text-[#444444]">2025</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">0</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">873 378 362</td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-red-600">-873 378 362</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end space-x-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div className="bg-gray-400 h-2 rounded-full" style={{width: '0%'}}></div>
                              </div>
                              <span className="text-xs text-[#767676] w-10 text-right">0%</span>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                      <tfoot className="bg-gray-50 font-bold">
                        <tr>
                          <td className="px-4 py-3"></td>
                          <td className="px-4 py-3 text-sm">Total</td>
                          <td className="px-4 py-3 text-sm text-right">2 869 322 607</td>
                          <td className="px-4 py-3 text-sm text-right">1 485 974 405</td>
                          <td className="px-4 py-3 text-sm text-right">1 383 348 202</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end space-x-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div className="bg-[#6A8A82] h-2 rounded-full" style={{width: '51.8%'}}></div>
                              </div>
                              <span className="text-xs text-[#191919] w-10 text-right">51.8%</span>
                            </div>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
              )}

              {/* Year N vs N-1 Comparison Model */}
              {selectedAnalysisModel === 'n-1' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-[#191919]">📊 Comparaison Année N vs N-1</h3>
                    <div className="flex items-center space-x-3">
                      <select className="px-3 py-1 border border-[#E8E8E8] rounded text-sm">
                        <option value="2025">2025 vs 2024</option>
                        <option value="2024">2024 vs 2023</option>
                      </select>
                      <button className="p-2 hover:bg-gray-100 rounded" aria-label="Actualiser">
                        <RefreshCw className="w-4 h-4 text-[#767676]" />
                      </button>
                    </div>
                  </div>

                  {/* KPI Comparison Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-xs text-[#767676] mb-1">Revenus N-1 (2024)</p>
                      <p className="text-xl font-bold text-[#191919]">5,280M XOF</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-xs text-[#767676] mb-1">Revenus N (2025)</p>
                      <p className="text-xl font-bold text-green-600">1,580M XOF</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <p className="text-xs text-[#767676] mb-1">Variation</p>
                      <p className="text-xl font-bold text-red-600">-70.1%</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-xs text-[#767676] mb-1">Écart absolu</p>
                      <p className="text-xl font-bold text-purple-600">-3,700M XOF</p>
                    </div>
                  </div>

                  {/* Comparative Bar Chart */}
                  <div className="h-64 bg-gray-50 rounded-lg p-4">
                    <div className="h-full flex items-end justify-around">
                      <div className="flex flex-col items-center">
                        <div className="w-32 bg-blue-500 rounded-t" style={{height: '80%'}}></div>
                        <span className="text-xs mt-2">2024</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-32 bg-green-500 rounded-t" style={{height: '30%'}}></div>
                        <span className="text-xs mt-2">2025</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Comparison Table */}
                <div className="bg-white rounded-lg border border-[#E8E8E8]">
                  <table className="min-w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#444444]">Catégorie</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444]">N-1 (2024)</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444]">N (2025)</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444]">Variation</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[#444444]">%</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[#444444]">Tendance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E8E8]">
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">Revenus location</td>
                        <td className="px-4 py-3 text-sm text-right">4,913,101,830</td>
                        <td className="px-4 py-3 text-sm text-right">1,389,192,514</td>
                        <td className="px-4 py-3 text-sm text-right text-red-600">-3,523,909,316</td>
                        <td className="px-4 py-3 text-sm text-center text-red-600">-71.7%</td>
                        <td className="px-4 py-3 text-center">
                          <TrendingDown className="w-4 h-4 text-red-500 inline" />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              )}

              {/* Forecast vs Actual Model */}
              {selectedAnalysisModel === 'previsions' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-[#191919]">📈 Prévisions vs Réalisé</h3>
                    <button className="p-2 hover:bg-gray-100 rounded" aria-label="Actualiser">
                      <RefreshCw className="w-4 h-4 text-[#767676]" />
                    </button>
                  </div>

                  {/* Accuracy Indicators */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <div className="relative inline-block">
                        <svg className="transform -rotate-90 w-24 h-24">
                          <circle cx="48" cy="48" r="40" stroke="#E8E8E8" strokeWidth="8" fill="none" />
                          <circle cx="48" cy="48" r="40" stroke="#6A8A82" strokeWidth="8" fill="none"
                            strokeDasharray={`${2 * Math.PI * 40}`}
                            strokeDashoffset={`${2 * Math.PI * 40 * (1 - 0.85)}`}
                            strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-bold">85%</span>
                        </div>
                      </div>
                      <p className="text-sm text-[#767676] mt-2">Précision globale</p>
                    </div>
                    <div className="text-center">
                      <div className="relative inline-block">
                        <svg className="transform -rotate-90 w-24 h-24">
                          <circle cx="48" cy="48" r="40" stroke="#E8E8E8" strokeWidth="8" fill="none" />
                          <circle cx="48" cy="48" r="40" stroke="#B87333" strokeWidth="8" fill="none"
                            strokeDasharray={`${2 * Math.PI * 40}`}
                            strokeDashoffset={`${2 * Math.PI * 40 * (1 - 0.72)}`}
                            strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-bold">72%</span>
                        </div>
                      </div>
                      <p className="text-sm text-[#767676] mt-2">Revenus</p>
                    </div>
                    <div className="text-center">
                      <div className="relative inline-block">
                        <svg className="transform -rotate-90 w-24 h-24">
                          <circle cx="48" cy="48" r="40" stroke="#E8E8E8" strokeWidth="8" fill="none" />
                          <circle cx="48" cy="48" r="40" stroke="#DC2626" strokeWidth="8" fill="none"
                            strokeDasharray={`${2 * Math.PI * 40}`}
                            strokeDashoffset={`${2 * Math.PI * 40 * (1 - 0.93)}`}
                            strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-bold">93%</span>
                        </div>
                      </div>
                      <p className="text-sm text-[#767676] mt-2">Dépenses</p>
                    </div>
                  </div>

                  {/* Monthly Forecast Table */}
                  <table className="min-w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#444444]">Mois</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444]">Prévision</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444]">Réalisé</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444]">Écart</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[#444444]">Précision</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E8E8]">
                      {['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin'].map((mois, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{mois}</td>
                          <td className="px-4 py-3 text-sm text-right">450,000,000</td>
                          <td className="px-4 py-3 text-sm text-right">425,000,000</td>
                          <td className="px-4 py-3 text-sm text-right text-red-600">-25,000,000</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">94.4%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              )}

              {/* Quarter vs Previous Quarter Model */}
              {selectedAnalysisModel === 'trimestre' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-[#191919]">📅 Trimestre vs Trimestre Précédent</h3>
                    <select className="px-3 py-1 border border-[#E8E8E8] rounded text-sm">
                      <option>Q3 2025 vs Q2 2025</option>
                      <option>Q2 2025 vs Q1 2025</option>
                      <option>Q1 2025 vs Q4 2024</option>
                    </select>
                  </div>

                  {/* Quarter Performance Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                      <p className="text-xs text-blue-600 mb-1">Q2 2025</p>
                      <p className="text-xl font-bold">1,250M XOF</p>
                      <p className="text-xs text-blue-600 mt-1">Trimestre précédent</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                      <p className="text-xs text-green-600 mb-1">Q3 2025</p>
                      <p className="text-xl font-bold">1,480M XOF</p>
                      <p className="text-xs text-green-600 mt-1">Trimestre actuel</p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
                      <p className="text-xs text-orange-600 mb-1">Croissance</p>
                      <p className="text-xl font-bold text-green-600">+18.4%</p>
                      <p className="text-xs text-orange-600 mt-1">vs Q2</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                      <p className="text-xs text-purple-600 mb-1">Objectif Q3</p>
                      <p className="text-xl font-bold">1,500M XOF</p>
                      <p className="text-xs text-green-600 mt-1">98.7% atteint</p>
                    </div>
                  </div>

                  {/* Quarterly Trend Chart */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="h-48 flex items-end justify-between space-x-4">
                      {['Q1', 'Q2', 'Q3', 'Q4'].map((quarter, idx) => (
                        <div key={quarter} className="flex-1 flex flex-col items-center">
                          <div className={`w-full rounded-t ${idx === 2 ? 'bg-green-500' : idx === 1 ? 'bg-blue-500' : 'bg-gray-400'}`}
                            style={{height: `${[60, 70, 85, 40][idx]}%`}}></div>
                          <span className="text-xs mt-2">{quarter}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              )}

              {/* Month vs Previous Month Model */}
              {selectedAnalysisModel === 'mensuel' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-[#191919]">📆 Mois vs Mois Précédent</h3>
                    <select className="px-3 py-1 border border-[#E8E8E8] rounded text-sm">
                      <option>Septembre vs Août 2025</option>
                      <option>Août vs Juillet 2025</option>
                    </select>
                  </div>

                  {/* Monthly Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white border border-[#E8E8E8] rounded-lg p-4">
                      <h4 className="text-sm font-medium text-[#444444] mb-4">Performance Mensuelle</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[#767676]">Août 2025</span>
                          <span className="text-sm font-medium">420M XOF</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[#767676]">Septembre 2025</span>
                          <span className="text-sm font-medium text-green-600">485M XOF</span>
                        </div>
                        <div className="border-t pt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Variation</span>
                            <span className="text-sm font-bold text-green-600">+15.5%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-[#E8E8E8] rounded-lg p-4">
                      <h4 className="text-sm font-medium text-[#444444] mb-4">Top Variations</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-[#767676]">Revenus location</span>
                          <span className="text-xs font-medium text-green-600">+22.3%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-[#767676]">Services</span>
                          <span className="text-xs font-medium text-red-600">-8.2%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-[#767676]">Autres</span>
                          <span className="text-xs font-medium text-green-600">+5.1%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              )}

              {/* 3-Month Moving Average Model */}
              {selectedAnalysisModel === 'glissant' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-[#191919]">📉 Moyenne Glissante 3 Mois</h3>
                    <button className="p-2 hover:bg-gray-100 rounded" aria-label="Actualiser">
                      <RefreshCw className="w-4 h-4 text-[#767676]" />
                    </button>
                  </div>

                  {/* Moving Average Chart */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="h-64 relative">
                      {/* Simulated line chart */}
                      <svg className="w-full h-full">
                        <polyline
                          points="50,200 100,180 150,150 200,140 250,120 300,110 350,100 400,95 450,90 500,85"
                          stroke="#6A8A82"
                          strokeWidth="2"
                          fill="none"
                        />
                        <polyline
                          points="50,210 100,190 150,170 200,160 250,140 300,130 350,120 400,110 450,100 500,95"
                          stroke="#B87333"
                          strokeWidth="2"
                          fill="none"
                          strokeDasharray="5,5"
                        />
                      </svg>
                      <div className="absolute bottom-0 left-0 flex items-center space-x-4 text-xs">
                        <div className="flex items-center space-x-1">
                          <div className="w-4 h-0.5 bg-[#6A8A82]"></div>
                          <span>Moyenne mobile</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-4 h-0.5 bg-[#B87333] border-dashed"></div>
                          <span>Valeurs réelles</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Moving Average Table */}
                  <table className="min-w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#444444]">Période</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444]">Valeur Réelle</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444]">Moy. 3 mois</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[#444444]">Tendance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E8E8]">
                      {['Jul-Sep', 'Août-Oct', 'Sep-Nov'].map((period, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{period}</td>
                          <td className="px-4 py-3 text-sm text-right">450,000,000</td>
                          <td className="px-4 py-3 text-sm text-right">435,000,000</td>
                          <td className="px-4 py-3 text-center">
                            <TrendingUp className="w-4 h-4 text-green-500 inline" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              )}

              {/* Goals vs Actual Model */}
              {selectedAnalysisModel === 'objectifs' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-[#191919]">🎯 Objectifs vs Réalisé</h3>
                    <button className="p-2 hover:bg-gray-100 rounded" aria-label="Actualiser">
                      <RefreshCw className="w-4 h-4 text-[#767676]" />
                    </button>
                  </div>

                  {/* Goals Progress */}
                  <div className="space-y-4 mb-6">
                    {[
                      { name: 'Chiffre d\'affaires', target: 1000, actual: 850, unit: 'M XOF' },
                      { name: 'Marge brute', target: 45, actual: 42, unit: '%' },
                      { name: 'Nouveaux clients', target: 50, actual: 47, unit: '' },
                      { name: 'Taux de rétention', target: 90, actual: 88, unit: '%' }
                    ].map((goal, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-[#444444]">{goal.name}</span>
                          <span className="text-sm text-[#767676]">
                            {goal.actual}{goal.unit} / {goal.target}{goal.unit}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full ${goal.actual >= goal.target ? 'bg-green-500' : 'bg-yellow-500'}`}
                            style={{width: `${Math.min((goal.actual / goal.target) * 100, 100)}%`}}
                          ></div>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-[#767676]">Progression</span>
                          <span className={`text-xs font-medium ${goal.actual >= goal.target ? 'text-green-600' : 'text-yellow-600'}`}>
                            {((goal.actual / goal.target) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              )}

              {/* Sector Benchmark Model */}
              {selectedAnalysisModel === 'benchmark' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-[#191919]">📊 Benchmark Sectoriel</h3>
                    <button className="p-2 hover:bg-gray-100 rounded" aria-label="Actualiser">
                      <RefreshCw className="w-4 h-4 text-[#767676]" />
                    </button>
                  </div>

                  {/* Benchmark Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="text-center">
                      <h4 className="text-sm font-medium text-[#444444] mb-3">Votre Performance</h4>
                      <div className="text-3xl font-bold text-[#6A8A82]">72.3%</div>
                      <p className="text-xs text-[#767676] mt-1">Marge opérationnelle</p>
                    </div>
                    <div className="text-center">
                      <h4 className="text-sm font-medium text-[#444444] mb-3">Moyenne Secteur</h4>
                      <div className="text-3xl font-bold text-[#B87333]">65.5%</div>
                      <p className="text-xs text-[#767676] mt-1">Marge opérationnelle</p>
                    </div>
                    <div className="text-center">
                      <h4 className="text-sm font-medium text-[#444444] mb-3">Position</h4>
                      <div className="text-3xl font-bold text-green-600">Top 25%</div>
                      <p className="text-xs text-[#767676] mt-1">Dans le secteur</p>
                    </div>
                  </div>

                  {/* Detailed Benchmark Table */}
                  <table className="min-w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#444444]">Indicateur</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444]">Vous</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444]">Secteur</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444]">Top 10%</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[#444444]">Position</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E8E8]">
                      {[
                        { name: 'ROI', yours: 18.5, sector: 15.2, top: 22.3 },
                        { name: 'Croissance CA', yours: 12.3, sector: 8.5, top: 15.7 },
                        { name: 'Productivité', yours: 145, sector: 132, top: 168 }
                      ].map((metric, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{metric.name}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">{metric.yours}%</td>
                          <td className="px-4 py-3 text-sm text-right">{metric.sector}%</td>
                          <td className="px-4 py-3 text-sm text-right">{metric.top}%</td>
                          <td className="px-4 py-3 text-center">
                            {metric.yours > metric.sector ? (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Au-dessus</span>
                            ) : (
                              <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">En-dessous</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              )}

              {/* Optimistic/Pessimistic Scenario Model */}
              {selectedAnalysisModel === 'scenario' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-[#191919]">🔮 Scénarios Optimiste/Pessimiste</h3>
                    <button className="p-2 hover:bg-gray-100 rounded" aria-label="Actualiser">
                      <RefreshCw className="w-4 h-4 text-[#767676]" />
                    </button>
                  </div>

                  {/* Scenario Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <h4 className="text-sm font-medium text-red-800 mb-2">Scénario Pessimiste</h4>
                      <p className="text-2xl font-bold text-red-900">850M XOF</p>
                      <p className="text-xs text-red-600 mt-1">-15% vs prévu</p>
                      <div className="mt-3 space-y-1">
                        <p className="text-xs text-red-700">• Baisse demande 20%</p>
                        <p className="text-xs text-red-700">• Retards paiements</p>
                        <p className="text-xs text-red-700">• Coûts +10%</p>
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">Scénario Réaliste</h4>
                      <p className="text-2xl font-bold text-blue-900">1,000M XOF</p>
                      <p className="text-xs text-blue-600 mt-1">Conforme aux prévisions</p>
                      <div className="mt-3 space-y-1">
                        <p className="text-xs text-blue-700">• Croissance stable</p>
                        <p className="text-xs text-blue-700">• Marché constant</p>
                        <p className="text-xs text-blue-700">• Coûts maîtrisés</p>
                      </div>
                    </div>

                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <h4 className="text-sm font-medium text-green-800 mb-2">Scénario Optimiste</h4>
                      <p className="text-2xl font-bold text-green-900">1,250M XOF</p>
                      <p className="text-xs text-green-600 mt-1">+25% vs prévu</p>
                      <div className="mt-3 space-y-1">
                        <p className="text-xs text-green-700">• Nouveaux contrats</p>
                        <p className="text-xs text-green-700">• Expansion marché</p>
                        <p className="text-xs text-green-700">• Optimisation coûts</p>
                      </div>
                    </div>
                  </div>

                  {/* Scenario Impact Table */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-[#444444] mb-3">Impact par Catégorie</h4>
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="px-4 py-2 text-left text-xs font-medium text-[#444444]">Catégorie</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-red-600">Pessimiste</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-blue-600">Réaliste</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-green-600">Optimiste</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {[
                          { name: 'Revenus', pessimiste: 850, realiste: 1000, optimiste: 1250 },
                          { name: 'Coûts', pessimiste: 680, realiste: 600, optimiste: 550 },
                          { name: 'Résultat', pessimiste: 170, realiste: 400, optimiste: 700 }
                        ].map((row, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-xs">{row.name}</td>
                            <td className="px-4 py-2 text-xs text-right">{row.pessimiste}M</td>
                            <td className="px-4 py-2 text-xs text-right">{row.realiste}M</td>
                            <td className="px-4 py-2 text-xs text-right">{row.optimiste}M</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              )}
            </div>
        )}

          {analyseSubTab === 'causes' && activeTab === 'analyse' && (
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
              <h3 className="font-semibold text-[#191919] mb-4">🎯 Analyse des causes</h3>
              <div className="space-y-4">
                {[
                  {
                    ecart: 'Achats matières premières (+22.5%)',
                    causes: [
                      'Hausse des prix des matières premières (+15%)',
                      'Volume de production supérieur (+8%)',
                      'Changement de fournisseur'
                    ],
                    action: 'Renégociation contrats fournisseurs'
                  },
                  {
                    ecart: 'Services externes (-16.7%)',
                    causes: [
                      'Internalisation de certaines prestations',
                      'Optimisation des contrats'
                    ],
                    action: 'Maintenir la stratégie'
                  },
                  {
                    ecart: 'Marketing (-24%)',
                    causes: [
                      'Report campagne Q4',
                      'Économies sur digital'
                    ],
                    action: 'Réallouer budget Q4'
                  }
                ].map((analyse, index) => (
                  <div key={index} className="border border-[#E8E8E8] rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-[#191919] mb-2">{analyse.ecart}</h4>
                    <div className="space-y-1 mb-2">
                      {analyse.causes.map((cause, idx) => (
                        <p key={idx} className="text-xs text-[#767676] pl-3">• {cause}</p>
                      ))}
                    </div>
                    <div className="flex items-center space-x-2 pt-2 border-t border-[#E8E8E8]">
                      <AlertTriangle className="w-3 h-3 text-[#B87333]" />
                      <p className="text-xs font-medium text-[#B87333]">Action: {analyse.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analyseSubTab === 'tendances' && activeTab === 'analyse' && (
            <div className="space-y-6">
              {/* Trend Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <span className="text-xs text-green-600 font-medium">+24.3%</span>
                  </div>
                  <p className="text-xs text-[#767676] mb-1">Tendance Globale</p>
                  <p className="text-xl font-bold text-[#191919]">Croissance</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                  <div className="flex items-center justify-between mb-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    <span className="text-xs text-blue-600 font-medium">3.2x</span>
                  </div>
                  <p className="text-xs text-[#767676] mb-1">Volatilité</p>
                  <p className="text-xl font-bold text-[#191919]">Modérée</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                  <div className="flex items-center justify-between mb-2">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                    <span className="text-xs text-purple-600 font-medium">Q3</span>
                  </div>
                  <p className="text-xs text-[#767676] mb-1">Meilleure Période</p>
                  <p className="text-xl font-bold text-[#191919]">Juillet-Sept</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                  <div className="flex items-center justify-between mb-2">
                    <Calendar className="w-5 h-5 text-orange-600" />
                    <span className="text-xs text-orange-600 font-medium">12 mois</span>
                  </div>
                  <p className="text-xs text-[#767676] mb-1">Cycle Détecté</p>
                  <p className="text-xl font-bold text-[#191919]">Annuel</p>
                </div>
              </div>

              {/* Multi-Year Trend Chart */}
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-[#191919]">📈 Évolution sur 4 ans</h3>
                  <div className="flex items-center space-x-3">
                    <select className="px-3 py-1 border border-[#E8E8E8] rounded text-sm">
                      <option>Revenus</option>
                      <option>Dépenses</option>
                      <option>Résultat Net</option>
                    </select>
                    <button className="p-2 hover:bg-gray-100 rounded" aria-label="Actualiser">
                      <RefreshCw className="w-4 h-4 text-[#767676]" />
                    </button>
                  </div>
                </div>

                {/* Line Chart */}
                <div className="h-64 bg-gray-50 rounded-lg p-4 relative">
                  <svg className="w-full h-full">
                    {/* Grid lines */}
                    {[0, 1, 2, 3, 4].map((i) => (
                      <line
                        key={i}
                        x1="0"
                        y1={`${i * 25}%`}
                        x2="100%"
                        y2={`${i * 25}%`}
                        stroke="#E8E8E8"
                        strokeWidth="1"
                      />
                    ))}
                    {/* Trend line */}
                    <polyline
                      points="10,90 25,85 40,70 55,60 70,45 85,40 100,35 115,30 130,28 145,25 160,20 175,18"
                      stroke="#6A8A82"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Data points */}
                    {[
                      {x: 10, y: 90}, {x: 40, y: 70}, {x: 70, y: 45},
                      {x: 100, y: 35}, {x: 130, y: 28}, {x: 160, y: 20}
                    ].map((point, idx) => (
                      <circle
                        key={idx}
                        cx={`${point.x}`}
                        cy={`${point.y}%`}
                        r="4"
                        fill="#6A8A82"
                        stroke="white"
                        strokeWidth="2"
                      />
                    ))}
                  </svg>
                  <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-[#767676] px-2">
                    <span>2022</span>
                    <span>2023</span>
                    <span>2024</span>
                    <span>2025</span>
                  </div>
                </div>

                {/* Trend Statistics */}
                <div className="grid grid-cols-4 gap-4 mt-4">
                  <div className="text-center">
                    <p className="text-xs text-[#767676]">Croissance Moyenne</p>
                    <p className="text-lg font-bold text-green-600">+18.5%/an</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-[#767676]">Point Haut</p>
                    <p className="text-lg font-bold text-[#191919]">5.28B XOF</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-[#767676]">Point Bas</p>
                    <p className="text-lg font-bold text-[#191919]">1.58B XOF</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-[#767676]">Projection 2026</p>
                    <p className="text-lg font-bold text-blue-600">2.35B XOF</p>
                  </div>
                </div>
              </div>

              {/* Seasonal Trends */}
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <h3 className="font-semibold text-[#191919] mb-4">🗓️ Tendances Saisonnières</h3>
                <div className="grid grid-cols-12 gap-2">
                  {['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'].map((month, idx) => {
                    const performance = [65, 70, 85, 80, 75, 90, 95, 92, 88, 82, 78, 72][idx];
                    const color = performance >= 85 ? 'bg-green-500' : performance >= 75 ? 'bg-yellow-500' : 'bg-red-500';

                    return (
                      <div key={month} className="text-center">
                        <div className={`h-20 ${color} rounded-t opacity-${Math.floor(performance / 10)}0 relative`}>
                          <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-90 rounded px-1">
                            <span className="text-xs font-medium">{performance}%</span>
                          </div>
                        </div>
                        <p className="text-xs text-[#767676] mt-1">{month}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-center space-x-6 mt-4 text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>Haute performance (≥85%)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                    <span>Performance moyenne (75-84%)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span>Basse performance (&lt;75%)</span>
                  </div>
                </div>
              </div>

              {/* Category Trends */}
              <div className="bg-white rounded-lg border border-[#E8E8E8]">
                <div className="p-4 bg-gray-50 border-b border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919]">📊 Tendances par Catégorie</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#444444]">Catégorie</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[#444444]">Tendance 6M</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[#444444]">Tendance 12M</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[#444444]">Momentum</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[#444444]">Prévision</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[#444444]">Signal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E8E8]">
                      {[
                        { name: 'Revenus Location', trend6: '+12%', trend12: '+25%', momentum: 'Fort', forecast: 'Hausse', signal: 'buy' },
                        { name: 'Services', trend6: '-5%', trend12: '+8%', momentum: 'Faible', forecast: 'Stable', signal: 'hold' },
                        { name: 'Autres Revenus', trend6: '+3%', trend12: '+15%', momentum: 'Modéré', forecast: 'Hausse', signal: 'buy' },
                        { name: 'Charges Fixes', trend6: '+2%', trend12: '+5%', momentum: 'Stable', forecast: 'Stable', signal: 'hold' },
                        { name: 'Charges Variables', trend6: '-8%', trend12: '-12%', momentum: 'Négatif', forecast: 'Baisse', signal: 'sell' }
                      ].map((cat, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium">{cat.name}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-sm font-medium ${cat.trend6.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                              {cat.trend6}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-sm font-medium ${cat.trend12.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                              {cat.trend12}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 text-xs rounded ${
                              cat.momentum === 'Fort' ? 'bg-green-100 text-green-800' :
                              cat.momentum === 'Modéré' ? 'bg-yellow-100 text-yellow-800' :
                              cat.momentum === 'Stable' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {cat.momentum}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-sm">{cat.forecast}</td>
                          <td className="px-4 py-3 text-center">
                            {cat.signal === 'buy' ? (
                              <TrendingUp className="w-4 h-4 text-green-500 inline" />
                            ) : cat.signal === 'sell' ? (
                              <TrendingDown className="w-4 h-4 text-red-500 inline" />
                            ) : (
                              <Minus className="w-4 h-4 text-gray-700 inline" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {analyseSubTab === 'comparatif' && activeTab === 'analyse' && (
            <div className="space-y-6">
              {/* Comparison Filters */}
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#191919]">🔄 Paramètres de Comparaison</h3>
                  <button className="px-4 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323] text-sm">
                    Appliquer
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#444444] mb-2">Type de comparaison</label>
                    <select className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm">
                      <option>Département vs Département</option>
                      <option>Période vs Période</option>
                      <option>Budget vs Actual</option>
                      <option>Projet vs Projet</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#444444] mb-2">Élément 1</label>
                    <select className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm">
                      <option>Finance & Comptabilité</option>
                      <option>Ressources Humaines</option>
                      <option>IT & Digital</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#444444] mb-2">Élément 2</label>
                    <select className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm">
                      <option>Marketing & Commercial</option>
                      <option>Opérations</option>
                      <option>Direction Générale</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#444444] mb-2">Période</label>
                    <select className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm">
                      <option>YTD 2025</option>
                      <option>Q3 2025</option>
                      <option>Année 2024</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Comparison Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Element 1 Card */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-blue-900">Finance & Comptabilité</h4>
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-700">Budget Total</span>
                      <span className="text-sm font-bold text-blue-900">850M XOF</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-700">Dépenses Réelles</span>
                      <span className="text-sm font-bold text-blue-900">720M XOF</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-700">Taux d'exécution</span>
                      <span className="text-sm font-bold text-green-600">84.7%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-700">Écart</span>
                      <span className="text-sm font-bold text-green-600">-130M XOF</span>
                    </div>
                  </div>
                </div>

                {/* Element 2 Card */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-purple-900">Marketing & Commercial</h4>
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-purple-700">Budget Total</span>
                      <span className="text-sm font-bold text-purple-900">650M XOF</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-purple-700">Dépenses Réelles</span>
                      <span className="text-sm font-bold text-purple-900">680M XOF</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-purple-700">Taux d'exécution</span>
                      <span className="text-sm font-bold text-red-600">104.6%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-purple-700">Écart</span>
                      <span className="text-sm font-bold text-red-600">+30M XOF</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comparative Charts */}
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <h3 className="font-semibold text-[#191919] mb-4">📊 Visualisation Comparative</h3>

                {/* Side-by-side Bar Chart */}
                <div className="h-64 bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="h-full flex items-end justify-around">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="flex items-end space-x-2">
                        <div className="w-16 bg-blue-500 rounded-t" style={{height: '180px'}}></div>
                        <div className="w-16 bg-purple-500 rounded-t" style={{height: '150px'}}></div>
                      </div>
                      <span className="text-xs text-[#767676]">{t('navigation.budget')}</span>
                    </div>
                    <div className="flex flex-col items-center space-y-2">
                      <div className="flex items-end space-x-2">
                        <div className="w-16 bg-blue-400 rounded-t" style={{height: '160px'}}></div>
                        <div className="w-16 bg-purple-400 rounded-t" style={{height: '170px'}}></div>
                      </div>
                      <span className="text-xs text-[#767676]">Réalisé</span>
                    </div>
                    <div className="flex flex-col items-center space-y-2">
                      <div className="flex items-end space-x-2">
                        <div className="w-16 bg-blue-300 rounded-t" style={{height: '140px'}}></div>
                        <div className="w-16 bg-purple-300 rounded-t" style={{height: '120px'}}></div>
                      </div>
                      <span className="text-xs text-[#767676]">Projection</span>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center space-x-6 text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>Finance & Comptabilité</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-purple-500 rounded"></div>
                    <span>Marketing & Commercial</span>
                  </div>
                </div>
              </div>

              {/* Detailed Comparison Table */}
              <div className="bg-white rounded-lg border border-[#E8E8E8]">
                <div className="p-4 bg-gray-50 border-b border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919]">📋 Comparaison Détaillée</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#444444]">Indicateur</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-blue-600" colSpan={2}>Finance & Comptabilité</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-purple-600" colSpan={2}>Marketing & Commercial</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[#444444]">Différence</th>
                      </tr>
                      <tr>
                        <th className="px-4 py-3"></th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#767676]">Valeur</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[#767676]">%</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#767676]">Valeur</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[#767676]">%</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E8E8]">
                      {[
                        {
                          name: 'Masse Salariale',
                          dept1: { value: 450000000, percent: 62.5 },
                          dept2: { value: 320000000, percent: 47.1 }
                        },
                        {
                          name: 'Frais Opérationnels',
                          dept1: { value: 180000000, percent: 25.0 },
                          dept2: { value: 220000000, percent: 32.4 }
                        },
                        {
                          name: 'Investissements',
                          dept1: { value: 50000000, percent: 6.9 },
                          dept2: { value: 80000000, percent: 11.8 }
                        },
                        {
                          name: 'Autres Charges',
                          dept1: { value: 40000000, percent: 5.6 },
                          dept2: { value: 60000000, percent: 8.8 }
                        }
                      ].map((row, idx) => {
                        const diff = row.dept1.value - row.dept2.value;
                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium">{row.name}</td>
                            <td className="px-4 py-3 text-sm text-right">{row.dept1.value.toLocaleString()}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-xs text-blue-600">{row.dept1.percent}%</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-right">{row.dept2.value.toLocaleString()}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-xs text-purple-600">{row.dept2.percent}%</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-sm font-medium ${diff > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {diff > 0 ? '+' : ''}{(diff / 1000000).toFixed(0)}M
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-gray-100 font-bold">
                        <td className="px-4 py-3 text-sm">Total</td>
                        <td className="px-4 py-3 text-sm text-right">720,000,000</td>
                        <td className="px-4 py-3 text-center text-blue-600">100%</td>
                        <td className="px-4 py-3 text-sm text-right">680,000,000</td>
                        <td className="px-4 py-3 text-center text-purple-600">100%</td>
                        <td className="px-4 py-3 text-center text-green-600">+40M</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Performance Metrics Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                  <h4 className="text-sm font-medium text-[#444444] mb-3">Efficacité Budgétaire</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-blue-600">Finance</span>
                      <div className="flex-1 mx-2 bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{width: '84.7%'}}></div>
                      </div>
                      <span className="text-xs font-medium">84.7%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-purple-600">Marketing</span>
                      <div className="flex-1 mx-2 bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{width: '104.6%'}}></div>
                      </div>
                      <span className="text-xs font-medium">104.6%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                  <h4 className="text-sm font-medium text-[#444444] mb-3">ROI</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-blue-600">Finance</span>
                      <span className="text-sm font-bold text-green-600">18.5%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-purple-600">Marketing</span>
                      <span className="text-sm font-bold text-green-600">22.3%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                  <h4 className="text-sm font-medium text-[#444444] mb-3">Performance Score</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-blue-600">Finance</span>
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">A+</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-purple-600">Marketing</span>
                      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">B+</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Onglet Budgets - Saisie Matricielle Détaillée */}
          {activeTab === 'budgets' && (
            <div className="space-y-6">
              {/* Filtres de saisie */}
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[#191919]">📊 Consultation Budgétaire Détaillée</h3>
                  <div className="flex items-center space-x-3">
                    <button className="flex items-center space-x-2 px-3 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors">
                      <FileDown className="w-4 h-4" />
                      <span className="text-sm">Exporter Excel</span>
                    </button>
                    <button className="flex items-center space-x-2 px-3 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323] transition-colors" aria-label="Actualiser">
                      <RefreshCw className="w-4 h-4" />
                      <span className="text-sm">{t('common.refresh')}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Département</label>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#B87333] focus:border-transparent"
                    >
                      {departements.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Année</label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#B87333] focus:border-transparent"
                    >
                      <option value="2024">2024</option>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Mois</label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#B87333] focus:border-transparent"
                    >
                      {mois.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Actions</label>
                    <button className="w-full flex items-center justify-center space-x-2 px-3 py-2 border border-[#E8E8E8] rounded-lg hover:bg-gray-50 transition-colors">
                      <Calculator className="w-4 h-4" />
                      <span className="text-sm">Calculer</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Grille de saisie matricielle */}
              <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-[#E8E8E8]">
                  <h4 className="font-medium text-[#191919]">
                    Consultation {selectedDepartment} - {selectedMonth} {selectedYear}
                  </h4>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#444444] uppercase tracking-wider w-20"></th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#444444] uppercase tracking-wider">{t('accounting.account')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#444444] uppercase tracking-wider">{t('accounting.label')}</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444] uppercase tracking-wider">{t('navigation.budget')}</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444] uppercase tracking-wider">Réel</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444] uppercase tracking-wider">N-1</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444] uppercase tracking-wider">Var %</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[#444444] uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {comptes.map((compte) => (
                        <React.Fragment key={compte.code}>
                          {/* Ligne principale du compte */}
                          <tr className="bg-blue-50">
                            <td className="px-4 py-3">
                              <button
                                onClick={() => toggleAccountExpansion(compte.code)}
                                className="flex items-center justify-center w-6 h-6 rounded hover:bg-blue-100 transition-colors"
                              >
                                {expandedAccounts[compte.code] ?
                                  <ChevronDown className="w-4 h-4 text-blue-600" /> :
                                  <ChevronRight className="w-4 h-4 text-blue-600" />
                                }
                              </button>
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-blue-900">{compte.code}</td>
                            <td className="px-4 py-3 text-sm font-medium text-blue-900">{compte.libelle}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-blue-900">
                              {formatCurrency(compte.budget)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-[#444444]">
                              {formatCurrency(compte.reel)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-[#767676]">
                              {formatCurrency(compte.nMoins1)}
                            </td>
                            <td className={`px-4 py-3 text-sm text-right font-medium ${getVarianceColor(((compte.reel / compte.budget) - 1) * 100)}`}>
                              {(((compte.reel / compte.budget) - 1) * 100).toFixed(1)}%
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button className="text-blue-600 hover:text-blue-800 transition-colors" aria-label="Voir les détails">
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>

                          {/* Sous-comptes (expandable) */}
                          {expandedAccounts[compte.code] && compte.sousComptes.map((sousCompte) => (
                            <tr key={sousCompte.code} className="bg-gray-50">
                              <td className="px-4 py-2"></td>
                              <td className="px-4 py-2 pl-8 text-sm text-[#444444]">{sousCompte.code}</td>
                              <td className="px-4 py-2 text-sm text-[#444444]">{sousCompte.libelle}</td>
                              <td className="px-4 py-2 text-sm text-right text-[#444444]">
                                {formatCurrency(sousCompte.budget)}
                              </td>
                              <td className="px-4 py-2 text-sm text-right text-[#444444]">
                                {formatCurrency(sousCompte.reel)}
                              </td>
                              <td className="px-4 py-2 text-sm text-right text-[#767676]">
                                {formatCurrency(sousCompte.nMoins1)}
                              </td>
                              <td className={`px-4 py-2 text-sm text-right ${getVarianceColor(((sousCompte.reel / sousCompte.budget) - 1) * 100)}`}>
                                {(((sousCompte.reel / sousCompte.budget) - 1) * 100).toFixed(1)}%
                              </td>
                              <td className="px-4 py-2 text-center">
                                <button className="text-blue-600 hover:text-blue-800 transition-colors" aria-label="Voir les détails">
                                  <Eye className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totaux */}
                <div className="p-4 bg-gray-50 border-t border-[#E8E8E8]">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-[#444444]">Total {selectedDepartment}:</span>
                    <div className="flex space-x-6 text-sm font-medium">
                      <span className="text-blue-900">
                        Budget: {formatCurrency(comptes.reduce((sum, c) => sum + c.budget, 0))}
                      </span>
                      <span className="text-[#444444]">
                        Réel: {formatCurrency(comptes.reduce((sum, c) => sum + c.reel, 0))}
                      </span>
                      <span className="text-[#767676]">
                        N-1: {formatCurrency(comptes.reduce((sum, c) => sum + c.nMoins1, 0))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Onglet Suivi Réel/Budget - Comparaisons Détaillées */}
          {activeTab === 'suivi' && (
            <div className="space-y-6">
              {/* Dashboard comparatif principal */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Vue d'ensemble YTD */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919] mb-4">📊 Performance YTD</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#444444]">Budget YTD</span>
                      <span className="font-medium text-blue-900">2,850K€</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#444444]">Réel YTD</span>
                      <span className="font-medium text-[#444444]">2,680K€</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#444444]">Écart</span>
                      <span className="font-medium text-green-600">-170K€ (-6.0%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mt-4">
                      <div className="bg-[#6A8A82] h-3 rounded-full" style={{width: '94%'}}></div>
                    </div>
                    <p className="text-xs text-center text-[#767676]">94% de réalisation</p>
                  </div>
                </div>

                {/* Comparaison N-1 */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919] mb-4">📈 Comparaison N-1</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#444444]">Réel 2024</span>
                      <span className="font-medium text-[#767676]">2,550K€</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#444444]">Réel 2025</span>
                      <span className="font-medium text-[#444444]">2,680K€</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#444444]">Croissance</span>
                      <span className="font-medium text-[#6A8A82]">+130K€ (+5.1%)</span>
                    </div>
                    <div className="bg-gradient-to-r from-[#767676] to-[#6A8A82] h-3 rounded-full mt-4"></div>
                    <p className="text-xs text-center text-[#767676]">Tendance positive</p>
                  </div>
                </div>

                {/* Alertes actives */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919] mb-4">🚨 Alertes Actives</h3>
                  <div className="space-y-3">
                    {alertes.slice(0, 3).map((alerte) => (
                      <div key={alerte.id} className={`p-3 rounded-lg border-l-4 ${
                        alerte.niveau === 'CRITIQUE' ? 'bg-red-50 border-red-400' :
                        alerte.niveau === 'ATTENTION' ? 'bg-yellow-50 border-yellow-400' :
                        'bg-blue-50 border-blue-400'
                      }`}>
                        <p className="text-xs font-medium">{alerte.compte}</p>
                        <p className="text-xs text-[#767676]">{alerte.ecart > 0 ? '+' : ''}{alerte.ecart}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Graphique comparatif mensuel */}
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-[#191919]">📊 Évolution Mensuelle - Budget vs Réel</h3>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-xs text-[#444444]">{t('navigation.budget')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-[#6A8A82] rounded-full"></div>
                      <span className="text-xs text-[#444444]">Réel</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-[#767676] rounded-full"></div>
                      <span className="text-xs text-[#444444]">N-1</span>
                    </div>
                  </div>
                </div>

                {/* Simulation graphique simple avec CSS */}
                <div className="h-64 border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="h-full flex items-end justify-between space-x-2">
                    {['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep'].map((mois, index) => {
                      const budgetHeight = Math.random() * 60 + 20;
                      const reelHeight = budgetHeight * (0.85 + Math.random() * 0.3);
                      const n1Height = budgetHeight * (0.8 + Math.random() * 0.4);

                      return (
                        <div key={mois} className="flex-1 flex flex-col items-center space-y-1">
                          <div className="flex items-end justify-center space-x-1 w-full h-48">
                            <div
                              className="w-2 bg-blue-500 rounded-t"
                              style={{height: `${budgetHeight}%`}}
                              title={`Budget ${mois}`}
                            ></div>
                            <div
                              className="w-2 bg-[#6A8A82] rounded-t"
                              style={{height: `${reelHeight}%`}}
                              title={`Réel ${mois}`}
                            ></div>
                            <div
                              className="w-2 bg-[#767676] rounded-t"
                              style={{height: `${n1Height}%`}}
                              title={`N-1 ${mois}`}
                            ></div>
                          </div>
                          <span className="text-xs text-[#767676] transform -rotate-45">{mois}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Analyse détaillée par compte */}
              <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-[#E8E8E8]">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-[#191919]">📋 Analyse Détaillée par Compte</h4>
                    <div className="flex items-center space-x-2">
                      <button className="flex items-center space-x-1 px-3 py-1 text-xs border border-[#E8E8E8] rounded-lg hover:bg-gray-100 transition-colors" aria-label="Filtrer">
                        <Filter className="w-3 h-3" />
                        <span>{t('common.filter')}</span>
                      </button>
                      <button className="flex items-center space-x-1 px-3 py-1 text-xs bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors">
                        <FileDown className="w-3 h-3" />
                        <span>Export</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#444444] uppercase tracking-wider">{t('accounting.account')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#444444] uppercase tracking-wider">{t('accounting.label')}</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444] uppercase tracking-wider">{t('navigation.budget')}</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444] uppercase tracking-wider">Réel</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444] uppercase tracking-wider">Écart €</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444] uppercase tracking-wider">Écart %</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444] uppercase tracking-wider">N-1</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444] uppercase tracking-wider">Evol N-1</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[#444444] uppercase tracking-wider">Tendance</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {comptes.map((compte) => {
                        const ecartEur = compte.reel - compte.budget;
                        const ecartPct = ((compte.reel / compte.budget) - 1) * 100;
                        const evolN1 = ((compte.reel / compte.nMoins1) - 1) * 100;

                        return (
                          <tr key={compte.code} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-blue-900">{compte.code}</td>
                            <td className="px-4 py-3 text-sm text-[#444444]">{compte.libelle}</td>
                            <td className="px-4 py-3 text-sm text-right text-blue-900">
                              {formatCurrency(compte.budget)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-[#444444]">
                              {formatCurrency(compte.reel)}
                            </td>
                            <td className={`px-4 py-3 text-sm text-right font-medium ${ecartEur >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {ecartEur >= 0 ? '+' : ''}{formatCurrency(ecartEur)}
                            </td>
                            <td className={`px-4 py-3 text-sm text-right font-medium ${getVarianceColor(ecartPct)}`}>
                              {ecartPct >= 0 ? '+' : ''}{ecartPct.toFixed(1)}%
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-[#767676]">
                              {formatCurrency(compte.nMoins1)}
                            </td>
                            <td className={`px-4 py-3 text-sm text-right font-medium ${evolN1 >= 0 ? 'text-[#6A8A82]' : 'text-red-600'}`}>
                              {evolN1 >= 0 ? '+' : ''}{evolN1.toFixed(1)}%
                            </td>
                            <td className="px-4 py-3 text-center">
                              {Math.abs(ecartPct) <= 5 ? (
                                <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                              ) : Math.abs(ecartPct) <= 10 ? (
                                <Clock className="w-4 h-4 text-yellow-500 mx-auto" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-red-500 mx-auto" />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Résumé par département */}
                <div className="p-4 bg-gray-50 border-t border-[#E8E8E8]">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-xs text-[#767676]">Total Budget</p>
                      <p className="font-medium text-blue-900">
                        {formatCurrency(comptes.reduce((sum, c) => sum + c.budget, 0))}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-[#767676]">Total Réel</p>
                      <p className="font-medium text-[#444444]">
                        {formatCurrency(comptes.reduce((sum, c) => sum + c.reel, 0))}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-[#767676]">Écart Total</p>
                      <p className={`font-medium ${
                        comptes.reduce((sum, c) => sum + c.reel, 0) < comptes.reduce((sum, c) => sum + c.budget, 0)
                        ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(comptes.reduce((sum, c) => sum + c.reel, 0) - comptes.reduce((sum, c) => sum + c.budget, 0))}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-[#767676]">Taux Réalisation</p>
                      <p className="font-medium text-[#6A8A82]">
                        {((comptes.reduce((sum, c) => sum + c.reel, 0) / comptes.reduce((sum, c) => sum + c.budget, 0)) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Onglet Prévisions - Système Intelligent */}
          {activeTab === 'previsions' && (
            <div className="space-y-6">
              {/* Assistant de prévision intelligent */}
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-[#191919]">🤖 Assistant de Prévision Intelligent</h3>
                  <div className="flex items-center space-x-3">
                    <button className="flex items-center space-x-2 px-3 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323] transition-colors">
                      <Calculator className="w-4 h-4" />
                      <span className="text-sm">Recalculer</span>
                    </button>
                    <button className="flex items-center space-x-2 px-3 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors">
                      <Save className="w-4 h-4" />
                      <span className="text-sm">Sauvegarder</span>
                    </button>
                  </div>
                </div>

                {/* Paramètres de prévision */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Méthode de calcul</label>
                    <select className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#B87333] focus:border-transparent">
                      <option value="historique">Historique + Inflation</option>
                      <option value="contrat">Basé sur contrats</option>
                      <option value="ml">Machine Learning</option>
                      <option value="mixte">Méthode mixte</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Inflation prévue</label>
                    <div className="relative">
                      <input
                        type="number"
                        defaultValue="2.5"
                        step="0.1"
                        className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-[#B87333] focus:border-transparent"
                      />
                      <span className="absolute right-3 top-2 text-sm text-[#767676]">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Croissance activité</label>
                    <div className="relative">
                      <input
                        type="number"
                        defaultValue="5.0"
                        step="0.1"
                        className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-[#B87333] focus:border-transparent"
                      />
                      <span className="absolute right-3 top-2 text-sm text-[#767676]">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Saisonnalité</label>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="mr-2 rounded focus:ring-[#B87333]"
                      />
                      <span className="text-sm text-[#444444]">Appliquer profil historique</span>
                    </div>
                  </div>
                </div>

                {/* Simulation graphique des scénarios */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-[#191919] mb-4">📊 Simulation des Scénarios</h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-white rounded-lg border">
                      <p className="text-xs text-[#767676]">Scénario Optimiste</p>
                      <p className="text-lg font-bold text-[#6A8A82]">3.8M€</p>
                      <p className="text-xs text-[#6A8A82]">+18.5%</p>
                    </div>
                    <div className="text-center p-3 bg-[#B87333] text-white rounded-lg border">
                      <p className="text-xs opacity-90">Scénario Réaliste</p>
                      <p className="text-lg font-bold">3.2M€</p>
                      <p className="text-xs opacity-90">Base</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border">
                      <p className="text-xs text-[#767676]">Scénario Pessimiste</p>
                      <p className="text-lg font-bold text-red-600">2.7M€</p>
                      <p className="text-xs text-red-600">-15.6%</p>
                    </div>
                  </div>

                  {/* Graphique de projection */}
                  <div className="h-48 border border-gray-200 rounded-lg p-4 bg-white">
                    <div className="h-full flex items-end justify-between space-x-1">
                      {['Q1', 'Q2', 'Q3', 'Q4'].map((trimestre, index) => {
                        const optimiste = 70 + index * 10 + Math.random() * 15;
                        const realiste = 60 + index * 8 + Math.random() * 10;
                        const pessimiste = 50 + index * 6 + Math.random() * 8;

                        return (
                          <div key={trimestre} className="flex-1 flex flex-col items-center space-y-2">
                            <div className="flex items-end justify-center space-x-1 w-full h-36">
                              <div
                                className="w-3 bg-[#6A8A82] rounded-t opacity-50"
                                style={{height: `${optimiste}%`}}
                                title={`Optimiste ${trimestre}`}
                              ></div>
                              <div
                                className="w-3 bg-[#B87333] rounded-t"
                                style={{height: `${realiste}%`}}
                                title={`Réaliste ${trimestre}`}
                              ></div>
                              <div
                                className="w-3 bg-red-500 rounded-t opacity-70"
                                style={{height: `${pessimiste}%`}}
                                title={`Pessimiste ${trimestre}`}
                              ></div>
                            </div>
                            <span className="text-xs text-[#767676]">{trimestre}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Prévisions détaillées par compte */}
              <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-[#E8E8E8]">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-[#191919]">🔮 Prévisions Détaillées par Compte</h4>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-[#767676]">Confiance moyenne:</span>
                      <span className="text-xs font-medium text-[#6A8A82]">84%</span>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#444444] uppercase tracking-wider">{t('accounting.account')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#444444] uppercase tracking-wider">{t('accounting.label')}</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444] uppercase tracking-wider">Base N-1</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444] uppercase tracking-wider">Ajustements</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444] uppercase tracking-wider">Prévision 2025</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[#444444] uppercase tracking-wider">Confiance</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[#444444] uppercase tracking-wider">Méthode</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {comptes.map((compte) => {
                        const base = compte.nMoins1;
                        const ajustement = base * 0.075; // 7.5% d'ajustement moyen
                        const prevision = base + ajustement;
                        const confiance = 75 + Math.random() * 20; // Entre 75% et 95%

                        return (
                          <tr key={compte.code} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-blue-900">{compte.code}</td>
                            <td className="px-4 py-3 text-sm text-[#444444]">{compte.libelle}</td>
                            <td className="px-4 py-3 text-sm text-right text-[#767676]">
                              {formatCurrency(base)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-[#6A8A82]">
                              +{formatCurrency(ajustement)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-[#191919]">
                              {formatCurrency(prevision)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${
                                      confiance > 85 ? 'bg-[#6A8A82]' :
                                      confiance > 70 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{width: `${confiance}%`}}
                                  ></div>
                                </div>
                                <span className="text-xs text-[#444444]">{confiance.toFixed(0)}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                                Historique
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Résumé des prévisions */}
                <div className="p-4 bg-gray-50 border-t border-[#E8E8E8]">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-xs text-[#767676]">Total Prévu 2025</p>
                      <p className="font-medium text-[#191919]">
                        {formatCurrency(comptes.reduce((sum, c) => sum + c.nMoins1 * 1.075, 0))}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-[#767676]">Croissance vs N-1</p>
                      <p className="font-medium text-[#6A8A82]">+7.5%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-[#767676]">Confiance Moyenne</p>
                      <p className="font-medium text-[#6A8A82]">84%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-[#767676]">Dernière MAJ</p>
                      <p className="font-medium text-[#444444]">{t('common.today')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Analyse de sensibilité */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h4 className="font-medium text-[#191919] mb-4">🎯 Analyse de Sensibilité</h4>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-[#444444]">Inflation +1%</span>
                        <span className="text-sm font-medium text-red-600">+45K€</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-red-500 h-2 rounded-full" style={{width: '15%'}}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-[#444444]">Volume +10%</span>
                        <span className="text-sm font-medium text-[#6A8A82]">+285K€</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-[#6A8A82] h-2 rounded-full" style={{width: '90%'}}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-[#444444]">Taux de change +5%</span>
                        <span className="text-sm font-medium text-yellow-600">+28K€</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-yellow-500 h-2 rounded-full" style={{width: '10%'}}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-[#444444]">Efficacité +3%</span>
                        <span className="text-sm font-medium text-[#6A8A82]">-95K€</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-[#6A8A82] h-2 rounded-full" style={{width: '30%'}}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h4 className="font-medium text-[#191919] mb-4">⚠️ Risques Identifiés</h4>

                  <div className="space-y-3">
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-900">Hausse matières premières</p>
                          <p className="text-xs text-red-700">Impact potentiel: +8% sur achats</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <Clock className="w-4 h-4 text-yellow-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-yellow-900">Négociation contrats</p>
                          <p className="text-xs text-yellow-700">Renouvellement Q2 - économie possible</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <TrendingUp className="w-4 h-4 text-blue-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-900">Opportunité digitalisation</p>
                          <p className="text-xs text-blue-700">Réduction 5% coûts administratifs</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Onglet Alertes - Système de Notifications */}
          {activeTab === 'alertes' && (
            <div className="space-y-6">
              {/* Configuration des alertes */}
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-[#191919]">🔔 Consultation des Alertes</h3>
                  <div className="flex items-center space-x-3">
                    <button className="flex items-center space-x-2 px-3 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors" aria-label="Actualiser">
                      <RefreshCw className="w-4 h-4" />
                      <span className="text-sm">{t('common.refresh')}</span>
                    </button>
                    <button className="flex items-center space-x-2 px-3 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323] transition-colors">
                      <FileDown className="w-4 h-4" />
                      <span className="text-sm">{t('common.export')}</span>
                    </button>
                  </div>
                </div>

                {/* Règles d'alerte */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 border border-[#E8E8E8] rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-[#191919]">Niveau 1 - Information</h4>
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#767676]">Seuil d'écart:</span>
                        <span className="font-medium">±5%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#767676]">Notification:</span>
                        <span className="font-medium">{t('dashboard.title')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#767676]">Fréquence:</span>
                        <span className="font-medium">Temps réel</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border border-[#E8E8E8] rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-[#191919]">Niveau 2 - Attention</h4>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#767676]">Seuil d'écart:</span>
                        <span className="font-medium">±10%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#767676]">Notification:</span>
                        <span className="font-medium">Email + Dashboard</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#767676]">Fréquence:</span>
                        <span className="font-medium">Quotidien</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border border-[#E8E8E8] rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-[#191919]">Niveau 3 - Critique</h4>
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#767676]">Seuil d'écart:</span>
                        <span className="font-medium">±15%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#767676]">Notification:</span>
                        <span className="font-medium">Email + SMS + Dashboard</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#767676]">Fréquence:</span>
                        <span className="font-medium">Immédiat</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alertes actives */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b border-[#E8E8E8]">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-[#191919]">🚨 Alertes Actives ({alertes.length})</h4>
                      <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                        {alertes.filter(a => a.niveau === 'CRITIQUE').length} Critiques
                      </span>
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    <div className="divide-y divide-gray-200">
                      {alertes.map((alerte) => (
                        <div key={alerte.id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-start space-x-3">
                            <div className={`mt-1 w-2 h-2 rounded-full ${
                              alerte.niveau === 'CRITIQUE' ? 'bg-red-500' :
                              alerte.niveau === 'ATTENTION' ? 'bg-yellow-500' : 'bg-blue-500'
                            }`}></div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-[#191919] truncate">
                                  {alerte.libelle}
                                </p>
                                <span className={`text-xs font-medium ${
                                  alerte.ecart > 0 ? 'text-red-600' : 'text-green-600'
                                }`}>
                                  {alerte.ecart > 0 ? '+' : ''}{alerte.ecart}%
                                </span>
                              </div>
                              <div className="mt-1 flex items-center justify-between">
                                <p className="text-xs text-[#767676]">
                                  {alerte.compte} • {alerte.departement}
                                </p>
                                <p className="text-xs text-[#767676]">{alerte.date}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              <button className="p-1 text-[#767676] hover:text-[#B87333] transition-colors" aria-label="Voir les détails">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button className="p-1 text-[#767676] hover:text-red-600 transition-colors">
                                <AlertTriangle className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Statistiques d'alertes */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h4 className="font-medium text-[#191919] mb-4">📊 Statistiques des Alertes</h4>

                  <div className="space-y-4">
                    {/* Par niveau */}
                    <div>
                      <h5 className="text-sm font-medium text-[#444444] mb-3">Répartition par niveau</h5>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span className="text-sm text-[#444444]">Critiques</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div className="bg-red-500 h-2 rounded-full" style={{width: '33%'}}></div>
                            </div>
                            <span className="text-sm font-medium w-6 text-right">1</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                            <span className="text-sm text-[#444444]">Attention</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div className="bg-yellow-500 h-2 rounded-full" style={{width: '33%'}}></div>
                            </div>
                            <span className="text-sm font-medium w-6 text-right">1</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span className="text-sm text-[#444444]">Information</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div className="bg-blue-500 h-2 rounded-full" style={{width: '33%'}}></div>
                            </div>
                            <span className="text-sm font-medium w-6 text-right">1</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Par département */}
                    <div>
                      <h5 className="text-sm font-medium text-[#444444] mb-3">Par département</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[#444444]">COMMERCIAL</span>
                          <span className="text-sm font-medium">2</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[#444444]">LOGISTIQUE</span>
                          <span className="text-sm font-medium">1</span>
                        </div>
                      </div>
                    </div>

                    {/* Évolution */}
                    <div>
                      <h5 className="text-sm font-medium text-[#444444] mb-3">Évolution 7 derniers jours</h5>
                      <div className="h-16 flex items-end justify-between space-x-1">
                        {[2, 1, 3, 1, 0, 2, 3].map((count, index) => (
                          <div key={index} className="flex-1 flex flex-col items-center">
                            <div
                              className="w-full bg-[#6A8A82] rounded-t"
                              style={{height: `${(count / 3) * 100}%`, minHeight: count > 0 ? '8px' : '2px'}}
                            ></div>
                            <span className="text-xs text-[#767676] mt-1">
                              {['L', 'M', 'M', 'J', 'V', 'S', 'D'][index]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions recommandées */}
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <h4 className="font-medium text-[#191919] mb-4">💡 Actions Recommandées</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 border border-[#E8E8E8] rounded-lg">
                    <div className="flex items-start space-x-3">
                      <div className="mt-1 p-2 bg-red-100 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <h5 className="text-sm font-medium text-[#191919]">Revoir budget Achats UE</h5>
                        <p className="text-xs text-[#767676] mt-1">
                          Dépassement de 15.2% détecté. Analyser les causes et ajuster les prévisions.
                        </p>
                        <button className="mt-2 text-xs text-[#B87333] hover:text-[#A86323] font-medium">
                          Voir détails →
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border border-[#E8E8E8] rounded-lg">
                    <div className="flex items-start space-x-3">
                      <div className="mt-1 p-2 bg-blue-100 rounded-lg">
                        <TrendingDown className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h5 className="text-sm font-medium text-[#191919]">Optimiser Achats Hors UE</h5>
                        <p className="text-xs text-[#767676] mt-1">
                          Sous-consommation de -20.8%. Opportunité de renégociation ou réaffectation.
                        </p>
                        <button className="mt-2 text-xs text-[#B87333] hover:text-[#A86323] font-medium">
                          Analyser →
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border border-[#E8E8E8] rounded-lg">
                    <div className="flex items-start space-x-3">
                      <div className="mt-1 p-2 bg-yellow-100 rounded-lg">
                        <Clock className="w-4 h-4 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <h5 className="text-sm font-medium text-[#191919]">Surveiller Carburants</h5>
                        <p className="text-xs text-[#767676] mt-1">
                          Tendance haussière de +8.5%. Mettre en place un suivi renforcé.
                        </p>
                        <button className="mt-2 text-xs text-[#B87333] hover:text-[#A86323] font-medium">
                          Configurer →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notifications automatiques */}
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <h4 className="font-medium text-[#191919] mb-4">📧 Configuration des Notifications</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="text-sm font-medium text-[#444444] mb-3">Destinataires par niveau</h5>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border border-[#E8E8E8] rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-sm">Information</span>
                        </div>
                        <span className="text-xs text-[#767676]">Contrôleur de gestion</span>
                      </div>

                      <div className="flex items-center justify-between p-3 border border-[#E8E8E8] rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <span className="text-sm">Attention</span>
                        </div>
                        <span className="text-xs text-[#767676]">Manager + Contrôleur</span>
                      </div>

                      <div className="flex items-center justify-between p-3 border border-[#E8E8E8] rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="text-sm">Critique</span>
                        </div>
                        <span className="text-xs text-[#767676]">Direction + Manager</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-sm font-medium text-[#444444] mb-3">Canaux de notification</h5>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span className="text-sm text-[#444444]">Notifications dans l'application</span>
                      </label>

                      <label className="flex items-center space-x-3">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span className="text-sm text-[#444444]">Emails automatiques</span>
                      </label>

                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm text-[#444444]">SMS pour alertes critiques</span>
                      </label>

                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm text-[#444444]">Intégration Slack/Teams</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Onglet Rapports - Exports Détaillés */}
          {activeTab === 'rapports' && (
            <div className="space-y-6">
              {/* Génération de rapports */}
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-[#191919]">📊 Consultation de Rapports</h3>
                  <div className="flex items-center space-x-3">
                    <button className="flex items-center space-x-2 px-3 py-2 border border-[#E8E8E8] rounded-lg hover:bg-gray-50 transition-colors" aria-label="Actualiser">
                      <RefreshCw className="w-4 h-4" />
                      <span className="text-sm">{t('common.refresh')}</span>
                    </button>
                    <button className="flex items-center space-x-2 px-3 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323] transition-colors">
                      <Download className="w-4 h-4" />
                      <span className="text-sm">Télécharger Tout</span>
                    </button>
                  </div>
                </div>

                {/* Types de rapports */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 border border-[#E8E8E8] rounded-lg hover:border-[#B87333] transition-colors cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">Standard</span>
                    </div>
                    <h4 className="font-medium text-[#191919] mb-2">Rapport Mensuel</h4>
                    <p className="text-xs text-[#767676] mb-3">Synthèse complète Budget vs Réel avec analyses d'écarts</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#767676]">Dernière génération: Hier</span>
                      <button className="text-xs text-[#B87333] hover:text-[#A86323] font-medium">
                        Télécharger →
                      </button>
                    </div>
                  </div>

                  <div className="p-4 border border-[#E8E8E8] rounded-lg hover:border-[#B87333] transition-colors cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-[#6A8A82] bg-opacity-20 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-[#6A8A82]" />
                      </div>
                      <span className="text-xs px-2 py-1 bg-[#6A8A82] bg-opacity-20 text-[#6A8A82] rounded-full">Avancé</span>
                    </div>
                    <h4 className="font-medium text-[#191919] mb-2">Analyse Comparative</h4>
                    <p className="text-xs text-[#767676] mb-3">Comparaisons multi-périodes avec projections et tendances</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#767676]">Programmé: Hebdomadaire</span>
                      <button className="text-xs text-[#B87333] hover:text-[#A86323] font-medium">
                        Télécharger →
                      </button>
                    </div>
                  </div>

                  <div className="p-4 border border-[#E8E8E8] rounded-lg hover:border-[#B87333] transition-colors cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <PieChart className="w-5 h-5 text-purple-600" />
                      </div>
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">Exécutif</span>
                    </div>
                    <h4 className="font-medium text-[#191919] mb-2">Dashboard Exécutif</h4>
                    <p className="text-xs text-[#767676] mb-3">Vue d'ensemble pour la direction avec KPIs principaux</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#767676]">Format: PowerPoint</span>
                      <button className="text-xs text-[#B87333] hover:text-[#A86323] font-medium">
                        Télécharger →
                      </button>
                    </div>
                  </div>

                  <div className="p-4 border border-[#E8E8E8] rounded-lg hover:border-[#B87333] transition-colors cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <FileDown className="w-5 h-5 text-yellow-600" />
                      </div>
                      <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">Détaillé</span>
                    </div>
                    <h4 className="font-medium text-[#191919] mb-2">Export Complet</h4>
                    <p className="text-xs text-[#767676] mb-3">Données brutes avec drill-down par compte et département</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#767676]">Format: Excel</span>
                      <button className="text-xs text-[#B87333] hover:text-[#A86323] font-medium">
                        Télécharger →
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Configuration des exports */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h4 className="font-medium text-[#191919] mb-4">📊 Paramètres d'Export</h4>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#444444] mb-2">Période d'analyse</label>
                      <select className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#B87333] focus:border-transparent">
                        <option value="mensuel">Mensuel (Janvier 2025)</option>
                        <option value="trimestriel">Trimestriel (Q1 2025)</option>
                        <option value="ytd">Year-to-Date (2025)</option>
                        <option value="annuel">Annuel (2024)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#444444] mb-2">Départements</label>
                      <div className="space-y-2">
                        {departements.map(dept => (
                          <label key={dept} className="flex items-center space-x-2">
                            <input type="checkbox" defaultChecked className="rounded" />
                            <span className="text-sm text-[#444444]">{dept}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#444444] mb-2">Format de sortie</label>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex items-center space-x-2">
                          <input type="radio" name="format" value="excel" defaultChecked />
                          <span className="text-sm text-[#444444]">Excel (.xlsx)</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input type="radio" name="format" value="pdf" />
                          <span className="text-sm text-[#444444]">PDF</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input type="radio" name="format" value="powerbi" />
                          <span className="text-sm text-[#444444]">Power BI</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input type="radio" name="format" value="csv" />
                          <span className="text-sm text-[#444444]">CSV</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#444444] mb-2">Options avancées</label>
                      <div className="space-y-2">
                        <label className="flex items-center space-x-2">
                          <input type="checkbox" defaultChecked className="rounded" />
                          <span className="text-sm text-[#444444]">Inclure graphiques</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input type="checkbox" defaultChecked className="rounded" />
                          <span className="text-sm text-[#444444]">Données de comparaison N-1</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input type="checkbox" className="rounded" />
                          <span className="text-sm text-[#444444]">Détail par sous-compte</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input type="checkbox" className="rounded" />
                          <span className="text-sm text-[#444444]">Commentaires d'analyse</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Historique des rapports */}
                <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b border-[#E8E8E8]">
                    <h4 className="font-medium text-[#191919]">📁 Historique des Rapports</h4>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    <div className="divide-y divide-gray-200">
                      {[
                        { nom: 'Rapport Mensuel - Janvier 2025', type: 'Mensuel', date: '2025-01-15', taille: '2.4 MB', format: 'Excel' },
                        { nom: 'Dashboard Exécutif - Q4 2024', type: 'Exécutif', date: '2025-01-08', taille: '850 KB', format: 'PDF' },
                        { nom: 'Analyse Comparative - Décembre', type: 'Avancé', date: '2025-01-02', taille: '4.1 MB', format: 'Excel' },
                        { nom: 'Export Complet - 2024', type: 'Détaillé', date: '2024-12-31', taille: '12.8 MB', format: 'Excel' },
                        { nom: 'Rapport Mensuel - Décembre 2024', type: 'Mensuel', date: '2024-12-15', taille: '2.2 MB', format: 'Excel' }
                      ].map((rapport, index) => (
                        <div key={index} className="p-4 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#191919] truncate">{rapport.nom}</p>
                              <div className="mt-1 flex items-center space-x-4 text-xs text-[#767676]">
                                <span>{rapport.type}</span>
                                <span>{rapport.date}</span>
                                <span>{rapport.taille}</span>
                                <span>{rapport.format}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <button className="p-1 text-[#767676] hover:text-[#B87333] transition-colors" title={t('actions.download')} aria-label="Télécharger">
                                <Download className="w-4 h-4" />
                              </button>
                              <button className="p-1 text-[#767676] hover:text-[#6A8A82] transition-colors" title="Voir" aria-label="Voir les détails">
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Programmation automatique */}
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <h4 className="font-medium text-[#191919] mb-4">🕒 Programmation Automatique</h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 border border-[#E8E8E8] rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-sm font-medium text-[#191919]">Rapport Mensuel</h5>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-[#6A8A82] rounded-full mr-2"></div>
                        <span className="text-xs text-[#6A8A82]">Actif</span>
                      </div>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#767676]">Fréquence:</span>
                        <span className="font-medium">Chaque 15 du mois</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#767676]">Destinataires:</span>
                        <span className="font-medium">3 personnes</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#767676]">Prochaine:</span>
                        <span className="font-medium">15/02/2025</span>
                      </div>
                    </div>
                    <button className="mt-3 w-full text-xs text-[#B87333] hover:text-[#A86323] font-medium border border-[#B87333] rounded py-1">
                      Modifier
                    </button>
                  </div>

                  <div className="p-4 border border-[#E8E8E8] rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-sm font-medium text-[#191919]">Dashboard Exécutif</h5>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                        <span className="text-xs text-yellow-600">En pause</span>
                      </div>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#767676]">Fréquence:</span>
                        <span className="font-medium">Hebdomadaire</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#767676]">Destinataires:</span>
                        <span className="font-medium">Direction</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#767676]">Format:</span>
                        <span className="font-medium">PDF</span>
                      </div>
                    </div>
                    <button className="mt-3 w-full text-xs text-[#6A8A82] hover:text-[#5A7A72] font-medium border border-[#6A8A82] rounded py-1">
                      Réactiver
                    </button>
                  </div>

                  <div className="p-4 border-2 border-dashed border-[#E8E8E8] rounded-lg flex flex-col items-center justify-center">
                    <Plus className="w-8 h-8 text-[#767676] mb-2" />
                    <p className="text-sm font-medium text-[#444444] mb-1">Nouvelle programmation</p>
                    <p className="text-xs text-[#767676] text-center mb-3">Automatiser la génération et l'envoi de rapports</p>
                    <button className="text-xs text-[#B87333] hover:text-[#A86323] font-medium">
                      Configurer →
                    </button>
                  </div>
                </div>
              </div>

              {/* Templates personnalisés */}
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-[#191919]">🎨 Templates Personnalisés</h4>
                  <button className="flex items-center space-x-2 px-3 py-2 border border-[#E8E8E8] rounded-lg hover:bg-gray-50 transition-colors">
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">Nouveau template</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { nom: 'Template Corporate', description: 'Charte graphique entreprise', utilisation: '12 fois', statut: 'Actif' },
                    { nom: 'Analyse Financière', description: 'Focus ratios et tendances', utilisation: '8 fois', statut: 'Actif' },
                    { nom: 'Suivi Projets', description: 'Budget par projet', utilisation: '5 fois', statut: 'Brouillon' },
                    { nom: 'Rapport Audit', description: 'Format audit externe', utilisation: '3 fois', statut: 'Archivé' }
                  ].map((template, index) => (
                    <div key={index} className="p-4 border border-[#E8E8E8] rounded-lg hover:border-[#B87333] transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-medium text-[#191919]">{template.nom}</h5>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          template.statut === 'Actif' ? 'bg-[#6A8A82] bg-opacity-20 text-[#6A8A82]' :
                          template.statut === 'Brouillon' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {template.statut}
                        </span>
                      </div>
                      <p className="text-xs text-[#767676] mb-2">{template.description}</p>
                      <p className="text-xs text-[#767676] mb-3">Utilisé {template.utilisation}</p>
                      <div className="flex space-x-2">
                        <button className="flex-1 text-xs text-[#B87333] hover:text-[#A86323] font-medium">
                          Utiliser
                        </button>
                        <button className="text-xs text-[#767676] hover:text-[#444444]">
                          <Edit className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de sélection de période */}
      <PeriodSelectorModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        onApply={(newDateRange) => {
          setDateRange(newDateRange);
          // Convertir les dates au format jj/mm/aaaa pour correspondre au format existant
          const formatDate = (dateStr: string) => {
            const date = new Date(dateStr);
            return date.toLocaleDateString('fr-FR');
          };
          setNewSession({
            ...newSession,
            startDate: formatDate(newDateRange.start),
            endDate: formatDate(newDateRange.end)
          });
        }}
        initialDateRange={dateRange}
      />
    </div>
  );
};

export default CompleteBudgetingModule;