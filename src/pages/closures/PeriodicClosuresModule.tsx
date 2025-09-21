import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, CheckCircle, FileText, BarChart3, Archive, Clock,
  ArrowLeft, Home, Download, RefreshCw, AlertTriangle, Target,
  DollarSign, TrendingUp, Settings, Eye, Edit, Plus, Users,
  Workflow, Bot, Brain, Zap, Play, Pause, SkipForward,
  Timer, Activity, Shield, Award, GitBranch, CheckSquare,
  ChevronDown, ChevronRight, Lock, Unlock, Database,
  CreditCard, Package, Building2, Calculator, FileCheck,
  AlertCircle, Save, Send, Filter, Search, X, ChevronLeft,
  BarChart2, PieChart, TrendingDown, Briefcase, Wallet,
  Receipt, ShoppingCart, Factory, Landmark, Scale,
  ClipboardCheck, FileSpreadsheet, BookOpen, UserCheck
} from 'lucide-react';

// Composants pour les différentes sections
import CycleGestionSection from './sections/CycleGestionSection';
import TresorerieSection from './sections/TresorerieSection';
import RapprochementBancaireSection from './sections/RapprochementBancaireSection';
import CycleClientsSection from './sections/CycleClientsSection';
import CycleFournisseursSection from './sections/CycleFournisseursSection';
import StocksSection from './sections/StocksSection';
import ImmobilisationsSection from './sections/ImmobilisationsSection';
import ProvisionsSection from './sections/ProvisionsSection';
import ControlesCoherenceSection from './sections/ControlesCoherenceSection';
import EtatsFinanciersSection from './sections/EtatsFinanciersSection';
import IAAssistantSection from './sections/IAAssistantSection';
import DashboardAnalyticsSection from './sections/DashboardAnalyticsSection';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  children?: MenuItem[];
  badge?: string;
  badgeType?: 'success' | 'warning' | 'error' | 'info';
}

const PeriodicClosuresModule: React.FC = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['gestion', 'operations']);
  const [closureStatus, setClosureStatus] = useState('in_progress'); // in_progress, completed, validated
  const [selectedPeriod, setSelectedPeriod] = useState('2025-01');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Données de progression pour chaque section
  const [sectionProgress, setSectionProgress] = useState({
    tresorerie: 75,
    rapprochement: 60,
    clients: 80,
    fournisseurs: 45,
    stocks: 30,
    immobilisations: 90,
    provisions: 55,
    controles: 20,
    etats: 0
  });

  // Structure du menu de navigation avec sections selon le cahier des charges
  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard de Pilotage',
      icon: <BarChart3 className="w-4 h-4" />,
      badge: 'Live',
      badgeType: 'success'
    },
    {
      id: 'gestion',
      label: 'Gestion du Cycle',
      icon: <Calendar className="w-4 h-4" />,
      children: [
        { id: 'parametrage', label: 'Paramétrage Périodes', icon: <Settings className="w-4 h-4" /> },
        { id: 'workflow', label: 'Workflow IA', icon: <Bot className="w-4 h-4" /> },
        { id: 'planning', label: 'Planning Clôtures', icon: <Clock className="w-4 h-4" /> }
      ]
    },
    {
      id: 'operations',
      label: 'Opérations de Clôture',
      icon: <Briefcase className="w-4 h-4" />,
      badge: '6/9',
      badgeType: 'warning',
      children: [
        {
          id: 'tresorerie',
          label: 'Caisse & Trésorerie',
          icon: <Wallet className="w-4 h-4" />,
          badge: '75%',
          badgeType: 'info'
        },
        {
          id: 'rapprochement',
          label: 'Rapprochement Bancaire',
          icon: <Landmark className="w-4 h-4" />,
          badge: '60%',
          badgeType: 'warning'
        },
        {
          id: 'clients',
          label: 'Cycle Clients',
          icon: <Users className="w-4 h-4" />,
          badge: '80%',
          badgeType: 'success'
        },
        {
          id: 'fournisseurs',
          label: 'Cycle Fournisseurs',
          icon: <ShoppingCart className="w-4 h-4" />,
          badge: '45%',
          badgeType: 'error'
        },
        {
          id: 'stocks',
          label: 'Gestion des Stocks',
          icon: <Package className="w-4 h-4" />,
          badge: '30%',
          badgeType: 'error'
        },
        {
          id: 'immobilisations',
          label: 'Immobilisations',
          icon: <Building2 className="w-4 h-4" />,
          badge: '90%',
          badgeType: 'success'
        },
        {
          id: 'provisions',
          label: 'Provisions & Régularisations',
          icon: <Calculator className="w-4 h-4" />,
          badge: '55%',
          badgeType: 'warning'
        }
      ]
    },
    {
      id: 'finalisation',
      label: 'Clôture Finale',
      icon: <FileCheck className="w-4 h-4" />,
      children: [
        {
          id: 'controles',
          label: 'Contrôles de Cohérence',
          icon: <ClipboardCheck className="w-4 h-4" />,
          badge: '!',
          badgeType: 'error'
        },
        {
          id: 'etats',
          label: 'États SYSCOHADA',
          icon: <FileSpreadsheet className="w-4 h-4" />
        },
        { id: 'validation', label: 'Validation Finale', icon: <UserCheck className="w-4 h-4" /> }
      ]
    },
    {
      id: 'ia',
      label: 'IA & Automation',
      icon: <Brain className="w-4 h-4" />,
      badge: 'Pro',
      badgeType: 'info',
      children: [
        { id: 'assistant', label: 'Assistant Virtuel', icon: <Bot className="w-4 h-4" /> },
        { id: 'anomalies', label: 'Détection Anomalies', icon: <AlertCircle className="w-4 h-4" /> },
        { id: 'analytics', label: 'Analytics Avancés', icon: <BarChart2 className="w-4 h-4" /> },
        { id: 'automation', label: 'RPA & Workflows', icon: <Zap className="w-4 h-4" /> }
      ]
    },
    {
      id: 'reporting',
      label: 'Reporting & Archives',
      icon: <FileText className="w-4 h-4" />,
      children: [
        { id: 'rapports', label: 'Rapports Standards', icon: <FileText className="w-4 h-4" /> },
        { id: 'exports', label: 'Exports Comptables', icon: <Download className="w-4 h-4" /> },
        { id: 'archives', label: 'Archives Légales', icon: <Archive className="w-4 h-4" /> },
        { id: 'audit', label: 'Piste d\'Audit', icon: <Shield className="w-4 h-4" /> }
      ]
    }
  ];

  // Fonction pour toggle l'expansion d'un menu
  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev =>
      prev.includes(menuId)
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  // Fonction pour calculer la progression globale
  const calculateGlobalProgress = () => {
    const values = Object.values(sectionProgress);
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  };

  // Fonction pour obtenir le badge de statut
  const getBadgeClass = (type?: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-700';
      case 'warning': return 'bg-yellow-100 text-yellow-700';
      case 'error': return 'bg-red-100 text-red-700';
      case 'info': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Fonction pour rendre le contenu selon la section active
  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardPilotage progress={calculateGlobalProgress()} sectionProgress={sectionProgress} />;
      case 'parametrage':
        return <ParametragePeriodes selectedPeriod={selectedPeriod} setSelectedPeriod={setSelectedPeriod} />;
      case 'workflow':
        return <WorkflowIA status={closureStatus} />;
      case 'tresorerie':
        return <TresorerieSection progress={sectionProgress.tresorerie} />;
      case 'rapprochement':
        return <RapprochementBancaireSection progress={sectionProgress.rapprochement} />;
      case 'clients':
        return <CycleClientsSection progress={sectionProgress.clients} />;
      case 'fournisseurs':
        return <CycleFournisseursSection progress={sectionProgress.fournisseurs} />;
      case 'stocks':
        return <StocksSection progress={sectionProgress.stocks} />;
      case 'immobilisations':
        return <ImmobilisationsSection progress={sectionProgress.immobilisations} />;
      case 'provisions':
        return <ProvisionsSection progress={sectionProgress.provisions} />;
      case 'controles':
        return <ControlesCoherenceSection progress={sectionProgress.controles} />;
      case 'etats':
        return <EtatsFinanciersSection progress={sectionProgress.etats} />;
      case 'assistant':
        return <IAAssistantSection />;
      case 'analytics':
        return <DashboardAnalyticsSection />;
      default:
        return <div className="text-center py-12 text-gray-500">Section en cours de développement...</div>;
    }
  };

  return (
    <div className="flex h-screen bg-[#ECECEC] font-['Sometype Mono']">
      {/* Sidebar de navigation */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-72'} bg-white border-r border-[#E8E8E8] transition-all duration-300 flex flex-col`}>
        {/* Header Sidebar */}
        <div className="p-4 border-b border-[#E8E8E8]">
          <div className="flex items-center justify-between">
            <div className={`flex items-center space-x-3 ${sidebarCollapsed ? 'hidden' : ''}`}>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#6A8A82] to-[#5A7A72] flex items-center justify-center">
                <Archive className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#191919]">Clôture Périodique</h2>
                <p className="text-xs text-[#767676]">SYSCOHADA</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Menu Navigation */}
        <div className="flex-1 overflow-y-auto p-4">
          <nav className="space-y-1">
            {menuItems.map(item => (
              <div key={item.id}>
                <button
                  onClick={() => {
                    if (item.children) {
                      toggleMenu(item.id);
                    } else {
                      setActiveSection(item.id);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                    activeSection === item.id
                      ? 'bg-[#6A8A82] text-white'
                      : 'hover:bg-gray-100 text-[#444444]'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {item.icon}
                    {!sidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
                  </div>
                  {!sidebarCollapsed && (
                    <div className="flex items-center space-x-2">
                      {item.badge && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getBadgeClass(item.badgeType)}`}>
                          {item.badge}
                        </span>
                      )}
                      {item.children && (
                        expandedMenus.includes(item.id) ?
                          <ChevronDown className="w-3 h-3" /> :
                          <ChevronRight className="w-3 h-3" />
                      )}
                    </div>
                  )}
                </button>

                {/* Sous-menu */}
                {item.children && expandedMenus.includes(item.id) && !sidebarCollapsed && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children.map(child => (
                      <button
                        key={child.id}
                        onClick={() => setActiveSection(child.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-sm ${
                          activeSection === child.id
                            ? 'bg-[#6A8A82]/10 text-[#6A8A82] font-medium'
                            : 'hover:bg-gray-50 text-[#767676]'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          {child.icon}
                          <span>{child.label}</span>
                        </div>
                        {child.badge && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getBadgeClass(child.badgeType)}`}>
                            {child.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Footer Sidebar avec progression */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-[#E8E8E8]">
            <div className="mb-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#767676]">Progression globale</span>
                <span className="font-semibold text-[#191919]">{calculateGlobalProgress()}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 bg-gradient-to-r from-[#6A8A82] to-[#B87333] rounded-full transition-all duration-500"
                  style={{width: `${calculateGlobalProgress()}%`}}
                ></div>
              </div>
            </div>
            <button
              onClick={() => navigate('/closures/complete')}
              className="w-full text-xs text-center text-[#767676] hover:text-[#444444]"
            >
              Retour au module principal
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-[#E8E8E8] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard/comptable')}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-[#444444]" />
                <span className="text-sm font-semibold text-[#444444]">Comptable</span>
              </button>

              <div>
                <h1 className="text-xl font-bold text-[#191919]">Gestion de Clôture Comptable Périodique</h1>
                <p className="text-sm text-[#767676]">Conforme OHADA/SYSCOHADA - Période: {selectedPeriod}</p>
              </div>
            </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={() => navigate('/executive')}
              className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors flex items-center space-x-2"
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
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
                    ${activeTab === tab.id 
                      ? 'border-[#6A8A82] text-[#6A8A82]' 
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
          {/* WORKFLOW IA */}
          {activeTab === 'workflow' && (
            <div className="space-y-6">
              {/* Header Workflow */}
              <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg p-6 border-2 border-purple-500/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                      <Bot className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[#191919]">🤖 Workflow IA - Clôture Automatisée</h3>
                      <p className="text-[#767676]">Intelligence Artificielle pour l'automatisation complète des clôtures SYSCOHADA</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {workflowStatus === 'ready' && (
                      <button
                        onClick={() => setWorkflowStatus('running')}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Play className="w-4 h-4" />
                        <span>Démarrer</span>
                      </button>
                    )}
                    {workflowStatus === 'running' && (
                      <button
                        onClick={() => setWorkflowStatus('paused')}
                        className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                      >
                        <Pause className="w-4 h-4" />
                        <span>Pause</span>
                      </button>
                    )}
                    {workflowStatus === 'paused' && (
                      <button
                        onClick={() => setWorkflowStatus('running')}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Play className="w-4 h-4" />
                        <span>Reprendre</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Statut du Workflow */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Activity className="w-5 h-5 text-purple-600" />
                      <span className="font-semibold text-[#191919]">Statut</span>
                    </div>
                    <p className={`text-lg font-bold ${
                      workflowStatus === 'running' ? 'text-green-600' :
                      workflowStatus === 'paused' ? 'text-orange-600' :
                      workflowStatus === 'completed' ? 'text-blue-600' : 'text-gray-600'
                    }`}>
                      {workflowStatus === 'running' ? 'En cours' :
                       workflowStatus === 'paused' ? 'En pause' :
                       workflowStatus === 'completed' ? 'Terminé' : 'Prêt'}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Timer className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-[#191919]">Temps estimé</span>
                    </div>
                    <p className="text-lg font-bold text-blue-600">2h 15min</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckSquare className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-[#191919]">Progression</span>
                    </div>
                    <p className="text-lg font-bold text-green-600">
                      {workflowStatus === 'running' ? '47%' : workflowStatus === 'completed' ? '100%' : '0%'}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-red-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Shield className="w-5 h-5 text-red-600" />
                      <span className="font-semibold text-[#191919]">Contrôles</span>
                    </div>
                    <p className="text-lg font-bold text-red-600">247/247 ✓</p>
                  </div>
                </div>
              </div>

              {/* Étapes du Workflow */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h4 className="font-bold text-[#191919] mb-4 flex items-center space-x-2">
                    <Workflow className="w-5 h-5 text-purple-600" />
                    <span>Workflow BPMN 2.0</span>
                  </h4>
                  <div className="space-y-3">
                    {[
                      { etape: 'Validation des écritures', statut: 'completed', ia: true, duree: '15min' },
                      { etape: 'Contrôles SYSCOHADA', statut: 'running', ia: true, duree: '25min' },
                      { etape: 'Provisions automatiques', statut: 'pending', ia: true, duree: '30min' },
                      { etape: 'États financiers', statut: 'pending', ia: false, duree: '45min' },
                      { etape: 'Annexes réglementaires', statut: 'pending', ia: true, duree: '20min' }
                    ].map((etape, index) => (
                      <div key={index} className={`flex items-center justify-between p-3 rounded-lg border-l-4 ${
                        etape.statut === 'completed' ? 'bg-green-50 border-green-400' :
                        etape.statut === 'running' ? 'bg-blue-50 border-blue-400' :
                        'bg-gray-50 border-gray-300'
                      }`}>
                        <div className="flex items-center space-x-3">
                          {etape.statut === 'completed' && <CheckCircle className="w-5 h-5 text-green-600" />}
                          {etape.statut === 'running' && <Activity className="w-5 h-5 text-blue-600 animate-pulse" />}
                          {etape.statut === 'pending' && <Clock className="w-5 h-5 text-gray-400" />}
                          <div>
                            <p className="font-medium text-[#191919]">{etape.etape}</p>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-[#767676]">{etape.duree}</span>
                              {etape.ia && (
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">IA</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {etape.statut === 'running' && (
                          <div className="w-16">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="h-2 bg-blue-500 rounded-full animate-pulse" style={{width: '60%'}}></div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h4 className="font-bold text-[#191919] mb-4 flex items-center space-x-2">
                    <Brain className="w-5 h-5 text-blue-600" />
                    <span>Insights IA</span>
                  </h4>
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h5 className="font-semibold text-green-800 mb-2">✅ Recommandations</h5>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>• Balance équilibrée détectée automatiquement</li>
                        <li>• Provisions congés payés calculées (€47,580)</li>
                        <li>• Amortissements linéaires validés</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h5 className="font-semibold text-yellow-800 mb-2">⚠️ Points d'attention</h5>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        <li>• Rapprochement bancaire en attente (Compte 512001)</li>
                        <li>• 3 factures clients non lettrées</li>
                        <li>• Provision pour créances douteuses à réviser</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h5 className="font-semibold text-blue-800 mb-2">🎯 Optimisations</h5>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Gain de temps estimé: 3h 45min (-62%)</li>
                        <li>• Automatisation de 89% des contrôles</li>
                        <li>• Score qualité prévu: 98.7%</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions IA */}
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <h4 className="font-bold text-[#191919] mb-4 flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-yellow-600" />
                  <span>Actions IA Automatisées</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { action: 'Lettrage automatique', description: 'Lettrage des comptes tiers par IA', progression: 85, actif: true },
                    { action: 'Détection anomalies', description: 'Analyse des écritures suspectes', progression: 92, actif: true },
                    { action: 'Calculs provisions', description: 'Provisions réglementaires auto', progression: 100, actif: false },
                    { action: 'Génération annexes', description: 'Notes annexes SYSCOHADA', progression: 0, actif: false },
                    { action: 'Validation finale', description: 'Contrôle cohérence globale', progression: 0, actif: false },
                    { action: 'Export états', description: 'Publication automatique', progression: 0, actif: false }
                  ].map((action, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${
                      action.actif ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-semibold text-[#191919]">{action.action}</h5>
                        {action.actif && <Activity className="w-4 h-4 text-blue-600 animate-pulse" />}
                      </div>
                      <p className="text-xs text-[#767676] mb-3">{action.description}</p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${action.actif ? 'bg-blue-500' : 'bg-gray-400'}`}
                          style={{width: `${action.progression}%`}}
                        ></div>
                      </div>
                      <p className="text-xs text-right mt-1 text-[#767676]">{action.progression}%</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Clôture mensuelle supprimée */}
          {false && activeTab === 'mensuelle' && (
            <div className="space-y-6">
              {/* Statut clôture */}
              <div className="bg-gradient-to-r from-[#6A8A82]/10 to-[#B87333]/10 rounded-lg p-6 border-2 border-[#6A8A82]/20">
                <h3 className="text-lg font-bold text-[#191919] mb-4">📅 Clôture Septembre 2025</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {[
                    { etape: 'Saisie des écritures', statut: 'complete', pourcentage: 100 },
                    { etape: 'Validation comptable', statut: 'en_cours', pourcentage: 85 },
                    { etape: 'Contrôles SYSCOHADA', statut: 'en_attente', pourcentage: 0 },
                    { etape: 'Génération des états', statut: 'en_attente', pourcentage: 0 }
                  ].map((etape, index) => (
                    <div key={index} className="text-center">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${
                        etape.statut === 'complete' ? 'bg-green-100' :
                        etape.statut === 'en_cours' ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        {etape.statut === 'complete' ? (
                          <CheckCircle className="w-8 h-8 text-green-600" />
                        ) : etape.statut === 'en_cours' ? (
                          <Clock className="w-8 h-8 text-blue-600" />
                        ) : (
                          <AlertTriangle className="w-8 h-8 text-gray-600" />
                        )}
                      </div>
                      <h4 className="font-semibold text-[#191919] text-sm mb-1">{etape.etape}</h4>
                      <p className="text-xs text-[#767676] mb-2">{etape.pourcentage}% complété</p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            etape.statut === 'complete' ? 'bg-green-500' :
                            etape.statut === 'en_cours' ? 'bg-blue-500' : 'bg-gray-400'
                          }`}
                          style={{width: `${etape.pourcentage}%`}}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions clôture */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h4 className="font-semibold text-[#191919] mb-4">⚡ Actions Rapides</h4>
                  <div className="space-y-2">
                    {[
                      { action: 'Validation écritures en attente', count: '8', path: '/accounting/entries' },
                      { action: 'Contrôles automatiques', count: '5', path: '/accounting/validation' },
                      { action: 'Lettrage des comptes', count: '12', path: '/accounting/lettrage' },
                      { action: 'Génération états financiers', count: '3', path: '/financial-statements' }
                    ].map((item, index) => (
                      <button 
                        key={index}
                        onClick={() => navigate(item.path)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-[#E8E8E8] hover:border-[#6A8A82] hover:bg-[#6A8A82]/5 transition-colors group"
                      >
                        <span className="text-sm text-[#444444]">{item.action}</span>
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full font-medium">
                          {item.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h4 className="font-semibold text-[#191919] mb-4">📊 Contrôles</h4>
                  <div className="space-y-3">
                    {[
                      { controle: 'Balance équilibrée', statut: 'OK', color: 'green' },
                      { controle: 'Comptes lettrés', statut: '98%', color: 'blue' },
                      { controle: 'Provisions actualisées', statut: 'En cours', color: 'yellow' },
                      { controle: 'Amortissements calculés', statut: 'OK', color: 'green' }
                    ].map((ctrl, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                        <span className="text-sm text-[#444444]">{ctrl.controle}</span>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          ctrl.color === 'green' ? 'bg-green-100 text-green-700' :
                          ctrl.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {ctrl.statut}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h4 className="font-semibold text-[#191919] mb-4">📄 Documents</h4>
                  <div className="space-y-2">
                    {[
                      { doc: 'Balance définitive', statut: 'Généré', date: '10/09/2025' },
                      { doc: 'Grand livre', statut: 'En cours', date: '-' },
                      { doc: 'Journal centralisateur', statut: 'À générer', date: '-' }
                    ].map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                        <div>
                          <p className="text-sm text-[#444444]">{doc.doc}</p>
                          <p className="text-xs text-[#767676]">{doc.date}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          doc.statut === 'Généré' ? 'bg-green-100 text-green-700' :
                          doc.statut === 'En cours' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {doc.statut}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Clôture annuelle supprimée */}
          {false && activeTab === 'annuelle' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <h3 className="font-semibold text-[#191919] mb-4">📋 Clôture de l'Exercice 2025</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-[#6A8A82] mb-3">Étapes Obligatoires</h4>
                    <div className="space-y-2">
                      {[
                        { tache: 'Inventaire physique', deadline: '31/12/2025', statut: 'planifie' },
                        { tache: 'Provisions pour congés payés', deadline: '31/12/2025', statut: 'en_attente' },
                        { tache: 'Amortissements de fin d\'année', deadline: '31/12/2025', statut: 'en_attente' },
                        { tache: 'Écritures de régularisation', deadline: '05/01/2026', statut: 'en_attente' }
                      ].map((tache, index) => (
                        <div key={index} className="p-3 rounded-lg border border-[#E8E8E8] hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-[#191919]">{tache.tache}</p>
                              <p className="text-xs text-[#767676]">Échéance: {tache.deadline}</p>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                              tache.statut === 'planifie' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {tache.statut === 'planifie' ? 'Planifié' : 'En attente'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-[#B87333] mb-3">Documents de Clôture</h4>
                    <div className="space-y-2">
                      {[
                        'Bilan SYSCOHADA',
                        'Compte de résultat',
                        'TAFIRE', 
                        'États annexes',
                        'Rapport de gestion'
                      ].map((doc, index) => (
                        <div key={index} className="p-3 rounded-lg border border-[#E8E8E8] hover:border-[#B87333] hover:bg-[#B87333]/5 transition-colors cursor-pointer">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-[#444444]">{doc}</span>
                            <div className="flex items-center space-x-1">
                              <Eye className="w-3 h-3 text-[#767676]" />
                              <Download className="w-3 h-3 text-[#B87333]" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'controles' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h4 className="font-semibold text-[#191919] mb-4">✅ Contrôles Automatiques</h4>
                  <div className="space-y-3">
                    {[
                      { controle: 'Équilibrage balance', resultat: 'Conforme', score: 100 },
                      { controle: 'Cohérence SYSCOHADA', resultat: 'Conforme', score: 98 },
                      { controle: 'Lettrage comptes tiers', resultat: 'Attention', score: 85 },
                      { controle: 'Provisions réglementaires', resultat: 'OK', score: 92 }
                    ].map((ctrl, index) => (
                      <div key={index} className="p-3 rounded-lg bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-[#444444]">{ctrl.controle}</span>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            ctrl.score >= 95 ? 'bg-green-100 text-green-700' :
                            ctrl.score >= 80 ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {ctrl.resultat}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full bg-[#6A8A82]"
                            style={{width: `${ctrl.score}%`}}
                          ></div>
                        </div>
                        <p className="text-xs text-[#767676] mt-1">{ctrl.score}%</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h4 className="font-semibold text-[#191919] mb-4">🎯 Actions Requises</h4>
                  <div className="space-y-2">
                    {[
                      { action: 'Finaliser lettrage clients', priorite: 'haute', delai: '2j' },
                      { action: 'Valider provisions congés', priorite: 'moyenne', delai: '5j' },
                      { action: 'Contrôler stock final', priorite: 'haute', delai: '1j' }
                    ].map((action, index) => (
                      <div key={index} className={`p-3 rounded-lg border-l-4 ${
                        action.priorite === 'haute' ? 'bg-red-50 border-red-400' :
                        action.priorite === 'moyenne' ? 'bg-yellow-50 border-yellow-400' :
                        'bg-blue-50 border-blue-400'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-[#191919]">{action.action}</p>
                            <p className="text-xs text-[#767676]">Dans {action.delai}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            action.priorite === 'haute' ? 'bg-red-100 text-red-700' :
                            action.priorite === 'moyenne' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {action.priorite}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ANALYTICS IA */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Header Analytics */}
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-6 border-2 border-blue-500/20">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#191919]">🧠 Analytics IA - Intelligence Financière</h3>
                    <p className="text-[#767676]">Analyses prédictives et insights avancés pour la performance des clôtures</p>
                  </div>
                </div>

                {/* KPIs Principaux */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-green-800">Gain Temps</span>
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-green-600">-62%</p>
                    <p className="text-xs text-green-700">vs méthode manuelle</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-800">Précision</span>
                      <Award className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-blue-600">98.7%</p>
                    <p className="text-xs text-blue-700">score qualité</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-purple-800">Automatisation</span>
                      <Bot className="w-4 h-4 text-purple-600" />
                    </div>
                    <p className="text-2xl font-bold text-purple-600">89%</p>
                    <p className="text-xs text-purple-700">tâches automatisées</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-orange-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-orange-800">Conformité</span>
                      <Shield className="w-4 h-4 text-orange-600" />
                    </div>
                    <p className="text-2xl font-bold text-orange-600">100%</p>
                    <p className="text-xs text-orange-700">SYSCOHADA</p>
                  </div>
                </div>
              </div>

              {/* Graphiques de Performance */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h4 className="font-bold text-[#191919] mb-4 flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    <span>Évolution Performance</span>
                  </h4>
                  <div className="space-y-4">
                    {[
                      { mois: 'Janvier', temps: 12, errors: 8, score: 94 },
                      { mois: 'Février', temps: 10, errors: 5, score: 96 },
                      { mois: 'Mars', temps: 8, errors: 3, score: 97 },
                      { mois: 'Avril', temps: 7, errors: 2, score: 98 },
                      { mois: 'Mai', temps: 6, errors: 1, score: 99 },
                      { mois: 'Juin', temps: 5, errors: 1, score: 99 }
                    ].map((data, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                        <span className="font-medium text-[#191919] w-20">{data.mois}</span>
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="flex-1">
                            <div className="flex justify-between text-xs mb-1">
                              <span>Temps: {data.temps}h</span>
                              <span>Score: {data.score}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="h-2 bg-gradient-to-r from-blue-500 to-green-500 rounded-full"
                                style={{width: `${data.score}%`}}
                              ></div>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            data.errors <= 1 ? 'bg-green-100 text-green-700' :
                            data.errors <= 3 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {data.errors} erreurs
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h4 className="font-bold text-[#191919] mb-4 flex items-center space-x-2">
                    <Target className="w-5 h-5 text-purple-600" />
                    <span>Prédictions IA</span>
                  </h4>
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                      <h5 className="font-semibold text-blue-800 mb-2">🔮 Prochaine Clôture (Juillet 2025)</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-blue-700">Durée estimée:</span>
                          <span className="font-semibold text-blue-900">4h 30min</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Risque d'erreurs:</span>
                          <span className="font-semibold text-green-600">Très faible (0.8%)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Score qualité prévu:</span>
                          <span className="font-semibold text-blue-900">99.2%</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h5 className="font-semibold text-yellow-800 mb-2">⚠️ Points d'Attention</h5>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        <li>• Pic de charge prévu semaine 28</li>
                        <li>• Formation équipe recommandée sur module provisions</li>
                        <li>• Mise à jour réglementaire SYSCOHADA prévue</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h5 className="font-semibold text-green-800 mb-2">💡 Optimisations Suggérées</h5>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>• Automatiser lettrage fournisseurs (+15% gain)</li>
                        <li>• Implémenter contrôles prédictifs</li>
                        <li>• Optimiser flux validation inter-services</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Analytics Détaillées */}
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <h4 className="font-bold text-[#191919] mb-4 flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-indigo-600" />
                  <span>Analytics Détaillées par Processus</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    {
                      processus: 'Lettrage Automatique',
                      performance: 94,
                      temps_moyen: '25min',
                      erreurs: 2,
                      amelioration: '+8%',
                      couleur: 'blue'
                    },
                    {
                      processus: 'Contrôles SYSCOHADA',
                      performance: 98,
                      temps_moyen: '18min',
                      erreurs: 1,
                      amelioration: '+12%',
                      couleur: 'green'
                    },
                    {
                      processus: 'Calculs Provisions',
                      performance: 96,
                      temps_moyen: '35min',
                      erreurs: 0,
                      amelioration: '+15%',
                      couleur: 'purple'
                    },
                    {
                      processus: 'États Financiers',
                      performance: 92,
                      temps_moyen: '45min',
                      erreurs: 3,
                      amelioration: '+5%',
                      couleur: 'indigo'
                    },
                    {
                      processus: 'Validation Finale',
                      performance: 99,
                      temps_moyen: '12min',
                      erreurs: 0,
                      amelioration: '+20%',
                      couleur: 'teal'
                    },
                    {
                      processus: 'Export Documents',
                      performance: 97,
                      temps_moyen: '8min',
                      erreurs: 1,
                      amelioration: '+18%',
                      couleur: 'orange'
                    }
                  ].map((proc, index) => (
                    <div key={index} className={`p-4 rounded-lg border border-${proc.couleur}-200 bg-${proc.couleur}-50`}>
                      <h5 className={`font-semibold text-${proc.couleur}-800 mb-3`}>{proc.processus}</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className={`text-${proc.couleur}-700`}>Performance:</span>
                          <span className={`font-bold text-${proc.couleur}-900`}>{proc.performance}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className={`text-${proc.couleur}-700`}>Temps moyen:</span>
                          <span className={`font-bold text-${proc.couleur}-900`}>{proc.temps_moyen}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className={`text-${proc.couleur}-700`}>Erreurs:</span>
                          <span className={`font-bold ${proc.erreurs === 0 ? 'text-green-600' : proc.erreurs <= 2 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {proc.erreurs}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className={`text-${proc.couleur}-700`}>Amélioration:</span>
                          <span className={`font-bold text-green-600`}>{proc.amelioration}</span>
                        </div>
                        <div className={`w-full bg-${proc.couleur}-200 rounded-full h-2 mt-2`}>
                          <div
                            className={`h-2 bg-${proc.couleur}-500 rounded-full`}
                            style={{width: `${proc.performance}%`}}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PeriodicClosuresModule;