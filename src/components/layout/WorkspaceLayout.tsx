import React, { useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Search,
  Bell,
  User,
  HelpCircle,
  Settings,
  LogOut,
  ChevronDown,
  BarChart3,
  Calculator,
  Globe,
  Menu,
  X,
  ArrowLeft,
  Home,
  ExternalLink
} from 'lucide-react';

interface WorkspaceLayoutProps {
  workspaceTitle: string;
  workspaceIcon: React.ComponentType<any>;
  sidebar: ReactNode;
  children: ReactNode;
  userRole?: 'comptable' | 'manager' | 'admin'; // Optional, will use auth context
  notifications?: number;
}

const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  workspaceTitle,
  workspaceIcon: WorkspaceIcon,
  sidebar,
  children,
  userRole: propUserRole,
  notifications = 0
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Utiliser le rôle du contexte ou celui passé en props
  const userRole = (propUserRole || user?.role || 'user') as 'comptable' | 'manager' | 'admin';

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const roleColors = {
    comptable: '#171717',
    manager: '#525252', 
    admin: '#737373'
  };

  const roleGradients = {
    comptable: 'linear-gradient(135deg, #171717 0%, #262626 100%)',
    manager: 'linear-gradient(135deg, #525252 0%, #404040 100%)',
    admin: 'linear-gradient(135deg, #737373 0%, #525252 100%)'
  };

  return (
    <div className="min-h-screen bg-[#e5e5e5] ">
      {/* Barre de navigation supérieure */}
      <header className="bg-white border-b border-[#d4d4d4] sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-3">
          {/* Navigation et logo */}
          <div className="flex items-center space-x-4">
            {/* Bouton Accueil */}
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors group"
            >
              <Home className="w-4 h-4 text-[#737373] group-hover:text-[#404040]" />
              <span className="hidden sm:block text-sm text-[#737373] group-hover:text-[#404040]">Accueil</span>
            </button>

            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            
            <div className="flex items-center space-x-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{background: roleGradients[userRole]}}
              >
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-[#171717]">Atlas Finance</h1>
                <p className="text-xs text-[#737373]">v3.0 Professional</p>
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-2 px-3 py-1 rounded-lg bg-gray-50">
              <WorkspaceIcon className="w-4 h-4" style={{color: roleColors[userRole]}} />
              <span className="text-sm font-medium text-[#404040]">{workspaceTitle}</span>
            </div>
          </div>

          {/* Recherche globale */}
          <div className="flex-1 max-w-md mx-6 hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#737373]" />
              <input
                type="text"
                placeholder="Recherche globale... (Ctrl+K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#d4d4d4] rounded-lg focus:ring-2 focus:ring-opacity-20 focus:border-transparent text-sm"
                style={{focusRingColor: roleColors[userRole]}}
              />
            </div>
          </div>

          {/* Actions utilisateur */}
          <div className="flex items-center space-x-3">
            {/* Bouton Atlas Finance Complet bien visible */}
            <button 
              onClick={() => navigate('/executive')}
              className="px-4 py-2 rounded-lg text-white font-medium transition-all hover:shadow-md flex items-center space-x-2"
              style={{background: roleGradients[userRole]}}
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:block text-sm">Atlas Finance</span>
              <ExternalLink className="w-3 h-3" />
            </button>

            {/* Notifications */}
            <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <Bell className="w-5 h-5 text-[#737373]" />
              {notifications > 0 && (
                <span 
                  className="absolute -top-1 -right-1 w-5 h-5 text-xs font-bold text-white rounded-full flex items-center justify-center"
                  style={{backgroundColor: roleColors[userRole]}}
                >
                  {notifications > 9 ? '9+' : notifications}
                </span>
              )}
            </button>

            {/* Aide */}
            <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <HelpCircle className="w-5 h-5 text-[#737373]" />
            </button>

            {/* Langue */}
            <button className="hidden sm:flex items-center space-x-1 px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors">
              <Globe className="w-4 h-4 text-[#737373]" />
              <span className="text-sm text-[#737373]">FR</span>
            </button>

            {/* Menu utilisateur */}
            <div className="relative">
              <button 
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{background: roleGradients[userRole]}}
                >
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-[#171717]">{user?.name || 'Utilisateur'}</p>
                  <p className="text-xs text-[#737373] capitalize">{userRole}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-[#737373]" />
              </button>

              {/* Menu dropdown */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-[#e5e5e5] py-2 z-50">
                  <div className="px-4 py-3 border-b border-[#e5e5e5]">
                    <p className="text-sm font-medium text-[#171717]">{user?.name || 'Utilisateur'}</p>
                    <p className="text-xs text-[#737373]">{user?.email || ''}</p>
                  </div>
                  <button
                    onClick={() => navigate('/profile')}
                    className="w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                  >
                    <User className="w-4 h-4 text-[#737373]" />
                    <span className="text-sm text-[#404040]">Mon profil</span>
                  </button>
                  <button
                    onClick={() => navigate('/settings')}
                    className="w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-[#737373]" />
                    <span className="text-sm text-[#404040]">Préférences</span>
                  </button>
                  <div className="border-t border-[#e5e5e5] mt-2 pt-2">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-500">Déconnexion</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Layout principal */}
      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'} 
          lg:w-64 bg-white border-r border-[#d4d4d4] min-h-[calc(100vh-73px)] transition-all duration-300
          ${sidebarOpen ? 'fixed lg:relative z-40' : ''}
        `}>
          {sidebar}
        </aside>

        {/* Overlay mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Zone de contenu principal */}
        <main className="flex-1 min-h-[calc(100vh-73px)] overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default WorkspaceLayout;