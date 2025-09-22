import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import {
  LayoutDashboard, FileText, Users, CreditCard, TrendingUp,
  Settings, ChevronLeft, ChevronRight, Search, Bell, User,
  LogOut, Menu, X, Moon, Sun, Palette, Building2,
  Calculator, PiggyBank, FileBarChart, Shield, Package,
  DollarSign, BarChart3, Briefcase, Receipt, UserCheck,
  Database, Globe, HelpCircle, Activity, Lock, AlertTriangle,
  CheckCircle, Clock, FileCheck, Bot, Signature, ScanLine,
  MessageSquare, Smartphone, Workflow, RefreshCw, Wifi,
  Eye, ChartBar, Target, BookOpen, Archive, Download,
  Upload, Save, FolderOpen, Home, ChevronDown, Link, PieChart,
  Video, Calendar, Folder
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import ModernButton from '../ui/ModernButton';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  badge?: string | number;
  submenu?: MenuItem[];
  ariaLabel?: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  read: boolean;
}

const ModernDoubleSidebarLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, themeType, setTheme } = useTheme();

  const [primaryCollapsed, setPrimaryCollapsed] = useState(false);
  const [secondaryCollapsed, setSecondaryCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'Nouvelle facture',
      message: '3 nouvelles factures en attente de validation',
      type: 'info',
      timestamp: new Date(),
      read: false
    },
    {
      id: '2',
      title: 'Clôture mensuelle',
      message: 'La clôture de janvier est prête',
      type: 'success',
      timestamp: new Date(),
      read: false
    }
  ]);

  // Navigation clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + M pour toggle menu mobile
      if (e.altKey && e.key === 'm') {
        e.preventDefault();
        setMobileMenuOpen(prev => !prev);
      }
      // Alt + S pour recherche
      if (e.altKey && e.key === 's') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
      // Escape pour fermer les menus
      if (e.key === 'Escape') {
        setShowNotifications(false);
        setShowUserMenu(false);
        setShowThemeMenu(false);
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Modules principaux restructurés selon les standards ERP
  const primaryMenuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Tableau de Bord',
      icon: <LayoutDashboard className="w-5 h-5" />,
      path: '/dashboard',
      ariaLabel: 'Accéder au tableau de bord principal'
    },
    {
      id: 'accounting',
      label: 'Comptabilité Générale',
      icon: <Calculator className="w-5 h-5" />,
      badge: '3',
      ariaLabel: 'Accéder à la comptabilité générale'
    },
    {
      id: 'tiers',
      label: 'Gestion des Tiers',
      icon: <Users className="w-5 h-5" />,
      ariaLabel: 'Gérer les clients, fournisseurs et tiers'
    },
    {
      id: 'treasury',
      label: 'Trésorerie',
      icon: <PiggyBank className="w-5 h-5" />,
      ariaLabel: 'Gérer la trésorerie et les flux financiers'
    },
    {
      id: 'control',
      label: 'Contrôle de Gestion',
      icon: <Target className="w-5 h-5" />,
      ariaLabel: 'Contrôle de gestion et analyse'
    },
    {
      id: 'assets',
      label: 'Immobilisations',
      icon: <Package className="w-5 h-5" />,
      ariaLabel: 'Gérer les immobilisations'
    },
    {
      id: 'closures',
      label: 'Clôtures',
      icon: <Lock className="w-5 h-5" />,
      ariaLabel: 'Gérer les clôtures comptables'
    },
    {
      id: 'reporting',
      label: 'États & Reporting',
      icon: <FileBarChart className="w-5 h-5" />,
      ariaLabel: 'Accéder aux états et rapports'
    },
    {
      id: 'settings',
      label: 'Paramètres',
      icon: <Settings className="w-5 h-5" />,
      ariaLabel: 'Configurer les paramètres'
    }
  ];

  // Sous-menus restructurés et enrichis
  const secondaryMenuItems: Record<string, MenuItem[]> = {
    dashboard: [
      { id: 'global-view', label: 'Vue Globale', path: '/dashboard', icon: <Eye className="w-4 h-4" /> },
      { id: 'executive-view', label: 'Vue Executive', path: '/executive', icon: <TrendingUp className="w-4 h-4" /> },
      { id: 'kpis', label: 'KPIs Temps Réel', path: '/dashboard/kpis', icon: <Activity className="w-4 h-4" /> },
      { id: 'alerts', label: 'Alertes', path: '/dashboard/alerts', icon: <AlertTriangle className="w-4 h-4" />, badge: '5' },
      { id: 'ai-insights', label: 'IA Insights', path: '/dashboard/ai-insights', icon: <Bot className="w-4 h-4" /> },
      { id: 'workflows', label: 'Workflows', path: '/dashboard/workflows', icon: <Workflow className="w-4 h-4" /> }
    ],
    accounting: [
      { id: 'entries', label: 'Écritures & Saisie', path: '/accounting/entries', icon: <FileText className="w-4 h-4" />, badge: '3' },
      { id: 'journals', label: 'Journaux', path: '/accounting/journals', icon: <BookOpen className="w-4 h-4" /> },
      { id: 'general-ledger', label: 'Grand Livre', path: '/accounting/general-ledger', icon: <Database className="w-4 h-4" /> },
      { id: 'lettrage', label: 'Lettrage', path: '/accounting/lettrage', icon: <Link className="w-4 h-4" /> },
      { id: 'balance', label: 'Balance', path: '/accounting/balance', icon: <CheckCircle className="w-4 h-4" /> },
      { id: 'chart-accounts', label: 'Plan Comptable', path: '/accounting/chart-of-accounts', icon: <FolderOpen className="w-4 h-4" /> },
      { id: 'ocr-scanning', label: 'OCR Factures', path: '/accounting/ocr', icon: <ScanLine className="w-4 h-4" /> },
      { id: 'electronic-signature', label: 'Signature Électronique', path: '/accounting/signature', icon: <Signature className="w-4 h-4" /> }
    ],
    tiers: [
      { id: 'crm-clients', label: 'Clients', path: '/tiers/clients', icon: <UserCheck className="w-4 h-4" /> },
      { id: 'suppliers', label: 'Fournisseurs', path: '/tiers/fournisseurs', icon: <Briefcase className="w-4 h-4" /> },
      { id: 'recouvrement', label: 'Recouvrement', path: '/tiers/recouvrement', icon: <Receipt className="w-4 h-4" /> },
      { id: 'global-lettrage', label: 'Lettrage Global', path: '/tiers/lettrage', icon: <RefreshCw className="w-4 h-4" /> },
      { id: 'contacts', label: 'Contacts', path: '/tiers/contacts', icon: <Users className="w-4 h-4" /> }
    ],
    treasury: [
      { id: 'bank-positions', label: 'Positions Bancaires', path: '/treasury/positions', icon: <Building2 className="w-4 h-4" /> },
      { id: 'cash-flow', label: 'Prévisions Cash-Flow', path: '/treasury/cash-flow', icon: <TrendingUp className="w-4 h-4" /> },
      { id: 'reconciliation', label: 'Rapprochements', path: '/treasury/reconciliation', icon: <CheckCircle className="w-4 h-4" /> },
      { id: 'financing', label: 'Financements', path: '/treasury/financing', icon: <CreditCard className="w-4 h-4" /> },
      { id: 'fund-calls', label: 'Appels de Fonds', path: '/treasury/fund-calls', icon: <DollarSign className="w-4 h-4" /> },
      { id: 'multi-currency', label: 'Multi-devises', path: '/treasury/multi-currency', icon: <Globe className="w-4 h-4" /> }
    ],
    control: [
      { id: 'budgets', label: 'Budgets & Prévisions', path: '/budgeting', icon: <Target className="w-4 h-4" /> },
      { id: 'analytical', label: 'Comptabilité Analytique', path: '/reports', icon: <ChartBar className="w-4 h-4" /> },
      { id: 'dashboards', label: 'Tableaux de Bord', path: '/reporting/dashboards', icon: <BarChart3 className="w-4 h-4" /> },
      { id: 'variance', label: 'Analyse des Écarts', path: '/financial-analysis-advanced', icon: <Activity className="w-4 h-4" /> },
      { id: 'consolidation', label: 'Consolidation', path: '/reports', icon: <Database className="w-4 h-4" /> },
      { id: 'ai-anomaly', label: 'Détection Anomalies IA', path: '/dashboard/ai-insights', icon: <Bot className="w-4 h-4" /> }
    ],
    assets: [
      { id: 'summary', label: 'Synthèse', path: '/assets/summary', icon: <BarChart3 className="w-4 h-4" /> },
      { id: 'registry', label: 'Registre des Biens', path: '/assets/registry', icon: <Package className="w-4 h-4" /> },
      { id: 'depreciation', label: 'Amortissements', path: '/assets/depreciation', icon: <Clock className="w-4 h-4" /> },
      { id: 'disposals', label: 'Cessions', path: '/assets/disposals', icon: <FileCheck className="w-4 h-4" /> },
      { id: 'inventory', label: 'Inventaire', path: '/assets/inventory', icon: <Archive className="w-4 h-4" /> },
      { id: 'maintenance', label: 'Maintenance', path: '/assets/maintenance', icon: <Settings className="w-4 h-4" /> }
    ],
    closures: [
      { id: 'periodic', label: '🔥 Clôture Périodique SYSCOHADA', path: '/closures/periodic', icon: <Calendar className="w-4 h-4" /> },
      { id: 'revisions', label: 'Révisions', path: '/closures/revisions', icon: <CheckCircle className="w-4 h-4" /> },
      { id: 'carry-forward', label: 'Reports à Nouveau', path: '/closures/carry-forward', icon: <RefreshCw className="w-4 h-4" /> },
      { id: 'audit-trail', label: 'Piste d\'Audit', path: '/closures/audit-trail', icon: <Shield className="w-4 h-4" /> }
    ],
    reporting: [
      { id: 'bilan', label: 'États Financiers', path: '/financial-statements/balance', icon: <BarChart3 className="w-4 h-4" /> },
      { id: 'compte-resultat', label: 'États Financiers Mensuel', path: '/financial-statements/income', icon: <TrendingUp className="w-4 h-4" /> },
      { id: 'tax-declarations', label: 'Déclarations Fiscales', path: '/reporting/tax', icon: <Shield className="w-4 h-4" /> },
      { id: 'custom-reports', label: 'Rapports Personnalisés', path: '/reporting/custom', icon: <FileCheck className="w-4 h-4" /> }
    ],
    settings: [
      { id: 'theme', label: 'Thème & Apparence', path: '/parameters', icon: <Palette className="w-4 h-4" /> },
      { id: 'accounting-params', label: 'Paramètres Comptabilité', path: '/settings', icon: <Calculator className="w-4 h-4" /> },
      { id: 'company', label: 'Configuration Société', path: '/settings/company', icon: <Building2 className="w-4 h-4" /> },
      { id: 'users', label: 'Utilisateurs & Droits', path: '/settings/users', icon: <Users className="w-4 h-4" /> },
      { id: 'import-export', label: 'Import/Export', path: '/settings/import-export', icon: <Download className="w-4 h-4" /> },
      { id: 'backup', label: 'Sauvegardes', path: '/settings/backup', icon: <Save className="w-4 h-4" /> },
      { id: 'api', label: 'API & Intégrations', path: '/settings/api', icon: <Globe className="w-4 h-4" /> },
      { id: 'mobile', label: 'App Mobile', path: '/settings/mobile', icon: <Smartphone className="w-4 h-4" /> },
      { id: 'offline', label: 'Mode Hors Ligne', path: '/settings/offline', icon: <Wifi className="w-4 h-4" /> }
    ]
  };

  // Détection automatique du module actif basé sur l'URL
  useEffect(() => {
    const path = location.pathname;
    const moduleMatch = path.match(/^\/([^/]+)/);
    if (moduleMatch) {
      const moduleId = moduleMatch[1];
      // Mapping des routes vers les IDs de modules
      const routeMapping: Record<string, string> = {
        'dashboard': 'dashboard',
        'accounting': 'accounting',
        'tiers': 'tiers',
        'third-party': 'tiers',
        'customers': 'tiers',
        'suppliers': 'tiers',
        'recouvrement': 'tiers',
        'treasury': 'treasury',
        'control': 'control',
        'budgeting': 'control',
        'analytics': 'control',
        'assets': 'assets',
        'reporting': 'reporting',
        'reports': 'reporting',
        'financial': 'reporting',
        'closures': 'closures',
        'settings': 'settings',
        'parameters': 'settings'
      };
      setSelectedModule(routeMapping[moduleId] || 'dashboard');
    }
  }, [location]);

  const handleThemeChange = (type: 'elegant' | 'fintech' | 'minimalist') => {
    setTheme(type);
    setShowThemeMenu(false);
  };

  const isActive = (path: string) => location.pathname === path;
  const isModuleActive = (moduleId: string) => selectedModule === moduleId;

  // Breadcrumbs
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ label: 'Accueil', path: '/' }];

    paths.forEach((path, index) => {
      const fullPath = '/' + paths.slice(0, index + 1).join('/');
      const module = primaryMenuItems.find(m => m.id === path);
      const label = module ? module.label : path.charAt(0).toUpperCase() + path.slice(1);
      breadcrumbs.push({ label, path: fullPath });
    });

    return breadcrumbs;
  };

  // Mark notification as read
  const markNotificationAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  return (
    <div className="flex h-screen bg-[var(--color-background)] overflow-hidden">
      {/* Skip to main content (Accessibility) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-[var(--color-primary)] text-[var(--color-background)] px-4 py-2 rounded"
      >
        Aller au contenu principal
      </a>

      {/* Primary Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col bg-[var(--color-sidebar-bg)] transition-all duration-300',
          primaryCollapsed ? 'w-20' : 'w-64'
        )}
        role="navigation"
        aria-label="Navigation principale"
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--color-sidebar-border)]">
          <div className={cn(
            'flex items-center gap-3',
            primaryCollapsed && 'justify-center'
          )}>
            <div className="w-10 h-10 bg-[var(--color-primary)] rounded-lg flex items-center justify-center">
              <span className="text-[var(--color-background)] font-bold text-xl">W</span>
            </div>
            {!primaryCollapsed && (
              <div>
                <h1 className="text-[var(--color-sidebar-text)] font-bold text-lg">WiseBook</h1>
                <p className="text-[var(--color-sidebar-text-secondary)] text-xs">ERP Next-Gen</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setPrimaryCollapsed(!primaryCollapsed)}
            className="text-[var(--color-sidebar-text-secondary)] hover:text-[var(--color-sidebar-text)] transition-colors"
            aria-label={primaryCollapsed ? 'Développer le menu' : 'Réduire le menu'}
            aria-expanded={!primaryCollapsed}
          >
            <ChevronLeft className={cn(
              "w-5 h-5 transition-transform",
              primaryCollapsed && "rotate-180"
            )} />
          </button>
        </div>

        {/* Primary Navigation */}
        <nav
          className="flex-1 py-4 overflow-y-auto"
          role="menubar"
          aria-label="Modules principaux"
        >
          {primaryMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.path) {
                  navigate(item.path);
                } else {
                  setSelectedModule(item.id);
                }
              }}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 transition-all duration-200',
                'hover:bg-[var(--color-sidebar-hover)] relative group',
                isModuleActive(item.id) && 'bg-[var(--color-sidebar-active)] border-l-4 border-[var(--color-primary)]',
                primaryCollapsed && 'justify-center'
              )}
              role="menuitem"
              aria-label={item.ariaLabel || item.label}
              aria-current={isModuleActive(item.id) ? 'page' : undefined}
            >
              <div className={cn(
                'transition-colors',
                isModuleActive(item.id) ? 'text-[var(--color-primary)]' : 'text-[var(--color-sidebar-text-secondary)] group-hover:text-[var(--color-sidebar-text)]'
              )}>
                {item.icon}
              </div>
              {!primaryCollapsed && (
                <>
                  <span className={cn(
                    'flex-1 text-left text-sm font-medium transition-colors',
                    isModuleActive(item.id) ? 'text-[var(--color-sidebar-text)]' : 'text-[var(--color-sidebar-text-secondary)] group-hover:text-[var(--color-sidebar-text)]'
                  )}>
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-xs bg-[var(--color-primary)] text-[var(--color-background)] rounded-full">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              {primaryCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-[var(--color-sidebar-active)] text-[var(--color-sidebar-text)] text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </button>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-[var(--color-sidebar-border)]">
          <div className={cn(
            'flex items-center gap-3',
            primaryCollapsed && 'justify-center'
          )}>
            <div className="w-10 h-10 bg-[var(--color-sidebar-avatar-bg)] rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-[var(--color-sidebar-text-secondary)]" />
            </div>
            {!primaryCollapsed && (
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--color-sidebar-text)]">Admin</p>
                <p className="text-xs text-[var(--color-sidebar-text-secondary)]">admin@wisebook.com</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Secondary Sidebar */}
      {secondaryMenuItems[selectedModule] && (
        <>
          {/* Toggle button when collapsed */}
          {secondaryCollapsed && (
            <button
              onClick={() => setSecondaryCollapsed(false)}
              className="hidden lg:flex items-center justify-center w-12 h-full bg-[var(--color-background)] border-r border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors"
              aria-label="Ouvrir le sous-menu"
            >
              <ChevronRight className="w-5 h-5 text-[var(--color-text-tertiary)]" />
            </button>
          )}

          <aside
            className={cn(
              'hidden lg:flex flex-col bg-[var(--color-background)] border-r border-[var(--color-border)] transition-all duration-300',
              secondaryCollapsed ? 'w-0 overflow-hidden' : 'w-64'
            )}
            role="navigation"
            aria-label="Navigation secondaire"
          >
            <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--color-border)]">
              <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider whitespace-nowrap">
                {primaryMenuItems.find(item => item.id === selectedModule)?.label}
              </h2>
              <button
                onClick={() => setSecondaryCollapsed(!secondaryCollapsed)}
                className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] flex-shrink-0"
                aria-label={secondaryCollapsed ? 'Développer le sous-menu' : 'Réduire le sous-menu'}
              >
                <ChevronLeft className={cn(
                  "w-4 h-4 transition-transform",
                  secondaryCollapsed && "rotate-180"
                )} />
              </button>
            </div>

          <nav
            className="flex-1 py-4 overflow-y-auto"
            role="menu"
            aria-label="Sous-navigation"
          >
            {secondaryMenuItems[selectedModule]?.map((item) => (
              <button
                key={item.id}
                onClick={() => item.path && navigate(item.path)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 transition-all duration-200',
                  'hover:bg-[var(--color-surface-hover)]',
                  isActive(item.path || '') && 'bg-[var(--color-primary-light)] border-l-4 border-[var(--color-primary)]'
                )}
                role="menuitem"
                aria-current={isActive(item.path || '') ? 'page' : undefined}
              >
                {item.icon && (
                  <div className={cn(
                    'transition-colors',
                    isActive(item.path || '') ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-tertiary)]'
                  )}>
                    {item.icon}
                  </div>
                )}
                <span className={cn(
                  'flex-1 text-left text-sm',
                  isActive(item.path || '') ? 'text-[var(--color-primary)] font-medium' : 'text-[var(--color-text-secondary)]'
                )}>
                  {item.label}
                </span>
                {item.badge && (
                  <span className="px-2 py-0.5 text-xs bg-[var(--color-primary)] text-white rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
          </aside>
        </>
      )}

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        >
          <aside
            className="w-80 h-full bg-[var(--color-sidebar-bg)]"
            onClick={(e) => e.stopPropagation()}
            role="navigation"
            aria-label="Navigation mobile"
          >
            <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--color-sidebar-border)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--color-primary)] rounded-lg flex items-center justify-center">
                  <span className="text-[var(--color-background)] font-bold text-xl">W</span>
                </div>
                <div>
                  <h1 className="text-white font-bold text-lg">WiseBook</h1>
                  <p className="text-gray-400 text-xs">ERP Next-Gen</p>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-[var(--color-sidebar-text-secondary)]"
                aria-label="Fermer le menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="py-4" role="menubar">
              {primaryMenuItems.map((item) => (
                <div key={item.id}>
                  <button
                    onClick={() => {
                      if (item.path) {
                        navigate(item.path);
                        setMobileMenuOpen(false);
                      } else {
                        setSelectedModule(item.id);
                      }
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 transition-all duration-200',
                      'hover:bg-[var(--color-sidebar-hover)]',
                      isModuleActive(item.id) && 'bg-[var(--color-sidebar-active)] border-l-4 border-[var(--color-primary)]'
                    )}
                    role="menuitem"
                    aria-current={isModuleActive(item.id) ? 'page' : undefined}
                  >
                    <div className={cn(
                      'transition-colors',
                      isModuleActive(item.id) ? 'text-[var(--color-primary)]' : 'text-[var(--color-sidebar-text-secondary)]'
                    )}>
                      {item.icon}
                    </div>
                    <span className={cn(
                      'flex-1 text-left text-sm font-medium',
                      isModuleActive(item.id) ? 'text-[var(--color-sidebar-text)]' : 'text-[var(--color-sidebar-text-secondary)]'
                    )}>
                      {item.label}
                    </span>
                    {item.badge && (
                      <span className="px-2 py-0.5 text-xs bg-[var(--color-primary)] text-[var(--color-background)] rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </button>

                  {/* Mobile Submenu */}
                  {isModuleActive(item.id) && secondaryMenuItems[item.id] && (
                    <div className="bg-[var(--color-sidebar-submenu-bg)] py-2">
                      {secondaryMenuItems[item.id].map((subItem) => (
                        <button
                          key={subItem.id}
                          onClick={() => {
                            if (subItem.path) {
                              navigate(subItem.path);
                              setMobileMenuOpen(false);
                            }
                          }}
                          className={cn(
                            'w-full flex items-center gap-3 pl-12 pr-4 py-2 text-sm',
                            'hover:bg-[var(--color-sidebar-hover)]',
                            isActive(subItem.path || '') && 'bg-[var(--color-sidebar-active)] text-[var(--color-primary)]'
                          )}
                        >
                          {subItem.icon}
                          <span className={cn(
                            isActive(subItem.path || '') ? 'text-[var(--color-primary)]' : 'text-[var(--color-sidebar-text-secondary)]'
                          )}>
                            {subItem.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header
          className="h-14 bg-[var(--color-background)] border-b border-[var(--color-border)] flex items-center justify-between px-3 lg:px-4"
          role="banner"
        >
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden text-[var(--color-text-primary)]"
              aria-label="Ouvrir le menu mobile"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Breadcrumbs */}
            <nav
              className="hidden sm:flex items-center gap-2 text-sm"
              aria-label="Fil d'Ariane"
            >
              {getBreadcrumbs().map((crumb, index) => (
                <React.Fragment key={crumb.path}>
                  {index > 0 && <ChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)]" />}
                  <button
                    onClick={() => navigate(crumb.path)}
                    className={cn(
                      'hover:text-[var(--color-primary)]',
                      index === getBreadcrumbs().length - 1
                        ? 'text-[var(--color-text-primary)] font-medium'
                        : 'text-[var(--color-text-tertiary)]'
                    )}
                  >
                    {crumb.label}
                  </button>
                </React.Fragment>
              ))}
            </nav>

            {/* Search */}
            <div className="relative max-w-md flex-1 hidden lg:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] w-5 h-5" />
              <input
                id="global-search"
                type="text"
                placeholder="Rechercher... (Alt+S)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
                aria-label="Recherche globale"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Selector */}
            <div className="relative">
              <button
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                className="p-2 hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors"
                title="Changer le thème"
                aria-label="Sélecteur de thème"
                aria-expanded={showThemeMenu}
              >
                <Palette className="w-5 h-5 text-[var(--color-text-secondary)]" />
              </button>
              {showThemeMenu && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-[var(--color-background)] rounded-lg shadow-xl border border-[var(--color-border)] z-50"
                  role="menu"
                  aria-label="Sélection du thème"
                >
                  <div className="p-2">
                    <p className="px-3 py-2 text-xs font-semibold text-[var(--color-text-tertiary)] uppercase">
                      Thèmes disponibles
                    </p>
                    <button
                      onClick={() => handleThemeChange('elegant')}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors',
                        themeType === 'elegant' && 'bg-[var(--color-primary-light)]'
                      )}
                      role="menuitem"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)]" />
                      <div className="text-left">
                        <p className="text-sm font-medium">Élégance Sobre</p>
                        <p className="text-xs text-[var(--color-text-tertiary)]">Finance traditionnelle</p>
                      </div>
                    </button>
                    <button
                      onClick={() => handleThemeChange('fintech')}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors',
                        themeType === 'fintech' && 'bg-[var(--color-primary-light)]'
                      )}
                      role="menuitem"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--color-success)] to-[var(--color-text-primary)]" />
                      <div className="text-left">
                        <p className="text-sm font-medium">Modern Fintech</p>
                        <p className="text-xs text-[var(--color-text-tertiary)]">Tableau de bord moderne</p>
                      </div>
                    </button>
                    <button
                      onClick={() => handleThemeChange('minimalist')}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors',
                        themeType === 'minimalist' && 'bg-[var(--color-primary-light)]'
                      )}
                      role="menuitem"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--color-text-secondary)] to-[var(--color-accent)]" />
                      <div className="text-left">
                        <p className="text-sm font-medium">Minimaliste Premium</p>
                        <p className="text-xs text-[var(--color-text-tertiary)]">Élégance minimaliste</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Currency Display */}
            <div className="flex items-center px-3 py-1.5 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
              <DollarSign className="w-4 h-4 text-[var(--color-primary)] mr-2" />
              <span className="text-sm font-medium text-[var(--color-text-primary)]">FCFA</span>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                className="relative p-2 hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors"
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label={`Notifications ${notifications.filter(n => !n.read).length > 0 ? `(${notifications.filter(n => !n.read).length} non lues)` : ''}`}
                aria-expanded={showNotifications}
              >
                <Bell className="w-5 h-5 text-[var(--color-text-secondary)]" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--color-error)] rounded-full"></span>
                )}
              </button>

              {showNotifications && (
                <div
                  className="absolute right-0 mt-2 w-80 bg-[var(--color-background)] rounded-lg shadow-xl border border-[var(--color-border)] z-50 max-h-96 overflow-y-auto"
                  role="region"
                  aria-label="Centre de notifications"
                >
                  <div className="p-4 border-b border-[var(--color-border)]">
                    <h3 className="font-semibold text-[var(--color-text-primary)]">Notifications</h3>
                  </div>
                  <div className="divide-y divide-[var(--color-border)]">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={cn(
                          "p-4 hover:bg-[var(--color-surface-hover)] cursor-pointer",
                          !notif.read && "bg-[var(--color-primary-light)] bg-opacity-10"
                        )}
                        onClick={() => markNotificationAsRead(notif.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "w-2 h-2 rounded-full mt-2",
                            notif.type === 'error' && "bg-[var(--color-error)]",
                            notif.type === 'warning' && "bg-[var(--color-warning)]",
                            notif.type === 'success' && "bg-[var(--color-success)]",
                            notif.type === 'info' && "bg-[var(--color-info)]"
                          )} />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[var(--color-text-primary)]">{notif.title}</p>
                            <p className="text-xs text-[var(--color-text-secondary)] mt-1">{notif.message}</p>
                            <p className="text-xs text-[var(--color-text-tertiary)] mt-2">
                              {notif.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-2 hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors"
                aria-label="Menu utilisateur"
                aria-expanded={showUserMenu}
              >
                <div className="w-8 h-8 bg-[var(--color-primary)] rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-[var(--color-background)]" />
                </div>
              </button>
              {showUserMenu && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-[var(--color-background)] rounded-lg shadow-xl border border-[var(--color-border)] z-50"
                  role="menu"
                  aria-label="Menu utilisateur"
                >
                  <div className="p-2">
                    <button
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
                      role="menuitem"
                    >
                      <User className="w-4 h-4" />
                      <span className="text-sm">Mon profil</span>
                    </button>
                    <button
                      onClick={() => {
                        navigate('/settings');
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
                      role="menuitem"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="text-sm">Paramètres</span>
                    </button>
                    <button
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
                      role="menuitem"
                    >
                      <HelpCircle className="w-4 h-4" />
                      <span className="text-sm">Aide</span>
                    </button>
                    <hr className="my-2 border-[var(--color-border)]" />
                    <button
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-error)] transition-colors"
                      role="menuitem"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm">Déconnexion</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto bg-[var(--color-background)]"
          role="main"
        >
          <div className="p-3 lg:p-4">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default ModernDoubleSidebarLayout;