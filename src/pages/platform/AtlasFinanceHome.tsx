// @ts-nocheck
/**
 * Page d'accueil Atlas Finance — affiche les KPIs et les raccourcis
 * C'est la première page que voit l'utilisateur avant d'entrer dans le workspace.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FilePlus, BookOpen, Users, Settings,
  ArrowRight, ArrowLeft, BarChart3, Shield, Wallet
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';

interface Stats {
  ecritures: number;
  comptes: number;
  tiers: number;
  immobilisations: number;
}

const AtlasFinanceHome: React.FC = () => {
  const navigate = useNavigate();
  const { adapter } = useData();
  const [stats, setStats] = useState<Stats>({ ecritures: 0, comptes: 0, tiers: 0, immobilisations: 0 });
  const [exercice, setExercice] = useState<string>('Non défini');
  const [lastActivity, setLastActivity] = useState<string>('Aucune');

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
        setStats({ ecritures, comptes, tiers, immobilisations });

        const activeFY = (fiscalYears as any[]).find(fy => fy.isActive);
        if (activeFY) {
          setExercice(`${activeFY.startDate?.substring(0, 4)} — ${activeFY.endDate?.substring(0, 4)}`);
        }

        // Last activity from entries
        if (ecritures > 0) {
          const entries = await adapter.getAll('journalEntries', { orderBy: { field: 'date', direction: 'desc' }, limit: 1 });
          if (entries.length > 0) {
            setLastActivity((entries[0] as any).date || 'Aucune');
          }
        }
      } catch {
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
    { label: 'Trésorerie', icon: Wallet, path: '/treasury/accounts' },
    { label: 'Fiscalité', icon: Shield, path: '/reporting/tax' },
    { label: 'Tiers', icon: Users, path: '/tiers' },
    { label: 'Paramètres', icon: Settings, path: '/settings' },
  ];

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-5">
        <button
          onClick={() => navigate('/client')}
          className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Retour au hub
        </button>
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
        <h1 className="atlas-brand text-6xl md:text-7xl text-neutral-900 mb-3">
          Atlas Finance
        </h1>
        <p className="text-neutral-400 text-base italic mb-14">
          Votre ERP comptable intelligent — Conforme SYSCOHADA
        </p>

        {/* Stats row */}
        <div className="flex items-center divide-x divide-neutral-200 mb-10">
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

        {/* Exercise & Last activity */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 border border-neutral-200 rounded-lg text-sm text-neutral-600">
            <BookOpen className="w-4 h-4 text-neutral-400" />
            Exercice : {exercice}
          </div>
          <div className="flex items-center gap-2 px-4 py-2 border border-neutral-200 rounded-lg text-sm text-neutral-600">
            <LayoutDashboard className="w-4 h-4 text-neutral-400" />
            Dernière activité : {lastActivity}
          </div>
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
          Powered by <span className="atlas-brand text-sm">Atlas Finance</span>
        </span>
      </footer>
    </div>
  );
};

export default AtlasFinanceHome;
