/**
 * Layout Moderne Atlas Finance
 * Interface optimisée sans scroll inutile + Sidebar extensible
 */
import React, { useState } from 'react';
import { Bell, Search, User, LogOut } from 'lucide-react';
import ModernSidebar from './ModernSidebar';

interface ModernLayoutProps {
  children: React.ReactNode;
}

const ModernLayout: React.FC<ModernLayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex">
      {/* Sidebar extensible */}
      <ModernSidebar 
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      {/* Contenu principal */}
      <div className="flex-1 flex flex-col">
        {/* Header moderne */}
        <header className="bg-[#171717] border-b border-[#171717] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#f5f5f5]/70" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  className="pl-10 pr-4 py-2 border border-[#f5f5f5]/30 bg-[#171717]/50 text-[#f5f5f5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#525252] focus:border-transparent placeholder:text-[#f5f5f5]/60"
                />
              </div>
              
              <div className="text-sm text-[#f5f5f5]/80">
                Société: <span className="font-semibold text-[#f5f5f5]">SARL DEMO ATLAS FINANCE</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="relative p-2 text-[#f5f5f5]/70 hover:text-[#f5f5f5]">
                <Bell className="h-5 w-5" />
                <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
              </button>
              
              {/* Profil utilisateur */}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-[#525252] rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-semibold text-[#f5f5f5]">Administrateur</p>
                  <p className="text-xs text-[#f5f5f5]/70">admin@atlasfinance.com</p>
                </div>
                <button className="p-1 text-[#f5f5f5]/70 hover:text-[#f5f5f5]">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </header>
        
        {/* Contenu avec hauteur fixe - PAS DE SCROLL */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ModernLayout;