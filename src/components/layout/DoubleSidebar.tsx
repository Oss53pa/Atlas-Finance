import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Link, useLocation } from 'react-router-dom';
import { useNavigation } from '../../contexts/NavigationContext';
import {
  LayoutDashboard,
  Calculator,
  Users,
  DollarSign,
  Building,
  PieChart,
  Target,
  FileText,
  TrendingUp,
  Shield,
  Settings,
  ChevronRight,
  Menu,
  X,
  Home,
  CreditCard,
  Briefcase,
  BarChart3,
  FileBarChart,
  Book,
  Receipt,
  UserPlus,
  Building2,
  Contact,
  Banknote,
  ArrowUpDown,
  CheckSquare,
  TrendingDown,
  Package,
  Calculator as CalcIcon,
  Layers,
  MapPin,
  Wallet,
  FileCheck,
  ClipboardList,
  AlertTriangle,
  UserCheck,
  ShieldCheck,
  Key,
  Calendar
} from 'lucide-react';

interface SubModule {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
}

interface Module {
  icon: React.ElementType;
  label: string;
  href: string;
  color: string;
  subModules?: SubModule[];
}

const DoubleSidebar: React.FC = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const {
    isMobile,
    mainSidebarOpen,
    subSidebarOpen,
    mobileSidebarOpen,
    setMainSidebarOpen,
    setSubSidebarOpen,
    setMobileSidebarOpen
  } = useNavigation();

  const modules: Module[] = [
    {
      icon: LayoutDashboard,
      label: t('dashboard.title'),
      href: '/dashboard',
      color: 'from-blue-500 to-blue-600',
      subModules: [
        { icon: Home, label: 'Vue d\'ensemble', href: '/dashboard' },
        { icon: TrendingUp, label: 'Executive', href: '/executive' },
        { icon: BarChart3, label: 'Analyse Financière', href: '/financial-analysis-advanced' }
      ]
    },
    {
      icon: Calculator,
      label: t('accounting.title'),
      href: '/accounting',
      color: 'from-emerald-500 to-emerald-600',
      subModules: [
        { icon: Book, label: t('dashboard.title'), href: '/accounting' },
        { icon: FileText, label: t('navigation.journals'), href: '/accounting/journals' },
        { icon: Receipt, label: 'Écritures', href: '/accounting/entries' },
        { icon: TrendingUp, label: '🧠 Saisie Intelligente', href: '/accounting/entries-advanced' },
        { icon: CalcIcon, label: t('accounting.balance'), href: '/accounting/balance' },
        { icon: FileBarChart, label: 'Grand Livre', href: '/accounting/general-ledger' },
        { icon: ArrowUpDown, label: t('thirdParty.matching'), href: '/accounting/lettrage' },
        { icon: BarChart3, label: '📊 États SYSCOHADA', href: '/financial-statements' },
        { icon: PieChart, label: '📊 Ratios Financiers', href: '/accounting/ratios' },
        { icon: CheckSquare, label: '🔒 Clôtures Périodiques', href: '/closures' }
      ]
    },
    {
      icon: Users,
      label: 'Tiers',
      href: '/third-party',
      color: 'from-purple-500 to-purple-600',
      subModules: [
        { icon: UserPlus, label: t('dashboard.title'), href: '/third-party' },
        { icon: Building2, label: t('thirdParty.customers'), href: '/customers-advanced', badge: 3 },
        { icon: TrendingUp, label: '💰 Recouvrement Intelligent', href: '/customers/recovery' },
        { icon: CheckSquare, label: '🔗 Lettrage Clients', href: '/customers/lettrage' },
        { icon: Briefcase, label: t('thirdParty.suppliers'), href: '/suppliers-advanced' },
        { icon: DollarSign, label: '⏰ Échéances Fournisseurs', href: '/suppliers/payments' },
        { icon: Contact, label: 'Contacts', href: '/third-party/contacts' }
      ]
    },
    {
      icon: DollarSign,
      label: t('treasury.title'),
      href: '/treasury/position',
      color: 'from-green-500 to-green-600',
      subModules: [
        { icon: Wallet, label: 'Position temps réel', href: '/treasury/position' },
        { icon: TrendingDown, label: 'Prévisions', href: '/treasury/cash-flow' },
        { icon: ArrowUpDown, label: '💸 Gestion Paiements', href: '/treasury/payments' },
        { icon: Building2, label: '🏦 Connexions Bancaires', href: '/treasury/banking' },
        { icon: CreditCard, label: '🏦 Emprunts', href: '/treasury/loans' },
        { icon: Banknote, label: '📊 Appels de fonds', href: '/treasury/fund-calls' },
        { icon: CheckSquare, label: 'Rapprochements', href: '/treasury/reconciliation' }
      ]
    },
    {
      icon: Building,
      label: t('assets.title'),
      href: '/assets',
      color: 'from-orange-500 to-orange-600',
      subModules: [
        { icon: Package, label: t('dashboard.title'), href: '/assets' },
        { icon: Building, label: '🏭 Gestion Patrimoine', href: '/assets/fixed-assets' },
        { icon: TrendingDown, label: '📉 Amortissements Multi-Méthodes', href: '/assets/depreciation' },
        { icon: Calculator, label: 'Cycle de Vie Complet', href: '/assets/lifecycle' },
        { icon: CheckSquare, label: 'Inventaire Physique', href: '/assets/inventory' }
      ]
    },
    {
      icon: PieChart,
      label: 'Analytique',
      href: '/analytics',
      color: 'from-indigo-500 to-indigo-600',
      subModules: [
        { icon: PieChart, label: t('dashboard.title'), href: '/analytics' },
        { icon: Layers, label: t('settings.analyticalAxes'), href: '/analytics/axes' },
        { icon: MapPin, label: 'Centres de coûts', href: '/analytics/cost-centers' }
      ]
    },
    {
      icon: Target,
      label: t('budget.title'),
      href: '/budgeting',
      color: 'from-pink-500 to-pink-600',
      subModules: [
        { icon: Target, label: t('dashboard.title'), href: '/budgeting' },
        { icon: ClipboardList, label: 'Budgets', href: '/budgeting/budgets' },
        { icon: FileCheck, label: t('budget.control'), href: '/budgeting/control' }
      ]
    },
    {
      icon: FileText,
      label: 'Fiscalité',
      href: '/taxation',
      color: 'from-red-500 to-red-600',
      subModules: [
        { icon: FileText, label: t('dashboard.title'), href: '/taxation' },
        { icon: FileCheck, label: '📋 Télédéclarations', href: '/taxation/declarations' },
        { icon: Calendar, label: 'Échéances Fiscales', href: '/taxation/deadlines' },
        { icon: Calculator, label: 'Calculs Automatiques', href: '/taxation/calculations' },
        { icon: BarChart3, label: 'Liasse Fiscale', href: '/taxation/fiscal-package' }
      ]
    },
    {
      icon: TrendingUp,
      label: 'Reporting',
      href: '/reporting',
      color: 'from-cyan-500 to-cyan-600',
      subModules: [
        { icon: BarChart3, label: t('dashboard.title'), href: '/reporting' },
        { icon: FileBarChart, label: t('reports.title'), href: '/reporting/reports' },
        { icon: LayoutDashboard, label: 'Dashboards', href: '/reporting/dashboards' }
      ]
    },
    {
      icon: Shield,
      label: t('settings.security'),
      href: '/security',
      color: 'from-gray-500 to-gray-600',
      subModules: [
        { icon: Shield, label: t('dashboard.title'), href: '/security' },
        { icon: UserCheck, label: 'Utilisateurs', href: '/security/users' },
        { icon: ShieldCheck, label: 'Rôles', href: '/security/roles' },
        { icon: Key, label: 'Permissions', href: '/security/permissions' }
      ]
    },
    {
      icon: Settings,
      label: t('settings.title'),
      href: '/parameters',
      color: 'from-slate-500 to-slate-600',
      subModules: [
        { icon: Settings, label: '🏗️ Centre de Configuration', href: '/config' },
        { icon: Building2, label: 'Assistant Démarrage', href: '/setup-wizard' },
        { icon: Building, label: 'Multi-Sociétés', href: '/multi-company-advanced' },
        { icon: Calculator, label: 'Plan SYSCOHADA', href: '/config/accounts' },
        { icon: DollarSign, label: 'TVA et Taxes', href: '/config/vat-taxes' },
        { icon: Users, label: 'Codification Tiers', href: '/config/third-party-codes' },
        { icon: Target, label: 'Axes Analytiques', href: '/config/analytical-axes' },
        { icon: FileText, label: t('settings.importExport'), href: '/config/import-export' },
        { icon: Shield, label: 'Profils Sécurité', href: '/config/security-profiles' }
      ]
    }
  ];

  const getActiveModule = () => {
    const path = location.pathname;
    return modules.find(module => {
      if (module.subModules) {
        return module.subModules.some(sub => path.startsWith(sub.href)) || path.startsWith(module.href);
      }
      return path.startsWith(module.href);
    });
  };

  const activeModule = getActiveModule();
  const currentSubModules = activeModule?.subModules;

  // Gérer automatiquement l'ouverture de la sidebar secondaire selon le module actif
  useEffect(() => {
    if (!isMobile && activeModule && activeModule.subModules && activeModule.subModules.length > 0) {
      setSubSidebarOpen(true);
    } else if (!isMobile && activeModule && (!activeModule.subModules || activeModule.subModules.length === 0)) {
      setSubSidebarOpen(false);
    }
  }, [location.pathname, isMobile, activeModule, setSubSidebarOpen]);

  return (
    <>
      {/* Sidebar Principale - Modules */}
      <div className={`fixed left-0 top-0 h-full bg-slate-900 text-white transition-all duration-300 z-30 ${
        isMobile 
          ? (mobileSidebarOpen ? 'w-64' : 'w-0 -translate-x-full')
          : (mainSidebarOpen ? 'w-64' : 'w-16')
      }`}>
        {/* Header */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            {mainSidebarOpen && !isMobile && (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">W</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold">Atlas Finance</h1>
                  <p className="text-xs text-slate-400">SYSCOHADA</p>
                </div>
              </div>
            )}
            {isMobile && mobileSidebarOpen && (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">W</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold">Atlas Finance</h1>
                  <p className="text-xs text-slate-400">SYSCOHADA</p>
                </div>
              </div>
            )}
            <button
              onClick={() => {
                if (isMobile) {
                  setMobileSidebarOpen(false);
                } else {
                  setMainSidebarOpen(!mainSidebarOpen);
                }
              }}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
              title={mainSidebarOpen ? "Réduire" : "Étendre"}
            >
              {(isMobile ? mobileSidebarOpen : mainSidebarOpen) ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Navigation Modules */}
        <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-80px)]">
          {modules.map((module) => {
            const Icon = module.icon;
            const isActive = activeModule?.label === module.label;
            const hasSubModules = module.subModules && module.subModules.length > 0;

            return (
              <div key={module.label}>
                <Link
                  to={module.href}
                  onClick={() => {
                    if (hasSubModules && !isMobile) {
                      setSubSidebarOpen(true);
                    } else {
                      setSubSidebarOpen(false);
                    }
                    if (isMobile) {
                      setMobileSidebarOpen(false);
                    }
                  }}
                  className={`
                    flex items-center justify-between p-3 rounded-lg transition-all duration-200
                    ${isActive
                      ? 'bg-gradient-to-r ' + module.color + ' text-white shadow-lg'
                      : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                    }
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`h-5 w-5 ${!mainSidebarOpen ? 'mx-auto' : ''}`} />
                    {mainSidebarOpen && (
                      <span className="font-medium text-sm">{module.label}</span>
                    )}
                  </div>
                  {mainSidebarOpen && hasSubModules && (
                    <ChevronRight className={`h-4 w-4 transition-transform ${
                      isActive ? 'rotate-90' : ''
                    }`} />
                  )}
                </Link>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Secondaire - Sous-modules */}
      {currentSubModules && subSidebarOpen && !isMobile && (
        <div className={`fixed top-0 h-full bg-white border-r border-gray-200 shadow-lg transition-all duration-300 z-20 w-60`}
          style={{ 
            left: mainSidebarOpen ? '256px' : '64px'
          }}
        >
          {/* Header Sous-modules */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">
                {activeModule?.label}
              </h2>
              <button
                onClick={() => setSubSidebarOpen(false)}
                className="p-1 rounded hover:bg-gray-200 transition-colors"
              >
                <X className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Navigation Sous-modules */}
          <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-80px)]">
            {currentSubModules.map((subModule) => {
              const SubIcon = subModule.icon;
              const isSubActive = location.pathname === subModule.href;

              return (
                <Link
                  key={subModule.href}
                  to={subModule.href}
                  className={`
                    flex items-center justify-between p-3 rounded-lg transition-all duration-200
                    ${isSubActive
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500'
                      : 'hover:bg-gray-50 text-gray-700 hover:text-gray-900'
                    }
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <SubIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">{subModule.label}</span>
                  </div>
                  {subModule.badge && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                      {subModule.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Overlay pour mobile */}
      {isMobile && mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10"
          onClick={() => {
            setMobileSidebarOpen(false);
            setSubSidebarOpen(false);
          }}
        />
      )}
    </>
  );
};

export default DoubleSidebar;