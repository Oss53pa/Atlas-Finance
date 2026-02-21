/**
 * Navigation Intelligente Atlas Finance
 * Menu adaptatif avec notifications et raccourcis contextuels
 */
import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Home,
  FileText,
  Users,
  Truck,
  DollarSign,
  PieChart,
  Calculator,
  TrendingUp,
  Settings,
  Bell,
  Search,
  ChevronDown,
  ChevronRight,
  Bookmark,
  Clock,
  Zap,
  Shield,
  BarChart3,
  CreditCard,
  Banknote,
  Building,
  Activity,
  Target
} from 'lucide-react';
import {
  Badge,
  Button,
  Input,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../ui';
import { dashboardService } from '../../services';

interface NavigationProps {
  companyId: string;
  currentUser: Record<string, unknown>;
  className?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  module: string;
  badge?: number;
  children?: NavItem[];
  permissions?: string[];
  description?: string;
}

const AtlasFinanceNavigation: React.FC<NavigationProps> = ({
  companyId,
  currentUser,
  className = ''
}) => {
  const { t } = useLanguage();
  // États
  const [expandedSections, setExpandedSections] = useState<string[]>(['main']);
  const [searchQuery, setSearchQuery] = useState('');
  const [showQuickActions, setShowQuickActions] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // Queries pour données de navigation
  const { data: navigationAlerts } = useQuery({
    queryKey: ['navigation-alerts', companyId],
    queryFn: () => dashboardService.getCriticalAlerts({ companyId }),
    refetchInterval: 60000, // 1 minute
  });

  const { data: recentActivities } = useQuery({
    queryKey: ['recent-activities', companyId],
    queryFn: () => dashboardService.getRecentActivities({ companyId, limit: 5 }),
  });

  // Structure de navigation Atlas Finance
  const navigationStructure: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard Executive',
      icon: Home,
      href: '/dashboard',
      module: 'main',
      description: 'Vue d\'ensemble consolidée'
    },
    {
      id: 'accounting',
      label: t('accounting.title'),
      icon: FileText,
      href: '/accounting',
      module: 'accounting',
      children: [
        {
          id: 'entries',
          label: 'Écritures',
          icon: FileText,
          href: '/accounting/entries',
          module: 'accounting',
          badge: navigationAlerts?.by_module?.accounting || 0
        },
        {
          id: 'journals',
          label: t('navigation.journals'),
          icon: FileText,
          href: '/accounting/journals', 
          module: 'accounting'
        },
        {
          id: 'chart-accounts',
          label: 'Plan Comptable',
          icon: BarChart3,
          href: '/accounting/chart-accounts',
          module: 'accounting'
        },
        {
          id: 'balance',
          label: t('accounting.balance'),
          icon: Calculator,
          href: '/accounting/balance',
          module: 'accounting',
          submenu: [
            {
              id: 'balance-simple',
              label: 'Balance Simple',
              icon: Calculator,
              href: '/accounting/balance',
              module: 'accounting'
            },
            {
              id: 'balance-advanced',
              label: 'Balance Avancée',
              icon: BarChart3,
              href: '/accounting/balance-advanced',
              module: 'accounting'
            }
          ]
        },
        {
          id: 'general-ledger',
          label: 'Grand Livre',
          icon: FileText,
          href: '/accounting/general-ledger',
          module: 'accounting'
        },
        {
          id: 'lettrage',
          label: t('thirdParty.reconciliation'),
          icon: FileText,
          href: '/accounting/lettrage',
          module: 'accounting'
        },
        {
          id: 'financial-statements',
          label: 'États Financiers',
          icon: BarChart3,
          href: '/accounting/financial-statements',
          module: 'accounting',
          submenu: [
            {
              id: 'financial-dashboard',
              label: 'Tableau de Bord',
              icon: BarChart3,
              href: '/accounting/financial-statements',
              module: 'accounting'
            },
            {
              id: 'balance-sheet',
              label: 'Bilan',
              icon: Building,
              href: '/accounting/balance-sheet',
              module: 'accounting'
            },
            {
              id: 'income-statement',
              label: 'Compte de Résultat',
              icon: TrendingUp,
              href: '/accounting/income-statement',
              module: 'accounting'
            },
            {
              id: 'cash-flow',
              label: 'Flux de Trésorerie',
              icon: Activity,
              href: '/accounting/cash-flow',
              module: 'accounting'
            },
            {
              id: 'financial-ratios',
              label: 'SIG & Ratios',
              icon: Target,
              href: '/accounting/financial-ratios',
              module: 'accounting'
            }
          ]
        }
      ]
    },
    {
      id: 'customers',
      label: t('navigation.clients'),
      icon: Users,
      href: '/customers',
      module: 'customers',
      badge: navigationAlerts?.by_module?.customers || 0,
      children: [
        {
          id: 'customer-dashboard',
          label: 'Dashboard Clients',
          icon: BarChart3,
          href: '/customers/dashboard',
          module: 'customers'
        },
        {
          id: 'customer-list',
          label: 'Liste Clients',
          icon: Users,
          href: '/customers/list',
          module: 'customers'
        },
        {
          id: 'aging-balance',
          label: 'Balance Âgée',
          icon: Clock,
          href: '/customers/aging',
          module: 'customers'
        },
        {
          id: 'collection-management',
          label: t('thirdParty.collection'),
          icon: TrendingUp,
          href: '/customers/collection',
          module: 'customers'
        }
      ]
    },
    {
      id: 'suppliers',
      label: t('navigation.suppliers'),
      icon: Truck,
      href: '/suppliers',
      module: 'suppliers',
      badge: navigationAlerts?.by_module?.suppliers || 0,
      children: [
        {
          id: 'supplier-dashboard',
          label: 'Dashboard Fournisseurs',
          icon: BarChart3,
          href: '/suppliers/dashboard',
          module: 'suppliers'
        },
        {
          id: 'supplier-list',
          label: 'Liste Fournisseurs',
          icon: Truck,
          href: '/suppliers/list',
          module: 'suppliers'
        },
        {
          id: 'payment-schedule',
          label: 'Échéancier Paiements',
          icon: Calendar,
          href: '/suppliers/payments',
          module: 'suppliers'
        },
        {
          id: 'performance-evaluation',
          label: 'Évaluation Performance',
          icon: TrendingUp,
          href: '/suppliers/performance',
          module: 'suppliers'
        }
      ]
    },
    {
      id: 'treasury',
      label: t('navigation.treasury'),
      icon: DollarSign,
      href: '/treasury',
      module: 'treasury',
      badge: navigationAlerts?.by_module?.treasury || 0,
      children: [
        {
          id: 'treasury-dashboard',
          label: 'Dashboard Trésorerie',
          icon: BarChart3,
          href: '/treasury/dashboard',
          module: 'treasury'
        },
        {
          id: 'bank-accounts',
          label: 'Comptes Bancaires',
          icon: CreditCard,
          href: '/treasury/bank-accounts',
          module: 'treasury'
        },
        {
          id: 'cash-flow',
          label: 'Flux de Trésorerie',
          icon: TrendingUp,
          href: '/treasury/cash-flow',
          module: 'treasury'
        },
        {
          id: 'fund-calls',
          label: 'Appels de Fonds',
          icon: Banknote,
          href: '/treasury/fund-calls',
          module: 'treasury'
        },
        {
          id: 'reconciliation',
          label: 'Rapprochements',
          icon: Shield,
          href: '/treasury/reconciliation',
          module: 'treasury'
        }
      ]
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      href: '/analytics',
      module: 'analytics',
      children: [
        {
          id: 'analytical-axes',
          label: 'Axes Analytiques',
          icon: BarChart3,
          href: '/analytics/axes',
          module: 'analytics'
        },
        {
          id: 'cost-centers',
          label: 'Centres de Coûts',
          icon: Target,
          href: '/analytics/cost-centers',
          module: 'analytics'
        }
      ]
    },
    {
      id: 'budgeting',
      label: t('navigation.budget'),
      icon: Calculator,
      href: '/budgeting',
      module: 'budgeting',
      children: [
        {
          id: 'budgets',
          label: 'Budgets',
          icon: Calculator,
          href: '/budgeting/budgets',
          module: 'budgeting'
        },
        {
          id: 'budget-control',
          label: 'Contrôle Budgétaire',
          icon: TrendingUp,
          href: '/budgeting/control',
          module: 'budgeting'
        }
      ]
    },
    {
      id: 'reporting',
      label: 'Reporting',
      icon: PieChart,
      href: '/reporting',
      module: 'reporting',
      children: [
        {
          id: 'reports',
          label: 'Rapports',
          icon: FileText,
          href: '/reporting/reports',
          module: 'reporting'
        },
        {
          id: 'dashboards',
          label: 'Dashboards',
          icon: BarChart3,
          href: '/reporting/dashboards',
          module: 'reporting'
        }
      ]
    }
  ];

  // Filtrage selon recherche et permissions
  const filteredNavigation = useMemo(() => {
    let filtered = navigationStructure;

    // Filtrage par recherche
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.children?.some(child => 
          child.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // TODO: Filtrage par permissions utilisateur
    // filtered = filtered.filter(item => hasPermission(item.permissions))

    return filtered;
  }, [searchQuery, currentUser]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const handleNavigation = (href: string) => {
    navigate(href);
  };

  const getModuleAlertCount = (module: string) => {
    return navigationAlerts?.by_module?.[module] || 0;
  };

  return (
    <div className={`w-64 bg-white border-r border-gray-200 flex flex-col ${className}`}>
      {/* Header avec logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg" style={{ fontFamily: 'Sometype Mono, sans-serif' }}>
              W
            </span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Sometype Mono, sans-serif' }}>
              Atlas Finance
            </h2>
            <p className="text-xs text-gray-700">ERP Comptable SYSCOHADA</p>
          </div>
        </div>
      </div>

      {/* Recherche intelligente */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-700" />
          <Input
            placeholder="Rechercher module, fonction..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 text-sm"
          />
        </div>
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {filteredNavigation.map((item) => {
            const Icon = item.icon;
            const isItemActive = isActive(item.href);
            const isExpanded = expandedSections.includes(item.id);
            const hasChildren = item.children && item.children.length > 0;
            const alertCount = getModuleAlertCount(item.module);

            return (
              <div key={item.id}>
                {/* Item principal */}
                <div
                  className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
                    isItemActive
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => {
                    if (hasChildren) {
                      toggleSection(item.id);
                    } else {
                      handleNavigation(item.href);
                    }
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`h-5 w-5 ${isItemActive ? 'text-white' : 'text-gray-700'}`} />
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {/* Badge d'alertes */}
                    {alertCount > 0 && (
                      <Badge className="bg-red-500 text-white text-xs h-5 w-5 rounded-full flex items-center justify-center p-0">
                        {alertCount > 9 ? '9+' : alertCount}
                      </Badge>
                    )}
                    
                    {/* Badge module badge */}
                    {item.badge && item.badge > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {item.badge}
                      </Badge>
                    )}
                    
                    {/* Icône expansion */}
                    {hasChildren && (
                      <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                        <ChevronRight className={`h-4 w-4 ${isItemActive ? 'text-white' : 'text-gray-700'}`} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Sous-menu */}
                {hasChildren && isExpanded && (
                  <div className="ml-6 mt-2 space-y-1 border-l border-gray-200 pl-4">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const isChildActive = isActive(child.href);
                      const childAlertCount = child.badge || 0;

                      return (
                        <div
                          key={child.id}
                          className={`group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-all duration-200 ${
                            isChildActive
                              ? 'bg-blue-100 text-blue-700 border-l-2 border-l-blue-600'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                          onClick={() => handleNavigation(child.href)}
                        >
                          <div className="flex items-center space-x-3">
                            <ChildIcon className={`h-4 w-4 ${isChildActive ? 'text-blue-600' : 'text-gray-700'}`} />
                            <span className="text-sm">{child.label}</span>
                          </div>
                          
                          {childAlertCount > 0 && (
                            <Badge className="bg-red-500 text-white text-xs">
                              {childAlertCount}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Actions rapides contextuelles */}
      <div className="p-4 border-t border-gray-200">
        <DropdownMenu open={showQuickActions} onOpenChange={setShowQuickActions}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-between"
            >
              <span className="flex items-center">
                <Zap className="h-4 w-4 mr-2" />
                Actions Rapides
              </span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start">
            <DropdownMenuItem onClick={() => navigate('/accounting/entries/create')}>
              <FileText className="h-4 w-4 mr-2" />
              Nouvelle Écriture
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/customers/create')}>
              <Users className="h-4 w-4 mr-2" />
              Nouveau Client
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/suppliers/create')}>
              <Truck className="h-4 w-4 mr-2" />
              Nouveau Fournisseur
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/treasury/fund-calls/create')}>
              <Banknote className="h-4 w-4 mr-2" />
              Appel de Fonds
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/accounting/reconciliation')}>
              <Shield className="h-4 w-4 mr-2" />
              Lettrage Automatique
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/reporting/executive')}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Rapport Executive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Notifications et activités récentes */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">Activités Récentes</h3>
          <Button variant="ghost" size="sm">
            <Bell className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-2">
          {recentActivities?.slice(0, 3).map((activity, index) => (
            <div key={index} className="text-xs text-gray-600 p-2 bg-white rounded border">
              <p className="font-medium">{activity.description}</p>
              <p className="text-gray-700">{formatDate(activity.timestamp, 'HH:mm')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer utilisateur */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-gray-600 text-sm font-medium">
              {currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              {currentUser?.firstName} {currentUser?.lastName}
            </p>
            <p className="text-xs text-gray-700">{currentUser?.role}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                Profil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                Paramètres
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/logout')}>
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default AtlasFinanceNavigation;