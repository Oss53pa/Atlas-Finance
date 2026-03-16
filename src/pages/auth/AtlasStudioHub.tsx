// @ts-nocheck
/**
 * Atlas Studio Hub — Page d'accueil après login.
 * Design commercial premium.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import {
  Calculator, Users, Handshake, Package, FolderKanban,
  LogOut, ChevronRight, Lock, Sparkles, ArrowRight,
  BarChart3, Globe, Shield, Zap
} from 'lucide-react';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  calculator: Calculator, users: Users, handshake: Handshake,
  package: Package, 'folder-kanban': FolderKanban,
};

interface StudioApp {
  code: string; name: string; description: string; icon: string;
  color: string; gradient: string; url?: string; version: string; is_active: boolean;
  features?: string[];
}

const DEV_APPS: StudioApp[] = [
  {
    code: 'atlas-finance', name: 'Atlas Finance',
    description: 'ERP Comptable & Financier conforme SYSCOHADA — Plan comptable, écritures, états financiers, trésorerie, fiscalité, audit.',
    icon: 'calculator', color: '#171717', gradient: 'from-[#171717] to-[#404040]',
    version: '3.0.0', is_active: true,
    features: ['Comptabilité SYSCOHADA', 'États financiers', 'Trésorerie', 'Fiscalité 17 pays'],
  },
  {
    code: 'atlas-hr', name: 'Atlas HR',
    description: 'Gestion complète des Ressources Humaines — Paie, congés, cotisations sociales CNPS/CSS.',
    icon: 'users', color: '#2563eb', gradient: 'from-[#2563eb] to-[#3b82f6]',
    version: '1.0.0', is_active: false,
    features: ['Paie multi-pays', 'Congés & absences', 'Cotisations sociales'],
  },
  {
    code: 'atlas-crm', name: 'Atlas CRM',
    description: 'Relation client et pipeline commercial — Prospects, devis, facturation, recouvrement.',
    icon: 'handshake', color: '#059669', gradient: 'from-[#059669] to-[#10b981]',
    version: '1.0.0', is_active: false,
    features: ['Pipeline commercial', 'Facturation', 'Recouvrement'],
  },
  {
    code: 'atlas-stock', name: 'Atlas Stock',
    description: 'Gestion des stocks et inventaire — Mouvements, valorisation, inventaire physique.',
    icon: 'package', color: '#d97706', gradient: 'from-[#d97706] to-[#f59e0b]',
    version: '1.0.0', is_active: false,
    features: ['Mouvements stock', 'Valorisation', 'Inventaire'],
  },
  {
    code: 'atlas-project', name: 'Atlas Project',
    description: 'Gestion de projets — Planification, suivi budgétaire, collaboration d\'équipe.',
    icon: 'folder-kanban', color: '#7c3aed', gradient: 'from-[#7c3aed] to-[#8b5cf6]',
    version: '1.0.0', is_active: false,
    features: ['Kanban', 'Budget projet', 'Collaboration'],
  },
];

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    super_admin: 'Super Admin', admin: 'Administrateur',
    manager: 'Manager', comptable: 'Comptable', user: 'Utilisateur',
  };
  return labels[role] || 'Utilisateur';
}

function getWorkspacePath(role: string): string {
  if (role === 'admin' || role === 'super_admin') return '/workspace/admin';
  if (role === 'manager') return '/workspace/manager';
  if (role === 'comptable') return '/workspace/comptable';
  return '/workspace';
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

const AtlasStudioHub: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isDev = import.meta.env.VITE_APP_ENV !== 'production';

  const { data: apps = [] } = useQuery({
    queryKey: ['studio-apps'],
    queryFn: async (): Promise<StudioApp[]> => {
      if (!isSupabaseConfigured || isDev) return DEV_APPS;
      try {
        const { data } = await supabase.rpc('get_user_applications');
        if (data && data.length > 0) {
          return data.map((a: any) => ({
            ...a,
            gradient: DEV_APPS.find(d => d.code === a.code)?.gradient || 'from-gray-700 to-gray-900',
            features: DEV_APPS.find(d => d.code === a.code)?.features || [],
          }));
        }
        return DEV_APPS;
      } catch { return DEV_APPS; }
    },
  });

  const handleAppClick = (app: StudioApp) => {
    if (!app.is_active) return;
    if (app.code === 'atlas-finance') {
      navigate(getWorkspacePath(user?.role || 'user'));
    } else if (app.url) {
      window.open(app.url, '_blank');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const activeApps = apps.filter(a => a.is_active);
  const comingSoon = apps.filter(a => !a.is_active);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* ══════════ HEADER ══════════ */}
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#171717] rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-[#171717] tracking-tight">Atlas Studio</span>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{getRoleLabel(user?.role || 'user')} &middot; {user?.company || 'Atlas Studio'}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#171717] to-[#525252] flex items-center justify-center text-white text-sm font-bold">
              {(user?.name || 'U').charAt(0)}
            </div>
            <button onClick={handleLogout} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors" title="Déconnexion">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ══════════ HERO BANNER ══════════ */}
      <div className="bg-gradient-to-r from-[#171717] to-[#404040] text-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {getGreeting()}, {user?.name?.split(' ')[0] || 'bienvenue'} !
              </h1>
              <p className="text-white/70 text-lg">
                Votre suite de gestion d'entreprise pour l'Afrique
              </p>
              <div className="flex items-center gap-6 mt-6">
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <Globe className="w-4 h-4" /> 17 pays OHADA
                </div>
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <Shield className="w-4 h-4" /> SYSCOHADA conforme
                </div>
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <Zap className="w-4 h-4" /> IA intégrée (PROPH3T)
                </div>
              </div>
            </div>
            <div className="hidden lg:flex items-center gap-3">
              <div className="text-right">
                <div className="text-4xl font-bold">{activeApps.length}</div>
                <div className="text-white/60 text-sm">app{activeApps.length > 1 ? 's' : ''} active{activeApps.length > 1 ? 's' : ''}</div>
              </div>
              <div className="w-px h-12 bg-white/20" />
              <div className="text-right">
                <div className="text-4xl font-bold">{comingSoon.length}</div>
                <div className="text-white/60 text-sm">en développement</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* ══════════ APPS ACTIVES ══════════ */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Vos applications</h2>
          <p className="text-sm text-gray-500 mb-6">Cliquez pour accéder à votre espace de travail</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {activeApps.map(app => {
              const IconComp = ICON_MAP[app.icon] || Calculator;
              return (
                <button
                  key={app.code}
                  onClick={() => handleAppClick(app)}
                  className="group relative text-left rounded-2xl overflow-hidden border-2 border-transparent hover:border-gray-300 transition-all hover:shadow-xl"
                >
                  {/* Gradient header */}
                  <div className={`bg-gradient-to-r ${app.gradient} p-6 pb-16`}>
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                        <IconComp className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-white/60 text-xs font-medium">v{app.version}</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mt-4">{app.name}</h3>
                  </div>
                  {/* Content card */}
                  <div className="bg-white p-6 -mt-8 mx-4 rounded-xl shadow-lg relative">
                    <p className="text-sm text-gray-600 mb-4">{app.description}</p>
                    {app.features && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {app.features.map((f, i) => (
                          <span key={i} className="text-xs px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full font-medium">{f}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center text-sm font-semibold text-[#171717] group-hover:gap-3 gap-1.5 transition-all">
                      Ouvrir l'application <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                  <div className="h-4 bg-white" />
                </button>
              );
            })}
          </div>
        </div>

        {/* ══════════ COMING SOON ══════════ */}
        {comingSoon.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Prochainement</h2>
            <p className="text-sm text-gray-500 mb-6">Ces modules sont en cours de développement</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {comingSoon.map(app => {
                const IconComp = ICON_MAP[app.icon] || Calculator;
                return (
                  <div
                    key={app.code}
                    className="relative bg-white rounded-xl border border-gray-200 p-5 opacity-70"
                  >
                    <Lock className="absolute top-4 right-4 w-4 h-4 text-gray-300" />
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                      style={{ backgroundColor: app.color + '12' }}
                    >
                      <IconComp className="w-5 h-5" style={{ color: app.color }} />
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm">{app.name}</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{app.description}</p>
                    <div className="mt-3 text-xs text-gray-400 font-medium">Bientôt disponible</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════ FOOTER ══════════ */}
        <div className="mt-16 pt-8 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400 font-medium">Atlas Studio</span>
          </div>
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Atlas Studio — Suite de gestion pour l'Afrique
          </p>
        </div>
      </main>
    </div>
  );
};

export default AtlasStudioHub;
