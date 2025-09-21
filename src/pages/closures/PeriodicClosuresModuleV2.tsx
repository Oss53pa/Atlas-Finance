import React, { useState } from 'react';
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
  ClipboardCheck, FileSpreadsheet, BookOpen, UserCheck,
  Info, HelpCircle, MessageSquare
} from 'lucide-react';

// Import des composants de section
import RapprochementBancaire from './sections/RapprochementBancaire';
import CycleClients from './sections/CycleClients';
import CycleFournisseurs from './sections/CycleFournisseurs';
import GestionStocks from './sections/GestionStocks';
import Immobilisations from './sections/Immobilisations';
import Provisions from './sections/Provisions';
import ControlesCoherence from './sections/ControlesCoherence';
import EtatsSYSCOHADA from './sections/EtatsSYSCOHADA';
import ValidationFinale from './sections/ValidationFinale';
import ParametragePeriodes from './sections/ParametragePeriodes';
import IAAssistant from './sections/IAAssistant';
import DocumentsArchives from './sections/DocumentsArchives';
import ControlePeriodes from './sections/ControlePeriodes';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  children?: MenuItem[];
  badge?: string;
  badgeType?: 'success' | 'warning' | 'error' | 'info';
  description?: string;
}

const PeriodicClosuresModuleV2: React.FC = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['operations', 'controles']);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('2025-01');

  // Structure du menu selon le cahier des charges
  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard Pilotage',
      icon: <BarChart3 className="w-4 h-4" />,
      description: 'Vue d\'ensemble et KPIs temps réel'
    },
    {
      id: 'operations',
      label: 'Opérations de Clôture',
      icon: <Briefcase className="w-4 h-4" />,
      children: [
        {
          id: 'tresorerie',
          label: 'Caisse & Trésorerie',
          icon: <Wallet className="w-4 h-4" />,
          badge: '3',
          badgeType: 'warning'
        },
        {
          id: 'rapprochement',
          label: 'Rapprochement Bancaire',
          icon: <Landmark className="w-4 h-4" />,
          badge: 'IA',
          badgeType: 'info'
        },
        {
          id: 'clients',
          label: 'Cycle Clients',
          icon: <Users className="w-4 h-4" />
        },
        {
          id: 'fournisseurs',
          label: 'Cycle Fournisseurs',
          icon: <ShoppingCart className="w-4 h-4" />
        },
        {
          id: 'stocks',
          label: 'Gestion des Stocks',
          icon: <Package className="w-4 h-4" />
        },
        {
          id: 'immobilisations',
          label: 'Immobilisations',
          icon: <Building2 className="w-4 h-4" />
        },
        {
          id: 'provisions',
          label: 'Provisions & Régul.',
          icon: <Calculator className="w-4 h-4" />
        }
      ]
    },
    {
      id: 'controles',
      label: 'Contrôles & Validation',
      icon: <ClipboardCheck className="w-4 h-4" />,
      children: [
        {
          id: 'coherence',
          label: 'Contrôles Cohérence',
          icon: <CheckCircle className="w-4 h-4" />,
          badge: '!',
          badgeType: 'error'
        },
        {
          id: 'etats',
          label: 'États SYSCOHADA',
          icon: <FileSpreadsheet className="w-4 h-4" />
        },
        {
          id: 'validation',
          label: 'Validation Finale',
          icon: <UserCheck className="w-4 h-4" />
        },
        {
          id: 'documents',
          label: 'Documents & Archives',
          icon: <Archive className="w-4 h-4" />,
          badge: 'Nouveau',
          badgeType: 'success'
        }
      ]
    },
    {
      id: 'configuration',
      label: 'Configuration',
      icon: <Settings className="w-4 h-4" />,
      children: [
        {
          id: 'parametrage',
          label: 'Paramétrage Périodes',
          icon: <Calendar className="w-4 h-4" />,
          badge: 'Admin',
          badgeType: 'info'
        },
        {
          id: 'controle-periodes',
          label: 'Contrôle Périodes',
          icon: <Shield className="w-4 h-4" />,
          badge: 'Important',
          badgeType: 'error'
        }
      ]
    },
    {
      id: 'ia',
      label: 'IA & Automation',
      icon: <Brain className="w-4 h-4" />,
      badge: 'Pro',
      badgeType: 'info'
    }
  ];

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev =>
      prev.includes(menuId)
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  const getBadgeClass = (type?: string) => {
    switch (type) {
      case 'success': return 'bg-[#4B8B3B]/10 text-[#4B8B3B]';
      case 'warning': return 'bg-[#FFB347]/10 text-[#FFB347]';
      case 'error': return 'bg-[#DC3545]/10 text-[#DC3545]';
      case 'info': return 'bg-[#6A8A82]/10 text-[#6A8A82]';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Composant Dashboard Principal
  const DashboardContent = () => (
    <div className="p-6 space-y-6">
      {/* KPIs principaux */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#767676]">Progression Globale</span>
            <Activity className="w-4 h-4 text-[#6A8A82]" />
          </div>
          <p className="text-2xl font-bold text-[#191919]">68%</p>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div className="h-2 bg-[#6A8A82] rounded-full" style={{width: '68%'}}></div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#767676]">Écritures Traitées</span>
            <FileText className="w-4 h-4 text-[#4B8B3B]" />
          </div>
          <p className="text-2xl font-bold text-[#191919]">12,458</p>
          <p className="text-xs text-[#4B8B3B]">+2.3% vs N-1</p>
        </div>

        <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#767676]">Anomalies Détectées</span>
            <AlertTriangle className="w-4 h-4 text-[#FFB347]" />
          </div>
          <p className="text-2xl font-bold text-[#191919]">23</p>
          <p className="text-xs text-[#FFB347]">7 critiques</p>
        </div>

        <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#767676]">Temps Restant</span>
            <Clock className="w-4 h-4 text-[#767676]" />
          </div>
          <p className="text-2xl font-bold text-[#191919]">3j 14h</p>
          <p className="text-xs text-[#767676]">Échéance: 05/02/2025</p>
        </div>
      </div>

      {/* Workflow IA Status */}
      <div className="bg-gradient-to-r from-[#6A8A82]/10 to-[#8FA9A3]/10 rounded-lg p-6 border-2 border-[#6A8A82]/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#6A8A82] to-[#8FA9A3] flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#191919]">Assistant IA Actif</h3>
              <p className="text-sm text-[#767676]">Automatisation en cours - 12 tâches</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] flex items-center space-x-2">
            <MessageSquare className="w-4 h-4" />
            <span>Consulter l'IA</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/50 rounded-lg p-3">
            <p className="text-xs text-[#767676] mb-1">Lettrage automatique</p>
            <p className="font-semibold">2,847 écritures</p>
            <p className="text-xs text-[#4B8B3B]">Taux: 94%</p>
          </div>
          <div className="bg-white/50 rounded-lg p-3">
            <p className="text-xs text-[#767676] mb-1">Provisions suggérées</p>
            <p className="font-semibold">458,000 FCFA</p>
            <p className="text-xs text-[#6A8A82]">À valider</p>
          </div>
          <div className="bg-white/50 rounded-lg p-3">
            <p className="text-xs text-[#767676] mb-1">Anomalies corrigées</p>
            <p className="font-semibold">18/23</p>
            <p className="text-xs text-[#FFB347]">5 en attente</p>
          </div>
        </div>
      </div>

      {/* Progression par cycle */}
      <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
        <h3 className="text-lg font-bold text-[#191919] mb-4">Progression par Cycle</h3>
        <div className="space-y-3">
          {[
            { label: 'Trésorerie', progress: 85, status: 'success' },
            { label: 'Rapprochement Bancaire', progress: 70, status: 'warning' },
            { label: 'Cycle Clients', progress: 92, status: 'success' },
            { label: 'Cycle Fournisseurs', progress: 45, status: 'error' },
            { label: 'Stocks', progress: 60, status: 'warning' },
            { label: 'Immobilisations', progress: 100, status: 'success' },
            { label: 'Provisions', progress: 30, status: 'error' }
          ].map((item, idx) => (
            <div key={idx}>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-[#444444]">{item.label}</span>
                <span className="text-sm font-semibold">{item.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    item.status === 'success' ? 'bg-[#4B8B3B]' :
                    item.status === 'warning' ? 'bg-[#FFB347]' : 'bg-[#DC3545]'
                  }`}
                  style={{width: `${item.progress}%`}}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Composant Section Trésorerie
  const TresorerieContent = () => (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
        <h2 className="text-xl font-bold text-[#191919] mb-4">Clôture de Caisse et Trésorerie</h2>

        {/* Statut global */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-[#4B8B3B]/10 rounded-lg border border-[#4B8B3B]/30">
            <p className="text-sm text-[#4B8B3B] mb-1">Caisses rapprochées</p>
            <p className="text-2xl font-bold text-[#4B8B3B]">12/15</p>
          </div>
          <div className="p-4 bg-[#FFB347]/10 rounded-lg border border-[#FFB347]/30">
            <p className="text-sm text-[#FFB347] mb-1">Écarts à justifier</p>
            <p className="text-2xl font-bold text-[#FFB347]">3</p>
          </div>
          <div className="p-4 bg-[#6A8A82]/10 rounded-lg border border-[#6A8A82]/30">
            <p className="text-sm text-[#6A8A82] mb-1">Solde global</p>
            <p className="text-2xl font-bold text-[#6A8A82]">2.5M FCFA</p>
          </div>
        </div>

        {/* Liste des caisses */}
        <div className="space-y-3">
          <h3 className="font-semibold text-[#191919]">État des Caisses</h3>
          {[
            { nom: 'Caisse Principale', solde: 850000, statut: 'ok', ecart: 0 },
            { nom: 'Caisse Secondaire', solde: 425000, statut: 'warning', ecart: -2500 },
            { nom: 'Caisse USD', solde: 325000, statut: 'ok', ecart: 0 },
            { nom: 'Caisse Petite Monnaie', solde: 125000, statut: 'error', ecart: -15000 }
          ].map((caisse, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center space-x-3">
                <Wallet className={`w-5 h-5 ${
                  caisse.statut === 'ok' ? 'text-[#4B8B3B]' :
                  caisse.statut === 'warning' ? 'text-[#FFB347]' : 'text-[#DC3545]'
                }`} />
                <div>
                  <p className="font-medium text-[#191919]">{caisse.nom}</p>
                  <p className="text-sm text-[#767676]">Solde: {caisse.solde.toLocaleString('fr-FR')} FCFA</p>
                </div>
              </div>
              <div className="text-right">
                {caisse.ecart !== 0 && (
                  <p className={`text-sm font-medium ${caisse.ecart < 0 ? 'text-[#DC3545]' : 'text-[#4B8B3B]'}`}>
                    Écart: {caisse.ecart.toLocaleString('fr-FR')} FCFA
                  </p>
                )}
                <button className="text-sm text-[#6A8A82] hover:underline">Détails →</button>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-between">
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Exporter rapport</span>
          </button>
          <button className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span>Valider la clôture</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Fonction pour rendre le contenu selon la section active
  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardContent />;
      case 'tresorerie':
        return <TresorerieContent />;
      case 'rapprochement':
        return <RapprochementBancaire />;
      case 'clients':
        return <CycleClients />;
      case 'fournisseurs':
        return <CycleFournisseurs />;
      case 'stocks':
        return <GestionStocks />;
      case 'immobilisations':
        return <Immobilisations />;
      case 'provisions':
        return <Provisions />;
      case 'coherence':
        return <ControlesCoherence />;
      case 'etats':
        return <EtatsSYSCOHADA />;
      case 'validation':
        return <ValidationFinale />;
      case 'documents':
        return <DocumentsArchives />;
      case 'parametrage':
        return <ParametragePeriodes />;
      case 'controle-periodes':
        return <ControlePeriodes />;
      case 'ia':
        return <IAAssistant />;
      default:
        return (
          <div className="p-6">
            <div className="bg-white rounded-lg p-12 border border-[#E8E8E8] text-center">
              <Info className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-[#191919] mb-2">Section en développement</h3>
              <p className="text-[#767676]">Cette fonctionnalité sera bientôt disponible</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-[#ECECEC] font-['Sometype Mono']">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-white border-r border-[#E8E8E8] transition-all duration-300 flex flex-col`}>
        {/* Header Sidebar */}
        <div className="p-4 border-b border-[#E8E8E8]">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-2">
                <Archive className="w-5 h-5 text-[#6A8A82]" />
                <span className="font-bold text-[#191919]">Clôture Périodique</span>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Menu */}
        <div className="flex-1 overflow-y-auto p-2">
          {menuItems.map(item => (
            <div key={item.id} className="mb-1">
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
                <div className="flex items-center space-x-2">
                  {item.icon}
                  {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
                </div>
                {!sidebarCollapsed && (
                  <>
                    {item.badge && (
                      <span className={`px-2 py-0.5 rounded-full text-xs ${getBadgeClass(item.badgeType)}`}>
                        {item.badge}
                      </span>
                    )}
                    {item.children && (
                      expandedMenus.includes(item.id) ?
                        <ChevronDown className="w-3 h-3" /> :
                        <ChevronRight className="w-3 h-3" />
                    )}
                  </>
                )}
              </button>

              {/* Sous-menu */}
              {item.children && expandedMenus.includes(item.id) && !sidebarCollapsed && (
                <div className="ml-6 mt-1 space-y-1">
                  {item.children.map(child => (
                    <button
                      key={child.id}
                      onClick={() => setActiveSection(child.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                        activeSection === child.id
                          ? 'bg-[#6A8A82]/10 text-[#6A8A82]'
                          : 'hover:bg-gray-50 text-[#767676]'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {child.icon}
                        <span>{child.label}</span>
                      </div>
                      {child.badge && (
                        <span className={`px-1.5 py-0.5 rounded-full text-xs ${getBadgeClass(child.badgeType)}`}>
                          {child.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-[#E8E8E8] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard/comptable')}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Retour</span>
              </button>
              <div>
                <h1 className="text-xl font-bold text-[#191919]">Module de Clôture Périodique</h1>
                <p className="text-sm text-[#767676]">OHADA/SYSCOHADA - Période: {selectedPeriod}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <HelpCircle className="w-5 h-5 text-[#767676]" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <Settings className="w-5 h-5 text-[#767676]" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-[#F5F5F5]">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default PeriodicClosuresModuleV2;