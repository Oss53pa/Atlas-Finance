// @ts-nocheck
/**
 * Atlas Studio Hub — Page d'accueil après login.
 * Affiche les applications disponibles pour l'utilisateur.
 * Clic sur une app → redirige vers l'app (ou ouvre le workspace).
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useData } from '../../contexts/DataContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import {
  Calculator, Users, Handshake, Package, FolderKanban,
  LogOut, Settings, ChevronRight, Lock
} from 'lucide-react';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  calculator: Calculator,
  users: Users,
  handshake: Handshake,
  package: Package,
  'folder-kanban': FolderKanban,
};

interface StudioApp {
  code: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  url?: string;
  version: string;
  is_active: boolean;
}

// Apps par défaut en dev
const DEV_APPS: StudioApp[] = [
  { code: 'atlas-finance', name: 'Atlas Finance',  description: 'ERP Comptable & Financier — SYSCOHADA / OHADA', icon: 'calculator',    color: '#171717', version: '3.0.0', is_active: true },
  { code: 'atlas-hr',      name: 'Atlas HR',       description: 'Gestion des Ressources Humaines & Paie',       icon: 'users',         color: '#2563eb', version: '1.0.0', is_active: false },
  { code: 'atlas-crm',     name: 'Atlas CRM',      description: 'Gestion de la Relation Client',                icon: 'handshake',     color: '#059669', version: '1.0.0', is_active: false },
  { code: 'atlas-stock',   name: 'Atlas Stock',     description: 'Gestion des Stocks & Inventaire',             icon: 'package',       color: '#d97706', version: '1.0.0', is_active: false },
  { code: 'atlas-project', name: 'Atlas Project',   description: 'Gestion de Projets & Planification',          icon: 'folder-kanban', color: '#7c3aed', version: '1.0.0', is_active: false },
];

function getRoleLabel(role: string): string {
  switch (role) {
    case 'super_admin': return 'Super Administrateur';
    case 'admin': return 'Administrateur';
    case 'manager': return 'Manager';
    case 'comptable': return 'Comptable';
    default: return 'Utilisateur';
  }
}

function getWorkspacePath(role: string): string {
  switch (role) {
    case 'admin': case 'super_admin': return '/workspace/admin';
    case 'manager': return '/workspace/manager';
    case 'comptable': return '/workspace/comptable';
    default: return '/workspace';
  }
}

const AtlasStudioHub: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isDev = import.meta.env.VITE_APP_ENV !== 'production';

  // Load apps from Supabase or use dev defaults
  const { data: apps = [] } = useQuery({
    queryKey: ['studio-apps'],
    queryFn: async (): Promise<StudioApp[]> => {
      if (!isSupabaseConfigured || isDev) return DEV_APPS;
      try {
        const { data } = await supabase.rpc('get_user_applications');
        return data || DEV_APPS;
      } catch {
        return DEV_APPS;
      }
    },
  });

  const handleAppClick = (app: StudioApp) => {
    if (!app.is_active) return;

    if (app.code === 'atlas-finance') {
      // Atlas Finance est dans cette app — aller au workspace
      navigate(getWorkspacePath(user?.role || 'user'));
    } else if (app.url) {
      // App externe — ouvrir dans un nouvel onglet
      window.open(app.url, '_blank');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#171717] rounded-xl flex items-center justify-center">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Atlas Studio</h1>
              <p className="text-xs text-gray-500">Plateforme de gestion d'entreprise</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user?.name || 'Utilisateur'}</p>
              <p className="text-xs text-gray-500">{getRoleLabel(user?.role || 'user')}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700"
              title="Déconnexion"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Apps Grid */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Vos applications</h2>
          <p className="text-gray-500 mt-1">Sélectionnez une application pour commencer</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {apps.map(app => {
            const IconComponent = ICON_MAP[app.icon] || Calculator;
            const isAvailable = app.is_active;

            return (
              <button
                key={app.code}
                onClick={() => handleAppClick(app)}
                disabled={!isAvailable}
                className={`relative text-left p-6 rounded-xl border-2 transition-all ${
                  isAvailable
                    ? 'bg-white border-gray-200 hover:border-gray-400 hover:shadow-lg cursor-pointer'
                    : 'bg-gray-50 border-gray-100 cursor-not-allowed opacity-60'
                }`}
              >
                {!isAvailable && (
                  <div className="absolute top-3 right-3">
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                )}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: isAvailable ? app.color + '15' : '#f3f4f6' }}
                >
                  <IconComponent
                    className="w-6 h-6"
                    style={{ color: isAvailable ? app.color : '#9ca3af' }}
                  />
                </div>
                <h3 className="text-base font-bold text-gray-900">{app.name}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{app.description}</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-gray-400">v{app.version}</span>
                  {isAvailable ? (
                    <span className="text-xs font-medium text-gray-700 flex items-center gap-1">
                      Ouvrir <ChevronRight className="w-3 h-3" />
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Bientôt disponible</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-xs text-gray-400">
          Atlas Studio &copy; {new Date().getFullYear()} — Tous droits réservés
        </div>
      </main>
    </div>
  );
};

export default AtlasStudioHub;
