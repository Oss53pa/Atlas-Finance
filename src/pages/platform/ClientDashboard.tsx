
/**
 * Dashboard Client Atlas Studio — layout principal après login.
 * Sidebar avec modules + contenu central.
 */
import React, { useState } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../features/platform/hooks/useTenant';
import {
  Calculator, FileText, FolderOpen, Users, Settings, CreditCard,
  LogOut, ChevronDown, Bell, BarChart3, Shield, Truck, ShieldCheck,
  Home, UserPlus, Menu, X, ChevronRight, Sparkles, AlertTriangle, Activity
} from 'lucide-react';

const MODULE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  'atlas-fna': Calculator, 'liass-pilot': FileText, 'docjourney': FolderOpen,
  'tms-pro': Truck, 'scrutix': ShieldCheck, 'atlas-hr': Users,
};

const MODULE_LABELS: Record<string, string> = {
  'atlas-fna': 'Atlas F&A', 'liass-pilot': "Liass'Pilot", 'docjourney': 'DocJourney',
  'tms-pro': 'TMS Pro Africa', 'scrutix': 'Scrutix', 'atlas-hr': 'Atlas HR',
};

const ClientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { tenant, subscriptions, isLoading, userRole, userName, isAdmin, isSuperAdmin } = useTenant();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => { await logout(); navigate('/', { replace: true }); };

  const activeModules = subscriptions
    .filter(s => s.status === 'active' || s.status === 'trialing')
    .map(s => s.solution?.code)
    .filter(Boolean);

  const navItems = [
    { label: 'Accueil', icon: Home, path: '/client', always: true },
    ...activeModules.map(code => ({
      label: MODULE_LABELS[code] || code,
      icon: MODULE_ICONS[code] || BarChart3,
      path: `/client/app/${code}`,
    })),
  ];

  const settingsItems = [
    { label: 'Paramètres', icon: Settings, path: '/client/settings', show: isAdmin },
    { label: 'Équipe', icon: UserPlus, path: '/client/team', show: isAdmin },
    { label: 'Licences', icon: Shield, path: '/client/licenses', show: isAdmin },
    { label: 'Facturation', icon: CreditCard, path: '/client/billing', show: isSuperAdmin },
    { label: 'Piste d\'audit', icon: Activity, path: '/client/audit', show: isAdmin },
  ].filter(i => i.show);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#171717] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Chargement...</p>
        </div>
      </div>
    );
  }

  // Pas de tenant → rediriger vers inscription
  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="text-center max-w-sm">
          <AlertTriangle className="w-12 h-12 text-orange-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-[#171717] mb-2">Aucune organisation</h2>
          <p className="text-sm text-gray-500 mb-6">Votre compte n'est rattaché à aucune organisation.</p>
          <button onClick={() => navigate('/register')} className="px-6 py-2.5 bg-[#171717] text-white rounded-lg text-sm font-semibold">
            Créer une organisation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#fafafa]">
      {/* ══════════ SIDEBAR ══════════ */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'} bg-[#171717] text-white flex flex-col transition-all duration-200 shrink-0`}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="atlas-brand text-xl">Atlas Studio</span>
          </div>
          <div className="mt-3 text-xs text-white/40 truncate">{tenant.name}</div>
        </div>

        {/* Nav modules */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className="w-4.5 h-4.5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}

          {activeModules.length === 0 && (
            <button onClick={() => navigate('/solutions')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-orange-300 hover:bg-white/5">
              <BarChart3 className="w-4.5 h-4.5" />
              <span>Activer une solution</span>
            </button>
          )}

          {settingsItems.length > 0 && (
            <>
              <div className="pt-4 pb-1 px-3 text-[10px] uppercase tracking-wider text-white/30">Administration</div>
              {settingsItems.map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <item.icon className="w-4.5 h-4.5 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="px-4 py-3 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0">
                {(userName || 'U')[0]}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{userName}</div>
                <div className="text-[10px] text-white/40 capitalize">{userRole}</div>
              </div>
            </div>
            <button onClick={handleLogout} className="p-1.5 hover:bg-white/10 rounded text-white/40 hover:text-white">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ══════════ MAIN ══════════ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="bg-white border-b px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg lg:hidden">
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h2 className="text-base font-semibold text-[#171717]">{tenant.name}</h2>
            {tenant.status === 'trial' && (
              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">Essai gratuit</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 hover:bg-gray-100 rounded-lg">
              <Bell className="w-5 h-5 text-gray-500" />
            </button>
            <button onClick={() => navigate('/solutions')} className="text-sm text-gray-500 hover:text-gray-700">
              Solutions
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet context={{ tenant, subscriptions, userRole, isAdmin, isSuperAdmin }} />
        </main>
      </div>
    </div>
  );
};

export default ClientDashboard;
