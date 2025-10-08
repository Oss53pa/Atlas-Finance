import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import DoubleSidebar from './DoubleSidebar';
import { Bell, Search, User, LogOut, Menu } from 'lucide-react';
import { useNavigation } from '../../contexts/NavigationContext';

const DoubleSidebarLayout: React.FC = () => {
  const location = useLocation();
  const { 
    isMobile, 
    mainSidebarOpen, 
    subSidebarOpen, 
    toggleMobileSidebar 
  } = useNavigation();
  
  // Calculer la marge gauche pour le contenu principal
  const mainSidebarWidth = 256;
  const subSidebarWidth = 240;
  const contentMarginLeft = isMobile ? 0 : ((mainSidebarOpen ? mainSidebarWidth : 64) + (subSidebarOpen ? subSidebarWidth : 0));

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Double Sidebar */}
      <DoubleSidebar />
      
      {/* Contenu Principal */}
      <div 
        className="transition-all duration-300"
        style={{ 
          marginLeft: `${contentMarginLeft}px`,
          minHeight: '100vh'
        }}
      >
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Menu Mobile + Breadcrumb */}
              <div className="flex items-center space-x-4">
                {isMobile && (
                  <button
                    onClick={toggleMobileSidebar}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
                  >
                    <Menu className="h-5 w-5 text-gray-600" />
                  </button>
                )}
                <nav className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-700">WiseBook</span>
                  <span className="text-gray-700">/</span>
                  <span className="text-gray-900 font-medium">
                    {location.pathname.split('/').filter(Boolean).join(' / ') || 'Dashboard'}
                  </span>
                </nav>
              </div>
              
              {/* Actions Header */}
              <div className="flex items-center space-x-2 sm:space-x-4">
                {/* Recherche */}
                <div className="relative hidden sm:block">
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48 lg:w-64"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-700" />
                </div>
                
                {/* Bouton recherche mobile */}
                <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors sm:hidden" aria-label="Rechercher">
                  <Search className="h-5 w-5 text-gray-600" />
                </button>
                
                {/* Notifications */}
                <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                </button>
                
                {/* Profil */}
                <div className="flex items-center space-x-3 border-l pl-2 sm:pl-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-gray-900">Admin User</p>
                    <p className="text-xs text-gray-700">Administrateur</p>
                  </div>
                  <div className="relative group">
                    <button className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Utilisateur">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    </button>
                    
                    {/* Dropdown menu (caché par défaut) */}
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                      <a href="/profile" className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <User className="h-4 w-4" />
                        <span>Mon Profil</span>
                      </a>
                      <a href="/logout" className="flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 border-t">
                        <LogOut className="h-4 w-4" />
                        <span>Déconnexion</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>
        
        {/* Contenu de la page */}
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DoubleSidebarLayout;