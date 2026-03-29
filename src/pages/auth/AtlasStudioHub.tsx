// @ts-nocheck
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Calculator, Users, Handshake, FileText, FolderOpen,
  LogOut, ArrowRight, Lock
} from 'lucide-react';

const APPS = [
  { code: 'atlas-fna', name: 'Atlas F&A',  desc: 'ERP Comptable & Financier SYSCOHADA', icon: Calculator, color: '#171717', active: true },
  { code: 'liass-pilot',   name: "Liass'Pilot",    desc: 'Liasse fiscale automatique',          icon: FileText,   color: '#0891b2', active: true },
  { code: 'docjourney',    name: 'DocJourney',     desc: 'Gestion documentaire intelligente',   icon: FolderOpen, color: '#7c3aed', active: true },
  { code: 'atlas-hr',      name: 'Atlas HR',       desc: 'Ressources Humaines & Paie',          icon: Users,      color: '#2563eb', active: false },
  { code: 'atlas-crm',     name: 'Atlas CRM',      desc: 'Relation Client & Commercial',        icon: Handshake,  color: '#059669', active: false },
];

function getWorkspacePath(role: string): string {
  if (role === 'admin' || role === 'super_admin') return '/workspace/admin';
  if (role === 'manager') return '/workspace/manager';
  if (role === 'comptable') return '/workspace/comptable';
  return '/workspace';
}

const AtlasStudioHub: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => { await logout(); navigate('/', { replace: true }); };

  const h = new Date().getHours();
  const greeting = h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <div className="h-screen flex flex-col bg-[#f8f8f8] overflow-hidden">
      {/* Header compact */}
      <header className="flex items-center justify-between px-8 py-3 bg-white border-b shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="atlas-brand text-2xl text-[#171717]">Atlas Studio</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{user?.name}</span>
          <div className="w-8 h-8 rounded-full bg-[#171717] flex items-center justify-center text-white text-xs font-bold">
            {(user?.name || 'U')[0]}
          </div>
          <button onClick={handleLogout} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Content — centré verticalement, pas de scroll */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <p className="text-gray-500 text-sm mb-2">{greeting}, {user?.name?.split(' ')[0]}</p>
        <h1 className="text-2xl font-bold text-[#171717] mb-8">Choisissez votre application</h1>

        <div className="flex gap-4 flex-wrap justify-center max-w-4xl">
          {APPS.map(app => (
            <button
              key={app.code}
              onClick={() => app.active && navigate(`/client/app/${app.code}`)}
              disabled={!app.active}
              className={`group relative w-44 h-44 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3 ${
                app.active
                  ? 'bg-white border-gray-200 hover:border-[#171717] hover:shadow-xl cursor-pointer'
                  : 'bg-gray-50 border-gray-100 cursor-not-allowed'
              }`}
            >
              {!app.active && <Lock className="absolute top-3 right-3 w-3.5 h-3.5 text-gray-300" />}
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ backgroundColor: app.active ? app.color + '12' : '#f3f4f6' }}
              >
                <app.icon className="w-7 h-7" style={{ color: app.active ? app.color : '#9ca3af' }} />
              </div>
              <div className="text-center">
                <div className={`text-sm font-bold ${app.active ? 'text-[#171717]' : 'text-gray-400'}`}>{app.name}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  {app.active ? app.desc : 'Bientôt'}
                </div>
              </div>
              {app.active && (
                <ArrowRight className="absolute bottom-3 right-3 w-4 h-4 text-gray-300 group-hover:text-[#171717] group-hover:translate-x-0.5 transition-all" />
              )}
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-300 mt-10">
          <span className="atlas-brand text-sm">Atlas Studio</span> &copy; {new Date().getFullYear()}
          <button onClick={() => navigate('/admin-login')} className="text-gray-200 hover:text-gray-200 ml-1 cursor-default">·</button>
        </p>
      </div>
    </div>
  );
};

export default AtlasStudioHub;
