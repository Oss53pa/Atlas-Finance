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
    <div className="min-h-screen bg-[#F0F3F2] flex">
      {/* Sidebar extensible */}
      <ModernSidebar 
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      {/* Contenu principal */}
      <div className="flex-1 flex flex-col">
        {/* Header moderne */}
        <header className="bg-[#6A8A82] border-b border-[#6A8A82] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#F0F3F2]/70" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  className="pl-10 pr-4 py-2 border border-[#F0F3F2]/30 bg-[#6A8A82]/50 text-[#F0F3F2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B87333] focus:border-transparent placeholder:text-[#F0F3F2]/60"
                />
              </div>
              
              <div className="text-sm text-[#F0F3F2]/80">
                Société: <span className="font-semibold text-[#F0F3F2]">SARL DEMO ATLAS FINANCE</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="relative p-2 text-[#F0F3F2]/70 hover:text-[#F0F3F2]">
                <Bell className="h-5 w-5" />
                <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
              </button>
              
              {/* Profil utilisateur */}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-[#B87333] rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-semibold text-[#F0F3F2]">Administrateur</p>
                  <p className="text-xs text-[#F0F3F2]/70">admin@atlasfinance.com</p>
                </div>
                <button className="p-1 text-[#F0F3F2]/70 hover:text-[#F0F3F2]">
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