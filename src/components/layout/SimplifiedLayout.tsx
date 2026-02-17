import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { 
  LayoutDashboard, Calculator, Receipt, Users, PiggyBank, 
  BarChart3, Settings, Menu, X, Palette, Bell, User,
  ChevronLeft, Search, LogOut
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: string | number;
}

const SimplifiedLayout: React.FC = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, themeType, setTheme } = useTheme();
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Menu items
  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: t('dashboard.title'),
      icon: <LayoutDashboard className="w-5 h-5" />,
      path: '/dashboard'
    },
    {
      id: 'accounting',
      label: t('accounting.title'),
      icon: <Calculator className="w-5 h-5" />,
      path: '/accounting',
      badge: '3'
    },
    {
      id: 'recouvrement',
      label: t('thirdParty.collection'),
      icon: <Receipt className="w-5 h-5" />,
      path: '/recouvrement'
    },
    {
      id: 'customers',
      label: t('navigation.clients'),
      icon: <Users className="w-5 h-5" />,
      path: '/customers'
    },
    {
      id: 'treasury',
      label: t('navigation.treasury'),
      icon: <PiggyBank className="w-5 h-5" />,
      path: '/treasury'
    },
    {
      id: 'reports',
      label: 'Rapports',
      icon: <BarChart3 className="w-5 h-5" />,
      path: '/reports'
    },
    {
      id: 'settings',
      label: t('navigation.settings'),
      icon: <Settings className="w-5 h-5" />,
      path: '/settings'
    }
  ];

  const handleThemeChange = (type: 'elegant' | 'fintech' | 'minimalist') => {
    setTheme(type);
    setShowThemeMenu(false);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex h-screen bg-[var(--color-background)] overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className={cn(
        'hidden lg:flex flex-col bg-[var(--color-text-primary)] transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-20'
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
          <div className={cn(
            'flex items-center gap-3',
            !sidebarOpen && 'justify-center'
          )}>
            <div className="w-10 h-10 bg-[var(--color-primary)] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">W</span>
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="text-white font-bold text-lg">Atlas Finance</h1>
                <p className="text-gray-700 text-xs">ERP Professionnel</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-700 hover:text-white transition-colors"
          >
            <ChevronLeft className={cn(
              "w-5 h-5 transition-transform",
              !sidebarOpen && "rotate-180"
            )} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 transition-all duration-200',
                'hover:bg-gray-800 relative group',
                isActive(item.path) && 'bg-gray-800 border-l-4 border-[var(--color-primary)]',
                !sidebarOpen && 'justify-center'
              )}
            >
              <div className={cn(
                'transition-colors',
                isActive(item.path) ? 'text-[var(--color-primary)]' : 'text-gray-700 group-hover:text-white'
              )}>
                {item.icon}
              </div>
              {sidebarOpen && (
                <>
                  <span className={cn(
                    'flex-1 text-left text-sm font-medium transition-colors',
                    isActive(item.path) ? 'text-white' : 'text-gray-700 group-hover:text-white'
                  )}>
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-xs bg-[var(--color-primary)] text-white rounded-full">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              {!sidebarOpen && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </button>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-800">
          <div className={cn(
            'flex items-center gap-3',
            !sidebarOpen && 'justify-center'
          )}>
            <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-gray-300" />
            </div>
            {sidebarOpen && (
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Admin</p>
                <p className="text-xs text-gray-700">admin@atlasfinance.com</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden" onClick={() => setMobileMenuOpen(false)}>
          <aside className="w-80 h-full bg-[var(--color-text-primary)]" onClick={(e) => e.stopPropagation()}>
            <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--color-primary)] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">W</span>
                </div>
                <div>
                  <h1 className="text-white font-bold text-lg">Atlas Finance</h1>
                  <p className="text-gray-700 text-xs">ERP Professionnel</p>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="py-4">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    navigate(item.path);
                    setMobileMenuOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 transition-all duration-200',
                    'hover:bg-gray-800',
                    isActive(item.path) && 'bg-gray-800 border-l-4 border-[var(--color-primary)]'
                  )}
                >
                  <div className={cn(
                    'transition-colors',
                    isActive(item.path) ? 'text-[var(--color-primary)]' : 'text-gray-700'
                  )}>
                    {item.icon}
                  </div>
                  <span className={cn(
                    'flex-1 text-left text-sm font-medium',
                    isActive(item.path) ? 'text-white' : 'text-gray-700'
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
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-[var(--color-border)] flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden text-[var(--color-text-primary)]"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="relative max-w-md flex-1 hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
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
              >
                <Palette className="w-5 h-5 text-[var(--color-text-secondary)]" />
              </button>
              {showThemeMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-[var(--color-border)] z-50">
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
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#2E7D69] to-[#D4AF37]" />
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
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#27AE60] to-[#2C3E50]" />
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
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6A8A82] to-[#B87333]" />
                      <div className="text-left">
                        <p className="text-sm font-medium">Minimaliste Premium</p>
                        <p className="text-xs text-[var(--color-text-tertiary)]">Élégance minimaliste</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Notifications */}
            <button className="relative p-2 hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-[var(--color-text-secondary)]" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--color-error)] rounded-full"></span>
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-2 hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-[var(--color-primary)] rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-[var(--color-border)] z-50">
                  <div className="p-2">
                    <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors">
                      <User className="w-4 h-4" />
                      <span className="text-sm">Mon profil</span>
                    </button>
                    <button 
                      onClick={() => {
                        navigate('/settings');
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="text-sm">{t('navigation.settings')}</span>
                    </button>
                    <hr className="my-2 border-[var(--color-border)]" />
                    <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-error)] transition-colors">
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
        <main className="flex-1 overflow-y-auto bg-[var(--color-background)]">
          <div className="p-4 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default SimplifiedLayout;