import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FilePlus, BookOpen, Users, Settings,
  ArrowRight, AlertCircle, Calendar, Clock,
} from 'lucide-react';
import { db } from '../lib/db';

interface Stats {
  ecritures: number;
  comptes: number;
  tiers: number;
  immobilisations: number;
}

interface Alerts {
  brouillons: number;
  exercice: string;
  derniereActivite: string;
}

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ ecritures: 0, comptes: 0, tiers: 0, immobilisations: 0 });
  const [alerts, setAlerts] = useState<Alerts>({ brouillons: 0, exercice: '', derniereActivite: '' });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [ecritures, comptes, tiers, immobilisations] = await Promise.all([
          db.journalEntries.count(),
          db.accounts.count(),
          db.thirdParties.count(),
          db.assets.count(),
        ]);
        if (mounted) setStats({ ecritures, comptes, tiers, immobilisations });

        // Brouillons à valider
        const drafts = await db.journalEntries
          .where('status')
          .equals('draft')
          .count();

        // Exercice actif
        const activeYear = await db.fiscalYears
          .filter((fy) => fy.isActive)
          .first();

        // Dernière activité
        const lastLog = await db.auditLogs
          .orderBy('timestamp')
          .last();

        if (mounted) {
          setAlerts({
            brouillons: drafts,
            exercice: activeYear ? activeYear.name : 'Non défini',
            derniereActivite: lastLog ? formatRelative(lastLog.timestamp) : 'Aucune',
          });
        }
      } catch {
        // DB not available yet
      }
    };
    load();
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
      <main className="flex-1 flex flex-col items-center justify-center px-6 -mt-10">
        {/* App name */}
        <h1
          className="text-neutral-900 mb-4 leading-none"
          style={{ fontFamily: "'Grand Hotel', cursive", fontSize: 'clamp(5rem, 12vw, 10rem)' }}
        >
          Atlas Finance
        </h1>
        <p className="text-neutral-400 text-base italic mb-12">
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

        {/* Info cards */}
        <div className="flex flex-wrap justify-center gap-4 max-w-2xl">
          {alerts.brouillons > 0 && (
            <button
              onClick={() => navigate('/ecritures')}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-amber-50 text-amber-700 text-sm border border-amber-200 hover:bg-amber-100 transition-colors"
            >
              <AlertCircle className="w-4 h-4" />
              {alerts.brouillons} écriture{alerts.brouillons > 1 ? 's' : ''} en brouillon
            </button>
          )}
          {alerts.exercice && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-neutral-50 text-neutral-600 text-sm border border-neutral-200">
              <Calendar className="w-4 h-4" />
              Exercice : {alerts.exercice}
            </div>
          )}
          {alerts.derniereActivite && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-neutral-50 text-neutral-600 text-sm border border-neutral-200">
              <Clock className="w-4 h-4" />
              Dernière activité : {alerts.derniereActivite}
            </div>
          )}
        </div>
      </main>

      {/* Bottom nav */}
      <footer className="pb-8 pt-10 flex flex-col items-center gap-6">
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

function formatRelative(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Hier';
  if (diffD < 7) return `Il y a ${diffD} jours`;
  return date.toLocaleDateString('fr-FR');
}

export default LandingPage;
