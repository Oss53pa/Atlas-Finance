import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FilePlus, BookOpen, Users, Settings,
  ArrowRight,
} from 'lucide-react';
import { db } from '../lib/db';

interface Stats {
  ecritures: number;
  comptes: number;
  tiers: number;
  immobilisations: number;
}

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ ecritures: 0, comptes: 0, tiers: 0, immobilisations: 0 });

  useEffect(() => {
    let mounted = true;
    const loadStats = async () => {
      try {
        const [ecritures, comptes, tiers, immobilisations] = await Promise.all([
          db.journalEntries.count(),
          db.accounts.count(),
          db.thirdParties.count(),
          db.assets.count(),
        ]);
        if (mounted) setStats({ ecritures, comptes, tiers, immobilisations });
      } catch {
        // DB not available yet
      }
    };
    loadStats();
    return () => { mounted = false; };
  }, []);

  const navItems = [
    { label: 'Tableau de bord', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Nouvelle écriture', icon: FilePlus, path: '/ecritures' },
    { label: 'Journaux', icon: BookOpen, path: '/journaux' },
    { label: 'Tiers', icon: Users, path: '/clients' },
    { label: 'Paramètres', icon: Settings, path: '/parametres' },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-5">
        <span className="text-sm text-neutral-400">
          Atlas Finance — WiseBook ERP
        </span>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-sm text-neutral-700 hover:text-neutral-900 transition-colors"
        >
          Tableau de bord <ArrowRight className="w-4 h-4" />
        </button>
      </header>

      {/* Center content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 -mt-16">
        {/* App name */}
        <h1
          className="text-6xl md:text-7xl text-neutral-900 mb-3"
          style={{ fontFamily: "'Grand Hotel', cursive" }}
        >
          Atlas Finance
        </h1>
        <p className="text-neutral-400 text-base italic mb-14">
          Votre ERP comptable intelligent — Conforme SYSCOHADA
        </p>

        {/* Stats row */}
        <div className="flex items-center divide-x divide-neutral-200">
          {[
            { value: stats.ecritures, label: 'Écritures' },
            { value: stats.comptes, label: 'Comptes' },
            { value: stats.tiers, label: 'Tiers' },
            { value: stats.immobilisations, label: 'Immobilisations' },
          ].map((stat) => (
            <div key={stat.label} className="px-8 text-center">
              <div className="text-3xl font-light text-neutral-900">{stat.value}</div>
              <div className="text-sm text-neutral-400 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </main>

      {/* Bottom nav */}
      <footer className="pb-8 pt-12 flex flex-col items-center gap-6">
        <nav className="flex flex-wrap justify-center gap-3">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-neutral-50 text-neutral-700 text-sm hover:bg-neutral-100 transition-colors border border-neutral-200"
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <span className="text-xs text-neutral-300">
          Powered by Atlas Finance
        </span>
      </footer>
    </div>
  );
};

export default LandingPage;
