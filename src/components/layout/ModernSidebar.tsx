/**
 * Sidebar Moderne WiseBook
 * Navigation extensible avec modules et sous-modules
 */
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Home,
  FileText,
  Users,
  Truck,
  Banknote,
  PieChart,
  Calculator,
  BarChart3,
  Settings,
  Building2,
  TrendingUp,
  CreditCard,
  Target,
  Bell,
  User
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const ModernSidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  // *** MODIFICATION FORCÉE POUR RECHARGEMENT *** 
  const [expandedItems, setExpandedItems] = useState<string[]>(['accounting', 'treasury', 'parameters']);
  const location = useLocation();
  const navigate = useNavigate();

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard Executive',
      icon: Home,
      path: '/executive',
      badge: null,
    },
    {
      id: 'accounting',
      label: 'Comptabilité',
      icon: FileText,
      children: [
        { id: 'entries', label: 'Saisie d\'écritures', path: '/accounting/entries' },
        { id: 'entries-intelligent', label: '🧠 Saisie Intelligente', path: '/accounting/entries-advanced' },
        { id: 'balance', label: 'Balance générale', path: '/accounting/balance' },
        { id: 'general-ledger', label: 'Grand livre', path: '/accounting/general-ledger' },
        { id: 'lettrage', label: 'Lettrage', path: '/accounting/lettrage' },
        { id: 'syscohada-states', label: '📊 États SYSCOHADA', path: '/financial-statements' },
        { id: 'journals', label: 'Journaux', path: '/accounting/journals' },
        { id: 'financial-statements', label: 'États Financiers', path: '/accounting/financial-statements' },
        { id: 'sig', label: 'SIG & Ratios', path: '/accounting/sig' },
        { id: 'chart-advanced', label: 'Plan Comptable Avancé', path: '/accounting/chart-advanced' },
      ]
    },
    {
      id: 'customers',
      label: 'Clients',
      icon: Users,
      path: '/customers-advanced',
      badge: 3, // Alertes clients
      children: [
        { id: 'customer-list', label: 'Liste clients', path: '/customers' },
        { id: 'aging', label: 'Balance âgée', path: '/customers/aging' },
        { id: 'collection', label: 'Recouvrement', path: '/customers/collection' },
      ]
    },
    {
      id: 'suppliers',
      label: 'Fournisseurs', 
      icon: Truck,
      path: '/suppliers-advanced',
      children: [
        { id: 'supplier-list', label: 'Liste fournisseurs', path: '/suppliers' },
        { id: 'payments', label: 'Échéancier paiements', path: '/suppliers/payments' },
        { id: 'evaluations', label: 'Évaluations', path: '/suppliers/evaluations' },
      ]
    },
    {
      id: 'treasury',
      label: 'Trésorerie',
      icon: Banknote,
      path: '/treasury/position',
      badge: 1, // Alerte trésorerie
      children: [
        { id: 'position', label: 'Position temps réel', path: '/treasury/position' },
        { id: 'cash-flow', label: 'Prévisions', path: '/treasury/cash-flow' },
        { id: 'loans', label: '🏦 Emprunts', path: '/treasury/loans' },
        { id: 'fund-calls', label: '📊 Appels de fonds', path: '/treasury/fund-calls' },
        { id: 'reconciliation', label: 'Rapprochements', path: '/treasury/reconciliation' },
      ]
    },
    {
      id: 'financial-analysis',
      label: 'Analyse Financière',
      icon: TrendingUp,
      children: [
        { id: 'financial-overview', label: 'Vue d\'ensemble', path: '/financial-analysis' },
        { id: 'tafire', label: 'TAFIRE', path: '/financial-analysis/tafire' },
        { id: 'sig', label: 'SIG', path: '/financial-analysis/sig' },
        { id: 'functional-balance', label: 'Bilan Fonctionnel', path: '/financial-analysis/functional-balance' },
        { id: 'ratios', label: 'Ratios Financiers', path: '/financial-analysis/ratios' },
      ]
    },
    {
      id: 'closures',
      label: 'Clôtures',
      icon: Calculator,
      children: [
        { id: 'closure-procedures', label: 'Procédures de clôture', path: '/closures' },
        { id: 'annex-notes', label: 'Notes annexes', path: '/closures/annex-notes' },
        { id: 'carry-forward', label: 'Report à-nouveaux', path: '/closures/carry-forward' },
      ]
    },
    {
      id: 'assets',
      label: 'Immobilisations',
      icon: Building2,
      children: [
        { id: 'fixed-assets', label: 'Immobilisations', path: '/assets/fixed-assets' },
        { id: 'depreciation', label: 'Amortissements', path: '/assets/depreciation' },
        { id: 'inventory', label: 'Inventaire', path: '/assets/inventory' },
      ]
    },
    {
      id: 'financial-analysis',
      label: 'Analyse Financière',
      icon: TrendingUp,
      path: '/financial-analysis-advanced',
      children: [
        { id: 'tafire', label: 'TAFIRE SYSCOHADA', path: '/financial-analysis/tafire' },
        { id: 'sig', label: 'SIG', path: '/financial-analysis/sig' },
        { id: 'ratios', label: 'Ratios financiers', path: '/financial-analysis/ratios' },
      ]
    },
    {
      id: 'budgeting',
      label: 'Budget',
      icon: Calculator,
      children: [
        { id: 'budget-creation', label: 'Élaboration', path: '/budgeting/creation' },
        { id: 'budget-control', label: 'Contrôle', path: '/budgeting/control' },
        { id: 'variance', label: 'Analyse écarts', path: '/budgeting/variance' },
      ]
    },
    {
      id: 'reporting',
      label: 'Reporting',
      icon: BarChart3,
      children: [
        { id: 'states', label: 'États SYSCOHADA', path: '/reporting/states' },
        { id: 'custom-reports', label: 'Rapports personnalisés', path: '/reporting/custom' },
        { id: 'export', label: 'Export FEC', path: '/reporting/fec' },
      ]
    },
    {
      id: 'parameters',
      label: 'Paramètres',
      icon: Settings,
      children: [
        { id: 'config-center', label: '🏗️ Centre de Configuration', path: '/config' },
        { id: 'setup-wizard', label: 'Assistant Démarrage', path: '/setup-wizard' },
        { id: 'multi-company', label: 'Multi-Sociétés', path: '/multi-company-advanced' },
        { id: 'accounts-config', label: 'Plan SYSCOHADA', path: '/config/accounts' },
        { id: 'vat-config', label: 'TVA et Taxes', path: '/config/vat-taxes' },
        { id: 'codes-config', label: 'Codification Tiers', path: '/config/third-party-codes' },
        { id: 'analytical-config', label: 'Axes Analytiques', path: '/config/analytical-axes' },
        { id: 'import-export', label: 'Import/Export', path: '/config/import-export' },
        { id: 'security-profiles', label: 'Profils Sécurité', path: '/config/security-profiles' },
        { id: 'general-parameters', label: 'Paramètres Généraux', path: '/parameters' },
      ]
    },
  ];

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className={`
      bg-gradient-to-b from-blue-900 to-blue-800 text-white
      transition-all duration-300 ease-in-out
      ${collapsed ? 'w-16' : 'w-64'}
      min-h-screen flex flex-col relative border-r border-blue-700
    `}>
      {/* Header avec logo */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        {!collapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">W</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">WiseBook MODIFIÉ</h1>
              <p className="text-xs text-slate-300">NAVIGATION MISE À JOUR</p>
            </div>
          </div>
        )}
        
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="space-y-1 px-3">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedItems.includes(item.id);
            const itemIsActive = item.path ? isActive(item.path) : false;

            return (
              <div key={item.id}>
                {/* Item principal */}
                <div
                  className={`
                    flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer
                    transition-all duration-200
                    ${itemIsActive 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }
                  `}
                  onClick={() => {
                    if (hasChildren) {
                      toggleExpanded(item.id);
                    } else if (item.path) {
                      navigate(item.path);
                    }
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && (
                      <span className="font-medium text-sm">{item.label}</span>
                    )}
                  </div>
                  
                  {!collapsed && (
                    <div className="flex items-center space-x-2">
                      {/* Badge notifications */}
                      {item.badge && item.badge > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {item.badge}
                        </span>
                      )}
                      
                      {/* Icône expansion */}
                      {hasChildren && (
                        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  )}
                </div>

                {/* Sous-menu */}
                {hasChildren && isExpanded && !collapsed && (
                  <div className="ml-8 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <div
                        key={child.id}
                        className={`
                          px-3 py-2 rounded-lg cursor-pointer text-sm
                          transition-colors duration-200
                          ${isActive(child.path) 
                            ? 'bg-slate-700 text-blue-400 border-l-2 border-blue-400' 
                            : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                          }
                        `}
                        onClick={() => navigate(child.path)}
                      >
                        {child.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Footer utilisateur */}
      {!collapsed && (
        <div className="border-t border-slate-700 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-slate-300" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Admin</p>
              <p className="text-xs text-slate-400">Administrateur</p>
            </div>
            <button className="p-1 rounded hover:bg-slate-700">
              <Settings className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModernSidebar;