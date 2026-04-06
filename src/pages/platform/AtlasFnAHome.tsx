
/**
 * Page d'accueil Atlas F&A — branded splash dashboard.
 * Pattern commun Atlas Studio (identique DocJourney, Liass'Pilot, etc.)
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FilePlus, BookOpen, Users, Settings,
  ArrowRight, BarChart3, Wallet
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';

interface Stats {
  ecritures: number;
  comptes: number;
  tiers: number;
  immobilisations: number;
  exercice: string;
}

function getWorkspacePath(role: string): string {
  if (role === 'admin' || role === 'super_admin') return '/workspace/admin';
  if (role === 'manager') return '/workspace/manager';
  if (role === 'comptable') return '/workspace/comptable';
  return '/dashboard';
}

const AtlasFnAHome: React.FC = () => {
  const navigate = useNavigate();
  const { adapter } = useData();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    ecritures: 0, comptes: 0, tiers: 0, immobilisations: 0, exercice: '—',
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [ecritures, comptes, tiers, immobilisations, fiscalYears] = await Promise.all([
          adapter.count('journalEntries'),
          adapter.count('accounts'),
          adapter.count('thirdParties'),
          adapter.count('assets'),
          adapter.getAll('fiscalYears'),
        ]);

        const activeFY = (fiscalYears as any[]).find(fy => fy.isActive);
        const exercice = activeFY
          ? `${activeFY.startDate?.substring(0, 4)}–${activeFY.endDate?.substring(0, 4)}`
          : '—';

        setStats({ ecritures, comptes, tiers, immobilisations, exercice });
      } catch (err) { /* silent */
        // Adapter not ready
      }
    };
    loadStats();
  }, [adapter]);

  const navItems = [
    { label: 'Tableau de bord', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Nouvelle écriture', icon: FilePlus, path: '/accounting/entries' },
    { label: 'Journaux', icon: BookOpen, path: '/accounting/journals' },
    { label: 'États financiers', icon: BarChart3, path: '/financial-statements' },
    { label: 'Trésorerie', icon: Wallet, path: '/treasury' },
    { label: 'Tiers', icon: Users, path: '/tiers' },
    { label: 'Paramètres', icon: Settings, path: '/settings' },
  ];

  const companyName = user?.company || 'Mon entreprise';
  const workspacePath = getWorkspacePath(user?.role || '');

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">

      {/* ══════════ TOP BAR ══════════ */}
      <header className="flex items-center justify-between px-8 py-5 shrink-0">
        <div className="text-sm text-neutral-500">
          {companyName}
        </div>
        <button
          onClick={() => navigate(workspacePath)}
          className="flex items-center gap-1.5 text-sm text-neutral-700 hover:text-neutral-900 transition-colors"
        >
          Tableau de bord <ArrowRight className="w-4 h-4" />
        </button>
      </header>

      {/* ══════════ CENTER ══════════ */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 -mt-10">

        {/* Brand name */}
        <h1 className="atlas-brand text-neutral-900 mb-4" style={{ fontSize: '8rem', lineHeight: 1 }}>
          Atlas F&A
        </h1>
        <p className="text-neutral-400 text-xl italic mb-20">
          Votre ERP comptable intelligent — Conforme SYSCOHADA
        </p>

        {/* KPIs row */}
        <div className="flex items-center divide-x divide-neutral-200">
          {[
            { value: stats.ecritures.toLocaleString('fr-FR'), label: 'Écritures' },
            { value: stats.comptes.toLocaleString('fr-FR'), label: 'Comptes' },
            { value: stats.tiers.toLocaleString('fr-FR'), label: 'Tiers' },
            { value: stats.immobilisations.toLocaleString('fr-FR'), label: 'Immobilisations' },
            { value: stats.exercice, label: 'Exercice' },
          ].map((stat) => (
            <div key={stat.label} className="px-10 text-center">
              <div className="text-5xl font-light text-neutral-900">{stat.value}</div>
              <div className="text-base text-neutral-400 mt-2">{stat.label}</div>
            </div>
          ))}
        </div>
      </main>

      {/* ══════════ BOTTOM NAV ══════════ */}
      <footer className="pb-8 pt-6 flex flex-col items-center gap-5 shrink-0">
        <nav className="flex flex-wrap justify-center gap-2.5">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-neutral-50 text-neutral-700 text-sm hover:bg-neutral-100 transition-colors border border-neutral-200"
            >
              <item.icon className="w-4 h-4 text-neutral-400" />
              {item.label}
            </button>
          ))}
        </nav>
        <span className="text-xs text-neutral-300">
          Developed by <span className="atlas-brand text-sm">Atlas Studio</span>
        </span>
      </footer>
    </div>
  );
};

export default AtlasFnAHome;
